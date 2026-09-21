"""Eight C5 extras: constructed jewellery and surface-fitted neck details."""
from pathlib import Path
import bpy,bmesh,math,json,sys,struct,numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/champion-extras-v59';BASE=ROOT/'output/champion-heads-v53/base/champion-rig-only.blend'
# Reuse the accepted toon materials and solid curve construction without running
# the magic build loop. Keep the authoring geometry convention: Z up, -Y front.
namespace={'__file__':str(ROOT/'scripts/build-magic-assets.py')};exec((ROOT/'scripts/build-magic-assets.py').read_text().split('reports=[]')[0],namespace)
sphere,tube,mesh,paint,material,export=[namespace[k] for k in ['sphere','tube','mesh','paint','material','export']]
GOLD=(255,177,20);LIGHT=(255,211,98);BONE=(224,223,216);INK=(36,31,24)
ROWS=json.loads((OUT/'extra-references.json').read_text());args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
(OUT/'models').mkdir(exist_ok=True)
def chainlink(name,c,rx,rz,wire,angle=0):
    return tube(name,[Vector(c)+Vector((math.cos(a)*rx*math.cos(angle),math.cos(a)*rx*math.sin(angle),math.sin(a)*rz)) for a in np.linspace(0,math.tau,81)],[wire,wire],GOLD,False,12)
def crescent(c,r=.006):
    # Explicit paired strips preserve the concave opening when triangulated.
    n=81;cx=.36*r;ir=.86*r;ix=(r*r-ir*ir+cx*cx)/(2*cx);iz=math.sqrt(r*r-ix*ix);alpha=math.atan2(iz,ix);beta=math.atan2(iz,ix-cx)
    outer=[(r*math.cos(a),r*math.sin(a)) for a in np.linspace(alpha,math.tau-alpha,n)];inner=[(cx+ir*math.cos(a),ir*math.sin(a)) for a in np.linspace(beta,math.tau-beta,n)];vs=[]
    for y in [-.001,.001]:vs.extend([Vector(c)+Vector((x,y,z)) for x,z in outer+inner])
    faces=[];N=2*n
    for j in range(n-1):faces.extend([(j,j+1,n+j+1,n+j),(N+j,N+n+j,N+n+j+1,N+j+1),(j,N+j,N+j+1,j+1),(n+j,n+j+1,N+n+j+1,N+n+j)])
    faces.extend([(0,n,N+n,N),(n-1,N+n-1,N+2*n-1,2*n-1)])
    o=mesh('Pointed gold crescent pendant',vs,faces,GOLD);bpy.context.view_layer.objects.active=o
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0000001);bm.to_mesh(o.data);bm.free()
    return o
def moon():
    out=[sphere('Oval gold piercing stud',(0,0,0),(.0034,.0018,.0045),GOLD)]
    for i in range(5):out.append(chainlink('Interlocked crescent chain '+str(i),(0,0,-.007-i*.0041),.00135,.0026,.00042,(i%2)*1.05))
    out.append(chainlink('Crescent pendant bail',(0,0,-.0278),.00135,.0029,.00042,.4));out.append(crescent((.001,0,-.036),.0065));return out
def hoop():
    return [tube('Open gold ear hoop',[(.0058*math.cos(a),0,.0064*math.sin(a)-.003) for a in np.linspace(-math.pi*.96,math.pi*.42,80)],[.0007,.0015,.0016,.0015,.0005],GOLD,False,14)]
def pearl():
    out=hoop()
    for i in range(3):out.append(chainlink('Pearl chain interlocking link '+str(i),(0,0,-.012-i*.007),.0027,.0047,.00075,(i%2)*.95))
    out.append(sphere('Pearl gold crown',(0,0,-.032),(.003,.0025,.002),GOLD));out.append(sphere('Lavender fusion pearl',(0,0,-.037),(.0042,.0038,.0047),(224,201,251),resolution=(64,40)))
    out.append(tube('Pearl ivory reflection',[(-.0016,-.0034,-.034),(-.002,-.0037,-.037),(-.0008,-.0035,-.040)],[.00055,.0006,.00015],(255,242,255)))
    return out
def fangs():
    out=[chainlink('Upper fang gold setting',(0,0,0),.0035,.0045,.001)]
    out.append(tube('Upper sweeping dragon fang',[(.001,-.0006,.002),(.009,0,-.003),(.019,.001,-.013),(.025,0,-.026)],[.0035,.0041,.0024,.00005],BONE,True,20))
    for i in range(5):out.append(chainlink('Fang chain interlocking link '+str(i),(-.001,0,-.008-i*.0043),.0013,.00265,.00045,(i%2)*1.1))
    out.append(tube('Gold lower fang socket',[(-.001,0,-.027),(-.001,0,-.031)],[.004,.004],GOLD,False,24))
    out.append(tube('Hanging curved dragon fang',[(-.001,0,-.031),(0,0,-.043),(.003,-.0002,-.055),(.009,0,-.066)],[.0037,.0034,.0019,.00005],BONE,True,20))
    out.append(tube('Upper fang carved groove',[(.006,-.0035,-.002),(.009,-.0038,-.006),(.012,-.0033,-.008)],[.00015,.0002,.00006],(69,68,64)))
    out.append(tube('Lower fang carved groove',[(.0007,-.0037,-.034),(.0003,-.0035,-.044),(.003,-.002,-.053)],[.00014,.00023,.00006],(69,68,64)))
    return out
def tentacle():
    out=[tube('Long curled tentacle',[(0,0,.002),(.006,0,-.001),(.009,.001,-.010),(.009,0,-.023),(.018,0,-.027),(.028,0,-.018)],[.0048,.0056,.0041,.0032,.002,.00005],(132,132,132),True,20),tube('Short returning tentacle',[(-.006,.002,-.006),(-.005,.001,-.017),(-.011,0,-.024),(-.018,0,-.021),(-.020,0,-.015)],[.0035,.0034,.0023,.0013,.00005],(92,92,92),True,18)]
    out.append(sphere('Rounded tentacle piercing dome',(0,0,.002),(.0048,.0048,.0048),(132,132,132)))
    for i,(x,z,r) in enumerate([(-.004,-.012,.0017),(-.006,-.018,.0016),(-.010,-.022,.0015),(.012,-.026,.0016),(.019,-.025,.0013),(.024,-.022,.0011)]):
        out.append(sphere('Sucker recessed centre',(x,-.0030,z),(r,.0004,r*.8),(48,48,48)))
        o=chainlink('Raised tentacle suction rim',(x,-.0035,z),r,r*.8,.00042)
        for a in list(o.data.color_attributes):o.data.color_attributes.remove(a)
        paint(o,(125,125,125));out.append(o)
    return out
def artwork(hid):
    data=np.load(OUT/'volume-data'/f'{hid}.npz');o=mesh(hid+' contoured solid surface',data['vertices'],data['faces'],GOLD)
    a=o.data.color_attributes['BackColor'];idx=np.empty(len(o.data.loops),np.int32);o.data.loops.foreach_get('vertex_index',idx);rgb=data['rgb'][idx]/255;linear=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4);a.data.foreach_set('color',np.column_stack([linear,np.ones(len(idx))]).ravel())
    bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Smooth bevel contour','SMOOTH');mod.factor=.4;mod.iterations=4;bpy.ops.object.modifier_apply(modifier=mod.name);mod=o.modifiers.new('Runtime detail preservation','DECIMATE');mod.ratio=.45;bpy.ops.object.modifier_apply(modifier=mod.name)
    return [o]
def barycentric(p,a,b,c):
    v0=b-a;v1=c-a;v2=p-a;d00=v0.dot(v0);d01=v0.dot(v1);d11=v1.dot(v1);d20=v2.dot(v0);d21=v2.dot(v1);den=d00*d11-d01*d01
    if abs(den)<1e-18:return (1,0,0)
    v=(d11*d20-d01*d21)/den;w=(d00*d21-d01*d20)/den;return (1-v-w,v,w)
for row in ROWS:
    hid=row['id']
    if args and hid not in args:continue
    bpy.ops.wm.open_mainfile(filepath=str(BASE));rig=bpy.data.objects['C5_Champion_Rig'];rig.data.pose_position='REST'
    skin=bpy.data.objects['Undead_Body_Complete_Sculpt'];ear=bpy.data.objects['Pointed undead ear'];skin.data.calc_loop_triangles();sv=[skin.matrix_world@v.co for v in skin.data.vertices];triangles=[tuple(t.vertices) for t in skin.data.loop_triangles];tree=BVHTree.FromPolygons(sv,triangles,all_triangles=True)
    et=BVHTree.FromPolygons([ear.matrix_world@v.co for v in ear.data.vertices],[tuple(p.vertices) for p in ear.data.polygons]);anchor,normal,_,_=et.find_nearest(Vector((-.094,.012,1.626)));anchor+=Vector((-.0012,-.0005,0))
    original=set(bpy.context.scene.objects);parts=moon() if hid=='crescent_moon_earring' else pearl() if hid=='fusion_pearl_earring' else fangs() if hid=='dragon_fangs_earring' else hoop() if hid=='hoop_earring' else tentacle() if hid=='tentacle_earring' else artwork(hid)
    neck=hid in ['battle_wound','crescent_birthmark'];maxgap=0
    # Jewellery faces forward and outward from the actual skin ear surface.
    right=Vector((.82,-.572,0)) if hid=='golden_feathers' else Vector((.25,-.9682458,0));front=Vector((.572,.82,0)) if hid=='golden_feathers' else Vector((.9682458,.25,0));up=Vector((0,0,1))
    # The feather's main spine follows the outer rim from tip to lower lobe.
    # Retain its width, depth and the individual barbs below the spine.
    if hid=='golden_feathers':
        raw=np.array([tuple(v.co) for o in parts for v in o.data.vertices]);levels=np.linspace(-.026,.045,100)
        spine=np.array([np.median(raw[np.abs(raw[:,2]-z)<.0018,0]) if np.any(np.abs(raw[:,2]-z)<.0018) else 0 for z in levels])
        spine=np.polyval(np.polyfit(levels,spine,5),levels)
        rim=np.array([[1.6212,-.09031,.00940],[1.62946,-.09585,.01513],[1.64332,-.10111,.02111],[1.66352,-.10607,.02809],[1.68523,-.10853,.03255],[1.70515,-.11052,.03763]])
    for o in parts:
        weights=[]
        for v in o.data.vertices:
            p=v.co.copy()
            if neck:
                if hid=='crescent_birthmark':p.x*=4;p.z*=4
                angle=(-.78 if hid=='battle_wound' else -.68)+p.x/(.075 if hid=='battle_wound' else .065);z=p.z+(1.507 if hid=='battle_wound' else 1.512)
                outward=Vector((math.sin(angle),-math.cos(angle),0));hit,n,face,_=tree.ray_cast(Vector((0,.015,z))+outward*.4,-outward,1)
                if hit is None:raise RuntimeError('Neck projection missed '+hid)
                offset=.00023-p.y;v.co=hit+n*offset;maxgap=max(maxgap,abs(offset));ids=triangles[face];bary=barycentric(hit,*[sv[j] for j in ids]);w={}
                for j,t in zip(ids,bary):
                    for g in skin.data.vertices[j].groups:
                        name=skin.vertex_groups[g.group].name;w[name]=w.get(name,0)+max(0,t)*g.weight
                total=sum(w.values());weights.append({k:v/total for k,v in w.items() if v>1e-7})
            else:
                if hid=='golden_feathers':
                    z=1.630+(p.z+.026)*(.075/.072);cx=np.interp(z,rim[:,0],rim[:,1]);cy=np.interp(z,rim[:,0],rim[:,2]);dx=p.x-np.interp(p.z,levels,spine)
                    v.co=Vector((cx-.0017,cy-.0015,z))+right*dx+front*p.y
                else:
                    p.y-=.12*max(0,-p.z);v.co=anchor+right*p.x+front*p.y+up*p.z
                weights.append({'head':1})
        o['trait']='05_Extra';o['extra_id']=hid;o['attachment_bone']='skin_surface' if neck else 'head';o['viewer_side']='left';o['fit_standard']='champion-C5-athletic-1.2';o['revision']=59;o.parent=rig
        for name in {k for w in weights for k in w}:
            group=o.vertex_groups.new(name=name)
            for i,w in enumerate(weights):
                if name in w:group.add([i],w[name],'REPLACE')
        m=o.modifiers.new('C5 fitted extra attachment','ARMATURE');m.object=rig
        bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    # Reflect the fitted geometry, including its surface detail and head weights.
    # Reverse winding so the mirrored solids still render with outward normals.
    if not neck:
        mirrored=[]
        for o in parts:
            twin=o.copy();twin.data=o.data.copy();twin.name=o.name+' viewer-right';bpy.context.collection.objects.link(twin)
            for v in twin.data.vertices:v.co.x=-v.co.x
            bm=bmesh.new();bm.from_mesh(twin.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(twin.data);bm.free()
            twin['viewer_side']='right';mirrored.append(twin)
        parts.extend(mirrored)
    # Store only the accessory and shared rig in the editable native file.
    for o in list(original):
        if o!=rig:bpy.data.objects.remove(o,do_unlink=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'models'/f'{hid}.blend'),check_existing=False)
    for suffix,r in [('-rigged',rig),('',None)]:
        p=OUT/'models'/f'{hid}{suffix}.glb';export(p,parts,r);raw=p.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);doc['asset']['extras'].update(revision=59,extra_id=hid,attachment_bone='skin_surface' if neck else 'head',viewer_side='left' if neck else 'both')
        if hid=='crescent_birthmark':
            for mat in doc['materials']:mat['alphaMode']='BLEND';mat['pbrMetallicRoughness']['baseColorFactor']=[1,1,1,.30]
        js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4);binary=raw[20+n:];p.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+binary)
    report={**row,'parts':len(parts),'vertices':sum(len(o.data.vertices) for o in parts),'attachment':'neck_skin' if neck else 'both_ears','ear_socket_blender_m':list(anchor),'maximum_surface_offset_m':maxgap}
    if not neck:report['ear_sockets_blender_m']=[list(anchor),[-anchor.x,anchor.y,anchor.z]]
    if hid=='crescent_birthmark':report['source_scale']=4
    (OUT/'models'/f'{hid}.json').write_text(json.dumps(report,indent=2));print('BUILT',hid,flush=True)
(OUT/'extra-manifest.json').write_text(json.dumps([json.loads((OUT/'models'/f"{r['id']}.json").read_text()) for r in ROWS if (OUT/'models'/f"{r['id']}.json").exists()],indent=2))
