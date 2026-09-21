const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path');
const esbuild=require('../tmp/champion-model-tools/node_modules/esbuild'),root=path.resolve(__dirname,'..');
esbuild.buildSync({stdin:{contents:"export * from './components/arena/playground/preview-data';export * from './components/contracts/Arena/arenaBalanceV1';",resolveDir:root},bundle:true,platform:'node',outfile:path.join(root,'tmp/arena-preview-tests.cjs')});
const p=require('../tmp/arena-preview-tests.cjs');
const loadout={skin:'Undead',head:'bone',armour:'leather_garb',weapon:'dragon_longsword',magic:'fire_magic',extra:null,background:'dawn_background'};
test('paused playground rejects joins before database access or NFT lookup',async()=>{
 const bundle=await esbuild.build({entryPoints:[path.join(root,'pages/api/arena/combat.js')],bundle:true,platform:'node',write:false,plugins:[{name:'paused-fixtures',setup(b){
  b.onResolve({filter:/arena\/(firebaseServer|service)$|^\.\/playground$/},a=>({path:a.path,namespace:'paused'}));
  b.onLoad({filter:/.*/,namespace:'paused'},a=>({contents:a.path.endsWith('firebaseServer')?"export const arenaDatabase=()=>{throw new Error('Database must not be accessed')};":a.path.endsWith('service')?"export const joinPracticeArena=()=>{throw new Error('Must not join')};export const arenaCommand=()=>({});":"export default ()=>{throw new Error('Must not look up NFTs')};"}));
 }}]});
 const Module=require('module'),m=new Module(path.join(root,'tmp/paused-api.cjs'));m.paths=module.paths;m._compile(bundle.outputFiles[0].text,path.join(root,'tmp/paused-api.cjs'));
 let status=200,value;const headers={};
 await m.exports.default({method:'POST',body:{op:'join'},headers:{}},{setHeader(k,v){headers[k]=v;},status(n){status=n;return this;},json(d){value=d;return this;}});
 assert.equal(status,503);assert.equal(value.code,'PLAYGROUND_PAUSED');assert.match(value.error,/temporarily closed/);assert.equal(headers['Cache-Control'],'no-store');
});
test('inspection uses server stat rules and does not add conditional perks',()=>{
 const result=p.championPreview(loadout),server=p.buildArenaStats(loadout);
 assert.deepEqual(result.stats,server.stats);assert.equal(result.stats.maxHealth,220);assert.equal(result.stats.maxStamina,115);
 assert(result.perks.some(x=>x.name==='Marrow Ward'));assert.equal(result.attackSeconds,1.4);assert.equal(result.magicTiming.castSeconds,.65);
 const conditional=p.championPreview({...loadout,head:'elder'});assert.equal(conditional.stats.abilityPowerPct,0);assert(conditional.perks.some(x=>x.trigger==='conditional'));
});
test('every stat has exactly one all-stats meter; signed speed retains sign',()=>{
 const names=p.STAT_GROUPS.flatMap(g=>g.keys);assert.equal(new Set(names).size,25);assert.deepEqual([...names].sort(),Object.keys(p.STAT_DEFINITIONS).sort());
 assert.deepEqual(p.statMeter('moveSpeedPct',-5),{min:-10,max:10,left:25,width:25,base:50});assert.equal(p.statDisplay('moveSpeedPct',-5),'-5%');
 for(const [key,d] of Object.entries(p.STAT_DEFINITIONS)){const bar=p.statMeter(key,d.base);assert(bar.left>=0&&bar.width>=0&&bar.left+bar.width<=100);}
});
test('empty slots do not grant equipment or spells; all weapons share correct cycles',()=>{
 const bare=p.championPreview({...loadout,head:null,armour:null,weapon:null,magic:null,extra:null});assert.equal(bare.magicTiming,null);assert.equal(bare.selected.head,null);assert.equal(bare.selected.weapon,p.UNARMED);
 for(const [id,w] of Object.entries(p.WEAPONS)){const result=p.championPreview({...loadout,weapon:id});assert.equal(result.attackSeconds,p.attackTiming(id,w.cycleSeconds,result.stats.hastePct).durationSeconds);}
});
test('signature-free API re-reads NFT ownership and ignores client combat stats',async()=>{
 const calls=[];
 const bundle=await esbuild.build({entryPoints:[path.join(root,'pages/api/arena/combat.js')],bundle:true,platform:'node',write:false,plugins:[{name:'server-fixtures',setup(b){
  b.onResolve({filter:/arena\/availability$/},a=>({path:a.path,namespace:'availability'}));
  b.onLoad({filter:/.*/,namespace:'availability'},()=>({contents:"export const PLAYGROUND_JOIN_ENABLED=true;export const PLAYGROUND_PAUSED_MESSAGE='Paused';"}));
  b.onResolve({filter:/arena\/(firebaseServer|service)$|^\.\/playground$/},a=>({path:a.path,namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path.endsWith('firebaseServer')?'export const arenaDatabase=()=>({});':a.path.endsWith('service')?"export const joinPracticeArena=(db,address,champion,token)=>{global.__previewApiCalls.push({address,champion,token});return {token}};export const arenaCommand=()=>({});":"export default async(req,res)=>{if(Number(req.query.assetId)!==123)return res.status(403).json({error:'Not owned'});return res.json({id:123,name:'Server champion',loadout:{skin:'Undead',weapon:null,head:null,armour:null,magic:null,extra:null}})};"}));
 }}]});
 const Module=require('module'),m=new Module(path.join(root,'tmp/preview-api.cjs'));m.paths=module.paths;m._compile(bundle.outputFiles[0].text,path.join(root,'tmp/preview-api.cjs'));const handler=m.exports.default;
 global.__previewApiCalls=calls;const address=require('algosdk').generateAccount().addr.toString();
 async function request(body,ip){let status=200,value;await handler({method:'POST',body,headers:{'x-forwarded-for':ip}},{setHeader(){},status(n){status=n;return this;},json(d){value=d;return this;}});return {status,value};}
 try{
  const result=await request({op:'join',address,assetId:123,loadout:{maxHealth:99999},signed:'not-used'},'qa-1');assert.equal(result.status,200);assert.equal(calls.length,1);assert.equal(calls[0].champion.loadout.maxHealth,undefined);assert.equal(calls[0].champion.id,123);assert.match(calls[0].token,/^[a-f0-9]{64}$/);
  assert.equal((await request({op:'join',address,assetId:999},'qa-2')).status,403);assert.equal(calls.length,1);
  assert.equal((await request({op:'join',address:'invalid',assetId:123},'qa-3')).status,400);
  assert.equal((await request({op:'challenge',address,assetId:123},'qa-4')).status,400,'obsolete signing flow is unavailable');
  assert.equal((await request({op:'join',address,assetId:123},'qa-1')).status,429);
  const saved={mode:process.env.ARENA_TRANSPORT,url:process.env.ARENA_WS_URL,secret:process.env.ARENA_TICKET_SECRET};
  try{
   process.env.ARENA_TRANSPORT='websocket';process.env.ARENA_WS_URL='wss://private-test.run.app/socket';process.env.ARENA_TICKET_SECRET='private-unit-test-key-'.repeat(3);
   const ws=await request({op:'join',address,assetId:123,baselineSpell:'ironbloom',loadout:{maxHealth:99999}},'ws-qa');assert.equal(ws.status,200);assert.equal(ws.value.session.transport,'websocket');assert.equal(calls.length,1,'WebSocket admission must not enter the Firestore REST room');
   const claims=JSON.parse(Buffer.from(ws.value.session.ticket.split('.')[0],'base64url'));assert.equal(claims.champion.id,123);assert.equal(claims.champion.baselineSpell,'ironbloom');assert.equal((await request({op:'join',address,assetId:123,baselineSpell:'__proto__'},'bad-spell')).status,400);assert.equal(claims.champion.loadout.maxHealth,undefined);assert.equal(claims.exp-claims.iat,60);
   assert.equal((await request({op:'input',input:{seq:1}},'ws-qa')).status,410,'legacy input is retired in WebSocket mode');
  }finally{for(const [key,value] of Object.entries({ARENA_TRANSPORT:saved.mode,ARENA_WS_URL:saved.url,ARENA_TICKET_SECRET:saved.secret})){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
 }finally{delete global.__previewApiCalls;}
});
