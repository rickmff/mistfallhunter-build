<script setup>
import { computed } from 'vue'
import { GAME } from '../data/game.js'
import { useBuild } from '../composables/useBuild.js'
import GemShop from './GemShop.vue'
import PresetAdvisor from './PresetAdvisor.vue'

/* Bloco do botão "Detalhes": a análise que não cabe na peça — onde caçar
   preset e quais gemas comprar. O veredito de cada peça aparece na própria
   célula da grade quando este bloco abre. */
const { plan } = useBuild()

const gemLabel = computed(() =>
  plan.value.gemUnknown
    ? `Gemas a comprar — ${plan.value.gemCount} un. (+${plan.value.gemUnknown} affix s/ preço)`
    : `Gemas a comprar — ${plan.value.gemCount} un. · ${plan.value.gemsCost} g`,
)
</script>

<template>
  <v-card class="pa-4 pa-sm-5">
    <h2 class="text-title-small font-weight-bold">Raio-x do plano</h2>
    <p class="text-body-small text-medium-emphasis mb-4">
      Custo total = <strong class="text-high-emphasis">peças + gemas</strong>. Cada gema dá
      <strong class="text-high-emphasis">+{{ GAME.maxGemLevel }}</strong> no affix, então nível
      {{ GAME.thresholdLevel }} = {{ GAME.thresholdLevel }} gemas. Cada peça da grade ao lado abriu com o seletor de
      preset e o veredito de compra. Preços da Auction House.
    </p>

    <PresetAdvisor />

    <template v-if="plan.gemCount">
      <div class="text-label-small text-uppercase text-medium-emphasis mt-5 mb-2">
        <v-icon icon="$gem" size="14" start />{{ gemLabel }}
      </div>
      <GemShop />
    </template>
  </v-card>
</template>
