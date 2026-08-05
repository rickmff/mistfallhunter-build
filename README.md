# Gyldsmith — Mistfall Hunter Build Planner

Você declara os affixes que quer; o solver escolhe o conjunto de peças **mais barato** cujos
sockets cobrem a demanda e distribui as gemas. Vue 3 (`<script setup>`) + Vuetify 4 + Vite.

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
| `src/data/game.js` | **Base de dados do jogo.** Toda mudança de patch começa aqui: affixes, slots, preços da Auction House, gemas, tiers de Victory Wine. |
| `src/utils/solver.js` | `solve(state)` — função pura, sem DOM: demanda de sockets → subconjunto de peças mais barato → alocação das gemas. |
| `src/utils/game.js` | Helpers de leitura da base (`affix()`, `gemFor()`, `clampTarget()`, …). |
| `src/composables/useBuild.js` | Estado da build (singleton reativo), ações e persistência no hash da URL. |
| `src/composables/useToast.js` | Estado do snackbar. |
| `src/plugins/vuetify.js` | Tema (paleta dourada, light/dark), ícones SVG e defaults dos componentes. |
| `src/components/` | Um SFC por bloco da tela. |
| `src/assets/styles.css` | Único CSS custom — fonte e dois enfeites de 3px. O resto é utility class do Vuetify. |

O plano é um `computed` sobre o estado: mudou input, recalcula e re-renderiza sozinho.

## Notas

- **Tema**: segue o `prefers-color-scheme` do sistema (`defaultTheme: 'system'`).
- **Links de build**: o estado vive no hash da URL em base64 — links gerados pela versão
  anterior (vanilla JS) continuam abrindo idênticos.
- **Ícones**: paths SVG via `@mdi/js`, registrados como aliases (`icon="$link"`), então só o
  que é usado entra no bundle.
