from pathlib import Path
import bpy,json,sys
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/champion-magic-v58';ASSETS=ROOT/'public/arena/playground/assets'
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
for row in json.loads((OUT/'magic-manifest.json').read_text()):
    hid=row['id']
    if args and hid not in args:continue
    bpy.ops.wm.open_mainfile(filepath=str(OUT/'models'/f'{hid}.blend'))
    effects=[o for o in bpy.context.scene.objects if o.type=='MESH'];before=set(bpy.context.scene.objects)
    # Match the portable GLB's unlit illustrated shader in the native previews.
    for m in {m for o in effects for m in o.data.materials}:
        n=m.node_tree.nodes;v=next(n for n in n if n.type=='VERTEX_COLOR');em=n.new('ShaderNodeEmission');m.node_tree.links.new(v.outputs['Color'],em.inputs['Color']);m.node_tree.links.new(em.outputs[0],n.get('Material Output').inputs['Surface'])
    for file in ['body.glb','leather_garb.glb','heads/head-bone-rigged.glb']:
        bpy.ops.import_scene.gltf(filepath=str(ASSETS/file),import_pack_images=True)
    champion=[o for o in bpy.context.scene.objects if o not in before]
    for o in bpy.context.scene.objects:
        if o.type=='ARMATURE':o.data.pose_position='REST'
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.eevee.taa_render_samples=32;scene.render.resolution_x=900;scene.render.resolution_y=950;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='Standard'
    scene.world=bpy.data.worlds.new('Magic review');scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.052,.073,.085,1);scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.7
    for loc,power,size in [((-3,-5,6),650,5),((3,2,4),450,4)]:
        data=bpy.data.lights.new('Studio softbox','AREA');data.energy=power;data.shape='DISK';data.size=size;o=bpy.data.objects.new('Studio softbox',data);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1.5))-o.location).to_track_quat('-Z','Y').to_euler()
    camera=bpy.data.cameras.new('Magic camera');cam=bpy.data.objects.new('Magic camera',camera);scene.collection.objects.link(cam);scene.camera=cam;camera.type='ORTHO'
    folder=OUT/'renders'/hid;folder.mkdir(exist_ok=True)
    vs=[v.co for o in effects for v in o.data.vertices];center=Vector(tuple((max(v[i] for v in vs)+min(v[i] for v in vs))/2 for i in range(3)))
    span=max(max(v[i] for v in vs)-min(v[i] for v in vs) for i in range(3))
    for label,dir,isolated in [('front',(0,-1,.02),False),('quarter',(.7,-1,.16),False),('side',(1,-.03,.05),False),('back',(0,1,.06),False),('detail',(.35,-1,.10),True),('detail-side',(1,-.08,.08),True)]:
        for o in champion:o.hide_render=isolated
        target=center if isolated else Vector((0,-.06,1.55));camera.ortho_scale=max(.4,span*1.2) if isolated else 1.22
        cam.location=target+Vector(dir).normalized()*3;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(folder/f'{label}.png');bpy.ops.render.render(write_still=True)
    print('RENDERED',hid,flush=True)
