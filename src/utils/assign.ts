import type { ShapeId } from '@/types'

const INF = 0x7fffffff
const MAXN = 16
const MAXE = 2 * (8 + 8 * 8 + 8)

const eTo = new Int32Array(MAXE)
const eCap = new Int32Array(MAXE)
const eCost = new Int32Array(MAXE)
const eNext = new Int32Array(MAXE)
const head = new Int32Array(MAXN)
const dist = new Int32Array(MAXN)
const inq = new Uint8Array(MAXN)
const pre = new Int32Array(MAXN)
const queue = new Int32Array(MAXN * 64)

export type PriceFn = (a: number, shape: ShapeId) => number
export type AllowedFn = (a: number, shape: ShapeId) => boolean

interface FlowResult {
  flow: number
  cost: number
  placed: number[]
  x: number[][] | null
}

export interface AssignResult {
  placed: number[]
  cost: number
  x: number[][] | null
}

function mcmf(
  dem: number[],
  supply: number[],
  shapes: readonly ShapeId[],
  price: PriceFn,
  allowed: AllowedFn,
  wantX: boolean,
): FlowResult {
  const n = dem.length
  const S = shapes.length
  const N = n + S + 2
  const src = 0
  const snk = N - 1

  let ec = 0
  head.fill(-1, 0, N)
  const add = (u: number, v: number, c: number, w: number) => {
    eTo[ec] = v
    eCap[ec] = c
    eCost[ec] = w
    eNext[ec] = head[u]
    head[u] = ec++
    eTo[ec] = u
    eCap[ec] = 0
    eCost[ec] = -w
    eNext[ec] = head[v]
    head[v] = ec++
  }

  const srcEdge = new Int32Array(n).fill(-1)
  for (let a = 0; a < n; a++) {
    if (dem[a] <= 0) continue
    srcEdge[a] = ec
    add(src, 1 + a, dem[a], 0)
    for (let s = 0; s < S; s++) {
      if (supply[s] > 0 && allowed(a, shapes[s])) add(1 + a, 1 + n + s, INF, price(a, shapes[s]))
    }
  }
  for (let s = 0; s < S; s++) if (supply[s] > 0) add(1 + n + s, snk, supply[s], 0)

  let flow = 0
  let cost = 0
  for (;;) {
    dist.fill(INF, 0, N)
    inq.fill(0, 0, N)
    pre.fill(-1, 0, N)
    dist[src] = 0
    let qh = 0
    let qt = 0
    queue[qt++] = src
    inq[src] = 1
    while (qh < qt) {
      const u = queue[qh++]
      inq[u] = 0
      for (let e = head[u]; e !== -1; e = eNext[e]) {
        if (eCap[e] <= 0) continue
        const v = eTo[e]
        const d = dist[u] + eCost[e]
        if (d < dist[v]) {
          dist[v] = d
          pre[v] = e
          if (!inq[v]) {
            inq[v] = 1
            queue[qt++] = v
          }
        }
      }
    }
    if (dist[snk] === INF) break

    let push = INF
    for (let v = snk; v !== src; v = eTo[pre[v] ^ 1]) if (eCap[pre[v]] < push) push = eCap[pre[v]]
    for (let v = snk; v !== src; v = eTo[pre[v] ^ 1]) {
      eCap[pre[v]] -= push
      eCap[pre[v] ^ 1] += push
    }
    flow += push
    cost += push * dist[snk]
  }

  const placed = new Array<number>(n).fill(0)
  for (let a = 0; a < n; a++) if (srcEdge[a] >= 0) placed[a] = eCap[srcEdge[a] ^ 1]

  let x: number[][] | null = null
  if (wantX) {
    x = Array.from({ length: n }, () => new Array<number>(S).fill(0))
    for (let a = 0; a < n; a++) {
      for (let e = head[1 + a]; e !== -1; e = eNext[e]) {
        const v = eTo[e]
        if (v > n && v <= n + S && (e & 1) === 0) x[a][v - n - 1] = eCap[e ^ 1]
      }
    }
  }
  return { flow, cost, placed, x }
}

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

export function assignGems(
  supply: number[],
  shapes: readonly ShapeId[],
  left: number[],
  price: PriceFn,
  allowed: AllowedFn,
  wantX = true,
): AssignResult {
  const full = mcmf(left, supply, shapes, price, allowed, wantX)

  if (full.flow === sum(left)) return { placed: left.slice(), cost: full.cost, x: full.x }

  const fixed = new Array<number>(left.length).fill(0)
  const dem = new Array<number>(left.length).fill(0)
  const cabe = (a: number, x: number) => {
    for (let k = 0; k < dem.length; k++) dem[k] = k < a ? fixed[k] : k === a ? x : 0
    return mcmf(dem, supply, shapes, price, allowed, false).flow === sum(dem)
  }
  for (let a = 0; a < left.length; a++) {
    let lo = 0
    let hi = left[a]
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (cabe(a, mid)) lo = mid
      else hi = mid - 1
    }
    fixed[a] = lo
  }
  const best = mcmf(fixed, supply, shapes, price, allowed, wantX)
  return { placed: fixed, cost: best.cost, x: best.x }
}
