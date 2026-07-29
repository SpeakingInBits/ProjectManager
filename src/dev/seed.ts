// Dev-only test data seeding, loaded from main.ts only when running under
// `npm run dev` (import.meta.env.DEV) so it never ships in the production
// bundle. Exposes two functions on `window`:
//
//   seedTestData()   — wipe the database and fill it with realistic demo data
//   clearTestData()  — wipe the database
//
// Data is generated with a fixed-seed PRNG, so every seed run produces the
// same relative dataset — handy for eyeballing a refactor before/after.
import { getDb } from '../db/db';
import * as categoriesRepo from '../db/categories.repo';
import * as subcategoriesRepo from '../db/subcategories.repo';
import * as projectsRepo from '../db/projects.repo';
import * as tasksRepo from '../db/tasks.repo';
import * as timeEntriesRepo from '../db/timeEntries.repo';
import type { RepeatConfig } from '../models/types';
import { todayISODate, toISODate, parseISODate, addDays, nowISO } from '../utils/dates';
import { INCREMENT_MINUTES } from '../domain/timeTracking';

// mulberry32 — tiny deterministic PRNG so seeded data is reproducible.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);
const chance = (p: number): boolean => rand() < p;
const randInt = (min: number, max: number): number => min + Math.floor(rand() * (max - min + 1));
const pick = <T>(items: T[]): T => {
  const item = items[Math.floor(rand() * items.length)];
  if (item === undefined) throw new Error('pick from empty array');
  return item;
};

const isoDaysFromToday = (days: number): string => toISODate(addDays(parseISODate(todayISODate()), days));

export async function clearTestData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['categories', 'subcategories', 'projects', 'tasks', 'timeEntries'], 'readwrite');
  await tx.objectStore('categories').clear();
  await tx.objectStore('subcategories').clear();
  await tx.objectStore('projects').clear();
  await tx.objectStore('tasks').clear();
  await tx.objectStore('timeEntries').clear();
  await tx.done;
  console.info('[seed] All data cleared.');
}

// Random 15-minute-increment minutes per day over the past `days` days,
// hitting roughly `workRate` of weekdays and `weekendRate` of weekend days —
// enough history to fill the Today / This week / This month rollups and the
// history modal.
function randomDailyLog(days: number, workRate: number, weekendRate: number, notes: string[]): {
  dailyMinutes: Record<string, number>;
  dailyNotes: Record<string, string>;
} {
  const dailyMinutes: Record<string, number> = {};
  const dailyNotes: Record<string, string> = {};
  for (let ago = 0; ago < days; ago++) {
    const date = addDays(parseISODate(todayISODate()), -ago);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    if (!chance(isWeekend ? weekendRate : workRate)) continue;
    const iso = toISODate(date);
    dailyMinutes[iso] = randInt(1, 12) * INCREMENT_MINUTES; // 15m – 3h
    if (chance(0.35)) dailyNotes[iso] = pick(notes);
  }
  return { dailyMinutes, dailyNotes };
}

export async function seedTestData(): Promise<void> {
  await clearTestData();

  // --- Categories & subcategories ---
  const work = await categoriesRepo.create({ name: 'Work' });
  const personal = await categoriesRepo.create({ name: 'Personal' });
  const learning = await categoriesRepo.create({ name: 'Learning' });

  const clientA = await subcategoriesRepo.create({ categoryId: work.id, name: 'Client A' });
  const internal = await subcategoriesRepo.create({ categoryId: work.id, name: 'Internal' });
  const home = await subcategoriesRepo.create({ categoryId: personal.id, name: 'Home' });
  const health = await subcategoriesRepo.create({ categoryId: personal.id, name: 'Health' });
  const courses = await subcategoriesRepo.create({ categoryId: learning.id, name: 'Courses' });

  // --- Projects ---
  const website = await projectsRepo.create({
    title: 'Client A website redesign',
    description: 'Full redesign of the marketing site: new IA, visual refresh, CMS migration.',
    dueDate: isoDaysFromToday(21),
    categoryId: work.id,
    subcategoryId: clientA.id,
  });
  const audit = await projectsRepo.create({
    title: 'Q3 security audit',
    description: 'Internal audit of auth flows and dependency versions.',
    dueDate: isoDaysFromToday(-3), // overdue
    categoryId: work.id,
    subcategoryId: internal.id,
  });
  const kitchen = await projectsRepo.create({
    title: 'Kitchen renovation',
    description: 'Cabinets, counters, and that leaky faucet.',
    dueDate: isoDaysFromToday(45),
    categoryId: personal.id,
    subcategoryId: home.id,
  });
  const tsCourse = await projectsRepo.create({
    title: 'TypeScript deep-dive course',
    description: 'Work through the advanced-types course, one module at a time.',
    dueDate: null,
    categoryId: learning.id,
    subcategoryId: courses.id,
  });
  const garden = await projectsRepo.create({
    title: 'Spring garden prep',
    description: 'No due date, no category — a bare-bones project.',
    dueDate: null,
    categoryId: null,
    subcategoryId: null,
  });

  // --- Tasks ---
  const never: RepeatConfig = { kind: 'never' };
  interface SeedTask {
    title: string;
    projectId: string | null;
    categoryId: string | null;
    subcategoryId: string | null;
    dueDate: string | null;
    repeat?: RepeatConfig;
    completed?: boolean;
    pinned?: boolean;
    description?: string;
  }
  const seedTasks: SeedTask[] = [
    // Client A website (mix of done/open so the progress bar is partial)
    { title: 'Audit current site content', projectId: website.id, categoryId: work.id, subcategoryId: clientA.id, dueDate: isoDaysFromToday(-14), completed: true },
    { title: 'Wireframes for top 5 pages', projectId: website.id, categoryId: work.id, subcategoryId: clientA.id, dueDate: isoDaysFromToday(-7), completed: true },
    { title: 'Visual design review with client', projectId: website.id, categoryId: work.id, subcategoryId: clientA.id, dueDate: isoDaysFromToday(2), pinned: true },
    { title: 'CMS content migration', projectId: website.id, categoryId: work.id, subcategoryId: clientA.id, dueDate: isoDaysFromToday(14) },
    { title: 'Launch checklist', projectId: website.id, categoryId: work.id, subcategoryId: clientA.id, dueDate: isoDaysFromToday(20), description: 'DNS, redirects, analytics, uptime monitor.' },
    // Security audit (overdue project, one overdue task)
    { title: 'Dependency version sweep', projectId: audit.id, categoryId: work.id, subcategoryId: internal.id, dueDate: isoDaysFromToday(-5) },
    { title: 'Review auth session expiry', projectId: audit.id, categoryId: work.id, subcategoryId: internal.id, dueDate: isoDaysFromToday(-10), completed: true },
    { title: 'Write findings report', projectId: audit.id, categoryId: work.id, subcategoryId: internal.id, dueDate: isoDaysFromToday(4) },
    // Kitchen
    { title: 'Get three contractor quotes', projectId: kitchen.id, categoryId: personal.id, subcategoryId: home.id, dueDate: isoDaysFromToday(7) },
    { title: 'Pick countertop material', projectId: kitchen.id, categoryId: personal.id, subcategoryId: home.id, dueDate: null },
    { title: 'Order cabinet hardware', projectId: kitchen.id, categoryId: personal.id, subcategoryId: home.id, dueDate: isoDaysFromToday(-2), completed: true },
    // TS course
    { title: 'Module 3: conditional types', projectId: tsCourse.id, categoryId: learning.id, subcategoryId: courses.id, dueDate: null, completed: true },
    { title: 'Module 4: template literal types', projectId: tsCourse.id, categoryId: learning.id, subcategoryId: courses.id, dueDate: null, pinned: true },
    { title: 'Module 5: variance annotations', projectId: tsCourse.id, categoryId: learning.id, subcategoryId: courses.id, dueDate: null },
    // Garden (uncategorized project)
    { title: 'Order seeds', projectId: garden.id, categoryId: null, subcategoryId: null, dueDate: isoDaysFromToday(10) },
    { title: 'Clear the raised beds', projectId: garden.id, categoryId: null, subcategoryId: null, dueDate: null },
    // Standalone tasks, incl. repeats of each flavor
    { title: 'Water the plants', projectId: null, categoryId: personal.id, subcategoryId: home.id, dueDate: isoDaysFromToday(0), repeat: { kind: 'daily' } },
    { title: 'Weekly planning review', projectId: null, categoryId: work.id, subcategoryId: null, dueDate: isoDaysFromToday(1), repeat: { kind: 'weekly' } },
    { title: 'Pay rent', projectId: null, categoryId: personal.id, subcategoryId: null, dueDate: isoDaysFromToday(3), repeat: { kind: 'monthly' } },
    { title: 'Renew domain names', projectId: null, categoryId: work.id, subcategoryId: null, dueDate: isoDaysFromToday(90), repeat: { kind: 'yearly' } },
    { title: 'Backup laptop', projectId: null, categoryId: null, subcategoryId: null, dueDate: isoDaysFromToday(-1), repeat: { kind: 'custom', intervalDays: 14 } },
    { title: 'Change HVAC filter', projectId: null, categoryId: personal.id, subcategoryId: home.id, dueDate: null, repeat: { kind: 'movable', intervalDays: 30 } },
    { title: 'Dentist appointment', projectId: null, categoryId: personal.id, subcategoryId: health.id, dueDate: isoDaysFromToday(12) },
    { title: 'Morning run', projectId: null, categoryId: personal.id, subcategoryId: health.id, dueDate: isoDaysFromToday(0), repeat: { kind: 'daily' }, completed: true },
    { title: 'Expense report', projectId: null, categoryId: work.id, subcategoryId: null, dueDate: isoDaysFromToday(-4) },
    { title: 'Read "Working Effectively with Legacy Code"', projectId: null, categoryId: learning.id, subcategoryId: null, dueDate: null },
  ];

  for (const t of seedTasks) {
    const task = await tasksRepo.create({
      title: t.title,
      description: t.description ?? '',
      dueDate: t.dueDate,
      projectId: t.projectId,
      categoryId: t.categoryId,
      subcategoryId: t.subcategoryId,
      repeat: t.repeat ?? never,
    });
    if (t.completed || t.pinned) {
      await tasksRepo.update(task.id, {
        ...(t.completed ? { completed: true, completedAt: nowISO() } : {}),
        ...(t.pinned ? { pinned: true } : {}),
      });
    }
  }

  // --- Time-tracked items (~10 weeks of history each) ---
  const workNotes = ['Sprint work', 'Meetings all afternoon', 'Code review + pairing', 'Deep focus block', 'Bug triage'];
  const personalNotes = ['Evening session', 'Weekend catch-up', 'Quick pass before dinner'];
  const learningNotes = ['One course module', 'Practice exercises', 'Notes + flashcards'];
  const seedTimeItems = [
    { title: 'Client A development', description: 'Implementation work on the redesign.', categoryId: work.id, workRate: 0.85, weekendRate: 0.05, notes: workNotes },
    { title: 'Internal tooling', description: 'CI, scripts, and dev-experience fixes.', categoryId: work.id, workRate: 0.4, weekendRate: 0, notes: workNotes },
    { title: 'Admin & email', description: '', categoryId: work.id, workRate: 0.6, weekendRate: 0, notes: workNotes },
    { title: 'Exercise', description: 'Runs, gym, and long walks.', categoryId: personal.id, workRate: 0.5, weekendRate: 0.7, notes: personalNotes },
    { title: 'Kitchen renovation work', description: 'Hands-on reno time.', categoryId: personal.id, workRate: 0.15, weekendRate: 0.8, notes: personalNotes },
    { title: 'TypeScript course', description: '', categoryId: learning.id, workRate: 0.3, weekendRate: 0.4, notes: learningNotes },
    { title: 'Podcasts & reading', description: 'Uncategorized on purpose.', categoryId: null, workRate: 0.35, weekendRate: 0.5, notes: learningNotes },
  ];

  for (const item of seedTimeItems) {
    const entry = await timeEntriesRepo.create({
      title: item.title,
      description: item.description,
      categoryId: item.categoryId,
    });
    await timeEntriesRepo.update(entry.id, randomDailyLog(70, item.workRate, item.weekendRate, item.notes));
  }

  console.info(
    `[seed] Done: 3 categories, 5 subcategories, 5 projects, ${seedTasks.length} tasks, ${seedTimeItems.length} time items. Reloading…`
  );
  location.reload();
}

export function installDevTools(): void {
  Object.assign(window, { seedTestData, clearTestData });
  console.info('[dev] Test data helpers available: seedTestData(), clearTestData()');
}

declare global {
  interface Window {
    seedTestData: typeof seedTestData;
    clearTestData: typeof clearTestData;
  }
}
