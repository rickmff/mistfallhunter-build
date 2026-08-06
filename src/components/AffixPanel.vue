<script setup>
import { computed, ref, watchEffect } from 'vue'
import { CAT, GAME } from '../data/game.js'
import { catIcon, catLabel, catTheme, wineCapPerAffix, wineLeft, wineTier } from '../utils/game.js'
import { useBuild } from '../composables/useBuild.js'

/* Aba "Affixes" — um lugar só para escolher o affix, mirar o nível e ver o que
   o plano já entrega. A barra de pips é o próprio controle: clicar no pip N
   define o alvo em N (era o antigo number-input + barra de cobertura).
   A ORDEM da lista é a prioridade de alocação, e ela se arrasta: quando não dá
   pra atender tudo, quem está em cima é servido primeiro. */
const { state, catFilter, plan, addAffix, removeAffix, setTarget, movePick, setWineTier, addWinePoint, removeWinePoint } =
  useBuild()

const PIPS = GAME.maxTarget

const catChips = [
  { value: 'all', label: 'Todos', color: null },
  ...Object.entries(CAT).map(([id, c]) => ({ value: id, label: c.label, color: id })),
]

const chosen = computed(() => new Set(state.picks.map((p) => p.id)))

/** Affixes ainda disponíveis, filtrados pela categoria ativa. */
const affixItems = computed(() =>
  GAME.affixes
    .filter((a) => catFilter.value === 'all' || a.cat === catFilter.value)
    .filter((a) => !chosen.value.has(a.id))
    .map((a) => ({ title: `${a.name} · ${catLabel(a.cat)}`, value: a.id })),
)

const selected = ref('')
// mantém a seleção válida quando o filtro muda ou o affix é adicionado
watchEffect(() => {
  if (!affixItems.value.some((i) => i.value === selected.value)) {
    selected.value = affixItems.value.length ? affixItems.value[0].value : ''
  }
})

const add = () => addAffix(selected.value)

/* As linhas saem prontas do solver: primeiro os affixes pedidos (na prioridade
   da lista) e, no fim, os que estão ali só porque a bebida os alimenta. */
const rows = computed(() => plan.value.results)

/* ---------- arrastar para repriorizar ----------
   HTML5 drag & drop puro: a lista é curta na prática e não vale uma
   dependência. Soltar sobre a linha j move o arrastado para lá. */
const dragFrom = ref(-1)
const dragOver = ref(-1)

function onDragStart(i, e) {
  dragFrom.value = i
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(i)) // Firefox exige algum dado
  }
}

function onDrop(i) {
  // as linhas "só bebida" ficam depois das escolhidas e não têm prioridade:
  // soltar em cima delas não move nada.
  if (dragFrom.value >= 0 && i < state.picks.length) movePick(dragFrom.value, i)
  dragFrom.value = -1
  dragOver.value = -1
}

function onDragEnd() {
  dragFrom.value = -1
  dragOver.value = -1
}

/* Por que este affix não fechou o alvo — a resposta muda a ação do jogador. */
const REASON = {
  capacity: 'sem socket livre',
  shape: 'sem socket do formato certo',
  unknown: 'socket de formato não amostrado',
}

const shortReason = (r) => (r.short > 0 ? REASON[r.blockedBy] || 'sem socket livre' : null)

/* Os três estados que o jogo mostra na barra do affix:
     equipamento  o que a build carrega (gema + preset de fábrica) — cor da categoria
     bebida       o que a Victory Wine soma por cima, e só dura a run — azul
     falta        o que você mirou e o plano não entrega
   Acima do alvo fica apagado. A ordem é a mesma do jogo: equipamento primeiro,
   bebida por cima. */
const gearLevel = (r) => r.gemLevels + r.presetPts

function pipClass(r, i) {
  // o threshold é por affix (7 na maioria, 5 num grupo, e alguns não têm)
  const cls = i === r.threshold ? ['pip--thr'] : []
  if (i <= gearLevel(r)) cls.push('pip--gear')
  else if (i <= r.achieved) cls.push('pip--wine')
  else if (i <= r.target) cls.push('pip--miss')
  else cls.push('pip--off')
  return cls
}

/* ---------- Victory Wine ----------
   Mora aqui, junto dos affixes, porque é aqui que ela aparece: os ranks da
   bebida são os pips listrados. O tier é um ORÇAMENTO de pontos (2/4/5/6), não
   um bônus fixo — e o ponto pode ir para QUALQUER affix, não só os escolhidos:
   o affix que só a bebida sustenta entra na lista marcado como "só bebida". */
const tierItems = computed(() =>
  GAME.wineTiers.map((t) => ({
    title: t.points ? `${t.name} · ${t.points} ponto${t.points > 1 ? 's' : ''}` : t.name,
    value: t.id,
  })),
)

const tier = computed(() => wineTier(state.wine.tier))
const wineOff = computed(() => !tier.value.points)
const left = computed(() => wineLeft(state.wine, state.picks))
const capPer = computed(() => wineCapPerAffix(state.wine))

/** Linhas do orçamento: um affix por ponto gasto, na ordem em que consomem. */
const wineRows = computed(() =>
  plan.value.results.filter((r) => r.wineBonus > 0).map((r) => ({ id: r.id, name: r.name, cat: r.cat, n: r.wineBonus })),
)

/** Qualquer affix pode beber — inclusive um que a build não pediu. */
const wineAddItems = computed(() =>
  GAME.affixes
    .filter((a) => ((state.wine.points || {})[a.id] || 0) < capPer.value)
    .map((a) => ({ title: `${a.name} · ${catLabel(a.cat)}`, value: a.id })),
)

const wineAdd = ref('')
watchEffect(() => {
  if (!wineAddItems.value.some((i) => i.value === wineAdd.value)) {
    wineAdd.value = wineAddItems.value.length ? wineAddItems.value[0].value : ''
  }
})

/** O pip também diz de onde vem aquele rank — some a dúvida do brilho. */
function pipTitle(r, i) {
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
        <!-- pegador: a ordem é a prioridade, então ela se arrasta. Linha "só
             bebida" não disputa gema com ninguém, então não tem prioridade. -->
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
              @click="removeAffix(r.id)"
            />
          </div>

          <!-- a barra É o controle: clicar no pip N mira o nível N -->
          <div class="pips d-flex ga-1" :class="`text-${catTheme(r.cat)}`">
            <button
              v-for="i in PIPS"
              :key="i"
              type="button"
              class="pip"
              :class="pipClass(r, i)"
              :title="pipTitle(r, i)"
              @click="setTarget(r.id, i)"
            />
          </div>

        </div>

        <div class="text-right text-no-wrap">
          <div class="text-label-large font-weight-bold font-mono">Lv.{{ r.achieved }}</div>
          <div class="text-label-small text-disabled">{{ r.wineOnly ? 'sem alvo' : `alvo ${r.target}` }}</div>
        </div>
      </div>

      <!-- os três níveis, na mesma leitura da barra do jogo -->
      <div class="d-flex align-center flex-wrap ga-3 mt-2 text-label-small text-disabled">
        <span class="d-flex align-center ga-1 text-medium-emphasis">
          <i class="pip-key pip--gear" />nível do equipamento
        </span>
        <span class="d-flex align-center ga-1"><i class="pip-key pip--wine" />da bebida</span>
        <span class="d-flex align-center ga-1"><i class="pip-key pip--miss" />pretendido, não alcançado</span>
      </div>
    </div>

    <!-- ===== adicionar affix ===== -->
    <v-chip-group v-model="catFilter" mandatory filter class="mb-1">
      <v-chip v-for="c in catChips" :key="c.value" :value="c.value" size="small" variant="outlined">
        <v-icon icon="$dot" size="8" :color="c.color || undefined" :class="c.color ? '' : 'text-disabled'" start />
        {{ c.label }}
      </v-chip>
    </v-chip-group>

    <div class="d-flex ga-2">
      <v-select v-model="selected" :items="affixItems" :disabled="!affixItems.length" class="flex-grow-1" />
      <v-btn color="primary" variant="flat" :disabled="!affixItems.length" icon="$add" size="small" @click="add" />
    </div>

    <!-- ===== Victory Wine: os ranks listrados da barra ===== -->
    <div class="d-flex align-center ga-2 mt-5 mb-2">
      <span class="text-label-small text-uppercase text-medium-emphasis">Victory Wine · bebida</span>
      <v-spacer />
      <v-chip v-if="!wineOff" size="x-small" :color="left ? 'primary' : undefined" variant="tonal" class="font-mono">
        {{ tier.points - left }}/{{ tier.points }} pontos
      </v-chip>
    </div>

    <v-select :model-value="state.wine.tier" :items="tierItems" @update:model-value="setWineTier" />

    <div v-if="!wineOff" class="text-label-small text-disabled mt-1">
      {{ tier.cost }} · até {{ capPer }} ponto{{ capPer > 1 ? 's' : '' }} por affix
    </div>

    <template v-if="!wineOff">
      <!-- um ponto = +1 rank. O affix não precisa estar na build: se não estiver,
           ele aparece na lista acima marcado como "só bebida". -->
      <div v-for="w in wineRows" :key="w.id" class="d-flex align-center ga-2 mt-2">
        <v-icon icon="$dot" size="9" :color="catTheme(w.cat)" />
        <span class="text-body-small flex-grow-1 text-truncate">{{ w.name }}</span>
        <v-btn icon="$minus" size="x-small" variant="text" title="tirar um ponto" @click="removeWinePoint(w.id)" />
        <span class="text-label-large font-weight-bold font-mono" style="min-width: 14px; text-align: center">
          {{ w.n }}
        </span>
        <v-btn
          icon="$add"
          size="x-small"
          variant="text"
          :disabled="!left || w.n >= capPer"
          :title="!left ? 'sem pontos sobrando' : 'somar um ponto'"
          @click="addWinePoint(w.id)"
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
          @click="addWinePoint(wineAdd)"
        />
      </div>
    </template>

    <div class="text-label-small text-disabled mt-2">
      Bebida tomada antes da run: os affixes travam ao confirmar e valem até extrair ou morrer. Sobem o nível sem
      gastar socket, mas só durante a run — é o pip listrado.
    </div>
  </div>
</template>
