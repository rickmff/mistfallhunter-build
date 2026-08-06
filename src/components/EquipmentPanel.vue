<script setup lang="ts">
import { computed } from 'vue'
import { GAME } from '@/data/game'
import { useBuildStore } from '@/stores/build'
import type { BoughtPiece } from '@/types'
import EquipmentSlot from '@/components/EquipmentSlot.vue'

const store = useBuildStore()

const bought = computed<Record<string, BoughtPiece>>(() =>
  Object.fromEntries(store.plan.boughtPieces.map((pc): [string, BoughtPiece] => [pc.id, pc]))
)
</script>

<template>
  <v-card class="pa-3">
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
