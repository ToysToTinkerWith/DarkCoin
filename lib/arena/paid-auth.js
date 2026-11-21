import crypto from 'node:crypto';
import algosdk from 'algosdk';
import {createChallenge,verifyProof,hash} from './walletProof';
import {treasuryClient} from './treasury';
export async function challenge(db,address,assetId,config){
 if(!algosdk.isValidAddress(address)||!Number.isSafeInteger(assetId)||assetId<1)throw new Error('Choose a valid champion and wallet');
 const params=await treasuryClient(config).getTransactionParams().do();
 const nonce=crypto.randomBytes(24).toString('hex'),unsigned=createChallenge(address,assetId,nonce,params),expiresAt=Date.now()/1000+180;
 await db.collection('arenaPrivate').doc('auth-challenge-'+nonce).create({address,assetId,unsigned,expiresAt,deleteAt:new Date(expiresAt*1000)});
 return {nonce,unsigned};
}
export async function authenticate(db,nonce,signed,config){
 if(!/^[a-f0-9]{48}$/.test(nonce||''))throw new Error('Invalid wallet challenge');
 const ref=db.collection('arenaPrivate').doc('auth-challenge-'+nonce),doc=await ref.get(),data=doc.data(),now=Date.now()/1000;
 if(!data||data.expiresAt<now)throw new Error('Wallet challenge expired');
 const account=await treasuryClient(config).accountInformation(data.address).do();
 verifyProof(signed,data,String(account.authAddr||data.address));
 const token=crypto.randomBytes(32).toString('hex'),expiresAt=now+900;
 await db.runTransaction(async tx=>{const fresh=await tx.get(ref);if(!fresh.exists||fresh.data().expiresAt<Date.now()/1000)throw new Error('Wallet challenge was already used');
  tx.delete(ref);tx.create(db.collection('arenaPrivate').doc('paid-auth-'+hash(token)),{address:data.address,assetId:data.assetId,expiresAt,deleteAt:new Date(expiresAt*1000)});
 });return {token,expiresAt};
}
export async function authenticatedWallet(db,token){
 if(!/^[a-f0-9]{64}$/.test(token||''))throw new Error('Verify your connected wallet first');
 const doc=await db.collection('arenaPrivate').doc('paid-auth-'+hash(token)).get(),data=doc.data();
 if(!data||data.expiresAt<Date.now()/1000)throw new Error('Wallet verification expired; please sign in again');return data;
}
