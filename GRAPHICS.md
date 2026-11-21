# Aldoria — Guia de qualidade gráfica

Documento de trabalho para as passadas de melhoria gráfica. O método vem de skills públicas do GitHub lidas como referência
(`threejs-aaa-graphics-builder`, `directing-game-visuals`, `auditing-game-screen-readability`, `shader-glsl`, `particle-system`),
adaptado ao motor próprio (WebGL2, um arquivo, offline). Nenhum código delas é usado; só o método e a ideia das receitas.

Regra central: **forma primeiro, depois material, depois luz, depois efeitos.** Brilho, névoa e bloom não substituem geometria que falta.

## 1. Como medir (repetível)

```
python build.py
python tools/capture_graficos.py <rótulo>      # ex.: antes, depois_ao, depois_rim
```
Grava `docs/graficos/<rótulo>/*.jpg` (7 pontos × dia/noite, 1280×720, qualidade Alta, clima limpo) e `metricas.json`.
Requer `pip install playwright pillow numpy` e o Microsoft Edge instalado (não baixa navegador).

```
python tools/capture_cenas.py <rótulo> [cena,cena,...]      # ex.: antes   |   antes chefes,clima
```
Grava `docs/graficos/<rótulo>/cenas/*.jpg`: folhas de contato de habilidades (4 classes), heróis por fase (4 classes × 4 fases, de perto), morte e drops,
portal (dia/noite), NPCs por tipo, elites, 10 chefes (parados e com telegraph), 8 montarias, clima, as 9 vilas e Baixa/Média/Alta.
Cenas: `habilidades, herois, drops, portal, npcs, elites, chefes, montarias, clima, vilas, qualidade`. Uma rodada completa leva ~10 min (renderização por software).

Limites conhecidos da captura (leia antes de comparar números):
- Renderização **por software** (swiftshader): o FPS medido (~3–6) não vale nada. Compare só draw calls, triângulos e imagem.
- Vida infinita e qualidade fixa em Alta durante a captura (senão o personagem nível 1 morre e a qualidade automática cai).
- Monstros, hora e nuvens variam entre execuções: espere **±15 %** de ruído nas métricas de imagem. Mudança menor que isso não é evidência.
- `draw_calls` e `triangulos` somam todos os passes de um quadro (sombra, cena, pós). Só valem como comparação antes/depois.
- Nas cenas de combate o tempo de jogo avança de forma irregular entre quadros: as folhas mostram **o tipo** de efeito, não a duração.
- **Ainda não capturados**: interior de masmorras, campeão errante, itens do chão de perto, painéis (inventário, ferreiro, mapa), animações em movimento (andar, atacar, montaria em corrida) e a aparência com equipamentos de outras raridades além de Comum/Lendário.
- O brilho da noite nas zonas Dunas e Picos pode estar em transição de luz (a luz suaviza a mudança de hora); revisar.

Métricas de imagem (área central, sem HUD): `entropia` (variedade de cor; < 3,0 sugere cena chapada), `dominante` (fatia da cor mais comum; > 0,6 sugere chapado),
`contraste` (percentil 95 − 5 da luma; < 60 sugere névoa/escuro comprimindo), `bordas` (densidade de arestas; definição diferente da skill, não use o limite 0,04 dela).

## 2. Linha de base ("antes") — `docs/graficos/antes/`

| Ponto | draw calls | triângulos | entropia dia | contraste dia | contraste noite |
|---|---|---|---|---|---|
| Aldoria (praça) | 1236 | 1,38 M | 4,6 | 100 | 108 |
| Campos | 1526 | 1,11 M | 4,7 | 113 | 65 |
| Floresta | 1143 | 0,50 M | 5,3 | 162 | 102 |
| Ruínas | 663 | 0,54 M | 4,6 | 111 | 64 |
| Dunas (deserto) | 629 | 0,50 M | **3,6** | 161 | **29** |
| Picos Gélidos | 608 | 0,32 M | **3,7** | 87 | 116 |
| Cinzas | 528 | 0,27 M | 5,2 | 97 | 68 |

Sem erros no console e sem requisições de rede.

Referência de orçamento da skill (para Three.js em desktop, ponto de partida e não limite): ≤ 300 draw calls, ≤ 750 k triângulos por quadro.
A praça de Aldoria e os Campos passam disso, mas a contagem aqui inclui o passe de sombra; medir FPS real em GPU antes de concluir que é problema.

## 3. Pontuação por categoria (0 placeholder · 1 básico estilizado · 2 premium estilizado · 3 vitrine)

Equivalentes de gênero (RPG de ação, câmera de cima a ~50°): Herói = personagem do jogador; Obstáculos/inimigos = monstros, elites, chefes;
Interativos = drops, portais, NPCs, baús. Notas de **estimativa a partir de quadros parados**, não de movimento.

| Categoria | Nota | Evidência |
|---|---|---|
| Direção de arte | 2 | Estilo desenhado (tinta + 3 faixas de luz) coeso; cada região tem paleta própria. |
| Herói/jogador | 2 | De perto (`herois_*_fases`) o modelo é bom: ombreiras, escudo, capa, rosto, coroa/chapéu. As 4 fases diferem sobretudo por asas, halo, espinhos e cor das gemas; asas e armas brancas estouram no bloom e viram placas chapadas. Na câmera padrão o personagem é pequeno. |
| Inimigos | **1,5** | Comuns legíveis (javali, goblin, aranha). Chefes: Rainha Escorpião, Rei Yeti, Rei Colosso e Rei dos Bandidos funcionam; **Serpe Glacial** (esfera + tubos), **Ignar** e **Senhor Demônio** (corpo de caixas + asas de placa vermelha) e a **Hidra** (tubo verde) parecem primitivas. As 3 elites Minotauro são o mesmo modelo recolorido (uma variante, não uma família). Telegraph de chefe: anel laranja, legível, igual em todos. |
| Interativos | 2 | Portal (arco de pedra com disco roxo e partículas) forte de dia e de noite. NPCs com nome e kind reconhecíveis, mas pequenos. Drops aparecem como feixe de luz (bom de longe); o item em si não foi visto de perto. |
| Mundo/ambiente | **1,5** | Campos e Floresta: bons (árvores, arbustos, flores, rochas). Dunas e Picos: áreas enormes de chão liso com poucos props ao alcance da câmera (entropia 3,6–3,7). |
| Materiais/texturas | **1,5** | O ruído de contorno que lê como "linhas onduladas" aparece no chão **e nos telhados, rochas e tendas** (telhados marrom, vermelho e roxo das vilas e dos postos). Lava das Cinzas = manchas borradas sobre facetas grandes e chapadas. |
| Iluminação/render | Dia 2 · Noite **1** | Dia: sombras e luz boas. Noite: lavagem azul monocromática na praça e nas Ruínas, quase sem luz local (só a fonte brilha); Dunas à noite saem cinza e chapadas (entropia 2,2, dominante 0,48). |
| VFX/movimento | **1,5** | Habilidades usam anéis, discos, feixes, bolhas e pilares: legíveis e com cor por classe (escudo azul, cura verde, invocações visíveis), mas quase sem partículas e com pouca variedade de forma. Morte: faíscas curtas. Clima: chuva = riscos finos quase invisíveis, tempestade só escurece, neblina não apareceu na captura. |
| UI/HUD | 2 | Painéis escuros com dourado, coerentes e legíveis. Não auditei sobreposição em momentos de pico (ver 5). |
| Desempenho | 1 | Contagens medidas; FPS real em GPU **não** medido. |

Média das 10 categorias: **≈ 1,65** (iluminação contada como 1,5: dia 2 e noite 1). Limiares da skill: "premium" = todas ≥ 2 e média ≥ 2,3. Hoje: **não atinge** (inimigos, mundo, materiais, iluminação, VFX e desempenho abaixo de 2).

## 4. O que a câmera revela (decide as prioridades)

A câmera padrão olha de cima (~50°, distância 15): o que mais aparece é **o chão e os objetos a poucos metros do jogador**. Horizonte, céu e montanhas
quase nunca entram no quadro. Portanto o retorno visual está em: (1) chão, (2) props de perto, (3) luz e sombra locais, (4) feedback de combate.
Trabalho de céu e névoa distante rende pouco para o que o jogador vê de fato.

## 5. Problemas observados (ordem de prioridade)

1. **Ruído de contorno "ondulado" em todas as superfícies grandes** (chão, telhados, tendas, rochas) e **chão pobre em Dunas e Picos**. Candidatos: AO e variação de cor por vértice, decalques, trocar o ruído por um padrão menos vistoso.
2. **Noite plana**: sem pontos de luz locais (lanternas, fogueiras, brasas, cristais) e com cor única por zona. Dunas/Picos à noite não leem como noite.
3. **Falta de contato**: personagens e props "pousam" no chão sem sombra de contato nem AO.
4. **Separação do fundo**: jogador, elites e chefes sem luz de recorte (rim/fresnel).
5. **Lava das Cinzas**: manchas borradas e facetas grandes e chapadas.
6. **Feedback de combate**: habilidades só com anéis, discos e feixes (quase sem partículas); morte discreta; chuva quase invisível e neblina sem efeito visível na captura. Telegraph de chefe já é bom, manter como padrão.
7. **Chefes e elites de primitivas**: Serpe Glacial, Ignar, Senhor Demônio, Hidra; 3 Minotauros iguais recoloridos. Outros pendentes do `CLAUDE.md`: fênix, lich, necromante, Orc Senhor da Guerra, Ignar com asas soltas.
8. **Brilho estourado**: asas, armas e adereços brancos das fases altas viram placas chapadas no bloom; revisar emissivo e limiar do bloom.
9. **Postos repetidos**: os 6 postos têm a mesma planta (barracas, cerca, fogueira, portal) e mudam só de cor/bioma.
10. **Qualidade**: Baixa não tem sombra; Média e Alta quase não se distinguem a olho (tamanho da sombra e MSAA). Reavaliar se Média/Alta fazem sentido separadas.
11. **UI**: avisos competem no topo (toast de qualidade + banner de zona + barra de chefe); auditar sobreposição do rastreador de missão com minimapa/ícones.

## 6. Passadas planejadas

Cada passada: capturar "depois" com `tools/capture_graficos.py`, comparar com `antes`, anotar nota e custo em draw calls/triângulos, testar as 3 qualidades.

| # | Passada | Onde | Sucesso se |
|---|---|---|---|
| 1 | **Feita** — ver 9. AO estático sob peças altas + telhados/tendas lisos + terreno sem rachaduras de rocha. Sombra de contato dinâmica já existia (`shadows` em `game.js`) | `world.js`, `engine.js`, `game.js` | Telhados e chão sem linhas onduladas; draw calls iguais |
| 2 | **Feita** — ver 9. Rim por objeto em jogador, alvo, elites, campeões e chefes | `engine.js` (FS, `setRim`), `game.js` | Elite/chefe se destaca do fundo sem texto; sem custo mensurável |
| 3 | **Feita** — ver 9. Lava, telhas, chão de Dunas e Picos, reflexo de metal; brilho estourado e modelos de dragão, demônio, hidra e serpe glacial tratados junto | `engine.js`, `world.js`, `models.js` | Lava nítida, telhados com telhas, sem placas brancas chapadas |
| 4 | Noite: pontos de luz locais baratos (emissivos + halo) e paleta de noite por zona | `game.js` (`LIGHT`), `world.js` | Contraste noturno ≥ 80 e cor distinta por região |
| 5 | Efeitos por evento: morte com dissolve/brasa, crítico, telegraph de chefe | `game.js` (`fx*`), `engine.js` | Cada evento legível sem olhar a UI |
| 6 | Partículas ambientais por zona (neve, brasas, poeira, vaga-lumes) | `engine.js` (programa de pontos novo) | Visível em movimento; custo medido em Baixa/Média/Alta |
| 7 | Revisão dos modelos pendentes (silhueta primeiro) | `models.js` | Reconhecíveis como silhueta escura antes de cor |
| 8 | Auditoria de UI em momentos de pico | `ui.js`, `style.css` | Nenhum aviso sobreposto ou ilegível |

As capturas de combate, drops, portais, chefes, elites, montarias e heróis por fase já existem em `docs/graficos/antes/cenas/` e servem de "antes" para as passadas 2, 5, 7 e 8.
Se o FPS real em GPU for ruim na praça/campos, uma passada de desempenho (instancing de props repetidos, LOD) vira prioridade 0.

## 7. Paleta e papéis de gameplay (proposta para validar)

Regra: cada cor tem um papel; protagonista, perigo e recompensa devem ser distinguíveis em um quadro parado, sem texto.

| Papel | Cor atual (UI/mundo) | Observação |
|---|---|---|
| Jogador / herói | vermelho + dourado (Vanguarda) | Cada classe precisa de uma cor dominante própria, legível a 15 m. |
| Perigo | vermelho (vida, dano) | Ainda não padronizado no mundo (telegraphs, áreas de chefe). |
| Recompensa | dourado | Drops por raridade já têm cor; conferir contra o chão de cada região. |
| Mana/magia | azul | Mesma cor no HUD e nos efeitos. |
| Seguro (vila) | tons quentes de pedra | Distinto do campo de combate. |

Regra de ouro para efeitos: ligados a um evento (acerto, crítico, morte, coleta), pouco duradouros, e com opção de reduzir luz/tremor.

## 8. Orçamento e verificação a cada passada

- Console limpo, zero requisições de rede (já medidos pelo script).
- Comparar `metricas.json` com `antes`: draw calls e triângulos não devem subir mais que ~10 % sem justificativa.
- Conferir Baixa, Média e Alta (tecla G); em Baixa nada pode quebrar nem sumir.
- Efeitos fortes de luz/tremor com versão suave.

## 9. Registro das passadas

### Passada 1 — ruído ondulado, AO estático, telhados lisos (feita)

Diagnóstico (diferente do previsto): a sombra de contato dinâmica já existia e o escurecimento de paredes perto do chão também. As "linhas onduladas" vinham do bloco de rocha do shader
(`rk`, `crack`, `strat` em `engine.js` FS, só com `uFx`, ou seja, qualidade **Alta**), aplicado a **toda** superfície não marcada como "peça limpa": o chão de bioma pedregoso (Ruínas, Cinzas) e os telhados/tendas.

O que mudou:
- **Terreno marcado**: `ground()` em `world.js` soma 4 ao canal r da cor de vértice; o FS lê `tf = step(3, vC.r)` e desliga `crack`/`strat` no terreno. Efeito colateral bom: o terreno deixa de balançar como folhagem no VS.
- **Telhados e tendas lisos**: `add()` em `world.js` marca todo `prism` e `pyr` como peça limpa (`CLN`). Todos os usos são telhado, tenda ou cobertura de neve.
- **AO estático**: `aoFor()` em `world.js` gera um disco (platô + queda) sob peças com altura ≥ 0,5 m e raio ≥ 0,22 m que tocam o chão, sem repetir a menos de 0,5 m. Vai para um mapa de blocos próprio (`w.ao`), desenhado por `R.drawAO` (`engine.js`, programa `ao`, blending com `polygonOffset`, sem sombra e **só em Média/Alta**) logo depois do mundo opaco. Intensidade em `game.js` (`R.drawAO(..., 1.1)`).
- Pegadinha que custou tempo: um disco que cai a 0 na borda da peça fica invisível, porque o centro é coberto pela própria peça. O platô precisa ir até a borda dela.

Resultado (`docs/graficos/depois_p1/`, comparativos em `docs/graficos/cmp/`):
- Ruínas e Cinzas: chão sem linhas onduladas. Telhados e tendas de todas as vilas e postos: lisos, com as juntas de tábua do shader.
- AO: discreto, visível sob arbustos, rochas, troncos e paredes. Em intensidade 3 (teste) fica nítido.
- Custo: draw calls e triângulos dentro do ruído (±5 %). Sem erros de console nem rede.
- A **entropia** das imagens caiu (Ruínas dia 4,56 → 3,86; Picos 3,71 → 3,69; Cinzas dia 5,24 → 4,95): o ruído removido contava como variedade. Entropia **não** é critério de beleza aqui; o critério da passada 1 era sumir o artefato, e sumiu.

Pendências desta passada: a lona retangular de alguns toldos (Sahr) ainda mostra textura; o chão das Dunas e dos Picos continua grande e liso (passada 3); telhados ficaram bem chapados (candidato a textura de telhas na passada 3).

### Passada 2 — rim light por objeto (feita)

Já existia um rim fraco no FS (dependente da luz, igual para todos). Agora há um rim **por objeto**, independente da luz, só em personagens (`!world`):
- `engine.js`: uniform `uRim` (cor × intensidade) e `R.setRim(r,g,b)`; no FS, `lit += uRim * pow(1 - ndv, 3.0)`, antes da névoa (a névoa o atenua). Não é aplicado no passe de sombra.
- `game.js` (`RIM_*`): chefe `[1,.38,.2]` 0,55 · campeão `[.8,.4,1]` 0,5 · elite `[1,.82,.35]` 0,45 · alvo selecionado `[1,.9,.5]` 0,35 (se já tem rim de tipo, vale o maior) · jogador: cor da classe misturada com branco, 0,3. Chefe com `warn` (preparando ataque) ganha ×1,6. Intensidade alta alimenta o bloom.
- Primeira tentativa (expoente 2,2 e chefe 0,9) tingiu o corpo inteiro: o Rei Colosso (cinza) ficou rosa e o Rei Yeti (branco) ficou pêssego. Com expoente 3,0 e intensidades menores o corpo mantém a cor e o contorno separa do fundo.

Resultado (`docs/graficos/depois_p2/`, comparativos `docs/graficos/cmp/p2_*.jpg`): contorno visível em chefes, elites e Hidra/Rainha Aranha; elites mudam pouco porque já têm tom quente próprio; jogador e alvo ficam sutis (a esta escala quase imperceptíveis). Sem erros de console nem rede; draw calls e triângulos na faixa normal.

Pendências: brilho estourado das asas/armas brancas dos heróis em fases altas (item 8 dos problemas) não foi tratado aqui; avaliar o rim do jogador em movimento.

Correção de ferramenta: `tools/capture_cenas.py` passou a reabastecer a vida a cada passo de simulação (`window.__sim`); antes o personagem podia morrer dentro do `sim()` e as capturas de chefes saíam com a tela "Você caiu".

### Passada 3 + brilho estourado + modelos (feita)

**Brilho estourado** (asas, halo, armas e capacete brancos das fases altas): `R.parts` tratava qualquer `e` verdadeiro como emissão fixa 0,9. Agora `e` é intensidade (`min(1,e)*0,9`; `e:1` continua igual). Em `models.js`: asas `e:.4` em azul claro (`[.6,.76,.97]`, `[.48,.66,.94]`), halo `e:.7` dourado mais escuro, capacete grau 5 e anel do peitoral `e:.4/.5`, armas `wE = .35`, e o branco puro do grau 5 escurecido (`ARM_COL[5]`, `WPN_COL[5]`). Resultado: asas azuladas e translúcidas em vez de placas brancas.

**Passada 3** (`engine.js` FS e `world.js`):
- **Lava das Cinzas**: terreno laranja saturado (`lm = r - 1,7g - 0,6b`) vira lava com borda nítida (`smoothstep`), cor ruidosa animada e emissão pulsante (`emL`); só em Alta (`uFx`). Antes eram manchas borradas do grid de 1,5 m.
- **Telhas**: nova bandeira de cor `r<0,g<0,b<0` (`SHG` em `world.js`) = telhado de telhas, com fileiras escalonadas pela inclinação (`rowH`, eixo perpendicular à normal). Aplicada a telhados de casa, celeiro e torre redonda. Tendas continuam lisas.
- **Reflexo de ambiente nos metais** dos personagens: refletância `f0 = mix(0,04; 0,5; metal)`, tingida pela cor do metal (`envK = max(rough<0,12, metal*0,85)`).
- **Chão**: Dunas com cristas largas (lado claro/sombreado) e areia compactada; Picos com ondas de neve, vales azulados e poças congeladas. Props novos (`scat` em `world.js`): pedrinhas e arbustos secos (Dunas), montes de neve e cristais de gelo (Picos), cascalho escuro (Cinzas), em tamanho que a câmera enxerga.

**Modelos** (`models.js`): helper `fanWings` (braço + 4 dedos em leque saindo do ombro, com membrana entre eles, batendo) aplicado ao Dragão Rubro/Ignar e ao Senhor Demônio; dentes no dragão; Hidra com espinhos no dorso e chifres; Serpe Glacial (`MOBM.frostwyrm`) com cristais de gelo luminosos nas costas, nas cabeças e nos ombros. A montaria Dragão Rubro muda junto (mesmo modelo de Ignar).

**Custo medido** (7 pontos, "antes" → `depois_p3`): triângulos Dunas 497 k → 616 k (+24 %), Picos 318 k → 385 k (+21 %), Cinzas 272 k → 369 k (+35 %), demais ±5 %; draw calls Cinzas 528 → 599 (+13 %), demais ≤ +5 %. Sem erros de console nem rede. **FPS real em GPU continua sem medir**: se pesar, reduzir a densidade dos `scat` novos primeiro.

Pendências: chão de Dunas e Picos melhorou menos que a lava (ainda grande e liso a olho nu); tendas e toldos de lona sem textura; Minotauros ainda iguais recoloridos; `herois_*` ainda sem comparação com o `antes` para os metais; "mais real" em personagens limitado ao reflexo de metal e a partes dos monstros (ver pergunta aberta sobre rumo de estilo).

### Passada 4 (em andamento) — mais polimento: janela de Equipamento, lobo, heróis

Decisão do usuário: **manter o estilo desenhado**, com mais capricho; lobo tem que parecer lobo; personagens mais feitos e bonitos.

- **Prévia 3D na janela de Equipamento [I]** (pedido do usuário): `R.renderPortrait` (`engine.js`), `curParts()`/`Game.portrait()` (`game.js`), canvas `.pv` e `setInterval` de 70 ms em `ui.js`. Gira sozinho, arrastar gira à mão, mostra o personagem com os itens equipados. Só atualiza com a janela aberta. Aviso do Chrome "GPU stall due to ReadPixels" (leitura síncrona, ~14×/s): inofensivo, mas se pesar em GPU real, trocar por `drawImage` do canvas do jogo ou reduzir a frequência.
- **Bestiário** (`capture_cenas.py antes_p4 bestiario`): 37 monstros de perto, com o id no quadro (filtro `IDS=wolfm,jackal`). Serve de "antes" para os próximos modelos.
- **Lobo** (`wolfParts`, usado por lobo, lobo sombrio, alfa, chacal, lobo glacial e cão infernal): reescrito com peito fundo e cintura estreita, barriga clara e sela escura, juba e gola de pelo, crânio largo com focinho longo (nariz preto, presas, mandíbula que abre), orelhas eretas com miolo claro, olhos inclinados com sobrancelha, cauda volumosa e patas escuras. O alfa perdeu o disco que parecia um porco e ganhou juba maior; o chacal ficou mais magro, com orelhas grandes. **Avaliação honesta:** reconhecível como canídeo, mas o corpo ainda é feito de esferas sobrepostas e mostra emendas; falta uma segunda passada de formas.
- **Heróis** (`models.js`): viseira do elmo deixou de cobrir os olhos (agora protetor de nariz e bochechas; a faixa da caçadora subiu para a testa); capa em 5 faixas que se abrem (`capeParts`); asas de penas em duas fileiras (`angelWings`) no lugar das placas.
- Pendente: segunda passada do lobo, corpo e rosto dos heróis (ainda caixas arredondadas), os outros monstros do bestiário, os Minotauros recoloridos.

### Passada 5 — auditoria de composição, monstros novos e 6 locais secretos

**Auditoria (1.768 monstros, `audit.py` no scratchpad; os números abaixo são de antes da mudança):** 6 tipos por bioma numa área de ~300 monstros repete muito; o Minotauro era elite em Ruínas, Tundra e Cinzas (mesmo modelo recolorido); curva de nível sobe bem até ~400 m e fica achatada entre 400 e 700 m (média 41,6 → 43,8 → 46,4).

**Composição (`data.js`, `models.js`, `game.js`, `art.js`):** um tipo novo por bioma e elites próprias.
- Campos: Raposa Ruiva (`fox`, derivada do `wolfParts`). Floresta: Urso Pardo (`bear`). Ruínas: Gárgula de Pedra (`gargoyle`, golem + asas em leque + chifres). Dunas: Naja do Deserto (`cobra`). Tundra: Urso Polar (`polarbear`, alias do urso). Cinzas: Salamandra de Brasa (`salamander`).
- Elites: Tundra ganhou Urso Polar Alfa e Cinzas ganharam Salamandra de Magma; o Minotauro ficou só nas Ruínas.
- Para registrar um monstro novo: `MOBS`/`ELITES` e `MOB_ALIAS` em `data.js`; `MSPD`/`HGT` em `game.js`; `MOBM`, `MOB_COL` e `MOB_SC` em `models.js`; retrato em `art.js` (mapa `MOB`).
- Lobo, segunda passada: tronco em uma peça alongada (`bone`), barriga e sela com contraste suave. Sem as manchas da primeira versão. Naja: espiral e pescoço densos, capelo erguido.

**6 locais secretos** (`SITES` com `poi:1`, coordenadas em `LM`; estruturas em `world.js` bloco "locais secretos"): Mina Abandonada (Campos), Santuário Élfico (Floresta), Templo do Sol (Dunas), Observatório Gélido (Tundra), Forja Esquecida (Cinzas), Fonte dos Esquecidos (Ruínas). Posições escolhidas por busca (terra a ≥45 m da costa, zona certa, ≥73 m de qualquer vila, chefe, covil ou marco). Cada um tem forma, cor e brilho próprios e obstáculos de colisão. **Descoberta**: a menos de 13 m, uma única vez, dá XP (60 % do nível) e ouro e conta para a conquista **Descobridor** (8.000 de ouro). Estado em `G.rec.disc` (o save de `rec` já cobre; saves antigos ganham `[]`). Testado por script: os 6 disparam, não repetem, conquista concedida.

**Custo:** os modelos novos têm 39–49 peças (faixa normal; o maior monstro tem 72). Draw calls subiram em Ruínas (672 → 1.142), Dunas (640 → 1.027) e Picos (639 → 893), mas isso depende de quantos monstros caem no quadro de captura; o desenho é **uma chamada por peça**, então ~10 monstros no quadro já somam ~500 chamadas. **Esse é o maior risco de desempenho do jogo**; a saída é juntar as peças estáticas de cada modelo numa malha única (batching), ainda não feita. FPS real em GPU continua sem medir.

**Verificação do mapa [M]** (passada 5): os 5 locais novos aparecem com nome e ícone de masmorra (a Mina Abandonada fica no centro, perto de Aldoria, e o rótulo some na sobreposição); o painel lateral de biomas lista sozinho os monstros novos. O atalho `M` não abre o painel em modo automatizado quando se usa `keyboard.press` imediatamente após o jogo carregar; funcionou com 5 s de espera.

**Heróis, ajuste final:** no close de rosto o elmo do Vanguarda parecia usar óculos (bochechas grandes ao lado dos olhos). Agora são chapas finas nas laterais da cabeça e um protetor de nariz fino. Corpo e rosto continuam sendo caixas arredondadas e esferas, no estilo do jogo; não houve remodelagem do corpo.

**Não feito nesta rodada:** revisão dos outros ~30 monstros do bestiário (só lobo, canídeos, naja e os 5 novos foram refeitos); batching de peças por modelo (principal ganho de desempenho possível); medição de FPS em GPU real.

### Passada 6 — junção de peças (batching): −85 a −90 % de draw calls

Problema: `R.parts` fazia uma chamada de desenho por peça (monstros 39–72 peças, jogador até 156); ~10 personagens no quadro somavam 500+ chamadas.

Solução (`engine.js`, `models.js`): modelos em cache (`parts._c`, marcado por `keepParts` em `mobParts`, `playerParts`, `npcParts`, `mountParts` e `seatedParts`) viram poucas malhas com pele (`BatchMesh`): cada peça é um "osso" (`aJ`, peso 1, até 48 por malha, agrupadas por emissão, rugosidade e metal). As matrizes de osso são as mesmas que o desenho antigo calculava (`sw`, `at`, `bob`, `fl`); as peças sem animação são calculadas uma vez. Reaproveita o suporte a pele que já existia (`uSkin`/`uBones`, agora `[48]`). `vP` no shader passou a multiplicar pela escala do osso para o ruído de superfície ficar igual. Há eviction FIFO de 160 modelos para liberar a GPU (variações de equipamento e aparência geram modelos novos). `R.noBatch = true` volta ao desenho antigo.

Resultado:
- **Equivalência**: `tools/teste_juncao_pecas.py` renderiza cada monstro, as 4 classes (fase máxima) e 4 montarias nos dois modos: diferença de **0** pixels em todos. Chamadas de desenho 2.843 → 261 (−91 %).
- **7 pontos reais** (`docs/graficos/depois_p6/`), draw calls antes → depois: praça 1.185 → 180, campos 1.605 → 164, floresta 606 → 120, ruínas 1.142 → 172, dunas 1.027 → 153, picos 893 → 170, cinzas 495 → 126; triângulos iguais; sem erros de console nem rede. Cavaleiro em montaria, drops e chefes conferidos visualmente.
- **Convenção nova**: modelo novo só ganha o benefício se for devolvido por uma função que guarda em cache e passa por `keepParts`. Peças criadas a cada quadro (ex.: `itemParts` de item caído) continuam no caminho antigo, de propósito (evita vazar buffers da GPU).
- FPS real em GPU continua sem medir (a medição é por software); a expectativa é ganho grande de CPU, porque cada chamada de desenho também fazia 5–6 chamadas de uniform.

### Passada 7 — fim das "bolas": loft contínuo em animais e monstros

Pedido: tirar o aspecto de "várias bolas" de personagens e animais, mais reais, **mantendo o estilo desenhado**; rever os monstros. Método vindo da skill `blender-godot-lowpoly` (loft por seções em vez de primitivas montadas). Causa do aspecto: esferas sobrepostas com tons diferentes e linhas de tinta (contorno por detecção de bordas) desenhadas dentro do corpo, onde uma esfera entra na outra.

O que mudou:
- **`mkLoft`** (`meshes_extra.js`): malha contínua por seções ao longo de uma espinha (Catmull-Rom), seção elíptica, pontas arredondadas, normais suaves, tom por vértice (barriga/garganta claras, costas e patas escuras). **`geoP`** (`models.js`) cria peças com geometria própria e pivô de balanço; o agrupamento de peças (passada 6) aceita `q.g`.
- **Reescritos em loft:** lobo (e raposa, chacal, lobo glacial, cão infernal, alfa), javali (e javali couraçado), urso (e urso polar), naja (um loft ao longo da espiral e do pescoço), salamandra.
- **`legChain`** (pernas de aranha, escorpião e outros) agora é um loft por perna, sem esfera de joelho; o eixo de balanço original foi preservado.
- **Monstros humanoides** (goblin, orc, esqueleto, múmia, bandido, necromante, diabrete...): `LOFT_MODE` (ligado só dentro de `mobParts`) usa lofts para perna (calça + bota) e braço. **Jogador e NPCs não mudaram**: `stretchLegs`, `headScale` e `seatedParts` dependem das peças de revolução.
- **Escorpião:** cauda e pedipalpos em loft.
- **Revisão do bestiário** (37 monstros, `docs/graficos/depois_p7/cenas/bestiario_*.jpg`): ok os de pedra/gelo/fogo em blocos (golems, yeti, minotauro, gárgula: aceitável como estilo), espectros, elementais e a hidra; melhorados os acima. Ainda com cara de esferas: corpo segmentado do escorpião (placas) e o Minotauro.

Verificação: `tools/teste_juncao_pecas.py` com as peças novas: diferença 0 pixels, 254 chamadas contra 2.352 do desenho antigo; 7 pontos: draw calls 117–180, sem erros de console nem rede.

Skill `aldoria-graficos` reorganizada: `SKILL.md` virou roteador curto e o detalhe foi para `references/` (modelagem, motor e shaders, captura e medição, skills externas). **Lição de casa do usuário: sons** → `SONS.md`.

### Passada 8 — loft no jogador e nos NPCs; equipamento por classe

- **Loft no jogador e NPCs**: `humanoid({ loft: 1 })` (chamado por `playerParts` e `npcParts`) usa lofts para coxa, canela, bota e braço. As pernas já nascem na proporção esticada e levam `ns` (o `stretchLegs` as pula) e `leg: 'thigh'|'calf'` (o `seatedParts` do cavaleiro usa a etiqueta em vez de deduzir pelo deslocamento). Os braços funcionam sem mudança: `stretchLegs` sobe o pivô e a geometria vai junto. Conferido no retrato das 4 classes e no cavaleiro sentado nas 8 montarias.
- **Equipamento por classe** (pedido do usuário): `buildItem` grava `it.cls` em armas e armaduras; `equip()` recusa item de outra classe (toast + log + som de erro); dica do item mostra "Fase" e "Classe" (com "não pode equipar"). Armaduras por classe (nomes, cores no modelo e atributos próprios): Vanguarda = placas (def ×1,25, vida ×1,2), Arcanista = tecidos (def ×0,7, vida ×0,82, +mana), Caçadora = couro (+esquiva), Invocador = peles e ossos (+vida e +mana). `recalc` soma mana e esquiva da armadura. Saves antigos: equipamento sem classe passa a ser da classe do personagem; armas do baú ganham a classe pelo tipo (exceto `staff`, de duas classes).

### Passada 9 — encontros aleatórios ("Gente do caminho")

`src/encounters.js` (`registerEncounters(X)`, entra no build antes de `world.js`; `game.js` entrega só a API necessária). NPCs temporários aparecem sozinhos perto do jogador (38–78 m, fora de vilas/sítios/água), com aviso (toast + log com direção e distância), ícone ❗ no minimapa e no mapa, e somem por tempo (4–7 min), por distância (260 m) ou quando a história acaba. Primeiro em 55 s, depois a cada 110–220 s, no máximo 2 ao mesmo tempo, sem repetir tipo. Aparência reaproveita os modelos de NPC (`kind: 'enc'` + `style`). Diálogo por `Game.encDialog`/`Game.encAct` (UI `data-a="enc"`).

11 tipos: **Viajante Ferido** (dê uma poção de vida: ouro, XP e item ou o mapa de um local secreto), **Mercador Errante** (5 ofertas: pacotes de poções, pedra misteriosa, baú lacrado de equipamento, ração), **Caravana em Perigo** (4–6 bandidos cercam a carroça; derrote-os), **Alma Penada** (só à noite: derrotar 8 criaturas por perto; recompensa um acessório), **Altar do Destino** (oferenda: bênção, nada, fortuna, presente ou maldição), **Viajante Perdido** (escolta até uma vila: o NPC segue você), **Cavaleiro Errante** (duelo de honra contra o Cavaleiro Negro, elite), **Caçador de Tesouros** (mapa com um X a ~100 m; pilar de luz no chão; chefe-surpresa de guardas às vezes), **Bruxa** (poção misteriosa: sorte e azar), **Ferreiro Itinerante** (martelada grátis, 75 %, +1), **Menestrel** (canção cura e dá buff; gorjeta paga uma balada especial). Conquistas: **Amigo dos Viajantes** (5) e **Lenda da Estrada** (20). `Game._dbg.enc` (`spawn(tipo)`, `list()`, `clear()`) permite testar.

Verificação por script: os 11 tipos criam, abrem diálogo, executam todas as ações, matam os mobs de evento, completam a escolta (segue o jogador até a praça) e dão a conquista; sem erros de console.

### Passada 10 — cidades próprias e identidade das classes

- **Cidades novas** (Pedraluz, Zahar, Cinzeiro, Frostmar): `TOWN_DEF` e `PAL.<id>` próprios, centro por `v.id` em `townLayout` (obelisco de cristal, cisterna e bazar, fortaleza central, lago congelado com barco). Capturas de cima em `docs/graficos/`.
- **Personagens**: `shoulderTrim` e placa frontal por classe em `armorDeco`/fase (antes todas usavam as mesmas ombreiras douradas e a mesma placa redonda): Vanguarda aço, Arcanista manto de pano com friso, Caçadora couro com pena, Invocador pele. Folhas `docs/graficos/revisao_personagens*/cenas/herois_*`. Teste de junção: 0 pixels de diferença.
- Pendente: cinto branco largo igual em todas as classes; coroa de fase igual; rosto e cabelo ainda por revisar.
