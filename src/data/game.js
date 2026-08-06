/* =========================================================================
   GAME — base de dados editável. Toda mudança de patch começa AQUI.
   Reflete guias da open beta (29/07/2026); valores a confirmar no jogo.
   ========================================================================= */
export const GAME = {
  // --- Parâmetros globais ---
  thresholdLevel: 5, // nível que desbloqueia o bônus extra (objetivo central)
  maxActiveAffixes: 5, // máximo de affixes distintos ativos ao mesmo tempo
  maxGemLevel: 1, // cada gema/socket entrega +1 no affix (confirmado pós-launch)
  maxTarget: 9, // nível-alvo máximo selecionável por affix
  maxPresetsPerPiece: 1, // uma peça traz no máximo 1 affix de fábrica (ver slots[])

  // Quantas peças com o MESMO affix de fábrica o plano pode contar. O preset é
  // um roll aleatório: dá pra achar uma peça com o affix que você quer, duas com
  // sorte — cinco, ao preço da presetada mais barata do slot, é fantasia. Sem
  // este teto o plano trocava quase toda gema por preset e prometia uma compra
  // que não existe na Auction House. Suba se o seu mercado for mais fundo.
  maxPresetPerAffix: 2,

  classes: [
    { id: 'mercenary', name: 'Mercenary', role: 'Bruiser · escudo & bloqueio' },
    { id: 'blackarrow', name: 'Blackarrow', role: 'Ranger · dano físico à distância' },
    { id: 'sorcerer', name: 'Sorcerer', role: 'Caster · dano elemental' },
    { id: 'shadowstrix', name: 'Shadowstrix', role: 'Assassino · burst & mobilidade' },
    { id: 'seer', name: 'Seer', role: 'Suporte · cura & controle' },
    { id: 'witheredknight', name: 'Withered Knight', role: 'Tank sombrio · dreno de vida' },
  ],

  // =========================================================================
  // 8 slots — nomes confirmados pelo menu da Auction House.
  //
  // CATÁLOGO REAL (`listings`). O jogo NÃO vende "uma peça genérica em que
  // você escolhe o preset": a Auction House tem um número FINITO de listagens
  // concretas, e é entre elas que o plano tem de escolher. Por isso não existe
  // mais "preço médio do slot" nem "prêmio de preset" estimado — o prêmio é
  // simplesmente a diferença de preço entre duas listagens reais.
  //
  // RARIDADE DESTE CATÁLOGO: **Rare** (o azul dos prints). A escala do jogo é
  // Common → Excellent → Rare → Epic → Legendary — atenção que **Excellent fica
  // ABAIXO de Rare**, ao contrário do costume. As peças de Mercenary por tier:
  //    Excellent  Fine Iron Sword and Shield · Military Hammer · Veteran
  //               Helmet/Armor/Bracers/Pants/Boots · Warrior Pendant ·
  //               Hunter's Ring (acessório não é class-specific)
  //    Rare       Studded Sword and Shield · Fearless {Helmet,Breastplate,
  //               Bracers,Pants,Boots} · Dominance Amulet · Retribution Ring
  // Trocar de tier = re-amostrar as listagens na AH (preço, qty, formatos e
  // preset mudam); os nomes acima são só o alvo da busca. Fonte dos nomes:
  // mistfallhunterwiki.org/armor + /accessories e gmtreks (lista de armas).
  //
  // Cada listagem tem exatamente 2 slots, em uma de duas formas (conferido nos
  // prints de ago/2026, raridade Rare):
  //    [ affix presetado | socket ]  → +1 rank grátis daquele affix + 1 socket
  //    [ socket   socket ]           → peça crua, 2 sockets de gema
  // Nunca aparece peça com 2 presets nem com 3 slots — daí `sockets: 2` e
  // `maxPresetsPerPiece: 1`.
  //
  // PRESET POSSÍVEL NAQUELA BASE — `presetPool: ['aegis', …]` (opcional) trava
  // quais affixes aquele item pode trazer de fábrica. O pool de src/data/pools.js
  // é por SLOT (o que a wiki publica); se você vir no jogo que a base específica
  // — "Fearless Helmet", por exemplo — rola menos que o slot inteiro, liste aqui
  // e o solver para de propor o resto. Ausente = usa o pool do slot.
  //
  //   price   gold pedido na listagem
  //   qty     unidades à venda (o "x285" do print) — disponibilidade, não custo
  //   preset  affix de fábrica:
  //             null          → peça crua (2 sockets)
  //             '<affixId>'   → preset identificado
  //             '?'           → TEM preset, mas o ícone não foi identificado
  //   shapes  formato dos sockets vazios (filtro "Slot Type" da AH). Leitura
  //           best-effort dos prints; o solver trata todo socket como
  //           intercambiável, então isto ainda não afeta nenhum resultado.
  //
  // ⚠️ PRESET '?' É INÚTIL PARA O SOLVER: uma peça com preset não identificado
  // tem 1 socket e nenhum rank aproveitável, ou seja, é estritamente pior que
  // a peça crua — o plano nunca a escolhe. Identificar os ícones é o que
  // destrava a economia de preset. O jeito confiável é o filtro "Affix
  // Effects" da própria AH: escolha um affix e a lista mostra só os presets
  // dele, já rotulados. Ver README.
  //
  // Amuleto/Anel: os prints estavam filtrados por Primary Attribute = Physical
  // Damage, então só saiu a base Dominance/Retribution. As outras bases do pool
  // (Benediction, Woodling Guardian) ainda não foram amostradas.
  // =========================================================================
  slots: [
    {
      id: 'weapon',
      name: 'Arma · Sword & Shield',
      sockets: 2,
      base: 'Studded Sword and Shield',
      listings: [
        { price: 146, qty: 285, preset: null, shapes: ['bar', 'circ'] },
        { price: 206, qty: 64, preset: '?', shapes: ['circ'] },
        { price: 208, qty: 123, preset: '?', shapes: ['sq'] },
        { price: 218, qty: 66, preset: '?', shapes: ['circ'] },
        { price: 221, qty: 70, preset: '?', shapes: ['tri'] },
        { price: 223, qty: 122, preset: '?', shapes: ['sq'] },
        { price: 225, qty: 63, preset: null, shapes: ['bar', 'sq'] },
        { price: 242, qty: 92, preset: '?', shapes: ['tri'] },
        { price: 250, qty: 93, preset: '?', shapes: ['bar'] },
      ],
    },
    {
      id: 'helm',
      name: 'Elmo · Head',
      sockets: 2,
      base: 'Fearless Helmet',
      listings: [
        { price: 170, qty: 110, preset: '?', shapes: ['sq'] },
        { price: 174, qty: 161, preset: '?', shapes: ['bar'] },
        { price: 179, qty: 200, preset: '?', shapes: ['bar'] },
        { price: 181, qty: 97, preset: '?', shapes: ['circ'] },
        { price: 184, qty: 107, preset: null, shapes: ['tri', 'circ'] },
        { price: 188, qty: 121, preset: '?', shapes: ['tri'] },
        { price: 189, qty: 114, preset: null, shapes: ['tri', 'sq'] },
        { price: 194, qty: 267, preset: '?', shapes: ['sq'] },
        { price: 204, qty: 67, preset: '?', shapes: ['tri'] },
      ],
    },
    {
      id: 'chest',
      name: 'Peitoral · Clothes',
      sockets: 2,
      base: 'Fearless Breastplate',
      listings: [
        { price: 176, qty: 86, preset: null, shapes: ['bar', 'circ'] },
        { price: 190, qty: 108, preset: null, shapes: ['tri', 'sq'] },
        { price: 193, qty: 110, preset: '?', shapes: ['tri'] },
        { price: 198, qty: 191, preset: '?', shapes: ['circ'] },
        { price: 199, qty: 105, preset: '?', shapes: ['sq'] },
        { price: 199, qty: 310, preset: '?', shapes: ['sq'] },
        { price: 213, qty: 124, preset: '?', shapes: ['bar'] },
        { price: 219, qty: 76, preset: '?', shapes: ['bar'] },
        { price: 219, qty: 173, preset: '?', shapes: ['circ'] },
      ],
    },
    {
      id: 'gloves',
      name: 'Luvas · Gauntlets',
      sockets: 2,
      base: 'Fearless Bracers',
      listings: [
        { price: 155, qty: 108, preset: '?', shapes: ['circ'] },
        { price: 160, qty: 284, preset: '?', shapes: ['circ'] },
        { price: 160, qty: 81, preset: '?', shapes: ['tri'] },
        { price: 161, qty: 111, preset: '?', shapes: ['bar'] },
        { price: 162, qty: 236, preset: '?', shapes: ['tri'] },
        { price: 163, qty: 118, preset: '?', shapes: ['bar'] },
        { price: 169, qty: 87, preset: '?', shapes: ['sq'] },
        { price: 174, qty: 116, preset: null, shapes: ['sq', 'circ'] },
        { price: 203, qty: 91, preset: null, shapes: ['tri', 'sq'] },
      ],
    },
    {
      id: 'pants',
      name: 'Calças · Pants',
      sockets: 2,
      base: 'Fearless Pants',
      // ⚠ PALPITE — os presets deste slot foram lidos dos ícones (~16 px) de um
      // print da AH de OUTRA amostragem, e casados com estas listagens pelo
      // formato do socket, em ordem de preço. Duas camadas de incerteza:
      // o ícone e o pareamento. Reverter: trocar por '?' as linhas marcadas
      // com `PALPITE` (grep). Confirmar no jogo com o filtro "Affix Effects".
      listings: [
        { price: 178, qty: 106, preset: null, shapes: ['tri', 'circ'] },
        { price: 180, qty: 88, preset: 'spiritshield', shapes: ['tri'] }, // PALPITE (escudo com miolo marcado)
        { price: 182, qty: 194, preset: 'ethereal', shapes: ['bar'] }, // PALPITE (forma com asa)
        { price: 184, qty: 104, preset: 'aegis', shapes: ['bar'] }, // PALPITE (escudo liso)
        { price: 186, qty: 66, preset: 'tenacious', shapes: ['circ'] }, // PALPITE (coração com cruz)
        { price: 189, qty: 120, preset: 'distantward', shapes: ['bar'] }, // PALPITE (farpas para fora)
        { price: 192, qty: 161, preset: 'bulwark', shapes: ['sq'] }, // PALPITE (disco com rebites)
        { price: 194, qty: 182, preset: '?', shapes: ['sq'] }, // sem linha correspondente no print
        { price: 194, qty: 256, preset: null, shapes: ['sq', 'circ'] },
      ],
    },
    {
      id: 'boots',
      name: 'Botas · Boots',
      sockets: 2,
      base: 'Fearless Boots',
      listings: [
        { price: 146, qty: 118, preset: null, shapes: ['bar', 'sq'] },
        { price: 155, qty: 74, preset: '?', shapes: ['sq'] },
        { price: 155, qty: 73, preset: '?', shapes: ['bar'] },
        { price: 157, qty: 117, preset: '?', shapes: ['circ'] },
        { price: 160, qty: 133, preset: '?', shapes: ['tri'] },
        { price: 167, qty: 106, preset: '?', shapes: ['tri'] },
        { price: 170, qty: 92, preset: '?', shapes: ['tri'] },
        { price: 171, qty: 64, preset: null, shapes: ['sq', 'circ'] },
        { price: 255, qty: 72, preset: '?', shapes: ['bar'] },
      ],
    },
    {
      id: 'amulet',
      name: 'Amuleto · Necklace',
      sockets: 2,
      base: 'Dominance Amulet',
      listings: [
        { price: 163, qty: 104, preset: null, shapes: ['circ', 'sq'] },
        { price: 172, qty: 113, preset: null, shapes: ['bar', 'sq'] },
        { price: 193, qty: 146, preset: null, shapes: ['tri', 'circ'] },
      ],
    },
    {
      id: 'ring',
      name: 'Anel · Ring',
      sockets: 2,
      base: 'Retribution Ring',
      listings: [
        { price: 180, qty: 97, preset: null, shapes: ['bar', 'sq'] },
        { price: 198, qty: 160, preset: null, shapes: ['circ', 'sq'] },
        { price: 219, qty: 115, preset: null, shapes: ['tri', 'circ'] },
      ],
    },
  ],

  // Affixes — LISTA COMPLETA pós-lançamento (32 affixes), conferida em
  // metamist.io/affixes + mistfallhunters.wiki (ago/2026). cat: offense|defense|utility
  // (buckets do jogo mapeados: Damage→offense; Survival/Support→defense; Resource/Mobility/Debuff→utility).
  // Confirme no jogo (camp/socket UI) — pode mudar por patch.
  affixes: [
    // — Ofensivos (Damage) —
    { id: 'valor', name: 'Valor', cat: 'offense', desc: 'Aumenta ataque; penetração de defesa em nível alto.' },
    { id: 'ranged', name: 'Ranged', cat: 'offense', desc: 'Mais dano à distância; estende o alcance efetivo.' },
    { id: 'skypiercer', name: 'Sky Piercer', cat: 'offense', desc: 'Mais dano em skills aéreas; reduz custo de energia.' },
    { id: 'fervor', name: 'Fervor', cat: 'offense', desc: 'Dano acumulável após acertos; penetração no nível 5+.' },
    { id: 'strife', name: 'Strife', cat: 'offense', desc: 'Mais dano de arma corpo-a-corpo; stacks por inimigo próximo.' },
    { id: 'fervid', name: 'Fervid', cat: 'offense', desc: 'Mais dano com vida acima de 70%; reduz custo de energia.' },
    { id: 'wrath', name: 'Wrath', cat: 'offense', desc: 'Mais dano com vida baixa; ataque no nível 5+.' },
    { id: 'burst', name: 'Burst', cat: 'offense', desc: 'Aumenta o dano de Wither Execution (Withered Knight).' },
    { id: 'smiting', name: 'Smiting', cat: 'offense', desc: 'Recupera energia em crítico; reduz cooldowns no nível 4+.' },

    // — Defensivos (Survival / Support) —
    { id: 'aegis', name: 'Aegis', cat: 'defense', desc: 'Aumenta defesa; resistência física em nível alto.' },
    { id: 'stoic', name: 'Stoic', cat: 'defense', desc: 'Resistências com vida baixa; restaura vida no nível 5+.' },
    { id: 'tenacious', name: 'Tenacious', cat: 'defense', desc: 'Aumenta vida máxima; bônus de cura depois.' },
    { id: 'unyielding', name: 'Unyielding', cat: 'defense', desc: 'Resistência por inimigo acertado; empilha até 4x.' },
    { id: 'resilience', name: 'Resilience', cat: 'defense', desc: 'Reduz duração de debuffs; resistência após CC.' },
    { id: 'bulwark', name: 'Bulwark', cat: 'defense', desc: 'Mais redução no bloqueio; reduz custo de energia do bloqueio.' },
    { id: 'ironhelmet', name: 'Iron Helmet', cat: 'defense', desc: 'Resistência a dano crítico; reduz impacto de crits.' },
    { id: 'distantward', name: 'Distant Ward', cat: 'defense', desc: 'Resistência a acertos à distância; bloqueia impactos menores.' },
    { id: 'spiritshield', name: 'Spirit Shield', cat: 'defense', desc: 'Aumenta a força do escudo; bônus de resistência mágica.' },
    { id: 'brotherhood', name: 'Brotherhood', cat: 'defense', desc: 'Concede defesa ao time; ataque no nível 5+.' },
    { id: 'ethereal', name: 'Ethereal', cat: 'defense', desc: 'Resistência a dano de queda; imunidade a stagger depois.' },

    // — Utilitários (Resource / Mobility / Support / Debuff) —
    { id: 'eloquence', name: 'Eloquence', cat: 'utility', desc: 'Aumenta velocidade de conjuração; resistência a interrupção depois.' },
    { id: 'seamless', name: 'Seamless', cat: 'utility', desc: 'Recarga de skills mais rápida; reembolso ao derrubar.' },
    // Seeker aparece em ATTACK no menu do jogo, não em Functional (print ago/2026)
    { id: 'seeker', name: 'Seeker', cat: 'offense', desc: 'Velocidade de movimento ao acertar; empilha depois.' },
    { id: 'vitality', name: 'Vitality', cat: 'utility', desc: 'Aumenta energia máxima; imunidade a overdraft no nível 4+.' },
    { id: 'elusive', name: 'Elusive', cat: 'utility', desc: 'Reduz o custo de energia da esquiva a cada nível.' },
    { id: 'curse', name: 'Curse', cat: 'utility', desc: 'Aumenta a duração dos debuffs que você aplica.' },
    { id: 'focused', name: 'Focused', cat: 'utility', desc: 'Aumenta a velocidade de carga; bônus de movimento depois.' },
    { id: 'blessing', name: 'Blessing', cat: 'utility', desc: 'Aumenta a duração dos buffs que você concede.' },
    { id: 'creation', name: 'Creation', cat: 'utility', desc: 'Aumenta a duração de Constructs; bônus de dano no nível 5+.' },
    { id: 'wealth', name: 'Wealth', cat: 'utility', desc: 'Aumenta o Gyldenblod obtido de PvE em dungeons.' },
    { id: 'deft', name: 'Deft', cat: 'utility', desc: 'Velocidade de interação; resistência a interrupção depois.' },
    { id: 'swift', name: 'Swift', cat: 'utility', desc: 'Mais velocidade agachado, mirando e conjurando.' },
  ],

  // Gemas por affix — MENOR preço observado nos prints da Auction House (Affix Gem),
  // já mapeado nome-da-gema → affix via mistfalldb + correspondência de nome.
  // { name: gema mais barata, mat: material, price: gold por gema (+1 no affix) }.
  // Cada affix nível N precisa de N gemas. Affix sem entrada = gema ainda não
  // confirmada (Valor, Aegis, Stoic, …) → o app mostra "gema s/ preço".
  gemPrices: {
    fervid: { name: 'Fervor Amethyst', mat: 'Amethyst', price: 57 },
    wrath: { name: 'Wrath Moonstone', mat: 'Moonstone', price: 61 },
    smiting: { name: 'Crushing Peridot', mat: 'Peridot', price: 55 },
    burst: { name: 'Blast Moonstone', mat: 'Moonstone', price: 62 },
    strife: { name: 'Carnage Onyx', mat: 'Onyx', price: 64 },
    ranged: { name: 'Ranged Power Amethyst', mat: 'Amethyst', price: 91 },
    skypiercer: { name: 'Skyshatter Amethyst', mat: 'Amethyst', price: 45 },
    bulwark: { name: 'Steel Bulwark Agate', mat: 'Agate', price: 54 },
    unyielding: { name: 'Unyielding Amethyst', mat: 'Amethyst', price: 56 },
    resilience: { name: 'Resilience Amethyst', mat: 'Amethyst', price: 82 },
    tenacious: { name: 'Tenacity Agate', mat: 'Agate', price: 86 },
    spiritshield: { name: 'Spellshield Moonstone', mat: 'Moonstone', price: 61 },
    brotherhood: { name: 'Brotherhood Onyx', mat: 'Onyx', price: 45 },
    eloquence: { name: 'Persuasive Peridot', mat: 'Peridot', price: 138 },
    seamless: { name: 'Flawless Peridot', mat: 'Peridot', price: 98 },
    seeker: { name: 'Pursuit Amethyst', mat: 'Amethyst', price: 59 },
    vitality: { name: 'Vitality Amethyst', mat: 'Amethyst', price: 129 },
    elusive: { name: 'Agile Peridot', mat: 'Peridot', price: 147 },
    curse: { name: 'Curseward Amethyst', mat: 'Amethyst', price: 45 },
    focused: { name: 'Focus Onyx', mat: 'Onyx', price: 95 },
    blessing: { name: 'Blessed Peridot', mat: 'Peridot', price: 45 },
    creation: { name: 'Artifice Moonstone', mat: 'Moonstone', price: 55 },
    wealth: { name: 'Fortune Peridot', mat: 'Peridot', price: 45 },
    deft: { name: 'Deft Peridot', mat: 'Peridot', price: 45 },
    swift: { name: 'Haste Moonstone', mat: 'Moonstone', price: 45 },
    distantward: { name: 'Ranged Ward Onyx', mat: 'Onyx', price: 56 },
    // sem gema confirmada: valor, aegis, stoic, fervor, ironhelmet, ethereal.
  },

  // Victory Wine — sistema PÓS-LANÇAMENTO (ago/2026): concede exatamente 2 affixes
  // por run, travados ao confirmar até extrair/morrer. ⚠️ Os nomes de tier e os
  // valores numéricos NÃO são confirmados publicamente — a wiki alerta contra
  // "nomes falsos". Aqui o bônus é modelado como "+N ranks" (0–4) só para o solver;
  // confirme a magnitude real no jogo.
  wineTiers: [
    { id: 'none', name: '— sem Wine —', bonus: 0 },
    { id: 'r1', name: 'Wine · +1 rank', bonus: 1 },
    { id: 'r2', name: 'Wine · +2 ranks', bonus: 2 },
    { id: 'r3', name: 'Wine · +3 ranks', bonus: 3 },
    { id: 'r4', name: 'Wine · +4 ranks', bonus: 4 },
  ],
}

export const CAT = {
  // rótulos como o jogo agrupa no menu de affixes: Attack / Defense / Functional
  offense: { label: 'Ataque', color: 'var(--cat-off)' },
  defense: { label: 'Defesa', color: 'var(--cat-def)' },
  utility: { label: 'Funcional', color: 'var(--cat-uti)' },
}
