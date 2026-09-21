import {Vector3,Quaternion,PropertyBinding} from 'three';

// Aim the thigh/shin in champion space rather than assuming Blender bone axes.
// Preserve each joint's translation and blend back to the current gait on landing.
export class JumpPose{
 constructor(model,bones){this.model=model;this.bones=bones;this.saved=[];}
 bone(name){return this.bones.get(name)||this.bones.get(PropertyBinding.sanitizeNodeName(name));}
 restore(){for(const [b,q] of this.saved)b.quaternion.copy(q);this.saved=[];this.model.updateMatrixWorld(true);}
 apply(tuck){
  if(tuck<=0)return;
  const facing=this.model.getWorldQuaternion(new Quaternion());
  for(const side of ['L','R']){
   for(const [name,childName,direction] of [
    ['thigh','shin',new Vector3(0,-Math.SQRT1_2,Math.SQRT1_2)],
    ['shin','foot',new Vector3(0,-Math.SQRT1_2,-Math.SQRT1_2)]
   ]){
    const bone=this.bone(name+'.'+side),child=this.bone(childName+'.'+side);if(!bone||!child)continue;
    this.saved.push([bone,bone.quaternion.clone()]);
    const current=child.getWorldPosition(new Vector3()).sub(bone.getWorldPosition(new Vector3())).normalize();
    const world=bone.getWorldQuaternion(new Quaternion());
    const target=new Quaternion().setFromUnitVectors(current,direction.applyQuaternion(facing)).multiply(world);
    target.premultiply(bone.parent.getWorldQuaternion(new Quaternion()).invert());
    bone.quaternion.slerp(target,tuck);bone.updateWorldMatrix(false,true);
   }
  }
 }
}
