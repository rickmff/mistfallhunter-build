<script setup lang="ts">
import { computed } from 'vue'
import { affix, catIcon, catTheme, gemFor, gemForShape, slotIcon } from '@/utils/game'
import { shapeLabel } from '@/utils/shapes'
import { verdictFor } from '@/utils/verdict'
import { useBuildStore } from '@/stores/build'
import type { AffixCategory, BoughtPiece, ShapeId, SlotDef } from '@/types'
import SocketShape from '@/components/SocketShape.vue'

interface Props {
  slotDef: SlotDef
  piece?: BoughtPiece | null
}

const props = withDefaults(defineProps<Props>(), {
  piece: null,
})

interface PresetRow {
  kind: 'preset'
  cat: AffixCategory
  name: string
  note: string
  useful: boolean
}

interface GemRow {
  kind: 'gem'
  shape: ShapeId | null
  cat: AffixCategory
  name: string
  note: string
}

interface FreeRow {
  kind: 'free'
  shape?: ShapeId | null
  name: string
  note?: string
}

type SocketRow = PresetRow | GemRow | FreeRow

const store = useBuildStore()

const slotLabel = computed(() => props.slotDef.name.split('·')[0].trim())

const sockets = computed<SocketRow[]>(() => {
  const pc = props.piece
  if (!pc) {
    return Array.from({ length: props.slotDef.sockets }, (): SocketRow => ({
      kind: 'free',
      name: 'socket livre',
    }))
  }

  const out: SocketRow[] = []
  if (pc.preset) {
    const a = affix(pc.preset)
    out.push({
      kind: 'preset',
      cat: a ? a.cat : 'utility',
      name: a ? a.name : pc.preset,
      note: pc.presetUseful ? 'de fábrica' : 'de fábrica · sem efeito',
      useful: pc.presetUseful,
    })
  }
  const shapes = pc.shapes || []
  for (let i = 0; i < pc.gemSockets; i++) {
    const g =
      pc.gems.find((x) => x.socket === i) ||
      (pc.gems[i] && pc.gems[i].socket == null ? pc.gems[i] : null)
    const shape = shapes[i] || null
    if (!g) {
      out.push({ kind: 'free', shape, name: 'socket livre', note: shapeLabel(shape) })
      continue
    }
    const a = affix(g.affix)
    const gm = gemForShape(g.affix, shape) || gemFor(g.affix)
    out.push({
      kind: 'gem',
      shape,
      cat: g.cat,
      name: a ? a.name : g.affix,
      note: gm ? `${gm.name} · socket ${shapeLabel(shape)}` : shapeLabel(shape),
    })
  }
  return out
})

const verdict = computed(() => (props.piece ? verdictFor(props.piece, store.plan) : null))

const why = computed(() => {
  const pc = props.piece
  if (!pc) return `${props.slotDef.name} — o plano não precisa comprar este slot`
  if (pc.hypothetical) {
    return `${pc.base} com preset de ${(pc.preset && affix(pc.preset)?.name) || pc.preset} — PROCURAR na Auction House (filtro "Affix Effects"). Preço estimado (~${pc.price} g) pela presetada mais barata deste slot.`
  }
  return `${pc.base} · ${pc.price} g · x${pc.qty} à venda${verdict.value ? ` — ${verdict.value.text}` : ''}`
})
</script>

<template>
  <v-card
    color="surface-light"
    :class="['eq-slot px-3 py-2 d-flex flex-column ga-3', piece ? '' : 'eq-slot--off']"
  >
    <div class="d-flex align-center ga-2" :title="why">
      <v-icon :icon="slotIcon(slotDef.id)" size="22" class="eq-art flex-0-0" />
      <span class="text-label-large font-weight-bold text-truncate flex-grow-1">
        {{ piece ? piece.base : slotLabel }}
      </span>
    </div>

    <div
      v-for="(s, i) in sockets"
      :key="i"
      class="d-flex align-center ga-2"
      :class="s.kind === 'preset' ? 'eq-preset px-2 py-1' : ''"
    >
      <v-avatar
        v-if="s.kind === 'preset'"
        size="15"
        rounded="sm"
        :color="s.useful ? catTheme(s.cat) : 'warning'"
        variant="flat"
        class="flex-0-0"
        :title="s.note"
      >
        <v-icon :icon="catIcon(s.cat)" size="10" />
      </v-avatar>
      <SocketShape v-else :shape="s.shape" :filled="s.kind === 'gem'" />

      <span
        class="text-body-small text-truncate flex-grow-1"
        style="min-width: 0"
        :class="{
          'text-disabled': s.kind === 'free',
          'font-weight-medium': s.kind === 'gem',
          'font-weight-bold': s.kind === 'preset',
        }"
        :title="s.note"
      >
        {{ s.name }}
      </span>
    </div>
  </v-card>
</template>
