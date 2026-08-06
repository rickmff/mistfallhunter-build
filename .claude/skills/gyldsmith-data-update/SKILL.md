---
name: gyldsmith-data-update
description: Update Gyldsmith's game data after a Mistfall Hunter patch or a new Auction House sampling — equipment listings, gem catalog and prices, affixes and thresholds, preset pools, Victory Wine tiers. Use this skill whenever the task mentions adding or changing listings, gems, prices, presets, affixes, socket shapes read from screenshots, wine tiers, or "the game changed X" — even if no file is named. The data files look trivial but carry invariants that break the solver silently.
---

# Updating Gyldsmith game data

All patch data lives in three files — `src/data/game.ts` (params, slots + AH listings, affixes, wine tiers), `src/data/gems.ts` (gem catalog), `src/data/pools.ts` (preset-per-slot pools). Read `docs/domain-data.md` before editing; it documents every field, the sampling caveats, and the source-reliability table.

## Non-negotiable checks after ANY data edit

```
pnpm test && pnpm smoke
```

`tests/data.spec.ts` enforces the catalog invariants mechanically. The smoke totals (gold) will legitimately move when prices change — update them ONLY with an explanation of which data change moved them (see `docs/testing.md`).

## Field semantics you must not guess

- `listings[].preset`: `null` = raw piece (2 gem sockets) · `'<affixId>'` = identified factory affix · `'?'` = has a preset but unidentified. A `'?'` piece is strictly worse than raw for the solver (1 socket, 0 usable ranks) — identifying icons is what unlocks the preset economy. In-game, use the AH "Affix Effects" filter to identify.
- `listings[].qty` is availability (the "x285"), never a cost.
- `listings[].shapes` lists the shapes of the EMPTY sockets only: presetted listing → 1 entry, raw listing → 2 entries. Allowed values: `bar`, `tri`, `sq`, `hex`, and the legacy misread `circ` (auto-corrected to `hex` — there is no circle socket, it is the small green octagon).
- Every listing has exactly 2 slots total. The game never shows 2 presets or 3 slots on one piece.
- Gem rows: `shape` must match `MATERIAL_SHAPE[mat]` (Agate/Onyx→bar, Amethyst→tri, Moonstone→sq, Peridot→hex). One gem per shape per affix; prices differ a lot between shapes and the solver prices gems by the socket they enter.

## Naming traps (confirmed in-game — do not "fix" them)

| Gem name | Actual affix |
| --- | --- |
| Fervor Amethyst / Fervor Onyx | `fervid` (NOT fervor) |
| Warspirit Amethyst / Moonstone | `fervor` |
| Lightfoot Moonstone | `ethereal` |
| Impenetrable Moonstone | `seamless` |

## Standing caveats in the current catalog

- The six identified pants presets (spiritshield, ethereal, aegis, tenacious, distantward, bulwark) are GUESSES from ~16px icons of a different sampling, matched by socket shape in price order. To revert, set them back to `'?'`. Confirm in-game before trusting them further.
- Amulet/ring were sampled under a Physical Damage filter — only the Dominance/Retribution bases exist in the catalog, and neither slot has `'?'` rows, so they can never produce hypothetical preset options.
- The affix list is exactly the 32 that roll on gear/gems (MistfallDB defines 44; the other 12 do not roll). Never add one of the 12 without confirming it started rolling.
- No affix rolls on ring (`PRESET_SLOTS` has no ring anywhere). If the game ever shows one, add `'ring'` to that affix's pool — nothing else.
- Source reliability: mistfalldb.com is the number authority; Game Rant / Power Up Gaming are the only wine-tier sources (names agree, top numbers diverge); mistfallhunters.wiki refuses numbers; metamist.io is pre-launch beta data — never use it without cross-checking.

## Procedure

1. Edit the data file(s) only — data updates must not require logic changes. If they seem to, stop and use the `gyldsmith-domain` skill.
2. Keep entries in the existing ordering conventions (listings by price ascending per slot; gems grouped by shape).
3. Run `pnpm test`; fix data until `tests/data.spec.ts` is green.
4. Run `pnpm smoke`; reconcile total changes consciously and update fixtures + `docs/testing.md` together.
5. Update `docs/domain-data.md` (and `docs/shapes-and-gems.md` / `docs/wine.md` if gems or wine changed) — census numbers, caveats, and provenance must reflect the new sampling.
