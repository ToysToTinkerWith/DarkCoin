/** Pure authoritative simulation. Times are seconds, world units are metres.
 * Firestore transactions serialize rooms; stored RNG state makes retries deterministic.
 * The only client inputs are movement intent, facing and action requests.
 */
import {ARENA_RULES as RULES,UNARMED,buildArenaStats,applyStatBonuses,attackTiming,abilityTiming,
  potentStatus,tryStatusProc,rollDice,criticalProfile,mitigatedDamage,combinedPower} from '../../components/contracts/Arena/arenaBalanceV1';
import {baselineSpell,baselineTiming,validateBaselineSpell} from '../../components/contracts/Arena/baselineSpells';
import paths from './weapon-paths.json';
import {movePlayer} from './movement';
import {sampleJump} from './jump';

export const ROOM_LIMIT=8,ARENA_RADIUS=13.4,INPUT_LEASE=.65,DISCONNECT_SECONDS=12;
const STEP=1/30,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const profiles=new Map();
const dummyProfile=buildArenaStats({skin:'Light Skin',weapon:null,head:null,armour:null,magic:null,extra:null});
dummyProfile.perks=[];dummyProfile.stats={...dummyProfile.stats,maxHealth:1000,tenacityPct:0,critBonusReductionPct:0};
for(const key of Object.keys(dummyProfile.stats))if(key.endsWith('Resistance'))dummyProfile.stats[key]=0;
export function createDummy(now){return {id:'training-dummy',isDummy:true,x:0,z:0,yaw:0,hp:1000,statuses:{},buffs:{},barriers:[],action:null,carry:'Carry',stunnedUntil:0,lastCombat:now};}
const combatTargets=room=>[...Object.values(room.players),...(room.dummy?[room.dummy]:[])];
const targetExists=(room,p)=>!!room.players[p.id]||(p.isDummy&&room.dummy===p);

function profile(p){if(p.isDummy)return dummyProfile;const key=JSON.stringify(p.champion.loadout);if(!profiles.has(key)){if(profiles.size>512)profiles.clear();profiles.set(key,buildArenaStats(p.champion.loadout));}return profiles.get(key);}
export function createRoom(now,seed){return {version:3,time:now,rng:seed>>>0,serial:0,players:{},dummy:createDummy(now),projectiles:[],fields:[],events:[]};}
function random(room){let t=room.rng=(room.rng+0x6D2B79F5)>>>0;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
function emit(room,type,data){room.events.push({id:++room.serial,time:room.time,type,...data});}
function bounded(p){const d=Math.hypot(p.x,p.z);if(d>ARENA_RADIUS){p.x*=ARENA_RADIUS/d;p.z*=ARENA_RADIUS/d;}}
export function addPlayer(room,id,champion){
 if(Object.keys(room.players).length>=ROOM_LIMIT)throw new Error('This arena is full. Please try again shortly.');
 if(Object.values(room.players).some(p=>p.champion.id===champion.id))throw new Error('This champion is already in the arena.');
 validateBaselineSpell(champion.baselineSpell);
 const {stats,selected}=buildArenaStats(champion.loadout);
 let spawn={x:0,z:10},best=-1;
 for(let i=0;i<16;i++){const q={x:10*Math.sin(i*Math.PI/8),z:10*Math.cos(i*Math.PI/8)},distance=Math.min(30,...Object.values(room.players).map(p=>Math.hypot(q.x-p.x,q.z-p.z)));if(distance>best){best=distance;spawn=q;}}
 const p={id,champion,...spawn,yaw:Math.atan2(-spawn.x,-spawn.z),hp:stats.maxHealth,stamina:stats.maxStamina,
  carry:selected.weapon.permanent?'Hold':'Carry',jumpStart:null,y:0,action:null,statuses:{},buffs:{},barriers:[],
  baselineCooldownUntil:0,baselineCastId:null,baselineRefund:0,baselineCooldownStart:0,baselineBaseCooldown:0,
  cooldownUntil:0,magicCastId:null,magicRefund:0,magicCooldownStart:0,magicBaseCooldown:0,
  input:{x:0,z:0,yaw:0,run:false},lastInput:room.time,lastSeen:room.time,lastSeq:-1,
  lastCombat:room.time,lastSprint:-1e6,stationarySince:room.time,vx:0,vz:0,running:false,stunnedUntil:0};
 p.input.yaw=p.yaw;room.players[id]=p;emit(room,'joined',{playerId:id});trigger(room,p,'roundStarted',{});return p;
}
export function removePlayer(room,id,reason='left',killerId=null){
 if(!room.players[id])return;
 delete room.players[id];room.projectiles=room.projectiles.filter(p=>p.owner!==id);room.fields=room.fields.filter(p=>p.owner!==id);
 emit(room,reason==='defeated'?'death':'left',{playerId:id,killerId,reason});
}
function qualifies(c,p,target,ctx={}){
 const max=profile(p).stats.maxHealth;
 if(c.selfHealthBelowPct!=null&&p.hp/max*100>=c.selfHealthBelowPct)return false;
 if(c.crossedBelowHealthPct!=null&&!(ctx.beforeHp/max*100>=c.crossedBelowHealthPct&&p.hp/max*100<c.crossedBelowHealthPct))return false;
 if(c.source&&c.source!==ctx.source)return false;
 if(c.critical!=null&&c.critical!==ctx.critical)return false;
 if(c.movingAtCommit&&!ctx.movingAtCommit)return false;
 if(c.stationarySecondsAtLeast!=null&&(ctx.stationarySeconds??0)<c.stationarySecondsAtLeast)return false;
 if(c.targetHasStatus&&!target?.statuses[c.targetHasStatus])return false;
 if(c.targetHealthBelowPct!=null&&(!target||target.hp/profile(target).stats.maxHealth*100>=c.targetHealthBelowPct))return false;
 if(c.targetDistanceMAtLeast!=null&&(!target||Math.hypot(p.x-target.x,p.z-target.z)<c.targetDistanceMAtLeast))return false;
 if(c.incomingAttackKinds&&!c.incomingAttackKinds.includes(ctx.attackKind))return false;
 if(c.appliedStatusIds&&!c.appliedStatusIds.includes(ctx.statusId))return false;
 return true;
}
function statsFor(p,target=null,ctx={}){
 let stats={...profile(p).stats};
 const bonuses={};
 for(const b of Object.values(p.buffs))for(const [k,v] of Object.entries(b.stats))bonuses[k]=(bonuses[k]||0)+v;
 for(const perk of profile(p).perks)if(perk.trigger==='conditional'&&!(ctx.unarmed&&perk.slot==='weapon')&&qualifies(perk.condition,p,target,ctx))for(const [k,v] of Object.entries(perk.statBonuses))bonuses[k]=(bonuses[k]||0)+v;
 stats=applyStatBonuses(stats,bonuses);
 if(p.statuses.exposed)for(const k of Object.keys(stats))if(k.endsWith('Resistance'))stats[k]=Math.max(0,stats[k]-p.statuses.exposed.allResistanceReduction);
 return stats;
}
function context(p,source){return {source,movingAtCommit:Math.hypot(p.vx,p.vz)>.05,stationarySeconds:Math.max(0,p.lastSeen-p.stationarySince)};}
function trigger(room,p,event,ctx){
 if(!room.players[p.id]||p.hp<=0)return;
 for(const perk of profile(p).perks){
  if(ctx.unarmed&&perk.slot==='weapon')continue;
  if(perk.trigger!==event||perk.handler||!qualifies(perk.condition||{},p,ctx.target,ctx))continue;
  if(perk.chance!=null&&random(room)>=perk.chance)continue;
  const key=perk.slot+':'+perk.id;
  for(const a of perk.actions||[]){
   if(a.type==='buff')p.buffs[key]={stats:a.stats,until:room.time+a.durationSeconds};
   else if(a.type==='heal')p.hp=Math.min(profile(p).stats.maxHealth,p.hp+a.amount);
   else if(a.type==='restoreStamina')p.stamina=Math.min(profile(p).stats.maxStamina,p.stamina+a.amount);
   else if(a.type==='barrier'){const amount=Math.min(a.amount,30-p.barriers.reduce((v,b)=>v+b.hp,0));if(amount>0)p.barriers.push({hp:amount,until:room.time+a.durationSeconds});}
   else if(a.type==='cleanse'){
    const eligible=Object.values(p.statuses).filter(s=>a.statusIds==='allCleanseable'?s.cleanseable:a.statusIds.includes(s.id)).sort((a,b)=>a.appliedAt-b.appliedAt);
    for(const s of eligible.slice(0,a.maxRemoved||1))delete p.statuses[s.id];
   }else if(a.type==='applyStatus'){
    const target=a.target==='target'?ctx.target:ctx.attacker;
    if(target&&targetExists(room,target))applyStatus(room,p,target,a.id,a.potency??1,ctx.source||'weapon',!['debuffApplied','directDamageTaken','criticalDamageTaken'].includes(event));
   }else if(a.type==='refundAbilityCooldown'){
    const baseline=p.baselineCastId&&ctx.castId===p.baselineCastId;
    const prefix=baseline?'baseline':'magic',cooldown=baseline?'baselineCooldownUntil':'cooldownUntil';
    if(!p[prefix+'CastId']||ctx.castId!==p[prefix+'CastId'])continue;
    const grant=Math.min(a.seconds,2-p[prefix+'Refund']);p[prefix+'Refund']+=Math.max(0,grant);
    if(p[prefix+'CooldownStart'])p[cooldown]=p[prefix+'CooldownStart']+Math.max(4,p[prefix+'BaseCooldown']-p[prefix+'Refund']);
   }
  }
 }
}
export function applyStatus(room,source,target,id,potency,sourceKind,react=true){
 const incoming=potentStatus(id,potency),old=target.statuses[id]?.until>room.time?target.statuses[id]:null;
 const totalPotency=(old?.potency||0)+incoming.potency;
 const s=potentStatus(id,totalPotency,true),st=statsFor(source),def=statsFor(target);
 s.stacks=(old?.stacks||(old?1:0))+1;s.source=source.id;s.appliedAt=room.time;
 const power=(1+combinedPower(st,sourceKind)/100)*(1-(source.statuses.weaken?.powerReductionPct||0)/100);
 s.powerMultiplier=((old?.potency||0)*(old?.powerMultiplier??1)+incoming.potency*power)/totalPotency;
 const duration=s.durationSeconds*(s.kind==='dot'?1:1-def.tenacityPct/100);s.until=room.time+duration;
 target.statuses[id]=s;
 if(s.kind==='displacement'&&!target.isDummy){
  const dx=target.x-source.x,dz=target.z-source.z,d=Math.hypot(dx,dz)||1;
  target.push={x:dx/d*s.distanceM/duration,z:dz/d*s.distanceM/duration,until:s.until};
 }else if(s.kind==='interrupt'&&!target.isDummy){
  target.stunnedUntil=Math.max(target.stunnedUntil,s.until);
  if(target.action&&!target.action.cancelled){target.action.cancelled=true;if(target.action.kind==='Cast')startMagicCooldown(room,target,target.action);}
 }
 emit(room,'status',{playerId:target.id,sourceId:source.id,statusId:id,potency:s.potency,stacks:s.stacks,until:s.until,x:target.x,z:target.z});
 if(react)trigger(room,target,'debuffApplied',{statusId:id,attacker:source,source:sourceKind});
}
function damage(room,source,target,amount,meta={}){
 const beforeHp=target.hp;let remaining=amount;
 target.barriers.sort((a,b)=>a.until-b.until);for(const b of target.barriers){const take=Math.min(b.hp,remaining);b.hp-=take;remaining-=take;}
 target.hp=Math.max(0,target.hp-remaining);target.lastCombat=room.time;if(source)source.lastCombat=room.time;
 if(meta.periodic){
  target.periodicLabel=(target.periodicLabel||0)+(beforeHp-target.hp);
  if(room.time-(target.lastPeriodicLabel||0)>=1){emit(room,'hit',{playerId:target.id,sourceId:source?.id||null,amount:target.periodicLabel,critical:false,damageType:meta.damageType,x:target.x,z:target.z});target.periodicLabel=0;target.lastPeriodicLabel=room.time;}
 }else emit(room,'hit',{playerId:target.id,sourceId:source?.id||null,amount:beforeHp-target.hp,absorbed:amount-remaining,critical:!!meta.critical,damageType:meta.damageType||'blunt',x:target.x,z:target.z});
 if(target.hp<=0&&target.isDummy){target.hp=1000;emit(room,'dummyReset',{playerId:target.id});}
 if(target.hp<=0){removePlayer(room,target.id,'defeated',source?.id);return false;}
 if(!meta.periodic&&remaining>0){const ctx={...meta,beforeHp,attacker:source,target:source};trigger(room,target,'directDamageTaken',ctx);if(meta.critical)trigger(room,target,'criticalDamageTaken',ctx);}
 return true;
}
function directHit(room,source,target,attack,strikeIndex){
 const ctx={...attack.context,target,attackKind:attack.spec.attackKind,castId:attack.id};
 const critStats=statsFor(source,target,ctx),critical=random(room)<criticalProfile(critStats).chance;
 const stats=statsFor(source,target,{...ctx,critical}),def=statsFor(target),roll=rollDice(attack.spec.damageRolls?.[strikeIndex]||attack.spec.damageRoll,()=>random(room));
 const multiplier=critical?1+(criticalProfile(stats).multiplier-1)*(1-def.critBonusReductionPct/100):1;
 let amount=mitigatedDamage(roll.total*multiplier,attack.spec.damageType,stats,def,attack.spec.powerSource)*(1-(source.statuses.weaken?.powerReductionPct||0)/100);
 const guard=profile(target).selected.weapon.guard;
 if(guard&&target.carry==='Hold'&&!target.action){const angle=Math.atan2(source.x-target.x,source.z-target.z)-target.yaw;if(Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))<guard.frontConeDegrees*Math.PI/360)amount*=1-guard.damageReductionPct/100;}
 const alive=damage(room,source,target,amount,{...ctx,critical,damageType:attack.spec.damageType});attack.hitCount=(attack.hitCount||0)+1;
 const event=ctx.source==='ability'?'abilityHit':'weaponHit';
 trigger(room,source,event,{...ctx,critical});trigger(room,source,'directHit',{...ctx,critical});
 if(critical)trigger(room,source,ctx.source==='ability'?'abilityCritical':'weaponCritical',{...ctx,critical});
 if(alive)for(const effect of attack.spec.onHit)if(tryStatusProc(effect,{strikeIndex},()=>random(room)).applied)applyStatus(room,source,target,effect.id,effect.potency,attack.spec.powerSource);
}
export function command(room,id,input,now){
 advance(room,now);return applyInput(room,id,input,Math.max(now,room.time));
}
// The WebSocket worker ticks separately; receiving input must not advance time.
export function applyInput(room,id,input,now=room.time){
 const p=room.players[id];if(!p)return {error:'Your champion is no longer in the arena.',gone:true};
 if(!Number.isSafeInteger(input.seq)||input.seq<=p.lastSeq)return {duplicate:true};
 if(![input.x,input.z,input.yaw].every(Number.isFinite))throw new Error('Invalid movement.');
 p.lastSeq=input.seq;p.lastSeen=now;p.lastInput=now;
 const len=Math.max(1,Math.hypot(input.x,input.z));p.input={x:clamp(input.x/len,-1,1),z:clamp(input.z/len,-1,1),yaw:Math.atan2(Math.sin(input.yaw),Math.cos(input.yaw)),run:input.run===true};
 if(!input.action)return {};
 if(input.action==='jump'){
  if(p.stunnedUntil>now)return {error:'Cannot jump while stunned.'};
  if(sampleJump(p.jumpStart,now).active)return {error:'Land before jumping again.'};
  p.jumpStart=now;return {};
 }
 if(p.action||p.stunnedUntil>now)return {error:'Finish the current action first.'};
 const {selected}=profile(p),unarmed=input.action==='attack'&&p.carry!=='Hold',spec=unarmed?UNARMED:selected.weapon,ctx={...context(p,['cast','baseline'].includes(input.action)?'ability':'weapon'),unarmed};
 const baseline=input.action==='baseline',spell=baseline?baselineSpell(p.champion.baselineSpell):selected.magic;
 const stats=statsFor(p,null,ctx),motion=paths[unarmed?'unarmed':p.champion.loadout.weapon||'unarmed'];
 let kind,duration;
 if(input.action==='attack'){kind='Swing';duration=attackTiming(unarmed?null:p.champion.loadout.weapon,motion.durations.Swing,stats.hastePct).durationSeconds;}
 else if(input.action==='toggle'){if(spec.permanent)return {error:'This champion is always ready.'};kind=p.carry==='Carry'?'Draw':'Stow';duration=motion.durations[kind];}
 else if(input.action==='cast'||baseline){if(!spell)return {error:baseline?'Choose a baseline spell before entering.':'This champion has no magic trait equipped.'};if((baseline?p.baselineCooldownUntil:p.cooldownUntil)>now)return {error:'Your magic is still recovering.'};kind='Cast';duration=(baseline?baselineTiming:abilityTiming)(spell.id,stats.cooldownReductionPct,stats.castSpeedPct).castSeconds;}
 else return {error:'Unknown action.'};
 const action={id:++room.serial,kind,start:now,duration,hits:{},hitCount:0,released:false,context:ctx,baseline,unarmed,spec:kind==='Cast'?spell:spec};
 if(kind==='Cast'){const prefix=baseline?'baseline':'magic';p[prefix+'CastId']=action.id;p[prefix+'Refund']=0;p[prefix+'CooldownStart']=0;p[prefix+'BaseCooldown']=(baseline?baselineTiming:abilityTiming)(spell.id,stats.cooldownReductionPct,stats.castSpeedPct).cooldownSeconds;}
 p.action=action;p.lastCombat=now;emit(room,'action',{playerId:id,action:kind});return {};
}
function startMagicCooldown(room,p,a){const prefix=a.baseline?'baseline':'magic';if(p[prefix+'CooldownStart'])return;p[prefix+'CooldownStart']=room.time;p[a.baseline?'baselineCooldownUntil':'cooldownUntil']=room.time+Math.max(4,p[prefix+'BaseCooldown']-p[prefix+'Refund']);}
function localPoint(point,p){const [x,y,z]=point,c=Math.cos(p.yaw),s=Math.sin(p.yaw);return [p.x+x*c+z*s,y+(p.y||0),p.z-x*s+z*c];}
function lerp(a,b,t){return a.map((n,i)=>n+(b[i]-n)*t);}
export function bladeAt(weaponId,phase,side){
 const frames=paths[weaponId||'unarmed'].frames,f=clamp(phase,0,1)*(frames.length-1),i=Math.floor(f),a=frames[i].find(s=>side==null||s.side===side),b=frames[Math.min(i+1,frames.length-1)].find(s=>s.side===a?.side);
 return a?{inner:lerp(a.inner,b.inner,f-i),outer:lerp(a.outer,b.outer,f-i)}:null;
}
// Segment against the vertical body capsule. Sampling the short blade segment at
// <=4cm intervals gives a conservative, bounded collision error, not a facing cone.
export function capsuleHit(a,b,target,radius){const n=Math.max(1,Math.ceil(Math.hypot(...a.map((v,i)=>v-b[i]))/.04));for(let i=0;i<=n;i++){const q=lerp(a,b,i/n),dy=q[1]-clamp(q[1],.4+(target.y||0),1.65+(target.y||0));if((q[0]-target.x)**2+(q[2]-target.z)**2+dy*dy<=(.28+radius)**2)return true;}return false;}
function spawnProjectile(room,p,a,phase){
 const magic=a.kind==='Cast',socket=bladeAt(p.champion.loadout.weapon,phase,null);
 // Spells gather above/in front of the shoulder, then descend toward chest height.
 const origin=magic?localPoint(a.baseline?[0,1.5,.65]:[-.32,2.03,.28],p):localPoint(socket?.outer||[0,1.3,.45],p),spec=a.spec.projectile;
 const projectile={id:++room.serial,owner:p.id,actionId:a.id,source:magic?'ability':'weapon',traitId:magic?a.spec.id:p.champion.loadout.weapon,
  x:origin[0],y:origin[1],z:origin[2],dx:Math.sin(p.yaw),dy:magic&&!a.baseline?-.065:0,dz:Math.cos(p.yaw),distance:0,
  speed:spec.speedMps,width:spec.widthM,range:spec.maxRangeM,damageType:a.spec.damageType,attack:JSON.parse(JSON.stringify(a)),spawnedAt:room.time};
 room.projectiles.push(projectile);emit(room,'projectile',{projectileId:projectile.id,playerId:p.id});
}
function fieldAt(room,projectile){const spec=projectile.attack.spec.impactField;if(!spec)return;
 room.fields=room.fields.filter(f=>f.owner!==projectile.owner);const owner=room.players[projectile.owner];if(!owner)return;
 room.fields.push({id:++room.serial,owner:owner.id,x:projectile.x,z:projectile.z,radius:spec.radiusM,until:room.time+spec.durationSeconds,
  rate:rollDice(spec.damageRateRoll,()=>random(room)).total*(1+combinedPower(statsFor(owner),'ability')/100),damageType:spec.damageType});
}

function releaseSpell(room,p,a){
 const spec=a.spec;
 if(spec.kind==='heal'){
  const stats=statsFor(p),critical=random(room)<criticalProfile(stats).chance;
  const amount=rollDice(spec.healRoll,()=>random(room)).total*(1+combinedPower(stats,'ability')/100)*(critical?criticalProfile(stats).multiplier:1);
  const before=p.hp;p.hp=Math.min(profile(p).stats.maxHealth,p.hp+amount);
  p.buffs['baseline:'+spec.id]={stats:spec.buff.stats,until:room.time+spec.buff.durationSeconds,spellId:spec.id};
  emit(room,'heal',{playerId:p.id,spellId:spec.id,amount:p.hp-before,critical,x:p.x,z:p.z});
 }else if(spec.kind==='area'){
  const center=a.areaCenter||localPoint([0,0,spec.area.distanceM],p);
  emit(room,'spellBurst',{playerId:p.id,spellId:spec.id,x:center[0],z:center[2],radius:spec.area.radiusM});
  for(const target of combatTargets(room))if(target!==p&&Math.hypot(target.x-center[0],target.z-center[2])<=spec.area.radiusM+.28)directHit(room,p,target,a,0);
 }else spawnProjectile(room,p,a,spec.releasePhase);
}

function step(room,dt){
 room.time+=dt;
 if(room.dummy)for(const [id,s] of Object.entries(room.dummy.statuses))if(s.until<=room.time)delete room.dummy.statuses[id];
 for(const p of Object.values(room.players)){
  if(room.time-p.lastSeen>DISCONNECT_SECONDS){removePlayer(room,p.id,'disconnected');continue;}
  for(const [id,s] of Object.entries(p.statuses))if(s.until<=room.time)delete p.statuses[id];
  for(const [id,b] of Object.entries(p.buffs))if(b.until<=room.time)delete p.buffs[id];
  p.barriers=p.barriers.filter(b=>b.until>room.time&&b.hp>0);
  const stats=statsFor(p),input=room.time-p.lastInput<=INPUT_LEASE?p.input:{x:0,z:0,run:false,yaw:p.yaw};
  movePlayer(p,input,dt,room.time,movementModifiers(p,stats));
 }
 // Same-size body collision for every skin, independent of equipment geometry.
 const players=Object.values(room.players);for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){const a=players[i],b=players[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d<.58){const nx=d?dx/d:1,nz=d?dz/d:0,offset=(.58-d)/2;a.x-=nx*offset;a.z-=nz*offset;b.x+=nx*offset;b.z+=nz*offset;bounded(a);bounded(b);}}
 for(const p of Object.values(room.players)){
  const a=p.action;if(!a)continue;
  const phase=clamp((room.time-a.start)/a.duration,0,1),previous=clamp((room.time-dt-a.start)/a.duration,0,1),motion=paths[a.unarmed?'unarmed':p.champion.loadout.weapon||'unarmed'];
  if(!a.cancelled){
   if(a.spec.kind==='area'&&!a.areaCenter&&phase>=a.spec.area.windupPhase){a.areaCenter=localPoint([0,0,a.spec.area.distanceM],p);emit(room,'spellTelegraph',{playerId:p.id,spellId:a.spec.id,x:a.areaCenter[0],z:a.areaCenter[2],radius:a.spec.area.radiusM,until:a.start+a.duration*a.spec.releasePhase});}
   if(a.kind==='Cast'||(a.kind==='Swing'&&a.spec.projectile)){
    const release=a.kind==='Cast'?a.spec.releasePhase:motion.windows[0].release;
    if(!a.released&&phase>=release){a.released=true;if(a.kind==='Cast')releaseSpell(room,p,a);else spawnProjectile(room,p,a,release);}
   }else if(a.kind==='Swing')motion.windows.forEach((window,strike)=>{
    if(phase<window.start||previous>window.end)return;
    const lo=Math.max(previous,window.start),hi=Math.min(phase,window.end),count=Math.max(1,Math.ceil((hi-lo)*240));
    for(let i=0;i<=count;i++){
     const blade=bladeAt(a.unarmed?null:p.champion.loadout.weapon,lo+(hi-lo)*i/count,window.side);if(!blade)continue;
     for(const q of combatTargets(room)){
      const key=strike+':'+q.id;if(q===p||a.hits[key]||Math.hypot(q.x-p.x,q.z-p.z)>a.spec.reachM+.28)continue;
      if(capsuleHit(localPoint(blade.inner,p),localPoint(blade.outer,p),q,a.spec.hitRadiusM)){a.hits[key]=true;directHit(room,p,q,a,strike);}
     }
    }
   });
  }
  if(phase>=1){
   p.action=null;
   if(a.kind==='Cast'){startMagicCooldown(room,p,a);if(!a.cancelled)trigger(room,p,'abilityFinished',{source:'ability',castId:a.id});}
   else if(a.kind==='Draw'||a.kind==='Stow'){if(!a.cancelled){p.carry=a.kind==='Draw'?'Hold':'Carry';trigger(room,p,a.kind==='Draw'?'weaponDrawn':'weaponStowed',{});}}
   else if(a.kind==='Swing'&&!a.hitCount&&!a.spec.projectile)trigger(room,p,'weaponMissed',{source:'weapon',unarmed:!!a.unarmed});
  }
 }
 for(const projectile of [...room.projectiles]){
  const owner=room.players[projectile.owner];if(!owner)continue;
  const distance=Math.min(projectile.speed*dt,projectile.range-projectile.distance),old=[projectile.x,projectile.y,projectile.z];
  projectile.x+=projectile.dx*distance;projectile.y+=projectile.dy*distance;projectile.z+=projectile.dz*distance;projectile.distance+=distance;
  const candidates=combatTargets(room).filter(q=>q!==owner&&capsuleHit(old,[projectile.x,projectile.y,projectile.z],q,projectile.width/2)).sort((a,b)=>Math.hypot(a.x-old[0],a.z-old[2])-Math.hypot(b.x-old[0],b.z-old[2]));
  const target=candidates[0],ended=!!target||projectile.distance>=projectile.range||Math.hypot(projectile.x,projectile.z)>=14;
  if(target)directHit(room,owner,target,projectile.attack,0);
  if(ended){fieldAt(room,projectile);room.projectiles=room.projectiles.filter(v=>v.id!==projectile.id);if(!target&&projectile.source==='weapon')trigger(room,owner,'weaponMissed',{source:'weapon'});}
 }
 room.fields=room.fields.filter(f=>f.until>room.time);
 for(const p of combatTargets(room)){
  const rates=Object.values(p.statuses).filter(s=>s.kind==='dot').map(s=>({source:s.source,type:s.damageType,rate:s.damagePerSecond*s.powerMultiplier}));
  for(const f of room.fields)if(f.owner!==p.id&&Math.hypot(f.x-p.x,f.z-p.z)<=f.radius+.28)rates.push({source:f.owner,type:f.damageType,rate:f.rate});
  for(const r of rates){if(!targetExists(room,p))break;const amount=mitigatedDamage(r.rate*dt,r.type,{},statsFor(p));damage(room,room.players[r.source],p,amount,{periodic:true,damageType:r.type});}
  if(targetExists(room,p)&&!rates.length&&room.time-p.lastCombat>=6)p.hp=p.isDummy?1000:Math.min(profile(p).stats.maxHealth,p.hp+8*dt);
 }
}
export function advance(room,now){
 if(!Number.isFinite(now)||now<room.time)return;
 // Inputs expire quickly. Disconnected rooms have no active players after 12s;
 // bound catch-up CPU to those 12 seconds, then fast-forward an empty room.
 const end=Math.min(now,room.time+DISCONNECT_SECONDS+STEP);
 while(end-room.time>1e-6)step(room,Math.min(STEP,end-room.time));
 if(now>room.time)room.time=now;
 room.events=room.events.filter(e=>room.time-e.time<5).slice(-160);
}
function movementModifiers(p,stats=statsFor(p)){
 return {walk:RULES.movement.walkMps,run:RULES.movement.runMps,speedPct:stats.moveSpeedPct,
  sprintCost:stats.sprintCostReductionPct,regen:stats.staminaRegenPct,maxStamina:stats.maxStamina,
  slow:Math.max(0,...Object.values(p.statuses).map(s=>s.slowPct||0)),guard:profile(p).selected.weapon.guard?.moveSpeedPenaltyPct||0,
  stunnedUntil:p.stunnedUntil,push:p.push||null};
}
export function realtimeSnapshot(room){
 const state=snapshot(room);
 for(const p of Object.values(room.players))Object.assign(state.players[p.id],{motion:movementModifiers(p),lastSprint:p.lastSprint,ack:p.lastSeq});
 return state;
}
export function snapshot(room){return {dummy:room.dummy?{id:room.dummy.id,x:0,z:0,hp:room.dummy.hp,maxHealth:1000,statuses:Object.values(room.dummy.statuses).map(s=>({id:s.id,potency:s.potency,stacks:s.stacks||1,until:s.until}))}:null,time:room.time,version:room.version,capacity:ROOM_LIMIT,
 players:Object.fromEntries(Object.values(room.players).map(p=>[p.id,{id:p.id,champion:p.champion,x:p.x,z:p.z,yaw:p.yaw,vx:p.vx,vz:p.vz,running:p.running,hp:p.hp,maxHealth:profile(p).stats.maxHealth,stamina:p.stamina,maxStamina:profile(p).stats.maxStamina,barrier:p.barriers.reduce((n,b)=>n+b.hp,0),carry:p.carry,jumpStart:p.jumpStart??null,magicCooldownStart:p.magicCooldownStart||0,baselineCooldownStart:p.baselineCooldownStart||0,cooldownUntil:p.cooldownUntil,baselineCooldownUntil:p.baselineCooldownUntil||0,buffs:Object.values(p.buffs).filter(b=>b.spellId).map(b=>({spellId:b.spellId,until:b.until})),statuses:Object.values(p.statuses).map(s=>({id:s.id,potency:s.potency,stacks:s.stacks||1,until:s.until})),action:p.action?{id:p.action.id,kind:p.action.kind,start:p.action.start,duration:p.action.duration,cancelled:!!p.action.cancelled,unarmed:!!p.action.unarmed,spellId:p.action.kind==='Cast'?p.action.spec.id:null,gesture:p.action.spec.gesture||'forward',baseline:!!p.action.baseline}:null}])),
 projectiles:room.projectiles.map(({attack,...p})=>p),fields:room.fields,events:room.events};}
