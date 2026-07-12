import { getDb } from './db';
import type { Task, RepeatConfig } from '../models/types';
import { uuid } from '../utils/uuid';
import { nowISO } from '../utils/dates';

export interface TaskInput {
  title: string;
  description: string;
  dueDate: string | null;
  projectId: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  repeat: RepeatConfig;
}

export async function list(): Promise<Task[]> {
  const db = await getDb();
  return db.getAll('tasks');
}

export async function get(id: string): Promise<Task | undefined> {
  const db = await getDb();
  return db.get('tasks', id);
}

export async function create(input: TaskInput): Promise<Task> {
  const db = await getDb();
  const now = nowISO();
  const id = uuid();
  const task: Task = {
    id,
    ...input,
    pinned: false,
    completed: false,
    completedAt: null,
    seriesId: id,
    previousInstanceId: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.add('tasks', task);
  return task;
}

export async function update(id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<Task> {
  const db = await getDb();
  const existing = await db.get('tasks', id);
  if (!existing) throw new Error(`Task ${id} not found`);
  const updated: Task = { ...existing, ...patch, updatedAt: nowISO() };
  await db.put('tasks', updated);
  return updated;
}

export async function remove(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('tasks', id);
}

// Inserts an already-constructed Task row verbatim — used by domain/repeat.ts
// to add the spawned next occurrence of a repeating task.
export async function insert(task: Task): Promise<Task> {
  const db = await getDb();
  await db.add('tasks', task);
  return task;
}

export async function listByProject(projectId: string): Promise<Task[]> {
  const db = await getDb();
  return db.getAllFromIndex('tasks', 'by-projectId', projectId);
}

export async function listStandalone(): Promise<Task[]> {
  const db = await getDb();
  const all = await db.getAll('tasks');
  return all.filter((t) => t.projectId === null);
}

export async function listByCategory(categoryId: string): Promise<Task[]> {
  const db = await getDb();
  return db.getAllFromIndex('tasks', 'by-categoryId', categoryId);
}

export async function listBySeries(seriesId: string): Promise<Task[]> {
  const db = await getDb();
  return db.getAllFromIndex('tasks', 'by-seriesId', seriesId);
}
