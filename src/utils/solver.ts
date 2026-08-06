import { GAME } from '@/data/game'
import { canPreset } from '@/data/pools'
import {
  affix,
  affixThreshold,
  clampTarget,
  gemFor,
  gemForShape,
  resolveWine,
  totalSockets,
  wineOnlyIds,
} from '@/utils/game'
import { SHAPES, gemFitsSocket, gemShapes, sanitizeShapes } from '@/utils/shapes'
import { assignGems } from '@/utils/assign'
import type {
  AffixResult,
  BoughtPiece,
  BuildMode,
  BuildState,
  GemDef,
  Listing,
  PieceOption,
  Plan,
  PresetHuntEntry,
  ShapeId,
  SlotDef,
} from '@/types'

const SHAPE_IDS = Object.keys(SHAPES) as ShapeId[]

interface SimResult {
  placed: number[]
  gemCost: number
  x: number[][] | null
}

interface SearchState {
  cost: number
  P: number
  counts: number
  sup: number
  prev: SearchState | null
  opt: PieceOption | null
}

interface PlanEval {
  got: number[]
  cost: number
  presets: number
  P: number
}

export function solve(state: BuildState): Plan {
  const MGL = Math.max(1, GAME.maxGemLevel)

  const wineBy = resolveWine(state.wine, state.picks)

  const entries = [
    ...state.picks.map((p) => ({ id: p.id, lvl: p.lvl, wineOnly: false })),
    ...wineOnlyIds(state.wine, state.picks).map((id) => ({ id, lvl: wineBy[id], wineOnly: true })),
  ]

  const results: AffixResult[] = entries.map((p, idx) => {
    const a = affix(p.id)
    const target = clampTarget(p.lvl)
    const wineBonus = wineBy[p.id] || 0
    const avail = Math.max(0, target - wineBonus)
    return {
      id: p.id,
      name: a ? a.name : p.id,
      cat: a ? a.cat : 'utility',
      priority: idx + 1,
      wineOnly: p.wineOnly,
      target,
      threshold: affixThreshold(p.id),
      wineBonus,
      avail,
      demand: avail,
      socketsNeeded: Math.ceil(avail / MGL),
      presetPts: 0,
      socketsUsed: 0,
      gemLevels: 0,
      achieved: 0,
      short: 0,
      reached: false,
      blockedBy: null,
      shapeBlocked: false,
      gemBuys: [],
      gemPts: 0,
      gemName: null,
      gemMat: null,
      gemUnit: null,
      gemSub: 0,
    }
  })

  const pick = choosePieces(results, state.mode)
  const chosen = pick.pieces
  chosen.sort((a, b) => a.price - b.price)

  for (const r of results) {
    r.presetPts = chosen.filter((c) => c.preset === r.id).length
    r.demand = Math.max(0, r.avail - r.presetPts)
    r.socketsNeeded = Math.ceil(r.demand / MGL)
  }
  for (const c of chosen) {
    if (!c.preset) continue
    const g = gemFor(c.preset)
    c.presetUseful = true
    c.presetGross = g ? g.price : null
    c.presetSaving = g ? g.price - c.premium : null
  }

  for (const c of chosen) {
    c.openSockets = Array.from({ length: c.gemSockets }, (_, i) => ({
      i,
      shape: c.shapes[i] ?? null,
      used: false,
    }))
  }

  const allShapes = chosen.flatMap((c) => c.openSockets.map((s) => s.shape))
  const supply = SHAPE_IDS.map((s) => allShapes.filter((x) => x === s).length)
  const fit = simulateAllocation(
    supply,
    results,
    results.map((r) => r.demand),
  )
  const fitX = fit.x as number[][]

  results.forEach((r, ai) => {
    let rem = r.demand
    SHAPE_IDS.forEach((shape, si) => {
      let qty = fitX[ai][si]
      while (qty > 0) {
        const target = chosen
          .flatMap((sl) => sl.openSockets.map((s) => ({ sl, s })))
          .find(({ s }) => !s.used && s.shape === shape)
        if (!target) break
        const lvlHere = Math.min(MGL, rem)
        target.s.used = true
        target.sl.free--
        target.sl.gems.push({ affix: r.id, cat: r.cat, level: lvlHere, socket: target.s.i })
        r.socketsUsed++
        r.gemLevels += lvlHere
        rem -= lvlHere
        qty--
      }
    })
    r.blockedBy = null
    if (rem > 0) {
      const idle = chosen.flatMap((sl) => sl.openSockets.filter((s) => !s.used))
      r.blockedBy = !idle.length ? 'capacity' : idle.some((s) => !s.shape) ? 'unknown' : 'shape'
    }
    r.shapeBlocked = r.blockedBy === 'shape' || r.blockedBy === 'unknown'
    r.achieved = r.gemLevels + r.wineBonus + r.presetPts
    r.short = Math.max(0, r.target - r.achieved)
    r.reached = r.threshold != null && r.achieved >= r.threshold
  })

  const boughtPieces = chosen
  const usedPieces = chosen.filter((c) => c.gems.length > 0)
  const baseCost = boughtPieces.reduce((s, c) => s + c.rawPrice, 0)
  const premiumCost = boughtPieces.reduce((s, c) => s + c.premium, 0)
  const shapeExtraCost = boughtPieces.reduce((s, c) => s + (c.shapeExtra || 0), 0)
  const knownCost = boughtPieces.reduce((s, c) => s + c.price, 0)
  const totalSocketsAll = totalSockets()

  let gemsCost = 0
  let gemUnknown = 0
  let gemCount = 0
  const placedByAffix: Record<string, Map<string, { gem: GemDef | null; qty: number }>> = {}
  for (const c of boughtPieces) {
    for (const gem of c.gems) {
      const shape = c.shapes[gem.socket] ?? null
      const g = gemForShape(gem.affix, shape) || gemFor(gem.affix)
      const bucket = placedByAffix[gem.affix] || (placedByAffix[gem.affix] = new Map())
      const k = g ? g.name : '?'
      const cur = bucket.get(k) || { gem: g, qty: 0 }
      cur.qty++
      bucket.set(k, cur)
    }
  }
  for (const r of results) {
    const cheapest = gemFor(r.id)
    const buys = [...(placedByAffix[r.id] || new Map<string, { gem: GemDef | null; qty: number }>()).values()]
    r.gemBuys = buys.map((b) => ({
      name: b.gem ? b.gem.name : null,
      mat: b.gem ? b.gem.mat : null,
      shape: b.gem ? b.gem.shape : null,
      unit: b.gem ? b.gem.price : null,
      qty: b.qty,
      sub: b.gem ? b.gem.price * b.qty : 0,
    }))
    r.gemPts = r.demand
    r.gemName = cheapest ? cheapest.name : null
    r.gemMat = cheapest ? cheapest.mat : null
    r.gemUnit = cheapest ? cheapest.price : null
    r.gemSub = r.gemBuys.reduce((s, b) => s + b.sub, 0)
    gemCount += r.gemBuys.reduce((s, b) => s + b.qty, 0)
    if (r.gemPts > 0 && !cheapest) gemUnknown++
    gemsCost += r.gemSub
  }
  const grandTotal = knownCost + gemsCost

  const presetUsed = results.reduce((s, r) => s + r.presetPts, 0)
  const gemDemand = results.reduce((s, r) => s + r.socketsNeeded, 0)

  const presetPieces = boughtPieces.filter((c) => c.preset)
  const presetSavings = presetPieces.reduce((s, c) => s + (c.presetSaving || 0), 0)
  const presetGross = presetPieces.reduce((s, c) => s + (c.presetGross || 0), 0)
  const presetSavingUnknown = presetPieces.filter((c) => c.presetGross == null).length
  const presetSlotsFree = boughtPieces.filter((c) => !c.preset).length

  const unidentified = GAME.slots.reduce(
    (s, sl) => s + sl.listings.filter((L) => L.preset === '?').length,
    0,
  )
  const catalogSize = GAME.slots.reduce((s, sl) => s + sl.listings.length, 0)
  const toHunt = boughtPieces.filter((c) => c.hypothetical)

  const presetHunt: PresetHuntEntry[] = results
    .map((r) => {
      const g = gemFor(r.id)
      return {
        id: r.id,
        name: r.name,
        cat: r.cat,
        openPts: r.demand,
        unit: g ? g.price : null,
        gemName: g ? g.name : null,
        potential: g ? g.price * r.demand : null,
        ceilings: g
          ? GAME.slots
              .filter((sl) => canPreset(sl.id, r.id))
              .map((sl) => ({ slot: sl.id, name: sl.name, max: cheapestRaw(sl).price + g.price }))
              .sort((a, b) => a.max - b.max)
          : [],
      }
    })
    .filter((h) => h.openPts > 0)
    .sort((a, b) => Number(a.unit == null) - Number(b.unit == null) || (b.unit || 0) - (a.unit || 0))

  const distinctActive = state.picks.length

  return {
    results,
    chosen,
    boughtPieces,
    usedPieces,
    MGL,
    mode: state.mode,
    D: gemDemand,
    totalSocketsAll,
    presetUsed,
    presetSavings,
    presetGross,
    presetSavingUnknown,
    presetSlotsFree,
    presetHunt,
    unidentified,
    catalogSize,
    toHunt,
    feasibleSockets: gemDemand <= totalSocketsAll,
    feasible: results.every((r) => r.short === 0),
    shapeBlocked: results.filter((r) => r.shapeBlocked),
    unknownSockets: chosen.reduce(
      (s, c) => s + c.openSockets.filter((k) => !k.used && !k.shape).length,
      0,
    ),
    knownCost,
    baseCost,
    premiumCost,
    shapeExtraCost,
    gemsCost,
    gemUnknown,
    gemCount,
    grandTotal,
    distinctActive,
  }
}

const podeVir = (sl: SlotDef, affixId: string): boolean =>
  canPreset(sl.id, affixId) && (!sl.presetPool || sl.presetPool.includes(affixId))

function cheapestRaw(sl: SlotDef): Listing {
  const raws = sl.listings.filter((L) => !L.preset)
  return (raws.length ? raws : sl.listings).reduce((a, b) => (b.price < a.price ? b : a))
}

function slotOptions(sl: SlotDef, wantedIds: Set<string>): PieceOption[] {
  const raw = cheapestRaw(sl)
  const shapeKey = (L: Listing) => sanitizeShapes(L.shapes).slice().sort().join('+')

  const byCombo = new Map<string, Listing>()
  for (const L of sl.listings) {
    if (L.preset) continue
    const k = shapeKey(L)
    const cur = byCombo.get(k)
    if (!cur || L.price < cur.price) byCombo.set(k, L)
  }

  const byAffix = new Map<string, Listing>()
  for (const L of sl.listings) {
    if (!L.preset || L.preset === '?' || !wantedIds.has(L.preset)) continue
    if (!podeVir(sl, L.preset)) continue
    const k = L.preset + '|' + shapeKey(L)
    const cur = byAffix.get(k)
    if (!cur || L.price < cur.price) byAffix.set(k, L)
  }

  const mk = (L: Listing, preset: string | null): PieceOption => ({
    id: sl.id,
    name: sl.name,
    base: sl.base,
    sockets: sl.sockets,
    preset,
    gemSockets: sl.sockets - (preset ? 1 : 0),
    price: L.price,
    qty: L.qty,
    shapes: sanitizeShapes(L.shapes),
    rawPrice: raw.price,
    premium: preset ? L.price - raw.price : 0,
    shapeExtra: preset ? 0 : L.price - raw.price,
  })

  const out = [...byCombo.values()].map((L) => mk(L, null))
  for (const [k, L] of byAffix) out.push(mk(L, k.split('|')[0]))

  const quote = new Map<ShapeId, Listing>()
  for (const L of sl.listings) {
    if (L.preset !== '?') continue
    const s = sanitizeShapes(L.shapes)[0]
    if (!s) continue
    const cur = quote.get(s)
    if (!cur || L.price < cur.price) quote.set(s, L)
  }
  for (const aff of wantedIds) {
    if (!podeVir(sl, aff)) continue
    for (const [s, L] of quote) {
      if (byAffix.has(aff + '|' + s)) continue
      out.push({ ...mk(L, aff), hypothetical: true })
    }
  }
  return out
}

function choosePieces(
  results: AffixResult[],
  mode: BuildMode,
): { pieces: BoughtPiece[]; feasible: boolean } {
  const n = results.length
  const demand = results.map((r) => r.avail)
  const wantedIds = new Set(results.map((r) => r.id))
  const opts = GAME.slots.map((sl) => slotOptions(sl, wantedIds))
  const presetCap = demand.map((d) => Math.min(d, GAME.maxPresetPerAffix ?? d))
  const allowSkip = mode !== 'full'

  const needByShape: Partial<Record<ShapeId, number>> = {}
  results.forEach((r, a) => {
    const allowed = gemShapes(r.id) || SHAPE_IDS
    for (const s of allowed) needByShape[s] = (needByShape[s] || 0) + demand[a]
  })
  const tracked = SHAPE_IDS
  const cap = tracked.map((s) => Math.min(needByShape[s] || 0, 2 * GAME.slots.length))
  for (const list of opts) {
    for (const o of list) {
      o._sup = tracked.map((s) => o.shapes.filter((x) => x === s).length)
      o._ai = o.preset ? results.findIndex((r) => r.id === o.preset) : -1
    }
  }

  const S = tracked.length
  const cnt = (counts: number, a: number) => (counts >> (4 * a)) & 15
  const supAt = (sup: number, s: number) => (sup >> (5 * s)) & 31
  const key = (counts: number, sup: number) => counts * 1048576 + sup

  let cur = new Map<number, SearchState>()
  cur.set(key(0, 0), { cost: 0, P: 0, counts: 0, sup: 0, prev: null, opt: null })

  for (let i = 0; i < GAME.slots.length; i++) {
    const next = new Map<number, SearchState>()
    const put = (k: number, v: SearchState) => {
      const prev = next.get(k)
      if (!prev || v.cost < prev.cost) next.set(k, v)
    }
    for (const st of cur.values()) {
      if (allowSkip) put(key(st.counts, st.sup), { ...st, prev: st, opt: null })
      for (const o of opts[i]) {
        let counts = st.counts
        const ai = o._ai as number
        if (o.preset) {
          if (cnt(counts, ai) >= presetCap[ai]) continue
          counts += 1 << (4 * ai)
        }
        const osup = o._sup as number[]
        let sup = 0
        for (let s = 0; s < S; s++) {
          sup |= Math.min(cap[s], supAt(st.sup, s) + osup[s]) << (5 * s)
        }
        const P = st.P + 1
        put(key(counts, sup), { cost: st.cost + o.price, P, counts, sup, prev: st, opt: o })
      }
    }
    cur = next
  }

  const pathOf = (st: SearchState): PieceOption[] => {
    const out: PieceOption[] = []
    for (let s: SearchState | null = st; s; s = s.prev) if (s.opt) out.push(s.opt)
    return out.reverse()
  }

  const memo = new Map<number, SimResult>()
  const evalState = (st: SearchState): PlanEval => {
    const supply = new Array<number>(S)
    for (let s = 0; s < S; s++) supply[s] = supAt(st.sup, s)
    const left = demand.map((d, a) => d - cnt(st.counts, a))
    const sim = simulateAllocation(supply, results, left, memo, st.counts * 1048576 + st.sup)
    const got = demand.map((_, a) => cnt(st.counts, a) + sim.placed[a])
    const presets = demand.reduce((s, _, a) => s + cnt(st.counts, a), 0)
    return { got, cost: st.cost + sim.gemCost, presets, P: st.P }
  }

  const minGem = results.map((r) => {
    const g = gemFor(r.id)
    return g ? g.price : 0
  })
  const usableBy = results.map((r) => {
    const allowed = gemShapes(r.id) || tracked
    return tracked.map((s) => (allowed.includes(s) ? 1 : 0))
  })
  const lowerBound = (st: SearchState) => {
    let c = st.cost
    for (let a = 0; a < n; a++) c += (demand[a] - cnt(st.counts, a)) * minGem[a]
    return c
  }
  const upperGot = (st: SearchState) =>
    demand.map((d, a) => {
      let room = 0
      for (let s = 0; s < S; s++) if (usableBy[a][s]) room += supAt(st.sup, s)
      return Math.min(d, cnt(st.counts, a) + room)
    })
  const lexCmp = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]
    return 0
  }

  const ranked = [...cur.values()].map((st) => {
    const ub = upperGot(st)
    let ubKey = 0
    for (let a = 0; a < n; a++) ubKey = ubKey * 16 + ub[a]
    return { st, ub, ubKey, lb: lowerBound(st) }
  })
  ranked.sort((x, y) => y.ubKey - x.ubKey || x.lb - y.lb)

  let best: { st: SearchState; ev: PlanEval } | null = null
  for (const { st, ub, lb } of ranked) {
    if (best) {
      const cmp = lexCmp(ub, best.ev.got)
      if (cmp < 0) continue
      if (cmp === 0 && lb >= best.ev.cost) continue
    }
    const ev = evalState(st)
    if (!best || betterPlan(ev, best.ev)) best = { st, ev }
  }

  const win = best as { st: SearchState; ev: PlanEval }
  const pieces: BoughtPiece[] = pathOf(win.st).map((o) => ({
    ...o,
    free: o.gemSockets,
    gems: [],
    openSockets: [],
    presetUseful: false,
    presetGross: null,
    presetSaving: null,
  }))
  return { pieces, feasible: win.ev.got.every((g, a) => g >= demand[a]) }
}

function betterPlan(a: PlanEval, b: PlanEval): boolean {
  for (let i = 0; i < a.got.length; i++) {
    if (a.got[i] !== b.got[i]) return a.got[i] > b.got[i]
  }
  if (a.cost !== b.cost) return a.cost < b.cost
  if (a.presets !== b.presets) return a.presets > b.presets
  return a.P < b.P
}

function gemPriceAt(affixId: string, shape: ShapeId): number {
  const g = gemForShape(affixId, shape) || gemFor(affixId)
  return g ? g.price : 0
}

function simulateAllocation(
  supply: number[],
  results: AffixResult[],
  left: number[],
  memo?: Map<number, SimResult>,
  key = 0,
): SimResult {
  if (memo) {
    const hit = memo.get(key)
    if (hit) return hit
  }
  const out = assignGems(
    supply,
    SHAPE_IDS,
    left,
    (a, shape) => gemPriceAt(results[a].id, shape),
    (a, shape) => gemFitsSocket(results[a].id, shape),
    !memo,
  )
  const res: SimResult = { placed: out.placed, gemCost: out.cost, x: out.x }
  if (memo) memo.set(key, res)
  return res
}
