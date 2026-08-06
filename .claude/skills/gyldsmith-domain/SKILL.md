---
name: gyldsmith-domain
description: Safely modify Gyldsmith's domain logic — the solver (piece search, DP, pruning), gem assignment (min-cost max-flow, leximax), Victory Wine rules, socket-shape rules, costs, feasibility, or the Plan shape. Use this skill whenever a change touches src/utils/solver.ts, src/utils/assign.ts, src/utils/game.ts, src/utils/shapes.ts, src/utils/verdict.ts or src/types.ts, or when a solver result, gold total, or feasibility flag looks wrong. Consult it BEFORE editing any of those files.
---

# Changing Gyldsmith domain logic

The domain layer is an exact optimizer: a lexicographic objective (priority-delivered ranks → total gold → preset ranks → piece count) over a bit-packed DP, evaluated with a min-cost max-flow gem assignment. It is compact and every piece is load-bearing. Read before editing:

1. `docs/solver.md` — the full pipeline, objective, DP state packing, pruning, memoization.
2. `docs/assignment.md` — the transport model, leximax, non-reentrancy, hard size limits.
3. `docs/invariants.md` — the must-stay-in-sync list. Every invariant you might violate is catalogued there with what breaks.

## The contract you must not silently break

`ssr-smoke.mjs` and `tests/solver.spec.ts` pin exact `grandTotal` values (1825 / 1347 / 355 / 355 with the current catalog). These totals ARE the specification of "the solver picks the cheapest plan". After any domain edit:

```
pnpm test && pnpm smoke
```

- Totals unchanged → your change preserved behavior.
- Totals changed → either your change is wrong, or you intentionally changed a rule. Only in the second case update the fixtures, and record the reasoning in `docs/testing.md` (fixtures table) in the same change.

## Traps that have bitten before (why the invariants doc exists)

- `assignGems` reuses module-level typed-array buffers — it is NOT reentrant and caps at 10 affix rows (`MAXN = 16`). Never call it from inside one of its own callbacks.
- The DP packs presets in 4 bits per affix and socket supply in 5 bits per shape; the memo/state key multiplier `1048576` is `2^(5 × 4 shapes)`. Adding a shape or exceeding 8 affix rows breaks the packing silently.
- `SHAPE_IDS` order (from `Object.keys(SHAPES)`) is shared by supply arrays, bit positions and the socket-filling walk. Never reorder `SHAPES`.
- A socket with unknown shape (`null`) is NOT a wildcard — gems never enter it. An affix with no mapped gems IS permissive. Both directions are deliberate.
- `gemFor` = cheapest gem only because `gemsByAffix` is price-sorted at build time.
- `resolveWine` is the single source of truth for wine points; the store and the solver both call it. Never add a second normalization path.
- Wine-only rows sit strictly after `picks` in `results`; UI drag logic depends on that ordering.
- `maxGemLevel` is assumed to be exactly 1 by the flow model (one gem = one rank). Changing it requires redesigning the cost model, not just the constant.

## Procedure

1. Read the three docs above; identify which invariants your change touches.
2. Write or adjust the unit test in `tests/` that pins the new expected behavior FIRST.
3. Make the minimal edit. The solver must stay a pure function of `BuildState` — no Vue, no store, no I/O.
4. Run `pnpm test` then `pnpm smoke`; reconcile every total change consciously.
5. Update `docs/solver.md` / `docs/assignment.md` / `docs/invariants.md` to match the new reality — the code has no comments, so stale docs mean the knowledge is simply gone.
