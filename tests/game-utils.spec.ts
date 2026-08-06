import { describe, expect, it } from 'vitest'

import { GAME } from '@/data/game'
import type { BuildPick, WineState, WineTierId } from '@/types'
import {
  affixThreshold,
  catTheme,
  clampTarget,
  gemFor,
  gemForShape,
  resolveWine,
  wineCapPerAffix,
  wineLeft,
  wineOnlyIds,
  wineSpent,
} from '@/utils/game'

const wine = (tier: WineTierId, points: Record<string, number> = {}): WineState => ({
  tier,
  points,
})

const picks = (...ids: string[]): BuildPick[] => ids.map((id) => ({ id, lvl: 5 }))

describe('resolveWine', () => {
  it('allocates nothing when the tier is none', () => {
    expect(resolveWine(wine('none', { valor: 3 }), picks('valor'))).toEqual({})
  })

  it('caps each affix at 1 point on tonic and ale tiers', () => {
    expect(resolveWine(wine('tonic', { valor: 3 }), picks('valor'))).toEqual({ valor: 1 })
    expect(resolveWine(wine('ale', { valor: 3, aegis: 2 }), picks('valor', 'aegis'))).toEqual({
      valor: 1,
      aegis: 1,
    })
  })

  it('caps each affix at 2 points on blood and brew tiers', () => {
    expect(resolveWine(wine('blood', { valor: 5 }), picks('valor'))).toEqual({ valor: 2 })
    expect(resolveWine(wine('brew', { valor: 8, aegis: 3 }), picks('valor', 'aegis'))).toEqual({
      valor: 2,
      aegis: 2,
    })
  })

  it('keeps a request below the cap unchanged', () => {
    expect(resolveWine(wine('brew', { valor: 1 }), picks('valor'))).toEqual({ valor: 1 })
  })

  it('serves picks in list order before wine-only ids when the budget runs out', () => {
    const result = resolveWine(
      wine('tonic', { aegis: 1, valor: 1, tenacious: 1 }),
      picks('valor', 'tenacious'),
    )
    expect(result).toEqual({ valor: 1, tenacious: 1 })
  })

  it('grants a partial amount to the affix that exhausts the budget', () => {
    const result = resolveWine(
      wine('blood', { valor: 2, aegis: 2, tenacious: 2 }),
      picks('valor', 'aegis', 'tenacious'),
    )
    expect(result).toEqual({ valor: 2, aegis: 2, tenacious: 1 })
  })
})

describe('wineCapPerAffix', () => {
  it('is 0 for none, 1 for tonic and ale, 2 for blood and brew', () => {
    expect(wineCapPerAffix(wine('none'))).toBe(0)
    expect(wineCapPerAffix(wine('tonic'))).toBe(1)
    expect(wineCapPerAffix(wine('ale'))).toBe(1)
    expect(wineCapPerAffix(wine('blood'))).toBe(2)
    expect(wineCapPerAffix(wine('brew'))).toBe(2)
  })
})

describe('wineOnlyIds', () => {
  it('lists ids that received wine but are not among the picks', () => {
    expect(wineOnlyIds(wine('blood', { valor: 2, aegis: 2 }), picks('valor'))).toEqual(['aegis'])
  })

  it('omits unpicked ids that received nothing because the budget ran out', () => {
    expect(
      wineOnlyIds(wine('tonic', { valor: 1, aegis: 1, tenacious: 1 }), picks('valor', 'aegis')),
    ).toEqual([])
  })
})

describe('wineSpent and wineLeft', () => {
  it('sums the allocated points and reports the remaining budget', () => {
    const w = wine('blood', { valor: 3, aegis: 3 })
    const p = picks('valor', 'aegis')
    expect(wineSpent(w, p)).toBe(4)
    expect(wineLeft(w, p)).toBe(1)
  })

  it('reports zero spent and zero left on the none tier', () => {
    const w = wine('none', { valor: 3 })
    expect(wineSpent(w, picks('valor'))).toBe(0)
    expect(wineLeft(w, picks('valor'))).toBe(0)
  })
})

describe('affixThreshold', () => {
  it('returns 7 for eloquence', () => {
    expect(affixThreshold('eloquence')).toBe(7)
  })

  it('returns 5 for smiting', () => {
    expect(affixThreshold('smiting')).toBe(5)
  })

  it('returns null for elusive, which has no secondary effect', () => {
    expect(affixThreshold('elusive')).toBeNull()
  })

  it('falls back to the global threshold level for an unknown id', () => {
    expect(affixThreshold('nonexistent')).toBe(GAME.thresholdLevel)
  })
})

describe('clampTarget', () => {
  it('raises 0 to the minimum of 1', () => {
    expect(clampTarget(0)).toBe(1)
  })

  it('lowers 99 to the maximum of 9', () => {
    expect(clampTarget(99)).toBe(9)
  })

  it('coerces a non-numeric string to 1', () => {
    expect(clampTarget('garbage')).toBe(1)
  })

  it('parses a numeric string', () => {
    expect(clampTarget('7')).toBe(7)
  })
})

describe('catTheme', () => {
  it('returns a known category unchanged', () => {
    expect(catTheme('offense')).toBe('offense')
    expect(catTheme('defense')).toBe('defense')
  })

  it('falls back to utility for an unknown category', () => {
    expect(catTheme('bogus')).toBe('utility')
  })
})

describe('gemFor', () => {
  it('returns the cheapest gem of an affix with multiple gems', () => {
    expect(gemFor('valor')?.name).toBe('Resolve Amethyst')
    expect(gemFor('valor')?.price).toBe(148)
    expect(gemFor('strife')?.name).toBe('Carnage Onyx')
    expect(gemFor('strife')?.price).toBe(55)
  })

  it('returns null for an affix without gems', () => {
    expect(gemFor('nonexistent')).toBeNull()
  })
})

describe('gemForShape', () => {
  it('returns the gem matching the exact shape', () => {
    expect(gemForShape('valor', 'bar')?.name).toBe('Resolve Onyx')
    expect(gemForShape('valor', 'tri')?.name).toBe('Resolve Amethyst')
  })

  it('returns null when the affix has no gem in that shape', () => {
    expect(gemForShape('valor', 'sq')).toBeNull()
    expect(gemForShape('valor', 'hex')).toBeNull()
  })

  it('returns null for a null shape', () => {
    expect(gemForShape('valor', null)).toBeNull()
  })

  it('returns null for an unknown affix', () => {
    expect(gemForShape('nonexistent', 'bar')).toBeNull()
  })
})
