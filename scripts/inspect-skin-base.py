import bpy,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root/'output/champion-heads-v53/base/champion-rig-only.blend'))
report=[]
for o in bpy.context.scene.objects:
 if o.type=='MESH' and o.get('trait')=='01_Undead_Body':
  report.append({'name':o.name,'vertices':len(o.data.vertices),'attributes':list(o.data.color_attributes.keys()),'materials':[m.name for m in o.data.materials],'props':dict(o.items()),'bounds':[[min(v.co[k] for v in o.data.vertices),max(v.co[k] for v in o.data.vertices)] for k in range(3)]})
(root/'output/champion-skins-v60/base-report.json').write_text(json.dumps(report,indent=2,default=str))
rig=bpy.data.objects['C5_Champion_Rig']
(root/'output/champion-skins-v60/rig-report.json').write_text(json.dumps([{'name':b.name,'head':list(b.head_local),'tail':list(b.tail_local)} for b in rig.data.bones],indent=2))
print('Skin objects',len(report))
