# Modelagem de personagens, monstros e animais (loft, peças, cache)

Leia quando for criar ou mudar qualquer modelo 3D por código (`src/models.js`) ou a primitiva `mkLoft` (`src/meshes_extra.js`).

## Princípio (vem da skill `blender-godot-lowpoly`, adaptado)
**Não montar o corpo com primitivas sobrepostas; construir uma malha contínua por seções (anéis).** Esferas e cilindros sobrepostos dão o aspecto de "várias bolas": emendas visíveis, tons diferentes entre peças e linhas de tinta (contorno por detecção de bordas em `FS_POST`) desenhadas **dentro** do corpo, onde uma esfera entra na outra. Silhueta esculpida vem de variar, **a cada anel, o raio e o centro**, não de esticar uma esfera.

## Ferramentas
- `mkLoft(pts, o)` (`meshes_extra.js`): `pts` = `[x, y, z, rx, ry]` por ponto de controle (rx = meia-largura lateral, ry = meia-altura/profundidade), espinha suavizada (Catmull-Rom), seção elíptica com pontas arredondadas, normais suaves. Opções: `sides` (10; use 8 em membros finos), `sub` (3), `flat` (0..1, achata o lado de baixo: barriga), `up` (vetor de referência da seção; use `[0,1,0]` quando a espinha dá voltas, p.ex. espiral da naja), `tone(nx,ny,nz,px,py,pz)` → escalar ou `[r,g,b]` que multiplica a cor da peça **por vértice** (barriga/garganta mais claras, costas escuras, patas escuras, focinho claro, listras).
- `geoP(g, cor, J, extra)` (`models.js`): peça com a geometria `g`; `J` = pivô de balanço (quadril, ombro, base da cauda); a geometria já fica em coordenadas do modelo (a função põe `o = -J`). `extra` leva `sw`, `ph`, `at`, `bob`, `fl`, `e`, `rg`, `mt`.
- `legChain(a, H, K, F, w, c, x)` agora gera **um loft por perna** (mantém o eixo de balanço antigo). `quadLeg` o usa.
- `P(forma, pos, escala, cor, extra)` continua para detalhes pequenos (olho, dente, chifre, orelha, garra, nariz) e para armas/adereços.
- Cores/tons: `shade(c,k)`, `mix(a,b,t)`, `furTone(costas, barriga)`.

## Receita de um animal quadrúpede (veja `wolfParts`, `bearParts`, `boarParts`)
1. **Tronco**: um loft da garupa ao peito/ombro (5–6 pontos; peito mais fundo que a cintura; `flat` .15–.25; `tone` com barriga mais clara e dorso mais escuro).
2. **Pescoço + cabeça**: um loft do ombro ao nariz (crânio largo → focinho afilado); gira em torno do pescoço (`at`). Mandíbula: loft fino à parte (`at` maior). Nariz, olhos, sobrancelha, dentes, orelhas: peças pequenas.
3. **Cauda**: loft com pivô na base (`sw`).
4. **Patas**: um loft por pata (quadril→joelho→jarrete→pata, com o dobrado já "assado"), pivô no quadril (`sw`, `ph` alternando em diagonal); `tone` escurece a pata (`py < .13`). Sem esfera de joelho.
5. Crina/juba/cristas: poucos cones. Conte as peças (alvo: 20–40; o jogo agrupa por modelo, mas menos é melhor).
6. Cobra/lagarto: um único loft ao longo de uma espiral/curva; seção redonda (`rx = ry`) para a torção do quadro não aparecer.

## Humanoides
- **Monstros humanoides**: `LOFT_MODE` (ligado só dentro de `mobParts`) faz `humanoid()` usar lofts contínuos para perna (calça + bota) e braço (ombro→antebraço); a mão segue como peça de revolução.
- **Jogador e NPCs** **não** usam loft: `stretchLegs`, `headScale` e `seatedParts` (cavaleiro sentado) leem as peças por posição e deslocamento (`p`, `o`) e quebrariam com geometria própria. Se for trocar, adapte essas três funções primeiro (marque as peças da coxa/canela com um campo, em vez de deduzir por posição).

## Cache e agrupamento de peças (obrigatório para modelo novo)
- Toda função que devolve peças em cache deve passar por `keepParts` (`mobParts`, `playerParts`, `npcParts`, `mountParts`, `seatedParts` já passam). Sem isso, `R.parts` desenha peça a peça (centenas de draw calls).
- `R.parts` junta as peças em poucas malhas com pele (`batchOf`, até 48 ossos por malha, agrupadas por `e`/`rg`/`mt`). Peças com `g` entram igual (a geometria é copiada para a malha agrupada).
- **Depois de mexer em modelos ou em `R.parts`, rode `python tools/teste_juncao_pecas.py`**: esperado diferença 0 e ~90 % menos chamadas.
- Peças criadas a cada quadro (itens no chão) ficam fora do cache de propósito.

## Armadilhas
- `P('box')` vira `rbox` (cantos suaves) em personagens; `sharp:1` mantém aresta viva.
- `e` (emissivo) agora é **intensidade** (`min(1,e)*.9`), não liga/desliga; cores claras com `e:1` estouram no bloom.
- Peças presas à mão com rotação usam `PA`/`rotOff`.
- Em `mkLoft`, `tone` recebe a normal aproximada e a posição do vértice; devolva valores perto de 1 (0,5–1,35). Acima de ~1,4 estoura.
- Eixo do loft: se a espinha é quase vertical, a seção usa `[0,0,1]` como referência (rx = x do mundo, ry = z); se é horizontal, `[0,1,0]` (rx = lateral, ry = altura). Seções redondas escondem qualquer torção.
- Ao orientar a perna de aranha/escorpião (`legChain`), a geometria é pré-girada em `-ry` e a peça gira `ry`: não "simplifique" isso.
- Escala do modelo vem de `MOB_SC` (+ elite ×1,25); nome/altura do rótulo de `HGT`; velocidade `MSPD`.

## Checklist de um monstro novo
`MOBS`/`ELITES`/`MOB_ALIAS` (data.js) · `MSPD`/`HGT` (game.js) · `MOBM`, `MOB_COL`, `MOB_SC` (models.js) · retrato em `art.js` (mapa `MOB`) · capturar com `IDS=<id> python tools/capture_cenas.py <rótulo> bestiario` e **olhar a imagem**.
