# Aldoria Offline — contrato entre game.js e ui.js

Jogo 3D de navegador, offline, arquivo único. Todos os scripts são concatenados na ordem
`engine.js, data.js, models.js, ui.js, game.js` dentro de UM `<script>` (mesmo escopo global).
Já existem prontos e NÃO devem ser reescritos: `src/engine.js` (V, M, MB, Mesh, Renderer),
`src/data.js` (CLASSES, ZONES, MOBS, BOSSES, mobStats, makeItem, QUESTS, NPCS, POT, xpNeed, etc.),
`src/models.js` (playerParts, npcParts, mobParts, MOB_COL, MOB_SC, buildWorld, zoneAt, BOSS_SPOT).
Leia esses três arquivos antes de começar. Idioma de toda a interface: português do Brasil.
Sem rede, sem bibliotecas externas, sem assets externos. Tudo original (NÃO use nomes/arte do jogo WYD).

## Entrada do HTML
`src/index.html` tem `<canvas id="gl">` e `<div id="ui"></div>`. O `ui.js` constrói TODO o resto do DOM dentro de `#ui`
(em `UI.init()`), e o `style.css` o estiliza. `#ui` e o HUD devem ter `pointer-events:none`, exceto os
elementos interativos (botões, painéis, barra de skills), que usam `pointer-events:auto` e fazem `stopPropagation`
em mousedown para o clique não virar "mover personagem". Mouse no canvas e teclas de gameplay são do game.js.

## Estado global lido pela UI: objeto `G` (definido em game.js: `const G = {...}`)
- `G.t` segundos desde o início; `G.mute` bool; `G.vp` Float32Array (view-projection da câmera, atualizado todo frame).
- `G.player` = `{cls, tier, lvl, xp, gold, x, z, hp, maxHp, mp, maxMp, inv:[item], eq:{w,a,c} (item|null), pots:{hp,mp}, cd:[5 números = segundos restantes]}`
  (item = objeto de `makeItem` em data.js).
- `G.stats` = `{atk, def, crit, spd, maxHp, maxMp, setBonus:bool}` (já com equipamento, tier e buffs).
- `G.quests` = `{ [id]: {state:'locked'|'available'|'active'|'ready'|'done', prog:number} }`. Missões são sequenciais (q1..q6) e exigem `lvl` mínimo.
- `G.target` = `null | {name, lvl, hp, maxHp, boss:bool}`.
- `G.zone` = entrada de `ZONES` onde o jogador está agora.
- `G.mobs` = array de `{x, z, dead:bool, boss:bool}` (minimapa). `G.npcs` = `NPCS` de data.js.
- `G.labels` = array de `{x, y, z, text, cls:'npc'|'boss'|'mob'}` com coordenadas de mundo, recalculado todo frame (nomes sobre NPCs, chefes e alvo).

## UI.* — implementado em ui.js, chamado pelo game.js
- `UI.init()` — chamada uma vez no boot; monta DOM, liga eventos (teclas I/C/Q/Esc/M, botões).
- `UI.showMenu(hasSave:boolean)` / `UI.hideMenu()` — tela inicial: título, 4 cartões de classe (ícone, nome, papel, descrição, lista das 5 habilidades) → clicar chama `Game.newGame(clsId)`; botão "Continuar" (se hasSave) → `Game.continueGame()`; botão "Apagar save" → `Game.deleteSave()` e reexibe menu.
- `UI.update(G)` — chamada todo frame; deve fazer trabalho pesado só ~10x/s. Atualiza: barras HP/MP/XP e nível/classe/tier, nome da zona, barra de habilidades (5 skills com ícone, tecla 1–5, custo de mana, overlay de cooldown com `G.player.cd[i]` e `CLASSES[cls].skills[i].cd`; skill com `tier` > player.tier aparece bloqueada), poções (tecla 6 HP / 7 MP com quantidade), quadro do alvo (`G.target`), minimapa (canvas ~140px, círculo do mundo com raio `WORLD_R`, cores por zona, pontos para mobs vivos, NPCs, jogador no centro; pode ser fixo no norte), rastreador da missão ativa, e REPOSICIONA a cada frame os textos flutuantes e os rótulos de `G.labels` projetando com `M.xform(G.vp,[x,y,z])` → tela (ignore pontos com |ndc|>1 ou z>1).
- `UI.log(text, cls)` — linha no chat/log (canto inferior esquerdo, máx. ~8 linhas, some devagar). cls: 'sys','dmg','loot','quest','lvl'.
- `UI.float(wx, wy, wz, text, cls)` — texto flutuante que sobe e some (~1 s). cls: 'dmg','crit','heal','xp','miss','player' (dano recebido).
- `UI.toast(text)` — aviso grande central curto. `UI.levelUp(lvl)` — banner "NÍVEL N!".
- `UI.refreshPanels()` — redesenha painéis abertos (inventário, personagem, missões, diálogo) após mudança de estado.
- `UI.openDialog(npcId)` / `UI.closeAll()` — diálogo de NPC e fechar tudo. `UI.isBlocking()` → true se algum painel/diálogo/menu está aberto (o game usa para ignorar teclas de gameplay).
- `UI.showDeath()` / `UI.hideDeath()` — overlay "Você caiu" com botão "Voltar à vila" → `Game.respawn()`.

### Painéis (teclas)
- **I Inventário**: slots de equipamento (Arma/Armadura/Acessório) + grade de até 24 itens do `G.player.inv`. Cada item mostra nome colorido pela raridade (`RARITY[it.rar].c`), +refino, stats, valor. Clique no item da grade → `Game.equip(it.id)`; clique no equipado → `Game.unequip(slot)`. Mostrar também ouro e poções. Mostrar comparação simples (ex.: "+12 atk" em relação ao equipado) ao passar o mouse (título/tooltip ok).
- **C Personagem**: classe, tier (`TIERS`), nível, XP/`xpNeed`, atk, def, crit, vida, mana, velocidade, bônus de set se `G.stats.setBonus`, lista das habilidades com descrição `d`.
- **Q Missões**: lista de `QUESTS` com estado/progresso (`G.quests[id]`), texto `t`, recompensa `rew`.

### Diálogos de NPC (`UI.openDialog(id)`, cada NPC em `NPCS`)
- `maelis` — missões: para cada quest `available` botão "Aceitar" → `Game.acceptQuest(id)`; `ready` botão "Entregar" → `Game.turnInQuest(id)`; `active` mostra progresso. Seção Evolução: `Game.canEvolve()` devolve `{ok, reason, nextTier, cost}`; botão "Ascender/Transcender" (nome por `TIERS[nextTier]`) → `Game.evolve()`.
- `doran` — loja: comprar poção de vida/mana (x1 e x10, preço `POT[x].price`) → `Game.buy('hp'|'mp', n)`; vender itens do inventário (botão por item com `itemValue`) → `Game.sellItem(id)`.
- `brann` — refino: para cada slot equipado mostrar item, chance (`ENH_CHANCE[plus]`), custo (`enhCost`), botão → `Game.enhance(slot)` que devolve `{ok:boolean, msg:string}`; mostrar `msg` no diálogo. Máx. +10.
- `lia` — botão "Receber cura" → `Game.heal()`.
Depois de cada ação, o game chama `UI.refreshPanels()`.

## Game.* — implementado em game.js, chamado pela UI
`Game.hasSave()`, `Game.newGame(clsId)`, `Game.continueGame()`, `Game.deleteSave()`, `Game.useSkill(i)` (0–4), `Game.usePotion('hp'|'mp')`,
`Game.equip(itemId)`, `Game.unequip(slot)`, `Game.sellItem(itemId)`, `Game.buy(kind,n)`, `Game.enhance(slot)→{ok,msg}`, `Game.heal()`,
`Game.acceptQuest(id)`, `Game.turnInQuest(id)`, `Game.canEvolve()→{ok,reason,nextTier,cost}`, `Game.evolve()`, `Game.respawn()`,
`Game.toggleMute()`, `Game.save()`. Clique nos botões da barra de skills chama `Game.useSkill(i)`.
Teclas de gameplay (1–5 skills, 6/7 poções, Espaço atacar, Tab trocar alvo, WASD/setas, F falar com NPC próximo, roda zoom, botão direito gira câmera) são tratadas pelo game.js.
Teclas I, C, Q, M, Esc são tratadas pelo ui.js (M chama `Game.toggleMute()`).

## Pontos de entrada
`game.js` termina com `window.addEventListener('load', () => Game.boot())`. `Game.boot()` cria `Renderer`, `buildWorld`, chama `UI.init()`, inicia o loop e chama `UI.showMenu(Game.hasSave())`.
O jogo só simula (monstros, tempo) quando `G.state === 'play'`; no menu apenas renderiza a vila com a câmera girando devagar.

## Modo automático
Estado em `G.auto = {attack, skills, hp, mp, hpPct, mpPct}` (booleanos desligados por padrão; `hpPct` padrão 50 e `mpPct` padrão 30, faixa 10–90).
Também em `G`: `G.autoOut = {hp, mp}` (true = poções daquele tipo acabaram; o gasto automático fica suspenso até ter de novo, aviso `UI.log` uma única vez) e `G.autoPaused` (true enquanto o auto-atacar está pausado ~3 s por ação manual: clique de mover/WASD).
Persistência: `localStorage['aldoria_auto_v1']` (JSON de `G.auto`), carregado no boot e em novo jogo/continuar; o save `aldoria_save_v1` não mudou.
- `Game.setAuto(key, value)` — `key` em `attack|skills|hp|mp` (booleano) ou `hpPct|mpPct` (número, arredondado e limitado a 10–90). Salva e chama `UI.refreshPanels()`.
- `Game.toggleAutoCombat()` — liga/desliga `attack`+`skills` juntos (tecla **Z**, tratada em game.js) e mostra `UI.toast`.
- Decisão a cada ~0,15 s, só com `G.state==='play'`, jogador vivo e `!UI.isBlocking()`. Ordem: poções → habilidades (`Game.useSkill`, prioridade por `k`: heal, shield, buff, summon, aoe_self, aoe_ground, mark, pierce, proj, melee, dash; reserva de 15% de mana quando a poção de mana automática está desligada) → auto-atacar (alvo mais próximo em raio 18, ignora chefes com HP do jogador < 60%, recolhe itens em raio 14, volta ao ponto de origem). Comandos criados pelo automático levam `cmd.auto = true`.
- UI: `UI` tem painel `#p-auto` (tecla **T**, botão 🤖 `data-a="p-auto"`), ações `auto`, `auto-pct`, `auto-all`, selo `.auto-badge` ("🤖 AUTO ⚔️✨❤️💙", visível só com alguma opção ligada; âmbar quando pausado). O painel lê `G.auto`/`G.autoOut` e chama `Game.setAuto`.
