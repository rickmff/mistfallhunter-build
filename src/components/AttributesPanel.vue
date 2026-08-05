<script setup>
import { computed } from 'vue'
import { GAME } from '../data/game.js'
import { affix, byId, wineTier } from '../utils/game.js'
import { useBuild } from '../composables/useBuild.js'
import SummaryStats from './SummaryStats.vue'

/* Aba "Atributos" — o que descreve o personagem e o orçamento: classe,
   Victory Wine e o placar de custo. Nada aqui muda a alocação de sockets
   (a classe é só rótulo; a Wine dá ranks de graça). */
const { state } = useBuild()

const classItems = computed(() => GAME.classes.map((c) => ({ title: c.name, value: c.id })))
const role = computed(() => (byId(GAME.classes, state.cls) || {}).role || '')

const tierItems = computed(() => GAME.wineTiers.map((t) => ({ title: t.name, value: t.id })))

/** Só affixes já escolhidos podem receber o bônus da Wine. */
const affixItems = computed(() => [
  { title: '— nenhum —', value: '' },
  ...state.picks.map((p) => ({ title: affix(p.id).name, value: p.id })),
])

const wineOff = computed(() => wineTier(state.wine.tier).bonus === 0)
</script>

<template>
  <div>
    <div class="text-label-small text-uppercase text-medium-emphasis mb-2">Custo do plano</div>
    <SummaryStats />

    <div class="text-label-small text-uppercase text-medium-emphasis mt-5 mb-2">Hunter</div>
    <v-select v-model="state.cls" :items="classItems" />
    <div class="text-body-small text-disabled mt-1">
      {{ role }} — afeta apenas o rótulo da build: as regras de socket são universais.
    </div>

    <div class="text-label-small text-uppercase text-medium-emphasis mt-5 mb-2">Victory Wine</div>
    <div class="d-flex flex-column ga-2">
      <v-select v-model="state.wine.tier" :items="tierItems" label="Bônus (ranks)" persistent-placeholder />
      <v-select v-model="state.wine.a1" :items="affixItems" :disabled="wineOff" label="Affix A" />
      <v-select v-model="state.wine.a2" :items="affixItems" :disabled="wineOff" label="Affix B" />
    </div>
    <div class="text-body-small text-disabled mt-2">
      <strong class="text-medium-emphasis">2 affixes por run</strong>, travados ao confirmar até extrair/morrer. Fecham
      a conta e batem thresholds sem gastar socket.
      <span class="text-disabled">Magnitude do bônus por tier ainda não confirmada no jogo.</span>
    </div>
  </div>
</template>
