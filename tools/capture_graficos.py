"""Captura de referência gráfica do Aldoria (usada pelo GRAPHICS.md).

Uso:  python tools/capture_graficos.py <rótulo>        ex.: antes, depois_ao
Saída: docs/graficos/<rótulo>/*.jpg + metricas.json
Requisitos: pip install playwright pillow numpy (usa o Microsoft Edge instalado; não baixa navegador).
Antes de rodar: python build.py

Como funciona: abre dist/aldoria.html, cria um Vanguarda, teleporta para 7 pontos fixos, de dia (12h) e de noite (22h),
com clima limpo, qualidade Alta e vida infinita (só para o personagem não morrer durante a captura).
Mede draw calls e triângulos de um quadro (inclui passes de sombra e pós) e métricas de imagem na área central (sem HUD).
Atenção: em renderização por software (swiftshader) o FPS NÃO é representativo; compare só os números entre capturas.
"""
import sys, os, io, json
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LABEL = sys.argv[1] if len(sys.argv) > 1 else 'antes'
OUT = os.path.join(ROOT, 'docs', 'graficos', LABEL)
HTML = 'file:///' + os.path.join(ROOT, 'dist', 'aldoria.html').replace('\\', '/')
os.makedirs(OUT, exist_ok=True)

# (nome, x, z, yaw da câmera)
SPOTS = [('aldoria_praca', 0, 6, .5), ('campo', 60, 70, 2.2), ('floresta', 225, 20, 1.0), ('ruinas', 120, 470, .3),
         ('deserto', 570, -30, 2.6), ('picos', -20, -600, 1.2), ('cinzas', -690, -50, .8)]
TIMES = [('dia', 12.0), ('noite', 22.0)]

COUNT = """(() => { const P = WebGL2RenderingContext.prototype; window.__c = { calls: 0, tris: 0 };
  for (const n of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const o = P[n]; if (!o) continue;
    P[n] = function (m, c) { window.__c.calls++; if (m === this.TRIANGLES) window.__c.tris += c / 3; return o.apply(this, arguments); }; } })()"""
KEEP = """() => { const d = Game._dbg; setInterval(() => { const p = d.G.player; p.maxHp = 99999; p.hp = 99999; p.mp = p.maxMp; d.G.dead = false;
  if (d.R.qi !== 2) d.R.setQuality(2); }, 100); }"""
GO = """([x, z, yaw, th]) => { const d = Game._dbg, G = d.G, p = G.player; p.x = x; p.z = z; p.path = null; G.tod = th; d.setWeather('clear', 0);
  d.cam.yaw = yaw; d.cam.init = false; d.sim(260, .05); G.tod = th; }"""
FRAME = """() => new Promise(r => { let f = 0; const g = () => { if (++f >= 2) r(window.__c); else { window.__c = { calls: 0, tris: 0 }; requestAnimationFrame(g); } };
  window.__c = { calls: 0, tris: 0 }; requestAnimationFrame(g); })"""


def img_metrics(im):
    a = np.asarray(im.convert('RGB'))[130:620, 300:1000].astype(float)  # recorta o HUD
    q = (a // 16).astype(int); key = q[..., 0] * 256 + q[..., 1] * 16 + q[..., 2]
    _, cnt = np.unique(key, return_counts=True); p = cnt / cnt.sum()
    L = a @ np.array([.2126, .7152, .0722])
    return dict(entropia=round(float(-(p * np.log2(p)).sum()), 2), dominante=round(float(p.max()), 3),
                contraste=round(float(np.percentile(L, 95) - np.percentile(L, 5)), 1),
                bordas=round(float((np.abs(np.diff(L, axis=1)) > 20).mean()), 3), luma=round(float(L.mean()), 1))


res = {}
with sync_playwright() as pw:
    b = pw.chromium.launch(channel='msedge', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}); ctx.add_init_script(COUNT); pg = ctx.new_page()
    erros, rede = [], []
    pg.on('console', lambda m: erros.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: erros.append(str(e)))
    pg.on('request', lambda r: rede.append(r.url) if not r.url.startswith(('file:', 'data:', 'blob:')) else None)
    pg.goto(HTML); pg.wait_for_timeout(1500); pg.evaluate("Game.newGame('vanguard')"); pg.wait_for_timeout(1200); pg.evaluate(KEEP)
    for nome, x, z, yaw in SPOTS:
        for tn, th in TIMES:
            pg.evaluate(GO, [x, z, yaw, th]); pg.wait_for_timeout(1200)
            r = {}
            if tn == 'dia':
                c = pg.evaluate(FRAME); r.update(draw_calls=c['calls'], triangulos=int(c['tris']))
            im = Image.open(io.BytesIO(pg.screenshot()))
            r.update(img_metrics(im)); res[f'{nome}_{tn}'] = r
            im.convert('RGB').save(os.path.join(OUT, f'{nome}_{tn}.jpg'), quality=88)
    b.close()
res['_erros_console'] = erros; res['_requisicoes_de_rede'] = rede
json.dump(res, open(os.path.join(OUT, 'metricas.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
for k, v in res.items(): print(k, v)
