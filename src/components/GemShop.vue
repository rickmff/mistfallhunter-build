<script setup>
import { computed } from 'vue'
import { catTheme } from '../utils/game.js'
import { shapeLabel } from '../utils/shapes.js'
import { useBuild } from '../composables/useBuild.js'
import SocketShape from './SocketShape.vue'

/* Lista de compras das gemas. Cada affix tem uma gema POR FORMATO de socket,
   com preços bem diferentes — então a linha é (gema × formato), não (affix). */
const { plan } = useBuild()

const buys = computed(() =>
  plan.value.results.flatMap((r) =>
    r.gemBuys.length
      ? r.gemBuys.map((b) => ({ ...b, key: r.id + (b.name || '?'), affix: r.name, cat: r.cat }))
      : r.gemPts > 0
        ? [{ key: r.id, affix: r.name, cat: r.cat, name: null, qty: 0, unit: null, sub: 0, shape: null }]
        : [],
  ),
)
</script>

<template>
  <div v-if="buys.length" class="d-flex flex-column ga-1">
    <v-sheet
      v-for="b in buys"
      :key="b.key"
      color="surface-light"
      class="d-flex align-center ga-2 px-3 py-2"
      :class="b.unit == null ? 'text-disabled' : ''"
    >
      <span class="text-label-large font-weight-bold font-mono text-primary" style="min-width: 26px">
        {{ b.qty ? b.qty + '×' : '—' }}
      </span>
      <SocketShape v-if="b.shape" :shape="b.shape" filled />
      <v-icon v-else icon="$dot" size="9" :color="catTheme(b.cat)" />

      <div class="flex-grow-1" style="min-width: 0">
        <div class="text-body-small font-weight-bold text-truncate">
          {{ b.name || `${b.affix} — gema não mapeada` }}
        </div>
        <div class="text-label-small text-disabled">
          {{ b.affix }}<template v-if="b.shape"> · socket {{ shapeLabel(b.shape) }}</template>
        </div>
      </div>

      <div class="text-right text-no-wrap">
        <template v-if="b.unit != null">
          <div class="text-label-small font-mono text-disabled">{{ b.unit }} g/un.</div>
          <div class="text-label-large font-weight-bold font-mono text-primary">{{ b.sub }} g</div>
        </template>
        <div v-else class="text-label-small text-disabled">s/ preço</div>
      </div>
    </v-sheet>
  </div>
</template>
