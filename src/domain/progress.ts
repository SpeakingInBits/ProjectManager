import type { Task } from '../models/types';

export interface ProjectProgress {
  done: number;
  total: number;
  percent: number;
}

export function computeProjectProgress(tasks: Task[]): ProjectProgress {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}

export function computeProjectTimeSpent(tasks: Task[]): number {
  return tasks.reduce((sum, t) => sum + t.timeSpentHours, 0);
}
