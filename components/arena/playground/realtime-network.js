import {applyPacket,decodeState} from '../../../lib/arena/wire';
export class WebSocketConnection{
 constructor(session,onState,onNotice){Object.assign(this,{session,onState,onNotice});this.seq=0;this.intent={x:0,z:0,yaw:0,run:false};this.actions=[];this.unacked=new Map();this.baselines=new Map();this.events=new Map();this.closed=false;this.ready=false;this.lastSent=0;this.lastPing=0;this.rtt=0;this.jitter=0;this.retries=0;this.metrics={bytesIn:0,bytesOut:0,reconnects:0};}
 start(){this.started=performance.now();this.connect();this.timer=setInterval(()=>this.pump(),25);}
 connect(){
  if(this.closed)return;this.metrics.reconnects+=this.retries>0?1:0;this.ready=false;
  const socket=this.socket=new WebSocket(this.session.url);this.baselines.clear();this.lastReceived=performance.now();
  socket.onopen=()=>this.send({type:'hello',...(this.resume?{resume:this.resume}:{ticket:this.session.ticket})});
  socket.onmessage=e=>{if(socket!==this.socket||this.closed)return;this.lastReceived=performance.now();this.metrics.bytesIn+=e.data.length;try{this.receive(JSON.parse(e.data));}catch{this.send({type:'resync'});}};
  socket.onerror=()=>{};
  socket.onclose=e=>{
   if(socket!==this.socket||this.closed)return;this.ready=false;
   if([4001,4003,4004,4012].includes(e.code)){this.fail(e.code===4001?'This champion was opened in another connection.':'The arena session ended. Select your champion again.');return;}
   this.disconnectedAt=this.disconnectedAt||performance.now();
   if(performance.now()-(this.disconnectedAt||this.started)>12000&&this.resume||!this.resume&&Date.now()/1000>this.session.expiresAt){this.fail('The arena could not reconnect. Select your champion again.');return;}
   this.onNotice('Reconnecting to the arena…',false);
   this.retry=setTimeout(()=>{this.retries++;this.connect();},Math.min(1500,250*2**Math.min(this.retries,3))+Math.random()*150);
  };
 }
 send(message){if(this.socket?.readyState!==1||this.socket.bufferedAmount>32768)return false;const json=JSON.stringify(message);this.socket.send(json);this.metrics.bytesOut+=json.length;return true;}
 receive(m){
  if(m.type==='welcome'){
   this.ready=true;this.resume=m.resume;this.playerId=m.playerId;this.session.playerId=m.playerId;this.seq=Math.max(this.seq,m.ack);this.ack(m.ack);this.retries=0;this.disconnectedAt=0;this.lastSent=0;
   for(const input of this.unacked.values())this.send({type:'input',input});this.pump();return;
  }
  if(m.type==='fatal'){this.fail(m.message);return;}
  if(m.type==='retry'){this.onNotice(m.message,false);return;}
  if(m.type==='ended'){this.onNotice(m.message,false);return;}
  if(m.type==='pong'){const rtt=performance.now()-m.echo;if(rtt>=0&&rtt<10000){this.jitter=this.jitter*.8+Math.abs(rtt-this.rtt)*.2;this.rtt=this.rtt?this.rtt*.75+rtt*.25:rtt;}return;}
  if(m.type==='inputAck'){this.ack(m.seq);if(m.error)this.onNotice(m.error,false);return;}
  if(m.type!=='state')return;
  const state=applyPacket(m,this.baselines.get(m.b));this.baselines.set(m.n,state);while(this.baselines.size>32)this.baselines.delete(this.baselines.keys().next().value);
  for(const e of m.events)this.events.set(e.id,e);for(const [id,e] of this.events)if(state.time-e.time>5)this.events.delete(id);
  this.ack(m.ack);this.send({type:'ack',n:m.n});this.onState(decodeState(state,[...this.events.values()]),this.rtt/2000);
 }
 ack(seq){for(const id of this.unacked.keys())if(id<=seq)this.unacked.delete(id);}
 setIntent(intent){const changed=intent.x!==this.intent.x||intent.z!==this.intent.z||intent.run!==this.intent.run;this.intent=intent;if(changed){this.lastControlAt=performance.now();this.pump(true);}}
 action(action){if(!this.ready||this.actions.length||this.unacked.size>=128)return false;this.actions.push(action);this.pump(true);return true;}
 pump(force=false){
  if(this.closed)return;const now=performance.now();
  if(this.socket?.readyState===1&&now-this.lastReceived>7000){this.socket.close(4000,'Connection timeout');return;}
  if(!this.ready)return;
  if(now-this.lastPing>=3000){this.lastPing=now;this.send({type:'ping',at:now});}
  if(!force&&now-this.lastSent<50)return;
  const current=this.intentProvider?.()||this.intent;
  const input={x:current.x,z:current.z,yaw:Math.round(current.yaw*1000)/1000,run:current.run===true};
  const changed=JSON.stringify(input)!==this.lastIntent,moving=Math.hypot(input.x,input.z)>.01;
  if(!changed&&!this.actions.length&&(!moving||now-this.lastSent<200))return;
  if(this.unacked.size>=128){this.socket.close(4000,'Acknowledgments stalled');return;}
  input.seq=++this.seq;if(this.actions.length)input.action=this.actions[0];
  if(this.send({type:'input',input})){this.actions.shift();this.unacked.set(input.seq,input);this.lastIntent=JSON.stringify({x:input.x,z:input.z,yaw:input.yaw,run:input.run});this.lastSent=now;}
 }
 fail(message){if(this.closed)return;this.onNotice(message,true);this.close(false);}
 close(leave=true){if(this.closed)return;if(leave&&this.ready)this.send({type:'leave'});this.closed=true;clearInterval(this.timer);clearTimeout(this.retry);this.socket?.close(1000,'Client closed');}
}
