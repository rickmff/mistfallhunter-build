/* =========================================================================
   POOL DE PRESET — em QUE SLOTS cada affix pode vir de fábrica.

   O jogo não gera qualquer preset em qualquer peça, e a regra não é só
   "armadura × arma": é por SLOT. Valor, por exemplo, só existe em colar — o
   plano que sugeria elmo/peitoral/braçadeira com preset de Valor mandava
   comprar item que não existe.

   Fonte: mistfalldb.com/affixes/<affix>, campo "Slots & weapon classes",
   conferido affix a affix (ago/2026). Classes de arma de outras classes
   (Bow, Dagger, Staff…) foram descartadas: o app modela um slot de arma só,
   o Sword and Shield do Mercenary.

   ⚠️ DUAS RESSALVAS, ambas do lado seguro:
   1. O pool diz em que slot o affix PODE rolar — não que exista uma listagem
      à venda agora. Por isso a peça presetada aparece no plano marcada como
      "procurar na AH".
   2. Nenhum affix do banco rola em ANEL, então o plano nunca propõe anel
      presetado. Se o jogo mostrar o contrário, é só acrescentar `ring` aqui.
   ========================================================================= */

/** affix → slots do app em que ele pode vir presetado. */
export const PRESET_SLOTS = {
  // — Ataque —
  valor: ['amulet'],
  wrath: ['chest', 'boots', 'gloves', 'helm', 'amulet', 'weapon'],
  skypiercer: ['boots', 'gloves', 'helm', 'pants', 'amulet'],
  fervid: ['chest', 'gloves', 'boots', 'pants', 'amulet'],
  seeker: ['helm', 'gloves', 'boots', 'pants', 'amulet'],
  ranged: ['chest', 'boots', 'gloves', 'helm', 'amulet'],
  fervor: ['chest', 'boots', 'gloves', 'helm', 'pants', 'amulet'],
  smiting: ['chest', 'boots', 'gloves', 'helm', 'pants', 'amulet'],
  burst: ['boots', 'gloves'],
  strife: ['weapon'],

  // — Defesa —
  aegis: ['chest', 'boots', 'gloves', 'helm', 'pants', 'amulet', 'weapon'],
  tenacious: ['chest', 'boots', 'helm', 'pants', 'amulet', 'weapon'],
  bulwark: ['chest', 'helm', 'pants', 'amulet', 'weapon'],
  ironhelmet: ['chest', 'helm', 'pants', 'amulet'],
  ethereal: ['chest', 'boots'],
  stoic: ['chest', 'boots', 'helm', 'pants', 'amulet', 'weapon'],
  brotherhood: ['gloves', 'helm', 'pants', 'amulet'],
  spiritshield: ['chest', 'boots', 'amulet'],
  unyielding: ['boots'],
  distantward: ['chest', 'helm', 'pants'],
  resilience: ['chest', 'gloves', 'helm'],

  // — Funcional —
  eloquence: ['chest', 'boots', 'gloves', 'helm', 'pants', 'amulet'],
  seamless: ['amulet'],
  vitality: ['chest', 'boots', 'gloves', 'pants', 'amulet', 'weapon'],
  elusive: ['chest', 'boots', 'gloves', 'helm', 'pants', 'amulet'],
  curse: ['chest', 'boots', 'gloves', 'helm', 'pants', 'amulet'],
  focused: ['chest', 'boots', 'gloves', 'amulet'],
  blessing: ['chest', 'helm', 'gloves', 'amulet'],
  creation: ['gloves', 'helm', 'amulet'],
  wealth: ['chest', 'gloves', 'helm'],
  deft: ['boots', 'gloves'],
  swift: ['boots', 'helm', 'pants'],
}

/** Este slot pode vir de fábrica com este affix?
    Affix fora da tabela (patch novo) fica permissivo — melhor perder uma
    restrição que sumir com uma opção sem o jogador saber por quê. */
export const canPreset = (slotId, affixId) => {
  const slots = PRESET_SLOTS[affixId]
  return !slots || slots.includes(slotId)
}
