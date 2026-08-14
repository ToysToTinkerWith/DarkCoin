import React, { useEffect, useRef, useState } from "react";
import algosdk from "algosdk";
import {
  Typography,
  Button,
  Grid,
  LinearProgress,
  linearProgressClasses,
  styled,
} from "@mui/material";
import { useWallet } from "@txnlab/use-wallet-react";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useRouter } from "next/router";
import { CID } from "multiformats/cid";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import * as mfsha2 from "multiformats/hashes/sha2";
import * as digest from "multiformats/hashes/digest";
import { doc, getDoc } from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { db } from "../../../Firebase/FirebaseInit";
import {
  POINTS_BYTE_LENGTH,
  getSkillPointStatAdjustments,
  normalizePointsArray,
  trees,
} from "./Trees.js";
import { CHAMPION_TRAITS } from "./traitsData";
import { submitApplySkillPoints } from "./applySkillPoints";

const ITEM_VOTE_APP_ID = 3339943603;
const EFFECT_STRIDE = 2000;
const ITEM_POTENCY_DAO_SUFFIX = 1037;

// ---------------------------------------------------------------------------
// Background image resolution
// ---------------------------------------------------------------------------
// Fetches the Firebase Storage download URL for the equipped Background trait.
// "Aqua Background" → warriors/Background/Aqua.png
// "Red Moon Background" → warriors/Background/Red Moon.png
// Returns "" on failure so existing graceful-fallback logic still works.

async function fetchBackgroundImageUrl(backgroundTraitName) {
  if (!backgroundTraitName || backgroundTraitName === "None") return "";

  // Strip trailing " Background" (and any leading space before it), keep original casing.
  const filename = String(backgroundTraitName).replace(/\s*Background$/i, "").trim() + ".png";

  try {
    const storage = getStorage();
    const imageRef = ref(storage, `warriors/Background/${filename}`);
    return await getDownloadURL(imageRef);
  } catch (err) {
    console.error("Failed to fetch background image URL:", backgroundTraitName, err);
    return "";
  }
}

const TRAIT_LOOKUP_BY_NAME = Object.values(CHAMPION_TRAITS)
  .flat()
  .reduce((acc, traitDef) => {
    if (traitDef?.trait) {
      acc[traitDef.trait] = traitDef;
      acc[String(traitDef.trait).toLowerCase()] = traitDef;
    }
    return acc;
  }, {});

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

const DEFAULT_CRIT_CHANCE = 25;
const DEFAULT_CRIT_DAMAGE = 200;

function getCharacterPercentStat(charObj, key, fallbackValue) {
  const raw = charObj?.[key];
  const value = Number(raw);

  return raw === undefined || raw === null || raw === "" || !Number.isFinite(value)
    ? fallbackValue
    : value;
}

const DC_THEME = {
  bg: "#020202",
  panel: "rgba(0,0,0,0.78)",
  panelSoft: "rgba(255,255,255,0.035)",
  line: "rgba(255,255,255,0.24)",
  lineStrong: "rgba(255,255,255,0.58)",
  text: "rgba(255,255,255,0.94)",
  muted: "rgba(255,255,255,0.62)",
  faint: "rgba(255,255,255,0.32)",
  good: "#9FE870",
  bad: "#F8575A",
  glow: "0 0 22px rgba(255,255,255,0.16)",
  glowStrong: "0 0 34px rgba(255,255,255,0.26)",
};

const dcPageStyle = {
  position: "relative",
  minHeight: "100vh",
  width: "100%",
  overflow: "hidden",
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.12), transparent 28%), linear-gradient(180deg, #070707 0%, #000 54%, #050505 100%)",
  color: DC_THEME.text,
  padding: "42px clamp(14px, 3vw, 48px) 70px",
};

const dcBackdropStyle = (background) => ({
  position: "absolute",
  inset: 0,
  backgroundImage: background ? `url(${background})` : "none",
  backgroundSize: "cover",
  backgroundPosition: "center",
  opacity: 0.2,
  filter: "contrast(1.15)",
  pointerEvents: "none",
  zIndex: 0,
});

const dcVignetteStyle = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.62) 58%, #000 100%)",
  pointerEvents: "none",
  zIndex: 1,
};

const dcContentStyle = {
  position: "relative",
  zIndex: 2,
  maxWidth: 1440,
  margin: "0 auto",
};

const dcPanelStyle = {
  position: "relative",
  border: `1px solid ${DC_THEME.line}`,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018)), rgba(0,0,0,0.80)",
  boxShadow:
    "inset 0 0 0 1px rgba(255,255,255,0.045), 0 18px 55px rgba(0,0,0,0.66)",
  borderRadius: 4,
  overflow: "hidden",
};

const dcPanelHeaderStyle = {
  fontFamily: "Jacques, Georgia, serif",
  letterSpacing: "0.26em",
  textTransform: "uppercase",
  color: DC_THEME.text,
  textShadow: "0 0 14px rgba(255,255,255,0.25)",
};

const dcLabelStyle = {
  fontFamily: "Jacques, Georgia, serif",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: DC_THEME.muted,
};

const dcButtonStyle = {
  border: `1px solid ${DC_THEME.lineStrong}`,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(0,0,0,0.94))",
  color: DC_THEME.text,
  borderRadius: 3,
  fontFamily: "Jacques, Georgia, serif",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  padding: "10px 18px",
  boxShadow: DC_THEME.glow,
};

const dcDividerStyle = {
  display: "none",
};

const dcDividerLineStyle = {
  height: 1,
  width: "min(180px, 26vw)",
  background:
    "linear-gradient(90deg, transparent, rgba(255,255,255,0.42), transparent)",
};

const dcCrescentStyle = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.48)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: DC_THEME.glow,
  fontFamily: "Georgia, serif",
  fontSize: 18,
};

const BorderLinearProgressHealth = styled(LinearProgress)(() => ({
  height: 9,
  borderRadius: 0,
  border: "1px solid rgba(255,255,255,0.34)",
  backgroundColor: "rgba(255,255,255,0.06)",
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 0,
    background:
      "linear-gradient(90deg, rgba(255,255,255,0.55), rgba(255,255,255,0.95))",
    boxShadow: "0 0 16px rgba(255,255,255,0.32)",
  },
}));

const BorderLinearProgress = styled(LinearProgress)(() => ({
  height: 8,
  borderRadius: 0,
  border: "1px solid rgba(255,255,255,0.28)",
  backgroundColor: "rgba(255,255,255,0.055)",
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 0,
    background:
      "linear-gradient(90deg, rgba(255,255,255,0.46), rgba(255,255,255,0.92))",
    boxShadow: "0 0 14px rgba(255,255,255,0.28)",
  },
}));

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

function computeEffectPotenciesFromDaoVote(
  boxBytes,
  effectCount,
  daoSuffix = ITEM_POTENCY_DAO_SUFFIX
) {
  return Array.from({ length: effectCount }, (_unused, effectIndex) =>
    getDaoVoteForEffect(boxBytes, effectIndex, daoSuffix)
  );
}

async function readTraitEffectMedians(client, traitName, effectCount) {
  if (!traitName || !effectCount) return [];

  try {
    const res = await client
      .getApplicationBoxByName(ITEM_VOTE_APP_ID, encodeUtf8(traitName))
      .do();

    const boxBytes = bytesToUint8Array(res?.value);
    return computeEffectPotenciesFromDaoVote(boxBytes, effectCount);
  } catch (error) {
    console.error("Failed to read item voting box for trait:", traitName, error);
    return Array(effectCount).fill(null);
  }
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

function mergeGainedEffectsIntoCharacter(baseChar, gainedEffects) {
  if (!baseChar) return baseChar;

  const baseComparison = {
    stats: {
      health: Number(baseChar.health || 0),
      speed: Number(baseChar.speed || 0),
      resist: Number(baseChar.resist || 0),
      strength: Number(baseChar.strength || 0),
      dexterity: Number(baseChar.dexterity || 0),
      intelligence: Number(baseChar.intelligence || 0),
      accuracy: 0,
      critChance: getCharacterPercentStat(baseChar, "critChance", DEFAULT_CRIT_CHANCE),
      critDamage: getCharacterPercentStat(baseChar, "critDamage", DEFAULT_CRIT_DAMAGE),
    },
    effects: {
      poison: Number(baseChar.poison || 0),
      bleed: Number(baseChar.bleed || 0),
      burn: Number(baseChar.burn || 0),
      freeze: Number(baseChar.freeze || 0),
      slow: Number(baseChar.slow || 0),
      drown: Number(baseChar.drown || 0),
      paralyze: Number(baseChar.paralyze || 0),
      doom: Number(baseChar.doom || 0),
      shield: Number(baseChar.shield || 0),
      strengthen: Number(baseChar.strengthen || 0),
      focus: Number(baseChar.focus || 0),
      empower: Number(baseChar.empower || 0),
      nurture: Number(baseChar.nurture || 0),
      bless: Number(baseChar.bless || 0),
      hasten: Number(baseChar.hasten || 0),
      cleanse: Number(baseChar.cleanse || 0),
    },
  };

  const merged = {
    ...baseChar,
    critChance: getCharacterPercentStat(baseChar, "critChance", DEFAULT_CRIT_CHANCE),
    critDamage: getCharacterPercentStat(baseChar, "critDamage", DEFAULT_CRIT_DAMAGE),
    baseComparison,
    gainedEffectsMeta: gainedEffects || cloneEmptyGainedEffects(),
    effects: {
      ...(baseChar.effects || {}),
    },
  };

  const statBonuses = {
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

  if (gainedEffects?.effects) {
    effectKeys.forEach((key) => {
      const add = Number(gainedEffects.effects[key] || 0);
      if (add) {
        merged[key] = Number(merged[key] || 0) + add;
      }
    });
  }

  if (gainedEffects?.stats) {
    statKeys.forEach((key) => {
      statBonuses[key] = Number(gainedEffects.stats[key] || 0);
    });
  }

  merged.traitStatBonuses = statBonuses;
  return merged;
}

function getTriggeredEffectAmount(charObj, effectKey, baseAmount) {
  return Number(baseAmount || 0) + Number(charObj?.[effectKey] || 0);
}

function getDeltaColor(value) {
  if (value > 0) return "#4EC83E";
  if (value < 0) return "#F8575A";
  return "#FFFFFF";
}

function getComparisonColor(finalValue, baseValue) {
  if (finalValue > baseValue) return "#4EC83E";
  if (finalValue < baseValue) return "#F8575A";
  return "#FFFFFF";
}

function formatSigned(value, decimals = 1) {
  const n = Number(value || 0);
  if (n > 0) return `+${n.toFixed(decimals)}`;
  if (n < 0) return `${n.toFixed(decimals)}`;
  return "0.0";
}

function renderValueBreakdown(baseValue, modifierValue, decimals = 1, suffix = "") {
  const finalValue = Number(baseValue || 0) + Number(modifierValue || 0);

  if (Number(modifierValue || 0) === 0) return null;

  return (
    <div style={{ marginTop: 4 }}>
      <Typography
        align="center"
        variant="caption"
        style={{
          color: "rgba(255,255,255,0.72)",
          display: "block",
          lineHeight: 1.2,
        }}
      >
        base {Number(baseValue || 0).toFixed(decimals)}{suffix}
      </Typography>
      <Typography
        align="center"
        variant="caption"
        style={{
          color: getDeltaColor(modifierValue),
          display: "block",
          lineHeight: 1.2,
        }}
      >
        {formatSigned(modifierValue, decimals)}{suffix}
      </Typography>
      <Typography
        align="center"
        variant="caption"
        style={{
          color: "rgba(255,255,255,0.72)",
          display: "block",
          lineHeight: 1.2,
        }}
      >
        = {finalValue.toFixed(decimals)}{suffix}
      </Typography>
    </div>
  );
}

function renderMoveValueBreakdown({
  baseValue,
  finalValue,
  modifierLabel,
  decimals = 1,
}) {
  const baseNumber = Number(baseValue || 0);
  const finalNumber = Number(finalValue || 0);
  const modifierValue = finalNumber - baseNumber;

  if (modifierValue === 0) return null;

  return (
    <div style={{ marginTop: 4 }}>
      <Typography
        align="center"
        variant="caption"
        style={{
          color: "rgba(255,255,255,0.72)",
          display: "block",
          lineHeight: 1.2,
        }}
      >
        base {baseNumber.toFixed(decimals)}
      </Typography>
      <Typography
        align="center"
        variant="caption"
        style={{
          color: getDeltaColor(modifierValue),
          display: "block",
          lineHeight: 1.2,
        }}
      >
        {formatSigned(modifierValue, decimals)} {modifierLabel}
      </Typography>
      <Typography
        align="center"
        variant="caption"
        style={{
          color: "rgba(255,255,255,0.72)",
          display: "block",
          lineHeight: 1.2,
        }}
      >
        = {finalNumber.toFixed(decimals)}
      </Typography>
    </div>
  );
}


function formatMoveAccuracyType(type) {
  const cleaned = String(type || "").toLowerCase();
  if (cleaned === "melee") return "melee type moves";
  if (cleaned === "ranged") return "ranged type moves";
  if (cleaned === "magic") return "magic type moves";
  if (cleaned === "curse") return "curse type moves";
  if (cleaned === "all") return "all moves";
  return `${cleaned} moves`;
}

function renderMoveAccuracyBreakdown({
  baseValue,
  accuracyAdj,
  typeAccuracyBonus,
  curseAccuracyBonus,
  allAccuracyBonus,
  finalValue,
}) {
  const parts = [];

  if (Number(accuracyAdj || 0) !== 0) {
    parts.push({
      label: "status / effect accuracy",
      value: Number(accuracyAdj || 0),
    });
  }

  if (Number(typeAccuracyBonus || 0) !== 0) {
    parts.push({
      label: "type accuracy",
      value: Number(typeAccuracyBonus || 0),
    });
  }

  if (Number(curseAccuracyBonus || 0) !== 0) {
    parts.push({
      label: "curse type accuracy",
      value: Number(curseAccuracyBonus || 0),
    });
  }

  if (Number(allAccuracyBonus || 0) !== 0) {
    parts.push({
      label: "all move accuracy",
      value: Number(allAccuracyBonus || 0),
    });
  }

  if (!parts.length) return null;

  return (
    <div style={{ marginTop: 4 }}>
      <Typography
        align="center"
        variant="caption"
        style={{
          color: "rgba(255,255,255,0.72)",
          display: "block",
          lineHeight: 1.2,
        }}
      >
        base {Number(baseValue || 0).toFixed(1)}
      </Typography>

      {parts.map((part, partIndex) => (
        <Typography
          key={`${part.label}-${partIndex}`}
          align="center"
          variant="caption"
          style={{
            color: getDeltaColor(part.value),
            display: "block",
            lineHeight: 1.2,
          }}
        >
          {formatSigned(part.value, 1)} {part.label}
        </Typography>
      ))}

      <Typography
        align="center"
        variant="caption"
        style={{
          color: "rgba(255,255,255,0.72)",
          display: "block",
          lineHeight: 1.2,
        }}
      >
        = {Number(finalValue || 0).toFixed(1)}
      </Typography>
    </div>
  );
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

function getTraitBattleEffectDescriptor(effectText) {
  const text = normalizeTraitEffectText(effectText);
  if (!text) return null;

  if (/^Increases /i.test(text) || /^Decreases /i.test(text)) {
    return null;
  }

  let match = text.match(/^Resistance to (.+)$/i);
  if (match) {
    const effectKey = getEffectKeyFromName(match[1]);
    return {
      type: "resistance",
      effectKey,
      amountLabel: "resistance amount",
    };
  }

  match = text.match(/^Gain (.+) at (?:the )?start of (?:the )?battle$/i);
  if (match) {
    const effectKey = getEffectKeyFromName(match[1]);
    return {
      type: "gain_start_of_battle",
      effectKey,
      amountLabel: "amount gained",
    };
  }

  match = text.match(/^Apply (.+) at (?:the )?start of (?:the )?battle$/i);
  if (match) {
    const effectKey = getEffectKeyFromName(match[1]);
    return {
      type: "apply_start_of_battle",
      effectKey,
      amountLabel: "amount applied",
    };
  }

  match = text.match(/^Gain (.+) (?:on|every) (melee|ranged|magic) hit$/i);
  if (match) {
    const effectKey = getEffectKeyFromName(match[1]);
    return {
      type: "gain_on_hit",
      effectKey,
      attackType: match[2].toLowerCase(),
      amountLabel: "amount gained on hit",
    };
  }

  match = text.match(/^Apply (.+) (?:on|every) (melee|ranged|magic) hit$/i);
  if (match) {
    const effectKey = getEffectKeyFromName(match[1]);
    return {
      type: "apply_on_hit",
      effectKey,
      attackType: match[2].toLowerCase(),
      amountLabel: "amount applied on hit",
    };
  }

  match = text.match(/^Heal for (?:the )?amount of (.+?) stacks applied$/i);
  if (match) {
    return {
      type: "heal_for_applied_stacks",
      sourceEffectKey: getEffectKeyFromName(match[1]),
      amountLabel: "healing per stack applied",
    };
  }

  return null;
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

  match = text.match(/^Gain (.+) (?:on|every) (melee|ranged|magic) hit$/i);
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

  match = text.match(/^Apply (.+) (?:on|every) (melee|ranged|magic) hit$/i);
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

function getEffectIcon(effect) {
  const map = {
    bleed: "/dragonshorde/trees/Bleed.svg",
    bless: "/dragonshorde/trees/Bless.svg",
    burn: "/dragonshorde/trees/Burn.svg",
    cleanse: "/dragonshorde/trees/Cleanse.svg",
    doom: "/dragonshorde/trees/Doom.svg",
    drown: "/dragonshorde/trees/Drown.svg",
    empower: "/dragonshorde/trees/Empower.svg",
    focus: "/dragonshorde/trees/Focus.svg",
    freeze: "/dragonshorde/trees/Freeze.svg",
    hasten: "/dragonshorde/trees/Hasten.svg",
    nurture: "/dragonshorde/trees/Nurture.svg",
    paralyze: "/dragonshorde/trees/Paralyze.svg",
    poison: "/dragonshorde/trees/Poison.svg",
    shield: "/dragonshorde/trees/Shield.svg",
    slow: "/dragonshorde/trees/Slow.svg",
    strengthen: "/dragonshorde/trees/Strengthen.svg",
  };
  return map[effect] || null;
}


const SPRITE_FRAME_MS = 340;
const SPRITE_LOOP_PAUSE_MS = 2000;

function getFrameList(frames, fallbackSrc) {
  const validFrames = Array.isArray(frames)
    ? frames.filter((src) => typeof src === "string" && src.trim())
    : [];

  if (validFrames.length > 0) return validFrames.slice(0, 4);
  return fallbackSrc ? [fallbackSrc] : [];
}

function AnimatedFrameImage({
  frames,
  fallbackSrc,
  alt,
  style,
  frameMs = SPRITE_FRAME_MS,
  pauseMs = SPRITE_LOOP_PAUSE_MS,
}) {
  const frameList = getFrameList(frames, fallbackSrc);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (frameList.length <= 1) {
      setFrameIndex(0);
      return undefined;
    }

    let cancelled = false;
    let currentFrame = 0;
    let timeoutId = null;

    setFrameIndex(0);

    const scheduleNextFrame = () => {
      const isLastFrame = currentFrame === frameList.length - 1;
      const delay = isLastFrame ? pauseMs : frameMs;

      timeoutId = window.setTimeout(() => {
        if (cancelled) return;

        currentFrame = (currentFrame + 1) % frameList.length;
        setFrameIndex(currentFrame);
        scheduleNextFrame();
      }, delay);
    };

    scheduleNextFrame();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [frameList.join("|"), frameMs, pauseMs]);

  const src = frameList[frameIndex] || fallbackSrc || "";

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      style={{
        ...style,
        objectFit: style?.objectFit || "contain",
      }}
    />
  );
}


const MOVE_EFFECT_FRAME_MS = 240;
const MOVE_EFFECT_LAST_FRAME_MS = 850;

function getFramesFromCandidates(candidates, fallbackSrc) {
  for (const candidate of candidates) {
    const frames = Array.isArray(candidate)
      ? candidate.filter((src) => typeof src === "string" && src.trim()).slice(0, 4)
      : [];

    if (frames.length > 0) {
      return frames;
    }
  }

  return fallbackSrc ? [fallbackSrc] : [];
}

function getMoveCharacterFrames(move) {
  return getFramesFromCandidates(
    [
      move?.animationFrames,
      move?.animationMeta?.frameUrls,
      move?.characterFrames,
      move?.characterAnimation?.frameUrls,
    ],
    move?.characterUrl
  );
}

function getMoveEffectFrames(move) {
  return getFramesFromCandidates(
    [
      move?.effectFrames,
      move?.effectAnimationFrames,
      move?.moveEffectFrames,
      move?.visualFrames,
      move?.moveVisualFrames,
      move?.effectAnimationMeta?.frameUrls,
      move?.effectMeta?.frameUrls,
      move?.moveVisualMeta?.frameUrls,
      move?.visualMeta?.frameUrls,
      move?.effectAnimation?.frameUrls,
      move?.moveVisual?.frameUrls,
    ],
    move?.effectUrl || move?.visualUrl || move?.moveVisualUrl
  );
}

function getMovePreviewLayout(moveType) {
  const lowered = String(moveType || "").toLowerCase();
  const root = lowered.split(" ")[0];

  if (lowered.includes("buff")) return "buff";
  if (root === "melee") return "melee";
  if (root === "magic" || root === "ranged") return "projectile";
  if (lowered.includes("curse") || lowered.includes("damage")) return "projectile";
  return "projectile";
}

function buildMovePlaybackSequence({
  charFrameCount,
  effectFrameCount,
  frameMs,
  effectFrameMs,
  effectLastFrameMs,
  loopPauseMs,
}) {
  const safeCharCount = Math.max(1, charFrameCount || 1);
  const lastCharIndex = Math.max(0, safeCharCount - 1);
  const previewCharIndices = [0, 1, 2, 3].map((index) =>
    Math.min(index, lastCharIndex)
  );

  if (effectFrameCount > 0) {
    const sequence = [
      {
        charIndex: previewCharIndices[0],
        effectIndex: -1,
        duration: frameMs,
      },
      {
        charIndex: previewCharIndices[1],
        effectIndex: -1,
        duration: frameMs,
      },
      {
        charIndex: previewCharIndices[2],
        effectIndex: 0,
        duration: frameMs,
      },
    ];

    if (effectFrameCount === 1) {
      sequence.push({
        charIndex: previewCharIndices[3],
        effectIndex: 0,
        duration: effectLastFrameMs,
      });
    } else {
      sequence.push({
        charIndex: previewCharIndices[3],
        effectIndex: 1,
        duration: effectFrameCount > 2 ? effectFrameMs : effectLastFrameMs,
      });

      for (let effectIndex = 2; effectIndex < effectFrameCount - 1; effectIndex += 1) {
        sequence.push({
          charIndex: previewCharIndices[3],
          effectIndex,
          duration: effectFrameMs,
        });
      }

      sequence.push({
        charIndex: previewCharIndices[3],
        effectIndex: effectFrameCount - 1,
        duration: effectLastFrameMs,
      });
    }

    sequence.push({
      charIndex: previewCharIndices[3],
      effectIndex: -1,
      duration: loopPauseMs,
    });

    return sequence;
  }

  return [
    {
      charIndex: previewCharIndices[0],
      effectIndex: -1,
      duration: frameMs,
    },
    {
      charIndex: previewCharIndices[1],
      effectIndex: -1,
      duration: frameMs,
    },
    {
      charIndex: previewCharIndices[2],
      effectIndex: -1,
      duration: frameMs,
    },
    {
      charIndex: previewCharIndices[3],
      effectIndex: -1,
      duration: loopPauseMs,
    },
  ];
}

function MoveAnimationPreview({
  move,
  background,
  frameMs = SPRITE_FRAME_MS,
  pauseMs = SPRITE_LOOP_PAUSE_MS,
  effectFrameMs = MOVE_EFFECT_FRAME_MS,
  effectLastFrameMs = MOVE_EFFECT_LAST_FRAME_MS,
}) {
  const characterFrames = getMoveCharacterFrames(move);
  const effectFrames = getMoveEffectFrames(move);

  const [charFrameIndex, setCharFrameIndex] = useState(0);
  const [effectFrameIndex, setEffectFrameIndex] = useState(-1);

  useEffect(() => {
    if (!characterFrames.length) {
      setCharFrameIndex(0);
      setEffectFrameIndex(-1);
      return undefined;
    }

    const sequence = buildMovePlaybackSequence({
      charFrameCount: characterFrames.length,
      effectFrameCount: effectFrames.length,
      frameMs,
      effectFrameMs,
      effectLastFrameMs,
      loopPauseMs: pauseMs,
    });

    if (!sequence.length) {
      setCharFrameIndex(0);
      setEffectFrameIndex(-1);
      return undefined;
    }

    let cancelled = false;
    let timeoutId = null;
    let currentStep = 0;

    const playStep = () => {
      if (cancelled) return;

      const step = sequence[currentStep];
      setCharFrameIndex(step.charIndex);
      setEffectFrameIndex(step.effectIndex);

      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        currentStep = (currentStep + 1) % sequence.length;
        playStep();
      }, step.duration);
    };

    playStep();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [
    characterFrames.join("|"),
    effectFrames.join("|"),
    frameMs,
    pauseMs,
    effectFrameMs,
    effectLastFrameMs,
  ]);

  if (!characterFrames.length) return null;

  const layout = getMovePreviewLayout(move?.type);
  const currentCharacterSrc = characterFrames[charFrameIndex] || characterFrames[0];
  const hasEffect = effectFrameIndex >= 0 && effectFrames.length > 0;
  const currentEffectSrc = hasEffect
    ? effectFrames[Math.min(effectFrameIndex, effectFrames.length - 1)]
    : null;

  const charProgress = Math.min(charFrameIndex, 3) / 3;
  const effectProgress =
    hasEffect && effectFrames.length > 1
      ? Math.min(effectFrameIndex, effectFrames.length - 1) /
        (effectFrames.length - 1)
      : hasEffect
      ? 1
      : 0;

  const stageRef = useRef(null);
  const characterImgRef = useRef(null);
  const effectImgRef = useRef(null);
  const [buffEffectTopPx, setBuffEffectTopPx] = useState(null);

  useEffect(() => {
    if (layout !== "buff" || !currentEffectSrc) return;

    let rafId = null;

    const measureBuffEffectTop = () => {
      const stageEl = stageRef.current;
      const charEl = characterImgRef.current;
      const effectEl = effectImgRef.current;

      if (!stageEl || !charEl || !effectEl) return;

      const charTop = charEl.offsetTop;
      const effectHeight = effectEl.offsetHeight || 0;

      // Keep the effect animation exactly 10px above the character animation.
      setBuffEffectTopPx(Math.max(0, charTop - effectHeight - 10));
    };

    rafId = window.requestAnimationFrame(measureBuffEffectTop);
    window.addEventListener("resize", measureBuffEffectTop);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", measureBuffEffectTop);
    };
  }, [layout, currentCharacterSrc, currentEffectSrc, charFrameIndex, effectFrameIndex]);

  // Move the entire move-animation composition left, and drop only the effect lane.
  const MOVE_ANIMATION_LEFT_OFFSET_PX = -40;
  const EFFECT_ANIMATION_RELATIVE_DOWN_OFFSET_PX = 40;

  const characterStyle = {
    position: "absolute",
    zIndex: 2,
    pointerEvents: "none",
    userSelect: "none",
    width: layout === "buff" ? "52%" : "64%",
    maxWidth: layout === "buff" ? 180 : 220,
    transition: "left 180ms linear, bottom 180ms linear, transform 180ms linear",
    filter: "drop-shadow(0 0 8px rgba(0,0,0,0.32))",
    marginLeft: MOVE_ANIMATION_LEFT_OFFSET_PX,
  };

  if (layout === "buff") {
    // Buff moves: keep the character stationary and centered in the space,
    // but lower it so the effect can clearly originate from the top edge.
    characterStyle.left = "50%";
    characterStyle.bottom = "10%";
    characterStyle.transform = "translateX(-50%)";
    characterStyle.marginLeft = 0;
  } else if (layout === "melee") {
    characterStyle.left = `${3 + charProgress * 7}%`;
    characterStyle.bottom = `${18 + charProgress * 1}%`;
    characterStyle.transform = "translateX(0)";
  } else {
    characterStyle.left = "3%";
    characterStyle.bottom = "18%";
    characterStyle.transform = "translateX(0)";
  }

  const effectStyle = currentEffectSrc
    ? {
        position: "absolute",
        zIndex: 3,
        pointerEvents: "none",
        userSelect: "none",
        width: layout === "buff" ? "24%" : "40%",
        maxWidth: layout === "buff" ? 110 : 170,
        opacity: hasEffect ? 1 : 0,
        transition:
          "left 180ms linear, bottom 180ms linear, top 180ms linear, opacity 180ms ease, transform 180ms linear",
        filter: "drop-shadow(0 0 10px rgba(0,0,0,0.26))",
        marginLeft: MOVE_ANIMATION_LEFT_OFFSET_PX,
      }
    : null;

  if (effectStyle) {
    if (layout === "buff") {
      // Buff moves: keep the effect centered and exactly 10px above the
      // rendered character animation.
      effectStyle.left = "50%";
      effectStyle.top =
        buffEffectTopPx != null
          ? `${Math.max(0, buffEffectTopPx - effectProgress * 20)}px`
          : "18px";
      effectStyle.bottom = "auto";
      effectStyle.transform = "translateX(-50%)";
      effectStyle.marginLeft = 0;
    } else {
      // Horizontal-only effect movement.
      // The effect starts at the rightmost edge of the character animation and stays
      // aligned with the middle height of the character while traveling right.
      const characterLeft = layout === "melee" ? 3 + charProgress * 7 : 3;
      const characterWidth = 64;
      const effectStartLeft = characterLeft + characterWidth;
      effectStyle.left = `${effectStartLeft + effectProgress * 24}%`;
      effectStyle.bottom = `calc(51% - ${EFFECT_ANIMATION_RELATIVE_DOWN_OFFSET_PX}px)`;
      effectStyle.transform = "translateX(-50%)";
    }
  }

  return (
    <div
      style={{
        position: "relative",
        width: "92%",
        height: 340,
        maxWidth: 420,
        minWidth: 240,
        margin: "0 auto",
        borderRadius: 5,
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(2px)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 55%, rgba(0,0,0,0.35) 65%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0) 78%)",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 55%, rgba(0,0,0,0.35) 65%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0) 78%)",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        ref={stageRef}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          zIndex: 1,
        }}
      >
        <img
          ref={characterImgRef}
          src={currentCharacterSrc}
          alt={move?.name || "Move animation"}
          draggable={false}
          style={characterStyle}
        />

        {currentEffectSrc ? (
          <img
            ref={effectImgRef}
            src={currentEffectSrc}
            alt={`${move?.name || "Move"} effect`}
            draggable={false}
            style={effectStyle}
          />
        ) : null}
      </div>
    </div>
  );
}


export default function Character(props) {
  const { activeAddress, signTransactions } = useWallet();

  const [nft, setNft] = useState(null);
  const [nftUrl, setNftUrl] = useState(null);
  const [charStats, setCharStats] = useState(null);
  const [charObject, setCharObject] = useState(null);
  const [action, setAction] = useState(null);
  const [xp, setXp] = useState(0);
  const [windowSize, setWindowSize] = useState([0, 0]);
  const [tree, setTree] = useState(null);
  const [points, setPoints] = useState(new Uint8Array(POINTS_BYTE_LENGTH));
  const [oldPoints, setOldPoints] = useState(new Uint8Array(POINTS_BYTE_LENGTH));
  const [equippedMeta, setEquippedMeta] = useState(null);
  const [equippedTraits, setEquippedTraits] = useState([]);
  const [equippedGainedEffects, setEquippedGainedEffects] = useState(
    cloneEmptyGainedEffects()
  );
  // Background image URL derived from the equipped Background trait.
  // Initialises to an empty string; populated once equippedMeta is fetched.
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");

  const router = useRouter();

  // Move cards should stack into their own rows a bit earlier than the normal
  // Grid breakpoint so the layout collapses about 150px sooner.
  const moveCardsSingleRow = windowSize[0] > 0 && windowSize[0] <= 800;

  const buildEquippedTraitsFromMeta = async (client, metaDoc) => {
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
        const effectMedians = await readTraitEffectMedians(
          client,
          name,
          effects.length
        );

        return {
          type,
          name,
          assetId: traitDef?.assetId || null,
          total: traitDef?.total || traitDef?.champions || null,
          effects,
          effectMedians,
        };
      })
    );

    return built.filter(Boolean);
  };

  const buildGainedEffectsFromEquippedTraits = (traits) => {
    const result = cloneEmptyGainedEffects();

    (Array.isArray(traits) ? traits : []).forEach((trait) => {
      if (!trait || !Array.isArray(trait.effects)) return;

      trait.effects.forEach((effectText, effectIndex) => {
        const amount = Number(trait.effectMedians?.[effectIndex] || 0);
        if (!amount) return;
        applyTraitTextToGainedEffects(result, effectText, amount, trait.name);
      });
    });

    return result;
  };

  const fetchData = async () => {
    try {
      const response = await fetch("/api/getNft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nftId: props.nftId,
        }),
      });

      const session = await response.json();

      const client = new algosdk.Algodv2(
        "",
        "https://mainnet-api.algonode.cloud",
        443
      );

      const metaRef = doc(db, "chars", String(props.nftId) + "meta");
      const metaSnap = await getDoc(metaRef);

      let equippedMetaDoc = null;
      let builtTraits = [];
      let metaGainedEffects = cloneEmptyGainedEffects();

      if (metaSnap.exists()) {
        equippedMetaDoc = metaSnap.data() || null;
        builtTraits = await buildEquippedTraitsFromMeta(client, equippedMetaDoc);
        metaGainedEffects = buildGainedEffectsFromEquippedTraits(builtTraits);

        // Derive the background image URL from the equipped Background trait name.
        // equippedMetaDoc.properties.Background holds the raw trait name string,
        // e.g. "Aqua Background", "Red Moon Background", etc.
        const bgTraitName = equippedMetaDoc?.properties?.Background || "";
        const bgUrl = await fetchBackgroundImageUrl(bgTraitName);
        setBackgroundImageUrl(bgUrl);
      }

      setEquippedMeta(equippedMetaDoc);
      setEquippedTraits(builtTraits);
      setEquippedGainedEffects(metaGainedEffects);

      if (session.charObject != "none") {
        const mergedChar = mergeGainedEffectsIntoCharacter(
          session.charObject.charObj,
          metaGainedEffects
        );
        setCharObject(mergedChar);
      }

      if (session.action) {
        setAction(session.action);
      }

      if (
        session.nft.assets[0].params.creator ==
        "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY"
      ) {
        const addr = algosdk.decodeAddress(session.nft.assets[0].params.reserve);
        const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey);
        const ocid = CID.create(0, 0x70, mhdigest);

        const char = JSON.parse(session.charStats);
        const properties = JSON.stringify(char.properties);

        setNft(session.nft.assets[0].params);
        setNftUrl("https://ipfs.dark-coin.io/ipfs/" + ocid.toString());
        setCharStats(properties);
      } else {
        setNft(session.nft.assets[0].params);
        setNftUrl(
          "https://ipfs.dark-coin.io/ipfs/" +
            session.nft.assets[0].params.url.slice(34)
        );
        setCharStats(session.charStats);
      }

      const indexerClient = new algosdk.Indexer(
        "",
        "https://mainnet-idx.algonode.cloud",
        443
      );

      await indexerClient.searchForTransactions(1870514811).do();

      const assetBox = algosdk.encodeUint64(props.nftId);

      try {
        const accountBoxXp = await client
          .getApplicationBoxByName(
            props.contracts.dragonshorde,
            new Uint8Array([...assetBox, ...new Uint8Array(Buffer.from("xp"))])
          )
          .do();

        const length = accountBoxXp.value.length;
        const buffer = Buffer.from(accountBoxXp.value);
        const result = buffer.readUIntBE(0, length);

        setXp(result);
      } catch (err) {}

      try {
        const accountBoxPoints = await client
          .getApplicationBoxByName(
            props.contracts.dragonshorde,
            new Uint8Array([
              ...assetBox,
              ...new Uint8Array(Buffer.from("points")),
            ])
          )
          .do();

        const normalizedPoints = normalizePointsArray(accountBoxPoints.value);
        setOldPoints(normalizedPoints);
        setPoints(normalizedPoints);
      } catch (err) {}

      const windowSizeHandler = () => {
        setWindowSize([window.innerWidth, window.innerHeight]);
      };
      window.addEventListener("resize", windowSizeHandler);
      setWindowSize([window.innerWidth, window.innerHeight]);

      return () => {
        window.removeEventListener("resize", windowSizeHandler);
      };
    } catch (error) {
      console.error("Character fetchData error:", error);
    }
  };

  useEffect(() => {
    if (props.nftId) {
      fetchData();
    }
  }, [router, props.nftId]);

  const assignPoints = (byte, action, max, tier) => {
    let level = 1;
    let nextLvl = 100;

    while (xp >= nextLvl) {
      nextLvl = nextLvl + 200 * level + 100;
      level++;
    }

    let totalPoints = 0;
    for (let i = 0; i < points.length; i++) {
      totalPoints += points[i];
    }

    const treeByte = Math.floor(byte / 100);
    const newPoints = points.slice();

    if (totalPoints > level - 1 && action == "plus") {
    } else if (tier == 1) {
      if (points[treeByte * 100] == 3) {
        if (action == "plus") {
          if (newPoints[byte] + 1 <= max) newPoints[byte]++;
        } else if (action == "minus") {
          if (newPoints[byte] - 1 >= 0) newPoints[byte]--;
        }
      }
    } else {
      if (action == "plus") {
        if (newPoints[byte] + 1 <= max) newPoints[byte]++;
      } else if (action == "minus") {
        if (
          !(
            newPoints[byte] - 1 < 0 ||
            points[treeByte * 100 + 1] > 0 ||
            points[treeByte * 100 + 2]
          )
        ) {
          newPoints[byte]--;
        }
      }
    }

    setPoints(newPoints);
  };

  function isInt(value) {
    return typeof value === "number" && value % 1 === 0;
  }

  function incrementNumbers(str, byte, scalePercent = false) {
    return str
      .split(" ")
      .map((token) => {
        const isPercent = token.slice(token.length - 1) == "%";
        if (isPercent && !scalePercent) return token;
        const num = parseFloat(isPercent ? token.slice(0, -1) : token);
        if (!isNaN(num)) {
          const scaledValue = num * points[byte];
          const formattedValue = isInt(num)
            ? String(scaledValue)
            : String(scaledValue.toFixed(1));
          return isPercent ? `${formattedValue}%` : formattedValue;
        }
        return token;
      })
      .join(" ");
  }

  function calcEffectiveCooldown(baseCooldown, speed) {
    const cd = Number(baseCooldown ?? 0);
    const s = Number(speed ?? 0);

    if (!Number.isFinite(cd)) return 0;
    if (!Number.isFinite(s) || s <= 0) return cd;

    // Effective cooldown is base cooldown scaled around 50 speed.
    // Faster champions act sooner, slower champions wait longer.
    return cd * (50 / s);
  }

  function getTreePointTotal(treeNode, pointArray = oldPoints) {
    if (!treeNode?.skill1) return 0;

    const startByte = Math.floor(Number(treeNode.skill1.byte || 0) / 100) * 100;
    let total = 0;

    for (let i = startByte; i < startByte + 100 && i < pointArray.length; i += 1) {
      total += Number(pointArray[i] || 0);
    }

    return total;
  }

  function getTreeHasAddedPoints(treeNode) {
    return getTreePointTotal(treeNode, oldPoints) > 0;
  }

  function getMoveRange(moveType) {
    const type = String(moveType || "").toLowerCase();
    if (type.startsWith("melee")) return "melee";
    if (type.startsWith("ranged")) return "ranged";
    if (type.startsWith("magic")) return "magic";
    return null;
  }

  function getMoveClass(moveType) {
    const type = String(moveType || "").toLowerCase();
    if (type.includes("damage")) return "damage";
    if (type.includes("curse")) return "curse";
    if (type.includes("buff")) return "buff";
    return null;
  }

  function getMoveScalingStatKey(moveType) {
    const range = getMoveRange(moveType);
    if (range === "melee") return "strength";
    if (range === "ranged") return "dexterity";
    if (range === "magic") return "intelligence";
    return null;
  }

  function getMoveStatScalingMultiplier(moveType) {
    const moveClass = getMoveClass(moveType);
    if (moveClass === "damage") return 1;
    if (moveClass === "curse" || moveClass === "buff") return 0.5;
    return 0;
  }

  function getMoveStatScaledBonus(moveType, statValue) {
    const moveClass = getMoveClass(moveType);
    const n = Number(statValue || 0);

    if (moveClass === "damage") {
      return n;
    }

    if (moveClass === "curse" || moveClass === "buff") {
      return Math.floor(n / 2);
    }

    return 0;
  }

  function getMoveStatScalingLabel(moveType, statKey) {
    const moveClass = getMoveClass(moveType);

    if (!statKey) return "from adjustments";
    if (moveClass === "damage") return `from adjusted ${statKey} x1`;
    if (moveClass === "curse" || moveClass === "buff") {
      return `from floor(adjusted ${statKey} / 2)`;
    }

    return "from adjustments";
  }

  function getAdjustedPrimaryStats(charObj, adjustments = {}) {
    return {
      strength: Number(charObj?.strength || 0) + Number(adjustments.strength || 0),
      dexterity: Number(charObj?.dexterity || 0) + Number(adjustments.dexterity || 0),
      intelligence:
        Number(charObj?.intelligence || 0) + Number(adjustments.intelligence || 0),
    };
  }

  function getDerivedCoreStatBonuses(primaryStats) {
    return {
      health: Number(primaryStats?.strength || 0) * 2,
      speed: Number(primaryStats?.dexterity || 0),
      resist: Number(primaryStats?.intelligence || 0),
    };
  }

  function getBaseCoreStatValue(charObj, statKey) {
    const rawBase = charObj?.baseStats?.[statKey];
    if (rawBase !== null && typeof rawBase !== "undefined") {
      return Number(rawBase || 0);
    }

    // New generated champions store health/speed/resist as their flat base values
    // before derived stat scaling: health 200, speed 50, resist 10.
    // Older champions may not have baseStats, so fall back to the current field.
    return Number(charObj?.[statKey] || 0);
  }

  function getMovePowerBreakdown(move, charObj, adjustments = {}) {
    const basePower = Number(move?.power || 0);
    const statKey = getMoveScalingStatKey(move?.type);
    const multiplier = getMoveStatScalingMultiplier(move?.type);

    if (!statKey || !multiplier) {
      return {
        baseValue: basePower,
        finalValue: basePower,
        statKey: null,
        multiplier: 0,
        baseStatValue: 0,
        finalStatValue: 0,
        baseStatBonus: 0,
        finalStatBonus: 0,
      };
    }

    const baseStatValue = Number(charObj?.[statKey] || 0);
    const finalStatValue = baseStatValue + Number(adjustments?.[statKey] || 0);
    const baseStatBonus = getMoveStatScaledBonus(move?.type, baseStatValue);
    const finalStatBonus = getMoveStatScaledBonus(move?.type, finalStatValue);

    return {
      baseValue: basePower,
      finalValue: basePower + finalStatBonus,
      statKey,
      multiplier,
      baseStatValue,
      finalStatValue,
      baseStatBonus,
      finalStatBonus,
    };
  }

  const applyPoints = async () => {
    const client = new algosdk.Algodv2(
      "",
      "https://mainnet-api.algonode.cloud",
      443
    );

    await submitApplySkillPoints({
      client,
      activeAddress,
      signTransactions,
      appId: props.contracts.dragonshorde,
      nftId: props.nftId,
      points,
      setMessage: props.setMessage,
    });

    props.setMessage("Transaction Confirmed, Skill Tree Updated");
    fetchData();
  };

  const arraysEqual = (arr1, arr2) =>
    arr1.length === arr2.length && arr1.every((val, i) => val === arr2[i]);

  if (charObject) {
    let level = 1;
    let nextLvl = 100;
    let prevLvl = 0;

    while (xp >= nextLvl) {
      prevLvl = nextLvl;
      nextLvl = nextLvl + 200 * level + 100;
      level++;
    }

    let healthAdj = 0;
    let speedAdj = 0;
    let resistAdj = 0;
    let strengthAdj = 0;
    let dexterityAdj = 0;
    let intelligenceAdj = 0;
    let accuracyAdj = 0;
    let critChanceAdj = 0;
    let critDamageAdj = 0;
    let cooldownAdj = 0;

    healthAdj += Number(charObject?.traitStatBonuses?.health || 0);
    speedAdj += Number(charObject?.traitStatBonuses?.speed || 0);
    resistAdj += Number(charObject?.traitStatBonuses?.resist || 0);
    strengthAdj += Number(charObject?.traitStatBonuses?.strength || 0);
    dexterityAdj += Number(charObject?.traitStatBonuses?.dexterity || 0);
    intelligenceAdj += Number(charObject?.traitStatBonuses?.intelligence || 0);
    accuracyAdj += Number(charObject?.traitStatBonuses?.accuracy || 0);
    critChanceAdj += Number(charObject?.traitStatBonuses?.critChance || 0);
    critDamageAdj += Number(charObject?.traitStatBonuses?.critDamage || 0);

    if (charObject.effects) {
      if (charObject.effects["poison"]) {
        healthAdj -= charObject.effects["poison"] * 1;
      }
      if (charObject.effects["bleed"]) {
        healthAdj -= charObject.effects["bleed"] * 0.7;
        strengthAdj -= charObject.effects["bleed"] * 0.1;
      }
      if (charObject.effects["burn"]) {
        healthAdj -= charObject.effects["burn"] * 0.5;
        intelligenceAdj -= charObject.effects["burn"] * 0.1;
        strengthAdj += charObject.effects["burn"] * 0.1;
        speedAdj += charObject.effects["burn"] * 0.2;
      }
      if (charObject.effects["freeze"]) {
        speedAdj -= charObject.effects["freeze"] * 0.2;
        dexterityAdj -= charObject.effects["freeze"] * 0.2;
      }
      if (charObject.effects["slow"]) {
        speedAdj -= charObject.effects["slow"] * 0.3;
        dexterityAdj -= charObject.effects["slow"] * 0.1;
      }
      if (charObject.effects["paralyze"]) {
        accuracyAdj -= charObject.effects["paralyze"] * 0.2;
      }
      if (charObject.effects["drown"]) {
        dexterityAdj -= charObject.effects["drown"] * 0.3;
        accuracyAdj -= charObject.effects["drown"] * 0.1;
      }
      if (charObject.effects["doom"]) {
        healthAdj -= charObject.effects["doom"] * 0.3;
        resistAdj -= charObject.effects["doom"] * 0.2;
        intelligenceAdj -= charObject.effects["doom"] * 0.2;
      }

      if (charObject.effects["strengthen"]) {
        strengthAdj += charObject.effects["strengthen"] * 0.3;
      }
      if (charObject.effects["empower"]) {
        intelligenceAdj += charObject.effects["empower"] * 0.3;
      }
      if (charObject.effects["hasten"]) {
        dexterityAdj += charObject.effects["hasten"] * 0.3;
        speedAdj += charObject.effects["hasten"] * 0.1;
      }
      if (charObject.effects["nurture"]) {
        healthAdj += charObject.effects["nurture"] * 0.5;
      }
      if (charObject.effects["bless"]) {
        strengthAdj += charObject.effects["bless"] * 0.2;
        intelligenceAdj += charObject.effects["bless"] * 0.2;
        resistAdj += charObject.effects["bless"] * 0.1;
      }
      if (charObject.effects["focus"]) {
        accuracyAdj += charObject.effects["focus"] * 0.3;
        critChanceAdj += charObject.effects["focus"] * 0.04;
      }
    }

    const skillPointStatAdjustments = getSkillPointStatAdjustments(oldPoints);
    healthAdj += skillPointStatAdjustments.health;
    speedAdj += skillPointStatAdjustments.speed;
    resistAdj += skillPointStatAdjustments.resist;
    strengthAdj += skillPointStatAdjustments.strength;
    dexterityAdj += skillPointStatAdjustments.dexterity;
    intelligenceAdj += skillPointStatAdjustments.intelligence;
    accuracyAdj += skillPointStatAdjustments.accuracy;
    critChanceAdj += skillPointStatAdjustments.critChance;
    critDamageAdj += skillPointStatAdjustments.critDamage;

    const poisonAdj = Number(oldPoints[0] || 0);
    const bleedAdj = Number(oldPoints[100] || 0);
    const burnAdj = Number(oldPoints[200] || 0);
    const freezeAdj = Number(oldPoints[300] || 0);
    const slowAdj = Number(oldPoints[400] || 0);
    const drownAdj = Number(oldPoints[500] || 0);
    const paralyzeAdj = Number(oldPoints[600] || 0);
    const doomAdj = Number(oldPoints[700] || 0);

    const shieldAdj = Number(oldPoints[800] || 0);
    const strengthenAdj = Number(oldPoints[900] || 0);
    const focusAdj = Number(oldPoints[1000] || 0);
    const empowerAdj = Number(oldPoints[1100] || 0);
    const nurtureAdj = Number(oldPoints[1200] || 0);
    const blessAdj = Number(oldPoints[1300] || 0);
    const hastenAdj = Number(oldPoints[1400] || 0);
    const cleanseAdj = Number(oldPoints[1500] || 0);

    const effectSkillTreeAdjMap = {
      poison: poisonAdj,
      bleed: bleedAdj,
      burn: burnAdj,
      freeze: freezeAdj,
      slow: slowAdj,
      drown: drownAdj,
      paralyze: paralyzeAdj,
      doom: doomAdj,
      shield: shieldAdj,
      strengthen: strengthenAdj,
      focus: focusAdj,
      empower: empowerAdj,
      nurture: nurtureAdj,
      bless: blessAdj,
      hasten: hastenAdj,
      cleanse: cleanseAdj,
    };

    const adjustedPrimaryStats = getAdjustedPrimaryStats(charObject, {
      strength: strengthAdj,
      dexterity: dexterityAdj,
      intelligence: intelligenceAdj,
    });

    const baseDerivedCoreBonuses = getDerivedCoreStatBonuses({
      strength: Number(charObject?.strength || 0),
      dexterity: Number(charObject?.dexterity || 0),
      intelligence: Number(charObject?.intelligence || 0),
    });

    const finalDerivedCoreBonuses = getDerivedCoreStatBonuses(adjustedPrimaryStats);

    const baseHealthValue =
      getBaseCoreStatValue(charObject, "health") + baseDerivedCoreBonuses.health;
    const finalHealthValue =
      getBaseCoreStatValue(charObject, "health") +
      finalDerivedCoreBonuses.health +
      healthAdj;
    const baseSpeedValue =
      getBaseCoreStatValue(charObject, "speed") + baseDerivedCoreBonuses.speed;
    const finalSpeedValue =
      getBaseCoreStatValue(charObject, "speed") + finalDerivedCoreBonuses.speed + speedAdj;
    const baseResistValue =
      getBaseCoreStatValue(charObject, "resist") + baseDerivedCoreBonuses.resist;
    const finalResistValue =
      getBaseCoreStatValue(charObject, "resist") + finalDerivedCoreBonuses.resist + resistAdj;

    const getAdjustedEffectValue = (effectKey) => {
      if (!effectKey) return 0;

      return (
        Number(charObject?.[effectKey] || 0) +
        Number(effectSkillTreeAdjMap?.[effectKey] || 0)
      );
    };

    const getAdjustedBattleTraitAmount = (effectKey, baseAmount) => {
      const baseValue = Number(baseAmount || 0);
      const modifierValue = getAdjustedEffectValue(effectKey);
      const finalValue = baseValue + modifierValue;

      return {
        baseValue,
        modifierValue,
        finalValue,
      };
    };

    const renderEffectTile = (effectKey, adjValue) => {
      const baseValue = Number(charObject?.baseComparison?.effects?.[effectKey] || 0);
      const mergedValue = Number(charObject[effectKey] || 0);
      const finalValue = mergedValue + Number(adjValue || 0);
      const totalModifier = finalValue - baseValue;

      if (finalValue <= 0) return null;

      const icon = getEffectIcon(effectKey);
      if (!icon) return null;

      return (
        <Grid item xs={6} sm={4} md={3} lg={2} key={effectKey}>
          <div
            style={{
              ...dcPanelStyle,
              padding: "14px 8px",
              minHeight: 122,
              display: "grid",
              alignItems: "center",
              justifyItems: "center",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(0,0,0,0.82))",
            }}
          >
            <img
              src={icon}
              alt={effectKey}
              draggable={false}
              style={{
                zIndex: 10,
                height: 46,
                width: 46,
                objectFit: "contain",
                borderRadius: 5,
                display: "flex",
                margin: "auto",
                padding: 5,
                filter:
                  "brightness(1.25) drop-shadow(0 0 8px rgba(255,255,255,0.24))",
              }}
            />
            <Typography
              align="center"
              variant="caption"
              style={{ ...dcLabelStyle, fontSize: 10 }}
            >
              {effectKey}
            </Typography>
            <Typography
              align="center"
              variant="subtitle1"
              style={{
                color: getComparisonColor(finalValue, baseValue),
                fontWeight: 800,
                textShadow: "0 0 12px rgba(255,255,255,0.22)",
              }}
            >
              {finalValue}
            </Typography>
            {renderValueBreakdown(baseValue, totalModifier, 1)}
          </div>
        </Grid>
      );
    };

    const moveAccuracyBreakdowns = Array.isArray(
      charObject?.gainedEffectsMeta?.moveAccuracyBreakdowns
    )
      ? charObject.gainedEffectsMeta.moveAccuracyBreakdowns.filter((entry) =>
          Number(entry?.amount || 0)
        )
      : [];

    const moveAccuracyTotals = charObject?.gainedEffectsMeta?.moveAccuracy || {};



    const primaryStats = [
      {
        label: "Speed",
        icon: "/dragonshorde/speed.png",
        baseValue: baseSpeedValue,
        finalValue: finalSpeedValue,
      },
      {
        label: "Resist",
        icon: "/dragonshorde/resist.png",
        baseValue: baseResistValue,
        finalValue: finalResistValue,
      },
      {
        label: "Strength",
        icon: "/dragonshorde/strength.svg",
        baseValue: Number(charObject?.baseComparison?.stats?.strength || 0),
        finalValue: Number(charObject.strength + strengthAdj),
      },
      {
        label: "Dexterity",
        icon: "/dragonshorde/dexterity.svg",
        baseValue: Number(charObject?.baseComparison?.stats?.dexterity || 0),
        finalValue: Number(charObject.dexterity + dexterityAdj),
      },
      {
        label: "Intelligence",
        icon: "/dragonshorde/intelligence.svg",
        baseValue: Number(charObject?.baseComparison?.stats?.intelligence || 0),
        finalValue: Number(charObject.intelligence + intelligenceAdj),
      },
      {
        label: "Crit Chance",
        icon: "/dragonshorde/critChance.svg",
        baseValue: getCharacterPercentStat(
          charObject?.baseComparison?.stats,
          "critChance",
          DEFAULT_CRIT_CHANCE
        ),
        finalValue:
          getCharacterPercentStat(charObject, "critChance", DEFAULT_CRIT_CHANCE) +
          critChanceAdj,
        suffix: "%",
      },
      {
        label: "Crit Damage",
        icon: "/dragonshorde/critDamage.svg",
        baseValue: getCharacterPercentStat(
          charObject?.baseComparison?.stats,
          "critDamage",
          DEFAULT_CRIT_DAMAGE
        ),
        finalValue:
          getCharacterPercentStat(charObject, "critDamage", DEFAULT_CRIT_DAMAGE) +
          critDamageAdj,
        suffix: "%",
      },
    ];

    return (
      <div style={dcPageStyle}>
        <div style={dcBackdropStyle(backgroundImageUrl)} />
        <div style={dcVignetteStyle} />

        <div style={dcContentStyle}>
          {!props.hideDeleteButton ? (
            <Button
              style={{ ...dcButtonStyle, marginBottom: 22 }}
              onClick={() => props.deleteChar(props.nftId)}
            >
              Delete Character
            </Button>
          ) : null}

          <section
            style={{
              ...dcPanelStyle,
              minHeight: 560,
              padding: "clamp(22px, 4vw, 54px)",
              marginBottom: 28,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.9)), rgba(0,0,0,0.78)",
            }}
          >
            <Typography
              align="center"
              variant="overline"
              style={{ ...dcLabelStyle, display: "block", marginBottom: 8 }}
            >
              Champion of the Realm
            </Typography>

            <Typography
              align="center"
              variant="h3"
              style={{
                ...dcPanelHeaderStyle,
                fontSize: "clamp(2rem, 6vw, 5.5rem)",
                lineHeight: 1,
                marginBottom: 8,
              }}
            >
              {charObject.name}
            </Typography>
            <br />

            <div style={dcDividerStyle}>
              <span style={dcDividerLineStyle} />
              <span style={dcCrescentStyle}>☾</span>
              <span style={dcDividerLineStyle} />
            </div>

            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={5}>
                <div
                  style={{
                    position: "relative",
                    width: "min(440px, 92%)",
                    margin: "0 auto",
                    borderRadius: 4,
                    overflow: "hidden",
                    border: `1px solid ${DC_THEME.lineStrong}`,
                    background: "rgba(0,0,0,0.72)",
                    boxShadow: DC_THEME.glowStrong,
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      filter: "contrast(1.1) blur(1.5px)",
                      opacity: 0.72,
                      WebkitMaskImage:
                        "radial-gradient(ellipse at center, rgba(0,0,0,1) 58%, rgba(0,0,0,0.36) 72%, rgba(0,0,0,0) 88%)",
                      maskImage:
                        "radial-gradient(ellipse at center, rgba(0,0,0,1) 58%, rgba(0,0,0,0.36) 72%, rgba(0,0,0,0) 88%)",
                      pointerEvents: "none",
                      zIndex: 0,
                    }}
                  />

                  <AnimatedFrameImage
                    frames={charObject.idleFrames || charObject?.animation?.idle?.frameUrls}
                    fallbackSrc={charObject.standingUrl}
                    alt="Champion idle"
                    style={{
                      display: "block",
                      width: "82%",
                      height: "auto",
                      borderRadius: 5,
                      position: "relative",
                      zIndex: 1,
                      margin: "0 auto",
                      filter: "drop-shadow(0 18px 24px rgba(0,0,0,0.78))",
                    }}
                  />
                </div>
              </Grid>

              <Grid item xs={12} md={7}>
                <div style={{ ...dcPanelStyle, padding: "20px clamp(14px, 3vw, 28px)" }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography align="center" variant="overline" style={dcLabelStyle}>
                        Level {level}
                      </Typography>
                      <BorderLinearProgress
                        variant="determinate"
                        style={{ marginTop: 8, marginBottom: 8 }}
                        value={((xp - prevLvl) / (nextLvl - prevLvl)) * 100}
                      />
                      <Typography
                        align="center"
                        variant="caption"
                        style={{
                          fontFamily: "Jacques, Georgia, serif",
                          letterSpacing: "0.15em",
                          color: DC_THEME.muted,
                          display: "block",
                        }}
                      >
                        {xp} / {nextLvl} XP
                      </Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <div style={{ borderTop: `1px solid ${DC_THEME.line}`, margin: "16px 0" }} />
                    </Grid>

                    <Grid item xs={12}>
                      <Typography align="center" variant="overline" style={dcLabelStyle}>
                        Vitality
                      </Typography>
                      <img
                        src="/dragonshorde/health.svg"
                        alt="health"
                        draggable={false}
                        style={{
                          width: 68,
                          display: "flex",
                          margin: "8px auto",
                          filter:
                            "drop-shadow(0 0 8px rgba(255,255,255,0.22))",
                        }}
                      />
                      <BorderLinearProgressHealth
                        variant="determinate"
                        value={(finalHealthValue / Math.max(1, finalHealthValue)) * 100}
                      />
                      <Typography align="center" variant="subtitle1" style={{ color: DC_THEME.text }}>
                        {finalHealthValue.toFixed(1)} / {finalHealthValue.toFixed(1)}
                      </Typography>
                      {renderValueBreakdown(
                        baseHealthValue,
                        finalHealthValue - baseHealthValue,
                        1
                      )}
                    </Grid>

                    {primaryStats.map((stat) => {
                      const totalModifier = stat.finalValue - stat.baseValue;

                      return (
                        <Grid item xs={6} sm={4} key={stat.label}>
                          <div
                            style={{
                              border: `1px solid ${DC_THEME.line}`,
                              background: "rgba(255,255,255,0.035)",
                              padding: "12px 8px",
                              minHeight: 132,
                              width: "calc(100% + 20px)",
                              marginLeft: -10,
                              marginRight: -10,
                              boxSizing: "border-box",
                            }}
                          >
                            <img
                              src={stat.icon}
                              alt={stat.label}
                              draggable={false}
                              style={{
                                width: 52,
                                height: 52,
                                objectFit: "contain",
                                display: "flex",
                                margin: "0 auto 6px",
                                
                              }}
                            />
                            <Typography
                              align="center"
                              variant="caption"
                              style={{
                                ...dcLabelStyle,
                                display: "block",
                                width: "100%",
                                textAlign: "center",
                              }}
                            >
                              {stat.label}
                            </Typography>
                            <Typography
                              align="center"
                              variant="subtitle1"
                              style={{
                                color: getComparisonColor(stat.finalValue, stat.baseValue),
                                fontWeight: 800,
                              }}
                            >
                              {stat.finalValue.toFixed(1)}{stat.suffix || ""}
                            </Typography>
                            {renderValueBreakdown(
                              stat.baseValue,
                              totalModifier,
                              1,
                              stat.suffix || ""
                            )}
                          </div>
                        </Grid>
                      );
                    })}
                  </Grid>
                </div>
              </Grid>
            </Grid>
          </section>

          {Array.isArray(equippedTraits) && equippedTraits.length > 0 ? (
            <section style={{ ...dcPanelStyle, padding: 24, marginBottom: 28 }}>
              <Typography
          align="center"
          variant="h5"
          style={{
            ...dcPanelHeaderStyle,
            marginBottom: 20,
          }}
        >
                Equipped Trait Effects
              </Typography>

              <div style={dcDividerStyle}>
                <span style={dcDividerLineStyle} />
                <span style={dcCrescentStyle}>☾</span>
                <span style={dcDividerLineStyle} />
              </div>

              <Grid container spacing={2}>
                {equippedTraits.map((trait) => (
                  <Grid item xs={12} sm={6} md={4} key={`${trait.type}-${trait.name}`}>
                    <div
                      style={{
                        height: "100%",
                        border: `1px solid ${DC_THEME.line}`,
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(0,0,0,0.72))",
                        padding: 16,
                        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
                      }}
                    >
                      <Typography
                        align="center"
                        variant="caption"
                        style={{
                          ...dcLabelStyle,
                          display: "block",
                          width: "100%",
                          textAlign: "center",
                        }}
                      >
                        {trait.type}
                      </Typography>
                      <Typography
                        align="center"
                        variant="subtitle1"
                        style={{ color: DC_THEME.text, fontWeight: 800, marginBottom: 10 }}
                      >
                        {trait.name}
                      </Typography>

                      {trait.effects.length > 0 ? (
                        trait.effects.map((effectText, effectIndex) => {
                          const amount = Number(trait.effectMedians?.[effectIndex] || 0);
                          const battleDescriptor = getTraitBattleEffectDescriptor(effectText);
                          const adjustedBattleAmount =
                            battleDescriptor?.effectKey && amount
                              ? getAdjustedBattleTraitAmount(
                                  battleDescriptor.effectKey,
                                  amount
                                )
                              : null;
                          const adjustedBattleLine = adjustedBattleAmount
                            ? `${effectText} +${Number(adjustedBattleAmount.finalValue).toFixed(1)}${
                                Number(adjustedBattleAmount.modifierValue || 0) !== 0
                                  ? ` (${Number(adjustedBattleAmount.baseValue).toFixed(
                                      1
                                    )} base ${formatSigned(
                                      adjustedBattleAmount.modifierValue,
                                      1
                                    )} adjusted ${battleDescriptor.effectKey})`
                                  : ""
                              }`
                            : null;

                          return (
                            <Typography
                              key={`${trait.name}-${effectText}-${effectIndex}`}
                              align="center"
                              variant="caption"
                              style={{
                                color: amount ? "rgba(255,255,255,0.95)" : DC_THEME.muted,
                                display: "block",
                                paddingTop: 8,
                                marginTop: 8,
                                borderTop:
                                  effectIndex === 0
                                    ? "none"
                                    : "1px solid rgba(255,255,255,0.12)",
                                lineHeight: 1.5,
                              }}
                            >
                              {amount
                                ? adjustedBattleLine || `${effectText} +${amount}`
                                : `${effectText} — no potency vote found`}
                            </Typography>
                          );
                        })
                      ) : (
                        <Typography
                          align="center"
                          variant="caption"
                          style={{ color: DC_THEME.muted, display: "block", marginTop: 4 }}
                        >
                          No configured effects for this trait name.
                        </Typography>
                      )}
                    </div>
                  </Grid>
                ))}
              </Grid>
            </section>
          ) : null}

          <section style={{ ...dcPanelStyle, padding: 24, marginBottom: 28 }}>
            <Typography
          align="center"
          variant="h5"
          style={{
            ...dcPanelHeaderStyle,
            marginBottom: 20,
          }}
        >
              Active Effects
            </Typography>

            <div style={dcDividerStyle}>
              <span style={dcDividerLineStyle} />
              <span style={dcCrescentStyle}>☾</span>
              <span style={dcDividerLineStyle} />
            </div>

            <Grid container spacing={2}>
              {renderEffectTile("bleed", bleedAdj)}
              {renderEffectTile("bless", blessAdj)}
              {renderEffectTile("burn", burnAdj)}
              {renderEffectTile("cleanse", cleanseAdj)}
              {renderEffectTile("doom", doomAdj)}
              {renderEffectTile("drown", drownAdj)}
              {renderEffectTile("empower", empowerAdj)}
              {renderEffectTile("focus", focusAdj)}
              {renderEffectTile("freeze", freezeAdj)}
              {renderEffectTile("hasten", hastenAdj)}
              {renderEffectTile("nurture", nurtureAdj)}
              {renderEffectTile("paralyze", paralyzeAdj)}
              {renderEffectTile("poison", poisonAdj)}
              {renderEffectTile("shield", shieldAdj)}
              {renderEffectTile("slow", slowAdj)}
              {renderEffectTile("strengthen", strengthenAdj)}
            </Grid>
          </section>

          <section style={{ ...dcPanelStyle, padding: 24, marginBottom: 28 }}>
            <Typography
          align="center"
          variant="h5"
          style={{
            ...dcPanelHeaderStyle,
            marginBottom: 20,
          }}
        >
              Champion Moves
            </Typography>

            <div style={dcDividerStyle}>
              <span style={dcDividerLineStyle} />
              <span style={dcCrescentStyle}>☾</span>
              <span style={dcDividerLineStyle} />
            </div>

            <Grid container spacing={2}>
              {charObject.moves.length > 0
                ? charObject.moves.map((move, index) => {
                    let bonus = 0;
                    if (move.effect == "bleed") bonus = bleedAdj;
                    else if (move.effect == "bless") bonus = blessAdj;
                    else if (move.effect == "burn") bonus = burnAdj;
                    else if (move.effect == "cleanse") bonus = cleanseAdj;
                    else if (move.effect == "doom") bonus = doomAdj;
                    else if (move.effect == "drown") bonus = drownAdj;
                    else if (move.effect == "empower") bonus = empowerAdj;
                    else if (move.effect == "focus") bonus = focusAdj;
                    else if (move.effect == "freeze") bonus = freezeAdj;
                    else if (move.effect == "hasten") bonus = hastenAdj;
                    else if (move.effect == "nurture") bonus = nurtureAdj;
                    else if (move.effect == "paralyze") bonus = paralyzeAdj;
                    else if (move.effect == "poison") bonus = poisonAdj;
                    else if (move.effect == "shield") bonus = shieldAdj;
                    else if (move.effect == "slow") bonus = slowAdj;
                    else if (move.effect == "strengthen") bonus = strengthenAdj;

                    const effectiveSpeed = Math.max(1, Number(finalSpeedValue || 0));
                    const baseCooldown = Number(move.cooldown ?? 0) + cooldownAdj;
                    const effectiveCooldown = calcEffectiveCooldown(baseCooldown, effectiveSpeed);
                    let effectiveCdColor = "#FFFFFF";
                    if (effectiveCooldown < baseCooldown) effectiveCdColor = "#4EC83E";
                    else if (effectiveCooldown > baseCooldown) effectiveCdColor = "#F8575A";

                    const moveTypeText = String(move.type || "").toLowerCase();
                    const moveTypeRoot = moveTypeText.split(" ")[0];
                    const isCurseMoveForAccuracy = moveTypeText.includes("curse");
                    const typeAccuracyBonus = Number(
                      charObject?.gainedEffectsMeta?.moveAccuracy?.[moveTypeRoot] || 0
                    );
                    const curseAccuracyBonus = isCurseMoveForAccuracy
                      ? Number(charObject?.gainedEffectsMeta?.moveAccuracy?.curse || 0)
                      : 0;
                    const allAccuracyBonus = Number(
                      charObject?.gainedEffectsMeta?.moveAccuracy?.all || 0
                    );
                    const typedAccuracyBonus =
                      typeAccuracyBonus + curseAccuracyBonus + allAccuracyBonus;
                    const finalAccuracyAdj = accuracyAdj + typedAccuracyBonus;
                    const powerBreakdown = getMovePowerBreakdown(move, charObject, {
                      strength: strengthAdj,
                      dexterity: dexterityAdj,
                      intelligence: intelligenceAdj,
                    });
                    const powerBase = powerBreakdown.baseValue;
                    const powerFinal = powerBreakdown.finalValue;
                    const accuracyBase = Number(move.accuracy);
                    const accuracyFinal = Number(move.accuracy + finalAccuracyAdj);
                    const moveClass = getMoveClass(move.type);
                    const isDamageMove = moveClass === "damage";
                    const isCurseOrBuffMove =
                      moveClass === "curse" || moveClass === "buff";
                    const moveEffectKey =
                      move.effect && move.effect != "none"
                        ? String(move.effect).toLowerCase()
                        : null;
                    const moveEffectBaseRaw = moveEffectKey
                      ? Number(charObject?.baseComparison?.effects?.[moveEffectKey] || 0)
                      : 0;
                    const moveEffectAdjustedRaw = moveEffectKey
                      ? Number(charObject?.[moveEffectKey] || 0) +
                        Number(effectSkillTreeAdjMap?.[moveEffectKey] || 0)
                      : 0;
                    const moveEffectBaseAmount = isDamageMove
                      ? moveEffectBaseRaw
                      : isCurseOrBuffMove
                      ? moveEffectBaseRaw * 2
                      : Math.ceil(moveEffectBaseRaw / 2);
                    const moveEffectFinalAmount = isDamageMove
                      ? moveEffectAdjustedRaw
                      : isCurseOrBuffMove
                      ? moveEffectAdjustedRaw * 2
                      : Math.ceil(moveEffectAdjustedRaw / 2);

                    if (!move.type) return <div key={index}></div>;

                    return (
                      <Grid
                        item
                        xs={12}
                        sm={moveCardsSingleRow ? 12 : 4}
                        md={4}
                        lg={4}
                        key={index}
                      >
                        <div
                          style={{
                            ...dcPanelStyle,
                            height: "100%",
                            padding: 18,
                            border: `1px solid ${DC_THEME.lineStrong}`,
                          }}
                        >
                          <Typography
                            align="center"
                            variant="subtitle1"
                            style={{
                              ...dcPanelHeaderStyle,
                              fontSize: 16,
                              letterSpacing: "0.18em",
                              marginBottom: 12,
                            }}
                          >
                            {move.name}
                          </Typography>

                          <MoveAnimationPreview move={move} background={backgroundImageUrl} />

                          <Typography
                            align="center"
                            variant="caption"
                            style={{ ...dcLabelStyle, display: "block", marginTop: 12 }}
                          >
                            {move.type}
                          </Typography>

                          <Grid container spacing={1} style={{ marginTop: 8 }}>
                            <Grid item xs={6}>
                              <div style={{ padding: 10 }}>
                                <img
                                  src="/dragonshorde/power.png"
                                  alt="power"
                                  draggable={false}
                                  style={{
                                    width: 46,
                                    display: "flex",
                                    margin: "auto",
                                    
                                  }}
                                />
                                <Typography
                                  align="center"
                                  variant="subtitle1"
                                  style={{
                                    color: getComparisonColor(powerFinal, powerBase),
                                    fontWeight: 800,
                                  }}
                                >
                                  {powerFinal.toFixed(1)}
                                </Typography>
                                {renderMoveValueBreakdown({
                                  baseValue: powerBase,
                                  finalValue: powerFinal,
                                  modifierLabel: getMoveStatScalingLabel(
                                    move.type,
                                    powerBreakdown.statKey
                                  ),
                                  decimals: 1,
                                })}
                              </div>
                            </Grid>

                            <Grid item xs={6}>
                              <div style={{ padding: 10 }}>
                                <img
                                  src="/dragonshorde/accuracy.svg"
                                  alt="accuracy"
                                  draggable={false}
                                  style={{
                                    width: 46,
                                    display: "flex",
                                    margin: "auto",
                                    
                                  }}
                                />
                                <Typography
                                  align="center"
                                  variant="subtitle1"
                                  style={{
                                    color: getComparisonColor(accuracyFinal, accuracyBase),
                                    fontWeight: 800,
                                  }}
                                >
                                  {accuracyFinal.toFixed(1)}
                                </Typography>
                                {renderMoveAccuracyBreakdown({
                                  baseValue: accuracyBase,
                                  accuracyAdj,
                                  typeAccuracyBonus,
                                  curseAccuracyBonus,
                                  allAccuracyBonus,
                                  finalValue: accuracyFinal,
                                })}
                              </div>
                            </Grid>

                            <Grid item xs={12}>
                              <div style={{ padding: 10 }}>
                                <img
                                  src="/dragonshorde/cooldown.png"
                                  alt="cooldown"
                                  draggable={false}
                                  style={{
                                    width: 46,
                                    display: "flex",
                                    margin: "auto",
                                    
                                  }}
                                />
                                <Typography
                                  align="center"
                                  variant="subtitle1"
                                  style={{ color: effectiveCdColor, fontWeight: 800 }}
                                >
                                  {Number(effectiveCooldown).toFixed(1)}
                                </Typography>
                              </div>
                            </Grid>
                          </Grid>

                          {move.effect == "none" ? null : (
                            <div style={{ marginTop: 14, textAlign: "center" }}>
                              {getEffectIcon(move.effect) ? (
                                <img
                                  src={getEffectIcon(move.effect)}
                                  alt={move.effect}
                                  draggable={false}
                                  style={{
                                    height: 48,
                                    display: "flex",
                                    margin: "0 auto 8px",
                                    filter:
                                      "drop-shadow(0 0 8px rgba(255,255,255,0.22))",
                                  }}
                                />
                              ) : null}

                              <Typography
                                align="center"
                                variant="subtitle2"
                                style={{
                                  color: getComparisonColor(
                                    moveEffectFinalAmount,
                                    moveEffectBaseAmount
                                  ),
                                  fontWeight: 800,
                                }}
                              >
                                Apply {moveEffectFinalAmount} {move.effect}
                              </Typography>
                            </div>
                          )}

                          <Typography
                            align="center"
                            variant="body2"
                            style={{ color: DC_THEME.muted, marginTop: 12, lineHeight: 1.55 }}
                          >
                            {move.description}
                          </Typography>
                        </div>
                      </Grid>
                    );
                  })
                : null}
            </Grid>
          </section>

          {!props.hideSkillTree ? (
            <section style={{ ...dcPanelStyle, padding: 24 }}>
              <Typography
          align="center"
          variant="h5"
          style={{
            ...dcPanelHeaderStyle,
            marginBottom: 20,
          }}
        >
                Skill Tree
              </Typography>

              <div style={dcDividerStyle}>
                <span style={dcDividerLineStyle} />
                <span style={dcCrescentStyle}>☾</span>
                <span style={dcDividerLineStyle} />
              </div>

              <Grid container spacing={1} justifyContent="center">
                {trees.map((treeNode, index) => {
                  const treePointTotal = getTreePointTotal(treeNode, oldPoints);
                  const hasAddedPoints = treePointTotal > 0;
                  const isSelectedTree = treeNode == tree;

                  return (
                    <Grid key={index} item xs={3} sm={2} md={1.5}>
                      <Button
                        style={{
                          minWidth: 0,
                          width: "100%",
                          aspectRatio: "1 / 1",
                          position: "relative",
                          borderRadius: 4,
                          padding: 8,
                          border: hasAddedPoints
                            ? "1px solid rgba(255,255,255,0.95)"
                            : isSelectedTree
                            ? "1px solid rgba(255,255,255,0.72)"
                            : "1px solid rgba(255,255,255,0.18)",
                          boxShadow: hasAddedPoints
                            ? "0 0 18px rgba(255,255,255,0.38)"
                            : isSelectedTree
                            ? DC_THEME.glow
                            : "none",
                          background: hasAddedPoints
                            ? "rgba(255,255,255,0.12)"
                            : "rgba(0,0,0,0.48)",
                        }}
                        onClick={() =>
                          treeNode == tree ? setTree(null) : setTree(treeNode)
                        }
                      >
                        <img
                          src={
                            treeNode.skill1.iconSrc ||
                            `/dragonshorde/trees/${treeNode.skill1.title}.svg`
                          }
                          alt={treeNode.skill1.title}
                          draggable={false}
                          style={{
                            width: "100%",
                            filter: hasAddedPoints
                              ? "brightness(1.55) drop-shadow(0 0 8px rgba(255,255,255,0.55))"
                              : "brightness(1.18)",
                          }}
                        />

                        {hasAddedPoints ? (
                          <span
                            style={{
                              position: "absolute",
                              top: -7,
                              right: -7,
                              minWidth: 20,
                              height: 20,
                              padding: "0 5px",
                              borderRadius: 999,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "#fff",
                              color: "#000",
                              border: "1px solid rgba(0,0,0,0.55)",
                              fontSize: 10,
                              fontWeight: 900,
                              lineHeight: 1,
                            }}
                          >
                            {treePointTotal}
                          </span>
                        ) : null}
                      </Button>
                    </Grid>
                  );
                })}
              </Grid>

              {tree ? (
                <Grid container spacing={2} style={{ marginTop: 28 }}>
                  {[tree.skill1, tree.skill2, tree.skill3].map((skill, skillIndex) => {
                    const iconSrc =
                      skill.iconSrc ||
                      (skillIndex === 0
                        ? `/dragonshorde/trees/${skill.title}.svg`
                        : `/dragonshorde/trees/tier1/${skill.title}.svg`);
                    const tier = skillIndex === 0 ? 0 : 1;

                    return (
                      <Grid item xs={12} md={skillIndex === 0 ? 12 : 6} key={skill.title}>
                        <div
                          style={{
                            border: `1px solid ${DC_THEME.line}`,
                            background: "rgba(255,255,255,0.035)",
                            padding: 18,
                            height: "100%",
                          }}
                        >
                          <img
                            src={iconSrc}
                            alt={skill.title}
                            draggable={false}
                            style={{
                              height: skillIndex === 0 ? 94 : 82,
                              display: "flex",
                              margin: "auto",
                              
                            }}
                          />

                          <Typography
                            align="center"
                            variant="subtitle1"
                            style={{ ...dcPanelHeaderStyle, fontSize: 15, marginTop: 12 }}
                          >
                            {skillIndex === 0 ? `${skill.title} Practice` : skill.title}
                          </Typography>

                          <Typography
                            align="center"
                            variant="body2"
                            style={{
                              color: DC_THEME.muted,
                              margin: "10px auto",
                              maxWidth: 680,
                              lineHeight: 1.55,
                            }}
                          >
                            {skill.effect}
                          </Typography>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 12,
                              marginTop: 10,
                            }}
                          >
                            <Button
                              style={dcButtonStyle}
                              onClick={() => assignPoints(skill.byte, "minus", skill.maxLevel, tier)}
                            >
                              <RemoveIcon style={{ color: "#FFFFFF" }} />
                            </Button>

                            <Typography
                              align="center"
                              variant="subtitle1"
                              style={{ color: DC_THEME.text, minWidth: 90, fontWeight: 800 }}
                            >
                              {points[skill.byte]} / {skill.maxLevel}
                            </Typography>

                            <Button
                              style={dcButtonStyle}
                              onClick={() => assignPoints(skill.byte, "plus", skill.maxLevel, tier)}
                            >
                              <AddIcon style={{ color: "#FFFFFF" }} />
                            </Button>
                          </div>

                          <Typography
                            align="center"
                            variant="caption"
                            style={{
                              color: DC_THEME.text,
                              display: "block",
                              marginTop: 12,
                              lineHeight: 1.5,
                            }}
                          >
                            {incrementNumbers(skill.effect, skill.byte, Boolean(skill.scalePercent))}
                          </Typography>
                        </div>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : null}

              {!arraysEqual(points, oldPoints) ? (
                <Button
                  style={{ ...dcButtonStyle, display: "flex", margin: "28px auto 0" }}
                  onClick={() => applyPoints()}
                >
                  Apply Skill Points
                </Button>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    );
  }

  return null;
}
