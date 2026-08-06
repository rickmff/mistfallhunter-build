import { gemsByAffix } from '../data/gems.js'

/* =========================================================================
   FORMATOS DE SOCKET — o "Gem Type"/"Slot Type" da Auction House. O jogo tem
   EXATAMENTE QUATRO, um por material de gema (ver data/gems.js):

       retângulo vermelho (Agate/Onyx) · triângulo roxo (Amethyst)
       quadrado ciano (Moonstone)      · octógono verde (Peridot)

   Não existe socket "círculo": o octógono verde, pequeno, parece redondo — foi
   assim que ele entrou como `circ` na leitura dos prints. `sanitizeShapes()`
   corrige na entrada, então o resto do app só vê os quatro de verdade.
   ========================================================================= */
export const SHAPES = {
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
  // octógono, como a Peridot do jogo
  hex: {
    label: 'octógono',
    color: '#5cba8a',
    path: 'M5.6 1.8h4.8l3.8 3.8v4.8l-3.8 3.8H5.6l-3.8-3.8V5.6L5.6 1.8z',
  },
}

export const shapeDef = (id) => SHAPES[id] || null

export const shapeLabel = (id) => (SHAPES[id] ? SHAPES[id].label : 'formato ?')

/* Leitura dos prints das PEÇAS confundiu o octógono com um círculo — corrigido
   na entrada, para o catálogo nunca descrever um socket que não existe. */
const MISREAD = { circ: 'hex' }

export const canonicalShape = (shape) => (shape ? MISREAD[shape] || (SHAPES[shape] ? shape : null) : null)

/** Formatos de uma listagem, já normalizados. */
export const sanitizeShapes = (_slotId, shapes) => (shapes || []).map((s) => canonicalShape(s))

/* =========================================================================
   GEMA × FORMATO — cada affix tem uma gema por formato (nem todos os quatro),
   e a gema só entra no socket do formato dela. A tabela sai direto do catálogo
   da AH: nada de regra escrita à mão aqui.
   ========================================================================= */

/** Formatos em que este affix tem gema — `null` = affix ainda não mapeado. */
export function gemShapes(affixId) {
  const list = gemsByAffix[affixId]
  return list && list.length ? list.map((g) => g.shape) : null
}

/** A gema deste affix cabe num socket deste formato?
    Socket sem formato NÃO serve de curinga: sem saber o formato não dá pra
    afirmar que a gema entra, e encaixar assim seria burlar a regra. */
export function gemFitsSocket(affixId, shape) {
  if (!shape) return false
  const allowed = gemShapes(affixId)
  return !allowed || allowed.includes(shape)
}
