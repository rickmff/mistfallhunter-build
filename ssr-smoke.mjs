/* Smoke test de render: `node ssr-smoke.mjs`.
   Renderiza o App fora do browser em vários estados (vazio, com presets bons,
   com presets inúteis, inviável) e falha se algum template estourar. */
import { createServer } from 'vite'
import { renderToString } from 'vue/server-renderer'

/* `expect` = trechos que TÊM de sair no HTML — garante que a leitura do plano
   chegou na tela, não só que o componente não estourou.
   `total`  = grandTotal esperado do plano. O gold não aparece mais na UI, mas
   continua sendo o critério do solver: sem conferi-lo aqui, nada mais garante
   que o plano escolhido é o mais barato.

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
      // Gods Brew: 6 pontos, mas no máximo 2 por affix — 2+2 e sobram 2.
      wine: { tier: 'brew', points: { eloquence: 2, elusive: 2 } },
      mode: 'full',
    },
    // O plano usa PRESET HIPOTÉTICO: a AH tem centenas de listagens por slot,
    // então para cada affix da build entra uma peça presetada cotada pela
    // presetada mais barata daquele slot — marcada como "procurar".
    // São 4, não 5: o plano não conta com mais de GAME.maxPresetPerAffix peças
    // do mesmo preset (achar 5 iguais é fantasia).
    expect: ['PROCURAR', 'Eloquence'],
    // 1825, e não os 1474 de antes, porque a bebida encolheu duas vezes: o tier
    // deixou de ser "+N ranks em 2 slots" e virou orçamento de pontos, e o teto
    // por affix é 2 mesmo no Gods Brew. Onde o antigo "r4" dava 4+4, hoje dá
    // 2+2 — 4 ranks a mais para as gemas pagarem.
    total: 1825,
  },
  // War Blood cobre Elusive 2 inteiro: zero gema, e o gear é só o mais barato
  // de cada slot (146+146+163+174+176+178+180+184 = 1347). Alvo 2 e não mais:
  // o teto da bebida é 2 pontos POR AFFIX mesmo nos tiers altos, então nenhum
  // brew cobre sozinho um alvo 3+.
  'wine cobre tudo': {
    seed: { picks: [{ id: 'elusive', lvl: 2 }], wine: { tier: 'blood', points: { elusive: 2 } }, mode: 'full' },
    expect: ['Lv.2'],
    total: 1347,
  },
  // A bebida não se restringe ao que a build pediu: um ponto em Deft traz o
  // affix para a lista marcado como "só bebida", sem custar socket nem gold —
  // o plano continua sendo o do Sky Piercer sozinho.
  'bebida fora da build': {
    seed: {
      picks: [{ id: 'skypiercer', lvl: 3 }],
      wine: { tier: 'tonic', points: { deft: 1 } },
      mode: 'min',
    },
    expect: ['Deft', 'só bebida'],
    total: 355,
  },
  // (Não há mais caso de "gema s/ preço": desde o catálogo do MistfallDB os 32
  // affixes têm gema mapeada. O caminho continua no código para quando um patch
  // trouxer affix novo, mas não há fixture que o exercite.)
  // Preset ganha da gema: Sky Piercer 3 saía por 599 g (3 peças cruas + 3
  // Skyshatter) e agora sai por 355 g — 2 peças presetadas, com uma gema só.
  // É o caso que prova que o plano prefere peça de fábrica quando ela baixa o
  // total.
  'mínimo compra o mais barato': {
    seed: { picks: [{ id: 'skypiercer', lvl: 3 }], mode: 'min' },
    expect: ['PROCURAR','Sky Piercer'],
    total: 355,
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
  const { makeApp, readPlan } = await server.ssrLoadModule('/ssr-smoke-entry.js')
  for (const [name, { seed, expect, total }] of Object.entries(CASES)) {
    try {
      const base = { cls: 'mercenary', wine: { tier: 'none', points: {} }, mode: 'full' }
      const html = decodeEntities(await renderToString(makeApp({ ...base, ...seed })))
      const missing = expect.filter((s) => !html.includes(s))
      if (missing.length) throw new Error(`não renderizou: ${missing.join(' | ')}`)
      const got = readPlan().grandTotal
      if (total != null && got !== total) throw new Error(`grandTotal ${got}, esperado ${total}`)
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
