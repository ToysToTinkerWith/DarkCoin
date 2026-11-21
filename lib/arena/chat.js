// Ephemeral room chat: no database writes, wallet addresses, or client-supplied identity.
export const CHAT_LIMIT=180,CHAT_HISTORY=60,CHAT_BUBBLE_SECONDS=7;
export function chatText(value){
 if(typeof value!=='string')return '';
 return Array.from(value.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/g,' ').trim()).slice(0,CHAT_LIMIT).join('');
}
export class RoomChat{
 constructor(){this.messages=[];this.serial=0;this.limits=new Map();}
 post(player,text,now){
  const message=chatText(text);if(!message)return {error:'Write a message first.'};
  const previous=this.limits.get(player.id)||{at:now,tokens:3};
  const tokens=Math.min(3,previous.tokens+Math.max(0,now-previous.at)/2);
  if(tokens<1)return {error:'Give the other champions a moment before sending again.'};
  for(const [id,limit] of this.limits)if(now-limit.at>60)this.limits.delete(id);
  this.limits.set(player.id,{at:now,tokens:tokens-1});
  const row={id:++this.serial,playerId:player.id,name:chatText(player.champion.name)||'Champion',text:message,time:now,until:now+CHAT_BUBBLE_SECONDS};
  this.messages.push(row);if(this.messages.length>CHAT_HISTORY)this.messages.shift();
  return {message:row};
 }
}
