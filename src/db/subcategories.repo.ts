import { getDb } from './db';
import type { Subcategory } from '../models/types';
import { uuid } from '../utils/uuid';
import { nowISO } from '../utils/dates';

export async function listByCategory(categoryId: string): Promise<Subcategory[]> {
  const db = await getDb();
  return db.getAllFromIndex('subcategories', 'by-categoryId', categoryId);
}

export async function get(id: string): Promise<Subcategory | undefined> {
  const db = await getDb();
  return db.get('subcategories', id);
}

export async function create(input: { categoryId: string; name: string }): Promise<Subcategory> {
  const db = await getDb();
  const subcategory: Subcategory = {
    id: uuid(),
    categoryId: input.categoryId,
    name: input.name,
    createdAt: nowISO(),
  };
  await db.add('subcategories', subcategory);
  return subcategory;
}

export async function update(id: string, patch: { name: string }): Promise<Subcategory> {
  const db = await getDb();
  const existing = await db.get('subcategories', id);
  if (!existing) throw new Error(`Subcategory ${id} not found`);
  const updated: Subcategory = { ...existing, ...patch };
  await db.put('subcategories', updated);
  return updated;
}

// subcategoryId is not indexed (nullable-by-default field, see db.ts), so
// referencing projects/tasks are found via a full scan + filter. Fine at
// this app's data scale.
export async function remove(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['subcategories', 'projects', 'tasks'], 'readwrite');

  const projects = await tx.objectStore('projects').getAll();
  for (const project of projects) {
    if (project.subcategoryId === id) {
      await tx.objectStore('projects').put({ ...project, subcategoryId: null });
    }
  }

  const tasks = await tx.objectStore('tasks').getAll();
  for (const task of tasks) {
    if (task.subcategoryId === id) {
      await tx.objectStore('tasks').put({ ...task, subcategoryId: null });
    }
  }

  await tx.objectStore('subcategories').delete(id);
  await tx.done;
}
