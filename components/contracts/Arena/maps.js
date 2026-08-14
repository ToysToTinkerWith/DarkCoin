const STANDARD_TIE_BREAKERS = [
  "If tied, champion with more current health wins.",
  "If still tied, champion with the lowest champion NFT assetId wins.",
]

function exponentialStackEndGame(effect, displayName) {
  return {
    startsRound: "endGameRound",
    type: "exponentialStackRamp",
    name: `${displayName} Cascade`,
    description: `Starting at the end game round, both champions gain exponentially increasing ${effect} stacks after each round until the match ends.`,
    roundStackFormula: `2 ^ roundsSinceEndGameRound ${effect} stacks applied to each champion after the round resolves.`,
    winnerCriteria: [
      "The match continues while the exponential stacks are applied after each round.",
      `If both champions are defeated by the same ${effect} cascade, champion with more current health before the cascade wins.`,
      "If still tied, champion with the lowest champion NFT assetId wins.",
    ],
    resolution: {
      mode: "continueUntilDefeat",
      appliedEffect: effect,
      stackFormula: "2 ** (currentRound - startsRound)",
      appliesTo: "bothChampions",
      simultaneousDefeatTieBreakers: ["currentHealthBeforeCascade:highest", "assetId:lowest"],
    },
  }
}

function suddenEndGame({ name, description, primaryCriterion, primaryMetric, direction }) {
  return {
    startsRound: "endGameRound",
    type: "suddenArenaJudgment",
    name,
    description,
    winnerCriteria: [primaryCriterion, ...STANDARD_TIE_BREAKERS],
    resolution: {
      mode: "decideAtRoundStart",
      primaryMetric,
      direction,
      tieBreakers: ["currentHealth:highest", "assetId:lowest"],
    },
  }
}

export const ARENA_EFFECT_MAPS = {
  poison: {
    effect: "poison",
    name: "Mire of Sludge",
    terrain: "A toxic marsh of sludge.",
    passiveEffect: {
      boostedEffect: "poison",
      description: "Poison applied by attacks gains +1 flat stack.",
      modifier: { applicationStacksBonus: 1 },
    },
    endGameEffect: exponentialStackEndGame("poison", "Venom"),
  },
  bleed: {
    effect: "bleed",
    name: "Knife Chamber",
    terrain: "A dark dungeon of knives.",
    passiveEffect: {
      boostedEffect: "bleed",
      description: "Melee hits apply +2 flat bleed stacks.",
      modifier: { meleeApplicationStacksBonus: 2 },
    },
    endGameEffect: exponentialStackEndGame("bleed", "Blood"),
  },
  burn: {
    effect: "burn",
    name: "Ashen Crucible",
    terrain: "A furnace arena ringed by molten vents and falling cinders.",
    passiveEffect: {
      boostedEffect: "burn",
      description: "Burn damage ticks are 35% stronger.",
      modifier: { ongoingDamageMultiplier: 1.35 },
    },
    endGameEffect: exponentialStackEndGame("burn", "Inferno"),
  },
  freeze: {
    effect: "freeze",
    name: "Glacier Court",
    terrain: "A silent ice court where motion slows and every strike echoes.",
    passiveEffect: {
      boostedEffect: "freeze",
      description: "Freeze speed penalties are 50% stronger.",
      modifier: { speedPenaltyMultiplier: 1.5 },
    },
    endGameEffect: suddenEndGame({
      name: "Whiteout Collapse",
      description: "At the end game round, the ice shelf gives way and the champion moving slower stays on the last stable ground.",
      primaryCriterion: "Champion with lower speed at the end game round wins.",
      primaryMetric: "speed",
      direction: "lowest",
    }),
  },
  slow: {
    effect: "slow",
    name: "Hourglass Ruins",
    terrain: "Broken time-stones drag every step through thick golden dust.",
    passiveEffect: {
      boostedEffect: "slow",
      description: "Slow applications gain +2 flat stacks, and magic hits apply +2 flat slow stacks. ",
      modifier: { applicationStacksBonus: 2, magicApplicationStacksBonus: 2 },
    },
    endGameEffect: suddenEndGame({
      name: "Last Grain",
      description: "At the end game round, time stops for the fighter carrying the heavier temporal burden.",
      primaryCriterion: "Champion with fewer slow stacks at the end game round wins.",
      primaryMetric: "slowStacks",
      direction: "lowest",
    }),
  },
  drown: {
    effect: "drown",
    name: "Abyssal Causeway",
    terrain: "A half-submerged bridge where the tide rises each round.",
    passiveEffect: {
      boostedEffect: "drown",
      description: "Drown accuracy penalties are 30% stronger, and ranged attacks apply +1 flat drown stack.",
      modifier: { accuracyPenaltyMultiplier: 1.3, rangedApplicationStacksBonus: 1 },
    },
    endGameEffect: suddenEndGame({
      name: "Tide Claim",
      description: "At the end game round, the tide covers the causeway and only the steadier fighter keeps their footing.",
      primaryCriterion: "Champion with higher dexterity at the end game round wins.",
      primaryMetric: "dexterity",
      direction: "highest",
    }),
  },
  paralyze: {
    effect: "paralyze",
    name: "Stormcoil Spire",
    terrain: "A lightning-struck tower where charged stone hums underfoot.",
    passiveEffect: {
      boostedEffect: "paralyze",
      description: "Paralyze accuracy penalties are 40% stronger, and melee hits apply +2 flat paralyze stacks.",
      modifier: { accuracyPenaltyMultiplier: 1.4, meleeApplicationStacksBonus: 2 },
    },
    endGameEffect: suddenEndGame({
      name: "Lightning Rod",
      description: "At the end game round, the spire discharges into the fighter carrying more charge.",
      primaryCriterion: "Champion with fewer paralyze stacks at the end game round wins.",
      primaryMetric: "paralyzeStacks",
      direction: "lowest",
    }),
  },
  doom: {
    effect: "doom",
    name: "Eclipse Sepulcher",
    terrain: "A black shrine where every shadow whispers the final count.",
    passiveEffect: {
      boostedEffect: "doom",
      description: "Doom applications gain +1 flat stack, and doom resist penalties are 30% stronger.",
      modifier: { applicationStacksBonus: 1, resistPenaltyMultiplier: 1.3 },
    },
    endGameEffect: exponentialStackEndGame("doom", "Eclipse"),
  },
  shield: {
    effect: "shield",
    name: "Aegis Bastion",
    terrain: "A fortress platform where ancient wards harden around defenders.",
    passiveEffect: {
      boostedEffect: "shield",
      description: "Shield gains block 40% more damage.",
      modifier: { blockMultiplier: 1.4 },
    },
    endGameEffect: suddenEndGame({
      name: "Bastion Lock",
      description: "At the end game round, the fortress gates seal around the better-defended champion.",
      primaryCriterion: "Champion with more shield stacks at the end game round wins.",
      primaryMetric: "shieldStacks",
      direction: "highest",
    }),
  },
  strengthen: {
    effect: "strengthen",
    name: "Titan Ring",
    terrain: "A giant-carved arena that rewards raw force and heavy blows.",
    passiveEffect: {
      boostedEffect: "strengthen",
      description: "Strengthen potency is 40% stronger.",
      modifier: { strengthBonusMultiplier: 1.4 },
    },
    endGameEffect: suddenEndGame({
      name: "Titan's Measure",
      description: "At the end game round, the ring chooses the champion with the greater force behind their blows.",
      primaryCriterion: "Champion with higher strength at the end game round wins.",
      primaryMetric: "strength",
      direction: "highest",
    }),
  },
  focus: {
    effect: "focus",
    name: "Eagle-Eye Perch",
    terrain: "A cliffside arena where every opening becomes visible.",
    passiveEffect: {
      boostedEffect: "focus",
      description: "Missed attacks grant +1 flat focus stack.",
      modifier: { missedAttackStacksBonus: 1 },
    },
    endGameEffect: suddenEndGame({
      name: "True Shot",
      description: "At the end game round, the arena narrows to one decisive opening.",
      primaryCriterion: "Champion with highest dexterity at the end game round wins.",
      primaryMetric: "dexterity",
      direction: "highest",
    }),
  },
  empower: {
    effect: "empower",
    name: "Arcane Conduit",
    terrain: "A spell lattice that magnifies every surge of willpower.",
    passiveEffect: {
      boostedEffect: "empower",
      description: "Empower applications gain +2 flat stack.",
      modifier: { applicationStacksBonus: 2 },
    },
    endGameEffect: suddenEndGame({
      name: "Mana Overload",
      description: "At the end game round, the conduit overloads and crowns the stronger caster.",
      primaryCriterion: "Champion with higher intelligence at the end game round wins.",
      primaryMetric: "intelligence",
      direction: "highest",
    }),
  },
  nurture: {
    effect: "nurture",
    name: "Verdant Hollow",
    terrain: "A living grove where roots stitch wounds as quickly as blades open them.",
    passiveEffect: {
      boostedEffect: "nurture",
      description: "Nurture healing is 20% stronger.",
      modifier: { healingMultiplier: 1.2 },
    },
    endGameEffect: suddenEndGame({
      name: "Overgrowth",
      description: "At the end game round, the grove binds itself to the slowest champion.",
      primaryCriterion: "Champion with the most speed at the end game round wins.",
      primaryMetric: "speed",
      direction: "highest",
    }),
  },
  bless: {
    effect: "bless",
    name: "Sun-Blessed Dais",
    terrain: "A radiant platform where divine favor gathers around the worthy.",
    passiveEffect: {
      boostedEffect: "bless",
      description: "First bless gained each battle grants +20 flat stacks.",
      modifier: { firstGainPerBattleStacksBonus: 20 },
    },
    endGameEffect: suddenEndGame({
      name: "Radiant Decree",
      description: "At the end game round, the dais judges which champion carries the stronger blessing.",
      primaryCriterion: "Champion with more bless stacks at the end game round wins.",
      primaryMetric: "blessStacks",
      direction: "highest",
    }),
  },
  hasten: {
    effect: "hasten",
    name: "Quickglass Track",
    terrain: "A mirrored sprintway where time bends toward the fastest champion.",
    passiveEffect: {
      boostedEffect: "hasten",
      description: "Hasten speed bonuses are 40% stronger.",
      modifier: { speedBonusMultiplier: 1.4 },
    },
    endGameEffect: suddenEndGame({
      name: "Final Dash",
      description: "At the end game round, the track collapses behind the slower champion.",
      primaryCriterion: "Champion with higher speed at the end game round wins.",
      primaryMetric: "speed",
      direction: "highest",
    }),
  },
  cleanse: {
    effect: "cleanse",
    name: "Purity Well",
    terrain: "A moonlit spring that rejects corruption and rewards clarity.",
    passiveEffect: {
      boostedEffect: "cleanse",
      description: "Cleanse removes +1 additional negative stack.",
      modifier: { extraNegativeStacksRemoved: 1 },
    },
    endGameEffect: suddenEndGame({
      name: "Pure Reflection",
      description: "At the end game round, the well reflects the most resistant champion.",
      primaryCriterion: "Champion with the highest resist at the end game round wins.",
      primaryMetric: "resist",
      direction: "highest",
    }),
  },
}

export const ARENA_EFFECT_MAP_LIST = Object.values(ARENA_EFFECT_MAPS)

export function getArenaEffectMap(effect) {
  return ARENA_EFFECT_MAPS[String(effect || "").toLowerCase()] || null
}

export function getRandomArenaEffectMap(random = Math.random) {
  const maps = ARENA_EFFECT_MAP_LIST
  return maps[Math.floor(random() * maps.length)]
}

export default ARENA_EFFECT_MAPS
