# ProjectManager

A personal Progressive Web App for managing projects and the tasks underneath
them. Built with TypeScript, HTML, and CSS — no UI framework, no backend. All
data lives in the browser via IndexedDB.

## Features

- **Projects** with a title, description, optional due date, and a progress
  bar showing tasks completed vs. total. A project's total time spent is
  derived automatically from its tasks (not tracked separately).
- **Tasks** with a title, description, optional due date, and time spent
  (hours). Each task can belong to a single project, or stand alone. The
  Tasks page settings can turn on a confirmation prompt before a task is
  marked complete.
- **Repeatable tasks** — optional, one of: Never, Daily, Weekly, Monthly,
  Yearly, a custom number of days, or **Movable** (reappears N days *after*
  you mark it complete, rather than on a fixed schedule). Completing a
  repeating task never resets it in place — the completed task stays as a
  permanent history record, and a new task is created for the next
  occurrence. This lets a project's progress bar genuinely reach 100%.
- **Categories & subcategories** — a single shared taxonomy usable by both
  projects and tasks, managed on one combined CRUD page.
- **Installable PWA** — has a web app manifest and a registered service
  worker. The service worker intentionally does **no file caching** (no
  precache, no runtime cache) since the app is under active development;
  every load pulls fresh files from the network.

## Tech stack

- [Vite](https://vite.dev/) + TypeScript (`vanilla-ts` template)
- Vanilla DOM rendering (a small `h()` hyperscript helper — no framework)
- A minimal hash-based router
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
  via the [`idb`](https://github.com/jakearchibald/idb) wrapper for
  persistence — all data stays local to the browser

## Getting started

Requires [Node.js](https://nodejs.org/) 18+.

```bash
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

Other scripts:

```bash
npm run build     # type-check (tsc) + production build to dist/
npm run preview   # serve the production build locally
npm test          # unit tests (Vitest): domain logic + repos on fake-indexeddb
npm run test:watch # unit tests in watch mode
npm run test:e2e  # UI tests (Playwright/Chromium) against the dev server
```

Before first running the UI tests, download the browser once with
`npx playwright install chromium`. The UI tests start the dev server
automatically (or reuse one already running on port 5173); each test gets a
fresh browser context, so they never touch existing local data. Run a single
test file with `npx vitest run tests/unit/repeat.test.ts` or
`npx playwright test tests/e2e/tasks.spec.ts`.

### Test data

In dev mode (`npm run dev` only — never shipped in the production bundle),
two helpers are available in the browser devtools console:

- `seedTestData()` — wipes the database and fills it with a reproducible demo
  dataset: categories/subcategories, projects (some overdue), ~26 tasks
  (pinned, completed, every repeat flavor), and 7 time-tracked items with
  ~10 weeks of logged time and day notes. Reloads the page when done.
- `clearTestData()` — wipes the database.

Data generation uses a fixed-seed PRNG, so every seed run produces the same
dataset — useful for before/after comparisons when refactoring.

## Project structure

```
src/
  main.ts              Entry point: mounts the nav bar, router, and service worker
  models/types.ts       Domain types (Project, Task, Category, Subcategory, RepeatConfig)
  db/                    IndexedDB schema (db.ts) + one CRUD repo per entity
  domain/
    progress.ts          Project progress % / time-spent rollup calculations
    repeat.ts             Repeat-completion logic (spawns the next task instance)
  router/router.ts        Hash-based router
  pages/                  One render function per screen (projects, tasks, categories, forms)
  components/              Reusable UI pieces (progress bar, nav bar, pickers, task rows)
  utils/                   dom.ts (h/clear/qs), dates.ts, uuid.ts
public/
  manifest.json           Web app manifest
  sw.js                    No-op service worker (installability only, no caching)
  icons/                   App icons
```

## Data & offline behavior

All data (projects, tasks, categories, subcategories) is stored locally in
the browser's IndexedDB — there is no server and nothing is synced. Clearing
site data / browser storage will erase it.

Because the service worker does no caching, the app requires a network
connection to load (it is installable, but not offline-capable) while under
active development. This can be revisited with a precaching strategy (e.g.
`vite-plugin-pwa`) once the app's file set stabilizes.
