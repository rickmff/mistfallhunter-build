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
const anyUnknown = computed(() => plan.value.gemUnknown)

/** Gemas realmente encaixadas — pode ser menos que a demanda, quando o formato
    do socket não permite (o plano não força gema em socket incompatível). */
const gemsPlaced = computed(() => plan.value.boughtPieces.reduce((s, c) => s + c.gems.length, 0))
</script>

<template>
  <v-card class="pa-3">
    <!-- ===== valor do equipamento ===== -->
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-3">
      <div>
        <div class="d-flex align-center ga-2">
          <v-icon icon="$gold" size="24" color="primary" />
          <span class="text-headline-small font-weight-bold font-mono">
            {{ (anyUnknown ? '≥' : '') + plan.grandTotal }}
          </span>
        </div>
      </div>
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
  </v-card>
</template>
