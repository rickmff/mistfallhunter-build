import { describe, expect, it } from 'vitest'

import { GAME } from '@/data/game'
import { GEMS, MATERIAL_SHAPE, gemsByAffix } from '@/data/gems'
import { canPreset, PRESET_SLOTS } from '@/data/pools'

const affixIds = GAME.affixes.map((a) => a.id)
const slotIds = GAME.slots.map((s) => s.id)
const allListings = GAME.slots.flatMap((slot) => slot.listings.map((listing) => ({ slot, listing })))

describe('gem catalog', () => {
  it('covers every one of the 32 affixes with at least one gem', () => {
    expect(affixIds).toHaveLength(32)
    for (const id of affixIds) {
      expect(gemsByAffix[id], id).toBeDefined()
      expect(gemsByAffix[id].length, id).toBeGreaterThan(0)
    }
  })

  it('keeps every gemsByAffix list sorted ascending by price', () => {
    for (const [id, list] of Object.entries(gemsByAffix)) {
      const prices = list.map((g) => g.price)
      expect(prices, id).toEqual([...prices].sort((a, b) => a - b))
    }
  })

  it('holds exactly 12 gems per socket shape', () => {
    const counts: Record<string, number> = {}
    for (const g of GEMS) counts[g.shape] = (counts[g.shape] ?? 0) + 1
    expect(counts).toEqual({ bar: 12, tri: 12, sq: 12, hex: 12 })
  })

  it('gives every gem the socket shape dictated by its material', () => {
    for (const g of GEMS) expect(g.shape, g.name).toBe(MATERIAL_SHAPE[g.mat])
  })
})

describe('auction house listings', () => {
  it('marks every listing preset as null, unidentified or a valid affix id', () => {
    for (const { slot, listing } of allListings) {
      if (listing.preset === null || listing.preset === '?') continue
      expect(affixIds, `${slot.id} @${listing.price}`).toContain(listing.preset)
    }
  })

  it('only carries identified presets that are legal for their slot via canPreset', () => {
    for (const { slot, listing } of allListings) {
      if (!listing.preset || listing.preset === '?') continue
      expect(canPreset(slot.id, listing.preset), `${slot.id} ${listing.preset}`).toBe(true)
    }
  })

  it('lists one raw shape per empty socket, all drawn from bar/tri/sq/hex/circ', () => {
    const rawShapes = ['bar', 'tri', 'sq', 'hex', 'circ']
    for (const { slot, listing } of allListings) {
      for (const s of listing.shapes) expect(rawShapes, `${slot.id} @${listing.price}`).toContain(s)
      const expected = slot.sockets - (listing.preset ? 1 : 0)
      expect(listing.shapes, `${slot.id} @${listing.price}`).toHaveLength(expected)
    }
  })
})

describe('affix thresholds', () => {
  it('keeps every threshold null or within GAME.maxTarget', () => {
    for (const a of GAME.affixes) {
      if (a.threshold === null) continue
      expect(a.threshold, a.id).toBeLessThanOrEqual(GAME.maxTarget)
    }
  })
})

describe('equipment slots', () => {
  it('defines exactly 8 slots, each with 2 sockets', () => {
    expect(GAME.slots).toHaveLength(8)
    for (const slot of GAME.slots) expect(slot.sockets, slot.id).toBe(2)
  })
})

describe('preset pools', () => {
  it('references only valid affix ids and valid slot ids and never the ring slot', () => {
    for (const [affixId, pool] of Object.entries(PRESET_SLOTS)) {
      expect(affixIds).toContain(affixId)
      for (const slotId of pool) {
        expect(slotIds, affixId).toContain(slotId)
        expect(slotId, affixId).not.toBe('ring')
      }
    }
  })
})

describe('wine tiers', () => {
  it('caps maxPerAffix at the tier point budget for every tier past none', () => {
    for (const tier of GAME.wineTiers) {
      if (tier.id === 'none') continue
      expect(tier.maxPerAffix, tier.id).toBeLessThanOrEqual(tier.points)
    }
  })
})
