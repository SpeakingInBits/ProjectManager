import type { RepeatConfig, Task, ID } from '../models/types';
import { addDays, addMonthsOnDay, lastDayOfMonth, parseISODate, toISODate, nowISO } from '../utils/dates';
import { uuid } from '../utils/uuid';
import * as tasksRepo from '../db/tasks.repo';

// `daily`/`weekly`/`monthly`/`yearly`/`custom` are schedule-anchored: the next
// date is computed from the previous due date, so a weekly Monday task
// completed on a Wednesday is still next due the following Monday (no drift).
// `movable` is completion-anchored: the next date is always computed from
// when the task was actually completed, ignoring the previous due date.
//
// `monthly`/`yearly` fall on `anchorDay` (the base date's day by default), or
// on the last day of a month too short for it: a series anchored on the 31st
// goes Jan 31, Feb 28, Mar 31.
export function computeNextDueDate(
  repeat: RepeatConfig,
  completionDate: Date,
  previousDueDate: Date | null,
  anchorDay: number | null = null
): Date | null {
  const base = previousDueDate ?? completionDate;
  const day = anchorDay ?? base.getDate();
  switch (repeat.kind) {
    case 'never':
      return null;
    case 'daily':
      return addDays(base, 1);
    case 'weekly':
      return addDays(base, 7);
    case 'monthly':
      return addMonthsOnDay(base, 1, day);
    case 'yearly':
      return addMonthsOnDay(base, 12, day);
    case 'custom':
      return addDays(base, repeat.intervalDays);
    case 'movable':
      return addDays(completionDate, repeat.intervalDays);
  }
}

// Marking a repeating task complete never resets it in place: the completed
// row is finalized permanently (so it stays visible as history), and — if it
// repeats — a new row is spawned for the next occurrence. This is what lets a
// project's progress bar (done/total across all rows) actually reach and hold
// 100%.
export async function completeTask(
  taskId: ID,
  opts?: { completionDate?: Date }
): Promise<{ completed: Task; nextInstance: Task | null }> {
  const task = await tasksRepo.get(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const completionDate = opts?.completionDate ?? new Date();
  const completed = await tasksRepo.update(taskId, {
    completed: true,
    completedAt: completionDate.toISOString(),
    pinned: false,
  });

  if (task.repeat.kind === 'never') {
    return { completed, nextInstance: null };
  }

  const previousDueDate = task.dueDate ? parseISODate(task.dueDate) : null;
  const anchorDay = previousDueDate ? await seriesAnchorDay(task, previousDueDate) : null;
  const nextDueDate = computeNextDueDate(task.repeat, completionDate, previousDueDate, anchorDay);

  const now = nowISO();
  const nextInstance: Task = {
    id: uuid(),
    title: task.title,
    description: task.description,
    dueDate: nextDueDate ? toISODate(nextDueDate) : null,
    projectId: task.projectId,
    categoryId: task.categoryId,
    subcategoryId: task.subcategoryId,
    pinned: false,
    completed: false,
    completedAt: null,
    repeat: task.repeat,
    seriesId: task.seriesId,
    previousInstanceId: task.id,
    createdAt: now,
    updatedAt: now,
  };

  await tasksRepo.insert(nextInstance);
  return { completed, nextInstance };
}

// The day of month a monthly or yearly series falls on: the previous due
// date's day, unless that was a short month's last day standing in for a
// later day. Then the series' first due date (the row whose id is the
// seriesId) says which day it really is, so Jan 31 → Feb 28 is followed by
// Mar 31 rather than Mar 28. Editing an occurrence to a mid-month day moves
// the series to that day.
async function seriesAnchorDay(task: Task, previousDueDate: Date): Promise<number> {
  const day = previousDueDate.getDate();
  if (day < lastDayOfMonth(previousDueDate)) return day;
  const first = await tasksRepo.get(task.seriesId);
  const firstDay = first?.dueDate ? parseISODate(first.dueDate).getDate() : 0;
  return firstDay > day ? firstDay : day;
}

// Plain field flip. Note: un-completing an already-spawned repeating task's
// historical instance intentionally does not retract the next instance that
// was already created — a known, acceptable edge case in v1.
export function uncompleteTask(taskId: ID): Promise<Task> {
  return tasksRepo.update(taskId, { completed: false, completedAt: null });
}
