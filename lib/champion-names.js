import crypto from 'node:crypto';
import algosdk from 'algosdk';
import {arenaDatabase} from './arena/firebaseServer';
import {verifyProof} from './arena/walletProof';
import {CHAMPION_CREATOR} from './playground';

export function normalizeChampionName(value){
 if(typeof value!=='string')throw new Error('Enter a champion name.');
 const name=value.normalize('NFC').trim().replace(/ +/g,' ');
 if([...name].length<2||[...name].length>48||/[\p{Cc}\p{Cf}<>]/u.test(name))throw new Error('Use 2–48 characters, without control characters or angle brackets.');
 return name;
}
export function validChampionId(value){const id=Number(value);if(!Number.isSafeInteger(id)||id<1)throw new Error('Invalid champion.');return id;}
const profile=(db,id)=>db.collection('arenaPrivate').doc('champion-name-'+id);
export function championNameGame(game='3d'){if(!['2d','3d'].includes(game))throw Error('Choose the 2D or 3D arena.');return game;}
export async function championNames(ids,db=arenaDatabase(),game='3d'){
 championNameGame(game);
 const unique=[...new Set(ids.map(validChampionId))];if(unique.length>100)throw new Error('Request at most 100 champions.');
 if(!unique.length)return {};
 const docs=await db.getAll(...unique.map(id=>game==='2d'?db.collection('chars').doc(id+'object'):profile(db,id)));
 return Object.fromEntries(docs.flatMap((d,i)=>{const name=game==='2d'?d.data()?.charObj?.name:d.data()?.name;return name?[[unique[i],name]]:[];}));
}
export async function championDisplayName(id,fallback){try{return (await championNames([id]))[id]||fallback;}catch(e){console.error('Champion name lookup unavailable');return fallback;}}
export async function applyChampionNames(rows){
 const champions=rows.filter(r=>r.asset?.params?.creator===CHAMPION_CREATOR&&Number(r.asset.params.total)===1);
 try{for(let i=0;i<champions.length;i+=100){const batch=champions.slice(i,i+100),names=await championNames(batch.map(r=>r.asset.index));for(const row of batch){const name=names[Number(row.asset.index)];if(name)row.asset.params={...row.asset.params,originalName:row.asset.params.originalName||row.asset.params.name,name};}}}catch(e){console.error('Champion roster names unavailable');}
 return rows;
}
export async function currentChampionOwner(address,id,client=new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud',443)){
 if(!algosdk.isValidAddress(address))throw new Error('Connect your wallet.');
 const [asset,holding,account]=await Promise.all([client.getAssetByID(id).do(),client.accountAssetInformation(address,id).do(),client.accountInformation(address).do()]);
 if(String(asset.params.creator)!==CHAMPION_CREATOR||BigInt(asset.params.total)!==1n||BigInt(holding.assetHolding.amount)!==1n)throw new Error('Only the current owner of this champion can change its name.');
 return String(account.authAddr||address);
}
export async function createNameChallenge({address,assetId,name,game='3d'},db=arenaDatabase(),owner=currentChampionOwner){
 championNameGame(game);const id=validChampionId(assetId),clean=normalizeChampionName(name);if(game==='2d'&&[...clean].length>32)throw Error('Use no more than 32 characters for the 2D name.');await owner(address,id);
 const nonce=crypto.randomBytes(24).toString('hex'),expiresAt=Date.now()+180000;
 // Expired, zero-fee self-payment is a proof only. Never submitted to Algorand.
 const txn=algosdk.makePaymentTxnWithSuggestedParamsFromObject({sender:address,receiver:address,amount:0,note:Buffer.from(JSON.stringify({purpose:'Dark Coin champion name — signature only; never broadcast',assetId:id,game,name:clean,nonce})),suggestedParams:{fee:0,flatFee:true,firstValid:1,lastValid:1,genesisID:'mainnet-v1.0',genesisHash:new Uint8Array(Buffer.from('wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1q1kkit8=','base64'))}});
 const unsigned=Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64');
 await db.collection('arenaPrivate').doc('champion-name-proof-'+nonce).create({address,assetId:id,game,name:clean,unsigned,expiresAt,deleteAt:new Date(expiresAt)});
 return {nonce,unsigned};
}
export async function saveChampionName({nonce,signed},db=arenaDatabase(),owner=currentChampionOwner){
 if(!/^[a-f0-9]{48}$/.test(nonce||''))throw new Error('Invalid name request.');
 const ref=db.collection('arenaPrivate').doc('champion-name-proof-'+nonce),data=(await ref.get()).data();
 if(!data||data.expiresAt<Date.now())throw new Error('Name request expired. Please try again.');
 const signer=await owner(data.address,data.assetId);verifyProof(signed,data,signer);
 await db.runTransaction(async tx=>{const fresh=(await tx.get(ref)).data();if(!fresh||fresh.expiresAt<Date.now())throw new Error('Name request already used or expired.');
  if(data.game==='2d'){const charRef=db.collection('chars').doc(data.assetId+'object'),character=(await tx.get(charRef)).data();if(!character?.charObj)throw Error('Generate a 2D character before renaming it.');tx.set(charRef,{...character,charObj:{...character.charObj,name:data.name}});}
  else tx.set(profile(db,data.assetId),{name:data.name,updatedBy:data.address,updatedAt:Date.now()});tx.delete(ref);
 });return {assetId:data.assetId,name:data.name,...(data.game==='2d'?{game:'2d'}:{})};
}
