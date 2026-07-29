import type { Category, TimeEntry } from '../models/types';
import { parseISODate, toISODate, todayISODate, addDays } from '../utils/dates';

export const INCREMENT_MINUTES = 15;

export function totalMinutes(entry: TimeEntry): number {
  return Object.values(entry.dailyMinutes).reduce((sum, m) => sum + m, 0);
}

export function todayMinutes(entry: TimeEntry, today: string = todayISODate()): number {
  return entry.dailyMinutes[today] ?? 0;
}

// Sums minutes for every logged day whose ISO date falls within
// [startISO, endISO], both inclusive. ISO date strings compare correctly.
export function rangeMinutes(entry: TimeEntry, startISO: string, endISO: string): number {
  let sum = 0;
  for (const [date, minutes] of Object.entries(entry.dailyMinutes)) {
    if (date >= startISO && date <= endISO) sum += minutes;
  }
  return sum;
}

// Week runs Monday–Sunday, containing `today`.
export function weekMinutes(entry: TimeEntry, today: string = todayISODate()): number {
  const date = parseISODate(today);
  const daysSinceMonday = (date.getDay() + 6) % 7; // getDay: 0=Sun..6=Sat
  const monday = addDays(date, -daysSinceMonday);
  const sunday = addDays(monday, 6);
  return rangeMinutes(entry, toISODate(monday), toISODate(sunday));
}

// Calendar month containing `today`.
export function monthMinutes(entry: TimeEntry, today: string = todayISODate()): number {
  const date = parseISODate(today);
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return rangeMinutes(entry, toISODate(start), toISODate(end));
}

export interface DayLog {
  date: string; // ISO date (YYYY-MM-DD)
  minutes: number;
  note: string | null;
}

// Every logged day with its minutes and optional note, newest first.
export function dayHistory(entry: TimeEntry): DayLog[] {
  return Object.entries(entry.dailyMinutes)
    .map(([date, minutes]) => ({ date, minutes, note: entry.dailyNotes[date] ?? null }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface TimeViewOptions {
  groupByCategory: boolean;
  sortAlphabetically: boolean;
}

export interface TimeEntryGroup {
  // Category name / "No category" when grouping; null for the single flat
  // group when grouping is off (no heading is rendered).
  label: string | null;
  entries: TimeEntry[];
}

// Orders the time list for display. Grouping buckets items under their
// category name (groups alphabetical, "No category" last); sorting applies
// within each group, or to the flat list when grouping is off. With neither
// option the repo's creation order is preserved.
export function organizeEntries(
  entries: TimeEntry[],
  categories: Category[],
  options: TimeViewOptions
): TimeEntryGroup[] {
  const byTitle = (a: TimeEntry, b: TimeEntry): number =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  const sorted = (group: TimeEntry[]): TimeEntry[] => (options.sortAlphabetically ? [...group].sort(byTitle) : group);

  if (!options.groupByCategory) return [{ label: null, entries: sorted(entries) }];

  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  const NO_CATEGORY = 'No category';
  const groups = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const label = (entry.categoryId ? nameById.get(entry.categoryId) : undefined) ?? NO_CATEGORY;
    const group = groups.get(label) ?? [];
    group.push(entry);
    groups.set(label, group);
  }

  const labels = [...groups.keys()].sort((a, b) => {
    if (a === NO_CATEGORY) return 1;
    if (b === NO_CATEGORY) return -1;
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  });
  return labels.map((label) => ({ label, entries: sorted(groups.get(label)!) }));
}

// Renders minutes as "Xh Ym", "Xh", or "Ym" (and "0m" when empty).
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
