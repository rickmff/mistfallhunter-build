/* Entry só do smoke test (ssr-smoke.mjs): monta o App fora do browser
   para pegar erro de runtime nos templates — o `vite build` só valida sintaxe. */
import { createSSRApp } from 'vue'
import { createVuetify } from 'vuetify'
import App from './src/App.vue'
import { vuetifyOptions } from './src/plugins/vuetify.js'
import { useBuild } from './src/composables/useBuild.js'

export function makeApp(seed) {
  const { state } = useBuild()
  Object.assign(state, seed)
  return createSSRApp(App).use(createVuetify({ ...vuetifyOptions, ssr: true }))
}

/** O gold saiu da tela, mas continua sendo a decisão do solver — o smoke test
    confere o custo pelo plano, já que não dá mais pra procurá-lo no HTML. */
export function readPlan() {
  return useBuild().plan.value
}
