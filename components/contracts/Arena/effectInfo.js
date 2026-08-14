const STAT_ICONS = {
  health: "/dragonshorde/health.svg",
  speed: "/dragonshorde/speed.png",
  resist: "/dragonshorde/resist.png",
  strength: "/dragonshorde/strength.svg",
  dexterity: "/dragonshorde/dexterity.svg",
  intelligence: "/dragonshorde/intelligence.svg",
  accuracy: "/dragonshorde/accuracy.svg",
  critChance: "/dragonshorde/critChance.svg",
  damage: "/dragonshorde/power.png",
};

export const ARENA_EFFECT_INFO = {
  poison: {
    label: "Poison",
    icon: "/dragonshorde/trees/Poison.svg",
    description: "Deals 0.3 ongoing damage per stack before the affected fighter acts.",
    details: [
      { icon: STAT_ICONS.health, text: "-0.3 HP before turn per stack" },
    ],
  },
  bleed: {
    label: "Bleed",
    icon: "/dragonshorde/trees/Bleed.svg",
    description: "Deals 0.2 ongoing damage and lowers strength by 0.1 per stack.",
    details: [
      { icon: STAT_ICONS.health, text: "-0.2 HP before turn per stack" },
      { icon: STAT_ICONS.strength, text: "-0.1 strength per stack" },
    ],
  },
  burn: {
    label: "Burn",
    icon: "/dragonshorde/trees/Burn.svg",
    description: "Deals 0.2 ongoing damage, adds speed and strength, and lowers intelligence per stack.",
    details: [
      { icon: STAT_ICONS.health, text: "-0.2 HP before turn per stack" },
      { icon: STAT_ICONS.strength, text: "+0.1 strength per stack" },
      { icon: STAT_ICONS.speed, text: "+0.2 speed per stack" },
      { icon: STAT_ICONS.intelligence, text: "-0.1 intelligence per stack" },
    ],
  },
  freeze: {
    label: "Freeze",
    icon: "/dragonshorde/trees/Freeze.svg",
    description: "Lowers dexterity and speed by 0.4 per stack.",
    details: [
      { icon: STAT_ICONS.dexterity, text: "-0.4 dexterity per stack" },
      { icon: STAT_ICONS.speed, text: "-0.4 speed per stack" },
    ],
  },
  slow: {
    label: "Slow",
    icon: "/dragonshorde/trees/Slow.svg",
    description: "Lowers dexterity by 0.2 and speed by 0.6 per stack.",
    details: [
      { icon: STAT_ICONS.dexterity, text: "-0.2 dexterity per stack" },
      { icon: STAT_ICONS.speed, text: "-0.6 speed per stack" },
    ],
  },
  drown: {
    label: "Drown",
    icon: "/dragonshorde/trees/Drown.svg",
    description: "Lowers dexterity by 0.6 and accuracy by 0.2 per stack.",
    details: [
      { icon: STAT_ICONS.dexterity, text: "-0.6 dexterity per stack" },
      { icon: STAT_ICONS.accuracy, text: "-0.2 accuracy per stack" },
    ],
  },
  paralyze: {
    label: "Paralyze",
    icon: "/dragonshorde/trees/Paralyze.svg",
    description: "Lowers accuracy by 0.2 and speed by 0.4 per stack.",
    details: [
      { icon: STAT_ICONS.accuracy, text: "-0.2 accuracy per stack" },
      { icon: STAT_ICONS.speed, text: "-0.4 speed per stack" },
    ],
  },
  doom: {
    label: "Doom",
    icon: "/dragonshorde/trees/Doom.svg",
    description: "Deals 0.1 ongoing damage, lowers resist by 0.4, and raises strength by 0.2 per stack.",
    details: [
      { icon: STAT_ICONS.health, text: "-0.1 HP before turn per stack" },
      { icon: STAT_ICONS.resist, text: "-0.4 resist per stack" },
      { icon: STAT_ICONS.strength, text: "+0.2 strength per stack" },
    ],
  },
  shield: {
    label: "Shield",
    icon: "/dragonshorde/trees/Shield.svg",
    description: "Blocks 0.5 damage per stack from melee and ranged attacks.",
    details: [
      { icon: STAT_ICONS.damage, text: "Blocks 0.5 melee or ranged damage per stack" },
    ],
  },
  strengthen: {
    label: "Strengthen",
    icon: "/dragonshorde/trees/Strengthen.svg",
    description: "Raises strength by 0.5 per stack.",
    details: [
      { icon: STAT_ICONS.strength, text: "+0.5 strength per stack" },
    ],
  },
  focus: {
    label: "Focus",
    icon: "/dragonshorde/trees/Focus.svg",
    description: "Raises accuracy by 0.5 and crit chance by 0.4% per stack.",
    details: [
      { icon: STAT_ICONS.accuracy, text: "+0.5 accuracy per stack" },
      { icon: STAT_ICONS.critChance, text: "+0.4% crit chance per stack" },
    ],
  },
  empower: {
    label: "Empower",
    icon: "/dragonshorde/trees/Empower.svg",
    description: "Raises strength by 0.2 and intelligence by 0.4 per stack.",
    details: [
      { icon: STAT_ICONS.strength, text: "+0.2 strength per stack" },
      { icon: STAT_ICONS.intelligence, text: "+0.4 intelligence per stack" },
    ],
  },
  nurture: {
    label: "Nurture",
    icon: "/dragonshorde/trees/Nurture.svg",
    description: "Heals 0.2 HP per stack before the affected fighter acts.",
    details: [
      { icon: STAT_ICONS.health, text: "+0.2 HP before turn per stack" },
    ],
  },
  bless: {
    label: "Bless",
    icon: "/dragonshorde/trees/Bless.svg",
    description: "Raises strength, intelligence, and resist while active.",
    details: [
      { icon: STAT_ICONS.strength, text: "+0.3 strength per stack" },
      { icon: STAT_ICONS.intelligence, text: "+0.3 intelligence per stack" },
      { icon: STAT_ICONS.resist, text: "+0.1 resist per stack" },
    ],
  },
  hasten: {
    label: "Hasten",
    icon: "/dragonshorde/trees/Hasten.svg",
    description: "Raises dexterity by 0.3 and speed by 0.4 per stack.",
    details: [
      { icon: STAT_ICONS.dexterity, text: "+0.3 dexterity per stack" },
      { icon: STAT_ICONS.speed, text: "+0.4 speed per stack" },
    ],
  },
  cleanse: {
    label: "Cleanse",
    icon: "/dragonshorde/trees/Cleanse.svg",
    description: "Removes negative stacks first; leftover cleanse blocks future negative stacks.",
    details: [
      { icon: "/dragonshorde/trees/Cleanse.svg", text: "Removes negative stacks first" },
      { icon: "/dragonshorde/trees/Cleanse.svg", text: "Leftover cleanse blocks future negative stacks" },
    ],
  },
};

export function getArenaEffectInfo(effectKey = "") {
  return ARENA_EFFECT_INFO[String(effectKey || "").toLowerCase()] || null;
}
