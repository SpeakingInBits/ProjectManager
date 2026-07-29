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

  it('falls back to the completion date when there is no previous due date', () => {
    expect(iso(computeNextDueDate({ kind: 'weekly' }, completedWed, null))).toBe('2026-08-05');
  });
});
