---
name: aldoria-graficos
description: Use ao mexer em QUALQUER coisa visual do Aldoria — modelos 3D por código (jogador, NPCs, monstros, animais, armas, montarias), aparência "de bolas" ou emendas visíveis, shaders, iluminação, sombras, bloom, AO, rim, texturas procedurais, cenário e locais, clima, efeitos, partículas, desempenho de desenho (draw calls), prévia do personagem — ou ao medir/comparar gráficos (capturas antes/depois). É um roteador: diz o que ler e quais regras valem; o detalhe fica em references/.
---

# Aldoria — gráficos (roteador)

Estilo do jogo: **desenhado (toon)** — luz em 3 faixas, linhas de tinta, mundo facetado. Decisão do usuário: **manter o estilo**, só com mais capricho e menos "cara de bolas". Mudança de estilo é do usuário.

## Primeiro passo (sempre)
1. Ler `GRAPHICS.md` (raiz): pontuação, plano, registro das passadas (seção 9) e pendências.
2. Escolher a rota abaixo e ler **só** a referência dela.

| Tarefa | Ler |
|---|---|
| Criar/alterar modelo de personagem, monstro, animal, arma, montaria; "parece bola/esfera"; emendas; novo monstro | `references/modelagem.md` |
| Shader, luz, sombra, bloom, AO, rim, terreno, telhas, lava, cenário, locais secretos, clima, efeitos, inventário 3D | `references/motor-e-shaders.md` |
| Medir antes/depois, capturar cenas, comparar imagens, depurar captura, teste de equivalência | `references/captura-e-medicao.md` |
| Procurar ideias fora (skills do GitHub) | `references/skills-externas.md` |

## Regras fixas
- 100 % offline, um único HTML, sem CDN, sem fonte ou asset externo; um único escopo global (sem colisão de nomes); texto do jogo em pt-BR. Arte original (nada copiado de WYD ou de outro jogo comercial).
- Ordem de qualquer passada: **forma → material → luz → efeitos**. Brilho, névoa e bloom não substituem geometria que falta.
- Corpo orgânico = **loft contínuo** (`mkLoft` + `geoP`), não esferas sobrepostas. Detalhes pequenos (olho, dente, garra, chifre) podem ser peças `P(...)`.
- Modelo novo devolvido por função com cache **deve passar por `keepParts`** (senão volta a centenas de draw calls). Depois de mexer em modelos/`R.parts`: `python tools/teste_juncao_pecas.py` (esperado 0 pixels de diferença).
- Depois de qualquer mudança: `python build.py`; abrir o jogo; console sem erros e sem requisições de rede; **olhar as imagens** (ler o arquivo), não confiar só em "rodou sem erro".
- Arquivos usam CRLF; edite com Edit/Write ou Python.

## Fluxo curto de uma passada
Ler o plano → menor passo → `build.py` → capturar (`tools/capture_graficos.py`, `tools/capture_cenas.py`) → comparar com a passada anterior (console, rede, draw calls ±10 %) → testar Baixa/Média/Alta → registrar em `GRAPHICS.md` → commit em `graficos/passadas` (trailer de coautoria pedido pelo ambiente).

## Estado (atualize ao fim de cada passada)
- Feitas: passadas 1–6 (ruído do chão, AO, rim, lava/telhas/metais, brilho, monstros novos, 6 locais secretos, junção de peças) e a 7 (loft: animais, monstros humanoides, pernas de aranha/escorpião; prévia 3D no inventário).
- Pendentes: corpo/rosto do jogador e NPCs ainda em peças de revolução (exige adaptar `stretchLegs`, `headScale`, `seatedParts`); outros monstros em bloco (golems, yeti, minotauro: aceitável); noite com luz local; partículas por bioma; chão de Dunas/Picos; chuva/neblina; FPS real em GPU nunca medido.
- Sons: primeira rodada feita (ver `SONS.md`); falta o ouvido do usuário.
