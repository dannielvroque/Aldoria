import struct, zlib, sys
def parse(path):
    d=open(path,'rb').read()
    assert d[:20]==b'Kaydara FBX Binary  ', d[:25]
    ver=struct.unpack('<I',d[23:27])[0]; big = ver>=7500
    pos=27
    def node(pos):
        if big: end,np_,pl,nl=struct.unpack('<QQQB',d[pos:pos+25]); pos+=25
        else: end,np_,pl,nl=struct.unpack('<IIIB',d[pos:pos+13]); pos+=13
        if end==0: return None,pos
        name=d[pos:pos+nl].decode('latin1'); pos+=nl
        props=[]
        for _ in range(np_):
            t=chr(d[pos]); pos+=1
            if t in 'YCFDIL':
                f={'Y':'<h','C':'<?','F':'<f','D':'<d','I':'<i','L':'<q'}[t]; sz=struct.calcsize(f); props.append(struct.unpack(f,d[pos:pos+sz])[0]); pos+=sz
            elif t in 'fdilb':
                n,enc,cl=struct.unpack('<III',d[pos:pos+12]); pos+=12; raw=d[pos:pos+cl]; pos+=cl
                if enc: raw=zlib.decompress(raw)
                f={'f':'f','d':'d','i':'i','l':'q','b':'?'}[t]; props.append(list(struct.unpack('<%d%s'%(n,f),raw)) if n<50 else (f,n,raw))
            elif t in 'SR':
                n=struct.unpack('<I',d[pos:pos+4])[0]; pos+=4; raw=d[pos:pos+n]; pos+=n; props.append(raw.decode('latin1') if t=='S' else raw)
        kids=[]
        while pos<end:
            k,pos=node(pos)
            if k is None: break
            kids.append(k)
        return (name,props,kids),end
    nodes=[]
    while pos<len(d)-30:
        n,pos=node(pos)
        if n is None: break
        nodes.append(n)
    return ver,nodes
if __name__=='__main__':
    ver,nodes=parse(sys.argv[1]); print('ver',ver)
    for n in nodes:
        if n[0]=='Objects':
            from collections import Counter
            c=Counter(); 
            for k in n[2]: c[k[0]]+=1
            print(c)
            for k in n[2]:
                if k[0] in('Geometry','Model','Deformer','Material','Texture','Video'): print(k[0],[p for p in k[1][:3] if not isinstance(p,tuple)])
        if n[0]=='Definitions': print('defs',[(k[0],k[1][:1]) for k in n[2]][:12])
