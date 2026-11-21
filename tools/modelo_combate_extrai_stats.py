import json
from playwright.sync_api import sync_playwright
HTML="file:///C:/Users/danni/iCloudDrive/projetos/Aldoria/dist/aldoria.html"
with sync_playwright() as pw:
    b=pw.chromium.launch(channel="msedge",headless=True,args=["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    pg=b.new_context().new_page(); pg.goto(HTML); pg.wait_for_function("typeof Game !== 'undefined'"); pg.evaluate("Game.newGame('vanguard')"); pg.wait_for_timeout(800)
    r=pg.evaluate("""() => { const d=Game._dbg, G=d.G, p=G.player, out={};
      for (const cls of ['vanguard','arcanist','huntress','tamer']) { out[cls]={};
        for (const [L,tier] of [[10,0],[25,0],[40,0],[50,0],[50,3]]) {
          p.cls=cls; p.tier=tier; p.lvl=lvForEff(L,tier); p.eq={w:null,h:null,a:null,l:null,b:null,c:null};
          const g=Math.min(5,Math.floor(L/9));
          for (const s of ['w','h','a','l','b','c']) p.eq[s]=buildItem(s, cls, L, 0, s==='w'?WTYPES[cls][0]:undefined, tier);
          const ap=5*(L-1), m=CLASSES[cls].main, A={str:0,dex:0,int:0,vit:0,spi:0}; A[m]=Math.round(ap*.7); A.vit=ap-A[m]; p.attr=A;
          d.recalc(); const S=G.stats;
          out[cls][L+'_t'+tier]={ atk:S.atk, def:S.def, hp:S.maxHp, mp:S.maxMp, crit:S.crit, dodge:S.dodge, aspd:S.aspd, skillMul:S.skillMul, spd:S.spd, wt:p.eq.w.wt, grade:g };
        } }
      return out; }""")
    json.dump(r, open('class_stats.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
    for c,v in r.items():
        for k,s in v.items(): print(c,k,{a:round(b_,2) if isinstance(b_,(int,float)) else b_ for a,b_ in s.items()})
    b.close()
