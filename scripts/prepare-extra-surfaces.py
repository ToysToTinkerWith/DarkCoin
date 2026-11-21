from pathlib import Path
import json,numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt,gaussian_filter,map_coordinates,label
from skimage.measure import marching_cubes
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/champion-extras-v59';(OUT/'volume-data').mkdir(exist_ok=True)
config={'golden_feathers':(.092,.0024),'battle_wound':(.065,.0007),'crescent_birthmark':(.017,.00012)}
for row in json.loads((OUT/'extra-references.json').read_text()):
    source=Image.open(OUT/'references'/f"{row['name']}.png").convert('RGBA');source=source.crop(source.getbbox());source.save(OUT/'references'/f"{row['id']}-crop.png")
    if row['id'] not in config:continue
    w,h=source.size;scale=240/max(w,h);w,h=round(w*scale),round(h*scale);a=np.array(source.resize((w,h),Image.Resampling.LANCZOS));mask=a[...,3]>(15 if row['id']=='crescent_birthmark' else 100)
    pad=4;mask=np.pad(mask,pad);rgb=np.pad(a[...,:3],((pad,pad),(pad,pad),(0,0)),mode='edge');_,nearest=distance_transform_edt(~mask,return_indices=True);rgb=rgb[nearest[0],nearest[1]].astype(float)
    d=gaussian_filter(distance_transform_edt(mask)-distance_transform_edt(~mask),.55);span,depth=config[row['id']];yy=np.linspace(-depth*1.1,depth*1.1,37)
    field=d[:,:,None]-d.max()*(yy[None,None,:]/depth)**2
    v,f,_,_=marching_cubes(field.astype('float32'),0,allow_degenerate=False);rr,cc,dd=v.T
    colors=np.stack([map_coordinates(rgb[...,k],[rr,cc],order=1,mode='nearest') for k in range(3)],axis=1)
    vs=np.stack([(cc-pad-w/2)*span/max(w,h),np.interp(dd,np.arange(len(yy)),yy),(h/2-(rr-pad))*span/max(w,h)],axis=1)
    np.savez_compressed(OUT/'volume-data'/f"{row['id']}.npz",vertices=vs,faces=f[:,::-1],rgb=colors)
    print(row['id'],len(vs))
