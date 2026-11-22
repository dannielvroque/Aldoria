import os, sys
root = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(root, 'src')
read = lambda n: open(os.path.join(src, n), encoding='utf-8').read()
order = ['engine.js', 'data.js', 'meshes_extra.js'] + (['assets_data.js'] if os.path.exists(os.path.join(src, 'assets_data.js')) else []) + ['skin.js', 'models.js', 'art.js', 'story.js', 'encounters.js', 'audio.js', 'cloud.js', 'world.js', 'ui.js', 'game.js', 'admin.js']
missing = [f for f in order + ['style.css', 'index.html'] if not os.path.exists(os.path.join(src, f))]
if missing:
    sys.exit('faltando: ' + ', '.join(missing))
# save na nuvem: cloud.json (saída cloud_json do Terraform) vira CLOUD_CFG; sem o arquivo o recurso fica oculto
cj = os.path.join(root, 'cloud.json')
cfg = open(cj, encoding='utf-8').read().strip() if os.path.exists(cj) else 'null'
js = 'const CLOUD_CFG = %s;\n' % cfg + '\n'.join('/* ---- %s ---- */\n%s' % (f, read(f)) for f in order)
html = read('index.html').replace('{{CSS}}', read('style.css')).replace('{{JS}}', js)
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
out = os.path.join(root, 'dist', 'aldoria.html')
open(out, 'w', encoding='utf-8').write(html)
print('ok', out, len(html), 'bytes')
