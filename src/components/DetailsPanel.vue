<script setup>
import { computed } from 'vue'
import { useBuild } from '../composables/useBuild.js'
import GemShop from './GemShop.vue'
import PresetAdvisor from './PresetAdvisor.vue'

/* Aba "Compras": a análise que não cabe na célula da peça — de onde vem a
   economia dos presets e a lista de gemas a comprar. */
const { plan } = useBuild()

const gemLabel = computed(() =>
  plan.value.gemUnknown
    ? `Gemas a comprar — ${plan.value.gemCount} un. (+${plan.value.gemUnknown} affix s/ preço)`
    : `Gemas a comprar — ${plan.value.gemCount} un. · ${plan.value.gemsCost} g`,
)
</script>

<template>
  <div>
    <PresetAdvisor />

    <template v-if="plan.gemCount">
      <div class="text-label-small text-uppercase text-medium-emphasis mt-4 mb-2">
        <v-icon icon="$gem" size="14" start />{{ gemLabel }}
      </div>
      <GemShop />
    </template>
  </div>
</template>
