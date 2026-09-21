const catalog = require('./playground-catalog.json');
catalog.magic={dark_magic:'Dark Magic',fire_magic:'Fire Magic',lightning_magic:'Lightning Magic',water_magic:'Water Magic',ice_daggers:'Ice Daggers',poison_cloud:'Poison Cloud',blood_shards:'Blood-Shards'};
catalog.extras={crescent_moon_earring:'Crescent Moon Earring',dragon_fangs_earring:'Dragon Fangs Earring',fusion_pearl_earring:'Fusion Pearl Earring',tentacle_earring:'Tentacle Earring',hoop_earring:'Hoop Earring',golden_feathers:'Golden Feathers',battle_wound:'Battle Wound',crescent_birthmark:'Crescent-Birthmark'};
const CHAMPION_CREATOR = 'L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY';
const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases = {dragonlongsword:'dragon_longsword',sketoniansword:'sketonian_sword',skeletonianmask:'skel_tonian_mask'};
const SKINS = ['Dark Skin','Tribal Dark Skin','Tribal Light Skin','Fire Dragon','Undead','Chameleon','Light Skin','Elder Dragon','Snake'];
function traitId(category, value) {
  if (value == null || normalize(value) === 'none' || value === '') return null;
  const target = normalize(value);
  const id = Object.keys(catalog[category]).find(id => normalize(catalog[category][id]) === target || normalize(id) === target) || aliases[target];
  if (!id || !catalog[category][id]) throw new Error(`A 3D model is not available for ${value}.`);
  return id;
}
function resolveLoadout(properties) {
  if (!properties || !properties.Skin) throw new Error('This champion has no readable skin trait.');
  const skin = SKINS.find(s => normalize(s) === normalize(properties.Skin));
  if (!skin) throw new Error(`A skin appearance is not available for ${properties.Skin}.`);
  return {skin,head:traitId('heads',properties.Head),armour:traitId('armour',properties.Armour ?? properties.Armor),weapon:traitId('weapons',properties.Weapon),magic:traitId('magic',properties.Magic),extra:traitId('extras',properties.Extra),background:properties.Background||'Dawn Background'};
}
function ownedChampions(assets) {
  return (Array.isArray(assets) ? assets : []).filter(row => Number(row.amount) > 0 && row.asset?.params?.creator === CHAMPION_CREATOR && Number(row.asset.params.total) === 1 && !row.asset.deleted);
}
function movementClip(x,z,yaw,running=false) {
  if (Math.hypot(x,z) < .001) return 'Idle';
  const localX=x*Math.cos(yaw)-z*Math.sin(yaw), localZ=x*Math.sin(yaw)+z*Math.cos(yaw);
  const sector=(Math.round(Math.atan2(localX,localZ)/(Math.PI/4))+8)%8;
  return (running?'Run':'Walk')+['','_Forward_Right','_Right','_Backward_Right','_Backward','_Backward_Left','_Left','_Forward_Left'][sector];
}
function clampPosition(x,z,radius=13.4) {
  const length=Math.hypot(x,z),factor=length>radius?radius/length:1;
  return {x:x*factor,z:z*factor};
}
module.exports={catalog,CHAMPION_CREATOR,SKINS,normalize,traitId,resolveLoadout,ownedChampions,movementClip,clampPosition};
