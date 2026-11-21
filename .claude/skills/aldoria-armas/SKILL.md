---
name: aldoria-armas
description: Use ao criar, editar, balancear ou melhorar ARMAS do Aldoria (os 14 tipos por classe, multiplicador de ataque, nomes por grau, modelo 3D na mão, som do golpe, arma única de chefe, drop e loja, efeitos especiais). Diz o que cada arma já faz hoje e onde mexer.
---

# Aldoria — armas

## O que uma arma faz hoje (só isto)
1. **Ataque**: `it.atk`, que entra em `recalc` (`(base+cresc·nível)·fase + atk·itemMul + adicionais`). O tipo de arma só entra como multiplicador `WMUL`.
2. **Nome** por grau (`WNAMES[tipo][grau]`, 6 graus) e **ícone** (`WT_IC` em ui.js).
3. **Modelo 3D** na mão (`weaponParts`, models.js) e, na janela de equipamento, o personagem usa o mesmo.
4. **Som do golpe** (`swingOf` em game.js: `swing_sword`, `swing_axe`, `swing_daggers`, `swing_staff`, `swing_magic`, `swing_bow`...).
**Não há efeito especial por arma** (nem alcance, nem velocidade, nem habilidade própria): o alcance e o tipo de ataque são da CLASSE (`CLASSES[c].range`/`atkType`: Vanguarda corpo a corpo; as outras lançam projétil; flecha só na Caçadora). Qualquer melhoria "de verdade" de arma ainda está por fazer.

## Tipos, multiplicador e ataque (Comum, refino +0, fase Mortal)
| Classe | Tipo | WMUL | Nomes (grau 0 a 5) | Atq nv 1 | Atq nv 45 | Atq nv 45 Lendário |
|---|---|---|---|---|---|---|
| Vanguarda | `sword` | 1 | Espada Curta · Espada de Ferro · Montante · Lâmina Rúnica · Espada Real · Lâmina Celeste | 7 | 112 | 224 |
| Vanguarda | `daggers` | 0,94 | Faca de Caça · Adaga de Ferro · Adaga Serrilhada · Adaga Rúnica · Adaga Real · Adaga Celeste | 6 | 105 | 211 |
| Vanguarda | `axe` | 1,08 | Machado Rústico · Machado de Guerra · Machado Duplo · Machado Rúnico · Machado Real · Machado Celeste | 7 | 121 | 242 |
| Arcanista | `staff` | 1 | Cajado de Madeira · Cajado de Cristal · Cajado Arcano · Cajado Rúnico · Cajado Real · Cajado Celeste | 7 | 112 | 224 |
| Arcanista | `wand` | 0,92 | Varinha de Galho · Varinha de Cristal · Varinha Arcana · Varinha Rúnica · Varinha Real · Varinha Celeste | 6 | 103 | 206 |
| Arcanista | `orb` | 1,05 | Orbe Opaco · Orbe de Cristal · Orbe Arcano · Orbe Rúnico · Orbe Real · Orbe Celeste | 7 | 118 | 235 |
| Arcanista | `tome` | 1,08 | Caderno de Feitiços · Grimório de Couro · Grimório Arcano · Grimório Rúnico · Grimório Real · Grimório Celeste | 7 | 121 | 242 |
| Caçadora | `bow` | 0,96 | Arco Curto de Caça · Arco Curto de Freixo · Arco Curto Élfico · Arco Curto Rúnico · Arco Curto Real · Arco Curto Celeste | 7 | 108 | 215 |
| Caçadora | `longbow` | 1,06 | Arco Longo de Teixo · Arco Longo de Ferro · Arco Longo de Guerra · Arco Longo Rúnico · Arco Longo Real · Arco Longo Celeste | 7 | 119 | 237 |
| Caçadora | `compbow` | 1,02 | Arco Composto Simples · Arco Composto de Chifre · Arco Composto Recurvo · Arco Composto Rúnico · Arco Composto Real · Arco Composto Celeste | 7 | 114 | 228 |
| Caçadora | `crossbow` | 1,1 | Besta Simples · Besta de Ferro · Besta Pesada · Besta Rúnica · Besta Real · Besta Celeste | 7 | 123 | 246 |
| Invocador | `scepter` | 1 | Cetro de Osso · Cetro Totêmico · Cetro Selvagem · Cetro Rúnico · Cetro Real · Cetro Celeste | 7 | 112 | 224 |
| Invocador | `staff` | 1 | Cajado de Madeira · Cajado de Cristal · Cajado Arcano · Cajado Rúnico · Cajado Real · Cajado Celeste | 7 | 112 | 224 |
| Invocador | `totem` | 0,96 | Totem Simples · Totem de Osso · Totem Espiritual · Totem Rúnico · Totem Real · Totem Celeste | 7 | 108 | 215 |

`staff` existe para Arcanista **e** Invocador: só o campo `it.cls` decide quem equipa. Raridade multiplica o ataque (Comum 1 · Incomum 1,12 · Raro 1,3 · Épico 1,6 · Lendário 2). Armas únicas de chefe (`UNIQUE_W`): banditking → Cutelo do Rei Bandido, pharaoh → Cetro do Faraó, frostwyrm → Presa da Serpe Glacial, guardian → Raiz do Guardião, colossus → Ruína do Colosso, scorpqueen → Ferrão da Rainha, yetiking → Presa do Rei Yeti, ignar → Coração de Ignar, lich → Lamento do Lich, demon → Pacto Demoníaco.

## Fórmulas
- `buildItem('w', cls, lvl, rar, tipo, fase)`: `grau = gradeOfLvl(lvl)` (grau = faixa do nível do item na escala do Mortal (`gradeOfLvl` em data.js): 1–29 → 0, 30–79 → 1, 80–119 → 2, 120–189 → 3, 190–249 → 4, 250+ → 5 (nível interno 1–5, 6–13, 14–20, 21–31, 32–41, 42+)); `atk = round((6 + grau·14 + lvl·0,8) · RARITY[rar].m · WMUL[tipo])`; `it.cls = cls`; `it.tierReq = fase`.
- Refino: `itemMul = (1 + 0,08·plus) · TMUL[tierReq]`. Pedras de adicional (`it.adds`) somam `atk` fixo. Arma única: `rar = 4`, `atk` × (1,15 · Lendário/rar), `plus ≥ 3`, sempre da classe do jogador (`rollDropItem`).
- Equipar exige classe, fase e nível do item (`itemReqLvl`); ver skill `aldoria-equipamentos`.

## Onde mexer
| Quero... | Arquivo · símbolo |
|---|---|
| mudar números, tipos, nomes | `data.js`: `WTYPES`, `WMUL`, `WNAMES`, `WT_REMAP`, `UNIQUE_W`, `buildItem` |
| ícone na interface | `ui.js`: `WT_IC`, `WIC`, `iconOf` |
| desenho 3D | `models.js`: `weaponParts` (por classe e tipo), `PA`/`rotOff`, `keepParts`, e a miniatura do item (~linha 1185) |
| som do golpe | `game.js`: `swingOf`; efeitos em `audio.js` |
| ataque básico/projétil | `game.js`: `basicAttack`, `launch`, `hitMob`, `playerDmg` |
| drop e loja | `game.js`: `rollDropItem` (22 % dos drops são arma), `shopStock('weapon')` (Armeiro: um item por tipo no grau atual e no anterior) |
| arma inicial | `starterKit`: `WTYPES[cls][0]` |
| migração de saves antigos | `fixWeapon` + `WT_REMAP` (data.js), chamados em `load` |

## Receita: arma nova de um tipo existente
1. `WNAMES` (6 nomes), 2. `WMUL`, 3. `WTYPES[classe]`, 4. `WT_IC`, 5. `weaponParts` (forma 3D), 6. som em `swingOf` (reuse um existente se quiser), 7. `CLS_OF_WT`. Build, abrir o jogo, `Game._dbg`: `p.eq.w = buildItem('w', cls, 45, 4, 'tipo', 0); Game._dbg.recalc()` e olhar a prévia [I].

## Receita: dar efeito especial a armas (ainda não existe)
Ideias coerentes com o jogo: campo `it.fx = {k, v}` gerado em `buildItem` por tipo/raridade; aplicar em `recalc` (bônus passivo) ou em `hitMob`/`playerDmg` (sangramento, lentidão, roubo de vida); mostrar em `itemTip`/`istats` (ui.js); guardar no save (o item inteiro já é salvo). Teste com `tools/teste_luta_real.py` e o modelo `tools/modelo_combate_classes.py` antes de fixar números.

## Armadilhas
- Peça presa à mão com rotação precisa de `PA`/`rotOff`; senão a peça gira junto com o deslocamento e sai do lugar. Modelo novo em cache passa por `keepParts`; depois de mexer em modelo rode `python tools/teste_juncao_pecas.py` (esperado 0 pixels de diferença).
- A chave de cache de `playerParts` inclui o tipo (`wt`) e o grau; parâmetro novo de aparência entra na chave, senão o modelo antigo é reaproveitado.
- Arquivos usam CRLF: edite com Edit/Write ou Python (`newline=''`).
- Mudar `WMUL` ou a fórmula muda o ataque de toda a classe: confira no modelo de combate (margem por nível) antes de commitar.
