// Measurements use the exact baked paths consumed by authoritative combat.
import paths from './weapon-paths.json';
import {bladeAt} from './simulation';
import {WEAPONS,UNARMED} from '../../components/contracts/Arena/arenaBalanceV1';

export const weaponIds=Object.keys(paths);
export const weaponSpec=id=>id==='unarmed'?UNARMED:WEAPONS[id];
export const motionFor=id=>paths[id];
export const sampleBlade=bladeAt;
const deg=n=>n*180/Math.PI;
const bearing=p=>deg(Math.atan2(p[0],p[2]));
const unwrap=(angle,last)=>last==null?angle:last+((angle-last+540)%360)-180;
const bounds=values=>({min:Math.min(...values),max:Math.max(...values)});

export function analyzeAttack(id){
 const spec=weaponSpec(id),motion=motionFor(id);
 const result={id,name:spec.name,kind:spec.attackKind,cycleSeconds:spec.cycleSeconds,damageType:spec.damageType,sourceFrames:motion.frames.length};
 if(spec.attackKind==='projectile'){
  const release=motion.windows[0].release;
  return {...result,releasePhase:release,releaseSeconds:release*spec.cycleSeconds,origin:bladeAt(id,release,null).outer,
   projectile:{...spec.projectile,radiusM:spec.projectile.widthM/2,flightSeconds:spec.projectile.maxRangeM/spec.projectile.speedMps,headingDegrees:0}};
 }
 result.hitRadiusM=spec.hitRadiusM;result.targetCenterReachCapM=spec.reachM+.28;
 result.strikes=motion.windows.map((w,index)=>{
  const samples=[],tipAngles=[],axisAngles=[],pitch=[],radii=[],heights=[],hitboxAngles=[];let surroundsRoot=false;
  const count=Math.ceil((w.end-w.start)*480);
  for(let i=0;i<=count;i++){
   const phase=w.start+(w.end-w.start)*i/count,b=bladeAt(id,phase,w.side);
   const axis=b.outer.map((n,j)=>n-b.inner[j]);
   tipAngles.push(unwrap(bearing(b.outer),tipAngles.at(-1)));
   const dx=b.outer[0]-b.inner[0],dz=b.outer[2]-b.inner[2],length2=dx*dx+dz*dz;
   const t=length2?Math.max(0,Math.min(1,-(b.inner[0]*dx+b.inner[2]*dz)/length2)):0;
   if(Math.hypot(b.inner[0]+dx*t,b.inner[2]+dz*t)<=spec.hitRadiusM)surroundsRoot=true;
   for(const point of [b.inner,b.outer]){
    const d=Math.hypot(point[0],point[2]),angle=unwrap(bearing(point),tipAngles.at(-1));
    const half=deg(Math.asin(Math.min(1,spec.hitRadiusM/Math.max(d,1e-10))));
    hitboxAngles.push(angle-half,angle+half);
   }
   axisAngles.push(unwrap(bearing(axis),axisAngles.at(-1)));
   pitch.push(deg(Math.atan2(axis[1],Math.hypot(axis[0],axis[2]))));
   radii.push(Math.hypot(b.outer[0],b.outer[2]));heights.push(b.inner[1],b.outer[1]);
   samples.push({phase,...b});
  }
  const azimuth=bounds(tipAngles),radius=bounds(radii);
  return {index:index+1,side:w.side||motion.frames[0][0].side,startPhase:w.start,endPhase:w.end,
   startSeconds:w.start*spec.cycleSeconds,endSeconds:w.end*spec.cycleSeconds,
   startDegrees:tipAngles[0],endDegrees:tipAngles.at(-1),minDegrees:azimuth.min,maxDegrees:azimuth.max,
   sweepDegrees:azimuth.max-azimuth.min,netDegrees:tipAngles.at(-1)-tipAngles[0],
   projectedHitboxSpanDegrees:surroundsRoot?360:Math.min(360,Math.max(...hitboxAngles)-Math.min(...hitboxAngles)),projectionCrossesRoot:surroundsRoot,
   travelDegrees:tipAngles.slice(1).reduce((sum,a,i)=>sum+Math.abs(a-tipAngles[i]),0),
   bladeYawDegrees:bounds(axisAngles),bladePitchDegrees:bounds(pitch),tipRadiusM:radius,endpointHeightM:bounds(heights),
   colliderOuterRadiusM:radius.max+spec.hitRadiusM,
   effectiveTargetCenterRadiusUpperBoundM:Math.min(radius.max+spec.hitRadiusM+.28,result.targetCenterReachCapM),samples};
 });
 return result;
}
