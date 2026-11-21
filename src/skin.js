'use strict';
/* ===== Personagens com ossos (malha com pele + animações baked em matrizes) — dados em assets_data.js ===== */
const b64buf = s => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
class SkinMesh {
  constructor(gl, m) {
    this.gl = gl; this.n = m.idx.length; this.bones = null;
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    const buf = (data, loc, size, type, isInt) => {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, type, false, 0, 0);
    };
    buf(m.pos, 0, 3, gl.FLOAT); buf(m.nor, 1, 3, gl.FLOAT); buf(m.col, 2, 3, gl.FLOAT); buf(m.joints, 3, 4, gl.UNSIGNED_BYTE); buf(m.weights, 4, 4, gl.FLOAT);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  }
}
const SKINS = {}; // nome -> { mesh, nb, parts }
function loadSkins(R) {
  if (typeof ASSETS === 'undefined') return;
  for (const id in ASSETS.chars) {
    const c = ASSETS.chars[id], m = c.mesh, n = m.n, mat = new Uint8Array(b64buf(m.mat)), col = new Float32Array(n * 3);
    const palette = [[.62, .64, .7], [.2, .21, .25]];
    for (let i = 0; i < n; i++) { const p = palette[Math.min(mat[i], 1)]; col[i * 3] = p[0]; col[i * 3 + 1] = p[1]; col[i * 3 + 2] = p[2]; }
    const mesh = new SkinMesh(R.gl, { pos: new Float32Array(b64buf(m.pos)), nor: new Float32Array(b64buf(m.nor)), col, joints: new Uint8Array(b64buf(m.joints)), weights: new Float32Array(b64buf(m.weights)), idx: new Uint32Array(b64buf(m.idx)) });
    SKINS[id] = { mesh, mat, nb: c.bones.length, bones: c.bones, parent: c.parent };
  }
}
const SKIN_ANIMS = {};
function skinAnim(name) {
  if (SKIN_ANIMS[name]) return SKIN_ANIMS[name];
  const a = typeof ASSETS !== 'undefined' && ASSETS.anims[name]; if (!a) return null;
  return SKIN_ANIMS[name] = { frames: a.frames, data: new Float32Array(b64buf(a.data)), fps: 30 };
}
const _bones = new Float32Array(24 * 16);
/* amostra a animação no tempo t (em segundos, em laço) e devolve as matrizes de pele (24*16) */
function skinPose(skin, anim, t, loop) {
  const nb = skin.nb, F = anim.frames, stride = nb * 16;
  let f = t * anim.fps; if (loop !== false) f = ((f % F) + F) % F; else f = Math.min(f, F - 1);
  const f0 = Math.floor(f), f1 = Math.min(F - 1, f0 + 1), k = f - f0, d = anim.data;
  for (let i = 0; i < stride; i++) _bones[i] = d[f0 * stride + i] * (1 - k) + d[f1 * stride + i] * k;
  return _bones;
}
