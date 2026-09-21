import React, { useEffect, useMemo, useRef, useState } from "react";
import algosdk from "algosdk";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RefreshIcon from "@mui/icons-material/Refresh";
import SportsKabaddiIcon from "@mui/icons-material/SportsKabaddi";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  Grid,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useWallet } from "@txnlab/use-wallet-react";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { assetImageUrl } from "../../lib/ipfsMedia";
import { getDepthsMoveId } from "../../lib/depthsMoves";
import DepthsBattle from "../../components/contracts/Arena/DepthsBattle";
import Character from "../../components/contracts/Arena/Character";
import DisplayChar from "../../components/contracts/Arena/DisplayChar";
import {
  getDepthsDisplayStats,
  loadDepthsChampionRuntime,
} from "../../components/contracts/Arena/depthsCharacterRuntime";
import {
  buildDepthsArtifactRuntime,
  formatArtifactAdditions,
  pickDepthsArtifactChoices,
  summarizeDepthsArtifact,
} from "../../components/contracts/Arena/depthsArtifacts";
import {
  applyDepthsCardUpgradesToCharObj,
  formatCardUpgradeAdditions,
  getDepthsCardUpgradeFamilyKey,
  getDepthsCardUpgradeMoveKey,
  pickDepthsCardUpgradeChoices,
  summarizeDepthsCardUpgrade,
} from "../../components/contracts/Arena/depthsCardUpgrades";
import {
  buildDepthsTraitAwakeningProfile,
  getTraitAwakeningLabel,
  isDepthsTraitRewardUnlocked,
  pickWeightedDepthsRewards,
} from "../../components/contracts/Arena/depthsTraitAwakenings";
import {
  DEPTHS_CURSED_ARTIFACTS,
  DEPTHS_QUESTS,
  pickDepthsQuestForWorld,
} from "../../components/contracts/Arena/depthsQuests";
import {
  getDepthsEncounterWorldKeys,
  isMonsterAvailableForDepthsWorld,
  normalizeDepthsMonsterWorlds,
} from "../../components/contracts/Arena/depthsWorlds";
import { getArenaEffectInfo } from "../../components/contracts/Arena/effectInfo";
import { db } from "../../Firebase/FirebaseInit";

const ALGOD_BASE = "https://mainnet-api.algonode.cloud";
const DARK_COIN_ASSET_ID = 1088771340;
const DARK_COIN_DECIMALS = 6;
const DEPTHS_APP_ID = 3658640544;
const DEPTHS_REGULAR_ENCOUNTER_XP = 1;
const DEPTHS_ELITE_ENCOUNTER_XP = 2;
const DEPTHS_COMPLETION_BONUS_XP = 5;
const CHAMPION_CREATOR = "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY";
const ARENA_BG_SRC = "/home/arena.png";
const DEPTHS_START_LOADOUT_BG_SRC = "/arena/depths/start-loadout-bg.png";
const DEPTHS_CHEST_BG_SRC = "/arena/depths/chest-bg.png";
const DEPTHS_REST_BG_SRC = "/arena/depths/rest-bg.png";
const DEPTHS_CHOOSE_CARD_BG_SRC = "/arena/depths/choose-card-bg.png";
const DEPTHS_CHOOSE_ARTIFACT_BG_SRC = "/arena/depths/choose-artifact-bg.png";
const DEPTHS_UPGRADE_CARD_BG_SRC = "/arena/depths/upgrade-card-bg.png";
const ARTIFACT_IMAGE_BASE = "/arena/depths/artifacts";
const DARK_COIN_ICON_SRC = "/invDC.svg";
const DEPTHS_REWARD_TIER_IMAGES = {
  "small-cache": "/arena/depths/rewards/small-cache.png",
  "deep-cache": "/arena/depths/rewards/deep-cache.png",
  "vault-cache": "/arena/depths/rewards/vault-cache.png",
  "royal-cache": "/arena/depths/rewards/royal-cache.png",
  "abyss-jackpot": "/arena/depths/rewards/abyss-jackpot.png",
};
const DEPTHS_WORLD_BGS = {
  purple: {
    chest: "/arena/depths/worlds/purple/chest-bg.png",
    rest: "/arena/depths/worlds/purple/rest-bg.png",
    card: "/arena/depths/worlds/purple/choose-card-bg.png",
    artifact: "/arena/depths/worlds/purple/choose-artifact-bg.png",
    upgrade: "/arena/depths/worlds/purple/upgrade-card-bg.png",
  },
  blue: {
    chest: "/arena/depths/worlds/blue/chest-bg.png",
    rest: "/arena/depths/worlds/blue/rest-bg.png",
    card: "/arena/depths/worlds/blue/choose-card-bg.png",
    artifact: "/arena/depths/worlds/blue/choose-artifact-bg.png",
    upgrade: "/arena/depths/worlds/blue/upgrade-card-bg.png",
  },
  red: {
    chest: "/arena/depths/worlds/red/chest-bg.png",
    rest: "/arena/depths/worlds/red/rest-bg.png",
    card: "/arena/depths/worlds/red/choose-card-bg.png",
    artifact: "/arena/depths/worlds/red/choose-artifact-bg.png",
    upgrade: "/arena/depths/worlds/red/upgrade-card-bg.png",
  },
};
const ARENA_LOGO_SRC = "/home/arenaLogo.png";
const POWER_ICON_SRC = "/dragonshorde/power.png";
const ACCURACY_ICON_SRC = "/dragonshorde/accuracy.svg";

function textBytes(value) {
  return new TextEncoder().encode(String(value || ""));
}

function bytesToBase64(bytes) {
  if (algosdk.bytesToBase64) return algosdk.bytesToBase64(bytes);
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  let binary = "";
  array.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function bytesToUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return new Uint8Array(value);
  if (typeof value === "string") {
    try {
      return Uint8Array.from(window.atob(value), (char) => char.charCodeAt(0));
    } catch (_error) {
      return new Uint8Array();
    }
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.every((key) => /^\d+$/.test(key))) {
      return new Uint8Array(
        keys
          .sort((a, b) => Number(a) - Number(b))
          .map((key) => Number(value[key] || 0))
      );
    }
  }
  return new Uint8Array();
}

function uint64BytesToBigInt(bytes, offset = 0) {
  let result = 0n;
  for (let index = offset; index < offset + 8; index += 1) {
    result = (result << 8n) + BigInt(bytes[index] || 0);
  }
  return result;
}

async function readDepthsClaimBox(algod, appId, walletAddress) {
  const boxName = algosdk.decodeAddress(walletAddress).publicKey;
  const response = await algod.getApplicationBoxByName(appId, boxName).do();
  const value = bytesToUint8Array(response?.value);

  if (value.length !== 16) {
    throw new Error("Depths reward box has an unexpected shape.");
  }

  return {
    amountAtomic: uint64BytesToBigInt(value, 0).toString(),
    assetId: Number(uint64BytesToBigInt(value, 8)),
  };
}

function isMissingAlgorandBoxError(error) {
  return (
    Number(error?.status || error?.response?.status || error?.response?.statusCode || 0) === 404 ||
    /not found|no such box/i.test(String(error?.message || ""))
  );
}

function getDepthsDailyKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function buildDepthsEntryProofNote({ walletAddress, championAssetId }) {
  return {
    kind: "darkcoin-depths-entry-proof",
    walletAddress: String(walletAddress || ""),
    championAssetId: Number(championAssetId || 0),
    dailyKey: getDepthsDailyKey(),
    issuedAt: Date.now(),
  };
}

function buildDepthsResumeProofNote({ walletAddress, championAssetId }) {
  return {
    kind: "darkcoin-depths-resume-proof",
    walletAddress: String(walletAddress || ""),
    championAssetId: Number(championAssetId || 0),
    issuedAt: Date.now(),
  };
}

function isDarkCoinRewardGranted(reward) {
  return reward?.status === "granted" && Boolean(reward?.grantTxId);
}

function getDepthsRewardTierImage(reward = {}) {
  const tierId = String(reward?.tierId || reward?.id || "").trim().toLowerCase();
  return DEPTHS_REWARD_TIER_IMAGES[tierId] || "";
}

function formatDarkCoinAtomicAmount(value, decimals = DARK_COIN_DECIMALS) {
  const decimalsNumber = Math.max(0, Math.floor(Number(decimals) || 0));
  const raw = BigInt(normalizeAtomicAmountString(value) || "0");
  const divisor = BigInt(`1${"0".repeat(decimalsNumber)}`);
  const whole = raw / divisor;
  const fraction = raw % divisor;
  if (!fraction) return whole.toString();

  const fractionText = fraction.toString().padStart(decimalsNumber, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fractionText}`;
}

function normalizeAtomicAmountString(value) {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") {
    return Number.isFinite(value) && Number.isInteger(value) ? String(value) : "";
  }
  const text = String(value ?? "").trim();
  return /^\d+$/.test(text) ? text : "";
}

function atomicAmountToSafeNumber(value, label = "Atomic amount") {
  const amountText = normalizeAtomicAmountString(value);
  if (!amountText) {
    throw new Error(`${label} is not configured.`);
  }

  const amountBigInt = BigInt(amountText);
  if (amountBigInt <= 0n || amountBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${label} is outside the supported range.`);
  }

  return Number(amountBigInt);
}

function getDepthsRewardAppId(contracts = {}) {
  const envValue = Number(process.env.NEXT_PUBLIC_DEPTHS_APP_ID || 0);
  const contractValue = Number(contracts?.depths || 0);
  return Number.isSafeInteger(envValue) && envValue > 0
    ? envValue
    : Number.isSafeInteger(contractValue) && contractValue > 0
    ? contractValue
    : DEPTHS_APP_ID;
}

function normalizeAlgorandAddress(value) {
  const directValue = String(typeof value === "string" ? value : "").trim();
  if (directValue && algosdk.isValidAddress(directValue)) return directValue;

  const publicKey = value?.publicKey;
  if (publicKey) {
    try {
      const bytes =
        publicKey instanceof Uint8Array
          ? publicKey
          : Array.isArray(publicKey)
          ? new Uint8Array(publicKey)
          : new Uint8Array(
              Object.keys(publicKey)
                .sort((a, b) => Number(a) - Number(b))
                .map((key) => Number(publicKey[key] || 0))
            );
      const encoded = algosdk.encodeAddress(bytes);
      return algosdk.isValidAddress(encoded) ? encoded : "";
    } catch (_error) {
      return "";
    }
  }

  try {
    const encoded = String(value || "").trim();
    return encoded && algosdk.isValidAddress(encoded) ? encoded : "";
  } catch (_error) {
    return "";
  }
}

function getApplicationAddressString(appId) {
  const normalizedAppId = Number(appId || 0);
  if (!Number.isSafeInteger(normalizedAppId) || normalizedAppId <= 0) return "";
  return normalizeAlgorandAddress(algosdk.getApplicationAddress(normalizedAppId));
}

function getDepthsWorldKey(room = 1) {
  const roomNumber = Number(room);
  const encounterNumber = Number.isFinite(roomNumber) ? Math.max(1, Math.floor(roomNumber)) : 1;
  if (encounterNumber <= 5) return "purple";
  if (encounterNumber <= 10) return "blue";
  return "red";
}

function getDepthsWorldBackground(room, type) {
  const fallbacks = {
    chest: DEPTHS_CHEST_BG_SRC,
    rest: DEPTHS_REST_BG_SRC,
    card: DEPTHS_CHOOSE_CARD_BG_SRC,
    artifact: DEPTHS_CHOOSE_ARTIFACT_BG_SRC,
    upgrade: DEPTHS_UPGRADE_CARD_BG_SRC,
    quest: DEPTHS_CHOOSE_ARTIFACT_BG_SRC,
  };

  return DEPTHS_WORLD_BGS[getDepthsWorldKey(room)]?.[type] || fallbacks[type] || ARENA_BG_SRC;
}

const THEME = {
  bg: "#020202",
  panel: "rgba(0,0,0,0.82)",
  panelSoft: "rgba(255,255,255,0.04)",
  line: "rgba(255,255,255,0.22)",
  lineStrong: "rgba(255,255,255,0.56)",
  text: "rgba(255,255,255,0.94)",
  muted: "rgba(255,255,255,0.64)",
  faint: "rgba(255,255,255,0.36)",
  gold: "#e1b864",
  bad: "#F8575A",
  good: "#9FE870",
};

const pageStyle = {
  position: "relative",
  minHeight: "100vh",
  width: "100%",
  overflow: "hidden",
  color: THEME.text,
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.12), transparent 28%), linear-gradient(180deg, #070707 0%, #000 54%, #050505 100%)",
  padding: "42px clamp(14px, 3vw, 48px) 70px",
};

const contentStyle = {
  position: "relative",
  zIndex: 2,
  maxWidth: 1480,
  margin: "0 auto",
};

const medievalText = {
  fontFamily: "Jacques, Georgia, serif",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
};

const panelStyle = {
  border: `1px solid ${THEME.line}`,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.018)), rgba(0,0,0,0.82)",
  boxShadow:
    "inset 0 0 0 1px rgba(255,255,255,0.04), 0 18px 55px rgba(0,0,0,0.66)",
  borderRadius: 4,
  overflow: "hidden",
};

const buttonStyle = {
  border: `1px solid ${THEME.lineStrong}`,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.95))",
  color: THEME.text,
  borderRadius: 3,
  fontFamily: "Jacques, Georgia, serif",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
};

const DEPTHS_RARITY_STYLE = {
  common: {
    label: "Common",
    color: "rgba(255,255,255,0.72)",
    glow: "rgba(255,255,255,0.10)",
  },
  uncommon: {
    label: "Uncommon",
    color: "#63d778",
    glow: "rgba(99,215,120,0.18)",
  },
  rare: {
    label: "Rare",
    color: "#7fb7ff",
    glow: "rgba(127,183,255,0.22)",
  },
};

function getDepthsRarityKey(value = "") {
  const key = String(value || "").toLowerCase();
  return DEPTHS_RARITY_STYLE[key] ? key : "common";
}

function getDepthsRarityStyle(value = "") {
  return DEPTHS_RARITY_STYLE[getDepthsRarityKey(value)];
}

function getDepthsRarityBorder(value = "", selected = false) {
  const rarity = getDepthsRarityStyle(value);
  return selected ? THEME.gold : rarity.color;
}

function getDepthsRarityBoxShadow(value = "", selected = false) {
  const rarity = getDepthsRarityStyle(value);
  return selected
    ? `0 0 0 1px ${THEME.gold}, 0 16px 34px rgba(225,184,100,0.12), 0 0 26px ${rarity.glow}`
    : `0 0 0 1px ${rarity.glow}, 0 0 18px ${rarity.glow}`;
}

function DepthsDeckCountBadge({ count = 1 }) {
  const copies = Math.max(1, Math.round(finiteNumber(count, 1)));
  return (
    <Box
      sx={{
        position: "absolute",
        top: 8,
        right: 8,
        minWidth: 34,
        height: 26,
        px: 0.8,
        display: "grid",
        placeItems: "center",
        color: "#111",
        border: `1px solid ${THEME.gold}`,
        borderRadius: 999,
        background: THEME.gold,
        fontSize: 12,
        fontWeight: 950,
        lineHeight: 1,
        zIndex: 5,
        boxShadow: "0 0 16px rgba(225,184,100,0.25)",
      }}
    >
      x{copies}
    </Box>
  );
}

function EffectTooltipIcon({ effectKey, src, size = 22, sx }) {
  const info = getArenaEffectInfo(effectKey);
  const iconSrc = src || info?.icon || DEPTHS_EFFECT_ICON_BY_KEY[String(effectKey || "").toLowerCase()] || "";
  if (!iconSrc) return null;

  const image = (
    <Box
      component="img"
      src={iconSrc}
      alt={info?.label || effectKey || ""}
      draggable={false}
      sx={{ width: size, height: size, objectFit: "contain", flex: "0 0 auto", ...sx }}
    />
  );

  if (!info) return image;
  return (
    <Tooltip
      arrow
      title={
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 900 }}>{info.label}</Typography>
          {Array.isArray(info.details) && info.details.length ? (
            <Box sx={{ display: "grid", gap: 0.45, mt: 0.55 }}>
              {info.details.map((detail, index) => (
                <Box
                  key={`${detail.text}-${index}`}
                  sx={{ display: "flex", alignItems: "center", gap: 0.65 }}
                >
                  {detail.icon ? (
                    <Box
                      component="img"
                      src={detail.icon}
                      alt=""
                      draggable={false}
                      sx={{ width: 16, height: 16, objectFit: "contain", flex: "0 0 auto" }}
                    />
                  ) : null}
                  <Typography sx={{ fontSize: 11, lineHeight: 1.25 }}>
                    {detail.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{ fontSize: 11, lineHeight: 1.35 }}>{info.description}</Typography>
          )}
        </Box>
      }
    >
      {image}
    </Tooltip>
  );
}

const DEPTHS_EFFECT_KEYS = [
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

const DEPTHS_EFFECT_ICON_BY_KEY = {
  poison: "/dragonshorde/trees/Poison.svg",
  bleed: "/dragonshorde/trees/Bleed.svg",
  burn: "/dragonshorde/trees/Burn.svg",
  freeze: "/dragonshorde/trees/Freeze.svg",
  slow: "/dragonshorde/trees/Slow.svg",
  drown: "/dragonshorde/trees/Drown.svg",
  paralyze: "/dragonshorde/trees/Paralyze.svg",
  doom: "/dragonshorde/trees/Doom.svg",
  shield: "/dragonshorde/trees/Shield.svg",
  strengthen: "/dragonshorde/trees/Strengthen.svg",
  focus: "/dragonshorde/trees/Focus.svg",
  empower: "/dragonshorde/trees/Empower.svg",
  nurture: "/dragonshorde/trees/Nurture.svg",
  bless: "/dragonshorde/trees/Bless.svg",
  hasten: "/dragonshorde/trees/Hasten.svg",
  cleanse: "/dragonshorde/trees/Cleanse.svg",
};

const DEPTHS_STAT_ICON_BY_KEY = {
  health: "/dragonshorde/health.svg",
  speed: "/dragonshorde/speed.png",
  resist: "/dragonshorde/resist.png",
  strength: "/dragonshorde/strength.svg",
  dexterity: "/dragonshorde/dexterity.svg",
  intelligence: "/dragonshorde/intelligence.svg",
  accuracy: ACCURACY_ICON_SRC,
  critChance: "/dragonshorde/critChance.svg",
  critDamage: "/dragonshorde/critDamage.svg",
  power: POWER_ICON_SRC,
  damage: POWER_ICON_SRC,
  cooldown: "/dragonshorde/cooldown.png",
};

const DEPTHS_STAT_KEYS = [
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

const DEPTHS_DISPLAY_STAT_KEYS = DEPTHS_STAT_KEYS.filter((key) => key !== "accuracy");

const BREAKDOWN_FIGHT_FPS = 30;
const BREAKDOWN_FRAME_MS = 1000 / BREAKDOWN_FIGHT_FPS;
const BREAKDOWN_MOVE_CHAR_FRAME_HOLD = 8;
const BREAKDOWN_MOVE_CHAR_LAST_FRAME_HOLD = 16;
const BREAKDOWN_MOVE_EFFECT_FRAME_HOLD = 7;
const BREAKDOWN_MOVE_EFFECT_LAST_FRAME_HOLD = 42;

const BASE_DEPTHS_ABILITY_POOL = [
  {
    id: "iron-vow",
    name: "Iron Vow",
    school: "Bulwark",
    description: "+18 health, +5 resist, and start each room with shield.",
    statBonuses: { health: 18, resist: 5 },
    battleOnly: [{ type: "gain_start_of_battle", effectKey: "shield", amount: 6 }],
  },
  {
    id: "blade-lesson",
    name: "Blade Lesson",
    school: "Strength",
    description: "+7 strength. Melee hits apply bleed.",
    statBonuses: { strength: 7 },
    battleOnly: [{ type: "apply_on_hit", attackType: "melee", effectKey: "bleed", amount: 1 }],
  },
  {
    id: "quickstep",
    name: "Quickstep",
    school: "Speed",
    description: "+7 speed, +4 dexterity, and start each room with hasten.",
    statBonuses: { speed: 7, dexterity: 4 },
    battleOnly: [{ type: "gain_start_of_battle", effectKey: "hasten", amount: 4 }],
  },
  {
    id: "poisoned-edge",
    name: "Poisoned Edge",
    school: "Venom",
    description: "Damage hits apply poison. Curse moves gain accuracy.",
    moveAccuracy: { curse: 7 },
    battleOnly: [{ type: "apply_on_hit", effectKey: "poison", amount: 1 }],
  },
  {
    id: "focus-sigil",
    name: "Focus Sigil",
    school: "Precision",
    description: "+6 accuracy, +5 crit chance, and start each room with focus.",
    statBonuses: { accuracy: 6, critChance: 5 },
    battleOnly: [{ type: "gain_start_of_battle", effectKey: "focus", amount: 5 }],
  },
  {
    id: "soul-leech",
    name: "Soul Leech",
    school: "Blood",
    description: "Heal for part of the damage your champion deals.",
    depthsAbilityMeta: { lifeStealPct: 14 },
  },
  {
    id: "second-breath",
    name: "Second Breath",
    school: "Survival",
    description: "Once per room, heal and gain shield when critically wounded.",
    depthsAbilityMeta: { secondWind: { thresholdPct: 35, healPct: 24, shield: 5 } },
  },
  {
    id: "arcane-overflow",
    name: "Arcane Overflow",
    school: "Intellect",
    description: "+7 intelligence. Magic hits apply empower to your champion.",
    statBonuses: { intelligence: 7 },
    battleOnly: [{ type: "gain_on_hit", attackType: "magic", effectKey: "empower", amount: 1 }],
  },
  {
    id: "warden-light",
    name: "Warden Light",
    school: "Blessing",
    description: "Start each room with bless and cleanse protection.",
    battleOnly: [
      { type: "gain_start_of_battle", effectKey: "bless", amount: 5 },
      { type: "gain_start_of_battle", effectKey: "cleanse", amount: 4 },
    ],
  },
  {
    id: "crushing-angle",
    name: "Crushing Angle",
    school: "Critical",
    description: "+24 crit damage. Critical hits add doom.",
    statBonuses: { critDamage: 24 },
    battleOnly: [{ type: "apply_on_crit", effectKey: "doom", amount: 2 }],
  },
  {
    id: "execution-mark",
    name: "Execution Mark",
    school: "Finisher",
    description: "Deal bonus damage to badly wounded monsters.",
    depthsAbilityMeta: { lowHpDamage: { thresholdPct: 30, flatDamage: 12 } },
  },
  {
    id: "frost-thread",
    name: "Frost Thread",
    school: "Control",
    description: "+4 resist. Ranged hits apply slow.",
    statBonuses: { resist: 4 },
    battleOnly: [{ type: "apply_on_hit", attackType: "ranged", effectKey: "slow", amount: 2 }],
  },
];

const DEPTHS_ABILITY_LEVEL_UPGRADES = {
  "iron-vow": [
    {
      description: "+12 health. Start each room with cleanse protection.",
      statBonuses: { health: 12 },
      battleOnly: [{ type: "gain_start_of_battle", effectKey: "cleanse", amount: 5 }],
    },
    {
      description: "+8 resist. Gain a stronger second-breath trigger.",
      statBonuses: { resist: 8 },
      depthsAbilityMeta: { secondWind: { thresholdPct: 32, healPct: 16, shield: 4 } },
    },
  ],
  "blade-lesson": [
    {
      description: "+4 accuracy. Melee hits apply deeper bleed.",
      statBonuses: { accuracy: 4 },
      battleOnly: [{ type: "apply_on_hit", attackType: "melee", effectKey: "bleed", amount: 2 }],
    },
    {
      description: "+14 crit damage. Critical hits add doom.",
      statBonuses: { critDamage: 14 },
      battleOnly: [{ type: "apply_on_crit", effectKey: "doom", amount: 2 }],
    },
  ],
  quickstep: [
    {
      description: "+5 speed. Ranged moves gain accuracy.",
      statBonuses: { speed: 5 },
      moveAccuracy: { ranged: 7 },
    },
    {
      description: "+6 dexterity. Start each room with focus.",
      statBonuses: { dexterity: 6 },
      battleOnly: [{ type: "gain_start_of_battle", effectKey: "focus", amount: 4 }],
    },
  ],
  "poisoned-edge": [
    {
      description: "+5 dexterity. Damage hits apply deeper poison.",
      statBonuses: { dexterity: 5 },
      battleOnly: [{ type: "apply_on_hit", effectKey: "poison", amount: 2 }],
    },
    {
      description: "Start each room with focus. Critical hits apply poison.",
      battleOnly: [
        { type: "gain_start_of_battle", effectKey: "focus", amount: 3 },
        { type: "apply_on_crit", effectKey: "poison", amount: 3 },
      ],
    },
  ],
  "focus-sigil": [
    {
      description: "+6 crit chance. Magic and ranged moves gain accuracy.",
      statBonuses: { critChance: 6 },
      moveAccuracy: { magic: 5, ranged: 5 },
    },
    {
      description: "+20 crit damage. Critical hits add doom.",
      statBonuses: { critDamage: 20 },
      battleOnly: [{ type: "apply_on_crit", effectKey: "doom", amount: 2 }],
    },
  ],
  "soul-leech": [
    {
      description: "+10 health. Lifesteal becomes stronger.",
      statBonuses: { health: 10 },
      depthsAbilityMeta: { lifeStealPct: 8 },
    },
    {
      description: "Start each room with nurture and strengthen.",
      battleOnly: [
        { type: "gain_start_of_battle", effectKey: "nurture", amount: 5 },
        { type: "gain_start_of_battle", effectKey: "strengthen", amount: 3 },
      ],
    },
  ],
  "second-breath": [
    {
      description: "+14 health. Second Breath triggers earlier.",
      statBonuses: { health: 14 },
      depthsAbilityMeta: { secondWind: { thresholdPct: 42, healPct: 10, shield: 3 } },
    },
    {
      description: "Start each room with bless and shield.",
      battleOnly: [
        { type: "gain_start_of_battle", effectKey: "bless", amount: 4 },
        { type: "gain_start_of_battle", effectKey: "shield", amount: 4 },
      ],
    },
  ],
  "arcane-overflow": [
    {
      description: "+5 intelligence. Magic moves gain accuracy.",
      statBonuses: { intelligence: 5 },
      moveAccuracy: { magic: 8 },
    },
    {
      description: "Start each room with empower and focus.",
      battleOnly: [
        { type: "gain_start_of_battle", effectKey: "empower", amount: 5 },
        { type: "gain_start_of_battle", effectKey: "focus", amount: 4 },
      ],
    },
  ],
  "warden-light": [
    {
      description: "+6 resist. Cleanse protection grows stronger.",
      statBonuses: { resist: 6 },
      battleOnly: [{ type: "gain_start_of_battle", effectKey: "cleanse", amount: 5 }],
    },
    {
      description: "Hits add focus to your champion.",
      battleOnly: [{ type: "gain_on_hit", effectKey: "focus", amount: 1 }],
    },
  ],
  "crushing-angle": [
    {
      description: "+5 crit chance. Critical hits apply bleed.",
      statBonuses: { critChance: 5 },
      battleOnly: [{ type: "apply_on_crit", effectKey: "bleed", amount: 2 }],
    },
    {
      description: "+30 crit damage. Start each room with focus.",
      statBonuses: { critDamage: 30 },
      battleOnly: [{ type: "gain_start_of_battle", effectKey: "focus", amount: 5 }],
    },
  ],
  "execution-mark": [
    {
      description: "+5 strength. Finisher damage improves.",
      statBonuses: { strength: 5 },
      depthsAbilityMeta: { lowHpDamage: { thresholdPct: 35, flatDamage: 8 } },
    },
    {
      description: "Critical hits mark wounded monsters with doom.",
      battleOnly: [{ type: "apply_on_crit", effectKey: "doom", amount: 3 }],
    },
  ],
  "frost-thread": [
    {
      description: "+5 dexterity. Ranged hits apply freeze.",
      statBonuses: { dexterity: 5 },
      battleOnly: [{ type: "apply_on_hit", attackType: "ranged", effectKey: "freeze", amount: 1 }],
    },
    {
      description: "Start each room with shield and focus.",
      battleOnly: [
        { type: "gain_start_of_battle", effectKey: "shield", amount: 4 },
        { type: "gain_start_of_battle", effectKey: "focus", amount: 3 },
      ],
    },
  ],
};

const EXTRA_DEPTHS_ABILITY_POOL = [
  {
    id: "ember-pact",
    name: "Ember Pact",
    school: "Flame",
    levels: [
      {
        description: "+5 intelligence. Magic hits apply burn.",
        statBonuses: { intelligence: 5 },
        battleOnly: [{ type: "apply_on_hit", attackType: "magic", effectKey: "burn", amount: 2 }],
      },
      {
        description: "+4 strength. Critical hits apply burn.",
        statBonuses: { strength: 4 },
        battleOnly: [{ type: "apply_on_crit", effectKey: "burn", amount: 3 }],
      },
      {
        description: "Start each room with empower and hasten.",
        battleOnly: [
          { type: "gain_start_of_battle", effectKey: "empower", amount: 4 },
          { type: "gain_start_of_battle", effectKey: "hasten", amount: 3 },
        ],
      },
    ],
  },
  {
    id: "tideguard",
    name: "Tideguard",
    school: "Tide",
    levels: [
      {
        description: "+8 health. Magic hits apply drown.",
        statBonuses: { health: 8 },
        battleOnly: [{ type: "apply_on_hit", attackType: "magic", effectKey: "drown", amount: 1 }],
      },
      {
        description: "+5 resist. Start each room with cleanse.",
        statBonuses: { resist: 5 },
        battleOnly: [{ type: "gain_start_of_battle", effectKey: "cleanse", amount: 5 }],
      },
      {
        description: "Magic hits grant nurture to your champion.",
        battleOnly: [{ type: "gain_on_hit", attackType: "magic", effectKey: "nurture", amount: 1 }],
      },
    ],
  },
  {
    id: "storm-nerve",
    name: "Storm Nerve",
    school: "Storm",
    levels: [
      {
        description: "+6 speed. Ranged hits apply paralyze.",
        statBonuses: { speed: 6 },
        battleOnly: [{ type: "apply_on_hit", attackType: "ranged", effectKey: "paralyze", amount: 1 }],
      },
      {
        description: "+5 accuracy. Start each room with hasten.",
        statBonuses: { accuracy: 5 },
        battleOnly: [{ type: "gain_start_of_battle", effectKey: "hasten", amount: 5 }],
      },
      {
        description: "+6 crit chance. Critical hits apply paralyze.",
        statBonuses: { critChance: 6 },
        battleOnly: [{ type: "apply_on_crit", effectKey: "paralyze", amount: 2 }],
      },
    ],
  },
  {
    id: "deep-roots",
    name: "Deep Roots",
    school: "Growth",
    levels: [
      {
        description: "+24 health. Start each room with nurture.",
        statBonuses: { health: 24 },
        battleOnly: [{ type: "gain_start_of_battle", effectKey: "nurture", amount: 5 }],
      },
      {
        description: "+6 resist. Lifesteal improves.",
        statBonuses: { resist: 6 },
        depthsAbilityMeta: { lifeStealPct: 6 },
      },
      {
        description: "Second Breath gains extra healing and shield.",
        depthsAbilityMeta: { secondWind: { thresholdPct: 38, healPct: 14, shield: 5 } },
      },
    ],
  },
  {
    id: "grave-math",
    name: "Grave Math",
    school: "Doom",
    levels: [
      {
        description: "+5 intelligence. Magic hits apply doom.",
        statBonuses: { intelligence: 5 },
        battleOnly: [{ type: "apply_on_hit", attackType: "magic", effectKey: "doom", amount: 1 }],
      },
      {
        description: "+15 crit damage. Critical hits apply doom.",
        statBonuses: { critDamage: 15 },
        battleOnly: [{ type: "apply_on_crit", effectKey: "doom", amount: 2 }],
      },
      {
        description: "Finisher damage improves against weakened enemies.",
        depthsAbilityMeta: { lowHpDamage: { thresholdPct: 40, flatDamage: 10 } },
      },
    ],
  },
  {
    id: "hunting-rhythm",
    name: "Hunting Rhythm",
    school: "Hunter",
    levels: [
      {
        description: "+6 dexterity. Ranged moves gain accuracy.",
        statBonuses: { dexterity: 6 },
        moveAccuracy: { ranged: 8 },
      },
      {
        description: "Ranged hits apply focus to your champion.",
        battleOnly: [{ type: "gain_on_hit", attackType: "ranged", effectKey: "focus", amount: 1 }],
      },
      {
        description: "+6 speed. Critical hits apply slow.",
        statBonuses: { speed: 6 },
        battleOnly: [{ type: "apply_on_crit", effectKey: "slow", amount: 3 }],
      },
    ],
  },
  {
    id: "oathbreaker",
    name: "Oathbreaker",
    school: "Risk",
    levels: [
      {
        description: "+8 strength and +8 intelligence. Start each room with doom.",
        statBonuses: { strength: 8, intelligence: 8 },
        battleOnly: [{ type: "gain_start_of_battle", effectKey: "doom", amount: 3 }],
      },
      {
        description: "+8 crit chance. Critical hits apply burn.",
        statBonuses: { critChance: 8 },
        battleOnly: [{ type: "apply_on_crit", effectKey: "burn", amount: 3 }],
      },
      {
        description: "Lifesteal improves to offset the oath's risk.",
        depthsAbilityMeta: { lifeStealPct: 10 },
      },
    ],
  },
  {
    id: "mirror-ward",
    name: "Mirror Ward",
    school: "Ward",
    levels: [
      {
        description: "+7 resist. Start each room with bless.",
        statBonuses: { resist: 7 },
        battleOnly: [{ type: "gain_start_of_battle", effectKey: "bless", amount: 5 }],
      },
      {
        description: "+10 health. Start each room with shield.",
        statBonuses: { health: 10 },
        battleOnly: [{ type: "gain_start_of_battle", effectKey: "shield", amount: 6 }],
      },
      {
        description: "Hits grant cleanse protection to your champion.",
        battleOnly: [{ type: "gain_on_hit", effectKey: "cleanse", amount: 1 }],
      },
    ],
  },
];

const MORE_DEPTHS_ABILITY_POOL = [
  {
    id: "thorn-mantle",
    name: "Thorn Mantle",
    school: "Thorns",
    levels: [
      {
        description: "+10 health, +4 resist. Melee hits apply poison.",
        statBonuses: { health: 10, resist: 4 },
        battleOnly: [{ type: "apply_on_hit", attackType: "melee", effectKey: "poison", amount: 1 }],
      },
      {
        description: "Start each room with shield. Hits grant nurture.",
        battleOnly: [
          { type: "gain_start_of_battle", effectKey: "shield", amount: 5 },
          { type: "gain_on_hit", effectKey: "nurture", amount: 1 },
        ],
      },
      {
        description: "+8 resist. Critical hits apply deeper poison.",
        statBonuses: { resist: 8 },
        battleOnly: [{ type: "apply_on_crit", effectKey: "poison", amount: 3 }],
      },
    ],
  },
  {
    id: "basilisk-glare",
    name: "Basilisk Glare",
    school: "Gaze",
    levels: [
      {
        description: "+6 accuracy. Magic hits apply paralyze.",
        statBonuses: { accuracy: 6 },
        battleOnly: [{ type: "apply_on_hit", attackType: "magic", effectKey: "paralyze", amount: 1 }],
      },
      {
        description: "+5 intelligence. Curse moves gain accuracy.",
        statBonuses: { intelligence: 5 },
        moveAccuracy: { curse: 8 },
      },
      {
        description: "Critical hits apply freeze and paralyze.",
        battleOnly: [
          { type: "apply_on_crit", effectKey: "freeze", amount: 2 },
          { type: "apply_on_crit", effectKey: "paralyze", amount: 2 },
        ],
      },
    ],
  },
  {
    id: "blood-forge",
    name: "Blood Forge",
    school: "Forge",
    levels: [
      {
        description: "+8 strength. Lifesteal improves.",
        statBonuses: { strength: 8 },
        depthsAbilityMeta: { lifeStealPct: 8 },
      },
      {
        description: "Melee hits apply burn and bleed.",
        battleOnly: [
          { type: "apply_on_hit", attackType: "melee", effectKey: "burn", amount: 1 },
          { type: "apply_on_hit", attackType: "melee", effectKey: "bleed", amount: 1 },
        ],
      },
      {
        description: "+18 crit damage. Critical hits grant strengthen.",
        statBonuses: { critDamage: 18 },
        battleOnly: [{ type: "gain_on_hit", effectKey: "strengthen", amount: 2 }],
      },
    ],
  },
  {
    id: "phantom-step",
    name: "Phantom Step",
    school: "Ghost",
    levels: [
      {
        description: "+8 speed. Start each room with hasten.",
        statBonuses: { speed: 8 },
        battleOnly: [{ type: "gain_start_of_battle", effectKey: "hasten", amount: 5 }],
      },
      {
        description: "+6 dexterity. Ranged and melee moves gain accuracy.",
        statBonuses: { dexterity: 6 },
        moveAccuracy: { ranged: 5, melee: 5 },
      },
      {
        description: "Critical hits apply slow. Start each room with focus.",
        battleOnly: [
          { type: "apply_on_crit", effectKey: "slow", amount: 3 },
          { type: "gain_start_of_battle", effectKey: "focus", amount: 4 },
        ],
      },
    ],
  },
  {
    id: "lionheart",
    name: "Lionheart",
    school: "Valor",
    levels: [
      {
        description: "+12 health, +5 strength. Start each room with bless.",
        statBonuses: { health: 12, strength: 5 },
        battleOnly: [{ type: "gain_start_of_battle", effectKey: "bless", amount: 4 }],
      },
      {
        description: "Hits grant strengthen. Second Breath improves.",
        battleOnly: [{ type: "gain_on_hit", effectKey: "strengthen", amount: 1 }],
        depthsAbilityMeta: { secondWind: { thresholdPct: 35, healPct: 8, shield: 3 } },
      },
      {
        description: "+10 resist. Start each room with shield and focus.",
        statBonuses: { resist: 10 },
        battleOnly: [
          { type: "gain_start_of_battle", effectKey: "shield", amount: 5 },
          { type: "gain_start_of_battle", effectKey: "focus", amount: 3 },
        ],
      },
    ],
  },
  {
    id: "mind-spike",
    name: "Mind Spike",
    school: "Mind",
    levels: [
      {
        description: "+7 intelligence. Magic hits apply doom.",
        statBonuses: { intelligence: 7 },
        battleOnly: [{ type: "apply_on_hit", attackType: "magic", effectKey: "doom", amount: 1 }],
      },
      {
        description: "+6 accuracy. Magic moves gain accuracy.",
        statBonuses: { accuracy: 6 },
        moveAccuracy: { magic: 8 },
      },
      {
        description: "Critical hits apply paralyze. Start each room with focus.",
        battleOnly: [
          { type: "apply_on_crit", effectKey: "paralyze", amount: 2 },
          { type: "gain_start_of_battle", effectKey: "focus", amount: 4 },
        ],
      },
    ],
  },
  {
    id: "riptide-hook",
    name: "Riptide Hook",
    school: "Tide",
    levels: [
      {
        description: "+5 dexterity. Ranged hits apply drown.",
        statBonuses: { dexterity: 5 },
        battleOnly: [{ type: "apply_on_hit", attackType: "ranged", effectKey: "drown", amount: 2 }],
      },
      {
        description: "+5 speed. Ranged hits apply slow.",
        statBonuses: { speed: 5 },
        battleOnly: [{ type: "apply_on_hit", attackType: "ranged", effectKey: "slow", amount: 2 }],
      },
      {
        description: "Critical hits apply drown and freeze.",
        battleOnly: [
          { type: "apply_on_crit", effectKey: "drown", amount: 3 },
          { type: "apply_on_crit", effectKey: "freeze", amount: 1 },
        ],
      },
    ],
  },
  {
    id: "static-veil",
    name: "Static Veil",
    school: "Lightning",
    levels: [
      {
        description: "+5 speed, +5 resist. Start each room with shield.",
        statBonuses: { speed: 5, resist: 5 },
        battleOnly: [{ type: "gain_start_of_battle", effectKey: "shield", amount: 5 }],
      },
      {
        description: "Ranged hits apply paralyze. Start each room with hasten.",
        battleOnly: [
          { type: "apply_on_hit", attackType: "ranged", effectKey: "paralyze", amount: 1 },
          { type: "gain_start_of_battle", effectKey: "hasten", amount: 3 },
        ],
      },
      {
        description: "+7 crit chance. Critical hits apply paralyze.",
        statBonuses: { critChance: 7 },
        battleOnly: [{ type: "apply_on_crit", effectKey: "paralyze", amount: 3 }],
      },
    ],
  },
  {
    id: "iron-appetite",
    name: "Iron Appetite",
    school: "Hunger",
    levels: [
      {
        description: "+18 health. Hits grant shield.",
        statBonuses: { health: 18 },
        battleOnly: [{ type: "gain_on_hit", effectKey: "shield", amount: 1 }],
      },
      {
        description: "+6 strength. Lifesteal improves.",
        statBonuses: { strength: 6 },
        depthsAbilityMeta: { lifeStealPct: 7 },
      },
      {
        description: "Start each room with strengthen and cleanse.",
        battleOnly: [
          { type: "gain_start_of_battle", effectKey: "strengthen", amount: 5 },
          { type: "gain_start_of_battle", effectKey: "cleanse", amount: 4 },
        ],
      },
    ],
  },
  {
    id: "moonlit-aim",
    name: "Moonlit Aim",
    school: "Moon",
    levels: [
      {
        description: "+8 accuracy. Ranged moves gain accuracy.",
        statBonuses: { accuracy: 8 },
        moveAccuracy: { ranged: 8 },
      },
      {
        description: "+6 crit chance. Ranged hits apply focus to your champion.",
        statBonuses: { critChance: 6 },
        battleOnly: [{ type: "gain_on_hit", attackType: "ranged", effectKey: "focus", amount: 1 }],
      },
      {
        description: "+22 crit damage. Critical hits apply slow.",
        statBonuses: { critDamage: 22 },
        battleOnly: [{ type: "apply_on_crit", effectKey: "slow", amount: 3 }],
      },
    ],
  },
  {
    id: "rot-chant",
    name: "Rot Chant",
    school: "Decay",
    levels: [
      {
        description: "+5 intelligence. Magic hits apply poison.",
        statBonuses: { intelligence: 5 },
        battleOnly: [{ type: "apply_on_hit", attackType: "magic", effectKey: "poison", amount: 2 }],
      },
      {
        description: "Magic hits apply doom. Curse moves gain accuracy.",
        moveAccuracy: { curse: 7 },
        battleOnly: [{ type: "apply_on_hit", attackType: "magic", effectKey: "doom", amount: 1 }],
      },
      {
        description: "Critical hits apply poison and drown.",
        battleOnly: [
          { type: "apply_on_crit", effectKey: "poison", amount: 3 },
          { type: "apply_on_crit", effectKey: "drown", amount: 2 },
        ],
      },
    ],
  },
  {
    id: "sunbrand",
    name: "Sunbrand",
    school: "Sun",
    levels: [
      {
        description: "+5 strength, +5 intelligence. Hits apply burn.",
        statBonuses: { strength: 5, intelligence: 5 },
        battleOnly: [{ type: "apply_on_hit", effectKey: "burn", amount: 1 }],
      },
      {
        description: "Start each room with bless and empower.",
        battleOnly: [
          { type: "gain_start_of_battle", effectKey: "bless", amount: 4 },
          { type: "gain_start_of_battle", effectKey: "empower", amount: 4 },
        ],
      },
      {
        description: "+18 crit damage. Critical hits apply burn.",
        statBonuses: { critDamage: 18 },
        battleOnly: [{ type: "apply_on_crit", effectKey: "burn", amount: 4 }],
      },
    ],
  },
  {
    id: "void-anchor",
    name: "Void Anchor",
    school: "Void",
    levels: [
      {
        description: "+7 resist. Magic hits apply slow.",
        statBonuses: { resist: 7 },
        battleOnly: [{ type: "apply_on_hit", attackType: "magic", effectKey: "slow", amount: 2 }],
      },
      {
        description: "+6 intelligence. Magic hits apply doom.",
        statBonuses: { intelligence: 6 },
        battleOnly: [{ type: "apply_on_hit", attackType: "magic", effectKey: "doom", amount: 1 }],
      },
      {
        description: "Start each room with shield. Critical hits apply doom.",
        battleOnly: [
          { type: "gain_start_of_battle", effectKey: "shield", amount: 5 },
          { type: "apply_on_crit", effectKey: "doom", amount: 3 },
        ],
      },
    ],
  },
  {
    id: "war-drums",
    name: "War Drums",
    school: "War",
    levels: [
      {
        description: "+6 strength, +4 speed. Start each room with strengthen.",
        statBonuses: { strength: 6, speed: 4 },
        battleOnly: [{ type: "gain_start_of_battle", effectKey: "strengthen", amount: 5 }],
      },
      {
        description: "Start each room with hasten. Melee moves gain accuracy.",
        moveAccuracy: { melee: 7 },
        battleOnly: [{ type: "gain_start_of_battle", effectKey: "hasten", amount: 4 }],
      },
      {
        description: "Hits grant empower and focus to your champion.",
        battleOnly: [
          { type: "gain_on_hit", effectKey: "empower", amount: 1 },
          { type: "gain_on_hit", effectKey: "focus", amount: 1 },
        ],
      },
    ],
  },
  {
    id: "saints-debt",
    name: "Saint's Debt",
    school: "Grace",
    levels: [
      {
        description: "Second Breath improves. Start each room with bless.",
        depthsAbilityMeta: { secondWind: { thresholdPct: 38, healPct: 16, shield: 4 } },
        battleOnly: [{ type: "gain_start_of_battle", effectKey: "bless", amount: 5 }],
      },
      {
        description: "+12 health. Start each room with cleanse.",
        statBonuses: { health: 12 },
        battleOnly: [{ type: "gain_start_of_battle", effectKey: "cleanse", amount: 6 }],
      },
      {
        description: "Lifesteal improves. Hits grant nurture.",
        depthsAbilityMeta: { lifeStealPct: 6 },
        battleOnly: [{ type: "gain_on_hit", effectKey: "nurture", amount: 1 }],
      },
    ],
  },
  {
    id: "glass-cannon",
    name: "Glass Cannon",
    school: "Volatile",
    levels: [
      {
        description: "+12 accuracy, +30 crit damage. Start each room with doom.",
        statBonuses: { accuracy: 12, critDamage: 30 },
        battleOnly: [{ type: "gain_start_of_battle", effectKey: "doom", amount: 3 }],
      },
      {
        description: "+8 crit chance. Critical hits apply burn.",
        statBonuses: { critChance: 8 },
        battleOnly: [{ type: "apply_on_crit", effectKey: "burn", amount: 3 }],
      },
      {
        description: "Finisher damage improves dramatically.",
        depthsAbilityMeta: { lowHpDamage: { thresholdPct: 35, flatDamage: 18 } },
      },
    ],
  },
  {
    id: "rune-cage",
    name: "Rune Cage",
    school: "Runes",
    levels: [
      {
        description: "+6 intelligence. Magic hits apply freeze.",
        statBonuses: { intelligence: 6 },
        battleOnly: [{ type: "apply_on_hit", attackType: "magic", effectKey: "freeze", amount: 1 }],
      },
      {
        description: "Magic hits apply paralyze. Magic moves gain accuracy.",
        moveAccuracy: { magic: 6 },
        battleOnly: [{ type: "apply_on_hit", attackType: "magic", effectKey: "paralyze", amount: 1 }],
      },
      {
        description: "Start each room with focus and shield.",
        battleOnly: [
          { type: "gain_start_of_battle", effectKey: "focus", amount: 4 },
          { type: "gain_start_of_battle", effectKey: "shield", amount: 5 },
        ],
      },
    ],
  },
  {
    id: "ashen-crown",
    name: "Ashen Crown",
    school: "Ash",
    levels: [
      {
        description: "+6 intelligence. Start each room with empower and burn enemies on crit.",
        statBonuses: { intelligence: 6 },
        battleOnly: [
          { type: "gain_start_of_battle", effectKey: "empower", amount: 4 },
          { type: "apply_on_crit", effectKey: "burn", amount: 2 },
        ],
      },
      {
        description: "+6 strength. Hits apply burn.",
        statBonuses: { strength: 6 },
        battleOnly: [{ type: "apply_on_hit", effectKey: "burn", amount: 1 }],
      },
      {
        description: "Critical hits apply doom and burn.",
        battleOnly: [
          { type: "apply_on_crit", effectKey: "doom", amount: 2 },
          { type: "apply_on_crit", effectKey: "burn", amount: 3 },
        ],
      },
    ],
  },
  {
    id: "wolf-tempo",
    name: "Wolf Tempo",
    school: "Pack",
    levels: [
      {
        description: "+5 speed, +5 dexterity. Hits grant hasten.",
        statBonuses: { speed: 5, dexterity: 5 },
        battleOnly: [{ type: "gain_on_hit", effectKey: "hasten", amount: 1 }],
      },
      {
        description: "Melee and ranged moves gain accuracy.",
        moveAccuracy: { melee: 6, ranged: 6 },
      },
      {
        description: "+7 crit chance. Critical hits apply bleed.",
        statBonuses: { critChance: 7 },
        battleOnly: [{ type: "apply_on_crit", effectKey: "bleed", amount: 3 }],
      },
    ],
  },
  {
    id: "starfall-rune",
    name: "Starfall Rune",
    school: "Stars",
    levels: [
      {
        description: "+6 crit chance, +6 accuracy. Start each room with focus.",
        statBonuses: { critChance: 6, accuracy: 6 },
        battleOnly: [{ type: "gain_start_of_battle", effectKey: "focus", amount: 5 }],
      },
      {
        description: "+18 crit damage. Critical hits apply doom.",
        statBonuses: { critDamage: 18 },
        battleOnly: [{ type: "apply_on_crit", effectKey: "doom", amount: 2 }],
      },
      {
        description: "Magic and ranged hits apply burn.",
        battleOnly: [
          { type: "apply_on_hit", attackType: "magic", effectKey: "burn", amount: 1 },
          { type: "apply_on_hit", attackType: "ranged", effectKey: "burn", amount: 1 },
        ],
      },
    ],
  },
];

const TRAIT_AWAKENING_DEPTHS_ABILITY_POOL = [
  {
    id: "venom-birthright",
    name: "Venom Birthright",
    school: "Trait Awakening",
    awakeningTags: ["venom"],
    levels: [
      {
        description: "Poison-aligned traits awaken. Damage hits apply poison and curse moves gain accuracy.",
        moveAccuracy: { curse: 8 },
        battleOnly: [{ type: "apply_on_hit", effectKey: "poison", amount: 2 }],
      },
      {
        description: "Poison pressure grows. Critical hits apply deeper poison.",
        statBonuses: { dexterity: 5 },
        battleOnly: [{ type: "apply_on_crit", effectKey: "poison", amount: 4 }],
      },
      {
        description: "Venom becomes a rhythm. Magic and melee hits apply poison.",
        battleOnly: [
          { type: "apply_on_hit", attackType: "magic", effectKey: "poison", amount: 2 },
          { type: "apply_on_hit", attackType: "melee", effectKey: "poison", amount: 2 },
        ],
      },
    ],
  },
  {
    id: "ember-awakening",
    name: "Ember Awakening",
    school: "Trait Awakening",
    awakeningTags: ["flame"],
    levels: [
      {
        description: "Fire-aligned traits awaken. Hits apply burn and your champion gains intelligence.",
        statBonuses: { intelligence: 5 },
        battleOnly: [{ type: "apply_on_hit", effectKey: "burn", amount: 2 }],
      },
      {
        description: "Critical hits flare. Crits apply stronger burn and your champion gains crit chance.",
        statBonuses: { critChance: 5 },
        battleOnly: [{ type: "apply_on_crit", effectKey: "burn", amount: 4 }],
      },
      {
        description: "The ember spreads. Magic and ranged moves gain accuracy and room start grants empower.",
        moveAccuracy: { magic: 6, ranged: 6 },
        battleOnly: [{ type: "gain_start_of_battle", effectKey: "empower", amount: 5 }],
      },
    ],
  },
  {
    id: "armour-remembers",
    name: "Armour Remembers",
    school: "Trait Awakening",
    awakeningTags: ["armor", "ward"],
    levels: [
      {
        description: "Armor and ward traits awaken. Gain health, resist, and start each room with shield.",
        statBonuses: { health: 16, resist: 6 },
        battleOnly: [{ type: "gain_start_of_battle", effectKey: "shield", amount: 8 }],
      },
      {
        description: "The armor answers danger. Second Breath triggers earlier and grants more shield.",
        depthsAbilityMeta: { secondWind: { thresholdPct: 42, healPct: 14, shield: 8 } },
      },
      {
        description: "Your guard becomes active. Hits grant shield and cleanse protection.",
        battleOnly: [
          { type: "gain_on_hit", effectKey: "shield", amount: 2 },
          { type: "gain_on_hit", effectKey: "cleanse", amount: 1 },
        ],
      },
    ],
  },
  {
    id: "weapon-memory",
    name: "Weapon Memory",
    school: "Trait Awakening",
    awakeningTags: ["weapon"],
    levels: [
      {
        description: "Weapon traits awaken. Gain strength, and melee or ranged moves gain accuracy.",
        statBonuses: { strength: 7 },
        moveAccuracy: { melee: 6, ranged: 6 },
      },
      {
        description: "The weapon learns the kill. Damage hits grant strengthen and critical hits apply bleed.",
        battleOnly: [
          { type: "gain_on_hit", effectKey: "strengthen", amount: 2 },
          { type: "apply_on_crit", effectKey: "bleed", amount: 3 },
        ],
      },
      {
        description: "Finishers sharpen. Wounded monsters take extra damage.",
        statBonuses: { critDamage: 18 },
        depthsAbilityMeta: { lowHpDamage: { thresholdPct: 38, flatDamage: 14 } },
      },
    ],
  },
  {
    id: "runeblood-conduit",
    name: "Runeblood Conduit",
    school: "Trait Awakening",
    awakeningTags: ["magic"],
    levels: [
      {
        description: "Magic traits awaken. Gain intelligence and magic moves gain accuracy.",
        statBonuses: { intelligence: 8 },
        moveAccuracy: { magic: 8 },
      },
      {
        description: "Spells feed themselves. Magic hits grant focus and empower.",
        battleOnly: [
          { type: "gain_on_hit", attackType: "magic", effectKey: "focus", amount: 1 },
          { type: "gain_on_hit", attackType: "magic", effectKey: "empower", amount: 1 },
        ],
      },
      {
        description: "The conduit darkens. Magic critical hits apply doom and paralyze.",
        battleOnly: [
          { type: "apply_on_crit", effectKey: "doom", amount: 2 },
          { type: "apply_on_crit", effectKey: "paralyze", amount: 2 },
        ],
      },
    ],
  },
  {
    id: "frostbound-instinct",
    name: "Frostbound Instinct",
    school: "Trait Awakening",
    awakeningTags: ["frost"],
    levels: [
      {
        description: "Frost traits awaken. Ranged and magic hits apply slow.",
        statBonuses: { resist: 5 },
        battleOnly: [
          { type: "apply_on_hit", attackType: "ranged", effectKey: "slow", amount: 2 },
          { type: "apply_on_hit", attackType: "magic", effectKey: "slow", amount: 2 },
        ],
      },
      {
        description: "Cold bites deeper. Critical hits apply freeze.",
        statBonuses: { accuracy: 4 },
        battleOnly: [{ type: "apply_on_crit", effectKey: "freeze", amount: 2 }],
      },
      {
        description: "Frozen focus settles in. Start each room with shield and focus.",
        battleOnly: [
          { type: "gain_start_of_battle", effectKey: "shield", amount: 6 },
          { type: "gain_start_of_battle", effectKey: "focus", amount: 5 },
        ],
      },
    ],
  },
  {
    id: "stormwired-reflex",
    name: "Stormwired Reflex",
    school: "Trait Awakening",
    awakeningTags: ["storm"],
    levels: [
      {
        description: "Storm traits awaken. Gain speed, and ranged hits apply paralyze.",
        statBonuses: { speed: 7 },
        battleOnly: [{ type: "apply_on_hit", attackType: "ranged", effectKey: "paralyze", amount: 1 }],
      },
      {
        description: "Lightning finds openings. Gain crit chance and critical hits apply paralyze.",
        statBonuses: { critChance: 6 },
        battleOnly: [{ type: "apply_on_crit", effectKey: "paralyze", amount: 3 }],
      },
      {
        description: "The storm speeds the hand. Start each room with hasten and focus.",
        battleOnly: [
          { type: "gain_start_of_battle", effectKey: "hasten", amount: 5 },
          { type: "gain_start_of_battle", effectKey: "focus", amount: 4 },
        ],
      },
    ],
  },
  {
    id: "gravebound-claim",
    name: "Gravebound Claim",
    school: "Trait Awakening",
    awakeningTags: ["doom", "curse"],
    levels: [
      {
        description: "Doom and curse traits awaken. Magic hits apply doom and curse moves gain accuracy.",
        moveAccuracy: { curse: 8 },
        battleOnly: [{ type: "apply_on_hit", attackType: "magic", effectKey: "doom", amount: 2 }],
      },
      {
        description: "The claim tightens. Finisher damage improves and critical hits add doom.",
        depthsAbilityMeta: { lowHpDamage: { thresholdPct: 42, flatDamage: 10 } },
        battleOnly: [{ type: "apply_on_crit", effectKey: "doom", amount: 3 }],
      },
      {
        description: "The grave pays back. Gain lifesteal and crit damage.",
        statBonuses: { critDamage: 22 },
        depthsAbilityMeta: { lifeStealPct: 7 },
      },
    ],
  },
  {
    id: "hunters-awake",
    name: "Hunter's Awake",
    school: "Trait Awakening",
    awakeningTags: ["ranged", "precision"],
    levels: [
      {
        description: "Ranged and precision traits awaken. Gain dexterity and ranged accuracy.",
        statBonuses: { dexterity: 7 },
        moveAccuracy: { ranged: 9 },
      },
      {
        description: "The shot steadies. Gain crit chance and ranged hits grant focus.",
        statBonuses: { critChance: 6 },
        battleOnly: [{ type: "gain_on_hit", attackType: "ranged", effectKey: "focus", amount: 2 }],
      },
      {
        description: "The hunt closes. Critical hits apply slow and bleed.",
        battleOnly: [
          { type: "apply_on_crit", effectKey: "slow", amount: 3 },
          { type: "apply_on_crit", effectKey: "bleed", amount: 3 },
        ],
      },
    ],
  },
  {
    id: "saints-echo",
    name: "Saint's Echo",
    school: "Trait Awakening",
    awakeningTags: ["holy", "ward"],
    levels: [
      {
        description: "Holy and ward traits awaken. Start each room with bless, cleanse, and nurture.",
        battleOnly: [
          { type: "gain_start_of_battle", effectKey: "bless", amount: 5 },
          { type: "gain_start_of_battle", effectKey: "cleanse", amount: 5 },
          { type: "gain_start_of_battle", effectKey: "nurture", amount: 4 },
        ],
      },
      {
        description: "Healing improves. Second Breath gains extra healing.",
        depthsAbilityMeta: { secondWind: { thresholdPct: 38, healPct: 18, shield: 5 } },
      },
      {
        description: "Grace follows every hit. Hits grant bless and focus.",
        battleOnly: [
          { type: "gain_on_hit", effectKey: "bless", amount: 1 },
          { type: "gain_on_hit", effectKey: "focus", amount: 1 },
        ],
      },
    ],
  },
];

const MAX_DEPTHS_ABILITY_LEVEL = 5;
const DEPTHS_ABILITY_STAT_LABELS = {
  health: "max health",
  speed: "speed",
  resist: "resist",
  strength: "strength",
  dexterity: "dexterity",
  intelligence: "intelligence",
  accuracy: "move accuracy",
  critChance: "crit chance",
  critDamage: "crit damage",
};

const DEPTHS_ABILITY_ATTACK_LABELS = {
  melee: "melee",
  ranged: "ranged",
  magic: "magic",
  curse: "curse",
};

const DEPTHS_ABILITY_POOL = [
  ...BASE_DEPTHS_ABILITY_POOL,
  ...EXTRA_DEPTHS_ABILITY_POOL,
  ...MORE_DEPTHS_ABILITY_POOL,
  ...TRAIT_AWAKENING_DEPTHS_ABILITY_POOL,
].map(
  (ability) => {
    return {
      ...ability,
      imageSrc: getDepthsAbilityImageSrc(ability.id, 1),
      levels: normalizeDepthsAbilityLevels(ability),
    };
  }
);

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getDepthsAbilityImageSrc(abilityId) {
  return `/arena/depths/abilities/${abilityId}.png`;
}

function cloneDepthsAbilityMeta(meta = {}) {
  const next = {};
  if (meta.lifeStealPct) next.lifeStealPct = meta.lifeStealPct;
  if (meta.lowHpDamage) next.lowHpDamage = { ...meta.lowHpDamage };
  if (meta.secondWind) next.secondWind = { ...meta.secondWind };
  return next;
}

function normalizeDepthsAbilityLevel(level = {}, ability = {}, levelNumber = 1) {
  return {
    description: level.description || (levelNumber === 1 ? ability.description || "" : ""),
    statBonuses: { ...(level.statBonuses || {}) },
    moveAccuracy: { ...(level.moveAccuracy || {}) },
    battleOnly: Array.isArray(level.battleOnly)
      ? level.battleOnly.map((entry) => ({ ...entry }))
      : [],
    depthsAbilityMeta: cloneDepthsAbilityMeta(level.depthsAbilityMeta || {}),
    level: levelNumber,
    imageSrc: getDepthsAbilityImageSrc(ability.id, levelNumber),
  };
}

function scaleDepthsAbilityAmount(value, multiplier = 1.18) {
  const amount = finiteNumber(value, 0);
  if (!amount) return 0;
  const sign = amount < 0 ? -1 : 1;
  const absolute = Math.abs(amount);
  if (absolute < 1) return Number((amount * multiplier).toFixed(2));
  return sign * Math.max(1, Math.ceil(absolute * multiplier));
}

function scaleDepthsNumberMap(map = {}, multiplier = 1.18) {
  const next = {};
  Object.entries(map || {}).forEach(([key, value]) => {
    next[key] = scaleDepthsAbilityAmount(value, multiplier);
  });
  return next;
}

function scaleDepthsBattleOnly(entries = [], multiplier = 1.18) {
  return entries.map((entry) => ({
    ...entry,
    amount: scaleDepthsAbilityAmount(entry.amount, multiplier),
  }));
}

function scaleDepthsAbilityMeta(meta = {}, multiplier = 1.18, levelNumber = 1) {
  const next = {};
  if (meta.lifeStealPct) next.lifeStealPct = scaleDepthsAbilityAmount(meta.lifeStealPct, multiplier);
  if (meta.lowHpDamage) {
    next.lowHpDamage = {
      thresholdPct: clampNumber(
        Math.ceil(finiteNumber(meta.lowHpDamage.thresholdPct, 0) + (levelNumber >= 5 ? 4 : 2)),
        1,
        75
      ),
      flatDamage: scaleDepthsAbilityAmount(meta.lowHpDamage.flatDamage, multiplier),
    };
  }
  if (meta.secondWind) {
    next.secondWind = {
      thresholdPct: clampNumber(
        Math.ceil(finiteNumber(meta.secondWind.thresholdPct, 0) + (levelNumber >= 5 ? 4 : 2)),
        1,
        75
      ),
      healPct: scaleDepthsAbilityAmount(meta.secondWind.healPct, multiplier),
      shield: scaleDepthsAbilityAmount(meta.secondWind.shield, multiplier),
    };
  }
  return next;
}

function generateDepthsAbilityLevel(previousLevel = {}, ability = {}, levelNumber = 1) {
  const multiplier = levelNumber >= 5 ? 1.22 : 1.16;
  return normalizeDepthsAbilityLevel(
    {
      description: `${ability.name} grows into a stronger level ${levelNumber} upgrade.`,
      statBonuses: scaleDepthsNumberMap(previousLevel.statBonuses, multiplier),
      moveAccuracy: scaleDepthsNumberMap(previousLevel.moveAccuracy, multiplier),
      battleOnly: scaleDepthsBattleOnly(previousLevel.battleOnly, multiplier),
      depthsAbilityMeta: scaleDepthsAbilityMeta(previousLevel.depthsAbilityMeta, multiplier, levelNumber),
    },
    ability,
    levelNumber
  );
}

function normalizeDepthsAbilityLevels(ability = {}) {
  const baseLevel = normalizeDepthsAbilityLevel(
    {
      description: ability.description,
      statBonuses: ability.statBonuses,
      moveAccuracy: ability.moveAccuracy,
      battleOnly: ability.battleOnly,
      depthsAbilityMeta: ability.depthsAbilityMeta,
    },
    ability,
    1
  );
  const rawLevels =
    Array.isArray(ability.levels) && ability.levels.length
      ? ability.levels
      : [baseLevel, ...(DEPTHS_ABILITY_LEVEL_UPGRADES[ability.id] || [])];
  const levels = rawLevels.map((level, index) => normalizeDepthsAbilityLevel(level, ability, index + 1));

  while (levels.length < MAX_DEPTHS_ABILITY_LEVEL) {
    levels.push(generateDepthsAbilityLevel(levels[levels.length - 1], ability, levels.length + 1));
  }

  return levels.slice(0, MAX_DEPTHS_ABILITY_LEVEL).map((level, index) => ({
    ...level,
    level: index + 1,
    maxLevel: MAX_DEPTHS_ABILITY_LEVEL,
    imageSrc: getDepthsAbilityImageSrc(ability.id, index + 1),
    description: buildDepthsAbilityLevelDescription(ability, level, index + 1),
  }));
}

function formatDepthsAbilityLabel(value) {
  const key = String(value || "");
  if (!key) return "";
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDepthsStatBonus(key, value) {
  const label = DEPTHS_ABILITY_STAT_LABELS[key] || formatDepthsAbilityLabel(key).toLowerCase();
  const suffix = key === "critChance" || key === "critDamage" ? "%" : "";
  return `${formatSignedAmount(value)}${suffix} ${label}`;
}

function formatDepthsMoveAccuracy(key, value) {
  const label = DEPTHS_ABILITY_ATTACK_LABELS[key] || formatDepthsAbilityLabel(key).toLowerCase();
  return `${label} moves gain ${formatSignedAmount(value)} accuracy`;
}

function formatDepthsEffectAmount(effectKey, amount) {
  return `${formatSignedAmount(amount)} ${formatDepthsAbilityLabel(effectKey).toLowerCase()}`;
}

function formatDepthsAttackTrigger(entry = {}, { sentence = false } = {}) {
  const attackType = entry.attackType ? DEPTHS_ABILITY_ATTACK_LABELS[entry.attackType] || entry.attackType : "";
  if (entry.type === "apply_on_crit") return sentence ? "a critical hit" : "critical hits";
  if (!attackType) return sentence ? "a damage hit" : "damage hits";
  return sentence ? `a ${attackType} hit` : `${attackType} hits`;
}

function describeDepthsBattleOnly(entry = {}, { concise = false } = {}) {
  const effect = formatDepthsEffectAmount(entry.effectKey, entry.amount);
  if (entry.type === "heal_for_applied_stacks") {
    const sourceEffect = formatDepthsAbilityLabel(entry.sourceEffectKey || entry.effectKey).toLowerCase();
    return concise
      ? `${sourceEffect} applied: heal ${formatDepthsNumber(entry.amount)} per stack`
      : `When your champion applies ${sourceEffect}, heal ${formatDepthsNumber(entry.amount)} HP per stack applied.`;
  }
  if (entry.type === "heal_when_stacks_applied") {
    const sourceEffect = formatDepthsAbilityLabel(entry.sourceEffectKey || entry.effectKey).toLowerCase();
    return concise
      ? `${sourceEffect} applied: heal ${formatDepthsNumber(entry.amount)}`
      : `When your champion applies ${sourceEffect} stacks, heal ${formatDepthsNumber(entry.amount)} HP.`;
  }
  if (entry.type === "gain_start_of_battle") {
    return concise
      ? `room start: gain ${effect}`
      : `At the start of each room, your champion gains ${effect} before the first move.`;
  }
  if (entry.type === "apply_start_of_battle") {
    return concise
      ? `room start: apply ${effect}`
      : `At the start of each room, apply ${effect} to the first living monster.`;
  }
  if (entry.type === "gain_on_hit") {
    const trigger = formatDepthsAttackTrigger(entry, { sentence: !concise });
    return concise
      ? `${trigger}: gain ${effect}`
      : `When your champion lands ${trigger}, they gain ${effect}.`;
  }
  if (entry.type === "apply_on_crit") {
    return concise
      ? `critical hits: apply ${effect}`
      : `When your champion lands a critical hit, the target gains ${effect}.`;
  }

  const trigger = formatDepthsAttackTrigger(entry, { sentence: !concise });
  return concise
    ? `${trigger}: apply ${effect}`
    : `When your champion lands ${trigger}, the target gains ${effect}. Item potency on the champion can increase this amount.`;
}

function describeDepthsAbilityMeta(meta = {}, { concise = false } = {}) {
  const rows = [];
  if (meta.lifeStealPct) {
    rows.push(
      concise
        ? `lifesteal: heal ${formatDisplayPercent(meta.lifeStealPct)} of damage dealt`
        : `After dealing damage, your champion heals for ${formatDisplayPercent(meta.lifeStealPct)} of that damage.`
    );
  }
  if (meta.lowHpDamage) {
    rows.push(
      concise
        ? `finisher: +${meta.lowHpDamage.flatDamage} damage below ${meta.lowHpDamage.thresholdPct}% HP`
        : `Damaging hits deal +${meta.lowHpDamage.flatDamage} extra damage when the target is at or below ${meta.lowHpDamage.thresholdPct}% HP.`
    );
  }
  if (meta.secondWind) {
    rows.push(
      concise
        ? `second breath: once/room below ${meta.secondWind.thresholdPct}% HP, heal ${meta.secondWind.healPct}% and gain ${meta.secondWind.shield} shield`
        : `Once per room, when your champion survives at or below ${meta.secondWind.thresholdPct}% HP, Second Breath heals ${meta.secondWind.healPct}% max HP and grants ${meta.secondWind.shield} shield.`
    );
  }
  return rows;
}

function formatDisplayPercent(value) {
  return `${finiteNumber(value, 0)}%`;
}

function getDepthsAbilityMechanicDescriptions(level = {}, options = {}) {
  const rows = [];
  const statRows = Object.entries(level.statBonuses || {}).map(([key, value]) =>
    formatDepthsStatBonus(key, value)
  );
  if (statRows.length) rows.push(options.concise ? statRows.join(", ") : `Stat bonus: ${statRows.join(", ")}.`);

  const accuracyRows = Object.entries(level.moveAccuracy || {}).map(([key, value]) =>
    formatDepthsMoveAccuracy(key, value)
  );
  if (accuracyRows.length) {
    rows.push(options.concise ? accuracyRows.join(", ") : `Move accuracy: ${accuracyRows.join(", ")}.`);
  }

  (level.battleOnly || []).forEach((entry) => {
    rows.push(describeDepthsBattleOnly(entry, options));
  });

  rows.push(...describeDepthsAbilityMeta(level.depthsAbilityMeta || {}, options));
  return rows;
}

function buildDepthsAbilityLevelDescription(ability = {}, level = {}, levelNumber = 1) {
  return (
    level.description ||
    (levelNumber === 1 ? ability.description : `${ability.name} gains a stronger level ${levelNumber} upgrade.`)
  );
}

function cleanForFirestore(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(cleanForFirestore);

  const out = {};
  Object.entries(value).forEach(([key, entry]) => {
    if (typeof entry !== "function") out[key] = cleanForFirestore(entry);
  });
  return out;
}

function pickNumberMapValues(map = {}) {
  return Object.keys(map || {})
    .sort()
    .reduce((acc, key) => {
      const amount = finiteNumber(map[key], 0);
      if (amount) acc[key] = Math.round(amount * 1000) / 1000;
      return acc;
    }, {});
}

function compactDepthsMoveForRun(move = {}, index = 0) {
  const moveId = getDepthsMoveId(move, index);
  return {
    id: moveId,
    name: String(move?.name || moveId || "Move"),
    type: String(move?.type || move?.category || ""),
    category: String(move?.category || move?.type || ""),
    moveKind: String(move?.moveKind || ""),
    target: String(move?.target || ""),
    power: Math.round(finiteNumber(move?.power ?? move?.basePower, 0) * 1000) / 1000,
    accuracy: Math.round(finiteNumber(move?.accuracy, 0) * 1000) / 1000,
    cooldown: Math.round(finiteNumber(move?.cooldown ?? move?.cooldown_seconds, 0) * 1000) / 1000,
    cooldown_seconds: Math.round(finiteNumber(move?.cooldown_seconds ?? move?.cooldown, 0) * 1000) / 1000,
    effect: String(move?.effect || move?.effect_name || ""),
    effect_name: String(move?.effect_name || move?.effect || ""),
    effect_potency_base:
      Math.round(finiteNumber(move?.effect_potency_base ?? move?.effect_potency ?? move?.effectAmount, 0) * 1000) / 1000,
    depthsCardId: move?.depthsCardId || move?.cardId || null,
    depthsCardSource: move?.depthsCardSource || "",
    deckCopies: Math.max(0, Math.round(finiteNumber(move?.deckCopies, move?.depthsCardSource === "firebase" ? 1 : 2))),
    rarity: move?.rarity || "",
    cardPowerScore: finiteNumber(move?.cardPowerScore, 0),
    depthsCardUpgradeMeta: move?.depthsCardUpgradeMeta || null,
    effects: (Array.isArray(move?.effects) ? move.effects : []).map((effect) => ({
      effect: String(effect?.effect || effect?.effectName || "").toLowerCase(),
      amount: Math.round(finiteNumber(effect?.amount, 0) * 1000) / 1000,
      target: String(effect?.target || ""),
    })),
  };
}

function compactDepthsCardForRun(card = {}) {
  const move = card?.move || card || {};
  const cardId = String(card?.cardId || move?.cardId || move?.depthsCardId || card?.id || move?.id || "");
  return {
    id: String(card?.id || move?.id || cardId || ""),
    cardId,
    name: String(card?.name || move?.name || "Depths Card"),
    type: String(card?.type || move?.type || move?.category || ""),
    range: String(card?.range || ""),
    class: String(card?.class || ""),
    rarity: String(card?.rarity || move?.rarity || "common"),
    power: Math.round(finiteNumber(card?.power ?? move?.power, 0) * 1000) / 1000,
    accuracy: Math.round(finiteNumber(card?.accuracy ?? move?.accuracy, 0) * 1000) / 1000,
    cooldown: Math.round(finiteNumber(card?.cooldown ?? move?.cooldown ?? move?.cooldown_seconds, 0) * 1000) / 1000,
    effects: (Array.isArray(card?.effects) ? card.effects : move?.effects || []).map((effect) => ({
      effect: String(effect?.effect || effect?.effectName || "").toLowerCase(),
      amount: Math.round(finiteNumber(effect?.amount, 0) * 1000) / 1000,
      target: String(effect?.target || ""),
    })),
    deckCopies: Math.max(0, Math.round(finiteNumber(card?.deckCopies ?? move?.deckCopies, 1))),
    room: card?.room ?? null,
    cardPowerScore: finiteNumber(card?.cardPowerScore ?? move?.cardPowerScore, 0),
    move: compactDepthsMoveForRun({
      ...move,
      cardId,
      depthsCardId: move?.depthsCardId || cardId || null,
      depthsCardSource: move?.depthsCardSource || "firebase",
      deckCopies: card?.deckCopies ?? move?.deckCopies ?? 1,
    }),
  };
}

function compactDepthsArtifactForRun(artifact = {}) {
  return {
    id: String(artifact?.id || ""),
    name: String(artifact?.name || ""),
    rarity: String(artifact?.rarity || ""),
    imageUrl: String(artifact?.imageUrl || artifact?.iconUrl || ""),
    room: artifact?.room ?? null,
    description: artifact?.description || "",
    effect: artifact?.effect || "",
    statBonuses: artifact?.statBonuses || {},
    moveAccuracy: artifact?.moveAccuracy || {},
    artifactMeta: artifact?.artifactMeta || {},
    depthsAbilityMeta: artifact?.depthsAbilityMeta || {},
    battleOnly: (Array.isArray(artifact?.battleOnly) ? artifact.battleOnly : []).map((entry) => ({
      type: String(entry?.type || ""),
      attackType: String(entry?.attackType || ""),
      effectKey: String(entry?.effectKey || ""),
      sourceEffectKey: String(entry?.sourceEffectKey || ""),
      amount: finiteNumber(entry?.amount, 0),
      trigger: String(entry?.trigger || ""),
    })),
  };
}

function compactDepthsCardUpgradeForRun(upgrade = {}) {
  return {
    id: String(upgrade?.id || ""),
    upgradeId: String(upgrade?.upgradeId || upgrade?.id || ""),
    name: String(upgrade?.name || ""),
    description: upgrade?.description || "",
    moveIndex: Number.isSafeInteger(Number(upgrade?.moveIndex)) ? Number(upgrade.moveIndex) : null,
    moveKey: String(upgrade?.moveKey || ""),
    moveFamilyKey: String(upgrade?.moveFamilyKey || ""),
    room: upgrade?.room ?? null,
    powerDelta: finiteNumber(upgrade?.powerDelta, 0),
    powerMultiplier: upgrade?.powerMultiplier || null,
    accuracyDelta: finiteNumber(upgrade?.accuracyDelta, 0),
    cooldownDelta: finiteNumber(upgrade?.cooldownDelta, 0),
    effectPotencyBonus: finiteNumber(upgrade?.effectPotencyBonus, 0),
    effectPotencyMultiplier: upgrade?.effectPotencyMultiplier || null,
    repeatCount: upgrade?.repeatCount || null,
    multiTarget: Boolean(upgrade?.multiTarget),
    critChanceBonus: finiteNumber(upgrade?.critChanceBonus, 0),
    secondaryEffects: (Array.isArray(upgrade?.secondaryEffects) ? upgrade.secondaryEffects : []).map((effect) => ({
      target: String(effect?.target || ""),
      effectKey: String(effect?.effectKey || ""),
      amount: finiteNumber(effect?.amount, 0),
      trigger: String(effect?.trigger || ""),
    })),
  };
}

function compactDepthsCardRemovalForRun(removal = {}) {
  return {
    id: String(removal?.id || ""),
    cardId: String(removal?.cardId || ""),
    moveKey: String(removal?.moveKey || ""),
    moveFamilyKey: String(removal?.moveFamilyKey || ""),
    removedCopies: Math.max(1, Math.round(finiteNumber(removal?.removedCopies, 1))),
    room: removal?.room ?? null,
  };
}

function compactDepthsMonsterForRun(monster = {}) {
  if (!monster || typeof monster !== "object") return null;
  const monsterId = String(monster?.docId || monster?.monsterId || monster?.id || "");
  const compact = {
    docId: monster?.docId || null,
    id: monster?.id || monsterId,
    monsterId: monster?.monsterId || monsterId,
    name: String(monster?.name || monster?.displayName || monsterId || "Monster"),
    monsterType: String(monster?.monsterType || monster?.type || "Monster"),
    description: String(monster?.description || ""),
    status: String(monster?.status || ""),
    depthsWorlds: Array.isArray(monster?.depthsWorlds) ? monster.depthsWorlds : [],
    baseStats: DEPTHS_STAT_KEYS.reduce((acc, key) => {
      const value = monster?.baseStats?.[key] ?? monster?.[key];
      if (value !== undefined && value !== null) acc[key] = Math.round(finiteNumber(value, 0) * 1000) / 1000;
      return acc;
    }, {}),
    effectPotencies: DEPTHS_EFFECT_KEYS.reduce((acc, key) => {
      const value =
        monster?.effectPotencies?.[key] ??
        monster?.itemEffectPotencies?.[key] ??
        monster?.[key];
      if (value !== undefined && value !== null && finiteNumber(value, 0)) {
        acc[key] = Math.round(finiteNumber(value, 0) * 1000) / 1000;
      }
      return acc;
    }, {}),
    moves: (Array.isArray(monster?.moves) ? monster.moves : []).map(compactDepthsMoveForRun),
    _depthsScaling: monster?._depthsScaling || monster?.depthsScaling || null,
    idleFrame:
      Array.isArray(monster?.idleFrames) && monster.idleFrames.length
        ? monster.idleFrames.find(Boolean) || ""
        : "",
    imageUrl:
      monster?.imageUrl ||
      monster?.standingUrl ||
      monster?.idleFrame ||
      (Array.isArray(monster?.idleFrames) ? monster.idleFrames.find(Boolean) || "" : ""),
    standingUrl: monster?.standingUrl || monster?.imageUrl || "",
  };

  DEPTHS_STAT_KEYS.forEach((key) => {
    if (monster?.[key] !== undefined && monster?.[key] !== null) {
      compact[key] = Math.round(finiteNumber(monster[key], 0) * 1000) / 1000;
    }
  });
  DEPTHS_EFFECT_KEYS.forEach((key) => {
    if (monster?.[key] !== undefined && monster?.[key] !== null && finiteNumber(monster[key], 0)) {
      compact[key] = Math.round(finiteNumber(monster[key], 0) * 1000) / 1000;
    }
  });

  Object.keys(compact).forEach((key) => {
    if (compact[key] === null || compact[key] === undefined || compact[key] === "") delete compact[key];
  });
  return compact;
}

function compactDepthsChampionSnapshotForRun(charObj = null) {
  if (!charObj || typeof charObj !== "object") return null;
  const snapshot = {
    assetId: charObj.assetId || null,
    name: charObj.name || "",
    description: charObj.description || "",
    health: finiteNumber(charObj.health, 0),
    speed: finiteNumber(charObj.speed, 0),
    resist: finiteNumber(charObj.resist, 0),
    strength: finiteNumber(charObj.strength, 0),
    dexterity: finiteNumber(charObj.dexterity, 0),
    intelligence: finiteNumber(charObj.intelligence, 0),
    critChance: finiteNumber(charObj.critChance, 0),
    critDamage: finiteNumber(charObj.critDamage, 0),
    baseStats: charObj.baseStats || null,
    statBonuses: charObj.statBonuses || {},
    skillStatBonuses: charObj.skillStatBonuses || {},
    traitStatBonuses: charObj.traitStatBonuses || {},
    effectPotencies: pickNumberMapValues(charObj.effectPotencies || {}),
    itemEffectPotencies: pickNumberMapValues(charObj.itemEffectPotencies || {}),
    skillEffectBonuses: pickNumberMapValues(charObj.skillEffectBonuses || {}),
    gainedEffectsMeta: charObj.gainedEffectsMeta || {},
    triggerEffects: charObj.triggerEffects || [],
    passiveEffects: charObj.passiveEffects || [],
    moves: (Array.isArray(charObj.moves) ? charObj.moves : []).map(compactDepthsMoveForRun),
    depthsCurrentHp:
      charObj.depthsCurrentHp === undefined || charObj.depthsCurrentHp === null
        ? null
        : Math.round(finiteNumber(charObj.depthsCurrentHp, 0) * 1000) / 1000,
    depthsAbilityMeta: charObj.depthsAbilityMeta || {},
    depthsArtifactMeta: charObj.depthsArtifactMeta || {},
    backgroundImageUrl: charObj.backgroundImageUrl || charObj.backgroundUrl || "",
    standingUrl: charObj.standingUrl || charObj.imageUrl || "",
    imageUrl: charObj.imageUrl || charObj.standingUrl || "",
  };

  Object.keys(snapshot).forEach((key) => {
    if (snapshot[key] === null || snapshot[key] === undefined || snapshot[key] === "") delete snapshot[key];
  });
  return snapshot;
}

function compactDepthsFighterSnapshotForRun(fighter = null) {
  if (!fighter || typeof fighter !== "object") return null;
  return {
    side: String(fighter?.side || "A"),
    role: String(fighter?.role || "champion"),
    assetId: fighter?.assetId || null,
    name: String(fighter?.name || ""),
    hp: Math.round(finiteNumber(fighter?.hp, 0) * 1000) / 1000,
    maxHp: Math.round(finiteNumber(fighter?.maxHp, 0) * 1000) / 1000,
    stats: pickNumberMapValues(fighter?.stats || {}),
    effectPotencies: pickNumberMapValues(fighter?.effectPotencies || {}),
    effects: pickNumberMapValues(fighter?.effects || {}),
    moves: (Array.isArray(fighter?.moves) ? fighter.moves : []).map(compactDepthsMoveForRun),
    idleFrame: Array.isArray(fighter?.idleFrames) ? fighter.idleFrames.find(Boolean) || "" : "",
    standingUrl: fighter?.standingUrl || fighter?.imageUrl || "",
    imageUrl: fighter?.imageUrl || fighter?.standingUrl || "",
  };
}

function rehydrateDepthsCardsForRun(savedCards = [], cardCatalog = []) {
  if (!Array.isArray(savedCards)) return [];
  return savedCards.map((savedCard, index) => {
    const cardId = String(savedCard?.cardId || savedCard?.move?.depthsCardId || savedCard?.id || "");
    const catalogCard = cardCatalog.find((card) =>
      [card.cardId, card.id, card.docId].map((value) => String(value || "")).includes(cardId)
    );
    const merged = catalogCard
      ? {
          ...catalogCard,
          ...savedCard,
          casterAnimation: catalogCard.casterAnimation || savedCard.casterAnimation || {},
          effectAnimation: catalogCard.effectAnimation || savedCard.effectAnimation || {},
          effects: savedCard.effects || catalogCard.effects || [],
        }
      : savedCard;
    const moveSource = merged.move || depthsCardToMove(merged, index);
    const move = {
      ...depthsCardToMove(merged, index),
      ...moveSource,
      casterAnimation: catalogCard?.casterAnimation || moveSource.casterAnimation || {},
      effectAnimation: catalogCard?.effectAnimation || moveSource.effectAnimation || {},
      animationFrames: catalogCard?.casterAnimation?.frameUrls || moveSource.animationFrames || [],
      effectFrames: catalogCard?.effectAnimation?.frameUrls || moveSource.effectFrames || [],
      effects: merged.effects || moveSource.effects || [],
      deckCopies: Math.max(0, Math.round(finiteNumber(savedCard?.deckCopies ?? moveSource.deckCopies, 1))),
    };
    return {
      ...merged,
      deckCopies: move.deckCopies,
      move,
    };
  });
}

function rehydrateDepthsMonsterMovesForRun(savedMoves = [], catalogMoves = []) {
  const catalogRows = Array.isArray(catalogMoves) ? catalogMoves : [];
  return (Array.isArray(savedMoves) ? savedMoves : []).map((savedMove, index) => {
    const moveId = String(savedMove?.id || savedMove?.moveId || savedMove?.name || "");
    const catalogMove =
      catalogRows.find((move) =>
        [move?.id, move?.moveId, move?.name].map((value) => String(value || "")).includes(moveId)
      ) ||
      catalogRows[index] ||
      {};
    return {
      ...catalogMove,
      ...savedMove,
      casterAnimation: catalogMove.casterAnimation || savedMove.casterAnimation || {},
      effectAnimation: catalogMove.effectAnimation || savedMove.effectAnimation || {},
      animationFrames: catalogMove.animationFrames || savedMove.animationFrames || [],
      effectFrames: catalogMove.effectFrames || savedMove.effectFrames || [],
      characterFrames: catalogMove.characterFrames || savedMove.characterFrames || [],
      visualFrames: catalogMove.visualFrames || savedMove.visualFrames || [],
    };
  });
}

function rehydrateDepthsMonstersForRun(savedMonsters = [], monsterCatalog = [], scalingRows = []) {
  if (!Array.isArray(savedMonsters)) return [];
  return savedMonsters.map((savedMonster, index) => {
    const monsterId = String(savedMonster?.docId || savedMonster?.monsterId || savedMonster?.id || "");
    const catalogMonster = monsterCatalog.find((monster) =>
      [monster.docId, monster.monsterId, monster.id].map((value) => String(value || "")).includes(monsterId)
    );
    const scaling = scalingRows[index] || savedMonster?._depthsScaling || savedMonster?.depthsScaling || null;
    const merged = catalogMonster
      ? {
          ...JSON.parse(JSON.stringify(catalogMonster)),
          ...savedMonster,
          moves: rehydrateDepthsMonsterMovesForRun(savedMonster.moves || catalogMonster.moves || [], catalogMonster.moves || []),
          idleFrames: catalogMonster.idleFrames || savedMonster.idleFrames || [],
          moveAnimations: catalogMonster.moveAnimations || savedMonster.moveAnimations || {},
          effectAnimations: catalogMonster.effectAnimations || savedMonster.effectAnimations || {},
          _depthsScaling: scaling,
        }
      : {
          ...savedMonster,
          _depthsScaling: scaling,
        };

    DEPTHS_STAT_KEYS.forEach((key) => {
      const value = savedMonster?.baseStats?.[key] ?? savedMonster?.[key];
      if (value !== undefined && value !== null) {
        merged[key] = value;
        merged.baseStats = { ...(merged.baseStats || {}), [key]: value };
      }
    });
    DEPTHS_EFFECT_KEYS.forEach((key) => {
      const value =
        savedMonster?.effectPotencies?.[key] ??
        savedMonster?.itemEffectPotencies?.[key] ??
        savedMonster?.[key];
      if (value !== undefined && value !== null) merged[key] = value;
    });
    return merged;
  });
}

function clearInactiveDepthsChoiceFields(next = {}) {
  const status = String(next.status || "");
  if (!status) return next;

  if (!["choosingLoadout", "choosingCard"].includes(status) && next.cardChoices === undefined) {
    next.cardChoices = [];
  }
  if (!["choosingLoadout", "choosingArtifact"].includes(status) && next.artifactChoices === undefined) {
    next.artifactChoices = [];
  }
  if (status !== "choosingCardUpgrade" && next.cardUpgradeChoices === undefined) {
    next.cardUpgradeChoices = [];
  }
  if (status !== "choosingLoadout") {
    if (next.selectedCardPreview === undefined) next.selectedCardPreview = null;
    if (next.selectedArtifactPreview === undefined) next.selectedArtifactPreview = null;
  }

  return next;
}

function compactDepthsRunUpdatesForStorage(updates = {}) {
  const next = clearInactiveDepthsChoiceFields({ ...(updates || {}) });
  if (Array.isArray(next.artifacts)) next.artifacts = next.artifacts.map(compactDepthsArtifactForRun);
  if (Array.isArray(next.artifactChoices)) next.artifactChoices = next.artifactChoices.map(compactDepthsArtifactForRun);
  if (Array.isArray(next.cards)) next.cards = next.cards.map(compactDepthsCardForRun);
  if (Array.isArray(next.cardChoices)) next.cardChoices = next.cardChoices.map(compactDepthsCardForRun);
  if (Array.isArray(next.cardUpgrades)) next.cardUpgrades = next.cardUpgrades.map(compactDepthsCardUpgradeForRun);
  if (Array.isArray(next.cardUpgradeChoices)) {
    next.cardUpgradeChoices = next.cardUpgradeChoices.map(compactDepthsCardUpgradeForRun);
  }
  if (Array.isArray(next.cardRemovals)) next.cardRemovals = next.cardRemovals.map(compactDepthsCardRemovalForRun);
  if (next.selectedCardPreview) next.selectedCardPreview = compactDepthsCardForRun(next.selectedCardPreview);
  if (next.selectedArtifactPreview) next.selectedArtifactPreview = compactDepthsArtifactForRun(next.selectedArtifactPreview);
  if (next.championSnapshot) next.championSnapshot = compactDepthsChampionSnapshotForRun(next.championSnapshot);
  if (next.championBattleSnapshot) next.championBattleSnapshot = compactDepthsFighterSnapshotForRun(next.championBattleSnapshot);
  if (Array.isArray(next.currentMonsters)) next.currentMonsters = next.currentMonsters.map(compactDepthsMonsterForRun).filter(Boolean);
  if (next.nodeResult && typeof next.nodeResult === "object") {
    next.nodeResult = {
      room: next.nodeResult.room ?? next.room ?? null,
      type: next.nodeResult.type || null,
      title: next.nodeResult.title || "",
      text: next.nodeResult.text || "",
      detail: next.nodeResult.detail || null,
      completed: Boolean(next.nodeResult.completed),
      defeated: Boolean(next.nodeResult.defeated),
      ended: Boolean(next.nodeResult.ended),
      completedEncounters: next.nodeResult.completedEncounters ?? null,
      finalNodeType: next.nodeResult.finalNodeType || null,
      finalNodeLabel: next.nodeResult.finalNodeLabel || null,
      championAssetId: next.nodeResult.championAssetId || null,
      currentNodeId: next.nodeResult.currentNodeId || null,
      visitedNodeIds: Array.isArray(next.nodeResult.visitedNodeIds) ? next.nodeResult.visitedNodeIds : [],
    };
  }
  return next;
}

async function postDepthsState(payload) {
  const response = await fetch("/api/arena/depthsState", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cleanForFirestore(payload)),
  });

  const responseText = await response.text().catch(() => "");
  let body = {};
  if (responseText) {
    try {
      body = JSON.parse(responseText);
    } catch {
      body = { error: responseText };
    }
  }
  if (!response.ok) {
    const error = new Error(body?.error || `Depths state API failed with status ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function shuffleRows(rows) {
  return [...rows].sort(() => Math.random() - 0.5);
}

function pickWeightedEntry(entries) {
  const totalWeight = entries.reduce((sum, entry) => sum + finiteNumber(entry.weight, 0), 0);
  if (totalWeight <= 0) return entries[0];

  let roll = Math.random() * totalWeight;
  for (const entry of entries) {
    roll -= finiteNumber(entry.weight, 0);
    if (roll <= 0) return entry;
  }

  return entries[entries.length - 1];
}

function getChosenAbilityLevel(abilityId, chosenAbilities = []) {
  return chosenAbilities.filter((ability) => ability.id === abilityId).length;
}

function hydrateDepthsAbilityChoice(ability, roomNumber, chosenAbilities = []) {
  const currentLevel = getChosenAbilityLevel(ability.id, chosenAbilities);
  const nextLevel = Math.min(currentLevel + 1, ability.levels.length);
  const levelData = ability.levels[nextLevel - 1] || ability.levels[ability.levels.length - 1] || {};

  return {
    ...ability,
    ...levelData,
    id: ability.id,
    name: ability.name,
    school: ability.school,
    imageSrc: levelData.imageSrc || getDepthsAbilityImageSrc(ability.id, nextLevel),
    level: nextLevel,
    maxLevel: ability.levels.length,
    alreadyKnown: currentLevel > 0,
    offeredRoom: roomNumber,
  };
}

function pickDepthsAbilityChoices(roomNumber, chosenAbilities = [], traitSource = null) {
  const traitProfile = buildDepthsTraitAwakeningProfile(traitSource || {});
  const available = DEPTHS_ABILITY_POOL.filter(
    (ability) =>
      getChosenAbilityLevel(ability.id, chosenAbilities) < ability.levels.length &&
      isDepthsTraitRewardUnlocked(ability, traitProfile)
  );
  const pool = available.length
    ? available
    : DEPTHS_ABILITY_POOL.filter((ability) => isDepthsTraitRewardUnlocked(ability, traitProfile));
  const picked = [];

  const ownedUpgradeOptions = pickWeightedDepthsRewards(
    pool.filter((ability) => getChosenAbilityLevel(ability.id, chosenAbilities) > 0)
      .filter((ability) => !picked.some((entry) => entry.id === ability.id)),
    3,
    traitProfile
  );

  ownedUpgradeOptions.forEach((ability) => {
    if (picked.length >= 3) return;
    if (Math.random() <= 0.25) picked.push(ability);
  });

  pickWeightedDepthsRewards(
    pool.filter((ability) => !picked.some((entry) => entry.id === ability.id)),
    3 - picked.length,
    traitProfile
  ).forEach((ability) => picked.push(ability));

  if (picked.length < 3) {
    shuffleRows(pool).forEach((ability) => {
      if (picked.length >= 3) return;
      if (picked.some((entry) => entry.id === ability.id)) return;
      picked.push(ability);
    });
  }

  return picked.map((ability) => ({
    ...hydrateDepthsAbilityChoice(ability, roomNumber, chosenAbilities),
    awakeningTags: ability.awakeningTags || [],
    rewardTags: ability.rewardTags || [],
    traitAwakening: getTraitAwakeningLabel(ability, traitProfile),
  }));
}

function summarizeDepthsAbility(ability, roomNumber) {
  return {
    id: ability.id,
    name: ability.name,
    school: ability.school,
    imageSrc: ability.imageSrc || "",
    level: ability.level || 1,
    maxLevel: ability.maxLevel || 1,
    description: ability.description,
    room: roomNumber,
    statBonuses: ability.statBonuses || {},
    moveAccuracy: ability.moveAccuracy || {},
    battleOnly: ability.battleOnly || [],
    depthsAbilityMeta: ability.depthsAbilityMeta || {},
    awakeningTags: ability.awakeningTags || [],
    rewardTags: ability.rewardTags || [],
    traitAwakening: ability.traitAwakening || "",
  };
}

function formatSignedAmount(value) {
  const n = finiteNumber(value, 0);
  return `${n >= 0 ? "+" : ""}${n}`;
}

function formatDepthsNumber(value) {
  const n = finiteNumber(value, 0);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function getDepthsChampionLevelInfo(value) {
  const xp = Math.max(0, Math.floor(finiteNumber(value, 0)));
  let level = 1;
  let nextLvl = 100;
  let prevLvl = 0;

  while (xp >= nextLvl) {
    prevLvl = nextLvl;
    nextLvl = nextLvl + 200 * level + 100;
    level += 1;
  }

  return {
    xp,
    level,
    prevLvl,
    nextLvl,
    progress: clampNumber(((xp - prevLvl) / (nextLvl - prevLvl)) * 100, 0, 100),
  };
}

function formatAbilityAdditions(ability) {
  const rows = [];
  Object.entries(ability.statBonuses || {}).forEach(([key, value]) => {
    rows.push(formatDepthsStatBonus(key, value));
  });
  Object.entries(ability.moveAccuracy || {}).forEach(([key, value]) => {
    rows.push(formatDepthsMoveAccuracy(key, value));
  });
  (ability.battleOnly || []).forEach((entry) => {
    rows.push(describeDepthsBattleOnly(entry, { concise: true }));
  });

  rows.push(...describeDepthsAbilityMeta(ability.depthsAbilityMeta || {}, { concise: true }));

  return rows;
}

function mergeNumberMaps(base = {}, incoming = {}) {
  const next = { ...(base || {}) };
  Object.entries(incoming || {}).forEach(([key, value]) => {
    next[key] = finiteNumber(next[key], 0) + finiteNumber(value, 0);
  });
  return next;
}

function buildDepthsAbilityRuntime(abilities = []) {
  const statBonuses = {};
  const moveAccuracy = {};
  const battleOnly = [];
  const depthsAbilityMeta = {
    lifeStealPct: 0,
    lowHpDamage: null,
    secondWind: null,
  };

  abilities.forEach((ability) => {
    Object.assign(statBonuses, mergeNumberMaps(statBonuses, ability.statBonuses || {}));
    Object.assign(moveAccuracy, mergeNumberMaps(moveAccuracy, ability.moveAccuracy || {}));
    (ability.battleOnly || []).forEach((entry) => {
      battleOnly.push({
        ...entry,
        sourceName: ability.name,
        sourceAbilityId: ability.id,
      });
    });

    const meta = ability.depthsAbilityMeta || {};
    depthsAbilityMeta.lifeStealPct += finiteNumber(meta.lifeStealPct, 0);
    if (meta.lowHpDamage) {
      const current = depthsAbilityMeta.lowHpDamage;
      depthsAbilityMeta.lowHpDamage = {
        thresholdPct: Math.max(
          finiteNumber(current?.thresholdPct, 0),
          finiteNumber(meta.lowHpDamage.thresholdPct, 0)
        ),
        flatDamage:
          finiteNumber(current?.flatDamage, 0) + finiteNumber(meta.lowHpDamage.flatDamage, 0),
      };
    }
    if (meta.secondWind) {
      const current = depthsAbilityMeta.secondWind;
      depthsAbilityMeta.secondWind = {
        thresholdPct: Math.max(
          finiteNumber(current?.thresholdPct, 0),
          finiteNumber(meta.secondWind.thresholdPct, 0)
        ),
        healPct: finiteNumber(current?.healPct, 0) + finiteNumber(meta.secondWind.healPct, 0),
        shield: finiteNumber(current?.shield, 0) + finiteNumber(meta.secondWind.shield, 0),
      };
    }
  });

  return { statBonuses, moveAccuracy, battleOnly, depthsAbilityMeta };
}

function mergeDepthsAbilityRuntimeMeta(base = {}, incoming = {}) {
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

function buildDepthsRunRuntime(artifacts = []) {
  const artifactRuntime = buildDepthsArtifactRuntime(artifacts);

  return {
    statBonuses: artifactRuntime.statBonuses || {},
    moveAccuracy: artifactRuntime.moveAccuracy || {},
    battleOnly: [...(artifactRuntime.battleOnly || [])],
    depthsAbilityMeta: mergeDepthsAbilityRuntimeMeta({}, artifactRuntime.depthsAbilityMeta || {}),
    artifactMeta: artifactRuntime.artifactMeta || {},
  };
}

function getDepthsRemovalCountMap(cardRemovals = []) {
  const counts = {};
  (cardRemovals || []).forEach((removal) => {
    const key = removal?.moveFamilyKey || removal?.moveKey || removal?.cardId || removal?.id || "";
    if (!key) return;
    counts[key] = finiteNumber(counts[key], 0) + Math.max(1, finiteNumber(removal.removedCopies, 1));
  });
  return counts;
}

function applyDepthsCardRemovalsToCharObj(charObj = {}, cardRemovals = []) {
  const next = JSON.parse(JSON.stringify(charObj || {}));
  const removalCounts = getDepthsRemovalCountMap(cardRemovals);
  const moves = Array.isArray(next.moves) ? next.moves : [];
  const runCards = Array.isArray(next.depthsRunCards) ? next.depthsRunCards : [];
  const runCardMoves = runCards.map((card) => card?.move || card || {});
  const allMoves = [...moves, ...runCardMoves];

  allMoves.forEach((move, index) => {
    const familyKey = getDepthsCardUpgradeFamilyKey(move, index);
    const moveKey = getDepthsCardUpgradeMoveKey(move, index);
    const removedCopies =
      finiteNumber(removalCounts[familyKey], 0) +
      finiteNumber(removalCounts[moveKey], 0) +
      finiteNumber(removalCounts[move?.depthsCardId], 0);
    const baseCopies = move.depthsCardSource === "firebase" ? 1 : 2;
    const currentCopies = Math.max(
      0,
      Math.round(finiteNumber(move.deckCopies, baseCopies)) - removedCopies
    );
    const updatedMove = {
      ...move,
      deckCopies: currentCopies,
    };

    if (index < moves.length) {
      moves[index] = updatedMove;
    } else {
      const cardIndex = index - moves.length;
      runCards[cardIndex] = {
        ...(runCards[cardIndex] || {}),
        deckCopies: currentCopies,
        move: updatedMove,
      };
    }
  });

  next.moves = moves;
  next.depthsRunCards = runCards;
  next.depthsCardRemovals = cardRemovals || [];
  return next;
}

function applyDepthsRunBonusesToChampion(record, artifacts = [], cardUpgrades = [], cards = [], cardRemovals = []) {
  if (!record?.charObj) return record;

  const runtime = buildDepthsRunRuntime(artifacts);
  const baseCharObj = JSON.parse(JSON.stringify(record.charObj || {}));
  baseCharObj.depthsRunCards = cards;
  const upgradedCharObj = applyDepthsCardUpgradesToCharObj(baseCharObj, cardUpgrades);
  const charObj = applyDepthsCardRemovalsToCharObj(upgradedCharObj, cardRemovals);
  charObj.statBonuses = mergeNumberMaps(charObj.statBonuses || {}, runtime.statBonuses);
  charObj.gainedEffectsMeta = {
    ...(charObj.gainedEffectsMeta || {}),
    moveAccuracy: mergeNumberMaps(charObj.gainedEffectsMeta?.moveAccuracy || {}, runtime.moveAccuracy),
    battleOnly: [
      ...((charObj.gainedEffectsMeta && Array.isArray(charObj.gainedEffectsMeta.battleOnly))
        ? charObj.gainedEffectsMeta.battleOnly
        : []),
      ...runtime.battleOnly,
    ],
  };
  charObj.depthsRunArtifacts = artifacts;
  charObj.depthsCardUpgrades = cardUpgrades;
  charObj.depthsCardRemovals = cardRemovals;
  charObj.depthsAbilityMeta = runtime.depthsAbilityMeta;
  charObj.depthsArtifactMeta = runtime.artifactMeta;

  return {
    ...record,
    charObj,
    depthsRun: {
      artifacts,
      cards,
      cardUpgrades,
      cardRemovals,
      statBonuses: runtime.statBonuses,
      moveAccuracy: runtime.moveAccuracy,
      battleOnly: runtime.battleOnly,
      depthsAbilityMeta: runtime.depthsAbilityMeta,
      artifactMeta: runtime.artifactMeta,
    },
  };
}

const MONSTER_TIER_CONFIG = {
  weak: {
    label: "Weak",
    statFactor: 0.68,
    healthFactor: 0.72,
    moveFactor: 0.7,
    effectFactor: 0.75,
    visualScale: 0.84,
  },
  medium: {
    label: "Medium",
    statFactor: 1,
    healthFactor: 1,
    moveFactor: 1,
    effectFactor: 1,
    visualScale: 1,
  },
  large: {
    label: "Large",
    statFactor: 1.22,
    healthFactor: 1.36,
    moveFactor: 1.18,
    effectFactor: 1.12,
    visualScale: 1.24,
  },
  boss: {
    label: "Boss",
    statFactor: 1.42,
    healthFactor: 1.68,
    moveFactor: 1.32,
    effectFactor: 1.22,
    visualScale: 1.42,
  },
};

const GROUP_DIFFICULTY_FACTORS = {
  1: { stat: 1, health: 1, move: 1 },
  2: { stat: 0.84, health: 0.88, move: 0.86 },
  3: { stat: 0.68, health: 0.74, move: 0.72 },
  4: { stat: 0.56, health: 0.6, move: 0.62 },
};
const MONSTER_GLOBAL_STRENGTH_FACTOR = 0.5;

function makeEncounterFormation(name, tiers, weight = 1) {
  return { name, tiers, count: tiers.length, weight };
}

function pickEncounterFormation(roomNumber) {
  if (roomNumber <= 1) {
    return makeEncounterFormation("First Steps", ["weak"]);
  }

  if (roomNumber % 5 === 0) {
    return makeEncounterFormation("Boss Chamber", ["boss"]);
  }

  if (roomNumber === 2) {
    return pickWeightedEntry([
      makeEncounterFormation("Medium Duel", ["medium"], 52),
      makeEncounterFormation("Weak Pair", ["weak", "weak"], 48),
    ]);
  }

  if (roomNumber <= 4) {
    return pickWeightedEntry([
      makeEncounterFormation("Lone Weakling", ["weak"], 18),
      makeEncounterFormation("Medium Duel", ["medium"], 26),
      makeEncounterFormation("Weak Pair", ["weak", "weak"], 24),
      makeEncounterFormation("Weak Mob", ["weak", "weak", "weak"], 18),
      makeEncounterFormation("Large Brute", ["large"], 14),
    ]);
  }

  if (roomNumber <= 8) {
    return pickWeightedEntry([
      makeEncounterFormation("Medium Duel", ["medium"], 20),
      makeEncounterFormation("Weak Pair", ["weak", "weak"], 18),
      makeEncounterFormation("Weak Mob", ["weak", "weak", "weak"], 20),
      makeEncounterFormation("Mixed Ambush", ["medium", "weak"], 16),
      makeEncounterFormation("Large Brute", ["large"], 20),
      makeEncounterFormation("Weak Swarm", ["weak", "weak", "weak", "weak"], 6),
    ]);
  }

  if (roomNumber <= 12) {
    return pickWeightedEntry([
      makeEncounterFormation("Scaled Weakling", ["weak"], 8),
      makeEncounterFormation("Medium Duel", ["medium"], 12),
      makeEncounterFormation("Weak Pair", ["weak", "weak"], 14),
      makeEncounterFormation("Weak Mob", ["weak", "weak", "weak"], 18),
      makeEncounterFormation("Mixed Ambush", ["medium", "weak"], 15),
      makeEncounterFormation("Large Brute", ["large"], 20),
      makeEncounterFormation("Weak Swarm", ["weak", "weak", "weak", "weak"], 9),
      makeEncounterFormation("Twin Mediums", ["medium", "medium"], 4),
    ]);
  }

  return pickWeightedEntry([
    makeEncounterFormation("Scaled Weakling", ["weak"], 7),
    makeEncounterFormation("Medium Duel", ["medium"], 10),
    makeEncounterFormation("Weak Pair", ["weak", "weak"], 12),
    makeEncounterFormation("Weak Mob", ["weak", "weak", "weak"], 16),
    makeEncounterFormation("Mixed Ambush", ["medium", "weak"], 15),
    makeEncounterFormation("Large Brute", ["large"], 22),
    makeEncounterFormation("Weak Swarm", ["weak", "weak", "weak", "weak"], 12),
    makeEncounterFormation("Twin Mediums", ["medium", "medium"], 4),
    makeEncounterFormation("Brute Guard", ["large", "weak"], 2),
  ]);
}

function getMonsterRoomScalingFactors(roomNumber, tierKey = "medium", encounterCount = 1) {
  const room = Math.max(1, Math.floor(finiteNumber(roomNumber, 1)));
  const tier = MONSTER_TIER_CONFIG[tierKey] || MONSTER_TIER_CONFIG.medium;
  const groupFactors = GROUP_DIFFICULTY_FACTORS[encounterCount] || GROUP_DIFFICULTY_FACTORS[4];
  const depth = Math.max(0, room - 1);
  const milestoneGrowth = Math.floor(depth / 4) * 0.05 + Math.floor(depth / 10) * 0.05;
  const bossGrowth = tierKey === "boss" ? 0.08 + Math.floor(room / 10) * 0.06 : 0;
  const roomStatGrowth = 1 + depth * 0.105 + milestoneGrowth + bossGrowth;
  const roomHealthGrowth = 1 + depth * 0.13 + Math.floor(depth / 4) * 0.06 + Math.floor(depth / 10) * 0.06 + bossGrowth;
  const moveGrowth = 1 + depth * 0.075 + Math.floor(depth / 5) * 0.045 + bossGrowth;
  const effectGrowth = 1 + depth * 0.045 + Math.floor(depth / 5) * 0.035 + bossGrowth * 0.5;
  const speedGrowth = 1;

  return {
    room,
    depth,
    tier,
    tierKey,
    encounterCount,
    groupFactors,
    baseStrengthFactor: MONSTER_GLOBAL_STRENGTH_FACTOR,
    roomStatGrowth,
    roomHealthGrowth,
    moveGrowth,
    effectGrowth,
    speedGrowth,
    statMultiplier: roomStatGrowth * groupFactors.stat * tier.statFactor * MONSTER_GLOBAL_STRENGTH_FACTOR,
    healthMultiplier: roomHealthGrowth * groupFactors.health * tier.healthFactor * MONSTER_GLOBAL_STRENGTH_FACTOR,
    speedMultiplier: 1,
    moveMultiplier: moveGrowth * groupFactors.move * tier.moveFactor * MONSTER_GLOBAL_STRENGTH_FACTOR,
    effectMultiplier: effectGrowth * tier.effectFactor * MONSTER_GLOBAL_STRENGTH_FACTOR,
    bossGrowth,
  };
}

function getDepthsEncounterScalingPreview(roomNumber) {
  return getMonsterRoomScalingFactors(roomNumber, "medium", 1);
}

function scaleMonsterForRoom(monster, roomNumber, formation, index) {
  const clone = JSON.parse(JSON.stringify(monster || {}));
  const encounterCount = Math.max(1, formation?.count || formation?.tiers?.length || 1);
  const tierKey = formation?.tiers?.[index] || "medium";
  const scaling = getMonsterRoomScalingFactors(roomNumber, tierKey, encounterCount);
  const tier = scaling.tier;

  DEPTHS_STAT_KEYS.forEach((key) => {
    const raw = clone.baseStats?.[key] ?? clone[key];
    if (typeof raw === "undefined" || raw === null) return;
    const multiplier = key === "health"
      ? scaling.healthMultiplier
      : key === "speed"
      ? scaling.speedMultiplier
      : scaling.statMultiplier;
    const scaled = key === "critChance"
      ? clampNumber(
          (finiteNumber(raw, 25) + scaling.depth * 0.65 + scaling.bossGrowth * 12) *
            MONSTER_GLOBAL_STRENGTH_FACTOR,
          0,
          70
        )
      : key === "critDamage"
      ? Math.max(
          100,
          Math.round(
            100 +
              (finiteNumber(raw, 200) - 100 + scaling.depth * 4.5 + scaling.bossGrowth * 40) *
                MONSTER_GLOBAL_STRENGTH_FACTOR
          )
        )
      : Math.max(1, Math.round(finiteNumber(raw, 0) * multiplier));

    clone[key] = scaled;
    clone.baseStats = { ...(clone.baseStats || {}), [key]: scaled };
  });

  DEPTHS_EFFECT_KEYS.forEach((key) => {
    if (typeof clone[key] === "undefined" || clone[key] === null) return;
    clone[key] = Math.max(1, Math.floor(finiteNumber(clone[key], 0) * scaling.effectMultiplier));
  });

  clone.moves = Array.isArray(clone.moves)
    ? clone.moves.map((move) => {
        const nextMove = { ...move };
        if (typeof nextMove.power !== "undefined") {
          nextMove.power = Math.max(1, Math.round(finiteNumber(nextMove.power, 0) * scaling.moveMultiplier));
        }
        const potency = nextMove.effect_potency_base ?? nextMove.effect_potency;
        if (typeof potency !== "undefined" && potency !== null) {
          nextMove.effect_potency_base = Math.max(1, Math.floor(finiteNumber(potency, 0) * scaling.effectMultiplier));
        }
        return nextMove;
      })
    : clone.moves;

  clone._depthsScaling = {
    room: roomNumber,
    formation: formation?.name || "Encounter",
    tier: tierKey,
    tierLabel: tier.label,
    encounterCount,
    encounterIndex: index,
    baseStrengthFactor: MONSTER_GLOBAL_STRENGTH_FACTOR,
    statMultiplier: Number(scaling.statMultiplier.toFixed(3)),
    healthMultiplier: Number(scaling.healthMultiplier.toFixed(3)),
    speedMultiplier: Number(scaling.speedMultiplier.toFixed(3)),
    moveMultiplier: Number(scaling.moveMultiplier.toFixed(3)),
    effectMultiplier: Number(scaling.effectMultiplier.toFixed(3)),
    roomStatGrowth: Number(scaling.roomStatGrowth.toFixed(3)),
    roomHealthGrowth: Number(scaling.roomHealthGrowth.toFixed(3)),
    moveGrowth: Number(scaling.moveGrowth.toFixed(3)),
    effectGrowth: Number(scaling.effectGrowth.toFixed(3)),
    visualScale: Number(tier.visualScale.toFixed(2)),
  };

  return clone;
}

const DEPTHS_MAP_NODE_CONFIG = {
  start: { label: "Start", color: THEME.text, icon: "/arena/depths/nodes/start.svg" },
  basic: {
    label: "Encounter",
    color: THEME.gold,
    icon: "/arena/depths/nodes/basic.svg",
    description: "A scaling monster fight.",
    reward: "Win to choose one new card for your deck, or skip adding a card.",
  },
  elite: {
    label: "Elite",
    color: THEME.bad,
    icon: "/arena/depths/nodes/elite.svg",
    description: "A harder fight against a larger threat.",
    reward: "Win to upgrade one card. Elite encounters do not award new cards or artifacts.",
  },
  rest: {
    label: "Rest",
    color: THEME.good,
    icon: "/arena/depths/nodes/rest.svg",
    description: "A recovery node.",
    reward: "Heal your champion before choosing the next connected path.",
  },
  chest: {
    label: "Chest",
    color: "#7fc7ff",
    icon: "/arena/depths/nodes/chest.svg",
    description: "A reward cache.",
    reward: "Choose one of three artifacts to add to the run. Artifacts stack for the whole run.",
  },
  quest: {
    label: "Quest",
    color: "#c69cff",
    icon: "/arena/depths/nodes/quest.svg",
    description: "A risky Depths event with multiple choices.",
    reward: "Choose a quest option. Outcomes can heal, harm, upgrade cards, add cards, remove cards, grant relics, or curse the run.",
  },
};

function pickDepthsMapNodeType(depth, finalDepth) {
  if (depth >= finalDepth) return "elite";
  if (depth <= 1) return "basic";

  const roll = Math.random();
  if (depth % 4 === 0 && roll < 0.28) return "rest";
  if (roll < 0.13) return "elite";
  if (roll < 0.25) return "chest";
  if (roll < 0.39) return "quest";
  if (roll < 0.5) return "rest";
  return "basic";
}

function pickDepthsMapNodeFallbackType(depth, finalDepth, disallowedTypes = []) {
  if (depth >= finalDepth) return "elite";

  const disallowed = new Set(disallowedTypes);
  const options = ["basic", "elite", "chest", "rest", "quest"].filter((type) => !disallowed.has(type));
  const weightedOptions = options.flatMap((type) => {
    if (type === "basic") return [type, type, type, type, type, type];
    if (type === "elite") return [type, type];
    if (type === "quest") return [type, type, type];
    return [type, type, type];
  });

  return weightedOptions[Math.floor(Math.random() * weightedOptions.length)] || "basic";
}

function createDepthsMapNode(id, type, depth, lane, laneY, finalDepth) {
  const jitterY = depth <= 0 || depth >= finalDepth ? 0 : (Math.random() - 0.5) * 4;
  const jitterX = depth <= 0 || depth >= finalDepth ? 0 : (Math.random() - 0.5) * 1.4;
  return {
    id,
    type,
    depth,
    lane,
    x: clampNumber(depth <= 0 ? 6 : 10 + (depth / finalDepth) * 84 + jitterX, 6, 94),
    y: clampNumber(laneY + jitterY, 10, 90),
    links: [],
  };
}

function normalizeDepthsMapUtilityRuns(layers, finalDepth) {
  for (let depth = 1; depth < layers.length; depth += 1) {
    const current = layers[depth];
    const previous = layers[depth - 1];

    current.forEach((node) => {
      if (node.type !== "rest" && node.type !== "chest") return;

      const incomingTypes = previous
        .filter((source) => (source.links || []).includes(node.id))
        .map((source) => source.type);

      if (!incomingTypes.includes(node.type)) return;

      const disallowedTypes = incomingTypes.filter((type) => type === "rest" || type === "chest");
      node.type = pickDepthsMapNodeFallbackType(node.depth, finalDepth, disallowedTypes);
    });
  }
}

function generateDepthsMap() {
  const finalDepth = 8 + Math.floor(Math.random() * 4);
  const laneCount = 3 + Math.floor(Math.random() * 2);
  const laneYs = laneCount === 3 ? [24, 50, 76] : [18, 39, 61, 82];
  const centerLane = Math.floor(laneCount / 2);
  const layers = [
    [createDepthsMapNode("start", "start", 0, centerLane, 50, finalDepth)],
  ];

  for (let depth = 1; depth <= finalDepth; depth += 1) {
    const layer =
      depth === finalDepth
        ? [createDepthsMapNode(`d${depth}n0`, "elite", depth, centerLane, 50, finalDepth)]
        : laneYs
            .map((laneY, lane) => {
              const keepNode =
                depth <= 2 ||
                lane === centerLane ||
                Math.random() < (depth % 3 === 0 ? 0.9 : 0.72);
              if (!keepNode) return null;
              return createDepthsMapNode(
                `d${depth}l${lane}`,
                pickDepthsMapNodeType(depth, finalDepth),
                depth,
                lane,
                laneY,
                finalDepth
              );
            })
            .filter(Boolean);

    while (layer.length < Math.min(2, laneCount)) {
      const missingLane = laneYs.findIndex(
        (_laneY, lane) => !layer.some((node) => node.lane === lane)
      );
      const lane = missingLane >= 0 ? missingLane : centerLane;
      layer.push(
        createDepthsMapNode(
          `d${depth}l${lane}b${layer.length}`,
          pickDepthsMapNodeType(depth, finalDepth),
          depth,
          lane,
          laneYs[lane],
          finalDepth
        )
      );
    }

    layer.sort((a, b) => a.lane - b.lane);
    layers.push(layer);
  }

  for (let depth = 0; depth < layers.length - 1; depth += 1) {
    const current = layers[depth];
    const next = layers[depth + 1];

    current.forEach((node) => {
      const sameLaneTarget =
        next.find((entry) => entry.lane === node.lane) ||
        [...next].sort((a, b) => Math.abs(a.lane - node.lane) - Math.abs(b.lane - node.lane))[0];
      const links = sameLaneTarget ? [sameLaneTarget.id] : [];
      const adjacentTargets = next.filter(
        (entry) => entry.id !== sameLaneTarget?.id && Math.abs(entry.lane - node.lane) === 1
      );

      if (adjacentTargets.length && Math.random() < (depth <= 1 ? 0.58 : 0.34)) {
        const branch = adjacentTargets[Math.floor(Math.random() * adjacentTargets.length)];
        links.push(branch.id);
      }

      node.links = [...new Set(links)];
    });

    next.forEach((node) => {
      const hasIncoming = current.some((entry) => entry.links.includes(node.id));
      if (!hasIncoming) {
        const source =
          [...current].sort(
            (a, b) => Math.abs(a.lane - node.lane) - Math.abs(b.lane - node.lane)
          )[0] || current[0];
        source.links = [...new Set([...(source.links || []), node.id])];
      }
    });
  }

  normalizeDepthsMapUtilityRuns(layers, finalDepth);

  const nodes = layers.flat();
  return {
    id: `map-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    finalDepth,
    laneCount,
    nodes,
  };
}

function getDepthsMapNode(map, nodeId) {
  return (map?.nodes || []).find((node) => node.id === nodeId) || null;
}

function getConnectedDepthsMapNodes(map, currentNodeId, visitedNodeIds = []) {
  const current = getDepthsMapNode(map, currentNodeId);
  const visited = new Set(visitedNodeIds);
  return (current?.links || [])
    .map((nodeId) => getDepthsMapNode(map, nodeId))
    .filter((node) => node && !visited.has(node.id));
}

function isDepthsFinalNode(map, nodeId) {
  const node = getDepthsMapNode(map, nodeId);
  return Boolean(map && node && Number(node.depth || 0) >= Number(map.finalDepth || 0));
}

function getDepthsCompletedBattleNodeCount(map, visitedNodeIds = []) {
  const visited = new Set(Array.isArray(visitedNodeIds) ? visitedNodeIds : []);
  return (map?.nodes || []).filter(
    (node) => visited.has(node.id) && (node.type === "basic" || node.type === "elite")
  ).length;
}

function getDepthsBattleNodesForXp(map, visitedNodeIds = []) {
  const visited = new Set(Array.isArray(visitedNodeIds) ? visitedNodeIds : []);
  return (map?.nodes || [])
    .filter((node) => visited.has(node.id) && (node.type === "basic" || node.type === "elite"))
    .sort((a, b) => {
      const depthA = Number(a?.depth || 0);
      const depthB = Number(b?.depth || 0);
      if (depthA !== depthB) return depthA - depthB;
      return String(a?.id || "").localeCompare(String(b?.id || ""));
    });
}

function getDepthsXpBreakdownFromResult(result = {}) {
  const completedEncounters =
    Math.max(
      0,
      Math.round(
        finiteNumber(
          result.completedEncounters,
          getDepthsCompletedBattleNodeCount(result.depthsMap, result.visitedNodeIds)
        )
      )
    ) || 0;
  const completedBattleNodes = getDepthsBattleNodesForXp(result.depthsMap, result.visitedNodeIds).slice(
    0,
    completedEncounters
  );
  const eliteEncounters = completedBattleNodes.filter((node) => node.type === "elite").length;
  const knownBattleNodes = completedBattleNodes.length;
  const regularEncounters = Math.max(
    0,
    completedBattleNodes.filter((node) => node.type === "basic").length + Math.max(0, completedEncounters - knownBattleNodes)
  );
  const regularEncounterXp = regularEncounters * DEPTHS_REGULAR_ENCOUNTER_XP;
  const eliteEncounterXp = eliteEncounters * DEPTHS_ELITE_ENCOUNTER_XP;
  const completionBonusXp = result.completed ? DEPTHS_COMPLETION_BONUS_XP : 0;
  const totalXp = regularEncounterXp + eliteEncounterXp + completionBonusXp;

  return {
    regularEncounters,
    eliteEncounters,
    regularEncounterXp,
    eliteEncounterXp,
    completionBonusXp,
    totalXp,
    completedEncounters: regularEncounters + eliteEncounters,
    regularEncounterXpEach: DEPTHS_REGULAR_ENCOUNTER_XP,
    eliteEncounterXpEach: DEPTHS_ELITE_ENCOUNTER_XP,
    completionBonusXpEach: DEPTHS_COMPLETION_BONUS_XP,
  };
}

function getDepthsActiveRunNode(run = {}) {
  return getDepthsMapNode(run.depthsMap, run.currentNodeId) || null;
}

function getDepthsActiveRunProgress(run = {}) {
  const node = getDepthsActiveRunNode(run);
  const completedBattles = getDepthsCompletedBattleNodeCount(run.depthsMap, run.visitedNodeIds);
  const roomNumber = Math.max(1, Math.floor(Number(run.room || completedBattles + 1 || 1)));
  const nodeLabel = DEPTHS_MAP_NODE_CONFIG[node?.type]?.label || "The Depths";
  const status = String(run.status || "");
  const monsterNames = normalizeArray(run.currentMonsters)
    .map((monster) => monster?.name || monster?.displayName || monster?.id)
    .filter(Boolean)
    .slice(0, 3);

  if (status === "active") {
    const enemies = monsterNames.length ? ` fighting ${monsterNames.join(", ")}` : " in battle";
    return `Encounter ${roomNumber}${enemies}.`;
  }
  if (status === "choosingLoadout") return "Choosing the starting artifact and card.";
  if (status === "map") {
    return completedBattles
      ? `Map open after ${completedBattles} completed encounter${completedBattles === 1 ? "" : "s"}.`
      : "Map open at the start of the run.";
  }
  if (status === "choosingCard") return `Choosing a card reward after ${nodeLabel}.`;
  if (status === "choosingArtifact") return `Choosing an artifact reward after ${nodeLabel}.`;
  if (status === "choosingCardUpgrade") return `Choosing a card upgrade after ${nodeLabel}.`;
  if (status === "removingCard") return "Choosing a card to remove from the deck.";
  if (status === "quest") return `Resolving a ${nodeLabel} event.`;
  if (status === "questResolved" || status === "questRewardPending") return `Quest reward pending in ${nodeLabel}.`;
  if (status === "nodeReward" || status === "roomCleared") return `${nodeLabel} cleared. Reward pending.`;
  return `${nodeLabel} run in progress.`;
}

function pickBasicDepthsFormation(roomNumber) {
  if (roomNumber <= 1) return makeEncounterFormation("First Steps", ["weak"]);
  return pickWeightedEntry([
    makeEncounterFormation("Lone Weakling", ["weak"], 18),
    makeEncounterFormation("Medium Duel", ["medium"], 18),
    makeEncounterFormation("Weak Pair", ["weak", "weak"], 24),
    makeEncounterFormation("Mixed Ambush", ["medium", "weak"], 14),
    makeEncounterFormation("Weak Mob", ["weak", "weak", "weak"], 18),
    makeEncounterFormation("Weak Swarm", ["weak", "weak", "weak", "weak"], 8),
  ]);
}

function getEncounterFormationForMapNode(node, roomNumber) {
  if (node?.type === "elite") return makeEncounterFormation("Elite Encounter", ["large"]);
  return pickBasicDepthsFormation(roomNumber);
}

function getDepthsCharStatBonus(charObj, statKey) {
  return (
    finiteNumber(charObj?.traitStatBonuses?.[statKey], 0) +
    finiteNumber(charObj?.skillStatBonuses?.[statKey], 0) +
    finiteNumber(charObj?.statBonuses?.[statKey], 0)
  );
}

function getDepthsChampionMaxHpFromCharObj(charObj = {}) {
  const strength = finiteNumber(charObj.strength, 0) + getDepthsCharStatBonus(charObj, "strength");
  const baseHealth =
    charObj?.baseStats?.health ??
    charObj?.baseHealth ??
    charObj?.health ??
    200;
  return Math.max(
    1,
    Math.round(finiteNumber(baseHealth, 200) + getDepthsCharStatBonus(charObj, "health") + strength * 2)
  );
}

function setDepthsChampionCurrentHp(record, hpValue) {
  if (!record?.charObj) return record;
  const charObj = JSON.parse(JSON.stringify(record.charObj));
  const maxHp = getDepthsChampionMaxHpFromCharObj(charObj);
  charObj.depthsCurrentHp = clampNumber(Math.round(finiteNumber(hpValue, maxHp)), 1, maxHp);
  return { ...record, charObj };
}

function getDepthsChampionCurrentHp(record) {
  const maxHp = getDepthsChampionMaxHpFromCharObj(record?.charObj || {});
  return clampNumber(Math.round(finiteNumber(record?.charObj?.depthsCurrentHp, maxHp)), 1, maxHp);
}

function applyDepthsRunBonusesPreservingHp(
  baseRecord,
  artifacts,
  cardUpgrades,
  cards,
  cardRemovals,
  previousRecord,
  options = {}
) {
  const preservePreviousHp = options.preservePreviousHp !== false;
  const previousHp =
    preservePreviousHp && previousRecord?.charObj
      ? getDepthsChampionCurrentHp(previousRecord)
      : null;
  const next = applyDepthsRunBonusesToChampion(baseRecord, artifacts, cardUpgrades, cards, cardRemovals);
  if (!next?.charObj) return next;
  const maxHp = getDepthsChampionMaxHpFromCharObj(next.charObj);
  const hp = previousHp === null ? maxHp : clampNumber(previousHp, 1, maxHp);
  next.charObj.depthsCurrentHp = hp;
  return next;
}

function healDepthsChampion(record, healPct = 0.35) {
  if (!record?.charObj) return { record, healed: 0, currentHp: 0, maxHp: 0 };
  const currentHp = getDepthsChampionCurrentHp(record);
  const maxHp = getDepthsChampionMaxHpFromCharObj(record.charObj);
  const healAmount = Math.max(1, Math.round(maxHp * healPct));
  const nextHp = Math.min(maxHp, currentHp + healAmount);
  return {
    record: setDepthsChampionCurrentHp(record, nextHp),
    healed: nextHp - currentHp,
    currentHp: nextHp,
    maxHp,
  };
}

function normalizeArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.assets)) return payload.assets;
  if (Array.isArray(payload?.wallet)) return payload.wallet;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function getWarriorAsset(warrior) {
  return warrior?.asset || warrior?.nft || warrior;
}

function getWarriorAssetId(warrior) {
  const asset = getWarriorAsset(warrior);
  return asset?.index ?? asset?.assetId ?? asset?.asset_id ?? warrior?.assetId ?? warrior?.id ?? null;
}

function isDarkCoinChampion(warrior) {
  if (warrior?.asset?.params?.creator === CHAMPION_CREATOR) return true;

  const asset = getWarriorAsset(warrior);
  const params = asset?.params || warrior?.params || {};
  return params?.creator === CHAMPION_CREATOR;
}

function getCharObjectFromGetNftSession(session) {
  const raw = session?.charObject;
  if (!raw || raw === "none") return null;
  if (raw?.charObj) return raw.charObj;
  if (raw?.data?.charObj) return raw.data.charObj;
  if (raw?.data) return raw.data;
  return raw;
}

function getNftImageUrl(session) {
  return assetImageUrl(session?.nft?.assets?.[0]?.params) || null;
}

function normalizeMonsterDoc(data, docId) {
  const monsterObj =
    data?.monsterObj && typeof data.monsterObj === "object" ? data.monsterObj : data || {};
  const preview =
    data?.monsterPreview && typeof data.monsterPreview === "object" ? data.monsterPreview : {};

  return {
    ...monsterObj,
    docId,
    id: monsterObj?.id || data?.id || docId,
    monsterId: monsterObj?.monsterId || data?.monsterId || docId,
    depthsWorlds: normalizeDepthsMonsterWorlds(
      data?.depthsWorlds ||
        monsterObj?.depthsWorlds ||
        data?.depthsEncounterWorlds ||
        monsterObj?.depthsEncounterWorlds ||
        data?.availableDepthsWorlds ||
        monsterObj?.availableDepthsWorlds ||
        []
    ),
    status: data?.status || monsterObj?.status || "",
    progress: data?.progress ?? monsterObj?.progress ?? null,
    name: monsterObj?.name || preview?.name || docId,
    monsterType: monsterObj?.monsterType || preview?.monsterType || "Monster",
    description: monsterObj?.description || preview?.description || "",
    completedAt: data?.completedAt || monsterObj?.completedAt || null,
    updatedAt: data?.updatedAt || monsterObj?.updatedAt || null,
  };
}

function normalizeDepthsCardEffect(effect = {}) {
  const effectKey = String(effect.effect || effect.effect_name || "").toLowerCase();
  if (!effectKey) return null;

  return {
    effect: effectKey,
    amount: Math.max(0, finiteNumber(effect.amount ?? effect.effectAmount, 0)),
    target: effect.target || "enemy",
  };
}

function getDepthsCardRarityWeight(rarity = "") {
  const key = String(rarity || "").toLowerCase();
  if (key === "common") return 1;
  if (key === "uncommon") return 0.22;
  if (key === "rare") return 0.05;
  return 1;
}

function normalizeDepthsCardRarity(value = "") {
  const key = String(value || "").toLowerCase();
  return ["common", "uncommon", "rare"].includes(key) ? key : "";
}

const DEPTHS_CARD_EFFECT_RARITY_WEIGHTS = {
  poison: 1,
  bleed: 1,
  burn: 1,
  freeze: 1.15,
  slow: 0.9,
  paralyze: 1.3,
  drown: 1.08,
  doom: 1.35,
  shield: 0.92,
  strengthen: 1.04,
  empower: 1.06,
  hasten: 1.08,
  nurture: 0.9,
  bless: 1.02,
  focus: 1,
  cleanse: 1.12,
};

function isDepthsMultiTargetKey(targetKey = "") {
  return targetKey === "enemies" || targetKey === "allies";
}

function getDepthsCardTargetSpread(card = {}) {
  const targets = [
    getDepthsCardTargetKey(card),
    ...(Array.isArray(card.effects)
      ? card.effects.map((effect) => String(effect?.target || "").toLowerCase())
      : []),
  ];

  if (targets.includes("enemies")) return { key: "enemies", multiplier: 1.34, bonus: 18 };
  if (targets.includes("allies")) return { key: "allies", multiplier: 1.28, bonus: 15 };
  return { key: getDepthsCardTargetKey(card), multiplier: 1, bonus: 0 };
}

function scoreDepthsCardPower(card = {}) {
  const cardClass = getDepthsCardClass(card);
  const power = finiteNumber(card.power, 0);
  const accuracy = finiteNumber(card.accuracy, 75);
  const cooldown = Math.max(0.1, finiteNumber(card.cooldown, 3));
  const effects = Array.isArray(card.effects) ? card.effects : [];
  const targetSpread = getDepthsCardTargetSpread(card);
  const effectTargetMultiplier = targetSpread.multiplier;
  const powerScore = Math.min(34, power * (cardClass === "damage" ? 0.72 : 0.46));
  const effectScore = effects.reduce((sum, effect) => {
    const effectKey = String(effect.effect || effect.effect_name || "").toLowerCase();
    const effectWeight = DEPTHS_CARD_EFFECT_RARITY_WEIGHTS[effectKey] || 1;
    const amount = finiteNumber(effect.amount, 0);
    const effectTarget = String(effect.target || "").toLowerCase();
    const targetMultiplier = isDepthsMultiTargetKey(effectTarget)
      ? Math.max(effectTargetMultiplier, effectTarget === "enemies" ? 1.34 : 1.28)
      : effectTargetMultiplier;
    return sum + Math.min(28, Math.pow(Math.max(0, amount), 0.88) * 2.25 * effectWeight * targetMultiplier);
  }, 0);
  const accuracyScore = clampNumber((accuracy - 70) * 0.38, -8, 12);
  const cooldownScore =
    cooldown <= 1
      ? 20
      : cooldown <= 2
      ? 13
      : cooldown <= 3
      ? 6
      : cooldown <= 4
      ? 1
      : -Math.min(8, (cooldown - 4) * 2);
  const effectCountScore =
    effects.length <= 1 ? 0 : (effects.length - 1) * 8 + (effects.length >= 3 ? 5 : 0);
  const classSynergyScore =
    cardClass === "damage" && power >= 34 && effects.length ? 5 : cardClass !== "damage" && effects.length >= 2 ? 4 : 0;

  return Math.round(
    Math.max(
      0,
      powerScore +
        effectScore +
        accuracyScore +
        cooldownScore +
        effectCountScore +
        targetSpread.bonus +
        classSynergyScore
    ) * 10
  ) / 10;
}

function inferDepthsCardRarity(card = {}) {
  const score = scoreDepthsCardPower(card);
  const effects = Array.isArray(card.effects) ? card.effects : [];
  const targetSpread = getDepthsCardTargetSpread(card);
  const multiTarget = isDepthsMultiTargetKey(targetSpread.key);
  const highEffectCount = effects.length >= 3;

  if (score >= 72 || (multiTarget && score >= 62) || (highEffectCount && score >= 58)) {
    return "rare";
  }
  if (score >= 42 || multiTarget || effects.length >= 2) {
    return "uncommon";
  }
  return "common";
}

function normalizeDepthsCardDoc(data, docId) {
  const cardObj =
    data?.cardObj && typeof data.cardObj === "object" ? data.cardObj : data || {};
  const typeParts = String(cardObj.type || "").split(/\s+/).filter(Boolean);
  const range = cardObj.range || typeParts[0] || "magic";
  const cardClass = cardObj.class || typeParts.slice(1).join(" ") || "damage";
  const type = cardObj.type || [range, cardClass].filter(Boolean).join(" ");
  const effects = Array.isArray(cardObj.effects)
    ? cardObj.effects.map(normalizeDepthsCardEffect).filter(Boolean)
    : [];

  const normalized = {
    ...cardObj,
    docId,
    id: cardObj.id || cardObj.cardId || docId,
    cardId: cardObj.cardId || cardObj.id || docId,
    status: data?.status || cardObj.status || "",
    name: cardObj.name || docId,
    type,
    range,
    class: cardClass,
    power: Math.max(0, finiteNumber(cardObj.power, 0)),
    accuracy: clampNumber(finiteNumber(cardObj.accuracy, 75), 0, 100),
    cooldown: Math.max(0.1, finiteNumber(cardObj.cooldown, 3)),
    effects,
    casterAnimation: cardObj.casterAnimation || {},
    effectAnimation: cardObj.effectAnimation || {},
    completedAt: data?.completedAt || cardObj.completedAt || null,
    updatedAt: data?.updatedAt || cardObj.updatedAt || null,
  };
  const rarity = normalizeDepthsCardRarity(cardObj.rarity) || inferDepthsCardRarity(normalized);

  return {
    ...normalized,
    rarity,
    cardPowerScore: scoreDepthsCardPower(normalized),
  };
}

function getDepthsCardPreviewSrc(card = {}) {
  return (
    card?.casterAnimation?.frameUrls?.[2] ||
    card?.casterAnimation?.frameUrls?.[0] ||
    card?.casterAnimation?.sheetUrl ||
    card?.effectAnimation?.frameUrls?.[0] ||
    card?.effectAnimation?.sheetUrl ||
    ""
  );
}

function getDepthsMoveRange(type = "") {
  const value = String(type || "").toLowerCase();
  if (value.includes("melee")) return "melee";
  if (value.includes("ranged") || value.includes("range")) return "ranged";
  if (value.includes("magic")) return "magic";
  return "";
}

function getDepthsMoveClass(type = "") {
  const value = String(type || "").toLowerCase();
  if (value.includes("buff")) return "buff";
  if (value.includes("curse")) return "curse";
  if (value.includes("damage") || value.includes("strike")) return "damage";
  return "";
}

function getDepthsCardRange(card = {}) {
  return String(card.range || getDepthsMoveRange(card.type) || "magic").toLowerCase();
}

function getDepthsCardClass(card = {}) {
  return String(card.class || getDepthsMoveClass(card.type) || "damage").toLowerCase();
}

function getDepthsScalingStatKeyForRange(range = "") {
  if (range === "melee") return "strength";
  if (range === "ranged") return "dexterity";
  if (range === "magic") return "intelligence";
  return "";
}

function getDepthsStatScalingMultiplier(cardClass = "") {
  return cardClass === "damage" ? 1 : cardClass === "curse" || cardClass === "buff" ? 0.5 : 0;
}

function getDepthsStatScaledBonus(cardClass = "", statValue = 0) {
  const n = finiteNumber(statValue, 0);
  if (cardClass === "damage") return n;
  if (cardClass === "curse" || cardClass === "buff") return Math.floor(n / 2);
  return 0;
}

function getDepthsStatScalingText(cardClass = "", statKey = "") {
  if (!statKey) return "stat scaling";
  const label = formatDepthsAbilityLabel(statKey);
  if (cardClass === "damage") return `adjusted ${label} x1`;
  if (cardClass === "curse" || cardClass === "buff") return `floor(adjusted ${label} / 2)`;
  return label;
}

function getDepthsCardTargetKey(card = {}) {
  const effects = Array.isArray(card.effects) ? card.effects : [];
  const cardClass = getDepthsCardClass(card);
  const fallback = cardClass === "buff" ? "ally" : "enemy";
  const target = String(effects.find((effect) => effect?.target)?.target || fallback).toLowerCase();

  if (target === "enemies") return "enemies";
  if (target === "allies") return "allies";
  if (target === "ally" || target === "self") return "ally";
  return "enemy";
}

function getDepthsCardTargetLabel(card = {}) {
  const target = getDepthsCardTargetKey(card);
  const cardClass = getDepthsCardClass(card);

  if (target === "enemies") return cardClass === "damage" ? "Attacks all enemies" : "Targets all enemies";
  if (target === "allies") return "Targets all allies";
  if (target === "ally") return "Targets one ally";
  return cardClass === "damage" ? "Attacks one enemy" : "Targets one enemy";
}

function getChampionDepthsStats(champion = {}) {
  return getDepthsDisplayStats(champion?.charObj || {});
}

function getChampionEffectPotencyValue(champion = {}, effectKey = "") {
  const charObj = champion?.charObj || {};
  const key = String(effectKey || "").toLowerCase();
  return finiteNumber(
    charObj?.effectPotencies?.[key] ??
      charObj?.itemEffectPotencies?.[key] ??
      charObj?.[key],
    0
  );
}

function getDepthsChampionBuildEffectKeys(champion = {}) {
  return DEPTHS_EFFECT_KEYS.filter(
    (effectKey) => getChampionEffectPotencyValue(champion, effectKey) > 0
  );
}

function getDepthsCardMechanicEffectKeys(card = {}) {
  const keys = new Set();
  const addKey = (value) => {
    const key = String(value || "").toLowerCase().trim();
    if (key && key !== "none") keys.add(key);
  };

  addKey(card.effect);
  addKey(card.effect_name);
  addKey(card.effectKey);
  (Array.isArray(card.effects) ? card.effects : []).forEach((effect) => {
    addKey(effect?.effect);
    addKey(effect?.effect_name);
    addKey(effect?.effectKey);
  });

  return keys;
}

function getDepthsRewardBuildEffectKeys(options = {}) {
  if (Array.isArray(options.buildEffectKeys)) {
    return options.buildEffectKeys.map((key) => String(key || "").toLowerCase()).filter(Boolean);
  }
  return getDepthsChampionBuildEffectKeys(options.champion || options.traitSource || {});
}

function depthsCardMatchesChampionBuild(card = {}, options = {}) {
  const buildEffectKeys = getDepthsRewardBuildEffectKeys(options);
  if (!buildEffectKeys.length) return false;

  const cardEffectKeys = getDepthsCardMechanicEffectKeys(card);
  if (!cardEffectKeys.size) return false;
  return buildEffectKeys.some((effectKey) => cardEffectKeys.has(effectKey));
}

function getChampionArtifactEffectPotencyBonus(champion = {}, effectKey = "") {
  const charObj = champion?.charObj || {};
  const bonuses = charObj?.depthsArtifactMeta?.effectPotencyBonus || {};
  const key = String(effectKey || "").toLowerCase();
  return finiteNumber(bonuses.all, 0) + finiteNumber(bonuses[key], 0);
}

function getChampionEffectPotencyAddOn(champion = {}, effectKey = "", multiplier = 1) {
  const championPotency = getChampionEffectPotencyValue(champion, effectKey);
  const artifactPotency = getChampionArtifactEffectPotencyBonus(champion, effectKey);

  return {
    championPotency,
    artifactPotency,
    total: championPotency * multiplier + artifactPotency,
  };
}

function getChampionDepthsArtifactMeta(champion = {}) {
  return champion?.charObj?.depthsArtifactMeta || {};
}

function applyDepthsPowerPassives(scaledPower, moveClass = "", champion = null) {
  const artifactMeta = getChampionDepthsArtifactMeta(champion);
  const damageBonusFlat =
    moveClass === "damage" || moveClass === "curse"
      ? finiteNumber(artifactMeta.damageBonusFlat, 0)
      : 0;
  const damageDealtPct =
    moveClass === "damage" || moveClass === "curse"
      ? finiteNumber(artifactMeta.damageDealtPct, 0)
      : 0;
  const healingDonePct = moveClass === "buff" ? finiteNumber(artifactMeta.healingDonePct, 0) : 0;

  let finalPower = finiteNumber(scaledPower, 0);
  if (damageBonusFlat || damageDealtPct) {
    finalPower = (finalPower + damageBonusFlat) * Math.max(0, 1 + damageDealtPct / 100);
  }
  if (healingDonePct) {
    finalPower *= Math.max(0, 1 + healingDonePct / 100);
  }

  const hasPassiveModifier = Boolean(damageBonusFlat || damageDealtPct || healingDonePct);
  const roundedFinalPower = hasPassiveModifier
    ? Math.max(moveClass === "buff" ? 1 : 0, Math.round(finalPower))
    : finalPower;

  return {
    unmodifiedPower: finiteNumber(scaledPower, 0),
    finalPower: roundedFinalPower,
    passiveBonus: roundedFinalPower - finiteNumber(scaledPower, 0),
    damageBonusFlat,
    damageDealtPct,
    healingDonePct,
    outputLabel: moveClass === "buff" ? "heal" : "damage",
  };
}

function getDepthsCardPowerUpgradeBreakdown(move = {}) {
  const meta = move?.depthsCardUpgradeMeta || {};
  const currentPower = finiteNumber(move?.power ?? move?.basePower, 0);
  const basePower = finiteNumber(
    meta.powerBaseBeforeUpgrades ??
      move?.powerBaseBeforeUpgrades ??
      move?.basePowerBeforeUpgrades ??
      move?.basePower ??
      currentPower,
    currentPower
  );
  const steps = Array.isArray(meta.powerUpgradeSteps) ? meta.powerUpgradeSteps : [];
  const upgradeBonus = currentPower - basePower;
  const labels = steps.length
    ? steps
        .map((step) => {
          const name = step?.name || "Upgrade";
          const delta = finiteNumber(step?.delta, finiteNumber(step?.after, 0) - finiteNumber(step?.before, 0));
          return `${name} ${formatSignedAmount(delta)}`;
        })
        .join(", ")
    : upgradeBonus
    ? "card upgrades"
    : "";

  return {
    basePower,
    upgradedPower: currentPower,
    upgradeBonus,
    steps,
    label: labels,
  };
}

function getDepthsCardAccuracyUpgradeBreakdown(move = {}) {
  const meta = move?.depthsCardUpgradeMeta || {};
  const currentAccuracy = finiteNumber(move?.accuracy, 0);
  const hasAccuracyMeta =
    Array.isArray(meta.accuracyUpgradeSteps) ||
    typeof meta.accuracyBaseBeforeUpgrades !== "undefined" ||
    typeof move?.accuracyBaseBeforeUpgrades !== "undefined" ||
    typeof move?.baseAccuracyBeforeUpgrades !== "undefined";
  const baseAccuracy = hasAccuracyMeta
    ? finiteNumber(
        meta.accuracyBaseBeforeUpgrades ??
          move?.accuracyBaseBeforeUpgrades ??
          move?.baseAccuracyBeforeUpgrades ??
          currentAccuracy,
        currentAccuracy
      )
    : currentAccuracy;
  const steps = Array.isArray(meta.accuracyUpgradeSteps) ? meta.accuracyUpgradeSteps : [];
  const upgradeBonus = currentAccuracy - baseAccuracy;
  const labels = steps.length
    ? steps
        .map((step) => {
          const name = step?.name || "Upgrade";
          const delta = finiteNumber(step?.delta, finiteNumber(step?.after, 0) - finiteNumber(step?.before, 0));
          return `${name} ${formatSignedAmount(delta)}`;
        })
        .join(", ")
    : upgradeBonus
    ? "card upgrades"
    : "";

  return {
    baseAccuracy,
    upgradedAccuracy: currentAccuracy,
    upgradeBonus,
    steps,
    label: labels,
  };
}

function getDepthsAccuracyBreakdownRows(accuracy = {}) {
  if (!accuracy.upgradeBonus) return [];
  return [
    `base ${formatDepthsNumber(accuracy.baseAccuracy)} ${formatSignedAmount(
      accuracy.upgradeBonus
    )} from ${accuracy.label || "card upgrades"}`,
  ];
}

function getDepthsPowerBreakdownRows(power = {}) {
  const rows = [];
  const passiveParts = [];

  if (power.upgradeBonus) {
    rows.push(
      `base ${formatDepthsNumber(power.basePower)} ${formatSignedAmount(
        power.upgradeBonus
      )} from ${power.upgradeLabel || "card upgrades"}`
    );
  }

  if (power.statBonus) {
    rows.push(
      `${power.upgradeBonus ? "then" : `base ${formatDepthsNumber(power.basePower)}`} ${formatSignedAmount(
        power.statBonus
      )} from ${power.scalingLabel || getDepthsStatScalingText(power.moveClass, power.statKey)}`
    );
  } else if (power.passiveBonus && !power.upgradeBonus) {
    rows.push(`base ${formatDepthsNumber(power.unmodifiedPower ?? power.basePower)}`);
  }

  if (power.damageBonusFlat) {
    passiveParts.push(`${formatSignedAmount(power.damageBonusFlat)} flat damage`);
  }
  if (power.damageDealtPct) {
    passiveParts.push(`${formatDepthsSignedPercent(power.damageDealtPct)} damage`);
  }
  if (power.healingDonePct) {
    passiveParts.push(`${formatDepthsSignedPercent(power.healingDonePct)} healing`);
  }

  if (passiveParts.length) rows.push(`passives: ${passiveParts.join(", ")}`);
  if (power.passiveBonus) {
    rows.push(`shown ${power.outputLabel}: ${formatDepthsNumber(power.finalPower)}`);
  }

  return rows;
}

function computeDepthsEffectiveCooldownSeconds(baseCooldownSeconds, speed) {
  const base = finiteNumber(baseCooldownSeconds, 0);
  if (base <= 0) return 0;
  return base * (50 / Math.max(1, finiteNumber(speed, 50)));
}

function getDepthsMoveBaseCooldown(move = {}) {
  return Math.max(0.1, finiteNumber(move.cooldown_seconds ?? move.cooldown, 3));
}

function getDepthsEffectiveCooldownBreakdown(move = {}, champion = null) {
  const baseCooldown = getDepthsMoveBaseCooldown(move);
  const speed = finiteNumber(getChampionDepthsStats(champion)?.speed, 50);
  const finalCooldown = computeDepthsEffectiveCooldownSeconds(baseCooldown, speed);

  return {
    baseCooldown,
    finalCooldown,
    speed,
    delta: finalCooldown - baseCooldown,
  };
}

function getDepthsMoveDeckCopies(move = {}) {
  const fallback = move.depthsCardSource === "firebase" ? 1 : 2;
  return Math.max(0, Math.round(finiteNumber(move.deckCopies, fallback)));
}

function getDepthsCardDeckCopies(card = {}) {
  const fallback = card.depthsCardSource === "firebase" || card.isDepthsCard ? 1 : 1;
  return Math.max(0, Math.round(finiteNumber(card.deckCopies, fallback)));
}

function getDepthsCooldownRows(cooldown = {}) {
  const rows = [];
  if (Math.abs(finiteNumber(cooldown.delta, 0)) > 0.05) {
    rows.push(
      `base ${formatDepthsNumber(cooldown.baseCooldown)}s adjusted by speed ${formatDepthsNumber(
        cooldown.speed
      )}`
    );
  }
  return rows;
}

function getDepthsCardPowerBreakdown(card = {}, champion = null) {
  const upgrade = getDepthsCardPowerUpgradeBreakdown(card);
  const basePower = upgrade.basePower;
  const upgradedPower = upgrade.upgradedPower;
  const range = getDepthsCardRange(card);
  const cardClass = getDepthsCardClass(card);
  const statKey = getDepthsScalingStatKeyForRange(range);
  const multiplier = getDepthsStatScalingMultiplier(cardClass);
  const statValue = statKey ? finiteNumber(getChampionDepthsStats(champion)?.[statKey], 0) : 0;
  const statBonus = getDepthsStatScaledBonus(cardClass, statValue);
  const passive = applyDepthsPowerPassives(upgradedPower + statBonus, cardClass, champion);

  return {
    basePower,
    upgradedPower,
    upgradeBonus: upgrade.upgradeBonus,
    upgradeLabel: upgrade.label,
    powerUpgradeSteps: upgrade.steps,
    finalPower: passive.finalPower,
    unmodifiedPower: passive.unmodifiedPower,
    statKey,
    statValue,
    statBonus,
    multiplier,
    scalingLabel: getDepthsStatScalingText(cardClass, statKey),
    moveClass: cardClass,
    passiveBonus: passive.passiveBonus,
    damageBonusFlat: passive.damageBonusFlat,
    damageDealtPct: passive.damageDealtPct,
    healingDonePct: passive.healingDonePct,
    outputLabel: passive.outputLabel,
  };
}

function getDepthsCardEffectRows(card = {}, champion = null) {
  const cardClass = getDepthsCardClass(card);
  const potencyMultiplier = cardClass === "buff" || cardClass === "curse" ? 2 : 1;
  const meta = card.depthsCardUpgradeMeta || {};

  return (card.effects || []).map((effect, index) => {
    const effectKey = String(effect.effect || effect.effect_name || "").toLowerCase();
    const baseAmount = finiteNumber(effect.amount, 0);
    const upgradedBaseAmount = Math.max(
      0,
      (baseAmount + finiteNumber(meta.effectPotencyBonus, 0)) *
        finiteNumber(meta.effectPotencyMultiplier, 1)
    );
    const upgradeBonus = upgradedBaseAmount - baseAmount;
    const potency = getChampionEffectPotencyAddOn(champion, effectKey, potencyMultiplier);

    return {
      key: `${effectKey || "effect"}-${index}`,
      effectKey,
      label: formatDepthsAbilityLabel(effectKey),
      baseAmount,
      upgradedBaseAmount,
      upgradeBonus,
      upgradeText: upgradeBonus
        ? `card upgrades ${formatSignedAmount(upgradeBonus)} stacks`
        : "",
      championPotency: potency.championPotency,
      artifactPotency: potency.artifactPotency,
      potencyMultiplier,
      potencyBonus: potency.total,
      finalAmount: upgradedBaseAmount + potency.total,
      icon: DEPTHS_EFFECT_ICON_BY_KEY[effectKey] || "",
    };
  });
}

function cardEffectTargetToRuntimeTarget(target) {
  const value = String(target || "").toLowerCase();
  if (value === "ally" || value === "allies") return "self";
  return value === "self" ? "self" : "target";
}

function depthsCardToMove(card = {}, index = 0) {
  const effects = Array.isArray(card.effects) ? card.effects : [];
  const primaryEffect = effects[0] || null;
  const secondaryEffects = effects.slice(1).map((effect) => ({
    target: cardEffectTargetToRuntimeTarget(effect.target),
    effectKey: effect.effect,
    amount: finiteNumber(effect.amount, 0),
  }));
  const labels = [formatDepthsAbilityLabel(card.rarity || "common"), "Depths Card"];
  const targetsMultiple = effects.some((effect) =>
    ["enemies", "allies"].includes(String(effect.target || "").toLowerCase())
  );

  return {
    id: `depths-card-${card.cardId || card.id || index}`,
    name: card.name || `Depths Card ${index + 1}`,
    type: card.type || [card.range, card.class].filter(Boolean).join(" ") || "magic damage",
    category: card.type || [card.range, card.class].filter(Boolean).join(" ") || "magic damage",
    power: Math.max(0, finiteNumber(card.power, 0)),
    accuracy: clampNumber(finiteNumber(card.accuracy, 75), 0, 100),
    cooldown_seconds: Math.max(0.1, finiteNumber(card.cooldown, 3)),
    cooldown: Math.max(0.1, finiteNumber(card.cooldown, 3)),
    effect: primaryEffect?.effect || "none",
    effect_name: primaryEffect?.effect || "none",
    effect_potency_base: finiteNumber(primaryEffect?.amount, 0),
    effects,
    casterAnimation: card.casterAnimation || {},
    effectAnimation: card.effectAnimation || {},
    animationFrames: card.casterAnimation?.frameUrls || [],
    effectFrames: card.effectAnimation?.frameUrls || [],
    depthsCardId: card.cardId || card.id || null,
    depthsCardSource: "firebase",
    rarity: card.rarity || "common",
    cardPowerScore: card.cardPowerScore || scoreDepthsCardPower(card),
    deckCopies: Math.max(0, Math.round(finiteNumber(card.deckCopies, 1))),
    depthsCardUpgradeMeta: {
      labels,
      secondaryEffects,
      baseSecondaryEffectCount: secondaryEffects.length,
      multiTarget: targetsMultiple,
    },
  };
}

function summarizeDepthsCard(card, roomNumber) {
  const summary = {
    id: `${card.cardId || card.id || "card"}-${Date.now()}`,
    cardId: card.cardId || card.id || "",
    name: card.name || "Depths Card",
    type: card.type,
    range: card.range,
    class: card.class,
    power: card.power,
    accuracy: card.accuracy,
    cooldown: card.cooldown,
    rarity: card.rarity || "common",
    cardPowerScore: card.cardPowerScore || scoreDepthsCardPower(card),
    effects: card.effects || [],
    casterAnimation: card.casterAnimation || {},
    effectAnimation: card.effectAnimation || {},
    deckCopies: Math.max(1, Math.round(finiteNumber(card.deckCopies, 1))),
    room: roomNumber,
  };

  return {
    ...summary,
    move: depthsCardToMove(summary),
  };
}

function pickWeightedDepthsCardPool(pool = [], count = 3) {
  const remaining = [...pool].map((card) => ({
    card,
    weight: getDepthsCardRarityWeight(card.rarity),
  }));
  const picked = [];

  while (picked.length < count && remaining.length) {
    const totalWeight = remaining.reduce((sum, entry) => sum + finiteNumber(entry.weight, 0), 0);
    if (totalWeight <= 0) break;
    let roll = Math.random() * totalWeight;
    let selectedIndex = remaining.length - 1;
    for (let index = 0; index < remaining.length; index += 1) {
      roll -= finiteNumber(remaining[index].weight, 0);
      if (roll <= 0) {
        selectedIndex = index;
        break;
      }
    }
    const [selected] = remaining.splice(selectedIndex, 1);
    if (selected?.card) picked.push(selected.card);
  }

  return picked.length ? picked : shuffleRows(pool).slice(0, count);
}

function matchesDepthsCardRarityFilter(card = {}, options = {}) {
  const rarity = String(card.rarity || "").toLowerCase();
  const allowedRarities = options.allowedRarities || (options.rarity ? [options.rarity] : null);
  if (!allowedRarities) return true;
  return allowedRarities.map((entry) => String(entry).toLowerCase()).includes(rarity);
}

function pickDepthsCardChoices(cards = [], chosenCards = [], count = 3, options = {}) {
  const chosenIds = new Set(
    (chosenCards || [])
      .filter((card) => getDepthsCardDeckCopies(card) > 0)
      .map((card) => card.cardId || card.id)
  );
  const rarityPool = cards.filter((card) => matchesDepthsCardRarityFilter(card, options));
  const buildPool = rarityPool.filter((card) => depthsCardMatchesChampionBuild(card, options));
  const available = buildPool.filter((card) => !chosenIds.has(card.cardId || card.id));
  const pool = available.length ? available : buildPool;
  return pickWeightedDepthsCardPool(pool, count);
}

function getDepthsQuestChoiceKey(option = {}) {
  return String(option.id || option.title || "");
}

function getDepthsQuestOutcomeText(outcome = {}) {
  const effectLabels = (outcome.effects || []).map((effect) => {
    if (effect.type === "cardChoice") return "Choose a new card";
    if (effect.type === "randomCard") return "Gain a random card";
    if (effect.type === "artifactChoice") return "Choose an artifact";
    if (effect.type === "randomArtifact") return "Gain a random artifact";
    if (effect.type === "cardUpgrade") return "Upgrade a card";
    if (effect.type === "removeCard") return "Remove one card copy";
    if (effect.type === "cursedRelic") return "Gain a cursed relic";
    if (effect.type === "healPct") return `Heal ${Math.round(finiteNumber(effect.amount, 0) * 100)}% max HP`;
    if (effect.type === "damagePct") return `Lose ${Math.round(finiteNumber(effect.amount, 0) * 100)}% max HP`;
    if (effect.type === "questRelic") return effect.name ? `Gain ${effect.name}` : "Gain a quest relic";
    return "";
  }).filter(Boolean);
  return effectLabels.join(", ");
}

function getDepthsQuestCheckLabel(check = null) {
  if (!check) return "No roll";
  if (check.type === "roll") return `Roll d100. Succeed on ${finiteNumber(check.successChance, 0)} or lower.`;
  if (check.type === "card") return `Draw a random card from your deck. Succeed if it is ${check.label || "a match"}.`;
  return "No roll";
}

function getDepthsMoveEffectKeys(move = {}) {
  const keys = new Set();
  const addKey = (value) => {
    const key = String(value || "").toLowerCase().trim();
    if (key && key !== "none") keys.add(key);
  };

  addKey(move.effect);
  addKey(move.effect_name);
  addKey(move.effectKey);
  (Array.isArray(move.effects) ? move.effects : []).forEach((effect) => {
    addKey(effect?.effect);
    addKey(effect?.effect_name);
    addKey(effect?.effectKey);
  });
  (Array.isArray(move.depthsCardUpgradeMeta?.secondaryEffects)
    ? move.depthsCardUpgradeMeta.secondaryEffects
    : []
  ).forEach((effect) => addKey(effect?.effectKey));

  return keys;
}

function depthsQuestCardMatchesCheck(move = {}, check = {}, buildEffectKeys = []) {
  const match = check.match || {};
  const range = getDepthsCardRange(move);
  const cardClass = getDepthsCardClass(move);
  const effectKeys = getDepthsMoveEffectKeys(move);
  const acceptedRanges = [
    ...(match.range ? [match.range] : []),
    ...(Array.isArray(match.ranges) ? match.ranges : []),
  ].map((entry) => String(entry || "").toLowerCase());
  const acceptedClasses = [
    ...(match.class ? [match.class] : []),
    ...(Array.isArray(match.classes) ? match.classes : []),
  ].map((entry) => String(entry || "").toLowerCase());
  const acceptedEffects = [
    ...(match.effect ? [match.effect] : []),
    ...(Array.isArray(match.effects) ? match.effects : []),
  ].map((entry) => String(entry || "").toLowerCase());

  if (acceptedRanges.includes(range)) return true;
  if (acceptedClasses.includes(cardClass)) return true;
  if (acceptedEffects.some((effectKey) => effectKeys.has(effectKey))) return true;
  if (match.buildEffect) {
    return (buildEffectKeys || []).some((effectKey) => effectKeys.has(effectKey));
  }
  return false;
}

function pickDepthsQuestCardCheck(champion = {}, check = {}) {
  const deckCards = getDepthsChampionCardMoves(champion).flatMap(({ move, moveIndex }) =>
    Array.from({ length: getDepthsMoveDeckCopies(move) }).map((_copy, copyIndex) => ({
      move,
      moveIndex,
      copyIndex,
    }))
  );
  if (!deckCards.length) {
    return {
      success: false,
      rollType: "card",
      drawnCard: null,
      detail: "No cards were available to draw.",
    };
  }

  const drawn = deckCards[Math.floor(Math.random() * deckCards.length)];
  const buildEffectKeys = getDepthsChampionBuildEffectKeys(champion);
  const success = depthsQuestCardMatchesCheck(drawn.move, check, buildEffectKeys);

  return {
    success,
    rollType: "card",
    drawnCard: {
      name: drawn.move?.name || `Card ${drawn.moveIndex + 1}`,
      type: drawn.move?.type || drawn.move?.category || "card",
      moveIndex: drawn.moveIndex,
      previewSrc: getCardUpgradeMovePreviewSrc(drawn.move),
    },
    detail: `${drawn.move?.name || "Drawn card"} ${success ? "matches" : "does not match"} ${check.label || "the quest"}.`,
  };
}

function resolveDepthsQuestCheck(option = {}, champion = {}) {
  const check = option.check || null;
  if (!check) {
    return {
      success: true,
      rollType: "none",
      detail: "No roll was required.",
      outcome: option.success || {},
    };
  }

  if (check.type === "roll") {
    const successChance = clampNumber(finiteNumber(check.successChance, 50), 1, 99);
    const roll = 1 + Math.floor(Math.random() * 100);
    const success = roll <= successChance;
    return {
      success,
      roll,
      target: successChance,
      rollType: "roll",
      detail: `Rolled ${roll}. Needed ${successChance} or lower.`,
      outcome: success ? option.success || {} : option.failure || {},
    };
  }

  if (check.type === "card") {
    const result = pickDepthsQuestCardCheck(champion, check);
    return {
      ...result,
      outcome: result.success ? option.success || {} : option.failure || {},
    };
  }

  return {
    success: true,
    rollType: "none",
    detail: "No roll was required.",
    outcome: option.success || {},
  };
}

function summarizeDepthsQuestRelic(effect = {}, roomNumber = 1, quest = {}) {
  return {
    id: `${effect.id || "quest-relic"}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: effect.name || "Quest Relic",
    rarity: effect.rarity || "Quest",
    theme: quest.world || "quest",
    abilityCount: 1,
    abilityGroups: 1,
    selectedAbilityIds: [effect.id || effect.name || "quest"],
    powerScore: 0,
    imageSrc: effect.imageSrc || `${ARTIFACT_IMAGE_BASE}/morrow.png`,
    description: effect.description || "",
    room: roomNumber,
    statBonuses: effect.statBonuses || {},
    moveAccuracy: effect.moveAccuracy || {},
    battleOnly: effect.battleOnly || [],
    depthsAbilityMeta: effect.depthsAbilityMeta || {},
    artifactMeta: effect.artifactMeta || {},
    awakeningTags: effect.awakeningTags || [],
    rewardTags: effect.rewardTags || [],
    traitAwakening: "",
    questReward: true,
    questId: quest.id || "",
  };
}

function pickDepthsCursedArtifact(roomNumber = 1) {
  const cursed = DEPTHS_CURSED_ARTIFACTS[Math.floor(Math.random() * DEPTHS_CURSED_ARTIFACTS.length)];
  return summarizeDepthsQuestRelic(cursed || {}, roomNumber, { id: "cursed", world: "cursed" });
}

function summarizeDepthsQuestImmediateChange(effect = {}, details = {}) {
  if (effect.type === "healPct") {
    return `Healed ${details.healed || 0} HP.`;
  }
  if (effect.type === "damagePct") {
    return `Lost ${details.damage || 0} HP.`;
  }
  if (effect.type === "questRelic") {
    return `Gained ${effect.name || "a quest relic"}.`;
  }
  if (effect.type === "cursedRelic") {
    return `Gained ${details.name || "a cursed relic"}.`;
  }
  if (effect.type === "randomArtifact") {
    return details.name ? `Gained ${details.name}.` : "No matching artifact was available.";
  }
  if (effect.type === "randomCard") {
    return details.name ? `Added ${details.name} to the deck.` : "No matching card was available.";
  }
  return "";
}

function getDepthsRunCardMove(card = {}, index = 0) {
  return card.move || depthsCardToMove(card, index);
}

function getDepthsChampionCardMoves(champion) {
  const charObj = champion?.charObj || {};
  const baseMoves = Array.isArray(charObj.moves) ? charObj.moves : [];
  const runCardMoves = (charObj.depthsRunCards || []).map((card, index) => ({
    move: getDepthsRunCardMove(card, index),
    moveIndex: baseMoves.length + index,
  }));

  return [
    ...baseMoves.map((move, index) => ({ move, moveIndex: index })),
    ...runCardMoves,
  ].filter(({ move }) => getDepthsMoveDeckCopies(move) > 0);
}

function getDepthsChampionDeckCopyTotal(champion) {
  return getDepthsChampionCardMoves(champion).reduce(
    (total, { move }) => total + getDepthsMoveDeckCopies(move),
    0
  );
}

function getDepthsRemovableDeckCards(champion) {
  return getDepthsChampionCardMoves(champion).map(({ move, moveIndex }) => {
    const moveFamilyKey = getDepthsCardUpgradeFamilyKey(move, moveIndex);
    const moveKey = getDepthsCardUpgradeMoveKey(move, moveIndex);
    return {
      id: moveFamilyKey,
      move,
      moveIndex,
      moveFamilyKey,
      moveKey,
      cardId: move.depthsCardId || "",
      name: move.name || `Card ${moveIndex + 1}`,
      deckCopies: getDepthsMoveDeckCopies(move),
      source: move.depthsCardSource === "firebase" ? "depths" : "champion",
    };
  });
}

function HeroPanel({ championCount, monsterCount, cardCount }) {
  return (
    <Box
      sx={{
        position: "relative",
        minHeight: { xs: 330, md: 430 },
        display: "grid",
        placeItems: "center",
        p: { xs: 3, md: 6 },
        overflow: "hidden",
        backgroundImage: `
          linear-gradient(180deg, rgba(0,0,0,0.34), rgba(0,0,0,0.78) 55%, rgba(0,0,0,0.9) 100%),
          url(${ARENA_BG_SRC})
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        border: `1px solid ${THEME.line}`,
        boxShadow: "inset 0 -90px 90px rgba(0,0,0,0.72), inset 0 0 80px rgba(255,255,255,0.025)",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          opacity: 0.28,
        }}
      />

      <Box sx={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 960, textAlign: "center" }}>
        <Box
          component="img"
          src={ARENA_LOGO_SRC}
          alt="Arena"
          sx={{
            width: { xs: 84, md: 112 },
            height: { xs: 84, md: 112 },
            objectFit: "contain",
            mb: 1.5,
            filter: "drop-shadow(0 0 18px rgba(255,255,255,0.16))",
          }}
        />
        <Typography sx={{ ...medievalText, color: THEME.muted, fontSize: { xs: 12, md: 16 } }}>
          Dark Coin Arena
        </Typography>
        <Typography
          variant="h1"
          sx={{
            ...medievalText,
            color: THEME.text,
            fontSize: { xs: 42, sm: 58, md: 82 },
            fontWeight: 400,
            lineHeight: 0.95,
            mt: 1,
            textShadow: "0 0 18px rgba(255,255,255,0.22), 0 0 40px rgba(255,255,255,0.08)",
          }}
        >
          The Depths
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 1, mt: 3 }}>
          <Chip
            icon={<SportsKabaddiIcon />}
            label={`${championCount} champion${championCount === 1 ? "" : "s"} ready`}
            sx={{ color: THEME.text, border: `1px solid ${THEME.line}`, background: "rgba(0,0,0,0.58)" }}
          />
          <Button
            href="/arena/monsters"
            startIcon={<AutoAwesomeIcon />}
            sx={{
              color: THEME.text,
              border: `1px solid ${THEME.line}`,
              borderRadius: 999,
              background: "rgba(0,0,0,0.58)",
              minHeight: 32,
              px: 1.4,
              textTransform: "none",
              fontSize: 13,
              lineHeight: 1.2,
              "&:hover": {
                borderColor: THEME.gold,
                background: "rgba(255,255,255,0.10)",
              },
            }}
          >
            {monsterCount} monster{monsterCount === 1 ? "" : "s"} in rotation
          </Button>
          <Button
            href="/arena/cards"
            startIcon={<AutoAwesomeIcon />}
            sx={{
              color: THEME.text,
              border: `1px solid ${THEME.line}`,
              borderRadius: 999,
              background: "rgba(0,0,0,0.58)",
              minHeight: 32,
              px: 1.4,
              textTransform: "none",
              fontSize: 13,
              lineHeight: 1.2,
              "&:hover": {
                borderColor: THEME.gold,
                background: "rgba(255,255,255,0.10)",
              },
            }}
          >
            {cardCount} card{cardCount === 1 ? "" : "s"} in rotation
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

function EmptyPanel({ title, text, action }) {
  return (
    <Box sx={{ ...panelStyle, p: 4, textAlign: "center" }}>
      <Typography sx={{ ...medievalText, color: THEME.text, fontSize: 18 }}>{title}</Typography>
      {text ? (
        <Typography sx={{ color: THEME.muted, fontSize: 14, lineHeight: 1.6, mt: 1 }}>
          {text}
        </Typography>
      ) : null}
      {action ? <Box sx={{ mt: 2 }}>{action}</Box> : null}
    </Box>
  );
}

function LoadingPanel({ title }) {
  return (
    <Box sx={{ ...panelStyle, p: 4, textAlign: "center" }}>
      <CircularProgress sx={{ color: THEME.text }} />
      <Typography sx={{ ...medievalText, color: THEME.muted, fontSize: 13, mt: 2 }}>
        {title}
      </Typography>
    </Box>
  );
}

function ChampionObjectNameplate({ record }) {
  const hasObject = Boolean(record?.exists && record?.charObj);
  const label = record?.charObj?.name || record?.name || "Champion Object";

  return (
    <Box
      sx={{
        mt: 1.2,
        p: "10px 12px",
        border: `1px solid ${THEME.line}`,
        textAlign: "center",
        background: hasObject
          ? "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(0,0,0,0.82))"
          : "rgba(255,255,255,0.025)",
        boxShadow: "inset 0 0 18px rgba(255,255,255,0.025)",
      }}
    >
      <Typography sx={{ color: THEME.faint, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" }}>
        {hasObject ? "Champion Object" : "No Character Object"}
      </Typography>
      <Typography
        sx={{
          color: hasObject ? THEME.text : THEME.faint,
          fontFamily: "Jacques, Georgia, serif",
          fontSize: 14,
          letterSpacing: "0.12em",
          lineHeight: 1.25,
          mt: 0.35,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={label}
      >
        {label}
      </Typography>
    </Box>
  );
}

function ChampionObjectModal({ open, record, onClose, contracts, setMessage, sendDiscordMessage }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      PaperProps={{
        sx: {
          overflow: "hidden",
          background: "linear-gradient(180deg, #050505, #000000 62%, #080808)",
          border: `1px solid ${THEME.line}`,
          borderRadius: 0,
          boxShadow: "0 34px 110px rgba(0,0,0,0.86), 0 0 52px rgba(255,255,255,0.07)",
        },
      }}
    >
      <DialogContent sx={{ p: 0, position: "relative", minHeight: 420 }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            color: THEME.text,
            zIndex: 5,
            background: "rgba(0,0,0,0.84)",
            border: `1px solid ${THEME.line}`,
            borderRadius: 0,
          }}
        >
          <CloseIcon />
        </IconButton>

        {record?.assetId ? (
          <Box sx={{ p: "clamp(8px,1vw,14px)", color: THEME.text }}>
            <Character
              nftId={record.assetId}
              setMessage={setMessage}
              sendDiscordMessage={sendDiscordMessage}
              contracts={contracts}
              hideSkillTree
              hideDeleteButton
              darkCoinTheme
            />
          </Box>
        ) : (
          <EmptyPanel title="Champion object not found" text="The NFT loaded, but no character object was returned." />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChampionCard({
  record,
  onStart,
  onViewObject,
  disabled,
  setMessage,
  contracts,
  sendDiscordMessage,
  entryInfo = null,
  entryInfoLoading = false,
}) {
  const charObj = record?.charObj || {};
  const hasObject = Boolean(record?.exists && record?.charObj);
  const hasMoves = Array.isArray(charObj.moves) && charObj.moves.length > 0;
  const ready = hasObject && hasMoves;
  const activeRun = entryInfo?.activeRun || null;
  const runDescription = activeRun ? getDepthsActiveRunProgress(activeRun) : "";

  return (
    <Box
      sx={{
        ...panelStyle,
        p: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 1.4,
      }}
    >
      <Box sx={{ minHeight: 320 }}>
        <DisplayChar
          nftId={record.assetId}
          setNft={() => {}}
          setMessage={setMessage}
          sendDiscordMessage={sendDiscordMessage}
          contracts={contracts}
          fights={[]}
        />
      </Box>

      <ChampionObjectNameplate record={record} />

      {hasObject && !hasMoves ? (
        <Box sx={{ border: `1px solid ${THEME.line}`, p: 1.1, textAlign: "center" }}>
          <Typography sx={{ color: THEME.faint, fontSize: 12 }}>No moves found</Typography>
        </Box>
      ) : null}

      {entryInfoLoading || activeRun ? (
        <Box
          sx={{
            p: 1.1,
            border: `1px solid ${activeRun ? THEME.gold : THEME.line}`,
            borderRadius: 1,
            background: activeRun ? "rgba(225,184,100,0.12)" : "rgba(255,255,255,0.045)",
          }}
        >
          <Chip
            size="small"
            label={activeRun ? "Run In Progress" : "Checking Run"}
            sx={{
              height: 22,
              color: activeRun ? THEME.gold : THEME.faint,
              border: `1px solid ${activeRun ? THEME.gold : THEME.line}`,
              background: "rgba(0,0,0,0.42)",
              fontSize: 10,
              fontWeight: 900,
            }}
          />
          <Typography sx={{ color: activeRun ? THEME.text : THEME.faint, fontSize: 12, lineHeight: 1.35, mt: 0.7 }}>
            {activeRun ? runDescription : "Looking for a saved Depths run for this champion."}
          </Typography>
        </Box>
      ) : null}

      <Button
        disabled={disabled || !ready}
        startIcon={<SportsKabaddiIcon />}
        onClick={() => onStart(record)}
        sx={{ ...buttonStyle, mt: "auto", minHeight: 44 }}
      >
        {activeRun ? "Resume The Depths" : "Enter The Depths"}
      </Button>
      {hasObject ? (
        <Button
          startIcon={<VisibilityIcon />}
          onClick={() => onViewObject(record)}
          sx={{ ...buttonStyle, minHeight: 42 }}
        >
          View Champion Object
        </Button>
      ) : null}
    </Box>
  );
}

function DepthsEntryPaymentPanel({
  champion,
  prompt,
  status = "",
  error = "",
  submitting = false,
  onConfirm,
  onCancel,
}) {
  const payment = prompt?.payment || {};
  const amount = payment.amountDisplay || formatDarkCoinAtomicAmount(payment.amountAtomic || 0, payment.decimals || DARK_COIN_DECIMALS);
  const baseAmount = payment.baseAmountDisplay || "1000";
  const runNumber = Number(payment.runNumber || prompt?.nextRunNumber || 1);
  const runsToday = Math.max(
    0,
    Math.floor(Number(payment.runsToday ?? payment.entryCount ?? runNumber - 1))
  );
  const receiver =
    normalizeAlgorandAddress(payment.receiver) ||
    getApplicationAddressString(payment.appId || getDepthsRewardAppId());
  const shortReceiver = receiver ? `${receiver.slice(0, 8)}...${receiver.slice(-6)}` : "";
  const runWord = runsToday === 1 ? "run" : "runs";

  return (
    <DepthsScenePanel bgSrc={DEPTHS_START_LOADOUT_BG_SRC}>
      <Box
        sx={{
          minHeight: { xs: "calc(100vh - 230px)", md: "calc(100vh - 220px)" },
          display: "grid",
          placeItems: "center",
          px: { xs: 1.5, md: 3 },
          py: { xs: 3, md: 5 },
        }}
      >
        <Box
          sx={{
            width: "min(720px, 100%)",
            p: { xs: 2.2, md: 3.2 },
            border: `1px solid ${THEME.gold}`,
            borderRadius: 1,
            background: "rgba(0,0,0,0.76)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
            textAlign: "center",
            backdropFilter: "blur(2px)",
          }}
        >
          <Typography sx={{ ...medievalText, color: THEME.gold, fontSize: 12 }}>
            Entry Payment Required
          </Typography>
          <Typography sx={{ color: THEME.text, fontSize: { xs: 26, md: 38 }, fontWeight: 950, lineHeight: 1.05, mt: 0.8 }}>
            Sign Before The Run Begins
          </Typography>
          <Typography sx={{ color: THEME.muted, fontSize: 14, lineHeight: 1.55, mt: 1.2 }}>
            Champion #{champion?.assetId || payment.championAssetId || ""} has entered The Depths {runsToday} {runWord} today.
            Daily run {runNumber} costs {amount} Dark Coin.
          </Typography>

          <Box sx={{ mt: 2.4, display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label={`${runsToday} ${runWord} today`}
              sx={{ color: THEME.text, border: `1px solid ${THEME.line}`, background: "rgba(0,0,0,0.58)" }}
            />
            <Chip
              label={`${amount} Dark Coin`}
              sx={{ color: THEME.gold, border: `1px solid ${THEME.gold}`, background: "rgba(225,184,100,0.12)" }}
            />
            <Chip
              label={`Daily run ${runNumber}`}
              sx={{ color: THEME.muted, border: `1px solid ${THEME.line}`, background: "rgba(0,0,0,0.58)" }}
            />
          </Box>

          <Box
            sx={{
              mt: 2.4,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 1,
              textAlign: "left",
            }}
          >
            {[
              ["Runs Today", `${runsToday}`],
              ["Cost Formula", `${runNumber} x ${baseAmount} Dark Coin`],
              ["Asset", `Dark Coin #${payment.assetId || DARK_COIN_ASSET_ID}`],
              ["Amount", `${amount} Dark Coin`],
              ["Receiver", shortReceiver],
              ["Destination", `Depths contract${payment.appId ? ` #${payment.appId}` : ""}`],
            ].map(([label, value]) => (
              <Box
                key={label}
                sx={{
                  p: 1.1,
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 1,
                  background: "rgba(255,255,255,0.045)",
                }}
              >
                <Typography sx={{ ...medievalText, color: THEME.faint, fontSize: 10 }}>{label}</Typography>
                <Typography sx={{ color: THEME.text, fontSize: 13, fontWeight: 850, mt: 0.3 }}>
                  {value || "Configured by server"}
                </Typography>
              </Box>
            ))}
          </Box>

          {status || error ? (
            <Box
              sx={{
                mt: 2.2,
                p: 1.2,
                border: `1px solid ${error ? "rgba(248,87,90,0.6)" : THEME.line}`,
                borderRadius: 1,
                background: "rgba(255,255,255,0.045)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                {submitting && !error ? <CircularProgress size={15} sx={{ color: THEME.gold }} /> : null}
                <Typography sx={{ color: error ? THEME.bad : THEME.muted, fontSize: 12 }}>
                  {error || status}
                </Typography>
              </Box>
            </Box>
          ) : null}

          <Box sx={{ mt: 2.8, display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
            <Button
              startIcon={submitting ? <CircularProgress size={16} sx={{ color: THEME.gold }} /> : <AutoAwesomeIcon />}
              disabled={submitting}
              onClick={onConfirm}
              sx={{ ...buttonStyle, minHeight: 44, minWidth: 220 }}
            >
              {submitting ? "Waiting For Wallet" : "Sign Dark Coin Payment"}
            </Button>
            <Button disabled={submitting} onClick={onCancel} sx={{ ...buttonStyle, minHeight: 44 }}>
              Cancel
            </Button>
          </Box>
        </Box>
      </Box>
    </DepthsScenePanel>
  );
}

function getArtifactChoiceKey(artifact = {}) {
  const value = artifact || {};
  return String(value.id || value.name || "");
}

function getCardChoiceKey(card = {}) {
  const value = card || {};
  return String(value.cardId || value.id || value.name || "");
}

function SelectionCheckOverlay({ selected, label = "Selected" }) {
  if (!selected) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "radial-gradient(circle at center, rgba(0,0,0,0.1), rgba(0,0,0,0.52))",
        pointerEvents: "none",
        zIndex: 4,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.7,
          px: 1.3,
          py: 0.7,
          color: "#111",
          background: THEME.gold,
          border: "1px solid rgba(255,255,255,0.72)",
          borderRadius: 999,
          boxShadow: "0 0 24px rgba(225,184,100,0.36)",
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 18 }} />
        {label}
      </Box>
    </Box>
  );
}

function DepthsStatIconPill({ icon, value, alt = "", tone = THEME.text }) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.45,
        minHeight: 24,
        px: 0.75,
        py: 0.25,
        color: tone,
        border: `1px solid ${THEME.line}`,
        borderRadius: 999,
        background: "rgba(0,0,0,0.42)",
      }}
    >
      <Box
        component="img"
        src={icon}
        alt={alt}
        draggable={false}
        sx={{ width: 16, height: 16, objectFit: "contain", flex: "0 0 auto" }}
      />
      <Typography sx={{ color: tone, fontSize: 11, fontWeight: 900, lineHeight: 1 }}>
        {value}
      </Typography>
    </Box>
  );
}

function getArtifactAbilityIcons(text = "") {
  const value = String(text || "").toLowerCase();
  const icons = [];
  const addIcon = (icon, key) => {
    if (!icon || icons.some((entry) => entry.icon === icon)) return;
    icons.push({ icon, key });
  };

  Object.entries(DEPTHS_EFFECT_ICON_BY_KEY).forEach(([key, icon]) => {
    const aliases = key === "bleed" ? ["bleed", "bleeding"] : [key];
    if (aliases.some((alias) => new RegExp(`\\b${alias}\\b`, "i").test(value))) {
      addIcon(icon, key);
    }
  });

  const statMatches = [
    ["critChance", /\bcrit chance\b|\bcritical chance\b/],
    ["critDamage", /\bcrit damage\b|\bcritical damage\b/],
    ["health", /\bhealth\b|\bhp\b|\bheal(?:ing)?\b|\blifesteal\b/],
    ["speed", /\bspeed\b|\bhasten\b|\bhaste\b/],
    ["resist", /\bresist\b|\bresistance\b/],
    ["strength", /\bstrength\b/],
    ["dexterity", /\bdexterity\b/],
    ["intelligence", /\bintelligence\b/],
    ["accuracy", /\baccuracy\b/],
    ["cooldown", /\bcooldown\b/],
    ["damage", /\bdamage\b/],
  ];

  statMatches.forEach(([key, pattern]) => {
    if (pattern.test(value)) addIcon(DEPTHS_STAT_ICON_BY_KEY[key], key);
  });

  return icons.slice(0, 4);
}

function ArtifactAbilityRow({ text }) {
  const icons = getArtifactAbilityIcons(text);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.65,
        minHeight: 30,
        px: 0.9,
        py: 0.55,
        color: THEME.text,
        border: `1px solid ${THEME.line}`,
        borderRadius: 1,
        background: "rgba(255,255,255,0.04)",
      }}
    >
      {icons.length ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flex: "0 0 auto" }}>
          {icons.map((entry) => (
            getArenaEffectInfo(entry.key) ? (
              <EffectTooltipIcon
                key={`${entry.key}-${entry.icon}`}
                effectKey={entry.key}
                src={entry.icon}
                size={18}
                sx={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.16))" }}
              />
            ) : (
              <Box
                key={`${entry.key}-${entry.icon}`}
                component="img"
                src={entry.icon}
                alt=""
                draggable={false}
                sx={{
                  width: 18,
                  height: 18,
                  objectFit: "contain",
                  filter: "drop-shadow(0 0 8px rgba(255,255,255,0.16))",
                }}
              />
            )
          ))}
        </Box>
      ) : null}
      <Typography sx={{ color: THEME.text, fontSize: 12, fontWeight: 800, lineHeight: 1.25, overflowWrap: "anywhere" }}>
        {text}
      </Typography>
    </Box>
  );
}

function SelectedArtifactSquare({ artifact, compact = false }) {
  const content = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 0.75 : 1,
        minWidth: 0,
        p: compact ? 0.65 : 0.8,
        color: THEME.text,
        border: `1px solid ${THEME.line}`,
        borderRadius: 1,
        background: "rgba(0,0,0,0.58)",
      }}
    >
      {artifact.imageSrc ? (
        <Box
          sx={{
            width: compact ? 38 : 48,
            aspectRatio: "1 / 1",
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
            border: `1px solid ${THEME.line}`,
            background: "rgba(255,255,255,0.035)",
          }}
        >
          <Box
            component="img"
            src={artifact.imageSrc}
            alt=""
            draggable={false}
            sx={{ width: "86%", height: "86%", objectFit: "contain" }}
          />
        </Box>
      ) : null}
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: THEME.text, fontSize: compact ? 11 : 12, fontWeight: 900, lineHeight: 1.15 }}>
          {artifact.name}
        </Typography>
        <Typography sx={{ color: THEME.faint, fontSize: compact ? 9 : 10, lineHeight: 1.2 }}>
          Room {artifact.room || "-"} | {formatDepthsAbilityLabel(artifact.rarity || "Artifact")}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <ChoiceDetailTooltip title={<ArtifactChoiceDetail artifact={artifact} />}>
      {content}
    </ChoiceDetailTooltip>
  );
}

function getSelectableChoiceSx(selected, rarity = "common") {
  return {
    position: "relative",
    transform: selected ? "translateY(-2px) scale(1.01)" : "translateY(0) scale(1)",
    transition: "transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease",
    animation: selected ? "depthsChoiceSelect 360ms ease-out" : "none",
    boxShadow: getDepthsRarityBoxShadow(rarity, selected),
    "@keyframes depthsChoiceSelect": {
      "0%": { transform: "translateY(0) scale(0.992)" },
      "55%": { transform: "translateY(-3px) scale(1.018)" },
      "100%": { transform: "translateY(-2px) scale(1.01)" },
    },
  };
}

function ArtifactOptionCard({
  artifact,
  onChoose,
  selected = false,
  disabled = false,
}) {
  const additions = formatArtifactAdditions(artifact);
  const rarity = getDepthsRarityStyle(artifact.rarity);

  return (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) onChoose(artifact);
      }}
      sx={{
        ...getSelectableChoiceSx(selected, artifact.rarity),
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 0,
        color: THEME.text,
        textAlign: "left",
        border: `1px solid ${getDepthsRarityBorder(artifact.rarity, selected)}`,
        borderRadius: 1,
        overflow: "hidden",
        opacity: disabled && !selected ? 0.42 : 1,
        background: selected
          ? "linear-gradient(180deg, rgba(225,184,100,0.15), rgba(0,0,0,0.92))"
          : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.9))",
        cursor: disabled ? "not-allowed" : "pointer",
        font: "inherit",
        "&:hover": disabled
          ? undefined
          : {
          borderColor: THEME.gold,
          background:
            "linear-gradient(180deg, rgba(225,184,100,0.13), rgba(0,0,0,0.92))",
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          minHeight: 190,
          maxHeight: 260,
          display: "grid",
          placeItems: "center",
          background:
            "radial-gradient(circle at center, rgba(255,255,255,0.16), transparent 44%), rgba(0,0,0,0.48)",
          borderBottom: `1px solid ${THEME.line}`,
        }}
      >
        <Box
          component="img"
          src={artifact.imageSrc}
          alt={artifact.name}
          draggable={false}
          sx={{
            width: "min(72%, 178px)",
            height: "min(72%, 178px)",
            objectFit: "contain",
            filter: "drop-shadow(0 16px 22px rgba(0,0,0,0.55)) drop-shadow(0 0 18px rgba(255,255,255,0.14))",
          }}
        />
        <SelectionCheckOverlay selected={selected} />
      </Box>
      <Box sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.7, flexWrap: "wrap" }}>
          <Typography sx={{ color: THEME.gold, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em" }}>
            {rarity.label}
          </Typography>
          {artifact.traitAwakening ? (
            <Chip
              size="small"
              label={artifact.traitAwakening}
              sx={{
                height: 22,
                color: THEME.gold,
                border: `1px solid ${THEME.gold}`,
                background: "rgba(225,184,100,0.1)",
                "& .MuiChip-label": { px: 0.8, fontSize: 9, fontWeight: 900 },
              }}
            />
          ) : null}
        </Box>
        <Typography sx={{ color: THEME.text, fontSize: 20, fontWeight: 900, lineHeight: 1.15, mt: 0.6 }}>
          {artifact.name}
        </Typography>
        <Typography sx={{ color: THEME.muted, fontSize: 13, lineHeight: 1.45, mt: 1 }}>
          {artifact.description}
        </Typography>
        {additions.length ? (
          <Box sx={{ mt: 1.3, display: "grid", gap: 0.55 }}>
            {additions.map((addition) => (
              <ArtifactAbilityRow
                key={addition}
                text={addition}
              />
            ))}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

function DepthsCardOptionCard({
  card,
  champion = null,
  onChoose,
  selected = false,
  disabled = false,
}) {
  const effectRows = getDepthsCardEffectRows(card, champion);
  const previewSrc = getDepthsCardPreviewSrc(card);
  const targetLabel = getDepthsCardTargetLabel(card);
  const powerBreakdown = getDepthsCardPowerBreakdown(card, champion);
  const powerBreakdownRows = getDepthsPowerBreakdownRows(powerBreakdown);
  const accuracyRows = getDepthsAccuracyBreakdownRows(getDepthsCardAccuracyUpgradeBreakdown(card));
  const cooldownBreakdown = getDepthsEffectiveCooldownBreakdown(card, champion);
  const cooldownRows = getDepthsCooldownRows(cooldownBreakdown);
  const deckCopies = getDepthsCardDeckCopies(card);

  return (
    <Button
      disabled={disabled}
      onClick={() => {
        if (!disabled) onChoose(card);
      }}
      sx={{
        ...getSelectableChoiceSx(selected, card.rarity),
        width: "100%",
        height: "100%",
        minHeight: 390,
        p: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "space-between",
        textAlign: "left",
        color: THEME.text,
        border: `1px solid ${getDepthsRarityBorder(card.rarity, selected)}`,
        borderRadius: 1,
        opacity: disabled && !selected ? 0.42 : 1,
        background: selected
          ? "linear-gradient(180deg, rgba(225,184,100,0.15), rgba(0,0,0,0.92))"
          : "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.92))",
        textTransform: "none",
        "&:hover": disabled
          ? undefined
          : {
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(0,0,0,0.88))",
          borderColor: THEME.gold,
        },
      }}
    >
      <Box>
        <Box
          sx={{
            position: "relative",
            width: "100%",
            aspectRatio: "1 / 1",
            display: "grid",
            placeItems: "center",
            border: `1px solid ${THEME.line}`,
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.13), transparent 48%), rgba(0,0,0,0.72)",
            mb: 1.4,
            overflow: "hidden",
          }}
        >
          {previewSrc ? (
            <Box
              component="img"
              src={previewSrc}
              alt=""
              sx={{ maxWidth: "76%", maxHeight: "82%", objectFit: "contain" }}
            />
          ) : (
            <Typography sx={{ color: THEME.faint, fontSize: 12 }}>No preview</Typography>
          )}
          <DepthsDeckCountBadge count={deckCopies} />
          <SelectionCheckOverlay selected={selected} />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ ...medievalText, color: THEME.gold, fontSize: 11 }}>
            {getDepthsRarityStyle(card.rarity).label} | {card.type}
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Chip
              size="small"
              label={`CD ${formatDepthsNumber(cooldownBreakdown.finalCooldown)}s`}
              sx={{
                height: 24,
                color: cooldownBreakdown.delta < -0.05 ? THEME.gold : THEME.text,
                border: `1px solid ${THEME.line}`,
                background: "rgba(0,0,0,0.58)",
                "& .MuiChip-label": { px: 0.9, fontSize: 10, fontWeight: 800 },
              }}
            />
          </Box>
        </Box>
        <Typography
          sx={{
            color: THEME.text,
            fontFamily: "Jacques, Georgia, serif",
            fontSize: { xs: 22, md: 26 },
            letterSpacing: "0.08em",
            lineHeight: 1.05,
            mt: 0.6,
          }}
        >
          {card.name}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6, mt: 1.2 }}>
          <DepthsStatIconPill icon={POWER_ICON_SRC} alt="power" value={formatDepthsNumber(powerBreakdown.finalPower)} />
          <DepthsStatIconPill icon={ACCURACY_ICON_SRC} alt="accuracy" value={card.accuracy} />
          <Chip label={targetLabel} size="small" sx={{ color: THEME.gold, border: `1px solid ${THEME.line}`, background: "rgba(0,0,0,0.42)" }} />
        </Box>
        {powerBreakdownRows.length ? (
          <Box sx={{ mt: 0.7, display: "grid", gap: 0.2 }}>
            {powerBreakdownRows.map((row) => (
              <Typography key={row} sx={{ color: THEME.muted, fontSize: 10.5, lineHeight: 1.3 }}>
                {row}
              </Typography>
            ))}
          </Box>
        ) : null}
        {accuracyRows.length ? (
          <Box sx={{ mt: 0.5, display: "grid", gap: 0.2 }}>
            {accuracyRows.map((row) => (
              <Typography key={row} sx={{ color: THEME.faint, fontSize: 10, lineHeight: 1.25 }}>
                {row}
              </Typography>
            ))}
          </Box>
        ) : null}
        {cooldownRows.length ? (
          <Box sx={{ mt: 0.5, display: "grid", gap: 0.2 }}>
            {cooldownRows.map((row) => (
              <Typography key={row} sx={{ color: THEME.faint, fontSize: 10, lineHeight: 1.25 }}>
                {row}
              </Typography>
            ))}
          </Box>
        ) : null}
        {effectRows.length ? (
          <Box sx={{ display: "grid", gap: 0.7, mt: 1.4 }}>
            {effectRows.map((row) => (
              <Box
                key={row.key}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  color: THEME.text,
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 1,
                  background: "rgba(255,255,255,0.045)",
                  px: 1,
                  py: 0.7,
                  fontSize: 10.5,
                  fontWeight: 800,
                  lineHeight: 1.35,
                  overflowWrap: "anywhere",
                  textAlign: "left",
                  whiteSpace: "normal",
                }}
              >
                {row.icon ? (
                  <EffectTooltipIcon
                    effectKey={row.effectKey}
                    src={row.icon}
                    size={24}
                  />
                ) : null}
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: THEME.text, fontSize: 11.5, fontWeight: 900, lineHeight: 1.2 }}>
                    {row.label} {formatDepthsNumber(row.finalAmount)}
                  </Typography>
                  {row.potencyBonus ? (
                    <Typography sx={{ color: THEME.muted, fontSize: 9.8, lineHeight: 1.25 }}>
                      base {formatDepthsNumber(row.baseAmount)}
                      {row.upgradeBonus
                        ? ` ${formatSignedAmount(row.upgradeBonus)} from card upgrades`
                        : ""}
                      {row.championPotency
                        ? ` + ${formatDepthsNumber(row.championPotency * row.potencyMultiplier)} from champion ${row.label} potency x${row.potencyMultiplier}`
                        : ""}
                      {row.artifactPotency
                        ? ` + ${formatDepthsNumber(row.artifactPotency)} from artifacts`
                        : ""}
                    </Typography>
                  ) : (
                    <Typography sx={{ color: THEME.faint, fontSize: 9.8, lineHeight: 1.25 }}>
                      base {formatDepthsNumber(row.baseAmount)}
                      {row.upgradeBonus
                        ? ` ${formatSignedAmount(row.upgradeBonus)} from card upgrades`
                        : ""}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        ) : null}
      </Box>
    </Button>
  );
}

function ChoiceDetailTooltip({ title, children }) {
  return (
    <Tooltip
      arrow
      placement="top"
      enterDelay={120}
      leaveDelay={70}
      enterTouchDelay={0}
      leaveTouchDelay={5000}
      title={title}
      PopperProps={{
        modifiers: [
          {
            name: "offset",
            options: { offset: [0, 12] },
          },
          {
            name: "flip",
            options: { fallbackPlacements: ["bottom", "right", "left", "top"] },
          },
          {
            name: "preventOverflow",
            options: { boundary: "viewport", padding: 12 },
          },
        ],
      }}
      componentsProps={{
        tooltip: {
          sx: {
            maxWidth: { xs: "calc(100vw - 28px)", sm: 410 },
            p: 0,
            color: THEME.text,
            border: `1px solid ${THEME.lineStrong}`,
            borderRadius: 1,
            background:
              "linear-gradient(180deg, rgba(20,20,20,0.98), rgba(3,3,3,0.98))",
            boxShadow: "0 20px 46px rgba(0,0,0,0.72)",
          },
        },
        arrow: {
          sx: {
            color: "rgba(8,8,8,0.98)",
            "&::before": {
              border: `1px solid ${THEME.lineStrong}`,
            },
          },
        },
      }}
    >
      <Box component="span" sx={{ display: "block", height: "100%" }}>
        {children}
      </Box>
    </Tooltip>
  );
}

function ArtifactChoiceDetail({ artifact = {} }) {
  const additions = formatArtifactAdditions(artifact);
  const rarity = getDepthsRarityStyle(artifact.rarity);

  return (
    <Box
      sx={{
        width: { xs: "calc(100vw - 32px)", sm: 380 },
        maxHeight: "min(76vh, 610px)",
        overflowY: "auto",
        p: 1.35,
      }}
    >
      <Box sx={{ display: "flex", gap: 1.2, alignItems: "center" }}>
        <Box
          sx={{
            width: 86,
            aspectRatio: "1 / 1",
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
            border: `1px solid ${getDepthsRarityBorder(artifact.rarity)}`,
            borderRadius: 1,
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.14), transparent 55%), rgba(0,0,0,0.72)",
          }}
        >
          {artifact.imageSrc ? (
            <Box
              component="img"
              src={artifact.imageSrc}
              alt={artifact.name || "Artifact"}
              draggable={false}
              sx={{
                width: "82%",
                height: "82%",
                objectFit: "contain",
                filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.6))",
              }}
            />
          ) : null}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ ...medievalText, color: rarity.color, fontSize: 10 }}>
            {rarity.label} Artifact
          </Typography>
          <Typography sx={{ color: THEME.text, fontSize: 20, fontWeight: 950, lineHeight: 1.08, mt: 0.35 }}>
            {artifact.name}
          </Typography>
          {artifact.traitAwakening ? (
            <Chip
              size="small"
              label={artifact.traitAwakening}
              sx={{
                height: 22,
                mt: 0.75,
                color: THEME.gold,
                border: `1px solid ${THEME.gold}`,
                background: "rgba(225,184,100,0.1)",
                "& .MuiChip-label": { px: 0.8, fontSize: 9, fontWeight: 900 },
              }}
            />
          ) : null}
        </Box>
      </Box>
      {artifact.description ? (
        <Typography sx={{ color: THEME.muted, fontSize: 12.5, lineHeight: 1.45, mt: 1.3 }}>
          {artifact.description}
        </Typography>
      ) : null}
      {additions.length ? (
        <Box sx={{ mt: 1.3, display: "grid", gap: 0.55 }}>
          {additions.map((addition) => (
            <ArtifactAbilityRow key={addition} text={addition} />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

function QuestArtifactRewardTile({ artifact }) {
  if (!artifact) return null;

  return (
    <ChoiceDetailTooltip title={<ArtifactChoiceDetail artifact={artifact} />}>
      <Box
        sx={{
          width: 96,
          display: "grid",
          gap: 0.65,
          justifyItems: "center",
          p: 0.8,
          color: THEME.text,
          border: `1px solid ${getDepthsRarityBorder(artifact.rarity)}`,
          borderRadius: 1,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(0,0,0,0.68))",
          boxShadow: getDepthsRarityBoxShadow(artifact.rarity),
        }}
      >
        <Box
          sx={{
            width: 70,
            aspectRatio: "1 / 1",
            display: "grid",
            placeItems: "center",
            border: `1px solid ${THEME.line}`,
            borderRadius: 1,
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.16), transparent 58%), rgba(0,0,0,0.48)",
          }}
        >
          {artifact.imageSrc ? (
            <Box
              component="img"
              src={artifact.imageSrc}
              alt={artifact.name || "Artifact"}
              draggable={false}
              sx={{
                width: "84%",
                height: "84%",
                objectFit: "contain",
                filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.58))",
              }}
            />
          ) : null}
        </Box>
        <Typography
          sx={{
            color: THEME.text,
            fontSize: 10.5,
            fontWeight: 900,
            lineHeight: 1.12,
            textAlign: "center",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {artifact.name}
        </Typography>
      </Box>
    </ChoiceDetailTooltip>
  );
}

function DepthsCardChoiceDetail({ card = {}, champion = null }) {
  const effectRows = getDepthsCardEffectRows(card, champion);
  const previewSrc = getDepthsCardPreviewSrc(card);
  const targetLabel = getDepthsCardTargetLabel(card);
  const powerBreakdown = getDepthsCardPowerBreakdown(card, champion);
  const powerBreakdownRows = getDepthsPowerBreakdownRows(powerBreakdown);
  const accuracyRows = getDepthsAccuracyBreakdownRows(getDepthsCardAccuracyUpgradeBreakdown(card));
  const cooldownBreakdown = getDepthsEffectiveCooldownBreakdown(card, champion);
  const cooldownRows = getDepthsCooldownRows(cooldownBreakdown);
  const rarity = getDepthsRarityStyle(card.rarity);

  return (
    <Box
      sx={{
        width: { xs: "calc(100vw - 32px)", sm: 390 },
        maxHeight: "min(76vh, 650px)",
        overflowY: "auto",
        p: 1.35,
      }}
    >
      <Box sx={{ display: "flex", gap: 1.2, alignItems: "center" }}>
        <Box
          sx={{
            width: 96,
            aspectRatio: "1 / 1",
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
            border: `1px solid ${getDepthsRarityBorder(card.rarity)}`,
            borderRadius: 1,
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.13), transparent 50%), rgba(0,0,0,0.72)",
            overflow: "hidden",
          }}
        >
          {previewSrc ? (
            <Box
              component="img"
              src={previewSrc}
              alt={card.name || "Depths card"}
              draggable={false}
              sx={{ maxWidth: "78%", maxHeight: "84%", objectFit: "contain" }}
            />
          ) : (
            <Typography sx={{ color: THEME.faint, fontSize: 11 }}>No preview</Typography>
          )}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ ...medievalText, color: rarity.color, fontSize: 10 }}>
            {rarity.label} | {card.type || "Depths Card"}
          </Typography>
          <Typography sx={{ color: THEME.text, fontSize: 20, fontWeight: 950, lineHeight: 1.08, mt: 0.35 }}>
            {card.name}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.55, mt: 0.9 }}>
            <DepthsStatIconPill
              icon={POWER_ICON_SRC}
              alt="power"
              value={formatDepthsNumber(powerBreakdown.finalPower)}
            />
            <DepthsStatIconPill
              icon={ACCURACY_ICON_SRC}
              alt="accuracy"
              value={card.accuracy}
            />
            <Chip
              size="small"
              label={`CD ${formatDepthsNumber(cooldownBreakdown.finalCooldown)}s`}
              sx={{
                height: 24,
                color: cooldownBreakdown.delta < -0.05 ? THEME.gold : THEME.text,
                border: `1px solid ${THEME.line}`,
                background: "rgba(0,0,0,0.58)",
                "& .MuiChip-label": { px: 0.9, fontSize: 10, fontWeight: 850 },
              }}
            />
            <Chip
              label={targetLabel}
              size="small"
              sx={{
                height: 24,
                color: THEME.gold,
                border: `1px solid ${THEME.line}`,
                background: "rgba(0,0,0,0.42)",
                "& .MuiChip-label": { px: 0.9, fontSize: 10, fontWeight: 850 },
              }}
            />
          </Box>
        </Box>
      </Box>

      {powerBreakdownRows.length ? (
        <Box sx={{ mt: 1.1, display: "grid", gap: 0.25 }}>
          {powerBreakdownRows.map((row) => (
            <Typography key={row} sx={{ color: THEME.muted, fontSize: 10.5, lineHeight: 1.3 }}>
              {row}
            </Typography>
          ))}
        </Box>
      ) : null}

      {accuracyRows.length ? (
        <Box sx={{ mt: 0.65, display: "grid", gap: 0.25 }}>
          {accuracyRows.map((row) => (
            <Typography key={row} sx={{ color: THEME.faint, fontSize: 10, lineHeight: 1.25 }}>
              {row}
            </Typography>
          ))}
        </Box>
      ) : null}

      {cooldownRows.length ? (
        <Box sx={{ mt: 0.65, display: "grid", gap: 0.25 }}>
          {cooldownRows.map((row) => (
            <Typography key={row} sx={{ color: THEME.faint, fontSize: 10, lineHeight: 1.25 }}>
              {row}
            </Typography>
          ))}
        </Box>
      ) : null}

      {effectRows.length ? (
        <Box sx={{ display: "grid", gap: 0.65, mt: 1.2 }}>
          {effectRows.map((row) => (
            <Box
              key={row.key}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                color: THEME.text,
                border: `1px solid ${THEME.line}`,
                borderRadius: 1,
                background: "rgba(255,255,255,0.045)",
                px: 1,
                py: 0.7,
                textAlign: "left",
              }}
            >
              {row.icon ? (
                <EffectTooltipIcon effectKey={row.effectKey} src={row.icon} size={24} />
              ) : null}
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: THEME.text, fontSize: 11.5, fontWeight: 900, lineHeight: 1.2 }}>
                  {row.label} {formatDepthsNumber(row.finalAmount)}
                </Typography>
                <Typography sx={{ color: row.potencyBonus ? THEME.muted : THEME.faint, fontSize: 9.8, lineHeight: 1.25 }}>
                  base {formatDepthsNumber(row.baseAmount)}
                  {row.upgradeBonus
                    ? ` ${formatSignedAmount(row.upgradeBonus)} from card upgrades`
                    : ""}
                  {row.championPotency
                    ? ` + ${formatDepthsNumber(row.championPotency * row.potencyMultiplier)} from champion ${row.label} potency x${row.potencyMultiplier}`
                    : ""}
                  {row.artifactPotency
                    ? ` + ${formatDepthsNumber(row.artifactPotency)} from artifacts`
                    : ""}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

function CompactArtifactChoiceTile({
  artifact,
  onChoose,
  selected = false,
  disabled = false,
}) {
  return (
    <ChoiceDetailTooltip title={<ArtifactChoiceDetail artifact={artifact} />}>
      <Box
        component="button"
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) onChoose(artifact);
        }}
        sx={{
          ...getSelectableChoiceSx(selected, artifact.rarity),
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: { xs: 118, sm: 132, md: 142 },
          p: 0,
          color: THEME.text,
          textAlign: "center",
          border: `1px solid ${getDepthsRarityBorder(artifact.rarity, selected)}`,
          borderRadius: 1,
          overflow: "hidden",
          opacity: disabled && !selected ? 0.42 : 1,
          background: selected
            ? "linear-gradient(180deg, rgba(225,184,100,0.2), rgba(0,0,0,0.62))"
            : "linear-gradient(180deg, rgba(0,0,0,0.34), rgba(0,0,0,0.58))",
          cursor: disabled ? "not-allowed" : "pointer",
          font: "inherit",
          boxShadow: selected
            ? getDepthsRarityBoxShadow(artifact.rarity, true)
            : "0 12px 28px rgba(0,0,0,0.34)",
          "&:hover": disabled
            ? undefined
            : {
                borderColor: THEME.gold,
                background:
                  "linear-gradient(180deg, rgba(225,184,100,0.13), rgba(0,0,0,0.66))",
              },
        }}
      >
        <Box
          sx={{
            height: { xs: 78, sm: 90, md: 98 },
            display: "grid",
            placeItems: "center",
            borderBottom: `1px solid ${THEME.line}`,
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.15), transparent 55%), rgba(0,0,0,0.24)",
          }}
        >
          {artifact.imageSrc ? (
            <Box
              component="img"
              src={artifact.imageSrc}
              alt={artifact.name}
              draggable={false}
              sx={{
                width: "78%",
                height: "78%",
                objectFit: "contain",
                filter: "drop-shadow(0 14px 18px rgba(0,0,0,0.58))",
              }}
            />
          ) : null}
        </Box>
        <Box sx={{ minHeight: 46, display: "grid", placeItems: "center", px: 0.8, py: 0.65 }}>
          <Typography
            sx={{
              color: THEME.text,
              fontSize: { xs: 11, sm: 12 },
              fontWeight: 900,
              lineHeight: 1.15,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {artifact.name}
          </Typography>
        </Box>
        <SelectionCheckOverlay selected={selected} label="Chosen" />
      </Box>
    </ChoiceDetailTooltip>
  );
}

function CompactDepthsCardChoiceTile({
  card,
  champion = null,
  onChoose,
  selected = false,
  disabled = false,
}) {
  const previewSrc = getDepthsCardPreviewSrc(card);

  return (
    <ChoiceDetailTooltip title={<DepthsCardChoiceDetail card={card} champion={champion} />}>
      <Box
        component="button"
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) onChoose(card);
        }}
        sx={{
          ...getSelectableChoiceSx(selected, card.rarity),
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: { xs: 118, sm: 132, md: 142 },
          p: 0,
          color: THEME.text,
          textAlign: "center",
          border: `1px solid ${getDepthsRarityBorder(card.rarity, selected)}`,
          borderRadius: 1,
          overflow: "hidden",
          opacity: disabled && !selected ? 0.42 : 1,
          background: selected
            ? "linear-gradient(180deg, rgba(225,184,100,0.2), rgba(0,0,0,0.62))"
            : "linear-gradient(180deg, rgba(0,0,0,0.34), rgba(0,0,0,0.58))",
          cursor: disabled ? "not-allowed" : "pointer",
          font: "inherit",
          boxShadow: selected
            ? getDepthsRarityBoxShadow(card.rarity, true)
            : "0 12px 28px rgba(0,0,0,0.34)",
          "&:hover": disabled
            ? undefined
            : {
                borderColor: THEME.gold,
                background:
                  "linear-gradient(180deg, rgba(225,184,100,0.13), rgba(0,0,0,0.66))",
              },
        }}
      >
        <Box
          sx={{
            height: { xs: 78, sm: 90, md: 98 },
            display: "grid",
            placeItems: "center",
            borderBottom: `1px solid ${THEME.line}`,
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.13), transparent 50%), rgba(0,0,0,0.28)",
          }}
        >
          {previewSrc ? (
            <Box
              component="img"
              src={previewSrc}
              alt={card.name}
              draggable={false}
              sx={{ maxWidth: "78%", maxHeight: "84%", objectFit: "contain" }}
            />
          ) : (
            <Typography sx={{ color: THEME.faint, fontSize: 11 }}>No preview</Typography>
          )}
        </Box>
        <Box sx={{ minHeight: 46, display: "grid", placeItems: "center", px: 0.8, py: 0.65 }}>
          <Typography
            sx={{
              color: THEME.text,
              fontSize: { xs: 11, sm: 12 },
              fontWeight: 900,
              lineHeight: 1.15,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {card.name}
          </Typography>
        </Box>
        <SelectionCheckOverlay selected={selected} label="Chosen" />
      </Box>
    </ChoiceDetailTooltip>
  );
}

function DepthsScenePanel({ bgSrc, children, minHeight = { xs: "calc(100vh - 190px)", md: "calc(100vh - 178px)" } }) {
  return (
    <Box>
      <Box
        sx={{
          ...panelStyle,
          position: "relative",
          minHeight,
          p: 0,
          backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.56) 0%, rgba(0,0,0,0.12) 44%, rgba(0,0,0,0.54) 100%), linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.58)), url(${bgSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 32%, rgba(225,184,100,0.07), transparent 30%), radial-gradient(circle at 50% 100%, rgba(0,0,0,0.03), rgba(0,0,0,0.38) 76%)",
            pointerEvents: "none",
          }}
        />
        <Box sx={{ position: "relative", zIndex: 1, p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

function DepthsChoiceHeader({ title, text, action = null }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
        mb: 2.4,
        p: { xs: 1.35, md: 1.65 },
        border: `1px solid ${THEME.line}`,
        borderRadius: 1,
        background: "rgba(0,0,0,0.56)",
        backdropFilter: "blur(2px)",
      }}
    >
      <Box>
        <Typography sx={{ ...medievalText, color: THEME.text, fontSize: { xs: 22, md: 32 } }}>
          {title}
        </Typography>
        {text ? (
          <Typography sx={{ color: THEME.muted, fontSize: 14, mt: 0.7 }}>
            {text}
          </Typography>
        ) : null}
      </Box>
      {action ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          {action}
        </Box>
      ) : null}
    </Box>
  );
}

function DepthsCompactChoiceSection({ title, children, sx = {} }) {
  return (
    <Box
      sx={{
        p: { xs: 1.25, md: 1.5 },
        border: `1px solid ${THEME.line}`,
        borderRadius: 1,
        background:
          "linear-gradient(180deg, rgba(0,0,0,0.66), rgba(0,0,0,0.46))",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.045), 0 12px 32px rgba(0,0,0,0.34)",
        backdropFilter: "blur(2px)",
        ...sx,
      }}
    >
      {title ? (
        <Typography sx={{ ...medievalText, color: THEME.gold, fontSize: 11, mb: 1.1 }}>
          {title}
        </Typography>
      ) : null}
      {children}
    </Box>
  );
}

function DepthsFloatingChoiceRow({ title, children, sx = {} }) {
  return (
    <Box sx={{ width: "100%", textAlign: "center", ...sx }}>
      {title ? (
        <Typography
          sx={{
            ...medievalText,
            color: THEME.gold,
            fontSize: 11,
            mb: 1.15,
            textShadow: "0 2px 8px rgba(0,0,0,0.8)",
          }}
        >
          {title}
        </Typography>
      ) : null}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: { xs: 1.15, sm: 1.5, md: 2.4 },
          flexWrap: "wrap",
          mx: "auto",
          maxWidth: 980,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function DepthsFloatingChoiceSlot({ children }) {
  return (
    <Box sx={{ width: { xs: 104, sm: 124, md: 146 }, flex: "0 0 auto" }}>
      {children}
    </Box>
  );
}

function DepthsMoveChoiceDetail({ move = {}, moveIndex = 0, champion = null }) {
  const previewSrc = getCardUpgradeMovePreviewSrc(move);
  const labels = move.depthsCardUpgradeMeta?.labels || [];
  const cooldownBreakdown = getDepthsEffectiveCooldownBreakdown(move, champion);
  const cooldownRows = getDepthsCooldownRows(cooldownBreakdown);
  const powerBreakdown = getDepthsMovePowerBreakdown(move, champion);
  const powerBreakdownRows = getDepthsPowerBreakdownRows(powerBreakdown);
  const accuracyRows = getDepthsAccuracyBreakdownRows(getDepthsCardAccuracyUpgradeBreakdown(move));
  const effectRows = getDepthsMoveEffectRows(move, champion);

  return (
    <Box
      sx={{
        width: { xs: "calc(100vw - 32px)", sm: 390 },
        maxHeight: "min(76vh, 650px)",
        overflowY: "auto",
        p: 1.35,
      }}
    >
      <Box sx={{ display: "flex", gap: 1.2, alignItems: "center" }}>
        <Box
          sx={{
            width: 96,
            aspectRatio: "1 / 1",
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
            border: `1px solid ${THEME.lineStrong}`,
            borderRadius: 1,
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.13), transparent 50%), rgba(0,0,0,0.72)",
            overflow: "hidden",
          }}
        >
          {previewSrc ? (
            <Box
              component="img"
              src={previewSrc}
              alt={move.name || `Card ${moveIndex + 1}`}
              draggable={false}
              sx={{ maxWidth: "72%", maxHeight: "86%", objectFit: "contain" }}
            />
          ) : (
            <Typography sx={{ color: THEME.faint, fontSize: 11 }}>No preview</Typography>
          )}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ ...medievalText, color: THEME.gold, fontSize: 10 }}>
            {move.type || move.category || "Champion Card"}
          </Typography>
          <Typography sx={{ color: THEME.text, fontSize: 20, fontWeight: 950, lineHeight: 1.08, mt: 0.35 }}>
            {move.name || `Card ${moveIndex + 1}`}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.55, mt: 0.9 }}>
            <DepthsStatIconPill icon={POWER_ICON_SRC} alt="power" value={formatDepthsNumber(powerBreakdown.finalPower)} />
            <DepthsStatIconPill icon={ACCURACY_ICON_SRC} alt="accuracy" value={formatDepthsNumber(finiteNumber(move.accuracy, 0))} />
            <DepthsStatIconPill
              icon={DEPTHS_STAT_ICON_BY_KEY.cooldown}
              alt="cooldown"
              value={`${formatDepthsNumber(cooldownBreakdown.finalCooldown)}s`}
            />
          </Box>
        </Box>
      </Box>

      {powerBreakdownRows.length ? (
        <Box sx={{ mt: 1.1, display: "grid", gap: 0.25 }}>
          {powerBreakdownRows.map((row) => (
            <Typography key={row} sx={{ color: THEME.muted, fontSize: 10.5, lineHeight: 1.3 }}>
              {row}
            </Typography>
          ))}
        </Box>
      ) : null}

      {accuracyRows.length ? (
        <Box sx={{ mt: 0.65, display: "grid", gap: 0.25 }}>
          {accuracyRows.map((row) => (
            <Typography key={row} sx={{ color: THEME.faint, fontSize: 10, lineHeight: 1.25 }}>
              {row}
            </Typography>
          ))}
        </Box>
      ) : null}

      {cooldownRows.length ? (
        <Box sx={{ mt: 0.65, display: "grid", gap: 0.25 }}>
          {cooldownRows.map((row) => (
            <Typography key={row} sx={{ color: THEME.faint, fontSize: 10, lineHeight: 1.25 }}>
              {row}
            </Typography>
          ))}
        </Box>
      ) : null}

      {effectRows.length ? (
        <Box sx={{ mt: 1.1, display: "grid", gap: 0.55 }}>
          {effectRows.map((row) => (
            <Box
              key={row.key}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 0.65,
                border: `1px solid ${THEME.line}`,
                borderRadius: 1,
                background: "rgba(255,255,255,0.04)",
                px: 0.8,
                py: 0.65,
              }}
            >
              {row.icon ? (
                <EffectTooltipIcon effectKey={row.effectKey} src={row.icon} size={22} />
              ) : null}
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: THEME.gold, fontSize: 11.5, fontWeight: 900, lineHeight: 1.2 }}>
                  {row.label} {formatDepthsNumber(row.finalAmount)}
                </Typography>
                <Typography sx={{ color: THEME.faint, fontSize: 9.8, lineHeight: 1.25, mt: 0.1 }}>
                  base {formatDepthsNumber(row.baseAmount)}
                  {row.upgradeBonus ? ` ${formatSignedAmount(row.upgradeBonus)} from card upgrades` : ""}
                  {row.championPotency
                    ? ` + ${formatDepthsNumber(row.championPotency * row.potencyMultiplier)} champion potency`
                    : ""}
                  {row.artifactPotency ? ` + ${formatDepthsNumber(row.artifactPotency)} artifacts` : ""}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      ) : null}

      {labels.length ? (
        <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.45 }}>
          {labels.map((label) => (
            <Chip
              key={label}
              size="small"
              label={label}
              sx={{ color: THEME.text, border: `1px solid ${THEME.line}`, background: "rgba(255,255,255,0.05)" }}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

function CompactCardUpgradeMoveTile({
  move,
  moveIndex,
  champion = null,
  selected = false,
  disabled = false,
  onChoose,
}) {
  const previewSrc = getCardUpgradeMovePreviewSrc(move);
  const deckCopies = getDepthsMoveDeckCopies(move);

  return (
    <ChoiceDetailTooltip title={<DepthsMoveChoiceDetail move={move} moveIndex={moveIndex} champion={champion} />}>
      <Box
        component="button"
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) onChoose(moveIndex);
        }}
        sx={{
          ...getSelectableChoiceSx(selected, selected ? "rare" : "common"),
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: { xs: 138, sm: 154, md: 168 },
          p: 0,
          color: THEME.text,
          textAlign: "center",
          border: `1px solid ${selected ? THEME.gold : THEME.line}`,
          borderRadius: 1,
          overflow: "hidden",
          opacity: disabled && !selected ? 0.42 : 1,
          background: selected
            ? "linear-gradient(180deg, rgba(225,184,100,0.18), rgba(0,0,0,0.9))"
            : "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.82))",
          cursor: disabled ? "not-allowed" : "pointer",
          font: "inherit",
          "&:hover": disabled
            ? undefined
            : {
                borderColor: THEME.gold,
                background:
                  "linear-gradient(180deg, rgba(225,184,100,0.13), rgba(0,0,0,0.88))",
              },
        }}
      >
        <Box
          sx={{
            position: "relative",
            height: { xs: 96, sm: 110, md: 122 },
            display: "grid",
            placeItems: "center",
            borderBottom: `1px solid ${THEME.line}`,
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.13), transparent 50%), rgba(0,0,0,0.62)",
          }}
        >
          {previewSrc ? (
            <Box
              component="img"
              src={previewSrc}
              alt={move.name || `Card ${moveIndex + 1}`}
              draggable={false}
              sx={{ maxWidth: "68%", maxHeight: "84%", objectFit: "contain" }}
            />
          ) : (
            <Typography sx={{ color: THEME.faint, fontSize: 11 }}>No preview</Typography>
          )}
          <DepthsDeckCountBadge count={deckCopies} />
        </Box>
        <Box sx={{ minHeight: 46, display: "grid", placeItems: "center", px: 0.8, py: 0.65 }}>
          <Typography
            sx={{
              color: THEME.text,
              fontSize: { xs: 11, sm: 12 },
              fontWeight: 900,
              lineHeight: 1.15,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {move.name || `Card ${moveIndex + 1}`}
          </Typography>
        </Box>
        <SelectionCheckOverlay selected={selected} label="Chosen" />
      </Box>
    </ChoiceDetailTooltip>
  );
}

function getCardUpgradeIconSrc(upgrade = {}) {
  const secondaryEffect = (upgrade.secondaryEffects || [])
    .map((entry) => String(entry.effectKey || entry.effect || "").toLowerCase())
    .find((key) => DEPTHS_EFFECT_ICON_BY_KEY[key]);
  if (secondaryEffect) return DEPTHS_EFFECT_ICON_BY_KEY[secondaryEffect];
  if (upgrade.effectPotencyBonus || upgrade.effectPotencyMultiplier) return DEPTHS_EFFECT_ICON_BY_KEY.empower;
  if (upgrade.powerDelta || upgrade.powerMultiplier) return POWER_ICON_SRC;
  if (upgrade.accuracyDelta) return ACCURACY_ICON_SRC;
  if (upgrade.cooldownDelta) return DEPTHS_STAT_ICON_BY_KEY.cooldown;
  if (upgrade.critChanceBonus) return DEPTHS_STAT_ICON_BY_KEY.critChance;
  if (upgrade.repeatCount || upgrade.multiTarget) return DEPTHS_EFFECT_ICON_BY_KEY.focus;
  return "";
}

function CardUpgradeChoiceDetail({ upgrade = {} }) {
  const additions = formatCardUpgradeAdditions(upgrade);
  const iconSrc = getCardUpgradeIconSrc(upgrade);

  return (
    <Box
      sx={{
        width: { xs: "calc(100vw - 32px)", sm: 360 },
        maxHeight: "min(74vh, 560px)",
        overflowY: "auto",
        p: 1.35,
      }}
    >
      <Box sx={{ display: "flex", gap: 1.1, alignItems: "center" }}>
        <Box
          sx={{
            width: 82,
            aspectRatio: "1 / 1",
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
            border: `1px solid ${THEME.lineStrong}`,
            borderRadius: 1,
            background:
              "radial-gradient(circle at center, rgba(225,184,100,0.18), transparent 56%), rgba(0,0,0,0.72)",
          }}
        >
          {iconSrc ? (
            <Box
              component="img"
              src={iconSrc}
              alt=""
              draggable={false}
              sx={{
                width: "58%",
                height: "58%",
                objectFit: "contain",
                filter: "drop-shadow(0 0 14px rgba(225,184,100,0.22))",
              }}
            />
          ) : (
            <AutoAwesomeIcon sx={{ color: THEME.gold, fontSize: 38 }} />
          )}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ ...medievalText, color: THEME.gold, fontSize: 10 }}>
            Card Upgrade
          </Typography>
          <Typography sx={{ color: THEME.text, fontSize: 20, fontWeight: 950, lineHeight: 1.08, mt: 0.35 }}>
            {upgrade.name}
          </Typography>
          {upgrade.traitAwakening ? (
            <Chip
              size="small"
              label={upgrade.traitAwakening}
              sx={{
                height: 22,
                mt: 0.75,
                color: THEME.gold,
                border: `1px solid ${THEME.gold}`,
                background: "rgba(225,184,100,0.1)",
                "& .MuiChip-label": { px: 0.8, fontSize: 9, fontWeight: 900 },
              }}
            />
          ) : null}
        </Box>
      </Box>
      {upgrade.description ? (
        <Typography sx={{ color: THEME.muted, fontSize: 12.5, lineHeight: 1.45, mt: 1.2 }}>
          {upgrade.description}
        </Typography>
      ) : null}
      {additions.length ? (
        <Box sx={{ display: "grid", gap: 0.55, mt: 1.2 }}>
          {additions.map((addition) => (
            <ArtifactAbilityRow key={addition} text={addition} />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

function CompactCardUpgradeChoiceTile({ upgrade, selected = false, disabled = false, onChoose }) {
  const iconSrc = getCardUpgradeIconSrc(upgrade);

  return (
    <ChoiceDetailTooltip title={<CardUpgradeChoiceDetail upgrade={upgrade} />}>
      <Box
        component="button"
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) onChoose(upgrade);
        }}
        sx={{
          ...getSelectableChoiceSx(selected, selected ? "rare" : "common"),
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: { xs: 132, md: 152 },
          p: 0,
          color: THEME.text,
          textAlign: "center",
          border: `1px solid ${selected ? THEME.gold : THEME.line}`,
          borderRadius: 1,
          overflow: "hidden",
          opacity: disabled && !selected ? 0.42 : 1,
          background: selected
            ? "linear-gradient(180deg, rgba(225,184,100,0.2), rgba(0,0,0,0.62))"
            : "linear-gradient(180deg, rgba(0,0,0,0.34), rgba(0,0,0,0.58))",
          cursor: disabled ? "not-allowed" : "pointer",
          font: "inherit",
          boxShadow: selected
            ? getDepthsRarityBoxShadow("rare", true)
            : "0 12px 28px rgba(0,0,0,0.34)",
          "&:hover": disabled
            ? undefined
            : {
                borderColor: THEME.gold,
                background:
                  "linear-gradient(180deg, rgba(225,184,100,0.13), rgba(0,0,0,0.66))",
              },
        }}
      >
        <Box
          sx={{
            height: { xs: 88, md: 104 },
            display: "grid",
            placeItems: "center",
            borderBottom: `1px solid ${THEME.line}`,
            background:
              "radial-gradient(circle at center, rgba(225,184,100,0.16), transparent 56%), rgba(0,0,0,0.62)",
          }}
        >
          {iconSrc ? (
            <Box
              component="img"
              src={iconSrc}
              alt=""
              draggable={false}
              sx={{
                width: 44,
                height: 44,
                objectFit: "contain",
                filter: "drop-shadow(0 0 14px rgba(225,184,100,0.2))",
              }}
            />
          ) : (
            <AutoAwesomeIcon sx={{ color: THEME.gold, fontSize: 38 }} />
          )}
        </Box>
        <Box sx={{ minHeight: 44, display: "grid", placeItems: "center", px: 0.8, py: 0.65 }}>
          <Typography
            sx={{
              color: THEME.text,
              fontSize: { xs: 11, sm: 12 },
              fontWeight: 900,
              lineHeight: 1.15,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {upgrade.name}
          </Typography>
        </Box>
        <SelectionCheckOverlay selected={selected} label="Chosen" />
      </Box>
    </ChoiceDetailTooltip>
  );
}

function getChampionEffectPotencyRows(charObj = {}) {
  return DEPTHS_EFFECT_KEYS
    .map((key) => {
      const championValue = finiteNumber(
        charObj?.effectPotencies?.[key] ??
          charObj?.itemEffectPotencies?.[key] ??
          charObj?.[key],
        0
      );
      const artifactValue = getChampionArtifactEffectPotencyBonus({ charObj }, key);
      return {
        key,
        championValue,
        artifactValue,
        value: championValue + artifactValue,
      };
    })
    .filter((entry) => entry.value);
}

function getDepthsFramesFromCandidates(candidates = [], fallback = "") {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const frames = candidate.filter((src) => typeof src === "string" && src.trim());
      if (frames.length) return frames.slice(0, 4);
    }
  }
  return fallback ? [fallback] : [];
}

function DepthsLoopingImage({ frames = [], alt = "", sx = {}, intervalMs = 260 }) {
  const [frameIndex, setFrameIndex] = useState(0);
  const cleanFrames = Array.isArray(frames) ? frames.filter(Boolean) : [];

  useEffect(() => {
    setFrameIndex(0);
    if (cleanFrames.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % cleanFrames.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [cleanFrames.join("|"), intervalMs]);

  if (!cleanFrames.length) return null;

  return (
    <Box
      component="img"
      src={cleanFrames[frameIndex % cleanFrames.length]}
      alt={alt}
      draggable={false}
      sx={sx}
    />
  );
}

function getChampionIdleFramesForBreakdown(champion = {}) {
  const charObj = champion?.charObj || {};
  return getDepthsFramesFromCandidates(
    [
      charObj.idleFrames,
      charObj.animation?.idle?.frameUrls,
      charObj.idleAnimation?.frameUrls,
      charObj.frames?.idle,
    ],
    champion?.imageUrl || charObj.standingUrl || charObj.imageUrl || ""
  );
}

function getMoveCasterFramesForBreakdown(move = {}) {
  return getDepthsFramesFromCandidates(
    [
      move.casterAnimation?.frameUrls,
      move.animationFrames,
      move.animationMeta?.frameUrls,
      move.characterFrames,
      move.characterAnimation?.frameUrls,
      move.frames,
    ],
    move.casterAnimation?.sheetUrl || move.url || move.characterUrl || move.image || ""
  );
}

function getMoveEffectFramesForBreakdown(move = {}) {
  return getDepthsFramesFromCandidates(
    [
      move.effectAnimation?.frameUrls,
      move.effectFrames,
      move.effectAnimationFrames,
      move.moveEffectFrames,
      move.visualFrames,
      move.moveVisualFrames,
      move.effectAnimationMeta?.frameUrls,
      move.effectMeta?.frameUrls,
      move.moveVisualMeta?.frameUrls,
      move.visualMeta?.frameUrls,
      move.moveVisual?.frameUrls,
    ],
    move.effectAnimation?.sheetUrl || move.effectUrl || move.visualUrl || move.moveVisualUrl || ""
  );
}

function getDepthsMovePreviewLayout(type = "") {
  const moveClass = getDepthsMoveClass(type);
  const range = getDepthsMoveRange(type);

  if (moveClass === "buff") return "buff";
  if (range === "melee") return "melee";
  return "projectile";
}

function buildBreakdownMoveSequenceFrames({
  charFrameCount,
  effectFrameCount,
  frameHold = BREAKDOWN_MOVE_CHAR_FRAME_HOLD,
  charLastFrameHold = BREAKDOWN_MOVE_CHAR_LAST_FRAME_HOLD,
  effectFrameHold = BREAKDOWN_MOVE_EFFECT_FRAME_HOLD,
  effectLastFrameHold = BREAKDOWN_MOVE_EFFECT_LAST_FRAME_HOLD,
}) {
  const safeCharCount = Math.max(1, charFrameCount || 1);
  const lastCharIndex = Math.max(0, safeCharCount - 1);
  const previewCharIndices = [0, 1, 2, 3].map((index) => Math.min(index, lastCharIndex));
  const sequence = [
    { charIndex: previewCharIndices[0], effectIndex: -1, duration: frameHold },
    { charIndex: previewCharIndices[1], effectIndex: -1, duration: frameHold },
    {
      charIndex: previewCharIndices[2],
      effectIndex: effectFrameCount > 0 ? 0 : -1,
      duration: frameHold,
    },
  ];

  if (effectFrameCount > 0) {
    if (effectFrameCount === 1) {
      sequence.push({
        charIndex: previewCharIndices[3],
        effectIndex: 0,
        duration: effectLastFrameHold,
      });
    } else {
      sequence.push({
        charIndex: previewCharIndices[3],
        effectIndex: 1,
        duration: effectFrameCount > 2 ? effectFrameHold : effectLastFrameHold,
      });

      for (let effectIndex = 2; effectIndex < effectFrameCount - 1; effectIndex += 1) {
        sequence.push({
          charIndex: previewCharIndices[3],
          effectIndex,
          duration: effectFrameHold,
        });
      }

      sequence.push({
        charIndex: previewCharIndices[3],
        effectIndex: effectFrameCount - 1,
        duration: effectLastFrameHold,
      });
    }
  } else {
    sequence.push({
      charIndex: previewCharIndices[3],
      effectIndex: -1,
      duration: charLastFrameHold,
    });
  }

  return sequence;
}

function getBreakdownMovePlaybackStepAtFrame(localFrame, charFrameCount, effectFrameCount) {
  const sequence = buildBreakdownMoveSequenceFrames({ charFrameCount, effectFrameCount });
  let cursor = Math.max(0, localFrame || 0);

  for (const step of sequence) {
    if (cursor < step.duration) {
      const effectProgress =
        effectFrameCount > 1 && step.effectIndex >= 0
          ? step.effectIndex / Math.max(1, effectFrameCount - 1)
          : step.effectIndex >= 0
          ? 1
          : 0;

      return {
        ...step,
        effectProgress,
      };
    }

    cursor -= step.duration;
  }

  return {
    charIndex: Math.max(0, (charFrameCount || 1) - 1),
    effectIndex: -1,
    effectProgress: 1,
  };
}

function useBreakdownLoopingMoveStep(move) {
  const characterFrames = getMoveCasterFramesForBreakdown(move);
  const effectFrames = getMoveEffectFramesForBreakdown(move);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const total = buildBreakdownMoveSequenceFrames({
      charFrameCount: Math.max(1, characterFrames.length || 1),
      effectFrameCount: effectFrames.length,
    }).reduce((sum, step) => sum + step.duration, BREAKDOWN_MOVE_CHAR_LAST_FRAME_HOLD);

    const interval = window.setInterval(() => {
      setFrame((prev) => (prev + 1) % total);
    }, BREAKDOWN_FRAME_MS);

    return () => window.clearInterval(interval);
  }, [characterFrames.join("|"), effectFrames.join("|")]);

  return getBreakdownMovePlaybackStepAtFrame(
    frame,
    Math.max(1, characterFrames.length || 1),
    effectFrames.length
  );
}

function ChampionIdleBreakdownPreview({ champion }) {
  const charObj = champion?.charObj || {};
  const frames = getChampionIdleFramesForBreakdown(champion);
  const background = champion?.backgroundImageUrl || charObj.backgroundImageUrl || charObj.backgroundUrl || ARENA_BG_SRC;

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: 300,
        display: "grid",
        placeItems: "center",
        border: `1px solid ${THEME.line}`,
        background: "#050505",
        overflow: "hidden",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.55,
          filter: "saturate(0.85)",
        }}
      />
      <DepthsLoopingImage
        frames={frames}
        alt={charObj.name || "Champion idle"}
        intervalMs={480}
        sx={{
          position: "relative",
          zIndex: 1,
          maxWidth: "78%",
          maxHeight: 270,
          objectFit: "contain",
          filter: "drop-shadow(0 20px 28px rgba(0,0,0,0.72))",
        }}
      />
    </Box>
  );
}

function DepthsMoveBreakdownPreview({ move, champion, deckCopies = 1 }) {
  const casterFrames = getMoveCasterFramesForBreakdown(move);
  const effectFrames = getMoveEffectFramesForBreakdown(move);
  const step = useBreakdownLoopingMoveStep(move);
  const layout = getDepthsMovePreviewLayout(move?.type || move?.category);
  const stageRef = useRef(null);
  const characterImgRef = useRef(null);
  const effectImgRef = useRef(null);
  const [buffEffectTopPx, setBuffEffectTopPx] = useState(null);
  const charObj = champion?.charObj || {};
  const currentCharacterSrc =
    casterFrames[Math.min(finiteNumber(step?.charIndex, 0), Math.max(0, casterFrames.length - 1))] ||
    casterFrames[0] ||
    move?.characterUrl ||
    "";
  const hasEffect = finiteNumber(step?.effectIndex, -1) >= 0 && effectFrames.length > 0;
  const currentEffectSrc = hasEffect
    ? effectFrames[Math.min(finiteNumber(step.effectIndex, 0), effectFrames.length - 1)]
    : "";
  const charProgress = Math.min(Math.max(finiteNumber(step?.charIndex, 0), 0), 3) / 3;
  const effectProgress = hasEffect ? finiteNumber(step?.effectProgress, 1) : 0;
  const previewBackground =
    champion?.backgroundImageUrl || charObj.backgroundImageUrl || charObj.backgroundUrl || ARENA_BG_SRC;

  useEffect(() => {
    if (layout !== "buff" || !currentEffectSrc) return undefined;

    let rafId = null;

    const measureBuffEffectTop = () => {
      const stageEl = stageRef.current;
      const charEl = characterImgRef.current;
      const effectEl = effectImgRef.current;
      if (!stageEl || !charEl || !effectEl) return;

      const charTop = charEl.offsetTop;
      const effectHeight = effectEl.offsetHeight || 0;
      setBuffEffectTopPx(Math.max(0, charTop - effectHeight - 28));
    };

    rafId = window.requestAnimationFrame(measureBuffEffectTop);
    window.addEventListener("resize", measureBuffEffectTop);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", measureBuffEffectTop);
    };
  }, [layout, currentCharacterSrc, currentEffectSrc, step?.charIndex, step?.effectIndex]);

  if (!currentCharacterSrc) {
    return (
      <Box
        sx={{
          height: 360,
          display: "grid",
          placeItems: "center",
          border: `1px solid ${THEME.line}`,
          color: THEME.faint,
          background: "rgba(0,0,0,0.62)",
        }}
      >
        No move image
      </Box>
    );
  }

  const moveLeftOffsetPx = layout === "buff" ? 0 : -3;
  const characterStyle = {
    position: "absolute",
    zIndex: 2,
    pointerEvents: "none",
    userSelect: "none",
    width: layout === "buff" ? "48%" : "64%",
    maxWidth: layout === "buff" ? 170 : 220,
    transition: "left 180ms linear, bottom 180ms linear, transform 180ms linear",
    filter: "drop-shadow(0 0 8px rgba(0,0,0,0.32))",
    marginLeft: moveLeftOffsetPx,
  };

  if (layout === "buff") {
    characterStyle.left = "50%";
    characterStyle.bottom = "8%";
    characterStyle.transform = "translateX(-50%)";
    characterStyle.marginLeft = 0;
  } else if (layout === "melee") {
    characterStyle.left = `${5 + charProgress * 7}%`;
    characterStyle.bottom = `${18 + charProgress * 1}%`;
    characterStyle.transform = "translateX(0)";
  } else {
    characterStyle.left = "5%";
    characterStyle.bottom = "18%";
    characterStyle.transform = "translateX(0)";
  }

  const effectStyle = currentEffectSrc
    ? {
        position: "absolute",
        zIndex: 3,
        pointerEvents: "none",
        userSelect: "none",
        width: layout === "buff" ? "20%" : "40%",
        maxWidth: layout === "buff" ? 92 : 170,
        opacity: hasEffect ? 1 : 0,
        transition:
          "left 180ms linear, bottom 180ms linear, top 180ms linear, opacity 180ms ease, transform 180ms linear",
        filter: "drop-shadow(0 0 10px rgba(255,255,255,0.18))",
        marginLeft: moveLeftOffsetPx,
      }
    : null;

  if (effectStyle) {
    if (layout === "buff") {
      effectStyle.left = "50%";
      effectStyle.top =
        buffEffectTopPx != null
          ? `${Math.max(0, buffEffectTopPx - effectProgress * 28)}px`
          : "10px";
      effectStyle.bottom = "auto";
      effectStyle.transform = "translateX(-50%)";
      effectStyle.marginLeft = 0;
    } else {
      const characterLeft = layout === "melee" ? 5 + charProgress * 7 : 5;
      const effectStartLeft = characterLeft + 58;
      effectStyle.left = `${Math.min(92, effectStartLeft + effectProgress * 24)}%`;
      effectStyle.bottom = "calc(51% - 40px)";
      effectStyle.transform = "translateX(-50%)";
    }
  }

  return (
    <Box
      sx={{
        position: "relative",
        height: 360,
        border: `1px solid ${THEME.line}`,
        background: "radial-gradient(circle at center, rgba(255,255,255,0.075), rgba(0,0,0,0.82) 66%)",
        overflow: "hidden",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${previewBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.48,
          filter: "blur(2px) saturate(0.9)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <Box ref={stageRef} sx={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
        <DepthsDeckCountBadge count={deckCopies} />
        <Box
          component="img"
          ref={characterImgRef}
          src={currentCharacterSrc}
          alt={move?.name || "Move animation"}
          draggable={false}
          sx={characterStyle}
        />
        {currentEffectSrc ? (
          <Box
            component="img"
            ref={effectImgRef}
            src={currentEffectSrc}
            alt={`${move?.name || "Move"} effect`}
            draggable={false}
            sx={effectStyle}
          />
        ) : null}
      </Box>
    </Box>
  );
}

function getDepthsMovePowerBreakdown(move = {}, champion = null) {
  const type = move.type || move.category || "";
  const range = getDepthsMoveRange(type);
  const moveClass = getDepthsMoveClass(type);
  const statKey = getDepthsScalingStatKeyForRange(range);
  const multiplier = getDepthsStatScalingMultiplier(moveClass);
  const statValue = statKey ? finiteNumber(getChampionDepthsStats(champion)?.[statKey], 0) : 0;
  const upgrade = getDepthsCardPowerUpgradeBreakdown(move);
  const basePower = upgrade.basePower;
  const upgradedPower = upgrade.upgradedPower;
  const statBonus = getDepthsStatScaledBonus(moveClass, statValue);
  const passive = applyDepthsPowerPassives(upgradedPower + statBonus, moveClass, champion);

  return {
    basePower,
    upgradedPower,
    upgradeBonus: upgrade.upgradeBonus,
    upgradeLabel: upgrade.label,
    powerUpgradeSteps: upgrade.steps,
    finalPower: passive.finalPower,
    unmodifiedPower: passive.unmodifiedPower,
    statKey,
    statValue,
    statBonus,
    multiplier,
    scalingLabel: getDepthsStatScalingText(moveClass, statKey),
    moveClass,
    passiveBonus: passive.passiveBonus,
    damageBonusFlat: passive.damageBonusFlat,
    damageDealtPct: passive.damageDealtPct,
    healingDonePct: passive.healingDonePct,
    outputLabel: passive.outputLabel,
  };
}

function getDepthsMoveEffectRows(move = {}, champion = null) {
  const rows = [];
  const type = move.type || move.category || "";
  const moveClass = getDepthsMoveClass(type);
  const isDepthsCard = move.depthsCardSource === "firebase";
  const potencyMultiplier = moveClass === "buff" || moveClass === "curse" ? 2 : 1;
  const baseEffects = Array.isArray(move.effects) ? move.effects : [];
  const primaryEffect = String(move.effect_name || move.effect || "").toLowerCase();
  const meta = move.depthsCardUpgradeMeta || {};

  const addRow = (effectKey, amount, keySuffix) => {
    if (!effectKey || effectKey === "none") return;
    const baseAmount = isDepthsCard ? finiteNumber(amount, 0) : 0;
    const upgradedBaseAmount = Math.max(
      0,
      (baseAmount + finiteNumber(meta.effectPotencyBonus, 0)) *
        finiteNumber(meta.effectPotencyMultiplier, 1)
    );
    const upgradeBonus = upgradedBaseAmount - baseAmount;
    const potency = getChampionEffectPotencyAddOn(champion, effectKey, potencyMultiplier);
    rows.push({
      key: `${effectKey}-${keySuffix}`,
      effectKey,
      label: formatDepthsAbilityLabel(effectKey),
      baseAmount,
      upgradedBaseAmount,
      upgradeBonus,
      upgradeText: upgradeBonus
        ? `card upgrades ${formatSignedAmount(upgradeBonus)} stacks`
        : "",
      finalAmount: upgradedBaseAmount + potency.total,
      potencyBonus: potency.total,
      championPotency: potency.championPotency,
      artifactPotency: potency.artifactPotency,
      potencyMultiplier,
      icon: DEPTHS_EFFECT_ICON_BY_KEY[effectKey] || "",
    });
  };

  if (primaryEffect) {
    addRow(
      primaryEffect,
      move.effect_potency_base ??
        move.effect_potency ??
        move.effectAmount ??
        move.effect_amount ??
        move.potency ??
        baseEffects[0]?.amount ??
        baseEffects[0]?.effectAmount ??
        baseEffects[0]?.effect_amount,
      "primary"
    );
  }

  baseEffects.forEach((effect, index) => {
    const effectKey = String(effect?.effect || effect?.effect_name || "").toLowerCase();
    if (!effectKey || effectKey === primaryEffect) return;
    addRow(effectKey, effect.amount ?? effect.effectAmount ?? effect.effect_amount, index);
  });

  return rows;
}

function DepthsBreakdownMoveCard({ move, champion }) {
  const type = move.type || move.category || "move";
  const target = getDepthsCardTargetLabel({
    type,
    range: getDepthsMoveRange(type),
    class: getDepthsMoveClass(type),
    effects: move.effects || [{ target: getDepthsMoveClass(type) === "buff" ? "ally" : "enemy" }],
  });
  const power = getDepthsMovePowerBreakdown(move, champion);
  const effectRows = getDepthsMoveEffectRows(move, champion);
  const powerBreakdownRows = getDepthsPowerBreakdownRows(power);
  const accuracyRows = getDepthsAccuracyBreakdownRows(getDepthsCardAccuracyUpgradeBreakdown(move));
  const cooldownBreakdown = getDepthsEffectiveCooldownBreakdown(move, champion);
  const cooldownRows = getDepthsCooldownRows(cooldownBreakdown);
  const deckCopies = getDepthsMoveDeckCopies(move);

  return (
    <Box sx={{ height: "100%", border: `1px solid ${THEME.line}`, background: "rgba(255,255,255,0.025)" }}>
      <DepthsMoveBreakdownPreview move={move} champion={champion} deckCopies={deckCopies} />
      <Box sx={{ p: 1.1 }}>
        <Typography sx={{ color: THEME.text, fontSize: 14, fontWeight: 900, lineHeight: 1.15 }}>
          {move.name || "Move"}
        </Typography>
        <Typography sx={{ color: THEME.faint, fontSize: 10, textTransform: "uppercase", mt: 0.35 }}>
          {type} | {target}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.45, mt: 0.85 }}>
          <DepthsStatIconPill icon={POWER_ICON_SRC} alt="power" value={formatDepthsNumber(power.finalPower)} />
          <DepthsStatIconPill icon={ACCURACY_ICON_SRC} alt="accuracy" value={formatDepthsNumber(move.accuracy)} />
          <DepthsStatIconPill icon={DEPTHS_STAT_ICON_BY_KEY.cooldown} alt="cooldown" value={`${formatDepthsNumber(cooldownBreakdown.finalCooldown)}s`} />
        </Box>
        {powerBreakdownRows.length ? (
          <Box sx={{ mt: 0.6, display: "grid", gap: 0.2 }}>
            {powerBreakdownRows.map((row) => (
              <Typography key={row} sx={{ color: THEME.muted, fontSize: 10, lineHeight: 1.25 }}>
                {row}
              </Typography>
            ))}
          </Box>
        ) : null}
        {accuracyRows.length ? (
          <Box sx={{ mt: 0.55, display: "grid", gap: 0.2 }}>
            {accuracyRows.map((row) => (
              <Typography key={row} sx={{ color: THEME.faint, fontSize: 10, lineHeight: 1.25 }}>
                {row}
              </Typography>
            ))}
          </Box>
        ) : null}
        {cooldownRows.length ? (
          <Box sx={{ mt: 0.55, display: "grid", gap: 0.2 }}>
            {cooldownRows.map((row) => (
              <Typography key={row} sx={{ color: THEME.faint, fontSize: 10, lineHeight: 1.25 }}>
                {row}
              </Typography>
            ))}
          </Box>
        ) : null}
        {effectRows.length ? (
          <Box sx={{ display: "grid", gap: 0.45, mt: 0.9 }}>
            {effectRows.map((row) => (
              <Box key={row.key} sx={{ display: "flex", alignItems: "flex-start", gap: 0.55 }}>
                {row.icon ? (
                  <EffectTooltipIcon effectKey={row.effectKey} src={row.icon} size={22} />
                ) : null}
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: THEME.gold, fontSize: 11, fontWeight: 900, lineHeight: 1.25 }}>
                    {row.label} {formatDepthsNumber(row.finalAmount)}
                  </Typography>
                  {row.upgradeBonus || row.potencyBonus ? (
                    <Typography sx={{ color: THEME.muted, fontSize: 9.5, lineHeight: 1.2 }}>
                      base {formatDepthsNumber(row.baseAmount)}
                      {row.upgradeBonus ? ` ${formatSignedAmount(row.upgradeBonus)} upgrades` : ""}
                      {row.potencyBonus ? ` + ${formatDepthsNumber(row.potencyBonus)} potency` : ""}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
            ))}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

function getDepthsStatSourceRows(charObj = {}, statKey = "") {
  const rows = [];
  const trait = finiteNumber(charObj?.traitStatBonuses?.[statKey], 0);
  const skill = finiteNumber(charObj?.skillStatBonuses?.[statKey], 0);
  const run = finiteNumber(charObj?.statBonuses?.[statKey], 0);

  if (trait) rows.push({ label: "traits", value: trait });
  if (skill) rows.push({ label: "skill tree", value: skill });
  if (run) rows.push({ label: "Depths run", value: run });
  return rows;
}

function getDepthsRuntimeSourceLabel(entry = {}) {
  if (entry.sourceArtifactId) return entry.sourceName || "Artifact";
  if (entry.sourceAbilityId) return entry.sourceName || "Depths Ability";
  return entry.sourceName || "Equipped Trait";
}

function getDepthsRuntimeSourceType(entry = {}) {
  if (entry.sourceArtifactId) return "artifact";
  if (entry.sourceAbilityId) return "ability";
  return "trait";
}

function getDepthsRuntimeTriggerLabel(entry = {}) {
  if (entry.type === "resistance") return "Resistance";
  if (entry.type === "heal_for_applied_stacks" || entry.type === "heal_when_stacks_applied") {
    return `${formatDepthsAbilityLabel(entry.sourceEffectKey || entry.effectKey)} applied`;
  }
  if (entry.type === "gain_start_of_battle" || entry.type === "apply_start_of_battle") {
    return "Room start";
  }
  if (entry.type === "apply_on_crit") return "Critical hits";
  return formatDepthsAttackTrigger(entry, { sentence: false });
}

function getDepthsRuntimeActionLabel(entry = {}) {
  if (entry.type === "resistance") return "Resist";
  if (entry.type === "heal_for_applied_stacks") return "Heal per stack";
  if (entry.type === "heal_when_stacks_applied") return "Heal";
  if (entry.type === "gain_start_of_battle" || entry.type === "gain_on_hit") return "Gain";
  return "Apply";
}

function getDepthsRuntimeEffectAmount(entry = {}, charObj = {}) {
  const baseAmount = finiteNumber(entry.amount, 0);
  if (entry.type === "resistance") return baseAmount;
  if (entry.type === "heal_for_applied_stacks") return baseAmount;
  if (entry.type === "heal_when_stacks_applied") return baseAmount;

  const effectKey = String(entry.effectKey || "").toLowerCase();
  if (!effectKey) return baseAmount;

  const championPotency = getChampionEffectPotencyValue({ charObj }, effectKey);
  const artifactPotency = getChampionArtifactEffectPotencyBonus({ charObj }, effectKey);
  return baseAmount + championPotency + artifactPotency;
}

function getChampionRuntimeEffectRows(charObj = {}) {
  return (Array.isArray(charObj?.gainedEffectsMeta?.battleOnly)
    ? charObj.gainedEffectsMeta.battleOnly
    : []
  )
    .filter((entry) => entry && (entry.effectKey || entry.resistedEffect || entry.sourceEffectKey))
    .map((entry, index) => {
      const effectKey = String(entry.effectKey || entry.resistedEffect || entry.sourceEffectKey || "").toLowerCase();
      const baseAmount = finiteNumber(entry.amount, 0);
      const championPotency =
        entry.type === "resistance" || entry.type === "heal_for_applied_stacks" || entry.type === "heal_when_stacks_applied"
          ? 0
          : getChampionEffectPotencyValue({ charObj }, effectKey);
      const artifactPotency =
        entry.type === "resistance" || entry.type === "heal_for_applied_stacks" || entry.type === "heal_when_stacks_applied"
          ? 0
          : getChampionArtifactEffectPotencyBonus({ charObj }, effectKey);
      const finalAmount = getDepthsRuntimeEffectAmount(entry, charObj);

      return {
        key: `${entry.sourceArtifactId || entry.sourceAbilityId || entry.sourceName || "trait"}-${entry.type || "effect"}-${effectKey}-${index}`,
        type: entry.type || "",
        effectKey,
        icon: DEPTHS_EFFECT_ICON_BY_KEY[effectKey] || "",
        sourceName: getDepthsRuntimeSourceLabel(entry),
        sourceType: getDepthsRuntimeSourceType(entry),
        trigger: getDepthsRuntimeTriggerLabel(entry),
        action: getDepthsRuntimeActionLabel(entry),
        baseAmount,
        championPotency,
        artifactPotency,
        finalAmount,
      };
    });
}

function formatDepthsSignedPercent(value) {
  const n = finiteNumber(value, 0);
  return `${n >= 0 ? "+" : ""}${formatDepthsNumber(n)}%`;
}

function getChampionPassiveRows(charObj = {}) {
  const rows = [];
  const abilityMeta = charObj?.depthsAbilityMeta || {};
  const artifactMeta = charObj?.depthsArtifactMeta || {};

  if (abilityMeta.lifeStealPct) {
    rows.push({
      key: "lifesteal",
      icon: DEPTHS_STAT_ICON_BY_KEY.health,
      title: "Lifesteal",
      text: `Heal ${formatDepthsNumber(abilityMeta.lifeStealPct)}% of damage dealt.`,
    });
  }

  if (abilityMeta.lowHpDamage) {
    rows.push({
      key: "low-hp-damage",
      icon: POWER_ICON_SRC,
      title: "Finisher",
      text: `Deal +${formatDepthsNumber(abilityMeta.lowHpDamage.flatDamage)} damage to targets at or below ${formatDepthsNumber(abilityMeta.lowHpDamage.thresholdPct)}% HP.`,
    });
  }

  if (abilityMeta.secondWind) {
    rows.push({
      key: "second-wind",
      icon: DEPTHS_EFFECT_ICON_BY_KEY.shield,
      title: "Second Breath",
      text: `Once per room below ${formatDepthsNumber(abilityMeta.secondWind.thresholdPct)}% HP, heal ${formatDepthsNumber(abilityMeta.secondWind.healPct)}% and gain ${formatDepthsNumber(abilityMeta.secondWind.shield)} shield.`,
    });
  }

  if (artifactMeta.damageDealtPct) {
    rows.push({
      key: "damage-dealt",
      icon: POWER_ICON_SRC,
      title: "Damage Dealt",
      text: `${formatDepthsSignedPercent(artifactMeta.damageDealtPct)} damage dealt.`,
    });
  }

  if (artifactMeta.damageTakenPct) {
    rows.push({
      key: "damage-taken",
      icon: DEPTHS_STAT_ICON_BY_KEY.resist,
      title: "Damage Taken",
      text: `${formatDepthsSignedPercent(artifactMeta.damageTakenPct)} damage taken.`,
    });
  }

  if (artifactMeta.healingDonePct) {
    rows.push({
      key: "healing-done",
      icon: DEPTHS_STAT_ICON_BY_KEY.health,
      title: "Healing",
      text: `${formatDepthsSignedPercent(artifactMeta.healingDonePct)} healing done.`,
    });
  }

  if (artifactMeta.damageBonusFlat) {
    rows.push({
      key: "damage-bonus-flat",
      icon: POWER_ICON_SRC,
      title: "Flat Damage",
      text: `${formatSignedAmount(artifactMeta.damageBonusFlat)} damage on damaging hits.`,
    });
  }

  if (artifactMeta.healOnKillPct) {
    rows.push({
      key: "heal-on-kill",
      icon: DEPTHS_STAT_ICON_BY_KEY.health,
      title: "Kill Heal",
      text: `Heal ${formatDepthsNumber(artifactMeta.healOnKillPct)}% max HP after defeating an enemy.`,
    });
  }

  if (artifactMeta.firstBuffNoCooldown) {
    rows.push({
      key: "first-buff-no-cooldown",
      icon: DEPTHS_STAT_ICON_BY_KEY.cooldown,
      title: "First Buff",
      text: "First buff card each room has no cooldown.",
    });
  }

  if (artifactMeta.firstDamageNoCooldown) {
    rows.push({
      key: "first-damage-no-cooldown",
      icon: DEPTHS_STAT_ICON_BY_KEY.cooldown,
      title: "First Strike",
      text: "First damage or curse card each room has no cooldown.",
    });
  }

  return rows;
}

function ChampionDepthsBreakdownPanel({ champion, artifacts = [], cards = [], actionArea = null }) {
  const charObj = champion?.charObj || {};
  const stats = getDepthsDisplayStats(charObj || {});
  const maxHp = champion?.charObj ? getDepthsChampionMaxHpFromCharObj(charObj) : finiteNumber(stats.health, 0);
  const currentHp = champion?.charObj ? getDepthsChampionCurrentHp(champion) : maxHp;
  const xpInfo = getDepthsChampionLevelInfo(champion?.xp ?? charObj?.xp);
  const moves = getDepthsChampionCardMoves(champion).slice(0, 6);
  const effectRows = getChampionEffectPotencyRows(charObj);
  const runtimeEffectRows = getChampionRuntimeEffectRows(charObj);
  const passiveRows = getChampionPassiveRows(charObj);

  return (
    <Box sx={{ ...panelStyle, p: { xs: 2, md: 3 }, mt: 2.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <Box>
          <Typography sx={{ ...medievalText, color: THEME.text, fontSize: { xs: 18, md: 24 } }}>
            Champion Breakdown
          </Typography>
          <Typography sx={{ color: THEME.muted, fontSize: 13, mt: 0.6 }}>
            Champion #{champion?.assetId || ""} with the selected Depths loadout.
          </Typography>
        </Box>
        <Box sx={{ minWidth: { xs: "100%", sm: 280 }, maxWidth: 360 }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.8, flexWrap: "wrap" }}>
            <Chip
              label={`Level ${xpInfo.level}`}
              sx={{ color: "#111", border: `1px solid ${THEME.gold}`, background: THEME.gold, fontWeight: 900 }}
            />
            <Chip
              label={`HP ${formatDepthsNumber(currentHp)} / ${formatDepthsNumber(maxHp)}`}
              sx={{ color: THEME.text, border: `1px solid ${THEME.line}`, background: "rgba(0,0,0,0.58)" }}
            />
          </Box>
          <Box
            sx={{
              mt: 0.9,
              height: 8,
              border: `1px solid ${THEME.line}`,
              background: "rgba(0,0,0,0.62)",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                width: `${xpInfo.progress}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${THEME.gold}, rgba(255,255,255,0.88))`,
              }}
            />
          </Box>
          <Typography sx={{ color: THEME.muted, fontSize: 11, mt: 0.45, textAlign: "right" }}>
            {xpInfo.xp} / {xpInfo.nextLvl} XP
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={1.6}>
        <Grid item xs={12} md={6}>
          <ChampionIdleBreakdownPreview champion={champion} />
        </Grid>
        <Grid item xs={12} md={8}>
          <Grid container spacing={1.2}>
            {DEPTHS_DISPLAY_STAT_KEYS.map((key) => {
              const sourceRows = getDepthsStatSourceRows(charObj, key);
              return (
          <Grid item xs={6} sm={4} lg={3} key={key}>
            <Box sx={{ border: `1px solid ${THEME.line}`, p: 1, minHeight: 78, background: "rgba(255,255,255,0.025)" }}>
              <Typography sx={{ color: THEME.faint, fontSize: 10, textTransform: "uppercase" }}>
                {formatDepthsAbilityLabel(key)}
              </Typography>
              <Typography sx={{ color: THEME.text, fontSize: 18, fontWeight: 900 }}>
                {formatDepthsNumber(stats[key])}
              </Typography>
              {sourceRows.map((row) => (
                <Typography key={row.label} sx={{ color: row.label === "traits" ? THEME.gold : THEME.muted, fontSize: 9.5, lineHeight: 1.2 }}>
                  {row.label} {formatSignedAmount(row.value)}
                </Typography>
              ))}
            </Box>
          </Grid>
              );
            })}
          </Grid>
        </Grid>
      </Grid>

      <Grid container spacing={1.4} sx={{ mt: 1.4 }}>
        <Grid item xs={12} md={3}>
          <Box sx={{ border: `1px solid ${THEME.line}`, p: 1.2, height: "100%" }}>
            <Typography sx={{ color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", mb: 1 }}>
              Effect Potencies
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
              {effectRows.length ? (
                effectRows.map((entry) => (
                  <Box
                    key={entry.key}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.55,
                      minHeight: 28,
                      px: 0.9,
                      py: 0.45,
                      color: THEME.text,
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.035)",
                    }}
                  >
                    {DEPTHS_EFFECT_ICON_BY_KEY[entry.key] ? (
                      <EffectTooltipIcon
                        effectKey={entry.key}
                        src={DEPTHS_EFFECT_ICON_BY_KEY[entry.key]}
                        size={16}
                      />
                    ) : null}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ color: THEME.text, fontSize: 12, fontWeight: 800, lineHeight: 1.1 }}>
                        {entry.key} +{formatDepthsNumber(entry.value)}
                      </Typography>
                      {entry.artifactValue ? (
                        <Typography sx={{ color: THEME.gold, fontSize: 9, lineHeight: 1.15, mt: 0.15 }}>
                          artifacts +{formatDepthsNumber(entry.artifactValue)}
                        </Typography>
                      ) : null}
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography sx={{ color: THEME.faint, fontSize: 12 }}>No effect potencies.</Typography>
              )}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={3}>
          <Box sx={{ border: `1px solid ${THEME.line}`, p: 1.2, height: "100%" }}>
            <Typography sx={{ color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", mb: 1 }}>
              Depths Runtime Effects
            </Typography>
            <Box sx={{ display: "grid", gap: 0.7 }}>
              {runtimeEffectRows.length ? (
                runtimeEffectRows.map((row) => (
                  <Box
                    key={row.key}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 0.7,
                      p: 0.8,
                      border: `1px solid ${THEME.line}`,
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    {row.icon ? (
                      <EffectTooltipIcon
                        effectKey={row.effectKey}
                        src={row.icon}
                        size={22}
                      />
                    ) : null}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ color: THEME.text, fontSize: 11.5, fontWeight: 900, lineHeight: 1.25 }}>
                        {row.type === "heal_for_applied_stacks"
                          ? `${row.trigger}: heal ${formatDepthsNumber(row.finalAmount)} HP per stack`
                          : row.type === "heal_when_stacks_applied"
                          ? `${row.trigger}: heal ${formatDepthsNumber(row.finalAmount)} HP`
                          : `${row.trigger}: ${row.action} ${formatDepthsAbilityLabel(row.effectKey)} ${formatDepthsNumber(row.finalAmount)}`}
                      </Typography>
                      <Typography sx={{ color: row.sourceType === "artifact" ? THEME.gold : THEME.muted, fontSize: 9.5, lineHeight: 1.25, mt: 0.2 }}>
                        {row.sourceName}
                        {row.championPotency || row.artifactPotency
                          ? ` | base ${formatDepthsNumber(row.baseAmount)}${row.championPotency ? ` + ${formatDepthsNumber(row.championPotency)} potency` : ""}${row.artifactPotency ? ` + ${formatDepthsNumber(row.artifactPotency)} artifacts` : ""}`
                          : ""}
                      </Typography>
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography sx={{ color: THEME.faint, fontSize: 12 }}>
                  No trait or artifact trigger effects.
                </Typography>
              )}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={3}>
          <Box sx={{ border: `1px solid ${THEME.line}`, p: 1.2, height: "100%" }}>
            <Typography sx={{ color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", mb: 1 }}>
              Depths Passives
            </Typography>
            <Box sx={{ display: "grid", gap: 0.7 }}>
              {passiveRows.length ? (
                passiveRows.map((row) => (
                  <Box
                    key={row.key}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 0.7,
                      p: 0.8,
                      border: `1px solid ${THEME.line}`,
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    {row.icon ? (
                      getArenaEffectInfo(row.key) ? (
                        <EffectTooltipIcon
                          effectKey={row.key}
                          src={row.icon}
                          size={22}
                        />
                      ) : (
                        <Box
                          component="img"
                          src={row.icon}
                          alt=""
                          draggable={false}
                          sx={{ width: 22, height: 22, objectFit: "contain", flex: "0 0 auto" }}
                        />
                      )
                    ) : null}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ color: THEME.text, fontSize: 11.5, fontWeight: 900, lineHeight: 1.2 }}>
                        {row.title}
                      </Typography>
                      <Typography sx={{ color: THEME.muted, fontSize: 9.7, lineHeight: 1.25, mt: 0.2 }}>
                        {row.text}
                      </Typography>
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography sx={{ color: THEME.faint, fontSize: 12 }}>
                  No passive run bonuses.
                </Typography>
              )}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={3}>
          <Box sx={{ border: `1px solid ${THEME.line}`, p: 1.2, height: "100%" }}>
            <Typography sx={{ color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", mb: 1 }}>
              Selected Run Pieces
            </Typography>
            <Box sx={{ display: "grid", gap: 0.7 }}>
              {artifacts.map((artifact, index) => (
                <SelectedArtifactSquare
                  key={`artifact-${artifact.id || artifact.name}-${artifact.room || 0}-${index}`}
                  artifact={artifact}
                  compact
                />
              ))}
              {cards.map((card) => (
                <Chip
                  key={`card-${card.cardId || card.id || card.name}`}
                  label={`Card: ${card.name}`}
                  sx={{ justifyContent: "flex-start", color: THEME.text, border: `1px solid ${THEME.line}`, background: "rgba(255,255,255,0.035)" }}
                />
              ))}
              {!artifacts.length && !cards.length ? (
                <Typography sx={{ color: THEME.faint, fontSize: 12 }}>Choose an artifact and a card to preview the run loadout.</Typography>
              ) : null}
            </Box>
          </Box>
        </Grid>

      </Grid>

      <Box sx={{ mt: 2 }}>
        <Typography sx={{ color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", mb: 1 }}>
          Champion Cards And Move Animations
        </Typography>
        <Grid container spacing={1.2}>
          {moves.length ? (
            moves.map(({ move, moveIndex }) => (
              <Grid item xs={12} md={4} key={`${move.id || move.name}-${moveIndex}`}>
                <DepthsBreakdownMoveCard move={move} champion={champion} />
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Typography sx={{ color: THEME.faint, fontSize: 12 }}>No cards or moves found.</Typography>
            </Grid>
          )}
        </Grid>
      </Box>
      {actionArea ? <Box sx={{ mt: 2.4 }}>{actionArea}</Box> : null}
    </Box>
  );
}

function ChampionBreakdownDialog({ open, onClose, champion, artifacts = [], cards = [] }) {
  if (!champion) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          background: "rgba(3,3,3,0.98)",
          color: THEME.text,
          border: `1px solid ${THEME.line}`,
          borderRadius: 1,
          maxHeight: "92vh",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: { xs: 2, md: 3 },
          pt: 2,
        }}
      >
        <Typography sx={{ ...medievalText, color: THEME.gold, fontSize: 13 }}>
          Champion Breakdown
        </Typography>
        <IconButton onClick={onClose} sx={{ color: THEME.text }}>
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent sx={{ px: { xs: 1.5, md: 2.5 }, pt: 0, pb: 2.5 }}>
        <ChampionDepthsBreakdownPanel
          champion={champion}
          artifacts={artifacts}
          cards={cards}
        />
      </DialogContent>
    </Dialog>
  );
}

function DepthsStartLoadoutPanel({
  champion,
  room,
  artifactChoices,
  cardChoices,
  selectedArtifact,
  selectedCard,
  previewChampion,
  onSelectArtifact,
  onSelectCard,
  onConfirm,
}) {
  const selectedArtifactKey = getArtifactChoiceKey(selectedArtifact);
  const selectedCardKey = getCardChoiceKey(selectedCard);

  return (
    <DepthsScenePanel bgSrc={DEPTHS_START_LOADOUT_BG_SRC}>
      <DepthsChoiceHeader
        title="Choose Starting Loadout"
        text={`Pick one artifact and one card for Champion #${champion?.assetId} before entering The Depths.`}
        action={
          <>
            <Chip
              icon={selectedArtifact ? <CheckCircleIcon /> : undefined}
              label={selectedArtifact ? "Artifact selected" : "Choose artifact"}
              sx={{
                color: selectedArtifact ? "#111" : THEME.text,
                border: `1px solid ${selectedArtifact ? THEME.gold : THEME.line}`,
                background: selectedArtifact ? THEME.gold : "rgba(0,0,0,0.58)",
              }}
            />
            <Chip
              icon={selectedCard ? <CheckCircleIcon /> : undefined}
              label={selectedCard ? "Card selected" : "Choose card"}
              sx={{
                color: selectedCard ? "#111" : THEME.text,
                border: `1px solid ${selectedCard ? THEME.gold : THEME.line}`,
                background: selectedCard ? THEME.gold : "rgba(0,0,0,0.58)",
              }}
            />
          </>
        }
      />

      <Box
        sx={{
          minHeight: { xs: 440, md: 520 },
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          pt: { xs: 0.5, md: 1.4 },
          pb: { xs: 1.8, md: 2.6 },
        }}
      >
        <DepthsFloatingChoiceRow title="Artifacts" sx={{ mt: { xs: 0.5, md: 1 } }}>
          {artifactChoices.map((artifact) => (
            <DepthsFloatingChoiceSlot key={artifact.id}>
              <CompactArtifactChoiceTile
                artifact={artifact}
                onChoose={onSelectArtifact}
                selected={getArtifactChoiceKey(artifact) === selectedArtifactKey}
                disabled={Boolean(selectedArtifact) && getArtifactChoiceKey(artifact) !== selectedArtifactKey}
              />
            </DepthsFloatingChoiceSlot>
          ))}
        </DepthsFloatingChoiceRow>

        <DepthsFloatingChoiceRow title="Cards" sx={{ mb: { xs: 0.5, md: 1 } }}>
          {cardChoices.map((card) => (
            <DepthsFloatingChoiceSlot key={card.cardId || card.id}>
              <CompactDepthsCardChoiceTile
                card={card}
                champion={previewChampion || champion}
                onChoose={onSelectCard}
                selected={getCardChoiceKey(card) === selectedCardKey}
                disabled={Boolean(selectedCard) && getCardChoiceKey(card) !== selectedCardKey}
              />
            </DepthsFloatingChoiceSlot>
          ))}
        </DepthsFloatingChoiceRow>
      </Box>
    </DepthsScenePanel>
  );
}

function CardChoicePanel({
  champion,
  room,
  choices,
  selectedCards,
  selectedChoiceKey = "",
  onChoose,
  onSkip,
}) {
  const bgSrc = getDepthsWorldBackground(room, "card");

  return (
    <DepthsScenePanel bgSrc={bgSrc}>
      <DepthsChoiceHeader
        title="Choose The Depths Card"
        text={`Room ${room} encounter reward for Champion #${champion?.assetId}. Pick one card for this run's deck, or skip.`}
        action={
          <>
            <Chip
              label={`${selectedCards.length} card${selectedCards.length === 1 ? "" : "s"} gained`}
              sx={{ color: THEME.text, border: `1px solid ${THEME.line}`, background: "rgba(0,0,0,0.58)" }}
            />
            <Button disabled={Boolean(selectedChoiceKey)} onClick={onSkip} sx={{ ...buttonStyle, minHeight: 38 }}>
              Skip Card
            </Button>
          </>
        }
      />

      <Box
        sx={{
          minHeight: { xs: 380, md: 480 },
          display: "grid",
          alignItems: "center",
          py: { xs: 2, md: 4 },
        }}
      >
        <DepthsFloatingChoiceRow title="Cards">
          {choices.map((card) => {
            const key = getCardChoiceKey(card);
            return (
              <DepthsFloatingChoiceSlot key={card.cardId || card.id}>
                <CompactDepthsCardChoiceTile
                  card={card}
                  champion={champion}
                  onChoose={onChoose}
                  selected={key === selectedChoiceKey}
                  disabled={Boolean(selectedChoiceKey) && key !== selectedChoiceKey}
                />
              </DepthsFloatingChoiceSlot>
            );
          })}
        </DepthsFloatingChoiceRow>
      </Box>

      {selectedCards.length ? (
        <DepthsCompactChoiceSection title="Current Run Cards" sx={{ mt: 0, background: "rgba(0,0,0,0.36)" }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {selectedCards.map((card) => (
              <Chip
                key={`${card.id}-${card.room}`}
                label={`R${card.room}: ${card.name}`}
                sx={{ color: THEME.text, border: `1px solid ${THEME.line}`, background: "rgba(0,0,0,0.58)" }}
              />
            ))}
          </Box>
        </DepthsCompactChoiceSection>
      ) : null}
    </DepthsScenePanel>
  );
}

function ArtifactChoicePanel({
  champion,
  room,
  choices,
  selectedArtifacts,
  selectedChoiceKey = "",
  onChoose,
  mode = "start",
}) {
  const isChest = mode === "chest";
  const bgSrc = getDepthsWorldBackground(room, isChest ? "chest" : "artifact");

  return (
    <DepthsScenePanel bgSrc={bgSrc}>
      <DepthsChoiceHeader
        title={isChest ? "Open The Chest" : "Choose Artifact"}
        text={
          isChest
            ? `Room ${room} chest reward for Champion #${champion?.assetId}.`
            : `Champion #${champion?.assetId} binds one artifact before entering The Depths.`
        }
        action={
          <Chip
            label={`${selectedArtifacts.length} artifact${selectedArtifacts.length === 1 ? "" : "s"} active`}
            sx={{ color: THEME.text, border: `1px solid ${THEME.line}`, background: "rgba(0,0,0,0.58)" }}
          />
        }
      />

      <Box
        sx={{
          minHeight: { xs: 380, md: 480 },
          display: "grid",
          alignItems: "center",
          py: { xs: 2, md: 4 },
        }}
      >
        <DepthsFloatingChoiceRow title="Artifacts">
          {choices.map((artifact) => {
            const key = getArtifactChoiceKey(artifact);
            return (
              <DepthsFloatingChoiceSlot key={artifact.id}>
                <CompactArtifactChoiceTile
                  artifact={artifact}
                  onChoose={onChoose}
                  selected={key === selectedChoiceKey}
                  disabled={Boolean(selectedChoiceKey) && key !== selectedChoiceKey}
                />
              </DepthsFloatingChoiceSlot>
            );
          })}
        </DepthsFloatingChoiceRow>
      </Box>

      {selectedArtifacts.length ? (
        <DepthsCompactChoiceSection title="Active Artifacts" sx={{ mt: 0, background: "rgba(0,0,0,0.36)" }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {selectedArtifacts.map((artifact, index) => (
              <SelectedArtifactSquare
                key={`${artifact.id}-${artifact.room}-${index}`}
                artifact={artifact}
                compact
              />
            ))}
          </Box>
        </DepthsCompactChoiceSection>
      ) : null}
    </DepthsScenePanel>
  );
}

function DepthsQuestPanel({
  quest,
  result,
  champion,
  room,
  selectedChoiceKey = "",
  onChooseOption,
  onContinue,
}) {
  if (!quest) return null;

  const bgSrc = quest.backgroundSrc || getDepthsWorldBackground(room, "quest");
  const pendingLabels = (result?.pendingEffects || [])
    .map((effect) => {
      if (effect.type === "cardChoice") return "Choose Card";
      if (effect.type === "artifactChoice") return "Choose Artifact";
      if (effect.type === "cardUpgrade") return "Upgrade Card";
      if (effect.type === "removeCard") return "Remove Card";
      return "";
    })
    .filter(Boolean);

  return (
    <DepthsScenePanel bgSrc={bgSrc}>
      <DepthsChoiceHeader
        title={quest.title}
        text={quest.subtitle || `Room ${room} quest for Champion #${champion?.assetId}.`}
        action={
          <Chip
            label={`${formatDepthsAbilityLabel(quest.world)} Quest`}
            sx={{ color: THEME.text, border: `1px solid ${THEME.line}`, background: "rgba(0,0,0,0.58)" }}
          />
        }
      />

      {!result ? (
        <Box
          sx={{
            minHeight: { xs: 430, md: 520 },
            display: "grid",
            alignItems: "center",
            py: { xs: 2, md: 4 },
          }}
        >
          <Grid container spacing={1.6} justifyContent="center">
            {(quest.options || []).map((option) => {
              const key = getDepthsQuestChoiceKey(option);
              return (
                <Grid item xs={12} md={4} key={key}>
                  <Box
                    component="button"
                    type="button"
                    disabled={Boolean(selectedChoiceKey) && key !== selectedChoiceKey}
                    onClick={() => onChooseOption(option)}
                    sx={{
                      width: "100%",
                      height: "100%",
                      minHeight: 255,
                      p: 1.7,
                      textAlign: "left",
                      color: THEME.text,
                      border: `1px solid ${key === selectedChoiceKey ? THEME.gold : THEME.line}`,
                      borderRadius: 1,
                      background:
                        key === selectedChoiceKey
                          ? "linear-gradient(180deg, rgba(225,184,100,0.22), rgba(0,0,0,0.88))"
                          : "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.86))",
                      boxShadow: key === selectedChoiceKey ? `0 0 22px ${THEME.gold}33` : "0 18px 36px rgba(0,0,0,0.32)",
                      cursor: Boolean(selectedChoiceKey) && key !== selectedChoiceKey ? "default" : "pointer",
                      font: "inherit",
                      "&:hover": {
                        borderColor: THEME.gold,
                        background: "linear-gradient(180deg, rgba(225,184,100,0.15), rgba(0,0,0,0.9))",
                      },
                      "&:disabled": {
                        opacity: 0.5,
                      },
                    }}
                  >
                    <Typography sx={{ ...medievalText, color: THEME.gold, fontSize: 11 }}>
                      {getDepthsQuestCheckLabel(option.check)}
                    </Typography>
                    <Typography sx={{ color: THEME.text, fontSize: 22, fontWeight: 950, lineHeight: 1.08, mt: 0.8 }}>
                      {option.title}
                    </Typography>
                    <Typography sx={{ color: THEME.muted, fontSize: 13, lineHeight: 1.45, mt: 1 }}>
                      {option.description}
                    </Typography>

                    <Box sx={{ mt: 1.5, display: "grid", gap: 0.7 }}>
                      {option.success ? (
                        <Box sx={{ border: `1px solid ${THEME.good}55`, borderRadius: 1, p: 0.9, background: "rgba(159,232,112,0.07)" }}>
                          <Typography sx={{ color: THEME.good, fontSize: 10, fontWeight: 950, textTransform: "uppercase" }}>
                            Success
                          </Typography>
                          <Typography sx={{ color: THEME.text, fontSize: 11.5, lineHeight: 1.35 }}>
                            {getDepthsQuestOutcomeText(option.success) || option.success.title || "Continue"}
                          </Typography>
                        </Box>
                      ) : null}
                      {option.failure ? (
                        <Box sx={{ border: `1px solid ${THEME.bad}55`, borderRadius: 1, p: 0.9, background: "rgba(248,87,90,0.07)" }}>
                          <Typography sx={{ color: THEME.bad, fontSize: 10, fontWeight: 950, textTransform: "uppercase" }}>
                            Failure
                          </Typography>
                          <Typography sx={{ color: THEME.text, fontSize: 11.5, lineHeight: 1.35 }}>
                            {getDepthsQuestOutcomeText(option.failure) || option.failure.title || "Continue"}
                          </Typography>
                        </Box>
                      ) : null}
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ) : (
        <Box
          sx={{
            minHeight: { xs: 430, md: 520 },
            display: "grid",
            alignItems: "center",
            py: { xs: 2, md: 4 },
          }}
        >
          <Box
            sx={{
              maxWidth: 780,
              mx: "auto",
              p: { xs: 2.1, md: 3 },
              border: `1px solid ${result.success ? THEME.good : THEME.bad}`,
              borderRadius: 1,
              background: "rgba(0,0,0,0.7)",
              boxShadow: "0 22px 52px rgba(0,0,0,0.48)",
              textAlign: "center",
              backdropFilter: "blur(2px)",
            }}
          >
            <Typography sx={{ ...medievalText, color: result.success ? THEME.good : THEME.bad, fontSize: 12 }}>
              {result.success ? "Success" : "Failure"}
            </Typography>
            <Typography sx={{ color: THEME.text, fontSize: { xs: 24, md: 34 }, fontWeight: 950, lineHeight: 1.05, mt: 0.5 }}>
              {result.title}
            </Typography>
            {result.text ? (
              <Typography sx={{ color: THEME.muted, fontSize: 15, lineHeight: 1.55, mt: 1.1 }}>
                {result.text}
              </Typography>
            ) : null}

            <Box sx={{ mt: 2, display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
              {result.rollType === "roll" ? (
                <>
                  <Chip
                    label={`Rolled ${result.roll}`}
                    sx={{ color: THEME.text, border: `1px solid ${THEME.line}`, background: "rgba(0,0,0,0.58)" }}
                  />
                  <Chip
                    label={`Needed ${result.target} or lower`}
                    sx={{ color: result.success ? THEME.good : THEME.bad, border: `1px solid ${result.success ? THEME.good : THEME.bad}`, background: "rgba(0,0,0,0.58)" }}
                  />
                </>
              ) : null}
              {result.rollType === "card" ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 0.8,
                    border: `1px solid ${THEME.line}`,
                    borderRadius: 1,
                    background: "rgba(255,255,255,0.045)",
                  }}
                >
                  {result.drawnCard?.previewSrc ? (
                    <Box
                      component="img"
                      src={result.drawnCard.previewSrc}
                      alt=""
                      sx={{ width: 54, height: 54, objectFit: "contain" }}
                    />
                  ) : null}
                  <Box sx={{ textAlign: "left" }}>
                    <Typography sx={{ color: THEME.text, fontSize: 12, fontWeight: 900 }}>
                      {result.drawnCard?.name || "No card drawn"}
                    </Typography>
                    <Typography sx={{ color: result.success ? THEME.good : THEME.bad, fontSize: 11 }}>
                      {result.detail}
                    </Typography>
                  </Box>
                </Box>
              ) : null}
              {result.rollType === "none" ? (
                <Chip
                  label="No roll required"
                  sx={{ color: THEME.gold, border: `1px solid ${THEME.line}`, background: "rgba(0,0,0,0.58)" }}
                />
              ) : null}
            </Box>

            {result.details?.length ? (
              <Box sx={{ mt: 2, display: "flex", justifyContent: "center", gap: 0.7, flexWrap: "wrap" }}>
                {result.details.map((detail) => (
                  <Chip
                    key={detail}
                    label={detail}
                    sx={{
                      color: THEME.text,
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 1,
                      background: "rgba(255,255,255,0.05)",
                      "& .MuiChip-label": { whiteSpace: "normal", py: 0.35 },
                    }}
                  />
                ))}
              </Box>
            ) : null}

            {result.rewardArtifacts?.length ? (
              <Box sx={{ mt: 2, display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
                {result.rewardArtifacts.map((artifact, index) => (
                  <QuestArtifactRewardTile
                    key={`${artifact.id || artifact.name || "artifact"}-${index}`}
                    artifact={artifact}
                  />
                ))}
              </Box>
            ) : null}

            {pendingLabels.length ? (
              <Typography sx={{ color: THEME.gold, fontSize: 12, lineHeight: 1.35, mt: 2 }}>
                Next: {pendingLabels.join(", ")}
              </Typography>
            ) : null}

            <Box sx={{ mt: 2.5 }}>
              <Button startIcon={<AutoAwesomeIcon />} onClick={onContinue} sx={{ ...buttonStyle, minHeight: 44 }}>
                Continue
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </DepthsScenePanel>
  );
}

function CardRemovalPanel({
  champion,
  room,
  cards,
  selectedChoiceKey = "",
  onChoose,
}) {
  const bgSrc = getDepthsWorldBackground(room, "card");

  return (
    <DepthsScenePanel bgSrc={bgSrc}>
      <DepthsChoiceHeader
        title="Remove Card"
        text={`Champion #${champion?.assetId} can remove one copy of any card in this run's deck, including starting cards.`}
        action={
          <Chip
            label={`${cards.length} removable card${cards.length === 1 ? "" : "s"}`}
            sx={{ color: THEME.text, border: `1px solid ${THEME.line}`, background: "rgba(0,0,0,0.58)" }}
          />
        }
      />

      <Box
        sx={{
          minHeight: { xs: 380, md: 480 },
          display: "grid",
          alignItems: "center",
          py: { xs: 2, md: 4 },
        }}
      >
        <DepthsFloatingChoiceRow title="Choose A Card Copy To Remove">
          {cards.map((card) => {
            const key = card.moveFamilyKey || card.id || card.cardId || card.name;
            const choiceKey = `remove-card-${key}`;
            return (
              <DepthsFloatingChoiceSlot key={key}>
                <CompactCardUpgradeMoveTile
                  move={card.move}
                  moveIndex={card.moveIndex}
                  champion={champion}
                  onChoose={() => onChoose(card)}
                  selected={choiceKey === selectedChoiceKey}
                  disabled={Boolean(selectedChoiceKey) && choiceKey !== selectedChoiceKey}
                />
              </DepthsFloatingChoiceSlot>
            );
          })}
        </DepthsFloatingChoiceRow>
      </Box>
    </DepthsScenePanel>
  );
}

function getCardUpgradeMovePreviewSrc(move = {}) {
  const frames = [
    move.casterAnimation?.frameUrls,
    move.animationFrames,
    move.animationMeta?.frameUrls,
    move.characterFrames,
    move.characterAnimation?.frameUrls,
  ].find((entry) => Array.isArray(entry) && entry.length);
  if (frames?.length) return frames[Math.min(2, frames.length - 1)];
  return move.casterAnimation?.sheetUrl || move.url || move.characterUrl || move.image || "";
}

function getCardUpgradeMoveEffectLabel(move = {}) {
  const effect = String(move.effect_name || move.effect || "").toLowerCase();
  if (!effect || effect === "none") return "No effect";
  const potency = finiteNumber(
    move.effect_potency_base ??
      move.effect_potency ??
      move.effectAmount ??
      move.effect_amount ??
      move.potency,
    0
  );
  const meta = move.depthsCardUpgradeMeta || {};
  const bonus = finiteNumber(meta.effectPotencyBonus, 0);
  const multiplier = finiteNumber(meta.effectPotencyMultiplier, 1);
  const finalPotency = Math.max(0, Math.round((potency + bonus) * multiplier * 10) / 10);
  return `${formatDepthsAbilityLabel(effect)} ${finalPotency || potency}`;
}

function CardUpgradePanel({
  champion,
  room,
  selectedUpgrades,
  selectedMoveIndex,
  choices,
  onSelectMove,
  onChooseUpgrade,
}) {
  const cardMoves = getDepthsChampionCardMoves(champion);
  const selectedMove =
    selectedMoveIndex !== null && selectedMoveIndex !== undefined
      ? cardMoves.find((entry) => entry.moveIndex === selectedMoveIndex)?.move || null
      : null;

  return (
    <Box>
      <Box sx={{ ...panelStyle, p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <Box>
          <Typography sx={{ ...medievalText, color: THEME.text, fontSize: { xs: 22, md: 32 } }}>
            Upgrade Card
          </Typography>
          <Typography sx={{ color: THEME.muted, fontSize: 14, mt: 0.7 }}>
            Select one champion card, then choose one of two upgrade paths for Room {room}.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <Chip
            label={`${selectedUpgrades.length} card upgrade${selectedUpgrades.length === 1 ? "" : "s"} active`}
            sx={{ color: THEME.text, border: `1px solid ${THEME.line}`, background: "rgba(0,0,0,0.58)" }}
          />
        </Box>
      </Box>

        <Grid container spacing={1.5}>
          {cardMoves.map(({ move, moveIndex }) => {
          const previewSrc = getCardUpgradeMovePreviewSrc(move);
          const isSelected = selectedMoveIndex === moveIndex;
          const labels = move.depthsCardUpgradeMeta?.labels || [];
          const cooldownBreakdown = getDepthsEffectiveCooldownBreakdown(move, champion);
          const cooldownRows = getDepthsCooldownRows(cooldownBreakdown);
          const deckCopies = getDepthsMoveDeckCopies(move);
          const powerBreakdown = getDepthsMovePowerBreakdown(move, champion);
          const powerBreakdownRows = getDepthsPowerBreakdownRows(powerBreakdown);
          const accuracyRows = getDepthsAccuracyBreakdownRows(getDepthsCardAccuracyUpgradeBreakdown(move));
          const effectRows = getDepthsMoveEffectRows(move, champion);
          const locked = selectedMoveIndex !== null && selectedMoveIndex !== undefined;

          return (
            <Grid item xs={12} md={4} key={getDepthsCardUpgradeMoveKey(move, moveIndex)}>
              <Box
                component="button"
                type="button"
                disabled={locked && !isSelected}
                onClick={() => {
                  if (!locked) onSelectMove(moveIndex);
                }}
                sx={{
                  width: "100%",
                  height: "100%",
                  p: 0,
                  textAlign: "left",
                  color: THEME.text,
                  border: `1px solid ${isSelected ? THEME.gold : THEME.line}`,
                  borderRadius: 1,
                  background: isSelected
                    ? "linear-gradient(180deg, rgba(225,184,100,0.16), rgba(0,0,0,0.92))"
                    : "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(0,0,0,0.9))",
                  cursor: locked && !isSelected ? "not-allowed" : locked ? "default" : "pointer",
                  opacity: locked && !isSelected ? 0.42 : 1,
                  font: "inherit",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: 140,
                    display: "grid",
                    placeItems: "center",
                    borderBottom: `1px solid ${THEME.line}`,
                    background: "radial-gradient(circle at center, rgba(255,255,255,0.12), rgba(0,0,0,0.72))",
                  }}
                >
                  {previewSrc ? (
                    <Box
                      component="img"
                      src={previewSrc}
                      alt=""
                      draggable={false}
                      sx={{ maxWidth: "62%", maxHeight: "86%", objectFit: "contain" }}
                    />
                  ) : (
                    <Typography sx={{ color: THEME.faint, fontSize: 12 }}>No preview</Typography>
                  )}
                  <DepthsDeckCountBadge count={deckCopies} />
                </Box>
                <Box sx={{ p: 1.5 }}>
                  <Typography sx={{ color: THEME.text, fontSize: 17, fontWeight: 900, lineHeight: 1.15 }}>
                    {move.name || `Card ${moveIndex + 1}`}
                  </Typography>
                  <Typography sx={{ color: THEME.muted, fontSize: 11, textTransform: "uppercase", mt: 0.45 }}>
                    {move.type || move.category || "move"}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.55, mt: 1 }}>
                    <DepthsStatIconPill icon={POWER_ICON_SRC} alt="power" value={formatDepthsNumber(powerBreakdown.finalPower)} />
                    <DepthsStatIconPill icon={ACCURACY_ICON_SRC} alt="accuracy" value={formatDepthsNumber(finiteNumber(move.accuracy, 0))} />
                    <DepthsStatIconPill
                      icon={DEPTHS_STAT_ICON_BY_KEY.cooldown}
                      alt="cooldown"
                      value={`${formatDepthsNumber(cooldownBreakdown.finalCooldown)}s`}
                    />
                    <Chip label={getCardUpgradeMoveEffectLabel(move)} size="small" sx={{ color: THEME.gold, border: `1px solid ${THEME.line}`, background: "rgba(0,0,0,0.42)" }} />
                  </Box>
                  {powerBreakdownRows.length ? (
                    <Box sx={{ mt: 0.65, display: "grid", gap: 0.2 }}>
                      {powerBreakdownRows.map((row) => (
                        <Typography key={row} sx={{ color: THEME.muted, fontSize: 10, lineHeight: 1.25 }}>
                          {row}
                        </Typography>
                      ))}
                    </Box>
                  ) : null}
                  {accuracyRows.length ? (
                    <Box sx={{ mt: 0.65, display: "grid", gap: 0.2 }}>
                      {accuracyRows.map((row) => (
                        <Typography key={row} sx={{ color: THEME.faint, fontSize: 10, lineHeight: 1.25 }}>
                          {row}
                        </Typography>
                      ))}
                    </Box>
                  ) : null}
                  {cooldownRows.length ? (
                    <Box sx={{ mt: 0.65, display: "grid", gap: 0.2 }}>
                      {cooldownRows.map((row) => (
                        <Typography key={row} sx={{ color: THEME.faint, fontSize: 10, lineHeight: 1.25 }}>
                          {row}
                        </Typography>
                      ))}
                    </Box>
                  ) : null}
                  {effectRows.length ? (
                    <Box sx={{ mt: 0.85, display: "grid", gap: 0.45 }}>
                      {effectRows.map((row) => (
                        <Box
                          key={row.key}
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 0.55,
                            border: `1px solid ${THEME.line}`,
                            borderRadius: 1,
                            background: "rgba(255,255,255,0.035)",
                            px: 0.7,
                            py: 0.55,
                          }}
                        >
                          {row.icon ? (
                            <EffectTooltipIcon effectKey={row.effectKey} src={row.icon} size={20} />
                          ) : null}
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ color: THEME.gold, fontSize: 10.5, fontWeight: 900, lineHeight: 1.2 }}>
                              {row.label} {formatDepthsNumber(row.finalAmount)}
                            </Typography>
                            <Typography sx={{ color: THEME.faint, fontSize: 9.2, lineHeight: 1.25, mt: 0.1 }}>
                              base {formatDepthsNumber(row.baseAmount)}
                              {row.upgradeBonus ? ` ${formatSignedAmount(row.upgradeBonus)} upgrades` : ""}
                              {row.championPotency
                                ? ` + ${formatDepthsNumber(row.championPotency * row.potencyMultiplier)} champion potency`
                                : ""}
                              {row.artifactPotency ? ` + ${formatDepthsNumber(row.artifactPotency)} artifacts` : ""}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  ) : null}
                  {labels.length ? (
                    <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.45 }}>
                      {labels.map((label) => (
                        <Chip
                          key={label}
                          size="small"
                          label={label}
                          sx={{ color: THEME.text, border: `1px solid ${THEME.line}`, background: "rgba(255,255,255,0.05)" }}
                        />
                      ))}
                    </Box>
                  ) : null}
                </Box>
              </Box>
            </Grid>
          );
          })}
        </Grid>

        <Box sx={{ mt: 2.5 }}>
          <Typography sx={{ ...medievalText, color: THEME.muted, fontSize: 11, mb: 1 }}>
            {selectedMove ? `Upgrade Options for ${selectedMove.name || "Selected Card"}` : "Select a Card"}
          </Typography>
          {selectedMove ? (
            <Grid container spacing={1.5}>
              {choices.map((upgrade) => {
                const additions = formatCardUpgradeAdditions(upgrade);
                return (
                  <Grid item xs={12} md={6} key={upgrade.id}>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => onChooseUpgrade(upgrade)}
                      sx={{
                        width: "100%",
                        height: "100%",
                        p: 1.6,
                        textAlign: "left",
                        color: THEME.text,
                        border: `1px solid ${THEME.line}`,
                        borderRadius: 1,
                        background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(0,0,0,0.9))",
                        cursor: "pointer",
                        font: "inherit",
                        "&:hover": {
                          borderColor: THEME.gold,
                          background: "linear-gradient(180deg, rgba(225,184,100,0.14), rgba(0,0,0,0.92))",
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.7, flexWrap: "wrap" }}>
                        <Typography sx={{ color: THEME.gold, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em" }}>
                          Card Upgrade
                        </Typography>
                        {upgrade.traitAwakening ? (
                          <Chip
                            size="small"
                            label={upgrade.traitAwakening}
                            sx={{
                              height: 22,
                              color: THEME.gold,
                              border: `1px solid ${THEME.gold}`,
                              background: "rgba(225,184,100,0.1)",
                              "& .MuiChip-label": { px: 0.8, fontSize: 9, fontWeight: 900 },
                            }}
                          />
                        ) : null}
                      </Box>
                      <Typography sx={{ color: THEME.text, fontSize: 20, fontWeight: 900, lineHeight: 1.15, mt: 0.5 }}>
                        {upgrade.name}
                      </Typography>
                      <Typography sx={{ color: THEME.muted, fontSize: 13, lineHeight: 1.45, mt: 0.8 }}>
                        {upgrade.description}
                      </Typography>
                      {additions.length ? (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.55, mt: 1.2 }}>
                          {additions.map((addition) => (
                            <Chip
                              key={addition}
                              label={addition}
                              sx={{
                                color: THEME.text,
                                border: `1px solid ${THEME.line}`,
                                borderRadius: 1,
                                background: "rgba(255,255,255,0.04)",
                                "& .MuiChip-label": {
                                  display: "block",
                                  whiteSpace: "normal",
                                  py: 0.35,
                                  lineHeight: 1.25,
                                },
                              }}
                            />
                          ))}
                        </Box>
                      ) : null}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <Typography sx={{ color: THEME.faint, fontSize: 13 }}>
              Pick a card above to roll two possible upgrades.
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function CompactCardUpgradePanel({
  champion,
  room,
  selectedUpgrades,
  selectedMoveIndex,
  choices,
  selectedChoiceKey = "",
  onSelectMove,
  onChooseUpgrade,
}) {
  const cardMoves = getDepthsChampionCardMoves(champion);
  const selectedMove =
    selectedMoveIndex !== null && selectedMoveIndex !== undefined
      ? cardMoves.find((entry) => entry.moveIndex === selectedMoveIndex)?.move || null
      : null;
  const locked = selectedMoveIndex !== null && selectedMoveIndex !== undefined;
  const bgSrc = getDepthsWorldBackground(room, "upgrade");

  return (
    <DepthsScenePanel bgSrc={bgSrc}>
      <DepthsChoiceHeader
        title="Upgrade Card"
        text={`Room ${room} elite reward for Champion #${champion?.assetId}. Choose a card, then choose one upgrade.`}
        action={
          <Chip
            label={`${selectedUpgrades.length} card upgrade${selectedUpgrades.length === 1 ? "" : "s"} active`}
            sx={{ color: THEME.text, border: `1px solid ${THEME.line}`, background: "rgba(0,0,0,0.58)" }}
          />
        }
      />

      <Box sx={{ minHeight: { xs: 260, md: 310 }, display: "grid", alignItems: "center", py: { xs: 1, md: 2 } }}>
        <DepthsFloatingChoiceRow title={selectedMove ? "Selected Card" : "Choose Card To Upgrade"}>
          {cardMoves.map(({ move, moveIndex }) => {
            const isSelected = selectedMoveIndex === moveIndex;
            return (
              <DepthsFloatingChoiceSlot key={getDepthsCardUpgradeMoveKey(move, moveIndex)}>
                <CompactCardUpgradeMoveTile
                  move={move}
                  moveIndex={moveIndex}
                  champion={champion}
                  selected={isSelected}
                  disabled={locked && !isSelected}
                  onChoose={onSelectMove}
                />
              </DepthsFloatingChoiceSlot>
            );
          })}
        </DepthsFloatingChoiceRow>
      </Box>

      <Box
        sx={{
          minHeight: { xs: 210, md: 250 },
          display: "grid",
          alignItems: "center",
          pb: { xs: 1.5, md: 2.5 },
        }}
      >
        {selectedMove ? (
          <DepthsFloatingChoiceRow title={`Upgrade Options for ${selectedMove.name || "Selected Card"}`}>
            {choices.map((upgrade) => {
              const key = String(upgrade.id || upgrade.name || "");
              return (
                <DepthsFloatingChoiceSlot key={upgrade.id}>
                  <CompactCardUpgradeChoiceTile
                    upgrade={upgrade}
                    selected={key === selectedChoiceKey}
                    disabled={Boolean(selectedChoiceKey) && key !== selectedChoiceKey}
                    onChoose={onChooseUpgrade}
                  />
                </DepthsFloatingChoiceSlot>
              );
            })}
          </DepthsFloatingChoiceRow>
        ) : (
          <Typography sx={{ color: THEME.faint, fontSize: 13 }}>
            Pick a card above to reveal two possible upgrades.
          </Typography>
        )}
      </Box>
    </DepthsScenePanel>
  );
}

function formatDepthsMultiplier(value) {
  const n = finiteNumber(value, 0);
  return `x${Number(n.toFixed(2)).toString()}`;
}

function DepthsEncounterScalingTooltip({ room, monsters = [] }) {
  const activeScalingRows = (monsters || [])
    .map((monster) => ({
      name: monster?.name || "Monster",
      scaling: monster?._depthsScaling || monster?.depthsScaling || null,
    }))
    .filter((entry) => entry.scaling);
  const preview = getDepthsEncounterScalingPreview(room);
  const rows = activeScalingRows.length
    ? activeScalingRows
    : [
        {
          name: "Projected solo medium monster",
          scaling: {
            tierLabel: "Medium",
            encounterCount: 1,
            statMultiplier: preview.statMultiplier,
            healthMultiplier: preview.healthMultiplier,
            speedMultiplier: preview.speedMultiplier,
            moveMultiplier: preview.moveMultiplier,
            effectMultiplier: preview.effectMultiplier,
            roomStatGrowth: preview.roomStatGrowth,
            roomHealthGrowth: preview.roomHealthGrowth,
            moveGrowth: preview.moveGrowth,
            effectGrowth: preview.effectGrowth,
          },
        },
      ];

  return (
    <Box sx={{ maxWidth: 360 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 950 }}>
        Encounter {room} Monster Scaling
      </Typography>
      <Typography sx={{ fontSize: 10.8, lineHeight: 1.35, mt: 0.45, color: "rgba(255,255,255,0.72)" }}>
        Monsters use the same scaling curve as before, then their final stats, move power, and effect potency use a {formatDepthsMultiplier(MONSTER_GLOBAL_STRENGTH_FACTOR)} strength factor. Monster speed stays at x1.
      </Typography>
      <Box sx={{ display: "grid", gap: 0.9, mt: 1 }}>
        {rows.map(({ name, scaling }, index) => (
          <Box key={`${name}-${index}`} sx={{ borderTop: `1px solid ${THEME.line}`, pt: 0.75 }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 900, color: THEME.text }}>
              {name}
            </Typography>
            <Typography sx={{ fontSize: 10.6, color: THEME.muted, mt: 0.15 }}>
              {scaling.tierLabel || "Monster"} tier | {scaling.encounterCount || 1} monster encounter
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.45, mt: 0.55 }}>
              <Typography sx={{ fontSize: 10.5 }}>Stats: {formatDepthsMultiplier(scaling.statMultiplier)}</Typography>
              <Typography sx={{ fontSize: 10.5 }}>Health: {formatDepthsMultiplier(scaling.healthMultiplier)}</Typography>
              <Typography sx={{ fontSize: 10.5 }}>Speed: {formatDepthsMultiplier(scaling.speedMultiplier)}</Typography>
              <Typography sx={{ fontSize: 10.5 }}>Move Power: {formatDepthsMultiplier(scaling.moveMultiplier)}</Typography>
              <Typography sx={{ fontSize: 10.5 }}>Effects: {formatDepthsMultiplier(scaling.effectMultiplier)}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
      <Typography sx={{ fontSize: 10.2, lineHeight: 1.35, mt: 1, color: "rgba(255,255,255,0.58)" }}>
        Room growth before the reduction: stats {formatDepthsMultiplier(preview.roomStatGrowth)}, health {formatDepthsMultiplier(preview.roomHealthGrowth)}, moves {formatDepthsMultiplier(preview.moveGrowth)}, effects {formatDepthsMultiplier(preview.effectGrowth)}.
      </Typography>
    </Box>
  );
}

function DepthsEncounterChip({ room, monsters = [] }) {
  return (
    <Tooltip arrow title={<DepthsEncounterScalingTooltip room={room} monsters={monsters} />}>
      <Chip
        label={`Encounter ${room}`}
        sx={{
          color: THEME.gold,
          border: `1px solid ${THEME.gold}`,
          background: "rgba(0,0,0,0.58)",
          fontFamily: "Jacques, Georgia, serif",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      />
    </Tooltip>
  );
}

function DepthsMapPanel({ map, currentNodeId, visitedNodeIds, room, onSelectNode }) {
  const currentNode = getDepthsMapNode(map, currentNodeId);
  const connectedNodes = getConnectedDepthsMapNodes(map, currentNodeId, visitedNodeIds);
  const availableIds = new Set(connectedNodes.map((node) => node.id));
  const visitedIds = new Set(visitedNodeIds);
  const nodes = map?.nodes || [];
  const lines = nodes.flatMap((node) =>
    (node.links || [])
      .map((targetId) => {
        const target = getDepthsMapNode(map, targetId);
        return target ? { from: node, to: target } : null;
      })
      .filter(Boolean)
  );

  return (
    <Box sx={{ ...panelStyle, p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <Box>
          <Typography sx={{ ...medievalText, color: THEME.text, fontSize: { xs: 22, md: 30 } }}>
            The Depths Map
          </Typography>
          <Typography sx={{ color: THEME.muted, fontSize: 14, mt: 0.7 }}>
            Choose a connected path from your current node. Encounter strength scales with run depth.
          </Typography>
        </Box>
        <DepthsEncounterChip room={room} />
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        {Object.entries(DEPTHS_MAP_NODE_CONFIG)
          .filter(([type]) => type !== "start")
          .map(([type, config]) => (
            <Tooltip
              key={type}
              arrow
              title={
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 900 }}>{config.label}</Typography>
                  <Typography sx={{ fontSize: 11, lineHeight: 1.35 }}>{config.description}</Typography>
                  <Typography sx={{ fontSize: 10.5, lineHeight: 1.35, mt: 0.4, color: "rgba(255,255,255,0.72)" }}>
                    {config.reward}
                  </Typography>
                </Box>
              }
            >
              <Chip
                icon={
                  <Box
                    component="img"
                    src={config.icon}
                    alt=""
                    sx={{ width: 20, height: 20, objectFit: "contain" }}
                  />
                }
                label={config.label}
                sx={{
                  color: config.color,
                  border: `1px solid ${config.color}`,
                  background: "rgba(0,0,0,0.46)",
                  "& .MuiChip-icon": { ml: 0.8 },
                }}
              />
            </Tooltip>
          ))}
      </Box>

      <Box
        sx={{
          position: "relative",
          height: { xs: 430, md: 540 },
          overflow: "hidden",
          border: `1px solid ${THEME.line}`,
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08), rgba(0,0,0,0.88) 58%, rgba(0,0,0,0.96))",
        }}
      >
        <Box
          component="svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}
        >
          {lines.map((line) => {
            const active =
              line.from.id === currentNodeId && availableIds.has(line.to.id);
            const traveled = visitedIds.has(line.from.id) && visitedIds.has(line.to.id);
            return (
              <path
                key={`${line.from.id}-${line.to.id}`}
                d={`M ${line.from.x} ${line.from.y} C ${line.from.x + 7} ${line.from.y}, ${line.to.x - 7} ${line.to.y}, ${line.to.x} ${line.to.y}`}
                stroke={active ? THEME.gold : traveled ? THEME.good : "rgba(255,255,255,0.22)"}
                strokeWidth={active ? 0.8 : 0.42}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}
        </Box>

        {nodes.map((node) => {
          const config = DEPTHS_MAP_NODE_CONFIG[node.type] || DEPTHS_MAP_NODE_CONFIG.basic;
          const isCurrent = node.id === currentNodeId;
          const isVisited = visitedIds.has(node.id);
          const isAvailable = availableIds.has(node.id);

          return (
            <Button
              key={node.id}
              disabled={!isAvailable}
              onClick={() => onSelectNode(node)}
              sx={{
                position: "absolute",
                zIndex: 2,
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: "translate(-50%, -50%)",
                width: { xs: 70, md: 92 },
                minWidth: 0,
                height: { xs: 58, md: 70 },
                borderRadius: 999,
                border: `1px solid ${
                  isCurrent ? THEME.text : isAvailable ? config.color : isVisited ? THEME.good : THEME.line
                }`,
                color: isCurrent ? THEME.text : isAvailable ? config.color : isVisited ? THEME.good : THEME.faint,
                background: isCurrent
                  ? "rgba(255,255,255,0.14)"
                  : isAvailable
                  ? "rgba(0,0,0,0.78)"
                  : isVisited
                  ? "rgba(159,232,112,0.10)"
                  : "rgba(0,0,0,0.52)",
                boxShadow: isAvailable ? `0 0 18px ${config.color}33` : "none",
                fontSize: { xs: 9, md: 10 },
                fontWeight: 900,
                lineHeight: 1.1,
                textTransform: "uppercase",
                whiteSpace: "normal",
                px: 0.6,
                display: "flex",
                flexDirection: "column",
                gap: 0.25,
                "&.Mui-disabled": {
                  color: isVisited ? THEME.good : THEME.faint,
                  borderColor: isVisited ? THEME.good : THEME.line,
                },
              }}
            >
              <Box
                component="img"
                src={config.icon}
                alt=""
                sx={{
                  width: { xs: 26, md: 32 },
                  height: { xs: 26, md: 32 },
                  objectFit: "contain",
                  opacity: isAvailable || isCurrent || isVisited ? 1 : 0.45,
                  filter: isAvailable ? `drop-shadow(0 0 10px ${config.color})` : "none",
                }}
              />
              <Box component="span">{isCurrent ? "Here" : config.label}</Box>
            </Button>
          );
        })}
      </Box>

      <Typography sx={{ color: THEME.muted, fontSize: 13, mt: 1.5 }}>
        Current path: {currentNode ? DEPTHS_MAP_NODE_CONFIG[currentNode.type]?.label || "Node" : "Start"}
      </Typography>
    </Box>
  );
}

function NodeResultPanel({
  result,
  room = 1,
  onContinue,
  darkCoinReward = null,
  rewardLoading = false,
  rewardError = "",
  rewardClaiming = false,
  depthsXpResult = null,
  depthsXpLoading = false,
  depthsXpError = "",
  onClaimReward = null,
}) {
  if (!result) return null;

  const endedRun = Boolean(result.completed || result.defeated || result.ended);
  const actionText = endedRun ? "Return to Champions" : "Continue";
  const resultRoom = result.room || room;
  const bgSrc = result.type === "rest" ? getDepthsWorldBackground(resultRoom, "rest") : ARENA_BG_SRC;
  const rewardAmount = darkCoinReward?.amountDisplay || formatDarkCoinAtomicAmount(darkCoinReward?.amountAtomic || 0);
  const rewardImageSrc = getDepthsRewardTierImage(darkCoinReward);
  const rewardClaimed = darkCoinReward?.status === "claimed" || Boolean(darkCoinReward?.claimTxId);
  const rewardGranted = isDarkCoinRewardGranted(darkCoinReward);
  const resultChampion = result.champion || {};
  const resultArtifacts = Array.isArray(result.artifacts) ? result.artifacts : [];
  const resultCards = Array.isArray(result.cards) ? result.cards : [];
  const resultCardUpgrades = Array.isArray(result.cardUpgrades) ? result.cardUpgrades : [];
  const resultCardRemovals = Array.isArray(result.cardRemovals) ? result.cardRemovals : [];
  const completedEncounters =
    Math.max(
      0,
      Math.round(
        finiteNumber(
          result.completedEncounters,
          getDepthsCompletedBattleNodeCount(result.depthsMap, result.visitedNodeIds)
        )
      )
    ) || 0;
  const resultDeckCopies = resultChampion?.charObj
    ? getDepthsChampionDeckCopyTotal(resultChampion)
    : resultCards.reduce((total, card) => total + getDepthsCardDeckCopies(card), 0);
  const finalHpRaw = result.finalChampionHp ?? resultChampion?.charObj?.depthsCurrentHp;
  const finalMaxHpRaw =
    result.finalChampionMaxHp ??
    resultChampion?.charObj?.depthsMaxHp ??
    getDepthsChampionMaxHpFromCharObj(resultChampion?.charObj || {});
  const hasFinalHp = Number.isFinite(Number(finalHpRaw)) && Number.isFinite(Number(finalMaxHpRaw));
  const finalHpText = hasFinalHp
    ? `${Math.max(0, Math.round(Number(finalHpRaw)))}/${Math.max(1, Math.round(Number(finalMaxHpRaw)))}`
    : "Unknown";
  const finalNode = getDepthsMapNode(result.depthsMap, result.currentNodeId);
  const finalNodeLabel =
    result.finalNodeLabel ||
    DEPTHS_MAP_NODE_CONFIG[result.finalNodeType || finalNode?.type]?.label ||
    "Final Encounter";
  const localXpBreakdown = getDepthsXpBreakdownFromResult(result);
  const serverXpBreakdown = depthsXpResult?.xpBreakdown || depthsXpResult?.breakdown || null;
  const xpBreakdown = serverXpBreakdown || localXpBreakdown;
  const xpAmount = Number(depthsXpResult?.xpAmount ?? xpBreakdown.totalXp ?? completedEncounters) || 0;
  const xpSummaryValue = depthsXpResult
    ? `${xpAmount} XP`
    : depthsXpLoading
      ? `${xpBreakdown.totalXp || 0} XP pending`
      : depthsXpError
        ? "Grant failed"
        : `${xpBreakdown.totalXp || 0} XP`;
  const resultRows = [
    {
      label: "Champion",
      value:
        resultChampion?.name ||
        resultChampion?.charObj?.name ||
        (result.championAssetId ? `Champion #${result.championAssetId}` : "Champion"),
    },
    { label: "Final Node", value: finalNodeLabel },
    { label: "Encounters", value: completedEncounters },
    {
      label: "Regular XP",
      value: `${xpBreakdown.regularEncounters || 0} x ${xpBreakdown.regularEncounterXpEach || DEPTHS_REGULAR_ENCOUNTER_XP} = ${xpBreakdown.regularEncounterXp || 0} XP`,
    },
    {
      label: "Elite XP",
      value: `${xpBreakdown.eliteEncounters || 0} x ${xpBreakdown.eliteEncounterXpEach || DEPTHS_ELITE_ENCOUNTER_XP} = ${xpBreakdown.eliteEncounterXp || 0} XP`,
    },
    { label: "Completion Bonus", value: `${xpBreakdown.completionBonusXp || 0} XP` },
    { label: "XP Earned", value: xpSummaryValue },
    { label: "Final HP", value: finalHpText },
    { label: "Artifacts", value: resultArtifacts.length },
    { label: "Cards In Deck", value: resultDeckCopies },
    { label: "Card Upgrades", value: resultCardUpgrades.length },
    { label: "Cards Removed", value: resultCardRemovals.length },
  ];

  return (
    <DepthsScenePanel bgSrc={bgSrc} minHeight={{ xs: "calc(100vh - 230px)", md: "calc(100vh - 220px)" }}>
      <Box
        sx={{
          maxWidth: 740,
          mx: "auto",
          mt: { xs: 3, md: 7 },
          p: { xs: 2.3, md: 3.4 },
          textAlign: "center",
          border: `1px solid ${THEME.line}`,
          borderRadius: 1,
          background: "rgba(0,0,0,0.62)",
          boxShadow: "0 18px 44px rgba(0,0,0,0.46)",
          backdropFilter: "blur(2px)",
        }}
      >
        <Typography sx={{ ...medievalText, color: THEME.text, fontSize: { xs: 24, md: 34 } }}>
          {result.title}
        </Typography>
        <Typography sx={{ color: THEME.muted, fontSize: 15, lineHeight: 1.6, mt: 1.2, maxWidth: 680, mx: "auto" }}>
          {result.text}
        </Typography>
        {result.detail ? (
          <Chip
            label={result.detail}
            sx={{ mt: 2, color: THEME.text, border: `1px solid ${THEME.line}`, background: "rgba(0,0,0,0.58)" }}
          />
        ) : null}
        {endedRun ? (
          <Box
            sx={{
              mt: 2.5,
              p: 2,
              border: `1px solid ${THEME.line}`,
              borderRadius: 1,
              background: "rgba(0,0,0,0.42)",
            }}
          >
            <Box
              sx={{
                mb: 2,
                pb: 2,
                borderBottom: `1px solid ${THEME.line}`,
              }}
            >
              <Typography sx={{ ...medievalText, color: THEME.text, fontSize: { xs: 18, md: 23 }, mb: 1.4 }}>
                Run Results
              </Typography>
              <Grid container spacing={1}>
                {resultRows.map((row) => (
                  <Grid item xs={6} sm={3} key={row.label}>
                    <Box
                      sx={{
                        minHeight: 64,
                        p: 1,
                        border: `1px solid ${THEME.line}`,
                        borderRadius: 1,
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <Typography sx={{ color: THEME.faint, fontSize: 10, textTransform: "uppercase" }}>
                        {row.label}
                      </Typography>
                      <Typography sx={{ color: THEME.text, fontSize: 14, fontWeight: 800, mt: 0.4 }}>
                        {row.value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
            {result.completed ? (
              <>
                {rewardLoading ? (
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.4 }}>
                    <CircularProgress size={18} sx={{ color: THEME.gold }} />
                    <Typography sx={{ color: THEME.text, fontSize: 14 }}>Rolling Dark Coin reward...</Typography>
                  </Box>
                ) : darkCoinReward ? (
                  <>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: { xs: 1.5, sm: 2 },
                        flexDirection: { xs: "column", sm: "row" },
                      }}
                    >
                      {rewardImageSrc ? (
                        <Box
                          component="img"
                          src={rewardImageSrc}
                          alt={darkCoinReward.label || "Depths reward cache"}
                          sx={{
                            width: { xs: 104, sm: 124 },
                            height: { xs: 104, sm: 124 },
                            objectFit: "contain",
                            filter: "drop-shadow(0 0 18px rgba(244,194,91,0.36))",
                          }}
                        />
                      ) : null}
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: THEME.gold, fontSize: 13, fontWeight: 900, letterSpacing: 0 }}>
                          {darkCoinReward.label || "Depths Reward"}
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.9,
                            mt: 0.5,
                          }}
                        >
                          <Box
                            component="img"
                            src={DARK_COIN_ICON_SRC}
                            alt="Dark Coin"
                            sx={{ width: { xs: 24, md: 30 }, height: { xs: 24, md: 30 }, objectFit: "contain" }}
                          />
                          <Typography sx={{ ...medievalText, color: THEME.gold, fontSize: { xs: 20, md: 28 } }}>
                            {rewardAmount} Dark Coin
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Typography sx={{ color: THEME.muted, fontSize: 13, mt: 0.7 }}>
                      {darkCoinReward.label || "Depths Reward"} pays {darkCoinReward.percentDisplay || "a percentage"} of the contract
                      balance
                      {darkCoinReward.chanceDisplay ? ` and has a ${darkCoinReward.chanceDisplay} roll chance.` : "."}
                    </Typography>
                    {darkCoinReward.grantTxId ? (
                      <Typography sx={{ color: THEME.faint, fontSize: 11, mt: 1 }}>
                        Grant transaction: {darkCoinReward.grantTxId}
                      </Typography>
                    ) : null}
                    {darkCoinReward.claimTxId ? (
                      <Typography sx={{ color: THEME.good, fontSize: 12, mt: 1 }}>
                        Claimed: {darkCoinReward.claimTxId}
                      </Typography>
                    ) : null}
                  </>
                ) : rewardError ? (
                  <Typography sx={{ color: THEME.bad, fontSize: 13, lineHeight: 1.5 }}>{rewardError}</Typography>
                ) : (
                  <Typography sx={{ color: THEME.muted, fontSize: 13 }}>Reward roll is waiting for server confirmation.</Typography>
                )}

                {darkCoinReward && rewardGranted && !rewardClaimed ? (
                  <Button
                    startIcon={rewardClaiming ? <CircularProgress size={16} sx={{ color: THEME.text }} /> : <AutoAwesomeIcon />}
                    disabled={rewardClaiming || !onClaimReward}
                    onClick={onClaimReward}
                    sx={{ ...buttonStyle, mt: 2, minHeight: 42 }}
                  >
                    {rewardClaiming ? "Claiming Dark Coin..." : "Claim Dark Coin"}
                  </Button>
                ) : null}
              </>
            ) : null}
            {depthsXpLoading ? (
              <Typography sx={{ color: THEME.muted, fontSize: 12, mt: 1.5 }}>
                Granting champion XP...
              </Typography>
            ) : depthsXpResult ? (
              <>
                <Typography sx={{ color: THEME.good, fontSize: 12, mt: 1.5 }}>
                  {xpAmount} XP awarded for this run.
                </Typography>
                {depthsXpResult.xpTxId ? (
                  <Typography sx={{ color: THEME.faint, fontSize: 11, mt: 0.7 }}>
                    XP transaction: {depthsXpResult.xpTxId}
                  </Typography>
                ) : null}
              </>
            ) : depthsXpError ? (
              <Typography sx={{ color: THEME.bad, fontSize: 12, mt: 1.5 }}>{depthsXpError}</Typography>
            ) : null}
          </Box>
        ) : null}
        {rewardError && !endedRun ? (
          <Typography sx={{ color: THEME.bad, fontSize: 12, mt: 1.5 }}>{rewardError}</Typography>
        ) : null}
        <Box sx={{ mt: 3 }}>
          <Button startIcon={<AutoAwesomeIcon />} onClick={onContinue} sx={{ ...buttonStyle, minHeight: 44 }}>
            {actionText}
          </Button>
        </Box>
      </Box>
    </DepthsScenePanel>
  );
}

function DepthsWalletRewardPanel({
  visible = false,
  reward = null,
  loading = false,
  claiming = false,
  status = "",
  error = "",
  onClaim = null,
}) {
  if (!visible) return null;

  const rewardAmount = reward?.amountDisplay || "";
  const hasReward = Boolean(rewardAmount) && BigInt(normalizeAtomicAmountString(reward?.amountAtomic) || "0") > 0n;

  return (
    <Box
      sx={{
        ...panelStyle,
        mt: 2,
        p: 2,
        display: "flex",
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
        flexDirection: { xs: "column", sm: "row" },
        gap: 1.5,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ ...medievalText, color: THEME.text, fontSize: 15 }}>
          Wallet Depths Rewards
        </Typography>
        <Typography sx={{ color: THEME.muted, fontSize: 12, mt: 0.5, lineHeight: 1.5 }}>
          Claim all Dark Coin rewards currently granted to this wallet.
        </Typography>
        {loading ? (
          <Typography sx={{ color: THEME.muted, fontSize: 13, mt: 0.75 }}>Checking wallet reward box...</Typography>
        ) : hasReward ? (
          <Typography sx={{ color: THEME.gold, fontSize: 13, mt: 0.75, lineHeight: 1.45 }}>
            {rewardAmount} Dark Coin available to claim.
          </Typography>
        ) : (
          <Typography sx={{ color: THEME.faint, fontSize: 13, mt: 0.75, lineHeight: 1.45 }}>
            No claimable Depths rewards found for this wallet.
          </Typography>
        )}
        {status ? (
          <Typography sx={{ color: THEME.good, fontSize: 12, mt: 0.75, lineHeight: 1.45, wordBreak: "break-word" }}>
            {status}
          </Typography>
        ) : null}
        {error ? (
          <Typography sx={{ color: THEME.bad, fontSize: 12, mt: 0.75, lineHeight: 1.45 }}>
            {error}
          </Typography>
        ) : null}
      </Box>

      {hasReward ? (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", flexShrink: 0 }}>
          <Button
            startIcon={claiming ? <CircularProgress size={16} sx={{ color: THEME.text }} /> : <AutoAwesomeIcon />}
            disabled={loading || claiming || !onClaim}
            onClick={onClaim}
            sx={{ ...buttonStyle, minHeight: 40 }}
          >
            {claiming ? "Claiming..." : "Claim All Rewards"}
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}

function DepthsRewardOddsPanel({ odds = null, loading = false, error = "" }) {
  const tiers = Array.isArray(odds?.rewardTiers) ? odds.rewardTiers : [];
  const xp = odds?.xp || {};

  return (
    <Box sx={{ ...panelStyle, mt: 2, p: { xs: 2, md: 2.5 } }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
        <Box>
          <Typography sx={{ ...medievalText, color: THEME.text, fontSize: 15 }}>
            Depths Rewards
          </Typography>
          <Typography sx={{ color: THEME.muted, fontSize: 12, mt: 0.5, lineHeight: 1.45 }}>
            Rewards are rolled from the current Dark Coin balance held by the Depths contract.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
          <Box component="img" src={DARK_COIN_ICON_SRC} alt="Dark Coin" sx={{ width: 24, height: 24, objectFit: "contain" }} />
          <Typography sx={{ color: THEME.gold, fontSize: 14, fontWeight: 900 }}>
            {loading ? "Loading..." : `${odds?.contractBalanceDisplay || "0"} Dark Coin`}
          </Typography>
        </Box>
      </Box>

      {error ? (
        <Typography sx={{ color: THEME.bad, fontSize: 12, mt: 1.5 }}>{error}</Typography>
      ) : null}

      {tiers.length ? (
        <Grid container spacing={1.2} sx={{ mt: 1.4 }}>
          {tiers.map((tier) => (
            <Grid item xs={12} sm={6} md={2.4} key={tier.id}>
              <Box
                sx={{
                  height: "100%",
                  p: 1.3,
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 1,
                  background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.78))",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                  <Box
                    component="img"
                    src={DEPTHS_REWARD_TIER_IMAGES[tier.id] || DARK_COIN_ICON_SRC}
                    alt=""
                    sx={{ width: 34, height: 34, objectFit: "contain", flexShrink: 0 }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: THEME.text, fontSize: 12, fontWeight: 950, lineHeight: 1.15 }}>
                      {tier.label}
                    </Typography>
                    <Typography sx={{ color: THEME.gold, fontSize: 11, mt: 0.25 }}>
                      {tier.chanceDisplay} chance
                    </Typography>
                  </Box>
                </Box>
                <Typography sx={{ color: THEME.muted, fontSize: 11.5, mt: 1, lineHeight: 1.35 }}>
                  {tier.percentDisplay} of balance
                </Typography>
                <Typography sx={{ color: THEME.text, fontSize: 13, fontWeight: 900, mt: 0.35 }}>
                  {tier.amountDisplay} Dark Coin
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      ) : loading ? (
        <Typography sx={{ color: THEME.muted, fontSize: 12, mt: 1.5 }}>Calculating reward odds...</Typography>
      ) : null}

      <Box
        sx={{
          mt: 1.8,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 1,
        }}
      >
        {[
          { label: "Regular Encounter", value: `${xp.regularEncounterXp ?? DEPTHS_REGULAR_ENCOUNTER_XP} XP` },
          { label: "Elite Encounter", value: `${xp.eliteEncounterXp ?? DEPTHS_ELITE_ENCOUNTER_XP} XP` },
          { label: "Run Completion Bonus", value: `${xp.completionBonusXp ?? DEPTHS_COMPLETION_BONUS_XP} XP` },
        ].map((entry) => (
          <Box
            key={entry.label}
            sx={{
              p: 1.1,
              border: `1px solid ${THEME.lineSoft}`,
              borderRadius: 1,
              background: "rgba(0,0,0,0.35)",
            }}
          >
            <Typography sx={{ color: THEME.faint, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.13em" }}>
              {entry.label}
            </Typography>
            <Typography sx={{ color: THEME.text, fontSize: 15, fontWeight: 950, mt: 0.2 }}>
              {entry.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function DepthsPage(props) {
  const { activeAddress, signTransactions } = useWallet();
  const [walletRows, setWalletRows] = useState([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [championRecords, setChampionRecords] = useState([]);
  const [championLoading, setChampionLoading] = useState(false);
  const [championError, setChampionError] = useState("");
  const [monsters, setMonsters] = useState([]);
  const [monsterLoading, setMonsterLoading] = useState(true);
  const [monsterError, setMonsterError] = useState("");
  const [cards, setCards] = useState([]);
  const [cardLoading, setCardLoading] = useState(true);
  const [cardError, setCardError] = useState("");
  const [selectedChampion, setSelectedChampion] = useState(null);
  const [runChampion, setRunChampion] = useState(null);
  const [runArtifacts, setRunArtifacts] = useState([]);
  const [runCards, setRunCards] = useState([]);
  const [runCardUpgrades, setRunCardUpgrades] = useState([]);
  const [runCardRemovals, setRunCardRemovals] = useState([]);
  const [artifactChoices, setArtifactChoices] = useState([]);
  const [cardChoices, setCardChoices] = useState([]);
  const [cardUpgradeChoices, setCardUpgradeChoices] = useState([]);
  const [choosingStartLoadout, setChoosingStartLoadout] = useState(false);
  const [selectedStartArtifact, setSelectedStartArtifact] = useState(null);
  const [selectedStartCard, setSelectedStartCard] = useState(null);
  const [choosingCard, setChoosingCard] = useState(false);
  const [choosingArtifact, setChoosingArtifact] = useState(false);
  const [choosingCardUpgrade, setChoosingCardUpgrade] = useState(false);
  const [choosingCardRemoval, setChoosingCardRemoval] = useState(false);
  const [selectedUpgradeMoveIndex, setSelectedUpgradeMoveIndex] = useState(null);
  const [artifactChoiceContext, setArtifactChoiceContext] = useState(null);
  const [activeQuest, setActiveQuest] = useState(null);
  const [questResult, setQuestResult] = useState(null);
  const [cardRemovalContext, setCardRemovalContext] = useState(null);
  const [runId, setRunId] = useState(null);
  const [runToken, setRunToken] = useState(null);
  const [, setRunServerWriteVersion] = useState(0);
  const [currentMonsters, setCurrentMonsters] = useState([]);
  const [resumedBattle, setResumedBattle] = useState(null);
  const [room, setRoom] = useState(1);
  const [depthsMap, setDepthsMap] = useState(null);
  const [currentNodeId, setCurrentNodeId] = useState("start");
  const [visitedNodeIds, setVisitedNodeIds] = useState(["start"]);
  const [nodeResult, setNodeResult] = useState(null);
  const [darkCoinReward, setDarkCoinReward] = useState(null);
  const [darkCoinRewardLoading, setDarkCoinRewardLoading] = useState(false);
  const [darkCoinRewardError, setDarkCoinRewardError] = useState("");
  const [darkCoinRewardClaiming, setDarkCoinRewardClaiming] = useState(false);
  const [walletDepthsReward, setWalletDepthsReward] = useState(null);
  const [walletDepthsRewardLoading, setWalletDepthsRewardLoading] = useState(false);
  const [walletDepthsRewardClaiming, setWalletDepthsRewardClaiming] = useState(false);
  const [walletDepthsRewardStatus, setWalletDepthsRewardStatus] = useState("");
  const [walletDepthsRewardError, setWalletDepthsRewardError] = useState("");
  const [depthsRewardOdds, setDepthsRewardOdds] = useState(null);
  const [depthsRewardOddsLoading, setDepthsRewardOddsLoading] = useState(false);
  const [depthsRewardOddsError, setDepthsRewardOddsError] = useState("");
  const lastDepthsRunUpdateErrorRef = useRef("");
  const [depthsXpResult, setDepthsXpResult] = useState(null);
  const [depthsXpLoading, setDepthsXpLoading] = useState(false);
  const [depthsXpError, setDepthsXpError] = useState("");
  const [entryPaymentStatus, setEntryPaymentStatus] = useState("");
  const [entryPaymentError, setEntryPaymentError] = useState("");
  const [entryPaymentPrompt, setEntryPaymentPrompt] = useState(null);
  const [entryPaymentSubmitting, setEntryPaymentSubmitting] = useState(false);
  const [championEntryInfoByAssetId, setChampionEntryInfoByAssetId] = useState({});
  const [championEntryInfoLoading, setChampionEntryInfoLoading] = useState(false);
  const [objectModalRecord, setObjectModalRecord] = useState(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [lockedDepthsChoiceKey, setLockedDepthsChoiceKey] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);
  const battleAdvanceTimeoutRef = useRef(null);
  const choiceLockTimeoutRef = useRef(null);
  const choiceLockRef = useRef(false);
  const runDocRef = useRef(null);
  const runTokenRef = useRef(null);
  const runServerWriteVersionRef = useRef(0);

  const propWalletRows = normalizeArray(props.wallet);
  const visibleWalletRows = propWalletRows.length ? propWalletRows : walletRows;
  const championAssetIds = useMemo(() => {
    const ids = visibleWalletRows
      .filter((warrior) => isDarkCoinChampion(warrior))
      .map((warrior) => getWarriorAssetId(warrior))
      .filter(Boolean)
      .map((id) => String(id));

    return [...new Set(ids)];
  }, [visibleWalletRows]);

  const playableChampions = useMemo(() => {
    return championRecords.filter(
      (record) => record?.exists && record?.charObj && Array.isArray(record.charObj.moves) && record.charObj.moves.length > 0
    );
  }, [championRecords]);

  const playableChampionEntryKey = useMemo(
    () => playableChampions.map((record) => String(record.assetId || "")).filter(Boolean).join("|"),
    [playableChampions]
  );

  const playableMonsters = useMemo(() => {
    return monsters.filter((monster) => Array.isArray(monster?.moves) && monster.moves.length > 0);
  }, [monsters]);

  const playableCards = useMemo(() => {
    return cards.filter((card) => card?.name && card?.type);
  }, [cards]);

  const startLoadoutPreviewChampion = useMemo(() => {
    if (!selectedChampion) return null;
    const previewArtifacts = selectedStartArtifact
      ? [summarizeDepthsArtifact(selectedStartArtifact, room)]
      : [];
    const previewCards = selectedStartCard ? [summarizeDepthsCard(selectedStartCard, room)] : [];

    return applyDepthsRunBonusesPreservingHp(
      selectedChampion,
      previewArtifacts,
      runCardUpgrades,
      previewCards,
      runCardRemovals,
      null,
      { preservePreviousHp: false }
    );
  }, [selectedChampion, selectedStartArtifact, selectedStartCard, room, runCardUpgrades, runCardRemovals]);

  const breakdownChampion = choosingStartLoadout
    ? startLoadoutPreviewChampion || selectedChampion
    : runChampion || selectedChampion;
  const breakdownArtifacts = choosingStartLoadout
    ? selectedStartArtifact
      ? [summarizeDepthsArtifact(selectedStartArtifact, room)]
      : []
    : runArtifacts;
  const breakdownCards = choosingStartLoadout
    ? selectedStartCard
      ? [summarizeDepthsCard(selectedStartCard, room)]
      : []
    : runCards;

  const clearBattleAdvanceTimeout = () => {
    if (!battleAdvanceTimeoutRef.current) return;
    window.clearTimeout(battleAdvanceTimeoutRef.current);
    battleAdvanceTimeoutRef.current = null;
  };

  const clearChoiceLockTimeout = () => {
    if (choiceLockTimeoutRef.current) {
      window.clearTimeout(choiceLockTimeoutRef.current);
      choiceLockTimeoutRef.current = null;
    }
    choiceLockRef.current = false;
    setLockedDepthsChoiceKey("");
  };

  const setDepthsRunIdentity = ({ id = null, runToken: token = null, serverWriteVersion = 0 } = {}) => {
    const nextVersion = Number(serverWriteVersion || 0);
    runDocRef.current = id || null;
    runTokenRef.current = token || null;
    runServerWriteVersionRef.current = nextVersion;
    setRunId(id || null);
    setRunToken(token || null);
    setRunServerWriteVersion(nextVersion);
  };

  const runLockedDepthsChoice = (key, action, delay = 430) => {
    if (choiceLockRef.current) return;
    choiceLockRef.current = true;
    setLockedDepthsChoiceKey(key);
    if (choiceLockTimeoutRef.current) {
      window.clearTimeout(choiceLockTimeoutRef.current);
    }
    choiceLockTimeoutRef.current = window.setTimeout(() => {
      choiceLockTimeoutRef.current = null;
      action();
      choiceLockRef.current = false;
      setLockedDepthsChoiceKey("");
    }, delay);
  };

  const finishStartLoadoutAfterChoice = (artifact, card, key) => {
    if (!artifact || !card || choiceLockRef.current) return;
    choiceLockRef.current = true;
    setLockedDepthsChoiceKey(key);
    if (choiceLockTimeoutRef.current) {
      window.clearTimeout(choiceLockTimeoutRef.current);
    }
    choiceLockTimeoutRef.current = window.setTimeout(() => {
      choiceLockTimeoutRef.current = null;
      Promise.resolve(confirmStartLoadout(artifact, card)).finally(() => {
        choiceLockRef.current = false;
        setLockedDepthsChoiceKey("");
      });
    }, 520);
  };

  const pickRandomMonsters = (count = 1, worldKeys = []) => {
    if (!playableMonsters.length) return [];

    const worldPool = playableMonsters.filter((monster) =>
      isMonsterAvailableForDepthsWorld(monster, worldKeys)
    );
    const monsterPool = worldPool.length ? worldPool : playableMonsters;
    const shuffled = shuffleRows(monsterPool);
    const selected = shuffled.slice(0, count);

    while (selected.length < count) {
      selected.push(monsterPool[Math.floor(Math.random() * monsterPool.length)]);
    }

    return selected;
  };

  const pickRoomMonsters = (roomNumber, mapNode = null) => {
    const formation = mapNode
      ? getEncounterFormationForMapNode(mapNode, roomNumber)
      : pickEncounterFormation(roomNumber);
    const worldKeys = getDepthsEncounterWorldKeys(roomNumber);
    return pickRandomMonsters(formation.count, worldKeys).map((monster, index) =>
      scaleMonsterForRoom(monster, roomNumber, formation, index)
    );
  };

  const updateDepthsRun = async (updates = {}, options = {}) => {
    if (!runDocRef.current) return;
    const maxAttempts = options.retryOnStale === false ? 1 : 2;
    const compactUpdates = compactDepthsRunUpdatesForStorage(updates);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        lastDepthsRunUpdateErrorRef.current = "";
        const result = await postDepthsState({
          action: "updateRun",
          runId: runDocRef.current,
          runToken: runTokenRef.current,
          expectedServerWriteVersion: runServerWriteVersionRef.current,
          updates: compactUpdates,
        });
        if (result?.serverWriteVersion) {
          runServerWriteVersionRef.current = Number(result.serverWriteVersion);
          setRunServerWriteVersion(Number(result.serverWriteVersion));
        }
        return result;
      } catch (error) {
        if (error?.body?.staleRunUpdate && error.body.serverWriteVersion) {
          runServerWriteVersionRef.current = Number(error.body.serverWriteVersion);
          setRunServerWriteVersion(Number(error.body.serverWriteVersion));
          if (attempt + 1 < maxAttempts) continue;
        }
        console.warn("Depths run update failed:", error);
        lastDepthsRunUpdateErrorRef.current = error?.message || "Depths run update failed.";
        return null;
      }
    }

    return null;
  };

  const loadDepthsRewardOdds = async () => {
    setDepthsRewardOddsLoading(true);
    setDepthsRewardOddsError("");

    try {
      const response = await fetch("/api/arena/claimDepthsReward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getRewardOdds" }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || `Depths reward odds failed with status ${response.status}`);
      }
      setDepthsRewardOdds(body);
      return body;
    } catch (error) {
      console.warn("Depths reward odds failed:", error);
      setDepthsRewardOddsError(error?.message || "Could not load Depths reward odds.");
      return null;
    } finally {
      setDepthsRewardOddsLoading(false);
    }
  };

  const finalizeDepthsRunXp = async ({
    runId: targetRunId = runDocRef.current,
    runToken: targetRunToken = runTokenRef.current,
    championAssetId = selectedChampion?.assetId,
  } = {}) => {
    if (!targetRunId || !targetRunToken) return null;

    setDepthsXpLoading(true);
    setDepthsXpError("");

    try {
      const response = await fetch("/api/arena/claimDepthsReward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "finalizeRunXp",
          runId: targetRunId,
          runToken: targetRunToken,
          championAssetId,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || `Depths XP API failed with status ${response.status}`);
      }
      setDepthsXpResult(body);
      return body;
    } catch (error) {
      console.warn("Depths XP finalization failed:", error);
      setDepthsXpError(error?.message || "Could not grant Depths XP.");
      return null;
    } finally {
      setDepthsXpLoading(false);
    }
  };

  const requestDarkCoinRewardGrant = async ({
    runId: targetRunId = runDocRef.current,
    runToken: targetRunToken = runTokenRef.current,
    championAssetId = selectedChampion?.assetId,
  } = {}) => {
    if (!targetRunId || !targetRunToken) return null;

    setDarkCoinRewardLoading(true);
    setDarkCoinRewardError("");

    try {
      const response = await fetch("/api/arena/claimDepthsReward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grantDarkCoin",
          runId: targetRunId,
          runToken: targetRunToken,
          championAssetId,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || `Depths reward API failed with status ${response.status}`);
      }

      const reward = body.darkCoinReward || null;
      setDarkCoinReward(reward);
      if (reward && String(reward.walletAddress || "").trim() === activeAddress) {
        setWalletDepthsReward(reward);
      }
      return reward;
    } catch (error) {
      console.warn("Depths Dark Coin reward grant failed:", error);
      setDarkCoinRewardError(error?.message || "Could not roll the Depths Dark Coin reward.");
      return null;
    } finally {
      setDarkCoinRewardLoading(false);
    }
  };

  const postDepthsRunDiscordResult = async ({
    runId: targetRunId = runDocRef.current,
    runToken: targetRunToken = runTokenRef.current,
  } = {}) => {
    if (!targetRunId || !targetRunToken) return null;

    try {
      const response = await fetch("/api/arena/postDepthsBattleResult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: targetRunId,
          runToken: targetRunToken,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || `Depths Discord API failed with status ${response.status}`);
      }
      return body;
    } catch (error) {
      console.warn("Depths run Discord post failed:", error);
      return null;
    }
  };

  const submitDepthsEntryPayment = async (payment = {}) => {
    if (!activeAddress) {
      throw new Error("Connect your wallet before starting a paid Depths run.");
    }
    if (!signTransactions) {
      throw new Error("Connected wallet cannot sign the paid Depths entry transaction.");
    }

    const assetId = Number(payment.assetId || DARK_COIN_ASSET_ID);
    const amountAtomicText = normalizeAtomicAmountString(payment.amountAtomic);
    const amountAtomic = atomicAmountToSafeNumber(payment.amountAtomic, "Depths entry payment amount");
    const depthsAppId = Number(payment.appId || getDepthsRewardAppId(props.contracts));
    const receiver =
      normalizeAlgorandAddress(payment.receiver) ||
      getApplicationAddressString(depthsAppId);

    if (!receiver || !algosdk.isValidAddress(receiver)) {
      throw new Error("Depths entry payment receiver is not configured.");
    }
    if (Number.isSafeInteger(depthsAppId) && depthsAppId > 0) {
      const expectedReceiver = getApplicationAddressString(depthsAppId);
      if (receiver !== expectedReceiver) {
        throw new Error("Depths entry payment must be sent to the Depths contract address.");
      }
    }
    if (!Number.isSafeInteger(assetId) || assetId <= 0) {
      throw new Error("Depths entry payment asset is not configured.");
    }
    setEntryPaymentStatus(
      `Sign ${formatDarkCoinAtomicAmount(amountAtomicText, payment.decimals || DARK_COIN_DECIMALS)} Dark Coin payment to the Depths contract`
    );

    const algod = new algosdk.Algodv2("", ALGOD_BASE, 443);
    const suggestedParams = await algod.getTransactionParams().do();
    const note = {
      kind: "darkcoin-depths-entry-payment",
      championAssetId: Number(payment.championAssetId || entryPaymentPrompt?.record?.assetId || 0) || null,
      dailyKey: payment.dailyKey || null,
      runNumber: Number(payment.runNumber || 0) || null,
      amountAtomic: amountAtomicText,
      assetId,
      receiver,
    };
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: activeAddress,
      receiver,
      assetIndex: assetId,
      amount: amountAtomic,
      suggestedParams,
      note: textBytes(JSON.stringify(note)),
    });

    const encodedTxn = algosdk.encodeUnsignedTransaction(txn);
    const signedTransactions = await signTransactions([encodedTxn]);

    setEntryPaymentStatus("Sending Dark Coin payment");
    const sendResult = await algod.sendRawTransaction(signedTransactions).do();
    const txId = sendResult?.txid || sendResult?.txId || txn.txID();

    setEntryPaymentStatus("Confirming Dark Coin payment");
    await algosdk.waitForConfirmation(algod, txId, 4);
    return txId;
  };

  const createDepthsEntryWalletProof = async (record) => {
    if (!activeAddress) {
      throw new Error("Connect your wallet before starting The Depths.");
    }
    if (!signTransactions) {
      throw new Error("Connected wallet cannot sign the Depths entry proof.");
    }

    const championAssetId = Number(record?.assetId || 0);
    if (!Number.isSafeInteger(championAssetId) || championAssetId <= 0) {
      throw new Error("Champion asset id is missing.");
    }

    setEntryPaymentStatus("Sign Depths entry proof");

    const algod = new algosdk.Algodv2("", ALGOD_BASE, 443);
    const suggestedParams = await algod.getTransactionParams().do();
    const note = buildDepthsEntryProofNote({
      walletAddress: activeAddress,
      championAssetId,
    });
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: activeAddress,
      receiver: activeAddress,
      amount: 0,
      suggestedParams,
      note: textBytes(JSON.stringify(note)),
    });

    const encodedTxn = algosdk.encodeUnsignedTransaction(txn);
    const signedTransactions = await signTransactions([encodedTxn]);
    const signedTxn = signedTransactions?.[0];
    if (!signedTxn) {
      throw new Error("Depths entry proof was not signed.");
    }

    return {
      signedTxn: bytesToBase64(signedTxn),
    };
  };

  const createDepthsResumeWalletProof = async (record) => {
    if (!activeAddress) {
      throw new Error("Connect your wallet before resuming The Depths.");
    }
    if (!signTransactions) {
      throw new Error("Connected wallet cannot sign the Depths resume proof.");
    }

    const championAssetId = Number(record?.assetId || 0);
    if (!Number.isSafeInteger(championAssetId) || championAssetId <= 0) {
      throw new Error("Champion asset id is missing.");
    }

    setEntryPaymentStatus("Sign Depths resume proof");

    const algod = new algosdk.Algodv2("", ALGOD_BASE, 443);
    const suggestedParams = await algod.getTransactionParams().do();
    const note = buildDepthsResumeProofNote({
      walletAddress: activeAddress,
      championAssetId,
    });
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: activeAddress,
      receiver: activeAddress,
      amount: 0,
      suggestedParams,
      note: textBytes(JSON.stringify(note)),
    });

    const encodedTxn = algosdk.encodeUnsignedTransaction(txn);
    const signedTransactions = await signTransactions([encodedTxn]);
    const signedTxn = signedTransactions?.[0];
    if (!signedTxn) {
      throw new Error("Depths resume proof was not signed.");
    }

    return {
      signedTxn: bytesToBase64(signedTxn),
    };
  };

  const hydrateSavedRunMonsters = (runData = {}) => {
    const savedMonsters = Array.isArray(runData.currentMonsters) ? runData.currentMonsters : [];
    if (savedMonsters.length) {
      return rehydrateDepthsMonstersForRun(
        savedMonsters,
        playableMonsters,
        Array.isArray(runData.currentMonsterScaling) ? runData.currentMonsterScaling : []
      );
    }

    const ids = Array.isArray(runData.currentMonsterIds) ? runData.currentMonsterIds : [];
    const scalingRows = Array.isArray(runData.currentMonsterScaling) ? runData.currentMonsterScaling : [];
    return ids
      .map((id, index) => {
        const key = String(id || "");
        const baseMonster = playableMonsters.find((entry) =>
          [entry.docId, entry.monsterId, entry.id].map((value) => String(value || "")).includes(key)
        );
        if (!baseMonster) return null;
        return {
          ...JSON.parse(JSON.stringify(baseMonster)),
          _depthsScaling: scalingRows[index] || baseMonster._depthsScaling || baseMonster.depthsScaling || null,
        };
      })
      .filter(Boolean);
  };

  const buildSavedBattleCompletionResult = (savedBattle = {}) => {
    const snapshot = savedBattle?.snapshot || savedBattle?.resolvedSnapshot || savedBattle?.resumeSnapshot || {};
    const winner = savedBattle?.serverVerifiedWinner || savedBattle?.winner || snapshot?.winner || "";
    if (!winner) return null;

    return {
      winner,
      battle: {
        id: savedBattle.id || savedBattle.battleId || null,
        ...savedBattle,
        status: "complete",
        winner,
        fighters: {
          A: snapshot.champion || savedBattle.championRunSnapshot || {},
          ...(Array.isArray(snapshot.monsters)
            ? snapshot.monsters.reduce((acc, monster, index) => {
                acc[monster?.side || String.fromCharCode("B".charCodeAt(0) + index)] = monster;
                return acc;
              }, {})
            : snapshot.monster
            ? { B: snapshot.monster }
            : {}),
        },
        killingBlow: savedBattle.killingBlow || snapshot.killingBlow || null,
      },
    };
  };

  const applyResumedDepthsRun = ({ record, resumePayload }) => {
    const runData = resumePayload?.run || resumePayload || {};
    const latestBattle = resumePayload?.latestBattle || null;
    const status = String(runData.status || "map");
    const artifacts = Array.isArray(runData.artifacts) ? runData.artifacts : [];
    const cardsForRun = rehydrateDepthsCardsForRun(
      Array.isArray(runData.cards) ? runData.cards : [],
      cards
    );
    const cardUpgrades = Array.isArray(runData.cardUpgrades) ? runData.cardUpgrades : [];
    const cardRemovals = Array.isArray(runData.cardRemovals) ? runData.cardRemovals : [];
    const baseChampion = {
      ...(record || {}),
      charObj: record?.charObj || runData.championSnapshot || {},
    };
    const savedChampion = runData.championSnapshot
      ? { ...baseChampion, charObj: runData.championSnapshot }
      : baseChampion;
    const nextChampion = applyDepthsRunBonusesPreservingHp(
      baseChampion,
      artifacts,
      cardUpgrades,
      cardsForRun,
      cardRemovals,
      savedChampion,
      { preservePreviousHp: true }
    );
    const savedMap = runData.depthsMap || null;
    const savedNodeId = runData.currentNodeId || "start";
    const savedVisited = Array.isArray(runData.visitedNodeIds) && runData.visitedNodeIds.length
      ? runData.visitedNodeIds
      : ["start"];
    const savedArtifactChoices = Array.isArray(runData.artifactChoices) ? runData.artifactChoices : [];
    const savedCardChoices = rehydrateDepthsCardsForRun(
      Array.isArray(runData.cardChoices) ? runData.cardChoices : [],
      cards
    );
    const savedCardUpgradeChoices = Array.isArray(runData.cardUpgradeChoices) ? runData.cardUpgradeChoices : [];
    const savedMonsters = status === "active" ? hydrateSavedRunMonsters(runData) : [];
    const latestBattleStatus = String(latestBattle?.status || "");
    const latestBattleNodeId = String(
      latestBattle?.currentNodeId ||
        latestBattle?.snapshot?.currentNodeId ||
        latestBattle?.resumeSnapshot?.currentNodeId ||
        latestBattle?.resolvedSnapshot?.currentNodeId ||
        ""
    );
    const latestBattleMatchesCurrentNode = Boolean(
      latestBattle &&
        ["active", "complete"].includes(latestBattleStatus) &&
        (!latestBattleNodeId || latestBattleNodeId === String(savedNodeId || ""))
    );
    const latestBattleVerifiedComplete = Boolean(
      latestBattleMatchesCurrentNode &&
        latestBattleStatus === "complete" &&
        latestBattle?.serverBattleVerified === true
    );
    const savedQuest = runData.activeQuest?.id
      ? DEPTHS_QUESTS.find((quest) => quest.id === runData.activeQuest.id) || runData.activeQuest
      : null;

    clearBattleAdvanceTimeout();
    clearChoiceLockTimeout();
    setDepthsRunIdentity({
      id: resumePayload?.id || runData.id || null,
      runToken: resumePayload?.runToken || null,
      serverWriteVersion: runData.serverWriteVersion || resumePayload?.serverWriteVersion || 1,
    });
    setDarkCoinReward(null);
    setDarkCoinRewardLoading(false);
    setDarkCoinRewardError("");
    setDarkCoinRewardClaiming(false);
    setDepthsXpResult(null);
    setDepthsXpLoading(false);
    setDepthsXpError("");
    setEntryPaymentStatus("Depths run resumed");
    setEntryPaymentError("");
    setEntryPaymentPrompt(null);
    setEntryPaymentSubmitting(false);
    setSelectedChampion(baseChampion);
    setRunChampion(nextChampion);
    setRunArtifacts(artifacts);
    setRunCards(cardsForRun);
    setRunCardUpgrades(cardUpgrades);
    setRunCardRemovals(cardRemovals);
    setRoom(Number(runData.room || 1));
    setDepthsMap(savedMap);
    setCurrentNodeId(savedNodeId);
    setVisitedNodeIds(savedVisited);
    setCurrentMonsters(latestBattleVerifiedComplete ? [] : savedMonsters);
    setResumedBattle(
      status === "active" && latestBattleMatchesCurrentNode && !latestBattleVerifiedComplete
        ? latestBattle
        : null
    );
    setArtifactChoices(savedArtifactChoices);
    setCardChoices(savedCardChoices);
    setCardUpgradeChoices(savedCardUpgradeChoices);
    setSelectedStartArtifact(runData.selectedArtifactPreview || null);
    setSelectedStartCard(runData.selectedCardPreview || null);
    setSelectedUpgradeMoveIndex(
      Number.isInteger(Number(runData.selectedUpgradeMoveIndex))
        ? Number(runData.selectedUpgradeMoveIndex)
        : null
    );
    setArtifactChoiceContext(runData.artifactChoiceContext || (status === "choosingArtifact" ? { type: "chest" } : null));
    setCardRemovalContext(
      status === "removingCard"
        ? runData.cardRemovalContext || {
            result: {
              champion: nextChampion,
              artifacts,
              cards: cardsForRun,
              cardUpgrades,
              cardRemovals,
              currentNodeId: savedNodeId,
              visitedNodeIds: savedVisited,
            },
            pendingEffects: [],
          }
        : null
    );
    setActiveQuest(status === "quest" && savedQuest ? { quest: savedQuest, currentNodeId: savedNodeId, visitedNodeIds: savedVisited } : null);
    setQuestResult(status === "questResolved" ? runData.questResult || null : null);
    setNodeResult(status === "nodeReward" ? runData.nodeResult || null : null);

    setChoosingStartLoadout(status === "choosingLoadout");
    setChoosingArtifact(status === "choosingArtifact");
    setChoosingCard(status === "choosingCard");
    setChoosingCardUpgrade(status === "choosingCardUpgrade");
    setChoosingCardRemoval(status === "removingCard");

    if (status === "roomCleared") {
      const clearedNode = getDepthsMapNode(savedMap, savedNodeId);
      window.setTimeout(() => {
        nextRoom(nextChampion, artifacts, cardUpgrades, cardsForRun, cardRemovals, {
          room: Number(runData.room || 1),
          depthsMap: savedMap,
          currentNodeId: savedNodeId,
          visitedNodeIds: savedVisited,
          rewardType: clearedNode?.type === "elite" ? "upgrade" : "card",
        });
      }, 0);
    } else if (status === "active" && latestBattleVerifiedComplete) {
      const completionResult = buildSavedBattleCompletionResult(latestBattle);
      if (completionResult) {
        completionResult.runState = {
          room: Number(runData.room || 1),
          depthsMap: savedMap,
          currentNodeId: savedNodeId,
          visitedNodeIds: savedVisited,
          champion: nextChampion,
          artifacts,
          cards: cardsForRun,
          cardUpgrades,
          cardRemovals,
        };
        window.setTimeout(() => {
          handleBattleComplete(completionResult);
        }, 0);
      }
    }
  };

  const resumeDepthsRun = async (record, { activeRunHint = null } = {}) => {
    try {
      setEntryPaymentError("");
      setEntryPaymentStatus(activeRunHint ? "Resuming active Depths run" : "Checking active Depths run");
      const walletProof = await createDepthsResumeWalletProof(record);
      const resumed = await postDepthsState({
        action: "resumeRun",
        activeAddress: activeAddress || null,
        championAssetId: record.assetId || null,
        walletProof,
      });
      applyResumedDepthsRun({ record, resumePayload: resumed });
      return resumed;
    } catch (error) {
      setEntryPaymentStatus("");
      setEntryPaymentError(error?.message || "Could not resume this Depths run.");
      console.warn("Depths resume failed:", error);
      return null;
    }
  };

  const loadWalletDepthsReward = async ({ quiet = false } = {}) => {
    if (!activeAddress) {
      setWalletDepthsReward(null);
      setWalletDepthsRewardStatus("");
      if (!quiet) setWalletDepthsRewardError("Connect a wallet to check Depths rewards.");
      return null;
    }

    const appId = Number(getDepthsRewardAppId(props.contracts));
    const assetId = Number(DARK_COIN_ASSET_ID);

    if (!appId) {
      setWalletDepthsReward(null);
      if (!quiet) setWalletDepthsRewardError("Depths reward contract id is not configured.");
      return null;
    }

    setWalletDepthsRewardLoading(true);
    if (!quiet) {
      setWalletDepthsRewardError("");
      setWalletDepthsRewardStatus("");
    }

    try {
      const algod = new algosdk.Algodv2("", ALGOD_BASE, 443);
      const claimBox = await readDepthsClaimBox(algod, appId, activeAddress);

      if (claimBox.assetId !== assetId) {
        throw new Error(
          `Depths reward box is for asset #${claimBox.assetId}, but the UI is configured to claim Dark Coin #${assetId}.`
        );
      }

      const amountAtomic = normalizeAtomicAmountString(claimBox.amountAtomic);
      const reward = {
        status: "granted",
        walletAddress: activeAddress,
        appId,
        assetId,
        decimals: DARK_COIN_DECIMALS,
        amountAtomic,
        amountDisplay: formatDarkCoinAtomicAmount(amountAtomic, DARK_COIN_DECIMALS),
      };

      setWalletDepthsReward(reward);
      if (!quiet) {
        setWalletDepthsRewardStatus(
          BigInt(amountAtomic || "0") > 0n ? "Claimable rewards found." : "No claimable Depths rewards found."
        );
      }
      return reward;
    } catch (error) {
      if (isMissingAlgorandBoxError(error)) {
        setWalletDepthsReward(null);
        if (!quiet) {
          setWalletDepthsRewardStatus("");
          setWalletDepthsRewardError("");
        }
        return null;
      }
      console.warn("Depths wallet reward check failed:", error);
      setWalletDepthsReward(null);
      if (!quiet) setWalletDepthsRewardError(error?.message || "Could not check Depths rewards.");
      return null;
    } finally {
      setWalletDepthsRewardLoading(false);
    }
  };

  const claimDepthsRewardForWallet = async ({ reward = null, recordRunClaim = false } = {}) => {
    if (!activeAddress) {
      throw new Error("Connect the wallet that has Depths rewards before claiming.");
    }
    if (!signTransactions) {
      throw new Error("Connect a wallet that can sign transactions before claiming.");
    }

    const appId = Number(reward?.appId || getDepthsRewardAppId(props.contracts));
    const assetId = Number(reward?.assetId || DARK_COIN_ASSET_ID);
    const rewardWallet = String(reward?.walletAddress || activeAddress || "").trim();

    if (!appId) {
      throw new Error("Depths reward contract id is not configured.");
    }
    if (rewardWallet && rewardWallet !== activeAddress) {
      throw new Error("Connect the wallet that has this Depths reward before claiming.");
    }

    const algod = new algosdk.Algodv2("", ALGOD_BASE, 443);
    let claimBox = null;
    try {
      claimBox = await readDepthsClaimBox(algod, appId, activeAddress);
    } catch (boxError) {
      if (isMissingAlgorandBoxError(boxError)) {
        throw new Error("No on-chain Depths reward is available for this wallet yet.");
      }
      throw boxError;
    }

    if (claimBox.assetId !== assetId) {
      throw new Error(
        `Depths reward box is for asset #${claimBox.assetId}, but the UI is configured to claim Dark Coin #${assetId}.`
      );
    }
    if (BigInt(claimBox.amountAtomic || "0") <= 0n) {
      throw new Error("Depths reward box has no claimable Dark Coin.");
    }

    const suggestedParams = await algod.getTransactionParams().do();
    const claimBoxReference = { appIndex: 0, name: algosdk.decodeAddress(activeAddress).publicKey };
    const txn = algosdk.makeApplicationNoOpTxnFromObject({
      sender: activeAddress,
      appIndex: appId,
      suggestedParams,
      appArgs: [textBytes("claimReward")],
      foreignAssets: [assetId],
      boxes: [claimBoxReference],
      convertToAccess: false,
    });

    const encodedTxn = algosdk.encodeUnsignedTransaction(txn);
    const signedTransactions = await signTransactions([encodedTxn]);
    const sendResult = await algod.sendRawTransaction(signedTransactions).do();
    const txId = sendResult?.txid || sendResult?.txId || txn.txID();
    await algosdk.waitForConfirmation(algod, txId, 4);

    if (recordRunClaim && (runDocRef.current || runId) && (runTokenRef.current || runToken)) {
      await fetch("/api/arena/claimDepthsReward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recordDarkCoinClaim",
          runId: runDocRef.current || runId,
          runToken: runTokenRef.current || runToken,
          txId,
        }),
      }).catch(() => null);
    }

    return {
      txId,
      appId,
      assetId,
      amountAtomic: normalizeAtomicAmountString(claimBox.amountAtomic),
      amountDisplay: formatDarkCoinAtomicAmount(claimBox.amountAtomic, DARK_COIN_DECIMALS),
    };
  };

  const claimWalletDepthsRewards = async () => {
    setWalletDepthsRewardClaiming(true);
    setWalletDepthsRewardError("");
    setWalletDepthsRewardStatus("");

    try {
      const result = await claimDepthsRewardForWallet({ reward: walletDepthsReward, recordRunClaim: false });
      setWalletDepthsReward(null);
      setWalletDepthsRewardStatus(`Claimed ${result.amountDisplay} Dark Coin. Transaction: ${result.txId}`);
      setDarkCoinReward((current) => {
        if (!current || String(current.walletAddress || "").trim() !== activeAddress) return current;
        return {
          ...current,
          status: "claimed",
          claimTxId: result.txId,
        };
      });
    } catch (error) {
      console.warn("Depths wallet Dark Coin claim failed:", error);
      setWalletDepthsRewardError(error?.message || "Dark Coin claim failed.");
    } finally {
      setWalletDepthsRewardClaiming(false);
    }
  };

  const claimDarkCoinReward = async () => {
    if (!darkCoinReward || !activeAddress) return;
    if (!isDarkCoinRewardGranted(darkCoinReward)) {
      setDarkCoinRewardError("Dark Coin cannot be claimed until the reward has been granted on-chain.");
      return;
    }

    setDarkCoinRewardClaiming(true);
    setDarkCoinRewardError("");

    try {
      const result = await claimDepthsRewardForWallet({ reward: darkCoinReward, recordRunClaim: true });
      setWalletDepthsReward(null);
      setWalletDepthsRewardStatus(`Claimed ${result.amountDisplay} Dark Coin. Transaction: ${result.txId}`);
      setDarkCoinReward((current) => ({
        ...(current || darkCoinReward),
        status: "claimed",
        claimTxId: result.txId,
      }));
    } catch (error) {
      console.warn("Depths Dark Coin claim failed:", error);
      setDarkCoinRewardError(error?.message || "Dark Coin claim failed.");
    } finally {
      setDarkCoinRewardClaiming(false);
    }
  };

  const buildDepthsCreatePayload = (record, firstCardChoices, firstArtifactChoices, paymentTxId = "") => {
    const traitProfile = buildDepthsTraitAwakeningProfile(record);
    return {
      action: "createRun",
      paymentTxId,
      data: {
        activeAddress: activeAddress || null,
        championAssetId: record.assetId || null,
        championName: record.name || record.charObj?.name || null,
        room: 1,
        status: "choosingLoadout",
        artifacts: [],
        cards: [],
        cardUpgrades: [],
        cardRemovals: [],
        cardChoices: cleanForFirestore((firstCardChoices || []).map(compactDepthsCardForRun)),
        artifactChoices: cleanForFirestore((firstArtifactChoices || []).map(compactDepthsArtifactForRun)),
        artifactChoiceContext: { type: "start" },
        traitAwakenings: cleanForFirestore({
          tags: traitProfile.tags || [],
          tagScores: traitProfile.tagScores || {},
          traits: (traitProfile.traits || []).map((trait) => ({
            type: trait.type || "",
            name: trait.name || "",
          })),
        }),
        championSnapshot: compactDepthsChampionSnapshotForRun(record.charObj || null),
      },
    };
  };

  const applyCreatedDepthsRun = (created) => {
    setDepthsRunIdentity({
      id: created.id,
      runToken: created.runToken,
      serverWriteVersion: created.serverWriteVersion || 1,
    });
    setEntryPaymentStatus(
      created.entryRunNumber
        ? `Depths entry confirmed for run ${created.entryRunNumber}`
        : "Depths entry confirmed"
    );
    setEntryPaymentPrompt(null);
    setEntryPaymentSubmitting(false);
    setChoosingStartLoadout(true);
    return created;
  };

  const createDepthsRun = async (record, firstCardChoices, firstArtifactChoices) => {
    const getEntryInfo = async () => {
      return postDepthsState({
        action: "getEntryInfo",
        activeAddress: activeAddress || null,
        championAssetId: record.assetId || null,
      });
    };

    try {
      setEntryPaymentError("");
      setEntryPaymentStatus("Checking Depths entry");
      const entryInfo = await getEntryInfo();

      if (entryInfo?.activeRun) {
        return resumeDepthsRun(record, { activeRunHint: entryInfo.activeRun });
      }

      const payment = entryInfo?.payment;
      if (!payment) throw new Error("Depths entry payment details were not returned.");

      setEntryPaymentPrompt({
        record,
        payment,
        cardOptions: firstCardChoices,
        artifactOptions: firstArtifactChoices,
        nextRunNumber: entryInfo?.nextRunNumber || payment.runNumber || 1,
      });
      setEntryPaymentStatus("");
      return { prompted: true };
    } catch (error) {
      if (error?.body?.activeRunExists || error?.body?.activeRun) {
        return resumeDepthsRun(record, { activeRunHint: error.body.activeRun });
      }

      if (error?.body?.requiresPayment && error?.body?.payment) {
        setEntryPaymentPrompt({
          record,
          payment: error.body.payment,
          cardOptions: firstCardChoices,
          artifactOptions: firstArtifactChoices,
          nextRunNumber: error.body.payment.runNumber || 1,
        });
        setEntryPaymentStatus("");
        return { prompted: true };
      }

      setDepthsRunIdentity();
      setEntryPaymentStatus("");
      setEntryPaymentError(error?.message || "Depths run create failed.");
      console.warn("Depths run create failed:", error);
      return null;
    }
  };

  const confirmDepthsEntryPayment = async () => {
    if (!entryPaymentPrompt || entryPaymentSubmitting) return null;
    const { record, payment, cardOptions, artifactOptions } = entryPaymentPrompt;

    try {
      setEntryPaymentSubmitting(true);
      setEntryPaymentError("");
      setEntryPaymentStatus("Checking current Depths entry cost");
      const latestEntryInfo = await postDepthsState({
        action: "getEntryInfo",
        activeAddress: activeAddress || null,
        championAssetId: record.assetId || null,
      });
      if (latestEntryInfo?.activeRun) {
        setEntryPaymentPrompt(null);
        setEntryPaymentSubmitting(false);
        return resumeDepthsRun(record, { activeRunHint: latestEntryInfo.activeRun });
      }
      const latestPayment = latestEntryInfo?.payment || payment;
      const latestAmount = normalizeAtomicAmountString(latestPayment?.amountAtomic);
      const promptedAmount = normalizeAtomicAmountString(payment?.amountAtomic);
      if (latestAmount && promptedAmount && latestAmount !== promptedAmount) {
        setEntryPaymentPrompt((current) => ({
          ...(current || entryPaymentPrompt),
          payment: latestPayment,
          nextRunNumber: latestEntryInfo?.nextRunNumber || latestPayment.runNumber || current?.nextRunNumber || 1,
        }));
        setEntryPaymentStatus("");
        setEntryPaymentError("The entry cost changed. Review the updated amount before signing.");
        setEntryPaymentSubmitting(false);
        return null;
      }
      const txId = await submitDepthsEntryPayment(latestPayment);
      setEntryPaymentStatus("Authorizing Depths entry");
      const created = await postDepthsState(
        buildDepthsCreatePayload(record, cardOptions || [], artifactOptions || [], txId)
      );
      return applyCreatedDepthsRun(created);
    } catch (error) {
      if (error?.body?.activeRunExists || error?.body?.activeRun) {
        setEntryPaymentPrompt(null);
        setEntryPaymentSubmitting(false);
        return resumeDepthsRun(record, { activeRunHint: error.body.activeRun });
      }

      if (error?.body?.requiresPayment && error?.body?.payment) {
        setEntryPaymentPrompt((current) => ({
          ...(current || entryPaymentPrompt),
          payment: error.body.payment,
          nextRunNumber: error.body.payment.runNumber || current?.nextRunNumber || 1,
        }));
      }

      setEntryPaymentStatus("");
      setEntryPaymentError(error?.message || "Depths entry payment failed.");
      setEntryPaymentSubmitting(false);
      console.warn("Depths entry payment failed:", error);
      return null;
    }
  };

  useEffect(() => {
    return () => {
      clearBattleAdvanceTimeout();
      if (choiceLockTimeoutRef.current) {
        window.clearTimeout(choiceLockTimeoutRef.current);
        choiceLockTimeoutRef.current = null;
      }
      choiceLockRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadDepthsRewardOdds();
  }, [reloadNonce]);

  useEffect(() => {
    if (!activeAddress) {
      setWalletDepthsReward(null);
      setWalletDepthsRewardLoading(false);
      setWalletDepthsRewardClaiming(false);
      setWalletDepthsRewardStatus("");
      setWalletDepthsRewardError("");
      return;
    }

    loadWalletDepthsReward({ quiet: true });
  }, [activeAddress, reloadNonce]);

  useEffect(() => {
    if (!activeAddress || propWalletRows.length) {
      setWalletRows([]);
      setWalletError("");
      setWalletLoading(false);
      return undefined;
    }

    let cancelled = false;

    async function loadWallet() {
      try {
        setWalletLoading(true);
        setWalletError("");
        const response = await fetch("/api/getDcAssets", {
          method: "POST",
          body: JSON.stringify({ address: activeAddress }),
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error(`getDcAssets failed with status ${response.status}`);
        const session = await response.json();
        if (!cancelled) setWalletRows(normalizeArray(session));
      } catch (error) {
        console.error("Failed to load depths wallet assets", error);
        if (!cancelled) {
          setWalletRows([]);
          setWalletError(error?.message || "Could not load wallet assets.");
        }
      } finally {
        if (!cancelled) setWalletLoading(false);
      }
    }

    loadWallet();

    return () => {
      cancelled = true;
    };
  }, [activeAddress, propWalletRows.length, reloadNonce]);

  useEffect(() => {
    if (!championAssetIds.length) {
      setChampionRecords([]);
      setChampionLoading(false);
      setChampionError("");
      return undefined;
    }

    let cancelled = false;

    async function loadChampionObjects() {
      try {
        setChampionLoading(true);
        setChampionError("");

        const records = await Promise.all(
          championAssetIds.map(async (assetId) => {
            try {
              const response = await fetch("/api/getNft", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nftId: assetId }),
              });

              if (!response.ok) throw new Error(`getNft failed with status ${response.status}`);
              const session = await response.json();
              const charObj = getCharObjectFromGetNftSession(session);
              let runtime = { charObj };

              if (charObj) {
                try {
                  runtime = await loadDepthsChampionRuntime({
                    assetId,
                    baseCharObj: charObj,
                    contracts: props.contracts,
                  });
                } catch (runtimeError) {
                  console.error("Failed to enrich depths champion runtime", assetId, runtimeError);
                }
              }

              return {
                loading: false,
                exists: Boolean(charObj),
                assetId,
                session,
                charObj: runtime.charObj,
                equippedTraits: runtime.equippedTraits || [],
                gainedEffects: runtime.gainedEffects || null,
                backgroundImageUrl:
                  runtime.backgroundImageUrl || runtime.charObj?.backgroundImageUrl || "",
                points: runtime.points || [],
                xp: runtime.xp || runtime.charObj?.xp || 0,
                name: runtime.charObj?.name || charObj?.name || null,
                imageUrl: getNftImageUrl(session),
              };
            } catch (error) {
              console.error("Failed to load depths champion object", assetId, error);
              return {
                loading: false,
                exists: false,
                assetId,
                error: error?.message || String(error),
              };
            }
          })
        );

        if (!cancelled) setChampionRecords(records);
      } catch (error) {
        console.error("Failed to load depths champion objects", error);
        if (!cancelled) {
          setChampionRecords([]);
          setChampionError(error?.message || "Could not load champion objects.");
        }
      } finally {
        if (!cancelled) setChampionLoading(false);
      }
    }

    loadChampionObjects();

    return () => {
      cancelled = true;
    };
  }, [championAssetIds.join("|"), reloadNonce, props.contracts?.dragonshorde]);

  useEffect(() => {
    if (!activeAddress || !playableChampions.length) {
      setChampionEntryInfoByAssetId({});
      setChampionEntryInfoLoading(false);
      return undefined;
    }

    let cancelled = false;

    async function loadChampionEntryInfo() {
      try {
        setChampionEntryInfoLoading(true);
        const result = await postDepthsState({
          action: "getEntryInfoBatch",
          activeAddress,
          championAssetIds: playableChampions.map((record) => record.assetId).filter(Boolean),
        });

        if (!cancelled) {
          setChampionEntryInfoByAssetId(result?.entries || {});
        }
      } catch (error) {
        console.warn("Failed to load Depths entry info batch", error);
        if (!cancelled) {
          const entries = playableChampions
            .map((record) => {
              const assetId = String(record.assetId || "");
              return assetId
                ? [assetId, { error: error?.message || "Could not load Depths run status." }]
                : null;
            })
            .filter(Boolean);
          setChampionEntryInfoByAssetId(Object.fromEntries(entries));
        }
      } finally {
        if (!cancelled) setChampionEntryInfoLoading(false);
      }
    }

    loadChampionEntryInfo();

    return () => {
      cancelled = true;
    };
  }, [activeAddress, playableChampionEntryKey, reloadNonce]);

  useEffect(() => {
    let receivedSnapshot = false;
    let cancelled = false;
    const monstersRef = collection(db, "monsters");
    const applyMonsterSnapshot = (snapshot) => {
      const rows = snapshot.docs.map((docSnap) => normalizeMonsterDoc(docSnap.data(), docSnap.id));
      setMonsters(rows);
      setMonsterError("");
      setMonsterLoading(false);
    };
    const loadMonstersOnce = async () => {
      if (receivedSnapshot) return;
      try {
        const snapshot = await getDocs(monstersRef);
        if (cancelled || receivedSnapshot) return;
        receivedSnapshot = true;
        applyMonsterSnapshot(snapshot);
      } catch (fallbackError) {
        if (cancelled || receivedSnapshot) return;
        receivedSnapshot = true;
        console.error("Failed to load depths monsters with fallback read", fallbackError);
        setMonsters([]);
        setMonsterError(
          fallbackError?.message
            ? `Could not load monsters from Firebase: ${fallbackError.message}`
            : "Could not load monsters from Firebase."
        );
        setMonsterLoading(false);
      }
    };
    const timeoutId = window.setTimeout(() => {
      loadMonstersOnce();
    }, 12000);

    let unsubscribe = () => {};

    try {
      unsubscribe = onSnapshot(
        monstersRef,
        (snapshot) => {
          if (cancelled) return;
          receivedSnapshot = true;
          window.clearTimeout(timeoutId);
          applyMonsterSnapshot(snapshot);
        },
        (loadError) => {
          if (cancelled) return;
          window.clearTimeout(timeoutId);
          console.error("Failed to load depths monsters", loadError);
          loadMonstersOnce();
        }
      );
    } catch (loadError) {
      if (cancelled) return undefined;
      window.clearTimeout(timeoutId);
      console.error("Failed to start depths monster listener", loadError);
      loadMonstersOnce();
    }

    return () => {
      cancelled = true;
      receivedSnapshot = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let receivedSnapshot = false;
    let cancelled = false;
    const cardsQuery = query(collection(db, "cards"), where("status", "==", "completed"));

    const applyCardSnapshot = (snapshot) => {
      const rows = snapshot.docs.map((docSnap) => normalizeDepthsCardDoc(docSnap.data(), docSnap.id));
      setCards(rows);
      setCardError("");
      setCardLoading(false);
    };

    const loadCardsOnce = async () => {
      if (receivedSnapshot) return;
      try {
        const snapshot = await getDocs(cardsQuery);
        if (cancelled || receivedSnapshot) return;
        receivedSnapshot = true;
        applyCardSnapshot(snapshot);
      } catch (fallbackError) {
        if (cancelled || receivedSnapshot) return;
        receivedSnapshot = true;
        console.error("Failed to load depths cards with fallback read", fallbackError);
        setCards([]);
        setCardError(
          fallbackError?.message
            ? `Could not load cards from Firebase: ${fallbackError.message}`
            : "Could not load cards from Firebase."
        );
        setCardLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      loadCardsOnce();
    }, 12000);

    let unsubscribe = () => {};

    try {
      unsubscribe = onSnapshot(
        cardsQuery,
        (snapshot) => {
          if (cancelled) return;
          receivedSnapshot = true;
          window.clearTimeout(timeoutId);
          applyCardSnapshot(snapshot);
        },
        (loadError) => {
          if (cancelled) return;
          window.clearTimeout(timeoutId);
          console.error("Failed to load depths cards", loadError);
          loadCardsOnce();
        }
      );
    } catch (loadError) {
      if (cancelled) return undefined;
      window.clearTimeout(timeoutId);
      console.error("Failed to start depths card listener", loadError);
      loadCardsOnce();
    }

    return () => {
      cancelled = true;
      receivedSnapshot = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const startDepths = async (record) => {
    clearBattleAdvanceTimeout();
    clearChoiceLockTimeout();
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      });
    }
    const cardOptions = pickDepthsCardChoices(playableCards, [], 3, { rarity: "common", champion: record });
    const artifactOptions = pickDepthsArtifactChoices([], 3, record, { rarity: "common", champion: record });
    setDepthsRunIdentity();
    setResumedBattle(null);
    setDarkCoinReward(null);
    setDarkCoinRewardLoading(false);
    setDarkCoinRewardError("");
    setDarkCoinRewardClaiming(false);
    setDepthsXpResult(null);
    setDepthsXpLoading(false);
    setDepthsXpError("");
    setEntryPaymentStatus("");
    setEntryPaymentError("");
    setEntryPaymentPrompt(null);
    setEntryPaymentSubmitting(false);
    setSelectedChampion(record);
    setRunChampion(record);
    setRunArtifacts([]);
    setRunCards([]);
    setRunCardUpgrades([]);
    setRunCardRemovals([]);
    setArtifactChoices(artifactOptions);
    setCardChoices(cardOptions);
    setCardUpgradeChoices([]);
    setSelectedStartArtifact(null);
    setSelectedStartCard(null);
    setCurrentMonsters([]);
    setRoom(1);
    setDepthsMap(null);
    setCurrentNodeId("start");
    setVisitedNodeIds(["start"]);
    setNodeResult(null);
    setChoosingStartLoadout(false);
    setChoosingArtifact(false);
    setChoosingCard(false);
    setChoosingCardUpgrade(false);
    setChoosingCardRemoval(false);
    setSelectedUpgradeMoveIndex(null);
    setArtifactChoiceContext({ type: "start" });
    setActiveQuest(null);
    setQuestResult(null);
    setCardRemovalContext(null);
    const created = await createDepthsRun(record, cardOptions, artifactOptions);
    if (!created) {
      setSelectedChampion(null);
      setRunChampion(null);
      setResumedBattle(null);
      setRunArtifacts([]);
      setRunCards([]);
      setRunCardUpgrades([]);
      setRunCardRemovals([]);
      setArtifactChoices([]);
      setCardChoices([]);
      setEntryPaymentPrompt(null);
      setEntryPaymentSubmitting(false);
      setChoosingStartLoadout(false);
      setChoosingArtifact(false);
      setChoosingCard(false);
      setChoosingCardUpgrade(false);
      setChoosingCardRemoval(false);
      setArtifactChoiceContext(null);
      setCurrentMonsters([]);
      setDepthsMap(null);
      setCurrentNodeId("start");
      setVisitedNodeIds(["start"]);
    }
  };

  const selectStartArtifact = (artifact) => {
    if (selectedStartArtifact || choiceLockRef.current) return;
    setSelectedStartArtifact(artifact);
    updateDepthsRun({
      status: "choosingLoadout",
      selectedArtifactPreview: artifact ? cleanForFirestore(artifact) : null,
      selectedCardPreview: selectedStartCard ? cleanForFirestore(selectedStartCard) : null,
      artifactChoiceContext: { type: "start" },
    });
    finishStartLoadoutAfterChoice(
      artifact,
      selectedStartCard,
      `start-artifact-${getArtifactChoiceKey(artifact)}`
    );
  };

  const selectStartCard = (card) => {
    if (selectedStartCard || choiceLockRef.current) return;
    setSelectedStartCard(card);
    updateDepthsRun({
      status: "choosingLoadout",
      selectedArtifactPreview: selectedStartArtifact ? cleanForFirestore(selectedStartArtifact) : null,
      selectedCardPreview: card ? cleanForFirestore(card) : null,
      artifactChoiceContext: { type: "start" },
    });
    finishStartLoadoutAfterChoice(
      selectedStartArtifact,
      card,
      `start-card-${getCardChoiceKey(card)}`
    );
  };

  const confirmStartLoadout = async (
    artifactChoice = selectedStartArtifact,
    cardChoice = selectedStartCard
  ) => {
    if (!selectedChampion || !artifactChoice || !cardChoice) return false;

    const selectedArtifact = summarizeDepthsArtifact(artifactChoice, room);
    const selectedCard = summarizeDepthsCard(cardChoice, room);
    const nextArtifacts = [selectedArtifact];
    const nextCards = [selectedCard];
    const nextChampion = applyDepthsRunBonusesPreservingHp(
      selectedChampion,
      nextArtifacts,
      runCardUpgrades,
      nextCards,
      runCardRemovals,
      null,
      { preservePreviousHp: false }
    );
    const nextMap = depthsMap || generateDepthsMap();
    const nextNodeId = currentNodeId || "start";
    const nextVisited = Array.isArray(visitedNodeIds) && visitedNodeIds.length
      ? visitedNodeIds
      : ["start"];

    clearBattleAdvanceTimeout();

    const saved = await updateDepthsRun({
      room,
      status: "map",
      artifacts: nextArtifacts,
      cards: nextCards,
      cardUpgrades: runCardUpgrades,
      cardRemovals: runCardRemovals,
      depthsMap: nextMap,
      currentNodeId: nextNodeId,
      visitedNodeIds: nextVisited,
      championSnapshot: nextChampion.charObj || null,
      selectedArtifactPreview: null,
      selectedCardPreview: null,
    });

    if (!saved) {
      setEntryPaymentError("Could not save your Depths loadout. Please try again.");
      return false;
    }

    setEntryPaymentError("");
    setRunArtifacts(nextArtifacts);
    setRunCards(nextCards);
    setRunChampion(nextChampion);
    setDepthsMap(nextMap);
    setCurrentNodeId(nextNodeId);
    setVisitedNodeIds(nextVisited);
    setArtifactChoices([]);
    setCardChoices([]);
    setSelectedStartArtifact(null);
    setSelectedStartCard(null);
    setChoosingStartLoadout(false);
    setChoosingArtifact(false);
    setChoosingCard(false);
    setChoosingCardUpgrade(false);
    setChoosingCardRemoval(false);
    setArtifactChoiceContext(null);
    setActiveQuest(null);
    setQuestResult(null);
    setCardRemovalContext(null);
    setCurrentMonsters([]);
    setNodeResult(null);

    return true;
  };

  const chooseDepthsCard = (card) => {
    if (!selectedChampion) return;

    runLockedDepthsChoice(getCardChoiceKey(card), () => {
      const selectedCard = summarizeDepthsCard(card, room);
      const nextCards = [...runCards, selectedCard];
      const nextChampion = applyDepthsRunBonusesPreservingHp(
        selectedChampion,
        runArtifacts,
        runCardUpgrades,
        nextCards,
        runCardRemovals,
        runChampion || selectedChampion
      );
      const nextMap = depthsMap || generateDepthsMap();

      clearBattleAdvanceTimeout();
      setRunCards(nextCards);
      setRunChampion(nextChampion);
      setDepthsMap(nextMap);
      setCurrentMonsters([]);
      setNodeResult(null);
      setCardChoices([]);
      setChoosingStartLoadout(false);
      setChoosingCard(false);
      setChoosingCardRemoval(false);
      setActiveQuest(null);
      setQuestResult(null);
      setCardRemovalContext(null);
      updateDepthsRun({
        room,
        status: "map",
        artifacts: runArtifacts,
        cards: nextCards,
        cardUpgrades: runCardUpgrades,
        cardRemovals: runCardRemovals,
        depthsMap: nextMap,
        currentNodeId,
        visitedNodeIds,
        championSnapshot: nextChampion.charObj || null,
      });
    });
  };

  const skipDepthsCard = () => {
    if (choiceLockRef.current) return;
    const nextMap = depthsMap || generateDepthsMap();

    clearBattleAdvanceTimeout();
    setDepthsMap(nextMap);
    setCurrentMonsters([]);
    setNodeResult(null);
    setCardChoices([]);
    setChoosingStartLoadout(false);
    setChoosingCard(false);
    setChoosingCardUpgrade(false);
    setChoosingArtifact(false);
    setChoosingCardRemoval(false);
    setActiveQuest(null);
    setQuestResult(null);
    setCardRemovalContext(null);
    updateDepthsRun({
      room,
      status: "map",
      artifacts: runArtifacts,
      cards: runCards,
      cardUpgrades: runCardUpgrades,
      cardRemovals: runCardRemovals,
      depthsMap: nextMap,
      currentNodeId,
      visitedNodeIds,
      championSnapshot: (runChampion || selectedChampion)?.charObj || null,
    });
  };

  const beginCardUpgradeChoice = () => {
    const activeChampion = runChampion || selectedChampion;
    const moves = getDepthsChampionCardMoves(activeChampion);
    if (!activeChampion || !moves.length) return;

    clearBattleAdvanceTimeout();
    setChoosingCard(false);
    setChoosingStartLoadout(false);
    setChoosingCardUpgrade(true);
    setSelectedUpgradeMoveIndex(null);
    setCardUpgradeChoices([]);
    updateDepthsRun({
      room,
      status: "choosingCardUpgrade",
      artifacts: runArtifacts,
      cards: runCards,
      cardUpgrades: runCardUpgrades,
      cardRemovals: runCardRemovals,
      championSnapshot: activeChampion.charObj || null,
    });
  };

  const returnToCardChoices = () => {
    setChoosingCardUpgrade(false);
    setSelectedUpgradeMoveIndex(null);
    setCardUpgradeChoices([]);
    setChoosingStartLoadout(false);
    setChoosingCard(true);
    updateDepthsRun({
      room,
      status: "choosingCard",
      artifacts: runArtifacts,
      cards: runCards,
      cardUpgrades: runCardUpgrades,
      cardRemovals: runCardRemovals,
      cardChoices,
      championSnapshot: (runChampion || selectedChampion)?.charObj || null,
    });
  };

  const selectCardUpgradeMove = (moveIndex) => {
    if (selectedUpgradeMoveIndex !== null && selectedUpgradeMoveIndex !== undefined) return;
    const activeChampion = runChampion || selectedChampion;
    const move = getDepthsChampionCardMoves(activeChampion).find(
      (entry) => entry.moveIndex === moveIndex
    )?.move;
    if (!move) return;

    const moveWithIndex = { ...move, __moveIndex: moveIndex };
    const choices = pickDepthsCardUpgradeChoices(moveWithIndex, runCardUpgrades, 2, activeChampion);
    setSelectedUpgradeMoveIndex(moveIndex);
    setCardUpgradeChoices(choices);
    updateDepthsRun({
      room,
      status: "choosingCardUpgrade",
      selectedUpgradeMoveIndex: moveIndex,
      cardUpgradeChoices: choices,
      artifacts: runArtifacts,
      cards: runCards,
      cardUpgrades: runCardUpgrades,
      cardRemovals: runCardRemovals,
      depthsMap,
      currentNodeId,
      visitedNodeIds,
      championSnapshot: activeChampion.charObj || null,
    });
  };

  const chooseDepthsCardUpgrade = (upgrade) => {
    const activeChampion = runChampion || selectedChampion;
    const move = getDepthsChampionCardMoves(activeChampion).find(
      (entry) => entry.moveIndex === selectedUpgradeMoveIndex
    )?.move;
    if (!selectedChampion || !move) return;

    runLockedDepthsChoice(String(upgrade.id || upgrade.name || ""), () => {
      const selectedUpgrade = summarizeDepthsCardUpgrade(
        upgrade,
        move,
        selectedUpgradeMoveIndex,
        room
      );
      const nextCardUpgrades = [...runCardUpgrades, selectedUpgrade];
      const nextChampion = applyDepthsRunBonusesPreservingHp(
        selectedChampion,
        runArtifacts,
        nextCardUpgrades,
        runCards,
        runCardRemovals,
        activeChampion
      );
      const nextMap = depthsMap || generateDepthsMap();

      clearBattleAdvanceTimeout();
      setRunCardUpgrades(nextCardUpgrades);
      setRunChampion(nextChampion);
      setDepthsMap(nextMap);
      setCurrentMonsters([]);
      setNodeResult(null);
      setCardUpgradeChoices([]);
      setSelectedUpgradeMoveIndex(null);
      setChoosingCardUpgrade(false);
      setChoosingStartLoadout(false);
      setChoosingCard(false);
      setChoosingCardRemoval(false);
      setActiveQuest(null);
      setQuestResult(null);
      setCardRemovalContext(null);
      updateDepthsRun({
        room,
        status: "map",
        artifacts: runArtifacts,
        cards: runCards,
        cardUpgrades: nextCardUpgrades,
        cardRemovals: runCardRemovals,
        depthsMap: nextMap,
        currentNodeId,
        visitedNodeIds,
        championSnapshot: nextChampion.charObj || null,
      });
    });
  };

  const chooseDepthsArtifact = (artifact) => {
    if (!selectedChampion) return;

    runLockedDepthsChoice(getArtifactChoiceKey(artifact), () => {
      const selectedArtifact = summarizeDepthsArtifact(artifact, room);
      const nextArtifacts = [...runArtifacts, selectedArtifact];
      const nextChampion = applyDepthsRunBonusesPreservingHp(
        selectedChampion,
        nextArtifacts,
        runCardUpgrades,
        runCards,
        runCardRemovals,
        runChampion || selectedChampion
      );
      const context = artifactChoiceContext || { type: "start" };

      clearBattleAdvanceTimeout();
      setRunArtifacts(nextArtifacts);
      setRunChampion(nextChampion);
      setArtifactChoices([]);
      setChoosingStartLoadout(false);
      setChoosingArtifact(false);
      setChoosingCardRemoval(false);
      setArtifactChoiceContext(null);
      setActiveQuest(null);
      setQuestResult(null);
      setCardRemovalContext(null);

      if (context.type === "chest" || context.type === "quest") {
        nextRoom(nextChampion, nextArtifacts, runCardUpgrades, runCards, runCardRemovals, {
          currentNodeId: context.currentNodeId,
          visitedNodeIds: context.visitedNodeIds,
          rewardType: "map",
          advanceRoom: false,
        });
        return;
      }

      setChoosingCard(true);
      updateDepthsRun({
        room,
        status: "choosingCard",
        artifacts: nextArtifacts,
        cards: runCards,
        cardUpgrades: runCardUpgrades,
        cardRemovals: runCardRemovals,
        cardChoices,
        championSnapshot: nextChampion.charObj || null,
      });
    });
  };

  const applyDepthsQuestEffects = (effects = [], quest = {}, sourceOutcome = {}) => {
    let nextChampion = runChampion || selectedChampion;
    let nextArtifacts = [...runArtifacts];
    let nextCards = [...runCards];
    let nextCardUpgrades = [...runCardUpgrades];
    let nextCardRemovals = [...runCardRemovals];
    const pendingEffects = [];
    const details = [];
    const rewardArtifacts = [];

    const rebuildChampion = () => {
      nextChampion = applyDepthsRunBonusesPreservingHp(
        selectedChampion,
        nextArtifacts,
        nextCardUpgrades,
        nextCards,
        nextCardRemovals,
        nextChampion
      );
    };

    const applyImmediateEffect = (effect) => {
      if (!effect) return;

      if (["cardChoice", "artifactChoice", "cardUpgrade", "removeCard"].includes(effect.type)) {
        if (effect.type === "removeCard" && !getDepthsRemovableDeckCards(nextChampion).length) {
          if (Array.isArray(effect.fallback) && effect.fallback.length) {
            effect.fallback.forEach((fallbackEffect) => applyImmediateEffect(fallbackEffect));
          } else {
            details.push("No deck cards were available to remove.");
          }
          return;
        }
        pendingEffects.push(effect);
        return;
      }

      if (effect.type === "healPct") {
        const healed = healDepthsChampion(nextChampion, finiteNumber(effect.amount, 0.2));
        nextChampion = healed.record;
        details.push(summarizeDepthsQuestImmediateChange(effect, healed));
        return;
      }

      if (effect.type === "damagePct") {
        const maxHp = getDepthsChampionMaxHpFromCharObj(nextChampion?.charObj || {});
        const currentHp = getDepthsChampionCurrentHp(nextChampion);
        const damage = Math.max(1, Math.round(maxHp * finiteNumber(effect.amount, 0.1)));
        nextChampion = setDepthsChampionCurrentHp(nextChampion, Math.max(1, currentHp - damage));
        details.push(summarizeDepthsQuestImmediateChange(effect, { damage }));
        return;
      }

      if (effect.type === "questRelic") {
        const relic = summarizeDepthsQuestRelic(effect, room, quest);
        nextArtifacts = [...nextArtifacts, relic];
        rewardArtifacts.push(relic);
        rebuildChampion();
        details.push(summarizeDepthsQuestImmediateChange(effect, { name: relic.name }));
        return;
      }

      if (effect.type === "cursedRelic") {
        const relic = pickDepthsCursedArtifact(room);
        nextArtifacts = [...nextArtifacts, relic];
        rewardArtifacts.push(relic);
        rebuildChampion();
        details.push(summarizeDepthsQuestImmediateChange(effect, { name: relic.name }));
        return;
      }

      if (effect.type === "randomArtifact") {
        const buildSourceChampion = selectedChampion || nextChampion;
        const [artifact] = pickDepthsArtifactChoices(nextArtifacts, 1, buildSourceChampion, {
          champion: buildSourceChampion,
        });
        if (artifact) {
          const selectedArtifact = summarizeDepthsArtifact(artifact, room);
          nextArtifacts = [...nextArtifacts, selectedArtifact];
          rewardArtifacts.push(selectedArtifact);
          rebuildChampion();
          details.push(summarizeDepthsQuestImmediateChange(effect, { name: selectedArtifact.name }));
        } else {
          details.push(summarizeDepthsQuestImmediateChange(effect));
        }
        return;
      }

      if (effect.type === "randomCard") {
        const buildSourceChampion = selectedChampion || nextChampion;
        const [card] = pickDepthsCardChoices(playableCards, nextCards, 1, {
          champion: buildSourceChampion,
        });
        if (card) {
          const selectedCard = summarizeDepthsCard(card, room);
          nextCards = [...nextCards, selectedCard];
          rebuildChampion();
          details.push(summarizeDepthsQuestImmediateChange(effect, { name: selectedCard.name }));
        } else {
          details.push(summarizeDepthsQuestImmediateChange(effect));
        }
      }
    };

    (effects || []).forEach((effect) => applyImmediateEffect(effect));

    return {
      champion: nextChampion,
      artifacts: nextArtifacts,
      cards: nextCards,
      cardUpgrades: nextCardUpgrades,
      cardRemovals: nextCardRemovals,
      pendingEffects,
      details,
      rewardArtifacts,
      outcome: sourceOutcome,
    };
  };

  const completeQuestToMap = (result) => {
    if (!result) return;

    setRunChampion(result.champion || runChampion || selectedChampion);
    setRunArtifacts(result.artifacts || runArtifacts);
    setRunCards(result.cards || runCards);
    setRunCardUpgrades(result.cardUpgrades || runCardUpgrades);
    setRunCardRemovals(result.cardRemovals || runCardRemovals);
    setActiveQuest(null);
    setQuestResult(null);
    setChoosingCardRemoval(false);
    setCardRemovalContext(null);
    setLockedDepthsChoiceKey("");
    nextRoom(result.champion, result.artifacts, result.cardUpgrades, result.cards, result.cardRemovals, {
      currentNodeId: result.currentNodeId,
      visitedNodeIds: result.visitedNodeIds,
      advanceRoom: false,
    });
  };

  const beginQuestDeferredEffect = (effect, result, remainingEffects = []) => {
    if (!effect || !result) {
      completeQuestToMap(result);
      return;
    }

    const activeChampion = result.champion || runChampion || selectedChampion;
    const activeArtifacts = result.artifacts || runArtifacts;
    const activeCards = result.cards || runCards;
    const activeCardUpgrades = result.cardUpgrades || runCardUpgrades;
    const activeCardRemovals = result.cardRemovals || runCardRemovals;
    const buildSourceChampion = selectedChampion || activeChampion;

    setRunChampion(activeChampion);
    setRunArtifacts(activeArtifacts);
    setRunCards(activeCards);
    setRunCardUpgrades(activeCardUpgrades);
    setRunCardRemovals(activeCardRemovals);
    setActiveQuest(null);
    setQuestResult(null);
    setLockedDepthsChoiceKey("");

    if (effect.type === "artifactChoice") {
      const choices = pickDepthsArtifactChoices(activeArtifacts, 3, buildSourceChampion, {
        champion: buildSourceChampion,
      });
      if (!choices.length) {
        completeQuestToMap(result);
        return;
      }
      setArtifactChoices(choices);
      setArtifactChoiceContext({
        type: "quest",
        currentNodeId: result.currentNodeId,
        visitedNodeIds: result.visitedNodeIds,
      });
      setChoosingStartLoadout(false);
      setChoosingArtifact(true);
      setChoosingCard(false);
      setChoosingCardUpgrade(false);
      setChoosingCardRemoval(false);
      updateDepthsRun({
        room,
        status: "choosingArtifact",
        source: "quest",
        artifactChoices: choices,
        artifactChoiceContext: {
          type: "quest",
          currentNodeId: result.currentNodeId,
          visitedNodeIds: result.visitedNodeIds,
        },
        artifacts: activeArtifacts,
        cards: activeCards,
        cardUpgrades: activeCardUpgrades,
        cardRemovals: activeCardRemovals,
        depthsMap,
        currentNodeId: result.currentNodeId,
        visitedNodeIds: result.visitedNodeIds,
        championSnapshot: activeChampion?.charObj || null,
      });
      return;
    }

    if (effect.type === "cardChoice") {
      const choices = pickDepthsCardChoices(playableCards, activeCards, 3, {
        champion: buildSourceChampion,
      });
      if (!choices.length) {
        completeQuestToMap(result);
        return;
      }
      setCardChoices(choices);
      setChoosingStartLoadout(false);
      setChoosingArtifact(false);
      setChoosingCard(true);
      setChoosingCardUpgrade(false);
      setChoosingCardRemoval(false);
      updateDepthsRun({
        room,
        status: "choosingCard",
        source: "quest",
        cardChoices: choices,
        artifacts: activeArtifacts,
        cards: activeCards,
        cardUpgrades: activeCardUpgrades,
        cardRemovals: activeCardRemovals,
        depthsMap,
        currentNodeId: result.currentNodeId,
        visitedNodeIds: result.visitedNodeIds,
        championSnapshot: activeChampion?.charObj || null,
      });
      return;
    }

    if (effect.type === "cardUpgrade") {
      if (!getDepthsChampionCardMoves(activeChampion).length) {
        completeQuestToMap(result);
        return;
      }
      setCardUpgradeChoices([]);
      setSelectedUpgradeMoveIndex(null);
      setChoosingStartLoadout(false);
      setChoosingArtifact(false);
      setChoosingCard(false);
      setChoosingCardUpgrade(true);
      setChoosingCardRemoval(false);
      updateDepthsRun({
        room,
        status: "choosingCardUpgrade",
        source: "quest",
        artifacts: activeArtifacts,
        cards: activeCards,
        cardUpgrades: activeCardUpgrades,
        cardRemovals: activeCardRemovals,
        depthsMap,
        currentNodeId: result.currentNodeId,
        visitedNodeIds: result.visitedNodeIds,
        championSnapshot: activeChampion?.charObj || null,
      });
      return;
    }

    if (effect.type === "removeCard") {
      if (!getDepthsRemovableDeckCards(activeChampion).length) {
        completeQuestToMap(result);
        return;
      }
      setCardRemovalContext({
        result,
        pendingEffects: remainingEffects,
      });
      setChoosingStartLoadout(false);
      setChoosingArtifact(false);
      setChoosingCard(false);
      setChoosingCardUpgrade(false);
      setChoosingCardRemoval(true);
      updateDepthsRun({
        room,
        status: "removingCard",
        source: "quest",
        cardRemovalContext: {
          result: {
            currentNodeId: result.currentNodeId,
            visitedNodeIds: result.visitedNodeIds,
            pendingEffectTypes: remainingEffects.map((entry) => entry.type),
          },
          pendingEffects: remainingEffects,
        },
        artifacts: activeArtifacts,
        cards: activeCards,
        cardUpgrades: activeCardUpgrades,
        cardRemovals: activeCardRemovals,
        depthsMap,
        currentNodeId: result.currentNodeId,
        visitedNodeIds: result.visitedNodeIds,
        championSnapshot: activeChampion?.charObj || null,
      });
      return;
    }

    completeQuestToMap(result);
  };

  const continueAfterQuestResult = () => {
    if (!questResult) return;
    const [nextEffect, ...remainingEffects] = questResult.pendingEffects || [];
    if (nextEffect) {
      beginQuestDeferredEffect(nextEffect, questResult, remainingEffects);
      return;
    }
    completeQuestToMap(questResult);
  };

  const handleQuestOptionSelect = (option) => {
    if (!activeQuest?.quest || questResult || choiceLockRef.current) return;

    const key = getDepthsQuestChoiceKey(option);
    choiceLockRef.current = true;
    setLockedDepthsChoiceKey(key);

    const activeChampion = runChampion || selectedChampion;
    const checkResult = resolveDepthsQuestCheck(option, activeChampion);
    const outcome = checkResult.outcome || {};
    const applied = applyDepthsQuestEffects(outcome.effects || [], activeQuest.quest, outcome);
    const result = {
      quest: activeQuest.quest,
      option,
      title: outcome.title || option.title || activeQuest.quest.title,
      text: outcome.text || "",
      success: checkResult.success,
      rollType: checkResult.rollType,
      roll: checkResult.roll,
      target: checkResult.target,
      drawnCard: checkResult.drawnCard || null,
      detail: checkResult.detail || "",
      details: applied.details,
      champion: applied.champion,
      artifacts: applied.artifacts,
      cards: applied.cards,
      cardUpgrades: applied.cardUpgrades,
      cardRemovals: applied.cardRemovals,
      pendingEffects: applied.pendingEffects,
      rewardArtifacts: applied.rewardArtifacts,
      currentNodeId: activeQuest.currentNodeId,
      visitedNodeIds: activeQuest.visitedNodeIds,
    };

    setRunChampion(applied.champion);
    setRunArtifacts(applied.artifacts);
    setRunCards(applied.cards);
    setRunCardUpgrades(applied.cardUpgrades);
    setRunCardRemovals(applied.cardRemovals);
    setQuestResult(result);
    choiceLockRef.current = false;

    updateDepthsRun({
      room,
      status: "questResolved",
      activeQuest: cleanForFirestore({
        id: activeQuest.quest.id,
        title: activeQuest.quest.title,
        world: activeQuest.quest.world,
        optionId: option.id,
      }),
      questResult: cleanForFirestore({
        title: result.title,
        text: result.text,
        success: result.success,
        rollType: result.rollType,
        roll: result.roll || null,
        target: result.target || null,
        drawnCard: result.drawnCard || null,
        detail: result.detail,
        details: result.details,
        rewardArtifacts: cleanForFirestore(result.rewardArtifacts),
        pendingEffects: result.pendingEffects.map((effect) => effect.type),
      }),
      artifacts: applied.artifacts,
      cards: applied.cards,
      cardUpgrades: applied.cardUpgrades,
      cardRemovals: applied.cardRemovals,
      depthsMap,
      currentNodeId: activeQuest.currentNodeId,
      visitedNodeIds: activeQuest.visitedNodeIds,
      championSnapshot: applied.champion?.charObj || null,
    });
  };

  const chooseDepthsCardRemoval = (card) => {
    const context = cardRemovalContext;
    if (!context?.result || choiceLockRef.current) return;
    const targetKey = card?.moveFamilyKey || card?.id || card?.cardId;
    if (!targetKey || finiteNumber(card?.deckCopies, 0) <= 0) return;

    runLockedDepthsChoice(`remove-card-${targetKey}`, () => {
      const activeArtifacts = context.result.artifacts || runArtifacts;
      const activeCards = context.result.cards || runCards;
      const activeCardUpgrades = context.result.cardUpgrades || runCardUpgrades;
      const activeCardRemovals = context.result.cardRemovals || runCardRemovals;
      const removal = {
        id: `${targetKey}-${Date.now()}`,
        moveFamilyKey: card.moveFamilyKey || "",
        moveKey: card.moveKey || "",
        moveIndex: card.moveIndex,
        moveName: card.name || card.move?.name || "Card",
        cardId: card.cardId || "",
        source: card.source || "champion",
        removedCopies: 1,
        room,
      };
      const nextCardRemovals = [...activeCardRemovals, removal];
      const nextChampion = applyDepthsRunBonusesPreservingHp(
        selectedChampion,
        activeArtifacts,
        activeCardUpgrades,
        activeCards,
        nextCardRemovals,
        context.result.champion || runChampion || selectedChampion
      );
      const nextCards = nextChampion?.charObj?.depthsRunCards || activeCards;
      const nextResult = {
        ...context.result,
        champion: nextChampion,
        artifacts: activeArtifacts,
        cards: nextCards,
        cardUpgrades: activeCardUpgrades,
        cardRemovals: nextCardRemovals,
      };
      const [nextEffect, ...remainingEffects] = context.pendingEffects || [];

      setRunArtifacts(activeArtifacts);
      setRunCards(nextCards);
      setRunCardUpgrades(activeCardUpgrades);
      setRunChampion(nextChampion);
      setRunCardRemovals(nextCardRemovals);
      setChoosingCardRemoval(false);
      setCardRemovalContext(null);

      updateDepthsRun({
        room,
        status: nextEffect ? "questRewardPending" : "map",
        removedCard: cleanForFirestore(removal),
        artifacts: activeArtifacts,
        cards: nextCards,
        cardUpgrades: activeCardUpgrades,
        cardRemovals: nextCardRemovals,
        depthsMap,
        currentNodeId: nextResult.currentNodeId,
        visitedNodeIds: nextResult.visitedNodeIds,
        championSnapshot: nextChampion?.charObj || null,
      });

      if (nextEffect) {
        beginQuestDeferredEffect(nextEffect, nextResult, remainingEffects);
        return;
      }
      completeQuestToMap(nextResult);
    });
  };

  const completeMapUtilityNode = (result, mapState = {}) => {
    const nextChampion = result.champion || runChampion || selectedChampion;
    const nextArtifacts = result.artifacts || runArtifacts;
    const nextCards = result.cards || runCards;
    const nextCardUpgrades = result.cardUpgrades || runCardUpgrades;
    const nextCardRemovals = result.cardRemovals || runCardRemovals;
    const savedNodeId = mapState.currentNodeId || currentNodeId;
    const savedVisited = mapState.visitedNodeIds || visitedNodeIds;
    setRunChampion(nextChampion);
    setRunArtifacts(nextArtifacts);
    setRunCards(nextCards);
    setRunCardUpgrades(nextCardUpgrades);
    setRunCardRemovals(nextCardRemovals);
    setCurrentMonsters([]);
    setNodeResult({
      ...result,
      room,
      cardRemovals: nextCardRemovals,
      currentNodeId: savedNodeId,
      visitedNodeIds: savedVisited,
    });
    updateDepthsRun({
      room,
      status: "nodeReward",
      artifacts: nextArtifacts,
      cards: nextCards,
      cardUpgrades: nextCardUpgrades,
      cardRemovals: nextCardRemovals,
      championSnapshot: nextChampion?.charObj || null,
      nodeResult: {
        room,
        type: result.type || null,
        title: result.title,
        text: result.text,
        detail: result.detail || null,
      },
      depthsMap,
      currentNodeId: savedNodeId,
      visitedNodeIds: savedVisited,
    });
  };

  const continueAfterNodeResult = () => {
    if (!nodeResult) return;

    if (nodeResult.completed) {
      setNodeResult(null);
      exitDepths("completed");
      return;
    }

    if (nodeResult.defeated || nodeResult.ended) {
      setNodeResult(null);
      resetDepthsLocalState();
      return;
    }

    const nextChampion = nodeResult.champion || runChampion;
    const nextArtifacts = nodeResult.artifacts || runArtifacts;
    const nextCards = nodeResult.cards || runCards;
    const nextCardUpgrades = nodeResult.cardUpgrades || runCardUpgrades;
    const nextCardRemovals = nodeResult.cardRemovals || runCardRemovals;
    if (nodeResult.currentNodeId) setCurrentNodeId(nodeResult.currentNodeId);
    if (nodeResult.visitedNodeIds) setVisitedNodeIds(nodeResult.visitedNodeIds);
    setNodeResult(null);
    nextRoom(nextChampion, nextArtifacts, nextCardUpgrades, nextCards, nextCardRemovals, {
      currentNodeId: nodeResult.currentNodeId,
      visitedNodeIds: nodeResult.visitedNodeIds,
      advanceRoom: false,
    });
  };

  const handleMapNodeSelect = (node) => {
    if (!depthsMap || !node) return;
    const connected = getConnectedDepthsMapNodes(depthsMap, currentNodeId, visitedNodeIds);
    if (!connected.some((entry) => entry.id === node.id)) return;

    const nextVisited = [...new Set([...visitedNodeIds, node.id])];
    setCurrentNodeId(node.id);
    setVisitedNodeIds(nextVisited);
    setNodeResult(null);
    setResumedBattle(null);

    if (node.type === "basic" || node.type === "elite") {
      const roomMonsters = pickRoomMonsters(room, node);
      if (!roomMonsters.length) return;
      setCurrentMonsters(roomMonsters);
      updateDepthsRun({
        room,
        status: "active",
        activeNode: node,
        depthsMap,
        currentNodeId: node.id,
        visitedNodeIds: nextVisited,
        artifacts: runArtifacts,
        cards: runCards,
        cardUpgrades: runCardUpgrades,
        cardRemovals: runCardRemovals,
        championSnapshot: runChampion?.charObj || selectedChampion?.charObj || null,
        currentMonsterIds: roomMonsters.map((entry) => entry.docId || entry.monsterId || entry.id || null),
        currentMonsterNames: roomMonsters.map((entry) => entry.name || null),
        currentMonsterScaling: roomMonsters.map((entry) => entry._depthsScaling || null),
        currentMonsters: roomMonsters.map(compactDepthsMonsterForRun).filter(Boolean),
      });
      return;
    }

    if (node.type === "rest") {
      const healed = healDepthsChampion(runChampion || selectedChampion, 0.4);
      completeMapUtilityNode(
        {
          type: "rest",
          title: "Rest Spot",
          text:
            healed.healed > 0
              ? `Your champion rests and recovers ${healed.healed} HP.`
              : "Your champion rests, but is already at full health.",
          detail: `${healed.currentHp}/${healed.maxHp} HP`,
          champion: healed.record,
          artifacts: runArtifacts,
          cards: runCards,
          cardUpgrades: runCardUpgrades,
          cardRemovals: runCardRemovals,
        },
        { currentNodeId: node.id, visitedNodeIds: nextVisited }
      );
      return;
    }

    if (node.type === "quest") {
      const quest = pickDepthsQuestForWorld(getDepthsWorldKey(room));
      setActiveQuest({ quest, currentNodeId: node.id, visitedNodeIds: nextVisited });
      setQuestResult(null);
      setCurrentMonsters([]);
      setChoosingStartLoadout(false);
      setChoosingArtifact(false);
      setChoosingCard(false);
      setChoosingCardUpgrade(false);
      setChoosingCardRemoval(false);
      setArtifactChoiceContext(null);
      updateDepthsRun({
        room,
        status: "quest",
        activeQuest: quest
          ? cleanForFirestore({
              id: quest.id,
              title: quest.title,
              world: quest.world,
              options: (quest.options || []).map((option) => ({
                id: option.id,
                title: option.title,
                check: option.check || null,
              })),
            })
          : null,
        artifacts: runArtifacts,
        cards: runCards,
        cardUpgrades: runCardUpgrades,
        cardRemovals: runCardRemovals,
        depthsMap,
        currentNodeId: node.id,
        visitedNodeIds: nextVisited,
        championSnapshot: runChampion?.charObj || selectedChampion?.charObj || null,
      });
      return;
    }

    if (node.type === "chest") {
      const buildSourceChampion = selectedChampion || runChampion;
      const choices = pickDepthsArtifactChoices(runArtifacts, 3, buildSourceChampion, {
        champion: buildSourceChampion,
      });
      setArtifactChoices(choices);
      setArtifactChoiceContext({ type: "chest", currentNodeId: node.id, visitedNodeIds: nextVisited });
      setChoosingStartLoadout(false);
      setChoosingArtifact(true);
      setChoosingCard(false);
      setChoosingCardUpgrade(false);
      updateDepthsRun({
        room,
        status: "choosingArtifact",
        artifactChoices: choices,
        artifactChoiceContext: { type: "chest", currentNodeId: node.id, visitedNodeIds: nextVisited },
        artifacts: runArtifacts,
        cards: runCards,
        cardUpgrades: runCardUpgrades,
        cardRemovals: runCardRemovals,
        depthsMap,
        currentNodeId: node.id,
        visitedNodeIds: nextVisited,
        championSnapshot: runChampion?.charObj || selectedChampion?.charObj || null,
      });
    }
  };

  const nextRoom = (
    championOverride = null,
    artifactsOverride = null,
    cardUpgradesOverride = null,
    cardsOverride = null,
    cardRemovalsOverride = null,
    mapState = {}
  ) => {
    if (cardRemovalsOverride && !Array.isArray(cardRemovalsOverride)) {
      mapState = cardRemovalsOverride;
      cardRemovalsOverride = null;
    }
    const baseRoomNumber = Number.isFinite(Number(mapState.room))
      ? Number(mapState.room)
      : room;
    const shouldAdvanceRoom = mapState.advanceRoom !== false;
    const nextRoomNumber = shouldAdvanceRoom ? baseRoomNumber + 1 : baseRoomNumber;
    const activeArtifacts = artifactsOverride || runArtifacts;
    const activeCardUpgrades = cardUpgradesOverride || runCardUpgrades;
    const activeCards = cardsOverride || runCards;
    const activeCardRemovals = cardRemovalsOverride || runCardRemovals;
    const activeChampion = championOverride || runChampion;
    const savedNodeId = mapState.currentNodeId || currentNodeId;
    const savedVisited = mapState.visitedNodeIds || visitedNodeIds;
    const activeDepthsMap = mapState.depthsMap || depthsMap;
    const hasConnectedNodes = activeDepthsMap
      ? getConnectedDepthsMapNodes(activeDepthsMap, savedNodeId, savedVisited).length > 0
      : false;
    const nextMap = activeDepthsMap && hasConnectedNodes ? activeDepthsMap : generateDepthsMap();
    const nextNodeId = hasConnectedNodes ? savedNodeId : "start";
    const nextVisited = hasConnectedNodes ? savedVisited : ["start"];
    const rewardType = mapState.rewardType || "map";
    const canUpgrade = rewardType === "upgrade" && getDepthsChampionCardMoves(activeChampion).length > 0;
    const shouldChooseCard = rewardType === "card";
    const buildSourceChampion = selectedChampion || activeChampion;
    const choices = shouldChooseCard
      ? pickDepthsCardChoices(playableCards, activeCards, 3, { champion: buildSourceChampion })
      : [];
    const nextStatus = canUpgrade ? "choosingCardUpgrade" : shouldChooseCard ? "choosingCard" : "map";

    clearBattleAdvanceTimeout();
    clearChoiceLockTimeout();
    setResumedBattle(null);
    setRoom(nextRoomNumber);
    setCurrentMonsters([]);
    setDepthsMap(nextMap);
    setCurrentNodeId(nextNodeId);
    setVisitedNodeIds(nextVisited);
    if (championOverride) setRunChampion(championOverride);
    if (artifactsOverride) setRunArtifacts(artifactsOverride);
    if (cardUpgradesOverride) setRunCardUpgrades(cardUpgradesOverride);
    if (cardsOverride) setRunCards(cardsOverride);
    if (cardRemovalsOverride) setRunCardRemovals(cardRemovalsOverride);
    setCardChoices(choices);
    setChoosingStartLoadout(false);
    setSelectedStartArtifact(null);
    setSelectedStartCard(null);
    setChoosingCard(shouldChooseCard);
    setChoosingCardUpgrade(canUpgrade);
    setChoosingCardRemoval(false);
    setSelectedUpgradeMoveIndex(null);
    setCardUpgradeChoices([]);
    setChoosingArtifact(false);
    setArtifactChoices([]);
    setArtifactChoiceContext(null);
    setActiveQuest(null);
    setQuestResult(null);
    setCardRemovalContext(null);
    updateDepthsRun({
      room: nextRoomNumber,
      status: nextStatus,
      cardChoices: choices,
      artifacts: activeArtifacts,
      cards: activeCards,
      cardUpgrades: activeCardUpgrades,
      cardRemovals: activeCardRemovals,
      depthsMap: nextMap,
      currentNodeId: nextNodeId,
      visitedNodeIds: nextVisited,
      championSnapshot: activeChampion?.charObj || null,
    });
  };

  const resetDepthsLocalState = () => {
    setDepthsRunIdentity();
    setResumedBattle(null);
    setSelectedChampion(null);
    setRunChampion(null);
    setRunArtifacts([]);
    setRunCards([]);
    setRunCardUpgrades([]);
    setRunCardRemovals([]);
    setArtifactChoices([]);
    setCardChoices([]);
    setCardUpgradeChoices([]);
    setChoosingStartLoadout(false);
    setSelectedStartArtifact(null);
    setSelectedStartCard(null);
    setChoosingCard(false);
    setChoosingArtifact(false);
    setChoosingCardUpgrade(false);
    setChoosingCardRemoval(false);
    setSelectedUpgradeMoveIndex(null);
    setArtifactChoiceContext(null);
    setActiveQuest(null);
    setQuestResult(null);
    setCardRemovalContext(null);
    setCurrentMonsters([]);
    setDepthsMap(null);
    setCurrentNodeId("start");
    setVisitedNodeIds(["start"]);
    setNodeResult(null);
    setBreakdownOpen(false);
    setDarkCoinReward(null);
    setDarkCoinRewardLoading(false);
    setDarkCoinRewardError("");
    setDarkCoinRewardClaiming(false);
    setDepthsXpResult(null);
    setDepthsXpLoading(false);
    setDepthsXpError("");
    setEntryPaymentStatus("");
    setEntryPaymentError("");
    setEntryPaymentPrompt(null);
    setEntryPaymentSubmitting(false);
    setRoom(1);
  };

  const exitDepths = (status = "abandoned") => {
    clearBattleAdvanceTimeout();
    clearChoiceLockTimeout();
    setResumedBattle(null);
    const endingRunId = runDocRef.current;
    const endingRunToken = runTokenRef.current;
    const endingChampionAssetId = selectedChampion?.assetId || runChampion?.assetId || null;
    if (runDocRef.current) {
      const updatePromise = updateDepthsRun({
        status,
        room,
        artifacts: runArtifacts,
        cards: runCards,
        cardUpgrades: runCardUpgrades,
        cardRemovals: runCardRemovals,
        championSnapshot: runChampion?.charObj || selectedChampion?.charObj || null,
        endedAt: new Date().toISOString(),
      });
      if (["completed", "defeated", "abandoned"].includes(status) && endingRunId && endingRunToken) {
        Promise.resolve(updatePromise).then(() => {
          setReloadNonce((prev) => prev + 1);
          finalizeDepthsRunXp({
            runId: endingRunId,
            runToken: endingRunToken,
            championAssetId: endingChampionAssetId,
          }).then(() =>
            postDepthsRunDiscordResult({
              runId: endingRunId,
              runToken: endingRunToken,
            })
          );
        });
      }
    }
    resetDepthsLocalState();
  };

  const leaveDepthsView = () => {
    clearBattleAdvanceTimeout();
    clearChoiceLockTimeout();
    resetDepthsLocalState();
    setReloadNonce((prev) => prev + 1);
  };

  const abandonDepthsRun = () => {
    clearBattleAdvanceTimeout();
    clearChoiceLockTimeout();

    const abandonedRunId = runDocRef.current;
    const abandonedRunToken = runTokenRef.current;
    const abandonedChampion = runChampion || selectedChampion;
    const abandonedChampionAssetId = selectedChampion?.assetId || runChampion?.assetId || null;
    const abandonedNode = getDepthsMapNode(depthsMap, currentNodeId);
    const abandoningActiveBattle =
      currentMonsters.length > 0 && (abandonedNode?.type === "basic" || abandonedNode?.type === "elite");
    const completedEncounterCount = Math.max(
      0,
      getDepthsCompletedBattleNodeCount(depthsMap, visitedNodeIds) - (abandoningActiveBattle ? 1 : 0)
    );
    const abandonedHp = abandonedChampion?.charObj
      ? getDepthsChampionCurrentHp(abandonedChampion)
      : null;
    const abandonedMaxHp = getDepthsChampionMaxHpFromCharObj(abandonedChampion?.charObj || {});

    setResumedBattle(null);
    setCurrentMonsters([]);
    setChoosingStartLoadout(false);
    setChoosingCard(false);
    setChoosingArtifact(false);
    setChoosingCardUpgrade(false);
    setChoosingCardRemoval(false);
    setActiveQuest(null);
    setQuestResult(null);
    setCardRemovalContext(null);
    setDarkCoinReward(null);
    setDarkCoinRewardLoading(false);
    setDarkCoinRewardError("");
    setDarkCoinRewardClaiming(false);
    setDepthsXpResult(null);
    setDepthsXpLoading(false);
    setDepthsXpError("");
    setEntryPaymentPrompt(null);
    setEntryPaymentSubmitting(false);
    setEntryPaymentError("");
    setEntryPaymentStatus("Abandoning Depths run");
    setNodeResult({
      title: "Run Abandoned",
      text: "Your champion leaves The Depths. This run is now ended and cannot be resumed.",
      detail: "Run ended",
      abandoned: true,
      ended: true,
      room,
      champion: abandonedChampion,
      championAssetId: abandonedChampionAssetId,
      artifacts: runArtifacts,
      cards: runCards,
      cardUpgrades: runCardUpgrades,
      cardRemovals: runCardRemovals,
      depthsMap,
      currentNodeId,
      visitedNodeIds,
      completedEncounters: completedEncounterCount,
      finalNodeType: abandonedNode?.type || "start",
      finalNodeLabel: DEPTHS_MAP_NODE_CONFIG[abandonedNode?.type]?.label || "Depths",
      finalChampionHp: abandonedHp,
      finalChampionMaxHp: abandonedMaxHp,
    });

    if (!abandonedRunId || !abandonedRunToken) return;

    updateDepthsRun({
      status: "abandoned",
      room,
      artifacts: runArtifacts,
      cards: runCards,
      cardUpgrades: runCardUpgrades,
      cardRemovals: runCardRemovals,
      championSnapshot: abandonedChampion?.charObj || selectedChampion?.charObj || null,
      depthsMap,
      currentNodeId,
      visitedNodeIds,
      endedAt: true,
    }).then((result) => {
      setEntryPaymentStatus("");
      if (!result) {
        setDepthsXpError("Could not abandon this Depths run.");
        return;
      }
      setReloadNonce((prev) => prev + 1);
      finalizeDepthsRunXp({
        runId: abandonedRunId,
        runToken: abandonedRunToken,
        championAssetId: abandonedChampionAssetId,
      }).then(() =>
        postDepthsRunDiscordResult({
          runId: abandonedRunId,
          runToken: abandonedRunToken,
        })
      );
    }).catch((error) => {
      setEntryPaymentStatus("");
      setDepthsXpError(error?.message || "Could not abandon this Depths run.");
    });
  };

  const handleBattleComplete = (result) => {
    clearBattleAdvanceTimeout();

    battleAdvanceTimeoutRef.current = window.setTimeout(() => {
      battleAdvanceTimeoutRef.current = null;
      const resumeState = result?.runState || {};
      const activeRoom = Number.isFinite(Number(resumeState.room)) ? Number(resumeState.room) : room;
      const activeDepthsMap = resumeState.depthsMap || depthsMap;
      const activeNodeId = resumeState.currentNodeId || currentNodeId;
      const activeVisitedNodeIds = Array.isArray(resumeState.visitedNodeIds)
        ? resumeState.visitedNodeIds
        : visitedNodeIds;
      const activeBaseChampion = resumeState.champion || runChampion || selectedChampion;
      const activeArtifacts = Array.isArray(resumeState.artifacts) ? resumeState.artifacts : runArtifacts;
      const activeCards = Array.isArray(resumeState.cards) ? resumeState.cards : runCards;
      const activeCardUpgrades = Array.isArray(resumeState.cardUpgrades)
        ? resumeState.cardUpgrades
        : runCardUpgrades;
      const activeCardRemovals = Array.isArray(resumeState.cardRemovals)
        ? resumeState.cardRemovals
        : runCardRemovals;
      const battleChampion = result?.battle?.fighters?.A
        ? setDepthsChampionCurrentHp(activeBaseChampion, result.battle.fighters.A.hp)
        : activeBaseChampion;
      if (result?.winner === "champion") {
        setResumedBattle(null);
        const completedDepths = isDepthsFinalNode(activeDepthsMap, activeNodeId);

        setRunChampion(battleChampion);

        if (completedDepths) {
          const completedRunId = runDocRef.current;
          const completedRunToken = runTokenRef.current;
          const completedChampionAssetId = battleChampion?.assetId || selectedChampion?.assetId;
          const completedNode = getDepthsMapNode(activeDepthsMap, activeNodeId);
          const finalChampionFighter = result?.battle?.fighters?.A || null;
          const completedEncounterCount =
            getDepthsCompletedBattleNodeCount(activeDepthsMap, activeVisitedNodeIds) || Math.max(1, activeRoom);

          setCurrentMonsters([]);
          setDarkCoinReward(null);
          setDarkCoinRewardError("");
          setDarkCoinRewardLoading(true);
          setNodeResult({
            title: "The Depths Cleared",
            text: `${battleChampion?.name || selectedChampion?.name || "Your champion"} has cleared the final encounter.`,
            detail: "Rolling reward",
            completed: true,
            room: activeRoom,
            champion: battleChampion,
            championAssetId: completedChampionAssetId,
            artifacts: activeArtifacts,
            cards: activeCards,
            cardUpgrades: activeCardUpgrades,
            cardRemovals: activeCardRemovals,
            depthsMap: activeDepthsMap,
            currentNodeId: activeNodeId,
            visitedNodeIds: activeVisitedNodeIds,
            completedEncounters: completedEncounterCount,
            finalNodeType: completedNode?.type || "elite",
            finalNodeLabel:
              DEPTHS_MAP_NODE_CONFIG[completedNode?.type]?.label || "Final Encounter",
            finalChampionHp: finalChampionFighter?.hp ?? battleChampion?.charObj?.depthsCurrentHp,
            finalChampionMaxHp:
              finalChampionFighter?.maxHp ?? getDepthsChampionMaxHpFromCharObj(battleChampion?.charObj || {}),
            killingBlow: result?.battle?.killingBlow || null,
          });
          updateDepthsRun({
            status: "completed",
            clientRewardEligible: true,
            room: activeRoom,
            artifacts: activeArtifacts,
            cards: activeCards,
            cardUpgrades: activeCardUpgrades,
            cardRemovals: activeCardRemovals,
            championSnapshot: battleChampion?.charObj || null,
            championBattleSnapshot: result?.battle?.fighters?.A || null,
            lastBattleId: result?.battle?.id || null,
            depthsMap: activeDepthsMap,
            currentNodeId: activeNodeId,
            visitedNodeIds: activeVisitedNodeIds,
            completedAt: true,
          }).then((updateResult) => {
            if (!updateResult) {
              setDarkCoinRewardLoading(false);
              setEntryPaymentError(
                `The battle completed locally, but the server did not verify the battle yet. ${
                  lastDepthsRunUpdateErrorRef.current || "Refresh and resume this run before claiming rewards."
                }`
              );
              return;
            }
            Promise.allSettled([
              finalizeDepthsRunXp({
                runId: completedRunId,
                runToken: completedRunToken,
                championAssetId: completedChampionAssetId,
              }),
              requestDarkCoinRewardGrant({
                runId: completedRunId,
                runToken: completedRunToken,
                championAssetId: completedChampionAssetId,
              }),
            ]).then(() =>
              postDepthsRunDiscordResult({
                runId: completedRunId,
                runToken: completedRunToken,
              })
            );
          });
          return;
        }

        updateDepthsRun({
          status: "roomCleared",
          room: activeRoom,
          artifacts: activeArtifacts,
          cards: activeCards,
          cardUpgrades: activeCardUpgrades,
          cardRemovals: activeCardRemovals,
          championSnapshot: battleChampion?.charObj || null,
          championBattleSnapshot: result?.battle?.fighters?.A || null,
          lastBattleId: result?.battle?.id || null,
          depthsMap: activeDepthsMap,
          currentNodeId: activeNodeId,
          visitedNodeIds: activeVisitedNodeIds,
        }).then((result) => {
          if (!result) {
            setEntryPaymentError(
              `The battle completed locally, but the server did not advance the run. ${
                lastDepthsRunUpdateErrorRef.current || "Refresh and resume this run before continuing."
              }`
            );
            return;
          }
          const clearedNode = getDepthsMapNode(activeDepthsMap, activeNodeId);
          nextRoom(battleChampion, activeArtifacts, activeCardUpgrades, activeCards, activeCardRemovals, {
            room: activeRoom,
            depthsMap: activeDepthsMap,
            currentNodeId: activeNodeId,
            visitedNodeIds: activeVisitedNodeIds,
            rewardType: clearedNode?.type === "elite" ? "upgrade" : "card",
          });
        });
      } else {
        setResumedBattle(null);
        setRunChampion(battleChampion);
        const defeatedRunId = runDocRef.current;
        const defeatedRunToken = runTokenRef.current;
        const defeatedChampionAssetId = battleChampion?.assetId || selectedChampion?.assetId;
        const defeatedNode = getDepthsMapNode(activeDepthsMap, activeNodeId);
        const defeatedChampionFighter = result?.battle?.fighters?.A || null;
        const defeatedAtBattleNode = defeatedNode?.type === "basic" || defeatedNode?.type === "elite";
        const completedEncounterCount = Math.max(
          0,
          getDepthsCompletedBattleNodeCount(activeDepthsMap, activeVisitedNodeIds) - (defeatedAtBattleNode ? 1 : 0)
        );

        setCurrentMonsters([]);
        setDarkCoinReward(null);
        setDarkCoinRewardLoading(false);
        setDarkCoinRewardError("");
        setDarkCoinRewardClaiming(false);
        setDepthsXpResult(null);
        setDepthsXpError("");
        setNodeResult({
          title: result?.winner === "draw" ? "Mutual Defeat" : "Champion Defeated",
          text:
            result?.winner === "draw"
              ? `${battleChampion?.name || selectedChampion?.name || "Your champion"} fell as the final monster went down.`
              : `${battleChampion?.name || selectedChampion?.name || "Your champion"} was defeated in The Depths.`,
          detail: "Run ended",
          defeated: true,
          ended: true,
          room: activeRoom,
          champion: battleChampion,
          championAssetId: defeatedChampionAssetId,
          artifacts: activeArtifacts,
          cards: activeCards,
          cardUpgrades: activeCardUpgrades,
          cardRemovals: activeCardRemovals,
          depthsMap: activeDepthsMap,
          currentNodeId: activeNodeId,
          visitedNodeIds: activeVisitedNodeIds,
          completedEncounters: completedEncounterCount,
          finalNodeType: defeatedNode?.type || "basic",
          finalNodeLabel:
            DEPTHS_MAP_NODE_CONFIG[defeatedNode?.type]?.label || "Encounter",
          finalChampionHp: defeatedChampionFighter?.hp ?? battleChampion?.charObj?.depthsCurrentHp ?? 0,
          finalChampionMaxHp:
            defeatedChampionFighter?.maxHp ?? getDepthsChampionMaxHpFromCharObj(battleChampion?.charObj || {}),
          killingBlow: result?.battle?.killingBlow || null,
        });

        updateDepthsRun({
          status: "defeated",
          room: activeRoom,
          artifacts: activeArtifacts,
          cards: activeCards,
          cardUpgrades: activeCardUpgrades,
          cardRemovals: activeCardRemovals,
          championSnapshot: battleChampion?.charObj || null,
          championBattleSnapshot: result?.battle?.fighters?.A || null,
          lastBattleId: result?.battle?.id || null,
          depthsMap: activeDepthsMap,
          currentNodeId: activeNodeId,
          visitedNodeIds: activeVisitedNodeIds,
          endedAt: true,
        }).then((updateResult) => {
          if (!updateResult) {
            setEntryPaymentError(
              `The battle completed locally, but the server did not verify the defeat. ${
                lastDepthsRunUpdateErrorRef.current || "Refresh and resume this run before continuing."
              }`
            );
            return;
          }
          finalizeDepthsRunXp({
            runId: defeatedRunId,
            runToken: defeatedRunToken,
            championAssetId: defeatedChampionAssetId,
          }).then(() =>
            postDepthsRunDiscordResult({
              runId: defeatedRunId,
              runToken: defeatedRunToken,
            })
          );
        });
      }
    }, 4800);
  };

  const refreshChampions = () => {
    setChampionRecords([]);
    setWalletRows([]);
    setWalletError("");
    setChampionError("");
    setReloadNonce((prev) => prev + 1);
  };

  const openChampionObject = (record) => {
    setObjectModalRecord(record);
  };

  const closeChampionObject = () => {
    setObjectModalRecord(null);
  };

  const loadingSelections = walletLoading || championLoading || monsterLoading || cardLoading;
  const selectionDisabled = !playableMonsters.length || !playableCards.length || loadingSelections;

  return (
    <Box sx={pageStyle}>
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.62) 58%, #000 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <Box sx={contentStyle}>
        {!selectedChampion ? (
          <>
            <HeroPanel
              championCount={playableChampions.length}
              monsterCount={playableMonsters.length}
              cardCount={playableCards.length}
            />

            <DepthsWalletRewardPanel
              visible={Boolean(activeAddress)}
              reward={walletDepthsReward}
              loading={walletDepthsRewardLoading}
              claiming={walletDepthsRewardClaiming}
              status={walletDepthsRewardStatus}
              error={walletDepthsRewardError}
              onClaim={claimWalletDepthsRewards}
            />

            <DepthsRewardOddsPanel
              odds={depthsRewardOdds}
              loading={depthsRewardOddsLoading}
              error={depthsRewardOddsError}
            />

            {entryPaymentError ? (
              <Box sx={{ ...panelStyle, mt: 2, p: 2, borderColor: "rgba(248,87,90,0.6)" }}>
                <Typography sx={{ color: THEME.bad, fontSize: 13 }}>{entryPaymentError}</Typography>
              </Box>
            ) : null}

            <Box sx={{ mt: 4, mb: 2, display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
              <Box>
                <Typography sx={{ ...medievalText, color: THEME.text, fontSize: { xs: 20, md: 26 } }}>
                  Select Champion
                </Typography>
                <Typography sx={{ color: THEME.muted, fontSize: 14, mt: 0.7 }}>
                  Pick a generated champion object to enter The Depths.
                </Typography>
              </Box>
              <Button startIcon={<RefreshIcon />} onClick={refreshChampions} sx={{ ...buttonStyle, minHeight: 42 }}>
                Refresh
              </Button>
            </Box>

            {!activeAddress ? (
              <EmptyPanel title="Connect Wallet" text="Connect a wallet to load your Dark Coin Champion NFTs." />
            ) : walletLoading || championLoading || cardLoading ? (
              <LoadingPanel
                title={
                  walletLoading
                    ? "Loading wallet champions"
                    : championLoading
                    ? "Loading champion objects"
                    : "Loading Depths cards"
                }
              />
            ) : walletError || championError || monsterError || cardError ? (
              <EmptyPanel
                title="Could Not Load The Depths"
                text={walletError || championError || monsterError || cardError}
                action={
                  <Button startIcon={<RefreshIcon />} onClick={refreshChampions} sx={{ ...buttonStyle, minHeight: 42 }}>
                    Try Again
                  </Button>
                }
              />
            ) : !championRecords.length ? (
              <EmptyPanel
                title="No Champions Found"
                text="No Dark Coin Champion NFTs were found in the connected wallet."
              />
            ) : !playableChampions.length ? (
              <EmptyPanel
                title="No Generated Champions"
                text="The wallet has champions, but none of them returned a character object yet."
              />
            ) : !playableMonsters.length ? (
              <EmptyPanel
                title="No Monsters Ready"
                text="The monsters collection loaded, but no monsters with moves are currently ready for The Depths battles."
              />
            ) : !playableCards.length ? (
              <EmptyPanel
                title="No Cards Ready"
                text="The cards collection loaded, but no completed cards are currently ready for The Depths rewards."
              />
            ) : (
              <Grid container spacing={2}>
                {championRecords.map((record) => (
                  <Grid item xs={12} sm={6} lg={4} xl={3} key={record.assetId}>
                    <ChampionCard
                      record={record}
                      onStart={startDepths}
                      onViewObject={openChampionObject}
                      disabled={selectionDisabled}
                      setMessage={props.setMessage}
                      sendDiscordMessage={props.sendDiscordMessage}
                      contracts={props.contracts}
                      entryInfo={championEntryInfoByAssetId[String(record.assetId || "")]}
                      entryInfoLoading={championEntryInfoLoading}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        ) : (
          <>
            <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Button startIcon={<ArrowBackIcon />} onClick={leaveDepthsView} sx={{ ...buttonStyle, minHeight: 42 }}>
                  Leave The Depths
                </Button>
                {runId && !nodeResult?.ended && !nodeResult?.completed ? (
                  <Button
                    startIcon={<CloseIcon />}
                    onClick={abandonDepthsRun}
                    sx={{
                      ...buttonStyle,
                      minHeight: 42,
                      borderColor: "rgba(248,87,90,0.5)",
                      color: THEME.text,
                      "&:hover": {
                        borderColor: THEME.bad,
                        background: "rgba(248,87,90,0.18)",
                      },
                    }}
                  >
                    Abandon Run
                  </Button>
                ) : null}
                <Button
                  startIcon={<VisibilityIcon />}
                  onClick={() => setBreakdownOpen(true)}
                  sx={{ ...buttonStyle, minHeight: 42 }}
                >
                  Champion Breakdown
                </Button>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography sx={{ ...medievalText, color: THEME.muted, fontSize: 12 }}>
                  Champion #{selectedChampion.assetId}
                </Typography>
                <DepthsEncounterChip room={room} monsters={currentMonsters} />
              </Box>
            </Box>

            {!entryPaymentPrompt && (entryPaymentStatus || entryPaymentError) ? (
              <Box
                sx={{
                  mb: 2,
                  p: 1.4,
                  border: `1px solid ${entryPaymentError ? "rgba(248,87,90,0.6)" : THEME.line}`,
                  borderRadius: 1,
                  background: "rgba(0,0,0,0.48)",
                }}
              >
                <Typography sx={{ color: entryPaymentError ? THEME.bad : THEME.muted, fontSize: 12 }}>
                  {entryPaymentError || entryPaymentStatus}
                </Typography>
              </Box>
            ) : null}

            {entryPaymentPrompt ? (
              <DepthsEntryPaymentPanel
                champion={selectedChampion}
                prompt={entryPaymentPrompt}
                status={entryPaymentStatus}
                error={entryPaymentError}
                submitting={entryPaymentSubmitting}
                onConfirm={confirmDepthsEntryPayment}
                onCancel={() => exitDepths()}
              />
            ) : !runId && entryPaymentStatus ? (
              <LoadingPanel title={entryPaymentStatus} />
            ) : choosingStartLoadout ? (
              <DepthsStartLoadoutPanel
                champion={selectedChampion}
                room={room}
                artifactChoices={artifactChoices}
                cardChoices={cardChoices}
                selectedArtifact={selectedStartArtifact}
                selectedCard={selectedStartCard}
                previewChampion={startLoadoutPreviewChampion}
                onSelectArtifact={selectStartArtifact}
                onSelectCard={selectStartCard}
                onConfirm={confirmStartLoadout}
              />
            ) : choosingArtifact ? (
              <ArtifactChoicePanel
                champion={runChampion || selectedChampion}
                room={room}
                choices={artifactChoices}
                selectedArtifacts={runArtifacts}
                selectedChoiceKey={lockedDepthsChoiceKey}
                onChoose={chooseDepthsArtifact}
                mode={artifactChoiceContext?.type || "start"}
              />
            ) : choosingCard ? (
              <CardChoicePanel
                champion={runChampion || selectedChampion}
                room={room}
                choices={cardChoices}
                selectedCards={runCards}
                selectedChoiceKey={lockedDepthsChoiceKey}
                onChoose={chooseDepthsCard}
                onSkip={skipDepthsCard}
              />
            ) : choosingCardUpgrade ? (
              <CompactCardUpgradePanel
                champion={runChampion || selectedChampion}
                room={room}
                selectedUpgrades={runCardUpgrades}
                selectedMoveIndex={selectedUpgradeMoveIndex}
                choices={cardUpgradeChoices}
                selectedChoiceKey={lockedDepthsChoiceKey}
                onSelectMove={selectCardUpgradeMove}
                onChooseUpgrade={chooseDepthsCardUpgrade}
              />
            ) : choosingCardRemoval ? (
              <CardRemovalPanel
                champion={runChampion || selectedChampion}
                room={room}
                cards={getDepthsRemovableDeckCards(runChampion || selectedChampion)}
                selectedChoiceKey={lockedDepthsChoiceKey.replace("remove-card-", "")}
                onChoose={chooseDepthsCardRemoval}
              />
            ) : activeQuest ? (
              <DepthsQuestPanel
                quest={activeQuest.quest}
                result={questResult}
                champion={runChampion || selectedChampion}
                room={room}
                selectedChoiceKey={lockedDepthsChoiceKey}
                onChooseOption={handleQuestOptionSelect}
                onContinue={continueAfterQuestResult}
              />
            ) : nodeResult ? (
              <NodeResultPanel
                result={nodeResult}
                room={room}
                onContinue={continueAfterNodeResult}
                darkCoinReward={darkCoinReward}
                rewardLoading={darkCoinRewardLoading}
                rewardError={darkCoinRewardError}
                rewardClaiming={darkCoinRewardClaiming}
                depthsXpResult={depthsXpResult}
                depthsXpLoading={depthsXpLoading}
                depthsXpError={depthsXpError}
                onClaimReward={claimDarkCoinReward}
              />
            ) : currentMonsters.length ? (
              <DepthsBattle
                key={`${selectedChampion.assetId}-${currentMonsters
                  .map((entry) => entry.docId || entry.monsterId || entry.id)
                  .join("-")}-${room}`}
                championRecord={runChampion || selectedChampion}
                monster={currentMonsters[0]}
                monsters={currentMonsters}
                room={room}
                activeAddress={activeAddress}
                runId={runId}
                runToken={runToken}
                runArtifacts={runArtifacts}
                runCards={runCards}
                runCardUpgrades={runCardUpgrades}
                resumeBattle={resumedBattle}
                currentNodeId={currentNodeId}
                currentNodeType={getDepthsMapNode(depthsMap, currentNodeId)?.type || ""}
                onComplete={handleBattleComplete}
              />
            ) : depthsMap ? (
              <DepthsMapPanel
                map={depthsMap}
                currentNodeId={currentNodeId}
                visitedNodeIds={visitedNodeIds}
                room={room}
                onSelectNode={handleMapNodeSelect}
              />
            ) : (
              <EmptyPanel title="No Depths Map" text="Choose a card to reveal this run's Depths map." />
            )}
          </>
        )}

        <ChampionObjectModal
          open={Boolean(objectModalRecord)}
          record={objectModalRecord}
          onClose={closeChampionObject}
          contracts={props.contracts}
          setMessage={props.setMessage}
          sendDiscordMessage={props.sendDiscordMessage}
        />
        <ChampionBreakdownDialog
          open={breakdownOpen}
          onClose={() => setBreakdownOpen(false)}
          champion={breakdownChampion}
          artifacts={breakdownArtifacts}
          cards={breakdownCards}
        />
      </Box>
    </Box>
  );
}
