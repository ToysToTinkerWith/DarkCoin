import algosdk from 'algosdk';
import {Buffer} from 'buffer';
export const generationStorageKey=(address,id)=>`darkcoin-2d-generation:${address}:${id}`;
export async function generationRequest(body){
 const response=await fetch('/api/arena/legacy-generation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||'Could not queue generation.'),{code:data.code});return data;
}
async function resumePayment(pending,key,onProgress){
 try{const result=await generationRequest({op:'queue',requestId:pending.requestId});localStorage.removeItem(key);return result;}
 catch(e){if(e.code==='UNPAID_EXPIRED'){localStorage.removeItem(key);throw e;}if(!/not indexed/i.test(e.message)||!pending.signed)throw e;}
 const client=new algosdk.Algodv2('','https://mainnet-api.algonode.cloud',443);
 onProgress('Confirming the same payment; no second charge…');
 // Resubmitting the same signed transaction cannot make a second payment.
 try{await client.sendRawTransaction(new Uint8Array(Buffer.from(pending.signed,'base64'))).do();}catch{}
 await algosdk.waitForConfirmation(client,pending.paymentTxnId,8);
 let error;for(let attempt=0;attempt<8;attempt++){try{const result=await generationRequest({op:'queue',requestId:pending.requestId});localStorage.removeItem(key);return result;}catch(e){error=e;if(e.code==='UNPAID_EXPIRED')localStorage.removeItem(key);if(!/not indexed/i.test(e.message))break;await new Promise(resolve=>setTimeout(resolve,2000));}}
 throw error;
}
export async function submitLegacyGeneration({address,champId,selection,generationBuild,championName,signTransactions,onProgress=()=>{}}){
 const key=generationStorageKey(address,champId),existing=localStorage.getItem(key);
 if(existing){onProgress('Checking your previous payment…');return resumePayment(JSON.parse(existing),key,onProgress);}
 onProgress('Checking champion and trait ownership…');
 const prepared=await generationRequest({op:'prepare',address,champId,selection,generationBuild,championName});
 const bytes=new Uint8Array(Buffer.from(prepared.unsigned,'base64')),txn=algosdk.decodeUnsignedTransaction(bytes);
 if(txn.sender.toString()!==address||txn.assetTransfer?.assetIndex!==1088771340n||txn.assetTransfer.amount!==10000000000n||txn.assetTransfer.receiver.toString()!=='VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM'||txn.rekeyTo||txn.assetTransfer.closeRemainderTo||txn.group||txn.fee>10000n)throw Error('Unexpected generation payment. Nothing was signed.');
 onProgress('Confirm the 10,000 DARK generation payment in your wallet…');
 const signed=await signTransactions([bytes]);if(!signed?.[0])throw Error('Generation payment cancelled.');
 // Save before broadcasting: a disconnected tab can retry this exact purchase.
 const pending={requestId:prepared.requestId,paymentTxnId:prepared.paymentTxnId,signed:Buffer.from(signed[0]).toString('base64')};
 localStorage.setItem(key,JSON.stringify(pending));return resumePayment(pending,key,onProgress);
}
