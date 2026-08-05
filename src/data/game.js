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

  classes: [
    { id: 'mercenary', name: 'Mercenary', role: 'Bruiser · escudo & bloqueio' },
    { id: 'blackarrow', name: 'Blackarrow', role: 'Ranger · dano físico à distância' },
    { id: 'sorcerer', name: 'Sorcerer', role: 'Caster · dano elemental' },
    { id: 'shadowstrix', name: 'Shadowstrix', role: 'Assassino · burst & mobilidade' },
    { id: 'seer', name: 'Seer', role: 'Suporte · cura & controle' },
    { id: 'witheredknight', name: 'Withered Knight', role: 'Tank sombrio · dreno de vida' },
  ],

  // 8 slots — nomes confirmados pelo menu da Auction House.
  // `sockets` = nº TOTAL de slots da peça (preset + sockets de gema).
  //
  // COMBINAÇÕES PERMITIDAS POR PEÇA — conferidas nos listings da Auction House
  // (print de Armor › Clothes, "Fearless Breastplate", raridade azul, ago/2026):
  //    [ affix presetado | socket vazio ]   → 1 preset + 1 gema
  //    [ socket vazio  socket vazio ]       → 0 preset + 2 gemas
  // Nunca aparece peça com 2 affixes presetados nem com 3 slots — daí
  // `maxPresetsPerPiece: 1` e `sockets: 2` em todos os slots (o peitoral, que
  // estava marcado com 3, foi corrigido: as 9 listagens do print mostram 2).
  // O preset ocupa um dos slots, então ele NÃO é socket extra: é uma troca de
  // 1 socket por +1 rank grátis — a base do cálculo de economia do solver.
  //
  // ⚠️ Os sockets têm FORMATO (▭ △ ◻ ⬡ ◯ — é o filtro "Slot Type" da AH). Isso
  // provavelmente restringe qual gema entra em qual socket; o app ainda trata
  // todo socket como intercambiável. Mapear formato → affix é o próximo passo.
  // `market` = leitura de preço da Auction House (tier azul/raro):
  //    vog = valueOfGold (banda 1–5, ver GAME.valueBands) · lo/hi/mid em gold.
  //    null = slot ainda sem amostra de preço.
  // Necklace/Ring = pool de 2 bases por slot (Physical Damage + Physical Resistance/HP):
  //    Amulet = Dominance (163,172,193) + Benediction (170,192,209).
  //    Ring   = Retribution (180,198,219) + Woodling Guardian (176,179,196).
  //    lo/hi/mid calculados sobre o conjunto.
  // Weapon = Studded Sword and Shield (146,206,208,218,221,223,225,242,250).
  slots: [
    { id: 'weapon', name: 'Arma · Sword & Shield', sockets: 2, market: { vog: 4, lo: 146, hi: 250, mid: 221 } },
    { id: 'helm', name: 'Elmo · Head', sockets: 2, market: { vog: 2, lo: 170, hi: 204, mid: 184 } },
    { id: 'chest', name: 'Peitoral · Clothes', sockets: 2, market: { vog: 3, lo: 176, hi: 219, mid: 199 } },
    { id: 'gloves', name: 'Luvas · Gauntlets', sockets: 2, market: { vog: 1, lo: 155, hi: 203, mid: 162 } },
    { id: 'pants', name: 'Calças · Pants', sockets: 2, market: { vog: 3, lo: 178, hi: 194, mid: 186 } },
    { id: 'boots', name: 'Botas · Boots', sockets: 2, market: { vog: 1, lo: 146, hi: 255, mid: 160 } },
    { id: 'amulet', name: 'Amuleto · Necklace', sockets: 2, market: { vog: 2, lo: 163, hi: 209, mid: 182 } },
    { id: 'ring', name: 'Anel · Ring', sockets: 2, market: { vog: 3, lo: 176, hi: 219, mid: 188 } },
  ],

  // --- PRÊMIO DE PRESET ---------------------------------------------------
  // Quanto a MAIS custa, na Auction House, a versão PRESETADA da mesma peça
  // (ex.: "Fearless Helmet [Tenacious | ◻]" vs "Fearless Helmet [◻ ◻]").
  //
  // É a única variável que decide se o preset compensa de verdade:
  //
  //        compensa  ⟺  prêmio < preço da gema que o preset dispensa
  //
  // Até aqui o app assumia prêmio ZERO — todo preset parecia lucro puro pelo
  // valor cheio da gema. O prêmio agora é explícito: `default: 0` mantém o
  // comportamento antigo, mas como PALPITE VISÍVEL e editável na UI, não como
  // premissa escondida no solver. Troque por amostras reais da AH.
  //
  // Resolução (primeiro que existir vence): byAffix → bySlot → default.
  // `default: null` = sem palpite → o app mostra só o TETO (break-even) e não
  // afirma economia nenhuma em gold.
  presetPremium: {
    default: 0, // ⚠️ ASSUMIDO, não amostrado. Ver comentário acima.
    byAffix: {}, // { tenacious: 90 } — prêmio pago por um preset desse affix
    bySlot: {}, // { helm: 40 } — prêmio médio desse slot, qualquer affix
  },

  // Bandas de valueOfGold — derivadas do range observado na Auction House (146–255g).
  // Absolutas em gold, comparáveis entre slots. `max` = teto (inclusivo) da banda.
  valueBands: [
    { vog: 1, max: 164, label: 'Barato', color: '#6fbf8f' },
    { vog: 2, max: 184, label: 'Médio-baixo', color: '#9fbf5a' },
    { vog: 3, max: 204, label: 'Médio', color: '#d9b45b' },
    { vog: 4, max: 224, label: 'Alto', color: '#e6a94e' },
    { vog: 5, max: Infinity, label: 'Premium', color: '#d8586b' },
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
    { id: 'seeker', name: 'Seeker', cat: 'utility', desc: 'Velocidade de movimento ao acertar; empilha depois.' },
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
  offense: { label: 'Ofensivo', color: 'var(--cat-off)' },
  defense: { label: 'Defensivo', color: 'var(--cat-def)' },
  utility: { label: 'Utilitário', color: 'var(--cat-uti)' },
}
