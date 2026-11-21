from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json,zipfile
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/champion-magic-v58';rows=json.loads((OUT/'magic-manifest.json').read_text())
FONT=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',27);SMALL=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18);TITLE=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',37)
BG=(19,33,41);CARD=(26,43,51)
def trim(image):
    im=image.convert('RGB');a=np.asarray(im).astype(int);mask=np.max(np.abs(a-np.array(im.getpixel((0,0)))),axis=2)>22
    y,x=np.where(mask)
    if len(x):im=im.crop((max(0,x.min()-18),max(0,y.min()-18),min(im.width,x.max()+19),min(im.height,y.max()+19)))
    return im
def pastefit(canvas,im,box):
    x,y,w,h=box;im=im.copy();im.thumbnail((w,h),Image.Resampling.LANCZOS)
    if im.mode=='RGBA':canvas.paste(im,(x+(w-im.width)//2,y+(h-im.height)//2),im)
    else:canvas.paste(im,(x+(w-im.width)//2,y+(h-im.height)//2))
overview=Image.new('RGB',(1440,1840),BG);draw=ImageDraw.Draw(overview);draw.text((30,24),'Champion magic · all seven 3D traits',font=TITLE,fill='#e9f5f4');draw.text((30,76),'Mounted above and in front of the shoulder · original illustrated style',font=SMALL,fill='#b8d3d7')
comparison=Image.new('RGB',(1560,2440),BG);cd=ImageDraw.Draw(comparison);cd.text((30,22),'Magic artwork → 3D models',font=TITLE,fill='#e9f5f4')
for i,r in enumerate(rows):
    x=378 if i==len(rows)-1 and len(rows)%2 else 24+(i%2)*708;y=126+(i//2)*423;draw.rounded_rectangle((x,y,x+686,y+404),radius=12,fill=CARD);draw.text((x+20,y+15),r['name'],font=FONT,fill='#eaf3f1')
    im=trim(Image.open(OUT/'browser'/f"{r['id']}-front.png"));pastefit(overview,im,(x+10,y+55,666,338))
    cy=100+i*330;cd.text((30,cy),r['name'],font=FONT,fill='#eaf3f1')
    for label,xx in [('Original artwork',35),('3D effect',545),('Side view on champion',1055)]:cd.text((xx,cy+37),label,font=SMALL,fill='#b8d3d7')
    pastefit(comparison,Image.open(OUT/'references'/f"{r['id']}-crop.png"),(30,cy+65,480,240))
    pastefit(comparison,trim(Image.open(OUT/'browser'/f"{r['id']}-detail.png")),(540,cy+65,480,240))
    pastefit(comparison,trim(Image.open(OUT/'browser'/f"{r['id']}-side.png")),(1050,cy+65,480,240))
overview.save(OUT/'magic-overview.png');comparison.save(OUT/'magic-reference-comparison.png')
(OUT/'README.md').write_text((ROOT/'docs/champion-magic.md').read_text(),encoding='utf8')
with zipfile.ZipFile(OUT/'champion-magic-models.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in sorted((OUT/'models').iterdir()):
        if p.suffix in ['.glb','.blend','.json']:z.write(p,'models/'+p.name)
    for name in ['README.md','magic-manifest.json','magic-references.json','validation.json']:z.write(OUT/name,name)
with zipfile.ZipFile(OUT/'magic-previews.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted((OUT/'browser').glob('*.png')):z.write(p,'views/'+p.name)
    for name in ['magic-overview.png','magic-reference-comparison.png']:z.write(OUT/name,name)
print('Packaged models, native Blender sources, comparison sheet, and multi-angle previews.')
