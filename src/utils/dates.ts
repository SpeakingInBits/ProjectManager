export function todayISODate(): string {
  return toISODate(new Date());
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// The same day `months` later, or the last day of that month when it's
// shorter (Jan 31 + 1 month = Feb 28). Date#setMonth would instead overflow
// into the next month (Mar 3).
export function addMonths(date: Date, months: number): Date {
  return addMonthsOnDay(date, months, date.getDate());
}

// Day `day` of the month `months` after `date`'s, or that month's last day
// when it's shorter.
export function addMonthsOnDay(date: Date, months: number, day: number): Date {
  const first = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const clamped = Math.min(Math.max(day, 1), lastDayOfMonth(first));
  return new Date(first.getFullYear(), first.getMonth(), clamped);
}

// The same date `years` later; Feb 29 becomes Feb 28 in a non-leap year.
export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12);
}

// The number of the last day in `date`'s month (28–31).
export function lastDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function formatDateDisplay(iso: string | null): string {
  if (!iso) return '—';
  return parseISODate(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  return parseISODate(iso) < parseISODate(todayISODate());
}

export function nowISO(): string {
  return new Date().toISOString();
}
