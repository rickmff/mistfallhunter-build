# Gyldsmith — Mistfall Hunter build planner

Vue 3 + Vuetify 4 + TypeScript strict + Pinia + Vite. The player declares target affixes and a Victory Wine point budget; an exact solver (`src/utils/solver.ts`) picks the cheapest real Auction House listings and gem placement. Pieces and presets are solver OUTPUT, never user input.

## Hard rules

- **Zero comments in code.** All knowledge lives in `docs/` (English). If you learn something about the system, it goes in the matching doc, not in the code. Stale docs = lost knowledge.
- **Docs are the knowledge base.** Start at `docs/README.md` (index + task routing + glossary). Read `docs/invariants.md` before touching `src/utils/` or `src/data/`.
- **Skills.** Use `gyldsmith-dev` for any task here, `gyldsmith-domain` before editing solver/assign/wine/shapes logic, `gyldsmith-data-update` before editing game data.
- **The smoke totals are the solver's contract.** `pnpm smoke` pins exact `grandTotal` values; never update them without explaining the change from an intentional data/rule edit (`docs/testing.md`).
- `picks` order = gem allocation priority. `resolveWine` is the single source of truth for wine points. The solver is a pure function — no Vue, no store, no I/O inside `src/utils/`.

## Layout

| Path | Role |
| --- | --- |
| `src/types.ts` | every domain type |
| `src/data/` | editable patch database (listings, gems, pools) |
| `src/utils/` | pure domain logic (solver, assign, shapes, wine, verdict) |
| `src/stores/` | Pinia store + URL-hash codec |
| `src/components/` | thin Vuetify UI (`<script setup lang="ts">`) |
| `tests/` | Vitest domain tests |
| `docs/` | the entire system knowledge base |

## Verification gate (run before finishing any change)

```
pnpm lint && pnpm typecheck && pnpm test && pnpm smoke
```

pnpm only. Prettier owns style (no semicolons, single quotes). UI copy pt-BR; identifiers and docs English. Imports use `@` = `src`.
