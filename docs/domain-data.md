# Domain data — `src/data/game.ts` as the editable patch database

`src/data/game.ts` is the single editable database of Mistfall Hunter facts the app plans against: global scalars, classes, the eight equipment slots with their real Auction House listings, the 32 rolling affixes with per-affix thresholds, and the Victory Wine tiers. Every patch update starts here — code elsewhere only reads this object (`GAME: GameDb`) through the pure helpers in `src/utils/game.ts` and the solver in `src/utils/solver.ts`. The pre-migration file carried this knowledge as comments; this document is now its only home.

## Key files

| Path | Role |
| --- | --- |
| `src/data/game.ts` | The `GAME` database (scalars, classes, slots/listings, affixes, wine tiers) and `CAT` category labels |
| `src/types.ts` | Shapes of everything here: `GameDb`, `SlotDef`, `Listing`, `AffixDef`, `WineTierDef`, `RawShape` |
| `src/data/gems.ts` | Gem catalog (`GEMS`, `gemsByAffix`) — the old `game.js` `gemPrices` field was replaced by this full catalog |
| `src/data/pools.ts` | `PRESET_SLOTS` / `canPreset` — per-slot preset roll rule |
| `src/utils/game.ts` | Pure readers: `affix`, `affixThreshold`, `clampTarget`, `totalSockets`, wine helpers |
| `src/utils/solver.ts` | Main consumer: `solve`, `choosePieces`, `slotOptions`, `cheapestRaw` |
| `tests/data.spec.ts` | Invariant tests run by `pnpm test` after any data edit |
| `ssr-smoke.mjs` | End-to-end smoke with hard-coded gold totals per scenario |

## Global scalars

| Field | Value | Meaning | Exact consumers |
| --- | --- | --- | --- |
| `thresholdLevel` | 5 | Default threshold for an affix whose real value has not been read yet. The real value is per affix (`affixes[].threshold`); this is only the fallback. | `src/utils/game.ts` (`affixThreshold`, fallback for unknown/unread affixes); `src/stores/build.ts` (`addAffix` — default target level via `affixThreshold(id) ?? GAME.thresholdLevel`, so a null-threshold affix is added at level 5) |
| `maxGemLevel` | 1 | Each gem/socket delivers +1 rank on its affix (confirmed post-launch; earlier assumption of higher gem levels was wrong). | `src/utils/solver.ts` (`solve`, `MGL = Math.max(1, GAME.maxGemLevel)`) |
| `maxTarget` | 9 | Highest selectable target level. The game's ladder goes far beyond (MistfallDB: the bonus only caps at +48% at level 32, table published up to 40), but the useful target here is different: the highest threshold is 7, and a full build delivers 16 gear ranks (8 pieces x 2) plus at most 8 from wine. 9 covers any threshold with slack and keeps the pip bar readable. | `src/utils/game.ts` (`clampTarget`); `src/components/AffixPanel.vue` (`PIPS = GAME.maxTarget`) |
| `maxPresetsPerPiece` | 1 | A piece carries at most 1 factory affix (see the listing rule below). | No direct runtime read — enforced structurally in `src/utils/solver.ts` (`slotOptions`: `gemSockets = sl.sockets - (preset ? 1 : 0)`). The field documents the rule the listing data must obey. |
| `maxPresetPerAffix` | 2 | How many pieces with the SAME factory affix a plan may count on. A preset is a random roll: finding one piece with the affix you want is doable, two with luck — five, all at the price of the slot's cheapest preset listing, is fantasy. Without this cap the plan traded nearly every gem for a preset and promised a purchase that does not exist on the Auction House. Raise it if your market is deeper. | `src/utils/solver.ts` (`choosePieces`, `presetCap = min(demand, GAME.maxPresetPerAffix)`) |
| `wineMaxLevel` | 8 | Wine ladder cap from MistfallDB ("their ladder ends at level 8 for +12%"). Currently inert defensively — see [wine.md](wine.md). | `src/utils/game.ts` (`wineCapPerAffix`) |

There is no cap on distinct affixes in a build — the real limit is sockets, and the solver already handles that: each piece delivers 2 ranks.

## Classes — cosmetic only

`GAME.classes` lists the six classes (Mercenary, Blackarrow, Sorcerer, Shadowstrix, Seer, Withered Knight) with a role blurb. The selected class is stored in `BuildState.cls`, encoded/validated in the URL hash (`src/stores/hash.ts`), and displayed in the UI — but `solve()` in `src/utils/solver.ts` never reads `state.cls`. Class never enters the solve. The catalog itself is Mercenary-flavored only because the weapon slot was sampled as Sword and Shield.

## Slots and listings

Eight slots (`weapon`, `helm`, `chest`, `gloves`, `pants`, `boots`, `amulet`, `ring`), names confirmed against the Auction House menu. Every slot has `sockets: 2`, so `totalSockets()` (`src/utils/game.ts`) returns 16.

`slots[].listings` is a REAL catalog. The game does not sell "a generic piece where you choose the preset": the Auction House has a FINITE number of concrete listings, and the plan must choose among them. There is no "average slot price" or estimated "preset premium" — the premium is simply the price difference between two real listings (`src/utils/solver.ts` `slotOptions`: `premium = L.price - cheapestRaw(sl).price`).

### The core listing rule

Every listing has exactly 2 slots, in one of two forms (verified in the Aug/2026 screenshots, Rare rarity):

- `[ preset affix | socket ]` — +1 free rank of that affix plus 1 gem socket
- `[ socket | socket ]` — raw piece, 2 gem sockets

A piece with 2 presets or 3 slots never appears — hence `sockets: 2` and `maxPresetsPerPiece: 1`. Testable form: every listing with `preset !== null` has `shapes.length === 1`; every listing with `preset === null` has `shapes.length === 2`.

### Listing fields

| Field | Semantics |
| --- | --- |
| `price` | Gold asked in the listing |
| `qty` | Units on sale (the "x285" in the screenshot) — availability, NOT a cost |
| `preset` | Factory affix: `null` = raw piece (2 sockets); `'<affixId>'` = identified preset; `'?'` = HAS a preset, but the icon was not identified |
| `shapes` | Shapes of the EMPTY sockets only (the AH "Slot Type" filter). Best-effort read of screenshots. Raw data may contain `'circ'` on purpose — see [shapes-and-gems.md](shapes-and-gems.md) |

Current catalog census: 60 listings total (`Plan.catalogSize`), of which 18 raw, 6 identified presets (all on pants, all guesses — see below), and 36 `'?'` (`Plan.unidentified`).

### `'?'` presets are strictly dominated

A piece with an unidentified preset has 1 gem socket and no usable rank — strictly worse than the raw piece, so the plan never buys one as-is. Identifying the icons is what unlocks the preset economy. The reliable in-game method is the AH's own "Affix Effects" filter: pick an affix and the list shows only that affix's presets, already labeled (see `README.md`). The solver still extracts value from `'?'` rows: `slotOptions` uses the cheapest `'?'` listing per socket shape as a PRICE QUOTE for hypothetical preset pieces (flagged `hypothetical: true`, surfaced as "PROCURAR"/`Plan.toHunt`) — a piece to hunt on the AH, not one proven to exist.

### PALPITE warning — the six identified pants presets are guesses

The six named presets on `pants` (`spiritshield` 180g, `ethereal` 182g, `aegis` 184g, `tenacious` 186g, `distantward` 189g, `bulwark` 192g) were read from ~16px icons in an AH screenshot of ANOTHER sampling, then matched to these listings by socket shape in price order. Two layers of uncertainty: the icon reading AND the pairing. Icon rationale as originally recorded: spiritshield = shield with marked core; ethereal = winged form; aegis = plain shield; tenacious = heart with cross; distantward = outward barbs; bulwark = riveted disc (see [affixes.md](affixes.md) for the icon dictionary). One `'?'` row remains at 194g — it had no matching line in the screenshot. To revert: set the six back to `'?'` in `src/data/game.ts`. To confirm: the AH "Affix Effects" filter.

Known tension: `PRESET_SLOTS` in `src/data/pools.ts` says `spiritshield` and `ethereal` do NOT roll on pants, so the solver's `podeVir` filter silently drops those two listings as preset options. Either those two icon guesses are wrong or the pool is incomplete — one more reason the guesses are marked as such.

### Catalog rarity — Rare

The rarity scale is Common -> Excellent -> Rare -> Epic -> Legendary, and **Excellent sits BELOW Rare**, contrary to convention. This catalog is Rare (the blue in the screenshots). Per-tier base names (search targets only; source: mistfallhunterwiki.org/armor + /accessories, plus gmtreks for the weapon list — accessories are not class-specific):

| Tier | Bases |
| --- | --- |
| Excellent | Fine Iron Sword and Shield · Military Hammer · Veteran Helmet/Armor/Bracers/Pants/Boots · Warrior Pendant · Hunter's Ring |
| Rare (this catalog) | Studded Sword and Shield · Fearless {Helmet, Breastplate, Bracers, Pants, Boots} · Dominance Amulet · Retribution Ring |

Changing tier means re-sampling everything on the AH: prices, quantities, socket formats and presets all change. The base names above are only what to type into the search box.

### Amulet/ring sampling caveat

The accessory screenshots were filtered by Primary Attribute = Physical Damage, so only the Dominance Amulet and Retribution Ring bases appear. The other bases in the pool (Benediction, Woodling Guardian) were never sampled.

### Optional per-base `presetPool` override

`SlotDef.presetPool?: string[]` (declared in `src/types.ts`, consumed by `podeVir` in `src/utils/solver.ts`) locks which affixes a specific BASE can carry from the factory. The pool in `src/data/pools.ts` is per SLOT (what the wiki publishes); if in-game a specific base — e.g. "Fearless Helmet" — rolls less than its whole slot, list it here and the solver stops proposing the rest. Absent = the slot pool applies. No slot currently sets it.

## Affixes — the 32 that roll

MistfallDB defines 44 affixes but states that only 32 can roll on gear or gems; the other 12 are defined but appear on nothing. Those 12 are 7 stat-lines (Headshot Damage, Physical Damage Reduction, Reduced Block/Skill Stamina Cost, ...) plus Powerful, Wise, Lifebane, Siphon and Spirit Spring. `GAME.affixes` is exactly the rolling set — never add any of the other 12 without confirming they started rolling.

Categories (`cat: 'offense' | 'defense' | 'utility'`) mirror the in-game affix menu groups Attack / Defense / Functional (`CAT` in `src/data/game.ts` supplies the labels). Counts: 10 offense, 11 defense, 11 utility. Note: **Seeker sits under ATTACK in the in-game menu** despite feeling functional (movement speed on hit) — the app had it as utility and was corrected; it is `cat: 'offense'`.

### Threshold semantics

`threshold` is the level at which the affix gains its SECONDARY EFFECT — the real target of a build. It is per-affix, NOT a global 5 (that wrong assumption came from metamist.io pre-launch data). Values, from mistfalldb.com/affixes (Aug/2026, verified in two readings):

| `threshold` | Meaning | Affixes |
| --- | --- | --- |
| `7` | Secondary effect opens at level 7 (the majority) | valor, ranged, skypiercer, fervor, strife, fervid, wrath, aegis, stoic, tenacious, unyielding, distantward, spiritshield, brotherhood, eloquence, seamless, focused, creation |
| `5` | Secondary effect opens at level 5 | smiting, resilience, bulwark, ironhelmet, ethereal, seeker, vitality, deft |
| `null` | NO secondary effect at all — pure linear scaling (+1.5%/level); there is no "hitting the threshold" and the UI marks no pip | burst, elusive, curse, blessing, wealth, swift |

`affixThreshold` in `src/utils/game.ts` returns the per-affix value and falls back to `GAME.thresholdLevel` only for an affix not in the table or missing the field (a freshly added, unread affix).

## Sources and reliability

| Source | What it provides | Reliability |
| --- | --- | --- |
| mistfalldb.com (/affixes, /gems) | Granular numbers: per-affix thresholds, the +1.5%/level scale, the wine ladder ending at 8, gem->affix mapping, preset slot pools | Most reliable source for numbers |
| Game Rant / Power Up Gaming | The ONLY sources publishing the Tavern brews (names and amounts). They agree on names, diverge on the top-tier numbers | Well-supported, not official |
| mistfallhunters.wiki (mistfallhunterwiki.org) | Mechanics yes, numbers no: refuses to publish tier names and magnitudes, warning against "fake names" in circulation. Also the source for armor/accessory base names | Trustworthy for mechanics; deliberately silent on numbers |
| metamist.io | Self-declared "pre-launch beta data". Origin of assumptions since disproven (the global threshold-5 premise) | DO NOT use without cross-checking |
| gmtreks | Weapon base-name list | Names only |

All sampling dates: Aug/2026, post-launch.

## Data update workflow

1. Edit the data file (`src/data/game.ts`, `src/data/gems.ts` or `src/data/pools.ts`).
2. `pnpm test` — `tests/data.spec.ts` validates the invariants below.
3. `pnpm smoke` — `ssr-smoke.mjs` renders full scenarios and asserts hard-coded gold totals (e.g. `total: 1825`). Price edits legitimately change these totals; update them CONSCIOUSLY, verifying the new number is explained by the edit, never by reflex.

## Invariants

| Statement | Why it must hold | What breaks if violated |
| --- | --- | --- |
| Every listing has exactly 2 total slots: `preset === null` implies `shapes.length === 2`; `preset !== null` implies `shapes.length === 1` | The game only sells these two forms; `slotOptions` derives `gemSockets` from it | Socket supply and gem costs are computed from phantom or missing sockets |
| Every slot has `sockets: 2`; the 8 slots yield `totalSockets() === 16` | "Each piece delivers 2 ranks" underpins `maxTarget` and feasibility (`Plan.feasibleSockets`) | Capacity math and the feasibility verdict lie |
| Every identified `preset` id and every `presetPool` entry names an id in `GAME.affixes` | Solver matches presets to results by id | The listing is silently unusable (or the option silently disappears) |
| `maxGemLevel === 1` | Confirmed post-launch: one socket = +1 rank | Plans undercount sockets and promise unreachable levels |
| Affix ids are unique and `threshold` is 5, 7 or `null` | `byId` lookups; threshold drives `reached` | Duplicate ids shadow each other; wrong threshold flips build verdicts |
| `GAME.affixes` contains exactly the 32 rolling affixes | The other 12 MistfallDB affixes appear on no gear or gem | Solver proposes gems/presets that cannot exist |
| `wineTiers[0]` is the `none` tier with `points: 0` | `wineTier()` in `src/utils/game.ts` falls back to index 0 | An unknown tier id would silently grant points |
| `'circ'` may appear only in `listings[].shapes` (`RawShape`), never in `SHAPES` or `GEMS` | It is a documented misread kept in raw data — see [shapes-and-gems.md](shapes-and-gems.md) | A nonexistent socket shape enters the solve |
| `price > 0` and `qty > 0` on every listing and gem | Zero/negative prices break cost minimization; qty is evidence the listing exists | The optimizer buys free phantom pieces |

## Related docs

- [shapes-and-gems.md](shapes-and-gems.md) — socket shapes, the gem catalog, preset pools
- [wine.md](wine.md) — Victory Wine tiers and resolution
- [affixes.md](affixes.md) — icon dictionary for identifying `'?'` presets
