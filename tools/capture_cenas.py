"""Capturas de cenas de jogo do Aldoria (complementa tools/capture_graficos.py; usadas pelo GRAPHICS.md).

Uso:  python tools/capture_cenas.py <rótulo> [cena,cena,...]     ex.: antes   |   antes chefes,clima
Cenas: habilidades, bestiario, locais, retratos, herois, drops, portal, npcs, elites, chefes, montarias, clima, vilas, qualidade
Saída: docs/graficos/<rótulo>/cenas/*.jpg (folhas de contato + quadros avulsos)
Requisitos: pip install playwright pillow ; python build.py antes.

Cenas: habilidades das 4 classes (2 instantes cada), morte e drops, portal, NPCs, elites, chefes (parado e com telegraph),
montarias, clima, vilas e comparação das 3 qualidades. Personagem nível 50 com vida infinita só para a captura.
Em renderização por software o tempo de jogo avança de forma irregular entre quadros: use as folhas para ver o tipo de efeito,
não para medir duração.
"""
import sys, os, io
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LABEL = sys.argv[1] if len(sys.argv) > 1 else 'antes'
OUT = os.path.join(ROOT, 'docs', 'graficos', LABEL, 'cenas')
HTML = 'file:///' + os.path.join(ROOT, 'dist', 'aldoria.html').replace('\\', '/')
os.makedirs(OUT, exist_ok=True)
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
CLIP = {'x': 160, 'y': 90, 'width': 960, 'height': 540}  # centro do quadro, sem a maior parte do HUD
log = []
SEL = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
want = lambda n: SEL is None or n in SEL

KEEP = """() => { const d = Game._dbg; window.__keep = setInterval(() => { const p = d.G.player; if (!p) return; p.maxHp = 99999; p.hp = 99999; p.maxMp = 99999; p.mp = 99999; d.G.dead = false;
  if (d.R.qi !== 2 && !window.__freeq) d.R.setQuality(2); }, 100);
  window.__sim = n => { for (let i = 0; i < n; i++) { const p = d.G.player; p.maxHp = 99999; p.hp = 99999; d.G.dead = false; d.sim(1, .05); } }; }"""
LVL = """() => { const d = Game._dbg, p = d.G.player; p.lvl = 50; p.sk = p.sk.map(() => 1); p.cd = p.cd.map(() => 0); d.recalc(); }"""
PLACE = """([x, z, yaw, th]) => { const d = Game._dbg, G = d.G, p = G.player; p.x = x; p.z = z; p.path = null; G.tod = th == null ? 12 : th;
  d.setWeather('clear', 0); d.cam.yaw = yaw; d.cam.init = false; window.__sim(260); G.tod = th == null ? 12 : th; }"""
SIM = "(n) => window.__sim(n)"


def new_page(pw, cls='vanguard', scale=1):
    b = pw.chromium.launch(channel='msedge', headless=True, args=ARGS)
    pg = b.new_context(viewport={'width': 1280, 'height': 720}, device_scale_factor=scale).new_page()
    pg.goto(HTML); pg.wait_for_timeout(1500); pg.evaluate(f"Game.newGame('{cls}')"); pg.wait_for_timeout(1200)
    pg.evaluate(KEEP); pg.evaluate(LVL)
    return b, pg


def shot(pg, clip=True):
    pg.wait_for_timeout(350)
    return Image.open(io.BytesIO(pg.screenshot(clip=CLIP if clip else None))).convert('RGB')


def save(im, name):
    im.save(os.path.join(OUT, name + '.jpg'), quality=86); log.append(name)


def sheet(tiles, name, cols=2, w=480, labels=None):
    if not tiles: return
    from PIL import ImageDraw
    h = int(w * tiles[0].height / tiles[0].width); rows = (len(tiles) + cols - 1) // cols
    S = Image.new('RGB', (cols * w, rows * h), (20, 20, 20)); D = ImageDraw.Draw(S)
    for i, t in enumerate(tiles):
        x, y = (i % cols) * w, (i // cols) * h; S.paste(t.resize((w, h)), (x, y))
        if labels: D.rectangle((x + 4, y + 4, x + 8 + 7 * len(labels[i]), y + 20), fill=(0, 0, 0)); D.text((x + 8, y + 6), labels[i], fill=(255, 255, 255))
    save(S, name)


def near_mob(pg, x, z, pred='!m.dead && !m.boss && !m.elite'):
    return pg.evaluate("""([x, z, pred]) => { const f = new Function('m', 'return ' + pred); let b = null, bd = 1e9;
      for (const m of Game._dbg.mobs) { if (!f(m)) continue; const d = Math.hypot(m.x - x, m.z - z); if (d < bd) { bd = d; b = m; } }
      return b ? { x: b.x, z: b.z, name: b.name, i: Game._dbg.mobs.indexOf(b) } : null; }""", [x, z, pred])


with sync_playwright() as pw:
    # 1) habilidades por classe (7 habilidades × 2 instantes)
    for cls in (['vanguard', 'arcanist', 'huntress', 'tamer'] if want('habilidades') else []):
        try:
            b, pg = new_page(pw, cls)
            pg.evaluate(PLACE, [60, 70, 2.2, 12]); mm = near_mob(pg, 60, 70)
            tiles = []
            for i in range(7):
                pg.evaluate("""([i, mi]) => { const d = Game._dbg, p = d.G.player, m = d.mobs[mi]; m.hp = m.maxHp = 1e9; m.dead = false;
                  p.x = m.x - 5; p.z = m.z; p.cd = p.cd.map(() => 0); p.mp = 99999; d.cam.yaw = 1.57; d.cam.init = true; d.setTarget(m); Game.useSkill(i); }""", [i, mm['i']])
                pg.evaluate(SIM, 4); tiles.append(shot(pg))
                pg.evaluate(SIM, 8); tiles.append(shot(pg))
            sheet(tiles, f'habilidades_{cls}'); b.close()
        except Exception as e: log.append(f'ERRO habilidades {cls}: {e}')

    # 1c) retratos: Game.portrait (a mesma prévia da janela de Equipamento) de cada classe, fases 0 e 3, de frente e de costas, em alta resolução
    if want('retratos'):
        try:
            b, pg = new_page(pw, 'vanguard'); t, lb = [], []
            for cls in ['vanguard', 'arcanist', 'huntress', 'tamer']:
                for tier in (0, 3):
                    for yaw in (.25, 3.4):
                        url = pg.evaluate("""([cls, tier, yaw]) => { const d = Game._dbg, p = d.G.player; p.cls = cls; p.tier = tier; p.lvl = 50;
                          for (const s of ['w', 'h', 'a', 'l', 'b', 'c']) p.eq[s] = makeItem(s, cls, 50, tier ? 2 : 0, tier);
                          const cv = document.createElement('canvas'); cv.width = 420; cv.height = 560; Game.portrait(cv, yaw); return cv.toDataURL('image/png'); }""", [cls, tier, yaw])
                        import base64
                        t.append(Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGB')); lb.append(f'{cls} f{tier} {"frente" if yaw < 1 else "costas"}')
            sheet(t, 'retratos', cols=4, w=360, labels=lb); b.close()
        except Exception as e: log.append(f'ERRO retratos: {e}')

    # 1b) heróis: cada classe nas 4 fases com equipamento Comum da fase (+ 1 quadro Lendário na última), câmera próxima de frente, resolução 2x
    HCLIP = {'x': 470, 'y': 190, 'width': 340, 'height': 280}
    for cls in (['vanguard', 'arcanist', 'huntress', 'tamer'] if want('herois') else []):
        try:
            b, pg = new_page(pw, cls, 2); pg.evaluate(PLACE, [0, 6, .5, 12]); t = []
            for tier, boost in ((0, 0), (1, 0), (2, 0), (3, 0), (3, 4)):
                pg.evaluate("""([tier, boost]) => { const d = Game._dbg, p = d.G.player; p.tier = tier; p.lvl = 50; p.path = null; p.rot = .6;
                  for (const s of ['w', 'h', 'a', 'l', 'b', 'c']) p.eq[s] = makeItem(s, p.cls, 50, boost, tier); d.recalc(); d.cam.dist = 5; d.cam.pit = .42; d.cam.yaw = .6; d.cam.init = true; window.__sim(20); }""", [tier, boost])
                pg.wait_for_timeout(350); t.append(Image.open(io.BytesIO(pg.screenshot(clip=HCLIP))).convert('RGB'))
            sheet(t, f'herois_{cls}_fases', cols=3, w=400); b.close()
        except Exception as e: log.append(f'ERRO herois {cls}: {e}')

    # 2) restante com o Vanguarda
    b, pg = new_page(pw)
    # 2b) bestiário: um monstro de cada tipo (não-chefe), de perto, com o id no quadro; folhas de 12
    if want('bestiario'):
        try:
            ids = pg.evaluate("() => { const s = new Map(); for (const m of Game._dbg.mobs) if (!m.boss && !m.champ && !s.has(m.id)) s.set(m.id, m.name); return [...s]; }")
            flt = [x for x in os.environ.get('IDS', '').split(',') if x]; ids = [x for x in ids if not flt or x[0] in flt]  # IDS=wolfm,jackal filtra o bestiário
            BCLIP = {'x': 260, 'y': 150, 'width': 600, 'height': 450}; t, lb = [], []
            for mid, nm in ids:
                pg.evaluate("""(id) => { const d = Game._dbg, m = d.mobs.find(q => q.id === id && !q.boss), p = d.G.player; m.dead = false; m.hp = m.maxHp = 1e9; p.x = m.x - 6; p.z = m.z; p.path = null;
                  d.G.tod = 12; d.setWeather('clear', 0); d.cam.yaw = 1.57; d.cam.dist = 7.5; d.cam.pit = .5; d.cam.init = true; window.__sim(12); const dd = 2.2 + (m.rad || 1) * 1.7; p.x = m.x; p.z = m.z - dd; d.cam.yaw = 1.57; window.__sim(1); p.x = m.x; p.z = m.z - dd; }""", mid)
                pg.wait_for_timeout(350); t.append(Image.open(io.BytesIO(pg.screenshot(clip=BCLIP))).convert('RGB')); lb.append(mid)
            for k in range(0, len(t), 12): sheet(t[k:k + 12], f'bestiario_{k // 12 + 1}', cols=4, w=360, labels=lb[k:k + 12])
            log.append('bestiario: ' + ', '.join(lb))
        except Exception as e: log.append(f'ERRO bestiario: {e}')

    # 2c) locais secretos (SITES com poi): cada um de dia e de noite, câmera afastada; também confere a descoberta (G.rec.disc)
    if want('locais'):
        try:
            sites = pg.evaluate("() => SITES.filter(s => s.poi).map(s => [s.id, s.n, s.x, s.z])"); t, lb = [], []
            for sid, nm, sx, sz in sites:
                for tn, th in (('dia', 12), ('noite', 22)):
                    pg.evaluate("""([x, z, th]) => { const d = Game._dbg, p = d.G.player; p.x = x; p.z = z + 17; p.path = null; d.setWeather('clear', 0); d.G.tod = th; d.cam.yaw = 0; d.cam.dist = 24; d.cam.pit = .62; d.cam.init = false; window.__sim(120); d.G.tod = th; }""", [sx, sz, th])
                    pg.wait_for_timeout(500); t.append(shot(pg, False)); lb.append(f'{sid} {tn}')
            disc = pg.evaluate("() => Game._dbg.G.rec.disc")
            log.append('descobertos ao passar perto: ' + ', '.join(disc))
            for k in range(0, len(t), 4): sheet(t[k:k + 4], f'locais_{k // 4 + 1}', cols=2, w=720, labels=lb[k:k + 4])
        except Exception as e: log.append(f'ERRO locais: {e}')

    if want('drops'):
        try:  # morte e drops de monstro comum e de chefe
            pg.evaluate(PLACE, [60, 70, 2.2, 12]); mm = near_mob(pg, 60, 70); t = []
            pg.evaluate("""(mi) => { const d = Game._dbg, p = d.G.player, m = d.mobs[mi]; p.x = m.x - 4; p.z = m.z; d.cam.yaw = 1.57; d.cam.init = true; d.killMob(m); }""", mm['i'])
            for n in (3, 8, 40): pg.evaluate(SIM, n); t.append(shot(pg))
            bm = near_mob(pg, 62, -112, 'm.boss')
            pg.evaluate("""(mi) => { const d = Game._dbg, p = d.G.player, m = d.mobs[mi]; p.x = m.x - 6; p.z = m.z; d.cam.yaw = 1.57; d.cam.init = true; d.killMob(m); }""", bm['i'])
            for n in (3, 8, 40): pg.evaluate(SIM, n); t.append(shot(pg))
            sheet(t, 'morte_e_drops')
        except Exception as e: log.append(f'ERRO drops: {e}')

    if want('portal'):
        try:  # portal, de dia e de noite
            for tn, th in (('dia', 12), ('noite', 22)):
                px, pz = pg.evaluate("() => VILLAGES.find(v => v.id === 'aldoria').portal")
                pg.evaluate(PLACE, [px + 5, pz + 3, .8, th]); save(shot(pg, False), f'portal_aldoria_{tn}')
        except Exception as e: log.append(f'ERRO portal: {e}')

    if want('npcs'):
        try:  # NPCs: um de cada tipo
            kinds = pg.evaluate("() => { const s = new Set(), o = []; for (const n of NPCS) if (!s.has(n.kind)) { s.add(n.kind); o.push([n.kind, n.x, n.z]); } return o; }")
            t = []
            for k, x, z in kinds[:8]:
                pg.evaluate(PLACE, [x + 3, z + 5, .4, 12]); t.append(shot(pg))
            sheet(t, 'npcs_por_tipo', cols=2)
        except Exception as e: log.append(f'ERRO npcs: {e}')

    if want('elites'):
        try:  # elites (covis)
            el = pg.evaluate("() => { const o = [], z = new Set(); for (const m of Game._dbg.mobs) if (m.elite && !m.dead && !m.champ && !z.has(m.zone)) { z.add(m.zone); o.push([m.x, m.z]); } return o; }")
            t = []
            for x, z in el[:6]:
                pg.evaluate(PLACE, [x - 8, z, 1.57, 12]); t.append(shot(pg))
            sheet(t, 'elites')
        except Exception as e: log.append(f'ERRO elites: {e}')

    if want('chefes'):
        try:  # chefes: achados pelos próprios monstros (quadro inteiro, câmera afastada); parado e com telegraph
            n = pg.evaluate("() => Game._dbg.mobs.filter(m => m.boss).length")
            t, w, nomes = [], [], []
            for k in range(n):
                info = pg.evaluate("""(k) => { const d = Game._dbg, b = d.mobs.filter(m => m.boss)[k]; b.dead = false; b.hp = b.maxHp = 1e9;
                  const p = d.G.player; p.x = b.x - 9; p.z = b.z; p.path = null; d.G.tod = 12; d.setWeather('clear', 0); d.cam.yaw = 1.2; d.cam.dist = 24; d.cam.init = true; window.__sim(30); d.G.tod = 12; return b.name; }""", k)
                nomes.append(info); t.append(shot(pg, False))
                got = pg.evaluate("""(k) => { const d = Game._dbg, b = d.mobs.filter(m => m.boss)[k]; d.setTarget(b); for (let i = 0; i < 600; i++) { window.__sim(1); if (b.warn) return i; } return -1; }""", k)
                if got >= 0: w.append(shot(pg, False))
                else: log.append(f'sem telegraph em 30 s: {info}')
            log.append('chefes: ' + ', '.join(nomes))
            pg.evaluate("() => { Game._dbg.cam.dist = 15; }")
            sheet(t, 'chefes_parados', cols=2, w=640); sheet(w, 'chefes_telegraph', cols=2, w=640)
        except Exception as e: log.append(f'ERRO chefes: {e}')


    if want('montarias'):
        try:  # montarias
            pg.evaluate(PLACE, [0, 20, .5, 12])
            ids = pg.evaluate("() => { const p = Game._dbg.G.player; p.mounts = Object.keys(MOUNTS); p.mst = 100; Game._dbg.recalc(); return p.mounts; }")
            t = []
            for mid in ids[:12]:
                pg.evaluate("(id) => { Game.toggleMount(id); window.__sim(15); }", mid); t.append(shot(pg))
                pg.evaluate("() => Game.toggleMount()")
            sheet(t, 'montarias', cols=3, w=420)
        except Exception as e: log.append(f'ERRO montarias: {e}')

    if want('clima'):
        try:  # clima (espera a transição do clima completar)
            t = []
            for wid in ('rain', 'storm', 'fog'):
                pg.evaluate(PLACE, [60, 70, 2.2, 12]); pg.evaluate("(w) => Game._dbg.setWeather(w)", wid); pg.evaluate(SIM, 240); t.append(shot(pg, False))
            sheet(t, 'clima_chuva_tempestade_neblina', cols=1, w=640)
        except Exception as e: log.append(f'ERRO clima: {e}')


    if want('vilas'):
        try:  # vilas (dia)
            t = []
            for vid in pg.evaluate("() => VILLAGES.map(v => v.id)"):
                ar = pg.evaluate("(id) => VILLAGES.find(v => v.id === id).arrive", vid)
                pg.evaluate(PLACE, [ar[0], ar[1], .6, 12]); t.append(shot(pg))
            sheet(t, 'vilas', cols=3, w=420)
        except Exception as e: log.append(f'ERRO vilas: {e}')

    if want('qualidade'):
        try:  # qualidade Baixa / Média / Alta
            pg.evaluate("() => { window.__freeq = true; }")
            for spot, nm in (([0, 6, .5], 'praca'), ([225, 20, 1.0], 'floresta')):
                t = []
                for q in (0, 1, 2):
                    pg.evaluate(PLACE, spot + [12]); pg.evaluate("(q) => Game._dbg.R.setQuality(q)", q); pg.wait_for_timeout(600); t.append(shot(pg, False))
                sheet(t, f'qualidade_{nm}_baixa_media_alta', cols=1, w=800)
        except Exception as e: log.append(f'ERRO qualidade: {e}')
    b.close()

print('\n'.join(log))
