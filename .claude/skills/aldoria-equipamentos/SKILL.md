---
name: aldoria-equipamentos
description: Use ao criar, editar, balancear ou melhorar EQUIPAMENTOS do Aldoria (elmo, peitoral, calça, luvas, botas, acessório; nomes e materiais por classe, estatísticas, requisitos de classe/fase/nível, drop, loja, posição na mochila, desenho 3D e ícones). Diz o que já existe e onde mexer.
---

# Aldoria — equipamentos (armadura e acessórios)
(Armas têm skill própria: `aldoria-armas`.)

## Espaços (`SLOTS`/`SLOT_ORDER`: `w h a l g b c`)
| Chave | Espaço | Ícone | Fatia de def/vida (`ARM_SHARE`) | Extras |
|---|---|---|---|---|
| `h` | Elmo | ⛑️ | 0,55 | |
| `a` | Peitoral | 👕 | 1 | base do desenho 3D (ombreiras, placa) |
| `l` | Calça | 👖 | 0,7 | |
| `g` | Luvas | 🧤 | 0,3 | `atk = round((2 + grau·5 + nv·0,3)·rar)` |
| `b` | Botas | 🥾| 0,45 | `spd = (0,02 + grau·0,008)·rar` |
| `c` | Acessório | 💍 | sem classe | `crit = (0,01 + grau·0,008)·rar`, `mana = (10 + grau·14)·rar` |

## Por classe (item de armadura tem `it.cls` e só a própria classe equipa)
| Classe | Materiais (grau 0 a 5) | Nomes | Modificador (`ARM_CLS_STAT`) |
|---|---|---|---|
| Vanguarda | de Ferro Velho · de Ferro · de Aço · de Aço Rúnico · de Ouro Real · de Aço Celeste | Peitoral, Elmo, Grevas, Manoplas, Botas | def ×1.25, vida ×1.2 |
| Arcanista | de Linho · de Lã Encantada · de Seda · de Seda Rúnica · de Seda Real · de Éter Celeste | Manto, Chapéu, Calças, Luvas, Sandálias | def ×0.7, vida ×0.82, mana +9 |
| Caçadora | de Couro Cru · de Couro Batido · de Couro Curtido · de Couro Rúnico · de Couro Real · de Couro Celeste | Couraça, Capuz, Calças, Luvas, Botas | def ×0.95, vida ×1, esquiva 0.004 |
| Invocador | de Peles · de Presas · de Escamas · de Ossos Rúnicos · de Peles Reais · de Penas Celestes | Colete, Cocar, Calças, Braçadeiras, Botas | def ×0.9, vida ×1.06, mana +5 |

## Estatísticas de exemplo (nível 45, grau 5, Comum, +0, Mortal)
| Classe | Peça | Nome | Def | Vida | Extras |
|---|---|---|---|---|---|
| Vanguarda | Elmo | Elmo de Aço Celeste | 49 | 187 |  |
| Vanguarda | Peitoral | Peitoral de Aço Celeste | 90 | 346 |  |
| Vanguarda | Calça | Grevas de Aço Celeste | 63 | 240 |  |
| Vanguarda | Luvas | Manoplas de Aço Celeste | 26 | 101 | atq 41 |
| Vanguarda | Botas | Botas de Aço Celeste | 40 | 154 | vel 6.0 % |
| Arcanista | Elmo | Chapéu de Éter Celeste | 27 | 128 | mana 27 |
| Arcanista | Peitoral | Manto de Éter Celeste | 50 | 236 | mana 50 |
| Arcanista | Calça | Calças de Éter Celeste | 35 | 164 | mana 35 |
| Arcanista | Luvas | Luvas de Éter Celeste | 15 | 69 | atq 41, mana 15 |
| Arcanista | Botas | Sandálias de Éter Celeste | 22 | 105 | mana 22, vel 6.0 % |
| Caçadora | Elmo | Capuz de Couro Celeste | 37 | 156 | esq 0.6 % |
| Caçadora | Peitoral | Couraça de Couro Celeste | 68 | 288 | esq 1.1 % |
| Caçadora | Calça | Calças de Couro Celeste | 48 | 200 | esq 0.8 % |
| Caçadora | Luvas | Luvas de Couro Celeste | 20 | 84 | atq 41, esq 0.3 % |
| Caçadora | Botas | Botas de Couro Celeste | 30 | 128 | esq 0.5 %, vel 6.0 % |
| Invocador | Elmo | Cocar de Penas Celestes | 35 | 165 | mana 15 |
| Invocador | Peitoral | Colete de Penas Celestes | 65 | 305 | mana 28 |
| Invocador | Calça | Calças de Penas Celestes | 45 | 212 | mana 19 |
| Invocador | Luvas | Braçadeiras de Penas Celestes | 19 | 89 | atq 41, mana 8 |
| Invocador | Botas | Botas de Penas Celestes | 29 | 136 | mana 12, vel 6.0 % |

## Fórmulas (`buildItem`, data.js)
`grau = gradeOfLvl(nv, fase)` (material/nome/desenho; tabela por fase em `docs/GRAUS_DE_EQUIPAMENTO.md`) e `pg = gradeOfLvl(nv, 0)` (grau de PODER, faixas do Mortal): as fórmulas de ataque, defesa, vida, mana e esquiva usam `pg`, não o material; `base = max(1, round((4 + grau·9 + nv·0,5)·rar·fatia))`; `def = round(base·K.def)`; `vida = round(base·4·K.hp)`; mana e esquiva de classe `K.mp·(1+grau·0,9)·rar·fatia` e `K.dodge·(1+grau·0,35)·rar·fatia`. Raridade (`rar`): Comum 1, Incomum 1,12, Raro 1,3, Épico 1,6, Lendário 2. Refino +N: `itemMul = plusMul(N)·TMUL[fase exigida]` (+1..+9: +8 % cada; +10 Ancient ×2,0; +11 Ancient ×2,4). Ferreiro refina até +9; o Refinador funde 2 peças iguais em Ancient (+10 grátis, +11 por 100.000 de ouro). **Conjunto**: todas as 7 peças equipadas com o mesmo grau do peitoral dão ×1,15 em ataque e vida (`recalc`).
Pedras de adicional (`STONES`, `ADD_MAX` 3): ataque, vida %, defesa, crítico, mana/habilidade.

## Requisitos para equipar (`equip` em game.js)
1. **Classe** (`it.cls`), 2. **Fase** (`it.tierReq`), 3. **Nível** (`itemReqLvl(it, fase)` = nível do item até `MAXLV`; `it.rq` substitui; itens de fase inferior à do jogador não exigem nível). O que não dá para usar fica no Guarda de Carga; a mochila mostra o item esmaecido (`.nouse`, `noUse` em ui.js).

## Drop e loja
- `rollDropItem` (game.js): 40 % dos itens são da classe do jogador, o resto das outras três; nível do item = nível do monstro + (−6..0 em 55 %, 0..+4 em 33 %, +5..+12 em 9 %, +13..+25 em 3 %); fase: mesma do jogador (~81 %), +1 (12 %), +2 (3 %), +3 (1 %), −1 (3 %). Espaço sorteado: arma 22 %, elmo 12 %, peitoral 16 %, calça 12 %, luvas 12 %, botas 12 %, acessório 14 %. Chance de drop de monstro comum: `CFG.drop.items.normal` (0,32).
- Lojas (NPCs `armor`/`weapon`): grau atual e anterior, Comum, +0 (`shopStock`). Kit inicial: arma, peitoral, calça e botas Comuns nv 1 (`starterKit`). Presentes no Guarda de Carga nos níveis 16 (Comum) e 26 (Incomum) (`GIFTS`, `checkGifts`): um item de cada espaço.

## Posição na mochila e no baú
Cada item tem `it.pos` (`fillPos` em data.js distribui quem não tem). Mover: `Game.itemMove(origem, id, destino, pos)`, com origem/destino `'bag'` ou `'bank'` (clique pega o item, clique no espaço solta ou troca; Shift+clique é a ação rápida). Mochila 24 espaços; baú 120 (3 páginas de 40).

## Desenho 3D (`playerParts`/`humanoid`, models.js)
Parâmetros: `ag` peitoral, `hg` elmo, `lg` calça, `gg` luvas, `bg` botas, `wg` arma, `ac` acessório (grau de cada peça, −1 = vazio), raridade e refino (`ar`, `ap`). Cores por classe e grau: `ARM_CLS_COL[cls][grau]`. Detalhes: `styleLayer` (capa, ombreiras da classe), `armorDeco` (grau ≥1 ombreiras, ≥2 placa, ≥3 braceletes/joia, ≥4 ombreira dourada, ≥5 aura; raridade ≥3 chifres), `shoulderTrim` (ombreira por classe: aço, pano, couro, pele), `helmParts`, luvas (cano + mão revestida, friso dourado no grau ≥3). `curParts` (game.js) lê o equipamento e monta a chave de cache.

## Onde mexer
`data.js`: `SLOTS`, `SLOT_ORDER`, `ARM_SHARE`, `CLS_ARM_NOUN`, `CLS_ARM_MAT`, `ARM_CLS_STAT`, `*_NAMES` genéricos, `buildItem`, `RARITY`, `itemMul`, `itemReqLvl`, `fillPos`. `game.js`: `recalc`, `equip`/`unequip`, `rollDropItem`, `shopStock`, `starterKit`, `GIFTS`, `curParts`, migração em `load`. `ui.js`: `SLOT_IC`, `EQ_POS` (grade da janela: colunas 0 e 2, linhas 0 a 3), `renderInv`, `itemTip`, `istats`, menu de contexto. `models.js`: acima.

## Receita: novo espaço de equipamento (ex.: luvas foram assim)
`SLOTS`+`SLOT_ORDER`+`ARM_SHARE`, nomes por classe (`CLS_ARM_NOUN` e genérico), `buildItem` (extras), `recalc` (somar o que o item dá), drop (probabilidades) e `shopStock`, `SLOT_IC` e `EQ_POS`, `curParts` e `playerParts` (parâmetro novo na chave de cache) e desenho. Saves antigos não têm o espaço (`p.eq[x]` indefinido): o código já trata como vazio.

## Armadilhas
- Itens guardam tudo (nome, stats): mudar fórmula não atualiza itens já dropados/salvos.
- Modelo novo/alterado: `python tools/teste_juncao_pecas.py` (0 pixels de diferença) e olhar `tools/capture_cenas.py <rótulo> herois`.
- Conjunto exige as 7 peças do MESMO grau do peitoral; novo espaço obrigatório aumenta a dificuldade de fechar o conjunto.
- Arquivos CRLF: edite com Edit/Write ou Python (`newline=''`).
