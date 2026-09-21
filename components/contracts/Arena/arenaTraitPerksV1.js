/** Distinct trait perks for the v1.3 combat rules. Triggered perks have no internal cooldown. */
export const passive = (id,name,description,bonuses) => ({id,name,description,trigger:'always',statBonuses:bonuses});
export const conditional = (id,name,description,condition,bonuses) => ({id,name,description,trigger:'conditional',condition,statBonuses:bonuses});
export const triggered = (id,name,description,trigger,actions,condition={},chance=1) =>
  ({id,name,description,trigger,actions,condition,chance,deduplicate:'oncePerConfirmedHit',target:'self'});
const buff=(stats,durationSeconds)=>({type:'buff',stats,durationSeconds,stacking:'refresh'});
const heal=amount=>({type:'heal',amount});
const stamina=amount=>({type:'restoreStamina',amount});
const barrier=(amount,durationSeconds)=>({type:'barrier',amount,durationSeconds});
const cleanse=ids=>({type:'cleanse',statusIds:ids,maxRemoved:1,order:'oldestFirst'});
const apply=(id,target='attacker')=>({type:'applyStatus',id,target,potency:1});

export const HEAD_PERKS = {
  crown_of_horns:[triggered('blood_price','Blood Price','After taking a direct hit below 40% health, gain +8% weapon power for 4s.','directDamageTaken',[buff({weaponPowerPct:8},4)],{selfHealthBelowPct:40})],
  all_knowing:[triggered('spell_insight','Spell Insight','An E ability hit refunds 1s of its cooldown. ','abilityHit',[{type:'refundAbilityCooldown',seconds:1}])],
  bone:[triggered('marrow_ward','Marrow Ward','After surviving a critical hit, gain a 10 HP barrier for 3s.','criticalDamageTaken',[barrier(10,3)])],
  dark_knight_helm:[triggered('dread_gaze','Dread Gaze','A weapon hit has a 30% chance to Weaken the target.','weaponHit',[apply('weaken','target')],{},.30)],
  dragon_knight_helm:[passive('heat_tempered','Heat Tempered','+16 fire resistance.',{fireResistance:16})],
  dragon:[passive('predator','Predator','+4 percentage points critical chance.',{critChancePct:4})],
  elder:[conditional('still_mind','Still Mind','While stationary for at least 0.75s, gain +6% magic power. Snapshot at cast/attack commitment.',{stationarySecondsAtLeast:.75},{abilityPowerPct:6})],
  gladiator_helm:[triggered('second_bout','Second Bout','A weapon hit restores 6 stamina.','weaponHit',[stamina(6)])],
  purity:[triggered('clean_break','Clean Break','Finishing an E cast removes your oldest cleanseable debuff.','abilityFinished',[cleanse('allCleanseable')])],
  scarred:[passive('old_scars','Old Scars','+18 maximum health.',{maxHealth:18})],
  snake:[triggered('venom_feast','Venom Feast','Hitting a poisoned target restores 3 HP.','directHit',[heal(3)],{targetHasStatus:'poison'})],
  undead:[{...triggered('refuse_death','Refuse Death','After surviving damage that crosses below 30% health, restore 10 HP.','directDamageTaken',[heal(10)],{crossedBelowHealthPct:30})}],
  uni_horn:[triggered('prismatic_ward','Prismatic Ward','Finishing an E cast grants an 8 HP barrier for 3s.','abilityFinished',[barrier(8,3)])],
  farmer:[triggered('harvest','Harvest','A weapon hit restores 3 HP.','weaponHit',[heal(3)])],
  samurai:[triggered('iaijutsu','Iaijutsu','Finishing a weapon draw grants +6 percentage points crit chance for 3s.','weaponDrawn',[buff({critChancePct:6},3)])],
  barbarian:[passive('savage_critical','Savage Critical','+0.25x critical damage multiplier.',{critMultiplier:.25})],
  gold_hermes_helm:[triggered('golden_stride','Golden Stride','Finishing an E cast grants +8% movement speed for 2s.','abilityFinished',[buff({moveSpeedPct:8},2)])],
  silver_hermes_helm:[triggered('silver_escape','Silver Escape','After surviving a critical hit, remove your oldest slow.','criticalDamageTaken',[cleanse(['chill','soaked'])])],
  pirate_bandana:[conditional('boarding_footwork','Boarding Footwork','Gain +3 percentage points crit chance when committing a weapon attack while moving.',{source:'weapon',movingAtCommit:true},{critChancePct:3})],
  skel_tonian_mask:[passive('split_focus','Split Focus','+2 percentage points crit chance.',{critChancePct:2}),passive('other_half','Other Half','+2% magic power.',{abilityPowerPct:2})],
  frost:[triggered('cold_rebuke','Cold Rebuke','After a melee/punch hit damages you, 30% chance to Chill its attacker.','directDamageTaken',[apply('chill')],{incomingAttackKinds:['melee','punch']},.30)],
  cyclops:[conditional('measured_blow','Measured Blow','Noncritical weapon strikes gain +6% weapon power. Evaluated after the critical roll.',{source:'weapon',critical:false},{weaponPowerPct:6})],
  slayer:[conditional('finish_the_hunt','Finish the Hunt','+8% weapon power against a target below 35% health, evaluated before the hit.',{source:'weapon',targetHealthBelowPct:35},{weaponPowerPct:8})],
  ram:[triggered('ram_charge','Ram Charge','A weapon hit has a 25% chance to Push the target.','weaponHit',[apply('knockback','target')],{},.25)],
  cannibal:[triggered('blood_feast','Blood Feast','Hitting a bleeding target restores 4 HP.','directHit',[heal(4)],{targetHasStatus:'bleed'})],
};

export const ARMOUR_PERKS = {
  dark_knight_armour:[triggered('sheathed_bulwark','Sheathed Bulwark','Finishing a weapon stow grants an 18 HP barrier for 5s.','weaponStowed',[barrier(18,5)])],
  dragon_hunter_armour:[conditional('hunt_the_flame','Hunt the Flame','+9% weapon power against a burning target.',{source:'weapon',targetHasStatus:'burn'},{weaponPowerPct:9})],
  dragon_knight_armour:[{...triggered('dragon_heart','Dragon Heart','After surviving damage that crosses below 50% health, gain a 20 HP barrier for 4s.','directDamageTaken',[barrier(20,4)],{crossedBelowHealthPct:50})}],
  gladiator_armour:[passive('pit_fighter','Pit Fighter','+28 maximum health.',{maxHealth:28})],
  hidden_one:[triggered('hidden_opening','Hidden Opening','Finishing an E cast grants +8 percentage points crit chance for 3s.','abilityFinished',[buff({critChancePct:8},3)])],
  magicians_robe:[passive('spell_rhythm','Spell Rhythm','+10% E ability cooldown reduction; cooldown still starts after casting ends.',{cooldownReductionPct:10})],
  pharaoh:[triggered('royal_renewal','Royal Renewal','An E ability hit restores 8 HP.','abilityHit',[heal(8)])],
  rags:[passive('unburdened','Unburdened','+5% movement speed.',{moveSpeedPct:5})],
  shinobi:[passive('rapid_forms','Rapid Forms','+7% attack haste.',{hastePct:7})],
  unchained:[triggered('break_chains','Break Chains','Finishing a weapon draw removes your oldest slow.','weaponDrawn',[cleanse(['chill','soaked'])]),passive('unbowed','Unbowed','+8% tenacity.',{tenacityPct:8})],
  emperor_armour:[passive('imperial_vigor','Imperial Vigor','+15 maximum health.',{maxHealth:15}),passive('royal_composure','Royal Composure','Reduce the BONUS portion of incoming critical damage by 25%; normal hit damage is unchanged.',{critBonusReductionPct:25})],
  elf_robe:[triggered('spell_to_arrow','Spell to Arrow','An E ability hit grants +8% attack haste for 4s.','abilityHit',[buff({hastePct:8},4)])],
  leather_garb:[passive('travel_ready','Travel Ready','+15 maximum stamina.',{maxStamina:15}),passive('padded','Padded','+10 maximum health.',{maxHealth:10})],
  executioner_robe:[passive('executioners_edge','Executioner’s Edge','+0.35x critical damage multiplier.',{critMultiplier:.35})],
  pirate_coat:[triggered('plunder_momentum','Plunder Momentum','A weapon critical grants +8% movement speed for 3s.','weaponCritical',[buff({moveSpeedPct:8},3)])],
  rogue:[passive('find_the_gap','Find the Gap','+6 percentage points critical chance.',{critChancePct:6})],
  arctic_shinobi:[triggered('slip_the_frost','Slip the Frost','After a slow is applied to you, remove your oldest slow.','debuffApplied',[cleanse(['chill','soaked'])],{appliedStatusIds:['chill','soaked']})],
  earth_faction:[passive('deep_reserves','Deep Reserves','+30 maximum stamina.',{maxStamina:30})],
  dragon_guard:[passive('tempered_plates','Tempered Plates','+12 blunt, slashing and piercing resistance.',{bluntResistance:12,slashingResistance:12,piercingResistance:12})],
};

export const EXTRA_PERKS = {
  crescent_moon_earring:[triggered('moon_echo','Moon Echo','An E ability critical refunds 1s of its cooldown.','abilityCritical',[{type:'refundAbilityCooldown',seconds:1}])],
  dragon_fangs_earring:[passive('fang_critical','Fang Critical','+0.15x critical damage multiplier.',{critMultiplier:.15})],
  fusion_pearl_earring:[passive('pearl_focus','Pearl Focus','+2 percentage points critical chance.',{critChancePct:2})],
  tentacle_earring:[triggered('tidal_grip','Tidal Grip','Hitting a Soaked target restores 4 stamina.','directHit',[stamina(4)],{targetHasStatus:'soaked'})],
  hoop_earring:[passive('sturdy_hoop','Sturdy Hoop','+10 maximum health.',{maxHealth:10})],
  golden_feathers:[passive('light_steps','Light Steps','Sprint consumes 10% less stamina.',{sprintCostReductionPct:10})],
  battle_wound:[conditional('last_laugh','Last Laugh','Below 40% health, gain +4 percentage points critical chance.',{selfHealthBelowPct:40},{critChancePct:4})],
  crescent_birthmark:[triggered('lunar_release','Lunar Release','After Weaken or Exposed is applied to you, remove the oldest of those two debuffs.','debuffApplied',[cleanse(['weaken','exposed'])],{appliedStatusIds:['weaken','exposed']})],
};

export const SKIN_PERKS = {
  dark_skin:[passive('human_endurance','Human Endurance','+8% stamina recovery; same effect on both human skin tones.',{staminaRegenPct:8})],
  light_skin:[passive('human_endurance','Human Endurance','+8% stamina recovery; same effect on both human skin tones.',{staminaRegenPct:8})],
  tribal_dark_skin:[passive('trail_hardened','Trail Hardened','+8% tenacity; same effect on both tribal skin tones.',{tenacityPct:8})],
  tribal_light_skin:[passive('trail_hardened','Trail Hardened','+8% tenacity; same effect on both tribal skin tones.',{tenacityPct:8})],
  fire_dragon:[passive('ember_scales','Ember Scales','+12 fire resistance.',{fireResistance:12})],
  undead:[passive('grave_reserve','Grave Reserve','+10 maximum health.',{maxHealth:10})],
  chameleon:[triggered('startled_dash','Startled Dash','After surviving direct damage, gain +4% movement speed for 2s.','directDamageTaken',[buff({moveSpeedPct:4},2)])],
  elder_dragon:[triggered('ancient_flow','Ancient Flow','An E ability hit restores 5 stamina.','abilityHit',[stamina(5)])],
  snake:[passive('venom_hide','Venom Hide','+12 poison resistance.',{poisonResistance:12})],
};

export const BACKGROUND_PERKS = {
  aqua_background:[passive('aqua_ward','Aqua Ward','+6 water resistance.',{waterResistance:6})],
  blood_background:[passive('blood_moon_edge','Blood Moon Edge','+0.08x critical damage multiplier.',{critMultiplier:.08})],
  cosmos_background:[passive('cosmic_study','Cosmic Study','+2% magic power.',{abilityPowerPct:2})],
  dungeon_background:[triggered('learn_the_miss','Learn the Miss','A completed weapon attack that hit nobody restores 3 stamina.','weaponMissed',[stamina(3)])],
  forest_background:[passive('forest_vigor','Forest Vigor','+5 maximum health.',{maxHealth:5})],
  golden_background:[triggered('golden_arrival','Golden Arrival','On arena entry, gain a 5 HP barrier lasting 6s.','roundStarted',[barrier(5,6)])],
  midnight_background:[passive('night_focus','Night Focus','+1 percentage point critical chance.',{critChancePct:1})],
  noir_background:[passive('composure','Composure','+4% tenacity.',{tenacityPct:4})],
  red_moon_background:[conditional('red_resolve','Red Resolve','Below 40% health, gain +3% weapon power.',{selfHealthBelowPct:40},{weaponPowerPct:3})],
  sunset_background:[passive('sunset_ward','Sunset Ward','+6 fire resistance.',{fireResistance:6})],
  toxic_background:[passive('toxic_ward','Toxic Ward','+6 poison resistance.',{poisonResistance:6})],
  valley_background:[passive('valley_pace','Valley Pace','+1% movement speed.',{moveSpeedPct:1})],
  golden_moon:[triggered('moonlit_spark','Moonlit Spark','An E ability critical restores 4 stamina.','abilityCritical',[stamina(4)])],
  waves_background:[passive('steady_breath','Steady Breath','+5% stamina recovery.',{staminaRegenPct:5})],
  dawn_background:[triggered('small_renewal','Small Renewal','Finishing an E cast restores 2 HP.','abilityFinished',[heal(2)])],
};

export const WEAPON_PROC_CHANCES = {
  dragon_longsword:[.45],dragon_staff:[.55],executioner_axe:[.25],scythe:[.60],shield:[1],
  sickle:[.35],trident:[.40],dark_sword:[.35],wooden_club:[.70,.20],snake_wings:[.50],
  sketonian_sword:[.40],fire_wings:[.60],elder_wings:[.30],arctic_dual_katana:[.35],lightning_staff:[.45],
};
export const WEAPON_EXTRA_PERKS = {
  dual_katana:[passive('paired_precision','Paired Precision','+3 percentage points critical chance.',{critChancePct:3})],
  spear:[conditional('measured_reach','Measured Reach','+4% weapon power when the target is at least 1.8m from your body at impact.',{source:'weapon',targetDistanceMAtLeast:1.8},{weaponPowerPct:4})],
  elf_bow:[conditional('patient_aim','Patient Aim','Committing an arrow after standing still for 0.75s grants +4 percentage points crit chance to that arrow.',{source:'weapon',stationarySecondsAtLeast:.75},{critChancePct:4})],
  rusty_sword:[passive('jagged_edge','Jagged Edge','+0.12x critical damage multiplier.',{critMultiplier:.12})],
  hedge_knight_sword:[passive('practiced_forms','Practiced Forms','+2% attack haste.',{hastePct:2})],
};
