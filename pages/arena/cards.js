import React, { useEffect, useMemo, useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../Firebase/FirebaseInit";
import { getArenaEffectInfo } from "../../components/contracts/Arena/effectInfo";

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
  gold: "#e1b864",
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
  letterSpacing: "0.22em",
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

const EFFECT_DEFS = [
  { key: "poison", label: "Poison", icon: "/dragonshorde/trees/Poison.svg" },
  { key: "bleed", label: "Bleed", icon: "/dragonshorde/trees/Bleed.svg" },
  { key: "burn", label: "Burn", icon: "/dragonshorde/trees/Burn.svg" },
  { key: "freeze", label: "Freeze", icon: "/dragonshorde/trees/Freeze.svg" },
  { key: "slow", label: "Slow", icon: "/dragonshorde/trees/Slow.svg" },
  { key: "drown", label: "Drown", icon: "/dragonshorde/trees/Drown.svg" },
  { key: "paralyze", label: "Paralyze", icon: "/dragonshorde/trees/Paralyze.svg" },
  { key: "doom", label: "Doom", icon: "/dragonshorde/trees/Doom.svg" },
  { key: "shield", label: "Shield", icon: "/dragonshorde/trees/Shield.svg" },
  { key: "strengthen", label: "Strengthen", icon: "/dragonshorde/trees/Strengthen.svg" },
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

function EffectTooltipIcon({ effectKey, src, size = 20, sx }) {
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

const FRAME_MS = 340;
const LOOP_PAUSE_MS = 1750;

const asArray = (value) => (Array.isArray(value) ? value : []);

function compactNumber(value, fallback = 0) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Number.isInteger(number) ? number : Number(number.toFixed(2));
}

function timestampMillis(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
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

function framesFromAnimationMeta(meta) {
  if (!meta) return [];
  if (Array.isArray(meta.frameUrls)) return meta.frameUrls;
  if (Array.isArray(meta.frames)) {
    return meta.frames.map((frame) => frame?.url).filter(Boolean);
  }
  return [];
}

function getFramesFromCandidates(candidates, fallbackSrc = "") {
  for (const candidate of candidates) {
    const frames = Array.isArray(candidate)
      ? candidate.filter((src) => typeof src === "string" && src.trim()).slice(0, 8)
      : [];

    if (frames.length > 0) return frames;
  }

  return fallbackSrc ? [fallbackSrc] : [];
}

function getAnimationFallback(animation, fallbackSrc = "") {
  return asArray(animation?.frameUrls)[0] || animation?.sheetUrl || fallbackSrc || "";
}

function getCardTypeLabel(card) {
  return card?.type || [card?.range, card?.class].filter(Boolean).join(" ") || "card";
}

function getCardAnimationFrames(card) {
  return getCasterAnimationFrames(card);
}

function getCasterAnimationFrames(card) {
  return getFramesFromCandidates(
    [
      card?.casterAnimation?.frameUrls,
      framesFromAnimationMeta(card?.casterAnimation),
    ],
    getAnimationFallback(card?.casterAnimation)
  );
}

function getEffectAnimationFrames(card) {
  return getFramesFromCandidates(
    [
      card?.effectAnimation?.frameUrls,
      framesFromAnimationMeta(card?.effectAnimation),
    ],
    getAnimationFallback(card?.effectAnimation)
  );
}

function normalizeCardDoc(data, docId) {
  const cardObj =
    data?.cardObj && typeof data.cardObj === "object" ? data.cardObj : data || {};
  const typeParts = String(cardObj.type || "").split(/\s+/).filter(Boolean);
  const range = cardObj.range || typeParts[0] || "";
  const cardClass = cardObj.class || typeParts.slice(1).join(" ") || "";
  const type = cardObj.type || [range, cardClass].filter(Boolean).join(" ") || "card";

  return {
    ...cardObj,
    docId,
    id: cardObj.id || cardObj.cardId || docId,
    cardId: cardObj.cardId || cardObj.id || docId,
    status: data?.status || cardObj?.status || "",
    progress: data?.progress ?? cardObj?.progress ?? null,
    stage: data?.stage || "",
    name: cardObj.name || docId,
    type,
    range,
    class: cardClass,
    power: cardObj.power ?? cardObj.basePower ?? 0,
    accuracy: cardObj.accuracy ?? 0,
    cooldown: cardObj.cooldown ?? 0,
    effects: asArray(cardObj.effects),
    createdAt: data?.createdAt || cardObj?.createdAt || null,
    updatedAt: data?.updatedAt || cardObj?.updatedAt || null,
    completedAt: data?.completedAt || cardObj?.completedAt || null,
  };
}

function sortCards(cards) {
  return [...cards].sort((a, b) => {
    const dateDiff =
      timestampMillis(b?.completedAt || b?.updatedAt || b?.createdAt) -
      timestampMillis(a?.completedAt || a?.updatedAt || a?.createdAt);

    if (dateDiff !== 0) return dateDiff;
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  });
}

function useArenaCards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let receivedSnapshot = false;
    let cancelled = false;
    const cardsQuery = query(collection(db, "cards"), where("status", "==", "completed"));

    const applyCardSnapshot = (snapshot) => {
      const rows = snapshot.docs.map((docSnap) =>
        normalizeCardDoc(docSnap.data(), docSnap.id)
      );

      setCards(sortCards(rows));
      setError("");
      setLoading(false);
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
        console.error("Failed to load arena cards with fallback read", fallbackError);
        setCards([]);
        setError(
          fallbackError?.message
            ? `Could not load cards from Firebase: ${fallbackError.message}`
            : "Could not load cards from Firebase."
        );
        setLoading(false);
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
          console.error("Failed to load arena cards", loadError);
          loadCardsOnce();
        }
      );
    } catch (loadError) {
      if (cancelled) return undefined;
      window.clearTimeout(timeoutId);
      console.error("Failed to start arena card listener", loadError);
      loadCardsOnce();
    }

    return () => {
      cancelled = true;
      receivedSnapshot = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  return { cards, loading, error };
}

function AnimatedFrameImage({
  frames,
  fallbackSrc,
  alt,
  frameMs = FRAME_MS,
  pauseMs = LOOP_PAUSE_MS,
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

function EffectBadge({ effect }) {
  const key = String(effect?.effect || "").toLowerCase();
  const definition = EFFECT_BY_KEY[key];
  const label = definition?.label || key || "Effect";
  const amount = compactNumber(effect?.amount ?? 0);
  const target = effect?.target ? ` ${effect.target}` : "";

  return (
    <Chip
      icon={
        definition?.icon ? (
          <EffectTooltipIcon
            effectKey={key}
            src={definition.icon}
            size={20}
          />
        ) : undefined
      }
      label={`${label} ${amount}${target}`}
      sx={{
        color: DC_THEME.text,
        border: `1px solid ${DC_THEME.line}`,
        background: "rgba(255,255,255,0.035)",
        "& .MuiChip-icon": { ml: 0.8 },
      }}
    />
  );
}

function CardTile({ card, onSelect }) {
  const completedAt = formatTimestamp(card?.completedAt);
  const effects = asArray(card?.effects).slice(0, 3);
  const typeLabel = getCardTypeLabel(card);

  return (
    <Button
      onClick={() => onSelect(card)}
      sx={{
        ...panelStyle,
        width: "100%",
        minHeight: 430,
        p: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        textAlign: "left",
        textTransform: "none",
        transition: "transform 180ms ease, border-color 180ms ease",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: DC_THEME.lineStrong,
          boxShadow: `${DC_THEME.glowStrong}, 0 18px 55px rgba(0,0,0,0.66)`,
        },
      }}
    >
      <Box
        sx={{
          height: 290,
          width: "100%",
          p: 1.5,
          display: "grid",
          placeItems: "center",
          background:
            "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.09), transparent 52%), rgba(0,0,0,0.34)",
          borderBottom: `1px solid ${DC_THEME.line}`,
        }}
      >
        <AnimatedFrameImage
          frames={getCardAnimationFrames(card)}
          fallbackSrc={getAnimationFallback(card?.casterAnimation)}
          alt={`${card?.name || "Card"} animation`}
          imageStyle={{ maxHeight: 270 }}
        />
      </Box>

      <Box sx={{ p: 2.2, width: "100%" }}>
        <Typography sx={{ ...panelHeaderStyle, fontSize: 15, mb: 1 }}>
          {card?.name || "Unnamed Card"}
        </Typography>
        <Typography sx={{ color: DC_THEME.muted, fontSize: 13, lineHeight: 1.5 }}>
          {typeLabel}
        </Typography>
        <Box sx={{ display: "flex", gap: 0.7, flexWrap: "wrap", mt: 1.4 }}>
          <Chip
            label={`Power ${compactNumber(card?.power ?? 0)}`}
            sx={{ color: DC_THEME.text, border: `1px solid ${DC_THEME.line}`, background: "rgba(0,0,0,0.42)" }}
          />
          <Chip
            label={`Acc ${compactNumber(card?.accuracy ?? 0)}`}
            sx={{ color: DC_THEME.text, border: `1px solid ${DC_THEME.line}`, background: "rgba(0,0,0,0.42)" }}
          />
          <Chip
            label={`CD ${compactNumber(card?.cooldown ?? 0)}`}
            sx={{ color: DC_THEME.text, border: `1px solid ${DC_THEME.line}`, background: "rgba(0,0,0,0.42)" }}
          />
          {completedAt ? (
            <Chip
              label={completedAt}
              sx={{ color: DC_THEME.faint, border: `1px solid ${DC_THEME.line}`, background: "rgba(0,0,0,0.42)" }}
            />
          ) : null}
        </Box>
        {effects.length ? (
          <Box sx={{ display: "flex", gap: 0.55, flexWrap: "wrap", mt: 1.2 }}>
            {effects.map((effect, index) => (
              <EffectBadge key={`${effect.effect}-${index}`} effect={effect} />
            ))}
          </Box>
        ) : null}
      </Box>
    </Button>
  );
}

function DetailTile({ label, value }) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <Box
      sx={{
        border: `1px solid ${DC_THEME.line}`,
        background: "rgba(255,255,255,0.028)",
        p: 1,
      }}
    >
      <Typography sx={{ ...labelStyle, fontSize: 9 }}>{label}</Typography>
      <Typography sx={{ color: DC_THEME.text, fontSize: 13 }}>{String(value)}</Typography>
    </Box>
  );
}

function AnimationPanel({ title, frames, fallbackSrc, alt }) {
  return (
    <Box sx={{ ...panelStyle, p: 1.4, height: "100%" }}>
      <Typography sx={{ ...labelStyle, fontSize: 10, mb: 1 }}>{title}</Typography>
      <Box
        sx={{
          height: 230,
          display: "grid",
          placeItems: "center",
          background:
            "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.09), transparent 52%), rgba(0,0,0,0.34)",
          border: `1px solid ${DC_THEME.line}`,
        }}
      >
        <AnimatedFrameImage
          frames={frames}
          fallbackSrc={fallbackSrc}
          alt={alt}
          imageStyle={{ maxHeight: 215 }}
        />
      </Box>
    </Box>
  );
}

function CardSheet({ card, onBack }) {
  const effects = asArray(card?.effects);
  const typeLabel = getCardTypeLabel(card);
  const detailRows = [
    ["Type", typeLabel],
    ["Range", card?.range],
    ["Class", card?.class],
    ["Target", card?.target],
    ["Power", card?.power],
    ["Accuracy", card?.accuracy],
    ["Cooldown", card?.cooldown],
  ];

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
                minHeight: { xs: 420, md: 650 },
                p: 2,
                display: "grid",
                placeItems: "center",
                background:
                  "radial-gradient(circle at 50% 42%, rgba(255,255,255,0.12), transparent 52%), rgba(0,0,0,0.38)",
              }}
            >
              <AnimatedFrameImage
                frames={getCardAnimationFrames(card)}
                fallbackSrc={getAnimationFallback(card?.casterAnimation)}
                alt={`${card?.name || "Card"} caster animation`}
                imageStyle={{ maxHeight: 620 }}
              />
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={7}>
          <Box sx={{ ...panelStyle, p: { xs: 2, md: 3 } }}>
            <Typography sx={{ ...labelStyle, fontSize: 12, mb: 1 }}>
              {typeLabel}
            </Typography>
            <Typography
              component="h1"
              sx={{ ...panelHeaderStyle, fontSize: { xs: 26, md: 38 }, mb: 2 }}
            >
              {card?.name || "Unnamed Card"}
            </Typography>

            <Grid container spacing={1}>
              {detailRows.map(([label, value]) => (
                <Grid item xs={6} sm={4} key={label}>
                  <DetailTile label={label} value={value} />
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography sx={{ ...panelHeaderStyle, fontSize: 16, mb: 1.4 }}>
                Effects
              </Typography>
              {effects.length ? (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {effects.map((effect, index) => (
                    <EffectBadge key={`${effect.effect}-${index}`} effect={effect} />
                  ))}
                </Box>
              ) : (
                <Box
                  sx={{
                    border: `1px solid ${DC_THEME.line}`,
                    background: "rgba(255,255,255,0.025)",
                    p: 2,
                  }}
                >
                  <Typography sx={{ color: DC_THEME.muted }}>No effects found.</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={1.6}>
            <Grid item xs={12} md={6}>
              <AnimationPanel
                title="Caster Animation"
                frames={getCasterAnimationFrames(card)}
                fallbackSrc={getAnimationFallback(card?.casterAnimation)}
                alt={`${card?.name || "Card"} caster`}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <AnimationPanel
                title="Effect Animation"
                frames={getEffectAnimationFrames(card)}
                fallbackSrc={getAnimationFallback(card?.effectAnimation)}
                alt={`${card?.name || "Card"} effect`}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

export default function ArenaCardsPage() {
  const { cards, loading, error } = useArenaCards();
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    if (!selectedCard?.docId) return;
    const nextSelected = cards.find((card) => card.docId === selectedCard.docId);
    if (nextSelected && nextSelected !== selectedCard) {
      setSelectedCard(nextSelected);
    } else if (!nextSelected && !loading) {
      setSelectedCard(null);
    }
  }, [cards, loading, selectedCard]);

  return (
    <Box sx={pageStyle}>
      <Box sx={vignetteStyle} />
      <Box sx={contentStyle}>
        {!selectedCard ? (
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
                Cards
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography sx={{ color: DC_THEME.muted, fontSize: 14 }}>
                {cards.length ? `${cards.length} loaded` : ""}
              </Typography>
              <Button href="/arena/depths" startIcon={<ArrowBackIcon />} sx={{ ...buttonStyle, minHeight: 38, px: 1.6 }}>
                The Depths
              </Button>
            </Box>
          </Box>
        ) : null}

        {selectedCard ? (
          <CardSheet card={selectedCard} onBack={() => setSelectedCard(null)} />
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
              <Typography sx={{ ...labelStyle, fontSize: 12 }}>Loading Cards</Typography>
            </Box>
          </Box>
        ) : error ? (
          <Box sx={{ ...panelStyle, p: 3 }}>
            <Typography sx={{ color: DC_THEME.bad }}>{error}</Typography>
          </Box>
        ) : cards.length ? (
          <Grid container spacing={2}>
            {cards.map((card) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={card.docId}>
                <CardTile card={card} onSelect={setSelectedCard} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ ...panelStyle, p: 3 }}>
            <Typography sx={{ color: DC_THEME.muted }}>
              No completed cards found in the Firebase cards collection.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
