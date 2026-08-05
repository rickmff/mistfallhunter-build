import { GAME } from '../data/game.js'
import { affix, gemFor, presetPremiumFor, wineTier, clampTarget } from './game.js'

/* =========================================================================
   SOLVE — objetivo: MENOR CUSTO TOTAL (peças + prêmio de preset + gemas).
   O usuário declara os affixes que quer; o solver escolhe o conjunto de peças
   (slots) mais barato que cubra a demanda e aloca as gems.

   PRESET — uma peça pode vir com 1 affix de fábrica (ver GAME.slots). Ele
   ocupa 1 dos slots da peça, então NÃO é socket extra: troca 1 socket por
   +1 rank. Como a gema também vale +1 (maxGemLevel), a troca é neutra em
   socket — o preset dispensa exatamente 1 gema.

   Mas a peça presetada não sai de graça na Auction House: ela custa um PRÊMIO
   sobre a peça crua (GAME.presetPremium). O ganho real é a diferença:

        ganho líquido = preço da gema dispensada − prêmio pago pela peça

   ...que pode ser NEGATIVO. Preset de gema barata numa peça cara é prejuízo.
   Além disso o preset só rende se o affix estiver na build e com rank em
   aberto; senão queima o socket E o prêmio. É esse veredito que a UI mostra.

   Por isso a busca do subconjunto pontua CUSTO TOTAL, não só o gear: presets
   diferentes mudam o preço das peças E quantas gemas sobram pra comprar.
   São 2^8 = 256 combinações — busca exaustiva, trivial.

   Função pura: recebe o state e devolve o plano — nada aqui toca no DOM.
   ========================================================================= */
export function solve(state) {
  const MGL = Math.max(1, GAME.maxGemLevel)
  const wanted = new Set(state.picks.map((p) => p.id))
  const prem = state.premium != null ? state.premium : null // palpite global da UI

  // --- 1. demanda por affix (antes dos presets) ---
  const results = state.picks.map((p, idx) => {
    const a = affix(p.id)
    const target = clampTarget(p.lvl)
    const wineBonus = wineBonusFor(state, p.id)
    const avail = Math.max(0, target - wineBonus) // pontos que a wine não cobre
    return {
      id: p.id,
      name: a ? a.name : p.id,
      cat: a ? a.cat : 'utility',
      priority: idx + 1,
      target,
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

  // --- 2. peças candidatas ---
  const slots = GAME.slots.map((sl) => {
    const preset = state.presets[sl.id] || sl.preset || null // escolhido pelo usuário
    return {
      id: sl.id,
      name: sl.name,
      sockets: sl.sockets,
      preset,
      gemSockets: sl.sockets - (preset ? 1 : 0), // preset ocupa um slot da peça
      mid: sl.market ? sl.market.mid : null,
      vog: sl.market ? sl.market.vog : null,
      lo: sl.market ? sl.market.lo : null,
      hi: sl.market ? sl.market.hi : null,
    }
  })
  const totalSocketsAll = slots.reduce((s, sl) => s + sl.gemSockets, 0)
  const n = slots.length
  const mkPieces = (mask) => slots.filter((_, i) => mask & (1 << i)).map((sl) => ({ ...sl, free: sl.gemSockets, gems: [] }))

  // --- 3. escolher as peças ---
  let chosen
  if (state.mode === 'full') {
    // BUILD COMPLETA: compra a peça mais barata de CADA um dos 8 slots.
    chosen = mkPieces((1 << n) - 1)
  } else {
    // MÍNIMO: subconjunto de menor custo TOTAL (gear + prêmio + gemas que faltam).
    let best = null
    for (let mask = 0; mask < 1 << n; mask++) {
      const cand = mkPieces(mask)
      const ev = score(cand, results, wanted, MGL, prem)
      if (!ev.feasible) continue
      if (!best || cheaperPlan(ev, best.ev)) best = { mask, ev }
    }
    // nenhum subconjunto cobre a demanda → mostra o melhor esforço (gear inteiro),
    // senão a lista de compras sairia vazia junto com o aviso de inviável.
    chosen = mkPieces(best ? best.mask : state.picks.length ? (1 << n) - 1 : 0)
  }
  // ordena por preço: baratas primeiro (recebem as gems), sem-preço ao fim
  chosen.sort((a, b) => (a.mid == null) - (b.mid == null) || (a.mid || 0) - (b.mid || 0))

  // --- 4. presets das peças compradas: +1 rank pago no prêmio, ou socket queimado ---
  const open = applyPresets(chosen, results, wanted, prem)
  for (const r of results) {
    r.presetPts = r.avail - open[r.id]
    r.demand = open[r.id] // resto vem de gemas
    r.socketsNeeded = Math.ceil(r.demand / MGL)
  }

  // --- 5. alocar gems (por prioridade do affix) nas peças mais baratas ---
  let ptr = 0
  for (const r of results) {
    let need = r.socketsNeeded
    let rem = r.demand
    while (need > 0 && ptr < chosen.length) {
      const sl = chosen[ptr]
      if (sl.free <= 0) {
        ptr++
        continue
      }
      const lvlHere = Math.min(MGL, rem)
      sl.gems.push({ affix: r.id, cat: r.cat, level: lvlHere })
      sl.free--
      r.socketsUsed++
      r.gemLevels += lvlHere
      rem -= lvlHere
      need--
    }
    r.achieved = r.gemLevels + r.wineBonus + r.presetPts
    r.short = Math.max(0, r.target - r.achieved)
    r.reached = r.achieved >= GAME.thresholdLevel
  }

  // custo = TODAS as peças compradas (no modo full, os 8 slots)
  const boughtPieces = chosen
  const usedPieces = chosen.filter((c) => c.gems.length > 0)
  // preço da peça CRUA vs prêmio pago pelo preset — separados porque a UI
  // precisa mostrar de onde vem o gold, e o prêmio pode ser desconhecido.
  const baseCost = boughtPieces.reduce((s, c) => s + (c.mid || 0), 0)
  const premiumCost = boughtPieces.reduce((s, c) => s + (c.premium || 0), 0)
  const premiumUnknown = boughtPieces.filter((c) => c.preset && c.premium == null).length
  const knownCost = baseCost + premiumCost
  const costLo = boughtPieces.reduce((s, c) => s + (c.lo || 0) + (c.premium || 0), 0)
  const costHi = boughtPieces.reduce((s, c) => s + (c.hi || 0) + (c.premium || 0), 0)
  const vogSum = boughtPieces.reduce((s, c) => s + (c.vog || 0), 0)
  const unpricedUsed = boughtPieces.filter((c) => c.mid == null).length
  const distinctActive = state.picks.length

  // --- 6. custo de GEMAS: cada affix precisa de `demand` gemas (+1 cada) ---
  // (pontos de preset já foram descontados de r.demand acima)
  let gemsCost = 0
  let gemUnknown = 0
  let gemCount = 0
  for (const r of results) {
    const g = gemFor(r.id)
    r.gemPts = r.demand // nº de gemas para este affix
    r.gemName = g ? g.name : null
    r.gemMat = g ? g.mat : null
    r.gemUnit = g ? g.price : null
    r.gemSub = g && r.gemPts ? g.price * r.gemPts : 0
    gemCount += r.gemPts
    if (r.gemPts > 0 && !g) gemUnknown++
    else gemsCost += r.gemSub
  }
  const grandTotal = knownCost + gemsCost // peças + gemas (com preço)

  // presets efetivamente usados (para exibição)
  const presetUsed = results.reduce((s, r) => s + r.presetPts, 0)
  const gemDemand = results.reduce((s, r) => s + r.socketsNeeded, 0) // sockets de gema (pós-preset)

  // --- 7. veredito dos presets ---
  // `presetSavings` é LÍQUIDO (gema dispensada − prêmio pago) e pode ser
  // negativo; `presetGross` é o bruto, pra UI mostrar de onde saiu a conta.
  const presetPieces = boughtPieces.filter((c) => c.preset)
  const presetSavings = presetPieces.reduce((s, c) => s + (c.presetSaving || 0), 0)
  const presetGross = presetPieces.reduce((s, c) => s + (c.presetGross || 0), 0)
  const presetSavingUnknown = presetPieces.filter((c) => c.presetUseful && c.presetSaving == null).length
  const presetWasted = presetPieces.filter((c) => !c.presetUseful).length
  // prêmio jogado fora: preset que não rende rank nenhum mas foi pago
  const presetWastedGold = presetPieces.filter((c) => !c.presetUseful).reduce((s, c) => s + (c.premium || 0), 0)
  const presetLosing = presetPieces.filter((c) => c.presetUseful && c.presetSaving != null && c.presetSaving <= 0).length
  const presetSlotsFree = boughtPieces.filter((c) => !c.preset).length

  // ranking de caça: que preset ainda compensa procurar na Auction House.
  // `unit` = preço da gema = TETO do prêmio (break-even: acima disso a peça
  // crua + gema sai mais barata). `net` = ganho real com o prêmio assumido.
  // Ordena pelo ganho líquido; sem preço de gema vai pro fim.
  const presetHunt = results
    .map((r) => {
      const g = gemFor(r.id)
      const premium = presetPremiumFor(null, r.id, prem)
      const net = g && premium != null ? g.price - premium : null
      return {
        id: r.id,
        name: r.name,
        cat: r.cat,
        openPts: r.demand,
        unit: g ? g.price : null,
        premium,
        net,
        gemName: g ? g.name : null,
        potential: net != null ? net * r.demand : null,
      }
    })
    .filter((h) => h.openPts > 0)
    .sort(
      (a, b) =>
        (a.unit == null) - (b.unit == null) ||
        (b.net != null ? b.net : b.unit || 0) - (a.net != null ? a.net : a.unit || 0),
    )

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
    presetWasted,
    presetWastedGold,
    presetLosing,
    presetSlotsFree,
    presetHunt,
    feasibleSockets: gemDemand <= totalSocketsAll,
    feasible: results.every((r) => r.short === 0),
    knownCost,
    baseCost,
    premiumCost,
    premiumUnknown,
    costLo,
    costHi,
    vogSum,
    unpricedUsed,
    gemsCost,
    gemUnknown,
    gemCount,
    grandTotal,
    distinctActive,
    overCap: distinctActive > GAME.maxActiveAffixes,
    overCapBy: Math.max(0, distinctActive - GAME.maxActiveAffixes),
  }
}

/* =========================================================================
   PRESETS — atribuição peça a peça. Cada peça carrega no máximo 1 preset;
   ele só rende se o affix estiver na build E ainda tiver rank em aberto.
   Marca em cada peça o veredito (`presetUseful`, `presetSaving`, `presetWhy`)
   e devolve quantos pontos de cada affix sobraram para as gemas.
   ========================================================================= */
function applyPresets(pieces, results, wanted, premiumOverride) {
  const open = {}
  for (const r of results) open[r.id] = r.avail

  for (const c of pieces) {
    c.presetUseful = false
    c.presetGross = null // preço da gema que o preset dispensaria
    c.presetSaving = null // LÍQUIDO: bruto − prêmio (null = alguma ponta sem preço)
    c.premium = null // quanto a mais custa a peça por vir presetada
    c.presetWhy = c.preset ? 'ok' : null
    if (!c.preset) continue

    // O prêmio é pago ao COMPRAR a peça presetada — inclusive quando o preset
    // não rende nada. É o que torna "prefira a versão crua" um custo visível.
    c.premium = presetPremiumFor(c.id, c.preset, premiumOverride)

    if (!wanted.has(c.preset)) {
      c.presetWhy = 'unwanted' // affix que a build não pede
      continue
    }
    if (open[c.preset] <= 0) {
      c.presetWhy = 'covered' // alvo já fechado pela wine/outro preset
      continue
    }
    open[c.preset]--
    c.presetUseful = true
    const g = gemFor(c.preset)
    c.presetGross = g ? g.price : null
    c.presetSaving = g && c.premium != null ? g.price - c.premium : null
  }
  return open
}

/** Custo total de um subconjunto de peças: gear + prêmio de preset + gemas. */
function score(pieces, results, wanted, MGL, premiumOverride) {
  const open = applyPresets(pieces, results, wanted, premiumOverride)

  let socketsNeeded = 0
  let gemCost = 0
  for (const r of results) {
    const rem = open[r.id]
    socketsNeeded += Math.ceil(rem / MGL)
    const g = gemFor(r.id)
    if (g) gemCost += g.price * rem
  }
  const supply = pieces.reduce((s, c) => s + c.gemSockets, 0)
  const pieceCost = pieces.reduce((s, c) => s + (c.mid || 0) + (c.premium || 0), 0)

  return {
    feasible: socketsNeeded <= supply,
    cost: pieceCost + gemCost,
    unpriced: pieces.filter((c) => c.mid == null).length,
    pieces: pieces.length,
    waste: supply - socketsNeeded,
  }
}

// Menor custo, lexicográfico: menos peças sem preço → menor gold (peças+gemas)
// → menos peças → menos sockets desperdiçados.
function cheaperPlan(a, b) {
  if (a.unpriced !== b.unpriced) return a.unpriced < b.unpriced
  if (a.cost !== b.cost) return a.cost < b.cost
  if (a.pieces !== b.pieces) return a.pieces < b.pieces
  return a.waste < b.waste
}

/* =========================================================================
   PRESETS ÓTIMOS — que affix vale a pena vir presetado em cada peça.
   Cada peça carrega no máximo 1 preset (= 1 socket) e todo preset rende
   exatamente +1 rank, então a escolha é só de VALOR: gasta-se o mesmo socket
   para poupar uma gema barata ou uma cara — MENOS o prêmio que a peça
   presetada cobra na AH. Guloso pelo preço da gema (decrescente) continua
   ótimo, mas agora com um corte: preset cujo prêmio come a gema inteira
   (líquido ≤ 0) não entra — melhor comprar a peça crua e a gema.

   Slots mais baratos recebem primeiro porque são os que o modo "mínimo" tende
   a comprar; se um preset cair numa peça que não compensa comprar, o solve()
   simplesmente não a compra.
   ========================================================================= */
export function optimalPresets(state) {
  const prem = state.premium != null ? state.premium : null
  const wants = []
  for (const p of state.picks) {
    const openPts = Math.max(0, clampTarget(p.lvl) - wineBonusFor(state, p.id))
    const g = gemFor(p.id)
    for (let i = 0; i < openPts; i++) wants.push({ id: p.id, price: g ? g.price : null })
  }
  // gema mais cara primeiro; sem preço no fim (poupa uma gema real, mas não dá
  // pra provar quanto — então só entra se sobrar peça).
  wants.sort((a, b) => (a.price == null) - (b.price == null) || (b.price || 0) - (a.price || 0))

  const slots = [...GAME.slots].sort(
    (a, b) => (a.market ? a.market.mid : Infinity) - (b.market ? b.market.mid : Infinity),
  )

  const out = {}
  let si = 0
  for (const w of wants) {
    if (si >= slots.length) break
    const sl = slots[si]
    const premium = presetPremiumFor(sl.id, w.id, prem)
    // Gema ou prêmio sem preço → mantém: poupa uma gema real, valor incerto.
    // Com os dois preços, só entra se sobrar lucro depois do prêmio.
    if (w.price != null && premium != null && w.price - premium <= 0) continue
    out[sl.id] = w.id
    si++
  }
  return out
}

/** Bônus de rank que a Victory Wine dá a um affix (pode dobrar no mesmo). */
export function wineBonusFor(state, affixId) {
  const t = wineTier(state.wine.tier)
  if (!t || t.bonus === 0) return 0
  let b = 0
  if (state.wine.a1 === affixId) b += t.bonus
  if (state.wine.a2 === affixId) b += t.bonus // permite dobrar num único affix, se quiser
  return b
}
