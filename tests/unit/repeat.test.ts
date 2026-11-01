import { describe, it, expect } from 'vitest';
import { computeNextDueDate } from '../../src/domain/repeat';
import { parseISODate, toISODate } from '../../src/utils/dates';

const iso = (d: Date | null): string | null => (d ? toISODate(d) : null);

describe('computeNextDueDate', () => {
  const completedWed = parseISODate('2026-07-29'); // Wednesday
  const dueMon = parseISODate('2026-07-27'); // the Monday before

  it('never → null', () => {
    expect(computeNextDueDate({ kind: 'never' }, completedWed, dueMon)).toBeNull();
  });

  it('schedule-anchored kinds advance from the previous due date, not the completion date', () => {
    // Weekly Monday task completed on Wednesday is still due the next Monday.
    expect(iso(computeNextDueDate({ kind: 'weekly' }, completedWed, dueMon))).toBe('2026-08-03');
    expect(iso(computeNextDueDate({ kind: 'daily' }, completedWed, dueMon))).toBe('2026-07-28');
    expect(iso(computeNextDueDate({ kind: 'monthly' }, completedWed, dueMon))).toBe('2026-08-27');
    expect(iso(computeNextDueDate({ kind: 'yearly' }, completedWed, dueMon))).toBe('2027-07-27');
    expect(iso(computeNextDueDate({ kind: 'custom', intervalDays: 10 }, completedWed, dueMon))).toBe('2026-08-06');
  });

  it('movable is completion-anchored: ignores the previous due date', () => {
    expect(iso(computeNextDueDate({ kind: 'movable', intervalDays: 30 }, completedWed, dueMon))).toBe('2026-08-28');
  });

  it('monthly/yearly take the last day of a short month instead of overflowing', () => {
    const next = (kind: 'monthly' | 'yearly', previous: string, anchor: number | null = null): string | null =>
      iso(computeNextDueDate({ kind }, completedWed, parseISODate(previous), anchor));
    expect(next('monthly', '2026-01-31')).toBe('2026-02-28');
    expect(next('monthly', '2028-01-31')).toBe('2028-02-29');
    expect(next('yearly', '2028-02-29')).toBe('2029-02-28');
    // The anchor brings a series back to its day once months are long enough.
    expect(next('monthly', '2026-02-28', 31)).toBe('2026-03-31');
    expect(next('monthly', '2026-03-31', 31)).toBe('2026-04-30');
    expect(next('yearly', '2031-02-28', 29)).toBe('2032-02-29');
  });

  it('falls back to the completion date when there is no previous due date', () => {
    expect(iso(computeNextDueDate({ kind: 'weekly' }, completedWed, null))).toBe('2026-08-05');
  });
});
