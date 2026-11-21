import crypto from 'node:crypto';
import graveclawArt from './graveclaw-announcement-art.json';
const SUPPRESS_EMBEDS=1<<2;
const hasGraveclawArt=event=>['warning','spawn','defeat','victory'].includes(event.kind)&&/^grave(?:claw|crawl(?:er)?)$/i.test(String(event.name||''));
const announcementArt=event=>hasGraveclawArt(event)?graveclawArt.events[event.kind]:null;
const text=value=>String(value||'').replace(/[\r\n<>@]/g,' ').replace(/([\\`*_~|])/g,'\\$1').slice(0,100);
function units(amount,decimals=0){const n=BigInt(amount),scale=10n**BigInt(decimals);return `${n/scale}${n%scale?'.'+String(n%scale).padStart(decimals,'0').replace(/0+$/,''):''}`;}
export function arenaAnnouncement(event){
 const arena='https://dark-coin.com/arena/playtest';let content;
 if(event.kind==='spawn')content=`⚔️ **${text(event.name)} has spawned!** The fight has begun. Arena entry is closed until the encounter ends. ${arena}`;
 else if(event.kind==='warning')content=`⏳ **${text(event.name)} spawns <t:${Math.floor(event.spawnAt)}:R>.** ${event.preparation?'The first champion has arrived. Two-minute preparation has begun!':'Get your champion ready!'} ${arena}`;
 else if(event.kind==='defeat')content=`🏆 **${text(event.name)} defeated!** ${event.champions} champion${event.champions===1?'':'s'} qualified for loot. Next monster <t:${Math.floor(event.spawnAt)}:R>.`;
 else if(event.kind==='victory')content=`🪦 **${text(event.name)} defeated every champion and returned to his grave.** Entry is open again. Next possible spawn <t:${Math.floor(event.spawnAt)}:R>.`;
 else if(event.kind==='reward')content=`🎁 **${text(event.address.slice(0,6))}…${text(event.address.slice(-4))}** received **${units(event.amount,event.decimals)} ${text(event.name)}** (asset ${event.assetId}) from ${event.source==='depths'?'The Depths':'monster loot'}. [TransactionId](<https://explorer.perawallet.app/tx/${encodeURIComponent(event.txid)}>)`;
 else throw Error('Unknown arena notification');
 const art=announcementArt(event);
 return {username:event.source==='depths'?'The Depths':'Dark Coin Arena',allowed_mentions:{parse:[]},flags:SUPPRESS_EMBEDS,content,
  ...(art?{attachments:[{id:0,filename:art.filename,description:art.description}]}:{})};
}
export function arenaAnnouncementRequest(event){
 const payload=arenaAnnouncement(event);
 if(!payload.attachments)return {headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)};
 // Direct image attachments remain visible while link embeds stay suppressed.
 // Bundle the render with the sender so delivery never depends on a CDN fetch.
 const body=new FormData();body.append('payload_json',JSON.stringify(payload));
 const art=announcementArt(event);
 body.append('files[0]',new Blob([Buffer.from(art.base64,'base64')],{type:art.contentType}),art.filename);
 return {body}; // fetch supplies the multipart boundary and Content-Type.
}
export async function deliverArenaNotice(db,id,{webhook=process.env.ARENA_DISCORD_WEBHOOK,depthsWebhook=process.env.DEPTHS_DISCORD_WEBHOOK,fetchImpl=fetch,now=Date.now}={}){
 if(!webhook&&!depthsWebhook)return {configured:false};
 const ref=db.collection('arenaPrivate/notifications/events').doc(id),owner=crypto.randomUUID();
 const preview=(await ref.get()).data();if(!preview)return {skipped:true};
 let source=preview.source;
 // Receipts queued by an older worker can still be routed during the rollout.
 if(!source&&preview.kind==='reward'&&/^loot-reward-\d+-\d+-[0-7]-delivered$/.test(id)){
  source=(await db.collection('arenaPrivate').doc(id.replace(/-delivered$/,'')).get()).data()?.source;
 }
 source=source==='depths'?'depths':'arena';
 const destination=source==='depths'?depthsWebhook:webhook;
 // Never fall back to the other game's channel when its secret is missing.
 if(!destination)return {configured:false};
 let url;try{url=new URL(destination);}catch{throw Error('Invalid Discord webhook configuration');}if(url.protocol!=='https:'||!['discord.com','discordapp.com'].includes(url.hostname)||!/^\/api(?:\/v\d+)?\/webhooks\//.test(url.pathname))throw Error('Invalid Discord webhook configuration');
 url.searchParams.set('wait','true');
 const event=await db.runTransaction(async tx=>{const row=(await tx.get(ref)).data();if(!row||row.status==='posted'||row.status==='expired'||row.until>now()||row.retryAt>now())return null;
  // Don't announce old spawns/warnings after an outage or initial webhook setup.
  if((row.kind==='warning'&&row.spawnAt*1000<=now())||(['spawn','defeat','victory'].includes(row.kind)&&now()-row.createdAt>600000)){tx.update(ref,{status:'expired'});return null;}
  tx.update(ref,{owner,until:now()+30000});return {...row,source};
 });if(!event)return {skipped:true};
 const finish=fields=>db.runTransaction(async tx=>{if((await tx.get(ref)).data()?.owner===owner)tx.update(ref,{...fields,until:0});});
 try{
  const response=await fetchImpl(url,{method:'POST',...arenaAnnouncementRequest(event),signal:AbortSignal.timeout(10000)});
  if(!response.ok){const body=response.status===429?await response.json().catch(()=>({})):{};throw Object.assign(Error('Discord notification failed'),{retry:Math.max(60,Number(body.retry_after)||0)});}
  const message=await response.json();if(!message.id)throw Error('Discord acknowledgement missing');
  await finish({status:'posted',messageId:message.id,postedAt:now(),retryAt:0});return {posted:true};
 }catch(error){await finish({status:'pending',retryAt:now()+(error.retry||60)*1000});return {pending:true};}
}
export async function retryArenaNotices(db){
 if(!process.env.ARENA_DISCORD_WEBHOOK&&!process.env.DEPTHS_DISCORD_WEBHOOK)return;
 const rows=await db.collection('arenaPrivate/notifications/events').where('status','==','pending').limit(40).get();
 for(const row of rows.docs)await deliverArenaNotice(db,row.id);
}
