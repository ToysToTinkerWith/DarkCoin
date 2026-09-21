// components/StatusEffectsGallery.jsx
// UPDATE:
// - Icon paths updated to: /public/dragonshorde/effects/trees/tier1/*.svg  (served as /dragonshorde/effects/trees/tier1/*.svg)
// - Force equal card heights across the grid (Grid item + MotionCard set to height: 100% and CardContent flex)
// - Still hides empty / "0" fields

import React, { useMemo, useState } from "react"
import { Box, Button, Card, CardContent, Chip, Divider, Grid, Stack, Typography } from "@mui/material"
import { motion } from "framer-motion"

const MotionBox = motion(Box)
const MotionCard = motion(Card)

const EMPTY_ARR = Object.freeze([])

// --- icon mapping from /public/dragonshorde/effects/trees/tier1 ---
const ICONS = {
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
}

// --- sorted + speedAdj added (per your rules) ---
const EFFECTS = [
  // NEGATIVE
  {
    name: "poison",
    effectType: "negative",
    iconSrc: ICONS.poison,
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "0",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
        speedAdj: "0",
      },
      ongoingHpPerTurn: "-1.0 per stack",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "bleed",
    effectType: "negative",
    iconSrc: ICONS.bleed,
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "-0.1 per stack",
        dexterityAdj: "0",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
        speedAdj: "0",
      },
      ongoingHpPerTurn: "-0.7 per stack",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "burn",
    effectType: "negative",
    iconSrc: ICONS.burn,
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "+0.1 per stack",
        dexterityAdj: "0",
        intelligenceAdj: "-0.1 per stack",
        accuracyAdj: "0",
        resistAdj: "0",
        speedAdj: "+0.2 per stack", // burn * 0.2
      },
      ongoingHpPerTurn: "-0.5 per stack",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "freeze",
    effectType: "negative",
    iconSrc: ICONS.freeze,
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "-0.2 per stack",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
        speedAdj: "-0.2 per stack", // freeze * 0.2
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "slow",
    effectType: "negative",
    iconSrc: ICONS.slow,
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "-0.1 per stack",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
        speedAdj: "-0.3 per stack", // slow * 0.3
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "drown",
    effectType: "negative",
    iconSrc: ICONS.drown,
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "-0.3 per stack",
        intelligenceAdj: "0",
        accuracyAdj: "-0.1 per stack",
        resistAdj: "0",
        speedAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "paralyze",
    effectType: "negative",
    iconSrc: ICONS.paralyze,
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "0",
        intelligenceAdj: "0",
        accuracyAdj: "-0.2 per stack",
        resistAdj: "0",
        speedAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "doom",
    effectType: "negative",
    iconSrc: ICONS.doom,
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "0",
        intelligenceAdj: "-0.2 per stack",
        accuracyAdj: "0",
        resistAdj: "0",
        speedAdj: "0",
      },
      ongoingHpPerTurn: "-0.3 per stack",
      defenderStatAdjustments: { resistAdj: "-0.2 per stack" },
    },
  },

  // POSITIVE
  {
    name: "shield",
    effectType: "positive",
    iconSrc: ICONS.shield,
    effects: {
      effects: ["Blocks 0.5 damage from melee and ranged attacks"],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "0",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
        speedAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "strengthen",
    effectType: "positive",
    iconSrc: ICONS.strengthen,
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "+0.3 per stack",
        dexterityAdj: "0",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
        speedAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "focus",
    effectType: "positive",
    iconSrc: ICONS.focus,
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "0",
        intelligenceAdj: "0",
        accuracyAdj: "+0.3 per stack",
        resistAdj: "0",
        speedAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "empower",
    effectType: "positive",
    iconSrc: ICONS.empower,
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "0",
        intelligenceAdj: "+0.3 per stack",
        accuracyAdj: "0",
        resistAdj: "0",
        speedAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "nurture",
    effectType: "positive",
    iconSrc: ICONS.nurture,
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "0",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
        speedAdj: "0",
      },
      ongoingHpPerTurn: "+0.5 per stack",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "bless",
    effectType: "positive",
    iconSrc: ICONS.bless,
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "+0.2 per stack",
        dexterityAdj: "0",
        intelligenceAdj: "+0.2 per stack",
        accuracyAdj: "0",
        resistAdj: "0",
        speedAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "+0.1 per stack" },
    },
  },
  {
    name: "hasten",
    effectType: "positive",
    iconSrc: ICONS.hasten,
    effects: {
      effects: [],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "+0.3 per stack",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
        speedAdj: "+0.1 per stack", // hasten * 0.1
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
  {
    name: "cleanse",
    effectType: "positive",
    iconSrc: ICONS.cleanse,
    effects: {
      effects: ["Prevents or cleanses 1 negative status effect"],
      attackerStatAdjustments: {
        strengthAdj: "0",
        dexterityAdj: "0",
        intelligenceAdj: "0",
        accuracyAdj: "0",
        resistAdj: "0",
        speedAdj: "0",
      },
      ongoingHpPerTurn: "0",
      defenderStatAdjustments: { resistAdj: "0" },
    },
  },
]

function isZeroish(v) {
  if (v === null || v === undefined) return true
  const s = String(v).trim()
  if (!s) return true
  if (s === "0" || s === "+0" || s === "-0") return true
  if (/^0(\.0+)?(\s|$)/.test(s)) return true
  if (s === "0 per stack" || s === "+0 per stack" || s === "-0 per stack") return true
  return false
}

function normLabelKey(k) {
  switch (k) {
    case "strengthAdj":
      return "Strength"
    case "dexterityAdj":
      return "Dexterity"
    case "intelligenceAdj":
      return "Intelligence"
    case "accuracyAdj":
      return "Accuracy"
    case "resistAdj":
      return "Resist"
    case "speedAdj":
      return "Speed"
    default:
      return k
  }
}

function chipsFromAdjustments(obj) {
  if (!obj || typeof obj !== "object") return EMPTY_ARR
  const out = []
  for (const [k, v] of Object.entries(obj)) {
    if (isZeroish(v)) continue
    out.push(`${normLabelKey(k)} ${String(v).trim()}`)
  }
  return out
}

export default function StatusEffectsGallery({ effects = EFFECTS, defaultTab = "negative" }) {
  const [active, setActive] = useState(defaultTab)

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.99 },
    show: { opacity: 1, y: 0, scale: 1 },
  }

  const WHITE = "rgba(255,255,255,.95)"
  const WHITE_DIM = "rgba(255,255,255,.78)"

  const filtered = useMemo(() => {
    const arr = Array.isArray(effects) ? effects : EMPTY_ARR
    return arr.filter((e) => (active === "all" ? true : e?.effectType === active))
  }, [effects, active])

  const counts = useMemo(() => {
    const arr = Array.isArray(effects) ? effects : EMPTY_ARR
    const neg = arr.filter((e) => e?.effectType === "negative").length
    const pos = arr.filter((e) => e?.effectType === "positive").length
    return { neg, pos, all: arr.length }
  }, [effects])

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#070A12",
        background:
          "radial-gradient(900px 420px at 15% 12%, rgba(124,58,237,.22), transparent 60%)," +
          "radial-gradient(800px 420px at 85% 0%, rgba(34,211,238,.20), transparent 55%)," +
          "linear-gradient(180deg, #070A12 0%, #05060A 100%)",
        color: WHITE,
        p: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 900,
              letterSpacing: -0.2,
              background: "linear-gradient(90deg, #7C3AED 0%, #4F46E5 35%, #22D3EE 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Status Effects
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip
              size="small"
              label={`${counts.all} total`}
              sx={{ bgcolor: "rgba(255,255,255,.06)", color: WHITE, border: "1px solid rgba(255,255,255,.10)" }}
            />
            <Chip
              size="small"
              label={`${counts.neg} negative`}
              sx={{ bgcolor: "rgba(255,255,255,.06)", color: WHITE, border: "1px solid rgba(255,255,255,.10)" }}
            />
            <Chip
              size="small"
              label={`${counts.pos} positive`}
              sx={{ bgcolor: "rgba(255,255,255,.06)", color: WHITE, border: "1px solid rgba(255,255,255,.10)" }}
            />
          </Stack>
        </Stack>

        {/* Nav */}
        <Card
          sx={{
            borderRadius: 3,
            bgcolor: "rgba(255,255,255,.05)",
            border: "1px solid rgba(255,255,255,.10)",
            backdropFilter: "blur(10px)",
            mb: 2,
          }}
        >
          <CardContent sx={{ p: 1.4 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {[
                { key: "negative", label: "Negative", count: counts.neg },
                { key: "positive", label: "Positive", count: counts.pos },
                { key: "all", label: "All", count: counts.all },
              ].map((t) => {
                const isActive = t.key === active
                return (
                  <Button
                    key={t.key}
                    onClick={() => setActive(t.key)}
                    variant="contained"
                    disableElevation
                    sx={{
                      textTransform: "none",
                      borderRadius: 999,
                      px: 1.6,
                      py: 0.8,
                      minHeight: 34,
                      bgcolor: isActive ? "rgba(34,211,238,.18)" : "rgba(255,255,255,.06)",
                      border: isActive ? "1px solid rgba(34,211,238,.45)" : "1px solid rgba(255,255,255,.10)",
                      color: WHITE,
                      "&:hover": { bgcolor: isActive ? "rgba(34,211,238,.22)" : "rgba(255,255,255,.10)" },
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span style={{ fontWeight: 800 }}>{t.label}</span>
                      <Chip
                        size="small"
                        label={t.count}
                        sx={{
                          height: 22,
                          bgcolor: "rgba(0,0,0,.18)",
                          color: WHITE,
                          border: "1px solid rgba(255,255,255,.10)",
                        }}
                      />
                    </Stack>
                  </Button>
                )
              })}
            </Stack>
          </CardContent>
        </Card>

        <MotionBox variants={containerVariants} initial="hidden" animate="show">
          <Grid container spacing={2} alignItems="stretch">
            {filtered.length === 0 ? (
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 3, bgcolor: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.10)" }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 900, color: WHITE }}>No effects</Typography>
                    <Typography sx={{ mt: 0.8, opacity: 0.85, color: WHITE_DIM }}>Try another tab.</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ) : (
              filtered.map((ef) => {
                const name = String(ef?.name || "").trim()
                const effectType = String(ef?.effectType || "").trim()
                const iconSrc = String(ef?.iconSrc || "").trim()

                const lines = Array.isArray(ef?.effects?.effects) ? ef.effects.effects.filter(Boolean) : EMPTY_ARR
                const atkChips = chipsFromAdjustments(ef?.effects?.attackerStatAdjustments)
                const defChips = chipsFromAdjustments(ef?.effects?.defenderStatAdjustments)

                const ongoing = ef?.effects?.ongoingHpPerTurn
                const showOngoing = !isZeroish(ongoing)

                return (
                  <Grid item xs={12} sm={6} md={4} key={`${effectType}:${name}`} sx={{ display: "flex" }}>
                    <MotionCard
                      variants={cardVariants}
                      whileHover={{ y: -4 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      sx={{
                        width: "100%",
                        height: "100%", // ✅ equal height within row
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: 3,
                        bgcolor: "rgba(255,255,255,.06)",
                        border: "1px solid rgba(255,255,255,.12)",
                        backdropFilter: "blur(10px)",
                        overflow: "hidden",
                        boxShadow: "0 16px 60px rgba(0,0,0,.45)",
                      }}
                    >
                      <CardContent sx={{ p: 2, display: "flex", flexDirection: "column", flex: 1 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          {/* Icon box */}
                          <Box
                            sx={{
                              width: 72,
                              height: 72,
                              borderRadius: 2,
                              overflow: "hidden",
                              flex: "0 0 auto",
                              bgcolor: "rgba(0,0,0,.28)",
                              border: "1px solid rgba(255,255,255,.10)",
                              position: "relative",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              p: 1,
                            }}
                          >
                            {iconSrc ? (
                              <Box
                                component="img"
                                src={iconSrc}
                                alt={`${name} icon`}
                                loading="lazy"
                                sx={{ width: "100%", height: "100%", objectFit: "contain" }}
                              />
                            ) : (
                              <Typography sx={{ fontSize: 11, color: WHITE_DIM }}>No icon</Typography>
                            )}

                            <Box
                              sx={{
                                position: "absolute",
                                inset: -20,
                                background:
                                  "radial-gradient(160px 120px at 10% 10%, rgba(124,58,237,.22), transparent 60%)," +
                                  "radial-gradient(160px 120px at 90% 90%, rgba(34,211,238,.18), transparent 60%)",
                                pointerEvents: "none",
                              }}
                            />
                          </Box>

                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                              <Typography
                                sx={{
                                  fontWeight: 900,
                                  fontSize: 14,
                                  color: WHITE,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  textTransform: "capitalize",
                                }}
                                title={name}
                              >
                                {name || "—"}
                              </Typography>

                              {effectType ? (
                                <Chip
                                  size="small"
                                  label={effectType}
                                  sx={{
                                    bgcolor: effectType === "positive" ? "rgba(34,211,238,.12)" : "rgba(255,107,107,.10)",
                                    color: WHITE,
                                    border:
                                      effectType === "positive"
                                        ? "1px solid rgba(34,211,238,.35)"
                                        : "1px solid rgba(255,107,107,.30)",
                                    height: 24,
                                    "& .MuiChip-label": { px: 1.0, fontSize: 11, fontWeight: 900, letterSpacing: 0.2 },
                                  }}
                                />
                              ) : null}
                            </Stack>

                            {lines.length > 0 ? (
                              <Stack spacing={0.6} sx={{ mt: 1.1 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 900, color: WHITE }}>Effects</Typography>
                                {lines.map((t, i) => (
                                  <Typography
                                    key={`${name}:line:${i}`}
                                    sx={{ fontSize: 12, color: WHITE_DIM, lineHeight: 1.25 }}
                                  >
                                    • {String(t)}
                                  </Typography>
                                ))}
                              </Stack>
                            ) : null}
                          </Box>
                        </Stack>

                        {atkChips.length > 0 ? (
                          <>
                            <Divider sx={{ my: 1.3, borderColor: "rgba(255,255,255,.10)" }} />
                            <Stack spacing={0.7}>
                              <Typography sx={{ fontSize: 12, fontWeight: 900, color: WHITE }}>Attacker</Typography>
                              <Stack direction="row" spacing={0.8} flexWrap="wrap">
                                {atkChips.map((c) => (
                                  <Chip
                                    key={`${name}:atk:${c}`}
                                    size="small"
                                    label={c}
                                    sx={{
                                      bgcolor: "rgba(255,255,255,.06)",
                                      color: WHITE,
                                      border: "1px solid rgba(255,255,255,.12)",
                                      height: 26,
                                      "& .MuiChip-label": { px: 1.1, fontSize: 11, fontWeight: 800 },
                                    }}
                                  />
                                ))}
                              </Stack>
                            </Stack>
                          </>
                        ) : null}

                        {defChips.length > 0 ? (
                          <>
                            <Divider sx={{ my: 1.3, borderColor: "rgba(255,255,255,.10)" }} />
                            <Stack spacing={0.7}>
                              <Typography sx={{ fontSize: 12, fontWeight: 900, color: WHITE }}>Defender</Typography>
                              <Stack direction="row" spacing={0.8} flexWrap="wrap">
                                {defChips.map((c) => (
                                  <Chip
                                    key={`${name}:def:${c}`}
                                    size="small"
                                    label={c}
                                    sx={{
                                      bgcolor: "rgba(255,255,255,.06)",
                                      color: WHITE,
                                      border: "1px solid rgba(255,255,255,.12)",
                                      height: 26,
                                      "& .MuiChip-label": { px: 1.1, fontSize: 11, fontWeight: 800 },
                                    }}
                                  />
                                ))}
                              </Stack>
                            </Stack>
                          </>
                        ) : null}

                        {showOngoing ? (
                          <>
                            <Divider sx={{ my: 1.3, borderColor: "rgba(255,255,255,.10)" }} />
                            <Stack spacing={0.6}>
                              <Typography sx={{ fontSize: 12, fontWeight: 900, color: WHITE }}>Ongoing</Typography>
                              <Chip
                                size="small"
                                label={`HP / turn: ${String(ongoing).trim()}`}
                                sx={{
                                  alignSelf: "flex-start",
                                  bgcolor: "rgba(255,255,255,.06)",
                                  color: WHITE,
                                  border: "1px solid rgba(255,255,255,.12)",
                                  height: 26,
                                  "& .MuiChip-label": { px: 1.1, fontSize: 11, fontWeight: 800 },
                                }}
                              />
                            </Stack>
                          </>
                        ) : null}

                        {/* ✅ spacer so footer bar stays at bottom even if content differs */}
                        <Box sx={{ flex: 1 }} />
                      </CardContent>

                      <Box
                        sx={{
                          height: 3,
                          background: "linear-gradient(90deg, #7C3AED 0%, #4F46E5 35%, #22D3EE 100%)",
                          opacity: 0.9,
                        }}
                      />
                    </MotionCard>
                  </Grid>
                )
              })
            )}
          </Grid>
        </MotionBox>
      </Box>
    </Box>
  )
}
