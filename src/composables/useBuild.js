import { computed, reactive, ref, watch } from 'vue'
import { GAME } from '../data/game.js'
import { affix, affixThreshold, byId, clampTarget, resolveWine, wineCapPerAffix, wineLeft } from '../utils/game.js'
import { solve } from '../utils/solver.js'
import { useToast } from './useToast.js'

/* =========================================================================
   STATE — singleton de módulo (a app é uma tela só, não precisa de Pinia).
   `picks` preserva a ORDEM = prioridade de alocação.
   ========================================================================= */
/* Só entra aqui o que o JOGADOR decide. Quais peças comprar e quais presets
   caçar NÃO são input: são a resposta do solver sobre o catálogo real da AH. */
const state = reactive({
  cls: GAME.classes[0].id,
  picks: [], // [{ id, lvl }] — a ordem é a prioridade de alocação
  // A bebida é um ORÇAMENTO de pontos do tier distribuído entre os affixes:
  // { tier, points: { affixId: nº de ranks } }. Ver GAME.wineTiers.
  wine: { tier: 'none', points: {} },
  mode: 'full', // "full" = build completa (8 slots) | "min" = só cobrir affixes
})

const catFilter = ref('all') // filtro do dropdown de adição

/** O plano recalcula sozinho a cada mudança de state — era o antigo renderResult(). */
const plan = computed(() => solve(state))

/* =========================================================================
   PERSISTÊNCIA — estado no hash da URL (base64 JSON), merge defensivo.
   ========================================================================= */
function encodeState() {
  const compact = {
    c: state.cls,
    p: state.picks.map((p) => [p.id, p.lvl]),
    w: [state.wine.tier, { ...state.wine.points }],
    m: state.mode,
  }
  return btoa(unescape(encodeURIComponent(JSON.stringify(compact))))
}

function loadFromHash() {
  const h = location.hash.replace(/^#/, '')
  if (!h) return
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(h))))
    // merge defensivo: ignora o que sumiu entre patches
    if (o.c && byId(GAME.classes, o.c)) state.cls = o.c
    if (Array.isArray(o.p)) {
      state.picks = o.p
        .filter(([id]) => !!affix(id))
        .map(([id, lvl]) => ({ id, lvl: clampTarget(lvl) }))
    }
    if (Array.isArray(o.w)) {
      const [tier, rest, a2] = o.w
      // a bebida não se restringe aos affixes escolhidos: basta o affix existir
      const known = (id) => !!affix(id)
      if (typeof rest === 'object' && rest !== null) {
        // formato atual: [tier, { affixId: pontos }]
        state.wine.tier = byId(GAME.wineTiers, tier) ? tier : 'none'
        state.wine.points = {}
        for (const [id, n] of Object.entries(rest)) {
          if (known(id) && n > 0) state.wine.points[id] = Math.floor(n)
        }
      } else {
        /* LINK ANTIGO: [tier 'r1'..'r4', a1, a2], onde o tier era "+N ranks" em
           dois slots fixos. Esse eixo não existe mais (o tier é quantidade, não
           magnitude), então preserva-se a INTENÇÃO — quais affixes bebiam — com
           1 ponto cada, e escolhe-se o menor tier que pague a conta. */
        const wanted = [rest, a2].filter((id) => id && known(id))
        if (tier && tier !== 'none' && wanted.length) {
          const t = GAME.wineTiers.find((x) => x.points >= wanted.length)
          state.wine.tier = t ? t.id : 'none'
          state.wine.points = Object.fromEntries(wanted.map((id) => [id, 1]))
        }
      }
      clampWine()
    }
    if (o.m === 'full' || o.m === 'min') state.mode = o.m
    // `pr`/`pp` de links antigos (presets manuais, prêmio) são ignorados de
    // propósito: presets deixaram de ser input — o solver os escolhe.
  } catch (_) {
    /* hash inválido: ignora */
  }
}

function syncHash() {
  history.replaceState(null, '', '#' + encodeState())
}

// hidrata antes do primeiro render
loadFromHash()

let syncing = false
/** Liga a persistência automática; chamado uma vez no onMounted do App. */
function startHashSync() {
  if (syncing) return
  syncing = true
  watch(state, syncHash, { deep: true })
  window.addEventListener('hashchange', () => {
    // permite navegar por links colados sem reload
    if (location.hash !== '#' + encodeState()) loadFromHash()
  })
}

/* =========================================================================
   AÇÕES
   ========================================================================= */
function addAffix(id) {
  if (!id || state.picks.some((p) => p.id === id)) return
  // Mira o threshold DESTE affix (7 para a maioria, 5 para um grupo) — é o
  // nível que abre o efeito secundário, ou seja, o que a build quer de verdade.
  // Affix sem efeito secundário não tem alvo óbvio: usa o padrão.
  state.picks.push({ id, lvl: affixThreshold(id) ?? GAME.thresholdLevel })
}

function removeAffix(id) {
  state.picks = state.picks.filter((p) => p.id !== id)
  if (state.wine.points) delete state.wine.points[id] // devolve ao orçamento da bebida
}

/* ---------- Victory Wine ----------
   O tier é um orçamento de pontos; cada ponto vale +1 rank num affix. */

function setWineTier(tier) {
  state.wine.tier = byId(GAME.wineTiers, tier) ? tier : 'none'
  clampWine()
}

/* Aparo o que não cabe mais (tier menor, stacking desligado, orçamento estourado)
   reaproveitando a MESMA normalização que o solver usa — assim o que está no
   state é exatamente o que entra na conta, sem uma segunda regra para divergir. */
function clampWine() {
  state.wine.points = resolveWine(state.wine, state.picks)
}

function setWinePoints(affixId, n) {
  const cap = wineCapPerAffix(state.wine)
  const cur = state.wine.points[affixId] || 0
  // só pode subir até onde o orçamento alcança
  const want = Math.max(0, Math.min(Math.floor(n) || 0, cap, cur + wineLeft(state.wine, state.picks)))
  if (want > 0) state.wine.points[affixId] = want
  else delete state.wine.points[affixId]
}

const addWinePoint = (affixId) => setWinePoints(affixId, (state.wine.points[affixId] || 0) + 1)
const removeWinePoint = (affixId) => setWinePoints(affixId, (state.wine.points[affixId] || 0) - 1)

function setLevel(pick, value) {
  pick.lvl = clampTarget(value)
}

/** Mira um affix no nível N. Se ele estava na lista só pela bebida, vira pedido
    de verdade da build — é o que clicar num pip de uma linha "só bebida" faz. */
function setTarget(affixId, lvl) {
  let p = state.picks.find((x) => x.id === affixId)
  if (!p) {
    addAffix(affixId)
    p = state.picks.find((x) => x.id === affixId)
  }
  if (p) p.lvl = clampTarget(lvl)
}

/** Reordena a prioridade: a ORDEM de `picks` é a ordem de alocação das gemas,
    então arrastar uma linha para cima é dizer "atenda este primeiro". */
function movePick(from, to) {
  const n = state.picks.length
  if (from === to || from < 0 || to < 0 || from >= n || to >= n) return
  const list = state.picks.slice()
  const [moved] = list.splice(from, 1)
  list.splice(to, 0, moved)
  state.picks = list
}

function reset() {
  state.cls = GAME.classes[0].id
  state.picks = []
  state.wine = { tier: 'none', points: {} }
  state.mode = 'full'
  catFilter.value = 'all'
}

/* ---------- share ---------- */
function share() {
  const { showToast } = useToast()
  syncHash() // garante o hash atual antes de copiar
  const url = location.href
  const done = () => showToast('🔗 Link copiado!')
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done, showToast))
  } else {
    fallbackCopy(url, done, showToast)
  }
}

function fallbackCopy(text, cb, showToast) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
    cb()
  } catch (_) {
    showToast('Copie o link da barra de endereços.')
  }
  document.body.removeChild(ta)
}

export function useBuild() {
  return {
    state,
    catFilter,
    plan,
    startHashSync,
    addAffix,
    removeAffix,
    setLevel,
    setTarget,
    movePick,
    setWineTier,
    setWinePoints,
    addWinePoint,
    removeWinePoint,
    reset,
    share,
  }
}
