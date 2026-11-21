const sdk=require('algosdk'),nacl=require('tweetnacl');
function verifyProof({sender,proof,kind,digest,signer=sender,now=Date.now()}){
  if(!sdk.isValidAddress(sender)||!sdk.isValidAddress(signer))throw Error('Connect a valid Algorand wallet.');
  const s=sdk.decodeSignedTransaction(Buffer.from(proof||'','base64')),tx=s.txn;
  if(tx.type!=='pay'||String(tx.sender)!==sender||String(tx.payment.receiver)!==sender||tx.payment.amount!==0n||tx.rekeyTo||tx.payment.closeRemainderTo||!s.sig||!nacl.sign.detached.verify(tx.bytesToSign(),s.sig,sdk.decodeAddress(signer).publicKey))throw Error('Invalid wallet proof.');
  const note=JSON.parse(Buffer.from(tx.note).toString());
  if(note.kind!==kind||note.sha256!==digest||!Number.isSafeInteger(note.time)||Math.abs(now-note.time)>300000)throw Error('Wallet proof expired or does not match the proposal.');
  return true;
}
module.exports={verifyProof};
