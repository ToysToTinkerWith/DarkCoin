import algosdk from 'algosdk';
import { CHAMPION_TRAITS } from '../../../components/contracts/Arena/traitsData';
import { CHAMPION_CREATOR, resolveLoadout } from '../../../lib/playground';
import { assetImageUrl } from '../../../lib/ipfsMedia';

const IDX='https://mainnet-idx.algonode.cloud', ALGOD='https://mainnet-api.algonode.cloud';
async function read(url, optional=false) {
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  try {const r=await fetch(url,{signal:controller.signal});if(optional&&r.status===404)return null;if(!r.ok)throw new Error(`Champion data service returned ${r.status}. Please retry.`);return await r.json();}
  finally {clearTimeout(timer);}
}
export default async function handler(req,res) {
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Use GET.'});}
  const id=Number(req.query.assetId),address=String(req.query.address||'');
  if(!Number.isSafeInteger(id)||id<=0||!algosdk.isValidAddress(address))return res.status(400).json({error:'Choose a champion from your connected wallet.'});
  res.setHeader('Cache-Control','no-store');
  try {
    const [assetResult,holdings]=await Promise.all([read(`${IDX}/v2/assets/${id}`),read(`${IDX}/v2/accounts/${address}/assets?asset-id=${id}`)]);
    const asset=assetResult.asset;
    if(asset?.params?.creator!==CHAMPION_CREATOR||Number(asset.params.total)!==1||asset.deleted)return res.status(400).json({error:'This NFT is not a Dark Coin Champion.'});
    if(!holdings.assets?.some(h=>Number(h['asset-id'])===id&&Number(h.amount)>0&&!h.deleted))return res.status(403).json({error:'This champion is no longer in the connected wallet.'});
    // Config notes are newest first; skip unrelated notes, and paginate until
    // a real ARC-69 trait payload is found rather than using the mint loadout.
    let metadata=null,next=null;
    for(let page=0;page<10&&!metadata;page++){
      const txs=await read(`${IDX}/v2/assets/${id}/transactions?tx-type=acfg&limit=100${next?'&next='+encodeURIComponent(next):''}`);
      for(const tx of [...(txs.transactions||[])].sort((a,b)=>b['confirmed-round']-a['confirmed-round']||(b['intra-round-offset']||0)-(a['intra-round-offset']||0))){
        try {const d=JSON.parse(Buffer.from(tx.note||'','base64').toString('utf8'));if(d.properties?.Skin){metadata=d;break;}}catch{}
      }
      next=txs['next-token'];if(!next)break;
    }
    if(!metadata)throw new Error('The champion’s trait metadata could not be found.');
    const properties={...metadata.properties};
    await Promise.all([['Head','H'],['Armour','A'],['Weapon','W'],['Magic','M'],['Extra','E']].map(async([category,suffix])=>{
      const key=Buffer.alloc(9);key.writeBigUInt64BE(BigInt(id));key[8]=suffix.charCodeAt(0);
      const box=await read(`${ALGOD}/v2/applications/1632253886/box?name=${encodeURIComponent('b64:'+key.toString('base64'))}`,true);
      if(!box)return; // Older uncustomized champions use their ARC-69 traits.
      const bytes=Buffer.from(box.value,'base64');if(bytes.length!==8)throw new Error('Invalid equipped trait data.');
      const traitId=Number(bytes.readBigUInt64BE());
      if(!traitId){properties[category]='None';return;}
      const trait=CHAMPION_TRAITS[category].find(t=>t.assetId===traitId);
      if(!trait)throw new Error(`Unknown equipped ${category.toLowerCase()} trait.`);
      properties[category]=trait.trait;
    }));
    return res.json({id,name:asset.params.name,image:assetImageUrl(asset.params),traits:properties,loadout:resolveLoadout(properties)});
  }catch(error){return res.status(502).json({error:error.name==='AbortError'?'Champion data timed out. Please retry.':error.message});}
}
