// Integration against an isolated QA room in the configured Firebase project.
// No user champion is impersonated via the public endpoint. Internal fixtures
// exercise transactions; admission is signature-free and public holdings are checked by the API.
const assert=require('node:assert/strict'),crypto=require('crypto'),path=require('path');
require('dotenv').config({quiet:true});
process.env.NODE_ENV='development';
require('../tmp/champion-model-tools/node_modules/esbuild').buildSync({stdin:{contents:"export * from './lib/arena/service';export * from './lib/arena/firebaseServer';export {hash} from './lib/arena/walletProof';",resolveDir:path.resolve(__dirname,'..')},bundle:true,platform:'node',outfile:path.resolve(__dirname,'../tmp/arena-firebase-tests.cjs'),external:['firebase-admin']});
const {arenaDatabase,joinPracticeArena,arenaCommand,hash}=require('../tmp/arena-firebase-tests.cjs');
(async()=>{
 const db=arenaDatabase(),run=crypto.randomBytes(8).toString('hex'),roomId='qa-room-'+run,refs=[db.collection('arenaPrivate').doc(roomId)],now=Date.now()/1000;
 const tokenA=crypto.randomBytes(32).toString('hex'),tokenB=crypto.randomBytes(32).toString('hex');
 const champion=(id)=>({id,name:'QA fixture '+id,loadout:{skin:'Undead',weapon:'dark_sword',head:null,armour:null,magic:'fire_magic',extra:null}});
 try{
  for(const key of ['a','b'])refs.push(db.collection('arenaPrivate').doc('admission-'+hash(roomId+'qa-wallet-'+run+key)));
  refs.push(db.collection('arenaPrivate').doc('session-'+hash(tokenA)),db.collection('arenaPrivate').doc('session-'+hash(tokenB)));
  const [a,b]=await Promise.all([joinPracticeArena(db,'qa-wallet-'+run+'a',champion(1),tokenA,now,roomId),joinPracticeArena(db,'qa-wallet-'+run+'b',champion(2),tokenB,now,roomId)]);
  assert.equal(Object.keys((await refs[0].get()).data().state.players).length,2,'concurrent joins preserve both champions');
  await assert.rejects(()=>joinPracticeArena(db,'qa-wallet-'+run+'a',champion(1),crypto.randomBytes(32).toString('hex'),now,roomId),/Please wait/);
  await assert.rejects(()=>joinPracticeArena(db,'qa-wallet-'+run+'a',champion(3),crypto.randomBytes(32).toString('hex'),now+6,roomId),/already has/);
  await assert.rejects(()=>arenaCommand(db,crypto.randomBytes(32).toString('hex'),{},now,roomId),/session expired/);
  // Place fixtures close together through Admin only; public input cannot set position or HP.
  await db.runTransaction(async tx=>{const d=(await tx.get(refs[0])).data();const x=d.state.players[a.playerId],y=d.state.players[b.playerId];Object.assign(x,{x:0,z:0,yaw:0,carry:'Hold'});x.input.yaw=0;Object.assign(y,{x:0,z:1,yaw:Math.PI,hp:1});y.input.yaw=Math.PI;tx.set(refs[0],d);});
  const command={seq:1,x:0,z:0,yaw:0,run:false,action:'attack',hp:9999,damage:9999};
  const first=await arenaCommand(db,tokenA,command,now+.2,roomId);assert(first.state.players[a.playerId].action);
  const replay=await arenaCommand(db,tokenA,command,now+.21,roomId);assert(replay.duplicate);assert.equal(replay.state.players[a.playerId].hp,first.state.players[a.playerId].hp);
  const result=await arenaCommand(db,tokenB,{seq:1,x:0,z:0,yaw:Math.PI,run:false},now+1.5,roomId);
  assert(result.gone);assert(!result.state.players[b.playerId]);assert(result.state.events.some(e=>e.type==='death'&&e.playerId===b.playerId));
  const timings=[];
  for(let i=2;i<=7;i++){const start=Date.now();await arenaCommand(db,tokenA,{seq:i,x:0,z:1,yaw:0,run:true},now+1.5+i*.2,roomId);timings.push(Date.now()-start);}
  // Verify deployed security rules, using an unauthenticated REST read/write.
  const project=db.projectId||'dark-coin-dc4a3',url=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/arenaPrivate/${roomId}`;
  const deniedRead=await fetch(url),deniedWrite=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:{test:{booleanValue:true}}})});
  assert.equal(deniedRead.status,403);assert.equal(deniedWrite.status,403);
  console.log(JSON.stringify({passed:true,checks:['concurrent Firebase joins','signature-free entry throttling','session authentication','command replay deduplication','server hit and death','client HP/damage ignored','server movement','private Firestore read/write rules'],commandLatencyMs:timings},null,2));
 }finally{for(const ref of refs){assert(ref.path.startsWith('arenaPrivate/'));await ref.delete();}await db.terminate();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
