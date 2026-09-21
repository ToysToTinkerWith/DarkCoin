from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,numpy as np,zipfile
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/champion-extras-v59';rows=json.loads((OUT/'extra-manifest.json').read_text());FONT=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',26);SMALL=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17);TITLE=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',37)
def trim(im):
    im=im.convert('RGB');a=np.array(im).astype(int);y,x=np.where(np.max(np.abs(a-np.array(im.getpixel((0,0)))),axis=2)>5)
    return im.crop((max(0,x.min()-10),max(0,y.min()-10),min(im.width,x.max()+11),min(im.height,y.max()+11))) if len(x) else im
def fit(canvas,im,box):
    x,y,w,h=box;im=im.copy();im.thumbnail((w,h),Image.Resampling.LANCZOS);xy=(x+(w-im.width)//2,y+(h-im.height)//2);canvas.paste(im,xy,im if im.mode=='RGBA' else None)
sheet=Image.new('RGB',(1600,1860),(19,33,41));d=ImageDraw.Draw(sheet);d.text((30,22),'Champion Extras · eight fitted 3D accessories',font=TITLE,fill='#e9f5f4');d.text((30,77),'Jewellery on both ears · surface-fitting details on the viewer’s left neck',font=SMALL,fill='#bdd2d8')
for i,r in enumerate(rows):
    x=22+i%2*790;y=124+i//2*427;d.rounded_rectangle((x,y,x+767,y+408),radius=10,fill=(30,46,54));d.text((x+17,y+14),r['name'],font=FONT,fill='#e6f0f1')
    for t,dx in [('Original',20),('3D model',205),('On the skin',422)]:d.text((x+dx,y+53),t,font=SMALL,fill='#adc6cd')
    ref=Image.open(OUT/'references'/f"{r['id']}-crop.png")
    if r['id']=='crescent_birthmark':
        backing=Image.new('RGBA',ref.size,(155,155,155,255));backing.alpha_composite(ref);ref=backing
    fit(sheet,ref,(x+14,y+90,163,273));fit(sheet,trim(Image.open(OUT/'browser'/f"{r['id']}-detail.png")),(x+190,y+83,208,283))
    skin=Image.open(OUT/'browser'/f"{r['id']}-quarter.png");skin=skin.crop((420,540,850,855) if r['attachment']=='neck_skin' else (300,230,720,700));fit(sheet,skin,(x+415,y+81,337,305))
sheet.save(OUT/'extras-overview.png');(OUT/'README.md').write_text((ROOT/'docs/champion-extras.md').read_text(encoding='utf8'),encoding='utf8')
placement=Image.new('RGB',(1380,600),(19,33,41));pd=ImageDraw.Draw(placement);pd.text((24,18),'Updated accessory placement',font=TITLE,fill='#e9f5f4')
for i,(hid,title,view,crop) in enumerate([('crescent_moon_earring','Earrings · both ears','front',(305,235,825,660)),('golden_feathers','Feathers · both ear rims','front',(305,235,825,660)),('crescent_birthmark','Birthmark · doubled again','quarter',(420,515,790,835))]):
    x=15+i*455;pd.text((x+10,82),title,font=FONT,fill='#e6f0f1');im=Image.open(OUT/'browser'/f'{hid}-{view}.png').crop(crop);fit(placement,im,(x+8,125,425,445))
placement.save(OUT/'extras-placement-update.png')
with zipfile.ZipFile(OUT/'champion-extra-models.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in sorted((OUT/'models').iterdir()):
        if p.suffix in ['.blend','.glb','.json']:z.write(p,'models/'+p.name)
    for name in ['README.md','extra-manifest.json','extra-references.json','validation.json']:z.write(OUT/name,name)
with zipfile.ZipFile(OUT/'extra-previews.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted((OUT/'browser').glob('*.png')):z.write(p,'views/'+p.name)
    z.write(OUT/'extras-overview.png','extras-overview.png')
    z.write(OUT/'extras-placement-update.png','extras-placement-update.png')
print('Packaged eight Extras with native models, GLBs and six views each.')
