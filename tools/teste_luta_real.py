"""Luta real dentro do jogo: cada classe, vários níveis, equipamento Comum do grau do nível, só habilidades já aprendidas, sem poções,
contra um monstro normal e um elite do mesmo nível (ou de nível diferente: DLV). Mede tempo para matar e vida perdida.
Uso: python tools/teste_luta_real.py [niveis separados por vírgula] [DLV]   (ex.: 1,3,5,8,12,20,30,40,50  ou  5 -3)
Saída: tabela no terminal. Serve para ajustar mobStats/ELITE_M (data.js) e acompanhar o balanceamento."""
import os, sys, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = 'file:///' + os.path.join(ROOT, 'dist', 'aldoria.html').replace(os.sep, '/')
LEVELS = [int(x) for x in (sys.argv[1] if len(sys.argv) > 1 else '1,3,5,8,12,20,30,40,50').split(',')]
DLV = int(sys.argv[2]) if len(sys.argv) > 2 else 0
TRIALS = int(os.environ.get("TRIALS", "4"))
HPF = float(os.environ.get("HPF", "1"))  # multiplica a vida dos monstros no teste (para achar o fator ideal antes de mudar o jogo)
SK = os.environ.get("SK", "1") == "1"  # 1: automático de ataque e habilidades ligado (como no jogo); 0: só ataque básico
GEAR = os.environ.get("GEAR", "tier")  # tier: itens Comuns da fase; carry: equipamento da fase anterior no fim dela (nv 50, Épico, +9), como quem acabou de evoluir
TIER = int(os.environ.get("TIER", "0"))  # fase do personagem (0 Mortal .. 3 Supremo); monstros e itens acompanham
JS = """([levels, dlv, trials, TIER, GEAR, SK, HPF]) => { const TM = TMUL[TIER]; const d = Game._dbg, G = d.G, p = G.player, out = {};
  const far = G.mobs.filter(m => !m.dead && !m.boss && Math.hypot(m.x, m.z) > 120).slice(0, 3); const m = far[0];
  for (const o of G.mobs) if (o !== m && Math.hypot(o.x - m.x, o.z - m.z) < 60) { o.dead = true; o.respawnAt = 1e9; } // isola o monstro do teste (vizinhos entrariam na luta)
  G.state = 'play'; G.auto.attack = true; G.auto.skills = true; G.auto.hp = false; G.auto.mp = false;
  for (const cls of ['vanguard', 'arcanist', 'huntress', 'tamer']) { out[cls] = {};
    for (const L of levels) for (const kind of ['normal', 'elite', 'champ', 'boss']) { const rs = [];
      for (let t = 0; t < trials; t++) {
        p.cls = cls; p.tier = TIER; p.lvl = lvForEff(L, TIER); p.eq = { w: null, h: null, a: null, l: null, g: null, b: null, c: null };
        for (const s of ['w', 'h', 'a', 'l', 'g', 'b', 'c']) { if (GEAR === 'carry' && TIER > 0) { const it = buildItem(s, cls, 50, 3, s === 'w' ? WTYPES[cls][0] : undefined, TIER - 1); it.plus = 9; p.eq[s] = it; } else p.eq[s] = buildItem(s, cls, L, 0, s === 'w' ? WTYPES[cls][0] : undefined, TIER); }
        const ap = apAt(p.lvl), mn = CLASSES[cls].main, A = { str: 0, dex: 0, int: 0, vit: 0, spi: 0 }; A[mn] = Math.round(ap * .7); A.vit = ap - A[mn]; p.attr = A;
        p.sk = CLASSES[cls].skills.map((_, i) => SK_LEARN[i].lvl <= L && !(CLASSES[cls].skills[i].tier > 0) ? 1 : 0); p.cd = p.cd.map(() => 0);
        d.recalc(); p.hp = p.maxHp; p.mp = p.maxMp; G.dead = false; p.shield = { hp: 0, t: 0 }; for (const k in p.buffs) p.buffs[k].t = 0;
        const ml = Math.max(1, L + dlv + (kind === 'champ' ? 1 : 0)), s = mobStats(ml, kind === 'elite' ? ELITE_M : kind === 'champ' ? { hpm: 7, atkm: 1.9, xpm: 18, hpk: ELITE_HPK } : kind === 'boss' ? { hpm: 13, atkm: 1.7, xpm: 14, hpk: BOSS_HPK } : null);
        m.lvl = ml; m.bhp = s.hp; m.batk = s.atk; m.def = s.def; m.maxHp = s.hp * TM * HPF; m.hp = s.hp * TM * HPF; m.atk = s.atk * TM; m.dead = false; m.state = 'chase'; m.stun = 0; m.slow = 0; m.dots = []; m.mark = 0; m.warn = null;
        G.auto.attack = SK; G.auto.skills = SK; p.x = m.x + 4; p.z = m.z; p.path = null; d.attack(m); const hp0 = p.maxHp; let ticks = 0, died = false, dmg = 0, prev = p.hp;
        // o personagem nunca morre no teste (morrer deixa a tela de morte aberta e desliga o automático nas lutas seguintes): vida enorme e o dano é a diferença; morrer = dano >= vida máxima real
        const BIG = 1e9; while (!m.dead && ticks < 2400) { p.maxHp = BIG; p.hp = BIG; d.sim(1, .05); ticks++; if (!m.dead && p.maxHp === BIG) dmg += BIG - Math.min(BIG, p.hp); if (dmg >= hp0) died = true; } // recálculo da vida (subir de nível ao matar, buff que termina) reseta maxHp: esse instante não conta
        rs.push({ ttk: ticks * .05, lost: Math.min(dmg / hp0, 9.99), died, killed: m.dead }); d.recalc(); p.hp = p.maxHp;
      }
      const n = rs.length, av = k => rs.reduce((a, r) => a + r[k], 0) / n;
      out[cls][L + ':' + kind] = { ttk: +av('ttk').toFixed(1), lost: +(av('lost') * 100).toFixed(0), deaths: rs.filter(r => r.died).length, kills: rs.filter(r => r.killed).length };
    } }
  return out; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(channel='msedge', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_context().new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.goto(HTML); pg.wait_for_function("typeof Game !== 'undefined'"); pg.evaluate("Game.newGame('vanguard')"); pg.wait_for_timeout(1200)
    r = pg.evaluate(JS, [LEVELS, DLV, TRIALS, TIER, GEAR, SK, HPF]); b.close()
if errs: print('ERROS:', errs)
print('Luta real (mobs de nível jogador%+d); cada célula: segundos para matar / %% da vida perdida / mortes' % DLV)
for kind in ('normal', 'elite', 'champ', 'boss'):
    print('\n== monstro', kind)
    print('classe     ' + ''.join(f'{L:>14}' for L in LEVELS))
    for cls, v in r.items():
        print(f'{cls:10} ' + ''.join(f"{(str(v[f'{L}:{kind}']['ttk']) + 's/' + str(v[f'{L}:{kind}']['lost']) + '%/' + str(v[f'{L}:{kind}']['deaths'])):>14}" for L in LEVELS))
json.dump(r, open(os.path.join(os.environ.get('TEMP', '.'), 'luta_real.json'), 'w'), indent=1)
