from pathlib import Path
p=Path(__file__).resolve().parents[1]/'public/arena/playground'
s=(p/'magic-preview.html').read_text(encoding='utf8')
for a,b in [('Magic traits','Extra traits'),('CHAMPION MAGIC · V58','CHAMPION EXTRAS · V59'),('trait-title','title'),('Magic <select id="magic" aria-label="Magic trait"','Extra <select id="extra" aria-label="Extra trait"'),('Interactive 3D magic preview','Interactive 3D extra preview'),('Solid 3D geometry, fitted to the champion. Each effect is centered 28 cm above and 28 cm forward of its shoulder socket.','<span id="placement">Fitted to the skin’s ear or neck.</span>'),('Inspect the side view to compare both offsets.','Use Skin only to inspect the fitting around the ear.'),('Magic only','Extra only'),('<label><input id="walk"','<label><input id="skin" type="checkbox">Skin only</label><label><input id="walk"'),('magic-preview.bundle.js','extra-preview.bundle.js')]:s=s.replace(a,b)
(p/'extra-preview.html').write_text(s,encoding='utf8')
