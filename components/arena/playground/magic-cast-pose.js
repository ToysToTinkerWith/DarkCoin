import {Vector3,Quaternion} from 'three';

// Add a casting gesture over locomotion using world-space joint targets.
export function applyMagicCast(model,bones,phase,side='R',gesture='forward'){
 const smooth=t=>t*t*(3-2*t),amount=phase<.6?smooth(phase/.6):1-smooth((phase-.6)/.4);
 if(amount<=0)return;
 if(!side){const head=bones.get('head');if(head)head.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),amount*.09));return;}
 const sign=side==='R'?1:-1;
 const upper=bones.get('upper_arm'+side),fore=bones.get('forearm'+side),hand=bones.get('hand'+side);
 if(!upper||!fore||!hand)return;
 model.updateWorldMatrix(true,true);
 const target=gesture==='heal'?new Vector3(sign*.38,2.23,.15):new Vector3(sign*.25,1.60,.72);model.localToWorld(target);
 const shoulder=upper.getWorldPosition(new Vector3()),elbow=fore.getWorldPosition(new Vector3()),wrist=hand.getWorldPosition(new Vector3());
 const l1=shoulder.distanceTo(elbow),l2=elbow.distanceTo(wrist),direction=target.clone().sub(shoulder),distance=Math.min(direction.length(),(l1+l2)*.98);direction.normalize();
 const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 const pole=new Vector3(sign,-.3,0).transformDirection(model.matrixWorld);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
 const wantedElbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(pole,height);
 function aim(bone,child,target){
  const origin=bone.getWorldPosition(new Vector3()),current=child.getWorldPosition(new Vector3()).sub(origin).normalize(),next=target.clone().sub(origin).normalize();
  const q=new Quaternion().setFromUnitVectors(current,next).multiply(bone.getWorldQuaternion(new Quaternion()));
  q.premultiply(bone.parent.getWorldQuaternion(new Quaternion()).invert());bone.quaternion.slerp(q,amount);bone.updateWorldMatrix(false,true);
 }
 aim(upper,fore,wantedElbow);aim(fore,hand,target);
 for(const [name,bone] of bones)if(new RegExp('^(index|middle|ring|pinky)_0[123]'+side+'$').test(name))bone.quaternion.slerp(new Quaternion(),amount*.45);
}
