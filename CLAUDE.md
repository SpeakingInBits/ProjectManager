# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Vite dev server (http://localhost:5173)
npm run build     # tsc + vite build — this IS the typecheck; run it before finishing any change
npm run preview   # serve the production build
```

There is **no test framework and no linter** — `npm run build` (strict tsc) is the only automated gate. Verification is done manually in the browser against seeded data (below). Pushing to `main` auto-deploys to GitHub Pages via `.github/workflows/deploy.yml`, so never push unverified work to `main`; use a feature branch → PR (squash merge is the norm here).

### Test data

With the dev server running, the browser devtools console has two dev-only helpers (installed from `src/dev/seed.ts` via an `import.meta.env.DEV` dynamic import, excluded from production bundles):

- `seedTestData()` — wipes IndexedDB and generates a reproducible dataset (fixed-seed PRNG): categories/subcategories, projects, tasks covering every repeat flavor plus pinned/completed/overdue states, and time entries with ~10 weeks of history. Reloads when done.
- `clearTestData()` — wipes IndexedDB.

Never run these in a browser profile holding real data — the app has no backend and IndexedDB is the only copy.

## Architecture

Vanilla TypeScript PWA: no UI framework, no backend, all data in the browser's IndexedDB (via the `idb` wrapper). The layering is strict and one-directional:

```
pages/ (one async render fn per screen)
  → components/ (reusable DOM builders)
  → domain/ (pure logic: repeat, progress, timeTracking, taskSort)
  → db/ (one CRUD repo per entity + db.ts schema/migrations)
```

**Rendering model:** everything is built with the `h()` hyperscript helper (`src/utils/dom.ts`); `null`/`false` children are skipped, so conditional UI is written inline as `cond ? h(...) : null`. There is no reactivity — each page defines a local `render()` that rebuilds the whole page and calls it again after every mutation (see `timeTrackingPage.ts` for the canonical shape). Navigation is a tiny hash router (`#/time`, `#/tasks/:id/edit`); pages receive `(container, params)`.

**IndexedDB schema changes:** any new field on a stored type requires bumping `DB_VERSION` in `src/db/db.ts` and adding an `if (oldVersion < N)` block that backfills existing rows (see the v2–v4 blocks for the pattern). Never index a nullable field — IndexedDB indexes silently drop rows whose key is `null`/`undefined` (explained in the comment atop `db.ts`); filter in memory instead, which is fine at this app's scale.

**Shared taxonomy:** categories/subcategories are one taxonomy used by projects, tasks, *and* time entries. `categories.repo.removeCategory` is the cascade point — it deletes subcategories and detaches (`categoryId: null`) every referencing entity. If a new entity gains a `categoryId`, it must be added there (and to `subcategories.repo.remove` if it also gains `subcategoryId`), plus the delete-confirmation text in `categoriesPage.ts`.

**Repeating tasks** (`src/domain/repeat.ts`): completing a repeating task never resets it in place — the completed row is kept forever as history and a *new* task row is spawned for the next occurrence (linked by `seriesId`/`previousInstanceId`). Most repeat kinds are schedule-anchored (next date computed from the previous due date, so no drift); `movable` is completion-anchored. This history-preserving design is what lets project progress bars genuinely reach 100% — don't "optimize" it into an in-place reset.

**Time tracking** (`src/domain/timeTracking.ts`): time is logged in 15-minute increments into `TimeEntry.dailyMinutes`, a map of ISO date → minutes; `dailyNotes` parallels it. A day that drops to zero is pruned from both maps (a note cannot exist without logged time). All rollups (today/week/month, per-category cards) are computed from these maps; weeks run Monday–Sunday. The Time page has a module-level `entryDate` that lets the user backfill past days — new "today" UI must respect it, not `todayISODate()` directly.
