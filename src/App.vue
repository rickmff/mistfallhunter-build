<script setup>
import { computed, onMounted } from 'vue'
import { GAME } from './data/game.js'
import { useBuild } from './composables/useBuild.js'
import { useToast } from './composables/useToast.js'
import EquipmentPanel from './components/EquipmentPanel.vue'
import SidePanel from './components/SidePanel.vue'
import DetailsPanel from './components/DetailsPanel.vue'

const { state, plan, showDetails, share, reset, startHashSync } = useBuild()
const { visible, message } = useToast()

/** Avisos de viabilidade — o de "cap de affixes" pode somar com os outros. */
const banners = computed(() => {
  const S = plan.value
  const out = []
  if (!state.picks.length) return out
  if (S.overCap) {
    out.push({
      type: 'error',
      text: `${S.distinctActive} affixes ativos — o limite é ${GAME.maxActiveAffixes}. Remova ${S.overCapBy} para uma build legal.`,
    })
  }
  if (!S.feasibleSockets) {
    out.push({
      type: 'warning',
      text: `A build pede ${S.D} sockets, mas o gear só tem ${S.totalSocketsAll}. Suba o tier da Victory Wine ou reduza os alvos.`,
    })
  } else if (!S.feasible) {
    const missing = S.results.filter((r) => r.short > 0).map((r) => `${r.name} (falta ${r.short})`).join(', ')
    out.push({ type: 'warning', text: `Não coube tudo: ${missing}. Ajuste a Wine ou a prioridade.` })
  } else if (S.mode === 'full') {
    out.push({
      type: 'success',
      text: `Build completa — comprar ${S.boughtPieces.length} peças (1 por slot); ${S.D}/${S.totalSocketsAll} sockets com gem.`,
    })
  } else {
    out.push({
      type: 'success',
      text: `Plano mínimo — ${S.usedPieces.length} peça(s) cobrem os affixes; ${S.D}/${S.totalSocketsAll} sockets usados.`,
    })
  }
  return out
})

onMounted(startHashSync)
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="py-10" style="max-width: 1240px">
        <!-- ===================== HEADER ===================== -->
        <header class="d-flex align-center justify-space-between flex-wrap ga-5 mb-6">
          <div class="d-flex align-center ga-3">
            <v-avatar color="primary" rounded="lg" size="38">
              <span class="text-title-medium font-weight-bold">G</span>
            </v-avatar>
            <div>
              <h1 class="text-title-large font-weight-bold">Gyldsmith</h1>
              <div class="text-body-small text-medium-emphasis">
                <strong class="text-high-emphasis">Mistfall Hunter</strong> · Diga os affixes que quer — o app acha as
                peças <strong class="text-high-emphasis">mais baratas</strong> pra montar
              </div>
            </div>
          </div>

          <div class="d-flex ga-2">
            <v-btn size="small" prepend-icon="$link" title="Copiar link da build" @click="share">
              Copiar link
            </v-btn>
            <v-btn size="small" prepend-icon="$reset" title="Limpar build" @click="reset">Reset</v-btn>
          </div>
        </header>

        <v-alert v-for="(b, i) in banners" :key="i" :type="b.type" class="mb-3">{{ b.text }}</v-alert>

        <v-row>
          <!-- ====== ESQUERDA: equipamento (peças + valor) ====== -->
          <v-col cols="12" md="7">
            <EquipmentPanel />
          </v-col>

          <!-- ====== DIREITA: ficha (atributos | affixes) ====== -->
          <v-col cols="12" md="5">
            <SidePanel />
          </v-col>
        </v-row>

        <!-- ============ "Detalhes": raio-x do plano ============ -->
        <v-expand-transition>
          <DetailsPanel v-show="showDetails" class="mt-4" />
        </v-expand-transition>

        <!-- ===================== FOOTER ===================== -->
        <footer class="text-body-small text-disabled text-center mx-auto mt-8" style="max-width: 760px">
          Affixes e sistema de Wine conferidos pós-lançamento (ago/2026) em
          <strong class="text-medium-emphasis">mistfallhunters.wiki</strong> e
          <strong class="text-medium-emphasis">mistfallhunter.cc</strong>. Threshold é "geralmente nível 5 ou 6" —
          ajuste <code class="font-mono text-primary">GAME.thresholdLevel</code> se o jogo confirmar 6.<br />
          Preços de peças em <code class="font-mono text-primary">GAME.slots[].market</code> e de gemas em
          <code class="font-mono text-primary">GAME.gemPrices</code> (snapshot da Auction House). Necklace/Ring somam
          bases de Physical Damage + Physical Resistance; Weapon = Sword &amp; Shield. Cada gema dá
          <strong class="text-medium-emphasis">+{{ GAME.maxGemLevel }}</strong> no affix
          (<code class="font-mono text-primary">maxGemLevel: {{ GAME.maxGemLevel }}</code>) — nível
          {{ GAME.thresholdLevel }} exige {{ GAME.thresholdLevel }} sockets, por isso a Victory Wine é essencial. A
          magnitude da Wine segue a confirmar no jogo.
        </footer>
      </v-container>
    </v-main>

    <v-snackbar v-model="visible" :timeout="1900" location="bottom" rounded="pill">
      {{ message }}
    </v-snackbar>
  </v-app>
</template>
