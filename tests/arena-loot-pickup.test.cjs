const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),algo=require('algosdk');
const root=path.resolve(__dirname,'..');
require('esbuild').buildSync({stdin:{contents:['loot-drops','reward-delivery','reward-publisher','treasury','simulation','room-store','realtime-room','encounters'].map(n=>`export * from './lib/arena/${n}';`).join('\n'),resolveDir:root},bundle:true,platform:'node',external:['algosdk'],outfile:path.join(root,'tmp/arena-pickup-tests.cjs')});
const s={...require('../tmp/arena-pickup-tests.cjs')},wallet=algo.generateAccount(),other=algo.generateAccount().addr.toString(),address=wallet.addr.toString(),config={enabled:true,appId:123};
function database(){const data=new Map();let queue=Promise.resolve();const ref=id=>({id,get:async()=>doc(id)}),doc=id=>({id,ref:ref(id),exists:data.has(id),data:()=>data.get(id),readTime:{toMillis:()=>100000}});
 const collection={doc:ref,where:(key,op,value)=>{let limit=Infinity;const q={orderBy:()=>q,limit:n=>(limit=n,q),get:async()=>({docs:[...data.keys()].sort().filter(id=>data.get(id)[key]===value).slice(0,limit).map(doc)})};return q;}};
 return {data,collection:name=>name==='arenaPrivate'?collection:{...collection,doc:id=>ref(name+'/'+id)},runTransaction(fn){const run=queue.then(async()=>{const writes=[];const result=await fn({get:async r=>doc(r.id),set:(r,v)=>writes.push([r.id,v]),create:(r,v)=>{assert(!data.has(r.id));writes.push([r.id,v]);},update:(r,v)=>writes.push([r.id,{...data.get(r.id),...v}])});for(const [k,v]of writes)data.set(k,v);return result;});queue=run.catch(()=>{});return run;}};
}
const row=()=>({appId:123,hour:100,lootVersion:2,rewardWallet:address,drop:{x:2,z:3},claim:{slot:0,address,assetId:42,rewardAssetId:500,amount:'1230000',decimals:6,name:'Token',image:'/coin.png',proof:Array(6).fill('00'.repeat(32))}});
const player=()=>({hp:100,connected:true,rewardAddress:address,champion:{id:42},x:2,z:3});
const id='loot-reward-123-100-0';
const legacyPublisher=s.processArenaRewards;s.processArenaRewards=(db,c,deps={})=>legacyPublisher(db,c,{direct:false,...deps});
test('pickup is personal, proximity checked, alive, and once only',()=>{
 assert(s.canPickUp(player(),row(),100));
 for(const change of [{hp:0},{connected:false},{rewardAddress:other},{champion:{id:43}},{x:9},{x:NaN}])assert(!s.canPickUp({...player(),...change},row(),100));
 assert(!s.canPickUp(player(),row(),101));assert(!s.canPickUp(player(),{...row(),pickedUpAt:1},100));
 assert.equal(s.formatLootAmount('18446744073709551615',6),'18446744073709.551615');
 assert(Math.hypot(...Object.values(s.dropPosition({beast:{x:18,z:18}},2)))<=17.00001);
 const visible=s.visibleDrop(id,row());assert.equal(visible.image,'/coin.png');assert(!JSON.stringify(visible).includes(address));assert(!('proof' in visible));
});
test('defeat -> durable roll -> personal drop -> pickup -> saved claim survives retries',async()=>{
 const db=database(),store=new s.FirestoreRoomStore(db,{economy:config,clock:()=>0});await store.acquire();const hour=s.hourlyEncounter(100);await store.encounter(hour);
 const room=s.createRoom(100,1);s.activateEncounter(room,hour);const p=s.addPlayer(room,'p',{id:42,name:'Champion',loadout:{skin:'Undead',weapon:'dark_sword'}});p.rewardAddress=address;p.connected=true;p.hp=100;
 room.beast.emergeUntil=0;room.beast.mode='patrol';room.beast.hp=1;s.applyStatus(room,p,room.beast,'bleed',4,'weapon');for(let i=0;i<60&&room.beast.hp>0;i++)s.advance(room,room.time+1/30);
 assert.equal(room.encounter.status,'defeated');await store.checkpoint(room);
 let publications=0;await s.processArenaRewards(db,config,{inventory:async()=>[{rewardAssetId:500,available:'1000000000',kind:'token',capBps:10000,capAtomic:'0',name:'Token',image:'/coin.png',decimals:6}],randomSeed:()=> 'a'.repeat(64),publish:async r=>{publications++;return s.rewardTree(123,r.id,r.shares);}});
 const drops=await store.lootDrops(hour.id);assert.equal(drops.length,1);const drop=drops[0];assert.equal(drop.claim.image,'/coin.png');
 p.x=drop.drop.x;p.z=drop.drop.z;
 const outcomes=await Promise.allSettled([store.pickup(drop.id,p,hour.id),store.pickup(drop.id,p,hour.id)]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(db.data.get(drop.id).deliveryQueue,'pickup-123');const proof=JSON.stringify(db.data.get(drop.id).claim);
 await s.processArenaPickup(db,drop.id,config,{deliver:async()=>({status:'saved',reason:'opt_in_required'})});
 assert.equal(db.data.get(drop.id).deliveryStatus,'saved');assert.equal(db.data.get(drop.id).deliveryQueue,null);assert.equal(JSON.stringify(db.data.get(drop.id).claim),proof);
 await s.processArenaRewards(db,config,{inventory:async()=>{throw Error('Must not reroll');}});assert.equal(publications,1);
});
test('live room sends each player only their own drop and avoids unchanged packets',async()=>{
 const r=row(),messages=[],connection={authenticated:true,session:{id:'p'},socket:{readyState:1,bufferedAmount:0,send:m=>messages.push(JSON.parse(m))}};
 const room=new s.RealtimeRoom({store:{valid:()=>true,lootDrops:async()=>[{id,...r},{id:'other',...r,rewardWallet:other}]},economy:config});room.state={encounter:{id:100},players:{p:player()}};room.connections.add(connection);
 await room.pollLoot();await room.pollLoot();assert.equal(messages.length,1);assert.equal(messages[0].drops.length,1);assert.equal(messages[0].drops[0].id,id);
});
function client({claimed=false,missing=false,frozen=false,round=100}={}){const box=Buffer.alloc(40);box.writeBigUInt64BE(claimed?257n:256n,32);return {getApplicationBoxByName:()=>({do:async()=>({value:box})}),status:()=>({do:async()=>({lastRound:round})}),accountAssetInformation:()=>({do:async()=>{if(missing)throw Object.assign(Error('not opted in'),{status:404});return {assetHolding:{isFrozen:frozen}};}})};}
test('no opt-in or frozen holding saves reward; on-chain claim and uncertain tx never send twice',async()=>{
 for(const [opts,result]of [[{missing:true},{status:'saved',reason:'opt_in_required'}],[{frozen:true},{status:'saved',reason:'asset_frozen'}],[{claimed:true},{status:'delivered',txid:null}]])assert.deepEqual(await s.deliverPickup({...row(),pickedUpAt:1},config,{client:client(opts)}),result);
 assert.deepEqual(await s.deliverPickup({...row(),pickedUpAt:1,deliveryTxid:'pending',deliveryLastValid:'110'},config,{client:client()}),{status:'pending',txid:'pending'});
});
test('sponsored payment preserves recipient/proof/amount, oracle pays, persists before broadcast',async()=>{
 const r={...row(),pickedUpAt:1},calls=[],c=client();c.getTransactionParams=()=>({do:async()=>({firstValid:100,lastValid:1100,genesisHash:new Uint8Array(32),genesisID:'mainnet-v1.0'})});
 c.simulateTransactions=req=>({do:async()=>{const t=req.txnGroups[0].txns[1].txn;assert.equal(Buffer.from(t.applicationCall.appArgs[0]).toString(),'claim_for');assert.equal(t.applicationCall.accounts[0].toString(),address);assert.equal(t.fee,2000n);assert.equal(t.lastValid,140n);return {txnGroups:[{}]};}});
 c.sendRawTransaction=()=>({do:async()=>{assert.deepEqual(calls,['persisted']);calls.push('broadcast');throw Error('ambiguous timeout');}});
 await assert.rejects(s.deliverPickup(r,config,{client:c,mnemonic:algo.secretKeyToMnemonic(wallet.sk),beforeSubmit:async fields=>{assert.equal(fields.deliveryLastValid,'140');assert(fields.deliveryTxid);calls.push('persisted');}}),/ambiguous/);assert.deepEqual(calls,['persisted','broadcast']);
});
test('delivery lease excludes concurrent attempts; timeout retains transaction for reconciliation',async()=>{
 const db=database();db.data.set(id,{...row(),pickedUpAt:1,deliveryQueue:'pickup-123'});let release,start;
 const wait=new Promise(r=>release=r),begun=new Promise(r=>start=r);let calls=0;
 const task=s.processArenaPickup(db,id,config,{deliver:async(r,c,{beforeSubmit})=>{calls++;await beforeSubmit({deliveryTxid:'tx',deliveryLastValid:'140'});start();await wait;throw Error('timeout');}});
 await begun;await s.processArenaPickup(db,id,config,{deliver:async()=>{calls++;}});release();await assert.rejects(task,/timeout/);assert.equal(calls,1);
 assert.equal(db.data.get(id).deliveryTxid,'tx');assert.equal(db.data.get(id).deliveryQueue,'pickup-123');
 await s.processArenaPickup(db,id,config,{deliver:async r=>{assert.equal(r.deliveryTxid,'tx');return {status:'delivered',txid:'tx'};}});assert.equal(db.data.get(id).deliveryQueue,null);assert.equal(db.data.get(id).deliveryStatus,'delivered');
});

test('no payment or saved authorization is possible before server-confirmed pickup',async()=>{
 await assert.rejects(s.deliverPickup(row(),config,{client:{}}),/not been picked up/);
 const db=database();db.data.set(id,{...row(),deliveryQueue:'pickup-123'});let calls=0;
 await s.processArenaPickup(db,id,config,{deliver:async()=>{calls++;}});assert.equal(calls,0);
});
test('saved pickup persists authorization before broadcasting and reconciles uncertain confirmation',async()=>{
 const r={...row(),pickedUpAt:1},calls=[],c=client({missing:true});c.getApplicationBoxByName=()=>({do:async()=>({value:Buffer.alloc(40)})});
 c.getTransactionParams=()=>({do:async()=>({firstValid:100,lastValid:1100,genesisHash:new Uint8Array(32),genesisID:'mainnet-v1.0'})});
 c.simulateTransactions=req=>({do:async()=>{const txn=req.txnGroups[0].txns[0].txn;assert.equal(Buffer.from(txn.applicationCall.appArgs[0]).toString(),'pickup');assert.equal(txn.fee,1000n);assert.equal(txn.applicationCall.appArgs.length,3);return {txnGroups:[{}]};}});
 c.sendRawTransaction=()=>({do:async()=>{assert.equal(calls[0],'persisted');calls.push('sent');throw Error('uncertain authorization');}});
 await assert.rejects(s.deliverPickup(r,config,{client:c,mnemonic:algo.secretKeyToMnemonic(wallet.sk),beforeSubmit:async fields=>{assert(fields.pickupTxid);assert.equal(fields.pickupLastValid,'140');calls.push('persisted');}}),/uncertain/);
 assert.deepEqual(calls,['persisted','sent']);
 const pending=await s.deliverPickup({...r,pickupTxid:'existing',pickupLastValid:'140'},config,{client:c});assert.equal(pending.status,'pending');assert.deepEqual(calls,['persisted','sent']);
});

test('loot subscription pushes private drops immediately and unsubscribes on drain',async()=>{
 let callback,stops=0,watchCount=0;const messages=[],r=row();
 const store={valid:()=>true,watchLootDrops:(hour,cb)=>{assert.equal(hour,100);watchCount++;callback=cb;return()=>stops++;},checkpoint:async()=>{},results:async()=>{},release:async()=>{}};
 const room=new s.RealtimeRoom({store,economy:config});room.state={encounter:{id:100,status:'defeated'},players:{p:player()}};
 room.connections.add({authenticated:true,session:{id:'p'},socket:{readyState:1,bufferedAmount:0,send:m=>messages.push(JSON.parse(m)),close:()=>{}}});
 room.watchLoot();room.watchLoot();assert.equal(watchCount,1);callback([{id,...r},{id:'other',...r,rewardWallet:other}]);assert.equal(messages.length,1);assert.equal(messages[0].drops.length,1);
 await room.drain();assert.equal(stops,1);callback([{id,...r}]);assert.equal(messages.length,2,'late callbacks after drain must not send loot');
});

test('new defeats bypass checkpoint debounce, but failed writes retain retry throttling',async()=>{
 let clock=1000,calls=0;const store={valid:()=>true,checkpoint:async()=>{calls++;throw Error('temporary failure');},results:async()=>{}};
 const room=new s.RealtimeRoom({store,economy:config,clock:()=>clock,wall:()=>100});room.state=s.createRoom(100,1);s.activateEncounter(room.state,{...s.hourlyEncounter(100),status:'defeated'});s.addPlayer(room.state,'p',{id:42,loadout:{skin:'Undead',weapon:'dark_sword'}});room.lastCheckpoint=999;
 room.tick();await new Promise(setImmediate);assert.equal(calls,1,'first defeat must not wait two seconds');clock=1001;room.tick();await new Promise(setImmediate);assert.equal(calls,1,'failure must not retry every frame');
});
