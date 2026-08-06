import { CAT, GAME } from '@/data/game'
import { gemsByAffix } from '@/data/gems'
import type {
  AffixCategory,
  AffixDef,
  BuildPick,
  GemDef,
  ShapeId,
  WineState,
  WineTierDef,
} from '@/types'

export const byId = <T extends { id: string }>(list: T[], id: string): T | undefined =>
  list.find((x) => x.id === id)

export const affix = (id: string): AffixDef | undefined => byId(GAME.affixes, id)

export const gemFor = (id: string): GemDef | null => (gemsByAffix[id] || [])[0] || null

export const gemForShape = (id: string, shape: ShapeId | null): GemDef | null =>
  (gemsByAffix[id] || []).find((g) => g.shape === shape) || null

export const affixThreshold = (id: string): number | null => {
  const a = affix(id)
  if (!a) return GAME.thresholdLevel
  return 'threshold' in a ? a.threshold : GAME.thresholdLevel
}

export const wineTier = (id: string): WineTierDef => byId(GAME.wineTiers, id) || GAME.wineTiers[0]

export const wineCapPerAffix = (wine: WineState): number => {
  const t = wineTier(wine.tier)
  if (!t.points) return 0
  return Math.min(t.maxPerAffix, t.points, GAME.wineMaxLevel)
}

function wineOrder(wine: WineState, picks: BuildPick[]): string[] {
  const ids = picks.map((p) => p.id)
  for (const id of Object.keys(wine.points || {})) if (!ids.includes(id)) ids.push(id)
  return ids
}

export function resolveWine(wine: WineState, picks: BuildPick[]): Record<string, number> {
  const t = wineTier(wine.tier)
  const out: Record<string, number> = {}
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

export const wineOnlyIds = (wine: WineState, picks: BuildPick[]): string[] =>
  Object.keys(resolveWine(wine, picks)).filter((id) => !picks.some((p) => p.id === id))

export const wineSpent = (wine: WineState, picks: BuildPick[]): number =>
  Object.values(resolveWine(wine, picks)).reduce((s, n) => s + n, 0)

export const wineLeft = (wine: WineState, picks: BuildPick[]): number =>
  Math.max(0, wineTier(wine.tier).points - wineSpent(wine, picks))

export const catTheme = (cat: string): AffixCategory =>
  cat in CAT ? (cat as AffixCategory) : 'utility'

export const catLabel = (cat: string): string => CAT[cat as AffixCategory]?.label || cat

export const catIcon = (cat: string): string => `$${catTheme(cat)}`

const SLOT_ICONS: Record<string, string> = {
  weapon: '$slotWeapon',
  helm: '$slotHelm',
  chest: '$slotChest',
  gloves: '$slotGloves',
  pants: '$slotPants',
  boots: '$slotBoots',
  amulet: '$slotAmulet',
  ring: '$slotRing',
}

export const slotIcon = (id: string): string => SLOT_ICONS[id] || '$slotChest'

export const totalSockets = (): number => GAME.slots.reduce((s, sl) => s + sl.sockets, 0)

export const clampTarget = (v: number | string): number =>
  Math.min(GAME.maxTarget, Math.max(1, parseInt(String(v), 10) || 1))
