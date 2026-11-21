import {Matrix4,Quaternion,Vector3} from 'three';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const log=q=>{q=q.clone().normalize();if(q.w<0)q.set(-q.x,-q.y,-q.z,-q.w);const v=new Vector3(q.x,q.y,q.z),n=v.length();return n>1e-8?v.multiplyScalar(Math.atan2(n,q.w)/n):v;};
const exp=v=>{const n=v.length(),s=n>1e-8?Math.sin(n)/n:1;return new Quaternion(v.x*s,v.y*s,v.z*s,Math.cos(n));};
const rotation=m=>{const q=new Quaternion();m.decompose(new Vector3(),q,new Vector3());return q.normalize();};

// Keep momentum through a pose when the neighbouring directions agree. A
// reversal/hold remains a real anticipation or settling point, not an overshoot.
function tangent(a,b){
 if(a.dot(b)<=0)return new Vector3();
 const v=a.clone().add(b).multiplyScalar(.5),limit=1.6*Math.min(a.length(),b.length());
 return v.length()>limit?v.setLength(limit):v;
}
function velocity(keys,i,get){
 if(i===0)return keys[0].before?get(keys[0]).sub(get(keys[0].before)).divideScalar(keys[0].t-keys[0].before.t):new Vector3();
 if(i===keys.length-1)return new Vector3();
 const p=get(keys[i]),a=p.clone().sub(get(keys[i-1])).divideScalar(keys[i].t-keys[i-1].t),b=get(keys[i+1]).sub(p).divideScalar(keys[i+1].t-keys[i].t);
 return tangent(a,b);
}
export function segment(keys,t){let i=1;while(i<keys.length-1&&t>keys[i].t)i++;return {i,u:clamp((t-keys[i-1].t)/(keys[i].t-keys[i-1].t),0,1),dt:keys[i].t-keys[i-1].t};}
export function vectorTrack(keys,t,get){
 const {i,u,dt}=segment(keys,t),a=get(keys[i-1]),b=get(keys[i]),ma=velocity(keys,i-1,get).multiplyScalar(dt),mb=velocity(keys,i,get).multiplyScalar(dt),u2=u*u,u3=u2*u;
 return a.multiplyScalar(2*u3-3*u2+1).addScaledVector(ma,u3-2*u2+u).addScaledVector(b,-2*u3+3*u2).addScaledVector(mb,u3-u2);
}
export function rotationTrack(keys,t,get){
 const qs=keys.map(k=>rotation(get(k))),{i,u,dt}=segment(keys,t);
 const angular=j=>{
  if(j===0)return keys[0].before?log(qs[0].clone().invert().multiply(rotation(get(keys[0].before)))).multiplyScalar(-1/(keys[0].t-keys[0].before.t)):new Vector3();
  if(j===keys.length-1)return new Vector3();
  const inverse=qs[j].clone().invert();
  return tangent(log(inverse.clone().multiply(qs[j-1])).multiplyScalar(-1/(keys[j].t-keys[j-1].t)),log(inverse.multiply(qs[j+1])).multiplyScalar(1/(keys[j+1].t-keys[j].t)));
 };
 const a=qs[i-1],b=qs[i],ca=a.clone().multiply(exp(angular(i-1).multiplyScalar(dt/3))),cb=b.clone().multiply(exp(angular(i).multiplyScalar(-dt/3)));
 // Spherical cubic Bezier; adjacent segments share the same angular tangent.
 const ab=a.clone().slerp(ca,u),bc=ca.clone().slerp(cb,u),cd=cb.clone().slerp(b,u);
 return ab.slerp(bc,u).slerp(bc.clone().slerp(cd,u),u).normalize();
}
export function matrixTrack(keys,t,get){
 const scale=m=>{const v=new Vector3();m.decompose(new Vector3(),new Quaternion(),v);return v;};
 return new Matrix4().compose(vectorTrack(keys,t,k=>new Vector3().setFromMatrixPosition(get(k))),rotationTrack(keys,t,get),vectorTrack(keys,t,k=>scale(get(k))));
}
