import json
from playwright.sync_api import sync_playwright
HTML="file:///C:/Users/danni/iCloudDrive/projetos/Aldoria/dist/aldoria.html"
with sync_playwright() as pw:
    b=pw.chromium.launch(channel="msedge",headless=True,args=["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    pg=b.new_context().new_page(); pg.goto(HTML); pg.wait_for_function("typeof Game !== 'undefined'"); pg.evaluate("Game.newGame('vanguard')"); pg.wait_for_timeout(800)
    r=pg.evaluate("""() => ({ classes: CLASSES, mounts: MOUNTS, mdrop: MOUNT_DROP, cfgMount: CFG.drop.mount, mmax: MOUNT_MAXLV, skLearn: SK_LEARN, attrs: ATTRS, tmul: TMUL, wm: WMUL, wt: WTYPES,
      mountLvBon: [1,5,10,20,30].map(l => ({ l, v: typeof mountLvBon==='function' ? mountLvBon(l) : null })), xpNeed: [10,20,30,40,50].map(l=>[l,xpNeed(l)]),
      mstats: [10,25,40,50].map(l => ({ l, ...mobStats(l, null) })) })""")
    json.dump(r, open('classes_dump.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
    c=r['classes']['vanguard']; print(list(c.keys())); print(json.dumps(c['skills'][0], ensure_ascii=False)); print(json.dumps(c['skills'][2], ensure_ascii=False))
    print(list(r['mounts'].items())[0]); print(r['mdrop']); print(r['skLearn']); print(r['mountLvBon'])
    b.close()
