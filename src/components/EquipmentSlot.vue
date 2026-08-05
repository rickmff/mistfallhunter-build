<script setup>
import { computed } from 'vue'
import { affix, catIcon, catTheme, gemFor, presetPremiumFor, slotIcon } from '../utils/game.js'
import { verdictFor } from '../utils/verdict.js'
import { useBuild } from '../composables/useBuild.js'

/* Uma célula da grade de equipamento: a peça daquele slot como o jogo mostra —
   nome, arte, e os sockets como selinhos no rodapé. O raio-x (preset + veredito)
   fica escondido até o botão "Detalhes" do painel direito. */
const props = defineProps({
  slotDef: { type: Object, required: true },
  piece: { type: Object, default: null }, // null = o plano não compra este slot
})

const { state, plan, showDetails, setPreset } = useBuild()

// "Arma · Sword & Shield" → título + subtítulo, pra caber na célula
const label = computed(() => {
  const [main, ...rest] = props.slotDef.name.split('·')
  return { main: main.trim(), sub: rest.join('·').trim() }
})

/** Um selinho por slot da peça: o preset primeiro, depois os sockets de gema. */
const badges = computed(() => {
  const pc = props.piece
  if (!pc) return Array.from({ length: props.slotDef.sockets }, () => ({ kind: 'empty' }))

  const out = []
  if (pc.preset) {
    const a = affix(pc.preset)
    out.push({
      kind: 'preset',
      cat: a ? a.cat : 'utility',
      title: `${a ? a.name : pc.preset} · preset${pc.presetUseful ? '' : ' (sem efeito)'}`,
      useful: pc.presetUseful,
    })
  }
  for (let i = 0; i < pc.gemSockets; i++) {
    const g = pc.gems[i]
    if (!g) {
      out.push({ kind: 'empty', title: 'socket livre' })
      continue
    }
    const a = affix(g.affix)
    out.push({ kind: 'gem', cat: g.cat, title: `${a ? a.name : g.affix} · gema +${g.level}` })
  }
  return out
})

const verdict = computed(() => (props.piece ? verdictFor(props.piece, plan.value) : null))

/** Preço que se paga de fato: peça crua + prêmio do preset que ela carrega. */
const price = computed(() => {
  const pc = props.piece
  if (!pc || pc.mid == null) return null
  return pc.mid + (pc.premium || 0)
})

/** Peça "base": comprada pelos stats, sem nenhuma gema alocada nem preset. */
const isBase = computed(() => !!props.piece && props.piece.gems.length === 0 && !props.piece.preset)

/** Opções do seletor ordenadas pelo ganho LÍQUIDO (gema dispensada − prêmio). */
const presetItems = computed(() => {
  const opts = state.picks.map((p) => {
    const g = gemFor(p.id)
    const premium = presetPremiumFor(props.slotDef.id, p.id, state.premium)
    const net = g && premium != null ? g.price - premium : null
    const name = affix(p.id).name
    let title = `${name} · gema s/ preço`
    if (g && net == null) title = `${name} · dispensa ${g.price} g, prêmio s/ amostra`
    else if (net != null) title = net > 0 ? `${name} · poupa ${net} g` : `${name} · custa ${-net} g a mais`
    return { title, value: p.id, net: net != null ? net : -Infinity }
  })
  opts.sort((a, b) => b.net - a.net)
  return [{ title: 'nenhum', value: '' }, ...opts]
})
</script>

<template>
  <v-card
    :variant="piece ? 'outlined' : 'tonal'"
    :class="['eq-slot pa-3 d-flex flex-column', piece ? '' : 'eq-slot--off']"
  >
    <!-- nome do slot + preço -->
    <div class="d-flex align-start justify-space-between ga-2">
      <div style="min-width: 0">
        <div class="text-label-large font-weight-bold text-truncate">{{ label.main }}</div>
        <div class="text-label-small text-disabled text-truncate">{{ label.sub }}</div>
      </div>
      <div class="text-right text-no-wrap">
        <div class="text-label-large font-weight-bold font-mono" :class="piece ? 'text-primary' : 'text-disabled'">
          <template v-if="piece">{{ price != null ? `~${price} g` : 's/ preço' }}</template>
          <template v-else>—</template>
        </div>
        <div v-if="piece && showDetails" class="text-label-small text-disabled font-mono">
          <template v-if="piece.mid == null">sem amostra</template>
          <template v-else-if="piece.premium">crua {{ piece.mid }} + preset {{ piece.premium }}</template>
          <template v-else>{{ piece.lo }}–{{ piece.hi }} g</template>
        </div>
      </div>
    </div>

    <!-- "arte" da peça -->
    <div class="eq-art">
      <v-icon :icon="slotIcon(slotDef.id)" size="44" />
    </div>

    <!-- sockets: preset (cheio) + gemas (tonal) + livres (contorno) -->
    <div class="d-flex align-center ga-1 flex-wrap">
      <template v-for="(b, i) in badges" :key="i">
        <v-avatar
          v-if="b.kind === 'empty'"
          size="20"
          rounded="sm"
          variant="outlined"
          class="text-disabled"
          :title="b.title"
        >
          <v-icon icon="$dot" size="6" />
        </v-avatar>
        <v-avatar
          v-else
          size="20"
          rounded="sm"
          :color="b.kind === 'preset' && !b.useful ? 'warning' : catTheme(b.cat)"
          :variant="b.kind === 'preset' ? 'flat' : 'tonal'"
          :title="b.title"
        >
          <v-icon :icon="catIcon(b.cat)" size="12" />
        </v-avatar>
      </template>

      <v-spacer />

      <v-chip v-if="!piece" size="x-small" variant="text" class="text-disabled px-0">não comprada</v-chip>
      <v-chip v-else-if="isBase" size="x-small" variant="text" class="text-disabled px-0">base</v-chip>
    </div>

    <!-- veredito curto: compensa comprar esta peça presetada? -->
    <v-chip v-if="verdict" size="x-small" :color="verdict.color" variant="tonal" class="mt-2 align-self-start">
      {{ verdict.label }}
    </v-chip>

    <!-- raio-x (botão "Detalhes"): escolha do preset + porquê do veredito -->
    <div v-show="showDetails && piece" class="mt-2 pt-2 border-t border-dashed">
      <div class="d-flex align-center ga-2">
        <span class="text-label-small text-uppercase text-disabled">preset</span>
        <v-select
          :model-value="(piece && piece.preset) || ''"
          :items="presetItems"
          class="flex-grow-1"
          @update:model-value="(v) => setPreset(slotDef.id, v)"
        />
      </div>
      <div v-if="verdict" class="text-body-small text-medium-emphasis mt-2">{{ verdict.text }}</div>
    </div>
  </v-card>
</template>
