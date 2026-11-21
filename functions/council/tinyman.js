const {protocol,ZERO}=require('./model');
function poolState(account,appId){
  const local=(account.appsLocalState||[]).find(a=>Number(a.id)===Number(appId));
  return Object.fromEntries((local?.keyValue||[]).map(k=>[Buffer.from(k.key).toString(),k.value.type===2?String(k.value.uint):Buffer.from(k.value.bytes).toString('hex')]));
}
async function resolveSwap(indexer,network,action){
  if(Number(action.kind)!==2)return action;
  const input=BigInt(action.asset),output=BigInt(action.outputAsset),appId=protocol.tinyman[network];
  if(input===output)throw Error('Swap assets must differ.');
  const matches=a=>{const s=poolState(a,appId);return ((s.asset_1_id===String(input)&&s.asset_2_id===String(output))||(s.asset_2_id===String(input)&&s.asset_1_id===String(output)))&&BigInt(s.asset_1_reserves||0)>0n&&BigInt(s.asset_2_reserves||0)>0n;};
  if(action.pool&&action.pool!==ZERO){const r=await indexer.lookupAccountByID(action.pool).do();if(!matches(r.account))throw Error('The selected Tinyman V2 pool does not match these assets or has no liquidity.');return action;}
  let next;
  for(let page=0;page<10;page++){
    let q=indexer.searchAccounts().applicationID(appId).assetID(input>0n?input:output).limit(1000);if(next)q=q.nextToken(next);
    const r=await q.do();const pool=(r.accounts||[]).find(matches);if(pool)return {...action,pool:pool.address};next=r.nextToken;if(!next)break;
  }
  throw Error('No funded direct Tinyman V2 pool found. Choose another asset pair.');
}
module.exports={poolState,resolveSwap};
