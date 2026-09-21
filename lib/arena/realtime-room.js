import crypto from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {createRoom,addPlayer,removePlayer,advance,applyInput,realtimeSnapshot} from './simulation';
import {verifyTicket,hashToken} from './tickets';
import {DeltaSender} from './wire';

const MAX_BUFFER=64*1024;
export class RealtimeRoom{
 constructor({store,secret,clock=()=>performance.now(),wall=()=>Date.now()/1000,log=console.log}){
  Object.assign(this,{store,secret,clock,wall,log});this.connections=new Set();this.sessions=new Map();this.nextId=0;this.state=null;this.draining=false;this.admission=Promise.resolve();this.renewing=false;this.checkpointing=false;this.resultPending=new Map();this.lastResult=0;
  this.metrics={ticks:0,tickMs:[],bytesOut:0,inputs:0,connections:0,resyncs:0,backpressure:0};this.lastBroadcast=0;this.lastCheckpoint=0;this.lastRenew=0;this.lastMetrics=this.clock();
 }
 send(c,message){if(c.socket.readyState!==1)return;const json=JSON.stringify(message);if(c.socket.bufferedAmount>MAX_BUFFER){this.metrics.backpressure++;c.delta.reset();if(!c.slowSince)c.slowSince=this.clock();else if(this.clock()-c.slowSince>3000)c.socket.close(4008,'Slow connection');return;}c.slowSince=0;this.metrics.bytesOut+=Buffer.byteLength(json);c.socket.send(json);}
 connect(socket){
  const c={socket,delta:new DeltaSender(),authenticated:false,opened:this.clock(),heard:this.clock(),rateAt:this.clock(),count:0};this.connections.add(c);this.metrics.connections++;
  socket.on('message',raw=>{if(raw.length>16000){socket.close(1009,'Message too large');return;}try{this.message(c,JSON.parse(raw.toString()));}catch{socket.close(1008,'Invalid message');}});
  socket.on('close',()=>{this.connections.delete(c);if(c.session?.connection===c)c.session.connection=null;});
  socket.on('error',()=>socket.close());return c;
 }
 async authenticate(c,m){
  if(c.authenticating||c.authenticated)throw new Error('Already authenticating');c.authenticating=true;
  this.admissionsPending=(this.admissionsPending||0)+1;
  // Serialize admission across asynchronous lease/nonce transactions.
  const work=async()=>{
   if(this.draining)throw new Error('The arena is restarting. Select your champion again.');
   const claims=m.resume?null:verifyTicket(m.ticket,this.secret,this.wall(),this.store.roomId);
   if(m.resume&&(typeof m.resume!=='string'||!/^[a-f0-9]{64}$/.test(m.resume)||!this.sessions.has(hashToken(m.resume))))throw new Error('This round ended or restarted. Select your champion again.');
   if(!this.store.valid()){
    if(this.state)throw new Error('The arena is restarting. Select your champion again.');
    if(!await this.store.acquire()){this.send(c,{type:'retry',message:'Waiting for arena ownership…'});c.socket.close(4013,'Room busy');return;}
    this.state=createRoom(this.wall(),crypto.randomBytes(4).readUInt32LE());this.lastRenew=this.clock();this.lastCheckpoint=this.clock();
   }
   if(c.socket.readyState!==1)return;
   let session,token;
   if(m.resume){
    if(typeof m.resume!=='string'||!/^[a-f0-9]{64}$/.test(m.resume))throw new Error('Invalid session');
    session=this.sessions.get(hashToken(m.resume));
    if(!session||session.expires<this.wall()||!this.state.players[session.id])throw new Error('This round ended or restarted. Select your champion again.');
    token=m.resume;
   }else{
    if(Object.keys(this.state.players).length>=8)throw new Error('This arena is full. Please try again shortly.');
    if(Object.values(this.state.players).some(p=>p.walletHash===claims.wallet||p.champion.id===claims.champion.id))throw new Error('This champion or wallet is already in the arena.');
    const id=String(++this.nextId);await this.store.claim(claims,id);
    if(!this.store.valid()||c.socket.readyState!==1)throw new Error('Admission interrupted. Select your champion again.');
    const player=addPlayer(this.state,id,claims.champion);player.walletHash=claims.wallet;
    token=crypto.randomBytes(32).toString('hex');session={id,expires:this.wall()+3600,hash:hashToken(token)};this.sessions.set(session.hash,session);this.requestCheckpoint=true;
   }
   if(session.connection){session.connection.authenticated=false;session.connection.socket.close(4001,'Session resumed elsewhere');}
   session.connection=c;c.session=session;c.authenticated=true;c.heard=this.clock();
   const p=this.state.players[session.id];p.lastSeen=this.state.time;
   this.send(c,{type:'welcome',v:1,playerId:session.id,resume:token,expires:session.expires,epoch:this.store.epoch,ack:p.lastSeq});
   this.send(c,c.delta.packet(realtimeSnapshot(this.state),p.lastSeq));
  };
  this.admission=this.admission.then(work).catch(e=>{this.send(c,{type:'fatal',message:e.message});c.socket.close(4003,'Admission rejected');});
  try{await this.admission;}finally{this.admissionsPending--;}
 }
 message(c,m){
  if(!m||typeof m!=='object')throw new Error('Invalid packet');
  const now=this.clock();if(now-c.rateAt>=1000){c.rateAt=now;c.count=0;}if(++c.count>80){c.socket.close(4008,'Rate limit');return;}
  if(m.type==='hello'){void this.authenticate(c,m).catch(()=>c.socket.close(1008));return;}
  if(!c.authenticated||!this.store.valid()||this.draining){c.socket.close(4013,'Room unavailable');return;}
  const p=this.state.players[c.session.id];if(!p){this.send(c,{type:'ended',message:'Your champion is no longer in the arena.'});c.socket.close(4004,'Round ended');return;}
  c.heard=now;p.lastSeen=this.state.time;
  if(m.type==='ack'){if(Number.isSafeInteger(m.n))c.delta.acknowledge(m.n);return;}
  if(m.type==='resync'){c.delta.reset();this.metrics.resyncs++;return;}
  if(m.type==='ping'){this.send(c,{type:'pong',echo:m.at,time:this.state.time});return;}
  if(m.type==='leave'){removePlayer(this.state,p.id);this.sessions.delete(c.session.hash);this.requestCheckpoint=true;c.socket.close(1000,'Left arena');return;}
  if(m.type!=='input')throw new Error('Unknown packet');
  const i=m.input;
  if(!i||!Number.isSafeInteger(i.seq)||i.seq<0||i.seq>p.lastSeq+10000||![i.x,i.z,i.yaw].every(Number.isFinite)||Math.abs(i.x)>1||Math.abs(i.z)>1||Math.abs(i.yaw)>Math.PI*2||i.action&&!['attack','toggle','cast','baseline','jump'].includes(i.action))throw new Error('Invalid input');
  const result=applyInput(this.state,p.id,i);this.metrics.inputs++;
  this.send(c,{type:'inputAck',seq:p.lastSeq,error:result.error||null});
 }
 tick(){
  const start=this.clock();
  for(const c of this.connections)if(!c.authenticated&&start-c.opened>5000)c.socket.close(4003,'Authentication required');
  if(!this.state||this.draining)return;
  if(!this.store.valid()){void this.drain('Arena ownership expired');return;}
  // Advance from a monotonic clock; never replay an unbounded stalled server frame.
  const elapsed=this.lastTick==null?1/30:Math.min(.25,(start-this.lastTick)/1000);this.lastTick=start;
  this.accumulator=(this.accumulator||0)+elapsed;
  while(this.accumulator>=1/30){advance(this.state,this.state.time+1/30);this.accumulator-=1/30;}
  for(const session of this.sessions.values()){
   const p=this.state.players[session.id],c=session.connection;
   if(session.expires<=this.wall()||!p){if(p)removePlayer(this.state,p.id,'expired');if(c){this.send(c,c.delta.packet(realtimeSnapshot(this.state),p?.lastSeq??-1));this.send(c,{type:'ended',message:'Your champion left the arena. Select it again to join.'});c.socket.close(4004,'Round ended');}this.sessions.delete(session.hash);this.requestCheckpoint=true;}
   else if(c&&start-c.heard>10000)c.socket.close(4000,'Heartbeat timeout');
  }
  for(const e of this.state.events)if(e.id>this.lastResult&&['death','left'].includes(e.type))this.resultPending.set(e.id,e);
  this.lastResult=Math.max(this.lastResult,...this.state.events.map(e=>e.id));
  if(start-this.lastBroadcast>=100){this.lastBroadcast=start;const state=realtimeSnapshot(this.state);for(const c of this.connections)if(c.authenticated){
   const packet=c.delta.packet(state,this.state.players[c.session.id]?.lastSeq??-1);
   const changed=Object.keys(packet.j).length||Object.keys(packet.p).length||packet.r.length||packet.events.length||packet.shots[1].length||Object.keys(packet.shots[0]).length||packet.zones[1].length||Object.keys(packet.zones[0]).length;
   if(changed||start-(c.lastStateSent||0)>=1000){this.send(c,packet);c.lastStateSent=start;}
  }}
  if(start-this.lastRenew>=5000&&!this.renewing){this.renewing=true;this.lastRenew=start;this.store.renew().then(ok=>{if(!ok)void this.drain('Arena restarting');}).catch(()=>{}).finally(()=>{this.renewing=false;});}
  if((this.requestCheckpoint&&start-this.lastCheckpoint>=2000||start-this.lastCheckpoint>=30000)&&!this.checkpointing){
   this.checkpointing=true;this.requestCheckpoint=false;this.lastCheckpoint=start;
   const state=JSON.parse(JSON.stringify(this.state)),results=[...this.resultPending.values()];
   this.store.checkpoint(state).then(()=>this.store.results(results)).then(()=>{for(const e of results)this.resultPending.delete(e.id);}).catch(()=>{this.requestCheckpoint=true;}).finally(()=>{this.checkpointing=false;});
  }
  this.metrics.ticks++;this.metrics.tickMs.push(this.clock()-start);
  if(start-this.lastMetrics>=60000){this.lastMetrics=start;const sorted=this.metrics.tickMs.sort((a,b)=>a-b);this.log(JSON.stringify({type:'arena_metrics',players:Object.keys(this.state.players).length,tickP95Ms:sorted[Math.floor(sorted.length*.95)]||0,bytesOut:this.metrics.bytesOut,inputs:this.metrics.inputs,dbWrites:this.store.writes,resyncs:this.metrics.resyncs,backpressure:this.metrics.backpressure}));this.metrics.tickMs=[];this.metrics.bytesOut=0;this.metrics.inputs=0;}
  if(!Object.keys(this.state.players).length&&!this.emptyClosing&&!this.admissionsPending){this.emptyClosing=true;void this.drain('Arena empty',true);}
 }
 async drain(reason='Arena restarting',reusable=false){
  if(this.draining)return;this.draining=true;
  for(const c of this.connections){this.send(c,{type:'fatal',message:reason+'. Select your champion again.'});c.socket.close(4012,'Arena restarted');}
  try{if(this.state&&this.store.valid()){await this.store.checkpoint(this.state,'drain');await this.store.results([...this.resultPending.values()]);}}catch{}finally{
   await this.store.release().catch(()=>{});this.sessions.clear();this.state=null;this.lastTick=null;this.accumulator=0;this.lastResult=0;this.resultPending.clear();this.emptyClosing=false;
   if(reusable)this.draining=false;
  }
 }
 start(){this.timer=setInterval(()=>this.tick(),1000/30);this.timer.unref?.();return this;}
 async stop(){clearInterval(this.timer);await this.drain('Arena restarting');}
}
