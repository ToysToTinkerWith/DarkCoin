import {
  buildDepthsTraitAwakeningProfile,
  getTraitAwakeningLabel,
  pickWeightedDepthsRewards,
} from "./depthsTraitAwakenings";

const ARTIFACT_IMAGE_BASE = "/arena/depths/artifacts";
const DEPTHS_BUILD_EFFECT_KEYS = [
  "poison",
  "bleed",
  "burn",
  "freeze",
  "slow",
  "drown",
  "paralyze",
  "doom",
  "shield",
  "strengthen",
  "focus",
  "empower",
  "nurture",
  "bless",
  "hasten",
  "cleanse",
];

const finiteNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function shuffleRows(rows = []) {
  return [...rows].sort(() => Math.random() - 0.5);
}

function mergeNumberMaps(base = {}, incoming = {}) {
  const next = { ...(base || {}) };
  Object.entries(incoming || {}).forEach(([key, value]) => {
    next[key] = finiteNumber(next[key], 0) + finiteNumber(value, 0);
  });
  return next;
}

function mergeDepthsAbilityMeta(base = {}, incoming = {}) {
  const next = {
    lifeStealPct: finiteNumber(base.lifeStealPct, 0) + finiteNumber(incoming.lifeStealPct, 0),
    lowHpDamage: base.lowHpDamage || null,
    secondWind: base.secondWind || null,
  };

  if (incoming.lowHpDamage) {
    next.lowHpDamage = {
      thresholdPct: Math.max(
        finiteNumber(next.lowHpDamage?.thresholdPct, 0),
        finiteNumber(incoming.lowHpDamage.thresholdPct, 0)
      ),
      flatDamage:
        finiteNumber(next.lowHpDamage?.flatDamage, 0) +
        finiteNumber(incoming.lowHpDamage.flatDamage, 0),
    };
  }

  if (incoming.secondWind) {
    next.secondWind = {
      thresholdPct: Math.max(
        finiteNumber(next.secondWind?.thresholdPct, 0),
        finiteNumber(incoming.secondWind.thresholdPct, 0)
      ),
      healPct:
        finiteNumber(next.secondWind?.healPct, 0) +
        finiteNumber(incoming.secondWind.healPct, 0),
      shield:
        finiteNumber(next.secondWind?.shield, 0) +
        finiteNumber(incoming.secondWind.shield, 0),
    };
  }

  return next;
}

function mergeArtifactMeta(base = {}, incoming = {}) {
  return {
    damageDealtPct:
      finiteNumber(base.damageDealtPct, 0) + finiteNumber(incoming.damageDealtPct, 0),
    damageTakenPct:
      finiteNumber(base.damageTakenPct, 0) + finiteNumber(incoming.damageTakenPct, 0),
    healingDonePct:
      finiteNumber(base.healingDonePct, 0) + finiteNumber(incoming.healingDonePct, 0),
    damageBonusFlat:
      finiteNumber(base.damageBonusFlat, 0) + finiteNumber(incoming.damageBonusFlat, 0),
    healOnKillPct:
      finiteNumber(base.healOnKillPct, 0) + finiteNumber(incoming.healOnKillPct, 0),
    firstBuffNoCooldown: Boolean(base.firstBuffNoCooldown || incoming.firstBuffNoCooldown),
    firstDamageNoCooldown: Boolean(base.firstDamageNoCooldown || incoming.firstDamageNoCooldown),
    effectPotencyBonus: mergeNumberMaps(base.effectPotencyBonus || {}, incoming.effectPotencyBonus || {}),
  };
}

function hasNumbers(map = {}) {
  return Object.values(map || {}).some((value) => finiteNumber(value, 0) !== 0);
}

function getChampionSourceCharObj(source = {}) {
  if (Array.isArray(source)) return {};
  return source?.charObj || source || {};
}

function getChampionBuildEffectKeys(source = {}) {
  const charObj = getChampionSourceCharObj(source);
  return DEPTHS_BUILD_EFFECT_KEYS.filter((effectKey) => {
    const value =
      charObj?.effectPotencies?.[effectKey] ??
      charObj?.itemEffectPotencies?.[effectKey] ??
      charObj?.[effectKey];
    return finiteNumber(value, 0) > 0;
  });
}

function getArtifactBuildEffectKeys(options = {}, traitSource = {}) {
  if (Array.isArray(options.buildEffectKeys)) {
    return options.buildEffectKeys.map((key) => String(key || "").toLowerCase()).filter(Boolean);
  }
  return getChampionBuildEffectKeys(options.champion || traitSource);
}

function getArtifactMechanicEffectKeys(artifact = {}) {
  const keys = new Set();
  const addKey = (value) => {
    const key = String(value || "").toLowerCase().trim();
    if (key && key !== "none") keys.add(key);
  };

  addKey(artifact.effect);
  addKey(artifact.effectKey);
  (artifact.battleOnly || []).forEach((entry) => {
    addKey(entry?.effectKey);
    addKey(entry?.resistedEffect);
  });
  Object.entries(artifact.artifactMeta?.effectPotencyBonus || {}).forEach(([key, value]) => {
    if (finiteNumber(value, 0)) addKey(key);
  });

  return keys;
}

function artifactMatchesChampionBuild(artifact = {}, traitSource = {}, options = {}) {
  const buildEffectKeys = getArtifactBuildEffectKeys(options, traitSource);
  const artifactEffectKeys = getArtifactMechanicEffectKeys(artifact);
  if (!artifactEffectKeys.size) return true;
  if (!buildEffectKeys.length) return false;
  if (artifactEffectKeys.has("all")) return true;
  return buildEffectKeys.some((effectKey) => artifactEffectKeys.has(effectKey));
}

function hasArtifactMeta(meta = {}) {
  return (
    finiteNumber(meta.damageDealtPct, 0) ||
    finiteNumber(meta.damageTakenPct, 0) ||
    finiteNumber(meta.healingDonePct, 0) ||
    finiteNumber(meta.damageBonusFlat, 0) ||
    finiteNumber(meta.healOnKillPct, 0) ||
    Boolean(meta.firstBuffNoCooldown) ||
    Boolean(meta.firstDamageNoCooldown) ||
    hasNumbers(meta.effectPotencyBonus || {})
  );
}

function hasDepthsAbilityMeta(meta = {}) {
  return (
    finiteNumber(meta.lifeStealPct, 0) ||
    Boolean(meta.lowHpDamage) ||
    Boolean(meta.secondWind)
  );
}

function roundScaledNumber(value, scale, minAbs = 1) {
  const n = finiteNumber(value, 0);
  if (!n) return 0;
  const scaled = Math.round(n * scale);
  if (scaled === 0) return n > 0 ? minAbs : -minAbs;
  return scaled;
}

function scaleNumberMap(map = {}, scale, minAbs = 1) {
  return Object.entries(map || {}).reduce((acc, [key, value]) => {
    const scaled = roundScaledNumber(value, scale, minAbs);
    if (scaled) acc[key] = scaled;
    return acc;
  }, {});
}

function mergeBattleOnly(base = [], incoming = []) {
  return [...(base || []), ...(incoming || [])];
}

function getArtifactAbilityGroupCount(artifact = {}) {
  return getArtifactAbilityUnits(artifact).length;
}

function scoreArtifactPower(artifact = {}) {
  let score = 0;

  Object.entries(artifact.statBonuses || {}).forEach(([key, value]) => {
    const n = Math.abs(finiteNumber(value, 0));
    if (key === "health" || key === "critDamage") score += n / 18;
    else if (key === "critChance") score += n / 6;
    else score += n / 8;
  });

  Object.values(artifact.moveAccuracy || {}).forEach((value) => {
    score += Math.abs(finiteNumber(value, 0)) / 10;
  });

  (artifact.battleOnly || []).forEach((entry) => {
    const amount = Math.abs(finiteNumber(entry.amount, 0));
    if (entry.type === "resistance") score += amount / 18;
    else if (entry.type === "apply_on_crit") score += amount / 2.5;
    else score += amount / 5;
  });

  const meta = artifact.artifactMeta || {};
  score += Math.abs(finiteNumber(meta.damageDealtPct, 0)) / 18;
  score += Math.abs(finiteNumber(meta.damageTakenPct, 0)) / 16;
  score += Math.abs(finiteNumber(meta.healingDonePct, 0)) / 16;
  score += Math.abs(finiteNumber(meta.damageBonusFlat, 0)) / 5;
  score += Math.abs(finiteNumber(meta.healOnKillPct, 0)) / 8;
  if (meta.firstBuffNoCooldown) score += 1.8;
  if (meta.firstDamageNoCooldown) score += 1.9;
  Object.values(meta.effectPotencyBonus || {}).forEach((value) => {
    score += Math.abs(finiteNumber(value, 0)) * 0.9;
  });

  const depthsMeta = artifact.depthsAbilityMeta || {};
  score += Math.abs(finiteNumber(depthsMeta.lifeStealPct, 0)) / 4;
  if (depthsMeta.lowHpDamage) {
    score +=
      Math.abs(finiteNumber(depthsMeta.lowHpDamage.flatDamage, 0)) / 8 +
      Math.abs(finiteNumber(depthsMeta.lowHpDamage.thresholdPct, 0)) / 50;
  }
  if (depthsMeta.secondWind) {
    score +=
      Math.abs(finiteNumber(depthsMeta.secondWind.healPct, 0)) / 16 +
      Math.abs(finiteNumber(depthsMeta.secondWind.shield, 0)) / 8;
  }

  return score;
}

function inferArtifactRarity(artifact = {}) {
  const abilityGroups = getArtifactAbilityUnits(artifact).length;
  const powerScore = scoreArtifactPower(artifact);

  if (powerScore < 2.35) return "common";
  if (abilityGroups >= 2 && powerScore >= 3.4) return "rare";
  if (abilityGroups >= 2 || powerScore >= 1.45) return "uncommon";
  return "common";
}

function getExplicitArtifactRarity(artifact = {}) {
  const key = String(artifact.rewardRarity || artifact.rarityTier || "").toLowerCase();
  return ARTIFACT_RARITY_RULES[key] ? key : "";
}

function getUnitScore(unit = {}) {
  return finiteNumber(unit.score, 0);
}

function applyUnit(target, unit, scale) {
  unit.apply?.(target, scale);
  return target;
}

function createStatUnit(key, value) {
  return {
    id: `stat:${key}`,
    score: scoreArtifactPower({ statBonuses: { [key]: value } }),
    apply: (target, scale) => {
      target.statBonuses = {
        ...(target.statBonuses || {}),
        [key]: roundScaledNumber(value, scale),
      };
    },
  };
}

function createMoveAccuracyUnit(key, value) {
  return {
    id: `accuracy:${key}`,
    score: scoreArtifactPower({ moveAccuracy: { [key]: value } }),
    apply: (target, scale) => {
      target.moveAccuracy = {
        ...(target.moveAccuracy || {}),
        [key]: roundScaledNumber(value, scale),
      };
    },
  };
}

function createBattleOnlyUnit(entry = {}, index = 0) {
  return {
    id: `battle:${entry.type || "effect"}:${entry.effectKey || entry.resistedEffect || index}`,
    score: scoreArtifactPower({ battleOnly: [entry] }),
    apply: (target, scale) => {
      const scaledEntry = {
        ...entry,
        amount: roundScaledNumber(
          entry.amount,
          scale,
          entry.type === "resistance" ? 5 : 1
        ),
      };
      target.battleOnly = mergeBattleOnly(target.battleOnly, [scaledEntry]);
    },
  };
}

function createArtifactMetaUnit(id, meta) {
  return {
    id: `artifactMeta:${id}`,
    score: scoreArtifactPower({ artifactMeta: meta }),
    apply: (target, scale) => {
      const scaledMeta = {};
      if (meta.damageDealtPct) {
        scaledMeta.damageDealtPct = roundScaledNumber(meta.damageDealtPct, scale, 1);
      }
      if (meta.damageTakenPct) {
        scaledMeta.damageTakenPct = roundScaledNumber(meta.damageTakenPct, scale, 1);
      }
      if (meta.healingDonePct) {
        scaledMeta.healingDonePct = roundScaledNumber(meta.healingDonePct, scale, 1);
      }
      if (meta.damageBonusFlat) {
        scaledMeta.damageBonusFlat = roundScaledNumber(meta.damageBonusFlat, scale, 1);
      }
      if (meta.healOnKillPct) {
        scaledMeta.healOnKillPct = roundScaledNumber(meta.healOnKillPct, scale, 1);
      }
      if (meta.firstBuffNoCooldown) scaledMeta.firstBuffNoCooldown = true;
      if (meta.firstDamageNoCooldown) scaledMeta.firstDamageNoCooldown = true;
      if (hasNumbers(meta.effectPotencyBonus || {})) {
        scaledMeta.effectPotencyBonus = scaleNumberMap(meta.effectPotencyBonus, scale, 1);
      }
      target.artifactMeta = mergeArtifactMeta(target.artifactMeta || {}, scaledMeta);
    },
  };
}

function createDepthsMetaUnit(id, meta) {
  return {
    id: `depthsMeta:${id}`,
    score: scoreArtifactPower({ depthsAbilityMeta: meta }),
    apply: (target, scale) => {
      const scaledMeta = {};
      if (meta.lifeStealPct) {
        scaledMeta.lifeStealPct = roundScaledNumber(meta.lifeStealPct, scale, 1);
      }
      if (meta.lowHpDamage) {
        scaledMeta.lowHpDamage = {
          thresholdPct: finiteNumber(meta.lowHpDamage.thresholdPct, 35),
          flatDamage: roundScaledNumber(meta.lowHpDamage.flatDamage, scale, 1),
        };
      }
      if (meta.secondWind) {
        scaledMeta.secondWind = {
          thresholdPct: finiteNumber(meta.secondWind.thresholdPct, 35),
          healPct: roundScaledNumber(meta.secondWind.healPct, scale, 1),
          shield: roundScaledNumber(meta.secondWind.shield, scale, 1),
        };
      }
      target.depthsAbilityMeta = mergeDepthsAbilityMeta(
        target.depthsAbilityMeta || {},
        scaledMeta
      );
    },
  };
}

function getArtifactAbilityUnits(artifact = {}) {
  const units = [];

  Object.entries(artifact.statBonuses || {}).forEach(([key, value]) => {
    if (finiteNumber(value, 0)) units.push(createStatUnit(key, value));
  });

  Object.entries(artifact.moveAccuracy || {}).forEach(([key, value]) => {
    if (finiteNumber(value, 0)) units.push(createMoveAccuracyUnit(key, value));
  });

  (artifact.battleOnly || []).forEach((entry, index) => {
    if (entry?.type) units.push(createBattleOnlyUnit(entry, index));
  });

  const meta = artifact.artifactMeta || {};
  if (meta.damageDealtPct && meta.damageTakenPct) {
    units.push(createArtifactMetaUnit("damageTrade", {
      damageDealtPct: meta.damageDealtPct,
      damageTakenPct: meta.damageTakenPct,
    }));
  } else {
    if (meta.damageDealtPct) {
      units.push(createArtifactMetaUnit("damageDealtPct", { damageDealtPct: meta.damageDealtPct }));
    }
    if (meta.damageTakenPct) {
      units.push(createArtifactMetaUnit("damageTakenPct", { damageTakenPct: meta.damageTakenPct }));
    }
  }
  if (meta.healingDonePct) {
    units.push(createArtifactMetaUnit("healingDonePct", { healingDonePct: meta.healingDonePct }));
  }
  if (meta.damageBonusFlat) {
    units.push(createArtifactMetaUnit("damageBonusFlat", { damageBonusFlat: meta.damageBonusFlat }));
  }
  if (meta.healOnKillPct) {
    units.push(createArtifactMetaUnit("healOnKillPct", { healOnKillPct: meta.healOnKillPct }));
  }
  if (meta.firstBuffNoCooldown) {
    units.push(createArtifactMetaUnit("firstBuffNoCooldown", { firstBuffNoCooldown: true }));
  }
  if (meta.firstDamageNoCooldown) {
    units.push(createArtifactMetaUnit("firstDamageNoCooldown", { firstDamageNoCooldown: true }));
  }
  Object.entries(meta.effectPotencyBonus || {}).forEach(([key, value]) => {
    if (finiteNumber(value, 0)) {
      units.push(createArtifactMetaUnit(`effectPotencyBonus:${key}`, {
        effectPotencyBonus: { [key]: value },
      }));
    }
  });

  const depthsMeta = artifact.depthsAbilityMeta || {};
  if (depthsMeta.lifeStealPct) {
    units.push(createDepthsMetaUnit("lifeStealPct", { lifeStealPct: depthsMeta.lifeStealPct }));
  }
  if (depthsMeta.lowHpDamage) {
    units.push(createDepthsMetaUnit("lowHpDamage", { lowHpDamage: depthsMeta.lowHpDamage }));
  }
  if (depthsMeta.secondWind) {
    units.push(createDepthsMetaUnit("secondWind", { secondWind: depthsMeta.secondWind }));
  }

  return units.sort((a, b) => getUnitScore(b) - getUnitScore(a));
}

const ARTIFACT_RARITY_RULES = {
  common: { maxAbilities: 1, scale: 0.65 },
  uncommon: { maxAbilities: 2, scale: 0.82 },
  rare: { maxAbilities: 2, scale: 1 },
};

function getBalancedArtifactMechanics(artifact = {}, rarity = "common") {
  const rules = ARTIFACT_RARITY_RULES[rarity] || ARTIFACT_RARITY_RULES.common;
  const units = getArtifactAbilityUnits(artifact);
  const selectedUnits = units.slice(0, rules.maxAbilities);
  const target = {};

  selectedUnits.forEach((unit) => applyUnit(target, unit, rules.scale));

  return {
    mechanics: target,
    selectedAbilityIds: selectedUnits.map((unit) => unit.id),
    abilityCount: selectedUnits.length,
    powerScore: Math.round(
      selectedUnits.reduce((sum, unit) => sum + getUnitScore(unit) * rules.scale, 0) * 100
    ) / 100,
  };
}

function buildArtifactDescription(artifact = {}) {
  const additions = formatArtifactAdditions(artifact);
  if (!additions.length) return artifact.description || "";
  return additions.join("; ");
}

function normalizeDepthsArtifact(artifact = {}) {
  const theme = artifact.theme || artifact.rarity || "";
  const rarity = getExplicitArtifactRarity(artifact) || inferArtifactRarity(artifact);
  const balanced = getBalancedArtifactMechanics(artifact, rarity);
  const {
    statBonuses,
    moveAccuracy,
    battleOnly,
    depthsAbilityMeta,
    artifactMeta,
    rewardRarity: _rewardRarity,
    rarityTier: _rarityTier,
    rarity: _rarity,
    description: _description,
    ...base
  } = artifact;
  const normalized = {
    ...base,
    ...balanced.mechanics,
    theme,
    rarity,
    abilityCount: balanced.abilityCount,
    abilityGroups: balanced.abilityCount,
    selectedAbilityIds: balanced.selectedAbilityIds,
    powerScore: balanced.powerScore,
  };

  return {
    ...normalized,
    description: buildArtifactDescription(normalized),
  };
}

const RAW_DEPTHS_ARTIFACTS = [
  {
    id: "blood-coin",
    name: "Blood Coin",
    rarity: "Vampiric",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/blood-coin.png`,
    description: "After your champion defeats a monster, heal for 10% of max health.",
    artifactMeta: { healOnKillPct: 10 },
  },
  {
    id: "glass-crown",
    name: "Glass Crown",
    rarity: "Volatile",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/glass-crown.png`,
    description: "Deal 35% more damage, but take 20% more damage.",
    artifactMeta: { damageDealtPct: 35, damageTakenPct: 20 },
  },
  {
    id: "ember-vow",
    name: "Ember Vow",
    rarity: "Flamebound",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/ember-vow.png`,
    description: "Burn stacks your champion applies are increased by 2.",
    artifactMeta: { effectPotencyBonus: { burn: 2 } },
  },
  {
    id: "old-banner",
    name: "Old Banner",
    rarity: "Banner",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/old-banner.png`,
    description: "The first buff card your champion plays each room has no cooldown.",
    artifactMeta: { firstBuffNoCooldown: true },
  },
  {
    id: "thorn-halo",
    name: "Thorn Halo",
    rarity: "Briar",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/thorn-halo.png`,
    description: "Melee hits apply poison and your champion starts each room with shield.",
    battleOnly: [
      { type: "apply_on_hit", attackType: "melee", effectKey: "poison", amount: 1 },
      { type: "gain_start_of_battle", effectKey: "shield", amount: 5 },
    ],
  },
  {
    id: "vellichor",
    name: "Vellichor",
    rarity: "Archive",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/vellichor.png`,
    description: "Magic moves gain accuracy and your champion starts each room with focus.",
    moveAccuracy: { magic: 10 },
    battleOnly: [{ type: "gain_start_of_battle", effectKey: "focus", amount: 5 }],
  },
  {
    id: "third-key-under-glass",
    name: "The Third Key Under Glass",
    rarity: "Key",
    rewardRarity: "rare",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/third-key-under-glass.png`,
    description: "The first damage or curse card your champion plays each room has no cooldown.",
    artifactMeta: { firstDamageNoCooldown: true },
  },
  {
    id: "nightjar-compass",
    name: "Nightjar Compass",
    rarity: "Guide",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/nightjar-compass.png`,
    description: "Gain speed and ranged move accuracy.",
    statBonuses: { speed: 8 },
    moveAccuracy: { ranged: 8 },
  },
  {
    id: "salt-marked-bell",
    name: "Salt-Marked Bell",
    rarity: "Tideward",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/salt-marked-bell.png`,
    description: "At room start, slow the first monster. Your champion resists drown.",
    battleOnly: [
      { type: "apply_start_of_battle", effectKey: "slow", amount: 4 },
      { type: "resistance", resistedEffect: "drown", amount: 18 },
    ],
  },
  {
    id: "oath-of-the-hollow-king",
    name: "Oath of the Hollow King",
    rarity: "Oath",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/oath-of-the-hollow-king.png`,
    description: "Gain strength and deal more damage, but start each room with doom.",
    statBonuses: { strength: 10 },
    artifactMeta: { damageDealtPct: 15 },
    battleOnly: [{ type: "gain_start_of_battle", effectKey: "doom", amount: 3 }],
  },
  {
    id: "briar-lens",
    name: "Briar Lens",
    rarity: "Venom",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/briar-lens.png`,
    description: "Gain crit chance. Critical hits apply poison.",
    statBonuses: { critChance: 8 },
    battleOnly: [{ type: "apply_on_crit", effectKey: "poison", amount: 3 }],
  },
  {
    id: "moonspike",
    name: "Moonspike",
    rarity: "Lunar",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/moonspike.png`,
    description: "Ranged moves gain accuracy and ranged hits apply freeze.",
    moveAccuracy: { ranged: 10 },
    battleOnly: [{ type: "apply_on_hit", attackType: "ranged", effectKey: "freeze", amount: 1 }],
  },
  {
    id: "candle-without-wick",
    name: "Candle Without Wick",
    rarity: "Mercy",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/candle-without-wick.png`,
    description: "Gain a stronger emergency heal and start each room with cleanse.",
    depthsAbilityMeta: { secondWind: { thresholdPct: 35, healPct: 22, shield: 4 } },
    battleOnly: [{ type: "gain_start_of_battle", effectKey: "cleanse", amount: 5 }],
  },
  {
    id: "quiet-anvil",
    name: "The Quiet Anvil",
    rarity: "Iron",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/quiet-anvil.png`,
    description: "Gain resist and take 12% less damage.",
    statBonuses: { resist: 8 },
    artifactMeta: { damageTakenPct: -12 },
  },
  {
    id: "ash-eater-chalice",
    name: "Ash-Eater Chalice",
    rarity: "Ash",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/ash-eater-chalice.png`,
    description: "Gain lifesteal and increase burn stacks your champion applies.",
    depthsAbilityMeta: { lifeStealPct: 4 },
    artifactMeta: { effectPotencyBonus: { burn: 1 } },
  },
  {
    id: "sable-dice",
    name: "Sable Dice",
    rarity: "Gambit",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/sable-dice.png`,
    description: "Gain crit chance and deal more damage, but take more damage.",
    statBonuses: { critChance: 10 },
    artifactMeta: { damageDealtPct: 8, damageTakenPct: 8 },
  },
  {
    id: "sunken-locket-of-nine-tides",
    name: "Sunken Locket of Nine Tides",
    rarity: "Depth",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/sunken-locket-of-nine-tides.png`,
    description: "Gain health. Magic and ranged hits apply drown.",
    statBonuses: { health: 18 },
    battleOnly: [
      { type: "apply_on_hit", attackType: "magic", effectKey: "drown", amount: 1 },
      { type: "apply_on_hit", attackType: "ranged", effectKey: "drown", amount: 1 },
    ],
  },
  {
    id: "stagbone",
    name: "Stagbone",
    rarity: "Hunt",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/stagbone.png`,
    description: "Gain strength and speed. Hits grant strengthen.",
    statBonuses: { strength: 6, speed: 4 },
    battleOnly: [{ type: "gain_on_hit", effectKey: "strengthen", amount: 1 }],
  },
  {
    id: "crown-of-borrowed-thunder",
    name: "Crown of Borrowed Thunder",
    rarity: "Storm",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/crown-of-borrowed-thunder.png`,
    description: "Gain crit damage. Critical hits apply paralyze.",
    statBonuses: { critDamage: 35 },
    battleOnly: [{ type: "apply_on_crit", effectKey: "paralyze", amount: 2 }],
  },
  {
    id: "knife-that-remembers",
    name: "Knife That Remembers",
    rarity: "Memory",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/knife-that-remembers.png`,
    description: "Damage moves deal bonus flat damage and melee hits apply bleed.",
    artifactMeta: { damageBonusFlat: 6 },
    battleOnly: [{ type: "apply_on_hit", attackType: "melee", effectKey: "bleed", amount: 2 }],
  },
  {
    id: "pale-orchard-seed",
    name: "Pale Orchard Seed",
    rarity: "Growth",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/pale-orchard-seed.png`,
    description: "Healing is stronger and your champion starts each room with nurture.",
    artifactMeta: { healingDonePct: 20 },
    battleOnly: [{ type: "gain_start_of_battle", effectKey: "nurture", amount: 6 }],
  },
  {
    id: "furnace-psalm",
    name: "Furnace Psalm",
    rarity: "Hymn",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/furnace-psalm.png`,
    description: "Burn stacks your champion applies are increased by 2 and room starts grant empower.",
    artifactMeta: { effectPotencyBonus: { burn: 2 } },
    battleOnly: [{ type: "gain_start_of_battle", effectKey: "empower", amount: 4 }],
  },
  {
    id: "mirror-of-last-mercy",
    name: "Mirror of Last Mercy",
    rarity: "Mirror",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/mirror-of-last-mercy.png`,
    description: "Take less damage and gain an emergency heal.",
    artifactMeta: { damageTakenPct: -5 },
    depthsAbilityMeta: { secondWind: { thresholdPct: 30, healPct: 18, shield: 5 } },
  },
  {
    id: "gloam-thread",
    name: "Gloam Thread",
    rarity: "Shadow",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/gloam-thread.png`,
    description: "Gain speed, curse accuracy, and magic hits apply slow.",
    statBonuses: { speed: 6 },
    moveAccuracy: { curse: 8 },
    battleOnly: [{ type: "apply_on_hit", attackType: "magic", effectKey: "slow", amount: 1 }],
  },
  {
    id: "saint-of-splinters",
    name: "Saint of Splinters",
    rarity: "Relic",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/saint-of-splinters.png`,
    description: "Start each room with shield and cleanse. Your champion resists bleed.",
    battleOnly: [
      { type: "gain_start_of_battle", effectKey: "shield", amount: 5 },
      { type: "gain_start_of_battle", effectKey: "cleanse", amount: 4 },
      { type: "resistance", resistedEffect: "bleed", amount: 20 },
    ],
  },
  {
    id: "wyrmglass",
    name: "Wyrmglass",
    rarity: "Dragon",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/wyrmglass.png`,
    description: "Gain intelligence and deal more damage. Doom stacks your champion applies are increased by 1.",
    statBonuses: { intelligence: 8 },
    artifactMeta: { damageDealtPct: 10, effectPotencyBonus: { doom: 1 } },
  },
  {
    id: "hollow-drum",
    name: "Hollow Drum",
    rarity: "War",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/hollow-drum.png`,
    description: "Start each room with strengthen and hasten. First damage or curse card has no cooldown.",
    artifactMeta: { firstDamageNoCooldown: true },
    battleOnly: [
      { type: "gain_start_of_battle", effectKey: "strengthen", amount: 4 },
      { type: "gain_start_of_battle", effectKey: "hasten", amount: 3 },
    ],
  },
  {
    id: "black-star-reliquary",
    name: "Black Star Reliquary",
    rarity: "Star",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/black-star-reliquary.png`,
    description: "Gain crit damage. Low-health monsters take extra damage and critical hits apply doom.",
    statBonuses: { critDamage: 25 },
    depthsAbilityMeta: { lowHpDamage: { thresholdPct: 35, flatDamage: 10 } },
    battleOnly: [{ type: "apply_on_crit", effectKey: "doom", amount: 2 }],
  },
  {
    id: "foxfire-knot",
    name: "Foxfire Knot",
    rarity: "Trick",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/foxfire-knot.png`,
    description: "Gain dexterity. Ranged and magic hits apply burn.",
    statBonuses: { dexterity: 8 },
    battleOnly: [
      { type: "apply_on_hit", attackType: "ranged", effectKey: "burn", amount: 1 },
      { type: "apply_on_hit", attackType: "magic", effectKey: "burn", amount: 1 },
    ],
  },
  {
    id: "door-that-opens-inward",
    name: "The Door That Opens Inward",
    rarity: "Threshold",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/door-that-opens-inward.png`,
    description: "Gain health. First buff card each room has no cooldown and kills heal slightly.",
    statBonuses: { health: 10 },
    artifactMeta: { firstBuffNoCooldown: true, healOnKillPct: 5 },
  },
  {
    id: "lanternjaw",
    name: "Lanternjaw",
    rarity: "Ember",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/lanternjaw.png`,
    description: "Start each room with focus. Magic hits apply burn.",
    battleOnly: [
      { type: "gain_start_of_battle", effectKey: "focus", amount: 5 },
      { type: "apply_on_hit", attackType: "magic", effectKey: "burn", amount: 1 },
    ],
  },
  {
    id: "grief-engine",
    name: "Grief Engine",
    rarity: "Machine",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/grief-engine.png`,
    description: "Deal more damage and critical hits apply doom, but your champion takes more damage.",
    artifactMeta: { damageDealtPct: 18, damageTakenPct: 10 },
    battleOnly: [{ type: "apply_on_crit", effectKey: "doom", amount: 2 }],
  },
  {
    id: "nail-beneath-the-moon",
    name: "The Nail Beneath the Moon",
    rarity: "Moonbound",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/nail-beneath-the-moon.png`,
    description: "Curse moves gain accuracy. The first damage or curse card each room has no cooldown.",
    moveAccuracy: { curse: 12 },
    artifactMeta: { firstDamageNoCooldown: true },
  },
  {
    id: "opal-maw",
    name: "Opal Maw",
    rarity: "Hunger",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/opal-maw.png`,
    description: "Gain lifesteal and increase poison stacks your champion applies.",
    depthsAbilityMeta: { lifeStealPct: 6 },
    artifactMeta: { effectPotencyBonus: { poison: 1 } },
  },
  {
    id: "widows-sundial",
    name: "Widow's Sundial",
    rarity: "Time",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/widows-sundial.png`,
    description: "Gain speed. At room start, slow the first monster.",
    statBonuses: { speed: 9 },
    battleOnly: [{ type: "apply_start_of_battle", effectKey: "slow", amount: 5 }],
  },
  {
    id: "red-thread-of-no-return",
    name: "The Red Thread of No Return",
    rarity: "Bloodline",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/red-thread-of-no-return.png`,
    description: "Bleed stacks your champion applies are increased and kills restore health.",
    artifactMeta: { effectPotencyBonus: { bleed: 2 }, healOnKillPct: 6 },
  },
  {
    id: "cinderjaw-idol",
    name: "Cinderjaw Idol",
    rarity: "Cinder",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/cinderjaw-idol.png`,
    description: "Melee hits apply burn. Burn stacks your champion applies are increased.",
    artifactMeta: { effectPotencyBonus: { burn: 1 } },
    battleOnly: [{ type: "apply_on_hit", attackType: "melee", effectKey: "burn", amount: 2 }],
  },
  {
    id: "frostbitten-stylus",
    name: "Frostbitten Stylus",
    rarity: "Frost",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/frostbitten-stylus.png`,
    description: "Gain intelligence and resist. Magic hits apply freeze.",
    statBonuses: { intelligence: 6, resist: 5 },
    battleOnly: [{ type: "apply_on_hit", attackType: "magic", effectKey: "freeze", amount: 1 }],
  },
  {
    id: "wardens-pocket-star",
    name: "Warden's Pocket Star",
    rarity: "Ward",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/wardens-pocket-star.png`,
    description: "Start each room with shield and cleanse. Healing is stronger.",
    artifactMeta: { healingDonePct: 12 },
    battleOnly: [
      { type: "gain_start_of_battle", effectKey: "shield", amount: 6 },
      { type: "gain_start_of_battle", effectKey: "cleanse", amount: 4 },
    ],
  },
  {
    id: "briarclock",
    name: "Briarclock",
    rarity: "Briar",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/briarclock.png`,
    description: "Poison stacks your champion applies are increased. At room start, slow the first monster.",
    artifactMeta: { effectPotencyBonus: { poison: 2 } },
    battleOnly: [{ type: "apply_start_of_battle", effectKey: "slow", amount: 3 }],
  },
  {
    id: "cup-that-drinks-silence",
    name: "The Cup That Drinks Silence",
    rarity: "Silence",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/cup-that-drinks-silence.png`,
    description: "Gain lifesteal and take less damage.",
    depthsAbilityMeta: { lifeStealPct: 5 },
    artifactMeta: { damageTakenPct: -8 },
  },
  {
    id: "iron-saints-fingerbone",
    name: "Iron Saint's Fingerbone",
    rarity: "Saint",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/iron-saints-fingerbone.png`,
    description: "Gain health and resist. Your emergency heal triggers earlier.",
    statBonuses: { health: 18, resist: 6 },
    depthsAbilityMeta: { secondWind: { thresholdPct: 38, healPct: 18, shield: 5 } },
  },
  {
    id: "velvet-guillotine",
    name: "Velvet Guillotine",
    rarity: "Execution",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/velvet-guillotine.png`,
    description: "Gain crit chance and crit damage. Critical hits apply bleed.",
    statBonuses: { critChance: 7, critDamage: 24 },
    battleOnly: [{ type: "apply_on_crit", effectKey: "bleed", amount: 3 }],
  },
  {
    id: "morrow",
    name: "Morrow",
    rarity: "Dawn",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/morrow.png`,
    description: "Gain speed. Start each room with focus and first damage or curse card has no cooldown.",
    statBonuses: { speed: 6 },
    artifactMeta: { firstDamageNoCooldown: true },
    battleOnly: [{ type: "gain_start_of_battle", effectKey: "focus", amount: 4 }],
  },
  {
    id: "spiral-of-black-rain",
    name: "Spiral of Black Rain",
    rarity: "Depth",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/spiral-of-black-rain.png`,
    description: "Drown stacks your champion applies are increased. Magic hits apply drown.",
    artifactMeta: { effectPotencyBonus: { drown: 2 } },
    battleOnly: [{ type: "apply_on_hit", attackType: "magic", effectKey: "drown", amount: 1 }],
  },
  {
    id: "laughing-mask",
    name: "Laughing Mask",
    rarity: "Trick",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/laughing-mask.png`,
    description: "Gain crit chance and deal more damage, but take more damage. Critical hits apply paralyze.",
    statBonuses: { critChance: 9 },
    artifactMeta: { damageDealtPct: 10, damageTakenPct: 10 },
    battleOnly: [{ type: "apply_on_crit", effectKey: "paralyze", amount: 2 }],
  },
  {
    id: "drowned-kings-pearl",
    name: "Drowned King's Pearl",
    rarity: "Tide",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/drowned-kings-pearl.png`,
    description: "Start each room with nurture and bless. Your champion resists drown.",
    battleOnly: [
      { type: "gain_start_of_battle", effectKey: "nurture", amount: 5 },
      { type: "gain_start_of_battle", effectKey: "bless", amount: 4 },
      { type: "resistance", resistedEffect: "drown", amount: 22 },
    ],
  },
  {
    id: "ashen-rosary-of-teeth",
    name: "Ashen Rosary of Teeth",
    rarity: "Ash",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/ashen-rosary-of-teeth.png`,
    description: "Gain strength. Burn and bleed stacks your champion applies are increased.",
    statBonuses: { strength: 6 },
    artifactMeta: { effectPotencyBonus: { burn: 1, bleed: 1 } },
  },
  {
    id: "starveglass",
    name: "Starveglass",
    rarity: "Hollow",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/starveglass.png`,
    description: "Damage moves deal bonus damage and weakened monsters take extra finisher damage.",
    artifactMeta: { damageBonusFlat: 4 },
    depthsAbilityMeta: { lowHpDamage: { thresholdPct: 35, flatDamage: 8 } },
  },
  {
    id: "little-war-bell",
    name: "The Little War Bell",
    rarity: "War",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/little-war-bell.png`,
    description: "Start each room with strengthen and hasten. Melee moves gain accuracy.",
    moveAccuracy: { melee: 8 },
    battleOnly: [
      { type: "gain_start_of_battle", effectKey: "strengthen", amount: 5 },
      { type: "gain_start_of_battle", effectKey: "hasten", amount: 3 },
    ],
  },
  {
    id: "blue-thorn-reliquary",
    name: "Blue Thorn Reliquary",
    rarity: "Reliquary",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/blue-thorn-reliquary.png`,
    description: "Gain resist. Ranged hits apply slow and your champion resists paralyze.",
    statBonuses: { resist: 7 },
    battleOnly: [
      { type: "apply_on_hit", attackType: "ranged", effectKey: "slow", amount: 2 },
      { type: "resistance", resistedEffect: "paralyze", amount: 18 },
    ],
  },
  {
    id: "cobalt-mercy-hook",
    name: "Cobalt Mercy Hook",
    rarity: "Mercy",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/cobalt-mercy-hook.png`,
    description: "Kills heal your champion and damaging moves deal bonus flat damage.",
    artifactMeta: { healOnKillPct: 8, damageBonusFlat: 3 },
  },
  {
    id: "map-that-bleeds",
    name: "The Map That Bleeds",
    rarity: "Cartograph",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/map-that-bleeds.png`,
    description: "Bleed stacks your champion applies are increased. First damage or curse card each room has no cooldown.",
    artifactMeta: { effectPotencyBonus: { bleed: 2 }, firstDamageNoCooldown: true },
  },
  {
    id: "sepulcher-nail",
    name: "Sepulcher Nail",
    rarity: "Grave",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/sepulcher-nail.png`,
    description: "Doom stacks your champion applies are increased. Magic hits apply doom.",
    artifactMeta: { effectPotencyBonus: { doom: 1 } },
    battleOnly: [{ type: "apply_on_hit", attackType: "magic", effectKey: "doom", amount: 1 }],
  },
  {
    id: "sunless-lyre",
    name: "Sunless Lyre",
    rarity: "Hymn",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/sunless-lyre.png`,
    description: "Healing is stronger. Start each room with bless and nurture.",
    artifactMeta: { healingDonePct: 18 },
    battleOnly: [
      { type: "gain_start_of_battle", effectKey: "bless", amount: 5 },
      { type: "gain_start_of_battle", effectKey: "nurture", amount: 4 },
    ],
  },
  {
    id: "mercy-engine",
    name: "Mercy Engine",
    rarity: "Machine",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/mercy-engine.png`,
    description: "Take less damage. Your emergency heal is stronger and healing is increased.",
    artifactMeta: { damageTakenPct: -10, healingDonePct: 10 },
    depthsAbilityMeta: { secondWind: { thresholdPct: 32, healPct: 20, shield: 6 } },
  },
  {
    id: "thousandth-ember",
    name: "The Thousandth Ember",
    rarity: "Inferno",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/thousandth-ember.png`,
    description: "Burn stacks your champion applies are increased. Critical hits apply burn and room start grants empower.",
    artifactMeta: { effectPotencyBonus: { burn: 2 } },
    battleOnly: [
      { type: "apply_on_crit", effectKey: "burn", amount: 3 },
      { type: "gain_start_of_battle", effectKey: "empower", amount: 4 },
    ],
  },
  {
    id: "saltglass-prism",
    name: "Saltglass Prism",
    rarity: "Prism",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/saltglass-prism.png`,
    description: "Your champion steals a little life and healing is refracted stronger.",
    artifactMeta: { healingDonePct: 18 },
    depthsAbilityMeta: { lifeStealPct: 5 },
  },
  {
    id: "gravebloom",
    name: "Gravebloom",
    rarity: "Bloom",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/gravebloom.png`,
    description: "Start each room with nurture and apply poison to the first monster.",
    battleOnly: [
      { type: "gain_start_of_battle", effectKey: "nurture", amount: 6 },
      { type: "apply_start_of_battle", effectKey: "poison", amount: 4 },
    ],
  },
  {
    id: "crownless-throne-key",
    name: "Crownless Throne Key",
    rarity: "Threshold",
    imageSrc: `${ARTIFACT_IMAGE_BASE}/crownless-throne-key.png`,
    description: "Gain health. The first buff card and first damage or curse card each room have no cooldown.",
    statBonuses: { health: 12 },
    artifactMeta: { firstBuffNoCooldown: true, firstDamageNoCooldown: true },
  },
];

export const DEPTHS_ARTIFACTS = RAW_DEPTHS_ARTIFACTS.map(normalizeDepthsArtifact);

function matchesArtifactRarityFilter(artifact = {}, options = {}) {
  const rarity = String(artifact.rarity || "").toLowerCase();
  const allowedRarities = options.allowedRarities || (options.rarity ? [options.rarity] : null);
  if (!allowedRarities) return true;
  return allowedRarities.map((entry) => String(entry).toLowerCase()).includes(rarity);
}

export function pickDepthsArtifactChoices(
  chosenArtifacts = [],
  count = 3,
  traitSource = null,
  options = {}
) {
  const traitProfile = buildDepthsTraitAwakeningProfile(traitSource || {});
  const rarityPool = DEPTHS_ARTIFACTS.filter((artifact) =>
    matchesArtifactRarityFilter(artifact, options)
  );
  const pool = rarityPool.filter((artifact) =>
    artifactMatchesChampionBuild(artifact, traitSource, options)
  );
  const weighted = pickWeightedDepthsRewards(pool, count, traitProfile);
  const fallback = weighted.length >= count ? weighted : shuffleRows(pool).slice(0, count);

  return fallback.map((artifact) => ({
    ...artifact,
    traitAwakening: getTraitAwakeningLabel(artifact, traitProfile),
  }));
}

export function summarizeDepthsArtifact(artifact, roomNumber) {
  return {
    id: artifact.id,
    name: artifact.name,
    rarity: artifact.rarity || "Artifact",
    theme: artifact.theme || "",
    abilityCount: artifact.abilityCount || getArtifactAbilityGroupCount(artifact),
    abilityGroups: artifact.abilityGroups || artifact.abilityCount || getArtifactAbilityGroupCount(artifact),
    selectedAbilityIds: artifact.selectedAbilityIds || [],
    powerScore: artifact.powerScore || Math.round(scoreArtifactPower(artifact) * 100) / 100,
    imageSrc: artifact.imageSrc || "",
    description: artifact.description || "",
    room: roomNumber,
    statBonuses: artifact.statBonuses || {},
    moveAccuracy: artifact.moveAccuracy || {},
    battleOnly: artifact.battleOnly || [],
    depthsAbilityMeta: artifact.depthsAbilityMeta || {},
    artifactMeta: artifact.artifactMeta || {},
    awakeningTags: artifact.awakeningTags || [],
    rewardTags: artifact.rewardTags || [],
    traitAwakening: artifact.traitAwakening || "",
  };
}

export function buildDepthsArtifactRuntime(artifacts = []) {
  const statBonuses = {};
  const moveAccuracy = {};
  const battleOnly = [];
  let depthsAbilityMeta = {
    lifeStealPct: 0,
    lowHpDamage: null,
    secondWind: null,
  };
  let artifactMeta = {};

  (artifacts || []).forEach((artifact) => {
    Object.assign(statBonuses, mergeNumberMaps(statBonuses, artifact.statBonuses || {}));
    Object.assign(moveAccuracy, mergeNumberMaps(moveAccuracy, artifact.moveAccuracy || {}));
    (artifact.battleOnly || []).forEach((entry) => {
      battleOnly.push({
        ...entry,
        sourceName: artifact.name,
        sourceArtifactId: artifact.id,
      });
    });
    depthsAbilityMeta = mergeDepthsAbilityMeta(
      depthsAbilityMeta,
      artifact.depthsAbilityMeta || {}
    );
    artifactMeta = mergeArtifactMeta(artifactMeta, artifact.artifactMeta || {});
  });

  return { statBonuses, moveAccuracy, battleOnly, depthsAbilityMeta, artifactMeta };
}

export function formatArtifactAdditions(artifact = {}) {
  const rows = [];
  Object.entries(artifact.statBonuses || {}).forEach(([key, value]) => {
    rows.push(`${value >= 0 ? "+" : ""}${value} ${key}`);
  });
  Object.entries(artifact.moveAccuracy || {}).forEach(([key, value]) => {
    rows.push(`${value >= 0 ? "+" : ""}${value} ${key} accuracy`);
  });
  (artifact.battleOnly || []).forEach((entry) => {
    const effect = entry.effectKey || entry.resistedEffect || "effect";
    if (entry.type === "gain_start_of_battle") rows.push(`room start: gain ${entry.amount} ${effect}`);
    else if (entry.type === "apply_start_of_battle") rows.push(`room start: apply ${entry.amount} ${effect}`);
    else if (entry.type === "resistance") rows.push(`${entry.amount}% ${effect} resistance`);
    else if (entry.type === "gain_on_hit") rows.push(`${entry.attackType || "any"} hit: gain ${entry.amount} ${effect}`);
    else if (entry.type === "apply_on_crit") rows.push(`crit: apply ${entry.amount} ${effect}`);
    else if (entry.type === "apply_on_hit") rows.push(`${entry.attackType || "any"} hit: apply ${entry.amount} ${effect}`);
  });

  const meta = artifact.artifactMeta || {};
  if (meta.damageDealtPct) rows.push(`${meta.damageDealtPct > 0 ? "+" : ""}${meta.damageDealtPct}% damage dealt`);
  if (meta.damageTakenPct) rows.push(`${meta.damageTakenPct > 0 ? "+" : ""}${meta.damageTakenPct}% damage taken`);
  if (meta.healingDonePct) rows.push(`${meta.healingDonePct > 0 ? "+" : ""}${meta.healingDonePct}% healing`);
  if (meta.damageBonusFlat) rows.push(`${meta.damageBonusFlat > 0 ? "+" : ""}${meta.damageBonusFlat} damage`);
  if (meta.healOnKillPct) rows.push(`heal ${meta.healOnKillPct}% max HP on kill`);
  if (meta.firstBuffNoCooldown) rows.push("first buff card each room has no cooldown");
  if (meta.firstDamageNoCooldown) rows.push("first damage or curse card each room has no cooldown");
  Object.entries(meta.effectPotencyBonus || {}).forEach(([key, value]) => {
    rows.push(`${value > 0 ? "+" : ""}${value} ${key} stacks applied`);
  });
  if (artifact.depthsAbilityMeta?.lifeStealPct) rows.push(`${artifact.depthsAbilityMeta.lifeStealPct}% lifesteal`);
  if (artifact.depthsAbilityMeta?.secondWind) {
    const secondWind = artifact.depthsAbilityMeta.secondWind;
    const healText = `${secondWind.healPct}% max HP`;
    const shieldText = secondWind.shield ? ` and gain ${secondWind.shield} shield` : "";
    rows.push(`once per room at ${secondWind.thresholdPct}% HP or lower: heal ${healText}${shieldText}`);
  }
  if (artifact.depthsAbilityMeta?.lowHpDamage) rows.push("bonus damage to weakened monsters");

  return rows;
}
