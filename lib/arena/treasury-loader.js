import algosdk from 'algosdk';
import config from './treasury-load-config.json';

export const LOAD_CONFIG=config;
const MAX=18446744073709551615n;
const u64=value=>{const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(value));return b;};
const key=id=>Buffer.concat([Buffer.from('a'),u64(id)]);
const missing=e=>e.status===404||e.response?.status===404;
export const loadClient=()=>new algosdk.Algodv2('',config.algodUrl,443);
export function requireLoader(address){if(address!==config.loader)throw new Error('Only the authorized loading wallet can use this operation.');}
export function parseTokenAmount(value,decimals){
 if(!Number.isInteger(decimals)||decimals<0||decimals>19)throw new Error('Invalid asset decimals.');
 if(typeof value!=='string'||!/^\d+(\.\d+)?$/.test(value))throw new Error('Enter a positive token amount without commas or scientific notation.');
 const [whole,fraction='']=value.split('.');if(fraction.length>decimals)throw new Error(`This asset allows ${decimals} decimal places.`);
 const amount=BigInt(whole+fraction.padEnd(decimals,'0'));if(amount<=0n||amount>MAX)throw new Error('Amount must be positive and fit in an Algorand asset transfer.');return amount;
}
export function formatTokenAmount(value,decimals){
 const raw=String(value).padStart(decimals+1,'0');if(!decimals)return raw;
 const fraction=raw.slice(-decimals).replace(/0+$/,'');return raw.slice(0,-decimals)+(fraction?'.'+fraction:'');
}
export async function loaderStatus(client=loadClient()){
 const app=await client.getApplicationByID(config.appId).do(),address=algosdk.getApplicationAddress(config.appId).toString();
 let account;try{account=await client.accountInformation(address).do();}catch(e){if(!missing(e))throw e;account={amount:0n,minBalance:100000n};}
 const globals=Object.fromEntries((app.params.globalState||[]).map(s=>[Buffer.from(s.key).toString(),s.value]));
 const program=Buffer.from(app.params.approvalProgram||[]);
 // State/layout and loader constants are a capability hint. The exact group must
 // also pass algod simulation before the user is offered anything to sign.
 const compatible=[2n,3n].includes(globals.version?.uint)&&globals.oracle?.bytes?.length===32&&program.includes(Buffer.from('load'))&&program.includes(Buffer.from(algosdk.decodeAddress(config.loader).publicKey));
 return {...config,address,creator:String(app.params.creator),compatible,version:Number(globals.version?.uint||0),paused:!!((globals.paused?.uint||0n)&1n),amount:String(account.amount),minBalance:String(account.minBalance),
  message:compatible?'Treasury ready to receive assets.':`App ${config.appId} does not yet have the compatible arena treasury loading code. Its creator must install and initialize that code before deposits are enabled.`};
}
export async function inspectLoadAsset(address,assetId,client=loadClient()){
 requireLoader(address);if(!Number.isSafeInteger(assetId)||assetId<1)throw new Error('Enter a valid asset ID.');
 const [status,asset]=await Promise.all([loaderStatus(client),client.getAssetByID(assetId).do()]);
 let walletHolding,treasuryHolding,registry=null;
 try{walletHolding=(await client.accountAssetInformation(address,assetId).do()).assetHolding;}catch(e){if(!missing(e))throw e;throw new Error('The loading wallet does not hold this asset.');}
 try{treasuryHolding=(await client.accountAssetInformation(status.address,assetId).do()).assetHolding;}catch(e){if(!missing(e))throw e;}
 try{registry=Buffer.from((await client.getApplicationBoxByName(config.appId,key(assetId)).do()).value);}catch(e){if(!missing(e))throw e;}
 if(registry&&registry.length!==32)throw new Error('This asset has an incompatible treasury registry record.');
 const kind=BigInt(asset.params.total)===1n&&Number(asset.params.decimals)===0?'nft':'token';
 if(registry&&registry.readBigUInt64BE(8)!==BigInt(kind==='nft'?1:0))throw new Error('Asset type does not match its treasury registry.');
 return {status,asset:{id:assetId,name:asset.params.name||`Asset ${assetId}`,unitName:asset.params.unitName||'',decimals:Number(asset.params.decimals),kind,
  balance:String(walletHolding.amount),frozen:!!walletHolding.isFrozen,treasuryFrozen:!!treasuryHolding?.isFrozen||(!treasuryHolding&&!!asset.params.defaultFrozen),
  optedIn:!!treasuryHolding,registered:!!registry,treasuryBalance:String(treasuryHolding?.amount||0n)}};
}
export function buildLoadTransactions(address,amountText,snapshot,params){
 requireLoader(address);const {status,asset}=snapshot;
 if(!status.compatible)throw new Error(status.message);
 if(params.genesisID!==config.network)throw new Error('Treasury loading requires Algorand mainnet.');
 if(asset.frozen||asset.treasuryFrozen)throw new Error('This asset is frozen for the sender or treasury.');
 const amount=parseTokenAmount(amountText,asset.decimals);if(amount>BigInt(asset.balance))throw new Error('Amount exceeds the wallet balance.');
 const minimum=BigInt(status.minBalance)>100000n?BigInt(status.minBalance):100000n;
 const target=minimum+(asset.optedIn?0n:100000n)+(asset.registered?0n:18900n),balance=BigInt(status.amount),funding=status.version===3?(balance-minimum<1000000n?10000000n:0n):(target>balance?target-balance:0n);
 const fee=Number(params.minFee||1000n);if(!Number.isSafeInteger(fee)||fee<1000)throw new Error('Invalid network minimum fee.');
 const suggestedParams={...params,fee,flatFee:true},receiver=algosdk.getApplicationAddress(config.appId);
 const txns=[
  ...(status.version===3&&funding===0n?[]:[algosdk.makePaymentTxnWithSuggestedParamsFromObject({sender:address,receiver,amount:funding,suggestedParams})]),
  algosdk.makeApplicationNoOpTxnFromObject({sender:address,appIndex:config.appId,appArgs:[Buffer.from('load'),u64(asset.id)],foreignAssets:[asset.id],boxes:[{appIndex:0,name:key(asset.id)}],suggestedParams:{...suggestedParams,fee:fee*(asset.optedIn?1:2)}}),
  algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({sender:address,receiver,assetIndex:asset.id,amount,suggestedParams})
 ];
 algosdk.assignGroupID(txns);
 return {txns,summary:{appId:config.appId,receiver:receiver.toString(),sender:address,assetId:asset.id,name:asset.name,amount:formatTokenAmount(amount,asset.decimals),amountAtomic:String(amount),requiresOptIn:!asset.optedIn,requiresRegistration:!asset.registered,fundingMicroAlgo:String(funding),feeMicroAlgo:fee*(txns.length+(asset.optedIn?0:1)),lastValid:String(params.lastValid)}};
}
export async function prepareLoad(address,assetId,amount,client=loadClient()){
 const snapshot=await inspectLoadAsset(address,assetId,client),params=await client.getTransactionParams().do();
 const {txns,summary}=buildLoadTransactions(address,amount,snapshot,params);
 const request=new algosdk.modelsv2.SimulateRequest({allowEmptySignatures:true,fixSigners:true,txnGroups:[new algosdk.modelsv2.SimulateRequestTransactionGroup({txns:txns.map(t=>algosdk.decodeSignedTransaction(algosdk.encodeUnsignedSimulateTransaction(t)))})]});
 const simulation=await client.simulateTransactions(request).do(),result=simulation.txnGroups?.[0];
 if(!result||result.failureMessage)throw new Error(`Treasury deposit simulation failed: ${result?.failureMessage||'No result returned'}. Nothing was submitted.`);
 return {...summary,transactions:txns.map(t=>Buffer.from(algosdk.encodeUnsignedTransaction(t)).toString('base64'))};
}
