// Independent arena allocations; legacy XP and legacy skill boxes are never changed.
export const ARENA_SKILLS_VERSION=1;
export const CHAMPION_XP_APP_ID=1870514811;
export const SKILL_BRANCHES=[
 {id:'warrior',name:'Warrior',color:'#df9a81',description:'Stronger, faster weapon attacks.',nodes:[
  {id:'force',name:'Force',icon:'weaponPowerPct',bonus:{weaponPowerPct:3},effect:'+3% weapon power per rank'},
  {id:'tempo',name:'Tempo',icon:'hastePct',requires:'force',bonus:{hastePct:2},effect:'+2% attack haste per rank'},
  {id:'precision',name:'Precision',icon:'critChancePct',requires:'tempo',bonus:{critChancePct:1},effect:'+1 percentage point critical chance per rank'}]},
 {id:'guardian',name:'Guardian',color:'#a9c7da',description:'Survive hits and recover control.',nodes:[
  {id:'vitality',name:'Vitality',icon:'maxHealth',bonus:{maxHealth:8},effect:'+8 maximum health per rank'},
  {id:'guard',name:'Guard',icon:'armour',requires:'vitality',bonus:{bluntResistance:2,slashingResistance:2,piercingResistance:2},effect:'+2 blunt, slashing and piercing resistance per rank'},
  {id:'resolve',name:'Resolve',icon:'tenacityPct',requires:'guard',bonus:{tenacityPct:3},effect:'+3% tenacity per rank'}]},
 {id:'ranger',name:'Ranger',color:'#afd0a0',description:'Keep moving for longer.',nodes:[
  {id:'endurance',name:'Endurance',icon:'maxStamina',bonus:{maxStamina:6},effect:'+6 maximum stamina per rank'},
  {id:'recovery',name:'Recovery',icon:'staminaRegenPct',requires:'endurance',bonus:{staminaRegenPct:3},effect:'+3% stamina recovery per rank'},
  {id:'footwork',name:'Footwork',icon:'moveSpeedPct',requires:'recovery',bonus:{moveSpeedPct:1},effect:'+1% movement speed per rank'}]},
 {id:'arcanist',name:'Arcanist',color:'#c5adf0',description:'Improve spells and staff attacks.',nodes:[
  {id:'attunement',name:'Attunement',icon:'abilityPowerPct',bonus:{abilityPowerPct:3},effect:'+3% magic power per rank'},
  {id:'channeling',name:'Channeling',icon:'castSpeedPct',requires:'attunement',bonus:{castSpeedPct:2},effect:'+2% casting speed per rank'},
  {id:'clarity',name:'Clarity',icon:'cooldownReductionPct',requires:'channeling',bonus:{cooldownReductionPct:2},effect:'+2% spell cooldown reduction per rank'}]},
 {id:'duelist',name:'Duelist',color:'#efb2c0',description:'Sharper critical hits and protection against counters.',nodes:[
  {id:'deadly_edge',name:'Deadly Edge',icon:'critMultiplier',bonus:{critMultiplier:.06},effect:'+0.06× critical multiplier per rank'},
  {id:'composure',name:'Composure',icon:'critBonusReductionPct',requires:'deadly_edge',bonus:{critBonusReductionPct:3},effect:'+3% critical bonus protection per rank'},
  {id:'blade_mastery',name:'Blade Mastery',icon:'weaponPowerPct',requires:'composure',bonus:{weaponPowerPct:2},effect:'+2% weapon power per rank'}]},
 {id:'spellbreaker',name:'Spellbreaker',color:'#91cfe1',description:'Withstand elemental magic and disabling effects.',nodes:[
  {id:'elemental_ward',name:'Elemental Ward',icon:'frost',bonus:{fireResistance:3,frostResistance:3,lightningResistance:3},effect:'+3 fire, frost and lightning resistance per rank'},
  {id:'mystic_ward',name:'Mystic Ward',icon:'arcane',requires:'elemental_ward',bonus:{waterResistance:3,poisonResistance:3,shadowResistance:3,arcaneResistance:3},effect:'+3 water, poison, shadow and arcane resistance per rank'},
  {id:'unbroken',name:'Unbroken',icon:'tenacityPct',requires:'mystic_ward',bonus:{tenacityPct:3},effect:'+3% tenacity per rank'}]},
 {id:'reaver',name:'Reaver',color:'#e7a17c',description:'Universal damage and more dangerous critical hits.',nodes:[
  {id:'ferocity',name:'Ferocity',icon:'powerPct',bonus:{powerPct:2},effect:'+2% universal power per rank'},
  {id:'keen_instinct',name:'Keen Instinct',icon:'critChancePct',requires:'ferocity',bonus:{critChancePct:1},effect:'+1 percentage point critical chance per rank'},
  {id:'devastation',name:'Devastation',icon:'critMultiplier',requires:'keen_instinct',bonus:{critMultiplier:.04},effect:'+0.04× critical multiplier per rank'}]},
 {id:'pathfinder',name:'Pathfinder',color:'#c7d897',description:'Spend less stamina and stay mobile during long fights.',nodes:[
  {id:'economy_of_motion',name:'Economy of Motion',icon:'sprintCostReductionPct',bonus:{sprintCostReductionPct:3},effect:'+3% sprint efficiency per rank'},
  {id:'second_wind',name:'Second Wind',icon:'staminaRegenPct',requires:'economy_of_motion',bonus:{staminaRegenPct:2},effect:'+2% stamina recovery per rank'},
  {id:'deep_reserves',name:'Deep Reserves',icon:'maxStamina',requires:'second_wind',bonus:{maxStamina:4},effect:'+4 maximum stamina per rank'}]},
];
export const SKILL_NODES=SKILL_BRANCHES.flatMap(branch=>branch.nodes.map(node=>({...node,branch:branch.id,maxRank:3})));
const nodes=new Map(SKILL_NODES.map(node=>[node.id,node]));

export function championLevel(value='0'){
 const raw=String(value);
 if(!/^\d{1,20}$/.test(raw))throw new Error('Invalid champion XP.');
 const xp=BigInt(raw);if(xp>18446744073709551615n)throw new Error('Invalid champion XP.');
 // Legacy thresholds: level 2 at 100, level 3 at 400, level 4 at 900.
 const n=xp/100n;let low=0n,high=429496730n;
 while(low<high){const mid=(low+high+1n)/2n;if(mid*mid<=n)low=mid;else high=mid-1n;}
 const level=Number(low)+1,previous=100n*low*low,next=100n*(low+1n)*(low+1n);
 return {xp:xp.toString(),level,points:level,previousXp:previous.toString(),nextXp:next.toString(),progress:Number((xp-previous)*10000n/(next-previous))/100};
}
export const spentSkillPoints=ranks=>Object.values(ranks||{}).reduce((sum,rank)=>sum+rank,0);
export function validateSkills(value={},xp='0'){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>SKILL_NODES.length)throw new Error('Invalid arena skill selection.');
 const ranks={};
 for(const [id,rank] of Object.entries(value)){
  if(!nodes.has(id)||!Number.isInteger(rank)||rank<0||rank>3)throw new Error('Invalid arena skill rank.');
  if(rank)ranks[id]=rank;
 }
 for(const node of SKILL_NODES)if(ranks[node.id]&&node.requires&&(ranks[node.requires]||0)<2)throw new Error(`${node.name} requires two ranks in ${nodes.get(node.requires).name}.`);
 if(spentSkillPoints(ranks)>championLevel(xp).points)throw new Error('Your arena skill selection exceeds this champion’s level.');
 return ranks;
}
export function skillBonuses(ranks={}){
 const bonuses={};
 for(const node of SKILL_NODES)for(const [stat,amount] of Object.entries(node.bonus))bonuses[stat]=(bonuses[stat]||0)+amount*(ranks[node.id]||0);
 return bonuses;
}
export function changeSkill(ranks,id,delta,xp){
 const next={...ranks,[id]:(ranks[id]||0)+delta};
 // Refunding a prerequisite also refunds its dependents, without losing points.
 if(delta<0)for(const node of SKILL_NODES)if(node.requires&&(next[node.requires]||0)<2)delete next[node.id];
 return validateSkills(next,xp);
}
