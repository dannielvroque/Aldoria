# Captura, medição e verificação visual

Leia quando for medir antes/depois, capturar cenas ou depurar uma imagem.

## Ambiente
Playwright + Microsoft Edge já instalado (sem baixar navegador), Python com `playwright pillow numpy`. Se não houver venv, crie um fora do repositório (`python -m venv`). Renderização **por software** (swiftshader): FPS não vale, só contagens e imagem.

## Scripts do repositório (`tools/`)
- `capture_graficos.py <rótulo>`: 7 pontos fixos × dia/noite em `docs/graficos/<rótulo>/` + `metricas.json` (draw calls, triângulos, entropia, contraste...). Ao final imprime `_erros_console` e `_requisicoes_de_rede` (devem ser `[]`).
- `capture_cenas.py <rótulo> [cenas]`: `habilidades, bestiario, locais, retratos, herois, drops, portal, npcs, elites, chefes, montarias, clima, vilas, qualidade`. `IDS=wolfm,fox` filtra o bestiário. Uma rodada completa leva ~10 min; rode as cenas afetadas em segundo plano.
- `teste_juncao_pecas.py`: equivalência pixel a pixel entre o desenho antigo e o agrupado (esperado 0).
- Rótulos usados: `antes`, `depois_p1`… `depois_p7`.

## Armadilhas da captura
- `Game` é `const` global (não `window.Game`): espere `typeof Game !== 'undefined'`; `Game._dbg.world` só existe depois de `Game.newGame`.
- `d.sim` é síncrono e o jogador pode morrer dentro dele: use `window.__sim(n)` (reabastece a vida a cada passo; os scripts já instalam).
- A qualidade cai sozinha por causa do FPS baixo; os scripts a fixam em Alta. A luz suaviza a mudança de hora: `sim(260)` para a noite assentar.
- Tecla `M` (mapa) pode precisar de ~5 s de espera; `I` abre o inventário (a prévia 3D roda por `setInterval`).
- Métricas de imagem variam ~15 % entre execuções (monstros, hora, nuvens); **entropia não mede beleza**.
- Rodar sem erro não prova que a cena certa foi capturada: **abra as imagens** (Read) e compare lado a lado com PIL.
- Aviso do Chrome "GPU stall due to ReadPixels" vem da prévia do inventário; é esperado.
- `capture_cenas` do bestiário: `d.cam.dist/pit/yaw` + posicionar o jogador ao lado do monstro; sem isso o jogador cobre o bicho.

## Medidas de referência (7 pontos, qualidade Alta)
Depois da junção de peças: draw calls ~115–180, triângulos 0,27–1,4 M. Antes: 495–1.605. Se um ponto passar de ~300 draw calls, procure peças fora de cache (`keepParts`).

## Fluxo de uma passada
1. Ler o item do plano em `GRAPHICS.md`. 2. Implementar o menor passo. 3. `python build.py`. 4. Capturar `depois_pN`. 5. Comparar com o anterior; conferir console/rede e draw calls. 6. Testar Baixa/Média/Alta. 7. Registrar na seção 9 do `GRAPHICS.md`. 8. Commit em `graficos/passadas` com o trailer de coautoria pedido pelo ambiente.
