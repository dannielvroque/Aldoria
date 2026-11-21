# Motor, shaders, luz e efeitos

Leia quando for mexer em `src/engine.js`, em `src/world.js` (cenário/terreno) ou em luz, clima e efeitos de `src/game.js`.

## Mapa do código
- `engine.js`: `Renderer`. Shaders `VS`/`FS` (principal), `FS_SKY`, `FS_POST` (bloom, ACES, vinheta, contorno de tinta por detecção de bordas), `VS_AO`/`FS_AO`. Programas em `this.P`. `begin`/`end(exposure)`, `beginShadow`/`endShadow`, `draw`/`draw1`/`parts`/`batchOf`/`partsBatch`, `drawAO`, `setRim`, `renderPortrait`. Qualidade em `QUALITY` (Baixa/Média/Alta, tecla G); `uFx` só liga em **Alta**.
- `world.js`: `buildWorld` (terreno `ground()`, props via `add()`, `aoFor()`, bloco "locais secretos", `scat` por zona). Malhas em blocos de 48 m (`CMB`): `mb` principal, `mt` montanhas (sem sombra), `gl` emissivo, `wt` água, `ao`.
- `game.js`: `LIGHT`/`lightCur` (luz por zona e hora), `wx` (clima), `opaque()`/`transparent()`, efeitos `fxBurst/fxRing/fxPillar/fxDisc`, lista `shadows` (sombra de contato dinâmica), `RIM_*`, `curParts`/`portrait`.

## Convenções de cor de vértice (lidas no `FS`)
`r<0` peça lisa (`CLN`) · `r<0,g<0` alvenaria (`MAS`) · `r<0,b<0` tábuas (`PLK`) · `r<0,g<0,b<0` telhas (`SHG`) · `r>=3` terreno (`ground()` soma 4 a r). Sem bandeira, a superfície vira "rocha" com rachaduras (origem das "linhas onduladas"). `add()` marca `prism`/`pyr` como lisos.

## Fatos e armadilhas
- **Emissivo** soma `albedo*1.5` em HDR e o bloom (`uBloom` ~0,34) estoura cores claras (asas/armas brancas viravam placas). `e` é intensidade.
- Rim por objeto: `R.setRim(r,g,b)` antes de `R.parts`, zerar depois; ignora o passe de sombra; `pow(1-ndv,3)`; intensidade alta tinge o corpo todo.
- AO estático: só Média/Alta; disco que cai a 0 na borda do objeto fica invisível (o centro é coberto): precisa de platô.
- Lava: terreno laranja saturado vira lava no `FS` (só Alta). Telhas: fileiras escalonadas pela inclinação.
- Reflexo de ambiente nos metais dos personagens (`f0` por `metal`).
- Sombra de contato dinâmica e escurecimento de parede perto do chão **já existem**.
- Câmera de cima (~50°, distância 15): o chão e o que está a poucos metros dominam o quadro; céu e horizonte quase não entram.
- `uBones[48]` (VS e VS_D). A pele do Mixamo e o agrupamento de peças compartilham esse caminho; `vP` multiplica pela escala do osso.
- Peças presas à mão com rotação usam `PA`/`rotOff`. Faces de cilindros/cones já foram corrigidas: não inverter de novo.
- Locais secretos: `place(id, tint, raio, fn)` limpa o chão e chama o construtor; `obstacles.push` para colisão; `EX` evita props de cenário em cima.
- Prévia do personagem no inventário: `R.renderPortrait` (alvo HDR fora do quadro → `FS_POST` → canvas 2D), só com a janela aberta.

## Orçamento (referência, não limite)
≤ 300 draw calls e ≤ 750 k triângulos por quadro no desktop; hoje 115–180 e 0,3–1,4 M (inclui passe de sombra). Real em GPU: **nunca medido**.

## O que ainda falta (visual)
Noite com luz local (lanternas, fogueiras, brasas); efeitos por evento e partículas (neve, brasas, poeira); chão de Dunas/Picos ainda liso; chuva e neblina quase invisíveis; Média e Alta quase indistinguíveis; corpo e rosto do jogador/NPCs ainda em peças de revolução; Minotauro e golems em blocos (aceitável: pedra).
