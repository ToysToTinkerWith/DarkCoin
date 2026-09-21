"""Recover artwork silhouettes/pigment, then inflate them into closed round volumes.

The signed distance field creates tapered thickness at every contour, including
individual wisps and internal holes. Marching cubes produces real front, side,
and rear surfaces; there are no alpha cards or camera-facing planes.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, gaussian_filter, map_coordinates, label
from skimage.measure import marching_cubes

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/champion-magic-v58'
DEST=OUT/'volume-data';DEST.mkdir(exist_ok=True)
ROWS=json.loads((OUT/'magic-references.json').read_text())
CONFIG={'fire_magic':(.255,.061),'water_magic':(.215,.076),'poison_cloud':(.340,.044),'blood_shards':(.340,.024)}
for row in ROWS:
    im=Image.open(OUT/'references'/f"{row['name']}.png").convert('RGBA')
    # A tightly cropped comparison image makes the original readable in the viewer.
    alpha=np.asarray(im)[...,3];ys,xs=np.where(alpha>100)
    im.crop((max(0,xs.min()-12),max(0,ys.min()-12),min(im.width,xs.max()+13),min(im.height,ys.max()+13))).save(OUT/'references'/f"{row['id']}-crop.png")
    if row['id'] not in CONFIG:continue
    regions=[(1,(1900,1200,3000,2850)),(-1,(0,1200,1100,2850))] if row['id']!='blood_shards' else [(1,(2000,1600,3000,2450))]
    for side,box in regions:
        source=im.crop(box);a=np.asarray(source);mask=a[...,3]>210
        # Exclude the translucent painted glow from the solid volume.
        if row['id']=='fire_magic':mask&=(a[...,0]>200)&(a[...,1]<210)
        ys,xs=np.where(mask);box2=(xs.min(),ys.min(),xs.max()+1,ys.max()+1);source=source.crop(box2)
        original=np.asarray(source);width,height=source.size
        # Enough contour samples for the small curls, with bounded polygon count.
        scale=260/max(width,height);w,h=max(8,round(width*scale)),max(8,round(height*scale))
        a=np.asarray(source.resize((w,h),Image.Resampling.LANCZOS));mask=a[...,3]>210
        if row['id']=='fire_magic':mask&=(a[...,0]>200)&(a[...,1]<210)
        components,count=label(mask)
        for k in range(1,count+1):
            if np.count_nonzero(components==k)<4:mask[components==k]=False
        if row['id']=='poison_cloud':
            # Complete the cloud where the source is cropped by the canvas:
            # a scalloped, rounded outer billow rather than a flat vertical cut.
            extra=round(w*.19);left=extra if side<0 else 0;right=extra if side>0 else 0
            expanded=np.pad(mask,((0,0),(left,right)))
            for y in range(h):
                edge=mask[y,0 if side<0 else -1]
                if not edge:continue
                extent=round(extra*np.sin(np.pi*(y+.5)/h)**.7*(.90+.10*np.sin(y*.12)))
                if side>0:expanded[y,w:w+extent]=True
                else:expanded[y,extra-extent:extra]=True
            mask=expanded;a=np.pad(a,((0,0),(left,right),(0,0)),mode='edge');w+=extra
        # Original crops touch the canvas on poison's outer edge. Round that
        # inferred end in depth instead of leaving an open cut surface.
        pad=5;mask=np.pad(mask,pad);rgb=np.pad(a[...,:3],((pad,pad),(pad,pad),(0,0)),mode='edge')
        _,nearest=distance_transform_edt(~mask,return_indices=True);rgb=rgb[nearest[0],nearest[1]].astype(float)
        signed=distance_transform_edt(mask)-distance_transform_edt(~mask)
        signed=gaussian_filter(signed,.58)
        span,depth=CONFIG[row['id']];pixel=span/max(w,h)
        maxd=max(1,signed.max());yslice=np.linspace(-depth*1.12,depth*1.12,61)
        field=signed[:,:,None]-maxd*(yslice[None,None,:]/depth)**2
        verts,faces,_,_=marching_cubes(field.astype('float32'),0,allow_degenerate=False)
        rr,cc,dd=verts.T
        colors=np.stack([map_coordinates(rgb[...,k],[rr,cc],order=1,mode='nearest') for k in range(3)],axis=1)
        xx=(cc-pad-w/2)*pixel;zz=(h/2-(rr-pad))*pixel;yy=np.interp(dd,np.arange(len(yslice)),yslice)
        # A small swept depth gives the four projectiles a diagonal trajectory.
        if row['id']=='blood_shards':yy-=xx*.25
        # The original front is retained on the back as a coherent inferred
        # continuation. Side surfaces taper smoothly to each illustrated edge.
        vs=np.stack([xx,yy,zz],axis=1)
        np.savez_compressed(DEST/f"{row['id']}-{side}.npz",vertices=vs,faces=faces[:,::-1],rgb=colors)
        print(row['id'],side,len(vs),'vertices',flush=True)
