/* =========================================================================
   CATÁLOGO DE GEMAS — Auction House › Affix Gem, Gem Tier I (ago/2026).
   Lido dos 4 prints da AH: nome, material, preço da listagem mais barata e
   quantidade à venda. A lista da AH sai ordenada por preço crescente.

   O MATERIAL É O FORMATO. O filtro "Gem Type" tem exatamente 4 ícones e cada
   material desenha um deles — é por isso que socket tem formato:

       Agate / Onyx  →  retângulo vermelho   (bar)
       Amethyst      →  triângulo roxo       (tri)
       Moonstone     →  quadrado ciano       (sq)
       Peridot       →  octógono verde       (hex)

   UM AFFIX TEM VÁRIAS GEMAS — uma por formato, com preços bem diferentes
   (Warspirit Amethyst 55 vs Warspirit Moonstone 151). Então "o preço da gema
   de X" depende do socket em que ela vai entrar, e é isso que o solver usa.

   O PAR gema → affix veio do banco do MistfallDB (mistfalldb.com/gems), que
   fecha os casos em que o nome não entrega o affix. Três desses contrariavam o
   palpite pelo nome e teriam entrado errado — os três foram CONFERIDOS NO JOGO:
     Fervor Amethyst/Onyx → FERVID (não Fervor)   Warspirit → FERVOR
     Lightfoot Moonstone  → ETHEREAL              Impenetrable → SEAMLESS
   Com isso os 32 affixes têm gema e nenhum custo de build fica em aberto.
   ========================================================================= */
export const GEMS = [
  // ---- retângulo vermelho (Agate / Onyx) ----
  { name: 'Steel Bulwark Agate', mat: 'Agate', shape: 'bar', price: 45, qty: 330, affix: 'bulwark' },
  { name: 'Iron Helm Agate', mat: 'Agate', shape: 'bar', price: 45, qty: 363, affix: 'ironhelmet' },
  { name: 'Skyshatter Onyx', mat: 'Onyx', shape: 'bar', price: 45, qty: 416, affix: 'skypiercer' },
  { name: 'Ranged Ward Onyx', mat: 'Onyx', shape: 'bar', price: 45, qty: 444, affix: 'distantward' },
  { name: 'Carnage Onyx', mat: 'Onyx', shape: 'bar', price: 55, qty: 565, affix: 'strife' },
  { name: 'Brotherhood Onyx', mat: 'Onyx', shape: 'bar', price: 56, qty: 392, affix: 'brotherhood' },
  { name: 'Fervor Onyx', mat: 'Onyx', shape: 'bar', price: 58, qty: 586, affix: 'fervid' },
  { name: 'Tenacity Agate', mat: 'Agate', shape: 'bar', price: 78, qty: 410, affix: 'tenacious' },
  { name: 'Focus Onyx', mat: 'Onyx', shape: 'bar', price: 90, qty: 467, affix: 'focused' },
  { name: 'Fortitude Onyx', mat: 'Onyx', shape: 'bar', price: 94, qty: 1193, affix: 'stoic' },
  { name: 'Warding Agate', mat: 'Agate', shape: 'bar', price: 149, qty: 332, affix: 'aegis' },
  { name: 'Resolve Onyx', mat: 'Onyx', shape: 'bar', price: 155, qty: 299, affix: 'valor' },

  // ---- triângulo roxo (Amethyst) ----
  { name: 'Skyshatter Amethyst', mat: 'Amethyst', shape: 'tri', price: 45, qty: 398, affix: 'skypiercer' },
  { name: 'Fervor Amethyst', mat: 'Amethyst', shape: 'tri', price: 45, qty: 435, affix: 'fervid' },
  { name: 'Pursuit Amethyst', mat: 'Amethyst', shape: 'tri', price: 45, qty: 384, affix: 'seeker' },
  { name: 'Curseward Amethyst', mat: 'Amethyst', shape: 'tri', price: 45, qty: 383, affix: 'curse' },
  { name: 'Fortitude Amethyst', mat: 'Amethyst', shape: 'tri', price: 55, qty: 922, affix: 'stoic' },
  { name: 'Warspirit Amethyst', mat: 'Amethyst', shape: 'tri', price: 55, qty: 1329, affix: 'fervor' },
  { name: 'Unyielding Amethyst', mat: 'Amethyst', shape: 'tri', price: 56, qty: 394, affix: 'unyielding' },
  { name: 'Ranged Power Amethyst', mat: 'Amethyst', shape: 'tri', price: 60, qty: 463, affix: 'ranged' },
  { name: 'Wrath Amethyst', mat: 'Amethyst', shape: 'tri', price: 73, qty: 751, affix: 'wrath' },
  { name: 'Resilience Amethyst', mat: 'Amethyst', shape: 'tri', price: 78, qty: 302, affix: 'resilience' },
  { name: 'Vitality Amethyst', mat: 'Amethyst', shape: 'tri', price: 91, qty: 556, affix: 'vitality' },
  { name: 'Resolve Amethyst', mat: 'Amethyst', shape: 'tri', price: 148, qty: 316, affix: 'valor' },

  // ---- quadrado ciano (Moonstone) ----
  { name: 'Spellshield Moonstone', mat: 'Moonstone', shape: 'sq', price: 45, qty: 387, affix: 'spiritshield' },
  { name: 'Artifice Moonstone', mat: 'Moonstone', shape: 'sq', price: 45, qty: 398, affix: 'creation' },
  { name: 'Haste Moonstone', mat: 'Moonstone', shape: 'sq', price: 54, qty: 318, affix: 'swift' },
  { name: 'Wrath Moonstone', mat: 'Moonstone', shape: 'sq', price: 56, qty: 701, affix: 'wrath' },
  { name: 'Unyielding Moonstone', mat: 'Moonstone', shape: 'sq', price: 56, qty: 387, affix: 'unyielding' },
  { name: 'Lightfoot Moonstone', mat: 'Moonstone', shape: 'sq', price: 58, qty: 473, affix: 'ethereal' },
  { name: 'Curseward Moonstone', mat: 'Moonstone', shape: 'sq', price: 61, qty: 478, affix: 'curse' },
  { name: 'Impenetrable Moonstone', mat: 'Moonstone', shape: 'sq', price: 65, qty: 501, affix: 'seamless' },
  { name: 'Unity Moonstone', mat: 'Moonstone', shape: 'sq', price: 70, qty: 394, affix: 'brotherhood' },
  { name: 'Blast Moonstone', mat: 'Moonstone', shape: 'sq', price: 115, qty: 398, affix: 'burst' },
  { name: 'Guardian Moonstone', mat: 'Moonstone', shape: 'sq', price: 141, qty: 383, affix: 'aegis' },
  { name: 'Warspirit Moonstone', mat: 'Moonstone', shape: 'sq', price: 151, qty: 446, affix: 'fervor' },

  // ---- octógono verde (Peridot) ----
  { name: 'Crushing Peridot', mat: 'Peridot', shape: 'hex', price: 45, qty: 443, affix: 'smiting' },
  { name: 'Deft Peridot', mat: 'Peridot', shape: 'hex', price: 45, qty: 498, affix: 'deft' },
  { name: 'Blessed Peridot', mat: 'Peridot', shape: 'hex', price: 45, qty: 458, affix: 'blessing' },
  { name: 'Fortune Peridot', mat: 'Peridot', shape: 'hex', price: 45, qty: 385, affix: 'wealth' },
  { name: 'Farguard Peridot', mat: 'Peridot', shape: 'hex', price: 54, qty: 355, affix: 'distantward' },
  { name: 'Vital Peridot', mat: 'Peridot', shape: 'hex', price: 78, qty: 534, affix: 'vitality' },
  { name: 'Brawling Peridot', mat: 'Peridot', shape: 'hex', price: 100, qty: 616, affix: 'strife' },
  { name: 'Flawless Peridot', mat: 'Peridot', shape: 'hex', price: 104, qty: 462, affix: 'seamless' },
  { name: 'Agile Peridot', mat: 'Peridot', shape: 'hex', price: 144, qty: 423, affix: 'elusive' },
  { name: 'Persuasive Peridot', mat: 'Peridot', shape: 'hex', price: 145, qty: 383, affix: 'eloquence' },
  { name: 'Tenacious Peridot', mat: 'Peridot', shape: 'hex', price: 147, qty: 325, affix: 'tenacious' },
  { name: 'Farstrike Peridot', mat: 'Peridot', shape: 'hex', price: 155, qty: 413, affix: 'ranged' },
]

/** Material → formato do socket (o "Gem Type" da AH tem só estes 4). */
export const MATERIAL_SHAPE = {
  Agate: 'bar',
  Onyx: 'bar',
  Amethyst: 'tri',
  Moonstone: 'sq',
  Peridot: 'hex',
}

/** Gemas de um affix, uma por formato — as não identificadas ficam de fora. */
export const gemsByAffix = (() => {
  const map = {}
  for (const g of GEMS) {
    if (!g.affix) continue
    ;(map[g.affix] || (map[g.affix] = [])).push(g)
  }
  for (const list of Object.values(map)) list.sort((a, b) => a.price - b.price)
  return map
})()
