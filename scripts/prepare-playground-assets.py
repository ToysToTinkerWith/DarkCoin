"""Extract shared C5 components without baking or changing their accepted geometry."""
from pathlib import Path
import json,struct,copy,shutil
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'output/champion-heads-v53'
OUT=ROOT/'public/arena/playground/assets'
OUT.mkdir(parents=True,exist_ok=True)

def extract(source,dest,trait,animations=False):
    raw=source.read_bytes();size=struct.unpack_from('<I',raw,12)[0]
    g=json.loads(raw[20:20+size]);binary=raw[28+size:]
    for n in g['nodes']:
        if 'mesh' in n and n.get('extras',{}).get('trait')!=trait:
            n.pop('mesh');n.pop('skin',None)
    g['animations']=[a for a in g.get('animations',[]) if animations and (a['name'].startswith(('Walk','Run')) or a['name']=='Idle')]
    meshes=sorted({n['mesh'] for n in g['nodes'] if 'mesh' in n});mm={v:i for i,v in enumerate(meshes)}
    g['meshes']=[g['meshes'][i] for i in meshes]
    for n in g['nodes']:
        if 'mesh' in n:n['mesh']=mm[n['mesh']]
    acc=set();mats=set()
    for m in g['meshes']:
        for p in m['primitives']:
            acc.update(p['attributes'].values())
            if 'indices' in p:acc.add(p['indices'])
            if 'material' in p:mats.add(p['material'])
    for s in g.get('skins',[]):
        if 'inverseBindMatrices' in s:acc.add(s['inverseBindMatrices'])
    for a in g['animations']:
        for s in a['samplers']:acc.update([s['input'],s['output']])
    amap={v:i for i,v in enumerate(sorted(acc))};matmap={v:i for i,v in enumerate(sorted(mats))}
    for m in g['meshes']:
        for p in m['primitives']:
            p['attributes']={k:amap[v] for k,v in p['attributes'].items()}
            if 'indices' in p:p['indices']=amap[p['indices']]
            if 'material' in p:p['material']=matmap[p['material']]
    for s in g.get('skins',[]):
        if 'inverseBindMatrices' in s:s['inverseBindMatrices']=amap[s['inverseBindMatrices']]
    for a in g['animations']:
        for s in a['samplers']:s.update(input=amap[s['input']],output=amap[s['output']])
    g['accessors']=[g['accessors'][i] for i in sorted(acc)]
    g['materials']=[g['materials'][i] for i in sorted(mats)]
    texture_refs=[]
    def walk(obj):
        if isinstance(obj,dict):
            for k,v in obj.items():
                if k.endswith('Texture') and isinstance(v,dict) and 'index' in v:texture_refs.append(v)
                else:walk(v)
        elif isinstance(obj,list):
            for v in obj:walk(v)
    walk(g['materials']);tex=sorted({v['index'] for v in texture_refs});tm={v:i for i,v in enumerate(tex)}
    for v in texture_refs:v['index']=tm[v['index']]
    g['textures']=[g.get('textures',[])[i] for i in tex]
    imgs=sorted({t['source'] for t in g['textures']});im={v:i for i,v in enumerate(imgs)}
    for t in g['textures']:t['source']=im[t['source']]
    g['images']=[g.get('images',[])[i] for i in imgs]
    refs=[a for a in g['accessors'] if 'bufferView' in a]+[i for i in g['images'] if 'bufferView' in i]
    views=sorted({a['bufferView'] for a in refs});vm={v:i for i,v in enumerate(views)};buf=bytearray();new=[]
    for i in views:
        v=copy.deepcopy(g['bufferViews'][i]);start=v.get('byteOffset',0);buf.extend(b'\0'*((-len(buf))%4));v['byteOffset']=len(buf);v['buffer']=0
        buf.extend(binary[start:start+v['byteLength']]);new.append(v)
    for a in refs:a['bufferView']=vm[a['bufferView']]
    g['bufferViews']=new;g['buffers']=[{'byteLength':len(buf)}]
    for k in ['animations','textures','images','materials']:
        if not g[k]:g.pop(k)
    js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4);buf.extend(b'\0'*((-len(buf))%4))
    dest.write_bytes(struct.pack('<III',0x46546c67,2,28+len(js)+len(buf))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(buf),0x004e4942)+buf)

base=SRC/'champion-dragon_longsword.glb'
extract(base,OUT/'body.glb','01_Undead_Body',True)
extract(base,OUT/'leather_garb.glb','03_Leather_Armour')
catalog={'heads':{},'armour':{},'weapons':{}}
for category,folder,fileglob in [('heads',ROOT/'output/champion-heads-v57/heads','*-rigged.glb'),('armour',ROOT/'output/champion-armour-v54/armour','*-rigged.glb')]:
    (OUT/category).mkdir(exist_ok=True)
    for p in folder.glob(fileglob):extract(p,OUT/category/p.name,'02_Bone_Head' if category=='heads' else '03_Leather_Armour')
for category,file in [('heads',ROOT/'output/champion-heads-v57/head-references.json'),('armour',ROOT/'output/champion-armour-v54/armour-references.json')]:
    for r in json.loads(file.read_text(encoding='utf-8')):catalog[category][r['id']]=r['name']
(OUT/'weapons').mkdir(exist_ok=True)
for p in SRC.glob('champion-*.glb'):
    wid=p.stem.removeprefix('champion-');extract(p,OUT/'weapons'/f'{wid}.glb','05_Back_Weapon')
    motion=SRC/f'{wid}-motion-data.json'
    if motion.exists():
        d=json.loads(motion.read_text());catalog['weapons'][wid]=d['label']
        for c in d['canonical'].values():
            frames=c['frames'];c['frames']=frames[::4]+([frames[-1]] if (len(frames)-1)%4 else [])
        d.pop('source_hashes',None)
        (OUT/'weapons'/f'{wid}.json').write_text(json.dumps(d,separators=(',',':')))
    else:catalog['weapons'][wid]='Scythe'
g=json.loads((SRC/'combat-layer-data.json').read_text())
for collection in [g['gaits'],g['canonical']]:
    for c in collection.values():
        f=c['frames'];c['frames']=f[::4]+([f[-1]] if (len(f)-1)%4 else [])
(OUT/'combat.json').write_text(json.dumps(g,separators=(',',':')))
speeds={n:{'nominal_speed_m_s':v.get('nominal_speed_m_s',v.get('diagnostics',[{}])[0].get('moving_frame_speed_m_s',1.31))} for n,v in g['gaits'].items()}
for v in g['gaits'].values():v.pop('diagnostics',None)
(OUT/'combat.json').write_text(json.dumps(g,separators=(',',':')))
(OUT/'locomotion.json').write_text(json.dumps(speeds,indent=2))
(ROOT/'lib/playground-catalog.json').write_text(json.dumps(catalog,indent=2))
print('Prepared component assets:',round(sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())/1e6,1),'MB')
