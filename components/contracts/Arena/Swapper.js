import React, { useState, useEffect, useRef } from "react"

import algosdk from "algosdk"
import { Typography, Button, Grid } from "@mui/material"

import NftImage from "../../NftImage"
import { assetImageUrl } from "../../../lib/ipfsMedia"


import { storage } from "../../../Firebase/FirebaseInit"
import { getDownloadURL, ref } from "firebase/storage"


import { useWallet } from "@txnlab/use-wallet-react"

import multihash from "multihashes"
import cid from "cids"


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
  assumeMissingOldOptIn = true,
}) {
  const pendingCount = Object.values(changes || {}).filter((change) => change !== "None").length
  if (!pendingCount) return 0

  let count = TRAIT_SWAP_METADATA_TXN_COUNT

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

const MAX_TRAIT_SWAP_CHANGES = 4
const ALGORAND_TXN_GROUP_LIMIT = 16
const TRAIT_SWAP_METADATA_TXN_COUNT = 1

function isWalletCancelError(error) {
  const message = String(error?.message || error || "")
  return /cancel|reject|declin/i.test(message)
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
  const [loadError, setLoadError] = useState("")

  const [char, setChar] = useState(null)

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

  const [mintingAction, setMintingAction] = useState(null)
  const [swapPhase, setSwapPhase] = useState(null)
  const [traitSwapLimitWarning, setTraitSwapLimitWarning] = useState("")
  const swapInFlight = useRef(false)

  const [equippedBackgroundTrait, setEquippedBackgroundTrait] = useState(null)
  const [equippedWeaponTrait, setEquippedWeaponTrait] = useState(null)
  const [equippedMagicTrait, setEquippedMagicTrait] = useState(null)
  const [equippedHeadTrait, setEquippedHeadTrait] = useState(null)
  const [equippedArmourTrait, setEquippedArmourTrait] = useState(null)
  const [equippedExtraTrait, setEquippedExtraTrait] = useState(null)
  const [equippedSkinTrait, setEquippedSkinTrait] = useState(null)

  const previewRequestIdRef = useRef(0)

  const traitSelectorRowStyle = {
    display: "flex",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 8,
  }

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
    assumeMissingOldOptIn: true,
  })
  const isTraitSwapGroupOverLimit = estimatedTraitSwapTxnCount > ALGORAND_TXN_GROUP_LIMIT
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
  const isTraitSwapDisabled =
    !activeAddress ||
    !nft ||
    !char?.properties ||
    mintingAction !== null ||
    isPreviewUpdating ||
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
      : traitSwapLimitNotice
      ? traitSwapLimitNotice
      : !activeAddress
      ? "Connect your wallet before swapping traits."
      : !nft
      ? "Loading champion data before trait swap is available."
      : hasPendingTraitChanges
      ? "Trait Swap updates this champion's equipped traits and NFT image."
      : "Choose a different trait below to enable Trait Swap."
  useEffect(() => {
    if (
      pendingTraitChangeCount <= MAX_TRAIT_SWAP_CHANGES &&
      !isTraitSwapGroupOverLimit &&
      traitSwapLimitWarning
    ) {
      setTraitSwapLimitWarning("")
    }
  }, [pendingTraitChangeCount, isTraitSwapGroupOverLimit, traitSwapLimitWarning])

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

  const renderOverviewSlot = ({
  label,
  type,
  currentImage,
  placeholderImage,
  selectedTrait,
  onClick,
  disabled = false,
}) => {
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
      <Button aria-label={`Change ${label}`} onClick={onClick} disabled={disabled || mintingAction !== null}>
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


    </div>
  )
}

  const loadData = async () => {
    

    let response = await fetch("/api/getNft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: safeJsonStringify({
        nftId: props.nftId,
        includeArenaCharacter: false,
      }),
    })

    let session = await response.json()
    if (!response.ok || !session?.nft?.assets?.[0]?.params) {
      throw new Error(session.error || "Could not load this champion. Please try again.")
    }

    setNft(session.nft.assets[0].params)
    setNftUrl(assetImageUrl(session.nft.assets[0].params))

    if (props.zoom) {
      const client = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443)
      let char = JSON.parse(session.charStats)
      if (!char?.properties) throw new Error("Champion trait metadata is unavailable. Please try again before swapping traits.")
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


      return {
        assetId,
        name,
        type,
        url,
      }
    }

    const buildEquippedSkinTrait = async (skinName, url) => {
    if (!skinName || skinName === "None" || !url || url === "None") {
      return null
    }


    return {
      assetId: null,
      name: skinName,
      type: "Skin",
      url,
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

      setNewImage(null)
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

      const buildOwnedTrait = async (trait, url) => {


      return {
        assetId: trait.assetId,
        name: trait.name,
        type: trait.type,
        url,
        owned: trait.owned !== false,
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
          return buildOwnedTrait(trait, url)
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

  const fetchData = async () => {
    setLoadError("")
    try {
      await loadData()
    } catch (error) {
      setLoadError(error?.message || "Could not load this champion. Please try again.")
    }
  }

  // Initial NFT + char load
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.nftId])

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
    if (swapInFlight.current) return
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

  const swapTraits = async () => {
  if (swapInFlight.current || isTraitSwapDisabled || !char?.properties) return;
  swapInFlight.current = true;
  try {
    {
      if (pendingTraitChangeCount > MAX_TRAIT_SWAP_CHANGES) {
        const message = `Trait Swap can only process ${MAX_TRAIT_SWAP_CHANGES} trait changes at once. Clear ${pendingTraitChangeCount - MAX_TRAIT_SWAP_CHANGES} trait ${pendingTraitChangeCount - MAX_TRAIT_SWAP_CHANGES === 1 ? "change" : "changes"} before swapping.`;
        setTraitSwapLimitWarning(message);
        props.setMessage(message);
        return;
      }
    }
    setMintingAction("swap");
    setSwapPhase("checking");
    {
      props.setMessage("Starting swap...");
    }
    props.setProgress(0);
    let newMetadata = { ...char, properties: { ...char.properties } };
    const client = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443);
    const indexerClient = new algosdk.Indexer("", "https://mainnet-idx.algonode.cloud", 443);
    {
      setSwapPhase("network");
      props.setMessage("Starting swap...");
    }
    let params = await client.getTransactionParams().do();
    {
      setSwapPhase("wallet");
      props.setMessage("Starting swap...");
    }
    const accountAssets = await indexerClient.lookupAccountAssets(activeAddress).do();
    const exactWalletAssetIds = getAccountAssetIdSet(accountAssets);
    setWalletAssetIds(exactWalletAssetIds);
    const exactTransactionGroupSize = estimateTraitSwapTransactionGroupSize({
      changes: currentTraitChanges,
      currentAssetIds: currentTraitAssetIds,
      walletAssetIds: exactWalletAssetIds,
      assumeMissingOldOptIn: false
    });
    if (exactTransactionGroupSize > ALGORAND_TXN_GROUP_LIMIT) {
      const message = `This ${"trait swap"} would build ${exactTransactionGroupSize} transactions, but Algorand groups allow ${ALGORAND_TXN_GROUP_LIMIT} max. Swap fewer traits first.`;
      setTraitSwapLimitWarning(message);
      props.setMessage(message);
      return;
    }
    {
      setSwapPhase("transactions");
      props.setMessage("Starting swap...");
    }
    let found;
    let otxn;
    let stxn;
    let newBackgroundId = 0;
    let newWeaponId = 0;
    let newMagicId = 0;
    let newHeadId = 0;
    let newArmourId = 0;
    let newExtraId = 0;
    let txns = [];
    let signingIndex = [];
    let appArgs = [];
    let accounts = [];
    let foreignApps = [];
    let foreignAssets = [];
    let boxes = [];
    let intBox;
    let Box;
    if (BackgroundChange != "None" && BackgroundChange != "Remove") {
      newMetadata.properties.Background = BackgroundChange.name;
      newBackgroundId = BackgroundChange.assetId;
    }
    if (WeaponChange != "None" && WeaponChange != "Remove") {
      newMetadata.properties.Weapon = WeaponChange.name;
      newWeaponId = WeaponChange.assetId;
    } else if (WeaponChange == "Remove") {
      newMetadata.properties.Weapon = "None";
    }
    if (MagicChange != "None" && MagicChange != "Remove") {
      newMetadata.properties.Magic = MagicChange.name;
      newMagicId = MagicChange.assetId;
    } else if (MagicChange == "Remove") {
      newMetadata.properties.Magic = "None";
    }
    if (HeadChange != "None" && HeadChange != "Remove") {
      newMetadata.properties.Head = HeadChange.name;
      newHeadId = HeadChange.assetId;
    }
    if (ArmourChange != "None" && ArmourChange != "Remove") {
      newMetadata.properties.Armour = ArmourChange.name;
      newArmourId = ArmourChange.assetId;
    } else if (ArmourChange == "Remove") {
      newMetadata.properties.Armour = "None";
    }
    if (ExtraChange != "None" && ExtraChange != "Remove") {
      newMetadata.properties.Extra = ExtraChange.name;
      newExtraId = ExtraChange.assetId;
    } else if (ExtraChange == "Remove") {
      newMetadata.properties.Extra = "None";
    }
    if (newBackgroundId != 0) {
      if (BackgroundId != 0) {
        found = exactWalletAssetIds.has(Number(BackgroundId));
        if (!found) {
          otxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: activeAddress,
            amount: 0,
            assetIndex: Number(BackgroundId),
            suggestedParams: params
          });
          txns.push(otxn);
          signingIndex.push(signingIndex.length);
        }
        appArgs = [new Uint8Array(Buffer.from("unequip")), new Uint8Array(Buffer.from("B"))];
        accounts = [activeAddress];
        foreignApps = [];
        foreignAssets = [BackgroundId, props.nftId];
        intBox = longToByteArray(props.nftId);
        Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("B"))]);
        boxes = [{
          appIndex: 0,
          name: Box
        }];
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
          boxes: boxes
        });
        txns.push(btxn);
        signingIndex.push(signingIndex.length);
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
          suggestedParams: params
        });
        txns.push(stxn);
        signingIndex.push(signingIndex.length);
        appArgs = [new Uint8Array(Buffer.from("equip")), new Uint8Array(Buffer.from("B"))];
        accounts = [];
        foreignApps = [];
        foreignAssets = [newBackgroundId, props.nftId];
        intBox = longToByteArray(props.nftId);
        Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("B"))]);
        boxes = [{
          appIndex: 0,
          name: Box
        }];
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
          boxes: boxes
        });
        txns.push(betxn);
        signingIndex.push(signingIndex.length);
      }
    }
    if (newWeaponId != 0 || WeaponChange == "Remove") {
      if (WeaponId != 0) {
        found = exactWalletAssetIds.has(Number(WeaponId));
        if (!found) {
          otxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: activeAddress,
            closeRemainderTo: undefined,
            revocationTarget: undefined,
            amount: 0,
            note: undefined,
            assetIndex: Number(WeaponId),
            suggestedParams: params
          });
          txns.push(otxn);
          signingIndex.push(signingIndex.length);
        }
        appArgs = [new Uint8Array(Buffer.from("unequip")), new Uint8Array(Buffer.from("W"))];
        accounts = [activeAddress];
        foreignApps = [];
        foreignAssets = [WeaponId, props.nftId];
        intBox = longToByteArray(props.nftId);
        Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("W"))]);
        boxes = [{
          appIndex: 0,
          name: Box
        }];
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
          boxes: boxes
        });
        txns.push(wtxn);
        signingIndex.push(signingIndex.length);
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
          suggestedParams: params
        });
        txns.push(stxn);
        signingIndex.push(signingIndex.length);
        appArgs = [new Uint8Array(Buffer.from("equip")), new Uint8Array(Buffer.from("W"))];
        accounts = [];
        foreignApps = [];
        foreignAssets = [newWeaponId, props.nftId];
        intBox = longToByteArray(props.nftId);
        Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("W"))]);
        boxes = [{
          appIndex: 0,
          name: Box
        }];
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
          boxes: boxes
        });
        txns.push(wetxn);
        signingIndex.push(signingIndex.length);
      }
    }
    if (newMagicId != 0 || MagicChange == "Remove") {
      if (MagicId != 0) {
        found = exactWalletAssetIds.has(Number(MagicId));
        if (!found) {
          otxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: activeAddress,
            closeRemainderTo: undefined,
            revocationTarget: undefined,
            amount: 0,
            note: undefined,
            assetIndex: Number(MagicId),
            suggestedParams: params
          });
          txns.push(otxn);
          signingIndex.push(signingIndex.length);
        }
        appArgs = [new Uint8Array(Buffer.from("unequip")), new Uint8Array(Buffer.from("M"))];
        accounts = [activeAddress];
        foreignApps = [];
        foreignAssets = [MagicId, props.nftId];
        intBox = longToByteArray(props.nftId);
        Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("M"))]);
        boxes = [{
          appIndex: 0,
          name: Box
        }];
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
          boxes: boxes
        });
        txns.push(mtxn);
        signingIndex.push(signingIndex.length);
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
          suggestedParams: params
        });
        txns.push(stxn);
        signingIndex.push(signingIndex.length);
        appArgs = [new Uint8Array(Buffer.from("equip")), new Uint8Array(Buffer.from("M"))];
        accounts = [];
        foreignApps = [];
        foreignAssets = [newMagicId, props.nftId];
        intBox = longToByteArray(props.nftId);
        Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("M"))]);
        boxes = [{
          appIndex: 0,
          name: Box
        }];
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
          boxes: boxes
        });
        txns.push(metxn);
        signingIndex.push(signingIndex.length);
      }
    }
    if (newHeadId != 0) {
      if (HeadId != 0) {
        found = exactWalletAssetIds.has(Number(HeadId));
        if (!found) {
          otxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: activeAddress,
            closeRemainderTo: undefined,
            revocationTarget: undefined,
            amount: 0,
            note: undefined,
            assetIndex: Number(HeadId),
            suggestedParams: params
          });
          txns.push(otxn);
          signingIndex.push(signingIndex.length);
        }
        appArgs = [new Uint8Array(Buffer.from("unequip")), new Uint8Array(Buffer.from("H"))];
        accounts = [activeAddress];
        foreignApps = [];
        foreignAssets = [HeadId, props.nftId];
        intBox = longToByteArray(props.nftId);
        Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("H"))]);
        boxes = [{
          appIndex: 0,
          name: Box
        }];
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
          boxes: boxes
        });
        txns.push(htxn);
        signingIndex.push(signingIndex.length);
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
          suggestedParams: params
        });
        txns.push(stxn);
        signingIndex.push(signingIndex.length);
        appArgs = [new Uint8Array(Buffer.from("equip")), new Uint8Array(Buffer.from("H"))];
        accounts = [];
        foreignApps = [];
        foreignAssets = [newHeadId, props.nftId];
        intBox = longToByteArray(props.nftId);
        Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("H"))]);
        boxes = [{
          appIndex: 0,
          name: Box
        }];
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
          boxes: boxes
        });
        txns.push(hetxn);
        signingIndex.push(signingIndex.length);
      }
    }
    if (newArmourId != 0 || ArmourChange == "Remove") {
      if (ArmourId != 0) {
        found = exactWalletAssetIds.has(Number(ArmourId));
        if (!found) {
          otxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: activeAddress,
            closeRemainderTo: undefined,
            revocationTarget: undefined,
            amount: 0,
            note: undefined,
            assetIndex: Number(ArmourId),
            suggestedParams: params
          });
          txns.push(otxn);
          signingIndex.push(signingIndex.length);
        }
        appArgs = [new Uint8Array(Buffer.from("unequip")), new Uint8Array(Buffer.from("A"))];
        accounts = [activeAddress];
        foreignApps = [];
        foreignAssets = [ArmourId, props.nftId];
        intBox = longToByteArray(props.nftId);
        Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("A"))]);
        boxes = [{
          appIndex: 0,
          name: Box
        }];
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
          boxes: boxes
        });
        txns.push(atxn);
        signingIndex.push(signingIndex.length);
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
          suggestedParams: params
        });
        txns.push(stxn);
        signingIndex.push(signingIndex.length);
        appArgs = [new Uint8Array(Buffer.from("equip")), new Uint8Array(Buffer.from("A"))];
        accounts = [];
        foreignApps = [];
        foreignAssets = [newArmourId, props.nftId];
        intBox = longToByteArray(props.nftId);
        Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("A"))]);
        boxes = [{
          appIndex: 0,
          name: Box
        }];
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
          boxes: boxes
        });
        txns.push(aetxn);
        signingIndex.push(signingIndex.length);
      }
    }
    if (newExtraId != 0 || ExtraChange == "Remove") {
      if (ExtraId != 0) {
        found = exactWalletAssetIds.has(Number(ExtraId));
        if (!found) {
          otxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: activeAddress,
            closeRemainderTo: undefined,
            revocationTarget: undefined,
            amount: 0,
            note: undefined,
            assetIndex: Number(ExtraId),
            suggestedParams: params
          });
          txns.push(otxn);
          signingIndex.push(signingIndex.length);
        }
        appArgs = [new Uint8Array(Buffer.from("unequip")), new Uint8Array(Buffer.from("E"))];
        accounts = [activeAddress];
        foreignApps = [];
        foreignAssets = [ExtraId, props.nftId];
        intBox = longToByteArray(props.nftId);
        Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("E"))]);
        boxes = [{
          appIndex: 0,
          name: Box
        }];
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
          boxes: boxes
        });
        txns.push(etxn);
        signingIndex.push(signingIndex.length);
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
          suggestedParams: params
        });
        txns.push(stxn);
        signingIndex.push(signingIndex.length);
        appArgs = [new Uint8Array(Buffer.from("equip")), new Uint8Array(Buffer.from("E"))];
        accounts = [];
        foreignApps = [];
        foreignAssets = [newExtraId, props.nftId];
        intBox = longToByteArray(props.nftId);
        Box = new Uint8Array([...intBox, new Uint8Array(Buffer.from("E"))]);
        boxes = [{
          appIndex: 0,
          name: Box
        }];
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
          boxes: boxes
        });
        txns.push(eetxn);
        signingIndex.push(signingIndex.length);
      }
    }
    let B = BackgroundChange != "None" ? BackgroundChange.url : Background;
    let W = WeaponChange != "None" ? WeaponChange.url : Weapon;
    let M = MagicChange != "None" ? MagicChange.url : Magic;
    let H = HeadChange != "None" ? HeadChange.url : Head;
    let A = ArmourChange != "None" ? ArmourChange.url : Armour;
    let E = ExtraChange != "None" ? ExtraChange.url : Extra;
    if (WeaponChange == "Remove") W = "None";
    if (MagicChange == "Remove") M = "None";
    if (ArmourChange == "Remove") A = "None";
    if (ExtraChange == "Remove") E = "None";
    {
      setSwapPhase("metadata");
      props.setMessage("Preparing metadata...");
    }
    let response1 = await fetch("/api/getHash", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
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
        charId: props.nftId
      })
    });
    let session1 = await response1.json();
    if (!response1.ok || !session1.hash) throw new Error(session1.error || "Unable to prepare trait metadata.");
    let reserve = algosdk.encodeAddress(multihash.decode(new cid(session1.hash.toString()).multihash).digest);
    let utxn = algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject({
      sender: "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY",
      assetIndex: props.nftId,
      note: new Uint8Array(Buffer.from(safeJsonStringify(newMetadata))),
      manager: "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY",
      reserve: reserve,
      freeze: undefined,
      clawback: undefined,
      suggestedParams: params,
      strictEmptyAddressChecking: false
    });
    txns.push(utxn);
    if (txns.length > ALGORAND_TXN_GROUP_LIMIT) {
      throw new Error(`This ${"trait swap"} built ${txns.length} transactions, but Algorand groups allow ${ALGORAND_TXN_GROUP_LIMIT} max. Swap fewer traits first.`);
    }
    if (txns.length > 1) {
      algosdk.assignGroupID(txns);
    }
    let encodedTxns = [];
    txns.forEach(txn => {
      let encoded = algosdk.encodeUnsignedTransaction(txn);
      encodedTxns.push(encoded);
    });
    props.setProgress(100);
    {
      setSwapPhase("sign");
      props.setMessage("Sign transaction...");
    }
    const signedTransactions = await signTransactions(encodedTxns, signingIndex);
    {
      setSwapPhase("signed");
      props.setMessage("Sending transaction...");
    }
    const txnBytes = algosdk.encodeUnsignedTransaction(utxn);
    const txnB64 = Buffer.from(txnBytes).toString("base64");
    {
      setSwapPhase("cosign");
      props.setMessage("Sending transaction...");
    }
    let response = await fetch("/api/mintNft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: safeJsonStringify({
        txn: txnB64
      })
    });
    let session = await response.json();
    if (!response.ok || !session.signedTxn) throw new Error(session.error || "Unable to finalize the trait swap.");
    const restoredSignedTxn = Buffer.from(session.signedTxn, "base64");
    signedTransactions[signedTransactions.length - 1] = restoredSignedTxn;
    props.setProgress(0);
    {
      setSwapPhase("sending");
      props.setMessage("Sending transaction...");
    }
    const {
      txid
    } = await client.sendRawTransaction(signedTransactions).do();
    await algosdk.waitForConfirmation(client, txid, 4);
    {
      setSwapPhase("saving");
      props.setMessage("Sending transaction...");
    }
    props.setMessage("NFT updated");
    {
      setSwapPhase("refreshing");
      props.setMessage("Sending transaction...");
    }
    if (props.refetchData) await props.refetchData();
    await fetchData();
    props.setMessage("Traits updated.");
  } catch (error) {
    props.setMessage(isWalletCancelError(error) ? "Trait swap canceled." : String(error));
  } finally {
    swapInFlight.current = false;
    setMintingAction(null);
    setSwapPhase(null);
    props.setProgress(0);
  }
};


  const renderTraitSwapPanel = ({ maxWidth = 1100 } = {}) => {
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
              {traitSwapHelperText}
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
            onClick={swapTraits}
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

  if (loadError) {
    return <div role="alert" style={{ color: "white", padding: 16 }}>
      <Typography>{loadError}</Typography>
      {props.zoom ? <Button onClick={fetchData} sx={{ color: "white" }}>Retry</Button> : null}
    </div>
  }

  if (props.zoom) {
    return (
      <div style={DARK_COIN_UI.page}>
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
            <div style={DARK_COIN_UI.title}>Armoury</div>
            <div style={DARK_COIN_UI.subtitle}>
              Equip your champion and swap their traits
            </div>
          </div>

          <div style={{ padding: "18px 18px 0" }}>
            {renderTraitSwapPanel()}
          </div>

          <div style={DARK_COIN_UI.body}>
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
          <Grid item xs={12}>
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
              <NftImage
                alt={nft?.name || "Champion"}
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

              </Grid>
          </div>
        </div>
      </div>
    )
  } else {
    // non-zoom view
    return (
      <div>
        <NftImage
          alt={nft?.name || "Champion"}
          style={{
            width: "100%",
            maxWidth: 500,
            borderRadius: 0,
            border: "3px solid black",
          }}
          src={nftUrl}
        />
      </div>
    )
  }
}
