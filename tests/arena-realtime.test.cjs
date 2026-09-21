const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path'),fs=require('fs');
const root=path.resolve(__dirname,'..'),esbuild=require('../tmp/champion-model-tools/node_modules/esbuild');
esbuild.buildSync({stdin:{contents:["export * from './lib/arena/wire';","export * from './lib/arena/tickets';","export * from './lib/arena/simulation';","export * from './lib/arena/room-store';","export * from './lib/arena/realtime-room';","export * from './components/arena/playground/prediction';","export * from './components/arena/playground/realtime-network';"].join('\n'),resolveDir:root},bundle:true,platform:'node',outfile:path.join(root,'tmp/realtime-tests.cjs')});
const s=require('../tmp/realtime-tests.cjs'),secret='realtime-test-only-'.repeat(3);
const champion=id=>({id,name:'Fixture '+id,loadout:{skin:'Undead',head:'bone',armour:'leather_garb',weapon:'dual_katana',magic:'fire_magic',extra:null}});
function database(){let now=100000,tail=Promise.resolve();const data=new Map();return {data,advance:ms=>now+=ms,collection:()=>({doc:id=>({id})}),runTransaction(fn){const run=async()=>{const writes=[];const result=await fn({get:async ref=>({exists:data.has(ref.id),data:()=>data.get(ref.id),readTime:{toMillis:()=>now}}),set:(ref,v)=>writes.push([ref.id,v]),create:(ref,v)=>{assert(!data.has(ref.id));writes.push([ref.id,v]);}});for(const [k,v] of writes)data.set(k,v);return result;};const promise=tail.then(run);tail=promise.catch(()=>{});return promise;}};}
test('tickets reject forgery, expiration and wrong signatures',()=>{
 const ticket=s.issueTicket(champion(1),'wallet',secret,100);assert.equal(s.verifyTicket(ticket,secret,110).champion.id,1);
 assert.throws(()=>s.verifyTicket(ticket,secret,161));assert.throws(()=>s.verifyTicket(ticket,secret+'different',110));assert.throws(()=>s.verifyTicket('bad',secret,110));
});
test('room ownership fences overlapping workers, replayed tickets and stale writes',async()=>{
 const db=database();let clock=0;const a=new s.FirestoreRoomStore(db,{owner:'a',clock:()=>clock}),b=new s.FirestoreRoomStore(db,{owner:'b',clock:()=>clock});
 assert(await a.acquire());assert.equal(await b.acquire(),false);const claims=s.verifyTicket(s.issueTicket(champion(1),'w',secret,100),secret,100);
 await a.claim(claims,'1');await assert.rejects(a.claim(claims,'2'),/already used/);
 clock=16000;assert(!a.valid());await assert.rejects(a.checkpoint({}),/expired/);
 db.advance(21000);assert(await b.acquire());assert(b.epoch>a.epoch);await a.release();assert(b.valid());assert(await b.renew());await b.checkpoint({players:{}});
 db.data.set('playground-realtime-v1-control',{drain:true});assert.equal(await b.renew(),false);
});
test('acknowledged deltas reconstruct state, removals, cancelled actions and recovery keyframes',()=>{
 const room=s.createRoom(100,1);s.addPlayer(room,'1',champion(1));s.addPlayer(room,'2',champion(2));const sender=new s.DeltaSender();
 const first=sender.packet(s.realtimeSnapshot(room),-1),base=s.applyPacket(first);sender.acknowledge(first.n);
 s.applyInput(room,'1',{seq:1,x:1,z:0,yaw:1,run:true});s.advance(room,100.1);
 const next=sender.packet(s.realtimeSnapshot(room),1);assert.equal(Object.keys(next.j).length,0);assert(!JSON.stringify(next).includes('loadout'));
 let decoded=s.decodeState(s.applyPacket(next,base));assert(Math.abs(decoded.players['1'].x-room.players['1'].x)<.011);
 // An unacknowledged packet cannot become the next baseline.
 const third=sender.packet(s.realtimeSnapshot(room),1);assert.equal(third.b,first.n);
 sender.acknowledge(next.n);const secondBase=s.applyPacket(next,base);s.removePlayer(room,'2');const left=sender.packet(s.realtimeSnapshot(room),1);assert(!s.decodeState(s.applyPacket(left,secondBase)).players['2']);
 sender.reset();const recovery=sender.packet(s.realtimeSnapshot(room),1);assert.equal(recovery.b,0);assert.equal(s.decodeState(s.applyPacket(recovery)).players['1'].champion.id,1);
 assert.throws(()=>s.applyPacket(next),/baseline/);
});
test('input processing does not tick, duplicate actions do not consume RNG twice',()=>{
 const room=s.createRoom(100,12);const p=s.addPlayer(room,'1',champion(1));p.carry='Hold';
 const input={seq:1,x:0,z:1,yaw:0,run:false,action:'attack'};
 s.applyInput(room,'1',input);const serial=room.serial,rng=room.rng;s.applyInput(room,'1',input);assert.equal(room.serial,serial);assert.equal(room.rng,rng);assert.equal(room.time,100);s.advance(room,100.1);assert(room.players['1'].z>10);
});
test('prediction responds immediately and reconciles; remote interpolation uses two states',()=>{
 const room=s.createRoom(100,2);s.addPlayer(room,'1',champion(1));const initial=s.realtimeSnapshot(room),p=initial.players['1'],prediction=new s.MovementPrediction();
 prediction.reconcile({...p,time:100},1,0);const moved=prediction.step({x:1,z:0,yaw:0,run:false},.016,1.016,100.016);assert(moved.x>p.x);
 prediction.reconcile({...p,time:100.02},1.02,0);assert(prediction.correction<.1);
 const remote=new s.RemoteInterpolation();remote.add(initial);remote.add({...initial,time:100.1,players:{'1':{...p,x:1}}});assert.equal(remote.sample('1',100.05).x,.5);
});
test('worker rejects unauthenticated packets without touching persistence',async()=>{
 const {EventEmitter}=require('events');class Socket extends EventEmitter{constructor(){super();this.readyState=1;this.bufferedAmount=0;this.messages=[];}send(m){this.messages.push(JSON.parse(m));}close(){this.readyState=3;this.emit('close');}}
 let reads=0;const room=new s.RealtimeRoom({store:{valid:()=>false,acquire:()=>{reads++;}},secret});const socket=new Socket();const c=room.connect(socket);await room.authenticate(c,{ticket:'forged'});assert.equal(reads,0);assert.equal(socket.messages[0].type,'fatal');
});
test('slow admission cannot be drained as an empty room; movement does not persist',async()=>{
 const {EventEmitter}=require('events');class Socket extends EventEmitter{constructor(){super();this.readyState=1;this.bufferedAmount=0;this.messages=[];}send(m){this.messages.push(JSON.parse(m));}close(){this.readyState=3;this.emit('close');}}
 let clock=1000,owned=false,releaseClaim,writes=0;
 const store={epoch:1,writes:0,valid:()=>owned,acquire:async()=>{owned=true;return true;},claim:()=>new Promise(r=>releaseClaim=r),checkpoint:async()=>{writes++;},results:async()=>{},release:async()=>{owned=false;}};
 const room=new s.RealtimeRoom({store,secret,clock:()=>clock,wall:()=>100}),socket=new Socket(),c=room.connect(socket);
 const admission=room.authenticate(c,{ticket:s.issueTicket(champion(1),'w',secret,100)});await new Promise(r=>setImmediate(r));
 room.tick();assert(!room.draining);assert.equal(room.admissionsPending,1);releaseClaim();await admission;assert(c.authenticated);
 room.requestCheckpoint=false;room.lastCheckpoint=clock;room.lastRenew=clock;
 for(let i=1;i<=30;i++){clock+=33;room.message(c,{type:'input',input:{seq:i,x:1,z:0,yaw:0,run:true}});room.tick();}
 assert.equal(writes,0);assert(room.state.players[c.session.id].x>0);
 owned=false;room.message(c,{type:'input',input:{seq:31,x:1,z:0,yaw:0,run:true}});assert.equal(room.state.players[c.session.id].lastSeq,30);
  await room.drain();assert.equal(room.lastResult,0,'new rounds must persist their own low-numbered result events');assert.equal(room.accumulator,0);
});
test('backpressure is bounded and slow sockets close instead of queuing transforms',()=>{
 let clock=1000,closed=false;const room=new s.RealtimeRoom({store:{},secret,clock:()=>clock}),c={socket:{readyState:1,bufferedAmount:100000,close(){closed=true;}},delta:new s.DeltaSender()};
 room.send(c,{type:'state'});assert.equal(c.delta.ack,0);clock=5001;room.send(c,{type:'state'});assert(closed);assert.equal(room.metrics.bytesOut,0);
});
test('an established session gets a fresh reconnect window even after a long play session',()=>{
 const Native=global.WebSocket;global.WebSocket=class{constructor(){this.readyState=0;}close(){}};
 const notices=[],client=new s.WebSocketConnection({url:'ws://fixture',expiresAt:Date.now()/1000+60},()=>{},(message,fatal)=>notices.push({message,fatal}));
 try{client.started=performance.now()-60000;client.resume='a'.repeat(64);client.connect();client.socket.onclose({code:4000});assert(!client.closed);assert(client.retry);assert(!notices.some(n=>n.fatal));}
 finally{client.close(false);global.WebSocket=Native;}
});

test('development rooms have independent ownership and reject production admission tickets',async()=>{
 const db=database(),prod=new s.FirestoreRoomStore(db),dev=new s.FirestoreRoomStore(db,{roomId:'playground-dev-v1'});
 assert(await prod.acquire());assert(await dev.acquire());
 const ticket=s.issueTicket(champion(1),'wallet',secret,100,'playground-dev-v1');
 assert.equal(s.verifyTicket(ticket,secret,101,'playground-dev-v1').room,'playground-dev-v1');
 assert.throws(()=>s.verifyTicket(ticket,secret,101));
 assert.throws(()=>s.verifyTicket(s.issueTicket(champion(1),'wallet',secret,100),secret,101,'playground-dev-v1'));
 await dev.release();assert(await prod.renew());
});

test('dummy health and effects use acknowledged deltas and recover on resync',()=>{
 const room=s.createRoom(100,1),sender=new s.DeltaSender();const first=sender.packet(s.realtimeSnapshot(room),-1),base=s.applyPacket(first);sender.acknowledge(first.n);
 assert.equal(s.decodeState(base).dummy.hp,1000);room.dummy.hp=900;room.dummy.statuses.burn={id:'burn',potency:1.5,until:105};
 const second=sender.packet(s.realtimeSnapshot(room),-1),next=s.applyPacket(second,base);assert.equal(s.decodeState(next).dummy.hp,900);assert.equal(s.decodeState(next).dummy.statuses[0].potency,1.5);sender.acknowledge(second.n);
 assert(!Object.hasOwn(sender.packet(s.realtimeSnapshot(room),-1),'dummy'));sender.reset();assert.equal(s.decodeState(s.applyPacket(sender.packet(s.realtimeSnapshot(room),-1))).dummy.hp,900);
});
