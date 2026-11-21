const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),T=require('three');
require('esbuild').buildSync({entryPoints:['components/arena/playground/combo-curves.js'],bundle:true,platform:'node',external:['three'],outfile:'tmp/combo-curve-tests.cjs'});
const {vectorTrack,rotationTrack}=require('../tmp/combo-curve-tests.cjs');
const keys=[[0,0],[.3,.4],[.7,1],[1,1.3]].map(([t,x])=>({t,p:new T.Vector3(x,x*.4,0),m:new T.Matrix4().makeRotationZ(x)}));
test('follow-up curves carry matching linear and angular velocity through interior poses',()=>{
 const h=1e-5;
 for(const t of [.3,.7]){
  const p=x=>vectorTrack(keys,x,k=>k.p.clone()),left=p(t).sub(p(t-h)).divideScalar(h),right=p(t+h).sub(p(t)).divideScalar(h);
  assert(left.length()>.5);assert(left.distanceTo(right)<.002);
  const q=x=>rotationTrack(keys,x,k=>k.m),speed=(a,b)=>q(a).angleTo(q(b))/h;
  assert(speed(t-h,t)>.5);assert(Math.abs(speed(t-h,t)-speed(t,t+h))<.002);
 }
});
test('follow-up curves settle at endpoints and stop at a genuine reversal',()=>{
 const h=1e-5,p=x=>vectorTrack(keys,x,k=>k.p.clone());assert(p(h).distanceTo(p(0))/h<.001);assert(p(1).distanceTo(p(1-h))/h<.001);
 const reversal=[{t:0,p:new T.Vector3()},{t:.5,p:new T.Vector3(1,0,0)},{t:1,p:new T.Vector3()}];
 assert(vectorTrack(reversal,.5-h,k=>k.p.clone()).distanceTo(new T.Vector3(1,0,0))/h<.001);
});
