/* Smoke test de render: `node ssr-smoke.mjs`.
   Renderiza o App fora do browser em vários estados (vazio, com presets bons,
   com presets inúteis, inviável) e falha se algum template estourar. */
import { createServer } from 'vite'
import { renderToString } from 'vue/server-renderer'

/* `expect` = trechos que TÊM de sair no HTML — garante que a leitura do plano
   chegou na tela, não só que o componente não estourou.

   Presets NÃO são mais input: o solver escolhe as listagens do catálogo real.
   Enquanto os ícones de preset do print não forem identificados, todas as
   listagens presetadas estão como '?' e nenhuma entra num plano — daí os
   casos abaixo esperarem peças cruas e o aviso de catálogo incompleto. */
const CASES = {
  vazio: { seed: { picks: [] }, expect: ['Escolha os affixes'] },
  'plano completo': {
    seed: {
      picks: [
        { id: 'elusive', lvl: 5 },
        { id: 'eloquence', lvl: 5 },
        { id: 'skypiercer', lvl: 5 },
      ],
      wine: { tier: 'r4', a1: 'eloquence', a2: 'elusive' },
      mode: 'full',
    },
    // O plano agora usa PRESET HIPOTÉTICO: a AH tem centenas de listagens por
    // slot, então para cada affix da build entra uma peça presetada ao preço da
    // presetada mais barata daquele slot, e a tela manda procurá-la.
    // 4 peças a procurar, não 5: o plano não conta com mais de
    // GAME.maxPresetPerAffix peças do mesmo preset (achar 5 iguais é fantasia).
    expect: ['Procure 4 peça(s) presetada(s)', 'Affix Effects', '1474'],
  },
  'wine cobre tudo': {
    seed: { picks: [{ id: 'elusive', lvl: 4 }], wine: { tier: 'r4', a1: 'elusive', a2: '' }, mode: 'full' },
    expect: ['Nada em aberto'],
  },
  // (Não há mais caso de "gema s/ preço": desde o catálogo do MistfallDB os 32
  // affixes têm gema mapeada. O caminho continua no código para quando um patch
  // trouxer affix novo, mas não há fixture que o exercite.)
  // Preset ganha da gema: Sky Piercer 3 saía por 599 g (3 peças cruas + 3
  // Skyshatter) e agora sai por 355 g — 2 peças presetadas a ~155 g, com uma
  // gema só. É o caso que prova que o plano prefere peça de fábrica quando ela
  // baixa o total.
  'mínimo compra o mais barato': {
    seed: { picks: [{ id: 'skypiercer', lvl: 3 }], mode: 'min' },
    expect: ['~155 g', 'Procure 2 peça(s)', '355'],
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
      const base = { cls: 'mercenary', wine: { tier: 'none', a1: '', a2: '' }, mode: 'full' }
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
