import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  Grid,
  IconButton,
  LinearProgress,
  Slider,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import MusicOffIcon from "@mui/icons-material/MusicOff";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { buildDepthsArtifactRuntime } from "./depthsArtifacts";
import { getArenaEffectInfo } from "./effectInfo";
import { getDepthsMoveId, findDepthsReplayMove, restoreDepthsMoveIds } from "../../../lib/depthsMoves";

const THEME = {
  text: "rgba(255,255,255,0.94)",
  muted: "rgba(255,255,255,0.64)",
  faint: "rgba(255,255,255,0.34)",
  line: "rgba(255,255,255,0.22)",
  lineStrong: "rgba(255,255,255,0.52)",
  panel: "rgba(0,0,0,0.76)",
  good: "#9FE870",
  bad: "#F8575A",
  gold: "#e1b864",
};

const POWER_ICON_SRC = "/dragonshorde/power.png";
const ACCURACY_ICON_SRC = "/dragonshorde/accuracy.svg";
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
  damage: POWER_ICON_SRC,
  cooldown: "/dragonshorde/cooldown.png",
};

const EFFECTS = [
  { key: "poison", icon: "/dragonshorde/trees/Poison.svg" },
  { key: "bleed", icon: "/dragonshorde/trees/Bleed.svg" },
  { key: "burn", icon: "/dragonshorde/trees/Burn.svg" },
  { key: "freeze", icon: "/dragonshorde/trees/Freeze.svg" },
  { key: "slow", icon: "/dragonshorde/trees/Slow.svg" },
  { key: "drown", icon: "/dragonshorde/trees/Drown.svg" },
  { key: "paralyze", icon: "/dragonshorde/trees/Paralyze.svg" },
  { key: "doom", icon: "/dragonshorde/trees/Doom.svg" },
  { key: "shield", icon: "/dragonshorde/trees/Shield.svg" },
  { key: "strengthen", icon: "/dragonshorde/trees/Strengthen.svg" },
  { key: "focus", icon: "/dragonshorde/trees/Focus.svg" },
  { key: "empower", icon: "/dragonshorde/trees/Empower.svg" },
  { key: "nurture", icon: "/dragonshorde/trees/Nurture.svg" },
  { key: "bless", icon: "/dragonshorde/trees/Bless.svg" },
  { key: "hasten", icon: "/dragonshorde/trees/Hasten.svg" },
  { key: "cleanse", icon: "/dragonshorde/trees/Cleanse.svg" },
];

const EFFECT_ICON_BY_KEY = EFFECTS.reduce((acc, effect) => {
  acc[effect.key] = effect.icon;
  return acc;
}, {});

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

const STAT_KEYS = [
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

const DISPLAY_STAT_KEYS = STAT_KEYS.filter((key) => key !== "accuracy");

const FIGHT_FPS = 30;
const FRAME_MS = 1000 / FIGHT_FPS;
const FIGHT_FRAMES_A = 45;
const FIGHT_FRAMES_B = 45;
const INTRO_GAP_MS = 450;
const INTRO_HOLD_MS = 650;
const INTRO_TOTAL_MS =
  (FIGHT_FRAMES_A + FIGHT_FRAMES_B) * FRAME_MS + INTRO_GAP_MS + INTRO_HOLD_MS;
const SIM_MOVE_CHAR_FRAME_HOLD = 8;
const SIM_MOVE_CHAR_LAST_FRAME_HOLD = 16;
const SIM_MOVE_EFFECT_FRAME_HOLD = 7;
const SIM_MOVE_EFFECT_LAST_FRAME_HOLD = 42;
const PHYS_APPROACH_FRAMES = 32;
const PHYS_RETREAT_FRAMES = 24;
const PROJECTILE_DURATION_MS = 3000;
const MOVE_EFFECT_LAUNCH_MS = SIM_MOVE_CHAR_FRAME_HOLD * 2 * FRAME_MS;
const MELEE_APPROACH_MS = PHYS_APPROACH_FRAMES * FRAME_MS;
const MELEE_RETREAT_MS = PHYS_RETREAT_FRAMES * FRAME_MS;
const DEPTHS_CARD_MELEE_CASTER_START_OFFSET = 4.5;
const DEPTHS_CARD_MELEE_CASTER_STOP_OFFSET = 11.5;
const DEPTHS_CARD_MELEE_CASTER_ORIGIN_HOLD = 0.16;
const MONSTER_THINK_MS = 1450;
const MOVE_PREVIEW_BG_SRC = "/home/arena.png";
const DEPTHS_ENCOUNTER_BACKGROUNDS = Array.from(
  { length: 14 },
  (_, index) => `/arena/depths/encounters/E${index + 1}.png`
);
const DEPTHS_AUDIO_ROOT = "/arena/depths/audio";
const DEPTHS_AUDIO_FILES = {
  battleMusic: Array.from({ length: 10 }, (_, index) => `${DEPTHS_AUDIO_ROOT}/battleMusic/${index + 1}.mp3`),
  damageOverTime: Array.from({ length: 3 }, (_, index) => `${DEPTHS_AUDIO_ROOT}/damageOverTime/${index + 1}.mp3`),
  dot: Array.from({ length: 3 }, (_, index) => `${DEPTHS_AUDIO_ROOT}/damageOverTime/${index + 1}.mp3`),
  death: Array.from({ length: 3 }, (_, index) => `${DEPTHS_AUDIO_ROOT}/death/${index + 1}.mp3`),
  hit: [
    `${DEPTHS_AUDIO_ROOT}/hit/1.wav`,
    `${DEPTHS_AUDIO_ROOT}/hit/2.ogg`,
    `${DEPTHS_AUDIO_ROOT}/hit/3.mp3`,
  ],
  miss: [
    `${DEPTHS_AUDIO_ROOT}/miss/1.wav`,
    `${DEPTHS_AUDIO_ROOT}/miss/2.wav`,
    `${DEPTHS_AUDIO_ROOT}/miss/3.wav`,
  ],
};
const DEPTHS_AUDIO_STORAGE_KEY = "darkcoin-depths-audio";
const DEFAULT_DEPTHS_AUDIO_SETTINGS = {
  music: true,
  sfx: true,
  musicVolume: 0.38,
  sfxVolume: 0.66,
};

const SPRITE_FRAME_MS = 340;
const SPRITE_LOOP_PAUSE_MS = 2000;
const MOVE_EFFECT_FRAME_MS = 240;
const TICK_MS = 100;
const POPUP_ANIMATION_MS = 4200;
const POPUP_CLEAR_DELAY_MS = 4600;
const EFFECT_DAMAGE_POPUP_DELAY_MS = 0;
const DOT_POPUP_TOP_OFFSET = 0;
const POPUP_STACK_GAP_PCT = 6.2;
const POPUP_STACK_EXTRA_LINE_GAP_PCT = 1.6;
const POPUP_MAX_STACK_OFFSET_PCT = 24;
const MAX_VISIBLE_POPUPS = 12;
const REPEAT_CAST_GAP_MS = 320;

const asArray = (value) => (Array.isArray(value) ? value : []);
const roundToTenth = (x) => Math.round(x * 10) / 10;

function shuffleArray(items = []) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function easeOutCubic(value) {
  const t = clamp(value, 0, 1);
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(value) {
  const t = clamp(value, 0, 1);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatEffectTotalValue(value, suffix = "", decimals = 1) {
  const number = safeNumber(value, 0);
  const sign = number > 0 ? "+" : "";
  const fixed = number.toFixed(decimals).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  return `${sign}${fixed}${suffix}`;
}

function getEffectTotalRows(effectKey, stackValue) {
  const stacks = safeNumber(stackValue, 0);
  if (stacks <= 0) return [];

  const statIcon = DEPTHS_STAT_ICON_BY_KEY;
  const effectIcon = EFFECT_ICON_BY_KEY[String(effectKey || "").toLowerCase()] || "";
  const rowsByEffect = {
    poison: [
      { icon: statIcon.health, text: `${formatEffectTotalValue(stacks * -0.3)} HP before turn` },
    ],
    bleed: [
      { icon: statIcon.health, text: `${formatEffectTotalValue(stacks * -0.2)} HP before turn` },
      { icon: statIcon.strength, text: `${formatEffectTotalValue(stacks * -0.1)} strength` },
    ],
    burn: [
      { icon: statIcon.health, text: `${formatEffectTotalValue(stacks * -0.2)} HP before turn` },
      { icon: statIcon.strength, text: `${formatEffectTotalValue(stacks * 0.1)} strength` },
      { icon: statIcon.speed, text: `${formatEffectTotalValue(stacks * 0.2)} speed` },
      { icon: statIcon.intelligence, text: `${formatEffectTotalValue(stacks * -0.1)} intelligence` },
    ],
    freeze: [
      { icon: statIcon.dexterity, text: `${formatEffectTotalValue(stacks * -0.4)} dexterity` },
      { icon: statIcon.speed, text: `${formatEffectTotalValue(stacks * -0.4)} speed` },
    ],
    slow: [
      { icon: statIcon.dexterity, text: `${formatEffectTotalValue(stacks * -0.2)} dexterity` },
      { icon: statIcon.speed, text: `${formatEffectTotalValue(stacks * -0.6)} speed` },
    ],
    drown: [
      { icon: statIcon.dexterity, text: `${formatEffectTotalValue(stacks * -0.6)} dexterity` },
      { icon: statIcon.accuracy, text: `${formatEffectTotalValue(stacks * -0.2)} accuracy` },
    ],
    paralyze: [
      { icon: statIcon.accuracy, text: `${formatEffectTotalValue(stacks * -0.2)} accuracy` },
      { icon: statIcon.speed, text: `${formatEffectTotalValue(stacks * -0.4)} speed` },
    ],
    doom: [
      { icon: statIcon.health, text: `${formatEffectTotalValue(stacks * -0.1)} HP before turn` },
      { icon: statIcon.resist, text: `${formatEffectTotalValue(stacks * -0.4)} resist` },
      { icon: statIcon.strength, text: `${formatEffectTotalValue(stacks * 0.2)} strength` },
    ],
    shield: [
      { icon: statIcon.damage, text: `Blocks ${formatEffectTotalValue(stacks * 0.5).replace("+", "")} melee or ranged damage` },
    ],
    strengthen: [
      { icon: statIcon.strength, text: `${formatEffectTotalValue(stacks * 0.5)} strength` },
    ],
    focus: [
      { icon: statIcon.accuracy, text: `${formatEffectTotalValue(stacks * 0.5)} accuracy` },
      { icon: statIcon.critChance, text: `${formatEffectTotalValue(stacks * 0.4, "%")} crit chance` },
    ],
    empower: [
      { icon: statIcon.strength, text: `${formatEffectTotalValue(stacks * 0.2)} strength` },
      { icon: statIcon.intelligence, text: `${formatEffectTotalValue(stacks * 0.4)} intelligence` },
    ],
    nurture: [
      { icon: statIcon.health, text: `${formatEffectTotalValue(stacks * 0.2)} HP before turn` },
    ],
    bless: [
      { icon: statIcon.strength, text: `${formatEffectTotalValue(stacks * 0.3)} strength` },
      { icon: statIcon.intelligence, text: `${formatEffectTotalValue(stacks * 0.3)} intelligence` },
      { icon: statIcon.resist, text: `${formatEffectTotalValue(stacks * 0.1)} resist` },
    ],
    hasten: [
      { icon: statIcon.dexterity, text: `${formatEffectTotalValue(stacks * 0.3)} dexterity` },
      { icon: statIcon.speed, text: `${formatEffectTotalValue(stacks * 0.4)} speed` },
    ],
    cleanse: [
      { icon: effectIcon, text: `Blocks or removes up to ${formatEffectTotalValue(stacks).replace("+", "")} negative stacks` },
    ],
  };

  return rowsByEffect[String(effectKey || "").toLowerCase()] || [];
}

function pickRandomItem(items = []) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)] || null;
}

function readStoredDepthsAudioSettings() {
  if (typeof window === "undefined") return DEFAULT_DEPTHS_AUDIO_SETTINGS;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(DEPTHS_AUDIO_STORAGE_KEY) || "{}");
    return {
      music: parsed.music !== false,
      sfx: parsed.sfx !== false,
      musicVolume: clamp(safeNumber(parsed.musicVolume, DEFAULT_DEPTHS_AUDIO_SETTINGS.musicVolume), 0, 1),
      sfxVolume: clamp(safeNumber(parsed.sfxVolume, DEFAULT_DEPTHS_AUDIO_SETTINGS.sfxVolume), 0, 1),
    };
  } catch {
    return DEFAULT_DEPTHS_AUDIO_SETTINGS;
  }
}

function useDepthsBattleAudio({ battleKey, active }) {
  const [settings, setSettings] = useState(DEFAULT_DEPTHS_AUDIO_SETTINGS);
  const settingsRef = useRef(settings);
  const musicRef = useRef(null);
  const musicBattleKeyRef = useRef("");
  const activeSfxRef = useRef(new Set());
  const skipFirstSettingsWriteRef = useRef(true);

  useEffect(() => {
    setSettings(readStoredDepthsAudioSettings());
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
    if (typeof window === "undefined") return;
    if (skipFirstSettingsWriteRef.current) {
      skipFirstSettingsWriteRef.current = false;
      return;
    }

    try {
      window.localStorage.setItem(DEPTHS_AUDIO_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Audio preferences are nice to have, but battle playback should not depend on storage.
    }
  }, [settings]);

  const pauseMusic = useCallback(() => {
    const audio = musicRef.current;
    if (!audio) return;
    audio.pause();
  }, []);

  const stopMusic = useCallback(() => {
    const audio = musicRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    musicRef.current = null;
    musicBattleKeyRef.current = "";
  }, []);

  const stopSfx = useCallback(() => {
    activeSfxRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    activeSfxRef.current.clear();
  }, []);

  const playSfx = useCallback((kind) => {
    if (typeof window === "undefined" || !settingsRef.current.sfx) return;

    const pool = DEPTHS_AUDIO_FILES[kind] || [];
    const src = pickRandomItem(pool);
    if (!src) return;

    const audio = new Audio(src);
    const baseVolume =
      kind === "death"
        ? 0.72
        : kind === "miss"
        ? 0.58
        : kind === "dot" || kind === "damageOverTime"
        ? 0.62
        : 0.66;
    audio.depthsBaseVolume = baseVolume;
    audio.volume = clamp(baseVolume * safeNumber(settingsRef.current.sfxVolume, DEFAULT_DEPTHS_AUDIO_SETTINGS.sfxVolume), 0, 1);
    audio.preload = "auto";
    const cleanup = () => activeSfxRef.current.delete(audio);
    audio.addEventListener("ended", cleanup, { once: true });
    audio.addEventListener("error", cleanup, { once: true });
    activeSfxRef.current.add(audio);
    audio.play().catch(() => cleanup());
  }, []);

  useEffect(() => {
    if (!settings.sfx) stopSfx();
  }, [settings.sfx, stopSfx]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    if (!active || !settings.music) {
      pauseMusic();
      return undefined;
    }

    const key = battleKey || "depths-battle";
    if (!musicRef.current || musicBattleKeyRef.current !== key) {
      stopMusic();
      const src = pickRandomItem(DEPTHS_AUDIO_FILES.battleMusic);
      if (!src) return undefined;

      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = clamp(safeNumber(settings.musicVolume, DEFAULT_DEPTHS_AUDIO_SETTINGS.musicVolume), 0, 1);
      audio.preload = "auto";
      musicRef.current = audio;
      musicBattleKeyRef.current = key;
    }

    musicRef.current.volume = clamp(safeNumber(settings.musicVolume, DEFAULT_DEPTHS_AUDIO_SETTINGS.musicVolume), 0, 1);
    musicRef.current.play().catch(() => {});
    return undefined;
  }, [active, battleKey, pauseMusic, settings.music, settings.musicVolume, stopMusic]);

  useEffect(() => () => {
    stopMusic();
    stopSfx();
  }, [stopMusic, stopSfx]);

  const toggleMusic = useCallback(() => {
    setSettings((prev) => ({ ...prev, music: !prev.music }));
  }, []);

  const toggleSfx = useCallback(() => {
    setSettings((prev) => ({ ...prev, sfx: !prev.sfx }));
  }, []);

  const setMusicVolume = useCallback((volume) => {
    const nextVolume = clamp(safeNumber(volume, DEFAULT_DEPTHS_AUDIO_SETTINGS.musicVolume), 0, 1);
    setSettings((prev) => ({ ...prev, musicVolume: nextVolume }));
    if (musicRef.current) musicRef.current.volume = nextVolume;
  }, []);

  const setSfxVolume = useCallback((volume) => {
    const nextVolume = clamp(safeNumber(volume, DEFAULT_DEPTHS_AUDIO_SETTINGS.sfxVolume), 0, 1);
    setSettings((prev) => ({ ...prev, sfxVolume: nextVolume }));
    activeSfxRef.current.forEach((audio) => {
      audio.volume = clamp(safeNumber(audio.depthsBaseVolume, 1) * nextVolume, 0, 1);
    });
  }, []);

  return {
    settings,
    playSfx,
    toggleMusic,
    toggleSfx,
    setMusicVolume,
    setSfxVolume,
  };
}

function DepthsDeckCountBadge({ count = 1, compact = false }) {
  const copies = Math.max(1, Math.round(safeNumber(count, 1)));
  return (
    <Box
      sx={{
        position: "absolute",
        top: compact ? 3 : 6,
        right: compact ? 3 : 6,
        minWidth: compact ? 24 : 32,
        height: compact ? 18 : 24,
        px: compact ? 0.45 : 0.75,
        display: "grid",
        placeItems: "center",
        color: "#111",
        border: `1px solid ${THEME.gold}`,
        borderRadius: 999,
        background: THEME.gold,
        fontSize: compact ? 8 : 11,
        fontWeight: 950,
        lineHeight: 1,
        zIndex: 5,
        boxShadow: "0 0 14px rgba(225,184,100,0.24)",
      }}
    >
      x{copies}
    </Box>
  );
}

function EffectTooltipIcon({ effectKey, src, size = 22, sx, stackValue = null }) {
  const info = getArenaEffectInfo(effectKey);
  const iconSrc = src || info?.icon || EFFECT_ICON_BY_KEY[String(effectKey || "").toLowerCase()] || "";
  const totalRows = getEffectTotalRows(effectKey, stackValue);
  const hasStackTotal = safeNumber(stackValue, 0) > 0 && totalRows.length > 0;
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
          {hasStackTotal ? (
            <Typography sx={{ color: THEME.gold, fontSize: 11, fontWeight: 800, mt: 0.25 }}>
              Current stacks: {formatEffectTotalValue(stackValue).replace("+", "")}
            </Typography>
          ) : null}
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
          {hasStackTotal ? (
            <Box
              sx={{
                display: "grid",
                gap: 0.45,
                mt: 0.75,
                pt: 0.65,
                borderTop: "1px solid rgba(255,255,255,0.22)",
              }}
            >
              <Typography sx={{ color: THEME.gold, fontSize: 10, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Current Total
              </Typography>
              {totalRows.map((row, index) => (
                <Box
                  key={`${row.text}-${index}`}
                  sx={{ display: "flex", alignItems: "center", gap: 0.65 }}
                >
                  {row.icon ? (
                    <Box
                      component="img"
                      src={row.icon}
                      alt=""
                      draggable={false}
                      sx={{ width: 16, height: 16, objectFit: "contain", flex: "0 0 auto" }}
                    />
                  ) : null}
                  <Typography sx={{ fontSize: 11, lineHeight: 1.25 }}>
                    {row.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : null}
        </Box>
      }
    >
      {image}
    </Tooltip>
  );
}

function mergeNumberMaps(base = {}, incoming = {}) {
  const next = { ...(base || {}) };
  Object.entries(incoming || {}).forEach(([key, value]) => {
    next[key] = safeNumber(next[key], 0) + safeNumber(value, 0);
  });
  return next;
}

function buildDepthsRunAbilityRuntime(abilities = []) {
  const statBonuses = {};
  const moveAccuracy = {};
  const battleOnly = [];
  const depthsAbilityMeta = {
    lifeStealPct: 0,
    lowHpDamage: null,
    secondWind: null,
  };

  asArray(abilities).forEach((ability) => {
    Object.assign(statBonuses, mergeNumberMaps(statBonuses, ability?.statBonuses || {}));
    Object.assign(moveAccuracy, mergeNumberMaps(moveAccuracy, ability?.moveAccuracy || {}));
    asArray(ability?.battleOnly).forEach((entry) => {
      battleOnly.push({
        ...entry,
        sourceName: entry.sourceName || ability.name,
        sourceAbilityId: entry.sourceAbilityId || ability.id,
      });
    });

    const meta = ability?.depthsAbilityMeta || {};
    depthsAbilityMeta.lifeStealPct += safeNumber(meta.lifeStealPct, 0);
    if (meta.lowHpDamage) {
      const current = depthsAbilityMeta.lowHpDamage;
      depthsAbilityMeta.lowHpDamage = {
        thresholdPct: Math.max(
          safeNumber(current?.thresholdPct, 0),
          safeNumber(meta.lowHpDamage.thresholdPct, 0)
        ),
        flatDamage:
          safeNumber(current?.flatDamage, 0) + safeNumber(meta.lowHpDamage.flatDamage, 0),
      };
    }
    if (meta.secondWind) {
      const current = depthsAbilityMeta.secondWind;
      depthsAbilityMeta.secondWind = {
        thresholdPct: Math.max(
          safeNumber(current?.thresholdPct, 0),
          safeNumber(meta.secondWind.thresholdPct, 0)
        ),
        healPct: safeNumber(current?.healPct, 0) + safeNumber(meta.secondWind.healPct, 0),
        shield: safeNumber(current?.shield, 0) + safeNumber(meta.secondWind.shield, 0),
      };
    }
  });

  return { statBonuses, moveAccuracy, battleOnly, depthsAbilityMeta };
}

function getDepthsRunAbilityKey(ability = {}) {
  return `${ability.id || ability.name || ""}:${safeNumber(ability.level, 1)}`;
}

function getDepthsRunArtifactKey(artifact = {}) {
  return `${artifact.id || artifact.name || ""}:${safeNumber(artifact.room, 1)}`;
}

function hasSameDepthsRunAbilities(sourceCharObj = {}, runAbilities = []) {
  const current = asArray(sourceCharObj.depthsRunAbilities).map(getDepthsRunAbilityKey).sort();
  const incoming = asArray(runAbilities).map(getDepthsRunAbilityKey).sort();
  if (!incoming.length || current.length !== incoming.length) return false;
  return incoming.every((key, index) => key === current[index]);
}

function hasSameDepthsRunArtifacts(sourceCharObj = {}, runArtifacts = []) {
  const current = asArray(sourceCharObj.depthsRunArtifacts).map(getDepthsRunArtifactKey).sort();
  const incoming = asArray(runArtifacts).map(getDepthsRunArtifactKey).sort();
  if (!incoming.length || current.length !== incoming.length) return false;
  return incoming.every((key, index) => key === current[index]);
}

function getBattleOnlyRuntimeKey(entry = {}) {
  return [
    entry.sourceAbilityId || "",
    entry.sourceArtifactId || "",
    entry.type || "",
    entry.attackType || "",
    entry.effectKey || "",
    entry.sourceEffectKey || "",
    safeNumber(entry.amount, 0),
    entry.resistedEffect || "",
  ].join("|");
}

function mergeBattleOnlyRuntimeEntries(baseEntries = [], runtimeEntries = []) {
  const seen = new Set();
  const rows = [];

  [...asArray(baseEntries), ...asArray(runtimeEntries)].forEach((entry) => {
    if (!entry) return;
    const key = getBattleOnlyRuntimeKey(entry);
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(entry);
  });

  return rows;
}

function mergeMoveAccuracyRuntime(base = {}, runtime = {}) {
  const next = { ...(base || {}) };
  Object.entries(runtime || {}).forEach(([key, value]) => {
    const incoming = safeNumber(value, 0);
    const current = safeNumber(next[key], 0);
    next[key] = Math.max(current, incoming);
  });
  return next;
}

function hasAnyDepthsAbilityMeta(meta = {}) {
  return (
    safeNumber(meta.lifeStealPct, 0) > 0 ||
    Boolean(meta.lowHpDamage) ||
    Boolean(meta.secondWind)
  );
}

function mergeDepthsAbilityMetaRuntime(base = {}, incoming = {}) {
  const next = {
    lifeStealPct: safeNumber(base.lifeStealPct, 0) + safeNumber(incoming.lifeStealPct, 0),
    lowHpDamage: base.lowHpDamage || null,
    secondWind: base.secondWind || null,
  };

  if (incoming.lowHpDamage) {
    next.lowHpDamage = {
      thresholdPct: Math.max(
        safeNumber(next.lowHpDamage?.thresholdPct, 0),
        safeNumber(incoming.lowHpDamage.thresholdPct, 0)
      ),
      flatDamage:
        safeNumber(next.lowHpDamage?.flatDamage, 0) +
        safeNumber(incoming.lowHpDamage.flatDamage, 0),
    };
  }

  if (incoming.secondWind) {
    next.secondWind = {
      thresholdPct: Math.max(
        safeNumber(next.secondWind?.thresholdPct, 0),
        safeNumber(incoming.secondWind.thresholdPct, 0)
      ),
      healPct:
        safeNumber(next.secondWind?.healPct, 0) +
        safeNumber(incoming.secondWind.healPct, 0),
      shield:
        safeNumber(next.secondWind?.shield, 0) +
        safeNumber(incoming.secondWind.shield, 0),
    };
  }

  return next;
}

function mergeArtifactMetaRuntime(base = {}, incoming = {}) {
  return {
    damageDealtPct:
      safeNumber(base.damageDealtPct, 0) + safeNumber(incoming.damageDealtPct, 0),
    damageTakenPct:
      safeNumber(base.damageTakenPct, 0) + safeNumber(incoming.damageTakenPct, 0),
    healingDonePct:
      safeNumber(base.healingDonePct, 0) + safeNumber(incoming.healingDonePct, 0),
    damageBonusFlat:
      safeNumber(base.damageBonusFlat, 0) + safeNumber(incoming.damageBonusFlat, 0),
    healOnKillPct:
      safeNumber(base.healOnKillPct, 0) + safeNumber(incoming.healOnKillPct, 0),
    firstBuffNoCooldown: Boolean(base.firstBuffNoCooldown || incoming.firstBuffNoCooldown),
    firstDamageNoCooldown: Boolean(base.firstDamageNoCooldown || incoming.firstDamageNoCooldown),
    effectPotencyBonus: mergeNumberMaps(base.effectPotencyBonus || {}, incoming.effectPotencyBonus || {}),
  };
}

function ensureDepthsRunRuntime(sourceCharObj = {}, runArtifacts = []) {
  const artifacts = asArray(runArtifacts);
  if (!artifacts.length) return sourceCharObj || {};

  const artifactRuntime = buildDepthsArtifactRuntime(artifacts);
  const runtime = {
    statBonuses: artifactRuntime.statBonuses || {},
    moveAccuracy: artifactRuntime.moveAccuracy || {},
    battleOnly: [...asArray(artifactRuntime.battleOnly)],
    depthsAbilityMeta: mergeDepthsAbilityMetaRuntime({}, artifactRuntime.depthsAbilityMeta || {}),
    artifactMeta: artifactRuntime.artifactMeta || {},
  };
  const alreadyApplied = !artifacts.length || hasSameDepthsRunArtifacts(sourceCharObj, artifacts);
  const next = {
    ...(sourceCharObj || {}),
    depthsRunArtifacts: artifacts,
  };

  if (!alreadyApplied) {
    next.statBonuses = mergeNumberMaps(sourceCharObj.statBonuses || {}, runtime.statBonuses);
  }

  next.gainedEffectsMeta = {
    ...(sourceCharObj.gainedEffectsMeta || {}),
    moveAccuracy: mergeMoveAccuracyRuntime(
      sourceCharObj.gainedEffectsMeta?.moveAccuracy || {},
      runtime.moveAccuracy
    ),
    battleOnly: mergeBattleOnlyRuntimeEntries(
      sourceCharObj.gainedEffectsMeta?.battleOnly || [],
      runtime.battleOnly
    ),
  };
  next.depthsAbilityMeta = hasAnyDepthsAbilityMeta(runtime.depthsAbilityMeta)
    ? runtime.depthsAbilityMeta
    : sourceCharObj.depthsAbilityMeta || {};
  next.depthsArtifactMeta = alreadyApplied
    ? sourceCharObj.depthsArtifactMeta || runtime.artifactMeta || {}
    : mergeArtifactMetaRuntime(sourceCharObj.depthsArtifactMeta || {}, runtime.artifactMeta || {});

  return next;
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

async function postDepthsState(payload) {
  const response = await fetch("/api/arena/depthsState", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cleanForFirestore(payload)),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || `Depths state API failed with status ${response.status}`);
  }
  return body;
}

function getFramesFromCandidates(candidates, fallbackSrc) {
  for (const candidate of candidates) {
    const frames = Array.isArray(candidate)
      ? candidate.filter((src) => typeof src === "string" && src.trim()).slice(0, 4)
      : [];
    if (frames.length) return frames;
  }
  return fallbackSrc ? [fallbackSrc] : [];
}

function getIdleFrames(entity) {
  return getFramesFromCandidates(
    [
      entity?.idleFrames,
      entity?.animation?.idle?.frameUrls,
      entity?.animation?.idle?.frames,
    ],
    entity?.standingUrl || entity?.imageUrl || entity?.fallbackImageUrl
  );
}

function getMoveCharacterFrames(move) {
  return getFramesFromCandidates(
    [
      move?.casterAnimation?.frameUrls,
      move?.animationFrames,
      move?.animationMeta?.frameUrls,
      move?.characterFrames,
      move?.characterAnimation?.frameUrls,
    ],
    move?.characterUrl || move?.casterAnimation?.sheetUrl
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
    move?.effectUrl || move?.visualUrl || move?.moveVisualUrl || move?.effectAnimation?.sheetUrl
  );
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

function isBuffMove(move = {}) {
  const explicitKind = getMoveClass(move?.type) || getMoveClass(move?.category);
  if (explicitKind) return explicitKind === "buff";

  const power = Number(move.power);
  if (Number.isFinite(power) && power <= 0) return true;

  const text = [move.effect, move.trait, move.description, move.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("buff") ||
    text.includes("boost") ||
    text.includes("increase") ||
    text.includes("regen") ||
    text.includes("heal") ||
    text.includes("shield") ||
    text.includes("protect")
  );
}

function isCurseMove(move = {}) {
  const explicitKind = getMoveClass(move?.type) || getMoveClass(move?.category);
  if (explicitKind) return explicitKind === "curse";

  const text = [move.effect, move.trait, move.description, move.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return text.includes("curse") || text.includes("hex") || text.includes("mark");
}

function getExplicitMoveKind(move = {}, fallbackKind = null) {
  const explicitTypeKind = getMoveClass(move?.type) || getMoveClass(move?.category);
  if (explicitTypeKind) return explicitTypeKind;

  const fallback = String(fallbackKind || "").toLowerCase();
  if (["damage", "curse", "buff"].includes(fallback)) return fallback;

  if (isCurseMove(move)) return "curse";
  if (isBuffMove(move)) return "buff";
  return "damage";
}

function getMoveScalingStatKey(moveType) {
  const range = getMoveRange(moveType);
  if (range === "melee") return "strength";
  if (range === "ranged") return "dexterity";
  if (range === "magic") return "intelligence";
  return null;
}

function getMoveStatScaledBonus(moveType, statValue, fallbackMoveKind = null) {
  const moveClass = getMoveClass(moveType) || fallbackMoveKind;
  const n = safeNumber(statValue, 0);

  if (moveClass === "damage") return n;
  if (moveClass === "curse" || moveClass === "buff") return Math.floor(n / 2);
  return 0;
}

function getMoveStatScalingLabel(moveType, statKey, fallbackMoveKind = null) {
  const moveClass = getMoveClass(moveType) || fallbackMoveKind;

  if (!statKey) return "from adjustments";
  if (moveClass === "damage") return `from adjusted ${statKey} x1`;
  if (moveClass === "curse" || moveClass === "buff") {
    return `from floor(adjusted ${statKey} / 2)`;
  }

  return "from adjustments";
}

function getComparisonColor(finalValue, baseValue) {
  if (finalValue > baseValue) return THEME.good;
  if (finalValue < baseValue) return THEME.bad;
  return THEME.text;
}

function getDeltaColor(value) {
  if (value > 0) return THEME.good;
  if (value < 0) return THEME.bad;
  return THEME.text;
}

function formatSignedFixed(value, decimals = 1) {
  const n = safeNumber(value, 0);
  if (n > 0) return `+${n.toFixed(decimals)}`;
  if (n < 0) return n.toFixed(decimals);
  return (0).toFixed(decimals);
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

function getMovePreviewLayout(moveType) {
  const moveClass = getMoveClass(moveType);
  const range = getMoveRange(moveType);

  if (moveClass === "buff") return "buff";
  if (range === "melee") return "melee";
  return "projectile";
}

function getMovePowerBreakdown(move, fighter) {
  const upgradeMeta = getMoveCardUpgradeMeta(move);
  const cardPower = safeNumber(move?.power ?? move?.basePower, 0);
  const hasPowerUpgradeMeta =
    asArray(upgradeMeta.powerUpgradeSteps).length > 0 ||
    typeof upgradeMeta.powerBaseBeforeUpgrades !== "undefined" ||
    typeof move?.powerBaseBeforeUpgrades !== "undefined" ||
    typeof move?.basePowerBeforeUpgrades !== "undefined";
  const basePower = hasPowerUpgradeMeta
    ? safeNumber(
        upgradeMeta.powerBaseBeforeUpgrades ??
          move?.powerBaseBeforeUpgrades ??
          move?.basePowerBeforeUpgrades ??
          move?.basePower ??
          cardPower,
        cardPower
      )
    : cardPower;
  const statKey = getMoveScalingStatKey(move?.type);
  const moveKind = getExplicitMoveKind(move);
  const actorMeta = getDepthsArtifactMeta(fighter);
  const appliesDamagePassives = moveKind === "damage" || moveKind === "curse";
  const damageBonusFlat = appliesDamagePassives ? safeNumber(actorMeta.damageBonusFlat, 0) : 0;
  const damageDealtPct = appliesDamagePassives ? safeNumber(actorMeta.damageDealtPct, 0) : 0;
  const healingDonePct = moveKind === "buff" ? safeNumber(actorMeta.healingDonePct, 0) : 0;

  const baseStatValue = statKey ? safeNumber(fighter?.stats?.[statKey], 0) : 0;
  const adjustedStats = computeAttackerAdjustedStats(fighter?.stats || {}, fighter?.effects || {});
  const finalStatValue = statKey ? safeNumber(adjustedStats?.[statKey], baseStatValue) : 0;
  const statBonus = statKey
    ? getMoveStatScaledBonus(move?.type, finalStatValue, moveKind)
    : 0;
  const powerUpgradeBonus = hasPowerUpgradeMeta ? cardPower - basePower : 0;
  const statAdjustedValue = cardPower + statBonus;
  let finalValue = statAdjustedValue;

  if (damageBonusFlat || damageDealtPct) {
    finalValue = (finalValue + damageBonusFlat) * Math.max(0, 1 + damageDealtPct / 100);
  }
  if (healingDonePct) {
    finalValue *= Math.max(0, 1 + healingDonePct / 100);
  }

  const hasPassiveModifier = Boolean(damageBonusFlat || damageDealtPct || healingDonePct);
  if (hasPassiveModifier) finalValue = roundToTenth(finalValue);

  return {
    baseValue: basePower,
    upgradedPower: cardPower,
    powerUpgradeBonus,
    powerUpgradeSteps: hasPowerUpgradeMeta ? asArray(upgradeMeta.powerUpgradeSteps) : [],
    finalValue,
    statAdjustedValue,
    statBonus,
    statValue: finalStatValue,
    baseStatValue,
    statKey,
    moveKind,
    passiveBonus: finalValue - statAdjustedValue,
    damageBonusFlat,
    damageDealtPct,
    healingDonePct,
    outputLabel: moveKind === "buff" ? "healing" : "power",
  };
}

function getMovePowerBreakdownRows(power = {}, move = {}) {
  const rows = [];

  if (safeNumber(power.powerUpgradeBonus, 0)) {
    const stepText = asArray(power.powerUpgradeSteps).length
      ? asArray(power.powerUpgradeSteps)
          .map((step) => {
            const delta = safeNumber(
              step?.delta,
              safeNumber(step?.after, 0) - safeNumber(step?.before, 0)
            );
            return `${step?.name || "Upgrade"} ${formatSignedDisplayNumber(delta)}`;
          })
          .join(", ")
      : "card upgrades";

    rows.push({
      key: "card-upgrades",
      value: power.powerUpgradeBonus,
      label: `from ${stepText}`,
    });
  }

  if (safeNumber(power.statBonus, 0)) {
    rows.push({
      key: "stat",
      value: power.statBonus,
      label: getMoveStatScalingLabel(move.type, power.statKey, power.moveKind),
    });
  }

  const passiveParts = [];
  if (power.damageBonusFlat) {
    passiveParts.push(`${formatSignedDisplayNumber(power.damageBonusFlat)} flat damage`);
  }
  if (power.damageDealtPct) {
    passiveParts.push(`${formatSignedDisplayNumber(power.damageDealtPct)}% damage`);
  }
  if (power.healingDonePct) {
    passiveParts.push(`${formatSignedDisplayNumber(power.healingDonePct)}% healing`);
  }

  if (passiveParts.length) {
    rows.push({
      key: "passives",
      value: power.passiveBonus,
      label: `passives: ${passiveParts.join(", ")}`,
    });
  }

  return rows;
}

function getMoveAccuracyBreakdown(move, fighter) {
  const upgradeMeta = getMoveCardUpgradeMeta(move);
  const cardAccuracy = safeNumber(move?.accuracy, 0);
  const hasAccuracyUpgradeMeta =
    asArray(upgradeMeta.accuracyUpgradeSteps).length > 0 ||
    typeof upgradeMeta.accuracyBaseBeforeUpgrades !== "undefined" ||
    typeof move?.accuracyBaseBeforeUpgrades !== "undefined" ||
    typeof move?.baseAccuracyBeforeUpgrades !== "undefined";
  const baseValue = hasAccuracyUpgradeMeta
    ? safeNumber(
        upgradeMeta.accuracyBaseBeforeUpgrades ??
          move?.accuracyBaseBeforeUpgrades ??
          move?.baseAccuracyBeforeUpgrades ??
          cardAccuracy,
        cardAccuracy
      )
    : cardAccuracy;
  const moveAccuracy = fighter?.gainedEffectsMeta?.moveAccuracy || {};
  const range = getMoveRange(move?.type);
  const moveKind = getExplicitMoveKind(move);
  const accuracyUpgradeBonus = hasAccuracyUpgradeMeta ? cardAccuracy - baseValue : 0;
  const accuracyUpgradeSteps = hasAccuracyUpgradeMeta ? asArray(upgradeMeta.accuracyUpgradeSteps) : [];
  const accuracyUpgradeLabel = accuracyUpgradeSteps.length
    ? accuracyUpgradeSteps
        .map((step) => {
          const delta = safeNumber(
            step?.delta,
            safeNumber(step?.after, 0) - safeNumber(step?.before, 0)
          );
          return `${step?.name || "Upgrade"} ${formatSignedDisplayNumber(delta)}`;
        })
        .join(", ")
    : accuracyUpgradeBonus
    ? "card upgrades"
    : "";
  const statusAccuracyBonus = safeNumber(
    computeAttackerStatAdjustments(fighter?.effects || {}).accuracyAdj,
    0
  );
  const characterMoveAccuracyBonus = safeNumber(fighter?.stats?.accuracy, 0);
  const typeAccuracyBonus = safeNumber(range ? moveAccuracy[range] : 0, 0);
  const curseAccuracyBonus = safeNumber(moveKind === "curse" ? moveAccuracy.curse : 0, 0);
  const allAccuracyBonus = safeNumber(moveAccuracy.all, 0);
  const finalValue = clamp(
    cardAccuracy +
      characterMoveAccuracyBonus +
      statusAccuracyBonus +
      typeAccuracyBonus +
      curseAccuracyBonus +
      allAccuracyBonus,
    0,
    100
  );

  return {
    baseValue,
    cardAccuracy,
    accuracyUpgradeBonus,
    accuracyUpgradeSteps,
    accuracyUpgradeLabel,
    characterMoveAccuracyBonus,
    statusAccuracyBonus,
    typeAccuracyBonus,
    curseAccuracyBonus,
    allAccuracyBonus,
    finalValue,
  };
}

function getBaseCoreStatValue(charObj, statKey) {
  const rawBase = charObj?.baseStats?.[statKey];
  if (rawBase !== null && typeof rawBase !== "undefined") return safeNumber(rawBase, 0);

  if (statKey === "health") {
    return safeNumber(charObj?.baseHealth ?? 200, safeNumber(charObj?.health, 200));
  }
  if (statKey === "speed") {
    return safeNumber(charObj?.baseSpeed ?? 50, safeNumber(charObj?.speed, 50));
  }
  if (statKey === "resist") {
    return safeNumber(charObj?.baseResist ?? 10, safeNumber(charObj?.resist, 10));
  }

  return safeNumber(charObj?.[statKey], 0);
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
    STAT_KEYS.forEach((key) => {
      bonuses[key] += safeNumber(source[key], 0);
    });
  });

  return bonuses;
}

function buildRuntimeStatsFromCharObj(charObj) {
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
    critChance: safeNumber(charObj?.critChance, 25) + bonuses.critChance,
    critDamage: safeNumber(charObj?.critDamage, 200) + bonuses.critDamage,
  };
}

function getEffect(effects, key) {
  const n = Number(effects?.[key] ?? effects?.[String(key).toLowerCase()] ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function computeAttackerStatAdjustments(effects = {}) {
  const get = (name) => Number(effects?.[name] || 0);
  let strengthAdj = 0;
  let dexterityAdj = 0;
  let intelligenceAdj = 0;
  let accuracyAdj = 0;
  let speedAdj = 0;
  let critChanceAdj = 0;

  const bleed = get("bleed");
  if (bleed) strengthAdj -= bleed * 0.1;

  const burn = get("burn");
  if (burn) {
    intelligenceAdj -= burn * 0.1;
    strengthAdj += burn * 0.1;
    speedAdj += burn * 0.2;
  }

  const freeze = get("freeze");
  if (freeze) {
    dexterityAdj -= freeze * 0.4;
    speedAdj -= freeze * 0.4;
  }

  const slow = get("slow");
  if (slow) {
    dexterityAdj -= slow * 0.2;
    speedAdj -= slow * 0.6;
  }

  const paralyze = get("paralyze");
  if (paralyze) {
    accuracyAdj -= paralyze * 0.2;
    speedAdj -= paralyze * 0.4;
  }

  const drown = get("drown");
  if (drown) {
    dexterityAdj -= drown * 0.6;
    accuracyAdj -= drown * 0.2;
  }

  const doom = get("doom");
  if (doom) strengthAdj += doom * 0.2;

  const strengthen = get("strengthen");
  if (strengthen) strengthAdj += strengthen * 0.5;

  const empower = get("empower");
  if (empower) {
    strengthAdj += empower * 0.2;
    intelligenceAdj += empower * 0.4;
  }

  const hasten = get("hasten");
  if (hasten) {
    dexterityAdj += hasten * 0.3;
    speedAdj += hasten * 0.4;
  }

  const bless = get("bless");
  if (bless) {
    strengthAdj += bless * 0.3;
    intelligenceAdj += bless * 0.3;
  }

  const focus = get("focus");
  if (focus) {
    accuracyAdj += focus * 0.5;
    critChanceAdj += focus * 0.4;
  }

  return {
    strengthAdj,
    dexterityAdj,
    intelligenceAdj,
    accuracyAdj,
    speedAdj,
    critChanceAdj,
  };
}

function computeAttackerAdjustedStats(baseStats, effects) {
  const adjustments = computeAttackerStatAdjustments(effects || {});
  const adjustedDexterity = clamp(
    safeNumber(baseStats?.dexterity, 0) + adjustments.dexterityAdj,
    0,
    999
  );

  return {
    strength: clamp(safeNumber(baseStats?.strength, 0) + adjustments.strengthAdj, 0, 999),
    dexterity: adjustedDexterity,
    intelligence: clamp(
      safeNumber(baseStats?.intelligence, 0) + adjustments.intelligenceAdj,
      0,
      999
    ),
    speed: clamp(
      safeNumber(baseStats?.speed, 0) + adjustments.dexterityAdj + adjustments.speedAdj,
      0,
      999
    ),
    accScale: clamp(1 + adjustments.accuracyAdj, 0.1, 2),
    critChance: clamp(safeNumber(baseStats?.critChance, 25) + adjustments.critChanceAdj, 0, 100),
  };
}

function computeDefenderAdjustedStats(baseStats, effects) {
  const bless = getEffect(effects, "bless");
  const doom = getEffect(effects, "doom");
  const resist = safeNumber(baseStats?.resist, 0) + bless * 0.1 - doom * 0.4;
  return { resist };
}

function computeDefenderResistChance(baseStats, effects) {
  return clamp(computeDefenderAdjustedStats(baseStats, effects).resist || 0, 0, 100);
}

function computeOngoingEffectHpDelta(effects = {}) {
  let delta = 0;
  const bleed = getEffect(effects, "bleed");
  if (bleed) delta -= bleed * 0.2;
  const burn = getEffect(effects, "burn");
  if (burn) delta -= burn * 0.2;
  const poison = getEffect(effects, "poison");
  if (poison) delta -= poison * 0.3;
  const doom = getEffect(effects, "doom");
  if (doom) delta -= doom * 0.1;
  const nurture = getEffect(effects, "nurture");
  if (nurture) delta += nurture * 0.2;
  return delta;
}

function getEffectiveSpeed(stats, effectTotals) {
  const adjusted = computeAttackerAdjustedStats(stats, effectTotals);
  return Math.max(1, safeNumber(adjusted?.speed ?? stats?.speed, 50));
}

function computeEffectiveCooldownSeconds(baseCooldownSeconds, speed) {
  const base = Number(baseCooldownSeconds);
  if (!Number.isFinite(base) || base <= 0) return 0;
  return base * (50 / Math.max(1, Number(speed) || 1));
}

function calcDamageRPG({ movePower, category, moveKind = null, attackerStats, attackerEffects, defenderEffects }) {
  const adjAtk = computeAttackerAdjustedStats(attackerStats, attackerEffects);
  const statKey = getMoveScalingStatKey(category);
  const adjustedStatValue = statKey
    ? safeNumber(adjAtk?.[statKey], safeNumber(attackerStats?.[statKey], 0))
    : 0;

  let dmg = safeNumber(movePower, 0) + getMoveStatScaledBonus(category, adjustedStatValue, moveKind);
  const shieldStacks = getEffect(defenderEffects, "shield");

  if (shieldStacks > 0 && (getMoveRange(category) === "melee" || getMoveRange(category) === "ranged")) {
    dmg = Math.max(0, dmg - shieldStacks * 0.5);
  }

  return { dmg };
}

function getMoveCardUpgradeMeta(move = {}) {
  return move?.depthsCardUpgradeMeta || {};
}

function getMoveRepeatCount(move = {}) {
  return clamp(Math.round(safeNumber(getMoveCardUpgradeMeta(move).repeatCount, 1)), 1, 4);
}

function moveHitsAllValidTargets(move = {}) {
  const targetKey = getMoveDeclaredTargetKey(move);
  return Boolean(getMoveCardUpgradeMeta(move).multiTarget) || targetKey === "enemies" || targetKey === "allies";
}

function rollCritical(actor, move = null) {
  const effectAdjustments = computeAttackerStatAdjustments(actor?.effects || {});
  const cardCritBonus = safeNumber(getMoveCardUpgradeMeta(move).critChanceBonus, 0);
  const critChance = clamp(
    safeNumber(actor?.stats?.critChance, 25) +
      safeNumber(effectAdjustments.critChanceAdj, 0) +
      cardCritBonus,
    0,
    100
  );
  return critChance > 0 && Math.random() * 100 < critChance;
}

function applyCriticalDamage(damage, actor, isCritical) {
  if (!isCritical) return damage;
  const critDamagePercent = Math.max(0, safeNumber(actor?.stats?.critDamage, 200));
  return damage * (critDamagePercent / 100);
}

function consumeCleanseFromNegatives(bucket, cleanseAmount) {
  let remaining = Math.max(0, Number(cleanseAmount) || 0);
  if (!remaining) return { removedTotal: 0, removedByEffect: {}, remainingCleanse: 0 };

  const entries = Object.keys(bucket)
    .filter((key) => NEGATIVE_EFFECT_KEYS.has(key) && getEffect(bucket, key) > 0)
    .map((key) => ({ key, value: getEffect(bucket, key) }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));

  if (!entries.length) {
    return { removedTotal: 0, removedByEffect: {}, remainingCleanse: remaining };
  }

  const removedByEffect = {};
  let removedTotal = 0;

  for (const entry of entries) {
    if (remaining <= 0) break;
    const take = Math.min(entry.value, remaining);
    const next = entry.value - take;
    if (next > 0) bucket[entry.key] = next;
    else delete bucket[entry.key];
    removedByEffect[entry.key] = (removedByEffect[entry.key] || 0) + take;
    removedTotal += take;
    remaining -= take;
  }

  return { removedTotal, removedByEffect, remainingCleanse: remaining };
}

function consumeCleanseGuardForNegativeApplication(bucket, incomingAmount) {
  const appliedIncomingAmount = Math.max(0, Number(incomingAmount) || 0);
  const cleanseGuard = getEffect(bucket, "cleanse");
  if (!appliedIncomingAmount || cleanseGuard <= 0) {
    return {
      appliedAmount: appliedIncomingAmount,
      blockedAmount: 0,
      remainingCleanse: Math.max(0, cleanseGuard),
    };
  }

  const blockedAmount = Math.min(cleanseGuard, appliedIncomingAmount);
  const remainingCleanse = cleanseGuard - blockedAmount;
  const appliedAmount = appliedIncomingAmount - blockedAmount;

  if (remainingCleanse > 0) bucket.cleanse = remainingCleanse;
  else delete bucket.cleanse;

  return { appliedAmount, blockedAmount, remainingCleanse };
}

function isChampionStartingMove(move = {}) {
  return move?.sourceRole === "champion" && move?.depthsCardSource !== "firebase";
}

function moveUsesCharacterEffectPotency(move = {}) {
  return isDepthsCardMove(move) || isChampionStartingMove(move);
}

function getMoveEffectBasePotency(move) {
  const effectName = String(move?.effect_name || move?.effect || "").trim();
  if (!effectName) return 0;

  const key = effectName.toLowerCase();
  let potency = safeNumber(move?.effect_potency_base ?? move?.effect_potency, 0);
  if (isChampionStartingMove(move)) {
    potency = 0;
  } else if (move?.sourceCharObj && key && move?.depthsCardSource !== "firebase") {
    potency = safeNumber(move.sourceCharObj[key], potency);
  }
  const upgradeMeta = getMoveCardUpgradeMeta(move);
  potency += safeNumber(upgradeMeta.effectPotencyBonus, 0);
  potency *= safeNumber(upgradeMeta.effectPotencyMultiplier, 1);
  return Math.max(0, potency);
}

function getMoveRawEffectBasePotency(move) {
  const effectName = String(move?.effect_name || move?.effect || "").trim();
  if (!effectName) return 0;

  const key = effectName.toLowerCase();
  let potency = safeNumber(move?.effect_potency_base ?? move?.effect_potency, 0);
  if (isChampionStartingMove(move)) {
    potency = 0;
  } else if (move?.sourceCharObj && key && move?.depthsCardSource !== "firebase") {
    potency = safeNumber(move.sourceCharObj[key], potency);
  }
  return Math.max(0, potency);
}

function getMoveEffectUpgradeAmount(move, baseAmount = 0) {
  const upgradeMeta = getMoveCardUpgradeMeta(move);
  const upgradedAmount = Math.max(
    0,
    (safeNumber(baseAmount, 0) + safeNumber(upgradeMeta.effectPotencyBonus, 0)) *
      safeNumber(upgradeMeta.effectPotencyMultiplier, 1)
  );

  return {
    upgradedAmount,
    upgradeBonus: upgradedAmount - safeNumber(baseAmount, 0),
  };
}

function isDepthsCardMove(move = {}) {
  return move?.depthsCardSource === "firebase";
}

function getMoveCharacterEffectPotency(move, actor, effectKey) {
  if (!actor || !effectKey) return 0;
  return safeNumber(actor?.effectPotencies?.[effectKey], 0);
}

function getMoveEffectPotencyAddOn(move, actor, effectKey, moveKind = null) {
  if (!actor || !effectKey) return 0;
  const resolvedKind = moveKind || getExplicitMoveKind(move);
  const characterPotency = getMoveCharacterEffectPotency(move, actor, effectKey);
  const characterMultiplier =
    resolvedKind === "buff" || resolvedKind === "curse" ? 2 : 1;

  return (
    (moveUsesCharacterEffectPotency(move) ? characterPotency * characterMultiplier : 0) +
    getArtifactEffectPotencyBonus(actor, effectKey)
  );
}

function getMoveAppliedEffectAmount(move, actor = null, moveKind = null) {
  const effectName = String(move?.effect_name || move?.effect || "").trim();
  if (!effectName || effectName.toLowerCase() === "none") return 0;

  const effectKey = effectName.toLowerCase();
  const resolvedKind = moveKind || getExplicitMoveKind(move);
  const basePotency = getMoveEffectBasePotency(move);
  const potencyAddOn = getMoveEffectPotencyAddOn(move, actor, effectKey, resolvedKind);
  if (moveUsesCharacterEffectPotency(move)) {
    return Math.max(0, basePotency + potencyAddOn);
  }

  const legacyAmount = resolvedKind === "buff" || resolvedKind === "curse"
    ? basePotency * 2
    : basePotency;
  return Math.max(
    0,
    legacyAmount + potencyAddOn
  );
}

function getMoveCooldown(move) {
  return Math.max(0.1, safeNumber(move?.cooldown_seconds ?? move?.cooldown, 3));
}

function getMoveDeckCopies(move = {}) {
  return Math.max(
    0,
    Math.round(safeNumber(move.deckCopies, move.depthsCardSource === "firebase" ? 1 : 2))
  );
}

function getMoveAccuracy(move, actor) {
  const attackerAdjustments = computeAttackerStatAdjustments(actor?.effects || {});
  return clamp(
    safeNumber(move?.accuracy, 0) +
      safeNumber(actor?.stats?.accuracy, 0) +
      safeNumber(attackerAdjustments.accuracyAdj, 0) +
      getMoveAccuracyBonusFromGainedEffects(move, actor),
    0,
    100
  );
}

function getMoveTargetSide(move, actorSide) {
  return getExplicitMoveKind(move) === "buff" ? actorSide : actorSide === "A" ? "B" : "A";
}

function getEffectTargetKey(target) {
  const value = String(target || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (["enemy", "enemies", "ally", "allies", "self"].includes(value)) return value;
  if (["all_enemy", "all_enemies"].includes(value)) return "enemies";
  if (["all_ally", "all_allies"].includes(value)) return "allies";
  if (["single_enemy", "one_enemy"].includes(value)) return "enemy";
  if (["single_ally", "one_ally"].includes(value)) return "ally";
  if (value === "target") return "target";
  return "";
}

function getMoveDeclaredTargetKey(move = {}) {
  const directTarget = getEffectTargetKey(move.target || move.targetType || move.targeting);
  if (directTarget && directTarget !== "target") return directTarget;

  const primaryEffectTarget = getEffectTargetKey(asArray(move.effects)[0]?.target);
  if (primaryEffectTarget && primaryEffectTarget !== "target") return primaryEffectTarget;

  const effectTargets = asArray(move.effects)
    .map((effect) => getEffectTargetKey(effect?.target))
    .filter((target) => target && target !== "target");

  if (effectTargets.includes("enemies")) return "enemies";
  if (effectTargets.includes("allies")) return "allies";
  if (effectTargets.includes("self")) return "self";
  if (effectTargets.includes("enemy")) return "enemy";
  if (effectTargets.includes("ally")) return "ally";
  return "";
}

function getEffectTargetLabel(target, move = {}) {
  const key = getEffectTargetKey(target);
  const moveKind = getExplicitMoveKind(move);
  const fallback = moveKind === "buff" ? "ally" : "enemy";
  const effectiveKey = key === "target" || !key ? fallback : key;

  if (effectiveKey === "self") return "self";
  if (effectiveKey === "enemies") return "all enemies";
  if (effectiveKey === "allies") return "all allies";
  if (effectiveKey === "ally") return "single ally";
  return "single enemy";
}

function pluralizeTargetKey(target, move = {}) {
  const key = getEffectTargetKey(target) || (getExplicitMoveKind(move) === "buff" ? "ally" : "enemy");
  if (key === "enemy") return "enemies";
  if (key === "ally") return "allies";
  return key;
}

function getMoveTargetLabel(move = {}) {
  const primaryTarget = getMoveDeclaredTargetKey(move) || asArray(move.effects)[0]?.target;
  const targetKey = moveHitsAllValidTargets(move)
    ? pluralizeTargetKey(primaryTarget, move)
    : primaryTarget || (getExplicitMoveKind(move) === "buff" ? "ally" : "enemy");

  return getEffectTargetLabel(targetKey, move);
}

function getSecondaryEffectDisplayAmount(move, fighter, effectKey, amount) {
  return Math.max(
    0,
    safeNumber(amount, 0) +
      getMoveEffectPotencyAddOn(move, fighter, String(effectKey || "").toLowerCase(), getExplicitMoveKind(move))
  );
}

function getMoveEffectDisplayRows(move = {}, fighter = null) {
  const rows = [];
  const seen = new Set();
  const baseEffects = asArray(move.effects);
  const primaryEffectKey = String(move.effect || move.effect_name || "").toLowerCase();

  if (primaryEffectKey && primaryEffectKey !== "none") {
    const primaryTarget = baseEffects[0]?.target || (getExplicitMoveKind(move) === "buff" ? "ally" : "enemy");
    const baseAmount = getMoveRawEffectBasePotency(move);
    const upgrade = getMoveEffectUpgradeAmount(move, baseAmount);
    const finalAmount = getMoveAppliedEffectAmount(move, fighter, getExplicitMoveKind(move));
    rows.push({
      key: `primary-${primaryEffectKey}`,
      effectKey: primaryEffectKey,
      amount: finalAmount,
      baseAmount,
      upgradeBonus: upgrade.upgradeBonus,
      potencyBonus: finalAmount - upgrade.upgradedAmount,
      targetLabel: getEffectTargetLabel(moveHitsAllValidTargets(move) ? pluralizeTargetKey(primaryTarget, move) : primaryTarget, move),
      icon: EFFECT_ICON_BY_KEY[primaryEffectKey] || "",
    });
    seen.add(`${primaryEffectKey}|${primaryTarget}|primary`);
  }

  baseEffects.slice(1).forEach((effect, index) => {
    const effectKey = String(effect?.effect || effect?.effect_name || "").toLowerCase();
    if (!effectKey || effectKey === "none") return;
    const target = effect.target || (getExplicitMoveKind(move) === "buff" ? "ally" : "enemy");
    const seenKey = `${effectKey}|${target}|${index + 1}`;
    if (seen.has(seenKey)) return;
    seen.add(seenKey);
    const baseAmount = safeNumber(effect.amount, 0);
    const upgrade = getMoveEffectUpgradeAmount(move, baseAmount);
    const finalAmount = getSecondaryEffectDisplayAmount(move, fighter, effectKey, effect.amount);
    rows.push({
      key: seenKey,
      effectKey,
      amount: finalAmount,
      baseAmount,
      upgradeBonus: upgrade.upgradeBonus,
      potencyBonus: finalAmount - upgrade.upgradedAmount,
      targetLabel: getEffectTargetLabel(moveHitsAllValidTargets(move) ? pluralizeTargetKey(target, move) : target, move),
      icon: EFFECT_ICON_BY_KEY[effectKey] || "",
    });
  });

  const baseSecondaryCount = Number.isFinite(Number(getMoveCardUpgradeMeta(move).baseSecondaryEffectCount))
    ? Number(getMoveCardUpgradeMeta(move).baseSecondaryEffectCount)
    : Math.max(0, baseEffects.length - 1);
  asArray(getMoveCardUpgradeMeta(move).secondaryEffects)
    .slice(baseSecondaryCount)
    .forEach((effect, index) => {
      const effectKey = String(effect?.effectKey || effect?.effect || "").toLowerCase();
      if (!effectKey || effectKey === "none") return;
      const target = effect.target === "self" ? "self" : getExplicitMoveKind(move) === "buff" ? "ally" : "enemy";
      rows.push({
        key: `upgrade-${effectKey}-${target}-${index}`,
        effectKey,
        amount: getSecondaryEffectDisplayAmount(move, fighter, effectKey, effect.amount),
        baseAmount: safeNumber(effect.amount, 0),
        upgradeBonus: safeNumber(effect.amount, 0),
        potencyBonus:
          getSecondaryEffectDisplayAmount(move, fighter, effectKey, effect.amount) -
          safeNumber(effect.amount, 0),
        fromUpgrade: true,
        targetLabel: getEffectTargetLabel(moveHitsAllValidTargets(move) ? pluralizeTargetKey(target, move) : target, move),
        icon: EFFECT_ICON_BY_KEY[effectKey] || "",
      });
    });

  return rows;
}

function isMonsterSide(side) {
  return side !== "A";
}

function areAllies(sideA, sideB) {
  if (!sideA || !sideB) return false;
  return sideA === sideB || (isMonsterSide(sideA) && isMonsterSide(sideB));
}

function getMoveAccuracyBonusFromGainedEffects(move, actor) {
  const moveAccuracy = actor?.gainedEffectsMeta?.moveAccuracy || {};
  const range = getMoveRange(move?.type);
  const moveKind = getExplicitMoveKind(move);

  return (
    safeNumber(moveAccuracy.all, 0) +
    safeNumber(range ? moveAccuracy[range] : 0, 0) +
    safeNumber(moveKind === "curse" ? moveAccuracy.curse : 0, 0)
  );
}

function getItemResistanceChance(target, effectKey) {
  if (!effectKey) return 0;
  const resistanceEntries = asArray(target?.gainedEffectsMeta?.battleOnly).filter(
    (entry) => entry?.type === "resistance" && entry?.resistedEffect === effectKey
  );

  return resistanceEntries.reduce((total, entry) => total + safeNumber(entry.amount, 0), 0);
}

function applyStack(target, effectKey, amount) {
  if (!target || !effectKey || !amount) return false;
  target.effects[effectKey] = getEffect(target.effects, effectKey) + amount;
  return true;
}

function getBattleOnlyEffectBonus(entry = {}, fighter = null) {
  const effectKey = String(entry.effectKey || "").toLowerCase();
  if (
    !fighter ||
    !effectKey ||
    entry.type === "resistance" ||
    entry.type === "heal_for_applied_stacks" ||
    entry.type === "heal_when_stacks_applied"
  ) {
    return 0;
  }

  return (
    safeNumber(fighter?.effectPotencies?.[effectKey], 0) +
    getArtifactEffectPotencyBonus(fighter, effectKey)
  );
}

function getBattleOnlyEffectAmount(entry = {}, fighter = null) {
  if (entry.type === "resistance") return safeNumber(entry.amount, 0);
  if (entry.type === "heal_for_applied_stacks") return safeNumber(entry.amount, 0);
  if (entry.type === "heal_when_stacks_applied") return safeNumber(entry.amount, 0);
  return safeNumber(entry.amount, 0) + getBattleOnlyEffectBonus(entry, fighter);
}

function applyStartOfBattleRuntimeEffects(battle) {
  const events = [];

  Object.entries(battle.fighters || {}).forEach(([side, fighter]) => {
    const actorAppliedEvents = [];

    asArray(fighter?.gainedEffectsMeta?.battleOnly).forEach((entry) => {
      if (!entry?.effectKey || !entry?.amount) return;
      const effectKey = String(entry.effectKey || "").toLowerCase();
      const amount = getBattleOnlyEffectAmount(entry, fighter);

      if (entry.type === "gain_start_of_battle") {
        if (applyStack(fighter, effectKey, amount)) {
          const event = {
            side,
            effectName: effectKey,
            amount,
            targetSide: side,
            targetName: fighter.name,
            sourceName: entry.sourceName || "Item",
            title: `${fighter.name} gains ${effectKey}`,
            text: `${entry.sourceName || "Item"} grants ${amount} ${effectKey} at the start of battle.`,
          };
          events.push(event);
          actorAppliedEvents.push(event);
        }
      }

      if (entry.type === "apply_start_of_battle") {
        const targetSide = getAliveEnemySides(battle, side)[0] || (side === "A" ? "B" : "A");
        const target = battle.fighters[targetSide];
        if (!target) return;
        if (applyStack(target, effectKey, amount)) {
          const event = {
            side: targetSide,
            effectName: effectKey,
            amount,
            targetSide,
            targetName: target.name,
            sourceName: entry.sourceName || "Item",
            title: `${target.name} is afflicted with ${effectKey}`,
            text: `${entry.sourceName || "Item"} applies ${amount} ${effectKey} at the start of battle.`,
          };
          events.push(event);
          actorAppliedEvents.push(event);
        }
      }
    });

    applyHealForAppliedStackRuntimeEffects({
      actor: fighter,
      appliedEvents: actorAppliedEvents,
    }).forEach((event) => {
      events.push({
        ...event,
        side: event.targetSide || side,
        title: `${fighter.name} recovers`,
      });
    });
  });

  return events;
}

function applyOnHitRuntimeEffects({ actor, target, move, hitWasCritical }) {
  const events = [];
  const range = getMoveRange(move?.type);

  asArray(actor?.gainedEffectsMeta?.battleOnly).forEach((entry) => {
    if (!entry?.effectKey || !entry?.amount) return;
    if (!["gain_on_hit", "apply_on_hit", "apply_on_crit"].includes(entry.type)) return;
    if (entry.type === "apply_on_crit" && !hitWasCritical) return;
    if (entry.attackType && entry.attackType !== range) return;

    const targetFighter = entry.type === "gain_on_hit" ? actor : target;
    const effectKey = String(entry.effectKey || "").toLowerCase();
    const characterPotency = safeNumber(actor?.effectPotencies?.[effectKey], 0);
    const amount =
      safeNumber(entry.amount, 0) +
      characterPotency +
      getArtifactEffectPotencyBonus(actor, effectKey);

    if (
      NEGATIVE_EFFECT_KEYS.has(effectKey) &&
      !areAllies(actor.side, targetFighter.side)
    ) {
      const cleanseGuardResult = consumeCleanseGuardForNegativeApplication(
        targetFighter.effects,
        amount
      );
      const appliedAmount = cleanseGuardResult.appliedAmount;
      if (!appliedAmount) {
        events.push({
          effectName: effectKey,
          amount: 0,
          targetSide: targetFighter.side,
          targetName: targetFighter.name,
          sourceName: entry.sourceName || "Item",
          resisted: true,
          blockedBy: "cleanse",
        });
        return;
      }

      const itemResistanceChance = getItemResistanceChance(targetFighter, effectKey);
      if (itemResistanceChance > 0 && Math.random() * 100 < itemResistanceChance) {
        events.push({
          effectName: effectKey,
          amount: 0,
          targetSide: targetFighter.side,
          targetName: targetFighter.name,
          sourceName: entry.sourceName || "Item",
          resisted: true,
          blockedBy: "item_resistance",
        });
        return;
      }

      const resistChance = computeDefenderResistChance(targetFighter.stats, targetFighter.effects);
      if (Math.random() * 100 < resistChance) {
        events.push({
          effectName: effectKey,
          amount: 0,
          targetSide: targetFighter.side,
          targetName: targetFighter.name,
          sourceName: entry.sourceName || "Item",
          resisted: true,
        });
        return;
      }

      if (!applyStack(targetFighter, effectKey, appliedAmount)) return;

      events.push({
        effectName: effectKey,
        amount: appliedAmount,
        targetSide: targetFighter.side,
        targetName: targetFighter.name,
        sourceName: entry.sourceName || "Item",
        critical: Boolean(hitWasCritical),
      });
      return;
    }

    if (!applyStack(targetFighter, effectKey, amount)) return;

    events.push({
      effectName: effectKey,
      amount,
      targetSide: targetFighter.side,
      targetName: targetFighter.name,
      sourceName: entry.sourceName || "Item",
      critical: Boolean(hitWasCritical),
    });
  });

  return events;
}

function applyHealForAppliedStackRuntimeEffects({ actor, appliedEvents = [] }) {
  const events = [];
  if (!actor || safeNumber(actor.hp, 0) <= 0) return events;

  asArray(actor?.gainedEffectsMeta?.battleOnly).forEach((entry) => {
    if (!["heal_for_applied_stacks", "heal_when_stacks_applied"].includes(entry?.type)) return;

    const sourceEffectKey = String(
      entry.sourceEffectKey || entry.effectKey || entry.resistedEffect || ""
    ).toLowerCase();
    const healBaseAmount = safeNumber(entry.amount, 0);
    if (!sourceEffectKey || healBaseAmount <= 0) return;

    const matchingAppliedEvents = asArray(appliedEvents).filter((event) => {
      if (!event || event.resisted || safeNumber(event.amount, 0) <= 0) return false;
      if (String(event.effectName || "").toLowerCase() !== sourceEffectKey) return false;
      if (event.targetSide === actor.side) return false;
      return true;
    });
    if (!matchingAppliedEvents.length) return;

    const appliedStacks = matchingAppliedEvents.reduce(
      (total, event) => total + safeNumber(event.amount, 0),
      0
    );
    const rawHealAmount =
      entry.type === "heal_when_stacks_applied"
        ? healBaseAmount * matchingAppliedEvents.length
        : appliedStacks * healBaseAmount;

    const healAmount = Math.max(
      1,
      Math.round(applyArtifactHealingModifier(rawHealAmount, actor))
    );
    const previousHp = actor.hp;
    actor.hp = Math.min(actor.maxHp, actor.hp + healAmount);
    const healed = actor.hp - previousHp;
    if (healed <= 0) return;

    events.push({
      effectName: "trait heal",
      amount: healed,
      targetSide: actor.side,
      targetName: actor.name,
      sourceName: entry.sourceName || "Item",
      popupLine: { text: `+${healed}`, tone: "heal", kind: "heal" },
      text: `${entry.sourceName || "Item"} restores ${healed} HP to ${actor.name}.`,
    });
  });

  return events;
}

function applyCardUpgradeSecondaryEffects({ actor, target, move, hitWasCritical }) {
  const events = [];
  const secondaryEffects = asArray(getMoveCardUpgradeMeta(move).secondaryEffects);
  if (!secondaryEffects.length || !actor || !target) return events;

  secondaryEffects.forEach((entry) => {
    if (!entry?.effectKey || !entry?.amount) return;
    if (entry.trigger === "crit" && !hitWasCritical) return;

    const effectKey = String(entry.effectKey || "").toLowerCase();
    const targetFighter = entry.target === "self" ? actor : target;
    if (!targetFighter) return;

    let amount =
      safeNumber(entry.amount, 0) +
      getMoveEffectPotencyAddOn(move, actor, effectKey, getExplicitMoveKind(move));
    amount = Math.max(0, amount);
    if (!amount) return;

    if (effectKey === "cleanse") {
      const result = consumeCleanseFromNegatives(targetFighter.effects, amount);
      if (result.remainingCleanse > 0) {
        targetFighter.effects.cleanse =
          getEffect(targetFighter.effects, "cleanse") + result.remainingCleanse;
      }

      events.push({
        effectName: "cleanse",
        amount,
        targetSide: targetFighter.side,
        targetName: targetFighter.name,
        sourceName: "Card Upgrade",
      });
      return;
    }

    if (NEGATIVE_EFFECT_KEYS.has(effectKey) && !areAllies(actor.side, targetFighter.side)) {
      const cleanseGuardResult = consumeCleanseGuardForNegativeApplication(
        targetFighter.effects,
        amount
      );
      amount = cleanseGuardResult.appliedAmount;
      if (!amount) {
        events.push({
          effectName: effectKey,
          amount: 0,
          targetSide: targetFighter.side,
          targetName: targetFighter.name,
          sourceName: "Card Upgrade",
          resisted: true,
          blockedBy: "cleanse",
        });
        return;
      }

      const itemResistanceChance = getItemResistanceChance(targetFighter, effectKey);
      if (itemResistanceChance > 0 && Math.random() * 100 < itemResistanceChance) {
        events.push({
          effectName: effectKey,
          amount: 0,
          targetSide: targetFighter.side,
          targetName: targetFighter.name,
          sourceName: "Card Upgrade",
          resisted: true,
          blockedBy: "item_resistance",
        });
        return;
      }

      const resistChance = computeDefenderResistChance(targetFighter.stats, targetFighter.effects);
      if (Math.random() * 100 < resistChance) {
        events.push({
          effectName: effectKey,
          amount: 0,
          targetSide: targetFighter.side,
          targetName: targetFighter.name,
          sourceName: "Card Upgrade",
          resisted: true,
        });
        return;
      }
    }

    if (!applyStack(targetFighter, effectKey, amount)) return;

    events.push({
      effectName: effectKey,
      amount,
      targetSide: targetFighter.side,
      targetName: targetFighter.name,
      sourceName: "Card Upgrade",
      critical: Boolean(hitWasCritical),
    });
  });

  return events;
}

function getDepthsLowHpDamageBonus(actor, target) {
  const lowHpDamage = actor?.depthsAbilityMeta?.lowHpDamage;
  if (!lowHpDamage || !target?.maxHp) return 0;

  const thresholdPct = clamp(safeNumber(lowHpDamage.thresholdPct, 0), 0, 100);
  const currentPct = (safeNumber(target.hp, 0) / Math.max(1, safeNumber(target.maxHp, 1))) * 100;
  if (currentPct > thresholdPct) return 0;

  return Math.max(0, Math.round(safeNumber(lowHpDamage.flatDamage, 0)));
}

function applyDepthsLifeSteal(actor, damage) {
  const lifeStealPct = safeNumber(actor?.depthsAbilityMeta?.lifeStealPct, 0);
  if (!actor || lifeStealPct <= 0 || damage <= 0 || safeNumber(actor.hp, 0) <= 0) return null;

  const healAmount = Math.max(
    1,
    Math.round(applyArtifactHealingModifier(damage * (lifeStealPct / 100), actor))
  );
  const previousHp = actor.hp;
  actor.hp = Math.min(actor.maxHp, actor.hp + healAmount);
  const healed = actor.hp - previousHp;
  if (healed <= 0) return null;

  return {
    effectName: "lifesteal",
    amount: healed,
    targetSide: actor.side,
    targetName: actor.name,
    sourceName: "Lifesteal",
    popupLine: { text: `+${healed}`, tone: "heal", kind: "heal" },
    text: `Lifesteal restores ${healed} HP to ${actor.name}.`,
  };
}

function applyDepthsSecondWind(fighter) {
  const secondWind = fighter?.depthsAbilityMeta?.secondWind;
  if (!fighter || !secondWind || fighter.depthsRoomTriggers?.secondWindUsed) return null;
  if (safeNumber(fighter.hp, 0) <= 0) return null;

  const thresholdPct = clamp(safeNumber(secondWind.thresholdPct, 0), 0, 100);
  const currentPct = (safeNumber(fighter.hp, 0) / Math.max(1, safeNumber(fighter.maxHp, 1))) * 100;
  if (currentPct > thresholdPct) return null;

  const healAmount = Math.max(
    1,
    Math.round(
      applyArtifactHealingModifier(
        fighter.maxHp * (safeNumber(secondWind.healPct, 0) / 100),
        fighter
      )
    )
  );
  const previousHp = fighter.hp;
  fighter.hp = Math.min(fighter.maxHp, fighter.hp + healAmount);
  const shieldAmount = Math.max(0, Math.round(safeNumber(secondWind.shield, 0)));
  if (shieldAmount > 0) applyStack(fighter, "shield", shieldAmount);
  fighter.depthsRoomTriggers = {
    ...(fighter.depthsRoomTriggers || {}),
    secondWindUsed: true,
  };

  return {
    effectName: "shield",
    amount: shieldAmount || fighter.hp - previousHp,
    targetSide: fighter.side,
    targetName: fighter.name,
    sourceName: "Second Breath",
    popupLine: { text: `+${fighter.hp - previousHp}`, tone: "heal", kind: "heal" },
    text: `${fighter.name} catches a second breath, heals ${fighter.hp - previousHp}, and gains ${shieldAmount} shield.`,
  };
}

function getDepthsArtifactMeta(fighter) {
  return fighter?.depthsArtifactMeta || {};
}

function getArtifactEffectPotencyBonus(actor, effectKey) {
  const bonuses = getDepthsArtifactMeta(actor).effectPotencyBonus || {};
  return safeNumber(bonuses.all, 0) + safeNumber(bonuses[String(effectKey || "").toLowerCase()], 0);
}

function applyArtifactHealingModifier(healAmount, actor) {
  const healingDonePct = safeNumber(getDepthsArtifactMeta(actor).healingDonePct, 0);
  if (!healingDonePct) return healAmount;
  return healAmount * Math.max(0, 1 + healingDonePct / 100);
}

function applyArtifactDamageModifiers(damage, actor, target) {
  const actorMeta = getDepthsArtifactMeta(actor);
  const targetMeta = getDepthsArtifactMeta(target);
  let nextDamage = safeNumber(damage, 0) + safeNumber(actorMeta.damageBonusFlat, 0);
  nextDamage *= Math.max(0, 1 + safeNumber(actorMeta.damageDealtPct, 0) / 100);
  nextDamage *= Math.max(0, 1 + safeNumber(targetMeta.damageTakenPct, 0) / 100);
  return Math.max(0, Math.round(nextDamage));
}

function applyArtifactHealOnKill(actor, target) {
  const healOnKillPct = safeNumber(getDepthsArtifactMeta(actor).healOnKillPct, 0);
  if (!actor || !target || healOnKillPct <= 0) return null;
  if (safeNumber(target.hp, 0) > 0 || safeNumber(actor.hp, 0) <= 0) return null;

  const healAmount = Math.max(
    1,
    Math.round(applyArtifactHealingModifier(actor.maxHp * (healOnKillPct / 100), actor))
  );
  const previousHp = actor.hp;
  actor.hp = Math.min(actor.maxHp, actor.hp + healAmount);
  const healed = actor.hp - previousHp;
  if (healed <= 0) return null;

  return {
    effectName: "artifact heal",
    amount: healed,
    targetSide: actor.side,
    targetName: actor.name,
    sourceName: "Artifact",
    popupLine: { text: `+${healed}`, tone: "heal", kind: "heal" },
    text: `An artifact restores ${healed} HP to ${actor.name}.`,
  };
}

function consumeArtifactCooldownOverride(actor, moveKind) {
  const meta = getDepthsArtifactMeta(actor);
  if (!actor || !meta) return null;
  actor.depthsRoomTriggers = { ...(actor.depthsRoomTriggers || {}) };

  if (
    moveKind === "buff" &&
    meta.firstBuffNoCooldown &&
    !actor.depthsRoomTriggers.firstBuffNoCooldownUsed
  ) {
    actor.depthsRoomTriggers.firstBuffNoCooldownUsed = true;
    return "An artifact makes the first buff card recover instantly.";
  }

  if (
    (moveKind === "damage" || moveKind === "curse") &&
    meta.firstDamageNoCooldown &&
    !actor.depthsRoomTriggers.firstDamageNoCooldownUsed
  ) {
    actor.depthsRoomTriggers.firstDamageNoCooldownUsed = true;
    return "An artifact makes the first damage or curse card recover instantly.";
  }

  return null;
}

function applyMoveEffect({ battle, actorSide, targetSide: requestedTargetSide, move, moveKind }) {
  const effectNameRaw = String(move.effect_name || move.effect || "").trim();
  if (!effectNameRaw) return null;

  const effectKey = effectNameRaw.toLowerCase();
  const isBuff = moveKind === "buff";
  const targetSide = requestedTargetSide || getMoveTargetSide(move, actorSide);
  const target = battle.fighters[targetSide];
  const actor = battle.fighters[actorSide];
  if (!target || !actor) return null;
  let amount = getMoveAppliedEffectAmount(move, actor, moveKind);

  if (effectKey === "cleanse") {
    const result = consumeCleanseFromNegatives(target.effects, amount);
    if (result.remainingCleanse > 0) {
      target.effects.cleanse = getEffect(target.effects, "cleanse") + result.remainingCleanse;
    }

    return {
      effectName: "cleanse",
      amount,
      targetSide,
      resisted: false,
      cleansedTotal: result.removedTotal,
      cleansedByEffect: result.removedByEffect,
      cleanseGuardAdded: result.remainingCleanse,
    };
  }

  if (!amount) return null;

  const isNegativeApplication =
    NEGATIVE_EFFECT_KEYS.has(effectKey) && !isBuff && targetSide !== actorSide;

  if (isNegativeApplication) {
    const cleanseGuardResult = consumeCleanseGuardForNegativeApplication(target.effects, amount);
    if (cleanseGuardResult.blockedAmount > 0) {
      amount = cleanseGuardResult.appliedAmount;
      if (!amount) {
        return {
          effectName: effectKey,
          amount: 0,
          targetSide,
          resisted: true,
          blockedBy: "cleanse",
          cleanseBlockedAmount: cleanseGuardResult.blockedAmount,
        };
      }
    }
  }

  if (!isBuff) {
    const itemResistanceChance = getItemResistanceChance(target, effectKey);
    if (itemResistanceChance > 0 && Math.random() * 100 < itemResistanceChance) {
      return {
        effectName: effectKey,
        amount: 0,
        targetSide,
        resisted: true,
        blockedBy: "item_resistance",
      };
    }

    const resistChance = computeDefenderResistChance(target.stats, target.effects);
    if (Math.random() * 100 < resistChance) {
      return { effectName: effectKey, amount: 0, targetSide, resisted: true };
    }
  }

  target.effects[effectKey] = getEffect(target.effects, effectKey) + amount;
  return { effectName: effectKey, amount, targetSide, resisted: false };
}

function getCharacterEffectPotencies(sourceCharObj = {}) {
  return EFFECTS.reduce((acc, effect) => {
    const key = effect.key;
    acc[key] = safeNumber(
      sourceCharObj?.effectPotencies?.[key] ??
        sourceCharObj?.itemEffectPotencies?.[key] ??
        sourceCharObj?.[key],
      0
    );
    return acc;
  }, {});
}

function normalizeMove(move, index, sourceCharObj, sourceRole = "") {
  const src = typeof move === "object" && move ? move : { name: String(move || `Move ${index + 1}`) };
  const effectKey = String(src.effect_name || src.effect || "").toLowerCase();

  return {
    ...src,
    id: getDepthsMoveId(src, index),
    name: src.name || `Move ${index + 1}`,
    type: src.type || src.category || "melee damage",
    category: src.category || src.type || "melee damage",
    power: safeNumber(src.power ?? src.basePower, 0),
    accuracy: clamp(safeNumber(src.accuracy, 75), 0, 100),
    cooldown_seconds: getMoveCooldown(src),
    effect: src.effect || src.effect_name || "none",
    effect_potency_base:
      src.effect_potency_base ??
      src.effect_potency ??
      (effectKey ? safeNumber(sourceCharObj?.[effectKey], 0) : 0),
    sourceCharObj,
    sourceRole,
  };
}

function makeFighter({
  side,
  role,
  assetId,
  entity,
  imageUrl,
  backgroundImageUrl = "",
  runArtifacts = [],
}) {
  const sourceCharObj =
    role === "champion"
      ? ensureDepthsRunRuntime(entity || {}, runArtifacts)
      : entity || {};
  const baseMoves = asArray(sourceCharObj.moves)
    .map((move, index) => normalizeMove(move, index, sourceCharObj, role))
    .filter((move) => move && move.name);
  const depthsCardMoves = asArray(sourceCharObj.depthsRunCards)
    .map((card, index) => normalizeMove(card?.move || card, baseMoves.length + index, sourceCharObj, role))
    .filter((move) => move && move.name)
    .map((move) => ({
      ...move,
      depthsCardSource: move.depthsCardSource || "firebase",
      deckCopies: Math.max(0, safeNumber(move.deckCopies, 1)),
    }));
  const moves = [...baseMoves, ...depthsCardMoves].filter(
    (move) => role !== "champion" || getMoveDeckCopies(move) > 0
  );
  const stats = buildRuntimeStatsFromCharObj(sourceCharObj);
  const maxHp = Math.max(1, Math.round(stats.health));
  const startingHp = clamp(
    Math.round(safeNumber(sourceCharObj.depthsCurrentHp ?? sourceCharObj.currentHp, maxHp)),
    1,
    maxHp
  );

  return {
    side,
    role,
    assetId: assetId ?? sourceCharObj.assetId ?? sourceCharObj.monsterId ?? sourceCharObj.id ?? null,
    name: sourceCharObj.name || (role === "monster" ? "Depths Monster" : "Champion"),
    description: sourceCharObj.description || "",
    stats,
    effects: {},
    hp: startingHp,
    maxHp,
    moves,
    effectPotencies: getCharacterEffectPotencies(sourceCharObj),
    idleFrames: getIdleFrames({ ...sourceCharObj, imageUrl }),
    standingUrl: sourceCharObj.standingUrl || imageUrl || "",
    imageUrl: imageUrl || sourceCharObj.standingUrl || "",
    backgroundImageUrl:
      backgroundImageUrl || sourceCharObj.backgroundImageUrl || sourceCharObj.backgroundUrl || "",
    gainedEffectsMeta: sourceCharObj.gainedEffectsMeta || {},
    skillEffectBonuses: sourceCharObj.skillEffectBonuses || {},
    skillStatBonuses: sourceCharObj.skillStatBonuses || {},
    traitStatBonuses: sourceCharObj.traitStatBonuses || {},
    visualScale: safeNumber(
      sourceCharObj?._depthsScaling?.visualScale ?? sourceCharObj?.depthsScaling?.visualScale,
      1
    ),
    depthsRunArtifacts: asArray(sourceCharObj.depthsRunArtifacts),
    depthsRunCards: asArray(sourceCharObj.depthsRunCards),
    depthsCardUpgrades: asArray(sourceCharObj.depthsCardUpgrades),
    depthsAbilityMeta: sourceCharObj.depthsAbilityMeta || {},
    depthsArtifactMeta: sourceCharObj.depthsArtifactMeta || {},
    depthsScaling: sourceCharObj._depthsScaling || sourceCharObj.depthsScaling || null,
    depthsRoomTriggers: {},
    cooldown: {
      base: 0,
      progress: 1,
      remaining: 0,
      total: 1,
    },
  };
}

function getChampionDeckMoves(fighter) {
  return asArray(fighter?.moves).filter((move) => move?.id && getMoveDeckCopies(move) > 0);
}

function getChampionDeckSignature(fighter) {
  return getChampionDeckMoves(fighter)
    .map((move) => `${move.id}:${getMoveDeckCopies(move)}`)
    .join("|");
}

function buildChampionDeckCards(fighter) {
  return getChampionDeckMoves(fighter).flatMap((move, moveIndex) =>
    Array.from({ length: getMoveDeckCopies(move) }).map((_, copyIndex) => ({
      cardId: `champion-${move.id}-${moveIndex}-${copyIndex}`,
      moveId: move.id,
      moveName: move.name || `Move ${moveIndex + 1}`,
    }))
  );
}

function normalizeCardPile(cards = [], validMoveIds = new Set()) {
  return asArray(cards).filter((card) => card?.cardId && validMoveIds.has(card.moveId));
}

function createChampionCardState(fighter) {
  const cards = buildChampionDeckCards(fighter);
  return {
    signature: getChampionDeckSignature(fighter),
    drawPile: shuffleArray(cards),
    hand: [],
    discardPile: [],
  };
}

function getChampionCardState(fighter, rawState = null) {
  const signature = getChampionDeckSignature(fighter);
  const validMoveIds = new Set(getChampionDeckMoves(fighter).map((move) => move.id));
  if (!rawState || rawState.signature !== signature) return createChampionCardState(fighter);

  const drawPile = normalizeCardPile(rawState.drawPile, validMoveIds);
  const hand = normalizeCardPile(rawState.hand, validMoveIds);
  const discardPile = normalizeCardPile(rawState.discardPile, validMoveIds);
  const knownCardIds = new Set([...drawPile, ...hand, ...discardPile].map((card) => card.cardId));
  const missingCards = buildChampionDeckCards(fighter).filter((card) => !knownCardIds.has(card.cardId));

  return {
    signature,
    drawPile: [...drawPile, ...shuffleArray(missingCards)],
    hand,
    discardPile,
  };
}

function findMoveForCard(fighter, card) {
  return asArray(fighter?.moves).find((move) => move?.id === card?.moveId) || null;
}

function drawChampionCards(battle, drawCount = 2) {
  const fighter = battle?.fighters?.A;
  const cardState = getChampionCardState(fighter, battle?.championCards);
  const hand = [];
  let drawPile = [...cardState.drawPile];
  let discardPile = [...cardState.discardPile];

  while (hand.length < drawCount) {
    if (!drawPile.length && discardPile.length) {
      drawPile = shuffleArray(discardPile);
      discardPile = [];
    }

    if (!drawPile.length) break;
    hand.push(drawPile[0]);
    drawPile = drawPile.slice(1);
  }

  battle.championCards = {
    ...cardState,
    drawPile,
    hand,
    discardPile,
  };

  return hand;
}

function discardChampionHand(battle) {
  if (!battle?.fighters?.A) return;
  const cardState = getChampionCardState(battle.fighters.A, battle.championCards);
  battle.championCards = {
    ...cardState,
    hand: [],
    discardPile: [...cardState.discardPile, ...cardState.hand],
  };
}

function recomputeCooldown(fighter) {
  const next = { ...fighter, cooldown: { ...(fighter.cooldown || {}) } };
  const base = safeNumber(next.cooldown.base, 0);
  const progress = clamp(safeNumber(next.cooldown.progress, 1), 0, 1);
  const speed = getEffectiveSpeed(next.stats, next.effects);
  const total = Math.max(0.1, computeEffectiveCooldownSeconds(base, speed) || 0.1);

  next.cooldown.total = total;
  next.cooldown.progress = base > 0 ? progress : 1;
  next.cooldown.remaining = base > 0 && progress < 1 ? roundToTenth((1 - progress) * total) : 0;
  return next;
}

function tickFighterCooldown(fighter, dtSeconds) {
  const next = { ...fighter, cooldown: { ...(fighter.cooldown || {}) } };
  const base = safeNumber(next.cooldown.base, 0);

  if (base > 0 && safeNumber(next.cooldown.progress, 1) < 1) {
    const speed = getEffectiveSpeed(next.stats, next.effects);
    const total = Math.max(0.1, computeEffectiveCooldownSeconds(base, speed) || 0.1);
    next.cooldown.progress = Math.min(1, safeNumber(next.cooldown.progress, 0) + dtSeconds / total);
  }

  return recomputeCooldown(next);
}

function getEnemySides(battle) {
  return Object.keys(battle?.fighters || {}).filter((side) => isMonsterSide(side));
}

function getAliveSides(battle, predicate = () => true) {
  return Object.entries(battle?.fighters || {})
    .filter(([side, fighter]) => predicate(side, fighter) && safeNumber(fighter?.hp, 0) > 0)
    .map(([side]) => side);
}

function getAliveEnemySides(battle, actorSide) {
  return getAliveSides(battle, (side) => !areAllies(actorSide, side));
}

function getAliveAllySides(battle, actorSide) {
  return getAliveSides(battle, (side) => areAllies(actorSide, side));
}

function getValidTargetSides(battle, actorSide, move) {
  if (!battle?.fighters?.[actorSide]) return [];
  const targetKey = getMoveDeclaredTargetKey(move);
  if (targetKey === "self") {
    return safeNumber(battle.fighters[actorSide]?.hp, 0) > 0 ? [actorSide] : [];
  }
  if (targetKey === "ally" || targetKey === "allies") return getAliveAllySides(battle, actorSide);
  if (targetKey === "enemy" || targetKey === "enemies") return getAliveEnemySides(battle, actorSide);

  return getExplicitMoveKind(move) === "buff"
    ? getAliveAllySides(battle, actorSide)
    : getAliveEnemySides(battle, actorSide);
}

function getDefaultTargetSide(battle, actorSide, move) {
  return getValidTargetSides(battle, actorSide, move)[0] || getMoveTargetSide(move, actorSide);
}

function getDepthsEncounterBackground(room = 1) {
  const roomNumber = Math.max(1, Math.floor(safeNumber(room, 1)));
  const index = clamp(roomNumber - 1, 0, DEPTHS_ENCOUNTER_BACKGROUNDS.length - 1);
  return DEPTHS_ENCOUNTER_BACKGROUNDS[index] || DEPTHS_ENCOUNTER_BACKGROUNDS[0];
}

function getEnemyFormationPoint(side, battle) {
  const enemySides = getEnemySides(battle);
  const index = Math.max(0, enemySides.indexOf(side));
  const count = Math.max(1, enemySides.length);

  if (count === 1) return { left: 78, top: 60 };
  if (count === 2) return { left: 80, top: index === 0 ? 47 : 70 };
  if (count === 3) {
    if (index === 0) return { left: 69, top: 60 };
    return { left: 84, top: index === 1 ? 47 : 70 };
  }
  if (count === 4) {
    return {
      left: index < 2 ? 71 : 86,
      top: index % 2 === 0 ? 47 : 70,
    };
  }

  const min = 46;
  const max = 72;
  return {
    left: 82,
    top: min + ((max - min) * index) / Math.max(1, count - 1),
  };
}

function getFighterBattleLeft(side, battle) {
  if (side === "A") return 22;

  return getEnemyFormationPoint(side, battle).left;
}

function getFighterBattleTop(side, battle) {
  if (side === "A") return 60;

  return getEnemyFormationPoint(side, battle).top;
}

function getFighterVisualScale(fighter, battle) {
  if (!fighter || fighter.side === "A" || fighter.role !== "monster") return 1;

  const enemyCount = Math.max(1, getEnemySides(battle).length);
  const rawScale = safeNumber(
    fighter.visualScale ?? fighter.depthsScaling?.visualScale,
    1
  );
  const countCap = enemyCount >= 4 ? 1.04 : enemyCount === 3 ? 1.12 : 1.48;

  return clamp(rawScale, 0.72, countCap);
}

function getFighterBattleWidth(side, battle) {
  const visualScale = getFighterVisualScale(battle?.fighters?.[side], battle);
  return {
    xs: `${18 * visualScale}%`,
    md: `${13 * visualScale}%`,
  };
}

function getFighterProjectileTop(side, battle) {
  return getFighterBattleTop(side, battle) - 1;
}

function getFighterPopupTop(side, battle) {
  return getFighterBattleTop(side, battle) - 13;
}

function getFighterBuffEffectTop(side, battle) {
  return getFighterBattleTop(side, battle) - 24;
}

function getDepthsCardCasterPoint({ battle, animation, localMs = 0 }) {
  const actorSide = animation?.actorSide;
  const targetSide = animation?.targetSide;
  const move = animation?.move || {};
  const actorLeft = getFighterBattleLeft(actorSide, battle);
  const targetLeft = getFighterBattleLeft(targetSide, battle);
  const actorTop = getFighterProjectileTop(actorSide, battle);
  const targetTop = getFighterProjectileTop(targetSide, battle);
  const fromLeft = actorLeft <= targetLeft;
  const moveRange = getMoveRange(move?.type);
  const moveKind = animation?.moveKind || getExplicitMoveKind(move);
  const timings = animation?.timings || getMoveAnimationTimings(move, moveKind);
  const depthsCardMeleeAttack =
    isDepthsCardMove(move) && moveKind !== "buff" && moveRange === "melee";

  if (moveKind === "buff") {
    const progress = clamp(localMs / Math.max(1, safeNumber(timings.effectStartMs, MOVE_EFFECT_LAUNCH_MS)), 0, 1);
    const sideOffset = actorSide === "A" ? 10 : -10;
    return {
      left: actorLeft + sideOffset * easeOutCubic(progress),
      top: actorTop - Math.sin(progress * Math.PI) * 1.6,
      fromLeft: actorSide === "A",
    };
  }

  const startOffset = depthsCardMeleeAttack ? DEPTHS_CARD_MELEE_CASTER_START_OFFSET : 9;
  const startLeft = actorLeft + (fromLeft ? startOffset : -startOffset);
  const startTop = actorTop;

  if (moveRange === "melee") {
    const stopOffset = depthsCardMeleeAttack ? DEPTHS_CARD_MELEE_CASTER_STOP_OFFSET : 10;
    const stopLeft = targetLeft + (fromLeft ? -stopOffset : stopOffset);
    const stopTop = targetTop;
    const travelEndMs = Math.max(1, safeNumber(timings.effectStartMs, MOVE_EFFECT_LAUNCH_MS));
    const rawProgress = clamp(localMs / travelEndMs, 0, 1);
    const travelProgress = depthsCardMeleeAttack
      ? clamp(
          (rawProgress - DEPTHS_CARD_MELEE_CASTER_ORIGIN_HOLD) /
            (1 - DEPTHS_CARD_MELEE_CASTER_ORIGIN_HOLD),
          0,
          1
        )
      : rawProgress;
    const progress = easeOutCubic(travelProgress);

    return {
      left: startLeft + (stopLeft - startLeft) * progress,
      top: startTop + (stopTop - startTop) * progress,
      fromLeft,
    };
  }

  const hoverProgress = clamp(localMs / Math.max(1, safeNumber(timings.effectStartMs, MOVE_EFFECT_LAUNCH_MS)), 0, 1);
  return {
    left: startLeft,
    top: startTop - Math.sin(hoverProgress * Math.PI) * 1.8,
    fromLeft,
  };
}

function determineNextActor(battle) {
  const readySides = Object.entries(battle?.fighters || {})
    .filter(([, fighter]) => safeNumber(fighter?.hp, 0) > 0)
    .filter(([, fighter]) => safeNumber(fighter?.cooldown?.remaining, 0) <= 0)
    .map(([side]) => side);

  if (!readySides.length) return null;

  return readySides.sort((sideA, sideB) => {
    const fighterA = battle.fighters[sideA];
    const fighterB = battle.fighters[sideB];
    const speedB = getEffectiveSpeed(fighterB.stats, fighterB.effects);
    const speedA = getEffectiveSpeed(fighterA.stats, fighterA.effects);
    if (speedA === speedB) return Math.random() < 0.5 ? -1 : 1;
    return speedB - speedA;
  })[0];
}

function getPrimaryFrame(frames = [], fallback = "") {
  return asArray(frames).find((src) => typeof src === "string" && src.trim()) || fallback || "";
}

function buildKillingBlowSnapshot({ battle, actorSide, targetSide, actor, target, move, damage = 0, critical = false }) {
  const moveFrames = getMoveCharacterFrames(move);
  return {
    actorSide,
    targetSide,
    actorName: actor?.name || actorSide,
    targetName: target?.name || targetSide,
    actorRole: actor?.role || "",
    targetRole: target?.role || "",
    moveId: move?.id || "",
    moveName: move?.name || "Unknown card",
    moveType: move?.type || move?.category || "",
    moveKind: getExplicitMoveKind(move),
    isDepthsCard: Boolean(isDepthsCardMove(move) || move?.depthsCardId),
    cardFrame: moveFrames[2] || moveFrames[0] || move?.casterAnimation?.sheetUrl || "",
    damage: Math.max(0, Math.round(safeNumber(damage, 0))),
    critical: Boolean(critical),
    room: battle?.room || null,
    recordedAt: Date.now(),
  };
}

function buildOngoingDefeatSnapshot({ battle, targetSide, target, delta = 0 }) {
  return {
    actorSide: "effects",
    targetSide,
    actorName: "Ongoing effects",
    targetName: target?.name || targetSide,
    actorRole: "effect",
    targetRole: target?.role || "",
    moveId: "ongoing-effects",
    moveName: "Ongoing effects",
    moveType: "effect",
    moveKind: "effect",
    isDepthsCard: false,
    cardFrame: "",
    damage: Math.abs(Math.round(safeNumber(delta, 0))),
    critical: false,
    room: battle?.room || null,
    recordedAt: Date.now(),
  };
}

function normalizeVerificationNumberMap(map = {}) {
  return Object.keys(map || {})
    .sort()
    .reduce((acc, key) => {
      const amount = safeNumber(map[key], 0);
      if (amount) acc[key] = amount;
      return acc;
    }, {});
}

function summarizeVerificationMove(move = {}) {
  const moveId = String(move?.id || move?.moveId || move?.cardId || move?.name || "");
  return {
    id: moveId,
    name: String(move?.name || moveId || "Unknown card"),
    type: String(move?.type || move?.category || ""),
    moveKind: getExplicitMoveKind(move),
    target: String(move?.target || ""),
    power: safeNumber(move?.power ?? move?.basePower, 0),
    accuracy: safeNumber(move?.accuracy, 0),
    cooldown: getMoveCooldown(move),
    effect: String(move?.effect || move?.effect_name || ""),
    effectAmount: safeNumber(move?.effectAmount ?? move?.effect_potency ?? move?.effect_potency_base, 0),
    depthsCardId: move?.depthsCardId || null,
    depthsCardSource: move?.depthsCardSource || "",
    deckCopies: getMoveDeckCopies(move),
    rarity: move?.rarity || "",
    depthsCardUpgradeMeta: move?.depthsCardUpgradeMeta || null,
    effects: asArray(move?.effects).map((effect) => ({
      effect: String(effect?.effect || effect?.effectName || "").toLowerCase(),
      amount: safeNumber(effect?.amount, 0),
      target: String(effect?.target || ""),
    })),
  };
}

function summarizeVerificationFighter(fighter = {}, side = "", options = {}) {
  const includeMoves = options.includeMoves !== false;
  const summary = {
    side: side || fighter?.side || "",
    role: fighter?.role || "",
    assetId: fighter?.assetId ?? null,
    name: fighter?.name || "",
    hp: Math.round(safeNumber(fighter?.hp, 0) * 1000) / 1000,
    maxHp: Math.round(safeNumber(fighter?.maxHp, 0) * 1000) / 1000,
    stats: normalizeVerificationNumberMap(fighter?.stats || {}),
    effectPotencies: normalizeVerificationNumberMap(fighter?.effectPotencies || {}),
    effects: normalizeVerificationNumberMap(fighter?.effects || {}),
  };

  if (includeMoves) {
    summary.moves = asArray(fighter?.moves).map(summarizeVerificationMove);
  }

  return summary;
}

function makeBattleVerificationSnapshot(battle, options = {}) {
  if (!battle?.fighters?.A) return null;
  return {
    status: battle.status || "",
    winner: battle.winner || null,
    round: Math.max(0, Math.round(safeNumber(battle.round, 0))),
    champion: summarizeVerificationFighter(battle.fighters.A, "A", options),
    monsters: getEnemySides(battle).map((side) => summarizeVerificationFighter(battle.fighters[side], side, options)),
  };
}

function withLatestVerificationAfterSnapshot(battle, actionIndex = null) {
  if (!battle) return battle;
  const actions = asArray(battle.actionLog);
  if (!actions.length) return battle;

  const targetIndex = actionIndex === null || actionIndex === undefined ? actions.length - 1 : actionIndex;
  const afterSnapshot = makeBattleVerificationSnapshot(battle, { includeMoves: false });
  battle.actionLog = actions.map((action, index) =>
    index === targetIndex
      ? {
          ...action,
          afterSnapshot,
          afterRecordedAt: Date.now(),
        }
      : action
  );
  return battle;
}

function summarizeBattleRunArtifact(artifact = {}) {
  return {
    id: artifact.id || "",
    name: artifact.name || "",
    rarity: artifact.rarity || "",
    imageUrl: artifact.imageUrl || artifact.iconUrl || "",
    statBonuses: artifact.statBonuses || {},
    artifactMeta: artifact.artifactMeta || {},
    battleOnly: asArray(artifact.battleOnly).map((entry) => ({
      type: entry?.type || "",
      attackType: entry?.attackType || "",
      effectKey: entry?.effectKey || "",
      sourceEffectKey: entry?.sourceEffectKey || "",
      amount: safeNumber(entry?.amount, 0),
      trigger: entry?.trigger || "",
    })),
  };
}

function summarizeBattleRunCard(card = {}) {
  const move = card.move || card;
  return {
    id: card.id || move.id || "",
    cardId: card.cardId || move.cardId || move.depthsCardId || "",
    name: card.name || move.name || "",
    rarity: card.rarity || move.rarity || "",
    deckCopies: safeNumber(card.deckCopies ?? move.deckCopies, 1),
    move: summarizeVerificationMove(move),
  };
}

function summarizeBattleRunUpgrade(upgrade = {}) {
  return {
    id: upgrade.id || "",
    upgradeId: upgrade.upgradeId || upgrade.id || "",
    name: upgrade.name || "",
    moveIndex: Number.isSafeInteger(Number(upgrade.moveIndex)) ? Number(upgrade.moveIndex) : null,
    moveKey: upgrade.moveKey || "",
    moveFamilyKey: upgrade.moveFamilyKey || "",
    room: upgrade.room ?? null,
    powerDelta: safeNumber(upgrade.powerDelta, 0),
    powerMultiplier: upgrade.powerMultiplier || null,
    accuracyDelta: safeNumber(upgrade.accuracyDelta, 0),
    cooldownDelta: safeNumber(upgrade.cooldownDelta, 0),
    effectPotencyBonus: safeNumber(upgrade.effectPotencyBonus, 0),
    effectPotencyMultiplier: upgrade.effectPotencyMultiplier || null,
    repeatCount: upgrade.repeatCount || null,
    multiTarget: Boolean(upgrade.multiTarget),
    critChanceBonus: safeNumber(upgrade.critChanceBonus, 0),
    secondaryEffects: asArray(upgrade.secondaryEffects).map((effect) => ({
      target: effect?.target || "",
      effectKey: effect?.effectKey || "",
      amount: safeNumber(effect?.amount, 0),
      trigger: effect?.trigger || "",
    })),
  };
}

function summarizeBattle(battle) {
  if (!battle) return null;
  const enemySides = getEnemySides(battle);
  return {
    battleId: battle.id || null,
    runId: battle.runId || null,
    room: battle.room,
    currentNodeId: battle.currentNodeId || "",
    currentNodeType: battle.currentNodeType || "",
    backgroundImageUrl: battle.backgroundImageUrl || getDepthsEncounterBackground(battle.room),
    status: battle.status,
    phase: battle.phase,
    activeSide: battle.activeSide || null,
    winner: battle.winner || null,
    round: battle.round,
    animation: battle.animation
      ? {
          id: battle.animation.id || "",
          actorSide: battle.animation.actorSide || "",
          targetSide: battle.animation.targetSide || "",
          targetSides: asArray(battle.animation.targetSides),
          move: battle.animation.move ? summarizeVerificationMove(battle.animation.move) : null,
          moveKind: battle.animation.moveKind || "",
          timings: battle.animation.timings || null,
          startedAt: battle.animation.startedAt || null,
          durationMs: battle.animation.durationMs || null,
        }
      : null,
    champion: {
      assetId: battle.fighters.A.assetId,
      name: battle.fighters.A.name,
      hp: battle.fighters.A.hp,
      maxHp: battle.fighters.A.maxHp,
      stats: battle.fighters.A.stats,
      effectPotencies: battle.fighters.A.effectPotencies || {},
      effects: battle.fighters.A.effects,
      cooldown: battle.fighters.A.cooldown,
      moves: asArray(battle.fighters.A.moves).map(summarizeVerificationMove),
      idleFrame: getPrimaryFrame(battle.fighters.A.idleFrames, battle.fighters.A.standingUrl || battle.fighters.A.imageUrl),
      standingUrl: battle.fighters.A.standingUrl || "",
      imageUrl: battle.fighters.A.imageUrl || "",
      depthsAbilityMeta: battle.fighters.A.depthsAbilityMeta || {},
      depthsArtifactMeta: battle.fighters.A.depthsArtifactMeta || {},
    },
    championCards: battle.championCards || null,
    monsters: enemySides.map((side) => ({
      side,
      assetId: battle.fighters[side].assetId,
      name: battle.fighters[side].name,
      hp: battle.fighters[side].hp,
      maxHp: battle.fighters[side].maxHp,
      stats: battle.fighters[side].stats,
      effectPotencies: battle.fighters[side].effectPotencies || {},
      effects: battle.fighters[side].effects,
      cooldown: battle.fighters[side].cooldown,
      moves: asArray(battle.fighters[side].moves).map(summarizeVerificationMove),
      idleFrame: getPrimaryFrame(
        battle.fighters[side].idleFrames,
        battle.fighters[side].standingUrl || battle.fighters[side].imageUrl
      ),
      standingUrl: battle.fighters[side].standingUrl || "",
      imageUrl: battle.fighters[side].imageUrl || "",
      visualScale: battle.fighters[side].visualScale || 1,
      depthsScaling: battle.fighters[side].depthsScaling || null,
    })),
    monster: battle.fighters.B
      ? {
          assetId: battle.fighters.B.assetId,
          name: battle.fighters.B.name,
          hp: battle.fighters.B.hp,
          maxHp: battle.fighters.B.maxHp,
          effects: battle.fighters.B.effects,
          cooldown: battle.fighters.B.cooldown,
          moves: asArray(battle.fighters.B.moves).map(summarizeVerificationMove),
          idleFrame: getPrimaryFrame(
            battle.fighters.B.idleFrames,
            battle.fighters.B.standingUrl || battle.fighters.B.imageUrl
          ),
          standingUrl: battle.fighters.B.standingUrl || "",
          imageUrl: battle.fighters.B.imageUrl || "",
        }
      : null,
    killingBlow: battle.killingBlow || null,
  };
}

function getWinner(battle) {
  const hpA = safeNumber(battle?.fighters?.A?.hp, 0);
  const monsterAlive = getEnemySides(battle).some((side) => safeNumber(battle?.fighters?.[side]?.hp, 0) > 0);
  if (hpA <= 0 && !monsterAlive) return "draw";
  if (hpA <= 0) return "monster";
  if (!monsterAlive) return "champion";
  return null;
}

function mergeFighterSnapshot(fighter = {}, snapshot = {}, initialFighter = {}) {
  if (!snapshot || typeof snapshot !== "object") return fighter;
  const snapshotMoves = asArray(snapshot.moves);
  const moveMetadataById = snapshotMoves.reduce((acc, move) => {
    const key = String(move?.id || move?.name || "");
    if (key) acc[key] = move;
    return acc;
  }, {});
  const catalog = asArray(initialFighter.moves).length ? initialFighter.moves : snapshotMoves;
  const mergedMoves = restoreDepthsMoveIds(asArray(fighter.moves), catalog).map((move) => {
    const saved = moveMetadataById[String(move?.id || move?.name || "")] || null;
    if (!saved) return move;
    return {
      ...move,
      depthsCardId: move.depthsCardId || saved.depthsCardId || null,
      depthsCardSource: move.depthsCardSource || saved.depthsCardSource || "",
      deckCopies: safeNumber(move.deckCopies, saved.deckCopies),
      rarity: move.rarity || saved.rarity || "",
      depthsCardUpgradeMeta: move.depthsCardUpgradeMeta || saved.depthsCardUpgradeMeta || null,
    };
  });
  return recomputeCooldown({
    ...fighter,
    hp: clamp(
      Math.round(safeNumber(snapshot.hp, fighter.hp)),
      0,
      Math.max(1, safeNumber(snapshot.maxHp, fighter.maxHp || 1))
    ),
    maxHp: Math.max(1, Math.round(safeNumber(snapshot.maxHp, fighter.maxHp || 1))),
    stats: snapshot.stats || fighter.stats,
    effectPotencies: snapshot.effectPotencies || fighter.effectPotencies || {},
    effects: snapshot.effects || fighter.effects || {},
    cooldown: snapshot.cooldown || fighter.cooldown || {},
    moves: mergedMoves.length ? mergedMoves : fighter.moves,
  });
}

function hydrateAnimationMoveFromFighter(next) {
  const animation = next?.animation;
  if (!animation?.move || !animation.actorSide) return next;

  const actorMoves = asArray(next.fighters?.[animation.actorSide]?.moves);
  const moveId = String(animation.move.id || animation.move.moveId || animation.move.cardId || animation.move.name || "");
  const fullMove = findDepthsReplayMove(actorMoves, moveId);

  if (fullMove) {
    next.animation = {
      ...animation,
      move: fullMove,
    };
  }

  return next;
}

function hydrateBattleFromSnapshot(initialBattle, snapshot = {}, battleId = "", savedBattle = {}) {
  if (!snapshot || typeof snapshot !== "object") return initialBattle;

  const next = JSON.parse(JSON.stringify(initialBattle));
  next.id = battleId || snapshot.battleId || next.id;
  next.status = snapshot.status === "complete" ? "complete" : "active";
  const snapshotPhase = String(snapshot.phase || "");
  const canResumeAnimation =
    snapshotPhase === "animating" &&
    snapshot.animation?.move &&
    snapshot.animation?.actorSide &&
    snapshot.animation?.targetSide;
  next.phase = canResumeAnimation
    ? "animating"
    : ["cooldown", "deciding", "playerTurn", "monsterTurn"].includes(snapshotPhase)
    ? snapshotPhase
    : snapshot.status === "complete"
    ? "complete"
    : "cooldown";
  next.activeSide = snapshot.activeSide || null;
  next.winner = snapshot.winner || null;
  next.round = Math.max(0, Math.round(safeNumber(snapshot.round, next.round || 0)));
  next.championCards = snapshot.championCards || next.championCards;
  next.log = asArray(snapshot.log).length ? snapshot.log : next.log;
  next.animation = canResumeAnimation ? snapshot.animation : null;
  next.popup = null;
  next.popups = [];
  next.popupQueues = {};
  next.hitFlash = null;
  next.killingBlow = snapshot.killingBlow || next.killingBlow || null;
  next.actionLog = asArray(savedBattle.actionLog || snapshot.actionLog).length
    ? JSON.parse(JSON.stringify(asArray(savedBattle.actionLog || snapshot.actionLog)))
    : next.actionLog;

  if (next.fighters?.A && snapshot.champion) {
    next.fighters.A = mergeFighterSnapshot(next.fighters.A, snapshot.champion, savedBattle.serverInitialSnapshot?.champion);
  }

  asArray(snapshot.monsters).forEach((monsterSnapshot) => {
    const side = monsterSnapshot?.side;
    if (side && next.fighters?.[side]) {
      const initialFighter = asArray(savedBattle.serverInitialSnapshot?.monsters).find((entry) => entry.side === side);
      next.fighters[side] = mergeFighterSnapshot(next.fighters[side], monsterSnapshot, initialFighter);
    }
  });

  if (!asArray(snapshot.monsters).length && snapshot.monster && next.fighters?.B) {
    next.fighters.B = mergeFighterSnapshot(next.fighters.B, snapshot.monster, savedBattle.serverInitialSnapshot?.monsters?.[0]);
  }

  hydrateAnimationMoveFromFighter(next);

  if (next.status === "active" && !getWinner(next)) {
    if (!["cooldown", "deciding", "playerTurn", "monsterTurn", "animating"].includes(next.phase)) {
      next.phase = "cooldown";
    }
  }

  return next;
}

function getBattlePopups(battle) {
  return [...asArray(battle?.popups), ...(battle?.popup ? [battle.popup] : [])];
}

function getPopupQueueKey(popup = {}) {
  return popup.side || popup.queueKey || "global";
}

function getPopupLineCount(popup = {}) {
  const lineCount = asArray(popup.lines).length;
  if (lineCount) return lineCount;
  return String(popup.text || "").split("\n").filter(Boolean).length || 1;
}

function withPopupStackPosition(popup = {}, activePopups = []) {
  const queueKey = getPopupQueueKey(popup);
  const baseTop = safeNumber(popup.topPct, popup.side === "A" ? 47 : 41);
  const stackedTop = activePopups
    .filter((activePopup) => getPopupQueueKey(activePopup) === queueKey)
    .reduce((lowestTop, activePopup) => {
      const activeTop = safeNumber(activePopup.topPct, baseTop);
      const lineGap = POPUP_STACK_GAP_PCT + Math.max(0, getPopupLineCount(activePopup) - 1) * POPUP_STACK_EXTRA_LINE_GAP_PCT;
      return Math.max(lowestTop, activeTop + lineGap);
    }, baseTop);

  return {
    ...popup,
    topPct: clamp(Math.min(stackedTop, baseTop + POPUP_MAX_STACK_OFFSET_PCT), 10, 90),
  };
}

function pushBattlePopup(battle, popup) {
  if (!battle || !popup) return;
  const now = Date.now();
  const normalizedPopup = {
    ...popup,
    side: popup.side || null,
    createdAt: popup.createdAt || now,
  };
  const activePopups = getBattlePopups(battle);
  const stackedPopup = withPopupStackPosition(normalizedPopup, activePopups);

  battle.popupQueues = { ...(battle.popupQueues || {}) };
  battle.popups = [...asArray(battle.popups), stackedPopup].slice(-MAX_VISIBLE_POPUPS);
  battle.popup = null;
}

function mergeCommittedOutcomePopups(currentBattle, outcomeBattle, popupIds = []) {
  const popupIdSet = new Set(asArray(popupIds).filter(Boolean));
  if (!popupIdSet.size) {
    return {
      ...outcomeBattle,
      popup: null,
      popups: [],
      popupQueues: {},
    };
  }

  const activeCurrentPopups = getBattlePopups(currentBattle)
    .filter((popup) => popup?.id && !popupIdSet.has(popup.id));
  const activeCurrentQueue = { ...(currentBattle?.popupQueues || {}) };
  const nextBattle = {
    ...outcomeBattle,
    popup: null,
    popups: activeCurrentPopups.slice(-MAX_VISIBLE_POPUPS),
    popupQueues: activeCurrentQueue,
  };

  getBattlePopups(outcomeBattle)
    .filter((popup) => popup?.id && popupIdSet.has(popup.id))
    .forEach((popup) => {
      pushBattlePopup(nextBattle, {
        ...popup,
        createdAt: Date.now(),
        queuedAt: Date.now(),
        delayMs: popup.delayMs || 0,
      });
    });

  return nextBattle;
}

function buildMoveOneShotSequenceFrames({
  charFrameCount,
  effectFrameCount,
  frameHold = SIM_MOVE_CHAR_FRAME_HOLD,
  charLastFrameHold = SIM_MOVE_CHAR_LAST_FRAME_HOLD,
  effectFrameHold = SIM_MOVE_EFFECT_FRAME_HOLD,
  effectLastFrameHold = SIM_MOVE_EFFECT_LAST_FRAME_HOLD,
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

function getOneShotPlaybackStepAtFrame(localFrame, charFrameCount, effectFrameCount) {
  const sequence = buildMoveOneShotSequenceFrames({ charFrameCount, effectFrameCount });
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
        done: false,
      };
    }

    cursor -= step.duration;
  }

  const lastCharIndex = Math.max(0, (charFrameCount || 1) - 1);
  return {
    charIndex: lastCharIndex,
    effectIndex: -1,
    effectProgress: 1,
    duration: 1,
    done: true,
  };
}

function getOneShotMoveDurationMs(charFrameCount, effectFrameCount) {
  const frames = buildMoveOneShotSequenceFrames({ charFrameCount, effectFrameCount }).reduce(
    (sum, step) => sum + step.duration,
    0
  );
  return frames * FRAME_MS;
}

function getSingleMoveAnimationTimings(move, moveKind) {
  const moveRange = getMoveRange(move?.type);
  const effectFrameCount = Math.max(1, getMoveEffectFrames(move).length || 1);
  const moveEffectDurationMs = getOneShotMoveDurationMs(4, effectFrameCount);

  if (moveKind === "buff") {
    return {
      durationMs: Math.max(2100, moveEffectDurationMs + 450),
      effectStartMs: MOVE_EFFECT_LAUNCH_MS,
      effectDurationMs: moveEffectDurationMs,
      kind: "buff",
    };
  }

  if (moveRange === "melee") {
    const effectStartMs = FRAME_MS + MELEE_APPROACH_MS + MOVE_EFFECT_LAUNCH_MS;
    return {
      durationMs: FRAME_MS + MELEE_APPROACH_MS + moveEffectDurationMs + MELEE_RETREAT_MS + 450,
      effectStartMs,
      effectDurationMs: moveEffectDurationMs,
      kind: "melee",
    };
  }

  return {
    durationMs: MOVE_EFFECT_LAUNCH_MS + PROJECTILE_DURATION_MS + 650,
    effectStartMs: MOVE_EFFECT_LAUNCH_MS,
    effectDurationMs: PROJECTILE_DURATION_MS,
    kind: "projectile",
  };
}

function getMoveAnimationTimings(move, moveKind) {
  const base = getSingleMoveAnimationTimings(move, moveKind);
  const repeatCount = moveKind === "buff" ? 1 : getMoveRepeatCount(move);

  if (repeatCount <= 1) {
    return {
      ...base,
      repeatCount: 1,
      singleDurationMs: base.durationMs,
      repeatGapMs: 0,
      repeatStrideMs: base.durationMs,
    };
  }

  const repeatGapMs = REPEAT_CAST_GAP_MS;
  const repeatStrideMs = base.durationMs + repeatGapMs;
  return {
    ...base,
    repeatCount,
    singleDurationMs: base.durationMs,
    repeatGapMs,
    repeatStrideMs,
    durationMs: base.durationMs * repeatCount + repeatGapMs * (repeatCount - 1),
  };
}

function getAnimationRepeatState(animation, localMs = 0) {
  const move = animation?.move || {};
  const moveKind = animation?.moveKind || getExplicitMoveKind(move);
  const timings = animation?.timings || getMoveAnimationTimings(move, moveKind);
  const repeatCount = Math.max(1, Math.round(safeNumber(timings.repeatCount, 1)));
  const singleDurationMs = Math.max(1, safeNumber(timings.singleDurationMs, timings.durationMs || 1));
  const repeatGapMs = Math.max(0, safeNumber(timings.repeatGapMs, 0));
  const repeatStrideMs = Math.max(
    singleDurationMs,
    safeNumber(timings.repeatStrideMs, singleDurationMs + repeatGapMs)
  );
  const totalDurationMs = Math.max(singleDurationMs, safeNumber(timings.durationMs, singleDurationMs));
  const elapsed = clamp(localMs, 0, totalDurationMs);
  const repeatIndex = clamp(Math.floor(elapsed / repeatStrideMs), 0, repeatCount - 1);
  const elapsedInRepeat = elapsed - repeatIndex * repeatStrideMs;

  return {
    timings,
    repeatCount,
    repeatIndex,
    singleDurationMs,
    inGap: elapsedInRepeat > singleDurationMs,
    localMs: clamp(elapsedInRepeat, 0, singleDurationMs),
  };
}

function useAnimationClock(animation) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!animation?.startedAt) return undefined;

    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), FRAME_MS);
    const cleanupTimeout = window.setTimeout(
      () => window.clearInterval(interval),
      safeNumber(animation.durationMs, 0) + 900
    );

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(cleanupTimeout);
    };
  }, [animation?.id, animation?.startedAt, animation?.durationMs]);

  if (!animation?.startedAt) return 0;
  return clamp(now - animation.startedAt, 0, safeNumber(animation.durationMs, 0) + 900);
}

function useLoopingMoveStep(move) {
  const characterFrames = getMoveCharacterFrames(move);
  const effectFrames = getMoveEffectFrames(move);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const total = buildMoveOneShotSequenceFrames({
      charFrameCount: Math.max(1, characterFrames.length || 1),
      effectFrameCount: effectFrames.length,
    }).reduce((sum, step) => sum + step.duration, SIM_MOVE_CHAR_LAST_FRAME_HOLD);

    const interval = window.setInterval(() => {
      setFrame((prev) => (prev + 1) % total);
    }, FRAME_MS);

    return () => window.clearInterval(interval);
  }, [characterFrames.join("|"), effectFrames.join("|")]);

  return getOneShotPlaybackStepAtFrame(
    frame,
    Math.max(1, characterFrames.length || 1),
    effectFrames.length
  );
}

function AnimatedSprite({
  frames,
  fallback,
  alt,
  flipped = false,
  oneShotKey = "",
  frameMs = SPRITE_FRAME_MS,
  pauseMs = SPRITE_LOOP_PAUSE_MS,
  sx,
}) {
  const frameList = useMemo(() => getFramesFromCandidates([frames], fallback), [frames, fallback]);
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
      const isLast = currentFrame === frameList.length - 1;
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        currentFrame = (currentFrame + 1) % frameList.length;
        setFrameIndex(currentFrame);
        scheduleNextFrame();
      }, isLast ? pauseMs : frameMs);
    };

    scheduleNextFrame();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [frameList.join("|"), frameMs, pauseMs, oneShotKey]);

  const src = frameList[frameIndex] || fallback;
  if (!src) {
    return (
      <Box
        sx={{
          width: "100%",
          minHeight: 180,
          display: "grid",
          placeItems: "center",
          border: `1px dashed ${THEME.line}`,
          color: THEME.faint,
          ...sx,
        }}
      >
        No Image
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      draggable={false}
      sx={{
        display: "block",
        width: "100%",
        maxHeight: 300,
        objectFit: "contain",
        transform: flipped ? "scaleX(-1)" : "none",
        filter: "drop-shadow(0 18px 20px rgba(0,0,0,0.55))",
        userSelect: "none",
        pointerEvents: "none",
        ...sx,
      }}
    />
  );
}

function EffectStackRow({ effects }) {
  const activeEffects = EFFECTS.map((effect) => ({
    ...effect,
    value: getEffect(effects, effect.key),
  })).filter((effect) => effect.value > 0);

  if (!activeEffects.length) return null;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 0.75,
        minHeight: 36,
      }}
    >
      {activeEffects.map((effect) => (
        <Box
          key={effect.key}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.35,
            px: 0.65,
            py: 0.35,
            background: "rgba(0,0,0,0.38)",
          }}
        >
          <EffectTooltipIcon
            effectKey={effect.key}
            src={effect.icon}
            size={23}
            stackValue={effect.value}
          />
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: THEME.text }}>
            {Number(effect.value).toFixed(effect.value % 1 === 0 ? 0 : 1)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function StatStrip({ fighter }) {
  const adjusted = computeAttackerAdjustedStats(fighter.stats, fighter.effects);
  const defender = computeDefenderAdjustedStats(fighter.stats, fighter.effects);
  const stats = [
    ["STR", adjusted.strength],
    ["DEX", adjusted.dexterity],
    ["INT", adjusted.intelligence],
    ["RES", defender.resist],
    ["SPD", adjusted.speed],
  ];

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0.7 }}>
      {stats.map(([label, value]) => (
        <Box
          key={label}
          sx={{
            border: `1px solid ${THEME.line}`,
            background: "rgba(255,255,255,0.035)",
            p: 0.65,
            textAlign: "center",
          }}
        >
          <Typography sx={{ color: THEME.muted, fontSize: 9, letterSpacing: "0.12em" }}>
            {label}
          </Typography>
          <Typography sx={{ color: THEME.text, fontSize: 13, fontWeight: 800 }}>
            {Number(value || 0).toFixed(0)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function FighterPanel({ fighter, isMonster, animation }) {
  const hpPct = clamp((fighter.hp / Math.max(1, fighter.maxHp)) * 100, 0, 100);
  const cooldownPct = clamp(
    safeNumber(fighter.cooldown.remaining, 0) / Math.max(0.1, safeNumber(fighter.cooldown.total, 1)) * 100,
    0,
    100
  );
  const isActing = animation?.actorSide === fighter.side;
  const moveFrames = isActing ? getMoveCharacterFrames(animation?.move) : [];

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        minHeight: 430,
      }}
    >
      <Box sx={{ textAlign: "center" }}>
        <Typography
          sx={{
            color: THEME.text,
            fontFamily: "Jacques, Georgia, serif",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontSize: { xs: 14, md: 16 },
          }}
        >
          {fighter.name}
        </Typography>
        <Typography sx={{ color: THEME.muted, fontSize: 12 }}>
          {fighter.role === "monster" ? "Depths Monster" : `Champion #${fighter.assetId || ""}`}
        </Typography>
      </Box>

      <EffectStackRow effects={fighter.effects} />

      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
          <Typography sx={{ color: THEME.muted, fontSize: 11 }}>HP</Typography>
          <Typography sx={{ color: THEME.text, fontSize: 11, fontWeight: 800 }}>
            {Math.max(0, Math.round(fighter.hp))} / {Math.round(fighter.maxHp)}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={hpPct}
          sx={{
            height: 12,
            backgroundColor: "rgba(255,255,255,0.12)",
            "& .MuiLinearProgress-bar": {
              backgroundColor: hpPct > 35 ? THEME.gold : THEME.bad,
            },
          }}
        />
      </Box>

      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
          <Typography sx={{ color: THEME.muted, fontSize: 11 }}>Cooldown</Typography>
          <Typography sx={{ color: THEME.text, fontSize: 11, fontWeight: 800 }}>
            {safeNumber(fighter.cooldown.remaining, 0).toFixed(1)}s
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={cooldownPct}
          sx={{
            height: 7,
            backgroundColor: "rgba(255,255,255,0.12)",
            "& .MuiLinearProgress-bar": {
              backgroundColor: THEME.text,
            },
          }}
        />
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 270,
          display: "grid",
          placeItems: "end center",
          px: 1,
        }}
      >
        <AnimatedSprite
          frames={isActing && moveFrames.length ? moveFrames : fighter.idleFrames}
          fallback={fighter.standingUrl || fighter.imageUrl}
          alt={fighter.name}
          flipped={isMonster}
          oneShotKey={isActing ? animation?.id : ""}
          sx={{
            maxHeight: { xs: 235, md: 290 },
            opacity: fighter.hp <= 0 ? 0.32 : 1,
            transition: "opacity 260ms ease, transform 260ms ease",
          }}
        />
      </Box>

      <StatStrip fighter={fighter} />
    </Box>
  );
}

function BattleEffectLayer({ animation }) {
  const effectFrames = getMoveEffectFrames(animation?.move);
  const src = effectFrames[0] || animation?.move?.moveVisualUrl || animation?.move?.visualUrl || "";
  if (!animation || !src) return null;

  const isBuff = animation.moveKind === "buff";
  const fromLeft = animation.actorSide === "A";

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 5,
      }}
    >
      <AnimatedSprite
        frames={effectFrames}
        fallback={src}
        alt={`${animation.move?.name || "Move"} effect`}
        oneShotKey={animation.id}
        frameMs={MOVE_EFFECT_FRAME_MS}
        pauseMs={MOVE_EFFECT_FRAME_MS}
        sx={{
          position: "absolute",
          width: isBuff ? "16%" : "18%",
          maxHeight: 160,
          left: isBuff
            ? fromLeft
              ? "24%"
              : "76%"
            : fromLeft
            ? "33%"
            : "67%",
          top: isBuff ? "23%" : "49%",
          transform: isBuff
            ? "translate(-50%, -50%)"
            : fromLeft
            ? "translate(-50%, -50%)"
            : "translate(-50%, -50%) scaleX(-1)",
          animation: isBuff
            ? "depthsBuffFloat 1150ms ease-out both"
            : fromLeft
            ? "depthsProjectileRight 1050ms ease-out both"
            : "depthsProjectileLeft 1050ms ease-out both",
          filter: "drop-shadow(0 0 18px rgba(255,255,255,0.30))",
          "@keyframes depthsProjectileRight": {
            "0%": { left: "35%", opacity: 0 },
            "18%": { opacity: 1 },
            "100%": { left: "66%", opacity: 0.1 },
          },
          "@keyframes depthsProjectileLeft": {
            "0%": { left: "65%", opacity: 0 },
            "18%": { opacity: 1 },
            "100%": { left: "34%", opacity: 0.1 },
          },
          "@keyframes depthsBuffFloat": {
            "0%": { opacity: 0, marginTop: 44 },
            "20%": { opacity: 1 },
            "100%": { opacity: 0.15, marginTop: -58 },
          },
        }}
      />
    </Box>
  );
}

function FloatingPopup({ popup }) {
  if (!popup) return null;

  const fallbackLines = String(popup.text || "")
    .split("\n")
    .filter(Boolean)
    .map((text, index) => ({ text, tone: index === 0 ? popup.kind : "effect" }));
  const popupLines =
    Array.isArray(popup.lines) && popup.lines.length > 0 ? popup.lines : fallbackLines;

  const getLineColor = (line, index) => {
    const tone = line?.tone || (index === 0 ? popup.kind : "effect");
    if (tone === "heal") return THEME.good;
    if (tone === "critHeal") return THEME.good;
    if (tone === "miss") return THEME.text;
    if (tone === "effect") return THEME.gold;
    if (tone === "crit") return "#ffef9f";
    return THEME.bad;
  };

  const getLineFontSize = (line, index) => {
    const tone = line?.tone || (index === 0 ? popup.kind : "effect");
    const kind = line?.kind || popup.kind;
    if (kind === "resist") return 20;
    if (tone === "miss" || kind === "miss") return 14;
    if (line?.large || (index === 0 && (popup.kind === "crit" || popup.kind === "critHeal"))) {
      return 40;
    }
    if (index === 0) return 27;
    return 18;
  };

  const getLineIconSize = (line, index) => {
    const tone = line?.tone || (index === 0 ? popup.kind : "effect");
    const kind = line?.kind || popup.kind;
    if (kind === "resist" || tone === "miss" || kind === "miss") return 15;
    return index === 0 ? 28 : 23;
  };

  return (
    <Box
      sx={{
        position: "absolute",
        zIndex: 20,
        left: `${safeNumber(popup.leftPct, popup.side === "A" ? 36 : 78)}%`,
        top: `${safeNumber(popup.topPct, popup.side === "A" ? 47 : 41)}%`,
        transform: "translate(-50%, -100%)",
        px: 1.7,
        py: 0.95,
        fontWeight: 900,
        lineHeight: 1.12,
        textAlign: "center",
        maxWidth: 280,
        textShadow: "0 2px 0 #000, 0 0 20px rgba(255,255,255,0.38)",
        pointerEvents: "none",
        filter: popup.kind === "crit" || popup.kind === "critHeal"
          ? "drop-shadow(0 0 14px rgba(255,239,159,0.34))"
          : "drop-shadow(0 0 10px rgba(0,0,0,0.55))",
        animation: `depthsPopupRise ${POPUP_ANIMATION_MS}ms linear both`,
        animationDelay: popup.delayMs ? `${Math.max(0, safeNumber(popup.delayMs, 0))}ms` : undefined,
        "@keyframes depthsPopupRise": {
          "0%": { opacity: 0, marginTop: 0 },
          "10%": { opacity: 1, marginTop: -2 },
          "82%": { opacity: 1, marginTop: -16 },
          "100%": { opacity: 0, marginTop: -20 },
        },
      }}
    >
      {popupLines.map((line, index) => (
        <Box
          key={`${line.text}-${index}`}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.7,
            color: getLineColor(line, index),
            fontSize: getLineFontSize(line, index),
            mt: index === 0 ? 0 : 0.45,
            whiteSpace: "nowrap",
          }}
        >
          {line.icon ? (
            <Box
              component="img"
              src={line.icon}
              alt=""
              sx={{
                width: getLineIconSize(line, index),
                height: getLineIconSize(line, index),
                objectFit: "contain",
                filter: "drop-shadow(0 0 10px rgba(255,255,255,0.32))",
              }}
            />
          ) : null}
          <Box component="span">{line.text}</Box>
        </Box>
      ))}
    </Box>
  );
}

function DepthsVolumeToggle({
  enabled,
  value,
  label,
  onToggle,
  onVolumeChange,
  enabledIcon,
  disabledIcon,
}) {
  const buttonSx = {
    width: 34,
    height: 34,
    color: THEME.text,
    border: `1px solid ${THEME.lineStrong}`,
    borderRadius: "50%",
    background: "rgba(0,0,0,0.62)",
    backdropFilter: "blur(6px)",
    "&:hover": {
      background: "rgba(225,184,100,0.22)",
      borderColor: THEME.gold,
    },
  };

  return (
    <Box
      sx={{
        position: "relative",
        display: "grid",
        justifyItems: "center",
        gap: 0.45,
        pb: 0.4,
        "&:hover .depthsVolumeTrail, &:focus-within .depthsVolumeTrail": {
          opacity: 1,
          pointerEvents: "auto",
          transform: "translateY(0)",
        },
      }}
    >
      <Tooltip title={enabled ? `Turn ${label} off` : `Turn ${label} on`} arrow placement="right">
        <IconButton
          aria-label={enabled ? `Turn ${label} off` : `Turn ${label} on`}
          onClick={onToggle}
          sx={{
            ...buttonSx,
            color: enabled ? THEME.gold : THEME.faint,
          }}
        >
          {enabled ? enabledIcon : disabledIcon}
        </IconButton>
      </Tooltip>
      <Box
        className="depthsVolumeTrail"
        sx={{
          position: "absolute",
          top: 39,
          left: "50%",
          width: 32,
          height: 112,
          display: "grid",
          placeItems: "center",
          transform: "translateY(-10px)",
          opacity: 0,
          pointerEvents: "none",
          transition: "opacity 160ms ease, transform 180ms ease",
          border: `1px solid ${THEME.line}`,
          borderRadius: 999,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(6px)",
          boxShadow: "0 18px 34px rgba(0,0,0,0.48)",
          zIndex: 26,
        }}
      >
        <Slider
          aria-label={`${label} volume`}
          orientation="vertical"
          min={0}
          max={100}
          step={1}
          value={Math.round(clamp(safeNumber(value, 0.5), 0, 1) * 100)}
          onChange={(_, nextValue) => {
            const rawValue = Array.isArray(nextValue) ? nextValue[0] : nextValue;
            onVolumeChange?.(safeNumber(rawValue, 0) / 100);
          }}
          sx={{
            height: 82,
            color: THEME.gold,
            "& .MuiSlider-rail": { opacity: 0.35, backgroundColor: THEME.text },
            "& .MuiSlider-track": { border: "none" },
            "& .MuiSlider-thumb": {
              width: 12,
              height: 12,
              border: `2px solid ${THEME.gold}`,
              backgroundColor: "#050505",
              "&:hover, &.Mui-focusVisible": {
                boxShadow: "0 0 0 6px rgba(225,184,100,0.18)",
              },
            },
          }}
        />
      </Box>
    </Box>
  );
}

function DepthsAudioControls({
  settings,
  onToggleMusic,
  onToggleSfx,
  onMusicVolumeChange,
  onSfxVolumeChange,
}) {
  return (
    <Box
      sx={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 24,
        display: "flex",
        gap: 0.75,
        alignItems: "flex-start",
      }}
    >
      <DepthsVolumeToggle
        label="battle music"
        enabled={settings?.music}
        value={settings?.musicVolume}
        onToggle={onToggleMusic}
        onVolumeChange={onMusicVolumeChange}
        enabledIcon={<MusicNoteIcon sx={{ fontSize: 19 }} />}
        disabledIcon={<MusicOffIcon sx={{ fontSize: 19 }} />}
      />
      <DepthsVolumeToggle
        label="battle sounds"
        enabled={settings?.sfx}
        value={settings?.sfxVolume}
        onToggle={onToggleSfx}
        onVolumeChange={onSfxVolumeChange}
        enabledIcon={<VolumeUpIcon sx={{ fontSize: 19 }} />}
        disabledIcon={<VolumeOffIcon sx={{ fontSize: 19 }} />}
      />
    </Box>
  );
}

function getEffectPopupLine(effectEvent, targetName = "") {
  if (effectEvent?.popupLine) return effectEvent.popupLine;
  if (!effectEvent?.effectName) return "";
  const effectKey = String(effectEvent.effectName).toLowerCase();
  const icon = EFFECT_ICON_BY_KEY[effectKey] || "";
  const prefix = targetName ? `${targetName}: ` : "";
  if (effectEvent.resisted) {
    return {
      text: `${prefix}RESIST`,
      icon,
      tone: "miss",
      kind: "resist",
      large: true,
    };
  }
  if (!effectEvent.amount) return "";
  return { text: `${prefix}${effectEvent.effectName} +${effectEvent.amount}`, icon, tone: "effect" };
}

function DepthsBattleStatIconPill({ icon, value, alt = "", compact = false, tone = THEME.text }) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 0.3 : 0.45,
        minHeight: compact ? 18 : 22,
        px: compact ? 0.45 : 0.65,
        py: 0.18,
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
        sx={{
          width: compact ? 11 : 15,
          height: compact ? 11 : 15,
          objectFit: "contain",
          flex: "0 0 auto",
        }}
      />
      <Typography sx={{ color: tone, fontSize: compact ? 8 : 10, fontWeight: 900, lineHeight: 1 }}>
        {value}
      </Typography>
    </Box>
  );
}

function MovePreviewCard({
  move,
  fighter,
  disabled,
  onClick,
  selectable = false,
  compact = false,
  cardLabel = "",
  showDeckCount = true,
}) {
  const characterFrames = getMoveCharacterFrames(move);
  const upgradeLabels = asArray(getMoveCardUpgradeMeta(move).labels);
  const effectiveSpeed = getEffectiveSpeed(fighter?.stats || {}, fighter?.effects || {});
  const adjustedCooldown = computeEffectiveCooldownSeconds(getMoveCooldown(move), effectiveSpeed);
  const effectRows = getMoveEffectDisplayRows(move, fighter);
  const targetLabel = getMoveTargetLabel(move);
  const displayPower = getMovePowerBreakdown(move, fighter).finalValue;
  const displayAccuracy = getMoveAccuracy(move, fighter);
  const deckCopies = getMoveDeckCopies(move);
  const thirdFrameIndex = Math.min(2, Math.max(0, characterFrames.length - 1));
  const charSrc =
    characterFrames[thirdFrameIndex] ||
    fighter?.standingUrl ||
    fighter?.imageUrl;

  return (
    <Box
      component={selectable ? "button" : "div"}
      type={selectable ? "button" : undefined}
      disabled={selectable ? disabled : undefined}
      onClick={selectable && !disabled ? onClick : undefined}
      sx={{
        width: "100%",
        minHeight: compact ? 156 : 214,
        p: compact ? 0.6 : 1,
        textAlign: "left",
        color: THEME.text,
        border: `1px solid ${selectable && !disabled ? THEME.lineStrong : THEME.line}`,
        borderRadius: 0,
        background:
          selectable && !disabled
            ? "linear-gradient(180deg, rgba(255,255,255,0.11), rgba(0,0,0,0.92))"
            : "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(0,0,0,0.86))",
        opacity: selectable && disabled ? 0.48 : 1,
        cursor: selectable && !disabled ? "pointer" : "default",
        font: "inherit",
        "&:hover": selectable && !disabled
          ? {
              background: "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(0,0,0,0.90))",
            }
          : undefined,
      }}
    >
      <Box
        sx={{
          position: "relative",
          height: compact ? 44 : 74,
          overflow: "hidden",
          border: `1px solid ${THEME.line}`,
          background: "rgba(0,0,0,0.68)",
          mb: 0.85,
        }}
      >
        {charSrc ? (
          <Box
            component="img"
            src={charSrc}
            alt=""
            sx={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              width: compact ? "36%" : "44%",
              height: "92%",
              objectFit: "contain",
              transform: "translateX(-50%)",
              filter: "drop-shadow(0 8px 10px rgba(0,0,0,0.48))",
            }}
          />
        ) : null}
        {cardLabel ? (
          <Box
            sx={{
              position: "absolute",
              top: 4,
              left: 4,
              px: 0.45,
              py: 0.12,
              color: "#111",
              background: THEME.gold,
              fontSize: compact ? 7 : 9,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {cardLabel}
          </Box>
        ) : null}
        {showDeckCount ? <DepthsDeckCountBadge count={deckCopies} compact={compact} /> : null}
      </Box>

      <Typography sx={{ fontWeight: 900, fontSize: compact ? 10 : 12, lineHeight: 1.15 }}>
        {move.name}
      </Typography>
      <Typography sx={{ color: THEME.muted, fontSize: compact ? 8 : 10, textTransform: "uppercase", mt: 0.25 }}>
        {move.type} | {targetLabel} | {adjustedCooldown.toFixed(1)}s CD
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.35, mt: 0.45 }}>
        <DepthsBattleStatIconPill
          icon={POWER_ICON_SRC}
          alt="power"
          value={Number(displayPower || 0).toFixed(0)}
          compact={compact}
        />
        <DepthsBattleStatIconPill
          icon={ACCURACY_ICON_SRC}
          alt="accuracy"
          value={Number(displayAccuracy || 0).toFixed(0)}
          compact={compact}
        />
      </Box>
      {effectRows.length ? (
        <Box sx={{ display: "grid", gap: 0.35, mt: 0.45 }}>
          {effectRows.map((row) => (
            <Box
              key={row.key}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.4,
                color: THEME.gold,
                fontSize: compact ? 8 : 10,
                lineHeight: 1.15,
                minWidth: 0,
              }}
            >
              {row.icon ? (
                <EffectTooltipIcon
                  effectKey={row.effectKey}
                  src={row.icon}
                  size={compact ? 12 : 16}
                />
              ) : null}
              <Box component="span" sx={{ whiteSpace: "normal", overflowWrap: "anywhere" }}>
                {row.effectKey} +{formatDisplayNumber(row.amount)}
                {row.fromUpgrade || row.upgradeBonus || row.potencyBonus ? (
                  <Box component="span" sx={{ display: "block", color: THEME.faint, fontSize: compact ? 7 : 8, mt: 0.1 }}>
                    {row.fromUpgrade
                      ? "from upgrade"
                      : `base ${formatDisplayNumber(row.baseAmount)}${
                          row.upgradeBonus ? ` ${formatSignedDisplayNumber(row.upgradeBonus)}` : ""
                        }${row.potencyBonus ? ` +${formatDisplayNumber(row.potencyBonus)} potency` : ""}`}
                  </Box>
                ) : null}
              </Box>
            </Box>
          ))}
        </Box>
      ) : null}
      {upgradeLabels.length ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.35, mt: 0.45 }}>
          {upgradeLabels.slice(0, 2).map((label) => (
            <Box
              key={label}
              sx={{
                px: 0.45,
                py: 0.15,
                color: THEME.text,
                border: `1px solid ${THEME.line}`,
                fontSize: compact ? 7 : 9,
                fontWeight: 900,
                lineHeight: 1.1,
                background: "rgba(255,255,255,0.055)",
              }}
            >
              {label}
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

function MoveBoardPanel({
  title,
  fighter,
  selectable,
  disabled,
  onMoveSelect,
  vertical = false,
  horizontal = false,
  cards = null,
  cardState = null,
  showDeckCounts = true,
}) {
  const usesCards = Array.isArray(cards);
  const rows = usesCards
    ? cards
        .map((entry, index) => ({
          move: entry.move || findMoveForCard(fighter, entry.card),
          card: entry.card || null,
          label: entry.label || `Card ${index + 1}`,
        }))
        .filter((entry) => entry.move)
    : asArray(fighter.moves)
        .slice(0, 3)
        .map((move) => ({ move, card: null, label: "" }));

  return (
    <Box
      sx={{
        border: `1px solid ${THEME.line}`,
        background: "rgba(0,0,0,0.76)",
        p: vertical || horizontal ? 0.8 : 1,
        minHeight: vertical || horizontal ? "auto" : 232,
        width: "100%",
        boxShadow: horizontal ? "0 16px 38px rgba(0,0,0,0.42)" : "none",
      }}
    >
      <Typography
        sx={{
          color: THEME.text,
          fontFamily: "Jacques, Georgia, serif",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontSize: vertical || horizontal ? 10 : 12,
          mb: horizontal ? 0.7 : 1,
          textAlign: horizontal ? "center" : "left",
        }}
      >
        {title}
      </Typography>
      {horizontal ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "stretch",
            gap: { xs: 0.8, sm: 1 },
            overflowX: "auto",
            px: 0.25,
            pb: 0.25,
          }}
        >
          {rows.map((entry) => (
            <Box
              key={entry.card?.cardId || entry.move.id}
              sx={{
                flex: "0 0 auto",
                width: { xs: 132, sm: 148, md: 164 },
              }}
            >
              <MovePreviewCard
                move={entry.move}
                fighter={fighter}
                selectable={selectable}
                disabled={disabled}
                onClick={() => onMoveSelect?.(entry.move)}
                compact
                cardLabel={entry.label}
                showDeckCount={showDeckCounts}
              />
            </Box>
          ))}
        </Box>
      ) : (
        <Grid container spacing={0.8}>
          {rows.map((entry) => (
            <Grid item xs={12} sm={vertical ? 12 : 4} key={entry.card?.cardId || entry.move.id}>
              <MovePreviewCard
                move={entry.move}
                fighter={fighter}
                selectable={selectable}
                disabled={disabled}
                onClick={() => onMoveSelect?.(entry.move)}
                compact={vertical}
                cardLabel={entry.label}
                showDeckCount={showDeckCounts}
              />
            </Grid>
          ))}
        </Grid>
      )}
      {!rows.length ? (
        <Typography sx={{ color: THEME.muted, fontSize: vertical || horizontal ? 9 : 12, lineHeight: 1.35, textAlign: horizontal ? "center" : "left" }}>
          {usesCards ? "Cards draw when the champion is ready." : "No moves found."}
        </Typography>
      ) : null}
      {cardState ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: horizontal ? "center" : "space-between",
            gap: 0.6,
            mt: 0.9,
            color: THEME.muted,
            fontSize: vertical || horizontal ? 8 : 10,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          <Box>Deck {asArray(cardState.drawPile).length}</Box>
          <Box>Discard {asArray(cardState.discardPile).length}</Box>
        </Box>
      ) : null}
    </Box>
  );
}

function FighterHud({ fighter, compact = false }) {
  const hpPct = clamp((fighter.hp / Math.max(1, fighter.maxHp)) * 100, 0, 100);
  const cooldownPct = clamp(
    (safeNumber(fighter.cooldown.remaining, 0) /
      Math.max(0.1, safeNumber(fighter.cooldown.total, 1))) *
      100,
    0,
    100
  );

  return (
    <Box
      sx={{
        minWidth: compact ? { xs: 86, md: 118 } : 190,
        maxWidth: compact ? { xs: 112, md: 148 } : 260,
        mx: "auto",
      }}
    >
      <Typography
        sx={{
          color: THEME.text,
          fontFamily: "Jacques, Georgia, serif",
          letterSpacing: compact ? "0.06em" : "0.14em",
          textTransform: "uppercase",
          textAlign: "center",
          fontSize: compact ? { xs: 8.5, md: 10 } : 13,
          lineHeight: 1.2,
        }}
      >
        {fighter.name}
      </Typography>
      {!compact ? (
        <Typography sx={{ color: THEME.muted, fontSize: 10, textAlign: "center", mb: 0.6 }}>
          {fighter.role === "monster" ? "Monster" : `Champion #${fighter.assetId || ""}`}
        </Typography>
      ) : null}
      <LinearProgress
        variant="determinate"
        value={hpPct}
        sx={{
          height: compact ? 7 : 10,
          backgroundColor: "rgba(255,255,255,0.12)",
          "& .MuiLinearProgress-bar": {
            backgroundColor: hpPct > 35 ? THEME.gold : THEME.bad,
          },
        }}
      />
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: compact ? 0.15 : 0.3 }}>
        <Typography sx={{ color: THEME.muted, fontSize: compact ? 8 : 10 }}>HP</Typography>
        <Typography sx={{ color: THEME.text, fontSize: compact ? 8 : 10, fontWeight: 800 }}>
          {Math.max(0, Math.round(fighter.hp))} / {Math.round(fighter.maxHp)}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={cooldownPct}
        sx={{
          height: compact ? 3 : 5,
          mt: compact ? 0.3 : 0.55,
          backgroundColor: "rgba(255,255,255,0.12)",
          "& .MuiLinearProgress-bar": { backgroundColor: THEME.text },
        }}
      />
      <Typography sx={{ color: THEME.muted, fontSize: compact ? 8 : 10, textAlign: "right", mt: 0.1 }}>
        {safeNumber(fighter.cooldown.remaining, 0).toFixed(1)}s
      </Typography>
    </Box>
  );
}

function formatDisplayNumber(value) {
  const n = safeNumber(value, 0);
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

function formatSignedDisplayNumber(value) {
  const n = safeNumber(value, 0);
  return `${n >= 0 ? "+" : ""}${formatDisplayNumber(n)}`;
}

function getDepthsAbilityStatTotals(abilities = []) {
  return asArray(abilities).reduce((acc, ability) => {
    Object.entries(ability?.statBonuses || {}).forEach(([key, value]) => {
      acc[key] = safeNumber(acc[key], 0) + safeNumber(value, 0);
    });
    return acc;
  }, {});
}

function getFighterAdjustedSheetStats(fighter) {
  const baseStats = fighter?.stats || {};
  const attackerStats = computeAttackerAdjustedStats(baseStats, fighter?.effects || {});
  const defenderStats = computeDefenderAdjustedStats(baseStats, fighter?.effects || {});

  return {
    health: safeNumber(baseStats.health, 0),
    speed: attackerStats.speed,
    resist: defenderStats.resist,
    strength: attackerStats.strength,
    dexterity: attackerStats.dexterity,
    intelligence: attackerStats.intelligence,
    critChance: attackerStats.critChance,
    critDamage: safeNumber(baseStats.critDamage, 200),
  };
}

const DEPTHS_POPUP_STAT_LABELS = {
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

const DEPTHS_POPUP_ATTACK_LABELS = {
  melee: "melee",
  ranged: "ranged",
  magic: "magic",
  curse: "curse",
};

function getDepthsPopupLabel(value = "") {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getDepthsPopupStatRow(key, value) {
  const suffix = key === "critChance" || key === "critDamage" ? "%" : "";
  const label = DEPTHS_POPUP_STAT_LABELS[key] || getDepthsPopupLabel(key).toLowerCase();
  return `${formatSignedDisplayNumber(value)}${suffix} ${label}`;
}

function getDepthsPopupEffectAmount(entry = {}) {
  return `${formatSignedDisplayNumber(entry.amount)} ${getDepthsPopupLabel(
    entry.effectKey || entry.resistedEffect
  ).toLowerCase()}`;
}

function getDepthsPopupAttackTrigger(entry = {}) {
  if (entry.type === "apply_on_crit") return "critical hits";
  const attackType = entry.attackType
    ? DEPTHS_POPUP_ATTACK_LABELS[entry.attackType] || entry.attackType
    : "";
  return attackType ? `${attackType} hits` : "damage hits";
}

function describeDepthsPopupBattleOnly(entry = {}) {
  const effect = getDepthsPopupEffectAmount(entry);
  if (entry.type === "resistance") return `${formatDisplayNumber(entry.amount)}% ${getDepthsPopupLabel(entry.resistedEffect).toLowerCase()} resistance`;
  if (entry.type === "gain_start_of_battle") return `room start: gain ${effect}`;
  if (entry.type === "apply_start_of_battle") return `room start: apply ${effect} to a monster`;
  if (entry.type === "gain_on_hit") return `${getDepthsPopupAttackTrigger(entry)}: gain ${effect}`;
  if (entry.type === "apply_on_crit") return `critical hits: apply ${effect}`;
  if (entry.type === "heal_for_applied_stacks") {
    return `heal ${formatDisplayNumber(entry.amount)} HP per ${getDepthsPopupLabel(
      entry.sourceEffectKey || entry.effectKey
    ).toLowerCase()} stack applied`;
  }
  if (entry.type === "heal_when_stacks_applied") {
    return `heal ${formatDisplayNumber(entry.amount)} HP when ${getDepthsPopupLabel(
      entry.sourceEffectKey || entry.effectKey
    ).toLowerCase()} stacks are applied`;
  }
  return `${getDepthsPopupAttackTrigger(entry)}: apply ${effect}`;
}

function getAbilitySummaryRows(ability = {}) {
  const rows = [];
  Object.entries(ability.statBonuses || {}).forEach(([key, value]) => {
    rows.push(getDepthsPopupStatRow(key, value));
  });
  Object.entries(ability.moveAccuracy || {}).forEach(([key, value]) => {
    const label = DEPTHS_POPUP_ATTACK_LABELS[key] || getDepthsPopupLabel(key).toLowerCase();
    rows.push(`${label} moves gain ${formatSignedDisplayNumber(value)} accuracy`);
  });
  asArray(ability.battleOnly).forEach((entry) => {
    rows.push(describeDepthsPopupBattleOnly(entry));
  });

  const meta = ability.depthsAbilityMeta || {};
  if (meta.lifeStealPct) rows.push(`lifesteal: heal ${formatDisplayNumber(meta.lifeStealPct)}% of damage dealt`);
  if (meta.lowHpDamage) {
    rows.push(
      `finisher: +${formatDisplayNumber(meta.lowHpDamage.flatDamage)} damage below ${formatDisplayNumber(
        meta.lowHpDamage.thresholdPct
      )}% HP`
    );
  }
  if (meta.secondWind) {
    rows.push(
      `second breath: once/room below ${formatDisplayNumber(
        meta.secondWind.thresholdPct
      )}% HP, heal ${formatDisplayNumber(meta.secondWind.healPct)}% and gain ${formatDisplayNumber(
        meta.secondWind.shield
      )} shield`
    );
  }

  return rows;
}

function getArtifactSummaryRows(artifact = {}) {
  const rows = getAbilitySummaryRows(artifact);
  const meta = artifact.artifactMeta || {};

  if (meta.damageDealtPct) rows.push(`${formatSignedDisplayNumber(meta.damageDealtPct)}% damage dealt`);
  if (meta.damageTakenPct) rows.push(`${formatSignedDisplayNumber(meta.damageTakenPct)}% damage taken`);
  if (meta.healingDonePct) rows.push(`${formatSignedDisplayNumber(meta.healingDonePct)}% healing`);
  if (meta.damageBonusFlat) rows.push(`${formatSignedDisplayNumber(meta.damageBonusFlat)} damage`);
  if (meta.healOnKillPct) rows.push(`heal ${formatDisplayNumber(meta.healOnKillPct)}% max HP on kill`);
  if (meta.firstBuffNoCooldown) rows.push("first buff card each room has no cooldown");
  if (meta.firstDamageNoCooldown) rows.push("first damage or curse card each room has no cooldown");
  Object.entries(meta.effectPotencyBonus || {}).forEach(([key, value]) => {
    rows.push(`${formatSignedDisplayNumber(value)} ${getDepthsPopupLabel(key).toLowerCase()} stacks applied`);
  });

  return rows;
}

function getChampionPassiveRows(fighter = {}) {
  const rows = [];
  const abilityMeta = fighter?.depthsAbilityMeta || {};
  const artifactMeta = getDepthsArtifactMeta(fighter);

  if (abilityMeta.lifeStealPct) {
    rows.push({
      key: "lifesteal",
      icon: DEPTHS_STAT_ICON_BY_KEY.health,
      title: "Lifesteal",
      text: `Heal ${formatDisplayNumber(abilityMeta.lifeStealPct)}% of damage dealt.`,
    });
  }

  if (abilityMeta.lowHpDamage) {
    rows.push({
      key: "low-hp-damage",
      icon: POWER_ICON_SRC,
      title: "Finisher",
      text: `Deal +${formatDisplayNumber(abilityMeta.lowHpDamage.flatDamage)} damage to targets at or below ${formatDisplayNumber(abilityMeta.lowHpDamage.thresholdPct)}% HP.`,
    });
  }

  if (abilityMeta.secondWind) {
    rows.push({
      key: "second-wind",
      icon: EFFECT_ICON_BY_KEY.shield,
      title: "Second Breath",
      text: `Once per room below ${formatDisplayNumber(abilityMeta.secondWind.thresholdPct)}% HP, heal ${formatDisplayNumber(abilityMeta.secondWind.healPct)}% and gain ${formatDisplayNumber(abilityMeta.secondWind.shield)} shield.`,
    });
  }

  if (artifactMeta.damageDealtPct) {
    rows.push({
      key: "damage-dealt",
      icon: POWER_ICON_SRC,
      title: "Damage Dealt",
      text: `${formatSignedDisplayNumber(artifactMeta.damageDealtPct)}% damage dealt.`,
    });
  }

  if (artifactMeta.damageTakenPct) {
    rows.push({
      key: "damage-taken",
      icon: DEPTHS_STAT_ICON_BY_KEY.resist,
      title: "Damage Taken",
      text: `${formatSignedDisplayNumber(artifactMeta.damageTakenPct)}% damage taken.`,
    });
  }

  if (artifactMeta.healingDonePct) {
    rows.push({
      key: "healing-done",
      icon: DEPTHS_STAT_ICON_BY_KEY.health,
      title: "Healing",
      text: `${formatSignedDisplayNumber(artifactMeta.healingDonePct)}% healing done.`,
    });
  }

  if (artifactMeta.damageBonusFlat) {
    rows.push({
      key: "damage-bonus-flat",
      icon: POWER_ICON_SRC,
      title: "Flat Damage",
      text: `${formatSignedDisplayNumber(artifactMeta.damageBonusFlat)} damage on damaging hits.`,
    });
  }

  if (artifactMeta.healOnKillPct) {
    rows.push({
      key: "heal-on-kill",
      icon: DEPTHS_STAT_ICON_BY_KEY.health,
      title: "Kill Heal",
      text: `Heal ${formatDisplayNumber(artifactMeta.healOnKillPct)}% max HP after defeating an enemy.`,
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

function getArtifactSummaryIcons(text = "") {
  const value = String(text || "").toLowerCase();
  const icons = [];
  const addIcon = (icon, key) => {
    if (!icon || icons.some((entry) => entry.icon === icon)) return;
    icons.push({ icon, key });
  };

  Object.entries(EFFECT_ICON_BY_KEY).forEach(([key, icon]) => {
    const aliases = key === "bleed" ? ["bleed", "bleeding"] : [key];
    if (aliases.some((alias) => new RegExp(`\\b${alias}\\b`, "i").test(value))) {
      addIcon(icon, key);
    }
  });

  [
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
  ].forEach(([key, pattern]) => {
    if (pattern.test(value)) addIcon(DEPTHS_STAT_ICON_BY_KEY[key], key);
  });

  return icons.slice(0, 4);
}

function ArtifactSummaryRow({ text }) {
  const icons = getArtifactSummaryIcons(text);

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.45,
        minHeight: 24,
        maxWidth: "100%",
        px: 0.75,
        py: 0.35,
        color: THEME.text,
        border: `1px solid ${THEME.line}`,
        borderRadius: 1,
        background: "rgba(0,0,0,0.4)",
      }}
    >
      {icons.map((entry) => (
        getArenaEffectInfo(entry.key) ? (
          <EffectTooltipIcon
            key={`${entry.key}-${entry.icon}`}
            effectKey={entry.key}
            src={entry.icon}
            size={15}
          />
        ) : (
          <Box
            key={`${entry.key}-${entry.icon}`}
            component="img"
            src={entry.icon}
            alt=""
            draggable={false}
            sx={{ width: 15, height: 15, objectFit: "contain", flex: "0 0 auto" }}
          />
        )
      ))}
      <Typography sx={{ color: THEME.text, fontSize: 9, fontWeight: 800, lineHeight: 1.25, overflowWrap: "anywhere" }}>
        {text}
      </Typography>
    </Box>
  );
}

function MoveValueBreakdown({ baseValue, finalValue, modifierLabel, rows = null, decimals = 1 }) {
  const baseNumber = safeNumber(baseValue, 0);
  const finalNumber = safeNumber(finalValue, 0);
  const modifierValue = finalNumber - baseNumber;
  const displayRows = Array.isArray(rows) && rows.length
    ? rows
    : modifierValue
    ? [{ key: "modifier", value: modifierValue, label: modifierLabel }]
    : [];

  if (!displayRows.length) return null;

  return (
    <Box sx={{ mt: 0.45 }}>
      <Typography sx={{ color: THEME.muted, display: "block", fontSize: 10, lineHeight: 1.2, textAlign: "center" }}>
        base {baseNumber.toFixed(decimals)}
      </Typography>
      {displayRows.map((row) => (
        <Typography
          key={row.key || row.label}
          sx={{
            color: getDeltaColor(safeNumber(row.value, 0)),
            display: "block",
            fontSize: 10,
            lineHeight: 1.2,
            textAlign: "center",
          }}
        >
          {formatSignedFixed(row.value, decimals)} {row.label}
        </Typography>
      ))}
      <Typography sx={{ color: THEME.muted, display: "block", fontSize: 10, lineHeight: 1.2, textAlign: "center" }}>
        = {finalNumber.toFixed(decimals)}
      </Typography>
    </Box>
  );
}

function MoveAccuracyBreakdown({ breakdown }) {
  const parts = [];

  if (safeNumber(breakdown?.accuracyUpgradeBonus, 0) !== 0) {
    parts.push({
      label: `from ${breakdown.accuracyUpgradeLabel || "card upgrades"}`,
      value: safeNumber(breakdown.accuracyUpgradeBonus, 0),
    });
  }
  if (safeNumber(breakdown?.characterMoveAccuracyBonus, 0) !== 0) {
    parts.push({
      label: "character move accuracy",
      value: safeNumber(breakdown.characterMoveAccuracyBonus, 0),
    });
  }
  if (safeNumber(breakdown?.statusAccuracyBonus, 0) !== 0) {
    parts.push({
      label: "status / effect accuracy",
      value: safeNumber(breakdown.statusAccuracyBonus, 0),
    });
  }
  if (safeNumber(breakdown?.typeAccuracyBonus, 0) !== 0) {
    parts.push({
      label: "type accuracy",
      value: safeNumber(breakdown.typeAccuracyBonus, 0),
    });
  }
  if (safeNumber(breakdown?.curseAccuracyBonus, 0) !== 0) {
    parts.push({
      label: "curse type accuracy",
      value: safeNumber(breakdown.curseAccuracyBonus, 0),
    });
  }
  if (safeNumber(breakdown?.allAccuracyBonus, 0) !== 0) {
    parts.push({
      label: "all move accuracy",
      value: safeNumber(breakdown.allAccuracyBonus, 0),
    });
  }

  if (!parts.length) return null;

  return (
    <Box sx={{ mt: 0.45 }}>
      <Typography sx={{ color: THEME.muted, display: "block", fontSize: 10, lineHeight: 1.2, textAlign: "center" }}>
        base {safeNumber(breakdown?.baseValue, 0).toFixed(1)}
      </Typography>
      {parts.map((part, index) => (
        <Typography
          key={`${part.label}-${index}`}
          sx={{ color: getDeltaColor(part.value), display: "block", fontSize: 10, lineHeight: 1.2, textAlign: "center" }}
        >
          {formatSignedFixed(part.value, 1)} {part.label}
        </Typography>
      ))}
      <Typography sx={{ color: THEME.muted, display: "block", fontSize: 10, lineHeight: 1.2, textAlign: "center" }}>
        = {safeNumber(breakdown?.finalValue, 0).toFixed(1)}
      </Typography>
    </Box>
  );
}

function DepthsSheetMoveAnimationPreview({ move, fighter, deckCopies = 1 }) {
  const characterFrames = getMoveCharacterFrames(move);
  const effectFrames = getMoveEffectFrames(move);
  const step = useLoopingMoveStep(move);
  const layout = getMovePreviewLayout(move?.type);
  const stageRef = useRef(null);
  const characterImgRef = useRef(null);
  const effectImgRef = useRef(null);
  const [buffEffectTopPx, setBuffEffectTopPx] = useState(null);

  const currentCharacterSrc =
    characterFrames[Math.min(safeNumber(step?.charIndex, 0), Math.max(0, characterFrames.length - 1))] ||
    characterFrames[0] ||
    move?.characterUrl ||
    "";
  const hasEffect = safeNumber(step?.effectIndex, -1) >= 0 && effectFrames.length > 0;
  const currentEffectSrc = hasEffect
    ? effectFrames[Math.min(safeNumber(step.effectIndex, 0), effectFrames.length - 1)]
    : "";
  const charProgress = Math.min(Math.max(safeNumber(step?.charIndex, 0), 0), 3) / 3;
  const effectProgress = hasEffect ? safeNumber(step?.effectProgress, 1) : 0;

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
      setBuffEffectTopPx(Math.max(0, charTop - effectHeight - 10));
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
          height: 340,
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

  const previewBackground =
    fighter?.role === "champion" && fighter?.backgroundImageUrl
      ? fighter.backgroundImageUrl
      : MOVE_PREVIEW_BG_SRC;
  const moveLeftOffsetPx = layout === "buff" ? 0 : -3;

  const characterStyle = {
    position: "absolute",
    zIndex: 2,
    pointerEvents: "none",
    userSelect: "none",
    width: layout === "buff" ? "52%" : "64%",
    maxWidth: layout === "buff" ? 180 : 220,
    transition: "left 180ms linear, bottom 180ms linear, transform 180ms linear",
    filter: "drop-shadow(0 0 8px rgba(0,0,0,0.32))",
    marginLeft: moveLeftOffsetPx,
  };

  if (layout === "buff") {
    characterStyle.left = "50%";
    characterStyle.bottom = "10%";
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
        width: layout === "buff" ? "24%" : "40%",
        maxWidth: layout === "buff" ? 110 : 170,
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
          ? `${Math.max(0, buffEffectTopPx - effectProgress * 20)}px`
          : "18px";
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
        width: "92%",
        height: 340,
        maxWidth: 420,
        minWidth: 240,
        mx: "auto",
        overflow: "hidden",
        borderRadius: "5px",
        background:
          "radial-gradient(circle at center, rgba(255,255,255,0.075), rgba(0,0,0,0.82) 66%)",
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
      <Box ref={stageRef} sx={{ position: "relative", width: "100%", height: "100%" }}>
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

function FighterSheetMoveCard({ move, fighter }) {
  const powerBreakdown = getMovePowerBreakdown(move, fighter);
  const powerBreakdownRows = getMovePowerBreakdownRows(powerBreakdown, move);
  const accuracyBreakdown = getMoveAccuracyBreakdown(move, fighter);
  const baseCooldown = getMoveCooldown(move);
  const effectiveSpeed = getEffectiveSpeed(fighter?.stats || {}, fighter?.effects || {});
  const effectiveCooldown = computeEffectiveCooldownSeconds(baseCooldown, effectiveSpeed);
  const cooldownColor = getComparisonColor(baseCooldown, effectiveCooldown);
  const upgradeLabels = asArray(getMoveCardUpgradeMeta(move).labels);
  const targetLabel = getMoveTargetLabel(move);
  const effectRows = getMoveEffectDisplayRows(move, fighter);
  const deckCopies = getMoveDeckCopies(move);

  return (
    <Box
      sx={{
        height: "100%",
        p: 1.4,
        border: `1px solid ${THEME.lineStrong}`,
        background: "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(0,0,0,0.86))",
      }}
    >
      <Typography
        sx={{
          color: THEME.text,
          fontFamily: "Jacques, Georgia, serif",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          textAlign: "center",
          fontSize: 14,
          fontWeight: 900,
          mb: 1,
        }}
      >
        {move.name}
      </Typography>

      <DepthsSheetMoveAnimationPreview move={move} fighter={fighter} deckCopies={deckCopies} />

      <Typography sx={{ color: THEME.muted, display: "block", fontSize: 10, letterSpacing: "0.12em", mt: 1, textAlign: "center", textTransform: "uppercase" }}>
        {move.type} | {targetLabel}
      </Typography>

      <Grid container spacing={1} sx={{ mt: 0.4 }}>
        <Grid item xs={6}>
          <Box sx={{ p: 0.7 }}>
            <Box component="img" src="/dragonshorde/power.png" alt="power" draggable={false} sx={{ width: 42, display: "flex", mx: "auto" }} />
            <Typography sx={{ color: getComparisonColor(powerBreakdown.finalValue, powerBreakdown.baseValue), fontSize: 16, fontWeight: 900, textAlign: "center" }}>
              {safeNumber(powerBreakdown.finalValue, 0).toFixed(1)}
            </Typography>
            <MoveValueBreakdown
              baseValue={powerBreakdown.baseValue}
              finalValue={powerBreakdown.finalValue}
              rows={powerBreakdownRows}
              modifierLabel={getMoveStatScalingLabel(
                move.type,
                powerBreakdown.statKey,
                powerBreakdown.moveKind
              )}
            />
          </Box>
        </Grid>

        <Grid item xs={6}>
          <Box sx={{ p: 0.7 }}>
            <Box component="img" src="/dragonshorde/accuracy.svg" alt="accuracy" draggable={false} sx={{ width: 42, display: "flex", mx: "auto" }} />
            <Typography sx={{ color: getComparisonColor(accuracyBreakdown.finalValue, accuracyBreakdown.baseValue), fontSize: 16, fontWeight: 900, textAlign: "center" }}>
              {safeNumber(accuracyBreakdown.finalValue, 0).toFixed(1)}
            </Typography>
            <MoveAccuracyBreakdown breakdown={accuracyBreakdown} />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ p: 0.7 }}>
            <Box component="img" src="/dragonshorde/cooldown.png" alt="cooldown" draggable={false} sx={{ width: 42, display: "flex", mx: "auto" }} />
            <Typography sx={{ color: cooldownColor, fontSize: 16, fontWeight: 900, textAlign: "center" }}>
              {safeNumber(effectiveCooldown, 0).toFixed(1)}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {effectRows.length ? (
        <Box sx={{ mt: 1.2, display: "grid", gap: 0.55 }}>
          {effectRows.map((row) => (
            <Box
              key={row.key}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.65,
                color: THEME.gold,
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              {row.icon ? (
                <EffectTooltipIcon
                  effectKey={row.effectKey}
                  src={row.icon}
                  size={24}
                  sx={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.22))" }}
                />
              ) : null}
              <Box sx={{ minWidth: 0, textAlign: "center" }}>
                <Box component="span">
                  Apply {formatDisplayNumber(row.amount)} {row.effectKey}
                </Box>
                {row.fromUpgrade || row.upgradeBonus || row.potencyBonus ? (
                  <Typography sx={{ color: THEME.muted, fontSize: 10, lineHeight: 1.2, mt: 0.15 }}>
                    {row.fromUpgrade
                      ? `from card upgrade${row.potencyBonus ? ` +${formatDisplayNumber(row.potencyBonus)} potency` : ""}`
                      : `base ${formatDisplayNumber(row.baseAmount)}${
                          row.upgradeBonus
                            ? ` ${formatSignedDisplayNumber(row.upgradeBonus)} upgrades`
                            : ""
                        }${
                          row.potencyBonus
                            ? ` +${formatDisplayNumber(row.potencyBonus)} potency`
                            : ""
                        }`}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          ))}
        </Box>
      ) : null}

      {upgradeLabels.length ? (
        <Box sx={{ mt: 1.1, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 0.55 }}>
          {upgradeLabels.map((label) => (
            <Chip
              key={label}
              size="small"
              label={label}
              sx={{
                color: THEME.text,
                border: `1px solid ${THEME.line}`,
                background: "rgba(255,255,255,0.045)",
                "& .MuiChip-label": { fontSize: 10, fontWeight: 800 },
              }}
            />
          ))}
        </Box>
      ) : null}

      {move.description ? (
        <Typography sx={{ color: THEME.muted, fontSize: 12, lineHeight: 1.5, mt: 1.1, textAlign: "center" }}>
          {move.description}
        </Typography>
      ) : null}
    </Box>
  );
}

function getBattleOnlyTriggerLabel(entry = {}) {
  if (entry.type === "resistance") return "Resistance";
  if (entry.type === "gain_start_of_battle") return "Room start";
  if (entry.type === "apply_start_of_battle") return "Enemy start";
  if (entry.type === "gain_on_hit") return `${entry.attackType || "any"} hit self`;
  if (entry.type === "apply_on_crit") return "Critical hit";
  if (entry.type === "apply_on_hit") return `${entry.attackType || "any"} hit`;
  if (entry.type === "heal_for_applied_stacks" || entry.type === "heal_when_stacks_applied") {
    return `${entry.sourceEffectKey || entry.effectKey} applied`;
  }
  return entry.type ? String(entry.type).replace(/_/g, " ") : "Item effect";
}

function getBattleOnlyEffectLabel(entry = {}, fighter = null) {
  const effectKey = String(entry.effectKey || entry.resistedEffect || "").toLowerCase();
  const baseAmount = safeNumber(entry.amount, 0);
  const amount = getBattleOnlyEffectAmount(entry, fighter);

  if (entry.type === "resistance") {
    return `${formatDisplayNumber(baseAmount)}% ${effectKey} resistance`;
  }
  if (entry.type === "heal_for_applied_stacks") {
    return `Heal ${formatDisplayNumber(baseAmount)} HP per ${effectKey} stack applied`;
  }
  if (entry.type === "heal_when_stacks_applied") {
    return `Heal ${formatDisplayNumber(baseAmount)} HP when ${effectKey} stacks are applied`;
  }
  if (!effectKey) return entry.label || "Item effect";

  const bonusAmount = amount - baseAmount;
  const bonusText = bonusAmount
    ? ` (base ${formatDisplayNumber(baseAmount)} ${formatSignedDisplayNumber(bonusAmount)} potency)`
    : "";

  if (entry.type === "gain_start_of_battle" || entry.type === "gain_on_hit") {
    return `Gain +${formatDisplayNumber(amount)} ${effectKey}${bonusText}`;
  }

  return `Apply +${formatDisplayNumber(amount)} ${effectKey}${bonusText}`;
}

function getChampionRuntimeTriggerEffects(fighter) {
  if (fighter?.role === "monster") return [];

  return asArray(fighter?.gainedEffectsMeta?.battleOnly).filter(
    (entry) => entry && !entry.sourceAbilityId
  );
}

function getCardUpgradeSummaryRows(upgrade = {}) {
  const rows = [];
  if (upgrade.powerDelta) rows.push(`${formatSignedDisplayNumber(upgrade.powerDelta)} power`);
  if (upgrade.powerMultiplier) rows.push(`${Math.round(upgrade.powerMultiplier * 100)}% power`);
  if (upgrade.accuracyDelta) rows.push(`${formatSignedDisplayNumber(upgrade.accuracyDelta)} accuracy`);
  if (upgrade.cooldownDelta) rows.push(`${formatSignedDisplayNumber(upgrade.cooldownDelta)}s cooldown`);
  if (upgrade.effectPotencyBonus) {
    rows.push(`${formatSignedDisplayNumber(upgrade.effectPotencyBonus)} effect stacks`);
  }
  if (upgrade.effectPotencyMultiplier) {
    rows.push(`${Math.round(upgrade.effectPotencyMultiplier * 100)}% effect stacks`);
  }
  if (upgrade.repeatCount) rows.push(`fires ${upgrade.repeatCount} times`);
  if (upgrade.multiTarget) rows.push("hits all valid targets");
  if (upgrade.critChanceBonus) rows.push(`+${formatDisplayNumber(upgrade.critChanceBonus)}% crit chance`);
  asArray(upgrade.secondaryEffects).forEach((effect) => {
    rows.push(
      `${effect.target === "self" ? "self gains" : "also applies"} ${formatDisplayNumber(
        effect.amount
      )} ${effect.effectKey}`
    );
  });
  return rows;
}

function FighterInspectDialog({ open, fighter, onClose }) {
  if (!fighter) return null;

  const artifacts = asArray(fighter.depthsRunArtifacts);
  const runCards = asArray(fighter.depthsRunCards);
  const cardUpgrades = asArray(fighter.depthsCardUpgrades);
  const depthsStatBonuses = getDepthsAbilityStatTotals(artifacts);
  const activeEffects = Object.entries(fighter.effects || {}).filter(([, value]) => safeNumber(value, 0) !== 0);
  const effectPotencies = EFFECTS.map(({ key }) => {
    const baseValue = safeNumber(fighter.effectPotencies?.[key], 0);
    const artifactValue = getArtifactEffectPotencyBonus(fighter, key);
    return { key, value: baseValue + artifactValue, baseValue, artifactValue };
  }).filter((entry) => safeNumber(entry.value, 0) !== 0);
  const runtimeTriggerEffects = getChampionRuntimeTriggerEffects(fighter);
  const passiveRows = getChampionPassiveRows(fighter);
  const moves = asArray(fighter.moves).filter((move) => move?.type);
  const adjustedSheetStats = getFighterAdjustedSheetStats(fighter);
  const statRows = DISPLAY_STAT_KEYS.map((key) => ({
    key,
    value: adjustedSheetStats[key],
    baseValue: fighter.stats?.[key],
    activeDelta: safeNumber(adjustedSheetStats[key], 0) - safeNumber(fighter.stats?.[key], 0),
    bonus: depthsStatBonuses[key],
  }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          background: "linear-gradient(180deg, #060606, #000 72%, #080808)",
          border: `1px solid ${THEME.lineStrong}`,
          borderRadius: 0,
          color: THEME.text,
          boxShadow: "0 32px 96px rgba(0,0,0,0.86), 0 0 48px rgba(255,255,255,0.06)",
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 2, md: 3 }, position: "relative" }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            color: THEME.text,
            border: `1px solid ${THEME.line}`,
            borderRadius: 0,
            background: "rgba(0,0,0,0.74)",
          }}
        >
          <CloseIcon />
        </IconButton>

        <Box sx={{ pr: 5 }}>
          <Typography
            sx={{
              color: THEME.gold,
              fontFamily: "Jacques, Georgia, serif",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontSize: 12,
            }}
          >
            {fighter.role === "monster" ? "Depths Monster" : `Champion #${fighter.assetId || ""}`}
          </Typography>
          <Typography
            sx={{
              color: THEME.text,
              fontFamily: "Jacques, Georgia, serif",
              letterSpacing: "0.08em",
              fontSize: { xs: 28, md: 38 },
              lineHeight: 1,
              mt: 0.8,
            }}
          >
            {fighter.name}
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} md={5}>
            <Box sx={{ border: `1px solid ${THEME.line}`, p: 1.4, height: "100%" }}>
              <Typography sx={{ color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em" }}>
                Battle State
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mt: 1 }}>
                <Chip label={`HP ${Math.round(fighter.hp)} / ${Math.round(fighter.maxHp)}`} sx={{ color: THEME.text, border: `1px solid ${THEME.line}`, background: "rgba(255,255,255,0.04)" }} />
                <Chip label={`CD ${safeNumber(fighter.cooldown?.remaining, 0).toFixed(1)}s`} sx={{ color: THEME.text, border: `1px solid ${THEME.line}`, background: "rgba(255,255,255,0.04)" }} />
              </Box>

              <Typography sx={{ color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", mt: 2 }}>
                Active Effects
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.7, mt: 1 }}>
                {activeEffects.length ? (
                  activeEffects.map(([key, value]) => (
                    <Box
                      key={key}
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
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <EffectTooltipIcon
                        effectKey={key}
                        src={EFFECT_ICON_BY_KEY[String(key).toLowerCase()]}
                        size={16}
                        stackValue={value}
                      />
                      <Typography sx={{ color: THEME.text, fontSize: 12, fontWeight: 800, lineHeight: 1.1 }}>
                        {key} {formatDisplayNumber(value)}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography sx={{ color: THEME.faint, fontSize: 12 }}>No active battle effects.</Typography>
                )}
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={7}>
            <Box sx={{ border: `1px solid ${THEME.line}`, p: 1.4 }}>
              <Typography sx={{ color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", mb: 1 }}>
                Current Stats
              </Typography>
              <Grid container spacing={0.8}>
                {statRows.map((row) => (
                  <Grid item xs={6} sm={4} key={row.key}>
                    <Box sx={{ border: `1px solid ${THEME.line}`, p: 1, minHeight: 62, background: "rgba(255,255,255,0.025)" }}>
                      <Typography sx={{ color: THEME.faint, fontSize: 10, textTransform: "uppercase" }}>
                        {row.key}
                      </Typography>
                      <Typography sx={{ color: THEME.text, fontSize: 18, fontWeight: 900 }}>
                        {formatDisplayNumber(row.value)}
                      </Typography>
                      {row.bonus ? (
                        <Typography sx={{ color: THEME.gold, fontSize: 10 }}>
                          depths {formatSignedDisplayNumber(row.bonus)}
                        </Typography>
                      ) : null}
                      {row.activeDelta ? (
                        <Typography sx={{ color: getDeltaColor(row.activeDelta), fontSize: 10 }}>
                          active {formatSignedDisplayNumber(row.activeDelta)}
                        </Typography>
                      ) : null}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ border: `1px solid ${THEME.line}`, p: 1.4, mt: 2 }}>
          <Typography sx={{ color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", mb: 1 }}>
            {fighter.role === "monster" ? "Monster Moves" : "Champion Moves"}
          </Typography>
          {moves.length ? (
            <Grid container spacing={1.2}>
              {moves.map((move, index) => (
                <Grid item xs={12} md={4} key={move.id || `${move.name}-${index}`}>
                  <FighterSheetMoveCard move={move} fighter={fighter} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography sx={{ color: THEME.faint, fontSize: 12 }}>
              No moves found for this fighter.
            </Typography>
          )}
        </Box>

        {cardUpgrades.length ? (
          <Box sx={{ border: `1px solid ${THEME.line}`, p: 1.4, mt: 2 }}>
            <Typography sx={{ color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", mb: 1 }}>
              Card Upgrades
            </Typography>
            <Grid container spacing={1}>
              {cardUpgrades.map((upgrade, index) => (
                <Grid item xs={12} sm={6} md={4} key={`${upgrade.id || upgrade.name}-${index}`}>
                  <Box sx={{ border: `1px solid ${THEME.line}`, p: 1, background: "rgba(255,255,255,0.025)", height: "100%" }}>
                    <Typography sx={{ color: THEME.text, fontSize: 13, fontWeight: 900 }}>
                      {upgrade.name}
                    </Typography>
                    <Typography sx={{ color: THEME.faint, fontSize: 10 }}>
                      {upgrade.moveName || "Card"} | Room {upgrade.room || "-"}
                    </Typography>
                    <Typography sx={{ color: THEME.muted, fontSize: 11, lineHeight: 1.35, mt: 0.4 }}>
                      {upgrade.description}
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.45, mt: 0.7 }}>
                      {getCardUpgradeSummaryRows(upgrade).map((row) => (
                        <Chip
                          key={row}
                          size="small"
                          label={row}
                          sx={{
                            height: "auto",
                            minHeight: 22,
                            color: THEME.text,
                            border: `1px solid ${THEME.line}`,
                            borderRadius: 1,
                            background: "rgba(0,0,0,0.4)",
                            "& .MuiChip-label": {
                              display: "block",
                              whiteSpace: "normal",
                              fontSize: 9,
                              px: 0.8,
                              py: 0.25,
                              lineHeight: 1.25,
                            },
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        ) : null}

        {fighter.role !== "monster" || effectPotencies.length ? (
          <Box sx={{ border: `1px solid ${THEME.line}`, p: 1.4, mt: 2 }}>
            <Typography sx={{ color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", mb: 1 }}>
              {fighter.role === "monster" ? "Monster Effect Potencies" : "Character Effect Potencies"}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.7 }}>
              {effectPotencies.length ? (
                effectPotencies.map((entry) => (
                  <Box
                    key={entry.key}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.55,
                      minHeight: 30,
                      px: 0.9,
                      py: 0.5,
                      color: THEME.text,
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.04)",
                    }}
                  >
                    <EffectTooltipIcon
                      effectKey={entry.key}
                      src={EFFECT_ICON_BY_KEY[entry.key]}
                      size={17}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ color: THEME.text, fontSize: 12, fontWeight: 800, lineHeight: 1.1 }}>
                        +{formatDisplayNumber(entry.value)}
                      </Typography>
                      {entry.artifactValue ? (
                        <Typography sx={{ color: THEME.gold, fontSize: 9, lineHeight: 1.1 }}>
                          artifacts +{formatDisplayNumber(entry.artifactValue)}
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
        ) : null}

        {fighter.role !== "monster" || runtimeTriggerEffects.length ? (
          <Box sx={{ border: `1px solid ${THEME.line}`, p: 1.4, mt: 2 }}>
            <Typography sx={{ color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", mb: 1 }}>
              Runtime Trigger Effects
            </Typography>
            {runtimeTriggerEffects.length ? (
              <Grid container spacing={1}>
                {runtimeTriggerEffects.map((entry, index) => {
                const effectKey = String(entry.effectKey || entry.resistedEffect || "").toLowerCase();
                const effectIcon = EFFECT_ICON_BY_KEY[effectKey] || "";
                const sourceType = entry.sourceArtifactId ? "Artifact" : "Trait";

                return (
                  <Grid item xs={12} sm={6} md={4} key={`${entry.sourceName || sourceType}-${entry.type || "effect"}-${index}`}>
                    <Box sx={{ display: "flex", gap: 1, border: `1px solid ${THEME.line}`, p: 1, background: "rgba(255,255,255,0.025)", height: "100%" }}>
                      {effectIcon ? (
                        <EffectTooltipIcon
                          effectKey={effectKey}
                          src={effectIcon}
                          size={38}
                          sx={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.16))" }}
                        />
                      ) : null}
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: THEME.text, fontSize: 12, fontWeight: 900 }}>
                          {entry.sourceName || `Equipped ${sourceType}`}
                        </Typography>
                        <Typography sx={{ color: entry.sourceArtifactId ? THEME.gold : THEME.faint, fontSize: 9.5, fontWeight: 900, textTransform: "uppercase" }}>
                          {sourceType}
                        </Typography>
                        <Typography sx={{ color: THEME.gold, fontSize: 11, fontWeight: 800 }}>
                          {getBattleOnlyTriggerLabel(entry)}
                        </Typography>
                        <Typography sx={{ color: THEME.muted, fontSize: 11, lineHeight: 1.35 }}>
                          {getBattleOnlyEffectLabel(entry, fighter)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
              </Grid>
            ) : (
              <Typography sx={{ color: THEME.faint, fontSize: 12 }}>
                No trait or artifact trigger effects.
              </Typography>
            )}
          </Box>
        ) : null}

        {fighter.role !== "monster" ? (
          <Box sx={{ border: `1px solid ${THEME.line}`, p: 1.4, mt: 2 }}>
            <Typography sx={{ color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", mb: 1 }}>
              Depths Passives
            </Typography>
            <Grid container spacing={1}>
              {passiveRows.length ? (
                passiveRows.map((row) => (
                  <Grid item xs={12} sm={6} md={4} key={row.key}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 0.8,
                        border: `1px solid ${THEME.line}`,
                        p: 1,
                        background: "rgba(255,255,255,0.025)",
                        height: "100%",
                      }}
                    >
                      {row.icon ? (
                        getArenaEffectInfo(row.key) ? (
                          <EffectTooltipIcon
                            effectKey={row.key}
                            src={row.icon}
                            size={28}
                          />
                        ) : (
                          <Box
                            component="img"
                            src={row.icon}
                            alt=""
                            draggable={false}
                            sx={{ width: 28, height: 28, objectFit: "contain", flex: "0 0 auto" }}
                          />
                        )
                      ) : null}
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: THEME.text, fontSize: 12, fontWeight: 900, lineHeight: 1.2 }}>
                          {row.title}
                        </Typography>
                        <Typography sx={{ color: THEME.muted, fontSize: 11, lineHeight: 1.35, mt: 0.25 }}>
                          {row.text}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Typography sx={{ color: THEME.faint, fontSize: 12 }}>
                    No passive run bonuses.
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        ) : null}

        {artifacts.length ? (
          <Box sx={{ border: `1px solid ${THEME.line}`, p: 1.4, mt: 2 }}>
            <Typography sx={{ color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", mb: 1 }}>
              Depths Artifacts
            </Typography>
            <Grid container spacing={1}>
              {artifacts.map((artifact, index) => (
                <Grid item xs={12} sm={6} key={`${artifact.id}-${artifact.room}-${index}`}>
                  <Box sx={{ display: "flex", gap: 1, border: `1px solid ${THEME.line}`, p: 1, background: "rgba(255,255,255,0.025)" }}>
                    {artifact.imageSrc ? (
                      <Box
                        component="img"
                        src={artifact.imageSrc}
                        alt=""
                        sx={{ width: 62, height: 62, objectFit: "contain", flex: "0 0 auto", filter: "drop-shadow(0 0 12px rgba(255,255,255,0.14))" }}
                      />
                    ) : null}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ color: THEME.text, fontSize: 13, fontWeight: 900 }}>
                        {artifact.name}
                      </Typography>
                      <Typography sx={{ color: THEME.faint, fontSize: 10 }}>
                        Room {artifact.room || "-"} | {getDepthsPopupLabel(artifact.rarity || "Artifact")}
                      </Typography>
                      <Typography sx={{ color: THEME.muted, fontSize: 11, lineHeight: 1.35, mt: 0.4 }}>
                        {artifact.description}
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.45, mt: 0.7 }}>
                        {getArtifactSummaryRows(artifact).map((row) => (
                          <ArtifactSummaryRow
                            key={row}
                            text={row}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        ) : null}

        {fighter.role !== "monster" ? (
        <Box sx={{ border: `1px solid ${THEME.line}`, p: 1.4, mt: 2 }}>
          <Typography sx={{ color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", mb: 1 }}>
            Depths Cards
          </Typography>
          {runCards.length ? (
            <Grid container spacing={1}>
              {runCards.map((card, index) => {
                const move = card.move || card;
                const effectRows = getMoveEffectDisplayRows(move, fighter);
                const targetLabel = getMoveTargetLabel(move);
                const powerBreakdown = getMovePowerBreakdown(move, fighter);
                const powerBreakdownRows = getMovePowerBreakdownRows(powerBreakdown, move);
                const accuracyBreakdown = getMoveAccuracyBreakdown(move, fighter);
                const baseCooldown = getMoveCooldown(move);
                const effectiveSpeed = getEffectiveSpeed(fighter?.stats || {}, fighter?.effects || {});
                const effectiveCooldown = computeEffectiveCooldownSeconds(baseCooldown, effectiveSpeed);
                const deckCopies = getMoveDeckCopies(move);

                return (
                <Grid item xs={12} sm={6} key={`${card.id || card.cardId || move.id}-${card.room}-${index}`}>
                  <Box sx={{ display: "flex", gap: 1, border: `1px solid ${THEME.line}`, p: 1, background: "rgba(255,255,255,0.025)" }}>
                    {move.casterAnimation?.frameUrls?.[0] ? (
                      <Box sx={{ position: "relative", width: 64, height: 64, flex: "0 0 auto" }}>
                        <Box
                          component="img"
                          src={move.casterAnimation.frameUrls[0]}
                          alt=""
                          sx={{ width: "100%", height: "100%", objectFit: "contain", border: `1px solid ${THEME.line}` }}
                        />
                        <DepthsDeckCountBadge count={deckCopies} compact />
                      </Box>
                    ) : null}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ color: THEME.text, fontSize: 13, fontWeight: 900 }}>
                        {card.name || move.name}
                      </Typography>
                      <Typography sx={{ color: THEME.faint, fontSize: 10 }}>
                        Room {card.room || "-"} | {move.type || card.type || "Card"} | {targetLabel}
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.45, mt: 0.7 }}>
                        <DepthsBattleStatIconPill
                          icon={POWER_ICON_SRC}
                          alt="power"
                          value={formatDisplayNumber(powerBreakdown.finalValue)}
                        />
                        <DepthsBattleStatIconPill
                          icon={ACCURACY_ICON_SRC}
                          alt="accuracy"
                          value={formatDisplayNumber(move.accuracy)}
                        />
                        <DepthsBattleStatIconPill
                          icon={DEPTHS_STAT_ICON_BY_KEY.cooldown}
                          alt="cooldown"
                          value={`${formatDisplayNumber(effectiveCooldown)}s`}
                        />
                        {effectRows.map((row) => (
                          <Box
                            key={row.key}
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.4,
                              minHeight: 22,
                              px: 0.65,
                              py: 0.25,
                              color: THEME.text,
                              border: `1px solid ${THEME.line}`,
                              borderRadius: 999,
                              background: "rgba(0,0,0,0.4)",
                            }}
                          >
                            <EffectTooltipIcon
                              effectKey={row.effectKey}
                              src={row.icon}
                              size={14}
                            />
                            <Typography sx={{ color: THEME.text, fontSize: 9, fontWeight: 800, lineHeight: 1 }}>
                              +{formatDisplayNumber(row.amount)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                      {powerBreakdownRows.length ? (
                        <Box sx={{ display: "grid", gap: 0.2, mt: 0.55 }}>
                          <Typography sx={{ color: THEME.muted, fontSize: 9.5, lineHeight: 1.2 }}>
                            base {formatDisplayNumber(powerBreakdown.baseValue)}
                          </Typography>
                          {powerBreakdownRows.map((row) => (
                            <Typography
                              key={row.key || row.label}
                              sx={{ color: getDeltaColor(row.value), fontSize: 9.5, lineHeight: 1.2 }}
                            >
                              {formatSignedDisplayNumber(row.value)} {row.label}
                            </Typography>
                          ))}
                          <Typography sx={{ color: THEME.muted, fontSize: 9.5, lineHeight: 1.2 }}>
                            shown {powerBreakdown.outputLabel}: {formatDisplayNumber(powerBreakdown.finalValue)}
                          </Typography>
                        </Box>
                      ) : null}
                      {accuracyBreakdown.accuracyUpgradeBonus ? (
                        <Box sx={{ display: "grid", gap: 0.2, mt: 0.45 }}>
                          <Typography sx={{ color: THEME.faint, fontSize: 9.5, lineHeight: 1.2 }}>
                            accuracy base {formatDisplayNumber(accuracyBreakdown.baseValue)}
                          </Typography>
                          <Typography
                            sx={{
                              color: getDeltaColor(accuracyBreakdown.accuracyUpgradeBonus),
                              fontSize: 9.5,
                              lineHeight: 1.2,
                            }}
                          >
                            {formatSignedDisplayNumber(accuracyBreakdown.accuracyUpgradeBonus)} from{" "}
                            {accuracyBreakdown.accuracyUpgradeLabel || "card upgrades"}
                          </Typography>
                        </Box>
                      ) : null}
                    </Box>
                  </Box>
                </Grid>
                );
              })}
            </Grid>
          ) : (
            <Typography sx={{ color: THEME.faint, fontSize: 12 }}>
              No Depths cards gained for this fighter.
            </Typography>
          )}
        </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ArenaFighterSprite({
  fighter,
  side,
  battle,
  animation,
  localMs,
  introActive,
  targetable = false,
  onTargetSelect,
  onInspect,
}) {
  const acting = animation?.actorSide === side;
  const depthsCardActing = acting && isDepthsCardMove(animation?.move);
  const timings = animation?.timings || getMoveAnimationTimings(animation?.move || {}, animation?.moveKind);
  const repeatState = acting
    ? getAnimationRepeatState(animation, localMs)
    : { localMs, inGap: false, singleDurationMs: safeNumber(timings.singleDurationMs, timings.durationMs) };
  const visualLocalMs = repeatState.inGap ? 0 : repeatState.localMs;
  const moveFrames = acting && !depthsCardActing ? getMoveCharacterFrames(animation?.move) : [];
  const baseLeft = getFighterBattleLeft(side, battle);
  const baseTop = getFighterBattleTop(side, battle);
  const targetLeft = getFighterBattleLeft(animation?.targetSide, battle);
  const targetTop = getFighterBattleTop(animation?.targetSide, battle);
  const compact = true;
  const isMonster = isMonsterSide(side);
  const defeated = safeNumber(fighter?.hp, 0) <= 0;
  const visualScale = getFighterVisualScale(fighter, battle);
  const spriteHeight = {
    xs: Math.round(108 * visualScale),
    md: Math.round(166 * visualScale),
  };
  const enemyIntroIndex = isMonster ? Math.max(0, getEnemySides(battle).indexOf(side)) : 0;
  const enemyIntroDelayMs = FIGHT_FRAMES_A * FRAME_MS + INTRO_GAP_MS + enemyIntroIndex * 560;
  const baseTransform = "translate(-50%, -50%)";
  const attackLeft =
    acting && !depthsCardActing && timings.kind === "melee" && Number.isFinite(targetLeft)
      ? baseLeft + (targetLeft - baseLeft) * 0.62
      : baseLeft;
  const attackTop =
    acting && !depthsCardActing && timings.kind === "melee" && Number.isFinite(targetTop)
      ? baseTop + (targetTop - baseTop) * 0.62
      : baseTop;
  let left = baseLeft;
  let top = baseTop;

  if (acting && !depthsCardActing && timings.kind === "melee") {
    const approachStart = FRAME_MS;
    const approachEnd = approachStart + MELEE_APPROACH_MS;
    const effectEnd = approachEnd + timings.effectDurationMs;
    const retreatEnd = effectEnd + MELEE_RETREAT_MS;

    if (visualLocalMs >= approachStart && visualLocalMs < approachEnd) {
      const p = easeOutCubic((visualLocalMs - approachStart) / MELEE_APPROACH_MS);
      left = baseLeft + (attackLeft - baseLeft) * p;
      top = baseTop + (attackTop - baseTop) * p;
    } else if (visualLocalMs >= approachEnd && visualLocalMs < effectEnd) {
      left = attackLeft;
      top = attackTop;
    } else if (visualLocalMs >= effectEnd && visualLocalMs < retreatEnd) {
      const p = easeInOut((visualLocalMs - effectEnd) / MELEE_RETREAT_MS);
      left = attackLeft + (baseLeft - attackLeft) * p;
      top = attackTop + (baseTop - attackTop) * p;
    }
  }

  const moveFrameList = useMemo(() => {
    const fallback = fighter.standingUrl || fighter.imageUrl || "";
    return getFramesFromCandidates([moveFrames], fallback).slice(0, 4);
  }, [moveFrames.join("|"), fighter.standingUrl, fighter.imageUrl]);
  const [loadedMoveSrcs, setLoadedMoveSrcs] = useState({});
  const [displayMoveSrc, setDisplayMoveSrc] = useState("");
  const movePlaybackIndex = acting
    ? Math.min(
        3,
        Math.floor(Math.max(0, visualLocalMs) / Math.max(1, SIM_MOVE_CHAR_FRAME_HOLD * FRAME_MS))
      )
    : 0;
  const desiredMoveSrc = acting
    ? moveFrameList[Math.min(movePlaybackIndex, Math.max(0, moveFrameList.length - 1))] ||
      fighter.standingUrl ||
      fighter.imageUrl ||
      ""
    : "";
  const displayIsFallback =
    displayMoveSrc && (displayMoveSrc === fighter.standingUrl || displayMoveSrc === fighter.imageUrl);
  const moveFrameReady = Boolean(
    acting && displayMoveSrc && (displayIsFallback || loadedMoveSrcs[displayMoveSrc])
  );
  const hitFlashing = battle?.hitFlash?.side === side;
  const hitFlashSx = hitFlashing
    ? {
        animation: "depthsHitFlash 640ms linear both",
        "@keyframes depthsHitFlash": {
          "0%": { opacity: 1, filter: "brightness(1) drop-shadow(0 18px 20px rgba(0,0,0,0.55))" },
          "18%": { opacity: 0.28, filter: "brightness(2.4) drop-shadow(0 0 26px rgba(255,255,255,0.85))" },
          "34%": { opacity: 1, filter: "brightness(1) drop-shadow(0 18px 20px rgba(0,0,0,0.55))" },
          "52%": { opacity: 0.32, filter: "brightness(2.1) drop-shadow(0 0 22px rgba(255,255,255,0.72))" },
          "72%": { opacity: 1, filter: "brightness(1) drop-shadow(0 18px 20px rgba(0,0,0,0.55))" },
          "100%": { opacity: 1, filter: "brightness(1) drop-shadow(0 18px 20px rgba(0,0,0,0.55))" },
        },
      }
    : {};

  useEffect(() => {
    if (!acting) setDisplayMoveSrc("");
  }, [acting]);

  useEffect(() => {
    if (!acting || !animation?.id) {
      setLoadedMoveSrcs({});
      return undefined;
    }

    let cancelled = false;
    setLoadedMoveSrcs({});

    moveFrameList.forEach((src) => {
      if (!src) return;
      const image = new Image();
      image.onload = () => {
        if (!cancelled) {
          setLoadedMoveSrcs((prev) => ({ ...prev, [src]: true }));
        }
      };
      image.src = src;
    });

    return () => {
      cancelled = true;
    };
  }, [acting, animation?.id, moveFrameList.join("|")]);

  useEffect(() => {
    if (!acting || !desiredMoveSrc) return undefined;
    if (loadedMoveSrcs[desiredMoveSrc] || desiredMoveSrc === fighter.standingUrl || desiredMoveSrc === fighter.imageUrl) {
      setDisplayMoveSrc(desiredMoveSrc);
    }
    return undefined;
  }, [acting, desiredMoveSrc, loadedMoveSrcs, fighter.standingUrl, fighter.imageUrl]);

  return (
    <Box
      component="div"
      role={targetable ? "button" : undefined}
      tabIndex={targetable ? 0 : undefined}
      onClick={targetable ? onTargetSelect : undefined}
      onKeyDown={
        targetable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onTargetSelect?.();
              }
            }
          : undefined
      }
      sx={{
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        width: getFighterBattleWidth(side, battle),
        transform: baseTransform,
        zIndex: acting ? 4 : 3,
        opacity: defeated && !(side === "A" && battle?.winner === "champion") ? 0 : 1,
        transition: "opacity 4200ms ease",
        p: 0,
        isolation: "isolate",
        appearance: "none",
        font: "inherit",
        color: "inherit",
        border: "2px solid transparent",
        borderRadius: targetable ? 2 : 0,
        background: "transparent",
        cursor: targetable ? "pointer" : "default",
        pointerEvents: defeated && !(side === "A" && battle?.winner === "champion") ? "none" : "auto",
        boxShadow: "none",
        "&::before": targetable
          ? {
              content: '""',
              position: "absolute",
              inset: { xs: -9, md: -14 },
              zIndex: -1,
              border: `2px solid ${THEME.gold}`,
              borderRadius: 2,
              background: "rgba(225,184,100,0.08)",
              boxShadow: "0 0 30px rgba(225,184,100,0.34)",
              pointerEvents: "none",
            }
          : undefined,
        animation: introActive
          ? side === "A"
            ? "depthsIntroFromLeft 1500ms ease-out both"
            : `depthsIntroFromRight 1500ms ${enemyIntroDelayMs}ms ease-out both`
          : "none",
        "@keyframes depthsIntroFromLeft": {
          "0%": { transform: `${baseTransform} translateX(-62vw)`, opacity: 0.2 },
          "15%": { opacity: 1 },
          "100%": { transform: `${baseTransform} translateX(0)`, opacity: 1 },
        },
        "@keyframes depthsIntroFromRight": {
          "0%": { transform: `${baseTransform} translateX(62vw)`, opacity: 0.2 },
          "15%": { opacity: 1 },
          "100%": { transform: `${baseTransform} translateX(0)`, opacity: 1 },
        },
      }}
    >
      <IconButton
        aria-label={`Inspect ${fighter.name}`}
        size="small"
        onClick={(event) => {
          event.stopPropagation();
          onInspect?.(side);
        }}
        sx={{
          position: "absolute",
          top: -12,
          right: -10,
          zIndex: 12,
          width: 26,
          height: 26,
          color: THEME.text,
          border: `1px solid ${THEME.lineStrong}`,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.82)",
          "&:hover": {
            background: "rgba(225,184,100,0.24)",
            borderColor: THEME.gold,
          },
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 16 }} />
      </IconButton>
      <FighterHud fighter={fighter} compact={compact} />
      <Box
        sx={{
          mt: 0.45,
          minHeight: { xs: 100, md: 158 },
          display: "grid",
          placeItems: "end center",
          position: "relative",
          overflow: "visible",
        }}
      >
        <AnimatedSprite
          frames={fighter.idleFrames}
          fallback={fighter.standingUrl || fighter.imageUrl}
          alt={fighter.name}
          flipped={isMonster}
          sx={{
            width: "auto",
            height: spriteHeight,
            maxWidth: "140%",
            maxHeight: spriteHeight,
            opacity: acting && moveFrameReady && !depthsCardActing ? 0 : 1,
            transition: "opacity 120ms linear",
            ...(!acting ? hitFlashSx : {}),
          }}
        />
        {acting && moveFrameReady && !depthsCardActing ? (
          <Box
            component="img"
            src={displayMoveSrc}
            alt={fighter.name}
            draggable={false}
            sx={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              display: "block",
              width: "auto",
              height: spriteHeight,
              maxWidth: "140%",
              maxHeight: spriteHeight,
              objectFit: "contain",
              transform: `translateX(-50%)${isMonster ? " scaleX(-1)" : ""}`,
              transformOrigin: "center bottom",
              opacity: 1,
              filter: "drop-shadow(0 18px 20px rgba(0,0,0,0.55))",
              pointerEvents: "none",
              userSelect: "none",
              ...hitFlashSx,
            }}
          />
        ) : null}
      </Box>
      <EffectStackRow effects={fighter.effects} />
    </Box>
  );
}

function ArenaDepthsCardCasterLayer({ battle, animation, localMs }) {
  if (!animation || !isDepthsCardMove(animation.move)) return null;

  const frames = getMoveCharacterFrames(animation.move);
  const fallback = animation.move?.casterAnimation?.sheetUrl || "";
  const frameList = getFramesFromCandidates([frames], fallback);
  if (!frameList.length) return null;

  const timings = animation.timings || getMoveAnimationTimings(animation.move, animation.moveKind);
  const repeatState = getAnimationRepeatState(animation, localMs);
  if (repeatState.inGap) return null;
  const repeatLocalMs = repeatState.localMs;
  const launchMs = Math.max(1, safeNumber(timings.effectStartMs, MOVE_EFFECT_LAUNCH_MS));
  const launchProgress = clamp(repeatLocalMs / launchMs, 0, 1);
  const afterLaunchMs = Math.max(0, repeatLocalMs - launchMs);
  const launchFrameIndex = Math.min(frameList.length - 1, 2);
  const frameIndex =
    launchProgress < 1
      ? Math.min(frameList.length - 1, Math.floor(launchProgress * 3))
      : afterLaunchMs < SIM_MOVE_CHAR_FRAME_HOLD * FRAME_MS
      ? launchFrameIndex
      : Math.min(frameList.length - 1, 3);
  const point = getDepthsCardCasterPoint({ battle, animation, localMs: repeatLocalMs });
  const moveRange = getMoveRange(animation.move?.type);
  const moveKind = animation.moveKind || getExplicitMoveKind(animation.move);
  const width =
    moveKind === "buff"
      ? { xs: "15%", md: "9%" }
      : moveRange === "melee"
      ? { xs: "18%", md: "11%" }
      : { xs: "16%", md: "10%" };

  return (
    <Box
      component="img"
      key={`${animation.id || "caster"}-${repeatState.repeatIndex}`}
      src={frameList[frameIndex] || frameList[0]}
      alt={`${animation.move?.name || "Depths card"} caster`}
      draggable={false}
      sx={{
        position: "absolute",
        zIndex: 5,
        left: `${point.left}%`,
        top: `${point.top}%`,
        width,
        maxHeight: 170,
        objectFit: "contain",
        transform: `translate(-50%, -50%)${!point.fromLeft ? " scaleX(-1)" : ""}`,
        filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.55)) drop-shadow(0 0 18px rgba(255,255,255,0.18))",
        pointerEvents: "none",
        userSelect: "none",
      }}
    />
  );
}

function ArenaEffectLayer({ battle, animation, localMs }) {
  if (!animation) return null;

  const effectFrames = getMoveEffectFrames(animation.move);
  const fallbackSrc = animation?.move?.moveVisualUrl || animation?.move?.visualUrl || "";
  const src = effectFrames[0] || fallbackSrc;
  if (!src) return null;

  const timings = animation.timings || getMoveAnimationTimings(animation.move, animation.moveKind);
  const repeatState = getAnimationRepeatState(animation, localMs);
  if (repeatState.inGap) return null;
  const repeatLocalMs = repeatState.localMs;
  const effectLocalMs = repeatLocalMs - safeNumber(timings.effectStartMs, MOVE_EFFECT_LAUNCH_MS);
  if (effectLocalMs < 0 || effectLocalMs > safeNumber(timings.effectDurationMs, PROJECTILE_DURATION_MS) + 450) {
    return null;
  }

  const effectFrameCount = Math.max(1, effectFrames.length || 1);
  const progress = clamp(
    effectLocalMs / Math.max(1, safeNumber(timings.effectDurationMs, PROJECTILE_DURATION_MS)),
    0,
    1
  );
  const secondFrameStart = timings.kind === "buff" ? 0.46 : 0.58;
  const thirdFrameStart = timings.kind === "buff" ? 0.64 : 0.66;
  const fourthFrameStart = timings.kind === "buff" ? 0.78 : 0.72;
  let effectFrameIndex = 0;

  if (effectFrameCount > 1 && progress >= secondFrameStart) {
    effectFrameIndex = Math.min(1, effectFrameCount - 1);
  }
  if (effectFrameCount > 2 && progress >= thirdFrameStart) {
    effectFrameIndex = Math.min(2, effectFrameCount - 1);
  }
  if (effectFrameCount > 3 && progress >= fourthFrameStart) {
    effectFrameIndex = Math.min(3, effectFrameCount - 1);
  }

  const effectSrc = effectFrames[effectFrameIndex] || src;
  const actorLeft = getFighterBattleLeft(animation.actorSide, battle);
  const actorTop = getFighterProjectileTop(animation.actorSide, battle);
  const getStraightLinePoint = (startLeft, startTop, impactLeft, impactTop, p, passDistance = 8) => {
    const dx = impactLeft - startLeft;
    const dy = impactTop - startTop;
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const exitLeft = impactLeft + (dx / distance) * passDistance;
    const exitTop = impactTop + (dy / distance) * passDistance;
    const impactProgress = Math.max(0.01, fourthFrameStart);
    const lineScale =
      p < impactProgress
        ? p / impactProgress
        : 1 + ((p - impactProgress) / Math.max(0.01, 1 - impactProgress)) * 0.22;
    const endLeft = p < impactProgress ? impactLeft : exitLeft;
    const endTop = p < impactProgress ? impactTop : exitTop;
    const scaledProgress = p < impactProgress ? lineScale : (lineScale - 1) / 0.22;

    return p < impactProgress
      ? {
          left: startLeft + (impactLeft - startLeft) * lineScale,
          top: startTop + (impactTop - startTop) * lineScale,
        }
      : {
          left: impactLeft + (endLeft - impactLeft) * scaledProgress,
          top: impactTop + (endTop - impactTop) * scaledProgress,
        };
  };

  const renderEffectImage = ({ key, left, top, width, fromLeft = true, isBuff = false }) => (
    <Box
      key={key}
      component="img"
      src={effectSrc}
      alt={`${animation.move?.name || "Move"} effect`}
      draggable={false}
      sx={{
        position: "absolute",
        zIndex: 6,
        left: `${left}%`,
        top: `${top}%`,
        width,
        maxHeight: 180,
        objectFit: "contain",
        transform: `translate(-50%, -50%)${!fromLeft && !isBuff ? " scaleX(-1)" : ""}`,
        opacity: progress > 0.92 ? 1 - (progress - 0.92) / 0.08 : 1,
        filter: "drop-shadow(0 0 20px rgba(255,255,255,0.32))",
        pointerEvents: "none",
        userSelect: "none",
      }}
    />
  );

  if (timings.kind === "buff") {
    const buffEffectSide = isDepthsCardMove(animation.move) ? animation.actorSide : animation.targetSide;
    return renderEffectImage({
      key: `${animation.id || "effect"}-${repeatState.repeatIndex}-${buffEffectSide || "buff"}`,
      left: getFighterBattleLeft(buffEffectSide, battle),
      top: getFighterBuffEffectTop(buffEffectSide, battle) - progress * 4,
      width: "10%",
      isBuff: true,
    });
  }

  const targetSides = moveHitsAllValidTargets(animation.move)
    ? [
        ...new Set(
          (asArray(animation.targetSides).length
            ? asArray(animation.targetSides)
            : getValidTargetSides(battle, animation.actorSide, animation.move)
          ).filter((side) => side && battle.fighters?.[side])
        ),
      ]
    : [animation.targetSide].filter(Boolean);

  const projectiles = targetSides
    .map((targetSide, targetIndex) => {
      const targetLeft = getFighterBattleLeft(targetSide, battle);
      const targetTop = getFighterProjectileTop(targetSide, battle);
      const fromLeft = actorLeft <= targetLeft;
      const depthsCardProjectile = isDepthsCardMove(animation.move);
      const depthsCardCasterPoint = depthsCardProjectile
        ? getDepthsCardCasterPoint({
            battle,
            animation,
            localMs: safeNumber(timings.effectStartMs, MOVE_EFFECT_LAUNCH_MS),
          })
        : null;
      const casterEdge = actorLeft + (fromLeft ? 8 : -8);
      let linePoint = depthsCardCasterPoint
        ? getStraightLinePoint(
            depthsCardCasterPoint.left,
            depthsCardCasterPoint.top,
            targetLeft,
            targetTop,
            progress,
            timings.kind === "melee" ? 4 : 8
          )
        : getStraightLinePoint(casterEdge, actorTop, targetLeft, targetTop, progress, 8);
      let left = linePoint.left;
      let top = linePoint.top;
      let width = "15%";

      if (depthsCardProjectile) {
        width = timings.kind === "melee" ? "12%" : "14%";
      } else if (timings.kind === "melee") {
        const attackCenter = actorLeft + (targetLeft - actorLeft) * 0.62;
        const attackTop = actorTop + (targetTop - actorTop) * 0.62;
        const start = fromLeft ? attackCenter + 8 : attackCenter - 8;
        linePoint = getStraightLinePoint(start, attackTop, targetLeft, targetTop, progress, 7);
        left = linePoint.left;
        top = linePoint.top;
        width = "13%";
      }

      return renderEffectImage({
        key: `${animation.id || "effect"}-${repeatState.repeatIndex}-${targetSide}-${targetIndex}`,
        left,
        top,
        width,
        fromLeft,
      });
    })
    .filter(Boolean);

  return projectiles.length === 1 ? projectiles[0] : <>{projectiles}</>;
}

function ArenaStage({
  battle,
  playerTurn,
  selectedMove,
  onMoveSelect,
  onTargetSelect,
  onInspectFighter,
  audioSettings,
  onToggleMusic,
  onToggleSfx,
  onMusicVolumeChange,
  onSfxVolumeChange,
}) {
  const champion = battle.fighters.A;
  const enemySides = getEnemySides(battle);
  const localMs = useAnimationClock(battle.animation);
  const introActive = battle.phase === "intro";
  const backgroundImageUrl = battle.backgroundImageUrl || getDepthsEncounterBackground(battle.room);
  const championCardState = getChampionCardState(champion, battle.championCards);
  const championHandCards = playerTurn
    ? asArray(championCardState.hand)
        .map((card, index) => ({
          card,
          move: findMoveForCard(champion, card),
          label: `Card ${index + 1}`,
        }))
        .filter((entry) => entry.move)
    : [];
  const targetableSides =
    playerTurn && selectedMove ? new Set(getValidTargetSides(battle, "A", selectedMove)) : new Set();

  return (
    <Box
      sx={{
        position: "relative",
        background: "#050505",
        overflow: "hidden",
        height: { xs: "calc(100vh - 122px)", md: "calc(100vh - 132px)" },
        minHeight: { xs: 720, md: 740 },
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background:
            `linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.34)), url(${backgroundImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
          backgroundRepeat: "no-repeat",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 62%, rgba(255,255,255,0.06), transparent 44%), linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.2) 58%, rgba(0,0,0,0.36))",
          pointerEvents: "none",
        }}
      />
      <DepthsAudioControls
        settings={audioSettings}
        onToggleMusic={onToggleMusic}
        onToggleSfx={onToggleSfx}
        onMusicVolumeChange={onMusicVolumeChange}
        onSfxVolumeChange={onSfxVolumeChange}
      />

      <ArenaFighterSprite
        fighter={champion}
        side="A"
        battle={battle}
        animation={battle.animation}
        localMs={localMs}
        introActive={introActive}
        targetable={targetableSides.has("A")}
        onTargetSelect={() => onTargetSelect?.("A")}
        onInspect={onInspectFighter}
      />
      {enemySides.map((side) => (
        <ArenaFighterSprite
          key={side}
          fighter={battle.fighters[side]}
          side={side}
          battle={battle}
          animation={battle.animation}
          localMs={localMs}
          introActive={introActive}
          targetable={targetableSides.has(side)}
          onTargetSelect={() => onTargetSelect?.(side)}
          onInspect={onInspectFighter}
        />
      ))}
      <ArenaDepthsCardCasterLayer battle={battle} animation={battle.animation} localMs={localMs} />
      <ArenaEffectLayer battle={battle} animation={battle.animation} localMs={localMs} />
      {getBattlePopups(battle).map((popup) => (
        <FloatingPopup key={`${popup.id}-${popup.createdAt || popup.queuedAt || ""}`} popup={popup} />
      ))}

      <Box
        sx={{
          position: "absolute",
          left: "50%",
          bottom: { xs: 10, md: 18 },
          width: { xs: "min(94vw, 360px)", sm: "min(72vw, 430px)", md: "min(46vw, 470px)" },
          transform: "translateX(-50%)",
          zIndex: 12,
        }}
      >
        <MoveBoardPanel
          title={selectedMove ? "Choose Target" : playerTurn ? "Choose Card" : "Champion Deck"}
          fighter={champion}
          cards={championHandCards}
          cardState={championCardState}
          selectable
          disabled={!playerTurn}
          onMoveSelect={onMoveSelect}
          horizontal
          showDeckCounts={false}
        />
      </Box>
    </Box>
  );
}

function MoveButton({ move, disabled, onClick, fighter }) {
  const moveKind = getExplicitMoveKind(move);
  const appliedEffectAmount = getMoveAppliedEffectAmount(move, fighter, moveKind);
  const appliedEffect = move.effect && move.effect !== "none"
    ? `${appliedEffectAmount} ${move.effect}`
    : "";
  const displayPower = getMovePowerBreakdown(move, fighter).finalValue;
  const displayAccuracy = getMoveAccuracy(move, fighter);

  return (
    <Button
      disabled={disabled}
      onClick={onClick}
      sx={{
        width: "100%",
        minHeight: 118,
        p: 1.35,
        display: "block",
        textAlign: "left",
        color: THEME.text,
        border: `1px solid ${THEME.line}`,
        borderRadius: 0,
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.88))",
        textTransform: "none",
        "&:hover": {
          borderColor: THEME.lineStrong,
          background: "rgba(255,255,255,0.08)",
        },
      }}
    >
      <Typography sx={{ fontWeight: 900, fontSize: 14 }}>{move.name}</Typography>
      <Typography sx={{ color: THEME.muted, fontSize: 11, textTransform: "uppercase", mt: 0.4 }}>
        {move.type} | {getMoveCooldown(move).toFixed(1)}s CD
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.45, mt: 0.8 }}>
        <DepthsBattleStatIconPill
          icon={POWER_ICON_SRC}
          alt="power"
          value={Number(displayPower || 0).toFixed(0)}
        />
        <DepthsBattleStatIconPill
          icon={ACCURACY_ICON_SRC}
          alt="accuracy"
          value={Number(displayAccuracy || 0).toFixed(0)}
        />
      </Box>
      {appliedEffect ? (
        <Typography sx={{ color: THEME.gold, fontSize: 12, mt: 0.5 }}>
          Apply {appliedEffect}
        </Typography>
      ) : null}
    </Button>
  );
}

function BattleLog({ log }) {
  const items = asArray(log).slice(-9).reverse();

  return (
    <Box
      sx={{
        maxHeight: 300,
        overflowY: "auto",
        border: `1px solid ${THEME.line}`,
        background: "rgba(0,0,0,0.42)",
      }}
    >
      {items.map((entry) => (
        <Box key={entry.id} sx={{ px: 1.2, py: 1, borderBottom: `1px solid ${THEME.line}` }}>
          <Typography sx={{ color: THEME.text, fontSize: 12, fontWeight: 800 }}>
            {entry.title}
          </Typography>
          {entry.text ? (
            <Typography sx={{ color: THEME.muted, fontSize: 12, lineHeight: 1.45 }}>
              {entry.text}
            </Typography>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}

export default function DepthsBattle({
  championRecord,
  monster,
  monsters,
  room = 1,
  activeAddress,
  runId = null,
  runToken = null,
  runArtifacts = [],
  runCards = [],
  runCardUpgrades = [],
  resumeBattle = null,
  currentNodeId = "",
  currentNodeType = "",
  onComplete,
}) {
  const [battle, setBattle] = useState(null);
  const [selectedMove, setSelectedMove] = useState(null);
  const [inspectSide, setInspectSide] = useState(null);
  const battleRef = useRef(null);
  const docRef = useRef(null);
  const monsterTurnQueuedRef = useRef(false);
  const animationTimeoutRef = useRef(null);
  const pendingResolvedMoveRef = useRef({});
  const resumedCompletionNotifiedRef = useRef(false);
  const mountedRef = useRef(false);
  const battleAudioKey = battle?.id || (battle ? `${runId || "depths"}-${room}` : "");
  const depthsAudio = useDepthsBattleAudio({
    battleKey: battleAudioKey,
    active: battle?.status === "active",
  });
  const playBattleSfx = depthsAudio.playSfx;

  useEffect(() => {
    battleRef.current = battle;
  }, [battle]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animationTimeoutRef.current) window.clearTimeout(animationTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    resumedCompletionNotifiedRef.current = false;
  }, [resumeBattle?.id || resumeBattle?.battleId || ""]);

  const persistBattle = async (nextBattle, extra = {}) => {
    if (!docRef.current || !nextBattle) return;
    try {
      const { completedAt, ...plainExtra } = extra;
      return await postDepthsState({
        action: "updateBattle",
        battleId: docRef.current,
        runToken,
        updates: {
          ...plainExtra,
          ...(completedAt ? { completedAt: true } : {}),
          actionLog: cleanForFirestore(nextBattle.actionLog || []),
          snapshot: summarizeBattle(nextBattle),
        },
      });
    } catch (error) {
      console.warn("Depths battle save failed:", error);
      return {
        serverBattleVerified: false,
        serverBattleVerificationError: error?.message || "Depths battle save failed.",
      };
    }
  };

  const appendLog = (next, entry) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    next.log = [...asArray(next.log), { id, ...entry }].slice(-80);
  };

  const markBattleFinished = (next) => {
    const winner = getWinner(next);
    if (!winner) return false;

    next.status = "complete";
    next.phase = "complete";
    next.winner = winner;
    next.activeSide = null;
    appendLog(next, {
      title: winner === "champion" ? "Room Cleared" : winner === "monster" ? "Champion Defeated" : "Mutual Defeat",
      text:
        winner === "champion"
          ? `${next.fighters.A.name} defeated every monster.`
          : winner === "monster"
          ? `${next.fighters.A.name} was defeated.`
          : "Both fighters fell.",
    });
    withLatestVerificationAfterSnapshot(next);
    return winner;
  };

  const finishBattle = (next) => {
    const winner = markBattleFinished(next);
    if (!winner) return false;
    setBattle(next);
    persistBattle(next, { status: "complete", winner, completedAt: true }).then((saveResult) => {
      if (!mountedRef.current) return;
      if (saveResult?.serverBattleVerified) {
        onComplete?.({ winner, battle: next });
        return;
      }
      setBattle((prev) => ({
        ...(prev || next),
        serverVerificationError:
          saveResult?.serverBattleVerificationError ||
          "Battle completed locally, but the server did not verify it yet. Refresh and resume this run before continuing.",
      }));
    });
    return true;
  };

  useEffect(() => {
    const roomMonsters = (Array.isArray(monsters) && monsters.length ? monsters : [monster]).filter(Boolean);
    if (!championRecord?.charObj || !roomMonsters.length) return;

    let cancelled = false;

    async function start() {
      const backgroundImageUrl = getDepthsEncounterBackground(room);
      const champion = makeFighter({
        side: "A",
        role: "champion",
        assetId: championRecord.assetId,
        entity: {
          ...championRecord.charObj,
          depthsRunCards: championRecord.charObj?.depthsRunCards?.length
            ? championRecord.charObj.depthsRunCards
            : runCards,
        },
        imageUrl: championRecord.imageUrl,
        backgroundImageUrl:
          championRecord.backgroundImageUrl || championRecord.charObj?.backgroundImageUrl || "",
        runArtifacts,
      });
      const enemyFighters = roomMonsters.map((roomMonster, index) =>
        makeFighter({
          side: String.fromCharCode("B".charCodeAt(0) + index),
          role: "monster",
          assetId: roomMonster.monsterId || roomMonster.docId || roomMonster.id,
          entity: roomMonster,
          imageUrl: roomMonster.standingUrl,
        })
      );
      const enemyNames = enemyFighters.map((enemy) => enemy.name).join(", ");

      let initialBattle = {
        id: null,
        runId,
        runArtifacts,
        runCards,
        runCardUpgrades,
        room,
        currentNodeId,
        currentNodeType,
        backgroundImageUrl,
        status: "active",
        phase: "intro",
        activeSide: null,
        winner: null,
        round: 0,
        animation: null,
        popup: null,
        popups: [],
        popupQueues: {},
        hitFlash: null,
        actionLog: [],
        fighters: {
          A: recomputeCooldown(champion),
          ...enemyFighters.reduce((acc, enemy) => {
            acc[enemy.side] = recomputeCooldown(enemy);
            return acc;
          }, {}),
        },
        championCards: null,
        log: [
          {
            id: `${Date.now()}-start`,
            title: `Room ${room}`,
            text: `${champion.name} enters battle against ${enemyNames}.`,
          },
        ],
      };
      initialBattle.championCards = createChampionCardState(initialBattle.fighters.A);

      applyStartOfBattleRuntimeEffects(initialBattle).forEach((event) => {
        appendLog(initialBattle, event);
      });

      const resumeBattleId = resumeBattle?.id || resumeBattle?.battleId || "";
      const resumeSnapshot = resumeBattle?.resumeSnapshot || resumeBattle?.resolvedSnapshot || resumeBattle?.snapshot || null;

      if (resumeBattleId && resumeSnapshot) {
        initialBattle = hydrateBattleFromSnapshot(initialBattle, resumeSnapshot, resumeBattleId, resumeBattle);
        docRef.current = resumeBattleId;
      } else {
        try {
          const created = await postDepthsState({
            action: "createBattle",
            runToken,
            data: {
              activeAddress: activeAddress || null,
              runId: runId || null,
              room,
              currentNodeId,
              currentNodeType,
              backgroundImageUrl,
              status: "active",
              championAssetId: champion.assetId || null,
              championName: champion.name,
              championRunSnapshot: cleanForFirestore(summarizeVerificationFighter(champion, "A")),
              monsterIds: enemyFighters.map((enemy) => enemy.assetId || null),
              monsterNames: enemyFighters.map((enemy) => enemy.name),
              monsterScaling: enemyFighters.map((enemy) => enemy.depthsScaling || null),
              snapshot: cleanForFirestore(summarizeBattle(initialBattle)),
            },
          });
          docRef.current = created.id;
          initialBattle.id = created.id;
        } catch (error) {
          console.warn("Depths battle create failed:", error);
        }
      }

      if (!cancelled) setBattle(initialBattle);
    }

    start();

    return () => {
      cancelled = true;
      docRef.current = null;
      monsterTurnQueuedRef.current = false;
      setSelectedMove(null);
      if (animationTimeoutRef.current) window.clearTimeout(animationTimeoutRef.current);
    };
  }, [
    championRecord?.assetId,
    runId,
    runToken,
    JSON.stringify(runArtifacts.map((artifact) => artifact.id || artifact.name || "")),
    JSON.stringify(runCards.map((card) => card.id || card.cardId || card.name || "")),
    JSON.stringify(runCardUpgrades.map((upgrade) => upgrade.id || upgrade.name || "")),
    resumeBattle?.id || resumeBattle?.battleId || "",
    room,
    currentNodeId,
    currentNodeType,
    (Array.isArray(monsters) ? monsters : [monster])
      .filter(Boolean)
      .map((entry) => entry?.docId || entry?.monsterId || entry?.id)
      .join("|"),
  ]);

  useEffect(() => {
    if (!battle || battle.status !== "active" || battle.phase !== "intro") return undefined;
    const timer = window.setTimeout(() => {
      setBattle((prev) => {
        if (!prev || prev.phase !== "intro") return prev;
        return { ...prev, phase: "deciding" };
      });
    }, INTRO_TOTAL_MS);

    return () => window.clearTimeout(timer);
  }, [battle?.id, battle?.phase, battle?.status]);

  useEffect(() => {
    const resumedBattleWasAlreadyComplete =
      resumeBattle &&
      (resumeBattle.status === "complete" ||
        resumeBattle.snapshot?.status === "complete" ||
        resumeBattle.resumeSnapshot?.status === "complete" ||
        resumeBattle.resolvedSnapshot?.status === "complete");
    if (!resumedBattleWasAlreadyComplete) return;
    if (resumedCompletionNotifiedRef.current) return;
    if (!battle || battle.status !== "complete" || !battle.winner) return;

    resumedCompletionNotifiedRef.current = true;
    window.setTimeout(() => {
      onComplete?.({ winner: battle.winner, battle });
    }, 0);
  }, [battle?.id, battle?.status, battle?.winner, resumeBattle?.id, resumeBattle?.battleId]);

  const clearPopupLater = (popupId, extraDelayMs = 0) => {
    window.setTimeout(() => {
      let promotedPopup = null;
      setBattle((prev) => {
        if (!prev) return prev;
        const activePopups = getBattlePopups(prev);
        const popupToClear = activePopups.find((popup) => popup.id === popupId);
        if (!popupToClear) return prev;

        const queueKey = getPopupQueueKey(popupToClear);
        const popupQueues = { ...(prev.popupQueues || {}) };
        const sideQueue = asArray(popupQueues[queueKey]);
        const nextQueuedPopup = sideQueue[0] || null;
        const remainingQueue = sideQueue.slice(1);

        if (remainingQueue.length) {
          popupQueues[queueKey] = remainingQueue;
        } else {
          delete popupQueues[queueKey];
        }

        const nextPopups = asArray(prev.popups).filter((popup) => popup.id !== popupId);
        const nextPopup = prev.popup?.id === popupId ? null : prev.popup || null;
        if (nextQueuedPopup) {
          promotedPopup = {
            ...nextQueuedPopup,
            createdAt: Date.now(),
            queuedAt: Date.now(),
          };
          promotedPopup = withPopupStackPosition(promotedPopup, nextPopups);
          nextPopups.push(promotedPopup);
        }

        return {
          ...prev,
          popups: nextPopups.slice(-MAX_VISIBLE_POPUPS),
          popup: nextPopup,
          popupQueues,
        };
      });
      if (promotedPopup?.id) clearPopupLater(promotedPopup.id, promotedPopup.delayMs);
    }, POPUP_CLEAR_DELAY_MS + Math.max(0, safeNumber(extraDelayMs, 0)));
  };

  const clearHitFlashLater = (hitFlashId) => {
    window.setTimeout(() => {
      setBattle((prev) => {
        if (!prev || prev.hitFlash?.id !== hitFlashId) return prev;
        return { ...prev, hitFlash: null };
      });
    }, 720);
  };

  const applyOngoingBeforeTurn = (next, actorSide) => {
    const fighter = next.fighters[actorSide];
    const delta = computeOngoingEffectHpDelta(fighter.effects);
    if (!delta) return;

    const beforeSnapshot = makeBattleVerificationSnapshot(next, { includeMoves: false });
    const previousHp = fighter.hp;
    fighter.hp = clamp(Math.round(fighter.hp + delta), 0, fighter.maxHp);
    if (delta < 0) playBattleSfx("dot");
    if (delta < 0 && previousHp > 0 && fighter.hp <= 0) playBattleSfx("death");
    if (delta < 0 && previousHp > 0 && fighter.hp <= 0) {
      next.killingBlow = buildOngoingDefeatSnapshot({
        battle: next,
        targetSide: actorSide,
        target: fighter,
        delta,
      });
    }
    const secondWindEvent = delta < 0 ? applyDepthsSecondWind(fighter) : null;
    const amountText = Math.abs(delta).toFixed(1).replace(/\.0$/, "");
    const popupId = `${Date.now()}-dot-${actorSide}`;
    const popupLines = [
      { text: delta < 0 ? `-${amountText}` : `+${amountText}`, tone: delta < 0 ? "damage" : "heal" },
    ];
    const secondWindPopupLine = getEffectPopupLine(secondWindEvent);
    if (secondWindPopupLine) popupLines.push(secondWindPopupLine);
    pushBattlePopup(next, {
      id: popupId,
      side: actorSide,
      leftPct: getFighterBattleLeft(actorSide, next),
      topPct: clamp(getFighterPopupTop(actorSide, next) - DOT_POPUP_TOP_OFFSET, 12, 84),
      text: delta < 0 ? `-${amountText}` : `+${amountText}`,
      lines: popupLines,
      kind: delta < 0 ? "damage" : "heal",
      delayMs: EFFECT_DAMAGE_POPUP_DELAY_MS,
    });
    clearPopupLater(popupId, EFFECT_DAMAGE_POPUP_DELAY_MS);
    appendLog(next, {
      title: `${fighter.name} suffers ongoing effects`,
      text: `${fighter.name} ${delta < 0 ? "loses" : "recovers"} ${amountText} HP before acting.${
        secondWindEvent?.text ? ` ${secondWindEvent.text}` : ""
      }`,
    });

    if (previousHp !== fighter.hp) next.round += 1;

    next.actionLog = [
      ...asArray(next.actionLog),
      {
        index: asArray(next.actionLog).length,
        actorSide: "effects",
        targetSide: actorSide,
        actorRole: "system",
        targetRole: fighter?.role || "",
        moveId: "ongoing-effects",
        moveName: "Ongoing effects",
        moveType: "effect",
        moveKind: "system",
        targetMode: "single",
        room: next.room || null,
        beforeSnapshot,
        afterSnapshot: makeBattleVerificationSnapshot(next, { includeMoves: false }),
        recordedAt: Date.now(),
      },
    ];
  };

  const resolveNextActor = () => {
    const current = battleRef.current;
    if (!current || current.status !== "active" || current.phase !== "deciding") return;

    const actorSide = determineNextActor(current);
    const next = JSON.parse(JSON.stringify(current));

    if (!actorSide) {
      next.phase = "cooldown";
      setBattle(next);
      return;
    }

    applyOngoingBeforeTurn(next, actorSide);
    if (finishBattle(next)) return;

    if (safeNumber(next.fighters[actorSide]?.hp, 0) <= 0) {
      next.activeSide = null;
      next.phase = "cooldown";
      setBattle(next);
      persistBattle(next);
      return;
    }

    next.activeSide = actorSide;
    next.phase = actorSide === "A" ? "playerTurn" : "monsterTurn";
    const drawnCards = actorSide === "A" ? drawChampionCards(next, 2) : [];
    appendLog(next, {
      title: actorSide === "A" ? "Champion Ready" : "Monster Ready",
      text:
        actorSide === "A"
          ? drawnCards.length
            ? `${next.fighters.A.name} draws ${drawnCards
                .map((card) => card.moveName || "a card")
                .join(" and ")}. Choose one card to play.`
            : "No cards are available to draw."
          : `${next.fighters[actorSide]?.name || "A monster"} is choosing a move.`,
    });
    setBattle(next);
    persistBattle(next);
  };

  useEffect(() => {
    if (!battle || battle.status !== "active" || battle.phase !== "deciding") return undefined;
    const timer = window.setTimeout(resolveNextActor, 250);
    return () => window.clearTimeout(timer);
  }, [battle?.phase, battle?.round, battle?.status]);

  useEffect(() => {
    if (!battle || battle.status !== "active" || battle.phase !== "cooldown") return undefined;

    const interval = window.setInterval(() => {
      setBattle((prev) => {
        if (!prev || prev.status !== "active" || prev.phase !== "cooldown") return prev;

        const next = JSON.parse(JSON.stringify(prev));
        Object.keys(next.fighters || {}).forEach((side) => {
          next.fighters[side] = tickFighterCooldown(next.fighters[side], TICK_MS / 1000);
        });

        if (determineNextActor(next)) next.phase = "deciding";
        return next;
      });
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [battle?.phase, battle?.status]);

  const resolveMoveOutcome = (sourceBattle, move, actorSide, targetSide, animationId, options = {}) => {
    if (!sourceBattle || sourceBattle.status !== "active") return null;

    const commit = options.commit !== false;
    const playSounds = options.playSounds !== false;
    const scheduleVisuals = options.scheduleVisuals !== false;

    const next = JSON.parse(JSON.stringify(sourceBattle));
    const actor = next.fighters[actorSide];
    const target = next.fighters[targetSide];
    if (!actor || !target) return null;
    const moveKind = getExplicitMoveKind(move);

    let title = `${actor.name} uses ${move.name}`;
    let text = "";
    let hitFlashId = null;
    const popupIdsToClear = [];
    const trackPopupId = (popupId) => {
      if (popupId && !popupIdsToClear.includes(popupId)) popupIdsToClear.push(popupId);
      return popupId;
    };
    const touchedTargetSides = new Set([targetSide]);

    if (moveKind === "buff") {
      const targetSides = moveHitsAllValidTargets(move)
        ? getValidTargetSides(next, actorSide, move)
        : [targetSide];
      const resultTexts = [];

      targetSides.forEach((currentTargetSide, targetIndex) => {
        const currentTarget = next.fighters[currentTargetSide];
        if (!currentTarget || safeNumber(currentTarget.hp, 0) <= 0) return;
        touchedTargetSides.add(currentTargetSide);

        const popupId = trackPopupId(`${animationId}-${currentTargetSide}-${targetIndex}-buff-result`);
        const isCritical = rollCritical(actor, move);
        const { dmg: healAmountRaw } = calcDamageRPG({
          movePower: move.power,
          category: move.type,
          moveKind,
          attackerStats: actor.stats,
          attackerEffects: actor.effects,
          defenderEffects: currentTarget.effects,
        });
        const healAmount = Math.max(
          1,
          Math.round(applyArtifactHealingModifier(applyCriticalDamage(healAmountRaw, actor, isCritical), actor))
        );
        const prevHp = currentTarget.hp;
        currentTarget.hp = Math.min(currentTarget.maxHp, currentTarget.hp + healAmount);
        const effectEvent = applyMoveEffect({ battle: next, actorSide, targetSide: currentTargetSide, move, moveKind });
        const secondaryEvents = applyCardUpgradeSecondaryEffects({
          actor,
          target: currentTarget,
          move,
          hitWasCritical: isCritical,
        });
        const popupLines = [
          { text: `+${currentTarget.hp - prevHp}`, tone: isCritical ? "critHeal" : "heal", large: isCritical },
        ];
        const effectPopupLine = getEffectPopupLine(effectEvent);
        if (effectPopupLine) popupLines.push(effectPopupLine);
        secondaryEvents.forEach((event) => {
          const runtimeLine = getEffectPopupLine(event);
          if (runtimeLine) popupLines.push(runtimeLine);
        });
        pushBattlePopup(next, {
          id: popupId,
          side: currentTargetSide,
          leftPct: getFighterBattleLeft(currentTargetSide, next),
          topPct: getFighterPopupTop(currentTargetSide, next),
          text: popupLines.map((line) => line.text).join("\n"),
          lines: popupLines,
          kind: isCritical ? "critHeal" : "heal",
        });

        let targetText = `${currentTarget.name} recovers ${currentTarget.hp - prevHp} HP.`;
        if (effectEvent?.amount) {
          targetText += ` ${effectEvent.effectName} +${effectEvent.amount} applied.`;
        }
        if (secondaryEvents.length) {
          targetText += ` ${secondaryEvents
            .map(
              (event) =>
                event.text ||
                `${event.sourceName}: ${event.targetName} gains ${event.amount} ${event.effectName}`
            )
            .join(" ")}`;
        }
        resultTexts.push(targetText);
      });

      text = resultTexts.join(" ");
    } else {
      const targetSides = moveHitsAllValidTargets(move)
        ? getValidTargetSides(next, actorSide, move)
        : [targetSide];
      const repeatCount = getMoveRepeatCount(move);
      const resultTexts = [];

      targetSides.forEach((currentTargetSide, targetIndex) => {
        const currentTarget = next.fighters[currentTargetSide];
        if (!currentTarget || safeNumber(currentTarget.hp, 0) <= 0) return;
        touchedTargetSides.add(currentTargetSide);

        const popupId = trackPopupId(`${animationId}-${currentTargetSide}-${targetIndex}-result`);
        const accuracy = getMoveAccuracy(move, actor);
        const hitRoll = Math.random() * 100;
        const hits = hitRoll <= accuracy;

        if (!hits) {
          if (playSounds) playBattleSfx("miss");
          const missLines = [{ text: "MISS", tone: "miss", large: true }];
          pushBattlePopup(next, {
            id: popupId,
            side: currentTargetSide,
            leftPct: getFighterBattleLeft(currentTargetSide, next),
            topPct: getFighterPopupTop(currentTargetSide, next),
            text: "MISS",
            lines: missLines,
            kind: "miss",
          });
          resultTexts.push(`${actor.name} missed ${currentTarget.name}.`);
          return;
        }

        if (playSounds) playBattleSfx("hit");
        let totalDamage = 0;
        let totalLowHpBonus = 0;
        let anyCritical = false;
        const criticalRolls = [];

        for (let repeatIndex = 0; repeatIndex < repeatCount; repeatIndex += 1) {
          const isCritical = rollCritical(actor, move);
          anyCritical = anyCritical || isCritical;
          criticalRolls.push(isCritical);
          const { dmg: baseDamage } = calcDamageRPG({
            movePower: move.power,
            category: move.type,
            moveKind,
            attackerStats: actor.stats,
            attackerEffects: actor.effects,
            defenderEffects: currentTarget.effects,
          });
          const lowHpBonus = getDepthsLowHpDamageBonus(actor, currentTarget);
          totalLowHpBonus += lowHpBonus;
          const criticalDamage = applyCriticalDamage(baseDamage + lowHpBonus, actor, isCritical);
          totalDamage += applyArtifactDamageModifiers(criticalDamage, actor, currentTarget);
        }

        const targetPreviousHp = currentTarget.hp;
        currentTarget.hp = Math.max(0, currentTarget.hp - totalDamage);
        if (playSounds && targetPreviousHp > 0 && currentTarget.hp <= 0) playBattleSfx("death");

        const currentHitFlashId = `${popupId}-hit`;
        if (!hitFlashId) {
          hitFlashId = currentHitFlashId;
          next.hitFlash = { id: hitFlashId, side: currentTargetSide };
        }

        const effectEvents = [];
        const runtimeHitEvents = [];
        for (let repeatIndex = 0; repeatIndex < repeatCount; repeatIndex += 1) {
          const effectEvent = applyMoveEffect({
            battle: next,
            actorSide,
            targetSide: currentTargetSide,
            move,
            moveKind,
          });
          if (effectEvent) effectEvents.push(effectEvent);
          runtimeHitEvents.push(
            ...applyOnHitRuntimeEffects({
              actor,
              target: currentTarget,
              move,
              hitWasCritical: criticalRolls[repeatIndex],
            })
          );
          runtimeHitEvents.push(
            ...applyCardUpgradeSecondaryEffects({
              actor,
              target: currentTarget,
              move,
              hitWasCritical: criticalRolls[repeatIndex],
            })
          );
        }

        runtimeHitEvents.push(
          ...applyHealForAppliedStackRuntimeEffects({
            actor,
            appliedEvents: [...effectEvents, ...runtimeHitEvents],
          })
        );

        const lifeStealEvent = applyDepthsLifeSteal(actor, totalDamage);
        if (lifeStealEvent) runtimeHitEvents.push(lifeStealEvent);
        const healOnKillEvent =
          targetPreviousHp > 0 && currentTarget.hp <= 0
            ? applyArtifactHealOnKill(actor, currentTarget)
            : null;
        if (healOnKillEvent) runtimeHitEvents.push(healOnKillEvent);
        const secondWindEvent = applyDepthsSecondWind(currentTarget);
        if (secondWindEvent) runtimeHitEvents.push(secondWindEvent);

        if (targetPreviousHp > 0 && currentTarget.hp <= 0) {
          next.killingBlow = buildKillingBlowSnapshot({
            battle: next,
            actorSide,
            targetSide: currentTargetSide,
            actor,
            target: currentTarget,
            move,
            damage: totalDamage,
            critical: anyCritical,
          });
        }

        const aggregatedEffect = effectEvents.reduce((acc, event) => {
          if (!event) return acc;
          if (!acc && event.resisted) return event;
          if (!event.amount) return acc || event;
          if (!acc || acc.resisted || acc.effectName !== event.effectName) {
            return { ...event };
          }
          return { ...acc, amount: safeNumber(acc.amount, 0) + safeNumber(event.amount, 0) };
        }, null);

        const popupLines = [
          { text: `-${totalDamage}`, tone: anyCritical ? "crit" : "damage", large: anyCritical },
        ];
        const effectPopupLine = getEffectPopupLine(aggregatedEffect);
        if (effectPopupLine) popupLines.push(effectPopupLine);
        const sideEffectLines = {};
        runtimeHitEvents.forEach((event) => {
          const runtimeLine = getEffectPopupLine(event);
          if (!runtimeLine) return;

          const eventSide = event.targetSide || currentTargetSide;
          if (eventSide === currentTargetSide) {
            popupLines.push(runtimeLine);
            return;
          }

          sideEffectLines[eventSide] = [...(sideEffectLines[eventSide] || []), runtimeLine];
        });

        pushBattlePopup(next, {
          id: popupId,
          side: currentTargetSide,
          leftPct: getFighterBattleLeft(currentTargetSide, next),
          topPct: getFighterPopupTop(currentTargetSide, next),
          text: popupLines.map((line) => line.text).join("\n"),
          lines: popupLines,
          kind: anyCritical ? "crit" : "damage",
        });
        Object.entries(sideEffectLines).forEach(([eventSide, lines]) => {
          const sidePopupId = trackPopupId(`${popupId}-${eventSide}-effects`);
          const popupKind = lines.some((line) => line.kind === "heal" || line.tone === "heal")
            ? "heal"
            : "effect";
          pushBattlePopup(next, {
            id: sidePopupId,
            side: eventSide,
            leftPct: getFighterBattleLeft(eventSide, next),
            topPct: getFighterPopupTop(eventSide, next),
            text: lines.map((line) => line.text).join("\n"),
            lines,
            kind: popupKind,
          });
        });

        const hitCountText = repeatCount > 1 ? ` over ${repeatCount} hits` : "";
        resultTexts.push(`${actor.name} hits ${currentTarget.name} for ${totalDamage} damage${hitCountText}.`);
        if (totalLowHpBonus > 0) {
          resultTexts.push(`Execution Mark adds ${totalLowHpBonus} damage.`);
        }
        if (aggregatedEffect?.resisted) {
          resultTexts.push(`${currentTarget.name} resisted ${aggregatedEffect.effectName}.`);
        } else if (aggregatedEffect?.amount) {
          resultTexts.push(`${aggregatedEffect.effectName} +${aggregatedEffect.amount} applied.`);
        }
        if (runtimeHitEvents.length) {
          resultTexts.push(
            runtimeHitEvents
              .map(
                (event) =>
                  event.text ||
                  `${event.sourceName}: ${event.targetName} gains ${event.amount} ${event.effectName}`
              )
              .join(" ")
          );
        }
        if (secondWindEvent?.text) {
          resultTexts.push(secondWindEvent.text);
        }
      });

      text = resultTexts.join(" ");
    }

    const cooldownOverrideText = consumeArtifactCooldownOverride(actor, moveKind);
    const nextCooldown = cooldownOverrideText ? 0 : getMoveCooldown(move);
    if (cooldownOverrideText) text += ` ${cooldownOverrideText}`;

    actor.cooldown = {
      base: nextCooldown,
      progress: 0,
      remaining: nextCooldown,
      total: nextCooldown,
    };
    next.fighters[actorSide] = recomputeCooldown(actor);
    touchedTargetSides.forEach((side) => {
      if (next.fighters[side]) next.fighters[side] = recomputeCooldown(next.fighters[side]);
    });
    next.round += 1;
    next.animation = null;

    appendLog(next, { title, text });
    withLatestVerificationAfterSnapshot(next);

    if (getWinner(next)) {
      const winner = markBattleFinished(next);
      if (!commit) return { battle: next, popupIdsToClear, hitFlashId, winner };
      setBattle(next);
      persistBattle(next, { status: "complete", winner, completedAt: true }).then((saveResult) => {
        if (!mountedRef.current) return;
        if (saveResult?.serverBattleVerified) {
          onComplete?.({ winner, battle: next });
          return;
        }
        setBattle((prev) => ({
          ...(prev || next),
          serverVerificationError:
            saveResult?.serverBattleVerificationError ||
            "Battle completed locally, but the server did not verify it yet. Refresh and resume this run before continuing.",
        }));
      });
      if (scheduleVisuals) {
        popupIdsToClear.forEach((popupId) => clearPopupLater(popupId));
        if (hitFlashId) clearHitFlashLater(hitFlashId);
      }
      return { battle: next, popupIdsToClear, hitFlashId, winner };
    }

    next.phase = "cooldown";
    next.activeSide = null;
    if (!commit) return { battle: next, popupIdsToClear, hitFlashId, winner: null };
    setBattle(next);
    persistBattle(next);
    if (scheduleVisuals) {
      popupIdsToClear.forEach((popupId) => clearPopupLater(popupId));
      if (hitFlashId) clearHitFlashLater(hitFlashId);
    }
    return { battle: next, popupIdsToClear, hitFlashId, winner: null };
  };

  const playCommittedOutcomeSounds = (beforeBattle, afterBattle) => {
    const popups = getBattlePopups(afterBattle);
    if (popups.some((popup) => popup.kind === "miss")) playBattleSfx("miss");
    if (popups.some((popup) => popup.kind === "damage" || popup.kind === "crit")) playBattleSfx("hit");

    const beforeFighters = beforeBattle?.fighters || {};
    const afterFighters = afterBattle?.fighters || {};
    const defeated = Object.keys(afterFighters).some(
      (side) => safeNumber(beforeFighters?.[side]?.hp, 0) > 0 && safeNumber(afterFighters?.[side]?.hp, 0) <= 0
    );
    if (defeated) playBattleSfx("death");
  };

  const commitPreResolvedMoveOutcome = (animationId, fallbackBattle = null) => {
    const pending = pendingResolvedMoveRef.current?.[animationId] || null;
    if (!pending?.battle) return false;

    const commit = (saveResult = null) => {
      if (!mountedRef.current) return;
      delete pendingResolvedMoveRef.current[animationId];
      const currentBattle = battleRef.current || fallbackBattle;
      const rawNext = JSON.parse(JSON.stringify(pending.battle));
      const next = mergeCommittedOutcomePopups(
        currentBattle,
        rawNext,
        pending.popupIdsToClear || []
      );
      const soundNext = mergeCommittedOutcomePopups(
        null,
        rawNext,
        pending.popupIdsToClear || []
      );
      playCommittedOutcomeSounds(fallbackBattle || currentBattle, soundNext);
      setBattle(next);

      const popupIds = pending.popupIdsToClear?.length
        ? pending.popupIdsToClear
        : getBattlePopups(next).map((popup) => popup.id).filter(Boolean);
      popupIds.forEach((popupId) => clearPopupLater(popupId));
      if (pending.hitFlashId || next.hitFlash?.id) clearHitFlashLater(pending.hitFlashId || next.hitFlash.id);

      if (pending.winner || next.status === "complete") {
        const winner = pending.winner || next.winner;
        if (saveResult?.serverBattleVerified) {
          onComplete?.({ winner, battle: next });
        } else {
          setBattle((prev) => ({
            ...(prev || next),
            serverVerificationError:
              saveResult?.serverBattleVerificationError ||
              "Battle completed locally, but the server did not verify it yet. Refresh and resume this run before continuing.",
          }));
        }
      }
    };

    if (pending.savePromise && typeof pending.savePromise.then === "function") {
      pending.savePromise.then(commit).catch(() => commit(null));
      return true;
    }

    commit();

    return true;
  };

  const performMove = (move, requestedActorSide = null, requestedTargetSide = null) => {
    const current = battleRef.current;
    if (!current || current.status !== "active" || current.phase === "animating") return;

    const actorSide = requestedActorSide || current.activeSide;
    if (!actorSide) return;
    if (actorSide === "A") {
      const currentCards = getChampionCardState(current.fighters.A, current.championCards);
      const moveIsInHand = currentCards.hand.some((card) => card.moveId === move?.id);
      if (!moveIsInHand) return;
    }

    const moveKind = getExplicitMoveKind(move);
    const targetSide = requestedTargetSide || getDefaultTargetSide(current, actorSide, move);
    if (!targetSide || !getValidTargetSides(current, actorSide, move).includes(targetSide)) return;
    const timings = getMoveAnimationTimings(move, moveKind);
    const animationId = `${Date.now()}-${actorSide}-${move.id}`;
    const animatedBattle = JSON.parse(JSON.stringify(current));
    const actor = animatedBattle.fighters[actorSide];
    const nextActionIndex = asArray(current.actionLog).length;
    const animationTargetSides =
      moveKind !== "buff" && moveHitsAllValidTargets(move)
        ? getValidTargetSides(current, actorSide, move)
        : [targetSide];

    animatedBattle.phase = "animating";
    animatedBattle.activeSide = null;
    if (actorSide === "A") discardChampionHand(animatedBattle);
    animatedBattle.popups = asArray(animatedBattle.popups);
    animatedBattle.popupQueues = { ...(animatedBattle.popupQueues || {}) };
    animatedBattle.hitFlash = null;
    animatedBattle.animation = {
      id: animationId,
      actorSide,
      targetSide,
      targetSides: animationTargetSides,
      move,
      moveKind,
      timings,
      startedAt: Date.now(),
      durationMs: timings.durationMs,
    };
    animatedBattle.actionLog = [
      ...asArray(current.actionLog),
      {
        index: nextActionIndex,
        actorSide,
        targetSide,
        actorRole: actor?.role || "",
        targetRole: animatedBattle.fighters?.[targetSide]?.role || "",
        moveId: String(move?.id || ""),
        moveName: String(move?.name || ""),
        moveType: String(move?.type || ""),
        moveKind: String(moveKind || ""),
        targetMode: String(move?.target || ""),
        room: animatedBattle.room || null,
        beforeSnapshot: makeBattleVerificationSnapshot(current, { includeMoves: false }),
        recordedAt: Date.now(),
      },
    ];

    appendLog(animatedBattle, {
      title: `${actor.name} begins ${move.name}`,
      text: getMoveRange(move?.type) === "melee"
        ? `${actor.name} closes the distance.`
        : moveKind === "buff"
        ? `${actor.name} channels the effect.`
        : `${actor.name} prepares the projectile.`,
    });

    const preResolvedOutcome = resolveMoveOutcome(
      animatedBattle,
      move,
      actorSide,
      targetSide,
      animationId,
      {
        commit: false,
        playSounds: false,
        scheduleVisuals: false,
      }
    );
    setBattle(animatedBattle);
    setSelectedMove(null);
    const battleToPersist = preResolvedOutcome?.battle || animatedBattle;
    const savePromise = persistBattle(
      battleToPersist,
      preResolvedOutcome?.winner || battleToPersist.status === "complete"
        ? { status: "complete", winner: preResolvedOutcome?.winner || battleToPersist.winner, completedAt: true }
        : {}
    );
    if (preResolvedOutcome?.battle) {
      pendingResolvedMoveRef.current[animationId] = {
        ...preResolvedOutcome,
        savePromise,
      };
    }

    if (animationTimeoutRef.current) window.clearTimeout(animationTimeoutRef.current);
    animationTimeoutRef.current = window.setTimeout(() => {
      animationTimeoutRef.current = null;
      if (commitPreResolvedMoveOutcome(animationId, animatedBattle)) return;
      resolveMoveOutcome(battleRef.current || animatedBattle, move, actorSide, targetSide, animationId);
    }, timings.durationMs);
  };

  useEffect(() => {
    if (!battle || battle.status !== "active" || battle.phase !== "animating" || !battle.animation) {
      return undefined;
    }
    if (animationTimeoutRef.current) return undefined;

    const { actorSide, targetSide, move, id } = battle.animation;
    if (!actorSide || !targetSide || !move) return undefined;

    const durationMs = Math.max(
      300,
      safeNumber(battle.animation.durationMs || battle.animation.timings?.durationMs, 0)
    );
    const startedAt = safeNumber(battle.animation.startedAt, 0);
    const elapsedMs = startedAt ? Math.max(0, Date.now() - startedAt) : 0;
    const remainingMs = Math.max(150, durationMs - elapsedMs);

    const timer = window.setTimeout(() => {
      animationTimeoutRef.current = null;
      resolveMoveOutcome(battleRef.current || battle, move, actorSide, targetSide, id);
    }, remainingMs);
    animationTimeoutRef.current = timer;

    return () => {
      if (animationTimeoutRef.current === timer) {
        window.clearTimeout(timer);
        animationTimeoutRef.current = null;
      }
    };
  }, [battle?.phase, battle?.status, battle?.animation?.id]);

  useEffect(() => {
    if (!battle || battle.status !== "active" || battle.phase !== "monsterTurn") {
      monsterTurnQueuedRef.current = false;
      return undefined;
    }
    if (monsterTurnQueuedRef.current) return undefined;

    monsterTurnQueuedRef.current = true;
    const timer = window.setTimeout(() => {
      const current = battleRef.current;
      if (!current || current.phase !== "monsterTurn") return;
      const actorSide = current.activeSide;
      const monsterFighter = current.fighters[actorSide];
      const options = asArray(monsterFighter.moves);
      const move = options[Math.floor(Math.random() * options.length)];
      const targetOptions = move ? getValidTargetSides(current, actorSide, move) : [];
      const targetSide = targetOptions[Math.floor(Math.random() * targetOptions.length)];
      monsterTurnQueuedRef.current = false;
      if (move && targetSide) performMove(move, actorSide, targetSide);
    }, MONSTER_THINK_MS);

    return () => window.clearTimeout(timer);
  }, [battle?.phase, battle?.round, battle?.status]);

  useEffect(() => {
    if (!battle || battle.phase !== "playerTurn") setSelectedMove(null);
  }, [battle?.phase, battle?.round]);

  if (!battle) {
    return (
      <Box sx={{ p: 4, textAlign: "center", color: THEME.muted }}>
        Loading depths battle...
      </Box>
    );
  }

  const playerTurn = battle.status === "active" && battle.phase === "playerTurn";
  const inspectedFighter = inspectSide ? battle.fighters?.[inspectSide] : null;
  const handleMoveSelect = (move) => {
    if (!playerTurn) return;
    const currentCards = getChampionCardState(battle.fighters.A, battle.championCards);
    if (!currentCards.hand.some((card) => card.moveId === move?.id)) return;
    const validTargetSides = getValidTargetSides(battle, "A", move);
    if (!validTargetSides.length) return;
    if (moveHitsAllValidTargets(move) || validTargetSides.length === 1) {
      performMove(move, "A", validTargetSides[0]);
      return;
    }
    setSelectedMove(move);
  };
  const handleTargetSelect = (targetSide) => {
    if (!selectedMove || !playerTurn) return;
    performMove(selectedMove, "A", targetSide);
  };

  return (
    <Box>
      {battle.serverVerificationError ? (
        <Box
          sx={{
            mb: 1.5,
            px: 1.5,
            py: 1,
            color: "#ffd9a3",
            border: "1px solid rgba(255, 196, 112, 0.35)",
            borderRadius: 1,
            background: "rgba(65, 38, 10, 0.72)",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {battle.serverVerificationError}
        </Box>
      ) : null}
      <ArenaStage
        battle={battle}
        playerTurn={playerTurn}
        selectedMove={selectedMove}
        onMoveSelect={handleMoveSelect}
        onTargetSelect={handleTargetSelect}
        onInspectFighter={setInspectSide}
        audioSettings={depthsAudio.settings}
        onToggleMusic={depthsAudio.toggleMusic}
        onToggleSfx={depthsAudio.toggleSfx}
        onMusicVolumeChange={depthsAudio.setMusicVolume}
        onSfxVolumeChange={depthsAudio.setSfxVolume}
      />
      <FighterInspectDialog
        open={Boolean(inspectedFighter)}
        fighter={inspectedFighter}
        onClose={() => setInspectSide(null)}
      />
    </Box>
  );
}
