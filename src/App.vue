<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBuildStore } from '@/stores/build'
import { useToast } from '@/composables/useToast'
import EquipmentPanel from '@/components/EquipmentPanel.vue'
import SidePanel from '@/components/SidePanel.vue'

const store = useBuildStore()
const { visible, message } = useToast()

const banners = computed<{ type: 'warning'; text: string }[]>(() => {
  const S = store.plan
  const out: { type: 'warning'; text: string }[] = []
  if (!store.picks.length) return out
  if (!S.feasibleSockets) {
    out.push({
      type: 'warning',
      text: `A build pede ${S.D} sockets, mas o gear só tem ${S.totalSocketsAll}. Suba o tier da Victory Wine ou reduza os alvos.`,
    })
  } else if (S.shapeBlocked && S.shapeBlocked.length) {
    const who = S.shapeBlocked.map((r) => r.name).join(', ')
    const semAmostra = S.shapeBlocked.some((r) => r.blockedBy === 'unknown')
    out.push({
      type: 'warning',
      text: semAmostra
        ? `Faltou socket utilizável para ${who}: sobraram ${S.unknownSockets} socket(s) cujo formato ainda não foi amostrado no catálogo, e o plano não encaixa gema em socket que não sabe se aceita. Amostre o "Slot Type" dessas listagens para liberá-los.`
        : `Sobrou socket, mas do formato errado para ${who}. A gema desse affix só entra em certos formatos — troque a peça por uma com o socket certo.`,
    })
  } else if (!S.feasible) {
    const missing = S.results.filter((r) => r.short > 0).map((r) => `${r.name} (falta ${r.short})`).join(', ')
    out.push({ type: 'warning', text: `Não coube tudo: ${missing}. Ajuste a Wine ou a prioridade.` })
  }
  return out
})

onMounted(store.startHashSync)
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="py-4" style="max-width: 1240px">
        <header class="d-flex align-center justify-space-between flex-wrap ga-4 mb-3">
          <div class="d-flex align-center ga-3">
            <v-avatar color="primary" rounded="lg" size="30">
              <span class="text-label-large font-weight-bold">G</span>
            </v-avatar>
            <div>
              <h1 class="text-title-medium font-weight-bold">Gyldsmith</h1>
              <div class="text-label-small text-medium-emphasis">
                <strong class="text-high-emphasis">Mistfall Hunter</strong> · diga os affixes que quer — o app acha as
                peças <strong class="text-high-emphasis">mais baratas</strong> pra montar
              </div>
            </div>
          </div>

          <div class="d-flex ga-2">
            <v-btn size="small" prepend-icon="$link" title="Copiar link da build" @click="store.share">
              Copiar link
            </v-btn>
            <v-btn size="small" prepend-icon="$reset" title="Limpar build" @click="store.reset">Reset</v-btn>
          </div>
        </header>

        <v-alert v-for="(b, i) in banners" :key="i" :type="b.type" class="mb-2">{{ b.text }}</v-alert>

        <v-row density="comfortable">
          <v-col cols="12" md="7">
            <EquipmentPanel />
          </v-col>

          <v-col cols="12" md="5">
            <SidePanel />
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-snackbar v-model="visible" :timeout="1900" location="bottom" rounded="pill">
      {{ message }}
    </v-snackbar>
  </v-app>
</template>
