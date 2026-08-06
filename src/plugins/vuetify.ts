import 'vuetify/styles'

import {
  mdiBottleWine,
  mdiCartOutline,
  mdiCircle,
  mdiClose,
  mdiDragVertical,
  mdiHandBackRight,
  mdiHanger,
  mdiHexagonMultipleOutline,
  mdiLightningBolt,
  mdiLinkVariant,
  mdiMinus,
  mdiNecklace,
  mdiPlus,
  mdiRacingHelmet,
  mdiRestore,
  mdiRing,
  mdiShieldHalfFull,
  mdiShoeFormal,
  mdiSword,
  mdiSwordCross,
  mdiTshirtCrew,
} from '@mdi/js'
import { createVuetify, type ThemeDefinition, type VuetifyOptions } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'

const light: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#f6f6f7',
    surface: '#ffffff',
    'surface-light': '#fafafa',
    sunken: '#f4f4f5',

    primary: '#9a6410',
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

const dark: ThemeDefinition = {
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

export const vuetifyOptions: VuetifyOptions = {
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
      drag: mdiDragVertical,
      minus: mdiMinus,
      wine: mdiBottleWine,

      offense: mdiSword,
      defense: mdiShieldHalfFull,
      utility: mdiLightningBolt,

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

  theme: { defaultTheme: 'system', themes: { light, dark } },

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
