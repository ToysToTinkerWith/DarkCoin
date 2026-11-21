// Follow-ups are independently authored; first attacks and their strike windows are unchanged.
export const DOUBLE_CLICK_SECONDS=.34;
const sword={family:'sword',name:'Descending diagonal cut',chain:.69,durationScale:1.65,windows:[{side:null,start:.30,end:.63}]};
const dual={family:'dual',name:'Alternating overhand cuts',chain:.83,durationScale:2.05,windows:[{side:'R',start:.27,end:.47},{side:'L',start:.50,end:.72}]};
const staff={family:'staff',name:'High gathering cast',chain:.61,durationScale:1.2,windows:[{side:'L',release:.60}]};
const thrust={family:'thrust',name:'Re-chamber and high thrust',chain:.67,durationScale:1.45,windows:[{side:null,start:.40,end:.65}]};
const fist={family:'fist',name:'Lead hook and rear uppercut',chain:.57,durationScale:1.6,windows:[{side:'L',start:.27,end:.46},{side:'R',start:.53,end:.73}]};
export const WEAPON_COMBOS={
 dragon_longsword:sword,dark_sword:sword,sketonian_sword:sword,rusty_sword:sword,hedge_knight_sword:sword,
 dual_katana:dual,arctic_dual_katana:dual,dragon_staff:staff,lightning_staff:staff,spear:thrust,trident:thrust,
 scythe:{family:'shaft',name:'Raised handle shove',chain:.79,durationScale:1.35,windows:[{side:null,start:.46,end:.66}]},
 executioner_axe:{family:'axe',name:'Two-handed diagonal chop',chain:.76,durationScale:1.35,windows:[{side:null,start:.32,end:.64}]},
 wooden_club:{family:'club',name:'Shouldered cross-body sweep',chain:.76,durationScale:1.4,windows:[{side:null,start:.32,end:.65}]},
 shield:{family:'shield',name:'Shield-edge backhand',chain:.64,durationScale:1.1,windows:[{side:null,start:.30,end:.61}]},
 sickle:{...sword,family:'sickle',name:'Descending hooked cut',durationScale:1.75},
 elf_bow:{family:'bow',name:'Held-aim follow-up arrow',chain:.69,durationScale:1.25,windows:[{side:'L',release:.60}]},
 snake_wings:fist,fire_wings:fist,elder_wings:fist,chameleon_wings:fist,unarmed:fist,
};
export const weaponCombo=id=>WEAPON_COMBOS[id||'unarmed'];
