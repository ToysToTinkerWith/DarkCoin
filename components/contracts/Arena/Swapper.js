import React, { useState, useEffect, useRef } from "react"

import algosdk from "algosdk"
import { Typography, Button, Grid, TextField, Tooltip } from "@mui/material"

import { CID } from "multiformats/cid"

import { db } from "../../../Firebase/FirebaseInit"
import { onSnapshot, doc, getDoc } from "firebase/firestore"

import { storage } from "../../../Firebase/FirebaseInit"
import { getDownloadURL, ref } from "firebase/storage"

import * as mfsha2 from "multiformats/hashes/sha2"
import * as digest from "multiformats/hashes/digest"

import { useWallet } from "@txnlab/use-wallet-react"

import multihash from "multihashes"
import cid from "cids"

import Character from "./Character"
import { SKIN_EFFECTS, TRAIT_EFFECTS } from "./traitsData"

/**
 * Listen to Firestore char progress for a given assetId.
 * Expects doc "chars/{assetId}object" with fields:
 *  - progress (0–100)
 *  - stage (string)
 *  - status ("pending" | "running" | "completed" | "error" | etc.)
 *  - charObj (final character object when done)
 */
function subscribeToCharProgress(assetId, onUpdate, onError) {
  if (!assetId) {
    throw new Error("subscribeToCharProgress: assetId is required")
  }

  const docId = String(assetId) + "object"
  const refDoc = doc(db, "chars", docId)

  const unsubscribe = onSnapshot(
    refDoc,
    (snap) => {
      if (!snap.exists()) {
        onUpdate({
          progress: null,
          stage: null,
          status: null,
          charObj: null,
        })
        return
      }

      const data = snap.data() || {}

      onUpdate({
        progress:
          typeof data.progress === "number" && !Number.isNaN(data.progress)
            ? data.progress
            : null,
        stage: data.stage || null,
        status: data.status || null,
        charObj: data.charObj || null,
      })
    },
    (err) => {
      console.error("Error listening to char progress:", err)
      onError?.(err)
    }
  )

  return unsubscribe
}

const ITEM_VOTE_APP_ID = 3339943603
const EFFECT_STRIDE = 2000

function getBackgroundTraitFileBase(backgroundName) {
  return String(backgroundName || "")
    .replace(/\s*Background$/i, "")
    .trim()
}

const TRAIT_FALLBACK_IMAGES = {
  Background: "/warriors/background.svg",
  Skin: "/warriors/skin.svg",
  Weapon: "/warriors/weapon.svg",
  Magic: "/warriors/magic.png",
  Head: "/warriors/head.svg",
  Armour: "/warriors/armour.svg",
  Extra: "/warriors/extra.svg",
}

function getTraitFallbackImage(type) {
  return TRAIT_FALLBACK_IMAGES[type] || "/warriors/extra.svg"
}

function buildTraitFileBases(type, name) {
  const raw = String(name || "").trim()
  const base = type === "Background" ? getBackgroundTraitFileBase(raw) : raw
  const out = new Set()

  if (base) out.add(base)
  if (raw) out.add(raw)

  ;[...out].forEach((value) => {
    out.add(value.replace(/[’']/g, ""))
    out.add(value.replace(/[^\w\s-]/g, ""))
  })

  return [...out].map((value) => value.trim()).filter(Boolean)
}

async function getTraitImageUrl(type, name) {
  if (!name || name === "None") return getTraitFallbackImage(type)

  const exts = [".png", ".webp", ".jpg", ".jpeg"]
  const bases = buildTraitFileBases(type, name)

  for (const base of bases) {
    for (const ext of exts) {
      try {
        const url = await getDownloadURL(ref(storage, `warriors/${type}/${base}${ext}`))
        if (url) return url
      } catch {}
    }
  }

  return getTraitFallbackImage(type)
}

function isSelectableTrait(trait) {
  return trait?.owned !== false
}

function normalizeTraitAssetId(value) {
  const assetId = Number(value)
  return Number.isSafeInteger(assetId) && assetId > 0 ? assetId : 0
}

function getAccountAssetIdSet(accountAssets) {
  const assets = Array.isArray(accountAssets?.assets)
    ? accountAssets.assets
    : Array.isArray(accountAssets)
    ? accountAssets
    : []

  return new Set(
    assets
      .map((asset) => normalizeTraitAssetId(asset?.["asset-id"] || asset?.assetId || asset?.id))
      .filter(Boolean)
  )
}

function getTraitChangeTransactionCount({
  currentAssetId,
  change,
  walletAssetIds,
  assumeMissingOldOptIn = true,
}) {
  if (change === "None") return 0

  const oldAssetId = normalizeTraitAssetId(currentAssetId)
  const newAssetId = normalizeTraitAssetId(change?.assetId)
  const isRemove = change === "Remove"
  let count = 0

  if (oldAssetId && (newAssetId || isRemove)) {
    const hasOldAssetOptIn = walletAssetIds instanceof Set && walletAssetIds.has(oldAssetId)
    if (!hasOldAssetOptIn || assumeMissingOldOptIn) count += 1
    count += 1
  }

  if (newAssetId) {
    count += 2
  }

  return count
}

function estimateTraitSwapTransactionGroupSize({
  changes,
  currentAssetIds,
  walletAssetIds,
  includeGenerationPayment = false,
  assumeMissingOldOptIn = true,
}) {
  const pendingCount = Object.values(changes || {}).filter((change) => change !== "None").length
  if (!pendingCount && !includeGenerationPayment) return 0

  let count = TRAIT_SWAP_METADATA_TXN_COUNT
  if (includeGenerationPayment) count += TRAIT_SWAP_GENERATION_PAYMENT_TXN_COUNT

  Object.entries(changes || {}).forEach(([type, change]) => {
    count += getTraitChangeTransactionCount({
      currentAssetId: currentAssetIds?.[type],
      change,
      walletAssetIds,
      assumeMissingOldOptIn,
    })
  })

  return count
}

const GENERATION_PHASE_LABELS = {
  checking: "Checking Build",
  network: "Getting Network",
  wallet: "Checking Wallet",
  transactions: "Building Transactions",
  metadata: "Preparing Metadata",
  sign: "Sign Transaction",
  signed: "Signature Received",
  cosign: "Finalizing Transaction",
  sending: "Sending Transaction",
  queue: "Queuing Champion",
}

const SWAP_PHASE_LABELS = {
  checking: "Starting Swap",
  network: "Starting Swap",
  wallet: "Starting Swap",
  transactions: "Starting Swap",
  metadata: "Preparing Metadata",
  sign: "Sign Transaction",
  signed: "Sending Transaction",
  cosign: "Sending Transaction",
  sending: "Sending Transaction",
  saving: "Sending Transaction",
  refreshing: "Sending Transaction",
}

const GENERATED_CHAMPION_TRAIT_SWAP_LOCK_MESSAGE =
  "Trait Swap is disabled because this champion already has a generated Arena character."
const MAX_TRAIT_SWAP_CHANGES = 4
const ALGORAND_TXN_GROUP_LIMIT = 16
const TRAIT_SWAP_METADATA_TXN_COUNT = 1
const TRAIT_SWAP_GENERATION_PAYMENT_TXN_COUNT = 1

const GENERATION_CANCELABLE_PHASES = new Set([
  "checking",
  "network",
  "wallet",
  "transactions",
  "metadata",
])

function makeGenerationCanceledError() {
  const error = new Error("Generation canceled")
  error.name = "GenerationCanceledError"
  return error
}

function isWalletCancelError(error) {
  const message = String(error?.message || error || "")
  return /cancel|reject|declin/i.test(message)
}

function getGeneratedChampionObjectFromData(data) {
  if (!data || typeof data !== "object") return null
  return data.charObj || data.charObject || null
}

async function readGeneratedChampionObject(assetId) {
  const docId = String(assetId) + "object"
  const refDoc = doc(db, "chars", docId)
  const snap = await getDoc(refDoc)
  if (!snap.exists()) return null

  return getGeneratedChampionObjectFromData(snap.data() || {})
}

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

const DEFAULT_CHAMPION_BUILD = {
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

function makeJsonSafe(value) {
  if (value === null || typeof value === "undefined") return value

  if (typeof value === "bigint") {
    const max = BigInt(Number.MAX_SAFE_INTEGER)
    const min = BigInt(Number.MIN_SAFE_INTEGER)
    return value <= max && value >= min ? Number(value) : value.toString()
  }

  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
    return value
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("base64")
  }

  if (Array.isArray(value)) {
    return value.map((item) => makeJsonSafe(item))
  }

  if (typeof value === "object") {
    const out = {}
    Object.entries(value).forEach(([key, item]) => {
      if (typeof item === "undefined" || typeof item === "function") return
      out[key] = makeJsonSafe(item)
    })
    return out
  }

  return String(value)
}

function safeJsonStringify(value) {
  return JSON.stringify(makeJsonSafe(value))
}

function safeNumberOrNull(value) {
  if (value === null || typeof value === "undefined" || value === "") return null
  if (typeof value === "bigint") return Number(value)
  const n = Number(value)
  return Number.isFinite(n) ? n : null
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

function encodeUtf8(value) {
  return new TextEncoder().encode(String(value))
}

function bytesToUint8Array(value) {
  if (value instanceof Uint8Array) return value
  if (Array.isArray(value)) return Uint8Array.from(value)
  if (typeof value === "string") {
    const binary = atob(value)
    return Uint8Array.from(binary, (c) => c.charCodeAt(0))
  }
  return new Uint8Array()
}

function averageValidVotes(values) {
  if (!Array.isArray(values) || values.length === 0) return null
  const sum = values.reduce((total, value) => total + value, 0)
  return Math.floor(sum / values.length)
}


function computeEffectAveragesFromBoxBytes(boxBytes, effectCount) {
  const averages = []

  for (let effectIndex = 0; effectIndex < effectCount; effectIndex += 1) {
    const start = effectIndex * EFFECT_STRIDE
    const end = Math.min(start + EFFECT_STRIDE, boxBytes.length)

    if (start >= boxBytes.length) {
      averages.push(null)
      continue
    }

    const slice = boxBytes.slice(start, end)
    const validVotes = []

    for (let i = 0; i < slice.length; i += 1) {
      const value = slice[i]
      if (value > 0 && value <= 20) validVotes.push(value)
    }

    averages.push(averageValidVotes(validVotes))
  }

  return averages
}

async function readTraitEffectMedians(client, traitName, effectCount) {
  if (!traitName || !effectCount) {
    return []
  }

  try {
    const res = await client
      .getApplicationBoxByName(ITEM_VOTE_APP_ID, encodeUtf8(traitName))
      .do()

    const boxBytes = bytesToUint8Array(res?.value)
    return computeEffectAveragesFromBoxBytes(boxBytes, effectCount)
  } catch (error) {
    console.error("Failed to read item voting box for trait:", traitName, error)
    return Array(effectCount).fill(null)
  }
}

/**
 * Visual-only progress component. All state is passed in via props.
 */
function CharGenerationProgress({ assetId, genStatus, error }) {
  const status = genStatus?.status || "pending"
  const numericProgress =
    typeof genStatus?.progress === "number" &&
    genStatus.progress >= 0 &&
    genStatus.progress <= 100
      ? genStatus.progress
      : 0
  const stage = genStatus?.stage

  const isCompleted = status === "completed"
  const isError = status === "error"
  const friendlyStageLabel =
    stage ||
    (isCompleted
      ? "Complete"
      : isError
      ? "Error"
      : "Waiting for generation to start")

  return (
    <div style={DC_COMPONENT.progressCard}>
      <div style={DC_COMPONENT.panelOrnamentTop} />

      <div style={DC_COMPONENT.progressHeaderRow}>
        <div>
          <div style={DC_COMPONENT.kicker}>Rite Status</div>
          <h3 style={DC_COMPONENT.panelTitle}>Champion Generation</h3>
        </div>

        {assetId ? (
          <div style={DC_COMPONENT.assetSeal}>
            <img src="/invDC.svg" alt="Dark Coin" style={{ width: 22, height: 22 }} />
            <span>#{assetId}</span>
          </div>
        ) : null}
      </div>

      <div style={DC_COMPONENT.statusRow}>
        <span
          style={{
            ...DC_COMPONENT.statusPill,
            borderColor: isCompleted
              ? "rgba(210,255,210,0.5)"
              : isError
              ? "rgba(255,120,120,0.55)"
              : "rgba(255,255,255,0.24)",
            color: isCompleted ? "#d9ffd9" : isError ? "#ffd1d1" : "#f5f5f5",
          }}
        >
          {status || "pending"}
        </span>
        <span style={DC_COMPONENT.stageText}>{friendlyStageLabel.replace(/_/g, " ")}</span>
      </div>

      {error ? <div style={DC_COMPONENT.errorBox}>{error}</div> : null}

      <div style={DC_COMPONENT.progressTrack}>
        <div style={DC_COMPONENT.progressTrackGlow} />
        <div
          style={{
            ...DC_COMPONENT.progressFill,
            width: `${numericProgress}%`,
            background: isCompleted
              ? "linear-gradient(90deg, rgba(255,255,255,0.72), #ffffff)"
              : isError
              ? "linear-gradient(90deg, #5b1111, #d7d7d7)"
              : "linear-gradient(90deg, rgba(255,255,255,0.28), rgba(255,255,255,0.92))",
          }}
        />
      </div>

      <div style={DC_COMPONENT.progressFooter}>
        <span>
          {!genStatus
            ? "Waiting for the forge."
            : isCompleted
            ? "Champion ready."
            : isError
            ? "Generation failed."
            : "Binding champion traits."}
        </span>
        <span>{numericProgress}%</span>
      </div>
    </div>
  )
}

const DARK_COIN_UI = {
  page: {
    minHeight: "100vh",
    width: "100%",
    padding: "24px 12px 58px",
    color: "#f3f3f3",
    background:
      "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.13), transparent 23%), radial-gradient(circle at 16% 12%, rgba(255,255,255,0.08), transparent 18%), linear-gradient(180deg, #020202 0%, #070707 44%, #000 100%)",
  },
  shell: {
    width: "min(1240px, 100%)",
    margin: "0 auto",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 0,
    background:
      "linear-gradient(180deg, rgba(13,13,13,0.96), rgba(0,0,0,0.985))",
    boxShadow:
      "0 0 0 1px rgba(255,255,255,0.04), 0 34px 95px rgba(0,0,0,0.96)",
    overflow: "hidden",
  },
  header: {
    padding: "32px 18px 26px",
    borderBottom: "1px solid rgba(255,255,255,0.13)",
    textAlign: "center",
    position: "relative",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(0,0,0,0.44)), radial-gradient(circle at 50% 0%, rgba(255,255,255,0.17), transparent 38%)",
  },
  moon: {
    width: 58,
    height: 58,
    margin: "0 auto 13px",
    objectFit: "contain",
    filter: "drop-shadow(0 0 20px rgba(255,255,255,0.2))",
  },
  eyebrow: {
    fontFamily: "Jacques, serif",
    letterSpacing: "0.46em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
  title: {
    fontFamily: "Jacques, serif",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "#f7f7f7",
    fontSize: "clamp(2.1rem, 6vw, 4.75rem)",
    lineHeight: 1,
    margin: "12px 0 8px",
    textShadow: "0 0 24px rgba(255,255,255,0.19)",
  },
  subtitle: {
    fontFamily: "Jacques, serif",
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.64)",
    fontSize: 13,
  },
  tabs: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
  },
  tab: {
    height: 60,
    borderRadius: 0,
    border: 0,
    borderRight: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.5)",
    color: "rgba(255,255,255,0.64)",
    fontFamily: "Jacques, serif",
    letterSpacing: "0.25em",
    textTransform: "uppercase",
    fontSize: 12,
    cursor: "pointer",
  },
  activeTab: {
    background:
      "radial-gradient(circle at 50% 100%, rgba(255,255,255,0.16), rgba(0,0,0,0.75) 58%)",
    color: "#ffffff",
    boxShadow: "inset 0 -2px 0 rgba(255,255,255,0.9)",
  },
  body: {
    padding: "26px 18px 36px",
  },
  panel: {
    border: "1px solid rgba(255,255,255,0.16)",
    background:
      "linear-gradient(180deg, rgba(18,18,18,0.88), rgba(3,3,3,0.98))",
    boxShadow: "inset 0 0 34px rgba(255,255,255,0.035)",
  },
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

function DarkCoinTabs({ activeTab, setActiveTab, hasChampion, isGenerating }) {
  const buttonStyle = (tab) => ({
    ...DARK_COIN_UI.tab,
    ...(activeTab === tab ? DARK_COIN_UI.activeTab : {}),
  })

  return (
    <div style={DARK_COIN_UI.tabs}>
      <button
        type="button"
        onClick={() => setActiveTab("generate")}
        style={buttonStyle("generate")}
      >
        Generate Champion
      </button>

      <button
        type="button"
        onClick={() => {
          if (hasChampion && !isGenerating) setActiveTab("champion")
        }}
        disabled={!hasChampion || isGenerating}
        style={{
          ...buttonStyle("champion"),
          opacity: !hasChampion || isGenerating ? 0.38 : 1,
          cursor: !hasChampion || isGenerating ? "not-allowed" : "pointer",
          borderRight: 0,
        }}
      >
        Champion
      </button>
    </div>
  )
}

export default function Swapper(props) {
  const {
    wallets,
    activeWallet,
    activeAddress,
    isReady,
    signTransactions,
    transactionSigner,
    algodClient,
  } = useWallet()

  const [nft, setNft] = useState(null)
  const [nftUrl, setNftUrl] = useState(null)

  const [char, setChar] = useState(null)
  const [charObject, setCharObject] = useState(null)

  const [Background, setBackground] = useState("None")
  const [Skin, setSkin] = useState("None")
  const [Weapon, setWeapon] = useState("None")
  const [Magic, setMagic] = useState("None")
  const [Head, setHead] = useState("None")
  const [Armour, setArmour] = useState("None")
  const [Extra, setExtra] = useState("None")

  const [BackgroundChange, setBackgroundChange] = useState("None")
  const [WeaponChange, setWeaponChange] = useState("None")
  const [MagicChange, setMagicChange] = useState("None")
  const [HeadChange, setHeadChange] = useState("None")
  const [ArmourChange, setArmourChange] = useState("None")
  const [ExtraChange, setExtraChange] = useState("None")

  const [BackgroundId, setBackgroundId] = useState("None")
  const [WeaponId, setWeaponId] = useState("None")
  const [MagicId, setMagicId] = useState("None")
  const [HeadId, setHeadId] = useState("None")
  const [ArmourId, setArmourId] = useState("None")
  const [ExtraId, setExtraId] = useState("None")

  const [ownedBackgrounds, setOwnedBackgrounds] = useState([])
  const [ownedWeapons, setOwnedWeapons] = useState([])
  const [ownedMagics, setOwnedMagics] = useState([])
  const [ownedHeads, setOwnedHeads] = useState([])
  const [ownedArmours, setOwnedArmours] = useState([])
  const [ownedExtras, setOwnedExtras] = useState([])
  const [walletAssetIds, setWalletAssetIds] = useState(() => new Set())

  const [cat, setCat] = useState(null)
  const [newImage, setNewImage] = useState(null)
  const [isPreviewUpdating, setIsPreviewUpdating] = useState(false)
  const [displayRoll, setDisplayRoll] = useState(false)

  // Generation / UI state
  const [showProgress, setShowProgress] = useState(false)
  const [mintingAction, setMintingAction] = useState(null) // null | "gen" | "swap"
  const [generationPhase, setGenerationPhase] = useState(null)
  const [swapPhase, setSwapPhase] = useState(null)
  const [traitSwapLimitWarning, setTraitSwapLimitWarning] = useState("")
  const [genStatus, setGenStatus] = useState(null) // {status, progress, stage}
  const [progressError, setProgressError] = useState(null)
  const [championBuild, setChampionBuild] = useState(() => ({
    moves: DEFAULT_CHAMPION_BUILD.moves.map((move) => ({ ...move })),
    stats: { ...DEFAULT_CHAMPION_BUILD.stats },
    effectPoints: { ...DEFAULT_CHAMPION_BUILD.effectPoints },
  }))

  const [equippedBackgroundTrait, setEquippedBackgroundTrait] = useState(null)
  const [equippedWeaponTrait, setEquippedWeaponTrait] = useState(null)
  const [equippedMagicTrait, setEquippedMagicTrait] = useState(null)
  const [equippedHeadTrait, setEquippedHeadTrait] = useState(null)
  const [equippedArmourTrait, setEquippedArmourTrait] = useState(null)
  const [equippedExtraTrait, setEquippedExtraTrait] = useState(null)
  const [equippedSkinTrait, setEquippedSkinTrait] = useState(null)

  const [championName, setChampionName] = useState("")
  const [useRandomChampionName, setUseRandomChampionName] = useState(false)

  const previewRequestIdRef = useRef(0)
  const nextGenerationRunIdRef = useRef(0)
  const activeGenerationRunIdRef = useRef(null)
  const canceledGenerationRunIdsRef = useRef(new Set())
  const generationStartSnapshotRef = useRef(null)

  const traitSelectorRowStyle = {
    display: "flex",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 8,
  }

  const isGenerating =
    genStatus &&
    genStatus.status &&
    genStatus.status !== "completed" &&
    genStatus.status !== "error"

  const [activeChampionTab, setActiveChampionTab] = useState("generate")
  const hasGeneratedChampion = Boolean(charObject)

  useEffect(() => {
    if (hasGeneratedChampion && !isGenerating) {
      setActiveChampionTab("champion")
    } else {
      setActiveChampionTab("generate")
    }
  }, [hasGeneratedChampion, isGenerating, props.nftId])

  useEffect(() => {
    if (!activeAddress) {
      setWalletAssetIds(new Set())
      return undefined
    }

    let cancelled = false
    const indexerClient = new algosdk.Indexer("", "https://mainnet-idx.algonode.cloud", 443)

    async function loadWalletAssetIds() {
      try {
        const accountAssets = await indexerClient.lookupAccountAssets(activeAddress).do()
        if (!cancelled) setWalletAssetIds(getAccountAssetIdSet(accountAssets))
      } catch (error) {
        console.error("Unable to load wallet asset ids for trait swap estimate:", error)
        if (!cancelled) setWalletAssetIds(new Set())
      }
    }

    loadWalletAssetIds()

    return () => {
      cancelled = true
    }
  }, [activeAddress])

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

  const currentTraitChanges = {
    Background: BackgroundChange,
    Weapon: WeaponChange,
    Magic: MagicChange,
    Head: HeadChange,
    Armour: ArmourChange,
    Extra: ExtraChange,
  }
  const currentTraitAssetIds = {
    Background: BackgroundId,
    Weapon: WeaponId,
    Magic: MagicId,
    Head: HeadId,
    Armour: ArmourId,
    Extra: ExtraId,
  }
  const pendingTraitChanges = Object.values(currentTraitChanges).filter(
    (change) => change !== "None"
  )
  const pendingTraitChangeCount = pendingTraitChanges.length
  const hasPendingTraitChanges = pendingTraitChangeCount > 0
  const estimatedTraitSwapTxnCount = estimateTraitSwapTransactionGroupSize({
    changes: currentTraitChanges,
    currentAssetIds: currentTraitAssetIds,
    walletAssetIds,
    includeGenerationPayment: false,
    assumeMissingOldOptIn: true,
  })
  const estimatedGenerationTxnCount = estimateTraitSwapTransactionGroupSize({
    changes: currentTraitChanges,
    currentAssetIds: currentTraitAssetIds,
    walletAssetIds,
    includeGenerationPayment: true,
    assumeMissingOldOptIn: true,
  })
  const isTraitSwapGroupOverLimit =
    estimatedTraitSwapTxnCount > ALGORAND_TXN_GROUP_LIMIT
  const isGenerationGroupOverLimit =
    estimatedGenerationTxnCount > ALGORAND_TXN_GROUP_LIMIT

  const getGenerationBuildErrors = () => {
    const errors = []

    if (championBuild.moves.length !== 3) {
      errors.push("Select exactly 3 moves.")
    }

    championBuild.moves.forEach((move, index) => {
      if (!move.range || !move.class || !move.effect) {
        errors.push(`Move ${index + 1} needs a range, class, and effect.`)
      }

      const validEffectKeys = getEffectsForMoveClass(move.class).map((effect) => effect.key)
      if (move.effect && !validEffectKeys.includes(move.effect)) {
        errors.push(`Move ${index + 1} has an invalid effect for its move type.`)
      }
    })

    MOVE_CLASS_OPTIONS.forEach((option) => {
      if (Number(moveClassCounts[option.key] || 0) > 2) {
        errors.push(`You can only select 2 ${option.label.toLowerCase()} moves.`)
      }
    })

    MOVE_RANGE_OPTIONS.forEach((option) => {
      if (Number(moveRangeCounts[option.key] || 0) > 2) {
        errors.push(`You can only select 2 ${option.label.toLowerCase()} moves.`)
      }
    })

    const uniqueEffects = new Set(selectedMoveEffects)
    if (uniqueEffects.size !== selectedMoveEffects.length) {
      errors.push("Each selected move effect must be unique.")
    }

    if (statPointsUsed !== 10) {
      errors.push("Use exactly 10 stat points.")
    }

    STAT_POINT_OPTIONS.forEach((stat) => {
      if (Number(championBuild.stats?.[stat.key] || 0) > 8) {
        errors.push(`${stat.label} can only have 8 points max.`)
      }
    })

    if (effectPointsUsed !== 6) {
      errors.push("Use exactly 6 effect points.")
    }

    selectedMoveEffects.forEach((effectKey) => {
      if (Number(championBuild.effectPoints?.[effectKey] || 0) > 4) {
        errors.push(`${titleCase(effectKey)} can only have 4 effect points max.`)
      }
    })

    if (!useRandomChampionName && !championName.trim()) {
      errors.push("Enter a champion name or choose Random Name.")
    }

    if (isGenerationGroupOverLimit) {
      errors.push(
        `This build would create about ${estimatedGenerationTxnCount} transactions, over Algorand's ${ALGORAND_TXN_GROUP_LIMIT}-transaction group limit. Swap fewer traits before generating.`
      )
    }

    return errors
  }

  const generationBuildErrors = getGenerationBuildErrors()
  const isGenerationBuildReady = generationBuildErrors.length === 0
  const isTraitSwapAtLimit =
    pendingTraitChangeCount === MAX_TRAIT_SWAP_CHANGES
  const isTraitSwapOverLimit =
    pendingTraitChangeCount > MAX_TRAIT_SWAP_CHANGES || isTraitSwapGroupOverLimit
  const traitSwapLimitNotice =
    traitSwapLimitWarning ||
    (isTraitSwapGroupOverLimit
      ? `This swap would build about ${estimatedTraitSwapTxnCount} transactions. Algorand groups support ${ALGORAND_TXN_GROUP_LIMIT} max, so swap fewer full replacements first.`
      : pendingTraitChangeCount > MAX_TRAIT_SWAP_CHANGES
      ? `Trait Swap can only process ${MAX_TRAIT_SWAP_CHANGES} trait changes at once. Clear ${pendingTraitChangeCount - MAX_TRAIT_SWAP_CHANGES} trait ${pendingTraitChangeCount - MAX_TRAIT_SWAP_CHANGES === 1 ? "change" : "changes"} before swapping.`
      : isTraitSwapAtLimit
      ? `Maximum reached: swap these ${MAX_TRAIT_SWAP_CHANGES} traits first, then start another swap for any remaining traits.`
      : "")
  const hasTraitSwapLimitNotice = Boolean(traitSwapLimitNotice)
  const isTraitSwapLockedByGeneratedChampion = hasGeneratedChampion
  const isTraitSwapDisabled =
    !activeAddress ||
    !nft ||
    mintingAction !== null ||
    isPreviewUpdating ||
    isGenerating ||
    isTraitSwapLockedByGeneratedChampion ||
    isTraitSwapOverLimit ||
    !hasPendingTraitChanges
  const activeSwapPhaseLabel = SWAP_PHASE_LABELS[swapPhase] || "Starting Swap"
  const traitSwapButtonText =
    mintingAction === "swap"
      ? activeSwapPhaseLabel
      : isTraitSwapGroupOverLimit
      ? "Too Many Transactions"
      : isTraitSwapOverLimit
      ? "Too Many Traits"
      : isTraitSwapLockedByGeneratedChampion
      ? "Character Generated"
      : isGenerating
      ? "Generation Active"
      : !nft
      ? "Loading Champion"
      : isPreviewUpdating && hasPendingTraitChanges
      ? "Updating Preview"
      : hasPendingTraitChanges
      ? "Trait Swap"
      : "No Trait Changes"
  const traitSwapStatusText =
    mintingAction === "swap"
      ? `Swap: ${activeSwapPhaseLabel}`
      : mintingAction === "gen"
      ? "Generate in progress"
      : isTraitSwapLockedByGeneratedChampion
      ? "Character Generated"
      : isGenerating
      ? "Generation Active"
      : isTraitSwapGroupOverLimit
      ? `${estimatedTraitSwapTxnCount} of ${ALGORAND_TXN_GROUP_LIMIT} max transactions`
      : isTraitSwapOverLimit
      ? `${pendingTraitChangeCount} of ${MAX_TRAIT_SWAP_CHANGES} max trait changes`
      : isTraitSwapAtLimit
      ? `${MAX_TRAIT_SWAP_CHANGES} of ${MAX_TRAIT_SWAP_CHANGES} max trait changes`
      : hasPendingTraitChanges
      ? `${pendingTraitChangeCount} pending trait ${
          pendingTraitChangeCount === 1 ? "change" : "changes"
        }`
      : "No pending trait changes"
  const traitSwapHelperText =
    mintingAction === "swap"
      ? swapPhase === "sign"
        ? "Your wallet should prompt you to sign the trait swap transaction."
        : ["signed", "cosign", "sending", "saving", "refreshing"].includes(swapPhase)
        ? "Sending the signed trait swap transaction."
        : swapPhase === "metadata"
        ? "Preparing the updated trait metadata."
        : "Starting the trait swap transaction."
      : mintingAction === "gen" || isGenerating
      ? "Finish or cancel Generate Champion before swapping traits."
      : isTraitSwapLockedByGeneratedChampion
      ? GENERATED_CHAMPION_TRAIT_SWAP_LOCK_MESSAGE
      : traitSwapLimitNotice
      ? traitSwapLimitNotice
      : !activeAddress
      ? "Connect your wallet before swapping traits."
      : !nft
      ? "Loading champion data before trait swap is available."
      : hasPendingTraitChanges
      ? "Trait Swap updates this champion's equipped visual traits. Generate Champion is the separate Arena build step."
      : "Choose a different trait below to enable Trait Swap."
  const generationButtonText =
    mintingAction === "gen"
      ? GENERATION_PHASE_LABELS[generationPhase] || "Preparing..."
      : !isGenerationBuildReady
      ? "Complete Build"
      : "Generate 10,000"
  const canCancelGeneration =
    mintingAction === "gen" && GENERATION_CANCELABLE_PHASES.has(generationPhase)

  useEffect(() => {
    if (
      pendingTraitChangeCount <= MAX_TRAIT_SWAP_CHANGES &&
      !isTraitSwapGroupOverLimit &&
      traitSwapLimitWarning
    ) {
      setTraitSwapLimitWarning("")
    }
  }, [pendingTraitChangeCount, isTraitSwapGroupOverLimit, traitSwapLimitWarning])

  const restoreGenerationStartState = (message = "") => {
    const snapshot = generationStartSnapshotRef.current

    if (snapshot) {
      setShowProgress(snapshot.showProgress)
      setGenStatus(snapshot.genStatus)
      setProgressError(snapshot.progressError)
      setActiveChampionTab(snapshot.activeChampionTab)
    }

    setGenerationPhase(null)
    setMintingAction(null)
    props.setProgress(0)
    props.setMessage(message)
  }

  const setGenerationPhaseForRun = (runId, phase, message) => {
    if (activeGenerationRunIdRef.current !== runId) return
    if (canceledGenerationRunIdsRef.current.has(runId)) return

    setGenerationPhase(phase)
    if (message !== undefined) props.setMessage(message)
  }

  const assertGenerationNotCanceled = (runId) => {
    if (canceledGenerationRunIdsRef.current.has(runId)) {
      throw makeGenerationCanceledError()
    }
  }

  const cancelGeneration = () => {
    const runId = activeGenerationRunIdRef.current
    if (!runId) return

    canceledGenerationRunIdsRef.current.add(runId)
    restoreGenerationStartState("")
  }

  const buildChampionGenerationPayload = () => {
    const effectPointPayload = {}

    selectedMoveEffects.forEach((effectKey) => {
      effectPointPayload[effectKey] = Number(championBuild.effectPoints?.[effectKey] || 0)
    })

    return {
      championName: useRandomChampionName ? null : championName.trim(),
      randomName: useRandomChampionName,
      moves: championBuild.moves.map((move, index) => ({
        slot: index + 1,
        range: move.range,
        class: move.class,
        type: `${move.range} ${move.class}`,
        effect: move.effect,
        cooldown: 3,
      })),
      stats: {
        strength: Number(championBuild.stats.strength || 0),
        dexterity: Number(championBuild.stats.dexterity || 0),
        intelligence: Number(championBuild.stats.intelligence || 0),
      },
      effectPoints: effectPointPayload,
      totals: {
        statPointsUsed,
        effectPointsUsed,
      },
    }
  }

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
        title={renderTooltipContent(content)}
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
        <span style={{ display: "inline-flex", width: "100%" }}>{child}</span>
      </Tooltip>
    )
  }

  const renderChipButton = ({ active, disabled, onClick, children }) => (
    <Button
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
            −
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
            +
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
    <div style={{ ...DC_COMPONENT.card, marginTop: 18, marginBottom: 20 }}>
      <div style={DC_COMPONENT.panelOrnamentTop} />
      <div style={DC_COMPONENT.cardPad}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={DC_COMPONENT.kicker}>Council Allocation</div>
          <h2 style={DC_COMPONENT.panelTitle}>Champion Build</h2>
          <div
            style={{
              width: "min(340px, 78%)",
              height: 1,
              margin: "12px auto 0",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
            }}
          />
          <Typography
            variant="caption"
            style={{
              ...DC_COMPONENT.copy,
              display: "block",
              margin: "12px auto 0",
              maxWidth: 720,
              textAlign: "center",
            }}
          >
            Choose three moves, spend ten stat points, and bind six effect points to your selected powers.
          </Typography>
        </div>

        <div className="dc-move-selector-grid">
          {championBuild.moves.map((move, moveIndex) => {
            const effectOptions = getEffectsForMoveClass(move.class)
            const usedByOtherMoves = championBuild.moves
              .filter((_, index) => index !== moveIndex)
              .map((otherMove) => otherMove.effect)
              .filter(Boolean)

            return (
              <div
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
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))",
            gap: 14,
            marginTop: 16,
          }}
        >
          <div style={{ border: "1px solid rgba(255,255,255,0.14)", padding: 14, background: "rgba(0,0,0,0.38)" }}>
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
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.14)", padding: 14, background: "rgba(0,0,0,0.38)" }}>
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
          </div>
        </div>
      </div>
    </div>
  )

  // Helpers
  const longToByteArray = (long) => {
    var byteArray = [0, 0, 0, 0, 0, 0, 0, 0]
    for (var index = byteArray.length - 1; index > 0; index--) {
      var byte = long & 0xff
      byteArray[index] = byte
      long = (long - byte) / 256
    }
    return byteArray
  }

  const byteArrayToLong = (byteArray) => {
    var value = 0
    for (var i = 0; i < byteArray.length; i++) {
      value = value * 256 + byteArray[i]
    }
    return value
  }

    const renderTraitEffects = (trait) => {
    if (!trait || !Array.isArray(trait.effects) || trait.effects.length === 0) return null

    return (
      <div
        style={{
          marginTop: 6,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          width: 100,
        }}
      >
        {trait.effects.map((effect, effectIndex) => {
          const potency = Array.isArray(trait.effectMedians)
            ? trait.effectMedians[effectIndex]
            : null

          return (
            <div
              key={`${trait.assetId || trait.name}-${effectIndex}`}
              style={{
                fontSize: 10,
                color: "white",
                lineHeight: 1.2,
                textAlign: "center",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 0,
                padding: "4px 6px",
              }}
            >
              <div>{effect}</div>
              <div style={{ marginTop: 2, opacity: 0.85 }}>
                potency: {potency === null || potency === undefined ? "—" : potency}
              </div>
            </div>
          )
        })}
      </div>
    )
  }
  
  const renderOverviewSlot = ({
  label,
  type,
  currentImage,
  placeholderImage,
  selectedTrait,
  onClick,
  disabled = false,
}) => {
  const effects =
    selectedTrait && Array.isArray(selectedTrait.effects) ? selectedTrait.effects : []
  const effectMedians =
    selectedTrait && Array.isArray(selectedTrait.effectMedians)
      ? selectedTrait.effectMedians
      : []

  const hasEquippedItem = !!(selectedTrait && selectedTrait.name)
  const displayName = hasEquippedItem ? selectedTrait.name : label

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        marginRight: 12,
        marginBottom: 12,
        verticalAlign: "top",
      }}
    >
      <Button onClick={onClick} disabled={disabled}>
        <img
          style={{
            width: type === "Skin" || type === "Armour" ? 150 : 100,
            height: type === "Skin" || type === "Armour" ? 150 : 100,
            border: "1px solid rgba(255,255,255,0.30)",
            borderRadius: 0,
            background: "rgba(0,0,0,0.45)",
            padding: 10,
          }}
          src={currentImage || placeholderImage}
        />
      </Button>

      <div
        style={{
          marginTop: 6,
          color: "white",
          fontSize: 12,
          fontWeight: 700,
          textAlign: "center",
          maxWidth: type === "Skin" || type === "Armour" ? 150 : 100,
          lineHeight: 1.2,
        }}
      >
        {displayName}
      </div>

      {effects.length > 0 ? (
        <div
          style={{
            marginTop: 6,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            width: type === "Skin" || type === "Armour" ? 150 : 100,
          }}
        >
          {effects.map((effect, effectIndex) => (
            <div
              key={`${label}-${effectIndex}`}
              style={{
                fontSize: 10,
                color: "white",
                lineHeight: 1.2,
                textAlign: "center",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 0,
                padding: "4px 6px",
              }}
            >
              <div>{effect}</div>
              <div style={{ marginTop: 2, opacity: 0.85 }}>
                potency:{" "}
                {effectMedians[effectIndex] === null ||
                effectMedians[effectIndex] === undefined
                  ? "—"
                  : effectMedians[effectIndex]}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
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
}

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
}

const emptyGainedEffects = () => ({
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
  battleOnly: [],
})

const getEffectAmount = (trait, effectIndex) => {
  const raw = trait?.effectMedians?.[effectIndex]
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0
}

const normalizeTraitEffectText = (value) =>
  String(value || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .trim()

const pushBattleOnly = (target, entry) => {
  target.battleOnly.push(entry)
}

const applyTraitTextToGainedEffects = (target, effectText, amount, sourceName) => {
  const text = normalizeTraitEffectText(effectText)
  if (!text || !amount) return

  let match

  match = text.match(/^Increases (.+)$/i)
  if (match) {
    const name = match[1].trim()

    if (STAT_KEY_ALIASES[name]) {
      target.stats[STAT_KEY_ALIASES[name]] += amount
      return
    }
    if (EFFECT_KEY_ALIASES[name]) {
      target.effects[EFFECT_KEY_ALIASES[name]] += amount
      return
    }

    match = name.match(/^accuracy of (melee|ranged|magic|curse) type moves$/i)
    if (match) {
      target.moveAccuracy[match[1].toLowerCase()] += amount
      return
    }
  }

  match = text.match(/^Decreases (.+)$/i)
  if (match) {
    const name = match[1].trim()
    if (STAT_KEY_ALIASES[name]) {
      target.stats[STAT_KEY_ALIASES[name]] -= amount
      return
    }
    if (EFFECT_KEY_ALIASES[name]) {
      target.effects[EFFECT_KEY_ALIASES[name]] -= amount
      return
    }

    match = name.match(/^accuracy of (melee|ranged|magic|curse) type moves$/i)
    if (match) {
      target.moveAccuracy[match[1].toLowerCase()] -= amount
      return
    }
  }

  match = text.match(/^Resistance to (.+)$/i)
  if (match) {
    const resisted = match[1].trim()
    pushBattleOnly(target, {
      type: "resistance",
      label: text,
      sourceName,
      resistedEffect: EFFECT_KEY_ALIASES[resisted] || resisted.toLowerCase(),
      amount,
    })
    return
  }

  match = text.match(/^Gain (.+) at (?:the )?start of (?:the )?battle$/i)
  if (match) {
    const gained = match[1].trim()
    pushBattleOnly(target, {
      type: "gain_start_of_battle",
      label: text,
      sourceName,
      effectKey: EFFECT_KEY_ALIASES[gained] || gained.toLowerCase(),
      amount,
    })
    return
  }

  match = text.match(/^Apply (.+) at (?:the )?start of (?:the )?battle$/i)
  if (match) {
    const applied = match[1].trim()
    pushBattleOnly(target, {
      type: "apply_start_of_battle",
      label: text,
      sourceName,
      effectKey: EFFECT_KEY_ALIASES[applied] || applied.toLowerCase(),
      amount,
    })
    return
  }

  match = text.match(/^Gain (.+) (?:on|every) (melee|ranged|magic) hit$/i)
  if (match) {
    const gained = match[1].trim()
    pushBattleOnly(target, {
      type: "gain_on_hit",
      label: text,
      sourceName,
      attackType: match[2].toLowerCase(),
      effectKey: EFFECT_KEY_ALIASES[gained] || gained.toLowerCase(),
      amount,
    })
    return
  }

  match = text.match(/^Apply (.+) (?:on|every) (melee|ranged|magic) hit$/i)
  if (match) {
    const applied = match[1].trim()
    pushBattleOnly(target, {
      type: "apply_on_hit",
      label: text,
      sourceName,
      attackType: match[2].toLowerCase(),
      effectKey: EFFECT_KEY_ALIASES[applied] || applied.toLowerCase(),
      amount,
    })
    return
  }

  match = text.match(/^Heal for (?:the )?amount of (.+?) stacks applied$/i)
  if (match) {
    const healedFrom = match[1].trim()
    const sourceEffectKey = EFFECT_KEY_ALIASES[healedFrom] || healedFrom.toLowerCase()
    pushBattleOnly(target, {
      type: "heal_for_applied_stacks",
      label: text,
      sourceName,
      sourceEffectKey,
      effectKey: sourceEffectKey,
      amount,
    })
    return
  }

  match = text.match(/^Heal when (.+?) stacks are applied$/i)
  if (match) {
    const healedFrom = match[1].trim()
    const sourceEffectKey = EFFECT_KEY_ALIASES[healedFrom] || healedFrom.toLowerCase()
    pushBattleOnly(target, {
      type: "heal_when_stacks_applied",
      label: text,
      sourceName,
      sourceEffectKey,
      effectKey: sourceEffectKey,
      amount,
    })
    return
  }

  pushBattleOnly(target, {
    type: "other",
    label: text,
    sourceName,
    amount,
  })
}

const buildGainedEffectsFromTraits = (traits) => {
  const out = emptyGainedEffects()

  ;(Array.isArray(traits) ? traits : []).forEach((trait) => {
    if (!trait || !Array.isArray(trait.effects)) return

    trait.effects.forEach((effectText, effectIndex) => {
      const amount = getEffectAmount(trait, effectIndex)
      applyTraitTextToGainedEffects(out, effectText, amount, trait.name)
    })
  })

  return out
}

  async function fetchCharFromFirestore(assetId) {
    try {
      const generatedChampion = await readGeneratedChampionObject(assetId)
      if (generatedChampion) {
        setCharObject(generatedChampion)
      }
    } catch (err) {
      console.error("Error fetching charObj from Firestore:", err)
    }
  }

  const fetchData = async () => {
    
    setCharObject(null)
    setDisplayRoll("loading...")

    let response = await fetch("/api/getNft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: safeJsonStringify({
        nftId: props.nftId,
      }),
    })

    let session = await response.json()

    const addr = algosdk.decodeAddress(session.nft.assets[0].params.reserve)
    const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)
    const ocid = CID.create(0, 0x70, mhdigest)

    setNft(session.nft.assets[0].params)
    setNftUrl("https://ipfs.dark-coin.io/ipfs/" + ocid.toString())

    if (session.charObject !== "none") {
      setCharObject(session.charObject.charObj)
    }

    // Also pull char from Firestore if it exists
    await fetchCharFromFirestore(props.nftId)

    if (props.zoom) {
      const client = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443)
      let char = JSON.parse(session.charStats)
      setChar(char)

      let BackgroundId = 0
      let SkinId = 0
      let WeaponId = 0
      let MagicId = 0
      let HeadId = 0
      let ArmourId = 0
      let ExtraId = 0

      let BackgroundBox = await client
        .getApplicationBoxByName(
          props.contracts.swapper,
          new Uint8Array([...longToByteArray(props.nftId), new Uint8Array(Buffer.from("B"))])
        )
        .do()
      BackgroundId = byteArrayToLong(BackgroundBox.value)

      let WeaponBox = await client
        .getApplicationBoxByName(
          props.contracts.swapper,
          new Uint8Array([...longToByteArray(props.nftId), new Uint8Array(Buffer.from("W"))])
        )
        .do()
      WeaponId = byteArrayToLong(WeaponBox.value)

      let MagicBox = await client
        .getApplicationBoxByName(
          props.contracts.swapper,
          new Uint8Array([...longToByteArray(props.nftId), new Uint8Array(Buffer.from("M"))])
        )
        .do()
      MagicId = byteArrayToLong(MagicBox.value)

      let HeadBox = await client
        .getApplicationBoxByName(
          props.contracts.swapper,
          new Uint8Array([...longToByteArray(props.nftId), new Uint8Array(Buffer.from("H"))])
        )
        .do()
      HeadId = byteArrayToLong(HeadBox.value)

      let ArmourBox = await client
        .getApplicationBoxByName(
          props.contracts.swapper,
          new Uint8Array([...longToByteArray(props.nftId), new Uint8Array(Buffer.from("A"))])
        )
        .do()
      ArmourId = byteArrayToLong(ArmourBox.value)

      let ExtraBox = await client
        .getApplicationBoxByName(
          props.contracts.swapper,
          new Uint8Array([...longToByteArray(props.nftId), new Uint8Array(Buffer.from("E"))])
        )
        .do()
      ExtraId = byteArrayToLong(ExtraBox.value)

      let Background = "None"
      let Skin = char.properties.Skin
      let Weapon = "None"
      let Magic = "None"
      let Head = "None"
      let Armour = "None"
      let Extra = "None"

      props.traits.forEach((trait) => {
        if (trait.assetId == BackgroundId) Background = trait.name
        else if (trait.assetId == WeaponId) Weapon = trait.name
        else if (trait.assetId == MagicId) Magic = trait.name
        else if (trait.assetId == HeadId) Head = trait.name
        else if (trait.assetId == ArmourId) Armour = trait.name
        else if (trait.assetId == ExtraId) Extra = trait.name
      })

      const extraUrl = Extra != "None" ? await getTraitImageUrl("Extra", Extra) : "None"
      const armourUrl = Armour != "None" ? await getTraitImageUrl("Armour", Armour) : "None"
      const magicUrl = Magic != "None" ? await getTraitImageUrl("Magic", Magic) : "None"
      const weaponUrl = Weapon != "None" ? await getTraitImageUrl("Weapon", Weapon) : "None"
      const headUrl = Head != "None" ? await getTraitImageUrl("Head", Head) : "None"
      const skinUrl = Skin != "None" ? await getTraitImageUrl("Skin", Skin) : "None"
      const backgroundUrl =
        Background != "None" ? await getTraitImageUrl("Background", Background) : "None"

      setBackground(backgroundUrl)
      setSkin(skinUrl)
      setWeapon(weaponUrl)
      setMagic(magicUrl)
      setHead(headUrl)
      setArmour(armourUrl)
      setExtra(extraUrl)

      const buildEquippedTraitFromAsset = async (assetId, type, name, url) => {
      if (!assetId || assetId === 0 || !name || name === "None" || !url || url === "None") {
        return null
      }

      const effects = TRAIT_EFFECTS[Number(assetId)] || []
      const effectMedians = await readTraitEffectMedians(client, name, effects.length)

      return {
        assetId,
        name,
        type,
        url,
        effects,
        effectMedians,
      }
    }

    const buildEquippedSkinTrait = async (skinName, url) => {
    if (!skinName || skinName === "None" || !url || url === "None") {
      return null
    }

    const effects = SKIN_EFFECTS[String(skinName)] || []
    const effectMedians = await readTraitEffectMedians(client, skinName, effects.length)

    return {
      assetId: null,
      name: skinName,
      type: "Skin",
      url,
      effects,
      effectMedians,
    }
  }

    const equippedBackground = await buildEquippedTraitFromAsset(
      BackgroundId,
      "Background",
      Background,
      backgroundUrl
    )

    const equippedWeapon = await buildEquippedTraitFromAsset(
      WeaponId,
      "Weapon",
      Weapon,
      weaponUrl
    )

    const equippedMagic = await buildEquippedTraitFromAsset(
      MagicId,
      "Magic",
      Magic,
      magicUrl
    )

    const equippedHead = await buildEquippedTraitFromAsset(
      HeadId,
      "Head",
      Head,
      headUrl
    )

    const equippedArmour = await buildEquippedTraitFromAsset(
      ArmourId,
      "Armour",
      Armour,
      armourUrl
    )

    const equippedExtra = await buildEquippedTraitFromAsset(
      ExtraId,
      "Extra",
      Extra,
      extraUrl
    )

    const equippedSkin = await buildEquippedSkinTrait(Skin, skinUrl)

    setEquippedBackgroundTrait(equippedBackground)
    setEquippedWeaponTrait(equippedWeapon)
    setEquippedMagicTrait(equippedMagic)
    setEquippedHeadTrait(equippedHead)
    setEquippedArmourTrait(equippedArmour)
    setEquippedExtraTrait(equippedExtra)
    setEquippedSkinTrait(equippedSkin)

      setBackgroundChange("None")
      setWeaponChange("None")
      setMagicChange("None")
      setHeadChange("None")
      setArmourChange("None")
      setExtraChange("None")

      setBackgroundId(BackgroundId)
      setWeaponId(WeaponId)
      setMagicId(MagicId)
      setHeadId(HeadId)
      setArmourId(ArmourId)
      setExtraId(ExtraId)

      let backgrounds = []
      let weapons = []
      let magics = []
      let heads = []
      let armours = []
      let extras = []

      const buildTraitWithEffects = async (trait, url) => {
      const effects = TRAIT_EFFECTS[Number(trait.assetId)] || []
      const effectMedians = isSelectableTrait(trait)
        ? await readTraitEffectMedians(client, trait.name, effects.length)
        : Array(effects.length).fill(null)

      return {
        assetId: trait.assetId,
        name: trait.name,
        type: trait.type,
        url,
        owned: trait.owned !== false,
        effects,
        effectMedians,
      }
    }

      const equippedAssetIds = new Set(
        [BackgroundId, WeaponId, MagicId, HeadId, ArmourId, ExtraId]
          .map(Number)
          .filter((assetId) => assetId > 0)
      )

      const buckets = {
        Background: backgrounds,
        Weapon: weapons,
        Magic: magics,
        Head: heads,
        Armour: armours,
        Extra: extras,
      }

      const traitCatalog = Array.isArray(props.ownTraits) ? props.ownTraits : []
      const enrichedTraits = await Promise.all(
        traitCatalog.map(async (trait) => {
          if (!trait || !trait.assetId || !buckets[trait.type]) return null
          if (trait.owned === false) return null
          if (equippedAssetIds.has(Number(trait.assetId))) return null

          const url = await getTraitImageUrl(trait.type, trait.name)
          return buildTraitWithEffects(trait, url)
        })
      )

      enrichedTraits.filter(Boolean).forEach((trait) => {
        buckets[trait.type].push(trait)
      })

      setOwnedBackgrounds(backgrounds)
      setOwnedWeapons(weapons)
      setOwnedMagics(magics)
      setOwnedHeads(heads)
      setOwnedArmours(armours)
      setOwnedExtras(extras)
    }
  }

  // Initial NFT + char load
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Real-time listener: drive genStatus + charObject from Firestore
  useEffect(() => {
    if (!props.nftId) return

    setProgressError(null)

    const unsubscribe = subscribeToCharProgress(
      props.nftId,
      ({ progress, stage, status, charObj }) => {
        const numericProgress =
          typeof progress === "number" && progress >= 0 && progress <= 100 ? progress : 0

        setGenStatus({
          status: status || null,
          progress: numericProgress,
          stage: stage || null,
        })

        // If we see an active status from Firestore, show the progress panel
        if (status && status !== "completed" && status !== "error") {
          setShowProgress(true)
        }

        // When Firestore has the final char, update local charObject
        if (charObj && status === "completed") {
          setCharObject(charObj)
        }
      },
      (err) => {
        setProgressError(err.message || "Failed to load progress.")
      }
    )

    return () => unsubscribe()
  }, [props.nftId])

  const deleteChar = async (nftId) => {
    const client = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443)

    let params = await client.getTransactionParams().do()
    let txns = []

    const appArgs = [new Uint8Array(Buffer.from("deleteCharacter"))]
    const accounts = []
    const foreignApps = []
    const foreignAssets = [nftId]

    let assetInt = longToByteArray(nftId)
    let assetBox = new Uint8Array(assetInt)
    let assetBoxCurrent = new Uint8Array([...assetInt, ...new Uint8Array(Buffer.from("current"))])

    const boxes = [
      { appIndex: 0, name: assetBox },
      { appIndex: 0, name: assetBox },
      { appIndex: 0, name: assetBoxCurrent },
      { appIndex: 0, name: assetBoxCurrent },
    ]

    props.setMessage("Sign Transaction...")

    let txn = algosdk.makeApplicationNoOpTxnFromObject({
      sender: activeAddress,
      suggestedParams: params,
      appIndex: props.contracts.dragonshorde,
      appArgs,
      accounts,
      foreignApps,
      foreignAssets,
      boxes,
      note: undefined,
      lease: undefined,
      rekeyTo: undefined,
    })

    txns.push(txn)
    algosdk.assignGroupID(txns)

    let encodedTxns = []
    txns.forEach((txn) => {
      let encoded = algosdk.encodeUnsignedTransaction(txn)
      encodedTxns.push(encoded)
    })

    const signedTransactions = await signTransactions(encodedTxns)

    props.setMessage("Sending Transaction...")
    const { txid } = await client.sendRawTransaction(signedTransactions).do()
    let confirmedTxn = await algosdk.waitForConfirmation(client, txid, 4)
    console.log(confirmedTxn)

    let responseDelete = await fetch("/api/arena/deleteChar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: safeJsonStringify({
        txnId: txid,
        champId: props.nftId,
      }),
    })

    let sessionDelete = await responseDelete.json()
    console.log(sessionDelete)

    props.setMessage("Transaction Confirmed, character deleted")
    await fetchData()
  }

  const changeImg = async (action, type) => {
    const requestId = previewRequestIdRef.current + 1
    previewRequestIdRef.current = requestId

    setIsPreviewUpdating(true)
    props.setMessage("Updating champion image...")

    try {
      let B = BackgroundChange != "None" ? BackgroundChange.url : Background
      let W = WeaponChange != "None" ? WeaponChange.url : Weapon
      let M = MagicChange != "None" ? MagicChange.url : Magic
      let H = HeadChange != "None" ? HeadChange.url : Head
      let A = ArmourChange != "None" ? ArmourChange.url : Armour
      let E = ExtraChange != "None" ? ExtraChange.url : Extra

      if (WeaponChange == "Remove") W = "None"
      if (MagicChange == "Remove") M = "None"
      if (ArmourChange == "Remove") A = "None"
      if (ExtraChange == "Remove") E = "None"

      if (action == "Remove") {
        if (type == "Weapon") W = "None"
        if (type == "Magic") M = "None"
        if (type == "Armour") A = "None"
        if (type == "Extra") E = "None"
      } else if (action == "None") {
        if (type == "Background") B = "None"
        if (type == "Weapon") W = "None"
        if (type == "Magic") M = "None"
        if (type == "Head") H = "None"
        if (type == "Armour") A = "None"
        if (type == "Extra") E = "None"
      } else {
        if (type == "Background") B = action.url
        if (type == "Weapon") W = action.url
        if (type == "Magic") M = action.url
        if (type == "Head") H = action.url
        if (type == "Armour") A = action.url
        if (type == "Extra") E = action.url
      }

      let response = await fetch("/api/changeImg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: safeJsonStringify({
          Background: B,
          Skin: Skin,
          Weapon: W,
          Magic: M,
          Head: H,
          Armour: A,
          Extra: E,
        }),
      })

      let session = await response.json()

      if (previewRequestIdRef.current === requestId) {
        props.setMessage("")
        setNewImage(session.image)
      }
    } catch (error) {
      if (previewRequestIdRef.current === requestId) {
        props.setMessage(String(error))
      }
    } finally {
      if (previewRequestIdRef.current === requestId) {
        setIsPreviewUpdating(false)
      }
    }
  }

  const applyTraitSelection = (type, nextChange, setChange, previewAction = nextChange) => {
    const currentChanges = {
      Background: BackgroundChange,
      Weapon: WeaponChange,
      Magic: MagicChange,
      Head: HeadChange,
      Armour: ArmourChange,
      Extra: ExtraChange,
    }
    const nextChanges = {
      ...currentChanges,
      [type]: nextChange,
    }
    const nextCount = Object.values(nextChanges).filter((change) => change !== "None").length

    if (nextCount > MAX_TRAIT_SWAP_CHANGES) {
      const message = `Trait Swap can only process ${MAX_TRAIT_SWAP_CHANGES} trait changes at once. Swap your current ${MAX_TRAIT_SWAP_CHANGES} changes first, then start another swap for the rest.`
      setTraitSwapLimitWarning(message)
      props.setMessage(message)
      return
    }

    const nextTxnCount = estimateTraitSwapTransactionGroupSize({
      changes: nextChanges,
      currentAssetIds: currentTraitAssetIds,
      walletAssetIds,
      includeGenerationPayment: false,
      assumeMissingOldOptIn: true,
    })

    if (nextTxnCount > ALGORAND_TXN_GROUP_LIMIT) {
      const message = `That selection would build about ${nextTxnCount} transactions. Algorand groups support ${ALGORAND_TXN_GROUP_LIMIT} max, so swap fewer full trait replacements first.`
      setTraitSwapLimitWarning(message)
      props.setMessage(message)
      return
    }

    setTraitSwapLimitWarning("")
    setChange(nextChange)
    setCat(null)
    changeImg(previewAction, type)
  }

  const mint = async (genChar) => {
    let generationRunId = null
    let signedTransactionsReceived = false

    try {
      if (!genChar) {
        if (pendingTraitChangeCount > MAX_TRAIT_SWAP_CHANGES) {
          const message = `Trait Swap can only process ${MAX_TRAIT_SWAP_CHANGES} trait changes at once. Clear ${pendingTraitChangeCount - MAX_TRAIT_SWAP_CHANGES} trait ${pendingTraitChangeCount - MAX_TRAIT_SWAP_CHANGES === 1 ? "change" : "changes"} before swapping.`
          setTraitSwapLimitWarning(message)
          props.setMessage(message)
          return
        }

        if (hasGeneratedChampion) {
          props.setMessage(GENERATED_CHAMPION_TRAIT_SWAP_LOCK_MESSAGE)
          return
        }

        let generatedChampion = null
        try {
          generatedChampion = await readGeneratedChampionObject(props.nftId)
        } catch (error) {
          console.error("Unable to verify generated champion before trait swap:", error)
          props.setMessage("Unable to verify champion generation status. Trait Swap was not started.")
          return
        }

        if (generatedChampion) {
          setCharObject(generatedChampion)
          props.setMessage(GENERATED_CHAMPION_TRAIT_SWAP_LOCK_MESSAGE)
          return
        }
      }

      if (genChar) {
        generationRunId = nextGenerationRunIdRef.current + 1
        nextGenerationRunIdRef.current = generationRunId
        activeGenerationRunIdRef.current = generationRunId
        canceledGenerationRunIdsRef.current.delete(generationRunId)
        generationStartSnapshotRef.current = {
          showProgress,
          genStatus,
          progressError,
          activeChampionTab,
        }
      }

      // Track action so SWAP doesn't force the ROLL button to show "Preparing..."
      setMintingAction(genChar ? "gen" : "swap")
      setSwapPhase(genChar ? null : "checking")

      if (genChar && !isGenerationBuildReady) {
        props.setMessage(generationBuildErrors[0] || "Complete your champion build before generating.")
        setMintingAction(null)
        setSwapPhase(null)
        return
      }

      if (genChar) {
        setGenerationPhaseForRun(generationRunId, "checking", "Checking champion build...")
      } else {
        props.setMessage("Starting swap...")
      }

      props.setProgress(0)

      let newMetadata = Object.assign({}, char)

      // Keep the asset-config transaction note small. User generation selections
      // are stored in Firebase via queuedChars instead of being embedded on-chain.

      const client = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443)
      const indexerClient = new algosdk.Indexer("", "https://mainnet-idx.algonode.cloud", 443)

      if (genChar) {
        assertGenerationNotCanceled(generationRunId)
        setGenerationPhaseForRun(generationRunId, "network", "Getting network parameters...")
      } else {
        setSwapPhase("network")
        props.setMessage("Starting swap...")
      }
      let params = await client.getTransactionParams().do()
      if (genChar) {
        assertGenerationNotCanceled(generationRunId)
        setGenerationPhaseForRun(generationRunId, "wallet", "Checking wallet assets...")
      } else {
        setSwapPhase("wallet")
        props.setMessage("Starting swap...")
      }
      const accountAssets = await indexerClient.lookupAccountAssets(activeAddress).do()
      const exactWalletAssetIds = getAccountAssetIdSet(accountAssets)
      setWalletAssetIds(exactWalletAssetIds)

      const exactTransactionGroupSize = estimateTraitSwapTransactionGroupSize({
        changes: currentTraitChanges,
        currentAssetIds: currentTraitAssetIds,
        walletAssetIds: exactWalletAssetIds,
        includeGenerationPayment: genChar,
        assumeMissingOldOptIn: false,
      })

      if (exactTransactionGroupSize > ALGORAND_TXN_GROUP_LIMIT) {
        const message = `This ${genChar ? "generate" : "trait swap"} would build ${exactTransactionGroupSize} transactions, but Algorand groups allow ${ALGORAND_TXN_GROUP_LIMIT} max. Swap fewer traits first.`
        setTraitSwapLimitWarning(message)
        props.setMessage(message)
        return
      }

      if (genChar) {
        assertGenerationNotCanceled(generationRunId)
        setGenerationPhaseForRun(generationRunId, "transactions", "Building transactions...")
      } else {
        setSwapPhase("transactions")
        props.setMessage("Starting swap...")
      }

      let found
      let otxn
      let stxn

      let newBackgroundId = 0
      let newWeaponId = 0
      let newMagicId = 0
      let newHeadId = 0
      let newArmourId = 0
      let newExtraId = 0

      let txns = []
      let signingIndex = []
      let generationPaymentTxnId = null
      let generationAssetConfigTxnId = null

      let appArgs = []
      let accounts = []
      let foreignApps = []
      let foreignAssets = []
      let boxes = []

      let intBox
      let Box

      if (BackgroundChange != "None" && BackgroundChange != "Remove") {
        newMetadata.properties.Background = BackgroundChange.name
        newBackgroundId = BackgroundChange.assetId
      }
      if (WeaponChange != "None" && WeaponChange != "Remove") {
        newMetadata.properties.Weapon = WeaponChange.name
        newWeaponId = WeaponChange.assetId
      } else if (WeaponChange == "Remove") {
        newMetadata.properties.Weapon = "None"
      }
      if (MagicChange != "None" && MagicChange != "Remove") {
        newMetadata.properties.Magic = MagicChange.name
        newMagicId = MagicChange.assetId
      } else if (MagicChange == "Remove") {
        newMetadata.properties.Magic = "None"
      }
      if (HeadChange != "None" && HeadChange != "Remove") {
        newMetadata.properties.Head = HeadChange.name
        newHeadId = HeadChange.assetId
      }
      if (ArmourChange != "None" && ArmourChange != "Remove") {
        newMetadata.properties.Armour = ArmourChange.name
        newArmourId = ArmourChange.assetId
      } else if (ArmourChange == "Remove") {
        newMetadata.properties.Armour = "None"
      }
      if (ExtraChange != "None" && ExtraChange != "Remove") {
        newMetadata.properties.Extra = ExtraChange.name
        newExtraId = ExtraChange.assetId
      } else if (ExtraChange == "Remove") {
        newMetadata.properties.Extra = "None"
      }

      // Pay 10,000 DARK if generating a new character
      if (genChar) {
        let ftxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: activeAddress,
          receiver: "VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM",
          amount: 10000000000,
          assetIndex: 1088771340,
          suggestedParams: params,
        })

        // Do not read ftxn.txID() here. assignGroupID(txns) mutates the txn bytes,
        // and in algosdk 3.5.2 the txid must be read after the group id is assigned.
        txns.push(ftxn)
        signingIndex.push(signingIndex.length)
      }

      if (newBackgroundId != 0) {
        if (BackgroundId != 0) {
          found = false
          accountAssets.assets.forEach((asset) => {
            if (asset["asset-id"] == BackgroundId) found = true
          })

          if (!found) {
            otxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: activeAddress,
              receiver: activeAddress,
              amount: 0,
              assetIndex: Number(BackgroundId),
              suggestedParams: params,
            })

            txns.push(otxn)
            signingIndex.push(signingIndex.length)
          }

          appArgs = [new Uint8Array(Buffer.from("unequip")), new Uint8Array(Buffer.from("B"))]
          accounts = [activeAddress]
          foreignApps = []
          foreignAssets = [BackgroundId, props.nftId]

          intBox = longToByteArray(props.nftId)
          Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("B"))])
          boxes = [{ appIndex: 0, name: Box }]

          let btxn = algosdk.makeApplicationNoOpTxnFromObject({
            sender: activeAddress,
            suggestedParams: params,
            appIndex: props.contracts.swapper,
            appArgs: appArgs,
            accounts: accounts,
            foreignApps: foreignApps,
            foreignAssets: foreignAssets,
            note: undefined,
            lease: undefined,
            rekeyTo: undefined,
            boxes: boxes,
          })
          txns.push(btxn)
          signingIndex.push(signingIndex.length)
        }

        if (newBackgroundId != 0) {
          stxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: "BL6V7XEKWJ3WJDPXNTTD2D5HBFF4GUNXXDVPIUSMK662LYZQQBN5BDEXGQ",
            closeRemainderTo: undefined,
            revocationTarget: undefined,
            amount: 1,
            note: undefined,
            assetIndex: Number(newBackgroundId),
            suggestedParams: params,
          })

          txns.push(stxn)
          signingIndex.push(signingIndex.length)

          appArgs = [new Uint8Array(Buffer.from("equip")), new Uint8Array(Buffer.from("B"))]
          accounts = []
          foreignApps = []
          foreignAssets = [newBackgroundId, props.nftId]

          intBox = longToByteArray(props.nftId)
          Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("B"))])
          boxes = [{ appIndex: 0, name: Box }]

          let betxn = algosdk.makeApplicationNoOpTxnFromObject({
            sender: activeAddress,
            suggestedParams: params,
            appIndex: props.contracts.swapper,
            appArgs: appArgs,
            accounts: accounts,
            foreignApps: foreignApps,
            foreignAssets: foreignAssets,
            note: undefined,
            lease: undefined,
            rekeyTo: undefined,
            boxes: boxes,
          })

          txns.push(betxn)
          signingIndex.push(signingIndex.length)
        }
      }

      if (newWeaponId != 0 || WeaponChange == "Remove") {
        if (WeaponId != 0) {
          found = false
          accountAssets.assets.forEach((asset) => {
            if (asset["asset-id"] == WeaponId) found = true
          })

          if (!found) {
            otxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: activeAddress,
              receiver: activeAddress,
              closeRemainderTo: undefined,
              revocationTarget: undefined,
              amount: 0,
              note: undefined,
              assetIndex: Number(WeaponId),
              suggestedParams: params,
            })

            txns.push(otxn)
            signingIndex.push(signingIndex.length)
          }

          appArgs = [new Uint8Array(Buffer.from("unequip")), new Uint8Array(Buffer.from("W"))]
          accounts = [activeAddress]
          foreignApps = []
          foreignAssets = [WeaponId, props.nftId]

          intBox = longToByteArray(props.nftId)
          Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("W"))])
          boxes = [{ appIndex: 0, name: Box }]

          let wtxn = algosdk.makeApplicationNoOpTxnFromObject({
            sender: activeAddress,
            suggestedParams: params,
            appIndex: props.contracts.swapper,
            appArgs: appArgs,
            accounts: accounts,
            foreignApps: foreignApps,
            foreignAssets: foreignAssets,
            note: undefined,
            lease: undefined,
            rekeyTo: undefined,
            boxes: boxes,
          })

          txns.push(wtxn)
          signingIndex.push(signingIndex.length)
        }

        if (newWeaponId != 0) {
          stxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: "BL6V7XEKWJ3WJDPXNTTD2D5HBFF4GUNXXDVPIUSMK662LYZQQBN5BDEXGQ",
            closeRemainderTo: undefined,
            revocationTarget: undefined,
            amount: 1,
            note: undefined,
            assetIndex: Number(newWeaponId),
            suggestedParams: params,
          })

          txns.push(stxn)
          signingIndex.push(signingIndex.length)

          appArgs = [new Uint8Array(Buffer.from("equip")), new Uint8Array(Buffer.from("W"))]
          accounts = []
          foreignApps = []
          foreignAssets = [newWeaponId, props.nftId]

          intBox = longToByteArray(props.nftId)
          Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("W"))])
          boxes = [{ appIndex: 0, name: Box }]

          let wetxn = algosdk.makeApplicationNoOpTxnFromObject({
            sender: activeAddress,
            suggestedParams: params,
            appIndex: props.contracts.swapper,
            appArgs: appArgs,
            accounts: accounts,
            foreignApps: foreignApps,
            foreignAssets: foreignAssets,
            note: undefined,
            lease: undefined,
            rekeyTo: undefined,
            boxes: boxes,
          })

          txns.push(wetxn)
          signingIndex.push(signingIndex.length)
        }
      }

      if (newMagicId != 0 || MagicChange == "Remove") {
        if (MagicId != 0) {
          found = false
          accountAssets.assets.forEach((asset) => {
            if (asset["asset-id"] == MagicId) found = true
          })

          if (!found) {
            otxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: activeAddress,
              receiver: activeAddress,
              closeRemainderTo: undefined,
              revocationTarget: undefined,
              amount: 0,
              note: undefined,
              assetIndex: Number(MagicId),
              suggestedParams: params,
            })

            txns.push(otxn)
            signingIndex.push(signingIndex.length)
          }

          appArgs = [new Uint8Array(Buffer.from("unequip")), new Uint8Array(Buffer.from("M"))]
          accounts = [activeAddress]
          foreignApps = []
          foreignAssets = [MagicId, props.nftId]

          intBox = longToByteArray(props.nftId)
          Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("M"))])
          boxes = [{ appIndex: 0, name: Box }]

          let mtxn = algosdk.makeApplicationNoOpTxnFromObject({
            sender: activeAddress,
            suggestedParams: params,
            appIndex: props.contracts.swapper,
            appArgs: appArgs,
            accounts: accounts,
            foreignApps: foreignApps,
            foreignAssets: foreignAssets,
            note: undefined,
            lease: undefined,
            rekeyTo: undefined,
            boxes: boxes,
          })

          txns.push(mtxn)
          signingIndex.push(signingIndex.length)
        }

        if (newMagicId != 0) {
          stxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: "BL6V7XEKWJ3WJDPXNTTD2D5HBFF4GUNXXDVPIUSMK662LYZQQBN5BDEXGQ",
            closeRemainderTo: undefined,
            revocationTarget: undefined,
            amount: 1,
            note: undefined,
            assetIndex: Number(newMagicId),
            suggestedParams: params,
          })

          txns.push(stxn)
          signingIndex.push(signingIndex.length)

          appArgs = [new Uint8Array(Buffer.from("equip")), new Uint8Array(Buffer.from("M"))]
          accounts = []
          foreignApps = []
          foreignAssets = [newMagicId, props.nftId]

          intBox = longToByteArray(props.nftId)
          Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("M"))])
          boxes = [{ appIndex: 0, name: Box }]

          let metxn = algosdk.makeApplicationNoOpTxnFromObject({
            sender: activeAddress,
            suggestedParams: params,
            appIndex: props.contracts.swapper,
            appArgs: appArgs,
            accounts: accounts,
            foreignApps: foreignApps,
            foreignAssets: foreignAssets,
            note: undefined,
            lease: undefined,
            rekeyTo: undefined,
            boxes: boxes,
          })

          txns.push(metxn)
          signingIndex.push(signingIndex.length)
        }
      }

      if (newHeadId != 0) {
        if (HeadId != 0) {
          found = false
          accountAssets.assets.forEach((asset) => {
            if (asset["asset-id"] == HeadId) found = true
          })

          if (!found) {
            otxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: activeAddress,
              receiver: activeAddress,
              closeRemainderTo: undefined,
              revocationTarget: undefined,
              amount: 0,
              note: undefined,
              assetIndex: Number(HeadId),
              suggestedParams: params,
            })

            txns.push(otxn)
            signingIndex.push(signingIndex.length)
          }

          appArgs = [new Uint8Array(Buffer.from("unequip")), new Uint8Array(Buffer.from("H"))]
          accounts = [activeAddress]
          foreignApps = []
          foreignAssets = [HeadId, props.nftId]

          intBox = longToByteArray(props.nftId)
          Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("H"))])
          boxes = [{ appIndex: 0, name: Box }]

          let htxn = algosdk.makeApplicationNoOpTxnFromObject({
            sender: activeAddress,
            suggestedParams: params,
            appIndex: props.contracts.swapper,
            appArgs: appArgs,
            accounts: accounts,
            foreignApps: foreignApps,
            foreignAssets: foreignAssets,
            note: undefined,
            lease: undefined,
            rekeyTo: undefined,
            boxes: boxes,
          })

          txns.push(htxn)
          signingIndex.push(signingIndex.length)
        }

        if (newHeadId != 0) {
          stxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: "BL6V7XEKWJ3WJDPXNTTD2D5HBFF4GUNXXDVPIUSMK662LYZQQBN5BDEXGQ",
            closeRemainderTo: undefined,
            revocationTarget: undefined,
            amount: 1,
            note: undefined,
            assetIndex: Number(newHeadId),
            suggestedParams: params,
          })

          txns.push(stxn)
          signingIndex.push(signingIndex.length)

          appArgs = [new Uint8Array(Buffer.from("equip")), new Uint8Array(Buffer.from("H"))]
          accounts = []
          foreignApps = []
          foreignAssets = [newHeadId, props.nftId]

          intBox = longToByteArray(props.nftId)
          Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("H"))])
          boxes = [{ appIndex: 0, name: Box }]

          let hetxn = algosdk.makeApplicationNoOpTxnFromObject({
            sender: activeAddress,
            suggestedParams: params,
            appIndex: props.contracts.swapper,
            appArgs: appArgs,
            accounts: accounts,
            foreignApps: foreignApps,
            foreignAssets: foreignAssets,
            note: undefined,
            lease: undefined,
            rekeyTo: undefined,
            boxes: boxes,
          })

          txns.push(hetxn)
          signingIndex.push(signingIndex.length)
        }
      }

      if (newArmourId != 0 || ArmourChange == "Remove") {
        if (ArmourId != 0) {
          found = false
          accountAssets.assets.forEach((asset) => {
            if (asset["asset-id"] == ArmourId) found = true
          })

          if (!found) {
            otxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: activeAddress,
              receiver: activeAddress,
              closeRemainderTo: undefined,
              revocationTarget: undefined,
              amount: 0,
              note: undefined,
              assetIndex: Number(ArmourId),
              suggestedParams: params,
            })

            txns.push(otxn)
            signingIndex.push(signingIndex.length)
          }

          appArgs = [new Uint8Array(Buffer.from("unequip")), new Uint8Array(Buffer.from("A"))]
          accounts = [activeAddress]
          foreignApps = []
          foreignAssets = [ArmourId, props.nftId]

          intBox = longToByteArray(props.nftId)
          Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("A"))])
          boxes = [{ appIndex: 0, name: Box }]

          let atxn = algosdk.makeApplicationNoOpTxnFromObject({
            sender: activeAddress,
            suggestedParams: params,
            appIndex: props.contracts.swapper,
            appArgs: appArgs,
            accounts: accounts,
            foreignApps: foreignApps,
            foreignAssets: foreignAssets,
            note: undefined,
            lease: undefined,
            rekeyTo: undefined,
            boxes: boxes,
          })

          txns.push(atxn)
          signingIndex.push(signingIndex.length)
        }

        if (newArmourId != 0) {
          stxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: "BL6V7XEKWJ3WJDPXNTTD2D5HBFF4GUNXXDVPIUSMK662LYZQQBN5BDEXGQ",
            closeRemainderTo: undefined,
            revocationTarget: undefined,
            amount: 1,
            note: undefined,
            assetIndex: Number(newArmourId),
            suggestedParams: params,
          })

          txns.push(stxn)
          signingIndex.push(signingIndex.length)

          appArgs = [new Uint8Array(Buffer.from("equip")), new Uint8Array(Buffer.from("A"))]
          accounts = []
          foreignApps = []
          foreignAssets = [newArmourId, props.nftId]

          intBox = longToByteArray(props.nftId)
          Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("A"))])
          boxes = [{ appIndex: 0, name: Box }]

          let aetxn = algosdk.makeApplicationNoOpTxnFromObject({
            sender: activeAddress,
            suggestedParams: params,
            appIndex: props.contracts.swapper,
            appArgs: appArgs,
            accounts: accounts,
            foreignApps: foreignApps,
            foreignAssets: foreignAssets,
            note: undefined,
            lease: undefined,
            rekeyTo: undefined,
            boxes: boxes,
          })

          txns.push(aetxn)
          signingIndex.push(signingIndex.length)
        }
      }

      if (newExtraId != 0 || ExtraChange == "Remove") {
        if (ExtraId != 0) {
          found = false
          accountAssets.assets.forEach((asset) => {
            if (asset["asset-id"] == ExtraId) found = true
          })

          if (!found) {
            otxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: activeAddress,
              receiver: activeAddress,
              closeRemainderTo: undefined,
              revocationTarget: undefined,
              amount: 0,
              note: undefined,
              assetIndex: Number(ExtraId),
              suggestedParams: params,
            })

            txns.push(otxn)
            signingIndex.push(signingIndex.length)
          }

          appArgs = [new Uint8Array(Buffer.from("unequip")), new Uint8Array(Buffer.from("E"))]
          accounts = [activeAddress]
          foreignApps = []
          foreignAssets = [ExtraId, props.nftId]

          intBox = longToByteArray(props.nftId)
          Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("E"))])
          boxes = [{ appIndex: 0, name: Box }]

          let etxn = algosdk.makeApplicationNoOpTxnFromObject({
            sender: activeAddress,
            suggestedParams: params,
            appIndex: props.contracts.swapper,
            appArgs: appArgs,
            accounts: accounts,
            foreignApps: foreignApps,
            foreignAssets: foreignAssets,
            note: undefined,
            lease: undefined,
            rekeyTo: undefined,
            boxes: boxes,
          })

          txns.push(etxn)
          signingIndex.push(signingIndex.length)
        }

        if (newExtraId != 0) {
          stxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: "BL6V7XEKWJ3WJDPXNTTD2D5HBFF4GUNXXDVPIUSMK662LYZQQBN5BDEXGQ",
            closeRemainderTo: undefined,
            revocationTarget: undefined,
            amount: 1,
            note: undefined,
            assetIndex: Number(newExtraId),
            suggestedParams: params,
          })

          txns.push(stxn)
          signingIndex.push(signingIndex.length)

          appArgs = [new Uint8Array(Buffer.from("equip")), new Uint8Array(Buffer.from("E"))]
          accounts = []
          foreignApps = []
          foreignAssets = [newExtraId, props.nftId]

          intBox = longToByteArray(props.nftId)
          Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("E"))])
          boxes = [{ appIndex: 0, name: Box }]

          let eetxn = algosdk.makeApplicationNoOpTxnFromObject({
            sender: activeAddress,
            suggestedParams: params,
            appIndex: props.contracts.swapper,
            appArgs: appArgs,
            accounts: accounts,
            foreignApps: foreignApps,
            foreignAssets: foreignAssets,
            note: undefined,
            lease: undefined,
            rekeyTo: undefined,
            boxes: boxes,
          })

          txns.push(eetxn)
          signingIndex.push(signingIndex.length)
        }
      }

      let B = BackgroundChange != "None" ? BackgroundChange.url : Background
      let W = WeaponChange != "None" ? WeaponChange.url : Weapon
      let M = MagicChange != "None" ? MagicChange.url : Magic
      let H = HeadChange != "None" ? HeadChange.url : Head
      let A = ArmourChange != "None" ? ArmourChange.url : Armour
      let E = ExtraChange != "None" ? ExtraChange.url : Extra

      if (WeaponChange == "Remove") W = "None"
      if (MagicChange == "Remove") M = "None"
      if (ArmourChange == "Remove") A = "None"
      if (ExtraChange == "Remove") E = "None"

      if (genChar) {
        assertGenerationNotCanceled(generationRunId)
        setGenerationPhaseForRun(generationRunId, "metadata", "Preparing champion metadata...")
      } else {
        setSwapPhase("metadata")
        props.setMessage("Preparing metadata...")
      }

      let response1 = await fetch("/api/getHash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: safeJsonStringify({
          properties: newMetadata.properties,
          name: nft.name,
          Background: B,
          Skin: Skin,
          Weapon: W,
          Magic: M,
          Head: H,
          Armour: A,
          Extra: E,
          charId: props.nftId,
        }),
      })

      let session1 = await response1.json()
      if (genChar) {
        assertGenerationNotCanceled(generationRunId)
      }

      let reserve = algosdk.encodeAddress(
        multihash.decode(new cid(session1.hash.toString()).multihash).digest
      )

      let utxn = algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject({
        sender: "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY",
        assetIndex: props.nftId,
        note: new Uint8Array(Buffer.from(safeJsonStringify(newMetadata))),
        manager: "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY",
        reserve: reserve,
        freeze: undefined,
        clawback: undefined,
        suggestedParams: params,
        strictEmptyAddressChecking: false,
      })

      // Do not read utxn.txID() here. assignGroupID(txns) mutates the txn bytes,
      // and in algosdk 3.5.2 the txid must be read after the group id is assigned.
      txns.push(utxn)

      if (txns.length > ALGORAND_TXN_GROUP_LIMIT) {
        throw new Error(
          `This ${genChar ? "generate" : "trait swap"} built ${txns.length} transactions, but Algorand groups allow ${ALGORAND_TXN_GROUP_LIMIT} max. Swap fewer traits first.`
        )
      }

      if (txns.length > 1) {
        algosdk.assignGroupID(txns)
      }

      if (genChar) {
        generationPaymentTxnId = txns[0] && typeof txns[0].txID === "function" ? txns[0].txID() : null
        generationAssetConfigTxnId = typeof utxn.txID === "function" ? utxn.txID() : null
        console.log("Generation DARK payment txid after group assignment:", generationPaymentTxnId)
        console.log("Generation asset config txid after group assignment:", generationAssetConfigTxnId)
      }

      let encodedTxns = []
      txns.forEach((txn) => {
        let encoded = algosdk.encodeUnsignedTransaction(txn)
        encodedTxns.push(encoded)
      })

      props.setProgress(100)
      if (genChar) {
        assertGenerationNotCanceled(generationRunId)
        setGenerationPhaseForRun(generationRunId, "sign", "Sign transaction...")
      } else {
        setSwapPhase("sign")
        props.setMessage("Sign transaction...")
      }

      const signedTransactions = await signTransactions(encodedTxns, signingIndex)
      signedTransactionsReceived = true
      if (genChar) {
        setGenerationPhaseForRun(generationRunId, "signed", "Signature received...")
      } else {
        setSwapPhase("signed")
        props.setMessage("Sending transaction...")
      }

      // Immediately reset local generation state so we don't show the old 100% / completed
      if (genChar) {
        setProgressError(null)
        setShowProgress(true)
        setGenStatus({
          status: "pending",
          progress: 0,
          stage: "initializing",
        })
      }

      const txnBytes = algosdk.encodeUnsignedTransaction(utxn)
      const txnB64 = Buffer.from(txnBytes).toString("base64")

      if (genChar) {
        setGenerationPhaseForRun(generationRunId, "cosign", "Finalizing transaction...")
      } else {
        setSwapPhase("cosign")
        props.setMessage("Sending transaction...")
      }

      let response = await fetch("/api/mintNft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: safeJsonStringify({
          txn: txnB64,
        }),
      })

      let session = await response.json()

      const restoredSignedTxn = Buffer.from(session.signedTxn, "base64")
      signedTransactions[signedTransactions.length - 1] = restoredSignedTxn

      props.setProgress(0)
      if (genChar) {
        setGenerationPhaseForRun(generationRunId, "sending", "Sending transaction...")
      } else {
        setSwapPhase("sending")
        props.setMessage("Sending transaction...")
      }

      const { txid } = await client.sendRawTransaction(signedTransactions).do()
      let confirmedTxn = await algosdk.waitForConfirmation(client, txid, 4)

      if (genChar) {
        setGenerationPhaseForRun(generationRunId, "queue", "Queuing champion generation...")
      } else {
        setSwapPhase("saving")
        props.setMessage("Sending transaction...")
      }

      let responseQueue = await fetch("/api/arena/addDocToCollection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: safeJsonStringify({
          // For generation, queue the DARK payment txid specifically.
          // sendRawTransaction may return the first txid in the group, but being explicit
          // keeps Firebase queuedChars aligned with the generator matcher.
          txnId: genChar ? generationPaymentTxnId || txid : txid,
          paymentTxnId: genChar ? generationPaymentTxnId || txid : null,
          assetConfigTxId: genChar ? generationAssetConfigTxnId : null,
          groupTxId: txid,
          champId: props.nftId,
          confirmedRound: safeNumberOrNull(confirmedTxn?.confirmedRound ?? confirmedTxn?.["confirmed-round"] ?? null),
          generationBuild: genChar ? buildChampionGenerationPayload() : null,
          championName: genChar && !useRandomChampionName ? championName.trim() : null,
          randomName: genChar ? useRandomChampionName : null,
        }),
      })

      let sessionQueue = await responseQueue.json()

      if (genChar && !responseQueue.ok) {
        console.error("Failed to queue character generation:", sessionQueue)
        props.setMessage(sessionQueue?.error || "Transaction confirmed, but generation queue failed")
        setProgressError(sessionQueue?.error || "Generation queue failed")
        setMintingAction(null)
        return
      }

      console.log("Generation queue response:", sessionQueue)

      props.setMessage("NFT updated")

      if (!genChar) {
        setSwapPhase("refreshing")
        props.setMessage("Sending transaction...")
      }

      if (props.refetchData) await props.refetchData()
      await fetchData()
    } catch (error) {
      if (genChar && error?.name === "GenerationCanceledError") {
        if (activeGenerationRunIdRef.current === generationRunId) {
          restoreGenerationStartState("")
        }
        return
      }

      if (genChar && !signedTransactionsReceived) {
        if (activeGenerationRunIdRef.current === generationRunId) {
          restoreGenerationStartState(
            isWalletCancelError(error) ? "Generation canceled." : String(error)
          )
        }
        return
      }

      if (!genChar) {
        props.setMessage(isWalletCancelError(error) ? "Trait swap canceled." : String(error))
        return
      }

      props.setMessage(String(error))
      setGenStatus((prev) =>
        prev && prev.status
          ? { ...prev, status: "error" }
          : { status: "error", progress: 0, stage: null }
      )
    } finally {
      if (!genChar || activeGenerationRunIdRef.current === generationRunId) {
        setMintingAction(null)
        setGenerationPhase(null)
        setSwapPhase(null)
        if (genChar) {
          activeGenerationRunIdRef.current = null
          generationStartSnapshotRef.current = null
        }
      }

      if (genChar && generationRunId) {
        canceledGenerationRunIdsRef.current.delete(generationRunId)
      }
    }
  }


  const activeTraitEffects = [
  BackgroundChange === "Remove"
    ? null
    : BackgroundChange !== "None"
    ? BackgroundChange
    : equippedBackgroundTrait,
  equippedSkinTrait,
  WeaponChange === "Remove"
    ? null
    : WeaponChange !== "None"
    ? WeaponChange
    : equippedWeaponTrait,
  MagicChange === "Remove"
    ? null
    : MagicChange !== "None"
    ? MagicChange
    : equippedMagicTrait,
  HeadChange === "Remove"
    ? null
    : HeadChange !== "None"
    ? HeadChange
    : equippedHeadTrait,
  ArmourChange === "Remove"
    ? null
    : ArmourChange !== "None"
    ? ArmourChange
    : equippedArmourTrait,
  ExtraChange === "Remove"
    ? null
    : ExtraChange !== "None"
    ? ExtraChange
    : equippedExtraTrait,
].filter(Boolean)

const gainedEffects = buildGainedEffectsFromTraits(activeTraitEffects)

  const renderTraitSwapPanel = ({ maxWidth = 1100 } = {}) => {
    const visibleTraitSwapHelperText =
      !isTraitSwapLockedByGeneratedChampion &&
      !hasPendingTraitChanges &&
      activeChampionTab !== "generate" &&
      activeAddress
        ? "Open Generate Champion to edit visual traits. Trait Swap unlocks after you pick a new trait."
        : traitSwapHelperText

    return (
      <div
        style={{
          ...DC_COMPONENT.card,
          width: "100%",
          maxWidth,
          margin: "0 auto",
          padding: "18px 20px 20px",
          boxSizing: "border-box",
          border: hasTraitSwapLimitNotice
            ? "1px solid rgba(255,194,94,0.72)"
            : hasPendingTraitChanges
            ? "1px solid rgba(255,255,255,0.42)"
            : "1px solid rgba(255,255,255,0.18)",
          boxShadow: hasTraitSwapLimitNotice
            ? "0 0 0 1px rgba(255,194,94,0.14), 0 0 32px rgba(255,165,60,0.16), inset 0 0 24px rgba(255,194,94,0.045)"
            : hasPendingTraitChanges
            ? "0 0 0 1px rgba(255,255,255,0.12), 0 0 34px rgba(255,255,255,0.12), inset 0 0 24px rgba(255,255,255,0.04)"
            : "inset 0 0 28px rgba(255,255,255,0.035), 0 18px 44px rgba(0,0,0,0.62)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 320px", minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                justifyContent: "space-between",
                flexWrap: "wrap",
                marginBottom: 8,
              }}
            >
              <div>
                <Typography
                  variant="caption"
                  style={{
                    color: "rgba(255,255,255,0.58)",
                    display: "block",
                    textAlign: "left",
                    fontFamily: "Jacques, serif",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    fontWeight: 400,
                    marginBottom: 5,
                  }}
                >
                  Swapper
                </Typography>
                <Typography
                  variant="h6"
                  style={{
                    color: "#ffffff",
                    fontFamily: "Jacques, serif",
                    fontWeight: 400,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    margin: 0,
                    textAlign: "left",
                  }}
                >
                  Trait Swap
                </Typography>
              </div>

              <div
                style={{
                  color: hasTraitSwapLimitNotice
                    ? "#ffd79a"
                    : hasPendingTraitChanges
                    ? "#ffffff"
                    : "rgba(255,255,255,0.62)",
                  border: hasTraitSwapLimitNotice
                    ? "1px solid rgba(255,194,94,0.62)"
                    : hasPendingTraitChanges
                    ? "1px solid rgba(255,255,255,0.48)"
                    : "1px solid rgba(255,255,255,0.18)",
                  background: hasTraitSwapLimitNotice
                    ? "rgba(255,170,60,0.12)"
                    : hasPendingTraitChanges
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(255,255,255,0.045)",
                  padding: "6px 9px",
                  fontSize: 10,
                  fontFamily: "Jacques, serif",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  textAlign: "right",
                  maxWidth: "100%",
                }}
              >
                {traitSwapStatusText}
              </div>
            </div>

            <Typography
              variant="body2"
              style={{
                color: hasTraitSwapLimitNotice ? "#ffd79a" : "rgba(255,255,255,0.66)",
                textAlign: "left",
                lineHeight: 1.45,
                margin: 0,
              }}
            >
              {visibleTraitSwapHelperText}
            </Typography>
          </div>

          <Button
            style={{
              ...DC_COMPONENT.button,
              flex: "0 1 260px",
              width: "100%",
              minHeight: 54,
              padding: "13px 20px",
              opacity: isTraitSwapDisabled ? 0.48 : 1,
              border: hasPendingTraitChanges
                ? "1px solid rgba(255,255,255,0.76)"
                : "1px solid rgba(255,255,255,0.24)",
              background: hasPendingTraitChanges
                ? "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.24), rgba(0,0,0,0.88) 70%)"
                : "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(0,0,0,0.72))",
              boxShadow: hasPendingTraitChanges
                ? "0 0 0 1px rgba(255,255,255,0.14), 0 0 28px rgba(255,255,255,0.16), inset 0 0 22px rgba(255,255,255,0.08)"
                : "0 0 16px rgba(255,255,255,0.04)",
              cursor: isTraitSwapDisabled ? "not-allowed" : "pointer",
            }}
            disabled={isTraitSwapDisabled}
            onClick={() => mint(false)}
          >
            <Typography
              variant="h6"
              style={{
                fontFamily: "Jacques, serif",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 400,
                fontSize: 15,
              }}
            >
              {traitSwapButtonText}
            </Typography>
          </Button>
        </div>
      </div>
    )
  }

  if (props.zoom) {
    return (
      <div style={DARK_COIN_UI.page}>
        <style jsx global>{`
          .dc-move-selector-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
            width: 100%;
          }

          @media (max-width: 760px) {
            .dc-move-selector-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
        <div style={DARK_COIN_UI.shell}>
          <div
            style={{
              ...DARK_COIN_UI.header,
              paddingTop: props.setSelWarrior ? 74 : 32,
            }}
          >
            {props.setSelWarrior ? (
              <Button
                onClick={() => props.setSelWarrior(null)}
                style={{
                  position: "absolute",
                  left: 18,
                  top: 18,
                  borderRadius: 0,
                  color: "rgba(255,255,255,0.9)",
                  fontFamily: "Jacques, serif",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 400,
                  fontSize: 12,
                  padding: "8px 12px",
                  background: "rgba(0,0,0,0.58)",
                  border: "1px solid rgba(255,255,255,0.24)",
                  boxShadow: "0 0 18px rgba(0,0,0,0.5)",
                }}
              >
                Back to Champions
              </Button>
            ) : null}
            <img src="/invDC.svg" alt="Dark Coin" style={DARK_COIN_UI.moon} />
            <div style={DARK_COIN_UI.eyebrow}>Dark Coin</div>
            <div style={DARK_COIN_UI.title}>Champion Forge</div>
            <div style={DARK_COIN_UI.subtitle}>
              Shape your warrior, seal the pact, enter the arena
            </div>
          </div>

          <DarkCoinTabs
            activeTab={activeChampionTab}
            setActiveTab={setActiveChampionTab}
            hasChampion={hasGeneratedChampion}
            isGenerating={isGenerating}
          />

          <div style={{ padding: "18px 18px 0" }}>
            {renderTraitSwapPanel()}
          </div>

          <div style={DARK_COIN_UI.body}>
            {activeChampionTab === "generate" ? (
              <Grid
                container
                spacing={3}
                align="center"
                style={{
                  maxWidth: 1100,
                  margin: "0 auto",
                  padding: "18px",
                  borderRadius: 0,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background:
                    "linear-gradient(180deg, rgba(8,8,8,0.88), rgba(0,0,0,0.96))",
                  boxShadow: "0 22px 55px rgba(0,0,0,0.9)",
                }}
              >
          <Grid item xs={12} md={6}>
            <div
              style={{
                padding: 0,
                width: "100%",
                maxWidth: 500,
                position: "relative",
                display: "block",
                margin: "0 auto",
              }}
            >
              <img
                style={{
                  width: "100%",
                  maxWidth: 500,
                  borderRadius: 0,
                  border: "1px solid rgba(255,255,255,0.30)",
                  filter: isPreviewUpdating
                    ? "brightness(0.42) grayscale(0.15) drop-shadow(0 0 18px rgba(255,255,255,0.12))"
                    : "drop-shadow(0 0 18px rgba(255,255,255,0.12))",
                  boxShadow: "0 28px 70px rgba(0,0,0,0.78)",
                  transition: "filter 0.18s ease, opacity 0.18s ease",
                }}
                src={
                  newImage &&
                  (BackgroundChange != Background ||
                    WeaponChange != Weapon ||
                    MagicChange != Magic ||
                    HeadChange != Head ||
                    ArmourChange != Armour ||
                    ExtraChange != Extra)
                    ? newImage
                    : nftUrl
                }
              />
              {isPreviewUpdating ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                    background: "rgba(0,0,0,0.22)",
                    border: "1px solid rgba(255,255,255,0.28)",
                  }}
                >
                  <Typography
                    variant="h6"
                    style={{
                      color: "#ffffff",
                      fontFamily: "Jacques, serif",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      fontWeight: 400,
                      textShadow: "0 2px 14px rgba(0,0,0,0.92)",
                      padding: "10px 16px",
                      background: "rgba(0,0,0,0.62)",
                      border: "1px solid rgba(255,255,255,0.28)",
                    }}
                  >
                    Updating champion image
                  </Typography>
                </div>
              ) : null}
            </div>
          </Grid>

          <Grid
            item
            xs={12}
            md={6}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              alignItems: "center",
            }}
          >
            {/* Primary roll CTA */}
            <div
              style={{
                ...DC_COMPONENT.card,
                width: "100%",
                maxWidth: 440,
                padding: "18px 20px 22px",
                boxSizing: "border-box",
              }}
            >
              <Typography
                variant="h6"
                style={{
                  color: "white",
                  fontFamily: "Jacques, serif",
                  fontWeight: 400,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  textAlign: "left",
                }}
              >
                Generate Champion
              </Typography>
              <Typography
                variant="body2"
                style={{
                  color: "rgba(255,255,255,0.62)",
                  marginBottom: 12,
                  textAlign: "left",
                }}
              >
                Name the champion, assign the build, and spend 10,000 Dark Coin to bind the character object to this warrior.
              </Typography>

              {!isGenerating ? (
                <>
                  <div
                    style={{
                      width: "100%",
                      marginBottom: 12,
                      padding: 10,
                      borderRadius: 0,
                      background: "rgba(0,0,0,0.44)",
                      border: "1px solid rgba(255,255,255,0.14)",
                    }}
                  >
                    <Typography
                      variant="caption"
                      style={{
                        color: "#ffffff",
                        display: "block",
                        textAlign: "left",
                        fontFamily: "Jacques, serif",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        fontWeight: 400,
                        marginBottom: 8,
                      }}
                    >
                      Champion Name
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={championName}
                      disabled={useRandomChampionName}
                      placeholder={useRandomChampionName ? "Random name based on champion look" : "Enter champion name"}
                      onChange={(event) => setChampionName(event.target.value)}
                      inputProps={{ maxLength: 32 }}
                      sx={{
                        input: { color: "white", fontSize: 13 },
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 0,
                          background: "rgba(0,0,0,0.72)",
                          "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                          "&:hover fieldset": { borderColor: "rgba(255,255,255,0.38)" },
                          "&.Mui-focused fieldset": { borderColor: "rgba(255,255,255,0.62)" },
                        },
                      }}
                    />
                    <Button
                      onClick={() => setUseRandomChampionName((prev) => !prev)}
                      style={{
                        marginTop: 8,
                        width: "100%",
                        borderRadius: 0,
                        fontFamily: "Jacques, serif",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        fontWeight: 400,
                        color: useRandomChampionName ? "#ffffff" : "rgba(255,255,255,0.72)",
                        background: useRandomChampionName
                          ? "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.16), rgba(0,0,0,0.86) 72%)"
                          : "rgba(0,0,0,0.58)",
                        border: useRandomChampionName
                          ? "1px solid rgba(255,255,255,0.44)"
                          : "1px solid rgba(255,255,255,0.16)",
                      }}
                    >
                      {useRandomChampionName ? "Random Name Enabled" : "Use Random Name"}
                    </Button>
                  </div>

                  <Button
                    style={{
                      background:
                        "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.16), rgba(0,0,0,0.86) 72%)",
                      color: "#ffffff",
                      fontFamily: "Jacques, serif",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      padding: "11px 22px",
                      borderRadius: 0,
                      border: !isGenerationBuildReady
                        ? "1px solid rgba(255,120,120,0.42)"
                        : "1px solid rgba(255,255,255,0.35)",
                      minWidth: 260,
                      maxWidth: 360,
                      boxShadow: !isGenerationBuildReady
                        ? "0 0 24px rgba(255,80,80,0.12), inset 0 0 20px rgba(255,255,255,0.035)"
                        : "0 0 24px rgba(255,255,255,0.08), inset 0 0 20px rgba(255,255,255,0.035)",
                      opacity: activeAddress ? 1 : 0.7,
                    }}
                    disabled={!activeAddress || mintingAction !== null || !isGenerationBuildReady}
                    onClick={() => mint(true)}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          justifyContent: "center",
                        }}
                      >
                        <Typography
                          variant="h6"
                          style={{
                            margin: 0,
                            lineHeight: 1.2,
                            fontFamily: "Jacques, serif",
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            fontWeight: 400,
                            fontSize: 16,
                            color: "#ffffff",
                          }}
                        >
                          {generationButtonText}
                        </Typography>

                        {isGenerationBuildReady ? (
                          <img
                            src="/invDC.svg"
                            style={{
                              width: 32,
                              marginLeft: 4,
                            }}
                          />
                        ) : null}
                      </div>

                      {!isGenerationBuildReady ? (
                        <Typography
                          variant="caption"
                          style={{
                            color: "#ffb8b8",
                            display: "block",
                            textAlign: "center",
                            fontFamily: "Georgia, serif",
                            letterSpacing: "0.05em",
                            lineHeight: 1.25,
                            textTransform: "none",
                            maxWidth: 310,
                          }}
                        >
                          {generationBuildErrors.slice(0, 2).join(" ")}
                          {generationBuildErrors.length > 2 ? " More build requirements remain." : ""}
                        </Typography>
                      ) : null}
                    </div>
                  </Button>

                  {canCancelGeneration ? (
                    <Button
                      onClick={cancelGeneration}
                      style={{
                        marginTop: 10,
                        minWidth: 220,
                        borderRadius: 0,
                        color: "rgba(255,255,255,0.86)",
                        fontFamily: "Jacques, serif",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        fontWeight: 400,
                        background: "rgba(0,0,0,0.58)",
                        border: "1px solid rgba(255,255,255,0.22)",
                      }}
                    >
                      Cancel Generate
                    </Button>
                  ) : null}

                  {!activeAddress && (
                    <Typography
                      variant="caption"
                      style={{
                        display: "block",
                        marginTop: 8,
                        color: "rgba(255,255,255,0.62)",
                        textAlign: "center",
                      }}
                    >
                      Connect a wallet to begin the rite.
                    </Typography>
                  )}
                </>
              ) : (
                <Typography
                  variant="body2"
                  style={{
                    color: "rgba(255,255,255,0.62)",
                    marginTop: 4,
                    textAlign: "left",
                  }}
                >
                  Character generation is in progress. The forge will reopen when the rite is complete.
                </Typography>
              )}
            </div>

            {/* Progress UI – appears once they’ve signed or if a job is already running */}
            {showProgress && (
              <CharGenerationProgress
                assetId={props.nftId}
                genStatus={genStatus}
                error={progressError}
              />
            )}
          </Grid>

          {/* Trait selector UI (unchanged logic) */}
          {cat ? (
            cat == "Background" ? (
              <>
                <Grid item xs={12} style={traitSelectorRowStyle}>
                  <div
                  style={{
                    display: "inline-flex",
                    flexDirection: "column",
                    alignItems: "center",
                    marginRight: 8,
                    marginBottom: 8,
                    verticalAlign: "top",
                  }}
                >
                  <Button
                    onClick={() =>
                      applyTraitSelection("Background", "None", setBackgroundChange, "None")
                    }
                  >
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "1px solid rgba(255,255,255,0.30)",
                        borderRadius: 0,
                        padding: 10,
                      }}
                      src={Background}
                    />
                  </Button>

                  <div
                  style={{
                    marginTop: 6,
                    color: "white",
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: "center",
                    maxWidth: 100,
                    lineHeight: 1.2,
                  }}
                >
                  {equippedBackgroundTrait?.name || "Background"}
                </div>

                  {renderTraitEffects(equippedBackgroundTrait)}
                </div>
                  {ownedBackgrounds.length > 0
                    ? ownedBackgrounds.map((trait, index) => (
                        <div
                          key={index}
                          style={{
                            display: "inline-flex",
                            flexDirection: "column",
                            alignItems: "center",
                            marginRight: 8,
                            marginBottom: 8,
                            verticalAlign: "top",
                          }}
                        >
                          <Button
                            disabled={!isSelectableTrait(trait)}
                            title={isSelectableTrait(trait) ? trait.name : `${trait.name} (not owned)`}
                            onClick={() =>
                              applyTraitSelection("Background", trait, setBackgroundChange)
                            }
                          >
                            <img
                              style={{
                                width: 100,
                                height: 100,
                                border: "1px solid rgba(255,255,255,0.30)",
                                borderRadius: 0,
                                padding: 10,
                              }}
                              src={trait.url}
                            />
                          </Button>

                          <div
                          style={{
                            marginTop: 6,
                            color: "white",
                            fontSize: 12,
                            fontWeight: 700,
                            textAlign: "center",
                            maxWidth: 100,
                            lineHeight: 1.2,
                          }}
                        >
                          {trait.name}
                        </div>

                          {renderTraitEffects(trait)}
                        </div>
                      ))
                    : null}
                </Grid>
              </>
            ) : cat == "Weapon" ? (
              <>
                <Grid item xs={12} style={traitSelectorRowStyle}>
                  <Button
                    onClick={() =>
                      applyTraitSelection("Weapon", "Remove", setWeaponChange, "Remove")
                    }
                  >
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "1px solid rgba(255,255,255,0.30)",
                        borderRadius: 0,
                        padding: 10,
                      }}
                      src={"/warriors/weapon.svg"}
                    />
                  </Button>
                  {Weapon != "None" ? (
                  <div
                    style={{
                      display: "inline-flex",
                      flexDirection: "column",
                      alignItems: "center",
                      marginRight: 8,
                      marginBottom: 8,
                      verticalAlign: "top",
                    }}
                  >
                    <Button
                      onClick={() =>
                        applyTraitSelection("Weapon", "None", setWeaponChange, { url: Weapon })
                      }
                    >
                      <img
                        style={{
                          width: 100,
                          height: 100,
                          border: "1px solid rgba(255,255,255,0.30)",
                          borderRadius: 0,
                          background: "rgba(0,0,0,0.45)",
                          padding: 10,
                        }}
                        src={Weapon}
                      />
                    </Button>

                    <div
                    style={{
                      marginTop: 6,
                      color: "white",
                      fontSize: 12,
                      fontWeight: 700,
                      textAlign: "center",
                      maxWidth: 100,
                      lineHeight: 1.2,
                    }}
                  >
                    {equippedWeaponTrait?.name || "Weapon"}
                  </div>

                    {renderTraitEffects(equippedWeaponTrait)}
                  </div>
                ) : null}
                  {ownedWeapons.length > 0
                  ? ownedWeapons.map((trait, index) => (
                      <div
                        key={index}
                        style={{
                          display: "inline-flex",
                          flexDirection: "column",
                          alignItems: "center",
                          marginRight: 8,
                          marginBottom: 8,
                          verticalAlign: "top",
                        }}
                      >
                        <Button
                          disabled={!isSelectableTrait(trait)}
                          title={isSelectableTrait(trait) ? trait.name : `${trait.name} (not owned)`}
                          onClick={() =>
                            applyTraitSelection("Weapon", trait, setWeaponChange)
                          }
                        >
                          <img
                            style={{
                              width: 100,
                              height: 100,
                              border: "1px solid rgba(255,255,255,0.30)",
                              borderRadius: 0,
                              background: "rgba(0,0,0,0.45)",
                              padding: 10,
                            }}
                            src={trait.url}
                          />
                        </Button>

                        <div
                        style={{
                          marginTop: 6,
                          color: "white",
                          fontSize: 12,
                          fontWeight: 700,
                          textAlign: "center",
                          maxWidth: 100,
                          lineHeight: 1.2,
                        }}
                      >
                        {trait.name}
                      </div>

                        {renderTraitEffects(trait)}
                      </div>
                    ))
                  : null}
                </Grid>
              </>
            ) : cat == "Magic" ? (
              <>
                <Grid item xs={12} style={traitSelectorRowStyle}>
                  <Button
                    onClick={() =>
                      applyTraitSelection("Magic", "Remove", setMagicChange, "Remove")
                    }
                  >
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "1px solid rgba(255,255,255,0.30)",
                        borderRadius: 0,
                        padding: 10,
                      }}
                      src={"/warriors/magic.png"}
                    />
                  </Button>

                  {Magic != "None" ? (
                  <div
                    style={{
                      display: "inline-flex",
                      flexDirection: "column",
                      alignItems: "center",
                      marginRight: 8,
                      marginBottom: 8,
                      verticalAlign: "top",
                    }}
                  >
                    <Button
                      onClick={() =>
                        applyTraitSelection("Magic", "None", setMagicChange, { url: Magic })
                      }
                    >
                      <img
                        style={{
                          width: 100,
                          height: 100,
                          border: "1px solid rgba(255,255,255,0.30)",
                          borderRadius: 0,
                          background: "rgba(0,0,0,0.45)",
                          padding: 10,
                        }}
                        src={Magic}
                      />
                    </Button>

                    <div
                      style={{
                        marginTop: 6,
                        color: "white",
                        fontSize: 12,
                        fontWeight: 700,
                        textAlign: "center",
                        maxWidth: 100,
                        lineHeight: 1.2,
                      }}
                    >
                      {equippedMagicTrait?.name || "Magic"}
                    </div>

                    {renderTraitEffects(equippedMagicTrait)}
                  </div>
                ) : null}
                  {ownedMagics.length > 0
                  ? ownedMagics.map((trait, index) => (
                      <div
                        key={index}
                        style={{
                          display: "inline-flex",
                          flexDirection: "column",
                          alignItems: "center",
                          marginRight: 8,
                          marginBottom: 8,
                          verticalAlign: "top",
                        }}
                      >
                        <Button
                          disabled={!isSelectableTrait(trait)}
                          title={isSelectableTrait(trait) ? trait.name : `${trait.name} (not owned)`}
                          onClick={() =>
                            applyTraitSelection("Magic", trait, setMagicChange)
                          }
                        >
                          <img
                            style={{
                              width: 100,
                              height: 100,
                              border: "1px solid rgba(255,255,255,0.30)",
                              borderRadius: 0,
                              background: "rgba(0,0,0,0.45)",
                              padding: 10,
                            }}
                            src={trait.url}
                          />
                        </Button>

                        <div
                        style={{
                          marginTop: 6,
                          color: "white",
                          fontSize: 12,
                          fontWeight: 700,
                          textAlign: "center",
                          maxWidth: 100,
                          lineHeight: 1.2,
                        }}
                      >
                        {trait.name}
                      </div>

                        {renderTraitEffects(trait)}
                      </div>
                    ))
                  : null}
                </Grid>
              </>
            ) : cat == "Head" ? (
              <>
                <Grid item xs={12} style={traitSelectorRowStyle}>
                  {Head != "None" ? (
                  <div
                    style={{
                      display: "inline-flex",
                      flexDirection: "column",
                      alignItems: "center",
                      marginRight: 8,
                      marginBottom: 8,
                      verticalAlign: "top",
                    }}
                  >
                    <Button
                      onClick={() =>
                        applyTraitSelection("Head", "None", setHeadChange, { url: Head })
                      }
                    >
                      <img
                        style={{
                          width: 100,
                          height: 100,
                          border: "1px solid rgba(255,255,255,0.30)",
                          borderRadius: 0,
                          background: "rgba(0,0,0,0.45)",
                          padding: 10,
                        }}
                        src={Head}
                      />
                    </Button>

                    <div
                    style={{
                      marginTop: 6,
                      color: "white",
                      fontSize: 12,
                      fontWeight: 700,
                      textAlign: "center",
                      maxWidth: 100,
                      lineHeight: 1.2,
                    }}
                  >
                    {equippedHeadTrait?.name || "Head"}
                  </div>

                    {renderTraitEffects(equippedHeadTrait)}
                  </div>
                ) : null}
                  {ownedHeads.length > 0
                  ? ownedHeads.map((trait, index) => (
                      <div
                        key={index}
                        style={{
                          display: "inline-flex",
                          flexDirection: "column",
                          alignItems: "center",
                          marginRight: 8,
                          marginBottom: 8,
                          verticalAlign: "top",
                        }}
                      >
                        <Button
                          disabled={!isSelectableTrait(trait)}
                          title={isSelectableTrait(trait) ? trait.name : `${trait.name} (not owned)`}
                          onClick={() =>
                            applyTraitSelection("Head", trait, setHeadChange)
                          }
                        >
                          <img
                            style={{
                              width: 100,
                              height: 100,
                              border: "1px solid rgba(255,255,255,0.30)",
                              borderRadius: 0,
                              background: "rgba(0,0,0,0.45)",
                              padding: 10,
                            }}
                            src={trait.url}
                          />
                        </Button>

                        <div
                          style={{
                            marginTop: 6,
                            color: "white",
                            fontSize: 12,
                            fontWeight: 700,
                            textAlign: "center",
                            maxWidth: 100,
                            lineHeight: 1.2,
                          }}
                        >
                          {trait.name}
                        </div>

                        {renderTraitEffects(trait)}
                      </div>
                    ))
                  : null}
                </Grid>
              </>
            ) : cat == "Armour" ? (
              <>
                <Grid item xs={12} style={traitSelectorRowStyle}>
                  <Button
                    onClick={() =>
                      applyTraitSelection("Armour", "Remove", setArmourChange, "Remove")
                    }
                  >
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "1px solid rgba(255,255,255,0.30)",
                        borderRadius: 0,
                        padding: 10,
                      }}
                      src={"/warriors/armour.svg"}
                    />
                  </Button>

                  {Armour != "None" ? (
                  <div
                    style={{
                      display: "inline-flex",
                      flexDirection: "column",
                      alignItems: "center",
                      marginRight: 8,
                      marginBottom: 8,
                      verticalAlign: "top",
                    }}
                  >
                    <Button
                      onClick={() =>
                        applyTraitSelection("Armour", "None", setArmourChange, { url: Armour })
                      }
                    >
                      <img
                        style={{
                          width: 100,
                          height: 100,
                          border: "1px solid rgba(255,255,255,0.30)",
                          borderRadius: 0,
                          background: "rgba(0,0,0,0.45)",
                          padding: 10,
                        }}
                        src={Armour}
                      />
                    </Button>

                    <div
                    style={{
                      marginTop: 6,
                      color: "white",
                      fontSize: 12,
                      fontWeight: 700,
                      textAlign: "center",
                      maxWidth: 100,
                      lineHeight: 1.2,
                    }}
                  >
                    {equippedArmourTrait?.name || "Armour"}
                  </div>

                    {renderTraitEffects(equippedArmourTrait)}
                  </div>
                ) : null}
                  {ownedArmours.length > 0
                  ? ownedArmours.map((trait, index) => (
                      <div
                        key={index}
                        style={{
                          display: "inline-flex",
                          flexDirection: "column",
                          alignItems: "center",
                          marginRight: 8,
                          marginBottom: 8,
                          verticalAlign: "top",
                        }}
                      >
                        <Button
                          disabled={!isSelectableTrait(trait)}
                          title={isSelectableTrait(trait) ? trait.name : `${trait.name} (not owned)`}
                          onClick={() =>
                            applyTraitSelection("Armour", trait, setArmourChange)
                          }
                        >
                          <img
                            style={{
                              width: 100,
                              height: 100,
                              border: "1px solid rgba(255,255,255,0.30)",
                              borderRadius: 0,
                              background: "rgba(0,0,0,0.45)",
                              padding: 10,
                            }}
                            src={trait.url}
                          />
                        </Button>

                        <div
                        style={{
                          marginTop: 6,
                          color: "white",
                          fontSize: 12,
                          fontWeight: 700,
                          textAlign: "center",
                          maxWidth: 100,
                          lineHeight: 1.2,
                        }}
                      >
                        {trait.name}
                      </div>

                        {renderTraitEffects(trait)}
                      </div>
                    ))
                  : null}
                </Grid>
              </>
            ) : cat == "Extra" ? (
              <>
                <Grid item xs={12} style={traitSelectorRowStyle}>
                  <Button
                    onClick={() =>
                      applyTraitSelection("Extra", "Remove", setExtraChange, "Remove")
                    }
                  >
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "1px solid rgba(255,255,255,0.30)",
                        borderRadius: 0,
                        padding: 10,
                      }}
                      src={"/warriors/extra.svg"}
                    />
                  </Button>
                {Extra != "None" ? (
                <div
                  style={{
                    display: "inline-flex",
                    flexDirection: "column",
                    alignItems: "center",
                    marginRight: 8,
                    marginBottom: 8,
                    verticalAlign: "top",
                  }}
                >
                  <Button
                    onClick={() =>
                      applyTraitSelection("Extra", "None", setExtraChange, { url: Extra })
                    }
                  >
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "1px solid rgba(255,255,255,0.30)",
                        borderRadius: 0,
                        padding: 10,
                      }}
                      src={Extra}
                    />
                  </Button>

                  <div
                  style={{
                    marginTop: 6,
                    color: "white",
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: "center",
                    maxWidth: 100,
                    lineHeight: 1.2,
                  }}
                >
                  {equippedExtraTrait?.name || "Extra"}
                </div>

                  {renderTraitEffects(equippedExtraTrait)}
                </div>
              ) : null}
                {ownedExtras.length > 0
                ? ownedExtras.map((trait, index) => (
                    <div
                      key={index}
                      style={{
                        display: "inline-flex",
                        flexDirection: "column",
                        alignItems: "center",
                        marginRight: 8,
                        marginBottom: 8,
                        verticalAlign: "top",
                      }}
                    >
                      <Button
                        disabled={!isSelectableTrait(trait)}
                        title={isSelectableTrait(trait) ? trait.name : `${trait.name} (not owned)`}
                        onClick={() =>
                          applyTraitSelection("Extra", trait, setExtraChange)
                        }
                      >
                        <img
                          style={{
                            width: 100,
                            height: 100,
                            border: "1px solid rgba(255,255,255,0.30)",
                            borderRadius: 0,
                            padding: 10,
                          }}
                          src={trait.url}
                        />
                      </Button>

                      <div
                        style={{
                          marginTop: 6,
                          color: "white",
                          fontSize: 12,
                          fontWeight: 700,
                          textAlign: "center",
                          maxWidth: 100,
                          lineHeight: 1.2,
                        }}
                      >
                        {trait.name}
                      </div>

                      {renderTraitEffects(trait)}
                    </div>
                  ))
                : null}
                </Grid>
              </>
            ) : null
          ) : (
  <>
    <Grid item xs={12}>
      {renderOverviewSlot({
        label: "Background",
        type: "Background",
        currentImage:
          BackgroundChange != "None" && BackgroundChange != "Remove"
            ? BackgroundChange.url
            : Background == "None" || BackgroundChange == "Remove"
            ? "/warriors/background.svg"
            : Background,
        placeholderImage: "/warriors/background.svg",
        selectedTrait:
          BackgroundChange === "Remove"
            ? null
            : BackgroundChange !== "None"
            ? BackgroundChange
            : equippedBackgroundTrait,
        onClick: () => setCat("Background"),
      })}

      {renderOverviewSlot({
        label: "Head",
        type: "Head",
        currentImage:
          HeadChange != "None" && HeadChange != "Remove"
            ? HeadChange.url
            : Head == "None" || HeadChange == "Remove"
            ? "/warriors/head.svg"
            : Head,
        placeholderImage: "/warriors/head.svg",
        selectedTrait:
          HeadChange === "Remove"
            ? null
            : HeadChange !== "None"
            ? HeadChange
            : equippedHeadTrait,
        onClick: () => setCat("Head"),
      })}

      {renderOverviewSlot({
        label: "Weapon",
        type: "Weapon",
        currentImage:
          WeaponChange != "Remove" && WeaponChange != "None"
            ? WeaponChange.url
            : Weapon == "None" || WeaponChange == "Remove"
            ? "/warriors/weapon.svg"
            : Weapon,
        placeholderImage: "/warriors/weapon.svg",
        selectedTrait:
          WeaponChange === "Remove"
            ? null
            : WeaponChange !== "None"
            ? WeaponChange
            : equippedWeaponTrait,
        onClick: () => setCat("Weapon"),
      })}

      {renderOverviewSlot({
        label: "Extra",
        type: "Extra",
        currentImage:
          ExtraChange != "Remove" && ExtraChange != "None"
            ? ExtraChange.url
            : Extra == "None" || ExtraChange == "Remove"
            ? "/warriors/extra.svg"
            : Extra,
        placeholderImage: "/warriors/extra.svg",
        selectedTrait:
          ExtraChange === "Remove"
            ? null
            : ExtraChange !== "None"
            ? ExtraChange
            : equippedExtraTrait,
        onClick: () => setCat("Extra"),
      })}

      {renderOverviewSlot({
        label: "Skin",
        type: "Skin",
        currentImage: Skin == "None" ? "/warriors/skin.svg" : Skin,
        placeholderImage: "/warriors/skin.svg",
        selectedTrait: equippedSkinTrait,
        disabled: true,
      })}

      {renderOverviewSlot({
        label: "Armour",
        type: "Armour",
        currentImage:
          ArmourChange != "Remove" && ArmourChange != "None"
            ? ArmourChange.url
            : Armour == "None" || ArmourChange == "Remove"
            ? "/warriors/armour.svg"
            : Armour,
        placeholderImage: "/warriors/armour.svg",
        selectedTrait:
          ArmourChange === "Remove"
            ? null
            : ArmourChange !== "None"
            ? ArmourChange
            : equippedArmourTrait,
        onClick: () => setCat("Armour"),
      })}

      {renderOverviewSlot({
        label: "Magic",
        type: "Magic",
        currentImage:
          MagicChange != "Remove" && MagicChange != "None"
            ? MagicChange.url
            : Magic == "None" || MagicChange == "Remove"
            ? "/warriors/magic.png"
            : Magic,
        placeholderImage: "/warriors/magic.png",
        selectedTrait:
          MagicChange === "Remove"
            ? null
            : MagicChange !== "None"
            ? MagicChange
            : equippedMagicTrait,
        onClick: () => setCat("Magic"),
      })}


    </Grid>
  </>
)}

          <Grid item xs={12}>
            {renderGenerationBuildPlanner()}
          </Grid>

              </Grid>
            ) : (
              <div style={DARK_COIN_UI.panel}>
                {charObject && !isGenerating ? (
                  <Character
                    nftId={props.nftId}
                    background={Background}
                    deleteChar={deleteChar}
                    contracts={props.contracts}
                    setMessage={props.setMessage}
                    gainedEffects={gainedEffects}
                    hideSkillTree={false}
                    hideDeleteButton={false}
                    darkCoinTheme={true}
                  />
                ) : (
                  <div style={{ padding: 40, textAlign: "center" }}>
                    <Typography
                      style={{
                        fontFamily: "Jacques",
                        color: "rgba(255,255,255,0.78)",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                      }}
                    >
                      No champion has been generated yet.
                    </Typography>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  } else {
    // non-zoom view
    return (
      <div>
        {charObject && displayRoll ? (
          <Typography
            color="secondary"
            variant="caption"
            style={{ position: "absolute", top: 20, left: "15%" }}
          >
            {charObject.name}
          </Typography>
        ) : null}
        <img
          style={{
            width: "100%",
            maxWidth: 500,
            borderRadius: 0,
            border: charObject ? "3px solid white" : "3px solid black",
          }}
          src={nftUrl}
        />
      </div>
    )
  }
}
