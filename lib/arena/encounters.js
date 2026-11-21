// Legacy calendar helpers remain for old reward IDs and fixtures. Production
// uses encounter-schedule.js: one persistent encounter, then a defeat-based delay.
export const ARENA_ECONOMY={entryFee:0,dragonHour:21,timeZone:'America/New_York'};
const eastern=new Intl.DateTimeFormat('en-US',{timeZone:ARENA_ECONOMY.timeZone,hour:'numeric',hourCycle:'h23'});
export function hourlyEncounter(now,mode='graveclaw'){
 const hour=Math.floor(now/3600),startsAt=hour*3600,dragon=mode==='hourly'&&Number(eastern.format(new Date(startsAt*1000)))===ARENA_ECONOMY.dragonHour;
 return {id:hour,startsAt,endsAt:startsAt+3600,kind:dragon?'cindermaw':'graveclaw',name:dragon?'Cindermaw':'Graveclaw',rewardType:'inventory_loot'};
}
export function upcomingEncounters(now,count=24){return Array.from({length:count},(_,i)=>hourlyEncounter(now+i*3600));}
export function recordContribution(room,source,damage){
 if(!room.encounter||room.encounter.status!=='active'||!source?.rewardAddress||damage<=0)return;
 const key=source.rewardAddress+':'+source.champion.id,old=room.encounter.contributions[key];
 room.encounter.contributions[key]={...old,address:source.rewardAddress,assetId:source.champion.id,damage:(old?.damage||0)+damage};
}
export function recordHealingMove(room,source){
 if(room.encounter?.status!=='active'||!source?.rewardAddress||room.beast?.hp<=0)return;
 const key=source.rewardAddress+':'+source.champion.id;
 room.encounter.contributions[key]={...room.encounter.contributions[key],address:source.rewardAddress,assetId:source.champion.id,healingMoves:(room.encounter.contributions[key]?.healingMoves||0)+1};
}
// Freeze eligibility at the instant of defeat, before survivor healing/removal.
// A damaging hit on the monster or a completed healing spell is required. Disconnected clients
// are marked by the authoritative socket layer, never by client input.
export function lootRecipients(room){
 const seen=new Set();return Object.values(room.players).filter(p=>{
  const contribution=room.encounter?.contributions?.[p.rewardAddress+':'+p.champion.id];
  if(!p.rewardAddress||p.hp<=0||p.connected===false||seen.has(p.rewardAddress)||!(contribution?.damage>0||contribution?.healingMoves>0))return false;
  seen.add(p.rewardAddress);return true;
 }).map(p=>({address:p.rewardAddress,assetId:p.champion.id})).sort((a,b)=>a.address.localeCompare(b.address));
}
