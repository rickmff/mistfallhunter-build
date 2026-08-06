import { GAME } from '../data/game.js'
import { canPreset } from '../data/pools.js'
import { affix, affixThreshold, gemFor, gemForShape, resolveWine, wineOnlyIds, clampTarget } from './game.js'
import { SHAPES, gemFitsSocket, gemShapes, sanitizeShapes } from './shapes.js'
import { assignGems } from './assign.js'

/* =========================================================================
   SOLVE — UM ÚNICO FLUXO: dados os affixes que o jogador quer, devolve o
   conjunto MAIS BARATO de listagens REAIS da Auction House que os entrega.
   Não há "modo manual" nem botão de otimizar: o plano já sai ótimo.

   O QUE MUDA EM RELAÇÃO AO MODELO ANTIGO
   O jogo não vende "uma peça do slot X com o preset que você escolher". Cada
   slot tem um catálogo finito de listagens concretas (GAME.slots[].listings),
   cada uma com preço próprio e uma de duas formas:
       [ preset | socket ]  → +1 rank grátis daquele affix + 1 socket de gema
       [ socket   socket ]  → peça crua, 2 sockets de gema
   Logo o "prêmio de preset" não é premissa nenhuma: é a diferença de preço
   entre duas listagens que existem de verdade.

   A CONTA
   Toda peça entrega 2 ranks de capacidade — seja 2 gemas, seja 1 preset +
   1 gema. Então comprar P peças dá 2·P ranks, e a viabilidade só depende de
   P ≥ ⌈R/2⌉ (R = ranks pedidos após a Wine). O que o preset muda é o CUSTO:
   ele troca uma gema paga por um pedaço do preço da peça.

        custo total = Σ preço das listagens
                    + Σ preço da gema × (ranks que sobraram para gemas)

   BUSCA — exata, não gulosa. Programação dinâmica sobre (peças compradas,
   presets já usados por affix); o teto de presets por affix é a própria
   demanda, então o espaço de estados é minúsculo (≤ 8 peças, ≤ 5 affixes).
   Guloso erraria: a listagem presetada mais barata de um slot pode valer
   menos que a de outro slot, e cada affix só aproveita `demand` presets.

   Função pura: recebe o state e devolve o plano — nada aqui toca no DOM.
   ========================================================================= */
export function solve(state) {
  const MGL = Math.max(1, GAME.maxGemLevel)

  // --- 1. demanda por affix (depois da Victory Wine) ---
  // Os pontos da bebida saem normalizados de uma vez: o tier é um ORÇAMENTO de
  // ranks distribuído entre os affixes, não um bônus fixo por slot.
  const wineBy = resolveWine(state.wine, state.picks)

  /* A bebida pode alimentar um affix que a build NÃO pediu. Ele entra na lista
     no fim (não disputa gema com ninguém: alvo = o que a própria bebida dá,
     logo demanda zero de gear) e ainda assim pode bater o threshold sozinho —
     um affix de threshold 5 fecha com 5 pontos de Gods Brew, sem socket. */
  const entries = [
    ...state.picks.map((p) => ({ id: p.id, lvl: p.lvl, wineOnly: false })),
    ...wineOnlyIds(state.wine, state.picks).map((id) => ({ id, lvl: wineBy[id], wineOnly: true })),
  ]

  const results = entries.map((p, idx) => {
    const a = affix(p.id)
    const target = clampTarget(p.lvl)
    const wineBonus = wineBy[p.id] || 0
    const avail = Math.max(0, target - wineBonus) // ranks que a wine não cobre
    return {
      id: p.id,
      name: a ? a.name : p.id,
      cat: a ? a.cat : 'utility',
      priority: idx + 1,
      wineOnly: p.wineOnly, // está na lista só porque a bebida o alimenta
      target,
      threshold: affixThreshold(p.id), // null = affix sem efeito secundário
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
    }
  })

  // --- 2. escolher as listagens (busca exata) ---
  const pick = choosePieces(results, state.mode)
  const chosen = pick.pieces
  // baratas primeiro: são as que recebem as gemas na ordem de prioridade
  chosen.sort((a, b) => a.price - b.price)

  // --- 3. creditar os presets das peças escolhidas ---
  for (const c of chosen) {
    c.presetUseful = false
    c.presetGross = null
    c.presetSaving = null
  }
  for (const r of results) {
    r.presetPts = chosen.filter((c) => c.preset === r.id).length
    r.demand = Math.max(0, r.avail - r.presetPts) // resto vem de gemas
    r.socketsNeeded = Math.ceil(r.demand / MGL)
  }
  for (const c of chosen) {
    if (!c.preset) continue
    const g = gemFor(c.preset)
    c.presetUseful = true // a busca só escolhe preset que rende rank
    c.presetGross = g ? g.price : null
    c.presetSaving = g ? g.price - c.premium : null
  }

  // --- 4. alocar as gemas (por prioridade do affix) nas peças mais baratas ---
  // Cada gema só entra em socket de FORMATO compatível (ver utils/shapes.js);
  // socket de formato não amostrado fica de fora em vez de virar curinga.
  // Cada gema guarda o índice do socket que ocupou, então a tela mostra a gema
  // no socket certo, e não "na ordem".
  for (const c of chosen) {
    c.openSockets = Array.from({ length: c.gemSockets }, (_, i) => ({
      i,
      shape: (c.shapes || [])[i] || null,
      used: false,
    }))
  }

  /* Quantas gemas de cada affix em cada formato — mesma conta exata que a
     busca usou para escolher as peças, então tela e decisão não divergem. */
  const allShapes = chosen.flatMap((c) => c.openSockets.map((s) => s.shape))
  const supply = SHAPE_IDS.map((s) => allShapes.filter((x) => x === s).length)
  const fit = simulateAllocation(supply, results, results.map((r) => r.demand))

  results.forEach((r, ai) => {
    let rem = r.demand
    // percorre os formatos na ordem que o encaixe definiu e ocupa sockets reais
    SHAPE_IDS.forEach((shape, si) => {
      let qty = fit.x[ai][si]
      while (qty > 0) {
        const target = chosen.flatMap((sl) => sl.openSockets.map((s) => ({ sl, s }))).find(
          ({ s }) => !s.used && s.shape === shape,
        )
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
    // POR QUE sobrou demanda — a resposta muda o que o jogador faz:
    //   'unknown'  sobrou socket, mas o formato dele não foi amostrado
    //   'shape'    sobrou socket de formato conhecido que não aceita esta gema
    //   'capacity' não sobrou socket nenhum
    r.blockedBy = null
    if (rem > 0) {
      const idle = chosen.flatMap((sl) => sl.openSockets.filter((s) => !s.used))
      r.blockedBy = !idle.length ? 'capacity' : idle.some((s) => !s.shape) ? 'unknown' : 'shape'
    }
    r.shapeBlocked = r.blockedBy === 'shape' || r.blockedBy === 'unknown'
    r.achieved = r.gemLevels + r.wineBonus + r.presetPts
    r.short = Math.max(0, r.target - r.achieved)
    // threshold é por affix (7 para a maioria, 5 para um grupo); `null` = o
    // affix não tem efeito secundário, então não existe threshold a bater.
    r.reached = r.threshold != null && r.achieved >= r.threshold
  })

  // --- 5. custos ---
  const boughtPieces = chosen
  const usedPieces = chosen.filter((c) => c.gems.length > 0)
  const baseCost = boughtPieces.reduce((s, c) => s + c.rawPrice, 0)
  const premiumCost = boughtPieces.reduce((s, c) => s + c.premium, 0)
  // o que se pagou a mais por comprar a listagem com o FORMATO certo de socket
  const shapeExtraCost = boughtPieces.reduce((s, c) => s + (c.shapeExtra || 0), 0)
  const knownCost = boughtPieces.reduce((s, c) => s + c.price, 0)
  const totalSocketsAll = GAME.slots.reduce((s, sl) => s + sl.sockets, 0)

  /* Cada affix tem uma gema POR FORMATO, com preços bem diferentes — então a
     conta não é "preço × quantidade": é a soma das gemas que realmente foram
     encaixadas, cada uma no preço do formato do socket em que entrou.
     `r.gemBuys` = lista de compras do affix, agrupada por gema. */
  let gemsCost = 0
  let gemUnknown = 0
  let gemCount = 0
  const placedByAffix = {}
  for (const c of boughtPieces) {
    for (const gem of c.gems) {
      const shape = (c.shapes || [])[gem.socket] || null
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
    const buys = [...(placedByAffix[r.id] || new Map()).values()]
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
    // conta o que se compra de verdade (o que coube), não o que se queria
    gemCount += r.gemBuys.reduce((s, b) => s + b.qty, 0)
    if (r.gemPts > 0 && !cheapest) gemUnknown++
    gemsCost += r.gemSub
  }
  const grandTotal = knownCost + gemsCost

  const presetUsed = results.reduce((s, r) => s + r.presetPts, 0)
  const gemDemand = results.reduce((s, r) => s + r.socketsNeeded, 0)

  // --- 6. leitura dos presets ---
  const presetPieces = boughtPieces.filter((c) => c.preset)
  const presetSavings = presetPieces.reduce((s, c) => s + (c.presetSaving || 0), 0)
  const presetGross = presetPieces.reduce((s, c) => s + (c.presetGross || 0), 0)
  const presetSavingUnknown = presetPieces.filter((c) => c.presetGross == null).length
  const presetSlotsFree = boughtPieces.filter((c) => !c.preset).length

  // Quanto do catálogo ainda não dá pra usar por falta de identificação do
  // ícone. É o gargalo do app: peça com preset '?' nunca entra num plano.
  const unidentified = GAME.slots.reduce((s, sl) => s + sl.listings.filter((L) => L.preset === '?').length, 0)
  const catalogSize = GAME.slots.reduce((s, sl) => s + sl.listings.length, 0)
  // peças presetadas que o plano assume existir na AH (não estão amostradas):
  // é o que o jogador vai procurar com o filtro "Affix Effects"
  const toHunt = boughtPieces.filter((c) => c.hypothetical)

  // Caça na AH: por affix ainda em aberto, quanto vale um preset dele e até
  // quanto pagar numa peça presetada, slot a slot (crua daquele slot + gema).
  const presetHunt = results
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
        // só os slots em que o jogo GERA esse preset (Valor não sai em arma)
        ceilings: g
          ? GAME.slots
              .filter((sl) => canPreset(sl.id, r.id))
              .map((sl) => ({ slot: sl.id, name: sl.name, max: cheapestRaw(sl).price + g.price }))
              .sort((a, b) => a.max - b.max)
          : [],
      }
    })
    .filter((h) => h.openPts > 0)
    .sort((a, b) => (a.unit == null) - (b.unit == null) || (b.unit || 0) - (a.unit || 0))

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
    // capacidade PURA (contagem): cabe o número de gemas, ignorando formato.
    // Se cabe aqui mas o plano ainda fica devendo, o culpado é o formato — e
    // esse caso tem aviso próprio, com outra ação para o jogador.
    feasibleSockets: gemDemand <= totalSocketsAll,
    feasible: results.every((r) => r.short === 0),
    // affixes que sobraram por FORMATO de socket, não por falta de socket
    shapeBlocked: results.filter((r) => r.shapeBlocked),
    // sockets comprados que o plano não pode usar porque o formato não foi
    // amostrado — capacidade parada, e a conta de quanto falta mapear
    unknownSockets: chosen.reduce((s, c) => s + c.openSockets.filter((k) => !k.used && !k.shape).length, 0),
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

/* Este slot pode vir de fábrica com este affix? Vale a regra do jogo por slot
   (data/pools.js) e, se o catálogo tiver amostrado a lista real de presets
   daquela BASE (`presetPool`), ela é a palavra final — o pool do banco é por
   slot, não por item, e um item específico pode rolar menos que o slot todo. */
const podeVir = (sl, affixId) =>
  canPreset(sl.id, affixId) && (!sl.presetPool || sl.presetPool.includes(affixId))

/* Listagem crua mais barata do slot — a referência de preço contra a qual todo
   preset é medido. Se o catálogo daquele slot não tiver nenhuma peça crua,
   cai na mais barata que houver (o prêmio vira 0: não há crua com que comparar). */
function cheapestRaw(sl) {
  const raws = sl.listings.filter((L) => !L.preset)
  return (raws.length ? raws : sl.listings).reduce((a, b) => (b.price < a.price ? b : a))
}

/* =========================================================================
   OPÇÕES DE UM SLOT — reduz as ~9 listagens ao que pode entrar num plano:
   a mais barata de cada COMBO DE FORMATOS entre as cruas, e a mais barata de
   cada (preset da build × formato do socket que sobra).

   O combo entra na chave porque a gema tem formato: duas cruas do mesmo slot
   com combos diferentes são ofertas diferentes, mesmo custando quase igual —
   a mais cara pode ser a única que aceita a gema que a build precisa. Ficar só
   com "a crua mais barata" era o que impedia a busca de montar a build.

   Listagem com preset FORA da build é estritamente pior que a crua — mesmos
   ranks úteis, um socket a menos — então nem é considerada.

   PRESET HIPOTÉTICO — o catálogo é uma AMOSTRA de ~9 listagens por slot, mas a
   Auction House tem centenas, e o jogador acha a presetada que quiser com o
   filtro "Affix Effects". Planejar só com as linhas amostradas fazia o app
   ignorar preset e comprar gema cara à toa — a build real do jogo sai bem mais
   barata justamente por usar peça presetada em quase todo slot. Então, para
   cada affix da build, entra também uma peça presetada AO PREÇO da presetada
   mais barata daquele slot naquele formato (as linhas '?' servem de cotação),
   marcada como `hypothetical` para a tela dizer que é para procurar.
   ========================================================================= */
function slotOptions(sl, wantedIds) {
  const raw = cheapestRaw(sl)
  const shapeKey = (L) => sanitizeShapes(sl.id, L.shapes).slice().sort().join('+')

  // cruas: a mais barata de cada combo de formatos
  const byCombo = new Map()
  for (const L of sl.listings) {
    if (L.preset) continue
    const k = shapeKey(L)
    const cur = byCombo.get(k)
    if (!cur || L.price < cur.price) byCombo.set(k, L)
  }

  // presetadas: a mais barata de cada (affix da build, formato do socket livre).
  // `canPreset` barra o que o jogo não gera naquele tipo de equipamento — sem
  // isso o plano manda comprar arma com preset de Valor, que é armor-only.
  const byAffix = new Map()
  for (const L of sl.listings) {
    if (!L.preset || L.preset === '?' || !wantedIds.has(L.preset)) continue
    if (!podeVir(sl, L.preset)) continue
    const k = L.preset + '|' + shapeKey(L)
    const cur = byAffix.get(k)
    if (!cur || L.price < cur.price) byAffix.set(k, L)
  }

  const mk = (L, preset) => ({
    id: sl.id,
    name: sl.name,
    base: sl.base,
    sockets: sl.sockets,
    preset,
    gemSockets: sl.sockets - (preset ? 1 : 0),
    price: L.price,
    qty: L.qty,
    // formatos já filtrados pela regra do slot (ver utils/shapes.js): leitura
    // que viola o jogo — círculo fora de joia — sai como "não amostrado"
    shapes: sanitizeShapes(sl.id, L.shapes),
    rawPrice: raw.price,
    // prêmio é o que a versão PRESETADA cobra a mais que a crua mais barata.
    // Numa crua o extra não é preset: é o combo de formatos (a crua barata do
    // slot pode não ter o socket que a build precisa) — conta separado.
    premium: preset ? L.price - raw.price : 0,
    shapeExtra: preset ? 0 : L.price - raw.price,
  })

  const out = [...byCombo.values()].map((L) => mk(L, null))
  for (const [k, L] of byAffix) out.push(mk(L, k.split('|')[0]))

  /* cotação de peça presetada por formato: a linha '?' mais barata daquele
     formato. Ela existe de verdade — só não se sabe QUAL affix ela traz, e é
     por isso que serve de preço para "a presetada que você vai procurar". */
  const quote = new Map()
  for (const L of sl.listings) {
    if (L.preset !== '?') continue
    const s = sanitizeShapes(sl.id, L.shapes)[0]
    if (!s) continue
    const cur = quote.get(s)
    if (!cur || L.price < cur.price) quote.set(s, L)
  }
  for (const aff of wantedIds) {
    if (!podeVir(sl, aff)) continue // o jogo não gera esse preset aqui
    for (const [s, L] of quote) {
      if (byAffix.has(aff + '|' + s)) continue // já existe listagem identificada
      out.push({ ...mk(L, aff), hypothetical: true })
    }
  }
  return out
}

/* =========================================================================
   ESCOLHA DAS PEÇAS — DP exata sobre (nº de peças, presets usados por affix,
   sockets dos formatos DISPUTADOS). Estado guarda o menor custo de GEAR; o
   custo das gemas é somado no fim, porque só depende de quantos presets cada
   affix acumulou.

   FORMATO NA BUSCA — a gema de um affix só entra no socket do formato dela
   (utils/shapes.js), então contar "2 sockets por peça" não basta: um plano
   pode ter socket sobrando e mesmo assim não caber a gema. O estado carrega,
   além do nº de peças, quantos sockets já se tem de cada formato EXIGIDO por
   algum affix restrito — só desses, e limitado à demanda, senão o espaço de
   estados explodiria à toa.
   ========================================================================= */
function choosePieces(results, mode) {
  const n = results.length
  const demand = results.map((r) => r.avail)
  const R = demand.reduce((a, b) => a + b, 0)
  const gemP = results.map((r) => {
    const g = gemFor(r.id)
    return g ? g.price : 0 // sem preço mapeado → preset não prova economia
  })
  const wantedIds = new Set(results.map((r) => r.id))
  const opts = GAME.slots.map((sl) => slotOptions(sl, wantedIds))
  // quantos ranks de cada affix podem vir de preset (ver GAME.maxPresetPerAffix)
  const presetCap = demand.map((d) => Math.min(d, GAME.maxPresetPerAffix ?? d))
  const allowSkip = mode !== 'full' // "build completa" compra 1 peça por slot

  /* Quanto de cada formato a build pode querer. Como quase todo affix tem gema
     em mais de um formato, não dá pra rastrear só os "exclusivos": o estado
     carrega a oferta dos QUATRO formatos, limitada ao que a build usaria. O
     teto segura o espaço de estados (a soma das ofertas nunca passa de 2 por
     peça, então na prática são poucos milhares de combinações). */
  const needByShape = {}
  results.forEach((r, a) => {
    const allowed = gemShapes(r.id) || Object.keys(SHAPES)
    for (const s of allowed) needByShape[s] = (needByShape[s] || 0) + demand[a]
  })
  // sempre os 4 formatos, na ordem de SHAPE_IDS: assim o `sup` do estado JÁ É a
  // oferta que a avaliação precisa, sem refazer o caminho. Formato que nenhum
  // affix usa tem teto 0 — socket dele não serve para nada mesmo.
  const tracked = SHAPE_IDS
  const cap = tracked.map((s) => Math.min(needByShape[s] || 0, 2 * GAME.slots.length))
  // pré-calcula a oferta de formatos de cada opção: no laço interno isso rodava
  // milhares de vezes por camada
  for (const list of opts) {
    for (const o of list) {
      o._sup = tracked.map((s) => o.shapes.filter((x) => x === s).length)
      o._ai = o.preset ? results.findIndex((r) => r.id === o.preset) : -1
    }
  }

  /* ESTADO EMPACOTADO EM INTEIROS. Com preset hipotético o nº de opções por
     slot multiplica, e o laço interno roda centenas de milhares de vezes —
     alocar dois arrays por transição (counts e sup) dominava o tempo. Agora
     counts cabe em 4 bits por affix e sup em 5 bits por formato, tudo em
     aritmética; só o estado vencedor é decodificado no fim. */
  const S = tracked.length
  const cnt = (counts, a) => (counts >> (4 * a)) & 15
  const supAt = (sup, s) => (sup >> (5 * s)) & 31
  // P fica FORA da chave: dois planos com a mesma oferta e os mesmos presets
  // são intercambiáveis, e o mais barato já é o que interessa. Tirar P daqui
  // corta o número de estados finais (e de avaliações) em quase uma ordem.
  const key = (P, counts, sup) => counts * 1048576 + sup

  let cur = new Map()
  // `prev`/`opt` formam a trilha encadeada: copiar o array do caminho a cada
  // transição custava mais que todo o resto do laço
  cur.set(key(0, 0, 0), { cost: 0, P: 0, counts: 0, sup: 0, prev: null, opt: null })

  for (let i = 0; i < GAME.slots.length; i++) {
    const next = new Map()
    const put = (k, v) => {
      const prev = next.get(k)
      if (!prev || v.cost < prev.cost) next.set(k, v)
    }
    for (const st of cur.values()) {
      if (allowSkip) put(key(st.P, st.counts, st.sup), { ...st, prev: st, opt: null })
      for (const o of opts[i]) {
        let counts = st.counts
        if (o.preset) {
          // teto duplo: o preset não rende além da demanda do affix, e o plano
          // não conta com mais peças do MESMO preset do que se acha na prática
          if (cnt(counts, o._ai) >= presetCap[o._ai]) continue
          counts += 1 << (4 * o._ai)
        }
        // teto na demanda: socket a mais daquele formato não muda a decisão
        let sup = 0
        for (let s = 0; s < S; s++) {
          sup |= Math.min(cap[s], supAt(st.sup, s) + o._sup[s]) << (5 * s)
        }
        const P = st.P + 1
        put(key(P, counts, sup), { cost: st.cost + o.price, P, counts, sup, prev: st, opt: o })
      }
    }
    cur = next
  }

  /* ---------- avaliação final: PRIORIDADE antes de preço ----------
     Escolher "o mais barato que cobre tudo" só funciona quando tudo cabe.
     Quando não cabe — demanda maior que os sockets, ou formato que não
     bate — quem fica sem TEM de ser o affix de menor prioridade, nunca o
     primeiro da lista. Por isso cada estado final é simulado com a mesma
     alocação da tela e comparado lexicograficamente: o que entrega mais ao
     affix #1 vence; empatou, olha o #2; e só no fim entra o custo. */
  /** Opções escolhidas, andando de trás pra frente na trilha encadeada. */
  const pathOf = (st) => {
    const out = []
    for (let s = st; s; s = s.prev) if (s.opt) out.push(s.opt)
    return out.reverse()
  }

  const memo = new Map()
  const evalState = (st) => {
    // a oferta de formatos já está no estado (`sup`), limitada ao que a build
    // consegue usar — não precisa refazer o caminho para contar socket
    const supply = new Array(S)
    for (let s = 0; s < S; s++) supply[s] = supAt(st.sup, s)
    const left = demand.map((d, a) => d - cnt(st.counts, a))
    const sim = simulateAllocation(supply, results, left, memo, st.counts * 1048576 + st.sup)
    const got = demand.map((_, a) => cnt(st.counts, a) + sim.placed[a])
    // custo real: gear + as gemas que cabem, cada uma no preço do seu formato
    const presets = demand.reduce((s, _, a) => s + cnt(st.counts, a), 0)
    return { got, cost: st.cost + sim.gemCost, presets, P: st.P }
  }

  /* PODA — avaliar todo estado final é caro (cada um resolve um fluxo). Dois
     limites baratos matam a maioria sem perder o ótimo:
       lb   custo mínimo possível: gear já gasto + a gema mais barata de cada
            rank que ainda falta. Nenhum plano daquele estado sai por menos.
       ub   entrega máxima possível: preset já garantido + todo socket que o
            affix consegue usar. Nenhum plano daquele estado entrega mais.
     Varrendo em ordem de `lb`, o primeiro avaliado já vira um incumbente forte;
     depois disso só sobra avaliar quem pode superá-lo em prioridade ou preço. */
  const minGem = results.map((r) => {
    const g = gemFor(r.id)
    return g ? g.price : 0
  })
  const usableBy = results.map((r) => {
    const allowed = gemShapes(r.id) || tracked
    return tracked.map((s) => (allowed.includes(s) ? 1 : 0))
  })
  const lowerBound = (st) => {
    let c = st.cost
    for (let a = 0; a < n; a++) c += (demand[a] - cnt(st.counts, a)) * minGem[a]
    return c
  }
  const upperGot = (st) =>
    demand.map((d, a) => {
      let room = 0
      for (let s = 0; s < S; s++) if (usableBy[a][s]) room += supAt(st.sup, s)
      return Math.min(d, cnt(st.counts, a) + room)
    })
  /** >0 se `a` entrega mais que `b` na ordem de prioridade; 0 se idêntico. */
  const lexCmp = (a, b) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]
    return 0
  }

  /* A varredura começa por quem PODE entregar mais (e, em empate, por quem tem
     o menor custo mínimo). Assim o incumbente já nasce perto do ótimo e as
     duas podas acima cortam quase tudo — é o que segura o tempo quando a build
     não cabe, caso em que a prioridade obriga a comparar entrega antes de preço. */
  const ranked = [...cur.values()].map((st) => {
    const ub = upperGot(st)
    let ubKey = 0
    for (let a = 0; a < n; a++) ubKey = ubKey * 16 + ub[a]
    return { st, ub, ubKey, lb: lowerBound(st) }
  })
  ranked.sort((x, y) => y.ubKey - x.ubKey || x.lb - y.lb)

  let best = null
  for (const { st, ub, lb } of ranked) {
    if (best) {
      const cmp = lexCmp(ub, best.ev.got)
      if (cmp < 0) continue // nem no melhor caso entrega tanto quanto o atual
      if (cmp === 0 && lb >= best.ev.cost) continue // empataria e não sai mais barato
    }
    const ev = evalState(st)
    if (!best || betterPlan(ev, best.ev)) best = { st, ev }
  }

  const pieces = pathOf(best.st).map((o) => ({ ...o, free: o.gemSockets, gems: [] }))
  return { pieces, feasible: best.ev.got.every((g, a) => g >= demand[a]) }
}

/* Lexicográfico na prioridade: entrega ao #1, depois ao #2… e só então custo.
   Como o encaixe é exato, builds viáveis empatam em `got` e a decisão cai no
   custo: reordenar a lista não muda a build que dá pra montar inteira. */
function betterPlan(a, b) {
  for (let i = 0; i < a.got.length; i++) {
    if (a.got[i] !== b.got[i]) return a.got[i] > b.got[i]
  }
  if (a.cost !== b.cost) return a.cost < b.cost
  // Empatou no preço: vence quem resolve mais ranks com PRESET. O rank de
  // fábrica já está pago no preço da peça — não vira uma gema a caçar na AH,
  // nem fica exposto à variação de preço dela. Só desempate: se o preset
  // custar mais que a gema que dispensa, ele perde na linha do custo acima.
  if (a.presets !== b.presets) return a.presets > b.presets
  return a.P < b.P
}

/** Preço da gema daquele affix no socket daquele formato (0 = sem preço). */
function gemPriceAt(affixId, shape) {
  const g = gemForShape(affixId, shape) || gemFor(affixId)
  return g ? g.price : 0
}

/* Quanto um conjunto de sockets entrega e quanto custa em gema. O encaixe é
   EXATO (utils/assign.js): se a demanda cabe, todos recebem o alvo e a ordem
   da lista não interfere — o que muda é só o preço, e ele é minimizado. Só
   quando não cabe é que a prioridade decide quem fica sem.

   Memo por (oferta de formatos × demanda): a busca avalia milhares de
   conjuntos, e a maioria repete exatamente o mesmo par. */
const SHAPE_IDS = Object.keys(SHAPES)

/** `supply` = nº de sockets por formato, na ordem de SHAPE_IDS. */
function simulateAllocation(supply, results, left, memo, key) {
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
    !memo, // a matriz affix×formato só é montada na alocação final (a da tela)
  )
  const res = { placed: out.placed, gemCost: out.cost, x: out.x }
  if (memo) memo.set(key, res)
  return res
}

/** Ranks que a Victory Wine soma num affix — ver resolveWine em utils/game.js. */
export function wineBonusFor(state, affixId) {
  return resolveWine(state.wine, state.picks)[affixId] || 0
}
