import { describe, expect, it } from 'vitest'
import { GAME } from '@/data/game'
import { solve } from '@/utils/solver'
import type { BuildState } from '@/types'

const build = (seed: Partial<BuildState>): BuildState => ({
  cls: 'mercenary',
  picks: [],
  wine: { tier: 'none', points: {} },
  mode: 'full',
  ...seed,
})

describe('solve', () => {
  it('prices the full plan of elusive, eloquence and skypiercer at level 5 with gods brew wine at 1825 gold', () => {
    const plan = solve(
      build({
        picks: [
          { id: 'elusive', lvl: 5 },
          { id: 'eloquence', lvl: 5 },
          { id: 'skypiercer', lvl: 5 },
        ],
        wine: { tier: 'brew', points: { eloquence: 2, elusive: 2 } },
        mode: 'full',
      }),
    )
    expect(plan.grandTotal).toBe(1825)
  })

  it('prices a build fully covered by war blood wine at 1347 gold, the bare cost of the eight pieces', () => {
    const plan = solve(
      build({
        picks: [{ id: 'elusive', lvl: 2 }],
        wine: { tier: 'blood', points: { elusive: 2 } },
        mode: 'full',
      }),
    )
    expect(plan.grandTotal).toBe(1347)
  })

  it('prices skypiercer level 3 in min mode at 355 gold even when the wine boosts an affix outside the build', () => {
    const plan = solve(
      build({
        picks: [{ id: 'skypiercer', lvl: 3 }],
        wine: { tier: 'tonic', points: { deft: 1 } },
        mode: 'min',
      }),
    )
    expect(plan.grandTotal).toBe(355)
  })

  it('prices skypiercer level 3 in min mode without wine at 355 gold by buying only the cheapest options', () => {
    const plan = solve(build({ picks: [{ id: 'skypiercer', lvl: 3 }], mode: 'min' }))
    expect(plan.grandTotal).toBe(355)
  })

  it('marks five picks at level 9 in min mode as infeasible both overall and on socket capacity', () => {
    const plan = solve(
      build({
        picks: ['elusive', 'eloquence', 'vitality', 'seamless', 'focused'].map((id) => ({
          id,
          lvl: 9,
        })),
        mode: 'min',
      }),
    )
    expect(plan.feasible).toBe(false)
    expect(plan.feasibleSockets).toBe(false)
  })

  it('serves an overloaded build by priority so the first pick achieves at least as much as the last', () => {
    const plan = solve(
      build({
        picks: ['elusive', 'eloquence', 'vitality', 'seamless', 'focused'].map((id) => ({
          id,
          lvl: 9,
        })),
        mode: 'min',
      }),
    )
    const first = plan.results[0]
    const last = plan.results[plan.results.length - 1]
    expect(first.achieved).toBeGreaterThanOrEqual(last.achieved)
  })

  it('buys all eight slots at their cheapest preset-free listing when there are no picks in full mode', () => {
    const plan = solve(build({ picks: [] }))
    const expected = GAME.slots.reduce(
      (s, sl) => s + Math.min(...sl.listings.filter((L) => !L.preset).map((L) => L.price)),
      0,
    )
    expect(plan.feasible).toBe(true)
    expect(plan.grandTotal).toBe(expected)
  })

  it('never assigns more preset points to skypiercer level 5 in min mode than maxPresetPerAffix allows', () => {
    const plan = solve(build({ picks: [{ id: 'skypiercer', lvl: 5 }], mode: 'min' }))
    expect(plan.results[0].presetPts).toBeLessThanOrEqual(GAME.maxPresetPerAffix)
  })

  it('yields the same feasible grand total for a two-affix build regardless of pick order', () => {
    const ab = solve(
      build({
        picks: [
          { id: 'skypiercer', lvl: 3 },
          { id: 'deft', lvl: 2 },
        ],
      }),
    )
    const ba = solve(
      build({
        picks: [
          { id: 'deft', lvl: 2 },
          { id: 'skypiercer', lvl: 3 },
        ],
      }),
    )
    expect(ab.feasible).toBe(true)
    expect(ba.feasible).toBe(true)
    expect(ab.grandTotal).toBe(ba.grandTotal)
  })

  it('lists a wine-only affix after the picks with wineOnly true, target equal to its wine points and zero demand', () => {
    const plan = solve(
      build({
        picks: [{ id: 'skypiercer', lvl: 3 }],
        wine: { tier: 'tonic', points: { deft: 1 } },
        mode: 'min',
      }),
    )
    const wineOnly = plan.results.filter((r) => r.wineOnly)
    expect(wineOnly).toHaveLength(1)
    const deft = wineOnly[0]
    expect(deft.id).toBe('deft')
    expect(plan.results.indexOf(deft)).toBe(plan.results.length - 1)
    expect(deft.target).toBe(1)
    expect(deft.demand).toBe(0)
  })
})
