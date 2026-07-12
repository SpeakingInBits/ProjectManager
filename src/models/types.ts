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
  // Manual sort position on the projects list; lower comes first.
  order: number;
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
  // Pinned tasks float to the top of the Tasks page until unpinned or completed.
  pinned: boolean;
  completed: boolean;
  completedAt: string | null;
  repeat: RepeatConfig;
  seriesId: ID;
  previousInstanceId: ID | null;
  createdAt: string;
  updatedAt: string;
}

// A time-tracked item, independent of Tasks. Time is logged in 15-minute
// increments; `dailyMinutes` maps an ISO date (YYYY-MM-DD) to the total minutes
// worked that day, which is what powers the weekly/monthly/total rollups. Days
// that drop to zero are pruned from the map.
export interface TimeEntry {
  id: ID;
  title: string;
  description: string;
  dailyMinutes: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}
