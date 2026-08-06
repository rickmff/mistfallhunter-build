<script setup>
import { computed } from 'vue'
import { GAME } from '../data/game.js'
import { byId } from '../utils/game.js'
import { useBuild } from '../composables/useBuild.js'

/* Aba "Atributos" — quem é o personagem. A Victory Wine saiu daqui para a aba
   de Affixes, onde ela realmente atua (é ela que enche os pips listrados). */
const { state } = useBuild()

const classItems = computed(() => GAME.classes.map((c) => ({ title: c.name, value: c.id })))
const role = computed(() => (byId(GAME.classes, state.cls) || {}).role || '')
</script>

<template>
  <div>
    <div class="text-label-small text-uppercase text-medium-emphasis mb-2">Hunter</div>
    <v-select v-model="state.cls" :items="classItems" />
    <div class="text-body-small text-disabled mt-1">
      {{ role }} — afeta apenas o rótulo da build: as regras de socket são universais.
    </div>
  </div>
</template>
