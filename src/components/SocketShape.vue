<script setup lang="ts">
import { computed } from 'vue'
import { shapeDef, shapeLabel } from '@/utils/shapes'

interface Props {
  shape?: string | null
  filled?: boolean
  size?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  shape: null,
  filled: false,
  size: 15,
})

const def = computed(() => shapeDef(props.shape))
const label = computed(() =>
  def.value
    ? `socket ${shapeLabel(props.shape)}`
    : 'formato do socket ainda não amostrado nesta listagem',
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
