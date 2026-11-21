"""Teste offline dos sons do Aldoria (src/audio.js): renderiza cada efeito, o ambiente de cada bioma e a música de cada região num OfflineAudioContext
e mede pico, energia (RMS), duração útil, silêncio, NaN e estouro. NÃO avalia se o som é bonito (isso é auditivo e é do usuário): só pega sons mudos, estourados ou quebrados.

Uso:  python tools/teste_sons.py      (depois de python build.py; requer playwright + Edge)
"""
import json, os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = 'file:///' + os.path.join(ROOT, 'dist', 'aldoria.html').replace(os.sep, '/')
JS = r"""async () => {
  const SR = 44100, out = { fx: {}, amb: {}, mus: {}, erros: [] };
  const stats = buf => { let pk = 0, ss = 0, nan = 0, n = 0, lastLoud = 0; const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
    for (let i = 0; i < L.length; i++) { const v = L[i], w = R[i]; if (v !== v || w !== w) nan++; const a = Math.max(Math.abs(v), Math.abs(w)); if (a > pk) pk = a; ss += v * v; n++; if (a > .004) lastLoud = i; }
    return { pico: +pk.toFixed(3), rms: +Math.sqrt(ss / n).toFixed(4), util: +(lastLoud / SR).toFixed(2), nan }; };
  const E0 = createSoundEngine(); const names = E0.names();
  for (const nm of names) {
    try { const oc = new OfflineAudioContext(2, SR * 3.5, SR), E = createSoundEngine(); E.init(oc); E.play(nm, { force: true }); const b = await oc.startRendering(); out.fx[nm] = stats(b); }
    catch (e) { out.erros.push(nm + ': ' + e.message); }
  }
  const env0 = { rain: 0, storm: 0, coast: 0, town: false, tod: 12 };
  for (const [z, extra] of [['field', {}], ['forest', {}], ['ruins', {}], ['dunes', {}], ['tundra', {}], ['ashlands', {}], ['field', { town: true }], ['field', { rain: 1, storm: 1 }], ['field', { tod: 23, coast: 1 }]]) {
    const key = z + JSON.stringify(extra);
    try { const oc = new OfflineAudioContext(2, SR * 10, SR), E = createSoundEngine(); let T = 0; E.setClock(() => T); E.init(oc); const env = Object.assign({}, env0, { zone: z }, extra);
      for (let s = 0; s < 10; s++) { T = s; E.tick(1, env); } const b = await oc.startRendering(); out.amb[key] = stats(b); }
    catch (e) { out.erros.push('amb ' + key + ': ' + e.message); }
  }
  for (const z of E0.zones().concat(['battle:ruins'])) {
    try { const oc = new OfflineAudioContext(2, SR * 14, SR), E = createSoundEngine(); let T = 0; E.setClock(() => T); E.init(oc); const batt = z.startsWith('battle'), zone = batt ? 'ruins' : z, env = { zone, town: zone === 'town', boss: batt, fight: batt ? 1 : 0, tod: 12 };
      for (let s = 0; s < 14; s++) { T = s; E.music(env, 1); } const b = await oc.startRendering(); out.mus[z] = stats(b); }
    catch (e) { out.erros.push('mus ' + z + ': ' + e.message); }
  }
  return out;
}"""
with sync_playwright() as pw:
    b = pw.chromium.launch(channel='msedge', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
    pg = b.new_context().new_page(); erros = []
    pg.on('pageerror', lambda e: erros.append(str(e))); pg.goto(HTML); pg.wait_for_function("typeof createSoundEngine !== 'undefined'")
    r = pg.evaluate(JS); b.close()
problemas = []
def avalia(grupo, nome, s, min_rms, max_pico=0.985):
    if s['nan']: problemas.append(f'{grupo} {nome}: NaN')
    if s['rms'] < min_rms: problemas.append(f'{grupo} {nome}: quase mudo (rms {s["rms"]})')
    if s['pico'] > max_pico: problemas.append(f'{grupo} {nome}: pico {s["pico"]} (estourou)')
for n, s in r['fx'].items():
    avalia('fx', n, s, 0)
    if s['pico'] < .02: problemas.append(f'fx {n}: pico muito baixo ({s["pico"]})')
for n, s in r['amb'].items(): avalia('amb', n, s, .0008)
for n, s in r['mus'].items(): avalia('mus', n, s, .002)
print('efeitos:', len(r['fx']), '| ambientes:', len(r['amb']), '| músicas:', len(r['mus']))
print('picos dos efeitos (maiores):', sorted(((s['pico'], n) for n, s in r['fx'].items()), reverse=True)[:6])
print('rms dos efeitos (menores):', sorted(((s['rms'], n) for n, s in r['fx'].items()))[:6])
print('ambiente:', {k: (v['rms'], v['pico']) for k, v in r['amb'].items()})
print('música:', {k: (v['rms'], v['pico']) for k, v in r['mus'].items()})
print('ERROS DE EXECUÇÃO:', r['erros'] + erros)
print('PROBLEMAS:', problemas or 'nenhum')
json.dump(r, open(os.path.join(ROOT, 'docs', 'sons_medicao.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
