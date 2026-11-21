import {Vector3} from 'three';
export class ChatBubbles{
 constructor(host){this.host=host;this.rows=new Map();this.point=new Vector3();}
 sync(messages){for(const message of messages){const old=this.rows.get(message.playerId);if(old&&old.message.id>=message.id)continue;old?.element.remove();const element=document.createElement('div');element.className='arenaSpeechBubble';element.textContent=message.text;element.setAttribute('aria-hidden','true');element.style.display='none';this.host.appendChild(element);this.rows.set(message.playerId,{message,element});}}
 update(entities,camera,time){for(const [id,row] of this.rows){const actor=entities.get(id)?.actor;if(time>=row.message.until){row.element.remove();this.rows.delete(id);continue;}if(!actor){row.element.style.display='none';continue;}this.point.copy(actor.position);this.point.y+=3.15;this.point.project(camera);const visible=this.point.z>-1&&this.point.z<1&&Math.abs(this.point.x)<1.15&&Math.abs(this.point.y)<1.15;row.element.style.display=visible?'block':'none';row.element.style.left=`${(this.point.x*.5+.5)*100}%`;row.element.style.top=`${(-this.point.y*.5+.5)*100}%`;row.element.style.opacity=String(Math.min(1,(row.message.until-time)*2));}}
 dispose(){for(const row of this.rows.values())row.element.remove();this.rows.clear();}
}
