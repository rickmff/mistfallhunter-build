# State and UI

Purpose: the complete reference for the state layer and the presentation layer — every field and action of the Pinia store with exact semantics, the URL-hash persistence schema including the legacy-link migration, a component-by-component reference for all 7 SFCs, the pip system, the banner decision tree, theming (theme colors and icon aliases), and the CSS architecture. Components never declare emits and never own domain state: every mutation goes through a store action, and every displayed number comes from `Plan` or a pure helper.

## Key files

| Path | Role |
| --- | --- |
| `src/stores/build.ts` | `useBuildStore` — all domain state, all actions, `plan` computed. |
| `src/stores/hash.ts` | `encodeBuild` / `decodeBuild` — hash codec + legacy migration. |
| `src/App.vue` | Root layout, banners, header actions, toast snackbar, starts hash sync. |
| `src/components/SidePanel.vue` | Two-tab container (Atributos / Affixes). |
| `src/components/AffixPanel.vue` | Affix list, pip target bar, drag priority, wine budget UI. |
| `src/components/AttributesPanel.vue` | Cosmetic class selector. |
| `src/components/EquipmentPanel.vue` | Inventory grid of `EquipmentSlot` cells. |
| `src/components/EquipmentSlot.vue` | One slot's bought listing: preset/gem/free rows + verdict tooltip. |
| `src/components/SocketShape.vue` | SVG socket glyph. |
| `src/composables/useToast.ts` | Singleton toast state consumed by `App.vue`. |
| `src/plugins/vuetify.ts` | Themes, icon aliases, component defaults. |
| `src/assets/styles.css` | Grid, pips, affix rows, fonts. |

## Store API — `useBuildStore` (src/stores/build.ts)

Pinia setup store, id `'build'`. Only what the PLAYER decides is state; which pieces to buy and which presets to hunt are solver output, never input.

### State

| Field | Type | Semantics |
| --- | --- | --- |
| `cls` | `string` | Class id; defaults to `GAME.classes[0].id` (`'mercenary'`). Cosmetic — socket rules are universal. |
| `picks` | `BuildPick[]` (`{ id, lvl }`) | The affixes the build wants. Array ORDER = gem allocation priority: when not everything fits, earlier rows are served first. |
| `wine` | `WineState` (`{ tier, points }`) | Victory Wine: `tier` is a `WineTierId`; `points` maps affix id → points spent (each point = +1 run-only rank). Points may target affixes not in `picks`. |
| `mode` | `BuildMode` | `'full'` = buy all 8 slots; `'min'` = buy only what covers the affixes (solver may skip slots). |
| `catFilter` | `string` | Category filter of the add-affix dropdown (`'all'` \| `'offense'` \| `'defense'` \| `'utility'`). UI-only; not persisted in the hash. |

### Computed

| Field | Semantics |
| --- | --- |
| `plan` | `computed<Plan>(() => solve(buildState()))`. Recomputes synchronously on every mutation of `cls`/`picks`/`wine`/`mode`. There is no optimize button — the plan is always current. |

### Actions

| Action | Exact semantics |
| --- | --- |
| `addAffix(id)` | No-op if `id` is falsy or already in `picks` (no duplicates, ever). Pushes `{ id, lvl: affixThreshold(id) ?? GAME.thresholdLevel }` — the seed target is the level that unlocks the affix's secondary effect (7 for most, 5 for a group); affixes with `threshold: null` (no secondary effect) get the default 5. |
| `removeAffix(id)` | Filters the pick out AND `delete wine.value.points[id]` — the affix's wine points return to the budget. Without the delete, the affix would survive as a wine-only row. |
| `setTarget(affixId, lvl)` | Finds the pick; if absent, calls `addAffix(affixId)` first — this is how clicking a pip on a wine-only row promotes it into a real build pick. Then sets `lvl = clampTarget(lvl)` (always 1..`GAME.maxTarget` = 9). |
| `movePick(from, to)` | Bounds-checked reorder of `picks` (splice out, splice in, reassign array). This is the only reprioritization path; drag-and-drop in `AffixPanel` calls it. |
| `setWineTier(tier)` | Validates against `GAME.wineTiers` (else `'none'`), then `clampWine()`. |
| `setWinePoints(affixId, n)` | Clamps the request: `max(0, min(floor(n), wineCapPerAffix(wine), current + wineLeft(wine, picks)))` — a point can only rise as far as the per-affix cap and the remaining tier budget allow. Stores the value, or deletes the key when it clamps to 0. |
| `addWinePoint(affixId)` / `removeWinePoint(affixId)` | `setWinePoints(current ± 1)`. |
| `reset()` | Restores all five state fields to defaults. |
| `share()` | `syncHash()` first (guarantees the hash matches the state), then copies `location.href` via `navigator.clipboard.writeText`, falling back to a hidden-textarea `document.execCommand('copy')`; toasts "🔗 Link copiado!" on success or an instruction to copy from the address bar on total failure. |
| `startHashSync()` | Idempotent (internal `syncing` flag). Deep-watches `[cls, picks, wine, mode]` → `syncHash()` (`history.replaceState` — never `pushState`), and adds a `hashchange` listener that calls `loadFromHash()` only when the incoming hash differs from the current encoding — pasted links swap builds without reload, self-written hashes are ignored. Called exactly once, from `App.vue`'s `onMounted`, so it never runs during SSR. |

### Internals

- `clampWine()` sets `wine.points = resolveWine(wine, picks)` — the SAME normalization the solver uses (src/utils/game.ts). What the state holds is exactly what enters the computation; there is no second rule to diverge, and a tampered hash cannot mint infinite wine. Called after `setWineTier` and after hash hydration.
- `loadFromHash()` runs once at store creation. SSR guard: returns immediately when `typeof location === 'undefined'`. Applies the decoded patch field-by-field; runs `clampWine()` after applying `wine`.
- `buildState()` snapshots the four persisted fields into a plain `BuildState` for `solve` and `encodeBuild`.

## Hash URL schema (src/stores/hash.ts)

`#` + `btoa(unescape(encodeURIComponent(JSON.stringify(compact))))` — UTF-8-safe base64 of:

| Field | Content |
| --- | --- |
| `c` | `cls` (class id string). |
| `p` | `picks` as `[id, lvl]` pairs. |
| `w` | `[wine.tier, { affixId: points }]`. |
| `m` | `mode` (`'full'` \| `'min'`). |

`decodeBuild(hash)` returns a partial `DecodedBuild` or `null` on any parse error (corrupt hash → build untouched). Defensive merge rules — data that vanished between game patches is silently dropped:

- `c` kept only if the class exists in `GAME.classes`.
- `p` entries filtered to known affixes; `lvl` passed through `clampTarget` (1..9).
- `w` current format `[tier, pointsObject]`: tier validated against `GAME.wineTiers` else `'none'`; points filtered to known affixes with `n > 0`, floored.
- Legacy wine format `[tier, a1, a2]`: the old model gave "+N ranks" in two fixed affix slots, an axis that no longer exists (tiers are now point QUANTITY, not magnitude). The migration preserves the INTENT — which affixes were drinking — as 1 point each, at the smallest tier whose `points` covers the count. Applied only when the old tier was set and at least one named affix still exists.
- `m` kept only if `'full'` or `'min'`.
- Legacy `pr`/`pp` fields (manual per-piece presets and preset premium) are deliberately ignored: presets stopped being input — the solver chooses them from the real catalog.

## Component reference

No component declares `emits`; only `EquipmentSlot` and `SocketShape` declare props. All are `<script setup>`.

### App.vue

- Responsibility: root layout — header (brand, "Copiar link" → `share`, "Reset" → `reset`), warning banners, a 12-column row with `EquipmentPanel` (md 7) and `SidePanel` (md 5) inside a max-width 1240px container, and the global `v-snackbar` (timeout 1900) fed by `useToast`.
- `onMounted(startHashSync)` — the single activation point of persistence.
- Store reads: `picks` (banner gating), `plan`. Actions: `share`, `reset`, `startHashSync`.
- Banner decision tree (`banners` computed) — feasibility warnings only, i.e. only what demands ACTION. There is deliberately no success banner: "it worked" is already written in the panel (pieces, sockets, cost), and a fixed green alert only steals height — the whole screen must fit without scrolling. With `picks` empty: no banners. Otherwise the FIRST matching branch wins (at most one banner):
  1. `!plan.feasibleSockets` → the build demands `plan.D` sockets but gear has only `plan.totalSocketsAll`; suggests raising the Victory Wine tier or lowering targets.
  2. `plan.shapeBlocked.length > 0` → sockets remain but cannot be used. The text branches on whether any blocked affix has `blockedBy === 'unknown'`: unknown → "`plan.unknownSockets` socket(s) whose shape was never sampled; the plan never force-fits a gem into a socket it cannot verify — sample the listing's Slot Type to unlock them"; otherwise → wrong shape, swap the piece for one with the right socket. Names the blocked affixes.
  3. `!plan.feasible` → lists every affix with `short > 0` and its missing ranks; suggests adjusting Wine or priority.

### SidePanel.vue

- Responsibility: card with two grown tabs — `attrs` ("Atributos") and `affixes` ("Affixes", default). Panels are toggled with `v-show`, not `v-if`, so field state (selects, drag state) survives tab switches.
- No store access; no props.

### AffixPanel.vue

- Responsibility: the whole affix workflow in one place — choose affixes, aim levels, see what the plan delivers, reorder priority, and manage the Victory Wine budget (wine lives here because this is where it is visible: its ranks are the striped pips).
- Rows are `plan.results` verbatim: picked affixes in priority order first, wine-only rows appended last. Each row shows: drag handle (priority number; wine icon instead for wine-only rows), category avatar, name, chips (`threshold` when `reached`; `só bebida` on wine-only rows with an explanatory tooltip; `falta N · reason` error chip when `short > 0`), the pip bar, and `Lv.{achieved}` with `alvo {target}` (or `sem alvo` for wine-only).
- `shortReason` maps `blockedBy` → text: `capacity` "sem socket livre", `shape` "sem socket do formato certo", `unknown` "socket de formato não amostrado".
- Drag-to-reprioritize: native HTML5 drag & drop — the list is short, a dependency is not warranted. `dragstart` records the index and sets `dataTransfer` data (Firefox requires some payload); dropping on row `j` calls `movePick(from, j)` only when `j < picks.length` — wine-only rows sit after the picks, compete with nobody for gems, and therefore have no priority: dropping on them moves nothing, and they are not draggable (`:draggable="!r.wineOnly"`).
- Add flow: category filter chip group bound to `store.catFilter` (`Todos` + one chip per `CAT` entry), a select of remaining affixes (already-picked filtered out) whose selection is kept valid by a `watchEffect` when the filter changes or the affix gets added, and an add button → `addAffix`.
- Victory Wine section: tier select (`setWineTier`) with point counts in the labels; a spent/total chip (`tier.points - wineLeft`/`tier.points`); a caption with the tier's craft cost and per-affix cap; one row per drinking affix (from `plan.results` where `wineBonus > 0`) with `−`/`+` buttons (`removeWinePoint`/`addWinePoint`; `+` disabled when no budget remains or the affix is at `wineCapPerAffix`); an add-select offering ANY affix under the cap — the wine is not restricted to picked affixes, and pointing it at an unpicked one makes that affix appear above as "só bebida". Footer text states the game rule: the drink is taken before the run, locks on confirm, and lasts until extraction or death — ranks without sockets, run-only, the striped pip.
- Store reads: `picks`, `wine`, `catFilter`, `plan`. Actions: `addAffix`, `removeAffix`, `setTarget`, `movePick`, `setWineTier`, `addWinePoint`, `removeWinePoint`.

### AttributesPanel.vue

- Responsibility: class select bound to `store.cls` plus the class's role caption. Explicitly cosmetic: it labels the build; socket rules are universal.

### EquipmentPanel.vue

- Responsibility: the inventory. Indexes `plan.boughtPieces` by slot id and renders one `EquipmentSlot` per `GAME.slots` entry inside `.eq-grid`, assigning `grid-area: <slot.id>` so the CSS template controls placement. A slot absent from `boughtPieces` gets `piece: null`.

### EquipmentSlot.vue

- Props: `slotDef` (`SlotDef`, required), `piece` (`BoughtPiece | null`, default null — null means the plan does not buy this slot; the cell dims via `.eq-slot--off`).
- Responsibility: render the LISTING the plan says to buy — compact on purpose, all 8 pieces must fit on screen without scrolling. There is no preset chooser here: the solver already picked the cheapest real listing.
- Header row: slot icon (`slotIcon`), then the piece's `base` name, or the slot label (the part of `slotDef.name` before `·`) when empty.
- Body: one row per piece slot answering three things — WHICH affix occupies it, the socket SHAPE, and whether the affix is factory PRESET or a socketed gem. Preset row first (highlighted `.eq-preset`, category-colored avatar — `warning` color and "sem efeito" note when `presetUseful` is false), then one row per gem socket: gem lookup is by socket index (`gems.find(g => g.socket === i)`), not list position, because shape decides placement; the gem name shown is the shape-specific one (`gemForShape` falling back to `gemFor`). Empty sockets render as "socket livre" with the shape glyph.
- Verdict: `verdictFor(piece, plan)` — shown ONLY inside the header `title` tooltip (`why` computed), costing zero grid height. For `hypothetical` pieces the tooltip instead says to SEARCH the Auction House ("PROCURAR", filter "Affix Effects") with the estimated price from the slot's cheapest `'?'` listing.
- Store reads: `plan` (for the verdict).

### SocketShape.vue

- Props: `shape` (`string | null`, default null), `filled` (`boolean`, default false), `size` (default 15).
- Responsibility: the socket glyph. Known shape → the `SHAPES` SVG path in the shape's own color, filled when occupied by a gem, outlined at 0.7 opacity when free. Unknown/null shape → a dashed rounded square with a `?` in `currentColor` and the aria-label/tooltip "formato do socket ainda não amostrado nesta listagem".

## The pip system

The pip bar in `AffixPanel` is both display and control: `GAME.maxTarget` (9) buttons per affix; clicking pip N calls `setTarget(id, N)` (which also promotes wine-only rows). The bar reads like the in-game affix bar — gear first, drink on top:

| Class | Condition (pip index `i`) | Visual | Meaning |
| --- | --- | --- | --- |
| `pip--gear` | `i <= gearLevel` where `gearLevel = gemLevels + presetPts` | solid, full opacity, category color (`currentColor` via `text-<cat>` on the bar) | Rank the equipment carries (gem or factory preset). |
| `pip--wine` | `gearLevel < i <= achieved` | striped diagonal fill + inset outline | Rank the Victory Wine adds on top — run-only, hence the borrowed look. |
| `pip--miss` | `achieved < i <= target` | error red at 0.4 opacity | Aimed but not delivered by the plan. |
| `pip--off` | `i > target` | 0.14 opacity | Above the target. |
| `pip--thr` | `i === threshold` (additive) | thin vertical marker after the pip | The level that unlocks the secondary effect; absent for `threshold: null` affixes. |

Each pip's tooltip (`pipTitle`) states the rank's origin and "clique para mirar aqui". A legend below the rows repeats the three main states with `.pip-key` swatches.

## Theming (src/plugins/vuetify.ts)

- `defaultTheme: 'system'` — follows `prefers-color-scheme`; there is no in-app toggle.
- The three affix categories are registered as THEME COLORS (`offense`, `defense`, `utility`) in both themes, so Vuetify utilities `bg-offense`, `text-defense`, `border-utility` and `:color="catTheme(cat)"` all work per category. `catTheme`/`catIcon` in src/utils/game.ts map a category to its color name and icon alias.
- Palette (light / dark): `offense` #cf4a5c / #e26576 (also `error`), `defense` #3b74d1 / #5c8ee2 (also `info`), `utility` #7c5cd1 / #9c7ee2, `primary` #9a6410 / #e2b463 (gold — the brand), plus `background`, `surface`, `surface-light`, `sunken`, `secondary`, `success`, `warning`.
- Icons: mdi-svg only (no icon font). Aliases: `$link` (mdiLinkVariant), `$reset` (mdiRestore), `$add` (mdiPlus), `$remove` (mdiClose), `$dot` (mdiCircle), `$cart` (mdiCartOutline), `$gem` (mdiHexagonMultipleOutline), `$drag` (mdiDragVertical), `$minus` (mdiMinus), `$wine` (mdiBottleWine), `$offense` (mdiSword), `$defense` (mdiShieldHalfFull), `$utility` (mdiLightningBolt), `$slotWeapon` (mdiSwordCross), `$slotHelm` (mdiRacingHelmet), `$slotChest` (mdiTshirtCrew), `$slotGloves` (mdiHandBackRight), `$slotPants` (mdiHanger), `$slotBoots` (mdiShoeFormal), `$slotAmulet` (mdiNecklace), `$slotRing` (mdiRing). `slotIcon(id)` maps slot ids to the `$slot*` aliases.
- Global defaults: `VCard` flat/rounded-lg, `VSheet` rounded-lg, `VBtn` outlined + `text-none`, `VSelect`/`VNumberInput` outlined + compact + hide-details, `VAlert` tonal + compact + rounded-lg.

## CSS architecture (src/assets/styles.css)

The stylesheet cooperates with Vuetify instead of fighting it — it sets and consumes Vuetify's own CSS variables:

- Fonts: `--v-font-body` / `--v-font-heading` set to Inter (loaded non-blocking in `index.html`); `.font-mono` = JetBrains Mono with `tabular-nums` for aligned numbers.
- `--v-border-opacity` lowered to 0.1 on `.v-application` and both theme classes; row separators use `rgba(var(--v-border-color), var(--v-border-opacity))`.
- Theme-reactive colors always via `rgb(var(--v-theme-*))` (e.g. `.pip--miss` uses `--v-theme-error`, `.eq-preset` and `.affix-row--over` use `--v-theme-primary`) — never hard-coded per-theme values.
- `.eq-grid`: named `grid-template-areas` mirroring the in-game inventory — `weapon` spans both columns, then `helm|chest`, `gloves|pants`, `boots` alone, `amulet|ring`; at ≤ 599px it collapses to a single column listing all 8 areas. `EquipmentPanel` assigns each cell's `grid-area` from the slot id, so slot order in data does not dictate layout.
- Pips: `.pip` is a flex-growing 8px-tall button in `currentColor`; modifier classes as in the pip table; `.pip--thr::after` draws the threshold marker; `.pip:hover` outlines the clickable pip.
- Affix rows: `.affix-row + .affix-row` top border; `.affix-row--dragging` fades the dragged row; `.affix-row--over` shows the drop position as an inset top bar; `.affix-row--wine` dims wine-only rows and its `.drag-handle` reverts to the default cursor.
- `.eq-preset` highlights the factory-preset row (primary tint + inset left bar); `.eq-slot--off` dims cells the plan does not buy; `.eq-art` fades slot icons.

## Invariants

| Invariant | Why it must hold | What breaks if violated |
| --- | --- | --- |
| `picks` order equals gem allocation priority, and `movePick` is the only reorder path. | The solver serves earlier rows first when capacity is short; the drag UI promises exactly that. | Priority display and actual allocation diverge. |
| `wine.points` is always the output of `resolveWine` after any mutation that can invalidate it (`setWineTier`, hash hydration), and every write path clamps by cap and remaining budget. | State must equal what enters the computation; a tampered hash must not exceed the tier budget. | Free wine ranks from hand-edited links; UI shows points the solver ignores. |
| `removeAffix` also deletes the affix's wine points. | Otherwise the removed affix survives as a wine-only row and keeps consuming the budget. | "Removed" affixes reappear as `só bebida`. |
| `addAffix` never duplicates an id; every target write passes `clampTarget` (1..`GAME.maxTarget`). | The solver indexes results by id; the pip bar renders exactly `maxTarget` pips. | Duplicate rows; targets outside the bar. |
| Hash writes use `history.replaceState`, never `pushState`. | Dozens of mutations per session must not pollute browser history. | Back button walks through every click. |
| The `hashchange` listener re-loads only when the hash differs from the current encoding. | Self-written hashes must not re-trigger hydration loops. | Infinite load/sync cycles. |
| No component declares emits; mutations go through store actions only. | Single mutation vocabulary; actions carry the clamping rules. | Unclamped writes bypass wine/target rules. |
| At most one banner renders, in the fixed order `feasibleSockets` → `shapeBlocked` → `feasible`, and there is no success banner. | Each banner demands a different player action; the screen must fit without scrolling. | Contradictory advice; layout overflow. |
| The verdict never occupies grid height — tooltip only. | All 8 equipment cells must fit on screen. | Inventory stops fitting without scroll. |

## Related docs

- [README.md](README.md)
- [architecture.md](architecture.md)
- [wine.md](wine.md)
- [solver.md](solver.md)
- [verdict.md](verdict.md)
- [shapes-and-gems.md](shapes-and-gems.md)
