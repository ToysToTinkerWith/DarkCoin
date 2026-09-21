const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/champion-skins-v60');fs.mkdirSync(path.join(out,'references'),{recursive:true});
const names=require('../lib/playground').SKINS;
(async()=>{
 const page=await fetch('https://dark-coin.com/arena/traits');if(!page.ok)throw Error('Traits page '+page.status);fs.writeFileSync(path.join(out,'traits-page.html'),await page.text());
 const rows=[];
 for(const name of names){const url='https://firebasestorage.googleapis.com/v0/b/dark-coin-dc4a3.appspot.com/o/'+encodeURIComponent('warriors/Skin/'+name+'.png');const r=await fetch(url);if(!r.ok)throw Error(name+' '+r.status);const meta=await r.json();const media=url+'?alt=media&token='+meta.downloadTokens.split(',')[0];const img=await fetch(media);if(!img.ok)throw Error(name+' image '+img.status);fs.writeFileSync(path.join(out,'references',name+'.png'),Buffer.from(await img.arrayBuffer()));rows.push({id:name.toLowerCase().replace(/[^a-z0-9]+/g,'_'),name,url:media});console.log(name);}
 fs.writeFileSync(path.join(out,'skin-references.json'),JSON.stringify(rows,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
