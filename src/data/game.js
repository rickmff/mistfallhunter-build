/* =========================================================================
   GAME — base de dados editável. Toda mudança de patch começa AQUI.

   FONTES (ago/2026, pós-lançamento) e o quanto valem:
     mistfalldb.com/affixes    dados granulares — thresholds por affix, escala
                               (+1,5%/nível) e o ladder da bebida (para no 8).
                               É a fonte mais confiável para número.
     Game Rant / Power Up      únicos a publicar os brews da Tavern (nomes e
       Gaming                  quantidades). Concordam nos nomes, divergem nos
                               números do topo — bem-apoiado, não oficial.
     mistfallhunters.wiki      mecânica sim, número não: recusa-se a publicar
                               nomes de tier e magnitudes, alertando contra
                               "nomes falsos" em circulação.
     metamist.io               ⚠️ auto-declarado "pre-launch beta data" — foi de
                               onde vieram premissas hoje desmentidas (threshold
                               global em 5). Não use sem cruzar.
   ========================================================================= */
export const GAME = {
  // --- Parâmetros globais ---
  // Threshold PADRÃO, usado só para affix que ainda não teve o seu lido.
  // O valor real é por affix (`affixes[].threshold`): a maioria abre o efeito
  // secundário no 7, um grupo no 5, e alguns não têm efeito secundário nenhum.
  thresholdLevel: 5,
  // (não há teto de affixes distintos numa build — o limite real é socket,
  // e disso o solver já cuida: cada peça entrega 2 ranks.)
  maxGemLevel: 1, // cada gema/socket entrega +1 no affix (confirmado pós-launch)
  // Nível-alvo máximo selecionável. O ladder do JOGO vai bem além (a MistfallDB
  // diz que o bônus só capa em +48% no nível 32, com a tabela indo até 40), mas
  // aqui o alvo útil é outro: o maior threshold é 7 e a build inteira entrega
  // 16 ranks de gear (8 peças × 2) + no máximo 8 de bebida. 9 cobre qualquer
  // threshold com folga e mantém a barra de pips legível.
  maxTarget: 9,
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

  // Affixes — os 32 que ROLAM em gear/gema. A MistfallDB define 44, mas diz
  // "32 of them can [roll], the rest are defined but appear on no gear or gem":
  // os 12 de fora são 7 stat-lines (Headshot Damage, Physical Damage Reduction,
  // Reduced Block/Skill Stamina Cost, …) + Powerful, Wise, Lifebane, Siphon e
  // Spirit Spring. Esta lista é exatamente o conjunto que rola — não adicione os
  // outros sem confirmar que passaram a rolar. cat: offense|defense|utility.
  //
  // `threshold` = nível em que o affix ganha o EFEITO SECUNDÁRIO — o alvo real
  // de uma build. NÃO é 5 para todo mundo: a maioria só abre no 7, e um grupo
  // abre no 5 (fonte: mistfalldb.com/affixes, ago/2026, conferido em duas
  // leituras). `threshold: null` = affix sem efeito secundário, só escala linear
  // (+1,5%/nível) — nele não existe "bater o threshold", e a tela não marca pip.
  // GAME.thresholdLevel abaixo é só o padrão para affix novo sem valor lido.
  affixes: [
    // — Ofensivos (Damage) —
    { id: 'valor', name: 'Valor', cat: 'offense', threshold: 7, desc: 'Aumenta ataque; penetração de defesa no nível 7.' },
    { id: 'ranged', name: 'Ranged', cat: 'offense', threshold: 7, desc: 'Mais dano à distância; estende o alcance efetivo no nível 7.' },
    { id: 'skypiercer', name: 'Sky Piercer', cat: 'offense', threshold: 7, desc: 'Mais dano em skills aéreas; reduz custo de energia no nível 7.' },
    { id: 'fervor', name: 'Fervor', cat: 'offense', threshold: 7, desc: 'Dano acumulável após acertos; penetração de defesa no nível 7.' },
    { id: 'strife', name: 'Strife', cat: 'offense', threshold: 7, desc: 'Mais dano de arma corpo-a-corpo; stacks por inimigo próximo no nível 7.' },
    { id: 'fervid', name: 'Fervid', cat: 'offense', threshold: 7, desc: 'Mais dano com vida acima de 70%; reduz custo de energia no nível 7.' },
    { id: 'wrath', name: 'Wrath', cat: 'offense', threshold: 7, desc: 'Mais dano com vida baixa; ataque no nível 7.' },
    { id: 'burst', name: 'Burst', cat: 'offense', threshold: null, desc: 'Aumenta o dano de Wither Execution (Withered Knight). Sem efeito secundário.' },
    { id: 'smiting', name: 'Smiting', cat: 'offense', threshold: 5, desc: 'Recupera energia em crítico; reduz cooldowns no nível 5.' },

    // — Defensivos (Survival / Support) —
    { id: 'aegis', name: 'Aegis', cat: 'defense', threshold: 7, desc: 'Aumenta defesa; resistência física no nível 7.' },
    { id: 'stoic', name: 'Stoic', cat: 'defense', threshold: 7, desc: 'Resistências com vida baixa; restaura vida no nível 7.' },
    { id: 'tenacious', name: 'Tenacious', cat: 'defense', threshold: 7, desc: 'Aumenta vida máxima; bônus de cura no nível 7.' },
    { id: 'unyielding', name: 'Unyielding', cat: 'defense', threshold: 7, desc: 'Resistência por inimigo acertado; empilha até 4x no nível 7.' },
    { id: 'resilience', name: 'Resilience', cat: 'defense', threshold: 5, desc: 'Reduz duração de debuffs de controle; resistências no nível 5.' },
    { id: 'bulwark', name: 'Bulwark', cat: 'defense', threshold: 5, desc: 'Mais redução no bloqueio; reduz custo de energia do bloqueio no nível 5.' },
    { id: 'ironhelmet', name: 'Iron Helmet', cat: 'defense', threshold: 5, desc: 'Resistência a dano crítico; reduz impacto de crits no nível 5.' },
    { id: 'distantward', name: 'Distant Ward', cat: 'defense', threshold: 7, desc: 'Resistência a acertos à distância; bloqueia impactos menores no nível 7.' },
    { id: 'spiritshield', name: 'Spirit Shield', cat: 'defense', threshold: 7, desc: 'Aumenta a força do escudo; resistência mágica no nível 7.' },
    { id: 'brotherhood', name: 'Brotherhood', cat: 'defense', threshold: 7, desc: 'Concede defesa ao time; ataque no nível 7.' },
    { id: 'ethereal', name: 'Ethereal', cat: 'defense', threshold: 5, desc: 'Resistência a dano de queda; imunidade a stagger no nível 5.' },

    // — Utilitários (Resource / Mobility / Support / Debuff) —
    { id: 'eloquence', name: 'Eloquence', cat: 'utility', threshold: 7, desc: 'Aumenta velocidade de conjuração; resistência a interrupção no nível 7.' },
    { id: 'seamless', name: 'Seamless', cat: 'utility', threshold: 7, desc: 'Recarga de skills mais rápida; reembolso ao derrubar no nível 7.' },
    // Seeker aparece em ATTACK no menu do jogo, não em Functional (print ago/2026)
    { id: 'seeker', name: 'Seeker', cat: 'offense', threshold: 5, desc: 'Velocidade de movimento ao acertar; empilha no nível 5.' },
    { id: 'vitality', name: 'Vitality', cat: 'utility', threshold: 5, desc: 'Aumenta energia máxima; imunidade a overdraft no nível 5.' },
    { id: 'elusive', name: 'Elusive', cat: 'utility', threshold: null, desc: 'Reduz o custo de energia da esquiva a cada nível. Sem efeito secundário.' },
    { id: 'curse', name: 'Curse', cat: 'utility', threshold: null, desc: 'Aumenta a duração dos debuffs que você aplica. Sem efeito secundário.' },
    { id: 'focused', name: 'Focused', cat: 'utility', threshold: 7, desc: 'Aumenta a velocidade de carga; bônus de movimento no nível 7.' },
    { id: 'blessing', name: 'Blessing', cat: 'utility', threshold: null, desc: 'Aumenta a duração dos buffs que você concede. Sem efeito secundário.' },
    { id: 'creation', name: 'Creation', cat: 'utility', threshold: 7, desc: 'Aumenta a duração de Constructs; bônus de dano no nível 7.' },
    { id: 'wealth', name: 'Wealth', cat: 'utility', threshold: null, desc: 'Aumenta o Gyldenblod obtido de PvE em dungeons. Sem efeito secundário.' },
    { id: 'deft', name: 'Deft', cat: 'utility', threshold: 5, desc: 'Velocidade de interação; resistência a interrupção no nível 5.' },
    { id: 'swift', name: 'Swift', cat: 'utility', threshold: null, desc: 'Mais velocidade agachado, mirando e conjurando. Sem efeito secundário.' },
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

  // =========================================================================
  // Victory Wine — a bebida da Tavern, tomada ANTES da run. Os affixes travam
  // ao confirmar e valem até extrair ou morrer. É uma das três camadas de affix
  // do lançamento (gear, Victory Wine, Holy Weapon).
  //
  // O TIER NÃO É A MAGNITUDE, É A QUANTIDADE. Cada tier dá um número de PONTOS
  // (= ranks) para distribuir entre os affixes da build; a magnitude por ponto é
  // a mesma escala do gear (+1,5%/nível). `maxPerAffix` é o teto por affix: os
  // dois tiers baixos dão 1 ponto por affix, e o "stacking" de War Blood e Gods
  // Brew vai só até 2 — não é empilhar à vontade.
  //
  //   Mortal Tonic   grátis de craftar        2 pontos   até 1 por affix
  //   Hero's Ale     ingredientes comuns      4 pontos   até 1 por affix
  //   War Blood      ingredientes raros       5 pontos   até 2 por affix
  //   Gods Brew      ingredientes épicos      6 pontos   até 2 por affix
  //
  // Ou seja: o tier alto serve para ESPALHAR bônus por mais affixes, não para
  // estourar um só. Gods Brew = 3 affixes com +2, ou 6 affixes com +1.
  //
  // ⚠️ PROCEDÊNCIA: os nomes e as quantidades vêm de Game Rant e Power Up Gaming
  // (ago/2026), que concordam nos nomes e divergem nos números do topo (o PUG dá
  // faixas: War Blood 5–6, Gods Brew 6–8, e chama a coluna de "Affix Points").
  // A mistfallhunters.wiki se RECUSA a publicar nomes e números, alertando contra
  // "nomes falsos" em circulação — então trate como bem-apoiado, não oficial.
  // Também não é público: em que nível da Tavern cada brew destrava, nem o custo
  // em ingredientes (`cost` abaixo é a descrição qualitativa das fontes).
  wineTiers: [
    { id: 'none', name: '— sem bebida —', points: 0, maxPerAffix: 0, cost: '' },
    { id: 'tonic', name: 'Mortal Tonic', points: 2, maxPerAffix: 1, cost: 'grátis de craftar' },
    { id: 'ale', name: "Hero's Ale", points: 4, maxPerAffix: 1, cost: 'ingredientes comuns' },
    { id: 'blood', name: 'War Blood', points: 5, maxPerAffix: 2, cost: 'ingredientes raros' },
    { id: 'brew', name: 'Gods Brew', points: 6, maxPerAffix: 2, cost: 'ingredientes épicos' },
  ],

  // Teto do ladder da bebida: "Wine buffs use the same +1.5% per level, but their
  // ladder ends at level 8 for +12%" (mistfalldb). Com `maxPerAffix` em 2 este
  // teto não chega a apertar hoje — fica como limite defensivo, e volta a valer
  // se algum patch soltar o stacking.
  wineMaxLevel: 8,
}

export const CAT = {
  // rótulos como o jogo agrupa no menu de affixes: Attack / Defense / Functional
  offense: { label: 'Ataque', color: 'var(--cat-off)' },
  defense: { label: 'Defesa', color: 'var(--cat-def)' },
  utility: { label: 'Funcional', color: 'var(--cat-uti)' },
}
