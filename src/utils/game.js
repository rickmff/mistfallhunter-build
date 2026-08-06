import { GAME, CAT } from '../data/game.js'
import { gemsByAffix } from '../data/gems.js'

/* Helpers de leitura da base de dados — puros, sem estado. */

export const byId = (list, id) => list.find((x) => x.id === id)

export const affix = (id) => byId(GAME.affixes, id)

/* Um affix tem uma gema POR FORMATO de socket, com preços bem diferentes
   (ver data/gems.js — catálogo lido da Auction House). */

/** Gema mais barata do affix, qualquer formato (null se ainda não mapeada). */
export const gemFor = (id) => (gemsByAffix[id] || [])[0] || null

/** Gema do affix que entra num socket deste formato (null se não existe). */
export const gemForShape = (id, shape) => (gemsByAffix[id] || []).find((g) => g.shape === shape) || null


export const wineTier = (id) => byId(GAME.wineTiers, id) || GAME.wineTiers[0]

/** Nome da cor de tema da categoria — serve para :color e para as classes bg- e text-. */
export const catTheme = (cat) => (CAT[cat] ? cat : 'utility')

export const catLabel = (cat) => (CAT[cat] || {}).label || cat

/** Ícone da categoria — alias registrado em plugins/vuetify.js. */
export const catIcon = (cat) => `$${catTheme(cat)}`

/** "Arte" do slot na grade de equipamento — alias registrado em plugins/vuetify.js. */
const SLOT_ICONS = {
  weapon: '$slotWeapon',
  helm: '$slotHelm',
  chest: '$slotChest',
  gloves: '$slotGloves',
  pants: '$slotPants',
  boots: '$slotBoots',
  amulet: '$slotAmulet',
  ring: '$slotRing',
}

export const slotIcon = (id) => SLOT_ICONS[id] || '$slotChest'

export const totalSockets = () => GAME.slots.reduce((s, sl) => s + sl.sockets, 0)

/** Nível-alvo sempre em 1..GAME.maxTarget. */
export const clampTarget = (v) => Math.min(GAME.maxTarget, Math.max(1, parseInt(v, 10) || 1))
