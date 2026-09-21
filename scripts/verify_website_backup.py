"""Check a restored website checkout against its recovery snapshot manifest."""
import argparse,hashlib,json
from pathlib import Path

def main():
 p=argparse.ArgumentParser();p.add_argument('--root',default='.');p.add_argument('--manifest',default='backups/2026-09-21/website-manifest.json');a=p.parse_args();root=Path(a.root).resolve();m=json.loads((root/a.manifest).read_text(encoding='utf-8'));problems=[]
 for row in m['files']:
  target=(root/row['path']).resolve()
  if not target.is_relative_to(root):raise ValueError('Manifest path escapes the checkout')
  if not target.is_file():problems.append({'path':row['path'],'problem':'missing'});continue
  with target.open('rb') as f:sha=hashlib.file_digest(f,'sha256').hexdigest()
  if sha!=row['sha256'] or target.stat().st_size!=row['size']:problems.append({'path':row['path'],'problem':'changed'})
 print(json.dumps({'filesChecked':len(m['files']),'problems':problems},indent=2))
 if problems:raise SystemExit(1)
if __name__=='__main__':main()
