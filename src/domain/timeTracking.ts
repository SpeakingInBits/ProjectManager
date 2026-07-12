import type { TimeEntry } from '../models/types';
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

// Renders minutes as "Xh Ym", "Xh", or "Ym" (and "0m" when empty).
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
