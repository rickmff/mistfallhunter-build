<script setup>
import { computed } from 'vue'
import { GAME } from '../data/game.js'
import { useBuild } from '../composables/useBuild.js'

const { plan } = useBuild()

const reachedCount = computed(() => plan.value.results.filter((r) => r.reached).length)
/** Se algo não tem preço, o total é um piso (≥), não uma estimativa (~). */
const anyUnknown = computed(() => plan.value.gemUnknown)
</script>

<template>
  <!-- 2×2: vive na coluna estreita da ficha, não na largura da página -->
  <v-row density="comfortable">
    <v-col cols="6">
      <v-card variant="tonal" color="primary" class="pa-3 h-100">
        <div class="text-label-small text-uppercase text-medium-emphasis">Custo total</div>
        <div class="text-headline-small font-weight-bold font-mono">
          {{ plan.boughtPieces.length ? (anyUnknown ? '≥' : '~') + plan.grandTotal : 0 }}
        </div>
        <div v-if="plan.boughtPieces.length" class="text-body-small text-medium-emphasis">
          peças {{ plan.knownCost }} + gemas {{ plan.gemsCost }}
        </div>
        <div
          v-if="plan.presetSavings"
          class="text-body-small font-weight-medium"
          :class="plan.presetSavings > 0 ? 'text-success' : 'text-error'"
        >
          presets já {{ plan.presetSavings > 0 ? 'poupam' : 'custam' }} {{ Math.abs(plan.presetSavings) }} g
        </div>
      </v-card>
    </v-col>

    <v-col cols="6">
      <v-card color="surface-light" class="pa-3 h-100">
        <div class="text-label-small text-uppercase text-medium-emphasis">Peças · gear</div>
        <div class="text-headline-small font-weight-bold font-mono">{{ plan.knownCost }}</div>
        <div class="text-body-small text-disabled">
          {{ plan.boughtPieces.length }} itens<template v-if="plan.premiumCost">
            · {{ plan.baseCost }} cruas + {{ plan.premiumCost }} de preset</template
          >
        </div>
      </v-card>
    </v-col>

    <v-col cols="6">
      <v-card color="surface-light" class="pa-3 h-100">
        <div class="text-label-small text-uppercase text-medium-emphasis">Gemas</div>
        <div class="text-headline-small font-weight-bold font-mono">{{ plan.gemsCost }}</div>
        <div class="text-body-small text-disabled">
          {{ plan.gemCount }} un.<template v-if="plan.gemUnknown"> · +{{ plan.gemUnknown }} s/ preço</template>
          <template v-if="plan.presetUsed"> · −{{ plan.presetUsed }} por preset</template>
        </div>
      </v-card>
    </v-col>

    <v-col cols="6">
      <v-card color="surface-light" class="pa-3 h-100">
        <div class="text-label-small text-uppercase text-medium-emphasis">Thresholds (nv{{ GAME.thresholdLevel }})</div>
        <div class="text-headline-small font-weight-bold font-mono" :class="reachedCount ? 'text-success' : ''">
          {{ reachedCount }}
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>
