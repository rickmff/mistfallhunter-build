<script setup>
import { ref } from 'vue'
import AffixPanel from './AffixPanel.vue'
import AttributesPanel from './AttributesPanel.vue'

/* Painel direito — a ficha da build em duas abas: "Atributos" (quem é o
   personagem) e "Affixes" (o que se quer, o que se tem e a Victory Wine).
   O custo e a lista de compras vivem na grade de equipamento à esquerda, peça
   a peça, com o preço de cada gema. */
const tab = ref('affixes')
</script>

<template>
  <!-- card de altura natural (nada de h-100 + flex column): esticado, o v-tabs
       e o corpo dividiam a sobra e a ficha ficava boiando no meio do vazio. -->
  <v-card>
    <v-tabs v-model="tab" grow density="compact">
      <v-tab value="attrs" size="small">Atributos</v-tab>
      <v-tab value="affixes" size="small">Affixes</v-tab>
    </v-tabs>

    <v-divider />

    <!-- v-show (e não v-if) mantém o estado dos campos ao trocar de aba -->
    <div class="pa-3">
      <AttributesPanel v-show="tab === 'attrs'" />
      <AffixPanel v-show="tab === 'affixes'" />
    </div>
  </v-card>
</template>
