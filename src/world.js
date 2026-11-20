'use strict';
/* ----- mundo estático (terreno + cenário) ----- */
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
/* zona e bioma num ponto do continente (as sementes e o contorno ficam em data.js) */
function zoneAt(x, z) { const v = inTownSq(x, z, .5); if (v && v.zone) return ZN[v.zone]; return ZN[zoneScore(x, z).a]; }
function regionAt(x, z) { return REG[zoneAt(x, z).reg]; }
/* faixa de transição entre zonas: peso da zona vizinha (0 longe da fronteira, 0,5 em cima dela) */
const ZBAND = 26;
function zoneMix(x, z, r) { const q = zoneScore(x, z); return q.t < ZBAND && r < .5 * (1 - q.t / ZBAND) ? q.b : q.a; }
/* altura do chão: terra plana (y = 0); depois da linha da costa o fundo desce para o mar */
function groundY(c) { return c >= 1 ? 0 : c > -6 ? (c - 1) * .22 : Math.max(-9, -1.54 + (c + 6) * .2); }
/* grade de 4 m com zona, zona vizinha, margem e costa: sorteio rápido de pontos por zona (cenário e monstros) */
let ZGRID = null;
function zgrid() {
  if (ZGRID) return ZGRID;
  const S = 4, nx = Math.ceil((WB.x1 - WB.x0) / S), nz = Math.ceil((WB.z1 - WB.z0) / S), ids = ZONES.map(z => z.id), N = nx * nz;
  const A = new Uint8Array(N), B = new Uint8Array(N), T = new Float32Array(N), C = new Float32Array(N), lists = {}, area = {};
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, x = WB.x0 + (i + .5) * S, z = WB.z0 + (j + .5) * S, c = coastD(x, z); C[k] = c; if (c < 2) continue;
    const q = zoneScore(x, z), ia = ids.indexOf(q.a), ib = ids.indexOf(q.b); A[k] = ia; B[k] = ib; T[k] = q.t;
    (lists[q.a] || (lists[q.a] = [])).push(k); area[q.a] = (area[q.a] || 0) + S * S;
    if (q.t < ZBAND) (lists[q.b] || (lists[q.b] = [])).push(k);
  }
  return (ZGRID = { S, nx, nz, A, B, T, C, lists, area, ids });
}
/* ponto aleatório da zona (com a transição: perto da fronteira a chance cai suavemente); null se o sorteio caiu fora */
function sampleZone(zid, rng) {
  const g = zgrid(), L = g.lists[zid]; if (!L || !L.length) return null;
  const k = L[Math.floor(rng() * L.length) % L.length], i = k % g.nx, j = (k - i) / g.nx, x = WB.x0 + (i + rng()) * g.S, z = WB.z0 + (j + rng()) * g.S;
  const q = zoneScore(x, z), wb = q.t < ZBAND ? .5 * (1 - q.t / ZBAND) : 0, w = q.a === zid ? 1 - wb : q.b === zid ? wb : 0;
  return rng() < w ? [x, z] : null;
}
/* ----- construtores de malha em blocos: arrays tipados que crescem (pouca memória) e um bloco por célula de CS metros ----- */
class TMB {
  constructor() { this.nv = 0; this.ni = 0; this.p = new Float32Array(3 * 2048); this.n = new Float32Array(3 * 2048); this.c = new Float32Array(3 * 2048); this.ix = new Uint32Array(4096); }
  room(nv, ni) {
    if ((this.nv + nv) * 3 > this.p.length) { const L = Math.max(this.p.length * 2, (this.nv + nv) * 3), g = a => { const b = new Float32Array(L); b.set(a); return b; }; this.p = g(this.p); this.n = g(this.n); this.c = g(this.c); }
    if (this.ni + ni > this.ix.length) { const b = new Uint32Array(Math.max(this.ix.length * 2, this.ni + ni)); b.set(this.ix); this.ix = b; }
  }
  v(p, n, c) { this.room(1, 0); const k = this.nv * 3; this.p[k] = p[0]; this.p[k + 1] = p[1]; this.p[k + 2] = p[2]; this.n[k] = n[0]; this.n[k + 1] = n[1]; this.n[k + 2] = n[2]; this.c[k] = c[0]; this.c[k + 1] = c[1]; this.c[k + 2] = c[2]; return this.nv++; }
  idx(...a) { this.room(0, a.length); for (const i of a) this.ix[this.ni++] = i; }
  merge(o, m, tint) {
    const nv = o.p.length / 3, base = this.nv; this.room(nv, o.i.length);
    const P = this.p, N = this.n, C = this.c;
    for (let k = 0, q = base * 3; k < o.p.length; k += 3, q += 3) {
      const x = o.p[k], y = o.p[k + 1], z = o.p[k + 2];
      P[q] = m[0] * x + m[4] * y + m[8] * z + m[12]; P[q + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]; P[q + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
      const nx = o.n[k], ny = o.n[k + 1], nz = o.n[k + 2], X = m[0] * nx + m[4] * ny + m[8] * nz, Y = m[1] * nx + m[5] * ny + m[9] * nz, Z = m[2] * nx + m[6] * ny + m[10] * nz, l = Math.hypot(X, Y, Z) || 1;
      N[q] = X / l; N[q + 1] = Y / l; N[q + 2] = Z / l; C[q] = o.c[k] * tint[0]; C[q + 1] = o.c[k + 1] * tint[1]; C[q + 2] = o.c[k + 2] * tint[2];
    }
    for (const i of o.i) this.ix[this.ni++] = i + base;
    this.nv += nv; return this;
  }
  out() { return { p: this.p.subarray(0, this.nv * 3), n: this.n.subarray(0, this.nv * 3), c: this.c.subarray(0, this.nv * 3), i: this.ix.subarray(0, this.ni) }; }
}
class CMB { // mapa de blocos: cada peça vai para o bloco da sua posição
  constructor(cs) { this.cs = cs; this.m = new Map(); }
  get(x, z) { const i = Math.floor(x / this.cs), j = Math.floor(z / this.cs), k = (i + 2048) * 4096 + (j + 2048); let b = this.m.get(k); if (!b) { b = new TMB(); this.m.set(k, b); } return b; }
  merge(o, m, tint) { return this.get(m[12], m[14]).merge(o, m, tint); }
  meshes(gl) {
    const out = [];
    for (const b of this.m.values()) {
      if (!b.ni) continue;
      const o = b.out(), me = new Mesh(gl, o); let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
      for (let k = 0; k < o.p.length; k += 3) { const x = o.p[k], y = o.p[k + 1], z = o.p[k + 2]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
      me.cx = (x0 + x1) / 2; me.cy = (y0 + y1) / 2; me.cz = (z0 + z1) / 2; me.r = Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2; out.push(me);
    }
    this.m.clear(); return out;
  }
}
/* chão das vilas (cor por tipo de piso e tema) */
function townFloorColor(v, lx, lz) {
  const tp = townPave(lx, lz, v), x = v.cx + lx, z = v.cz + lz, n = vnoise(x * .45, z * .45) * .6 + vnoise(x * 1.6, z * 1.6) * .4;
  const cob = (Math.floor(lx / 1.1) + Math.floor(lz / 1.1 + (Math.floor(lx / 1.1) & 1) * .5)) & 1 ? .03 : -.03, th = v.theme;
  if (th === 'desert') {
    if (tp === 4) return mix([.86, .76, .52], [.62, .58, .34], cl(1 - (7.9 - Math.hypot(lx, lz)) / 1.2, 0, 1));
    if (tp === 3) return mix([.5, .55, .26], [.78, .68, .44], n * .7);
    if (tp === 1) { const k = .82 + n * .08 + cob; return [k, k * .84, k * .62]; }
    if (tp === 0) { const k = .76 + n * .1 + cob * .6; return [k, k * .8, k * .58]; }
    const k = .8 + n * .12; return [k * .95, k * .78, k * .52];
  }
  if (th === 'snow') {
    if (tp === 1) { const k = .62 + n * .08 + cob; return [k * .95, k, k * 1.08]; }
    if (tp === 0) { const k = .7 + n * .14; return mix([k * .82, k * .8, k * .8], [k * 1.2, k * 1.24, k * 1.3], cl(n - .2, 0, 1) * .5); } // neve pisada
    if (tp === 3) return mix([.88, .92, .98], [.78, .84, .94], n);
    return mix([.93, .96, 1], [.8, .86, .95], n * .8);
  }
  if (th === 'volcano') {
    if (tp === 4) return [.12, .1, .1];
    if (tp === 1) { const k = .3 + n * .06 + cob * .7; return [k * 1.08, k * .95, k * .95]; }
    if (tp === 0) { const k = .24 + n * .07 + cob * .5; return [k * 1.05, k, k * 1.02]; }
    if (tp === 3) return mix([.16, .12, .12], [.3, .14, .08], n);
    return mix([.2, .17, .17], [.28, .22, .2], n);
  }
  if (tp === 3) return mix([.28, .52, .2], [.36, .6, .24], n);
  if (tp === 2) return mix([.42, .36, .26], [.32, .5, .22], vnoise(x * .5, z * .5) * .7);
  const k = (tp === 1 ? .66 : .55) + n * .1 + cob; return tp === 1 ? [k, k * .97, k * .92] : [k * .96, k * .9, k * .84];
}
/* cor do chão de cada zona (sem transição) */
function zoneGround(id, x, z, n, n2, road) {
  if (id === 'dunes') {
    let col = shade(road ? [.66, .52, .34] : [.84, .7, .44], .9 + n * .25 + Math.sin(x * .55 + vnoise(x * .12, z * .12) * 9) * .04);
    if (!road) col = mix(col, n2 > .55 ? [.92, .62, .32] : [.76, .58, .36], Math.abs(n2 - .5) * .7);
    return col;
  }
  if (id === 'tundra') {
    let col = road ? shade([.74, .78, .86], .92 + n * .2) : shade([.93, .96, 1], .92 + n * .12);
    if (!road) col = mix(col, [.66, .78, .92], cl((n2 - .45) * 2.2, 0, .7));
    if (!road && vnoise(x * .22 + 9, z * .22 - 3) > .74) col = mix(col, [.46, .5, .58], .7);
    return col;
  }
  if (id === 'ashlands') {
    let col = road ? shade([.28, .22, .22], .9 + n * .3) : shade([.17, .14, .14], .75 + n * .6);
    if (!road) { col = mix(col, [.3, .27, .27], cl((n2 - .5) * 2, 0, .6)); const cr = Math.abs(vnoise(x * .16 + 3, z * .16 - 5) - .5); col = mix(col, [1, .42, .08], cl(1 - cr / .06, 0, 1) * .95); }
    return col;
  }
  let base = id === 'forest' ? [.16, .32, .18] : id === 'ruins' ? [.34, .3, .36] : [.3, .56, .22];
  if (road) base = id === 'ruins' ? [.42, .38, .4] : [.58, .48, .32];
  const pt = vnoise(x * .09 + 40, z * .09 - 7); let col = shade(base, .82 + n * .35);
  if (!road && id === 'field') col = mix(col, pt > .55 ? [.42, .6, .2] : [.2, .5, .26], Math.abs(pt - .5) * .9); // manchas de capim seco/escuro
  if (!road && id === 'forest') col = mix(col, [.1, .24, .14], pt * .6);
  return col;
}
const SAND = { ashlands: [.24, .21, .22], tundra: [.8, .82, .86], dunes: [.9, .8, .56] };
function groundColor(x, z, c) {
  if (c == null) c = coastD(x, z);
  const q = zoneScore(x, z), a = q.a, b = q.b, t = q.t, n = vnoise(x * .35, z * .35) * .5 + vnoise(x * 1.3, z * 1.3) * .5, n2 = vnoise(x * .09 + 40, z * .09 - 7);
  const rd = roadDist(x, z), road = rd < ROAD_W;
  let col = zoneGround(a, x, z, n, n2, road);
  if (t < ZBAND) col = mix(col, zoneGround(b, x, z, n, n2, road), .5 * (1 - t / ZBAND));
  if (!road && rd < ROAD_W + 1) col = mix(col, zoneGround(a, x, z, n, n2, true), (ROAD_W + 1 - rd) * .5); // beira da estrada
  for (const v of VILLAGES) if (v.theme === 'camp') { const d = Math.hypot(x - v.cx, z - v.cz); if (d < v.r + 2) { const zr = v.reg; col = mix(col, shade(zr === 'snow' ? [.7, .72, .76] : zr === 'volcano' ? [.3, .26, .24] : zr === 'desert' ? [.66, .54, .36] : [.55, .45, .32], .9 + n * .25), cl((v.r + 2 - d) / 2.5, 0, 1)); } }
  if (c < 11) { // praia: areia (preta no vulcão, cinza na neve), areia molhada e o fundo do mar
    const sd = shade(SAND[a] || [.86, .78, .56], .9 + n * .18);
    col = mix(col, sd, cl((11 - c) / 6, 0, 1));
    if (c < 1.5) col = mix(col, shade(sd, .72), cl((1.5 - c) / 2, 0, 1));
    if (c < -1) col = mix(col, [.1, .26, .3], cl((-1 - c) / 14, 0, .9));
  }
  return col;
}
function buildWorld(R, obstacles) {
  const CS = 48; // tamanho do bloco de malha (m)
  if (!R.bm.blade) R.bm.blade = mkCyl(3, 0, .5); // folha de capim: cone de 3 lados (barato)
  let mb = new CMB(CS), gl = new CMB(CS), wt = new CMB(CS), mt = new CMB(CS);
  const GS = 1.5, GN = CS / GS; // chão: células de 1,5 m, um pedaço por bloco; blocos só de mar fundo ficam de fora
  const ground = () => {
    for (let bi = Math.floor(WB.x0 / CS) - 1; bi <= Math.floor(WB.x1 / CS) + 1; bi++) for (let bj = Math.floor(WB.z0 / CS) - 1; bj <= Math.floor(WB.z1 / CS) + 1; bj++) {
      const X0 = bi * CS, Z0 = bj * CS; let mx = -1e9;
      for (let a = 0; a <= 4; a++) for (let c = 0; c <= 4; c++) mx = Math.max(mx, coastD(X0 + a * CS / 4, Z0 + c * CS / 4));
      if (mx < -38) continue;
      const b = mb.get(X0 + CS / 2, Z0 + CS / 2), base = b.nv;
      for (let j = 0; j <= GN; j++) for (let i = 0; i <= GN; i++) { const x = X0 + i * GS, z = Z0 + j * GS, c = coastD(x, z); b.v([x, groundY(c), z], [0, 1, 0], groundColor(x, z, c)); }
      for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) { const a = base + j * (GN + 1) + i, bb = a + 1, c = a + GN + 2, d = a + GN + 1; b.idx(a, d, c, a, c, bb); }
    }
  };
  /* piso fino das vilas (0,5 m), um pouco acima do chão, em ladrilhos de 8 m */
  const townFloor = v => {
    const H = v.hs + 2, T = 8, CSZ = .5, n = T / CSZ;
    for (let tx = -H; tx < H; tx += T) for (let tz = -H; tz < H; tz += T) {
      const b = mb.get(v.cx + tx + T / 2, v.cz + tz + T / 2), base = b.nv;
      for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const lx = tx + i * CSZ, lz = tz + j * CSZ; b.v([v.cx + lx, .012, v.cz + lz], [0, 1, 0], townFloorColor(v, lx, lz)); }
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = base + j * (n + 1) + i, bb = a + 1, c = a + n + 2, d = a + n + 1; b.idx(a, d, c, a, c, bb); }
    }
  };
  ground();
  const add = (shape, p, s, c, r, to) => (to || mb).merge(R.bm[shape], M.part(p, r || [0, 0, 0], [0, 0, 0], s), c);
  const addG = (shape, p, s, c, r) => add(shape, p, s, c, r, gl);
  const rng = (() => { let s = 12345; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })();
  const pick = a => a[Math.floor(rng() * a.length) % a.length];
  const lp = (x, z, r, dx, dz) => [x + Math.cos(r) * dx + Math.sin(r) * dz, z - Math.sin(r) * dx + Math.cos(r) * dz];
  const POND = [LM.pond[0], LM.pond[1], 5.4];
  const WOOD = [.3, .19, .1], STONE = [.55, .54, .56], DSTONE = [.4, .39, .42];
  /* bandeiras de material no sinal da cor (engine.js FS): CLN = liso (sem textura de rocha), MAS = alvenaria em blocos, PLK = tábuas.
     Aplique só no fim (shade/mix antes). */
  const ng = v => -Math.max(v, .002), CLN = c => [ng(c[0]), c[1], c[2]], MAS = c => [ng(c[0]), ng(c[1]), c[2]], PLK = c => [ng(c[0]), c[1], ng(c[2])];

  // ---------- casas da vila ----------
  /* casa medieval: base de pedra, térreo de pedra/reboco, andar de cima saliente em enxaimel (vigas escuras),
     telhado de duas águas com beiral, chaminé, porta em arco e janelas com venezianas.
     style: timber (Aldoria/posto/Hielmar), adobe (deserto: terraço e parapeito), stone (vulcão: pedra escura) */
  const house = (x, z, r, w, d, wall, roofc, style) => {
    style = style || 'timber';
    const Q = (dx, y, dz) => { const q = lp(x, z, r, dx, dz); return [q[0], y, q[1]]; }, rr = [0, r, 0];
    const BEAM = style === 'stone' ? [.12, .1, .1] : [.24, .15, .08], PLASTER = style === 'stone' ? shade(wall, 1.1) : mix(wall, [.95, .9, .8], .45);
    const lowWall = style === 'adobe' ? wall : style === 'stone' ? shade(DSTONE, .85) : mix(STONE, wall, .25);
    add('rbox', Q(0, .3, 0), [w + .35, .6, d + .35], DSTONE, rr);
    for (let k = 0; k < Math.floor(w / .7); k++) add('box', Q(-w / 2 + .35 + k * .7, .62, d / 2 + .19), [.55, .12, .06], shade(DSTONE, .8 + (k % 3) * .1), rr); // pedras da base
    if (style === 'adobe') {
      add('rbox', Q(0, 1.9, 0), [w, 2.6, d], wall, rr);
      add('box', Q(0, 3.3, 0), [w + .2, .2, d + .2], shade(wall, .9), rr);
      for (const [dx, dz, ww, dd] of [[0, d / 2 + .05, w + .2, .14], [0, -d / 2 - .05, w + .2, .14], [w / 2 + .05, 0, .14, d + .2], [-w / 2 - .05, 0, .14, d + .2]]) add('box', Q(dx, 3.65, dz), [ww, .5, dd], shade(wall, 1.05), rr);
      for (let k = 0; k < 4; k++) add('cyl6', Q(-w / 2 + .6 + k * (w - 1.2) / 3, 3.0, d / 2 + .12), [.12, .12, .5], BEAM, [PI / 2, r, 0]); // vigas salientes
      add('rbox', Q(w * .25, 4.0, -d * .2), [1.4, .8, 1.2], shade(wall, 1.08), rr); add('cyl', Q(w * .25, 4.45, -d * .2), [1.2, .4, 1.2], shade(roofc, .9)); // pequena cúpula
    } else if (style === 'log') { // casa comprida nórdica: paredes de troncos, telhado íngreme nevado, cabeças de dragão na cumeeira
      add('box', Q(0, 1.55, 0), [w - .1, 2.5, d - .1], shade(wall, .75), rr);
      for (let k = 0; k < 6; k++) { const y = .78 + k * .42, c = shade(wall, .82 + (k % 2) * .14);
        for (const sz of [-1, 1]) add('cyl6', Q(0, y, sz * d / 2), [.44, w + .55, .44], c, [0, r, PI / 2]);
        for (const sx of [-1, 1]) add('cyl6', Q(sx * w / 2, y + .21, 0), [.44, d + .55, .44], shade(c, .93), [PI / 2, r, 0]); }
      const RH = 3.3, RW = w + 1.1, RD = d + 1.7, y0 = 3.0;
      add('prism', Q(0, y0 + RH / 2, 0), [RW, RH, RD], [.28, .2, .14], rr);
      add('prism', Q(0, y0 + RH / 2 + .1, 0), [RW + .1, RH * .95, RD * .93], [.94, .96, 1], rr); // neve
      for (const sx of [-1, 1]) { add('box', Q(sx * (RW / 2 + .02), y0 + RH * .45, 0), [.1, RH * .85, .12], [.22, .14, .08], rr);
        for (const sd of [-1, 1]) add('box', Q(sx * (RW / 2 + .05), y0 + RH + .25, sd * .28), [.12, 1.2, .14], [.26, .17, .1], [sd * .55, r, 0]); } // tábuas cruzadas
      add('box', Q(w * .3, y0 + 2.2, -d * .15), [.7, 2.4, .7], [.5, .5, .54], rr); add('rbox', Q(w * .3, y0 + 3.45, -d * .15), [.9, .2, .9], [.92, .95, 1], rr);
    } else {
      add('box', Q(0, 1.55, 0), [w, 1.9, d], lowWall, rr);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) add('box', Q(sx * w / 2, 1.55, sz * d / 2), [.26, 1.95, .26], style === 'stone' ? DSTONE : shade(STONE, .9), rr); // quinas de pedra
      // andar de cima saliente
      const W2 = w + .44, D2 = d + .44, y2 = 3.25;
      add('box', Q(0, y2, 0), [W2, 1.5, D2], PLASTER, rr);
      add('box', Q(0, 2.5, 0), [W2 + .06, .16, D2 + .06], BEAM, rr); add('box', Q(0, 4.0, 0), [W2 + .06, .16, D2 + .06], BEAM, rr);
      for (const sz of [-1, 1]) { // enxaimel na frente e atrás
        const n = Math.max(3, Math.round(W2 / 1.15));
        for (let k = 0; k <= n; k++) add('box', Q(-W2 / 2 + k * W2 / n, y2, sz * (D2 / 2 + .03)), [.13, 1.5, .06], BEAM, rr);
        for (let k = 0; k < n; k++) if (k % 2 === 0) { const cx_ = -W2 / 2 + (k + .5) * W2 / n; add('box', Q(cx_, y2, sz * (D2 / 2 + .035)), [.1, Math.hypot(W2 / n, 1.4), .05], BEAM, [0, r, (sz > 0 ? 1 : -1) * Math.atan2(W2 / n, 1.4)]); }
      }
      for (const sx of [-1, 1]) { const n = Math.max(2, Math.round(D2 / 1.15)); for (let k = 0; k <= n; k++) add('box', Q(sx * (W2 / 2 + .03), y2, -D2 / 2 + k * D2 / n), [.06, 1.5, .13], BEAM, rr); }
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) add('cyl6', Q(sx * (w / 2 - .5 - k * .9), 2.42, d / 2 + .15), [.12, .3, .12], BEAM, [PI / 2, r, 0]); // mísulas
      // telhado de duas águas (cumeeira paralela à frente) com beiral
      const RH = style === 'stone' ? 1.9 : 2.5, RW = W2 + 1.0, RD = D2 + 1.2;
      add('prism', Q(0, 4.08 + RH / 2, 0), [RW, RH, RD], roofc, rr);
      add('box', Q(0, 4.08 + RH + .03, 0), [RW + .1, .14, .2], shade(roofc, .7), rr); // cumeeira
      for (let k = 0; k < 6; k++) { const t = (k + .5) / 6; add('box', Q(0, 4.12 + RH * t, (RD / 2) * (1 - t) + .02), [RW + .02, .05, .05], shade(roofc, .78), [Math.atan2(RH, RD / 2), r, 0]); } // fileiras de telhas
      if (style === 'timber' && roofc[0] > .8 && roofc[2] > .85) add('prism', Q(0, 4.12 + RH / 2, 0), [RW + .06, RH * .9, RD * .98], [.95, .97, 1], rr); // neve
      for (const sx of [-1, 1]) add('box', Q(sx * (RW / 2 - .02), 4.08 + RH * .45, 0), [.08, RH * .8, .1], BEAM, rr); // viga da empena
      add('box', Q(w * .27, 5.2, -d * .2), [.66, 2.6, .66], style === 'stone' ? DSTONE : [.5, .46, .44], rr); add('rbox', Q(w * .27, 6.55, -d * .2), [.86, .2, .86], [.36, .34, .33], rr);
    }
    // porta em arco com moldura de pedra e lanterna
    add('box', Q(0, 1.2, d / 2 + .05), [1.5, 1.9, .14], style === 'adobe' ? shade(wall, .8) : DSTONE, rr);
    add('rbox', Q(0, 1.1, d / 2 + .1), [1.05, 1.75, .1], [.42, .27, .14], rr);
    add('cyl', Q(0, 1.98, d / 2 + .1), [1.05, .1, .52], [.42, .27, .14], [PI / 2, r, 0]);
    for (let k = 0; k < 3; k++) add('box', Q(0, .55 + k * .55, d / 2 + .16), [1.0, .05, .03], [.22, .14, .08], rr); // ferragens
    addG('sphere', Q(.32, 1.12, d / 2 + .19), [.08, .08, .08], [1, .85, .4]);
    add('box', Q(.9, 2.15, d / 2 + .3), [.06, .06, .5], [.15, .12, .1], rr); addG('sphere', Q(.9, 1.95, d / 2 + .55), [.16, .22, .16], [1, .78, .35]);
    add('rbox', Q(0, .12, d / 2 + .55), [1.6, .24, .9], STONE, rr);
    // janelas com venezianas e floreiras
    const winY = style === 'adobe' ? 2.0 : style === 'log' ? 1.75 : 3.2;
    for (const sx of [-1, 1]) {
      const wx_ = sx * (w / 2 - .95), fz = style === 'adobe' ? d / 2 : d / 2 + .22;
      add('box', Q(wx_, winY, fz + .04), [.8, .85, .08], BEAM, rr); addG('box', Q(wx_, winY, fz + .09), [.6, .65, .05], [1, .78, .4], rr);
      add('box', Q(wx_, winY, fz + .11), [.05, .65, .03], BEAM, rr); add('box', Q(wx_, winY, fz + .11), [.6, .05, .03], BEAM, rr);
      add('box', Q(wx_ - .55, winY, fz + .1), [.26, .85, .06], shade(roofc, 1.1), rr); add('box', Q(wx_ + .55, winY, fz + .1), [.26, .85, .06], shade(roofc, 1.1), rr);
      if (style !== 'stone') { add('box', Q(wx_, winY - .55, fz + .22), [.9, .2, .28], BEAM, rr); for (const f of [-.25, 0, .25]) add('sphere', Q(wx_ + f, winY - .4, fz + .24), [.17, .15, .17], pick([[1, .4, .5], [1, .85, .3], [.9, .5, 1], [.95, .95, .95]]), rr); }
      if (style !== 'adobe' && style !== 'log') { add('box', Q(wx_, 1.5, d / 2 + .04), [.6, .6, .08], BEAM, rr); addG('box', Q(wx_, 1.5, d / 2 + .09), [.44, .44, .05], [1, .78, .4], rr); }
    }
    for (const sx of [-1, 1]) { add('box', Q(sx * ((style === 'adobe' ? w / 2 : w / 2 + .22) + .04), winY, 0), [.08, .8, .8], BEAM, rr); addG('box', Q(sx * ((style === 'adobe' ? w / 2 : w / 2 + .22) + .09), winY, 0), [.06, .6, .6], [1, .78, .4], rr); }
    // barris e caixotes ao lado
    add('cyl', Q(w / 2 + .5, .45, d / 2 - .3), [.7, .9, .7], [.42, .27, .14]); add('cylh', Q(w / 2 + .5, .45, d / 2 - .3), [.74, .06, .74], [.2, .2, .22]);
    add('rbox', Q(-w / 2 - .5, .35, d / 2 - .4), [.7, .7, .7], [.5, .34, .18], rr);
    { const k = Math.max(0, (w - d) / 2), rr0 = d / 2 + .35; for (const s of (k > .3 ? [-1, 0, 1] : [0])) { const q = lp(x, z, r, s * k, 0); obstacles.push({ x: q[0], z: q[1], r: rr0 }); } }
  };

  // ---------- fonte (praça de Aldoria) ----------
  const fountain = (x, z, k) => {
    add('cyl', [x, .35, z], [4.0 * k, .7, 4.0 * k], STONE); add('cyl', [x, .72, z], [3.7 * k, .1, 3.7 * k], [.66, .65, .68]);
    add('cyl', [x, .55, z], [3.3 * k, .5, 3.3 * k], [.25, .5, .78], null, wt);
    add('cyl', [x, .72, z], [.9 * k, 1.5 * k, .9 * k], [.7, .7, .74]); add('cyl', [x, 1.55 * k, z], [2.0 * k, .2, 2.0 * k], [.72, .72, .76]); add('cyl', [x, 1.65 * k, z], [1.7 * k, .1, 1.7 * k], [.3, .55, .85], null, wt);
    add('cyl', [x, 1.9 * k, z], [.3, 1 * k, .3], [.7, .7, .74]); add('sphere', [x, 2.5 * k, z], [.6 * k, .6 * k, .6 * k], [.4, .65, .95], null, gl);
    for (let q = 0; q < 8; q++) { const a = q / 8 * PI * 2; add('cyl6', [x + Math.cos(a) * 1.9 * k, .5, z + Math.sin(a) * 1.9 * k], [.12, 1.0 * k, .12], [.6, .8, 1], [Math.sin(a) * .5, 0, -Math.cos(a) * .5], wt); } // jatos
    obstacles.push({ x, z, r: 2.25 * k });
  };
  // lampiões
  const lamp = (x, z) => { add('cyl6', [x, .18, z], [.55, .36, .55], MAS(DSTONE)); add('cyl6', [x, 1.4, z], [.15, 2.3, .15], CLN([.2, .19, .2])); add('box', [x, 2.6, z], [.52, .07, .52], CLN([.2, .18, .18])); for (const s of [-1, 1]) { add('box', [x + s * .22, 2.92, z], [.05, .6, .05], CLN([.2, .18, .18])); add('box', [x, 2.92, z + s * .22], [.05, .6, .05], CLN([.2, .18, .18])); } addG('sphere', [x, 2.92, z], [.36, .48, .36], [1, .85, .45]); add('pyr', [x, 3.38, z], [.75, .42, .75], CLN([.2, .18, .18]), [0, PI / 4, 0]); add('sphere', [x, 3.62, z], [.12, .12, .12], CLN([.2, .18, .18])); };
  // barraca do mercador (Doran)
  const stall = (x, z, r, aw) => { const Q = (dx, y, dz) => { const q = lp(x, z, r, dx, dz); return [q[0], y, q[1]]; }, rr = [0, r, 0];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add('cyl6', Q(sx * 1.6, 1.4 + (sz > 0 ? .06 : 0), sz * 1.0), [.14, 2.8 + (sz > 0 ? 0 : .3), .14], CLN(WOOD));
    for (let k = 0; k < 7; k++) add('box', Q(-1.8 + k * .6, 2.86, .1), [.6, .07, 2.7], CLN(k % 2 ? [.95, .9, .75] : (aw || [.78, .2, .18])), [-.2, r, 0]);
    for (let k = 0; k < 7; k++) add('box', Q(-1.8 + k * .6, 2.4, 1.43), [.6, .4, .05], CLN(k % 2 ? [.95, .9, .75] : (aw || [.78, .2, .18])), rr); // franja
    add('box', Q(0, .5, .8), [3.0, 1.0, .9], PLK(WOOD), rr); add('box', Q(0, 1.03, .8), [3.12, .06, 1.02], CLN([.5, .34, .2]), rr);
    for (let k = 0; k < 5; k++) add('sphere', Q(-1.1 + k * .5, 1.18, .8), [.3, .26, .3], pick([[.9, .3, .2], [.95, .75, .2], [.5, .75, .25]]));
    crate(Q(1.2, .4, -.7), .8, [.5, .34, .18], r); crate(Q(-1.2, .35, -.7), .7, [.55, .38, .2], r + .2); add('sphere', Q(0, .35, -.8), [.9, .7, .8], CLN([.82, .74, .55]));
    barrel(Q(1.85, .55, .9), 1.1, [.44, .28, .15]);
    obstacles.push({ x, z, r: 1.9 }); };
  // forja (Brann)
  const forge = (x, z, r) => { const Q = (dx, y, dz) => { const q = lp(x, z, r, dx, dz); return [q[0], y, q[1]]; }, rr = [0, r, 0];
    add('rbox', Q(0, .8, -.2), [2.6, 1.6, 1.8], DSTONE, rr); add('box', Q(0, 1.65, -.2), [2.8, .12, 2.0], [.3, .3, .32], rr);
    addG('box', Q(0, .85, .72), [1.3, .6, .08], [1, .5, .15], rr); addG('box', Q(0, 1.72, -.2), [1.5, .06, .9], [1, .45, .1], rr);
    add('box', Q(.8, 3.1, -.9), [.9, 3.2, .9], [.42, .4, .42], rr); add('rbox', Q(.8, 4.8, -.9), [1.2, .3, 1.2], [.35, .33, .35], rr);
    add('cyl', Q(-2.0, .4, .6), [.8, .8, .8], WOOD); add('rbox', Q(-2.0, 1.0, .6), [1.1, .4, .5], [.28, .28, .32], rr); add('rbox', Q(-2.5, .95, .6), [.5, .22, .3], [.28, .28, .32], rr);
    add('cyl', Q(-1.0, .4, 1.8), [.9, .8, .9], [.25, .5, .75], null, wt);
    for (let k = 0; k < 3; k++) add('box', Q(-1.6 + k * .5, .95, -1.6), [.08, 1.3, .08], [.6, .62, .68], [.2, r, 0]);
    obstacles.push({ x, z, r: 1.9 }); };

  // poço da praça, estandartes e mercado
  const well = (x, z) => { // poço: mureta redonda de pedra com borda, água, dois postes, telhado de duas águas, sarilho, corda e balde
    const SW = [.62, .6, .58];
    add('cyl12', [x, .45, z], [2.4, .9, 2.4], MAS(SW)); add('ring', [x, .95, z], [2.25, 3.4, 2.25], CLN(shade(SW, .8)));
    add('cyl12', [x, .91, z], [2.04, .06, 2.04], [.12, .28, .42], null, wt);
    for (const s of [-1, 1]) { add('box', [x + s * 1.02, 1.8, z], [.16, 1.9, .16], CLN([.42, .28, .15])); add('box', [x + s * 1.02, 2.72, z], [.3, .1, .9], CLN([.36, .23, .12])); }
    add('prism', [x, 3.07, z], [2.6, .62, 1.7], CLN([.55, .24, .16])); add('box', [x, 3.4, z], [2.7, .08, .1], CLN([.34, .16, .1]));
    add('cyl6', [x, 2.1, z], [.16, 2.1, .16], CLN([.42, .28, .15]), [0, 0, PI / 2]); add('box', [x + 1.16, 1.92, z], [.06, .4, .06], CLN([.3, .2, .12])); add('box', [x + 1.16, 1.74, z + .12], [.06, .06, .26], CLN([.3, .2, .12]));
    add('box', [x, 1.7, z], [.03, .8, .03], CLN([.8, .72, .5])); add('cyl', [x, 1.2, z], [.36, .34, .36], PLK([.5, .33, .18])); add('cyl', [x, 1.3, z], [.38, .05, .38], CLN([.22, .22, .24]));
    obstacles.push({ x, z, r: 1.25 });
  };
  const banner = (x, z, c) => { add('cyl6', [x, 2.2, z], [.12, 4.4, .12], CLN(WOOD)); add('sphere', [x, 4.45, z], [.18, .18, .18], CLN([.9, .74, .3])); add('box', [x, 4.2, z + .02], [1.0, .08, .08], CLN(WOOD)); add('box', [x, 3.4, z + .1], [.8, 1.5, .04], CLN(c)); add('box', [x, 2.66, z + .1], [.82, .07, .05], CLN([.95, .78, .3])); add('box', [x, 3.55, z + .125], [.3, .3, .02], CLN([.95, .82, .4]), [0, 0, PI / 4]); obstacles.push({ x, z, r: .3 }); };

  // ---------- vilas principais: cores por tema, muralha e decoração ----------
  const PAL = {
    town: { w: [[.82, .68, .5], [.72, .55, .42], [.78, .74, .62], [.7, .6, .5], [.86, .78, .6], [.74, .66, .56]], rf: [[.55, .2, .15], [.2, .3, .5], [.5, .28, .16], [.5, .17, .22], [.3, .36, .22], [.42, .2, .3]], wall: [.6, .58, .55], cap: [.5, .48, .46], style: 'timber', wst: 'stone', ban: [[.62, .12, .14], [.2, .3, .6]] },
    desert: { w: [[.9, .78, .55], [.85, .68, .45], [.92, .84, .65], [.8, .64, .42], [.88, .74, .5]], rf: [[.62, .36, .2], [.2, .45, .5], [.55, .2, .2], [.7, .5, .2], [.3, .3, .5]], wall: [.86, .7, .48], cap: [.78, .62, .4], style: 'adobe', wst: 'adobe', ban: [[.2, .45, .5], [.75, .45, .15]] },
    snow: { w: [[.5, .36, .22], [.44, .32, .2], [.56, .42, .28], [.42, .3, .2], [.52, .38, .26]], rf: [[.3, .22, .15]], wall: [.42, .3, .2], cap: [.9, .94, 1], style: 'log', wst: 'palisade', ban: [[.2, .35, .62], [.8, .82, .9]] },
    volcano: { w: [[.3, .27, .3], [.38, .3, .28], [.26, .24, .28], [.34, .28, .3], [.28, .26, .3]], rf: [[.5, .15, .1], [.22, .2, .25], [.6, .25, .1], [.4, .12, .12], [.24, .22, .28]], wall: [.24, .21, .24], cap: [.4, .16, .12], style: 'stone', wst: 'basalt', ban: [[.6, .14, .08], [.15, .12, .14]] },
  };
  const brazier = (x, z, s) => { s = s || 1; add('cyl6', [x, .5 * s, z], [.5 * s, 1.0 * s, .5 * s], [.18, .16, .17]); add('cyl', [x, 1.05 * s, z], [1.0 * s, .3 * s, 1.0 * s], [.25, .22, .22]); addG('cone6', [x, 1.45 * s, z], [.7 * s, .9 * s, .7 * s], [1, .5, .12]); addG('sphere', [x, 1.25 * s, z], [.5 * s, .3 * s, .5 * s], [1, .8, .3]); obstacles.push({ x, z, r: .55 * s }); };
  const bonfire = (x, z) => { for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2; add('sphere', [x + Math.cos(a) * .85, .18, z + Math.sin(a) * .85], [.38, .3, .38], shade(STONE, .8 + (k % 3) * .1)); }
    for (let k = 0; k < 4; k++) add('cyl6', [x, .35, z], [.18, 1.4, .18], [.3, .18, .1], [.9, k * 1.6, 0]); addG('cone6', [x, .75, z], [.8, 1.4, .8], [1, .55, .15]); addG('sphere', [x, .45, z], [.5, .4, .5], [1, .85, .35]); obstacles.push({ x, z, r: 1.0 }); };
  const bench = (x, z, br) => { const rr = [0, br, 0], BW = [.52, .34, .18]; // banco: assento e encosto de ripas, pés de pedra
    for (const dz of [-.12, .13]) add('box', Q0(x, z, br, 0, dz, .5), [1.9, .07, .23], CLN(shade(BW, dz > 0 ? 1 : .92)), rr);
    for (const y of [.74, .94]) add('box', Q0(x, z, br, 0, -.27, y), [1.9, .13, .05], CLN(shade(BW, y > .8 ? 1 : .9)), [-.12, br, 0]);
    for (const sd of [-1, 1]) { add('box', Q0(x, z, br, sd * .78, 0, .23), [.18, .46, .5], MAS(STONE), rr); add('box', Q0(x, z, br, sd * .78, -.29, .75), [.08, .5, .06], CLN(shade(BW, .7)), [-.12, br, 0]); }
    obstacles.push({ x, z, r: .9 }); };
  function Q0(x, z, r, dx, dz, y) { const q = lp(x, z, r, dx, dz); return [q[0], y, q[1]]; }
  const planter = (x, z, kind, sc) => { add('rbox', [x, .3, z], [2.4, .6, 2.4], MAS(shade(STONE, .9))); add('box', [x, .58, z], [2.1, .06, 2.1], [.25, .2, .12]); tree(x, z, kind, sc); obstacles.push({ x, z, r: 1.3 }); };
  const flowerbed = (x, z, w, d, r) => { add('rbox', [x, .15, z], [w, .3, d], MAS(shade(STONE, .85)), [0, r || 0, 0]); for (let k = 0; k < Math.round(w * d * 1.5); k++) { const q = lp(x, z, r || 0, (rng() - .5) * (w - .4), (rng() - .5) * (d - .4)); add('sphere', [q[0], .38, q[1]], [.26, .22, .26], pick([[1, .4, .5], [1, .85, .3], [.9, .5, 1], [.95, .95, .95], [.3, .6, .25]])); } obstacles.push({ x, z, r: Math.max(w, d) * .45 }); };
  const crate = (p, s, c, ry) => { add('box', p, [s, s, s], PLK(c), [0, ry, 0]); const k = s / 2 - .03; for (const a of [-1, 1]) for (const b of [-1, 1]) { const q = lp(p[0], p[2], ry, a * k, b * k); add('box', [q[0], p[1], q[1]], [.09, s + .02, .09], CLN(shade(c, .62)), [0, ry, 0]); } };
  const barrel = (p, h, c) => { add('cyl', p, [h * .7, h, h * .7], PLK(c)); for (const f of [-.3, .3]) add('cyl', [p[0], p[1] + f * h, p[2]], [h * .74, .06, h * .74], CLN([.22, .22, .24])); add('cyl', [p[0], p[1] + h / 2, p[2]], [h * .6, .02, h * .6], CLN(shade(c, .8))); };
  const crates = (x, z, r) => { crate(Q0(x, z, r, 0, 0, .4), .8, [.55, .38, .2], r); crate(Q0(x, z, r, .85, .1, .35), .7, [.5, .34, .18], r + .3); crate(Q0(x, z, r, .2, 0, 1.11), .6, [.6, .42, .22], r + .6); barrel(Q0(x, z, r, -.8, .3, .5), 1, [.46, .3, .16]); obstacles.push({ x, z, r: 1.1 }); };
  const hay = (x, z) => { add('cyl12', [x, .62, z], [1.24, 1.1, 1.24], CLN([.88, .74, .36]), [PI / 2, rng() * 3, 0]); add('cyl12', [x + 1.2, .62, z + .4], [1.24, 1.1, 1.24], CLN([.84, .7, .32]), [PI / 2, rng() * 3, 0]); obstacles.push({ x: x + .6, z: z + .2, r: 1.2 }); };
  const tent = (x, z, r, col) => { const Q = (a, y, b) => Q0(x, z, r, a, b, y), rr = [0, r, 0]; // toldo de mercado do deserto
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add('cyl6', Q(sx * 1.5, 1.3, sz * 1.1), [.12, 2.6, .12], WOOD);
    add('box', Q(0, 2.62, 0), [3.4, .08, 2.6], col, [.1, r, 0]); add('box', Q(0, 2.42, 1.3), [3.4, .4, .04], shade(col, .85), rr);
    add('box', Q(0, .12, 0), [2.6, .04, 1.8], pick([[.6, .15, .15], [.2, .3, .55], [.65, .45, .15]]), rr);
    for (let k = 0; k < 4; k++) add('cyl', Q(-1 + k * .65, .35, -.4), [.45, .7, .45], pick([[.7, .45, .25], [.6, .38, .22], [.8, .6, .35]])); add('rbox', Q(.9, .3, .5), [.7, .6, .6], [.5, .34, .18], rr);
    obstacles.push({ x, z, r: 1.6 }); };
  const snowman = (x, z) => { add('sphere', [x, .55, z], [1.1, 1.0, 1.1], [.95, .97, 1]); add('sphere', [x, 1.35, z], [.8, .75, .8], [.95, .97, 1]); add('sphere', [x, 1.95, z], [.55, .55, .55], [.95, .97, 1]); add('cone6', [x, 1.95, z + .35], [.1, .35, .1], [1, .5, .1], [PI / 2, 0, 0]); add('cyl6', [x, 2.3, z], [.45, .4, .45], [.15, .12, .14]); obstacles.push({ x, z, r: .6 }); };
  const lavaPool = (x, z, r0) => { add('cyl', [x, .08, z], [r0 * 2 + 1.2, .16, r0 * 2 + 1.2], [.14, .11, .12]); addG('cyl', [x, .12, z], [r0 * 2, .1, r0 * 2], [1, .38, .06]); for (let k = 0; k < 3; k++) { const a = k * 2.1 + rng(); tree(x + Math.cos(a) * (r0 + 1.1), z + Math.sin(a) * (r0 + 1.1), 'obsidian', .7 + rng() * .4); } obstacles.push({ x, z, r: r0 }); };
  /* muralha quadrada: trechos contínuos entre torres (sem emendas), base em talude, caminho de ronda com parapeito e ameias
     regulares por trecho; torres redondas (pedra/basalto), quadradas (adobe) ou de vigia (paliçada); portão com arco, folhas abertas e grade */
  const squareWall = (v, wst, wallC, capC) => {
    const cx = v.cx, cz = v.cz, H = v.hs, GAP = v.L.gate, pal = PAL[v.theme];
    const pali = wst === 'palisade', ado = wst === 'adobe', bas = wst === 'basalt';
    const TR = pali ? 1.5 : 1.75, GT = GAP + (pali ? 1.5 : 1.7); // raio visual e posição das torres do portão
    const WC = ado ? CLN(wallC) : MAS(wallC), WD = ado ? CLN(shade(wallC, .86)) : MAS(shade(wallC, .8)), CAP = ado ? CLN(capC) : MAS(capC);
    const LOG = shade(wallC, .9), ROOF = v.theme === 'volcano' ? [.42, .12, .1] : v.theme === 'desert' ? [.2, .45, .5] : [.52, .2, .16];
    // obstáculos: os mesmos de antes (navegação inalterada)
    for (const side of [0, 1, 2, 3]) for (let t = -H; t < H - .01; t += 1.6) { const m = t + .8; if (Math.abs(m) < GAP) continue;
      const [x, z] = side === 0 ? [cx + m, cz - H] : side === 1 ? [cx + m, cz + H] : side === 2 ? [cx - H, cz + m] : [cx + H, cz + m]; obstacles.push({ x, z, r: 1.0 }); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) obstacles.push({ x: cx + sx * H, z: cz + sz * H, r: 1.6 });
    const tower = (x, z, out, gate) => { // out = direção para fora (ângulo no plano xz)
      if (pali) { // torre de vigia de madeira: 4 postes, plataforma com guarda-corpo, telhado de 4 águas nevado
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) add('cyl6', [x + sx * 1.15, 2.9, z + sz * 1.15], [.38, 5.8, .38], CLN(shade(wallC, .85)));
        for (const sd of [-1, 1]) { add('box', [x, 2.4, z + sd * 1.15], [3.2, .14, .14], CLN(shade(wallC, .7)), [0, 0, sd * .8]); add('box', [x + sd * 1.15, 2.4, z], [.14, .14, 3.2], CLN(shade(wallC, .7)), [sd * .8, 0, 0]); }
        add('box', [x, 4.55, z], [3.0, .2, 3.0], PLK(shade(wallC, .75)));
        for (const sd of [-1, 1]) { add('box', [x + sd * 1.42, 5.1, z], [.12, .9, 3.0], PLK(shade(wallC, .8))); add('box', [x, 5.1, z + sd * 1.42], [2.72, .9, .12], PLK(shade(wallC, .8))); }
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) add('cyl6', [x + sx * 1.3, 5.9, z + sz * 1.3], [.18, 1.6, .18], CLN(shade(wallC, .8)));
        add('pyr', [x, 7.25, z], [3.9, 1.5, 3.9], CLN([.3, .22, .15]), [0, PI / 4, 0]); add('pyr', [x, 7.36, z], [3.6, 1.3, 3.6], CLN([.94, .96, 1]), [0, PI / 4, 0]);
        if (gate) addG('sphere', [x, 4.2, z], [.3, .36, .3], [1, .75, .35]);
        return;
      }
      if (ado) { // torre quadrada de barro: cornija, parapeito e 3 ameias por lado; cúpula nos portões
        const S = 2 * TR;
        add('box', [x, .5, z], [S + .5, 1.0, S + .5], WD); add('box', [x, 3.3, z], [S, 6.6, S], WC);
        add('box', [x, 6.7, z], [S + .4, .2, S + .4], CAP); add('box', [x, 7.05, z], [S + .3, .5, S + .3], WC);
        for (const sd of [-1, 1]) { for (const k of [-1, 0, 1]) add('box', [x + k * (S / 2 - .25), 7.6, z + sd * (S / 2 + .02)], [.55, .6, .26], CAP); add('box', [x + sd * (S / 2 + .02), 7.6, z], [.26, .6, .55], CAP); }
        if (gate) { add('cyl12', [x, 7.6, z], [2.6, .6, 2.6], WC); add('sphere', [x, 7.9, z], [2.6, 2.2, 2.6], CLN([.2, .45, .5])); add('cone6', [x, 9.25, z], [.2, .7, .2], CLN([.95, .8, .3])); }
        return;
      }
      // pedra/basalto: torre redonda (12 faces), talude, cornija, parapeito com 6 ameias, seteiras, telhado cônico com bandeira (basalto: braseiro)
      const D = 2 * TR;
      add('cyl12t', [x, .6, z], [D + .7, 1.2, D + .7], WD); add('cyl12', [x, 3.6, z], [D, 7.2, D], WC);
      add('cyl12', [x, 7.38, z], [D + .5, .36, D + .5], CAP); add('cyl12', [x, 7.81, z], [D + .5, .5, D + .5], WC);
      const ap = (D + .5) / 2 * Math.cos(PI / 12);
      for (let q = 0; q < 12; q += 2) { const b = (15 + 30 * q) * PI / 180; (bas ? add('cone6', [x + Math.cos(b) * (ap - .25), 8.45, z + Math.sin(b) * (ap - .25)], [.5, .8, .5], CAP) : add('box', [x + Math.cos(b) * (ap - .16), 8.36, z + Math.sin(b) * (ap - .16)], [.78, .6, .32], CAP, [0, PI / 2 - b, 0])); }
      for (const k of [-1, 1]) { const b = out + k * PI / 6 * 1, b2 = Math.round((b * 180 / PI - 15) / 30) * 30 + 15, br = b2 * PI / 180, r0 = TR * Math.cos(PI / 12) + .02;
        add('box', [x + Math.cos(br) * r0, 4.2, z + Math.sin(br) * r0], [.2, 1.0, .1], CLN([.1, .09, .1]), [0, PI / 2 - br, 0]); }
      if (bas) { addG('cone6', [x, 8.6, z], [1.1, 1.3, 1.1], [1, .45, .1]); addG('sphere', [x, 8.2, z], [1.0, .45, 1.0], [1, .7, .25]); return; }
      add('cone12', [x, 8.06 + 1.9, z], [D - .3, 3.8, D - .3], CLN(ROOF)); add('cyl12', [x, 8.1, z], [D - .2, .12, D - .2], CLN(shade(ROOF, .7)));
      add('cyl6', [x, 12.25, z], [.08, 1.1, .08], CLN([.25, .2, .16])); add('sphere', [x, 12.82, z], [.16, .16, .16], CLN([.95, .8, .3]));
      add('box', [x + .42, 12.45, z], [.82, .44, .04], CLN(gate ? pal.ban[0] : pal.ban[1]));
    };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) tower(cx + sx * H, cz + sz * H, Math.atan2(sz, sx), 0); // cantos
    for (const [nx, nz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { // lados: normal para fora (nx,nz), tangente (tx,tz)
      const tx = nz ? 1 : 0, tz = nx ? 1 : 0, out = Math.atan2(nz, nx);
      const P = (a, y, o) => [cx + nx * (H + o) + tx * a, y, cz + nz * (H + o) + tz * a];
      const BX = (a, y, o, la, h, th, c, r) => add('box', P(a, y, o), tx ? [la, h, th] : [th, h, la], c, r ? (tx ? [0, 0, r] : [r, 0, 0]) : null);
      const BP = (a, y, o, la, h, th, c) => { if (tx) add('box', P(a, y, o), [th, h, la], c); else add('box', P(a, y, o), [la, h, th], c); }; // peça perpendicular à muralha
      for (const [a0, a1] of [[-H + TR * .55, -GT + TR * .55], [GT - TR * .55, H - TR * .55]]) {
        const len = a1 - a0, am = (a0 + a1) / 2;
        if (pali) { // paliçada: troncos alinhados com ponta, travessas por dentro e passarela de tábuas
          const n = Math.round(len / .5), st = len / n;
          for (let k = 0; k < n; k++) { const a = a0 + (k + .5) * st, h = k % 2 ? 3.2 : 3.45, c = CLN(shade(LOG, .86 + (k % 3) * .07)); add('cyl6', P(a, h / 2, .1), [.52, h, .52], c, [0, k * .5, 0]); add('cone6', P(a, h + .28, .1), [.52, .56, .52], c, [0, k * .5, 0]); }
          for (const y of [1.0, 2.3]) BX(am, y, -.22, len, .18, .14, CLN(shade(LOG, .6)));
          BX(am, 2.15, -.85, len, .12, 1.0, PLK(shade(LOG, .8)));
          for (let a = a0 + 1; a < a1 - .5; a += 3) add('cyl6', P(a, 1.05, -1.2), [.2, 2.1, .2], CLN(shade(LOG, .7)));
          continue;
        }
        BX(am, .3, .3, len, .6, 1.7, WD);           // talude da base
        BX(am, 1.9, .15, len, 3.8, 1.2, WC);        // corpo
        BX(am, 3.82, .78, len, .14, .16, CAP);      // cordão de pedra (por fora)
        BX(am, 4.1, .6, len, .6, .3, WC);           // parapeito externo
        BX(am, 3.95, -.36, len, .3, .18, CAP);      // mureta interna do caminho de ronda
        const n = Math.max(1, Math.round(len / 1.4)), st = len / n;
        for (let k = 0; k < n; k++) { const a = a0 + (k + .5) * st; if (bas) add('cone6', P(a, 4.75, .6), [.42, .7, .42], CAP); else BX(a, 4.68, .6, st * .52, .56, .3, CAP); }
      }
      // portão: duas torres, arco com chanfros, ameias por cima, grade levantada e folhas de madeira abertas
      for (const sd of [-1, 1]) { const q = P(sd * GT, 0, 0); tower(q[0], q[2], out, 1); const o = P(sd * (GAP + 1.1), 0, 0); obstacles.push({ x: o[0], z: o[2], r: 1.6 }); }
      if (pali) {
        BX(0, 4.55, .1, 2 * GT, .4, .5, CLN(shade(LOG, .7))); BX(0, 3.9, .1, 2 * GAP, .22, .3, CLN(shade(LOG, .6)));
        BX(0, 5.15, .4, 2.4, .7, .1, CLN(shade(LOG, .45))); BX(0, 5.15, .46, 2.0, .45, .04, CLN(pal.ban[0]));
      } else {
        const top = ado ? 6.6 : 6.4;
        BX(0, (4.3 + top) / 2, .15, 2 * GT, top - 4.3, 1.2, WC);
        for (const s of [-1, 1]) BX(s * (GAP - .5), 4.3, .15, 1.3, 1.3, 1.19, WC, PI / 4); // chanfros do arco
        BX(0, top + .07, .15, 2 * GT - TR, .14, 1.5, CAP); BX(0, top + .4, .6, 2 * GT - TR, .5, .3, WC); BX(0, top + .4, -.3, 2 * GT - TR, .5, .3, WC);
        const n = Math.max(2, Math.round((2 * GT - 2 * TR) / 1.2)), st = (2 * GT - 2 * TR) / n;
        for (let k = 0; k < n; k++) for (const o of [.6, -.3]) { const a = -GT + TR + (k + .5) * st; if (bas) add('cone6', P(a, top + 1.0, o), [.42, .7, .42], CAP); else BX(a, top + .93, o, st * .5, .56, .3, CAP); }
        for (let k = 0; k < Math.round(GAP * 2 / .42); k++) BX(-GAP + .3 + k * .42, 4.05, .2, .09, .5, .09, CLN([.16, .15, .16])); // pontas da grade levantada
        BX(0, 5.0, .79, 1.6, 1.4, .05, CLN(pal.ban[0])); BX(0, 5.72, .8, 1.8, .1, .07, CLN([.95, .78, .3])); // estandarte sobre o arco
        addG('box', P(0, 4.0, -.5), tx ? [.5, .3, .2] : [.2, .3, .5], [1, .78, .35]);
      }
      for (const s of [-1, 1]) { // folhas do portão abertas para dentro
        const lw = GAP * .92, a = s * (GAP - .2), oo = (pali ? -.2 : -.5) - lw / 2;
        BP(a, 1.85, oo, lw, 3.7, .14, PLK([.42, .27, .14]));
        for (const y of [.7, 3.0]) BP(a + s * .02, y, oo, lw, .14, .17, CLN([.18, .17, .18]));
      }
    }
    for (const [dx, dz, ry] of [[0, -H, 0], [0, H, 0], [-H, 0, PI / 2], [H, 0, PI / 2]]) { // lampiões do lado de fora e estandartes do lado de dentro
      const ox = Math.sign(dx), oz = Math.sign(dz);
      for (const sd of [-1, 1]) { const lx = cx + dx + ox * 2.6 + (ry ? 0 : sd * (GAP + .9)), lz = cz + dz + oz * 2.6 + (ry ? sd * (GAP + .9) : 0); if (v.theme === 'volcano') brazier(lx, lz); else { lamp(lx, lz); obstacles.push({ x: lx, z: lz, r: .35 }); } }
      for (const sd of [-1, 1]) { const bx = cx + dx - ox * 2.4 + (ry ? 0 : sd * (GAP + .7)), bz = cz + dz - oz * 2.4 + (ry ? sd * (GAP + .7) : 0); banner(bx, bz, pal.ban[(sd + 1) / 2]); }
    }
  };
  // placas penduradas com símbolo da profissão
  const sign = (Q, rr, kind, w, d) => {
    const sx = w / 2 - .35, y = 2.75, fz = d / 2 + .75;
    add('box', Q(sx, 3.05, d / 2 + .4), [.08, .08, .8], [.15, .12, .1], rr);
    add('box', Q(sx, y, fz), [.9, .62, .08], [.36, .24, .12], rr); add('box', Q(sx, y, fz), [.98, .7, .05], [.2, .14, .08], rr);
    const S = (shape, dx, dy, s, c, r2, glow) => (glow ? addG : add)(shape, Q(sx + dx, y + dy, fz + .07), s, c, r2 || rr);
    const rz = a => [0, rr[1], a];
    if (kind === 'quest') S('sphere', 0, 0, [.34, .34, .1], [.7, .45, 1], null, 1);
    else if (kind === 'guard') { S('cylh', 0, 0, [.44, .06, .44], [.7, .14, .14], [PI / 2, rr[1], 0]); S('box', 0, 0, [.06, .3, .04], [.95, .8, .3]); }
    else if (kind === 'smith') { S('box', 0, .04, [.5, .12, .05], [.25, .25, .28]); S('box', 0, -.1, [.16, .18, .05], [.25, .25, .28]); S('box', .14, .16, [.06, .26, .05], [.5, .35, .2], rz(.6)); }
    else if (kind === 'bank') { S('ring', -.1, .02, [.22, .9, .22], [.95, .8, .3], [PI / 2, rr[1], 0]); S('box', .14, .02, [.3, .06, .04], [.95, .8, .3]); }
    else if (kind === 'heal') { S('box', 0, 0, [.12, .4, .05], [.25, .8, .35]); S('box', 0, 0, [.4, .12, .05], [.25, .8, .35]); }
    else if (kind === 'jewel') { S('shard', 0, .02, [.22, .4, .06], [.75, .45, 1], null, 1); S('box', 0, -.2, [.34, .05, .05], [.95, .8, .3]); }
    else if (kind === 'library') { S('box', 0, 0, [.42, .3, .06], [.55, .2, .2]); S('box', 0, 0, [.03, .3, .07], [.95, .9, .8]); }
    else if (kind === 'shop') { S('sphere', 0, -.04, [.32, .34, .1], [.9, .72, .25]); S('box', 0, .16, [.14, .08, .05], [.6, .45, .2]); }
    else if (kind === 'trainer') { S('box', 0, 0, [.06, .5, .04], [.8, .82, .88], rz(.7)); S('box', 0, 0, [.06, .5, .04], [.8, .82, .88], rz(-.7)); }
    else if (kind === 'armor') { S('box', 0, -.04, [.3, .34, .05], [.35, .45, .7]); S('box', 0, .1, [.5, .1, .05], [.35, .45, .7]); }
    else if (kind === 'weapon') { S('box', 0, .04, [.07, .42, .04], [.8, .82, .88]); S('box', 0, -.12, [.24, .05, .05], [.6, .45, .2]); }
    else if (kind === 'stable') S('ring', 0, 0, [.3, .9, .3], [.6, .6, .65], [PI / 2, rr[1], 0]);
  };
  // decoração na frente de cada casa, de acordo com o dono
  const deco = (x, z, r, w, d, kind, accent, lx, lz) => {
    const sg = (lx * Math.cos(r) - lz * Math.sin(r)) > 0 ? -1 : 1; // enfeites para o lado da avenida (os cantos ficam livres)
    const Q = (dx, y, dz) => { const q = lp(x, z, r, dx * sg, dz); return [q[0], y, q[1]]; }, rr = [0, r, 0], fz = d / 2, P_ = (dx, dz) => lp(x, z, r, dx * sg, dz);
    const ob = (dx, dz, rad) => { const q = P_(dx, dz); obstacles.push({ x: q[0], z: q[1], r: rad }); };
    if (kind !== 'home') sign((dx, y, dz) => { const q = lp(x, z, r, dx, dz); return [q[0], y, q[1]]; }, rr, kind, w, d);
    if (kind === 'quest') { // torre da anciã: estandartes roxos, pedestal com cristal
      for (const s of [-1, 1]) { add('box', Q(s * (w / 2 - .4), 3.1, fz + .3), [.7, 1.6, .05], [.45, .25, .65], rr); add('box', Q(s * (w / 2 - .4), 2.25, fz + .3), [.7, .08, .06], [.95, .8, .3], rr); }
      add('cyl6', Q(1.9, .55, fz + 2.1), [.7, 1.1, .7], STONE); addG('sphere', Q(1.9, 1.5, fz + 2.1), [.55, .55, .55], [.7, .45, 1]); ob(1.9, fz + 2.1, .6);
      addG('sphere', Q(0, 7.2, 0), [.7, .7, .7], [.75, .5, 1]);
    } else if (kind === 'guard') { // quartel: escudos na fachada, suporte de lanças
      for (const s of [-1.6, 0, 1.6]) { add('cylh', Q(s, 3.3, fz + .3), [.62, .06, .62], [.62, .12, .14], [PI / 2, r, 0]); add('sphere', Q(s, 3.3, fz + .34), [.14, .14, .06], [.95, .8, .3]); }
      add('box', Q(2.2, .9, fz + 1.9), [1.5, .1, .3], WOOD, rr); for (let k = 0; k < 4; k++) { add('cyl6', Q(1.65 + k * .36, 1.3, fz + 1.9), [.05, 2.4, .05], WOOD); add('shard', Q(1.65 + k * .36, 2.6, fz + 1.9), [.09, .26, .04], [.8, .82, .88], rr); } ob(2.2, fz + 1.9, .8);
    } else if (kind === 'smith') { forge(...P_(2.4, fz + 2.6), r + PI); }
    else if (kind === 'bank') { // armazém: caixotes empilhados e baú
      for (const [dx, dy, dz] of [[2.0, .4, 1.4], [2.7, .4, 1.4], [2.35, 1.1, 1.4], [-2.2, .4, 1.2]]) add('rbox', Q(dx, dy, fz + dz), [.7, .7, .7], shade([.5, .34, .18], .9 + dx * .03), rr);
      add('rbox', Q(2.2, .4, fz + 2.6), [1.2, .7, .8], [.45, .28, .12], rr); add('cyl', Q(2.2, .78, fz + 2.6), [1.2, .2, .8], [.5, .32, .14], [PI / 2, r + PI / 2, 0]); add('box', Q(2.2, .5, fz + 3.0), [.22, .26, .04], [.95, .8, .3], rr);
      ob(2.3, fz + 1.4, .9); ob(2.2, fz + 2.6, .8);
    } else if (kind === 'heal') { // ervas: vasos com plantas e varal de ervas
      for (const dx of [-2.4, 2.0, 2.8]) { add('cyl', Q(dx, .3, fz + 1.2), [.6, .6, .6], [.55, .32, .2]); add('sphere', Q(dx, .8, fz + 1.2), [.7, .6, .7], [.3, .62, .3]); add('sphere', Q(dx + .1, 1.05, fz + 1.25), [.18, .14, .18], [1, .5, .7]); ob(dx, fz + 1.2, .45); }
      add('box', Q(0, 2.4, fz + .55), [w - 1, .04, .04], WOOD, rr); for (let k = 0; k < 6; k++) add('cone6', Q(-w / 2 + .9 + k * .75, 2.15, fz + .55), [.18, .5, .18], [.4, .6, .25], [PI, r, 0]);
    } else if (kind === 'jewel') { // joalheria: vitrine de madeira com tampo de vidro e gemas brilhantes
      add('rbox', Q(2.3, .45, fz + 1.6), [1.7, .9, .8], [.38, .24, .12], rr); add('box', Q(2.3, .93, fz + 1.6), [1.78, .06, .88], [.95, .8, .3], rr);
      add('box', Q(2.3, 1.22, fz + 1.6), [1.6, .5, .7], [.62, .78, .88], rr); add('box', Q(2.3, 1.49, fz + 1.6), [1.7, .04, .8], [.95, .8, .3], rr);
      [[.75, .3, 1], [1, .25, .3], [.3, .9, .5], [.35, .6, 1], [1, .85, .3]].forEach((c, k) => { addG('shard', Q(1.7 + k * .3, 1.12, fz + 1.5 + (k % 2) * .2), [.1, .22, .1], c, [0, r + k, 0]); });
      add('cyl6', Q(-2.3, .55, fz + 1.2), [.22, 1.1, .22], WOOD); addG('sphere', Q(-2.3, 1.3, fz + 1.2), [.34, .34, .34], [.7, .5, 1]);
      ob(2.3, fz + 1.6, .95); ob(-2.3, fz + 1.2, .35);
      add('box', Q(0, 2.45, fz + .5), [w - 1.2, .05, .05], [.95, .8, .3], rr); for (let k = 0; k < 5; k++) addG('sphere', Q(-w / 2 + 1.1 + k * (w - 2.2) / 4, 2.3, fz + .5), [.09, .09, .09], [[.75, .3, 1], [1, .25, .3], [.3, .9, .5], [.35, .6, 1], [1, .85, .3]][k]);
    } else if (kind === 'library') { // biblioteca: pilhas de livros e atril
      add('cyl6', Q(2.2, .55, fz + 1.8), [.18, 1.1, .18], WOOD); add('box', Q(2.2, 1.15, fz + 1.8), [.7, .08, .5], WOOD, [-.4, r, 0]); add('box', Q(2.2, 1.22, fz + 1.8), [.56, .04, .4], [.95, .9, .78], [-.4, r, 0]); ob(2.2, fz + 1.8, .5);
      for (let k = 0; k < 5; k++) add('box', Q(-2.3, .1 + k * .14, fz + 1.2), [.55, .12, .4], pick([[.55, .2, .2], [.2, .3, .55], [.3, .45, .25], [.5, .4, .2]]), [0, r + k * .3, 0]); ob(-2.3, fz + 1.2, .4);
    } else if (kind === 'shop') { stall(...P_(2.3, fz + 2.9), r); }
    else if (kind === 'trainer') { // pátio de treino: bonecos de palha
      for (const dx of [1.6, 3.0]) { const q = P_(dx, fz + 2.4); add('cyl6', [q[0], .9, q[1]], [.12, 1.8, .12], WOOD); add('sphere', [q[0], 1.45, q[1]], [.55, .75, .45], [.82, .7, .4]); add('sphere', [q[0], 2.05, q[1]], [.32, .32, .32], [.82, .7, .4]); add('box', [q[0], 1.55, q[1]], [1.1, .1, .1], WOOD, rr); obstacles.push({ x: q[0], z: q[1], r: .5 }); }
      add('box', Q(-2.4, .9, fz + 1.6), [1.3, .1, .3], WOOD, rr); for (let k = 0; k < 3; k++) add('box', Q(-2.8 + k * .4, 1.3, fz + 1.65), [.06, 1.3, .03], [.75, .78, .84], rr); ob(-2.4, fz + 1.6, .7);
    } else if (kind === 'armor') { // alfaiataria: manequins e rolos de tecido
      for (const dx of [1.8, 2.9]) { const q = P_(dx, fz + 1.6); add('cyl6', [q[0], .6, q[1]], [.1, 1.2, .1], WOOD); add('sphere', [q[0], 1.45, q[1]], [.6, .8, .4], pick([[.35, .45, .7], [.62, .64, .72], [.6, .25, .3]])); add('sphere', [q[0], 2.0, q[1]], [.28, .3, .28], [.8, .7, .55]); obstacles.push({ x: q[0], z: q[1], r: .45 }); }
      for (let k = 0; k < 3; k++) add('cylh', Q(-2.3, .2 + k * .32, fz + 1.2), [.3, 1.2, .3], pick([[.7, .2, .25], [.25, .4, .7], [.85, .75, .3], [.3, .55, .3]]), [0, r, PI / 2]); ob(-2.3, fz + 1.2, .7);
    } else if (kind === 'weapon') { // armaria: suporte com espadas, lanças e escudo
      add('box', Q(2.3, .9, fz + 1.7), [1.6, .1, .3], WOOD, rr); for (const s of [-1, 1]) add('box', Q(2.3 + s * .75, .8, fz + 1.7), [.1, 1.6, .3], WOOD, rr);
      for (let k = 0; k < 4; k++) add('box', Q(1.8 + k * .33, 1.35, fz + 1.75), [.06, 1.1, .03], [.78, .8, .86], [0, r, .06]); ob(2.3, fz + 1.7, .9);
      add('cylh', Q(-2.3, 1.0, fz + 1.2), [.9, .08, .9], accent || [.6, .12, .14], [PI / 2 - .25, r, 0]); add('sphere', Q(-2.3, 1.0, fz + 1.26), [.2, .2, .08], [.95, .8, .3], [PI / 2 - .25, r, 0]); ob(-2.3, fz + 1.2, .5);
    } else if (kind === 'stable') { // estábulo: cercado ao lado do celeiro, cocho e feno
      const x0 = -(w / 2 + .5), x1 = -(w / 2 + 3.6), z0 = -d / 2, z1 = d / 2 + 1.2, PT = (a, b) => lp(x, z, r, a * sg, b);
      for (let k = 0; k <= 6; k++) { const t = z0 + (z1 - z0) * k / 6; for (const xx of [x0, x1]) { const q = PT(xx, t); add('cyl6', [q[0], .6, q[1]], [.12, 1.2, .12], WOOD); obstacles.push({ x: q[0], z: q[1], r: .3 }); } }
      for (let k = 0; k <= 5; k++) { const t = x0 + (x1 - x0) * k / 5; for (const zz of [z0, z1]) { const q = PT(t, zz); add('cyl6', [q[0], .6, q[1]], [.12, 1.2, .12], WOOD); obstacles.push({ x: q[0], z: q[1], r: .3 }); } }
      for (const y of [.5, .95]) { add('box', Q((x0 + x1) / 2, y, z1), [3.1, .08, .06], WOOD, rr); add('box', Q((x0 + x1) / 2, y, z0), [3.1, .08, .06], WOOD, rr); add('box', Q(x1, y, (z0 + z1) / 2), [.06, .08, z1 - z0], WOOD, rr); add('box', Q(x0, y, (z0 + z1) / 2), [.06, .08, z1 - z0], WOOD, rr); }
      add('rbox', Q((x0 + x1) / 2, .35, z1 - .7), [1.8, .5, .6], WOOD, rr); add('box', Q((x0 + x1) / 2, .58, z1 - .7), [1.6, .06, .45], [.3, .55, .75], rr, wt);
      add('sphere', Q((x0 + x1) / 2, .5, z0 + 1), [1.2, .9, 1.0], [.85, .72, .32]);
      add('rbox', Q(2.2, .35, fz + 1.2), [1.8, .5, .6], WOOD, rr); add('box', Q(2.2, .58, fz + 1.2), [1.6, .06, .45], [.3, .55, .75], rr, wt); ob(2.2, fz + 1.2, .8);
    } else { // casas de moradores: varal, lenha ou horta
      const v = Math.floor(rng() * 3);
      if (v === 0) { add('box', Q(0, 2.0, fz + .6), [w - 1.2, .03, .03], WOOD, rr); for (let k = 0; k < 4; k++) add('box', Q(-1.5 + k, 1.7, fz + .6), [.5, .6, .02], pick([[.9, .9, .85], [.7, .3, .3], [.3, .5, .7]]), rr); }
      else if (v === 1) { for (let k = 0; k < 6; k++) add('cyl6', Q(2.0 + (k % 3) * .3, .15 + Math.floor(k / 3) * .26, fz + 1.0), [.26, .9, .26], [.45, .3, .16], [0, r, PI / 2]); ob(2.3, fz + 1.0, .6); }
      else for (let k = 0; k < 8; k++) add('sphere', Q(-2 + (k % 4) * .5, .2, fz + 1.0 + Math.floor(k / 4) * .5), [.35, .3, .35], [.3, .6, .25]);
    }
  };
  const barn = (x, z, r, w, d, roofc) => { // estábulo: celeiro aberto na frente
    const Q = (dx, y, dz) => { const q = lp(x, z, r, dx, dz); return [q[0], y, q[1]]; }, rr = [0, r, 0];
    add('rbox', Q(0, .15, 0), [w + .3, .3, d + .3], DSTONE, rr);
    add('box', Q(0, 1.7, -d / 2 + .1), [w, 3.2, .25], [.55, .36, .2], rr); for (const s of [-1, 1]) add('box', Q(s * (w / 2 - .1), 1.7, 0), [.25, 3.2, d], [.5, .33, .18], rr);
    for (const s of [-1, -.33, .33, 1]) add('box', Q(s * (w / 2 - .15), 1.7, d / 2 - .1), [.3, 3.2, .3], WOOD, rr);
    add('prism', Q(0, 4.3, 0), [w + .8, 2.2, d + 1.2], roofc, rr); add('box', Q(0, 5.42, 0), [w + .9, .14, .2], shade(roofc, .7), rr);
    for (let k = 0; k < 3; k++) add('box', Q(-1.6 + k * 1.6, .6, -d / 2 + .6), [1.2, 1.0, .5], WOOD, rr); // baias
    add('sphere', Q(1.6, .6, -.4), [1.4, 1.0, 1.0], [.85, .72, .32]); add('sphere', Q(-1.4, .5, 0), [1.0, .8, .8], [.8, .66, .28]);
    for (const s of [-1, 1]) { const q = lp(x, z, r, s * (w / 2 - .6), 0); obstacles.push({ x: q[0], z: q[1], r: d / 2 }); } { const q = lp(x, z, r, 0, -d / 4); obstacles.push({ x: q[0], z: q[1], r: d / 3 }); }
  };
  const townLayout = v => {
    const cx = v.cx, cz = v.cz, L = v.L, pal = PAL[v.theme], style = pal.style, th = v.theme, hs = v.hs, ave = L.ave;
    const slots = L.slots, spots = slots.map(sl => { const q = slotSpot(sl); return [cx + q[0], cz + q[1]]; });
    // livre: longe das casas (com a área da frente), dos pontos dos NPCs, do portal e da chegada
    const clear = (x, z, m) => { m = m || 0;
      for (const [k, sx, sz, r, w, d] of slots) { const ux = x - cx - sx, uz = z - cz - sz, lx = ux * Math.cos(r) - uz * Math.sin(r), lz = ux * Math.sin(r) + uz * Math.cos(r); if (Math.abs(lx) < w / 2 + 3.6 + m && lz > -d / 2 - 1.2 - m && lz < d / 2 + 4.2 + m) return false; }
      for (const q of spots) if (Math.hypot(x - q[0], z - q[1]) < 2.4 + m) return false;
      if (Math.hypot(x - v.portal[0], z - v.portal[1]) < 4.2 + m || Math.hypot(x - v.arrive[0], z - v.arrive[1]) < 2.2 + m) return false;
      return true; };
    slots.forEach(([kind, dx, dz, r, w, d], i) => {
      const x = cx + dx, z = cz + dz, hh = Math.floor(hash2(i * 7 + 3, v.cx | 0) * 997), wc = pal.w[hh % pal.w.length], rc = pal.rf[(hh >> 2) % pal.rf.length];
      if (kind === 'stable') barn(x, z, r, w, d, th === 'snow' ? [.3, .22, .15] : rc);
      else house(x, z, r, w, d, kind === 'quest' ? mix(wc, [.75, .7, .85], .35) : wc, style === 'log' ? rc : kind === 'quest' ? [.38, .22, .5] : kind === 'guard' ? [.5, .14, .12] : rc, style);
      if (kind === 'stable' && th === 'snow') add('prism', Q0(x, z, r, 0, 0, 4.42), [w + .9, 2.0, d + 1.1], [.94, .96, 1], [0, r, 0]);
      deco(x, z, r, w, d, kind, rc, dx, dz);
    });
    const lampAt = (x, z) => { if (th === 'volcano') brazier(x, z, .8); else { lamp(x, z); obstacles.push({ x, z, r: .35 }); } };
    // postes ao longo das avenidas (onde não atrapalham casas, NPCs e portal)
    const P0 = th === 'aldoria' || th === 'town' ? 16 : th === 'desert' ? 16.5 : 12;
    for (let t = P0; t < hs - 4; t += 7) for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const sd of [-1, 1]) {
      const x = cx + ax * t + (az ? sd * (ave + .6) : 0), z = cz + az * t + (ax ? sd * (ave + .6) : 0); if (clear(x, z, -2.6)) lampAt(x, z); }
    if (th === 'town') { // ===== Aldoria: fonte, mercado, bancos, canteiros, jardins e pomares =====
      fountain(cx, cz, 1.35);
      for (const g of [20, 70, 110, 160, 200, 340]) { const a = g * PI / 180; bench(cx + Math.cos(a) * 7.2, cz + Math.sin(a) * 7.2, -a + PI / 2); }
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { planter(cx + sx * 11.2, cz + sz * 11.2, 'round', .85); lampAt(cx + sx * 13.6, cz + sz * 13.6); }
      [[-11, -5.5, PI / 2, [.2, .35, .6]], [-11, 5.5, PI / 2, [.3, .5, .25]], [11, -5.5, -PI / 2, [.75, .5, .15]], [11, 5.5, -PI / 2, [.55, .2, .45]]].forEach(([x, z, r, c]) => stall(cx + x, cz + z, r, c));
      for (const [x, z] of [[-6.5, -12.4], [6.5, -12.4], [-12.4, 1.2], [12.4, 1.2]]) crates(cx + x, cz + z, rng() * 3);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { // jardins dos cantos internos
        const gx = cx + sx * 22.8, gz = cz + sz * 22.8;
        if (sx > 0 && sz < 0) well(gx, gz); else tree(gx, gz, 'round', 1.15);
        flowerbed(gx - sx * 3.4, gz, 1.0, 3.2); flowerbed(gx, gz - sz * 3.4, 3.2, 1.0); bench(gx + sx * 2.4, gz + sz * 2.4, sx * sz > 0 ? PI / 4 : -PI / 4);
        const ox = cx + sx * 37.3, oz = cz + sz * 37.3; // pomares dos cantos externos
        for (const [a, b] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) tree(ox + a, oz + b, 'round', .8 + rng() * .25);
        if (sx < 0) hay(ox - .6, oz); else if (sz > 0) cart(ox, oz, rng() * 0 + .25, 'barrel'); else crates(ox, oz, rng() * 3);
      }
      for (const [x, z] of [[16.7, -37.2], [-16.7, -37.2], [16.7, 37.2], [-16.7, 37.2], [37.2, 16.7], [-37.2, 16.7], [37.2, -16.7], [-37.2, -16.7]]) { // becos entre as casas externas
        tree(cx + x, cz + z, 'round', .85 + rng() * .2); }
      for (const [x, z, c] of [[-4.6, -15.6, 0], [4.6, -15.6, 1], [-4.6, 15.6, 1], [4.6, 15.6, 0], [-15.6, -4.6, 0], [-15.6, 4.6, 1], [15.6, -4.6, 1], [15.6, 4.6, 0]]) banner(cx + x, cz + z, pal.ban[c]);
    } else if (th === 'desert') { // ===== Sahr: lagoa do oásis, palmeiras, toldos de mercado =====
      add('cyl', [cx, .05, cz], [16.6, .08, 16.6], [.78, .68, .46]); add('cyl', [cx, .09, cz], [14.8, .1, 14.8], [.18, .55, .6], null, wt);
      for (let k = 0; k < 30; k++) { const a = k / 30 * PI * 2 + rng() * .1, rr_ = 7.5 + rng() * .3, sc = .6 + rng() * .6; add('sphere', [cx + Math.cos(a) * rr_, .25 * sc, cz + Math.sin(a) * rr_], [1.1 * sc, .7 * sc, 1.0 * sc], shade([.7, .6, .45], .85 + rng() * .3), [0, rng() * 6, 0]); }
      for (let k = 0; k < 26; k++) { const a = rng() * PI * 2, rr_ = 5.4 + rng() * 1.8, hh = 1.2 + rng(); add('cyl6', [cx + Math.cos(a) * rr_, hh / 2, cz + Math.sin(a) * rr_], [.06, hh, .06], [.3, .5, .22], [rng() * .2 - .1, 0, rng() * .2 - .1]); }
      for (let k = 0; k < 6; k++) { const a = rng() * PI * 2, rr_ = rng() * 4.5; add('cyl', [cx + Math.cos(a) * rr_, .15, cz + Math.sin(a) * rr_], [.9, .02, .9], [.3, .6, .3], null, wt); } // vitórias-régias
      obstacles.push({ x: cx, z: cz, r: 7.3 });
      for (let g = 0; g < 360; g += 60) { const a = g * PI / 180; tree(cx + Math.cos(a) * 9.3, cz + Math.sin(a) * 9.3, 'palm', 1.05 + rng() * .25); }
      for (const g of [45, 135, 225, 315]) { const a = g * PI / 180; tent(cx + Math.cos(a) * 13.2, cz + Math.sin(a) * 13.2, -a - PI / 2, pick([[.75, .2, .18], [.2, .45, .55], [.85, .6, .2], [.45, .25, .55]])); }
      for (let g = 22.5; g < 360; g += 45) { const a = g * PI / 180, x = cx + Math.cos(a) * 27.2, z = cz + Math.sin(a) * 27.2; if (clear(x, z, -1)) tree(x, z, 'palm', .95 + rng() * .3); }
      for (const [a, b] of [[14, 29], [29, 14]]) for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = cx + sx * a, z = cz + sz * b; if (clear(x, z, -1.5)) tree(x, z, 'palm', .9 + rng() * .35); }
      for (const g of [0, 90, 180, 270]) for (const sd of [-1, 1]) { const a = g * PI / 180, x = cx + Math.cos(a) * 24 + (g % 180 ? sd * 6 : 0), z = cz + Math.sin(a) * 24 + (g % 180 ? 0 : sd * 6); if (clear(x, z, -1)) { for (let k = 0; k < 3; k++) add('cyl', [x + (k - 1) * .6, .4, z + (k % 2) * .4], [.5, .8, .5], shade([.72, .45, .25], .9 + k * .08)); obstacles.push({ x, z, r: .9 }); } } // jarros
    } else if (th === 'snow') { // ===== Hielmar: estátua de gelo, fogueiras, pinheiros, bonecos de neve =====
      add('cyl', [cx, .35, cz], [4.2, .7, 4.2], STONE); add('cyl', [cx, .72, cz], [3.8, .1, 3.8], [.8, .86, .95], null, wt);
      for (let k = 0; k < 5; k++) { const a = k / 5 * PI * 2, hh = 2.2 + (k % 3) * .9; addG('cone6', [cx + Math.cos(a) * .7, .7 + hh / 2, cz + Math.sin(a) * .7], [.7, hh, .7], [.6, .88, 1], [Math.cos(a) * .22, 0, Math.sin(a) * .22]); }
      addG('cone6', [cx, 2.9, cz], [.9, 4.6, .9], [.7, .92, 1]); obstacles.push({ x: cx, z: cz, r: 2.4 });
      for (const g of [45, 135, 225, 315]) { const a = g * PI / 180; bonfire(cx + Math.cos(a) * 7, cz + Math.sin(a) * 7); }
      for (const g of [100, 170, 20]) { const a = g * PI / 180; snowman(cx + Math.cos(a) * 8.2, cz + Math.sin(a) * 8.2); }
      stall(cx - 6.2, cz + 6.2, PI / 4, [.2, .35, .62]); crates(cx + 6.4, cz + 6.6, .4);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        tree(cx + sx * 15.6, cz + sz * 15.6, 'snowpine', .9);
        for (const [a, b] of [[27, 8], [8, 27], [27, 15.5], [15.5, 27], [26.5, 26.5]]) { const x = cx + sx * a, z = cz + sz * b; if (clear(x, z, -1.8)) tree(x, z, 'snowpine', .75 + rng() * .3); }
        const wx_ = cx + sx * 15.8, wz = cz + sz * 4.9; if (clear(wx_, wz, -1)) { for (let k = 0; k < 6; k++) add('cyl6', [wx_ + (k % 3) * .3 - .3, .15 + Math.floor(k / 3) * .26, wz], [.26, 1.1, .26], [.45, .3, .16], [PI / 2, 0, 0]); obstacles.push({ x: wx_, z: wz, r: .8 }); } // lenha
      }
    } else { // ===== Cinzas: caldeira de lava, canais de lava ao longo das avenidas, braseiros, poços de lava =====
      add('cyl', [cx, .4, cz], [10.4, .8, 10.4], [.2, .18, .22]); addG('cyl', [cx, .82, cz], [8.4, .1, 8.4], [1, .32, .04]);
      for (let k = 0; k < 10; k++) { const a = k / 10 * PI * 2, hh = 1.6 + (k % 3) * 1.1; add('cone6', [cx + Math.cos(a) * 4.6, hh / 2, cz + Math.sin(a) * 4.6], [.8, hh, .8], [.12, .1, .14], [Math.cos(a) * .18, 0, Math.sin(a) * .18]); }
      add('rbox', [cx, 1.4, cz], [2.2, 1.2, 1.4], [.22, .2, .22]); add('rbox', [cx, 2.2, cz], [3.0, .5, 1.1], [.3, .28, .3]); addG('cone6', [cx, 3.4, cz], [1.0, 2.0, 1.0], [1, .6, .15]); // grande bigorna
      obstacles.push({ x: cx, z: cz, r: 5.0 });
      for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const sd of [-1, 1]) { const a0 = 11.5, a1 = hs - 3.5, m = (a0 + a1) / 2, len = a1 - a0, x = cx + ax * m + (az ? sd * (ave - .25) : 0), z = cz + az * m + (ax ? sd * (ave - .25) : 0);
        for (let t = 0; t < len; t += 1.5) { const px = ax ? cx + ax * (a0 + t + .75) : x, pz = az ? cz + az * (a0 + t + .75) : z; // canal em trechos: some onde há enfeites das casas
          if (!obstacles.some(o => Math.abs(o.x - px) < o.r + .8 && Math.abs(o.z - pz) < o.r + .8)) addG('box', [px, .03, pz], [ax ? 1.5 : .34, .03, az ? 1.5 : .34], [1, .4, .08]); } }
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = cx + sx * 22.5, z = cz + sz * 22.5; if (clear(x, z, -2)) lavaPool(x, z, 2.3); }
      for (const g of [45, 135, 225, 315]) { const a = g * PI / 180; brazier(cx + Math.cos(a) * 9.4, cz + Math.sin(a) * 9.4, 1); }
    }
    squareWall(v, pal.wst, pal.wall, pal.cap);
    townFloor(v);
  };
  // ---------- marcos da história ----------
  /* ---- peças de acampamento/covil (fix nov/2026) ----
     clearing: clareira rente ao chão (y=.02) cuja borda irregular tem a cor do terreno em volta (sem degrau nem octógono)
     campfire: anel de pedras, toras em pirâmide, brasas e labaredas que tremulam (malha 'flame', ver VS)
     stakeWall: paliçada contínua de estacas apontadas seguindo o círculo, com portão (torres de tocha) no ângulo ga
     flagPole: mastro + estandarte ('cloth' ondula no VS) com emblema
     tentA: barraca de lona em A (prism) com porta escura, mastros e estacas; frente (+x local) virada para (fx,fz) */
  const clearing = (cx, cz, R0, dirt, seed) => {
    const b = mb.get(cx, cz), base = b.nv, SEG = 32, RR = [0, .45, .75, .92, 1.0], J = []; for (let i = 0; i < SEG; i++) J.push(.92 + .16 * hash2(i * 3.1 + seed, seed * 1.7));
    b.v([cx, .02, cz], [0, 1, 0], dirt);
    for (let r = 1; r < RR.length; r++) for (let i = 0; i < SEG; i++) {
      const a = i / SEG * PI * 2, rr = R0 * RR[r] * (r > 1 ? J[i] : 1), x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr, n = .9 + .2 * hash2(x * 1.3, z * 1.7);
      const gcol = groundColor(x, z, coastD(x, z)), t = r < 3 ? 0 : r === 3 ? .45 : 1;
      b.v([x, .02, z], [0, 1, 0], mix(shade(dirt, n), gcol, t));
    }
    for (let i = 0; i < SEG; i++) b.idx(base, base + 1 + (i + 1) % SEG, base + 1 + i);
    for (let r = 1; r < RR.length - 1; r++) for (let i = 0; i < SEG; i++) { const A = base + 1 + (r - 1) * SEG + i, B = base + 1 + (r - 1) * SEG + (i + 1) % SEG, C = B + SEG, D = A + SEG; b.idx(A, C, D, A, B, C); }
  };
  const campfire = (x, z, s) => {
    s = s || 1; add('cyl', [x, .03, z], [1.5 * s, .04, 1.5 * s], [.12, .1, .09]);
    for (let k = 0; k < 9; k++) { const a = k / 9 * PI * 2 + .2; add('sphere', [x + Math.cos(a) * .88 * s, .1 * s, z + Math.sin(a) * .88 * s], [.42 * s, .3 * s, .36 * s], shade(DSTONE, .75 + (k % 3) * .12), [0, -a, 0]); }
    for (let k = 0; k < 5; k++) { const a = k / 5 * PI * 2 + .4; add('cyl6', [x + Math.cos(a) * .4 * s, .55 * s, z + Math.sin(a) * .4 * s], [.17 * s, 1.3 * s, .17 * s], k % 2 ? [.3, .18, .09] : [.2, .12, .07], [0, -a, .55]); }
    addG('sphere', [x, .1 * s, z], [.85 * s, .24 * s, .85 * s], [1, .32, .05]);
    addG('flame', [x, .62 * s, z], [.75 * s, 1.15 * s, .75 * s], [1, .4, .06]);
    addG('flame', [x + .05 * s, .55 * s, z - .04 * s], [.45 * s, .95 * s, .45 * s], [1, .78, .25], [0, 1.4, 0]);
    for (const [dx, dz, h] of [[.28, .1, .6], [-.22, .2, .5], [.02, -.3, .55]]) addG('flame', [x + dx * s, .4 * s, z + dz * s], [.3 * s, h * s, .3 * s], [1, .55, .1], [0, dx * 9, 0]);
    for (let k = 0; k < 3; k++) addG('box', [x + (k - 1) * .2 * s, (1.4 + k * .25) * s, z + (k % 2 - .5) * .2 * s], [.05, .05, .05], [1, .6, -.1]); // fagulhas
    obstacles.push({ x, z, r: 1.1 * s });
  };
  const stakeWall = (cx, cz, R0, ga, gw, col) => {
    const n = Math.ceil(PI * 2 * R0 / .42), hg = gw / 2 / R0, P = [];
    const inGap = a => Math.abs(Math.atan2(Math.sin(a - ga), Math.cos(a - ga))) < hg;
    for (let k = 0; k < n; k++) {
      const a = k / n * PI * 2; if (inGap(a)) { P.push(null); continue; }
      const x = cx + Math.cos(a) * R0, z = cz + Math.sin(a) * R0, h = 2.1 + hash2(k * 1.7, R0) * .5, c = shade(col, .8 + hash2(k, 3.3) * .35);
      add('cyl6', [x, h / 2, z], [.38, h, .38], c, [0, k, 0]); add('cone6', [x, h + .22, z], [.38, .45, .38], shade(c, 1.1), [0, k, 0]); P.push([x, z]);
      if (k % 2 === 0) obstacles.push({ x, z, r: .5 });
    }
    for (let k = 0; k < n; k += 6) for (const y of [.75, 1.6]) { // travessas por dentro (cordas retas entre estacas)
      const p = P[k], q = P[(k + 6) % n]; if (!p || !q || P.slice(k, k + 7).some(v => !v)) continue;
      const a = (k + 3) / n * PI * 2, ix = -Math.cos(a) * .26, iz = -Math.sin(a) * .26, dx = q[0] - p[0], dz = q[1] - p[1];
      add('box', [(p[0] + q[0]) / 2 + ix, y, (p[1] + q[1]) / 2 + iz], [Math.hypot(dx, dz) + .3, .14, .12], shade(col, .75), [0, Math.atan2(-dz, dx), 0]);
    }
    for (const sd of [-1, 1]) { // portão: postes altos com tochas e trave
      const a = ga + sd * (hg + .03), x = cx + Math.cos(a) * R0, z = cz + Math.sin(a) * R0;
      add('cyl6', [x, 1.7, z], [.5, 3.4, .5], shade(col, .85)); add('cyl6', [x, 3.45, z], [.62, .2, .62], [.15, .12, .1]);
      addG('flame', [x, 3.8, z], [.32, .6, .32], [1, .5, .1]); obstacles.push({ x, z, r: .55 });
    }
    { const a0 = ga - hg, a1 = ga + hg, p = [cx + Math.cos(a0) * R0, cz + Math.sin(a0) * R0], q = [cx + Math.cos(a1) * R0, cz + Math.sin(a1) * R0], dx = q[0] - p[0], dz = q[1] - p[1];
      add('box', [(p[0] + q[0]) / 2, 3.1, (p[1] + q[1]) / 2], [Math.hypot(dx, dz) + .6, .22, .22], shade(col, .7), [0, Math.atan2(-dz, dx), 0]);
      add('sphere', [(p[0] + q[0]) / 2, 2.78, (p[1] + q[1]) / 2], [.36, .38, .34], [.88, .85, .76]); }
  };
  const flagPole = (x, z, h, col, emb) => {
    add('cyl6', [x, h / 2, z], [.13, h, .13], [.28, .18, .1]); add('sphere', [x, h + .08, z], [.2, .2, .2], [.75, .6, .25]);
    add('cyl6', [x, .15, z], [.5, .3, .5], DSTONE);
    add('cloth', [x + .06, h - .75, z], [1.5, 1.1, 1], col); add('cyl6', [x + .8, h - .17, z], [.07, 1.65, .07], [.28, .18, .1], [0, 0, PI / 2]); // travessa do topo
    add('box', [x + .06 + .9, h - .75, z], [.42, .42, .07], [emb[0], -emb[1], emb[2]], [0, 0, PI / 4]); // emblema (losango) ondula junto
    add('box', [x + .06 + .9, h - .75, z], [.16, .16, .08], [col[0] * .5, -col[1] * .5, col[2] * .5], [0, 0, PI / 4]);
    obstacles.push({ x, z, r: .35 });
  };
  const tentA = (x, z, fx, fz, col, L, W, H) => {
    L = L || 3.2; W = W || 2.7; H = H || 2.1; const r = Math.atan2(-(fz - z), fx - x), rr = [0, r, 0], Q = (dx, y, dz) => Q0(x, z, r, dx, dz, y);
    add('prism', Q(0, H / 2 + .02, 0), [L, H, W], col, rr);
    add('prism', Q(L / 2 + .02, H * .36 + .02, 0), [.05, H * .72, W * .42], [.07, .05, .04], rr); // porta
    add('prism', Q(L / 2 + .03, H * .66, 0), [.06, H * .2, W * .2], shade(col, .75), rr);
    for (const sd of [-1, 1]) { add('cyl6', Q(sd * (L / 2 + .06), (H + .35) / 2, 0), [.08, H + .35, .08], WOOD); add('cyl6', Q(sd * (L / 2 + .55), .15, 0), [.07, .35, .07], WOOD); }
    for (const sd of [-1, 1]) add('cyl6', Q(0, .12, sd * (W / 2 + .25)), [.07, .3, .07], WOOD);
    obstacles.push({ x, z, r: Math.max(L, W) * .5 });
  };
  const gateAngle = (cx, cz, R0) => { let best = 0, bd = 1e9; for (let k = 0; k < 72; k++) { const a = k / 72 * PI * 2, d = roadDist(cx + Math.cos(a) * (R0 + 4), cz + Math.sin(a) * (R0 + 4)); if (d < bd) { bd = d; best = a; } } return best; };
  { // Acampamento Bandido (Capítulo I): clareira, fogueira, 3 barracas viradas para o fogo, paliçada com portão para a estrada, estandarte
    const [cx, cz] = LM.camp, ga = gateAngle(cx, cz, 8.2), at = (a, r) => [cx + Math.cos(ga + a) * r, cz + Math.sin(ga + a) * r];
    clearing(cx, cz, 8.9, [.44, .34, .22], 7);
    campfire(cx, cz, 1);
    for (const [a, c] of [[PI, [.6, .5, .34]], [PI - 1.3, [.55, .2, .15]], [PI + 1.3, [.5, .44, .3]]]) { const [x, z] = at(a, 4.5); tentA(x, z, cx, cz, c); }
    for (const a of [.75, -.75, PI]) { const [x, z] = at(a, 2.15); add('cyl6', [x, .22, z], [.42, 1.5, .42], [.36, .24, .13], [0, PI / 2 - (ga + a), PI / 2]); } // toras de sentar
    stakeWall(cx, cz, 8.2, ga, 3.4, [.4, .27, .15]);
    { const [x, z] = at(.95, 5.9); flagPole(x, z, 5, [.5, .08, .07], [.9, .86, .75]); }
    { const [x, z] = at(-.95, 5.8); add('cyl', [x, .55, z], [.75, 1.1, .75], [.42, .27, .14]); add('cyl', [x + .8, .5, z + .3], [.7, 1.0, .7], [.38, .25, .13]); add('box', [x - .3, .4, z + .9], [.8, .8, .8], PLK([.5, .34, .18]), [0, .4, 0]); obstacles.push({ x: x + .3, z: z + .3, r: 1.1 }); }
  }
  // ---------- moinho de vento, carroça e plantações ----------
  const spins = []; // peças que giram (pás do moinho): malhas próprias, desenhadas pelo engine (R.drawSpin)
  const windmill = (x, z, yaw) => { // frente (eixo das pás) = +z local
    const Q = (dx, y, dz) => Q0(x, z, yaw, dx, dz, y), PL = [.9, .86, .77], TW = [.36, .23, .13], RF = [.62, .28, .17], ST = [.6, .58, .56];
    const r8 = [0, yaw + PI / 8, 0], tl = Math.atan(.616 / 7), ap = y => (2.2 - (y - .6) * .616 / 7) * Math.cos(PI / 8);
    add('cyl', Q(0, .3, 0), [5.3, .6, 5.3], MAS(ST), r8);                  // embasamento de pedra
    add('octt', Q(0, 4.1, 0), [4.4, 7, 4.4], MAS(PL), r8);                 // torre de pedra clara afunilada (8 faces)
    add('cyl', Q(0, 7.75, 0), [3.75, .3, 3.75], CLN(TW), r8);              // cinta de madeira do capelo
    const face = (ang, y, w, h, d, c, o) => add('box', Q(Math.sin(ang) * (ap(y) + (o || 0)), y, Math.cos(ang) * (ap(y) + (o || 0))), [w, h, d], c, [-tl, yaw + ang, 0]);
    face(0, 1.75, 1.5, 2.3, .16, CLN(shade(ST, .9)), .02); face(0, 1.62, 1.08, 2.0, .16, PLK([.42, .26, .13]), .07); face(0, 2.95, 1.7, .22, .26, CLN(TW), .06); // porta
    face(0, 1.6, .1, .1, .1, CLN([.85, .7, .3]), .17);
    for (const [ang, y] of [[PI / 2, 4.6], [-PI / 2, 4.2], [0, 5.3], [PI, 5.0]]) { face(ang, y, .78, .98, .14, CLN(TW), .02); face(ang, y, .52, .72, .14, CLN([.16, .2, .26]), .06); face(ang, y - .55, .9, .1, .3, CLN(TW), .08); } // janelinhas
    add('cone12', Q(0, 9.5, 0), [4.2, 3.3, 4.2], CLN(RF), [0, yaw, 0]);    // telhado cônico
    add('cyl12', Q(0, 7.95, 0), [4.24, .14, 4.24], CLN(shade(RF, .72)), [0, yaw, 0]);
    add('cyl6', Q(0, 11.35, 0), [.1, .7, .1], CLN(TW)); add('sphere', Q(0, 11.72, 0), [.26, .26, .26], CLN([.9, .74, .3]));
    const yh = 8.7;
    add('box', Q(0, yh, 1.45), [1.0, 1.0, 1.1], CLN(shade(RF, .85)), [0, yaw, 0]); add('prism', Q(0, yh + .7, 1.45), [1.2, .45, 1.2], CLN(shade(RF, .7)), [0, yaw + PI / 2, 0]); // caixa do eixo
    add('cyl', Q(0, yh, 2.2), [.34, 1.6, .34], CLN(TW), [PI / 2, yaw, 0]); // eixo saindo da frente
    // pás: 4 velas com treliça de madeira e lona, em malha própria girando em torno do eixo
    const sm = new MB(), PT = (shape, px, py, pz, s, c, a) => { const ca = Math.cos(a), sa = Math.sin(a); sm.merge(R.bm[shape], M.part([px * ca - py * sa, px * sa + py * ca, pz], [0, 0, a], [0, 0, 0], s), c); };
    sm.merge(R.bm.cyl, M.part([0, 0, 0], [PI / 2, 0, 0], [0, 0, 0], [.8, .5, .8]), CLN(TW)); sm.merge(R.bm.cone, M.part([0, 0, .42], [PI / 2, 0, 0], [0, 0, 0], [.5, .34, .5]), CLN(shade(TW, .8)));
    for (let k = 0; k < 4; k++) { const a = k * PI / 2;
      PT('box', 0, 3.25, .1, [.2, 6.3, .16], CLN(TW), a);                                   // vara principal
      for (const px of [.32, 1.38]) PT('box', px, 3.95, .14, [.07, 4.5, .07], CLN(shade(TW, 1.15)), a); // longarinas
      for (let j = 0; j < 9; j++) PT('box', .85, 1.75 + j * .55, .14, [1.14, .06, .06], CLN(shade(TW, 1.15)), a); // travessas
      PT('box', .85, 4.35, .06, [1.0, 3.6, .03], CLN([.93, .89, .78]), a);                  // lona
    }
    spins.push({ mesh: new Mesh(R.gl, sm), p: Q(0, yh, 3.05), yaw, w: .5, ph: rng() * 6, r: 7 });
    for (const [dx, dz] of [[1.3, 2.9], [1.9, 2.6], [1.55, 3.4]]) add('sphere', Q(dx, .32, dz), [.62, .62, .52], CLN([.9, .85, .72]), [0, yaw + dx, 0]); // sacos de farinha
    obstacles.push({ x, z, r: 2.7 });
  };
  // carroça de madeira com rodas raiadas e carga (feno, sacos ou barris)
  const cart = (x, z, r, load) => {
    const Q = (a, y, b) => Q0(x, z, r, a, b, y), rr = [0, r, 0], CW = [.52, .35, .2], DK = [.34, .22, .12];
    add('box', Q(0, .9, 0), [1.5, .12, 2.6], PLK(CW), rr);
    for (const s of [-1, 1]) add('box', Q(s * .71, 1.15, 0), [.08, .4, 2.6], PLK(shade(CW, .92)), rr);
    for (const s of [-1, 1]) add('box', Q(0, 1.15, s * 1.27), [1.34, .4, .08], PLK(shade(CW, .92)), rr);
    add('box', Q(0, .6, -.25), [1.95, .1, .1], CLN(DK), rr);
    for (const s of [-1, 1]) { add('cylh', Q(s * .9, .6, -.25), [1.2, .1, 1.2], CLN(DK), [0, r, PI / 2]); add('cylh', Q(s * .9, .6, -.25), [.95, .12, .95], CLN(shade(CW, .8)), [0, r, PI / 2]);
      for (let k = 0; k < 4; k++) add('box', Q(s * .97, .6, -.25), [.05, 1.0, .07], CLN(DK), [k * PI / 4, r, 0]); add('cyl6', Q(s * .99, .6, -.25), [.22, .1, .22], CLN([.2, .2, .22]), [0, r, PI / 2]); }
    for (const s of [-1, 1]) add('box', Q(s * .45, .52, 2.3), [.08, .08, 2.2], CLN(DK), [.33, r, 0]); // varais
    if (load === 'hay') { add('box', Q(0, 1.45, -.1), [1.3, .7, 2.3], CLN([.86, .72, .34]), rr); add('prism', Q(0, 2.0, -.1), [2.2, .4, 1.2], CLN([.9, .76, .38]), [0, r + PI / 2, 0]); }
    else if (load === 'barrel') for (const [a, b] of [[-.35, -.6], [.35, -.6], [0, .5]]) { add('cyl', Q(a, 1.32, b), [.62, .75, .62], PLK([.5, .32, .17])); add('cyl', Q(a, 1.32, b), [.66, .07, .66], CLN([.2, .2, .22])); }
    else for (const [a, b] of [[-.3, -.6], [.3, -.5], [0, .3], [-.25, .8]]) add('sphere', Q(a, 1.2, b), [.6, .5, .66], CLN([.88, .82, .66]), [0, r + a, 0]);
    obstacles.push({ x, z, r: 1.6 });
  };
  // canteiro arado com fileiras de trigo (tufos dourados) ou milho; cerca baixa de postes e travessas
  const cropBed = (x0, z0, W, D, kind) => {
    add('box', [x0, .05, z0], [W, .1, D], CLN([.42, .29, .17]));
    const nr = Math.floor(D / .95), sp = D / nr;
    for (let j = 0; j < nr; j++) { const z = z0 - D / 2 + (j + .5) * sp;
      add('prism', [x0, .19, z], [W - .3, .18, .5], CLN([.35, .23, .13]));
      for (let x = x0 - W / 2 + .4; x < x0 + W / 2 - .3; x += kind === 'corn' ? .7 : .36) { const px = x + (rng() - .5) * .14, pz = z + (rng() - .5) * .12;
        if (kind === 'corn') { const h = 1.5 + rng() * .5, g = shade([.3, .55, .2], .85 + rng() * .3);
          add('cyl6', [px, .28 + h / 2, pz], [.09, h, .09], g);
          for (let k = 0; k < 3; k++) { const a = rng() * PI * 2, y = .7 + k * .38 + rng() * .1; add('shard', [px + Math.cos(a) * .24, .28 + y, pz + Math.sin(a) * .24], [.16, .75, .05], shade(g, 1.08), [Math.sin(a) * .9, -a + PI / 2, -Math.cos(a) * .9]); }
          add('cyl6', [px + .08, .28 + h * .55, pz], [.12, .3, .12], CLN([.95, .8, .3]), [0, 0, -.3]); add('cone6', [px, .28 + h + .15, pz], [.14, .35, .14], CLN([.85, .72, .4]));
        } else { const h = .75 + rng() * .45, c = shade(pick([[.9, .74, .32], [.86, .66, .26], [.95, .82, .42], [.8, .7, .3]]), .9 + rng() * .2);
          for (let k = 0; k < 5; k++) { const a = k * 1.26 + rng() * .5, t = .08 + rng() * .12; add('blade', [px + Math.cos(a) * .06, .28 + h / 2, pz + Math.sin(a) * .06], [.07, h, .07], CLN(shade(c, .85)), [Math.sin(a) * t, 0, -Math.cos(a) * t]);
            add('shard', [px + Math.cos(a) * (.06 + h * t), .28 + h + .1, pz + Math.sin(a) * (.06 + h * t)], [.1, .3, .1], CLN(c), [Math.sin(a) * t, 0, -Math.cos(a) * t]); } }
      } }
  };
  const fence = (pts, gapAt) => { // cerca baixa: postes a cada ~2 m e duas travessas; gapAt = índice do vão (porteira)
    const FC = [.5, .35, .2];
    for (let i = 0; i < pts.length; i++) { const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 2)), ry = Math.atan2(bx - ax, bz - az);
      for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, px = ax + (bx - ax) * t0, pz = az + (bz - az) * t0;
        add('box', [px, .55, pz], [.16, 1.1, .16], CLN(shade(FC, .85)), [0, ry, 0]); add('box', [px, 1.12, pz], [.2, .06, .2], CLN(shade(FC, .7)), [0, ry, 0]);
        if (gapAt && gapAt[0] === i && gapAt[1] === k) continue;
        const mx = ax + (bx - ax) * (t0 + t1) / 2, mz = az + (bz - az) * (t0 + t1) / 2;
        for (const y of [.45, .85]) add('box', [mx, y, mz], [.06, .1, L / n + .1], CLN(shade(FC, .95 + y * .1)), [0, ry, 0]); } }
  };
  const scarecrow = (x, z, r) => { const Q = (a, y, b) => Q0(x, z, r, a, b, y), rr = [0, r, 0];
    add('box', Q(0, 1.15, 0), [.12, 2.3, .12], CLN(WOOD), rr); add('box', Q(0, 1.75, 0), [1.6, .1, .1], CLN(WOOD), rr);
    add('box', Q(0, 1.45, 0), [.62, .8, .34], CLN([.66, .24, .2]), rr); add('box', Q(0, 1.76, 0), [1.36, .24, .26], CLN([.66, .24, .2]), rr); add('box', Q(0, 1.12, .01), [.64, .1, .36], CLN([.3, .22, .14]), rr);
    for (const s of [-1, 1]) add('shard', Q(s * .82, 1.72, 0), [.2, .3, .2], CLN([.9, .78, .4]), [0, r, -s * PI / 2]);
    add('sphere', Q(0, 2.22, 0), [.42, .46, .42], CLN([.84, .74, .52])); add('cyl', Q(0, 2.45, 0), [.8, .05, .8], CLN([.86, .72, .36])); add('cone', Q(0, 2.62, 0), [.42, .36, .42], CLN([.82, .68, .32]));
    obstacles.push({ x, z, r: .4 }); };
  { // moinho de Aldoria com dois canteiros (trigo e milho), cerca, espantalho, carroça e fardos
    const [mx, mz] = LM.mill;
    windmill(mx, mz, -.35);
    cropBed(mx + 9.2, mz - 2.9, 6.4, 4.2, 'wheat'); cropBed(mx + 9.2, mz + 2.9, 6.4, 4.2, 'corn');
    fence([[mx + 5.5, mz - 5.5], [mx + 12.9, mz - 5.5], [mx + 12.9, mz + 5.5], [mx + 5.5, mz + 5.5]], [3, 2]);
    scarecrow(mx + 9.4, mz - 2.9, -.4);
    cart(mx + 3.6, mz - 4.6, .5, 'hay');
    for (const [dx, dz, a] of [[-3.4, 3.2, .3], [-4.2, 1.6, 1.4]]) add('cyl12', [mx + dx, .6, mz + dz], [1.2, 1.25, 1.2], CLN([.88, .74, .36]), [PI / 2, a, 0]);
    obstacles.push({ x: mx - 3.8, z: mz + 2.4, r: 1.4 });
  }
  { // Árvore Anciã na floresta
    const [tx, tz] = LM.ancient;
    add('cyl6', [tx, 4, tz], [3.4, 8, 3.4], [.32, .2, .12]); add('cone6', [tx, 1, tz], [6, 2, 6], [.3, .19, .11]);
    for (let k = 0; k < 7; k++) { const a = k / 7 * PI * 2 + rng(); add('sphere', [tx + Math.cos(a) * 3, 9 + rng() * 2, tz + Math.sin(a) * 3], [5, 3.6, 5], shade([.12, .36, .2], .8 + rng() * .3)); }
    for (let k = 0; k < 14; k++) { const a = rng() * 6.28; addG('sphere', [tx + Math.cos(a) * 4.5, 6 + rng() * 6, tz + Math.sin(a) * 4.5], [.18, .18, .18], [.6, 1, .6]); }
    obstacles.push({ x: tx, z: tz, r: 2.6 });
  }
  { // cemitério nas Ruínas
    const [gx, gz] = LM.grave;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { // lápides (arredondadas ou cruzes) com cova de terra à frente
      const x = gx + i * 2.1 + (rng() - .5) * .3, z = gz + j * 2.3, ry = .8 + (rng() - .5) * .3, tz = (rng() - .5) * .16, c = MAS(shade(STONE, .7 + rng() * .25)), Q = (a, y, b) => Q0(x, z, ry, a, b, y);
      if ((i + j) % 3) { add('box', Q(0, .5, 0), [.78, 1.0, .2], c, [0, ry, tz]); add('cylh', Q(-Math.sin(tz) * 1.0, 1.0, 0), [.78, .2, .78], c, [PI / 2, ry, tz]); }
      else { add('box', Q(0, .75, 0), [.16, 1.5, .14], c, [0, ry, tz]); add('box', Q(-Math.sin(tz) * 1.1, 1.1, 0), [.7, .14, .14], c, [0, ry, tz]); }
      add('box', Q(0, .08, 0), [.95, .16, .32], CLN(shade(STONE, .55)), [0, ry, 0]);
      add('sphere', Q(0, .02, .95), [.8, .26, 1.5], CLN([.3, .24, .18]), [0, ry, 0]); }
    for (let k = 0; k < 28; k++) { const a = k / 28 * PI * 2, b = (k + 1) / 28 * PI * 2, px = gx + 4 + Math.cos(a) * 7, pz = gz + 3.5 + Math.sin(a) * 6, qx = gx + 4 + Math.cos(b) * 7, qz = gz + 3.5 + Math.sin(b) * 6; // grade de ferro
      add('cyl6', [px, .7, pz], [.08, 1.4, .08], CLN([.15, .14, .16])); add('cone6', [px, 1.5, pz], [.14, .22, .14], CLN([.15, .14, .16]));
      if (k % 7 === 3) continue; const L = Math.hypot(qx - px, qz - pz), ry = Math.atan2(qx - px, qz - pz);
      for (const y of [.35, 1.15]) add('box', [(px + qx) / 2, y, (pz + qz) / 2], [.05, .06, L], CLN([.17, .16, .18]), [0, ry, 0]); }
    add('cyl6', [gx + 4, 2.5, gz - 3], [.9, 5, .9], DSTONE); addG('sphere', [gx + 4, 5.3, gz - 3], [.6, .6, .6], [.5, .9, .7]);
  }

  // ---------- lagoa no campo ----------
  add('cyl', [POND[0], .03, POND[1]], [POND[2] * 2, .08, POND[2] * 2], [.2, .46, .66], null, wt);
  for (let k = 0; k < 18; k++) { const a = k / 18 * PI * 2 + rng() * .2, rr_ = POND[2] + .2 + rng() * .5, s = .7 + rng() * .9; add('sphere', [POND[0] + Math.cos(a) * rr_, .3 * s, POND[1] + Math.sin(a) * rr_], [1.4 * s, .9 * s, 1.2 * s], shade(STONE, .85 + rng() * .3), [0, rng() * 6, 0]); }
  for (let k = 0; k < 28; k++) { const a = rng() * PI * 2, rr_ = POND[2] - .3 + rng() * 1.2, hh = 1.3 + rng() * 1.1; add('cyl6', [POND[0] + Math.cos(a) * rr_, hh / 2, POND[1] + Math.sin(a) * rr_], [.06, hh, .06], [.3, .5, .22], [rng() * .2 - .1, 0, rng() * .2 - .1]); add('cyl6', [POND[0] + Math.cos(a) * rr_, hh, POND[1] + Math.sin(a) * rr_], [.12, .45, .12], [.4, .25, .12]); }
  for (let k = 0; k < 10; k++) { const a = rng() * PI * 2, rr_ = rng() * (POND[2] - 1); add('cyl', [POND[0] + Math.cos(a) * rr_, .09, POND[1] + Math.sin(a) * rr_], [.7, .02, .7], [.25, .55, .25], null, wt); }
  obstacles.push({ x: POND[0], z: POND[1], r: POND[2] + .6 });

  // ---------- árvores / pedras / colunas ----------
  let rockCol = null;
  const tree = (x, z, kind, sc) => {
    if (kind === 'pine') {
      // tronco curto (só a base aparece sob a copa) + 4 camadas de cone sobrepostas, mais claras para cima
      add('cyl6', [x, .95 * sc, z], [.32 * sc, 1.9 * sc, .32 * sc], [.32, .2, .11]);
      const g = .85 + rng() * .3;
      for (let t = 0; t < 4; t++) add('cone6', [x, (1.75 + t * 1.02) * sc, z], [(2.65 - t * .52) * sc, (1.8 - t * .1) * sc, (2.65 - t * .52) * sc], shade([.1 + t * .014, .3 + t * .025, .18], g), [0, t * .55, 0]);
    } else if (kind === 'round') {
      add('cone6', [x, .45 * sc, z], [1.0 * sc, .9 * sc, 1.0 * sc], [.4, .27, .15]); add('cyl6', [x, 1.1 * sc, z], [.42 * sc, 2.2 * sc, .42 * sc], [.4, .27, .15]);
      const g = .85 + rng() * .3, hue = rng() * .12;
      add('sphere', [x, 3.0 * sc, z], [2.7 * sc, 2.0 * sc, 2.7 * sc], shade([.22 + hue, .52, .18], g));
      for (let k = 0; k < 4; k++) { const a = k * 1.6 + rng(); add('sphere', [x + Math.cos(a) * 1.0 * sc, (2.6 + rng() * .8) * sc, z + Math.sin(a) * 1.0 * sc], [1.6 * sc, 1.3 * sc, 1.6 * sc], shade([.26 + hue, .58, .2], g * (.9 + rng() * .25))); }
      if (rng() < .35) for (let k = 0; k < 3; k++) { const a = rng() * 6; add('sphere', [x + Math.cos(a) * 1.5 * sc, (2.8 + rng()) * sc, z + Math.sin(a) * 1.5 * sc], [.2, .2, .2], [.95, .25, .2]); }
    } else if (kind === 'dead') {
      add('cone6', [x, .5 * sc, z], [.9 * sc, 1 * sc, .9 * sc], [.3, .24, .24]); add('cyl6', [x, 1.4 * sc, z], [.3 * sc, 2.8 * sc, .3 * sc], [.3, .24, .24], [.05, 0, .06]);
      for (let k = 0; k < 3; k++) { const a = k * 2.1 + rng(); add('cyl6', [x + Math.cos(a) * .5 * sc, (2.2 + k * .35) * sc, z + Math.sin(a) * .5 * sc], [.12 * sc, 1.5 * sc, .12 * sc], [.28, .22, .22], [Math.sin(a) * .9, 0, -Math.cos(a) * .9]); }
    } else if (kind === 'column') {
      const h = 1.8 + rng() * 3.2, broken = rng() < .45;
      add('rbox', [x, .25, z], [1.6, .5, 1.6], DSTONE); add('cyl6', [x, .5 + h / 2, z], [1.1, h, 1.1], shade(STONE, .9 + rng() * .2), [0, rng(), 0]);
      if (!broken) { add('rbox', [x, .5 + h + .15, z], [1.5, .3, 1.5], DSTONE); } else { add('cyl6', [x + 1.3, .5, z + .4], [1.0, 1.2, 1.0], STONE, [0, 0, PI / 2]); add('rbox', [x + .6, .15, z + .5], [.5, .3, .5], DSTONE); }
    } else if (kind === 'cactus') {
      const gc = [.22, .5, .24]; add('cyl6', [x, 1.3 * sc, z], [.55 * sc, 2.6 * sc, .55 * sc], gc); add('sphere', [x, 2.65 * sc, z], [.55 * sc, .4 * sc, .55 * sc], gc);
      for (const sd of [-1, 1]) if (rng() < .8) { const h = (1 + rng() * .8) * sc; add('cyl6', [x + sd * .6 * sc, h + .5, z], [.32 * sc, .32 * sc, .32 * sc], gc, [0, 0, PI / 2]); add('cyl6', [x + sd * .82 * sc, h + .85 * sc, z], [.3 * sc, 1.2 * sc, .3 * sc], gc); }
      if (rng() < .4) addG('sphere', [x, 2.9 * sc, z], [.18, .12, .18], [1, .4, .7]);
    } else if (kind === 'palm') {
      const lean = (rng() - .5) * .5; add('cyl6', [x, 2.2 * sc, z], [.42 * sc, 4.4 * sc, .42 * sc], [.5, .36, .2], [0, 0, lean]);
      const tx = x - Math.sin(lean) * 2.2 * sc, ty = 4.5 * sc;
      for (let k = 0; k < 9; k++) { const a = k / 9 * PI * 2 + rng() * .3; add('box', [tx + Math.cos(a) * 1.15 * sc, ty - .12 - (k % 2) * .12, z + Math.sin(a) * 1.15 * sc], [2.5 * sc, .06, .5 * sc], shade([.18, .5, .2], .8 + rng() * .35), [0, -a, -.42]); }
      add('sphere', [tx, ty - .2, z], [.5, .5, .5], [.4, .26, .12]); add('sphere', [tx + .25, ty - .5, z + .1], [.3, .3, .3], [.55, .38, .15]);
    } else if (kind === 'pillar') {
      const h = 2.4 + rng() * 3.4; add('rbox', [x, h / 2, z], [1.8 + rng() * .8, h, 1.6 + rng() * .8], shade([.76, .52, .32], .85 + rng() * .3), [0, rng() * 3, 0]); add('rbox', [x, h + .2, z], [2.3, .4, 2.2], shade([.82, .58, .36], .9), [0, rng(), 0]);
    } else if (kind === 'snowpine') {
      add('cyl6', [x, .95 * sc, z], [.32 * sc, 1.9 * sc, .32 * sc], [.3, .2, .12]);
      for (let t = 0; t < 4; t++) { // camada verde + capa de neve na metade de cima (mesma inclinação, um pouco por fora)
        const w = (2.65 - t * .52) * sc, h = (1.8 - t * .1) * sc, cy = (1.75 + t * 1.02) * sc, ry = [0, t * .55, 0];
        add('cone6', [x, cy, z], [w, h, w], shade([.11, .28, .2], .85 + rng() * .3), ry);
        add('cone6', [x, cy + h * .5 - h * .32 + .03, z], [w * .7, h * .64, w * .7], [.88, .91, .96], ry); }
    } else if (kind === 'crystal') {
      // cristais de gelo discretos: sombreamento normal (sem brilho), baixos, base meio enterrada
      const cc = rng() < .5 ? [.6, .74, .86] : [.68, .72, .86]; for (let k = 0; k < 4; k++) { const hh = (.5 + rng() * .9) * sc, a = k * 1.7 + rng(); add('cone6', [x + Math.cos(a) * .32 * sc, hh * .4, z + Math.sin(a) * .32 * sc], [.36 * sc, hh, .36 * sc], shade(cc, .9 + k * .05), [Math.cos(a) * .3, rng() * 3, Math.sin(a) * .3]); }
    } else if (kind === 'obsidian') {
      for (let k = 0; k < 3; k++) { const hh = (1.4 + rng() * 3) * sc, a = k * 2.1 + rng(); add('cone6', [x + Math.cos(a) * .6 * sc, hh / 2, z + Math.sin(a) * .6 * sc], [.7 * sc, hh, .7 * sc], shade([.13, .1, .15], .8 + rng() * .5), [Math.cos(a) * .2, rng() * 3, Math.sin(a) * .2]); }
      if (rng() < .5) addG('sphere', [x, .25, z], [.4, .2, .4], [1, .4, .1]);
    } else if (kind === 'charred') {
      add('cone6', [x, .5 * sc, z], [.9 * sc, 1 * sc, .9 * sc], [.14, .1, .1]); add('cyl6', [x, 1.4 * sc, z], [.3 * sc, 2.8 * sc, .3 * sc], [.14, .1, .1], [.05, 0, .06]);
      for (let k = 0; k < 3; k++) { const a = k * 2.1 + rng(); add('cyl6', [x + Math.cos(a) * .5 * sc, (2.2 + k * .35) * sc, z + Math.sin(a) * .5 * sc], [.12 * sc, 1.5 * sc, .12 * sc], [.12, .09, .09], [Math.sin(a) * .9, 0, -Math.cos(a) * .9]); }
      if (rng() < .5) addG('sphere', [x, 2.4 * sc, z], [.2, .2, .2], [1, .45, .1]);
    } else if (kind === 'rock') {
      const t = rockCol ? shade(rockCol, .85 + rng() * .3) : rng() < .5 ? [.5, .5, .52] : [.45, .5, .42];
      add('sphere', [x, .45 * sc, z], [1.7 * sc, 1.1 * sc, 1.4 * sc], t, [0, rng() * 6, 0]); add('sphere', [x + .8 * sc, .25 * sc, z + .3 * sc], [.9 * sc, .6 * sc, .8 * sc], shade(t, 1.1), [0, rng() * 6, 0]);
    }
    obstacles.push({ x, z, r: kind === 'rock' || kind === 'crystal' || kind === 'obsidian' ? .8 * sc : kind === 'column' || kind === 'pillar' ? 1.1 : .5 * sc });
  };
  for (const v of VILLAGES) if (isTown(v)) townLayout(v);
  const inPond = (x, z, m) => Math.hypot(x - POND[0], z - POND[1]) < POND[2] + (m || 2);
  const CAMPS = VILLAGES.filter(v => v.theme === 'camp'), inCamp = (x, z, m) => CAMPS.some(c => Math.hypot(x - c.cx, z - c.cz) < c.r + (m || 0));
  // ---------- portais, posto avançado e vilas das outras regiões ----------
  const portal = v => {
    const [x, z] = v.portal, r = Math.atan2(v.cx - x, v.cz - z), rr = [0, r, 0];
    const col = v.theme === 'desert' ? [1, .75, .3] : v.theme === 'snow' ? [.5, .9, 1] : v.theme === 'volcano' ? [1, .45, .15] : [.6, .5, 1];
    for (const sd of [-1, 1]) {
      const q = lp(x, z, r, sd * 1.9, 0);
      add('rbox', [q[0], .35, q[1]], [1.3, .7, 1.3], DSTONE, rr); add('rbox', [q[0], 2.3, q[1]], [.85, 3.6, .85], STONE, rr); add('rbox', [q[0], 4.25, q[1]], [1.1, .35, 1.1], DSTONE, rr);
      addG('sphere', [q[0], 4.75, q[1]], [.38, .38, .38], col); obstacles.push({ x: q[0], z: q[1], r: .85 });
    }
    for (let k = 0; k <= 12; k++) { const a = PI * k / 12, q = lp(x, z, r, Math.cos(a) * 1.9, 0); add('rbox', [q[0], 4.4 + Math.sin(a) * 1.5, q[1]], [.62, .62, .62], k % 2 ? STONE : DSTONE, rr); }
    for (let k = 0; k < 16; k++) { const a = k / 16 * PI * 2, q = lp(x, z, r, Math.cos(a) * 1.45, 0); addG('sphere', [q[0], 3.0 + Math.sin(a) * 1.45, q[1]], [.14, .14, .14], col); }
    add('cyl', [x, .05, z], [3.4, .1, 3.4], shade(DSTONE, .8)); add('cyl', [x, .1, z], [3.0, .06, 3.0], shade(col, .45), null, wt);
    add('cyl', [x, 3.0, z], [2.7, .05, 2.7], col, [PI / 2, r, 0], wt);
  };
  const camp = v => {
    const cx = v.cx, cz = v.cz, TC = { aldoria: [[.6, .25, .2], [.25, .4, .6]], desert: [[.85, .6, .25], [.7, .25, .2]], snow: [[.3, .35, .55], [.55, .2, .2]], volcano: [[.3, .15, .12], [.2, .18, .2]] }[v.reg];
    add('cyl', [cx, .1, cz], [2.6, .2, 2.6], DSTONE);
    for (let k = 0; k < 9; k++) { const a = k / 9 * PI * 2; add('sphere', [cx + Math.cos(a) * 1.25, .22, cz + Math.sin(a) * 1.25], [.4, .3, .4], shade(STONE, .8 + rng() * .3)); }
    for (let k = 0; k < 3; k++) add('cyl6', [cx, .35, cz], [.2, 1.5, .2], [.3, .18, .1], [.9, k * 2.1, 0]);
    addG('sphere', [cx, .28, cz], [.9, .25, .9], [1, .32, .05]); addG('flame', [cx, .8, cz], [.85, 1.3, .85], [1, .4, .06]); addG('flame', [cx + .05, .72, cz - .05], [.5, 1.05, .5], [1, .78, .25], [0, 1.4, 0]);
    for (const [dx, dz, h] of [[.3, .1, .65], [-.25, .2, .55], [.02, -.32, .6]]) addG('flame', [cx + dx, .55, cz + dz], [.32, h, .32], [1, .55, .1], [0, dx * 9, 0]);
    obstacles.push({ x: cx, z: cz, r: 1.5 });
    const tent = (dx, dz, r, col) => {
      const x = cx + dx, z = cz + dz, Q = (a, y, b) => { const q = lp(x, z, r, a, b); return [q[0], y, q[1]]; }, rr = [0, r, 0];
      add('pyr', [x, 1.5, z], [4.6, 3.0, 4.0], col, [0, r + PI / 4, 0]); add('box', Q(0, .85, 1.55), [1.2, 1.5, .1], [.15, .1, .08], rr);
      add('cyl6', Q(0, 3.2, 0), [.1, 1.2, .1], WOOD); addG('sphere', Q(0, 3.9, 0), [.2, .2, .2], [1, .85, .4]);
      obstacles.push({ x, z, r: 2.1 });
    };
    tent(-5.4, -2.6, -PI / 2.5, TC[0]); tent(5.4, -2.6, PI / 2.5, TC[1]);
    for (const [dx, dz] of [[-5.6, 3.6], [5.8, 3.8]]) { add('rbox', [cx + dx, .45, cz + dz], [.9, .9, .9], [.45, .3, .16]); add('rbox', [cx + dx + .8, .35, cz + dz + .2], [.7, .7, .7], [.5, .35, .2]); add('cyl', [cx + dx - .4, .5, cz + dz + .9], [.7, 1, .7], [.4, .26, .14]); obstacles.push({ x: cx + dx + .3, z: cz + dz, r: 1.3 }); }
    for (let k = 0; k < 54; k++) {
      const a = k / 54 * PI * 2, gap = [0, PI / 2, PI].some(g => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < .27);
      if (gap) continue;
      const x = cx + Math.cos(a) * 8, z = cz + Math.sin(a) * 8;
      add('cyl6', [x, .8, z], [.16, 1.6, .16], WOOD); add('rbox', [x - Math.sin(a) * .45, 1.1, z + Math.cos(a) * .45], [.14, .12, .95], WOOD, [0, -a, 0]); add('rbox', [x - Math.sin(a) * .45, .6, z + Math.cos(a) * .45], [.14, .12, .95], WOOD, [0, -a, 0]);
      obstacles.push({ x, z, r: .5 });
    }
    for (const a of [PI / 4, 3 * PI / 4, 5 * PI / 4, 7 * PI / 4]) lamp(cx + Math.cos(a) * 7.2, cz + Math.sin(a) * 7.2);
    flagPole(cx + 3.0, cz - 6.0, 5.2, TC[1], [.95, .85, .5]);
    portal(v);
  };
  const arena = (bx, bz, col, kind) => {
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * PI * 2, x = bx + Math.cos(a) * 7.6, z = bz + Math.sin(a) * 7.6, h = 2.8 + (k % 3) * .7;
      if (kind === 'sand') { const SS = shade([.8, .66, .46], .92 + (k % 3) * .05); // pilar de arenito esculpido: plinto, fuste redondo com cinta entalhada, capitel
        add('box', [x, .3, z], [1.6, .6, 1.6], shade(SS, .85), [0, -a, 0]); add('cylh', [x, .6 + (h - .9) / 2, z], [1.0, h - .9, 1.0], SS);
        add('cylh', [x, .6 + (h - .9) * .62, z], [1.12, .3, 1.12], shade(SS, .7)); add('cylh', [x, h - .22, z], [1.2, .16, 1.2], shade(SS, .85)); add('box', [x, h - .05, z], [1.5, .3, 1.5], SS, [0, -a, 0]); }
      else if (kind === 'ice') addG('cone6', [x, h / 2, z], [1.0, h + .6, 1.0], [.6, .88, 1], [.06, -a, .05]);
      else add('cone6', [x, h / 2, z], [1.1, h + .8, 1.1], [.12, .1, .14], [.06, -a, .05]);
      addG('sphere', [x, h + .3, z], [.28, .28, .28], col); obstacles.push({ x, z, r: .8 });
    }
    if (kind === 'sand') { // arena redonda: borda de pedra, faixa brilhante, piso de areia batida e selo no centro
      add('cylh', [bx, .04, bz], [13, .08, 13], [.62, .5, .36]); addG('cylh', [bx, .05, bz], [11.2, .08, 11.2], col);
      add('cylh', [bx, .06, bz], [10.4, .08, 10.4], [.82, .68, .46]); add('cylh', [bx, .07, bz], [3.4, .06, 3.4], shade(col, .55)); add('cylh', [bx, .075, bz], [2.4, .06, 2.4], [.82, .68, .46]);
    } else { addG('cylh', [bx, .03, bz], [11, .04, 11], col); add('cylh', [bx, .035, bz], [9.2, .04, 9.2], shade(col, .22)); }
  };

  // arena do Guardião (pedras eretas + musgo luminoso) e do Colosso (círculo rúnico)
  { const [gx, gz] = BOSS_SPOT.guardian;
    for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2, x = gx + Math.cos(a) * 7.2, z = gz + Math.sin(a) * 7.2, h = 2.6 + (k % 3) * .6; add('rbox', [x, h / 2, z], [1.0, h, .8], [.45, .47, .44], [.08, -a, .06]); addG('sphere', [x, h * .6, z], [.2, .2, .2], [.5, 1, .6]); }
    addG('cyl', [gx, .03, gz], [10.5, .04, 10.5], [.2, .65, .35]); add('cyl', [gx, .035, gz], [8.8, .04, 8.8], [.1, .22, .12]); }
  { const [cx, cz] = BOSS_SPOT.colossus;
    for (let k = 0; k < 10; k++) { const a = k / 10 * PI * 2, x = cx + Math.cos(a) * 9, z = cz + Math.sin(a) * 9, h = k % 2 ? 4.5 : 3.2; add('rbox', [x, h / 2, z], [1.4, h, 1.4], [.4, .38, .45], [0, -a, 0]); addG('cone6', [x, h + .5, z], [.5, 1.0, .5], [.6, .35, 1]); }
    addG('cyl', [cx, .03, cz], [14, .04, 14], [.45, .2, .85]); add('cyl', [cx, .035, cz], [12.4, .04, 12.4], [.1, .08, .14]); addG('cyl', [cx, .04, cz], [8, .04, 8], [.45, .2, .85]); add('cyl', [cx, .045, cz], [7.0, .04, 7.0], [.1, .08, .14]); }

  for (const v of VILLAGES) { if (isTown(v)) portal(v); else camp(v); }
  arena(BOSS_SPOT.lich[0], BOSS_SPOT.lich[1], [.4, .65, 1], 'ob');
  arena(BOSS_SPOT.scorpqueen[0], BOSS_SPOT.scorpqueen[1], [.95, .7, .2], 'sand'); arena(BOSS_SPOT.pharaoh[0], BOSS_SPOT.pharaoh[1], [1, .85, .35], 'sand');
  arena(BOSS_SPOT.yetiking[0], BOSS_SPOT.yetiking[1], [.5, .85, 1], 'ice'); arena(BOSS_SPOT.frostwyrm[0], BOSS_SPOT.frostwyrm[1], [.6, .75, 1], 'ice');
  arena(BOSS_SPOT.ignar[0], BOSS_SPOT.ignar[1], [1, .4, .1], 'ob'); arena(BOSS_SPOT.demon[0], BOSS_SPOT.demon[1], [1, .15, .1], 'ob');

  // ---------- masmorras e salas das missões ----------
  { // Pirâmide Soterrada (deserto)
    const [px, pz] = LM.pyramid, SC = [.84, .68, .44];
    for (let k = 0; k < 5; k++) add('box', [px, .7 + k * 1.4, pz], [12 - k * 2.4, 1.4, 12 - k * 2.4], shade(SC, .9 + (k % 2) * .08));
    add('pyr', [px, 8.6, pz], [3.2, 2.4, 3.2], [.95, .8, .35], [0, PI / 4, 0]);
    add('box', [px, 1.4, pz + 6.05], [2.2, 2.8, .2], [.15, .1, .06]); add('box', [px, 3.0, pz + 6.1], [3, .4, .3], shade(SC, .8));
    for (const s of [-1, 1]) { add('rbox', [px + s * 2.4, 1.6, pz + 7.4], [1, 3.2, 1], shade(SC, .85)); addG('sphere', [px + s * 2.4, 3.5, pz + 7.4], [.4, .4, .4], [1, .7, .25]); obstacles.push({ x: px + s * 2.4, z: pz + 7.4, r: .8 }); }
    obstacles.push({ x: px, z: pz, r: 6.5 });
  }
  { // Cripta do Rei Caído (ruínas): mausoléu com colunas, escada e porta rúnica
    const [cx, cz] = LM.crypt, C = [.42, .4, .46], D = [.26, .24, .3];
    add('rbox', [cx, .3, cz - 3], [13, .6, 10], D); add('rbox', [cx, 2.6, cz - 4], [10, 4.2, 6.5], C); add('prism', [cx, 5.6, cz - 4], [11, 1.8, 7.4], D);
    for (let k = 0; k < 4; k++) { const x = cx - 4.2 + k * 2.8; add('cyl6', [x, 2.4, cz - .2], [.8, 4.2, .8], shade(C, 1.1)); add('rbox', [x, 4.6, cz - .2], [1.1, .3, 1.1], D); }
    add('box', [cx, 4.75, cz - .2], [10.6, .4, 1.2], D);
    for (let k = 0; k < 3; k++) add('box', [cx, .12 + k * .16, cz + 1.4 + k * .7], [4.4, .24 + k * .1, .7], shade(C, .9 - k * .05));
    add('box', [cx, 1.9, cz - .72], [2.2, 3, .12], [.08, .06, .1]); addG('box', [cx, 1.9, cz - .64], [1.6, 2.4, .05], [.55, .3, .9]);
    addG('sphere', [cx, 5.2, cz - .6], [.45, .45, .2], [.65, .35, 1]);
    obstacles.push({ x: cx - 3, z: cz - 4, r: 3.6 }, { x: cx + 3, z: cz - 4, r: 3.6 }, { x: cx, z: cz - 5, r: 3 });
    for (let k = 0; k < 4; k++) obstacles.push({ x: cx - 4.2 + k * 2.8, z: cz - .2, r: .55 });
    for (let k = 0; k < 10; k++) { const a = PI * .15 + k / 9 * PI * .7, x = cx + Math.cos(a) * 11, z = cz + 2 + Math.sin(a) * 9; add('rbox', [x, .6, z], [.8, 1.2, .25], shade(C, .7 + rng() * .3), [rng() * .2 - .1, a, 0]); obstacles.push({ x, z, r: .5 }); }
  }
  { // Torre Partida (ruínas): torre quebrada com brilho no topo
    const [tx, tz] = LM.lichtower, C = [.45, .42, .5];
    add('cyl6', [tx, 4, tz], [5.2, 8, 5.2], C); add('cyl6', [tx + .4, 9.6, tz], [4.6, 3.2, 4.6], shade(C, .9), [.08, 0, .1]);
    for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2; add('rbox', [tx + Math.cos(a) * 2.2, 11.6 + (k % 3) * .6, tz + Math.sin(a) * 2.2], [1, 1 + (k % 3) * .8, 1], shade(C, .8), [0, -a, 0]); }
    add('box', [tx, 1.4, tz + 2.6], [1.6, 2.6, .2], [.08, .06, .1]); addG('sphere', [tx, 13.4, tz], [.9, .9, .9], [.5, .9, .7]);
    for (let k = 0; k < 14; k++) { const a = rng() * PI * 2, r = 4.5 + rng() * 5; add('rbox', [tx + Math.cos(a) * r, .25, tz + Math.sin(a) * r], [.6 + rng(), .4 + rng() * .5, .6 + rng()], shade(C, .7 + rng() * .3), [rng(), rng() * 6, rng()]); }
    obstacles.push({ x: tx, z: tz, r: 2.9 });
  }
  { // Caverna Glacial (neve): rochedo com a boca da caverna, cristais e picos atrás
    const [ix, iz] = LM.icecave;
    for (const [dx, dz, w, h] of [[-6, -6, 12, 7], [6, -6, 11, 6], [0, -9, 14, 9], [-9, -1, 7, 4.5], [9, -1, 7, 4]]) { add('sphere', [ix + dx, h * .35, iz + dz], [w, h, w * .8], [.55, .6, .7], [0, rng() * 3, 0]); add('sphere', [ix + dx, h * .55, iz + dz - .5], [w * .8, h * .55, w * .62], [.93, .96, 1]); obstacles.push({ x: ix + dx, z: iz + dz, r: w * .42 }); }
    add('sphere', [ix, 1.4, iz - 3.2], [4.4, 3.6, 2.4], [.06, .07, .1]);
    for (let k = 0; k < 7; k++) { const a = rng() * PI, r = 4 + rng() * 4; addG('cone6', [ix + Math.cos(a) * r * 1.4, 1.1, iz + Math.sin(a) * r * .4 - 1], [.7, 2.2 + rng() * 2, .7], [.6, .88, 1], [rng() * .4 - .2, 0, rng() * .4 - .2]); }
    for (const [dx, dz, w, h] of [[-26, -30, 40, 34], [14, -38, 46, 40], [44, -22, 34, 26], [-52, -14, 30, 22]]) { const x = ix + dx, z = iz + dz; add('cone6', [x, h / 2 - 1, z], [w, h, w], [.6, .66, .78], [0, rng() * 3, 0]); add('cone6', [x, h * .78, z], [w * .42, h * .36, w * .42], [.96, .98, 1]); obstacles.push({ x, z, r: w * .42 }); }
  }
  { // Caldeira de Ignar (vulcão): cone do vulcão com lava no topo, lagos de lava e obsidiana
    const [vx, vz] = LM.caldera, X = vx - 36, Z = vz - 4;
    add('cone6', [X, 13, Z], [56, 28, 56], [.18, .13, .13], [0, .3, 0]); add('cone6', [X, 24.5, Z], [22, 7, 22], [.1, .08, .08], [0, .1, 0]);
    addG('cyl', [X, 27.4, Z], [9, .5, 9], [1, .4, .06]); addG('sphere', [X, 28, Z], [6, 2.4, 6], [1, .55, .12]);
    for (let k = 0; k < 6; k++) { const a = -.6 + k * .24; addG('box', [X + Math.cos(a) * 18, 9 - k * .2, Z + Math.sin(a) * 18], [1.2, 12, .5], [1, .38, .05], [0, -a, .95]); } // rios de lava
    obstacles.push({ x: X, z: Z, r: 26 });
    addG('cylh', [vx, .05, vz], [14, .1, 14], [1, .38, .06]); add('cylh', [vx, .04, vz], [16.5, .08, 16.5], [.12, .09, .1]); // lago redondo obstacles.push({ x: vx - 2, z: vz, r: 5.5 });
    for (let k = 0; k < 9; k++) { const a = k / 9 * PI * 2; tree(vx + Math.cos(a) * 9.6, vz + Math.sin(a) * 9.6, 'obsidian', .8 + rng() * .5); }
  }
  // covis de elite: anel de estacas com caveiras, totem brilhante e estandarte da zona
  const LAIR_C = { field: [.8, .55, .25], forest: [.4, .85, .4], ruins: [.7, .45, 1], dunes: [1, .7, .25], tundra: [.55, .85, 1], ashlands: [1, .4, .12] };
  for (const s of SITES) if (s.k === 'lair') {
    const col = LAIR_C[s.zone] || [1, .8, .4];
    for (let k = 0; k < 14; k++) { const a = k / 14 * PI * 2; if (Math.abs(Math.sin(a - .4)) < .2 && Math.cos(a - .4) > 0) continue; const x = s.x + Math.cos(a) * 9, z = s.z + Math.sin(a) * 9; add('cone6', [x, .9, z], [.35, 1.9, .35], [.32, .24, .16], [Math.cos(a) * .25, 0, -Math.sin(a) * .25]); add('sphere', [x, 2.0, z], [.32, .3, .32], [.88, .86, .78]); obstacles.push({ x, z, r: .4 }); }
    // totem entalhado (base de pedra, fuste afunilado, chifres, orbe) + estandarte da zona; chão pisado que se funde ao terreno
    add('cyl6', [s.x, .2, s.z], [1.2, .4, 1.2], DSTONE); add('tcw', [s.x, 1.9, s.z], [.62, 3.0, .62], [.3, .22, .15]); add('cyl6', [s.x, 3.45, s.z], [.78, .22, .78], [.22, .16, .1]);
    for (const sd of [-1, 1]) add('cone6', [s.x + sd * .45, 3.75, s.z], [.18, .8, .18], [.88, .86, .78], [0, 0, -sd * .7]);
    addG('sphere', [s.x, 3.95, s.z], [.6, .6, .6], col);
    flagPole(s.x + 1.6, s.z + .4, 4.4, shade(col, .55), [.92, .88, .78]);
    { const gc = groundColor(s.x, s.z, coastD(s.x, s.z)); clearing(s.x, s.z, 9.6, mix(shade(gc, .62), shade(col, .35), .25), 11 + s.x); }
    obstacles.push({ x: s.x, z: s.z, r: .8 });
    for (let k = 0; k < 6; k++) { const a = rng() * PI * 2, r = 3 + rng() * 4; add('cyl6', [s.x + Math.cos(a) * r, .12, s.z + Math.sin(a) * r], [.12, .9, .12], [.88, .86, .78], [0, rng() * 3, PI / 2]); }
  }

  // ---------- cenário por zona (com transição: perto da fronteira as duas zonas se misturam) ----------
  const EX = [[LM.camp[0], LM.camp[1], 9], [LM.mill[0] + 5, LM.mill[1], 10], [LM.ancient[0], LM.ancient[1], 7], [LM.grave[0] + 4, LM.grave[1] + 3, 10], [LM.pyramid[0], LM.pyramid[1], 12],
    [LM.crypt[0], LM.crypt[1] - 2, 15], [LM.lichtower[0], LM.lichtower[1], 12], [LM.icecave[0], LM.icecave[1] - 12, 30], [LM.caldera[0] - 20, LM.caldera[1], 46]];
  for (const s of SITES) if (s.k === 'lair') EX.push([s.x, s.z, 11]);
  for (const k in BOSS_SPOT) EX.push([BOSS_SPOT[k][0], BOSS_SPOT[k][1], 11]);
  const exOK = (x, z, m) => { for (const e of EX) if (Math.abs(x - e[0]) < e[2] + m && Math.hypot(x - e[0], z - e[1]) < e[2] + m) return false; return true; };
  const okAt = (x, z, m) => coastD(x, z) > 5 + m && !inTownSq(x, z, 3 + m) && !inCamp(x, z, 3 + m) && roadDist(x, z) > ROAD_W + .8 + m && !inPond(x, z, 2 + m) && exOK(x, z, m);
  const scat = (zid, perHa, fn, m) => { const g = zgrid(), n = Math.round(perHa * (g.area[zid] || 0) / 1e4); m = m || 0; let k = 0, t = 0; while (k < n && t++ < n * 8) { const p = sampleZone(zid, rng); if (!p || !okAt(p[0], p[1], m)) continue; fn(p[0], p[1]); k++; } };
  const tuft = (x, z, base, h0) => { const hh = h0 * (.7 + rng() * .8), g = .75 + rng() * .5; for (let k = 0; k < 3; k++) { const aa = rng() * PI * 2, d = .15 * k; add('blade', [x + Math.cos(aa) * d, hh * .5, z + Math.sin(aa) * d], [.12, hh * (.7 + rng() * .5), .12], shade(base, g * (.9 + rng() * .2)), [Math.cos(aa) * .35, 0, Math.sin(aa) * .35]); } };
  const bush = (x, z, c) => { for (let k = 0; k < 3; k++) add('sphere', [x + (k - 1) * .5, .4, z + (k % 2) * .3], [.9, .7, .85], shade(c, .85 + rng() * .3)); obstacles.push({ x, z, r: .9 }); };
  // campos
  scat('field', 165, (x, z) => tree(x, z, rng() < .7 ? 'round' : 'rock', .8 + rng() * .6));
  scat('field', 1550, (x, z) => tuft(x, z, [.3, .6, .2], .45), -1);
  scat('field', 650, (x, z) => { const c = pick([[1, 1, 1], [1, .85, .2], [1, .45, .65], [.65, .55, 1]]); add('cyl6', [x, .18, z], [.04, .36, .04], [.2, .5, .2]); add('sphere', [x, .4, z], [.16, .12, .16], c); }, -1);
  scat('field', 60, (x, z) => bush(x, z, [.22, .5, .2]));
  // floresta
  scat('forest', 215, (x, z) => tree(x, z, rng() < .88 ? 'pine' : 'rock', .8 + rng() * .6));
  scat('forest', 780, (x, z) => tuft(x, z, [.15, .4, .22], .7), -1);
  scat('forest', 23, (x, z) => bush(x, z, [.13, .36, .2]));
  scat('forest', 97, (x, z) => { if (rng() < .5) { const s = .5 + rng() * .8, gl_ = rng() < .35; add('cyl6', [x, .25 * s, z], [.18 * s, .5 * s, .18 * s], [.85, .8, .7]); add('sphere', [x, .55 * s, z], [.7 * s, .4 * s, .7 * s], gl_ ? [.3, .65, .95] : [.8, .15, .12], null, gl_ ? gl : mb); }
    else for (let k = 0; k < 5; k++) { const aa = k * 1.26; add('cone6', [x + Math.cos(aa) * .35, .3, z + Math.sin(aa) * .35], [.22, .9, .1], [.14, .42, .2], [Math.cos(aa) * 1.0, 0, Math.sin(aa) * 1.0]); } }, -1);
  scat('forest', 18, (x, z) => { add('cyl6', [x, .4, z], [.7, 3.2, .7], [.33, .22, .13], [0, rng() * 6, PI / 2]); obstacles.push({ x, z, r: 1.1 }); });
  // ruínas
  scat('ruins', 78, (x, z) => tree(x, z, rng() < .45 ? 'column' : rng() < .6 ? 'dead' : 'rock', .8 + rng() * .6));
  scat('ruins', 255, (x, z) => tuft(x, z, [.45, .38, .3], .45), -1);
  scat('ruins', 143, (x, z) => { if (rng() < .75) add('rbox', [x, .15, z], [.5 + rng() * .8, .3 + rng() * .4, .5 + rng() * .8], shade(DSTONE, .8 + rng() * .4), [rng(), rng() * 6, rng()]);
    else { const s = .6 + rng() * 1.1; for (let k = 0; k < 3; k++) addG('cone6', [x + (k - 1) * .3, .6 * s, z + (k % 2) * .25], [.35 * s, (1 + k * .5) * s, .35 * s], pick([[.55, .35, 1], [.4, .5, 1], [.8, .35, .95]]), [(k - 1) * .25, 0, (1 - k) * .2]); } }, -1);
  scat('ruins', 12, (x, z) => { const yw = rng() * 6; for (let k = 0; k < 4; k++) add('rbox', [x + Math.cos(yw) * (k - 1.5) * 1.1, .5 + (k % 2) * .5, z - Math.sin(yw) * (k - 1.5) * 1.1], [1.1, 1.0 + (k % 3) * .6, .6], shade(STONE, .85 + k * .05), [0, yw, 0]); obstacles.push({ x, z, r: 2.0 }); }, 1);
  // deserto
  rockCol = [.74, .56, .38];
  scat('dunes', 36, (x, z) => tree(x, z, 'cactus', .8 + rng() * .6)); scat('dunes', 11, (x, z) => tree(x, z, 'palm', .9 + rng() * .4));
  scat('dunes', 13, (x, z) => tree(x, z, 'rock', .8 + rng() * .8)); scat('dunes', 8.5, (x, z) => tree(x, z, 'pillar', 1)); scat('dunes', 6, (x, z) => tree(x, z, 'dead', .8 + rng() * .5));
  scat('dunes', 15, (x, z) => { const w = 6 + rng() * 6, h = 1.6 + rng() * 1.6, d = 5 + rng() * 5, c = shade([.86, .72, .46], .92 + rng() * .14); add('sphere', [x, -h * .36, z], [w, h, d], c, [0, rng() * 3, 0]); }, 2); // dunas baixas (≤ .5 m visível): entidades andam em y=0 e não podem sumir dentro delas
  scat('dunes', 360, (x, z) => { const hh = .4 * (.7 + rng() * .8); for (let k = 0; k < 3; k++) { const aa = rng() * 6.28; add('blade', [x + Math.cos(aa) * .15 * k, hh * .5, z + Math.sin(aa) * .15 * k], [.11, hh, .11], shade([.6, .5, .28], .8 + rng() * .4), [Math.cos(aa) * .3, 0, Math.sin(aa) * .3]); } }, -1);
  scat('dunes', 11, (x, z) => { add('sphere', [x, .25, z], [.45, .35, .5], [.9, .88, .8]); for (let k = 0; k < 4; k++) add('cyl6', [x + .5 + k * .25, .12, z - .4 + k * .3], [.07, .7, .07], [.88, .86, .78], [0, 0, PI / 2 + k * .1]); }, -1);
  // neve
  rockCol = [.56, .6, .68];
  scat('tundra', 62, (x, z) => tree(x, z, 'snowpine', .8 + rng() * .6)); scat('tundra', 14, (x, z) => tree(x, z, 'rock', .8 + rng() * .8)); scat('tundra', 11, (x, z) => tree(x, z, 'crystal', .8 + rng() * .8));
  scat('tundra', 26, (x, z) => { const w = 3 + rng() * 4, h = .9 + rng() * .8, d = 3 + rng() * 3, ry = rng() * 3; add('sphere', [x, -h * .22, z], [w, h, d], shade(groundColor(x, z, coastD(x, z)), 1.03), [0, ry, 0]); }, -1); // montes de neve rentes ao chão
  scat('tundra', 4.6, (x, z) => { const rr_ = 3 + rng() * 3; add('cyl', [x, .05, z], [rr_ * 2, .1, rr_ * 2], [.7, .88, 1], null, wt); }, 3);
  scat('tundra', 163, (x, z) => { const hh = .2 + rng() * .25, rx = rng() * .3, rz = rng() * .3; for (let k = 0; k < 3; k++) add('blade', [x + (k - 1) * .09, hh * (.42 + k * .05), z + (k % 2) * .08], [.09, hh * (.85 + k * .1), .09], shade([.5, .48, .42], .85 + k * .1), [rx - .15 + k * .15, k * 2, rz]); }, -1); // capim seco acinzentado (sem brilho)
  // vulcão
  rockCol = [.24, .19, .21];
  scat('ashlands', 26, (x, z) => tree(x, z, 'obsidian', .8 + rng() * .7)); scat('ashlands', 20, (x, z) => tree(x, z, 'charred', .8 + rng() * .6)); scat('ashlands', 18, (x, z) => tree(x, z, 'rock', .8 + rng() * .9));
  scat('ashlands', 6, (x, z) => { const rr_ = 2 + rng() * 2.4; addG('cyl', [x, .04, z], [rr_ * 2, .06, rr_ * 2], [1, .38, .06]); add('cyl', [x, .03, z], [rr_ * 2 + 1.2, .05, rr_ * 2 + 1.2], [.1, .08, .1]); obstacles.push({ x, z, r: rr_ * .8 }); }, 3);
  scat('ashlands', 15, (x, z) => add('sphere', [x, .1, z], [4 + rng() * 5, 1.2 + rng(), 4 + rng() * 4], [.2, .18, .19], [0, rng() * 3, 0]), 1);
  scat('ashlands', 137, (x, z) => { const hh = .2 + rng() * .35, e = rng(), rx = rng() * .3, rz = rng() * .3; for (let k = 0; k < 2; k++) add('blade', [x + k * .1, hh * .45, z - k * .07], [.1, hh * (1 - k * .2), .1], shade([.3, .22, .18], .8 + e * .4), [rx - k * .2, k * 2, rz]); if (e > .8) addG('sphere', [x + .15, .04, z + .1], [.16, .08, .16], [1, .42, .08]); }, -1); // capim queimado + brasa ocasional
  rockCol = null;

  // ---------- costa: palmeiras e pedras na praia, rochedos e falésias no mar ----------
  { const g = zgrid();
    for (let k = 0; k < g.C.length; k++) {
      const c = g.C[k]; if (c > 11 || c < -30) continue;
      const i = k % g.nx, j = (k - i) / g.nx, x = WB.x0 + (i + rng()) * g.S, z = WB.z0 + (j + rng()) * g.S, r = rng();
      if (c > 4) {
        if (r > .03 || !okAt(x, z, -4)) continue; const zid = zoneScore(x, z).a;
        if (zid === 'tundra') { rockCol = [.6, .64, .72]; tree(x, z, rng() < .5 ? 'rock' : 'snowpine', .7 + rng() * .5); }
        else if (zid === 'ashlands') { rockCol = [.2, .16, .17]; tree(x, z, rng() < .6 ? 'rock' : 'obsidian', .7 + rng() * .6); }
        else tree(x, z, rng() < .55 ? 'palm' : 'rock', .8 + rng() * .5);
        rockCol = null;
      } else if (c < -9 && r < .022) {
        const zid = zoneScore(x, z).a, tall = zid === 'tundra' || zid === 'ashlands', h = (tall ? 12 : 5) + rng() * (tall ? 20 : 9), w = (tall ? 12 : 7) + rng() * 8;
        const base = zid === 'tundra' ? [.58, .64, .74] : zid === 'ashlands' ? [.16, .12, .13] : zid === 'dunes' ? [.7, .52, .34] : [.42, .42, .44];
        for (let q = 0; q < 2 + (rng() * 2 | 0); q++) { const ox = (rng() - .5) * w * .7, oz = (rng() - .5) * w * .7, hh = h * (.6 + rng() * .4), ww = w * (.6 + rng() * .5);
          add('cone6', [x + ox, hh / 2 - 2, z + oz], [ww, hh, ww], shade(base, .85 + rng() * .3), [0, rng() * 3, 0], mt);
          if (zid === 'tundra') add('cone6', [x + ox, hh * .78 - 2, z + oz], [ww * .4, hh * .34, ww * .4], [.96, .98, 1], [0, 0, 0], mt); }
      }
    } }

  const fin = () => { const w = { chunks: mb.meshes(R.gl), reg: 'all' }; w.mtn = { chunks: mt.meshes(R.gl) }; w.glow = { chunks: gl.meshes(R.gl) }; w.water = { chunks: wt.meshes(R.gl) }; return w; };
  const wm = fin(); wm.regs = [wm]; wm.spin = spins;
  { // mar: disco plano que acompanha a câmera (o shader de água faz as ondinhas; a neblina esconde a borda)
    const P = [], N = [], C = [], I = [], RS = [0, 6, 14, 26, 44, 70, 105, 150, 210, 290, 380, 470], SEG = 64;
    P.push(0, 0, 0); N.push(0, 1, 0); C.push(.07, .25, .34);
    for (let r = 1; r < RS.length; r++) for (let k = 0; k < SEG; k++) { const a = k / SEG * PI * 2; P.push(Math.cos(a) * RS[r], 0, Math.sin(a) * RS[r]); N.push(0, 1, 0); C.push(.07, .25, .34); }
    for (let k = 0; k < SEG; k++) I.push(0, 1 + (k + 1) % SEG, 1 + k);
    for (let r = 1; r < RS.length - 1; r++) for (let k = 0; k < SEG; k++) { const a = 1 + (r - 1) * SEG + k, b = 1 + (r - 1) * SEG + (k + 1) % SEG, c = a + SEG, d = b + SEG; I.push(a, b, d, a, d, c); }
    wm.sea = new Mesh(R.gl, { p: new Float32Array(P), n: new Float32Array(N), c: new Float32Array(C), i: new Uint32Array(I) });
  }
  return wm;
}
const BOSS_SPOT = {};
for (const k in BOSSES) BOSS_SPOT[k] = BOSS_POS[k].slice();
