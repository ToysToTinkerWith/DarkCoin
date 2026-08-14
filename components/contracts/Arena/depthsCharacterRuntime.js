import algosdk from "algosdk";
import { doc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { db, storage } from "../../../Firebase/FirebaseInit";
import {
  getSkillPointStatAdjustments,
  normalizePointsArray,
} from "./Trees";
import { CHAMPION_TRAITS } from "./traitsData";

const ITEM_VOTE_APP_ID = 3339943603;
const DEFAULT_DRAGONSHORDE_APP_ID = 1870514811;
const EFFECT_STRIDE = 2000;
const ITEM_POTENCY_DAO_SUFFIX = 1037;
const DEFAULT_CRIT_CHANCE = 25;
const DEFAULT_CRIT_DAMAGE = 200;

async function fetchBackgroundImageUrl(backgroundTraitName) {
  if (!backgroundTraitName || backgroundTraitName === "None") return "";

  const filename = `${String(backgroundTraitName).replace(/\s*Background$/i, "").trim()}.png`;

  try {
    return await getDownloadURL(ref(storage, `warriors/Background/${filename}`));
  } catch (error) {
    console.error("Failed to fetch depths champion background:", backgroundTraitName, error);
    return "";
  }
}

const EFFECT_KEY_ALIASES = {
  Poison: "poison",
  Bleed: "bleed",
  Burn: "burn",
  Freeze: "freeze",
  Slow: "slow",
  Drown: "drown",
  Paralyze: "paralyze",
  Doom: "doom",
  Shield: "shield",
  Strengthen: "strengthen",
  Focus: "focus",
  Empower: "empower",
  Nurture: "nurture",
  Bless: "bless",
  Hasten: "hasten",
  Cleanse: "cleanse",
};

const STAT_KEY_ALIASES = {
  Health: "health",
  Speed: "speed",
  Resist: "resist",
  Strength: "strength",
  Dexterity: "dexterity",
  Intelligence: "intelligence",
  Accuracy: "accuracy",
  "Crit Chance": "critChance",
  "Crit chance": "critChance",
  "crit chance": "critChance",
  "Crit Damage": "critDamage",
  "Crit damage": "critDamage",
  "crit damage": "critDamage",
};

const effectKeys = [
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

const statKeys = [
  "health",
  "speed",
  "resist",
  "strength",
  "dexterity",
  "intelligence",
  "accuracy",
  "critChance",
  "critDamage",
];

const effectSkillBytes = {
  poison: 0,
  bleed: 100,
  burn: 200,
  freeze: 300,
  slow: 400,
  drown: 500,
  paralyze: 600,
  doom: 700,
  shield: 800,
  strengthen: 900,
  focus: 1000,
  empower: 1100,
  nurture: 1200,
  bless: 1300,
  hasten: 1400,
  cleanse: 1500,
};

const TRAIT_LOOKUP_BY_NAME = Object.values(CHAMPION_TRAITS)
  .flat()
  .reduce((acc, traitDef) => {
    if (traitDef?.trait) {
      acc[traitDef.trait] = traitDef;
      acc[String(traitDef.trait).toLowerCase()] = traitDef;
    }
    return acc;
  }, {});

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function encodeUtf8(value) {
  return new TextEncoder().encode(String(value));
}

function bytesToUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return Uint8Array.from(value);
  if (typeof value === "string" && typeof atob === "function") {
    const binary = atob(value);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  }
  return new Uint8Array();
}

function getDaoVoteForEffect(boxBytes, effectIndex, daoSuffix) {
  if (!(boxBytes instanceof Uint8Array)) return null;
  if (!Number.isInteger(effectIndex) || effectIndex < 0) return null;
  if (!Number.isInteger(daoSuffix) || daoSuffix < 0) return null;
  if (daoSuffix >= EFFECT_STRIDE) return null;

  const offset = effectIndex * EFFECT_STRIDE + daoSuffix;
  if (offset < 0 || offset >= boxBytes.length) return null;

  const value = boxBytes[offset];
  return value > 0 && value <= 20 ? value : null;
}

function computeEffectPotenciesFromDaoVote(boxBytes, effectCount, daoSuffix = ITEM_POTENCY_DAO_SUFFIX) {
  return Array.from({ length: effectCount }, (_unused, effectIndex) =>
    getDaoVoteForEffect(boxBytes, effectIndex, daoSuffix)
  );
}

async function readTraitEffectPotencies(client, traitName, effectCount) {
  if (!traitName || !effectCount) return [];

  try {
    const res = await client
      .getApplicationBoxByName(ITEM_VOTE_APP_ID, encodeUtf8(traitName))
      .do();

    return computeEffectPotenciesFromDaoVote(bytesToUint8Array(res?.value), effectCount);
  } catch (error) {
    console.error("Failed to read depths item voting box:", traitName, error);
    return Array(effectCount).fill(null);
  }
}

function getTraitDefinition(traitName, traitType) {
  if (!traitName || traitName === "None") return null;

  const exactByType = CHAMPION_TRAITS?.[traitType]?.find(
    (traitDef) => traitDef.trait === traitName
  );
  if (exactByType) return exactByType;

  const lowered = String(traitName).toLowerCase();
  const looseByType = CHAMPION_TRAITS?.[traitType]?.find(
    (traitDef) => String(traitDef.trait).toLowerCase() === lowered
  );
  if (looseByType) return looseByType;

  return TRAIT_LOOKUP_BY_NAME[traitName] || TRAIT_LOOKUP_BY_NAME[lowered] || null;
}

function cloneEmptyGainedEffects() {
  return {
    stats: {
      health: 0,
      speed: 0,
      resist: 0,
      strength: 0,
      dexterity: 0,
      intelligence: 0,
      accuracy: 0,
      critChance: 0,
      critDamage: 0,
    },
    effects: {
      poison: 0,
      bleed: 0,
      burn: 0,
      freeze: 0,
      slow: 0,
      drown: 0,
      paralyze: 0,
      doom: 0,
      shield: 0,
      strengthen: 0,
      focus: 0,
      empower: 0,
      nurture: 0,
      bless: 0,
      hasten: 0,
      cleanse: 0,
    },
    moveAccuracy: {
      melee: 0,
      ranged: 0,
      magic: 0,
      curse: 0,
      all: 0,
    },
    moveAccuracyBreakdowns: [],
    battleOnly: [],
  };
}

function normalizeTraitEffectText(value) {
  return String(value || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .trim();
}

function getEffectKeyFromName(name) {
  const cleaned = normalizeTraitEffectText(name);
  if (!cleaned) return null;
  if (EFFECT_KEY_ALIASES[cleaned]) return EFFECT_KEY_ALIASES[cleaned];

  const lowered = cleaned.toLowerCase();
  const found = Object.entries(EFFECT_KEY_ALIASES).find(
    ([label]) => label.toLowerCase() === lowered
  );

  return found?.[1] || lowered;
}

function pushBattleOnly(target, entry) {
  target.battleOnly.push(entry);
}

function applyTraitTextToGainedEffects(target, effectText, amount, sourceName) {
  const text = normalizeTraitEffectText(effectText);
  if (!text || !amount) return;

  let match = text.match(/^Increases (.+)$/i);
  if (match) {
    const name = match[1].trim();

    if (STAT_KEY_ALIASES[name]) {
      target.stats[STAT_KEY_ALIASES[name]] += amount;
      return;
    }
    if (EFFECT_KEY_ALIASES[name]) {
      target.effects[EFFECT_KEY_ALIASES[name]] += amount;
      return;
    }

    match = name.match(/^accuracy of (melee|ranged|magic|curse) type moves$/i);
    if (match) {
      const moveAccuracyType = match[1].toLowerCase();
      target.moveAccuracy[moveAccuracyType] += amount;
      target.moveAccuracyBreakdowns.push({
        type: moveAccuracyType,
        sourceName,
        label: text,
        amount,
      });
      return;
    }
  }

  match = text.match(/^Decreases (.+)$/i);
  if (match) {
    const name = match[1].trim();

    if (STAT_KEY_ALIASES[name]) {
      target.stats[STAT_KEY_ALIASES[name]] -= amount;
      return;
    }
    if (EFFECT_KEY_ALIASES[name]) {
      target.effects[EFFECT_KEY_ALIASES[name]] -= amount;
      return;
    }

    match = name.match(/^accuracy of (melee|ranged|magic|curse) type moves$/i);
    if (match) {
      const moveAccuracyType = match[1].toLowerCase();
      target.moveAccuracy[moveAccuracyType] -= amount;
      target.moveAccuracyBreakdowns.push({
        type: moveAccuracyType,
        sourceName,
        label: text,
        amount: -amount,
      });
      return;
    }
  }

  match = text.match(/^Resistance to (.+)$/i);
  if (match) {
    pushBattleOnly(target, {
      type: "resistance",
      label: text,
      sourceName,
      resistedEffect: getEffectKeyFromName(match[1]),
      amount,
    });
    return;
  }

  match = text.match(/^Gain (.+) at (?:the )?start of (?:the )?battle$/i);
  if (match) {
    pushBattleOnly(target, {
      type: "gain_start_of_battle",
      label: text,
      sourceName,
      effectKey: getEffectKeyFromName(match[1]),
      amount,
    });
    return;
  }

  match = text.match(/^Apply (.+) at (?:the )?start of (?:the )?battle$/i);
  if (match) {
    pushBattleOnly(target, {
      type: "apply_start_of_battle",
      label: text,
      sourceName,
      effectKey: getEffectKeyFromName(match[1]),
      amount,
    });
    return;
  }

  match = text.match(/^Gain (.+) (?:on|every) (melee|ranged|magic) hit$/i);
  if (match) {
    pushBattleOnly(target, {
      type: "gain_on_hit",
      label: text,
      sourceName,
      attackType: match[2].toLowerCase(),
      effectKey: getEffectKeyFromName(match[1]),
      amount,
    });
    return;
  }

  match = text.match(/^Apply (.+) (?:on|every) (melee|ranged|magic) hit$/i);
  if (match) {
    pushBattleOnly(target, {
      type: "apply_on_hit",
      label: text,
      sourceName,
      attackType: match[2].toLowerCase(),
      effectKey: getEffectKeyFromName(match[1]),
      amount,
    });
    return;
  }

  match = text.match(/^Heal for (?:the )?amount of (.+?) stacks applied$/i);
  if (match) {
    const sourceEffectKey = getEffectKeyFromName(match[1]);
    pushBattleOnly(target, {
      type: "heal_for_applied_stacks",
      label: text,
      sourceName,
      sourceEffectKey,
      effectKey: sourceEffectKey,
      amount,
    });
    return;
  }

  match = text.match(/^Heal when (.+?) stacks are applied$/i);
  if (match) {
    const sourceEffectKey = getEffectKeyFromName(match[1]);
    pushBattleOnly(target, {
      type: "heal_when_stacks_applied",
      label: text,
      sourceName,
      sourceEffectKey,
      effectKey: sourceEffectKey,
      amount,
    });
    return;
  }

  pushBattleOnly(target, {
    type: "other",
    label: text,
    sourceName,
    amount,
  });
}

async function buildEquippedTraitsFromMeta(client, metaDoc) {
  const properties = metaDoc?.properties || {};
  const slotDefs = [
    { type: "Background", name: properties.Background },
    { type: "Skin", name: properties.Skin },
    { type: "Weapon", name: properties.Weapon },
    { type: "Magic", name: properties.Magic },
    { type: "Head", name: properties.Head },
    { type: "Armour", name: properties.Armour },
    { type: "Extra", name: properties.Extra },
  ];

  const built = await Promise.all(
    slotDefs.map(async ({ type, name }) => {
      if (!name || name === "None") return null;

      const traitDef = getTraitDefinition(name, type);
      const effects = Array.isArray(traitDef?.effects) ? traitDef.effects : [];
      const effectPotencies = await readTraitEffectPotencies(client, name, effects.length);

      return {
        type,
        name,
        assetId: traitDef?.assetId || null,
        total: traitDef?.total || traitDef?.champions || null,
        effects,
        effectPotencies,
      };
    })
  );

  return built.filter(Boolean);
}

function buildGainedEffectsFromEquippedTraits(traits) {
  const result = cloneEmptyGainedEffects();

  (Array.isArray(traits) ? traits : []).forEach((trait) => {
    if (!trait || !Array.isArray(trait.effects)) return;

    trait.effects.forEach((effectText, effectIndex) => {
      const amount = Number(trait.effectPotencies?.[effectIndex] || 0);
      if (!amount) return;
      applyTraitTextToGainedEffects(result, effectText, amount, trait.name);
    });
  });

  return result;
}

function getCharacterPercentStat(charObj, key, fallbackValue) {
  const raw = charObj?.[key];
  const value = Number(raw);
  return raw === undefined || raw === null || raw === "" || !Number.isFinite(value)
    ? fallbackValue
    : value;
}

function mergeGainedEffectsIntoCharacter(baseChar, gainedEffects) {
  if (!baseChar) return baseChar;

  const merged = {
    ...baseChar,
    critChance: getCharacterPercentStat(baseChar, "critChance", DEFAULT_CRIT_CHANCE),
    critDamage: getCharacterPercentStat(baseChar, "critDamage", DEFAULT_CRIT_DAMAGE),
    gainedEffectsMeta: gainedEffects || cloneEmptyGainedEffects(),
    traitStatBonuses: {},
    effects: {
      ...(baseChar.effects || {}),
    },
  };

  statKeys.forEach((key) => {
    merged.traitStatBonuses[key] = safeNumber(gainedEffects?.stats?.[key], 0);
  });

  effectKeys.forEach((key) => {
    const add = safeNumber(gainedEffects?.effects?.[key], 0);
    if (add) merged[key] = safeNumber(merged[key], 0) + add;
  });

  return merged;
}

function getSkillEffectBonuses(points) {
  return Object.entries(effectSkillBytes).reduce((acc, [effectKey, byte]) => {
    const value = safeNumber(points?.[byte], 0);
    if (value) acc[effectKey] = value;
    return acc;
  }, {});
}

function mergeSkillPointBonusesIntoCharacter(baseChar, points) {
  if (!baseChar) return baseChar;

  const skillStatBonuses = getSkillPointStatAdjustments(points);
  const skillEffectBonuses = getSkillEffectBonuses(points);
  const merged = {
    ...baseChar,
    skillStatBonuses,
    skillEffectBonuses,
  };

  Object.entries(skillEffectBonuses).forEach(([effectKey, amount]) => {
    merged[effectKey] = safeNumber(merged[effectKey], 0) + safeNumber(amount, 0);
  });

  return merged;
}

async function readChampionPoints(client, assetId, dragonshordeAppId) {
  try {
    const assetBox = algosdk.encodeUint64(Number(assetId));
    const accountBoxPoints = await client
      .getApplicationBoxByName(
        dragonshordeAppId || DEFAULT_DRAGONSHORDE_APP_ID,
        new Uint8Array([...assetBox, ...encodeUtf8("points")])
      )
      .do();

    return normalizePointsArray(accountBoxPoints.value);
  } catch {
    return normalizePointsArray(null);
  }
}

function decodeUintBoxValue(value) {
  const bytes = bytesToUint8Array(value);
  let total = 0n;

  bytes.forEach((byte) => {
    total = (total << 8n) + BigInt(byte || 0);
  });

  return total > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(total);
}

async function readChampionXp(client, assetId, dragonshordeAppId) {
  try {
    const assetBox = algosdk.encodeUint64(Number(assetId));
    const accountBoxXp = await client
      .getApplicationBoxByName(
        dragonshordeAppId || DEFAULT_DRAGONSHORDE_APP_ID,
        new Uint8Array([...assetBox, ...encodeUtf8("xp")])
      )
      .do();

    return decodeUintBoxValue(accountBoxXp.value);
  } catch {
    return 0;
  }
}

function getRuntimeStatBonuses(charObj) {
  const bonuses = {
    health: 0,
    speed: 0,
    resist: 0,
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    accuracy: 0,
    critChance: 0,
    critDamage: 0,
  };

  [charObj?.traitStatBonuses, charObj?.skillStatBonuses, charObj?.statBonuses].forEach((source) => {
    if (!source) return;
    statKeys.forEach((key) => {
      bonuses[key] += safeNumber(source[key], 0);
    });
  });

  return bonuses;
}

function getBaseCoreStatValue(charObj, statKey) {
  const rawBase = charObj?.baseStats?.[statKey];
  if (rawBase !== null && typeof rawBase !== "undefined") return safeNumber(rawBase, 0);

  if (statKey === "health") return safeNumber(charObj?.baseHealth ?? 200, safeNumber(charObj?.health, 200));
  if (statKey === "speed") return safeNumber(charObj?.baseSpeed ?? 50, safeNumber(charObj?.speed, 50));
  if (statKey === "resist") return safeNumber(charObj?.baseResist ?? 10, safeNumber(charObj?.resist, 10));

  return safeNumber(charObj?.[statKey], 0);
}

export function getDepthsDisplayStats(charObj) {
  const bonuses = getRuntimeStatBonuses(charObj);
  const strength = safeNumber(charObj?.strength, 0) + bonuses.strength;
  const dexterity = safeNumber(charObj?.dexterity, 0) + bonuses.dexterity;
  const intelligence = safeNumber(charObj?.intelligence, 0) + bonuses.intelligence;

  return {
    strength,
    dexterity,
    intelligence,
    health: getBaseCoreStatValue(charObj, "health") + bonuses.health + strength * 2,
    speed: getBaseCoreStatValue(charObj, "speed") + bonuses.speed + dexterity,
    resist: getBaseCoreStatValue(charObj, "resist") + bonuses.resist + intelligence,
    accuracy: safeNumber(charObj?.accuracy, 0) + bonuses.accuracy,
    critChance:
      getCharacterPercentStat(charObj, "critChance", DEFAULT_CRIT_CHANCE) + bonuses.critChance,
    critDamage:
      getCharacterPercentStat(charObj, "critDamage", DEFAULT_CRIT_DAMAGE) + bonuses.critDamage,
  };
}

export async function loadDepthsChampionRuntime({ assetId, baseCharObj, contracts }) {
  const client = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443);
  const metaRef = doc(db, "chars", `${assetId}meta`);
  const metaSnap = await getDoc(metaRef);

  let equippedMeta = null;
  let equippedTraits = [];
  let gainedEffects = cloneEmptyGainedEffects();
  let backgroundImageUrl = "";

  if (metaSnap.exists()) {
    equippedMeta = metaSnap.data() || null;
    equippedTraits = await buildEquippedTraitsFromMeta(client, equippedMeta);
    gainedEffects = buildGainedEffectsFromEquippedTraits(equippedTraits);
    backgroundImageUrl = await fetchBackgroundImageUrl(equippedMeta?.properties?.Background || "");
  }

  const [points, xp] = await Promise.all([
    readChampionPoints(client, assetId, contracts?.dragonshorde),
    readChampionXp(client, assetId, contracts?.dragonshorde),
  ]);
  const withTraits = mergeGainedEffectsIntoCharacter(baseCharObj, gainedEffects);
  const charObj = {
    ...mergeSkillPointBonusesIntoCharacter(withTraits, points),
    backgroundImageUrl,
    xp,
  };

  return {
    charObj,
    equippedMeta,
    equippedTraits,
    gainedEffects,
    backgroundImageUrl,
    points: Array.from(points),
    xp,
  };
}
