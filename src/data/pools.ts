import type { SlotId } from '@/types'

export const PRESET_SLOTS: Record<string, SlotId[]> = {
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

export const canPreset = (slotId: SlotId, affixId: string): boolean => {
  const slots = PRESET_SLOTS[affixId]
  return !slots || slots.includes(slotId)
}
