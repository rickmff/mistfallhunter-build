<script setup>
import { computed } from 'vue'
import { catTheme } from '../utils/game.js'
import { useBuild } from '../composables/useBuild.js'

const { plan } = useBuild()

/** Só affixes que ainda precisam de gema (o que a Wine/preset cobriu some daqui). */
const buys = computed(() => plan.value.results.filter((r) => r.gemPts > 0))
</script>

<template>
  <div v-if="buys.length" class="d-flex flex-column ga-2">
    <v-sheet
      v-for="r in buys"
      :key="r.id"
      border
      class="d-flex align-center ga-3 px-3 py-2"
      :class="r.gemUnit == null ? 'border-dashed' : ''"
    >
      <span class="text-label-large font-weight-bold font-mono text-primary">{{ r.gemPts }}×</span>
      <v-icon icon="$dot" size="9" :color="catTheme(r.cat)" />

      <span class="text-body-medium font-weight-bold flex-grow-1" style="min-width: 0">
        {{ r.gemUnit != null ? r.gemName : `${r.name} — gema não mapeada` }}
      </span>

      <v-chip v-if="r.gemMat" size="x-small" variant="tonal">{{ r.gemMat }}</v-chip>

      <div class="text-right text-no-wrap">
        <template v-if="r.gemUnit != null">
          <div class="text-body-small font-weight-bold font-mono">{{ r.gemUnit }}g</div>
          <div class="text-label-small font-weight-bold font-mono text-primary">= {{ r.gemSub }}g</div>
        </template>
        <div v-else class="text-label-small text-disabled">s/ preço</div>
      </div>
    </v-sheet>
  </div>
</template>
