import { describe, expect, it } from 'vitest'

import type { BoughtPiece, Plan, PresetHuntEntry } from '@/types'
import { verdictFor } from '@/utils/verdict'

const piece = (over: Partial<BoughtPiece>): BoughtPiece => {
  const base: Partial<BoughtPiece> = {
    preset: null,
    price: 150,
    rawPrice: 150,
    premium: 0,
    presetGross: null,
    presetSaving: null,
  }
  return { ...base, ...over } as BoughtPiece
}

const planWith = (presetHunt: PresetHuntEntry[]): Plan => {
  const base: Partial<Plan> = { presetHunt }
  return base as Plan
}

const hunt = (name: string, unit: number | null): PresetHuntEntry => ({
  id: 'aegis',
  name,
  cat: 'defense',
  openPts: 1,
  unit,
  gemName: unit == null ? null : 'Guardian Moonstone',
  potential: null,
  ceilings: [],
})

describe('verdictFor', () => {
  it('returns null for a raw piece when there is nothing to hunt', () => {
    expect(verdictFor(piece({}), planWith([]))).toBeNull()
  })

  it('marks a raw piece as best offer when the top hunt target has no gem price', () => {
    const v = verdictFor(piece({}), planWith([hunt('Aegis', null)]))
    expect(v?.ok).toBeNull()
    expect(v?.color).toBe('info')
    expect(v?.label).toBe('crua · melhor oferta')
  })

  it('gives a raw piece a ceiling of raw price plus gem unit when the top hunt target is priced', () => {
    const v = verdictFor(piece({ price: 150, rawPrice: 150 }), planWith([hunt('Aegis', 45)]))
    expect(v?.ok).toBeNull()
    expect(v?.color).toBe('info')
    expect(v?.label).toContain('crua · teto ')
    expect(v?.label).toBe('crua · teto 195 g')
  })

  it('treats a preset piece with an unpriced gem as saving one gem without a gold figure', () => {
    const v = verdictFor(piece({ preset: 'aegis', presetGross: null }), planWith([]))
    expect(v?.ok).toBe(true)
    expect(v?.color).toBe('success')
    expect(v?.label).toBe('preset · poupa 1 gema')
  })

  it('approves a preset piece whose saving is positive, naming the affix with a minus sign', () => {
    const v = verdictFor(
      piece({
        preset: 'aegis',
        price: 250,
        rawPrice: 150,
        premium: 100,
        presetGross: 141,
        presetSaving: 41,
      }),
      planWith([]),
    )
    expect(v?.ok).toBe(true)
    expect(v?.color).toBe('success')
    expect(v?.label).toContain('Aegis')
    expect(v?.label).toContain('−')
    expect(v?.label).toBe('preset Aegis · −41 g')
  })

  it('warns about a preset piece whose saving is negative, showing the overpay with a plus sign', () => {
    const v = verdictFor(
      piece({
        preset: 'aegis',
        price: 250,
        rawPrice: 150,
        premium: 100,
        presetGross: 80,
        presetSaving: -20,
      }),
      planWith([]),
    )
    expect(v?.ok).toBe(false)
    expect(v?.color).toBe('warning')
    expect(v?.label).toContain('+')
    expect(v?.label).toBe('preset Aegis · +20 g')
  })
})
