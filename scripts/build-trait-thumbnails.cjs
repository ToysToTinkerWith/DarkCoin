// Original token art, locally cached at UI size. No generated replacement art.
const fs=require('fs'),path=require('path');
const esbuild=require('../tmp/champion-model-tools/node_modules/esbuild');
const {spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'public/arena/playground/traits');
esbuild.buildSync({entryPoints:[path.join(root,'components/contracts/Arena/arenaBalanceV1.js')],bundle:true,platform:'node',outfile:path.join(root,'tmp/trait-thumbnail-catalog.cjs')});
const {TRAITS}=require('../tmp/trait-thumbnail-catalog.cjs');
const normalize=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const files=[];function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,d.name);if(d.isDirectory())walk(p);else if(d.name.endsWith('.png')&&p.includes('references'))files.push(p);}}
walk(path.join(root,'output'));
(async()=>{
 fs.mkdirSync(out,{recursive:true});let n=0;
 for(const [category,traits] of Object.entries(TRAITS))for(const t of Object.values(traits)){
  const dest=path.join(out,category.toLowerCase()+'-'+t.id+'.webp');if(fs.existsSync(dest)&&!['Snake','Undead'].includes(t.name)){n++;continue;}
  const candidates=files.filter(f=>normalize(path.basename(f,'.png'))===normalize(t.name));
  let source=category==='Head'?candidates.find(f=>f.includes(path.join('references','heads'))):category==='Skin'?candidates.find(f=>f.includes('champion-skins-v60')):candidates[0];
  if(!source){
   const names=[t.name,t.name.replace(/ Background$/,''),t.name.replace(/[’']/g,''),String(t.assetId)];
   for(const name of [...new Set(names)]){
    const base='https://firebasestorage.googleapis.com/v0/b/dark-coin-dc4a3.appspot.com/o/'+encodeURIComponent('warriors/'+category+'/'+name+'.png');
    const response=await fetch(base);if(!response.ok)continue;const meta=await response.json();
    const media=await fetch(base+'?alt=media&token='+meta.downloadTokens.split(',')[0]);if(!media.ok)continue;
    source=Buffer.from(await media.arrayBuffer());break;
   }
  }
  if(!source)throw Error('Missing original art: '+category+'/'+t.name);
  const converted=spawnSync('python',['-c',"from PIL import Image; import sys,io; im=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert('RGBA'); box=im.getbbox(); im=im.crop(box) if box else im; im.thumbnail((144,144),Image.Resampling.LANCZOS); bg=Image.new('RGBA',(144,144)); bg.paste(im,((144-im.width)//2,(144-im.height)//2)); bg.save(sys.argv[1],quality=88)",dest],{input:Buffer.isBuffer(source)?source:fs.readFileSync(source)});if(converted.status)throw Error(converted.stderr.toString());n++;
 }
 console.log('Created/verified '+n+' original trait thumbnails.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
