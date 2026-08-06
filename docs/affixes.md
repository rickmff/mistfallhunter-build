# Affixes de Mistfall Hunter — ícone, id e gemas

Dicionário para **identificar o affix pelo ícone** — é o que resolve os presets das
listagens da Auction House, onde só aparece o ícone, sem nome.

Os grupos são os do jogo (menu de affixes): **Attack**, **Defense**, **Functional**.
A coluna `cat` é a categoria interna do app (`src/data/game.js`), usada só para cor.
As gemas vêm de `src/data/gems.js` (Auction House, Gem Tier I) — o **formato** da gema
é o formato do socket em que ela entra.

## Attack (10)

| Affix | id | cat | Ícone | Gemas (formato · preço) |
| --- | --- | --- | --- | --- |
| **Valor** | `valor` | offense | Espada diagonal, lâmina única apontando para cima | Resolve Amethyst (triângulo · 148 g)<br>Resolve Onyx (retângulo · 155 g) |
| **Wrath** | `wrath` | offense | Espada dentro de um coração invertido | Wrath Moonstone (quadrado · 56 g)<br>Wrath Amethyst (triângulo · 73 g) |
| **Sky Piercer** | `skypiercer` | offense | Silhueta humana saltando sobre um risco | Skyshatter Onyx (retângulo · 45 g)<br>Skyshatter Amethyst (triângulo · 45 g) |
| **Fervid** | `fervid` | offense | Espada entre duas foices/chifres curvos | Fervor Amethyst (triângulo · 45 g)<br>Fervor Onyx (retângulo · 58 g) |
| **Seeker** | `seeker` | offense | Machado com três riscos de velocidade à direita | Pursuit Amethyst (triângulo · 45 g) |
| **Ranged** | `ranged` | offense | Ponta de flecha com penas e rastro, apontando para baixo-esquerda | Ranged Power Amethyst (triângulo · 60 g)<br>Farstrike Peridot (octógono · 155 g) |
| **Fervor** | `fervor` | offense | Punho fechado dentro de uma coroa de louros | Warspirit Amethyst (triângulo · 55 g)<br>Warspirit Moonstone (quadrado · 151 g) |
| **Smiting** | `smiting` | offense | Caveira com estrela/impacto atrás | Crushing Peridot (octógono · 45 g) |
| **Burst** | `burst` | offense | Caveira com estilhaços de explosão | Blast Moonstone (quadrado · 115 g) |
| **Strife** | `strife` | offense | Picareta cruzada com uma lâmina | Carnage Onyx (retângulo · 55 g)<br>Brawling Peridot (octógono · 100 g) |

## Defense (11)

| Affix | id | cat | Ícone | Gemas (formato · preço) |
| --- | --- | --- | --- | --- |
| **Aegis** | `aegis` | defense | Escudo liso, sem marca dentro | Guardian Moonstone (quadrado · 141 g)<br>Warding Agate (retângulo · 149 g) |
| **Tenacious** | `tenacious` | defense | Coração com uma cruz no meio | Tenacity Agate (retângulo · 78 g)<br>Tenacious Peridot (octógono · 147 g) |
| **Bulwark** | `bulwark` | defense | Escudo redondo (broquel) com rebites na borda | Steel Bulwark Agate (retângulo · 45 g) |
| **Iron Helmet** | `ironhelmet` | defense | Elmo com viseira, visto de frente | Iron Helm Agate (retângulo · 45 g) |
| **Ethereal** | `ethereal` | defense | Pena/asa dobrada com fragmentos soltos | Lightfoot Moonstone (quadrado · 58 g) |
| **Stoic** | `stoic` | defense | Anel aberto, como um ouroboros | Fortitude Amethyst (triângulo · 55 g)<br>Fortitude Onyx (retângulo · 94 g) |
| **Brotherhood** | `brotherhood` | defense | Dois corações/duas mãos unidos | Brotherhood Onyx (retângulo · 56 g)<br>Unity Moonstone (quadrado · 70 g) |
| **Spirit Shield** | `spiritshield` | defense | Escudo com uma espiral dentro | Spellshield Moonstone (quadrado · 45 g) |
| **Unyielding** | `unyielding` | defense | Escudo com estrela de quatro pontas dentro | Unyielding Amethyst (triângulo · 56 g)<br>Unyielding Moonstone (quadrado · 56 g) |
| **Distant Ward** | `distantward` | defense | Escudo cercado de farpas apontando para fora | Ranged Ward Onyx (retângulo · 45 g)<br>Farguard Peridot (octógono · 54 g) |
| **Resilience** | `resilience` | defense | Trevo de quatro folhas em forma de corações | Resilience Amethyst (triângulo · 78 g) |

## Functional (11)

| Affix | id | cat | Ícone | Gemas (formato · preço) |
| --- | --- | --- | --- | --- |
| **Eloquence** | `eloquence` | utility | Mãos em prece dentro de uma moldura, com brilho | Persuasive Peridot (octógono · 145 g) |
| **Seamless** | `seamless` | utility | Ampulheta | Impenetrable Moonstone (quadrado · 65 g)<br>Flawless Peridot (octógono · 104 g) |
| **Vitality** | `vitality` | utility | Coração com linha de batimento cardíaco | Vital Peridot (octógono · 78 g)<br>Vitality Amethyst (triângulo · 91 g) |
| **Swift** | `swift` | utility | Bota com riscos de velocidade | Haste Moonstone (quadrado · 54 g) |
| **Elusive** | `elusive` | utility | Pulso/mão com um risco em ziguezague | Agile Peridot (octógono · 144 g) |
| **Deft** | `deft` | utility | Cadeado fechado | Deft Peridot (octógono · 45 g) |
| **Blessing** | `blessing` | utility | Frasco de poção com brilho | Blessed Peridot (octógono · 45 g) |
| **Curse** | `curse` | utility | Frasco de poção com caveira | Curseward Amethyst (triângulo · 45 g)<br>Curseward Moonstone (quadrado · 61 g) |
| **Wealth** | `wealth` | utility | Moeda/estrela dentro de um círculo | Fortune Peridot (octógono · 45 g) |
| **Focused** | `focused` | utility | Duas chaves cruzadas | Focus Onyx (retângulo · 90 g) |
| **Creation** | `creation` | utility | Mão aberta com um brilho na palma | Artifice Moonstone (quadrado · 45 g) |

## Notas

- **Seeker é Attack no jogo**, não utilitário — o print do menu não deixa dúvida.
  O app tinha ele em `utility`; corrigido em `src/data/game.js`.
- Cada affix tem **uma gema por formato de socket** (16 affixes têm duas, 16 têm uma).
  O preço muda por formato, então o custo de um rank depende do socket que o recebe.
- Descrições de ícone são leitura dos prints do menu de affixes (ago/2026), para
  casar com os ícones minúsculos das listagens da AH — não são nomes oficiais de arte.

## Como não confundir os ícones parecidos

Na listagem da Auction House o ícone do preset sai com ~16 px. Estes são os
grupos que se confundem nesse tamanho e o detalhe que separa cada um:

**Escudos (5).** Todos têm a mesma silhueta; olhe o miolo.

| Affix | Miolo do escudo |
| --- | --- |
| Aegis | vazio, liso |
| Spirit Shield | espiral |
| Unyielding | estrela de quatro pontas |
| Distant Ward | farpas apontando para fora, na borda |
| Bulwark | é redondo (broquel), não em V — e tem rebites |

**Caveiras (2).** Smiting tem uma estrela/impacto atrás; Burst tem estilhaços
irradiando, mais soltos.

**Frascos (2).** Blessing tem um brilho; Curse tem uma caveira no vidro.

**Corações (4).** Tenacious = cruz no meio · Vitality = linha de batimento ·
Wrath = espada atravessando · Resilience = quatro corações formando um trevo.

**Círculos (3).** Stoic = anel aberto, sem centro · Wealth = estrela dentro do
círculo · Bulwark = disco com rebites.

**Mãos (3).** Fervor = punho fechado com coroa de louros · Eloquence = duas mãos
em prece dentro de moldura · Creation = mão aberta com brilho na palma.

## Onde cada affix rola de fábrica (pool de preset)

O jogo não gera qualquer preset em qualquer peça. Contagem do MistfallDB
(`mistfalldb.com/affixes`), usada em `src/data/pools.js` — o solver não propõe
peça fora dessa regra:

| Só em ARMADURA | Só em ARMA | Nos dois |
| --- | --- | --- |
| Valor · Burst · Ethereal · Iron Helmet · Resilience · Seamless | Strife | os outros 25 |

Detalhes que surpreendem: **Valor é armor-only** (86 itens) — arma com preset de
Valor não existe. **Strife é weapon-only** (20 itens). E **Unyielding** rola bem
mais em arma (10) do que em armadura (4).

⚠️ O banco não diz se amuleto e anel entram na conta de "armor". Aqui contam
como armadura; se o jogo tratar joia como pool próprio, corrigir em `pools.js`.

## Pool de preset por slot

Onde cada affix pode vir **de fábrica** (`src/data/pools.js`, de
`mistfalldb.com/affixes/<affix>` → "Slots & weapon classes"; classes de arma de
outras classes descartadas, o app só modela Sword and Shield):

| Affix | Slots |
| --- | --- |
| Valor | **só colar** |
| Seamless | **só colar** |
| Strife | **só arma** |
| Unyielding | **só botas** |
| Burst · Deft | botas, luvas |
| Ethereal | peitoral, botas |
| Resilience | peitoral, luvas, elmo |
| Wealth | peitoral, luvas, elmo |
| Creation | luvas, elmo, colar |
| Spirit Shield | peitoral, botas, colar |
| Distant Ward | peitoral, elmo, calças |
| Swift | botas, elmo, calças |
| Blessing | peitoral, elmo, luvas, colar |
| Focused | peitoral, botas, luvas, colar |
| Iron Helmet · Brotherhood | 4 slots |
| Sky Piercer · Fervid · Seeker · Ranged | 5 slots |
| Bulwark | peitoral, elmo, calças, colar, **arma** |
| Tenacious · Stoic · Vitality · Wrath | 5–6 slots, incluindo **arma** |
| Aegis | 6 armaduras + **arma** |
| Fervor · Smiting · Eloquence · Elusive · Curse | as 6 peças de armadura |

Duas coisas que caem daí: **nenhum affix rola em anel** (o app nunca propõe anel
presetado) e a **arma** só aceita 7 dos 32 (Strife, Aegis, Tenacious, Stoic,
Bulwark, Vitality, Wrath).

O pool é por **slot**, não por item: ele diz que *algum* elmo rola Aegis, não que
o "Fearless Helmet" role. Quando você confirmar no jogo o que uma base específica
aceita, liste em `GAME.slots[].presetPool` — essa lista tem prioridade sobre a
tabela acima.
