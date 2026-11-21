'use strict';
/* ===== Aldoria Offline — lógica do jogo (game.js) ===== */
const G = {
  state: 'menu', t: 0, tod: 9, weather: 'clear', mute: false, vp: M.id(), player: null,
  stats: { atk: 10, def: 5, crit: .05, spd: 5.4, maxHp: 100, maxMp: 50, setBonus: false },
  quests: {}, encSpot: null, target: null, zone: ZONES[0], mobs: [], npcs: NPCS, labels: [], dead: false,
  // modo automático (ver CONTRACT.md)
  auto: { attack: false, skills: false, hp: false, mp: false, hpPct: 50, mpPct: 30 }, autoOut: { hp: false, mp: false }, autoPaused: false,
};

const Game = (() => {
  const SAVE_KEY = 'aldoria_save_v1';
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = Math.random;
  const hex2rgb = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const mulberry = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const angDiff = (a, b) => { let d = (b - a) % (PI * 2); if (d > PI) d -= PI * 2; if (d < -PI) d += PI * 2; return d; };
  const IDM = M.id();

  let R = null, canvas = null, world = null, last = 0;
  const obstacles = [], grid = new Map(), GC = 8, GOFF = 2048;
  const keys = {}, cam = { yaw: 0, dist: 15, x: 0, z: 0, init: false };
  const camPos = [0, 20, 20], fogCur = ZONES[0].fog.slice();
  // luz por zona: cor do sol, ambiente de cima/baixo, topo do céu e exposição
  const LIGHT = {
    town: { sun: [1, .93, .8], ambT: [.5, .56, .66], ambB: [.34, .29, .24], top: [.3, .5, .85], exp: .8 },
    field: { sun: [1, .94, .78], ambT: [.5, .58, .66], ambB: [.32, .3, .22], top: [.3, .52, .86], exp: .8 },
    forest: { sun: [.78, .92, .78], ambT: [.32, .46, .44], ambB: [.2, .24, .18], top: [.22, .34, .42], exp: .85 },
    ruins: { sun: [.9, .76, 1], ambT: [.38, .34, .52], ambB: [.24, .2, .28], top: [.2, .16, .34], exp: .88 },
  };
  const lightZ = (id, from) => { LIGHT[id] = LIGHT[from]; };
  LIGHT.oasis = LIGHT.dunes = { sun: [1, .88, .66], ambT: [.6, .54, .44], ambB: [.42, .32, .2], top: [.36, .5, .8], exp: .78 };
  LIGHT.frostv = LIGHT.tundra = { sun: [.9, .95, 1], ambT: [.55, .62, .76], ambB: [.4, .42, .5], top: [.34, .5, .86], exp: .78 };
  LIGHT.forge = LIGHT.ashlands = { sun: [1, .62, .4], ambT: [.46, .26, .2], ambB: [.3, .14, .1], top: [.22, .1, .1], exp: .95 };
  lightZ('camp', 'field'); lightZ('pedraluz', 'town'); lightZ('zahar', 'oasis'); lightZ('cinzeiro', 'forge'); lightZ('frostmar', 'frostv'); // cidades novas: luz da vizinha
  const lightCur = JSON.parse(JSON.stringify(LIGHT.town));
  /* ---------- dia / noite / clima ---------- */
  const DAY_SECONDS = 600; // um dia inteiro em 10 minutos reais
  const WEATHER = { clear: { n: 'Céu limpo', ic: '☀️' }, rain: { n: 'Chuva', ic: '🌧️' }, storm: { n: 'Tempestade', ic: '⛈️' }, fog: { n: 'Neblina', ic: '🌫️' } };
  const wx = { id: 'clear', level: 0, fogK: 0, t: 90, flash: 0, nextFlash: 8, env: null };
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const mul3 = (a, k) => [a[0] * k[0], a[1] * k[1], a[2] * k[2]], sc3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  function precipType() { return REG[(G.state === 'play' ? G.zone : ZONES[0]).reg].clim; }
  const mouse = { x: 0, y: 0, drag: false, lx: 0, in: false };
  let portalLock = true, tmob = null, cmd = null, pet = null, combatT = -99, saveT = 0, lastZone = null;
  const msgT = {};
  const AUTO_KEY = 'aldoria_auto_v1';
  let autoAcc = 0, autoPause = 0, autoHome = null;
  const items = [], fx = [], projs = [], delayed = [];
  const SND = createSoundEngine(); // audio.js: mixer, efeitos, vozes, passos, ambiente e música sintetizados

  const MSPD = { slime: 2, boar: 3.6, wolfm: 3.8, spider: 3.6, goblin: 3.2, ent: 2.2, skel: 3, golemm: 2, wraith: 3.4, guardian: 3, colossus: 2.8, rat: 4.2, bandit: 3.4, orc: 3, necro: 2.6, banshee: 3.2, fireelem: 3, waterelem: 3, minotaur: 3.4, alphawolf: 4.4, queenspider: 3.8, orcwar: 3, phoenix: 4, hydra: 2.6, lich: 2.8, demon: 3.2, scorpion: 3.6, jackal: 4.2, mummy: 2.6, sandgolem: 2.2, yeti: 2.8, frostwolf: 4.2, frostwraith: 3.4, icegolem: 2.2, lavaslime: 2.4, imp: 4, hellhound: 4.4, magmagolem: 2.2, scorpqueen: 3.4, yetiking: 3, ignar: 2.8 };
  const HGT = { slime: 1.3, boar: 1.4, wolfm: 1.3, spider: 1.4, goblin: 2.2, ent: 3.6, skel: 2.2, golemm: 3.2, wraith: 2.4, guardian: 3.9, colossus: 3.6, rat: .9, bandit: 2.2, orc: 2.6, necro: 2.5, banshee: 2.6, fireelem: 3, waterelem: 2.8, minotaur: 3.3, alphawolf: 1.6, queenspider: 1.8, orcwar: 3, phoenix: 2.6, hydra: 3.4, lich: 2.8, demon: 3.8, scorpion: 1.6, jackal: 1.3, mummy: 2.6, sandgolem: 3.2, yeti: 3.5, frostwolf: 1.3, frostwraith: 2.4, icegolem: 3.2, lavaslime: 1.3, imp: 2.2, hellhound: 1.4, magmagolem: 3.2, scorpqueen: 2.4, yetiking: 4, ignar: 2.8 };
  Object.assign(MSPD, { gremlin: 3.3, lizard: 3.4, bear: 3.2, fox: 4.6, cobra: 3.4, salamander: 3, gargoyle: 3 }); Object.assign(HGT, { gremlin: 1.5, lizard: .8, bear: 1.9, fox: .95, cobra: 1.9, salamander: 1.1, gargoyle: 3.5 });
  for (const k in MOB_ALIAS) { MSPD[k] = MSPD[k] || MSPD[MOB_ALIAS[k]]; HGT[k] = HGT[k] || HGT[MOB_ALIAS[k]]; }
  const throttle = (k, s) => { if (msgT[k] && G.t - msgT[k] < s) return false; msgT[k] = G.t; return true; };

  /* ---------- áudio (motor em audio.js) ---------- */
  const initAudio = () => SND.init();
  const SFX_AL = { hit: 'hit_flesh', skill: null };
  function sfx(n, o) { if (G.mute) return false; if (n === 'skill') n = 'skill_' + (G.player ? G.player.cls : 'vanguard'); return SND.play(SFX_AL[n] || n, o); }
  /* material do alvo (som do acerto) e voz do monstro por família */
  const MAT = { skel: 'bone', mummy: 'bone', pharaoh: 'bone', lich: 'ghost', golemm: 'stone', colossus: 'stone', sandgolem: 'stone', gargoyle: 'stone', magmagolem: 'stone', icegolem: 'ice', waterelem: 'slime', frostwraith: 'ghost', wraith: 'ghost', banshee: 'ghost', necro: 'ghost', fireelem: 'fire', phoenix: 'fire', ignar: 'fire', slime: 'slime', lavaslime: 'slime', spider: 'insect', queenspider: 'insect', scorpion: 'insect', scorpqueen: 'insect', ent: 'wood', ancientent: 'wood', guardian: 'wood', yeti: 'ice', yetiking: 'ice', frostwyrm: 'ice' };
  const MV = { slime: ['blub', 1], lavaslime: ['blub', .8], waterelem: ['blub', .7], boar: ['growl', 1.1], boarelite: ['growl', 1], bear: ['growl', .7], polarbear: ['growl', .65], orc: ['growl', .85], orcwar: ['growl', .7], minotaur: ['roar', 1], goblin: ['squeak', .8], bandit: ['growl', 1.2], wolfm: ['howl', 1], shadowwolf: ['howl', .85], alphawolf: ['howl', .75], frostwolf: ['howl', .9], jackal: ['howl', 1.3], fox: ['squeak', .9], hellhound: ['growl', .8], rat: ['squeak', 1.2],
    cobra: ['hiss', 1], hydra: ['hiss', .6], frostwyrm: ['roar', .8], spider: ['chitter', 1], queenspider: ['chitter', .8], scorpion: ['chitter', .9], scorpqueen: ['chitter', .7], imp: ['screech', 1.3], phoenix: ['screech', .8], pharaoh: ['moan', .6], skel: ['clank', 1.3], mummy: ['moan', .8], wraith: ['moan', 1], frostwraith: ['moan', 1.1], banshee: ['screech', .8], necro: ['moan', .9], lich: ['moan', .6],
    golemm: ['clank', .8], icegolem: ['clank', .8], sandgolem: ['clank', .75], magmagolem: ['clank', .65], gargoyle: ['clank', .9], colossus: ['clank', .55], fireelem: ['crackle', 1], ent: ['moan', .5], ancientent: ['moan', .4], guardian: ['roar', .7], yeti: ['roar', .9], yetiking: ['roar', .7], ignar: ['roar', .6], demon: ['roar', .7], banditking: ['growl', .9] };
  function mobVoice(m, kind) {
    if (G.mute || (kind !== 'die' && G.t - (m.vT || 0) < 2.8)) return; m.vT = G.t;
    const v = MV[m.id] || MV[MOB_ALIAS[m.id]] || ['growl', 1], sz = Math.max(.6, Math.min(1.5, 1 / Math.sqrt(m.sc || 1)));
    sfx(kind === 'die' ? 'mob_die' : m.boss && kind === 'aggro' ? 'boss_roar' : 'mob_' + v[0], { x: m.x, z: m.z, p: v[1] * sz, v: m.boss ? 1.3 : 1, force: true });
  }
  const swingOf = wt => ({ sword: 'swing_sword', axe: 'swing_axe', daggers: 'swing_daggers', staff: 'swing_staff', scepter: 'swing_staff', totem: 'swing_staff', wand: 'swing_magic', orb: 'swing_magic', tome: 'swing_magic', bow: 'swing_bow', longbow: 'swing_bow', compbow: 'swing_bow', crossbow: 'swing_crossbow' })[wt] || 'swing_sword';
  const SURF = { field: 'grass', forest: 'grass', ruins: 'stone', dunes: 'sand', tundra: 'snow', ashlands: 'ash', town: 'stone' };
  let audPreview = null; // prévia de ambiente/música pelo painel do administrador
  let audEnvT = 0, stepAcc = 0, lastX = null, lastZ = null, wingT = 0;
  function audioEnv() {
    if (audPreview && G.t < audPreview.until) return audPreview.env; audPreview = null;
    if (G.state !== 'play' || !G.player) return { zone: 'field', town: true, tod: 12, rain: 0, storm: 0, coast: 0, fight: 0, boss: 0 };
    const p = G.player; let fight = 0, boss = 0;
    for (const m of G.mobs) { if (m.dead || m.state !== 'chase') continue; const d = Math.hypot(m.x - p.x, m.z - p.z); if (d < 26) fight++; if (m.boss && d < 45) boss = 1; }
    return { zone: G.zone.id, town: inSafe(p.x, p.z), tod: G.tod, rain: precipType() === 'rain' ? wx.level : 0, storm: wx.id === 'storm' ? 1 : 0, coast: Math.max(0, Math.min(1, 1 - coastD(p.x, p.z) / 70)), fight: Math.min(1, fight / 4), boss };
  }
  function audioUpdate(dt) {
    if (G.mute) return;
    const p = G.player, play = G.state === 'play' && p && !G.dead; SND.listener(cam.x, cam.z, cam.yaw);
    let env = null; if ((audEnvT -= dt) <= 0) { audEnvT = .3; env = audioEnv(); }
    SND.tick(dt, env);
    if (!play) return;
    if (lastX != null && p.moving) { const d = Math.hypot(p.x - lastX, p.z - lastZ); if (d < 3) stepAcc += d; } else if (!p.moving) stepAcc = Math.min(stepAcc, .8);
    lastX = p.x; lastZ = p.z;
    const mnt = p.mount && MOUNTS[p.mount];
    if (mnt && mnt.fly) { wingT -= dt; if (p.moving && wingT <= 0) { wingT = .55; sfx('wing'); } }
    else { const stride = mnt ? 2.1 : 1.55; if (stepAcc >= stride) { stepAcc -= stride; sfx(mnt ? 'gallop' : 'step_' + (inSafe(p.x, p.z) ? 'stone' : (SURF[G.zone.id] || 'grass')), { force: true }); } }
  }

  /* ---------- grade espacial / colisão ---------- */
  const gkey = (cx, cz) => cx * 1024 + cz;
  function buildGrid() {
    grid.clear();
    for (const o of obstacles) {
      const x0 = Math.floor((o.x - o.r + GOFF) / GC), x1 = Math.floor((o.x + o.r + GOFF) / GC), z0 = Math.floor((o.z - o.r + GOFF) / GC), z1 = Math.floor((o.z + o.r + GOFF) / GC);
      for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) { const k = gkey(cx, cz); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(o); }
    }
  }
  function pushOut(e, rad, fly) {
    if (!fly) {
    const x0 = Math.floor((e.x - rad + GOFF) / GC), x1 = Math.floor((e.x + rad + GOFF) / GC), z0 = Math.floor((e.z - rad + GOFF) / GC), z1 = Math.floor((e.z + rad + GOFF) / GC);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
      const a = grid.get(gkey(cx, cz)); if (!a) continue;
      for (const o of a) {
        let dx = e.x - o.x, dz = e.z - o.z, d = Math.hypot(dx, dz); const min = o.r + rad;
        if (d < min) { if (d < 1e-4) { dx = 1; dz = 0; d = 1; } e.x = o.x + dx / d * min; e.z = o.z + dz / d * min; }
      }
    }
    }
    landClamp(e);
  }
  /* ninguém entra no mar: se passou da linha d'água, volta pela direção da costa (gradiente de coastD) */
  const SHORE_MIN = .5;
  function landClamp(e) {
    const g = ZGRID; if (g) { const i = Math.floor((e.x - WB.x0) / g.S), j = Math.floor((e.z - WB.z0) / g.S); if (i >= 0 && j >= 0 && i < g.nx && j < g.nz && g.C[j * g.nx + i] > 8) return; }
    for (let k = 0; k < 4; k++) {
      const c = coastD(e.x, e.z); if (c >= SHORE_MIN) return;
      const h = 1.5, gx = coastD(e.x + h, e.z) - coastD(e.x - h, e.z), gz = coastD(e.x, e.z + h) - coastD(e.x, e.z - h), gl = Math.hypot(gx, gz) || 1, gk = gl / (2 * h) || 1;
      const st = (SHORE_MIN - c) / Math.max(.3, gk) + .05; e.x += gx / gl * st; e.z += gz / gl * st;
    }
  }
  function blocked(x, z, rad) {
    const x0 = Math.floor((x - rad + GOFF) / GC), x1 = Math.floor((x + rad + GOFF) / GC), z0 = Math.floor((z - rad + GOFF) / GC), z1 = Math.floor((z + rad + GOFF) / GC);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
      const a = grid.get(gkey(cx, cz)); if (!a) continue;
      for (const o of a) if (Math.hypot(x - o.x, z - o.z) < o.r + rad) return true;
    }
    return false;
  }

  /* ---------- desvio de obstáculos (clique, NPC, item e modo automático) ----------
     Olha à frente no caminho; se um obstáculo (pedra, árvore, casa) estiver no caminho, mira num ponto ao lado dele.
     O lado escolhido fica guardado para não ficar indo e voltando. Se mesmo assim não houver progresso, troca de lado
     e, no modo automático, desiste do alvo por alguns segundos. */
  function nearObs(x, z, R) {
    const out = [], seen = new Set(), x0 = Math.floor((x - R + GOFF) / GC), x1 = Math.floor((x + R + GOFF) / GC), z0 = Math.floor((z - R + GOFF) / GC), z1 = Math.floor((z + R + GOFF) / GC);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) { const a = grid.get(gkey(cx, cz)); if (a) for (const o of a) if (!seen.has(o)) { seen.add(o); out.push(o); } }
    return out;
  }
  function steerAround(e, dx, dz, dist, rad) {
    // só conta obstáculo que o segmento até o destino (ou os próximos 4,5 m) realmente atravessa; obstáculo que contém o
    // próprio destino (NPC, pedra encostada no ponto) não é desviado — chega-se reto e a colisão segura.
    const L = Math.min(dist, 4.5); let hit = null, ht = 1e9, hc = 0;
    for (const o of nearObs(e.x + dx * L * .5, e.z + dz * L * .5, L * .5 + 3.5)) {
      const ox = o.x - e.x, oz = o.z - e.z, t = ox * dx + oz * dz, cr = dx * oz - dz * ox, need = o.r + rad + .2;
      if (t < 0 || t > L + need) continue;
      if (Math.hypot(ox - dx * dist, oz - dz * dist) < o.r + .05) continue; // o destino é o próprio obstáculo (NPC): chega reto
      const tc = Math.min(t, L); if (Math.hypot(ox - dx * tc, oz - dz * tc) >= need) continue;
      if (t < ht) { ht = t; hit = o; hc = cr; }
    }
    if (!hit) { if (e.av && G.t - e.av.t > .6) e.av = null; return [dx, dz]; }
    if (!e.av) e.av = { o: hit, side: hc > 0 ? -1 : 1, t: G.t };
    else { // obstáculo vizinho do anterior (muro/casa feitos de vários círculos): mantém o lado, senão fica trocando a cada quadro
      const q = e.av.o; if (q !== hit && Math.hypot(q.x - hit.x, q.z - hit.z) > q.r + hit.r + 1.2) e.av.side = hc > 0 ? -1 : 1;
      e.av.o = hit; e.av.t = G.t;
    }
    const sd = e.av.side, px = -dz * sd, pz = dx * sd, k = hit.r + rad + .55;
    const ax = hit.x + px * k - e.x, az = hit.z + pz * k - e.z, al = Math.hypot(ax, az) || 1;
    let nx = ax / al, nz = az / al;
    const hx = e.x - hit.x, hz = e.z - hit.z, hd = Math.hypot(hx, hz) || 1;
    if (hd < hit.r + rad + .35) { // encostado: anda pela tangente do lado escolhido, sem empurrar contra a pedra
      let tx = -hz / hd, tz = hx / hd; if (tx * px + tz * pz < 0) { tx = -tx; tz = -tz; }
      nx = tx; nz = tz;
    }
    return [nx, nz];
  }
  function freeSpot(x, z, fx, fz, rad) { // ponto livre mais próximo de (x, z): clique dentro/colado numa pedra vira a beirada dela
    const q = { x, z };
    for (let it = 0; it < 3 && blocked(q.x, q.z, rad); it++)
      for (const o of nearObs(q.x, q.z, rad + 3)) {
        let ux = q.x - o.x, uz = q.z - o.z, d = Math.hypot(ux, uz); const min = o.r + rad + .08; if (d >= min) continue;
        if (d < o.r * .5) { ux = fx - o.x; uz = fz - o.z; d = Math.hypot(ux, uz); } // bem no meio: lado de quem vem
        if (d < 1e-4) { ux = 1; uz = 0; d = 1; }
        q.x = o.x + ux / d * min; q.z = o.z + uz / d * min;
      }
    return q;
  }
  /* ---------- caminho dentro das vilas muradas (A* numa grade de 0,5 m) ----------
     Fora das vilas o desvio local basta; dentro delas casas e muralha formam becos, então o clique vira uma rota pelas ruas.
     Destino fora da vila: a rota passa pelo portão mais conveniente. */
  const TG = { cs: .5, half: TOWN_HS + 6, map: new Map() };
  function townGrid(v) {
    let g = TG.map.get(v.id); if (g) return g;
    const n = Math.ceil(TG.half * 2 / TG.cs), x0 = v.cx - TG.half, z0 = v.cz - TG.half, bl = new Uint8Array(n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = x0 + (i + .5) * TG.cs, z = z0 + (j + .5) * TG.cs; if (blocked(x, z, .55) || Math.hypot(x - v.portal[0], z - v.portal[1]) < 2.2) bl[i * n + j] = 1; } // a rota não atravessa o portal sem querer
    g = { v, n, x0, z0, bl }; TG.map.set(v.id, g); return g;
  }
  const inTG = (v, x, z) => Math.abs(x - v.cx) < TG.half - .6 && Math.abs(z - v.cz) < TG.half - .6;
  function tgCell(g, x, z) { // célula livre mais próxima
    const n = g.n, ci = clamp(Math.floor((x - g.x0) / TG.cs), 0, n - 1), cj = clamp(Math.floor((z - g.z0) / TG.cs), 0, n - 1);
    if (!g.bl[ci * n + cj]) return ci * n + cj;
    for (let r = 1; r < 8; r++) for (let a = -r; a <= r; a++) for (const [i, j] of [[ci + a, cj - r], [ci + a, cj + r], [ci - r, cj + a], [ci + r, cj + a]]) if (i >= 0 && j >= 0 && i < n && j < n && !g.bl[i * n + j]) return i * n + j;
    return -1;
  }
  function tgLine(g, a, b) { // linha reta livre entre duas células?
    const n = g.n, ai = a / n | 0, aj = a % n, bi = b / n | 0, bj = b % n, st = Math.max(Math.abs(bi - ai), Math.abs(bj - aj)) * 2 || 1;
    for (let k = 1; k < st; k++) { const i = Math.round(ai + (bi - ai) * k / st), j = Math.round(aj + (bj - aj) * k / st); if (g.bl[i * n + j]) return false; }
    return true;
  }
  function tgPath(g, x, z, tx, tz) {
    const n = g.n, s = tgCell(g, x, z), t = tgCell(g, tx, tz); if (s < 0 || t < 0) return null;
    const N = n * n, gs = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), done = new Uint8Array(N), ti = t / n | 0, tj = t % n;
    const h = c => { const di = Math.abs((c / n | 0) - ti), dj = Math.abs(c % n - tj); return Math.max(di, dj) + .414 * Math.min(di, dj); };
    const heap = [[h(s), s]]; gs[s] = 0;
    const push = e => { heap.push(e); let i = heap.length - 1; while (i) { const q = (i - 1) >> 1; if (heap[q][0] <= heap[i][0]) break; [heap[q], heap[i]] = [heap[i], heap[q]]; i = q; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    let found = false;
    while (heap.length) {
      const [, c] = pop(); if (done[c]) continue; done[c] = 1; if (c === t) { found = true; break; }
      const ci = c / n | 0, cj = c % n;
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue; const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= n || j >= n) continue; const k = i * n + j;
        if (g.bl[k] || done[k] || (di && dj && (g.bl[ci * n + j] || g.bl[i * n + cj]))) continue;
        const ng = gs[c] + (di && dj ? 1.414 : 1); if (ng < gs[k]) { gs[k] = ng; from[k] = c; push([ng + h(k), k]); }
      }
    }
    if (!found) return null;
    const cells = []; for (let c = t; c >= 0; c = from[c]) cells.push(c); cells.reverse();
    const out = []; let a = cells[0];
    for (let k = 1; k < cells.length; k++) if (k === cells.length - 1 || !tgLine(g, a, cells[k + 1])) { a = cells[k]; out.push(a); }
    return out.map(c => [g.x0 + ((c / n | 0) + .5) * TG.cs, g.z0 + (c % n + .5) * TG.cs]);
  }
  function townRoute(e, tx, tz) { // próximo ponto da rota até (tx, tz), ou null se não precisa de rota
    let v = null; for (const q of VILLAGES) if (isTown(q) && (inTG(q, e.x, e.z) || inTG(q, tx, tz))) { v = q; break; }
    if (!v) { e.path = null; return null; }
    const dd = Math.hypot(tx - e.x, tz - e.z);
    if (dd < 6) { // perto e com a linha reta livre: vai direto (a grade do A* é mais grossa e faria uma volta à toa)
      let free = true; for (let k = 1, N = Math.ceil(dd / .25); k < N && free; k++) if (blocked(e.x + (tx - e.x) * k / N, e.z + (tz - e.z) * k / N, .3)) free = false;
      if (free) { e.path = null; return null; }
    }
    const pIn = inTG(v, e.x, e.z), tIn = inTG(v, tx, tz), H = TOWN_HS + 3.2;
    const gates = [[v.cx, v.cz - H], [v.cx, v.cz + H], [v.cx - H, v.cz], [v.cx + H, v.cz]];
    let gi = -1; if (!pIn || !tIn) { let bd = 1e9; gates.forEach((q, i) => { const d = Math.hypot(q[0] - e.x, q[1] - e.z) + Math.hypot(q[0] - tx, q[1] - tz); if (d < bd) { bd = d; gi = i; } }); }
    const key = v.id + (tIn ? Math.round(tx * 2) + ',' + Math.round(tz * 2) : 'g' + gi) + (pIn ? '' : 'o');
    if (!e.path || e.path.key !== key) {
      const g = townGrid(v);
      let pts;
      if (pIn && tIn) pts = tgPath(g, e.x, e.z, tx, tz);
      else if (pIn) { pts = tgPath(g, e.x, e.z, gates[gi][0], gates[gi][1]); if (pts) pts.push([tx, tz]); }
      else { const o = [v.cx + (gates[gi][0] - v.cx) * 1.18, v.cz + (gates[gi][1] - v.cz) * 1.18], q = tgPath(g, gates[gi][0], gates[gi][1], tx, tz); pts = q ? [o, gates[gi]].concat(q) : null; }
      e.path = { key, pts: pts || [], i: 0 };
    }
    const P = e.path; while (P.i < P.pts.length - 1 && Math.hypot(P.pts[P.i][0] - e.x, P.pts[P.i][1] - e.z) < .45) P.i++;
    if (!P.pts.length || (P.i === P.pts.length - 1 && Math.hypot(P.pts[P.i][0] - e.x, P.pts[P.i][1] - e.z) < 1.2)) return null; // fim da rota: segue direto ao alvo
    return P.pts[P.i];
  }
  /* rota local (A* numa grade de 0,5 m em volta do jogador e do alvo), montada só quando o desvio local empaca — cercados, curvas de muro */
  function buildLocal(e, tx, tz) {
    const cx = (e.x + tx) / 2, cz = (e.z + tz) / 2, half = clamp(Math.hypot(tx - e.x, tz - e.z) / 2 + 10, 12, 30), n = Math.ceil(half * 2 / TG.cs), x0 = cx - half, z0 = cz - half, bl = new Uint8Array(n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (blocked(x0 + (i + .5) * TG.cs, z0 + (j + .5) * TG.cs, .55)) bl[i * n + j] = 1;
    const pts = tgPath({ n, x0, z0, bl }, e.x, e.z, tx, tz);
    e.lpath = pts && pts.length ? { pts, i: 0, tx, tz, until: G.t + 25 } : null;
    return !!e.lpath;
  }
  function localRoute(e, tx, tz) {
    const L = e.lpath; if (!L) return null;
    if (Math.hypot(L.tx - tx, L.tz - tz) > 2.5 || G.t > L.until) { e.lpath = null; return null; }
    while (L.i < L.pts.length - 1 && Math.hypot(L.pts[L.i][0] - e.x, L.pts[L.i][1] - e.z) < .45) L.i++;
    if (L.i === L.pts.length - 1 && Math.hypot(L.pts[L.i][0] - e.x, L.pts[L.i][1] - e.z) < 1.2) { e.lpath = null; return null; }
    return L.pts[L.i];
  }
  function giveUp() { // não há caminho: desiste deste alvo por um tempo
    if (!cmd) return;
    if (cmd.mob) cmd.mob.noReach = G.t + 10;
    if (cmd.item) cmd.item.noReach = G.t + 10;
    if (cmd.mob && tmob === cmd.mob) tmob = null;
    const n = cmd.type === 'npc' && cmd.npc, p = G.player; cmd = null;
    if (n && Math.hypot(n.x - p.x, n.z - p.z) < 6) { face(n.x, n.z); UI.openDialog(n.id); } // já está perto (balcão no meio): fala assim mesmo
  }
  function trackStuck(e, moved, want, dt, tx, tz, wx, wz) {
    const s = e.stk || (e.stk = { t: 0, want: 0, n: 0, x: e.x, z: e.z });
    // progresso real até o destino (ou próximo ponto da rota): andar em volta de uma pedra/NPC move bastante mas não aproxima
    const dg = Math.hypot(tx - e.x, tz - e.z), dw = Math.hypot(wx - e.x, wz - e.z), pg = e.prog;
    if (!pg || pg.c !== cmd || Math.hypot(pg.tx - wx, pg.tz - wz) > (wx !== tx || wz !== tz ? .05 : 2)) e.prog = { c: cmd, tx: wx, tz: wz, best: dw, t: G.t, n: pg && pg.c === cmd ? pg.n : 0, lp: !!(pg && pg.c === cmd && pg.lp) };
    else {
      pg.tx = wx; pg.tz = wz;
      if (dw < pg.best - .3) { pg.best = dw; pg.t = G.t; }
      else if (G.t - pg.t > 2.5) { // 2,5 s sem chegar mais perto: está rodando em volta de algo
        const town = !!(e.path && e.path.pts.length); pg.t = G.t; pg.best = dw; e.detour = null; e.path = null; e.lpath = null;
        if (cmd && cmd.type === 'move' && dg < 3) { cmd = null; e.prog = null; return; } // já está do lado: considera que chegou
        if (!pg.lp && !town && !(e.mount && MOUNTS[e.mount].fly)) { pg.lp = true; if (buildLocal(e, tx, tz)) return; pg.n++; } // sem caminho nem pela grade: desiste mais cedo // 1ª vez: procura um caminho de verdade
        if (++pg.n >= 3) { giveUp(); e.prog = null; return; }
        if (e.av) e.av.side *= -1; // tenta pelo outro lado
      }
    }
    s.t += dt; s.want += want;
    if (s.t < .6) return;
    const net = Math.hypot(e.x - s.x, e.z - s.z);
    if (net < s.want * .35) { // andou quase nada (ou ficou indo e voltando)
      s.n++; if (e.av && s.n % 2 === 0) e.av.side *= -1; e.path = null; // troca de lado só a cada 2 travadas, senão vira um pêndulo
      // desvio: um ponto ao lado, perpendicular ao destino, alternando o lado a cada tentativa
      const dx = tx - e.x, dz = tz - e.z, l = Math.hypot(dx, dz) || 1, sd = s.n % 2 ? 1 : -1, k = 2.5 + s.n;
      const cx = e.x + (-dz / l * sd) * k - dx / l * .8, cz = e.z + (dx / l * sd) * k - dz / l * .8;
      if (s.n >= 2 && e.prog && !e.prog.lp && !e.path && !(e.mount && MOUNTS[e.mount].fly)) { e.prog.lp = true; if (buildLocal(e, tx, tz)) { s.n = 0; s.t = s.want = 0; s.x = e.x; s.z = e.z; return; } e.prog.n++; }
      if (!blocked(cx, cz, .6)) e.detour = { x: cx, z: cz, until: G.t + 1.1 };
      if (s.n >= 4 && cmd && e.prog && e.prog.lp) {
        if (cmd.type === 'move' && dg < 3) cmd = null; else if (cmd.auto || cmd.mob || cmd.item || cmd.type === 'move') giveUp();
        e.detour = null; s.n = 0;
      }
    } else s.n = 0;
    s.t = s.want = 0; s.x = e.x; s.z = e.z;
  }

  /* ---------- jogador / stats ---------- */
  function newPlayer(cls, look, name) {
    G.player = {
      cls, name: name || 'Herói', attr: { str: 0, dex: 0, int: 0, vit: 0, spi: 0 }, ap: 0, tier: 0, lvl: 1, xp: 0, gold: 60, x: 4, z: 4, rot: 0, hp: 1, maxHp: 1, mp: 1, maxMp: 1,
      inv: [], eq: { w: null, h: null, a: null, l: null, b: null, c: null }, pots: { hp: 5, mp: 3 }, cd: [0, 0, 0, 0, 0, 0, 0], sk: [0, 0, 0, 0, 0, 0, 0], sp: SK_PTS_LEVEL, feed: 0, mst: 100, mlv: {}, mbox: [],
      buffs: { atk: { v: 0, t: 0 }, def: { v: 0, t: 0 }, spd: { v: 0, t: 0 }, dodge: { v: 0, t: 0 }, crit: { v: 0, t: 0 }, aspd: { v: 0, t: 0 }, leech: { v: 0, t: 0 } }, shield: { hp: 0, t: 0 },
      atkCd: 0, atkT: 0, flash: 0, moving: false, dash: null, potCd: { hp: 0, mp: 0 },
      look: Object.assign({}, DEFLOOK[cls] || DEFLOOK.vanguard, look || {}), mounts: [], mount: null, lastMount: null,
      mats: {}, gifts: {},
    };
    G.quests = {}; for (const q of QUESTS) G.quests[q.id] = { state: 'locked', prog: 0 };
    newProgress();
    G.dead = false; tmob = null; cmd = null; pet = null;
    recalc(); G.player.hp = G.stats.maxHp; G.player.mp = G.stats.maxMp;
    updateQuestLocks(true);
  }
  const EL = p => effLv(p.lvl, p.tier); // nível efetivo (escala 1..50 do conteúdo)
  function recalc() {
    const p = G.player, c = CLASSES[p.cls], b = c.base, g = c.grow, l = EL(p) - 1, E = p.eq, w = E.w, ac = E.c;
    const ad = { atk: 0, def: 0, hpp: 0, crit: 0, arc: 0 }; // adicionais das pedras
    for (const s of SLOT_ORDER) { const it = E[s]; if (it && Array.isArray(it.adds)) for (const a of it.adds) if (a && a.k in ad) ad[a.k] += +a.v || 0; }
    const T = tmul(p.tier), A = p.attr, intCls = c.main === 'int'; // tier multiplica os stats base
    let atk = (b.atk + g.atk * l) * T + (w ? w.atk * itemMul(w) : 0) + ad.atk, eDef = 0, eHp = 0, eSpd = 0, eMp = 0, eDodge = 0;
    for (const s of ['h', 'a', 'l', 'g', 'b']) { const it = E[s]; if (it) { if (it.atk) atk += it.atk * itemMul(it); eDef += it.def * itemMul(it); eHp += it.hp * itemMul(it); if (it.spd) eSpd += it.spd; if (it.mp) eMp += it.mp * itemMul(it); if (it.dodge) eDodge += it.dodge; } }
    let def0 = (b.def + g.def * l) * T + eDef + ad.def;
    let maxHp = ((b.hp + g.hp * l) * T + eHp) * (1 + ad.hpp);
    const maxMp = ((b.mp + g.mp * l) * T + (ac ? ac.mp * itemMul(ac) : 0) + eMp) * (1 + .02 * A.int) * (1 + ad.arc);
    let crit = b.crit + (ac ? ac.crit : 0) + ad.crit;
    atk *= 1 + (c.main === 'dex' ? .007 : .008) * (A[c.main] || A.str | 0); maxHp *= 1 + .012 * A.vit; def0 *= 1 + .006 * A.vit; crit += .003 * A.dex;
    const set = SLOT_ORDER.every(s => E[s]) && SLOT_ORDER.every(s => E[s].grade === E.a.grade);
    if (set) { atk *= 1.15; maxHp *= 1.15; }
    const mb = p.lastMount && MOUNTS[p.lastMount] ? MOUNTS[p.lastMount].bon : null, mk = mountLvBon(mountLv(p.lastMount));
    if (mb) { const mm = p.mount ? 1 : .5; atk *= 1 + (mb.atk || 0) * mk * mm; maxHp *= 1 + (mb.hp || 0) * mk * mm; def0 *= 1 + (mb.def || 0) * mk * mm; crit += (mb.crit || 0) * mk * mm; }
    G.eqSpd = eSpd;
    const bf = p.buffs, S = G.stats;
    S.atk = atk * (1 + (bf.atk.t > 0 ? bf.atk.v : 0)); S.def = def0 * (1 + (bf.def.t > 0 ? bf.def.v : 0));
    S.skillMul = (1 + (intCls ? .004 : .008) * A.int) * (1 + ad.arc);
    S.dodge = Math.min(.6, Math.min(.35, (b.dodge || 0) + eDodge + .0015 * A.dex) + (bf.dodge.t > 0 ? bf.dodge.v : 0)); // teto de 35% sem buff
    S.aspd = (b.aspd || 1) * (1 + (bf.aspd.t > 0 ? bf.aspd.v : 0)); S.leech = bf.leech.t > 0 ? bf.leech.v : 0; S.tierMul = T;
    crit = Math.min(.6, crit) + (bf.crit.t > 0 ? bf.crit.v : 0); S.dr = b.dr ? b.dr + .03 * p.tier : 0; S.healMul = 1 + .015 * p.attr.spi; S.potMul = 1 + .01 * p.attr.spi;
    S.crit = crit; S.spd = 5.4 * (1 + .001 * p.attr.dex) * (1 + (G.eqSpd || 0)) * (1 + (bf.spd.t > 0 ? bf.spd.v : 0)); S.maxHp = Math.round(maxHp); S.maxMp = Math.round(maxMp); S.setBonus = set; S.adds = ad;
    p.maxHp = S.maxHp; p.maxMp = S.maxMp; p.hp = Math.min(p.hp, p.maxHp); p.mp = Math.min(p.mp, p.maxMp);
  }
  /* conjuntos de presente entregues no baú da conta (Guarda de Carga), uma vez por personagem */
  const GIFTS = [{ id: 'l16', lvl: 16, rar: 0 }, { id: 'l26', lvl: 26, rar: 1 }];
  function checkGifts() {
    const p = G.player; p.gifts = p.gifts || {};
    for (const gf of GIFTS) {
      const gid = gf.id; // presentes só uma vez por personagem (evoluir de fase não dá nada)
      if (EL(p) < gf.lvl || p.gifts[gid]) continue;
      if (!ACC) accLoad(); if (!ACC) continue;
      for (const s of SLOT_ORDER) ACC.bank.items.push(buildItem(s, p.cls, gf.lvl, gf.rar, s === 'w' ? WTYPES[p.cls][0] : undefined, p.tier));
      ACC.bank.max = Math.max(bankMax(), ACC.bank.items.length);
      p.gifts[gid] = 1;
      const msg = 'Um conjunto ' + RARITY[gf.rar].n + ' de nível ' + gf.lvl + ' foi entregue no Baú';
      UI.toast('🎁 ' + msg); UI.log(msg + ' (baú da conta).', 'lvl'); save();
    }
  }
  const xpMul = () => Math.max(0, CFG.econ.xpMul) * EV_EFF.xpMul, goldMul = () => Math.max(0, CFG.econ.goldMul) * EV_EFF.goldMul;
  /* nível 29 no campo de treino: leva o personagem sozinho para a praça de Aldoria */
  function campGraduate() {
    const p = G.player, v = VILLAGES[0];
    UI.log('Treinamento concluído! O Instrutor Brann o enviou para Aldoria: procure o Capitão Roderic.', 'quest'); UI.toast('Treinamento concluído: indo para Aldoria');
    fxBurst(p.x, 1.2, p.z, [.6, .7, 1], 26, 5, .2); fxDisc(p.x, p.z, .5, 4, .8, [.6, .7, 1], .6);
    portalLock = true; p.path = null; p.x = v.arrive[0]; p.z = v.arrive[1]; cmd = null; tmob = null; autoHome = null; G.wasSafe = true;
    if (pet) { pet.x = p.x + 1.5; pet.z = p.z + 1.5; }
    cam.init = false; fxBurst(p.x, 1.2, p.z, [.6, .7, 1], 26, 5, .2); fxDisc(p.x, p.z, .5, 4, .8, [.6, .7, 1], .6); save();
  }
  function gainXp(n, scaled) { // multiplicador global de XP (CFG + eventos); scaled = já multiplicado
    const p = G.player; if (p.lvl >= lvCap(p.tier)) return;
    if (!scaled) n = Math.max(1, Math.round(n * xpMul()));
    p.xp += n; UI.float(p.x, 2.8, p.z, '+' + n + ' XP', 'xp');
    let up = false;
    let apG = 0, spG = 0;
    while (p.lvl < lvCap(p.tier) && p.xp >= xpPlayer(p.lvl, p.tier)) { p.xp -= xpPlayer(p.lvl, p.tier); const a0 = ptsAt(AP_PER_LEVEL, p.lvl, p.tier), s0 = ptsAt(SK_PTS_LEVEL, p.lvl, p.tier); p.lvl++; apG += ptsAt(AP_PER_LEVEL, p.lvl, p.tier) - a0; spG += ptsAt(SK_PTS_LEVEL, p.lvl, p.tier) - s0; up = true; }
    p.ap += apG; p.sp = (p.sp || 0) + spG;
    if (p.lvl >= lvCap(p.tier)) p.xp = 0;
    if (up) {
      recalc(); p.hp = p.maxHp; p.mp = p.maxMp;
      UI.levelUp(p.lvl); UI.log('Você alcançou o nível ' + p.lvl + '!' + (apG ? ' +' + apG + ' de atributo (painel C)' : '') + (spG ? ' +' + spG + ' de habilidade (Mestre de Habilidades)' : '') + '.', 'lvl'); sfx('level');
      fxDisc(p.x, p.z, .5, 6, .9, [1, .9, .4], .6); fxDisc(p.x, p.z, .5, 3.5, 1.2, [1, 1, .7], .5); fxPillar(p.x, p.z, 1.2, [1, .9, .4], 1.2);
      fxBurst(p.x, 1, p.z, [1, .9, .4], 24, 5, .22);
      updateQuestLocks(false); track('lvl', 0);
      if (G.zone && G.zone.id === 'camp' && EL(p) >= CAMP.endLv && !G.dead) campGraduate();
      checkGifts();
      { const s = curStep(); if (s && EL(p) >= s.lvl && effLv(p.lvl - 1, p.tier) < s.lvl) UI.log('Nova etapa da história liberada: ' + stepTitle(s), 'quest'); }
    }
  }

  /* ---------- missões / evolução ---------- */
  function updateQuestLocks(silent) {
    for (let i = 0; i < QUESTS.length; i++) {
      const q = QUESTS[i], st = G.quests[q.id];
      if (st.state === 'locked' && EL(G.player) >= q.lvl && (q.after ? G.quests[q.after].state === 'done' : (i === 0 || G.quests[QUESTS[i - 1].id].state === 'done'))) {
        st.state = 'available'; if (!silent) UI.log('Nova missão disponível: ' + q.n + '. Fale com um Ancião.', 'quest');
      }
    }
  }
  function questKill(m) {
    for (const q of QUESTS) {
      const st = G.quests[q.id]; if (st.state !== 'active') continue;
      const goal = q.kill || 1;
      if ((q.zone && !m.boss && m.zone === q.zone) || (q.boss && m.boss && m.id === q.boss)) {
        st.prog = Math.min(goal, st.prog + 1);
        if (st.prog >= goal) { st.state = 'ready'; UI.log('Missão concluída: ' + q.n + '. Retorne a um Ancião.', 'quest'); UI.toast('Missão concluída!'); }
        else UI.log(q.n + ': ' + st.prog + '/' + goal, 'quest');
      }
    }
  }
  function acceptQuest(id) {
    const st = G.quests[id]; if (!st || st.state !== 'available') return;
    st.state = 'active'; st.prog = 0; UI.log('Missão aceita: ' + QUESTS.find(q => q.id === id).n, 'quest'); UI.refreshPanels();
  }
  function turnInQuest(id) {
    const st = G.quests[id], q = QUESTS.find(x => x.id === id), p = G.player; if (!st || st.state !== 'ready') return;
    st.state = 'done'; p.gold += q.rew.gold; p.pots.hp += q.rew.pots; p.pots.mp += q.rew.pots;
    UI.log('Missão entregue: ' + q.n + ' (+' + q.rew.xp + ' XP, +' + q.rew.gold + ' ouro, +' + q.rew.pots + ' poções de cada)', 'quest'); sfx('quest');
    track('gold', q.rew.gold); track('quest', 1); gainXp(q.rew.xp); updateQuestLocks(false); UI.refreshPanels();
  }
  /* ---------- história principal (story.js) ---------- */
  function newProgress() {
    G.main = { i: 0, prog: 0, chaps: [], v: 1 };
    G.rec = { kill: 0, elite: 0, boss: 0, bossU: [], skill: 0, crit: 0, gold: 0, loot: 0, quest: 0, refine: 0, legend: 0, regions: [], disc: [], enc: 0, daily: 0, plus: 0, ach: [] };
    G.daily = null;
  }
  const curStep = () => MAIN[G.main.i] || null;
  const chapN = () => G.main.chaps.filter(k => k !== 'c0').length; // capítulos da história (o prólogo do campo de treino não conta)
  /* eventos do tutorial (etapas 'do' da história): ev = 'move' | 'open:<janela>' | 'learn' | 'skill' | 'potion' */
  function mainEv(ev) { const s = G.main && curStep(); if (!s || !stepOpen(s) || s.k !== 'do' || s.ev !== ev) return; G.main.prog++; if (G.main.prog >= stepGoal(s)) stepDone(); }
  const stepOpen = s => s && EL(G.player) >= s.lvl;
  function stepDone() {
    const s = curStep(); if (!s) return;
    const p = G.player, r = stepReward(s);
    p.gold += r.gold; track('gold', r.gold); track('quest', 1);
    UI.log('História: ' + stepTitle(s) + ' concluída (+' + fmt(r.xp) + ' XP, +' + fmt(r.gold) + ' ouro).', 'quest'); sfx('quest');
    gainXp(r.xp);
    const nx = MAIN[s.i + 1];
    if (!nx || nx.ch !== s.ch) { // fim de capítulo
      const c = CHAP[s.ch]; G.main.chaps.push(c.id); p.gold += c.rew.gold;
      const slot = SLOT_ORDER[Math.floor(rnd() * SLOT_ORDER.length)], it = makeItem(slot, p.cls, Math.max(Math.round(EL(p)), c.lv[1] - 2), 0, p.tier); it.rq = Math.floor(EL(p)); // recompensa de capítulo: sempre utilizável na hora
      if (it.rar < c.rew.item) { const f = RARITY[c.rew.item].m / RARITY[it.rar].m; it.rar = c.rew.item; for (const k of ['atk', 'def', 'hp', 'mp']) if (it[k]) it[k] = Math.round(it[k] * f); if (it.crit) it.crit = +(it.crit * f).toFixed(3); if (it.spd) it.spd = +(it.spd * f).toFixed(3); }
      if (p.inv.length < 24) p.inv.push(it); else items.push({ it, x: p.x + 1, z: p.z, t0: G.t, ph: 0 });
      UI.toast('✦ ' + c.n.split('—')[0].trim() + ' concluído!'); UI.log('Capítulo concluído: ' + c.n + '. Recompensa: ' + fmt(c.rew.gold) + ' ouro e ' + itemName(it) + ' (' + RARITY[it.rar].n + ').', 'lvl');
      fxPillar(p.x, p.z, 1.4, [1, .85, .4], 1.6); fxRing(p.x, 1, p.z, .5, 8, 1, [1, .85, .4], .9, 2);
      track('chap', 0);
    } else UI.toast('História: próxima etapa');
    G.main.i++; G.main.prog = 0; G.main.mx = null;
    const n2 = curStep();
    if (n2 && !stepOpen(n2)) UI.log('Próxima etapa da história no nível ' + dispLv(n2.lvl, p.tier) + '.', 'quest');
    UI.refreshPanels();
  }
  function mainKill(m) {
    const s = curStep(); if (!stepOpen(s)) return;
    let hit = false;
    if (s.k === 'kill') hit = !m.boss && (s.zone ? m.zone === s.zone : s.mobs.includes(m.id));
    else if (s.k === 'elite') hit = m.elite && m.zone === s.zone;
    else if (s.k === 'boss') hit = m.boss && m.id === s.boss;
    else if (s.k === 'collect' && !m.boss && s.mobs.includes(m.id) && rnd() < s.chance) { hit = true; UI.float(m.x, (m.hgt || 2) + 1.3, m.z, '+1 ' + s.item, 'xp'); }
    if (!hit) return;
    G.main.prog++;
    const goal = stepGoal(s);
    if (G.main.prog >= goal) stepDone(); else UI.log((s.item || stepTitle(s)) + ': ' + G.main.prog + '/' + goal, 'quest');
  }
  function mainUpdate() {
    const s = curStep();
    if (stepOpen(s) && s.k === 'do' && s.ev === 'move') { const p = G.player; if (!G.main.mx) G.main.mx = [p.x, p.z]; else if (Math.hypot(p.x - G.main.mx[0], p.z - G.main.mx[1]) >= 12) mainEv('move'); return; }
    if (!stepOpen(s) || s.k !== 'explore') return;
    const p = G.player; if (Math.hypot(p.x - s.x, p.z - s.z) < s.r) { UI.toast('Descoberto: ' + s.place); stepDone(); }
  }
  function storyTalk(npc) {
    const s = curStep(); if (!stepOpen(s) || s.k !== 'talk' || s.npc !== npc) return;
    stepDone();
  }
  /* ---------- desafios diários e conquistas ---------- */
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function dailyCheck() {
    const d = today(); if (G.daily && G.daily.day === d) return;
    let h = 0; for (const ch of d) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const pick = []; while (pick.length < 3) { h = (h * 1103515245 + 12345) >>> 0; const k = h % DAILY_POOL.length; if (!pick.includes(k)) pick.push(k); }
    G.daily = { day: d, list: pick.map(pi => ({ pi, prog: 0, done: false, claimed: false })) };
  }
  function dailyReward() { const l = Math.round(EL(G.player)); return { xp: Math.round(xpNeed(l) * .35), gold: Math.round(80 + l * 40), pots: 2 + Math.floor(l / 10) }; }
  function claimDaily(k) {
    dailyCheck(); const d = G.daily.list[k | 0]; if (!d || !d.done || d.claimed) return;
    const r = dailyReward(), p = G.player; d.claimed = true; p.gold += r.gold; p.pots.hp += r.pots; p.pots.mp += r.pots; gainXp(r.xp); track('daily', 1);
    UI.log('Desafio diário concluído! +' + fmt(r.xp) + ' XP, +' + fmt(r.gold) + ' ouro, +' + r.pots + ' poções.', 'quest'); sfx('level'); UI.refreshPanels();
  }
  function track(k, n) {
    const R_ = G.rec; if (!R_) return;
    if (k in R_ && typeof R_[k] === 'number') R_[k] += n;
    if (G.daily) for (const d of G.daily.list) { const D = DAILY_POOL[d.pi]; if (!d.done && D.k === k) { d.prog = Math.min(D.n, d.prog + n); if (d.prog >= D.n) { d.done = true; UI.toast('Desafio diário pronto: ' + D.t); UI.log('Desafio diário pronto: ' + D.t + '. Resgate no painel de missões (Q).', 'quest'); } } }
    for (const a of ACHIEVEMENTS) {
      if (R_.ach.includes(a.id)) continue;
      const v = a.k === 'lvl' ? Math.floor(EL(G.player)) : a.k === 'chap' ? chapN() : a.k === 'bossU' ? R_.bossU.length : a.k === 'regions' ? R_.regions.length : a.k === 'disc' ? R_.disc.length : R_[a.k];
      if (v >= a.n_) {
        R_.ach.push(a.id); if (a.rew) G.player.gold += a.rew;
        UI.toast('🏆 Conquista: ' + a.n); UI.log('Conquista desbloqueada: ' + a.n + ' — ' + (a.k === 'lvl' ? 'Alcance o nível ' + dispLv(a.n_, G.player.tier) : a.t) + (a.rew ? ' (+' + fmt(a.rew) + ' ouro)' : ''), 'lvl'); sfx('achievement');
      }
    }
  }
  const fmt = n => Math.round(n).toLocaleString('pt-BR');

  /* evolução: nível 50 + ouro. Volta ao nível 1 sem nada equipado; equipamento e mochila vão para o baú da conta */
  function canEvolve() {
    const p = G.player, nt = p.tier + 1, cost = EVO_COST[p.tier];
    if (!TIERS[nt]) return { ok: false, reason: 'Você já alcançou a forma máxima: ' + TIERS[p.tier] + '.', nextTier: null, cost: 0 };
    if (p.lvl < lvCap(p.tier)) return { ok: false, reason: 'Requer nível ' + lvCap(p.tier) + '.', nextTier: nt, cost };
    if (p.gold < cost) return { ok: false, reason: 'Ouro insuficiente (' + fmt(cost) + ').', nextTier: nt, cost };
    return { ok: true, reason: '', nextTier: nt, cost };
  }
  function evolve() {
    const c = canEvolve(), p = G.player; if (!c.ok) return { ok: false, msg: c.reason };
    p.gold -= c.cost;
    // só muda a fase: nível, pontos e habilidades voltam ao início; itens (equipados e da mochila), ouro, montarias, história e conquistas ficam.
    // Não há kit inicial nem presentes: o jogador dropa, farma e compra o equipamento da fase nova.
    p.tier = c.nextTier; p.lvl = 1; p.xp = 0; p.sp = SK_PTS_LEVEL; p.ap = 0; p.attr = { str: 0, dex: 0, int: 0, vit: 0, spi: 0 };
    p.sk = p.sk.map(v => v ? 1 : 0); p.cd = p.cd.map(() => 0);
    for (const k in p.buffs) p.buffs[k].t = 0; p.shield = { hp: 0, t: 0 }; pet = null;
    retierMobs(); recalc(); p.hp = p.maxHp; p.mp = p.maxMp;
    UI.toast('Você se tornou ' + TIERS[p.tier] + '!'); UI.log('Evolução: ' + TIERS[p.tier] + '! Você voltou ao nível 1 com poder ×' + tmul(p.tier) + '. Nenhum item foi entregue: dropar, farmar e comprar são com você.', 'lvl'); sfx('evolve');
    for (let i = 0; i < 3; i++) fxDisc(p.x, p.z, .5, 5 + i * 1.5, 1 + i * .3, i % 2 ? [.6, .8, 1] : [1, .85, .3], .55);
    fxPillar(p.x, p.z, 1.5, [1, .95, .6], 1.8); fxBurst(p.x, 1, p.z, [1, .95, .6], 40, 6, .25);
    save(); UI.refreshPanels(); return { ok: true, msg: 'Você se tornou ' + TIERS[p.tier] + '!' };
  }

  /* ---------- equipamento / loja ---------- */
  function equip(id) {
    const p = G.player, i = p.inv.findIndex(x => x.id === Number(id)); if (i < 0) return;
    const it = p.inv[i], old = p.eq[it.slot];
    if (it.cls && it.cls !== p.cls) { UI.toast('Equipamento de ' + CLASSES[it.cls].name); UI.log('Não é possível equipar ' + itemName(it) + ': é equipamento de ' + CLASSES[it.cls].name + ' (você é ' + CLASSES[p.cls].name + ').', 'sys'); sfx('hurt'); return; }
    if ((it.tierReq | 0) > p.tier) { UI.toast('Requer fase ' + TIERS[it.tierReq | 0]); UI.log('Não é possível equipar ' + itemName(it) + ': requer fase ' + TIERS[it.tierReq | 0] + '.', 'sys'); return; }
    const rq = itemReqLvl(it, p.tier); if (EL(p) < rq) { const dq = dispLv(rq, it.tierReq | 0); UI.toast('Requer nível ' + dq); UI.log('Não é possível equipar ' + itemName(it) + ': requer nível ' + dq + ' (você está no ' + p.lvl + '). Guarde no Baú.', 'sys'); sfx('hurt'); return; }
    p.eq[it.slot] = it; if (old) { old.pos = it.pos; p.inv[i] = old; } else p.inv.splice(i, 1); delete it.pos; // o item que sai ocupa o espaço do que entrou
    recalc(); sfx('pick'); UI.log('Equipado: ' + itemName(it), 'loot'); UI.refreshPanels();
  }
  function unequip(slot) {
    const p = G.player, it = p.eq[slot]; if (!it) return;
    if (p.inv.length >= 24) { UI.log('Inventário cheio.', 'sys'); return; }
    p.eq[slot] = null; delete it.pos; p.inv.push(it); recalc(); UI.refreshPanels();
  }
  /* acha um item na mochila ou equipado */
  function findItem(id) {
    const p = G.player; id = Number(id);
    const it = p.inv.find(x => x.id === id); if (it) return { it, eq: null };
    for (const s of SLOT_ORDER) if (p.eq[s] && p.eq[s].id === id) return { it: p.eq[s], eq: s };
    return null;
  }
  function deleteItem(id) {
    const p = G.player, i = p.inv.findIndex(x => x.id === Number(id)); if (i < 0) return { ok: false, msg: 'Itens equipados não podem ser excluídos.' };
    const it = p.inv.splice(i, 1)[0]; sfx('pick'); UI.log('Excluído: ' + itemName(it) + '.', 'sys'); save(); UI.refreshPanels(); return { ok: true, msg: 'Item excluído.' };
  }
  /* Joalheiro: engasta uma pedra (70% de chance, -15% por adicional já existente). A pedra e o ouro são gastos mesmo se falhar. */
  function jewel(id, sid) {
    const p = G.player, f = findItem(id), st = STONES[sid];
    if (!f) return { ok: false, msg: 'Escolha um item.' };
    if (!st) return { ok: false, msg: 'Escolha uma pedra.' };
    const it = f.it, n = (it.adds || []).length;
    if (n >= ADD_MAX) return { ok: false, msg: 'Este item já tem ' + ADD_MAX + ' adicionais.' };
    if (!p.mats || !(p.mats[sid] > 0)) return { ok: false, msg: 'Você não tem ' + st.n + '.' };
    const cost = jewelCost(it); if (p.gold < cost) return { ok: false, msg: 'Ouro insuficiente (' + cost + ').' };
    const ch = jewelChance(it); p.gold -= cost; p.mats[sid]--; if (p.mats[sid] <= 0) delete p.mats[sid];
    let r;
    if (rnd() < ch) {
      const a = { k: st.k, v: addVal(st.k, pgOf(it)) }; it.adds = (it.adds || []).concat([a]);
      recalc(); sfx('gem'); fxBurst(p.x, 1.4, p.z, [.8, .5, 1], 16, 3, .18);
      UI.log('O Joalheiro engastou ' + st.n + ' em ' + itemName(it) + ': ' + addTxt(a) + '.', 'loot'); r = { ok: true, msg: 'Sucesso! ' + itemName(it) + ' ganhou ' + addTxt(a) + '.' };
    } else { sfx('refinoFail'); UI.log('A ' + st.n + ' rachou. O engaste em ' + itemName(it) + ' falhou.', 'sys'); r = { ok: false, msg: 'Falhou! A pedra se partiu.' }; }
    save(); UI.refreshPanels(); return r;
  }
  function sellItem(id) {
    const p = G.player, i = p.inv.findIndex(x => x.id === Number(id)); if (i < 0) return;
    const it = p.inv[i], v = itemValue(it); p.inv.splice(i, 1); p.gold += v; sfx('coin');
    UI.log('Vendido: ' + itemName(it) + ' por ' + v + ' ouro.', 'loot'); UI.refreshPanels();
  }
  function buy(kind, n) {
    const p = G.player; n = n || 1; if (!POT[kind]) return;
    const cost = potPrice(kind) * n;
    if (p.gold < cost) { UI.log('Ouro insuficiente.', 'sys'); return; }
    p.gold -= cost; p.pots[kind] += n; sfx('coin'); UI.log('Comprou ' + n + 'x ' + POT[kind].n + '.', 'loot'); UI.refreshPanels();
  }
  /* ---------- aparência e montarias ---------- */
  function setLook(k, v) {
    const p = G.player; if (!p) return;
    if (k === 'hcx') { if (!hexRgb(v)) return; p.look.hcx = v; }
    else { const lim = LOOK_LIM[k]; if (!lim) return; p.look[k] = ((v % lim) + lim) % lim; if (k === 'hc') delete p.look.hcx; }
    fixLook(p.look);
    save(); UI.refreshPanels();
  }
  function addAttr(k, n) {
    const p = G.player; if (!p || !ATTRS[k]) return; n = Math.min(n || 1, p.ap); if (n <= 0) return;
    p.attr[k] += n; p.ap -= n; const hp = p.hp / (p.maxHp || 1), mp = p.mp / (p.maxMp || 1); recalc(); p.hp = Math.max(1, Math.round(p.maxHp * hp)); p.mp = Math.round(p.maxMp * mp); sfx('coin'); save(); UI.refreshPanels();
  }
  function resetAttr() {
    const p = G.player, cost = 50 * Math.round(EL(G.player)); if (!p) return;
    const spent = ATTR_KEYS.reduce((a, k) => a + p.attr[k], 0); if (!spent) return;
    if (p.gold < cost) { UI.log('Redistribuir custa ' + cost + ' ouro.', 'sys'); return; }
    p.gold -= cost; p.ap += spent; for (const k of ATTR_KEYS) p.attr[k] = 0; recalc(); sfx('potion'); UI.log('Pontos redistribuídos (-' + cost + ' ouro).', 'sys'); save(); UI.refreshPanels();
  }
  /* nível das montarias: p.mlv[id] = {lv, xp}; sem registro = nível 1 (saves antigos) */
  const mountRec = id => { const p = G.player; p.mlv = p.mlv || {}; return p.mlv[id] || (p.mlv[id] = { lv: 1, xp: 0 }); };
  const mountLv = id => { const p = G.player; return id && p && p.mlv && p.mlv[id] ? p.mlv[id].lv : 1; };
  const mountSpd = id => MOUNTS[id].spd * mountLvSpd(mountLv(id));
  const mstMax = () => mountLvMst(mountLv(G.player && G.player.lastMount));
  function mountXp(n, id) {
    const p = G.player; id = id || p.mount || p.lastMount; if (!id || !MOUNTS[id] || !p.mounts.includes(id)) return;
    const r = mountRec(id); if (r.lv >= MOUNT_MAXLV) { r.xp = 0; return; }
    r.xp += n; let up = false;
    while (r.lv < MOUNT_MAXLV && r.xp >= mountXpNeed(r.lv)) { r.xp -= mountXpNeed(r.lv); r.lv++; up = true; }
    if (r.lv >= MOUNT_MAXLV) r.xp = 0;
    if (up) { recalc(); sfx('level'); UI.toast(MOUNTS[id].n + ' subiu para o nível ' + r.lv + '!'); UI.log('Sua montaria ' + MOUNTS[id].n + ' alcançou o nível ' + r.lv + ' (mais velocidade, energia e bônus).', 'lvl'); UI.refreshPanels(); }
  }
  /* item "Montaria: X" (p.mbox) — usar adiciona à coleção; repetida dá um nível à montaria */
  function useMountItem(i) {
    const p = G.player, id = p.mbox && p.mbox[i]; if (!id || !MOUNTS[id]) return;
    p.mbox.splice(i, 1);
    if (!p.mounts.includes(id)) { p.mounts.push(id); mountRec(id); if (!p.lastMount) p.lastMount = id; recalc(); sfx('level'); UI.toast(MOUNTS[id].n + ' adicionada à coleção!'); UI.log('Nova montaria: ' + MOUNTS[id].n + '! Veja em Montarias [H].', 'loot'); }
    else { const r = mountRec(id); mountXp(r.lv < MOUNT_MAXLV ? mountXpNeed(r.lv) - r.xp : 0, id); UI.log(MOUNTS[id].n + ' repetida: sua montaria ganhou experiência.', 'loot'); }
    save(); UI.refreshPanels();
  }
  function dropMount(m) {
    const p = G.player, mt = m.boss ? 'boss' : m.champ ? 'champ' : m.elite ? 'elite' : 'normal', ch = (CFG.drop.mount || {})[mt] || 0;
    if (!(rnd() < ch)) return;
    let id = m.boss ? MOUNT_DROP.boss[m.id] : null;
    if (!id) { const L = MOUNT_DROP.zone[m.zone] || []; if (!L.length) return; id = L[Math.min(L.length - 1, Math.floor(rnd() * L.length + (m.champ || m.elite ? .5 : 0)))]; }
    if (!MOUNTS[id]) return;
    p.mbox = p.mbox || []; if (p.mbox.length >= 20) return;
    const had = p.mounts.includes(id); p.mbox.push(id); useMountItem(p.mbox.length - 1); // entra na coleção na hora (sem passo extra na mochila)
    UI.float(m.x, (m.hgt || 2) + 1.9, m.z, MOUNTS[id].ic + ' Montaria: ' + MOUNTS[id].n, 'xp'); UI.toast('Montaria encontrada: ' + MOUNTS[id].n + '!');
    UI.log('★ Montaria ' + (had ? 'repetida: ela ganhou um nível de experiência. ' : 'nova! ') + 'Abra Montarias [H]: Equipar dá o bônus, X monta, e ela evolui com XP (lute montado ou cavalgue).', 'lvl');
  }
  function restMount() {
    const p = G.player, mx = mstMax(), cost = 30; if ((p.mst == null ? mx : p.mst) >= mx) return { ok: false, msg: 'Sua montaria já está descansada.' };
    if (p.gold < cost) return { ok: false, msg: 'Ouro insuficiente (' + cost + ').' };
    p.gold -= cost; p.mst = mx; sfx('potion'); save(); UI.refreshPanels(); return { ok: true, msg: 'Sua montaria foi tratada e está com energia total.' };
  }
  function buyMount(id) {
    const p = G.player, m = MOUNTS[id]; if (!m || p.mounts.includes(id)) return;
    if (EL(p) < m.lvl) { UI.log('Requer nível ' + dispLv(m.lvl, p.tier) + '.', 'sys'); return; }
    if (p.gold < m.price) { UI.log('Ouro insuficiente.', 'sys'); return; }
    p.gold -= m.price; p.mounts.push(id); if (!p.lastMount) { p.lastMount = id; recalc(); } sfx('coin'); UI.log('Você adquiriu: ' + m.n + '! Equipada! Pressione X para montar.', 'loot'); UI.toast(m.n + ' adquirido!'); save(); UI.refreshPanels();
  }
  function dismount(quiet) { const p = G.player; if (!p || !p.mount) return; p.mount = null; recalc(); if (!quiet) UI.toast('Você desmontou'); }
  function equipMount(id) {
    const p = G.player; if (!p || !MOUNTS[id] || !p.mounts.includes(id)) return;
    if (p.lastMount === id) { p.lastMount = null; if (p.mount) dismount(true); UI.toast('Montaria desequipada'); }
    else { p.lastMount = id; if (p.mount) p.mount = id; UI.toast('Montaria equipada: ' + MOUNTS[id].n); sfx('pick'); }
    recalc(); UI.refreshPanels(); save();
  }
  function toggleMount(id) {
    const p = G.player; if (G.state !== 'play' || G.dead) return;
    if (p.mount && (!id || id === p.mount)) { dismount(); UI.refreshPanels(); return; }
    const mid = id || p.lastMount || p.mounts[p.mounts.length - 1];
    if (!mid || !p.mounts.includes(mid)) { if (throttle('nomount', 1)) UI.log('Você não possui montaria. Montarias caem de monstros (raro) e de chefes.', 'sys'); return; }
    if ((p.mst == null ? 100 : p.mst) < 5) { if (p.feed > 0) { p.feed--; p.mst = Math.min(mstMax(), 60 * mstMax() / 100); UI.toast('Sua montaria comeu uma ração'); } else { UI.toast('Montaria exausta: compre ração com o Cavalariço'); return; } }
    p.mount = p.lastMount = mid; recalc(); p.dash = null; cmd = null; sfx('level'); UI.toast('Montado: ' + MOUNTS[mid].n); UI.refreshPanels();
  }
  function toMenu() {
    if (G.state === 'play') { save(); G.state = 'menu'; G.dead = false; cmd = null; UI.closeAll(); UI.hideDeath(); UI.showMenu(hasSave()); }
  }
  const qualityName = () => R.q.name;
  function enhance(slot) { // aceita o espaço equipado ('w', 'h'...) ou o id de um item (equipado ou na mochila)
    const p = G.player, f = SLOTS[slot] ? null : findItem(slot), it = f ? f.it : p.eq[slot]; let res;
    if (!it) res = { ok: false, msg: f === null && SLOTS[slot] ? 'Nada equipado neste espaço.' : 'Escolha um item.' };
    else if (it.plus >= PLUS_MAX) res = { ok: false, msg: it.plus >= 10 ? 'Item Ancient: não refina mais.' : 'Refino máximo no Ferreiro: +9. Para o Ancient (+10), junte 2 peças +9 iguais com o Refinador.' };
    else {
      const cost = enhCost(it);
      if (p.gold < cost) res = { ok: false, msg: 'Ouro insuficiente (' + cost + ').' };
      else {
        p.gold -= cost;
        if (rnd() < enhChance(it.plus)) { it.plus++; recalc(); track('refine', 1); if (it.plus > G.rec.plus) { G.rec.plus = it.plus; track('plus', 0); } sfx('refinoOk'); res = { ok: true, msg: itemName(it) + ' refinado com sucesso!' }; }
        else { sfx('refinoFail'); res = { ok: false, msg: 'O refino falhou. Apenas o ouro foi perdido.' }; }
      }
    }
    UI.refreshPanels(); return res;
  }
  /* Refinador: funde 2 peças IGUAIS (mesmo espaço, classe, material/tipo, fase e refino) na mochila: 2× +9 → +10 Ancient (grátis); 2× +10 → +11 Ancient (100.000 de ouro) */
  function fuseItems(idA, idB) {
    const p = G.player, A = p.inv.find(x => x.id === Number(idA)), B = p.inv.find(x => x.id === Number(idB)); let res;
    if (!A || !B || A === B) res = { ok: false, msg: 'Escolha duas peças na mochila.' };
    else if ((A.plus | 0) < PLUS_MAX || (A.plus | 0) >= ANCIENT_MAX || fuseKey(A) !== fuseKey(B)) res = { ok: false, msg: 'As duas peças precisam ser iguais e ter o mesmo refino (+9 ou +10).' };
    else {
      const gold = A.plus >= 10 ? FUSE_GOLD : 0;
      if (p.gold < gold) res = { ok: false, msg: 'Ouro insuficiente (' + gold + ').' };
      else {
        p.gold -= gold; p.inv.splice(p.inv.indexOf(B), 1); A.plus++; recalc(); track('refine', 1); if (A.plus > G.rec.plus) { G.rec.plus = A.plus; track('plus', 0); }
        sfx('refinoOk'); fxBurst(p.x, 1.3, p.z, [1, .85, .3], 30, 5, .22); res = { ok: true, msg: itemName(A) + '! As duas peças foram fundidas.' }; save();
      }
    }
    UI.refreshPanels(); return res;
  }
  /* clique no portal: perto dele abre a lista de destinos; longe, anda até ele (a chegada abre a lista) */
  function clickPortal(v) {
    const p = G.player;
    if (Math.hypot(p.x - v.portal[0], p.z - v.portal[1]) < 4.5) { cmd = null; portalLock = true; fxBurst(p.x, 1.4, p.z, [.7, .6, 1], 18, 3, .18); UI.openDialog('portal:' + v.id); return; }
    cmd = { type: 'move', x: v.portal[0] + (v.cx - v.portal[0]) * .12, z: v.portal[1] + (v.cz - v.portal[1]) * .12 }; fxDisc(cmd.x, cmd.z, .2, .8, .5, [.7, .6, 1], .6);
  }
  function teleport(id) {
    const p = G.player, v = VILLAGES.find(q => q.id === id);
    if (!v || G.dead || G.state !== 'play') return null;
    const from = VILLAGES.find(q => Math.hypot(p.x - q.portal[0], p.z - q.portal[1]) < 6);
    if (from && from.id !== id && !from.links.includes(id)) return { ok: false, msg: 'Este portal não leva até ' + v.n + '.' };
    if (EL(p) < v.lvl) return { ok: false, msg: 'Requer nível ' + dispLv(v.lvl, p.tier) + '.' };
    if (p.gold < v.price) return { ok: false, msg: 'Ouro insuficiente (' + v.price + ').' };
    p.gold -= v.price; if (v.price) sfx('coin');
    fxBurst(p.x, 1.2, p.z, [.6, .7, 1], 26, 5, .2); fxDisc(p.x, p.z, .5, 4, .8, [.6, .7, 1], .6);
    portalLock = true; p.path = null; p.x = v.arrive[0]; p.z = v.arrive[1]; cmd = null; tmob = null; autoHome = null; G.wasSafe = true;
    if (pet) { pet.x = p.x + 1.5; pet.z = p.z + 1.5; }
    cam.init = false; sfx('level');
    fxBurst(p.x, 1.2, p.z, [.6, .7, 1], 26, 5, .2); fxDisc(p.x, p.z, .5, 4, .8, [.6, .7, 1], .6);
    UI.closeAll(); UI.toast('Você chegou: ' + v.n); UI.log('Viagem por portal: ' + v.n + (v.price ? ' (-' + v.price + ' ouro)' : '') + '.', 'sys'); save();
    return null;
  }
  function usePotion(kind) {
    const p = G.player; if (G.state !== 'play' || G.dead) return;
    if (p.pots[kind] <= 0) { if (throttle('nopot', .8)) UI.log('Sem ' + POT[kind].n + '.', 'sys'); return; }
    if (p.potCd[kind] > 0) return;
    mainEv('potion'); // o tutorial conta a tecla mesmo com a barra cheia
    if (kind === 'hp' && p.hp >= p.maxHp) return;
    if (kind === 'mp' && p.mp >= p.maxMp) return;
    p.pots[kind]--; p.potCd[kind] = 1.5;
    if (kind === 'hp') { const v = Math.round(p.maxHp * .4 * G.stats.potMul); p.hp = Math.min(p.maxHp, p.hp + v); UI.float(p.x, 2.8, p.z, '+' + v, 'heal'); fxBurst(p.x, 1, p.z, [1, .3, .3], 8, 2, .15); }
    else { const v = Math.round(p.maxMp * .4 * G.stats.potMul); p.mp = Math.min(p.maxMp, p.mp + v); UI.float(p.x, 2.8, p.z, '+' + v + ' MP', 'heal'); fxBurst(p.x, 1, p.z, [.3, .5, 1], 8, 2, .15); }
    sfx('potion');
  }

  /* ---------- monstros ---------- */
  function makeMob(zid, x, z, rng, forceElite) {
    // faixas de nível por bioma, alinhadas às missões: campos 1–12, floresta 13–30, ruínas 31–50
    // nível pela distância até Aldoria dentro da faixa da zona (zoneLvl em data.js): sobe conforme se afasta da capital
    const list = MOBS[zid], lvl = zoneLvl(zid, x, z) + (forceElite ? 2 : 0);
    let def = list[Math.floor(hash2(Math.floor(x * 7), Math.floor(z * 7)) * list.length) % list.length], elite = false;
    const el = ELITES[zid]; if (el && (forceElite || rng() < .11)) { def = el[Math.floor(rng() * el.length)]; elite = true; }
    const s = mobStats(lvl, elite ? ELITE_M : null), sc = (MOB_SC[def.id] || 1) * (.95 + rng() * .1) * (elite ? 1.25 : 1);
    if (elite) s.gold *= 3;
    if (zid === 'camp') { s.atk *= CAMP.atkK; s.hp = CAMP.hp[CAMP.lv.indexOf(lvl)] || s.hp; } // campo de treino: monstros fraquinhos
    const m = mobObj(def.id, def.n, zid, lvl, s, sc, MOB_COL[def.id], x, z, null, rng); m.elite = elite; return m;
  }
  /* o nível efetivo dos monstros acompanha o tier do jogador: vida, ataque e ouro × multiplicador do tier */
  function tierMob(m) {
    const T = tmul(G.player ? G.player.tier : 0), f = m.maxHp ? m.hp / m.maxHp : 1;
    m.T = T; m.maxHp = Math.round(m.bhp * T); m.hp = Math.max(1, Math.round(m.maxHp * f)); m.atk = m.batk * T; m.gold = Math.max(1, Math.round(m.bgold * T)); return m;
  }
  function retierMobs() { for (const m of G.mobs) tierMob(m); }
  function xpFor(m) { // bônus por monstro acima do nível; reduzido se 6+ níveis abaixo
    if (m.zone === 'camp' && EL(G.player) >= CAMP.endLv) return 0; // o campo de treino ensina só até o nível 29
    const df = m.lvl - EL(G.player);
    const f = df > 0 ? 1 + Math.min(1, .15 * df) : df <= -6 ? Math.max(.1, 1 - .2 * (-df - 5)) : 1;
    return Math.max(1, Math.round(m.xp * f));
  }
  function mobObj(id, name, zone, lvl, s, sc, col, x, z, bd, rng) {
    return tierMob({
      id, name, boss: !!bd, bd, zone, lvl, x, z, sx: x, sz: z, rot: rng() * 6.28, hp: s.hp, maxHp: s.hp, bhp: s.hp, batk: s.atk, bgold: s.gold, atk: s.atk, def: s.def, xp: s.xp, gold: s.gold,
      sc, rad: Math.max(.5, .55 * sc), col, spd: MSPD[id] || 3, range: bd ? 3.5 : 2 + (sc - 1) * .4, aggroR: bd ? 14 : 9, hgt: (HGT[id] || 2) * sc + .3,
      dead: false, deadT: 0, respawnAt: 0, state: 'idle', flash: 0, stun: 0, slow: 0, slowV: 0, mark: 0, markV: 0, dots: [], atkCd: rng(), atkT: 0, hitPend: false,
      wt: rng() * 4, wx: x, wz: z, wand: false, moving: false, ph: rng() * 10, slamCd: 3 + rng() * 3, warn: null, atkTarget: null,
    });
  }
  function populate() {
    G.mobs.length = 0; items.length = 0; fx.length = 0; projs.length = 0; delayed.length = 0; pet = null; tmob = null; cmd = null;
    const rng = mulberry(20240607), placed = [], bossPts = Object.values(BOSS_SPOT);
    // monstros por zona em todo o continente (perto das fronteiras as zonas se misturam); nunca no mar, em vilas, postos, estradas ou arenas
    const ok = (x, z) => coastD(x, z) > 4 && !inTownSq(x, z, 4) && !SAFES.some(s => !s.sq && Math.hypot(x - s.x, z - s.z) < s.r + 3) && !bossPts.some(b => Math.hypot(x - b[0], z - b[1]) < 13)
      && !SITES.some(s => Math.hypot(x - s.x, z - s.z) < (s.k === 'lair' ? 12 : 9)) && roadDist(x, z) > 3.2 && !placed.some(q => Math.abs(x - q[0]) < 5.5 && Math.hypot(x - q[0], z - q[1]) < 5.5) && !blocked(x, z, 1.3);
    for (const [zid, count0] of [['camp', 52], ['field', 190], ['forest', 290], ['ruins', 330], ['dunes', 340], ['tundra', 330], ['ashlands', 260]]) {
      const count = Math.round(count0 * MOB_K / 2.6);
      let n = 0, tries = 0;
      while (n < count && tries++ < count * 40) {
        const q = sampleZone(zid, rng); if (!q || !ok(q[0], q[1])) continue;
        placed.push(q); G.mobs.push(makeMob(zid, q[0], q[1], rng)); n++;
      }
    }
    for (const s of SITES) if (s.k === 'lair') for (let k = 0; k < 3; k++) { // covis de elite: 3 elites fixos
      const a = k / 3 * PI * 2 + .5, x = s.x + Math.cos(a) * 4.2, z = s.z + Math.sin(a) * 4.2, m = makeMob(s.zone, x, z, rng, true); m.lair = s.id; G.mobs.push(m);
    }
    for (const id in BOSSES) {
      const b = BOSSES[id], s = mobStats(b.lvl, b);
      G.mobs.push(mobObj(id, b.n, b.zone, b.lvl, s, b.sc, MOB_COL[id], BOSS_SPOT[id][0], BOSS_SPOT[id][1], b, rng));
    }
  }
  /* ---------- Campeões errantes: um monstro muito forte aparece de tempos em tempos na sua zona ---------- */
  let champT = CFG.champ.first;
  function champUpdate(dt) {
    for (let i = G.mobs.length - 1; i >= 0; i--) if ((G.mobs[i].champ || G.mobs[i].adm) && G.mobs[i].dead && G.mobs[i].deadT > 4) G.mobs.splice(i, 1);
    const p = G.player, z = G.zone; if (!z || !MOBS[z.id] || z.id === 'camp' || G.dead) return; // campo de treino: sem campeões
    const cur = G.mobs.find(m => m.champ && !m.dead);
    if (cur) { if (Math.hypot(cur.x - p.x, cur.z - p.z) > 120) { G.mobs.splice(G.mobs.indexOf(cur), 1); } return; }
    champT -= dt * EV_EFF.champMul; if (champT > 0) return; { const C = CFG.champ, lo = Math.max(5, Math.min(C.min, C.max)); champT = lo + rnd() * Math.max(0, Math.max(C.min, C.max) - lo); }
    let x, zz, ok = false;
    for (let t = 0; t < 30 && !ok; t++) { const a = rnd() * PI * 2, r = 22 + rnd() * 10; x = p.x + Math.cos(a) * r; zz = p.z + Math.sin(a) * r; ok = zoneAt(x, zz) === z && coastD(x, zz) > 4 && !blocked(x, zz, 1.6) && !inSafe(x, zz); }
    if (!ok) return;
    champAt(x, zz, z);
  }
  function champAt(x, zz, z) {
    const p = G.player, list = (ELITES[z.id] || []).concat(MOBS[z.id]), def = list[Math.floor(rnd() * list.length)];
    const near = G.mobs.filter(m => !m.boss && m.zone === z.id), lv = near.length ? Math.max(...near.map(m => m.lvl)) : Math.round(EL(p));
    const lvl = Math.min(MAXLV + 10, lv + 3), s = mobStats(lvl, { hpm: 14, atkm: 2, xpm: 18, hpk: BOSS_HPK }); s.gold *= 12;
    const m = mobObj(def.id, 'Campeão ' + def.n, z.id, lvl, s, (MOB_SC[def.id] || 1) * 1.75, [1, .78, .3], x, zz, null, rnd);
    m.elite = true; m.champ = true; m.respawnAt = Infinity; m.aggroR = 11; G.mobs.push(m);
    UI.toast('⚠ Um ' + m.name + ' (nv ' + lvl + ') apareceu por perto!'); UI.log('⚠ ' + m.name + ' (nível ' + lvl + ') surgiu em ' + z.name + '. Derrote-o para um tesouro épico!', 'lvl'); sfx('boom');
    return m;
  }
  function respawnMob(m) {
    m.dead = false; m.hp = m.maxHp; m.x = m.sx; m.z = m.sz; m.state = 'idle'; m.stun = m.slow = m.mark = 0; m.dots.length = 0; m.warn = null; m.atkT = 0; m.hitPend = false; m.flash = 0; m.atkCd = 1;
  }
  function hurtMob(m, d, crit) {
    if (m.dead) return;
    if (TST.one && d < m.hp) d = Math.ceil(m.hp); // teste: mata com 1 golpe
    m.hp -= d; m.flash = .15; combatT = G.t; m.hurtT = G.t;
    if (m.state !== 'chase') { m.state = 'chase'; mobVoice(m, 'aggro'); }
    UI.float(m.x, m.hgt, m.z, crit ? d + '!' : String(d), crit ? 'crit' : 'dmg');
    if (m.hp <= 0) killMob(m);
  }
  function playerDmg(m, mult, skill, so) {
    let d = G.stats.atk * mult * (.9 + rnd() * .2) * 100 / (100 + m.def);
    if (skill) d *= G.stats.skillMul;
    if (m.mark > 0) d *= 1 + m.markV;
    if (so && so.exec && m.hp < m.maxHp * so.exec) d *= 2; // golpe executor
    const crit = (so && so.crit) || rnd() < G.stats.crit; if (crit) d *= 2;
    return { d: Math.max(1, Math.round(d)), crit };
  }
  function hitMob(m, mult, skill, so) {
    if (!m || m.dead) return;
    const r = playerDmg(m, mult, skill, so); hurtMob(m, r.d, r.crit); sfx('hit_' + (MAT[m.id] || MAT[MOB_ALIAS[m.id]] || 'flesh'), { p: r.crit ? 1.15 : 1, v: r.crit ? 1.25 : 1, force: true }); if (r.crit) { track('crit', 1); sfx('crit', { force: true }); }
    if (G.stats.leech > 0) { const p = G.player, v = Math.round(r.d * G.stats.leech); if (v > 0) p.hp = Math.min(p.maxHp, p.hp + v); }
    if (CLASSES[G.player.cls].res) { const p = G.player; p.mp = Math.min(p.maxMp, p.mp + Math.max(1, p.maxMp * .04)); } // Fúria: regenera ao acertar
    const hc = r.crit ? [1, .85, .3] : [1, .65, .5];
    fxBurst(m.x, m.hgt * .5, m.z, hc, r.crit ? 14 : 7, r.crit ? 4.5 : 3, .14);
    fxFlash(m.x, m.hgt * .5, m.z, r.crit ? 1.2 : .7, .16, hc);
    if (r.crit) { fxRing(m.x, m.hgt * .5, m.z, .2, 1.8, .28, hc, .9, 1.3); shake(.22); }
    return r.d;
  }
  /* item dropado: de qualquer classe (40% a do jogador), nível em torno do monstro (às vezes bem acima) e, de vez em quando, de fase superior:
     o que não dá para usar agora fica no Guarda de Carga até o personagem ter classe, nível e fase */
  function rollDropItem(m, slot, mt, own) {
    const p = G.player, ids = Object.keys(CLASSES), others = ids.filter(c => c !== p.cls);
    const cls = own || rnd() < .4 ? p.cls : others[Math.floor(rnd() * others.length)];
    const q = rnd(), dl = q < .55 ? -Math.floor(rnd() * 7) : q < .88 ? Math.floor(rnd() * 5) : q < .97 ? 5 + Math.floor(rnd() * 8) : 13 + Math.floor(rnd() * 13);
    const lvl = Math.max(1, Math.min(MAXLV + 5, m.lvl + dl)), tq = rnd();
    let tier = p.tier; if (tq < .03 && tier > 0) tier--; else if (tq >= .99) tier += 3; else if (tq >= .96) tier += 2; else if (tq >= .84) tier++;
    return makeItem(slot, cls, lvl, CFG.drop.mobBoost[mt], Math.min(TMUL.length - 1, tier));
  }
  function killMob(m) {
    mobVoice(m, 'die'); m.dead = true; m.deadT = 0; m.respawnAt = m.champ || m.adm || m.enc ? Infinity : G.t + (m.boss ? 120 : 20); m.warn = null; m.state = 'idle';
    if (tmob === m) tmob = null;
    if (cmd && cmd.mob === m) cmd = null;
    const p = G.player, xg = Math.max(xpFor(m) > 0 ? 1 : 0, Math.round(xpFor(m) * xpMul())), gold = Math.max(m.gold ? 1 : 0, Math.round(m.gold * goldMul()));
    if (xg > 0) gainXp(xg, true);
    p.gold += gold; UI.float(m.x, (m.hgt || 2) + .8, m.z, '+' + gold + ' ouro', 'xp'); sfx('coin');
    UI.log(m.name + ' derrotado (' + (xg > 0 ? '+' + xg + ' XP, ' : '') + '+' + gold + ' ouro).', 'loot');
    const cmp = m.zone === 'camp'; // campo de treino: poções e pedras caem com mais frequência
    if (rnd() < (m.boss ? 1 : cmp ? .22 : .12)) { p.pots.hp += m.boss ? 2 : 1; UI.log('Você encontrou uma Poção de Vida.', 'loot'); }
    if (rnd() < (m.boss ? 1 : cmp ? .22 : .12)) { p.pots.mp += m.boss ? 2 : 1; UI.log('Você encontrou uma Poção de Mana.', 'loot'); }
    const D = CFG.drop, mt = m.boss ? 'boss' : m.champ ? 'champ' : m.elite ? 'elite' : 'normal'; // tipo do monstro para as tabelas do CFG
    const q = Math.max(0, +D.items[mt] || 0), nDrops = Math.min(10, Math.floor(q) + (rnd() < q % 1 ? 1 : 0));
    for (let i = 0; i < nDrops; i++) {
      const r = rnd(), slot = (m.boss && i === 0) ? 'w' : r < .22 ? 'w' : r < .34 ? 'h' : r < .5 ? 'a' : r < .62 ? 'l' : r < .74 ? 'g' : r < .86 ? 'b' : 'c';
      const it = rollDropItem(m, slot, mt, m.boss && i === 0 && !!UNIQUE_W[m.id]); // a arma única do chefe é sempre da classe do jogador
      if (rnd() < D.adds[mt]) { const k = STONES[STONE_IDS[Math.floor(rnd() * STONE_IDS.length)]].k; it.adds = [{ k, v: addVal(k, pgOf(it)) }]; }
      if (m.boss && i === 0 && UNIQUE_W[m.id]) { // arma única do chefe
        const f = RARITY[4].m / RARITY[it.rar].m * 1.15; it.rar = 4; it.atk = Math.round(it.atk * f); it.uniq = 1; it.name = UNIQUE_W[m.id]; it.plus = Math.max(it.plus, 3);
        UI.log('★ Arma única: ' + it.name + '!', 'lvl');
      }
      const a = rnd() * PI * 2, dd = m.boss ? 1.5 + rnd() * 2 : rnd() * 1.2;
      items.push({ it, x: m.x + Math.cos(a) * dd, z: m.z + Math.sin(a) * dd, t0: G.t, ph: rnd() * 6 });
    }
    if (rnd() < Math.max(D.stone[mt], cmp ? .08 : 0) * EV_EFF.stoneMul) { // pedra de adicional
      const sid = STONE_IDS[Math.floor(rnd() * STONE_IDS.length)]; p.mats = p.mats || {}; p.mats[sid] = (p.mats[sid] || 0) + 1;
      UI.float(m.x, (m.hgt || 2) + 1.4, m.z, STONES[sid].ic + ' ' + STONES[sid].n, 'xp'); UI.log('Você encontrou: ' + STONES[sid].n + '.', 'loot');
    }
    dropMount(m); if (p.mount) mountXp(Math.round((2 + m.lvl * .4) * (m.boss ? 10 : m.champ ? 6 : m.elite ? 3 : 1)));
    questKill(m); mainKill(m); ENC.onKill(m);
    track('kill', 1); track('gold', gold); if (m.elite) track('elite', 1); if (m.boss) { if (!G.rec.bossU.includes(m.id)) G.rec.bossU.push(m.id); track('boss', 1); }
    fxBurst(m.x, m.hgt * .4, m.z, [.9, .8, .6], m.boss ? 30 : 12, 4, .2);
    if (m.boss) { shake(.7); fxRing(m.x, 1, m.z, .5, 11, .9, [1, .8, .4], .9, 3); fxDisc(m.x, m.z, 1, 9, 1, [1, .8, .4], .5); UI.toast(m.name + ' foi derrotado!'); }
    sfx('boom');
  }
  /* Vila = zona segura: monstros não entram, não perseguem quem está nela e ninguém sofre dano lá dentro */
  const inSafe = (x, z) => { for (const s of SAFES) if (s.sq ? Math.abs(x - s.x) < s.sq && Math.abs(z - s.z) < s.sq : Math.hypot(x - s.x, z - s.z) < s.r) return true; return false; };
  function keepOut(m) {
    for (const s of SAFES) {
      if (s.sq) { const dx = m.x - s.x, dz = m.z - s.z, L = s.sq + .5; if (Math.abs(dx) < L && Math.abs(dz) < L) { if (L - Math.abs(dx) < L - Math.abs(dz)) m.x = s.x + Math.sign(dx || 1) * L; else m.z = s.z + Math.sign(dz || 1) * L; } continue; }
      const dx = m.x - s.x, dz = m.z - s.z, d = Math.hypot(dx, dz); if (d >= s.r) continue;
      const ux = d > .01 ? dx : m.sx - s.x, uz = d > .01 ? dz : m.sz - s.z, l = Math.hypot(ux, uz) || 1;
      m.x = s.x + ux / l * (s.r + .3); m.z = s.z + uz / l * (s.r + .3);
    }
  }
  function mobTarget(m) {
    const p = G.player; let best = null;
    if (!G.dead && !inSafe(p.x, p.z)) best = { ref: p, x: p.x, z: p.z, d: Math.hypot(p.x - m.x, p.z - m.z) };
    if (pet && pet.hp > 0 && !inSafe(pet.x, pet.z)) {
      const d = Math.hypot(pet.x - m.x, pet.z - m.z);
      if (pet.taunt && d < 14) { if (!best || d < best.d + 8) best = { ref: pet, x: pet.x, z: pet.z, d }; }
      else if (!best || d + 2 < best.d) best = { ref: pet, x: pet.x, z: pet.z, d };
    }
    return best;
  }
  function stepTo(e, tx, tz, sp, dt, rad) {
    const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz); if (d < .01) return;
    const st = Math.min(d, sp * dt); e.x += dx / d * st; e.z += dz / d * st;
    const want = Math.atan2(dx, dz); e.rot += angDiff(e.rot, want) * Math.min(1, dt * 12);
    pushOut(e, rad); e.moving = true;
  }
  function mobUpdate(m, dt) {
    if (!m.dead && m.state === 'idle' && m.hp < m.maxHp && G.t - (m.hurtT || -999) > (m.boss ? 150 : 40)) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * (m.boss ? .003 : .01) * dt); mobUpdateCore(m, dt); if (!m.dead) keepOut(m); }
  function mobUpdateCore(m, dt) {
    if (m.dead) { m.deadT += dt; if (G.t >= m.respawnAt) respawnMob(m); return; }
    m.flash = Math.max(0, m.flash - dt); m.atkCd -= dt; if (m.mark > 0) m.mark -= dt; if (m.slow > 0) m.slow -= dt;
    for (let i = m.dots.length - 1; i >= 0; i--) {
      const d = m.dots[i]; d.t -= dt; d.acc += dt;
      if (d.acc >= 1) { d.acc -= 1; hurtMob(m, Math.max(1, Math.round(d.dps * 100 / (100 + m.def))), false); if (m.dead) return; }
      if (d.t <= 0) m.dots.splice(i, 1);
    }
    if (m.atkT > 0) { m.atkT -= dt; if (m.atkT <= 0 && m.hitPend) { m.hitPend = false; mobHit(m); } }
    m.moving = false;
    if (m.stun > 0) { m.stun -= dt; m.atkT = 0; m.hitPend = false; m.warn = null; return; }
    if (m.warn) { m.warn.t -= dt; if (m.warn.t <= 0) { slam(m); m.warn = null; } return; }
    if (m.atkT > 0) return;
    const sp = m.spd * (m.slow > 0 ? 1 - m.slowV : 1), dS = Math.hypot(m.x - m.sx, m.z - m.sz), tg = mobTarget(m);
    if (m.state === 'return') {
      stepTo(m, m.sx, m.sz, sp * 1.8, dt, m.rad);
      if (dS < 1.2) m.state = 'idle'; return;
    }
    if (m.state === 'idle') {
      if (tg && tg.d < m.aggroR) { m.state = 'chase'; mobVoice(m, 'aggro'); }
      else {
        m.wt -= dt;
        if (m.wt <= 0) { m.wt = 3 + rnd() * 4; m.wand = rnd() < .6; const a = rnd() * PI * 2, r = rnd() * 4; m.wx = m.sx + Math.cos(a) * r; m.wz = m.sz + Math.sin(a) * r; }
        if (m.wand) { if (Math.hypot(m.wx - m.x, m.wz - m.z) > .4) stepTo(m, m.wx, m.wz, 1.2, dt, m.rad); else m.wand = false; }
        return;
      }
    }
    if (m.state === 'chase') {
      if (!tg || dS > 28 || tg.d > 26) { m.state = 'return'; return; }
      if (m.boss) {
        m.slamCd -= dt;
        if (m.slamCd <= 0 && tg.d < 12) { m.warn = { t: 1, x: m.x, z: m.z, r: 5.5 + m.sc }; m.slamCd = 6; mobVoice(m, 'aggro'); return; }
      }
      if (tg.d <= m.range) {
        m.rot += angDiff(m.rot, Math.atan2(tg.x - m.x, tg.z - m.z)) * Math.min(1, dt * 12);
        if (m.atkCd <= 0) { m.atkCd = 1.6; m.atkT = .45; m.hitPend = true; m.atkTarget = tg.ref; if (rnd() < .4) mobVoice(m, 'attack'); }
      } else if (tg.d > m.range * .85) stepTo(m, tg.x, tg.z, sp, dt, m.rad);
    }
  }
  function mobHit(m) {
    const t = m.atkTarget, p = G.player;
    if (t === p) { if (!G.dead && Math.hypot(p.x - m.x, p.z - m.z) <= m.range + 1.3) dmgPlayer(m.atk); }
    else if (pet && t === pet && pet.hp > 0 && Math.hypot(pet.x - m.x, pet.z - m.z) <= m.range + 1.5) dmgPet(m.atk);
  }
  function slam(m) {
    const w = m.warn, p = G.player, dmg = m.atk * 1.6;
    fxDisc(w.x, w.z, 1, w.r, .5, [1, .5, .2], .6); fxBurst(w.x, .5, w.z, [.8, .6, .4], 20, 6, .25); sfx('boom');
    if (!G.dead && Math.hypot(p.x - w.x, p.z - w.z) < w.r) dmgPlayer(dmg);
    if (pet && pet.hp > 0 && Math.hypot(pet.x - w.x, pet.z - w.z) < w.r) dmgPet(dmg);
  }
  function dmgPlayer(raw) {
    const p = G.player; if (inSafe(p.x, p.z)) return; // zona segura
    if (TST.god) { combatT = G.t; if (throttle('imune', .6)) UI.float(p.x, 2.6, p.z, 'Imune', 'miss'); return; } // teste: invencível
    if (G.stats.dodge > 0 && rnd() < G.stats.dodge) { combatT = G.t; UI.float(p.x, 2.6, p.z, 'Errou!', 'miss'); G.dodges = (G.dodges || 0) + 1; return; } // esquiva
    const K = 100 * tmul(p.tier); // a constante da defesa escala com o tier: a proporção fica igual em todo tier
    let d = Math.max(1, Math.round(raw * (.9 + rnd() * .2) * K / (K + G.stats.def) * (1 - (G.stats.dr || 0))));
    combatT = G.t;
    if (p.shield.t > 0 && p.shield.hp > 0) {
      const ab = Math.min(p.shield.hp, d); p.shield.hp -= ab; d -= ab;
      if (p.shield.refl && ab > 0) { let a = null, bd = 6; for (const m of G.mobs) { if (m.dead) continue; const dd = Math.hypot(m.x - p.x, m.z - p.z) - m.rad; if (dd < bd) { bd = dd; a = m; } } if (a) { const rf = Math.max(1, Math.round(ab * p.shield.refl)); hurtMob(a, rf, false); UI.float(a.x, a.hgt + .4, a.z, 'Reflexo ' + rf, 'crit'); } }
      if (d <= 0) { UI.float(p.x, 2.6, p.z, 'Bloqueado', 'miss'); sfx('block'); return; }
    }
    p.hp -= d; p.flash = .15; UI.float(p.x, 2.6, p.z, '-' + d, 'player'); sfx('hurt');
    if (p.hp <= 0) die();
  }
  function dmgPet(raw) {
    const K = 100 * tmul(G.player.tier), d = Math.max(1, Math.round(raw * (.9 + rnd() * .2) * K / (K + pet.def)));
    pet.hp -= d; pet.flash = .15; UI.float(pet.x, 2, pet.z, '-' + d, 'player');
    if (pet.hp <= 0) { UI.log('Sua invocação (' + PET_N[pet.kind] + ') foi derrotada.', 'sys'); pet = null; }
  }
  function die() {
    const p = G.player; if (G.dead) return;
    G.dead = true; p.hp = 0; cmd = null; tmob = null; pet = null; p.dash = null; p.mount = null; p.shield.hp = 0;
    p.xp = Math.max(0, p.xp - Math.round(xpPlayer(p.lvl, p.tier) * .05));
    for (const m of G.mobs) if (!m.dead && m.state === 'chase') m.state = 'return';
    UI.showDeath(); UI.log('Você caiu em batalha.', 'sys'); sfx('die');
  }
  function respawn() {
    const p = G.player, inCamp = G.zone && G.zone.id === 'camp'; G.dead = false; G.wasSafe = false; p.x = inCamp ? CAMP.sx : 4; p.z = inCamp ? CAMP.sz : 4; cmd = null; tmob = null; autoHome = null; p.shield.hp = 0;
    for (const k in p.buffs) p.buffs[k].t = 0;
    recalc(); p.hp = p.maxHp; p.mp = p.maxMp;
    cam.init = false; UI.hideDeath(); UI.log(inCamp ? 'Você despertou na clareira do campo.' : 'Você despertou na vila.', 'sys');
  }

  /* ---------- pet ---------- */
  const PET_N = { wolf: 'lobo', golem: 'golem', spirit: 'espírito' }, PET_ART = { wolf: 'um lobo', golem: 'um golem', spirit: 'um espírito' }, PET_MODEL = { wolf: 'wolfm', golem: 'golemm', spirit: 'wraith' };
  function spawnPet(kind, dur) {
    const p = G.player, S = G.stats, wolf = kind === 'wolf', spirit = kind === 'spirit', golem = !wolf && !spirit;
    // dano das invocações escala com o ataque do Invocador (que escala com inteligência) e com o bônus de habilidade
    pet = {
      kind, x: p.x + 1.5, z: p.z + 1.5, rot: p.rot, sc: wolf ? 1 : spirit ? .9 : 1.2, rad: wolf ? .5 : spirit ? .5 : .8,
      maxHp: Math.round(wolf ? 60 + S.maxHp * .6 : spirit ? 30 + S.maxHp * .3 : 150 + S.maxHp * 2.2), atk: S.atk * S.skillMul * (wolf ? .9 : spirit ? 1.4 : .5), def: wolf ? S.def * .8 + 5 : spirit ? S.def * .6 : S.def * 1.5 + 20, crit: S.crit,
      spd: wolf ? 6.6 : spirit ? 7.4 : 4.6, range: wolf ? 2 : spirit ? 3 : 2.6, taunt: golem, until: G.t + dur, cd: 0, atkT: 0, flash: 0, moving: false, focus: null,
      col: wolf ? [.92, .9, 1] : spirit ? [.6, .85, 1] : [.62, .52, .4],
    };
    pet.hp = pet.maxHp;
    fxDisc(pet.x, pet.z, .5, 3, .7, wolf ? [.7, .9, 1] : [.8, .6, .4], .5); fxBurst(pet.x, 1, pet.z, [.8, .8, 1], 14, 3, .18);
  }
  function petUpdate(dt) {
    if (!pet) return;
    const p = G.player; pet.flash = Math.max(0, pet.flash - dt); pet.cd -= dt; pet.moving = false;
    if (G.t >= pet.until) { UI.log('Sua invocação (' + PET_N[pet.kind] + ') se dissipou.', 'sys'); fxBurst(pet.x, 1, pet.z, [.8, .8, 1], 10, 2, .15); pet = null; return; }
    if (pet.atkT > 0) pet.atkT -= dt;
    if (G.dead) return;
    if (Math.hypot(pet.x - p.x, pet.z - p.z) > 30) { pet.x = p.x + 1.5; pet.z = p.z + 1.5; }
    let tg = null;
    if (pet.focus && !pet.focus.dead) tg = pet.focus; else pet.focus = null;
    if (!tg && tmob && !tmob.dead && Math.hypot(tmob.x - p.x, tmob.z - p.z) < 30) tg = tmob;
    if (!tg) {
      let bd = 14;
      for (const m of G.mobs) { if (m.dead || m.state !== 'chase') continue; const d = Math.hypot(m.x - p.x, m.z - p.z); if (d < bd) { bd = d; tg = m; } }
    }
    if (tg) {
      const d = Math.hypot(tg.x - pet.x, tg.z - pet.z);
      if (d - tg.rad <= pet.range) {
        pet.rot += angDiff(pet.rot, Math.atan2(tg.x - pet.x, tg.z - pet.z)) * Math.min(1, dt * 12);
        if (pet.cd <= 0) {
          pet.cd = 1.2; pet.atkT = .3;
          const pc = rnd() < (pet.crit || 0), dm = Math.max(1, Math.round(pet.atk * (pet.rage > G.t ? 1.4 : 1) * (.9 + rnd() * .2) * 100 / (100 + tg.def) * (pc ? 2 : 1)));
          hurtMob(tg, dm, pc); fxBurst(tg.x, tg.hgt * .5, tg.z, [1, .7, .5], 4, 2, .12);
        }
      } else stepTo(pet, tg.x, tg.z, pet.spd, dt, pet.rad);
    } else {
      const d = Math.hypot(p.x - pet.x, p.z - pet.z);
      if (d > 3.2) stepTo(pet, p.x, p.z, pet.spd * (d > 8 ? 1.4 : 1), dt, pet.rad);
    }
  }

  /* ---------- efeitos ---------- */
  const fxScale = () => (R && R.qi === 0 ? .5 : 1);
  function shake(a) { G.shake = Math.max(G.shake || 0, a); }
  function fxRing(x, y, z, r0, r1, dur, col, a, th) { fx.push({ k: 'ring', x, y, z, r0, r1, t: 0, dur, col, a: a == null ? .9 : a, th: th || 1 }); }
  function fxFlash(x, y, z, r, dur, col) { fx.push({ k: 'flash', x, y, z, r, t: 0, dur, col }); }
  function fxDisc(x, z, r0, r1, dur, col, alpha) {
    fx.push({ k: 'disc', x, z, r0, r1, t: 0, dur, col, a: alpha == null ? .5 : alpha });
    if (r1 >= 2) { fxRing(x, .14, z, r0, r1 * 1.05, dur * .9, col, .85, 1 + r1 * .08); if (r1 >= 3.5) shake(Math.min(.35, r1 * .03)); }
  }
  function fxPillar(x, z, r, col, dur) {
    fx.push({ k: 'pillar', x, z, r, t: 0, dur, col });
    const n = Math.round(10 * fxScale());
    for (let i = 0; i < n; i++) { const a = rnd() * PI * 2, d = rnd() * r * 1.1; fx.push({ k: 'p', x: x + Math.cos(a) * d, y: .2, z: z + Math.sin(a) * d, vx: 0, vy: 3 + rnd() * 4, vz: 0, t: 0, dur: dur * (.8 + rnd() * .8), s: .1 + rnd() * .1, col, g: 0 }); }
  }
  function fxBeam(x1, z1, x2, z2, col, dur, w) {
    fx.push({ k: 'beam', x1, z1, x2, z2, t: 0, dur, col, w: w || .25 });
    const dx = x2 - x1, dz = z2 - z1, l = Math.hypot(dx, dz) || 1, n = Math.round(l * 1.2 * fxScale());
    for (let i = 0; i < n; i++) { const u = rnd(); fx.push({ k: 'p', x: x1 + dx * u, y: 1.3 + (rnd() - .5) * .5, z: z1 + dz * u, vx: (rnd() - .5) * 2, vy: rnd() * 1.5, vz: (rnd() - .5) * 2, t: 0, dur: .3 + rnd() * .3, s: .1 + rnd() * .1, col, g: 0 }); }
  }
  function fxBurst(x, y, z, col, n, sp, size) {
    n = Math.max(2, Math.round(n * fxScale()));
    for (let i = 0; i < n; i++) {
      const a = rnd() * PI * 2, e = rnd() * 2 - .3, s = sp * (.4 + rnd() * .6), spark = rnd() < .35;
      fx.push({ k: spark ? 'spark' : 'p', x, y, z, vx: Math.cos(a) * s * (spark ? 1.6 : 1), vy: 1 + e * s * .6 + rnd() * 2, vz: Math.sin(a) * s * (spark ? 1.6 : 1), t: 0, dur: spark ? .3 + rnd() * .3 : .45 + rnd() * .4, s: size * (spark ? .5 : .6 + rnd() * .8), col });
    }
    if (n >= 8) { fxFlash(x, y, z, size * 7 + sp * .25, .22, col); if (n >= 14) fxRing(x, y, z, .3, sp * .9 + 1, .35, col, .8, 1); }
  }
  function updateFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.t += dt;
      if (f.k === 'p' || f.k === 'spark') { f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.vy -= (f.g == null ? 8 : f.g) * dt; if (f.y < .05) { f.y = .05; f.vy = 0; f.vx *= .8; f.vz *= .8; } }
      if (f.t >= f.dur) fx.splice(i, 1);
    }
    if (fx.length > 600) fx.splice(0, fx.length - 600);
  }
  function launch(o) { o.t = 0; projs.push(o); sfx('shoot'); }
  function updateProj(dt) {
    for (let i = projs.length - 1; i >= 0; i--) {
      const q = projs[i]; q.t += dt;
      const tg = q.tgt;
      if (!tg || tg.dead || q.t > 3) { projs.splice(i, 1); continue; }
      const tx = tg.x, ty = tg.hgt * .5, tz = tg.z, dx = tx - q.x, dy = ty - q.y, dz = tz - q.z, d = Math.hypot(dx, dy, dz), st = q.speed * dt;
      q.yaw = Math.atan2(dx, dz);
      if (d <= st + .4 + tg.rad * .5) { projs.splice(i, 1); q.onHit(tg); continue; }
      q.x += dx / d * st; q.y += dy / d * st; q.z += dz / d * st;
      fx.push({ k: 'p', x: q.x, y: q.y, z: q.z, vx: (rnd() - .5) * .6, vy: (rnd() - .5) * .6, vz: (rnd() - .5) * .6, t: 0, dur: .32, s: q.size * .55, col: q.col, g: 0 });
    }
  }
  function updateDelayed(dt) {
    for (let i = delayed.length - 1; i >= 0; i--) {
      const d = delayed[i]; d.t -= dt;
      if (d.t > 0) continue;
      delayed.splice(i, 1);
      fxDisc(d.x, d.z, .5, d.r, .5, d.col, .55); fxPillar(d.x, d.z, d.r * .6, d.col, .45); fxBurst(d.x, 1, d.z, d.col, 22, d.r * 1.1, .25); sfx('boom');
      for (const m of G.mobs) {
        if (m.dead || Math.hypot(m.x - d.x, m.z - d.z) > d.r + m.rad * .5) continue;
        hitMob(m, d.mult, true);
        if (d.dot && !m.dead) m.dots.push({ dps: G.stats.atk * G.stats.skillMul * d.mult * .15, t: d.dot, acc: 0 });
      }
    }
  }

  /* ---------- habilidades ---------- */
  const nearestMob = (maxD, x, z) => {
    let b = null, bd = maxD;
    for (const m of G.mobs) { if (m.dead) continue; const d = Math.hypot(m.x - x, m.z - z); if (d < bd) { bd = d; b = m; } }
    return b;
  };
  function needTarget() {
    const p = G.player;
    if (tmob && !tmob.dead) return tmob;
    const m = nearestMob(22, p.x, p.z); if (m) tmob = m; return m;
  }
  function face(x, z) { const p = G.player; p.rot = Math.atan2(x - p.x, z - p.z); }
  function cursorGround() {
    if (!mouse.in) return null; const r = pickRay(mouse.x, mouse.y); if (!r || r.d[1] >= -1e-4) return null;
    const t = -r.o[1] / r.d[1]; return [r.o[0] + r.d[0] * t, r.o[2] + r.d[2] * t];
  }
  function useSkill(i) {
    const p = G.player; if (G.state !== 'play' || G.dead || p.dash) return;
    const s0 = CLASSES[p.cls].skills[i]; if (!s0) return;
    if (!p.sk[i]) { if (throttle('lock' + i, 1)) UI.log('Você ainda não aprendeu ' + s0.n + '. Fale com um Mestre de Habilidades.', 'sys'); return; }
    const s = skEff(s0, p.sk[i]);
    if ((s.tier || 0) > p.tier) { if (throttle('lock' + i, 1)) UI.log('Habilidade bloqueada: requer evolução de classe.', 'sys'); return; }
    if ((s.lvl || 0) > EL(p)) { if (throttle('lock' + i, 1)) UI.log('Habilidade bloqueada: requer nível ' + dispLv(s.lvl, p.tier) + '.', 'sys'); return; }
    if (p.cd[i] > 0) return;
    if (!TST.inf && p.mp < s.mp) { if (throttle('mana', 1)) UI.log('Mana insuficiente.', 'sys'); return; }
    const col = s.col || CLASSES[p.cls].col, k = s.k; let m = null;
    const spend = () => { mainEv('skill'); if (!TST.inf) p.mp -= s.mp; p.cd[i] = TST.nocd ? 0 : s.cd; p.atkT = .3; p.atkCd = Math.max(p.atkCd, .5); sfx(k === 'heal' || k === 'hpp' ? 'heal' : k === 'shield' ? 'shield' : k === 'summon' ? 'summon' : 'skill', { force: true }); track('skill', 1); };
    const reach = (mm, rng) => Math.hypot(mm.x - p.x, mm.z - p.z) - mm.rad <= rng;
    const needT = () => {
      m = needTarget(); if (!m) { if (throttle('notgt', 1)) UI.log('Nenhum alvo por perto.', 'sys'); return false; }
      return true;
    };
    const tooFar = () => { cmd = { type: 'attack', mob: m }; if (throttle('far', 1)) UI.log('Alvo fora de alcance.', 'sys'); };
    if (k === 'melee') {
      if (!needT()) return; if (!reach(m, s.rng)) return tooFar();
      face(m.x, m.z); spend(); const dd = hitMob(m, s.m, true, s); fxDisc(m.x, m.z, .3, 2.2, .3, col, .5);
      if (s.leech && dd) { const v = Math.round(dd * s.leech); p.hp = Math.min(p.maxHp, p.hp + v); UI.float(p.x, 2.8, p.z, '+' + v, 'heal'); fxBurst(p.x, 1.2, p.z, [1, .25, .3], 10, 2, .15); }
    } else if (k === 'proj') {
      if (!needT()) return; if (!reach(m, s.rng)) return tooFar();
      face(m.x, m.z); spend();
      if (s.focus && pet) pet.focus = m;
      launch({ x: p.x, y: 1.6, z: p.z, tgt: m, speed: 26, col, size: .4, arrow: p.cls === 'huntress', onHit: t => { hitMob(t, s.m, true, s); if (s.slow && !t.dead) { t.slow = s.sdur; t.slowV = s.slow; } } });
      if (s.multi) { // alvos extras próximos ao alvo principal
        const ex = G.mobs.filter(mm => !mm.dead && mm !== m && Math.hypot(mm.x - m.x, mm.z - m.z) < 9 && Math.hypot(mm.x - p.x, mm.z - p.z) < s.rng + 4).sort((a, b) => Math.hypot(a.x - m.x, a.z - m.z) - Math.hypot(b.x - m.x, b.z - m.z)).slice(0, s.multi);
        ex.forEach((t2, j) => launch({ x: p.x, y: 1.6, z: p.z, tgt: t2, speed: 24 - j, col, size: .34, arrow: p.cls === 'huntress', onHit: t => hitMob(t, s.m * .8, true) }));
      }
    } else if (k === 'pierce') {
      let dx, dz;
      if (tmob && !tmob.dead) { dx = tmob.x - p.x; dz = tmob.z - p.z; } else { dx = Math.sin(p.rot); dz = Math.cos(p.rot); }
      const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; p.rot = Math.atan2(dx, dz); spend();
      fxBeam(p.x, p.z, p.x + dx * s.rng, p.z + dz * s.rng, col, .3, .3);
      for (const mm of G.mobs) {
        if (mm.dead) continue; const rx = mm.x - p.x, rz = mm.z - p.z, al = rx * dx + rz * dz, pp = Math.abs(rx * dz - rz * dx);
        if (al > 0 && al <= s.rng + mm.rad && pp <= .6 + mm.rad * .8) hitMob(mm, s.m, true);
      }
    } else if (k === 'aoe_self') {
      spend(); fxDisc(p.x, p.z, .5, s.r, .45, col, .55); fxBurst(p.x, 1, p.z, col, 18, s.r * 1.2, .22);
      for (const mm of G.mobs) {
        if (mm.dead || Math.hypot(mm.x - p.x, mm.z - p.z) > s.r + mm.rad * .5) continue;
        hitMob(mm, s.m, true); if (s.slow && !mm.dead) { mm.slow = s.sdur; mm.slowV = s.slow; } if (s.stun && !mm.dead) { mm.stun = s.stun; }
      }
    } else if (k === 'aoe_ground') {
      let cx, cz;
      if (tmob && !tmob.dead) { cx = tmob.x; cz = tmob.z; }
      else {
        const g = cursorGround();
        if (g) { cx = g[0]; cz = g[1]; }
        else { const n = nearestMob(22, p.x, p.z); if (n) { cx = n.x; cz = n.z; tmob = n; } else { cx = p.x + Math.sin(p.rot) * 6; cz = p.z + Math.cos(p.rot) * 6; } }
      }
      const dx = cx - p.x, dz = cz - p.z, dd = Math.hypot(dx, dz);
      if (dd > s.rng) { cx = p.x + dx / dd * s.rng; cz = p.z + dz / dd * s.rng; }
      face(cx, cz); spend(); delayed.push({ x: cx, z: cz, r: s.r, mult: s.m, dot: s.dot, col, t: s.delay, delay: s.delay });
    } else if (k === 'dash') {
      let tx, tz;
      if (s.free) { tx = p.x + Math.sin(p.rot) * s.free; tz = p.z + Math.cos(p.rot) * s.free; }
      else {
        if (!needT()) return; const d = Math.hypot(m.x - p.x, m.z - p.z);
        if (d - m.rad > s.rng) return tooFar();
        const keep = m.rad + 1.3, f = Math.max(0, d - keep) / (d || 1); tx = p.x + (m.x - p.x) * f; tz = p.z + (m.z - p.z) * f; face(m.x, m.z);
      }
      spend(); p.dash = { fx: p.x, fz: p.z, tx, tz, t: 0, dur: .18, mob: s.free ? null : m, s };
    } else if (k === 'buff') {
      spend(); for (const bk of ['atk', 'def', 'crit', 'aspd', 'leech']) if (s[bk] || bk === 'atk' || bk === 'def') p.buffs[bk] = { v: s[bk] || 0, t: s.dur }; recalc();
      if (s.pet && pet) { pet.rage = G.t + s.dur; fxPillar(pet.x, pet.z, .8, [1, .6, .3], .5); }
      fxDisc(p.x, p.z, .5, 4, .6, [1, .8, .3], .5); fxPillar(p.x, p.z, 1, [1, .8, .3], .6); UI.float(p.x, 2.8, p.z, 'Fortalecido!', 'heal');
    } else if (k === 'shield') {
      spend(); p.shield = { hp: Math.round(s.sh * p.maxHp), t: s.dur, refl: s.refl || 0 }; fxDisc(p.x, p.z, .5, 3, .6, [.5, .8, 1], .5); fxPillar(p.x, p.z, 1.1, [.5, .8, 1], .6);
      UI.float(p.x, 2.8, p.z, 'Escudo ' + p.shield.hp, 'heal');
    } else if (k === 'heal') {
      spend(); const v = Math.round(s.p * p.maxHp * G.stats.healMul); p.hp = Math.min(p.maxHp, p.hp + v); UI.float(p.x, 2.8, p.z, '+' + v, 'heal');
      fxDisc(p.x, p.z, .5, 3.5, .7, [.4, 1, .5], .5); fxBurst(p.x, 1, p.z, [.4, 1, .5], 16, 3, .18);
      if (pet) { const hv = Math.round((s.pp || s.p) * pet.maxHp * G.stats.healMul); pet.hp = Math.min(pet.maxHp, pet.hp + hv); UI.float(pet.x, 2, pet.z, '+' + hv, 'heal'); fxBurst(pet.x, 1, pet.z, [.4, 1, .5], 10, 2, .15); }
    } else if (k === 'mark') {
      if (!needT()) return; if (!reach(m, s.rng)) return tooFar();
      face(m.x, m.z); spend(); m.mark = s.dur; m.markV = s.v; UI.float(m.x, m.hgt + .5, m.z, 'Marcado!', 'miss'); fxDisc(m.x, m.z, .5, 2.5, .5, [1, .3, .3], .5); fxPillar(m.x, m.z, .5, [1, .3, .3], .5);
    } else if (k === 'summon') {
      spend(); spawnPet(s.pet, s.dur); UI.log('Você invocou ' + PET_ART[s.pet] + '!', 'sys');
    }
  }
  function basicAttack(m) {
    const p = G.player, c = CLASSES[p.cls]; p.atkCd = 1.1 / (G.stats.aspd || 1); p.atkT = .3; face(m.x, m.z); sfx(swingOf(p.eq.w && p.eq.w.wt), { force: true });
    if (c.atkType === 'melee') { hitMob(m, 1, false); }
    else launch({ x: p.x, y: 1.6, z: p.z, tgt: m, speed: 24, col: c.col, size: .28, arrow: p.cls === 'huntress', onHit: t => hitMob(t, 1, false) });
  }

  /* ---------- modo automático ---------- */
  const autoOut = G.autoOut;
  function loadAuto() {
    try {
      const s = JSON.parse(localStorage.getItem(AUTO_KEY)); if (!s || typeof s !== 'object') return;
      for (const k of ['attack', 'skills', 'hp', 'mp']) if (typeof s[k] === 'boolean') G.auto[k] = s[k];
      for (const k of ['hpPct', 'mpPct']) if (isFinite(s[k])) G.auto[k] = clamp(Math.round(s[k]), 10, 90);
    } catch (e) { /* ignore */ }
  }
  function saveAuto() { try { localStorage.setItem(AUTO_KEY, JSON.stringify(G.auto)); } catch (e) { /* ignore */ } }
  function setAuto(key, value) {
    const A = G.auto; if (!(key in A)) return;
    if (key === 'hpPct' || key === 'mpPct') { const v = Number(value); if (!isFinite(v)) return; A[key] = clamp(Math.round(v), 10, 90); }
    else {
      A[key] = !!value;
      if (key === 'attack') { if (A.attack) { autoHome = null; autoPause = 0; } else if (cmd && cmd.auto) cmd = null; }
      if (key === 'hp' || key === 'mp') autoOut[key] = false;
    }
    saveAuto(); if (typeof UI !== 'undefined') UI.refreshPanels();
  }
  function toggleAutoCombat() {
    if (G.state !== 'play') return;
    const on = !(G.auto.attack && G.auto.skills);
    setAuto('attack', on); setAuto('skills', on);
    UI.toast(on ? 'Combate automático ligado' : 'Combate automático desligado');
  }
  function autoPotions() {
    const p = G.player;
    for (const k of ['hp', 'mp']) {
      if (p.pots[k] > 0) autoOut[k] = false;
      if (!G.auto[k]) continue;
      const cur = k === 'hp' ? p.hp / p.maxHp : p.mp / p.maxMp;
      if (cur * 100 >= G.auto[k + 'Pct']) continue;
      if (p.pots[k] <= 0) { if (!autoOut[k]) { autoOut[k] = true; UI.log(k === 'hp' ? 'Sem poções de vida!' : 'Sem poções de mana!', 'sys'); } continue; }
      if (p.potCd[k] > 0) continue;
      usePotion(k);
    }
  }
  const SKILL_ORDER = ['heal', 'shield', 'buff', 'summon', 'aoe_self', 'aoe_ground', 'mark', 'pierce', 'proj', 'melee', 'dash'];
  function autoSkills(fleeing) {
    const p = G.player, sk = CLASSES[p.cls].skills; if (p.dash) return;
    let t = tmob && !tmob.dead ? tmob : null;
    if (!t) {
      let bd = 14;
      for (const m of G.mobs) { if (m.dead || m.state !== 'chase') continue; const d = Math.hypot(m.x - p.x, m.z - p.z); if (d < bd) { bd = d; t = m; } }
      if (t) tmob = t;
    }
    if (!t) return;
    const dist = Math.hypot(t.x - p.x, t.z - p.z) - t.rad;
    if (dist > 20) return;
    const hpf = p.hp / p.maxHp, reserve = (G.auto.mp && !autoOut.mp) ? 0 : p.maxMp * .15;
    const near = (x, z, r) => { let n = 0; for (const m of G.mobs) if (!m.dead && Math.hypot(m.x - x, m.z - z) - m.rad * .5 <= r) n++; return n; };
    const ok = (i, s, kind) => p.sk[i] > 0 && (s.tier || 0) <= p.tier && (s.lvl || 0) <= EL(p) && (p.cd[i] || 0) <= 0 && p.mp >= s.mp && (kind === 'heal' || p.mp - s.mp >= reserve);
    for (const kind of SKILL_ORDER) {
      if (fleeing && kind !== 'heal' && kind !== 'shield') continue;
      const idx = sk.map((_, j) => j).reverse(); if (kind === 'summon') idx.sort((a, b) => b - a);
      for (const i of idx) {
        const s = sk[i]; if (s.k !== kind || !ok(i, s, kind)) continue;
        let go = false;
        switch (kind) {
          case 'heal': go = hpf < .6 || (pet && pet.maxHp && pet.hp / pet.maxHp < .35 && hpf < .9); break;
          case 'shield': go = !(p.shield.t > 0 && p.shield.hp > 0) && (dist <= 12 || hpf < .5) && (hpf < .85 || t.boss || near(p.x, p.z, 7) >= 2); break;
          case 'buff': go = p.buffs.atk.t <= 0 && dist <= 12; break;
          case 'summon': go = !pet && dist <= 16; break;
          case 'aoe_self': go = dist <= s.r && (near(p.x, p.z, s.r) >= 2 || t.boss); break;
          case 'aoe_ground': go = dist <= s.rng && (near(t.x, t.z, s.r) >= 2 || t.boss); break;
          case 'mark': go = t.mark <= 0 && dist <= s.rng; break;
          case 'pierce': case 'proj': case 'melee': go = dist <= s.rng; break;
          case 'dash': go = !s.free && dist > 4 && dist <= s.rng; break;
        }
        if (go) { useSkill(i); return; }
      }
    }
  }
  function autoAttack() {
    const p = G.player;
    if (!autoHome) autoHome = { x: p.x, z: p.z };
    if (G.t < autoPause) { autoHome = { x: p.x, z: p.z }; return; }
    if (cmd && !cmd.auto) return;
    if (tmob && !tmob.dead && !(tmob.noReach > G.t) && Math.hypot(tmob.x - p.x, tmob.z - p.z) < 40) {
      if (!cmd || cmd.type !== 'attack' || cmd.mob !== tmob) cmd = { type: 'attack', mob: tmob, auto: true };
      return;
    }
    let best = null, bs = 1e9;
    for (const m of G.mobs) {
      if (m.dead || m.state === 'return' || m.noReach > G.t) continue;
      if (m.boss && p.hp / p.maxHp < .6) continue;
      if (m.state !== 'chase' && m.lvl > EL(p) + 8) continue; // não puxa monstros muito acima do seu nível
      const d = Math.hypot(m.x - p.x, m.z - p.z); if (d > 18) continue;
      const sc = d - (m.state === 'chase' ? 6 : 0); if (sc < bs) { bs = sc; best = m; }
    }
    if (best) { tmob = best; cmd = { type: 'attack', mob: best, auto: true }; return; }
    {
      let bi = null, bd = 14;
      for (const g of items) { if ((!g.coin && p.inv.length >= 24) || g.noReach > G.t) continue; const d = Math.hypot(g.x - p.x, g.z - p.z); if (d < bd) { bd = d; bi = g; } }
      if (bi) { cmd = { type: 'item', item: bi, auto: true }; return; }
    }
    if (!cmd && Math.hypot(autoHome.x - p.x, autoHome.z - p.z) > 6) cmd = { type: 'move', x: autoHome.x, z: autoHome.z, auto: true };
  }
  function autoUpdate(dt) {
    const A = G.auto; G.autoPaused = A.attack && G.t < autoPause;
    if (!(A.attack || A.skills || A.hp || A.mp)) return;
    autoAcc += dt; if (autoAcc < .15) return; autoAcc = 0;
    if (G.state !== 'play' || G.dead || UI.isBlocking()) return;
    if (A.hp || A.mp) autoPotions();
    if (A.skills) autoSkills(G.t < autoPause || !!(cmd && !cmd.auto && cmd.type === 'move')); // fugindo à mão: só cura e escudo (nada de Investida puxando de volta)
    if (A.attack) autoAttack();
  }

  /* ---------- itens no chão ---------- */
  function pickUp(g) {
    const p = G.player;
    if (g.coin) { p.gold += g.coin; track('gold', g.coin); items.splice(items.indexOf(g), 1); sfx('coin'); UI.float(g.x, 1.4, g.z, '+' + g.coin + ' ouro', 'xp'); UI.refreshPanels(); return true; }
    if (p.inv.length >= 24) { if (throttle('full', 2)) { UI.log('Inventário cheio!', 'sys'); UI.toast('Inventário cheio'); } return false; }
    p.inv.push(g.it); items.splice(items.indexOf(g), 1); sfx('pick'); track('loot', 1); if (g.it.rar === 4) track('legend', 1);
    UI.log('Item obtido: ' + itemName(g.it) + ' (' + RARITY[g.it.rar].n + ')', 'loot'); UI.refreshPanels(); return true;
  }

  /* ---------- atualização do jogador ---------- */
  function keyDir() {
    let f = 0, r = 0;
    if (keys.KeyW || keys.ArrowUp) f++;
    if (keys.KeyS || keys.ArrowDown) f--;
    if (keys.KeyD || keys.ArrowRight) r++;
    if (keys.KeyA || keys.ArrowLeft) r--;
    if (!f && !r) return null;
    const fx_ = -Math.sin(cam.yaw), fz_ = -Math.cos(cam.yaw), rx = -fz_, rz = fx_;
    const dx = fx_ * f + rx * r, dz = fz_ * f + rz * r, l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l];
  }
  function playerUpdate(dt) {
    const p = G.player; p.moving = false;
    if (p.dash) {
      const d = p.dash; d.t += dt; const k = Math.min(1, d.t / d.dur);
      p.x = d.fx + (d.tx - d.fx) * k; p.z = d.fz + (d.tz - d.fz) * k; p.moving = true; p.rot = Math.atan2(d.tx - d.fx, d.tz - d.fz);
      if (rnd() < .8) fx.push({ k: 'p', x: p.x, y: 1, z: p.z, vx: 0, vy: 0, vz: 0, t: 0, dur: .3, s: .5, col: [.8, .9, 1] });
      if (k >= 1) {
        p.dash = null; pushOut(p, .5); const s = d.s;
        if (d.mob && !d.mob.dead) { hitMob(d.mob, s.m, true); if (s.stun && !d.mob.dead) { d.mob.stun = s.stun; UI.float(d.mob.x, d.mob.hgt + .5, d.mob.z, 'Atordoado', 'miss'); } fxDisc(d.mob.x, d.mob.z, .3, 3, .35, [1, .9, .6], .5); }
        if (s.spd) p.buffs.spd = { v: s.spd, t: s.sdur };
        if (s.dodge) { p.buffs.dodge = { v: s.dodge, t: s.sdur }; UI.float(p.x, 2.8, p.z, 'Esquiva!', 'heal'); }
        if (s.spd || s.dodge) recalc();
      }
      return;
    }
    const spd = G.stats.spd * (p.mount ? 1 + mountSpd(p.mount) : 1) * (TST.spd ? 3 : 1), kd = keyDir();
    const go = (tx, tz, speed, steer) => {
      const ftx = tx, ftz = tz;
      let routed = false; // rota da vila já desvia de tudo: sem desvio local, que oscila em ruas estreitas
      if (steer && !(p.mount && MOUNTS[p.mount].fly)) { const w = townRoute(p, tx, tz); if (w) { tx = w[0]; tz = w[1]; routed = true; } } else p.path = null;
      if (steer && !routed && !(p.mount && MOUNTS[p.mount].fly)) { const w = localRoute(p, tx, tz); if (w) { tx = w[0]; tz = w[1]; routed = true; } }
      if (steer && !routed && p.detour) { if (G.t > p.detour.until || Math.hypot(p.detour.x - p.x, p.detour.z - p.z) < .5) p.detour = null; else { tx = p.detour.x; tz = p.detour.z; } }
      let dx = tx - p.x, dz = tz - p.z; const d = Math.hypot(dx, dz); if (d < .01) return;
      dx /= d; dz /= d;
      if (steer && !routed && !(p.mount && MOUNTS[p.mount].fly)) { const s = steerAround(p, dx, dz, d, .5); dx = s[0]; dz = s[1]; }
      const st = Math.min(d, speed * dt), ox = p.x, oz = p.z; p.x += dx * st; p.z += dz * st;
      pushOut(p, .5, !!(p.mount && MOUNTS[p.mount].fly));
      const mx = p.x - ox, mz = p.z - oz, mv = Math.hypot(mx, mz);
      if (mv > Math.max(.002, st * .3) && mx * dx + mz * dz > 0) { p.moving = true; p.rot += angDiff(p.rot, Math.atan2(dx, dz)) * Math.min(1, dt * 12); } // só vira se de fato andou para lá; preso/empurrado pela colisão não gira
      if (steer) trackStuck(p, mv, st, dt, ftx, ftz, routed ? tx : ftx, routed ? tz : ftz); // na rota da vila o progresso é medido até o próximo ponto
    };
    if (kd) {
      cmd = null; autoPause = G.t + 3; go(p.x + kd[0], p.z + kd[1], spd);
    } else if (cmd) {
      if (cmd.type === 'move') {
        if (!cmd.fixed && !(p.mount && MOUNTS[p.mount].fly)) { const q = freeSpot(cmd.x, cmd.z, p.x, p.z, .5); cmd.x = q.x; cmd.z = q.z; cmd.fixed = true; }
        const d = Math.hypot(cmd.x - p.x, cmd.z - p.z); if (d < .3) cmd = null; else go(cmd.x, cmd.z, spd, true);
      }
      else if (cmd.type === 'attack') {
        const m = cmd.mob;
        if (!m || m.dead) cmd = null;
        else {
          const c = CLASSES[p.cls], d = Math.hypot(m.x - p.x, m.z - p.z) - m.rad;
          if (d > c.range - .3) go(m.x, m.z, spd, true);
          else { p.rot += angDiff(p.rot, Math.atan2(m.x - p.x, m.z - p.z)) * Math.min(1, dt * 16); if (p.atkCd <= 0) basicAttack(m); }
        }
      } else if (cmd.type === 'npc') {
        const n = cmd.npc, d = Math.hypot(n.x - p.x, n.z - p.z);
        if (d < 3.4) { const id = n.id; cmd = null; face(n.x, n.z); UI.openDialog(id); } else go(n.x, n.z, spd, true);
      } else if (cmd.type === 'item') {
        const g = cmd.item;
        if (items.indexOf(g) < 0) cmd = null;
        else if (Math.hypot(g.x - p.x, g.z - p.z) < 1.2) { cmd = null; pickUp(g); } else go(g.x, g.z, spd, true);
      }
    }
    for (const g of items) if (Math.hypot(g.x - p.x, g.z - p.z) < (g.coin ? 2.4 : 1.3)) { if (pickUp(g)) break; }
    const oc = G.t - combatT > 5;
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * (oc ? .015 : 0) * dt); p.mp = Math.min(p.maxMp, p.mp + p.maxMp * (oc ? .03 : .006) * dt);
  }

  /* ---------- picking ---------- */
  function pickRay(px, py) {
    const rc = canvas.getBoundingClientRect(), nx = (px - rc.left) / rc.width * 2 - 1, ny = 1 - (py - rc.top) / rc.height * 2;
    const inv = M.inv(G.vp); if (!inv) return null;
    const a = M.xform(inv, [nx, ny, -1]), b = M.xform(inv, [nx, ny, 1]), d = V.norm(V.sub(b, a));
    return { o: a, d };
  }
  function raySphere(r, c, rad) {
    const oc = V.sub(r.o, c), b = V.dot(oc, r.d), cc = V.dot(oc, oc) - rad * rad, h = b * b - cc; if (h < 0) return -1;
    const t = -b - Math.sqrt(h); return t > 0 ? t : (-b + Math.sqrt(h) > 0 ? 0 : -1);
  }
  function onClick(px, py) {
    if (G.state !== 'play' || G.dead) return;
    const r = pickRay(px, py); if (!r) return;
    autoPause = G.t + 3;
    let best = null, bt = 1e9;
    for (const g of items) { const t = raySphere(r, [g.x, .8, g.z], 1); if (t >= 0 && t < bt) { bt = t; best = { k: 'item', g }; } }
    // ponto do chão clicado: um clique no corpo do monstro cai, no máximo, a (altura × cotg do ângulo da câmera) atrás dele; mais longe que isso é um clique no chão (fugir)
    const gt = r.d[1] < -1e-4 ? -r.o[1] / r.d[1] : -1, gX = r.o[0] + r.d[0] * gt, gZ = r.o[2] + r.d[2] * gt, hdr = Math.hypot(r.d[0], r.d[2]) / Math.max(1e-4, -r.d[1]);
    for (const m of G.mobs) { if (m.dead) continue; const t = raySphere(r, [m.x, m.hgt * .5, m.z], Math.max(.8, m.hgt * .38)); if (t < 0 || t >= bt) continue;
      if (gt > 0 && Math.hypot(gX - m.x, gZ - m.z) > m.hgt * hdr * .8 + m.rad + .3) continue; best = { k: 'mob', m }; bt = t; }
    for (const n of NPCS) { const t = raySphere(r, [n.x, 1.1, n.z], 1.2); if (t >= 0 && t < bt) { bt = t; best = { k: 'npc', n }; } }
    if (best) {
      if (best.k === 'item') cmd = { type: 'item', item: best.g };
      else if (best.k === 'mob') { tmob = best.m; cmd = { type: 'attack', mob: best.m }; }
      else cmd = { type: 'npc', npc: best.n };
      return;
    }
    for (const v of VILLAGES) if (raySphere(r, [v.portal[0], 2.8, v.portal[1]], 2.6) >= 0) { clickPortal(v); return; }
    if (r.d[1] < -1e-4) {
      const t = -r.o[1] / r.d[1], x = r.o[0] + r.d[0] * t, z = r.o[2] + r.d[2] * t, q = { x, z }; landClamp(q); const tx = q.x, tz = q.z;
      cmd = { type: 'move', x: tx, z: tz }; fxDisc(tx, tz, .2, .8, .5, [1, 1, .6], .6);
    }
  }

  /* ---------- entrada ---------- */
  function cycleTarget() {
    const p = G.player, list = G.mobs.filter(m => !m.dead && Math.hypot(m.x - p.x, m.z - p.z) < 25).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
    if (!list.length) { tmob = null; return; }
    const i = list.indexOf(tmob); tmob = list[(i + 1) % list.length];
  }
  function talkNearest() {
    const p = G.player; let b = null, bd = 6;
    for (const n of NPCS) { const d = Math.hypot(n.x - p.x, n.z - p.z); if (d < bd) { bd = d; b = n; } }
    if (b) { cmd = null; UI.openDialog(b.id); } else if (throttle('nonpc', 1)) UI.log('Nenhum NPC por perto.', 'sys');
  }
  function initInput() {
    const gest = () => initAudio();
    window.addEventListener('pointerdown', gest); window.addEventListener('keydown', gest);
    window.addEventListener('resize', () => R.resize(true));
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    window.addEventListener('beforeunload', () => { if (G.state === 'play') save(); });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('mousedown', e => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      if (e.button === 2) { mouse.drag = true; mouse.lx = e.clientX; e.preventDefault(); }
      else if (e.button === 0) onClick(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', e => { if (e.button === 2) mouse.drag = false; });
    window.addEventListener('mousemove', e => {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = true;
      if (mouse.drag) { cam.yaw -= (e.clientX - mouse.lx) * .006; mouse.lx = e.clientX; }
    });
    canvas.addEventListener('wheel', e => { cam.dist = clamp(cam.dist + Math.sign(e.deltaY) * 1.2, 7, 26); e.preventDefault(); }, { passive: false });
    window.addEventListener('keyup', e => { keys[e.code] = false; });
    window.addEventListener('keydown', e => {
      if (G.state !== 'play') return;
      if (UI.isBlocking()) return;
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      keys[e.code] = true;
      if (e.repeat || G.dead) return;
      const c = e.code;
      if (c >= 'Digit1' && c <= 'Digit5') useSkill(+c.slice(5) - 1);
      else if (c === 'Digit8') useSkill(5);
      else if (c === 'Digit9') useSkill(6);
      else if (c === 'Digit6') usePotion('hp');
      else if (c === 'Digit7') usePotion('mp');
      else if (c === 'Space') {
        const m = needTarget(); if (m) cmd = { type: 'attack', mob: m }; else if (throttle('notgt', 1)) UI.log('Nenhum alvo por perto.', 'sys');
      } else if (c === 'Tab') cycleTarget();
      else if (c === 'KeyF') talkNearest();
      else if (c === 'KeyZ') toggleAutoCombat();
      else if (c === 'KeyX') toggleMount();
      else if (c === 'KeyG') UI.toast('Gráficos: ' + cycleQuality());
    });
  }

  /* ---------- save / load ---------- */
  /* conta: vários personagens no mesmo navegador + baú compartilhado (Guarda de Carga) */
  /* várias contas no mesmo navegador: todas ficam em ACCS_KEY; ACC é a conta ativa */
  const ACC_KEY = 'aldoria_account_v1', ACCS_KEY = 'aldoria_accounts_v2';
  let ACC = null, ACCS = null;
  const accFix = A => { if (!A || !Array.isArray(A.chars)) return null; A.bank = A.bank || { items: [], gold: 0 }; if (!Array.isArray(A.bank.items)) A.bank.items = []; return A; };
  function accsLoad() {
    if (ACCS) return ACCS;
    try { ACCS = JSON.parse(localStorage.getItem(ACCS_KEY)); } catch (e) { ACCS = null; }
    if (!ACCS || !Array.isArray(ACCS.list)) ACCS = { cur: null, list: [] };
    ACCS.list = ACCS.list.map(accFix).filter(Boolean);
    // migra a conta única antiga
    try { const o = accFix(JSON.parse(localStorage.getItem(ACC_KEY))); if (o) { if (!o.name) o.name = 'Jogador'; if (!ACCS.list.some(x => x.name.toLowerCase() === o.name.toLowerCase())) ACCS.list.push(o); ACCS.cur = ACCS.cur || o.name; } localStorage.removeItem(ACC_KEY); } catch (e) { /* ignore */ }
    return ACCS;
  }
  function accLoad() {
    accsLoad();
    ACC = ACCS.list.find(x => ACCS.cur && x.name.toLowerCase() === String(ACCS.cur).toLowerCase()) || null;
    // migra o save antigo (um personagem só) para a conta
    try { const old = localStorage.getItem(SAVE_KEY); if (old) { const s = JSON.parse(old); if (s && CLASSES[s.cls]) { if (!ACC) { ACC = { name: 'Jogador', chars: [], bank: { items: [], gold: 0 } }; ACCS.list.push(ACC); ACCS.cur = ACC.name; } ACC.chars.push({ id: 'c' + Date.now().toString(36), data: s }); } localStorage.removeItem(SAVE_KEY); accWrite(); } } catch (e) { /* ignore */ }
    return ACC;
  }
  let saveFail = false;
  function accWrite() {
    try { if (ACCS) localStorage.setItem(ACCS_KEY, JSON.stringify(ACCS)); saveFail = false; }
    catch (e) {
      if (saveFail) return; saveFail = true;
      const msg = 'Não foi possível gravar o progresso (armazenamento cheio ou bloqueado). Exporte o save no painel de administrador para não perder dados.';
      try { UI.toast('⚠ Falha ao salvar'); UI.log(msg, 'quest'); } catch (e2) { /* UI ainda não pronta */ }
    }
  }
  function account() { if (!ACC) accLoad(); return ACC ? { name: ACC.name, chars: ACC.chars.map(c => ({ id: c.id, name: c.data.name, cls: c.data.cls, lvl: c.data.lvl, tier: c.data.tier | 0, look: c.data.look, ch: c.data.main ? c.data.main.chaps.filter(k => k !== 'c0').length : 0 })), bank: ACC.bank } : null; }
  function accounts() { accsLoad(); return ACCS.list.map(a => ({ name: a.name, chars: a.chars.length, cur: !!(ACC && a === ACC) })); }
  /* entra na conta com esse nome; se não existir, cria uma nova (nunca renomeia a atual) */
  function createAccount(name) {
    name = String(name || '').trim().slice(0, 18); if (!name) return false; accsLoad();
    let A = ACCS.list.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (!A) { A = { name, chars: [], bank: { items: [], gold: 0 } }; ACCS.list.push(A); }
    ACC = A; ACCS.cur = A.name; accWrite(); return true;
  }
  function switchAccount(name) { return createAccount(name); }
  function logoutAccount() { accsLoad(); ACC = null; ACCS.cur = null; accWrite(); }
  function deleteAccount(name) { accsLoad(); const n = String(name).toLowerCase(); ACCS.list = ACCS.list.filter(x => x.name.toLowerCase() !== n); if (ACC && ACC.name.toLowerCase() === n) { ACC = null; ACCS.cur = null; } accWrite(); }
  const hasSave = () => { const a = account(); return !!(a && a.chars.length); };
  function snapshot() {
    const p = G.player;
    return { v: 3, w: 2, lv2: 1, cls: p.cls, name: p.name, tier: p.tier, lvl: p.lvl, xp: p.xp, gold: p.gold, inv: p.inv, eq: p.eq, pots: p.pots, quests: G.quests, x: p.x, z: p.z, look: p.look, mounts: p.mounts, lastMount: p.lastMount, attr: p.attr, ap: p.ap, sk: p.sk, sp: p.sp, main: G.main, rec: G.rec, daily: G.daily, feed: p.feed, mst: p.mst, mlv: p.mlv || {}, mbox: p.mbox || [], mats: p.mats || {}, gifts: p.gifts || {} };
  }
  function save() {
    if (G.state !== 'play' || !G.player || !ACC) return;
    let c = ACC.chars.find(x => x.id === G.charId);
    if (!c) { c = { id: G.charId || ('c' + Date.now().toString(36)) }; G.charId = c.id; ACC.chars.push(c); }
    c.data = snapshot(); ACC.last = c.id; accWrite();
  }
  function deleteChar(id) { if (!ACC) return; ACC.chars = ACC.chars.filter(c => c.id !== id); accWrite(); }
  /* baú compartilhado entre os personagens da conta */
  const BANK_MAX = 120, bankMax = () => Math.max(BANK_MAX, (ACC && ACC.bank && ACC.bank.max) | 0);
  function bankPut(id) {
    const p = G.player, i = p.inv.findIndex(it => it.id === id); if (i < 0 || !ACC) return;
    if (ACC.bank.items.length >= bankMax()) return UI.toast('Baú cheio');
    const it = p.inv.splice(i, 1)[0]; delete it.pos; ACC.bank.items.push(it); sfx('pick'); save(); UI.refreshPanels();
  }
  /* mover um item para um espaço (pos) da mochila ('bag') ou do baú ('bank'): no mesmo lugar troca de posição, em outro leva junto o ocupante do destino */
  function itemMove(from, id, to, pos) {
    const p = G.player; if (!p || !ACC) return; id = Number(id); pos |= 0;
    const A = from === 'bank' ? ACC.bank.items : p.inv, B = to === 'bank' ? ACC.bank.items : p.inv, it = A.find(x => x.id === id); if (!it) return;
    const sz = (z, l) => z === 'bank' ? Math.max(120, bankMax(), l.length) : Math.max(24, l.length);
    const sa = sz(from, A), sb = sz(to, B); if (pos < 0 || pos >= sb) return;
    fillPos(A, sa); if (A !== B) fillPos(B, sb);
    const occ = B.find(x => x !== it && x.pos === pos);
    if (A === B) { const old = it.pos; it.pos = pos; if (occ) occ.pos = old; }
    else {
      if (!occ && B.length >= (to === 'bank' ? bankMax() : 24)) return UI.toast(to === 'bank' ? 'Baú cheio' : 'Mochila cheia');
      const old = it.pos; A.splice(A.indexOf(it), 1); it.pos = pos; B.push(it); if (it.id >= ITEM_UID) ITEM_UID = it.id + 1;
      if (occ) { B.splice(B.indexOf(occ), 1); occ.pos = old; A.push(occ); if (occ.id >= ITEM_UID) ITEM_UID = occ.id + 1; }
    }
    sfx('pick'); save(); UI.refreshPanels();
  }
  function bankTake(id) {
    const p = G.player; if (!ACC) return; const i = ACC.bank.items.findIndex(it => it.id === id); if (i < 0) return;
    if (p.inv.length >= 24) return UI.toast('Mochila cheia');
    const it = ACC.bank.items.splice(i, 1)[0]; delete it.pos; p.inv.push(it); if (it.id >= ITEM_UID) ITEM_UID = it.id + 1; sfx('pick'); save(); UI.refreshPanels();
  }
  function bankGold(n) {
    const p = G.player; if (!ACC) return; n = Math.round(n);
    if (n > 0) { n = Math.min(n, p.gold); p.gold -= n; ACC.bank.gold += n; } else { n = Math.min(-n, ACC.bank.gold); ACC.bank.gold -= n; p.gold += n; }
    sfx('coin'); save(); UI.refreshPanels();
  }
  function load(id) {
    try {
      if (!ACC) accLoad(); const ch = ACC && ACC.chars.find(c => c.id === id); const s = ch && ch.data; if (!s || !CLASSES[s.cls]) return false; G.charId = id;
      newPlayer(s.cls, null, typeof s.name === 'string' ? s.name.slice(0, 16) : 'Herói'); const p = G.player;
      p.tier = s.tier | 0; p.lvl = s.lv2 ? clamp(s.lvl | 0 || 1, 1, lvCap(p.tier)) : lvForEff(clamp(s.lvl | 0 || 1, 1, MAXLV), p.tier); p.xp = s.xp || 0; // saves antigos (nível 1..50) viram o nível equivalente da escala nova p.gold = s.gold || 0; p.inv = Array.isArray(s.inv) ? s.inv : [];
      p.eq = Object.assign({ w: null, h: null, a: null, l: null, b: null, c: null }, s.eq || {}); p.pots = Object.assign({ hp: 0, mp: 0 }, s.pots || {});
      for (const q of QUESTS) if (s.quests && s.quests[q.id]) G.quests[q.id] = s.quests[q.id];
      let mx = ITEM_UID; for (const it of p.inv.concat(SLOT_ORDER.map(s => p.eq[s]))) if (it && it.id >= mx) mx = it.id + 1; ITEM_UID = mx;
      p.attr = Object.assign({ str: 0, dex: 0, int: 0, vit: 0, spi: 0 }, s.attr || {}); { const sp = ATTR_KEYS.reduce((a, k) => a + (p.attr[k] | 0), 0); p.ap = s.ap != null ? s.ap | 0 : Math.max(0, ptsAt(AP_PER_LEVEL, p.lvl, p.tier) - sp); }
      p.look = Object.assign({}, DEFLOOK[s.cls], s.look || {}); p.mounts = Array.isArray(s.mounts) ? s.mounts.filter(x => MOUNTS[x]) : []; p.lastMount = MOUNTS[s.lastMount] ? s.lastMount : null;
      if (isFinite(s.x) && isFinite(s.z)) { p.x = s.x; p.z = s.z; }
      if (!s.w) { // save de antes do continente: cada região era um disco separado; leva para o lugar equivalente no continente
        const OLD = [['aldoria', 0, 0], ['desert', 728, 0], ['snow', 0, -728], ['volcano', -728, 0]];
        let o = OLD[0], bd = 1e9; for (const q of OLD) { const d = Math.hypot(p.x - q[1], p.z - q[2]); if (d < bd) { bd = d; o = q; } }
        const v = VILLAGES.find(q => q.id === o[0]); p.x = v.cx + (p.x - o[1]); p.z = v.cz + (p.z - o[2]);
        const t = inTownSq(p.x, p.z, 0); if (coastD(p.x, p.z) < 3 || (t && t !== v) || blocked(p.x, p.z, .6)) { p.x = v.arrive[0]; p.z = v.arrive[1]; }
        if (s.main && isFinite(s.main.i)) { const ni = MAIN.findIndex(q => q.oi === s.main.i); s.main.i = ni < 0 ? MAIN.length : ni; }
      }
      if (coastD(p.x, p.z) < 1) { p.x = VILLAGES[0].arrive[0]; p.z = VILLAGES[0].arrive[1]; }
      if (Array.isArray(s.sk)) { p.sk = s.sk.slice(0, 7); while (p.sk.length < 7) p.sk.push(0); p.sp = s.sp | 0; }
      else { // save antigo: já conhece o que o nível/evolução liberava
        const sk = CLASSES[p.cls].skills; p.sk = sk.map((k, i) => (k.tier || 0) <= p.tier && EL(p) >= Math.max(SK_LEARN[i].lvl, k.lvl || 0) ? 1 : 0); p.sp = Math.max(0, ptsAt(SK_PTS_LEVEL, p.lvl, p.tier));
      }
      if (s.main && isFinite(s.main.i)) { if (!s.main.v) { s.main.v = 1; if (s.w) s.main.i += MAIN.filter(q => q.ch === 'c0').length; } G.main = Object.assign(G.main, s.main); } // v1: o prólogo do campo de treino entrou no começo da história
      if (s.rec) for (const k in G.rec) if (k in s.rec) G.rec[k] = s.rec[k];
      if (s.daily && s.daily.list) G.daily = s.daily;
      p.feed = s.feed | 0; p.mst = s.mst == null ? 100 : s.mst;
      p.mlv = {}; if (s.mlv) for (const k in s.mlv) if (MOUNTS[k] && s.mlv[k]) p.mlv[k] = { lv: Math.max(1, Math.min(MOUNT_MAXLV, s.mlv[k].lv | 0)), xp: Math.max(0, +s.mlv[k].xp || 0) };
      p.mbox = Array.isArray(s.mbox) ? s.mbox.filter(x => MOUNTS[x]) : [];
      p.mats = {}; if (s.mats) for (const k of STONE_IDS) if (s.mats[k] > 0) p.mats[k] = s.mats[k] | 0;
      p.gifts = Object.assign({}, s.gifts || {});
      { let mx = ITEM_UID; for (const it of ACC.bank.items) if (it.id >= mx) mx = it.id + 1; ITEM_UID = mx; }
      // tipos de arma removidos viram um tipo válido da classe; itens sem tier ficam como Mortal
      for (const it of p.inv.concat(SLOT_ORDER.map(k => p.eq[k]))) if (it) { fixWeapon(it, p.cls); it.tierReq = it.tierReq | 0; if (!it.cls && (it.slot === 'w' || ARM_SHARE[it.slot])) it.cls = p.cls; }
      for (const it of ACC.bank.items) { fixWeapon(it); it.tierReq = it.tierReq | 0; if (!it.cls && it.slot === 'w' && CLS_OF_WT[it.wt]) it.cls = CLS_OF_WT[it.wt]; }
      if ((s.v | 0) < 3 && p.tier > 0) { // saves antigos: Ascendido/Transcendente (níveis 20/40) viram Mortal; o ouro da evolução antiga volta
        const back = [0, 500, 5500][Math.min(2, p.tier)] || 0; p.gold += back; p.tier = 0;
        G.loadMsg = 'O sistema de evolução mudou: agora são 4 classes (Mortal → Imortal → Ancestral → Supremo), a partir do nível 50. Você voltou a Mortal e recebeu ' + back + ' ouro de volta.';
      }
      p.tier = clamp(p.tier, 0, TIERS.length - 1);
      recalc(); p.hp = p.maxHp; p.mp = p.maxMp; updateQuestLocks(true);
      checkGifts(); // quem já passou do nível 16/26 recebe os presentes
      return true;
    } catch (e) { console.warn('Falha ao carregar o save:', e); return false; }
  }

  /* ---------- fluxo ---------- */
  /* ---------- eventos (criados pelo painel do administrador; no multiplayer viriam do servidor) ---------- */
  let events = [], evLast = 0, adminUsed = false;
  const evOn = new Map(); // chave da ocorrência -> { ev, end }
  const HM = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? [Math.min(23, +m[1]), Math.min(59, +m[2])] : null; };
  function evOcc(e, now) { // ocorrência ativa agora: { key, end } ou null
    if (e.rec) {
      const f = HM(e.rec.from), t = HM(e.rec.to); if (!f || !t) return null;
      for (const back of [0, 1]) { // back = 1 cobre eventos que atravessam a meia-noite
        const day = new Date(now); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - back);
        if (!e.rec.days.includes(day.getDay())) continue;
        const s = new Date(day); s.setHours(f[0], f[1], 0, 0); const en = new Date(day); en.setHours(t[0], t[1], 0, 0); if (en <= s) en.setDate(en.getDate() + 1);
        if (now >= +s && now < +en && !(e.skip >= +en)) return { key: e.id + '@' + (+s), end: +en };
      }
      return null;
    }
    return now >= e.start && now < e.end ? { key: e.id, end: e.end } : null;
  }
  function sanitizeEvents(list) {
    const out = [];
    for (const e of Array.isArray(list) ? list : []) {
      if (!e || !EVENT_TYPES[e.type]) continue;
      const T = EVENT_TYPES[e.type], o = { id: String(e.id || ('e' + Date.now().toString(36) + out.length)).slice(0, 40), type: e.type, mult: Math.max(T.unit === '%' ? 0 : 1, Math.min(T.unit === '%' ? 100 : 20, +e.mult || T.def)) };
      if (e.name) o.name = String(e.name).slice(0, 40);
      if (e.rec) { const days = (Array.isArray(e.rec.days) ? e.rec.days : []).map(Number).filter(d => d >= 0 && d <= 6); if (!days.length || !HM(e.rec.from) || !HM(e.rec.to)) continue; o.rec = { days: [...new Set(days)].sort(), from: e.rec.from, to: e.rec.to }; if (+e.skip) o.skip = +e.skip; }
      else { o.start = +e.start || 0; o.end = +e.end || 0; if (!(o.end > o.start)) continue; }
      out.push(o);
    }
    return out;
  }
  const evName = e => e.name || evTitle(e);
  function evTick(mode) { // mode: true = anunciar início/fim, 'load' = anunciar os já ativos, false = só recalcular
    const now = Date.now(); evLast = now;
    const cur = new Map();
    for (const e of events) { const o = evOcc(e, now); if (o) cur.set(o.key, { ev: e, end: o.end }); }
    const play = G.state === 'play', started = [], ended = [];
    for (const [k, v] of cur) if (!evOn.has(k)) started.push(v.ev);
    for (const [k, v] of evOn) if (!cur.has(k)) ended.push(v.ev);
    evOn.clear(); for (const [k, v] of cur) evOn.set(k, v);
    const eff = { xpMul: 1, goldMul: 1, rareMul: 1, champMul: 1, enhAdd: 0, stoneMul: 1 };
    for (const { ev } of cur.values()) { const m = ev.mult;
      if (ev.type === 'xp') eff.xpMul *= m; else if (ev.type === 'gold') eff.goldMul *= m; else if (ev.type === 'rare') eff.rareMul *= m;
      else if (ev.type === 'champ') eff.champMul *= m; else if (ev.type === 'enh') eff.enhAdd += m; else if (ev.type === 'stone') eff.stoneMul *= m; }
    EV_EFF = eff;
    UI.setEvents([...cur.values()].map(({ ev, end }) => ({ ic: EVENT_TYPES[ev.type].ic, name: evName(ev), end })));
    if (!play) return;
    if (mode === 'load') { const l = [...cur.values()].map(v => EVENT_TYPES[v.ev.type].ic + ' ' + evName(v.ev)); if (l.length) { UI.bigToast('Evento ativo: ' + l.join(' · '), 'Aproveite enquanto dura!'); UI.log('Evento ativo: ' + l.join(', ') + '.', 'lvl'); } return; }
    if (!mode) return;
    const nm = l => l.map(e => EVENT_TYPES[e.type].ic + ' ' + evName(e)).join(' · ');
    for (const e of ended) UI.log('O evento ' + evName(e) + ' terminou.', 'sys');
    for (const e of started) UI.log('🎉 Evento começou: ' + evName(e) + '!', 'lvl');
    if (started.length) { UI.bigToast('🎉 Evento começou: ' + nm(started), started.length === 1 ? EVENT_TYPES[started[0].type].d : 'Vários eventos ativos!'); sfx('level'); }
    else if (ended.length) UI.bigToast('Evento terminou: ' + nm(ended), 'Obrigado por participar!');
    if (started.length || ended.length) UI.refreshPanels();
  }
  /* entrega acesso controlado ao painel do administrador (uma única vez, no carregamento do admin.js) */
  /* ---------- modo de teste do administrador ----------
     Só existe através do acesso entregue em _adminHook (admin.js, painel com senha). Nada daqui fica no objeto Game,
     as trapaças (TST) não são salvas e o painel desliga todas quando a sessão do administrador é trancada ou expira. */
  const TST = { god: false, nocd: false, inf: false, spd: false, one: false, tp: false };
  const ADM_ACC = 'ADM';
  const ADM_NAME = { vanguard: 'ADM Vanguarda', arcanist: 'ADM Arcanista', huntress: 'ADM Caçadora', tamer: 'ADM Invocador' };
  const ADM_ATTR = { vanguard: { str: .5, vit: .4, dex: .1 }, arcanist: { int: .6, vit: .3, spi: .1 }, huntress: { dex: .62, vit: .3, spi: .08 }, tamer: { int: .56, vit: .32, spi: .12 } };
  // adicionais (pedras) de cada classe: arma, peças de armadura (h/a/l/b) e acessório
  const ADM_ADDS = {
    vanguard: { w: ['atk', 'atk', 'crit'], arm: ['hpp', 'def', 'def'], c: ['atk', 'hpp', 'crit'] },
    arcanist: { w: ['arc', 'arc', 'atk'], arm: ['hpp', 'def', 'arc'], c: ['arc', 'crit', 'hpp'] },
    huntress: { w: ['crit', 'atk', 'atk'], arm: ['hpp', 'def', 'crit'], c: ['crit', 'crit', 'atk'] },
    tamer: { w: ['arc', 'atk', 'arc'], arm: ['hpp', 'def', 'arc'], c: ['arc', 'hpp', 'crit'] },
  };
  const admNeedPlay = () => G.state === 'play' && G.player ? null : { ok: false, msg: 'Entre no jogo com um personagem primeiro.' };
  function admAdds(cls, slot, grade) { const A = ADM_ADDS[cls] || ADM_ADDS.vanguard; return (slot === 'w' ? A.w : slot === 'c' ? A.c : A.arm).slice(0, ADD_MAX).map(k => ({ k, v: addVal(k, grade) })); }
  function admItem(cls, slot, rar, plus, tier, wt, adds) {
    if (!CLASSES[cls]) cls = 'vanguard'; if (!SLOTS[slot]) slot = 'w';
    const it = buildItem(slot, cls, MAXLV, clamp(rar | 0, 0, RARITY.length - 1), slot === 'w' ? (WTYPES[cls].includes(wt) ? wt : WTYPES[cls][0]) : undefined, clamp(tier | 0, 0, TIERS.length - 1));
    it.plus = clamp(plus | 0, 0, ANCIENT_MAX); if (adds) it.adds = admAdds(cls, slot, pgOf(it));
    return it;
  }
  function admChar(cls) { // personagem completo (monta em G.player e devolve o snapshot)
    newPlayer(cls, null, ADM_NAME[cls]); const p = G.player, T = TIERS.length - 1;
    p.tier = T; p.lvl = lvCap(T); p.xp = 0;
    const tot = AP_PER_LEVEL * (MAXLV - 1), W = ADM_ATTR[cls], ks = Object.keys(W); let used = 0;
    ks.forEach((k, i) => { const n = i === ks.length - 1 ? tot - used : Math.round(tot * W[k]); p.attr[k] = n; used += n; }); p.ap = 0;
    p.sk = p.sk.map((_, i) => CLASSES[cls].skills[i] ? SK_MAX : 0); p.sp = 0;
    for (const s of SLOT_ORDER) p.eq[s] = admItem(cls, s, 4, 10, T, null, true);
    p.inv = []; p.gold = 1e7; p.pots = { hp: 99, mp: 99 }; p.feed = 999; p.mst = 100;
    p.mounts = Object.keys(MOUNTS); p.lastMount = MOUNTS.griffin ? 'griffin' : p.mounts[p.mounts.length - 1];
    p.mats = {}; for (const k of STONE_IDS) p.mats[k] = 999;
    p.gifts = {}; for (const gf of GIFTS) for (let t = 0; t <= T; t++) p.gifts[gf.id + (t ? '_t' + t : '')] = 1; // sem presentes repetidos no baú
    p.x = VILLAGES[0].arrive[0]; p.z = VILLAGES[0].arrive[1];
    recalc(); p.hp = p.maxHp; p.mp = p.maxMp;
    return snapshot();
  }
  /* cria (ou recria) a conta de teste "ADM" com um personagem completo de cada classe. Não toca nas outras contas. */
  function admBuild() {
    if (G.state === 'create') return { ok: false, msg: 'Saia da criação de personagem primeiro.' };
    accsLoad();
    let A = ACCS.list.find(x => x.name.toLowerCase() === ADM_ACC.toLowerCase());
    if (A && !A.adm && A.chars.length) return { ok: false, msg: 'Já existe uma conta "' + A.name + '" do jogador que não é de teste: ela não será alterada.' };
    if (G.state === 'play') save(); // o personagem atual fica gravado na conta dele
    const prev = ACC ? ACC.name : null, again = !!A;
    G.state = 'menu'; G.dead = false; cmd = null; tmob = null; pet = null; UI.closeAll(); UI.hideDeath();
    if (!A) { A = { name: ADM_ACC, chars: [], bank: { items: [], gold: 0 } }; ACCS.list.push(A); }
    A.adm = 1; A.chars = []; A.bank = { items: [], gold: 1e7 };
    const stamp = Date.now().toString(36);
    Object.keys(CLASSES).forEach((cls, i) => A.chars.push({ id: 'adm' + i + stamp, data: admChar(cls) }));
    for (const cls of Object.keys(CLASSES)) for (let r = 0; r < RARITY.length; r++) for (const s of SLOT_ORDER) A.bank.items.push(admItem(cls, s, r, 0, TIERS.length - 1, null, false));
    A.bank.max = A.bank.items.length + 40; A.last = A.chars[0].id;
    ACC = A; ACCS.cur = A.name; accWrite();
    newPlayer('vanguard'); G.charId = null; UI.showMenu(hasSave());
    return { ok: true, prev, msg: 'Conta "' + A.name + '" ' + (again ? 'recriada' : 'criada') + ' com ' + A.chars.length + ' personagens (Supremo, nível ' + MAXLV + ') e ' + A.bank.items.length + ' itens no baú.' + (prev && prev !== A.name ? ' Sua conta "' + prev + '" continua intacta (use ⇄ Trocar conta para voltar).' : '') };
  }
  function admLevel(n) {
    const e = admNeedPlay(); if (e) return e; const p = G.player;
    if (p.lvl >= lvCap(p.tier)) return { ok: false, msg: 'Já está no nível ' + lvCap(p.tier) + '.' };
    for (let i = 0; i < n && p.lvl < lvCap(p.tier); i++) gainXp(Math.max(1, xpPlayer(p.lvl, p.tier) - p.xp), true);
    save(); UI.refreshPanels(); return { ok: true, msg: 'Nível ' + p.lvl + '.' };
  }
  function admTier(t) {
    const e = admNeedPlay(); if (e) return e; const p = G.player; t = clamp(t | 0, 0, TIERS.length - 1);
    p.tier = t; retierMobs(); recalc(); p.hp = p.maxHp; p.mp = p.maxMp; save(); UI.refreshPanels();
    return { ok: true, msg: 'Fase: ' + TIERS[t] + '.' };
  }
  function admGold(n) { const e = admNeedPlay(); if (e) return e; G.player.gold += Math.max(0, n | 0); sfx('coin'); save(); UI.refreshPanels(); return { ok: true, msg: 'Ouro: ' + fmt(G.player.gold) + '.' }; }
  function admHeal() {
    const e = admNeedPlay(); if (e) return e; const p = G.player;
    if (G.dead) { G.dead = false; UI.hideDeath(); }
    recalc(); p.hp = p.maxHp; p.mp = p.maxMp; p.mst = 100; p.feed = Math.max(p.feed | 0, 99); p.pots.hp = Math.max(p.pots.hp, 99); p.pots.mp = Math.max(p.pots.mp, 99);
    fxBurst(p.x, 1, p.z, [.4, 1, .5], 16, 3, .18); UI.refreshPanels(); return { ok: true, msg: 'Vida, ' + resName(p.cls).toLowerCase() + ' e energia da montaria cheias.' };
  }
  function admStory() {
    const e = admNeedPlay(); if (e) return e;
    G.main.i = MAIN.length; G.main.prog = 0; G.main.chaps = CHAPTERS.map(c => c.id);
    for (const q of QUESTS) G.quests[q.id] = { state: 'done', prog: q.kill || 1 };
    track('chap', 0); save(); UI.refreshPanels(); return { ok: true, msg: 'História principal e missões marcadas como concluídas.' };
  }
  function admGive(o) {
    const e = admNeedPlay(); if (e) return e; const p = G.player; o = o || {};
    const it = admItem(o.cls || p.cls, o.slot, o.rar, o.plus, o.tier, o.wt, !!o.adds);
    if (p.inv.length < 24) p.inv.push(it);
    else if (ACC && ACC.bank.items.length < bankMax()) { ACC.bank.items.push(it); save(); UI.refreshPanels(); return { ok: true, msg: 'Mochila cheia: ' + itemName(it) + ' foi para o baú.' }; }
    else return { ok: false, msg: 'Mochila e baú cheios.' };
    sfx('pick'); save(); UI.refreshPanels(); return { ok: true, msg: 'Gerado: ' + itemName(it) + ' (' + RARITY[it.rar].n + ', ' + TIERS[it.tierReq] + ').', id: it.id };
  }
  function admSpot(r0, r1) { // ponto livre em terra perto do jogador, fora de zona segura
    const p = G.player;
    for (let t = 0; t < 60; t++) { const a = rnd() * PI * 2, r = r0 + rnd() * (r1 - r0), x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r; if (coastD(x, z) > 3 && !blocked(x, z, 1.6) && !inSafe(x, z)) return [x, z]; }
    return null;
  }
  function admSpawn(id) {
    const e = admNeedPlay(); if (e) return e;
    const q = admSpot(7, 13); if (!q) return { ok: false, msg: 'Sem espaço livre fora da vila por perto: saia da vila e tente de novo.' };
    let m;
    if (id === 'champ') {
      const z = zoneAt(q[0], q[1]); if (!z || !MOBS[z.id]) return { ok: false, msg: 'Não há campeões nesta zona.' };
      m = champAt(q[0], q[1], z); if (!m) return { ok: false, msg: 'Falhou.' };
    } else {
      const b = BOSSES[id]; if (!b) return { ok: false, msg: 'Chefe desconhecido.' };
      const s = mobStats(b.lvl, b); m = mobObj(id, b.n, zoneAt(q[0], q[1]).id, b.lvl, s, b.sc, MOB_COL[id], q[0], q[1], b, rnd);
      G.mobs.push(m); UI.toast('⚠ ' + b.n + ' apareceu!'); sfx('boom');
    }
    m.adm = 1; m.respawnAt = Infinity; fxPillar(m.x, m.z, 1.4, [1, .3, .3], 1.2);
    return { ok: true, msg: m.name + ' (nv ' + m.lvl + ') surgiu perto de você.' };
  }
  function admTime(h) { G.tod = ((+h % 24) + 24) % 24; return { ok: true, msg: 'Hora: ' + Math.floor(G.tod) + 'h' + String(Math.round(G.tod % 1 * 60)).padStart(2, '0') + '.' }; }
  function admWeather(id) {
    if (!WEATHER[id]) return { ok: false, msg: 'Clima desconhecido.' };
    wx.id = id; wx.t = 600; return { ok: true, msg: 'Clima: ' + WEATHER[id].n + ' (por 10 min).' };
  }
  function admPlace(x, z) { // coloca o jogador num ponto (sem custo nem regra de portal)
    const p = G.player; dismount(true); p.path = null; p.dash = null; p.detour = null; p.x = x; p.z = z; cmd = null; tmob = null; autoHome = null; portalLock = true; G.wasSafe = inSafe(x, z);
    if (pet) { pet.x = x + 1.5; pet.z = z + 1.5; } cam.init = false; fxBurst(x, 1.2, z, [1, .4, .4], 22, 4, .2); fxDisc(x, z, .5, 3.5, .7, [1, .4, .4], .6);
  }
  function admVillage(id) {
    const e = admNeedPlay(); if (e) return e; const v = VILLAGES.find(q => q.id === id); if (!v) return { ok: false, msg: 'Vila desconhecida.' };
    admPlace(v.arrive[0], v.arrive[1]); UI.closeAll(); save(); return { ok: true, msg: 'Você foi para ' + v.n + '.' };
  }
  function admTp(x, z) {
    const e = admNeedPlay(); if (e) return e; if (!TST.tp) return { ok: false, msg: 'Teleporte livre desligado.' };
    if (!isFinite(x) || !isFinite(z) || coastD(x, z) < SHORE_MIN + 1) return { ok: false, msg: 'Só é possível teleportar para terra firme.' };
    const q = freeSpot(x, z, x, z, .5); if (coastD(q.x, q.z) < SHORE_MIN + .5) return { ok: false, msg: 'Só é possível teleportar para terra firme.' };
    admPlace(q.x, q.z); return { ok: true, msg: 'Teleportado para ' + zoneAt(q.x, q.z).name + ' (' + Math.round(q.x) + ', ' + Math.round(q.z) + ').' };
  }
  const ADM_TEST = Object.freeze({
    cheats(o) { if (o) for (const k in TST) TST[k] = !!o[k]; return Object.assign({}, TST); },
    info() {
      accsLoad(); const p = G.player, A = ACCS.list.find(x => x.name.toLowerCase() === ADM_ACC.toLowerCase());
      return { state: G.state, acc: ACC ? ACC.name : null, isAdm: !!(ACC && ACC.adm), admExists: !!A, admReal: !!(A && !A.adm && A.chars.length), play: G.state === 'play', name: p && p.name, cls: p && p.cls, lvl: p && p.lvl, tier: p && p.tier, gold: p && p.gold, tod: G.tod, weather: wx.id };
    },
    buildAdm: admBuild, level: admLevel, tier: admTier, gold: admGold, heal: admHeal, story: admStory, give: admGive, spawn: admSpawn, time: admTime, weather: admWeather, village: admVillage, tp: admTp,
    soundNames: () => SND.names(), soundPlay: n => { SND.init(); return { ok: !!SND.play(n, { force: true }), msg: 'Som: ' + n }; }, soundZones: () => SND.zones(),
    soundPreview: (env) => { SND.init(); audPreview = env ? { until: G.t + 45, env } : null; return { ok: true, msg: env ? 'Prévia por 45 s: ' + (env.label || '') : 'Prévia desligada.' }; },
    lists: () => ({ classes: Object.keys(CLASSES).map(k => [k, CLASSES[k].name, WTYPES[k].slice()]), tiers: TIERS.slice(), rarity: RARITY.map(r => r.n), slots: SLOT_ORDER.map(s => [s, SLOTS[s]]), bosses: Object.keys(BOSSES).map(k => [k, BOSSES[k].n, BOSSES[k].lvl]), villages: VILLAGES.map(v => [v.id, v.n]), weather: Object.keys(WEATHER).map(k => [k, WEATHER[k].n]) }),
  });
  function _adminHook(fn) {
    if (adminUsed || typeof fn !== 'function') return false; adminUsed = true;
    fn(Object.freeze({
      cfg: CFG, defaults: CFG_DEFAULT,
      getEvents: () => JSON.parse(JSON.stringify(events)),
      setEvents(list) { events = sanitizeEvents(list); evTick(true); return JSON.parse(JSON.stringify(events)); },
      active: () => [...evOn.entries()].map(([key, v]) => ({ key, id: v.ev.id, name: evName(v.ev), ic: EVENT_TYPES[v.ev.type].ic, end: v.end, rec: !!v.ev.rec })),
      cfgChanged() { champT = G.state === 'play' ? Math.min(champT, Math.max(CFG.champ.min, CFG.champ.max)) : CFG.champ.first; if (G.state === 'play') UI.refreshPanels(); },
      toast: t => UI.toast(t), banner: (t, s) => UI.bigToast(t, s),
      test: ADM_TEST,
    }));
    return true;
  }
  function startPlay() {
    wx.t = Math.min(wx.t, 60); G.state = 'play'; G.dead = false; G.wasSafe = false; portalLock = true; loadAuto(); autoHome = null; autoPause = 0; autoOut.hp = autoOut.mp = false; populate(); cam.init = false; lastZone = null; combatT = -99;
    UI.hideMenu(); UI.hideDeath(); UI.closeAll();
    evTick('load'); // mostra a faixa e o aviso "Evento ativo" se já houver evento rodando
  }
  /* lojas de equipamento básico (sem bônus de raridade nem refino) e ração */
  const shopPrice = it => Math.max(1, Math.round(itemValue(it) * 2.2 * CFG.econ.shopMul));
  function shopStock(kind) { // grau atual e o anterior
    const p = G.player, top = gradeOfLvl(Math.round(EL(p)), p.tier), out = [];
    for (let gr = Math.max(gradeMin(p.tier), top - 1); gr <= top; gr++) {
      const lv = lvlOfGrade(gr, p.tier);
      if (kind === 'weapon') for (const wt of WTYPES[p.cls]) out.push(buildItem('w', p.cls, lv, 0, wt, p.tier));
      else for (const s of ['h', 'a', 'l', 'g', 'b', 'c']) out.push(buildItem(s, p.cls, lv, 0, undefined, p.tier));
    }
    ITEM_UID -= out.length; // só vitrine: não gasta ids
    return out.map(it => ({ it, price: shopPrice(it) }));
  }
  function buyItem(slot, wt, grade) {
    const p = G.player, it = buildItem(slot, p.cls, lvlOfGrade(grade, p.tier), 0, wt || undefined, p.tier), price = shopPrice(it);
    if (grade > gradeOfLvl(Math.round(EL(p)), p.tier)) return { ok: false, msg: 'Nível insuficiente.' };
    if (p.gold < price) { ITEM_UID--; return { ok: false, msg: 'Ouro insuficiente.' }; }
    if (p.inv.length >= 24) { ITEM_UID--; return { ok: false, msg: 'Mochila cheia.' }; }
    p.gold -= price; p.inv.push(it); sfx('coin'); save(); return { ok: true, msg: 'Você comprou ' + itemName(it) + '.' };
  }
  const FEED_PRICE = 15;
  function buyFeed(n) {
    const p = G.player, c = FEED_PRICE * n; if (p.gold < c) return { ok: false, msg: 'Ouro insuficiente.' };
    p.gold -= c; p.feed = (p.feed || 0) + n; sfx('coin'); return { ok: true, msg: '+' + n + ' ração(ões). Sua montaria come sozinha quando o fôlego fica baixo.' };
  }
  function learnSkill(i) {
    const p = G.player, s = CLASSES[p.cls].skills[i], L = SK_LEARN[i]; if (!s || !L || p.sk[i]) return;
    if ((s.tier || 0) > p.tier) return UI.toast('Requer a evolução ' + TIERS[s.tier]);
    if (EL(p) < Math.max(L.lvl, s.lvl || 0)) return UI.toast('Requer nível ' + dispLv(Math.max(L.lvl, s.lvl || 0), p.tier));
    if ((p.sp || 0) < L.pts) return UI.toast('Pontos de habilidade insuficientes (' + L.pts + ')');
    p.sp -= L.pts; p.sk[i] = 1; mainEv('learn'); sfx('level'); UI.toast('Habilidade aprendida: ' + s.n); UI.log('Você aprendeu ' + s.n + '!', 'lvl'); save(); UI.refreshPanels();
  }
  function raiseSkill(i) {
    const p = G.player, L = p.sk[i], cost = skRaiseCost(L); if (!L || L >= SK_MAX) return;
    if (L >= skCap(EL(p))) return UI.toast('Nível da habilidade limitado pelo seu nível: precisa do nível ' + dispLv(L * 5, p.tier));
    if ((p.sp || 0) < cost) return UI.toast('Pontos de habilidade insuficientes (' + cost + ')');
    p.sk[i]++; p.sp -= cost; sfx('pick'); UI.refreshPanels();
  }
  function resetSkills() {
    const p = G.player, cost = 40 * Math.round(EL(p)); if (p.gold < cost) return UI.toast('Ouro insuficiente (' + cost + ')');
    let back = 0; for (let i = 0; i < p.sk.length; i++) { back += skSpent(i, p.sk[i]); p.sk[i] = 0; }
    p.gold -= cost; p.sp += back; UI.log('Habilidades redistribuídas: ' + back + ' pontos devolvidos. Fale com o Mestre de Habilidades.', 'sys'); UI.refreshPanels();
  }
  function starterKit(evo) { // modo história: arma e roupa básicas do tier atual + 10 poções de cada
    const p = G.player;
    p.eq.w = buildItem('w', p.cls, 1, 0, WTYPES[p.cls][0], p.tier);
    for (const s of ['a', 'l', 'b']) p.eq[s] = buildItem(s, p.cls, 1, 0, undefined, p.tier);
    if (evo) { p.pots.hp = Math.max(p.pots.hp, 10); p.pots.mp = Math.max(p.pots.mp, 10); p.feed = Math.max(p.feed || 0, 5); }
    else { p.pots.hp = 10; p.pots.mp = 10; p.feed = 5; }
    if (!evo) { // personagem novo: peças de grau 0 com poder 1 (ataque 1, defesa 1) e sem extras; o poder de verdade vem dos drops
      for (const s of SLOT_ORDER) { const it = p.eq[s]; if (!it) continue; for (const k of ['mp', 'dodge', 'spd', 'crit']) delete it[k]; if (it.atk != null) it.atk = 1; if (it.def != null) it.def = 1; if (it.hp != null) it.hp = 0; }
    }
    recalc(); p.hp = p.maxHp; p.mp = p.maxMp;
  }
  function newGame(cls, look, name) {
    if (!CLASSES[cls]) return; initAudio(); if (!ACC) accLoad(); if (!ACC) createAccount('Jogador'); G.charId = 'c' + Date.now().toString(36);
    { let mx = ITEM_UID; for (const it of ACC.bank.items) if (it.id >= mx) mx = it.id + 1; ITEM_UID = mx; } newPlayer(cls, look ? fixLook(Object.assign({}, look)) : look, name); starterKit(); G.player.x = CAMP.sx; G.player.z = CAMP.sz; startPlay();
    UI.log('Bem-vindo a Aldoria, ' + G.player.name + '! Você está no Campo de Treinamento: fale com o Instrutor Brann (clique nele ou aperte F). Você começa sem habilidades: gaste os ' + SK_PTS_LEVEL + ' pontos com o Mestre de Habilidades, ao lado dele.', 'sys'); save();
  }
  /* ---------- criação de personagem ---------- */
  const NAMES_M = ['Aldric', 'Bram', 'Cassian', 'Dorian', 'Evander', 'Fenris', 'Gareth', 'Hadrian', 'Ivor', 'Joren', 'Kael', 'Lucan', 'Magnus', 'Orin', 'Rowan', 'Soren', 'Tarik', 'Varian'];
  const NAMES_F = ['Aela', 'Briar', 'Calista', 'Dara', 'Elowen', 'Freya', 'Isolde', 'Kaia', 'Lyra', 'Maelys', 'Nyra', 'Ophelia', 'Rhea', 'Selene', 'Thalia', 'Vesper', 'Yara', 'Zora'];
  const randName = g => { const a = g ? NAMES_F : NAMES_M; return a[Math.floor(Math.random() * a.length)]; };
  function createOpen() {
    G.state = 'create'; G.tod = 15.6; wx.id = 'clear'; wx.t = 9999; wx.level = 0; wx.fogK = 0;
    const cls = 'vanguard', look = Object.assign({}, DEFLOOK[cls]);
    G.cr = { cls, look, name: randName(look.g), yaw: 1.75, zoom: 1, dirty: false };
    UI.showCreate(G.cr);
  }
  function createSet(k, v) {
    const c = G.cr; if (!c) return; c.dirty = true;
    if (k === 'hcx') { if (!hexRgb(v)) return; c.look.hcx = v; }
    else { const lim = LOOK_LIM[k]; if (!lim) return; c.look[k] = ((v % lim) + lim) % lim; if (k === 'hc') delete c.look.hcx; }
    if (k === 'g') { fixLook(c.look); c.look.hs = c.look.g ? 1 : 0; if (c.autoName) c.name = randName(c.look.g); }
    fixLook(c.look);
    UI.syncCreate(c);
  }
  function fixLook(L) { // regras por gênero: mulher sem barba; só estilos e marcas permitidos
    const gi = L.g ? 1 : 0; if (gi) L.bd = 0;
    if (!HAIR_BY_G[gi].includes(L.hs)) L.hs = HAIR_BY_G[gi][0];
    if (!FACE_BY_G[gi].includes(L.fc)) L.fc = 0;
    return L;
  }
  function createCls(id) {
    const c = G.cr; if (!c || !CLASSES[id]) return; c.cls = id;
    if (!c.dirty) { const g = c.look.g; c.look = Object.assign({}, DEFLOOK[id]); if (c.autoName !== false) { /* mantém o gênero padrão da classe */ } void g; }
    UI.syncCreate(c);
  }
  function createName(n) { if (G.cr) G.cr.name = String(n || '').slice(0, 14); }
  function createRandomName() { const c = G.cr; if (!c) return; c.name = randName(c.look.g); UI.syncCreate(c, true); }
  function createRandom() {
    const c = G.cr; if (!c) return; c.dirty = true; const r = n => Math.floor(Math.random() * n);
    c.look = { g: r(2), hs: r(HAIR_STYLES.length), hc: r(HAIR_COLORS.length), ec: r(EYE_COLORS.length), sk: r(6), bd: 0, fc: r(3) === 0 ? 1 + r(FACE_MARKS.length - 1) : 0, b: r(3) };
    if (!c.look.g && r(2)) c.look.bd = 1 + r(BEARDS.length - 1);
    c.look.hs = HAIR_BY_G[c.look.g].at(r(HAIR_BY_G[c.look.g].length)); fixLook(c.look);
    c.name = randName(c.look.g); UI.syncCreate(c, true);
  }
  function createRot(dx) { if (G.cr) G.cr.yaw += dx * .012; }
  function createZoom(d) { if (G.cr) G.cr.zoom = clamp(G.cr.zoom * (1 + d * .001), .6, 1.5); }
  function createToggle3d() { if (G.cr) G.cr.test3d = !G.cr.test3d; }
  function createBack() { if (G.state !== 'create') return; wx.t = 40; G.state = 'menu'; G.cr = null; UI.hideCreate(); UI.showMenu(hasSave()); }
  function createGo() {
    const c = G.cr; if (!c) return; const name = (c.name || '').trim() || randName(c.look.g);
    UI.hideCreate(); const look = c.look, cls = c.cls; G.cr = null; newGame(cls, look, name);
  }
  function continueGame(id) {
    initAudio(); if (!id && ACC) id = ACC.last || (ACC.chars[0] && ACC.chars[0].id); if (!load(id)) { newPlayer('vanguard'); UI.log('Save inválido.', 'sys'); return; }
    startPlay(); UI.log('Jogo carregado.', 'sys');
    if (G.loadMsg) { UI.log(G.loadMsg, 'lvl'); UI.toast(G.loadMsg); G.loadMsg = null; }
    save(); // grava conversões e presentes recebidos no load
  }
  function cycleQuality() { return R.setQuality(R.qi + 1); }
  function deleteSave(id) { deleteChar(id); UI.showMenu(hasSave()); }
  function toggleMute() { G.mute = !G.mute; SND.mute(G.mute); UI.log(G.mute ? 'Som desligado.' : 'Som ligado.', 'sys'); }

  /* ---------- loop ---------- */
  function update(dt) {
    const p = G.player;
    const sf = inSafe(p.x, p.z);
    if (sf && !G.wasSafe && (G.auto.attack || G.auto.skills)) { setAuto('attack', false); setAuto('skills', false); UI.toast('Vila segura: ataque automático desligado'); UI.refreshPanels(); }
    G.wasSafe = sf; champUpdate(dt); ENC.tick(dt); audioUpdate(dt);
    { const now = Date.now(); if (now - evLast >= 1000) evTick(true); }
    const MX = mstMax(); if (p.mst > MX) p.mst = MX;
    if (p.mount && p.moving) { // fôlego da montaria: gasta andando, a ração recupera; cavalgar dá XP à montaria
      p.mst = Math.max(0, (p.mst == null ? MX : p.mst) - dt / 4);
      if (p.mlx != null) { p.mdist = (p.mdist || 0) + Math.hypot(p.x - p.mlx, p.z - p.mlz); if (p.mdist >= 40) { const k = Math.floor(p.mdist / 40); p.mdist -= k * 40; mountXp(k); } }
      if (p.mst < MX * .3 && p.feed > 0) { p.feed--; p.mst = Math.min(MX, p.mst + MX * .6); UI.toast('Sua montaria comeu uma ração (' + p.feed + ' restantes)'); }
      if (p.mst <= 0) { dismount(true); UI.toast('Sua montaria está exausta. Compre ração com o Cavalariço.'); UI.log('Montaria exausta: compre ração com o Cavalariço da vila.', 'sys'); }
    } else if (!p.mount && p.mst < MX) p.mst = Math.min(MX, p.mst + dt / 12); // descansa devagar
    p.mlx = p.x; p.mlz = p.z;
    for (let i = 0; i < p.cd.length; i++) p.cd[i] = TST.nocd ? 0 : Math.max(0, (p.cd[i] || 0) - dt);
    if (TST.inf) p.mp = p.maxMp; if (TST.god && !G.dead) p.hp = p.maxHp;
    p.atkCd -= dt; p.potCd.hp -= dt; p.potCd.mp -= dt; p.flash = Math.max(0, p.flash - dt); if (p.atkT > 0) p.atkT -= dt;
    let rc = false;
    for (const k in p.buffs) { const b = p.buffs[k]; if (b.t > 0) { b.t -= dt; if (b.t <= 0) rc = true; } }
    if (p.shield.t > 0) { p.shield.t -= dt; if (p.shield.t <= 0) p.shield.hp = 0; }
    if (rc) recalc();
    if (!G.dead) { autoUpdate(dt); playerUpdate(dt); }
    for (const m of G.mobs) mobUpdate(m, dt);
    const act = G.mobs.filter(m => !m.dead && m.state === 'chase');
    for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
      const a = act[i], b = act[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = (a.rad + b.rad) * .9;
      if (d < min && d > 1e-4) { const k = (min - d) / 2 / d; a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k; }
    }
    petUpdate(dt); updateProj(dt); updateDelayed(dt); updateFx(dt);
    { let near = null;
      for (const v of VILLAGES) { const d = Math.hypot(v.portal[0] - p.x, v.portal[1] - p.z); if (d < 1.7) near = v; else if (d < 3.6 && portalLock) near = near || { keep: 1 }; }
      if (!near) portalLock = false;
      else if (!near.keep && !portalLock && !G.dead) { portalLock = true; cmd = null; fxBurst(p.x, 1.4, p.z, [.7, .6, 1], 18, 3, .18); UI.openDialog('portal:' + near.id); } }
    for (const v of VILLAGES) {
      if (Math.hypot(v.portal[0] - p.x, v.portal[1] - p.z) > 40 || !throttle('pf' + v.id, .09)) continue;
      const col = v.theme === 'desert' ? [1, .8, .35] : v.theme === 'snow' ? [.6, .9, 1] : v.theme === 'volcano' ? [1, .5, .2] : [.7, .6, 1], an = G.t * 2.2 + Math.random() * 6.28;
      fxBurst(v.portal[0] + Math.cos(an) * .5, 2.0 + Math.random() * 2.2, v.portal[1] + Math.sin(an) * .5, col, 1, 1.4, .14);
    }
    for (let i = items.length - 1; i >= 0; i--) if (G.t - items[i].t0 > 60) items.splice(i, 1);
    if (tmob && (tmob.dead || Math.hypot(tmob.x - p.x, tmob.z - p.z) > 55)) tmob = null;
    const z = zoneAt(p.x, p.z); G.zone = z; mainUpdate();
    if (G.rec && !G.rec.regions.includes(z.reg)) { G.rec.regions.push(z.reg); track('regions', 0); }
    if (G.rec && G.rec.disc) for (const q of SITES) { // locais secretos: descobrir dá XP e ouro uma única vez
      if (!q.poi || G.rec.disc.includes(q.id) || Math.hypot(p.x - q.x, p.z - q.z) > 13) continue;
      G.rec.disc.push(q.id); const xg = Math.max(1, Math.round(xpNeed(Math.max(1, EL(p))) * .6 * xpMul())), gd = Math.round((150 + EL(p) * 30) * goldMul());
      gainXp(xg, true); p.gold += gd; track('disc', 0);
      sfx('discover'); UI.toast('🗺️ Local descoberto: ' + q.n + ' (' + G.rec.disc.length + '/' + SITES.filter(w => w.poi).length + ')'); UI.log('Você descobriu ' + q.n + '! +' + fmt(xg) + ' XP, +' + fmt(gd) + ' ouro.', 'quest'); 
      fxPillar(q.x, q.z, 1.3, [.6, .9, 1], 1.6); fxRing(q.x, 1, q.z, .5, 9, 1, [.6, .9, 1], .9, 2);
    }
    if (throttle('daily', 5)) dailyCheck();
    if (lastZone && lastZone !== z) UI.toast(z.name);
    lastZone = z;
    saveT += dt; if (saveT >= 10) { saveT = 0; if (!G.dead) save(); }
    G.target = tmob ? { id: tmob.id, name: tmob.name, lvl: tmob.lvl, hp: Math.max(0, Math.round(tmob.hp)), maxHp: tmob.maxHp, boss: tmob.boss } : null;
    const L = G.labels; L.length = 0;
    for (const n of NPCS) if (Math.hypot(n.x - p.x, n.z - p.z) < 25) L.push({ x: n.x, y: 2.7, z: n.z, text: n.n, cls: 'npc' });
    for (const m of G.mobs) {
      if (m.dead) continue;
      if ((m.boss || m.elite) && Math.hypot(m.x - p.x, m.z - p.z) < 40) L.push({ x: m.x, y: m.hgt + .5, z: m.z, text: (m.elite ? '★ ' : '') + m.name + ' Nv ' + m.lvl, cls: 'boss' });
      else if (m === tmob) L.push({ x: m.x, y: m.hgt + .4, z: m.z, text: m.name + ' Nv ' + dispLv(m.lvl, p.tier), cls: 'mob' });
    }
  }
  const envOut = { dir: [-.5, -1, -.35], sun: [1, .94, .8], ambT: [.5, .56, .66], ambB: [.3, .27, .22], top: [.3, .5, .85], disc: [1, .95, .8], stars: 0, fog: [.6, .7, .85], fogD: .011, exp: .8, night: 0, lampK: .35 };
  function updateTime(dt) {
    const play = G.state === 'play';
    if (G.state !== 'create' && !(play && UI.paused())) G.tod = (G.tod + dt * 24 / DAY_SECONDS * (play ? 1 : .4)) % 24;
    wx.t -= dt;
    if (wx.t <= 0) {
      const r = rnd(); wx.id = r < .6 ? 'clear' : r < .8 ? 'rain' : r < .9 ? 'fog' : 'storm'; wx.t = 70 + rnd() * 110;
      if (play) UI.toast(WEATHER[wx.id].ic + ' ' + WEATHER[wx.id].n);
    }
    const pt = precipType(), wet = wx.id === 'rain' ? .65 : wx.id === 'storm' ? 1 : 0;
    const tl = pt === 'none' ? 0 : wet, tf = pt === 'none' ? (wet ? .75 : 0) : (wx.id === 'fog' ? 1 : wx.id === 'storm' ? .35 : wx.id === 'rain' ? .25 : 0);
    const k = Math.min(1, dt * .6); wx.level += (tl - wx.level) * k; wx.fogK += (tf - wx.fogK) * k;
    G.weather = wx.id;
    if (wx.id === 'storm' && wx.level > .7 && pt === 'rain') { wx.nextFlash -= dt; if (wx.nextFlash <= 0) { wx.flash = 1; wx.nextFlash = 5 + rnd() * 10; setTimeout(() => sfx('thunder'), 300 + rnd() * 900); } }
    wx.flash = Math.max(0, wx.flash - dt * 3.2);
    // ---- ambiente ----
    const L = lightCur, ang = (G.tod - 6) / 24 * PI * 2, s = Math.sin(ang), c = Math.cos(ang);
    const dayW = sm(-.22, .3, s), dusk = clamp(1 - Math.abs(s - .05) / .32, 0, 1), night = 1 - dayW, wl = wx.level, fk = wx.fogK;
    const body = s >= 0 ? [c * .85, .22 + s * .78, .4] : [-c * .85, .3 + (-s) * .7, -.4], dl = V.norm(body);
    const E = envOut; E.dir = [-dl[0], -dl[1], -dl[2]];
    const sunI = s >= 0 ? sm(0, .22, s) * (.6 + .4 * sm(0, .5, s)) : sm(0, .2, -s) * .5;
    const sunCol = s >= 0 ? lerp3(L.sun, [1, .55, .28], dusk * .85) : [.45, .55, .9];
    E.sun = sc3(sunCol, sunI * (1 - .72 * wl - .5 * fk));
    const grey = v => { const m = (v[0] + v[1] + v[2]) / 3; return [m, m, m]; };
    const amb = (a, nightMul) => { let r = mul3(a, lerp3(nightMul, [1, 1, 1], dayW)); r = lerp3(r, [r[0] * 1.15, r[1] * .85, r[2] * .75], dusk * .5); return sc3(lerp3(r, grey(r), wl * .4), 1 - .08 * wl); };
    E.ambT = amb(L.ambT, [.62, .7, 1]); E.ambB = amb(L.ambB, [.5, .54, .85]);
    for (let i = 0; i < 3; i++) { E.ambT[i] += wx.flash * .55; E.ambB[i] += wx.flash * .35; }
    let top = lerp3([.04, .07, .18], L.top, dayW); top = lerp3(top, [top[0] + .45, top[1] + .2, top[2] + .1], dusk * .4); E.top = lerp3(top, [.34 * dayW + .1, .37 * dayW + .12, .42 * dayW + .17], wl * .85);
    let fog = mul3(fogCur, lerp3([.15, .19, .34], [1, 1, 1], dayW)); fog = lerp3(fog, [fog[0] + .3, fog[1] + .12, fog[2] + .03], dusk * .5);
    const sand = precipType() === 'none' && fk > 0;
    fog = lerp3(fog, sand ? [.78 * dayW + .06, .62 * dayW + .05, .38 * dayW + .04] : [.5 * dayW + .12, .55 * dayW + .14, .6 * dayW + .2], Math.min(1, wl * .7 + fk * .8));
    E.fog = fog; E.fogD = .0072 * (1 + wl * 1.1 + fk * 2.2 + night * .15);
    E.disc = s >= 0 ? sc3([1, .95, .8], 1 - wl * .9) : sc3([.8, .88, 1], .9 * (1 - wl)); E.stars = night * (1 - wl * .85) * .9;
    E.exp = L.exp * (1.38 - .38 * dayW) * (1 + wx.flash * 1.2); E.night = night; E.lampK = .3 + .9 * night + .2 * wl; E.t = G.t; E.wet = precipType() === 'rain' ? wx.level : 0; E.cloud = clamp(.3 + wl * .6 + fk * .3 + (wx.id === 'storm' ? .2 : 0), 0, 1);
  }
  function updateCamera(dt) {
    const play = G.state === 'play', p = G.player;
    let tx = 0, tz = 0, pitch = 32 * PI / 180, dist = 24;
    if (play) { tx = p.x; tz = p.z; pitch = cam.pit || 50 * PI / 180; dist = cam.dist; } else cam.yaw += dt * .07;
    if (G.state === 'create' && G.cr) { // palco da criação: personagem à direita, painel à esquerda
      const c = G.cr, d = 4.5 * c.zoom, pt = .16, sh = d * Math.tan(.45) * R.aspect * .46;
      const CY = 1.75, ex = CR_POS[0] + Math.sin(CY) * Math.cos(pt) * d, ez = CR_POS[1] + Math.cos(CY) * Math.cos(pt) * d;
      const rx = Math.cos(CY), rz = -Math.sin(CY), eye = [ex - rx * sh * (R.aspect > 1.2 ? 1 : 0), 1.1 + Math.sin(pt) * d, ez - rz * sh * (R.aspect > 1.2 ? 1 : 0)];
      const tg = [CR_POS[0] - rx * sh * (R.aspect > 1.2 ? 1 : 0), 1.05, CR_POS[1] - rz * sh * (R.aspect > 1.2 ? 1 : 0)];
      camPos[0] = eye[0]; camPos[1] = eye[1]; camPos[2] = eye[2]; cam.x = CR_POS[0]; cam.z = CR_POS[1];
      G.vp = M.mul(M.persp(.9, R.aspect, .5, 460), M.lookAt(eye, tg, [0, 1, 0]));
      const kf = 1 - Math.exp(-1.5 * dt), zf = ZONES[0].fog; for (let i = 0; i < 3; i++) fogCur[i] += (zf[i] - fogCur[i]) * kf;
      return;
    }
    if (!cam.init || Math.hypot(tx - cam.x, tz - cam.z) > 15) { cam.x = tx; cam.z = tz; cam.init = true; }
    const k = 1 - Math.exp(-14 * dt); cam.x += (tx - cam.x) * k; cam.z += (tz - cam.z) * k;
    const eye = [cam.x + Math.sin(cam.yaw) * Math.cos(pitch) * dist, 1.2 + Math.sin(pitch) * dist, cam.z + Math.cos(cam.yaw) * Math.cos(pitch) * dist];
    if (G.shake > .005) { const sh = G.shake; eye[0] += (rnd() - .5) * sh; eye[1] += (rnd() - .5) * sh * .6; eye[2] += (rnd() - .5) * sh; G.shake *= Math.exp(-7 * dt); } else G.shake = 0;
    camPos[0] = eye[0]; camPos[1] = eye[1]; camPos[2] = eye[2];
    G.vp = M.mul(M.persp(.9, R.aspect, .5, 460), M.lookAt(eye, [cam.x, 1.2, cam.z], [0, 1, 0]));
    const zf = (play ? G.zone : ZONES[0]).fog, kf = 1 - Math.exp(-1.5 * dt);
    for (let i = 0; i < 3; i++) fogCur[i] += (zf[i] - fogCur[i]) * kf;
    const lt = LIGHT[(play ? G.zone : ZONES[0]).id] || LIGHT.town;
    for (const key of ['sun', 'ambT', 'ambB', 'top']) for (let i = 0; i < 3; i++) lightCur[key][i] += (lt[key][i] - lightCur[key][i]) * kf;
    lightCur.exp += (lt.exp - lightCur.exp) * kf;
  }

  /* ---------- renderização ---------- */
  let shadowPass = false;
  const CR_POS = [8.5, -2];
  function render() {
    R.resize();
    const shadows = [], late = [];
    if (R.beginShadow([cam.x, 0, cam.z], envOut.dir)) { shadowPass = true; opaque(shadows, late); shadowPass = false; R.endShadow(); shadows.length = 0; late.length = 0; }
    R.begin(G.vp, camPos, envOut.fog, envOut.fogD, envOut);
    opaque(shadows, late);
    transparent(shadows, late);
    R.end(envOut.exp);
  }
  /* peças do jogador de acordo com o equipamento (usado no desenho do mundo e na prévia da janela de Equipamento) */
  const curParts = p => {
    const eq = p.eq, W = eq.w, A = eq.a, C = eq.c, H = eq.h, Lg = eq.l, Bt = eq.b, Gl = eq.g;
    return playerParts(p.cls, p.tier, W ? W.grade : -1, A ? A.grade : -1,
      { wr: W ? W.rar : 0, wp: W ? W.plus : 0, ar: A ? A.rar : 0, ap: A ? A.plus : 0, ac: C ? C.grade : -1, cr: C ? C.rar : 0, look: p.look,
        wt: W ? W.wt : null, hg: H ? H.grade : -1, hr: H ? H.rar : 0, lg: Lg ? Lg.grade : -1, bg: Bt ? Bt.grade : -1, gg: Gl ? Gl.grade : -1 });
  };
  /* prévia 3D do personagem equipado para a janela de Equipamento (ui.js): yaw em rad; chamar só entre quadros (ui.js usa setInterval) */
  function portrait(cv, yaw) {
    const p = G.player; if (!R || !p || !cv) return;
    const parts = curParts(p), psc = lookScale(p.look), cc = CLASSES[p.cls].col, WH = [1, 1, 1];
    R.renderPortrait(cv, () => {
      R.draw(R.mesh.cyl, M.part([0, .09, 0], [0, 0, 0], [0, 0, 0], [2.6, .18, 2.6]), [.3, .28, .33], 0, 1);
      R.draw(R.mesh.cyl, M.part([0, .2, 0], [0, 0, 0], [0, 0, 0], [2.1, .06, 2.1]), [.5, .46, .4], 0, 1);
      R.draw(R.mesh.cyl, M.part([0, .235, 0], [0, 0, 0], [0, 0, 0], [2.2, .02, 2.2]), shade(cc, .8), .45, 1);
      R.setRim((cc[0] * .5 + .5) * .5, (cc[1] * .5 + .5) * .5, (cc[2] * .5 + .5) * .5);
      R.parts(parts, M.part([0, .23, 0], [0, yaw || 0, 0], [0, 0, 0], [psc, psc, psc]), WH, 0, 1, { t: G.t * .35, amp: 0, atk: 0 });
      R.setRim(0, 0, 0);
    }, { eye: [0, 1.5, 6.2], at: [0, 1.0, 0], fov: .62 });
  }
  const RIM_BOSS = [1, .38, .2, .55], RIM_CHAMP = [.8, .4, 1, .5], RIM_ELITE = [1, .82, .35, .45], RIM_TARGET = [1, .9, .5, .35]; // [r, g, b, intensidade]
  function opaque(shadows, late) {
    for (const w of world.regs) {
      R.draw(w, IDM, [1, 1, 1], 0, 1, 1);
      if (!shadowPass) R.drawAO(w.ao, G.vp, camPos, 1.1);
      if (!shadowPass) { R.draw(w.mtn, IDM, [1, 1, 1], 0, 1, 2); R.draw(w.glow, IDM, [1, 1, 1], envOut.lampK, 1, 0); R.draw(w.water, IDM, [1, 1, 1], .12, 1, 0, .06, 0); }
    }
    const cx = camPos[0], cz = camPos[2], vp = G.vp, WH = [1, 1, 1];
    const vis = (x, z, mg) => {
      if (shadowPass) return Math.hypot(x - cam.x, z - cam.z) < 46;
      if (Math.hypot(x - cx, z - cz) > 70) return false;
      const n = M.xform(vp, [x, 1.5, z]); return n[2] > -1 && n[2] < 1 && Math.abs(n[0]) < mg && Math.abs(n[1]) < mg;
    };
    const base = (x, z, rot, sc) => M.part([x, 0, z], [0, rot, 0], [0, 0, 0], [sc, sc, sc]);
    const p = G.player, play = G.state === 'play';
    R.softBox = true; // personagens: caixas com cantos suaves
    for (const n of NPCS) {
      if (!vis(n.x, n.z, 1.6)) continue;
      let rot = Math.atan2(-n.x, -n.z); if (play && Math.hypot(n.x - p.x, n.z - p.z) < 9) rot = Math.atan2(p.x - n.x, p.z - n.z);
      R.parts(npcParts(n), base(n.x, n.z, rot, 1), WH, 0, 1, { t: G.t, amp: 0, atk: 0 }); shadows.push([n.x, n.z, .8]);
    }
    for (const m of G.mobs) {
      if (m.dead && m.deadT > .5) continue;
      if (!vis(m.x, m.z, m.boss ? 2.8 : 1.6)) continue;
      const parts = mobParts(m.id, m.col), anim = { t: G.t + m.ph, amp: m.moving ? 1 : 0, atk: m.atkT > 0 ? 1 - m.atkT / .45 : 0 };
      let tint = m.flash > 0 ? [2.4, 2.4, 2.4] : (m.mark > 0 ? [1.5, .8, .8] : (m.slow > 0 ? [.7, .9, 1.4] : WH));
      if (m.stun > 0) tint = [1.3, 1.3, .6];
      else if (m.elite && tint === WH) tint = [1.25, 1.08, .72];
      const b = base(m.x, m.z, m.rot, m.sc);
      if (m.dead) { late.push([parts, b, tint, 1 - m.deadT / .5, anim]); continue; }
      // rim por tipo (engine.js setRim): chefe vermelho, campeão roxo, elite dourada; o alvo selecionado ganha um destaque dourado; chefe em ataque pulsa
      let rc = m.boss ? RIM_BOSS : m.champ ? RIM_CHAMP : m.elite ? RIM_ELITE : null, rk = rc ? rc[3] : 0;
      if (m === tmob) { if (!rc) rc = RIM_TARGET; rk = Math.max(rk, rc[3]); }
      if (m.warn) rk *= 1.6;
      R.setRim(rc ? rc[0] * rk : 0, rc ? rc[1] * rk : 0, rc ? rc[2] * rk : 0);
      R.parts(parts, b, tint, m.warn ? .3 : 0, 1, anim); shadows.push([m.x, m.z, m.rad * 1.3]);
    }
    R.setRim(0, 0, 0);
    if (G.state === 'create' && G.cr) {
      const c = G.cr, sk = SKINS.beta;
      if (c.test3d && sk) {
        R.draw(R.mesh.cyl, M.part([CR_POS[0], .09, CR_POS[1]], [0, 0, 0], [0, 0, 0], [3.2, .18, 3.2]), [.3, .28, .33], 0, 1);
        sk.mesh.bones = skinPose(sk, skinAnim('_beta'), G.t * .8);
        R.draw(sk.mesh, M.part([CR_POS[0], .18, CR_POS[1]], [0, c.yaw - .25, 0], [0, 0, 0], [.0105, .0105, .0105]), WH, 0, 1, 0, .6, 0);
        sk.mesh.bones = null; return;
      }
      const parts = playerParts(c.cls, 0, -1, -1, { look: c.look }), sc = lookScale(c.look);
      R.draw(R.mesh.cyl, M.part([CR_POS[0], .09, CR_POS[1]], [0, 0, 0], [0, 0, 0], [3.2, .18, 3.2]), [.3, .28, .33], 0, 1);
      R.draw(R.mesh.cyl, M.part([CR_POS[0], .2, CR_POS[1]], [0, 0, 0], [0, 0, 0], [2.6, .06, 2.6]), [.5, .46, .4], 0, 1);
      if (!shadowPass) { R.draw(R.mesh.cyl, M.part([CR_POS[0], .235, CR_POS[1]], [0, 0, 0], [0, 0, 0], [2.75, .02, 2.75]), shade(CLASSES[c.cls].col, .8), .45, 1); }
      R.parts(parts, M.part([CR_POS[0], .23, CR_POS[1]], [0, c.yaw - .25 + Math.sin(G.t * .6) * .12, 0], [0, 0, 0], [sc, sc, sc]), WH, 0, 1, { t: G.t * .35, amp: 0, atk: 0 });
    }
    if (play) {
      // aparência segue o equipamento: grau (-1 = nada equipado), raridade e refino de arma/armadura/acessório
      const parts = curParts(p);
      const psc = lookScale(p.look), b = base(p.x, p.z, p.rot, psc), tint = p.flash > 0 ? [1.8, 1.1, 1.1] : WH;
      { const cc = CLASSES[p.cls].col; R.setRim((cc[0] * .5 + .5) * .3, (cc[1] * .5 + .5) * .3, (cc[2] * .5 + .5) * .3); } // jogador: rim suave na cor da classe
      if (G.dead) R.parts(parts, M.part([p.x, 0, p.z], [-1.5, p.rot, 0], [0, 0, 0], [psc, psc, psc]), [.7, .7, .7], 0, 1, null);
      else if (p.mount) {
        const fly = MOUNTS[p.mount].fly, hov = fly ? .9 + Math.sin(G.t * 2) * .12 : 0, st = MOUNT_SEAT[p.mount];
        R.parts(mountParts(p.mount), M.part([p.x, hov, p.z], [0, p.rot, 0], [0, 0, 0], [1, 1, 1]), tint, 0, 1, { t: G.t, amp: p.moving ? 1 : 0, atk: 0 });
        R.parts(seatedParts(parts), M.part([p.x, hov + st[0] - SEAT_HIP * psc, p.z], [0, p.rot, 0], [0, 0, st[1]], [psc, psc, psc]), tint, 0, 1, { t: G.t, amp: 0, atk: p.atkT > 0 ? 1 - p.atkT / .3 : 0 });
        shadows.push([p.x, p.z, fly ? 1.8 : 1.0]);
      } else { R.parts(parts, b, tint, 0, 1, { t: G.t, amp: p.moving ? 1 : 0, atk: p.atkT > 0 ? 1 - p.atkT / .3 : 0 }); shadows.push([p.x, p.z, .75]); }
      R.setRim(0, 0, 0);
      if (pet) { R.parts(mobParts(PET_MODEL[pet.kind] || 'golemm', pet.col), base(pet.x, pet.z, pet.rot, pet.sc), pet.flash > 0 ? [2.2, 2.2, 2.2] : WH, 0, 1, { t: G.t, amp: pet.moving ? 1 : 0, atk: pet.atkT > 0 ? 1 - pet.atkT / .3 : 0 }); shadows.push([pet.x, pet.z, pet.rad * 1.3]); }
      R.softBox = false;
      for (const g of items) {
        if (!vis(g.x, g.z, 1.3)) continue;
        if (g.coin) {
          const n = g.coin > 400 ? 4 : g.coin > 120 ? 3 : g.coin > 30 ? 2 : 1, c = [1, .8, .2];
          for (let k = 0; k < n; k++) R.draw(R.mesh.cyl, M.part([g.x + (k % 2) * .18, .1 + k * .09, g.z - (k > 1 ? .15 : 0)], [0, G.t * 2.4 + g.ph + k, k * .2], [0, 0, 0], [.42, .07, .42]), c, .7, 1);
          late.push(['item', g, c]); continue;
        }
        const c = hex2rgb(RARITY[g.it.rar].c);
        R.parts(itemParts(g.it), M.part([g.x, .02, g.z], [0, g.ph + G.t * .5, 0], [0, 0, 0], [.85, .85, .85]), WH, 0, 1, { t: G.t, amp: 0, atk: 0 });
        late.push(['item', g, c]);
      }
    }
  }
  function transparent(shadows, late) {
    const p = G.player, play = G.state === 'play';
    // sombra de contato suave (as sombras reais vêm do shadow map)
    if (!R.shOn) for (const s of shadows) R.draw(R.mesh.disc, M.part([s[0], .04, s[1]], [0, 0, 0], [0, 0, 0], [s[2] * 2, .04, s[2] * 2]), [0, 0, 0], 0, .35);
    else for (const s of shadows) R.draw(R.mesh.disc, M.part([s[0], .03, s[1]], [0, 0, 0], [0, 0, 0], [s[2] * 1.5, .03, s[2] * 1.5]), [0, 0, 0], 0, .16);
    if (world.sea) R.draw(world.sea, M.part([Math.round(cam.x), SEA_Y, Math.round(cam.z)], [0, 0, 0], [0, 0, 0], [1, 1, 1]), [1, 1, 1], .05, .86, 0, .06, 0); // mar
    ambientMotes(); precip();
    for (const l of late) {
      if (l[0] === 'item') {
        const g = l[1], age = G.t - g.t0, a = age > 50 ? .1 + .15 * (Math.sin(G.t * 10) * .5 + .5) : .28;
        R.draw(R.mesh.cyl, M.part([g.x, 2, g.z], [0, 0, 0], [0, 0, 0], [.35, 4, .35]), l[2], 1, a);
        R.draw(R.mesh.cyl, M.part([g.x, .025, g.z], [0, 0, 0], [0, 0, 0], [1.0, .01, 1.0]), l[2], 1, a * .7); // brilho no chão
      } else R.parts(l[0], l[1], l[2], 0, Math.max(.01, l[3]), l[4]);
    }
    if (play) {
      if (tmob && !tmob.dead) { const r = tmob.rad * 1.7 + Math.sin(G.t * 6) * .08; const tc = tmob.boss ? [1, .3, .2] : [1, .85, .3]; R.draw(R.mesh.annulus, M.part([tmob.x, .07, tmob.z], [0, 0, 0], [0, 0, 0], [r * 2, 1, r * 2]), tc, .9, .7); R.draw(R.mesh.disc, M.part([tmob.x, .06, tmob.z], [0, 0, 0], [0, 0, 0], [r * 2, .02, r * 2]), tc, .5, .08); } // aro de alvo (redondo, sem cobrir o monstro)
      if (cmd && cmd.type === 'move') R.draw(R.mesh.cyl, M.part([cmd.x, .07, cmd.z], [0, 0, 0], [0, 0, 0], [.5, .03, .5]), [1, 1, .6], .8, .6);
      if (p.shield.hp > 0 && !G.dead) R.draw(R.mesh.sphere, M.part([p.x, 1.2, p.z], [0, 0, 0], [0, 0, 0], [2, 2.6, 2]), [.5, .8, 1], .6, .25);
      for (const d of delayed) {
        const k = 1 - d.t / d.delay;
        R.draw(R.mesh.disc, M.part([d.x, .08, d.z], [0, 0, 0], [0, 0, 0], [d.r * 2, .02, d.r * 2]), d.col, .5, .1);
        R.draw(R.mesh.disc, M.part([d.x, .09, d.z], [0, 0, 0], [0, 0, 0], [d.r * 2 * k, .02, d.r * 2 * k]), d.col, .7, .16);
        R.draw(R.mesh.annulusT, M.part([d.x, .1, d.z], [0, 0, 0], [0, 0, 0], [d.r * 2, 1, d.r * 2]), d.col, 1, .75);
      }
      for (const q of projs) {
        const mt = q.arrow ? M.part([q.x, q.y, q.z], [0, q.yaw || 0, 0], [0, 0, 0], [.1, .1, .9]) : M.part([q.x, q.y, q.z], [0, 0, 0], [0, 0, 0], [q.size * 2, q.size * 2, q.size * 2]);
        R.draw(q.arrow ? R.mesh.box : R.mesh.sphere, mt, q.col, 1, .95);
      }
    }
    for (const m of G.mobs) if (m.warn && !m.dead) {
      const k = 1 - m.warn.t, r = m.warn.r, pu = .75 + .25 * Math.sin(G.t * 14); // aviso de golpe em área: redondo, translúcido, borda viva e preenchimento crescendo
      R.draw(R.mesh.disc, M.part([m.warn.x, .09, m.warn.z], [0, 0, 0], [0, 0, 0], [r * 2, .02, r * 2]), [1, .15, .1], .5, .1);
      R.draw(R.mesh.disc, M.part([m.warn.x, .1, m.warn.z], [0, 0, 0], [0, 0, 0], [r * 2 * k, .02, r * 2 * k]), [1, .3, .12], .7, .16);
      R.draw(R.mesh.annulusT, M.part([m.warn.x, .11, m.warn.z], [0, 0, 0], [0, 0, 0], [r * 2, 1, r * 2]), [1, .25, .1], 1.2, .8 * pu);
      R.draw(R.mesh.annulus, M.part([m.warn.x, .11, m.warn.z], [0, 0, 0], [0, 0, 0], [r * 2 * k, 1, r * 2 * k]), [1, .55, .2], 1, .35 * k);
    }
    R.add = true;
    for (const f of fx) {
      const k = f.t / f.dur, a = 1 - k;
      if (f.k === 'disc') { const r = f.r0 + (f.r1 - f.r0) * k; R.draw(R.mesh.cyl, M.part([f.x, .12, f.z], [0, 0, 0], [0, 0, 0], [r * 2, .03, r * 2]), f.col, 1.1, f.a * a * .42); }
      else if (f.k === 'ring') { const e = 1 - (1 - k) * (1 - k), r = (f.r0 + (f.r1 - f.r0) * e) * 2; R.draw(R.mesh.ring, M.part([f.x, f.y, f.z], [0, 0, 0], [0, 0, 0], [r, f.th * (.5 + a), r]), f.col, 1.8, f.a * a); }
      else if (f.k === 'flash') { const r = f.r * (.5 + k * .9); R.draw(R.mesh.sphere, M.part([f.x, f.y, f.z], [0, 0, 0], [0, 0, 0], [r, r, r]), f.col, 2.2, .85 * a * a); }
      else if (f.k === 'pillar') { const w = f.r * 2 * (1 - k * .5); R.draw(R.mesh.cyl, M.part([f.x, 3, f.z], [0, 0, 0], [0, 0, 0], [w, 6, w]), f.col, 1.6, .2 * a); R.draw(R.mesh.cyl, M.part([f.x, 3, f.z], [0, 0, 0], [0, 0, 0], [w * .3, 6.4, w * .3]), [1, 1, 1], 2.2, .38 * a); }
      else if (f.k === 'beam') { const dx = f.x2 - f.x1, dz = f.z2 - f.z1, l = Math.hypot(dx, dz), my = [(f.x1 + f.x2) / 2, 1.3, (f.z1 + f.z2) / 2], yw = Math.atan2(dx, dz); R.draw(R.mesh.box, M.part(my, [0, yw, 0], [0, 0, 0], [f.w * a * 1.8 + .06, f.w * a * 1.8 + .06, l]), f.col, 1.6, .5 * a); R.draw(R.mesh.box, M.part(my, [0, yw, 0], [0, 0, 0], [f.w * a * .6 + .03, f.w * a * .6 + .03, l]), [1, 1, 1], 2.4, .9 * a); }
      else if (f.k === 'spark') { const sp = Math.hypot(f.vx, f.vz) + .01, len = f.s * (2 + sp * .5) * a + .05; R.draw(R.mesh.box, M.part([f.x, f.y, f.z], [0, Math.atan2(f.vx, f.vz), 0], [0, 0, 0], [f.s * .5 * a + .02, f.s * .5 * a + .02, len]), [1, .95, .8], 2.4, a); }
      else if (f.k === 'p') { const sz = f.s * (.4 + a * .8) + .03; R.draw(R.mesh.sphere, M.part([f.x, f.y, f.z], [0, 0, 0], [0, 0, 0], [sz, sz, sz]), f.col, 2.0, .85 * a); }
    }
    R.add = false;
  }
  function precip() {
    const pt = precipType(), lv = wx.level; if (lv < .05 || pt === 'none') return;
    const n = Math.round((R.q.bloom ? 320 : 140) * lv), H = 24;
    for (let i = 0; i < n; i++) {
      const a = hash2(i, 3), b = hash2(i, 5), c = hash2(i, 11);
      if (pt === 'rain') {
        const y = H - ((c * H + G.t * (24 + c * 8)) % H), x = cam.x + (a * 2 - 1) * 22 + (H - y) * .12, z = cam.z + (b * 2 - 1) * 22;
        R.draw(R.mesh.box, M.part([x, y, z], [0, 0, .12], [0, 0, 0], [.014, .7, .014]), [.75, .85, 1], .6, .32);
      } else if (pt === 'snow') {
        const y = H - ((c * H + G.t * (2 + c * 1.5)) % H), x = cam.x + (a * 2 - 1) * 22 + Math.sin(G.t * .8 + i) * .8, z = cam.z + (b * 2 - 1) * 22 + Math.cos(G.t * .7 + i) * .8;
        R.draw(R.mesh.sphere, M.part([x, y, z], [0, 0, 0], [0, 0, 0], [.11, .11, .11]), [1, 1, 1], .9, .85);
      } else {
        const y = H - ((c * H + G.t * (1.5 + c)) % H), x = cam.x + (a * 2 - 1) * 22 + Math.sin(G.t + i) * 1.2, z = cam.z + (b * 2 - 1) * 22, em = c > .6;
        R.draw(R.mesh.box, M.part([x, y, z], [G.t + i, G.t, 0], [0, 0, 0], [.09, .09, .09]), em ? [1, .5, .15] : [.3, .28, .3], em ? 1 : .2, .8);
      }
    }
  }
  function weatherAudio() { /* a chuva agora é a camada 'rain' do ambiente (audio.js) */ }
  /* partículas ambientes (pólen, vagalumes, brasas) ao redor da câmera */
  function ambientMotes() {
    const zid = (G.state === 'play' ? G.zone : ZONES[0]).id, col = zid === 'forest' ? [.55, 1, .6] : zid === 'ruins' ? [.75, .55, 1] : zid === 'field' ? [1, .95, .6] : zid === 'dunes' ? [1, .88, .55] : zid === 'tundra' ? [.85, .95, 1] : zid === 'ashlands' || zid === 'forge' ? [1, .5, .2] : [1, .9, .7];
    if (wx.level > .5 || envOut.night > .5 && false) return;
    const N = R.q.bloom ? 46 : 24, rad = 22;
    for (let i = 0; i < N; i++) {
      const a = hash2(i, 7), b = hash2(i, 13), c = hash2(i, 29), sp = .15 + c * .25;
      let x = ((a * 2 * rad + G.t * sp * (b - .5) * 3) % (2 * rad) + 2 * rad) % (2 * rad) - rad, z = ((b * 2 * rad + G.t * sp * (a - .5) * 3) % (2 * rad) + 2 * rad) % (2 * rad) - rad;
      const y = .6 + (c * 4 + Math.sin(G.t * (.5 + c) + i) * .6), tw = .5 + .5 * Math.sin(G.t * (1.5 + c * 2) + i * 3), sz = .07 + c * .06;
      R.draw(R.mesh.sphere, M.part([cam.x + x, y, cam.z + z], [0, 0, 0], [0, 0, 0], [sz, sz, sz]), col, .9, .35 + .55 * tw);
    }
  }
  /* qualidade automática: se o FPS ficar baixo nos primeiros segundos, desce um nível */
  const aq = { t: 0, n: 0, w: 0, warm: 3 };
  function autoQuality(rdt) {
    if (aq.w >= 8 || rdt > .5) return;
    if (aq.warm > 0) { aq.warm -= rdt; return; }
    aq.t += rdt; aq.n++;
    if (aq.t < 2.5) return;
    const fps = aq.n / aq.t; aq.t = 0; aq.n = 0; aq.w++;
    if (fps < 40 && R.qi > 0) { const n = R.setQuality(R.qi - 1); aq.warm = 1.5; if (G.state === 'play') UI.toast('⚙️ Gráficos ajustados: ' + n + ' (' + Math.round(fps) + ' FPS)'); }
    else if (fps >= 50) aq.w += 2;
  }
  /* segundo plano: com a janela minimizada o navegador para o requestAnimationFrame.
     Um Worker continua mandando "ticks" e o jogo segue simulando (sem desenhar). */
  let bgLast = 0;
  function startBgTicker() {
    try {
      const w = new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),100)'], { type: 'text/javascript' })));
      w.onmessage = () => {
        const now = performance.now();
        if (!document.hidden) { bgLast = now; return; }
        let t = Math.min(10, Math.max(0, (now - bgLast) / 1000)); bgLast = now;
        while (t > 0) { const d = Math.min(.05, t); t -= d; G.t += d; if (G.state === 'play' && !UI.paused()) update(d); updateTime(d); }
        last = now;
      };
    } catch (e) { /* sem Worker: o jogo apenas pausa em segundo plano */ }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const rdt = Math.max(0, (now - last) / 1000), dt = Math.min(.05, rdt); last = now; G.t += dt;
    autoQuality(rdt);
    if (G.state === 'play' && !UI.paused()) update(dt);
    updateCamera(dt); updateTime(dt); render(); weatherAudio();
    if (G.state === 'play') UI.update(G);
  }
  function boot() {
    canvas = document.getElementById('gl');
    try { R = new Renderer(canvas); } catch (e) {
      document.body.insertAdjacentHTML('beforeend', '<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;background:#111;font:20px sans-serif;text-align:center;padding:20px">Seu navegador não suporta WebGL2, necessário para Aldoria.<br>' + e.message + '</div>');
      return;
    }
    registerExtraMeshes(R); registerOrganicMeshes(R); // meshes_extra.js: primitivas extras e malhas orgânicas, antes de modelos e mundo
    loadSkins(R);
    world = buildWorld(R, obstacles);
    for (const n of NPCS) obstacles.push({ x: n.x, z: n.z, r: .7 });
    buildGrid();
    UI.init(); initInput(); loadAuto(); newPlayer('vanguard'); populate();
    last = bgLast = performance.now(); requestAnimationFrame(frame); startBgTicker();
    UI.showMenu(hasSave());
  }
  /* ---------- encontros aleatórios (encounters.js) ---------- */
  const encFree = (x, z) => isLand(x, z) && coastD(x, z) > 20 && !inSafe(x, z) && !SITES.some(q => Math.hypot(q.x - x, q.z - z) < 14) && !VILLAGES.some(v => Math.hypot(v.cx - x, v.cz - z) < (v.r || v.hs || 9) + 22) && zoneAt(x, z) && zoneAt(x, z).id !== 'town';
  function encMob(zid, id, name, x, z, lvlAdd, tag, elite) {
    const list = MOBS[zid] || []; if (!MOB_COL[id] || !MOBM[id]) id = (list[0] || { id: 'slime' }).id;
    const lvl = zoneLvl(zid, x, z) + (lvlAdd | 0), s = mobStats(lvl, elite ? ELITE_M : null), sc = (MOB_SC[id] || 1) * (elite ? 1.25 : 1), def = list.find(q => q.id === id), nm = name || (def && def.n) || id;
    if (elite) s.gold *= 3; const m = mobObj(id, nm, zid, lvl, s, sc, MOB_COL[id], x, z, null, rnd); m.elite = !!elite; m.enc = tag; m.aggroR = 14; G.mobs.push(m); return m;
  }
  const ENC = registerEncounters({
    G, NPCS, UI, rnd, fmt, sfx, track, gainXp, recalc, shake, inSafe, MAXLV, makeItem, itemName, zoneLvl, zoneAt, isLand, xpNeed, elv: () => EL(G.player),
    goldMul: () => goldMul(), xpMul: () => xpMul(), freeSpot: encFree, spawnMob: encMob,
    hasMob: (zid, id) => (MOBS[zid] || []).some(q => q.id === id), firstMob: zid => ((MOBS[zid] || [])[0] || { id: 'slime' }).id,
    dropItem: (x, z, it) => items.push({ it, x, z, t0: G.t, ph: 0 }),
    fx: { pillar: fxPillar, burst: fxBurst },
  });
  return {
    boot, hasSave, _adminHook, account, accounts, createAccount, switchAccount, logoutAccount, deleteAccount, bankPut, bankTake, itemMove, fuseItems, bankGold, teleport, newGame, createOpen, createSet, createCls, createName, createRandomName, createRandom, createRot, createZoom, createToggle3d, createBack, createGo, continueGame, deleteSave, save, useSkill, usePotion, equip, unequip, sellItem, buy, enhance, jewel, deleteItem, findItem,
    mainEv, sound: (n, o) => sfx(n, o), setVol: (k, v) => SND.setVol(k, v), getVol: () => SND.getVol(), soundNames: () => SND.names(), portrait, encDialog: id => ENC.dialog(id), encAct: (id, k) => ENC.act(id, k), addAttr, resetAttr, toMenu, cycleQuality, qualityName, setLook, buyMount, toggleMount, equipMount, useMountItem, restMount, mountLv, mstMax, mountXp, acceptQuest, turnInQuest, storyTalk, shopStock, buyItem, buyFeed, learnSkill, raiseSkill, resetSkills, claimDaily, dailyReward, canEvolve, evolve, respawn, toggleMute, setAuto, toggleAutoCombat,
    _dbg: { get enc() { return ENC; }, get world() { return world; }, sim(n, d) { for (let i = 0; i < n; i++) { G.t += d || .05; update(d || .05); } }, get R() { return R; }, get obstacles() { return obstacles; }, setTime(h) { G.tod = h; }, setWeather(id, lv) { wx.id = id; wx.t = 9999; wx.level = lv == null ? (id === 'rain' ? .65 : id === 'storm' ? 1 : 0) : lv; wx.fogK = id === 'fog' ? 1 : 0; }, wx, get mobs() { return G.mobs; }, get items() { return items; }, get pet() { return pet; }, get tmob() { return tmob; }, setTarget(m) { tmob = m; }, recalc, cam, pickRay, die, killMob, teleport, clickPortal, moveTo(x, z) { cmd = { type: 'move', x, z }; }, talkTo(id) { cmd = { type: 'npc', npc: NPCS.find(n => n.id === id) }; }, attack(m) { tmob = m; cmd = { type: 'attack', mob: m }; }, route(x, z, tx, tz) { const e = { x, z }; townRoute(e, tx, tz); return e.path; }, get cmd() { return cmd; }, checkGifts, dmgPlayer, xpFor, retierMobs, spawnPet, get G() { return G; } },
  };
})();

window.addEventListener('load', () => Game.boot());
