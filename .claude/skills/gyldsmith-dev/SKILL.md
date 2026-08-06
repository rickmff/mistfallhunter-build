---
name: gyldsmith-dev
description: How to work on the Gyldsmith codebase (Mistfall Hunter build planner). Use this skill for ANY task in this repository — bug fixes, features, refactors, UI tweaks, dependency updates, or questions about how the app works — even when the user does not name a file. It routes you to the right docs/ guide, lists the commands, and defines the non-negotiable verification gate. Consult it BEFORE reading source files.
---

# Working on Gyldsmith

Gyldsmith is a build planner for the game Mistfall Hunter: the player declares target affixes (plus a Victory Wine point budget), and an exact solver picks the cheapest real Auction House listings and gem placement. Vue 3 + Vuetify 4 + TypeScript strict + Pinia + Vite.

## Rule zero: the code has no comments

All system knowledge lives in `docs/` (English markdown), indexed by `docs/README.md`. Never add comments to code — if something needs explaining, the explanation belongs in the matching doc. When you change behavior, update the doc in the same change.

## Route your task before opening code

| Task | Read first |
| --- | --- |
| Anything touching solver, gem assignment, costs, feasibility | `docs/solver.md`, `docs/assignment.md`, `docs/invariants.md` — then use the `gyldsmith-domain` skill |
| Updating game data (listings, gems, affixes, pools, wine tiers) | use the `gyldsmith-data-update` skill |
| Victory Wine behavior | `docs/wine.md`, `docs/invariants.md` |
| Socket shapes / gem compatibility | `docs/shapes-and-gems.md` |
| Store, URL-hash persistence, components, theming, pips, banners | `docs/state-and-ui.md` |
| Per-piece verdict text | `docs/verdict.md` |
| Tests, smoke fixtures, CI | `docs/testing.md` |
| New to the repo | `docs/README.md` reading order, then `docs/architecture.md` |

## Architecture rules (why they exist)

- Layers flow one way: `src/data` → `src/utils` → `src/stores` → `src/components`. The solver (`src/utils/solver.ts`) is a pure function of `BuildState`; it must never import Vue, the store, or anything with side effects — that purity is what makes the SSR smoke test and the unit tests possible.
- The Pinia store `src/stores/build.ts` is the only state owner. Components never compute domain facts; they read `store.plan` (recomputed synchronously on every mutation) and call store actions.
- `picks` array ORDER is the gem-allocation priority. Preserve it in any state manipulation.
- Imports use the `@` alias (`@` = `src`), no extensions except `.vue`.
- All domain types live in `src/types.ts`. Extend there, never inline structural types for domain concepts.

## Commands

| Command | What |
| --- | --- |
| `pnpm dev` | Vite dev server |
| `pnpm typecheck` | `vue-tsc --build` (strict) |
| `pnpm lint` / `pnpm lint:fix` | ESLint flat (vue recommended + ts recommended) |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm test` / `pnpm test:watch` | Vitest domain tests in `tests/` |
| `pnpm build` | typecheck + vite build |
| `pnpm smoke` | SSR render + solver-total contract (`ssr-smoke.mjs`) |

## Verification gate — run before declaring any change done

```
pnpm lint && pnpm typecheck && pnpm test && pnpm smoke
```

The smoke test asserts exact rendered strings and exact `grandTotal` gold values — they are the behavioral contract of the solver. If a total changes, do not update the fixture until you can explain the change from a data or rule change you made on purpose (see `docs/testing.md`).

## Style

Prettier owns formatting: no semicolons, single quotes, 2-space indent, width 100. UI copy is pt-BR; code identifiers and docs are English. Package manager is pnpm only.
