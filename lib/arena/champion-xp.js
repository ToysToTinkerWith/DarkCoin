import {CHAMPION_XP_APP_ID,championLevel} from './skills';

export async function readChampionProgression(assetId,read){
 const key=Buffer.alloc(10);key.writeBigUInt64BE(BigInt(assetId));key.write('xp',8,'ascii');
 const box=await read(`https://mainnet-api.algonode.cloud/v2/applications/${CHAMPION_XP_APP_ID}/box?name=${encodeURIComponent('b64:'+key.toString('base64'))}`,true);
 let xp=0n;
 if(box){
  const bytes=Buffer.from(box.value||'','base64');
  if(!bytes.length||bytes.length>8)throw new Error('Invalid champion XP box.');
  for(const byte of bytes)xp=(xp<<8n)+BigInt(byte);
 }
 return {...championLevel(xp.toString()),appId:CHAMPION_XP_APP_ID};
}
