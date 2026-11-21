// Raw damage for the second committed weapon action. Power, resistance, dice,
// criticals and on-hit procs still go through the normal authoritative pipeline.
// Follow-ups keep their dice; independently authored motion sets their cycle.
export const WEAPON_FOLLOWUPS = {
 dragon_longsword:{damageType:'slashing',damageRolls:['5d6+12'],description:'A chambered descending diagonal cut; its enchantment can still burn.'},
 dragon_staff:{damageType:'fire',damageRolls:['4d8+13'],description:'A second fire bolt with a steadier damage range.'},
 dual_katana:{damageType:'slashing',damageRolls:['2d8+6','4d4+7'],description:'A right overhand cut followed by a left descending cut; each hit rolls separately.'},
 executioner_axe:{damageType:'slashing',damageRolls:['4d10+25'],description:'Raise the axe with both hands and drive a diagonal chop down across the front.'},
 scythe:{damageType:'blunt',damageRolls:['3d8+16'],reachM:1.1,hitRadiusM:.10,onHit:[{id:'knockback',trigger:'confirmedHit',strike:'each',chance:.45,potency:1}],description:'Return to guard, raise the shaft and shove with its middle. The blunt hit has a 45% chance to push.'},
 shield:{damageType:'blunt',damageRolls:['4d6+10'],description:'Re-chamber the shield, then strike across the front with its edge.'},
 sickle:{damageType:'slashing',damageRolls:['2d8+12'],description:'Raise the hooked blade and draw a descending cut across the front.'},
 spear:{damageType:'piercing',damageRolls:['3d8+16'],description:'Withdraw into a higher two-handed chamber and thrust forward again.'},
 trident:{damageType:'piercing',damageRolls:['5d4+17'],description:'The second thrust strikes with the physical points; it can still apply Soaked.'},
 dark_sword:{damageType:'slashing',damageRolls:['3d8+15'],description:'A descending diagonal cut dealing slashing damage; it can still apply Weaken.'},
 elf_bow:{damageType:'piercing',damageRolls:['3d10+12'],description:'Keep the bow raised, draw the string again, release and settle.'},
 wooden_club:{damageType:'blunt',damageRolls:['5d8+22'],description:'Chamber the club beside the shoulder and sweep it across the front with both hands.'},
 snake_wings:{damageType:'poison',damageRolls:['3d4+4','2d6+6'],description:'A venomous lead hook followed by a rear uppercut.'},
 sketonian_sword:{damageType:'slashing',damageRolls:['4d8+11'],description:'A chambered descending cut with a wider damage spread.'},
 fire_wings:{damageType:'fire',damageRolls:['2d8+3','3d4+5'],description:'A fiery lead hook and rear uppercut, with different dice for each fist.'},
 elder_wings:{damageType:'arcane',damageRolls:['2d6+5','2d8+5'],description:'An arcane hook followed by a heavier uppercut.'},
 chameleon_wings:{damageType:'poison',damageRolls:['3d4+4','3d6+3'],description:'A measured hook followed by a venomous uppercut.'},
 arctic_dual_katana:{damageType:'slashing',damageRolls:['3d4+6','2d8+5'],description:'Alternating right and left overhand cuts; each blade can still apply Chill.'},
 rusty_sword:{damageType:'slashing',damageRolls:['3d8+12'],description:'A descending diagonal cut with slightly less average damage.'},
 lightning_staff:{damageType:'lightning',damageRolls:['3d10+14'],description:'Raise the staff, gather and cast a second lightning bolt.'},
 hedge_knight_sword:{damageType:'slashing',damageRolls:['5d4+17'],description:'A controlled descending cut with a reliable damage floor.'},
 unarmed:{damageType:'blunt',damageRolls:['1d10+6','3d4+5'],description:'A lead hook and rear uppercut; each fist gets its own damage and critical roll.'},
};

export function followupAttack(weapon){
 const followup=WEAPON_FOLLOWUPS[weapon.id];
 if(!followup)throw new Error('Missing follow-up damage profile: '+weapon.id);
 const {description,...overrides}=followup;
 return {...weapon,...overrides};
}
