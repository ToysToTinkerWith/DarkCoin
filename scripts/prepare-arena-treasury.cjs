// Offline, unsigned v2 loot treasury administration. Never signs/submits.
const fs=require('node:fs'),algosdk=require('algosdk');
function prepare(input){
 const {sender,operation,appId,oracle}=input;
 if(!algosdk.isValidAddress(sender))throw new Error('Valid public sender required');
 const p=input.params;if(!p?.genesisID||!p.genesisHash||!p.firstValid||!p.lastValid)throw new Error('Provide fresh params, with a base64 genesisHash');
 const suggestedParams={...p,genesisHash:Buffer.from(p.genesisHash,'base64'),fee:1000,flatFee:true};
 const u64=n=>{const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(n));return b;};let txns=[];
 if(operation==='create'){
  if(!algosdk.isValidAddress(oracle))throw new Error('Valid public oracle required');
  const approvalProgram=Buffer.from(input.approvalBase64||'','base64'),clearProgram=Buffer.from(input.clearBase64||'','base64');if(!approvalProgram.length||!clearProgram.length)throw new Error('Compile both TEAL programs with an approved compiler first');
  const extraPages=Math.max(0,Math.ceil((approvalProgram.length+clearProgram.length)/2048)-1);if(extraPages>3)throw new Error('Program size limit exceeded');
  txns.push(algosdk.makeApplicationCreateTxnFromObject({sender,suggestedParams,onComplete:algosdk.OnApplicationComplete.NoOpOC,approvalProgram,clearProgram,extraPages,numGlobalInts:2,numGlobalByteSlices:1,numLocalInts:0,numLocalByteSlices:0,appArgs:[algosdk.decodeAddress(oracle).publicKey]}));
 }else if(operation==='update'){
  if(!Number.isSafeInteger(appId)||appId<1)throw new Error('Valid loot treasury app ID required');
  const approvalProgram=Buffer.from(input.approvalBase64||'','base64'),clearProgram=Buffer.from(input.clearBase64||'','base64');
  if(!approvalProgram.length||!clearProgram.length)throw new Error('Compile both TEAL programs with an approved compiler first');
  const pages=input.existingExtraPages;
  if(!Number.isInteger(pages)||pages<0||pages>3)throw new Error('Provide existingExtraPages from the current application');
  if(approvalProgram.length+clearProgram.length>2048*(1+pages))throw new Error('Updated programs exceed the existing application program capacity');
  txns.push(algosdk.makeApplicationUpdateTxnFromObject({sender,appIndex:appId,approvalProgram,clearProgram,suggestedParams}));
 }else{
  if(!Number.isSafeInteger(appId)||appId<1)throw new Error('Valid loot treasury app ID required');let appArgs,foreignAssets=[],boxes=[];
  if(operation==='register'){
   const {assetId,kind,capBps=10000,capAtomic='0',existingRegistry=false,alreadyOptedIn=false}=input;
   if(!Number.isSafeInteger(assetId)||assetId<256||!['nft','token'].includes(kind)||!Number.isInteger(capBps)||capBps<1||capBps>10000)throw new Error('Provide ASA ID, nft/token kind, and capBps (1–10000)');
   if(!/^\d+$/.test(String(capAtomic)))throw new Error('capAtomic must be an integer');
   const amount=(existingRegistry?0:18900)+(alreadyOptedIn?0:100000);
   txns.push(algosdk.makePaymentTxnWithSuggestedParamsFromObject({sender,receiver:algosdk.getApplicationAddress(appId),amount,suggestedParams}));
   appArgs=[Buffer.from('register'),u64(assetId),u64(kind==='nft'?1:0),u64(capBps),u64(kind==='nft'?1:capAtomic)];foreignAssets=[assetId];boxes=[{appIndex:0,name:Buffer.concat([Buffer.from('a'),u64(assetId)])}];
  }else if(operation==='pause'||operation==='unpause')appArgs=[Buffer.from('pause'),u64(operation==='pause'?1:0)];
  else if(operation==='oracle'){if(!algosdk.isValidAddress(oracle))throw new Error('Valid oracle required');appArgs=[Buffer.from('oracle'),algosdk.decodeAddress(oracle).publicKey];}
  else throw new Error('Operation must be create, update, register, pause, unpause or oracle. Paid passes were removed.');
  txns.push(algosdk.makeApplicationNoOpTxnFromObject({sender,appIndex:appId,appArgs,foreignAssets,boxes,suggestedParams:{...suggestedParams,fee:operation==='register'&&!input.alreadyOptedIn?2000:1000}}));
 }
 if(txns.length>1)algosdk.assignGroupID(txns);
 return {operation,network:p.genesisID,sender,appId:appId||null,transactions:txns.map(t=>Buffer.from(algosdk.encodeUnsignedTransaction(t)).toString('base64')),note:'Unsigned only. Creation starts paused. No subscription or fixed DARK reward exists.'};
}
module.exports={prepare};
if(require.main===module){if(process.argv.length!==4)throw new Error('Usage: node scripts/prepare-arena-treasury.cjs input.json output.json');const result=prepare(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2));console.log('Prepared unsigned '+result.operation+' for '+result.network+'. Nothing submitted.');}
