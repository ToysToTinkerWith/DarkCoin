import algosdk from 'algosdk';
import crypto from 'crypto';

export const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
export function createChallenge(address,assetId,nonce){
 const note=Buffer.from(JSON.stringify({purpose:'Dark Coin playground login — never broadcast',address,assetId,nonce}));
 const txn=algosdk.makePaymentTxnWithSuggestedParamsFromObject({sender:address,receiver:address,amount:0,note,
  suggestedParams:{fee:0,flatFee:true,firstValid:1,lastValid:1,genesisID:'mainnet-v1.0',genesisHash:new Uint8Array(Buffer.from('wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1q1kkit8=','base64'))}});
 return Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64');
}
export function verifyProof(signed,challenge,authorizedSigner){
 if(typeof signed!=='string'||signed.length>12000)throw new Error('Invalid wallet proof.');
 const decoded=algosdk.decodeSignedTransaction(new Uint8Array(Buffer.from(signed,'base64')));
 if(!decoded.sig||decoded.msig||decoded.lsig)throw new Error('Use a wallet with a single authorized signing key for this playground.');
 if(Buffer.from(algosdk.encodeUnsignedTransaction(decoded.txn)).toString('base64')!==challenge.unsigned)throw new Error('Wallet proof does not match this entry request.');
 const address=decoded.sgnr?String(decoded.sgnr):challenge.address;
 if(address!==authorizedSigner)throw new Error('Wallet proof does not match the current authorized signer.');
 const key=crypto.createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(algosdk.decodeAddress(address).publicKey)]),format:'der',type:'spki'});
 if(!crypto.verify(null,Buffer.from(decoded.txn.bytesToSign()),key,Buffer.from(decoded.sig)))throw new Error('The wallet signature is invalid.');
 return true;
}
