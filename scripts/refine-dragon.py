"""Join the dragon's sculpted hide, preserve its separate jaw and membranes."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/cindermaw';ASSET=ROOT/'public/arena/playground/assets/beasts/cindermaw.glb'
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=100
bpy.ops.import_scene.gltf(filepath=str(ASSET))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');rig.data.pose_position='REST'
source=next(o for o in bpy.data.objects if o.type=='MESH' and o.name=='Cindermaw hide')
target=source.copy();target.data=source.data.copy();bpy.context.collection.objects.link(target);target.name='Cindermaw continuous hide'
bpy.ops.object.select_all(action='DESELECT');target.select_set(True);bpy.context.view_layer.objects.active=target
for m in list(target.modifiers):target.modifiers.remove(m)
remesh=target.modifiers.new('Unified hide','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.018;remesh.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=remesh.name)
smooth=target.modifiers.new('Sculpt blend','SMOOTH');smooth.factor=.65;smooth.iterations=3;bpy.ops.object.modifier_apply(modifier=smooth.name)
decimate=target.modifiers.new('Realtime topology','DECIMATE');decimate.ratio=.38;bpy.ops.object.modifier_apply(modifier=decimate.name)
for group in source.vertex_groups:
 if not target.vertex_groups.get(group.name):target.vertex_groups.new(name=group.name)
transfer=target.modifiers.new('Transfer skin weights','DATA_TRANSFER');transfer.object=source;transfer.use_vert_data=True;transfer.data_types_verts={'VGROUP_WEIGHTS'};transfer.vert_mapping='POLYINTERP_NEAREST';transfer.layers_vgroup_select_src='ALL';transfer.layers_vgroup_select_dst='NAME';bpy.ops.object.modifier_apply(modifier=transfer.name)
bpy.ops.object.mode_set(mode='WEIGHT_PAINT');bpy.ops.object.vertex_group_smooth(group_select_mode='ALL',factor=.8,repeat=18);bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL',limit=4);bpy.ops.object.vertex_group_normalize_all(lock_active=False);bpy.ops.object.mode_set(mode='OBJECT')
armature=target.modifiers.new('Dragon skeleton','ARMATURE');armature.object=rig
target.data.validate(clean_customdata=False);target.data.update()
for polygon in target.data.polygons:polygon.use_smooth=True
bpy.data.objects.remove(source,do_unlink=True);rig.data.pose_position='POSE';bpy.context.scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cindermaw.blend'))
bpy.ops.export_scene.gltf(filepath=str(ASSET),export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_skins=True,export_yup=True)
(OUT/'cindermaw.glb').write_bytes(ASSET.read_bytes())
print(json.dumps({'hideVertices':len(target.data.vertices),'bones':len(rig.data.bones),'bytes':ASSET.stat().st_size}))
