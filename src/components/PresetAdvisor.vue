<script setup>
import { computed } from 'vue'
import { GAME } from '../data/game.js'
import { affix, catTheme } from '../utils/game.js'
import { useBuild } from '../composables/useBuild.js'

const affixName = (id) => affix(id)?.name || id

/* Leitura do que o solver já decidiu sobre presets — não há botão nem escolha:
   o plano sai ótimo sobre o catálogo real da AH. O que sobra pro jogador é
   saber quanto os presets pouparam e até quanto pagar se aparecer oferta. */
const { plan } = useBuild()

/** Affixes em aberto que valeria a pena achar presetados. */
const hunt = computed(() => plan.value.presetHunt.filter((h) => h.unit != null).slice(0, 3))

/* Affix sem preço de gema fica FORA do ranking — e, pior, fora da decisão: o
   solver mede o preset pela gema que ele dispensa, então gema sem preço vale
   0 e nenhum preset dela é comprado. É cegueira, não indiferença. */
const semPreco = computed(() => plan.value.presetHunt.filter((h) => h.unit == null).map((h) => h.name))
</script>

<template>
  <v-card variant="tonal" color="primary" class="pa-4">
    <div class="text-label-large font-weight-bold">De onde vem a economia</div>
    <div class="text-body-small text-medium-emphasis mb-3">
      Toda peça tem 2 slots. A listagem <strong>crua</strong> traz 2 sockets; a <strong>presetada</strong> troca 1
      socket por <strong>+1 rank de fábrica</strong> — rank que você não compra em gema. A peça presetada entra no
      plano sempre que baratear o <strong>custo total</strong> (peças + gemas), e ela ganha por dois caminhos:
      dispensa a gema daquele rank e, quando o formato do socket é escasso, ainda evita comprar uma peça inteira só
      para ter onde encaixar. Comparação feita sobre as listagens que existem de verdade na Auction House.
    </div>

    <!-- placar dos presets que o plano usou -->
    <div class="d-flex flex-wrap ga-2 mb-3">
      <v-chip size="small" :color="plan.presetUsed ? 'success' : undefined" variant="tonal" class="font-mono">
        {{ plan.presetUsed }} rank(s) de fábrica
      </v-chip>
      <v-chip v-if="plan.presetUsed" size="small" variant="tonal" class="font-mono">
        dispensam {{ plan.presetGross }} g de gema · prêmio {{ plan.premiumCost }} g
      </v-chip>
      <v-chip v-if="plan.presetSlotsFree" size="small" variant="tonal">
        {{ plan.presetSlotsFree }} peça(s) cruas — nenhuma presetada baixava o total
      </v-chip>
    </div>

    <!-- saldo direto negativo não quer dizer erro: a peça presetada pode estar
         no plano por poupar uma PEÇA, não a gema -->
    <div v-if="plan.presetUsed && plan.presetSavings < 0" class="text-body-small text-medium-emphasis mb-3">
      O saldo direto é <strong>−{{ Math.abs(plan.presetSavings) }} g</strong> (o prêmio custa mais que a gema
      dispensada) e mesmo assim compensa: a peça presetada entrega 2 ranks sozinha, e sem ela o plano precisaria
      comprar mais uma peça só para ter socket do formato certo.
    </div>

    <!-- as peças presetadas que o plano manda PROCURAR -->
    <v-alert v-if="plan.toHunt.length" type="info" density="compact" class="mb-3">
      <div class="text-body-small">
        <strong>Procure {{ plan.toHunt.length }} peça(s) presetada(s)</strong> na Auction House, com o filtro
        <strong>“Affix Effects”</strong>:
        <ul class="mt-1">
          <li v-for="c in plan.toHunt" :key="c.id">
            <strong>{{ c.base }}</strong> com preset de <strong>{{ affixName(c.preset) }}</strong> — até
            <span class="font-mono">~{{ c.price }} g</span>
          </li>
        </ul>
        <div class="mt-1">
          O catálogo tem só ~9 listagens amostradas por slot, mas a AH tem centenas: o preço acima é a cotação da
          presetada mais barata daquele slot. Comprando por perto disso, o plano fecha no total mostrado. O plano
          também não conta com mais de <strong>{{ GAME.maxPresetPerAffix }} peças do mesmo preset</strong> — preset é
          roll aleatório, e achar cinco iguais no preço mais barato não acontece.
        </div>
      </div>
    </v-alert>

    <!-- até quanto pagar por uma peça presetada, se aparecer -->
    <template v-if="hunt.length">
      <div class="text-label-small text-uppercase text-medium-emphasis mb-2">Quanto vale cada preset em aberto</div>
      <div class="d-flex flex-column ga-2">
        <v-sheet v-for="h in hunt" :key="h.id" color="surface-light" class="d-flex align-center ga-3 px-3 py-2">
          <div class="cat-bar" :class="`bg-${catTheme(h.cat)}`" />
          <div class="flex-grow-1" style="min-width: 0">
            <div class="text-body-medium font-weight-bold">{{ h.name }}</div>
            <div class="text-body-small text-disabled">
              {{ h.gemName }} · {{ h.openPts }} rank(s) ainda em gema
            </div>
          </div>
          <div class="text-right text-no-wrap">
            <div class="text-label-large font-weight-bold font-mono text-success">+{{ h.unit }} g</div>
            <div class="text-label-small text-disabled font-mono">
              teto: {{ h.ceilings[0].name.split('·')[0].trim() }} até {{ h.ceilings[0].max }} g
            </div>
          </div>
        </v-sheet>
      </div>
      <div class="text-body-small text-disabled mt-2">
        Cada preset desses dispensa 1 gema, então vale pagar <strong>no mínimo</strong> preço da peça crua daquele slot
        + preço da gema. Pode valer mais: se o socket que a build precisa for escasso, a peça presetada também evita
        comprar outra peça — o plano refaz essa conta sozinho quando você marcar o preset no catálogo.
      </div>
    </template>

    <div v-else-if="!plan.presetHunt.length" class="text-body-small text-disabled">
      Nada em aberto: Wine e presets já fecham todos os alvos.
    </div>

    <!-- gema sem preço = preset invisível para a decisão, não só para o ranking -->
    <div v-if="semPreco.length" class="text-body-small text-warning mt-2">
      <strong>{{ semPreco.join(', ') }}</strong> {{ semPreco.length > 1 ? 'ficam' : 'fica' }} fora desta conta: sem
      preço de gema em <code class="font-mono">data/gems.js</code>, o preset deles vale 0 para o solver e nunca é
      comprado — mesmo que na prática seja a gema mais cara da build.
    </div>
  </v-card>
</template>
