import { getDb } from './db';
import type { TimeEntry } from '../models/types';
import { uuid } from '../utils/uuid';
import { nowISO, todayISODate } from '../utils/dates';

export interface TimeEntryInput {
  title: string;
  description: string;
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
  const entry: TimeEntry = { id: uuid(), ...input, dailyMinutes: {}, createdAt: now, updatedAt: now };
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

// Adds `deltaMinutes` (may be negative) to today's logged total, clamped so a
// day never goes below zero. A day that reaches zero is pruned from the map so
// it doesn't count as a worked day.
export async function addMinutesToday(id: string, deltaMinutes: number): Promise<TimeEntry> {
  const db = await getDb();
  const existing = await db.get('timeEntries', id);
  if (!existing) throw new Error(`Time entry ${id} not found`);

  const today = todayISODate();
  const next = Math.max(0, (existing.dailyMinutes[today] ?? 0) + deltaMinutes);
  const dailyMinutes = { ...existing.dailyMinutes };
  if (next === 0) {
    delete dailyMinutes[today];
  } else {
    dailyMinutes[today] = next;
  }

  const updated: TimeEntry = { ...existing, dailyMinutes, updatedAt: nowISO() };
  await db.put('timeEntries', updated);
  return updated;
}
