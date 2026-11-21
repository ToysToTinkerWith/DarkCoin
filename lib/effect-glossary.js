import {ARENA_EFFECT_INFO} from '../components/contracts/Arena/effectInfo';

// Playtest explanations; classic games select their own glossary below.
export const EFFECT_GLOSSARY={
 freeze:'In the turn-based games, lowers dexterity and speed. See the effect card for the per-stack amounts.',
 drown:'In the turn-based games, lowers dexterity and accuracy. See the effect card for per-stack amounts.',
 paralyze:'In the turn-based games, reduces accuracy and speed. It does not automatically mean the target loses an entire turn.',
 doom:'In the turn-based games, drains health and reduces resistance, while also increasing strength. Each stack changes these values.',
 strengthen:'A turn-based effect that increases strength. The effect card shows how much each stack adds.',
 focus:'A turn-based effect that increases accuracy and critical chance. Its bonuses scale with stacks.',
 empower:'A turn-based effect that increases intelligence and strength. Its bonuses scale with stacks.',
 hasten:'A turn-based effect that increases speed and dexterity. This differs from weapon attack haste in the 3D arena.',

 stagger:'Interrupts the current action and briefly prevents another action. Repeated successful applications can interrupt again.',
 bleed:'A harmful effect that deals slashing damage over time. In the 3D arena, reapplying it adds potency and refreshes its duration; these periodic ticks cannot critically hit.',
 burn:'A harmful effect that deals fire damage over time. Reapplication adds potency and refreshes its duration in the 3D arena.',
 poison:'Poison is a damage type and a damage-over-time status. A poison status keeps dealing damage until it expires or is cleansed; its strength depends on potency.',
 chill:'Slows movement. More accumulated potency makes the slowdown stronger; tenacity reduces its duration.',
 soaked:'Slows movement with a water-based status. Reapplication adds potency and refreshes the remaining duration.',
 exposed:'Lowers damage resistances, making incoming damage more effective. The reduction scales with potency.',
 weaken:'Reduces outgoing damage. Additional potency strengthens the reduction while the effect lasts.',
 knockback:'Pushes the target away, limited by the arena walls and collision geometry. Push alone does not interrupt an action.',
 push:'Moves the target away from the attacker. Its distance scales with potency; it does not interrupt unless Stagger is also applied.',
 mana:'Energy shared by spells and staff attacks. It regenerates slowly after a casting break; physical attacks do not consume mana.',
 enrage:'A temporary combat buff. Graveclaw’s Grave Fury increases movement speed, maximum stamina and stamina recovery; its orange aura lasts 10 seconds.',
 potency:'The whole-number strength of an effect. In the 3D arena, successful reapplications add their potency together and refresh the effect’s duration.',
 stacks:'The number of active applications of an effect. Each application contributes its own potency; the whole stack expires together after its duration is refreshed.',
 tenacity:'Shortens incoming slow, Exposed, Weaken and Stagger durations. It does not shorten damage-over-time effects.',
 haste:'Speeds up weapon attack cycles. It does not speed up movement or spell casting.',
 'critical hit':'A hit that passes its own critical-chance roll and uses the critical damage multiplier. Each strike rolls independently; damage-over-time ticks cannot crit in the 3D arena.',
 'critical chance':'The probability that a direct hit becomes a critical hit. Every confirmed strike rolls separately.',
 'critical damage':'The damage multiplier used when a direct hit critically strikes, before the target’s defenses.',
 'crit chance':'The probability of a critical hit, rolled independently for each direct strike.',
 'crit damage':'The multiplier applied to the damage of a critical hit.',
 lifesteal:'Heals the attacker from eligible direct damage dealt, up to their missing health. Periodic damage does not trigger it in the 3D arena.',
 barrier:'Temporary protection that absorbs damage before health is lost. It expires if its duration ends before it is used.',
 cleanse:'Removes eligible harmful status effects. Instant displacement and interrupts are not undone.',
 'damage over time':'Damage applied gradually while an effect lasts, rather than a single impact. In the 3D arena these ticks cannot crit or trigger additional on-hit effects.',
 'on hit':'Triggers when an attack actually connects. Chance-based effects roll separately on each eligible hit.',
 'cast time':'The time spent performing a spell before its cast completes. It is separate from the cooldown between casts.',
 cooldown:'The recovery period before a spell can be cast again. Weapon attacks use an attack cycle instead of a separate cooldown.',
 resistance:'Reduces damage of the matching type. Physical damage has separate blunt, slashing and piercing resistances; magic types have their own.',
 blunt:'Physical impact damage, such as a fist, club or shield strike. Reduced by blunt resistance.',
 slashing:'Physical cutting damage from a blade. Reduced by slashing resistance.',
 piercing:'Physical penetrating damage, such as an arrow or spear point. Reduced by piercing resistance.',
 slow:'Reduces movement speed for the listed duration. In the 3D arena the strongest slow type applies; accumulated potency increases its strength.',
};
// Keep classic descriptions tied to the same source as the original effect cards.
// Never fall back to Playtest terms inside a classic game.
export const CLASSIC_EFFECT_GLOSSARY={
 ...Object.fromEntries(Object.entries(ARENA_EFFECT_INFO).map(([key,info])=>[key,
  `${info.description} ${info.details.map(detail=>detail.text).join('; ')}.`])),
 potency:'The amount of an effect a move applies. Increasing Doom potency adds more Doom stacks when that effect is successfully applied. Character potency, card upgrades and item bonuses can change this amount; the move preview shows the resulting amount.',
 stacks:'The accumulated amount of an active effect on a fighter. Reapplying an effect adds to that amount. Each effect’s per-stack health and stat changes scale with the total; Cleanse can remove negative stacks.',
 resistance:'The chance to resist an incoming negative effect. In Depths, current resist is used as a percentage chance, limited to 0–100%. Bless raises resist and Doom lowers it.',
 cooldown:'The delay before a move can be used again. In Depths, effective cooldown is the move’s base cooldown multiplied by 50 divided by current speed (with a minimum speed of 1). Higher speed makes moves ready sooner.',
 'damage over time':'Ongoing health loss from effects such as Poison, Bleed, Burn and Doom, applied before the affected fighter acts. The amount depends on the current stacks of each effect.',
 'critical hit':'A successful critical roll increases the move’s damage using the fighter’s critical damage percentage. The move preview shows any card-specific bonuses.',
 'critical chance':'The percentage chance for a critical roll to succeed. Focus adds 0.4 percentage points per stack; move bonuses can also change the chance.',
 'critical damage':'The percentage of normal damage dealt on a critical hit. For example, 200% means twice the normal damage.',
 'on hit':'An effect triggered when a move hits its target. Negative effects may still be resisted or blocked by Cleanse.',
};
CLASSIC_EFFECT_GLOSSARY['crit chance']=CLASSIC_EFFECT_GLOSSARY['critical chance'];
CLASSIC_EFFECT_GLOSSARY['crit damage']=CLASSIC_EFFECT_GLOSSARY['critical damage'];

export function effectRulesetForPath(path=''){
 return /^\/arena\/(depths|fight|sims|effects|effectsOld|dragonshorde|cards|monsters)(?:\/|[?#]|$)/i.test(path)?'classic':'playtest';
}
export function effectGlossary(ruleset='playtest'){return ruleset==='classic'?CLASSIC_EFFECT_GLOSSARY:EFFECT_GLOSSARY;}
export function effectPattern(ruleset='playtest'){
 const escaped=Object.keys(effectGlossary(ruleset)).sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 return new RegExp('\\b('+escaped.join('|')+')\\b','gi');
}
export function effectMatches(text,ruleset='playtest'){return [...String(text).matchAll(effectPattern(ruleset))].map(m=>({word:m[0],key:m[0].toLowerCase(),start:m.index,end:m.index+m[0].length}));}
