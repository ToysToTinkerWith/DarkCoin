const test=require('node:test'),assert=require('node:assert/strict');
const {resolveLoadout,traitId,ownedChampions,movementClip,clampPosition,CHAMPION_CREATOR}=require('../lib/playground');
test('resolves all six modeled NFT categories and optional unequipped traits',()=>{
  assert.deepEqual(resolveLoadout({Skin:'Undead',Head:"Skel'tonian Mask",Armour:'Earth-Faction',Weapon:'Dragon Long Sword',Extra:'Golden Feathers',Magic:'Fire Magic'}),{skin:'Undead',head:'skel_tonian_mask',armour:'earth_faction',weapon:'dragon_longsword',magic:'fire_magic',extra:'golden_feathers',background:'Dawn Background'});
  assert.equal(traitId('weapons',"Ske'tonian Sword"),'sketonian_sword');
  assert.deepEqual(resolveLoadout({Skin:'Dark Skin',Head:'None',Armour:'None',Weapon:'None'}),{skin:'Dark Skin',head:null,armour:null,weapon:null,magic:null,extra:null,background:'Dawn Background'});
  assert.throws(()=>resolveLoadout({Skin:'Unknown'}),/not available/);
  assert.throws(()=>traitId('heads','new unknown head'),/not available/);
});
test('roster excludes sold NFTs, fungible assets and other creators',()=>{
  const row=(amount,total=1,creator=CHAMPION_CREATOR)=>({amount,asset:{params:{total,creator}}});
  assert.equal(ownedChampions([row(1),row(0),row(1,100),row(1,1,'other')]).length,1);
});
test('gait follows movement relative to mouse-facing yaw in all eight directions',()=>{
  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4,x=Math.sin(angle),z=Math.cos(angle);
    assert.equal(movementClip(x,z,angle),'Walk');
    assert.equal(movementClip(x,z,angle+Math.PI),'Walk_Backward');
    assert.equal(movementClip(x,z,angle,true),'Run');
  }
  assert.equal(movementClip(1,0,0),'Walk_Right');assert.equal(movementClip(-1,0,0),'Walk_Left');assert.equal(movementClip(0,0,1),'Idle');
});
test('circular collision keeps movement inside the wall, preserving direction',()=>{
  for(let a=0;a<6.3;a+=.1){const p=clampPosition(Math.sin(a)*20,Math.cos(a)*20);assert.ok(Math.abs(Math.hypot(p.x,p.z)-13.4)<1e-10);}
  assert.deepEqual(clampPosition(2,3),{x:2,z:3});
});
