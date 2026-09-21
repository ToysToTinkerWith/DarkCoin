// Isolated real-Firestore ownership/failover test; never touches the public room.
const assert=require('node:assert/strict'),crypto=require('crypto'),path=require('path');
require('../tmp/champion-model-tools/node_modules/esbuild').buildSync({stdin:{contents:"export * from './lib/arena/room-store';export * from './lib/arena/firebaseServer';",resolveDir:path.resolve(__dirname,'..')},bundle:true,platform:'node',external:['firebase-admin'],outfile:path.resolve(__dirname,'../tmp/realtime-store-test.cjs')});
const {FirestoreRoomStore,arenaDatabase}=require('../tmp/realtime-store-test.cjs');
(async()=>{
 const db=arenaDatabase(),roomId='qa-realtime-'+crypto.randomBytes(10).toString('hex'),a=new FirestoreRoomStore(db,{roomId,owner:'fixture-a'}),b=new FirestoreRoomStore(db,{roomId,owner:'fixture-b'});
 const refs=['-lease','-control','-checkpoint'].map(s=>db.collection('arenaPrivate').doc(roomId+s));
 try{
  const results=await Promise.all([a.acquire(),b.acquire()]);assert.equal(results.filter(Boolean).length,1);
  const first=results[0]?a:b,second=results[0]?b:a;assert(await first.renew());await first.checkpoint({players:{}},'private-test');
  // Simulate a expired ownership record with no active game clients in this fixture.
  await refs[0].update({expiresAt:0});assert(await second.acquire());assert(second.epoch>first.epoch);
  await assert.rejects(first.checkpoint({stale:true}),/ownership expired/);await first.release();assert(await second.renew(),'stale release cannot invalidate the new owner');
  await refs[1].set({mode:'websocket',drain:true});assert.equal(await second.renew(),false);await second.release();
  console.log('PASS real Firestore: concurrent workers have one owner, epoch takeover fences stale writes/releases, drain stops renewals.');
 }finally{for(const ref of refs){assert(ref.id.startsWith(roomId));await ref.delete();}await db.terminate();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
