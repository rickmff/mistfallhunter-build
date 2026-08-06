import { createPinia } from 'pinia'
import { createSSRApp } from 'vue'
import { createVuetify } from 'vuetify'
import App from '@/App.vue'
import { vuetifyOptions } from '@/plugins/vuetify'
import { useBuildStore } from '@/stores/build'
import type { BuildMode, BuildPick, Plan, WineState } from '@/types'

export interface SmokeSeed {
  cls?: string
  picks?: BuildPick[]
  wine?: WineState
  mode?: BuildMode
}

let store: ReturnType<typeof useBuildStore> | null = null

export function makeApp(seed: SmokeSeed) {
  const pinia = createPinia()
  const app = createSSRApp(App).use(pinia).use(createVuetify({ ...vuetifyOptions, ssr: true }))
  store = useBuildStore(pinia)
  store.$patch(seed)
  return app
}

export function readPlan(): Plan {
  return (store as ReturnType<typeof useBuildStore>).plan
}
