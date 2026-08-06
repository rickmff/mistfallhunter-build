/* =========================================================================
   ENCAIXE DAS GEMAS — problema de transporte entre FORMATOS de socket (oferta)
   e AFFIXES (demanda), resolvido de forma EXATA. Guloso não serve aqui: a
   ordem em que se serve os affixes mudava o resultado mesmo quando existia
   encaixe perfeito, e o jogador que pediu os mesmos alvos tem de receber
   sempre a mesma build — a mais barata.

   Duas etapas, nesta ordem:
     1. cabe tudo? → todos recebem o alvo (a prioridade não interfere)
     2. não cabe   → leximax por prioridade: maximiza o #1; com ele fixo,
                     maximiza o #2, e assim por diante
   Em ambos os casos, com os totais definidos, escolhe-se EM QUE FORMATO cada
   gema entra pelo menor custo — a gema do mesmo affix custa diferente em cada
   formato (Resolve Amethyst 148 vs Resolve Onyx 155).

   O grafo é minúsculo (≤5 affixes × 4 formatos), mas a busca de peças chama
   isto DEZENAS DE MILHARES de vezes: por isso os buffers são reaproveitados
   entre chamadas, a fila do SPFA anda por índice (nada de shift) e a matriz
   affix×formato só é reconstruída quando alguém pede.
   ========================================================================= */

const INF = 0x7fffffff
const MAXN = 16 // ≤5 affixes + ≤4 formatos + fonte + sorvedouro, com folga
const MAXE = 2 * (8 + 8 * 8 + 8) // arestas dirigidas, com reversas

// buffers reaproveitados — alocar isto por chamada era metade do custo
const eTo = new Int32Array(MAXE)
const eCap = new Int32Array(MAXE)
const eCost = new Int32Array(MAXE)
const eNext = new Int32Array(MAXE)
const head = new Int32Array(MAXN)
const dist = new Int32Array(MAXN)
const inq = new Uint8Array(MAXN)
const pre = new Int32Array(MAXN)
const queue = new Int32Array(MAXN * 64)

/** Fluxo máximo de custo mínimo. Devolve { flow, cost } e, se pedido, x[a][s]. */
function mcmf(dem, supply, shapes, price, allowed, wantX) {
  const n = dem.length
  const S = shapes.length
  const N = n + S + 2
  const src = 0
  const snk = N - 1

  let ec = 0
  head.fill(-1, 0, N)
  const add = (u, v, c, w) => {
    eTo[ec] = v; eCap[ec] = c; eCost[ec] = w; eNext[ec] = head[u]; head[u] = ec++
    eTo[ec] = u; eCap[ec] = 0; eCost[ec] = -w; eNext[ec] = head[v]; head[v] = ec++
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

  // quanto cada affix recebeu: é o que voltou na reversa da aresta da fonte
  const placed = new Array(n).fill(0)
  for (let a = 0; a < n; a++) if (srcEdge[a] >= 0) placed[a] = eCap[srcEdge[a] ^ 1]

  let x = null
  if (wantX) {
    x = Array.from({ length: n }, () => new Array(S).fill(0))
    for (let a = 0; a < n; a++) {
      for (let e = head[1 + a]; e !== -1; e = eNext[e]) {
        const v = eTo[e]
        if (v > n && v <= n + S && (e & 1) === 0) x[a][v - n - 1] = eCap[e ^ 1]
      }
    }
  }
  return { flow, cost, placed, x }
}

const sum = (arr) => arr.reduce((a, b) => a + b, 0)

/* =========================================================================
   assignGems — API do solver.
     supply   nº de sockets por formato, na ordem de `shapes`
     left     quantas gemas cada affix ainda precisa (ordem = prioridade)
     price    (a, shape) → preço da gema daquele affix naquele formato
     allowed  (a, shape) → a gema daquele affix entra nesse formato?
     wantX    devolver também a matriz affix×formato (só a tela precisa)
   ========================================================================= */
export function assignGems(supply, shapes, left, price, allowed, wantX = true) {
  const full = mcmf(left, supply, shapes, price, allowed, wantX)

  // Cabe tudo: acabou. A prioridade não tem nada a decidir aqui — e é por isso
  // que reordenar a lista não muda a build quando ela é viável.
  if (full.flow === sum(left)) return { placed: left.slice(), cost: full.cost, x: full.x }

  /* Não cabe: leximax por prioridade. Cada affix leva o máximo que ainda
     permite os de cima ficarem no que já conseguiram. Busca binária no
     quanto: o teste é monotônico (se x cabe, x−1 também). */
  const fixed = new Array(left.length).fill(0)
  const dem = new Array(left.length).fill(0)
  const cabe = (a, x) => {
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
