# Aldoria — Histórico do Projeto (conversa com o Claude)

> Resumo completo do que foi pedido, decidido e entregue no desenvolvimento do **Aldoria**, um RPG 3D offline para navegador inspirado no WYD (With Your Destiny).
> Autor do projeto: **Danniel** · Atualizado em 20/11/2026

---

## 1. O que é o Aldoria

- RPG 3D **single-player e offline**, roda no navegador (Chrome/Edge) com um **arquivo único**: `dist/aldoria.html`.
- Motor gráfico **WebGL2 próprio** (sem Unity/Three.js), estilo low-poly com iluminação "toon".
- Código-fonte em `src/*.js`; o arquivo final é gerado com `python3 build.py`.
- Pasta oficial no PC: `C:\Users\danni\iCloudDrive\projetos\Aldoria` (repositório: https://github.com/dannielvroque/Aldoria)

### Estrutura de arquivos

| Arquivo | Função |
| --- | --- |
| `engine.js` | Motor WebGL2: render, sombras, malhas básicas, culling por blocos |
| `meshes_extra.js` | Malhas orgânicas (corpos, superbox, prisma, chamas, tecido…) |
| `data.js` | Dados: classes, itens, monstros, zonas, configurações (`CFG`) |
| `models.js` | Modelos de personagens, NPCs, armas, montarias e monstros |
| `story.js` | História, missões, diários, conquistas, NPCs de serviço |
| `world.js` | Construção do mundo: continente, vilas, vegetação, props |
| `ui.js` + `style.css` | Interface: menus, HUD, inventário, mapa, diálogos |
| `game.js` | Lógica do jogo: combate, movimento, save, contas, eventos |
| `admin.js` | Painel de administrador (separado e protegido por senha) |
| `build.py` | Junta tudo em `dist/aldoria.html` |

---

## 2. Linha do tempo dos pedidos

### Visual dos personagens e correções iniciais
- Personagens redesenhados, saindo do estilo "Minecraft" para corpos mais orgânicos.
- Correções: bug do ícone do tempo, neblina reduzida, jogo continua rodando minimizado, objetos tocando o chão, itens dropados no formato do item, armas presas nas mãos.
- Removidas "bolas nas bochechas" e os seios das personagens femininas.

### História, missões e conteúdo
- História principal em capítulos por faixa de nível, com submissões, diários e conquistas.
- Mais armas, habilidades e monstros fortes; chefes novos.
- NPCs redesenhados (antes pareciam sem pernas).
- Mapa (tecla M) e biomas por região; vilas mais medievais.

### Contas, itens e NPCs
- **Sistema de contas**: vários personagens por conta com **baú compartilhado** (Guarda de Carga).
- **Várias contas** no mesmo navegador, com botão "⇄ Trocar conta".
- Kit inicial: arma e roupa básicas **+0 sem adicionais** e 10 poções.
- Conjunto **Comum no nível 16** e **Incomum no nível 26**, entregues no Guarda de Carga; o resto só por drop.
- NPCs novos: Treinador (habilidades), lojas de armas e armaduras, Cavalariço (ração), Joalheiro (adicionais).
- Removidos o Guardião Valen (o portal faz o serviço) e a Curandeira (poções no Doran ou por drop).
- Inventário: botão direito para excluir item; ouro **só se guarda/retira no Guarda de Carga**.

### Classes (redesenhadas)
| Classe | Recurso | Armas | Estilo |
| --- | --- | --- | --- |
| **Vanguarda** | Fúria | Espada/adaga/machado + escudo | Guerreiro mortal, mais vida e defesa, menos dano |
| **Arcanista** | Mana (INT) | Cajado, varinha, orbe, grimório | Mago de dano em área |
| **Caçadora** | Mana | Só arcos e bestas | Crítico, velocidade de ataque, esquiva ("Errou!") |
| **Invocador** (ex-Domador) | Mana (INT) | Cetro, cajado, totem | Invoca lobo, golem, espíritos, enxame |

- Habilidades ficam **só no painel V** (o painel C mostra personagem e atributos).
- Cada nível de habilidade dá +10% de efeito.

### Evolução
- **Mortal (1–50) → Imortal (1–50) → Ancestral (1–50) → Ser Supremo.**
- Ao evoluir: volta ao nível 1; itens equipados e da mochila vão para o Guarda de Carga.
- Ficam: ouro, montarias, habilidades aprendidas (voltam ao nível 1), história e conquistas.
- Zeram: pontos de atributo e de habilidade.
- Itens exigem **classe e fase** certas.
- Monstros balanceados pelo nível do jogador: um monstro comum do mesmo nível morre com 5–8 ataques básicos; monstros difíceis dão muito mais XP.

### Painel de administrador (Ctrl+Shift+F10)
- Protegido por senha (hash PBKDF2), bloqueio de 60 s após 3 erros, sessão expira em 15 min.
- Abas: Drops, Refino (+1 a +10), Economia, Campeões, Joalheiro, Eventos, Exportar/Importar, Restaurar, **Teste**.
- **Eventos**: XP em dobro, ouro em dobro, chuva de raros, invasão de campeões, refino abençoado, pedras em dobro — por duração ou recorrentes. O jogador vê **faixa dourada** no topo, aviso grande e linha no registro.
- **Aba Teste (perfil ADM)**: cria a conta "ADM" com 4 personagens Ser Supremo nível 50, equipamento Lendário +10, todas as montarias, 10 milhões de ouro; trapaças (invencível, sem recarga, mana infinita, velocidade 3x, matar com 1 golpe, teleporte pelo mapa) com faixa "MODO TESTE"; botões rápidos (nível, fase, ouro, item, chefe, hora, clima, vilas).

### Mundo: de 4 mapas para um continente
- Mapa ampliado **2,5x**, depois transformado em **um continente único** cercado de mar, com praias.
- Campos no centro, floresta em volta, ruínas ao sul, **deserto a leste, neve ao norte, vulcão a oeste**, com transição suave entre biomas.
- Dá para atravessar **andando**; estradas ligam as vilas.
- **Portais só levam às vilas/postos vizinhos** (atalhos).
- **10 chefes, 6 masmorras e 6 covis de elite** espalhados longe dos portais; a história tem etapas de exploração até eles.
- Níveis por região: campos 1–12, floresta 13–30, deserto 26–40, neve 37–50, ruínas 31–50, vulcão 48–60.
- Vilas redesenhadas: **Aldoria** (cidade grande, praça com fonte, mercado, avenidas), **Sahr** (deserto), **Hielmar** (neve), **Cinzas** (vulcão) + 4 postos.

### Correções e melhorias visuais
- Bug do personagem **girando sozinho** em volta de pedras/NPCs/monstros: corrigido.
- Arco da Caçadora preso na mão.
- **Faces invertidas** em todos os cilindros/cones corrigidas (pinheiros chapados, tendas transparentes).
- Pinheiros, "raios" brancos na neve, acampamento de bandidos, covis, arena da Rainha Escorpiã, dunas.
- Moinho, plantações, muralhas/torres/portões e demais objetos refeitos.
- Monstros refeitos (escorpião, aranhas, lobos, golens, espectros, elementais etc.); círculos de aviso de ataque redondos e transparentes.
- **Mapa M** novo: sem pixelar, nomes legíveis, legenda, zoom 1x–14x, botões +/−/centralizar.

### Interface no estilo WYD (últimos pedidos)
- **Inventário** = janela "Equipamento": slots em volta do personagem com "+N", mochila em grade, ouro na base.
- **Guarda de Carga** = "Banco": grade com páginas 1/2/3 (120 espaços), aberta **ao lado** do Equipamento.
- **Ferreiro e Joalheiro** abrem junto com o Equipamento (dá para refinar itens equipados).
- **Seta da missão** em volta do personagem, com distância.
- **Barra de atalhos** em dois grupos: Habilidades [1–5, 8, 9] e Poções [6, 7].
- **Montarias**: saíram da loja; agora **caem de monstros**, têm **nível 1–30** e XP (matando montado e cavalgando); o Cavalariço vende ração e "Tratar". Quadro da montaria no HUD com energia, ração, nível e XP.

---

## 3. Teclas principais

| Tecla | Ação |
| --- | --- |
| Clique | Andar, atacar, falar |
| 1–5, 8, 9 | Habilidades |
| 6 / 7 | Poção de vida / mana |
| Espaço / Tab | Atacar / trocar alvo |
| F | Falar com NPC próximo |
| Z | Combate automático |
| X | Montar / desmontar |
| I / C / V / M / Q | Equipamento / Personagem / Habilidades / Mapa / Missões |
| Ctrl+Shift+F10 | Painel de administrador |

---

## 4. Pendências conhecidas

- Teleporte pelo mapa (aba Teste) às vezes cai ~50 m longe do ponto clicado.
- NPC do estábulo do deserto às vezes não abre a conversa chegando por um lado.
- Modelos ainda não revisados: minotauro, hidra, fênix, lich, necromante, Orc Senhor da Guerra, Ignar (asas soltas).
- Documentação completa (classes, monstros e drops) e planilha ainda por fazer; o Manual de Testes precisa ser atualizado com a interface nova.

---

## 5. Links

- Manual de Testes: https://claude.ai/artifact/AUskNYdXxWVp9YEBqZ7iGV
- Documentação anterior do jogo: https://claude.ai/artifact/UjdADfoNfosrUGpxg6hupn
