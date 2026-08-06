# Gyldsmith knowledge base

Purpose: index of the documentation for Gyldsmith, a build planner for Mistfall Hunter (Vue 3 + Vuetify 4 + TypeScript strict + Pinia + Vite). The source tree carries zero comments by policy; these docs are the only home of system knowledge — sources, provenance, warnings, and rationale all live here. Start with the glossary if any term below is unfamiliar, then follow the task-routing table to the doc that answers your question.

## Key files

| Path | Role |
| --- | --- |
| `docs/README.md` | This index: doc map, task routing, reading order, glossary. |
| `docs/architecture.md` | Layer map, dependency rules, reactive dataflow, module map for every file in `src/`, persistence design, SSR smoke architecture, tooling, conventions. |
| `docs/domain-data.md` | The `GAME` database: global parameters, per-slot AH listing catalog, affix table, wine tiers; data provenance and re-sampling rules. |
| `docs/solver.md` | `solve()` pipeline in `src/utils/solver.ts`: demand computation, exact DP piece search, gem allocation, cost model, `presetHunt`, every `Plan` field. |
| `docs/assignment.md` | `assignGems` in `src/utils/assign.ts`: min-cost max-flow gem-to-socket assignment and the priority-preserving fallback when demand cannot be fully met. |
| `docs/wine.md` | Victory Wine model: tier point budgets, per-affix caps, `resolveWine` normalization, wine-only affixes, run-only semantics. |
| `docs/shapes-and-gems.md` | The four socket shapes, material-to-shape mapping, the `circ` → `hex` misread correction, gem-per-shape catalog, socket fit rules. |
| `docs/verdict.md` | `verdictFor` in `src/utils/verdict.ts`: the per-piece buy rationale (raw vs preset), ceiling math, unknown-gem-price wording. |
| `docs/state-and-ui.md` | Pinia store API, URL-hash persistence schema and legacy migration, component reference for all 7 SFCs, pip system, banner decision tree, theming, CSS. |
| `docs/invariants.md` | Cross-module invariants in one place: statement, why it must hold, what breaks if violated. |
| `docs/testing.md` | Vitest unit suites and the SSR smoke harness: what each test pins down and how to add cases. |
| `docs/affixes.md` | Pre-existing Portuguese dictionary of affix icons, ids, and gems — the reference used to identify AH preset icons from screenshots. Keep it: it is the provenance record for `preset` values in the catalog. |

## Task routing

| Task | Read first | Then |
| --- | --- | --- |
| Change solver behavior (piece choice, allocation, cost) | `solver.md` | `assignment.md`, `invariants.md`, `testing.md` |
| Update AH catalog / new game patch data (listings, gems, prices, pools) | `domain-data.md` | `affixes.md` (icon identification), `shapes-and-gems.md` |
| Change Victory Wine rules (tiers, caps, budget) | `wine.md` | `state-and-ui.md` (wine actions), `solver.md` (demand) |
| UI / component change | `state-and-ui.md` | `architecture.md` (layer rules) |
| Add or fix tests | `testing.md` | `invariants.md`, `solver.md` |
| Release checks (CI, build, smoke) | `architecture.md` (tooling table) | `testing.md` |
| Onboard from zero | This README (glossary) | `architecture.md`, `domain-data.md`, `solver.md`, `state-and-ui.md` |

## Recommended reading order

1. `README.md` — glossary below.
2. `architecture.md` — layers, dataflow, module map.
3. `domain-data.md` — what the numbers mean and where they came from.
4. `shapes-and-gems.md` — shape system that constrains everything downstream.
5. `wine.md` — the demand-reducing layer applied before solving.
6. `solver.md` — the core computation.
7. `assignment.md` — the flow subroutine the solver calls.
8. `verdict.md` — how the plan explains itself.
9. `state-and-ui.md` — how the user drives all of the above.
10. `invariants.md` — what must never change silently.
11. `testing.md` — how all of it is pinned down.

## Glossary

| Term | Meaning |
| --- | --- |
| affix | A named stat bonus (`GAME.affixes`, 32 entries), leveled per build, in one of three categories: `offense`, `defense`, `utility`. |
| rank / level | One unit of an affix. Sources: a socketed gem (+1 each, `GAME.maxGemLevel = 1`), a factory preset on a piece (+1), or a Victory Wine point (+1, run-only). |
| threshold | The per-affix level that unlocks its secondary effect: 7 for most affixes, 5 for a group, `null` for affixes with no secondary effect. `GAME.thresholdLevel = 5` is only the fallback for unmapped affixes. |
| listing | One concrete Auction House sale row: `{ price, qty, preset, shapes }` under `GAME.slots[].listings`. The AH sells a finite set of these — never "a generic piece with a preset of your choice". |
| preset | An affix rolled onto a piece at the factory. A preset piece is `[ preset affix | 1 gem socket ]`: +1 free rank of that affix, one fewer gem socket. Max 1 preset per piece. |
| `'?'` preset | A listing that visibly has a preset whose icon was not identified. Useless to buy directly (1 socket, no usable rank — strictly worse than raw), but its price quotes what a preset piece of that slot/shape costs. |
| hypothetical preset | A piece the solver proposes that is not a confirmed listing: priced from the cheapest `'?'` listing of that slot and shape, flagged `hypothetical: true`, shown in the UI as "PROCURAR" (hunt it on the AH with the "Affix Effects" filter). |
| socket shape | One of exactly four socket forms (`bar` red rectangle, `tri` purple triangle, `sq` cyan square, `hex` green octagon). A gem only fits a socket of its own shape. Raw catalog value `circ` is a misread octagon, canonicalized to `hex`. |
| gem | A purchasable AH item granting +1 rank of one affix when socketed. Each affix has at most one gem per shape, with independent prices (`src/data/gems.ts`). |
| material | The gem family that fixes its shape: Agate/Onyx → `bar`, Amethyst → `tri`, Moonstone → `sq`, Peridot → `hex`. |
| Victory Wine | A pre-run consumable. Its tier grants a point budget; each point is +1 run-only rank on any affix (picked or not), capped per affix by the tier. Effects lock at run start and last until extraction or death. |
| tier points | The Victory Wine budget per tier: Mortal Tonic 2, Hero's Ale 4, War Blood 5, Gods Brew 6 (max 1 point per affix on the low tiers, 2 on the high ones). |
| AH | The in-game Auction House — the source of every price, quantity, shape, and preset in the data files. |
| presetHunt | `Plan.presetHunt`: affixes with open gem demand ranked by gem price, each with per-slot price ceilings — the shopping list for hunting preset listings that beat gems. |
| ceiling | The maximum price at which a preset listing beats buying raw + gem: cheapest raw listing of the slot + the affix's gem unit price. |
| grandTotal | `Plan.grandTotal = knownCost + gemsCost`: total gold for all bought pieces plus all gems the plan sockets. |

## Related docs

- [architecture.md](architecture.md)
- [state-and-ui.md](state-and-ui.md)
- [domain-data.md](domain-data.md)
- [solver.md](solver.md)
