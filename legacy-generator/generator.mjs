import OpenAI, { toFile } from "openai";
import "dotenv/config";
import algosdk from "algosdk";
import sharp from "sharp";

import { CID } from "multiformats/cid";
import * as mfsha2 from "multiformats/hashes/sha2";
import * as digest from "multiformats/hashes/digest";

import {db,storage,doc,getDoc,setDoc,getDocs,collection,serverTimestamp,deleteDoc,ref,uploadString,uploadBytes,getDownloadURL,claimJob,completeJob,composeLoadout} from './runtime.mjs';
const openai = new OpenAI({apiKey:process.env.OPENAI_API_KEY});

// ===================== IMAGE CONFIG ===================== //

const IMAGE_MODEL = "gpt-image-2";
const SHEET_COLS = 2;
const SHEET_ROWS = 2;
const SHEET_FRAME_COUNT = SHEET_COLS * SHEET_ROWS;
const SHEET_SIZE = "1024x1024";
const EFFECT_SHEET_SIZE = "1024x1024";
const IMAGE_QUALITY = "low";
const IMAGE_BACKGROUND = "auto";

// Chroma key color used in prompts and removed with sharp after generation.
// gpt-image-2 does not support native transparent background output, so the
// generator creates sheets on this flat color and this script converts it to alpha.
const CHROMA_BG_HEX = "#FF00FF";
const CHROMA_BG_RGB = { r: 255, g: 0, b: 255 };
const CHROMA_THRESHOLD = 90;
const FRAME_ALPHA_THRESHOLD = 12;
const FRAME_CROP_PADDING = 28;
const SHEET_GRID_GUTTER_PIXELS = 24;
const SUBJECT_MAX_QUADRANT_OCCUPANCY_PERCENT = 52;
const SUBJECT_MIN_QUADRANT_PADDING_PERCENT = 24;
const IMAGE_FETCH_TIMEOUT_MS = Number(process.env.IMAGE_FETCH_TIMEOUT_MS || 20000);
const DEFAULT_IPFS_GATEWAYS = [
  "https://ipfs.dark-coin.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://w3s.link/ipfs/",
];

// Helper to save a match into "txns" collection (idempotent)
async function saveMatchToFirestore(match) {
 await setDoc(doc(db,'txns',match.darkcoinTransferTxId),{status:'character_created',champId:match.configTargetAssetId,completedAt:serverTimestamp()},{merge:true});
}

// Helper to update generation progress for a character
async function updateCharGenerationProgress(assetId, data) {
  const charRef = doc(db, "chars", assetId + "object");
  await setDoc(
    charRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeRoundNumber(value, fallback = 0) {
  const round = Number(value);
  if (!Number.isFinite(round) || round < 0) return fallback;
  return Math.floor(round);
}

async function getAlgorandScanRoundExclusive() {
  try {
    const snap = await getDoc(
      doc(db, SCAN_STATE_COLLECTION, GEN_CHAR_SCAN_STATE_DOC_ID)
    );
    const data = snap.exists() ? snap.data() || {} : {};
    const savedRound = normalizeRoundNumber(data.lastCheckedRound, 0);

    return Math.max(DEFAULT_MIN_MATCH_ROUND_EXCLUSIVE, savedRound);
  } catch (error) {
    console.warn(
      "Failed to load Algorand scan checkpoint. Using default start round:",
      error
    );
    return DEFAULT_MIN_MATCH_ROUND_EXCLUSIVE;
  }
}

async function updateAlgorandScanRoundExclusive(round, data = {}) {
  const lastCheckedRound = normalizeRoundNumber(round, 0);
  if (lastCheckedRound <= DEFAULT_MIN_MATCH_ROUND_EXCLUSIVE) return;

  await setDoc(
    doc(db, SCAN_STATE_COLLECTION, GEN_CHAR_SCAN_STATE_DOC_ID),
    {
      ...data,
      lastCheckedRound,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  console.log("Updated Algorand generation scan checkpoint:", {
    lastCheckedRound,
  });
}

async function getCurrentAlgorandIndexerRound() {
  try {
    const health = await indexer.makeHealthCheck().do();
    const round = normalizeRoundNumber(health?.round, 0);
    return round > 0 ? round : null;
  } catch (error) {
    console.warn("Failed to read current Algorand indexer round:", error);
    return null;
  }
}

// ===================== CONFIG ===================== //

const TARGET_ADDR =
  "VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM";
const DARKCOIN_ASA_ID = 1088771340;
const DARKCOIN_AMOUNT = 10000000000;
const CONFIG_SIGNER_ADDR =
  "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY";
const MAX_TXNS_TO_ADDRESS = 1000;
const DEFAULT_MIN_MATCH_ROUND_EXCLUSIVE = 62216900;
const SCAN_STATE_COLLECTION = "system";
const GEN_CHAR_SCAN_STATE_DOC_ID = "genCharAlgorandScan";

const indexer = new algosdk.Indexer(
  "",
  "https://mainnet-idx.algonode.cloud",
  443
);


// ===================== EQUIPPED ITEM EFFECT CONFIG ===================== //

const CHAMPION_TRAITS = {
  Background: [
    { assetId: 1631153255, trait: "Aqua Background", type: "Background", total: 132, effects: ["Increases Drown"] },
    { assetId: 1631164569, trait: "Blood Background", type: "Background", total: 144, effects: ["Increases Bleed"] },
    { assetId: 1631166128, trait: "Cosmos Background", type: "Background", total: 53, effects: ["Increases Intelligence", "Increases Resist"] },
    { assetId: 1631168001, trait: "Dungeon Background", type: "Background", total: 38, effects: ["Increases Doom"] },
    { assetId: 1631169006, trait: "Forest Background", type: "Background", total: 83, effects: ["Increases Resist", "Increases Dexterity"] },
    { assetId: 1631170742, trait: "Golden Background", type: "Background", total: 108, effects: ["Gain Bless at start of battle"] },
    { assetId: 1631172134, trait: "Midnight Background", type: "Background", total: 105, effects: ["Gain Focus at the start of battle"] },
    { assetId: 1631173209, trait: "Noir Background", type: "Background", total: 118, effects: ["Increases accuracy of curse type moves"] },
    { assetId: 1631173804, trait: "Red Moon Background", type: "Background", total: 19, effects: ["Apply Doom at the start of battle"] },
    { assetId: 1631175041, trait: "Sunset Background", type: "Background", total: 81, effects: ["Gain Cleanse at the start of battle"] },
    { assetId: 1631178480, trait: "Toxic Background", type: "Background", total: 119, effects: ["Increases Poison"] },
    { assetId: 1792634314, trait: "Valley Background", type: "Background", total: 40, effects: ["Increases Speed"] },
    { assetId: 2311097594, trait: "Waves Background", type: "Background", total: 65, effects: ["Apply Drown at the start of the battle"] },
  ],
  Weapon: [
    { assetId: 1631181322, trait: "Dragon Long Sword", type: "Weapon", total: 63, effects: ["Apply Burn on melee hit"] },
    { assetId: 1631198641, trait: "Dragon Staff", type: "Weapon", total: 38, effects: ["Apply Burn at the start of battle"] },
    { assetId: 1631201003, trait: "Dual Katana", type: "Weapon", total: 79, effects: ["Increases Speed"] },
    { assetId: 1631202303, trait: "Executioner Axe", type: "Weapon", total: 99, effects: ["Increases Strength", "Increases Health"] },
    { assetId: 1631204400, trait: "Scythe", type: "Weapon", total: 74, effects: ["Apply Bleed on melee hit", "Apply Doom on magic hit"] },
    { assetId: 1631205295, trait: "Shield", type: "Weapon", total: 89, effects: ["Gain Shield at the start of battle"] },
    { assetId: 1631205996, trait: "Sickle", type: "Weapon", total: 78, effects: ["Increases Nurture", "Apply Bleed on melee hit"] },
    { assetId: 1631207056, trait: "Spear", type: "Weapon", total: 95, effects: ["Increases Health", "Apply Bleed on melee hit"] },
    { assetId: 1631207955, trait: "Trident", type: "Weapon", total: 112, effects: ["Apply Drown on melee hit"] },
    { assetId: 1792635942, trait: "Dark Sword", type: "Weapon", total: 40, effects: ["Apply Doom on melee hit"] },
    { assetId: 1792636565, trait: "Elf Bow", type: "Weapon", total: 40, effects: ["Gain Nurture on ranged hit"] },
  ],
  Magic: [
    { assetId: 1631208827, trait: "Dark Magic", type: "Magic", total: 10, effects: ["Increases Doom"] },
    { assetId: 1631209424, trait: "Fire Magic", type: "Magic", total: 30, effects: ["Apply Burn on magic hit"] },
    { assetId: 1631213913, trait: "Lightning Magic", type: "Magic", total: 15, effects: ["Apply Paralyze on magic hit"] },
    { assetId: 1631217677, trait: "Water Magic", type: "Magic", total: 32, effects: ["Increases Drown"] },
    { assetId: 1631233542, trait: "Ice Daggers", type: "Magic", total: 25, effects: ["Apply Freeze on ranged hit"] },
  ],
  Head: [
    { assetId: 1631224831, trait: "Crown of Horns", type: "Head", total: 18, effects: ["Gain Doom at the start of battle", "Gain Strengthen at the start of battle"] },
    { assetId: 1631236045, trait: "All Knowing", type: "Head", total: 61, effects: ["Increases Intelligence"] },
    { assetId: 1631236727, trait: "Bone", type: "Head", total: 62, effects: ["Gain Cleanse at the start of battle"] },
    { assetId: 1631238772, trait: "Dark Knight Helm", type: "Head", total: 71, effects: ["Increases Doom"] },
    { assetId: 1631240661, trait: "Dragon Knight Helm", type: "Head", total: 30, effects: ["Increases Health", "Increases Burn"] },
    { assetId: 1631243569, trait: "Dragon", type: "Head", total: 129, effects: ["Gain Burn at start of battle", "Increases Speed"] },
    { assetId: 1631245454, trait: "Elder", type: "Head", total: 103, effects: ["Increases Intelligence", "Apply Freeze at the start of battle"] },
    { assetId: 1631263106, trait: "Gladiator Helm", type: "Head", total: 55, effects: ["Increases Health", "Increases Strength"] },
    { assetId: 1631266132, trait: "Purity", type: "Head", total: 111, effects: ["Gain Bless at start of battle"] },
    { assetId: 1631268297, trait: "Scarred", type: "Head", total: 81, effects: ["Increases Health", "Increases Resist"] },
    { assetId: 1631271286, trait: "Snake", type: "Head", total: 108, effects: ["Apply Poison at start of battle"] },
    { assetId: 1631273225, trait: "Undead", type: "Head", total: 67, effects: ["Increases Resist", "Gain Doom at start of battle"] },
    { assetId: 1631275042, trait: "Uni Horn", type: "Head", total: 104, effects: ["Gain Bless at start of battle", "Increases Doom"] },
    { assetId: 1792637776, trait: "Farmer", type: "Head", total: 40, effects: ["Gain Nurture at start of battle"] },
    { assetId: 1792640216, trait: "Samurai", type: "Head", total: 40, effects: ["Gain Focus on melee hit"] },
    { assetId: 1935442966, trait: "Barbarian", type: "Head", total: 1, effects: ["Increases Strength", "Decreases Accuracy"] },
    { assetId: 2311097574, trait: "Gold Hermes Helm", type: "Head", total: 10, effects: ["Gain Empower on melee hit"] },
    { assetId: 2311097577, trait: "Silver Hermes Helm", type: "Head", total: 75, effects: ["Gain Shield at start of battle"] },
    { assetId: 2311097585, trait: "Pirate Bandana", type: "Head", total: 65, effects: ["Increases Speed", "Increases Drown"] },
  ],
  Armour: [
    { assetId: 1631281879, trait: "Dark Knight Armour", type: "Armour", total: 39, effects: ["Gain Shield at the start of battle", "Increases Doom"] },
    { assetId: 1631282734, trait: "Dragon Hunter Armour", type: "Armour", total: 63, effects: ["Increases Dexterity", "Increases Burn"] },
    { assetId: 1631284233, trait: "Dragon Knight Armour", type: "Armour", total: 29, effects: ["Gain Shield at the start of battle", "Increases Burn"] },
    { assetId: 1631286848, trait: "Gladiator Armour", type: "Armour", total: 47, effects: ["Increases Health", "Increases Strength"] },
    { assetId: 1631293139, trait: "Hidden One", type: "Armour", total: 118, effects: ["Increases Intelligence"] },
    { assetId: 1631296742, trait: "Magicians Robe", type: "Armour", total: 84, effects: ["Increases accuracy of magic type moves"] },
    { assetId: 1631298825, trait: "Pharaoh", type: "Armour", total: 68, effects: ["Gain Empower at the start of battle"] },
    { assetId: 1631299446, trait: "Rags", type: "Armour", total: 157, effects: ["Increases Dexterity"] },
    { assetId: 1631302191, trait: "Shinobi", type: "Armour", total: 78, effects: ["Increases Speed"] },
    { assetId: 1631305105, trait: "Unchained", type: "Armour", total: 96, effects: ["Increases Doom"] },
    { assetId: 1642179694, trait: "Emperor Armour", type: "Armour", total: 15, effects: ["Increases Health", "Gain Bless at the start of battle"] },
    { assetId: 1792645489, trait: "Elf Robe", type: "Armour", total: 40, effects: ["Increases Speed", "Increases accuracy of ranged type moves"] },
    { assetId: 1792660153, trait: "Leather Garb", type: "Armour", total: 40, effects: ["Increases Health"] },
    { assetId: 1806077922, trait: "Executioner Robe", type: "Armour", total: 40, effects: ["Increases Bleed", "Increases Strength"] },
    { assetId: 2311097589, trait: "Pirate Coat", type: "Armour", total: 65, effects: ["Increases Speed", "Increases Bleed"] },
  ],
  Extra: [
    { assetId: 1631307699, trait: "Crescent Moon Earring", type: "Extra", total: 50, effects: ["Increases Resist"] },
    { assetId: 1631308577, trait: "Dragon Fangs Earring", type: "Extra", total: 47, effects: ["Increases Burn"] },
    { assetId: 1631309418, trait: "Fusion Pearl Earring", type: "Extra", total: 49, effects: ["Increases Bless"] },
    { assetId: 2156520477, trait: "Tentacle Earring", type: "Extra", total: 45, effects: ["Increases Drown"] },
    { assetId: 2311097583, trait: "Hoop Earring", type: "Extra", total: 65, effects: ["Increases Health"] },
  ],
  Skin: [
    { trait: "Dark Skin", type: "Skin", champions: 195, effects: ["Increases Health", "Increases Strength"] },
    { trait: "Tribal Dark Skin", type: "Skin", champions: 139, effects: ["Increases Health", "Increases Poison"] },
    { trait: "Tribal Light Skin", type: "Skin", champions: 162, effects: ["Increases Dexterity", "Increases Bleed"] },
    { trait: "Fire Dragon", type: "Skin", champions: 43, effects: ["Apply Burn at the start of battle"] },
    { trait: "Undead", type: "Skin", champions: 86, effects: ["Gain Doom at the start of battle", "Increases Strength"] },
    { trait: "Chameleon", type: "Skin", champions: 30, effects: ["Resistance to Poison"] },
    { trait: "Light Skin", type: "Skin", champions: 221, effects: ["Increases Resist"] },
    { trait: "Elder Dragon", type: "Skin", champions: 56, effects: ["Resistance to Burn"] },
    { trait: "Snake", type: "Skin", champions: 68, effects: ["Gain Cleanse at the start of battle"] },
  ],
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
];

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

function encodeUtf8(value) {
  return new TextEncoder().encode(String(value));
}

function bytesToUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return Uint8Array.from(value);
  if (typeof value === "string") {
    const binary = atob(value);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  }
  return new Uint8Array();
}

function medianOfNumbers(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
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

function pushBattleOnly(target, entry) {
  target.battleOnly.push(entry);
}

function applyTraitTextToGainedEffects(target, effectText, amount, sourceName) {
  const text = String(effectText || "").trim();
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
  }

  match = text.match(/^Resistance to (.+)$/i);
  if (match) {
    pushBattleOnly(target, {
      type: "resistance",
      label: text,
      sourceName,
      resistedEffect:
        EFFECT_KEY_ALIASES[match[1].trim()] || match[1].trim().toLowerCase(),
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
      effectKey:
        EFFECT_KEY_ALIASES[match[1].trim()] || match[1].trim().toLowerCase(),
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
      effectKey:
        EFFECT_KEY_ALIASES[match[1].trim()] || match[1].trim().toLowerCase(),
      amount,
    });
    return;
  }

  match = text.match(/^Gain (.+) on (melee|ranged|magic) hit$/i);
  if (match) {
    pushBattleOnly(target, {
      type: "gain_on_hit",
      label: text,
      sourceName,
      attackType: match[2].toLowerCase(),
      effectKey:
        EFFECT_KEY_ALIASES[match[1].trim()] || match[1].trim().toLowerCase(),
      amount,
    });
    return;
  }

  match = text.match(/^Apply (.+) on (melee|ranged|magic) hit$/i);
  if (match) {
    pushBattleOnly(target, {
      type: "apply_on_hit",
      label: text,
      sourceName,
      attackType: match[2].toLowerCase(),
      effectKey:
        EFFECT_KEY_ALIASES[match[1].trim()] || match[1].trim().toLowerCase(),
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

function getEquippedPropertiesFromMeta(metaDoc, fallbackProperties = {}) {
  const metaProperties = metaDoc?.properties || {};
  return {
    Background: metaProperties.Background || fallbackProperties.Background || "None",
    Skin: metaProperties.Skin || fallbackProperties.Skin || "None",
    Weapon: metaProperties.Weapon || fallbackProperties.Weapon || "None",
    Magic: metaProperties.Magic || fallbackProperties.Magic || "None",
    Head: metaProperties.Head || fallbackProperties.Head || "None",
    Armour: metaProperties.Armour || fallbackProperties.Armour || "None",
    Extra: metaProperties.Extra || fallbackProperties.Extra || "None",
  };
}

async function getEquippedMetaDoc(assetId) {
  try {
    const metaRef = doc(db, "chars", String(assetId) + "meta");
    const metaSnap = await getDoc(metaRef);
    return metaSnap.exists() ? metaSnap.data() || null : null;
  } catch (error) {
    console.warn("Failed to read equipped meta doc for character:", assetId, error);
    return null;
  }
}

async function buildEquippedTraitsFromProperties(properties) {
  const slotDefs = [
    { type: "Background", name: properties.Background },
    { type: "Skin", name: properties.Skin },
    { type: "Weapon", name: properties.Weapon },
    { type: "Magic", name: properties.Magic },
    { type: "Head", name: properties.Head },
    { type: "Armour", name: properties.Armour },
    { type: "Extra", name: properties.Extra },
  ];

  // No Algorand box reads here. Character generation only needs to know
  // which traits/items are equipped and the static effect text attached to each.
  return slotDefs
    .map(({ type, name }) => {
      if (!name || name === "None") return null;

      const traitDef = getTraitDefinition(name, type);
      const effects = Array.isArray(traitDef?.effects) ? traitDef.effects : [];

      return {
        type,
        name,
        assetId: traitDef?.assetId || null,
        total: traitDef?.total || traitDef?.champions || null,
        effects,
        effectMedians: [],
        usesBoxPotency: false,
      };
    })
    .filter(Boolean);
}

function extractEffectKeyFromText(effectText) {
  const text = String(effectText || "").trim();
  if (!text) return null;

  const patterns = [
    /^Increases (.+)$/i,
    /^Decreases (.+)$/i,
    /^Resistance to (.+)$/i,
    /^Gain (.+) at (?:the )?start of (?:the )?battle$/i,
    /^Apply (.+) at (?:the )?start of (?:the )?battle$/i,
    /^Gain (.+) on (?:melee|ranged|magic) hit$/i,
    /^Apply (.+) on (?:melee|ranged|magic) hit$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const name = match[1].trim();
    return EFFECT_KEY_ALIASES[name] || STAT_KEY_ALIASES[name] || name.toLowerCase();
  }

  return null;
}

function getMoveTypeHintsFromEffectText(effectText) {
  const text = String(effectText || "").toLowerCase();
  const hints = [];

  if (text.includes("melee")) hints.push("melee damage", "melee curse", "melee buff");
  if (text.includes("ranged")) hints.push("ranged damage", "ranged curse", "ranged buff");
  if (text.includes("magic")) hints.push("magic damage", "magic curse", "magic buff");
  if (text.includes("curse")) hints.push("melee curse", "ranged curse", "magic curse");

  return hints;
}

function buildGainedEffectsFromEquippedTraits(traits) {
  const result = cloneEmptyGainedEffects();

  // These are non-numeric hints only. The generator no longer reads Algorand
  // boxes for median potency and no longer applies box-derived stat bonuses.
  result.rawEquippedEffects = [];
  result.effectHints = [];
  result.moveTypeHints = [];
  result.usesBoxPotency = false;

  (Array.isArray(traits) ? traits : []).forEach((trait) => {
    if (!trait || !Array.isArray(trait.effects)) return;

    trait.effects.forEach((effectText) => {
      const label = String(effectText || "").trim();
      if (!label) return;

      result.rawEquippedEffects.push({
        sourceName: trait.name,
        type: trait.type,
        label,
      });

      const effectKey = extractEffectKeyFromText(label);
      if (effectKey) result.effectHints.push(effectKey);

      result.moveTypeHints.push(...getMoveTypeHintsFromEffectText(label));
    });
  });

  return result;
}

function summarizeEquippedTraitEffects(equippedTraits) {
  if (!Array.isArray(equippedTraits) || equippedTraits.length === 0) {
    return "No equipped item effects were found.";
  }

  return equippedTraits
    .map((trait) => {
      const effectLines = (trait.effects || []).map((effectText) => `${effectText}`);
      return `${trait.type}: ${trait.name} => ${effectLines.join("; ") || "No static effects listed"}`;
    })
    .join(" | ");
}

function summarizeGainedEffectsForPrompt(gainedEffects) {
  const rawEffects = Array.isArray(gainedEffects?.rawEquippedEffects)
    ? gainedEffects.rawEquippedEffects
    : [];

  if (!rawEffects.length) {
    return "No equipped item effect hints were found.";
  }

  return rawEffects
    .map((entry) => `${entry.sourceName || "Item"}: ${entry.label}`)
    .join("; ");
}

function addRandomVariance(value, min, max, variance = 2) {
  const n = Number(value || 0);
  const offset = Math.floor(Math.random() * (variance * 2 + 1)) - variance;
  return Math.max(min, Math.min(max, n + offset));
}

function weightedPickFromArray(values, preferredValues = []) {
  const cleanValues = values.filter(Boolean);
  const cleanPreferred = preferredValues.filter(Boolean);

  const pool = [
    ...cleanValues,
    ...cleanPreferred,
    ...cleanPreferred,
    ...cleanPreferred,
  ];

  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getPreferredMoveTypesFromGainedEffects(gainedEffects) {
  const preferred = [];

  if (Array.isArray(gainedEffects?.moveTypeHints)) {
    preferred.push(...gainedEffects.moveTypeHints);
  }

  const moveAccuracy = gainedEffects?.moveAccuracy || {};
  if (Number(moveAccuracy.melee || 0) > 0) {
    preferred.push("melee damage", "melee curse", "melee buff");
  }
  if (Number(moveAccuracy.ranged || 0) > 0) {
    preferred.push("ranged damage", "ranged curse", "ranged buff");
  }
  if (Number(moveAccuracy.magic || 0) > 0) {
    preferred.push("magic damage", "magic curse", "magic buff");
  }
  if (Number(moveAccuracy.curse || 0) > 0) {
    preferred.push("melee curse", "ranged curse", "magic curse");
  }

  return preferred;
}

function getPreferredEffectsFromGainedEffects(gainedEffects) {
  const preferred = [];

  if (Array.isArray(gainedEffects?.effectHints)) {
    preferred.push(...gainedEffects.effectHints, ...gainedEffects.effectHints);
  }

  Object.entries(gainedEffects?.effects || {}).forEach(([effectKey, amount]) => {
    const n = Number(amount || 0);
    if (n > 0) {
      preferred.push(effectKey, effectKey);
    }
  });

  (gainedEffects?.battleOnly || []).forEach((entry) => {
    if (entry?.effectKey) {
      preferred.push(entry.effectKey);
    }
  });

  return preferred.filter((effectKey) => effectKeys.includes(effectKey));
}

function applyItemEffectsToGeneratedCharacter(charObj, gainedEffects) {
  if (!charObj || !gainedEffects) return charObj;

  const statBonuses = gainedEffects.stats || {};
  const effectBonuses = gainedEffects.effects || {};

  ["health", "speed", "resist", "strength", "dexterity", "intelligence"].forEach(
    (key) => {
      const add = Number(statBonuses[key] || 0);
      if (add) {
        charObj[key] = Number(charObj[key] || 0) + add;
      }
    }
  );

  Object.entries(effectBonuses).forEach(([effectKey, amount]) => {
    const add = Number(amount || 0);
    if (add) {
      charObj[effectKey] = Number(charObj[effectKey] || 0) + add;
    }
  });

  charObj.gainedEffectsMeta = gainedEffects;
  return charObj;
}

function tuneGeneratedMovesWithItemEffects(charObj, gainedEffects) {
  const preferredMoveTypes = getPreferredMoveTypesFromGainedEffects(gainedEffects);
  const preferredEffects = getPreferredEffectsFromGainedEffects(gainedEffects);
  const moveAccuracy = gainedEffects?.moveAccuracy || {};

  const damageTypes = ["melee damage", "ranged damage", "magic damage"];
  const curseTypes = ["melee curse", "ranged curse", "magic curse"];
  const buffTypes = ["melee buff", "ranged buff", "magic buff"];

  charObj.moves = (Array.isArray(charObj.moves) ? charObj.moves : []).map(
    (move) => {
      const tuned = { ...move };

      if (preferredMoveTypes.length && Math.random() < 0.45) {
        tuned.type = weightedPickFromArray(
          [...damageTypes, ...curseTypes, ...buffTypes],
          preferredMoveTypes
        );
      }

      const tunedType = String(tuned.type || "").toLowerCase();

      if (preferredEffects.length && Math.random() < 0.55) {
        tuned.effect = weightedPickFromArray(effectKeys, preferredEffects);
      }

      tuned.power = addRandomVariance(Number(tuned.power || 0), 0, 60, 4);
      tuned.accuracy = addRandomVariance(Number(tuned.accuracy || 0), 20, 100, 6);
      tuned.cooldown = 3;

      const root = tunedType.split(" ")[0];
      const isCurse = tunedType.includes("curse");

      const accuracyHint =
        Number(moveAccuracy[root] || 0) +
        Number(moveAccuracy.all || 0) +
        (isCurse ? Number(moveAccuracy.curse || 0) : 0);

      if (accuracyHint) {
        tuned.accuracy = Math.min(100, tuned.accuracy + Math.ceil(accuracyHint / 2));
      }

      return tuned;
    }
  );

  return charObj;
}

function toBigIntMaybe(v) {
  if (v == null) return 0n;
  if (typeof v === "bigint") return v;
  return BigInt(v);
}

function bytesLikeToBase64(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return algosdk.bytesToBase64(value);
  if (Array.isArray(value)) return algosdk.bytesToBase64(Uint8Array.from(value));
  if (value?.constructor?.name === "Uint8Array") return algosdk.bytesToBase64(value);
  return String(value);
}

function getTxId(tx) {
  return tx?.id || tx?.txid || tx?.txId || null;
}

function getTxType(tx) {
  return tx?.txType || tx?.["tx-type"] || null;
}

function getGroupId(tx) {
  return bytesLikeToBase64(tx?.group || tx?.groupId || null);
}

function getConfirmedRound(tx) {
  const round = tx?.confirmedRound ?? tx?.["confirmed-round"];
  return round == null ? null : Number(round);
}

function getIntraRoundOffset(tx) {
  return Number(tx?.intraRoundOffset ?? tx?.["intra-round-offset"] ?? 0);
}

function getAuthAddr(tx) {
  return tx?.authAddr || tx?.["auth-addr"] || null;
}

function getAssetTransfer(tx) {
  return tx?.assetTransferTransaction || tx?.["asset-transfer-transaction"] || null;
}

function getAssetConfig(tx) {
  return tx?.assetConfigTransaction || tx?.["asset-config-transaction"] || null;
}

function getAssetTransferAssetId(axfer) {
  return Number(axfer?.assetId ?? axfer?.["asset-id"] ?? 0);
}

function getAssetTransferReceiver(axfer) {
  return axfer?.receiver || null;
}

function getAssetTransferAmount(axfer) {
  return toBigIntMaybe(axfer?.amount ?? 0);
}

function getConfiguredAssetId(acfg) {
  return Number(acfg?.assetId ?? acfg?.["asset-id"] ?? 0);
}

function isDarkCoinPaymentToTarget(tx) {
  const axfer = getAssetTransfer(tx);
  if (!axfer) return false;

  const receiver = getAssetTransferReceiver(axfer);
  const assetId = getAssetTransferAssetId(axfer);
  const amount = getAssetTransferAmount(axfer);

  if (receiver !== TARGET_ADDR) return false;
  if (assetId !== DARKCOIN_ASA_ID) return false;
  if (amount !== BigInt(DARKCOIN_AMOUNT)) return false;

  return true;
}

function sortTxnsInRoundOrder(a, b) {
  const ra = getConfirmedRound(a) ?? 0;
  const rb = getConfirmedRound(b) ?? 0;
  if (ra !== rb) return ra - rb;

  return getIntraRoundOffset(a) - getIntraRoundOffset(b);
}

function getNextToken(res) {
  return res?.nextToken || res?.["next-token"] || undefined;
}

function applyNextToken(builder, token) {
  if (!token) return builder;
  if (typeof builder.nextToken === "function") return builder.nextToken(token);
  if (typeof builder.next === "function") return builder.next(token);
  return builder;
}

async function fetchAllTransactionsFromBuilder(makeBuilder, maxPages = 25) {
  const all = [];
  const seenTxIds = new Set();
  let nextToken = undefined;
  let page = 0;
  let reachedPageCap = false;

  do {
    page += 1;

    let builder = makeBuilder();
    builder = applyNextToken(builder, nextToken);

    const res = await builder.do();
    const txns = res.transactions || [];

    for (const tx of txns) {
      const txId = String(getTxId(tx) || "");
      if (txId && seenTxIds.has(txId)) continue;
      if (txId) seenTxIds.add(txId);
      all.push(tx);
    }

    nextToken = getNextToken(res);

    if (page >= maxPages && nextToken) {
      reachedPageCap = true;
      console.warn("Stopped paginated transaction lookup after max page cap.", {
        maxPages,
        collected: all.length,
      });
      break;
    }
  } while (nextToken);

  all.reachedPageCap = reachedPageCap;
  return all;
}

async function fetchFullGroupByRoundAndGroupId(txRound, groupId) {
  const normalizedGroupId = bytesLikeToBase64(groupId);

  const roundTxns = await fetchAllTransactionsFromBuilder(
    () =>
      indexer
        .searchForTransactions()
        .round(txRound)
        .limit(1000),
    25
  );

  const groupTxns = roundTxns.filter((tx) => getGroupId(tx) === normalizedGroupId);
  groupTxns.reachedPageCap = Boolean(roundTxns.reachedPageCap);
  groupTxns.sort(sortTxnsInRoundOrder);

  return groupTxns;
}

async function appendSignerFallbackTxns({ groupTxns, txRound, groupId }) {
  const normalizedGroupId = bytesLikeToBase64(groupId);
  const existingIds = new Set(groupTxns.map((tx) => String(getTxId(tx) || "")));

  try {
    const signerTxns = await fetchAllTransactionsFromBuilder(
      () =>
        indexer
          .searchForTransactions()
          .address(CONFIG_SIGNER_ADDR)
          .round(txRound)
          .limit(1000),
      10
    );

    for (const tx of signerTxns) {
      if (getGroupId(tx) !== normalizedGroupId) continue;

      const txId = String(getTxId(tx) || "");
      if (txId && existingIds.has(txId)) continue;

      groupTxns.push(tx);
      if (txId) existingIds.add(txId);
    }

    groupTxns.sort(sortTxnsInRoundOrder);
  } catch (err) {
    console.warn("Signer fallback lookup failed:", err);
  }

  return groupTxns;
}

async function fetchMatchingGroupsFromLast1000() {
  const results = [];
  const seenGroups = new Set();
  const scanErrors = [];
  const minMatchRoundExclusive = await getAlgorandScanRoundExclusive();
  const minMatchRoundInclusive = minMatchRoundExclusive + 1;
  let maxRoundSeen = minMatchRoundExclusive;

  const existingConfigTxIds = new Set();

  try {
    const snap = await getDocs(collection(db, "txns"));

    for (const d of snap.docs) {
      const data = d.data();

      if (data?.assetConfigTxId) {
        existingConfigTxIds.add(String(data.assetConfigTxId));
      }

      // Safety for older records where the txns doc id was the config tx id.
      if (d.id) {
        existingConfigTxIds.add(String(d.id));
      }
    }
  } catch (err) {
    console.warn("Failed to load existing txns from Firestore:", err);
    scanErrors.push("existing_txns_firestore_load_failed");
  }

  // Use the same matching style as the working API route:
  // search the generation receiver address + DARK ASA id, then validate receiver and amount.
  const txns = await fetchAllTransactionsFromBuilder(
    () =>
      indexer
        .searchForTransactions()
        .address(TARGET_ADDR)
        .assetID(DARKCOIN_ASA_ID)
        .minRound(minMatchRoundInclusive)
        .limit(MAX_TXNS_TO_ADDRESS),
    10
  );

  if (txns.reachedPageCap) {
    scanErrors.push("target_transaction_scan_page_cap_reached");
  }

  for (const tx of txns) {
    const round = getConfirmedRound(tx);
    if (round != null && round > maxRoundSeen) {
      maxRoundSeen = round;
    }
  }

  console.log(
    `Scanning ${txns.length} recent DARK transactions involving ${TARGET_ADDR} ` +
      `(asset=${DARKCOIN_ASA_ID}, minRound=${minMatchRoundInclusive})`
  );

  const darkPayments = txns.filter((tx) => {
    const round = getConfirmedRound(tx);

    if (round == null) return false;
    if (round <= minMatchRoundExclusive) return false;
    if (!getGroupId(tx)) return false;
    if (!isDarkCoinPaymentToTarget(tx)) return false;

    return true;
  });

  console.log(`Found ${darkPayments.length} candidate DARK payment txns.`);

  for (const paymentTx of darkPayments) {
    const groupId = getGroupId(paymentTx);
    if (!groupId || seenGroups.has(groupId)) continue;

    const txRound = getConfirmedRound(paymentTx);
    if (txRound == null) {
      seenGroups.add(groupId);
      continue;
    }

    let groupTxns = [];

    try {
      groupTxns = await fetchFullGroupByRoundAndGroupId(txRound, groupId);
    } catch (err) {
      console.warn(`Failed to fetch full group for round ${txRound}:`, err);
      scanErrors.push(`full_group_lookup_failed:${txRound}`);
      seenGroups.add(groupId);
      continue;
    }

    if (groupTxns.reachedPageCap) {
      scanErrors.push(`round_lookup_page_cap_reached:${txRound}`);
    }

    // If the round scan did not return the full group, try looking up the config signer
    // in the same round and merge any txns with the same normalized group id.
    if (groupTxns.length < 2) {
      groupTxns = await appendSignerFallbackTxns({ groupTxns, txRound, groupId });
    }

    if (groupTxns.length < 2) {
      console.warn("Rejected group: fewer than 2 transactions after full lookup.", {
        groupId,
        round: txRound,
        count: groupTxns.length,
        txIds: groupTxns.map((tx) => getTxId(tx)),
        txTypes: groupTxns.map((tx) => getTxType(tx)),
        senders: groupTxns.map((tx) => tx?.sender),
        authAddrs: groupTxns.map((tx) => getAuthAddr(tx)),
      });
      seenGroups.add(groupId);
      continue;
    }

    const paymentInGroup = groupTxns.find(isDarkCoinPaymentToTarget);

    if (!paymentInGroup) {
      console.warn("Rejected group: no DARK payment to target found inside group.", {
        groupId,
        round: txRound,
        txIds: groupTxns.map((tx) => getTxId(tx)),
        txTypes: groupTxns.map((tx) => getTxType(tx)),
      });
      seenGroups.add(groupId);
      continue;
    }

    const assetConfigTx = groupTxns.find((tx) => {
      const txType = getTxType(tx);
      const acfg = getAssetConfig(tx);
      if (txType !== "acfg" && !acfg) return false;

      const sender = tx?.sender;
      const authAddr = getAuthAddr(tx);

      return sender === CONFIG_SIGNER_ADDR || authAddr === CONFIG_SIGNER_ADDR;
    });

    if (!assetConfigTx) {
      console.warn("Rejected group: no matching asset config tx signed by config signer.", {
        groupId,
        round: txRound,
        txIds: groupTxns.map((tx) => getTxId(tx)),
        txTypes: groupTxns.map((tx) => getTxType(tx)),
        senders: groupTxns.map((tx) => tx?.sender),
        authAddrs: groupTxns.map((tx) => getAuthAddr(tx)),
      });
      seenGroups.add(groupId);
      continue;
    }

    const acfg = getAssetConfig(assetConfigTx);
    if (!acfg) {
      console.warn("Rejected group: asset config tx had no asset config payload.", {
        groupId,
        round: txRound,
        assetConfigTxId: getTxId(assetConfigTx),
      });
      seenGroups.add(groupId);
      continue;
    }

    const assetConfigTxId = String(getTxId(assetConfigTx) || "");
    if (!assetConfigTxId) {
      console.warn("Rejected group: asset config tx had no tx id.", {
        groupId,
        round: txRound,
      });
      seenGroups.add(groupId);
      continue;
    }

    if (existingConfigTxIds.has(assetConfigTxId)) {
      console.log("Skipping group: asset config tx already recorded.", {
        groupId,
        assetConfigTxId,
      });
      seenGroups.add(groupId);
      continue;
    }

    const paymentAxfer = getAssetTransfer(paymentInGroup);
    const sender = assetConfigTx.sender;
    const authAddr = getAuthAddr(assetConfigTx);

    const parsed = {
      groupId,
      round: getConfirmedRound(paymentInGroup),
      darkcoinTransferTxId: getTxId(paymentInGroup),
      assetConfigTxId,
      configTargetAssetId: getConfiguredAssetId(acfg),
      receiver: getAssetTransferReceiver(paymentAxfer),
      amount: Number(getAssetTransferAmount(paymentAxfer)),
      signer: sender,
      authAddr,
      source: "algorandScan",
    };

    console.log("Accepted matching generation group:", parsed);

    results.push(parsed);
    existingConfigTxIds.add(assetConfigTxId);
    seenGroups.add(groupId);
  }

  console.log(`Found ${results.length} matching generation groups.`);

  return {
    matches: results,
    minMatchRoundExclusive,
    minMatchRoundInclusive,
    maxRoundSeen,
    scanErrors,
  };
}

// ===================== HELPERS ===================== //

function normalizeIpfsGateway(gateway) {
  const value = String(gateway || "").trim();
  if (!value) return null;
  if (value.includes("{cid}")) return value;

  const withoutTrailingSlash = value.replace(/\/+$/, "");
  if (withoutTrailingSlash.endsWith("/ipfs")) {
    return `${withoutTrailingSlash}/`;
  }
  return `${withoutTrailingSlash}/ipfs/`;
}

function getIpfsGateways() {
  const configured = String(process.env.IPFS_GATEWAYS || "")
    .split(",")
    .map(normalizeIpfsGateway)
    .filter(Boolean);

  return configured.length
    ? configured
    : DEFAULT_IPFS_GATEWAYS.map(normalizeIpfsGateway).filter(Boolean);
}

function extractIpfsCid(imageUrl) {
  const value = String(imageUrl || "").trim();
  if (!value) return null;

  const ipfsSchemeMatch = value.match(/^ipfs:\/\/([^/?#]+)/i);
  if (ipfsSchemeMatch) return ipfsSchemeMatch[1];

  const pathMatch = value.match(/\/ipfs\/([^/?#]+)/i);
  return pathMatch ? pathMatch[1] : null;
}

function buildIpfsGatewayUrl(gateway, cid) {
  if (gateway.includes("{cid}")) {
    return gateway.replaceAll("{cid}", encodeURIComponent(cid));
  }
  return `${gateway}${encodeURIComponent(cid)}`;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildImageFetchUrls(imageUrl) {
  const originalUrl = String(imageUrl || "").trim();
  const cid = extractIpfsCid(originalUrl);
  if (!cid) return [originalUrl].filter(Boolean);

  return uniqueValues([
    originalUrl.startsWith("ipfs://") ? null : originalUrl,
    ...getIpfsGateways().map((gateway) => buildIpfsGatewayUrl(gateway, cid)),
  ]);
}

async function fetchWithTimeout(url, timeoutMs = IMAGE_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "image/*,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchUrlToBlob(imageUrl) {
  const response = await fetchWithTimeout(imageUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Blob([arrayBuffer], {
    type: response.headers.get("content-type") || "image/png",
  });
}

async function urlToBlob(imageUrl) {
  const urls = buildImageFetchUrls(imageUrl);
  const errors = [];

  for (const url of urls) {
    try {
      const blob = await fetchUrlToBlob(url);
      if (url !== imageUrl) {
        console.log("Fetched IPFS image through fallback gateway:", url);
      }
      return blob;
    } catch (error) {
      const message = String(error?.message || error);
      errors.push(`${url}: ${message}`);
      console.warn("Image fetch failed:", { url, error: message });
    }
  }

  throw new Error(`Unable to fetch image from any gateway. ${errors.join(" | ")}`);
}

function normalizeBase64(base64, defaultContentType = "image/png") {
  let contentType = defaultContentType;
  let pureBase64 = base64;

  const match = String(base64).match(/^data:(.+);base64,(.*)$/);
  if (match) {
    contentType = match[1];
    pureBase64 = match[2];
  }

  return { contentType, pureBase64 };
}

async function uploadBase64ToFirebase(
  base64,
  destPath,
  defaultContentType = "image/png"
) {
  const { contentType, pureBase64 } = normalizeBase64(
    base64,
    defaultContentType
  );

  const fileRef = ref(storage, "champs/" + destPath);

  await uploadString(fileRef, pureBase64, "base64", {
    contentType,
  });

  const url = await getDownloadURL(fileRef);
  console.log("Uploaded base64 to:", url);
  return url;
}

async function uploadBufferToFirebase(
  buffer,
  destPath,
  contentType = "image/png"
) {
  const fileRef = ref(storage, "champs/" + destPath);

  await uploadBytes(fileRef, buffer, {
    contentType,
  });

  const url = await getDownloadURL(fileRef);
  console.log("Uploaded buffer to:", url);
  return url;
}

// ===================== OPENAI IMAGE RETRY / FALLBACK HELPERS ===================== //

const IMAGE_MAX_RETRY_ATTEMPTS = Number(
  process.env.IMAGE_MAX_RETRY_ATTEMPTS || 18
);

const IMAGE_RETRY_BASE_DELAY_MS = Number(
  process.env.IMAGE_RETRY_BASE_DELAY_MS || 2500
);

const IMAGE_RETRY_MAX_DELAY_MS = Number(
  process.env.IMAGE_RETRY_MAX_DELAY_MS || 45000
);

const SAFETY_RETRY_PROMPT_SUFFIXES = [
  "Keep the result clearly non-realistic, stylized fantasy RPG sprite art. Avoid gore, explicit injury, dismemberment, corpses, real people, photorealism, horror realism, or graphic violence.",
  "Make the image safe, game-like, symbolic, and non-graphic. Use fantasy animation language only. No realistic blood, wounds, body horror, exposed organs, or distressing realism.",
  "Use a clean arcade fantasy style. Keep all combat, magic, poison, doom, fire, curse, and weapon details as non-graphic visual effects only.",
  "Prioritize a safe character animation sheet. The character should look like a fantasy game champion, not a real person. No graphic harm or realistic violent detail.",
  "If any trait sounds intense, reinterpret it as harmless stylized fantasy design language with glowing magical effects, armor, cloth, smoke, particles, and non-graphic action."
];

class ImageRetryExhaustedError extends Error {
  constructor(label, lastError) {
    super(`${label} failed after ${IMAGE_MAX_RETRY_ATTEMPTS} retry attempts.`);
    this.name = "ImageRetryExhaustedError";
    this.label = label;
    this.lastError = lastError;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getOpenAIErrorMessage(error) {
  return String(
    error?.error?.message ||
      error?.response?.data?.error?.message ||
      error?.message ||
      error ||
      ""
  );
}

function getOpenAIErrorCode(error) {
  return String(
    error?.error?.code ||
      error?.response?.data?.error?.code ||
      error?.code ||
      ""
  );
}

function getOpenAIErrorType(error) {
  return String(
    error?.error?.type ||
      error?.response?.data?.error?.type ||
      error?.type ||
      ""
  );
}

function getOpenAIErrorStatus(error) {
  return Number(
    error?.status ||
      error?.response?.status ||
      error?.error?.status ||
      0
  );
}

function getOpenAIErrorHeader(error, headerName) {
  const headers =
    error?.headers ||
    error?.response?.headers ||
    error?.error?.headers ||
    {};

  return (
    headers?.[headerName] ||
    headers?.[headerName.toLowerCase()] ||
    headers?.[headerName.toUpperCase()] ||
    null
  );
}

function isSafetySystemRejection(error) {
  const text = [
    getOpenAIErrorMessage(error),
    getOpenAIErrorCode(error),
    getOpenAIErrorType(error),
  ]
    .join(" ")
    .toLowerCase();

  return (
    text.includes("safety system") ||
    text.includes("moderation_blocked") ||
    text.includes("content_policy") ||
    text.includes("content policy") ||
    text.includes("rejected as a result of our safety") ||
    (text.includes("safety") && text.includes("reject"))
  );
}

function isRetryableTransientImageError(error) {
  const status = getOpenAIErrorStatus(error);
  const name = String(error?.name || "").toLowerCase();

  return (
    [408, 409, 429, 500, 502, 503, 504].includes(status) ||
    name.includes("apiconnectionerror") ||
    name.includes("apitimeouterror") ||
    name.includes("ratelimiterror") ||
    name.includes("internalservererror")
  );
}

function isRetryableImageError(error) {
  return isSafetySystemRejection(error) || isRetryableTransientImageError(error);
}

function getImageRetryDelayMs(attempt, error) {
  const retryAfterMs = Number(getOpenAIErrorHeader(error, "retry-after-ms"));
  if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
    return retryAfterMs;
  }

  const retryAfterSeconds = Number(getOpenAIErrorHeader(error, "retry-after"));
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  const exponentialDelay = Math.min(
    IMAGE_RETRY_MAX_DELAY_MS,
    IMAGE_RETRY_BASE_DELAY_MS * Math.pow(2, Math.min(attempt - 1, 6))
  );

  const jitter = Math.floor(Math.random() * IMAGE_RETRY_BASE_DELAY_MS);
  return exponentialDelay + jitter;
}

function buildImageRetryPrompt(prompt, attempt) {
  // First attempt uses the exact original prompt.
  if (attempt <= 1) return prompt;

  const suffix =
    SAFETY_RETRY_PROMPT_SUFFIXES[
      (attempt - 2) % SAFETY_RETRY_PROMPT_SUFFIXES.length
    ];

  return [
    prompt,
    "",
    "Additional safety/stability constraints for this retry:",
    suffix,
  ].join("\n");
}

async function runOpenAIImageRequestWithRetry({
  label,
  prompt,
  request,
}) {
  let lastError = null;

  for (let attempt = 1; attempt <= IMAGE_MAX_RETRY_ATTEMPTS; attempt++) {
    const retryPrompt = buildImageRetryPrompt(prompt, attempt);

    try {
      const result = await request(retryPrompt, attempt);
      const b64 = result?.data?.[0]?.b64_json;

      if (!b64) {
        throw new Error("OpenAI did not return image data.");
      }

      if (attempt > 1) {
        console.log(`✅ ${label} succeeded on attempt ${attempt}.`);
      }

      return b64;
    } catch (error) {
      lastError = error;

      const retryable = isRetryableImageError(error);
      const safetyRejected = isSafetySystemRejection(error);

      console.warn(`⚠️ ${label} attempt ${attempt}/${IMAGE_MAX_RETRY_ATTEMPTS} failed.`, {
        retryable,
        safetyRejected,
        status: getOpenAIErrorStatus(error),
        code: getOpenAIErrorCode(error),
        type: getOpenAIErrorType(error),
        message: getOpenAIErrorMessage(error).slice(0, 500),
      });

      // Do not hide real configuration/account/code errors.
      if (!retryable) {
        throw error;
      }

      if (attempt >= IMAGE_MAX_RETRY_ATTEMPTS) {
        break;
      }

      const delayMs = getImageRetryDelayMs(attempt, error);
      console.log(`Retrying ${label} in ${Math.round(delayMs / 1000)}s...`);
      await sleep(delayMs);
    }
  }

  throw new ImageRetryExhaustedError(label, lastError);
}

function parseSharpSize(size, fallback = 1024) {
  const match = String(size || "").match(/^(\d+)x(\d+)$/);
  if (!match) {
    return { width: fallback, height: fallback };
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

async function blobToBuffer(blob) {
  if (Buffer.isBuffer(blob)) return blob;
  if (blob instanceof Uint8Array) return Buffer.from(blob);

  if (typeof blob?.arrayBuffer === "function") {
    return Buffer.from(await blob.arrayBuffer());
  }

  throw new Error("Unable to convert sourceBlob into a Buffer.");
}

async function createStaticFallbackSheetFromSourceBlob({
  sourceBlob,
  size = SHEET_SIZE,
}) {
  const { width, height } = parseSharpSize(size);
  const cellWidth = Math.floor(width / SHEET_COLS);
  const cellHeight = Math.floor(height / SHEET_ROWS);

  const sourceBuffer = await blobToBuffer(sourceBlob);

  const resizedSourceBuffer = await sharp(sourceBuffer)
    .resize({
      width: Math.floor(cellWidth * 0.82),
      height: Math.floor(cellHeight * 0.82),
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  const sourceMeta = await sharp(resizedSourceBuffer).metadata();
  const sourceWidth = sourceMeta.width || cellWidth;
  const sourceHeight = sourceMeta.height || cellHeight;

  const composites = [];

  for (let row = 0; row < SHEET_ROWS; row++) {
    for (let col = 0; col < SHEET_COLS; col++) {
      const left =
        col * cellWidth + Math.floor((cellWidth - sourceWidth) / 2);
      const top =
        row * cellHeight + Math.floor((cellHeight - sourceHeight) / 2);

      composites.push({
        input: resizedSourceBuffer,
        left: Math.max(0, left),
        top: Math.max(0, top),
      });
    }
  }

  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: CHROMA_BG_HEX,
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  return buffer.toString("base64");
}

async function createSimpleEffectFallbackSheetBase64({
  size = EFFECT_SHEET_SIZE,
  effectName = "fallback",
}) {
  const { width, height } = parseSharpSize(size);
  const cellWidth = Math.floor(width / SHEET_COLS);
  const cellHeight = Math.floor(height / SHEET_ROWS);

  let shapes = "";

  for (let row = 0; row < SHEET_ROWS; row++) {
    for (let col = 0; col < SHEET_COLS; col++) {
      const frameIndex = row * SHEET_COLS + col;
      const cx = col * cellWidth + cellWidth / 2;
      const cy = row * cellHeight + cellHeight / 2;
      const radius = 28 + frameIndex * 14;

      shapes += `
        <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#ffffff" opacity="${0.35 + frameIndex * 0.12}" />
        <circle cx="${cx}" cy="${cy}" r="${Math.max(8, radius * 0.45)}" fill="#c9f7ff" opacity="0.9" />
        <circle cx="${cx - radius * 0.8}" cy="${cy - radius * 0.35}" r="${Math.max(4, radius * 0.16)}" fill="#ffffff" opacity="0.75" />
        <circle cx="${cx + radius * 0.7}" cy="${cy + radius * 0.28}" r="${Math.max(4, radius * 0.13)}" fill="#ffffff" opacity="0.65" />
      `;
    }
  }

  const safeEffectName = String(effectName || "fallback").replace(/[<>&'"]/g, "");

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${CHROMA_BG_HEX}" />
      <g>
        ${shapes}
      </g>
      <!-- ${safeEffectName} fallback effect sheet -->
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return buffer.toString("base64");
}

async function generateEditedImageBase64({
  sourceBlob,
  prompt,
  size = SHEET_SIZE,
  quality = IMAGE_QUALITY,
  background = IMAGE_BACKGROUND,
}) {
  try {
    return await runOpenAIImageRequestWithRetry({
      label: "character animation edit sheet",
      prompt,
      request: async (retryPrompt) => {
        return await openai.images.edit({
          model: IMAGE_MODEL,
          image: await toFile(sourceBlob, "reference.png", {
            type: sourceBlob?.type || "image/png",
          }),
          prompt: retryPrompt,
          size,
          quality,
          background,
          n: 1,
        });
      },
    });
  } catch (error) {
    if (error?.name !== "ImageRetryExhaustedError") {
      throw error;
    }

    console.warn(
      "⚠️ Character animation image generation exhausted retries. Using local static fallback sheet so character generation can continue.",
      {
        message: getOpenAIErrorMessage(error?.lastError).slice(0, 500),
        code: getOpenAIErrorCode(error?.lastError),
        type: getOpenAIErrorType(error?.lastError),
      }
    );

    return await createStaticFallbackSheetFromSourceBlob({
      sourceBlob,
      size,
    });
  }
}

async function generateImageBase64({
  prompt,
  size = EFFECT_SHEET_SIZE,
  quality = IMAGE_QUALITY,
  background = IMAGE_BACKGROUND,
}) {
  try {
    return await runOpenAIImageRequestWithRetry({
      label: "effect animation sheet",
      prompt,
      request: async (retryPrompt) => {
        return await openai.images.generate({
          model: IMAGE_MODEL,
          prompt: retryPrompt,
          size,
          quality,
          background,
          n: 1,
        });
      },
    });
  } catch (error) {
    if (error?.name !== "ImageRetryExhaustedError") {
      throw error;
    }

    console.warn(
      "⚠️ Effect image generation exhausted retries. Using local simple fallback effect sheet so character generation can continue.",
      {
        message: getOpenAIErrorMessage(error?.lastError).slice(0, 500),
        code: getOpenAIErrorCode(error?.lastError),
        type: getOpenAIErrorType(error?.lastError),
      }
    );

    return await createSimpleEffectFallbackSheetBase64({
      size,
      effectName: "fallback effect",
    });
  }
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function removeChromaBackground(
  inputBuffer,
  bg = CHROMA_BG_RGB,
  threshold = CHROMA_THRESHOLD
) {
  const image = sharp(inputBuffer).ensureAlpha();
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to read image dimensions for chroma removal.");
  }

  const raw = await image.raw().toBuffer();

  for (let i = 0; i < raw.length; i += 4) {
    const r = raw[i];
    const g = raw[i + 1];
    const b = raw[i + 2];
    const a = raw[i + 3];

    if (a === 0) continue;

    const dr = r - bg.r;
    const dg = g - bg.g;
    const db = b - bg.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);

    if (distance <= threshold) {
      raw[i + 3] = 0;
    }
  }

  return await sharp(raw, {
    raw: {
      width: metadata.width,
      height: metadata.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

async function getAlphaRawData(buffer) {
  const image = sharp(buffer).ensureAlpha();
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to read image dimensions.");
  }

  const raw = await image.raw().toBuffer();

  return {
    raw,
    width: metadata.width,
    height: metadata.height,
  };
}

async function clearSheetGridGutters({
  buffer,
  cols = SHEET_COLS,
  rows = SHEET_ROWS,
  gutterPixels = SHEET_GRID_GUTTER_PIXELS,
}) {
  const { raw, width, height } = await getAlphaRawData(buffer);
  const gutter = Math.max(0, Math.floor(gutterPixels));

  if (gutter <= 0 || (cols <= 1 && rows <= 1)) {
    return buffer;
  }

  function clearPixel(x, y) {
    const idx = (y * width + x) * 4;
    raw[idx] = 0;
    raw[idx + 1] = 0;
    raw[idx + 2] = 0;
    raw[idx + 3] = 0;
  }

  const halfLeft = Math.floor(gutter / 2);
  const halfRight = gutter - halfLeft;

  for (let col = 1; col < cols; col++) {
    const boundaryX = Math.floor((width * col) / cols);
    const startX = clampNumber(boundaryX - halfLeft, 0, width);
    const endX = clampNumber(boundaryX + halfRight, 0, width);

    for (let y = 0; y < height; y++) {
      for (let x = startX; x < endX; x++) {
        clearPixel(x, y);
      }
    }
  }

  for (let row = 1; row < rows; row++) {
    const boundaryY = Math.floor((height * row) / rows);
    const startY = clampNumber(boundaryY - halfLeft, 0, height);
    const endY = clampNumber(boundaryY + halfRight, 0, height);

    for (let y = startY; y < endY; y++) {
      for (let x = 0; x < width; x++) {
        clearPixel(x, y);
      }
    }
  }

  return await sharp(raw, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

function findNonTransparentBoundsInRegion({
  raw,
  imageWidth,
  imageHeight,
  regionLeft,
  regionTop,
  regionWidth,
  regionHeight,
  alphaThreshold = FRAME_ALPHA_THRESHOLD,
}) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const startX = clampNumber(Math.floor(regionLeft), 0, imageWidth - 1);
  const startY = clampNumber(Math.floor(regionTop), 0, imageHeight - 1);
  const endX = clampNumber(Math.ceil(regionLeft + regionWidth), 0, imageWidth);
  const endY = clampNumber(Math.ceil(regionTop + regionHeight), 0, imageHeight);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * imageWidth + x) * 4;
      const alpha = raw[idx + 3];

      if (alpha > alphaThreshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (
    minX === Infinity ||
    minY === Infinity ||
    maxX === -Infinity ||
    maxY === -Infinity
  ) {
    return null;
  }

  return {
    left: minX,
    top: minY,
    right: maxX,
    bottom: maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function unionBounds(boundsList) {
  if (!boundsList || !boundsList.length) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const bounds of boundsList) {
    if (bounds.left < minX) minX = bounds.left;
    if (bounds.top < minY) minY = bounds.top;
    if (bounds.right > maxX) maxX = bounds.right;
    if (bounds.bottom > maxY) maxY = bounds.bottom;
  }

  return {
    left: minX,
    top: minY,
    right: maxX,
    bottom: maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function medianNumber(values, fallback = 1) {
  const nums = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);

  if (!nums.length) return fallback;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 1 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function weightedPercentileIndex(weights, percentile) {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (!total) return 0;

  const target = total * percentile;
  let running = 0;

  for (let i = 0; i < weights.length; i++) {
    running += weights[i];
    if (running >= target) return i;
  }

  return Math.max(0, weights.length - 1);
}

async function getSilhouetteMetrics(
  buffer,
  alphaThreshold = FRAME_ALPHA_THRESHOLD
) {
  const { raw, width, height } = await getAlphaRawData(buffer);
  const colWeights = Array(width).fill(0);
  const rowWeights = Array(height).fill(0);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let mass = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = raw[(y * width + x) * 4 + 3];
      if (alpha <= alphaThreshold) continue;

      const weight = alpha;
      colWeights[x] += weight;
      rowWeights[y] += weight;
      mass += weight;
      sumX += x * weight;
      sumY += y * weight;

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (!mass) {
    const fallbackBounds = {
      left: 0,
      top: 0,
      right: width - 1,
      bottom: height - 1,
      width,
      height,
    };

    return {
      bounds: fallbackBounds,
      coreBounds: fallbackBounds,
      centroidX: width / 2,
      centroidY: height / 2,
      visualAnchorX: width / 2,
      visualAnchorY: height / 2,
      visualSize: Math.sqrt(width * height),
      mass: 0,
      width,
      height,
    };
  }

  const coreLeft = weightedPercentileIndex(colWeights, 0.08);
  const coreRight = weightedPercentileIndex(colWeights, 0.92);
  const coreTop = weightedPercentileIndex(rowWeights, 0.08);
  const coreBottom = weightedPercentileIndex(rowWeights, 0.94);
  const coreBounds = {
    left: Math.min(coreLeft, coreRight),
    top: Math.min(coreTop, coreBottom),
    right: Math.max(coreLeft, coreRight),
    bottom: Math.max(coreTop, coreBottom),
  };
  coreBounds.width = coreBounds.right - coreBounds.left + 1;
  coreBounds.height = coreBounds.bottom - coreBounds.top + 1;

  const centroidX = sumX / mass;
  const centroidY = sumY / mass;
  const coreCenterX = coreBounds.left + coreBounds.width / 2;
  const coreCenterY = coreBounds.top + coreBounds.height / 2;

  return {
    bounds: {
      left: minX,
      top: minY,
      right: maxX,
      bottom: maxY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
    coreBounds,
    centroidX,
    centroidY,
    visualAnchorX: coreCenterX * 0.7 + centroidX * 0.3,
    visualAnchorY: coreCenterY * 0.7 + centroidY * 0.3,
    visualSize: Math.sqrt(coreBounds.width * coreBounds.height),
    mass,
    width,
    height,
  };
}

function padBounds(bounds, padding, imageWidth, imageHeight) {
  const left = clampNumber(bounds.left - padding, 0, imageWidth - 1);
  const top = clampNumber(bounds.top - padding, 0, imageHeight - 1);
  const right = clampNumber(bounds.right + padding, 0, imageWidth - 1);
  const bottom = clampNumber(bounds.bottom + padding, 0, imageHeight - 1);

  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function clampBoundsToRect(bounds, clipRect) {
  const left = Math.max(bounds.left, clipRect.left);
  const top = Math.max(bounds.top, clipRect.top);
  const right = Math.min(bounds.right, clipRect.right);
  const bottom = Math.min(bounds.bottom, clipRect.bottom);

  if (right < left || bottom < top) {
    return {
      ...clipRect,
      width: clipRect.right - clipRect.left + 1,
      height: clipRect.bottom - clipRect.top + 1,
    };
  }

  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function boundsTouchesRectEdge(bounds, rect, tolerance = 1) {
  return (
    bounds.left <= rect.left + tolerance ||
    bounds.top <= rect.top + tolerance ||
    bounds.right >= rect.right - tolerance ||
    bounds.bottom >= rect.bottom - tolerance
  );
}

function rectsIntersect(a, b) {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

function computeAnchorRect({
  regionLeft,
  regionTop,
  regionWidth,
  regionHeight,
  insetRatio = 0.14,
  minInset = 8,
}) {
  const insetX = Math.min(
    Math.max(minInset, Math.floor(regionWidth * insetRatio)),
    Math.max(minInset, Math.floor(regionWidth * 0.28))
  );
  const insetY = Math.min(
    Math.max(minInset, Math.floor(regionHeight * insetRatio)),
    Math.max(minInset, Math.floor(regionHeight * 0.28))
  );

  return {
    left: regionLeft + insetX,
    top: regionTop + insetY,
    right: regionLeft + regionWidth - insetX - 1,
    bottom: regionTop + regionHeight - insetY - 1,
    width: Math.max(1, regionWidth - insetX * 2),
    height: Math.max(1, regionHeight - insetY * 2),
  };
}

function collectConnectedComponentsInRegion({
  raw,
  imageWidth,
  imageHeight,
  regionLeft,
  regionTop,
  regionWidth,
  regionHeight,
  alphaThreshold = FRAME_ALPHA_THRESHOLD,
}) {
  const startX = clampNumber(Math.floor(regionLeft), 0, imageWidth - 1);
  const startY = clampNumber(Math.floor(regionTop), 0, imageHeight - 1);
  const endX = clampNumber(Math.ceil(regionLeft + regionWidth), 0, imageWidth);
  const endY = clampNumber(Math.ceil(regionTop + regionHeight), 0, imageHeight);

  const localWidth = Math.max(0, endX - startX);
  const localHeight = Math.max(0, endY - startY);

  if (localWidth <= 0 || localHeight <= 0) {
    return {
      components: [],
      startX,
      startY,
      endX,
      endY,
      localWidth,
      localHeight,
    };
  }

  const visited = new Uint8Array(localWidth * localHeight);
  const components = [];
  const queueX = [];
  const queueY = [];

  function localIndex(x, y) {
    return (y - startY) * localWidth + (x - startX);
  }

  function isOpaque(x, y) {
    const idx = (y * imageWidth + x) * 4;
    return raw[idx + 3] > alphaThreshold;
  }

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const li = localIndex(x, y);
      if (visited[li]) continue;
      visited[li] = 1;

      if (!isOpaque(x, y)) continue;

      let count = 0;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;

      queueX.length = 0;
      queueY.length = 0;
      queueX.push(x);
      queueY.push(y);

      for (let q = 0; q < queueX.length; q++) {
        const cx = queueX[q];
        const cy = queueY[q];
        count++;

        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
          [cx - 1, cy - 1],
          [cx + 1, cy - 1],
          [cx - 1, cy + 1],
          [cx + 1, cy + 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx < startX || nx >= endX || ny < startY || ny >= endY) continue;
          const nli = localIndex(nx, ny);
          if (visited[nli]) continue;
          visited[nli] = 1;
          if (!isOpaque(nx, ny)) continue;
          queueX.push(nx);
          queueY.push(ny);
        }
      }

      const bounds = {
        pixelCount: count,
        left: minX,
        top: minY,
        right: maxX,
        bottom: maxY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      };

      components.push({
        ...bounds,
        centerX: bounds.left + bounds.width / 2,
        centerY: bounds.top + bounds.height / 2,
      });
    }
  }

  return {
    components,
    startX,
    startY,
    endX,
    endY,
    localWidth,
    localHeight,
  };
}

function findConnectedComponentBoundsInRegion({
  raw,
  imageWidth,
  imageHeight,
  regionLeft,
  regionTop,
  regionWidth,
  regionHeight,
  alphaThreshold = FRAME_ALPHA_THRESHOLD,
  minComponentPixels = 24,
}) {
  const {
    components,
    localWidth,
    localHeight,
  } = collectConnectedComponentsInRegion({
    raw,
    imageWidth,
    imageHeight,
    regionLeft,
    regionTop,
    regionWidth,
    regionHeight,
    alphaThreshold,
  });

  if (!components.length || localWidth <= 0 || localHeight <= 0) return null;

  components.sort((a, b) => b.pixelCount - a.pixelCount);

  const largest = components[0].pixelCount;
  const dynamicMinPixels = Math.max(
    minComponentPixels,
    Math.floor(localWidth * localHeight * 0.00015)
  );

  const anchorRect = computeAnchorRect({
    regionLeft,
    regionTop,
    regionWidth: localWidth,
    regionHeight: localHeight,
  });

  const regionCenterX = regionLeft + localWidth / 2;
  const regionCenterY = regionTop + localHeight / 2;
  const nearCenterThresholdSq = Math.pow(
    Math.max(10, Math.floor(Math.min(localWidth, localHeight) * 0.18)),
    2
  );

  const ranked = components.map((component) => {
    const intersectsAnchor = rectsIntersect(component, anchorRect);
    const largeEnough =
      component.pixelCount >= dynamicMinPixels ||
      component.pixelCount >= Math.floor(largest * 0.03);

    const centerDistanceSq =
      Math.pow(component.centerX - regionCenterX, 2) +
      Math.pow(component.centerY - regionCenterY, 2);

    return {
      ...component,
      intersectsAnchor,
      largeEnough,
      centerDistanceSq,
    };
  });

  let kept = ranked.filter((c) => c.intersectsAnchor && c.largeEnough);

  if (!kept.length) {
    kept = ranked.filter((c) => c.intersectsAnchor);
  }

  if (!kept.length) {
    kept = ranked.filter(
      (c) => c.largeEnough && c.centerDistanceSq <= nearCenterThresholdSq
    );
  }

  if (!kept.length) {
    kept = ranked.filter((c) => c.largeEnough).slice(0, 1);
  }

  if (!kept.length) {
    kept = [ranked[0]];
  }

  let combined = unionBounds(kept);

  const expandedCombined = padBounds(
    combined,
    Math.max(6, Math.floor(Math.min(localWidth, localHeight) * 0.05)),
    imageWidth,
    imageHeight
  );

  const keepSet = new Set(kept.map((c) => `${c.left}:${c.top}:${c.right}:${c.bottom}`));

  for (const component of ranked) {
    if (keepSet.has(`${component.left}:${component.top}:${component.right}:${component.bottom}`)) {
      continue;
    }

    const shouldAttach =
      component.pixelCount >= Math.max(8, Math.floor(largest * 0.012)) &&
      (
        rectsIntersect(component, expandedCombined) ||
        component.centerDistanceSq <= nearCenterThresholdSq
      );

    if (shouldAttach) {
      kept.push(component);
      keepSet.add(`${component.left}:${component.top}:${component.right}:${component.bottom}`);
    }
  }

  return unionBounds(kept);
}

async function trimTransparentBuffer(
  buffer,
  alphaThreshold = FRAME_ALPHA_THRESHOLD
) {
  const { raw, width, height } = await getAlphaRawData(buffer);

  const cropBounds =
    findConnectedComponentBoundsInRegion({
      raw,
      imageWidth: width,
      imageHeight: height,
      regionLeft: 0,
      regionTop: 0,
      regionWidth: width,
      regionHeight: height,
      alphaThreshold,
      minComponentPixels: 12,
    }) || {
      left: 0,
      top: 0,
      right: width - 1,
      bottom: height - 1,
      width,
      height,
    };

  if (
    cropBounds.left === 0 &&
    cropBounds.top === 0 &&
    cropBounds.right === width - 1 &&
    cropBounds.bottom === height - 1
  ) {
    // If no better subject bounds were found, do a final plain alpha trim so
    // we still remove empty transparent padding without pulling in neighboring debris.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const alpha = raw[idx + 3];

        if (alpha > alphaThreshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (
      minX !== Infinity &&
      minY !== Infinity &&
      maxX !== -Infinity &&
      maxY !== -Infinity
    ) {
      cropBounds.left = minX;
      cropBounds.top = minY;
      cropBounds.right = maxX;
      cropBounds.bottom = maxY;
      cropBounds.width = maxX - minX + 1;
      cropBounds.height = maxY - minY + 1;
    }
  }

  const trimmedBuffer = await sharp(buffer)
    .extract({
      left: cropBounds.left,
      top: cropBounds.top,
      width: cropBounds.width,
      height: cropBounds.height,
    })
    .png()
    .toBuffer();

  return {
    buffer: trimmedBuffer,
    bounds: cropBounds,
    trimmed: true,
  };
}

async function centerBufferOnTransparentCanvas({
  buffer,
  outputWidth,
  outputHeight,
  anchorX = null,
  anchorY = null,
  outputAnchorX = null,
  outputAnchorY = null,
}) {
  const meta = await sharp(buffer).metadata();
  const inputWidth = meta.width || outputWidth;
  const inputHeight = meta.height || outputHeight;

  const hasAnchor =
    Number.isFinite(anchorX) &&
    Number.isFinite(anchorY) &&
    Number.isFinite(outputAnchorX) &&
    Number.isFinite(outputAnchorY);
  const rawLeft = hasAnchor
    ? Math.round(outputAnchorX - anchorX)
    : Math.floor((outputWidth - inputWidth) / 2);
  const rawTop = hasAnchor
    ? Math.round(outputAnchorY - anchorY)
    : Math.floor((outputHeight - inputHeight) / 2);
  const left = clampNumber(rawLeft, 0, Math.max(0, outputWidth - inputWidth));
  const top = clampNumber(rawTop, 0, Math.max(0, outputHeight - inputHeight));

  return await sharp({
    create: {
      width: outputWidth,
      height: outputHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: buffer,
        left,
        top,
      },
    ])
    .png()
    .toBuffer();
}

async function splitSheetAndUpload({
  sheetBase64,
  destPrefix,
  cols = SHEET_COLS,
  rows = SHEET_ROWS,
  normalizeSubject = true,
}) {
  const { pureBase64 } = normalizeBase64(sheetBase64, "image/png");
  const originalSheetBuffer = Buffer.from(pureBase64, "base64");

  // Remove the chroma background so transparent bounds can be detected reliably.
  const sheetBuffer = await removeChromaBackground(
    originalSheetBuffer,
    CHROMA_BG_RGB,
    CHROMA_THRESHOLD
  );
  const isolatedSheetBuffer = await clearSheetGridGutters({
    buffer: sheetBuffer,
    cols,
    rows,
  });

  const sheetUrl = await uploadBufferToFirebase(
    isolatedSheetBuffer,
    `${destPrefix}/sheet.png`,
    "image/png"
  );

  const { raw, width: sheetWidth, height: sheetHeight } = await getAlphaRawData(
    isolatedSheetBuffer
  );

  const roughCellWidth = Math.floor(sheetWidth / cols);
  const roughCellHeight = Math.floor(sheetHeight / rows);
  const DETECTION_SAFETY_PADDING = FRAME_CROP_PADDING;
  const CANVAS_MARGIN = 18;
  const preparedFrames = [];

  // Expected order:
  // 0 1
  // 2 3
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;

      const regionLeft = col * roughCellWidth;
      const regionTop = row * roughCellHeight;
      const regionWidth =
        col === cols - 1 ? sheetWidth - regionLeft : roughCellWidth;
      const regionHeight =
        row === rows - 1 ? sheetHeight - regionTop : roughCellHeight;
      const sourceCellBounds = {
        left: regionLeft,
        top: regionTop,
        right: regionLeft + regionWidth - 1,
        bottom: regionTop + regionHeight - 1,
        width: regionWidth,
        height: regionHeight,
      };
      const sourceCellAnchorX = regionLeft + regionWidth / 2;
      const sourceCellAnchorY = regionTop + regionHeight / 2;

      let detectedBounds =
        findConnectedComponentBoundsInRegion({
          raw,
          imageWidth: sheetWidth,
          imageHeight: sheetHeight,
          regionLeft,
          regionTop,
          regionWidth,
          regionHeight,
          alphaThreshold: FRAME_ALPHA_THRESHOLD,
        }) ||
        findNonTransparentBoundsInRegion({
          raw,
          imageWidth: sheetWidth,
          imageHeight: sheetHeight,
          regionLeft,
          regionTop,
          regionWidth,
          regionHeight,
          alphaThreshold: FRAME_ALPHA_THRESHOLD,
        });

      if (!detectedBounds) {
        console.warn(
          `No visible pixels found for frame ${index} in ${destPrefix}; using rough cell fallback.`
        );

        detectedBounds = {
          left: regionLeft,
          top: regionTop,
          right: regionLeft + regionWidth - 1,
          bottom: regionTop + regionHeight - 1,
          width: regionWidth,
          height: regionHeight,
        };
      }

      const detectedBoundsClampedToCell = clampBoundsToRect(
        detectedBounds,
        sourceCellBounds
      );
      const paddedBounds = clampBoundsToRect(
        padBounds(
          detectedBoundsClampedToCell,
          DETECTION_SAFETY_PADDING,
          sheetWidth,
          sheetHeight
        ),
        sourceCellBounds
      );
      const touchesCellBoundary = boundsTouchesRectEdge(
        detectedBounds,
        sourceCellBounds,
        SHEET_GRID_GUTTER_PIXELS
      );

      if (touchesCellBoundary) {
        console.warn(
          `Frame ${index} in ${destPrefix} touches a sheet cell boundary; extraction was clamped to prevent sprite bleed.`
        );
      }

      const extractedBuffer = await sharp(isolatedSheetBuffer)
        .extract({
          left: paddedBounds.left,
          top: paddedBounds.top,
          width: paddedBounds.width,
          height: paddedBounds.height,
        })
        .png()
        .toBuffer();

      // Tight-trim inside the padded extraction so we keep the full character,
      // then later center every frame onto one common canvas for smooth playback.
      const trimmed = await trimTransparentBuffer(
        extractedBuffer,
        FRAME_ALPHA_THRESHOLD
      );
      const silhouette = await getSilhouetteMetrics(
        trimmed.buffer,
        FRAME_ALPHA_THRESHOLD
      );
      const anchorXInTrimmedFrame =
        sourceCellAnchorX - (paddedBounds.left + trimmed.bounds.left);
      const anchorYInTrimmedFrame =
        sourceCellAnchorY - (paddedBounds.top + trimmed.bounds.top);

      preparedFrames.push({
        index,
        sourceCell: {
          left: regionLeft,
          top: regionTop,
          width: regionWidth,
          height: regionHeight,
          anchorX: sourceCellAnchorX,
          anchorY: sourceCellAnchorY,
        },
        detectedBoundsOnSheet: detectedBounds,
        detectedBoundsClampedToCell,
        paddedBoundsOnSheet: paddedBounds,
        touchesCellBoundary,
        tightBoundsInExtraction: trimmed.bounds,
        silhouette,
        anchorXInTrimmedFrame,
        anchorYInTrimmedFrame,
        trimmedBuffer: trimmed.buffer,
        trimmedWidth: trimmed.bounds.width,
        trimmedHeight: trimmed.bounds.height,
      });
    }
  }

  const targetCoreWidth = medianNumber(
    preparedFrames.map((frame) => frame.silhouette?.coreBounds?.width),
    roughCellWidth * 0.55
  );
  const targetCoreHeight = medianNumber(
    preparedFrames.map((frame) => frame.silhouette?.coreBounds?.height),
    roughCellHeight * 0.55
  );
  const targetVisualSize = medianNumber(
    preparedFrames.map((frame) => frame.silhouette?.visualSize),
    Math.sqrt(targetCoreWidth * targetCoreHeight)
  );
  const normalizedFrames = [];

  for (const frame of preparedFrames) {
    const coreBounds = frame.silhouette?.coreBounds || {
      width: frame.trimmedWidth,
      height: frame.trimmedHeight,
    };
    const visualSize =
      Number(frame.silhouette?.visualSize) ||
      Math.sqrt(Math.max(1, frame.trimmedWidth * frame.trimmedHeight));
    const byHeight = targetCoreHeight / Math.max(1, coreBounds.height);
    const byArea = targetVisualSize / Math.max(1, visualSize);
    const byWidth = targetCoreWidth / Math.max(1, coreBounds.width);
    const scale = normalizeSubject
      ? clampNumber(byHeight * 0.6 + byArea * 0.3 + byWidth * 0.1, 0.65, 1.45)
      : 1;
    const normalizedWidth = Math.max(1, Math.round(frame.trimmedWidth * scale));
    const normalizedHeight = Math.max(1, Math.round(frame.trimmedHeight * scale));
    const normalizedBuffer =
      Math.abs(scale - 1) > 0.01
        ? await sharp(frame.trimmedBuffer)
            .resize({
              width: normalizedWidth,
              height: normalizedHeight,
              fit: "fill",
              kernel: sharp.kernel.lanczos3,
            })
            .png()
            .toBuffer()
        : frame.trimmedBuffer;
    const visualAnchorX = Number.isFinite(frame.silhouette?.visualAnchorX)
      ? frame.silhouette.visualAnchorX
      : frame.anchorXInTrimmedFrame;
    const visualAnchorY = Number.isFinite(frame.silhouette?.visualAnchorY)
      ? frame.silhouette.visualAnchorY
      : frame.anchorYInTrimmedFrame;

    normalizedFrames.push({
      ...frame,
      normalizedBuffer,
      normalizedWidth,
      normalizedHeight,
      normalizationScale: scale,
      normalizedAnchorX: visualAnchorX * scale,
      normalizedAnchorY: visualAnchorY * scale,
    });
  }

  const leftExtent = Math.max(
    1,
    ...normalizedFrames.map((f) => Math.max(0, f.normalizedAnchorX))
  );
  const rightExtent = Math.max(
    1,
    ...normalizedFrames.map((f) => Math.max(0, f.normalizedWidth - f.normalizedAnchorX))
  );
  const topExtent = Math.max(
    1,
    ...normalizedFrames.map((f) => Math.max(0, f.normalizedAnchorY))
  );
  const bottomExtent = Math.max(
    1,
    ...normalizedFrames.map((f) => Math.max(0, f.normalizedHeight - f.normalizedAnchorY))
  );
  const horizontalExtent = Math.max(leftExtent, rightExtent);
  const verticalExtent = Math.max(topExtent, bottomExtent);
  const targetFrameWidth =
    Math.ceil(horizontalExtent * 2) + CANVAS_MARGIN * 2;
  const targetFrameHeight =
    Math.ceil(verticalExtent * 2) + CANVAS_MARGIN * 2;
  const targetAnchorX = targetFrameWidth / 2;
  const targetAnchorY = targetFrameHeight / 2;

  const frameUrls = [];
  const framePaths = [];
  const frameBounds = [];
  const frameSizes = [];

  for (const frame of normalizedFrames) {
    const centeredFrameBuffer = await centerBufferOnTransparentCanvas({
      buffer: frame.normalizedBuffer,
      outputWidth: targetFrameWidth,
      outputHeight: targetFrameHeight,
      anchorX: frame.normalizedAnchorX,
      anchorY: frame.normalizedAnchorY,
      outputAnchorX: targetAnchorX,
      outputAnchorY: targetAnchorY,
    });

    const framePath = `${destPrefix}/frame${frame.index}.png`;
    const frameUrl = await uploadBufferToFirebase(
      centeredFrameBuffer,
      framePath,
      "image/png"
    );

    framePaths.push(`champs/${framePath}`);
    frameUrls.push(frameUrl);
    frameBounds.push({
      index: frame.index,
      sourceCell: frame.sourceCell,
      detectedBoundsOnSheet: frame.detectedBoundsOnSheet,
      detectedBoundsClampedToCell: frame.detectedBoundsClampedToCell,
      paddedBoundsOnSheet: frame.paddedBoundsOnSheet,
      touchesCellBoundary: frame.touchesCellBoundary,
      tightBoundsInExtraction: frame.tightBoundsInExtraction,
      silhouette: frame.silhouette,
      anchorXInTrimmedFrame: frame.anchorXInTrimmedFrame,
      anchorYInTrimmedFrame: frame.anchorYInTrimmedFrame,
      normalizedAnchorX: frame.normalizedAnchorX,
      normalizedAnchorY: frame.normalizedAnchorY,
      targetAnchorX,
      targetAnchorY,
    });
    frameSizes.push({
      index: frame.index,
      originalTrimmedWidth: frame.trimmedWidth,
      originalTrimmedHeight: frame.trimmedHeight,
      normalizedWidth: frame.normalizedWidth,
      normalizedHeight: frame.normalizedHeight,
      normalizationScale: frame.normalizationScale,
      finalCanvasWidth: targetFrameWidth,
      finalCanvasHeight: targetFrameHeight,
    });
  }

  return {
    sheetUrl,
    frameUrls,
    framePaths,
    sheetWidth,
    sheetHeight,
    roughCellWidth,
    roughCellHeight,
    frameWidth: targetFrameWidth,
    frameHeight: targetFrameHeight,
    frameSizes,
    frameBounds,
    targetCoreWidth,
    targetCoreHeight,
    targetVisualSize,
    normalizeSubject,
    frameCount: cols * rows,
    cols,
    rows,
    gridGutterPixels: SHEET_GRID_GUTTER_PIXELS,
    extractionMode: normalizeSubject
      ? "grid-gutter-isolated-core-silhouette-normalized-shared-anchor-canvas"
      : "grid-gutter-isolated-core-silhouette-shared-anchor-canvas",
  };
}

// ===================== PROMPTS ===================== //

function buildIdleSheetPrompt(charObj) {
  return [
    `Generate a sprite sheet for this exact character using the provided reference image.`,
    `The sheet must contain exactly 4 full-body animation frames total, no more and no fewer.`,
    `Arrange the 4 frames in a 2x2 grid: frame 1 top-left, frame 2 top-right, frame 3 bottom-left, frame 4 bottom-right.`,
    ` Do not create extra duplicate characters. Do not create more than one character pose inside any quadrant.`,
    `Each quadrant must contain exactly one centered full-body version of the character.`,
    `This is the character's idle or waiting animation.`,
    `Show the character in a battle-ready idle stance or fighting style that fits the character's identity, design, weapon, clothing, and overall fantasy role.`,
    `If the character has a weapon, do not have the champion hold or wield it in the hands during the idle animation.`,
    `If the character has a weapon, keep it stowed on the champion's back in every idle frame.`,
    `The idle animation should show the champion waiting or guarding, not actively attacking.`,
    `Use the character description to infer the fighting stance: ${charObj?.description || ""}.`,
    `Across the 4 frames, show a subtle looping idle animation with small natural changes such as breathing, stance shifts, guarding motion, cloth sway, hair sway, weapon readiness, or a blink.`,
    `Each of the 4 frames must be visibly different but still subtle enough for a waiting animation.`,
    `Frame 4 should transition naturally back to frame 1.`,
    `Keep the character facing to the right in every frame.`,
    `Use the exact same character scale, same camera angle, and same full-body placement in every frame.`,
    `The character must not become larger or smaller between frames; only the pose may change.`,
    `Keep the character's torso/body core centered on the exact center of each quadrant in every frame so the animation does not jump around.`,
    `Keep the character's feet or lowest body point at the same vertical height in all 4 frames.`,
    `Keep clear empty space around the character so the character sits comfortably centered inside each quadrant.`,
    `Scale the character much smaller than normal: the complete character silhouette must occupy no more than ${SUBJECT_MAX_QUADRANT_OCCUPANCY_PERCENT}% of the quadrant width and ${SUBJECT_MAX_QUADRANT_OCCUPANCY_PERCENT}% of the quadrant height.`,
    `Leave at least ${SUBJECT_MIN_QUADRANT_PADDING_PERCENT}% empty magenta padding on the left, right, top, and bottom of every quadrant.`,
    `The full body, hair, clothing, armor, stowed weapon, and any pose motion must stay fully inside that safe inner area.`,
    `Leave a very wide empty magenta gutter around every quadrant edge and around the invisible vertical and horizontal center dividers.`,
    `No part of any pose may touch or cross into another quadrant, especially frame 3 bottom-left into frame 4 bottom-right.`,
    `Do not draw any border, box, panel, cell outline, frame outline, grid line, separator, divider, or comic-style frame around the poses.`,
    `The whole sheet should look like 4 poses arranged on one continuous flat background.`,
    `Use a flat vivid magenta solid background (${CHROMA_BG_HEX}) across the whole sheet so the background is a single removable color.`,
    `No text, no labels, no watermark.`,
  ].join(" ");
}

function buildMoveSheetPrompt(move) {
  return [
    `Generate a sprite sheet for this exact character using the provided reference image.`,
    `The sheet must contain exactly 4 full-body animation frames total, no more and no fewer.`,
    `Arrange the 4 frames in a 2x2 grid: frame 1 top-left, frame 2 top-right, frame 3 bottom-left, frame 4 bottom-right.`,
    ` Do not create extra duplicate characters. Do not create more than one character pose inside any quadrant.`,
    `Each quadrant must contain exactly one centered full-body version of the character.`,
    `This is an action animation for the move "${move.name}".`,
    `Move description: ${move.description}.`,
    `Move type: ${move.type}. Move effect: ${move.effect}.`,
    `Frame 1 should show anticipation or ready stance.`,
    `Frame 2 should show the action beginning.`,
    `Frame 3 should show the strike, cast, or impact peak.`,
    `Frame 4 should show follow-through or recovery.`,
    `Each frame should be different and should continue the motion from the previous frame.`,
    `Keep the character facing to the right in every frame.`,
    `Use the exact same character scale, same camera angle, and same full-body placement in every frame.`,
    `The character must not become larger or smaller between frames; only the pose may change.`,
    `Keep the character's torso/body core centered on the exact center of each quadrant in every frame so the animation does not jump around.`,
    `Keep the character's feet or lowest body point at the same vertical height in all 4 frames.`,
    `Keep clear empty space around the character so the character sits comfortably centered inside each quadrant.`,
    `Scale the character much smaller than normal: the complete character silhouette, including the widest attack pose, must occupy no more than ${SUBJECT_MAX_QUADRANT_OCCUPANCY_PERCENT}% of the quadrant width and ${SUBJECT_MAX_QUADRANT_OCCUPANCY_PERCENT}% of the quadrant height.`,
    `Leave at least ${SUBJECT_MIN_QUADRANT_PADDING_PERCENT}% empty magenta padding on the left, right, top, and bottom of every quadrant.`,
    `The full body, hair, clothing, armor, weapon arcs, magic around the body, and action pose must stay fully inside that safe inner area.`,
    `Leave a very wide empty magenta gutter around every quadrant edge and around the invisible vertical and horizontal center dividers.`,
    `No part of any pose may touch or cross into another quadrant, especially frame 3 bottom-left into frame 4 bottom-right.`,
    `Do not draw any border, box, panel, cell outline, frame outline, grid line, separator, divider, or comic-style frame around the poses.`,
    `The whole sheet should look like 4 poses arranged on one continuous flat background.`,
    `Use a flat vivid magenta solid background (${CHROMA_BG_HEX}) across the whole sheet so the background is a single removable color.`,
    `No text, no labels, no watermark.`,
  ].join(" ");
}

function buildMoveVisualSheetPrompt(move) {
  return [
    `Generate a particle or effect animation sheet for the move "${move.name}".`,
    `The sheet must contain exactly 4 animation frames total, no more and no fewer.`,
    `Arrange the 4 frames in a 2x2 grid: frame 1 top-left, frame 2 top-right, frame 3 bottom-left, frame 4 bottom-right.`,
    ` Do not create extra effects outside the four quadrants. Do not create more than one effect stage inside any quadrant.`,
    `This is only the move visual or particle effect after the character uses the move.`,
    `Do not include the character, hands, held weapons, UI, or text.`,
    `Move description: ${move.description}.`,
    `Move type: ${move.type}. Move effect: ${move.effect}.`,
    `Frame 1 should show the effect beginning.`,
    `Frame 2 should show the effect building.`,
    `Frame 3 should show the effect at peak intensity.`,
    `Frame 4 should show the effect fading or completing.`,
    `Each effect frame must be centered in the middle of its quadrant.`,
    `Each frame should be different and continue the motion from the previous frame.`,
    `Keep clear empty space around the effect so it sits centered inside each quadrant.`,
    `Scale the effect small enough that all particles, trails, glows, and bursts stay fully inside that quadrant.`,
    `Leave a wide empty magenta gutter around every quadrant edge and around the invisible vertical and horizontal center dividers.`,
    `No part of any effect may touch or cross into another quadrant, especially frame 3 bottom-left into frame 4 bottom-right.`,
    `Do not draw any border, box, panel, cell outline, frame outline, grid line, separator, divider, or comic-style frame around the effects.`,
    `The whole sheet should look like 4 effects arranged on one continuous flat background.`,
    `Use a flat vivid magenta solid background (${CHROMA_BG_HEX}) across the whole sheet so the background is a single removable color.`,
    `No text, no labels, no watermark.`,
  ].join(" ");
}

async function generateAnimationSet({
  sourceBlob,
  actionPrompt,
  effectPrompt,
  characterDestPrefix,
  effectDestPrefix,
}) {
  const characterSheetBase64 = await generateEditedImageBase64({
    sourceBlob,
    prompt: actionPrompt,
    size: SHEET_SIZE,
  });

  const characterAnimation = await splitSheetAndUpload({
    sheetBase64: characterSheetBase64,
    destPrefix: characterDestPrefix,
    cols: SHEET_COLS,
    rows: SHEET_ROWS,
  });

  let effectAnimation = null;

  if (effectPrompt && effectDestPrefix) {
    const effectSheetBase64 = await generateImageBase64({
      prompt: effectPrompt,
      size: EFFECT_SHEET_SIZE,
    });

    effectAnimation = await splitSheetAndUpload({
      sheetBase64: effectSheetBase64,
      destPrefix: effectDestPrefix,
      cols: SHEET_COLS,
      rows: SHEET_ROWS,
    });
  }

  return {
    characterAnimation,
    effectAnimation,
  };
}


function decodeIndexerNoteToUtf8(note) {
  if (note == null) return "";

  if (note instanceof Uint8Array) {
    return new TextDecoder().decode(note);
  }

  if (Array.isArray(note)) {
    return new TextDecoder().decode(Uint8Array.from(note));
  }

  if (typeof Buffer !== "undefined" && Buffer.isBuffer(note)) {
    return note.toString("utf8");
  }

  if (typeof note === "string") {
    const trimmed = note.trim();
    if (!trimmed) return "";

    // Some algosdk/indexer responses already expose note as decoded UTF-8.
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return trimmed;
    }

    // Other responses expose note as base64. Only run base64 decoding when the
    // string actually looks like base64; otherwise atob/Buffer can throw the
    // InvalidCharacterError you hit after moving to algosdk v3.
    const compact = trimmed.replace(/\s+/g, "");
    const looksBase64 =
      compact.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(compact);

    if (looksBase64) {
      try {
        return Buffer.from(compact, "base64").toString("utf8");
      } catch (err) {
        console.warn("⚠️ Failed to base64 decode note; using raw string.", err);
      }
    }

    return trimmed;
  }

  return String(note);
}

function getLatestTransactionByRound(txns) {
  const list = Array.isArray(txns) ? [...txns] : [];
  list.sort(sortTxnsInRoundOrder);
  return list[list.length - 1] || null;
}



// ===================== USER GENERATION BUILD CONFIG ===================== //

const NEGATIVE_MOVE_EFFECTS = [
  "poison",
  "bleed",
  "burn",
  "freeze",
  "slow",
  "drown",
  "paralyze",
  "doom",
];

const POSITIVE_MOVE_EFFECTS = [
  "shield",
  "strengthen",
  "focus",
  "empower",
  "nurture",
  "bless",
  "hasten",
  "cleanse",
];

const USER_BUILD_STAT_KEYS = ["strength", "dexterity", "intelligence"];
const USER_BUILD_MOVE_CLASSES = ["damage", "curse", "buff"];
const USER_BUILD_MOVE_RANGES = ["melee", "ranged", "magic"];

function randomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeMoveClass(value) {
  const cleaned = String(value || "").trim().toLowerCase();
  if (USER_BUILD_MOVE_CLASSES.includes(cleaned)) return cleaned;
  return null;
}

function normalizeMoveRange(value) {
  const cleaned = String(value || "").trim().toLowerCase();
  if (USER_BUILD_MOVE_RANGES.includes(cleaned)) return cleaned;
  return null;
}

function normalizeEffectKey(value) {
  const cleaned = String(value || "").trim().toLowerCase();
  if (NEGATIVE_MOVE_EFFECTS.includes(cleaned)) return cleaned;
  if (POSITIVE_MOVE_EFFECTS.includes(cleaned)) return cleaned;
  return null;
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = Number(acc[value] || 0) + 1;
    return acc;
  }, {});
}

function normalizeAndValidateGenerationBuild(rawBuild) {
  if (!rawBuild || typeof rawBuild !== "object") {
    throw new Error("Missing generationBuild. User must complete the champion build before generation.");
  }

  const rawMoves = Array.isArray(rawBuild.moves) ? rawBuild.moves : [];
  if (rawMoves.length !== 3) {
    throw new Error("Invalid generationBuild: exactly 3 moves are required.");
  }

  const moves = rawMoves.map((move, index) => {
    const moveClass = normalizeMoveClass(move.class || String(move.type || "").split(" ")[1]);
    const moveRange = normalizeMoveRange(move.range || String(move.type || "").split(" ")[0]);
    const effect = normalizeEffectKey(move.effect);

    if (!moveClass || !moveRange || !effect) {
      throw new Error(`Invalid generationBuild: move ${index + 1} needs range, class, and effect.`);
    }

    if ((moveClass === "damage" || moveClass === "curse") && !NEGATIVE_MOVE_EFFECTS.includes(effect)) {
      throw new Error(`Invalid generationBuild: move ${index + 1} must use a negative effect.`);
    }

    if (moveClass === "buff" && !POSITIVE_MOVE_EFFECTS.includes(effect)) {
      throw new Error(`Invalid generationBuild: move ${index + 1} must use a positive effect.`);
    }

    return {
      slot: Number(move.slot || index + 1),
      range: moveRange,
      class: moveClass,
      type: `${moveRange} ${moveClass}`,
      effect,
      cooldown: 3,
    };
  });

  const classCounts = countBy(moves.map((move) => move.class));
  const rangeCounts = countBy(moves.map((move) => move.range));

  for (const moveClass of USER_BUILD_MOVE_CLASSES) {
    if (Number(classCounts[moveClass] || 0) > 2) {
      throw new Error(`Invalid generationBuild: only 2 ${moveClass} moves are allowed.`);
    }
  }

  for (const moveRange of USER_BUILD_MOVE_RANGES) {
    if (Number(rangeCounts[moveRange] || 0) > 2) {
      throw new Error(`Invalid generationBuild: only 2 ${moveRange} moves are allowed.`);
    }
  }

  const selectedEffects = moves.map((move) => move.effect);
  if (new Set(selectedEffects).size !== selectedEffects.length) {
    throw new Error("Invalid generationBuild: move effects must be unique.");
  }

  const rawStats = rawBuild.stats || {};
  const stats = USER_BUILD_STAT_KEYS.reduce((acc, key) => {
    acc[key] = Number(rawStats[key] || 0);
    return acc;
  }, {});

  for (const key of USER_BUILD_STAT_KEYS) {
    if (!Number.isInteger(stats[key]) || stats[key] < 0) {
      throw new Error(`Invalid generationBuild: ${key} points must be a non-negative integer.`);
    }
    if (stats[key] > 8) {
      throw new Error(`Invalid generationBuild: ${key} can only have 8 points max.`);
    }
  }

  const statTotal = USER_BUILD_STAT_KEYS.reduce((sum, key) => sum + stats[key], 0);
  if (statTotal !== 10) {
    throw new Error("Invalid generationBuild: exactly 10 stat points are required.");
  }

  const rawEffectPoints = rawBuild.effectPoints || {};
  const effectPoints = selectedEffects.reduce((acc, effectKey) => {
    acc[effectKey] = Number(rawEffectPoints[effectKey] || 0);
    return acc;
  }, {});

  for (const effectKey of selectedEffects) {
    if (!Number.isInteger(effectPoints[effectKey]) || effectPoints[effectKey] < 0) {
      throw new Error(`Invalid generationBuild: ${effectKey} points must be a non-negative integer.`);
    }
    if (effectPoints[effectKey] > 4) {
      throw new Error(`Invalid generationBuild: ${effectKey} can only have 4 effect points max.`);
    }
  }

  const effectTotal = selectedEffects.reduce((sum, effectKey) => sum + Number(effectPoints[effectKey] || 0), 0);
  if (effectTotal !== 6) {
    throw new Error("Invalid generationBuild: exactly 6 effect points are required.");
  }

  return {
    moves,
    stats,
    effectPoints,
    totals: {
      statPointsUsed: statTotal,
      effectPointsUsed: effectTotal,
    },
  };
}

async function getQueuedGenerationRequestForMatch(match) {
  const candidateIds = [
    match?.darkcoinTransferTxId,
    match?.assetConfigTxId,
    match?.configTargetAssetId,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  for (const id of candidateIds) {
    try {
      const snap = await getDoc(doc(db, "queuedChars", id));
      if (snap.exists()) {
        return {
          id,
          ref: snap.ref,
          data: snap.data() || {},
        };
      }
    } catch (error) {
      console.warn("Failed to read queuedChars doc by id:", id, error);
    }
  }

  try {
    const snap = await getDocs(collection(db, "queuedChars"));
    for (const queuedDoc of snap.docs) {
      const data = queuedDoc.data() || {};
      const queuedCandidateValues = [
        queuedDoc.id,
        data.txnId,
        data.paymentTxnId,
        data.darkcoinTransferTxId,
        data.assetConfigTxId,
        data.groupTxId,
        data.champId,
        data.configTargetAssetId,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean);

      if (queuedCandidateValues.some((value) => candidateIds.includes(value))) {
        return {
          id: queuedDoc.id,
          ref: queuedDoc.ref,
          data,
        };
      }
    }
  } catch (error) {
    console.warn("Failed to scan queuedChars for generation request:", error);
  }

  return null;
}

function firstNonEmptyValue(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function buildMatchFromQueuedGenerationRequest(queuedGenerationRequest) {
  const data = queuedGenerationRequest?.data || {};
  const assetId = firstNonEmptyValue(
    data.configTargetAssetId,
    data.champId,
    data.assetId,
    data.championAssetId,
    /^\d+$/.test(String(queuedGenerationRequest?.id || "")) ? queuedGenerationRequest.id : ""
  );

  if (!assetId || !data.generationBuild) return null;

  return {
    groupId: firstNonEmptyValue(data.groupId, data.groupTxId),
    round: Number(data.round || data.confirmedRound || 0) || null,
    darkcoinTransferTxId: firstNonEmptyValue(
      data.darkcoinTransferTxId,
      data.paymentTxnId,
      data.txnId
    ),
    assetConfigTxId: firstNonEmptyValue(
      data.assetConfigTxId,
      data.assetConfigTxnId,
      data.configTxnId
    ),
    configTargetAssetId: assetId,
    receiver: firstNonEmptyValue(data.receiver, TARGET_ADDR),
    amount: Number(data.amount || DARKCOIN_AMOUNT) || DARKCOIN_AMOUNT,
    signer: firstNonEmptyValue(data.signer, CONFIG_SIGNER_ADDR),
    authAddr: firstNonEmptyValue(data.authAddr),
    source: "queuedChars",
    queuedGenerationRequest,
  };
}

async function fetchQueuedGenerationMatches() {
 const jobRef=doc(db,'legacyGenerationJobs',process.env.GENERATION_JOB_ID);
 const snap=await getDoc(jobRef),data=snap.data();
 if(!data||data.schemaVersion!==2)throw Error('Missing verified generation snapshot.');
 return [buildMatchFromQueuedGenerationRequest({id:jobRef.id,ref:jobRef,data})];
}

function normalizeChampionNameRequest(requestData) {
  const randomName = requestData?.randomName !== false;
  const rawName = String(requestData?.championName || "").trim();

  if (randomName || !rawName) {
    return {
      randomName: true,
      championName: null,
      promptText: "Generate a fitting original champion name based on the champion look, equipment, and lore.",
    };
  }

  return {
    randomName: false,
    championName: rawName.slice(0, 32),
    promptText: `Use this exact champion name: ${rawName.slice(0, 32)}.`,
  };
}

function buildUserMovePromptSummary(generationBuild) {
  return generationBuild.moves
    .map((move, index) => `Move ${index + 1}: ${move.type} with ${move.effect}`)
    .join("; ");
}

function buildGeneratedCharacterLogSummary(charObj = {}, assetId = "") {
  return {
    assetId,
    name: charObj.name || "Unnamed Champion",
    stats: {
      health: charObj.health,
      strength: charObj.strength,
      dexterity: charObj.dexterity,
      intelligence: charObj.intelligence,
      speed: charObj.speed,
      resist: charObj.resist,
    },
    moves: Array.isArray(charObj.moves)
      ? charObj.moves.map((move) => ({
          name: move.name,
          type: move.type,
          effect: move.effect,
        }))
      : [],
  };
}


function titleCaseWords(value) {
  return String(value || "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function cleanMoveName(rawName, fallback = "Mystic Art") {
  const cleaned = String(rawName || "")
    .replace(/[^a-zA-Z0-9 '\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 2);
  const result = words.join(" ").trim();

  if (result) return result.slice(0, 32);
  return fallback.slice(0, 32);
}

function getMoveTargetText(moveClass) {
  if (moveClass === "buff") return "self";
  return "enemy";
}

function buildMoveNameFallback(selectedMove, moveIndex = 0) {
  const effect = titleCaseWords(normalizeEffectKey(selectedMove?.effect) || "mystic");
  const moveClass = normalizeMoveClass(selectedMove?.class) || "damage";
  const range = normalizeMoveRange(selectedMove?.range) || "melee";

  const secondWordByClass = {
    damage: range === "magic" ? "Burst" : range === "ranged" ? "Shot" : "Strike",
    curse: "Hex",
    buff: "Aura",
  };

  return cleanMoveName(`${effect} ${secondWordByClass[moveClass] || "Art"}`, `Move ${moveIndex + 1}`);
}

function makeUniqueMoveName(rawName, fallback, usedLower, effect = "mystic") {
  let candidate = cleanMoveName(rawName, fallback);

  if (!usedLower.has(candidate.toLowerCase())) {
    usedLower.add(candidate.toLowerCase());
    return candidate;
  }

  candidate = fallback;
  let suffix = 2;
  while (usedLower.has(candidate.toLowerCase())) {
    candidate = cleanMoveName(`${titleCaseWords(effect)} ${suffix}`, fallback);
    suffix += 1;
  }

  usedLower.add(candidate.toLowerCase());
  return candidate;
}

function buildCreativeMoveNamesFromCharacter({
  selectedMoves = [],
  existingMoves = [],
}) {
  const usedLower = new Set();

  return selectedMoves.map((selectedMove, index) => {
    const effect = normalizeEffectKey(selectedMove?.effect) || "poison";
    const existingMove = existingMoves[index] || {};
    const fallback = buildMoveNameFallback(selectedMove, index);
    return makeUniqueMoveName(existingMove?.name, fallback, usedLower, effect);
  });
}

function buildGeneratedMoveDescription(selectedMove, moveName) {
  const range = normalizeMoveRange(selectedMove?.range) || "melee";
  const moveClass = normalizeMoveClass(selectedMove?.class) || "damage";
  const effect = normalizeEffectKey(selectedMove?.effect) || "poison";
  const effectLabel = titleCaseWords(effect);
  const rangeLabel = titleCaseWords(range).toLowerCase();

  if (moveClass === "damage") {
    return `${moveName} is a ${rangeLabel} damage move that strikes the enemy and applies ${effectLabel}.`;
  }

  if (moveClass === "curse") {
    return `${moveName} is a ${rangeLabel} curse move that weakens the enemy with ${effectLabel}.`;
  }

  if (moveClass === "buff") {
    return `${moveName} is a ${rangeLabel} buff move that empowers the champion with ${effectLabel}.`;
  }

  return `${moveName} is a ${rangeLabel} move that uses ${effectLabel}.`;
}

async function enforceUserGenerationBuildOnCharacter(charObj, generationBuild, context = {}) {
  if (!charObj || !generationBuild) return charObj;

  charObj.strength = 7 + Number(generationBuild.stats.strength || 0);
  charObj.dexterity = 7 + Number(generationBuild.stats.dexterity || 0);
  charObj.intelligence = 7 + Number(generationBuild.stats.intelligence || 0);
  charObj.speed = 50;
  charObj.health = 200;
  charObj.currentHealth = 200;
  charObj.resist = 10;

  const selectedEffects = generationBuild.moves.map((move) => move.effect);
  effectKeys.forEach((effectKey) => {
    charObj[effectKey] = selectedEffects.includes(effectKey)
      ? 1 + Number(generationBuild.effectPoints[effectKey] || 0)
      : 0;
  });

  const existingMoves = Array.isArray(charObj.moves) ? charObj.moves : [];
  const generatedMoveNames = buildCreativeMoveNamesFromCharacter({
    selectedMoves: generationBuild.moves,
    existingMoves,
  });

  charObj.moves = generationBuild.moves.map((selectedMove, index) => {
    const existingMove = existingMoves[index] || {};
    const isDamage = selectedMove.class === "damage";
    const isCurseOrBuff = selectedMove.class === "curse" || selectedMove.class === "buff";
    const basePower = randomIntInclusive(20, 25);
    const generatedMoveName =
      generatedMoveNames[index] || buildMoveNameFallback(selectedMove, index);

    const generatedMoveDescription = buildGeneratedMoveDescription(selectedMove, generatedMoveName);

    return {
      ...existingMove,
      trait: existingMove.trait || null,
      name: generatedMoveName,
      description: generatedMoveDescription,
      type: selectedMove.type,
      range: selectedMove.range,
      class: selectedMove.class,
      target: selectedMove.class === "buff" ? "self" : "enemy",
      effect: selectedMove.effect,
      basePower,
      statPowerBonus: 0,
      power: basePower,
      accuracy: isDamage
        ? randomIntInclusive(70, 80)
        : isCurseOrBuff
        ? randomIntInclusive(80, 90)
        : randomIntInclusive(80, 90),
      cooldown: 3,
    };
  });

  charObj.generationBuild = generationBuild;
  charObj.userSelectedBuild = generationBuild;

  return charObj;
}

// ===================== MAIN PROGRAM ===================== //

async function runProgram() {
  let matches = await fetchQueuedGenerationMatches();
  let fallbackScan = null;
  let fallbackScanHadBlockingIssue = false;

  if (matches.length) {
    console.log(
      `Found ${matches.length} queued generation request(s). Processing queued docs directly without transaction scan.`
    );
  } else {
    console.log(
      "No directly processable queuedChars docs found. Falling back to transaction scan for missed groups."
    );
    fallbackScan = await fetchMatchingGroupsFromLast1000();
    matches = fallbackScan.matches;
    if (fallbackScan.scanErrors.length) {
      fallbackScanHadBlockingIssue = true;
      console.warn("Algorand scan checkpoint will not advance because scan errors occurred:", {
        scanErrors: fallbackScan.scanErrors,
      });
    }
    console.log(
      `Found ${matches.length} matching groups in last ${MAX_TXNS_TO_ADDRESS} txns to address (after round ${fallbackScan.minMatchRoundExclusive}).`
    );
  }

  matches.sort((a, b) => {
    const roundA = normalizeRoundNumber(a?.round, 0);
    const roundB = normalizeRoundNumber(b?.round, 0);
    if (roundA !== roundB) return roundA - roundB;
    return String(a?.assetConfigTxId || "").localeCompare(String(b?.assetConfigTxId || ""));
  });

  for (const m of matches) {
    const assetId = String(m.configTargetAssetId);
    let queuedGenerationRequest = null;
    let matchResolvedSuccessfully = false;

    try {
      queuedGenerationRequest =
        m.queuedGenerationRequest || (await getQueuedGenerationRequestForMatch(m));
      if (!queuedGenerationRequest?.data?.generationBuild) {
        console.warn("Skipping matching transaction because no Firebase queuedChars generationBuild exists for it yet.", {
          paymentTxnId: m.darkcoinTransferTxId,
          assetConfigTxId: m.assetConfigTxId,
          assetId,
          reason: "The new selector stores user selections in queuedChars, not in the transaction note.",
        });
        continue;
      }

      await updateCharGenerationProgress(assetId, {
        status: "starting",
        progress: 5,
        stage: "queued",
      });

      const parsedMeta={properties:queuedGenerationRequest.data.properties};
      m.groupId=queuedGenerationRequest.id;
      m.assetConfigTxId=m.darkcoinTransferTxId;

      const generationBuild = normalizeAndValidateGenerationBuild(
        queuedGenerationRequest.data.generationBuild
      );
      const championNameRequest = normalizeChampionNameRequest(queuedGenerationRequest.data);
      const generationBuildSummary = buildUserMovePromptSummary(generationBuild);
      console.log("Validated generation build:", {
        assetId,
        moves: generationBuildSummary,
        championName: championNameRequest.randomName
          ? "random"
          : championNameRequest.championName,
      });

      let originalProperties = parsedMeta.properties || {};
      const properties = {...queuedGenerationRequest.data.properties};

      const equippedTraits = await buildEquippedTraitsFromProperties(properties);
      const gainedItemEffects = buildGainedEffectsFromEquippedTraits(
        equippedTraits
      );
      const equippedTraitSummary = summarizeEquippedTraitEffects(equippedTraits);
      const gainedItemEffectSummary =
        summarizeGainedEffectsForPrompt(gainedItemEffects);

      console.log("Equipped properties loaded for generation:", {
        assetId,
        traits: Object.values(properties).filter((value) => value && value !== "None").length,
      });

      let propertyOptions = [];

      for (let key in properties) {
        if (properties[key] != "None") {
          propertyOptions.push(String(key) + " " + properties[key]);
        }
      }

      if (!propertyOptions.length) {
        for (let key in originalProperties) {
          if (originalProperties[key] != "None") {
            propertyOptions.push(String(key) + " " + originalProperties[key]);
          }
        }
      }

      let moveTrait1 =
        propertyOptions[Math.floor(Math.random() * propertyOptions.length)];
      let moveTrait2 =
        propertyOptions[Math.floor(Math.random() * propertyOptions.length)];
      let moveTrait3 =
        propertyOptions[Math.floor(Math.random() * propertyOptions.length)];

      let moveExample1 = JSON.stringify({
        description:
          "(this move should be based on " +
          moveTrait1 +
          ". The character has weapon = " +
          properties.Weapon +
          ", head = " +
          properties.Head +
          ", and armour = " +
          properties.Armour +
          ". move should target a single character. description should describe move to be able to target anyone. dont mention turns in the description. Equipped item effects to account for: " +
          gainedItemEffectSummary +
          ". Use those item effects as inspiration for move type, move effect, accuracy, power, and combat flavor, while still keeping a healthy amount of randomness. IMPORTANT: Avoid any content that may be considered inappropriate or offensive, ensuring the image aligns with content policies.)",
        name: "(string that clearly matches the selected move type and effect, for example a melee burn damage move should have a burn/fire melee attack name)",
        trait: moveTrait1,
        type: "(melee damage, ranged damage, magic damage, melee curse, ranged curse, magic curse, melee buff, ranged buff, magic buff)",
        effect:
          "('poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', or 'doom' if type of move is a curse or damage. 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', 'cleanse' if type of move is buff)",
        power: "(fixed generated number between 20 and 25; do not add stat bonuses)",
        accuracy: "(positive number between 25 and 100)",
        cooldown: "3",
      });

      let moveExample2 = JSON.stringify({
        description:
          "(this move should be based on " +
          moveTrait2 +
          ". The character has weapon = " +
          properties.Weapon +
          ", head = " +
          properties.Head +
          ", and armour = " +
          properties.Armour +
          ". move should target a single character. description should describe move to be able to target anyone. dont mention turns in the description. Equipped item effects to account for: " +
          gainedItemEffectSummary +
          ". Use those item effects as inspiration for move type, move effect, accuracy, power, and combat flavor, while still keeping a healthy amount of randomness. IMPORTANT: Avoid any content that may be considered inappropriate or offensive, ensuring the image aligns with content policies.)",
        name: "(string that clearly matches the selected move type and effect, for example a melee burn damage move should have a burn/fire melee attack name)",
        trait: moveTrait2,
        type: "(melee damage, ranged damage, magic damage, melee curse, ranged curse, magic curse, melee buff, ranged buff, magic buff)",
        effect:
          "('poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', or 'doom' if type of move is a curse or damage. 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', 'cleanse' if type of move is buff)",
        power: "(fixed generated number between 20 and 25; do not add stat bonuses)",
        accuracy: "(positive number between 25 and 100)",
        cooldown: "3",
      });

      let moveExample3 = JSON.stringify({
        description:
          "(this move should be based on " +
          moveTrait3 +
          ". The character has weapon = " +
          properties.Weapon +
          ", head = " +
          properties.Head +
          ", and armour = " +
          properties.Armour +
          ". move should target a single character. description should describe move to be able to target anyone. dont mention turns in the description. Equipped item effects to account for: " +
          gainedItemEffectSummary +
          ". Use those item effects as inspiration for move type, move effect, accuracy, power, and combat flavor, while still keeping a healthy amount of randomness. IMPORTANT: Avoid any content that may be considered inappropriate or offensive, ensuring the image aligns with content policies.)",
        name: "(string that clearly matches the selected move type and effect, for example a melee burn damage move should have a burn/fire melee attack name)",
        trait: moveTrait3,
        type: "(melee damage, ranged damage, magic damage, melee curse, ranged curse, magic curse, melee buff, ranged buff, magic buff)",
        effect:
          "('poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', or 'doom' if type of move is a curse or damage. 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', 'cleanse' if type of move is buff)",
        power: "(fixed generated number between 20 and 25; do not add stat bonuses)",
        accuracy: "(positive number between 25 and 100)",
        cooldown: "3",
      });

      let objectExample = JSON.stringify({
        name:
          "(" +
          championNameRequest.promptText +
          " Character properties: " +
          JSON.stringify(properties) +
          ")",
        description:
          "(description based on provided image. Include in description these properties about the character: " +
          JSON.stringify(properties) +
          ")",
        strength: `(fixed number: ${7 + Number(generationBuild.stats.strength || 0)})`,
        dexterity: `(fixed number: ${7 + Number(generationBuild.stats.dexterity || 0)})`,
        intelligence: `(fixed number: ${7 + Number(generationBuild.stats.intelligence || 0)})`,
        speed: "(fixed number: 50)",
        resist: "(fixed number: 10)",
        health: "(fixed number: 200)",
        equippedTraitEffects:
          "(array or summary of equipped item trait effects: " +
          equippedTraitSummary +
          ")",
        itemEffectInfluence:
          "(summary of equipped item effects to account for during generation: " +
          gainedItemEffectSummary +
          ")",
        moves: [moveExample1, moveExample2, moveExample3],
      });

      await updateCharGenerationProgress(assetId, {
        status: "building_character",
        progress: 20,
        stage: "prompting_openai_for_character",
      });

      let messages = [
        { role: "system", content: "You are a character object generator." },
        {
          role: "user",
          content:
            "Create a character JSON object based off of the character image, the character's equipped properties, and equipped item effects. Equipped properties: " +
            JSON.stringify(properties) +
            ". Equipped item effects from the character's items: " +
            equippedTraitSummary +
            ". Equipped item effect hints: " +
            gainedItemEffectSummary +
            ". REQUIRED USER CHAMPION BUILD: " +
            generationBuildSummary +
            ". The move types and effects must match that user build exactly. Stats must use strength/dexterity/intelligence base 7 plus user points: " +
            JSON.stringify(generationBuild.stats) +
            ". Keep the same structure as: " +
            objectExample +
            ". Make sure the moves array is an object array. Every move name is final, creative, unique, two words maximum, and clearly matches its selected range, class, and effect from the user generation build. Move power must stay between 20 and 25 for every move with no stat-based addition. Let the item effects influence the character stats, combat style, move flavor, and visual description without changing the selected move types or selected move effects. Add a healthy amount of randomness so the output is not deterministic, but still make it feel connected to the equipped items.",
        },
      ];

      let response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages,
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      let charObj = JSON.parse(response.choices[0].message.content);

      if (!championNameRequest.randomName && championNameRequest.championName) {
        charObj.name = championNameRequest.championName;
      } else if (!charObj.name) {
        charObj.name = "Unnamed Champion";
      }

      charObj["health"] = Number(charObj["health"] || 0);
      charObj["strength"] = Number(charObj["strength"] || 0);
      charObj["dexterity"] = Number(charObj["dexterity"] || 0);
      charObj["intelligence"] = Number(charObj["intelligence"] || 0);
      charObj["speed"] = Number(charObj["speed"] || 0);
      charObj["resist"] = Number(charObj["resist"] || 0);

      if (!Array.isArray(charObj.moves)) {
        charObj.moves = [];
      }

      await updateCharGenerationProgress(assetId, {
        status: "building_character",
        progress: 25,
        stage: "base_stats_generated",
      });

      charObj.generationSchemaVersion = 2;
      charObj.generationEquippedProperties = properties;
      charObj.equippedTraitEffects = equippedTraits;
      charObj.gainedEffectsMeta = gainedItemEffects;

      // Item effects may provide flavor metadata, but the user's champion build
      // is the source of truth for generated stats, move types, move effects,
      // effect values, move power, accuracy, and cooldowns.
      await enforceUserGenerationBuildOnCharacter(charObj, generationBuild, {
        properties,
        equippedTraitSummary,
      });
      charObj.championNameRequest = championNameRequest;
      charObj.queuedGenerationRequestId = queuedGenerationRequest.id;

      await updateCharGenerationProgress(assetId, {
        status: "building_character",
        progress: 35,
        stage: "effects_and_moves_finalized",
      });

      console.log(
        "Generated character object:",
        buildGeneratedCharacterLogSummary(charObj, assetId)
      );

      // ===== IMAGE PIPELINE =====

      await updateCharGenerationProgress(assetId,{status:'generating_images',progress:40,stage:'composing_selected_traits'});
      const champBlob = await composeLoadout(properties);
      await updateCharGenerationProgress(assetId,{status:'generating_images',progress:45,stage:'generating_idle_animation_sheet'});

      const idleSheetBase64 = await generateEditedImageBase64({
        sourceBlob: champBlob,
        prompt: buildIdleSheetPrompt(charObj),
        size: SHEET_SIZE,
      });

      const idleAnimation = await splitSheetAndUpload({
        sheetBase64: idleSheetBase64,
        destPrefix: `${assetId}/idle`,
        cols: SHEET_COLS,
        rows: SHEET_ROWS,
      });

      charObj.imageModel = IMAGE_MODEL;
      charObj.standingUrl = idleAnimation.frameUrls[0] || idleAnimation.sheetUrl;
      charObj.idleSheetUrl = idleAnimation.sheetUrl;
      charObj.idleFrames = idleAnimation.frameUrls;
      charObj.animation = {
        idle: {
          ...idleAnimation,
          fps: 6,
        },
      };

      await updateCharGenerationProgress(assetId, {
        status: "generating_images",
        progress: 52,
        stage: "idle_animation_generated",
        idleSheetUrl: idleAnimation.sheetUrl,
      });

      const idleReferenceBlob = await urlToBlob(charObj.standingUrl);

      for (let i = 0; i < charObj.moves.length; i++) {
        const move = charObj.moves[i];
        const moveNumber = i + 1;

        await updateCharGenerationProgress(assetId, {
          status: "generating_images",
          progress: 52 + i * 14,
          stage: `generating_move_${moveNumber}_animation_sheet`,
        });

        const { characterAnimation, effectAnimation } =
          await generateAnimationSet({
            sourceBlob: idleReferenceBlob,
            actionPrompt: buildMoveSheetPrompt(move),
            effectPrompt: buildMoveVisualSheetPrompt(move),
            characterDestPrefix: `${assetId}/moves/${i}/character`,
            effectDestPrefix: `${assetId}/moves/${i}/effect`,
          });

        move.characterUrl =
          characterAnimation.frameUrls[0] || characterAnimation.sheetUrl;
        move.animationSheetUrl = characterAnimation.sheetUrl;
        move.animationFrames = characterAnimation.frameUrls;
        move.frameCount = characterAnimation.frameCount;
        move.animationMeta = {
          ...characterAnimation,
          fps: 10,
        };

        move.moveUrl =
          effectAnimation?.frameUrls?.[0] || effectAnimation?.sheetUrl || null;
        move.moveVisualSheetUrl = effectAnimation?.sheetUrl || null;
        move.moveVisualFrames = effectAnimation?.frameUrls || [];
        move.moveVisualMeta = effectAnimation
          ? {
              ...effectAnimation,
              fps: 12,
            }
          : null;

        await updateCharGenerationProgress(assetId, {
          status: "generating_images",
          progress: 60 + i * 12,
          stage: `move_${moveNumber}_assets_generated`,
        });
      }

      await updateCharGenerationProgress(assetId, {
        status: "generating_images",
        progress: 96,
        stage: "all_animation_assets_generated",
      });

      await setDoc(
        doc(db, "chars", assetId + "object"),
        {
          charObj,
          status: "completed",
          progress: 100,
          stage: "done",
          completedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await saveMatchToFirestore(m);

      if (queuedGenerationRequest?.ref) {
        try {
          await setDoc(queuedGenerationRequest.ref,{status:'completed',completedAt:serverTimestamp()},{merge:true});
          console.log("🗑️ Deleted processed queuedChars doc:", queuedGenerationRequest.id);
        } catch (deleteError) {
          console.error("Failed to delete processed queuedChars doc:", queuedGenerationRequest.id, deleteError);
        }
      }

      matchResolvedSuccessfully = true;
    } catch (err) {
      console.error(
        "Error processing match:",
        m.groupId,
        m.assetConfigTxId,
        err
      );

      try {
        await updateCharGenerationProgress(String(m.configTargetAssetId), {
          status: "error",
          progress: 0,
          stage: "error",
          errorMessage: String(err?.message || err),
        });
      } catch (e2) {
        console.error("Also failed to update error status in chars doc:", e2);
      }
    } finally {
      if (fallbackScan && m.source === "algorandScan" && !matchResolvedSuccessfully) {
        fallbackScanHadBlockingIssue = true;
      }
    }
  }

  if (fallbackScan) {
    let nextCheckpointRound = normalizeRoundNumber(
      fallbackScan.maxRoundSeen,
      fallbackScan.minMatchRoundExclusive
    );
    let checkpointSource =
      nextCheckpointRound > fallbackScan.minMatchRoundExclusive
        ? "highest_seen_transaction_round"
        : "unchanged";

    if (fallbackScanHadBlockingIssue) {
      console.log(
        "Algorand generation scan checkpoint was not advanced because at least one scanned match did not fully resolve."
      );
    } else {
      if (matches.length === 0) {
        const currentIndexerRound = await getCurrentAlgorandIndexerRound();
        if (currentIndexerRound && currentIndexerRound > nextCheckpointRound) {
          nextCheckpointRound = currentIndexerRound;
          checkpointSource = "current_indexer_round_after_empty_scan";
        }
      }

      if (nextCheckpointRound > fallbackScan.minMatchRoundExclusive) {
        await updateAlgorandScanRoundExclusive(nextCheckpointRound, {
          minRoundUsed: fallbackScan.minMatchRoundInclusive,
          matchedGroups: matches.length,
          checkpointSource,
          lastRunCompletedAt: serverTimestamp(),
        });
      } else {
        console.log("Algorand generation scan checkpoint is already current.");
      }
    }
  }
}

// One verified paid build per Cloud Run execution. A durable lease prevents
// duplicate trigger deliveries from regenerating the same purchase.
if(await claimJob()){
 try{await runProgram();await completeJob();}catch(error){await completeJob(error);throw error;}
}
