# Socket shapes, the gem catalog, and preset pools

Sockets in Mistfall Hunter are typed by shape, and a gem only enters a socket of its own shape — so "the price of affix X's gem" depends on which socket receives it. This document covers the four real shapes and their material mapping (`src/utils/shapes.ts`, `src/data/gems.ts`), the `circ` misread and its correction, the fit rules the solver obeys, the gem->affix naming traps, and the per-slot preset pool (`src/data/pools.ts`).

## Key files

| Path | Role |
| --- | --- |
| `src/utils/shapes.ts` | `SHAPES` (label/color/SVG path), `canonicalShape`, `sanitizeShapes`, `gemShapes`, `gemFitsSocket` |
| `src/data/gems.ts` | `GEMS` (48-gem AH catalog), `MATERIAL_SHAPE`, `gemsByAffix` (price-sorted index) |
| `src/data/pools.ts` | `PRESET_SLOTS` (affix -> slots it can roll on), `canPreset` |
| `src/utils/game.ts` | `gemFor` (cheapest gem of an affix), `gemForShape` |
| `src/utils/solver.ts` | Consumer: shape supply/demand, `simulateAllocation`, `podeVir` |
| `src/types.ts` | `ShapeId`, `RawShape`, `GemDef`, `GemMaterial`, `ShapeDef` |

## The four shapes — THE MATERIAL IS THE SHAPE

The AH "Gem Type" filter has exactly 4 icons, and each gem material draws one of them — that is why sockets have shapes at all. Mapping (`MATERIAL_SHAPE` in `src/data/gems.ts`; render data in `SHAPES` in `src/utils/shapes.ts`):

| `ShapeId` | Label (UI, pt) | Color | Materials | Visual |
| --- | --- | --- | --- | --- |
| `bar` | retângulo | `#e05a4e` | Agate + Onyx | red rectangle |
| `tri` | triângulo | `#b17ae0` | Amethyst | purple triangle |
| `sq` | quadrado | `#57c4d8` | Moonstone | cyan square |
| `hex` | octógono | `#5cba8a` | Peridot | green octagon (the SVG path is an octagon, matching the in-game Peridot) |

Two materials (Agate, Onyx) share `bar`; the other three map one-to-one. Testable: every `GemDef` satisfies `gem.shape === MATERIAL_SHAPE[gem.mat]`.

## The `circ` misread — no circle socket exists

The game has EXACTLY four socket shapes. The small green octagon looks round in screenshots, and the piece-listing reads recorded it as `circ`. The correction lives at the boundary:

- `RawShape = ShapeId | 'circ'` (`src/types.ts`) — raw listing data in `src/data/game.ts` still contains `'circ'` **on purpose**, so the catalog stays a faithful transcript of what was read.
- `MISREAD = { circ: 'hex' }` inside `src/utils/shapes.ts`; `canonicalShape` applies it (and maps any other unknown string to `null`).
- `sanitizeShapes(shapes)` maps a listing's raw shape array through `canonicalShape`, so the rest of the app only ever sees the four real shapes (or `null`). `slotOptions` in `src/utils/solver.ts` calls it on every listing.

Do not "fix" `'circ'` in the data file, and do not let `'circ'` reach `SHAPES` or `GEMS` — the correction is intentionally centralized in `canonicalShape`.

## Fit rules — `null` is strict, unmapped is permissive

`gemFitsSocket(affixId, shape)` in `src/utils/shapes.ts` implements two deliberately asymmetric rules:

- **Unsampled socket shape (`null`) is NOT a wildcard**: `gemFitsSocket` returns `false` when `shape` is `null`. Without knowing the shape you cannot assert the gem enters; placing it anyway would cheat the rule. The solver reports such stuck sockets as `blockedBy: 'unknown'` and counts them in `Plan.unknownSockets`.
- **An UNMAPPED AFFIX is permissive**: `gemShapes(affixId)` returns `null` when the affix has no cataloged gem, and `gemFitsSocket` then returns `true` for any known shape. Safe-side reasoning for freshly patched affixes: better to lose a restriction than to silently delete an option.

## One gem per shape per affix — and big price spreads

Each affix has one gem PER SHAPE (not necessarily all four): the 48-gem catalog covers all 32 rolling affixes, 16 of them with two shapes and 16 with one. Prices differ wildly between shapes of the same affix — **Warspirit Amethyst 55g vs Warspirit Moonstone 151g** (both are Fervor's gem). So a rank's cost depends on the socket that receives it, which is exactly what the solver prices (`gemPriceAt` -> `gemForShape` per placed socket).

`gemsByAffix` (`src/data/gems.ts`) indexes `GEMS` by affix and **sorts each list ascending by price**. That sort is the invariant behind `gemFor(id)` (`src/utils/game.ts`) returning element `[0]` as "the cheapest gem of the affix" — used for lower bounds, preset-saving estimates and the preset-hunt table.

### Catalog provenance

Read from 4 AH screenshots: Auction House > Affix Gem, **Gem Tier I** (Aug/2026) — name, material, cheapest listing price and quantity on sale; the AH list itself comes out sorted by ascending price. The gem->affix pairing comes from mistfalldb.com/gems, which settles the cases where the name does not reveal the affix.

### Gem -> affix NAMING TRAPS (confirmed in-game)

Three mistfalldb pairings contradicted the guess-by-name and would have entered wrong — all were VERIFIED IN-GAME:

| Gem name | Actual affix | Trap |
| --- | --- | --- |
| Fervor Amethyst / Fervor Onyx | `fervid` | NOT fervor, despite the name |
| Warspirit Amethyst / Warspirit Moonstone | `fervor` | Fervor's real gems |
| Lightfoot Moonstone | `ethereal` | sounds like a movement affix |
| Impenetrable Moonstone | `seamless` | sounds defensive; it is the cooldown affix |

With these settled, all 32 affixes have at least one gem and no build cost is ever left open.

## Preset pools — `src/data/pools.ts`

The game does not roll any preset on any piece, and the rule is not merely "armor vs weapon": it is per SLOT. `PRESET_SLOTS` maps each affix to the app slots where it can come from the factory. Source: mistfalldb.com/affixes/<affix>, field "Slots & weapon classes", checked affix by affix (Aug/2026). Weapon classes belonging to other classes (Bow, Dagger, Staff, ...) were discarded: the app models a single weapon slot, the Mercenary's Sword and Shield.

Facts that fall out of the table (full per-affix listing in [affixes.md](affixes.md)):

- **`valor` is amulet-only** — a plan suggesting helm/chest/bracers with a Valor preset would order an item that does not exist.
- **NO affix rolls on `ring`** — the plan never proposes a preset ring. If the game ever shows one, add `'ring'` to the affix's entry.
- **`strife` is weapon-only**; `unyielding` is boots-only; `seamless` is amulet-only.
- The weapon accepts presets of only 7 affixes: strife, aegis, tenacious, stoic, bulwark, vitality, wrath.

`canPreset(slotId, affixId)` returns `true` when the affix is absent from the table — the same safe-side permissive fallback as unmapped gems: an unknown (new-patch) affix must not silently lose options.

Two recorded caveats, both safe-side:

1. The pool says where an affix CAN roll — not that a listing is on sale right now. Preset pieces the catalog does not contain appear in the plan flagged `hypothetical` ("search on the AH").
2. The pool is per slot, not per base. If a specific base rolls less than its slot, record it in `GAME.slots[].presetPool` (see [domain-data.md](domain-data.md)) — `podeVir` in `src/utils/solver.ts` intersects both.

Known data tension: the guessed pants listings for `spiritshield` and `ethereal` in `src/data/game.ts` conflict with `PRESET_SLOTS` (neither lists `pants`), so `podeVir` drops them — see the PALPITE warning in [domain-data.md](domain-data.md).

## Invariants

| Statement | Why it must hold | What breaks if violated |
| --- | --- | --- |
| `SHAPES` has exactly the four keys `bar`, `tri`, `sq`, `hex`; `'circ'` is never one of them | The game has exactly four socket shapes; `circ` was a misread | UI renders and the solver supplies a socket shape that does not exist |
| Every gem satisfies `gem.shape === MATERIAL_SHAPE[gem.mat]` | The material IS the shape (AH "Gem Type" has 4 icons) | A gem is priced into sockets it cannot enter |
| Each `gemsByAffix[id]` list is sorted ascending by `price` | `gemFor` takes `[0]` as "cheapest" without re-checking | Savings estimates, lower bounds and the preset-hunt table quote the wrong gem |
| Per affix, at most one gem per shape | `gemForShape` returns `find(...)` — the first match must be the only one | A duplicate silently shadows the real price for that socket |
| Every `GEMS[].affix` names an id in `GAME.affixes`, and all 32 rolling affixes are covered | The naming-trap corrections guarantee full coverage | `gemUnknown` costs reappear, or gems price a nonexistent affix |
| `gemFitsSocket(affix, null) === false` for every affix | An unknown socket shape must not act as a wildcard | Plans place gems into sockets that may not accept them — cheating the shape rule |
| `canPreset` and `gemFitsSocket` stay permissive for ids absent from their tables | Safe-side handling of new-patch content | A new affix silently loses preset/gem options with no visible reason |

## Related docs

- [domain-data.md](domain-data.md) — the listing catalog whose `shapes` fields feed `sanitizeShapes`
- [affixes.md](affixes.md) — full icon dictionary and per-affix preset slot table
- [wine.md](wine.md) — the third affix layer, which bypasses sockets entirely
