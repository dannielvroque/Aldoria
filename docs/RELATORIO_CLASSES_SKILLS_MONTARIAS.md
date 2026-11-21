# Aldoria — Relatório: classes, habilidades e montarias

Gerado a partir dos dados reais do jogo (`CLASSES`, `MOUNTS`, `MOUNT_DROP`, `CFG`, fórmulas de `recalc`, `playerDmg`, `mobStats`) e de um **modelo de combate** (rotação de 60 s, valores esperados). **Nenhum número do jogo foi alterado**: este documento é diagnóstico e recomendação.

## 0. Balanceamento aplicado (atualização)

Depois deste diagnóstico as recomendações foram aplicadas no jogo (exceto a 1, que era erro do modelo; ver achado 1). Os achados das seções 3 e 4 descrevem o estado **anterior**; a tabela abaixo compara antes e depois (nível 50, Mortal, modelo corrigido).

- Teto de crítico de 60 % e de esquiva de 35 % (buffs temporários passam do teto: Olho de Águia, Passo Ágil).
- Vanguarda: Golpe Pesado 220 → 300 %, Giro de Lâminas 190 → 260 %, ataque por nível 2,6 → 3,9, redução de dano permanente (8 % + 3 % por fase) e Bloqueio com Escudo devolve 50 % do dano absorvido ao agressor.
- Caçadora: mana por nível 7 → 9, mana base 60 → 75 e Chuva de Flechas de 30 para 24 de mana.
- Invocador: invocações herdam o crítico do dono (o espírito passa de 40 % para 60 % da defesa); Elo Vital cura 50 % da vida da invocação (antes 30 %).
- Montaria: bônus inteiro só montado, metade quando desmontada (`recalc` roda ao desmontar).
- Modo automático: cura abaixo de 60 % da vida (ou com a invocação abaixo de 35 %) e escudo quando a vida cai ou há grupo ou chefe.

| Classe | DPS (1 alvo) antes → depois | Margem antes → depois | Crítico | Esquiva |
|---|---|---|---|---|
| Vanguarda | 980 → 1.408 | 17.69 → 27.64 | 10 % → 10 % | 0 % → 0 % |
| Arcanista | 2.591 → 2.591 | 22.11 → 22.11 | 11 % → 11 % | 0 % → 0 % |
| Caçadora | 2.444 → 2.268 | 38.97 → 32.97 | 75 % → 60 % | 41 % → 35 % |
| Invocador | 1.569 → 1.569 | 14.84 → 14.84 | 11 % → 11 % | 0 % → 0 % |

O modelo não mede o reflexo do escudo, o crítico dos pets nem o ganho do automático; esses foram verificados no jogo (escudo absorveu 15 e devolveu 8; pet com o crítico do dono; Elo Vital curou 50 % do pet; automático conjurou o escudo ao lado de um monstro).

## 1. Como ler os números (e o que o modelo NÃO faz)

- Cada classe usa **equipamento da própria classe**, grau pelo nível (`grau = nível/9`), raridade Comum, refino +0, e **70 % dos pontos de atributo no atributo principal e 30 % em vitalidade**.
- Monstro: `mobStats(nível)` × multiplicador da fase do jogador; um monstro comum do **mesmo nível**, ataque a cada 1,6 s.
- Rotação: habilidades por prioridade de dano, ataque básico entre elas, mana inicial cheia e regeneração de combate (0,6 %/s; Vanguarda ganha 4 % da mana máxima por acerto). Dano esperado (crítico entra como `1 + chance`).
- **Não inclui**: poções, posicionamento, tempo de deslocamento, escudos e curas, execução, roubo de vida, elites e chefes, e as invocações do Invocador além do lobo. Serve para **comparar classes e fases entre si**, não para prever o tempo exato de jogo.

## 2. Resumo (nível 50, Mortal, equipamento de classe)

| Classe | Vida | Defesa | Crítico | Esquiva | DPS 1 alvo | DPS 3 alvos | Mata um monstro em | Sobrevive a 1 monstro | Sobrevive a 3 |
|---|---|---|---|---|---|---|---|---|---|
| Vanguarda | 5.717 | 557 | 10 % | 0 % | 1.408 | 1.747 | 1.8 s | 49.2 s | 16.4 s |
| Arcanista | 4.634 | 283 | 11 % | 0 % | 2.591 | 4.235 | 1.0 s | 21.4 s | 7.1 s |
| Caçadora | 4.056 | 385 | 60 % | 35 % | 2.268 | 3.189 | 1.1 s | 36.5 s | 12.2 s |
| Invocador | 4.159 | 373 | 11 % | 0 % | 1.569 | 2.327 | 1.6 s | 23.7 s | 7.9 s |

**Margem** = quanto tempo você sobrevive dividido pelo tempo que leva para matar o monstro (1 alvo). Acima de ~3 o combate é tranquilo; acima de 10 o monstro quase não ameaça.

| Classe | Nível 10 | Nível 25 | Nível 40 | Nível 50 | Nível 50 Supremo |
|---|---|---|---|---|---|
| Vanguarda | 23.77 | 20.97 | 26.07 | 27.64 | 39.14 |
| Arcanista | 15.0 | 15.49 | 19.88 | 22.11 | 24.34 |
| Caçadora | 13.77 | 18.57 | 32.33 | 32.97 | 36.31 |
| Invocador | 11.31 | 9.86 | 13.2 | 14.84 | 16.43 |

## 3. Achados principais (por prioridade)

1. **(Corrigido) A dificuldade NÃO despenca a cada fase.** A primeira versão deste relatório dizia que a margem do nível 50 saltava de ~18 para ~109 com as fases. Era erro do modelo: ele usava `K = 100` fixo na fórmula de defesa, e o jogo usa `K = 100 × T` (`dmgPlayer`), então a defesa das fases altas aparecia inflada. Com o modelo corrigido a margem é quase estável (Vanguarda 17,7 → 22,6; Caçadora 39 → 43 do Mortal ao Supremo): jogador e monstro escalam por T e a proporção se mantém. **Não aplicar** escalonamento T² dos monstros.
2. **Caçadora é a classe mais forte, de longe.** Crítico 75 % e esquiva 41 % no nível 50 (a destreza dá `+0,3 %` de crítico e `+0,15 %` de esquiva por ponto, sem teto, e a base já é 18 % e 12 %), DPS equivalente ao do Arcanista, melhor alcance e a maior margem (39 contra 18–22). Sugestão: teto de crítico (60 %) e de esquiva (35 %), ou retornos decrescentes; tirar um pouco da base de esquiva.
3. **Vanguarda é a mais fraca em dano e não compensa em resistência.** DPS ~980 contra ~2.500 dos ranged no nível 50, e a sobrevivência (45 s) só supera a do Arcanista e do Invocador, não a da Caçadora (esquiva). O papel de tanque não se sustenta: faltam redução de dano percentual, provocação em área ou cura. Sugestão: subir os multiplicadores de `Golpe Pesado` (2,2×) e `Giro de Lâminas` (1,9×) para ~3,0× e ~2,6×, dar redução de dano permanente por fase e fazer o `Bloqueio com Escudo` refletir parte do dano.
4. **Mana nos níveis baixos é apertada**: Arcanista (nível 10) e Caçadora (níveis 10–25) esgotam a mana em 60 s de rotação contínua (mana final ~0). Em parte é intencional (poções), mas a Caçadora tem 60 de mana base e só ganha +7 por nível, enquanto `Chuva de Flechas` custa 30. Sugestão: +2 de mana por nível para a Caçadora ou custo menor nas habilidades de nível médio.
5. **Invocador tem a menor margem entre as classes de longa distância** (9,9 no nível 25) e depende do lobo para o dano. O Golem tem vida alta e provoca, mas bate com 35 % do ataque do dono; o Espírito é frágil; o custo de mana das três invocações (22 + 40 + 30) é alto. O modelo contou só o lobo, então o DPS real é maior; mesmo assim, sugestão: pets herdarem parte da defesa e do crítico do dono, e `Elo Vital` curar mais a invocação.
6. **Habilidades de utilidade** (`Bloqueio com Escudo` 35 % da vida por 8 s com 18 s de espera, `Barreira Arcana` 45 %/25 s, `Elo Vital` 30 %) ficam fora da rotação de dano, o que é correto, mas conviria conferir se o modo automático (T/Z) as usa quando a vida cai.
7. **Habilidades de fase Imortal** (nível 40, 9.000 de ouro): `Fúria Berserker`, `Meteoro`, `Disparo Crítico`, `Pacto Selvagem`. `Meteoro` (7×, 60 de mana, 28 s) é a maior rajada do jogo; `Disparo Crítico` (4,5× e sempre crítico) fica bem acima das demais da Caçadora por mana.

## 4. Classe por classe

### Vanguarda

**Papel**: corpo a corpo e tanque (alcance 2,6). **Recurso**: Fúria (usa o campo de mana), regenerando 4 % da máxima a cada golpe. **Armadura**: placas (defesa ×1,25, vida ×1,2). **Armas**: espada, adagas, machado. **Visual**: armadura de aço, escudo redondo grande e espada; capa vermelha. **Pontos fortes**: vida e defesa mais altas; Fúria dá economia de mana. **Pontos fracos**: dano baixo perto das outras classes, nenhuma cura, alcance curto.

Base: vida 122, mana 45, ataque 10, defesa 10, crítico 5 %, esquiva 0 %, vel. de ataque 1. Por nível: vida +32, mana +4, ataque +3.9, defesa +2.6.

| # | Habilidade | Aprende | Mana | Recarga | Efeito | Mult/s | Mult/mana |
|---|---|---|---|---|---|---|---|
| 1 | 🗡️ Golpe Pesado | nv 1, 0 ouro | 6 | 3 s | Golpe brutal com 300% de dano. | 1,00 | 0,50 |
| 2 | 🐂 Investida | nv 1, 0 ouro | 10 | 7 s | Avança até o alvo, causa dano e atordoa. | 0,26 | 0,18 |
| 3 | 🛡️ Bloqueio com Escudo | nv 3, 120 ouro | 12 | 18 s | Ergue o escudo: absorve dano igual a 35% da vida por 8 s e devolve 50% do que absorve ao agressor. | — | — |
| 4 | 📢 Grito de Guerra | nv 6, 350 ouro | 14 | 25 s | +20% ataque e +35% defesa por 15 s. | — | — |
| 5 | 🌀 Giro de Lâminas | nv 20, 2500 ouro | 18 | 8 s | Gira as armas e acerta todos ao redor (260%). | 0,33 | 0,14 |
| 6 | 🪓 Golpe Executor | nv 15, 1500 ouro | 16 | 9 s | Golpe de 280% (dobra se o alvo tiver menos de 30% de vida) e devolve 20% em vida. | 0,31 | 0,17 |
| 7 | 😡 Fúria Berserker | nv 40, 9000 ouro (Imortal) | 30 | 40 s | +50% ataque, +35% velocidade de ataque e roubo de vida por 14 s. (Imortal) | — | — |

### Arcanista

**Papel**: mago de longa distância (alcance 13). **Recurso**: mana alta (481 no nível 10; +13 por nível e INT). **Armadura**: tecidos (defesa ×0,7, vida ×0,82, **+mana**). **Armas**: cajado, varinha, orbe, tomo. **Visual**: túnica azul, chapéu pontudo, orbe flutuante. **Pontos fortes**: maior dano em área (Nova Glacial, Tempestade de Fogo, Meteoro); o bônus de habilidade cresce com INT (1,69× no nível 50). **Pontos fracos**: menor defesa e vida, mana limita nos níveis baixos, sem esquiva.

Base: vida 120, mana 110, ataque 14, defesa 3, crítico 6 %, esquiva 0 %, vel. de ataque 1. Por nível: vida +28, mana +13, ataque +3.6, defesa +1.1.

| # | Habilidade | Aprende | Mana | Recarga | Efeito | Mult/s | Mult/mana |
|---|---|---|---|---|---|---|---|
| 1 | 🔥 Bola de Fogo | nv 1, 0 ouro | 6 | 1,2 s | Projétil de fogo rápido (180%). | 1,50 | 0,30 |
| 2 | 🧊 Lança de Gelo | nv 1, 0 ouro | 10 | 4 s | Lança gélida (210%) que deixa o alvo 50% mais lento. | 0,53 | 0,21 |
| 3 | ⚡ Corrente de Raios | nv 3, 120 ouro | 16 | 6 s | Raio que salta para mais 3 inimigos próximos. | 0,37 | 0,14 |
| 4 | 🔰 Barreira Arcana | nv 6, 350 ouro | 25 | 25 s | Barreira que absorve 45% da vida por 10 s. | — | — |
| 5 | ❄️ Nova Glacial | nv 20, 2500 ouro | 24 | 10 s | Explosão de gelo ao redor que congela (−55% de velocidade). | 0,20 | 0,08 |
| 6 | 🌋 Tempestade de Fogo | nv 15, 1500 ouro | 30 | 12 s | Chamas caem sobre a área e queimam por 4 s. | 0,25 | 0,10 |
| 7 | ☄️ Meteoro | nv 40, 9000 ouro (Imortal) | 60 | 28 s | Meteoro devastador em grande área (700%). (Imortal) | 0,25 | 0,12 |

### Caçadora

**Papel**: atiradora, crítico e esquiva (alcance 14, velocidade de ataque 1,25). **Armadura**: couro (defesa ×0,95, **+esquiva**). **Armas**: arco curto, longo, composto, besta. **Visual**: couro verde, capuz, arco ou besta. **Pontos fortes**: o melhor pacote individual (crítico + esquiva + DPS + mobilidade com `Passo Ágil`). **Pontos fracos**: pouca mana (483 no nível 50). **Problema**: acumula crítico e esquiva sem teto (achado 2).

Base: vida 100, mana 75, ataque 11, defesa 5, crítico 18 %, esquiva 12 %, vel. de ataque 1.25. Por nível: vida +20, mana +9, ataque +2.9, defesa +1.5.

| # | Habilidade | Aprende | Mana | Recarga | Efeito | Mult/s | Mult/mana |
|---|---|---|---|---|---|---|---|
| 1 | 🎯 Tiro Rápido | nv 1, 0 ouro | 4 | 1 s | Flecha rápida e precisa (160%). | 1,60 | 0,40 |
| 2 | ➡️ Flecha Perfurante | nv 1, 0 ouro | 10 | 5 s | Flecha que atravessa todos na linha (230%). | 0,46 | 0,23 |
| 3 | 💨 Passo Ágil | nv 3, 120 ouro | 10 | 9 s | Salta para frente: +35% de velocidade e +35% de esquiva por 4 s. | — | — |
| 4 | 🔻 Marca do Caçador | nv 6, 350 ouro | 12 | 14 s | O alvo recebe +30% de dano por 10 s. | — | — |
| 5 | 🌧️ Chuva de Flechas | nv 20, 2500 ouro | 24 | 14 s | Saraivada de flechas em área. | 0,26 | 0,15 |
| 6 | 🦅 Olho de Águia | nv 15, 1500 ouro | 20 | 30 s | +20% de crítico e +40% de velocidade de ataque por 15 s. | — | — |
| 7 | 💥 Disparo Crítico | nv 40, 9000 ouro (Imortal) | 35 | 16 s | Flecha certeira de 450% que sempre é crítica. (Imortal) | 0,28 | 0,13 |

### Invocador

**Papel**: invocador (alcance 11). **Armadura**: peles e ossos (defesa ×0,9, vida ×1,06, **+mana**). **Armas**: cetro, cajado, totem. **Visual**: colete de peles, cocar de chifres, cetro. **Pontos fortes**: 3 invocações distintas (lobo ágil, golem provocador, espírito de dano alto), cura em conjunto, dano em área por tempo (`Enxame`). **Pontos fracos**: depende da sobrevivência do pet e de mana; ataque pessoal médio; margem baixa no meio do jogo.

Base: vida 100, mana 95, ataque 12, defesa 5, crítico 6 %, esquiva 0 %, vel. de ataque 1. Por nível: vida +20, mana +11, ataque +3.1, defesa +1.5.

| # | Habilidade | Aprende | Mana | Recarga | Efeito | Mult/s | Mult/mana |
|---|---|---|---|---|---|---|---|
| 1 | 🐺 Invocar Lobo | nv 1, 0 ouro | 22 | 10 s | Chama um lobo ágil para lutar por você. | — | — |
| 2 | ✴️ Raio Espiritual | nv 1, 0 ouro | 7 | 2,5 s | Raio de 200%; sua invocação foca o alvo. | 0,80 | 0,29 |
| 3 | 💜 Elo Vital | nv 3, 120 ouro | 20 | 14 s | Cura 30% da sua vida e 50% da vida da invocação. | — | — |
| 4 | 🐝 Enxame | nv 6, 350 ouro | 22 | 11 s | Enxame de insetos que castiga a área por 4 s. | 0,24 | 0,12 |
| 5 | 🗿 Invocar Golem | nv 20, 2500 ouro | 40 | 35 s | Golem de pedra que provoca e protege você. | — | — |
| 6 | 👻 Invocar Espíritos | nv 15, 1500 ouro | 30 | 20 s | Espírito veloz de dano alto, porém frágil. | — | — |
| 7 | 🐾 Pacto Selvagem | nv 40, 9000 ouro (Imortal) | 35 | 35 s | +30% ataque e +20% defesa para você; a invocação ganha +40% de dano por 15 s. (Imortal) | — | — |

## 5. Montarias

Regras do código: 8 montarias; nível 1–30 por XP (`mountLvBon`: ×1,0 no nível 1 até ×1,725 no 30); o **bônus vale com a montaria equipada mesmo desmontado** (`recalc` usa `p.lastMount`) e a velocidade só vale montado. Drops: `CFG.drop.mount` = 0,2 % comum, 2 % elite, 10 % campeão, 20 % chefe. Por zona: Campos → Cavalo; Floresta → Cavalo/Lobo; Ruínas e Dunas → Javali/Unicórnio; Tundra → Tigre; Cinzas → Corcel Sombrio (elites e campeões inclinam para o último da lista). Chefes dão montaria fixa. Também há compra direta por ouro (`buyMount`) para quem tem o nível.

| Montaria | Nível | Preço | Veloc. | Bônus no nível 1 | Bônus no nível 30 | Voa | Como obter |
|---|---|---|---|---|---|---|---|
| 🐎 Cavalo de Aldoria | 5 | 400 | 0,75 | +5 % ataque, +6 % vida | +9 % ataque, +10 % vida | não | zona field, zona forest, chefe banditking |
| 🐺 Lobo de Guerra | 12 | 1.200 | 0,85 | +8 % ataque, +2 % crítico | +14 % ataque, +3 % crítico | não | zona forest, chefe guardian |
| 🐗 Javali Blindado | 18 | 2.200 | 0,78 | +14 % defesa, +12 % vida | +24 % defesa, +21 % vida | não | zona ruins, zona dunes, chefe colossus |
| 🦄 Unicórnio Lunar | 20 | 3.000 | 1 | +8 % ataque, +10 % defesa, +8 % vida | +14 % ataque, +17 % defesa, +14 % vida | não | zona ruins, zona dunes, chefe pharaoh, chefe scorpqueen |
| 🐅 Tigre das Neves | 28 | 6.000 | 1,1 | +12 % ataque, +3 % crítico, +6 % vida | +21 % ataque, +5 % crítico, +10 % vida | não | zona tundra, chefe frostwyrm |
| 🐉 Dragão Rubro | 35 | 12.000 | 1,3 | +16 % ataque, +12 % defesa, +16 % vida, +3 % crítico | +28 % ataque, +21 % defesa, +28 % vida, +5 % crítico | sim | chefe ignar |
| 🦅 Grifo Real | 42 | 20.000 | 1,4 | +18 % ataque, +10 % defesa, +14 % vida, +5 % crítico | +31 % ataque, +17 % defesa, +24 % vida, +9 % crítico | sim | chefe yetiking |
| 🐴 Corcel Sombrio | 48 | 32.000 | 1,35 | +20 % ataque, +16 % defesa, +18 % vida, +4 % crítico | +34 % ataque, +28 % defesa, +31 % vida, +7 % crítico | não | zona ashlands, chefe lich, chefe demon |

Chance esperada de drop por morte: comum 0,2 %, elite 2 %, chefe 20 %. Em zona com 2 montarias, cada uma recebe metade. Exemplos: **Corcel Sombrio** (única montaria das Cinzas) cai a 0,2 % de um monstro comum das Cinzas (~500 mortes) e a 2 % de elites (~50), além de dois chefes (Lorde Lich e Senhor Demônio, 20 % cada), então é a mais fácil de obter para o nível 48; **Grifo Real** só cai do Rei Yeti (20 %, respawn de 120 s); **Dragão Rubro** só de Ignar (20 %).

### Achados das montarias

1. **O bônus de montaria é permanente e grande**: um Corcel Sombrio no nível 30 dá +34 % de ataque, +28 % de defesa e +31 % de vida **sem estar montado**, mais do que qualquer peça de equipamento. Sugestão: aplicar só montado, ou reduzir (×0,5 desmontado).
2. **Velocidade**: o multiplicador (0,75–1,4) vale só montado; o Cavalo (0,75) é o mais lento e o Tigre (1,1) o supera sem custo extra. Dragão e Grifo voam e ignoram obstáculos; conviria conferir se atravessam vilas e zonas seguras como pretendido.
3. **Progressão da montaria** (nível 1–30 por XP, curva `30·n^1,55`): o nível 30 exige ~42 mil XP de montaria, que só vem de matar monstros montado. Como o bônus vale desmontado, só quem quer evoluir a montaria precisa montar.
4. **Preços**: compra direta de 400 a 32.000 de ouro; os monstros dão de 3 a 30 por morte (chefes ×8), então o Corcel Sombrio leva muitas horas de ouro e os drops são a rota realista. A diferença de 80× de preço entre Cavalo e Corcel contrasta com o ganho de poder (~×6).
5. **Visual**: Cavalo, Unicórnio, Lobo, Tigre, Javali, Grifo, Dragão e Corcel têm modelo próprio; o Dragão Rubro (modelo de Ignar) já tem asas em leque. Cavalo, Unicórnio e Corcel ainda têm pernas de peças (candidatos ao loft).

## 6. Recomendações priorizadas

| # | Recomendação | Onde | Estado |
|---|---|---|---|
| 1 | Monstros escalarem por T² | (não aplicada) | Era erro do modelo; a dificuldade já é estável entre fases |
| 2 | Teto de crítico (~60 %) e de esquiva (~35 %) com retornos decrescentes | `game.js` `recalc` | APLICADA |
| 3 | Vanguarda: subir multiplicadores, redução de dano percentual por fase, escudo que reflete | `data.js` CLASSES, `recalc` | APLICADA |
| 4 | Mana: +2 por nível para a Caçadora; custo menor na Chuva de Flechas | `data.js` CLASSES | APLICADA |
| 5 | Pets do Invocador herdando defesa e crítico do dono; Elo Vital curar mais a invocação | `game.js` `spawnPet` | APLICADA |
| 6 | Bônus de montaria só montado (ou ×0,5 desmontado) | `game.js` `recalc` | APLICADA (×0,5 desmontado) |
| 7 | Modo automático: prioridade a escudo e cura com vida baixa | `game.js` automático | APLICADA |
| 8 | Guardar esta simulação em `tools/` e rodá-la a cada mudança de números | novo script | FEITO (`tools/modelo_combate_classes.py`) |
