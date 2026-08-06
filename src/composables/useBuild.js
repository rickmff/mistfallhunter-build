import { computed, reactive, ref, watch } from 'vue'
import { GAME } from '../data/game.js'
import { affix, byId, clampTarget, wineTier } from '../utils/game.js'
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
  wine: { tier: 'none', a1: '', a2: '' },
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
    w: [state.wine.tier, state.wine.a1, state.wine.a2],
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
      const [tier, a1, a2] = o.w
      state.wine.tier = wineTier(tier) ? tier : 'none'
      state.wine.a1 = state.picks.some((p) => p.id === a1) ? a1 : ''
      state.wine.a2 = state.picks.some((p) => p.id === a2) ? a2 : ''
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
  state.picks.push({ id, lvl: GAME.thresholdLevel }) // default: mirar o threshold
}

function removeAffix(id) {
  state.picks = state.picks.filter((p) => p.id !== id)
  if (state.wine.a1 === id) state.wine.a1 = ''
  if (state.wine.a2 === id) state.wine.a2 = ''
}

function setLevel(pick, value) {
  pick.lvl = clampTarget(value)
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
  state.wine = { tier: 'none', a1: '', a2: '' }
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
    movePick,
    reset,
    share,
  }
}
