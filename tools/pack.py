"""Empacota os FBX de assets/ em src/assets_data.js.
Convenção: assets/<nome>.fbx com malha = personagem (ex.: archer.fbx); animações: assets/anim_<nome>.fbx (sem pele ou com)."""
import os, sys, json, glob
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
sys.path.insert(0, here)
from fbx2aldoria import convert
chars, anims = {}, {}
for f in sorted(glob.glob(os.path.join(root, 'assets', '*.fbx'))):
    n = os.path.splitext(os.path.basename(f))[0]
    if n.lower().startswith('anim_'):
        anims[n[5:]] = convert(f, True, n[5:])['anim']
    else:
        o = convert(f, False, n); chars[n] = {k: v for k, v in o.items() if k != 'anim'}; anims.setdefault('_' + n, o['anim'])
    print('ok', f)
open(os.path.join(root, 'src', 'assets_data.js'), 'w').write('const ASSETS = ' + json.dumps({'chars': chars, 'anims': anims}) + ';\n')
print('gerado src/assets_data.js')
