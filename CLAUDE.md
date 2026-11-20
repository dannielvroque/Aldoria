# Aldoria Offline

RPG de ação 3D que roda no navegador, 100% offline, em um único arquivo HTML. Sem dependências, sem rede, sem assets externos.
Interface e textos do jogo em português do Brasil.

## Como construir e testar
- `python3 build.py` junta `src/*` em `dist/aldoria.html` (abra esse arquivo no navegador, não precisa de servidor).
- Ordem de concatenação (um único escopo global): `engine.js, data.js, meshes_extra.js, models.js, world.js, ui.js, game.js`. Não há módulos nem bundler.
- Depois de qualquer mudança: rodar o build, abrir no navegador, conferir o console (não pode haver erros nem requisições de rede).

## Arquitetura (`src/`)
- `engine.js`: mini motor WebGL2 próprio (`V`, `M`, `MB`, `Mesh`, `Renderer`). Modelos são listas de partes (caixa, cilindro, cone, esfera) desenhadas com `R.parts`.
- `data.js`: dados do jogo (classes e habilidades, zonas, monstros, chefes, itens, missões, NPCs, fórmulas de XP). Balanceamento mora aqui.
- `models.js`: modelos 3D por código (jogador por classe/tier, NPCs, monstros).
- `world.js`: terreno, zonas e cenário estático (`buildWorld`, `zoneAt`, `BOSS_SPOT`).
- `meshes_extra.js`: primitivas de malha extras registradas no boot (`registerExtraMeshes`).
- `ui.js` + `style.css`: HUD, menu, painéis e diálogos de NPC (DOM sobre o canvas).
- `game.js`: estado `G`, API `Game.*`, câmera, input, combate, IA, loot, missões, modo automático (atacar, habilidades e poções; tecla T/Z), save (`localStorage`, chave `aldoria_save_v1`; opções do automático em `aldoria_auto_v1`), áudio sintetizado.
- A vila (raio 15 do centro, `SAFE_R` em `game.js`) é zona segura: monstros não entram, não perseguem e ninguém leva dano lá dentro.
- Peças presas à mão com rotação (escudo, arco) devem usar `PA`/`rotOff` em `models.js`, senão a peça gira junto com o deslocamento e sai do lugar.
- A aparência do personagem (`playerParts` em `models.js`) segue o equipamento: grau, raridade e refino da arma, armadura e acessório.
- `CONTRACT.md`: contrato exato entre `game.js` e `ui.js` (nomes de `G`, `UI.*`, `Game.*`). Leia antes de mexer nos dois lados.

## Regras do projeto
- O jogo é original. Não copie nem importe nomes, modelos, texturas, sons, textos ou tabelas de dados do jogo WYD (With Your Destiny) ou de qualquer outro jogo comercial. Mecânicas genéricas inspiradas nele são ok.
- Manter offline: nada de CDN, fontes externas, `fetch` de URLs externas.
- Manter um único escopo global sem colisão de nomes entre arquivos.
- `Game._dbg` é um gancho de depuração e pode ser removido numa versão final.

## Ideias de próximos passos
Mais mapas e missões, árvore de talentos, itens com efeitos especiais, ajuste fino de balanceamento (XP, dano, drops), modelos mais detalhados, controles por gamepad.

## Gráficos (nov/2026)
- engine.js: sombras (shadow map 2048, PCF), céu, HDR 16F + bloom + ACES + vinheta, MSAA 4x. Qualidade Baixa/Média/Alta (tecla G, salva em localStorage `aldoria_gfx`). `R.begin(vp,cam,fog,fogD,env)` ... `R.end(exposure)`; `R.beginShadow(focus)`/`R.endShadow()`.
- Luz por zona em game.js (`LIGHT`, `lightCur`). world.js devolve malha com `.mtn` (sem sombra), `.glow` (emissivo) e `.water`.
- meshes_extra.js: `rbox` (caixa arredondada). `R.parts` troca 'box' por 'rbox' (use `sharp:1` para aresta viva). Partes aceitam `fl` (bater de asas).
## Aparência e montarias
- data.js: MOUNTS, MOUNT_SEAT, HAIR_STYLES/COLORS, EYE_COLORS, SKIN_TONES, DEFLOOK. Jogador: `p.look`, `p.mounts`, `p.mount`.
- Painel H (aparência + montarias), tecla X monta/desmonta, compra com Doran. Atacar/usar skill desmonta. Dragão ignora obstáculos.

## Mundo expandido, portais e dinheiro (nov/2026)
- **Regiões** (`REGIONS` em `data.js`): Aldoria (0,0), Deserto de Kharim (420,0), Picos Gélidos (0,-420), Cratera de Ignar (-420,0). Cada uma é um disco de raio `WORLD_R=80` no mesmo plano; só se chega às novas por **portal**. `regionAt(x,z)`/`zoneAt` (world.js) usam o centro da região; clima por região em `REGIONS[].clim` (rain/none/snow/ash).
- **Zonas novas**: oasis/dunes, frostv/tundra, forge/ashlands (`lv:[min,max]` define o nível dos monstros pelo raio). 12 monstros novos + 3 chefes (scorpqueen, yetiking, ignar) em `MOBS`/`BOSSES`/`models.js`.
- **Vilas/postos** (`VILLAGES`, `SAFES`): zonas seguras (`inSafe`/`keepOut` percorrem `SAFES`). Posto de Brumavale fica na floresta de Aldoria. Cada vila tem portal (`portal`/`arrive`), NPCs por `kind` (quest, shop, smith, heal, portal) — o diálogo e o modelo dependem do `kind`, não do id.
- **Portais**: `Game.teleport(id)` cobra ouro e exige nível (`VILLAGES[].lvl/price`). Diálogo `portal` em ui.js.
- **world.js**: `buildWorld` devolve a malha de Aldoria com `.regs` (uma malha por região; só a região da câmera é desenhada). `themeVillage`, `camp`, `portal`, `arena`, tipos de árvore novos (cactus, palm, pillar, snowpine, crystal, obsidian, charred).
- **Missões q7–q12** (campo `after` = pré-requisito); qualquer Ancião (`kind:'quest'`) entrega/aceita.
- **Dinheiro**: monstros largam pilhas de moedas no chão (`items` com `coin`), coletadas ao chegar perto (também no modo auto); carteira em destaque no inventário.
- Testes: `test_regions.py`, `test_wild.py`, `test_flow.py` (Playwright + swiftshader). `Game._dbg` tem `killMob`, `teleport`.

## Montaria equipada, portal por proximidade e estilo dark fantasy (nov/2026)
- **Montaria** é um slot de equipamento: `p.lastMount` = montaria equipada (dá bônus `MOUNTS[id].bon` em `recalc`); `Game.equipMount(id)`; `X` monta/desmonta a equipada; atacar/usar skill NÃO desmonta mais.
- **Portal**: ao chegar a <1.7 do centro de um portal (`VILLAGES[].portal`) abre o diálogo do Guardião daquela vila (`portalLock` evita reabrir até se afastar). Clicar no portal anda até ele.
- **Raridades** agora 5: Comum, Incomum, Raro, Épico, Lendário (`RARITY`, `RAR_GLOW`, roll em `makeItem`). Lendário/Épico têm brilho nas ombreiras e brasas (`armorDeco`).
- **models.js**: `styleLayer` (capa, ombreiras, detalhes dourados, orelhas élficas, capuz, orbes por classe). Monstros novos: rat, bandit, orc, necro, banshee, fireelem, waterelem; elites (`ELITES`, ~11% dos spawns, ★ no nome): alphawolf, queenspider, minotaur, orcwar, hydra, phoenix; chefes novos: lich (ruínas), demon (cinzas), ignar agora é o Dragão Ancião.
- Testes: `test_gallery.py ids out.png` (monstros em fileira, `SAFES.length=0` no teste), `test_classes.py rar grade`, `test_new.py`, `test_portal.py`.

## Criação de personagem e upgrade gráfico (v. mais recente)
- **Fluxo de menu**: título (`Novo jogo` / `Continuar` / `Apagar save`) → `Game.createOpen()` abre o estado `G.state='create'` (palco em `CR_POS` na praça, câmera fixa `CY`, personagem gira com `G.cr.yaw` por arrasto). UI em `ui.js`: `buildCreate/syncCreate/showCreate/hideCreate`; ações `cr`, `cr-cls`, `cr-rand`, `cr-rname`, `cr-back`, `cr-go`. `Game.newGame(cls, look, name)`.
- **Aparência** (`p.look`): `g` gênero (0/1), `hs` cabelo (12), `hc` cor (16) ou `hcx` hex personalizado, `bd` barba, `fc` marca de rosto, `ec` olhos, `sk` pele (10), `b` porte. Tabelas e `LOOK_LIM` em `data.js`; `lookHtml(L, acao)` em `ui.js` é compartilhado entre criação ('cr') e painel H ('look'). Cache de modelos usa `LOOK_KEYS` (models.js). `lookScale(look)` altera a altura (gênero/porte). Saves antigos ganham defaults via `Object.assign(DEFLOOK)`.
- `p.name` (até 14 chars) é salvo; aparece no painel do personagem e na mensagem de boas-vindas.
- **Modelos**: `humanoid()` agora tem tronco em V (masc.) / cintura+quadril+busto (fem.), pescoço, ombros arredondados, orelhas e rosto (`faceParts`: sobrancelhas, nariz, boca, cílios, marcas, barba). Roupa inicial já usa a cor da classe.
- **Shaders** (`engine.js`): vento nas folhas (detail=1 e cor verde), AO falso de contato, brilho especular em metais, luz de contorno e contraluz, névoa por altura + dispersão do sol, céu com nuvens procedurais (`uTime`,`uCloud`), pós: aberração cromática leve, nitidez, graduação de cor (sombras frias/luzes quentes), curva S, vinheta. Montanhas usam detail=2 (sem vento).
- Testes: `test_create*.py`, `test_gfx*.py`, `test_flow2.py` (software rendering: rodar em background e esperar ~60-100 s).
- **PBR simplificado** (engine.js FS): GGX + Fresnel, `draw(..., rough, metal)` e `q.rg/q.mt` nas partes; metal detectado por cor (aço/ouro) em modelos; reflexo do céu (uTop/uFog) + brilho do sol; chuva (`E.wet`) molha o chão (mais liso/escuro/reflexivo); água com rugosidade .06. Limbs do `humanoid` agora usam `capsule`. SSAO real não implementado (usa AO falso de contato).
- **Atributos**: `ATTRS`, `ATTR_KEYS`, `AP_PER_LEVEL=5` em data.js; `p.attr`/`p.ap` salvos; `Game.addAttr/resetAttr` (redistribuir custa 50×nível de ouro); efeitos em `recalc` (Força→atk, Destreza→crit/vel., Inteligência→mana/dano de skill `S.skillMul`, Vitalidade→vida/def, Cura→`S.healMul` e `S.potMul`). UI na aba Personagem [C]; botão pulsa com pontos livres.
- **Ouro** vai direto para `p.gold` em `killMob` (sem moedas no chão; código de moedas do chão ficou, inerte). Painel [H] agora é só Montarias (aparência é definida na criação).
- **Visual desenhado (toon)**: normais planas por derivadas (facetado), luz em 3 faixas, brilho em faixa única, linhas de tinta por `fwidth` (arestas) + detecção de bordas no pós (silhuetas), esfera/cilindro de baixa poligonagem, `softBox=false` (rbox/capsule viram box/cil), nuvens em faixas, mais saturação.
- **Personagens (v. estilizada)**: `humanoid()` usa membros afunilados (`tc`, `tcw` = cilindros cônicos), tronco `tbox` (caixa afunilada), botas com bico (`shard`), braços em 3 segmentos. Meshes novos em meshes_extra.js. Objetos usam normais suaves (esfera 16x10); o mundo (`uDetail>0.5`) continua facetado.
- **Modelos com ossos (Mixamo FBX)**: `tools/fbx2aldoria.py` converte FBX binário (malha+pele+animação; dedos fundidos na mão → 22 ossos) e `tools/pack.py` empacota `assets/*.fbx` em `src/assets_data.js` (`assets/<nome>.fbx` = personagem, `assets/anim_<nome>.fbx` = animação). `src/skin.js`: `SKINS`, `skinAnim(nome)`, `skinPose(skin, anim, t)` (matrizes de pele baked por quadro, 30 fps). Engine: VS com `uSkin/uBones[24]` (também no pass de sombra); `mesh.bones` ativa a pele no `R.draw`. Escala do Mixamo: cm → usar `.0105`. Teste: botão "modelo 3D com ossos" na criação. Ainda não integrado ao gameplay (falta idle/walk/run/ataque/morte, equipamentos por cima e texturas).
