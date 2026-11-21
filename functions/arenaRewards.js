const {onSchedule}=require('firebase-functions/v2/scheduler');
const admin=require('firebase-admin');
const {onDocumentCreated}=require('firebase-functions/v2/firestore');
function rewardDatabase(){const app=admin.apps.find(a=>a?.name==='[DEFAULT]')||admin.initializeApp();return admin.firestore(app);}
const rewardIdentity='arena-rewards@dark-coin-dc4a3.iam.gserviceaccount.com';
exports.arenaRewards=onSchedule({schedule:'every 1 minutes',region:'us-central1',memory:'256MiB',timeoutSeconds:120,maxInstances:1,serviceAccount:rewardIdentity,secrets:['ARENA_REWARD_ORACLE_MNEMONIC','ARENA_DISCORD_WEBHOOK','DEPTHS_DISCORD_WEBHOOK']},async()=>{
 if(process.env.ARENA_LOOT_ENABLED!=='true')return;
 const db=rewardDatabase();
 const {processArenaRewards,retryArenaPickups,currentEncounter,retryArenaNotices}=require('./arenaRewards.bundle.cjs');
 try{await currentEncounter(db,Number(process.env.ARENA_TREASURY_APP_ID));}catch{console.error('arena_schedule_retry_required');}
 try{await retryArenaNotices(db);}catch{console.error('arena_notifications_retry_required');}
 try{await processArenaRewards(db);}
 finally{await retryArenaPickups(db);}
});
// New defeats publish immediately; the minute scheduler recovers failures.
exports.arenaLootEvents=onDocumentCreated({document:'arenaPrivate/loot-jobs/jobs/{job}',region:'us-central1',memory:'256MiB',timeoutSeconds:120,maxInstances:2,serviceAccount:rewardIdentity,secrets:['ARENA_REWARD_ORACLE_MNEMONIC'],retry:true},async event=>{
 if(process.env.ARENA_LOOT_ENABLED!=='true')return;
 const row=event.data?.data();if(!row||row.appId!==Number(process.env.ARENA_TREASURY_APP_ID))return;
 const db=rewardDatabase();
 const {processArenaRewards,processArenaPickup}=require('./arenaRewards.bundle.cjs');
 const task=row.kind==='publish'?()=>processArenaRewards(db):row.kind==='pickup'?()=>processArenaPickup(db,row.rewardId):null;
 if(!task)return;
 // Brief contention should not turn into Eventarc's long retry backoff.
 // Each attempt still acquires the treasury lease and uses the same durable outbox.
 for(let attempt=0;attempt<12;attempt++){
  const result=await task();
  if(!result?.busy&&result?.status!=='pending'){
   if(row.createdAt)console.log(JSON.stringify({type:'arena_loot_latency',kind:row.kind,elapsedMs:Date.now()-row.createdAt,attempts:attempt+1,status:result?.status||'published'}));
   return result;
  }
  if(attempt<11)await new Promise(resolve=>setTimeout(resolve,750+Math.floor(Math.random()*250)));
 }
 throw new Error('Treasury is busy or awaiting confirmation; retry this event.');
});

// Gameplay events are persisted before delivery; notification failures never block combat or payouts.
exports.arenaNotifications=onDocumentCreated({document:'arenaPrivate/notifications/events/{notice}',region:'us-central1',memory:'256MiB',timeoutSeconds:60,maxInstances:1,serviceAccount:rewardIdentity,secrets:['ARENA_DISCORD_WEBHOOK','DEPTHS_DISCORD_WEBHOOK']},async event=>{
 const {deliverArenaNotice}=require('./arenaRewards.bundle.cjs');
 return deliverArenaNotice(rewardDatabase(),event.params.notice);
});
