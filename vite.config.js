import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  // caminhos relativos: o build roda tanto em subpasta quanto abrindo o arquivo direto
  base: './',
  // autoImport = só os componentes Vuetify realmente usados entram no bundle
  plugins: [vue(), vuetify({ autoImport: true })],
})
