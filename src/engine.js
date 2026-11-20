'use strict';
/* ===== Mini motor WebGL2 (sem dependências) ===== */
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
};
const dxz = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

const M = {
  id() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  },
  persp(fov, asp, n, f) {
    const t = 1 / Math.tan(fov / 2), o = new Float32Array(16);
    o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f);
    return o;
  },
  lookAt(e, c, u) {
    const z = V.norm(V.sub(e, c)), x = V.norm(V.cross(u, z)), y = V.cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -V.dot(x, e), -V.dot(y, e), -V.dot(z, e), 1]);
  },
  /* matriz local: T(p) * Ry*Rx*Rz * T(off) * S(s) */
  part(p, r, off, s) {
    const cx = Math.cos(r[0]), sx = Math.sin(r[0]), cy = Math.cos(r[1]), sy = Math.sin(r[1]), cz = Math.cos(r[2]), sz = Math.sin(r[2]);
    // R = Ry * Rx * Rz
    const r00 = cy * cz + sy * sx * sz, r01 = -cy * sz + sy * sx * cz, r02 = sy * cx;
    const r10 = cx * sz, r11 = cx * cz, r12 = -sx;
    const r20 = -sy * cz + cy * sx * sz, r21 = sy * sz + cy * sx * cz, r22 = cy * cx;
    const o = new Float32Array(16);
    o[0] = r00 * s[0]; o[1] = r10 * s[0]; o[2] = r20 * s[0];
    o[4] = r01 * s[1]; o[5] = r11 * s[1]; o[6] = r21 * s[1];
    o[8] = r02 * s[2]; o[9] = r12 * s[2]; o[10] = r22 * s[2];
    o[12] = p[0] + r00 * off[0] + r01 * off[1] + r02 * off[2];
    o[13] = p[1] + r10 * off[0] + r11 * off[1] + r12 * off[2];
    o[14] = p[2] + r20 * off[0] + r21 * off[1] + r22 * off[2];
    o[15] = 1;
    return o;
  },
  inv(a) {
    const o = new Float32Array(16);
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
      a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10,
      b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12,
      b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30,
      b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!d) return null; d = 1 / d;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * d; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * d;
    o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * d; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * d;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * d; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * d;
    o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * d; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * d;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * d; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * d;
    o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * d; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * d;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * d; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * d;
    o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * d; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * d;
    return o;
  },
  xform(m, p) { // aplica matriz (com divisão por w)
    const x = p[0], y = p[1], z = p[2];
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, (m[2] * x + m[6] * y + m[10] * z + m[14]) / w];
  },
};

/* ===== Construtor de malhas (posição, normal, cor por vértice) ===== */
class MB {
  constructor() { this.p = []; this.n = []; this.c = []; this.i = []; }
  v(p, n, c) { this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]); this.c.push(c[0], c[1], c[2]); return this.p.length / 3 - 1; }
  quad(a, b, c, d) { this.i.push(a, b, c, a, c, d); }
  merge(o, m, tint) { // aplica matriz m e cor tint
    const base = this.p.length / 3;
    for (let k = 0; k < o.p.length; k += 3) {
      const x = o.p[k], y = o.p[k + 1], z = o.p[k + 2];
      this.p.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
      const nx = o.n[k], ny = o.n[k + 1], nz = o.n[k + 2];
      let X = m[0] * nx + m[4] * ny + m[8] * nz, Y = m[1] * nx + m[5] * ny + m[9] * nz, Z = m[2] * nx + m[6] * ny + m[10] * nz;
      const l = Math.hypot(X, Y, Z) || 1; this.n.push(X / l, Y / l, Z / l);
      this.c.push(o.c[k] * tint[0], o.c[k + 1] * tint[1], o.c[k + 2] * tint[2]);
    }
    for (const i of o.i) this.i.push(i + base);
    return this;
  }
}
const W3 = [1, 1, 1];
function mkBox() {
  const b = new MB();
  const F = [[[0, 0, 1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[0, 0, -1], [1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]],
    [[1, 0, 0], [1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]], [[-1, 0, 0], [-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]],
    [[0, 1, 0], [-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], [[0, -1, 0], [-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]];
  for (const f of F) {
    const n = f[0], s = f.slice(1).map(p => b.v([p[0] / 2, p[1] / 2, p[2] / 2], n, W3));
    b.quad(s[0], s[1], s[2], s[3]);
  }
  return b;
}
function mkCyl(seg, rTop, rBot) { // altura 1, centrado na origem
  const b = new MB(), sl = (rBot - rTop);
  for (let i = 0; i <= seg; i++) {
    const a = i / seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const n = V.norm([c, sl, s]);
    b.v([c * rTop, .5, s * rTop], n, W3); b.v([c * rBot, -.5, s * rBot], n, W3);
  }
  for (let i = 0; i < seg; i++) { const k = i * 2; b.i.push(k, k + 3, k + 1); if (rTop > 0) b.i.push(k, k + 2, k + 3); } // anti-horário visto de fora (antes estava invertido: o culling mostrava a parede interna)
  for (const [y, r, ny] of [[.5, rTop, 1], [-.5, rBot, -1]]) {
    if (r <= 0) continue;
    const c0 = b.v([0, y, 0], [0, ny, 0], W3), st = b.p.length / 3;
    for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; b.v([Math.cos(a) * r, y, Math.sin(a) * r], [0, ny, 0], W3); }
    for (let i = 0; i < seg; i++) ny > 0 ? b.i.push(c0, st + i + 1, st + i) : b.i.push(c0, st + i, st + i + 1);
  }
  return b;
}
function mkSphere(seg, rings) {
  const b = new MB();
  for (let y = 0; y <= rings; y++) {
    const t = y / rings * Math.PI;
    for (let x = 0; x <= seg; x++) {
      const a = x / seg * Math.PI * 2, n = [Math.sin(t) * Math.cos(a), Math.cos(t), Math.sin(t) * Math.sin(a)];
      b.v([n[0] / 2, n[1] / 2, n[2] / 2], n, W3);
    }
  }
  for (let y = 0; y < rings; y++) for (let x = 0; x < seg; x++) {
    const a = y * (seg + 1) + x, c = a + seg + 1;
    b.i.push(a, a + 1, c + 1, a, c + 1, c);
  }
  return b;
}

class Mesh {
  constructor(gl, mb) {
    this.gl = gl; this.n = mb.i.length;
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    const buf = (data, loc) => {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
    };
    buf(mb.p, 0); buf(mb.n, 1); buf(mb.c, 2);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(mb.i), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  }
}

/* ===== Shaders ===== */
const VS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec3 aCol;
layout(location=3) in vec4 aJ; layout(location=4) in vec4 aWt;
uniform mat4 uVP; uniform mat4 uM; uniform mat4 uLP; uniform float uTime; uniform float uDetail; uniform float uSkin; uniform mat4 uBones[24];
out vec3 vN; out vec3 vC; out vec3 vW; out vec4 vL; out vec3 vP;
void main(){ vec4 lp=vec4(aPos,1.0); vec3 ln=aNor; vP=aPos*length(uM[0].xyz);
  if(uSkin>0.5){ mat4 sk=uBones[int(aJ.x)]*aWt.x+uBones[int(aJ.y)]*aWt.y+uBones[int(aJ.z)]*aWt.z+uBones[int(aJ.w)]*aWt.w; lp=sk*lp; ln=mat3(sk)*aNor; }
  vec4 w=uM*lp;
  if(uDetail>0.5&&uDetail<1.5){ vec3 ac=abs(aCol); float g=step(1.1*max(ac.r,ac.b),ac.g)*step(-0.00001,aCol.r); float a=sqrt(max(w.y-0.1,0.0))*0.042*g;
    w.x+=sin(uTime*1.7+w.x*0.31+w.z*0.27)*a; w.z+=cos(uTime*1.3+w.z*0.33-w.x*0.21)*a*0.7; w.y+=sin(uTime*2.3+w.x*0.5)*a*0.12; }
  if(aCol.r>0.0&&aCol.b<0.0){ float ph=w.x*2.7+w.z*3.1; w.x+=sin(uTime*7.3+ph)*0.07; w.z+=cos(uTime*6.1+ph*1.3)*0.07; w.y+=(0.5+0.5*sin(uTime*9.0+ph*2.1))*0.16; } // labareda tremulando
  else if(aCol.r>0.0&&aCol.g<0.0){ w.z+=sin(uTime*3.4+w.x*2.4+w.y*0.8)*0.06; } // estandarte ondulando
  vW=w.xyz; vec3 n=mat3(uM)*ln; vN=n; vC=aCol;
  vL=uLP*vec4(w.xyz+normalize(n)*0.09,1.0); gl_Position=uVP*w; }`;
const FS = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vN; in vec3 vC; in vec3 vW; in vec4 vL; in vec3 vP; out vec4 o;
uniform vec3 uTint; uniform float uEmis; uniform float uAlpha; uniform float uDetail;
uniform vec3 uLight; uniform vec3 uCam; uniform vec3 uFog; uniform float uFogD;
uniform vec3 uSun; uniform vec3 uAmbT; uniform vec3 uAmbB; uniform float uShOn; uniform float uShTx; uniform float uTime;
uniform float uRough; uniform float uMetal; uniform vec3 uTop; uniform float uWet; uniform float uFx;
uniform sampler2DShadow uSh;
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
float shadow(vec3 n){
  if(uShOn<0.5) return 1.0;
  vec3 s=vL.xyz/vL.w*0.5+0.5;
  if(s.x<0.0||s.x>1.0||s.y<0.0||s.y>1.0||s.z>1.0) return 1.0;
  float ndl=max(dot(n,-uLight),0.0);
  float b=0.00025+0.0009*(1.0-ndl); // ~4 a 17 cm: sombra encostada no objeto (antes até 75 cm, parecia flutuar)
  float sum=0.0;
  for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) sum+=texture(uSh,vec3(s.xy+vec2(float(x),float(y))*uShTx,s.z-b));
  float r=sum/9.0;
  vec2 e=abs(s.xy-0.5)*2.0; float ed=smoothstep(0.78,0.98,max(e.x,e.y));
  return mix(r,1.0,ed);
}
void main(){
  vec3 n=normalize(vN);
  vec3 fn=normalize(cross(dFdx(vW),dFdy(vW))); if(dot(fn,n)<0.0) fn=-fn; if(uDetail>0.5) n=fn;
  float ndl=max(dot(n,-uLight),0.0);
  // cor por vértice com bandeiras no sinal: r<0 = peça de cenário 'limpa' (sem rocha/manchas), r<0 e g<0 = alvenaria (blocos), r<0 e b<0 = tábuas
  float pf=step(vC.r,-0.00001), pm=pf*step(vC.g,-0.00001), pw=pf*step(vC.b,-0.00001);
  vec3 albedo=abs(vC)*uTint;
  float bh=0.0, bk=1.0; float bf=1.0-smoothstep(14.0,40.0,length(vW-uCam));
  if(uDetail>0.5){
    vec2 uv=abs(n.y)>0.5?vW.xz:vec2(vW.x+vW.z,vW.y);
    float d=vn(uv*1.3)*0.55+vn(uv*4.3)*0.45;
    albedo*=mix(0.80+0.40*d,0.95+0.10*d,pf);
    if(pm+pw>0.5){ // alvenaria/tábuas: juntas regulares em coordenadas do mundo
      vec2 q=abs(n.y)>0.5?vW.xz:vec2(abs(n.x)>abs(n.z)?vW.z:vW.x,vW.y);
      vec2 cs=pm>0.5?vec2(0.9,0.45):vec2(9.0,0.3); q/=cs; q.x+=floor(q.y)*0.5; vec2 f=fract(q), id=floor(q);
      vec2 ew=fwidth(q)*1.2+vec2(0.035,0.07);
      float j=(pm>0.5?smoothstep(0.0,ew.x,min(f.x,1.0-f.x)):1.0)*smoothstep(0.0,ew.y,min(f.y,1.0-f.y));
      float fade=1.0-smoothstep(25.0,60.0,length(vW-uCam));
      albedo*=mix(1.0,mix(0.76,1.0,j)*(0.92+0.16*h21(id)),fade);
      bh=(1.0-j)*-0.02*fade;
    }
    if(uFx>0.5){
    float l0=dot(albedo,vec3(0.3,0.59,0.11));
    float s0=max(albedo.r,max(albedo.g,albedo.b))-min(albedo.r,min(albedo.g,albedo.b));
    float gm=smoothstep(0.0,0.05,albedo.g-max(albedo.r,albedo.b));
    float sn=smoothstep(0.62,0.8,l0)*(1.0-smoothstep(0.0,0.2,s0));
    float sd=smoothstep(0.05,0.18,albedo.r-albedo.b)*(1.0-gm)*smoothstep(0.42,0.6,l0);
    float rk=(1.0-gm)*(1.0-sn)*(1.0-sd)*(1.0-pf); gm*=1.0-pf; sd*=1.0-pf; sn*=1.0-pf;
    // grama: lâminas e tufos
    float hg=vn(uv*9.0)*0.6+vn(uv*3.0)*0.4;
    albedo=mix(albedo,albedo*(0.78+0.5*hg)*vec3(0.95,1.05,0.92),gm*0.8);
    // areia: ondulações do vento
    float hs=0.5+0.5*sin(uv.x*4.0+vn(uv*1.7)*6.0+uv.y*1.5);
    albedo*=mix(1.0,0.9+0.18*hs,sd);
    // neve: massa macia + brilho
    float hn=vn(uv*6.0);
    // rocha: estratos, rachaduras e manchas
    float rr=abs(vn(uv*2.6+vn(uv*5.0)*1.3)*2.0-1.0);
    float crack=(1.0-smoothstep(0.0,0.05+fwidth(rr)*2.5,rr))*(1.0-smoothstep(8.0,30.0,length(vW-uCam)));
    float strat=vn(vec2(uv.x*2.0,uv.y*9.0+uv.x*1.5));
    float hr=vn(uv*5.0)*0.5+strat*0.3+(1.0-crack)*0.6;
    albedo*=mix(1.0,(0.8+0.34*strat)*(1.0-0.22*crack),rk);
    bh+=(gm*hg*0.03*(1.0-pf)+sd*hs*0.03*(1.0-pf)+sn*hn*0.025*(1.0-pf)+rk*hr*0.06)*bf;
    }
    if(n.y>0.95&&vW.y<0.06){
      float townK=1.0-smoothstep(13.2,14.8,length(vW.xz));
      vec2 g=vW.xz*0.85; g.x+=floor(g.y)*0.5; vec2 f=fract(g); vec2 id=floor(g);
      float ed=min(min(f.x,1.0-f.x),min(f.y,1.0-f.y));
      float grout=smoothstep(0.02,0.1,ed);
      float tone=0.82+0.3*h21(id);
      vec3 cob=albedo*mix(0.55,1.0,grout)*tone;
      float gr=vn(vW.xz*14.0);
      albedo=mix(albedo*(0.92+0.16*gr),cob,townK);
      if(uFx>0.5) bh=mix(bh,grout*0.05*bf,townK);
    }
  } else if(uFx>0.5){
    float og=vn(vP.xy*22.0+vP.z*14.0);
    float sc=0.5;
    albedo*=0.9+0.2*og;
    bh=og*0.0015*(1.0-smoothstep(8.0,24.0,length(vW-uCam))); bk=0.6;
  }
  if(uFx>0.5){
    vec3 dpx=dFdx(vW), dpy=dFdy(vW); float dhx=dFdx(bh), dhy=dFdy(bh);
    vec3 r1=cross(dpy,n), r2=cross(n,dpx); float det=dot(dpx,r1);
    vec3 gr2=sign(det)*(dhx*r1+dhy*r2);
    n=normalize(abs(det)*n-gr2*bk);
  }
  ndl=max(dot(n,-uLight),0.0);
  float sh=shadow(n);
  vec3 V=normalize(uCam-vW);
  float dist=length(vW-uCam);
  bool world=uDetail>0.5;
  // --- materiais (PBR simplificado) ---
  float lum=dot(albedo,vec3(0.3,0.59,0.11));
  float sat=max(albedo.r,max(albedo.g,albedo.b))-min(albedo.r,min(albedo.g,albedo.b));
  float rough=uRough, metal=uMetal;
  if(!world){
    float steel=smoothstep(0.14,0.04,sat)*smoothstep(0.32,0.6,lum);
    float gold=smoothstep(0.55,0.85,albedo.r)*smoothstep(0.35,0.6,albedo.g)*smoothstep(0.5,0.25,albedo.b);
    float m=max(steel*0.85,gold*0.9);
    metal=max(metal,m); rough=mix(rough,0.3,m);
  } else {
    bool up=n.y>0.9; float wet=uWet*(up?1.0:0.5);
    rough=mix(0.92,0.2,wet); albedo*=1.0-0.28*wet;
  }
  if(!world&&rough<0.12){
    vec2 wp=vW.xz; float tt=uTime;
    float w1=vn(wp*2.6+vec2(tt*0.7,tt*0.4)), w2=vn(wp*5.3-vec2(tt*0.5,-tt*0.6));
    float e1=vn(wp*2.6+vec2(tt*0.7+0.15,tt*0.4))-w1, e2=vn(wp*2.6+vec2(tt*0.7,tt*0.4+0.15))-w1;
    n=normalize(n+vec3(e1*1.4+(w2-0.5)*0.12,0.0,e2*1.4+(w2-0.5)*0.12));
    ndl=max(dot(n,-uLight),0.0);
  }
  // oclusão falsa de contato
  float vert=1.0-abs(n.y);
  albedo*=mix(1.0,mix(0.58,1.0,smoothstep(0.0,1.5,vW.y)),vert*(world?1.0:0.6));
  float ndv=max(dot(n,V),0.0);
  vec3 L=-uLight; vec3 H=normalize(V+L);
  float ndh=max(dot(n,H),0.0), vdh=max(dot(V,H),0.0);
  float a=max(rough*rough,0.03), a2=a*a; float dd=ndh*ndh*(a2-1.0)+1.0; float D=a2/(3.14159*dd*dd);
  float band=ndl*sh;
  float tb=smoothstep(0.06,0.12,band)*0.42+smoothstep(0.38,0.44,band)*0.36+smoothstep(0.74,0.8,band)*0.22;
  if(!world) tb=mix(tb,smoothstep(-0.05,0.95,band),0.7); // personagens: sombreado suave (menos 'faixas')
  vec3 amb=mix(uAmbB,uAmbT,0.5+0.5*n.y);
  vec3 diff=albedo*(1.0-metal*0.5)*(uSun*tb*1.05+amb*1.05);
  // brilho estilizado (faixa única)
  float hl=(world?smoothstep(0.955,0.975,ndh):smoothstep(0.88,0.99,ndh))*ndl*sh*(0.12+metal*1.1+(1.0-rough)*0.4);
  vec3 lit=diff+uSun*hl*0.9*mix(vec3(1.0),albedo,metal)+albedo*uEmis*1.5;
  // reflexo (só água / chão molhado)
  vec3 Rv=reflect(-V,n); float ry=Rv.y;
  vec3 sky=ry>0.0?mix(uFog,uTop,pow(clamp(ry,0.0,1.0),0.5)):mix(uFog,uAmbB*0.7,clamp(-ry*1.6,0.0,1.0));
  float fe=0.04+0.96*pow(1.0-ndv,5.0);
  float envK=world?(uWet*0.9*(n.y>0.9?1.0:0.4)):(rough<0.12?1.0:0.0);
  lit+=sky*fe*(1.0-rough*0.5)*envK*(0.35+0.65*sh)*1.2;
  // contorno de luz em faixa
  float back=pow(max(dot(V,uLight),0.0),2.0);
  lit+=smoothstep(0.62,0.7,1.0-ndv)*(uAmbT*0.1+uSun*back*0.28)*(0.4+0.6*sh);
  // linhas de tinta nas arestas
  float ed=length(fwidth(fn));
  lit*=1.0-0.4*smoothstep(0.55,1.1,ed);
  vec3 vf=(vW-uCam)/max(dist,0.001);
  float f=1.0-exp(-uFogD*uFogD*dist*dist);
  float hf=exp(-max(vW.y,0.0)*0.16);
  f=clamp(f+(1.0-exp(-dist*0.0045))*hf*0.3,0.0,1.0);
  vec3 fogc=uFog+uSun*pow(max(dot(vf,L),0.0),6.0)*0.32;
  lit=mix(lit,fogc,f);
  o=vec4(lit,uAlpha);
}`;
const VS_D = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=3) in vec4 aJ; layout(location=4) in vec4 aWt; uniform mat4 uVP; uniform mat4 uM; uniform float uSkin; uniform mat4 uBones[24];
void main(){ vec4 lp=vec4(aPos,1.0); if(uSkin>0.5){ mat4 sk=uBones[int(aJ.x)]*aWt.x+uBones[int(aJ.y)]*aWt.y+uBones[int(aJ.z)]*aWt.z+uBones[int(aJ.w)]*aWt.w; lp=sk*lp; } gl_Position=uVP*uM*lp; }`;
const FS_D = `#version 300 es
precision mediump float; void main(){}`;
const VS_Q = `#version 300 es
out vec2 uv; void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); uv=p; gl_Position=vec4(p*2.0-1.0,0.0,1.0); }`;
const FS_SKY = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform mat4 uIV; uniform vec3 uCam; uniform vec3 uFog; uniform vec3 uTop; uniform vec3 uSunDir; uniform vec3 uSun; uniform vec3 uDisc; uniform float uStars; uniform float uTime; uniform float uCloud;
float h31(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(17.1,9.2); a*=0.5; } return s; }
void main(){
  vec4 f=uIV*vec4(uv*2.0-1.0,1.0,1.0); vec3 d=normalize(f.xyz/f.w-uCam);
  float h=clamp(d.y,0.0,1.0);
  vec3 c=mix(uFog,uTop,pow(h,0.5));
  float s=max(dot(d,uSunDir),0.0);
  c+=uSun*pow(s,3.0)*0.1*(1.0-h)+uSun*pow(s,8.0)*0.22+uSun*pow(s,40.0)*0.35+uDisc*pow(s,260.0)*2.6;
  c=mix(c,c*vec3(1.08,1.0,0.9)+uSun*0.05,exp(-h*9.0)*0.5);
  float lum=dot(uSun,vec3(0.3,0.5,0.2));
  if(d.y>0.0){
    vec2 p=d.xz/(d.y+0.16)*1.25+vec2(uTime*0.010,uTime*0.004);
    float n=fbm(p), n2=fbm(p+uSunDir.xz*0.09);
    float cov=mix(0.62,0.34,uCloud);
    float cl=smoothstep(cov,cov+0.035,n)*smoothstep(0.0,0.14,d.y);
    float lit=smoothstep(0.45,0.55,0.55+(n-n2)*4.5);
    vec3 base=mix(uFog*0.62+uTop*0.25,vec3(0.55)*uTop+vec3(0.35),0.4);
    vec3 cc=mix(base*0.62,base*0.95+uSun*0.5*lit+uDisc*0.25*pow(s,4.0),lit);
    cc=mix(cc,cc*vec3(0.62,0.66,0.74),smoothstep(0.55,1.0,uCloud)*0.9);
    c=mix(c,cc,cl*(0.82+0.18*uCloud));
  }
  if(uStars>0.01&&d.y>0.0){ vec3 q=floor(d*140.0); float hh=h31(q); float st=step(0.9965,hh)*(0.5+0.5*h31(q+7.0)); c+=vec3(st)*uStars*smoothstep(0.0,0.25,d.y); }
  o=vec4(c,1.0);
}`;
const FS_BRIGHT = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D uT; uniform vec2 uTx;
void main(){
  vec3 c=texture(uT,uv+uTx*vec2(-.5,-.5)).rgb+texture(uT,uv+uTx*vec2(.5,-.5)).rgb+texture(uT,uv+uTx*vec2(-.5,.5)).rgb+texture(uT,uv+uTx*vec2(.5,.5)).rgb;
  c*=0.25; float l=max(c.r,max(c.g,c.b));
  float k=smoothstep(1.0,1.8,l); o=vec4(c*k,1.0);
}`;
const FS_BLUR = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D uT; uniform vec2 uDir;
void main(){
  vec3 c=texture(uT,uv).rgb*0.227027;
  c+=(texture(uT,uv+uDir*1.3846).rgb+texture(uT,uv-uDir*1.3846).rgb)*0.3162162;
  c+=(texture(uT,uv+uDir*3.2308).rgb+texture(uT,uv-uDir*3.2308).rgb)*0.0702703;
  o=vec4(c,1.0);
}`;
const FS_POST = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D uS; uniform sampler2D uB0; uniform sampler2D uB1; uniform float uBloom; uniform float uExp; uniform vec2 uTx; uniform vec3 uSunS;
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float cl(vec2 p){ vec3 c=texture(uS,p).rgb*uExp; float l=dot(c,vec3(0.3,0.59,0.11)); return l/(1.0+l); }
void main(){
  vec3 c=texture(uS,uv).rgb;
  vec3 bl=(texture(uB0,uv).rgb*0.6+texture(uB1,uv).rgb*0.9)*uBloom;
  if(uSunS.z>0.01){
    vec2 dl=(uSunS.xy-uv)*0.085; vec2 q=uv+dl*h21(gl_FragCoord.xy)*0.6; vec3 ry=vec3(0.0); float wt=1.0;
    for(int i=0;i<10;i++){ q+=dl; ry+=texture(uB1,q).rgb*wt; wt*=0.9; }
    bl+=ry*uSunS.z*0.085;
  }
  // contorno por detecção de bordas (silhuetas e mudanças de cor)
  float l0=cl(uv), lx=cl(uv+vec2(uTx.x,0.0)), lnx=cl(uv-vec2(uTx.x,0.0)), ly=cl(uv+vec2(0.0,uTx.y)), lny=cl(uv-vec2(0.0,uTx.y));
  float g=abs(lx-lnx)+abs(ly-lny);
  float edge=smoothstep(0.26,0.55,g);
  c=max(c,0.0)+bl;
  c*=uExp;
  c=clamp((c*(2.51*c+0.03))/(c*(2.43*c+0.59)+0.14),0.0,1.0);
  float l=dot(c,vec3(0.299,0.587,0.114));
  c=mix(vec3(l),c,1.32);
  c=mix(c*vec3(0.96,0.98,1.06),c*vec3(1.06,1.01,0.92),smoothstep(0.2,0.8,l));
  c=mix(c,c*c*(3.0-2.0*c),0.22);
  vec3 ink=vec3(0.05,0.03,0.06);
  c=mix(c,ink,edge*0.5);
  vec2 q=uv-0.5; c*=1.0-smoothstep(0.3,1.0,dot(q,q)*2.4)*0.3;
  c+=(h21(gl_FragCoord.xy*0.5)-0.5)/200.0;
  o=vec4(c,1.0);
}`;

const QUALITY = [
  { name: 'Baixa', shadow: 0, bloom: 0, msaa: 0, scale: 1 },
  { name: 'Média', shadow: 1024, bloom: 1, msaa: 0, scale: 1 },
  { name: 'Alta', shadow: 2048, bloom: 1, msaa: 4, scale: 1 },
];

class Renderer {
  constructor(canvas) {
    const gl = this.gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 indisponível');
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const prog = (vs, fs, names) => {
      const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {}; for (const n of names) u[n] = gl.getUniformLocation(p, n); return { p, u };
    };
    this.P = {
      main: prog(VS, FS, ['uVP', 'uM', 'uLP', 'uTint', 'uEmis', 'uAlpha', 'uDetail', 'uTime', 'uSkin', 'uBones', 'uRough', 'uMetal', 'uTop', 'uWet', 'uFx', 'uLight', 'uCam', 'uFog', 'uFogD', 'uSun', 'uAmbT', 'uAmbB', 'uShOn', 'uShTx', 'uSh']),
      depth: prog(VS_D, FS_D, ['uVP', 'uM', 'uSkin', 'uBones']),
      sky: prog(VS_Q, FS_SKY, ['uIV', 'uCam', 'uFog', 'uTop', 'uSunDir', 'uSun', 'uDisc', 'uStars', 'uTime', 'uCloud']),
      bright: prog(VS_Q, FS_BRIGHT, ['uT', 'uTx']),
      blur: prog(VS_Q, FS_BLUR, ['uT', 'uDir']),
      post: prog(VS_Q, FS_POST, ['uS', 'uB0', 'uB1', 'uBloom', 'uExp', 'uTx', 'uSunS']),
    };
    this.u = this.P.main.u;
    this.hdr = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
    this.maxSamples = gl.getParameter(gl.MAX_SAMPLES) || 0;
    this.canvas = canvas; this.mesh = {}; this.pass = 'main';
    this.quad = gl.createVertexArray();
    this.mesh.box = new Mesh(gl, mkBox()); this.mesh.cyl = new Mesh(gl, mkCyl(12, .5, .5));
    this.mesh.cone = new Mesh(gl, mkCyl(12, 0, .5)); this.mesh.sphere = new Mesh(gl, mkSphere(16, 10));
    this.mesh.pyr = new Mesh(gl, mkCyl(4, 0, .7071)); // telhado piramidal
    this.mesh.cyl6 = new Mesh(gl, mkCyl(6, .5, .5)); this.mesh.cone6 = new Mesh(gl, mkCyl(6, 0, .5));
    this.bm = { box: mkBox(), cyl: mkCyl(8, .5, .5), cone: mkCyl(8, 0, .5), sphere: mkSphere(8, 5), pyr: mkCyl(4, 0, .7071), cyl6: mkCyl(6, .5, .5), cone6: mkCyl(6, 0, .5) };
    this.lp = M.id(); this.q = null; this.W = this.H = 0;
    this.makeShadow(4);
    let q = 2; try { const s = localStorage.getItem('aldoria_gfx'); if (s != null && QUALITY[+s]) q = +s; } catch (e) { }
    this.qi = q; this.q = QUALITY[q];
    if ((this.q.shadow || 4) !== this.shSize) this.makeShadow(this.q.shadow || 4);
    this.resize(true);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
  /* ---- alvos de renderização ---- */
  makeShadow(S) {
    const gl = this.gl;
    if (this.shTex) { gl.deleteTexture(this.shTex); gl.deleteFramebuffer(this.shFbo); }
    this.shSize = S; this.shTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.shTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, S, S, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    this.shFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shTex, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  tex(w, h) {
    const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    if (this.hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { t, f, w, h };
  }
  buildTargets() {
    const gl = this.gl, W = this.W, H = this.H, q = this.q;
    for (const k of ['T0', 'B0a', 'B0b', 'B1a', 'B1b']) if (this[k]) { gl.deleteTexture(this[k].t); gl.deleteFramebuffer(this[k].f); this[k] = null; }
    if (this.msFbo) { gl.deleteFramebuffer(this.msFbo); gl.deleteRenderbuffer(this.msC); gl.deleteRenderbuffer(this.msD); this.msFbo = null; }
    if (this.dRb) { gl.deleteRenderbuffer(this.dRb); this.dRb = null; }
    this.T0 = this.tex(W, H);
    const hw = Math.max(2, W >> 1), hh = Math.max(2, H >> 1), qw = Math.max(2, W >> 2), qh = Math.max(2, H >> 2);
    this.B0a = this.tex(hw, hh); this.B0b = this.tex(hw, hh); this.B1a = this.tex(qw, qh); this.B1b = this.tex(qw, qh);
    const samples = Math.min(q.msaa, this.maxSamples);
    this.samples = samples;
    if (samples > 0) {
      this.msFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.msFbo);
      this.msC = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, this.msC);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, this.hdr ? gl.RGBA16F : gl.RGBA8, W, H);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.msC);
      this.msD = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, this.msD);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, W, H);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.msD);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { this.samples = 0; gl.deleteFramebuffer(this.msFbo); this.msFbo = null; }
    }
    if (!this.msFbo) {
      this.dRb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, this.dRb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, W, H);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.T0.f);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.dRb);
    }
    this.sceneFbo = this.msFbo || this.T0.f;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  setQuality(i) {
    this.qi = ((i % QUALITY.length) + QUALITY.length) % QUALITY.length; this.q = QUALITY[this.qi];
    try { localStorage.setItem('aldoria_gfx', String(this.qi)); } catch (e) { }
    const S = this.q.shadow || 4; if (S !== this.shSize) this.makeShadow(S);
    this.resize(true); return this.q.name;
  }
  resize(force) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.q.scale, w = Math.max(2, Math.floor(innerWidth * dpr)), h = Math.max(2, Math.floor(innerHeight * dpr));
    if (force || this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h; this.W = w; this.H = h; this.buildTargets();
    }
    this.aspect = w / h;
  }
  /* ---- passe de sombras (ortográfico, centrado no foco) ---- */
  beginShadow(focus, ldir) {
    if (!this.q.shadow) { this.shOn = false; return false; }
    const gl = this.gl, S = this.shSize, hE = 38, dir = ldir || V.norm([-.5, -1, -.35]);
    const eye = [focus[0] - dir[0] * 90, focus[1] - dir[1] * 90, focus[2] - dir[2] * 90];
    const lv = M.lookAt(eye, focus, [0, 1, 0]), tx = 2 * hE / S;
    lv[12] = Math.round(lv[12] / tx) * tx; lv[13] = Math.round(lv[13] / tx) * tx; // evita tremor
    const n = 20, f = 170, o = new Float32Array(16);
    o[0] = 1 / hE; o[5] = 1 / hE; o[10] = -2 / (f - n); o[14] = -(f + n) / (f - n); o[15] = 1;
    this.lp = M.mul(o, lv); this.shOn = true; this.pass = 'shadow'; this.shFocus = focus;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFbo); gl.viewport(0, 0, S, S);
    gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
    gl.cullFace(gl.FRONT); gl.useProgram(this.P.depth.p); gl.uniformMatrix4fv(this.P.depth.u.uVP, false, this.lp);
    return true;
  }
  endShadow() { this.pass = 'main'; this.gl.cullFace(this.gl.BACK); }
  /* ---- passe principal ---- */
  begin(vp, cam, fog, fogD, env) {
    const gl = this.gl, P = this.P, e = env || {};
    const sun = e.sun || [1, .93, .8], ambT = e.ambT || [.5, .55, .62], ambB = e.ambB || [.3, .26, .22], top = e.top || [.35, .55, .85];
    const dir = e.dir || V.norm([-.5, -1, -.35]);
    { const sd = [-dir[0], -dir[1], -dir[2]], px = cam[0] + sd[0] * 500, py = cam[1] + sd[1] * 500, pz = cam[2] + sd[2] * 500;
      const w = vp[3] * px + vp[7] * py + vp[11] * pz + vp[15];
      let k = 0, sx = .5, sy = .5;
      if (w > 0 && sd[1] > .03) {
        const nx = (vp[0] * px + vp[4] * py + vp[8] * pz + vp[12]) / w, ny = (vp[1] * px + vp[5] * py + vp[9] * pz + vp[13]) / w;
        sx = nx * .5 + .5; sy = ny * .5 + .5;
        const lum = Math.min(1, (sun[0] * .3 + sun[1] * .5 + sun[2] * .2) * 1.1), ec = e.cloud == null ? .4 : e.cloud;
        const edge = Math.max(0, Math.min(1, (2.2 - Math.max(Math.abs(nx), Math.abs(ny))) / 1.2));
        k = lum * Math.max(0, 1 - Math.max(0, ec - .35) * 1.5) * edge * Math.min(1, sd[1] * 6);
      }
      this.sunS = [sx, sy, k]; }
    this.setCull(vp, cam); this.time = e.t || 0;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFbo); gl.viewport(0, 0, this.W, this.H);
    gl.clearColor(fog[0], fog[1], fog[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // céu
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.CULL_FACE);
    gl.useProgram(P.sky.p); const iv = M.inv(vp) || M.id(), su = P.sky.u;
    gl.uniformMatrix4fv(su.uIV, false, iv); gl.uniform3fv(su.uCam, cam); gl.uniform3fv(su.uFog, fog);
    gl.uniform3fv(su.uTop, top); gl.uniform3f(su.uSunDir, -dir[0], -dir[1], -dir[2]); gl.uniform3fv(su.uSun, sun);
    gl.uniform3fv(su.uDisc, e.disc || [1, .95, .8]); gl.uniform1f(su.uStars, e.stars || 0); gl.uniform1f(su.uTime, e.t || 0); gl.uniform1f(su.uCloud, e.cloud == null ? .4 : e.cloud);
    gl.bindVertexArray(this.quad); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.enable(gl.CULL_FACE);
    gl.useProgram(P.main.p); const u = P.main.u;
    gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniformMatrix4fv(u.uLP, false, this.lp);
    gl.uniform3fv(u.uCam, cam); gl.uniform3fv(u.uFog, fog); gl.uniform1f(u.uFogD, fogD);
    gl.uniform3fv(u.uLight, dir); gl.uniform3fv(u.uSun, sun); gl.uniform3fv(u.uAmbT, ambT); gl.uniform3fv(u.uAmbB, ambB);
    gl.uniform1f(u.uTime, e.t || 0); gl.uniform3fv(u.uTop, top); gl.uniform1f(u.uWet, e.wet || 0); gl.uniform1f(u.uFx, this.qi >= 2 ? 1 : 0); gl.uniform1f(u.uShOn, this.shOn ? 1 : 0); gl.uniform1f(u.uShTx, 1 / this.shSize);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.shTex); gl.uniform1i(u.uSh, 0);
  }
  /* ---- pós-processamento: bloom + tone mapping + vinheta ---- */
  end(exposure) {
    const gl = this.gl, P = this.P; gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND); gl.depthMask(true);
    if (this.msFbo) { // resolve MSAA -> T0
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.msFbo); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.T0.f);
      gl.blitFramebuffer(0, 0, this.W, this.H, 0, 0, this.W, this.H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    }
    gl.bindVertexArray(this.quad); gl.activeTexture(gl.TEXTURE0);
    const pass = (T, prog, setup) => { gl.bindFramebuffer(gl.FRAMEBUFFER, T ? T.f : null); gl.viewport(0, 0, T ? T.w : this.W, T ? T.h : this.H); gl.useProgram(prog.p); setup(prog.u); gl.drawArrays(gl.TRIANGLES, 0, 3); };
    const bloom = this.q.bloom && this.hdr;
    if (bloom) {
      const A = this.B0a, B = this.B0b, C = this.B1a, D = this.B1b;
      pass(A, P.bright, u => { gl.bindTexture(gl.TEXTURE_2D, this.T0.t); gl.uniform1i(u.uT, 0); gl.uniform2f(u.uTx, 1 / this.W, 1 / this.H); });
      pass(B, P.blur, u => { gl.bindTexture(gl.TEXTURE_2D, A.t); gl.uniform1i(u.uT, 0); gl.uniform2f(u.uDir, 1 / A.w, 0); });
      pass(A, P.blur, u => { gl.bindTexture(gl.TEXTURE_2D, B.t); gl.uniform1i(u.uT, 0); gl.uniform2f(u.uDir, 0, 1 / A.h); });
      pass(C, P.blur, u => { gl.bindTexture(gl.TEXTURE_2D, A.t); gl.uniform1i(u.uT, 0); gl.uniform2f(u.uDir, 0, 0); }); // reduz para 1/4
      pass(D, P.blur, u => { gl.bindTexture(gl.TEXTURE_2D, C.t); gl.uniform1i(u.uT, 0); gl.uniform2f(u.uDir, 2 / C.w, 0); });
      pass(C, P.blur, u => { gl.bindTexture(gl.TEXTURE_2D, D.t); gl.uniform1i(u.uT, 0); gl.uniform2f(u.uDir, 0, 2 / C.h); });
    }
    pass(null, P.post, u => {
      gl.bindTexture(gl.TEXTURE_2D, this.T0.t); gl.uniform1i(u.uS, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, bloom ? this.B0a.t : this.T0.t); gl.uniform1i(u.uB0, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, bloom ? this.B1a.t : this.T0.t); gl.uniform1i(u.uB1, 2);
      gl.activeTexture(gl.TEXTURE0); gl.uniform1f(u.uBloom, bloom ? .34 : 0); gl.uniform3fv(u.uSunS, bloom && this.sunS ? this.sunS : [.5, .5, 0]); gl.uniform1f(u.uExp, exposure || 1); gl.uniform2f(u.uTx, 1 / this.W, 1 / this.H);
    });
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.bindVertexArray(null);
  }
  /* malhas em blocos (mundo estático): desenha só os blocos dentro do frustum e da distância de visão (ou perto do foco da sombra) */
  setCull(vp, cam) {
    const P = this.cullP || (this.cullP = [[], [], [], [], [], []]), r = i => [vp[i], vp[4 + i], vp[8 + i], vp[12 + i]], R3 = r(3);
    [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]].forEach(([k, s], j) => { const R = r(k), p = P[j]; for (let i = 0; i < 4; i++) p[i] = R3[i] + s * R[i]; const l = Math.hypot(p[0], p[1], p[2]) || 1; for (let i = 0; i < 4; i++) p[i] /= l; });
    this.cullCam = cam;
  }
  chunkVis(c) {
    if (this.pass === 'shadow') { const f = this.shFocus; return !f || Math.hypot(c.cx - f[0], c.cz - f[2]) < 62 + c.r; }
    const cam = this.cullCam; if (!cam) return true;
    if (Math.hypot(c.cx - cam[0], c.cy - cam[1], c.cz - cam[2]) - c.r > (this.viewD || 250)) return false;
    for (const p of this.cullP) if (p[0] * c.cx + p[1] * c.cy + p[2] * c.cz + p[3] < -c.r) return false;
    return true;
  }
  draw(mesh, model, tint, emis, alpha, detail, rough, metal) {
    if (mesh.spin) this.drawSpin(mesh.spin, tint, emis, alpha, detail, rough, metal);
    if (mesh.chunks) { if (mesh.vao && mesh.n) this.draw1(mesh, model, tint, emis, alpha, detail, rough, metal); for (const c of mesh.chunks) if (this.chunkVis(c)) this.draw1(c, model, tint, emis, alpha, detail, rough, metal); return; }
    this.draw1(mesh, model, tint, emis, alpha, detail, rough, metal);
  }
  /* peças giratórias do cenário (pás de moinho): {mesh, p:[x,y,z], yaw, w (rad/s), ph}; gira em torno do eixo Z local */
  drawSpin(list, tint, emis, alpha, detail, rough, metal) {
    const t = this.time || 0, cam = this.cullCam, f = this.shFocus;
    for (const s of list) {
      const p = s.p;
      if (this.pass === 'shadow') { if (f && Math.hypot(p[0] - f[0], p[2] - f[2]) > 70) continue; }
      else if (cam && (Math.hypot(p[0] - cam[0], p[2] - cam[2]) > (this.viewD || 250) || this.cullP.some(q => q[0] * p[0] + q[1] * p[1] + q[2] * p[2] + q[3] < -(s.r || 8)))) continue;
      this.draw1(s.mesh, M.part(p, [0, s.yaw, t * s.w + (s.ph || 0)], [0, 0, 0], [1, 1, 1]), tint, emis, alpha, detail, rough, metal);
    }
  }
  draw1(mesh, model, tint, emis, alpha, detail, rough, metal) {
    const gl = this.gl, a = alpha == null ? 1 : alpha;
    if (this.pass === 'shadow') {
      if (a < 1) return;
      gl.uniformMatrix4fv(this.P.depth.u.uM, false, model);
      gl.uniform1f(this.P.depth.u.uSkin, mesh.bones ? 1 : 0); if (mesh.bones) gl.uniformMatrix4fv(this.P.depth.u.uBones, false, mesh.bones);
      gl.bindVertexArray(mesh.vao); gl.drawElements(gl.TRIANGLES, mesh.n, gl.UNSIGNED_INT, 0); return;
    }
    const u = this.u;
    gl.uniformMatrix4fv(u.uM, false, model);
    gl.uniform1f(u.uSkin, mesh.bones ? 1 : 0); if (mesh.bones) gl.uniformMatrix4fv(u.uBones, false, mesh.bones);
    gl.uniform3f(u.uTint, tint[0], tint[1], tint[2]);
    gl.uniform1f(u.uEmis, emis || 0); gl.uniform1f(u.uAlpha, a); gl.uniform1f(u.uDetail, detail || 0);
    gl.uniform1f(u.uRough, rough == null ? .72 : rough); gl.uniform1f(u.uMetal, metal || 0);
    const t = a < 1;
    if (t) { gl.enable(gl.BLEND); gl.depthMask(false); if (this.add) gl.blendFunc(gl.SRC_ALPHA, gl.ONE); }
    gl.bindVertexArray(mesh.vao); gl.drawElements(gl.TRIANGLES, mesh.n, gl.UNSIGNED_INT, 0);
    if (t) { gl.disable(gl.BLEND); gl.depthMask(true); if (this.add) gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); }
  }
  /* desenha um modelo composto de partes: {m,p,s,o,r,c,sw,at,e,ph} */
  parts(parts, base, tint, emis, alpha, anim) {
    for (const q of parts) {
      let rx = q.r ? q.r[0] : 0, rz = q.r ? q.r[2] : 0; const ry = q.r ? q.r[1] : 0;
      let p = q.p;
      if (anim) {
        if (q.sw) rx += Math.sin(anim.t * 9 + (q.ph || 0)) * q.sw * anim.amp;
        if (q.at) rx -= Math.sin(anim.atk * Math.PI) * q.at;
        if (q.bob) p = [p[0], p[1] + Math.sin(anim.t * 5) * q.bob, p[2]];
        if (q.fl) rz += Math.sin(anim.t * 7 + (q.ph || 0)) * q.fl * (.7 + .3 * anim.amp);
      }
      const m = M.mul(base, M.part(p, [rx, ry, rz], q.o || [0, 0, 0], q.s));
      const c = q.c;
      this.draw((q.m === 'box' && this.softBox && !q.sharp) ? this.mesh.sbox : this.mesh[q.m], m, [c[0] * tint[0], c[1] * tint[1], c[2] * tint[2]], q.e ? Math.max(emis || 0, .9) : emis, alpha, 0, q.rg, q.mt);
    }
  }
}
