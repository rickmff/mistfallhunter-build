import { createServer } from 'vite'
import { renderToString } from 'vue/server-renderer'

const CASES = {
  vazio: { seed: { picks: [] }, expect: ['Escolha os affixes'] },
  'plano completo': {
    seed: {
      picks: [
        { id: 'elusive', lvl: 5 },
        { id: 'eloquence', lvl: 5 },
        { id: 'skypiercer', lvl: 5 },
      ],
      wine: { tier: 'brew', points: { eloquence: 2, elusive: 2 } },
      mode: 'full',
    },
    expect: ['PROCURAR', 'Eloquence'],
    total: 1825,
  },
  'wine cobre tudo': {
    seed: {
      picks: [{ id: 'elusive', lvl: 2 }],
      wine: { tier: 'blood', points: { elusive: 2 } },
      mode: 'full',
    },
    expect: ['Lv.2'],
    total: 1347,
  },
  'bebida fora da build': {
    seed: {
      picks: [{ id: 'skypiercer', lvl: 3 }],
      wine: { tier: 'tonic', points: { deft: 1 } },
      mode: 'min',
    },
    expect: ['Deft', 'só bebida'],
    total: 355,
  },
  'mínimo compra o mais barato': {
    seed: { picks: [{ id: 'skypiercer', lvl: 3 }], mode: 'min' },
    expect: ['PROCURAR', 'Sky Piercer'],
    total: 355,
  },
  inviável: {
    seed: {
      picks: ['elusive', 'eloquence', 'vitality', 'seamless', 'focused'].map((id) => ({
        id,
        lvl: 9,
      })),
      mode: 'min',
    },
    expect: ['Suba o tier da Victory Wine'],
  },
}

globalThis.location = { hash: '', href: 'http://localhost/' }
globalThis.history = { replaceState() {} }

const decodeEntities = (s) =>
  s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(
      /&amp;|&lt;|&gt;|&quot;|&#39;/g,
      (m) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" })[m],
    )

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  ssr: { noExternal: [/vuetify/] },
})
let failed = 0

try {
  const { makeApp, readPlan } = await server.ssrLoadModule('/ssr-smoke-entry.ts')
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
