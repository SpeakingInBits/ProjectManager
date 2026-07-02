import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Category, Subcategory, Project, Task } from '../models/types';

export const DB_NAME = 'project-manager-db';
export const DB_VERSION = 1;

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
}

let dbPromise: Promise<IDBPDatabase<PMDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<PMDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PMDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
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
      },
    });
  }
  return dbPromise;
}
