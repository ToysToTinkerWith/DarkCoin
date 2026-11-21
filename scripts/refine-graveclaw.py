"""Fuse anatomical construction volumes and retain rig weights/animation in Blender.
Run after node scripts/build-graveclaw.cjs with Blender --background --python.
"""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/graveclaw';ASSET=ROOT/'public/arena/playground/assets/beasts/graveclaw.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
# All authored clip durations are exact hundredths; avoid Blender's default
# 24 fps truncating the claw timings during the round trip.
bpy.context.scene.render.fps=100
bpy.ops.import_scene.gltf(filepath=str(ASSET))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
# Imported actions are intact; work on the bind pose only.
rig.data.pose_position='REST'
flesh=[o for o in bpy.data.objects if o.type=='MESH' and ('hide' in o.name.lower() or 'muscle' in o.name.lower())]
bpy.ops.object.select_all(action='DESELECT')
for o in flesh:o.select_set(True)
bpy.context.view_layer.objects.active=flesh[0];bpy.ops.object.join();source=bpy.context.object;source.name='Graveclaw anatomical weight source'
target=source.copy();target.data=source.data.copy();bpy.context.collection.objects.link(target);target.name='Graveclaw continuous sculpt'
bpy.ops.object.select_all(action='DESELECT');target.select_set(True);bpy.context.view_layer.objects.active=target
for m in list(target.modifiers):target.modifiers.remove(m)
remesh=target.modifiers.new('Unified muscular hide','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.013;remesh.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=remesh.name)
smooth=target.modifiers.new('Sculpt blend','SMOOTH');smooth.factor=.9;smooth.iterations=4;bpy.ops.object.modifier_apply(modifier=smooth.name)
decimate=target.modifiers.new('Realtime sculpt topology','DECIMATE');decimate.ratio=.30;bpy.ops.object.modifier_apply(modifier=decimate.name)
# Remeshing removes weights. Transfer interpolated weights from the original
# anatomical pieces; preserve distinct joints and smooth the seam influences.
for group in source.vertex_groups:
 if not target.vertex_groups.get(group.name):target.vertex_groups.new(name=group.name)
transfer=target.modifiers.new('Recover anatomical weights','DATA_TRANSFER');transfer.object=source;transfer.use_vert_data=True;transfer.data_types_verts={'VGROUP_WEIGHTS'};transfer.vert_mapping='POLYINTERP_NEAREST';transfer.layers_vgroup_select_src='ALL';transfer.layers_vgroup_select_dst='NAME';bpy.ops.object.modifier_apply(modifier=transfer.name)
bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
bpy.ops.object.vertex_group_smooth(group_select_mode='ALL',factor=.6,repeat=4)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
bpy.ops.object.mode_set(mode='OBJECT')
# Distribute joint deformation across a compact anatomical transition. Nearest
# surface transfer alone gives the fused deltoids/groin an almost rigid seam.
from mathutils import Vector
def blend_support(vertex, name, influence):
 if influence<=0:return
 weights={target.vertex_groups[g.group].name:g.weight for g in vertex.groups if g.weight>0}
 for group in list(vertex.groups):target.vertex_groups[group.group].remove([vertex.index])
 weights={key:value*(1-influence) for key,value in weights.items()}
 weights[name]=weights.get(name,0)+influence
 total=sum(weights.values())
 for key,value in weights.items():
  group=target.vertex_groups.get(key) or target.vertex_groups.new(name=key)
  group.add([vertex.index],value/total,'REPLACE')
for vertex in target.data.vertices:
 weights={target.vertex_groups[g.group].name:g.weight for g in vertex.groups}
 world=target.matrix_world@vertex.co
 for tag in ['L','R']:
  for support,allowed,radius,amount in [('shoulder',['chest','upper'],.33,.72),('hipSocket',['hips','thigh'],.26,.65)]:
   names=[n if n in ['chest','hips'] else n+tag for n in allowed]
   if sum(weights.get(n,0) for n in names)<.85:continue
   center=rig.matrix_world@rig.data.bones[support+tag].head_local
   distance=(world-center).length
   x=max(0,min(1,(distance-.06)/(radius-.06)))
   blend_support(vertex,support+tag,amount*(1-x*x*(3-2*x)))
 # A spine influence prevents the abdomen stretching between two rigid masses.
 if weights.get('chest',0)+weights.get('hips',0)>.9:
  center=rig.matrix_world@rig.data.bones['spine'].head_local
  height=abs(world.z-center.z)
  blend_support(vertex,'spine',.65*max(0,1-height/.27))
# Smooth the final support weights as well as the transferred source weights.
# This is a weight-only operation: it does not soften the sculpted geometry.
bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
bpy.ops.object.vertex_group_smooth(group_select_mode='ALL',factor=.85,repeat=30)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL',limit=4)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
bpy.ops.object.mode_set(mode='OBJECT')
armature=target.modifiers.new('Graveclaw skeleton','ARMATURE');armature.object=rig
target.data.materials.clear();mat=bpy.data.materials.get('Ash hide • illustrated');target.data.materials.append(mat)
for polygon in target.data.polygons:polygon.material_index=0;polygon.use_smooth=True
bpy.data.objects.remove(source,do_unlink=True)
rig.data.pose_position='POSE'
bpy.context.scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'graveclaw.blend'))
bpy.ops.export_scene.gltf(filepath=str(ASSET),export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_skins=True,export_yup=True)
(OUT/'graveclaw.glb').write_bytes(ASSET.read_bytes())
print(json.dumps({'refinedVertices':len(target.data.vertices),'bones':len(rig.data.bones),'actions':[a.name for a in bpy.data.actions],'bytes':ASSET.stat().st_size}))
