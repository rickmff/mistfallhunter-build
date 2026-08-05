<script setup>
import { computed } from 'vue'
import { GAME } from '../data/game.js'
import { catTheme } from '../utils/game.js'
import { useBuild } from '../composables/useBuild.js'

const { state, plan, optimalPlan, applyOptimalPresets, clearPresets, setPremium } = useBuild()

/* Quanto ainda dá pra poupar trocando os presets atuais pelos ideais.
   Vem de um solve() de verdade com a configuração ótima — não é estimativa. */
const gain = computed(() => plan.value.grandTotal - optimalPlan.value.grandTotal)

/** Só faz sentido caçar preset se ainda houver peça sem um. */
const hunt = computed(() => plan.value.presetHunt.slice(0, plan.value.presetSlotsFree || 0))

/** Prêmio em vigor: o digitado, ou o default da base. */
const premium = computed(() => (state.premium != null ? state.premium : GAME.presetPremium.default))
/** Sem amostra real, o número é palpite — a UI tem que dizer isso. */
const premiumIsGuess = computed(() => !Object.keys(GAME.presetPremium.byAffix || {}).length)
</script>

<template>
  <v-card variant="tonal" color="primary" class="pa-4">
    <div class="d-flex align-start justify-space-between flex-wrap ga-3 mb-2">
      <div style="min-width: 0">
        <div class="text-label-large font-weight-bold">Vale a pena o preset?</div>
        <div class="text-body-small text-medium-emphasis">
          A peça tem 2 slots. Se um vier com affix de fábrica, sobra 1 socket — mas você já ganha +1 rank ali. Como a
          gema também dá +1, a troca é neutra em socket: o preset <strong>dispensa exatamente 1 gema</strong>. Só que a
          peça presetada cobra um <strong>prêmio</strong> na AH, então o que conta é a diferença —
          <strong>gema dispensada − prêmio</strong>. Preset de gema barata em peça cara é prejuízo.
        </div>
      </div>
      <div class="d-flex ga-2">
        <v-btn size="small" color="primary" variant="flat" :disabled="gain <= 0" @click="applyOptimalPresets">
          Usar presets ótimos
        </v-btn>
        <v-btn size="small" :disabled="!plan.presetUsed && !plan.presetWasted" @click="clearPresets">Limpar</v-btn>
      </div>
    </div>

    <!-- a premissa que decide tudo: quanto a peça presetada cobra a mais -->
    <v-sheet border rounded class="d-flex align-center ga-3 px-3 py-2 mb-3">
      <div class="flex-grow-1" style="min-width: 0">
        <div class="text-label-small text-uppercase text-medium-emphasis">Prêmio de preset</div>
        <div class="text-body-small text-disabled">
          Quanto a mais custa, na Auction House, a peça presetada em vez da crua.
          <template v-if="premiumIsGuess">
            <strong class="text-warning">Ainda sem amostra</strong> — este número é palpite; ajuste com preços reais.
          </template>
        </div>
      </div>
      <v-text-field
        :model-value="premium"
        type="number"
        min="0"
        suffix="g"
        density="compact"
        hide-details
        style="max-width: 108px"
        @update:model-value="setPremium"
      />
    </v-sheet>

    <!-- placar: o que os presets atuais poupam LÍQUIDO e o que falta capturar -->
    <div class="d-flex flex-wrap ga-2 mb-3">
      <v-chip
        size="small"
        :color="plan.presetSavings > 0 ? 'success' : plan.presetSavings < 0 ? 'error' : undefined"
        variant="tonal"
        class="font-mono"
      >
        presets poupam {{ plan.presetSavings }} g
        <template v-if="plan.presetSavingUnknown"> (+{{ plan.presetSavingUnknown }} s/ preço)</template>
      </v-chip>
      <v-chip v-if="plan.premiumCost" size="small" variant="tonal" class="font-mono">
        bruto {{ plan.presetGross }} g − prêmio {{ plan.premiumCost }} g
      </v-chip>
      <v-chip v-if="plan.presetLosing" size="small" color="error" variant="tonal">
        {{ plan.presetLosing }} preset(s) custam mais que a gema — compre a peça crua
      </v-chip>
      <v-chip v-if="plan.presetWasted" size="small" color="warning" variant="tonal">
        {{ plan.presetWasted }} preset(s) sem efeito — socket queimado<template v-if="plan.presetWastedGold">
          · −{{ plan.presetWastedGold }} g</template
        >
      </v-chip>
      <v-chip v-if="gain > 0" size="small" color="info" variant="tonal" class="font-mono">
        dá pra poupar mais {{ gain }} g
      </v-chip>
      <v-chip v-else-if="plan.presetSlotsFree === 0" size="small" color="success" variant="tonal">
        configuração ótima
      </v-chip>
    </div>

    <!-- ranking de caça: qual preset procurar na Auction House, e até quanto pagar -->
    <template v-if="hunt.length">
      <div class="text-label-small text-uppercase text-medium-emphasis mb-2">
        Procure na AH — {{ plan.presetSlotsFree }} peça(s) ainda sem preset
      </div>
      <div class="d-flex flex-column ga-2">
        <v-sheet v-for="h in hunt" :key="h.id" border class="d-flex align-center ga-3 px-3 py-2">
          <div class="cat-bar" :class="`bg-${catTheme(h.cat)}`" />
          <div class="flex-grow-1" style="min-width: 0">
            <div class="text-body-medium font-weight-bold">{{ h.name }}</div>
            <div class="text-body-small text-disabled">
              {{ h.gemName || 'gema não mapeada' }} · {{ h.openPts }} rank(s) em aberto
            </div>
          </div>
          <div class="text-right text-no-wrap">
            <template v-if="h.unit != null">
              <div
                class="text-label-large font-weight-bold font-mono"
                :class="h.net != null && h.net <= 0 ? 'text-error' : 'text-success'"
              >
                +{{ h.unit }} g
              </div>
              <div class="text-label-small text-disabled font-mono">
                teto do prêmio<template v-if="h.net != null"> · líquido {{ h.net }} g</template>
              </div>
            </template>
            <div v-else class="text-label-small text-disabled">valor s/ preço</div>
          </div>
        </v-sheet>
      </div>
      <div class="text-body-small text-disabled mt-2">
        O par slot↔affix é indiferente: qualquer peça rende 1 preset por 1 socket. O que importa é o
        <strong>conjunto</strong> de presets — pegue os de gema mais cara, em qualquer slot, desde que o vendedor não
        cobre mais que o teto acima.
      </div>
    </template>

    <div v-else-if="!plan.presetHunt.length" class="text-body-small text-disabled">
      Nada em aberto: Wine e presets já fecham todos os alvos. Qualquer preset a mais só queimaria um socket — prefira
      as peças cruas.
    </div>

    <div v-else class="text-body-small text-disabled">
      Todas as peças da lista já têm preset — não sobra slot pra capturar mais economia.
    </div>
  </v-card>
</template>
