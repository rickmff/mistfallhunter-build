/* Smoke test de render: `node ssr-smoke.mjs`.
   Renderiza o App fora do browser em vários estados (vazio, com presets bons,
   com presets inúteis, inviável) e falha se algum template estourar. */
import { createServer } from 'vite'
import { renderToString } from 'vue/server-renderer'

/* `expect` = trechos que TÊM de sair no HTML — garante que o veredito de preset
   chegou na tela, não só que o componente não estourou. */
const CASES = {
  vazio: { seed: { picks: [] }, expect: ['Escolha os affixes'] },
  'presets úteis': {
    seed: {
      picks: [
        { id: 'elusive', lvl: 5 },
        { id: 'eloquence', lvl: 5 },
        { id: 'skypiercer', lvl: 5 },
      ],
      wine: { tier: 'r4', a1: 'eloquence', a2: 'elusive' },
      mode: 'full',
      presets: { boots: 'elusive', gloves: 'eloquence', amulet: 'skypiercer' },
    },
    // 147 (Agile Peridot) + 138 (Persuasive Peridot) + 45 (Skyshatter) = 330
    expect: ['compensa · −147 g', 'compensa · −138 g', 'presets poupam 330 g'],
  },
  // no modo "mínimo" a peça de preset inútil simplesmente não é comprada;
  // é no modo completo (8 slots obrigatórios) que o socket queimado aparece.
  'preset inútil': {
    seed: {
      picks: [
        { id: 'elusive', lvl: 4 }, // fechado pela wine → preset nele é redundante
        { id: 'skypiercer', lvl: 3 },
      ],
      wine: { tier: 'r4', a1: 'elusive', a2: '' },
      mode: 'full',
      presets: { boots: 'elusive', gloves: 'wealth' }, // covered + fora da build
    },
    expect: ['não compensa · socket perdido', '2 preset(s) sem efeito'],
  },
  'wine cobre tudo': {
    seed: { picks: [{ id: 'elusive', lvl: 4 }], wine: { tier: 'r4', a1: 'elusive', a2: '' }, mode: 'full' },
    expect: ['Nada em aberto'],
  },
  'gema s/ preço': {
    seed: { picks: [{ id: 'valor', lvl: 3 }], mode: 'min', presets: { boots: 'valor' } },
    expect: ['compensa · poupa 1 gema', 'valor s/ preço'],
  },
  inviável: {
    seed: {
      picks: ['elusive', 'eloquence', 'vitality', 'seamless', 'focused'].map((id) => ({ id, lvl: 9 })),
      mode: 'min',
    },
    expect: ['Suba o tier da Victory Wine'],
  },
}

// jsdom-free: o App só toca em location/history no onMounted, que o SSR não roda.
globalThis.location = { hash: '', href: 'http://localhost/' }
globalThis.history = { replaceState() {} }

/** O SSR escapa os textos; desescapa pra poder procurar "−147 g" e afins. */
const decodeEntities = (s) =>
  s.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, (m) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" })[m])

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  // sem isso o Node tenta importar os .css do Vuetify direto e estoura
  ssr: { noExternal: [/vuetify/] },
})
let failed = 0

try {
  const { makeApp } = await server.ssrLoadModule('/ssr-smoke-entry.js')
  for (const [name, { seed, expect }] of Object.entries(CASES)) {
    try {
      const base = { cls: 'mercenary', wine: { tier: 'none', a1: '', a2: '' }, mode: 'full', presets: {} }
      const html = decodeEntities(await renderToString(makeApp({ ...base, ...seed })))
      const missing = expect.filter((s) => !html.includes(s))
      if (missing.length) throw new Error(`não renderizou: ${missing.join(' | ')}`)
      console.log(`  ok   ${name.padEnd(16)} ${html.length} chars`)
    } catch (e) {
      failed++
      console.error(`  FAIL ${name.padEnd(16)} ${e.message}`)
    }
  }
} finally {
  await server.close()
}

console.log(failed ? `\n${failed} caso(s) falharam` : '\ntodos os casos renderizaram')
process.exit(failed ? 1 : 0)
