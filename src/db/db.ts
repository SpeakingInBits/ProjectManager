import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Category, Subcategory, Project, Task, TimeEntry } from '../models/types';

export const DB_NAME = 'project-manager-db';
export const DB_VERSION = 2;

// Note: IndexedDB indexes silently exclude records whose index key path
// evaluates to `null`/`undefined` (neither is a valid IndexedDB key), so we
// only index fields that are populated when set (projectId, categoryId,
// seriesId as foreign keys) and never index nullable-by-default fields like
// dueDate or completed (a boolean, also not a valid IndexedDB key). Those are
// filtered in memory instead, which is fine at this app's data scale.
export interface PMDB extends DBSchema {
  categories: {
    key: string;
    value: Category;
  };
  subcategories: {
    key: string;
    value: Subcategory;
    indexes: { 'by-categoryId': string };
  };
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-categoryId': string };
  };
  tasks: {
    key: string;
    value: Task;
    indexes: {
      'by-projectId': string;
      'by-categoryId': string;
      'by-seriesId': string;
    };
  };
  timeEntries: {
    key: string;
    value: TimeEntry;
  };
}

let dbPromise: Promise<IDBPDatabase<PMDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<PMDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PMDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          db.createObjectStore('categories', { keyPath: 'id' });

          const subcategories = db.createObjectStore('subcategories', { keyPath: 'id' });
          subcategories.createIndex('by-categoryId', 'categoryId');

          const projects = db.createObjectStore('projects', { keyPath: 'id' });
          projects.createIndex('by-categoryId', 'categoryId');

          const tasks = db.createObjectStore('tasks', { keyPath: 'id' });
          tasks.createIndex('by-projectId', 'projectId');
          tasks.createIndex('by-categoryId', 'categoryId');
          tasks.createIndex('by-seriesId', 'seriesId');
        }

        if (oldVersion < 2) {
          db.createObjectStore('timeEntries', { keyPath: 'id' });

          // Backfill the new `order` field on existing projects, seeded by
          // creation time so the current visual order is preserved.
          const projectStore = tx.objectStore('projects');
          const projects = await projectStore.getAll();
          projects.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          let order = 0;
          for (const project of projects) {
            await projectStore.put({ ...project, order: order++ });
          }

          // Backfill the new `pinned` field and drop the removed
          // `timeSpentHours` field on existing tasks.
          const taskStore = tx.objectStore('tasks');
          const tasks = await taskStore.getAll();
          for (const task of tasks) {
            const { timeSpentHours, ...rest } = task as Task & { timeSpentHours?: number };
            void timeSpentHours;
            await taskStore.put({ ...rest, pinned: rest.pinned ?? false });
          }
        }
      },
    });
  }
  return dbPromise;
}
