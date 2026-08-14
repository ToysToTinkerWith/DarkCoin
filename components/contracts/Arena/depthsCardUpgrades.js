import {
  buildDepthsTraitAwakeningProfile,
  getTraitAwakeningLabel,
  isDepthsTraitRewardUnlocked,
  pickWeightedDepthsRewards,
} from "./depthsTraitAwakenings";

const EFFECT_KEYS = [
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

const NEGATIVE_EFFECT_KEYS = new Set([
  "bleed",
  "burn",
  "freeze",
  "slow",
  "paralyze",
  "drown",
  "doom",
  "poison",
]);

const finiteNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundToTenth(value) {
  return Math.round(finiteNumber(value, 0) * 10) / 10;
}

function shuffleRows(rows = []) {
  return [...rows].sort(() => Math.random() - 0.5);
}

function getMoveClass(move = {}) {
  const type = String(move.type || move.category || "").toLowerCase();
  if (type.includes("buff")) return "buff";
  if (type.includes("curse")) return "curse";
  return "damage";
}

function getMoveRange(move = {}) {
  const type = String(move.type || move.category || "").toLowerCase();
  if (type.startsWith("melee")) return "melee";
  if (type.startsWith("ranged")) return "ranged";
  if (type.startsWith("magic")) return "magic";
  return "";
}

function getMoveEffect(move = {}) {
  return String(move.effect_name || move.effect || "").toLowerCase();
}

function getMoveCooldown(move = {}) {
  return Math.max(0.1, finiteNumber(move.cooldown_seconds ?? move.cooldown, 3));
}

function getMoveBasePotency(move = {}) {
  const effectKey = getMoveEffect(move);
  if (!effectKey || effectKey === "none") return 0;
  return finiteNumber(move.effect_potency_base ?? move.effect_potency, 0);
}

function hasNegativeEffect(move = {}) {
  return NEGATIVE_EFFECT_KEYS.has(getMoveEffect(move));
}

function hasPositiveEffect(move = {}) {
  const effectKey = getMoveEffect(move);
  return effectKey && effectKey !== "none" && !NEGATIVE_EFFECT_KEYS.has(effectKey);
}

function getMoveDisplayName(move = {}, index = 0) {
  return move.name || `Card ${index + 1}`;
}

const CARD_UPGRADE_DEFINITIONS = [
  {
    id: "quickened-draw",
    name: "Quickened Draw",
    description: "Reduce this card's cooldown.",
    appliesTo: ["any"],
    cooldownDelta: -0.75,
  },
  {
    id: "featherweight-form",
    name: "Featherweight Form",
    description: "Greatly reduce cooldown, but lose some accuracy.",
    appliesTo: ["any"],
    cooldownDelta: -1.15,
    accuracyDelta: -6,
  },
  {
    id: "sure-grip",
    name: "Sure Grip",
    description: "Increase this card's accuracy.",
    appliesTo: ["any"],
    accuracyDelta: 12,
  },
  {
    id: "polished-sequence",
    name: "Polished Sequence",
    description: "Gain accuracy and a small cooldown reduction.",
    appliesTo: ["any"],
    accuracyDelta: 6,
    cooldownDelta: -0.35,
  },
  {
    id: "heavy-stroke",
    name: "Heavy Stroke",
    description: "Increase power, but the card takes longer to recover.",
    appliesTo: ["any"],
    powerDelta: 12,
    cooldownDelta: 0.65,
  },
  {
    id: "honed-edge",
    name: "Honed Edge",
    description: "Increase this card's power.",
    appliesTo: ["any"],
    powerDelta: 8,
  },
  {
    id: "brutal-reading",
    name: "Brutal Reading",
    description: "Increase this card's power by a percentage.",
    appliesTo: ["damage", "curse"],
    powerMultiplier: 1.22,
  },
  {
    id: "deeper-channel",
    name: "Deeper Channel",
    description: "Increase the card's main effect stacks.",
    appliesTo: ["hasEffect"],
    effectPotencyBonus: 1,
  },
  {
    id: "overcharged-channel",
    name: "Overcharged Channel",
    description: "Apply more effect stacks, but recover more slowly.",
    appliesTo: ["hasEffect"],
    effectPotencyBonus: 2,
    cooldownDelta: 0.55,
  },
  {
    id: "echo-cast",
    name: "Echo Cast",
    description: "The card fires twice, but each hit is weaker.",
    appliesTo: ["damage", "curse"],
    repeatCount: 2,
    powerMultiplier: 0.72,
    accuracyDelta: -5,
    cooldownDelta: 0.45,
  },
  {
    id: "splinter-version",
    name: "Splinter Version",
    description: "The card hits all valid targets, but each hit is weaker.",
    appliesTo: ["damage", "curse"],
    multiTarget: true,
    powerMultiplier: 0.68,
    accuracyDelta: -6,
    effectPotencyMultiplier: 0.65,
    cooldownDelta: 0.65,
  },
  {
    id: "rain-of-copies",
    name: "Rain of Copies",
    description: "The card hits all valid targets and repeats once, but with much lower power.",
    appliesTo: ["damage", "curse"],
    multiTarget: true,
    repeatCount: 2,
    powerMultiplier: 0.52,
    accuracyDelta: -10,
    effectPotencyMultiplier: 0.5,
    cooldownDelta: 1.2,
  },
  {
    id: "critical-etching",
    name: "Critical Etching",
    description: "This card has increased crit chance.",
    appliesTo: ["damage", "curse", "buff"],
    critChanceBonus: 8,
  },
  {
    id: "execution-line",
    name: "Execution Line",
    description: "Add power and crit chance, but recover slightly slower.",
    appliesTo: ["damage", "curse"],
    powerDelta: 6,
    critChanceBonus: 6,
    cooldownDelta: 0.35,
  },
  {
    id: "bleeding-ink",
    name: "Bleeding Ink",
    description: "On hit, also apply bleed.",
    appliesTo: ["damage", "curse"],
    secondaryEffects: [{ target: "target", effectKey: "bleed", amount: 2 }],
  },
  {
    id: "venom-margin",
    name: "Venom Margin",
    description: "On hit, also apply poison.",
    appliesTo: ["damage", "curse"],
    secondaryEffects: [{ target: "target", effectKey: "poison", amount: 2 }],
  },
  {
    id: "scorching-footnote",
    name: "Scorching Footnote",
    description: "On hit, also apply burn.",
    appliesTo: ["damage", "curse"],
    secondaryEffects: [{ target: "target", effectKey: "burn", amount: 2 }],
  },
  {
    id: "frost-annotation",
    name: "Frost Annotation",
    description: "On hit, also apply freeze.",
    appliesTo: ["damage", "curse"],
    secondaryEffects: [{ target: "target", effectKey: "freeze", amount: 1 }],
  },
  {
    id: "gravity-hook",
    name: "Gravity Hook",
    description: "On hit, also apply slow.",
    appliesTo: ["damage", "curse"],
    secondaryEffects: [{ target: "target", effectKey: "slow", amount: 2 }],
  },
  {
    id: "doom-underline",
    name: "Doom Underline",
    description: "On hit, also apply doom.",
    appliesTo: ["damage", "curse"],
    secondaryEffects: [{ target: "target", effectKey: "doom", amount: 1 }],
  },
  {
    id: "focus-return",
    name: "Focus Return",
    description: "When this card hits, your champion gains focus.",
    appliesTo: ["damage", "curse"],
    secondaryEffects: [{ target: "self", effectKey: "focus", amount: 2 }],
  },
  {
    id: "shielded-followthrough",
    name: "Shielded Followthrough",
    description: "When this card hits, your champion gains shield.",
    appliesTo: ["damage", "curse"],
    secondaryEffects: [{ target: "self", effectKey: "shield", amount: 3 }],
  },
  {
    id: "rallying-cast",
    name: "Rallying Cast",
    description: "Buff cards also grant focus.",
    appliesTo: ["buff"],
    secondaryEffects: [{ target: "target", effectKey: "focus", amount: 2 }],
  },
  {
    id: "guarded-boon",
    name: "Guarded Boon",
    description: "Buff cards also grant shield.",
    appliesTo: ["buff"],
    secondaryEffects: [{ target: "target", effectKey: "shield", amount: 4 }],
  },
  {
    id: "cleansing-boon",
    name: "Cleansing Boon",
    description: "Buff cards also grant cleanse.",
    appliesTo: ["buff"],
    secondaryEffects: [{ target: "target", effectKey: "cleanse", amount: 3 }],
  },
  {
    id: "nurturing-boon",
    name: "Nurturing Boon",
    description: "Buff cards also grant nurture.",
    appliesTo: ["buff"],
    secondaryEffects: [{ target: "target", effectKey: "nurture", amount: 3 }],
  },
  {
    id: "blessed-script",
    name: "Blessed Script",
    description: "Buff cards also grant bless and recover slightly faster.",
    appliesTo: ["buff"],
    cooldownDelta: -0.3,
    secondaryEffects: [{ target: "target", effectKey: "bless", amount: 2 }],
  },
  {
    id: "empowered-verse",
    name: "Empowered Verse",
    description: "Buff cards also grant empower.",
    appliesTo: ["buff"],
    secondaryEffects: [{ target: "target", effectKey: "empower", amount: 3 }],
  },
  {
    id: "wildline",
    name: "Wildline",
    description: "Gain strong power and cooldown reduction, but lose accuracy.",
    appliesTo: ["damage", "curse"],
    powerDelta: 10,
    cooldownDelta: -0.45,
    accuracyDelta: -9,
  },
  {
    id: "reliable-copy",
    name: "Reliable Copy",
    description: "Gain accuracy and reduce cooldown.",
    appliesTo: ["any"],
    accuracyDelta: 5,
    cooldownDelta: -0.5,
  },
  {
    id: "venom-birthmark",
    name: "Venom Birthmark",
    description: "A poison-aligned trait wakes up. This card applies stronger poison on hit.",
    appliesTo: ["damage", "curse"],
    awakeningTags: ["venom"],
    secondaryEffects: [{ target: "target", effectKey: "poison", amount: 4 }],
    effectPotencyBonus: 1,
  },
  {
    id: "kindled-edge",
    name: "Kindled Edge",
    description: "A fire-aligned trait wakes up. This card burns harder and crits more often.",
    appliesTo: ["damage", "curse"],
    awakeningTags: ["flame"],
    secondaryEffects: [{ target: "target", effectKey: "burn", amount: 3 }],
    critChanceBonus: 5,
  },
  {
    id: "blood-script-repeat",
    name: "Blood Script Repeat",
    description: "A blood or bleed trait wakes up. This card fires twice and adds bleed.",
    appliesTo: ["damage", "curse"],
    awakeningTags: ["bleed", "blood"],
    repeatCount: 2,
    powerMultiplier: 0.78,
    secondaryEffects: [{ target: "target", effectKey: "bleed", amount: 2 }],
    cooldownDelta: 0.35,
  },
  {
    id: "frost-rim",
    name: "Frost Rim",
    description: "A frost-aligned trait wakes up. This card slows the target and may freeze it.",
    appliesTo: ["damage", "curse"],
    awakeningTags: ["frost"],
    accuracyDelta: 4,
    secondaryEffects: [
      { target: "target", effectKey: "slow", amount: 2 },
      { target: "target", effectKey: "freeze", amount: 1 },
    ],
  },
  {
    id: "storm-fork",
    name: "Storm Fork",
    description: "A storm trait wakes up. This card splits across valid targets with lower power.",
    appliesTo: ["damage", "curse"],
    awakeningTags: ["storm"],
    multiTarget: true,
    powerMultiplier: 0.66,
    accuracyDelta: 3,
    secondaryEffects: [{ target: "target", effectKey: "paralyze", amount: 1 }],
    cooldownDelta: 0.55,
  },
  {
    id: "grave-claim",
    name: "Grave Claim",
    description: "A doom trait wakes up. This card gains power and leaves doom behind.",
    appliesTo: ["damage", "curse"],
    awakeningTags: ["doom"],
    powerDelta: 7,
    secondaryEffects: [{ target: "target", effectKey: "doom", amount: 2 }],
  },
  {
    id: "shield-memory",
    name: "Shield Memory",
    description: "An armor or shield trait wakes up. Playing this card grants shield to the target.",
    appliesTo: ["buff"],
    awakeningTags: ["armor", "ward"],
    cooldownDelta: -0.25,
    secondaryEffects: [{ target: "target", effectKey: "shield", amount: 7 }],
  },
  {
    id: "guarded-counterstroke",
    name: "Guarded Counterstroke",
    description: "An armor trait wakes up. Damage cards give your champion shield after hitting.",
    appliesTo: ["damage", "curse"],
    awakeningTags: ["armor"],
    secondaryEffects: [{ target: "self", effectKey: "shield", amount: 5 }],
  },
  {
    id: "weapon-remembers",
    name: "Weapon Remembers",
    description: "A weapon trait wakes up. This card gains raw power and card crit chance.",
    appliesTo: ["damage", "curse"],
    awakeningTags: ["weapon"],
    powerDelta: 10,
    critChanceBonus: 4,
  },
  {
    id: "perfect-haft",
    name: "Perfect Haft",
    description: "A weapon trait wakes up. This card becomes faster and more accurate.",
    appliesTo: ["damage", "curse"],
    awakeningTags: ["weapon"],
    accuracyDelta: 8,
    cooldownDelta: -0.45,
  },
  {
    id: "runic-overcast",
    name: "Runic Overcast",
    description: "A magic trait wakes up. This card hits all valid targets with a weaker spell copy.",
    appliesTo: ["damage", "curse"],
    awakeningTags: ["magic"],
    multiTarget: true,
    powerMultiplier: 0.7,
    effectPotencyMultiplier: 0.75,
    cooldownDelta: 0.45,
  },
  {
    id: "focus-threaded-cast",
    name: "Focus-Threaded Cast",
    description: "A magic or precision trait wakes up. This card gives focus after it resolves.",
    appliesTo: ["damage", "curse", "buff"],
    awakeningTags: ["magic", "precision"],
    critChanceBonus: 4,
    secondaryEffects: [{ target: "self", effectKey: "focus", amount: 3 }],
  },
  {
    id: "hunter-line",
    name: "Hunter Line",
    description: "A ranged or precision trait wakes up. This card gains accuracy and critical pressure.",
    appliesTo: ["damage", "curse"],
    awakeningTags: ["ranged", "precision"],
    accuracyDelta: 10,
    critChanceBonus: 5,
  },
  {
    id: "fleet-hand",
    name: "Fleet Hand",
    description: "A speed trait wakes up. This card recovers much faster.",
    appliesTo: ["any"],
    awakeningTags: ["speed"],
    cooldownDelta: -0.9,
    accuracyDelta: 3,
  },
  {
    id: "saints-margin",
    name: "Saint's Margin",
    description: "A holy or cleanse trait wakes up. Buff cards add bless and cleanse protection.",
    appliesTo: ["buff"],
    awakeningTags: ["holy", "ward"],
    secondaryEffects: [
      { target: "target", effectKey: "bless", amount: 3 },
      { target: "target", effectKey: "cleanse", amount: 3 },
    ],
  },
];

function cardUpgradeApplies(upgrade, move) {
  const moveClass = getMoveClass(move);
  const tags = upgrade.appliesTo || ["any"];
  if (tags.includes("any")) return true;
  if (tags.includes(moveClass)) return true;
  if (tags.includes("hasEffect")) {
    const effect = getMoveEffect(move);
    return Boolean(effect && effect !== "none");
  }
  if (tags.includes("negativeEffect")) return hasNegativeEffect(move);
  if (tags.includes("positiveEffect")) return hasPositiveEffect(move);
  return false;
}

function getMoveUpgradeMeta(move = {}) {
  return move.depthsCardUpgradeMeta || {};
}

function getMoveUpgradeLabels(move = {}) {
  return getMoveUpgradeMeta(move).labels || [];
}

function mergeSecondaryEffects(base = [], incoming = []) {
  return [...(base || []), ...(incoming || []).map((entry) => ({ ...entry }))];
}

function applyUpgradeToMove(move = {}, upgrade = {}) {
  const next = JSON.parse(JSON.stringify(move || {}));
  const existingMeta = getMoveUpgradeMeta(next);
  const originalPower = finiteNumber(
    existingMeta.powerBaseBeforeUpgrades ??
      next.powerBaseBeforeUpgrades ??
      next.basePower ??
      next.power,
    0
  );
  const originalAccuracy = finiteNumber(
    existingMeta.accuracyBaseBeforeUpgrades ??
      next.accuracyBaseBeforeUpgrades ??
      next.baseAccuracyBeforeUpgrades ??
      next.accuracy,
    75
  );
  const meta = {
    ...existingMeta,
    labels: [...getMoveUpgradeLabels(next), upgrade.name],
    powerBaseBeforeUpgrades: originalPower,
    powerUpgradeSteps: [...(existingMeta.powerUpgradeSteps || [])],
    accuracyBaseBeforeUpgrades: originalAccuracy,
    accuracyUpgradeSteps: [...(existingMeta.accuracyUpgradeSteps || [])],
  };

  if (upgrade.powerMultiplier) {
    const beforePower = finiteNumber(next.power ?? next.basePower, 0);
    const afterPower = roundToTenth(beforePower * upgrade.powerMultiplier);
    next.power = afterPower;
    meta.powerUpgradeSteps.push({
      name: upgrade.name,
      type: "multiplier",
      multiplier: upgrade.powerMultiplier,
      before: beforePower,
      after: afterPower,
      delta: roundToTenth(afterPower - beforePower),
    });
  }
  if (upgrade.powerDelta) {
    const beforePower = finiteNumber(next.power ?? next.basePower, 0);
    const afterPower = roundToTenth(beforePower + upgrade.powerDelta);
    next.power = afterPower;
    meta.powerUpgradeSteps.push({
      name: upgrade.name,
      type: "delta",
      before: beforePower,
      after: afterPower,
      delta: roundToTenth(afterPower - beforePower),
    });
  }
  if (upgrade.accuracyDelta) {
    const beforeAccuracy = finiteNumber(next.accuracy, 75);
    const afterAccuracy = clamp(roundToTenth(beforeAccuracy + upgrade.accuracyDelta), 5, 100);
    next.accuracy = afterAccuracy;
    meta.accuracyUpgradeSteps.push({
      name: upgrade.name,
      type: "delta",
      before: beforeAccuracy,
      after: afterAccuracy,
      delta: roundToTenth(afterAccuracy - beforeAccuracy),
    });
  }
  if (upgrade.cooldownDelta) {
    const cooldown = getMoveCooldown(next) + upgrade.cooldownDelta;
    next.cooldown_seconds = Math.max(0.4, roundToTenth(cooldown));
    next.cooldown = next.cooldown_seconds;
  }
  if (upgrade.effectPotencyBonus) {
    meta.effectPotencyBonus =
      finiteNumber(meta.effectPotencyBonus, 0) + finiteNumber(upgrade.effectPotencyBonus, 0);
  }
  if (upgrade.effectPotencyMultiplier) {
    meta.effectPotencyMultiplier =
      finiteNumber(meta.effectPotencyMultiplier, 1) * finiteNumber(upgrade.effectPotencyMultiplier, 1);
  }
  if (upgrade.repeatCount) {
    meta.repeatCount = Math.max(finiteNumber(meta.repeatCount, 1), finiteNumber(upgrade.repeatCount, 1));
  }
  if (upgrade.multiTarget) meta.multiTarget = true;
  if (upgrade.critChanceBonus) {
    meta.critChanceBonus =
      finiteNumber(meta.critChanceBonus, 0) + finiteNumber(upgrade.critChanceBonus, 0);
  }
  if (upgrade.secondaryEffects?.length) {
    meta.secondaryEffects = mergeSecondaryEffects(meta.secondaryEffects, upgrade.secondaryEffects);
  }

  next.depthsCardUpgradeMeta = meta;
  return next;
}

export function getDepthsCardUpgradeMoveKey(move = {}, index = 0) {
  return move.id || `${index}-${getMoveDisplayName(move, index)}`;
}

export function getDepthsCardUpgradeFamilyKey(move = {}, index = 0) {
  if (move.depthsCardId) return `depths:${move.depthsCardId}`;
  return `champion:${getDepthsCardUpgradeMoveKey(move, index)}`;
}

export function pickDepthsCardUpgradeChoices(move = {}, existingUpgrades = [], count = 2, traitSource = null) {
  const traitProfile = buildDepthsTraitAwakeningProfile(traitSource || {});
  const moveIndex = finiteNumber(move.__moveIndex, 0);
  const moveKey = getDepthsCardUpgradeMoveKey(move, moveIndex);
  const moveFamilyKey = getDepthsCardUpgradeFamilyKey(move, moveIndex);
  const alreadyAppliedIds = new Set(
    (existingUpgrades || [])
      .filter((entry) => (entry.moveFamilyKey ? entry.moveFamilyKey === moveFamilyKey : entry.moveKey === moveKey))
      .map((entry) => entry.upgradeId)
  );
  const pool = CARD_UPGRADE_DEFINITIONS.filter(
    (upgrade) =>
      cardUpgradeApplies(upgrade, move) &&
      !alreadyAppliedIds.has(upgrade.id) &&
      isDepthsTraitRewardUnlocked(upgrade, traitProfile)
  );
  const choices = pool.length
    ? pool
    : CARD_UPGRADE_DEFINITIONS.filter(
        (upgrade) => cardUpgradeApplies(upgrade, move) && isDepthsTraitRewardUnlocked(upgrade, traitProfile)
      );
  const weighted = pickWeightedDepthsRewards(choices, count, traitProfile);
  const fallback = weighted.length >= count ? weighted : shuffleRows(choices).slice(0, count);

  return fallback.map((upgrade) => ({
    ...upgrade,
    traitAwakening: getTraitAwakeningLabel(upgrade, traitProfile),
  }));
}

export function summarizeDepthsCardUpgrade(upgrade, move = {}, moveIndex = 0, roomNumber = 1) {
  return {
    id: `${upgrade.id}-${moveIndex}-${Date.now()}`,
    upgradeId: upgrade.id,
    name: upgrade.name,
    description: upgrade.description,
    room: roomNumber,
    moveIndex,
    moveKey: getDepthsCardUpgradeMoveKey(move, moveIndex),
    moveFamilyKey: getDepthsCardUpgradeFamilyKey(move, moveIndex),
    moveName: getMoveDisplayName(move, moveIndex),
    appliesTo: upgrade.appliesTo || ["any"],
    powerDelta: upgrade.powerDelta || 0,
    powerMultiplier: upgrade.powerMultiplier || null,
    accuracyDelta: upgrade.accuracyDelta || 0,
    cooldownDelta: upgrade.cooldownDelta || 0,
    effectPotencyBonus: upgrade.effectPotencyBonus || 0,
    effectPotencyMultiplier: upgrade.effectPotencyMultiplier || null,
    repeatCount: upgrade.repeatCount || null,
    multiTarget: Boolean(upgrade.multiTarget),
    critChanceBonus: upgrade.critChanceBonus || 0,
    secondaryEffects: upgrade.secondaryEffects || [],
    awakeningTags: upgrade.awakeningTags || [],
    rewardTags: upgrade.rewardTags || [],
    traitAwakening: upgrade.traitAwakening || "",
  };
}

export function applyDepthsCardUpgradesToCharObj(charObj = {}, upgrades = []) {
  const next = JSON.parse(JSON.stringify(charObj || {}));
  const moves = Array.isArray(next.moves) ? next.moves : [];
  const runCards = Array.isArray(next.depthsRunCards) ? next.depthsRunCards : [];
  const runCardMoves = runCards.map((card) => card?.move || card || {});
  const allMoves = [...moves, ...runCardMoves];

  (upgrades || []).forEach((upgrade) => {
    const moveIndex = finiteNumber(upgrade.moveIndex, -1);
    const selectedMove = moveIndex >= 0 && moveIndex < allMoves.length ? allMoves[moveIndex] : null;
    const targetFamilyKey =
      upgrade.moveFamilyKey ||
      (selectedMove ? getDepthsCardUpgradeFamilyKey(selectedMove, moveIndex) : upgrade.moveKey || "");
    const targetIndexes = allMoves
      .map((move, index) => ({ move, index }))
      .filter(({ move, index }) => {
        if (!targetFamilyKey) return index === moveIndex;
        return getDepthsCardUpgradeFamilyKey(move, index) === targetFamilyKey;
      })
      .map(({ index }) => index);

    if (!targetIndexes.length && (moveIndex < 0 || moveIndex >= allMoves.length)) return;
    const definition =
      CARD_UPGRADE_DEFINITIONS.find((entry) => entry.id === upgrade.upgradeId) || upgrade;

    (targetIndexes.length ? targetIndexes : [moveIndex]).forEach((targetIndex) => {
      if (targetIndex < 0 || targetIndex >= allMoves.length) return;

      const upgradedMove = applyUpgradeToMove(allMoves[targetIndex], {
        ...definition,
        ...upgrade,
        name: upgrade.name || definition.name,
        description: upgrade.description || definition.description,
      });
      allMoves[targetIndex] = upgradedMove;

      if (targetIndex < moves.length) {
        moves[targetIndex] = upgradedMove;
      } else {
        const cardIndex = targetIndex - moves.length;
        runCards[cardIndex] = {
          ...(runCards[cardIndex] || {}),
          move: upgradedMove,
        };
      }
    });
  });

  next.moves = moves;
  next.depthsRunCards = runCards;
  next.depthsCardUpgrades = upgrades || [];
  return next;
}

export function formatCardUpgradeAdditions(upgrade = {}) {
  const rows = [];
  if (upgrade.powerDelta) rows.push(`${upgrade.powerDelta > 0 ? "+" : ""}${upgrade.powerDelta} power`);
  if (upgrade.powerMultiplier) rows.push(`${Math.round(upgrade.powerMultiplier * 100)}% power`);
  if (upgrade.accuracyDelta) rows.push(`${upgrade.accuracyDelta > 0 ? "+" : ""}${upgrade.accuracyDelta} accuracy`);
  if (upgrade.cooldownDelta) rows.push(`${upgrade.cooldownDelta > 0 ? "+" : ""}${upgrade.cooldownDelta}s cooldown`);
  if (upgrade.effectPotencyBonus) rows.push(`${upgrade.effectPotencyBonus > 0 ? "+" : ""}${upgrade.effectPotencyBonus} effect stacks`);
  if (upgrade.effectPotencyMultiplier) rows.push(`${Math.round(upgrade.effectPotencyMultiplier * 100)}% effect stacks`);
  if (upgrade.repeatCount) rows.push(`fires ${upgrade.repeatCount} times`);
  if (upgrade.multiTarget) rows.push("targets all valid enemies/allies");
  if (upgrade.critChanceBonus) rows.push(`+${upgrade.critChanceBonus}% card crit chance`);
  (upgrade.secondaryEffects || []).forEach((effect) => {
    rows.push(`${effect.target === "self" ? "self gains" : "also applies"} ${effect.amount} ${effect.effectKey}`);
  });
  return rows;
}

export { CARD_UPGRADE_DEFINITIONS };
