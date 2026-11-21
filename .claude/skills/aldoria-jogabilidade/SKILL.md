---
name: aldoria-jogabilidade
description: Use ao mexer na jogabilidade do Aldoria (combate, habilidades, classes, atributos, evolução de fase, itens e refino, montarias, monstros e IA, chefes/elites/campeões, XP/ouro/drops, balanceamento, modo automático, controles, contas/save, modo teste do administrador) ou ao testar o jogo por script. Traz onde cada coisa mora, as fórmulas-chave, como testar sem jogar à mão e as armadilhas, para economizar leitura de código.
---

# Aldoria — jogabilidade

Contrato entre `game.js` e `ui.js` (nomes de `G`, `UI.*`, `Game.*`): `CONTRACT.md` (partes defasadas; confira no código). Regras do projeto: offline, um HTML, escopo global único sem colisão de nomes, texto em pt-BR, arte e dados originais (nada de WYD).

## Skills por área (leia a que bater com a tarefa)
- Armas: `aldoria-armas` · Equipamentos (elmo, peitoral, calça, luvas, botas, acessório; drop, requisitos): `aldoria-equipamentos` · Montarias: `aldoria-montarias` · Mestre de Habilidades e habilidades: `aldoria-mestres-habilidades` · Classes e equilíbrio: `aldoria-personagens` · Missões e história: `aldoria-historia` · Visual: `aldoria-graficos`.

## Onde mora cada coisa
- **Balanceamento mora em `src/data.js`**, não em `game.js`: `CLASSES` (stats base/crescimento, `skills`), `xpNeed`, `TIERS`/`TMUL`/`EVO_COST`/`MAXLV`, `mobStats`, `ZONES`, `BOSSES`/`BOSS_POS`, `ELITES`, `SITES`, `RARITY`/`SLOTS`/`WTYPES`/`makeItem`/`itemValue`/`enhChance`/`STONES`, `MOUNTS`/`MOUNT_DROP`/`MOUNT_MAXLV`, `ATTRS`/`AP_PER_LEVEL`, `POT`, `EVENT_TYPES`, e `CFG`/`CFG_DEFAULT` (drops, refino, economia, campeões, joalheiro; editável pelo painel do administrador).
- `src/game.js` (IIFE que devolve `Game`): `recalc` (stats finais), `gainXp`, `useSkill`/`skEff`, `hitMob`, `slam` (ataque de área de monstro/chefe, tem `m.warn`), `dmgPlayer`, `die`/`respawn`, `makeMob`/`retierMobs`, `champUpdate`/`champAt`, `killMob` (XP, ouro, drops), `enhance`, `jewel`, `evolve`, mounts (`equipMount`, `toggleMount`, `buyMount`...), `setAuto`/`toggleAutoCombat`, `save`/`load`, `evTick` (eventos), `startPlay`, `update` (laço principal), `townRoute` (rota nas vilas).
- Missões, história, diárias e conquistas: skill `aldoria-historia`.
- `src/ui.js`: HUD, painéis e diálogos. `src/admin.js`: painel do administrador, IIFE fechada que só acessa o jogo por `Game._adminHook(fn)` (entregue **uma única vez**, já consumida pelo próprio admin.js).

## Fórmulas e fatos-chave (confira no código antes de alterar)
- Níveis por fase: Mortal 1–299, Imortal 1–199, Ancestral 1–149, Supremo 1–50 (`LVCAP`); o conteúdo fica na escala interna 1–50 (`MAXLV`): use `effLv`/`EL(p)` para comparar o jogador com monstros, missões, itens, habilidades e portais e `dispLv` para mostrar níveis do conteúdo; XP do jogador `xpPlayer` (ver `CLAUDE.md`). fases Mortal, Imortal, Ancestral, Supremo com `TMUL = [1, 1.8, 3.2, 5.5]` e custo de evolução `[20000, 80000, 250000]`. Evoluir volta ao nível 1: itens equipados e da mochila vão para o Guarda de Carga; ficam ouro, montarias, habilidades (voltam ao nível 1), história e conquistas; zeram pontos de atributo e habilidade.
- `xpNeed(l) = 25 · l^1.45`. `mobStats`: vida `(90+40·lvl)·(1+lvl/250)`, ataque `(5+2,6·lvl)·(1+lvl/9)·(1+lvl/100)`, defesa `2,2·lvl` (chefes multiplicam por `hpm`/`atkm`/`xpm`). O nível do monstro cresce com a distância até Aldoria dentro da zona.
- Classes: Vanguarda (Fúria, regenera ao acertar), Arcanista (Mana/INT), Caçadora (só arcos/bestas, crítico/esquiva), Invocador (invoca criaturas). Habilidades: teclas 1–5, 8, 9; cada nível dá +10 % de efeito; algumas exigem fase (`tier`) e nível.
- Itens: 5 raridades, refino +1..+10 (chance em `CFG.enh`), adicionais por joia (`STONES`, `ADD_MAX`). Itens exigem classe e fase. Ouro vai direto a `p.gold`; só o Guarda de Carga guarda/saca (Banco: 120 espaços, 3 páginas).
- Montarias não são vendidas: caem de monstros (`MOUNT_DROP`); nível 1–30 com XP; X monta/desmonta.
- Vilas e postos são zonas seguras (monstros não entram nem perseguem). Portais só ligam vilas/postos vizinhos (`PORTAL_LINKS`).
- Save: `localStorage` com `aldoria_save_v1` (antigo), `aldoria_account_v1`/`aldoria_accounts_v2`, `aldoria_auto_v1`, `aldoria_gfx`, `aldoria_admin_v1`. Mudou formato de save: manter migração do antigo.
- Controles: clique anda/ataca/fala; Espaço/Tab atacar/trocar alvo; F falar; Z ou T automático; X montar; I/C/V/M/Q painéis; G qualidade; Ctrl+Shift+F10 administrador.

## Testar sem jogar à mão
Painel do administrador (Ctrl+Shift+F10, aba **Teste**): cria a conta "ADM" (4 personagens Supremo nível 50, tudo no máximo) e trapaças (invencível, sem recarga, mana infinita, velocidade, matar com 1 golpe, teleporte pelo mapa); não são salvas.

Por script (Playwright + Edge, ver `tools/capture_cenas.py` como modelo):
- Espere `typeof Game !== 'undefined'` (`Game` é `const` global, não `window.Game`); `Game.newGame('vanguard')`; só então existe `Game._dbg.world`.
- `Game._dbg`: `G`, `mobs`, `items`, `sim(n, dt)` (síncrono; o jogador pode morrer dentro dele: reabasteça `p.hp` a cada passo), `setTime(h)`, `setWeather(id, lv)`, `killMob(m)`, `setTarget(m)`, `attack(m)`, `moveTo(x,z)`, `talkTo(id)`, `teleport`, `recalc`, `cam`, `R`.
- Para nível/habilidades: `p.lvl = 50; p.sk = p.sk.map(() => 1); Game._dbg.recalc()`. Equipar: `p.eq[slot] = makeItem(slot, p.cls, lvl, boost, tier)`.
- `Game._dbg` e `_adminHook` podem sair numa versão final; ao remover, ajuste os scripts de `tools/`.

## Armadilhas
- Mudar número em `data.js` muda tudo em cascata (XP, vida, dano e drops são multiplicativos com `TMUL`): teste um nível baixo, um ~25 e um ~50, e pelo menos uma fase acima de Mortal.
- `retierMobs` recalcula monstros quando o jogador evolui; mexeu em `makeMob`/`mobObj`, confira chefes, elites e campeões.
- Elites e chefes têm tabelas próprias em `CFG.drop` (`normal`, `elite`, `boss`, `champ`).
- Pendências conhecidas (do `CLAUDE.md`): teleporte pelo mapa às vezes cai ~50 m longe; NPC do estábulo do deserto às vezes não abre a conversa dependendo do lado de chegada.
- Verificação mínima de qualquer mudança: `python build.py`, jogo abre, console sem erros, sem rede, e um ciclo curto (matar monstro, subir de nível, equipar, usar uma habilidade).

## Composição de monstros (auditada na passada 5)
- 1.768 monstros no mundo; o tipo é escolhido por `hash % tamanho da lista` (`MOBS[zona]`), todos com o mesmo peso; o nível vem da distância até Aldoria dentro da zona (`zoneLvl`). Elites (`ELITES`) em ~11 %; cada covil tem 3 elites fixos.
- Tipos por bioma agora: Campos 6 (+Raposa), Floresta 5 (+Urso), Ruínas 6 (+Gárgula), Dunas 5 (+Naja), Tundra 6 (+Urso Polar), Cinzas 6 (+Salamandra). Minotauro só nas Ruínas.
- Registrar monstro novo em 5 lugares: `MOBS`/`ELITES`/`MOB_ALIAS` (`data.js`), `MSPD`/`HGT` (`game.js`), `MOBM`/`MOB_COL`/`MOB_SC` (`models.js`), retrato no mapa `MOB` de `art.js`.
- Locais secretos: `SITES` com `poi:1`; descoberta no `update` de `game.js` (13 m), estado em `G.rec.disc`.

## Áudio
Motor em `src/audio.js` (mixer, 72 efeitos, vozes, passos, ambiente, música); gatilhos em `game.js` (`sfx(nome, {x,z,p,v,force})`, `mobVoice`, `audioUpdate`). Nomes de som por evento: ver `SONS.md`. Teste offline: `python tools/teste_sons.py`. A avaliação auditiva é do usuário (painel: administrador → Teste → Sons).
