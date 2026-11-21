const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
require('esbuild').buildSync({stdin:{contents:['simulation','encounters','encounter-schedule','discord-notifications','room-store','loot'].map(n=>`export * from './lib/arena/${n}';`).join('\n'),resolveDir:path.resolve(__dirname,'..')},bundle:true,platform:'node',outfile:'tmp/encounter-rules-tests.cjs'});
const s=require('../tmp/encounter-rules-tests.cjs');
const champ=id=>({id,name:'Champion '+id,baselineSpell:'renewing_light',loadout:{skin:'Undead',weapon:'dragon_staff'}});
function setup(n=1){const room=s.createRoom(100,31);s.activateEncounter(room,{id:100,kind:'graveclaw',name:'Graveclaw',status:'active',endsAt:0});for(let i=1;i<=n;i++){const p=s.addPlayer(room,String(i),champ(i));p.rewardAddress='wallet-'+i;p.connected=true;}room.beast.emergeUntil=0;room.beast.mode='patrol';return room;}
function run(room,seconds){for(let i=0;i<Math.ceil(seconds*30);i++){for(const p of Object.values(room.players))p.lastSeen=room.time;s.advance(room,room.time+1/30);}}
function database(){const data=new Map();let tail=Promise.resolve();const ref=id=>({id,get:async()=>doc(id)}),doc=id=>({id,exists:data.has(id),data:()=>structuredClone(data.get(id)),readTime:{toMillis:()=>100000}});return {data,collection:name=>({doc:id=>ref(name+'/'+id)}),runTransaction(fn){const p=tail.then(async()=>{const writes=[];let wrote=false;const tx={get:async r=>{assert(!wrote,'all transaction reads before writes');return doc(r.id);},set:(r,v)=>{wrote=true;writes.push([r.id,v]);},update:(r,v)=>{wrote=true;writes.push([r.id,{...data.get(r.id),...v}]);},create:(r,v)=>{assert(!data.has(r.id));tx.set(r,v);}};const result=await fn(tx);for(const [id,v] of writes)data.set(id,structuredClone(v));return result;});tail=p.catch(()=>{});return p;}};}
test('all eight champions scale health; later joins add health without erasing damage; no leave/rejoin exploit',()=>{
 const r=setup();r.beast.hp-=100;s.addPlayer(r,'2',champ(2));assert.equal(r.beast.maxHealth,512);assert.equal(r.beast.hp,412);assert.equal(r.beast.damageScale,1.08);
 for(let i=3;i<=8;i++)s.addPlayer(r,String(i),champ(i));assert.equal(r.beast.maxHealth,1664);assert.equal(r.beast.hp,1564);assert.equal(s.snapshot(r).beast.maxHealth,1664);
 s.removePlayer(r,'8');s.addPlayer(r,'8b',champ(8));assert.equal(r.beast.hp,1564);
 const restored=structuredClone(r);s.scaleMonster(restored);assert.equal(restored.beast.hp,1564);
 const atSpawn=s.createRoom(100,2);for(let i=1;i<=4;i++)s.addPlayer(atSpawn,String(i),champ(i));s.activateEncounter(atSpawn,{id:100,kind:'graveclaw'});assert.equal(atSpawn.beast.maxHealth,896);assert.equal(atSpawn.beast.hp,896);
});
test('completed healing spell qualifies at full health; cancelled spell/idle player does not',()=>{
 const r=setup(3);r.beast.pauseUntil=1e6;
 s.applyInput(r,'1',{seq:1,x:0,z:0,yaw:0,action:'baseline'});s.applyInput(r,'2',{seq:1,x:0,z:0,yaw:0,action:'baseline'});r.players['2'].action.cancelled=true;run(r,2);
 assert.deepEqual(s.lootRecipients(r).map(p=>p.address),['wallet-1']);
 s.recordContribution(r,r.players['2'],10);assert.equal(s.lootRecipients(r).length,2);
 r.players['2'].connected=false;assert.equal(s.lootRecipients(r).length,1);
});
test('monster defeat freezes eligible wallets only; countdown starts at death; next encounter clears eligibility',()=>{
 const r=setup(4);s.recordHealingMove(r,r.players['2']);s.recordHealingMove(r,r.players['3']);r.players['3'].connected=false;r.beast.hp=1;s.applyStatus(r,r.players['1'],r.beast,'bleed',10,'weapon');run(r,1);
 assert.equal(r.encounter.status,'defeated');assert.deepEqual(r.encounter.recipients.map(p=>p.address),['wallet-1','wallet-2']);assert.equal(r.encounter.nextSpawnAt-r.encounter.defeatedAt,3600);assert(r.dummy);
 s.addPlayer(r,'5',champ(5)).rewardAddress='wallet-5';assert.equal(r.encounter.recipients.length,2);
 s.activateEncounter(r,{id:4000,kind:'graveclaw'});assert.deepEqual(s.lootRecipients(r),[]);
});
test('actual ranged weapon hits another champion, PvP death cannot produce loot or a monster defeat',()=>{
 const r=setup(2),a=r.players['1'],b=r.players['2'];r.beast.x=-10;r.beast.z=-10;r.beast.pauseUntil=1e6;a.x=a.z=0;a.yaw=0;a.carry='Hold';b.x=0;b.z=3;b.hp=1;
 s.applyInput(r,a.id,{seq:1,x:0,z:0,yaw:0,action:'attack'});run(r,2.5);
 assert(!r.players['2']);assert(r.events.some(e=>e.type==='death'&&e.playerId==='2'));assert.equal(r.encounter.status,'active');assert(!r.encounter.recipients);assert.deepEqual(s.lootRecipients(r),[]);
});
function presence(db,count,now){db.data.set('arenaPrivate/playground-realtime-v1-lease',{owner:'worker',epoch:1,playerCount:count,expiresAt:now+20});return {owner:'worker',epoch:1,playerCount:count};}
test('last departure cancels preparation and its pending warning; re-entry gets a full two minutes',async()=>{
 const db=database();await s.currentEncounter(db,123,undefined,10000);
 const first=await s.currentEncounter(db,123,undefined,10000,{...presence(db,2,10000),firstArrival:true});
 assert.equal(first.nextSpawnAt,10120);
 const oneLeft=await s.currentEncounter(db,123,undefined,10100,presence(db,1,10100));assert.equal(oneLeft.nextSpawnAt,10120);
 const empty=await s.currentEncounter(db,123,undefined,10119,presence(db,0,10119));
 assert.equal(empty.nextSpawnAt,null);assert.equal(empty.countdownStartedAt,null);
 const warning=[...db.data.values()].find(v=>v.kind==='warning');assert.equal(warning.status,'expired');
 assert.equal((await s.currentEncounter(db,123,undefined,10500,presence(db,0,10500))).status,'waiting');
 const resumed=await s.currentEncounter(db,123,undefined,10500,presence(db,1,10500));
 assert.equal(resumed.nextSpawnAt,10620);assert.equal(resumed.countdownStartedAt,10500);
 assert.equal([...db.data.values()].filter(v=>v.kind==='warning'&&v.status==='pending').length,1);
 const room=s.createRoom(10500,1);s.activateEncounter(room,resumed);assert.equal(s.snapshot(room).encounter.countdownStartedAt,10500);
 assert.equal((await s.currentEncounter(db,123,undefined,10620,presence(db,1,10620))).status,'active');
});
test('empty preparation reset preserves the one-hour cooldown and previously earned rewards',async()=>{
 const db=database(),key='arenaPrivate/loot-encounter-123-300';
 db.data.set('arenaPrivate/monster-schedule-123-playground-realtime-v1',{encounterId:300});
 db.data.set(key,{id:300,status:'defeated',room:'playground-realtime-v1',defeatedAt:10000,nextSpawnAt:13600,recipients:[{address:'owner'}]});
 await s.currentEncounter(db,123,undefined,13400,{...presence(db,1,13400),firstArrival:true});
 const empty=await s.currentEncounter(db,123,undefined,13450,presence(db,0,13450));assert.equal(empty.nextSpawnAt,13600);
 const rejoin=await s.currentEncounter(db,123,undefined,13480,{...presence(db,1,13480),firstArrival:true});assert.equal(rejoin.nextSpawnAt,13600);assert.deepEqual(rejoin.recipients,[{address:'owner'}]);
 await s.currentEncounter(db,123,undefined,13700,presence(db,0,13700));
 assert.equal(db.data.get(key).nextSpawnAt,null);
 const late=await s.currentEncounter(db,123,undefined,14000,{...presence(db,1,14000),firstArrival:true});assert.equal(late.nextSpawnAt,14120);
});
test('an empty room cannot cancel an active boss or interrupt his return while the worker owns it',async()=>{
 for(const status of ['active','returning']){
  const db=database(),old={id:300,status,room:'playground-realtime-v1',beast:{hp:42},returnAt:10300};
  db.data.set('arenaPrivate/monster-schedule-123-playground-realtime-v1',{encounterId:300});db.data.set('arenaPrivate/loot-encounter-123-300',old);
  assert.deepEqual(await s.currentEncounter(db,123,undefined,10200,presence(db,0,10200)),old);
 }
});
test('empty arena waits; first arrival gets two minutes; later joins cannot reset it; atomic single spawn',async()=>{
 const db=database(),initial=await s.currentEncounter(db,123,undefined,10000);assert.equal(initial.status,'waiting');assert.equal(initial.nextSpawnAt,null);
 assert.equal((await s.currentEncounter(db,123,undefined,14000)).status,'waiting');assert.equal([...db.data.keys()].filter(k=>k.includes('notifications')).length,0);
 const first=await s.currentEncounter(db,123,undefined,14000,{...presence(db,1,14000),firstArrival:true});assert.equal(first.nextSpawnAt,14120);
 let later=await s.currentEncounter(db,123,undefined,14100,presence(db,2,14100));assert.equal(later.nextSpawnAt,14120);
 assert.equal([...db.data.values()].filter(v=>v.kind==='warning').length,1);
 const room=s.createRoom(14000,2);s.activateEncounter(room,first);assert.equal(room.beast,null);assert(room.dummy);
 presence(db,2,14120);const [a,b]=await Promise.all([s.currentEncounter(db,123,undefined,14120),s.currentEncounter(db,123,undefined,14120)]);assert.equal(a.id,b.id);assert.equal(a.status,'active');assert.equal([...db.data.values()].filter(v=>v.kind==='spawn').length,1);
 const active=await s.currentEncounter(db,123,undefined,14310,presence(db,3,14310));assert.equal(active.id,a.id);assert.equal(active.status,'active');
});
test('occupied cooldown warns at two minutes and preserves rewards; overdue empty room gets fresh preparation',async()=>{
 const db=database(),old={id:300,status:'defeated',room:'playground-realtime-v1',defeatedAt:10000,nextSpawnAt:13600,recipients:[{address:'owner'}]};db.data.set('arenaPrivate/monster-schedule-123-playground-realtime-v1',{encounterId:300});db.data.set('arenaPrivate/loot-encounter-123-300',old);
 let value=await s.currentEncounter(db,123,undefined,12000,{...presence(db,1,12000),firstArrival:true});assert.equal(value.nextSpawnAt,13600);assert.equal([...db.data.values()].filter(v=>v.kind==='warning').length,0);
 presence(db,1,13480);await s.currentEncounter(db,123,undefined,13480);await s.currentEncounter(db,123,undefined,13481);assert.equal([...db.data.values()].filter(v=>v.kind==='warning').length,1);
 presence(db,0,13600);value=await s.currentEncounter(db,123,undefined,14000);assert.equal(value.status,'defeated');
 value=await s.currentEncounter(db,123,undefined,15000,{...presence(db,1,15000),firstArrival:true});assert.equal(value.nextSpawnAt,15120);assert.deepEqual(value.recipients,old.recipients);
 const stored=db.data.get('arenaPrivate/loot-encounter-123-300');assert.deepEqual(stored.recipients,old.recipients);
 await assert.rejects(s.currentEncounter(db,123,undefined,15000,{owner:'stale',epoch:1,playerCount:1,firstArrival:true}),/ownership/);
});
test('legacy encounter migration preserves active health and completed rewards; cooldown is relative to defeat',async()=>{
 const db=database(),old={id:495,status:'defeated',room:'playground-realtime-v1',defeatedAt:20000,endsAt:21000,recipients:[{address:'a'}]};db.data.set('arenaPrivate/playground-realtime-v1-checkpoint',{state:{encounter:old}});db.data.set('arenaPrivate/loot-encounter-123-495',old);
 const value=await s.currentEncounter(db,123,undefined,22000);assert.equal(value.id,495);assert.equal(value.nextSpawnAt,23600);assert.deepEqual(value.recipients,old.recipients);
});
test('Discord notifications acknowledge once, suppress mentions, retry failures, and format exact token units',async()=>{
 const db=database(),id='test',key='arenaPrivate/notifications/events/'+id,event={kind:'reward',address:'ABCDEF0123456789',name:'Test @everyone',amount:'1234567',decimals:6,assetId:123,txid:'TX',createdAt:100,status:'pending'};db.data.set(key,event);let calls=0;
 const options={webhook:'https://discord.com/api/webhooks/123/fixture',now:()=>1000,fetchImpl:async(url,request)=>{calls++;const p=JSON.parse(request.body);assert.deepEqual(p.allowed_mentions.parse,[]);assert.equal(p.flags,4);assert(p.content.endsWith('[TransactionId](<https://explorer.perawallet.app/tx/TX>)'));assert(p.content.includes('1.234567'));assert(!p.content.includes('@everyone'));return {ok:true,json:async()=>({id:'message'})};}};
 assert((await s.deliverArenaNotice(db,id,options)).posted);await s.deliverArenaNotice(db,id,options);assert.equal(calls,1);
 db.data.set(key,{...event});assert((await s.deliverArenaNotice(db,id,{...options,fetchImpl:async()=>({ok:false,status:429,json:async()=>({retry_after:90})})})).pending);assert.equal(db.data.get(key).retryAt,91000);
 assert((await s.deliverArenaNotice(db,id,{webhook:''})).configured===false);
});

test('first arrival can never erase or postpone an active encounter',async()=>{
 const db=database(),old={id:300,status:'active',room:'playground-realtime-v1',beast:{hp:42},contributions:{a:{damage:10}}};
 db.data.set('arenaPrivate/monster-schedule-123-playground-realtime-v1',{encounterId:300});db.data.set('arenaPrivate/loot-encounter-123-300',old);
 const value=await s.currentEncounter(db,123,undefined,12000,{...presence(db,1,12000),firstArrival:true});
 assert.equal(value.status,'active');assert.equal(value.beast.hp,42);assert.deepEqual(value.contributions,old.contributions);
});
test('grave entrance suppresses dummy and attacks; party wipe walks back, burrows, and waits an hour',()=>{
 const r=s.createRoom(100,31);s.addPlayer(r,'1',champ(1));s.activateEncounter(r,{id:100,kind:'graveclaw',status:'active'});
 assert.equal(r.beast.x,0);assert.equal(r.beast.z,0);assert.equal(r.beast.mode,'emerging');assert(!r.dummy);
 run(r,3);assert.equal(r.beast.x,0);assert.equal(r.beast.z,0);assert(!r.beast.action);
 r.beast.x=4;r.beast.z=3;s.removePlayer(r,'1','defeated',r.beast.id);run(r,.1);
 assert.equal(r.encounter.status,'returning');assert.equal(r.beast.mode,'returning');assert.equal(r.beast.emergeUntil,0);assert(!r.dummy);assert.deepEqual(r.encounter.recipients,[]);
 const end=r.encounter.returnAt;assert.equal(r.encounter.nextSpawnAt,end+3600);
 run(r,10);assert.equal(r.encounter.status,'withdrawn');assert.equal(r.beast,null);assert(r.dummy);
 assert(!r.events.some(e=>e.type==='beastDefeated'));
});
test('disconnect grace permits recovery; no survivors eventually closes the encounter',()=>{
 const r=setup();r.beast.pauseUntil=1e6;r.players['1'].connected=false;
 s.advance(r,100.2);assert.equal(r.encounter.status,'active');
 // Once the existing heartbeat grace expires, disconnect counts as leaving.
 for(let i=0;i<400;i++)s.advance(r,r.time+1/30);
 assert(['returning','withdrawn'].includes(r.encounter.status));
});
test('withdrawal respects cooldown and warns once; expired workers cannot leave a locked arena',async()=>{
 const db=database(),key='arenaPrivate/loot-encounter-123-300';db.data.set('arenaPrivate/monster-schedule-123-playground-realtime-v1',{encounterId:300});
 db.data.set(key,{id:300,status:'returning',room:'playground-realtime-v1',name:'Graveclaw',returnAt:10000,nextSpawnAt:13600});
 let value=await s.currentEncounter(db,123,undefined,10010);assert.equal(value.status,'withdrawn');assert.equal(value.nextSpawnAt,13600);
 value=await s.currentEncounter(db,123,undefined,11000,{...presence(db,1,11000),firstArrival:true});assert.equal(value.nextSpawnAt,13600);
 await s.currentEncounter(db,123,undefined,13480,presence(db,1,13480));await s.currentEncounter(db,123,undefined,13481,presence(db,1,13481));
 assert.equal([...db.data.values()].filter(v=>v.kind==='warning').length,1);
 db.data.set(key,{id:300,status:'active',room:'playground-realtime-v1',name:'Graveclaw'});
 value=await s.currentEncounter(db,123,undefined,15000);assert.equal(value.status,'withdrawn');assert.equal(value.nextSpawnAt,18600);
});
test('persistent admission refuses active and returning encounters before consuming a ticket',async()=>{
 const db=database();presence(db,1,100);const store=new s.FirestoreRoomStore(db,{owner:'worker',clock:()=>0,economy:{enabled:true,appId:123}});store.epoch=1;store.deadline=10000;
 for(const status of ['active','returning']){
  db.data.set('arenaPrivate/loot-encounter-123-300',{id:300,status,room:store.roomId});
  await assert.rejects(store.claim({nonce:'test',address:'wallet',champion:{id:1},exp:500},'1',300),/Entry reopens/);
  assert(!db.data.has('arenaPrivate/ticket-test'));
 }
});

test('boss victory checkpoints persist cooldown and one Discord event without scheduling loot',async()=>{
 const db=database();presence(db,1,100);const store=new s.FirestoreRoomStore(db,{owner:'worker',clock:()=>0,economy:{enabled:true,appId:123}});store.epoch=1;store.deadline=10000;
 const r=setup();const key='arenaPrivate/loot-encounter-123-100';db.data.set(key,{...r.encounter,room:store.roomId});
 s.removePlayer(r,'1','defeated');run(r,.1);await store.checkpoint(r);assert.equal(db.data.get(key).status,'returning');
 run(r,15);await store.checkpoint(r);await store.checkpoint(r);const row=db.data.get(key);assert.equal(row.status,'withdrawn');assert.equal(row.nextSpawnAt,row.returnAt+3600);
 assert.equal([...db.data.values()].filter(v=>v.kind==='victory').length,1);assert(![...db.data.keys()].some(k=>k.includes('loot-jobs')));assert(!row.lootQueue);
});

test('same-wallet champions keep separate participation and a single wallet loot roll',async()=>{
 const r=setup(2);r.players['2'].rewardAddress=r.players['1'].rewardAddress;s.recordHealingMove(r,r.players['1']);s.recordHealingMove(r,r.players['2']);
 assert.equal(Object.keys(r.encounter.contributions).length,2);assert.equal(s.lootRecipients(r).length,1);
 const db=database();presence(db,1,100);const store=new s.FirestoreRoomStore(db,{owner:'worker',clock:()=>0,economy:{enabled:true,appId:123}});store.epoch=1;store.deadline=10000;
 const key='arenaPrivate/loot-encounter-123-100';db.data.set(key,{id:100,status:'waiting',room:store.roomId,participants:{}});
 for(const assetId of [1,2])await store.claim({nonce:'n'+assetId,address:'same-wallet',champion:{id:assetId},exp:500},String(assetId),100);
 assert.deepEqual(db.data.get(key).participants,{'same-wallet:1':1,'same-wallet:2':2});
});

test('each Graveclaw event uploads its matching distinct game-model render as a multipart attachment',async()=>{
 const fs=require('node:fs'),hashes=new Set(),crypto=require('node:crypto');
 for(const kind of ['warning','spawn','defeat','victory']){
  const filename=`graveclaw-${kind}.png`,image=fs.readFileSync('public/arena/playground/assets/beasts/'+filename);
  hashes.add(crypto.createHash('sha256').update(image).digest('hex'));
  assert.equal(image.subarray(1,4).toString(),'PNG');assert.equal(image.readUInt32BE(16),1200);assert.equal(image.readUInt32BE(20),675);
  const db=database(),key='arenaPrivate/notifications/events/image',event={kind,name:'Graveclaw',spawnAt:400,champions:2,createdAt:100,status:'pending'};db.data.set(key,event);let calls=0;
  const options={webhook:'https://discord.com/api/webhooks/123/fixture',now:()=>1000,fetchImpl:async(url,options)=>{
   calls++;assert.equal(options.method,'POST');assert.equal(new URL(url).searchParams.get('wait'),'true');
   const request=new Request(url,options);assert.match(request.headers.get('Content-Type'),/^multipart\/form-data; boundary=/);
   const form=await request.formData(),payload=JSON.parse(form.get('payload_json')),file=form.get('files[0]');
   assert.equal(payload.flags,4);assert.deepEqual(payload.allowed_mentions,{parse:[]});assert.equal(payload.embeds,undefined);
   assert.equal(payload.attachments.length,1);assert.equal(payload.attachments[0].id,0);assert.equal(payload.attachments[0].filename,filename);assert(payload.attachments[0].description.length>30);
   assert.equal(file.name,filename);assert.equal(file.type,'image/png');assert.deepEqual(Buffer.from(await file.arrayBuffer()),image);
   return {ok:true,json:async()=>({id:'image-message'})};
  }};
  assert((await s.deliverArenaNotice(db,'image',options)).posted);assert.equal(db.data.get(key).messageId,'image-message');
  await s.deliverArenaNotice(db,'image',options);assert.equal(calls,1);
 }
 assert.equal(hashes.size,4,'All four events need different images');
});
test('image announcements retry safely; unrelated monsters and reward receipts stay text-only',async()=>{
 const db=database(),key='arenaPrivate/notifications/events/retry';db.data.set(key,{kind:'spawn',name:'Graveclaw',createdAt:100,status:'pending'});let now=1000,calls=0;
 const options={webhook:'https://discord.com/api/webhooks/123/fixture',now:()=>now,fetchImpl:async(url,request)=>{calls++;assert(request.body instanceof FormData);return calls===1?{ok:false,status:429,json:async()=>({retry_after:90})}:{ok:true,json:async()=>({id:'retry-image'})};}};
 assert((await s.deliverArenaNotice(db,'retry',options)).pending);assert.equal(db.data.get(key).retryAt,91000);await s.deliverArenaNotice(db,'retry',options);assert.equal(calls,1);now=91001;assert((await s.deliverArenaNotice(db,'retry',options)).posted);assert.equal(calls,2);
 for(const event of [{kind:'spawn',name:'Cindermaw'},{kind:'spawn',name:'Unknown'},{kind:'reward',name:'Graveclaw',address:'ADDRESS',amount:'1',assetId:1,txid:'TX'}]){
  const request=s.arenaAnnouncementRequest(event);assert.equal(request.headers['Content-Type'],'application/json');const payload=JSON.parse(request.body);assert.equal(payload.attachments,undefined);assert.equal(payload.flags,4);
 }
 const art=s.arenaAnnouncementRequest({kind:'warning',name:'Gravecrawler',spawnAt:400});assert(art.body instanceof FormData);
});
test('arena and Depths announcements use separate destinations, including older reward receipts',async()=>{
 const arena='https://discord.com/api/webhooks/123/arena-test',depths='https://discord.com/api/webhooks/456/depths-test';
 for(const scenario of [{id:'arena',source:'arena',expected:arena},{id:'depths',source:'depths',expected:depths},{id:'loot-reward-123-4000000000000001-0-delivered',expected:depths,legacy:true}]){
  const db=database(),key='arenaPrivate/notifications/events/'+scenario.id;
  const event={kind:'reward',address:'WALLET',amount:'100',decimals:0,assetId:5,name:'DARK',txid:'TX',createdAt:100,status:'pending',...(scenario.source?{source:scenario.source}:{})};
  db.data.set(key,event);
  if(scenario.legacy)db.data.set('arenaPrivate/'+scenario.id.replace(/-delivered$/,''),{source:'depths'});
  let calls=0;
  assert((await s.deliverArenaNotice(db,scenario.id,{webhook:arena,depthsWebhook:depths,now:()=>1000,fetchImpl:async(url,request)=>{
   calls++;assert.equal(String(url).split('?')[0],scenario.expected);const payload=JSON.parse(request.body);assert.equal(payload.flags,4);assert.deepEqual(payload.allowed_mentions,{parse:[]});assert.equal(payload.username,scenario.expected===depths?'The Depths':'Dark Coin Arena');assert(payload.content.includes(scenario.expected===depths?'from The Depths.':'from monster loot.'));return {ok:true,json:async()=>({id:'message'})};
  }})).posted);assert.equal(calls,1);
 }
});
test('missing Depths destination never sends its reward to the arena channel',async()=>{
 const db=database(),key='arenaPrivate/notifications/events/depths';db.data.set(key,{source:'depths',kind:'reward',status:'pending'});
 let calls=0;const result=await s.deliverArenaNotice(db,'depths',{webhook:'https://discord.com/api/webhooks/123/arena-test',depthsWebhook:'',fetchImpl:async()=>{calls++;throw Error('must not send');}});
 assert.equal(result.configured,false);assert.equal(calls,0);assert.equal(db.data.get(key).status,'pending');
});
