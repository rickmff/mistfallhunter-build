import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useToast } from '@/composables/useToast'
import { GAME } from '@/data/game'
import { decodeBuild, encodeBuild } from '@/stores/hash'
import {
  affixThreshold,
  byId,
  clampTarget,
  resolveWine,
  wineCapPerAffix,
  wineLeft,
} from '@/utils/game'
import { solve } from '@/utils/solver'
import type { BuildMode, BuildPick, BuildState, Plan, WineState, WineTierId } from '@/types'

function fallbackCopy(text: string, cb: () => void, showToast: (msg: string) => void) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
    cb()
  } catch {
    showToast('Copie o link da barra de endereços.')
  }
  document.body.removeChild(ta)
}

export const useBuildStore = defineStore('build', () => {
  const cls = ref<string>(GAME.classes[0].id)
  const picks = ref<BuildPick[]>([])
  const wine = ref<WineState>({ tier: 'none', points: {} })
  const mode = ref<BuildMode>('full')
  const catFilter = ref('all')

  const buildState = (): BuildState => ({
    cls: cls.value,
    picks: picks.value,
    wine: wine.value,
    mode: mode.value,
  })

  const plan = computed<Plan>(() => solve(buildState()))

  function clampWine() {
    wine.value.points = resolveWine(wine.value, picks.value)
  }

  function loadFromHash() {
    if (typeof location === 'undefined') return
    const h = location.hash.replace(/^#/, '')
    if (!h) return
    const patch = decodeBuild(h)
    if (!patch) return
    if (patch.cls) cls.value = patch.cls
    if (patch.picks) picks.value = patch.picks
    if (patch.wine) {
      wine.value = patch.wine
      clampWine()
    }
    if (patch.mode) mode.value = patch.mode
  }

  function syncHash() {
    history.replaceState(null, '', '#' + encodeBuild(buildState()))
  }

  let syncing = false
  function startHashSync() {
    if (syncing) return
    syncing = true
    watch([cls, picks, wine, mode], syncHash, { deep: true })
    window.addEventListener('hashchange', () => {
      if (location.hash !== '#' + encodeBuild(buildState())) loadFromHash()
    })
  }

  function addAffix(id: string) {
    if (!id || picks.value.some((p) => p.id === id)) return
    picks.value.push({ id, lvl: affixThreshold(id) ?? GAME.thresholdLevel })
  }

  function removeAffix(id: string) {
    picks.value = picks.value.filter((p) => p.id !== id)
    delete wine.value.points[id]
  }

  function setWineTier(tier: string) {
    wine.value.tier = byId(GAME.wineTiers, tier) ? (tier as WineTierId) : 'none'
    clampWine()
  }

  function setWinePoints(affixId: string, n: number) {
    const cap = wineCapPerAffix(wine.value)
    const cur = wine.value.points[affixId] || 0
    const want = Math.max(
      0,
      Math.min(Math.floor(n) || 0, cap, cur + wineLeft(wine.value, picks.value)),
    )
    if (want > 0) wine.value.points[affixId] = want
    else delete wine.value.points[affixId]
  }

  const addWinePoint = (affixId: string) =>
    setWinePoints(affixId, (wine.value.points[affixId] || 0) + 1)
  const removeWinePoint = (affixId: string) =>
    setWinePoints(affixId, (wine.value.points[affixId] || 0) - 1)

  function setTarget(affixId: string, lvl: number) {
    let p = picks.value.find((x) => x.id === affixId)
    if (!p) {
      addAffix(affixId)
      p = picks.value.find((x) => x.id === affixId)
    }
    if (p) p.lvl = clampTarget(lvl)
  }

  function movePick(from: number, to: number) {
    const n = picks.value.length
    if (from === to || from < 0 || to < 0 || from >= n || to >= n) return
    const list = picks.value.slice()
    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)
    picks.value = list
  }

  function reset() {
    cls.value = GAME.classes[0].id
    picks.value = []
    wine.value = { tier: 'none', points: {} }
    mode.value = 'full'
    catFilter.value = 'all'
  }

  function share() {
    const { showToast } = useToast()
    syncHash()
    const url = location.href
    const done = () => showToast('🔗 Link copiado!')
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(done)
        .catch(() => fallbackCopy(url, done, showToast))
    } else {
      fallbackCopy(url, done, showToast)
    }
  }

  loadFromHash()

  return {
    cls,
    picks,
    wine,
    mode,
    catFilter,
    plan,
    startHashSync,
    addAffix,
    removeAffix,
    setTarget,
    movePick,
    setWineTier,
    setWinePoints,
    addWinePoint,
    removeWinePoint,
    reset,
    share,
  }
})
