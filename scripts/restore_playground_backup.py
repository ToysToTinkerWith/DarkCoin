"""Restore/verify a DarkCoin asset release using only Python's standard library.
Download manifest.json and backup-index.json from the release first, then:
  python scripts/restore_playground_backup.py --manifest manifest.json --index backup-index.json --destination .
"""
import argparse,hashlib,json,os,shutil,tempfile,urllib.request,zipfile,tarfile
from pathlib import Path,PurePosixPath

def safe_target(root,name):
 p=PurePosixPath(name)
 if p.is_absolute() or '..' in p.parts or '\\' in name or ':' in name:raise ValueError('Unsafe restore path: '+name)
 target=(root/Path(*p.parts)).resolve()
 if not target.is_relative_to(root):raise ValueError('Path escapes restore destination')
 return target

def archive_objects(archive,wanted):
 if isinstance(archive,zipfile.ZipFile):
  for sha in sorted(wanted):yield sha,archive.open('objects/'+sha)
 else:
  for member in archive:
   sha=member.name.removeprefix('objects/')
   if member.isfile() and member.name=='objects/'+sha and sha in wanted:
    yield sha,archive.extractfile(member)
   elif member.isfile():
    # Drain skipped files in bounded chunks instead of one very large stream seek.
    with archive.extractfile(member) as skipped:
     while skipped.read(1024**2):pass

def restore(manifest,index,destination,verify_only=False,includes=(),local_parts=None):
 root=Path(destination).resolve();root.mkdir(parents=True,exist_ok=True)
 by_hash={}
 for row in manifest['files']:
  if includes and not any(row['path'].startswith(p) for p in includes):continue
  safe_target(root,row['path']);by_hash.setdefault(row['sha256'],[]).append(row)
 needed=set(by_hash);seen=set();restored=0
 for part in index['parts']:
  wanted=needed.intersection(part['objects'])
  if not wanted:continue
  print('Checking '+part['name'],flush=True)
  with tempfile.TemporaryDirectory(prefix='darkcoin-restore-') as temp:
   archive=Path(local_parts)/part['name'] if local_parts else Path(temp)/part['name']
   if not local_parts:
    url=part['url']
    if not url.startswith('https://github.com/ToysToTinkerWith/DarkCoin/releases/download/'):raise ValueError('Unexpected asset download URL')
    with urllib.request.urlopen(url,timeout=120) as src,archive.open('wb') as dst:shutil.copyfileobj(src,dst,1024**2)
   with archive.open('rb') as f:
    if hashlib.file_digest(f,'sha256').hexdigest()!=part['sha256']:raise ValueError('Archive checksum mismatch: '+part['name'])
   reader=zipfile.ZipFile(archive) if archive.suffix=='.zip' else tarfile.open(archive,mode='r|xz')
   with reader as z:
    for sha,object_stream in archive_objects(z,wanted):
     rows=by_hash[sha];first=Path(temp)/'object';h=hashlib.sha256();size=0
     with object_stream as src,first.open('wb') as dst:
      while chunk:=src.read(1024**2):h.update(chunk);size+=len(chunk);dst.write(chunk)
     if h.hexdigest()!=sha or any(r['size']!=size for r in rows):raise ValueError('Asset checksum mismatch: '+rows[0]['path'])
     for row in rows:
      if not verify_only:
       target=safe_target(root,row['path']);target.parent.mkdir(parents=True,exist_ok=True)
       if target.exists():
        with target.open('rb') as f:existing=hashlib.file_digest(f,'sha256').hexdigest()
        if existing!=sha:raise FileExistsError('Refusing to overwrite a different file: '+str(target))
       else:shutil.copyfile(first,target)
      restored+=1
     seen.add(sha)
     if wanted.issubset(seen):break
 if needed-seen:raise ValueError(f'Missing {len(needed-seen)} required objects')
 print(f'{"Verified" if verify_only else "Restored"} {restored} files ({len(seen)} unique objects).',flush=True)
 return restored

def main():
 p=argparse.ArgumentParser();p.add_argument('--manifest',required=True);p.add_argument('--index',required=True);p.add_argument('--destination',default='DarkCoin-restored');p.add_argument('--verify-only',action='store_true');p.add_argument('--include',action='append',default=[]);p.add_argument('--local-parts');a=p.parse_args()
 raw=Path(a.manifest).read_bytes();index=json.loads(Path(a.index).read_text(encoding='utf-8'))
 if hashlib.sha256(raw).hexdigest()!=index['manifestSha256']:raise ValueError('Manifest checksum mismatch')
 restore(json.loads(raw),index,a.destination,a.verify_only,a.include,a.local_parts)
if __name__=='__main__':main()
