const T=require('three'),s=require('../tmp/combo-audit-bundle.cjs'),gaits=require('../public/arena/playground/assets/combat.json');
const p=m=>new T.Vector3().setFromMatrixPosition(m);
for(const id of [...Object.keys(s.WEAPONS),'unarmed']){
 const data=id==='scythe'?null:require('../public/arena/playground/assets/weapons/'+(id==='unarmed'?'snake_wings':id)+'.json'),evaluate=(action,t)=>data?s.composeWeaponPose(data,gaits,'Walk',.31,action,t):s.composeMovingPose(gaits,'Walk',.31,action,t),bones=data?.weapon_bones||{R:'weapon'},held=evaluate('Swing',1).pose,c=s.weaponCombo(id);
 let maxError=0,phase=0,endError=0,minElbow=180;
 for(let i=0;i<=300;i++){
  const t=i/300,pose=evaluate('Swing2',t).pose;
  if(c.family!=='fist'&&c.family!=='bow'&&c.family!=='thrust'&&t>=.28&&t<.73)for(const [side,bone] of Object.entries(bones)){
   const grip=held[bone].clone().invert().multiply(held['hand.'+side]),target=pose[bone].clone().multiply(grip),error=p(target).distanceTo(p(pose['hand.'+side]));if(error>maxError){maxError=error;phase=t;}
  }
  if(t>.99)for(const side of ['L','R'])endError=Math.max(endError,p(pose['hand.'+side]).distanceTo(p(held['hand.'+side])));
  for(const side of ['L','R']){const shoulder=p(pose['upper_arm.'+side]),elbow=p(pose['forearm.'+side]),hand=p(pose['hand.'+side]);minElbow=Math.min(minElbow,shoulder.sub(elbow).angleTo(hand.sub(elbow))*180/Math.PI);}
 }
 console.log(id,{maxGripErrorM:+maxError.toFixed(4),phase,endError:+endError.toFixed(4),minElbowDeg:+minElbow.toFixed(1)});
}
