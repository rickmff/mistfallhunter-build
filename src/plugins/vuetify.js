import 'vuetify/styles'

import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import {
  mdiCartOutline,
  mdiCircle,
  mdiDragVertical,
  mdiClose,
  mdiHandBackRight,
  mdiHanger,
  mdiHexagonMultipleOutline,
  mdiLightningBolt,
  mdiLinkVariant,
  mdiNecklace,
  mdiPlus,
  mdiRacingHelmet,
  mdiRestore,
  mdiRing,
  mdiSack,
  mdiShieldHalfFull,
  mdiShoeFormal,
  mdiSword,
  mdiSwordCross,
  mdiTshirtCrew,
} from '@mdi/js'

/* =========================================================================
   TEMA — a paleta do Gyldsmith (neutro + 1 accent dourado) virou tema
   Vuetify. Cada chave aqui gera as classes utilitárias `bg-`, `text-` e
   `border-`, então as categorias de affix (offense/defense/utility) também
   são cores de tema — nada de CSS custom para pintar chip/dot/barra.
   ========================================================================= */
const light = {
  dark: false,
  colors: {
    background: '#f6f6f7',
    surface: '#ffffff',
    'surface-light': '#fafafa',
    sunken: '#f4f4f5',

    primary: '#9a6410', // Gyldenblood, refinado
    'on-primary': '#ffffff',
    secondary: '#b8801f',

    success: '#2f9e6b',
    warning: '#b3810c',
    error: '#cf4a5c',
    info: '#3b74d1',

    offense: '#cf4a5c',
    defense: '#3b74d1',
    utility: '#7c5cd1',
  },
}

const dark = {
  dark: true,
  colors: {
    background: '#0d0d0f',
    surface: '#161619',
    'surface-light': '#1b1b1f',
    sunken: '#1b1b1f',

    primary: '#e2b463',
    'on-primary': '#17130a',
    secondary: '#d6a648',

    success: '#4fae82',
    warning: '#d3a544',
    error: '#e26576',
    info: '#5c8ee2',

    offense: '#e26576',
    defense: '#5c8ee2',
    utility: '#9c7ee2',
  },
}

export const vuetifyOptions = {
  // ícones como path SVG (@mdi/js): entra no bundle só o que é usado,
  // em vez dos ~2 MB da webfont completa. Uso nos templates: icon="$link".
  icons: {
    defaultSet: 'mdi',
    sets: { mdi },
    aliases: {
      ...aliases,
      link: mdiLinkVariant,
      reset: mdiRestore,
      add: mdiPlus,
      remove: mdiClose,
      dot: mdiCircle,
      cart: mdiCartOutline,
      gem: mdiHexagonMultipleOutline,
      gold: mdiSack,
      drag: mdiDragVertical,

      // categoria de affix — o mesmo ícone do painel direito e dos sockets
      offense: mdiSword,
      defense: mdiShieldHalfFull,
      utility: mdiLightningBolt,

      // "arte" de cada peça na grade de equipamento (ver utils/game.js#slotIcon)
      slotWeapon: mdiSwordCross,
      slotHelm: mdiRacingHelmet,
      slotChest: mdiTshirtCrew,
      slotGloves: mdiHandBackRight,
      slotPants: mdiHanger,
      slotBoots: mdiShoeFormal,
      slotAmulet: mdiNecklace,
      slotRing: mdiRing,
    },
  },

  // 'system' segue o prefers-color-scheme, como fazia o CSS original.
  theme: { defaultTheme: 'system', themes: { light, dark } },

  // Defaults globais: evitam repetir as mesmas props em cada componente.
  // Nada de card com borda: a separação vem do fundo — página `background`,
  // painel `surface`, peça/linha `surface-light`, cada degrau mais claro.
  defaults: {
    VCard: { variant: 'flat', rounded: 'lg' },
    VSheet: { rounded: 'lg' },
    VBtn: { variant: 'outlined', class: 'text-none' },
    VSelect: { variant: 'outlined', density: 'compact', hideDetails: true },
    VNumberInput: { variant: 'outlined', density: 'compact', hideDetails: true },
    VAlert: { variant: 'tonal', density: 'compact', rounded: 'lg' },
  },
}

export default createVuetify(vuetifyOptions)
