// Operator-only control. Uses existing local service credentials or ADC; never prints them.
const fs=require('fs'),path=require('path'),admin=require('firebase-admin');
const mode=process.argv[2];if(!['drain','websocket','rest','status'].includes(mode))throw new Error('Usage: node scripts/arena-control.cjs drain|websocket|rest|status');
const roomId=process.env.ARENA_ROOM_ID||'playground-realtime-v1';
if(!/^[a-z0-9-]+$/.test(roomId))throw new Error('Invalid room ID');
const local=path.resolve(__dirname,'../service.json');
admin.initializeApp({projectId:'dark-coin-dc4a3',credential:fs.existsSync(local)?admin.credential.cert(JSON.parse(fs.readFileSync(local,'utf8'))):admin.credential.applicationDefault()});
(async()=>{
 const db=admin.firestore(),control=db.collection('arenaPrivate').doc(roomId+'-control'),lease=db.collection('arenaPrivate').doc(roomId+'-lease');
 if(mode==='status'){const [c,l]=await Promise.all([control.get(),lease.get()]);console.log(JSON.stringify({control:c.data()||null,lease:l.data()||null}));return;}
 if(mode==='drain'){
  await control.set({mode:'websocket',drain:true});
  for(let i=0;i<25;i++){const d=await lease.get();if(!d.data()?.expiresAt||d.data().expiresAt<=d.readTime.toMillis()/1000){console.log('Room drained; ownership lease inactive.');return;}await new Promise(r=>setTimeout(r,1000));}
  throw new Error('Lease still active. Deployment must not proceed.');
 }
 const d=await lease.get();if(d.data()?.expiresAt>d.readTime.toMillis()/1000)throw new Error('Drain the active room before changing authority.');
 await control.set({mode,drain:false});console.log('Room transport selected: '+mode+'. Public entry flag is unchanged.');
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>admin.app().delete());
