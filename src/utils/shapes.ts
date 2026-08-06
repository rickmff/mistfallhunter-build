import { gemsByAffix } from '@/data/gems'
import type { ShapeDef, ShapeId } from '@/types'

export const SHAPES: Record<ShapeId, ShapeDef> = {
  bar: {
    label: 'retângulo',
    color: '#e05a4e',
    path: 'M6.4 1.8h3.2a1 1 0 0 1 1 1v10.4a1 1 0 0 1-1 1H6.4a1 1 0 0 1-1-1V2.8a1 1 0 0 1 1-1z',
  },
  tri: { label: 'triângulo', color: '#b17ae0', path: 'M8 2l6 11.5H2L8 2z' },
  sq: {
    label: 'quadrado',
    color: '#57c4d8',
    path: 'M3.5 3.5h9a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z',
  },
  hex: {
    label: 'octógono',
    color: '#5cba8a',
    path: 'M5.6 1.8h4.8l3.8 3.8v4.8l-3.8 3.8H5.6l-3.8-3.8V5.6L5.6 1.8z',
  },
}

const isShapeId = (id: string): id is ShapeId => id in SHAPES

export const shapeDef = (id: string | null | undefined): ShapeDef | null =>
  id && isShapeId(id) ? SHAPES[id] : null

export const shapeLabel = (id: string | null | undefined): string =>
  id && isShapeId(id) ? SHAPES[id].label : 'formato ?'

const MISREAD: Record<string, ShapeId> = { circ: 'hex' }

export const canonicalShape = (shape: string | null | undefined): ShapeId | null =>
  shape ? MISREAD[shape] || (isShapeId(shape) ? shape : null) : null

export const sanitizeShapes = (shapes: readonly string[] | undefined): (ShapeId | null)[] =>
  (shapes || []).map((s) => canonicalShape(s))

export function gemShapes(affixId: string): ShapeId[] | null {
  const list = gemsByAffix[affixId]
  return list && list.length ? list.map((g) => g.shape) : null
}

export function gemFitsSocket(affixId: string, shape: ShapeId | null): boolean {
  if (!shape) return false
  const allowed = gemShapes(affixId)
  return !allowed || allowed.includes(shape)
}
