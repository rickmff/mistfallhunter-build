import { describe, expect, it } from 'vitest'
import { assignGems } from '@/utils/assign'
import type { ShapeId } from '@/types'

const shapes: ShapeId[] = ['bar', 'tri', 'sq', 'hex']

describe('assignGems', () => {
  it('places the full demand when supply suffices and picks the cheaper of two allowed shapes', () => {
    const left = [1]
    const out = assignGems(
      [1, 1, 0, 0],
      shapes,
      left,
      (_a, shape) => (shape === 'bar' ? 10 : 5),
      (_a, shape) => shape === 'bar' || shape === 'tri',
    )
    expect(out.placed).toEqual(left)
    expect(out.cost).toBe(5)
    expect(out.x).toEqual([[0, 1, 0, 0]])
  })

  it('serves the first affix to its maximum before the second receives anything when supply is short', () => {
    const out = assignGems(
      [2, 0, 0, 0],
      shapes,
      [2, 3],
      () => 7,
      (_a, shape) => shape === 'bar',
    )
    expect(out.placed).toEqual([2, 0])
    expect(out.cost).toBe(14)
    expect(out.x).toEqual([
      [2, 0, 0, 0],
      [0, 0, 0, 0],
    ])
  })

  it('returns a null shape matrix when wantX is false', () => {
    const out = assignGems(
      [1, 0, 0, 0],
      shapes,
      [1],
      () => 3,
      () => true,
      false,
    )
    expect(out.placed).toEqual([1])
    expect(out.x).toBeNull()
  })

  it('keeps zero-demand rows at zero placement with an all-zero shape row', () => {
    const out = assignGems(
      [2, 2, 2, 2],
      shapes,
      [0, 2],
      () => 4,
      () => true,
    )
    expect(out.placed).toEqual([0, 2])
    expect(out.cost).toBe(8)
    expect(out.x?.[0]).toEqual([0, 0, 0, 0])
  })
})
