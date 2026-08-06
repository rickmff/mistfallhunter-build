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
- **Threshold é por affix, não 5 para todos.** O efeito secundário abre no **7** na maioria dos
  affixes e no **5** num grupo (Bulwark, Deft, Ethereal, Iron Helmet, Resilience, Seeker, Smiting,
  Vitality); seis não têm efeito secundário nenhum (`threshold: null` — Blessing, Burst, Curse,
  Elusive, Swift, Wealth) e neles não existe "bater o threshold". Está em `affixes[].threshold`,
  lido de mistfalldb.com/affixes. Adicionar um affix já mira o threshold *dele*.
- **Victory Wine: o tier é QUANTIDADE, não magnitude.** Cada brew dá um orçamento de pontos
  (Mortal Tonic 2 · Hero's Ale 4 · War Blood 5 · Gods Brew 6) e cada ponto vale +1 rank. O teto por
  affix é **1** nos dois tiers baixos e **2** em War Blood e Gods Brew — o tier alto serve para
  espalhar bônus por mais affixes, não para estourar um só (Gods Brew = 3 affixes com +2, ou 6 com
  +1). Nenhum brew cobre sozinho um alvo 3+. Os pontos **não se restringem aos affixes da build**:
  gastar um ponto num affix qualquer o traz para a lista marcado como *"só bebida"* — ele não
  custa socket nem gold, e ainda pode bater um threshold sozinho (5 pontos num affix de
  threshold 5). Clicar num pip dessa linha o promove a pedido de verdade.
  ⚠️ Nomes e quantidades vêm de Game Rant e Power Up Gaming; a mistfallhunters.wiki se recusa a
  publicar números. Não é público em que nível da Tavern cada brew destrava nem o custo real.
- **Não há teto de affixes por build.** O limite é socket, e disso o solver já cuida.
- **Tema**: segue o `prefers-color-scheme` do sistema (`defaultTheme: 'system'`).
- **Links de build**: o estado vive no hash da URL em base64. Links antigos continuam abrindo:
  os campos `pr` (presets manuais) e `pp` (prêmio) são ignorados de propósito, e a bebida no
  formato velho (`[tier, a1, a2]`, em que o tier era "+N ranks") é migrada preservando a
  intenção — os affixes que bebiam ganham 1 ponto cada, no menor tier que pague a conta.
- **Ícones**: paths SVG via `@mdi/js`, registrados como aliases (`icon="$link"`), então só o
  que é usado entra no bundle.
