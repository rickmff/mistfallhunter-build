<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { CAT, GAME } from '@/data/game'
import { useBuildStore } from '@/stores/build'
import { catIcon, catLabel, catTheme, wineCapPerAffix, wineLeft, wineTier } from '@/utils/game'
import type { AffixResult } from '@/types'

const store = useBuildStore()

const PIPS = GAME.maxTarget

const catChips = [
  { value: 'all', label: 'Todos', color: null },
  ...Object.entries(CAT).map(([id, c]) => ({ value: id, label: c.label, color: id })),
]

const chosen = computed(() => new Set(store.picks.map((p) => p.id)))

const affixItems = computed(() =>
  GAME.affixes
    .filter((a) => store.catFilter === 'all' || a.cat === store.catFilter)
    .filter((a) => !chosen.value.has(a.id))
    .map((a) => ({ title: `${a.name} · ${catLabel(a.cat)}`, value: a.id })),
)

const selected = ref('')
watchEffect(() => {
  if (!affixItems.value.some((i) => i.value === selected.value)) {
    selected.value = affixItems.value.length ? affixItems.value[0].value : ''
  }
})

const add = () => store.addAffix(selected.value)

const rows = computed(() => store.plan.results)

const dragFrom = ref(-1)
const dragOver = ref(-1)

function onDragStart(i: number, e: DragEvent) {
  dragFrom.value = i
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(i))
  }
}

function onDrop(i: number) {
  if (dragFrom.value >= 0 && i < store.picks.length) store.movePick(dragFrom.value, i)
  dragFrom.value = -1
  dragOver.value = -1
}

function onDragEnd() {
  dragFrom.value = -1
  dragOver.value = -1
}

const REASON: Record<string, string> = {
  capacity: 'sem socket livre',
  shape: 'sem socket do formato certo',
  unknown: 'socket de formato não amostrado',
}

const shortReason = (r: AffixResult) =>
  r.short > 0 ? REASON[r.blockedBy ?? ''] || 'sem socket livre' : null

const gearLevel = (r: AffixResult) => r.gemLevels + r.presetPts

function pipClass(r: AffixResult, i: number) {
  const cls = i === r.threshold ? ['pip--thr'] : []
  if (i <= gearLevel(r)) cls.push('pip--gear')
  else if (i <= r.achieved) cls.push('pip--wine')
  else if (i <= r.target) cls.push('pip--miss')
  else cls.push('pip--off')
  return cls
}

const tierItems = computed(() =>
  GAME.wineTiers.map((t) => ({
    title: t.points ? `${t.name} · ${t.points} ponto${t.points > 1 ? 's' : ''}` : t.name,
    value: t.id,
  })),
)

const tier = computed(() => wineTier(store.wine.tier))
const wineOff = computed(() => !tier.value.points)
const left = computed(() => wineLeft(store.wine, store.picks))
const capPer = computed(() => wineCapPerAffix(store.wine))

const wineRows = computed(() =>
  store.plan.results
    .filter((r) => r.wineBonus > 0)
    .map((r) => ({ id: r.id, name: r.name, cat: r.cat, n: r.wineBonus })),
)

const wineAddItems = computed(() =>
  GAME.affixes
    .filter((a) => ((store.wine.points || {})[a.id] || 0) < capPer.value)
    .map((a) => ({ title: `${a.name} · ${catLabel(a.cat)}`, value: a.id })),
)

const wineAdd = ref('')
watchEffect(() => {
  if (!wineAddItems.value.some((i) => i.value === wineAdd.value)) {
    wineAdd.value = wineAddItems.value.length ? wineAddItems.value[0].value : ''
  }
})

function pipTitle(r: AffixResult, i: number) {
  const origem =
    i <= gearLevel(r)
      ? 'nível do equipamento (gema ou preset de fábrica)'
      : i <= r.achieved
        ? 'nível da bebida (Victory Wine) — só durante a run'
        : i <= r.target
          ? 'nível pretendido, não alcançado'
          : 'acima do alvo'
  return `nível ${i} — ${origem} · clique para mirar aqui`
}
</script>

<template>
  <div>
    <div v-if="!rows.length" class="text-center text-body-small text-disabled py-6">
      Escolha os affixes que você quer — o app calcula as peças <strong>mais baratas</strong> para montá-los.
    </div>

    <div v-else class="mb-3">
      <div
        v-for="(r, i) in rows"
        :key="r.id"
        class="affix-row d-flex align-center ga-2 py-1"
        :class="{
          'affix-row--dragging': dragFrom === i,
          'affix-row--over': dragOver === i && dragFrom !== i,
          'affix-row--wine': r.wineOnly,
        }"
        :draggable="!r.wineOnly"
        @dragstart="onDragStart(i, $event)"
        @dragover.prevent="dragOver = i"
        @dragenter.prevent
        @drop.prevent="onDrop(i)"
        @dragend="onDragEnd"
      >
        <div class="drag-handle d-flex align-center ga-1 flex-0-0" :title="`prioridade ${i + 1} — arraste para mudar`">
          <template v-if="!r.wineOnly">
            <v-icon icon="$drag" size="14" class="text-disabled" />
            <span class="text-label-small font-mono text-disabled">{{ i + 1 }}</span>
          </template>
          <v-icon v-else icon="$wine" size="14" class="text-disabled" />
        </div>

        <v-avatar :color="catTheme(r.cat)" variant="tonal" rounded="md" size="26">
          <v-icon :icon="catIcon(r.cat)" size="15" />
        </v-avatar>

        <div class="flex-grow-1" style="min-width: 0">
          <div class="d-flex align-center ga-1">
            <span class="text-label-large font-weight-bold text-truncate">{{ r.name }}</span>
            <v-chip v-if="r.reached" size="x-small" color="primary" variant="flat">threshold</v-chip>
            <v-chip
              v-if="r.wineOnly"
              size="x-small"
              variant="tonal"
              title="a build não pediu este affix — ele existe só enquanto a bebida durar. Clique num pip para pedi-lo de verdade."
            >
              só bebida
            </v-chip>
            <v-chip v-if="r.short > 0" size="x-small" color="error" variant="tonal" :title="shortReason(r)">
              falta {{ r.short }} · {{ shortReason(r) }}
            </v-chip>
            <v-spacer />
            <v-btn
              icon="$remove"
              size="x-small"
              variant="text"
              color="error"
              title="Remover affix"
              @click="store.removeAffix(r.id)"
            />
          </div>

          <div class="pips d-flex ga-1" :class="`text-${catTheme(r.cat)}`">
            <button
              v-for="i in PIPS"
              :key="i"
              type="button"
              class="pip"
              :class="pipClass(r, i)"
              :title="pipTitle(r, i)"
              @click="store.setTarget(r.id, i)"
            />
          </div>

        </div>

        <div class="text-right text-no-wrap">
          <div class="text-label-large font-weight-bold font-mono">Lv.{{ r.achieved }}</div>
          <div class="text-label-small text-disabled">{{ r.wineOnly ? 'sem alvo' : `alvo ${r.target}` }}</div>
        </div>
      </div>

      <div class="d-flex align-center flex-wrap ga-3 mt-2 text-label-small text-disabled">
        <span class="d-flex align-center ga-1 text-medium-emphasis">
          <i class="pip-key pip--gear" />nível do equipamento
        </span>
        <span class="d-flex align-center ga-1"><i class="pip-key pip--wine" />da bebida</span>
        <span class="d-flex align-center ga-1"><i class="pip-key pip--miss" />pretendido, não alcançado</span>
      </div>
    </div>

    <v-chip-group v-model="store.catFilter" mandatory filter class="mb-1">
      <v-chip v-for="c in catChips" :key="c.value" :value="c.value" size="small" variant="outlined">
        <v-icon icon="$dot" size="8" :color="c.color || undefined" :class="c.color ? '' : 'text-disabled'" start />
        {{ c.label }}
      </v-chip>
    </v-chip-group>

    <div class="d-flex ga-2">
      <v-select v-model="selected" :items="affixItems" :disabled="!affixItems.length" class="flex-grow-1" />
      <v-btn color="primary" variant="flat" :disabled="!affixItems.length" icon="$add" size="small" @click="add" />
    </div>

    <div class="d-flex align-center ga-2 mt-5 mb-2">
      <span class="text-label-small text-uppercase text-medium-emphasis">Victory Wine · bebida</span>
      <v-spacer />
      <v-chip v-if="!wineOff" size="x-small" :color="left ? 'primary' : undefined" variant="tonal" class="font-mono">
        {{ tier.points - left }}/{{ tier.points }} pontos
      </v-chip>
    </div>

    <v-select :model-value="store.wine.tier" :items="tierItems" @update:model-value="store.setWineTier" />

    <div v-if="!wineOff" class="text-label-small text-disabled mt-1">
      {{ tier.cost }} · até {{ capPer }} ponto{{ capPer > 1 ? 's' : '' }} por affix
    </div>

    <template v-if="!wineOff">
      <div v-for="w in wineRows" :key="w.id" class="d-flex align-center ga-2 mt-2">
        <v-icon icon="$dot" size="9" :color="catTheme(w.cat)" />
        <span class="text-body-small flex-grow-1 text-truncate">{{ w.name }}</span>
        <v-btn icon="$minus" size="x-small" variant="text" title="tirar um ponto" @click="store.removeWinePoint(w.id)" />
        <span class="text-label-large font-weight-bold font-mono" style="min-width: 14px; text-align: center">
          {{ w.n }}
        </span>
        <v-btn
          icon="$add"
          size="x-small"
          variant="text"
          :disabled="!left || w.n >= capPer"
          :title="!left ? 'sem pontos sobrando' : 'somar um ponto'"
          @click="store.addWinePoint(w.id)"
        />
      </div>

      <div class="d-flex ga-2 mt-2">
        <v-select v-model="wineAdd" :items="wineAddItems" :disabled="!left" class="flex-grow-1" />
        <v-btn
          color="primary"
          variant="flat"
          icon="$add"
          size="small"
          :disabled="!left || !wineAdd"
          title="dar um ponto de bebida a este affix"
          @click="store.addWinePoint(wineAdd)"
        />
      </div>
    </template>

    <div class="text-label-small text-disabled mt-2">
      Bebida tomada antes da run: os affixes travam ao confirmar e valem até extrair ou morrer. Sobem o nível sem
      gastar socket, mas só durante a run — é o pip listrado.
    </div>
  </div>
</template>
