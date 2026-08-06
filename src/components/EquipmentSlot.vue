<script setup>
import { computed } from 'vue'
import { affix, catIcon, catTheme, gemFor, gemForShape, slotIcon } from '../utils/game.js'
import { shapeLabel } from '../utils/shapes.js'
import { verdictFor } from '../utils/verdict.js'
import { useBuild } from '../composables/useBuild.js'
import SocketShape from './SocketShape.vue'

/* Uma célula da grade de equipamento: a LISTAGEM que o plano manda comprar
   naquele slot. Compacta de propósito — as 8 peças têm de caber na tela sem
   rolagem. Não há escolha de preset aqui: o solver já pegou a listagem mais
   barata do catálogo real da AH.

   Cada linha do rodapé é um dos 2 slots da peça e responde três coisas:
     - QUAL affix ocupa (nome, não um rótulo genérico de "gema")
     - o FORMATO do socket (retângulo/triângulo/…, o "Slot Type" da AH)
     - se o affix veio de FÁBRICA (preset) ou é gema que o plano encaixa */
const props = defineProps({
  slotDef: { type: Object, required: true },
  piece: { type: Object, default: null }, // null = o plano não compra este slot
})

const { plan } = useBuild()

// "Arma · Sword & Shield" → só o começo serve de rótulo quando não há peça
const slotLabel = computed(() => props.slotDef.name.split('·')[0].trim())

const sockets = computed(() => {
  const pc = props.piece
  if (!pc) {
    return Array.from({ length: props.slotDef.sockets }, () => ({ kind: 'free', name: 'socket livre' }))
  }

  const out = []
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
    // a gema guarda em que socket entrou (o formato manda), então é busca por
    // índice — não "o i-ésimo da lista"
    const g = pc.gems.find((x) => x.socket === i) || (pc.gems[i] && pc.gems[i].socket == null ? pc.gems[i] : null)
    const shape = shapes[i] || null
    if (!g) {
      out.push({ kind: 'free', shape, name: 'socket livre', note: shapeLabel(shape) })
      continue
    }
    const a = affix(g.affix)
    // a gema custa diferente em cada formato — o preço que vale é o do socket
    const gm = gemForShape(g.affix, shape) || gemFor(g.affix)
    out.push({
      kind: 'gem',
      shape,
      cat: g.cat,
      name: a ? a.name : g.affix,
      note: gm ? `${gm.name} · socket ${shapeLabel(shape)}` : shapeLabel(shape),
      price: gm ? gm.price : null,
    })
  }
  return out
})

const verdict = computed(() => (props.piece ? verdictFor(props.piece, plan.value) : null))

/** Por que ESTA listagem: fica no title do card (sem custar altura na grade). */
const why = computed(() => {
  const pc = props.piece
  if (!pc) return `${props.slotDef.name} — o plano não precisa comprar este slot`
  if (pc.hypothetical) {
    return `${pc.base} com preset de ${affix(pc.preset)?.name || pc.preset} — PROCURAR na Auction House (filtro "Affix Effects"). Preço estimado (~${pc.price} g) pela presetada mais barata deste slot.`
  }
  return `${pc.base} · ${pc.price} g · x${pc.qty} à venda${verdict.value ? ` — ${verdict.value.text}` : ''}`
})
</script>

<template>
  <v-card
    color="surface-light"
    :class="['eq-slot px-3 py-2 d-flex flex-column ga-3', piece ? '' : 'eq-slot--off']"
  >
    <!-- arte + nome da listagem + preço, tudo numa linha -->
    <div class="d-flex align-center ga-2" :title="why">
      <v-icon :icon="slotIcon(slotDef.id)" size="22" class="eq-art flex-0-0" />
      <span class="text-label-large font-weight-bold text-truncate flex-grow-1">
        {{ piece ? piece.base : slotLabel }}
      </span>
      <span
        class="text-label-small font-weight-bold font-mono text-no-wrap"
        :class="piece ? 'text-primary' : 'text-disabled'"
      >
        <!-- `~` = peça presetada a PROCURAR: o preço é a cotação da presetada
             mais barata do slot, não uma listagem que já vimos -->
        {{ piece ? `${piece.hypothetical ? '~' : ''}${piece.price} g` : 'não comprada' }}
      </span>
    </div>

    <!-- Uma linha por slot da peça. As duas origens do affix não podem se
         parecer: PRESET vem de fábrica na peça (sem socket, sem gema, sem
         gasto) e GEMA é comprada e encaixada num socket de formato. -->
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
        class="text-body-small text-truncate"
        :class="{
          'text-disabled': s.kind === 'free',
          'font-weight-medium': s.kind === 'gem',
          'font-weight-bold': s.kind === 'preset',
        }"
        :title="s.note"
      >
        {{ s.name }}
      </span>

      <v-spacer />

      <!-- à direita, o que a linha CUSTA. O preset não mostra nada: ele já vem
           na peça, e quem o diferencia é o realce da linha (ver .eq-preset). -->
      <span
        v-if="s.kind === 'gem'"
        class="text-label-small font-mono text-no-wrap"
        :class="s.price != null ? 'text-primary' : 'text-disabled'"
      >
        {{ s.price != null ? `${s.price} g` : 's/ preço' }}
      </span>
    </div>

    <!-- O veredito (quanto o preset poupou, até quanto pagar) não fica na
         grade: ele vive no title do card e, em detalhe, na aba Compras. A
         célula mostra só o que a peça É. -->
  </v-card>
</template>
