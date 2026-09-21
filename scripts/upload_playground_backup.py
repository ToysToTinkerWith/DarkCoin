"""Upload content-addressed asset archives to a draft GitHub recovery release.
Credentials come from the existing Git credential helper and stay in memory.
"""
import concurrent.futures,hashlib,json,os,subprocess,threading,time,zipfile,sys
from pathlib import Path
import requests,lzma,tarfile,re
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tmp/playground-backup';REPO='ToysToTinkerWith/DarkCoin';TAG='recovery-2026-09-21';BRANCH='backup/website-and-playground-2026-09-21'
API='https://api.github.com/repos/'+REPO;LOCK=threading.Lock()
def credentials():
 r=subprocess.run(['git','credential','fill'],input='protocol=https\nhost=github.com\n\n',capture_output=True,text=True,check=True)
 c=dict(x.split('=',1) for x in r.stdout.splitlines() if '=' in x)
 return {'Authorization':'Bearer '+c['password'],'Accept':'application/vnd.github+json','User-Agent':'DarkCoin-recovery-backup'}
HEADERS={}
def api(method,url,**kw):
 r=requests.request(method,url,headers=HEADERS,timeout=120,**kw);r.raise_for_status();return r.json() if r.content else None

def upload_file(release,p,known=None):
 with p.open('rb') as f:sha=hashlib.file_digest(f,'sha256').hexdigest()
 name=p.name;size=p.stat().st_size
 for attempt in range(4):
  existing=next((a for a in api('GET',API+f'/releases/{release["id"]}/assets?per_page=100') if a['name']==name),None)
  if existing:
   if existing.get('digest')=='sha256:'+sha and existing['size']==size:return existing,sha
   if existing.get('state')=='starter' and existing['size']==0:api('DELETE',API+f'/releases/assets/{existing["id"]}')
   else:raise ValueError('Existing asset differs; refusing to replace '+name)
  try:
   with p.open('rb') as data:
    r=requests.post(release['upload_url'].split('{')[0],params={'name':name},headers={**HEADERS,'Content-Type':'application/octet-stream','Content-Length':str(size)},data=data,timeout=(30,900))
   r.raise_for_status();asset=r.json()
   if asset.get('digest')!='sha256:'+sha or asset['size']!=size:raise ValueError('GitHub checksum/size mismatch: '+name)
   return asset,sha
  except requests.RequestException:
   if attempt==3:raise
   time.sleep(3)

def main():
 global HEADERS
 HEADERS=credentials();summary=json.loads((OUT/'summary.json').read_text());findings=json.loads((OUT/'secret-scan.json').read_text())
 if findings or json.loads((OUT/'extended-secret-scan.json').read_text()):raise ValueError('Unreviewed secret findings prevent upload')
 raw=(OUT/'manifest.json').read_bytes();manifest=json.loads(raw);sources=json.loads((OUT/'local-sources.json').read_text())
 releases=api('GET',API+'/releases?per_page=100');release=next((r for r in releases if r['tag_name']==TAG),None)
 if not release:
  release=api('POST',API+'/releases',json={'tag_name':TAG,'target_commitish':BRANCH,'name':'Website and playground recovery — 2026-09-21','draft':True,'body':'Recovery snapshot of the website and editable playground assets. Upload and integrity verification in progress. See docs/website-and-playground-recovery.md on the backup branch.'})
 if not release['draft']:raise ValueError('Release is already published; refusing to modify it')
 (OUT/'release.json').write_text(json.dumps(release,indent=2),encoding='utf-8');print('Draft release ready: '+str(release['id']),flush=True)
 index_path=OUT/'backup-index.json';index=json.loads(index_path.read_text()) if index_path.exists() else {'format':'darkcoin-playground-backup-v1','manifestSha256':hashlib.sha256(raw).hexdigest(),'release':'https://github.com/'+REPO+'/releases/tag/'+TAG,'summary':summary,'parts':[]}
 if index['manifestSha256']!=hashlib.sha256(raw).hexdigest():raise ValueError('Manifest changed since upload began')
 plan_path=OUT/'solid-plan.json'
 if plan_path.exists():groups=json.loads(plan_path.read_text())
 else:
  stored={sha for part in index['parts'] for sha in part['objects']};groups=[];current=[];size=0
  def source_order(item):
   sha,src=item;p=Path(src.get('member') or src['source']);return (p.suffix.lower(),re.sub(r'v[0-9]+','v',p.name.lower()),src['source'])
  for sha,src in sorted(sources.items(),key=source_order):
   if sha in stored:continue
   if current and size+src['size']>1024*1024**2:groups.append(current);current=[];size=0
   current.append(sha);size+=src['size']
  if current:groups.append(current)
  plan_path.write_text(json.dumps(groups))
 complete={p['name'] for p in index['parts']};print(f'{len(groups)} solid archive parts; preserving {len(complete)} verified parts',flush=True)
 def worker(item):
  number,group=item;name=f'playground-source-{number:03d}.tar.xz'
  if name in complete:return
  p=OUT/name;print('Compressing '+name,flush=True)
  with lzma.LZMAFile(p,'w',filters=[{'id':lzma.FILTER_LZMA2,'preset':1,'dict_size':64*1024**2}]) as compressed:
   with tarfile.open(fileobj=compressed,mode='w|') as archive_out:
    for sha in group:
     src=sources[sha];archive=None
     if src.get('member'):archive=zipfile.ZipFile(src['source']);stream=archive.open(src['member'])
     else:stream=open(src['source'],'rb')
     h=hashlib.sha256()
     class CheckedReader:
      def read(self,n=-1):
       chunk=stream.read(n);h.update(chunk);return chunk
     info=tarfile.TarInfo('objects/'+sha);info.size=src['size'];info.mtime=0;info.mode=0o644
     try:
      with stream:archive_out.addfile(info,CheckedReader())
     finally:
      if archive:archive.close()
     if h.hexdigest()!=sha:raise ValueError('Source changed after inventory: '+src['source'])
  print(f'Uploading {name}: {p.stat().st_size/1024**2:.1f} MiB',flush=True);asset,sha=upload_file(release,p)
  record={'name':name,'size':p.stat().st_size,'sha256':sha,'assetId':asset['id'],'url':asset['browser_download_url'],'objects':group,'verifiedGithubDigest':asset['digest']}
  with LOCK:
   index['parts'].append(record);index['parts'].sort(key=lambda r:r['name']);temp=OUT/'backup-index.pending.json';temp.write_text(json.dumps(index,indent=2),encoding='utf-8');os.replace(temp,index_path)
  # Only the newly created verified archive is removed; original project assets remain.
  p.unlink();print(f'Verified {name} on GitHub ({len(index["parts"])} verified parts)',flush=True)
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(worker,enumerate(groups,1)))
 for name in ['manifest.json','backup-index.json']:
  asset,sha=upload_file(release,OUT/name);print('Verified '+name+': '+sha,flush=True)
 print(json.dumps({'complete':True,'parts':len(index['parts']),'compressedGiB':round(sum(p['size'] for p in index['parts'])/1024**3,2),'files':len(manifest['files']),'releaseId':release['id']}),flush=True)
if __name__=='__main__':main()
