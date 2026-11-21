'use strict';
/* ===== Motor de áudio do Aldoria (Web Audio, 100 % sintetizado, sem arquivos) =====
   Mixer: canais sfx / amb (ambiente) / music / ui -> volume mestre -> compressor -> saída. Volumes salvos em localStorage (aldoria_vol).
   Blocos: osciladores com envelope, vibrato e filtro; ruído filtrado (branco/rosa); espacialização barata (volume por distância + pan).
   Biblioteca: interface, combate por arma e material, habilidades por classe, vozes de monstro por família, passos por piso, ambiente por bioma/hora/clima
   e música procedural por região (mais tensa em combate). createSoundEngine().init(ctx) aceita um OfflineAudioContext (testes: tools/teste_sons.py). */
function createSoundEngine() {
  let AC = null, out = null, comp = null, NB = null, PB = null, voices = 0, muted = false, clk = null; // clk: relógio injetável (testes offline)
  const bus = {}, vol = { master: .8, sfx: 1, amb: .5, music: .45, ui: 1 }, lis = { x: 0, z: 0, yaw: 0 };
  try { const v = JSON.parse(localStorage.getItem('aldoria_vol')); if (v && typeof v === 'object') for (const k in vol) if (typeof v[k] === 'number') vol[k] = Math.max(0, Math.min(1, v[k])); } catch (e) { }
  const R = Math.random, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mtof = n => 440 * Math.pow(2, (n - 69) / 12), pickA = a => a[Math.floor(R() * a.length) % a.length];

  function init(ctx) {
    if (AC) { if (AC.state === 'suspended' && AC.resume && !AC.startRendering) AC.resume(); return AC; }
    try { AC = ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; return null; }
    out = AC.createGain(); out.gain.value = muted ? 0 : vol.master * .8;
    comp = AC.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 20; comp.ratio.value = 5; comp.attack.value = .004; comp.release.value = .25;
    out.connect(comp); comp.connect(AC.destination);
    for (const b of ['sfx', 'amb', 'music', 'ui']) { const g = AC.createGain(); g.gain.value = vol[b]; g.connect(out); bus[b] = g; }
    const sr = AC.sampleRate, L = sr * 3; NB = AC.createBuffer(1, L, sr); PB = AC.createBuffer(1, L, sr);
    const w = NB.getChannelData(0), p = PB.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < L; i++) { const x = R() * 2 - 1; w[i] = x; b0 = .99765 * b0 + x * .0990460; b1 = .96300 * b1 + x * .2965164; b2 = .57000 * b2 + x * 1.0526913; p[i] = (b0 + b1 + b2 + x * .1848) * .22; }
    if (AC.state === 'suspended' && AC.resume && !AC.startRendering) AC.resume();
    return AC;
  }
  const now = () => (AC ? (clk ? clk() : AC.currentTime) : 0);

  /* ---- blocos ---- */
  const done = (node, t) => { voices++; node.onended = () => { voices--; }; };
  function dest(o, def) { return (o && o.dst) || bus[def || 'sfx']; }
  function pan(o, d) { if (!o || o.pan == null || !AC.createStereoPanner) return d; const p = AC.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); p.connect(d); return p; }
  /* oscilador: o = { type, f:[f0,f1], vol, a, det, vib:[hz, prof], lp:[f0,f1,q], pan, bus, dst, am:[hz, prof] } */
  function O(t, dur, o) {
    if (!AC || voices > 46) return;
    const osc = AC.createOscillator(), g = AC.createGain(), f = o.f || [440, 440], v = (o.vol == null ? .3 : o.vol), a = o.a || .004;
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(Math.max(18, f[0]), t); if (f[1] != null && f[1] !== f[0]) osc.frequency.exponentialRampToValueAtTime(Math.max(18, f[1]), t + dur);
    if (o.det) osc.detune.value = o.det;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(a, dur * .5)); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    let n = osc; if (o.lp) { const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(o.lp[0], t); if (o.lp[1]) lp.frequency.exponentialRampToValueAtTime(Math.max(40, o.lp[1]), t + dur); lp.Q.value = o.lp[2] || .7; osc.connect(lp); n = lp; }
    if (o.vib) { const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + .05); }
    n.connect(g); if (o.am) { const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = o.am[0]; lg.gain.value = o.am[1] * v; l.connect(lg); lg.connect(g.gain); l.start(t); l.stop(t + dur + .05); }
    g.connect(pan(o, dest(o, o.bus))); osc.start(t); osc.stop(t + dur + .04); done(osc);
  }
  /* ruído filtrado: o = { type:'lowpass'|'bandpass'|'highpass', f:[f0,f1], q, vol, a, pink, pan, bus, dst, am } */
  function N(t, dur, o) {
    if (!AC || voices > 46) return;
    const src = AC.createBufferSource(), g = AC.createGain(), fl = AC.createBiquadFilter(), f = o.f || [1000, 1000], v = (o.vol == null ? .2 : o.vol), a = o.a || .003;
    src.buffer = o.pink ? PB : NB; src.loop = true; fl.type = o.type || 'bandpass'; fl.frequency.setValueAtTime(Math.max(30, f[0]), t); if (f[1] != null && f[1] !== f[0]) fl.frequency.exponentialRampToValueAtTime(Math.max(30, f[1]), t + dur); fl.Q.value = o.q || .8;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(a, dur * .6)); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    src.connect(fl); fl.connect(g); if (o.am) { const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = o.am[0]; lg.gain.value = o.am[1] * v; l.connect(lg); lg.connect(g.gain); l.start(t); l.stop(t + dur + .05); }
    g.connect(pan(o, dest(o, o.bus))); src.start(t, R() * 1.8); src.stop(t + dur + .04); done(src);
  }
  /* sino: fundamental + parcial inarmônico, cauda longa */
  const bell = (t, f, v, dur, o) => { O(t, dur || 1.6, Object.assign({ f: [f, f], vol: v, a: .002 }, o)); O(t, (dur || 1.6) * .55, Object.assign({ f: [f * 2.76, f * 2.76], vol: v * .45, a: .002 }, o)); O(t, (dur || 1.6) * .3, Object.assign({ f: [f * 5.4, f * 5.4], vol: v * .18, a: .002 }, o)); };
  /* pluck: triangular com filtro que fecha */
  const pluck = (t, f, v, o) => O(t, .55, Object.assign({ type: 'triangle', f: [f, f], vol: v, a: .003, lp: [f * 6, f * 1.4, .8] }, o));

  /* ---- biblioteca de efeitos: (t, o) com o.p = fator de altura, o.v = fator de volume ---- */
  const S = {};
  const P_ = o => (o && o.p) || 1, V_ = o => (o && o.v) || 1;
  // interface
  S.click = (t, o) => { O(t, .05, { f: [1300, 800], vol: .16, bus: 'ui', dst: o.dst }); N(t, .02, { type: 'highpass', f: [5000], vol: .05, bus: 'ui', dst: o.dst }); };
  S.open = (t, o) => { N(t, .16, { f: [380, 1500], q: 1, vol: .1, bus: 'ui', dst: o.dst }); O(t, .13, { f: [520, 800], vol: .09, bus: 'ui', dst: o.dst }); };
  S.close = (t, o) => { N(t, .14, { f: [1400, 380], q: 1, vol: .09, bus: 'ui', dst: o.dst }); O(t, .11, { f: [760, 480], vol: .08, bus: 'ui', dst: o.dst }); };
  S.error = (t, o) => { O(t, .13, { type: 'square', f: [190, 170], vol: .13, lp: [900, 500], bus: 'ui', dst: o.dst }); O(t + .15, .16, { type: 'square', f: [160, 130], vol: .13, lp: [800, 400], bus: 'ui', dst: o.dst }); };
  S.equip = (t, o) => { O(t, .07, { type: 'triangle', f: [1700, 1700], vol: .13 }); O(t + .02, .06, { type: 'triangle', f: [2600, 2600], vol: .08 }); N(t, .09, { type: 'lowpass', f: [900, 400], vol: .11 }); N(t, .035, { f: [3200], q: 2, vol: .08 }); };
  S.coin = (t, o) => { O(t, .22, { f: [1568, 1568], vol: .13, a: .002 }); O(t + .06, .3, { f: [2093, 2093], vol: .12, a: .002 }); N(t, .05, { type: 'highpass', f: [7000], vol: .03 }); };
  S.pick = (t, o) => { O(t, .12, { f: [880, 880], vol: .13 }); O(t + .07, .16, { f: [1320, 1320], vol: .11 }); };
  S.potion = (t, o) => { for (let i = 0; i < 3; i++) { O(t + i * .11, .1, { f: [320 - i * 40, 180], vol: .16, lp: [900, 400] }); N(t + i * .11, .1, { f: [500 + i * 150, 900], q: 3, vol: .06 }); } O(t + .36, .18, { f: [900, 1400], vol: .07 }); };
  S.level = (t, o) => { [72, 76, 79, 84].forEach((n, i) => bell(t + i * .12, mtof(n), .13, 1.5)); O(t, 1.2, { type: 'sawtooth', f: [mtof(60), mtof(60)], vol: .035, a: .3, lp: [700, 500], det: 6 }); };
  S.quest = (t, o) => { N(t, .22, { f: [900, 3000], q: .7, vol: .06 }); bell(t + .12, mtof(79), .11, 1.1); bell(t + .32, mtof(86), .1, 1.4); };
  S.achievement = (t, o) => { [67, 71, 74, 79].forEach((n, i) => { O(t + i * .11, .55, { type: 'sawtooth', f: [mtof(n), mtof(n)], vol: .08, a: .03, lp: [1800, 900], det: -5 }); O(t + i * .11, .55, { type: 'sawtooth', f: [mtof(n), mtof(n)], vol: .08, a: .03, lp: [1800, 900], det: 5 }); }); N(t + .3, 1.1, { type: 'highpass', f: [5000, 9000], vol: .05, a: .25 }); bell(t + .45, mtof(91), .09, 1.8); };
  S.evolve = (t, o) => { O(t, 2.6, { type: 'sawtooth', f: [48, 48], vol: .15, a: 1.2, lp: [160, 380] }); for (let k = -1; k <= 1; k++) O(t + .2, 2.4, { type: 'sawtooth', f: [220, 880], vol: .06, a: 1.1, det: k * 9, lp: [900, 2800], vib: [5, 6] }); N(t, 2.2, { type: 'highpass', f: [600, 6000], vol: .1, a: 1.7 }); [79, 84, 88, 91].forEach((n, i) => bell(t + 1.7 + i * .16, mtof(n), .13, 2.2)); N(t + 1.7, .5, { type: 'lowpass', f: [900, 60], vol: .2 }); };
  S.discover = (t, o) => { [74, 81, 86, 85].forEach((n, i) => bell(t + i * .2, mtof(n), .11, 2.4)); N(t, 1.4, { f: [1800, 4000], q: 1.5, vol: .035, a: .6, pink: true }); };
  S.refinoOk = (t, o) => { N(t, .06, { f: [2400], q: 1.2, vol: .22 }); bell(t, 1800, .12, .9); bell(t + .02, 2400, .08, .7); [84, 88, 91].forEach((n, i) => bell(t + .3 + i * .09, mtof(n), .08, 1)); };
  S.refinoFail = (t, o) => { N(t, .12, { f: [900, 500], q: 1, vol: .2 }); O(t, .3, { f: [95, 48], vol: .3 }); O(t + .05, .25, { type: 'triangle', f: [1300, 320], vol: .12 }); N(t + .08, .2, { type: 'highpass', f: [4000], vol: .06 }); };
  S.gem = (t, o) => { O(t, .5, { f: [1900, 1900], vol: .1, am: [11, .5] }); O(t + .08, .6, { f: [2850, 2850], vol: .08, am: [9, .5] }); N(t, .3, { type: 'highpass', f: [6000], vol: .03 }); };
  S.enc = (t, o) => { bell(t, mtof(74), .12, 1.2); bell(t + .18, mtof(81), .12, 1.6); };
  S.toast = (t, o) => { O(t, .12, { f: [1100, 1100], vol: .14, bus: 'ui', dst: o.dst }); };
  // combate: golpe por arma
  const whoosh = (t, f0, f1, d, v, q, p) => N(t, d, { f: [f0 * p, f1 * p], q: q || 1, vol: v });
  S.swing_sword = (t, o) => whoosh(t, 500, 2600, .18, .5 * V_(o), 1.3, P_(o));
  S.swing_axe = (t, o) => { whoosh(t, 280, 1500, .27, .24 * V_(o), .9, P_(o)); O(t, .15, { f: [140, 90], vol: .06 }); };
  S.swing_daggers = (t, o) => { whoosh(t, 900, 3600, .1, .17 * V_(o), 1.4, P_(o)); whoosh(t + .07, 1100, 3800, .09, .13 * V_(o), 1.4, P_(o)); };
  S.swing_staff = (t, o) => { whoosh(t, 240, 760, .22, .4 * V_(o), .9, P_(o)); O(t, .18, { f: [200 * P_(o), 140 * P_(o)], vol: .06, lp: [500, 300] }); };
  S.swing_magic = (t, o) => { O(t, .3, { f: [500 * P_(o), 1500 * P_(o)], vol: .09, vib: [14, 40] }); N(t, .3, { type: 'highpass', f: [3000, 8000], vol: .04, a: .08 }); };
  S.swing_bow = (t, o) => { O(t, .2, { type: 'triangle', f: [230 * P_(o), 150 * P_(o)], vol: .14, lp: [1500, 400], vib: [40, 8] }); N(t, .03, { f: [2800], q: 1.5, vol: .1 }); N(t + .04, .13, { f: [2600, 1300], q: 1.6, vol: .08 }); };
  S.swing_crossbow = (t, o) => { N(t, .025, { type: 'highpass', f: [4200], vol: .16 }); O(t, .14, { type: 'square', f: [130, 55], vol: .12, lp: [600, 200] }); N(t + .03, .1, { f: [2000, 900], q: 1.4, vol: .07 }); };
  // acertos por material
  S.hit_flesh = (t, o) => { O(t, .11, { f: [160 * P_(o), 55], vol: .3 * V_(o) }); N(t, .08, { type: 'lowpass', f: [900, 300], vol: .22 * V_(o) }); };
  S.hit_bone = (t, o) => { N(t, .05, { type: 'highpass', f: [2200], vol: .2 * V_(o) }); O(t, .06, { type: 'square', f: [520, 300], vol: .1, lp: [1800, 800] }); O(t, .1, { f: [120, 60], vol: .18 }); };
  S.hit_stone = (t, o) => { O(t, .14, { type: 'triangle', f: [760 * P_(o), 520 * P_(o)], vol: .14 }); N(t, .09, { f: [1900, 1200], q: 2, vol: .16 * V_(o) }); O(t, .1, { f: [100, 50], vol: .14 }); };
  S.hit_ice = (t, o) => { N(t, .17, { type: 'highpass', f: [3600], vol: .13 * V_(o), am: [60, .7] }); O(t, .12, { f: [2300, 1700], vol: .09 }); O(t, .08, { f: [140, 70], vol: .12 }); };
  S.hit_fire = (t, o) => { N(t, .22, { f: [3200, 1000], q: .8, vol: .14 * V_(o) }); O(t, .16, { type: 'sawtooth', f: [95, 48], vol: .12, lp: [400, 120] }); };
  S.hit_wood = (t, o) => { O(t, .08, { f: [230 * P_(o), 120], vol: .22 }); N(t, .06, { f: [900, 600], q: 2, vol: .14 }); };
  S.hit_slime = (t, o) => { O(t, .1, { f: [260, 620], vol: .16 }); N(t, .09, { type: 'lowpass', f: [700, 300], vol: .14 }); };
  S.hit_ghost = (t, o) => { N(t, .22, { f: [1300, 700], q: 3, vol: .1 }); O(t, .22, { f: [820, 380], vol: .08, vib: [9, 14] }); };
  S.hit_insect = (t, o) => { N(t, .07, { type: 'highpass', f: [2500], vol: .17 }); O(t, .06, { type: 'square', f: [700, 400], vol: .05, lp: [1500, 700] }); O(t, .09, { f: [130, 70], vol: .14 }); };
  S.crit = (t, o) => { O(t, .2, { f: [2600, 2600], vol: .1, a: .002 }); O(t + .03, .16, { f: [3900, 3900], vol: .08, a: .002 }); N(t, .07, { type: 'highpass', f: [6000], vol: .08 }); };
  S.hurt = (t, o) => { O(t, .16, { f: [270, 120], vol: .24, lp: [1100, 500] }); N(t, .07, { type: 'lowpass', f: [700, 300], vol: .12 }); };
  S.die = (t, o) => { O(t, .9, { type: 'sawtooth', f: [300, 42], vol: .22, lp: [1200, 120] }); N(t + .1, .7, { type: 'lowpass', f: [800, 80], vol: .16 }); O(t + .45, .5, { f: [70, 40], vol: .22 }); };
  S.block = (t, o) => { O(t, .18, { type: 'triangle', f: [1100, 900], vol: .12 }); N(t, .08, { f: [2400, 1600], q: 2, vol: .16 }); };
  // habilidades por classe
  S.skill_vanguard = (t, o) => { N(t, .1, { f: [1500, 900], q: 1.2, vol: .22 }); O(t, .32, { type: 'triangle', f: [230, 85], vol: .2 }); bell(t + .02, 880, .07, .5); };
  S.skill_arcanist = (t, o) => { O(t, .4, { f: [700, 1900], vol: .1, vib: [12, 30] }); O(t + .05, .4, { f: [1400, 2700], vol: .07 }); N(t, .35, { type: 'highpass', f: [5000, 9000], vol: .05, am: [18, .6] }); bell(t + .12, mtof(91), .06, .9); };
  S.skill_huntress = (t, o) => { O(t, .16, { f: [1900, 2800], vol: .09 }); O(t, .2, { type: 'triangle', f: [310, 190], vol: .14, lp: [1600, 500] }); whoosh(t + .02, 1400, 3200, .15, .11, 1.5, 1); };
  S.skill_tamer = (t, o) => { O(t, .3, { f: [125, 62], vol: .26 }); O(t + .02, .5, { type: 'sawtooth', f: [220, 196], vol: .07, lp: [700, 500], vib: [6, 10] }); N(t, .25, { type: 'lowpass', f: [600, 200], vol: .1 }); };
  S.heal = (t, o) => { [72, 76, 79, 84].forEach((n, i) => O(t + i * .06, .4, { f: [mtof(n), mtof(n)], vol: .07, a: .01 })); N(t, .5, { type: 'highpass', f: [5000, 8000], vol: .03, a: .15 }); };
  S.shield = (t, o) => { O(t, .35, { f: [900, 1500], vol: .09 }); O(t, .45, { type: 'triangle', f: [450, 450], vol: .07 }); N(t, .3, { type: 'highpass', f: [4000], vol: .05 }); };
  S.summon = (t, o) => { O(t, .8, { type: 'sawtooth', f: [70, 160], vol: .12, lp: [300, 900], a: .3 }); N(t, .7, { f: [300, 2000], q: .8, vol: .1, a: .3 }); bell(t + .5, mtof(67), .1, 1.3); };
  S.boom = (t, o) => { N(t, .55, { type: 'lowpass', f: [900, 70], vol: .3 * V_(o) }); O(t, .5, { f: [105, 34], vol: .32 * V_(o) }); N(t, .06, { type: 'highpass', f: [2000], vol: .14 }); };
  S.thunder = (t, o) => { N(t, .05, { type: 'highpass', f: [3000], vol: .2 }); for (let i = 0; i < 5; i++) N(t + .1 + i * .28, 1.4 - i * .12, { type: 'lowpass', f: [320 - i * 30, 50], vol: .22 - i * .02, pink: true, a: .08 }); O(t + .1, 1.6, { f: [62, 28], vol: .2 }); };
  S.shoot = (t, o) => { N(t, .13, { f: [2600, 1200], q: 2, vol: .3 }); };
  // vozes de monstro (o.p = altura; monstros grandes = mais grave)
  const VP = o => P_(o);
  S.mob_growl = (t, o) => { O(t, .5, { type: 'sawtooth', f: [115 * VP(o), 88 * VP(o)], vol: .15 * V_(o), lp: [520, 300], vib: [27, 10 * VP(o)] }); N(t, .45, { type: 'lowpass', f: [420, 250], vol: .1 * V_(o) }); };
  S.mob_howl = (t, o) => { const p = VP(o); O(t, 1, { f: [330 * p, 330 * p], vol: .1 * V_(o), lp: [1500, 900], a: .15, vib: [5, 9] }); O(t + .02, .95, { f: [330 * p * 1.01, 560 * p], vol: .08 * V_(o), a: .1, vib: [5.5, 8] }); N(t, .9, { f: [700, 1100], q: 2, vol: .02, a: .2, pink: true }); };
  S.mob_hiss = (t, o) => { N(t, .5, { type: 'highpass', f: [4200 * VP(o), 6500 * VP(o)], vol: .1 * V_(o), a: .08 }); };
  S.mob_squeak = (t, o) => { const p = VP(o); O(t, .09, { f: [1800 * p, 2500 * p], vol: .08 * V_(o) }); O(t + .12, .08, { f: [1900 * p, 2600 * p], vol: .07 * V_(o) }); };
  S.mob_screech = (t, o) => { const p = VP(o); O(t, .38, { type: 'sawtooth', f: [900 * p, 1700 * p], vol: .09 * V_(o), lp: [3000, 2000], vib: [32, 40] }); N(t, .3, { type: 'highpass', f: [3000], vol: .05 }); };
  S.mob_roar = (t, o) => { const p = VP(o); O(t, 1, { type: 'sawtooth', f: [85 * p, 62 * p], vol: .17 * V_(o), lp: [700, 260], vib: [19, 9], a: .08 }); O(t, .9, { type: 'square', f: [170 * p, 120 * p], vol: .06 * V_(o), lp: [600, 300] }); N(t, .9, { type: 'lowpass', f: [900, 200], vol: .12 * V_(o), a: .08 }); };
  S.mob_clank = (t, o) => { const p = VP(o); O(t, .3, { type: 'triangle', f: [165 * p, 140 * p], vol: .12 * V_(o) }); N(t, .3, { f: [700 * p, 400 * p], q: 3, vol: .09 * V_(o) }); for (let i = 0; i < 3; i++) N(t + .05 + i * .08, .04, { f: [1800 + i * 300], q: 4, vol: .07 * V_(o) }); };
  S.mob_moan = (t, o) => { const p = VP(o); O(t, .95, { f: [230 * p, 175 * p], vol: .1 * V_(o), a: .2, lp: [900, 500], am: [6, .5] }); N(t, .9, { f: [900, 700], q: 4, vol: .04 * V_(o), a: .3, pink: true }); };
  S.mob_crackle = (t, o) => { for (let i = 0; i < 6; i++) N(t + i * .06 + R() * .03, .03, { f: [1500 + R() * 2500], q: 2, vol: .09 * V_(o) }); O(t, .4, { type: 'sawtooth', f: [75 * VP(o), 60 * VP(o)], vol: .08 * V_(o), lp: [260, 150] }); };
  S.mob_blub = (t, o) => { const p = VP(o); O(t, .12, { f: [210 * p, 520 * p], vol: .13 * V_(o) }); O(t + .15, .08, { f: [300 * p, 700 * p], vol: .09 * V_(o) }); N(t, .2, { type: 'lowpass', f: [500, 250], vol: .06 * V_(o) }); };
  S.mob_buzz = (t, o) => { O(t, .4, { type: 'sawtooth', f: [170 * VP(o), 150 * VP(o)], vol: .06 * V_(o), lp: [900, 600], am: [95, .9] }); };
  S.mob_chitter = (t, o) => { for (let i = 0; i < 8; i++) N(t + i * .045, .025, { type: 'highpass', f: [2800 + R() * 1800], vol: .08 * V_(o) }); };
  S.mob_die = (t, o) => { const p = VP(o); O(t, .55, { type: 'sawtooth', f: [260 * p, 55 * p], vol: .13 * V_(o), lp: [1100, 160] }); N(t, .4, { type: 'lowpass', f: [700, 90], vol: .1 * V_(o) }); };
  S.boss_roar = (t, o) => { S.mob_roar(t, { p: .62 * VP(o), v: 1.4 * V_(o), dst: o.dst }); S.mob_roar(t + .04, { p: .9 * VP(o), v: .7 * V_(o), dst: o.dst }); N(t, 1.4, { type: 'lowpass', f: [200, 50], vol: .18, pink: true }); };
  // passos e movimento
  const jit = () => .88 + R() * .24;
  S.step_grass = (t, o) => { N(t, .08, { type: 'lowpass', f: [800 * jit(), 350], vol: .1 * V_(o) * 3 }); N(t + .01, .06, { type: 'highpass', f: [3000 * jit()], vol: .025 * V_(o) * 3 }); };
  S.step_sand = (t, o) => { N(t, .11, { f: [2300 * jit(), 1700], q: .6, vol: .075 * V_(o) * 3, a: .03 }); N(t + .05, .07, { f: [1500 * jit()], q: .6, vol: .04 * V_(o) * 3 }); };
  S.step_snow = (t, o) => { N(t, .09, { f: [1700 * jit(), 900], q: 1, vol: .09 * V_(o) * 3, a: .01 }); O(t + .02, .05, { f: [1500 * jit(), 1100], vol: .012 * V_(o) * 3 }); };
  S.step_stone = (t, o) => { N(t, .03, { f: [1500 * jit()], q: 1.6, vol: .09 * V_(o) * 3 }); O(t, .04, { f: [900 * jit(), 600], vol: .05 * V_(o) * 3 }); N(t + .01, .05, { type: 'lowpass', f: [500], vol: .05 * V_(o) * 3 }); };
  S.step_ash = (t, o) => { for (let i = 0; i < 3; i++) N(t + i * .025, .035, { f: [1200 * jit() + i * 300], q: 1.2, vol: .06 * V_(o) * 3 }); };
  S.step_wood = (t, o) => { O(t, .06, { f: [210 * jit(), 150], vol: .12 * V_(o) * 3 }); N(t, .05, { f: [750], q: 1.5, vol: .07 * V_(o) * 3 }); };
  S.gallop = (t, o) => { O(t, .08, { f: [95 * jit(), 50], vol: .17 * V_(o) * 3 }); N(t, .05, { type: 'lowpass', f: [600], vol: .07 * V_(o) * 3 }); O(t + .11, .07, { f: [90 * jit(), 48], vol: .13 * V_(o) * 3 }); };
  S.wing = (t, o) => { N(t, .28, { f: [380, 900], q: 1, vol: .24 * V_(o), a: .08, pink: true }); };
  S.portal = (t, o) => { O(t, 1, { type: 'sawtooth', f: [90, 340], vol: .09, lp: [300, 1500], a: .25, vib: [7, 12] }); N(t, .9, { f: [400, 3500], q: 1, vol: .08, a: .3 }); bell(t + .4, mtof(79), .08, 1.4); };
  S.forge = (t, o) => { N(t, .05, { f: [2200], q: 1.5, vol: .12 }); bell(t, 1400, .06, .5); O(t, .1, { f: [110, 60], vol: .14 }); };

  /* ---- espacialização barata: volume por distância e pan pela direção em relação à câmera ---- */
  function spatial(x, z, maxD) {
    const dx = x - lis.x, dz = z - lis.z, d = Math.hypot(dx, dz), md = maxD || 52; if (d > md) return null;
    const ang = Math.atan2(dx, dz) - lis.yaw; // 0 = à frente da câmera (a câmera olha para -z quando yaw = 0)
    return { g: Math.pow(1 - d / md, 1.6), pan: clamp(Math.sin(ang + Math.PI) * Math.min(1, d / 10) * .8, -1, 1) };
  }
  const last = {};
  function play(name, o) {
    if (!AC || muted || !S[name]) return false; o = o || {};
    const tn = now() + (o.delay || 0), minGap = o.gap == null ? .035 : o.gap;
    if (last[name] != null && tn - last[name] < minGap && !o.force) return false; last[name] = tn;
    let sub = null;
    if (o.x != null) { const sp = spatial(o.x, o.z, o.maxD); if (!sp) return false; sub = AC.createGain(); sub.gain.value = sp.g; let d = sub; if (AC.createStereoPanner) { const pn = AC.createStereoPanner(); pn.pan.value = sp.pan; sub.connect(pn); d = pn; } d.connect(bus[o.bus || (name.startsWith('step') || name.startsWith('gallop') || name.startsWith('wing') ? 'sfx' : 'sfx')]); }
    const oo = Object.assign({}, o, sub ? { dst: sub } : {});
    if (name === 'click' || name === 'open' || name === 'close' || name === 'error' || name === 'toast') oo.dst = oo.dst || bus.ui;
    try { S[name](tn, oo); } catch (e) { return false; } return true;
  }

  /* ================= ambiente por bioma, hora e clima ================= */
  const A = { on: false, g: {}, lfo: [], acc: { bird: 3, cricket: 2, owl: 14, pop: 1, whisper: 9, hawk: 25, hammer: 6, creak: 8, drip: 5 }, env: null };
  function loopNoise(buf, type, f, q) { const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = buf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q || .7; g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(bus.amb); s.start(0, R() * 2); return { g, fl, s }; }
  function lfoTo(param, hz, depth, base) { const l = AC.createOscillator(), g = AC.createGain(); l.frequency.value = hz; g.gain.value = depth; l.connect(g); g.connect(param); l.start(); A.lfo.push(l); }
  function ambInit() {
    if (A.on || !AC) return; A.on = true; const G_ = A.g;
    G_.windLo = loopNoise(PB, 'lowpass', 420, .5); G_.windHi = loopNoise(PB, 'bandpass', 1500, .7); G_.rain = loopNoise(NB, 'highpass', 1500, .5); G_.sea = loopNoise(PB, 'lowpass', 600, .4);
    G_.fire = loopNoise(PB, 'lowpass', 220, .5); G_.town = loopNoise(PB, 'bandpass', 380, .5); G_.leaves = loopNoise(NB, 'bandpass', 4200, .6); G_.sand = loopNoise(NB, 'bandpass', 2600, .5);
    G_.drone = { g: AC.createGain() }; G_.drone.g.gain.value = 0; G_.drone.g.connect(bus.amb);
    for (const dt of [-6, 6, 1200]) { const o = AC.createOscillator(), lp = AC.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = dt === 1200 ? 82.4 : 55; o.detune.value = dt === 1200 ? 0 : dt; lp.type = 'lowpass'; lp.frequency.value = 220; o.connect(lp); lp.connect(G_.drone.g); o.start(); }
    lfoTo(G_.windLo.g.gain, .11, .06); lfoTo(G_.windHi.g.gain, .07, .03); lfoTo(G_.sea.g.gain, .13, .05); lfoTo(G_.fire.g.gain, .3, .05); lfoTo(G_.drone.g.gain, .05, .02);
  }
  /* env: { zone, tod, rain (0..1), storm, coast (0..1), town, night, speed } */
  function ambient(env) {
    if (!AC || !A.on && (ambInit(), !A.on)) return; A.env = env; const z = env.zone || 'field', night = env.tod < 5.5 || env.tod > 19.5, T = now(), set = (n, v, k) => { A.g[n].g.gain.setTargetAtTime(muted ? 0 : v, T, k || 1.4); };
    const w = { field: [.34, .22], forest: [.22, .18], ruins: [.3, .1], dunes: [.2, .5], tundra: [.3, .72], ashlands: [.34, .14] }[z] || [.3, .2];
    const town = env.town ? 1 : 0;
    set('windLo', w[0] * (1 - town * .55) + env.storm * .3, 2); set('windHi', w[1] * (1 - town * .6) + env.storm * .35, 2);
    set('rain', env.rain * .38, 1.2); set('sea', env.coast * .34 * (z === 'ashlands' ? .6 : 1), 2.2);
    set('fire', z === 'ashlands' ? .3 : 0, 2.5); set('leaves', z === 'forest' ? .045 : 0, 2.5); set('sand', z === 'dunes' ? .07 : 0, 2.5);
    set('town', town * (night ? .06 : .11), 2.5); A.g.drone.g.gain.setTargetAtTime(muted ? 0 : (z === 'ruins' ? .1 : z === 'ashlands' ? .13 : 0), T, 3);
  }
  function ambTick(dt) {
    const e = A.env; if (!AC || !A.on || !e || muted || voices > 36) return; const z = e.zone || 'field', night = e.tod < 5.5 || e.tod > 19.5, a = A.acc, dst = bus.amb, T = now() + .02;
    for (const k in a) a[k] -= dt;
    if (a.bird <= 0) { a.bird = 2.5 + R() * 6; if (!night && !e.town && (z === 'field' || z === 'forest') && e.rain < .3) { const n = 2 + (R() * 4 | 0), f = 2200 + R() * 1800; for (let i = 0; i < n; i++) O(T + i * .1, .09, { f: [f * (1 + i * .05), f * (1.25 + R() * .3)], vol: .035, dst, pan: R() * 1.2 - .6 }); } else if (!night && e.town) { O(T, .08, { f: [3200, 4200], vol: .025, dst, pan: R() - .5 }); } }
    if (a.cricket <= 0) { a.cricket = .28 + R() * .2; if (night && (z === 'field' || z === 'forest' || z === 'dunes') && e.rain < .3) { for (let i = 0; i < 3; i++) O(T + i * .045, .035, { f: [4300, 4300], vol: .012, dst }); } }
    if (a.owl <= 0) { a.owl = 12 + R() * 18; if (night && z === 'forest') { O(T, .5, { f: [420, 380], vol: .045, dst, vib: [4, 6], lp: [900, 600], a: .05 }); O(T + .6, .55, { f: [400, 340], vol: .04, dst, vib: [4, 6], lp: [900, 600], a: .05 }); } }
    if (a.pop <= 0) { a.pop = .25 + R() * .9; if (z === 'ashlands') N(T, .03, { f: [900 + R() * 2600], q: 2, vol: .07, dst }); }
    if (a.whisper <= 0) { a.whisper = 8 + R() * 12; if (z === 'ruins') { N(T, 1.4, { f: [700, 1300], q: 6, vol: .035, a: .5, dst, pink: true, pan: R() * 1.4 - .7 }); N(T + .2, 1.2, { f: [1100, 800], q: 7, vol: .025, a: .5, dst, pink: true, pan: R() * 1.4 - .7 }); } }
    if (a.hawk <= 0) { a.hawk = 20 + R() * 25; if (!night && z === 'dunes') O(T, .5, { type: 'sawtooth', f: [2400, 1500], vol: .03, dst, lp: [3500, 2000], vib: [25, 60] }); }
    if (a.hammer <= 0) { a.hammer = 5 + R() * 9; if (e.town && !night) { S.forge(T, { dst }); } }
    if (a.creak <= 0) { a.creak = 6 + R() * 12; if (z === 'tundra') { O(T, .7, { f: [180 + R() * 120, 140], vol: .03, dst, lp: [600, 300], vib: [3, 8] }); } }
    if (a.drip <= 0) { a.drip = 4 + R() * 8; if (z === 'ruins' || z === 'tundra') { const f = 900 + R() * 700; O(T, .18, { f: [f * 1.5, f], vol: .025, dst, a: .002 }); } }
  }

  /* ================= música procedural por região ================= */
  const MZ = { // root = nota MIDI, sc = escala (semitons), tempo (bpm), prog = graus por compasso, perc = percussão, lead = instrumento da melodia
    town: { root: 50, sc: [0, 2, 4, 7, 9], tempo: 84, prog: [0, 3, 4, 0], lead: 'pluck', mel: .55, pad: .045, bass: .06 },
    field: { root: 55, sc: [0, 2, 4, 6, 7, 9, 11], tempo: 92, prog: [0, 4, 3, 0], lead: 'pluck', mel: .5, pad: .035, bass: .05 },
    forest: { root: 52, sc: [0, 2, 3, 5, 7, 9, 10], tempo: 70, prog: [0, 3, 0, 5], lead: 'flute', mel: .35, pad: .05, bass: .05 },
    ruins: { root: 50, sc: [0, 2, 3, 5, 7, 8, 10], tempo: 56, prog: [0, 0, 5, 4], lead: 'bell', mel: .22, pad: .055, bass: .07 },
    dunes: { root: 57, sc: [0, 1, 4, 5, 7, 8, 10], tempo: 90, prog: [0, 0, 1, 0], lead: 'pluck', mel: .5, pad: .03, bass: .05, perc: 'darbuka' },
    tundra: { root: 48, sc: [0, 2, 4, 6, 7, 9, 11], tempo: 54, prog: [0, 4, 5, 3], lead: 'bell', mel: .3, pad: .06, bass: .04 },
    ashlands: { root: 49, sc: [0, 1, 4, 5, 7, 8, 10], tempo: 66, prog: [0, 1, 0, 5], lead: 'bell', mel: .25, pad: .06, bass: .09, perc: 'drum' },
  };
  const M = { cfg: null, key: '', next: 0, beat: 0, bar: 0, on: true, inten: 0, tgt: 0, melIdx: 2 };
  const deg = (cfg, d, oct) => cfg.root + cfg.sc[((d % cfg.sc.length) + cfg.sc.length) % cfg.sc.length] + 12 * (Math.floor(d / cfg.sc.length) + (oct || 0));
  function mPad(t, f, dur, v, cfg) { for (const dt of [-8, 0, 8]) O(t, dur, { type: 'sawtooth', f: [f, f], vol: v, a: dur * .35, det: dt, lp: [500, 900], dst: bus.music, bus: 'music' }); O(t, dur, { f: [f / 2, f / 2], vol: v * .8, a: dur * .3, dst: bus.music }); }
  function mLead(t, f, cfg, v) {
    const m = { dst: bus.music, bus: 'music' };
    if (cfg.lead === 'bell') bell(t, f, v * .8, 2.2, m);
    else if (cfg.lead === 'flute') { O(t, .9, Object.assign({ f: [f, f], vol: v * .7, a: .09, vib: [5.5, 6], lp: [2400, 1600] }, m)); N(t, .5, Object.assign({ f: [f * 2, f * 2], q: 5, vol: v * .12, a: .1 }, m)); }
    else pluck(t, f, v, m);
  }
  function mPerc(t, kind, step, v) {
    const m = { dst: bus.music, bus: 'music' };
    if (kind === 'darbuka') { if (step % 4 === 0) O(t, .14, Object.assign({ f: [210, 110], vol: v * 1.1 }, m)); else if (step % 4 === 2 || R() < .35) N(t, .05, Object.assign({ f: [2800, 2200], q: 2, vol: v * .6 }, m)); }
    else if (kind === 'drum') { if (step % 8 === 0) O(t, .35, Object.assign({ f: [90, 40], vol: v * 1.6 }, m)); if (step % 8 === 4) O(t, .25, Object.assign({ f: [120, 55], vol: v * 1.1 }, m)); }
    else if (kind === 'battle') { if (step % 4 === 0) O(t, .2, Object.assign({ f: [100, 42], vol: v * 1.7 }, m)); if (step % 2 === 1) N(t, .035, Object.assign({ type: 'highpass', f: [6500], vol: v * .45 }, m)); if (step % 8 === 6) O(t, .18, Object.assign({ f: [170, 70], vol: v * 1.2 }, m)); }
  }
  /* env: { zone, town, boss, fight (0..1), tod } */
  function music(env, dt) {
    if (!AC || muted || !M.on) return; const key = env.town ? 'town' : (env.zone || 'field'), cfg = MZ[key] || MZ.field;
    if (M.key !== key) { M.key = key; M.cfg = cfg; if (M.next < now()) M.next = now() + .3; M.beat = 0; M.bar = 0; }
    M.tgt = env.boss ? 1 : clamp(env.fight || 0, 0, 1); M.inten += (M.tgt - M.inten) * Math.min(1, dt * .8);
    const lookahead = now() + 1.2, c = M.cfg || cfg, battle = M.inten > .45, spb = 60 / (c.tempo * (1 + M.inten * .25)) / 2; // colcheia
    let guard = 0;
    while (M.next < lookahead && guard++ < 24) {
      const t = M.next, step = M.beat % 16, chord = c.prog[M.bar % c.prog.length];
      if (step === 0) { const d0 = chord; for (const k of [0, 2, 4]) mPad(t, mtof(deg(c, d0 + k, 0) - 12 + 12), spb * 16 * 1.05, c.pad * (1 - M.inten * .3), c); O(t, spb * 14, { f: [mtof(deg(c, d0, -2)), mtof(deg(c, d0, -2))], vol: c.bass, a: .05, dst: bus.music, lp: [300, 200] }); }
      if (step % 4 === 0 && R() < c.mel + M.inten * .3) { M.melIdx = clamp(M.melIdx + pickA([-2, -1, 0, 1, 2]), -2, 9); const tone = [0, 2, 4, 7][Math.floor(R() * 4)]; mLead(t, mtof(deg(c, chord + tone + (R() < .4 ? M.melIdx - 2 : 0), 1)), c, .05 + M.inten * .015); }
      else if (step % 2 === 0 && R() < c.mel * .35) pluck(t, mtof(deg(c, chord + pickA([0, 2, 4]), 1)), .035, { dst: bus.music, bus: 'music' });
      if (c.perc && !battle) mPerc(t, c.perc, step, .04);
      if (battle) mPerc(t, 'battle', step, .05 + M.inten * .02);
      if (battle && step % 16 === 8) O(t, spb * 6, { type: 'sawtooth', f: [mtof(deg(c, chord, -1)) * 1.06, mtof(deg(c, chord, -1)) * 1.06], vol: .02, a: .3, lp: [400, 600], dst: bus.music }); // tensão
      M.next += spb; M.beat++; if (M.beat % 16 === 0) M.bar++;
    }
  }

  function tick(dt, env) { if (!AC) return; if (env) { ambient(env); M.env = env; } if (M.env) music(M.env, dt); ambTick(dt); }
  function setVol(k, v) { if (!(k in vol)) return; vol[k] = clamp(v, 0, 1); if (AC) { if (k === 'master') out.gain.setTargetAtTime(muted ? 0 : vol.master * .8, now(), .05); else bus[k].gain.setTargetAtTime(vol[k], now(), .05); } try { localStorage.setItem('aldoria_vol', JSON.stringify(vol)); } catch (e) { } }
  function mute(m) { muted = !!m; if (AC) out.gain.setTargetAtTime(muted ? 0 : vol.master * .8, now(), .05); }
  return { setClock(f) { clk = f; }, init, play, tick, setVol, getVol: () => Object.assign({}, vol), mute, names: () => Object.keys(S), listener(x, z, yaw) { lis.x = x; lis.z = z; lis.yaw = yaw || 0; }, ambient, music, zones: () => Object.keys(MZ), _voices: () => voices };
}
