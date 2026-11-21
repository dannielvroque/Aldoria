---
name: aldoria-historia
description: Use ao criar, editar ou revisar a história e o conteúdo narrativo do Aldoria: "Crônicas de Aldoria" (capítulos e etapas), missões, diálogos e textos de NPCs, desafios diários, conquistas, marcos do mapa, nomes de lugares/monstros/chefes e o tom do texto. Traz a estrutura de `story.js`, o enredo e os fatos de mundo já estabelecidos para manter a coerência sem reler os arquivos.
---

# Aldoria — história e narrativa

Todo texto do jogo é em **português do Brasil**, com acentos corretos. O jogo é **original**: não use nomes, textos ou tabelas de WYD ou de outro jogo comercial. Nada de CDN ou conteúdo externo.

## Onde mora
- `src/story.js`: `CHAPTERS`, `MAIN` (etapas), `stepTitle`/`stepGoal`/`stepReward`, NPCs de história (`roderic`, `selene`, `elric`; conjunto `STORY_NPC`) e de serviço por vila, `DAILY_POOL`, `ACHIEVEMENTS`, `LANDMARKS`.
- `src/data.js`: `NPCS` base, missões secundárias (quadro de missões; "Limpando os Campos" é a secundária inicial), `LM` (coordenadas de marcos como `LM.camp`, `LM.crypt`...), `SITES` (masmorras e covis), `BOSSES`/`BOSS_POS`/`ELITES`/`UNIQUE_W`, `ZONES`, `REGIONS`, `VILLAGES`.
- `src/game.js`: `storyTalk` (diálogo da história), `acceptQuest`/`turnInQuest`, `claimDaily`/`dailyReward`, `track` (progresso de conquistas e diárias).
- Diálogo e modelo de NPC dependem do `kind`, não do id.

## Estrutura de uma etapa (`MAIN`)
Campos comuns: `ch` (capítulo), `lvl`, `k` (tipo), `t` (texto do objetivo), opcionais `n` (quantidade ou título, conforme o tipo), `nm` (título de exibição).
- `talk`: `npc`, `n` (título), `say` (fala do NPC).
- `kill`: `mobs: [ids]` ou `zone`, `n` (quantidade).
- `collect`: `mobs`, `item`, `n`, `ch_` (chance de drop).
- `elite`: `zone`, `n`. `boss`: `boss` (id em `BOSSES`). `explore`: `x`, `z`, `r`, `place`.
Recompensa vem de `stepReward` (proporcional ao nível; chefe ×4 em ouro): não escreva valores à mão.
Ao adicionar etapa: manter a ordem por `lvl` dentro do capítulo, usar ids de monstro existentes (`MOBS`, `MOB_COL`) e conferir que o NPC citado existe.

## Enredo estabelecido (manter coerente)
- Capítulo I (nv 1–10) "A Sombra sobre Aldoria": criaturas dos campos ficam agressivas; o Capitão Roderic suspeita de alguém por trás; javalis com marcas de corrente; Acampamento Bandido ao norte; o **Fragmento Sombrio** (cristal negro) com os bandidos; chefe **Rei dos Bandidos**.
- Capítulo II (11–20) "Sussurros na Floresta": o rastro do cristal leva à Floresta Sussurrante (explorar a Árvore Anciã), onde o **Guardião do Bosque** perdeu a razão (etapa de chefe, nv 18); Guarda-florestal Elric.
- Capítulo III (21–30) "O Chamado das Areias": carta do Oásis de Sahr; o cristal apareceu sob as dunas e os mortos voltaram a andar; há etapa de explorar a Pirâmide Soterrada (nv 28).
- Capítulo IV (31–40) "As Ruínas do Rei Caído": a erudita Selene decifra o símbolo: é o selo do **Rei Colosso**, que reinou antes de Aldoria e quer voltar; exploram-se a Torre Partida (nv 35) e a Cripta do Rei Caído (nv 38); chefe: Rei Colosso (nv 39).
- Capítulo V (41–50) "Gelo e Fogo": o último fragmento pulsa no vulcão; é preciso a bênção do Norte (Caverna Glacial nv 45; chefe **Rei Yeti** nv 46) e coragem para enfrentar **Ignar, o Dragão Ancião** (Caldeira de Ignar nv 49; chefe nv 50).
- Mundo: um continente cercado de mar, norte = z negativo. Regiões: Reino de Aldoria (centro, chuva), Deserto de Kharim (leste), Picos Gélidos (norte), Cratera de Ignar (oeste). Vilas: Aldoria (praça com fonte), Oásis de Sahr, Vila de Hielmar, Forja de Cinzas; postos: Brumavale, Ruínas, Acampamento das Dunas, Refúgio da Nevasca, Bastião de Brasa.
- Chefes na história principal (confirmado em `MAIN`): Rei dos Bandidos, Guardião do Bosque, Rei Colosso, Rei Yeti e Ignar. Faraó Desperto, Rainha Escorpião, Lorde Lich, Serpe Glacial e Senhor Demônio existem no mundo (cacar por XP e arma única), mas não achei etapa de `MAIN` para eles: conferir antes de ligar à trama.
- Chefes (nível): Rei dos Bandidos 10, Guardião do Bosque 20, Faraó Desperto 38, Rainha Escorpião 42, Rei Colosso 40, Lorde Lich 46, Serpe Glacial 47, Rei Yeti 50, Ignar 58, Senhor Demônio 54. Armas únicas de chefe em `UNIQUE_W` (ex.: Cutelo do Rei Bandido, Cetro do Faraó, Presa da Serpe Glacial).
- Elites têm ★ no nome; campeões errantes aparecem de tempos em tempos (`CFG.champ`).

## Tom e forma
- Frases curtas, voz de aventura, sem gíria datada. NPC fala em primeira pessoa e dá pista concreta (onde ir, o que procurar). Texto de objetivo (`t`) é uma instrução clara, com quantidade e lugar.
- Cabe na interface: título curto (cabe no rastreador de missão do canto), objetivo em uma linha, fala de NPC em até ~3 frases.
- Nomes novos: conferir que não colidem com existentes e que soam como o resto (Aldric, Selene, Roderic, Karim, Hassan...).

## Desafios diários, conquistas, marcos
- `DAILY_POOL`: `{ k, n, t }` com `k` em `kill`, `elite`, `skill`, `crit`... (veja o arquivo); recompensa por `dailyReward`.
- `ACHIEVEMENTS`: `{ id, n, t, k, n_, rew }`; `rew` em ouro; id único. Algumas desbloqueiam por visitar biomas, nível 10/25/50, primeiro chefe.
- `LANDMARKS` aparecem no mapa [M]; coordenadas vêm de `LM` em `data.js`.

## Verificação
`python build.py`; abrir o jogo; falar com o NPC da etapa; cumprir o objetivo (modo Teste do administrador ou `Game._dbg`, ver skill `aldoria-jogabilidade`); conferir que a etapa avança, a recompensa chega, o rastreador mostra o título certo e o console fica sem erros.

## Locais secretos e conquista Descobridor
Seis locais fora da trama principal (`SITES` com `poi:1` em `data.js`, estruturas em `world.js`): Mina Abandonada (Campos), Santuário Élfico (Floresta), Templo do Sol (Dunas), Observatório Gélido (Tundra), Forja Esquecida (Cinzas), Fonte dos Esquecidos (Ruínas). Ficar a menos de 13 m descobre (XP + ouro, uma vez; `G.rec.disc`); descobrir os 6 dá a conquista `disc` ("Descobridor"). Ainda sem texto de história: dá para ligar cada um a uma etapa `explore` do `MAIN` ou a um NPC.
