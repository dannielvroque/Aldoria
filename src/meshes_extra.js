'use strict';
/* ===== Primitivas extras: caixa arredondada (bevel suave) e cápsula ===== */
function mkRBox(r, subdiv) {
  // cubo de lado 1 com cantos/arestas arredondados (raio r, relativo ao lado)
  const b = new MB(), inn = .5 - r, k = subdiv || 2;
  const cs = [-.5]; for (let i = 1; i < k; i++) cs.push(-.5 + r * i / k); cs.push(-inn, inn); for (let i = k - 1; i >= 1; i--) cs.push(.5 - r * i / k); cs.push(.5);
  const n = cs.length;
  const faces = [[0, 1, 2, 1], [0, 1, 2, -1], [2, 1, 0, 1], [2, 1, 0, -1], [0, 2, 1, 1], [0, 2, 1, -1]]; // [eixo u, eixo v, eixo normal, sinal]
  for (const [au, av, an, sg] of faces) {
    const base = b.p.length / 3;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const p = [0, 0, 0]; p[au] = cs[i]; p[av] = cs[j]; p[an] = .5 * sg;
      const c = [Math.max(-inn, Math.min(inn, p[0])), Math.max(-inn, Math.min(inn, p[1])), Math.max(-inn, Math.min(inn, p[2]))];
      let d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]]; const l = Math.hypot(d[0], d[1], d[2]) || 1; d = [d[0] / l, d[1] / l, d[2] / l];
      b.v([c[0] + d[0] * r, c[1] + d[1] * r, c[2] + d[2] * r], d, W3);
    }
    // orientação: u x v deve apontar para +normal quando sinal = +1
    const flip = ((au + 1) % 3 === av) === (sg > 0) ? false : true;
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const a = base + j * n + i, bb = a + 1, c = a + n + 1, d = a + n;
      if (flip) b.i.push(a, c, bb, a, d, c); else b.i.push(a, bb, c, a, c, d); // faces para fora
    }
  }
  return b;
}
function mkCapsule(seg, rings, rad) { // altura total 1, raio rad (relativo ao diâmetro 1 => rad ≤ .5)
  const b = new MB(), h = 1 - 2 * rad;
  for (let y = 0; y <= rings * 2; y++) {
    const top = y <= rings, t = (top ? y : y - 1) / rings * Math.PI / 2 * (top ? 1 : 1);
    const ang = top ? y / rings * Math.PI / 2 : Math.PI / 2 + (y - rings) / rings * Math.PI / 2;
    for (let x = 0; x <= seg; x++) {
      const a = x / seg * Math.PI * 2, nx = Math.sin(ang) * Math.cos(a), ny = Math.cos(ang), nz = Math.sin(ang) * Math.sin(a);
      b.v([nx * rad, ny * rad + (top ? h / 2 : -h / 2), nz * rad], [nx, ny, nz], W3);
    }
  }
  for (let y = 0; y < rings * 2 + 1 - 1; y++) for (let x = 0; x < seg; x++) {
    const a = y * (seg + 1) + x, c = a + seg + 1; b.i.push(a, a + 1, c + 1, a, c + 1, c);
  }
  return b;
}
function mkTBox(k) { // caixa afunilada: topo largura 1, base largura k (altura 1)
  const b = new MB(), t = .5, d = .5 * k;
  const P8 = { a: [-t, .5, t], b: [t, .5, t], c: [t, .5, -t], d: [-t, .5, -t], e: [-d, -.5, d], f: [d, -.5, d], g: [d, -.5, -d], h: [-d, -.5, -d] };
  const face = (ids, n) => { const vs = ids.map(i => b.v(P8[i], n, W3)); b.quad(vs[0], vs[1], vs[2], vs[3]); };
  const sl = (1 - k) * .5;
  face(['e', 'f', 'b', 'a'], V.norm([0, sl, 1])); face(['g', 'h', 'd', 'c'], V.norm([0, sl, -1]));
  face(['f', 'g', 'c', 'b'], V.norm([1, sl, 0])); face(['h', 'e', 'a', 'd'], V.norm([-1, sl, 0]));
  face(['a', 'b', 'c', 'd'], [0, 1, 0]); face(['h', 'g', 'f', 'e'], [0, -1, 0]);
  return b;
}
function mkTorus(seg, tub, R0, r) { // anel plano no plano XZ (raio maior R0, espessura r)
  const b = new MB();
  for (let i = 0; i <= seg; i++) for (let j = 0; j <= tub; j++) {
    const u = i / seg * Math.PI * 2, v = j / tub * Math.PI * 2, n = [Math.cos(u) * Math.cos(v), Math.sin(v), Math.sin(u) * Math.cos(v)];
    b.v([Math.cos(u) * R0 + n[0] * r, n[1] * r, Math.sin(u) * R0 + n[2] * r], n, W3);
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < tub; j++) { const a = i * (tub + 1) + j, c = a + tub + 1; b.i.push(a, a + 1, c, a + 1, c + 1, c); }
  return b;
}
/* labareda: língua de fogo torcida (altura 1, base raio .5 em y=-.5, ponta em y=.5).
   Os anéis de cima levam azul negativo na cor (com vermelho positivo): o VS (engine.js) faz esses vértices tremularem. */
function mkFlame(seg) {
  const b = new MB(), RG = [[-.5, .5, 0, 0], [-.12, .4, .35, 0], [.2, .2, .8, 1], [.5, 0, 1.2, 1]], F = [1, 1, -1];
  for (const [y, r, tw, f] of RG) for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2 + tw, c = Math.cos(a), s = Math.sin(a); b.v([c * r + (f ? .06 * y : 0), y, s * r], V.norm([c, .4, s]), f ? F : W3); }
  for (let j = 0; j < RG.length - 1; j++) for (let i = 0; i < seg; i++) { const L = j * (seg + 1) + i, U = L + seg + 1; b.i.push(U, L + 1, L, U, U + 1, L + 1); }
  return b;
}
/* estandarte: pano em tiras verticais encostadas (x de 0 a 1, altura 1, espessura .04); tiras longe do mastro levam verde negativo -> ondulam no VS */
function mkCloth(n) {
  const b = new MB(), box = mkBox();
  for (let k = 0; k < n; k++) { const m = M.part([(k + .5) / n, 0, 0], [0, 0, 0], [0, 0, 0], [1 / n, 1, .04]); b.merge(box, m, k ? [1, -1, 1] : W3); }
  return b;
}
function registerExtraMeshes(R) {
  R.bm.flame = mkFlame(5); R.bm.cloth = mkCloth(5);
  R.bm.ring = mkTorus(36, 8, .5, .035); R.mesh.ring = new Mesh(R.gl, R.bm.ring);
  R.bm.tbox = mkTBox(.7); R.mesh.tbox = new Mesh(R.gl, R.bm.tbox);
  R.bm.tc = mkCyl(10, .5, .36); R.mesh.tc = new Mesh(R.gl, R.bm.tc);      // membro afunilado (largo em cima)
  R.bm.tcw = mkCyl(10, .34, .5); R.mesh.tcw = new Mesh(R.gl, R.bm.tcw);   // alargado embaixo (cano de bota, manopla)
  R.bm.shard = mkCyl(4, 0, .5); R.mesh.shard = new Mesh(R.gl, R.bm.shard); // espinho/lâmina de 4 faces
  R.bm.rbox = mkRBox(.2, 2); R.mesh.rbox = new Mesh(R.gl, R.bm.rbox);
  R.bm.rbox2 = mkRBox(.34, 2); R.mesh.rbox2 = new Mesh(R.gl, R.bm.rbox2);
  R.bm.capsule = mkCapsule(12, 5, .5); R.mesh.capsule = new Mesh(R.gl, R.bm.capsule);
  R.softBox = false; // ligado só ao desenhar personagens (game.js) // parts(): 'box' vira 'rbox' (use sharp:1 para manter aresta viva)
}

/* ===== Malhas orgânicas: sólidos de revolução com seção elíptica (corpo, membros, cabeça) ===== */
function mkLathe(rings, seg, wob) { // rings: [t(0 topo..1 base), rx, rz, oz]; altura 1; rx=.5 => diâmetro 1
  const b = new MB(), n = rings.length;
  const pos = (i, a) => { const r = rings[i], w = wob ? 1 + wob.a * r[0] * Math.cos(wob.k * a) : 1; return [Math.cos(a) * r[1] * w, .5 - r[0], (r[3] || 0) + Math.sin(a) * r[2] * w]; };
  for (let i = 0; i < n; i++) for (let x = 0; x <= seg; x++) {
    const a = x / seg * Math.PI * 2, p = pos(i, a), e = .01;
    const p1 = pos(i, a + e), p0 = pos(i, a - e), q1 = pos(Math.min(i + 1, n - 1), a), q0 = pos(Math.max(i - 1, 0), a);
    const tA = V.sub(p1, p0), tY = V.sub(q1, q0); let nn = V.cross(tA, tY); const l = Math.hypot(nn[0], nn[1], nn[2]);
    if (l < 1e-7) nn = [0, i === 0 ? 1 : -1, 0]; else { nn = [nn[0] / l, nn[1] / l, nn[2] / l]; if (nn[0] * Math.cos(a) + nn[2] * Math.sin(a) < 0 && Math.abs(nn[1]) < .9) nn = [-nn[0], -nn[1], -nn[2]]; }
    b.v(p, nn, W3);
  }
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < seg; x++) { const a = y * (seg + 1) + x, c = a + seg + 1; b.i.push(a, a + 1, c + 1, a, c + 1, c); }
  return b;
}
const LATHE = {
  head: [[0, 0, 0], [.04, .2, .2], [.1, .34, .35], [.2, .44, .46], [.32, .49, .5], [.45, .5, .5], [.58, .47, .49], [.7, .4, .47, .01], [.8, .31, .42, .03], [.9, .2, .3, .05], [.96, .11, .16, .06], [1, 0, 0, .06]],
  torsoM: [[0, .16, .15], [.05, .36, .3], [.13, .5, .44], [.3, .48, .5], [.5, .4, .42], [.68, .36, .38], [.85, .4, .4], [.96, .36, .36], [1, 0, 0]],
  torsoF: [[0, .16, .15], [.05, .34, .28], [.13, .46, .4], [.3, .44, .48], [.5, .36, .4], [.62, .31, .36], [.8, .42, .42], [.95, .4, .38], [1, 0, 0]],
  pelvis: [[0, .42, .4], [.35, .48, .46], [.75, .4, .4], [1, 0, 0]],
  arm1: [[0, .42, .4], [.15, .5, .5], [.45, .46, .46], [.8, .38, .38], [1, .34, .34]],
  arm2: [[0, .4, .4], [.18, .5, .48], [.6, .38, .36], [1, .28, .26]],
  hand: [[0, .3, .22], [.15, .5, .4], [.5, .46, .34], [.85, .3, .2], [1, 0, 0]],
  thigh: [[0, .46, .46], [.2, .5, .5], [.6, .44, .44], [1, .38, .38]],
  calf: [[0, .38, .4], [.2, .5, .5], [.55, .42, .42], [.9, .3, .3], [1, .28, .28]],
};
function mkSuperBox(seg, rings, e) { // caixa de cantos suaves (superelipsoide): |x|^e+|y|^e+|z|^e = 1
  const b = new MB(), pw = (v, k) => Math.sign(v) * Math.pow(Math.abs(v), k);
  for (let y = 0; y <= rings; y++) {
    const t = y / rings * Math.PI;
    for (let x = 0; x <= seg; x++) {
      const a = x / seg * Math.PI * 2, n = [Math.sin(t) * Math.cos(a), Math.cos(t), Math.sin(t) * Math.sin(a)];
      const k = Math.pow(Math.pow(Math.abs(n[0]), e) + Math.pow(Math.abs(n[1]), e) + Math.pow(Math.abs(n[2]), e), -1 / e), p = [n[0] * k, n[1] * k, n[2] * k];
      const g = [pw(p[0], e - 1), pw(p[1], e - 1), pw(p[2], e - 1)], l = Math.hypot(g[0], g[1], g[2]) || 1;
      b.v([p[0] / 2, p[1] / 2, p[2] / 2], [g[0] / l, g[1] / l, g[2] / l], W3);
    }
  }
  for (let y = 0; y < rings; y++) for (let x = 0; x < seg; x++) { const a = y * (seg + 1) + x, c = a + seg + 1; b.i.push(a, a + 1, c + 1, a, c + 1, c); }
  return b;
}
function mkPrism() { // telhado de duas águas: triângulo no plano YZ (base em y=-.5, cumeeira em y=.5), extrudado em X
  const b = new MB(), A = [-.5, -.5, -.5], B = [-.5, -.5, .5], C = [-.5, .5, 0], D = [.5, -.5, -.5], E = [.5, -.5, .5], F = [.5, .5, 0];
  const ccw = (p, q, r, n) => V.dot(V.cross(V.sub(q, p), V.sub(r, p)), n) > 0; // garante a ordem anti-horária vista de fora
  const tri = (p, q, r, n) => { if (!ccw(p, q, r, n)) [q, r] = [r, q]; const i = b.v(p, n, W3), j = b.v(q, n, W3), k = b.v(r, n, W3); b.i.push(i, j, k); };
  const quad = (p, q, r, s, n) => { if (!ccw(p, q, r, n)) [p, q, r, s] = [s, r, q, p]; const i = b.v(p, n, W3), j = b.v(q, n, W3), k = b.v(r, n, W3), l = b.v(s, n, W3); b.i.push(i, j, k, i, k, l); };
  const nz = V.norm([0, .5, 1]), nb = V.norm([0, .5, -1]);
  quad(B, E, F, C, nz); quad(D, A, C, F, nb); quad(A, D, E, B, [0, -1, 0]);
  tri(A, B, C, [-1, 0, 0]); tri(E, D, F, [1, 0, 0]);
  return b;
}
function registerOrganicMeshes(R) {
  R.bm.prism = mkPrism(); R.mesh.prism = new Mesh(R.gl, R.bm.prism);
  R.bm.sbox = mkSuperBox(24, 16, 7); R.mesh.sbox = new Mesh(R.gl, R.bm.sbox);
  for (const k in LATHE) { R.bm[k] = mkLathe(LATHE[k], 20); R.mesh[k] = new Mesh(R.gl, R.bm[k]); }
  R.bm.robe = mkLathe([[0, .3, .26], [.25, .34, .3], [.6, .42, .4], [1, .5, .5]], 28, { a: .05, k: 7 }); R.mesh.robe = new Mesh(R.gl, R.bm.robe);
  R.bm.cylh = mkCyl(20, .5, .5); R.mesh.cylh = new Mesh(R.gl, R.bm.cylh);
  // cenário (moinho, torres): cilindro/cone de 12 lados, octógono afunilado e base de torre em talude
  R.bm.cyl12 = mkCyl(12, .5, .5); R.bm.cone12 = mkCyl(12, 0, .5); R.bm.octt = mkCyl(8, .36, .5); R.bm.cyl12t = mkCyl(12, .42, .5);
  // indicadores no chão (aviso de golpe em área, alvo, sombra): disco e aros redondos de 64 lados
  R.bm.disc = mkCyl(64, .5, .5); R.mesh.disc = new Mesh(R.gl, R.bm.disc);
  R.bm.annulus = mkAnnulus(64, .45); R.mesh.annulus = new Mesh(R.gl, R.bm.annulus);
  R.bm.annulusT = mkAnnulus(64, .485); R.mesh.annulusT = new Mesh(R.gl, R.bm.annulusT);
}
function mkAnnulus(seg, rin) { // aro plano (diâmetro externo 1, interno 2*rin) no plano XZ, visível dos dois lados
  const b = new MB();
  for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); b.v([c * .5, 0, s * .5], [0, 1, 0], W3); b.v([c * rin, 0, s * rin], [0, 1, 0], W3); }
  for (let i = 0; i < seg; i++) { const o0 = i * 2, n0 = o0 + 1, o1 = o0 + 2, n1 = o0 + 3; b.i.push(n0, o1, o0, n0, n1, o1, n0, o0, o1, n0, o1, n1); }
  return b;
}
