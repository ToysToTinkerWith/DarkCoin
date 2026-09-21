"""Reference-led skin surfaces on the unchanged C5 sculpt, with rigged tails.

Z up, -Y forward. Body/ear coordinates and original weights are never changed.
Paint ribbons and scale plates are surface sampled, using interpolated skin weights.
"""
from pathlib import Path
import bpy,bmesh,json,math,sys,hashlib,struct
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/champion-skins-v60'
BASE=ROOT/'output/champion-heads-v53/base/champion-rig-only.blend'
sys.path.insert(0,str(ROOT/'output/champion-heads-v57'));from portable_head_io import export
ROWS=json.loads((OUT/'skin-references.json').read_text())
ARGS=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
for folder in ['models','browser']:(OUT/folder).mkdir(exist_ok=True)
PALETTES={
 'dark_skin':(99,75,57),'tribal_dark_skin':(99,75,57),
 'light_skin':(237,207,183),'tribal_light_skin':(237,207,183),
 'fire_dragon':(155,2,2),'elder_dragon':(77,77,77),
 'chameleon':(48,192,128),'snake':(18,143,82)}
REPTILES={'fire_dragon','elder_dragon','chameleon','snake'}
VENTRAL={'fire_dragon':(222,133,117),'elder_dragon':(164,164,163),'chameleon':(245,219,153),'snake':(233,201,102)}
RIDGE={'fire_dragon':(109,6,6),'elder_dragon':(47,47,48),'chameleon':(34,137,97),'snake':(10,88,55)}

def srgb(c):
 a=np.clip(np.asarray(c,dtype=float)/255,0,1)
 return np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4)

def mat(name,ink=False):
 m=bpy.data.materials.get(name)
 if m:return m
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.8
 if ink:
  p.inputs['Base Color'].default_value=(*srgb((38,34,30)),1);p.inputs['Emission Color'].default_value=(*srgb((38,34,30)),1)
 else:
  v=m.node_tree.nodes.new('ShaderNodeVertexColor');v.layer_name='BackColor';m.node_tree.links.new(v.outputs['Color'],p.inputs['Base Color']);m.node_tree.links.new(v.outputs['Color'],p.inputs['Emission Color'])
 p.inputs['Emission Strength'].default_value=1
 return m

def colors(o,values):
 for a in list(o.data.color_attributes):o.data.color_attributes.remove(a)
 a=o.data.color_attributes.new(name='BackColor',type='FLOAT_COLOR',domain='POINT')
 rgb=srgb(values);a.data.foreach_set('color',np.column_stack([rgb,np.ones(len(rgb))]).ravel())
 o.data.color_attributes.active_color_index=0;o.data.color_attributes.render_color_index=0
 o.data.materials.clear();o.data.materials.append(mat('C5 reference skin palette'))

def paint_base(o,hid):
 n=len(o.data.vertices);p=np.empty(n*3);o.data.vertices.foreach_get('co',p);p=p.reshape(-1,3)
 normals=np.empty(n*3);o.data.vertices.foreach_get('normal',normals);normals=normals.reshape(-1,3)
 # Broad illustrated shading preserves the same visible muscle volumes as Undead.
 light=np.array([-.3,-.65,.7]);light/=np.linalg.norm(light)
 shade=.73+.28*np.maximum(0,normals@light)+.035*np.cos(p[:,2]*9)
 rgb=np.tile(PALETTES[hid],(n,1)).astype(float)
 if hid=='chameleon':
  # Large flowing yellow patches continue around the back and down the tail.
  x,y,z=p.T;field=np.sin(x*29+np.sin(z*16)*1.5)+np.cos(z*22+y*29)+.4*np.sin(x*57-y*13+z*31)
  patch=np.clip((field-.63)/.20,0,1)*(z<1.56)
  rgb=rgb*(1-patch[:,None])+np.array((245,198,75))*patch[:,None]
 if hid in REPTILES:
  # The broad forehead stays plain like the art; subtle scale planes on limbs.
  x,y,z=p.T;small=(.5+.5*np.sin(z*135+np.sin(x*85)*.8)*np.cos(y*115+x*65))
  shade*=1-.038*small*(z<1.48)
 colors(o,rgb*shade[:,None])

def bake_chameleon(o):
 # Bake the continuous 3D colour field at texture resolution. Vertex colours
 # alone make the yellow patch edges visibly follow the mesh triangles.
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.004);bpy.ops.object.mode_set(mode='OBJECT')
 m=bpy.data.materials.new('Chameleon continuous artwork atlas');m.use_nodes=True;nodes=m.node_tree.nodes;links=m.node_tree.links;nodes.clear();output=nodes.new('ShaderNodeOutputMaterial');em=nodes.new('ShaderNodeEmission');links.new(em.outputs[0],output.inputs['Surface'])
 coord=nodes.new('ShaderNodeTexCoord');sep=nodes.new('ShaderNodeSeparateXYZ');links.new(coord.outputs['Object'],sep.inputs[0]);x,y,z=[sep.outputs[a] for a in ['X','Y','Z']]
 def mathnode(operation,a,b=None):
  node=nodes.new('ShaderNodeMath');node.operation=operation
  for i,value in enumerate([a,b]):
   if value is None:continue
   if isinstance(value,(int,float)):node.inputs[i].default_value=value
   else:links.new(value,node.inputs[i])
  return node.outputs[0]
 mul=lambda a,b:mathnode('MULTIPLY',a,b);add=lambda a,b:mathnode('ADD',a,b);sine=lambda a:mathnode('SINE',a)
 field=add(add(sine(add(mul(x,29),mul(sine(mul(z,16)),1.5))),mathnode('COSINE',add(mul(z,22),mul(y,29)))),mul(sine(add(add(mul(x,57),mul(y,-13)),mul(z,31))),.4))
 patch=mul(mathnode('GREATER_THAN',field,.72),mathnode('LESS_THAN',z,1.535))
 mix=nodes.new('ShaderNodeMixRGB');links.new(patch,mix.inputs[0]);mix.inputs[1].default_value=(*srgb((48,192,128)),1);mix.inputs[2].default_value=(*srgb((245,198,75)),1)
 geom=nodes.new('ShaderNodeNewGeometry');dotn=nodes.new('ShaderNodeVectorMath');dotn.operation='DOT_PRODUCT';links.new(geom.outputs['Normal'],dotn.inputs[0]);light=Vector((-.3,-.65,.7)).normalized();dotn.inputs[1].default_value=light
 factor=add(.58,mul(mathnode('MAXIMUM',dotn.outputs['Value'],0),.40));shade=nodes.new('ShaderNodeMixRGB');shade.blend_type='MULTIPLY';shade.inputs[0].default_value=1;links.new(mix.outputs[0],shade.inputs[1]);links.new(factor,shade.inputs[2]);links.new(shade.outputs[0],em.inputs['Color'])
 image=bpy.data.images.new('Chameleon skin artwork 4096',width=4096,height=4096,alpha=False);target=nodes.new('ShaderNodeTexImage');target.image=image;nodes.active=target
 o.data.materials.clear();o.data.materials.append(m);scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=1;scene.cycles.device='CPU';scene.render.bake.margin=12
 bpy.ops.object.bake(type='EMIT');image.pack()
 nodes.clear();output=nodes.new('ShaderNodeOutputMaterial');shader=nodes.new('ShaderNodeBsdfPrincipled');tex=nodes.new('ShaderNodeTexImage');tex.image=image;links.new(tex.outputs['Color'],shader.inputs['Base Color']);links.new(tex.outputs['Color'],shader.inputs['Emission Color']);shader.inputs['Emission Strength'].default_value=1;shader.inputs['Roughness'].default_value=.8;links.new(shader.outputs[0],output.inputs['Surface'])
 for attribute in list(o.data.color_attributes):o.data.color_attributes.remove(attribute)

def bind(o,weights,tag='surface_detail'):
 o.parent=rig;o['trait']='01_Undead_Body';o['skin_id']=hid;o['skin_component']=tag;o['fit_standard']='champion-C5-athletic-1.2'
 for name in {k for w in weights for k in w}:
  g=o.vertex_groups.new(name=name)
  for i,w in enumerate(weights):
   if name in w and w[name]>1e-7:g.add([i],w[name],'REPLACE')
 m=o.modifiers.new('Shared C5 deformation','ARMATURE');m.object=rig;parts.append(o)

def bary(p,a,b,c):
 u=b-a;v=c-a;q=p-a;aa=u.dot(u);bb=u.dot(v);cc=v.dot(v);dd=q.dot(u);ee=q.dot(v);den=aa*cc-bb*bb
 if abs(den)<1e-18:return [1,0,0]
 t=(cc*dd-bb*ee)/den;s=(aa*ee-bb*dd)/den;return [1-t-s,t,s]

def project(x,z,back=False):
 hit,n,face,_=tree.ray_cast(Vector((x,2 if back else -2,z)),Vector((0,-1 if back else 1,0)),4)
 if hit is None:return None
 w={};ids=triangles[face]
 for i,t in zip(ids,bary(hit,*[sv[j] for j in ids])):
  for name,weight in source_weights[i].items():w[name]=w.get(name,0)+max(0,t)*weight
 total=sum(w.values());return hit,n,{k:v/total for k,v in w.items() if v>1e-7}

def surface_mesh(name,points,faces,rgb,back=False,relief=.00035):
 vs=[];weights=[]
 for x,z in points:
  result=project(x,z,back)
  if result is None:
   print('SKIP surface',name,'outside skin',round(float(x),4),round(float(z),4),flush=True);return None
  hit,n,w=result;vs.append(hit+n*relief);weights.append(w)
 d=bpy.data.meshes.new(name);d.from_pydata(vs,[],faces);d.update();o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o)
 bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
 for f in d.polygons:f.use_smooth=True
 # Match outward orientation on a thin surface, not a closed volume.
 for f in d.polygons:
  if (f.normal.y>0) != back:f.flip()
 colors(o,np.tile(rgb,(len(vs),1)));bind(o,weights);return o

def smooth_path(coords,steps=90):
 ps=np.array(coords);ext=np.vstack([ps[0],ps,ps[-1]]);out=[]
 for t in np.linspace(0,len(ps)-1,steps):
  i=min(len(ps)-2,int(t));u=t-i;a,b,c,d=ext[i:i+4]
  out.append(.5*(2*b+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u))
 return np.array(out)

def ribbon(name,coords,widths,rgb,back=False,relief=.00035):
 path=smooth_path(coords);ww=np.interp(np.linspace(0,1,len(path)),np.linspace(0,1,len(widths)),widths);vs=[];cols=max(3,int(max(widths)/.001)+1)
 for i,(p,w) in enumerate(zip(path,ww)):
  direction=path[min(i+1,len(path)-1)]-path[max(i-1,0)];side=np.array([-direction[1],direction[0]]);side/=max(1e-9,np.linalg.norm(side))
  vs.extend([p+side*w*t for t in np.linspace(-.5,.5,cols)])
 return surface_mesh(name,vs,[(i*cols+j,i*cols+j+1,(i+1)*cols+j+1,(i+1)*cols+j) for i in range(len(path)-1) for j in range(cols-1)],rgb,back,relief)

def dot(name,x,z,rx,rz,rgb,back=False):
 rings=5;n=32;vs=[(x,z)];fs=[]
 for k in range(1,rings+1):
  vs.extend([(x+rx*k/rings*math.cos(a),z+rz*k/rings*math.sin(a)) for a in np.linspace(0,math.tau,n,endpoint=False)])
 for j in range(n):fs.append((0,1+j,1+(j+1)%n))
 for k in range(rings-1):
  a=1+k*n;b=a+n
  for j in range(n):fs.append((a+j,b+j,b+(j+1)%n,a+(j+1)%n))
 return surface_mesh(name,vs,fs,rgb,back)

def tribal():
 rgb=(17,143,85) if hid=='tribal_dark_skin' else (163,20,34)
 for side in [-1,1]:
  mirror=lambda pts:[(side*x,z) for x,z in pts]
  # Source cheek dots, curved jaw hook, neck stripe and broad shoulder sweep.
  dot('Tribal cheek large dot',side*.061,1.612,.010,.010,rgb);dot('Tribal cheek small dot',side*.032,1.597,.007,.008,rgb)
  ribbon('Tribal hooked jaw accent',mirror([(.012,1.566),(.034,1.576),(.049,1.606)]),[.001,.009,.001],rgb)
  ribbon('Tribal long neck stripe',mirror([(.041,1.551),(.038,1.526),(.045,1.488),(.067,1.449)]),[.004,.008,.006,.0003],rgb)
  ribbon('Tribal chest shoulder sash',mirror([(.186,1.412),(.154,1.390),(.123,1.348),(.125,1.308),(.144,1.259)]),[.027,.031,.022,.018,.001],rgb)
  ribbon('Tribal deltoid swoop',mirror([(.283,1.331),(.253,1.346),(.219,1.339),(.190,1.316)]),[.008,.017,.015,.001],rgb)
  for x,z,r in [(.207,1.366,.007),(.229,1.359,.006),(.257,1.316,.008),(.228,1.305,.006),(.201,1.302,.005)]:dot('Tribal shoulder dots',side*x,z,r,r*.9,rgb)
  # Inferred full-body continuation uses the same broad bands, hooks and dots.
  for back in [False,True]:
   ribbon('Tribal forearm flowing band',mirror([(.315,1.144),(.331,1.120),(.353,1.105),(.375,1.056),(.382,1.019)]),[.002,.016,.021,.013,.001],rgb,back)
   ribbon('Tribal quadriceps spear band',mirror([(.121,.914),(.148,.869),(.161,.784),(.148,.715),(.137,.655)]),[.001,.025,.022,.016,.001],rgb,back)
   ribbon('Tribal calf hook',mirror([(.184,.476),(.173,.418),(.163,.368),(.177,.315)]),[.001,.015,.019,.001],rgb,back)
   for x,z,r in [(.168,.855,.009),(.178,.831,.007),(.181,.808,.005)]:dot('Tribal leg dots',side*x,z,r,r,rgb,back)
  ribbon('Tribal back shoulder sash',mirror([(.075,1.450),(.120,1.392),(.174,1.354),(.118,1.288),(.072,1.208)]),[.002,.022,.028,.022,.001],rgb,True)

def reptile():
 vent=VENTRAL[hid];ridge=RIDGE[hid];base=PALETTES[hid]
 # Thin curved ventral scutes follow the actual throat and abdomen surfaces.
 for low,high,step,width in [(1.435,1.541,.018,.029),(1.165,1.350,.035,.066),(1.035,1.165,.03,.051)]:
  for z in np.arange(low,high,step):
   z2=min(z+step-.0011,high);w=width*(.85+.15*math.sin((z-low)/(high-low)*math.pi))
   vs=[];rows=20;cols=65
   for j in range(rows):
    t=j/(rows-1)
    for k in range(cols):
     u=k/(cols-1)*2-1;vs.append((u*w,(1-t)*z+t*z2+.003*u*u))
   fs=[(j*cols+k,j*cols+k+1,(j+1)*cols+k+1,(j+1)*cols+k) for j in range(rows-1) for k in range(cols-1)]
   surface_mesh('Curved ventral scute',vs,fs,vent,relief=.00050)
   ribbon('Ventral scute lower crease',[(-w,z+.003),(0,z),(w,z+.003)],[.00065,.00065],tuple(c*.65 for c in vent),relief=.00062)
 for side in [-1,1]:
  mirror=lambda pts:[(side*x,z) for x,z in pts]
  # Raised shoulder edging in the reference is slim enough for all armour.
  ribbon('Shoulder outer scale shield',mirror([(.135,1.424),(.199,1.402),(.246,1.368),(.277,1.326)]),[.002,.026,.028,.002],ridge,relief=.00045)
  ribbon('Shoulder shield highlight',mirror([(.151,1.417),(.201,1.397),(.242,1.365),(.268,1.334)]),[.001,.012,.013,.001],tuple(min(255,c*1.45+15) for c in ridge),relief=.0006)
  # Sparse crescent scale relief echoes the isolated scales in the 2D artwork.
  for back in [False,True]:
   for x,z,size in [(.09,1.388,.012),(.147,1.267,.010),(.24,1.241,.012),(.299,1.156,.009),(.359,1.078,.008),(.112,1.015,.009),(.17,.86,.013),(.115,.796,.010),(.187,.47,.009),(.166,.373,.007)]:
    coords=mirror([(x-size*.4,z-size*.65),(x+size*.6,z),(x+size*.55,z+size*.65)])
    ribbon('Crescent scale shadow',coords,[.0004,size*.32,.0002],ridge,back,.0005)
    ribbon('Crescent scale bevel',mirror([(x-size*.4,z-size*.62),(x+size*.35,z),(x+size*.55,z+size*.65)]),[.0003,size*.11,.0001],tuple(min(255,c*1.3+24) for c in base),back,.00068)
  # The dorsal ridge naturally continues down to the tail root.
  ribbon('Dorsal side plated ridge',mirror([(.034,1.540),(.038,1.484),(.089,1.398),(.071,1.275),(.040,1.097),(.034,.994)]),[.004,.010,.020,.018,.014,.003],ridge,True,.0006)

def make_tail():
 # The reference's upright side silhouette is a long uncoiled tapered tail.
 # Exit at the coccyx, clear the armour/back weapon, then rise to viewer-left.
 coords=[(0,.098,.954),(-.018,.207,.914),(-.144,.342,.940),(-.297,.391,1.071),(-.393,.358,1.309),(-.423,.302,1.551),(-.377,.237,1.784),(-.280,.184,1.965)]
 ps=smooth_path(coords,180);n=len(ps);sides=40
 rs=np.interp(np.linspace(0,1,n),[0,.10,.25,.47,.68,.86,1],[.048,.062,.054,.039,.025,.013,.00025])
 bone_points=[Vector(ps[round(t*(n-1))]) for t in np.linspace(0,1,8)]
 bpy.ops.object.mode_set(mode='OBJECT');bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT');parent=rig.data.edit_bones['pelvis'];names=[]
 for i in range(7):
  b=rig.data.edit_bones.new('skin_tail_'+str(i+1).zfill(2));b.head=bone_points[i];b.tail=bone_points[i+1];b.parent=parent;b.use_connect=i>0;parent=b;names.append(b.name)
 bpy.ops.object.mode_set(mode='OBJECT')
 vs=[];rgb=[];weights=[];prev=Vector((0,-1,0));frames=[]
 for i,p in enumerate(ps):
  p=Vector(p);tangent=(Vector(ps[min(n-1,i+1)])-Vector(ps[max(0,i-1)])).normalized();normal=prev-tangent*prev.dot(tangent);normal.normalize();binormal=tangent.cross(normal).normalized();prev=normal;frames.append((normal,binormal))
  t=i/(n-1);blend=max(0,min(6,t*7-.5));lo=int(blend);hi=min(6,lo+1);fraction=blend-lo;w={names[lo]:1-fraction}
  if fraction>0:w[names[hi]]=w.get(names[hi],0)+fraction
  for j in range(sides):
   a=j*math.tau/sides;out=normal*math.cos(a)+binormal*math.sin(a);vs.append(p+out*float(rs[i]));weights.append(w.copy())
   c=np.array(PALETTES[hid],float)
   if hid=='chameleon' and math.sin(t*44+math.sin(a*2)*.7)> .50:c=np.array((245,198,75),float)
   # Dark broad scales line the inner face of the curved tail; no ribbon fins.
   if math.cos(a)>.62:
    c=np.array(RIDGE[hid],float)*(1.25 if hid=='chameleon' else 1)
    if (t*18)%1<.045:c*=.48
   c*=.75+.28*max(0,out.dot(Vector((-.3,-.6,.7))))
   rgb.append(c)
 fs=[(i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j) for i in range(n-1) for j in range(sides)]
 fs.extend([tuple(range(sides-1,-1,-1)),tuple((n-1)*sides+j for j in range(sides))])
 d=bpy.data.meshes.new('Tapered tail continuous sculpt');d.from_pydata(vs,[],fs);d.update();o=bpy.data.objects.new(hid+' curved tail',d);bpy.context.collection.objects.link(o)
 bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
 for f in d.polygons:f.use_smooth=True
 colors(o,rgb);bind(o,weights,'tail');o['tail_bones']=names
 return names

def geometry_hash(o):
 p=np.empty(len(o.data.vertices)*3,np.float32);o.data.vertices.foreach_get('co',p);return hashlib.sha256(p.tobytes()).hexdigest()

for row in ROWS:
 hid=row['id']
 if ARGS and hid not in ARGS:continue
 bpy.ops.wm.open_mainfile(filepath=str(BASE));rig=bpy.data.objects['C5_Champion_Rig'];rig.data.pose_position='REST'
 # Remove only non-body equipment; native body, hands, ears and rig remain intact.
 for o in list(bpy.context.scene.objects):
  if o!=rig and (o.type!='MESH' or o.get('trait')!='01_Undead_Body'):bpy.data.objects.remove(o,do_unlink=True)
 parts=[o for o in bpy.context.scene.objects if o.type=='MESH'];skin=bpy.data.objects['Undead_Body_Complete_Sculpt'];base_hash=geometry_hash(skin)
 skin.data.calc_loop_triangles();sv=[v.co.copy() for v in skin.data.vertices];triangles=[tuple(t.vertices) for t in skin.data.loop_triangles];tree=BVHTree.FromPolygons(sv,triangles,all_triangles=True)
 source_weights=[{skin.vertex_groups[g.group].name:g.weight for g in v.groups} for v in skin.data.vertices]
 tail_bones=[]
 if hid!='undead':
  for o in list(parts):
   if 'wound' in o.name.lower() or 'burgundy chest tear' in o.name.lower():parts.remove(o);bpy.data.objects.remove(o,do_unlink=True);continue
   if o.get('palette')=='skin':paint_base(o,hid)
  if hid=='chameleon':bake_chameleon(skin)
  if hid.startswith('tribal_'):tribal()
  if hid in REPTILES:reptile();tail_bones=make_tail()
 for o in parts:o['skin_id']=hid;o['revision']=60
 assert geometry_hash(skin)==base_hash,'Body fit changed'
 rig.data.pose_position='POSE'
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'models'/f'{hid}.blend'),check_existing=False)
 p=OUT/'models'/f'{hid}-rigged.glb';export(p,parts,rig)
 raw=p.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);doc['asset']['extras'].update(revision=60,skin_id=hid,attachment_bone='shared_body',body_geometry_sha256=base_hash,tail_bones=tail_bones)
 js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4);binary=raw[20+n:];p.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+binary)
 report={**row,'parts':len(parts),'vertices':sum(len(o.data.vertices) for o in parts),'body_geometry_sha256':base_hash,'body_vertex_count':len(skin.data.vertices),'tail_bones':tail_bones,'tail':bool(tail_bones),'fit_standard':'champion-C5-athletic-1.2','surface_relief_max_m':.00068}
 (OUT/'models'/f'{hid}.json').write_text(json.dumps(report,indent=2));print('BUILT',hid,'tail bones',len(tail_bones),flush=True)
(OUT/'skin-manifest.json').write_text(json.dumps([json.loads((OUT/'models'/f"{r['id']}.json").read_text()) for r in ROWS if (OUT/'models'/f"{r['id']}.json").exists()],indent=2))
