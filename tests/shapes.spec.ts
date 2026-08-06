import { describe, expect, it } from 'vitest'

import {
  canonicalShape,
  gemFitsSocket,
  gemShapes,
  sanitizeShapes,
  shapeDef,
  shapeLabel,
} from '@/utils/shapes'

describe('canonicalShape', () => {
  it("translates the misread 'circ' to 'hex'", () => {
    expect(canonicalShape('circ')).toBe('hex')
  })

  it('keeps a valid shape id unchanged', () => {
    expect(canonicalShape('bar')).toBe('bar')
  })

  it('returns null for an unrecognized id', () => {
    expect(canonicalShape('nope')).toBeNull()
  })

  it('returns null for null input', () => {
    expect(canonicalShape(null)).toBeNull()
  })
})

describe('sanitizeShapes', () => {
  it('canonicalizes every entry and preserves the array length', () => {
    const result = sanitizeShapes(['bar', 'circ', 'nope'])
    expect(result).toEqual(['bar', 'hex', null])
    expect(result).toHaveLength(3)
  })

  it('returns an empty array for undefined input', () => {
    expect(sanitizeShapes(undefined)).toEqual([])
  })
})

describe('gemShapes', () => {
  it('returns the shapes of the gems mapped to an affix', () => {
    expect(gemShapes('valor')).toEqual(['tri', 'bar'])
    expect(gemShapes('smiting')).toEqual(['hex'])
  })

  it('returns null for an affix with no mapped gems', () => {
    expect(gemShapes('nonexistent')).toBeNull()
  })
})

describe('gemFitsSocket', () => {
  it('rejects a null socket shape even for an unknown affix', () => {
    expect(gemFitsSocket('valor', null)).toBe(false)
    expect(gemFitsSocket('nonexistent', null)).toBe(false)
  })

  it('accepts any real shape for an unknown affix', () => {
    expect(gemFitsSocket('nonexistent', 'bar')).toBe(true)
    expect(gemFitsSocket('nonexistent', 'tri')).toBe(true)
    expect(gemFitsSocket('nonexistent', 'sq')).toBe(true)
    expect(gemFitsSocket('nonexistent', 'hex')).toBe(true)
  })

  it('accepts only the shapes of its mapped gems for a known affix', () => {
    expect(gemFitsSocket('valor', 'tri')).toBe(true)
    expect(gemFitsSocket('valor', 'bar')).toBe(true)
    expect(gemFitsSocket('valor', 'sq')).toBe(false)
    expect(gemFitsSocket('valor', 'hex')).toBe(false)
  })
})

describe('shapeDef', () => {
  it('returns the definition of a known shape', () => {
    expect(shapeDef('bar')?.label).toBe('retângulo')
  })

  it('returns null for an unknown shape id', () => {
    expect(shapeDef('nope')).toBeNull()
    expect(shapeDef(null)).toBeNull()
    expect(shapeDef(undefined)).toBeNull()
  })
})

describe('shapeLabel', () => {
  it('returns the label of a known shape', () => {
    expect(shapeLabel('hex')).toBe('octógono')
  })

  it("labels an unknown shape 'formato ?'", () => {
    expect(shapeLabel('nope')).toBe('formato ?')
    expect(shapeLabel(null)).toBe('formato ?')
    expect(shapeLabel(undefined)).toBe('formato ?')
  })
})
