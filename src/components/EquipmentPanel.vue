<script setup>
import { computed } from 'vue'
import { GAME } from '../data/game.js'
import { useBuild } from '../composables/useBuild.js'
import EquipmentSlot from './EquipmentSlot.vue'

/* Painel esquerdo — a tela de equipamento: valor total no topo e as 8 peças
   dispostas como no inventário do jogo (arma larga, o resto em pares). */
const { state, plan } = useBuild()

/** Peça comprada indexada por slot; ausente = o plano não compra aquele slot. */
const bought = computed(() => Object.fromEntries(plan.value.boughtPieces.map((pc) => [pc.id, pc])))

/** Se algo não tem preço, o total é um piso (≥), não uma estimativa (~). */
const anyUnknown = computed(() => plan.value.unpricedUsed || plan.value.gemUnknown)
</script>

<template>
  <v-card class="pa-4 pa-sm-5">
    <!-- ===== valor do equipamento ===== -->
    <div class="d-flex align-start justify-space-between flex-wrap ga-3 mb-4">
      <div>
        <div class="text-label-small text-uppercase text-medium-emphasis">Valor do equipamento</div>
        <div class="d-flex align-center ga-2">
          <v-icon icon="$gold" size="24" color="primary" />
          <span class="text-headline-small font-weight-bold font-mono">
            {{ (anyUnknown ? '≥' : '') + plan.grandTotal }}
          </span>
        </div>
        <div class="text-body-small text-medium-emphasis">
          {{ plan.boughtPieces.length }} peça(s) {{ plan.baseCost }}
          <span v-if="plan.premiumCost">+ prêmio de preset {{ plan.premiumCost }}</span>
          + {{ plan.gemCount }} gema(s) {{ plan.gemsCost }}
          <span
            v-if="plan.presetSavings"
            class="font-weight-medium"
            :class="plan.presetSavings > 0 ? 'text-success' : 'text-error'"
          >
            · presets {{ plan.presetSavings > 0 ? 'poupam' : 'custam' }} {{ Math.abs(plan.presetSavings) }} g
          </span>
        </div>
      </div>

      <v-btn-toggle v-model="state.mode" mandatory divided rounded="pill" density="compact">
        <v-btn value="full" size="small">Completa · 8</v-btn>
        <v-btn value="min" size="small">Só affixes</v-btn>
      </v-btn-toggle>
    </div>

    <!-- ===== grade de equipamento ===== -->
    <div class="eq-grid">
      <EquipmentSlot
        v-for="sl in GAME.slots"
        :key="sl.id"
        :slot-def="sl"
        :piece="bought[sl.id] || null"
        :style="{ gridArea: sl.id }"
      />
    </div>

    <div class="text-body-small text-disabled mt-3">
      Cada selinho no rodapé da peça é um slot: <strong class="text-medium-emphasis">cheio</strong> = affix de fábrica
      (preset), <strong class="text-medium-emphasis">tonal</strong> = socket com gema,
      <strong class="text-medium-emphasis">vazio</strong> = socket livre.
      {{ plan.D }}/{{ plan.totalSocketsAll }} sockets de gema em uso.
    </div>
  </v-card>
</template>
