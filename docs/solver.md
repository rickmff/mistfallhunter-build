# Solver — `solve()` in `src/utils/solver.ts`

Purpose: complete map of the planning engine. `solve(state)` is a pure function: given the affixes the player wants (`BuildState`), it returns the cheapest set of REAL Auction House listings that delivers them (`Plan`). There is no "manual mode" and no optimize button — the plan comes out optimal on every recompute. The engine departs from the naive model in one key way: the game does not sell "a piece of slot X with the preset you choose"; each slot has a finite catalog of concrete listings (`GAME.slots[].listings`), each with its own price and one of two forms — `[preset | socket]` (+1 free rank of that affix, 1 gem socket) or `[socket socket]` (raw, 2 gem sockets). The "preset premium" is therefore not an assumption: it is the price difference between two listings that actually exist. Every piece delivers 2 ranks of capacity (2 gems, or 1 preset + 1 gem); buying P pieces gives 2·P ranks, so feasibility depends on count, but what the preset changes is COST: it trades a paid gem for a fraction of the piece price. Total cost = Σ listing prices + Σ (gem price × ranks left for gems), with each gem priced by the shape of the socket it enters.

## Key files

| Path | Role |
| --- | --- |
| `src/utils/solver.ts` | `solve` (6-step pipeline), `choosePieces` (exact DP), `slotOptions` (candidate generation), `cheapestRaw`, `podeVir`, `betterPlan` (objective), `simulateAllocation`, `gemPriceAt`. |
| `src/utils/assign.ts` | `assignGems` — exact min-cost gem-to-socket transport solve; called by `simulateAllocation`. See `assignment.md`. |
| `src/utils/game.ts` | `resolveWine`, `wineOnlyIds`, `gemFor`, `gemForShape`, `affixThreshold`, `clampTarget`, `totalSockets`. |
| `src/utils/shapes.ts` | `SHAPES` (the 4 socket shapes), `gemShapes`, `gemFitsSocket`, `sanitizeShapes` (`circ`→`hex` misread fix). |
| `src/data/game.ts` | `GAME`: 8 slots × 2 sockets, listings catalog, `maxGemLevel: 1`, `maxTarget: 9`, `maxPresetPerAffix: 2`, `maxPresetsPerPiece: 1`. |
| `src/data/pools.ts` | `PRESET_SLOTS`, `canPreset` — in which slots each affix can roll as preset (source: mistfalldb.com/affixes/&lt;affix&gt;, "Slots & weapon classes", verified per affix Aug 2026). |
| `src/data/gems.ts` | Gem catalog: one gem per (affix, shape), with per-shape prices. |
| `src/types.ts` | `BuildState`, `Plan`, `AffixResult`, `PieceOption`, `BoughtPiece`, `PresetHuntEntry`. |
| `ssr-smoke.mjs` | Behavioral contract: renders seeded builds and asserts exact `grandTotal` values. |

## Input

`BuildState` (`src/types.ts`): `cls` (label only — socket rules are universal), `picks: BuildPick[]` (`{id, lvl}`; LIST ORDER IS PRIORITY, `priority = index + 1`), `wine: WineState` (`{tier, points}`), `mode: BuildMode` (`'full'` = buy exactly one piece per slot; `'min'` = slots may be skipped).

## Output — `Plan` field table

Consumers verified against the current tree. `grandTotal` is the behavioral contract: `ssr-smoke.mjs` asserts exact values per seeded case (1825, 1347, 355, 355). Fields with consumer "none" are type surface kept for panels removed in commit `b7634a8` (SummaryStats/DetailsPanel/GemShop/PresetAdvisor); changing their math is still contract-relevant because tests pin them.

| Field | Meaning | Consumer |
| --- | --- | --- |
| `results` | `AffixResult[]`, one row per demand entry, priority order (picks first, wine-only appended). | UI: `AffixPanel.vue` (pip rows, wine chips), `App.vue` (shortfall banner) |
| `chosen` | The bought pieces. Same array reference as `boughtPieces`, sorted price ascending. | UI (via `boughtPieces` alias) |
| `boughtPieces` | Alias of `chosen`. | UI: `EquipmentPanel.vue` → `EquipmentSlot.vue` |
| `usedPieces` | Subset of `chosen` with ≥ 1 placed gem. | none |
| `MGL` | `max(1, GAME.maxGemLevel)` = 1: one gem = one rank. | none |
| `mode` | Echo of `state.mode`. | none |
| `D` | Σ `socketsNeeded` after preset credit = gem sockets the build still requires. | UI: `App.vue` capacity banner |
| `totalSocketsAll` | `totalSockets()` = Σ `sl.sockets` = 16. | UI: `App.vue` capacity banner |
| `presetUsed` | Σ `presetPts` — ranks delivered by presets. | none |
| `presetSavings` | Σ `presetSaving` over preset pieces (gem price avoided − premium paid; can be negative). | none |
| `presetGross` | Σ gem prices the presets avoided. | none |
| `presetSavingUnknown` | Preset pieces whose avoided gem has no mapped price. | none |
| `presetSlotsFree` | Bought pieces without preset. | none |
| `presetHunt` | Per open affix: what a preset of it is worth and per-slot price ceilings (see step 6). | UI: `verdictFor` (`src/utils/verdict.ts`), rendered by `EquipmentSlot.vue` |
| `unidentified` | Count of `'?'`-preset listings in the whole catalog. The app's bottleneck: a `'?'` listing never enters a plan as an identified preset — only as a price quote. | none |
| `catalogSize` | Total listings in catalog. | none |
| `toHunt` | Bought pieces flagged `hypothetical` — assumed to exist on the AH, to be found with the "Affix Effects" filter. | none (the per-piece `hypothetical` flag is what `EquipmentSlot.vue` renders as "PROCURAR") |
| `feasibleSockets` | `D <= totalSocketsAll` — PURE COUNT capacity, ignoring shape. If this holds but the plan is still short, shape is the culprit, which gets its own warning with a different player action. | UI: `App.vue` banner (checked first) |
| `feasible` | Every `results[i].short === 0`. | UI: `App.vue` banner |
| `shapeBlocked` | Rows short because of socket SHAPE, not socket count (`blockedBy` ∈ {`shape`,`unknown`}). | UI: `App.vue` banner |
| `unknownSockets` | Bought sockets idle because their shape was never sampled — paid-for capacity standing still; the count of what remains to map. | UI: `App.vue` banner |
| `knownCost` | Σ listing prices of bought pieces (= `baseCost + premiumCost + shapeExtraCost`). | none |
| `baseCost` | Σ `rawPrice` (cheapest-raw reference per slot). | none |
| `premiumCost` | Σ `premium` (preset listings' surcharge over cheapest raw). | none |
| `shapeExtraCost` | Σ `shapeExtra` — what was paid extra to buy the raw listing with the RIGHT socket shapes. | none |
| `gemsCost` | Σ `gemSub` — gems actually placed, each priced by the shape of the socket it entered. | none |
| `gemUnknown` | Affixes with open gem demand (`gemPts > 0`) but no mapped gem. | none |
| `gemCount` | Gems actually bought (what fit), not what was wanted. | none |
| `grandTotal` | `knownCost + gemsCost`. THE behavioral contract. | `ssr-smoke.mjs` ONLY (exact-value asserts) |
| `distinctActive` | `state.picks.length`. | none |

`AffixResult` fields (per row): `id/name/cat/priority`; `wineOnly` (row exists only because the drink feeds it); `target` (`clampTarget(lvl)`, 1..9); `threshold` (`affixThreshold` — `null` = affix has no secondary effect, so no threshold to hit); `wineBonus`; `avail = max(0, target − wineBonus)`; `demand` (avail minus preset credit); `socketsNeeded = ceil(demand / MGL)`; `presetPts`; `socketsUsed`; `gemLevels`; `achieved = gemLevels + wineBonus + presetPts`; `short = max(0, target − achieved)`; `reached = threshold != null && achieved >= threshold`; `blockedBy` / `shapeBlocked` (diagnosis, step 4); `gemBuys/gemPts/gemName/gemMat/gemUnit/gemSub` (shopping list, step 5).

`BoughtPiece` fields beyond `PieceOption`: `free` (unused gem sockets), `gems: PlacedGem[]` (each records `socket` — the index it occupied, so the UI shows the gem in the right socket, not "in order"), `openSockets`, `presetUseful/presetGross/presetSaving`.

## The 6-step pipeline

### 1. Demand per affix (after Victory Wine)

`resolveWine(state.wine, state.picks)` normalizes drink points ONCE against tier budget, per-affix cap, and priority order — solver and UI call the same function, so what the bar shows is exactly what entered the math, and a tampered URL hash cannot mint infinite wine. The tier is a BUDGET of ranks distributed across affixes, not a fixed bonus per slot.

Demand entries = `state.picks` in priority order, then `wineOnlyIds()` appended: the drink may feed an affix the build did NOT pick. A wine-only row gets `lvl = wineBy[id]`, hence `target = wineBonus` and `avail = 0` — zero gear demand; it never competes for a socket or gold, it exists to display the drink's contribution (`wineOnly: true`, the "só bebida" chip) and would count toward `reached` if wine alone hit the threshold (impossible under current tiers: `maxPerAffix` caps at 2, thresholds are 5 or 7).

`MGL = max(1, GAME.maxGemLevel)` = 1: one gem contributes exactly +1 rank, so `socketsNeeded === demand`.

### 2. Exact piece search

`choosePieces(results, state.mode)` (see below) returns the winning listings. `chosen` is then sorted price ascending — cheapest pieces receive the gems first during placement, keeping the display stable and cheap-first.

### 3. Preset crediting

`r.presetPts` = number of chosen pieces with `preset === r.id`; `r.demand = max(0, avail − presetPts)`; `socketsNeeded` recomputed. Per preset piece: `presetUseful = true` unconditionally — the search can never buy a useless preset (the DP transition refuses presets beyond the affix's demand, see `presetCap`); `presetGross = gemFor(preset)?.price ?? null` (the gem it dispenses with); `presetSaving = presetGross − premium` (negative is possible; `verdictFor` renders it as a warning).

### 4. Gem placement onto real sockets

Each piece gets `openSockets` from its sanitized `shapes` (index, shape-or-null, used). Supply per shape = count over all open sockets in `SHAPE_IDS` order (`bar, tri, sq, hex`). `simulateAllocation(supply, results, demands)` — no memo, so `wantX = true` — returns the exact affix×shape matrix `fitX`. This is the SAME allocator the search used to pick the pieces, so display and decision never diverge.

For each affix (priority order) and each shape in `SHAPE_IDS` order, `fitX[ai][si]` gems are pushed into the first unused socket of that shape across the price-sorted pieces. Each `PlacedGem` records `socket` (index), `level = min(MGL, rem)`, `cat`. A gem only enters a socket of ITS shape (`gemFitsSocket`); a socket with unsampled shape is NOT a wildcard.

If `rem > 0` after the walk, `blockedBy` diagnoses WHY — the answer changes what the player does:

| `blockedBy` | Condition (tested in this order) | Player action |
| --- | --- | --- |
| `'capacity'` | No idle socket remains at all. | Raise wine tier or lower targets. |
| `'unknown'` | Idle sockets exist, at least one has unsampled shape. | Sample the "Slot Type" of those listings. |
| `'shape'` | Idle sockets exist, all known, none accepts this gem. | Swap piece for one with the right socket shape. |

`shapeBlocked = blockedBy ∈ {shape, unknown}`. Then `achieved/short/reached` are finalized.

### 5. Cost accounting

`baseCost` = Σ `rawPrice`; `premiumCost` = Σ `premium`; `shapeExtraCost` = Σ `shapeExtra` — what was paid over the cheapest raw to get the right SHAPE combo (a raw surcharge is not a preset premium; they are tracked separately); `knownCost` = Σ `price`.

Gem cost is NOT "price × quantity": an affix has one gem PER SHAPE with very different prices (e.g. Resolve Amethyst 148 vs Resolve Onyx 155), so each placed gem is priced via `gemForShape(gem.affix, shapeOfItsSocket) || gemFor(gem.affix)` and grouped into `r.gemBuys` (name, mat, shape, unit, qty, sub). `gemCount` counts what is actually bought — what fit — not what was wanted. `gemUnknown` counts affixes with open demand and no mapped gem (their sub is 0, so totals stay honest). **`grandTotal = knownCost + gemsCost`.**

### 6. Preset reading and the hunt list

`presetSavings/presetGross/presetSavingUnknown/presetSlotsFree`, `unidentified`, `catalogSize`, `toHunt` (pieces flagged `hypothetical`).

`presetHunt`: for every affix with `openPts = r.demand > 0` — `unit` = cheapest gem price, `potential = unit × openPts`, and `ceilings`: for each slot where the game GENERATES that preset (`canPreset(sl.id, r.id)`; e.g. Valor never rolls on weapon), `max = cheapestRaw(sl).price + gemPrice`, sorted ascending. That ceiling is the break-even: a presetted listing of that slot cheaper than (its cheapest raw + the gem the preset dispenses) beats the current plan. Entries sorted: known-unit first, then unit descending. `verdictFor` uses `presetHunt[0]` to annotate raw pieces with "if a listing with preset X appears for up to `rawPrice + unit`, it becomes the better buy".

## Candidate generation — `slotOptions(sl, wantedIds)`

Reduces a slot's ~9 sampled listings to what could enter a plan:

- **`cheapestRaw(sl)`** — cheapest non-preset listing; if the slot's sample has no raw, falls back to cheapest overall (premium baseline becomes 0: nothing raw to compare against). This is the price reference every preset is measured against.
- **`byCombo`** — cheapest raw per SHAPE-COMBO key (`sanitizeShapes(L.shapes)` sorted, joined `'+'`). The combo is in the key because gems have shapes: two raws of the same slot with different combos are different offers even at near-equal price — the pricier one can be the only one that accepts the gem the build needs. Keeping only "the cheapest raw" is exactly what used to prevent the search from assembling the build.
- **`byAffix`** — cheapest per (build-wanted preset × shape-combo). Skips `'?'`, presets outside `wantedIds`, and `podeVir`-illegal combos. A listing whose preset is OUTSIDE the build is strictly worse than raw — same useful ranks, one fewer socket — so it is never considered.
- **`podeVir(sl, affixId)`** = `canPreset(sl.id, affixId) && (!sl.presetPool || sl.presetPool.includes(affixId))`. `canPreset` encodes the per-slot game rule (`data/pools.ts`; without it the plan ordered a weapon with a Valor preset — armor-only, an item that does not exist). `presetPool`, when the catalog sampled the real preset list of that BASE, is the final word: the DB pool is per slot, not per item, and a specific base can roll fewer presets than the whole slot.
- **Hypothetical presets.** The catalog is a SAMPLE (~9 listings/slot); the AH has hundreds, and the player finds any presetted piece with the "Affix Effects" filter. Planning only from sampled rows made the app ignore presets and buy expensive gems pointlessly — the real in-game build is far cheaper precisely because it uses preset pieces in nearly every slot. So for each wanted, `podeVir`-legal affix, a preset piece is added AT THE PRICE of the cheapest `'?'` listing of that slot and shape (the `quote` map — that listing really exists; only WHICH affix it carries is unknown), flagged `hypothetical`, skipped when an identified (affix, shape) listing already covers it. The flag drives the "PROCURAR" rendering in `EquipmentSlot.vue` and the `toHunt` list.
- **`mk(L, preset)`** fields: `gemSockets = sl.sockets − (preset ? 1 : 0)` (a preset consumes one socket); `shapes = sanitizeShapes(L.shapes)` (a reading that violates the game — `circ` outside jewelry — comes out as null/"not sampled"); `premium = price − rawPrice` for preset listings, else 0; `shapeExtra = price − rawPrice` for raw listings, else 0.

## Exact DP — `choosePieces(results, mode)`

Exact, not greedy — the cheapest presetted listing of one slot can be worth less than another slot's, and each affix only benefits from `demand` presets; a greedy pass gets this wrong. State = (presets used per affix, socket supply per shape); the state stores the minimum GEAR cost; gem cost is added at the end because it depends only on the accumulated counts and supply.

- `demand = results.map(r => r.avail)` (pre-credit). `presetCap[a] = min(demand[a], GAME.maxPresetPerAffix = 2)` — double ceiling: a preset yields nothing beyond the affix's demand, and the plan must not count on finding more copies of the SAME preset than practice allows.
- `allowSkip = mode !== 'full'`: `'full'` buys one piece per slot (no skip transition; `opts[i]` is never empty because `byCombo` holds at least `cheapestRaw`); `'min'` may leave slots unbought.
- **Why shapes are in the state.** A gem only enters its shape's socket, so counting "2 sockets per piece" is not enough: a plan can have a socket to spare and still not fit the gem. Since almost every affix has gems in more than one shape, tracking only "exclusive" shapes fails; the state carries the supply of ALL FOUR shapes (`tracked = SHAPE_IDS`), capped at `cap[s] = min(needByShape[s], 2 × GAME.slots.length = 16)` — supply beyond what the build could use never changes a decision, and the cap is what keeps the state space at a few thousand combinations (piece supply sums ≤ 2). A shape no affix uses has cap 0: its sockets are worthless anyway. Tracking all four in `SHAPE_IDS` order means `st.sup` IS the supply vector the evaluation needs — no path re-walk to count sockets.
- **Bit packing.** With hypothetical presets the option count per slot multiplies and the inner loop runs hundreds of thousands of times; allocating two arrays per transition (counts, sup) dominated runtime. Now: `counts` = 4 bits per affix (`cnt(counts,a) = (counts >> 4a) & 15`), `sup` = 5 bits per shape (`supAt`), map key = `counts * 1048576 + sup` (1048576 = 2^20 = exactly the 4×5 sup bits). Only the winning state is decoded at the end.
- **P is deliberately OUTSIDE the key**: two partial plans with the same supply and the same presets are interchangeable — the cheaper one is the only one that matters. Removing P cuts final states (and expensive evaluations) by nearly an order of magnitude. Consequence: per `(counts, sup)` only the minimum-gear-cost state survives (`put` keeps strictly cheaper; first writer wins ties), and `P` acts only as the last tiebreak among surviving states.
- **Layered forward DP** over the 8 slots: from each state, optionally skip (`allowSkip`), or take each option — preset guard (`cnt >= presetCap[ai]` → refuse; this is why every chosen preset is guaranteed to credit a rank), `counts += 1 << 4·ai`, `sup` per shape = `min(cap[s], old + o._sup[s])`. `o._sup`/`o._ai` are precomputed per option (recomputing them ran thousands of times per layer). `prev`/`opt` form a linked trail — copying the path array per transition cost more than the whole rest of the loop; `pathOf` walks back and reverses only for the winner.

### Final evaluation — priority before price

Choosing "the cheapest that covers everything" only works when everything fits. When it does not — demand above sockets, or shapes that do not match — whoever goes without MUST be the lowest-priority affix, never the first of the list. So every surviving final state is simulated with the SAME allocation as the display (`evalState`: decode `sup` → supply, `left[a] = demand[a] − cnt`, `simulateAllocation` with memo key `counts·2^20 + sup`) and compared lexicographically by `betterPlan`:

1. `got[i]` per priority, descending — deliver to affix #1; tie → look at #2; …
2. `cost` ascending — gear + gems, each gem at its shape's price.
3. `presets` descending — tiebreak only: at equal price, a rank solved by preset is already paid inside the piece price; it does not become a gem to hunt on the AH nor stays exposed to gem price variance. If the preset costs more than the gem it replaces, it already lost at the cost line.
4. `P` ascending — fewer pieces.

Because the fit is exact, feasible builds all tie on `got` (everyone reaches target) and the decision falls to cost: reordering the affix list never changes which fully-feasible build gets assembled (see `assignment.md`, phase 1).

### Pruning

Evaluating every final state is expensive (each solves a flow). Two cheap bounds kill most without losing the optimum:

- `lowerBound(st)` = gear already spent + (missing ranks × cheapest gem of each affix, `gemFor`; unmapped gem prices 0 — still a valid lower bound). No plan from that state costs less.
- `upperGot(st)[a]` = `min(demand[a], cnt + Σ supply over shapes usable by a)` (`usableBy` from `gemShapes`; optimistic — each socket is counted for every affix that could use it). No plan from that state delivers more.

The scan (`ranked`) sorts by `ubKey` descending (base-16 packed `upperGot` — valid because per-affix got ≤ `maxTarget` = 9 < 16), ties by `lb` ascending: it starts with the state that CAN deliver the most, so the incumbent is born near-optimal and the two prunes cut almost everything — this is what keeps runtime down exactly when the build does not fit, the case where priority forces comparing delivery before price. Skip rules: `lexCmp(ub, best.got) < 0` (cannot match the incumbent's delivery even in the best case — sound because actual got ≤ ub pointwise), or `== 0 && lb >= best.cost` (would at best tie delivery without being cheaper). Caveat: the second prune can discard a state that ties on (got, cost) but would win the `presets`/`P` tiebreaks — the objective is EXACT for (delivered ranks, then cost); tiebreaks 3–4 discriminate only among states that survive pruning.

### Memoization and `wantX`

`memo: Map<number, SimResult>` shared across all `evalState` calls of one search, keyed `counts·2^20 + sup` — the search evaluates thousands of socket-sets and most repeat the exact same (supply, remaining-demand) pair (counts determines `left`). When a memo is passed, `simulateAllocation` calls `assignGems` with `wantX = false`: the affix×shape matrix is only built for the FINAL allocation — the one the screen renders (step 4, called without memo).

### Size limits and complexity

| Limit | Value | Why / what breaks |
| --- | --- | --- |
| Affix rows (`results.length`) | **≤ 8 hard** | `counts` nibbles use 32-bit bitwise shifts (`>> 4a`, `1 << 4a`); JS shifts wrap mod 32, so row 9+ silently aliases row 1+. 8 rows also keep `key = counts·2^20 + sup < 2^52`, collision-free in double precision. The allocator's own ceiling is 10 rows (`MAXN = 16` in `assign.ts`); the solver packing is the binding limit. Nothing in `src/stores/build.ts` caps pick count — the cap must be enforced upstream. |
| Presets per affix in `counts` | ≤ 15 (4 bits) | Safe: `presetCap ≤ maxPresetPerAffix = 2`. |
| Supply per shape in `sup` | ≤ 31 (5 bits) | Safe: `cap[s] ≤ 2 × 8 slots = 16`. |
| `ubKey` packing | got ≤ 15 per affix | Holds while `GAME.maxTarget = 9`. Raising `maxTarget` past 15 breaks the ranking key. |
| States per layer | ≈ Π(presetCap[a]+1) × Π(cap[s]+1), few thousand in practice | Piece supply sums ≤ 2 per piece; caps bound it. |
| Work | 8 layers × states × options/slot; then ranked scan with one MCMF per unpruned state | Options per slot = raw combos + wanted×combos identified + wanted×quoted-shapes hypothetical. |

## Invariants

1. **Display and decision use the same allocator.** Both `evalState` and the step-4 placement go through `simulateAllocation` → `assignGems`. Why: the plan shown must be the plan priced and ranked. If violated: the UI could render a build the objective never evaluated (wrong gems, wrong cost).
2. **`grandTotal = knownCost + gemsCost`, and gems are priced by the shape of the socket each one entered.** Why: it is the number the whole app promises ("cheapest real build"). If violated: `ssr-smoke.mjs` fails its exact-total asserts (1825/1347/355/355).
3. **Every chosen preset credits exactly +1 rank of a wanted affix, and consumes exactly 1 socket** (`presetCap` transition guard; `gemSockets = sockets − 1`). Why: `presetUseful = true` is set unconditionally on the credit pass. If violated: premium is paid for nothing and savings math lies.
4. **Wine-only rows have `avail = 0`.** Why: they exist for display; they must never consume a socket or a gold. If violated: the drink would steal capacity from picked affixes.
5. **A `'?'` listing never enters a plan as an identified preset — only as a `hypothetical` price quote.** Why: its affix is unknown; asserting it would fabricate an item. If violated: the plan orders a specific preset nobody verified exists.
6. **`chosen` is sorted price-ascending before placement.** Why: gems land on the cheapest pieces deterministically; the UI grid is stable across recomputes. If violated: identical states render different socket layouts.
7. **A socket with unsampled shape is never used** (`gemFitsSocket(null) = false`), and `blockedBy` reports `'unknown'` before `'shape'`. Why: fitting into an unknown shape would cheat the game rule; the diagnosis tells the player to sample, not to swap. If violated: plans claim fits the game may refuse.
8. **`results.length ≤ 8`** (picks + wine-only rows). See size-limits table. If violated: silent bit-packing corruption — wrong plans with no error.
9. **For feasible builds, pick order does not change the assembled plan** — all orders tie on `got`, cost decides, ties break deterministically. Why: players share builds via URL hash; the same targets must produce the same purchase list. Guaranteed by `assignGems` phase 1 (see `assignment.md`).

## Related docs

- [assignment.md](assignment.md) — the exact allocator `solve` delegates to
- [shapes-and-gems.md](shapes-and-gems.md) — shape model, `circ`→`hex`, gem catalog provenance
- [domain-data.md](domain-data.md) — `GAME` constants, listing catalog, sampling rules
- [wine.md](wine.md) — `resolveWine` normalization and tier budgets
- [verdict.md](verdict.md) — how `presetHunt` and per-piece savings render as buy advice
- [invariants.md](invariants.md) — cross-module invariants
- [testing.md](testing.md) — the smoke contract and unit suites
