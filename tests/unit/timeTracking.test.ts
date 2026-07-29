import { describe, it, expect } from 'vitest';
import {
  totalMinutes,
  todayMinutes,
  rangeMinutes,
  weekMinutes,
  monthMinutes,
  dayHistory,
  formatMinutes,
  organizeEntries,
} from '../../src/domain/timeTracking';
import type { Category, TimeEntry } from '../../src/models/types';

function entry(dailyMinutes: Record<string, number>, dailyNotes: Record<string, string> = {}): TimeEntry {
  return {
    id: 'e1',
    title: 'Test',
    description: '',
    categoryId: null,
    dailyMinutes,
    dailyNotes,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('formatMinutes', () => {
  it('renders minutes, hours, and mixed values', () => {
    expect(formatMinutes(0)).toBe('0m');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(135)).toBe('2h 15m');
  });
});

describe('totalMinutes / todayMinutes', () => {
  it('sums all days and reads a single day', () => {
    const e = entry({ '2026-07-01': 30, '2026-07-02': 45 });
    expect(totalMinutes(e)).toBe(75);
    expect(todayMinutes(e, '2026-07-02')).toBe(45);
    expect(todayMinutes(e, '2026-07-03')).toBe(0);
  });
});

describe('rangeMinutes', () => {
  it('is inclusive on both ends', () => {
    const e = entry({ '2026-07-01': 15, '2026-07-05': 15, '2026-07-10': 15 });
    expect(rangeMinutes(e, '2026-07-01', '2026-07-05')).toBe(30);
    expect(rangeMinutes(e, '2026-07-02', '2026-07-04')).toBe(0);
  });
});

describe('weekMinutes', () => {
  // 2026-07-29 is a Wednesday; its Monday–Sunday week is Jul 27 – Aug 2.
  it('covers the Monday–Sunday week containing the given day', () => {
    const e = entry({
      '2026-07-26': 15, // Sunday before — out
      '2026-07-27': 30, // Monday — in
      '2026-08-02': 45, // Sunday — in
      '2026-08-03': 60, // Monday after — out
    });
    expect(weekMinutes(e, '2026-07-29')).toBe(75);
  });

  it('handles a Sunday as the given day (week does not shift forward)', () => {
    const e = entry({ '2026-07-27': 30, '2026-08-02': 45 });
    expect(weekMinutes(e, '2026-08-02')).toBe(75);
  });

  it('spans a month boundary', () => {
    const e = entry({ '2026-07-31': 15, '2026-08-01': 15 });
    expect(weekMinutes(e, '2026-07-29')).toBe(30);
  });
});

describe('monthMinutes', () => {
  it('covers only the calendar month containing the given day', () => {
    const e = entry({ '2026-06-30': 15, '2026-07-01': 30, '2026-07-31': 45, '2026-08-01': 60 });
    expect(monthMinutes(e, '2026-07-15')).toBe(75);
  });
});

describe('organizeEntries', () => {
  const cat = (id: string, name: string): Category => ({ id, name, createdAt: '2026-01-01T00:00:00.000Z' });
  const item = (title: string, categoryId: string | null): TimeEntry => ({ ...entry({}), id: title, title, categoryId });

  const categories = [cat('w', 'Work'), cat('p', 'Personal')];
  // Creation order: deliberately not alphabetical, categories interleaved.
  const items = [item('Zebra', 'w'), item('Errands', null), item('Alpha', 'w'), item('Books', 'p')];

  it('neither option: one unlabeled group in creation order', () => {
    expect(organizeEntries(items, categories, { groupByCategory: false, sortAlphabetically: false })).toEqual([
      { label: null, entries: items },
    ]);
  });

  it('sort only: one flat group, alphabetical, input not mutated', () => {
    const [group] = organizeEntries(items, categories, { groupByCategory: false, sortAlphabetically: true });
    expect(group?.entries.map((e) => e.title)).toEqual(['Alpha', 'Books', 'Errands', 'Zebra']);
    expect(items.map((e) => e.title)).toEqual(['Zebra', 'Errands', 'Alpha', 'Books']);
  });

  it('group only: alphabetical group labels with "No category" last, creation order within groups', () => {
    const groups = organizeEntries(items, categories, { groupByCategory: true, sortAlphabetically: false });
    expect(groups.map((g) => g.label)).toEqual(['Personal', 'Work', 'No category']);
    expect(groups[1]?.entries.map((e) => e.title)).toEqual(['Zebra', 'Alpha']);
  });

  it('both options: items sorted within their groups', () => {
    const groups = organizeEntries(items, categories, { groupByCategory: true, sortAlphabetically: true });
    expect(groups[1]?.entries.map((e) => e.title)).toEqual(['Alpha', 'Zebra']);
  });

  it('an entry whose category was deleted falls into "No category"', () => {
    const groups = organizeEntries([item('Orphan', 'gone')], categories, {
      groupByCategory: true,
      sortAlphabetically: false,
    });
    expect(groups).toEqual([{ label: 'No category', entries: [expect.objectContaining({ title: 'Orphan' })] }]);
  });
});

describe('dayHistory', () => {
  it('returns logged days newest-first with their notes', () => {
    const e = entry({ '2026-07-01': 30, '2026-07-03': 15 }, { '2026-07-01': 'kickoff' });
    expect(dayHistory(e)).toEqual([
      { date: '2026-07-03', minutes: 15, note: null },
      { date: '2026-07-01', minutes: 30, note: 'kickoff' },
    ]);
  });
});
