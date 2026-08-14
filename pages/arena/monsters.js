import React, { useEffect, useMemo, useRef, useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  Tooltip,
  Typography,
} from "@mui/material";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../../Firebase/FirebaseInit";
import { getArenaEffectInfo } from "../../components/contracts/Arena/effectInfo";
import {
  DEPTHS_MONSTER_WORLD_OPTIONS,
  getDepthsMonsterWorlds,
  normalizeDepthsMonsterWorlds,
} from "../../components/contracts/Arena/depthsWorlds";

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

const pageStyle = {
  position: "relative",
  minHeight: "100vh",
  width: "100%",
  overflow: "hidden",
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.12), transparent 28%), linear-gradient(180deg, #070707 0%, #000 54%, #050505 100%)",
  color: DC_THEME.text,
  padding: "42px clamp(14px, 3vw, 48px) 70px",
};

const vignetteStyle = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.62) 58%, #000 100%)",
  pointerEvents: "none",
  zIndex: 1,
};

const contentStyle = {
  position: "relative",
  zIndex: 2,
  maxWidth: 1440,
  margin: "0 auto",
};

const panelStyle = {
  position: "relative",
  border: `1px solid ${DC_THEME.line}`,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018)), rgba(0,0,0,0.80)",
  boxShadow:
    "inset 0 0 0 1px rgba(255,255,255,0.045), 0 18px 55px rgba(0,0,0,0.66)",
  borderRadius: 4,
  overflow: "hidden",
};

const panelHeaderStyle = {
  fontFamily: "Jacques, Georgia, serif",
  letterSpacing: "0.26em",
  textTransform: "uppercase",
  color: DC_THEME.text,
  textShadow: "0 0 14px rgba(255,255,255,0.25)",
};

const labelStyle = {
  fontFamily: "Jacques, Georgia, serif",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: DC_THEME.muted,
};

const buttonStyle = {
  border: `1px solid ${DC_THEME.lineStrong}`,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(0,0,0,0.94))",
  color: DC_THEME.text,
  borderRadius: 3,
  fontFamily: "Jacques, Georgia, serif",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

const STAT_DEFS = [
  { key: "health", label: "Health", icon: "/dragonshorde/health.svg" },
  { key: "speed", label: "Speed", icon: "/dragonshorde/speed.png" },
  { key: "resist", label: "Resist", icon: "/dragonshorde/resist.png" },
  { key: "strength", label: "Strength", icon: "/dragonshorde/strength.svg" },
  { key: "dexterity", label: "Dexterity", icon: "/dragonshorde/dexterity.svg" },
  {
    key: "intelligence",
    label: "Intelligence",
    icon: "/dragonshorde/intelligence.svg",
  },
  {
    key: "critChance",
    label: "Crit Chance",
    icon: "/dragonshorde/critChance.svg",
    suffix: "%",
    fallback: 25,
  },
  {
    key: "critDamage",
    label: "Crit Damage",
    icon: "/dragonshorde/critDamage.svg",
    suffix: "%",
    fallback: 200,
  },
];

const EFFECT_DEFS = [
  { key: "poison", label: "Poison", icon: "/dragonshorde/trees/Poison.svg" },
  { key: "bleed", label: "Bleed", icon: "/dragonshorde/trees/Bleed.svg" },
  { key: "burn", label: "Burn", icon: "/dragonshorde/trees/Burn.svg" },
  { key: "freeze", label: "Freeze", icon: "/dragonshorde/trees/Freeze.svg" },
  { key: "slow", label: "Slow", icon: "/dragonshorde/trees/Slow.svg" },
  { key: "drown", label: "Drown", icon: "/dragonshorde/trees/Drown.svg" },
  {
    key: "paralyze",
    label: "Paralyze",
    icon: "/dragonshorde/trees/Paralyze.svg",
  },
  { key: "doom", label: "Doom", icon: "/dragonshorde/trees/Doom.svg" },
  { key: "shield", label: "Shield", icon: "/dragonshorde/trees/Shield.svg" },
  {
    key: "strengthen",
    label: "Strengthen",
    icon: "/dragonshorde/trees/Strengthen.svg",
  },
  { key: "focus", label: "Focus", icon: "/dragonshorde/trees/Focus.svg" },
  { key: "empower", label: "Empower", icon: "/dragonshorde/trees/Empower.svg" },
  { key: "nurture", label: "Nurture", icon: "/dragonshorde/trees/Nurture.svg" },
  { key: "bless", label: "Bless", icon: "/dragonshorde/trees/Bless.svg" },
  { key: "hasten", label: "Hasten", icon: "/dragonshorde/trees/Hasten.svg" },
  { key: "cleanse", label: "Cleanse", icon: "/dragonshorde/trees/Cleanse.svg" },
];

const EFFECT_BY_KEY = EFFECT_DEFS.reduce((acc, effect) => {
  acc[effect.key] = effect;
  return acc;
}, {});

function EffectTooltipIcon({ effectKey, src, size = 22, sx }) {
  const info = getArenaEffectInfo(effectKey);
  const iconSrc = src || info?.icon || EFFECT_BY_KEY[String(effectKey || "").toLowerCase()]?.icon || "";
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

const SPRITE_FRAME_MS = 340;
const SPRITE_LOOP_PAUSE_MS = 2000;
const MOVE_EFFECT_FRAME_MS = 240;
const MOVE_EFFECT_LAST_FRAME_MS = 850;

const asArray = (value) => (Array.isArray(value) ? value : []);

function normalizeMonsterDoc(data, docId) {
  const monsterObj =
    data?.monsterObj && typeof data.monsterObj === "object"
      ? data.monsterObj
      : data || {};
  const preview =
    data?.monsterPreview && typeof data.monsterPreview === "object"
      ? data.monsterPreview
      : {};

  return {
    ...monsterObj,
    docId,
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

function formatTimestamp(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timestampMillis(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function sortMonsters(monsters) {
  return [...monsters].sort((a, b) => {
    const dateDiff =
      timestampMillis(b?.completedAt || b?.updatedAt) -
      timestampMillis(a?.completedAt || a?.updatedAt);

    if (dateDiff !== 0) return dateDiff;
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  });
}

function useArenaMonsters() {
  const [monsters, setMonsters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let receivedSnapshot = false;
    let cancelled = false;
    const monstersRef = collection(db, "monsters");
    const applyMonsterSnapshot = (snapshot) => {
      const rows = snapshot.docs.map((docSnap) =>
        normalizeMonsterDoc(docSnap.data(), docSnap.id)
      );

      setMonsters(sortMonsters(rows));
      setError("");
      setLoading(false);
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
        console.error("Failed to load arena monsters with fallback read", fallbackError);
        setMonsters([]);
        setError(
          fallbackError?.message
            ? `Could not load monsters from Firebase: ${fallbackError.message}`
            : "Could not load monsters from Firebase."
        );
        setLoading(false);
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
          console.error("Failed to load arena monsters", loadError);
          loadMonstersOnce();
        }
      );
    } catch (loadError) {
      if (cancelled) return undefined;
      window.clearTimeout(timeoutId);
      console.error("Failed to start arena monster listener", loadError);
      loadMonstersOnce();
    }

    return () => {
      cancelled = true;
      receivedSnapshot = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  return { monsters, loading, error };
}

function compactNumber(value, fallback = 0) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Number.isInteger(number) ? number : Number(number.toFixed(2));
}

function getFramesFromCandidates(candidates, fallbackSrc) {
  for (const candidate of candidates) {
    const frames = Array.isArray(candidate)
      ? candidate
          .filter((src) => typeof src === "string" && src.trim())
          .slice(0, 4)
      : [];

    if (frames.length > 0) return frames;
  }

  return fallbackSrc ? [fallbackSrc] : [];
}

function getMonsterIdleFrames(monster) {
  return getFramesFromCandidates(
    [
      monster?.idleFrames,
      monster?.animation?.idle?.frameUrls,
      monster?.animation?.idle?.frames,
    ],
    monster?.standingUrl
  );
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

function getMoveClass(move) {
  const explicitClass = String(move?.class || "").toLowerCase();
  if (explicitClass === "damage" || explicitClass === "curse" || explicitClass === "buff") {
    return explicitClass;
  }

  const type = String(move?.type || "").toLowerCase();
  if (type.includes("damage")) return "damage";
  if (type.includes("curse")) return "curse";
  if (type.includes("buff")) return "buff";
  return null;
}

function getMoveEffectAmount(monster, move) {
  const effectKey =
    move?.effect && move.effect !== "none" ? String(move.effect).toLowerCase() : null;
  if (!effectKey) return null;

  const explicitAmount = Number(
    move?.effectAmount ??
      move?.effectPotency ??
      move?.effectValue ??
      move?.applyAmount
  );

  if (Number.isFinite(explicitAmount)) return explicitAmount;

  const rawAmount = Number(monster?.[effectKey] || 0);
  const moveClass = getMoveClass(move);

  if (moveClass === "damage") return rawAmount;
  if (moveClass === "curse" || moveClass === "buff") return rawAmount * 2;
  return Math.ceil(rawAmount / 2);
}

function AnimatedFrameImage({
  frames,
  fallbackSrc,
  alt,
  frameMs = SPRITE_FRAME_MS,
  pauseMs = SPRITE_LOOP_PAUSE_MS,
  imageStyle,
}) {
  const frameList = useMemo(() => getFramesFromCandidates([frames], fallbackSrc), [
    frames,
    fallbackSrc,
  ]);
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

  const src = frameList[frameIndex] || fallbackSrc;

  if (!src) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          minHeight: 190,
          display: "grid",
          placeItems: "center",
          color: DC_THEME.faint,
          border: `1px dashed ${DC_THEME.line}`,
          background: "rgba(255,255,255,0.025)",
        }}
      >
        <Typography sx={{ ...labelStyle, fontSize: 12 }}>No Image</Typography>
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      sx={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "contain",
        imageRendering: "auto",
        ...imageStyle,
      }}
    />
  );
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
  }, [layout, currentCharacterSrc, currentEffectSrc, charFrameIndex, effectFrameIndex]);

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
      effectStyle.left = "50%";
      effectStyle.top =
        buffEffectTopPx != null
          ? `${Math.max(0, buffEffectTopPx - effectProgress * 20)}px`
          : "18px";
      effectStyle.bottom = "auto";
      effectStyle.transform = "translateX(-50%)";
      effectStyle.marginLeft = 0;
    } else {
      const characterLeft = layout === "melee" ? 3 + charProgress * 7 : 3;
      const characterWidth = 64;
      const effectStartLeft = characterLeft + characterWidth;
      effectStyle.left = `${effectStartLeft + effectProgress * 24}%`;
      effectStyle.bottom = `calc(51% - ${EFFECT_ANIMATION_RELATIVE_DOWN_OFFSET_PX}px)`;
      effectStyle.transform = "translateX(-50%)";
    }
  }

  const backgroundStyle = background
    ? {
        backgroundImage: `url(${background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background:
          "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.13), transparent 48%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.54))",
      };

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: { xs: 320, sm: 340 },
        maxWidth: 420,
        minWidth: 220,
        mx: "auto",
        borderRadius: 1,
        overflow: "hidden",
        border: `1px solid ${DC_THEME.line}`,
        background: "rgba(0,0,0,0.42)",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          ...backgroundStyle,
          filter: background ? "blur(2px)" : "none",
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
    </Box>
  );
}

function MonsterWorldToggleButton({ option, active }) {
  const button = (
    <Button
      size="small"
      disabled
      onClick={(event) => {
        event.stopPropagation();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      sx={{
        minWidth: 0,
        px: 0.9,
        py: 0.45,
        borderRadius: 2,
        border: `1px solid ${active ? option.color : DC_THEME.line}`,
        color: active ? option.color : DC_THEME.muted,
        background: active
          ? `linear-gradient(180deg, ${option.color}22, rgba(0,0,0,0.76))`
          : "rgba(255,255,255,0.035)",
        fontSize: 10,
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        opacity: active ? 0.82 : 0.38,
        "&:hover": {
          borderColor: active ? option.color : DC_THEME.line,
          background: active
            ? `linear-gradient(180deg, ${option.color}22, rgba(0,0,0,0.76))`
            : "rgba(255,255,255,0.035)",
        },
        "&.Mui-disabled": {
          color: active ? option.color : DC_THEME.muted,
          borderColor: active ? option.color : DC_THEME.line,
          opacity: active ? 0.82 : 0.38,
          WebkitTextFillColor: active ? option.color : DC_THEME.muted,
        },
      }}
    >
      {option.label}
    </Button>
  );

  return (
    <Tooltip arrow title="Depths world rotation is locked.">
      <Box component="span" sx={{ display: "inline-flex", minWidth: 0 }}>
        {button}
      </Box>
    </Tooltip>
  );
}

function MonsterCard({ monster, onSelect }) {
  const idleFrames = getMonsterIdleFrames(monster);
  const completedAt = formatTimestamp(monster?.completedAt);
  const activeWorlds = getDepthsMonsterWorlds(monster);

  return (
    <Box
      component="article"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(monster)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(monster);
        }
      }}
      sx={{
        ...panelStyle,
        width: "100%",
        minHeight: 340,
        p: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        textAlign: "left",
        color: DC_THEME.text,
        cursor: "pointer",
        transition: "transform 180ms ease, border-color 180ms ease",
        font: "inherit",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: DC_THEME.lineStrong,
          boxShadow: `${DC_THEME.glowStrong}, 0 18px 55px rgba(0,0,0,0.66)`,
        },
      }}
    >
      <Box
        sx={{
          height: 230,
          width: "100%",
          p: 2,
          display: "grid",
          placeItems: "center",
          background:
            "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.09), transparent 52%), rgba(0,0,0,0.34)",
          borderBottom: `1px solid ${DC_THEME.line}`,
        }}
      >
        <AnimatedFrameImage
          frames={idleFrames}
          fallbackSrc={monster?.standingUrl}
          alt={`${monster?.name || "Monster"} idle animation`}
          imageStyle={{ maxHeight: 210 }}
        />
      </Box>

      <Box sx={{ p: 2.2, width: "100%" }}>
        <Typography sx={{ ...panelHeaderStyle, fontSize: 16, mb: 1 }}>
          {monster?.name || "Unnamed Monster"}
        </Typography>
        <Typography sx={{ color: DC_THEME.muted, fontSize: 13, lineHeight: 1.5 }}>
          {monster?.monsterType || "Monster"}
        </Typography>
        <Box
          onClick={(event) => event.stopPropagation()}
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 0.65,
            mt: 1.4,
          }}
        >
          {DEPTHS_MONSTER_WORLD_OPTIONS.map((option) => (
            <MonsterWorldToggleButton
              key={option.key}
              option={option}
              active={activeWorlds.includes(option.key)}
            />
          ))}
        </Box>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            mt: 1.6,
            color: DC_THEME.faint,
            fontSize: 12,
          }}
        >
          {monster?.status && <span>Status: {monster.status}</span>}
          {completedAt && <span>Completed: {completedAt}</span>}
        </Box>
      </Box>
    </Box>
  );
}

function StatTile({ stat, monster }) {
  const value =
    stat.key === "health"
      ? `${compactNumber(
          monster?.currentHealth,
          monster?.health ?? stat.fallback ?? 0
        )} / ${compactNumber(monster?.health, stat.fallback ?? 0)}`
      : `${compactNumber(monster?.[stat.key], stat.fallback ?? 0)}${
          stat.suffix || ""
        }`;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "36px minmax(0, 1fr)",
        gap: 1.2,
        alignItems: "center",
        p: 1.35,
        border: `1px solid ${DC_THEME.line}`,
        background: DC_THEME.panelSoft,
        borderRadius: 1,
      }}
    >
      <Box
        component="img"
        src={stat.icon}
        alt=""
        sx={{
          width: 32,
          height: 32,
          objectFit: "contain",
          filter: "drop-shadow(0 0 8px rgba(255,255,255,0.22))",
        }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ ...labelStyle, fontSize: 10 }}>{stat.label}</Typography>
        <Typography sx={{ color: DC_THEME.text, fontWeight: 700, fontSize: 18 }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

function EffectTile({ effect, value }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "34px minmax(0, 1fr)",
        gap: 1,
        alignItems: "center",
        p: 1.2,
        border: `1px solid ${DC_THEME.line}`,
        background: "rgba(255,255,255,0.028)",
        borderRadius: 1,
      }}
    >
      <EffectTooltipIcon
        effectKey={effect.key}
        src={effect.icon}
        size={30}
        sx={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.18))" }}
      />
      <Box>
        <Typography sx={{ ...labelStyle, fontSize: 10 }}>{effect.label}</Typography>
        <Typography sx={{ color: DC_THEME.text, fontWeight: 700 }}>
          {compactNumber(value)}
        </Typography>
      </Box>
    </Box>
  );
}

function getMonsterMoveBackground(monster) {
  return (
    monster?.battleBackgroundUrl ||
    monster?.arenaBackgroundUrl ||
    monster?.backgroundUrl ||
    monster?.mapUrl ||
    monster?.environmentUrl ||
    ""
  );
}

function MoveCard({ move, monster }) {
  const effect = EFFECT_DEFS.find((item) => item.key === move?.effect);
  const effectAmount = getMoveEffectAmount(monster, move);
  const detailRows = [
    ["Type", move?.type],
    ["Class", move?.class],
    ["Target", move?.target],
    ["Power", move?.power ?? move?.basePower],
    ["Accuracy", move?.accuracy],
    ["Cooldown", move?.cooldown],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  return (
    <Box sx={{ ...panelStyle, p: 2 }}>
      <MoveAnimationPreview
        move={move}
        background={getMonsterMoveBackground(monster)}
      />

      <Box sx={{ mt: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
              mb: 1,
            }}
          >
            {effect && (
              <EffectTooltipIcon
                effectKey={effect.key}
                src={effect.icon}
                size={25}
              />
            )}
            <Typography sx={{ ...panelHeaderStyle, fontSize: 14, textAlign: "center" }}>
              {move?.name || `Move ${move?.slot ?? ""}`}
            </Typography>
          </Box>

          {move?.description && (
            <Typography
              sx={{
                color: DC_THEME.muted,
                fontSize: 13,
                mb: 1.4,
                textAlign: "center",
                lineHeight: 1.55,
              }}
            >
              {move.description}
            </Typography>
          )}

          {effectAmount !== null && (
            <Box
              sx={{
                display: "grid",
                placeItems: "center",
                border: `1px solid ${DC_THEME.line}`,
                background: "rgba(255,255,255,0.028)",
                p: 1.2,
                mb: 1.4,
              }}
            >
              {effect && (
                <EffectTooltipIcon
                  effectKey={effect.key}
                  src={effect.icon}
                  size={42}
                  sx={{
                    filter: "drop-shadow(0 0 8px rgba(255,255,255,0.22))",
                    mb: 0.75,
                  }}
                />
              )}
              <Typography
                sx={{
                  color: DC_THEME.text,
                  fontWeight: 800,
                  textAlign: "center",
                }}
              >
                Apply {compactNumber(effectAmount)} {move?.effect}
              </Typography>
            </Box>
          )}

          <Grid container spacing={1}>
            {detailRows.map(([label, value]) => (
              <Grid item xs={6} sm={4} key={label}>
                <Box
                  sx={{
                    border: `1px solid ${DC_THEME.line}`,
                    background: "rgba(255,255,255,0.028)",
                    p: 1,
                  }}
                >
                  <Typography sx={{ ...labelStyle, fontSize: 9 }}>
                    {label}
                  </Typography>
                  <Typography sx={{ color: DC_THEME.text, fontSize: 13 }}>
                    {String(value)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}

function MonsterSheet({ monster, onBack }) {
  const idleFrames = getMonsterIdleFrames(monster);
  const activeEffects = EFFECT_DEFS.map((effect) => ({
    ...effect,
    value: Number(monster?.[effect.key] || 0),
  })).filter((effect) => Number.isFinite(effect.value) && effect.value !== 0);
  const moves = asArray(monster?.moves);

  return (
    <Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2.5 }}>
        <Button
          onClick={onBack}
          startIcon={<ArrowBackIcon />}
          sx={{
            ...buttonStyle,
            px: 2,
            py: 1,
            "&:hover": {
              borderColor: DC_THEME.text,
              background: "rgba(255,255,255,0.08)",
            },
          }}
        >
          Back
        </Button>
        <Button
          href="/arena/depths"
          startIcon={<ArrowBackIcon />}
          sx={{
            ...buttonStyle,
            px: 2,
            py: 1,
            "&:hover": {
              borderColor: DC_THEME.text,
              background: "rgba(255,255,255,0.08)",
            },
          }}
        >
          The Depths
        </Button>
      </Box>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={5}>
          <Box sx={{ ...panelStyle }}>
            <Box
              sx={{
                minHeight: { xs: 360, md: 560 },
                p: 2,
                display: "grid",
                placeItems: "center",
                background:
                  "radial-gradient(circle at 50% 42%, rgba(255,255,255,0.12), transparent 52%), rgba(0,0,0,0.38)",
              }}
            >
              <AnimatedFrameImage
                frames={idleFrames}
                fallbackSrc={monster?.standingUrl}
                alt={`${monster?.name || "Monster"} idle animation`}
                imageStyle={{ maxHeight: 520 }}
              />
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={7}>
          <Box sx={{ ...panelStyle, p: { xs: 2, md: 3 } }}>
            <Typography sx={{ ...labelStyle, fontSize: 12, mb: 1 }}>
              {monster?.monsterType || "Monster"}
            </Typography>
            <Typography
              component="h1"
              sx={{ ...panelHeaderStyle, fontSize: { xs: 26, md: 38 }, mb: 2 }}
            >
              {monster?.name || "Unnamed Monster"}
            </Typography>

            {monster?.description && (
              <Typography
                sx={{
                  color: DC_THEME.muted,
                  lineHeight: 1.7,
                  fontSize: 15,
                  mb: 2.5,
                }}
              >
                {monster.description}
              </Typography>
            )}

            <Grid container spacing={1.2}>
              {STAT_DEFS.map((stat) => (
                <Grid item xs={12} sm={6} md={4} key={stat.key}>
                  <StatTile stat={stat} monster={monster} />
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography sx={{ ...panelHeaderStyle, fontSize: 16, mb: 1.4 }}>
                Effects
              </Typography>
              {activeEffects.length ? (
                <Grid container spacing={1.2}>
                  {activeEffects.map((effect) => (
                    <Grid item xs={6} sm={4} md={3} key={effect.key}>
                      <EffectTile effect={effect} value={effect.value} />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box
                  sx={{
                    border: `1px solid ${DC_THEME.line}`,
                    background: "rgba(255,255,255,0.025)",
                    p: 2,
                  }}
                >
                  <Typography sx={{ color: DC_THEME.muted }}>
                    No active effects.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ mt: 1 }}>
            <Typography sx={{ ...panelHeaderStyle, fontSize: 20, mb: 1.6 }}>
              Moves
            </Typography>
            {moves.length ? (
              <Grid container spacing={1.6}>
                {moves.map((move, index) => (
                  <Grid item xs={12} lg={6} key={`${move?.slot || index}-${move?.name || "move"}`}>
                    <MoveCard move={move} monster={monster} />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ ...panelStyle, p: 2 }}>
                <Typography sx={{ color: DC_THEME.muted }}>
                  No moves found for this monster.
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default function ArenaMonstersPage() {
  const { monsters, loading, error } = useArenaMonsters();
  const [selectedMonster, setSelectedMonster] = useState(null);

  return (
    <Box sx={pageStyle}>
      <Box sx={vignetteStyle} />
      <Box sx={contentStyle}>
        {!selectedMonster && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 2,
              flexDirection: { xs: "column", sm: "row" },
              mb: 3,
            }}
          >
            <Box>
              <Typography sx={{ ...labelStyle, fontSize: 12, mb: 1 }}>
                Arena Collection
              </Typography>
              <Typography
                component="h1"
                sx={{ ...panelHeaderStyle, fontSize: { xs: 28, md: 44 } }}
              >
                Monsters
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography sx={{ color: DC_THEME.muted, fontSize: 14 }}>
                {monsters.length ? `${monsters.length} loaded` : ""}
              </Typography>
              <Button href="/arena/depths" startIcon={<ArrowBackIcon />} sx={{ ...buttonStyle, minHeight: 38, px: 1.6 }}>
                The Depths
              </Button>
            </Box>
          </Box>
        )}

        {selectedMonster ? (
          <MonsterSheet
            monster={selectedMonster}
            onBack={() => setSelectedMonster(null)}
          />
        ) : loading ? (
          <Box
            sx={{
              ...panelStyle,
              minHeight: 300,
              display: "grid",
              placeItems: "center",
              p: 4,
            }}
          >
            <Box sx={{ textAlign: "center" }}>
              <CircularProgress sx={{ color: DC_THEME.text, mb: 2 }} />
              <Typography sx={{ ...labelStyle, fontSize: 12 }}>
                Loading Monsters
              </Typography>
            </Box>
          </Box>
        ) : error ? (
          <Box sx={{ ...panelStyle, p: 3 }}>
            <Typography sx={{ color: DC_THEME.bad }}>{error}</Typography>
          </Box>
        ) : monsters.length ? (
          <Grid container spacing={2}>
            {monsters.map((monster) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={monster.docId}>
                <MonsterCard
                  monster={monster}
                  onSelect={setSelectedMonster}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ ...panelStyle, p: 3 }}>
            <Typography sx={{ color: DC_THEME.muted }}>
              No monsters found in the Firebase monsters collection.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
