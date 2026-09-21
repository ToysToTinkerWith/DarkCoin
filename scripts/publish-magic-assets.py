from pathlib import Path
import json,shutil
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/champion-magic-v58';PUB=ROOT/'public/arena/playground/assets/magic';PUB.mkdir(parents=True,exist_ok=True)
rows=json.loads((OUT/'magic-manifest.json').read_text())
for r in rows:
    shutil.copy2(OUT/'models'/f"{r['id']}-rigged.glb",PUB/f"{r['id']}-rigged.glb")
    shutil.copy2(OUT/'references'/f"{r['name']}.png",PUB/f"{r['id']}-reference.png")
    shutil.copy2(OUT/'references'/f"{r['id']}-crop.png",PUB/f"{r['id']}-crop.png")
(PUB/'catalog.json').write_text(json.dumps(rows,indent=2))
print('Published seven magic traits into local playground assets')
