'use strict';
/* ===== História principal: "Crônicas de Aldoria" =====
   Um capítulo por faixa de nível (1–10, 11–20, 21–30, 31–40, 41–50). Cada capítulo é uma sequência de etapas.
   Tipos de etapa:
     talk    {npc}                          falar com um NPC
     kill    {mobs:[ids] | zone, n}         derrotar monstros
     collect {mobs:[ids], item, n, ch}      itens que caem dos monstros (chance ch por abate)
     elite   {zone, n}                      derrotar elites de uma zona
     boss    {boss}                         derrotar um chefe
     explore {x, z, r, place}               chegar a um lugar
   As missões dos Anciões continuam existindo como missões secundárias. */
const CHAPTERS = [
  { id: 'c1', n: 'Capítulo I — A Sombra sobre Aldoria', lv: [1, 10], rew: { gold: 600, item: 2 },
    intro: 'As criaturas dos campos ficaram agressivas da noite para o dia. O Capitão Roderic suspeita que algo — ou alguém — está por trás disso.' },
  { id: 'c2', n: 'Capítulo II — Sussurros na Floresta', lv: [11, 20], rew: { gold: 2500, item: 3 },
    intro: 'Os bandidos carregavam um fragmento de cristal negro. O rastro leva à Floresta Sussurrante, onde o Guardião do Bosque perdeu a razão.' },
  { id: 'c3', n: 'Capítulo III — O Chamado das Areias', lv: [21, 30], rew: { gold: 7000, item: 3 },
    intro: 'Uma carta selada chega do Oásis de Sahr: o mesmo cristal apareceu sob as dunas, e os mortos voltaram a andar.' },
  { id: 'c4', n: 'Capítulo IV — As Ruínas do Rei Caído', lv: [31, 40], rew: { gold: 16000, item: 4 },
    intro: 'A erudita Selene decifrou o símbolo dos cristais: é o selo do Rei Colosso, que reinou antes de Aldoria e quer voltar.' },
  { id: 'c5', n: 'Capítulo V — Gelo e Fogo', lv: [41, 50], rew: { gold: 40000, item: 4 },
    intro: 'O último fragmento pulsa no coração do vulcão. Para alcançá-lo, você precisará da bênção do Norte e da coragem para enfrentar Ignar.' },
];
const MAIN = [
  // ---- Capítulo I (1–10) ----
  { ch: 'c1', lvl: 1, k: 'talk', npc: 'roderic', n: 'Um capitão preocupado', t: 'Fale com o Capitão Roderic, na praça da Vila de Aldoria.',
    say: 'Você chegou em boa hora. Gosmas e ratos estão atacando as plantações. Comece por eles — quero ver do que você é capaz.' },
  { ch: 'c1', lvl: 1, k: 'kill', mobs: ['slime', 'rat'], n: 6, t: 'Derrote 6 Gosmas ou Ratos Gigantes nos Campos Verdejantes.' },
  { ch: 'c1', lvl: 3, k: 'collect', mobs: ['boar'], item: 'Presa de Javali', n: 5, ch_: .55, t: 'Colete 5 Presas de Javali. Os ferreiros usam para reforçar escudos.' },
  { ch: 'c1', lvl: 4, k: 'talk', npc: 'roderic', n: 'Relatório ao capitão', t: 'Volte ao Capitão Roderic.',
    say: 'Presas afiadas... e marcas de corrente nos javalis. Alguém está capturando e soltando bichos nos campos. Procure o acampamento ao norte.' },
  { ch: 'c1', lvl: 5, k: 'explore', x: LM.camp[0], z: LM.camp[1], r: 7, place: 'Acampamento Bandido', t: 'Encontre o Acampamento Bandido ao norte da vila.' },
  { ch: 'c1', lvl: 6, k: 'kill', mobs: ['bandit'], n: 8, t: 'Derrote 8 Bandidos.' },
  { ch: 'c1', lvl: 7, k: 'collect', mobs: ['bandit', 'wolfm'], item: 'Fragmento Sombrio', n: 1, ch_: .3, t: 'Recupere o Fragmento Sombrio que os bandidos carregam (pode estar com um lobo de guarda).' },
  { ch: 'c1', lvl: 9, k: 'boss', boss: 'banditking', t: 'O Rei dos Bandidos guarda o acampamento a nordeste. Derrote-o e acabe com os ataques.' },
  { ch: 'c1', lvl: 9, k: 'talk', npc: 'maelis', n: 'O cristal negro', t: 'Leve o Fragmento Sombrio à Anciã Maelis.',
    say: 'Isto não é deste tempo, criança. Sinto uma vontade antiga dentro dele... Prepare-se: o próximo fragmento está na floresta.' },
  // ---- Capítulo II (11–20) ----
  { ch: 'c2', lvl: 11, k: 'talk', npc: 'elric', n: 'O guarda-florestal', t: 'Viaje ao Posto de Brumavale e fale com o guarda-florestal Elric.',
    say: 'A floresta está doente. As aranhas tecem teias negras e os goblins roubam tudo que brilha. Me ajude a entender o que está acontecendo.' },
  { ch: 'c2', lvl: 12, k: 'kill', mobs: ['spider'], n: 10, t: 'Derrote 10 Aranhas Tecelãs.' },
  { ch: 'c2', lvl: 13, k: 'collect', mobs: ['spider'], item: 'Seda Envenenada', n: 6, ch_: .5, t: 'Colete 6 Sedas Envenenadas para Elric estudar a doença.' },
  { ch: 'c2', lvl: 14, k: 'collect', mobs: ['goblin'], item: 'Mapa Goblin', n: 1, ch_: .2, t: 'Os goblins desenham mapas dos tesouros que roubam. Pegue um.' },
  { ch: 'c2', lvl: 15, k: 'talk', npc: 'elric', n: 'O mapa dos goblins', t: 'Mostre o Mapa Goblin a Elric.',
    say: 'Este X marca o coração da floresta — onde vive o Guardião. Mas o caminho é vigiado pelos Lobos Alfa e pela Rainha Aranha.' },
  { ch: 'c2', lvl: 15, k: 'explore', nw: 1, x: LM.ancient[0], z: LM.ancient[1], r: 9, place: 'Árvore Anciã', t: 'Siga o mapa goblin até a Árvore Anciã, a oeste da vila, no meio da floresta.' },
  { ch: 'c2', lvl: 16, k: 'elite', zone: 'forest', n: 2, t: 'Derrote 2 criaturas de elite (douradas) da floresta — o Ninho da Rainha Aranha, a sudeste, está cheio delas.' },
  { ch: 'c2', lvl: 17, k: 'kill', mobs: ['orc', 'ent'], n: 10, t: 'Abra caminho: derrote 10 Orcs Selvagens ou Ents Jovens.' },
  { ch: 'c2', lvl: 18, k: 'boss', boss: 'guardian', t: 'Liberte o Guardião do Bosque da corrupção (derrote-o).' },
  { ch: 'c2', lvl: 18, k: 'talk', npc: 'maelis', n: 'O segundo fragmento', t: 'Leve o segundo fragmento à Anciã Maelis.',
    say: 'Dois fragmentos... e eles se atraem. Quando você estiver mais forte, poderá evoluir além do mortal. O mundo vai precisar disso.' },
  // ---- Capítulo III (21–30) ----
  { ch: 'c3', lvl: 21, k: 'talk', npc: 'maelis', n: 'Carta de Sahr', t: 'A Anciã Maelis recebeu uma carta. Fale com ela.',
    say: 'O Ancião Rahim, do Oásis de Sahr, viu o mesmo brilho negro sob as dunas. Antes de partir, enfraqueça os orcs que bloqueiam a estrada.' },
  { ch: 'c3', lvl: 21, k: 'kill', mobs: ['orc', 'goblin'], n: 14, t: 'Derrote 14 Orcs Selvagens ou Goblins na floresta.' },
  { ch: 'c3', lvl: 25, k: 'talk', npc: 'sahr_q', n: 'O Oásis de Sahr', t: 'Viaje ao Oásis de Sahr, a leste (pela estrada ou pelo portal da praça), e fale com o Ancião Rahim.',
    say: 'Os escorpiões cavam cada vez mais fundo, como se procurassem algo. E as múmias... elas carregam ataduras com o mesmo símbolo do seu cristal.' },
  { ch: 'c3', lvl: 25, k: 'kill', mobs: ['scorpion', 'jackal'], n: 12, t: 'Derrote 12 Escorpiões ou Chacais nas Dunas de Kharim.' },
  { ch: 'c3', lvl: 27, k: 'collect', mobs: ['mummy'], item: 'Atadura Selada', n: 6, ch_: .45, t: 'Colete 6 Ataduras Seladas das Múmias Ressecadas.' },
  { ch: 'c3', lvl: 28, k: 'explore', x: LM.pyramid[0], z: LM.pyramid[1], r: 10, place: 'Pirâmide Soterrada', t: 'Encontre a Pirâmide Soterrada a sudeste do oásis.' },
  { ch: 'c3', lvl: 29, k: 'elite', zone: 'dunes', n: 1, t: 'Derrote uma elite do deserto — a Hidra guarda o Covil, perto da pirâmide.' },
  { ch: 'c3', lvl: 30, k: 'talk', npc: 'sahr_q', n: 'O terceiro fragmento', t: 'Volte ao Ancião Rahim com o terceiro fragmento.',
    say: 'Três fragmentos e um nome nas ataduras: Colosso. Volte a Aldoria e procure a erudita Selene. Ela lê línguas mortas.' },
  // ---- Capítulo IV (31–40) ----
  { ch: 'c4', lvl: 31, k: 'talk', npc: 'selene', n: 'A erudita', t: 'Fale com a erudita Selene na Vila de Aldoria.',
    say: 'O Rei Colosso governou antes de Aldoria. Foi selado nas ruínas, e os cristais são pedaços do selo. Alguém está quebrando-o de propósito.' },
  { ch: 'c4', lvl: 31, k: 'kill', mobs: ['skel'], n: 12, t: 'Derrote 12 Esqueletos Guerreiros nas Ruínas Esquecidas.' },
  { ch: 'c4', lvl: 33, k: 'collect', mobs: ['necro'], item: 'Grimório Rasgado', n: 5, ch_: .4, t: 'Recupere 5 páginas de Grimório dos Necromantes.' },
  { ch: 'c4', lvl: 35, k: 'talk', npc: 'selene', n: 'As páginas', t: 'Leve as páginas a Selene.',
    say: 'É um ritual de despertar. Os espectros alimentam o selo com almas. Detenha-os e enfrente os campeões do rei.' },
  { ch: 'c4', lvl: 35, k: 'explore', nw: 1, x: LM.lichtower[0], z: LM.lichtower[1], r: 10, place: 'Torre Partida', t: 'As páginas falam de uma torre onde o ritual começou. Encontre a Torre Partida, a oeste, além da floresta.' },
  { ch: 'c4', lvl: 35, k: 'kill', mobs: ['wraith', 'banshee'], n: 12, t: 'Derrote 12 Espectros ou Banshees.' },
  { ch: 'c4', lvl: 37, k: 'elite', zone: 'ruins', n: 3, t: 'Derrote 3 campeões de elite das ruínas (Minotauros ou Orcs Senhores da Guerra) na Arena dos Campeões, ao sul.' },
  { ch: 'c4', lvl: 38, k: 'explore', nw: 1, x: LM.crypt[0], z: LM.crypt[1] + 3, r: 10, place: 'Cripta do Rei Caído', t: 'Encontre a Cripta do Rei Caído, nas ruínas a sudoeste. O Colosso dorme ali perto.' },
  { ch: 'c4', lvl: 39, k: 'boss', boss: 'colossus', t: 'Derrote o Rei Colosso antes que ele desperte por completo.' },
  { ch: 'c4', lvl: 40, k: 'talk', npc: 'selene', n: 'O selo quebrado', t: 'Conte a Selene o que aconteceu.',
    say: 'O Colosso caiu, mas o último fragmento não estava com ele. Está no Norte — ou no fogo. O Ancião Pyros e a Anciã Brynja precisam saber.' },
  // ---- Capítulo V (41–50) ----
  { ch: 'c5', lvl: 41, k: 'talk', npc: 'hiel_q', n: 'A bênção do Norte', t: 'Viaje ao norte, até a Vila de Hielmar, e fale com a Anciã Brynja.',
    say: 'Os lobos glaciais desceram dos picos e o gelo canta à noite. Mostre ao Norte que você é digno da nossa bênção.' },
  { ch: 'c5', lvl: 41, k: 'kill', mobs: ['frostwolf', 'yeti'], n: 15, t: 'Derrote 15 Lobos Glaciais ou Yetis.' },
  { ch: 'c5', lvl: 43, k: 'collect', mobs: ['icegolem'], item: 'Coração de Gelo', n: 5, ch_: .4, t: 'Colete 5 Corações de Gelo dos Golens de Gelo.' },
  { ch: 'c5', lvl: 45, k: 'explore', nw: 1, x: LM.icecave[0], z: LM.icecave[1] + 2, r: 12, place: 'Caverna Glacial', t: 'Encontre a Caverna Glacial no extremo norte, onde o Rei Yeti faz seu covil.' },
  { ch: 'c5', lvl: 46, k: 'boss', boss: 'yetiking', t: 'Derrote o Rei Yeti e receba a bênção do Norte.' },
  { ch: 'c5', lvl: 46, k: 'talk', npc: 'cinz_q', n: 'A Forja de Cinzas', t: 'Siga para o oeste até a Forja de Cinzas (estrada de Brumavale ou portal) e fale com o Ancião Pyros.',
    say: 'Com o gelo do Norte você suportará o calor de Ignar. Mas primeiro, as Terras Cinzentas precisam sentir sua lâmina.' },
  { ch: 'c5', lvl: 47, k: 'kill', zone: 'ashlands', n: 20, t: 'Derrote 20 criaturas das Terras Cinzentas.' },
  { ch: 'c5', lvl: 49, k: 'elite', zone: 'ashlands', n: 2, t: 'Derrote 2 elites das Terras Cinzentas (Fênix ou Minotauro Infernal).' },
  { ch: 'c5', lvl: 49, k: 'explore', nw: 1, x: LM.caldera[0] + 6, z: LM.caldera[1], r: 14, place: 'Caldeira de Ignar', t: 'Chegue à Caldeira de Ignar, ao pé do vulcão, no extremo oeste do continente.' },
  { ch: 'c5', lvl: 50, k: 'boss', boss: 'ignar', t: 'Enfrente Ignar, o Dragão Ancião, e recupere o último fragmento.' },
  { ch: 'c5', lvl: 50, k: 'talk', npc: 'maelis', n: 'Lenda de Aldoria', t: 'Volte para casa. A Anciã Maelis espera por você.',
    say: 'Os cinco fragmentos, juntos, se apagam na sua mão. O selo está completo outra vez. Aldoria tem uma nova lenda — e ela tem o seu nome.' },
];
/* oi: posição da etapa antes do continente (saves antigos guardam o índice); etapas novas (nw) não têm */
{ let o = 0; for (const s of MAIN) if (!s.nw) s.oi = o++; }
MAIN.forEach((s, i) => {
  s.i = i; if (s.ch_ != null) { s.chance = s.ch_; delete s.ch_; }
  if (typeof s.n === 'string') { s.nm = s.n; delete s.n; } // talk: título
});
/* título curto automático para as etapas que não têm um */
function stepTitle(s) {
  if (s.nm) return s.nm;
  const mobN = id => { for (const z in MOBS) { const m = MOBS[z].find(x => x.id === id); if (m) return m.n; } return id; };
  if (s.k === 'collect') return 'Coletar: ' + s.item;
  if (s.k === 'kill') return s.zone ? 'Caçada: ' + ZONES.find(z => z.id === s.zone).name : 'Caçada: ' + s.mobs.map(mobN).join(' / ');
  if (s.k === 'elite') return 'Elites: ' + ZONES.find(z => z.id === s.zone).name;
  if (s.k === 'boss') return 'Chefe: ' + BOSSES[s.boss].n;
  if (s.k === 'explore') return 'Explorar: ' + s.place;
  return s.t;
}
const CHAP = {}; for (const c of CHAPTERS) CHAP[c.id] = c;
const stepGoal = s => s.k === 'kill' || s.k === 'collect' || s.k === 'elite' ? s.n : 1;
/* recompensa de uma etapa, proporcional ao nível */
const stepReward = s => ({ xp: Math.round(xpNeed(Math.max(1, s.lvl)) * (s.k === 'boss' ? .9 : s.k === 'talk' ? .18 : .45)), gold: Math.round((20 + s.lvl * 14) * (s.k === 'boss' ? 4 : 1)) });

/* NPCs da história */
NPCS.push(
  { id: 'roderic', kind: 'story', n: 'Capitão Roderic', role: 'Guarda de Aldoria', x: 6.5, z: -6.2, col: [.62, .2, .18], reg: 'aldoria' },
  { id: 'selene', kind: 'story', n: 'Erudita Selene', role: 'Estudiosa de línguas antigas', x: -6.5, z: 6.5, col: [.3, .35, .62], reg: 'aldoria' },
  { id: 'elric', kind: 'story', n: 'Guarda-florestal Elric', role: 'Vigia da floresta', x: VILLAGES[1].cx + 2.4, z: VILLAGES[1].cz - 4.4, col: [.25, .45, .22], reg: 'aldoria', vil: 'post' },
);
const STORY_NPC = new Set(['roderic', 'selene', 'elric']);
/* NPCs de serviço em cada vila principal: Mestre de Habilidades, Guarda de Carga (baú), Armeiro, Alfaiate, Cavalariço e Joalheiro */
{ const SERV = [
    ['trainer', 'Mestre de Habilidades', 'Ensina habilidades', -9.2, -2.6, [.55, .2, .6]],
    ['bank', 'Guarda de Carga', 'Baú compartilhado da conta', 9.2, -2.6, [.45, .38, .25]],
    ['armor', 'Alfaiate', 'Roupas e armaduras básicas', -2.2, 12.6, [.3, .45, .55]],
    ['weapon', 'Armeiro', 'Armas básicas', 2.2, 12.6, [.5, .3, .2]],
    ['stable', 'Cavalariço', 'Ração para montarias', 14.5, -2.8, [.45, .55, .25]],
    ['jewel', 'Joalheiro', 'Engasta pedras de adicional', 16, 7, [.55, .3, .65]],
  ];
  const NAMES = { aldoria: ['Mestre Aldric', 'Guarda Bertram', 'Alfaiate Mirela', 'Armeiro Tomas', 'Cavalariço Pip', 'Joalheiro Ravel'], desert: ['Mestre Karim', 'Guarda Hassan', 'Alfaiate Samira', 'Armeiro Omar', 'Cavalariço Yusuf', 'Joalheira Layla'], snow: ['Mestra Ingrid', 'Guarda Halvar', 'Alfaiate Astrid', 'Armeiro Bjorn', 'Cavalariço Leif', 'Joalheiro Eirik'], volcano: ['Mestre Ashur', 'Guarda Korr', 'Alfaiate Vesna', 'Armeiro Drak', 'Cavalariço Fenn', 'Joalheira Obsidia'] };
  for (const v of VILLAGES) if (NAMES[v.id]) SERV.forEach(([kind, title, role, dx, dz, col], i) => NPCS.push({ id: v.id + '_' + kind, kind, n: NAMES[v.id][i], role: title + ' · ' + role, x: v.cx + dx, z: v.cz + dz, col, reg: v.reg, vil: v.id }));
}

/* ===== Desafios diários e conquistas ===== */
const DAILY_POOL = [
  { k: 'kill', n: 40, t: 'Derrote 40 monstros' },
  { k: 'kill', n: 80, t: 'Derrote 80 monstros' },
  { k: 'elite', n: 3, t: 'Derrote 3 elites' },
  { k: 'skill', n: 60, t: 'Use 60 habilidades' },
  { k: 'crit', n: 50, t: 'Acerte 50 golpes críticos' },
  { k: 'gold', n: 1500, t: 'Junte 1.500 de ouro' },
  { k: 'loot', n: 6, t: 'Recolha 6 equipamentos' },
  { k: 'quest', n: 2, t: 'Conclua 2 etapas de missão' },
  { k: 'boss', n: 1, t: 'Derrote um chefe' },
  { k: 'refine', n: 2, t: 'Refine equipamentos 2 vezes' },
];
const ACHIEVEMENTS = [
  { id: 'k100', n: 'Caçador', t: 'Derrote 100 monstros', k: 'kill', n_: 100, rew: 500 },
  { id: 'k1000', n: 'Flagelo das Feras', t: 'Derrote 1.000 monstros', k: 'kill', n_: 1000, rew: 5000 },
  { id: 'k5000', n: 'Lenda Viva', t: 'Derrote 5.000 monstros', k: 'kill', n_: 5000, rew: 25000 },
  { id: 'e10', n: 'Desafiante', t: 'Derrote 10 elites', k: 'elite', n_: 10, rew: 1500 },
  { id: 'e100', n: 'Matador de Campeões', t: 'Derrote 100 elites', k: 'elite', n_: 100, rew: 12000 },
  { id: 'b1', n: 'Primeiro Chefe', t: 'Derrote um chefe', k: 'boss', n_: 1, rew: 1000 },
  { id: 'b7', n: 'Caçador de Chefes', t: 'Derrote 7 chefes diferentes', k: 'bossU', n_: 7, rew: 30000 },
  { id: 'l10', n: 'Aventureiro', t: 'Alcance o nível 10', k: 'lvl', n_: 10, rew: 400 },
  { id: 'l25', n: 'Veterano', t: 'Alcance o nível 25', k: 'lvl', n_: 25, rew: 3000 },
  { id: 'l50', n: 'Herói de Aldoria', t: 'Alcance o nível 50', k: 'lvl', n_: 50, rew: 20000 },
  { id: 'c1', n: 'Capítulo I', t: 'Conclua o Capítulo I da história', k: 'chap', n_: 1, rew: 0 },
  { id: 'c5', n: 'Fim da Crônica', t: 'Conclua toda a história principal', k: 'chap', n_: 5, rew: 0 },
  { id: 'r7', n: 'Mão de Ferreiro', t: 'Refine um item até +7', k: 'plus', n_: 7, rew: 4000 },
  { id: 'leg', n: 'Sortudo', t: 'Encontre um item Lendário', k: 'legend', n_: 1, rew: 2000 },
  { id: 'reg4', n: 'Viajante', t: 'Visite os 4 biomas do continente', k: 'regions', n_: 4, rew: 3000 },
  { id: 'd7', n: 'Dedicado', t: 'Complete 7 desafios diários', k: 'daily', n_: 7, rew: 5000 },
];

/* marcos do mapa (nome e posição) */
const LANDMARKS = [
  { n: 'Acampamento Bandido', x: LM.camp[0], z: LM.camp[1] }, { n: 'Moinho e trigal', x: LM.mill[0] + 4, z: LM.mill[1] }, { n: 'Lagoa', x: LM.pond[0], z: LM.pond[1] },
  { n: 'Árvore Anciã', x: LM.ancient[0], z: LM.ancient[1] }, { n: 'Cemitério', x: LM.grave[0] + 4, z: LM.grave[1] + 3 },
];

/* põe cada NPC das vilas principais na frente da sua casa */
{ const KIND_SLOT = { quest: 'quest', shop: 'shop', smith: 'smith', jewel: 'jewel', trainer: 'trainer', bank: 'bank', armor: 'armor', weapon: 'weapon', stable: 'stable' };
  for (const n of NPCS) {
    const v = n.vil ? VILLAGES.find(q => q.id === n.vil) : VILLAGES.find(q => q.reg === n.reg && isTown(q) && Math.abs(n.x - q.cx) < q.hs && Math.abs(n.z - q.cz) < q.hs);
    if (!v || !isTown(v)) continue;
    const key = n.id === 'roderic' ? 'guard' : n.id === 'selene' ? 'library' : KIND_SLOT[n.kind];
    const sl = townSlots(v).find(t => t[0] === key); if (!sl) continue;
    const [px, pz] = slotSpot(sl); n.x = v.cx + px; n.z = v.cz + pz;
  } }
