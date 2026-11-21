"""Modelo de combate por classe (usado em docs/RELATORIO_CLASSES_SKILLS_MONTARIAS.md).
Entrada: classes_dump.json (CLASSES, MOUNTS, SK_LEARN...) e class_stats.json (G.stats de cada classe/nivel/fase com equipamento de classe, extraidos do jogo
via Game._dbg + recalc). Saida: class_model.json. Ver o relatorio para as premissas (rotacao de 60 s, valores esperados, monstro do mesmo nivel).
Como rodar (na pasta onde ficarao os JSONs): modelo_combate_extrai_classes.py -> classes_dump.json; modelo_combate_extrai_stats.py -> class_stats.json; depois este script -> class_model.json. Os JSONs de entrada sao gerados por scripts Playwright que leem o jogo (G.stats depois de equipar buildItem(...) de cada classe e distribuir 70 % dos pontos no atributo principal).
"""
import json, math
D=json.load(open('classes_dump.json',encoding='utf-8')); ST=json.load(open('class_stats.json',encoding='utf-8'))
TM=[1,1.8,3.2,5.5]
def mob(L,t): 
    T=TM[t]; return dict(hp=(90+40*L)*(1+L/250)*T, atk=(5+2.6*L)*(1+L/9)*(1+L/100)*T*1.4, def_=2.2*L)
def simulate(cls, key, N, secs=60):
    c=D['classes'][cls]; S=ST[cls][key]; L=int(key.split('_')[0]); t=int(key.split('_t')[1]); mb=mob(L,t)
    sk=[s for s in c['skills'] if s.get('tier',0)<=t]
    mp=S['mp']; maxmp=S['mp']; cd={i:0 for i in range(len(sk))}; basic_cd=0; dps_total=0; buffs=[]; mark=0; markv=0; dt=.1; casts={}
    defm=100/(100+mb['def_']); critc=min(1,S['crit'])
    pet={'dps':0}; out_pet=0
    def mult(kind):
        a=1;s=1;cr=0
        for b in buffs:
            if b['t']>0: a*=1+b.get('atk',0); s*=1+b.get('aspd',0); cr+=b.get('crit',0)
        return a,s,cr
    time=0
    while time<secs:
        a,sp,crb=mult(0); crit=min(1,critc+crb); cm=1+crit; mk=1+(markv if mark>0 else 0)
        # habilidades por prioridade de dano
        order=sorted(range(len(sk)), key=lambda i:-(sk[i].get('m',0)*(N if sk[i]['k'] in('aoe_self','aoe_ground') else 1)))
        for i in order:
            s=sk[i]
            if cd[i]>0 or mp<s['mp']: continue
            k=s['k']
            if k in('shield','heal'): 
                continue
            if k=='summon':
                continue
            if k=='buff': 
                buffs.append(dict(t=s['dur'],atk=s.get('atk',0),aspd=s.get('aspd',0),crit=s.get('crit',0))); cd[i]=s['cd']; mp-=s['mp']; casts[s['n']]=casts.get(s['n'],0)+1; continue
            if k=='mark': mark=s['dur']; markv=s['v']; cd[i]=s['cd']; mp-=s['mp']; casts[s['n']]=casts.get(s['n'],0)+1; continue
            m=s.get('m',0); hits=1
            if k in('aoe_self','aoe_ground'): hits=N
            if k=='pierce': hits=min(N,3)
            if k=='proj' and s.get('multi'): hits=1+min(s['multi'],N-1)
            c2=1+(1 if s.get('crit')==1 else crit)
            d=S['atk']*a*m*S['skillMul']*defm*c2*hits*mk
            if s.get('dot'): d+=S['atk']*a*S['skillMul']*m*.15*s['dot']*hits
            dps_total+=d; cd[i]=s['cd']; mp-=s['mp']; casts[s['n']]=casts.get(s['n'],0)+1
            if c.get('res'): mp=min(maxmp, mp+max(1,maxmp*.04)*hits)
            break
        if basic_cd<=0:
            d=S['atk']*a*defm*cm*mk; dps_total+=d; basic_cd=1.1/(S['aspd']*sp)
            if c.get('res'): mp=min(maxmp, mp+max(1,maxmp*.04))
        basic_cd-=dt
        for i in cd: cd[i]=max(0,cd[i]-dt)
        for b in buffs: b['t']-=dt
        mark-=dt; mp=min(maxmp, mp+maxmp*.006*dt); time+=dt
    pdps=0
    if cls=='tamer':
        petatk=S['atk']*S['skillMul']*.6; pdps=petatk*defm/1.2*(1+0)  # lobo
        if t>=0 and L>=20: pdps+=S['atk']*S['skillMul']*.95*defm/1.2*.0  # (espírito/golem: ignorados no total conservador)
    dps=dps_total/secs+pdps
    return dict(dps=dps, mp_end=mp, casts=casts, pet=pdps)
rows=[]
res={}
for cls in D['classes']:
    res[cls]={}
    for key in ST[cls]:
        S=ST[cls][key]; L=int(key.split('_')[0]); t=int(key.split('_t')[1]); mb=mob(L,t)
        r1=simulate(cls,key,1); r3=simulate(cls,key,3)
        ttk=mb['hp']/max(1,r1['dps'])
        din=mb['atk']*(100*TM[t])/(100*TM[t]+S['def'])/1.6*(1-S['dodge'])*(1-(.08+.03*t if cls=='vanguard' else 0)); dtot=[din*n for n in (1,3)]
        ttl1=S['hp']/max(.01,dtot[0]); ttl3=S['hp']/max(.01,dtot[1])
        res[cls][key]=dict(dps1=round(r1['dps']),dps3=round(r3['dps']),ttk=round(ttk,1),ttl1=round(ttl1,1),ttl3=round(ttl3,1),margin1=round(ttl1/ttk,2),margin3=round(ttl3/(ttk*3),2),mp_end=round(r1['mp_end']/S['mp'],2),pet=round(r1['pet']), casts=r1['casts'], hp=S['hp'],defv=round(S['def']),crit=round(S['crit'],2),dodge=round(S['dodge'],2))
json.dump(res,open('class_model.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('classe nivel  dps1 dps3  ttk(s) | sobrev1 sobrev3 (s) | margem1 margem3 | mana final')
for cls,v in res.items():
    for k,r in v.items(): print(f"{cls:9} {k:7} {r['dps1']:6} {r['dps3']:6} {r['ttk']:6} | {r['ttl1']:6} {r['ttl3']:6} | {r['margin1']:5} {r['margin3']:5} | {r['mp_end']}")
