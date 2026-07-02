export type ID = string;

export interface Category {
  id: ID;
  name: string;
  createdAt: string;
}

export interface Subcategory {
  id: ID;
  categoryId: ID;
  name: string;
  createdAt: string;
}

export interface Project {
  id: ID;
  title: string;
  description: string;
  dueDate: string | null;
  categoryId: ID | null;
  subcategoryId: ID | null;
  createdAt: string;
  updatedAt: string;
}

export type RepeatConfig =
  | { kind: 'never' }
  | { kind: 'daily' }
  | { kind: 'weekly' }
  | { kind: 'monthly' }
  | { kind: 'yearly' }
  | { kind: 'custom'; intervalDays: number }
  | { kind: 'movable'; intervalDays: number };

export interface Task {
  id: ID;
  title: string;
  description: string;
  dueDate: string | null;
  projectId: ID | null;
  categoryId: ID | null;
  subcategoryId: ID | null;
  timeSpentHours: number;
  completed: boolean;
  completedAt: string | null;
  repeat: RepeatConfig;
  seriesId: ID;
  previousInstanceId: ID | null;
  createdAt: string;
  updatedAt: string;
}
