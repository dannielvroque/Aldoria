---
name: aldoria-mestres-habilidades
description: Use ao editar, balancear ou criar HABILIDADES e o MESTRE DE HABILIDADES do Aldoria (pontos por nível, aprender e subir de nível, custos, teto, redistribuir, tipos de habilidade, barra de atalhos, modo automático). Diz o que já existe e onde mexer.
---

# Aldoria — mestre de habilidades e habilidades

## O jogador novo
Começa **sem nenhuma habilidade** e com **3 pontos** (mais 3 por nível **efetivo** (`ptsAt`: no Mortal ~0,5 por nível exibido; total no topo igual ao de antes); ao evoluir de fase volta a 3). Aprende e melhora tudo com o **Mestre de Habilidades**, que é o nome de todos os oito NPCs `trainer` (um por cidade principal): Vila de Aldoria (-19, -10), Oásis de Sahr (466, -40), Vila de Hielmar (-44, -489), Forja de Cinzas (-540, -68), Vila de Pedraluz (360, 389), Oásis de Zahar (809, -27), Forte Cinzeiro (-551, 201), Porto Gélido de Frostmar (263, -637). A função de cada NPC mostra "Habilidades · gaste seus pontos aqui".

## Regras (data.js, depois de `SK_LEARN`)
- **Aprender** (`learnSkill`): exige nível (`SK_LEARN[i].lvl`) e fase (`skill.tier`), custa `SK_LEARN[i].pts` pontos.
- **Subir de nível** (`raiseSkill`): custa `skRaiseCost(L)` = 1 ponto até o nível 4 da habilidade, 2 até o 7, 3 depois (níveis 1–10). **Teto** `skCap(nível do personagem) = min(10, 1 + ⌊nível/5⌋)`: subir de 1 para 2 exige personagem nível 5.
- **Efeito do nível** (`skEff`): multiplicador/valores ×`(1 + 0,1·(L−1))`; duração ×`(1 + 0,05·(L−1))`; custo de mana ×`(1 + 0,05·(L−1))`.
- **Redistribuir** (`resetSkills`, botão no painel V): custa `40·nível` de ouro, desaprende tudo e devolve os pontos realmente gastos (`skSpent`).
- Orçamento: 3·50 = 150 pontos até o nível 50; deixar as 7 habilidades no máximo custa 144.

## Habilidades por classe (7 por classe; barra de atalhos: teclas 1–5, 8, 9)
| Classe | # | Habilidade | Tipo | Pontos | Nível | Mana | Recarga | Mult. |
|---|---|---|---|---|---|---|---|---|
| Vanguarda | 1 | 🗡️ Golpe Pesado | `melee` | 1 | 1 | 6 | 3 s | 300 % |
| Vanguarda | 2 | 🐂 Investida | `dash` | 1 | 1 | 10 | 7 s | 180 % |
| Vanguarda | 3 | 🛡️ Bloqueio com Escudo | `shield` | 2 | 3 | 12 | 18 s | — |
| Vanguarda | 4 | 📢 Grito de Guerra | `buff` | 2 | 6 | 14 | 25 s | — |
| Vanguarda | 5 | 🌀 Giro de Lâminas | `aoe_self` | 4 | 20 | 18 | 8 s | 260 % |
| Vanguarda | 6 | 🪓 Golpe Executor | `melee` | 3 | 15 | 16 | 9 s | 280 % |
| Vanguarda | 7 | 😡 Fúria Berserker | `buff` | 5 | 40 + Imortal | 30 | 40 s | — |
| Arcanista | 1 | 🔥 Bola de Fogo | `proj` | 1 | 1 | 6 | 1.2 s | 180 % |
| Arcanista | 2 | 🧊 Lança de Gelo | `proj` | 1 | 1 | 10 | 4 s | 210 % |
| Arcanista | 3 | ⚡ Corrente de Raios | `proj` | 2 | 3 | 16 | 6 s | 220 % |
| Arcanista | 4 | 🔰 Barreira Arcana | `shield` | 2 | 6 | 25 | 25 s | — |
| Arcanista | 5 | ❄️ Nova Glacial | `aoe_self` | 4 | 20 | 24 | 10 s | 200 % |
| Arcanista | 6 | 🌋 Tempestade de Fogo | `aoe_ground` | 3 | 15 | 30 | 12 s | 300 % |
| Arcanista | 7 | ☄️ Meteoro | `aoe_ground` | 5 | 40 + Imortal | 60 | 28 s | 700 % |
| Caçadora | 1 | 🎯 Tiro Rápido | `proj` | 1 | 1 | 4 | 1 s | 160 % |
| Caçadora | 2 | ➡️ Flecha Perfurante | `pierce` | 1 | 1 | 10 | 5 s | 230 % |
| Caçadora | 3 | 💨 Passo Ágil | `dash` | 2 | 3 | 10 | 9 s | — |
| Caçadora | 4 | 🔻 Marca do Caçador | `mark` | 2 | 6 | 12 | 14 s | — |
| Caçadora | 5 | 🌧️ Chuva de Flechas | `aoe_ground` | 4 | 20 | 24 | 14 s | 360 % |
| Caçadora | 6 | 🦅 Olho de Águia | `buff` | 3 | 15 | 20 | 30 s | — |
| Caçadora | 7 | 💥 Disparo Crítico | `proj` | 5 | 40 + Imortal | 35 | 16 s | 450 % |
| Invocador | 1 | 🐺 Invocar Lobo | `summon` | 1 | 1 | 22 | 10 s | — |
| Invocador | 2 | ✴️ Raio Espiritual | `proj` | 1 | 1 | 7 | 2.5 s | 200 % |
| Invocador | 3 | 💜 Elo Vital | `heal` | 2 | 3 | 20 | 14 s | — |
| Invocador | 4 | 🐝 Enxame | `aoe_ground` | 2 | 6 | 22 | 11 s | 260 % |
| Invocador | 5 | 🗿 Invocar Golem | `summon` | 4 | 20 | 40 | 35 s | — |
| Invocador | 6 | 👻 Invocar Espíritos | `summon` | 3 | 15 | 30 | 20 s | — |
| Invocador | 7 | 🐾 Pacto Selvagem | `buff` | 5 | 40 + Imortal | 35 | 35 s | — |

Tipos (`useSkill`, game.js): `melee`, `proj`, `pierce`, `aoe_self`, `aoe_ground`, `dash`, `buff`, `shield`, `heal`, `mark`, `summon`. Campos comuns: `mp`, `cd`, `m` (multiplicador), `rng`, `r`, `dur`, `dot`, `slow`, `stun`, `leech`, `exec`, `crit`, `refl` (escudo reflete), `pp` (cura da invocação), `tier` (fase exigida).

## Interface
- Diálogo do Mestre: `ui.js`, ramo `id === 'trainer'` (botões `data-a="learn"` e `data-a="sklv"`). Árvore **[V]**: `renderTree`. Barra: ~`ui.js:1215` (cadeado se não aprendida). Texto de ajuda inicial: `game.js` (`UI.log('Bem-vindo...')`).
- Save: `p.sk` (7 níveis, 0 = não aprendida) e `p.sp` (pontos livres). Saves antigos mantêm o que já tinham.

## Modo automático (`autoSkills`, game.js)
Ordem `SKILL_ORDER` (cura, escudo, buff, invocação, área, marca, perfurante, projétil, corpo a corpo, avanço). Cura abaixo de 60 % da vida (ou invocação abaixo de 35 %); escudo quando a vida cai, há grupo ou chefe. Durante uma fuga manual (clique/teclas, `autoPause` ou `cmd` de andar) só cura e escudo: evita Investida puxando de volta.

## Onde mexer
`data.js`: `CLASSES[..].skills`, `SK_LEARN`, `SK_MAX`, `SK_STEP`, `SK_PTS_LEVEL`, `skRaiseCost`, `skCap`, `skSpent`, `skEff`. `game.js`: `learnSkill`, `raiseSkill`, `resetSkills`, `useSkill`, `autoSkills`, `spawnPet` (invocações), `recalc`. `story.js`: `NAMES` (nome dos NPCs de serviço) e `SERV`. `world.js`/`data.js`: `TOWN_DEF[..].slots` (casa `trainer`).

## Receita: habilidade nova
Acrescentar ao fim de `CLASSES[c].skills` (máx. 7 hoje, a barra e `p.sk` têm tamanho fixo 7; aumentar exige `p.sk`, `p.cd`, `SK_LEARN`, atalhos e save) ou **substituir** uma existente. Campos da tabela acima, `SK_LEARN[i]`. Efeito novo: um ramo em `useSkill`. Descrição em `d` (a interface mostra). Medir com `tools/modelo_combate_classes.py`.

## Armadilhas
- Descrições (`d`) repetem números (ex.: "300 % de dano"): mudou `m`, mude o texto.
- `SK_LEARN` é indexado pela posição na classe (igual nas 4 classes): custo/nível valem para a habilidade de mesma posição.
- Teto por nível (`skCap`) impede pontos "guardados" de valer cedo: se mexer em `SK_PTS_LEVEL`, rever o orçamento.
- Testar: `Game._dbg.G.player` (`p.sp`, `p.sk`), `Game.learnSkill(i)`, `Game.raiseSkill(i)`, `UI.openDialog('trainer')`.
