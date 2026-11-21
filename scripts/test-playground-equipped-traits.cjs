// Exercise the real loadout endpoint against deterministic public-data responses.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),esbuild=require(path.join(root,'tmp/champion-model-tools/node_modules/esbuild'));
const {CHAMPION_CREATOR,catalog,resolveLoadout,SKINS}=require('../lib/playground');
const owner='C5AN3H22ATPXVEPQILQQYPZWBXPI3E7OH4QSCKW7KWVIJXPG3KBN6WCSZ4',id=1559026255;
(async()=>{
 const bundle=path.join(root,'tmp/playground-api-traits-test.cjs');await esbuild.build({entryPoints:[path.join(root,'pages/api/arena/playground.js')],bundle:true,platform:'node',format:'cjs',packages:'external',outfile:bundle,logLevel:'silent'});
 const handler=require(bundle).default,originalFetch=global.fetch;let boxes={},requested=[],skin='Undead';
 global.fetch=async url=>{
  const u=new URL(url);let data,status=200;
  if(u.pathname.endsWith('/box')){const key=Buffer.from(u.searchParams.get('name').slice(4),'base64'),category=String.fromCharCode(key[8]);assert.equal(Number(key.readBigUInt64BE()),id);requested.push(category);
   if(boxes[category]===undefined)status=404;else{const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(boxes[category]));data={value:b.toString('base64')};}
  }else if(u.pathname.endsWith('/transactions'))data={transactions:[{'confirmed-round':10,note:Buffer.from(JSON.stringify({properties:{Skin:skin,Head:'Bone',Armour:'Leather Garb',Weapon:'Dragon Long Sword',Magic:'Fire Magic',Extra:'Crescent-Birthmark'}})).toString('base64')}]};
  else if(u.pathname.includes('/accounts/'))data={assets:[{'asset-id':id,amount:1}]};
  else data={asset:{params:{creator:CHAMPION_CREATOR,total:1,name:'Trait integration fixture'}}};
  return {ok:status===200,status,json:async()=>data};
 };
 const invoke=async()=>{let result,code=200;requested=[];const res={setHeader(){},status(v){code=v;return this;},json(v){result=v;return this;}};await handler({method:'GET',query:{assetId:String(id),address:owner}},res);assert.equal(code,200,JSON.stringify(result));assert.deepEqual(requested.sort(),['A','E','H','M','W']);return result;};
 try{
  let r=await invoke();assert.equal(r.loadout.magic,'fire_magic');assert.equal(r.loadout.extra,'crescent_birthmark');
  boxes={M:1631208827,E:3586495521};r=await invoke();assert.equal(r.loadout.magic,'dark_magic');assert.equal(r.loadout.extra,'golden_feathers');
  boxes={M:0,E:0};r=await invoke();assert.equal(r.loadout.magic,null);assert.equal(r.loadout.extra,null);
  for(const [category,property,key,dir] of [['magic','Magic','magic','magic'],['extras','Extra','extra','extras']])for(const [trait,name] of Object.entries(catalog[category])){
   assert.equal(resolveLoadout({Skin:'Undead',[property]:name})[key],trait);assert(fs.existsSync(path.join(root,'public/arena/playground/assets',dir,trait+'-rigged.glb')));
  }
  for(const name of SKINS){skin=name;const selected=await invoke();assert.equal(selected.loadout.skin,name);const asset=name==='Undead'?'body.glb':'skins/'+name.toLowerCase().replace(/[^a-z0-9]+/g,'_')+'-rigged.glb';assert(fs.existsSync(path.join(root,'public/arena/playground/assets',asset)));}
  console.log('PASS all nine selected skins; metadata fallback, equipped M/E overrides, removed traits, all 15 model paths');
 }finally{global.fetch=originalFetch;}
})().catch(e=>{console.error(e);process.exitCode=1});
