# Aldoria Offline

RPG de ação 3D que roda no navegador, 100% offline, em um único arquivo HTML. Sem dependências, sem rede, sem assets externos.
Interface e textos do jogo em português do Brasil.

## Como construir e testar
- `python build.py` (ou `python3`) junta `src/*` em `dist/aldoria.html` (abra esse arquivo no navegador, não precisa de servidor).
- Ordem de concatenação (um único escopo global, sem módulos nem bundler): `engine.js, data.js, meshes_extra.js, [assets_data.js se existir], skin.js, models.js, art.js, story.js, world.js, ui.js, game.js, admin.js`. `style.css` e `index.html` entram pelo template.
- Depois de qualquer mudança: rodar o build, abrir no navegador, conferir o console (não pode haver erros nem requisições de rede).
- Publicar na web para teste: `python tools/deploy_s3.py <bucket> [id-cloudfront]` (build + envio como `index.html` + invalidação; exige AWS CLI configurado; `--dry-run` só mostra os comandos). Os saves ficam no `localStorage` de cada origem.
- Hospedagem AWS (S3 privado + CloudFront + role OIDC do GitHub) em Terraform em `infra/*.tf`; passo a passo em `infra/README.md`. `.github/workflows/deploy.yml` publica a cada push na `main` (usa variáveis `AWS_ROLE_ARN`, `AWS_REGION`, `S3_BUCKET`, `CF_DISTRIBUTION_ID`).
- Os scripts de teste Playwright antigos (`test_*.py`) não estão mais no repositório; teste abrindo o jogo e usando o modo teste do administrador (abaixo).
- Pasta oficial do projeto: `C:\Users\danni\iCloudDrive\projetos\Aldoria` (GitHub: dannielvroque/Aldoria, branch `main`).

## Arquitetura (`src/`)
- `engine.js`: mini motor WebGL2 próprio (`V`, `M`, `MB`, `Mesh`, `Renderer`). Modelos são listas de partes (caixa, cilindro, cone, esfera…) desenhadas com `R.parts`.
- `data.js`: dados do jogo (classes e habilidades, continente, zonas, monstros, chefes, itens, missões, NPCs, montarias, fórmulas de XP, `CFG`/`CFG_DEFAULT`, eventos). Balanceamento mora aqui.
- `models.js`: modelos 3D por código (jogador por classe/fase, NPCs, monstros, armas, montarias).
- `meshes_extra.js`: primitivas de malha extras registradas no boot (`registerExtraMeshes`).
- `skin.js` + `assets_data.js`: modelos com ossos (Mixamo FBX) — ver seção própria.
- `art.js`: arte vetorial SVG (retratos de classe, monstros, arte do menu).
- `story.js`: história "Crônicas de Aldoria" (`CHAPTERS`, `MAIN`: etapas talk/kill/collect/elite/boss/explore), missões diárias (`DAILY_POOL`), conquistas (`ACHIEVEMENTS`), marcos (`LANDMARKS`), NPCs de serviço.
- `world.js`: terreno, zonas e cenário estático (`buildWorld`, `zoneAt`).
- `ui.js` + `style.css`: HUD, menu, painéis e diálogos de NPC (DOM sobre o canvas).
- `game.js`: estado `G`, API `Game.*`, câmera, input, combate, IA, loot, missões, modo automático (T/Z), contas, save, áudio sintetizado.
- `admin.js`: painel de administrador, IIFE fechada que só acessa o jogo por `Game._adminHook(fn)`.
- `CONTRACT.md`: contrato entre `game.js` e `ui.js` (nomes de `G`, `UI.*`, `Game.*`). Leia antes de mexer nos dois lados, mas ele foi escrito numa fase inicial (ordem de build e listas de arquivos dele estão defasadas).

## Mundo: um continente único
- `data.js`: `LOBES` (discos cuja união suave + ruído forma o contorno), `coastD(x,z)` (metros até a costa, >0 = terra), `isLand`, `SEA_Y`, `SHORE`, escala `CK`. Cercado de mar com praias; norte = z negativo.
- **Regiões** (`REGIONS`): Reino de Aldoria (centro, clima chuva), Deserto de Kharim (leste), Picos Gélidos (norte), Cratera de Ignar (oeste). **Zonas** (`ZONES`, sementes `ZSEED`, Voronoi com peso e transição suave): town, field 1–12, forest 13–30, ruins 31–50 (sul), oasis/dunes 26–40, frostv/tundra 37–50, forge/ashlands 48–60. O nível do monstro cresce com a distância até Aldoria dentro da zona (`ZD`).
- **Ampliação do mapa**: 4 lóbulos novos em `LOBES`/`ZSEED` (sudeste, leste, sudoeste, nordeste), 4 cidades (Pedraluz, Oásis de Zahar, Forte Cinzeiro, Porto Gélido de Frostmar; têm planta própria em `TOWN_DEF` (Pedraluz em anéis com obelisco; Zahar em bazar com boulevard e cisterna; Cinzeiro em cidadela com fortaleza central; Frostmar em ferradura em volta de lago congelado), paleta própria (`PAL.<id>`) e centro próprio em `townLayout` (ramos por `v.id`)) e 4 postos (`p_se`, `p_e`, `p_ne`, `p_sw`), com estradas, `PORTAL_LINKS` nos dois sentidos, NPCs de serviço (`NAMES` em story.js) e luz por zona (`lightZ`).
- Dá para atravessar a pé (estradas `ROADS` ligam as vilas). **Portais** (`PORTAL_LINKS`) só levam a vilas/postos vizinhos, como atalho.
- **Vilas e postos** (`VILLAGES`, `SAFES`): zonas seguras (monstros não entram, não perseguem, ninguém leva dano). Aldoria (cidade grande, praça com fonte), Sahr, Hielmar, Cinzas + postos. NPCs por `kind`; diálogo e modelo dependem do `kind`, não do id.
- **Chefes**: 10, posições em `BOSS_POS` (longe dos portais); 6 masmorras e 6 covis de elite espalhados (`SITES`); elites (`ELITES`, ★ no nome). Armas únicas de chefe em `UNIQUE_W`.
- `world.js` devolve malhas com `.mtn` (sem sombra), `.glow` (emissivo) e `.water`.

## Personagem, classes e evolução
- Classes: Vanguarda (`vanguard`, Fúria), Arcanista (`arcanist`, Mana/INT), Caçadora (`huntress`, só arcos/bestas, crítico/esquiva), Invocador (`tamer`, invoca criaturas). Armas por classe em `WTYPES`. Habilidades ficam no painel V; cada nível dá +10% de efeito.
- **Evolução** (`TIERS`): Mortal → Imortal → Ancestral → Supremo, nível máx. por fase em `LVCAP` (ver "Níveis por fase"), custo em `EVO_COST`, multiplicador de stats `TMUL`. Ao evoluir volta ao nível 1; só muda a fase (ver abaixo): itens, ouro, montarias, história e conquistas ficam; pontos de atributo e de habilidade reiniciam e as habilidades aprendidas voltam ao nível 1. Itens exigem classe e fase.
- **Atributos**: `ATTRS`, `AP_PER_LEVEL=5`, `p.attr`/`p.ap`; redistribuir custa ouro; aba Personagem [C]. Força→atk, Destreza→crit/vel., Inteligência→mana/dano de skill, Vitalidade→vida/def, Cura→cura e poções.
- **Aparência** (`p.look`: gênero, cabelo, cor, barba, marca de rosto, olhos, pele, porte) é definida na criação de personagem (`Game.createOpen`, `Game.newGame(cls, look, name)`; UI `buildCreate/syncCreate`, `lookHtml`). `p.name` até 14 chars. Cache de modelos por `LOOK_KEYS`.
- **Itens**: 5 raridades (`RARITY`: Comum…Lendário), slots `SLOTS` (arma, elmo, peitoral, calça, botas, acessório), refino +1..+10, adicionais por joia (`STONES`, `ADD_MAX`). Kit inicial: arma e roupa +0 sem adicionais e 10 poções; conjunto Comum no nível 16 e Incomum no 26 entregues no Guarda de Carga; o resto por drop. A aparência segue o equipamento (`playerParts`).
- **Drops** (`rollDropItem` em game.js): qualquer classe (40% a do jogador), nível do item em torno do monstro (às vezes bem acima) e, às vezes, de fase superior; equipar exige classe, fase **e nível** (`itemReqLvl`, `it.rq` o substitui; itens de fase inferior à do jogador não exigem nível). O que não dá para usar fica no Guarda de Carga (esmaecido na mochila, classe `.nouse`). Monstro comum bate com `MOB_ATK` (×1,4); `tools/teste_luta_real.py` mede lutas reais por classe e nível (rodar depois de mexer em `mobStats`).
- **Montarias**: não são vendidas; caem de monstros (`MOUNT_DROP`), nível 1–30 com XP (`MOUNT_MAXLV`, `mountXpNeed`), ração e “Tratar” no Cavalariço. `Game.equipMount(id)`; X monta/desmonta; quadro da montaria no HUD. Painel [H] = montarias.
- **Balanceamento por classe** (`recalc`, `dmgPlayer`): crítico máx. 60 % e esquiva máx. 35 % sem buffs (buffs passam do teto); `base.dr` (Vanguarda: 8 % + 3 % por fase) reduz o dano recebido; Bloqueio com Escudo reflete 50 % (`refl`); pets herdam o crítico do dono; bônus de montaria vale inteiro montado e pela metade desmontado. Diagnóstico e modelo em `docs/RELATORIO_CLASSES_SKILLS_MONTARIAS.md` e `tools/modelo_combate_*.py` (rodar de novo a cada mudança de números).
- **Espaços de equipamento** (`SLOTS`/`SLOT_ORDER`): arma, elmo, peitoral (ícone de camisa 👕), calça, **luvas** (`g`: defesa, vida e um pouco de ataque; Manoplas/Luvas/Braçadeiras por classe, desenhadas no modelo 3D por `gg`), botas e acessório. Montaria dropada entra na coleção na hora (`dropMount` → `useMountItem`); equipar/evoluir em [H]. Os mestres de habilidades de todas as cidades se chamam "Mestre de Habilidades".
- **Ícones de armadura e acessório** (`ARMART` no fim de art.js; `iconOf`/`SLOT_IC` em ui.js): SVG por classe e peça (Peitoral de placas, Manto, Couraça, Colete, Elmo, Chapéu, Capuz, Cocar…) com textura do material do grau (`ARMART.MAT`, mesma ordem de `CLS_ARM_MAT`: linho em trama, lã tricotada, seda, couro, ferro com ferrugem, aço escovado, peles, escamas, ossos, penas); patterns num `<defs>` global único (`am-<classe>-<grau>`). Acessórios desenhados pelo grau (`ACC_NAMES`). As cores 3D (`ARM_CLS_COL`, models.js) seguem os mesmos materiais: `playerParts` usa a cor pura do material (sem misturar com a cor da classe), capa/capuz no tom do material (menos a capa vermelha da Vanguarda) e detalhes do ícone via `armTrim` (faixa e barra do manto, faixa do chapéu, alça cruzada da Caçadora, colar de presas e cocar de penas do Invocador).
- **Golpe com o corpo todo** (desenho do jogador em game.js): durante `p.atkT` o personagem avança, inclina e gira o tronco por classe (Vanguarda golpe com giro, Caçadora de lado, conjuradores com impulso); o braço esquerdo também sobe (`AT_L` em models.js, via `L_` e `humanoid`).
- **Ouro** vai direto para `p.gold`; só se guarda/retira no Guarda de Carga (Banco, 120 espaços em 3 páginas).

## Contas e save
- Várias contas no mesmo navegador (“⇄ Trocar conta”), vários personagens por conta, baú compartilhado (Guarda de Carga). Chaves `localStorage`: `aldoria_save_v1` (save antigo), `aldoria_account_v1`/`aldoria_accounts_v2` (contas), `aldoria_auto_v1` (modo automático), `aldoria_gfx` (qualidade gráfica, tecla G), `aldoria_eco` (economia de energia: ~40 FPS e resolução um pouco menor; padrão ligada no toque, botão na Pausa), `aldoria_admin_v1` (administrador).

## Save na nuvem (cloud.js)
- Opcional: só aparece se existir `cloud.json` na raiz (saída `cloud_json` do Terraform; `build.py` injeta como `CLOUD_CFG`). Sem ele o jogo é 100% offline.
- `src/cloud.js` (`Cloud`): login Cognito por e-mail/senha via `fetch` (SignUp, ConfirmSignUp, USER_PASSWORD_AUTH, refresh, ForgotPassword) e API `GET/PUT /save`. Sessão em `localStorage` `aldoria_cloud_v1`.
- `game.js` (bloco "save na nuvem"): `ACC.cloud` (e-mail), `ACC.ct` (versão da nuvem), `ACC.dirty`. `save()` → `cloudMark` → envio após 15 s, ao sair do app (`visibilitychange`) e ao voltar ao menu. `cloudPull` reconcilia ao entrar e ao abrir o jogo; conflito (409) → `cloudResolve`. UI no menu (`cloudHtml`/`cloudAct` em ui.js).
- Infra em `infra/cloud.tf` + `infra/lambda/save.mjs` (valida o formato, limite 2 MB; checagem antitrapaça ainda não existe).

## Interface (estilo WYD, só como mecânica genérica)
- Inventário [I] = janela “Equipamento” (slots em volta do personagem, “+N”, mochila em grade, ouro na base); Banco abre ao lado; Ferreiro e Joalheiro abrem junto com o Equipamento.
- Teclas: clique anda/ataca/fala; 1–5, 8, 9 habilidades; 6/7 poção de vida/mana; Espaço/Tab atacar/trocar alvo; F falar; Z (ou T) automático; X montar; I/C/V/M/Q equipamento/personagem/habilidades/mapa/missões; G qualidade gráfica; Ctrl+Shift+F10 administrador.
- **Mover itens**: cada item da mochila e do baú tem posição (`it.pos`, ver `fillPos` em data.js). Clique pega o item (fica flutuando no cursor), clique em outro espaço solta ou troca, clique no boneco equipa; Shift+clique faz a ação rápida (equipar/guardar/retirar); Esc ou botão direito cancela; com Ferreiro/Joalheiro abertos o clique só escolhe o item. API: `Game.itemMove(origem, id, destino, pos)` com 'bag'/'bank'.
- **Habilidades**: o personagem começa sem nenhuma e ganha 3 pontos por nível (`SK_PTS_LEVEL`). Aprender (custo em `SK_LEARN[i].pts`, exige nível e fase) e subir o nível da habilidade (`skRaiseCost`, teto `skCap` = 1 + nível÷5) acontecem com pontos no Mestre de Habilidades; o painel V mostra e também sobe de nível.
- Mapa [M] com zoom 1x–14x, legenda e seta de missão com distância. Barra de atalhos em dois grupos (habilidades e poções).

## Administrador (`admin.js`, Ctrl+Shift+F10)
- Senha com PBKDF2, bloqueio de 60 s após 3 erros, sessão de 15 min. A senha só impede abertura acidental (jogo offline); validação real precisa de servidor se virar multiplayer.
- Abas: Drops, Refino, Economia, Campeões, Joalheiro, Eventos (XP/ouro em dobro, chuva de raros, invasão de campeões, refino abençoado, pedras em dobro; faixa dourada no topo), Exportar/Importar, Restaurar, **Teste**.
- Aba Teste: cria a conta “ADM” com 4 personagens Supremo nível 50, equipamento Lendário +10, todas as montarias e 10 milhões de ouro; trapaças (invencível, sem recarga, mana infinita, velocidade, matar com 1 golpe, teleporte pelo mapa) com faixa “MODO TESTE”.
- `Game._dbg` e `Game._adminHook` são ganchos de depuração/administração; podem ser removidos numa versão final.

## Gráficos
- engine.js: sombras (shadow map 2048, PCF), céu com nuvens procedurais, HDR 16F + bloom + ACES + vinheta, MSAA 4x; qualidade Baixa/Média/Alta (tecla G). `R.begin(vp,cam,fog,fogD,env)` … `R.end(exposure)`; `R.beginShadow(focus)`/`R.endShadow()`. Luz por zona em game.js (`LIGHT`, `lightCur`).
- Estilo desenhado (toon): normais planas por derivadas, luz em 3 faixas, linhas de tinta (`fwidth`) e detecção de bordas no pós, PBR simplificado (GGX + Fresnel, `rough`/`metal`), chuva molha o chão, água lisa, vento nas folhas, névoa por altura. Mundo facetado; objetos com normais suaves.
- Bandeiras na cor de vértice (lidas no FS): `r<0` peça lisa (`CLN`), `r<0 e g<0` alvenaria (`MAS`), `r<0 e b<0` tábuas (`PLK`), `r>=3` terreno (`ground()` soma 4 ao canal r). Em `world.js`, `add()` marca `prism`/`pyr` (telhados e tendas) como lisos.
- Corpos orgânicos de animais e monstros: `mkLoft` (meshes_extra.js) + `geoP` (models.js), uma malha contínua por seções, no lugar de esferas sobrepostas; `LOFT_MODE` faz os monstros humanoides usarem lofts nos membros. Detalhes em `.claude/skills/aldoria-graficos/references/modelagem.md`.
- Junção de peças: `R.parts` agrupa modelos em cache (`parts._c`, `keepParts` em models.js) em malhas com pele de até 48 ossos (`batchOf` em engine.js). Modelo novo deve passar por `keepParts`. Teste de equivalência: `tools/teste_juncao_pecas.py`.
- AO estático: `aoFor()` (`world.js`) gera discos sob peças altas em `w.ao`; `R.drawAO` (`engine.js`) desenha em Média/Alta. Medição gráfica: `GRAPHICS.md`, `tools/capture_graficos.py` e `tools/capture_cenas.py` (imagens em `docs/graficos/`).
- meshes_extra.js: `rbox`, `tbox`, cilindros cônicos etc.; `R.parts` troca 'box' por 'rbox' (use `sharp:1` para aresta viva). Partes aceitam `fl` (bater de asas).
- Peças presas à mão com rotação (escudo, arco) devem usar `PA`/`rotOff` em `models.js`, senão a peça gira junto com o deslocamento e sai do lugar.
- `humanoid()` (models.js): tronco em V/cintura, membros afunilados, braços em 3 segmentos, rosto (`faceParts`), `styleLayer` (capa, ombreiras, orelhas élficas, capuz). Faces de cilindros/cones já foram corrigidas (não inverter de novo).

## Modelos com ossos (Mixamo FBX)
- `tools/fbx2aldoria.py` converte FBX binário (malha+pele+animação) e `tools/pack.py` empacota `assets/*.fbx` em `src/assets_data.js` (`assets/<nome>.fbx` = personagem, `assets/anim_<nome>.fbx` = animação). A pasta `assets/` não está no repositório.
- `src/skin.js`: `SKINS`, `skinAnim(nome)`, `skinPose(skin, anim, t)` (matrizes baked, 30 fps). Engine: VS com `uSkin/uBones[24]`; `mesh.bones` ativa a pele. Escala do Mixamo: cm → `.0105`. Ainda não integrado ao gameplay.

## Regras do projeto
- O jogo é original. Não copie nem importe nomes, modelos, texturas, sons, textos ou tabelas de dados do jogo WYD (With Your Destiny) ou de qualquer outro jogo comercial. Mecânicas genéricas inspiradas nele são ok.
- Manter offline: nada de CDN, fontes externas, `fetch` de URLs externas.
- Manter um único escopo global sem colisão de nomes entre arquivos.

## Pendências conhecidas
- Teleporte pelo mapa (aba Teste) às vezes cai ~50 m longe do ponto clicado.
- NPC do estábulo do deserto às vezes não abre a conversa dependendo do lado de chegada.
- Modelos a revisar: minotauro, hidra, fênix, lich, necromante, Orc Senhor da Guerra, Ignar (asas soltas).
- Documentação completa (classes, monstros, drops), planilha e Manual de Testes atualizado com a interface nova.

## Ideias de próximos passos
Mais missões e masmorras, árvore de talentos, itens com efeitos especiais, ajuste fino de balanceamento (XP, dano, drops), integrar modelos com ossos ao gameplay, controles por gamepad.

## Áudio
- `src/audio.js` (`createSoundEngine`): mixer (sfx/amb/music/ui → compressor), 72 efeitos sintetizados, vozes de monstro por família, passos por piso, ambiente por bioma/hora/clima e música procedural por região. Integração no bloco "áudio" de `game.js` (`sfx`, `mobVoice`, `audioUpdate`, `audioEnv`). Testes: `tools/teste_sons.py` (offline). Painel de escuta: administrador → Teste → Sons. Estado e pendências em `SONS.md` (falta o ouvido do usuário).

## Encontros aleatórios
- `src/encounters.js` (`registerEncounters(X)`): 18 tipos de NPC temporário (`kind:'enc'`, ver `T`): viajante ferido, mercador, caravana, alma penada, altar, escolta, duelo, tesouro, bruxa, ferreiro, bardo e, da rodada 2, jogador de cascas, enigma, animal perdido, monge, baú traiçoeiro (mímico), arena em ondas, mensageiro. `G.encSpot` (marcador no mapa, `n` = rótulo) só comporta um; tipos que o usam estão em `SPOT_T`. Teste: `Game._dbg.enc.spawn(tipo)` + `Game.encDialog/encAct`.

- **Níveis por fase** (`LVCAP` em data.js): Mortal 1–299, Imortal 1–199, Ancestral 1–149, Supremo 1–50 (multiplicadores `TMUL` ×1/×1,8/×3,2/×5,5 e custos de evolução 20.000/80.000/250.000 ouro como antes). **Todo o conteúdo continua na escala interna 1–50** (`MAXLV`): `effLv(nível, fase)` converte o nível exibido do jogador para essa escala (atributos, XP de monstro, missões, itens, habilidades, portais; no código do jogo use `EL(p)`) e `dispLv(nívelInterno, fase)` converte o nível de um monstro/missão/item para mostrar na escala da fase. XP para o próximo nível: `xpPlayer` = `xpNeed(nível efetivo)` (jornada ~6× mais longa no Mortal). Pontos de **habilidade** vêm por nível efetivo (`ptsAt`; 147 no topo, mais 3 iniciais). Pontos de **atributo**: 5 por nível exibido (`apAt`; Mortal 299 = 1.490), e cada ponto pesa `attrW(fase)` = 49/(teto−1) (Mortal ≈ 0,164) com retorno decrescente: `attrEff(pontos, fase)` = √(pontos × attrW × `ATTR_C`=140), usado em todos os efeitos do `recalc` (ataque, crítico, esquiva, velocidade, mana, dano de habilidade, vida, defesa, cura, poções). Nível 29 com 140 pontos: +38% de ataque (era +13%); no topo +124% (era +137%). Força dá ataque a todas as classes e o atributo principal (Destreza/Inteligência) soma. O painel mostra o efeito total de agora e quanto +5 pontos somam (`attrDesc`, `ATTRS[k].fx`). Saves sem `apv` são convertidos no `load` (cada ponto antigo × 1/attrW; o que sobra vira ponto livre). Saves sem `lv2` são convertidos (`lvForEff`); scripts de teste que definem `p.lvl` devem usar `lvForEff(nívelInterno, fase)`.

- **Grau dos itens** (`gradeOfLvl`/`lvlOfGrade`, data.js): pelo nível do item na escala do Mortal: 1–29 grau 0, 30–79 grau 1, 80–119 grau 2, 120–189 grau 3, 190–249 grau 4, 250+ grau 5. Vale para armas, armaduras, luvas e acessórios; o material/nome vem da lista da classe pelo grau (`CLS_ARM_MAT`, `WNAMES`, `ACC_NAMES`). Loja: grau atual e anterior (`shopStock`).

## Fases, refino e economia de equipamento (resumo das últimas decisões)
- **Evoluir de fase só muda a fase** (`evolve`): nível 1, pontos de atributo e habilidade reiniciados, habilidades aprendidas voltam ao nível 1. Itens (equipados e mochila), ouro, montarias, história e conquistas ficam. Sem kit inicial, sem itens no baú, sem presentes novos.
- **Fase 4 chama-se "Supremo"** (`TIERS[3]`).
- **Grau do item por fase e nível** (`GRADE_TABLE`, `gradeOfLvl`, `docs/GRAUS_DE_EQUIPAMENTO.md`): Mortal 0–5; Imortal 1–4; Ancestral 4–5; Supremo 5. O **poder** usa `pg` (grau pelas faixas do Mortal), o material/nome/desenho usa `grade`.
- **Refino**: Ferreiro até +9 (`PLUS_MAX`, chances `CFG.enh`). **Ancient** no **Refinador** (NPC `selene`, `Game.fuseItems`): 2 peças iguais (`fuseKey`: espaço, classe, nome, fase e refino) na mochila: 2× +9 → +10 (grátis), 2× +10 → +11 (`FUSE_GOLD` = 100.000). Multiplicador `PLUS_MUL` (+9 ×1,72; +10 ×2,0; +11 ×2,4).
- **NPCs principais** com o nome da função: Baú, Refinador, Ferreiro, Joalheiro, Armeiro, Armaduras, Mestre de Habilidades (e Cavalariço, Mercador, Ancião como antes).
- **Vida dos monstros** (`mobStats`, `hpK`): comum ×1,5 (nível ≤3) até ×`MOB_HPK`=4 (nível 15+; era 6), elite extra ×`ELITE_HPK`=2, chefe ×`BOSS_HPK`=3; o XP do comum segue `MOB_XPK`=6 (o fator antigo), então o up ficou ~1,5× mais rápido. Elite `ELITE_M` hpm 6 / atkm 1,9 (era 8 / 2,4). **Campeão** (`champAt`): nível do jogador +1 (sem passar do maior da zona), hpm 7 / atkm 1,9 / hpk de elite (antes: maior nível da zona +3 com força de chefe). Nível de elites/chefes/campeões na tela sempre por `dispLv`. Medição nov/2026 (nível interno 5–12, sem poção): comum 2–7 s, elite 10–19 s, campeão ~17–30 s; `teste_luta_real.py` agora mede `champ` também.
- **Refino**: `itemVal(it, k)` (data.js) = atributo × `itemMul` + bônus fixo por "+" (`REF_FLAT`: atq +1, def +1, vida +5, mana +2, × `tmul`), usado no `recalc` e na tela (`istats`); sem o fixo, +8 % de um item fraco sumia no arredondamento. Medido com **habilidades em uso** (`tools/teste_luta_real.py`: `TIER`, `GEAR=tier|carry`, `SK`, `HPF`, `TRIALS`): sem o fator o comum morria em 0,3–3 s; agora 5–10 s e 0–25 % da vida. Achado: logo após evoluir carregando o equipamento da fase anterior (Épico +9 nv 50) os monstros morrem em 0,2 s no nível 1 e ficam fáceis até o ~nível 15 da fase.

## Combate e início de jogo (ajustes nov/2026)
- **Dano em raio**: habilidades `melee`/`proj` de alvo único também acertam quem está a até `SPLASH_R` (3 m) do alvo, com `SPLASH_M` (60%) do dano (`splash` em `useSkill`, game.js); `s.splash` troca o raio, `0` desliga; `multi` (Corrente de Raios) não usa.
- **Alcance**: Arcanista e Caçadora ficaram com alcance menor (ataque 9,5/10,5 m; habilidades 10–15 m) para os monstros (aggro 9 m) conseguirem reagir antes de morrer.
- **Começo do campo**: `CAMP_DMG0` (0,7) multiplica o dano do jogador no nível 1 e sobe até 1 no nível 29 do Mortal (`playerDmg`). O kit inicial agora traz elmo e luvas (`starterKit`).
- **Economia de energia**: ~40 FPS por acumulador (`ECO_MS`), resolução até 1,4× no toque.

## GPS e mapa no toque
- Mapa (`mapEvents`, ui.js): um dedo arrasta, dois dedos fazem pinça (zoom), toque curto marca `st.mapPin` e mostra a barra `.map-gps` ("Ir até aqui"). `Game.gpsGo(x, z, nome)` (game.js) calcula uma rota por terra (`gpsRoute`: A* numa grade de 20 m com `coastD`, suavizada) e `gpsTick` segue os pontos com `cmd` `move` (`cmd.gps`); joystick ou qualquer toque/ataque pausa (o marcador fica; o ❗ "Seguir o GPS" retoma), 4 s parado recalcula a rota (3×) e depois desiste. `G.gps` vira o objetivo mostrado no minimapa, na seta e no mapa (rota tracejada); `objectivePos` devolve o GPS antes da história.
- A rota do GPS (`gpsRoute`) **contorna muralhas** (bloqueia o quadrado `hs+8` das vilas que não são a do começo nem a do destino), **passa pela ponte do campo de treino** (6 m, invisível na grade de 20 m; eixo `CAMP.ux/uz`) e o personagem anda em passos de até 26 m fora das vilas (o desvio local `buildLocal` só enxerga ~30 m; dentro de vila vale a rota de portões `townRoute`). Gestos do mapa: dedo fantasma é descartado (`fresh`/`drop`), o toque curto usa `e.timeStamp` (quadro lento não atrasa).
- Cartão de item ao tocar (`cardRender`/`cardAct`) e lista de venda do mercador com ▲▼ contra o equipado.

## Missões no celular (toque)
- Botão ❗ (`data-a="obj"`, aviso `.objpop`, `renderObj`/`objSync` em ui.js) mostra a etapa atual, o destino e **um** botão de ação: "Entregar" (secundária pronta), "Resgatar diários" ou "🧭 Ir até lá" (`Game.goObjective()`: anda até o NPC e abre o diálogo, vai ao lugar ou ao monstro mais próximo; chefe/elite só chega perto). Minimapa e botão "Mapa" abrem o mapa; legenda do mapa no botão `?`.
- No toque (`IS_TOUCH`), missões secundárias liberadas entram como ativas sozinhas (`updateQuestLocks`) e entregam/resgatam pelo ❗, sem ir ao Ancião. No desktop o fluxo com Ancião continua igual.
- O ❗ separa "📖 História" e "📜 Missões secundárias" (com progresso de cada uma); o aviso de conclusão de secundária diz o nome da missão.
- No toque, o Inventário não mostra o boneco (`eqbox.flat`: equipados em 4×2 com a montaria); Personagem, Missões e Níveis têm CSS compacto (bloco no fim de `style.css`). 🎯 e 💬 avisam por toast; 💬 fica apagado sem NPC a até `TALK_R` (7 m, `Game.nearNpc`).
- Avaliação de mercado: `reports/2026-11-21-eval-aldoria.md` (veredicto PIVOT 21/35).

## Campo de Treinamento, janelas flutuantes e painel de níveis (nov/2026)
- **Campo de Treinamento** (`CAMP` em data.js, zona `camp`, nível interno 1–5 = Mortal 1–29): ilha cercada num lago a oeste de Aldoria (centro -140, 22). `campCoast` altera `coastD` (ilha + anel de água + faixa de terra = ponte voltada para o portão oeste de Aldoria); `zoneScore` devolve `camp` dentro do lago; semente extra de `field` mantém campos em volta; trilha em `ROADS`; clareira segura em `SAFES`. Cenário em `world.js` (cerca, portão, ponte, tendas, bonecos de treino). Monstros `gremlin` e `lizard` (models.js, art.js; `MOBS.camp`), sem campeões nem XP depois do nível 29 (`xpFor`), com mais poções/pedras (`killMob`). `CAMP.endLv` = 5,6 é o nível interno equivalente ao 29.
- **Personagem novo** nasce no campo (`newGame`), com peças de grau 0 de ataque/defesa 1 (`starterKit`). Morrer no campo reaparece na clareira. Missões e etapas de capítulo das cidades exigem nível ≥ `CAMP.endLv` (story.js/data.js).
- **Prólogo** (capítulo `c0`, etapas `nw:1` no início de `MAIN`): tutorial com NPCs `instr` (Instrutor Brann) e `camp_trainer`. Etapa nova `k:'do'` com `ev` (`move`, `open:<janela>`, `learn`, `skill`, `potion`), disparada por `mainEv(ev)` em game.js, que também guarda o que o jogador já fez em `G.main.tut`. O prólogo é **por estado**: `tutAuto()` (game.js, a cada quadro) fecha sozinha qualquer etapa do prólogo cuja condição já vale (habilidade aprendida, `G.rec.kill`, flags de `tut`), então fazer as coisas fora de ordem não trava; `skipPrologue()` pula o prólogo inteiro de quem já passou do nível do campo (ou de fase superior). Saves com `main.v` ausente têm o índice deslocado pelo tamanho do prólogo; `c0` não conta como capítulo (`chapN`).
- **Janelas** (ui.js): `st.wins` (várias abertas, a última na frente) e `st.modal` (`dlg`/`pause`); arrastar pelo título (`winDrag`, posição em `st.wpos`); `isBlocking` só vale para o modal, então dá para jogar com janelas abertas. Com Guarda/Ferreiro/Joalheiro o Equipamento fica encaixado ao lado (`winSide`).
- **Painel B** (`renderLv`, `#p-lv`): uma aba por fase com faixa de nível de cada zona, chefes e cidades na escala da fase (`dispLv`).
- Pendências: balancear XP do campo (levar do 1 ao 29), lojas no campo (hoje só Mestre de Habilidades), arte própria da ponte e de peixes/juncos no lago.
