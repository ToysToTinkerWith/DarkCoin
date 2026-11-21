import {WebSocketConnection} from './realtime-network';
export class ArenaConnection {
 constructor(session,onState,onNotice){return session.transport==='websocket'?new WebSocketConnection(session,onState,onNotice):new RestArenaConnection(session,onState,onNotice);}
}
export class RestArenaConnection {
 constructor(session,onState,onNotice){this.session=session;this.onState=onState;this.onNotice=onNotice;this.seq=0;this.intent={x:0,z:0,yaw:0,run:false};this.pending=null;this.closed=false;this.retry=null;this.timer=null;this.lastSuccess=performance.now();}
 start(){this.onState(this.session.state);this.pump();}
 setIntent(intent){this.intent=intent;}
 action(action){if(this.pending)return false;this.pending=action;return true;}
 async pump(){
  if(this.closed)return;
  const input=this.retry||{...(this.intentProvider?.()||this.intent),seq:++this.seq,...(this.pending?{action:this.pending}:{})};
  if(!this.retry)this.pending=null;
  const controller=new AbortController();this.controller=controller;const timeout=setTimeout(()=>controller.abort(),6500),start=performance.now();
  try{
   const response=await fetch('/api/arena/combat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+this.session.token},body:JSON.stringify({op:'input',input}),signal:controller.signal});
   const data=await response.json();if(this.closed)return;
   if(!response.ok){if([401,410].includes(response.status)){this.closed=true;this.onNotice(data.error,true);return;}throw new Error(data.error||'The arena could not be reached.');}
   if(data.throttled)this.retry=input;else this.retry=null;
   this.lastSuccess=performance.now();this.onState(data.state,(performance.now()-start)/2000);
   if(data.error&&!data.gone)this.onNotice(data.error,false);
  }catch(e){if(!this.closed){this.retry=input;this.onNotice('Reconnecting to the arena…',performance.now()-this.lastSuccess>12000);}}
  finally{clearTimeout(timeout);if(!this.closed)this.timer=setTimeout(()=>this.pump(),Math.max(20,200-(performance.now()-start)));}
 }
 close(){if(this.closed)return;this.closed=true;clearTimeout(this.timer);this.controller?.abort();fetch('/api/arena/combat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+this.session.token},body:JSON.stringify({op:'leave'}),keepalive:true}).catch(()=>{});}
}
