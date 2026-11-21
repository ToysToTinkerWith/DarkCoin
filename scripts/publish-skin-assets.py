from pathlib import Path
from PIL import Image
import json,shutil
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/champion-skins-v60';PUB=ROOT/'public/arena/playground/assets/skins';PUB.mkdir(parents=True,exist_ok=True)
rows=json.loads((OUT/'skin-manifest.json').read_text())
for r in rows:
 shutil.copy2(OUT/'models'/f"{r['id']}-rigged.glb",PUB/f"{r['id']}-rigged.glb")
 im=Image.open(OUT/'references'/f"{r['name']}.png");im=im.crop(im.getbbox());im.thumbnail((850,850));im.save(PUB/f"{r['id']}-reference.png")
(PUB/'catalog.json').write_text(json.dumps(rows,indent=2));print('Published',len(rows),'skin assets')
