import http from 'node:http';
import crypto from 'node:crypto';
import {WebSocketServer} from 'ws';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {FirestoreRoomStore} from '../lib/arena/room-store';
import {RealtimeRoom} from '../lib/arena/realtime-room';

export function createServer({store,secret,origins,log=console.log}){
 const room=new RealtimeRoom({store,secret,log}).start();
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/healthz'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,protocol:1,draining:room.draining}));return;}
  if(req.url==='/admin/drain'&&req.method==='POST'){
   const got=Buffer.from(req.headers.authorization||''),expected=Buffer.from('Bearer '+secret);
   if(got.length!==expected.length||!crypto.timingSafeEqual(got,expected)){res.writeHead(403);res.end();return;}
   await room.stop();res.writeHead(200);res.end('Drained');return;
  }
  res.writeHead(404);res.end();
 });
 server.headersTimeout=10000;server.requestTimeout=10000;
 const wss=new WebSocketServer({noServer:true,maxPayload:16000,perMessageDeflate:false});
 server.on('upgrade',(req,socket,head)=>{
  if(req.url!=='/socket'||!origins.includes(req.headers.origin)||room.draining||wss.clients.size>=32){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
  wss.handleUpgrade(req,socket,head,ws=>room.connect(ws));
 });
 return {server,room,wss,async stop(){await room.stop();for(const ws of wss.clients)ws.terminate();await new Promise(resolve=>server.close(resolve));}};
}
if(require.main===module){
 const secret=process.env.ARENA_TICKET_SECRET;if(!secret||secret.length<32)throw new Error('ARENA_TICKET_SECRET is required');
 const origins=(process.env.ARENA_ORIGINS||'https://dark-coin.com,https://www.dark-coin.com,https://dark-coin-dc4a3.web.app').split(',');
 const db=getFirestore(initializeApp({projectId:process.env.GCLOUD_PROJECT||'dark-coin-dc4a3'}));
 const app=createServer({store:new FirestoreRoomStore(db,{roomId:process.env.ARENA_ROOM_ID}),secret,origins});
 app.server.listen(Number(process.env.PORT)||8080,'0.0.0.0');
 process.on('SIGTERM',()=>{const deadline=setTimeout(()=>process.exit(0),8500);deadline.unref();void app.stop().then(()=>process.exit(0));});
}
