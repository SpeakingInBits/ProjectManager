import { describe, it, expect } from 'vitest';
import { sortTasks } from '../../src/domain/taskSort';
import { computeProjectProgress } from '../../src/domain/progress';
import type { Task } from '../../src/models/types';

function task(overrides: Partial<Task> & { title: string }): Task {
  return {
    id: overrides.title,
    description: '',
    dueDate: null,
    projectId: null,
    categoryId: null,
    subcategoryId: null,
    pinned: false,
    completed: false,
    completedAt: null,
    repeat: { kind: 'never' },
    seriesId: overrides.title,
    previousInstanceId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('sortTasks', () => {
  it('orders: pinned incomplete, then by due date (nulls last), then title; completed sink', () => {
    const sorted = sortTasks([
      task({ title: 'done early', completed: true, dueDate: '2026-01-01' }),
      task({ title: 'no due B' }),
      task({ title: 'no due A' }),
      task({ title: 'due later', dueDate: '2026-08-10' }),
      task({ title: 'due soon', dueDate: '2026-08-01' }),
      task({ title: 'pinned late due', pinned: true, dueDate: '2026-12-01' }),
    ]);
    expect(sorted.map((t) => t.title)).toEqual([
      'pinned late due',
      'due soon',
      'due later',
      'no due A',
      'no due B',
      'done early',
    ]);
  });

  it('does not mutate the input array', () => {
    const input = [task({ title: 'b' }), task({ title: 'a' })];
    sortTasks(input);
    expect(input.map((t) => t.title)).toEqual(['b', 'a']);
  });
});

describe('computeProjectProgress', () => {
  it('counts completed over total with a rounded percent', () => {
    const tasks = [
      task({ title: 'a', completed: true }),
      task({ title: 'b', completed: true }),
      task({ title: 'c' }),
    ];
    expect(computeProjectProgress(tasks)).toEqual({ done: 2, total: 3, percent: 67 });
  });

  it('is 0% for an empty project (no divide-by-zero)', () => {
    expect(computeProjectProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });
});
