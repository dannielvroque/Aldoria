'use strict';
/* ===== Dados do jogo (100% originais) ===== */
/* escala do mundo: tudo além da vila (raio 15) fica WS vezes mais longe. SCR leva um raio "antigo" para o mundo novo; UNS faz o inverso */
/* WS 4.25 = mapa 2,5x maior que a versão 1.7. DENS: objetos espalhados (árvores, capim) — um pouco menos densos por m² que antes,
   o mundo é desenhado em blocos (world.js + engine.js) e só os blocos à vista vão para a GPU. MOB_K: quantos monstros a mais por zona */
const WS = 4.25, SCR = r => r <= 15 ? r : 15 + (r - 15) * WS, UNS = r => r <= 15 ? r : 15 + (r - 15) / WS, DENS = WS * WS * .8 * .6, MOB_K = 2.6;
const SCP = (x, z, cx, cz) => { cx = cx || 0; cz = cz || 0; const dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz) || 1, k = SCR(r) / r; return [cx + dx * k, cz + dz * k]; };
const MAXLV = 50;
const TIERS = ['Mortal', 'Imortal', 'Ancestral', 'Supremo'];
const TMUL = [1, 1.8, 3.2, 5.5]; // multiplicador de stats por tier (jogador, itens e monstros)
const EVO_COST = [20000, 80000, 250000];
const tmul = t => TMUL[Math.max(0, Math.min(TMUL.length - 1, t | 0))];
const xpNeed = l => Math.round(25 * Math.pow(l, 1.45));
/* ===== Níveis por fase (exibidos) × escala interna =====
   Todo o conteúdo (monstros, missões, itens, habilidades, portais) está na escala 1..MAXLV (50). O nível EXIBIDO do jogador vai até LVCAP[fase];
   effLv o mapeia para a escala interna (atributos e toda comparação com o conteúdo) e dispLv faz o caminho inverso (mostrar o nível do conteúdo
   na escala da fase). XP por nível = custo de hoje (xpNeed no nível efetivo), em mais níveis: a jornada fica proporcionalmente mais longa. */
const LVCAP = [299, 199, 149, 50];
const lvCap = t => LVCAP[Math.max(0, Math.min(LVCAP.length - 1, t | 0))];
const effLv = (lvl, tier) => { const c = lvCap(tier); return c <= 1 ? 1 : 1 + (lvl - 1) * (MAXLV - 1) / (c - 1); };
const dispLv = (L, tier) => { const c = lvCap(tier); return Math.max(1, Math.round(1 + (L - 1) * (c - 1) / (MAXLV - 1))); };
const lvForEff = (E, tier) => Math.max(1, Math.min(lvCap(tier), Math.round(1 + (E - 1) * (lvCap(tier) - 1) / (MAXLV - 1))));
const xpPlayer = (lvl, tier) => xpNeed(effLv(lvl, tier));
/* grau (0–5) do item por FASE e nível (valem armas, armaduras, luvas e acessórios; o material/nome vem da lista da classe pelo grau).
   GRADE_TABLE[fase] = [[nível exibido na escala da fase do item, grau a partir dele], ...]:
   Mortal 1–29 g0, 30–79 g1, 80–119 g2, 120–189 g3, 190–249 g4, 250+ g5 · Imortal 1–40 g1, 41–90 g2, 91–160 g3, 161–199 g4 (faixa 121–199 mistura 3 e 4)
   · Ancestral 1–99 g4, 100–149 g5 · Supremo 1–50 g5. lvlOfGrade devolve o menor nível interno (1..50) de um grau na fase. */
const GRADE_TABLE = [
  [[1, 0], [30, 1], [80, 2], [120, 3], [190, 4], [250, 5]],
  [[1, 1], [41, 2], [91, 3], [161, 4]],
  [[1, 4], [100, 5]],
  [[1, 5]],
];
const gradeTab = tier => GRADE_TABLE[Math.max(0, Math.min(GRADE_TABLE.length - 1, tier | 0))];
const gradeOfLvl = (lvl, tier) => { const t = gradeTab(tier), d = dispLv(lvl, tier | 0); let g = t[0][1]; for (const [from, gr] of t) if (d >= from) g = gr; return g; };
const gradeMin = tier => gradeTab(tier)[0][1];
const lvlOfGrade = (g, tier) => { for (let l = 1; l <= MAXLV; l++) if (gradeOfLvl(l, tier) >= g) return l; return MAXLV; };
const ptsAt = (k, lvl, tier) => Math.floor(k * (effLv(lvl, tier) - 1)); // pontos acumulados (k por nível efetivo): o total no teto é o mesmo de antes

/* kinds de habilidade: melee, proj, pierce, aoe_self, aoe_ground, dash, buff, shield, heal, mark, summon */
/* main: atributo que escala o ataque (str ou int). dodge: chance base de esquiva. aspd: velocidade de ataque básico */
const CLASSES = {
  vanguard: {
    name: 'Vanguarda', icon: '⚔️', role: 'Corpo a corpo · Tanque', main: 'str',
    desc: 'Guerreiro mortal, sem magia: golpes, escudo e fúria. A maior vida e defesa, mas o menor dano.',
    base: { hp: 122, mp: 45, atk: 10, def: 10, crit: .05, dodge: 0, aspd: 1, dr: .08 }, grow: { hp: 32, mp: 4, atk: 4.6, def: 2.6 }, // dr: redução de dano permanente (+3% por fase)
    res: { n: 'Fúria', c: 'fury' }, // recurso no lugar da mana (só rótulo e cor; regenera ao acertar)
    range: 2.6, weapon: 'Espada e escudo', col: [.85, .3, .25], atkType: 'melee',
    skills: [
      { n: 'Golpe Pesado', ic: '🗡️', mp: 6, cd: 3, k: 'melee', rng: 2.8, m: 4.2, d: 'Golpe brutal com 420% de dano.' },
      { n: 'Investida', ic: '🐂', mp: 10, cd: 7, k: 'dash', rng: 13, m: 2.4, stun: 1.4, d: 'Avança até o alvo, causa dano e atordoa.' },
      { n: 'Bloqueio com Escudo', ic: '🛡️', mp: 12, cd: 18, k: 'shield', dur: 8, sh: .35, refl: .5, d: 'Ergue o escudo: absorve dano igual a 35% da vida por 8 s e devolve 50% do que absorve ao agressor.' },
      { n: 'Grito de Guerra', ic: '📢', mp: 14, cd: 25, k: 'buff', dur: 15, atk: .2, def: .35, d: '+20% ataque e +35% defesa por 15 s.' },
      { n: 'Giro de Lâminas', ic: '🌀', mp: 18, cd: 8, k: 'aoe_self', r: 4.6, m: 3.6, d: 'Gira as armas e acerta todos ao redor (360%).' },
      { n: 'Golpe Executor', ic: '🪓', mp: 16, cd: 9, k: 'melee', rng: 2.8, m: 3.8, exec: .3, leech: .2, d: 'Golpe de 380% (dobra se o alvo tiver menos de 30% de vida) e devolve 20% em vida.' },
      { n: 'Fúria Berserker', ic: '😡', mp: 30, cd: 40, k: 'buff', dur: 14, atk: .5, def: .1, aspd: .35, leech: .1, tier: 1, d: '+50% ataque, +35% velocidade de ataque e roubo de vida por 14 s. (Imortal)' },
    ],
  },
  arcanist: {
    name: 'Arcanista', icon: '🔮', role: 'À distância · Magia elemental', main: 'int',
    desc: 'Mago de inteligência e mana: fogo, gelo, raio, barreira e meteoro. Muito dano, pouca vida.',
    base: { hp: 120, mp: 110, atk: 14, def: 3, crit: .06, dodge: 0, aspd: 1 }, grow: { hp: 28, mp: 13, atk: 3.6, def: 1.1 },
    range: 13, weapon: 'Cajado', col: [.35, .5, .95], atkType: 'proj',
    skills: [
      { n: 'Bola de Fogo', ic: '🔥', mp: 6, cd: 1.2, k: 'proj', rng: 14, m: 1.8, col: [1, .5, .15], d: 'Projétil de fogo rápido (180%).' },
      { n: 'Lança de Gelo', ic: '🧊', mp: 10, cd: 4, k: 'proj', rng: 14, m: 2.1, slow: .5, sdur: 3, col: [.6, .9, 1], d: 'Lança gélida (210%) que deixa o alvo 50% mais lento.' },
      { n: 'Corrente de Raios', ic: '⚡', mp: 16, cd: 6, k: 'proj', rng: 15, m: 2.2, multi: 3, col: [.75, .85, 1], d: 'Raio que salta para mais 3 inimigos próximos.' },
      { n: 'Barreira Arcana', ic: '🔰', mp: 25, cd: 25, k: 'shield', dur: 10, sh: .45, d: 'Barreira que absorve 45% da vida por 10 s.' },
      { n: 'Nova Glacial', ic: '❄️', mp: 24, cd: 10, k: 'aoe_self', r: 5.4, m: 2, slow: .55, sdur: 4, col: [.6, .9, 1], d: 'Explosão de gelo ao redor que congela (−55% de velocidade).' },
      { n: 'Tempestade de Fogo', ic: '🌋', mp: 30, cd: 12, k: 'aoe_ground', rng: 16, r: 4.8, m: 3, delay: .6, dot: 4, col: [1, .45, .1], d: 'Chamas caem sobre a área e queimam por 4 s.' },
      { n: 'Meteoro', ic: '☄️', mp: 60, cd: 28, k: 'aoe_ground', rng: 18, r: 7.5, m: 7, delay: 1.3, col: [1, .35, .1], tier: 1, d: 'Meteoro devastador em grande área (700%). (Imortal)' },
    ],
  },
  huntress: {
    name: 'Caçadora', icon: '🏹', role: 'À distância · Crítico e esquiva', main: 'dex',
    desc: 'Arqueira ágil: crítico alto, ataques rápidos e esquiva. Só usa arcos e bestas.',
    base: { hp: 100, mp: 75, atk: 11, def: 5, crit: .18, dodge: .12, aspd: 1.25 }, grow: { hp: 20, mp: 9, atk: 2.9, def: 1.5 },
    range: 14, weapon: 'Arco', col: [.35, .8, .4], atkType: 'proj',
    skills: [
      { n: 'Tiro Rápido', ic: '🎯', mp: 4, cd: 1, k: 'proj', rng: 15, m: 1.6, col: [1, .95, .6], d: 'Flecha rápida e precisa (160%).' },
      { n: 'Flecha Perfurante', ic: '➡️', mp: 10, cd: 5, k: 'pierce', rng: 17, m: 2.3, col: [.9, 1, .7], d: 'Flecha que atravessa todos na linha (230%).' },
      { n: 'Passo Ágil', ic: '💨', mp: 10, cd: 9, k: 'dash', free: 8, spd: .35, dodge: .35, sdur: 4, d: 'Salta para frente: +35% de velocidade e +35% de esquiva por 4 s.' },
      { n: 'Marca do Caçador', ic: '🔻', mp: 12, cd: 14, k: 'mark', rng: 16, dur: 10, v: .3, d: 'O alvo recebe +30% de dano por 10 s.' },
      { n: 'Chuva de Flechas', ic: '🌧️', mp: 24, cd: 14, k: 'aoe_ground', rng: 17, r: 6, m: 3.6, delay: .6, col: [1, .95, .6], d: 'Saraivada de flechas em área.' },
      { n: 'Olho de Águia', ic: '🦅', mp: 20, cd: 30, k: 'buff', dur: 15, crit: .2, aspd: .4, d: '+20% de crítico e +40% de velocidade de ataque por 15 s.' },
      { n: 'Disparo Crítico', ic: '💥', mp: 35, cd: 16, k: 'proj', rng: 22, m: 4.5, crit: 1, col: [1, .6, .3], tier: 1, d: 'Flecha certeira de 450% que sempre é crítica. (Imortal)' },
    ],
  },
  tamer: {
    name: 'Invocador', icon: '🐺', role: 'Invocações · Inteligência', main: 'int',
    desc: 'Usa inteligência e mana para invocar lobo, golem, espíritos e enxames, e fortalece suas criaturas.',
    base: { hp: 100, mp: 95, atk: 12, def: 5, crit: .06, dodge: 0, aspd: 1 }, grow: { hp: 20, mp: 11, atk: 3.1, def: 1.5 },
    range: 11, weapon: 'Cetro', col: [.7, .55, 1], atkType: 'proj',
    skills: [
      { n: 'Invocar Lobo', ic: '🐺', mp: 22, cd: 10, k: 'summon', pet: 'wolf', dur: 90, d: 'Chama um lobo ágil para lutar por você.' },
      { n: 'Raio Espiritual', ic: '✴️', mp: 7, cd: 2.5, k: 'proj', rng: 13, m: 2.6, col: [.7, .55, 1], focus: true, d: 'Raio de 260%; sua invocação foca o alvo.' },
      { n: 'Elo Vital', ic: '💜', mp: 20, cd: 14, k: 'heal', p: .3, pp: .5, d: 'Cura 30% da sua vida e 50% da vida da invocação.' },
      { n: 'Enxame', ic: '🐝', mp: 22, cd: 11, k: 'aoe_ground', rng: 14, r: 5, m: 3.4, delay: .3, dot: 4, col: [.9, .85, .2], d: 'Enxame de insetos que castiga a área por 4 s.' },
      { n: 'Invocar Golem', ic: '🗿', mp: 40, cd: 35, k: 'summon', pet: 'golem', dur: 60, d: 'Golem de pedra que provoca e protege você.' },
      { n: 'Invocar Espíritos', ic: '👻', mp: 30, cd: 20, k: 'summon', pet: 'spirit', dur: 40, d: 'Espírito veloz de dano alto, porém frágil.' },
      { n: 'Pacto Selvagem', ic: '🐾', mp: 35, cd: 35, k: 'buff', dur: 15, atk: .3, def: .2, pet: 1, tier: 1, d: '+30% ataque e +20% defesa para você; a invocação ganha +40% de dano por 15 s. (Imortal)' },
    ],
  },
};

/* ===== Continente (nov/2026): um só mundo contínuo, cercado de mar =====
   Biomas vizinhos: campos de Aldoria no centro, floresta em volta, ruínas ao sul/sudoeste, deserto a leste, neve ao norte, vulcão a oeste.
   LOBES: discos [x, z, raio] cuja união suave (+ ruído) é o contorno do continente; coastD(x, z) ≈ metros até a linha da costa (> 0 = terra).
   ZSEED: sementes das zonas [zona, x, z, peso] (Voronoi com peso e bordas distorcidas por ruído); zoneScore devolve a zona, a vizinha e a
   margem até a fronteira (a faixa de transição usa essa margem). Norte = z negativo. */
function hash2(x, z) { let h = (x * 374761393 + z * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const CK = .82; // escala do desenho do continente (as coordenadas abaixo estão em unidades de desenho; CK leva a metros)
const LOBES = [[0, 20, 340], [570, -30, 330], [-20, -600, 330], [-670, -40, 320], [120, 450, 210], [-330, 330, 190], [790, 260, 120], [-420, -470, 130], [380, -420, 110],
  // ampliação do mapa: sudeste (ruínas), leste (dunas), sudoeste (cinzas) e nordeste (tundra)
  [470, 470, 150], [960, -40, 110], [-650, 330, 140], [330, -780, 120]];
const SEA_Y = -.32, SHORE = 2.5; // nível do mar (o chão de terra é y = 0) e quanto o jogador pode chegar perto da água (m de costa)
/* Campo de Treinamento: ilha cercada no meio de um lago, a oeste de Aldoria. Coordenadas em metros. ri = raio da ilha, ro = raio externo do lago;
   uma ponte (faixa de terra) liga a ilha à margem, na direção ang (para o portão oeste de Aldoria). endLv = nível (escala interna) que equivale ao 29 do Mortal. */
const CAMP = { x: -140, z: 22, ri: 34, ro: 50, endLv: 5.6, ang: Math.atan2(-22, 91) };
CAMP.div = [CAMP.ri / 3, -CAMP.ri / 3]; // cercas que separam os 3 níveis (distância ao centro, rumo à ponte)
CAMP.atkK = .25; // multiplicador do ataque dos monstros do campo (iniciante morria em 2 golpes)
CAMP.lv = [1, 3, 5];
CAMP.hp = [30, 80, 130]; // vida dos monstros de cada nível do campo (mortal) // os 3 níveis do campo (escala interna): Mortal 1, 13 e 25
CAMP.ux = Math.cos(CAMP.ang); CAMP.uz = Math.sin(CAMP.ang);
CAMP.ex = CAMP.x + CAMP.ux * (CAMP.ro + 8); CAMP.ez = CAMP.z + CAMP.uz * (CAMP.ro + 8); // início da estrada, na margem
CAMP.sx = CAMP.x + CAMP.ux * 18; CAMP.sz = CAMP.z + CAMP.uz * 18; // ponto de chegada do personagem novo (perto do portão)
CAMP.gx = CAMP.x + CAMP.ux * (CAMP.ri - 2); CAMP.gz = CAMP.z + CAMP.uz * (CAMP.ri - 2); // portão da cerca, no começo da ponte
function campCoast(c, x, z) {
  const dx = x - CAMP.x, dz = z - CAMP.z, d = Math.hypot(dx, dz), K = 3;
  if (d > CAMP.ro + 130) return c;
  let v = d <= CAMP.ri ? Math.min(c, (CAMP.ri - d) * K) : d < CAMP.ro ? -Math.min(d - CAMP.ri, CAMP.ro - d) * K : Math.min(c, (d - CAMP.ro) * K);
  if (d > CAMP.ri - 8 && d < CAMP.ro + 8) { const al = dx * CAMP.ux + dz * CAMP.uz, lat = Math.abs(-dx * CAMP.uz + dz * CAMP.ux); if (al > 0 && lat < 8) v = Math.max(v, Math.min(c, 20 - lat * 6)); } // ponte
  return v;
}
function coastD(x, z) {
  const x0 = x, z0 = z; x /= CK; z /= CK; let s = 0; for (const L of LOBES) { const d = Math.hypot(x - L[0], z - L[1]); s += Math.exp((L[2] - d) / 40); }
  const n = vnoise(x / 300 + 11.3, z / 300 - 7.1) * .55 + vnoise(x / 115 - 3.7, z / 115 + 5.2) * .3 + vnoise(x / 38 + 1.9, z / 38 + 8.4) * .15;
  return campCoast((40 * Math.log(Math.max(s, 1e-30)) + (n - .5) * 2 * 75) * CK, x0, z0);
}
const isLand = (x, z, m) => coastD(x, z) > (m || 0);
const REGIONS = [
  { id: 'aldoria', n: 'Reino de Aldoria', cx: 0, cz: 0, clim: 'rain' },
  { id: 'desert', n: 'Deserto de Kharim', cx: 560 * CK, cz: -30 * CK, clim: 'none' },
  { id: 'snow', n: 'Picos Gélidos', cx: -30 * CK, cz: -590 * CK, clim: 'snow' },
  { id: 'volcano', n: 'Cratera de Ignar', cx: -650 * CK, cz: -50 * CK, clim: 'ash' },
];
const REG = {}; for (const g of REGIONS) REG[g.id] = g;
/* lv: faixa de nível dos monstros; dentro da zona o nível cresce com a distância até Aldoria (ZD = distâncias mín./máx. da zona) */
const ZONES = [
  { id: 'town', name: 'Vila de Aldoria', reg: 'aldoria', fog: [.62, .74, .88] },
  { id: 'camp', name: 'Campo de Treinamento', reg: 'aldoria', fog: [.62, .8, .9], lv: [1, 5] },
  { id: 'field', name: 'Campos Verdejantes', reg: 'aldoria', fog: [.62, .78, .9], lv: [6, 12] },
  { id: 'forest', name: 'Floresta Sussurrante', reg: 'aldoria', fog: [.32, .45, .45], lv: [13, 30] },
  { id: 'ruins', name: 'Ruínas Esquecidas', reg: 'aldoria', fog: [.36, .3, .45], lv: [31, 50] },
  { id: 'oasis', name: 'Oásis de Sahr', reg: 'desert', fog: [.88, .78, .58] },
  { id: 'dunes', name: 'Dunas de Kharim', reg: 'desert', fog: [.86, .74, .52], lv: [26, 40] },
  { id: 'frostv', name: 'Vila de Hielmar', reg: 'snow', fog: [.74, .82, .92] },
  { id: 'tundra', name: 'Tundra dos Picos Gélidos', reg: 'snow', fog: [.7, .8, .92], lv: [37, 50] },
  { id: 'forge', name: 'Forja de Cinzas', reg: 'volcano', fog: [.4, .2, .14] },
  { id: 'pedraluz', name: 'Vila de Pedraluz', reg: 'aldoria', fog: [.5, .52, .6] },
  { id: 'zahar', name: 'Oásis de Zahar', reg: 'desert', fog: [.88, .78, .58] },
  { id: 'cinzeiro', name: 'Forte Cinzeiro', reg: 'volcano', fog: [.4, .2, .14] },
  { id: 'frostmar', name: 'Porto Gélido de Frostmar', reg: 'snow', fog: [.74, .82, .92] },
  { id: 'ashlands', name: 'Terras Cinzentas', reg: 'volcano', fog: [.3, .14, .1], lv: [48, 60] },
];
const ZN = {}; for (const z of ZONES) ZN[z.id] = z;
for (const g of REGIONS) g.zones = ZONES.filter(z => z.reg === g.id);
const ZSEED = [['field', 0, 0, 150], ['dunes', 570, -30, 330], ['dunes', 790, 260, 150], ['dunes', 380, -420, 120], ['tundra', -20, -600, 330], ['tundra', -420, -470, 150],
  ['ashlands', -690, -50, 310], ['ruins', 120, 470, 200], ['ruins', -340, 340, 175], ['ruins', -420, 110, 120]];
ZSEED.push(['field', CAMP.x / CK, CAMP.z / CK, 120]); // o campo de treino e o caminho até Aldoria ficam cercados por campos, não por floresta
ZSEED.push(['ruins', 470, 470, 150], ['dunes', 960, -40, 120], ['ashlands', -650, 330, 140], ['tundra', 330, -780, 120]); // terras novas herdam o bioma vizinho
for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2; ZSEED.push(['forest', Math.cos(a) * 225, Math.sin(a) * 225, 92]); }
const ZS_OUT = { a: null, b: null, t: 0 }, ZS_TMP = {};
function zoneScore(x, z) {
  if (Math.hypot(x - CAMP.x, z - CAMP.z) < CAMP.ro - 1) { ZS_OUT.a = 'camp'; ZS_OUT.b = 'field'; ZS_OUT.t = 999; return ZS_OUT; }
  x /= CK; z /= CK; const wx = x + (vnoise(x / 95 + 3.1, z / 95 - 1.7) - .5) * 80, wz = z + (vnoise(x / 95 - 6.3, z / 95 + 9.2) - .5) * 80;
  for (const k in ZS_TMP) ZS_TMP[k] = -1e9;
  for (const q of ZSEED) { const s = q[3] - Math.hypot(wx - q[1], wz - q[2]); if (!(s <= ZS_TMP[q[0]])) ZS_TMP[q[0]] = s; }
  let a = null, sa = -1e9, b = null, sb = -1e9;
  for (const k in ZS_TMP) { const s = ZS_TMP[k]; if (s > sa) { b = a; sb = sa; a = k; sa = s; } else if (s > sb) { b = k; sb = s; } }
  ZS_OUT.a = a; ZS_OUT.b = b; ZS_OUT.t = (sa - sb) / 2 * CK; return ZS_OUT;
}
/* ===== Vilas =====
   Cada vila principal tem planta própria (TOWN_DEF): meia-largura da muralha (hs), largura do portão, casas (slots), chão (pave),
   portal e ponto de chegada. Todas têm muralha quadrada com 4 portões nos eixos (a rota A* do game.js usa isso).
   slot: [função, x, z, rotação (frente da casa = direção (sin r, cos r)), largura, profundidade] */
const TOWN_DEF = (() => {
  const PI = Math.PI, face = (x, z) => Math.atan2(-x, -z), D = {};
  { /* Aldoria, a capital: praça grande, avenidas largas, dois anéis de quarteirões, jardins nos cantos */
    const S = [], I = 23.3, O = 36.8, w = 7.4, d = 5.6;
    S.push(['quest', -10.5, -I, 0, w, d], ['guard', 10.5, -I, 0, w, d], ['smith', I, -10.5, -PI / 2, w, d], ['bank', I, 10.5, -PI / 2, w, d],
      ['home', 10.5, I, PI, w, d], ['library', -10.5, I, PI, w, d], ['shop', -I, 10.5, PI / 2, w, d], ['trainer', -I, -10.5, PI / 2, w, d]);
    S.push(['armor', -9.5, -O, 0, w, d], ['weapon', 9.5, -O, 0, w, d], ['home', -24, -O, 0, w, d], ['home', 24, -O, 0, w, d],
      ['jewel', O, -9.5, -PI / 2, w, d], ['stable', O, -24, -PI / 2, 6.4, 4.6], ['home', O, 9.5, -PI / 2, w, d], ['home', O, 24, -PI / 2, w, d],
      ['home', 9.5, O, PI, w, d], ['home', -9.5, O, PI, w, d], ['home', 24, O, PI, w, d], ['home', -24, O, PI, w, d],
      ['home', -O, 9.5, PI / 2, w, d], ['home', -O, -9.5, PI / 2, w, d], ['home', -O, 24, PI / 2, w, d], ['home', -O, -24, PI / 2, w, d]);
    D.aldoria = { hs: 46, gate: 3.6, ave: 3.6, slots: S, portal: [0, -9], arrive: [-3, -6.5],
      pave(lx, lz) { const ax = Math.abs(lx), az = Math.abs(lz), m = Math.max(ax, az), n = Math.min(ax, az);
        if (ax < 14 && az < 14) return 1; if (n < 3.6 || m < 17.5 || (m >= 28 && m < 32) || m >= 42.5) return 0;
        if (n >= 17.5 && m < 28) return 3; if (n >= 32) return 3; if (m >= 32 && n > 13.6 && n < 19.9) return 3; return 2; } };
  }
  { /* Oásis de Sahr: casas de adobe em anel em volta da lagoa, praça circular de mercado, palmeiras */
    const S = [], kinds = ['jewel', 'shop', 'armor', 'weapon', 'bank', 'quest', 'trainer', 'smith'];
    kinds.forEach((k, i) => { const a = (22.5 + 45 * i) * PI / 180, x = Math.cos(a) * 21, z = Math.sin(a) * 21; S.push([k, x, z, face(x, z), 7, 5.6]); });
    [[45, 'home'], [135, 'home'], [225, 'home'], [315, 'stable']].forEach(([g, k]) => { const a = g * PI / 180, x = Math.cos(a) * 35.5, z = Math.sin(a) * 35.5; S.push([k, x, z, face(x, z), k === 'stable' ? 6.4 : 7, k === 'stable' ? 4.6 : 5.6]); });
    D.desert = { hs: 34, gate: 3.2, ave: 3.6, slots: S, portal: [0, -12.8], arrive: [3.2, -10.6],
      pave(lx, lz) { const ax = Math.abs(lx), az = Math.abs(lz), m = Math.max(ax, az), r = Math.hypot(lx, lz);
        if (r < 7.9) return 4; if (r < 10.5) return 3; if (r < 15.5) return 1; if (Math.min(ax, az) < 3.6 || m >= 31) return 0; return 2; } };
  }
  { /* Hielmar: casas compridas nórdicas de telhado nevado, fogueiras, pinheiros e paliçada de troncos */
    const S = [], w = 9, d = 5.2, Q = { '-1,-1': ['quest', 'trainer', 'home'], '1,-1': ['smith', 'jewel', 'bank'], '1,1': ['armor', 'stable', 'home'], '-1,1': ['weapon', 'shop', 'home'] };
    for (const key in Q) { const [sx, sz] = key.split(',').map(Number), [ka, kb, kc] = Q[key];
      S.push([ka, sx * 9.6, sz * 19, sx > 0 ? -PI / 2 : PI / 2, w, d]);
      S.push([kb, sx * 19, sz * 9.6, sz > 0 ? PI : 0, kb === 'stable' ? 6.4 : w, kb === 'stable' ? 4.6 : d]);
      S.push([kc, sx * 22.5, sz * 22.5, face(sx, sz), 8, d]); }
    D.snow = { hs: 32, gate: 3.2, ave: 3.6, slots: S, portal: [0, -7], arrive: [2.8, -4.4],
      pave(lx, lz) { const ax = Math.abs(lx), az = Math.abs(lz), m = Math.max(ax, az), r = Math.hypot(lx, lz);
        if (r < 10) return 1; if (Math.min(ax, az) < 3.6 || m >= 29) return 0; if (Math.min(ax, az) > 14 && m < 17 ) return 3; return 2; } };
  }
  { /* Forja de Cinzas: casas de pedra escura ladeando as avenidas, caldeira de lava no centro */
    const S = [], w = 5.8, d = 5.6, F = 11.3, A = 18.6, B = 27;
    S.push(['quest', -F, -A, PI / 2, w, d], ['smith', F, -A, -PI / 2, w, d], ['trainer', -F, -B, PI / 2, w, d], ['bank', F, -B, -PI / 2, w, d],
      ['jewel', A, -F, 0, w, d], ['home', B, -F, 0, w, d], ['stable', A, F, PI, 6.4, 4.6],
      ['armor', F, A, -PI / 2, w, d], ['weapon', -F, A, PI / 2, w, d], ['home', F, B, -PI / 2, w, d], ['home', -F, B, PI / 2, w, d],
      ['shop', -A, F, PI, w, d], ['home', -B, F, PI, w, d], ['home', -A, -F, 0, w, d], ['home', -B, -F, 0, w, d]);
    D.volcano = { hs: 34, gate: 3.8, ave: 4.5, slots: S, portal: [0, -8.6], arrive: [3.3, -6.4],
      pave(lx, lz) { const ax = Math.abs(lx), az = Math.abs(lz), m = Math.max(ax, az), r = Math.hypot(lx, lz);
        if (r < 5.4) return 4; if (r < 11) return 1; if (Math.min(ax, az) < 4.5 || m >= 31) return 0; if (Math.min(ax, az) > 14 && m > 21) return 3; return 2; } };
  }
  { /* Pedraluz: vila de pedra em anéis — praça redonda com obelisco, rua circular, anel interno de serviços e anel externo de casas */
    const S = [], w = 7.2, d = 5.6, K = ['quest', 'smith', 'bank', 'shop', 'trainer', 'armor', 'weapon', 'jewel'];
    K.forEach((k, i) => { const a = (22.5 + 45 * i) * PI / 180, x = Math.cos(a) * 20, z = Math.sin(a) * 20; S.push([k, x, z, face(x, z), w, d]); });
    for (let i = 0; i < 12; i++) { const a = (15 + 30 * i) * PI / 180, x = Math.cos(a) * 31.5, z = Math.sin(a) * 31.5, st = i === 5; S.push([st ? 'stable' : 'home', x, z, face(x, z), st ? 6.4 : w, st ? 4.6 : d]); }
    D.pedraluz = { hs: 40, gate: 3.4, ave: 3.6, slots: S, portal: [0, -8], arrive: [3, -6.2],
      pave(lx, lz) { const ax = Math.abs(lx), az = Math.abs(lz), m = Math.max(ax, az), n = Math.min(ax, az), r = Math.hypot(lx, lz);
        if (r < 11) return 1; if (n < 3.6 || m >= 37 || (r >= 13.4 && r < 16.2)) return 0; return r < 35.5 ? 2 : 3; } };
  }
  { /* Zahar: bazar — boulevard leste-oeste de mercado com casas dos dois lados, cisterna no cruzamento e pátios nos fundos */
    const S = [], w = 7, d = 5.6;
    [['quest', -26], ['jewel', -17.5], ['shop', -9], ['trainer', 9], ['smith', 17.5], ['bank', 26]].forEach(([k, x]) => S.push([k, x, -8.8, 0, w, d]));
    [['weapon', -26], ['armor', -17.5], ['home', -9], ['stable', 9], ['home', 17.5], ['home', 26]].forEach(([k, x]) => { const st = k === 'stable'; S.push([k, x, 8.8, PI, st ? 6.4 : w, st ? 4.6 : d]); });
    for (const [x, z] of [[-15, -23.5], [15, -23.5], [-15, 23.5], [15, 23.5]]) S.push(['home', x, z, z < 0 ? 0 : PI, w, d]);
    D.zahar = { hs: 36, gate: 3.2, ave: 3.6, slots: S, portal: [0, -14], arrive: [3, -12],
      pave(lx, lz) { const ax = Math.abs(lx), az = Math.abs(lz), m = Math.max(ax, az);
        if (ax < 8 && az < 8) return 1; if (az < 5.2 || ax < 3.6 || m >= 33) return 0; return az < 15 ? 2 : 3; } };
  }
  { /* Forte Cinzeiro: cidadela — fortaleza central, pátio de armas em volta, quartéis em duas colunas e avenidas em cruz */
    const S = [], w = 5.8, d = 5.6;
    [['quest', -27], ['trainer', -19], ['armor', -11], ['weapon', 11], ['jewel', 19], ['home', 27]].forEach(([k, z]) => S.push([k, -22, z, PI / 2, w, d]));
    [['smith', -27], ['bank', -19], ['home', -11], ['stable', 11], ['shop', 19], ['home', 27]].forEach(([k, z]) => { const st = k === 'stable'; S.push([k, 22, z, -PI / 2, st ? 6.4 : w, st ? 4.6 : d]); });
    D.cinzeiro = { hs: 38, gate: 3.8, ave: 4.5, slots: S, portal: [0, -15.5], arrive: [3.4, -13.2],
      pave(lx, lz) { const ax = Math.abs(lx), az = Math.abs(lz), m = Math.max(ax, az), n = Math.min(ax, az);
        if (ax < 10.5 && az < 10.5) return 1; if (n < 4.5 || m >= 35) return 0; return ax >= 16 && ax < 28.5 && az >= 7 ? 2 : 3; } };
  }
  { /* Frostmar: casas em ferradura em volta de um lago congelado (praça de gelo), cais de barco encalhado e fogueiras */
    const S = [], w = 8.4, d = 5.2, K = ['quest', 'trainer', 'smith', 'jewel', 'bank', 'armor', 'stable', 'weapon', 'shop', 'home', 'home', 'home'];
    K.forEach((k, i) => { const a = (15 + 30 * i) * PI / 180, x = Math.cos(a) * 22, z = Math.sin(a) * 22, st = k === 'stable'; S.push([k, x, z, face(x, z), st ? 6.4 : w, st ? 4.6 : d]); });
    D.frostmar = { hs: 36, gate: 3.2, ave: 3.6, slots: S, portal: [0, -14.8], arrive: [3, -13],
      pave(lx, lz) { const ax = Math.abs(lx), az = Math.abs(lz), m = Math.max(ax, az), n = Math.min(ax, az), r = Math.hypot(lx, lz);
        if (r < 12) return 4; if (r < 15.8) return 1; if (n < 3.6 || m >= 33) return 0; return r < 27 ? 2 : 3; } };
  }
  return D;
})();
/* vilas / postos: zonas seguras com portal. portal e arrive são deslocamentos a partir do centro */
const VILLAGES = [];
{ const V = (id, n, reg, cx, cz, r, theme, lvl, price, pd, ad) => { const L = TOWN_DEF[id] || null; if (L) { pd = L.portal; ad = L.arrive; r = L.hs; }
    VILLAGES.push({ id, n, reg, cx, cz, r, theme, lvl, price, L, hs: L ? L.hs : 0, portal: [cx + pd[0], cz + pd[1]], arrive: [cx + ad[0], cz + ad[1]] }); };
  V('aldoria', 'Vila de Aldoria', 'aldoria', 0, 0, 0, 'town', 1, 0);
  V('post', 'Posto de Brumavale', 'aldoria', -150 * CK, 150 * CK, 9, 'camp', 12, 60, [0, -6.2], [0, -3.6]);
  V('ruinpost', 'Posto das Ruínas', 'aldoria', 70 * CK, 390 * CK, 9, 'camp', 30, 200, [0, -6.2], [0, -3.6]);
  V('desert', 'Oásis de Sahr', 'desert', REG.desert.cx, REG.desert.cz, 0, 'desert', 25, 400);
  V('dpost', 'Acampamento das Dunas', 'desert', 760 * CK, 250 * CK, 9, 'camp', 30, 500, [0, -6.2], [0, -3.6]);
  V('snow', 'Vila de Hielmar', 'snow', REG.snow.cx, REG.snow.cz, 0, 'snow', 35, 900);
  V('spost', 'Refúgio da Nevasca', 'snow', -400 * CK, -470 * CK, 9, 'camp', 40, 1000, [0, -6.2], [0, -3.6]);
  V('volcano', 'Forja de Cinzas', 'volcano', REG.volcano.cx, REG.volcano.cz, 0, 'volcano', 45, 2000);
  V('vpost', 'Bastião de Brasa', 'volcano', -545 * CK, 175 * CK, 9, 'camp', 50, 2200, [0, -6.2], [0, -3.6]);
  // ampliação do mapa: 4 cidades e 4 postos nas terras novas (coordenadas em metros)
  V('pedraluz', 'Vila de Pedraluz', 'aldoria', 375, 395, 0, 'town', 34, 1400);
  V('zahar', 'Oásis de Zahar', 'desert', 800, -23, 0, 'desert', 36, 1700);
  V('cinzeiro', 'Forte Cinzeiro', 'volcano', -533, 220, 0, 'volcano', 50, 3200);
  V('frostmar', 'Porto Gélido de Frostmar', 'snow', 250, -650, 0, 'snow', 42, 2000);
  V('p_se', 'Atalaia dos Mortos', 'aldoria', 330, 340, 9, 'camp', 32, 500, [0, -6.2], [0, -3.6]);
  V('p_e', 'Poço de Kharim', 'desert', 590, 10, 9, 'camp', 28, 300, [0, -6.2], [0, -3.6]);
  V('p_ne', 'Cabana do Corvo-Branco', 'snow', 140, -560, 9, 'camp', 38, 900, [0, -6.2], [0, -3.6]);
  V('p_sw', 'Barraca do Cinzeiro Velho', 'volcano', -460, 50, 9, 'camp', 48, 1800, [0, -6.2], [0, -3.6]); }
/* portais: cada um só leva às vilas/postos vizinhos (atalho de caminho, não teleporte para o mapa todo) */
const PORTAL_LINKS = { aldoria: ['post', 'ruinpost', 'desert', 'snow'], post: ['aldoria', 'ruinpost', 'volcano'], ruinpost: ['aldoria', 'post', 'dpost'],
  desert: ['aldoria', 'dpost', 'snow'], dpost: ['desert', 'ruinpost'], snow: ['aldoria', 'desert', 'spost'], spost: ['snow', 'volcano'],
  volcano: ['post', 'spost', 'vpost'], vpost: ['volcano', 'post'] };
// terras novas: cada cidade nova se liga ao seu posto e ao vizinho antigo (sempre nos dois sentidos)
Object.assign(PORTAL_LINKS, { pedraluz: ['p_se', 'ruinpost'], p_se: ['ruinpost', 'pedraluz'], zahar: ['p_e', 'dpost'], p_e: ['desert', 'zahar'], frostmar: ['p_ne', 'spost'], p_ne: ['snow', 'frostmar'], cinzeiro: ['p_sw', 'vpost'], p_sw: ['volcano', 'cinzeiro'] });
PORTAL_LINKS.ruinpost.push('p_se', 'pedraluz'); PORTAL_LINKS.desert.push('p_e'); PORTAL_LINKS.dpost.push('zahar'); PORTAL_LINKS.snow.push('p_ne'); PORTAL_LINKS.spost.push('frostmar'); PORTAL_LINKS.volcano.push('p_sw'); PORTAL_LINKS.vpost.push('cinzeiro'); PORTAL_LINKS.post.push('vpost'); // volta que faltava (Bastião de Brasa já levava ao Posto de Brumavale)
for (const v of VILLAGES) { v.zone = { aldoria: 'town', desert: 'oasis', snow: 'frostv', volcano: 'forge', pedraluz: 'pedraluz', zahar: 'zahar', cinzeiro: 'cinzeiro', frostmar: 'frostmar' }[v.id] || null; v.links = PORTAL_LINKS[v.id] || []; }
/* TOWN_HS: a maior meia-largura (o game.js usa para a grade de rotas e para os pontos dos portões); cada vila tem a sua em v.hs */
const isTown = v => v.theme !== 'camp', TOWN_HS = Math.max(...VILLAGES.filter(isTown).map(v => v.hs));
const SAFES = VILLAGES.map(v => ({ x: v.cx, z: v.cz, r: v.r, sq: isTown(v) ? v.hs - .6 : 0 }));
SAFES.push({ x: CAMP.sx, z: CAMP.sz, r: 7, sq: 0 }); // clareira do instrutor, no campo de treino
function inTownSq(x, z, m) { for (const v of VILLAGES) if (isTown(v) && Math.abs(x - v.cx) < v.hs + (m || 0) && Math.abs(z - v.cz) < v.hs + (m || 0)) return v; return null; }
/* tipo de chão dentro da vila (coordenadas locais): 0 rua, 1 praça, 2 lote de casa, 3 jardim, 4 especial (lagoa/caldeira) */
function townPave(lx, lz, v) { return ((v || VILLAGES[0]).L || TOWN_DEF.aldoria).pave(lx, lz); }
const townSlots = v => ((v || VILLAGES[0]).L || TOWN_DEF.aldoria).slots;
const TOWN_SLOTS = TOWN_DEF.aldoria.slots;
/* onde o NPC de cada casa fica: na rua, na frente da porta */
function slotSpot(s) { const [, x, z, r, , dd] = s, f = dd / 2 + 1.5; return [x + Math.sin(r) * f, z + Math.cos(r) * f]; }

const MOBS = {
  camp: [{ id: 'gremlin', n: 'Gremlin' }, { id: 'lizard', n: 'Minilagarto' }],
  field: [{ id: 'slime', n: 'Gosma' }, { id: 'boar', n: 'Javali' }, { id: 'wolfm', n: 'Lobo Cinzento' }, { id: 'rat', n: 'Rato Gigante' }, { id: 'bandit', n: 'Bandido' }, { id: 'fox', n: 'Raposa Ruiva' }],
  forest: [{ id: 'spider', n: 'Aranha Tecelã' }, { id: 'goblin', n: 'Goblin Saqueador' }, { id: 'ent', n: 'Ent Jovem' }, { id: 'orc', n: 'Orc Selvagem' }, { id: 'bear', n: 'Urso Pardo' }],
  ruins: [{ id: 'skel', n: 'Esqueleto Guerreiro' }, { id: 'golemm', n: 'Golem de Pedra' }, { id: 'wraith', n: 'Espectro' }, { id: 'necro', n: 'Necromante' }, { id: 'banshee', n: 'Banshee' }, { id: 'gargoyle', n: 'Gárgula de Pedra' }],
  dunes: [{ id: 'scorpion', n: 'Escorpião das Dunas' }, { id: 'jackal', n: 'Chacal do Deserto' }, { id: 'mummy', n: 'Múmia Ressecada' }, { id: 'sandgolem', n: 'Golem de Arenito' }, { id: 'cobra', n: 'Naja do Deserto' }],
  tundra: [{ id: 'yeti', n: 'Yeti Selvagem' }, { id: 'frostwolf', n: 'Lobo Glacial' }, { id: 'frostwraith', n: 'Espectro Gélido' }, { id: 'icegolem', n: 'Golem de Gelo' }, { id: 'waterelem', n: 'Elemental de Água' }, { id: 'polarbear', n: 'Urso Polar' }],
  ashlands: [{ id: 'lavaslime', n: 'Gosma de Lava' }, { id: 'imp', n: 'Diabrete Cinzento' }, { id: 'hellhound', n: 'Cão Infernal' }, { id: 'magmagolem', n: 'Golem de Magma' }, { id: 'fireelem', n: 'Elemental de Fogo' }, { id: 'salamander', n: 'Salamandra de Brasa' }],
};
/* elites: ~10% dos monstros da zona, com mais vida, ouro e visual dourado */
/* monstros novos que reaproveitam o modelo de outro (cor e tamanho próprios) */
const MOB_ALIAS = { boarelite: 'boar', shadowwolf: 'wolfm', ancientent: 'ent', banditking: 'bandit', pharaoh: 'mummy', frostwyrm: 'hydra', polarbear: 'bear' };
const ELITES = {
  field: [{ id: 'boarelite', n: 'Javali Couraçado' }, { id: 'shadowwolf', n: 'Lobo Sombrio' }],
  forest: [{ id: 'alphawolf', n: 'Lobo Alfa' }, { id: 'queenspider', n: 'Rainha Aranha' }, { id: 'ancientent', n: 'Ent Ancião' }],
  ruins: [{ id: 'minotaur', n: 'Minotauro' }, { id: 'orcwar', n: 'Orc Senhor da Guerra' }],
  dunes: [{ id: 'hydra', n: 'Hidra do Deserto' }],
  tundra: [{ id: 'alphawolf', n: 'Lobo Alfa Glacial' }, { id: 'polarbear', n: 'Urso Polar Alfa' }],
  ashlands: [{ id: 'phoenix', n: 'Fênix' }, { id: 'salamander', n: 'Salamandra de Magma' }],
};
const BOSSES = {
  banditking: { id: 'banditking', n: 'Rei dos Bandidos', lvl: 10, hpm: 7, atkm: 1.4, zone: 'field', sc: 1.7, xpm: 10, ang: 300, r: 39 },
  pharaoh: { id: 'pharaoh', n: 'Faraó Desperto', lvl: 38, hpm: 11, atkm: 1.6, zone: 'dunes', sc: 2.1, xpm: 13, ang: 46, r: 64, reg: 'desert' },
  frostwyrm: { id: 'frostwyrm', n: 'Serpe Glacial', lvl: 47, hpm: 12, atkm: 1.7, zone: 'tundra', sc: 1.9, xpm: 14, ang: 150, r: 62, reg: 'snow' },
  guardian: { id: 'guardian', n: 'Guardião do Bosque', lvl: 20, hpm: 9, atkm: 1.5, zone: 'forest', sc: 2.6, xpm: 12, ang: 40, r: 56 },
  colossus: { id: 'colossus', n: 'Rei Colosso', lvl: 40, hpm: 12, atkm: 1.6, zone: 'ruins', sc: 3.2, xpm: 14, ang: 200, r: 74 },
  scorpqueen: { id: 'scorpqueen', n: 'Rainha Escorpiã', lvl: 42, hpm: 12, atkm: 1.6, zone: 'dunes', sc: 2.9, xpm: 14, ang: 215, r: 58, reg: 'desert' },
  yetiking: { id: 'yetiking', n: 'Rei Yeti', lvl: 50, hpm: 13, atkm: 1.7, zone: 'tundra', sc: 3.0, xpm: 14, ang: 330, r: 58, reg: 'snow' },
  ignar: { id: 'ignar', n: 'Ignar, o Dragão Ancião', lvl: 58, hpm: 14, atkm: 1.8, zone: 'ashlands', sc: 2.3, xpm: 16, ang: 40, r: 58, reg: 'volcano' },
  lich: { id: 'lich', n: 'Lorde Lich', lvl: 46, hpm: 12, atkm: 1.6, zone: 'ruins', sc: 1.9, xpm: 14, ang: 320, r: 71 },
  demon: { id: 'demon', n: 'Senhor Demônio', lvl: 54, hpm: 13, atkm: 1.8, zone: 'ashlands', sc: 2.2, xpm: 15, ang: 210, r: 60, reg: 'volcano' },
};
/* curva de dificuldade: o equipamento e os atributos do jogador crescem de forma multiplicativa,
   então ataque e vida dos monstros também crescem mais rápido depois do nível ~16 (antes, tudo ficava fácil após o 20) */
/* posição de cada chefe no continente (espalhados, longe dos portais) */
const BOSS_POS = { banditking: [62, -112], guardian: [-215, -175], colossus: [-395, 405], lich: [215, 565], pharaoh: [470, -255], scorpqueen: [795, -45],
  frostwyrm: [-300, -650], yetiking: [110, -790], ignar: [-830, -120], demon: [-590, -235] };
for (const k in BOSS_POS) BOSS_POS[k] = [BOSS_POS[k][0] * CK, BOSS_POS[k][1] * CK];
/* chefes perigosos: quem tem o mesmo nível precisa de poções */
for (const k in BOSSES) { BOSSES[k].hpm *= 3.5; BOSSES[k].atkm *= 1.5; }
/* marcos do mundo (já na escala nova) */
const MOB_HPK = 6, ELITE_HPK = 2, BOSS_HPK = 3; // fatores de vida (ver mobStats)
const ELITE_M = { hpm: 8, atkm: 2.4, xpm: 6, hpk: ELITE_HPK };
for (const k in BOSSES) BOSSES[k].hpk = BOSS_HPK;
const LM = { camp: [17, -97], mill: [-73, -62], ancient: [-175, -67], grave: [190, 500], pyramid: [665, 125], pond: [-75, 53],
  crypt: [-380, 360], icecave: [95, -745], caldera: [-790, -95], lichtower: [-440, 90],
  mina: [146, -85], santuario: [-134, -232], templo: [634, -268], observatorio: [-305, -549], forja: [-951, -73], fonte: [256, 427] }; // últimos 6: locais secretos (poi)
/* locais do mapa usados pelas missões: masmorras/salas (explore) e covis de elite (3 elites fixos, além dos ~11% espalhados) */
const SITES = [
  { id: 'camp', n: 'Acampamento Bandido', k: 'dungeon', x: LM.camp[0], z: LM.camp[1] },
  { id: 'crypt', n: 'Cripta do Rei Caído', k: 'dungeon', x: LM.crypt[0], z: LM.crypt[1] },
  { id: 'pyramid', n: 'Pirâmide Soterrada', k: 'dungeon', x: LM.pyramid[0], z: LM.pyramid[1] },
  { id: 'icecave', n: 'Caverna Glacial', k: 'dungeon', x: LM.icecave[0], z: LM.icecave[1] },
  { id: 'caldera', n: 'Caldeira de Ignar', k: 'dungeon', x: LM.caldera[0], z: LM.caldera[1] },
  { id: 'lichtower', n: 'Torre Partida', k: 'dungeon', x: LM.lichtower[0], z: LM.lichtower[1] },
  // locais secretos: aparecem no mapa, dão XP e ouro na primeira visita e contam para a conquista Descobridor (G.rec.disc)
  { id: 'mina', n: 'Mina Abandonada', k: 'dungeon', poi: 1, x: LM.mina[0], z: LM.mina[1] },
  { id: 'santuario', n: 'Santuário Élfico', k: 'dungeon', poi: 1, x: LM.santuario[0], z: LM.santuario[1] },
  { id: 'templo', n: 'Templo do Sol', k: 'dungeon', poi: 1, x: LM.templo[0], z: LM.templo[1] },
  { id: 'observatorio', n: 'Observatório Gélido', k: 'dungeon', poi: 1, x: LM.observatorio[0], z: LM.observatorio[1] },
  { id: 'forja', n: 'Forja Esquecida', k: 'dungeon', poi: 1, x: LM.forja[0], z: LM.forja[1] },
  { id: 'fonte', n: 'Fonte dos Esquecidos', k: 'dungeon', poi: 1, x: LM.fonte[0], z: LM.fonte[1] },
  { id: 'l_field', n: 'Toca dos Javalis', k: 'lair', zone: 'field', x: 105, z: 55 },
  { id: 'l_forest', n: 'Ninho da Rainha Aranha', k: 'lair', zone: 'forest', x: 195, z: 175 },
  { id: 'l_ruins', n: 'Arena dos Campeões', k: 'lair', zone: 'ruins', x: -15, z: 470 },
  { id: 'l_dunes', n: 'Covil da Hidra', k: 'lair', zone: 'dunes', x: 700, z: 175 },
  { id: 'l_tundra', n: 'Antro Glacial', k: 'lair', zone: 'tundra', x: 220, z: -600 },
  { id: 'l_ashlands', n: 'Ninho da Fênix', k: 'lair', zone: 'ashlands', x: -720, z: 140 },
];
for (const k in LM) LM[k] = [LM[k][0] * CK, LM[k][1] * CK];
for (const q of SITES) { if (q.k === 'lair') { q.x *= CK; q.z *= CK; } else { q.x = LM[q.id][0]; q.z = LM[q.id][1]; } }
const SITE = {}; for (const q of SITES) SITE[q.id] = q;
/* estradas entre as vilas: linhas com curvas suaves, sempre em terra. roadDist(x, z) usa uma grade de 16 m para achar o trecho mais perto */
const ROADS = (() => {
  const V = id => VILLAGES.find(v => v.id === id), out = [];
  const gate = (v, dx, dz) => { const h = isTown(v) ? v.hs + 3 : 10; return [v.cx + dx * h, v.cz + dz * h]; };
  const link = (a, b, wig, ph) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(L / 12)), px = -(b[1] - a[1]) / L, pz = (b[0] - a[0]) / L, pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, env = Math.sin(t * Math.PI), w = env * wig * (Math.sin(t * Math.PI * 2.2 + ph) * .7 + (vnoise(t * 4 + ph, ph * 3.1) - .5) * .9);
      let x = a[0] + (b[0] - a[0]) * t + px * w, z = a[1] + (b[1] - a[1]) * t + pz * w;
      for (let k = 0; k < 30 && coastD(x, z) < 14; k++) { const e = 2, gx = coastD(x + e, z) - coastD(x - e, z), gz = coastD(x, z + e) - coastD(x, z - e), gl = Math.hypot(gx, gz) || 1; x += gx / gl * 2; z += gz / gl * 2; }
      pts.push([x, z]);
    }
    const sm = pts.map((q, i) => i === 0 || i === pts.length - 1 ? q : [(pts[i - 1][0] + q[0] * 2 + pts[i + 1][0]) / 4, (pts[i - 1][1] + q[1] * 2 + pts[i + 1][1]) / 4]);
    out.push(sm);
  };
  const A = V('aldoria'), D = V('desert'), S = V('snow'), F = V('volcano'), P = V('post'), RP = V('ruinpost'), DP = V('dpost'), SP = V('spost'), VP = V('vpost');
  link(gate(A, 1, 0), gate(D, -1, 0), 26, .3); link(gate(A, 0, -1), gate(S, 0, 1), 30, 1.7);
  link(gate(A, -1, 0), gate(P, 1, 0), 10, 2.2); link(gate(P, -1, 0), gate(F, 1, 0), 30, 3.1);
  link(gate(A, 0, 1), gate(RP, -1, 0), 18, 4.4); link(gate(D, 0, 1), gate(DP, -1, 0), 16, 5.3);
  link(gate(S, -1, 0), gate(SP, 1, 0), 18, 6.1); link(gate(F, 0, 1), gate(VP, -1, 0), 14, 7.7); link(gate(S, 1, 0), gate(D, 0, -1), 40, 8.2);
  link(gate(P, 0, 1), gate(RP, 1, 0).map((q, i) => i ? q : q - 20), 22, 9.4);
  const PL = V('pedraluz'), ZA = V('zahar'), CZ = V('cinzeiro'), FM = V('frostmar'), PSE = V('p_se'), PE = V('p_e'), PNE = V('p_ne'), PSW = V('p_sw');
  link(gate(RP, 1, 0), gate(PSE, -1, 0), 14, 10.3); link(gate(PSE, 1, 0), gate(PL, -1, 0), 16, 11.1);
  link(gate(D, 1, 0), gate(PE, -1, 0), 14, 12.2); link(gate(PE, 1, 0), gate(ZA, -1, 0), 14, 13.4);
  link(gate(S, 0, -1), gate(PNE, -1, 0), 16, 14.1); link(gate(PNE, 1, 0), gate(FM, -1, 0), 14, 15.3);
  link(gate(A, -1, 0), [CAMP.ex, CAMP.ez], 4, 18.3); // trilha até a ponte do Campo de Treinamento
  link(gate(VP, 0, 1), gate(CZ, 0, -1), 14, 16.2); link(gate(PSW, 0, 1), gate(VP, 0, -1), 12, 17.1);
  return out;
})();
const ROAD_W = 2.3, ROAD_G = (() => { const g = new Map();
  for (const pts of ROADS) for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], s = [a[0], a[1], b[0], b[1]];
    for (let cx = Math.floor((Math.min(a[0], b[0]) - 6) / 16); cx <= Math.floor((Math.max(a[0], b[0]) + 6) / 16); cx++) for (let cz = Math.floor((Math.min(a[1], b[1]) - 6) / 16); cz <= Math.floor((Math.max(a[1], b[1]) + 6) / 16); cz++) { const k = cx * 4096 + cz; let l = g.get(k); if (!l) g.set(k, l = []); l.push(s); } }
  return g; })();
function roadDist(x, z) {
  const l = ROAD_G.get(Math.floor(x / 16) * 4096 + Math.floor(z / 16)); if (!l) return 99;
  let best = 99; for (const s of l) { const dx = s[2] - s[0], dz = s[3] - s[1], L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / L)), d = Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t); if (d < best) best = d; }
  return best;
}
/* limites do continente e faixa de distâncias até Aldoria de cada zona (o nível dos monstros cresce de dmin a dmax) */
const WB = { x0: -950, x1: 950, z0: -950, z1: 720 };
const ZD = (() => { const o = {}; for (let x = WB.x0; x < WB.x1; x += 10) for (let z = WB.z0; z < WB.z1; z += 10) { if (coastD(x, z) < 4 || inTownSq(x, z, 4)) continue; const id = zoneScore(x, z).a, d = Math.hypot(x, z), q = o[id] || (o[id] = [1e9, 0]); if (d < q[0]) q[0] = d; if (d > q[1]) q[1] = d; } return o; })();
function zoneLvl(zid, x, z) { const zn = ZN[zid], q = ZD[zid]; if (!zn || !zn.lv) return 1;
  if (zid === 'camp') { const al = (x - CAMP.x) * CAMP.ux + (z - CAMP.z) * CAMP.uz; return CAMP.lv[Math.max(0, Math.min(2, Math.floor((CAMP.ri - al) / (2 * CAMP.ri) * 3)))]; } // 3 níveis: perto do portão, meio e fundo da ilha
  if (!q) return 1; const t = Math.max(0, Math.min(1, (Math.hypot(x, z) - q[0]) / Math.max(1, q[1] - q[0]))); return Math.round(zn.lv[0] + t * (zn.lv[1] - zn.lv[0])); }
const MOB_ATK = 1.4; // ataque do monstro comum (elites e chefes usam o próprio multiplicador): medido com tools/teste_luta_real.py, ~25-35% da vida por luta
/* Vida do monstro: medido com as habilidades (tools/teste_luta_real.py), sem fator o comum morria em 0,3–3 s. O fator sobe com o nível do monstro (lutas curtas no começo,
   ~5–10 s a partir do ~15) e o XP acompanha, para o ritmo de subir de nível se manter. Elites e chefes: fator extra (ELITE_HPK, BOSS_HPK) já sobre o hpm deles. */
const hpRamp = lvl => Math.max(0, Math.min(1, (lvl - 3) / 12));
const hpK = (lvl, boss) => boss ? (boss.hpm || 1) * (1 + ((boss.hpk || 1) - 1) * hpRamp(lvl)) : 1.5 + (MOB_HPK - 1.5) * hpRamp(lvl);
const mobStats = (lvl, boss) => ({ // vida acompanha o dano do jogador (~linear); ataque acompanha vida × defesa do jogador
  hp: Math.round((90 + 40 * lvl) * (1 + lvl / 250) * hpK(lvl, boss)),
  atk: (5 + 2.6 * lvl) * (1 + lvl / 9) * (1 + lvl / 100) * (boss ? boss.atkm : MOB_ATK),
  def: lvl * 2.2 * .97, xp: Math.round((8 + lvl * 5) * (1 + lvl / 25) * (boss ? boss.xpm * (1 + ((boss.hpk || 1) - 1) * hpRamp(lvl)) : hpK(lvl))), gold: Math.max(1, Math.round((3 + lvl * 1.6) * .35 * (boss ? 8 : 1))), // XP cresce bem mais com o nível
});

/* ===== Itens ===== */
const WEAPON_NAMES = {
  vanguard: ['Espada Curta', 'Espada de Ferro', 'Montante', 'Lâmina Rúnica', 'Espada Real', 'Lâmina Celeste'],
  arcanist: ['Cajado de Madeira', 'Cajado de Cristal', 'Cajado Arcano', 'Cajado Rúnico', 'Cajado Real', 'Cajado Celeste'],
  huntress: ['Arco Curto de Caça', 'Arco Curto de Freixo', 'Arco Curto Élfico', 'Arco Curto Rúnico', 'Arco Curto Real', 'Arco Curto Celeste'],
  tamer: ['Cetro de Osso', 'Cetro Totêmico', 'Cetro Selvagem', 'Cetro Rúnico', 'Cetro Real', 'Cetro Celeste'],
};
const ARMOR_NAMES = ['Túnica Simples', 'Couro Batido', 'Cota de Malha', 'Placas Rúnicas', 'Armadura Real', 'Armadura Celeste'];
const HELM_NAMES = ['Capuz de Pano', 'Capacete de Couro', 'Elmo de Ferro', 'Elmo Rúnico', 'Coroa Real', 'Elmo Celeste'];
const LEG_NAMES = ['Calça de Pano', 'Calça de Couro', 'Grevas de Malha', 'Grevas Rúnicas', 'Grevas Reais', 'Grevas Celestes'];
const GLOVE_NAMES = ['Luvas Simples', 'Luvas de Couro', 'Manoplas de Malha', 'Manoplas Rúnicas', 'Manoplas Reais', 'Manoplas Celestes'];
const BOOT_NAMES = ['Sandálias', 'Botas de Couro', 'Botas de Ferro', 'Botas Rúnicas', 'Botas Reais', 'Botas Celestes'];
const ACC_NAMES = ['Anel de Cobre', 'Amuleto de Prata', 'Brinco de Jade', 'Colar Rúnico', 'Anel Real', 'Amuleto Celeste'];
const RARITY = [{ n: 'Comum', m: 1, c: '#c9ced6' }, { n: 'Incomum', m: 1.12, c: '#6fdc6f' }, { n: 'Raro', m: 1.3, c: '#5aa9ff' }, { n: 'Épico', m: 1.6, c: '#c46bff' }, { n: 'Lendário', m: 2, c: '#ffb13b' }];
const SLOTS = { w: 'Arma', h: 'Elmo', a: 'Peitoral', l: 'Calça', g: 'Luvas', b: 'Botas', c: 'Acessório' };
const SLOT_ORDER = ['w', 'h', 'a', 'l', 'g', 'b', 'c'];
const ARM_SHARE = { a: 1, h: .55, l: .7, g: .3, b: .45 }; // fatia da defesa/vida de cada peça de armadura (luvas também dão um pouco de ataque)
/* equipamento por classe: cada classe tem o seu tipo de arma (WTYPES) e de armadura; o item guarda it.cls e NÃO pode ser equipado por outra classe.
   Armadura: Vanguarda = placas (mais defesa e vida), Arcanista = tecidos (menos defesa, mais mana), Caçadora = couro (esquiva), Invocador = peles e ossos (vida e mana). */
const CLS_ARM_NOUN = {
  vanguard: { a: 'Peitoral', h: 'Elmo', l: 'Grevas', g: 'Manoplas', b: 'Botas' },
  arcanist: { a: 'Manto', h: 'Chapéu', l: 'Calças', g: 'Luvas', b: 'Sandálias' },
  huntress: { a: 'Couraça', h: 'Capuz', l: 'Calças', g: 'Luvas', b: 'Botas' },
  tamer: { a: 'Colete', h: 'Cocar', l: 'Calças', g: 'Braçadeiras', b: 'Botas' },
};
const CLS_ARM_MAT = {
  vanguard: ['de Ferro Velho', 'de Ferro', 'de Aço', 'de Aço Rúnico', 'de Ouro Real', 'de Aço Celeste'],
  arcanist: ['de Linho', 'de Lã Encantada', 'de Seda', 'de Seda Rúnica', 'de Seda Real', 'de Éter Celeste'],
  huntress: ['de Couro Cru', 'de Couro Batido', 'de Couro Curtido', 'de Couro Rúnico', 'de Couro Real', 'de Couro Celeste'],
  tamer: ['de Peles', 'de Presas', 'de Escamas', 'de Ossos Rúnicos', 'de Peles Reais', 'de Penas Celestes'],
};
const ARM_CLS_STAT = { vanguard: { def: 1.25, hp: 1.2 }, arcanist: { def: .7, hp: .82, mp: 9 }, huntress: { def: .95, hp: 1, dodge: .004 }, tamer: { def: .9, hp: 1.06, mp: 5 } };
const CLS_OF_WT = { sword: 'vanguard', daggers: 'vanguard', axe: 'vanguard', wand: 'arcanist', orb: 'arcanist', tome: 'arcanist', bow: 'huntress', longbow: 'huntress', compbow: 'huntress', crossbow: 'huntress', scepter: 'tamer', totem: 'tamer' }; // 'staff' é de duas classes: só o campo it.cls decide
/* tipos de arma por classe (cada tipo tem visual próprio) */
const WTYPES = { vanguard: ['sword', 'daggers', 'axe'], arcanist: ['staff', 'wand', 'orb', 'tome'], huntress: ['bow', 'longbow', 'compbow', 'crossbow'], tamer: ['scepter', 'staff', 'totem'] };
const WMUL = { sword: 1, daggers: .94, axe: 1.08, staff: 1, wand: .92, orb: 1.05, tome: 1.08, bow: .96, longbow: 1.06, compbow: 1.02, crossbow: 1.1, scepter: 1, totem: .96 };
/* tipos removidos: itens antigos são convertidos no load (por classe; sem classe, usa o mapa geral) */
const WT_REMAP = { hammer: 'axe', spear: 'sword', chakram: 'compbow', club: 'scepter', claws: 'totem' };
function fixWeapon(it, cls) {
  if (!it || it.slot !== 'w') return it;
  const ok = WTYPES[cls], was = it.wt;
  if (!WMUL[it.wt]) it.wt = WT_REMAP[it.wt] || (ok ? ok[0] : 'sword');
  if (ok && !ok.includes(it.wt)) it.wt = ok.includes(WT_REMAP[was]) ? WT_REMAP[was] : ok[0];
  if (it.wt !== was && !it.uniq) it.name = WNAMES[it.wt][Math.max(0, Math.min(5, it.grade | 0))];
  return it;
}
const WNAMES = {
  sword: WEAPON_NAMES.vanguard, staff: WEAPON_NAMES.arcanist, bow: WEAPON_NAMES.huntress, scepter: WEAPON_NAMES.tamer,
  axe: ['Machado Rústico', 'Machado de Guerra', 'Machado Duplo', 'Machado Rúnico', 'Machado Real', 'Machado Celeste'],
  daggers: ['Faca de Caça', 'Adaga de Ferro', 'Adaga Serrilhada', 'Adaga Rúnica', 'Adaga Real', 'Adaga Celeste'],
  wand: ['Varinha de Galho', 'Varinha de Cristal', 'Varinha Arcana', 'Varinha Rúnica', 'Varinha Real', 'Varinha Celeste'],
  orb: ['Orbe Opaco', 'Orbe de Cristal', 'Orbe Arcano', 'Orbe Rúnico', 'Orbe Real', 'Orbe Celeste'],
  tome: ['Caderno de Feitiços', 'Grimório de Couro', 'Grimório Arcano', 'Grimório Rúnico', 'Grimório Real', 'Grimório Celeste'],
  longbow: ['Arco Longo de Teixo', 'Arco Longo de Ferro', 'Arco Longo de Guerra', 'Arco Longo Rúnico', 'Arco Longo Real', 'Arco Longo Celeste'],
  compbow: ['Arco Composto Simples', 'Arco Composto de Chifre', 'Arco Composto Recurvo', 'Arco Composto Rúnico', 'Arco Composto Real', 'Arco Composto Celeste'],
  crossbow: ['Besta Simples', 'Besta de Ferro', 'Besta Pesada', 'Besta Rúnica', 'Besta Real', 'Besta Celeste'],
  totem: ['Totem Simples', 'Totem de Osso', 'Totem Espiritual', 'Totem Rúnico', 'Totem Real', 'Totem Celeste'],
};
/* armas únicas: o chefe sempre deixa cair uma arma com nome próprio (mais forte que uma épica comum) */
const UNIQUE_W = { banditking: 'Cutelo do Rei Bandido', pharaoh: 'Cetro do Faraó', frostwyrm: 'Presa da Serpe Glacial', guardian: 'Raiz do Guardião', colossus: 'Ruína do Colosso', scorpqueen: 'Ferrão da Rainha', yetiking: 'Presa do Rei Yeti', ignar: 'Coração de Ignar', lich: 'Lamento do Lich', demon: 'Pacto Demoníaco' };
/* ===== Configuração de balanceamento: o jogo lê TUDO daqui. O painel do administrador (admin.js) só altera este objeto
   e a lista de eventos. CFG_DEFAULT guarda os valores originais (para "Restaurar padrões"). ===== */
const CFG_DEFAULT = Object.freeze(JSON.parse(JSON.stringify({
  drop: {
    rar: [0, .25, .11, .048, .012], // chance base de cada raridade (Comum = o que sobra): Incomum, Raro, Épico, Lendário
    rarBoost: [0, .15, .15, .22, .08], // quanto cada ponto de "bônus de raridade" do monstro soma em cada raridade
    mobBoost: { normal: 0, elite: .12, boss: .3, champ: .55 }, // bônus de raridade por tipo de monstro
    items: { normal: .5, elite: 1.5, boss: 2, champ: 3 }, // itens por abate (parte inteira garantida + fração = chance de mais um)
    stone: { normal: .04, elite: .25, boss: 1, champ: 1 }, // chance de pedra de adicional
    adds: { normal: .03, elite: .15, boss: .4, champ: .4 }, // chance de o item cair já com um adicional
    mount: { normal: .002, elite: .02, boss: .2, champ: .1 }, // chance de cair uma montaria (tabela MOUNT_DROP)
  },
  enh: [1, .95, .9, .8, .7, .6, .5, .4, .3], // chance de refino no Ferreiro: índice 0 = +0→+1 ... índice 8 = +8→+9 (o máximo; +10 e +11 são Ancient, fundidos no Refinador)
  econ: { xpMul: 1, goldMul: 1, shopMul: 1 },
  champ: { first: 150, min: 240, max: 420 }, // segundos até o 1º Campeão e intervalo entre eles
  jewel: { base: .7, perAdd: .15, min: .1, costMul: 1 },
})));
const CFG = JSON.parse(JSON.stringify(CFG_DEFAULT));
/* tipos de evento (o painel cria, o jogo combina com o CFG em cfgEff) */
const EVENT_TYPES = {
  xp: { n: 'XP', ic: '⚡', d: 'Multiplica o XP ganho', def: 2, unit: 'x' },
  gold: { n: 'Ouro', ic: '💰', d: 'Multiplica o ouro dos monstros', def: 2, unit: 'x' },
  rare: { n: 'Chuva de raros', ic: '💎', d: 'Multiplica a chance de Raro, Épico e Lendário', def: 2, unit: 'x' },
  champ: { n: 'Invasão de campeões', ic: '👑', d: 'Campeões aparecem N vezes mais', def: 4, unit: 'x' },
  enh: { n: 'Refino abençoado', ic: '✨', d: 'Soma pontos percentuais na chance de refino', def: 15, unit: '%' },
  stone: { n: 'Pedras', ic: '🔮', d: 'Multiplica a chance de pedras de adicional', def: 2, unit: 'x' },
};
/* efeito somado dos eventos ativos (o Game recalcula quando um evento começa/termina) */
let EV_EFF = { xpMul: 1, goldMul: 1, rareMul: 1, champMul: 1, enhAdd: 0, stoneMul: 1 };
const cfgEff = () => EV_EFF;
const evTitle = e => { const T = EVENT_TYPES[e.type]; if (!T) return '?'; const m = +e.mult || T.def;
  return T.unit === '%' ? T.n + ' +' + m + '%' : (m === 2 ? T.n + ' em dobro' : m === 3 ? T.n + ' em triplo' : T.n + ' ×' + m); };
/* chance de refino atual (+plus → +plus+1), já com o bônus do evento Refino abençoado */
const enhChance = plus => Math.max(0, Math.min(1, (+CFG.enh[plus] || 0) + cfgEff().enhAdd / 100));
let ITEM_UID = 1;
/* posição (it.pos) dos itens na mochila e no baú: devolve um vetor de n espaços com cada item no seu pos; quem não tem pos válido (ou repete) vai para o primeiro espaço livre */
function fillPos(list, n) {
  const used = new Array(n).fill(null), rest = [];
  for (const it of list) { const q = it.pos; if (Number.isInteger(q) && q >= 0 && q < n && !used[q]) used[q] = it; else rest.push(it); }
  for (const it of rest) { const k = used.indexOf(null); if (k < 0) { delete it.pos; continue; } it.pos = k; used[k] = it; }
  return used;
}
/* raridade sorteada a partir do CFG (com eventos) e do bônus do monstro */
function rollRarity(rb) {
  const D = CFG.drop, E = cfgEff(), x = Math.random();
  let acc = 0;
  for (let i = 4; i >= 1; i--) { acc += Math.max(0, (D.rar[i] + D.rarBoost[i] * (rb || 0)) * (i >= 2 ? E.rareMul : 1)); if (x < acc) return i; }
  return 0;
}
function makeItem(slot, cls, lvl, rarityBoost, tierReq) {
  const ri = rollRarity(rarityBoost);
  return buildItem(slot, cls, lvl, ri, undefined, tierReq);
}
/* item com raridade e tipo definidos (lojas, equipamento inicial) */
function buildItem(slot, cls, lvl, ri, wt, tierReq) {
  const grade = gradeOfLvl(lvl, tierReq | 0), pg = gradeOfLvl(lvl, 0), r = RARITY[ri]; // grade: material/nome/desenho (tabela por fase); pg: grau de PODER (faixas do Mortal pelo nível do item), para a dificuldade não depender do material
  const it = { id: ITEM_UID++, slot, grade, pg, rar: ri, plus: 0, lvl, tierReq: tierReq | 0 };
  if (cls && (slot === 'w' || ARM_SHARE[slot])) it.cls = cls; // equipamento de classe
  if (slot === 'w') { const ts = WTYPES[cls] || WTYPES.vanguard; it.wt = wt || ts[Math.floor(Math.random() * ts.length)]; it.name = WNAMES[it.wt][grade]; it.atk = Math.round((6 + pg * 14 + lvl * .8) * r.m * WMUL[it.wt]); }
  if (ARM_SHARE[slot]) {
    const K = ARM_CLS_STAT[cls] || { def: 1, hp: 1 }, base = Math.max(1, Math.round((4 + pg * 9 + lvl * .5) * r.m * ARM_SHARE[slot]));
    it.name = CLS_ARM_NOUN[cls] ? CLS_ARM_NOUN[cls][slot] + ' ' + CLS_ARM_MAT[cls][grade] : { a: ARMOR_NAMES, h: HELM_NAMES, l: LEG_NAMES, g: GLOVE_NAMES, b: BOOT_NAMES }[slot][grade];
    it.def = Math.max(1, Math.round(base * K.def)); it.hp = Math.round(base * 4 * K.hp);
    if (K.mp) it.mp = Math.round(K.mp * (1 + pg * .9) * r.m * ARM_SHARE[slot]);
    if (K.dodge) it.dodge = +(K.dodge * (1 + pg * .35) * r.m * ARM_SHARE[slot]).toFixed(4);
    if (slot === 'b') it.spd = +((.02 + pg * .008) * r.m).toFixed(3);
    if (slot === 'g') it.atk = Math.max(1, Math.round((2 + pg * 5 + lvl * .3) * r.m)); // luvas: um pouco de ataque
  }
  if (slot === 'c') { it.name = ACC_NAMES[grade]; it.crit = +((.01 + pg * .008) * r.m).toFixed(3); it.mp = Math.round((10 + pg * 14) * r.m); }
  return it;
}
/* ===== Pedras de adicional (materiais) e adicionais dos itens (it.adds: [{k, v}], até 3) ===== */
const STONES = {
  forca: { n: 'Pedra da Força', ic: '🔴', k: 'atk', d: 'Adiciona ataque' },
  vida: { n: 'Pedra da Vida', ic: '🟢', k: 'hpp', d: 'Adiciona HP %' },
  guarda: { n: 'Pedra da Guarda', ic: '🔵', k: 'def', d: 'Adiciona defesa' },
  precisao: { n: 'Pedra da Precisão', ic: '🟡', k: 'crit', d: 'Adiciona chance de crítico' },
  arcana: { n: 'Pedra Arcana', ic: '🟣', k: 'arc', d: 'Adiciona mana % e dano de habilidade' },
};
const STONE_IDS = Object.keys(STONES), ADD_MAX = 3;
/* valor do adicional pelo grau do item (0 a 5) */
function addVal(k, grade) {
  const g = Math.max(0, grade | 0);
  return k === 'atk' ? 4 + g * 7 : k === 'def' ? 3 + g * 5 : k === 'hpp' ? +(.03 + g * .012).toFixed(3) : k === 'crit' ? +(.01 + g * .004).toFixed(3) : +(.03 + g * .012).toFixed(3);
}
const addPct = v => +(v * 100).toFixed(1) + '%';
function addTxt(a) {
  return a.k === 'atk' ? 'Ataque +' + a.v : a.k === 'def' ? 'Defesa +' + a.v : a.k === 'hpp' ? 'HP +' + addPct(a.v) : a.k === 'crit' ? 'Crítico +' + addPct(a.v) : 'Mana +' + addPct(a.v) + ' e dano de habilidade +' + addPct(a.v);
}
const addShort = a => a.k === 'atk' ? 'Atq+' + a.v : a.k === 'def' ? 'Def+' + a.v : a.k === 'hpp' ? 'HP+' + addPct(a.v) : a.k === 'crit' ? 'Crít+' + addPct(a.v) : 'Arc+' + addPct(a.v);
/* chance de engastar uma pedra no Joalheiro e custo da tentativa */
const jewelChance = it => Math.min(1, Math.max(CFG.jewel.min, CFG.jewel.base - CFG.jewel.perAdd * ((it.adds && it.adds.length) || 0)));
const pgOf = it => it.pg != null ? it.pg : it.grade; // grau de poder (itens antigos não têm pg)
const jewelCost = it => Math.round(120 * (pgOf(it) + 1) * (1 + ((it.adds && it.adds.length) || 0)) * CFG.jewel.costMul);
const resName = cls => (CLASSES[cls] && CLASSES[cls].res) ? CLASSES[cls].res.n : 'Mana';
const potPrice = k => Math.max(1, Math.round(POT[k].price * CFG.econ.shopMul));
/* refino: +1..+9 somam 8 % cada (Ferreiro); Ancient +10 e +11 (fundidos no Refinador) valem bem mais */
const PLUS_MUL = [1, 1.08, 1.16, 1.24, 1.32, 1.4, 1.48, 1.56, 1.64, 1.72, 2.0, 2.4];
const PLUS_MAX = 9, ANCIENT_MAX = 11, FUSE_GOLD = 100000;
const plusMul = p => PLUS_MUL[Math.max(0, Math.min(PLUS_MUL.length - 1, p | 0))];
const itemMul = it => plusMul(it.plus) * tmul(it.tierReq); // refino × tier exigido
/* peças "iguais" para fundir: mesmo espaço, classe, nome (material, tipo e classe), fase e refino */
const fuseKey = it => [it.slot, it.cls || '', it.name, it.tierReq | 0, it.plus | 0].join('|');
/* nível exigido para equipar = nível do item (máx. MAXLV). it.rq o substitui (recompensas de capítulo); itens de fase inferior à do personagem não exigem nível (equipamento antigo de quem evoluiu) */
const itemReqLvl = (it, tier) => it.rq != null ? it.rq : (it.tierReq | 0) < (tier | 0) ? 1 : Math.min(MAXLV, Math.max(1, it.lvl | 0));
const itemValue = it => Math.round((8 + pgOf(it) * 25 + it.lvl * 2) * (1 + it.rar * .6) * (1 + it.plus * .4) * tmul(it.tierReq));
const enhCost = it => Math.round(40 * Math.pow(it.plus + 1, 1.5) * (pgOf(it) + 1));
const itemName = it => `${it.name}${it.plus ? ' +' + it.plus + (it.plus >= 10 ? ' Ancient' : '') : ''}`;

/* ===== Missões ===== */
const QUESTS = [
  { id: 'q1', n: 'Limpando os Campos', lvl: 1, zone: 'field', kill: 8, rew: { xp: 120, gold: 80, pots: 3 }, t: 'Elimine 8 criaturas nos Campos Verdejantes.' },
  { id: 'q2', n: 'Presas e Garras', lvl: 6, zone: 'field', kill: 16, rew: { xp: 600, gold: 250, pots: 5 }, t: 'Elimine 16 criaturas nos campos, mais longe da vila.' },
  { id: 'q3', n: 'A Floresta Sussurra', lvl: 14, zone: 'forest', kill: 16, rew: { xp: 2200, gold: 700, pots: 6 }, t: 'Elimine 16 criaturas da Floresta Sussurrante.' },
  { id: 'q4', n: 'Provação do Guardião', lvl: 20, boss: 'guardian', rew: { xp: 4000, gold: 1500, pots: 6 }, t: 'Derrote o Guardião do Bosque no coração da floresta.' },
  { id: 'q5', n: 'Ruínas Esquecidas', lvl: 30, zone: 'ruins', kill: 20, rew: { xp: 9000, gold: 3000, pots: 8 }, t: 'Elimine 20 criaturas das Ruínas Esquecidas.' },
  { id: 'q6', n: 'Provação do Colosso', lvl: 40, boss: 'colossus', rew: { xp: 20000, gold: 8000, pots: 10 }, t: 'Derrote o Rei Colosso nas ruínas.' },
];

QUESTS.push(
  { id: 'q7', n: 'Sob o Sol de Kharim', lvl: 36, after: 'q4', zone: 'dunes', kill: 25, rew: { xp: 14000, gold: 6000, pots: 8 }, t: 'Vá ao leste, até o deserto, e elimine 25 criaturas das Dunas de Kharim.' },
  { id: 'q8', n: 'A Rainha das Areias', lvl: 40, boss: 'scorpqueen', rew: { xp: 26000, gold: 12000, pots: 10 }, t: 'Derrote a Rainha Escorpiã nas profundezas do deserto.' },
  { id: 'q9', n: 'Geada Eterna', lvl: 44, zone: 'tundra', kill: 25, rew: { xp: 36000, gold: 16000, pots: 10 }, t: 'Siga para o norte e elimine 25 criaturas da Tundra dos Picos Gélidos.' },
  { id: 'q10', n: 'O Rei dos Picos', lvl: 46, boss: 'yetiking', rew: { xp: 52000, gold: 24000, pots: 12 }, t: 'Derrote o Rei Yeti nos picos congelados.' },
  { id: 'q11', n: 'Cinzas e Brasas', lvl: 48, zone: 'ashlands', kill: 30, rew: { xp: 70000, gold: 32000, pots: 12 }, t: 'Siga para o oeste, até o vulcão, e elimine 30 criaturas das Terras Cinzentas.' },
  { id: 'q12', n: 'O Dragão Ancião', lvl: 50, boss: 'ignar', rew: { xp: 100000, gold: 60000, pots: 20 }, t: 'Derrote Ignar, o Dragão Ancião, no coração do vulcão.' },
);
for (const q of QUESTS) if (q.lvl < CAMP.endLv) q.lvl = CAMP.endLv; // missões das cidades só a partir do nível 29 do Mortal
/* NPCs: papel por "kind" (quest, shop, smith, heal, portal) */
const NPCS = [
  { id: 'maelis', kind: 'quest', n: 'Anciã Maelis', role: 'Missões e Ascensão', x: 0, z: -7, col: [.7, .5, .9], reg: 'aldoria' },
  { id: 'doran', kind: 'shop', n: 'Mercador Doran', role: 'Loja de poções', x: -8, z: 2, col: [.9, .7, .25], reg: 'aldoria' },
  { id: 'brann', kind: 'smith', n: 'Ferreiro', role: 'Refina até +9', x: 8, z: 2, col: [.6, .6, .65], reg: 'aldoria' },
];
{ const N = (id, kind, n, role, v, dx, dz, col) => NPCS.push({ id, kind, n, role, x: v.cx + dx, z: v.cz + dz, col, reg: v.reg, vil: v.id });
  const V = id => VILLAGES.find(v => v.id === id);
  N('post_s', 'shop', 'Mascate Tobias', 'Loja e montarias', V('post'), 3.4, 1.4, [.85, .65, .3]);
  N('pse_s', 'shop', 'Mascate Nilo', 'Loja e montarias', V('p_se'), 3.4, 1.4, [.7, .6, .5]); N('pe_s', 'shop', 'Mascate Jabir', 'Loja e montarias', V('p_e'), 3.4, 1.4, [.9, .75, .45]);
  N('pne_s', 'shop', 'Mascate Ruth', 'Loja e montarias', V('p_ne'), 3.4, 1.4, [.7, .8, .95]); N('psw_s', 'shop', 'Mascate Cinza', 'Loja e montarias', V('p_sw'), 3.4, 1.4, [.9, .55, .4]);
  const T = [['desert', 'sahr', 'Ancião Rahim', 'Comerciante Zafir', 'Ferreira Nadia', [.9, .75, .45]],
    ['snow', 'hiel', 'Anciã Brynja', 'Mercador Olaf', 'Ferreiro Gunnar', [.7, .8, .95]],
    ['volcano', 'cinz', 'Ancião Pyros', 'Mercadora Cinder', 'Ferreiro Vulkan', [.9, .5, .35]],
    ['pedraluz', 'pedr', 'Anciã Lúcia', 'Mercador Brás', 'Ferreira Dagna', [.78, .68, .5]],
    ['zahar', 'zah', 'Ancião Idris', 'Comerciante Samir', 'Ferreiro Tariq', [.9, .75, .45]],
    ['cinzeiro', 'cinzr', 'Ancião Magnus', 'Mercadora Ashka', 'Ferreiro Gorn', [.9, .5, .35]],
    ['frostmar', 'frost', 'Anciã Sigrid', 'Mercador Halvar', 'Ferreira Ylva', [.7, .8, .95]]];
  for (const [rid, k, el, sh, sm, col] of T) {
    const v = V(rid);
    N(k + '_q', 'quest', el, 'Missões e Ascensão', v, 0, -7, shadeC(col, 1.0));
    N(k + '_s', 'shop', sh, 'Loja e montarias', v, -8, 2, shadeC(col, .9));
    N(k + '_f', 'smith', 'Ferreiro', 'Refina até +9', v, 8, 2, [.6, .6, .65]);
  } }
function shadeC(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
/* portais: custo e nível mínimo de cada destino */
const portalDests = fromId => { const f = VILLAGES.find(v => v.id === fromId); return f ? f.links.map(id => VILLAGES.find(v => v.id === id)).filter(Boolean) : []; };
const POT = { hp: { n: 'Poção de Vida', price: 25 }, mp: { n: 'Poção de Mana', price: 30 } };

/* montarias — não são vendidas: caem de monstros (MOUNT_DROP); têm nível (1..MOUNT_MAXLV) que aumenta velocidade, energia e bônus */
const MOUNTS = {
  horse: { n: 'Cavalo de Aldoria', ic: '🐎', price: 400, lvl: 5, spd: .75, bon: { atk: .05, hp: .06 }, d: 'Rápido e fiel.' },
  wolf: { n: 'Lobo de Guerra', ic: '🐺', price: 1200, lvl: 12, spd: .85, bon: { atk: .08, crit: .02 }, d: 'Feroz e ágil. Morde junto com você.' },
  boar: { n: 'Javali Blindado', ic: '🐗', price: 2200, lvl: 18, spd: .78, bon: { def: .14, hp: .12 }, d: 'Lento para virar, mas uma muralha viva.' },
  unicorn: { n: 'Unicórnio Lunar', ic: '🦄', price: 3000, lvl: 20, spd: 1.0, bon: { atk: .08, def: .1, hp: .08 }, d: 'Criatura mística de crina brilhante.' },
  tiger: { n: 'Tigre das Neves', ic: '🐅', price: 6000, lvl: 28, spd: 1.1, bon: { atk: .12, crit: .03, hp: .06 }, d: 'Caçador silencioso dos Picos Gélidos.' },
  dragon: { n: 'Dragão Rubro', ic: '🐉', price: 12000, lvl: 35, spd: 1.3, bon: { atk: .16, def: .12, hp: .16, crit: .03 }, fly: 1, d: 'Voa por cima de obstáculos.' },
  griffin: { n: 'Grifo Real', ic: '🦅', price: 20000, lvl: 42, spd: 1.4, bon: { atk: .18, def: .1, hp: .14, crit: .05 }, fly: 1, d: 'Metade águia, metade leão. Voa sobre tudo.' },
  nightmare: { n: 'Corcel Sombrio', ic: '🐴', price: 32000, lvl: 48, spd: 1.35, bon: { atk: .2, def: .16, hp: .18, crit: .04 }, d: 'Cavalo de fumaça e brasas, das Terras Cinzentas.' },
};
const MOUNT_MAXLV = 30, mountXpNeed = lv => Math.round(30 * Math.pow(lv, 1.55));
const mountLvSpd = lv => 1 + (lv - 1) * .012, mountLvBon = lv => 1 + (lv - 1) * .025, mountLvMst = lv => 100 + (lv - 1) * 5; // efeito do nível
/* de onde cada montaria cai: zona (monstros comuns/elites/campeões) e chefes; ajustável. Chance por tipo em CFG.drop.mount */
const MOUNT_DROP = {
  zone: { field: ['horse'], forest: ['horse', 'wolf'], ruins: ['boar', 'unicorn'], dunes: ['boar', 'unicorn'], tundra: ['tiger'], ashlands: ['nightmare'] },
  boss: { banditking: 'horse', guardian: 'wolf', colossus: 'boar', pharaoh: 'unicorn', scorpqueen: 'unicorn', lich: 'nightmare', frostwyrm: 'tiger', yetiking: 'griffin', demon: 'nightmare', ignar: 'dragon' },
};
const mountSources = id => [...Object.keys(MOUNT_DROP.zone).filter(z => MOUNT_DROP.zone[z].includes(id)).map(z => ZN[z].name), ...Object.keys(MOUNT_DROP.boss).filter(b => MOUNT_DROP.boss[b] === id).map(b => BOSSES[b].n)];
const mountBonusTxt = (m, lv, k = mountLvBon(lv || 1)) => [m.bon.atk && '+' + Math.round(m.bon.atk * k * 100) + '% ataque', m.bon.def && '+' + Math.round(m.bon.def * k * 100) + '% defesa', m.bon.hp && '+' + Math.round(m.bon.hp * k * 100) + '% vida', m.bon.crit && '+' + Math.round(m.bon.crit * k * 100) + '% crítico'].filter(Boolean).join(' · ');
/* altura da sela (topo) e deslocamento para frente/trás; o cavaleiro senta com o quadril na sela */
const MOUNT_SEAT = { horse: [1.74, -.05], unicorn: [1.74, -.05], nightmare: [1.74, -.05], wolf: [1.62, -.1], boar: [1.5, -.05], tiger: [1.6, -.1], dragon: [2.62, .1], griffin: [2.0, -.1] };
/* aparência */
const HAIR_STYLES = ['Curto', 'Longo', 'Rabo de cavalo', 'Coque', 'Espetado', 'Careca', 'Tranças', 'Moicano', 'Chanel', 'Franja lateral', 'Marias-chiquinhas', 'Selvagem'];
const HAIR_COLORS = [[.2, .12, .07], [.07, .06, .08], [.55, .3, .12], [.88, .72, .35], [.75, .2, .15], [.9, .9, .95], [.25, .5, .92], [.62, .3, .88],
  [.38, .22, .12], [.5, .5, .55], [.95, .55, .25], [.3, .75, .45], [.95, .45, .7], [.12, .65, .7], [.65, .08, .18], [.96, .9, .62]];
const HAIR_COLOR_NAMES = ['Castanho escuro', 'Preto', 'Ruivo-acobreado', 'Loiro', 'Vermelho', 'Branco', 'Azul', 'Violeta', 'Castanho', 'Grafite', 'Laranja', 'Verde', 'Rosa', 'Turquesa', 'Carmim', 'Platinado'];
const EYE_COLORS = [[.25, .15, .08], [.2, .45, .85], [.2, .65, .3], [.55, .58, .62], [.85, .25, .2], [.92, .72, .2], [.6, .3, .9], [.2, .85, .85]];
const SKIN_TONES = [[.98, .84, .72], [.93, .76, .6], [.8, .6, .43], [.62, .43, .3], [.45, .3, .22], [.52, .72, .5], [.99, .9, .82], [.35, .22, .17], [.72, .78, .92], [.7, .55, .78]];
const SKIN_NAMES = ['Clara', 'Bege', 'Morena', 'Bronzeada', 'Escura', 'Verde (orc)', 'Pálida', 'Ébano', 'Gélida', 'Crepuscular'];
const BEARDS = ['Nenhuma', 'Barba rala', 'Cavanhaque', 'Barba cheia', 'Bigode', 'Barba trançada'];
const FACE_MARKS = ['Nenhuma', 'Cicatriz', 'Pintura de guerra', 'Runa brilhante', 'Sardas', 'Maquiagem sombria'];
const BUILDS = ['Esguio', 'Normal', 'Robusto'];
/* opções por gênero (índices de HAIR_STYLES / FACE_MARKS); mulher não tem barba */
const HAIR_BY_G = [[0, 4, 5, 7, 1, 2, 3, 9, 11], [1, 2, 3, 6, 8, 9, 10, 0, 11]];
const FACE_BY_G = [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5]];
const GENDERS = ['Masculino', 'Feminino'];
const LOOK_LIM = { g: 2, hs: HAIR_STYLES.length, hc: HAIR_COLORS.length, ec: EYE_COLORS.length, sk: SKIN_TONES.length, bd: BEARDS.length, fc: FACE_MARKS.length, b: BUILDS.length };
const DEFLOOK = {
  vanguard: { g: 0, hs: 0, hc: 0, ec: 0, sk: 1, bd: 1, fc: 0, b: 2 }, arcanist: { g: 0, hs: 1, hc: 5, ec: 1, sk: 0, bd: 0, fc: 0, b: 0 },
  huntress: { g: 1, hs: 2, hc: 2, ec: 2, sk: 1, bd: 0, fc: 0, b: 0 }, tamer: { g: 0, hs: 0, hc: 0, ec: 0, sk: 2, bd: 0, fc: 0, b: 1 },
};

/* ===== atributos (pontos de status) ===== */
const ATTRS = {
  str: { n: 'Força', ic: '💪', d: '+0,8% de ataque por ponto (Vanguarda)' },
  dex: { n: 'Destreza', ic: '🎯', d: '+0,3% de crítico, +0,15% de esquiva e +0,1% de velocidade por ponto; Caçadora: também +0,7% de ataque' },
  int: { n: 'Inteligência', ic: '🔮', d: '+2% de mana e +0,8% de dano das habilidades por ponto; Arcanista e Invocador: também +0,8% de ataque' },
  vit: { n: 'Vitalidade', ic: '❤️', d: '+1,2% de vida e +0,6% de defesa por ponto' },
  spi: { n: 'Cura', ic: '✨', d: '+1,5% de cura das habilidades e +1% de efeito das poções por ponto' },
};
const ATTR_KEYS = Object.keys(ATTRS);
/* aprender habilidades com o Mestre de Habilidades (índice = posição na barra). Níveis 1–10 com pontos de habilidade (1 por nível) */
/* aprender: nível mínimo e custo em PONTOS DE HABILIDADE (3 por nível, gastos no Mestre de Habilidades); price é legado (não usado) */
const SK_LEARN = [{ lvl: 1, price: 0, pts: 1 }, { lvl: 1, price: 0, pts: 1 }, { lvl: 3, price: 120, pts: 2 }, { lvl: 6, price: 350, pts: 2 }, { lvl: 20, price: 2500, pts: 4 }, { lvl: 15, price: 1500, pts: 3 }, { lvl: 40, price: 9000, pts: 5 }];
const SK_MAX = 10, SK_STEP = .1; // +10% de efeito por nível
const SK_PTS_LEVEL = 3; // pontos de habilidade por nível do personagem (3 no nível 1; ~150 até o nível 50, quase o suficiente para todas no máximo)
/* pontos para subir a habilidade do nível L para L+1; teto do nível da habilidade pelo nível do personagem; total gasto numa habilidade (reembolso) */
const skRaiseCost = L => L <= 3 ? 1 : L <= 6 ? 2 : 3;
const skCap = lvl => Math.min(SK_MAX, 1 + Math.floor(lvl / 5));
const skSpent = (i, L) => { if (!L) return 0; let t = SK_LEARN[i].pts; for (let l = 1; l < L; l++) t += skRaiseCost(l); return t; };
function skEff(s, L) { // cópia da habilidade com o bônus do nível
  if (!L || L <= 1) return s;
  const b = 1 + SK_STEP * (L - 1), o = Object.assign({}, s);
  for (const k of ['m', 'p', 'atk', 'def', 'v']) if (o[k]) o[k] = +(o[k] * b).toFixed(3);
  if (o.sh) o.sh = Math.min(.9, o.sh * b);
  if (o.k === 'summon' || o.k === 'buff' || o.k === 'shield' || o.k === 'mark') o.dur = Math.round(o.dur * (1 + .05 * (L - 1)));
  o.mp = Math.round(s.mp * (1 + .05 * (L - 1)));
  return o;
}
const AP_PER_LEVEL = 5;
const ATTR_HINT = { vanguard: ['str', 'vit'], arcanist: ['int', 'vit'], huntress: ['dex', 'vit'], tamer: ['int', 'vit'] };
