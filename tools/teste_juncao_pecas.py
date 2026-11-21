"""Teste de equivalência da junção de peças (engine.js R.parts / batchOf).

Uso:  python tools/teste_juncao_pecas.py      (depois de python build.py; requer playwright pillow numpy + Edge)
Renderiza cada monstro, as 4 classes de herói (fase máxima, equipamento Lendário) e algumas montarias com a mesma pose animada, nos dois modos
(R.noBatch = true: peça a peça; false: peças agrupadas) e compara pixel a pixel e em chamadas de desenho. Esperado: diferença 0 e ~90 % menos chamadas.
Rode depois de mexer em R.parts, em modelos (models.js) ou nos shaders de personagem.
"""
import base64, io, json, os, sys
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = "file:///" + os.path.join(ROOT, "dist", "aldoria.html").replace("\\", "/")
COUNT = """(() => { const P = WebGL2RenderingContext.prototype; window.__c = { calls: 0 };
  for (const n of ['drawElements', 'drawArrays']) { const o = P[n]; P[n] = function () { window.__c.calls++; return o.apply(this, arguments); }; } })()"""
JS = r"""([key, kind, args]) => {
  const d = Game._dbg, R = d.R, p = d.G.player, out = {};
  let parts;
  if (kind === 'mob') parts = mobParts(key, MOB_COL[key] || [.5, .5, .5]);
  else if (kind === 'mount') parts = mountParts(key);
  else { p.cls = key; p.tier = 3; p.lvl = 50; for (const s of ['w','h','a','l','b','c']) p.eq[s] = makeItem(s, key, 50, 4, 3);
    const eq = p.eq; parts = playerParts(key, 3, eq.w.grade, eq.a.grade, { wr: eq.w.rar, wp: eq.w.plus, ar: eq.a.rar, ap: eq.a.plus, ac: eq.c.grade, cr: eq.c.rar, look: p.look, wt: eq.w.wt, hg: eq.h.grade, hr: eq.h.rar, lg: eq.l.grade, bg: eq.b.grade }); }
  const anim = { t: 1.3, amp: 1, atk: .4 };
  const sc = (MOB_SC[key] || 1), big = kind === 'mob' ? 1.6 + (HGT_GUESS[key] || 2) * 1.3 : 4.6;
  for (const mode of ['old', 'new']) {
    R.noBatch = mode === 'old';
    const cv = document.createElement('canvas'); cv.width = 320; cv.height = 320; window.__c.calls = 0;
    R.renderPortrait(cv, () => { R.parts(parts, M.part([0, 0, 0], [0, .7, 0], [0, 0, 0], [sc, sc, sc]), [1, 1, 1], 0, 1, anim); }, { eye: [0, big * .45, big * 1.5], at: [0, big * .3, 0], fov: .8 });
    out[mode] = { url: cv.toDataURL('image/png'), calls: window.__c.calls };
  }
  R.noBatch = false; out.n = parts.length; return out;
}"""
HGT_PRE = "window.HGT_GUESS = {};"
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="msedge", headless=True, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    ctx = b.new_context(viewport={"width": 1280, "height": 720}); ctx.add_init_script(COUNT); pg = ctx.new_page(); logs = []
    pg.on("console", lambda m: logs.append(m.text) if m.type == "error" else None); pg.on("pageerror", lambda e: logs.append("PAGEERROR " + str(e)))
    pg.goto(HTML); pg.wait_for_function("typeof Game !== 'undefined'"); pg.evaluate("Game.newGame('vanguard')"); pg.wait_for_timeout(1000); pg.evaluate(HGT_PRE)
    ids = pg.evaluate("() => Object.keys(MOBM)")
    cases = [(k, 'mob', None) for k in ids] + [(c, 'class', None) for c in ['vanguard', 'arcanist', 'huntress', 'tamer']] + [(m, 'mount', None) for m in ['horse', 'dragon', 'griffin', 'wolf']]
    tot_old = tot_new = 0; worst = []
    for key, kind, args in cases:
        try:
            r = pg.evaluate(JS, [key, kind, args])
        except Exception as e:
            print('ERRO', key, str(e)[:120]); continue
        A = np.asarray(Image.open(io.BytesIO(base64.b64decode(r['old']['url'].split(',')[1]))).convert('RGB')).astype(int)
        B = np.asarray(Image.open(io.BytesIO(base64.b64decode(r['new']['url'].split(',')[1]))).convert('RGB')).astype(int)
        d = np.abs(A - B).sum(2); frac = float((d > 24).mean()); mean = float(d.mean())
        tot_old += r['old']['calls']; tot_new += r['new']['calls']
        worst.append((frac, key, r['n'], r['old']['calls'], r['new']['calls'], round(mean, 2)))
    worst.sort(reverse=True)
    print('draw calls total: antigo', tot_old, '-> agrupado', tot_new, f'({tot_new / tot_old:.1%})')
    print('maiores diferenças (fração de pixels com diff > 24, id, peças, calls antigo, calls novo, diff médio):')
    for w in worst[:10]: print('  ', [round(w[0], 4)] + list(w[1:]))
    print('erros', logs[:6]); b.close()
