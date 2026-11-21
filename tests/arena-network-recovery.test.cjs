const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),esbuild=require('esbuild');
const code=esbuild.buildSync({stdin:{contents:"export {WebSocketConnection} from './components/arena/playground/realtime-network';",resolveDir:root},bundle:true,platform:'browser',format:'cjs',write:false}).outputFiles[0].text;
function fixture(){
 let now=100,scheduled=[];const sockets=[],notices=[];
 class Socket{
  constructor(){this.readyState=0;this.bufferedAmount=0;this.sent=[];sockets.push(this);}
  send(raw){this.sent.push({at:now,...JSON.parse(raw)});}
  open(){this.readyState=1;this.onopen?.();}
  close(code,reason){this.readyState=3;this.closed={code,reason};this.onclose?.({code});}
 }
 const context={module:{exports:{}},performance:{now:()=>now},Date,WebSocket:Socket,setInterval:()=>1,clearInterval(){},setTimeout:fn=>{scheduled.push(fn);return scheduled.length;},clearTimeout(){}};
 vm.runInNewContext(code,context);const {WebSocketConnection}=context.module.exports;
 const client=new WebSocketConnection({url:'ws://fixture/socket',ticket:'fixture',expiresAt:Date.now()/1000+60},()=>{},(message,fatal)=>notices.push({message,fatal}));client.start();
 return {client,sockets,notices,now:()=>now,advance:ms=>now+=ms,retry:()=>scheduled.shift()?.(),welcome(ack=-1){client.receive({type:'welcome',resume:'resume',playerId:'1',ack});}};
}

test('a full reconnect backlog replays in order below the server rate limit and waits for ACKs',()=>{
 const f=fixture(),c=f.client,s=f.sockets[0];s.open();
 for(let seq=1;seq<=128;seq++)c.unacked.set(seq,{seq,x:0,z:0,yaw:0,run:false,...(seq%20===0?{action:'attack'}:{})});c.seq=128;
 f.welcome();assert.equal(s.readyState,1);assert.equal(s.sent.filter(m=>m.type==='input').length,2);
 for(let i=0;i<63;i++){f.advance(50);c.pump();}
 const inputs=s.sent.filter(m=>m.type==='input');assert.equal(inputs.length,128);assert.deepEqual(inputs.map(m=>m.input.seq),Array.from({length:128},(_,i)=>i+1));
 assert.equal(inputs.filter(m=>m.input.action==='attack').length,6,'queued actions must not be lost');
 for(const input of inputs)assert(s.sent.filter(m=>m.at>=input.at&&m.at<input.at+1000).length<=42,'replay leaves capacity for state ACKs');
 f.advance(25);c.pump();assert.equal(s.readyState,1,'a full replay queue must wait for acknowledgments');
 c.receive({type:'inputAck',seq:128});assert.equal(c.unacked.size,0);
 f.advance(50);c.pump();assert.equal(s.sent.at(-1).input.seq,129);assert.equal(s.readyState,1);
});

test('replay skips already acknowledged inputs and respects socket backpressure',()=>{
 const f=fixture(),c=f.client,s=f.sockets[0];s.open();
 for(let seq=1;seq<=6;seq++)c.unacked.set(seq,{seq,x:0,z:0,yaw:0,run:false});c.seq=6;s.bufferedAmount=40000;
 f.welcome(2);assert.equal(s.sent.filter(m=>m.type==='input').length,0);
 c.receive({type:'inputAck',seq:4});s.bufferedAmount=0;f.advance(50);c.pump();
 assert.deepEqual(s.sent.filter(m=>m.type==='input').map(m=>m.input.seq),[5,6]);
});

test('replayed actions retain their sequence while released controls stop movement immediately',()=>{
 const f=fixture(),c=f.client,s=f.sockets[0];s.open();
 for(let seq=1;seq<=128;seq++)c.unacked.set(seq,{seq,x:1,z:1,yaw:1,run:true,...(seq===2?{action:'attack'}:{})});c.seq=128;
 c.intentProvider=()=>({x:0,z:0,yaw:-1,run:false});f.welcome();
 const inputs=s.sent.filter(m=>m.type==='input');assert.equal(inputs.length,2);
 for(const {input} of inputs){assert.equal(input.x,0);assert.equal(input.z,0);assert.equal(input.yaw,-1);assert.equal(input.run,false);}
 assert.equal(inputs[1].input.seq,2);assert.equal(inputs[1].input.action,'attack');
 c.intentProvider=()=>({x:-1,z:0,yaw:-2,run:true});f.advance(50);c.pump();assert.equal(s.sent.at(-1).input.x,-1,'controls remain live during the replay');
});

test('slow admission has time to finish but stalled connection attempts retry',()=>{
 const f=fixture(),s=f.sockets[0];s.open();f.advance(8000);f.client.pump();assert.equal(s.readyState,1,'admission can take longer than a gameplay heartbeat');
 f.advance(12001);f.client.pump();assert.equal(s.closed.reason,'Connection timeout');f.retry();
 const pending=f.sockets[1];assert.equal(pending.readyState,0);f.advance(7001);f.client.pump();assert.equal(pending.closed.reason,'Connection timeout');
});

test('a stalled replay still reconnects after the bounded ACK deadline',()=>{
 const f=fixture(),c=f.client,s=f.sockets[0];s.open();
 for(let seq=1;seq<=128;seq++)c.unacked.set(seq,{seq,x:0,z:0,yaw:0,run:false});c.seq=128;f.welcome();
 for(let i=0;i<63;i++){f.advance(50);c.pump();}
 f.advance(4000);c.lastReceived=f.now();c.pump();assert.equal(s.closed.reason,'Acknowledgments stalled');
});
