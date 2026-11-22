'use strict';
/* ===== Modelos 3D montados por código (low-poly, originais) ===== */
const P = (m, p, s, c, x) => Object.assign({ m, p, s, c }, x || {});
const HERO_D = .14; // alongamento das pernas de jogador/NPC (stretchLegs(a, .14)); as pernas em loft já nascem nessa proporção
let LOFT_MODE = false; // ligado só ao montar monstros (mobParts): humanoid() usa membros em loft contínuo; jogador e NPCs seguem com as peças de revolução (stretchLegs, headScale e seatedParts dependem delas)
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const SKIN = [.93, .76, .6];
const GCOL = [[.55, .5, .45], [.62, .45, .3], [.68, .7, .75], [.3, .72, .78], [.95, .78, .3], [.85, .92, 1]];
const PI = Math.PI;

let CURLOOK = null; // aparência do jogador durante playerParts
const hexRgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const lookHair = lk => hexRgb(lk.hcx) || HAIR_COLORS[lk.hc] || HAIR_COLORS[0];
const lookScale = lk => lk ? (lk.g ? .965 : 1) * [.97, 1, 1.035][lk.b == null ? 1 : lk.b] : 1;
function hairParts(a, lk, c) {
  const hs = lk.hs, F = lk.g === 1; if (hs === 5) return;
  const cap = (y, sy) => a.push(P('sphere', [0, y, -.03], [.47, sy, .47], c));
  cap(hs === 4 ? 1.84 : 1.86, hs === 4 ? .28 : .34);
  a.push(P('box', [0, 1.96, .14], [.4, .09, .1], c));
  if (hs === 1) a.push(P('box', [0, F ? 1.46 : 1.52, -.2], [.46, F ? .9 : .78, .12], c), P('box', [-.23, 1.66, -.02], [.09, .5, .22], c), P('box', [.23, 1.66, -.02], [.09, .5, .22], c));
  if (hs === 2) a.push(P('box', [0, 1.7, -.3], [.14, .6, .14], c, { r: [.5, 0, 0], bob: .02 }), P('sphere', [0, 1.98, -.22], [.2, .2, .2], c));
  if (hs === 3) a.push(P('sphere', [0, 2.12, -.06], [.24, .24, .24], c), P('cyl', [0, 2.02, -.05], [.22, .05, .22], shade(c, .7)));
  if (hs === 4) for (let i = -2; i <= 2; i++) a.push(P('cone', [i * .08, 2.08, -.02], [.09, .26, .09], c, { r: [0, 0, -i * .2] }));
  if (hs === 6) for (const s of [-1, 1]) for (let i = 0; i < 4; i++) a.push(P('sphere', [s * .22, 1.72 - i * .15, .02 - i * .01], [.13, .15, .13], i % 2 ? shade(c, .8) : c, { bob: .006 }));
  if (hs === 7) for (let i = 0; i < 5; i++) a.push(P('cone', [0, 2.06 + (i === 2 ? .04 : 0), .15 - i * .1], [.07, .24 + (i === 2 ? .06 : 0), .1], c, { r: [(i - 2) * .12, 0, 0] }));
  if (hs === 8) a.push(P('sphere', [0, 1.78, -.05], [.53, .34, .52], c), P('box', [0, 1.9, .17], [.42, .1, .08], shade(c, 1.1)));
  if (hs === 9) a.push(P('box', [.08, 1.93, .15], [.44, .1, .14], c, { r: [.1, 0, -.35] }), P('box', [-.2, 1.76, .06], [.08, .34, .2], c), P('box', [0, 1.42, -.2], [.4, F ? .62 : .4, .1], shade(c, .92)));
  if (hs === 10) for (const s of [-1, 1]) a.push(P('sphere', [s * .26, 1.92, -.04], [.15, .15, .15], shade(c, 1.15)), P('box', [s * .29, 1.66, -.05], [.1, .5, .1], c, { r: [0, 0, -s * .12], bob: .015 }), P('sphere', [s * .3, 1.4, -.05], [.12, .12, .12], c));
  if (hs === 11) for (const [x, y, z, r] of [[.2, 1.94, -.04, .22], [-.2, 1.94, -.04, .22], [0, 2.04, -.12, .26], [.24, 1.8, -.16, .2], [-.24, 1.8, -.16, .2], [0, 1.82, -.26, .24], [.1, 1.98, .12, .15], [-.12, 1.97, .1, .14]]) a.push(P('sphere', [x, y, z], [r, r, r], c));
}
/* rosto: sobrancelhas, nariz, boca, marcas, barba */
function faceParts(a, lk, SK, hc, EC) {
  const F = lk && lk.g === 1, bd = lk ? lk.bd | 0 : 0, fc = lk ? lk.fc | 0 : 0;
  const dk = shade(SK, .8), brow = shade(hc, .75);
  const my = bd >= 3 ? .243 : bd === 1 || bd === 4 ? .222 : .208;
  a.push(P('sphere', [0, 1.74, .214], [.055, .09, .07], shade(SK, .95)), P('sphere', [0, 1.712, .222], [.075, .035, .05], shade(SK, .9)));
  a.push(P('sphere', [0, 1.672, my], [F ? .1 : .11, .028, .03], F ? [.78, .3, .36] : [.55, .26, .24]));
  for (const s of [-1, 1]) {
    a.push(P('sphere', [s * .09, F ? 1.872 : 1.862, .203], [.12, .025, .035], brow, { r: [0, 0, s * (F ? .12 : -.14)] }));
    a.push(P('sphere', [s * .09, 1.8, .2], [F ? .1 : .09, F ? .072 : .062, .035], [.95, .95, .96]), P('sphere', [s * .09 - s * .004, 1.8, .214], [.056, .058, .02], EC));
    a.push(P('sphere', [s * .09 - s * .004, 1.8, .222], [.028, .03, .01], [.02, .02, .03]), P('sphere', [s * .09 + s * .012, 1.812, .226], [.014, .014, .008], [1, 1, 1], { e: 1 }));
    a.push(P('sphere', [s * .09, 1.83, .199], [F ? .11 : .1, .03, .035], shade(SK, .88))); // pálpebra
    if (F) a.push(P('sphere', [s * .09, 1.838, .21], [.12, .014, .025], [.05, .04, .05]));
  }
  if (fc === 1) a.push(P('box', [-.09, 1.8, .226], [.018, .17, .015], [.72, .26, .26], { r: [0, 0, .45] }));
  if (fc === 2) for (const s of [-1, 1]) a.push(P('box', [s * .09, 1.738, .214], [.12, .03, .02], [.8, .12, .12]), P('box', [s * .15, 1.77, .2], [.03, .1, .02], [.9, .9, .85]));
  if (fc === 3) for (const s of [-1, 1]) a.push(P('box', [s * .15, 1.74, .18], [.025, .09, .02], [.3, .95, 1], { e: 1 }), P('box', [s * .15, 1.7, .18], [.07, .025, .02], [.3, .95, 1], { e: 1 }), P('box', [0, 1.93, .206], [.03, .06, .02], [.3, .95, 1], { e: 1 }));
  if (fc === 4) for (const [x, y] of [[-.13, 1.74], [-.09, 1.72], [-.05, 1.735], [.05, 1.735], [.09, 1.72], [.13, 1.74]]) a.push(P('box', [x, y, .214], [.018, .018, .015], shade(SK, .62)));
  if (fc === 5) for (const s of [-1, 1]) a.push(P('box', [s * .09, 1.8, .198], [.15, .115, .03], [.22, .1, .32]));
  const bc = hc;
  if (bd === 1) a.push(P('sphere', [0, 1.645, .02], [.385, .2, .37], mix(SK, bc, .6)));
  if (bd === 2) a.push(P('sphere', [0, 1.6, .13], [.13, .2, .12], bc), P('box', [0, 1.667, .222], [.16, .035, .05], bc));
  if (bd === 3) a.push(P('sphere', [0, 1.615, .04], [.4, .27, .39], bc), P('cone', [0, 1.45, .1], [.24, .26, .18], bc, { r: [PI, 0, 0] }));
  if (bd === 4) a.push(P('box', [0, 1.69, .225], [.17, .04, .05], bc), P('cone', [-.09, 1.665, .225], [.04, .1, .04], bc, { r: [PI, 0, 0] }), P('cone', [.09, 1.665, .225], [.04, .1, .04], bc, { r: [PI, 0, 0] }));
  if (bd === 5) a.push(P('sphere', [0, 1.615, .04], [.4, .27, .39], bc), P('box', [0, 1.4, .16], [.1, .42, .1], bc, { bob: .01 }), P('sphere', [0, 1.18, .16], [.11, .11, .11], [.95, .8, .3]));
}
function humanoid(o) {
  const L = o.legs !== false, SK = CURLOOK ? SKIN_TONES[CURLOOK.sk] : (o.skin || SKIN), F = !!(CURLOOK && CURLOOK.g === 1);
  const bw = CURLOOK ? [.9, 1, 1.12][CURLOOK.b == null ? 1 : CURLOOK.b] : 1, tw = (F ? .5 : .56) * bw, aw = (F ? .15 : .17) * (bw > 1 ? 1.08 : bw < 1 ? .92 : 1), lw = (F ? .19 : .2) * bw;
  const hc = CURLOOK ? lookHair(CURLOOK) : (o.hair || [.3, .2, .12]);
  const a = [];
  // corpo orgânico: superfícies de revolução com seção elíptica (sem blocos)
  if (L) for (const s of [-1, 1]) {
    const ph = s < 0 ? 0 : PI, x = s * (F ? .15 : .16), K = { sw: .9, ph };
    if (LOFT_MODE || o.loft) { // perna: coxa, canela e bota em lofts contínuos. Jogador/NPC (o.loft): já na proporção esticada (stretchLegs pula as peças `ns`) e etiquetadas para o cavaleiro sentado (seatedParts)
      const hero = !!o.loft, Y = hero ? (.88 + HERO_D) / .88 : 1, hip = [x, .88 * Y, 0], T = hero ? { leg: 'thigh', ns: 1 } : {}, Cf = hero ? { leg: 'calf', ns: 1 } : {};
      const yy = v => v * Y;
      a.push(geoP(mkLoft([[x, yy(.93), 0, lw * .86, lw * .94], [x, yy(.74), .01, lw * .78, lw * .84], [x, yy(.56), -.005, lw * .64, lw * .7]], { sides: 8, sub: 3 }), o.pants, hip, Object.assign({}, K, T)));
      a.push(geoP(mkLoft([[x, yy(.6), -.005, lw * .62, lw * .68], [x, yy(.44), -.01, lw * .55, lw * .6], [x, yy(.3), 0, lw * .5, lw * .54]], { sides: 8, sub: 3 }), shade(o.pants, .94), hip, Object.assign({}, K, Cf)));
      a.push(geoP(mkLoft([[x, yy(.34), 0, lw * .53, lw * .57], [x, yy(.16), .01, lw * .55, lw * .53], [x, yy(.07), .12, lw * .52, lw * .36], [x, yy(.03), .26, lw * .42, lw * .22]], { sides: 8, sub: 2 }), o.boots, hip, Object.assign({}, K, Cf)));
      continue;
    }
    a.push(P('thigh', [x, .88, 0], [lw + .1, .5, lw + .11], o.pants, Object.assign({ o: [0, -.22, 0] }, K)));
    a.push(P('sphere', [x, .88, 0], [lw + .02, .1, lw + .03], shade(o.pants, .95), Object.assign({ o: [0, -.45, .02] }, K))); // joelho
    a.push(P('calf', [x, .88, 0], [lw + .03, .44, lw + .05], shade(o.pants, .92), Object.assign({ o: [0, -.64, -.01] }, K)));
    a.push(P('cylh', [x, .88, 0], [lw + .04, .2, lw + .05], o.boots, Object.assign({ o: [0, -.73, 0] }, K))); // cano da bota
    a.push(P('sphere', [x, .88, 0], [lw + .02, .13, .34], o.boots, Object.assign({ o: [0, -.83, .07] }, K))); // pé
    a.push(P('cylh', [x, .88, 0], [lw + .03, .03, .3], shade(o.boots, .6), Object.assign({ o: [0, -.875, .06] }, K))); // sola
  }
  const TW = (F ? .6 : .7) * bw, TD = F ? .33 : .37;
  a.push(P(F ? 'torsoF' : 'torsoM', [0, 1.26, 0], [TW, .76, TD], o.top));
  if (!F) a.push(P('sphere', [0, 1.43, .06], [TW * .78, .26, TD * .78], shade(o.top, 1.03))); // peitoral
  a.push(P('pelvis', [0, .95, 0], [(F ? .62 : .58) * bw, .3, F ? .36 : .35], o.pants || shade(o.top, .7)));
  a.push(P('cylh', [0, 1.0, 0], [(F ? .58 : .6) * bw, .085, F ? .37 : .39], o.belt || shade(o.top, .6)));
  a.push(P('cylh', [0, 1.6, 0], [.15, .18, .15], shade(SK, .96))); // pescoço
  a.push(P('head', [0, 1.78, 0], [F ? .4 : .42, F ? .45 : .46, F ? .41 : .43], SK));
  a.push(P('sphere', [-.205, 1.77, -.01], [.05, .09, .05], shade(SK, .94)), P('sphere', [.205, 1.77, -.01], [.05, .09, .05], shade(SK, .94)));
  if (CURLOOK) hairParts(a, CURLOOK, hc); else if (o.hair) a.push(P('sphere', [0, 1.86, -.03], [.46, .34, .46], o.hair));
  for (const s of [-1, 1]) { // ombro, braço, antebraço e mão
    const ph = s < 0 ? PI : 0, K = { sw: .8, ph, at: s > 0 ? 1.5 : 0 }, sl = o.sleeve || o.top;
    if (LOFT_MODE || o.loft) { // braço: ombro, braço e antebraço num loft contínuo; a mão segue como peça própria (stretchLegs sobe o pivô e a geometria vai junto)
      const r1 = (aw + .12) / 2, r2 = (aw + .07) / 2, r3 = (aw + .03) / 2;
      a.push(geoP(mkLoft([[s * .38, 1.58, 0, r1, r1], [s * .38, 1.42, 0, r1 * .92, r1 * .92], [s * .39, 1.22, .01, r2, r2], [s * .4, 1.0, .02, r3, r3]], { sides: 8, sub: 2 }), sl, [s * .38, 1.52, 0], K));
      a.push(P('hand', [s * .38, 1.52, 0], [aw - .03, .17, aw - .05], SK, Object.assign({ o: [0, -.74, .01] }, K)));
      continue;
    }
    a.push(P('sphere', [s * .38, 1.55, 0], [aw + .1, aw + .08, aw + .1], sl, Object.assign({ o: [0, -.03, 0] }, K)));
    a.push(P('arm1', [s * .38, 1.52, 0], [aw + .08, .4, aw + .07], sl, Object.assign({ o: [0, -.2, 0] }, K)));
    a.push(P('arm2', [s * .38, 1.52, 0], [aw + .05, .33, aw + .04], shade(sl, .9), Object.assign({ o: [0, -.52, .01] }, K)));
    a.push(P('hand', [s * .38, 1.52, 0], [aw - .03, .17, aw - .05], SK, Object.assign({ o: [0, -.74, .01] }, K)));
  }
  const EC = CURLOOK ? EYE_COLORS[CURLOOK.ec] : [.1, .1, .12];
  faceParts(a, CURLOOK, SK, hc, EC);
  return a;
}
const R_ = (extra) => Object.assign({ sw: .8, ph: 0, at: 1.5 }, extra || {}); // acompanha o braço direito
const L_ = (extra) => Object.assign({ sw: .8, ph: PI }, extra || {}); // acompanha o braço esquerdo
const J_R = [.38, 1.52, 0], J_L = [-.38, 1.52, 0];

const playerCache = {};
const LOOK_KEYS = ['g', 'hs', 'hc', 'hcx', 'ec', 'sk', 'bd', 'fc', 'b'];
/* o = R^T * d: devolve o deslocamento local 'o' que, depois da rotação R (Ry*Rx*Rz, igual a M.part), cai em d.
   Assim a peça gira em torno do próprio centro e continua presa à mão. */
function rotOff(d, r) {
  const cx = Math.cos(r[0]), sx = Math.sin(r[0]), cy = Math.cos(r[1]), sy = Math.sin(r[1]), cz = Math.cos(r[2]), sz = Math.sin(r[2]);
  const r00 = cy * cz + sy * sx * sz, r01 = -cy * sz + sy * sx * cz, r02 = sy * cx;
  const r10 = cx * sz, r11 = cx * cz, r12 = -sx;
  const r20 = -sy * cz + cy * sx * sz, r21 = sy * sz + cy * sx * cz, r22 = cy * cx;
  return [r00 * d[0] + r10 * d[1] + r20 * d[2], r01 * d[0] + r11 * d[1] + r21 * d[2], r02 * d[0] + r12 * d[1] + r22 * d[2]];
}
const PA = (m, J, d, s, c, r, x) => P(m, J, s, c, Object.assign({ o: rotOff(d, r), r }, x));
// paletas por grau: 0 pano, 1 couro, 2 aço, 3 rúnico, 4 ouro, 5 celeste
/* cor da armadura por classe e grau, seguindo o material do nome (CLS_ARM_MAT) e o ícone (ARMART em art.js):
   Vanguarda ferro velho/ferro/aço/aço rúnico/ouro/aço celeste; Arcanista linho/lã/seda/seda rúnica/seda real/éter;
   Caçadora couro cru/batido/curtido/rúnico/real/celeste; Invocador peles/presas/escamas/ossos/peles reais/penas */
const ARM_CLS_COL = {
  vanguard: [[.44, .4, .37], [.52, .54, .58], [.7, .74, .8], [.32, .42, .54], [.9, .7, .26], [.82, .88, 1]],
  arcanist: [[.84, .78, .63], [.4, .37, .68], [.28, .25, .64], [.16, .4, .56], [.94, .89, .73], [.9, .92, 1]],
  huntress: [[.7, .55, .38], [.55, .36, .2], [.38, .22, .13], [.26, .31, .23], [.48, .27, .14], [.84, .93, .88]],
  tamer: [[.55, .42, .28], [.5, .37, .24], [.33, .5, .3], [.87, .83, .74], [.86, .71, .36], [.9, .93, 1]],
};
const ARM_COL = [[.78, .72, .58], [.62, .42, .25], [.62, .66, .74], [.25, .62, .7], [.92, .74, .25], [.66, .76, .92]];
const WPN_COL = [[.62, .52, .36], [.72, .74, .8], [.5, .68, .95], [.3, .85, .8], [.98, .82, .3], [.7, .84, .96]];
const RAR_GLOW = [null, [.45, .9, .45], [.35, .65, 1], [.82, .42, 1], [1, .72, .22]];


/* camada de estilo "dark fantasy": capa, ombreiras, detalhes dourados e adereços por classe */
/* capa: 5 faixas que se abrem para baixo e para trás (cai como pano), com barra dourada; balança (bob) mais perto da barra */
function capeParts(a, c, gold) {
  for (let k = 0; k < 5; k++) {
    const y = 1.5 - k * .24, w = .5 + k * .085, z = -.17 - k * .022 - (k > 2 ? (k - 2) * .02 : 0);
    a.push(P('box', [0, y, z], [w, .27, .035], k % 2 ? shade(c, .92) : c, { r: [.07 * k, 0, 0], bob: .012 + k * .011 }));
  }
  a.push(P('box', [0, .3, -.3], [.92, .035, .04], gold, { r: [.3, 0, 0], bob: .06 }));
}
/* asas de penas (fase >= Ancestral): duas fileiras de penas alongadas em leque a partir das costas; batem de leve (fl) */
function angelWings(a) {
  for (const s of [-1, 1]) {
    const sh = [s * .26, 1.5, -.24];
    for (let row = 0; row < 2; row++) for (let k = 0; k < 6; k++) {
      const ang = .12 + k * .17 + row * .08, L = (.62 + k * .075) * (row ? .78 : 1);
      a.push(P('sphere', sh, [.2 - row * .03, L, .04], row ? [.66, .78, .95] : [.8, .88, .98], { e: .25, o: [0, L * .5, -row * .035], r: [0, 0, -s * ang], fl: s * .18 }));
    }
  }
}
function styleLayer(a, cls, ag, ac, hg, SKc, arl) {
  const gold = [.95, .78, .3], capeC = { vanguard: [.55, .1, .12], arcanist: [.14, .2, .62], huntress: [.13, .38, .2], tamer: [.4, .18, .6] }[cls] || [.4, .3, .3];
  capeParts(a, capeC, gold);
  for (const s of [-1, 1]) a.push(P('sphere', [s * .22, 1.58, -.12], [.09, .09, .06], gold));
  a.push(P('box', [0, .95, .17], [.17, .12, .05], gold), P('sphere', [0, .95, .2], [.07, .07, .04], [.3, .65, 1], { e: 1 }), P('box', [0, 1.57, 0], [.5, .05, .32], gold));
  const hood = (c) => { if (hg < 0) a.push(P('sphere', [0, 1.8, -.11], [.5, .5, .44], c), P('cone', [0, 1.78, -.3], [.3, .5, .3], c, { r: [-1.3, 0, 0] })); };
  if (cls === 'vanguard') {
    a.push(P('box', [0, .66, .19], [.3, .68, .04], [.62, .12, .14]), P('box', [0, .31, .2], [.32, .04, .04], gold));
    if (ag >= 0) for (const s of [-1, 1]) { a.push(P('sphere', [s * .42, 1.63, 0], [.34, .24, .38], ac, { rg: .35, mt: .8 }), P('sphere', [s * .42, 1.66, 0], [.26, .17, .3], shade(ac, 1.1), { rg: .35, mt: .8 }), P('ring', [s * .42, 1.6, 0], [.34, .34, .38], gold, { r: [0, 0, s * .35] }), P('cone', [s * .48, 1.82, 0], [.08, .2, .08], shade(ac, 1.2), { r: [0, 0, -s * .5] })); }
  } else if (cls === 'huntress') {
    for (const s of [-1, 1]) a.push(P('cone', [s * .23, 1.83, -.02], [.07, .3, .07], SKc, { r: [0, 0, -s * 1.15] }));
    hood(capeC);
    a.push(P('cyl', [.15, 1.3, -.3], [.14, .7, .14], [.4, .26, .14], { r: [0, 0, .3] }));
    for (let k = 0; k < 3; k++) a.push(P('cone', [.26 + k * .02, 1.72 + k * .02, -.3], [.05, .16, .05], [.9, .85, .6], { r: [0, 0, .3] }));
    if (ag >= 0) for (const s of [-1, 1]) a.push(P('sphere', [s * .4, 1.6, 0], [.25, .14, .27], [.3, .2, .12]));
  } else if (cls === 'arcanist') {
    hood(capeC);
    for (const s of [-1, 1]) a.push(P('sphere', [s * .4, 1.6, 0], [.27, .16, .29], shade(capeC, 1.25)), P('sphere', [s * .4, 1.7, .05], [.07, .07, .07], [.4, .75, 1], { e: 1 }));
    a.push(P('sphere', J_L, [.2, .2, .2], [.4, .75, 1], L_({ o: [0, -.66, .22], e: 1.2, bob: .03 })), P('cyl', J_L, [.34, .015, .34], [.5, .85, 1], L_({ o: [0, -.66, .22], e: 1, r: [1.1, 0, .4] })));
  } else if (cls === 'tamer') {
    hood(capeC);
    a.push(P('sphere', [-.41, 1.62, 0], [.27, .18, .29], [.9, .88, .8]), P('cone', [-.5, 1.84, 0], [.09, .26, .09], [.95, .93, .85], { r: [0, 0, .5] }), P('cone', [.5, 1.84, 0], [.09, .26, .09], [.95, .93, .85], { r: [0, 0, -.5] }), P('sphere', [.41, 1.62, 0], [.27, .18, .29], [.85, .6, 1]));
    a.push(P('sphere', J_L, [.2, .2, .2], [.7, .45, 1], L_({ o: [0, -.66, .22], e: 1.2, bob: .03 })));
    for (const s of [-1, 1]) a.push(P('sphere', [s * .75, 2.3, -.1], [.13, .13, .13], [.7, .5, 1], { e: 1, bob: .12 }));
  }
}

/* ombreira de ouro por classe (graus altos e fases): aço (Vanguarda), manto de pano com friso (Arcanista), couro com pena (Caçadora), pele (Invocador) */
function shoulderTrim(a, cls, big) {
  const gold = [.95, .78, .3], k = big ? 1 : .8;
  for (const s of [-1, 1]) {
    if (cls === 'arcanist') a.push(P('sphere', [s * .38, 1.64, 0], [.3 * k, .1, .3 * k], [.3, .4, .85]), P('sphere', [s * .38, 1.6, 0], [.33 * k, .035, .33 * k], gold));
    else if (cls === 'huntress') a.push(P('sphere', [s * .39, 1.63, 0], [.22 * k, .12, .26 * k], [.36, .24, .13]), P('cone', [s * .46, 1.8, -.04], [.06, .3, .06], [.9, .85, .6], { r: [0, 0, -s * .5] }));
    else if (cls === 'tamer') a.push(P('sphere', [s * .4, 1.64, 0], [.3 * k, .17, .32 * k], [.92, .9, .82]), P('sphere', [s * .46, 1.7, .06], [.12, .1, .12], [.98, .97, .92]));
    else a.push(P('sphere', [s * .42, 1.66, 0], [.38 * k, .26 * k, .38 * k], gold));
  }
}
/* decoração da armadura: cada grau, raridade e nível de refino muda o visual */
function armorDeco(a, ag, ac, rg, ap, arl, cls) {
  if (ag < 0) return;
  if (ag >= 1) for (const s of [-1, 1]) a.push(P('sphere', [s * .4, 1.6, 0], [.28, .17, .3], ac, { rg: .4, mt: .7 })); // ombreiras
  if (ag >= 2) { // placa frontal: aço cheio (Vanguarda), faixa de pano (Arcanista), colete de couro (Caçadora), gola de pele (Invocador)
    if (cls === 'arcanist') a.push(P('box', [0, 1.3, .15], [.3, .56, .05], shade(ac, 1.1), { rg: .35, mt: .3 }));
    else if (cls === 'huntress') a.push(P('sphere', [0, 1.3, .1], [.42, .4, .13], shade(ac, 1.05), { rg: .35, mt: .5 }));
    else if (cls === 'tamer') a.push(P('sphere', [0, 1.45, .08], [.52, .26, .2], [.92, .9, .82]));
    else a.push(P('sphere', [0, 1.33, .1], [.5, .52, .2], shade(ac, 1.15), { rg: .35, mt: .8 }));
  }
  if (ag >= 3) {
    a.push(P('cylh', [-.38, 1.52, 0], [.23, .2, .23], ac, { o: [0, -.52, .01], sw: .8, ph: PI, rg: .4, mt: .7 }));
    a.push(P('cylh', [.38, 1.52, 0], [.23, .2, .23], ac, { o: [0, -.52, .01], sw: .8, ph: 0, at: 1.5, rg: .4, mt: .7 })); // braceletes
    a.push(P('sphere', [0, 1.42, .2], [.14, .14, .1], rg || [.9, .3, .3], { e: 1 }));
  }
  if (ag >= 4) {
    shoulderTrim(a, cls, 1);
    a.push(P('box', [0, 1.15, -.19], [.5, .7, .06], shade(ac, .8)));
  }
  if (ag >= 5) a.push(P('cyl', [0, .98, 0], [.78, .05, .78], [.6, .8, 1], { e: .5 }));
  if (rg) { // raridade: frisos brilhantes
    for (const s of [-1, 1]) a.push(P('box', [s * .285, 1.25, 0], [.03, .62, .32], rg, { e: 1 }));
    a.push(P('box', [0, 1.62, 0], [.2, .05, .34], rg, { e: 1 }));
  }
  if (arl >= 3 && ag >= 0) for (const s of [-1, 1]) a.push(P('cone', [s * .5, 1.95, 0], [.1, .32, .1], rg, { e: .7, r: [0, 0, -s * .35] }));
  if (arl >= 4) {
    for (const s of [-1, 1]) a.push(P('sphere', [s * .6, 1.3, -.1], [.08, .08, .08], rg, { e: .9, bob: .14 }), P('cone', [s * .44, 2.0, 0], [.08, .4, .08], [1, .55, .15], { e: .8, bob: .05 }));
    for (let k = 0; k < 10; k++) { const an = k / 10 * PI * 2; a.push(P('sphere', [Math.cos(an) * .85, .06, Math.sin(an) * .85], [.07, .05, .07], rg, { e: .9 })); }
    a.push(P('box', [0, .34, -.23], [.82, .05, .06], rg, { e: .5 }));
  }
  if (ap >= 3) a.push(P('sphere', [0, 1.28, .19], [.12, .12, .1], [1, .95, .5], { e: 1 })); // refino: joia
  if (ap >= 6) for (const s of [-1, 1]) a.push(P('sphere', [s * .5, 1.95, 0], [.12, .12, .12], rg || [1, .9, .5], { e: 1, bob: .08 }));
  if (ap >= 9) a.push(P('cyl', [0, .05, 0], [1.5, .03, 1.5], rg || [1, .9, .5], { e: 1 })); // aura no chão
}

/* capacete por classe e grau */
function helmParts(a, cls, hg, C, rg) {
  if (hg < 0) return;
  const hc = (ARM_CLS_COL[cls] || ARM_COL)[hg];
  if (cls === 'arcanist') {
    const s = 1 + hg * .07;
    a.push(P('cyl', [0, 1.97, 0], [.78 * s, .06, .78 * s], shade(hc, .8)), P('cone', [0, 2.3 + hg * .03, -.02], [.5 * s, .8 * s, .5 * s], hc, { r: [-.12, 0, 0] }));
    if (hg >= 2) a.push(P('sphere', [0, 2.04, .26 * s], [.1, .1, .1], rg || [1, .9, .5], { e: 1 }));
    if (hg >= 3) a.push(P('sphere', [0, 2.62 + hg * .03, -.1], [.14, .14, .14], [1, .9, .5], { e: 1, bob: .03 }));
  } else if (cls === 'huntress') {
    a.push(P('sphere', [0, 1.88, -.05], [.49, .4, .49], shade(hc, .85)), P('box', [0, 1.96, .17], [.4, .07, .1], hc));
    if (hg >= 2) a.push(P('cone', [.2, 2.12, -.1], [.07, .5, .07], [.9, .3, .3], { r: [0, 0, -.5] }));
    if (hg >= 3) a.push(P('box', [0, 1.945, .21], [.42, .05, .06], shade(hc, .55), { rg: .4, mt: .6 })); // faixa da testa
  } else {
    a.push(P('sphere', [0, 1.88, -.05], [.5, .42, .5], hc), P('box', [0, 1.97, .15], [.46, .07, .12], shade(hc, .85)));
    if (hg >= 2) { a.push(P('box', [0, 1.77, .24], [.035, .15, .03], shade(hc, .85), { rg: .4, mt: .7 })); for (const sd of [-1, 1]) a.push(P('box', [sd * .262, 1.74, .0], [.03, .2, .22], shade(hc, .75), { rg: .4, mt: .7 })); } // protetor de nariz e bochechas (não cobre os olhos)
    if (cls === 'tamer' && hg >= 1) a.push(P('cone', [-.2, 2.12, 0], [.1, .3, .1], [.92, .9, .8], { r: [0, 0, .5] }), P('cone', [.2, 2.12, 0], [.1, .3, .1], [.92, .9, .8], { r: [0, 0, -.5] }));
    if (cls === 'vanguard' && hg >= 3) a.push(P('cone', [0, 2.22, -.02], [.14, .5, .14], C, { r: [-.3, 0, 0] }));
  }
  if (hg >= 4) { a.push(P('cyl', [0, 2.0, 0], [.52, .08, .52], [.95, .8, .3])); for (let k = 0; k < 5; k++) { const t = k / 5 * PI * 2; a.push(P('cone', [Math.sin(t) * .24, 2.1, Math.cos(t) * .24], [.07, .16, .07], [.95, .8, .3])); } }
  if (hg >= 5) for (const s of [-1, 1]) a.push(P('box', [s * .3, 2.0, -.05], [.05, .5, .3], [.62, .78, .98], { e: .4, r: [0, 0, -s * .7] }));
}
/* armas presas à mão: cada peça é descrita no espaço da arma (origem = empunhadura, +Y = direção da lâmina/haste),
   inclinada para a frente (tx) e levada até a mão. Assim a arma acompanha o braço (andar/ataque) sem atravessar o corpo. */
const HG = [0, -.77, .03];
function WP(side, m, lp, s, c, tx, pr, x) {
  const J = side > 0 ? J_R : J_L, F = side > 0 ? R_ : L_, cs = Math.cos(tx), sn = Math.sin(tx);
  const d = [HG[0] + lp[0], HG[1] + cs * lp[1] - sn * lp[2], HG[2] + sn * lp[1] + cs * lp[2]];
  const r = [tx + (pr ? pr[0] : 0), pr ? pr[1] : 0, pr ? pr[2] : 0];
  return P(m, J, s, c, F(Object.assign({ o: rotOff(d, r), r }, x || {})));
}
const HANDLE = [.35, .22, .12], LEATHER = [.3, .2, .1];
function staffParts(a, side, len, wc, wg, wr, head) { // cajado/totem longo, quase vertical, um pouco à frente da mão
  const tx = .14, bot = .86, top = len - bot, z = .07;
  a.push(WP(side, 'cylh', [.03, len / 2 - bot, z], [.1, len, .1], [.5, .35, .2], tx, null, { rg: .8 }));
  a.push(WP(side, 'cylh', [.03, .02, z], [.13, .22, .13], LEATHER, tx)); // empunhadura de couro
  head(top, z);
}
function weaponParts(a, cls, wt, wg, wc, wr, wE, k, has, ac, C, ar) {
  const MT = { rg: .3, mt: .85 };
  if (cls === 'vanguard') {
    if (wt === 'axe') {
      const tx = .75, top = .9 * k;
      a.push(WP(1, 'cylh', [0, top / 2 - .12, 0], [.08, top + .24, .08], HANDLE, tx));
      a.push(WP(1, 'box', [0, top - .14, .2 * k], [.05, .34 * k, .42 * k], wc, tx, null, Object.assign({ e: wE }, MT)));
      a.push(WP(1, 'shard', [0, top - .14, .43 * k], [.05, .38 * k, .06], shade(wc, 1.2), tx, [PI / 2, 0, 0], MT)); // gume
      a.push(WP(1, 'box', [0, top - .14, -.1], [.06, .14, .14], wc, tx, null, MT));
      a.push(WP(1, 'shard', [0, top + .08, 0], [.08, .2, .08], wc, tx, null, MT));
      if (wr) a.push(WP(1, 'box', [0, top - .14, .38 * k], [.07, .3 * k, .05], wr, tx, null, { e: 1 }));
    } else if (wt === 'daggers') { // faca/adaga na mão direita (o escudo fica na esquerda)
      const tx = 1.15;
      a.push(WP(1, 'cylh', [0, -.02, 0], [.07, .22, .07], LEATHER, tx));
      a.push(WP(1, 'box', [0, .1, 0], [.24, .05, .08], has ? shade(ac, .8) : shade(wc, .7), tx, null, MT));
      a.push(WP(1, 'box', [0, .12 + .27 * k, 0], [.1, .54 * k, .03], wc, tx, null, Object.assign({ e: wE, sharp: 1 }, MT)));
      a.push(WP(1, 'shard', [0, .12 + .54 * k + .08, 0], [.1, .16, .03], wc, tx, null, Object.assign({ e: wE }, MT)));
      if (wr) a.push(WP(1, 'box', [0, .12 + .27 * k, 0], [.03, .46 * k, .04], wr, tx, null, { e: 1, sharp: 1 }));
    } else { // espada
      const tx = .95, bl = 1.0 * k;
      a.push(WP(1, 'cylh', [0, -.02, 0], [.07, .26, .07], LEATHER, tx));
      a.push(WP(1, 'sphere', [0, -.18, 0], [.1, .1, .1], has ? shade(ac, .9) : [.5, .4, .25], tx, null, MT));
      a.push(WP(1, 'box', [0, .13, 0], [.36, .07, .11], has ? shade(ac, .8) : [.4, .3, .18], tx, null, MT));
      a.push(WP(1, 'box', [0, .16 + bl / 2, 0], [.14, bl, .04], wc, tx, null, Object.assign({ e: wE, sharp: 1 }, MT)));
      a.push(WP(1, 'shard', [0, .16 + bl + .1, 0], [.14, .2, .04], wc, tx, null, Object.assign({ e: wE }, MT)));
      if (wr) a.push(WP(1, 'box', [0, .16 + bl / 2, 0], [.04, bl * .9, .05], wr, tx, null, { e: 1, sharp: 1 }));
    }
    // escudo no antebraço esquerdo, virado para a frente e um pouco para fora (não entra no peito)
    const sr = [PI / 2, 0, .35], sd = [-.07, -.56, .25];
    a.push(PA('cylh', J_L, sd, [.66, .07, .66], has ? ac : [.45, .32, .2], sr, L_(MT)));
    a.push(PA('ring', J_L, [sd[0] - .012, sd[1], sd[2] + .035], [.66, .9, .66], has ? shade(ac, 1.25) : [.6, .5, .3], sr, L_(MT)));
    a.push(PA('sphere', J_L, [sd[0] - .02, sd[1], sd[2] + .05], [.2, .2, .09], ar || C, sr, L_(Object.assign({ e: ar ? 1 : 0 }, MT))));
  } else if (cls === 'arcanist') {
    if (wt === 'wand') {
      const tx = .9, L = .6 * k, os = .1 + .025 * wg;
      a.push(WP(1, 'cylh', [0, L / 2 - .1, 0], [.06, L, .06], [.5, .35, .2], tx));
      a.push(WP(1, 'sphere', [0, L - .04, 0], [os, os, os], wc, tx, null, { e: 1 }));
      for (const sx of [-1, 1]) a.push(WP(1, 'shard', [sx * (os * .7), L - .1, 0], [.04, .14, .04], wc, tx, [0, 0, -sx * .5], { e: 1 }));
      if (wr) a.push(WP(1, 'ring', [0, L - .04, 0], [os * 2.4, os * 2.4, os * 2.4], wr, tx, null, { e: 1 }));
    } else if (wt === 'orb') {
      const os = .24 + .03 * wg;
      a.push(WP(1, 'sphere', [0, .1 + os * .5, .14], [os, os, os], wc, 0, null, { e: 1, bob: .04 }));
      a.push(WP(1, 'ring', [0, .1 + os * .5, .14], [os * 1.7, os * 1.7, os * 1.7], shade(wc, .8), 0, [.5, 0, 0], { e: 1 }));
      if (wr) a.push(WP(1, 'sphere', [0, .1 + os * .5, .14], [os * 1.35, os * 1.35, os * 1.35], wr, 0, null, { e: .6 }));
    } else if (wt === 'tome') { // grimório aberto flutuando sobre a mão
      a.push(WP(1, 'box', [0, .16, .16], [.36, .05, .28], [.35, .12, .1], .35, null, { bob: .03 }));
      for (const sx of [-1, 1]) a.push(WP(1, 'box', [sx * .09, .19, .16], [.16, .02, .24], [.95, .9, .78], .35, [0, 0, -sx * .18], { bob: .03 }));
      a.push(WP(1, 'sphere', [0, .32, .16], [.12, .12, .12], wc, .35, null, { e: 1, bob: .05 }));
      a.push(WP(1, 'ring', [0, .32, .16], [.3, .3, .3], shade(wc, .9), .35, [.4, 0, 0], { e: 1, bob: .05 }));
      if (wr) a.push(WP(1, 'ring', [0, .2, .16], [.5, .5, .5], wr, .35, null, { e: 1 }));
    } else {
      staffParts(a, 1, 1.9 * k, wc, wg, wr, (top, z) => {
        if (wg < 0) return;
        const os = .24 + .035 * wg;
        a.push(WP(1, 'sphere', [.03, top + os * .55, z], [os, os, os], wc, .14, null, { e: 1 }));
        for (let q = 0; q < 3; q++) a.push(WP(1, 'shard', [.03 + Math.cos(q * 2.1) * os * .55, top + .02, z + Math.sin(q * 2.1) * os * .55], [.05, .32, .05], [.55, .4, .22], .14, [Math.sin(q * 2.1) * .5, 0, -Math.cos(q * 2.1) * .5]));
        if (wr) a.push(WP(1, 'ring', [.03, top + os * .55, z], [os * 1.8, os * 1.8, os * 1.8], wr, .14, null, { e: 1 }));
      });
    }
  } else if (cls === 'huntress') {
    a.push(P('cyl', [0, 1.3, -.22], [.16, .62, .16], [.45, .3, .18], { r: [.35, 0, 0] })); // aljava
    for (let i = -1; i <= 1; i++) a.push(P('cone', [i * .04, 1.68, -.34], [.05, .14, .05], wc, { r: [.35, 0, 0] }));
    if (wt === 'crossbow') {
      const tx = PI / 2 * .92;
      a.push(WP(-1, 'box', [0, .2, 0], [.1, .8, .12], [.4, .28, .15], tx));
      a.push(WP(-1, 'box', [0, .54, .02], [.84 * k, .07, .07], wc, tx, null, Object.assign({ e: wE }, MT)));
      a.push(WP(-1, 'box', [0, .44, .02], [.78 * k, .015, .015], [.92, .92, .86], tx));
      a.push(WP(-1, 'shard', [0, .58, .08], [.04, .26, .04], wc, tx, null, { e: 1 }));
      if (wr) for (const sx of [-1, 1]) a.push(WP(-1, 'sphere', [sx * .42 * k, .54, .02], [.09, .09, .09], wr, tx, null, { e: 1 }));
    } else { // arco: na mão esquerda, em pé, girado ~35° para fora para ser visto de frente; pontas e corda para trás
      const lb = wt === 'longbow', cb = wt === 'compbow'; // arco curto, longo ou composto (recurvo)
      const tx = .3, Lb = (lb ? .8 : cb ? .62 : .52) * k, th = lb ? .3 : cb ? .5 : .42, z = .1, Y = .6, sY = Math.sin(Y), cY = Math.cos(Y);
      const tipZ = -Math.sin(th) * Lb, tipY = .12 + Math.cos(th) * Lb, my = .12 + Math.cos(th) * Lb / 2;
      const at = (dz, y) => [dz * sY, y, z + dz * cY]; // ponto do arco (profundidade dz, altura y) a partir da empunhadura
      a.push(WP(-1, 'cylh', at(0, 0), [.11, .3, .11], LEATHER, tx)); // empunhadura dentro do punho
      a.push(WP(-1, 'box', at(tipZ / 2, my), [.08, Lb, .09], wc, tx, [-th, Y, 0], { e: wE }));
      a.push(WP(-1, 'box', at(tipZ / 2, -my), [.08, Lb, .09], wc, tx, [th, Y, 0], { e: wE }));
      a.push(WP(-1, 'box', at(tipZ, 0), [.016, 2 * tipY, .016], [.92, .92, .86], tx, [0, Y, 0], { sharp: 1 }));
      if (cb) for (const sy of [-1, 1]) a.push(WP(-1, 'box', at(tipZ * 1.1, sy * (tipY + .05)), [.07, .15, .06], shade(wc, .75), tx, [sy * .9, Y, 0])); // pontas recurvas
      if (lb) a.push(WP(-1, 'box', at(0, 0), [.13, .2, .13], shade(wc, .7), tx, [0, Y, 0]));
      if (wr) for (const sy of [-1, 1]) a.push(WP(-1, 'sphere', at(tipZ, sy * tipY), [.1, .1, .1], wr, tx, null, { e: 1 }));
    }
  } else {
    if (wt === 'staff') { // cajado espiritual
      staffParts(a, 1, 1.85 * k, wc, wg, wr, (top, z) => {
        const os = .2 + .03 * Math.max(0, wg);
        a.push(WP(1, 'sphere', [.03, top + os * .6, z], [os, os, os], [.7, .55, 1], .14, null, { e: 1, bob: .03 }));
        a.push(WP(1, 'ring', [.03, top + os * .6, z], [os * 2, os * 2, os * 2], wc, .14, [.6, 0, 0], { e: wE }));
        for (const sx of [-1, 1]) a.push(WP(1, 'shard', [.03 + sx * .14, top + .02, z], [.05, .28, .05], [.55, .4, .22], .14, [0, 0, -sx * .6]));
        if (wr) a.push(WP(1, 'ring', [.03, top + os * .6, z], [os * 2.6, os * 2.6, os * 2.6], wr, .14, null, { e: 1 }));
      });
    } else if (wt === 'totem') {
      staffParts(a, 1, 1.75 * k, wc, wg, wr, (top, z) => {
        a.push(WP(1, 'box', [.03, top + .14 * k, z], [.3 * k, .36 * k, .18], wc, .14, null, { e: wE }));
        a.push(WP(1, 'box', [.03, top + .2 * k, z + .1], [.2 * k, .05, .03], [.1, .1, .1], .14), WP(1, 'box', [.03, top + .07 * k, z + .1], [.15 * k, .05, .03], [.1, .1, .1], .14));
        for (const sx of [-1, 1]) a.push(WP(1, 'shard', [.03 + sx * .2 * k, top + .36 * k, z], [.07, .3, .07], [.3, .8, .4], .14, [0, 0, -sx * .5]));
        if (wr) a.push(WP(1, 'sphere', [.03, top + .4 * k, z], [.13, .13, .13], wr, .14, null, { e: 1 }));
      });
    } else {
      staffParts(a, 1, 1.7 * k, wc, wg, wr, (top, z) => {
        a.push(WP(1, 'box', [.03, top, z], [.36 * k, .24 * k, .1], wc, .14, null, { e: wE }));
        a.push(WP(1, 'sphere', [.03, top + .2 * k, z], [.19, .19, .19], wr || [.9, .2, .2], .14, null, { e: 1 }));
        for (const sx of [-1, 1]) a.push(WP(1, 'shard', [.03 + sx * .2 * k, top + .08, z], [.05, .26, .05], [.3, .8, .4], .14, [0, 0, -sx * .7]));
      });
    }
  }
}

/* wg/ag = grau da arma/peitoral (-1 = nada equipado); o = {wr,wp,ar,ap,ac,cr,hg,hr,lg,bg,wt,look} */
/* cabeça menor (proporção ~1:6,5) para um visual menos 'cabeçudo': escala tudo que está na cabeça em torno do pescoço */
function headScale(a, k) {
  const c = [0, 1.6, 0];
  for (const q of a) if (q.p[1] > 1.64 && Math.abs(q.p[0]) <= .31 && !q.sw) { q.p = [c[0] + q.p[0] * k, c[1] + (q.p[1] - c[1]) * k, q.p[2] * k]; q.s = q.s.map(v => v * k); if (q.o) q.o = q.o.map(v => v * k); }
  return a;
}
/* pernas mais longas (proporção mais realista): estica as peças da perna e sobe o resto do corpo */
function stretchLegs(a, d) {
  const k = (.88 + d) / .88;
  for (const q of a) {
    if (q.p[1] < .2 && !q.sw) continue; // aura/anéis no chão
    if (q.ns) continue; // perna em loft: já na proporção final
    if (q.p[1] === .88 && Math.abs(q.p[0]) <= .2 && q.sw) { q.p = [q.p[0], .88 + d, q.p[2]]; if (q.o) q.o = [q.o[0], q.o[1] * k, q.o[2]]; q.s = [q.s[0], q.s[1] * k, q.s[2]]; }
    else if (q.gr) { q.p = [q.p[0], q.p[1] * k, q.p[2]]; q.s = [q.s[0], q.s[1] * k, q.s[2]]; }
    else q.p = [q.p[0], q.p[1] + d, q.p[2]];
  }
  return a;
}
function playerParts(cls, tier, wg, ag, o) {
  o = o || {};
  const hg = o.hg == null ? -1 : o.hg, lg = o.lg == null ? -1 : o.lg, bg = o.bg == null ? -1 : o.bg, gg = o.gg == null ? -1 : o.gg, wt = o.wt || WTYPES[cls][0];
  const key = [cls, tier, wg, ag, o.wr | 0, o.wp | 0, o.ar | 0, o.ap | 0, o.ac == null ? -1 : o.ac, o.cr | 0, hg, o.hr | 0, lg, bg, gg, wt, o.look ? LOOK_KEYS.map(k => o.look[k]).join('.') : 'n'].join('_');
  if (playerCache[key]) return playerCache[key];
  const ACL = ARM_CLS_COL[cls] || ARM_COL, C = CLASSES[cls].col, has = ag >= 0, ac = has ? ACL[ag] : [.5, .45, .4];
  const wc = wg >= 0 ? WPN_COL[wg] : [.5, .35, .2], wp = o.wp | 0, k = wg >= 0 ? 1 + .08 * wg + .015 * wp : .72;
  const wr = RAR_GLOW[o.wr | 0], ar = RAR_GLOW[o.ar | 0], hr = RAR_GLOW[o.hr | 0], wE = (wp >= 7 || wg === 5) ? .35 : 0;
  const body = has ? mix(C, ac, .4) : shade(mix(C, [.55, .5, .44], .38), .92);
  const pants = lg >= 0 ? shade(mix(C, ACL[lg], .55), .62) : has ? shade(mix(C, ac, .3), .55) : shade(mix(C, [.4, .34, .3], .6), .6);
  const boots = bg >= 0 ? shade(ACL[bg], .62) : [.28, .2, .13];
  let a; CURLOOK = o.look || null;
  if (cls === 'vanguard') a = humanoid({ loft: 1, top: body, pants, boots, hair: [.25, .15, .1], belt: ac, sleeve: shade(body, .85) });
  else if (cls === 'arcanist') {
    const rb = has ? mix([.22, .3, .8], ac, .45) : [.42, .4, .5];
    a = humanoid({ loft: 1, top: rb, pants: shade(rb, .6), boots, hair: [.9, .9, .95], sleeve: rb, belt: ac });
    a.push(P('robe', [0, .6, 0], [.84, 1.1, .8], rb, { gr: 1 }));
  } else if (cls === 'huntress') {
    const lt = has ? mix([.25, .55, .3], ac, .5) : [.4, .42, .32];
    a = humanoid({ loft: 1, top: lt, pants, boots, hair: [.55, .25, .12], sleeve: shade(lt, .9), belt: ac });
  } else {
    const tp = has ? mix([.5, .32, .16], ac, .45) : [.42, .34, .26], fr = has ? mix([.75, .5, .2], ac, .3) : [.55, .4, .25];
    a = humanoid({ loft: 1, top: tp, pants, boots, hair: [.2, .12, .08], sleeve: tp, belt: ac });
    a.push(P('sphere', [0, 1.55, 0], [.8, .3, .56], fr));
  }
  if (gg >= 0) { // luvas: punho e mão revestidos na cor do conjunto (aço para a Vanguarda), com friso dourado nos graus altos
    const gc = shade(ACL[gg], .8), gm = cls === 'vanguard' ? .8 : .2;
    for (const s of [-1, 1]) { const K = { sw: .8, ph: s < 0 ? PI : 0, at: s > 0 ? 1.5 : 0 };
      a.push(P('cylh', [s * .38, 1.52, 0], [.2, .13, .2], gc, Object.assign({ o: [0, -.66, .01], rg: .4, mt: gm }, K)), P('hand', [s * .38, 1.52, 0], [.2, .2, .19], shade(ACL[gg], .95), Object.assign({ o: [0, -.75, .01], rg: .4, mt: gm }, K)));
      if (gg >= 3) a.push(P('cylh', [s * .38, 1.52, 0], [.21, .03, .21], [.95, .8, .3], Object.assign({ o: [0, -.6, .01], mt: .9 }, K)));
    }
  }
  CURLOOK = null;
  if (has) { // peitoral por classe
    if (ag >= 1 && (cls === 'vanguard')) { const bw = o.look ? [.9, 1, 1.12][o.look.b == null ? 1 : o.look.b] : 1; a.push(P('torsoM', [0, 1.34, .01], [.8 * bw, .6, .42], ac, { rg: .35, mt: .8 }), P('sphere', [0, 1.42, .08], [.6 * bw, .3, .32], shade(ac, 1.08), { rg: .35, mt: .8 })); }
  }
  // peças das pernas e pés
  for (const s of [-1, 1]) {
    const ph = s < 0 ? 0 : PI;
    if (lg >= 2) a.push(P('thigh', [s * .16, .88, 0], [.32, .3, .33], ACL[lg], { o: [0, -.26, .01], sw: .9, ph, rg: .4, mt: .7 }), P('sphere', [s * .16, .88, 0], [.2, .13, .2], ACL[lg], { o: [0, -.45, .05], sw: .9, ph, rg: .4, mt: .7 }));
    if (lg >= 4) a.push(P('cylh', [s * .16, .88, 0], [.33, .06, .34], [.95, .8, .3], { o: [0, -.1, .01], sw: .9, ph, mt: .9 }));
    if (bg >= 1) a.push(P('cylh', [s * .16, .88, 0], [.3, .08, .31], ACL[bg], { o: [0, -.64, 0], sw: .9, ph, rg: .45, mt: .6 }));
    if (bg >= 3) a.push(P('cylh', [s * .16, .88, 0], [.27, .03, .4], hr || [.4, .9, .9], { o: [0, -.885, .06], sw: .9, ph, e: 1 }));
  }
  helmParts(a, cls, hg, C, hr);
  weaponParts(a, cls, wt, wg, wc, wr, wE, k, has, ac, C, ar);
  styleLayer(a, cls, ag, ac, hg, o.look ? SKIN_TONES[o.look.sk] : SKIN, o.ar | 0);
  armorDeco(a, ag, ac, ar, o.ap | 0, o.ar | 0, cls);
  if (o.ac != null && o.ac >= 0) a.push(P('sphere', [0, 1.5, .2], [.13, .13, .09], o.cr ? RAR_GLOW[o.cr] : WPN_COL[o.ac], { e: o.cr ? 1 : 0 })); // amuleto do acessório
  if (tier >= 1) {
    shoulderTrim(a, cls, 0);
  }
  if (tier >= 2) {
    angelWings(a);
    a.push(P('cyl', [0, 2.35, 0], [.6, .05, .6], [.95, .78, .3], { e: .7 }));
  }
  stretchLegs(a, .14); headScale(a, .82);
  return playerCache[key] = keepParts(a);
}

const npcCache = {};
/* NPCs: corpo inteiro (com pernas), roupa e acessórios de acordo com a função */
const NPC_LOOK = { // pele, cabelo, mulher?, barba
  maelis: [1, [.9, .9, .95], 1], doran: [2, [.25, .15, .1], 0, 3], brann: [3, [.15, .1, .08], 0, 5], lia: [0, [.75, .35, .15], 1], valen: [1, [.5, .5, .55], 0, 2],
  roderic: [1, [.35, .2, .1], 0, 1], selene: [6, [.12, .1, .14], 1], elric: [2, [.55, .4, .2], 0, 2],
};
function npcParts(n) {
  if (npcCache[n.id]) return npcCache[n.id];
  const K = n.kind === 'enc' ? n.style : n.kind; // encontros aleatórios reaproveitam o visual de outros tipos de NPC (cor própria)
  const L = NPC_LOOK[n.id] || [(n.id.length * 3) % 5, K === 'quest' ? [.9, .9, .95] : [.3 + (n.id.length % 3) * .15, .2, .12], n.n.startsWith('Anciã') || n.n.startsWith('Curandeira') || n.n.startsWith('Mercadora') || n.n.startsWith('Ferreira') || n.n.startsWith('Guardiã') || n.n.startsWith('Erudita') || n.n.startsWith('Joalheira') ? 1 : 0, K === 'smith' ? 5 : K === 'quest' ? 3 : 0];
  CURLOOK = { g: L[2], hs: L[2] ? (K === 'heal' ? 2 : 1) : K === 'quest' ? 0 : 0, hc: 0, hcx: '#' + L[1].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join(''), ec: 0, sk: L[0], bd: L[2] ? 0 : (L[3] || 0), fc: 0, b: K === 'smith' ? 2 : 1 };
  const c = n.col, dk = shade(c, .55), boots = [.25, .17, .1];
  let a;
  if (K === 'quest' || K === 'heal' || n.id === 'selene') { // túnica longa até os tornozelos
    a = humanoid({ loft: 1, top: c, pants: shade(c, .6), boots, sleeve: shade(c, .9), belt: K === 'heal' ? [.9, .85, .7] : [.85, .7, .3] });
    a.push(P('robe', [0, .6, 0], [.8, 1.1, .76], shade(c, .92), { gr: 1 }));
    a.push(P('cylh', [0, 1.0, 0], [.62, .08, .44], K === 'heal' ? [.9, .85, .7] : [.85, .7, .3]));
  } else {
    a = humanoid({ loft: 1, top: c, pants: K === 'portal' ? [.3, .3, .36] : dk, boots, sleeve: shade(c, .88), belt: [.35, .22, .12] });
  }
  CURLOOK = null;
  const J = J_R;
  if (K === 'quest') { // cajado e manto
    a.push(P('box', [0, 1.14, -.2], [.62, 1.05, .05], shade(c, .7), { bob: .02 }));
    a.push(WP(1, 'cylh', [.03, .55, .07], [.08, 1.95, .08], [.5, .35, .2], .14), WP(1, 'sphere', [.03, 1.55, .07], [.24, .24, .24], [.6, .4, 1], .14, null, { e: 1 }));
  }
  if (K === 'heal') { a.push(P('sphere', [0, 1.98, -.02], [.5, .3, .48], [.95, .95, .9]), P('box', [0, 1.3, .2], [.06, .26, .02], [.9, .2, .2]), P('box', [0, 1.33, .205], [.2, .06, .02], [.9, .2, .2])); a.push(WP(-1, 'cylh', [0, .02, .05], [.18, .28, .18], [.55, .75, .55], 0)); }
  if (K === 'shop') { // avental, chapéu e bolsa de moedas
    a.push(P('box', [0, 1.0, .2], [.5, .8, .04], [.9, .86, .72]), P('cylh', [0, 1.98, -.02], [.7, .05, .7], [.45, .3, .15]), P('cylh', [0, 2.1, -.02], [.42, .24, .42], [.45, .3, .15]));
    a.push(P('sphere', [.32, .95, .1], [.18, .2, .16], [.6, .45, .2]), P('box', [0, 1.6, -.25], [.5, .55, .25], [.5, .35, .2]));
  }
  if (K === 'smith') { // avental de couro e martelo
    a.push(P('box', [0, 1.05, .21], [.56, 1.0, .05], [.3, .2, .12]), P('box', [0, 1.5, .23], [.3, .12, .04], [.3, .2, .12]));
    a.push(WP(1, 'cylh', [0, .2, 0], [.07, .55, .07], [.35, .22, .12], .9), WP(1, 'box', [0, .5, 0], [.32, .16, .18], [.55, .55, .6], .9, null, { mt: .9, rg: .3 }));
  }
  if (K === 'portal') { // guardião: armadura e cajado arcano
    for (const s of [-1, 1]) a.push(P('sphere', [s * .4, 1.6, 0], [.3, .18, .32], [.6, .64, .72], { mt: .8, rg: .35 }));
    a.push(P('sphere', [0, 1.33, .1], [.52, .5, .2], [.6, .64, .72], { mt: .8, rg: .35 }), P('box', [0, 1.14, -.2], [.62, 1.05, .05], shade(c, .8), { bob: .02 }));
    a.push(WP(1, 'cylh', [.03, .55, .07], [.08, 1.95, .08], [.35, .35, .45], .14), WP(1, 'sphere', [.03, 1.58, .07], [.26, .26, .26], [.4, .8, 1], .14, null, { e: 1 }));
    a.push(P('cone', [0, 2.15, -.02], [.5, .55, .5], shade(c, .7)));
  }
  if (K === 'trainer') { // mestre: túnica longa, faixa e cajado de treino
    a.push(P('robe', [0, .6, 0], [.8, 1.1, .76], shade(c, .9), { gr: 1 }), P('cylh', [0, 1.0, 0], [.62, .08, .44], [.95, .8, .3]));
    a.push(WP(1, 'cylh', [.03, .5, .07], [.07, 1.8, .07], [.4, .28, .15], .14), P('sphere', [0, 1.86, -.04], [.44, .2, .44], [.25, .2, .28]));
  }
  if (K === 'bank') { // guarda de carga: chapéu, chave grande e livro de registros
    a.push(P('cylh', [0, 1.98, -.02], [.62, .05, .62], [.25, .2, .14]), P('cylh', [0, 2.12, -.02], [.4, .28, .4], [.25, .2, .14]));
    a.push(WP(1, 'cylh', [0, .1, 0], [.05, .5, .05], [.95, .8, .3], .9), WP(1, 'ring', [0, .42, 0], [.18, .9, .18], [.95, .8, .3], .9, [PI / 2, 0, 0]));
    a.push(WP(-1, 'box', [0, .12, .12], [.3, .05, .24], [.35, .2, .1], .3));
  }
  if (K === 'armor') { // alfaiate: avental, fita métrica e rolo de tecido
    a.push(P('box', [0, 1.0, .2], [.48, .8, .04], [.85, .8, .7]), P('box', [0, 1.5, .19], [.06, .5, .02], [.95, .85, .3]));
    a.push(WP(-1, 'cylh', [0, .1, .12], [.18, .5, .18], [.7, .2, .25], 0, [0, 0, PI / 2]));
  }
  if (K === 'weapon') { // armeiro: avental de couro, braçadeiras e espada
    a.push(P('box', [0, 1.05, .21], [.56, 1.0, .05], [.3, .2, .12]));
    a.push(WP(1, 'cylh', [0, -.02, 0], [.07, .26, .07], [.3, .2, .1], .95), WP(1, 'box', [0, .66, 0], [.14, 1, .04], [.8, .82, .88], .95, null, { mt: .9, rg: .25, sharp: 1 }));
  }
  if (K === 'stable') { // cavalariço: chapéu de palha e forcado
    a.push(P('cylh', [0, 1.98, -.02], [.8, .04, .8], [.85, .72, .35]), P('cylh', [0, 2.08, -.02], [.42, .2, .42], [.85, .72, .35]));
    a.push(WP(1, 'cylh', [.03, .5, .07], [.06, 1.8, .06], [.5, .36, .2], .14));
    for (const sx of [-.07, 0, .07]) a.push(WP(1, 'shard', [.03 + sx, 1.5, .07], [.03, .3, .03], [.6, .62, .66], .14));
  }
  if (n.id === 'roderic') { // capitão da guarda: peitoral, capa vermelha, espada e escudo
    a.push(P('torsoM', [0, 1.34, .01], [.78, .6, .42], [.65, .68, .74], { mt: .85, rg: .3 }), P('sphere', [0, 1.88, -.04], [.5, .42, .5], [.65, .68, .74], { mt: .85, rg: .3 }));
    for (const s of [-1, 1]) a.push(P('sphere', [s * .41, 1.6, 0], [.3, .18, .32], [.65, .68, .74], { mt: .85, rg: .3 }));
    a.push(P('box', [0, 1.1, -.21], [.66, 1.1, .05], [.6, .1, .12], { bob: .02 }));
    a.push(WP(1, 'cylh', [0, -.02, 0], [.07, .26, .07], [.3, .2, .1], .95), WP(1, 'box', [0, .13, 0], [.36, .07, .11], [.85, .7, .3], .95), WP(1, 'box', [0, .66, 0], [.14, 1, .04], [.8, .82, .88], .95, null, { mt: .9, rg: .25, sharp: 1 }));
    a.push(PA('cylh', J_L, [-.07, -.56, .25], [.62, .07, .62], [.6, .12, .14], [PI / 2, 0, .35], L_()), PA('sphere', J_L, [-.09, -.56, .3], [.18, .18, .08], [.95, .8, .3], [PI / 2, 0, .35], L_()));
  }
  if (n.id === 'selene') { // erudita: livro aberto e óculos
    a.push(WP(-1, 'box', [0, .14, .14], [.34, .05, .26], [.3, .15, .1], .35), WP(-1, 'box', [0, .17, .14], [.3, .02, .22], [.95, .9, .78], .35));
    a.push(P('ring', [-.09, 1.8, .22], [.12, .7, .12], [.85, .7, .3], { r: [PI / 2, 0, 0] }), P('ring', [.09, 1.8, .22], [.12, .7, .12], [.85, .7, .3], { r: [PI / 2, 0, 0] }));
  }
  if (n.id === 'elric') { // guarda-florestal: capuz, arco e aljava
    a.push(P('sphere', [0, 1.84, -.1], [.52, .5, .46], [.22, .4, .2]), P('cone', [0, 1.82, -.3], [.3, .5, .3], [.22, .4, .2], { r: [-1.3, 0, 0] }));
    a.push(P('cyl', [0, 1.3, -.22], [.16, .62, .16], [.45, .3, .18], { r: [.35, 0, 0] }));
    const Lb = .62, th = .42, z = .13, tX = -Math.sin(th) * Lb;
    a.push(WP(-1, 'box', [tX / 2, .14 + Math.cos(th) * Lb / 2, z], [.08, Lb, .07], [.45, .3, .15], .08, [0, 0, th]), WP(-1, 'box', [tX / 2, -(.14 + Math.cos(th) * Lb / 2), z], [.08, Lb, .07], [.45, .3, .15], .08, [0, 0, -th]));
  }
  stretchLegs(a, .14);
  return npcCache[n.id] = keepParts(headScale(a, .82));
}

/* ----- monstros (cor c = tonalidade base) ----- */
const MOBM = {
  slime: c => [P('sphere', [0, .4, 0], [1, .8, 1], c, { bob: .05 }), P('sphere', [-.18, .55, .4], [.18, .2, .1], [1, 1, 1]), P('sphere', [.18, .55, .4], [.18, .2, .1], [1, 1, 1]),
    P('sphere', [-.18, .55, .46], [.08, .1, .05], [0, 0, 0]), P('sphere', [.18, .55, .46], [.08, .1, .05], [0, 0, 0]), P('sphere', [-.2, .75, -.1], [.25, .2, .25], shade(c, 1.3))],
  boar: c => boarParts(c),
  wolfm: c => wolfParts(c),
  spider: c => spiderParts(c),
  goblin: c => humanoid({ top: [.45, .3, .2], pants: [.35, .25, .15], boots: [.2, .15, .1], skin: c, sleeve: [.45, .3, .2] }).map(q => ({ ...q, s: q.m === 'sphere' && q.p[1] > 1.7 ? [q.s[0] * 1.3, q.s[1] * 1.1, q.s[2] * 1.3] : q.s })).concat([
    P('cone', [-.3, 1.86, 0], [.12, .35, .1], c, { r: [0, 0, 1.3] }), P('cone', [.3, 1.86, 0], [.12, .35, .1], c, { r: [0, 0, -1.3] }),
    P('cyl', J_R, [.12, .8, .12], [.45, .3, .15], R_({ o: [0, -.4, .14] })), P('sphere', J_R, [.26, .26, .26], [.4, .28, .15], R_({ o: [0, -.02, .14] }))]),
  ent: c => entParts(c),
  skel: c => humanoid({ top: c, pants: c, boots: shade(c, .8), skin: c, sleeve: c, belt: shade(c, .7) }).concat([
    P('box', J_R, [.08, 1.0, .12], [.6, .6, .65], R_({ o: [0, -.1, .14] })), P('sphere', [-.07, 1.8, .19], [.1, .1, .05], [.1, 0, 0]), P('sphere', [.07, 1.8, .19], [.1, .1, .05], [.1, 0, 0]),
    P('box', [0, 1.28, .16], [.4, .06, .02], [.15, .15, .15]), P('box', [0, 1.18, .16], [.4, .06, .02], [.15, .15, .15])]),
  golemm: c => golemParts(c),
  wraith: c => wraithParts(c),
  guardian: c => MOBM.ent(c).concat([P('sphere', [0, 3.4, 0], [.7, .7, .7], [1, .3, .2], { e: 1 }), P('cone', [-.6, 3.3, 0], [.25, .8, .25], [.5, .3, .15], { r: [0, 0, .3] }), P('cone', [.6, 3.3, 0], [.25, .8, .25], [.5, .3, .15], { r: [0, 0, -.3] })]),
  colossus: c => golemParts(c, { rune: [.75, .45, 1] }).concat([P('cyl6', [0, 2.86, .12], [.7, .16, .64], [.95, .8, .3], { mt: .9, rg: .3 }), ...[0, 1, 2, 3, 4].map(k => P('cone', [Math.cos(k / 5 * PI * 2) * .27, 3.06, .12 + Math.sin(k / 5 * PI * 2) * .25], [.12, .32, .12], [.95, .8, .3], { mt: .9, rg: .3 })), P('sbox', [0, 2.2, .44], [1.1, .14, .06], [.95, .8, .3], { mt: .9, rg: .3 })]),
};
/* pata de quadrúpede (coxa, junta e canela + casco/pata no chão); ry 0 = o passo vai para frente/trás */
function quadLeg(a, H, K, F, w, c, foot, sw, ph) { legChain(a, H, K, F, w, c, { ry: 0, sw, ph, foot }); }
/* peça com geometria própria (loft de meshes_extra.js): J = pivô de balanço (quadril, ombro, base da cauda); a geometria já está em coordenadas do modelo */
const geoP = (g, c, J, x) => P('geo', J || [0, 0, 0], [1, 1, 1], c, Object.assign({ g, o: J ? [-J[0], -J[1], -J[2]] : [0, 0, 0] }, x || {}));
/* tom por vértice para pelagem: costas mais escuras, barriga e garganta mais claras (multiplica a cor da peça) */
const furTone = (back, belly) => (nx, ny) => ny > .3 ? back : ny < -.25 ? belly : 1;
/* lobo (também raposa, chacal, lobo glacial, cão infernal, alfa): corpo, pescoço+cabeça, mandíbula, cauda e patas são LOFTS contínuos (sem esferas sobrepostas), com tom por vértice
   (barriga e garganta claras, costas escuras, patas escuras, focinho claro). A cabeça gira no pescoço e a mandíbula abre no ataque; patas e cauda balançam.
   o: ears (escala das orelhas), eye/eyeE (olhos), mane (juba/gola), lean (<1 = mais magro) */
function wolfParts(c, o) {
  o = o || {};
  const ek = o.ears || 1, mn = o.mane || 1, ln = o.lean || 1, eye = o.eye || [1, .8, .1], a = [];
  const dk = shade(c, .6), tooth = [.97, .95, .88], nose = [.07, .05, .05];
  const body = mkLoft([[0, .84, -.74, .19 * ln, .23], [0, .9, -.46, .27 * ln, .3], [0, .87, -.1, .23 * ln, .27], [0, .9, .26, .28 * ln, .35], [0, .9, .56, .3 * ln, .38], [0, .98, .8, .21 * ln, .29]],
    { flat: .22, sides: 10, tone: (nx, ny, nz, px, py) => ny > .35 ? .88 : ny < -.2 ? 1.26 : 1 });
  a.push(geoP(body, c));
  const N = [0, .96, .5], hd = { at: -.35 };
  const head = mkLoft([[0, .98, .7, .2, .26], [0, 1.08, .92, .17, .2], [0, 1.13, 1.06, .2, .2], [0, 1.11, 1.2, .16 * (o.snoutW || 1), .15], [0, 1.04, 1.38, .1 * (o.snoutW || 1), .09], [0, .99, 1.54, .075, .065]],
    { sides: 10, tone: (nx, ny, nz, px, py, pz) => (pz > 1.28 ? 1.28 : ny < -.3 ? 1.24 : ny > .4 ? .92 : 1) });
  a.push(geoP(head, c, N, hd));
  const jaw = mkLoft([[0, .97, 1.0, .08, .055], [0, .93, 1.3, .06, .04], [0, .915, 1.5, .045, .03]], { sides: 8 });
  a.push(geoP(jaw, mix(c, [.95, .93, .88], .35), N, { at: -.75 }));
  a.push(geoP(mkLoft([[0, .995, 1.54, .06, .05], [0, .99, 1.58, .05, .045]], { sides: 8 }), nose, N, hd));
  for (const sx of [-1, 1]) {
    a.push(jointP('cone', N, [sx * .07, .94, 1.38], [.045, .11, .045], tooth, [PI, 0, 0], hd));
    a.push(jointP('cone', N, [sx * .15, 1.4 + (ek - 1) * .1, .86], [.15 * ek, .32 * ek, .09 * ek], c, [-.1, 0, -sx * .16], hd));
    a.push(jointP('cone', N, [sx * .15, 1.37 + (ek - 1) * .1, .885], [.09 * ek, .2 * ek, .05 * ek], mix(c, [.95, .93, .88], .5), [-.1, 0, -sx * .16], hd));
    a.push(jointP('cone', N, [sx * .22, 1.03, .96], [.1 * mn, .22 * mn, .1 * mn], mix(c, [.95, .93, .88], .3), [-.3, 0, -sx * 1.25], hd));
    a.push(jointP('sphere', N, [sx * .14, 1.2, 1.17], [.075, .05, .05], eye, [0, 0, 0], Object.assign({ e: o.eyeE || 1 }, hd)));
    a.push(jointP('sphere', N, [sx * .14, 1.245, 1.14], [.1, .04, .07], dk, [0, 0, sx * .35], hd));
  }
  for (let k = 0; k < 5; k++) a.push(P('cone', [0, 1.1 - k * .035, .5 - k * .19], [.12 * mn, .24 * mn, .12 * mn], dk, { r: [-.5, 0, 0] }));  // crina do dorso
  const T = [0, .88, -.7];
  a.push(geoP(mkLoft([[0, .88, -.7, .1, .1], [0, .78, -1.0, .15, .15], [0, .62, -1.3, .17, .17], [0, .5, -1.52, .08, .08]], { sides: 8, tone: (nx, ny, nz, px, py) => py < .56 ? .55 : 1 }), c, T, { sw: .12, ph: 2 }));
  const legTone = (nx, ny, nz, px, py) => py < .13 ? .52 : py < .3 ? .86 : 1;
  for (const sx of [-1, 1]) {
    const ph1 = sx > 0 ? PI : 0, ph2 = sx > 0 ? 0 : PI;
    const fl = mkLoft([[sx * .2, .88, .38, .14, .18], [sx * .2, .6, .36, .1, .12], [sx * .2, .36, .4, .068, .075], [sx * .2, .15, .41, .062, .068], [sx * .2, .04, .47, .072, .056]], { sides: 8, tone: legTone });
    a.push(geoP(fl, shade(c, .96), [sx * .2, .84, .38], { sw: .55, ph: ph1 }));
    const hl = mkLoft([[sx * .23, .9, -.5, .17, .22], [sx * .24, .58, -.38, .12, .15], [sx * .23, .34, -.6, .074, .08], [sx * .23, .14, -.6, .064, .07], [sx * .23, .04, -.54, .07, .056]], { sides: 8, tone: legTone });
    a.push(geoP(hl, shade(c, .96), [sx * .23, .86, -.5], { sw: .55, ph: ph2 }));
  }
  return a;
}
/* javali: corpo, cabeça com focinho e patas em LOFTS contínuos; corcova e crina de cerdas, presas e cascos */
function boarParts(c) {
  const dk = shade(c, .6), lt = shade(c, 1.12), a = [];
  a.push(geoP(mkLoft([[0, .66, -.84, .3, .34], [0, .74, -.5, .42, .5], [0, .8, -.05, .46, .55], [0, .86, .38, .43, .56], [0, .8, .66, .32, .42]], { flat: .15, sides: 10, tone: (nx, ny) => ny > .4 ? .88 : ny < -.25 ? 1.12 : 1 }), c));
  for (let k = 0; k < 6; k++) a.push(P('cone', [0, 1.18 - Math.abs(k - 1.5) * .04, .46 - k * .2], [.1, .28, .14], dk, { r: [-.5, 0, 0] }));
  const N = [0, .78, .6], hd = { at: -.3 };
  a.push(geoP(mkLoft([[0, .8, .5, .33, .4], [0, .8, .82, .3, .34], [0, .72, 1.08, .2, .22], [0, .6, 1.3, .14, .14], [0, .56, 1.42, .13, .12]], { sides: 10, tone: (nx, ny, nz, px, py, pz) => pz > 1.2 ? 1.2 : 1 }), c, N, hd));
  a.push(geoP(mkLoft([[0, .56, 1.4, .13, .1], [0, .55, 1.46, .12, .09]], { sides: 8 }), [.86, .58, .55], N, hd));
  for (const sx of [-1, 1]) {
    a.push(jointP('cone', N, [sx * .16, .58, 1.34], [.06, .28, .06], [1, .97, .88], [-.35, 0, -sx * .35], hd));
    a.push(jointP('cone', N, [sx * .2, 1.03, .85], [.13, .2, .07], dk, [-.4, 0, -sx * .5], hd));
    a.push(jointP('sphere', N, [sx * .16, .86, 1.1], [.07, .07, .05], [.15, .02, .02], [0, 0, 0], hd));
  }
  a.push(geoP(mkLoft([[0, .8, -.8, .06, .06], [0, .72, -.98, .05, .05], [0, .62, -1.06, .03, .03]], { sides: 6 }), dk, [0, .82, -.78], { sw: .2 }));
  const legTone = (nx, ny, nz, px, py) => py < .1 ? .5 : 1;
  for (const sx of [-1, 1]) {
    a.push(geoP(mkLoft([[sx * .27, .66, .46, .17, .2], [sx * .27, .38, .48, .12, .13], [sx * .27, .1, .5, .1, .1], [sx * .27, .03, .52, .1, .08]], { sides: 8, tone: legTone }), shade(c, .85), [sx * .27, .62, .46], { sw: .7, ph: sx > 0 ? PI : 0 }));
    a.push(geoP(mkLoft([[sx * .27, .66, -.56, .18, .22], [sx * .27, .38, -.62, .12, .13], [sx * .27, .1, -.6, .1, .1], [sx * .27, .03, -.58, .1, .08]], { sides: 8, tone: legTone }), shade(c, .85), [sx * .27, .62, -.56], { sw: .7, ph: sx > 0 ? 0 : PI }));
  }
  return a;
}
/* golem: blocos de pedra arredondados encaixados (quadril, tronco, ombros, braços em 3 partes, pernas com pés no chão).
   o.k: 'ice' (cristais), 'magma' (fendas incandescentes), 'sand' (camadas de arenito) */
/* ent: tronco com raízes que andam, braços-galho com tufos de folhas, rosto entalhado e copa */
function entParts(c) {
  const dk = shade(c, .72), lf = [.22, .52, .2], a = [];
  for (const sx of [-1, 1]) {
    const H = [sx * .3, .95, 0], L = { sw: .35, ph: sx > 0 ? PI : 0 };
    a.push(jointP('tc', H, [sx * .34, .5, 0], [.55, 1.0, .52], dk, [PI, 0, 0], L));
    for (const [ax, az] of [[sx, .5], [sx * .2, 1], [sx * .5, -.8]]) a.push(jointP('cone', H, [sx * .34 + ax * .22, .1, az * .22], [.16, .5, .16], dk, [az * 1.2, 0, -ax * 1.2], L));
  }
  a.push(P('tcw', [0, 1.6, 0], [1.1, 1.6, .95], c), P('cyl', [0, 2.35, 0], [.78, .3, .7], c));
  for (const k of [0, 1, 2, 3]) a.push(P('sbox', [Math.sin(k * 1.6) * .48, 1.5 + (k % 2) * .25, Math.cos(k * 1.6) * .42], [.12, 1.1, .1], dk, { r: [0, k * 1.6, 0] }));
  a.push(P('sbox', [0, 2.06, .44], [.6, .12, .14], dk), P('sphere', [0, 1.62, .45], [.34, .14, .08], [.08, .05, .03]));
  for (const sx of [-1, 1]) a.push(P('sphere', [sx * .17, 1.92, .44], [.14, .1, .06], [1, .8, .2], { e: 1 }));
  a.push(P('sphere', [0, 2.75, 0], [1.9, 1.2, 1.8], lf), P('sphere', [-.7, 3.0, .2], [1.1, .9, 1.1], [.25, .58, .22]), P('sphere', [.68, 2.95, -.2], [1.1, .9, 1.1], [.18, .45, .2]), P('sphere', [0, 3.25, -.1], [.9, .7, .9], [.28, .62, .24]));
  for (const sx of [-1, 1]) {
    const S = [sx * .45, 2.15, 0], E = [sx * 1.0, 1.85, .18], W = [sx * 1.12, 1.2, .32], A = { sw: .3, ph: sx > 0 ? 0 : PI, at: sx > 0 ? 1.2 : 0 };
    a.push(bone('tc', S, S, E, .26, c, A), jointP('sphere', S, E, [.26, .26, .26], dk, [0, 0, 0], A), bone('tc', S, E, W, .2, c, A));
    a.push(jointP('sphere', S, [sx * 1.05, 2.05, .1], [.5, .4, .5], lf, [0, 0, 0], A));
    for (const k of [-1, 0, 1]) a.push(bone('cone', S, [W[0], W[1] + .04, W[2]], [W[0] + sx * .1 + k * .1, W[1] - .32, W[2] + .12 + k * .05], .08, dk, A));
  }
  return a;
}
/* espectro (também banshee e espectro gélido): manto que flutua inteiro (mesmo bob em todas as peças), barra rasgada, capuz com rosto vazio e braços-manga presos aos ombros */
function wraithParts(c, o) {
  o = o || {};
  const B = .08, dk = shade(c, .6), lt = shade(c, 1.2), eye = o.ice ? [.6, .95, 1] : o.banshee ? [.85, .95, 1] : [.4, 1, .9], a = [];
  a.push(P('robe', [0, 1.02, 0], [1.0, 1.6, .9], c, { bob: B }), P('sphere', [0, 1.72, 0], [.78, .46, .62], lt, { bob: B }));
  for (let k = 0; k < 7; k++) { const an = k / 7 * PI * 2; a.push(P('cone', [Math.cos(an) * .36, .2, Math.sin(an) * .34], [.26, .5, .2], k % 2 ? c : dk, { r: [PI + Math.sin(an) * .25, 0, -Math.cos(an) * .25], bob: B })); }
  a.push(P('sphere', [0, 2.04, -.02], [.6, .64, .6], lt, { bob: B }), P('cone', [0, 2.36, -.16], [.3, .38, .3], lt, { r: [-.5, 0, 0], bob: B }));
  a.push(P('sphere', [0, 2.0, .17], [.4, .44, .3], [.03, .02, .05], { bob: B }));
  for (const sx of [-1, 1]) a.push(P('sphere', [sx * .09, 2.04, .31], [.09, .06, .04], eye, { e: 1.4, bob: B }));
  if (o.banshee) {
    a.push(P('sphere', [0, 1.9, .31], [.1, .14, .04], [.15, .15, .3], { e: .8, bob: B }));
    for (let k = 0; k < 5; k++) a.push(P('cone', [(k - 2) * .13, 1.78, -.3], [.12, 1.0, .08], shade(c, 1.45), { r: [.35 + Math.abs(k - 2) * .05, 0, (k - 2) * .1 + PI], bob: B }));
  }
  if (o.ice) for (let k = 0; k < 5; k++) a.push(P('cone6', [(k - 2) * .14, 2.34 - Math.abs(k - 2) * .05, .06], [.1, .34 - Math.abs(k - 2) * .05, .1], [.7, .92, 1], { e: .6, bob: B }));
  for (const sx of [-1, 1]) {
    const S = [sx * .36, 1.8, 0], W = [sx * .62, 1.3, .36], A = { sw: .3, ph: sx > 0 ? 0 : PI, at: sx > 0 ? 1.0 : 0, bob: B };
    a.push(jointP('sphere', S, S, [.3, .3, .3], lt, [0, 0, 0], A), bone('tcw', S, S, W, .26, c, A));
    for (const k of [-1, 0, 1]) a.push(bone('cone', S, [W[0], W[1] - .02, W[2]], [W[0] + k * .08, W[1] - .3, W[2] + .12], .06, [.85, .88, .9], A));
  }
  return a;
}
function golemParts(c, o) {
  o = o || {};
  const rn = o.rune || [.4, .9, 1], dk = shade(c, .78), lt = shade(c, 1.1), a = [];
  for (const sx of [-1, 1]) {
    const H = [sx * .36, 1.2, 0], L = { sw: .4, ph: sx > 0 ? PI : 0 };
    a.push(jointP('sbox', H, [sx * .37, .66, 0], [.5, 1.0, .54], dk, [0, 0, 0], L), jointP('sbox', H, [sx * .38, .12, .08], [.6, .24, .74], shade(c, .7), [0, 0, 0], L));
  }
  a.push(P('sbox', [0, 1.22, 0], [.96, .42, .62], dk), P('sbox', [0, 1.88, 0], [1.4, 1.02, .86], c), P('sbox', [0, 1.62, .1], [1.1, .4, .74], lt));
  a.push(P('sbox', [0, 1.95, .43], [.44, .44, .06], rn, { e: 1 }));
  a.push(P('sbox', [0, 2.58, .12], [.62, .5, .56], lt), P('sbox', [0, 2.72, .1], [.66, .12, .6], dk));
  for (const sx of [-1, 1]) a.push(P('sbox', [sx * .15, 2.6, .41], [.14, .07, .03], rn, { e: 1 }));
  for (const sx of [-1, 1]) {
    const S = [sx * .86, 2.2, 0], A = { sw: .3, ph: sx > 0 ? 0 : PI, at: sx > 0 ? 1.3 : 0 };
    a.push(jointP('sphere', S, [sx * .84, 2.24, 0], [.66, .62, .64], lt, [0, 0, 0], A));
    a.push(jointP('sbox', S, [sx * .92, 1.76, 0], [.42, .74, .44], c, [0, 0, 0], A), jointP('sbox', S, [sx * .95, 1.22, .04], [.5, .6, .52], dk, [0, 0, 0], A), jointP('sphere', S, [sx * .95, .84, .06], [.56, .5, .56], c, [0, 0, 0], A));
  }
  if (o.k === 'ice') {
    const ic = [.75, .92, 1];
    [[-.84, 2.6, -.05, .3], [.84, 2.62, -.05, -.3], [-.3, 2.42, -.35, .2], [.32, 2.4, -.36, -.25], [0, 2.5, -.4, 0]].forEach(([x, y, z, rz]) => a.push(P('cone6', [x, y, z], [.22, .62, .22], ic, { r: [-.35, 0, rz], e: .35 })));
  } else if (o.k === 'magma') {
    const mg = [1, .45, .08];
    a.push(P('sbox', [0, 1.88, .44], [1.0, .06, .05], mg, { e: 1.2 }), P('sbox', [-.3, 1.62, .45], [.06, .45, .05], mg, { e: 1.2 }), P('sbox', [.35, 2.1, .44], [.05, .4, .05], mg, { e: 1.2 }), P('sbox', [0, 1.88, -.44], [.9, .06, .05], mg, { e: 1.2 }));
    for (const sx of [-1, 1]) a.push(jointP('sphere', [sx * .86, 2.2, 0], [sx * .95, .84, .06], [.4, .36, .4], [1, .55, .12], [0, 0, 0], { sw: .3, ph: sx > 0 ? 0 : PI, at: sx > 0 ? 1.3 : 0, e: .9 }));
  } else if (o.k === 'sand') {
    a.push(P('sbox', [0, 2.12, 0], [1.44, .08, .9], shade(c, .82)), P('sbox', [0, 1.64, 0], [1.44, .08, .9], shade(c, .82)));
  }
  return a;
}

/* ----- monstros das regiões novas ----- */
/* osso: peça que liga o ponto A ao ponto B girando em torno da junta J (o +y da malha fica em A).
   Peças com a mesma junta, o mesmo ry e o mesmo sw/ph/at giram juntas como um corpo rígido (nada se solta na animação). */
function bone(m, J, A, B, w, c, x) {
  x = x || {}; const ry = x.ry || 0, d = [A[0] - B[0], A[1] - B[1], A[2] - B[2]], L = Math.hypot(d[0], d[1], d[2]) || 1e-6;
  const cy = Math.cos(ry), sy = Math.sin(ry), u = [d[0] / L, d[1] / L, d[2] / L], v = [cy * u[0] - sy * u[2], u[1], sy * u[0] + cy * u[2]];
  const rz = -Math.asin(Math.max(-1, Math.min(1, v[0]))), rx = Math.atan2(v[2], v[1]);
  return jointP(m, J, [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2], [w, L * (x.k || 1), x.wz || w], c, [rx, ry, rz], x);
}
function jointP(m, J, C, s, c, r, x) { // peça centrada em C, com rotação r, girando em torno da junta J
  const R = M.part([0, 0, 0], r, [0, 0, 0], [1, 1, 1]), w = [C[0] - J[0], C[1] - J[1], C[2] - J[2]];
  const o = [R[0] * w[0] + R[1] * w[1] + R[2] * w[2], R[4] * w[0] + R[5] * w[1] + R[6] * w[2], R[8] * w[0] + R[9] * w[1] + R[10] * w[2]];
  const q = Object.assign({}, x || {}); delete q.ry; delete q.k; delete q.wz;
  return P(m, J, s, c, Object.assign(q, { o, r }));
}
/* perna articulada (coxa + junta + canela) que pisa no chão em F; gira inteira em torno do quadril H */
function legChain(a, H, K, F, w, c, x) {
  x = x || {};
  const ry = Math.atan2(-(F[2] - H[2]), F[0] - H[0]), cy = Math.cos(ry), sy = Math.sin(ry); // eixo x local = direção horizontal da perna (o passo vai para frente/trás)
  const rv = p => { const dx = p[0] - H[0], dz = p[2] - H[2]; return [H[0] + cy * dx - sy * dz, p[1], H[2] + sy * dx + cy * dz]; }; // gira -ry em torno do quadril: a peça gira ry e cai de volta no lugar
  const r0 = rv(H), r1 = rv(K), r2 = rv(F), q = Object.assign({}, x); delete q.foot; delete q.ry;
  const g = mkLoft([[r0[0], r0[1], r0[2], w * .5, w * .5], [r1[0], r1[1], r1[2], w * .47, w * .47], [r2[0], r2[1], r2[2], w * .38, w * .38]], { sides: 8, sub: 3, up: [0, 0, 1] });
  a.push(P('geo', H, [1, 1, 1], c, Object.assign({ g, o: [-H[0], -H[1], -H[2]], r: [0, ry, 0] }, q)));
  if (x.foot) a.push(jointP('sphere', H, [F[0], F[1] + w * .3, F[2]], [w * 1.1, w * .7, w * 1.1], x.foot, [0, ry, 0], q));
}
/* escorpião: cefalotórax + abdômen em placas, 8 patas articuladas, pedipalpos com pinças que abrem no ataque e cauda curva com ferrão que golpeia */
function scorpParts(c, o) {
  o = o || {};
  const dk = shade(c, .72), lt = shade(c, 1.12), leg = shade(c, .8), sting = o.sting || [.85, .22, .12], a = [];
  // corpo
  a.push(P('sphere', [0, .4, .42], [.78, .34, .74], c), P('sphere', [0, .5, .46], [.6, .2, .58], lt), P('sbox', [0, .53, .62], [.36, .07, .28], shade(c, .9)));
  a.push(P('sphere', [0, .38, -.28], [.72, .3, 1.02], dk));
  [[.08, .84, .34], [-.14, .86, .35], [-.36, .82, .34], [-.57, .74, .32], [-.76, .6, .3]].forEach(([z, w, h], i) => a.push(P('sphere', [0, .43 + (i < 3 ? .01 : 0), z], [w, h, .3], i % 2 ? c : lt)));
  // olhos e quelíceras
  for (const sx of [-1, 1]) a.push(P('sphere', [sx * .08, .59, .68], [.06, .06, .05], [1, .25, .1], { e: 1 }), P('sphere', [sx * .2, .52, .74], [.04, .04, .04], [1, .25, .1], { e: 1 }), P('sbox', [sx * .08, .36, .8], [.1, .1, .14], dk, { r: [.2, 0, 0] }));
  // cauda: 5 segmentos + vesícula + ferrão, todos girando em torno da base (golpe para frente no ataque)
  const T = [[0, .46, -.86], [0, .66, -1.12], [0, .98, -1.26], [0, 1.31, -1.2], [0, 1.56, -.98], [0, 1.67, -.7]], J = T[0], tl = { sw: .06, ph: 1, at: -.6 };
  a.push(geoP(mkLoft([[...T[0], .15, .15], [...T[1], .135, .135], [...T[2], .125, .125], [...T[3], .115, .115], [...T[4], .105, .105], [...T[5], .13, .13], [0, 1.6, -.44, .15, .15]], { sides: 9, sub: 3, up: [1, 0, 0], tone: (nx, ny, nz, px, py) => py > 1.5 ? .85 : 1 }), c, J, tl));
  a.push(bone('cone', J, [0, 1.55, -.42], [0, 1.36, -.24], .1, sting, Object.assign({ e: o.stingE || .4 }, tl)));
  // pedipalpos com pinças (o dedo móvel abre para cima no ataque)
  for (const sx of [-1, 1]) {
    const S = [sx * .26, .42, .72], E = [sx * .62, .5, .9], W = [sx * .56, .48, 1.22], H0 = [sx * .52, .46, 1.36], H1 = [sx * .5, .46, 1.62];
    a.push(geoP(mkLoft([[...S, .075, .075], [...E, .07, .07], [...W, .08, .08]], { sides: 8, sub: 3, up: [0, 1, 0] }), leg));
    a.push(bone('sphere', H0, [sx * .54, .47, 1.2], H1, .36, lt, { wz: .28, k: 1.2 }));
    a.push(bone('cone', H1, [sx * .44, .44, 1.58], [sx * .4, .43, 1.95], .14, dk, { k: 1, wz: .1 }));
    const Hm = [sx * .55, .52, 1.58];
    a.push(bone('cone', Hm, [sx * .56, .53, 1.54], [sx * .49, .56, 1.93], .14, dk, { at: .6, wz: .1 }));
  }
  // 8 patas: tetrápode alternado, pés no chão
  [[.56, .7, 1], [.42, .25, 1.02], [.27, -.18, 1.06], [.12, -.6, 1.12]].forEach(([hz, ang, len], i) => {
    for (const sx of [-1, 1]) {
      const H = [sx * .28, .38, hz], dx = Math.cos(ang) * sx, dz = Math.sin(ang);
      const K = [H[0] + dx * .3 * len, .6, H[2] + dz * .3 * len], F = [H[0] + dx * .64 * len, .01, H[2] + dz * .64 * len];
      legChain(a, H, K, F, .105, leg, { sw: .32, ph: ((i + (sx > 0 ? 1 : 0)) % 2) * PI });
    }
  });
  return a;
}
MOBM.scorpion = c => scorpParts(c);
/* múmia: corpo humano enfaixado, braços estendidos para frente, faixas soltas e olhos verdes */
function mummyParts(c, eye) {
  const b1 = shade(c, .88), b2 = shade(c, 1.06), ARM = { 1.52: 1, 1.55: 1 };
  const a = humanoid({ top: c, pants: b1, boots: shade(c, .78), skin: c, sleeve: b2, belt: shade(c, .7), hair: null })
    .filter(q => !(q.p[1] > 1.6 && q.p[1] < 1.95 && Math.abs(q.p[2]) > .12 && q.m !== 'head')) // tira sobrancelhas/nariz/boca do rosto padrão
    .map(q => ARM[q.p[1]] && Math.abs(Math.abs(q.p[0]) - .38) < .01 ? Object.assign({}, q, { r: [-1.25, 0, 0] }) : q);
  [1.08, 1.22, 1.36, 1.5].forEach((y, k) => a.push(P('cylh', [0, y, 0], [.74 - Math.abs(y - 1.3) * .2, .05, .42], k % 2 ? b1 : b2, { r: [0, 0, k % 2 ? .08 : -.08] })));
  [1.7, 1.84, 1.95].forEach((y, k) => a.push(P('cylh', [0, y, 0], [.45 - (k > 1 ? .06 : 0), .05, .46], k % 2 ? b1 : b2, { r: [k % 2 ? .1 : -.1, 0, 0] })));
  for (const sx of [-1, 1]) {
    a.push(P('sphere', [sx * .08, 1.79, .2], [.07, .05, .04], eye || [.3, 1, .6], { e: 1.3 }));
    const K = { sw: .9, ph: sx < 0 ? 0 : PI }, x = sx * .16;
    for (const y of [-.2, -.38, -.58]) a.push(P('cylh', [x, .88, 0], [.3, .05, .31], y === -.38 ? b2 : b1, Object.assign({ o: [0, y, 0], r: [0, 0, .12 * sx] }, K)));
    const A = { sw: .8, ph: sx < 0 ? PI : 0, at: sx > 0 ? 1.5 : 0 };
    a.push(P('box', [sx * .38, 1.52, 0], [.07, .4, .02], b2, Object.assign({ o: [sx * .05, -.62, -.1], r: [-1.25, 0, 0] }, A)));
  }
  a.push(P('box', [.1, .95, .2], [.08, .5, .02], b2, { r: [.1, 0, .15] }));
  return a;
}
MOBM.mummy = c => mummyParts(c);
MOBM.yeti = c => { // yeti: corpanzil peludo, pernas curtas e grossas, braços longos com punhos perto do chão, rosto azulado e chifres
  const d = shade(c, .85), sk = [.55, .7, .85], a = [];
  for (const sx of [-1, 1]) {
    const H = [sx * .38, 1.2, 0], L = { sw: .4, ph: sx > 0 ? PI : 0 };
    a.push(bone('sphere', H, H, [sx * .42, .55, .1], .6, d, Object.assign({ k: 1.25 }, L)), bone('tc', H, [sx * .42, .6, .1], [sx * .42, .14, 0], .48, d, L), jointP('sbox', H, [sx * .42, .1, .14], [.52, .2, .72], sk, [0, 0, 0], L));
  }
  a.push(P('sphere', [0, 1.3, 0], [1.15, .7, .85], d), P('sphere', [0, 1.98, 0], [1.6, 1.45, 1.1], c), P('sphere', [0, 1.95, .26], [1.0, 1.0, .7], shade(c, 1.08)));
  a.push(P('sphere', [0, 2.72, .22], [.8, .74, .74], shade(c, 1.1)), P('sphere', [0, 2.66, .5], [.52, .42, .26], sk), P('sbox', [0, 2.52, .62], [.26, .06, .05], [.15, .2, .3]));
  for (const sx of [-1, 1]) {
    a.push(P('sphere', [sx * .16, 2.76, .6], [.09, .09, .05], [.2, .6, 1], { e: 1 }), P('cone', [sx * .36, 3.08, .18], [.18, .55, .18], [.8, .9, 1], { r: [-.2, 0, -sx * .5] }));
    const S = [sx * .92, 2.38, 0], E = [sx * 1.12, 1.62, .14], W = [sx * 1.14, .9, .3], A = { sw: .35, ph: sx > 0 ? 0 : PI, at: sx > 0 ? 1.3 : 0 };
    a.push(jointP('sphere', S, S, [.74, .74, .74], c, [0, 0, 0], A), bone('sphere', S, S, E, .52, d, Object.assign({ k: 1.2 }, A)), bone('tc', S, E, W, .46, d, A), jointP('sphere', S, [W[0], W[1] - .14, W[2] + .02], [.5, .46, .5], sk, [0, 0, 0], A));
  }
  return a;
};
MOBM.imp = c => { // diabrete: patas dobradas no chão, braços nos ombros, asas de morcego presas às costas (batem), cauda com ponta de flecha
  const dk = shade(c, .7), lt = shade(c, 1.15), a = [];
  for (const sx of [-1, 1]) legChain(a, [sx * .16, .8, 0], [sx * .18, .44, .14], [sx * .18, .03, -.02], .15, dk, { ry: 0, sw: .6, ph: sx > 0 ? PI : 0, foot: [.15, .08, .08] });
  a.push(P('sphere', [0, .84, 0], [.44, .32, .36], dk), P('sphere', [0, 1.12, 0], [.58, .62, .46], c), P('sphere', [0, 1.06, .12], [.36, .4, .26], lt));
  a.push(P('sphere', [0, 1.6, .06], [.5, .46, .44], lt), P('sbox', [0, 1.5, .26], [.22, .05, .04], [.15, .03, .03]));
  for (const sx of [-1, 1]) {
    a.push(P('cone', [sx * .15, 1.86, .02], [.1, .32, .1], [.2, .1, .1], { r: [-.3, 0, -sx * .35] }), P('cone', [sx * .27, 1.62, 0], [.08, .24, .06], lt, { r: [0, 0, -sx * 1.3] }));
    a.push(P('sphere', [sx * .11, 1.65, .26], [.08, .08, .05], [1, .8, .1], { e: 1 }));
    const S = [sx * .3, 1.3, 0], E = [sx * .44, 1.0, .12], W = [sx * .46, .74, .28], A = { sw: .5, ph: sx > 0 ? 0 : PI, at: sx > 0 ? 1.4 : 0 };
    a.push(jointP('sphere', S, S, [.2, .2, .2], c, [0, 0, 0], A), bone('tc', S, S, E, .13, c, A), bone('tc', S, E, W, .11, c, A));
    for (const k of [-1, 1]) a.push(bone('cone', S, W, [W[0] + k * .05, W[1] - .16, W[2] + .08], .05, [.9, .85, .7], A));
    const Wg = [sx * .14, 1.36, -.2], wr = [0, sx * .45, -sx * .35], F = { fl: sx * .45, ph: 0 }, Rm = M.part([0, 0, 0], wr, [0, 0, 0], [1, 1, 1]), C = [sx * .46, 1.6, -.36];
    a.push(jointP('box', Wg, C, [.72, .5, .03], [.32, .1, .12], wr, F), jointP('box', Wg, [C[0] + Rm[4] * .26, C[1] + Rm[5] * .26, C[2] + Rm[6] * .26], [.76, .06, .06], dk, wr, F));
    for (const k of [-.22, .08]) a.push(jointP('cone', Wg, [C[0] + Rm[0] * k - Rm[4] * .3, C[1] + Rm[1] * k - Rm[5] * .3, C[2] + Rm[2] * k - Rm[6] * .3], [.2, .14, .03], [.32, .1, .12], [wr[0], wr[1], wr[2] + PI], F));
  }
  const T = [0, .82, -.22], tl = { sw: .2, ph: 1 };
  a.push(bone('tc', T, T, [0, .5, -.55], .09, c, tl), bone('tc', T, [0, .5, -.55], [0, .64, -.9], .07, c, tl), bone('cone', T, [0, .68, -.88], [0, .74, -1.08], .16, [.9, .25, .1], Object.assign({ e: .6, wz: .05 }, tl)));
  return a;
};
MOBM.jackal = c => wolfParts(c, { ears: 1.5, lean: .85, mane: .7 });
MOBM.frostwolf = c => { const a = wolfParts(c, { eye: [.4, .8, 1], eyeE: 1.3 }); for (let k = 0; k < 4; k++) a.push(P('cone6', [0, 1.12 - k * .03, .36 - k * .26], [.12, .3, .12], [.75, .92, 1], { r: [-.4, 0, 0], e: .25 })); return a; };
MOBM.hellhound = c => { const a = wolfParts(c, { eye: [1, .45, .1], eyeE: 1.6 }); for (let k = 0; k < 5; k++) a.push(P('cone', [0, 1.14 - k * .03, .42 - k * .24], [.13, .34, .13], k % 2 ? [1, .75, .2] : [1, .4, .1], { e: 1, r: [-.4, 0, 0] })); return a; };
MOBM.sandgolem = c => golemParts(c, { k: 'sand', rune: [1, .7, .25] });
MOBM.icegolem = c => golemParts(c, { k: 'ice', rune: [.5, .9, 1] });
MOBM.magmagolem = c => golemParts(c, { k: 'magma', rune: [1, .5, .1] });
MOBM.frostwraith = c => wraithParts(c, { ice: 1 });
MOBM.lavaslime = c => MOBM.slime(c);
MOBM.scorpqueen = c => {
  const G0 = [.95, .78, .3], a = scorpParts(c, { sting: [1, .55, .15], stingE: 1 });
  a.push(P('cyl6', [0, .62, .5], [.36, .1, .32], G0, { mt: .9, rg: .3 }), P('sphere', [0, .66, .68], [.08, .08, .06], [1, .25, .2], { e: 1.2 }));
  for (let k = 0; k < 5; k++) { const an = (k / 4 - .5) * 2.2; a.push(P('cone', [Math.sin(an) * .15, .78, .5 + Math.cos(an) * .13], [.06, .22, .06], G0, { mt: .9, rg: .3 })); }
  [[-.14, .58], [-.36, .56], [-.57, .5]].forEach(([z, y]) => a.push(P('cone', [0, y + .06, z], [.08, .2, .08], G0, { r: [-.3, 0, 0], mt: .8, rg: .35 })));
  return a;
};
MOBM.yetiking = c => MOBM.yeti(c).concat([P('cone6', [0, 3.3, .1], [.7, .45, .7], [.55, .85, 1], { e: .6 }), P('cone', [-.45, 3.45, .1], [.14, .5, .14], [.6, .9, 1], { e: .6 }), P('cone', [.45, 3.45, .1], [.14, .5, .14], [.6, .9, 1], { e: .6 })]);
MOBM.ignar = c => golemParts(c).concat([P('cone', [-.35, 3.1, 0], [.18, .9, .18], [.15, .08, .08], { r: [0, 0, .4] }), P('cone', [.35, 3.1, 0], [.18, .9, .18], [.15, .08, .08], { r: [0, 0, -.4] }), P('sphere', [0, 1.75, .45], [.55, .55, .3], [1, .45, .1], { e: 1.2 }), P('cone6', [0, 3.2, 0], [.5, .7, .5], [1, .5, .1], { e: .8 })]);


/* ----- monstros do bestiário (estilo dark fantasy) ----- */
/* asas de morcego/dragão: braço + 4 dedos em leque saindo do ombro, com membrana (placa fina) entre eles; batem como as demais (fl) */
function fanWings(a, y, z, bone, mem, sc) {
  for (const s of [-1, 1]) {
    const sh = [s * .35 * sc, y, z], fl = s * .5;
    a.push(P('box', sh, [1.5 * sc, .16 * sc, .17 * sc], bone, { o: [s * .75 * sc, .2 * sc, 0], fl, r: [0, 0, s * .15], sharp: 1 }));
    for (let k = 0; k < 4; k++) {
      const ang = s * (.05 + k * .4), L = (2.8 - k * .3) * sc;
      a.push(P('box', sh, [L, .07 * sc, .07 * sc], bone, { o: [s * L / 2, .12 * sc, 0], fl, r: [0, ang, s * .12], sharp: 1 }));
      a.push(P('box', sh, [L * .97, .03, .95 * sc], mem, { o: [s * L / 2, .1 * sc, -.45 * sc], fl, r: [0, ang, s * .12], sharp: 1 }));
    }
  }
}
const wingPair = (y, z, c, len) => [-1, 1].map(sd => P('box', [sd * .35, y, z], [len, .1, len * .5], c, { o: [sd * len * .5, .1, 0], fl: sd * .5, r: [0, 0, sd * .12] }));
MOBM.rat = c => {
  const a = [P('sphere', [0, .36, 0], [.5, .42, .95], c), P('sphere', [0, .4, .55], [.32, .3, .42], shade(c, 1.1)), P('cone', [0, .36, .86], [.12, .22, .12], [.95, .7, .7], { r: [1.57, 0, 0] }),
    P('sphere', [-.12, .56, .45], [.12, .14, .06], [.9, .6, .6]), P('sphere', [.12, .56, .45], [.12, .14, .06], [.9, .6, .6]),
    P('sphere', [-.08, .46, .72], [.05, .05, .04], [1, .2, .1], { e: 1 }), P('sphere', [.08, .46, .72], [.05, .05, .04], [1, .2, .1], { e: 1 }),
    P('cyl6', [0, .3, -.85], [.07, 1.0, .07], [.85, .6, .6], { r: [1.3, 0, 0], bob: .05 })];
  for (const [x, z, ph] of [[-.2, .3, 0], [.2, .3, PI], [-.2, -.3, PI], [.2, -.3, 0]]) a.push(P('box', [x, .2, z], [.1, .26, .1], shade(c, .7), { o: [0, -.1, 0], sw: 1, ph }));
  return a;
};
/* gremlin: criatura pequena de orelhas enormes e olhos esbugalhados (campo de treinamento) */
MOBM.gremlin = c => {
  const dk = shade(c, .62), lt = shade(c, 1.2), a = [P('sphere', [0, .5, 0], [.5, .56, .42], c), P('sphere', [0, .46, .12], [.34, .4, .3], lt), P('sphere', [0, 1.02, .05], [.62, .5, .54], c),
    P('box', [0, .36, .02], [.5, .26, .46], [.4, .28, .15]), P('sphere', [0, .92, .27], [.24, .1, .06], [.16, .06, .08]), P('sphere', [0, 1.0, .33], [.09, .07, .06], dk)];
  for (const sx of [-1, 1]) {
    a.push(P('cone', [sx * .34, 1.12, 0], [.14, .6, .12], c, { r: [0, 0, -sx * 1.25] }), P('cone', [sx * .36, 1.12, .02], [.08, .4, .06], [.9, .6, .6], { r: [0, 0, -sx * 1.25] }));
    a.push(P('sphere', [sx * .16, 1.1, .28], [.2, .22, .12], [1, .95, .4], { e: .7 }), P('sphere', [sx * .16, 1.1, .35], [.06, .14, .05], [.08, .06, .04]));
    a.push(P('box', [sx * .34, .72, 0], [.1, .46, .1], dk, { o: [0, -.18, 0], sw: .9, ph: sx > 0 ? 0 : PI }));
    a.push(P('box', [sx * .15, .22, 0], [.12, .3, .12], dk, { o: [0, -.1, 0], sw: 1, ph: sx > 0 ? PI : 0 }), P('box', [sx * .15, .04, .1], [.14, .06, .22], shade(dk, .8)));
  }
  a.push(P('cyl6', [.4, .5, .22], [.07, .8, .07], [.45, .3, .16], { r: [.5, 0, .35], o: [0, .15, 0], sw: .9, ph: 0 }), P('sphere', [.52, .82, .38], [.18, .18, .18], [.5, .34, .18]));
  return a;
};
/* minilagarto: corpo baixo, cauda comprida e crista de espinhos nas costas */
MOBM.lizard = c => {
  const lt = mix(c, [1, .95, .55], .4), dk = shade(c, .6), a = [P('sphere', [0, .3, 0], [.46, .3, .95], c), P('sphere', [0, .22, .05], [.34, .2, .7], lt), P('sphere', [0, .34, .82], [.34, .26, .5], shade(c, 1.1)),
    P('cone', [0, .3, 1.1], [.2, .3, .18], shade(c, 1.15), { r: [1.57, 0, 0] }), P('cone', [0, .3, -1.0], [.2, 1.3, .2], c, { r: [-1.5, 0, 0], bob: .08 })];
  for (const sx of [-1, 1]) a.push(P('sphere', [sx * .16, .44, .84], [.12, .12, .1], [1, .85, .2], { e: .8 }), P('sphere', [sx * .16, .45, .9], [.03, .1, .04], [.06, .05, .03]));
  for (let k = 0; k < 6; k++) a.push(P('cone', [0, .6 - Math.abs(k - 2) * .02, .6 - k * .3], [.1, .24, .1], dk));
  for (const [x, z, ph] of [[-.34, .45, 0], [.34, .45, PI], [-.34, -.4, PI], [.34, -.4, 0]]) a.push(P('box', [x, .16, z], [.1, .3, .13], dk, { o: [Math.sign(x) * .08, -.06, 0], sw: 1, ph }));
  return a;
};
MOBM.bandit = c => {
  const a = humanoid({ top: c, pants: shade(c, .6), boots: [.15, .1, .08], hair: [.2, .15, .1] });
  a.push(P('sphere', [0, 1.82, -.05], [.5, .44, .5], shade(c, .6)), P('box', [0, 1.74, .2], [.38, .16, .05], [.12, .1, .1]), P('box', [0, 1.1, -.2], [.56, .9, .05], shade(c, .5), { bob: .02 }));
  a.push(P('box', J_R, [.05, .55, .05], [.82, .84, .9], R_({ o: [0, -.62, .2] })), P('box', J_R, [.16, .05, .05], [.4, .3, .2], R_({ o: [0, -.4, .2] })));
  return a;
};
MOBM.orc = c => {
  const a = humanoid({ top: shade(c, .55), pants: [.28, .2, .14], boots: [.18, .12, .08], skin: c, hair: null });
  for (const sd of [-1, 1]) a.push(P('cone', [sd * .1, 1.68, .22], [.05, .16, .05], [.95, .92, .8], { r: [0, 0, 0] }), P('sphere', [sd * .43, 1.66, 0], [.3, .24, .3], [.4, .32, .24]), P('cone', [sd * .47, 1.84, 0], [.1, .26, .1], [.7, .7, .74], { r: [0, 0, -sd * .4] }));
  a.push(P('cyl6', J_R, [.07, 1.3, .07], [.4, .28, .16], R_({ o: [0, -.5, .22] })), P('box', J_R, [.55, .42, .06], [.62, .64, .7], R_({ o: [.28, -.1, .22] })), P('box', [0, 1.14, .17], [.5, .5, .05], [.45, .34, .22]));
  return a;
};
MOBM.necro = c => {
  const a = humanoid({ top: c, pants: c, boots: c, hair: null, legs: false, skin: [.7, .72, .66] });
  a.push(P('cone', [0, .6, 0], [.95, 1.25, .95], c), P('sphere', [0, 1.84, -.08], [.5, .48, .46], shade(c, 1.1)), P('sphere', [-.09, 1.8, .2], [.07, .07, .04], [.3, 1, .4], { e: 1.4 }), P('sphere', [.09, 1.8, .2], [.07, .07, .04], [.3, 1, .4], { e: 1.4 }));
  a.push(P('cyl6', J_R, [.07, 2.2, .07], [.25, .2, .18], R_({ o: [0, -.2, .22] })), P('sphere', J_R, [.26, .26, .26], [.3, 1, .4], R_({ o: [0, .95, .22], e: 1.3 })), P('sphere', J_R, [.2, .2, .2], [.9, .9, .85], R_({ o: [0, .7, .22] })));
  for (const sd of [-1, 1]) a.push(P('sphere', [sd * .7, 1.4, .3], [.14, .14, .14], [.3, 1, .4], { e: 1.2, bob: .15 }));
  return a;
};
MOBM.banshee = c => wraithParts(c, { banshee: 1 });
MOBM.fireelem = c => { // elemental de fogo: tronco de chamas sobre uma base de labaredas, braços presos aos ombros com punhos em brasa, coroa de chamas
  const B = .04, a = [P('sphere', [0, 1.15, 0], [1.0, 1.3, .9], c, { e: .4, bob: B }), P('sphere', [0, 1.7, 0], [1.2, .7, .9], shade(c, 1.1), { e: .45, bob: B }), P('sphere', [0, 2.15, .05], [.68, .68, .62], shade(c, 1.15), { e: .5, bob: B })];
  for (const sx of [-1, 1]) a.push(P('sphere', [sx * .14, 2.2, .32], [.12, .12, .05], [1, 1, .8], { e: 1.2, bob: B }));
  for (let k = 0; k < 6; k++) { const an = k / 6 * PI * 2; a.push(P('cone', [Math.cos(an) * .3, .3, Math.sin(an) * .28], [.4, .7, .4], k % 2 ? shade(c, .85) : [1, .7, .2], { e: .35, r: [PI + Math.sin(an) * .3, 0, -Math.cos(an) * .3], bob: B })); }
  for (const sx of [-1, 1]) {
    const S = [sx * .55, 1.78, 0], E = [sx * .85, 1.35, .15], W = [sx * .88, .98, .32], A = { sw: .5, ph: sx > 0 ? 0 : PI, at: sx > 0 ? 1.3 : 0, bob: B };
    a.push(jointP('sphere', S, S, [.46, .46, .46], c, [0, 0, 0], Object.assign({ e: .45 }, A)), bone('tc', S, S, E, .32, c, Object.assign({ e: .4 }, A)), bone('tc', S, E, W, .28, shade(c, 1.1), Object.assign({ e: .5 }, A)), jointP('sphere', S, W, [.36, .36, .36], [1, .8, .3], [0, 0, 0], Object.assign({ e: .9 }, A)));
  }
  for (let k = 0; k < 5; k++) a.push(P('cone', [(k - 2) * .17, 2.62 + (k % 2) * .12 - Math.abs(k - 2) * .06, -.04], [.2, .6, .2], [1, .75 - (k % 2) * .2, .15], { e: .8, bob: B, r: [-.15, 0, (k - 2) * -.15] }));
  return a;
};
MOBM.waterelem = c => { // elemental de água: coluna de onda que se alarga no chão, tronco e cabeça presos, braços pelos ombros e gotas orbitando
  const B = .05, lt = shade(c, 1.2), a = [P('tcw', [0, .75, 0], [1.25, 1.5, 1.15], c, { e: .3, bob: B }), P('sphere', [0, .08, 0], [1.4, .25, 1.3], shade(c, .9), { e: .3 }),
    P('sphere', [0, 1.62, 0], [1.0, .8, .78], c, { e: .35, bob: B }), P('sphere', [0, 2.15, .05], [.62, .6, .58], lt, { e: .45, bob: B }), P('cone', [0, 2.38, -.2], [.3, .6, .3], lt, { e: .45, r: [-.9, 0, 0], bob: B })];
  for (const sx of [-1, 1]) a.push(P('sphere', [sx * .13, 2.2, .3], [.11, .11, .05], [1, 1, 1], { e: 1.5, bob: B }));
  for (const sx of [-1, 1]) {
    const S = [sx * .42, 1.82, 0], E = [sx * .78, 1.45, .14], W = [sx * .86, 1.08, .3], A = { sw: .4, ph: sx > 0 ? 0 : PI, at: sx > 0 ? 1.2 : 0, bob: B, e: .35 };
    a.push(jointP('sphere', S, S, [.38, .38, .38], c, [0, 0, 0], A), bone('tc', S, S, E, .27, c, A), bone('tc', S, E, W, .23, lt, A), jointP('sphere', S, W, [.3, .3, .3], lt, [0, 0, 0], A));
  }
  for (let k = 0; k < 4; k++) a.push(P('sphere', [Math.cos(k * 1.57) * .95, .7 + k * .25, Math.sin(k * 1.57) * .95], [.2, .2, .2], [.7, .9, 1], { e: .8, bob: .1 }));
  return a;
};
MOBM.minotaur = c => {
  const d = shade(c, .8), a = [P('box', [-.32, .65, 0], [.45, 1.3, .5], d, { o: [0, -.1, 0], sw: .5, ph: 0 }), P('box', [.32, .65, 0], [.45, 1.3, .5], d, { o: [0, -.1, 0], sw: .5, ph: PI }),
    P('box', [-.32, .12, .05], [.5, .24, .6], [.15, .12, .1], { o: [0, -.1, 0], sw: .5, ph: 0 }), P('box', [.32, .12, .05], [.5, .24, .6], [.15, .12, .1], { o: [0, -.1, 0], sw: .5, ph: PI }),
    P('box', [0, 1.8, 0], [1.4, 1.3, .8], c), P('box', [0, 1.2, .1], [1.0, .3, .7], [.3, .22, .16]), P('box', [0, 2.65, .12], [.72, .72, .8], shade(c, 1.1)), P('box', [0, 2.5, .62], [.44, .34, .3], [.8, .6, .55]), P('sphere', [0, 2.45, .78], [.08, .08, .05], [.9, .8, .3], { e: 1 }),
    P('sphere', [-.17, 2.78, .5], [.09, .09, .05], [1, .3, .15], { e: 1.4 }), P('sphere', [.17, 2.78, .5], [.09, .09, .05], [1, .3, .15], { e: 1.4 }),
    P('cone', [-.45, 3.05, .1], [.14, .6, .14], [.92, .9, .8], { r: [0, 0, .7] }), P('cone', [.45, 3.05, .1], [.14, .6, .14], [.92, .9, .8], { r: [0, 0, -.7] }),
    P('box', [-.95, 2.2, 0], [.5, 1.4, .5], d, { o: [0, -.55, 0], sw: .35, ph: PI }), P('box', [.95, 2.2, 0], [.5, 1.4, .5], d, { o: [0, -.55, 0], sw: .35, ph: 0, at: 1.4 }),
    P('cyl6', [.95, 2.2, 0], [.1, 1.8, .1], [.4, .28, .16], { o: [0, -1.2, .3], sw: .35, ph: 0, at: 1.4 }), P('box', [.95, 2.2, 0], [.8, .55, .08], [.65, .66, .72], { o: [.35, -1.7, .3], sw: .35, ph: 0, at: 1.4 })];
  return a;
};

/* urso (e urso polar): corpo maciço com corcova, cabeça larga de focinho curto, patas grossas — LOFTS contínuos; orelhas redondas e garras */
function bearParts(c) {
  const dk = shade(c, .6), claw = [.93, .9, .8], snout = mix(c, [.88, .78, .66], .5), a = [];
  a.push(geoP(mkLoft([[0, .9, -.95, .46, .5], [0, 1.0, -.55, .6, .66], [0, 1.1, -.05, .62, .72], [0, 1.26, .42, .58, .76], [0, 1.2, .8, .4, .54]], { flat: .12, sides: 12, tone: (nx, ny) => ny > .45 ? 1.04 : ny < -.3 ? .9 : 1 }), c));
  const N = [0, 1.14, .94], hd = { at: -.3 };
  a.push(geoP(mkLoft([[0, 1.18, .74, .4, .5], [0, 1.18, 1.0, .36, .4], [0, 1.1, 1.3, .27, .27], [0, 1.02, 1.56, .17, .16], [0, .98, 1.7, .14, .12]], { sides: 12, tone: (nx, ny, nz, px, py, pz) => pz > 1.4 ? 1.16 : 1 }), c, N, hd));
  a.push(geoP(mkLoft([[0, .98, 1.68, .13, .1], [0, .97, 1.76, .1, .08]], { sides: 8 }), [.07, .05, .05], N, hd));
  a.push(geoP(mkLoft([[0, .94, 1.15, .1, .06], [0, .9, 1.55, .09, .05]], { sides: 8 }), shade(snout, .85), N, { at: -.7 }));
  for (const sx of [-1, 1]) {
    a.push(jointP('sphere', N, [sx * .3, 1.5, 1.02], [.22, .22, .1], c, [0, 0, 0], hd), jointP('sphere', N, [sx * .3, 1.5, 1.07], [.12, .12, .06], dk, [0, 0, 0], hd));
    a.push(jointP('sphere', N, [sx * .17, 1.24, 1.5], [.06, .06, .04], [.08, .05, .03], [0, 0, 0], hd));
  }
  a.push(P('sphere', [0, .98, -1.08], [.26, .26, .26], shade(c, .9)));
  const legTone = (nx, ny, nz, px, py) => py < .12 ? .6 : 1;
  for (const sx of [-1, 1]) {
    a.push(geoP(mkLoft([[sx * .42, .95, .55, .26, .3], [sx * .43, .55, .6, .2, .22], [sx * .43, .22, .62, .17, .18], [sx * .43, .05, .68, .18, .13]], { sides: 10, tone: legTone }), shade(c, .93), [sx * .42, .9, .55], { sw: .45, ph: sx > 0 ? PI : 0 }));
    a.push(geoP(mkLoft([[sx * .42, .95, -.7, .28, .34], [sx * .43, .55, -.78, .2, .24], [sx * .43, .22, -.76, .17, .18], [sx * .43, .05, -.7, .18, .13]], { sides: 10, tone: legTone }), shade(c, .93), [sx * .42, .9, -.7], { sw: .45, ph: sx > 0 ? 0 : PI }));
    for (const k of [-1, 0, 1]) a.push(P('cone', [sx * .43 + k * .1, .06, .86], [.05, .12, .05], claw, { r: [1.5, 0, 0], sw: .45, ph: sx > 0 ? PI : 0 }));
  }
  return a;
}
MOBM.bear = c => bearParts(c);
MOBM.polarbear = c => bearParts(c);
/* naja: UM loft contínuo (espiral no chão que sobe num pescoço), capelo achatado com desenho e cabeça com língua; balança (bob) */
MOBM.cobra = c => {
  const lt = mix(c, [.96, .9, .66], .5), dk = shade(c, .55), a = [], pts = [];
  for (let k = 0; k <= 12; k++) { const an = k * .62 - 1.6, r = .78 - k * .034; pts.push([Math.cos(an) * r, .17, Math.sin(an) * r - .1, .05 + Math.min(.12, k * .013), .05 + Math.min(.12, k * .013)]); }
  pts.push([0, .45, .06, .17, .17], [0, .85, .26, .16, .16], [0, 1.22, .34, .15, .15], [0, 1.45, .35, .14, .14]);
  a.push(geoP(mkLoft(pts, { sides: 10, sub: 3, up: [0, 1, 0], tone: (nx, ny, nz, px, py, pz) => ny < -.3 ? 1.3 : ((Math.floor(px * 3.2 + pz * 3.2 + py * 4) & 1) ? .84 : 1) }), c));
  a.push(P('sphere', [0, 1.52, .3], [.96, .74, .16], c, { bob: .03 }), P('sphere', [0, 1.52, .38], [.64, .5, .06], lt, { bob: .03 }));
  a.push(P('sphere', [-.12, 1.56, .42], [.12, .12, .05], dk, { bob: .03 }), P('sphere', [.12, 1.56, .42], [.12, .12, .05], dk, { bob: .03 }));
  a.push(geoP(mkLoft([[0, 1.74, .4, .15, .13], [0, 1.78, .55, .13, .1], [0, 1.77, .7, .08, .06]], { sides: 8 }), c, null, { bob: .03 }), P('cone', [0, 1.7, .82], [.04, .22, .04], [.9, .1, .1], { r: [1.57, 0, 0], bob: .03 }));
  for (const sx of [-1, 1]) a.push(P('sphere', [sx * .12, 1.82, .6], [.06, .06, .05], [1, .85, .1], { e: 1, bob: .03 }));
  return a;
};
/* salamandra: lagarto baixo e comprido — corpo, cabeça, cauda e patas abertas em LOFTS contínuos; crista de brasas e manchas incandescentes */
MOBM.salamander = c => {
  const dk = shade(c, .55), lt = mix(c, [1, .8, .4], .35), a = [];
  a.push(geoP(mkLoft([[0, .46, -.9, .26, .22], [0, .52, -.4, .36, .28], [0, .54, .2, .38, .3], [0, .52, .7, .3, .24], [0, .5, 1.0, .22, .18]], { flat: .2, sides: 10, tone: (nx, ny) => ny < -.25 ? 1.35 : 1 }), c));
  const N = [0, .5, 1.0], hd = { at: -.3 };
  a.push(geoP(mkLoft([[0, .5, .9, .2, .17], [0, .5, 1.2, .24, .16], [0, .46, 1.5, .17, .11], [0, .42, 1.82, .1, .07]], { sides: 10, tone: (nx, ny, nz, px, py, pz) => pz > 1.5 ? 1.25 : 1 }), lt, N, hd));
  for (const sx of [-1, 1]) a.push(jointP('sphere', N, [sx * .17, .6, 1.5], [.09, .09, .06], [1, .85, .1], [0, 0, 0], { e: 1.3, at: -.3 }));
  a.push(geoP(mkLoft([[0, .48, -.85, .2, .16], [0, .4, -1.4, .17, .13], [0, .3, -2.0, .1, .08], [0, .24, -2.5, .045, .04]], { sides: 8, tone: (nx, ny, nz, px, py, pz) => pz < -1.9 ? [1.3, 1.1, .5] : 1 }), c, [0, .5, -.9], { sw: .14, ph: 1 }));
  for (let k = 0; k < 7; k++) a.push(P('cone', [0, .83 - Math.abs(k - 3) * .02, .8 - k * .3], [.1, .3 - Math.abs(k - 3) * .02, .1], [1, .55 - k * .02, .12], { e: .9, r: [-.2, 0, 0] }));
  for (let k = 0; k < 8; k++) a.push(P('sphere', [(k % 2 ? .22 : -.22) * (1 - k * .03), .72, .6 - k * .27], [.16, .05, .16], [1, .7, .15], { e: 1 }));
  const legTone = (nx, ny, nz, px, py) => py < .1 ? .55 : 1;
  for (const sx of [-1, 1]) {
    a.push(geoP(mkLoft([[sx * .34, .5, .62, .13, .13], [sx * .72, .34, .7, .1, .1], [sx * .88, .1, .66, .08, .08], [sx * .94, .03, .72, .1, .06]], { sides: 8, tone: legTone }), shade(c, .92), [sx * .34, .5, .62], { sw: .5, ph: sx > 0 ? PI : 0 }));
    a.push(geoP(mkLoft([[sx * .32, .48, -.5, .14, .14], [sx * .7, .32, -.6, .11, .11], [sx * .86, .1, -.55, .08, .08], [sx * .92, .03, -.6, .1, .06]], { sides: 8, tone: legTone }), shade(c, .92), [sx * .32, .48, -.5], { sw: .5, ph: sx > 0 ? 0 : PI }));
  }
  return a;
};
/* gárgula: golem de pedra com chifres, asas de morcego em leque e olhos brilhantes */
MOBM.gargoyle = c => {
  const a = golemParts(c);
  fanWings(a, 2.4, -.38, shade(c, .55), shade(c, .8), .85);
  for (const sx of [-1, 1]) a.push(P('cone', [sx * .32, 3.1, .02], [.15, .6, .15], shade(c, .5), { r: [-.2, 0, -sx * .45] }), P('sphere', [sx * .17, 2.72, .36], [.1, .08, .05], [1, .35, .15], { e: 1.4 }));
  return a;
};
MOBM.fox = c => { const a = wolfParts(c, { ears: 1.55, lean: .8, mane: .45, eye: [1, .75, .1] }); a.push(P('sphere', [0, .52, -1.46], [.2, .22, .26], [.97, .95, .9], { sw: .12, ph: 2 })); return a; };
MOBM.alphawolf = c => { const a = wolfParts(c, { eye: [1, .2, .1], eyeE: 1.5, mane: 1.4 }); for (let k = 0; k < 5; k++) a.push(P('cone', [0, 1.13 - k * .03, .42 - k * .24], [.1, .34, .1], [.8, .15, .1], { r: [-.4, 0, 0] })); return a; };
MOBM.queenspider = c => spiderParts(c, 1);
/* aranha: cefalotórax + abdômen ligados pelo pedicelo, 8 patas articuladas com joelho alto e pés no chão, quelíceras que mordem no ataque */
function spiderParts(c, queen) {
  const dk = shade(c, .7), leg = shade(c, .62), a = [];
  a.push(P('sphere', [0, .52, .32], [.62, .4, .66], c), P('sphere', [0, .62, .3], [.42, .16, .44], shade(c, 1.15)), P('cyl', [0, .55, -.05], [.2, .3, .2], dk, { r: [1.4, 0, 0] }));
  a.push(P('sphere', [0, .72, -.62], [.98, .82, 1.12], shade(c, .85), { bob: .015 }), P('sphere', [0, .96, -.6], [.5, .3, .6], queen ? [.6, .1, .12] : shade(c, 1.2), { bob: .015, e: queen ? .35 : 0 }));
  for (const sx of [-1, 1]) {
    a.push(P('sphere', [sx * .09, .68, .6], [.09, .09, .07], [1, .12, .1], { e: 1 }), P('sphere', [sx * .19, .64, .55], [.06, .06, .05], [1, .12, .1], { e: 1 }));
    a.push(bone('tc', [sx * .08, .46, .6], [sx * .08, .46, .6], [sx * .07, .2, .7], .1, dk, { at: -.25 }), bone('cone', [sx * .08, .46, .6], [sx * .07, .24, .69], [sx * .04, .12, .62], .06, [.85, .82, .75], { at: -.25 }));
    a.push(bone('tc', [sx * .2, .45, .58], [sx * .2, .45, .58], [sx * .3, .5, .82], .07, leg), bone('tc', [sx * .3, .5, .82], [sx * .3, .5, .82], [sx * .28, .1, .9], .06, leg));
  }
  [[.48, .95, .95], [.4, .35, 1], [.3, -.3, 1], [.2, -.9, 1.05]].forEach(([hz, ang, len], i) => {
    for (const sx of [-1, 1]) {
      const H = [sx * .24, .5, hz], dx = Math.cos(ang) * sx, dz = Math.sin(ang);
      legChain(a, H, [H[0] + dx * .55 * len, 1.02, H[2] + dz * .55 * len], [H[0] + dx * 1.2 * len, .01, H[2] + dz * 1.2 * len], .095, leg, { sw: .38, ph: ((i + (sx > 0 ? 1 : 0)) % 2) * PI });
    }
  });
  if (queen) {
    const G0 = [.95, .8, .3]; a.push(P('cyl6', [0, .72, .32], [.34, .08, .34], G0, { mt: .9, rg: .3 }), P('sphere', [0, .75, .48], [.08, .08, .06], [1, .2, .2], { e: 1.6 }));
    for (let k = 0; k < 5; k++) { const an = k / 5 * PI * 2; a.push(P('cone', [Math.cos(an) * .15, .84, .32 + Math.sin(an) * .15], [.06, .2, .06], G0, { mt: .9, rg: .3 })); }
    for (let k = 0; k < 3; k++) a.push(P('cone', [0, [1.1, 1.18, 1.08][k], -.38 - k * .28], [.1, .3, .1], [.6, .1, .12], { r: [-.5 - k * .3, 0, 0], e: .3, bob: .015 }));
  }
  return a;
}
MOBM.orcwar = c => MOBM.orc(c).concat([P('box', [0, 2.0, 0], [.5, .12, .46], [.4, .4, .45]), P('cone', [-.3, 2.15, 0], [.1, .4, .1], [.9, .88, .8], { r: [0, 0, .7] }), P('cone', [.3, 2.15, 0], [.1, .4, .1], [.9, .88, .8], { r: [0, 0, -.7] }), P('box', [0, 1.1, -.22], [.7, 1.2, .05], [.55, .1, .1], { bob: .03 })]);
MOBM.phoenix = c => {
  const a = [P('sphere', [0, 1.6, 0], [.6, .6, 1.1], c, { e: .45, bob: .06 }), P('sphere', [0, 1.95, .6], [.36, .36, .4], shade(c, 1.15), { e: 1, bob: .06 }), P('cone', [0, 1.9, .95], [.1, .28, .1], [1, .8, .2], { r: [1.57, 0, 0], e: 1 }),
    P('sphere', [-.1, 2.02, .78], [.06, .06, .05], [1, 1, .6], { e: 1.6 }), P('sphere', [.1, 2.02, .78], [.06, .06, .05], [1, 1, .6], { e: 1.6 }), P('cone', [0, 2.3, .5], [.14, .5, .14], [1, .85, .2], { e: 1.2, r: [-.3, 0, 0] })];
  for (const sd of [-1, 1]) { a.push(P('box', [sd * .3, 1.75, 0], [1.9, .1, 1.1], c, { o: [sd * .95, .1, 0], fl: sd * .55, r: [0, 0, sd * .1], e: .45 }), P('box', [sd * .3, 1.75, 0], [2.4, .05, .7], [1, .8, .2], { o: [sd * 1.5, .1, -.2], fl: sd * .55, r: [0, 0, sd * .1], e: .7 })); }
  for (let k = 0; k < 5; k++) a.push(P('cone', [(k - 2) * .16, 1.4, -.9], [.16, 1.3, .1], k % 2 ? [1, .8, .2] : [1, .35, .1], { r: [1.7 + (k - 2) * .05, 0, (k - 2) * .15], e: .7, bob: .05 }));
  return a;
};
MOBM.hydra = c => {
  const a = [P('sphere', [0, .95, 0], [1.6, 1.1, 2.0], c), P('cyl6', [0, .6, -1.5], [.5, 1.6, .5], shade(c, .85), { r: [1.4, 0, 0], bob: .03 })];
  for (const [x, z, h] of [[-.5, .8, 2.4], [0, 1.1, 2.9], [.5, .8, 2.4]]) a.push(P('cyl6', [x, 1.0 + h / 2 * .8, z], [.34, h, .34], shade(c, 1.05), { r: [.25, 0, x * -.5], bob: .02 }), P('sphere', [x * 1.4, 1.0 + h * .85, z + .45], [.5, .42, .6], shade(c, 1.2), { bob: .04 }), P('cone', [x * 1.4, 1.0 + h * .85 - .05, z + .85], [.22, .35, .22], [.9, .85, .7], { r: [1.57, 0, 0] }), P('sphere', [x * 1.4 - .15, 1.0 + h * .85 + .12, z + .7], [.07, .07, .05], [1, .8, .1], { e: 1.5 }), P('sphere', [x * 1.4 + .15, 1.0 + h * .85 + .12, z + .7], [.07, .07, .05], [1, .8, .1], { e: 1.5 }));
  for (const [x, z, ph] of [[-.65, .7, 0], [.65, .7, PI], [-.65, -.7, PI], [.65, -.7, 0]]) a.push(P('box', [x, .55, z], [.34, .8, .34], shade(c, .7), { o: [0, -.3, 0], sw: .6, ph }));
  return a;
};
MOBM.lich = c => {
  const a = humanoid({ top: c, pants: c, boots: c, hair: null, legs: false, skin: [.82, .88, .92] });
  a.push(P('cone', [0, .65, 0], [1.0, 1.3, 1.0], c), P('box', [0, 1.1, -.24], [.8, 1.7, .06], shade(c, .7), { bob: .04 }), P('sphere', [-.09, 1.8, .2], [.08, .08, .05], [.4, .9, 1], { e: 1.8 }), P('sphere', [.09, 1.8, .2], [.08, .08, .05], [.4, .9, 1], { e: 1.8 }));
  for (let k = 0; k < 7; k++) { const an = k / 7 * PI * 2; a.push(P('cone', [Math.cos(an) * .26, 2.14, Math.sin(an) * .26], [.07, .34, .07], [.5, .85, 1], { e: 1.2 })); }
  a.push(P('cyl6', J_R, [.08, 2.4, .08], [.25, .25, .35], R_({ o: [0, -.2, .24] })), P('cone6', J_R, [.3, .8, .3], [.5, .85, 1], R_({ o: [0, 1.1, .24], e: 1.4 })));
  for (const sd of [-1, 1]) a.push(P('cone6', [sd * .85, 1.6, .2], [.16, .6, .16], [.5, .85, 1], { e: 1.2, bob: .12, r: [0, 0, sd * .3] }));
  return a;
};
MOBM.demon = c => {
  const d = shade(c, .8), a = humanoid({ top: c, pants: d, boots: [.15, .08, .08], skin: c, hair: null });
  a.push(P('box', [0, 1.25, 0], [.74, .78, .42], c), P('box', [0, 1.0, .18], [.66, .1, .1], [.2, .1, .1]), P('cone', [-.15, 2.1, 0], [.1, .55, .1], [.2, .08, .08], { r: [0, 0, .5] }), P('cone', [.15, 2.1, 0], [.1, .55, .1], [.2, .08, .08], { r: [0, 0, -.5] }),
    P('sphere', [-.1, 1.8, .2], [.07, .07, .04], [1, .9, .2], { e: 1.8 }), P('sphere', [.1, 1.8, .2], [.07, .07, .04], [1, .9, .2], { e: 1.8 }), P('cyl6', [0, .8, -.5], [.1, 1.3, .1], d, { r: [1.0, 0, 0], bob: .05 }));
  { const Hd = [.39, .8, .06], Tp = [.42, .98, 1.42]; // espada flamejante na mão, apontando para frente (não atravessa o chão)
    a.push(bone('box', J_R, [.39, .86, .02], [.39, .7, .1], .07, [.2, .1, .08], R_({ wz: .07 })), bone('box', J_R, [.39, .8, -.06], [.39, .76, .2], .34, [.6, .4, .2], R_({ wz: .06 })));
    a.push(bone('box', J_R, Hd, Tp, .14, [1, .45, .12], R_({ e: 1.2, wz: .05 })), bone('cone', J_R, [.43, 1.04, 1.72], Tp, .14, [1, .8, .3], R_({ e: 1.4, wz: .05 }))); }
  fanWings(a, 1.65, -.2, shade(c, .6), [.38, .09, .11], .9);
  return a;
};
MOBM.ignar = c => mountParts('dragon');

for (const k in MOB_ALIAS) MOBM[k] = MOBM[MOB_ALIAS[k]];
{ // hidra: espinhos no dorso e na cauda, chifres nas cabeças; serpe glacial: a mesma base com cristais de gelo luminosos
  const hydraBase = MOBM.hydra, HEADS = [[-.5, .8, 2.4], [0, 1.1, 2.9], [.5, .8, 2.4]];
  MOBM.hydra = c => { const a = hydraBase(c); for (let i = 0; i < 6; i++) a.push(P('cone', [0, 1.95 - Math.abs(i - 2.5) * .06, .9 - i * .36], [.16, .42, .16], shade(c, .6)));
    for (const [x, z, h] of HEADS) for (const sd of [-1, 1]) a.push(P('cone', [x * 1.4 + sd * .17, 1.0 + h * .85 + .3, z + .5], [.08, .3, .08], [.9, .85, .7], { r: [-.5, 0, -sd * .4] }));
    return a; };
  MOBM.frostwyrm = c => { const a = hydraBase(c), ice = [.78, .94, 1];
    for (let i = 0; i < 7; i++) a.push(P('cone', [(i % 2 ? .22 : -.22), 1.9, 1.0 - i * .32], [.18, .7 + (i % 3) * .2, .18], ice, { e: .5, r: [0, 0, (i % 2 ? -.35 : .35)] }));
    for (const [x, z, h] of HEADS) for (let k = -1; k <= 1; k++) a.push(P('cone', [x * 1.4 + k * .2, 1.0 + h * .85 + .35, z + .4], [.1, .45 - Math.abs(k) * .1, .1], ice, { e: .6, r: [-.3, 0, -k * .3] }));
    for (const sd of [-1, 1]) a.push(P('cone', [sd * .85, 1.7, .2], [.3, 1.0, .3], ice, { e: .45, r: [0, 0, -sd * .5] }));
    a.push(P('cone', [0, .75, -2.1], [.32, .9, .32], ice, { e: .5, r: [-1.5, 0, 0] }));
    return a; };
}

/* chefes que antes só reaproveitavam o modelo do monstro comum ganham detalhes próprios (mesma base, mesma escala) */
MOBM.pharaoh = c => { // faraó: múmia de faixas claras com nemes dourado listrado, colar largo e cetro
  const a = mummyParts([.86, .8, .66], [1, .8, .25]), g = c, bl = [.15, .25, .65];
  a.push(P('sphere', [0, 1.86, -.04], [.5, .38, .5], g, { mt: .8, rg: .3 }), P('cylh', [0, 1.88, 0], [.5, .07, .5], bl), P('cone', [0, 2.12, .06], [.12, .26, .12], g, { mt: .8, rg: .3 }));
  for (const sx of [-1, 1]) a.push(P('tbox', [sx * .22, 1.56, -.02], [.18, .5, .3], g, { r: [0, 0, sx * .08], mt: .8, rg: .3 }), P('box', [sx * .22, 1.56, .13], [.19, .5, .02], bl, { r: [0, 0, sx * .08] }));
  a.push(P('cylh', [0, 1.5, 0], [.82, .1, .5], g, { mt: .8, rg: .3 }), P('cylh', [0, 1.45, 0], [.78, .06, .48], bl), P('box', [0, .85, .2], [.3, .5, .03], g, { mt: .8, rg: .3 }));
  a.push(P('cyl6', J_R, [.06, .7, .06], g, R_({ o: [0, -1.05, .06], r: [-1.25, 0, 0], mt: .8, rg: .3 })), P('sphere', J_R, [.17, .17, .17], [.3, .6, 1], R_({ o: [0, -1.45, .06], r: [-1.25, 0, 0], e: 1.2 })));
  return a;
};
MOBM.banditking = c => { // rei dos bandidos: bandido com coroa torta, capa longa e dragona
  const a = MOBM.bandit(c), g = [.95, .8, .3];
  a.push(P('cylh', [0, 2.0, -.04], [.42, .12, .42], g, { r: [0, 0, .12], mt: .9, rg: .3 }));
  for (let k = 0; k < 5; k++) { const an = k / 5 * PI * 2; a.push(P('cone', [Math.cos(an) * .19 - .01, 2.13 + Math.cos(an) * .02, Math.sin(an) * .19 - .04], [.07, .16, .07], g, { r: [0, 0, .12], mt: .9, rg: .3 })); }
  a.push(P('box', [0, 1.05, -.24], [.72, 1.25, .04], [.45, .08, .08], { r: [.08, 0, 0], bob: .02 }));
  for (const sx of [-1, 1]) a.push(P('sphere', [sx * .4, 1.62, -.02], [.3, .16, .3], g, { mt: .9, rg: .3 }));
  return a;
};
const mobCache = {};
const keepParts = a => { a._c = 1; return a; }; // marca modelos em cache: R.parts junta as peças deles em poucas malhas (engine.js batchOf)
function mobParts(id, c) { const k = id + c.join(','); if (mobCache[k]) return mobCache[k]; LOFT_MODE = true; try { return mobCache[k] = keepParts(MOBM[id](c)); } finally { LOFT_MODE = false; } }
const MOB_COL = { slime: [.35, .85, .4], boar: [.5, .35, .25], wolfm: [.55, .55, .6], spider: [.25, .2, .3], goblin: [.4, .65, .3], ent: [.4, .28, .16], skel: [.9, .88, .8], golemm: [.55, .55, .6], wraith: [.5, .4, .85], guardian: [.35, .22, .12], colossus: [.45, .42, .5],
  bear: [.42, .28, .18], polarbear: [.93, .94, .96], fox: [.86, .42, .13], cobra: [.6, .52, .22], salamander: [.78, .26, .12], gargoyle: [.5, .5, .57],
  scorpion: [.72, .5, .25], jackal: [.8, .64, .38], mummy: [.82, .78, .62], sandgolem: [.8, .62, .38], yeti: [.92, .95, 1], frostwolf: [.78, .88, .98], frostwraith: [.55, .8, 1], icegolem: [.6, .82, .95],
  gremlin: [.45, .72, .28], lizard: [.3, .62, .35], rat: [.5, .42, .38], bandit: [.4, .3, .22], orc: [.42, .62, .28], necro: [.14, .12, .2], banshee: [.7, .85, 1], fireelem: [1, .45, .1], waterelem: [.3, .6, 1], minotaur: [.5, .32, .2], alphawolf: [.4, .38, .42], queenspider: [.2, .16, .3], orcwar: [.36, .5, .24], phoenix: [1, .5, .12], hydra: [.25, .42, .35], lich: [.16, .2, .4], demon: [.65, .12, .1], ignar: [1, 1, 1],
  lavaslime: [1, .42, .1], imp: [.75, .2, .15], hellhound: [.25, .1, .1], magmagolem: [.32, .18, .16], scorpqueen: [.5, .15, .1], yetiking: [.78, .9, 1], ignar: [.28, .12, .1],
  boarelite: [.36, .3, .3], shadowwolf: [.2, .17, .27], ancientent: [.3, .2, .1], banditking: [.55, .12, .1], pharaoh: [.95, .8, .35], frostwyrm: [.55, .85, 1] };
const MOB_SC = { bear: 1.2, polarbear: 1.35, fox: .66, cobra: 1.1, salamander: 1.25, gargoyle: 1.15, boarelite: 1.4, shadowwolf: 1.3, ancientent: 1.5, slime: 1, boar: 1, wolfm: 1, spider: 1.1, goblin: .9, ent: 1.1, skel: 1, golemm: 1.3, wraith: 1.1, scorpion: 1, jackal: 1.05, mummy: 1, sandgolem: 1.3, yeti: 1.2, frostwolf: 1.1, frostwraith: 1.1, icegolem: 1.3, lavaslime: 1.1, imp: 1, hellhound: 1.15, magmagolem: 1.35, rat: .9, bandit: 1, orc: 1.3, necro: 1, banshee: 1.1, fireelem: 1.2, waterelem: 1.2, minotaur: 1.3, alphawolf: 1.3, queenspider: 1.5, orcwar: 1.5, phoenix: 1.2, hydra: 1.3 };


/* ===== montarias (frente = +z) ===== */
const mountCache = {};
function mountParts(id) {
  if (mountCache[id]) return mountCache[id];
  const a = [];
  if (id === 'horse' || id === 'unicorn') {
    const uni = id === 'unicorn', body = uni ? [.96, .96, 1] : [.55, .33, .18], mane = uni ? null : [.14, .09, .06], hoof = uni ? [.92, .76, .35] : [.15, .12, .1];
    const RB = [[.95, .4, .7], [.7, .5, 1], [.4, .8, 1]];
    a.push(P('rbox', [0, 1.3, 0], [.66, .72, 1.55], body), P('sphere', [0, 1.3, .6], [.68, .74, .62], body), P('sphere', [0, 1.32, -.6], [.68, .74, .62], body));
    a.push(P('rbox', [0, 1.74, .82], [.3, .82, .36], body, { r: [.55, 0, 0] }));
    a.push(P('rbox', [0, 2.1, 1.14], [.26, .3, .62], body, { r: [.35, 0, 0] }), P('rbox', [0, 2.0, 1.44], [.2, .2, .14], shade(body, .85), { r: [.35, 0, 0] }));
    for (const s of [-1, 1]) a.push(P('cone', [s * .09, 2.34, 1.0], [.07, .2, .07], body), P('sphere', [s * .15, 2.14, 1.22], [.065, .065, .065], [.05, .05, .08]));
    for (let i = 0; i < 5; i++) a.push(P('box', [0, 1.55 + i * .13, .7 + i * .09], [.07, .2, .16], uni ? RB[i % 3] : mane, { r: [.55, 0, 0], e: uni ? 1 : 0, bob: .01 }));
    if (uni) {
      a.push(P('cone', [0, 2.46, 1.34], [.09, .55, .09], [1, .92, .65], { r: [.7, 0, 0], e: 1 }));
      for (let i = 0; i < 3; i++) a.push(P('sphere', [0, 1.35 - i * .12, -.95 - i * .22], [.26 - i * .04, .5, .26 - i * .04], RB[i], { r: [-.3, 0, 0], e: 1, bob: .04 }));
      for (let i = 0; i < 4; i++) a.push(P('sphere', [Math.sin(i * 1.6) * .9, 2.4 + i * .15, Math.cos(i * 1.6) * .6], [.07, .07, .07], [1, 1, .85], { e: 1, bob: .12 }));
    } else a.push(P('cone', [0, 1.1, -1.1], [.2, .95, .2], mane, { r: [-2.5, 0, 0], bob: .03 }));
    for (const [x, z, ph] of [[-.2, .56, 0], [.2, .56, PI], [-.2, -.56, PI], [.2, -.56, 0]]) {
      a.push(P('rbox', [x, 1.0, z], [.17, 1.0, .17], body, { o: [0, -.5, 0], sw: .8, ph }));
      a.push(P('box', [x, 1.0, z], [.19, .14, .2], hoof, { o: [0, -.97, .02], sw: .8, ph }));
    }
    a.push(P('rbox', [0, 1.68, -.05], [.62, .09, .56], [.6, .12, .12]), P('rbox', [0, 1.74, -.28], [.4, .12, .12], [.45, .1, .1]));
  } else if (id === 'nightmare') { // corcel sombrio: cavalo negro com crina e cascos em brasa
    const body = [.1, .09, .12], fire = [1, .45, .12];
    a.push(P('rbox', [0, 1.3, 0], [.66, .72, 1.55], body), P('sphere', [0, 1.3, .6], [.68, .74, .62], body), P('sphere', [0, 1.32, -.6], [.68, .74, .62], body));
    a.push(P('rbox', [0, 1.74, .82], [.3, .82, .36], body, { r: [.55, 0, 0] }), P('rbox', [0, 2.1, 1.14], [.26, .3, .62], body, { r: [.35, 0, 0] }));
    for (const s of [-1, 1]) a.push(P('cone', [s * .09, 2.34, 1.0], [.07, .2, .07], body), P('sphere', [s * .15, 2.14, 1.22], [.07, .07, .07], [1, .3, .1], { e: 1 }));
    for (let i = 0; i < 6; i++) a.push(P('cone', [0, 1.6 + i * .12, .66 + i * .09], [.12, .34, .12], fire, { r: [-.4, 0, 0], e: 1, bob: .02 }));
    a.push(P('cone', [0, 1.3, -1.05], [.22, .9, .22], fire, { r: [-2.4, 0, 0], e: 1, bob: .04 }));
    for (const [x, z, ph] of [[-.2, .56, 0], [.2, .56, PI], [-.2, -.56, PI], [.2, -.56, 0]]) {
      a.push(P('rbox', [x, 1.0, z], [.17, 1.0, .17], body, { o: [0, -.5, 0], sw: .8, ph }));
      a.push(P('sphere', [x, 1.0, z], [.22, .16, .24], fire, { o: [0, -.96, .02], sw: .8, ph, e: 1 }));
    }
    a.push(P('rbox', [0, 1.68, -.05], [.62, .09, .56], [.25, .05, .08]), P('rbox', [0, 1.74, -.28], [.4, .12, .12], [.5, .1, .08]));
  } else if (id === 'wolf' || id === 'tiger') { // felino/canino grande: corpo baixo e comprido
    const W = id === 'wolf', body = W ? [.42, .42, .46] : [.92, .55, .2], belly = W ? [.7, .7, .72] : [.96, .94, .9], dk = W ? [.25, .25, .28] : [.08, .06, .05];
    a.push(P('rbox', [0, 1.15, 0], [.72, .66, 1.6], body), P('sphere', [0, 1.2, .62], [.8, .78, .7], body), P('sphere', [0, 1.12, -.6], [.72, .68, .66], body));
    a.push(P('sphere', [0, .92, .1], [.6, .3, 1.2], belly));
    if (!W) for (let i = 0; i < 5; i++) a.push(P('box', [0, 1.33, -.55 + i * .27], [.76, .5, .07], dk, { r: [0, 0, 0] })); // listras
    a.push(P('sphere', [0, 1.55, 1.08], [.56, .52, .56], body), P('rbox', [0, 1.45, 1.42], [.3, .24, .36], belly), P('sphere', [0, 1.5, 1.6], [.1, .08, .08], [.05, .05, .06]));
    for (const s of [-1, 1]) a.push(P('cone', [s * .17, 1.86, 1.02], [.13, W ? .26 : .16, .1], body, { r: [0, 0, -s * .2] }), P('sphere', [s * .13, 1.62, 1.33], [.07, .06, .04], W ? [1, .8, .2] : [.4, .9, .3], { e: 1 }));
    if (W) a.push(P('box', [0, 1.6, .7], [.42, .3, .5], shade(body, 1.2), { r: [.4, 0, 0] })); // juba
    a.push(P('cone', [0, 1.25, -1.2], [.18, .9, .18], W ? body : dk, { r: [-2.2, 0, 0], bob: .05 }));
    for (const [x, z, ph] of [[-.24, .6, 0], [.24, .6, PI], [-.24, -.6, PI], [.24, -.6, 0]]) {
      a.push(P('rbox', [x, .9, z], [.2, .86, .22], body, { o: [0, -.43, 0], sw: .9, ph }));
      a.push(P('sphere', [x, .9, z], [.26, .14, .32], belly, { o: [0, -.84, .06], sw: .9, ph }));
    }
    a.push(P('rbox', [0, 1.55, -.05], [.66, .08, .6], W ? [.45, .1, .1] : [.15, .3, .5]), P('rbox', [0, 1.62, -.3], [.42, .12, .12], [.35, .22, .1]));
  } else if (id === 'boar') { // javali de guerra blindado
    const body = [.38, .26, .18], arm = [.55, .57, .62];
    a.push(P('sphere', [0, 1.1, 0], [1.1, 1.0, 1.8], body), P('sphere', [0, 1.15, .85], [.9, .85, .8], body));
    a.push(P('rbox', [0, 1.42, -.1], [.95, .2, 1.3], arm, { mt: .8, rg: .35 }), P('rbox', [0, 1.3, .9], [.7, .35, .3], arm, { mt: .8, rg: .35 }));
    a.push(P('rbox', [0, 1.05, 1.35], [.46, .4, .4], shade(body, .9)), P('cylh', [0, 1.0, 1.58], [.3, .1, .26], [.6, .45, .4], { r: [PI / 2, 0, 0] }));
    for (const s of [-1, 1]) a.push(P('shard', [s * .2, .95, 1.6], [.06, .32, .06], [.95, .92, .82], { r: [-.6, 0, -s * .4] }), P('sphere', [s * .16, 1.22, 1.42], [.06, .06, .05], [.9, .3, .1], { e: 1 }), P('cone', [s * .22, 1.45, 1.15], [.12, .2, .1], body));
    for (let i = 0; i < 5; i++) a.push(P('cone', [0, 1.6 - i * .02, .6 - i * .3], [.1, .3, .1], [.2, .14, .1]));
    for (const [x, z, ph] of [[-.3, .55, 0], [.3, .55, PI], [-.3, -.55, PI], [.3, -.55, 0]]) {
      a.push(P('rbox', [x, .7, z], [.22, .7, .24], body, { o: [0, -.35, 0], sw: .9, ph }));
      a.push(P('box', [x, .7, z], [.24, .12, .26], [.15, .12, .1], { o: [0, -.68, .02], sw: .9, ph }));
    }
  } else if (id === 'griffin') { // grifo: cabeça e asas de águia, corpo de leão
    const body = [.82, .62, .35], feath = [.95, .93, .88], wing = [.6, .42, .24], beak = [.95, .75, .2];
    a.push(P('rbox', [0, 1.6, 0], [.8, .8, 1.7], body), P('sphere', [0, 1.7, .7], [.9, .9, .8], feath), P('sphere', [0, 1.6, -.7], [.8, .75, .7], body));
    a.push(P('sphere', [0, 2.35, 1.05], [.55, .55, .6], feath), P('cone', [0, 2.25, 1.45], [.16, .34, .2], beak, { r: [1.9, 0, 0] }));
    for (const s of [-1, 1]) a.push(P('sphere', [s * .15, 2.45, 1.25], [.08, .08, .06], [.1, .1, .05]), P('cone', [s * .14, 2.68, .9], [.08, .3, .08], feath, { r: [-.6, 0, -s * .3] }));
    for (const s of [-1, 1]) {
      a.push(P('box', [s * .35, 2.0, .2], [1.8, .1, .9], wing, { o: [s * .9, .1, 0], fl: s * .6, r: [0, 0, s * .15] }));
      a.push(P('box', [s * .35, 2.0, .2], [1.5, .06, .7], feath, { o: [s * 1.9, .08, -.15], fl: s * .6, r: [0, 0, s * .15] }));
    }
    a.push(P('cone', [0, 1.6, -1.25], [.12, .9, .12], body, { r: [-2.3, 0, 0], bob: .05 }), P('sphere', [0, 1.25, -1.6], [.2, .2, .2], wing, { bob: .05 }));
    for (const [x, z, ph, c] of [[-.26, .65, 0, beak], [.26, .65, PI, beak], [-.26, -.65, PI, body], [.26, -.65, 0, body]]) {
      a.push(P('rbox', [x, 1.25, z], [.2, .9, .22], z > 0 ? feath : body, { o: [0, -.45, 0], sw: .7, ph }));
      a.push(P('sphere', [x, 1.25, z], [.24, .12, .3], c, { o: [0, -.88, .06], sw: .7, ph }));
    }
    a.push(P('rbox', [0, 1.98, -.05], [.7, .08, .6], [.2, .3, .6]), P('rbox', [0, 2.05, -.32], [.44, .12, .12], [.85, .7, .3]));
  } else {
    const red = [.72, .13, .1], dk = [.4, .07, .08], bel = [.86, .62, .32];
    a.push(P('rbox', [0, 2.1, 0], [1.1, 1.0, 2.4], red), P('rbox', [0, 1.78, 0], [.9, .4, 2.2], bel), P('sphere', [0, 2.15, .95], [1.1, 1.0, .9], red));
    a.push(P('rbox', [0, 2.62, 1.3], [.5, .62, .55], red, { r: [.5, 0, 0] }), P('rbox', [0, 3.06, 1.58], [.42, .56, .46], red, { r: [.4, 0, 0] }));
    a.push(P('rbox', [0, 3.38, 1.98], [.5, .44, .9], red, { r: [.3, 0, 0] }), P('rbox', [0, 3.22, 2.5], [.36, .28, .46], shade(red, .9), { r: [.3, 0, 0] }));
    for (const s of [-1, 1]) a.push(P('cone', [s * .2, 3.7, 1.7], [.1, .55, .1], [.95, .9, .75], { r: [-.7, 0, s * .2] }), P('sphere', [s * .2, 3.48, 2.12], [.11, .11, .11], [1, .6, .1], { e: 1 }));
    for (let i = 0; i < 6; i++) a.push(P('cone', [0, 2.72 - (i > 3 ? (i - 3) * .04 : 0), 1.0 - i * .38], [.15, .42, .15], dk));
    a.push(P('sphere', [0, 2.0, -1.5], [.75, .62, .95], red, { bob: .03 }), P('sphere', [0, 1.9, -2.2], [.52, .46, .85], red, { bob: .05 }), P('sphere', [0, 1.8, -2.8], [.36, .32, .7], red, { bob: .07 }));
    a.push(P('cone', [0, 1.75, -3.4], [.26, .7, .26], dk, { r: [-1.57, 0, 0], bob: .09 }));
    fanWings(a, 2.65, .15, dk, [.56, .1, .12], 1);
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) a.push(P('cone', [sd * .13, 3.1, 2.38 + k * .17], [.05, .13, .05], [.95, .92, .8], { r: [3.14, 0, 0] })); // dentes
    for (const [x, z, ph] of [[-.5, .85, 0], [.5, .85, PI], [-.5, -.85, PI], [.5, -.85, 0]]) {
      a.push(P('rbox', [x, 1.55, z], [.3, .95, .34], red, { o: [0, -.45, 0], sw: .7, ph }));
      a.push(P('box', [x, 1.55, z], [.34, .16, .4], [.95, .9, .75], { o: [0, -.92, .06], sw: .7, ph }));
    }
  }
  return mountCache[id] = keepParts(a);
}

/* cavaleiro sentado: coxas para a frente e abertas (abraçando a sela), canelas penduradas a partir do joelho */
const SEAT_HIP = .94, seatCache = new WeakMap();
function rotApply(v, r) { // mesma rotação de M.part (Ry * Rx * Rz)
  const cx = Math.cos(r[0]), sx = Math.sin(r[0]), cy = Math.cos(r[1]), sy = Math.sin(r[1]), cz = Math.cos(r[2]), sz = Math.sin(r[2]);
  const r00 = cy * cz + sy * sx * sz, r01 = -cy * sz + sy * sx * cz, r02 = sy * cx, r10 = cx * sz, r11 = cx * cz, r12 = -sx, r20 = -sy * cz + cy * sx * sz, r21 = sy * sz + cy * sx * cz, r22 = cy * cx;
  return [r00 * v[0] + r01 * v[1] + r02 * v[2], r10 * v[0] + r11 * v[1] + r12 * v[2], r20 * v[0] + r21 * v[1] + r22 * v[2]];
}
function seatedParts(a) {
  let s = seatCache.get(a); if (s) return s;
  const HIP = 1.02, KNEE = -.53;
  s = a.map(q => {
    if (!(q.sw && Math.abs(q.p[1] - HIP) < 1e-3 && Math.abs(q.p[0]) <= .2)) return q;
    const sd = q.p[0] < 0 ? -1 : 1, rt = [-1.38, 0, sd * .34], o = q.o || [0, 0, 0];
    if (q.leg ? q.leg === 'thigh' : o[1] > KNEE - .03) return Object.assign({}, q, { r: rt, sw: 0 }); // coxa, joelho
    const K = rotApply([0, KNEE, 0], rt);
    return Object.assign({}, q, { p: [q.p[0] + K[0], q.p[1] + K[1], q.p[2] + K[2]], o: [o[0], o[1] - KNEE, o[2]], r: [.22, 0, sd * .1], sw: 0 });
  });
  seatCache.set(a, keepParts(s)); return s;
}

/* item caído no chão com o formato do próprio item (deitado, comprimento no eixo X) */
const itemCache = {};
const Z90 = [0, 0, PI / 2];
function itemParts(it) {
  const key = [it.slot, it.wt || '', it.grade, it.rar, it.cls || ''].join('_');
  if (itemCache[key]) return itemCache[key];
  const g = Math.max(0, Math.min(5, it.grade | 0)), wc = WPN_COL[g], ac = (ARM_CLS_COL[it.cls] || ARM_COL)[g], gl = RAR_GLOW[it.rar | 0], MT = { rg: .3, mt: .85 }, a = [];
  const y = .06, H = [.35, .22, .12];
  if (it.slot === 'w') {
    const wt = it.wt;
    if (wt === 'sword') {
      a.push(P('cylh', [-.5, y, 0], [.07, .26, .07], [.3, .2, .1], { r: Z90 }), P('sphere', [-.66, y, 0], [.1, .1, .1], wc, MT));
      a.push(P('box', [-.35, y, 0], [.07, .05, .36], shade(wc, .7), MT), P('box', [.17, y, 0], [1, .03, .14], wc, Object.assign({ sharp: 1 }, MT)), P('shard', [.77, y, 0], [.14, .2, .03], wc, Object.assign({ r: [PI / 2, 0, -PI / 2] }, MT)));
    } else if (wt === 'axe') {
      a.push(P('cylh', [-.1, y, 0], [.09, 1.05, .09], H, { r: Z90 }));
      a.push(P('box', [.36, y, .2], [.32, .05, .42], wc, MT), P('box', [.36, y, -.1], [.14, .06, .14], wc, MT));
    } else if (wt === 'tome') {
      a.push(P('box', [0, .07, 0], [.42, .12, .52], [.35, .12, .1]), P('box', [0, .14, 0], [.36, .02, .46], [.95, .9, .78]), P('sphere', [0, .15, .02], [.12, .03, .12], wc, { e: 1 }));
    } else if (wt === 'bow' || wt === 'longbow' || wt === 'compbow') {
      const bl = wt === 'longbow' ? 1.35 : 1, ba = wt === 'compbow' ? .55 : .42;
      for (const s of [-1, 1]) a.push(P('box', [s * .3 * bl, y, -.12], [.64 * bl, .05, .08], wc, { r: [0, s * ba, 0] }));
      if (wt === 'compbow') for (const s of [-1, 1]) a.push(P('box', [s * .62, y, -.3], [.14, .05, .07], shade(wc, .75), { r: [0, -s * .8, 0] }));
      a.push(P('box', [0, y, -.25], [1.18 * bl, .016, .016], [.92, .92, .86], { sharp: 1 }), P('cylh', [0, y, 0], [.11, .32, .11], [.3, .2, .1], { r: [PI / 2, 0, 0] }));
    } else if (wt === 'crossbow') {
      a.push(P('box', [0, y + .02, 0], [.8, .1, .12], [.4, .28, .15]), P('box', [.34, y + .04, 0], [.07, .07, .84], wc, MT), P('box', [.24, y + .06, 0], [.015, .015, .78], [.92, .92, .86]));
    } else if (wt === 'daggers') {
      for (const s of [-1, 1]) a.push(P('cylh', [-.25, y, s * .14], [.06, .2, .06], [.3, .2, .1], { r: Z90 }), P('box', [.06, y, s * .14], [.46, .03, .085], wc, Object.assign({ sharp: 1 }, MT)), P('box', [-.14, y, s * .14], [.05, .05, .2], shade(wc, .7)));
    } else if (wt === 'orb') {
      a.push(P('cylh', [0, .05, 0], [.3, .1, .3], [.45, .32, .18]), P('sphere', [0, .26, 0], [.32, .32, .32], wc, { e: 1, bob: .03 }));
    } else if (wt === 'wand') {
      a.push(P('cylh', [0, y, 0], [.06, .62, .06], [.5, .35, .2], { r: Z90 }), P('sphere', [.34, y + .03, 0], [.14, .14, .14], wc, { e: 1 }));
    } else { // cajado, cetro, totem
      a.push(P('cylh', [-.1, y, 0], [.09, 1.7, .09], [.5, .35, .2], { r: Z90 }));
      if (wt === 'totem') a.push(P('box', [.85, .14, 0], [.36, .26, .3], wc));
      else if (wt === 'scepter') a.push(P('box', [.82, .12, 0], [.24, .2, .34], wc), P('sphere', [.98, .12, 0], [.17, .17, .17], gl || [.9, .2, .2], { e: 1 }));
      else a.push(P('sphere', [.86, .16, 0], [.28, .28, .28], wc, { e: 1 }));
    }
  } else if (it.slot === 'h') {
    a.push(P('sphere', [0, .03, 0], [.52, .56, .52], ac, MT), P('cylh', [0, .05, 0], [.56, .06, .56], shade(ac, .8), MT));
    if (g >= 2) a.push(P('box', [0, .14, .25], [.3, .07, .05], shade(ac, .35)));
    if (g >= 4) a.push(P('ring', [0, .24, 0], [.5, .6, .5], [.95, .8, .3], MT));
  } else if (it.slot === 'a') {
    a.push(P('torsoM', [0, .12, 0], [.68, .55, .24], ac, Object.assign({ r: [-PI / 2, 0, 0] }, MT)));
    for (const s of [-1, 1]) a.push(P('sphere', [s * .36, .1, -.22], [.26, .14, .28], shade(ac, 1.1), MT));
  } else if (it.slot === 'l') {
    a.push(P('pelvis', [0, .1, -.2], [.5, .2, .22], ac, { r: [-PI / 2, 0, 0] }));
    for (const s of [-1, 1]) a.push(P('thigh', [s * .12, .1, .12], [.22, .5, .2], ac, Object.assign({ r: [-PI / 2, 0, 0] }, MT)));
  } else if (it.slot === 'b') {
    for (const s of [-1, 1]) a.push(P('cylh', [s * .16, .14, -.04], [.2, .28, .21], ac, MT), P('sphere', [s * .16, .05, .08], [.21, .12, .36], shade(ac, .85), MT), P('cylh', [s * .16, .01, .05], [.22, .02, .38], [.15, .1, .07]));
  } else { // acessório: amuleto
    a.push(P('ring', [0, .02, 0], [.5, .8, .5], [.95, .8, .3], MT), P('sphere', [0, .07, .26], [.17, .14, .17], gl || wc, { e: 1 }), P('ring', [0, .03, .26], [.22, .9, .22], [.95, .8, .3], MT));
  }
  return itemCache[key] = a;
}
