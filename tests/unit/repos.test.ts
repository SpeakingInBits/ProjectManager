// Repo + migration-adjacent tests running the real db.ts/repos against
// fake-indexeddb in Node. The `/auto` import must come before any db import so
// idb sees the fake global. All tests share one DB (module-level cache in
// db.ts), so each test resets the stores first.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { getDb } from '../../src/db/db';
import * as categoriesRepo from '../../src/db/categories.repo';
import * as subcategoriesRepo from '../../src/db/subcategories.repo';
import * as tasksRepo from '../../src/db/tasks.repo';
import * as projectsRepo from '../../src/db/projects.repo';
import * as timeEntriesRepo from '../../src/db/timeEntries.repo';
import { completeTask } from '../../src/domain/repeat';
import { todayISODate } from '../../src/utils/dates';

beforeEach(async () => {
  const db = await getDb();
  const tx = db.transaction(['categories', 'subcategories', 'projects', 'tasks', 'timeEntries'], 'readwrite');
  await tx.objectStore('categories').clear();
  await tx.objectStore('subcategories').clear();
  await tx.objectStore('projects').clear();
  await tx.objectStore('tasks').clear();
  await tx.objectStore('timeEntries').clear();
  await tx.done;
});

describe('timeEntries.addMinutesOnDay', () => {
  it('accumulates minutes on a day and clamps at zero', async () => {
    const e = await timeEntriesRepo.create({ title: 'Work', description: '', categoryId: null });
    await timeEntriesRepo.addMinutesOnDay(e.id, '2026-07-29', 15);
    const after = await timeEntriesRepo.addMinutesOnDay(e.id, '2026-07-29', 15);
    expect(after.dailyMinutes['2026-07-29']).toBe(30);

    const clamped = await timeEntriesRepo.addMinutesOnDay(e.id, '2026-07-29', -999);
    expect(clamped.dailyMinutes['2026-07-29']).toBeUndefined();
  });

  it('prunes a day that reaches zero along with its note', async () => {
    const e = await timeEntriesRepo.create({ title: 'Work', description: '', categoryId: null });
    await timeEntriesRepo.addMinutesOnDay(e.id, '2026-07-29', 15);
    await timeEntriesRepo.setDayNote(e.id, '2026-07-29', 'a note');

    const after = await timeEntriesRepo.addMinutesOnDay(e.id, '2026-07-29', -15);
    expect(after.dailyMinutes).toEqual({});
    expect(after.dailyNotes).toEqual({});
  });
});

describe('timeEntries.setDayNote', () => {
  it('trims, clears on empty, and refuses a note on a day without logged time', async () => {
    const e = await timeEntriesRepo.create({ title: 'Work', description: '', categoryId: null });
    await timeEntriesRepo.addMinutesOnDay(e.id, '2026-07-29', 15);

    const withNote = await timeEntriesRepo.setDayNote(e.id, '2026-07-29', '  hello  ');
    expect(withNote.dailyNotes['2026-07-29']).toBe('hello');

    const cleared = await timeEntriesRepo.setDayNote(e.id, '2026-07-29', '   ');
    expect(cleared.dailyNotes['2026-07-29']).toBeUndefined();

    const noTime = await timeEntriesRepo.setDayNote(e.id, '2026-07-30', 'orphan');
    expect(noTime.dailyNotes['2026-07-30']).toBeUndefined();
  });
});

describe('categories.removeCategory cascade', () => {
  it('deletes subcategories and detaches projects, tasks, and time entries', async () => {
    const cat = await categoriesRepo.create({ name: 'Work' });
    const other = await categoriesRepo.create({ name: 'Personal' });
    const sub = await subcategoriesRepo.create({ categoryId: cat.id, name: 'Internal' });
    const project = await projectsRepo.create({
      title: 'P', description: '', dueDate: null, categoryId: cat.id, subcategoryId: sub.id,
    });
    const task = await tasksRepo.create({
      title: 'T', description: '', dueDate: null, projectId: null,
      categoryId: cat.id, subcategoryId: sub.id, repeat: { kind: 'never' },
    });
    const entry = await timeEntriesRepo.create({ title: 'E', description: '', categoryId: cat.id });
    const untouched = await timeEntriesRepo.create({ title: 'U', description: '', categoryId: other.id });

    await categoriesRepo.removeCategory(cat.id);

    expect(await categoriesRepo.get(cat.id)).toBeUndefined();
    expect(await subcategoriesRepo.get(sub.id)).toBeUndefined();
    expect((await projectsRepo.get(project.id))?.categoryId).toBeNull();
    expect((await tasksRepo.get(task.id))?.categoryId).toBeNull();
    expect((await timeEntriesRepo.get(entry.id))?.categoryId).toBeNull();
    expect((await timeEntriesRepo.get(untouched.id))?.categoryId).toBe(other.id);
  });
});

describe('completeTask (repeat spawning)', () => {
  it('keeps the completed row and spawns the next occurrence in the same series', async () => {
    const t = await tasksRepo.create({
      title: 'Weekly review', description: '', dueDate: '2026-07-27', projectId: null,
      categoryId: null, subcategoryId: null, repeat: { kind: 'weekly' },
    });

    await completeTask(t.id);

    const all = await tasksRepo.list();
    expect(all).toHaveLength(2);
    const done = all.find((x) => x.completed);
    const next = all.find((x) => !x.completed);
    expect(done?.id).toBe(t.id);
    expect(done?.completedAt).not.toBeNull();
    expect(next?.dueDate).toBe('2026-08-03');
    expect(next?.seriesId).toBe(t.seriesId);
    expect(next?.previousInstanceId).toBe(t.id);
  });

  it('does not spawn anything for a non-repeating task', async () => {
    const t = await tasksRepo.create({
      title: 'One-off', description: '', dueDate: todayISODate(), projectId: null,
      categoryId: null, subcategoryId: null, repeat: { kind: 'never' },
    });
    await completeTask(t.id);
    expect(await tasksRepo.list()).toHaveLength(1);
  });
});
