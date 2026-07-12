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

// Always returned in manual sort order (ascending `order`, createdAt as a
// stable tiebreak) so callers can render the user's chosen sequence directly.
export async function list(): Promise<Project[]> {
  const db = await getDb();
  const projects = await db.getAll('projects');
  return projects.sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export async function get(id: string): Promise<Project | undefined> {
  const db = await getDb();
  return db.get('projects', id);
}

export async function create(input: ProjectInput): Promise<Project> {
  const db = await getDb();
  const now = nowISO();
  const existing = await db.getAll('projects');
  const order = existing.reduce((max, p) => Math.max(max, p.order), -1) + 1;
  const project: Project = { id: uuid(), ...input, order, createdAt: now, updatedAt: now };
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

// Moves a project one slot up or down in the manual order by swapping its
// `order` value with the adjacent project's. No-op at the ends of the list.
export async function move(id: string, direction: 'up' | 'down'): Promise<void> {
  const db = await getDb();
  const ordered = (await db.getAll('projects')).sort(
    (a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt)
  );
  const index = ordered.findIndex((p) => p.id === id);
  if (index === -1) return;
  const neighborIndex = direction === 'up' ? index - 1 : index + 1;
  const current = ordered[index];
  const neighbor = ordered[neighborIndex];
  if (!current || !neighbor) return;
  const now = nowISO();

  const tx = db.transaction('projects', 'readwrite');
  await tx.store.put({ ...current, order: neighbor.order, updatedAt: now });
  await tx.store.put({ ...neighbor, order: current.order, updatedAt: now });
  await tx.done;
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
