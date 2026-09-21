"""Inventory and deduplicate the playground's source assets for a recoverable backup."""
import argparse, collections, hashlib, json, os, re, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SKIP_DIRS={'node_modules','__pycache__','.git','.next','venv'}
SKIP_EXT={'.log','.pyc','.pyo'}
TEXT_EXT={'.py','.js','.cjs','.mjs','.json','.txt','.md','.yaml','.yml','.env','.html','.toml'}
SECRET_PATTERNS=[('private-key',re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')),('github-token',re.compile(rb'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})')),('cloud-secret',re.compile(rb'\bAKIA[0-9A-Z]{16}\b')),('wallet-mnemonic',re.compile(rb'[\"\x27]([a-z]+(?: [a-z]+){24})[\"\x27]'))]
def scan(path,data):
 return [{'path':path,'kind':kind,'line':data[:m.start()].count(b'\n')+1} for kind,pattern in SECRET_PATTERNS for m in pattern.finditer(data)]
def digest_file(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',default='tmp/playground-backup');args=ap.parse_args();out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True)
 sources=[]
 for parent,prefix in [(ROOT/'output','champion'),(ROOT/'tmp','champion')]:
  for folder in sorted(parent.glob(prefix+'*')):
   if not folder.is_dir():continue
   for d,dirs,files in os.walk(folder):
    dirs[:]=[x for x in dirs if x not in SKIP_DIRS]
    sources.extend(Path(d)/f for f in sorted(files) if Path(f).suffix.lower() not in SKIP_EXT)
 for p in (ROOT/'tmp').iterdir():
  if p.is_file() and p.suffix in {'.py','.js','.cjs','.json'} and any(s in p.name for s in ['champion','head','armour','weapon','skin','body','motion','gait']):sources.append(p)
 for p in (ROOT/'public/arena/playground').rglob('*'):
  if p.is_file():sources.append(p)
 files=[];objects={};archives=[];findings=[];excluded=[];total=0
 def record(rel,p,size,sha,member=None):
  files.append({'path':rel,'size':size,'sha256':sha})
  if sha not in objects:objects[sha]={'source':str(p),'member':member,'size':size}
 for i,p in enumerate(sorted(set(sources))):
  rel=p.relative_to(ROOT).as_posix()
  if p.suffix.lower()=='.zip':archives.append(p);continue
  if any(x in p.name.lower() for x in ['.env','service-account','credentials']):excluded.append(rel);continue
  size=p.stat().st_size;sha=digest_file(p);record(rel,p,size,sha);total+=size
  if p.suffix.lower() in TEXT_EXT and size<30*1024**2:findings.extend(scan(rel,p.read_bytes()))
  if i%500==0:print(f'Inventoried {i} files; {total/1024**3:.2f} GiB',flush=True)
 desktop=Path.home()/'OneDrive/Desktop'
 for name in ['Leather Garb.png','Bone.png','Undead.png','Scythe.png','Cannibal.png','All Knowing.png']:
  p=desktop/name
  if p.exists():record('references/original-traits/'+name,p,p.stat().st_size,digest_file(p))
 zip_records=[];unique_archive=0
 for p in archives:
  rel=p.relative_to(ROOT).as_posix();entries=[]
  with zipfile.ZipFile(p) as z:
   for info in z.infolist():
    if info.is_dir():continue
    if Path(info.filename).suffix.lower() in SKIP_EXT or any(x in Path(info.filename).parts for x in SKIP_DIRS):continue
    if info.filename.startswith(('/', '\\')) or '..' in Path(info.filename).parts:raise ValueError('Unsafe archive path '+rel)
    with z.open(info) as f:sha=hashlib.file_digest(f,'sha256').hexdigest()
    entries.append({'path':info.filename,'size':info.file_size,'sha256':sha})
    if sha not in objects:
     recovered='recovered-archive-assets/'+p.parent.name+'/'+p.stem+'/'+info.filename
     record(recovered,p,info.file_size,sha,info.filename);unique_archive+=1
     if Path(info.filename).suffix.lower() in TEXT_EXT and info.file_size<30*1024**2:findings.extend(scan(recovered,z.read(info)))
  zip_records.append({'path':rel,'entries':entries})
  print(f'Checked archive {p.name}; {unique_archive} unique archived files recovered',flush=True)
 manifest={'format':'darkcoin-playground-backup-v1','created':'2026-09-21','hash':'sha256','files':files,'originalArchives':zip_records,'excluded':excluded,'objects':{k:{'size':v['size']} for k,v in objects.items()}}
 (out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8');(out/'local-sources.json').write_text(json.dumps(objects),encoding='utf-8');(out/'secret-scan.json').write_text(json.dumps(findings,indent=2),encoding='utf-8')
 summary={'files':len(files),'modelFiles':sum(Path(f['path']).suffix in {'.blend','.blend1','.glb','.gltf','.fbx','.obj'} for f in files),'logicalGiB':round(sum(f['size'] for f in files)/1024**3,2),'uniqueObjects':len(objects),'uniqueGiB':round(sum(v['size'] for v in objects.values())/1024**3,2),'archivesInspected':len(archives),'uniqueArchiveFiles':unique_archive,'secretFindings':findings,'excluded':excluded}
 (out/'summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))
if __name__=='__main__':main()
