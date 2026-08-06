<script setup lang="ts">
import { ref } from 'vue'
import AffixPanel from '@/components/AffixPanel.vue'
import AttributesPanel from '@/components/AttributesPanel.vue'

const tab = ref<'attrs' | 'affixes'>('affixes')
</script>

<template>
  <v-card>
    <v-tabs v-model="tab" grow density="compact">
      <v-tab value="attrs" size="small">Atributos</v-tab>
      <v-tab value="affixes" size="small">Affixes</v-tab>
    </v-tabs>

    <v-divider />

    <div class="pa-3">
      <AttributesPanel v-show="tab === 'attrs'" />
      <AffixPanel v-show="tab === 'affixes'" />
    </div>
  </v-card>
</template>
