import { getDb } from './db';
import type { Project } from '../models/types';
import { uuid } from '../utils/uuid';
import { nowISO } from '../utils/dates';

export interface ProjectInput {
  title: string;
  description: string;
  dueDate: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
}

export async function list(): Promise<Project[]> {
  const db = await getDb();
  return db.getAll('projects');
}

export async function get(id: string): Promise<Project | undefined> {
  const db = await getDb();
  return db.get('projects', id);
}

export async function create(input: ProjectInput): Promise<Project> {
  const db = await getDb();
  const now = nowISO();
  const project: Project = { id: uuid(), ...input, createdAt: now, updatedAt: now };
  await db.add('projects', project);
  return project;
}

export async function update(id: string, patch: Partial<ProjectInput>): Promise<Project> {
  const db = await getDb();
  const existing = await db.get('projects', id);
  if (!existing) throw new Error(`Project ${id} not found`);
  const updated: Project = { ...existing, ...patch, updatedAt: nowISO() };
  await db.put('projects', updated);
  return updated;
}

// Deletion is not a silent cascade: the caller decides whether to delete the
// project's tasks or reassign them to standalone (projectId = null).
export async function removeProject(id: string, opts: { deleteTasks: boolean }): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['projects', 'tasks'], 'readwrite');

  const tasks = await tx.objectStore('tasks').index('by-projectId').getAll(id);
  for (const task of tasks) {
    if (opts.deleteTasks) {
      await tx.objectStore('tasks').delete(task.id);
    } else {
      await tx.objectStore('tasks').put({ ...task, projectId: null });
    }
  }

  await tx.objectStore('projects').delete(id);
  await tx.done;
}
