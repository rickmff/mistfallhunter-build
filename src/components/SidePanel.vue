<script setup>
import { ref } from 'vue'
import { useBuild } from '../composables/useBuild.js'
import AffixPanel from './AffixPanel.vue'
import AttributesPanel from './AttributesPanel.vue'

/* Painel direito — as duas leituras da build em abas, como a ficha do jogo:
   "Atributos" (classe, wine, custo) e "Affixes" (o que se quer e o que se tem).
   O botão do rodapé abre o raio-x: preset/veredito peça a peça + análise. */
const { showDetails } = useBuild()

const tab = ref('affixes')
</script>

<template>
  <v-card class="d-flex flex-column h-100">
    <v-tabs v-model="tab" grow>
      <v-tab value="attrs">Atributos</v-tab>
      <v-tab value="affixes">Affixes</v-tab>
    </v-tabs>

    <!-- flex-0-0: o `flex: 100%` do v-divider, numa coluna flex, roubaria
         altura dos irmãos e empurraria a aba pro meio do card. -->
    <v-divider class="flex-0-0" />

    <!-- v-show (e não v-if) mantém o estado dos campos ao trocar de aba -->
    <div class="pa-4 pa-sm-5 flex-grow-1">
      <AttributesPanel v-show="tab === 'attrs'" />
      <AffixPanel v-show="tab === 'affixes'" />
    </div>

    <v-divider class="flex-0-0" />

    <div class="pa-4">
      <v-btn
        block
        size="large"
        :append-icon="showDetails ? '$chevronUp' : '$chevronDown'"
        @click="showDetails = !showDetails"
      >
        {{ showDetails ? 'Ocultar detalhes' : 'Detalhes' }}
      </v-btn>
    </div>
  </v-card>
</template>
