import { affix, gemFor } from './game.js'

/* =========================================================================
   VEREDITO — responde "compro a peça PRESETADA ou a CRUA?".

   O preset gasta 1 dos sockets da peça e devolve +1 rank; como cada gema
   também vale +1, o saldo de sockets não muda — o preset simplesmente
   dispensa 1 gema. Só que a peça presetada custa um PRÊMIO sobre a crua na
   Auction House, então a conta é uma subtração:

        ganho líquido = preço da gema dispensada − prêmio da peça

   e o break-even é direto: vale pagar até o preço da gema a mais. Acima
   disso, peça crua + gema sai mais barato. E o preset ainda pode ser perda
   total — affix fora da build ou alvo já fechado — aí paga-se o prêmio e
   queima-se um socket sem receber rank nenhum.

   Puro: recebe a peça do plano + o plano; devolve { ok, color, label, text }
   ou null quando não há nada a dizer (nenhum affix em aberto).
   ========================================================================= */
export function verdictFor(pc, plan) {
  if (!pc.preset) {
    const best = plan.presetHunt[0] // affix em aberto de melhor ganho líquido
    if (!best) return null
    if (best.unit == null) {
      return {
        ok: null,
        color: 'info',
        label: `caçar ${best.name}`,
        text: `Sem preset. O melhor alvo em aberto é ${best.name}, mas a gema dele ainda não tem preço mapeado — economia não quantificável.`,
      }
    }
    const ceiling = pc.mid != null ? pc.mid + best.unit : null
    return {
      ok: null,
      color: 'info',
      label: best.net != null && best.net > 0 ? `caçar ${best.name} · −${best.net} g` : `caçar ${best.name}`,
      text:
        `Sem preset. Se achar este slot com preset ${best.name}, ele dispensa a gema mais valiosa ainda em aberto (${best.unit} g)` +
        (ceiling != null ? ` — pague até ~${ceiling} g na peça.` : '.') +
        (best.net != null ? ` Com o prêmio assumido de ${best.premium} g, sobram ${best.net} g de lucro.` : ''),
    }
  }

  const name = affix(pc.preset).name

  // --- preset que não entrega rank: prêmio pago à toa + socket queimado ---
  if (!pc.presetUseful) {
    const paid = pc.premium ? ` Você ainda paga ~${pc.premium} g a mais pela peça por causa dele.` : ''
    return {
      ok: false,
      color: 'warning',
      label: pc.premium ? `não compensa · −${pc.premium} g jogados fora` : 'não compensa · socket perdido',
      text:
        (pc.presetWhy === 'unwanted'
          ? `${name} não está na build: o preset ocupa 1 socket e não entrega rank nenhum. Prefira a versão crua (2 sockets livres) desta peça.`
          : `${name} já fecha o alvo pela Wine/outro preset: este preset ocupa 1 socket à toa. Prefira a versão crua ou um preset de outro affix.`) + paid,
    }
  }

  // --- gema sem preço: poupa 1 gema de verdade, mas não dá pra cravar valor ---
  if (pc.presetGross == null) {
    return {
      ok: true,
      color: 'success',
      label: 'compensa · poupa 1 gema',
      text: `Dispensa 1 gema de ${name}. A gema dele ainda não tem preço mapeado, então a economia é real mas não dá pra cravar em gold.`,
    }
  }

  const gemName = gemFor(pc.preset).name
  const ceiling = pc.mid != null ? pc.mid + pc.presetGross : null

  // --- prêmio desconhecido: só dá pra afirmar o TETO, não o lucro ---
  if (pc.presetSaving == null) {
    return {
      ok: null,
      color: 'info',
      label: `teto · +${pc.presetGross} g`,
      text: `Dispensa 1 ${gemName} (${pc.presetGross} g), mas o prêmio da peça presetada não está amostrado — sem ele não dá pra afirmar lucro.${
        ceiling != null ? ` Só compre até ~${ceiling} g; acima disso a peça crua (~${pc.mid} g) + a gema sai mais barata.` : ''
      }`,
    }
  }

  // --- prêmio come a gema: a peça crua + gema é mais barata ---
  if (pc.presetSaving <= 0) {
    return {
      ok: false,
      color: 'warning',
      label: `não compensa · +${-pc.presetSaving} g`,
      text: `O prêmio de ${pc.premium} g pela peça presetada custa mais que a ${gemName} (${pc.presetGross} g) que ele dispensa. Compre a peça crua (~${pc.mid} g) e a gema: fica ${-pc.presetSaving} g mais barato.`,
    }
  }

  return {
    ok: true,
    color: 'success',
    label: `compensa · −${pc.presetSaving} g`,
    text:
      `Dispensa 1 ${gemName} (${pc.presetGross} g) e custa ${pc.premium} g de prêmio — lucro líquido de ${pc.presetSaving} g.` +
      (ceiling != null ? ` Compre enquanto custar até ~${ceiling} g; acima disso a peça crua (~${pc.mid} g) + a gema sai mais barata.` : ''),
  }
}
