import { getDb } from './db';
import type { TimeEntry } from '../models/types';
import { uuid } from '../utils/uuid';
import { nowISO } from '../utils/dates';

export interface TimeEntryInput {
  title: string;
  description: string;
  categoryId: string | null;
}

export async function list(): Promise<TimeEntry[]> {
  const db = await getDb();
  const entries = await db.getAll('timeEntries');
  return entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function get(id: string): Promise<TimeEntry | undefined> {
  const db = await getDb();
  return db.get('timeEntries', id);
}

export async function create(input: TimeEntryInput): Promise<TimeEntry> {
  const db = await getDb();
  const now = nowISO();
  const entry: TimeEntry = { id: uuid(), ...input, dailyMinutes: {}, dailyNotes: {}, createdAt: now, updatedAt: now };
  await db.add('timeEntries', entry);
  return entry;
}

export async function update(
  id: string,
  patch: Partial<Omit<TimeEntry, 'id' | 'createdAt'>>
): Promise<TimeEntry> {
  const db = await getDb();
  const existing = await db.get('timeEntries', id);
  if (!existing) throw new Error(`Time entry ${id} not found`);
  const updated: TimeEntry = { ...existing, ...patch, updatedAt: nowISO() };
  await db.put('timeEntries', updated);
  return updated;
}

export async function remove(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('timeEntries', id);
}

// Adds `deltaMinutes` (may be negative) to a day's logged total, clamped so a
// day never goes below zero. A day that reaches zero is pruned from the map so
// it doesn't count as a worked day, and its note goes with it.
export async function addMinutesOnDay(id: string, date: string, deltaMinutes: number): Promise<TimeEntry> {
  const db = await getDb();
  const existing = await db.get('timeEntries', id);
  if (!existing) throw new Error(`Time entry ${id} not found`);

  const next = Math.max(0, (existing.dailyMinutes[date] ?? 0) + deltaMinutes);
  const dailyMinutes = { ...existing.dailyMinutes };
  const dailyNotes = { ...existing.dailyNotes };
  if (next === 0) {
    delete dailyMinutes[date];
    delete dailyNotes[date];
  } else {
    dailyMinutes[date] = next;
  }

  const updated: TimeEntry = { ...existing, dailyMinutes, dailyNotes, updatedAt: nowISO() };
  await db.put('timeEntries', updated);
  return updated;
}

// Sets or clears the note for a day. Notes only exist for days with logged
// time; an empty/whitespace note removes the day's note.
export async function setDayNote(id: string, date: string, note: string): Promise<TimeEntry> {
  const db = await getDb();
  const existing = await db.get('timeEntries', id);
  if (!existing) throw new Error(`Time entry ${id} not found`);

  const trimmed = note.trim();
  const dailyNotes = { ...existing.dailyNotes };
  if (trimmed === '' || !(existing.dailyMinutes[date] ?? 0)) {
    delete dailyNotes[date];
  } else {
    dailyNotes[date] = trimmed;
  }

  const updated: TimeEntry = { ...existing, dailyNotes, updatedAt: nowISO() };
  await db.put('timeEntries', updated);
  return updated;
}

// Merges `sourceId` into `targetId`: the source's logged time is added to the
// target's day by day, and a note on a day both logged is appended to the
// target's (on a new line). The source is then deleted; the target keeps its
// own title, description, and category. Every source day has minutes > 0, so
// no empty days or orphan notes can result. Runs in a single transaction so a
// failure can't leave time duplicated or lost.
export async function mergeInto(sourceId: string, targetId: string): Promise<TimeEntry> {
  if (sourceId === targetId) throw new Error('Cannot merge a time entry into itself');
  const db = await getDb();
  const tx = db.transaction('timeEntries', 'readwrite');
  const [source, target] = await Promise.all([tx.store.get(sourceId), tx.store.get(targetId)]);
  if (!source) throw new Error(`Time entry ${sourceId} not found`);
  if (!target) throw new Error(`Time entry ${targetId} not found`);

  const dailyMinutes = { ...target.dailyMinutes };
  const dailyNotes = { ...target.dailyNotes };
  for (const [date, minutes] of Object.entries(source.dailyMinutes)) {
    dailyMinutes[date] = (dailyMinutes[date] ?? 0) + minutes;
    const note = source.dailyNotes[date];
    if (note) dailyNotes[date] = dailyNotes[date] ? `${dailyNotes[date]}\n${note}` : note;
  }

  const updated: TimeEntry = { ...target, dailyMinutes, dailyNotes, updatedAt: nowISO() };
  await Promise.all([tx.store.put(updated), tx.store.delete(sourceId), tx.done]);
  return updated;
}
