const DARK_ASSET_ID=1088771340;

// Round the display only. Keep atomic-unit payout calculations on the server.
export function previewTokenAmount(asset,amount){
 const decimals=asset.decimals||0;
 if(asset.id===DARK_ASSET_ID){
  // Next's legacy browser transform rewrites exponentiation to Math.pow,
  // which cannot accept BigInt. Build the exact decimal scale as a string.
  const scale=BigInt('1'+'0'.repeat(decimals)),atomic=BigInt(amount);
  return ((atomic+scale-1n)/scale).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
 }
 const raw=String(amount).padStart(decimals+1,'0'),whole=decimals?raw.slice(0,-decimals):raw,fraction=decimals?raw.slice(-decimals).replace(/0+$/,''):'';
 return whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(fraction?'.'+fraction:'');
}
