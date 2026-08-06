import { affix, gemFor } from '@/utils/game'
import type { BoughtPiece, Plan, Verdict } from '@/types'

export function verdictFor(pc: BoughtPiece, plan: Plan): Verdict | null {
  if (!pc.preset) {
    const best = plan.presetHunt[0]
    if (!best) return null
    if (best.unit == null) {
      return {
        ok: null,
        color: 'info',
        label: 'crua · melhor oferta',
        text: `Nenhuma listagem presetada deste slot compensa. O alvo em aberto é ${best.name}, mas a gema dele ainda não tem preço mapeado — não dá pra quantificar a troca.`,
      }
    }
    const ceiling = pc.rawPrice + best.unit
    return {
      ok: null,
      color: 'info',
      label: `crua · teto ${ceiling} g`,
      text: `Comprada crua a ${pc.price} g: no catálogo atual nenhuma listagem presetada deste slot sai por menos. Se aparecer uma com preset ${best.name} por até ${ceiling} g (crua ${pc.rawPrice} + gema ${best.unit}), ela passa a ser a melhor.`,
    }
  }

  const name = affix(pc.preset)?.name ?? pc.preset

  if (pc.presetGross == null) {
    return {
      ok: true,
      color: 'success',
      label: 'preset · poupa 1 gema',
      text: `Listagem com ${name} de fábrica por ${pc.price} g (crua sai ${pc.rawPrice} g). Dispensa 1 gema de ${name}, mas essa gema ainda não tem preço mapeado — a economia é real e não dá pra cravar em gold.`,
    }
  }

  const gem = gemFor(pc.preset)
  const gemName = gem ? gem.name : name
  const saving = pc.presetSaving ?? 0
  const sign = saving >= 0 ? '−' : '+'
  return {
    ok: saving > 0,
    color: saving > 0 ? 'success' : 'warning',
    label: `preset ${name} · ${sign}${Math.abs(saving)} g`,
    text: `Custa ${pc.premium} g a mais que a crua deste slot (${pc.rawPrice} g) e dispensa 1 ${gemName} (${pc.presetGross} g) — saldo de ${saving} g. Foi por isso que entrou no lugar da peça crua.`,
  }
}
