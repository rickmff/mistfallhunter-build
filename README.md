# Gyldsmith — Mistfall Hunter Build Planner

Você declara os affixes que quer; o solver devolve o conjunto **mais barato** de listagens
**reais** da Auction House que os entrega, e distribui as gemas. Vue 3 (`<script setup>`) +
Vuetify 4 + Vite.

**Fluxo único.** Não há modo manual nem botão de "otimizar": quais peças comprar e quais presets
aproveitar não são input do jogador — são a resposta. O único input é *quais affixes, em que
nível* (mais a Victory Wine e se você quer as 8 peças ou só o mínimo).

## Rodando

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
npm run preview  # serve o dist/
```

## Estrutura

| Caminho | Papel |
| --- | --- |
| `src/data/game.js` | **Base de dados do jogo.** Toda mudança de patch começa aqui: affixes, o **catálogo de listagens** da Auction House (`slots[].listings`), gemas, tiers de Victory Wine. |
| `src/utils/solver.js` | `solve(state)` — função pura, sem DOM: demanda de ranks → escolha exata das listagens mais baratas (DP) → alocação das gemas. |
| `src/utils/game.js` | Helpers de leitura da base (`affix()`, `gemFor()`, `clampTarget()`, …). |
| `src/composables/useBuild.js` | Estado da build (singleton reativo), ações e persistência no hash da URL. |
| `src/composables/useToast.js` | Estado do snackbar. |
| `src/plugins/vuetify.js` | Tema (paleta dourada, light/dark), ícones SVG e defaults dos componentes. |
| `src/components/` | Um SFC por bloco da tela. A tela imita a de equipamento do jogo: `EquipmentPanel` (valor + grade de 8 peças, uma `EquipmentSlot` cada) à esquerda, `SidePanel` (abas `AttributesPanel` \| `AffixPanel` + botão "Detalhes") à direita e `DetailsPanel` (raio-x: presets + gemas) embaixo. |
| `src/utils/verdict.js` | `verdictFor(peça, plano)` — por que o plano escolheu *esta* listagem do slot, em chip + explicação. |
| `src/assets/styles.css` | Único CSS custom: fonte, a grade de equipamento (`.eq-*`) e os pips de nível (`.pip*`). O resto é utility class do Vuetify. |

O plano é um `computed` sobre o estado: mudou input, recalcula e re-renderiza sozinho.

## Notas

- **⚠️ Presets não identificados — o gargalo atual.** O catálogo tem 60 listagens; **42 delas têm
  preset marcado `'?'`**, porque o ícone do affix não é legível nos prints da AH. Uma listagem `'?'`
  é estritamente pior que a crua (1 socket, nenhum rank aproveitável), então **o solver nunca a
  escolhe** — hoje todo plano sai só com peças cruas e a economia mostrada é um piso.
  Para destravar: abra a AH, use o filtro **"Affix Effects"** (a lista passa a mostrar só os presets
  daquele affix, já rotulados) e troque `preset: '?'` pelo id do affix em `GAME.slots[].listings`.
  Numa simulação com o catálogo rotulado, um plano Elusive 5 + Eloquence 5 cai de 5 peças cruas para
  5 presetadas e poupa **731 g** — com prêmio somado de apenas 4 g.
- **Prêmio de preset** — não existe mais como premissa. Antes era um palpite global; agora é
  simplesmente `preço da listagem presetada − preço da listagem crua mais barata do mesmo slot`,
  duas medidas reais. O plano compra a presetada quando a gema que ela dispensa custa mais que
  essa diferença.
- **Formato dos sockets** (`listings[].shapes`, o filtro "Slot Type") é exibido peça a peça, com
  cor e nome por formato (`src/utils/shapes.js`). As regras do jogo sobre onde cada formato aparece
  vivem em `SHAPE_SLOTS` no mesmo arquivo — hoje: **círculo só em amuleto e anel**. Leitura de print
  que viole a regra vira `null` ("formato ?") em vez de virar mentira na tela: `sanitizeShapes()` é
  aplicado ao montar as listagens no solver. O formato ainda **não restringe a alocação** — se o jogo
  amarrar gema a formato, vira restrição na escolha.
- **Tema**: segue o `prefers-color-scheme` do sistema (`defaultTheme: 'system'`).
- **Links de build**: o estado vive no hash da URL em base64. Links antigos continuam abrindo;
  os campos `pr` (presets manuais) e `pp` (prêmio) que eles carregam são ignorados de propósito,
  já que presets deixaram de ser input.
- **Ícones**: paths SVG via `@mdi/js`, registrados como aliases (`icon="$link"`), então só o
  que é usado entra no bundle.
