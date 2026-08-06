import { affix, gemFor } from './game.js'

/* =========================================================================
   VEREDITO — explica POR QUE o plano escolheu esta listagem, e não outra do
   mesmo slot. O jogador não escolhe nada aqui: a decisão já foi tomada sobre
   o catálogo real da Auction House. O texto só abre a conta.

   Toda listagem tem 2 slots. A crua traz 2 sockets; a presetada troca 1
   socket por +1 rank de fábrica — e cobra a diferença de preço (`premium`).
   Como o socket que ela tira valeria exatamente 1 gema, a conta é direta:

        ganho = preço da gema dispensada − prêmio da listagem

   Puro: recebe a peça do plano + o plano; devolve { ok, color, label, text }
   ou null quando não há nada a dizer.
   ========================================================================= */
export function verdictFor(pc, plan) {
  // --- peça crua: o plano não achou preset que valesse a pena neste slot ---
  if (!pc.preset) {
    const best = plan.presetHunt[0] // affix em aberto de gema mais cara
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

  const name = affix(pc.preset).name

  // --- preset sem preço de gema mapeado: a economia é real, o valor não ---
  if (pc.presetGross == null) {
    return {
      ok: true,
      color: 'success',
      label: 'preset · poupa 1 gema',
      text: `Listagem com ${name} de fábrica por ${pc.price} g (crua sai ${pc.rawPrice} g). Dispensa 1 gema de ${name}, mas essa gema ainda não tem preço mapeado — a economia é real e não dá pra cravar em gold.`,
    }
  }

  const gemName = gemFor(pc.preset).name
  const sign = pc.presetSaving >= 0 ? '−' : '+'
  return {
    ok: pc.presetSaving > 0,
    color: pc.presetSaving > 0 ? 'success' : 'warning',
    label: `preset ${name} · ${sign}${Math.abs(pc.presetSaving)} g`,
    text: `Custa ${pc.premium} g a mais que a crua deste slot (${pc.rawPrice} g) e dispensa 1 ${gemName} (${pc.presetGross} g) — saldo de ${pc.presetSaving} g. Foi por isso que entrou no lugar da peça crua.`,
  }
}
