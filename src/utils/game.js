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


/** Nível em que o affix abre o efeito secundário. `null` = não tem nenhum. */
export const affixThreshold = (id) => {
  const a = affix(id)
  if (!a) return GAME.thresholdLevel
  return 'threshold' in a ? a.threshold : GAME.thresholdLevel // affix novo sem valor lido
}

/* =========================================================================
   VICTORY WINE — o tier dá um número de PONTOS (ranks) para distribuir entre
   os affixes da build; não é um bônus fixo em dois slots. Tiers baixos aceitam
   só 1 ponto por affix, War Blood em diante empilham. Ver GAME.wineTiers.
   ========================================================================= */

export const wineTier = (id) => byId(GAME.wineTiers, id) || GAME.wineTiers[0]

/** Teto de pontos que UM affix aceita neste tier: 1 nos baixos, 2 em War Blood
    e Gods Brew. O tier alto espalha bônus por mais affixes, não empilha num só. */
export const wineCapPerAffix = (wine) => {
  const t = wineTier(wine.tier)
  if (!t.points) return 0
  return Math.min(t.maxPerAffix, t.points, GAME.wineMaxLevel)
}

/* Ordem em que os affixes consomem o orçamento: primeiro os que a build pediu
   (na prioridade da lista), depois os que SÓ a bebida sustenta. A bebida não é
   restrita aos affixes escolhidos — dá para gastar ponto em qualquer um, e ele
   passa a aparecer na lista como "só bebida". */
function wineOrder(wine, picks) {
  const ids = picks.map((p) => p.id)
  for (const id of Object.keys(wine.points || {})) if (!ids.includes(id)) ids.push(id)
  return ids
}

/* Fonte da verdade dos pontos de bebida: normaliza o que o state diz contra o
   tier, o teto por affix e o ladder. Solver e tela chamam esta mesma função,
   então o que aparece na barra é exatamente o que entrou na conta — e um hash
   adulterado não vira bebida infinita. Se o orçamento não cobrir tudo, quem
   está em cima na lista é servido primeiro. */
export function resolveWine(wine, picks) {
  const t = wineTier(wine.tier)
  const out = {}
  if (!t.points) return out
  const cap = wineCapPerAffix(wine)
  let left = t.points
  for (const id of wineOrder(wine, picks)) {
    if (left <= 0) break
    const give = Math.min((wine.points || {})[id] || 0, cap, left)
    if (give > 0) {
      out[id] = give
      left -= give
    }
  }
  return out
}

/** Affixes que existem na lista só por causa da bebida (não foram escolhidos). */
export const wineOnlyIds = (wine, picks) =>
  Object.keys(resolveWine(wine, picks)).filter((id) => !picks.some((p) => p.id === id))

/** Quantos pontos do tier já foram gastos / ainda sobram. */
export const wineSpent = (wine, picks) =>
  Object.values(resolveWine(wine, picks)).reduce((s, n) => s + n, 0)

export const wineLeft = (wine, picks) =>
  Math.max(0, wineTier(wine.tier).points - wineSpent(wine, picks))

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
