"""Seven solid, reference-led magic traits on the shared C5 shoulder sockets."""
from pathlib import Path
import bpy,bmesh,math,json,random,sys,struct
import numpy as np
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/champion-magic-v58';OLD=ROOT/'output/champion-heads-v53'
sys.path.insert(0,str(ROOT/'output/champion-heads-v57'));from portable_head_io import export
for folder in ['models','renders']:(OUT/folder).mkdir(exist_ok=True)
ROWS=json.loads((OUT/'magic-references.json').read_text());args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []

def material(name):
    m=bpy.data.materials.get(name)
    if m:return m
    m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Roughness'].default_value=.6
    v=n.new('ShaderNodeVertexColor');v.layer_name='BackColor';m.node_tree.links.new(v.outputs['Color'],p.inputs['Base Color']);m.node_tree.links.new(v.outputs['Color'],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=1
    return m
def paint(o,rgb,kind=None):
    o.data.update();a=o.data.color_attributes.new(name='BackColor',type='FLOAT_COLOR',domain='CORNER');vals=[]
    for loop in o.data.loops:
        v=o.data.vertices[loop.vertex_index];n=v.normal;p=v.co
        f=.83+.20*max(0,n.dot(Vector((-.35,-.62,.70))))
        col=np.array(rgb,dtype=float)*f
        if kind=='ice':col=np.array([(80,197,208),(143,242,252),(204,255,255),(109,218,230)][loop.polygon_index%4] if hasattr(loop,'polygon_index') else rgb)*f
        if kind=='water':
            t=.5+.5*math.sin(p.z*71+p.x*39+math.cos(p.y*53));col=np.array((16,157,166))*(1-t*.4)+np.array((70,217,222))*t*.4;col*=f
        if kind=='blood':col=np.array(rgb)*(f*(.75+.2*math.sin(p.x*61+p.z*95+p.y*130)))
        if kind=='dark' and n.x>.28 and n.x<.83:col=np.array((77,77,74))*f
        s=np.clip(col/255,0,1);s=np.where(s<=.04045,s/12.92,((s+.055)/1.055)**2.4);vals.extend([*s,1])
    a.data.foreach_set('color',vals);o.data.color_attributes.active_color_index=0;o.data.color_attributes.render_color_index=0
    o.data.materials.clear();o.data.materials.append(material('Magic toon surface'))
    return o
def mesh(name,vs,fs,rgb,smooth=True,kind=None):
    d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.update();o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o)
    for f in d.polygons:f.use_smooth=smooth
    paint(o,rgb,kind);return o
def sphere(name,center,scale,rgb,kind=None,distort=0,resolution=(40,24)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=resolution[0],ring_count=resolution[1]);o=bpy.context.object;o.name=name
    for v in o.data.vertices:
        x,y,z=v.co;f=1+distort*(math.sin(x*6+z*5)*math.cos(y*7)+.35*math.sin(z*13+y*4));v.co=Vector(center)+Vector((x*scale[0],y*scale[1],z*scale[2]))*f
    for p in o.data.polygons:p.use_smooth=True
    return paint(o,rgb,kind)
def tube(name,points,radii,rgb,smooth=True,sides=12,kind=None):
    ps=[Vector(p) for p in points]
    if smooth:
        ext=[ps[0]]+ps+[ps[-1]];samples=[]
        for t in np.linspace(0,len(ps)-1,64):
            k=min(len(ps)-2,int(t));u=t-k;a,b,c,d=ext[k:k+4];samples.append(.5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u))
        ps=samples
    rs=np.interp(np.linspace(0,1,len(ps)),np.linspace(0,1,len(radii)),radii);vs=[];prev=Vector((0,-1,0))
    for i,p in enumerate(ps):
        tangent=(ps[min(i+1,len(ps)-1)]-ps[max(i-1,0)]).normalized();n=prev-tangent*prev.dot(tangent)
        if n.length<.01:n=tangent.cross(Vector((0,0,1)))
        n.normalize();b=tangent.cross(n).normalized();prev=n
        for j in range(sides):vs.append(p+float(rs[i])*(n*math.cos(j*math.tau/sides)+b*math.sin(j*math.tau/sides)))
    fs=[(i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j) for i in range(len(ps)-1) for j in range(sides)];fs.extend([tuple(range(sides-1,-1,-1)),tuple((len(ps)-1)*sides+j for j in range(sides))]);return mesh(name,vs,fs,rgb,smooth,kind)
def path(center,coords):return [Vector(center)+Vector(p) for p in coords]

def volume(hid,c,side):
    data=np.load(OUT/'volume-data'/f'{hid}-{side}.npz')
    d=bpy.data.meshes.new(hid+' sculpted volume');d.from_pydata(data['vertices']+np.array(c),[],data['faces']);d.update()
    o=bpy.data.objects.new(hid+' continuous round volume',d);bpy.context.scene.collection.objects.link(o)
    bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free();d.update()
    for face in d.polygons:face.use_smooth=True
    a=d.color_attributes.new(name='BackColor',type='FLOAT_COLOR',domain='CORNER')
    indices=np.empty(len(d.loops),dtype=np.int32);d.loops.foreach_get('vertex_index',indices)
    rgb=np.clip(data['rgb'][indices]/255,0,1)
    linear=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
    a.data.foreach_set('color',np.column_stack((linear,np.ones(len(indices)))).ravel())
    d.color_attributes.active_color_index=0;d.color_attributes.render_color_index=0;d.materials.append(material('Magic toon surface'))
    bpy.context.view_layer.objects.active=o;o.select_set(True)
    soften=o.modifiers.new('Fluid surface continuity','SMOOTH');soften.factor=.55;soften.iterations=12;bpy.ops.object.modifier_apply(modifier=soften.name)
    dec=o.modifiers.new('Preserve contour and colour at runtime','DECIMATE');dec.ratio=.40;bpy.ops.object.modifier_apply(modifier=dec.name)
    o.data.update();a=o.data.color_attributes['BackColor'];indices=np.empty(len(o.data.loops),np.int32);o.data.loops.foreach_get('vertex_index',indices)
    normals=np.empty(len(o.data.vertices)*3,np.float32);o.data.vertices.foreach_get('normal',normals)
    values=np.empty(len(a.data)*4,np.float32);a.data.foreach_get('color',values);values=values.reshape(-1,4)
    values[:,:3]*=(.84+.16*np.abs(normals.reshape(-1,3)[indices,1]))[:,None];a.data.foreach_set('color',values.ravel())
    o.select_set(False)
    return [o]
def ring(name,c,r,rgb,tilt=0,zscale=1,depth=.012):
    ps=[Vector(c)+Vector((r*math.cos(t),depth*math.sin(t*2+tilt),r*zscale*math.sin(t))) for t in np.linspace(0,math.tau,100)]
    return tube(name,ps,[.0018]*2,rgb,False,8)

def fire(c,seed):
    rng=random.Random(seed);out=[sphere('Rolling orange flame heart',Vector(c)+Vector((0,0,-.025)),(.067,.059,.074),(255,91,0),distort=.075)]
    for k in range(8):
        a=k*math.tau/8;r=.045;h=.09+rng.random()*.07
        pts=path(c,[(r*math.cos(a),r*.7*math.sin(a),-.028),(r*1.10*math.cos(a),r*.9*math.sin(a),.025),(r*.70*math.cos(a)+.009,r*.7*math.sin(a),h*.65),(r*.8*math.cos(a)-.011,r*.6*math.sin(a),h)])
        out.append(tube('Curled outer flame tongue',pts,[.023,.025,.012,.0003],(255,104+15*(k%2),0)))
    out.append(tube('Tall central licking flame',path(c,[(0,0,.01),(-.018,.007,.078),(.012,.003,.132),(-.004,.005,.182)]),[.038,.025,.012,.0002],(255,116,0)))
    for side in [-1,1]:
        for k in range(3):
            x=(k-1)*.031;out.append(tube('Golden inner fire ribbon',path(c,[(x,side*.043,-.067),(x-.014,side*.057,-.027),(x+.007,side*.056,.017),(x-.005,side*.035,.085-k*.008)]),[.012,.020,.013,.0002],(255,193,0)))
    out.append(tube('Detached ember',path(c,[(.016,0,.20),(.023,0,.214),(.018,0,.228)]),[.003,.005,.0001],(255,125,0)))
    return out
def water(c,seed):
    rng=random.Random(seed);out=[sphere('Turquoise liquid globe',c,(.079,.074,.080),(44,190,198),'water',.045)]
    for side in [-1,1]:
        for k in range(3):
            a0=k*2.1;pts=[]
            for t in np.linspace(0,1,32):
                a=a0+t*3.4;r=.062*(1-t*.66);x=r*math.cos(a);z=r*math.sin(a);y=side*math.sqrt(max(.001,.079**2-x*x-z*z));pts.append(Vector(c)+Vector((x,y,z)))
            out.append(tube('Raised curling water eddy',pts,[.008,.006,.002],(116,241,240),False,10))
    for k in range(5):
        a=rng.random()*math.tau;p=Vector(c)+Vector((math.cos(a)*.100,(rng.random()-.5)*.07,math.sin(a)*.098));out.append(sphere('Floating water droplet',p,(.009,.007,.013),(112,238,238),distort=.1))
    return out
def lightning(c,seed):
    rng=random.Random(seed);out=[sphere('Luminous white lightning core',c,(.049,.049,.049),(243,255,255)),ring('Pale cyan core rim',c,.055,(176,235,252),depth=.006)]
    for k in range(3):
        pts=[]
        for j in range(12):
            a=k*2.1+j*.19;r=.086+(j%3==1)*.021+rng.uniform(-.01,.006);pts.append(Vector(c)+Vector((r*math.cos(a),.029*math.sin(a*1.7+k),r*math.sin(a))))
        out.append(tube('Angular forked lightning arc',pts,[.001,.0025,.0035,.001],(225,255,255),False,5))
        p=pts[4];out.append(tube('Lightning branch',[p,p+Vector((.018,-.006,.022)),p+Vector((.005,-.011,.038)),p+Vector((.03,-.012,.048))],[.0022,.0015,.0007,.0001],(231,255,255),False,5))
    return out
def dark(c):
    out=[sphere('Dark central sphere',c,(.062,.057,.063),(22,22,24),'dark',resolution=(128,80))]
    for r in [.090,.130,.165]:out.append(ring('White arcane orbit',c,r,(242,253,254),zscale=1.15,depth=.020))
    for x in [-1,1]:
        for z in [-1,1]:out.append(sphere('Black satellite',Vector(c)+Vector((x*.118,-.004,z*.118)),(.020,.020,.021),(22,22,24),'dark',resolution=(64,40)))
    for s in [-1,1]:out.append(tube('Crossing arcane filament',path(c,[(-.118,-.001,s*.118),(0,-.045,0),(.118,-.001,-s*.118)]),[.0011,.0015,.0011],(241,255,255)))
    rng=random.Random(6)
    for k in range(9):
        a=k*math.tau/9;r=.179;v=Vector((math.cos(a)*r,0,math.sin(a)*r*1.15));out.append(tube('Small orbit spark',path(Vector(c)+v,[(0,0,0),(.004,-.002,.009),(-.002,.001,.011),(.005,0,.021)]),[.0003,.001,.0001],(229,250,253),False,5))
    return out
def ice(c):
    out=[];direction=Vector((.80,-.60,-.035)).normalized();across=Vector((.6,.8,0));up=direction.cross(across).normalized()
    for k in range(4):
        p=Vector(c)+Vector(([.00,.022,-.035,.012][k],0,.13-k*.081));vs=[];rng=random.Random(80+k);rings=[(-.12,.028),(-.085,.035),(-.035,.024),(.032,.019),(.11,.012),(.205,.0001)]
        for j,(d,r) in enumerate(rings):
            for i in range(5):
                a=i*math.tau/5;rr=r*(.82+rng.random()*.32);vs.append(p+direction*d+across*math.cos(a)*rr+up*math.sin(a)*rr)
        fs=[tuple(range(4,-1,-1))]
        for j in range(5):
            for i in range(5):a=j*5+i;b=j*5+(i+1)%5;cc=(j+1)*5+(i+1)%5;d=(j+1)*5+i;fs.extend([(a,b,cc),(a,cc,d)])
        fs.append(tuple(range(25,30)));o=mesh('Jagged ice dagger '+str(k+1),vs,fs,(151,240,249),False);attr=o.data.color_attributes['BackColor']
        colors=[(148,239,248),(206,254,255),(79,161,173),(113,218,231)]
        for f in o.data.polygons:
            rgb=np.array(colors[(f.index*7+k)%4])/255;s=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
            for l in f.loop_indices:attr.data[l].color=(*s,1)
        out.append(o)
    return out
def blood(c):
    out=[]
    for k in range(4):
        p=Vector(c)+Vector(([.00,.016,-.035,.018][k],0,.12-k*.080));pts=path(p,[(-.12,.022,0),(-.055,.012,.004),(.025,-.014,-.003),(.09,-.05,0),(.19,-.11,-.01)])
        out.append(tube('Flowing pointed blood shard '+str(k+1),pts,[.025,.032,.023,.012,.00015],(105,27,12),True,15,'blood'))
        for j in range(3):
            off=-.11+j*.035;out.append(tube('Ragged blood fringe',path(p,[(off,.018,.006),(off+.002,-.008,.031),(off+.032,-.018,.024),(off+.048,-.027,.006)]),[.012,.015,.009,.0001],(114,31,16),True,10,'blood'))
        out.append(tube('Rust red surface current',path(p,[(-.103,-.003,.020),(-.063,-.012,.024),(-.025,-.024,.017),(.032,-.031,.014),(.115,-.074,.002)]),[.003,.006,.003,.0002],(153,57,34)))
        out.append(tube('Detached blood filament',path(p,[(-.056,.008,-.029),(-.051,.002,-.045),(-.031,-.013,-.050),(-.025,-.015,-.063)]),[.005,.005,.003,.0001],(106,28,13)))
    return out
def poison(c,side):
    out=[]
    for k in range(3):
        pts=path(c,[(side*.105,.013,(k-1)*.031),(side*.065,-.006,(k-1)*.045),(side*.015,-.010,(k-1)*.024),(-side*.035,-.015,(k-1)*.046),(-side*.100,-.019,(k-1)*.028),(-side*.175,-.006,(k-1)*.057)])
        out.append(tube('Billowing green vapour curl',pts,[.042,.050,.036,.039,.021,.0002],[(95,213,106),(125,239,133),(143,252,151)][k],True,18))
    for k in range(6):
        x=side*(.09-k*.021);z=.050+math.sin(k*1.8)*.024;out.append(tube('Separate wispy poison crest',path(c,[(x,.005,z-.012),(x-side*.005,-.009,z+.035),(x-side*.032,-.014,z+.028),(x-side*.053,-.014,z+.057)]),[.023,.023,.014,.0001],(145,251,151),True,12))
    # Real openings between loops retain the curling, broken vapour silhouette.
    out.append(tube('Low rolling cloud tail',path(c,[(side*.08,.012,-.067),(side*.016,-.014,-.093),(-side*.028,-.021,-.079),(-side*.07,-.018,-.10),(-side*.13,-.006,-.075)]),[.029,.025,.024,.010,.0002],(93,211,106)))
    return out

reports=[]
for row in ROWS:
    hid=row['id']
    if args and hid not in args:continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    with bpy.data.libraries.load(str(OLD/'base/champion-rig-only.blend'),link=False) as (src,dst):dst.objects=['C5_Champion_Rig']
    rig=dst.objects[0];bpy.context.scene.collection.objects.link(rig);rig.data.pose_position='REST';parts=[];sockets=[]
    sides=[1] if hid in ['dark_magic','ice_daggers','blood_shards'] else [-1,1]
    for side in sides:
        bone=rig.data.bones['upper_arm.R' if side==1 else 'upper_arm.L'];shoulder=Vector(bone.head_local);c=shoulder+Vector((side*.09,-.28,.28));sockets.append({'side':side,'shoulder_blender_m':list(shoulder),'center_blender_m':list(c),'above_m':.28,'forward_m':.28})
        parts+=volume(hid,c,side) if hid in ['fire_magic','water_magic','poison_cloud','blood_shards'] else dark(c) if hid=='dark_magic' else lightning(c,42+side) if hid=='lightning_magic' else ice(c)
    for o in parts:
        o['trait']='04_Magic';o['magic_id']=hid;o['attachment_bone']='chest';o['fit_standard']='champion-C5-athletic-1.2';o['revision']=58;o.parent=rig
        o.vertex_groups.new(name='chest').add(list(range(len(o.data.vertices))),1,'REPLACE');m=o.modifiers.new('C5 chest attachment','ARMATURE');m.object=rig
    bpy.context.scene['magic_id']=hid;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'models'/f'{hid}.blend'),check_existing=False)
    for suffix,r in [('-rigged',rig),('',None)]:
        p=OUT/'models'/f'{hid}{suffix}.glb';export(p,parts,r)
        raw=p.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);doc['asset']['extras'].update(attachment_bone='chest',revision=58,magic_id=hid,shoulder_offset_m={'up':.28,'forward':.28});js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4);binary=raw[20+n:];p.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+binary)
    vs=[v.co for o in parts for v in o.data.vertices];report={**row,'parts':len(parts),'vertices':len(vs),'sockets':sockets,'bounds_blender_m':[[min(v[i] for v in vs),max(v[i] for v in vs)] for i in range(3)],'attachment_bone':'chest'};(OUT/'models'/f'{hid}.json').write_text(json.dumps(report,indent=2));reports.append(report);print('BUILT',hid,len(parts),len(vs),flush=True)
(OUT/'magic-manifest.json').write_text(json.dumps([json.loads((OUT/'models'/f"{r['id']}.json").read_text()) for r in ROWS if (OUT/'models'/f"{r['id']}.json").exists()],indent=2))
