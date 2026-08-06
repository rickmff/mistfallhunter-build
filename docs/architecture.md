# Architecture

Purpose: the structural map of Gyldsmith — layers and their dependency direction, the reactive dataflow from user action to rendered plan, a module map covering every file in `src/`, the persistence design (URL hash only), the SSR smoke harness, and the tooling/conventions that CI enforces. The app is a single screen: the user declares the affixes they want; a pure solver answers with the cheapest set of real Auction House listings that delivers them. There is no optimize button and no manual mode — the plan is always already optimal for the current state.

## Key files

| Path | Role |
| --- | --- |
| `src/main.ts` | Browser entry: `createApp` + Pinia + Vuetify + `styles.css`, mounts `#app`. |
| `src/stores/build.ts` | The only state owner; `plan = computed(() => solve(state))`. |
| `src/utils/solver.ts` | `solve(state): Plan` — the entire domain computation, pure. |
| `ssr-smoke.mjs` / `ssr-smoke-entry.ts` | SSR render harness asserting HTML substrings and plan totals. |
| `vite.config.ts` | `@` alias → `src/`, `base: './'`, Vuetify auto-import, Vitest config. |
| `.github/workflows/ci.yml` | lint → format:check → typecheck → test → build → smoke. |

## Layer map

```
types.ts  (types only, imported by every layer)
   ↑
data/     game.ts · gems.ts · pools.ts        — sampled AH catalog, constants
   ↑
utils/    game.ts · shapes.ts                 — pure readers & normalizers
   ↑
utils/    assign.ts → solver.ts · verdict.ts  — pure computation over data
   ↑
stores/   hash.ts → build.ts                  — the single mutable state + persistence
   ↑
components/ + App.vue                         — render state and Plan, call store actions
```

Dependency direction rules — each is testable by inspecting imports:

- Imports only point downward. `data/` imports nothing but types. `utils/` imports `data/` and types, never stores or Vue components. `stores/` imports utils/data, never components. Components import the store and read-only helpers.
- The solver is pure: `solve(state)` in src/utils/solver.ts touches no DOM, no globals, no store — same `BuildState` in, same `Plan` out. `src/utils/game.ts`, `shapes.ts`, `assign.ts`, `verdict.ts` are equally pure.
- The store is the only state owner. Domain state (`cls`, `picks`, `wine`, `mode`, `catFilter`) lives exclusively in src/stores/build.ts (`useBuildStore`). Components hold only ephemeral UI state (active tab, drag indices, select preselection).
- UI never computes domain facts. Every number a component shows (levels, costs, shorts, savings) comes from `Plan` or from a pure read helper (`catTheme`, `verdictFor`, `wineLeft`, …). No component re-derives allocation, pricing, or feasibility.

## Reactive dataflow

```
user action → store action mutates state → plan = computed(solve(state)) → components re-render
                                        ↘ deep watch → history.replaceState('#' + encodeBuild(state))
```

- `solve` runs synchronously inside a Vue `computed` on every mutation of `cls`, `picks`, `wine`, or `mode`. There is no debounce, no worker, no optimize button; the state space is small enough (≤ 8 pieces, few distinct affixes) that the exact DP search is instant.
- Because `plan` is a computed, no stale plan can ever render: any UI showing plan data is by construction showing the plan of the current state.
- Persistence is a side channel: the same mutations that recompute the plan also rewrite the URL hash (see Persistence design).

## Module map

| File | Contents |
| --- | --- |
| `src/types.ts` | Every domain type (`GameDb`, `Listing`, `BuildState`, `Plan`, `AffixResult`, `BoughtPiece`, `Verdict`, …). No runtime code. |
| `src/data/game.ts` | `GAME` database: global parameters (`thresholdLevel`, `maxGemLevel: 1`, `maxTarget: 9`, `maxPresetsPerPiece: 1`, `maxPresetPerAffix: 2`, `wineMaxLevel: 8`), 6 classes, 8 slots with real AH listings (Rare rarity, Aug 2026 sample), 32 affixes with per-affix thresholds, 5 wine tiers. Also `CAT` (category label + CSS var). See `domain-data.md` for provenance. |
| `src/data/gems.ts` | `GEMS` — AH gem catalog (Tier I) with name/material/shape/price/qty/affix; `MATERIAL_SHAPE`; `gemsByAffix` index sorted cheapest-first. |
| `src/data/pools.ts` | `PRESET_SLOTS` — which slots each affix can roll as a factory preset (wiki-sourced); `canPreset(slotId, affixId)`. |
| `src/utils/game.ts` | Pure DB readers (`byId`, `affix`, `gemFor`, `gemForShape`, `affixThreshold`), Victory Wine budget math (`wineTier`, `wineCapPerAffix`, `resolveWine`, `wineOnlyIds`, `wineSpent`, `wineLeft`), UI mapping helpers (`catTheme`, `catLabel`, `catIcon`, `slotIcon`), `totalSockets`, `clampTarget`. |
| `src/utils/shapes.ts` | `SHAPES` glyph definitions (label/color/SVG path), `canonicalShape` (fixes the `circ` → `hex` misread), `sanitizeShapes`, `gemShapes`, `gemFitsSocket`. |
| `src/utils/assign.ts` | `assignGems` — min-cost max-flow assignment of gem demand to socket-shape supply, typed-array MCMF with preallocated buffers, plus a priority-preserving partial-fill fallback. See `assignment.md`. |
| `src/utils/solver.ts` | `solve(state): Plan`. Internals: `slotOptions` (candidate listings per slot incl. hypothetical presets), `choosePieces` (exact DP over slots × preset counts × shape supply), `simulateAllocation` (memoized `assignGems` wrapper), `betterPlan` (lexicographic comparator), `cheapestRaw`. See `solver.md`. |
| `src/utils/verdict.ts` | `verdictFor(piece, plan): Verdict` — why this listing was bought, or the price ceiling under which a preset listing would beat it. See `verdict.md`. |
| `src/stores/build.ts` | `useBuildStore` (Pinia setup store): all state, all actions, `plan` computed, `loadFromHash` at init, `startHashSync`, `share`. See `state-and-ui.md`. |
| `src/stores/hash.ts` | `encodeBuild` / `decodeBuild`: base64 JSON hash codec with defensive merge and legacy-link migration. See `state-and-ui.md`. |
| `src/composables/useToast.ts` | Module-singleton `visible`/`message` refs + `showToast`; rendered by the `v-snackbar` in `App.vue`. |
| `src/plugins/vuetify.ts` | Light/dark themes (category colors `offense`/`defense`/`utility` registered as theme colors), `defaultTheme: 'system'`, mdi-svg icon aliases, global component defaults. |
| `src/assets/styles.css` | Vuetify-cooperating CSS: fonts via `--v-font-*`, border opacity, `.eq-grid` named areas, pip visuals, affix-row modifiers. See `state-and-ui.md`. |
| `src/App.vue` | Root layout: header (share/reset), warning banners, `EquipmentPanel` + `SidePanel` two-column grid, toast snackbar, `onMounted(startHashSync)`. |
| `src/components/SidePanel.vue` | Two-tab card (Atributos / Affixes) using `v-show` to preserve field state. |
| `src/components/AffixPanel.vue` | Affix picking, pip target bar, drag-to-reprioritize, category filter, Victory Wine budget UI. |
| `src/components/AttributesPanel.vue` | Cosmetic class selector. |
| `src/components/EquipmentPanel.vue` | CSS-grid inventory mirroring the in-game layout; one `EquipmentSlot` per slot. |
| `src/components/EquipmentSlot.vue` | Renders the listing the plan buys for one slot: preset row, gem rows, free sockets, verdict tooltip. |
| `src/components/SocketShape.vue` | SVG socket glyph; filled = occupied; dashed `?` box = shape not yet sampled. |

## Persistence design

- The URL hash is the only persistence. There is no localStorage, no cookies, no backend. A shared link is the complete build.
- Encoding: `encodeBuild` (src/stores/hash.ts) serializes `{ c, p, w, m }` as UTF-8-safe base64 JSON; the store writes it with `history.replaceState` (never `pushState` — mutations must not pollute browser history).
- Hydration: `loadFromHash` runs once at store creation (guarded by `typeof location === 'undefined'` so SSR does not crash) and again on `hashchange` when the incoming hash differs from the current encoding — pasting a link into the address bar swaps builds without a reload.
- `startHashSync` is called exactly once, from `App.vue`'s `onMounted`, which never fires during SSR — so watchers and window listeners only exist in the browser.
- Decoding is a defensive merge: unknown classes, affixes, and tiers are dropped; levels are clamped; a corrupt hash is ignored wholesale. Legacy links in the old wine format `[tier, a1, a2]` are migrated to 1 point per named affix at the smallest tier that pays for them; legacy `pr`/`pp` fields (manual presets and premium) are deliberately ignored because presets are now solver output, not input. Full schema in `state-and-ui.md`.

## SSR smoke architecture

`pnpm smoke` runs `ssr-smoke.mjs`:

1. Stubs `globalThis.location` (`hash: ''`) and `globalThis.history` (`replaceState() {}`) so the store's hash code is inert.
2. Boots Vite in `middlewareMode` with `ssr: { noExternal: [/vuetify/] }` (Vuetify must be bundled for SSR) and `ssrLoadModule('/ssr-smoke-entry.ts')`.
3. `ssr-smoke-entry.ts` exports `makeApp(seed)` — a fresh Pinia + `createSSRApp(App)` + `createVuetify({ ...vuetifyOptions, ssr: true })` per case, with the store seeded via `store.$patch(seed)` — and `readPlan()` returning that store's `plan`.
4. Each of the 6 cases is rendered with `renderToString`, HTML entities are decoded, and the harness asserts exact substrings AND, where defined, an exact `plan.grandTotal`: `plano completo` 1825, `wine cobre tudo` 1347, `bebida fora da build` 355, `mínimo compra o mais barato` 355. The `inviável` case asserts the capacity banner text renders.
5. Exit code 1 if any case fails — these totals are the regression lock on the whole solver.

## Tooling and commands

| Command | Does |
| --- | --- |
| `pnpm dev` | Vite dev server. |
| `pnpm build` | `vue-tsc --build && vite build` — build fails on type errors. |
| `pnpm preview` | Serve the production build. |
| `pnpm typecheck` | `vue-tsc --build`. |
| `pnpm lint` / `pnpm lint:fix` | ESLint (vue + typescript + prettier configs). |
| `pnpm format` / `pnpm format:check` | Prettier write / check. |
| `pnpm test` / `pnpm test:watch` | Vitest, `environment: 'node'`, specs in `tests/**/*.spec.ts`. |
| `pnpm smoke` | SSR smoke (see above). |

CI (`.github/workflows/ci.yml`) runs on every push and PR: pnpm + Node 22, `install --frozen-lockfile`, then lint, format:check, typecheck, test, build, smoke — all must pass.

## Conventions

- Zero comments in `src/`. All rationale lives in `docs/`. If a change needs explanation, update the relevant doc, not the code.
- `@` alias resolves to `src/` (vite.config.ts + tsconfig); all cross-module imports use it.
- TypeScript strict throughout; `src/types.ts` is the single home of domain types — no local re-declarations.
- Prettier and ESLint are CI gates, not suggestions.
- Package manager is pnpm (pinned `pnpm@10.10.0`), Node >= 22.
- UI copy is Brazilian Portuguese (`index.html` is `lang="pt-BR"`); code identifiers and docs are English.
- `vite.config.ts` sets `base: './'` so the build works from a subfolder or `file://`.
- `index.html` loads Google Fonts (Inter, JetBrains Mono) non-blocking via the `media="print"` + `onload` trick with a `<noscript>` fallback.

## Invariants

| Invariant | Why it must hold | What breaks if violated |
| --- | --- | --- |
| `solve` is pure and synchronous. | `plan` is a computed recalculated on every mutation, and the SSR smoke renders it server-side. | Stale or divergent plans; SSR crashes or hydration mismatch. |
| Imports point only downward (components → store → solver → utils → data → types). | `ssr-smoke-entry.ts` must load the store and solver without a DOM; utils are unit-testable in isolation. | Smoke run crashes; circular imports; untestable modules. |
| The store is the only owner of domain state. | One source of truth per field; the hash codec serializes the complete build. | Shared links miss state; UI and plan disagree. |
| Persistence is the URL hash only — no localStorage anywhere. | A link must be the whole build; two tabs must not share hidden state. | `share()` produces incomplete links. |
| Components display only `Plan`-derived numbers, never re-derived math. | The solver and UI can never disagree about a number. | UI shows results the plan did not compute. |
| `loadFromHash` guards on `typeof location === 'undefined'`; `startHashSync` is only invoked from `onMounted`. | Store creation happens during SSR render. | SSR smoke fails with `location is not defined`. |
| The build fails on type errors (`vue-tsc --build` is part of `pnpm build`). | Strict TS is the substitute for the removed runtime defensiveness. | Type rot ships silently. |

## Related docs

- [README.md](README.md)
- [domain-data.md](domain-data.md)
- [solver.md](solver.md)
- [state-and-ui.md](state-and-ui.md)
- [invariants.md](invariants.md)
- [testing.md](testing.md)
