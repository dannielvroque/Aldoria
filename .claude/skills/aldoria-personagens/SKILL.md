---
name: aldoria-personagens
description: Use ao editar, balancear ou criar CLASSES/PERSONAGENS do Aldoria (Vanguarda, Arcanista, Caçadora, Invocador: atributos, crescimento, recurso, alcance, invocações, aparência, evolução de fase, modelo 3D) e ao medir equilíbrio entre classes. Diz o que já existe, números atuais e as ferramentas de teste.
---

# Aldoria — personagens e classes

## As 4 classes (`CLASSES`, data.js) — valores no nível 1 (e crescimento por nível)
| Classe | Papel | Vida | Mana | Ataque | Defesa | Crít. | Esq. | Vel. atq. | Alcance | Recurso |
|---|---|---|---|---|---|---|---|---|---|---|
| Vanguarda | Corpo a corpo · Tanque | 122 (+32) | 45 (+4) | 10 (+3.9) | 10 (+2.6) | 5 % | 0 % | 1 | 2.6 | Fúria |
| Arcanista | À distância · Magia elemental | 120 (+28) | 110 (+13) | 14 (+3.6) | 3 (+1.1) | 6 % | 0 % | 1 | 13 | Mana |
| Caçadora | À distância · Crítico e esquiva | 100 (+20) | 75 (+9) | 11 (+2.9) | 5 (+1.5) | 18 % | 12 % | 1.25 | 14 | Mana |
| Invocador | Invocações · Inteligência | 100 (+20) | 95 (+11) | 12 (+3.1) | 5 (+1.5) | 6 % | 0 % | 1 | 11 | Mana |

- Tipo de ataque: Vanguarda corpo a corpo; as outras projétil (flecha só da Caçadora). Atributo principal (`main`): Vanguarda força, Arcanista e Invocador inteligência, Caçadora destreza. **Fúria** da Vanguarda usa o campo de mana e regenera 4 % da máxima a cada golpe.
- Armas e armaduras por classe: skills `aldoria-armas` e `aldoria-equipamentos`. Habilidades e custos: `aldoria-mestres-habilidades`. Montarias: `aldoria-montarias`.
- Vanguarda tem `dr` (redução de dano permanente: 8 % + 3 % por fase). Teto de crítico 60 % e de esquiva 35 % sem buffs (`recalc`); buffs temporários passam do teto. Bônus de montaria vale inteiro montado e pela metade desmontado.

## Evolução e atributos
Fases `TIERS` (Mortal → Imortal → Ancestral → Supremo), nível máx. por fase `LVCAP` = 299/199/149/50 (conteúdo na escala interna 1–50: `effLv`/`dispLv`), `TMUL = [1, 1,8, 3,2, 5,5]`; custo `EVO_COST`. Ao evoluir só muda a fase: nível 1, pontos de atributo e habilidade reiniciam (habilidades aprendidas voltam ao nível 1); itens equipados e da mochila, ouro, montarias, história e conquistas ficam; sem kit nem presentes. Atributos (`ATTRS`, `AP_PER_LEVEL` = 5): Força→ataque, Destreza→crítico/velocidade, Inteligência→mana/dano de habilidade, Vitalidade→vida/defesa, Cura→cura e poções (`recalc`).

## Invocador (`spawnPet`, game.js)
Lobo (vida 60+0,6·vidaMáx, ataque 60 % do dono), Golem (provoca; ataque 35 %), Espírito (frágil, 95 %). Herdam o **crítico** do dono e defesa (lobo 80 %, golem 150 %, espírito 60 %). O Elo Vital cura 50 % da vida da invocação.

## Aparência e criação
`p.look` (gênero, cabelo, cor, barba, marca, olhos, pele, porte) vem da criação (`Game.createOpen`, `buildCreate`/`syncCreate`). Modelo 3D: `playerParts`/`humanoid` (models.js; pernas e tronco em loft, `styleLayer` por classe, `shoulderTrim`, `helmParts`), prévia na janela [I] e retratos (`Game.portrait`, `art.js`).

## Equilíbrio: ferramentas e achados
- `tools/teste_luta_real.py [níveis] [dif.]`: lutas reais no jogo (cada classe, vários níveis, equipamento Comum, só habilidades aprendidas, sem poções) contra monstro normal e elite; mostra tempo para matar, % de vida perdida, mortes. Rodar depois de mexer em `mobStats`, `MOB_ATK` (1,4), `ELITE_M` ou nas classes.
- `tools/modelo_combate_classes.py` (+ `modelo_combate_extrai_*.py`): modelo de rotação de 60 s; margem de sobrevivência por classe/nível. Relatório: `docs/RELATORIO_CLASSES_SKILLS_MONTARIAS.md`.
- Achados atuais: monstro comum do mesmo nível custa ~15–35 % da vida; elites são letais sem poção. Caçadora ainda é a mais fácil nos níveis médios (esquiva e crítico); Invocador tem a menor margem (o modelo só conta o lobo). Dificuldade é estável entre fases (K da defesa = 100·T).

## Onde mexer
`data.js`: `CLASSES`, `TIERS`, `TMUL`, `EVO_COST`, `ATTRS`, `AP_PER_LEVEL`, `mobStats`, `MOB_ATK`, `ELITE_M`. `game.js`: `recalc`, `playerDmg`, `dmgPlayer`, `spawnPet`, `evolve`, `createOpen`. `models.js`: `playerParts`, `humanoid`, `styleLayer`. `ui.js`: painel [C] (atributos), criação.

## Armadilhas
- Multiplicar por `TMUL` e `K = 100·T` mantêm a proporção entre fases: não "corrija" um dos lados sozinho (foi o erro do primeiro relatório).
- Classe nova exige: `CLASSES`, `WTYPES`/`WMUL`/`WNAMES`, `CLS_ARM_*`/`ARM_CLS_STAT`/`ARM_CLS_COL`, modelo, retrato, habilidades (7), `SK_LEARN` por posição, textos e testes; avalie se vale.
- Teste mínimo: build, jogo abre, console limpo, `tools/teste_luta_real.py 1,5,12,30`.
