// Original 2D allocation controls and tooltip rules, restored separately from trait swapping.
import React from 'react';
import {Button,Typography,Tooltip} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
const MOVE_RANGE_OPTIONS = [
  { key: "melee", label: "Melee", icon: "/dragonshorde/strength.svg" },
  { key: "ranged", label: "Ranged", icon: "/dragonshorde/dexterity.svg" },
  { key: "magic", label: "Magic", icon: "/dragonshorde/intelligence.svg" },
]

const MOVE_CLASS_OPTIONS = [
  { key: "damage", label: "Damage" },
  { key: "curse", label: "Curse" },
  { key: "buff", label: "Buff" },
]

const NEGATIVE_EFFECT_OPTIONS = [
  { key: "poison", label: "Poison" },
  { key: "bleed", label: "Bleed" },
  { key: "burn", label: "Burn" },
  { key: "freeze", label: "Freeze" },
  { key: "slow", label: "Slow" },
  { key: "drown", label: "Drown" },
  { key: "paralyze", label: "Paralyze" },
  { key: "doom", label: "Doom" },
]

const POSITIVE_EFFECT_OPTIONS = [
  { key: "shield", label: "Shield" },
  { key: "strengthen", label: "Strengthen" },
  { key: "focus", label: "Focus" },
  { key: "empower", label: "Empower" },
  { key: "nurture", label: "Nurture" },
  { key: "bless", label: "Bless" },
  { key: "hasten", label: "Hasten" },
  { key: "cleanse", label: "Cleanse" },
]

const STAT_POINT_OPTIONS = [
  { key: "strength", label: "Strength", icon: "/dragonshorde/strength.svg" },
  { key: "dexterity", label: "Dexterity", icon: "/dragonshorde/dexterity.svg" },
  { key: "intelligence", label: "Intelligence", icon: "/dragonshorde/intelligence.svg" },
]

const STAT_ICON_MAP = {
  health: "/dragonshorde/health.svg",
  strength: "/dragonshorde/strength.svg",
  dexterity: "/dragonshorde/dexterity.svg",
  intelligence: "/dragonshorde/intelligence.svg",
  speed: "/dragonshorde/speed.png",
  resist: "/dragonshorde/resist.png",
  accuracy: "/dragonshorde/accuracy.svg",
  critChance: "/dragonshorde/critChance.svg",
  critDamage: "/dragonshorde/critDamage.svg",
}

const STAT_TOOLTIPS = {
  strength: {
    title: "Strength",
    icon: "/dragonshorde/strength.svg",
    rows: [
      { value: "+2", iconKey: "health", text: "health per Strength" },
      { value: "+Power", iconKey: "strength", text: "for melee moves" },
      { value: "1x", iconKey: "strength", text: "power scaling on damage moves" },
      { value: "0.5x", iconKey: "strength", text: "power scaling on buff and curse moves" },
    ],
  },
  dexterity: {
    title: "Dexterity",
    icon: "/dragonshorde/dexterity.svg",
    rows: [
      { value: "+1", iconKey: "speed", text: "speed per Dexterity" },
      { value: "+Power", iconKey: "dexterity", text: "for ranged moves" },
      { value: "1x", iconKey: "dexterity", text: "power scaling on damage moves" },
      { value: "0.5x", iconKey: "dexterity", text: "power scaling on buff and curse moves" },
    ],
  },
  intelligence: {
    title: "Intelligence",
    icon: "/dragonshorde/intelligence.svg",
    rows: [
      { value: "+1", iconKey: "resist", text: "resist per Intelligence" },
      { value: "+Power", iconKey: "intelligence", text: "for magic moves" },
      { value: "1x", iconKey: "intelligence", text: "power scaling on damage moves" },
      { value: "0.5x", iconKey: "intelligence", text: "power scaling on buff and curse moves" },
    ],
  },
}

const EFFECT_TOOLTIPS = {
  poison: {
    title: "Poison",
    effectKey: "poison",
    rows: [{ value: "-1.0", iconKey: "health", text: "per stack over time" }],
  },
  bleed: {
    title: "Bleed",
    effectKey: "bleed",
    rows: [
      { value: "-0.7", iconKey: "health", text: "per stack over time" },
      { value: "-0.1", iconKey: "strength", text: "per stack" },
    ],
  },
  burn: {
    title: "Burn",
    effectKey: "burn",
    rows: [
      { value: "-0.5", iconKey: "health", text: "per stack over time" },
      { value: "+0.1", iconKey: "strength", text: "per stack" },
      { value: "-0.1", iconKey: "intelligence", text: "per stack" },
      { value: "+0.2", iconKey: "speed", text: "per stack" },
    ],
  },
  freeze: {
    title: "Freeze",
    effectKey: "freeze",
    rows: [
      { value: "-0.2", iconKey: "dexterity", text: "per stack" },
      { value: "-0.2", iconKey: "speed", text: "per stack" },
    ],
  },
  slow: {
    title: "Slow",
    effectKey: "slow",
    rows: [
      { value: "-0.1", iconKey: "dexterity", text: "per stack" },
      { value: "-0.3", iconKey: "speed", text: "per stack" },
    ],
  },
  drown: {
    title: "Drown",
    effectKey: "drown",
    rows: [
      { value: "-0.3", iconKey: "dexterity", text: "per stack" },
      { value: "-0.1", iconKey: "accuracy", text: "per stack" },
    ],
  },
  paralyze: {
    title: "Paralyze",
    effectKey: "paralyze",
    rows: [{ value: "-0.2", iconKey: "accuracy", text: "per stack" }],
  },
  doom: {
    title: "Doom",
    effectKey: "doom",
    rows: [
      { value: "-0.3", iconKey: "health", text: "per stack over time" },
      { value: "-0.2", iconKey: "intelligence", text: "per stack" },
      { value: "-0.2", iconKey: "resist", text: "defender resist per stack" },
    ],
  },
  shield: {
    title: "Shield",
    effectKey: "shield",
    rows: [{ value: "-0.5", iconKey: "health", text: "damage taken from melee and ranged attacks" }],
  },
  strengthen: {
    title: "Strengthen",
    effectKey: "strengthen",
    rows: [{ value: "+0.3", iconKey: "strength", text: "per stack" }],
  },
  focus: {
    title: "Focus",
    effectKey: "focus",
    rows: [{ value: "+0.3", iconKey: "accuracy", text: "per stack" }],
  },
  empower: {
    title: "Empower",
    effectKey: "empower",
    rows: [{ value: "+0.3", iconKey: "intelligence", text: "per stack" }],
  },
  nurture: {
    title: "Nurture",
    effectKey: "nurture",
    rows: [{ value: "+0.5", iconKey: "health", text: "per stack over time" }],
  },
  bless: {
    title: "Bless",
    effectKey: "bless",
    rows: [
      { value: "+0.2", iconKey: "strength", text: "per stack" },
      { value: "+0.2", iconKey: "intelligence", text: "per stack" },
      { value: "+0.1", iconKey: "resist", text: "defender resist per stack" },
    ],
  },
  hasten: {
    title: "Hasten",
    effectKey: "hasten",
    rows: [
      { value: "+0.3", iconKey: "dexterity", text: "per stack" },
      { value: "+0.1", iconKey: "speed", text: "per stack" },
    ],
  },
  cleanse: {
    title: "Cleanse",
    effectKey: "cleanse",
    rows: [{ value: "1", iconKey: "cleanse", text: "negative status effect prevented or cleansed" }],
  },
}

export const DEFAULT_CHAMPION_BUILD = {
  moves: [
    { range: "melee", class: "damage", effect: "poison" },
    { range: "ranged", class: "curse", effect: "bleed" },
    { range: "magic", class: "buff", effect: "shield" },
  ],
  stats: {
    strength: 4,
    dexterity: 3,
    intelligence: 3,
  },
  effectPoints: {
    poison: 2,
    bleed: 2,
    shield: 2,
  },
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
  }

  return map[String(effect || "").toLowerCase()] || null
}

function titleCase(value) {
  const text = String(value || "")
  if (!text) return ""
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function getEffectsForMoveClass(moveClass) {
  return moveClass === "buff" ? POSITIVE_EFFECT_OPTIONS : NEGATIVE_EFFECT_OPTIONS
}

function getFirstAvailableEffect(moveClass, usedEffects = [], currentEffect = null) {
  const options = getEffectsForMoveClass(moveClass)
  const found = options.find(
    (effect) => effect.key === currentEffect || !usedEffects.includes(effect.key)
  )
  return found?.key || options[0]?.key || "none"
}

const DC_COMPONENT = {
  card: {
    position: "relative",
    border: "1px solid rgba(255,255,255,0.18)",
    background:
      "linear-gradient(180deg, rgba(18,18,18,0.93), rgba(2,2,2,0.98))",
    boxShadow: "inset 0 0 28px rgba(255,255,255,0.035), 0 24px 64px rgba(0,0,0,0.72)",
    borderRadius: 0,
    overflow: "hidden",
  },
  cardPad: {
    padding: "clamp(16px, 2.6vw, 26px)",
  },
  panelTitle: {
    margin: 0,
    color: "#ffffff",
    fontFamily: "Jacques, serif",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    fontWeight: 400,
    textShadow: "0 0 18px rgba(255,255,255,0.18)",
  },
  kicker: {
    color: "rgba(255,255,255,0.58)",
    fontFamily: "Jacques, serif",
    letterSpacing: "0.28em",
    textTransform: "uppercase",
    fontSize: 11,
    marginBottom: 6,
  },
  copy: {
    color: "rgba(255,255,255,0.67)",
    fontFamily: "Georgia, serif",
    lineHeight: 1.55,
    letterSpacing: "0.06em",
  },
  button: {
    minHeight: 44,
    borderRadius: 0,
    border: "1px solid rgba(255,255,255,0.28)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(0,0,0,0.72))",
    color: "#f7f7f7",
    fontFamily: "Jacques, serif",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    boxShadow: "0 0 20px rgba(255,255,255,0.045)",
  },
  buttonActive: {
    background:
      "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.28), rgba(18,18,18,0.95) 52%, rgba(0,0,0,0.98) 100%)",
    border: "1px solid rgba(255,255,255,0.88)",
    color: "#ffffff",
    boxShadow:
      "0 0 0 1px rgba(255,255,255,0.24), 0 0 24px rgba(255,255,255,0.18), inset 0 0 22px rgba(255,255,255,0.09)",
  },
  fieldWrap: {
    width: "100%",
    padding: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.42)",
    boxSizing: "border-box",
  },
  progressCard: {
    position: "relative",
    borderRadius: 0,
    padding: "18px 20px 20px",
    border: "1px solid rgba(255,255,255,0.2)",
    background:
      "linear-gradient(180deg, rgba(19,19,19,0.96), rgba(0,0,0,0.98))",
    color: "#f7f7f7",
    maxWidth: 460,
    width: "100%",
    boxShadow: "inset 0 0 28px rgba(255,255,255,0.035), 0 18px 50px rgba(0,0,0,0.72)",
    fontFamily: "Georgia, serif",
    overflow: "hidden",
  },
  panelOrnamentTop: {
    position: "absolute",
    left: "18%",
    right: "18%",
    top: 0,
    height: 1,
    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)",
  },
  progressHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "flex-start",
    marginBottom: 14,
  },
  assetSeal: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "7px 10px",
    border: "1px solid rgba(255,255,255,0.16)",
    color: "rgba(255,255,255,0.68)",
    fontFamily: "Jacques, serif",
    letterSpacing: "0.12em",
    fontSize: 11,
  },
  statusRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  statusPill: {
    fontSize: 10,
    padding: "5px 10px",
    borderRadius: 0,
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    border: "1px solid rgba(255,255,255,0.24)",
    background: "rgba(255,255,255,0.045)",
    fontFamily: "Jacques, serif",
  },
  stageText: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12,
    letterSpacing: "0.08em",
    textTransform: "capitalize",
  },
  errorBox: {
    color: "#ffd1d1",
    border: "1px solid rgba(255,120,120,0.28)",
    background: "rgba(80,0,0,0.22)",
    padding: "9px 11px",
    marginBottom: 12,
    fontSize: 12,
  },
  progressTrack: {
    position: "relative",
    height: 10,
    overflow: "hidden",
    background: "rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.12)",
    marginBottom: 8,
  },
  progressTrackGlow: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
  },
  progressFill: {
    position: "relative",
    zIndex: 1,
    height: "100%",
    transition: "width 0.45s ease-out",
    boxShadow: "0 0 14px rgba(255,255,255,0.23)",
  },
  progressFooter: {
    display: "flex",
    justifyContent: "space-between",
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    letterSpacing: "0.08em",
  },
}
export default function LegacyBuildPlanner({championBuild,setChampionBuild}){
  const selectedMoveEffects = championBuild.moves
    .map((move) => move.effect)
    .filter(Boolean)

  const moveClassCounts = championBuild.moves.reduce((acc, move) => {
    acc[move.class] = Number(acc[move.class] || 0) + 1
    return acc
  }, {})

  const moveRangeCounts = championBuild.moves.reduce((acc, move) => {
    acc[move.range] = Number(acc[move.range] || 0) + 1
    return acc
  }, {})

  const statPointsUsed = Object.values(championBuild.stats).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  )

  const effectPointsUsed = selectedMoveEffects.reduce(
    (sum, effectKey) => sum + Number(championBuild.effectPoints?.[effectKey] || 0),
    0
  )
  const updateChampionMove = (moveIndex, patch) => {
    setChampionBuild((prev) => {
      const nextMoves = prev.moves.map((move, index) =>
        index === moveIndex ? { ...move, ...patch } : { ...move }
      )

      const editedMove = nextMoves[moveIndex]
      const selectedByOtherMoves = nextMoves
        .filter((_, index) => index !== moveIndex)
        .map((move) => move.effect)
        .filter(Boolean)

      const validEffectsForClass = getEffectsForMoveClass(editedMove.class).map(
        (effect) => effect.key
      )

      if (
        !editedMove.effect ||
        !validEffectsForClass.includes(editedMove.effect) ||
        selectedByOtherMoves.includes(editedMove.effect)
      ) {
        editedMove.effect = getFirstAvailableEffect(
          editedMove.class,
          selectedByOtherMoves,
          editedMove.effect
        )
      }

      const selectedEffects = nextMoves.map((move) => move.effect).filter(Boolean)
      const nextEffectPoints = {}

      selectedEffects.forEach((effectKey) => {
        nextEffectPoints[effectKey] = Math.min(
          4,
          Math.max(0, Number(prev.effectPoints?.[effectKey] || 0))
        )
      })

      return {
        ...prev,
        moves: nextMoves,
        effectPoints: nextEffectPoints,
      }
    })
  }

  const updateBuildStatPoints = (statKey, delta) => {
    setChampionBuild((prev) => {
      const currentValue = Number(prev.stats?.[statKey] || 0)
      const currentTotal = Object.values(prev.stats || {}).reduce(
        (sum, value) => sum + Number(value || 0),
        0
      )

      if (delta > 0 && (currentValue >= 8 || currentTotal >= 10)) return prev
      if (delta < 0 && currentValue <= 0) return prev

      return {
        ...prev,
        stats: {
          ...prev.stats,
          [statKey]: Math.max(0, Math.min(8, currentValue + delta)),
        },
      }
    })
  }

  const updateBuildEffectPoints = (effectKey, delta) => {
    setChampionBuild((prev) => {
      const currentValue = Number(prev.effectPoints?.[effectKey] || 0)
      const currentTotal = Object.values(prev.effectPoints || {}).reduce(
        (sum, value) => sum + Number(value || 0),
        0
      )

      if (delta > 0 && (currentValue >= 4 || currentTotal >= 6)) return prev
      if (delta < 0 && currentValue <= 0) return prev

      return {
        ...prev,
        effectPoints: {
          ...prev.effectPoints,
          [effectKey]: Math.max(0, Math.min(4, currentValue + delta)),
        },
      }
    })
  }

  const canSelectMoveClass = (moveIndex, moveClass) => {
    const currentClass = championBuild.moves[moveIndex]?.class
    const countWithoutCurrent = championBuild.moves.reduce((count, move, index) => {
      if (index === moveIndex) return count
      return count + (move.class === moveClass ? 1 : 0)
    }, 0)

    return currentClass === moveClass || countWithoutCurrent < 2
  }

  const canSelectMoveRange = (moveIndex, moveRange) => {
    const currentRange = championBuild.moves[moveIndex]?.range
    const countWithoutCurrent = championBuild.moves.reduce((count, move, index) => {
      if (index === moveIndex) return count
      return count + (move.range === moveRange ? 1 : 0)
    }, 0)

    return currentRange === moveRange || countWithoutCurrent < 2
  }

  const getTooltipIconSrc = (iconKey) => {
    const key = String(iconKey || "").toLowerCase()
    return getEffectIcon(key) || STAT_ICON_MAP[key] || null
  }

  const renderTooltipContent = (content) => {
    if (!content) return ""
    if (typeof content === "string") return content

    const headerIcon = content.icon || getTooltipIconSrc(content.effectKey)
    const rows = Array.isArray(content.rows) ? content.rows : []

    return (
      <div
        style={{
          minWidth: 220,
          maxWidth: 300,
          padding: "4px 2px",
          color: "#f7f7f7",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingBottom: 8,
            marginBottom: 8,
            borderBottom: "1px solid rgba(255,255,255,0.22)",
          }}
        >
          {headerIcon ? (
            <img
              src={headerIcon}
              style={{ width: 26, height: 26, objectFit: "contain" }}
            />
          ) : null}
          <Typography
            variant="caption"
            style={{
              color: "#ffffff",
              fontFamily: "Jacques, serif",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontWeight: 400,
              fontSize: 12,
            }}
          >
            {content.title || "Info"}
          </Typography>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {rows.map((row, rowIndex) => {
            const rowIcon = getTooltipIconSrc(row.iconKey)
            const valueText = String(row.value || "")
            const isNegative = valueText.trim().startsWith("-")
            const isPositive = valueText.trim().startsWith("+")

            return (
              <div
                key={`${content.title || "tooltip"}-${rowIndex}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 7px",
                  borderRadius: 0,
                  background: "linear-gradient(180deg, rgba(18,18,18,0.96), rgba(0,0,0,0.98))",
                  border: "1px solid rgba(255,255,255,0.16)",
                  boxShadow: "inset 0 0 14px rgba(255,255,255,0.035)",
                }}
              >
                <span
                  style={{
                    minWidth: 42,
                    fontWeight: 900,
                    color: isNegative ? "#ffb8b8" : isPositive ? "#d8ffd8" : "#f7f7f7",
                    fontSize: 12,
                    textAlign: "right",
                  }}
                >
                  {valueText}
                </span>
                {rowIcon ? (
                  <img
                    src={rowIcon}
                    style={{ width: 18, height: 18, objectFit: "contain", flex: "0 0 auto" }}
                  />
                ) : null}
                <Typography
                  variant="caption"
                  style={{ color: "rgba(255,255,255,0.72)", fontSize: 11, lineHeight: 1.25, letterSpacing: "0.04em" }}
                >
                  {row.text}
                </Typography>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const withHelpTooltip = (content, child) => {
    if (!content) return child
    return (
      <Tooltip
        title={<div data-effect-ruleset="classic" data-no-keywords>{renderTooltipContent(content)}</div>}
        arrow
        disableInteractive
        enterDelay={650}
        leaveDelay={0}
        placement="top"
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: "rgba(2,2,2,0.98)",
              border: "1px solid rgba(255,255,255,0.28)",
              borderRadius: 0,
              boxShadow: "0 22px 58px rgba(0,0,0,0.82), inset 0 0 22px rgba(255,255,255,0.035)",
              p: 1.15,
            },
          },
          arrow: {
            sx: {
              color: "rgba(2,2,2,0.98)",
            },
          },
        }}
      >
        <span data-no-keywords style={{ display: "inline-flex", width: "100%" }}>{child}</span>
      </Tooltip>
    )
  }

  const renderChipButton = ({ active, disabled, onClick, children }) => (
    <Button
      className="legacyChoice"
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...DC_COMPONENT.button,
        ...(active ? DC_COMPONENT.buttonActive : {}),
        minWidth: 0,
        minHeight: 38,
        padding: "8px 12px",
        opacity: disabled ? 0.34 : 1,
        fontSize: 11,
        transform: active ? "translateY(-1px)" : "none",
      }}
    >
      {children}
    </Button>
  )

  const renderPointControl = ({ label, icon, tooltip, value, max, used, total, onMinus, onPlus }) =>
    withHelpTooltip(
      tooltip,
      <div
        className="legacyPointControl"
        style={{
          width: "100%",
          maxWidth: 240,
          minHeight: 126,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 11,
          padding: "13px 12px",
          background:
            "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.08), transparent 42%), rgba(0,0,0,0.46)",
          border: "1px solid rgba(255,255,255,0.16)",
          boxShadow: "inset 0 0 18px rgba(255,255,255,0.025)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            minWidth: 0,
            width: "100%",
          }}
        >
          {icon ? (
            <img
              src={icon}
              style={{
                width: 34,
                height: 34,
                objectFit: "contain",
                filter: "drop-shadow(0 0 8px rgba(255,255,255,0.12))",
              }}
            />
          ) : null}

          <Typography
            variant="caption"
            style={{
              color: "#f6f6f6",
              fontFamily: "Jacques, serif",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontSize: 11,
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {label}
          </Typography>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
          }}
        >
          <Button
            aria-label={`Decrease ${label} points`}
            title={`Decrease ${label} points`}
            onClick={onMinus}
            disabled={value <= 0}
            style={{
              minWidth: 30,
              width: 30,
              height: 30,
              borderRadius: 0,
              color: "white",
              border: "1px solid rgba(255,255,255,0.30)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.82))",
              boxShadow: "inset 0 0 12px rgba(255,255,255,0.04)",
            }}
          >
            <RemoveIcon fontSize="small"/>
          </Button>

          <Typography
            variant="body2"
            style={{
              color: "white",
              minWidth: 30,
              textAlign: "center",
              fontFamily: "Jacques, serif",
              letterSpacing: "0.1em",
            }}
          >
            {value}
          </Typography>

          <Button
            aria-label={`Increase ${label} points`}
            title={`Increase ${label} points`}
            onClick={onPlus}
            disabled={value >= max || used >= total}
            style={{
              minWidth: 30,
              width: 30,
              height: 30,
              borderRadius: 0,
              color: "white",
              border: "1px solid rgba(255,255,255,0.30)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.82))",
              boxShadow: "inset 0 0 12px rgba(255,255,255,0.04)",
            }}
          >
            <AddIcon fontSize="small"/>
          </Button>
        </div>
      </div>
    )

  const renderMoveSectionDivider = (label) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "12px 0",
        width: "100%",
      }}
    >
      <div
        style={{
          height: 1,
          flex: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.34))",
        }}
      />
      <Typography
        variant="caption"
        style={{
          color: "rgba(255,255,255,0.62)",
          fontFamily: "Jacques, serif",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 10,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
      <div
        style={{
          height: 1,
          flex: 1,
          background: "linear-gradient(90deg, rgba(255,255,255,0.34), transparent)",
        }}
      />
    </div>
  )

  const renderGenerationBuildPlanner = () => (
    <div className="legacyPlannerContent">
      <div>
        <header className="legacyPlannerHeading"><h3>Moves</h3><span>3 move slots</span></header>

        <div className="dc-move-selector-grid">
          {championBuild.moves.map((move, moveIndex) => {
            const effectOptions = getEffectsForMoveClass(move.class)
            const usedByOtherMoves = championBuild.moves
              .filter((_, index) => index !== moveIndex)
              .map((otherMove) => otherMove.effect)
              .filter(Boolean)

            return (
              <div
                className="legacyMove"
                key={`champion-build-move-${moveIndex}`}
                style={{
                  position: "relative",
                  padding: "16px 14px 15px",
                  border: "1px solid rgba(255,255,255,0.16)",
                  background:
                    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.09), transparent 36%), linear-gradient(180deg, rgba(14,14,14,0.96), rgba(0,0,0,0.98))",
                  boxShadow: "inset 0 0 22px rgba(255,255,255,0.028)",
                }}
              >
                <div style={DC_COMPONENT.panelOrnamentTop} />
                <Typography
                  className="legacyMoveHeading"
                  variant="caption"
                  style={{
                    color: "#ffffff",
                    display: "block",
                    textAlign: "center",
                    fontFamily: "Jacques, serif",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Move {moveIndex + 1}
                </Typography>

                <Typography
                  variant="caption"
                  style={{
                    color: "rgba(255,255,255,0.58)",
                    display: "block",
                    textAlign: "center",
                    fontFamily: "Jacques, serif",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    fontSize: 10,
                    marginBottom: 8,
                  }}
                >
                  Range
                </Typography>

                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 0 }}>
                  {MOVE_RANGE_OPTIONS.map((option) => {
                    const disabled = !canSelectMoveRange(moveIndex, option.key)
                    return renderChipButton({
                      active: move.range === option.key,
                      disabled,
                      onClick: () => updateChampionMove(moveIndex, { range: option.key }),
                      children: (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                          <img
                            src={option.icon}
                            style={{
                              width: 18,
                              height: 18,
                              filter: "drop-shadow(0 0 7px rgba(255,255,255,0.12))",
                            }}
                          />
                          {option.label}
                        </span>
                      ),
                    })
                  })}
                </div>

                {renderMoveSectionDivider("Move Class")}

                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 0 }}>
                  {MOVE_CLASS_OPTIONS.map((option) => {
                    const disabled = !canSelectMoveClass(moveIndex, option.key)
                    return renderChipButton({
                      active: move.class === option.key,
                      disabled,
                      onClick: () => updateChampionMove(moveIndex, { class: option.key }),
                      children: option.label,
                    })
                  })}
                </div>

                {renderMoveSectionDivider("Effect")}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(78px,1fr))", gap: 8 }}>
                  {effectOptions.map((effectOption) => {
                    const selectedElsewhere = usedByOtherMoves.includes(effectOption.key)
                    const active = move.effect === effectOption.key

                    return withHelpTooltip(
                      EFFECT_TOOLTIPS[effectOption.key],
                      <Button
                        className="legacyEffectChoice"
                        aria-pressed={active}
                        key={`${moveIndex}-${effectOption.key}`}
                        onClick={() => updateChampionMove(moveIndex, { effect: effectOption.key })}
                        disabled={selectedElsewhere && !active}
                        style={{
                          minWidth: 0,
                          minHeight: 92,
                          padding: "9px 7px",
                          borderRadius: 0,
                          flexDirection: "column",
                          color: active ? "#ffffff" : "rgba(255,255,255,0.72)",
                          background: active
                            ? "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.30), rgba(15,15,15,0.96) 52%, rgba(0,0,0,1) 100%)"
                            : "rgba(0,0,0,0.48)",
                          border: active
                            ? "1px solid rgba(255,255,255,0.92)"
                            : "1px solid rgba(255,255,255,0.16)",
                          opacity: selectedElsewhere && !active ? 0.26 : 1,
                          textTransform: "none",
                          display: "flex",
                          margin: "auto",
                          boxShadow: active
                            ? "0 0 0 1px rgba(255,255,255,0.24), 0 0 26px rgba(255,255,255,0.18), inset 0 0 18px rgba(255,255,255,0.08)"
                            : "none",
                        }}
                      >
                        {getEffectIcon(effectOption.key) ? (
                          <img
                            src={getEffectIcon(effectOption.key)}
                            style={{
                              width: 34,
                              height: 34,
                              objectFit: "contain",
                              marginBottom: 7,
                              filter: "drop-shadow(0 0 8px rgba(255,255,255,0.14))",
                            }}
                          />
                        ) : null}
                        <Typography
                          variant="caption"
                          style={{
                            fontFamily: "Jacques, serif",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            lineHeight: 1.15,
                            fontSize: 10,
                          }}
                        >
                          {effectOption.label}
                        </Typography>
                      </Button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div
          className="legacyAllocationGrid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))",
            gap: 14,
            marginTop: 16,
          }}
        >
          <section className="legacyAllocationSection">
            <Typography
              variant="caption"
              style={{
                color: "#fff",
                display: "block",
                textAlign: "center",
                fontFamily: "Jacques, serif",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Stats {statPointsUsed}/10
            </Typography>
            <div
              className="legacyPointGrid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 240px))",
                justifyContent: "center",
                justifyItems: "center",
                gap: 10,
                width: "100%",
              }}
            >
              {STAT_POINT_OPTIONS.map((stat) =>
                renderPointControl({
                  label: stat.label,
                  icon: stat.icon,
                  tooltip: STAT_TOOLTIPS[stat.key],
                  value: Number(championBuild.stats?.[stat.key] || 0),
                  max: 8,
                  used: statPointsUsed,
                  total: 10,
                  onMinus: () => updateBuildStatPoints(stat.key, -1),
                  onPlus: () => updateBuildStatPoints(stat.key, 1),
                })
              )}
            </div>
          </section>

          <section className="legacyAllocationSection">
            <Typography
              variant="caption"
              style={{
                color: "#fff",
                display: "block",
                textAlign: "center",
                fontFamily: "Jacques, serif",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Effect Points {effectPointsUsed}/6
            </Typography>
            <div
              className="legacyPointGrid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 240px))",
                justifyContent: "center",
                justifyItems: "center",
                gap: 10,
                width: "100%",
              }}
            >
              {selectedMoveEffects.map((effectKey) =>
                renderPointControl({
                  label: titleCase(effectKey),
                  icon: getEffectIcon(effectKey),
                  tooltip: EFFECT_TOOLTIPS[effectKey],
                  value: Number(championBuild.effectPoints?.[effectKey] || 0),
                  max: 4,
                  used: effectPointsUsed,
                  total: 6,
                  onMinus: () => updateBuildEffectPoints(effectKey, -1),
                  onPlus: () => updateBuildEffectPoints(effectKey, 1),
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
return <div className="legacyBuildPlanner">{renderGenerationBuildPlanner()}</div>;
}
