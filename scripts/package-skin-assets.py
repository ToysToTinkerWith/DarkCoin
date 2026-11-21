from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,zipfile
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/champion-skins-v60';rows=json.loads((OUT/'skin-manifest.json').read_text())
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24);title=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',36);small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
def fit(canvas,im,box):
 x,y,w,h=box;im=im.copy();im.thumbnail((w,h),Image.Resampling.LANCZOS);canvas.paste(im,(x+(w-im.width)//2,y+(h-im.height)//2),im if im.mode=='RGBA' else None)
sheet=Image.new('RGB',(1500,1900),'#132129');d=ImageDraw.Draw(sheet);d.text((25,20),'Champion skins · all nine full-body models',font=title,fill='#ecf5f5');d.text((25,72),'Shared Undead body fit · four articulated tails · matching equipment',font=small,fill='#bad1d5')
for i,r in enumerate(rows):
 x=15+i%3*495;y=120+i//3*585;d.rounded_rectangle((x,y,x+477,y+565),radius=10,fill='#25353d');d.text((x+15,y+12),r['name'],font=font,fill='#ecf5f5')
 im=Image.open(OUT/'browser'/f"{r['id']}-quarter.png").crop((280,65,810,920));fit(sheet,im,(x+12,y+50,452,495))
sheet.save(OUT/'skins-overview.png')
details=Image.new('RGB',(1800,1550),'#132129');d=ImageDraw.Draw(details);d.text((25,20),'Skins · source artwork and 3D detail',font=title,fill='#ecf5f5')
for i,hid in enumerate(['tribal_dark_skin','tribal_light_skin','fire_dragon','chameleon','elder_dragon','snake']):
 row=next(r for r in rows if r['id']==hid);x=15+i%3*595;y=90+i//3*720;d.text((x+15,y+10),row['name'],font=font,fill='#ecf5f5')
 im=Image.open(OUT/'references'/f"{row['name']}.png");im=im.crop(im.getbbox());fit(details,im,(x+10,y+55,220,290));fit(details,Image.open(OUT/'browser'/f'{hid}-detail.png').crop((280,45,900,860)),(x+225,y+45,355,620))
details.save(OUT/'skins-detail-comparison.png')
(OUT/'README.md').write_text((ROOT/'docs/champion-skins.md').read_text(encoding='utf8'),encoding='utf8')
with zipfile.ZipFile(OUT/'champion-skin-models.zip','w',zipfile.ZIP_DEFLATED,compresslevel=4) as z:
 for p in sorted((OUT/'models').iterdir()):
  if p.suffix in ['.blend','.glb','.json']:z.write(p,'models/'+p.name)
 for name in ['README.md','skin-manifest.json','validation.json']:z.write(OUT/name,name)
with zipfile.ZipFile(OUT/'skin-previews.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted((OUT/'browser').glob('*.png')):z.write(p,'views/'+p.name)
 for name in ['skins-overview.png','skins-detail-comparison.png']:z.write(OUT/name,name)
print('Packaged nine skins, rigged tails and multi-angle previews')
