<script setup lang="ts">
import { computed } from 'vue'
import { GAME } from '@/data/game'
import { byId } from '@/utils/game'
import { useBuildStore } from '@/stores/build'

const store = useBuildStore()

const classItems = computed(() => GAME.classes.map((c) => ({ title: c.name, value: c.id })))
const role = computed(() => byId(GAME.classes, store.cls)?.role || '')
</script>

<template>
  <div>
    <div class="text-label-small text-uppercase text-medium-emphasis mb-2">Hunter</div>
    <v-select v-model="store.cls" :items="classItems" />
    <div class="text-body-small text-disabled mt-1">
      {{ role }} — afeta apenas o rótulo da build: as regras de socket são universais.
    </div>
  </div>
</template>
