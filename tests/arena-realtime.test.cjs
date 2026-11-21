const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path'),fs=require('fs');
const root=path.resolve(__dirname,'..'),esbuild=require('esbuild');
esbuild.buildSync({stdin:{contents:["export * from './lib/arena/service';","export * from './lib/arena/wire';","export * from './lib/arena/tickets';","export * from './lib/arena/simulation';","export * from './lib/arena/room-store';","export * from './lib/arena/realtime-room';","export * from './components/arena/playground/prediction';","export * from './components/arena/playground/realtime-network';"].join('\n'),resolveDir:root},bundle:true,platform:'node',outfile:path.join(root,'tmp/realtime-tests.cjs')});
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
 const room=s.createRoom(100,1),sender=new s.DeltaSender();room.beast=null;s.syncTrainingDummy(room);const first=sender.packet(s.realtimeSnapshot(room),-1),base=s.applyPacket(first);sender.acknowledge(first.n);
 assert.equal(s.decodeState(base).dummy.hp,1000);room.dummy.hp=900;room.dummy.statuses.burn={id:'burn',potency:1.5,until:105};
 const second=sender.packet(s.realtimeSnapshot(room),-1),next=s.applyPacket(second,base);assert.equal(s.decodeState(next).dummy.hp,900);assert.equal(s.decodeState(next).dummy.statuses[0].potency,1.5);sender.acknowledge(second.n);
 assert(!Object.hasOwn(sender.packet(s.realtimeSnapshot(room),-1),'dummy'));sender.reset();assert.equal(s.decodeState(s.applyPacket(sender.packet(s.realtimeSnapshot(room),-1))).dummy.hp,900);
});

test('chat broadcasts authenticated identity, throttles bursts, restores history, and makes no persistence writes',async()=>{
 const {EventEmitter}=require('events');class Socket extends EventEmitter{constructor(){super();this.readyState=1;this.bufferedAmount=0;this.messages=[];}send(m){this.messages.push(JSON.parse(m));}close(){this.readyState=3;this.emit('close');}}
 let writes=0,owned=false,now=100;
 const store={epoch:1,valid:()=>owned,acquire:async()=>{owned=true;return true;},claim:async()=>{writes++;},checkpoint:async()=>{writes++;},release:async()=>{owned=false;},results:async()=>{}};
 const room=new s.RealtimeRoom({store,secret,wall:()=>now}),a=room.connect(new Socket()),b=room.connect(new Socket());
 await room.authenticate(a,{ticket:s.issueTicket(champion(1),'a',secret,100)});await room.authenticate(b,{ticket:s.issueTicket(champion(2),'b',secret,100)});const before=writes;
 room.message(a,{type:'chat',text:'Ready for Graveclaw?',name:'FORGED',playerId:b.session.id});
 const got=b.socket.messages.find(m=>m.type==='chat').message;assert.equal(got.name,'Fixture 1');assert.equal(got.playerId,a.session.id);assert.equal(got.until,107);
 room.message(a,{type:'chat',text:'<img src=x onerror=alert(1)>'});room.message(a,{type:'chat',text:'Third'});room.message(a,{type:'chat',text:'Fourth'});assert(a.socket.messages.some(m=>m.type==='chatError'));assert.equal(room.chat.messages.length,3);
 const token=a.socket.messages.find(m=>m.type==='welcome').resume;a.socket.close();const resumed=room.connect(new Socket());await room.authenticate(resumed,{resume:token});assert.equal(resumed.socket.messages.find(m=>m.type==='chatHistory').messages.length,3);
 now+=2;room.message(resumed,{type:'chat',text:'x'.repeat(999)});assert.equal(room.chat.messages.at(-1).text.length,180);
 for(let i=0;i<70;i++){now+=2;resumed.rateAt=room.clock();resumed.count=0;room.message(resumed,{type:'chat',text:'message '+i});}assert.equal(room.chat.messages.length,60);assert.equal(writes,before);assert.equal(Object.keys(room.state.encounter?.contributions||{}).length,0);
 delete room.state.players[resumed.session.id];room.message(resumed,{type:'chat',text:'after death'});assert.notEqual(room.chat.messages.at(-1).text,'after death');
});

test('active encounter rejects a new champion but permits an existing session to resume',async()=>{
 const {EventEmitter}=require('events');class Socket extends EventEmitter{constructor(){super();this.readyState=1;this.bufferedAmount=0;this.messages=[];}send(m){this.messages.push(JSON.parse(m));}close(){this.readyState=3;this.emit('close');}}
 let claims=0;const store={valid:()=>true,epoch:1,claim:async()=>claims++};
 const room=new s.RealtimeRoom({store,secret,wall:()=>100});room.state=s.createRoom(100,1);const p=s.addPlayer(room.state,'1',champion(1));room.state.encounter={id:1,status:'active'};
 const token='b'.repeat(64),session={id:'1',expires:200,hash:s.hashToken(token)};room.sessions.set(session.hash,session);
 const fresh=new Socket();await room.authenticate(room.connect(fresh),{ticket:s.issueTicket(champion(2),'wallet2',secret,100)});
 assert(fresh.messages.some(m=>m.type==='fatal'&&m.message.includes('Entry reopens')));assert.equal(claims,0);
 const resumed=new Socket();await room.authenticate(room.connect(resumed),{resume:token});assert(resumed.messages.some(m=>m.type==='welcome'));assert(p.connected);
 room.state.encounter.status='returning';const late=new Socket();await room.authenticate(room.connect(late),{ticket:s.issueTicket(champion(3),'wallet3',secret,100)});assert(late.messages.some(m=>m.type==='fatal'));assert.equal(claims,0);
});

test('one wallet controls different champions independently; concurrent duplicate NFT admission is rejected',async()=>{
 const {EventEmitter}=require('events');class Socket extends EventEmitter{constructor(){super();this.readyState=1;this.bufferedAmount=0;this.messages=[];}send(m){this.messages.push(JSON.parse(m));}close(){if(this.readyState===3)return;this.readyState=3;this.emit('close');}}
 let claims=0;const store={valid:()=>true,epoch:1,claim:async()=>{claims++;await new Promise(r=>setImmediate(r));}};
 const room=new s.RealtimeRoom({store,secret,wall:()=>100});room.state=s.createRoom(100,1);
 const sockets=[new Socket(),new Socket(),new Socket()],connections=sockets.map(v=>room.connect(v));
 await Promise.all(connections.map((c,i)=>room.authenticate(c,{ticket:s.issueTicket(champion(i===1?2:1),'same-wallet',secret,100)})));
 assert(connections[0].authenticated);assert(connections[1].authenticated);assert(!connections[2].authenticated);assert.equal(claims,2);assert.equal(Object.keys(room.state.players).length,2);
 assert(sockets[2].messages.some(m=>m.type==='fatal'&&m.message.includes('champion NFT')));
 assert.notEqual(connections[0].session.hash,connections[1].session.hash);
 room.message(connections[0],{type:'input',input:{seq:1,x:1,z:0,yaw:0}});room.message(connections[1],{type:'input',input:{seq:1,x:-1,z:0,yaw:1}});
 assert.equal(room.state.players[connections[0].session.id].input.x,1);assert.equal(room.state.players[connections[1].session.id].input.x,-1);
 const token=sockets[0].messages.find(m=>m.type==='welcome').resume;const resumedSocket=new Socket(),resumed=room.connect(resumedSocket);await room.authenticate(resumed,{resume:token});assert(resumed.authenticated);assert.equal(sockets[0].readyState,3);assert.equal(sockets[1].readyState,1);
 room.message(resumed,{type:'leave'});assert.equal(Object.keys(room.state.players).length,1);assert(room.state.players[connections[1].session.id]);
 const next=new Socket(),reenter=room.connect(next);await room.authenticate(reenter,{ticket:s.issueTicket(champion(1),'same-wallet',secret,100)});assert(reenter.authenticated);
 const duplicateOtherWallet=new Socket();await room.authenticate(room.connect(duplicateOtherWallet),{ticket:s.issueTicket(champion(1),'another-wallet',secret,100)});assert(duplicateOtherWallet.messages.some(m=>m.type==='fatal'&&m.message.includes('champion NFT')));
});

test('practice admission also permits different NFTs from one wallet but rejects a duplicate',async()=>{
 const db=database();const a=await s.joinPracticeArena(db,'wallet',champion(1),'a'.repeat(64),100);
 const b=await s.joinPracticeArena(db,'wallet',champion(2),'b'.repeat(64),100);
 assert.notEqual(a.playerId,b.playerId);assert.equal(Object.keys(b.state.players).length,2);
 await assert.rejects(s.joinPracticeArena(db,'different-wallet',champion(1),'c'.repeat(64),100),/champion NFT is already/);
});

test('reconnect grace preserves preparation through schedule refresh, lease renewal and another admission; departure cancels it',async()=>{
 const {EventEmitter}=require('events');class Socket extends EventEmitter{constructor(){super();this.readyState=1;this.bufferedAmount=0;this.messages=[];}send(m){this.messages.push(JSON.parse(m));}close(){if(this.readyState===3)return;this.readyState=3;this.emit('close');}}
 let now=100,clock=0,owned=false,saved={id:1,kind:'graveclaw',status:'waiting',name:'Graveclaw',nextSpawnAt:null,participants:{}},calls=[],renewed=[];
 const store={epoch:1,valid:()=>owned,acquire:async()=>{owned=true;return true;},renew:async count=>{renewed.push(count);return true;},claim:async()=>{},checkpoint:async()=>calls.push('checkpoint'),results:async()=>{},release:async()=>{calls.push('release');owned=false;},currentEncounter:async(time,options)=>{calls.push({...options});if(!options.playerCount)saved={...saved,nextSpawnAt:null,countdownStartedAt:null};else if(options.firstArrival)saved={...saved,nextSpawnAt:time+300,countdownStartedAt:time};return structuredClone(saved);}};
 const room=new s.RealtimeRoom({store,secret,clock:()=>clock,wall:()=>now,economy:{enabled:true}}),a=new Socket(),ca=room.connect(a);
 await room.authenticate(ca,{ticket:s.issueTicket(champion(1),'wallet',secret,now,undefined,true)});
 assert(ca.authenticated,JSON.stringify(a.messages));assert.equal(room.state.encounter.nextSpawnAt,400);
 const token=a.messages.find(m=>m.type==='welcome').resume;now=102;clock=2000;
 const transfer=new Socket(),ct=room.connect(transfer);await room.authenticate(ct,{resume:token});assert(ct.authenticated);assert.equal(room.state.encounter.nextSpawnAt,400,'a live connection transfer must not reset preparation');transfer.close();now=120;
 now=106;clock=6000;await room.syncEncounter();room.tick();await new Promise(r=>setImmediate(r));
 assert.equal(saved.nextSpawnAt,400,'schedule refresh must keep the deadline while a champion can resume');assert.deepEqual(renewed,[1],'the public lease must retain grace occupancy');assert.equal(room.state.players[ca.session.id].connected,false);
 now=108;clock=8000;const b=new Socket(),cb=room.connect(b);await room.authenticate(cb,{resume:token});assert(cb.authenticated);assert.equal(room.state.encounter.nextSpawnAt,400,'resuming a dropped socket must not restart preparation');assert.equal(room.state.encounter.countdownStartedAt,100);
 b.close();now=109;clock=9000;const peer=new Socket(),cp=room.connect(peer);await room.authenticate(cp,{ticket:s.issueTicket(champion(2),'other-wallet',secret,now,undefined,true)});assert(cp.authenticated);assert.equal(room.state.encounter.nextSpawnAt,400,'a new arrival during another champion’s reconnect grace must not extend preparation');
 const resumed=new Socket(),cr=room.connect(resumed);await room.authenticate(cr,{resume:token});room.message(cr,{type:'leave'});room.message(cp,{type:'leave'});calls=[];await room.drain('Arena empty',true);
 assert.deepEqual(calls,['checkpoint',{playerCount:0},'release']);assert.equal(saved.nextSpawnAt,null);assert.equal(room.draining,false);
 now=200;const c=new Socket(),cc=room.connect(c);await room.authenticate(cc,{ticket:s.issueTicket(champion(1),'wallet',secret,now,undefined,true)});
 assert(cc.authenticated,JSON.stringify(c.messages));assert.equal(room.state.encounter.nextSpawnAt,500);
 await room.drain();
});

test('an expired reconnect grace empties preparation and rejects the old session',async()=>{
 const {EventEmitter}=require('events');class Socket extends EventEmitter{constructor(){super();this.readyState=1;this.bufferedAmount=0;this.messages=[];}send(m){this.messages.push(JSON.parse(m));}close(){if(this.readyState===3)return;this.readyState=3;this.emit('close');}}
 let clock=0,owned=false,cleared=false;
 const store={epoch:1,valid:()=>owned,acquire:async()=>{owned=true;return true;},renew:async()=>true,claim:async()=>{},checkpoint:async()=>{},results:async()=>{},release:async()=>{owned=false;},currentEncounter:async(now,options)=>{if(!options.playerCount)cleared=true;return {id:1,kind:'graveclaw',name:'Graveclaw',status:'waiting',nextSpawnAt:options.playerCount?220:null,participants:{}};}};
 const room=new s.RealtimeRoom({store,secret,clock:()=>clock,wall:()=>100+clock/1000,economy:{enabled:true}}),socket=new Socket(),c=room.connect(socket);
 await room.authenticate(c,{ticket:s.issueTicket(champion(1),'wallet',secret,100,undefined,true)});const token=socket.messages.find(m=>m.type==='welcome').resume;cleared=false;socket.close();
 for(let i=1;i<=375;i++){clock=i*1000/30;room.tick();await new Promise(r=>setImmediate(r));}
 assert.equal(room.state,null);assert.equal(room.sessions.size,0);assert(cleared,'grace expiration must persist countdown cancellation');assert.equal(owned,false);
 const stale=new Socket();await room.authenticate(room.connect(stale),{resume:token});assert(stale.messages.some(m=>m.type==='fatal'));
});

test('authentication waits for queued persistence while silent and stalled sockets remain bounded',async()=>{
 const {EventEmitter}=require('events');class Socket extends EventEmitter{constructor(){super();this.readyState=1;this.bufferedAmount=0;this.messages=[];}send(m){this.messages.push(JSON.parse(m));}close(){if(this.readyState===3)return;this.readyState=3;this.emit('close');}}
 let clock=0,resolveClaim;
 const store={epoch:1,valid:()=>true,claim:()=>new Promise(r=>resolveClaim=r)};
 const room=new s.RealtimeRoom({store,secret,clock:()=>clock,wall:()=>100});room.state=s.createRoom(100,1);room.lastRenew=100000;room.lastCheckpoint=100000;
 const socket=new Socket(),c=room.connect(socket),silent=new Socket();room.connect(silent);
 const admission=room.authenticate(c,{ticket:s.issueTicket(champion(1),'wallet',secret,100)});await new Promise(r=>setImmediate(r));clock=6000;room.tick();assert.equal(socket.readyState,1,'a persistence-backed admission must survive the five-second hello timeout');assert.equal(silent.readyState,3);
 resolveClaim();await admission;assert(c.authenticated);assert(socket.messages.some(m=>m.type==='welcome'));
 const stalled=new Socket(),cs=room.connect(stalled),pending=room.authenticate(cs,{ticket:s.issueTicket(champion(2),'wallet2',secret,100)});await new Promise(r=>setImmediate(r));clock=22000;room.tick();assert.equal(stalled.readyState,3,'stalled authentication remains bounded');resolveClaim();await pending;
});
