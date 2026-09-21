/**
 * 3D arena rules, version 1.4.0. Shared by the authoritative playground simulation.
 * The legacy catalog supplies identities ONLY. No old effects, damage rolls,
 * damage types, rarity bonuses, or speed factors are inherited.
 * Seconds, metres, HP and percentage points are used throughout.
 */
import {CHAMPION_TRAITS} from './3dTraitsData';
import {HEAD_PERKS,ARMOUR_PERKS,EXTRA_PERKS,SKIN_PERKS,BACKGROUND_PERKS,WEAPON_PROC_CHANCES,WEAPON_EXTRA_PERKS,passive} from './arenaTraitPerksV1';

export const DAMAGE_TYPES = ['blunt','slashing','piercing','fire','frost','lightning','water','poison','shadow','arcane'];
export const STAT_DEFINITIONS = {
  maxHealth:{label:'Maximum health',base:200,cap:[160,280],unit:'HP',effect:'Damage required to defeat the champion.'},
  maxStamina:{label:'Maximum stamina',base:100,cap:[100,140],unit:'points',effect:'Sprint endurance; attacks cost no stamina.'},
  staminaRegenPct:{label:'Stamina recovery',base:0,cap:[0,25],unit:'%',effect:'Increases the 22 stamina/s recovery rate after its delay.'},
  powerPct:{label:'Universal power',base:0,cap:[0,18],unit:'%',effect:'Increases all damage; adds to the relevant specialized power, combined cap 25%.'},
  weaponPowerPct:{label:'Weapon power',base:0,cap:[0,18],unit:'%',effect:'Boosts melee, punches and bow attacks plus their applied DOTs. Staff bolts use magic power instead.'},
  abilityPowerPct:{label:'Magic power',base:0,cap:[0,18],unit:'%',effect:'Boosts staff LMB bolts and all E abilities, their DOTs and fields; never control duration or projectile size.'},
  hastePct:{label:'Attack haste',base:0,cap:[0,18],unit:'%',effect:'Shortens the complete LMB cycle; does not alter draw/stow or magic cooldown.'},
  castSpeedPct:{label:'Casting speed',base:0,cap:[0,15],unit:'%',effect:'Shortens E cast time; minimum cast 0.55 s. Does not alter projectile travel speed.'},
  moveSpeedPct:{label:'Movement speed',base:0,cap:[-10,10],unit:'%',effect:'Multiplies walk/run speed before directional and action modifiers.'},
  tenacityPct:{label:'Tenacity',base:0,cap:[0,40],unit:'%',effect:'Shortens slows, Exposed, Weaken and Stagger; does not shorten DOTs.'},
  cooldownReductionPct:{label:'Ability cooldown reduction',base:0,cap:[0,20],unit:'%',effect:'Reduces the cooldown that starts when E casting finishes or is interrupted.'},
  critChancePct:{label:'Critical chance',base:10,cap:[10,25],unit:'%',effect:'10% baseline; gear and temporary buffs add percentage points, capped at 25%.'},
  critMultiplier:{label:'Critical multiplier',base:2,cap:[2,2.5],unit:'x',effect:'2x baseline; gear adds to the multiplier, capped at 2.5x. No DOT/field crits.'},
  critBonusReductionPct:{label:'Critical bonus protection',base:0,cap:[0,30],unit:'%',effect:'Reduces only the bonus portion of an incoming critical, never its normal-hit portion.'},
  sprintCostReductionPct:{label:'Sprint efficiency',base:0,cap:[0,25],unit:'%',effect:'Reduces sprint stamina drain: 18 * (1 - reduction/100) points/s.'},
  ...Object.fromEntries(DAMAGE_TYPES.map(type=>[type+'Resistance',{
    label:type[0].toUpperCase()+type.slice(1)+' resistance',base:20,cap:[0,65],unit:'rating',
    effect:`Reduces ${type} damage only: damage multiplier = 100 / (100 + rating).`,
  }])),
};

export const ARENA_RULES = {
  version: '1.4.0', status: 'playtest-candidate',
  mode: {initial:'freeForAll',maxPlayers:8,friendlyFire:true,death:'Remove champion from the room; explicit practice re-entry with a fresh NFT ownership lookup required.',resetOnEntry:['health','stamina','statuses','magicCooldown','weaponCarryState'],spawnRadiusM:10},
  base: Object.fromEntries(Object.entries(STAT_DEFINITIONS).map(([key,s])=>[key,s.base])),
  caps: Object.fromEntries(Object.entries(STAT_DEFINITIONS).map(([key,s])=>[key,s.cap])),
  movement: {walkMps: 1.65, runMps: 3.2, backwardMultiplier: .8, sideMultiplier: .9,
    diagonalNormalization: true, attackMoveMultiplier: .75, castMoveMultiplier: .7,
    sprintDuringAttack: true, staminaStat:'maxStamina', sprintCostPerSecond: 18,
    staminaRegenPerSecond: 22, staminaRegenDelaySeconds: 1,
    attackStaminaCost: 0, emptyStaminaBehavior: 'Walk; attacking remains available.'},
  inputs: {move: 'WASD', sprint: 'Shift', aim: 'Mouse', weaponToggle: 'RMB', attack: 'LMB', ability: 'E'},
  timing: {simulationHz: 30, inputBufferSeconds: .12,
    globalActionLock: ['attack','ability','draw','stow'],
    cancelRule: 'Movement and facing remain available; committed actions cannot cancel into another action.',
    interruptedAction: 'Skip remaining hits and consume recovery. Only an interrupted magic cast starts a recast cooldown.'},
  targeting: {melee: 'Swept weapon volume during its authored strike window; no hit merely from the VFX ribbon.',
    meleeDeduplication: 'One hit per target per attackId and strike index; each katana/punch is a separate strike.',
    projectiles: 'Swept sphere from previous to next position; first champion or wall stops it; owner ignored.',
    projectileHeading: 'Snapshot champion facing at release. No homing or camera auto-aim.',
    hitbox: 'Identical body capsules for all skins; ears, tails, wings and equipment do not enlarge the hurtbox.',
    cleave: 'Full damage and independent crit/proc rolls on each confirmed target. One hit per target per strike.',
    headshots: false},
  damage: {physical: ['slashing','piercing','blunt'], elemental: ['fire','frost','lightning','water','poison','shadow','arcane'],
    formula: 'rolledDamage * critMultiplier * (1 + combinedPowerPct / 100) * 100 / (100 + damageTypeResistance)',
    combinedPowerCapPct:25,
    defence: 'Use exactly one matching resistance: blunt, slashing, piercing, fire, frost, lightning, water, poison, shadow or arcane. Source weapon/ability does not determine defence. Exposed subtracts 8 from the matching rating, minimum 0.',
    order: ['dice total including flat bonus','critical multiplier','outgoing power and weaken','matching resistance','front guard','temporary barrier','health'],
    rounding: 'Keep float HP internally; round only UI numbers.', crits: {chance:.10,multiplier:2}, randomMisses: false,
    rolls:'Each confirmed strike rolls its own dice and one independent critical check. Every confirmed target rolls independently. Dual weapons roll independently per strike. Misses do not reroll; an attackId/strike/target deduplication record prevents duplicate hits.',
    randomness:'Authoritative match RNG only. Inject RNG into helpers; record rolls for replays. Never use frame rate, clients or VFX particle count to decide damage.',
    secondaryDamage:'Burn/Bleed/Poison use their fixed rates and never crit. A poison field rolls its rate once per cast, never per frame, and never crits. A critical impact does not amplify its applied status or field.',
    dotPower: 'Snapshot source power on application; use current target defence at each tick.',
    dotDisplayTickSeconds: 1, rawDotDpsCap: 8, barrierCapHp: 30,
    periodicCap: 'No shared periodic DPS cap: stacked DOT potency scales its full rate. Mitigate each DOT/field contribution, then apply rate * dt. Aggregate floating damage labels once per second.',
    guardAffectsDots: false, procsFromDots: false, lifestealFromDots: false},
  statuses: {stacking: 'One effect entry per target and status, shared across attackers. Every successful application adds one stack and its potency to the total.',
    refresh: 'Add incoming potency and reset the whole stack expiry to now plus the effect duration after tenacity. Expired or cleansed effects restart at one stack. Refresh never applies an instant damage tick.',
    credit: 'Latest applying source receives status damage credit. Preserve accumulated damage power using a potency-weighted average of applications.',
    slows: 'Stack potency within each slow; use the strongest slow type. Clamp movement reduction to 100% so it cannot reverse movement.',
    tenacity: 'Multiply incoming slow, exposed, weaken and stagger duration by (1 - tenacityPct/100). Does not shorten DOTs.',
    potency: {minimum:.25,maximumPerApplication:2,default:1,stacking:'Sum application potency without a stack cap. HUD displays application count, not fractional potency. Percentage reductions stop at 100%.'},
    knockback: 'Clamp to arena and collision geometry. No wall damage; does not interrupt unless stagger is also applied.',
    sourceCooldown: 'None. Every confirmed hit independently rolls each effect, even immediately after success.'},
  perks:{
    maxPerTrait:2,
    counts:'One named passive, conditional or triggered mechanic counts as one perk. Weapon/ability base damage and universal Second wind are baseline mechanics, not extra perks.',
    eventOrder:'Resolve death first. Survivors emit damage-taken events. Emit primary-hit events, roll weapon procs and apply statuses, then emit debuffApplied reactions. A lethal hit cannot trigger a survival heal or barrier.',
    hitEligibility:'Each confirmed primary hit, including each katana strike, independently rolls eligible on-hit effects. Repeated overlap from the same strike is deduplicated. DOTs and fields never roll additional hit effects.',
    procChance:'Each eligible effect independently rolls its chance on every confirmed hit, including consecutive successes. No internal effect cooldown. No proc chains.',
    linkedWeaponHandlers:'Abilities marked weaponOnHit describe their indexed onHit entry; process that entry ONCE, not a second time as a generic perk. magicCast similarly describes the equipped E action.',
    conditionalSampling:'movingAtCommit and stationarySecondsAtLeast are snapshots at action commitment. Source and target conditions use the pre-hit state. critical:false is evaluated after the critical roll and may modify power only. Re-evaluate health threshold buffs for every hit.',
    buffs:'Sum different stat buffs with gear, then clamp to STAT_DEFINITIONS caps. Same perk refreshes, never stacks. All damage increases must use the power stats and the shared 25% combined power cap.',
    refunds:'Maximum 2s cooldown refund per cast, never reduce the post-cast cooldown below 4s. Hits before casting ends bank the refund for that cast. Refunds never reset the ability or refund a later cast.',
    healing:'Every qualifying hit can heal. Clamp to missing health. No timer or cooldown; heal amounts are deliberately small.',
    barriers:'Shared 30 HP barrier pool. Grants add only until 30; each grant keeps its own expiry and earliest-expiring HP is consumed first. No damage reflection or barrier procs.',
    resets:'New entry resets health, stamina, statuses and action identifiers. Changing carry state never resets magic cooldown.',
    eventDefinitions:{weaponHit:'Confirmed primary LMB hit, including staff bolts.',abilityHit:'Confirmed primary E projectile impact.',directHit:'weaponHit or abilityHit.',weaponCritical:'weaponHit that crits.',abilityCritical:'abilityHit that crits.',directDamageTaken:'Surviving a primary direct hit that removes health; periodic and barrier-only damage excluded.',criticalDamageTaken:'directDamageTaken from a critical.',abilityFinished:'Successful completion of E casting; not interruption.',weaponDrawn:'Completed draw, not the button press.',weaponStowed:'Completed stow.',debuffApplied:'A hostile debuff actually applied/refreshed; immunities do not emit it. Reaction perks cannot generate new proc events.',weaponMissed:'Completed LMB action with zero targets hit across ALL strikes.',roundStarted:'After countdown ends.'},
  },
  fairness: {rarityGrantsPower: false, skinsAndBackgroundsCosmetic: false,
    emptySlots: {head:null,armour:null,extra:null,weapon:'unarmed',magic:null,background:'dawn_background'},
    duplicateAccessories: 'An Extra on both ears counts once, not twice.',
    loadoutChanges: 'Only on entry; validate public NFT ownership and current equipped traits on the authority. Practice entry has no wallet signature and does not prove wallet control.'},
  targets: {weaponRawSustainedDps: [23,33], typicalDuelSeconds: [9,15],
    note: 'DPS target includes long-run DOT uptime at full hit rate, not burst. Range, guard, mobility and control justify differences. Duel length is a design target, not a measured result.'},
};

export const DAMAGE_PALETTE = {slashing:'#c8e9ff',piercing:'#ffe58a',blunt:'#e5aa59',fire:'#ff742e',
  frost:'#83eeff',lightning:'#fff14e',water:'#269fff',poison:'#66ef68',shadow:'#a965ff',arcane:'#ed79ff'};

export const STATUS_EFFECTS = {
  burn: {label:'Burn',kind:'dot',damageType:'fire',damagePerSecond:4,durationSeconds:2,cleanseable:true},
  bleed: {label:'Bleed',kind:'dot',damageType:'slashing',damagePerSecond:3,durationSeconds:3,cleanseable:true},
  poison: {label:'Poison',kind:'dot',damageType:'poison',damagePerSecond:3,durationSeconds:4,cleanseable:true},
  chill: {label:'Chill',kind:'slow',slowPct:20,durationSeconds:2,cleanseable:true},
  soaked: {label:'Soaked',kind:'slow',slowPct:12,durationSeconds:2.5,cleanseable:true},
  exposed: {label:'Exposed',kind:'defenceReduction',allResistanceReduction:8,durationSeconds:3,cleanseable:true},
  weaken: {label:'Weaken',kind:'outgoingDamageReduction',powerReductionPct:8,durationSeconds:2.5,cleanseable:true,
    calculation:'Multiply outgoing direct and snapshotted periodic damage by 0.92 after equipment power.'},
  stagger: {label:'Stagger',kind:'interrupt',durationSeconds:.16,cleanseable:false,
    behavior:'Interrupt once and briefly prevent actions; never ragdoll. Repeated hits can interrupt again; no immunity cooldown.'},
  knockback: {label:'Push',kind:'displacement',distanceM:.65,durationSeconds:.12,cleanseable:false},
};

// Perk budget weights are design allowances, not proof of equal win rates.
export const SLOT_BUDGETS = {Head:6,Armour:12,Extra:4,Skin:4,Background:2,Weapon:2,Magic:2};
function bindPerks(entry,abilities,budget){
  if(abilities.length<1||abilities.length>2)throw new Error('Traits need one or two perks: '+entry.name);
  entry.abilities=abilities.map((a,i)=>({...a,budgetWeight:abilities.length===1?budget:i===0?Math.floor(budget/2):Math.ceil(budget/2)}));
  entry.statBonuses={};
  for(const a of entry.abilities)if(a.trigger==='always')for(const [key,value] of Object.entries(a.statBonuses||{}))entry.statBonuses[key]=(entry.statBonuses[key]||0)+value;
  return entry;
}
const status = (id) => ({id,trigger:'confirmedHit',strike:'each',chance:1,potency:1});
const projectileSpec = spec => {
  if(!spec)return undefined;
  if(!(spec.widthM>0&&spec.maxRangeM>0&&spec.speedMps>0))throw new Error('Invalid projectile size/range');
  return {...spec,collider:'sweptSphere',widthDefinition:'Full collision diameter in metres; radius = widthM / 2. Visual must match.'};
};
const weapon = (name,animation,damageType,damageRolls,cycleSeconds,reachM,onHit=[],options={}) => ({
  name,animation,damageType,damageRolls,cycleSeconds,attacksPerSecond:1/cycleSeconds,reachM,onHit,statBonuses:{},
  powerSource:animation==='dragon_staff'?'ability':'weapon',
  critical:{chance:.1,multiplier:2},criticalUsesChampionStats:true,
  attackKind:'melee',statusPolicy:'Each confirmed hit rolls independently; no proc or crit cooldown.',
  hitRadiusM:.12, ...options,projectile:projectileSpec(options.projectile),
});

export const WEAPONS = {
  dragon_longsword: weapon('Dragon Long Sword','dragon_longsword','fire',['4d6+17'],1.4,1.9,[status('burn')]),
  dragon_staff: weapon('Dragon Staff','dragon_staff','fire',['3d10+16'],1.65,13,[status('burn')],
    {attackKind:'projectile',projectile:{speedMps:9,widthM:0.32,maxRangeM:13}}),
  dual_katana: weapon('Dual Katana','dual_katana','slashing',['3d6+5','3d6+5'],1.15,1.5,[],{hitRadiusM:.10}),
  executioner_axe: weapon('Executioner Axe','executioner_axe','slashing',['5d8+22'],1.7,2,[status('stagger')],{hitRadiusM:.18}),
  scythe: weapon('Scythe','scythe','slashing',['3d10+20'],1.55,2.3,[status('bleed')],{hitRadiusM:.14}),
  shield: weapon('Shield','shield','blunt',['3d8+12'],1.2,1.05,[status('knockback')],
    {guard:{frontConeDegrees:100,damageReductionPct:15,moveSpeedPenaltyPct:5,
      activeWhen:'Held, idle or moving; inactive for the entire attack, ability, draw or stow.',stacks:false}}),
  sickle: weapon('Sickle','sickle','slashing',['3d6+12'],1,1.42,[status('bleed')]),
  spear: weapon('Spear','spear','piercing',['4d6+18'],1.25,2.5,[],{hitRadiusM:.09}),
  trident: weapon('Trident','trident','water',['4d6+18'],1.35,2.35,[status('soaked')],{hitRadiusM:.14}),
  dark_sword: weapon('Dark Sword','dark_sword','shadow',['4d6+17'],1.25,1.85,[status('weaken')]),
  elf_bow: weapon('Elf Bow','elf_bow','piercing',['4d8+13'],1.35,15,[],
    {attackKind:'projectile',projectile:{speedMps:16,widthM:0.16,maxRangeM:15}}),
  wooden_club: weapon('Wooden Club','wooden_club','blunt',['4d10+20'],1.6,1.9,[status('knockback'),status('stagger')],{hitRadiusM:.20}),
  snake_wings: weapon('Snake Wings','snake_wings','poison',['2d6+5','2d6+5'],1,1.05,[status('poison')],
    {attackKind:'punch',permanent:true,statBonuses:{moveSpeedPct:2}}),
  sketonian_sword: weapon("Ske'tonian Sword",'dark_sword','slashing',['4d6+17'],1.3,1.8,[status('exposed')]),
  fire_wings: weapon('Fire Wings','snake_wings','fire',['2d6+5','2d6+5'],1.05,1.05,[status('burn')],
    {attackKind:'punch',permanent:true,statBonuses:{moveSpeedPct:2}}),
  elder_wings: weapon('Elder Wings','snake_wings','arcane',['3d4+5','3d4+5'],1.05,1.05,[status('weaken')],
    {attackKind:'punch',permanent:true,statBonuses:{moveSpeedPct:2}}),
  chameleon_wings: weapon('Chameleon Wings','snake_wings','poison',['3d4+5','3d4+5'],1,1.05,[],
    {attackKind:'punch',permanent:true,statBonuses:{moveSpeedPct:3}}),
  arctic_dual_katana: weapon('Arctic Dual Katana','dual_katana','frost',['3d6+3','3d6+3'],1.15,1.55,[status('chill')]),
  rusty_sword: weapon('Rusty Sword','dark_sword','slashing',['4d6+14'],1.05,1.65,[]),
  lightning_staff: weapon('Lightning Staff','dragon_staff','lightning',['4d6+18'],1.45,12,[status('exposed')],
    {attackKind:'projectile',projectile:{speedMps:12,widthM:0.26,maxRangeM:12}}),
  hedge_knight_sword: weapon('Hedge-Knight Sword','dark_sword','slashing',['4d6+18'],1.25,1.8,[]),
};

const ability = (name,label,damageType,damageRoll,cooldownSeconds,onHit,projectile,options={}) => ({
  name,label,damageType,damageRoll,cooldownSeconds,castSeconds:.65,releasePhase:.6,powerSource:'ability',
  critical:{chance:.1,multiplier:2},criticalUsesChampionStats:true,onHit,projectile:projectileSpec(projectile),attackKind:'projectile',...options,
});
export const MAGIC = {
  dark_magic: ability('Dark Magic','Withering bolt','shadow','4d6+8',11,[status('weaken')],{speedMps:10,widthM:0.4,maxRangeM:11}),
  fire_magic: ability('Fire Magic','Ember shot','fire','3d8+14',11,[status('burn')],{speedMps:10,widthM:0.36,maxRangeM:11}),
  lightning_magic: ability('Lightning Magic','Disrupting spark','lightning','4d6+9',12,[status('stagger')],{speedMps:17,widthM:0.24,maxRangeM:10}),
  water_magic: ability('Water Magic','Tidal pulse','water','4d6+6',11,[status('soaked'),status('knockback')],{speedMps:9,widthM:0.5,maxRangeM:10}),
  ice_daggers: ability('Ice Daggers','Ice lance','frost','4d6+9',12,[status('chill')],{speedMps:13,widthM:0.3,maxRangeM:11},
    {visual:'Render several ice daggers around ONE collider; roll the direct damage once, not once per visible dagger.'}),
  poison_cloud: ability('Poison Cloud','Venom mist','poison','3d4+5',13,[status('poison')],{speedMps:8,widthM:0.44,maxRangeM:9},
    {impactField:{radiusM:1.4,durationSeconds:3,damageRateRoll:'1d4+1',rollOncePerCast:true,canCrit:false,damageType:'poison',appliesStatuses:false,
      placement:'At first impact or maximum range; only the initial impact applies poison.',maxActivePerCaster:1}}),
  blood_shards: ability('Blood-Shards','Crimson shard','slashing','3d6+13',11,[status('bleed')],{speedMps:12,widthM:0.3,maxRangeM:10},
    {visual:'Shard fan is one projectile collider, with one hit per target.'}),
};

const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
function makeTraits(category,profiles){
  return Object.fromEntries(CHAMPION_TRAITS[category].map(({trait:name})=>{
    const id=slug(name);if(!profiles[id])throw new Error('Missing perk profile: '+name);
    return [id,bindPerks({name},profiles[id],SLOT_BUDGETS[category])];
  }));
}
export const HEADS=makeTraits('Head',HEAD_PERKS);
export const ARMOUR=makeTraits('Armour',ARMOUR_PERKS);
export const EXTRAS=makeTraits('Extra',EXTRA_PERKS);
export const SKINS=makeTraits('Skin',SKIN_PERKS);
export const BACKGROUNDS=makeTraits('Background',BACKGROUND_PERKS);
// Common arena recovery is baseline for everyone, not an extra skin perk.
export const COMMON_SKIN_PASSIVE={id:'second_wind',label:'Second wind',trigger:'outOfCombat',delaySeconds:6,healPerSecond:8,capAtMaxHealth:true,
  resetDelayOn:['attack started','ability started','damage dealt','damage received'],blockedWhile:['any damaging status','round countdown']};

for(const [id,w] of Object.entries(WEAPONS)){
  w.onHit.forEach((effect,i)=>{effect.chance=WEAPON_PROC_CHANCES[id]?.[i]??1;effect.potency=({executioner_axe:1.25,scythe:1.15,sickle:.85,snake_wings:.75,fire_wings:.75,elder_wings:.8,arctic_dual_katana:.8,wooden_club:1.15})[id]??1;});
  const perks=w.onHit.map((effect,i)=>({id:id+'_'+effect.id,name:STATUS_EFFECTS[effect.id].label+' strike',
    description:`${Math.round(effect.chance*100)}% chance to apply ${STATUS_EFFECTS[effect.id].label} on every confirmed hit at ${effect.potency}x potency; no cooldown.`,
    trigger:'weaponHit',chance:effect.chance,potency:effect.potency,strike:'each',deduplicate:'oncePerConfirmedHit',
    actions:[{type:'applyStatus',id:effect.id,target:'target',potency:effect.potency}],handler:'weaponOnHit',onHitIndex:i}));
  if(w.guard)perks.push({id:'shield_guard',name:'Frontal Guard',description:'While held outside actions, reduce frontal direct damage by 15% in a 100-degree cone; movement is 5% slower.',trigger:'guard',guard:w.guard});
  for(const perk of WEAPON_EXTRA_PERKS[id]||[])perks.push(perk);
  if(w.permanent)perks.push(passive(id+'_mobility','Wing Footwork',`+${w.statBonuses.moveSpeedPct}% movement speed; wings never enable flight.`,{moveSpeedPct:w.statBonuses.moveSpeedPct}));
  bindPerks(w,perks,SLOT_BUDGETS.Weapon);
}
for(const a of Object.values(MAGIC))for(const e of a.onHit)e.potency=1.25;
for(const [id,a] of Object.entries(MAGIC))bindPerks(a,[{id:id+'_cast',name:a.label,trigger:'activeAbility',handler:'magicCast',
  description:`Cast ${a.damageRoll} ${a.damageType} damage; ${a.projectile.maxRangeM}m range, ${a.projectile.widthM}m width. On hit: ${a.onHit.map(e=>STATUS_EFFECTS[e.id].label).join(' and ')}. ${a.cooldownSeconds}s cooldown after casting.${a.impactField?' Impact mist: roll '+a.impactField.damageRateRoll+' HP/s once per cast; '+a.impactField.radiusM+'m radius for '+a.impactField.durationSeconds+'s; no crits or extra status procs.':''}` }],SLOT_BUDGETS.Magic);

export const TRAINING = {
  weapon:weapon('Training Sword','dark_sword','slashing',['4d6+18'],1.25,1.8,[]),
  magic:ability('Training Pulse','Training pulse','arcane','4d6+15',11,[],{speedMps:11,widthM:0.36,maxRangeM:11}),
};
Object.assign(TRAINING.weapon,{id:'training_sword',modelId:'dark_sword',category:'Weapon',assetId:null});
Object.assign(TRAINING.magic,{id:'training_pulse',modelId:'dark_magic',category:'Magic',assetId:null});
bindPerks(TRAINING.weapon,[passive('training_forms','Training Forms','+2% attack haste.',{hastePct:2})],SLOT_BUDGETS.Weapon);
bindPerks(TRAINING.magic,[{id:'training_cast',name:'Training Pulse',trigger:'activeAbility',handler:'magicCast',description:'Cast the training arcane projectile; no additional status.'}],SLOT_BUDGETS.Magic);
export const UNARMED={...WEAPONS.snake_wings,id:'unarmed',name:'Unarmed',damageType:'blunt',damageRolls:['2d6+5','2d6+5'],onHit:[],abilities:[],statBonuses:{},permanent:true};
export const TRAITS = {Weapon:WEAPONS,Magic:MAGIC,Head:HEADS,Armour:ARMOUR,Extra:EXTRAS,Skin:SKINS,Background:BACKGROUNDS};
// Category + model id is stable. Keep NFT identity for ownership resolution, not balance.
for(const [category,entries] of Object.entries(TRAITS))for(const [id,entry] of Object.entries(entries)){
  const identity=CHAMPION_TRAITS[category].find(t=>t.trait===entry.name);
  if(!identity)throw new Error(`Unknown ${category} identity: ${entry.name}`);
  Object.assign(entry,{id,category,assetId:identity.assetId??null});
  entry.effects=describeTrait(entry);
}

/** Human-readable effects derived from the same values used by the balance helpers. */
export function describeTrait(entry){
  return entry.abilities.map(a=>`${a.name}: ${a.description}`);
}

/** Pass normalized playground ids; skin can be its display name or id. */
export function buildArenaStats(loadout={}) {
  const stats={...ARENA_RULES.base},selected={};
  for(const [slot,entries,fallback] of [['head',HEADS,'bone'],['armour',ARMOUR,'leather_garb'],['extra',EXTRAS,'hoop_earring']]){
    const id=loadout[slot]===null?null:(loadout[slot]??fallback);if(id===null){selected[slot]=null;continue;}if(!entries[id])throw new Error(`Unknown ${slot}: ${id}`);selected[slot]=entries[id];
  }
  selected.weapon=loadout.weapon==null?UNARMED:WEAPONS[loadout.weapon];
  selected.magic=loadout.magic==null?null:MAGIC[loadout.magic];
  selected.skin=SKINS[slug(loadout.skin||'Undead')];
  selected.background=BACKGROUNDS[slug(loadout.background||'Dawn Background')];
  if(!selected.weapon||(loadout.magic!=null&&!selected.magic)||!selected.skin||!selected.background)throw new Error('Unknown weapon, magic, skin or background');
  for(const trait of Object.values(selected).filter(Boolean))for(const [key,value] of Object.entries(trait.statBonuses||{}))stats[key]+=value;
  for(const [key,[min,max]] of Object.entries(ARENA_RULES.caps))stats[key]=Math.min(max,Math.max(min,stats[key]));
  return {stats,selected,perks:Object.entries(selected).filter(([,trait])=>trait).flatMap(([slot,trait])=>trait.abilities.map(a=>({...a,slot,traitId:trait.id})))};
}

/** Cycle includes windup + all strikes + follow-through. Keep authored event phases. */
export function attackTiming(weaponId,authoredDurationSeconds,hastePct=0) {
  const w=weaponId==null?UNARMED:WEAPONS[weaponId];
  if(!w||!Number.isFinite(authoredDurationSeconds)||authoredDurationSeconds<=0||!Number.isFinite(hastePct))throw new Error('Invalid attack timing');
  const h=Math.max(0,Math.min(ARENA_RULES.caps.hastePct[1],hastePct));
  const durationSeconds=w.cycleSeconds/(1+h/100);
  return {durationSeconds,attacksPerSecond:1/durationSeconds,speedFactor:authoredDurationSeconds/durationSeconds};
}

export function abilityTiming(magicId,cooldownReductionPct=0,castSpeedPct=0) {
  const a=MAGIC[magicId];
  if(!a||!Number.isFinite(cooldownReductionPct)||!Number.isFinite(castSpeedPct))throw new Error('Invalid ability timing');
  const c=Math.max(0,Math.min(ARENA_RULES.caps.cooldownReductionPct[1],cooldownReductionPct));
  const speed=Math.max(0,Math.min(ARENA_RULES.caps.castSpeedPct[1],castSpeedPct));
  const castSeconds=Math.max(.55,a.castSeconds/(1+speed/100)),cooldownSeconds=a.cooldownSeconds*(1-c/100);
  return {castSeconds,cooldownSeconds,recastIntervalSeconds:castSeconds+cooldownSeconds,
    cooldownStarts:'When the cast finishes. If interrupted early, the full cooldown begins at interruption; the interrupted action still consumes remaining recovery.'};
}

export function diceStatistics(expression){
  const match=/^([1-9]\d*)d([1-9]\d*)(?:\+([0-9]+))?$/.exec(expression);
  if(!match)throw new Error('Invalid dice expression: '+expression);
  const [,n,s,m]=match,count=Number(n),sides=Number(s),modifier=Number(m||0);
  if(count>20||sides<2||sides>100||modifier>200)throw new Error('Dice expression exceeds supported limits');
  return {count,sides,modifier,min:count+modifier,max:count*sides+modifier,
    mean:count*(sides+1)/2+modifier,variance:count*(sides*sides-1)/12};
}
function randomUnit(rng){
  if(typeof rng!=='function')throw new Error('Supply an authoritative RNG');
  const value=rng();if(!Number.isFinite(value)||value<0||value>=1)throw new Error('RNG must return [0, 1)');
  return value;
}
export function rollDice(expression,rng){
  const {count,sides,modifier}=diceStatistics(expression),dice=[];
  for(let i=0;i<count;i++)dice.push(1+Math.floor(randomUnit(rng)*sides));
  return {expression,dice,modifier,total:dice.reduce((sum,n)=>sum+n,modifier)};
}
export function combinedPower(stats={},sourceKind='weapon'){
  if(!['weapon','ability'].includes(sourceKind))throw new Error('Unknown damage source kind');
  const specific=sourceKind==='weapon'?'weaponPowerPct':'abilityPowerPct';
  const universal=stats.powerPct??0,specialized=stats[specific]??0;
  if(!Number.isFinite(universal)||!Number.isFinite(specialized))throw new Error('Invalid power');
  return Math.min(ARENA_RULES.damage.combinedPowerCapPct,Math.max(0,universal)+Math.max(0,specialized));
}

export function criticalProfile(stats={}){
  const chance=stats.critChancePct??ARENA_RULES.base.critChancePct,multiplier=stats.critMultiplier??ARENA_RULES.base.critMultiplier;
  if(!Number.isFinite(chance)||!Number.isFinite(multiplier))throw new Error('Invalid critical stats');
  const [minChance,maxChance]=ARENA_RULES.caps.critChancePct,[minMultiplier,maxMultiplier]=ARENA_RULES.caps.critMultiplier;
  return {chance:Math.max(minChance,Math.min(maxChance,chance))/100,multiplier:Math.max(minMultiplier,Math.min(maxMultiplier,multiplier))};
}
function criticalBonusProtection(stats={}){
  const value=stats.critBonusReductionPct??0;if(!Number.isFinite(value))throw new Error('Invalid critical protection');
  return Math.max(0,Math.min(30,value))/100;
}

/** Pure status proc roll; caller owns action deduplication and status application. */
export function tryStatusProc(effect,{strikeIndex=0}={},rng){
  if(!Number.isInteger(strikeIndex)||strikeIndex<0||!Number.isFinite(effect.chance)||effect.chance<0||effect.chance>1)throw new Error('Invalid proc context');
  const applied=effect.chance===1?true:effect.chance===0?false:randomUnit(rng)<effect.chance;
  return {applied,reason:applied?'applied':'chance',potency:effect.potency??1};
}

/** Potency changes magnitude, not DOT/slow duration. Interrupts scale their brief duration. */
export function potentStatus(id,potency=1,stacked=false){
  const base=STATUS_EFFECTS[id];if(!base||!Number.isFinite(potency))throw new Error('Invalid status potency');
  const value=Math.max(.25,stacked?potency:Math.min(2,potency)),effect={...base,id,potency:value};
  for(const key of ['damagePerSecond','slowPct','allResistanceReduction','powerReductionPct','distanceM'])if(effect[key]!=null)effect[key]*=value;
  if(effect.kind==='interrupt')effect.durationSeconds*=value;
  if(effect.slowPct)effect.slowPct=Math.min(100,effect.slowPct);
  if(effect.powerReductionPct)effect.powerReductionPct=Math.min(100,effect.powerReductionPct);
  return effect;
}

/** Apply already-qualified gear/temporary bonuses. The authoritative event controller determines qualification and lifetime. */
export function applyStatBonuses(stats,bonuses){
  const next={...stats};
  for(const [key,n] of Object.entries(bonuses)){
    if(!STAT_DEFINITIONS[key]||!Number.isFinite(n))throw new Error('Invalid bonus '+key);
    const [min,max]=ARENA_RULES.caps[key];next[key]=Math.max(min,Math.min(max,(next[key]??ARENA_RULES.base[key])+n));
  }
  return next;
}

/** Matching defence only. The simulation applies guard, debuffs, barriers and collisions around this helper. */
export function mitigatedDamage(baseDamage,damageType,attackerStats={},defenderStats={},sourceKind='weapon') {
  if(!Number.isFinite(baseDamage)||baseDamage<0||!DAMAGE_PALETTE[damageType])throw new Error('Invalid damage');
  const power=combinedPower(attackerStats,sourceKind),key=damageType+'Resistance',rating=defenderStats[key]??ARENA_RULES.base[key];
  if(!Number.isFinite(rating))throw new Error('Invalid resistance');
  const defence=Math.min(ARENA_RULES.caps[key][1],Math.max(0,rating));
  return baseDamage*(1+power/100)*100/(100+defence);
}

/** Call once for a confirmed direct strike. Every strike and confirmed target gets its own roll. */
export function resolveDirectHit(expression,damageType,attackerStats,defenderStats,sourceKind,rng){
  const profile=criticalProfile(attackerStats),roll=rollDice(expression,rng),critical=randomUnit(rng)<profile.chance;
  const rawDamage=roll.total*(critical?profile.multiplier:1);
  const afterCritProtection=critical?roll.total*(1+(profile.multiplier-1)*(1-criticalBonusProtection(defenderStats))):roll.total;
  return {...roll,critical,rawDamage,afterCritProtection,damage:mitigatedDamage(afterCritProtection,damageType,attackerStats,defenderStats,sourceKind)};
}

export function expectedDirectDamage(expression,damageType,attackerStats={},defenderStats={},sourceKind='weapon'){
  const {chance,multiplier}=criticalProfile(attackerStats);
  return mitigatedDamage(diceStatistics(expression).mean*(1+chance*(multiplier-1)*(1-criticalBonusProtection(defenderStats))),damageType,attackerStats,defenderStats,sourceKind);
}
