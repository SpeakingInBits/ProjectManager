# ProjectManager

A personal Progressive Web App for managing projects and the tasks underneath
them. Built with TypeScript, HTML, and CSS — no UI framework, no backend. All
data lives in the browser via IndexedDB.

## Features

- **Projects** with a title, description, optional due date, and a progress
  bar showing tasks completed vs. total. A project's total time spent is
  derived automatically from its tasks (not tracked separately).
- **Tasks** with a title, description, optional due date, and time spent
  (hours). Each task can belong to a single project, or stand alone.
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
```

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
