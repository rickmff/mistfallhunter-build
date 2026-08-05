<script setup>
import { computed, ref, watchEffect } from 'vue'
import { CAT, GAME } from '../data/game.js'
import { catIcon, catLabel, catTheme } from '../utils/game.js'
import { useBuild } from '../composables/useBuild.js'

/* Aba "Affixes" — um lugar só para escolher o affix, mirar o nível e ver o que
   o plano já entrega. A barra de pips é o próprio controle: clicar no pip N
   define o alvo em N (era o antigo number-input + barra de cobertura). */
const { state, catFilter, plan, addAffix, removeAffix, setLevel } = useBuild()

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

/** `results` sai do solver na MESMA ordem de `picks` — dá pra parear por índice. */
const rows = computed(() => plan.value.results.map((r, i) => ({ ...r, pick: state.picks[i] })))

/* Pips: sólidos = ranks vindos de gema, esmaecidos = de graça (preset/wine),
   avermelhados = o que falta pro alvo, apagados = acima do alvo. */
function pipClass(r, i) {
  const cls = i === GAME.thresholdLevel ? ['pip--thr'] : []
  if (i <= r.gemLevels) cls.push('pip--gem')
  else if (i <= r.achieved) cls.push('pip--free')
  else if (i <= r.target) cls.push('pip--miss')
  else cls.push('pip--off')
  return cls
}

const sourceLine = (r) =>
  [
    `#${r.priority}`,
    `${r.socketsUsed} gema(s) +${r.gemLevels}`,
    r.presetPts ? `preset +${r.presetPts}` : null,
    r.wineBonus ? `wine +${r.wineBonus}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between ga-2 mb-1">
      <span class="text-label-small text-uppercase text-medium-emphasis">
        Affixes da build · threshold nv{{ GAME.thresholdLevel }}
      </span>
      <v-chip size="x-small" :color="plan.overCap ? 'error' : undefined" variant="tonal" class="font-mono">
        {{ plan.distinctActive }}/{{ GAME.maxActiveAffixes }}
      </v-chip>
    </div>

    <div v-if="!state.picks.length" class="text-center text-body-small text-disabled py-6">
      Escolha os affixes que você quer — o app calcula as peças <strong>mais baratas</strong> para montá-los.
    </div>

    <div v-else class="mb-4">
      <div v-for="r in rows" :key="r.id" class="affix-row d-flex align-center ga-3 py-2">
        <v-avatar :color="catTheme(r.cat)" variant="tonal" rounded="md" size="34">
          <v-icon :icon="catIcon(r.cat)" size="18" />
        </v-avatar>

        <div class="flex-grow-1" style="min-width: 0">
          <div class="d-flex align-center ga-1">
            <span class="text-label-large font-weight-bold text-truncate">{{ r.name }}</span>
            <v-chip v-if="r.reached" size="x-small" color="primary" variant="flat">threshold</v-chip>
            <v-chip v-if="r.short > 0" size="x-small" color="error" variant="tonal">falta {{ r.short }}</v-chip>
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
          <div class="pips d-flex ga-1 my-1" :class="`text-${catTheme(r.cat)}`">
            <button
              v-for="i in PIPS"
              :key="i"
              type="button"
              class="pip"
              :class="pipClass(r, i)"
              :title="`mirar nível ${i}`"
              @click="setLevel(r.pick, i)"
            />
          </div>

          <div class="text-body-small text-disabled">{{ sourceLine(r) }}</div>
        </div>

        <div class="text-right text-no-wrap">
          <div class="text-title-medium font-weight-bold font-mono">Lv.{{ r.achieved }}</div>
          <div class="text-label-small text-disabled">alvo {{ r.target }}</div>
        </div>
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

    <div class="text-body-small text-disabled mt-2">
      A ordem = prioridade na alocação: se faltar socket, quem fica sem é o último da lista.
    </div>
  </div>
</template>
