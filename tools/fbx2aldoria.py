"""Converte FBX binário do Mixamo (malha com pele + animação) para o formato compacto do Aldoria.
Uso: python fbx2aldoria.py modelo.fbx saida.json   (malha + animação)   |   python fbx2aldoria.py anim.fbx saida.json --anim-only
Os dedos são fundidos na mão para ficar com ~22 ossos."""
import sys, struct, json, base64, math, os
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fbxparse import parse

KEEP = ['Hips','Spine','Spine1','Spine2','Neck','Head','LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm','RightForeArm','RightHand',
        'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','RightUpLeg','RightLeg','RightFoot','RightToeBase']
def arr(p):
    if isinstance(p, tuple):
        f, n, raw = p; return np.array(struct.unpack('<%d%s' % (n, f), raw), dtype=np.float64 if f in 'dl' else np.float64)
    return np.array(p, dtype=np.float64)
def props70(node):
    r = {}
    for c in node[2]:
        if c[0] == 'Properties70':
            for p in c[2]: r[p[1][0]] = p[1][4:]
    return r
def rot_mat(deg, order='XYZ'):
    rx, ry, rz = [math.radians(a) for a in deg]
    cx, sx, cy, sy, cz, sz = math.cos(rx), math.sin(rx), math.cos(ry), math.sin(ry), math.cos(rz), math.sin(rz)
    X = np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]]); Y = np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]]); Z = np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]])
    M = np.eye(4); M[:3,:3] = Z @ Y @ X; return M   # ordem XYZ do FBX: X aplicado primeiro
def local_mat(t, r, s, pre):
    T = np.eye(4); T[:3,3] = t
    S = np.diag([s[0], s[1], s[2], 1.0])
    return T @ rot_mat(pre) @ rot_mat(r) @ S

def convert(path, anim_only=False, anim_name='anim'):
    ver, nodes = parse(path)
    O = [n for n in nodes if n[0] == 'Objects'][0][2]; Cn = [n for n in nodes if n[0] == 'Connections'][0][2]
    byid = {k[1][0]: k for k in O if k[1] and isinstance(k[1][0], int)}
    kids, parents, oprop = {}, {}, {}
    for c in Cn:
        typ, ch, pa = c[1][0], c[1][1], c[1][2]
        kids.setdefault(pa, []).append(ch); parents.setdefault(ch, []).append(pa)
        if typ == 'OP' and len(c[1]) > 3: oprop[(ch, pa)] = c[1][3]
    nm = lambda k: k[1][1].split('\x00')[0].replace('mixamorig:', '')
    bones = {k[1][0]: k for k in O if k[0] == 'Model' and k[1][2] == 'LimbNode'}
    bname = {i: nm(k) for i, k in bones.items()}
    bpar = {}
    for i in bones:
        for p in parents.get(i, []):
            if p in bones: bpar[i] = p
    keep_ids = [next(i for i, n in bname.items() if n == kn) for kn in KEEP]
    kidx = {i: n for n, i in enumerate(keep_ids)}
    def kept_ancestor(i):
        while i is not None and i not in kidx: i = bpar.get(i)
        return i
    # hierarquia dos ossos mantidos
    kparent = [(-1 if kept_ancestor(bpar.get(i)) is None else kidx[kept_ancestor(bpar.get(i))]) for i in keep_ids]
    # pose de repouso local
    def bone_default(i):
        p = props70(bones[i]); return list(p.get('Lcl Translation', [0,0,0])[:3]), list(p.get('Lcl Rotation', [0,0,0])[:3]), list(p.get('Lcl Scaling', [1,1,1])[:3]), list(p.get('PreRotation', [0,0,0])[:3])
    # animação
    curves = {}  # (boneid, 'T'/'R'/'S') -> [3 curves (times, values)]
    for cn in [k for k in O if k[0] == 'AnimationCurveNode']:
        cid = cn[1][0]; target = None
        for p in parents.get(cid, []):
            if p in bones: target = p; prop = oprop.get((cid, p), '')
        if target is None: continue
        ch = {}
        for sub in kids.get(cid, []):
            k = byid.get(sub)
            if k and k[0] == 'AnimationCurve':
                axis = oprop.get((sub, cid), 'd|X')[-1]; tm = vv = None
                for c in k[2]:
                    if c[0] == 'KeyTime': tm = arr(c[1][0])
                    if c[0] == 'KeyValueFloat': vv = arr(c[1][0])
                ch['XYZ'.index(axis)] = (tm, vv)
        key = {'Lcl Translation': 'T', 'Lcl Rotation': 'R', 'Lcl Scaling': 'S'}.get(prop)
        if key: curves[(target, key)] = ch
    tmax = max([c[0][-1] for ch in curves.values() for c in ch.values()] or [0]); dur = tmax / 46186158000.0
    FPS = 30; nf = max(2, int(round(dur * FPS)) + 1) if curves else 1
    def sample(ch, default, t):
        out = list(default)
        for a, (tm, vv) in ch.items():
            ts = tm / 46186158000.0; out[a] = float(np.interp(t, ts, vv))
        return out
    def world_at(t):
        W = {}
        def rec(i):
            if i in W: return W[i]
            d = bone_default(i); T = sample(curves.get((i, 'T'), {}), d[0], t) if t is not None else d[0]
            R = sample(curves.get((i, 'R'), {}), d[1], t) if t is not None else d[1]; S = sample(curves.get((i, 'S'), {}), d[2], t) if t is not None else d[2]
            L = local_mat(T, R, S, d[3]); p = bpar.get(i)
            W[i] = (rec(p) if p else np.eye(4)) @ L; return W[i]
        for i in bones: rec(i)
        return W
    # bind (TransformLink dos clusters)
    bind = {}; meshes = []
    for sk in [k for k in O if k[0] == 'Deformer' and k[1][2] == 'Skin']:
        for cl in kids.get(sk[1][0], []):
            c = byid.get(cl)
            if not c or c[0] != 'Deformer': continue
    clusters = [k for k in O if k[0] == 'Deformer' and k[1][2] == 'Cluster']
    for c in clusters:
        for b in [x for x in kids.get(c[1][0], []) if x in bones]:
            for n in c[2]:
                if n[0] == 'TransformLink': bind[b] = np.array(arr(n[1][0])).reshape(4, 4).T
    inv_bind = []
    for i in keep_ids: inv_bind.append(np.linalg.inv(bind.get(i, world_at(None)[i])))
    out = {'bones': KEEP, 'parent': kparent, 'fps': FPS}
    # animação -> matrizes de pele por quadro
    frames = []
    for f in range(nf):
        W = world_at(f / FPS if curves else None)
        frames.append(np.stack([(W[i] @ inv_bind[n]).T.astype(np.float32).reshape(-1) for n, i in enumerate(keep_ids)]))
    A = np.stack(frames)
    out['anim'] = {'name': anim_name, 'frames': nf, 'data': base64.b64encode(A.astype(np.float32).tobytes()).decode()}
    if anim_only: return out
    # malha
    P, N, UV, J, Wt, I, MT = [], [], [], [], [], [], []
    for gm in [k for k in O if k[0] == 'Geometry' and k[1][2] == 'Mesh']:
        gid = gm[1][0]; gname = nm(gm)
        g = {c[0]: c for c in gm[2]}
        V = arr(g['Vertices'][1][0]).reshape(-1, 3); PV = arr(g['PolygonVertexIndex'][1][0]).astype(int)
        nrm = None
        for c in gm[2]:
            if c[0] == 'LayerElementNormal':
                d = {x[0]: x for x in c[2]}; nrm = (arr(d['Normals'][1][0]).reshape(-1, 3), arr(d['NormalsIndex'][1][0]).astype(int) if 'NormalsIndex' in d else None, d['MappingInformationType'][1][0])
            if c[0] == 'LayerElementUV':
                d = {x[0]: x for x in c[2]}; uvs = (arr(d['UV'][1][0]).reshape(-1, 2), arr(d['UVIndex'][1][0]).astype(int) if 'UVIndex' in d else None)
        # pesos por vértice -> osso mantido
        vw = [dict() for _ in range(len(V))]
        skin = next((s for s in kids.get(gid, []) if byid.get(s) and byid[s][0] == 'Deformer'), None)
        for cl in kids.get(skin, []):
            c = byid.get(cl)
            if not c or c[0] != 'Deformer': continue
            bs = [x for x in kids.get(cl, []) if x in bones]
            if not bs: continue
            ka = kept_ancestor(bs[0]); idxs = None; wts = None
            for n in c[2]:
                if n[0] == 'Indexes': idxs = arr(n[1][0]).astype(int)
                if n[0] == 'Weights': wts = arr(n[1][0])
            if idxs is None: continue
            for vi, w in zip(idxs, wts): vw[vi][kidx[ka]] = vw[vi].get(kidx[ka], 0) + w
        base = len(P) // 1; cache = {}; poly = []; vcount = 0
        for pi_, idx in enumerate(PV):
            end = idx < 0; vi = ~idx if end else idx
            poly.append((vcount, vi)); vcount += 1
            if end:
                ids = []
                for (pvi, vi2) in poly:
                    ni = nrm[0][vi2 if nrm[2] == 'ByVertice' else (nrm[1][pvi] if nrm[1] is not None else pvi)] if nrm else (0, 1, 0)
                    uv = uvs[0][uvs[1][pvi] if uvs[1] is not None else pvi]
                    key = (vi2, tuple(np.round(ni, 3)), round(float(uv[0]), 4), round(float(uv[1]), 4))
                    if key not in cache:
                        ws = sorted(vw[vi2].items(), key=lambda x: -x[1])[:4]; s = sum(w for _, w in ws) or 1
                        ws = [(b, w / s) for b, w in ws] + [(0, 0)] * (4 - len(ws))
                        cache[key] = len(P) - base if False else len(P)
                        P.append(V[vi2].tolist()); N.append(list(ni)); UV.append([float(uv[0]), float(uv[1])]); J.append([b for b, _ in ws]); Wt.append([w for _, w in ws]); MT.append(len(meshes))
                    ids.append(cache[key])
                for k in range(1, len(ids) - 1): I.extend([ids[0], ids[k], ids[k + 1]])
                poly = []
        meshes.append(gname)
    out['mesh'] = {'n': len(P), 'pos': base64.b64encode(np.array(P, np.float32).tobytes()).decode(), 'nor': base64.b64encode(np.array(N, np.float32).tobytes()).decode(),
                   'uv': base64.b64encode(np.array(UV, np.float32).tobytes()).decode(), 'joints': base64.b64encode(np.array(J, np.uint8).tobytes()).decode(),
                   'weights': base64.b64encode(np.array(Wt, np.float32).tobytes()).decode(), 'idx': base64.b64encode(np.array(I, np.uint32).tobytes()).decode(), 'mat': base64.b64encode(np.array(MT, np.uint8).tobytes()).decode(), 'tris': len(I) // 3, 'parts': meshes}
    return out

if __name__ == '__main__':
    o = convert(sys.argv[1], '--anim-only' in sys.argv, os.path.splitext(os.path.basename(sys.argv[1]))[0])
    json.dump(o, open(sys.argv[2], 'w')); print('ok', sys.argv[2], os.path.getsize(sys.argv[2]), 'bytes', 'verts', o.get('mesh', {}).get('n'), 'tris', o.get('mesh', {}).get('tris'), 'frames', o['anim']['frames'])
