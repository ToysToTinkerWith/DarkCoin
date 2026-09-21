/** Weapon state runs independently of the locomotion clock. */
export class WeaponActionController {
 constructor(durations={Draw:2,Stow:2,Swing:1.5},speedFactor=1){
  if(!Number.isFinite(speedFactor)||speedFactor<=0)throw new Error('Weapon speedFactor must be positive.');
  this.durations={...durations};this.speedFactor=speedFactor;this.attackId=0;this.setState('Carry');
 }
 setState(state){
  if(!['Carry','Hold'].includes(state))throw new Error('Unknown weapon state: '+state);
  this.state=state;this.action=null;this.elapsed=0;this.active=false;
 }
 canTrigger(action){
  return !this.active&&(action==='Draw'?this.state==='Carry':['Stow','Swing'].includes(action)&&this.state==='Hold');
 }
 trigger(action){
  if(!this.canTrigger(action))return false;
  this.action=action;this.elapsed=0;this.active=true;if(action==='Swing')this.attackId++;return true;
 }
 update(seconds){
  if(!this.active)return;
  this.elapsed=Math.min(this.duration,this.elapsed+Math.max(0,seconds));
  if(this.elapsed>=this.duration){this.active=false;this.state=this.action==='Stow'?'Carry':'Hold';}
 }
 scrub(seconds){
  if(!this.action)return;
  this.elapsed=Math.max(0,Math.min(this.duration,seconds));
  this.active=this.elapsed<this.duration;
  this.state=this.active?(this.action==='Draw'?'Carry':'Hold'):(this.action==='Stow'?'Carry':'Hold');
 }
 get duration(){return this.action?this.durations[this.action]/(this.action==='Swing'?this.speedFactor:1):0;}
 get poseAction(){return this.active?this.action:this.state;}
 get posePhase(){return this.active?this.elapsed/this.duration:0;}
 get label(){return this.active?{Draw:'Drawing',Stow:'Stowing',Swing:'Swinging'}[this.action]:(this.state==='Hold'?'In hands':'On back');}
}
