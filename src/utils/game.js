import { GAME, CAT } from '../data/game.js'

/* Helpers de leitura da base de dados — puros, sem estado. */

export const byId = (list, id) => list.find((x) => x.id === id)

export const affix = (id) => byId(GAME.affixes, id)

/** Gema mais barata do affix (ou null se ainda não mapeada). */
export const gemFor = (id) => GAME.gemPrices[id] || null

/* Prêmio de preset: quanto a mais custa a versão presetada da peça.
   Primeiro que existir vence — amostra por affix, amostra por slot, e só então
   o palpite global (`override` = valor digitado na UI, senão GAME.default).
   Devolve null quando não há palpite nenhum: "prêmio desconhecido", que a UI
   traduz em teto de break-even em vez de economia cravada. */
export function presetPremiumFor(slotId, affixId, override) {
  const P = GAME.presetPremium || {}
  const byAffix = (P.byAffix || {})[affixId]
  if (byAffix != null) return byAffix
  const bySlot = (P.bySlot || {})[slotId]
  if (bySlot != null) return bySlot
  if (override != null) return override
  return P.default != null ? P.default : null
}

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

/** Banda de valueOfGold para um preço em gold. */
export const valueBandFor = (gold) =>
  GAME.valueBands.find((b) => gold <= b.max) || GAME.valueBands[GAME.valueBands.length - 1]

export const bandColor = (vog) => (GAME.valueBands.find((b) => b.vog === vog) || {}).color || '#888'

/** Nível-alvo sempre em 1..GAME.maxTarget. */
export const clampTarget = (v) => Math.min(GAME.maxTarget, Math.max(1, parseInt(v, 10) || 1))
