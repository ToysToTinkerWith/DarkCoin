// One replicated takeoff timestamp drives height on the server and every client.
export const JUMP_DURATION=.84,JUMP_HEIGHT=.8;
export function sampleJump(start,time){
 const phase=start==null?1:Math.max(0,Math.min(1,(time-start)/JUMP_DURATION));
 const active=start!=null&&time>=start&&phase<1;
 return {active,phase,height:active?4*JUMP_HEIGHT*phase*(1-phase):0,tuck:active?Math.sin(Math.PI*phase)**2:0};
}
