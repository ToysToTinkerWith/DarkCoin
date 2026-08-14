const EFFECT_TAGS = {
  poison: ["venom"],
  bleed: ["bleed", "blood", "weapon"],
  burn: ["flame"],
  freeze: ["frost", "control"],
  slow: ["control", "speed"],
  drown: ["tide", "control"],
  paralyze: ["storm", "control"],
  doom: ["doom", "curse"],
  shield: ["ward", "armor"],
  strengthen: ["weapon", "strength"],
  focus: ["precision", "crit"],
  empower: ["magic"],
  nurture: ["growth", "holy"],
  bless: ["holy", "ward"],
  hasten: ["speed"],
  cleanse: ["holy", "ward"],
};

const STAT_TAGS = {
  health: ["armor", "ward"],
  resist: ["armor", "ward"],
  strength: ["weapon", "melee", "strength"],
  dexterity: ["ranged", "speed", "precision"],
  intelligence: ["magic"],
  speed: ["speed"],
  accuracy: ["precision"],
  critChance: ["crit", "precision"],
  critDamage: ["crit", "weapon"],
};

const ATTACK_TAGS = {
  melee: ["weapon", "melee"],
  ranged: ["weapon", "ranged", "precision"],
  magic: ["magic"],
  curse: ["curse", "doom", "magic"],
  all: ["precision"],
};

const SLOT_TAGS = {
  weapon: ["weapon"],
  magic: ["magic"],
  armour: ["armor", "ward"],
  armor: ["armor", "ward"],
  head: ["precision", "crit"],
  extra: ["wild"],
  skin: ["wild"],
  background: ["wild"],
};

const TEXT_TAG_RULES = [
  { tag: "venom", pattern: /\b(poison|venom|toxic|toxin|rot|briar|thorn|thorny|viper|serpent)\b/ },
  { tag: "flame", pattern: /\b(fire|flame|burn|ember|ash|cinder|sun|solar|inferno|furnace|scorch)\b/ },
  { tag: "bleed", pattern: /\b(bleed|blood|fang|tooth|teeth|wound|knife|blade)\b/ },
  { tag: "blood", pattern: /\b(blood|vampir|leech|fang|heart)\b/ },
  { tag: "frost", pattern: /\b(frost|ice|freeze|frozen|cold|winter|moon|lunar)\b/ },
  { tag: "tide", pattern: /\b(drown|tide|water|sea|salt|sunken|depth|pearl)\b/ },
  { tag: "storm", pattern: /\b(storm|thunder|lightning|static|volt|crown of borrowed thunder|paralyze)\b/ },
  { tag: "doom", pattern: /\b(doom|grave|void|hollow|death|sepulcher|skull|bone|shadow)\b/ },
  { tag: "ward", pattern: /\b(bless|cleanse|ward|holy|saint|mercy|banner|halo|guard|shield)\b/ },
  { tag: "armor", pattern: /\b(armor|armour|plate|mail|helm|helmet|shield|iron|anvil|ward)\b/ },
  { tag: "weapon", pattern: /\b(weapon|sword|blade|axe|hammer|spear|dagger|knife|bow|arrow|gun|cannon|staff|wand|club|mace|nail|spike)\b/ },
  { tag: "magic", pattern: /\b(magic|arcane|rune|sigil|spell|wizard|witch|mage|mind|star|void|conduit)\b/ },
  { tag: "speed", pattern: /\b(speed|quick|swift|hasten|haste|step|wing|runner|tempo|wolf)\b/ },
  { tag: "crit", pattern: /\b(crit|critical|precision|focus|eye|aim|scope|moonlit|glass|star)\b/ },
  { tag: "ranged", pattern: /\b(ranged|bow|arrow|gun|rifle|crossbow|hunter|hunt|moonspike)\b/ },
  { tag: "melee", pattern: /\b(melee|sword|blade|axe|hammer|spear|dagger|knife|club|mace)\b/ },
  { tag: "growth", pattern: /\b(growth|root|nurture|orchard|bloom|seed|flower|forest)\b/ },
  { tag: "holy", pattern: /\b(holy|bless|cleanse|saint|mercy|grace|light|sunless lyre)\b/ },
  { tag: "control", pattern: /\b(slow|freeze|frost|paralyze|drown|hook|cage|anchor)\b/ },
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function addTag(scores, tag, amount = 1) {
  if (!tag) return;
  scores[tag] = finiteNumber(scores[tag], 0) + Math.max(0.25, finiteNumber(amount, 1));
}

function addTags(scores, tags = [], amount = 1) {
  tags.forEach((tag) => addTag(scores, tag, amount));
}

function normalizeText(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .toLowerCase();
}

function addTextTags(scores, value, amount = 1) {
  const text = normalizeText(value);
  if (!text) return;

  TEXT_TAG_RULES.forEach((rule) => {
    if (rule.pattern.test(text)) addTag(scores, rule.tag, amount);
  });

  Object.entries(EFFECT_TAGS).forEach(([effectKey, tags]) => {
    if (text.includes(effectKey.toLowerCase())) addTags(scores, tags, amount);
  });
}

function addStatTags(scores, statBonuses = {}, amountMultiplier = 0.35) {
  Object.entries(statBonuses || {}).forEach(([key, value]) => {
    const amount = Math.max(0.5, Math.abs(finiteNumber(value, 0)) * amountMultiplier);
    addTags(scores, STAT_TAGS[key] || [], amount);
  });
}

function addMoveAccuracyTags(scores, moveAccuracy = {}, amountMultiplier = 0.35) {
  Object.entries(moveAccuracy || {}).forEach(([key, value]) => {
    const amount = Math.max(0.5, Math.abs(finiteNumber(value, 0)) * amountMultiplier);
    addTags(scores, ATTACK_TAGS[key] || [], amount);
  });
}

function addEffectTags(scores, effectKey, amount = 1) {
  const key = String(effectKey || "").toLowerCase();
  addTags(scores, EFFECT_TAGS[key] || [], amount);
}

function addBattleOnlyTags(scores, battleOnly = [], amount = 1) {
  asArray(battleOnly).forEach((entry) => {
    addEffectTags(scores, entry.effectKey || entry.resistedEffect, amount);
    addTags(scores, ATTACK_TAGS[entry.attackType] || [], amount);
    addTextTags(scores, entry.label || entry.type || "", 0.5);
  });
}

function addArtifactMetaTags(scores, artifactMeta = {}) {
  if (finiteNumber(artifactMeta.damageDealtPct, 0) || finiteNumber(artifactMeta.damageBonusFlat, 0)) {
    addTags(scores, ["weapon"], 1.6);
  }
  if (finiteNumber(artifactMeta.damageTakenPct, 0) < 0) addTags(scores, ["armor", "ward"], 1.6);
  if (finiteNumber(artifactMeta.healingDonePct, 0)) addTags(scores, ["holy", "growth"], 1.4);
  if (finiteNumber(artifactMeta.healOnKillPct, 0)) addTags(scores, ["blood"], 1.4);
  if (artifactMeta.firstBuffNoCooldown) addTags(scores, ["ward", "speed"], 1);
  if (artifactMeta.firstDamageNoCooldown) addTags(scores, ["weapon", "speed"], 1);

  Object.entries(artifactMeta.effectPotencyBonus || {}).forEach(([effectKey, value]) => {
    if (effectKey === "all") addTags(scores, ["wild", "magic"], 1.4);
    else addEffectTags(scores, effectKey, Math.max(0.75, finiteNumber(value, 0)));
  });
}

function addDepthsMetaTags(scores, depthsAbilityMeta = {}) {
  if (finiteNumber(depthsAbilityMeta.lifeStealPct, 0)) addTags(scores, ["blood"], 1.4);
  if (depthsAbilityMeta.lowHpDamage) addTags(scores, ["weapon", "doom"], 1.4);
  if (depthsAbilityMeta.secondWind) addTags(scores, ["ward", "armor", "holy"], 1.4);
}

function addRewardMechanicTags(scores, reward = {}) {
  addTextTags(scores, reward.id, 0.7);
  addTextTags(scores, reward.name, 1);
  addTextTags(scores, reward.school || reward.theme || reward.rarity, 1);
  addTextTags(scores, reward.description, 0.8);
  addTags(scores, reward.rewardTags || [], 1.5);
  addTags(scores, reward.awakeningTags || [], 1.9);
  addStatTags(scores, reward.statBonuses || {});
  addMoveAccuracyTags(scores, reward.moveAccuracy || {});
  addBattleOnlyTags(scores, reward.battleOnly || {});
  addArtifactMetaTags(scores, reward.artifactMeta || {});
  addDepthsMetaTags(scores, reward.depthsAbilityMeta || {});

  if (reward.powerDelta || reward.powerMultiplier) addTags(scores, ["weapon"], 1.2);
  if (reward.accuracyDelta) addTags(scores, ["precision", "crit"], 1);
  if (reward.cooldownDelta && finiteNumber(reward.cooldownDelta, 0) < 0) addTags(scores, ["speed"], 1);
  if (reward.critChanceBonus) addTags(scores, ["crit", "precision"], 1.4);
  if (reward.multiTarget || reward.repeatCount) addTags(scores, ["magic", "weapon"], 0.9);
  if (reward.effectPotencyBonus || reward.effectPotencyMultiplier) {
    addTextTags(scores, reward.description, 1.1);
  }
  asArray(reward.secondaryEffects).forEach((entry) => {
    addEffectTags(scores, entry.effectKey, Math.max(0.75, finiteNumber(entry.amount, 1)));
  });
}

function getRewardBaseWeight(reward = {}) {
  const rarity = String(reward.rarity || "").toLowerCase();
  if (rarity === "common") return 1;
  if (rarity === "uncommon") return 0.22;
  if (rarity === "rare") return 0.05;
  return 1;
}

function getRewardRarityWeightFactor(reward = {}) {
  const rarity = String(reward.rarity || "").toLowerCase();
  if (rarity === "uncommon") return 0.34;
  if (rarity === "rare") return 0.08;
  return 1;
}

function getProfileSource(source) {
  if (Array.isArray(source)) return { equippedTraits: source };
  return source || {};
}

export function buildDepthsTraitAwakeningProfile(source = {}) {
  if (source?.tagScores && source?.tags) return source;

  const normalizedSource = getProfileSource(source);
  const traits = asArray(
    normalizedSource.equippedTraits ||
      normalizedSource.traits ||
      normalizedSource.depthsTraits ||
      normalizedSource.charObj?.equippedTraits
  );
  const tagScores = {};

  traits.forEach((trait) => {
    const type = normalizeText(trait.type);
    const name = trait.name || trait.trait || trait.traitName || "";
    const baseAmount = trait.type === "Weapon" || trait.type === "Magic" || trait.type === "Armour" ? 1.5 : 1;

    addTags(tagScores, SLOT_TAGS[type] || [], baseAmount);
    addTextTags(tagScores, name, baseAmount);

    asArray(trait.effects).forEach((effectText, index) => {
      const potency = Math.max(1, finiteNumber(trait.effectPotencies?.[index], 1));
      addTextTags(tagScores, effectText, 0.75 + potency * 0.12);
    });
  });

  const charObj = normalizedSource.charObj || normalizedSource;
  addStatTags(tagScores, charObj.traitStatBonuses || {}, 0.22);
  addBattleOnlyTags(tagScores, charObj.gainedEffectsMeta?.battleOnly || [], 0.8);
  Object.entries(charObj.gainedEffectsMeta?.effects || {}).forEach(([effectKey, value]) => {
    if (finiteNumber(value, 0)) addEffectTags(tagScores, effectKey, Math.max(0.5, value * 0.2));
  });

  const tags = Object.keys(tagScores).sort((a, b) => tagScores[b] - tagScores[a] || a.localeCompare(b));
  return {
    traits,
    tagScores,
    tags,
    hasTraits: traits.length > 0,
  };
}

export function getDepthsRewardAwakeningTags(reward = {}) {
  const scores = {};
  addRewardMechanicTags(scores, reward);
  return Object.keys(scores).sort((a, b) => scores[b] - scores[a] || a.localeCompare(b));
}

export function isDepthsTraitRewardUnlocked(reward = {}, profileSource = {}) {
  const requiredTags = asArray(reward.awakeningTags);
  if (!requiredTags.length) return true;

  const profile = buildDepthsTraitAwakeningProfile(profileSource);
  return requiredTags.some((tag) => finiteNumber(profile.tagScores?.[tag], 0) > 0);
}

export function getDepthsTraitRewardWeight(reward = {}, profileSource = {}, baseWeight = 1) {
  const profile = buildDepthsTraitAwakeningProfile(profileSource);
  if (!isDepthsTraitRewardUnlocked(reward, profile)) return 0;

  const rewardTags = getDepthsRewardAwakeningTags(reward);
  const matchedScore = rewardTags.reduce(
    (sum, tag) => sum + Math.min(3, finiteNumber(profile.tagScores?.[tag], 0)),
    0
  );
  const unlockBonus = asArray(reward.awakeningTags).some((tag) => profile.tagScores?.[tag])
    ? 2.5
    : 0;

  return Math.max(
    0.02,
    (baseWeight + Math.min(8, matchedScore * 0.85) + unlockBonus) *
      getRewardRarityWeightFactor(reward)
  );
}

function pickWeightedEntry(entries = []) {
  const totalWeight = entries.reduce((sum, entry) => sum + finiteNumber(entry.weight, 0), 0);
  if (totalWeight <= 0) return entries[0] || null;

  let roll = Math.random() * totalWeight;
  for (const entry of entries) {
    roll -= finiteNumber(entry.weight, 0);
    if (roll <= 0) return entry;
  }

  return entries[entries.length - 1] || null;
}

export function pickWeightedDepthsRewards(pool = [], count = 3, profileSource = {}) {
  const profile = buildDepthsTraitAwakeningProfile(profileSource);
  const remaining = asArray(pool)
    .filter((entry) => isDepthsTraitRewardUnlocked(entry, profile))
    .map((entry) => ({
      entry,
      weight: getDepthsTraitRewardWeight(entry, profile, getRewardBaseWeight(entry)),
    }))
    .filter((entry) => entry.weight > 0);
  const picked = [];

  while (picked.length < count && remaining.length) {
    const selected = pickWeightedEntry(remaining);
    if (!selected) break;
    picked.push(selected.entry);
    const index = remaining.indexOf(selected);
    if (index >= 0) remaining.splice(index, 1);
  }

  return picked;
}

export function getTraitAwakeningLabel(reward = {}, profileSource = {}) {
  const profile = buildDepthsTraitAwakeningProfile(profileSource);
  const requiredTags = asArray(reward.awakeningTags);
  const matchedRequired = requiredTags.find((tag) => profile.tagScores?.[tag]);
  if (matchedRequired) return `${matchedRequired} trait awakening`;

  const matchedTag = getDepthsRewardAwakeningTags(reward).find((tag) => profile.tagScores?.[tag]);
  return matchedTag ? `${matchedTag} favored` : "";
}
