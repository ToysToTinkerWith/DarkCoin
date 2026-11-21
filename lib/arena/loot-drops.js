// Shared presentation/validation. Coordinates come from the recorded server defeat.
export const PICKUP_RADIUS=1.4;
export function dropPosition(row,slot){
 const angle=slot*Math.PI/4,x=Number(row.beast?.x)||0,z=Number(row.beast?.z)||0;
 let dx=x+Math.sin(angle)*1.7,dz=z+Math.cos(angle)*1.7;
 const length=Math.hypot(dx,dz);if(length>17){dx*=17/length;dz*=17/length;}
 return {x:dx,z:dz};
}
export function canPickUp(player,row,hour){
 return !!player&&player.hp>0&&player.connected!==false&&row.hour===hour&&row.rewardWallet===player.rewardAddress&&
  row.claim.assetId===player.champion.id&&row.claim.rewardAssetId>0&&!row.pickedUpAt&&
  Number.isFinite(row.drop?.x)&&Number.isFinite(row.drop?.z)&&Math.hypot(player.x-row.drop.x,player.z-row.drop.z)<=PICKUP_RADIUS;
}
export function visibleDrop(id,row){
 return {id,hour:row.hour,slot:row.claim.slot,...row.drop,assetId:row.claim.rewardAssetId,name:row.claim.name,amount:row.claim.amount,
  decimals:row.claim.decimals,image:row.claim.image||'',kind:row.claim.kind,pickedUp:!!row.pickedUpAt,status:row.deliveryStatus||'available'};
}
export function formatLootAmount(amount,decimals=0){
 const raw=String(amount).padStart(decimals+1,'0'),fraction=decimals?raw.slice(-decimals).replace(/0+$/,''):'';
 return decimals?raw.slice(0,-decimals)+(fraction?'.'+fraction:''):raw;
}
