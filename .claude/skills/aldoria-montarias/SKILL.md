---
name: aldoria-montarias
description: Use ao criar, editar, balancear ou melhorar MONTARIAS do Aldoria (8 montarias, nível e XP, bônus, energia e ração, drop, equipar e montar, painel [H], modelos 3D, poderes ativos). Diz o que elas já fazem hoje e onde mexer.
---

# Aldoria — montarias

## O que fazem hoje
- **Bônus passivos** de ataque, defesa, vida e crítico (tabela abaixo) e **velocidade** (só montado). Não há poder ativo nem habilidade de montaria.
- O bônus vale **inteiro montado e pela metade desmontado** (equipada em `p.lastMount`): `recalc` usa `mm = p.mount ? 1 : 0,5`; `dismount()` chama `recalc()`.
- Nível 1–30 com XP própria. Voadoras (`fly`): ignoram obstáculos e a rota da vila (`MOUNTS[id].fly`).
- Montaria **não é vendida**: cai de monstro e entra na coleção na hora. (`buyMount` existe na API mas nenhum botão a chama.)

## As 8 montarias
| Montaria | Veloc. | Bônus nv 1 | Bônus nv 30 (×1.725) | Voa | Cai de |
|---|---|---|---|---|---|
| 🐎 `horse` Cavalo de Aldoria | 0,75 | +5 % atk, +6 % hp | +9 % atk, +10 % hp | não | Campos Verdejantes, Floresta Sussurrante, Rei dos Bandidos |
| 🐺 `wolf` Lobo de Guerra | 0,85 | +8 % atk, +2 % crit | +14 % atk, +3 % crit | não | Floresta Sussurrante, Guardião do Bosque |
| 🐗 `boar` Javali Blindado | 0,78 | +14 % def, +12 % hp | +24 % def, +21 % hp | não | Ruínas Esquecidas, Dunas de Kharim, Rei Colosso |
| 🦄 `unicorn` Unicórnio Lunar | 1 | +8 % atk, +10 % def, +8 % hp | +14 % atk, +17 % def, +14 % hp | não | Ruínas Esquecidas, Dunas de Kharim, Faraó Desperto, Rainha Escorpiã |
| 🐅 `tiger` Tigre das Neves | 1,1 | +12 % atk, +3 % crit, +6 % hp | +21 % atk, +5 % crit, +10 % hp | não | Tundra dos Picos Gélidos, Serpe Glacial |
| 🐉 `dragon` Dragão Rubro | 1,3 | +16 % atk, +12 % def, +16 % hp, +3 % crit | +28 % atk, +21 % def, +28 % hp, +5 % crit | sim | Ignar, o Dragão Ancião |
| 🦅 `griffin` Grifo Real | 1,4 | +18 % atk, +10 % def, +14 % hp, +5 % crit | +31 % atk, +17 % def, +24 % hp, +9 % crit | sim | Rei Yeti |
| 🐴 `nightmare` Corcel Sombrio | 1,35 | +20 % atk, +16 % def, +18 % hp, +4 % crit | +34 % atk, +28 % def, +31 % hp, +7 % crit | não | Terras Cinzentas, Lorde Lich, Senhor Demônio |

- Velocidade por nível: `mountLvSpd = 1 + (nv−1)·0,012` (nv 30 = ×1.348); bônus por nível: `mountLvBon = 1 + (nv−1)·0,025`; energia máxima: `mountLvMst = 100 + (nv−1)·5` (nv 30 = 245).
- XP para o próximo nível: `mountXpNeed = round(30·nv^1,55)`: nv 1→2 = 30, nv 10 = 1064, nv 20 = 3117, nv 29 = 5544.

## Como a montaria evolui
- **XP**: só com a montaria ativa (`p.mount`): `round((2 + nível_do_monstro·0,4) · tipo)` por abate (normal 1, elite 3, campeão 6, chefe 10) e 1 XP a cada 40 m cavalgados (`mountXp` em `update`/`killMob`).
- **Repetida** (mesma montaria cai de novo): ganha um nível inteiro de XP (`useMountItem`).
- **Energia** (`p.mst`): gasta `dt/4` por segundo andando montado (100 = ~400 s), recupera parado (`dt/12`). Abaixo de 30 % come ração sozinha (`p.feed`, +60 %); zerou, desmonta. Cavalariço (NPC `stable`): ração 15 ouro, "Tratar" 30 ouro (energia cheia).

## Drop
`CFG.drop.mount` por tipo: normal 0,2 %, elite 2 %, campeão 10 %, chefe 20 % (ajustável no painel do administrador). A montaria vem de `MOUNT_DROP`: por zona (campos: cavalo · floresta: cavalo/lobo · ruínas e dunas: javali/unicórnio · tundra: tigre · cinzas: corcel; elites e campeões puxam para o último da lista) e por chefe (`MOUNT_DROP.boss`). `dropMount(m)` (game.js) coloca na coleção na hora (`p.mbox` virou só legado de saves antigos: ícone dourado na mochila).

## Interface
Painel **[H]** (`renderLook` em ui.js): lista das 8, nível, barra de XP, bônus, "Equipar" (`equipMount`) e "Montar" (`mount`); tecla **X** monta/desmonta (`toggleMount`); quadro da montaria no HUD; o espaço "Montaria" da janela Equipamento abre o [H]. Save: `p.mounts`, `p.lastMount`, `p.mount`, `p.mlv {id: {lv, xp}}`, `p.mst`, `p.feed`, `p.mbox`.

## Onde mexer
| Quero... | Arquivo · símbolo |
|---|---|
| números (bônus, velocidade, preço, nível) | `data.js`: `MOUNTS`, `MOUNT_MAXLV`, `mountXpNeed`, `mountLvSpd/Bon/Mst`, `MOUNT_DROP`, `CFG.drop.mount` |
| lógica | `game.js`: `mountXp`, `useMountItem`, `dropMount`, `equipMount`, `toggleMount`, `dismount`, `restMount`, `recalc` (bônus) |
| painel e texto | `ui.js`: `renderLook`, `mountBonusTxt`, cartão da HUD, `data-a="equipmount"` / `mount` |
| modelo 3D | `models.js`: `mountParts(id)` (cavalo, unicórnio e corcel ainda com pernas de peças; candidatos ao `mkLoft`) |
| sons | `audio.js`: `gallop`, bater de asas (voadoras) |

## Receita: montaria nova
`MOUNTS` (nome, ícone, vel., `bon`, `fly`, descrição) → `MOUNT_DROP` (zona e/ou chefe) → `mountParts` (modelo) → conferir [H], equipar, montar, dropar (`CFG.drop.mount.normal = 1` no console) e o admin (Teste dá todas as montarias de `Object.keys(MOUNTS)`).

## Receita: poder ativo de montaria (ainda não existe)
Ideia: campo `act = {n, cd, k, ...}` em `MOUNTS`, usado como habilidade extra montado (tecla própria ou `E`), reaproveitando os tipos de `useSkill` (`dash`, `buff`, `aoe_self`); recarga em `p.cd`. Mostrar no [H] e na barra de atalhos.

## Armadilhas
- Bônus que dependem de estar montado exigem `recalc()` ao montar/desmontar (já feito em `toggleMount` e `dismount`).
- Equilíbrio: o relatório `docs/RELATORIO_CLASSES_SKILLS_MONTARIAS.md` mostra o peso dos bônus; Corcel Sombrio nv 30 dá +34 % de ataque montado.
- Montaria voadora precisa de `fly` também nas rotas e na colisão (`pushOut(..., fly)`); novo caminho de movimento deve respeitar.
