# Aldoria — lição de casa: melhorar os sons de tudo

Pedido do usuário (rodada da passada 7): "precisamos melhorar os sons de tudo". Primeira rodada implementada (ver Estado abaixo); este arquivo guarda o plano e o que falta.
Regras do projeto valem aqui: 100 % offline, sem arquivos de áudio externos, sem CDN; sons sintetizados no navegador (Web Audio). Original, nada copiado de outro jogo.

## Estado (primeira rodada implementada; falta o ouvido do usuário)

**Feito** (`src/audio.js`, integrado em `src/game.js`, `src/ui.js`, `src/admin.js`):
- **Mixer**: `SND = createSoundEngine()`; canais `sfx`, `amb`, `music`, `ui` → volume geral → compressor → saída. Volumes salvos em `localStorage` (`aldoria_vol`) e **4 controles deslizantes no menu de pausa** (Geral, Efeitos, Ambiente, Música). `G.mute`/tecla N continuam.
- **Blocos de síntese**: osciladores com envelope, vibrato, tremolo e filtro; ruído branco e rosa filtrado; sinos (parciais inarmônicos); espacialização barata (volume por distância e pan pela direção da câmera, até ~52 m).
- **72 efeitos**: interface (clique, abrir/fechar painel, erro, equipar, moeda, pegar, poção, nível, missão, conquista, evolução em 3 s, descobrir local, refino com sucesso e falha, joia, encontro, portal, forja); combate (golpe por arma: espada, machado, adagas, cajado, magia, arco, besta; **acerto por material**: carne, osso, pedra, gelo, fogo, madeira, gosma, fantasma, inseto; crítico, dano, morte, bloqueio); **habilidades por classe** (Vanguarda metálico, Arcanista cristalino, Caçadora assobio+corda, Invocador tambor+cântico), cura, escudo, invocação, explosão, trovão, flecha.
- **Vozes de monstro por família** (rosnado, uivo, sibilo, guincho, grito, rugido, estrépito de pedra/osso, gemido de fantasma, crepitar, bolha, zumbido, chilreio de aranha), com altura ligada ao tamanho; **rugido de chefe** (duas camadas + grave). Dispara ao notar o jogador, ao atacar (40 %), ao preparar o ataque de área e ao morrer; espacializado.
- **Passos por piso** (grama, areia, neve, pedra, cinza, madeira) com variação aleatória, **galope** da montaria e **bater de asas** das voadoras; cadência por distância andada.
- **Ambiente por bioma, hora e clima**: vento (2 camadas com rajadas), chuva, mar perto da costa, fogo e graves nas Cinzas, folhas na Floresta, areia nas Dunas, murmúrio nas vilas; pássaros de dia, grilos e coruja à noite, sussurros nas Ruínas, falcão nas Dunas, rangido de gelo na Tundra, estalos de brasa, pingos; marteladas na vila.
- **Música procedural por região** (escala, andamento e instrumento próprios): vila (pentatônica maior, pluck), Campos (lídio), Floresta (dórico, flauta), Ruínas (eólio lento, sinos), Dunas (frígio dominante, darbuka), Tundra (lídio frio, sinos), Cinzas (frígio, tambores graves). **Em combate** o andamento sobe 25 %, entra percussão e tensão; chefe = máxima intensidade.
- **Painel de teste** (administrador, aba Teste, cartão "🔊 Sons"): um botão para cada efeito (agrupado), prévia de música por região e em combate, prévia de ambiente (bioma, noite, chuva, tempestade, mar, vila) por 45 s.
- **Testes** (`python tools/teste_sons.py`): renderiza offline os 72 efeitos, 9 ambientes e 8 músicas e mede pico, energia e NaN: **nenhum NaN, nenhum estouro, nada mudo**, pico máximo 0,33; sem erros de console no jogo com áudio real; ~4 osciladores por segundo em jogo.

**O que eu NÃO sei** (o ambiente de teste não toca som): se está bonito, equilibrado, irritante ou agradável. Preciso do seu ouvido. Use o painel de teste e diga o que ajustar (volume relativo, timbre, frequência dos sons de ambiente, volume da música, quais sons soam estranhos).

**Pendente / ideias**: música de menu e de criação de personagem com tema próprio; sons de interface específicos (loja, baú, ferreiro, joalheiro); vozes de NPC; som de portal ao entrar; eco/reverb por região (convolver simples); mais variedade de passos (sobre estrada, ponte, água rasa); stingers de chefe derrotado; ducking (abaixar música/ambiente durante falas e sons grandes); ajuste fino por feedback do usuário.

## 1. Levantamento original (antes da rodada; preservado)

 (levantamento em `src/game.js`, bloco "áudio", linhas ~58–85)

- `initAudio()` cria um `AudioContext` e um único `GainNode` mestre (`master.gain = .22`) ligado direto ao `destination`. Sem compressor, sem reverb, sem filtro, sem canal separado de música/efeitos/ambiente.
- `tone(f0, f1, dur, type, vol, delay)`: **um oscilador** (square/sawtooth/triangle/sine) com rampa exponencial de frequência e de volume. É o único bloco de construção.
- `SFX` tem só **11 sons**: `hit`, `skill`, `level`, `pick`, `hurt`, `potion`, `die`, `boom`, `thunder`, `shoot`, `coin`. Chamados por `sfx(nome)` com limitação de 40 ms por nome (`sfxT`).
- Uso medido por chamadas no código: `level` 16, `coin` 11, `pick` 8, `boom` 5, `potion` 3, `hurt` 2, `hit` 2, `thunder` 1, `skill` 1, `shoot` 1, `die` 1.
- **Não existe**: música, som ambiente (vento, chuva, fogo, mar, grilos), passos, som de montaria, sons por classe/habilidade, voz/rugido de monstro, som de chefe, portal, ferreiro (refino ok/falha), UI (abrir painel, clicar, erro), ataque básico por arma, impacto por material, volume por distância/posição.
- `G.mute` liga/desliga tudo (`toggleMute`, tecla N). Não há controle de volume nem separação por categoria.

## 2. Plano sugerido (ordem de ganho por esforço)

1. **Mixer**: `master` → compressor (`DynamicsCompressor`) → destino; subgrupos `sfx`, `amb`, `music`, `ui` (cada um um `GainNode`); volumes salvos em `localStorage` (`aldoria_vol`), com controles no menu de pausa. Mantém `G.mute`.
2. **Blocos de síntese melhores** (em vez de só `tone`): ruído filtrado (`AudioBufferSource` com ruído branco/rosa gerado uma vez + `BiquadFilter`), envelope ADSR, vibrato/tremolo por LFO, impacto = ruído curto + corpo grave, "shimmer" = vários osciladores levemente desafinados. Um gerador de buffers de ruído reaproveitado evita custo por som.
3. **Combate por arma e por classe**: espada/machado/adaga/cajado/arco/besta com sons distintos (golpe, acerto, bloqueio, crítico mais brilhante); cada classe com timbre de habilidade (Vanguarda metálico, Arcanista cristalino, Caçadora seca, Invocador grave e ritual). Acerto diferente por material do alvo (carne, osso, pedra, gelo, fogo).
4. **Monstros**: rugido/grito curto por família (canino, felino/urso, aranha/inseto, morto-vivo, golem, dragão, elemental), com altura ligada ao tamanho (`MOB_SC`); som de morte; chefe com som próprio ao entrar em combate e ao preparar ataque de área (`m.warn`).
5. **Passos e movimento**: passos por tipo de chão (grama, areia, neve, pedra, lava/cinza, madeira nas vilas), cadência ligada à velocidade; montaria com galope/asas.
6. **Ambiente por bioma e hora**: vento e pássaros nos Campos de dia, grilos à noite, folhas na Floresta, vento seco nas Dunas, vento cortante e gelo nos Picos, crepitar e graves nas Cinzas, mar perto da costa, chuva e trovão já ligados ao clima (`wx`). Cross-fade ao trocar de zona (`zoneAt`) e de hora (`G.tod`).
7. **Música procedural** leve (loop por região, escala e andamento próprios, mais tensa em combate com chefe), gerada por um sequenciador simples; pode ficar para o fim.
8. **UI e feedback**: abrir/fechar painel, equipar, vender, refino com sucesso e falha, joia, evoluir de fase, descobrir local secreto (`G.rec.disc`), conquista, missão entregue, toast, erro ("mana insuficiente").
9. **Espacialização barata**: volume e `StereoPannerNode` por distância e direção da câmera para monstros, chefes e portais.

## 3. Cuidados

- Navegadores só liberam o áudio após um gesto do usuário (`initAudio` já é chamado em `newGame`; conferir o menu inicial).
- Limitar vozes simultâneas (hoje só há limite de 40 ms por nome): muitos monstros no quadro não podem gerar dezenas de osciladores.
- Reaproveitar buffers de ruído e nós de filtro; criar nós por som é barato, mas centenas por segundo não é.
- Testar sem som real: dá para medir contagem de nós criados e checar erros de console com Playwright; **a avaliação auditiva é do usuário** (o ambiente de teste não toca áudio). Entregar um painel ou tecla de teste que toque todos os sons em sequência (como o modo Teste do administrador) para o usuário ouvir.
- Manter o estilo: sons "de cartoon/fantasia", não realistas demais, coerentes com o visual desenhado.

## 4. Arquivos a tocar

`src/game.js` (bloco de áudio, `sfx(...)`, gatilhos de combate, passos, zona, clima), `src/ui.js` (sons de interface, volumes no menu de pausa), `src/data.js` (talvez tabelas de som por monstro/arma/habilidade), `CLAUDE.md` e `CONTRACT.md` (nomes novos de `Game.*`/`UI.*`), skill `aldoria-jogabilidade`.
