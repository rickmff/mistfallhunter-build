<script setup>
import { computed } from 'vue'
import { GAME } from '../data/game.js'
import { useBuild } from '../composables/useBuild.js'
import EquipmentSlot from './EquipmentSlot.vue'

/* Painel esquerdo — a tela de equipamento: as 8 peças dispostas como no
   inventário do jogo (arma larga, o resto em pares). O solver continua
   escolhendo pelo menor custo; a tela só não exibe gold. */
const { plan } = useBuild()

/** Peça comprada indexada por slot; ausente = o plano não compra aquele slot. */
const bought = computed(() => Object.fromEntries(plan.value.boughtPieces.map((pc) => [pc.id, pc])))
</script>

<template>
  <v-card class="pa-3">
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
