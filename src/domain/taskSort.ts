import type { Task } from '../models/types';

// Ordering for task lists:
//   1. incomplete before completed (completed sink to the bottom),
//   2. among incomplete, pinned before unpinned,
//   3. then by closest due date ascending (tasks with no due date go last),
//   4. finally by title so the order is stable.
export function compareTasks(a: Task, b: Task): number {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;

  if (!a.completed && a.pinned !== b.pinned) return a.pinned ? -1 : 1;

  const dueCmp = compareDueDate(a.dueDate, b.dueDate);
  if (dueCmp !== 0) return dueCmp;

  return a.title.localeCompare(b.title);
}

function compareDueDate(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b); // ISO dates sort correctly as strings
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(compareTasks);
}
