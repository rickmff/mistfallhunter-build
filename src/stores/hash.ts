import { GAME } from '@/data/game'
import { affix, byId, clampTarget } from '@/utils/game'
import type { BuildMode, BuildPick, BuildState, WineState, WineTierId } from '@/types'

export interface DecodedBuild {
  cls?: string
  picks?: BuildPick[]
  wine?: WineState
  mode?: BuildMode
}

export function encodeBuild(state: BuildState): string {
  const compact = {
    c: state.cls,
    p: state.picks.map((p) => [p.id, p.lvl]),
    w: [state.wine.tier, { ...state.wine.points }],
    m: state.mode,
  }
  return btoa(unescape(encodeURIComponent(JSON.stringify(compact))))
}

export function decodeBuild(hash: string): DecodedBuild | null {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(hash)))) as Record<string, unknown>
    const out: DecodedBuild = {}
    if (typeof o.c === 'string' && byId(GAME.classes, o.c)) out.cls = o.c
    if (Array.isArray(o.p)) {
      out.picks = (o.p as [string, number][])
        .filter(([id]) => !!affix(id))
        .map(([id, lvl]) => ({ id, lvl: clampTarget(lvl) }))
    }
    if (Array.isArray(o.w)) {
      const [tier, rest, a2] = o.w as [unknown, unknown, unknown]
      const known = (id: string) => !!affix(id)
      if (typeof rest === 'object' && rest !== null) {
        const points: Record<string, number> = {}
        for (const [id, n] of Object.entries(rest as Record<string, number>)) {
          if (known(id) && n > 0) points[id] = Math.floor(n)
        }
        out.wine = {
          tier:
            typeof tier === 'string' && byId(GAME.wineTiers, tier) ? (tier as WineTierId) : 'none',
          points,
        }
      } else {
        const wanted = [rest, a2].filter(
          (id): id is string => typeof id === 'string' && !!id && known(id),
        )
        if (tier && tier !== 'none' && wanted.length) {
          const t = GAME.wineTiers.find((x) => x.points >= wanted.length)
          out.wine = {
            tier: t ? t.id : 'none',
            points: Object.fromEntries(wanted.map((id) => [id, 1])),
          }
        }
      }
    }
    if (o.m === 'full' || o.m === 'min') out.mode = o.m
    return out
  } catch {
    return null
  }
}
