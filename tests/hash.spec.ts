import { describe, expect, it } from 'vitest'

import { decodeBuild, encodeBuild } from '@/stores/hash'
import type { BuildState } from '@/types'

const enc = (o: unknown): string => btoa(unescape(encodeURIComponent(JSON.stringify(o))))

describe('encodeBuild and decodeBuild', () => {
  it('round-trips cls, picks, wine and mode unchanged', () => {
    const state: BuildState = {
      cls: 'sorcerer',
      picks: [
        { id: 'valor', lvl: 7 },
        { id: 'deft', lvl: 5 },
      ],
      wine: { tier: 'blood', points: { valor: 2, elusive: 1 } },
      mode: 'min',
    }
    expect(decodeBuild(encodeBuild(state))).toEqual({
      cls: 'sorcerer',
      picks: [
        { id: 'valor', lvl: 7 },
        { id: 'deft', lvl: 5 },
      ],
      wine: { tier: 'blood', points: { valor: 2, elusive: 1 } },
      mode: 'min',
    })
  })
})

describe('decodeBuild', () => {
  it('returns null for input that is not valid base64', () => {
    expect(decodeBuild('not-base64!!')).toBeNull()
  })

  it('drops picks whose affix id is unknown', () => {
    const d = decodeBuild(
      enc({
        p: [
          ['valor', 3],
          ['nonsense', 5],
        ],
      }),
    )
    expect(d?.picks).toEqual([{ id: 'valor', lvl: 3 }])
  })

  it('clamps pick levels into the 1..9 range', () => {
    const d = decodeBuild(
      enc({
        p: [
          ['valor', 15],
          ['deft', 0],
          ['swift', -3],
        ],
      }),
    )
    expect(d?.picks).toEqual([
      { id: 'valor', lvl: 9 },
      { id: 'deft', lvl: 1 },
      { id: 'swift', lvl: 1 },
    ])
  })

  it('omits cls when the class id is unknown', () => {
    expect(decodeBuild(enc({ c: 'paladin' }))).toEqual({})
  })

  it('falls back to tier none when the wine tier id is unknown', () => {
    const d = decodeBuild(enc({ w: ['megabrew', { valor: 1 }] }))
    expect(d?.wine).toEqual({ tier: 'none', points: { valor: 1 } })
  })

  it('maps the legacy wine format to the smallest tier with enough points and one point per affix', () => {
    const d = decodeBuild(enc({ w: ['r4', 'elusive', 'deft'] }))
    expect(d?.wine).toEqual({ tier: 'tonic', points: { elusive: 1, deft: 1 } })
  })

  it('produces no wine patch when the legacy format names only unknown affixes', () => {
    expect(decodeBuild(enc({ w: ['r4', 'foo', 'bar'] }))).toEqual({})
  })

  it('accepts only full or min as mode', () => {
    expect(decodeBuild(enc({ m: 'full' }))?.mode).toBe('full')
    expect(decodeBuild(enc({ m: 'min' }))?.mode).toBe('min')
    expect(decodeBuild(enc({ m: 'compact' }))?.mode).toBeUndefined()
  })
})
