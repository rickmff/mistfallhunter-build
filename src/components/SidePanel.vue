<script setup>
import { ref } from 'vue'
import AffixPanel from './AffixPanel.vue'
import AttributesPanel from './AttributesPanel.vue'
import DetailsPanel from './DetailsPanel.vue'

/* Painel direito — as leituras da build em abas, como a ficha do jogo:
   "Atributos" (classe, wine, custo), "Affixes" (o que se quer e o que se tem)
   e "Compras" (de onde vem a economia + as gemas a comprar). Em aba, e não
   num bloco que abre embaixo, tudo cabe na tela sem rolagem. */
const tab = ref('affixes')
</script>

<template>
  <!-- card de altura natural (nada de h-100 + flex column): esticado, o v-tabs
       e o corpo dividiam a sobra e a ficha ficava boiando no meio do vazio. -->
  <v-card>
    <v-tabs v-model="tab" grow density="compact">
      <v-tab value="attrs" size="small">Atributos</v-tab>
      <v-tab value="affixes" size="small">Affixes</v-tab>
      <v-tab value="shop" size="small">Compras</v-tab>
    </v-tabs>

    <v-divider />

    <!-- v-show (e não v-if) mantém o estado dos campos ao trocar de aba -->
    <div class="pa-3">
      <AttributesPanel v-show="tab === 'attrs'" />
      <AffixPanel v-show="tab === 'affixes'" />
      <DetailsPanel v-show="tab === 'shop'" />
    </div>
  </v-card>
</template>
