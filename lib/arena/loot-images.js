import {assetImageUrl,ipfsImageCandidates} from '../ipfsMedia';
export async function lootAssetImage(assetId,params){
 if(Number(assetId)===1088771340)return '/DarkCoinLogo.png';
 const source=assetImageUrl(params);if(!source)return '';
 // Resolve ARC-3/19 JSON only through fixed IPFS gateways, never arbitrary
 // treasury-supplied hosts or redirects into the server's private network.
 if(!/#arc3/i.test(params.url||'')&&!/^template-ipfs:/i.test(params.url||''))return source;
 if(!source.startsWith('https://ipfs-pera.algonode.dev/ipfs/'))return '';
 try{
  const response=await fetch(source,{signal:AbortSignal.timeout(4000),redirect:'error'});
  if(!response.ok)return '';const reader=response.body.getReader();let bytes=0,parts=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>65536)throw new Error('Metadata too large');parts.push(Buffer.from(value));}}finally{await reader.cancel();}
  const metadata=JSON.parse(Buffer.concat(parts).toString());return ipfsImageCandidates(metadata.image||'')[0]||'';
 }catch{return /#arc3/i.test(params.url||'')?'':source;}
}
