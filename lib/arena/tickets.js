import crypto from 'crypto';
export const ROOM_ID='playground-realtime-v1';
export const hashToken=value=>crypto.createHash('sha256').update(value).digest('hex');
function mac(value,secret){if(!secret||secret.length<32)throw new Error('Arena ticket signing is not configured.');return crypto.createHmac('sha256',secret).update(value).digest();}
export function issueTicket(champion,address,secret,now=Date.now()/1000,roomId=ROOM_ID){
 const claims={v:1,room:roomId,nonce:crypto.randomBytes(24).toString('hex'),wallet:hashToken(address),champion,iat:now,exp:now+60};
 const body=Buffer.from(JSON.stringify(claims)).toString('base64url');return body+'.'+mac(body,secret).toString('base64url');
}
export function verifyTicket(ticket,secret,now=Date.now()/1000,roomId=ROOM_ID){
 if(typeof ticket!=='string'||ticket.length>12000)throw new Error('Invalid admission ticket.');
 const [body,sig,extra]=ticket.split('.'),expected=mac(body||'',secret),actual=Buffer.from(sig||'','base64url');
 if(extra||actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))throw new Error('Invalid admission ticket.');
 const c=JSON.parse(Buffer.from(body,'base64url').toString());
 if(c.v!==1||c.room!==roomId||!Number.isFinite(c.exp)||c.exp<=now||c.iat>now+5||c.exp-c.iat>60||!Number.isSafeInteger(c.champion?.id)||!c.champion?.loadout||!/^[a-f0-9]{48}$/.test(c.nonce)||!/^[a-f0-9]{64}$/.test(c.wallet))throw new Error('Admission ticket expired or invalid. Select your champion again.');
 return c;
}
