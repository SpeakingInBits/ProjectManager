import { getDb } from './db';
import type { Category } from '../models/types';
import { uuid } from '../utils/uuid';
import { nowISO } from '../utils/dates';

export async function list(): Promise<Category[]> {
  const db = await getDb();
  return db.getAll('categories');
}

export async function get(id: string): Promise<Category | undefined> {
  const db = await getDb();
  return db.get('categories', id);
}

export async function create(input: { name: string }): Promise<Category> {
  const db = await getDb();
  const category: Category = { id: uuid(), name: input.name, createdAt: nowISO() };
  await db.add('categories', category);
  return category;
}

export async function update(id: string, patch: { name: string }): Promise<Category> {
  const db = await getDb();
  const existing = await db.get('categories', id);
  if (!existing) throw new Error(`Category ${id} not found`);
  const updated: Category = { ...existing, ...patch };
  await db.put('categories', updated);
  return updated;
}

export async function removeCategory(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['categories', 'subcategories', 'projects', 'tasks'], 'readwrite');

  const subcategories = await tx.objectStore('subcategories').index('by-categoryId').getAll(id);
  for (const sub of subcategories) {
    await tx.objectStore('subcategories').delete(sub.id);
  }

  const projects = await tx.objectStore('projects').index('by-categoryId').getAll(id);
  for (const project of projects) {
    await tx.objectStore('projects').put({ ...project, categoryId: null, subcategoryId: null });
  }

  const tasks = await tx.objectStore('tasks').index('by-categoryId').getAll(id);
  for (const task of tasks) {
    await tx.objectStore('tasks').put({ ...task, categoryId: null, subcategoryId: null });
  }

  await tx.objectStore('categories').delete(id);
  await tx.done;
}
