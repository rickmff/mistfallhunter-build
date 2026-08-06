<script setup>
import { computed } from 'vue'
import { shapeDef, shapeLabel } from '../utils/shapes.js'

/* Ícone do FORMATO do socket (ver utils/shapes.js).
   Cheio = socket ocupado por uma gema; vazado = socket livre. */
const props = defineProps({
  shape: { type: String, default: null }, // bar | tri | sq | circ | null
  filled: { type: Boolean, default: false },
  size: { type: [Number, String], default: 15 },
})

const def = computed(() => shapeDef(props.shape))
const label = computed(() =>
  def.value ? `socket ${shapeLabel(props.shape)}` : 'formato do socket ainda não amostrado nesta listagem',
)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    class="socket-shape flex-0-0"
    role="img"
    :aria-label="label"
  >
    <title>{{ label }}</title>
    <path
      v-if="def"
      :d="def.path"
      :fill="filled ? def.color : 'none'"
      :stroke="def.color"
      stroke-width="1.4"
      :opacity="filled ? 1 : 0.7"
    />
    <!-- formato ainda não amostrado: caixa tracejada com "?", pra não passar
         por um formato de verdade -->
    <template v-else>
      <rect
        x="2.2"
        y="2.2"
        width="11.6"
        height="11.6"
        rx="2"
        fill="none"
        stroke="currentColor"
        stroke-width="1.2"
        stroke-dasharray="2.4 2"
        opacity="0.45"
      />
      <text
        x="8"
        y="11.4"
        text-anchor="middle"
        font-size="8.5"
        font-weight="700"
        fill="currentColor"
        opacity="0.6"
      >
        ?
      </text>
    </template>
  </svg>
</template>
