// components/ItemVotingBoard.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Slider,
  Stack,
  Typography,
} from "@mui/material"
import { motion } from "framer-motion"
import algosdk from "algosdk"
import { useWallet } from "@txnlab/use-wallet-react"
import { getDownloadURL, ref as storageRef } from "firebase/storage"
import { storage } from "../../Firebase/FirebaseInit"
import { CHAMPION_TRAITS as traits, classifyTraitType } from "../../components/contracts/Arena/traitsData"

import { CID } from "multiformats/cid"
import * as mfsha2 from "multiformats/hashes/sha2"
import * as digest from "multiformats/hashes/digest"

const MotionBox = motion(Box)
const MotionCard = motion(Card)

const APP_ID = 3339943603
const ALGOD_BASE = "https://mainnet-api.algonode.cloud"

const DAO_CREATOR = "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE"
const DAO_PREFIX = "Dark Coin DAO"
const ITEM_VOTING_ALLOWED_WALLET = "VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM"

const BOX_SIZE = 8000
const EFFECT_STRIDE = 2000
const AGGREGATE_READ_CONCURRENCY = 4
const ITEM_POTENCY_DAO_SUFFIX = 1037

const algod = new algosdk.Algodv2("", ALGOD_BASE, "")

const WHITE = "rgba(255,255,255,.95)"
const WHITE_DIM = "rgba(255,255,255,.78)"
const EMPTY_ARR = Object.freeze([])

const CATEGORY_ORDER = ["Background", "Skin", "Weapon", "Magic", "Head", "Armour", "Extra"]

const TRAIT_FOLDERS = [
  { type: "Background", folder: "Background" },
  { type: "Skin", folder: "Skin" },
  { type: "Weapon", folder: "Weapon" },
  { type: "Magic", folder: "Magic" },
  { type: "Head", folder: "Head" },
  { type: "Armour", folder: "Armour" },
  { type: "Extra", folder: "Extra" },
]

function shortAddr(addr = "") {
  const s = String(addr || "")
  if (s.length <= 18) return s
  return `${s.slice(0, 8)}…${s.slice(-6)}`
}

function fmtNum(v) {
  if (v === null || v === undefined) return "—"
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  return n.toLocaleString()
}

function fmtAggregate(v) {
  if (v === null || v === undefined) return "—"
  return String(v)
}

function fmtDaoVote(v) {
  if (v === null || v === undefined) return "—"
  return String(v)
}

function stripTrailingSlash(s) {
  return String(s || "").replace(/\/+$/, "")
}

function cleanNameBase(s) {
  return String(s || "")
    .trim()
    .replace(/\.(png|jpg|jpeg|webp|gif)$/i, "")
    .replace(/\s+/g, " ")
}

function guessTraitType({ assetId, name, unitName }) {
  const byId = classifyTraitType(assetId)
  if (byId) return byId

  const n = cleanNameBase(name).toLowerCase()
  const u = cleanNameBase(unitName).toLowerCase()

  if (n.includes("background") || u.includes("background") || u === "bkg" || u.includes("bkg")) return "Background"
  if (n.includes("weapon") || u.includes("weapon")) return "Weapon"
  if (n.includes("magic") || u.includes("magic")) return "Magic"
  if (n.includes("head") || u.includes("head")) return "Head"
  if (n.includes("armour") || n.includes("armor") || u.includes("armour") || u.includes("armor")) return "Armour"
  if (n.includes("extra") || u.includes("extra")) return "Extra"
  if (n.includes("skin") || u.includes("skin")) return "Skin"
  return null
}

function buildCandidateFileBases({ name, unitName }) {
  const raw = cleanNameBase(name)
  const unit = cleanNameBase(unitName)
  const out = new Set()

  if (raw) out.add(raw)
  if (raw && /\sbackground$/i.test(raw)) out.add(raw.replace(/\sbackground$/i, ""))
  if (unit) out.add(unit)

  ;[...out].forEach((v) => {
    out.add(v.replace(/[’']/g, ""))
    out.add(v.replace(/[^\w\s-]/g, ""))
  })

  return [...out].map((x) => x.trim()).filter(Boolean)
}

async function tryDownloadURLOnce(path) {
  try {
    const url = await getDownloadURL(storageRef(storage, path))
    return url || ""
  } catch {
    return ""
  }
}

async function inferFirebaseImageUrlOnce({
  assetId,
  name,
  unitName,
  baseFolder = "warriors",
  extraFolders = EMPTY_ARR,
}) {
  const guessedType = guessTraitType({ assetId, name, unitName })
  const bases = buildCandidateFileBases({ name, unitName })

  const folderOrder = (() => {
    const map = new Map(TRAIT_FOLDERS.map((x) => [x.type, x.folder]))
    const main = map.get(guessedType || "")
    return main ? [main] : TRAIT_FOLDERS.map((x) => x.folder)
  })()

  const roots = [baseFolder, ...(Array.isArray(extraFolders) ? extraFolders : EMPTY_ARR)].filter(Boolean)
  const exts = [".png", ".webp", ".jpg", ".jpeg"]

  for (const root of roots) {
    const rootClean = stripTrailingSlash(root)
    for (const folder of folderOrder) {
      for (const base of bases) {
        for (const ext of exts) {
          const path = `${rootClean}/${folder}/${base}${ext}`
          const url = await tryDownloadURLOnce(path)
          if (url) return url
        }
      }
    }
  }

  for (const root of roots) {
    const rootClean = stripTrailingSlash(root)
    for (const folder of folderOrder) {
      for (const ext of exts) {
        const path = `${rootClean}/${folder}/${assetId}${ext}`
        const url = await tryDownloadURLOnce(path)
        if (url) return url
      }
    }
  }

  return ""
}

function buildVoteItems() {
  const items = []

  for (const cat of CATEGORY_ORDER) {
    const arr = Array.isArray(traits?.[cat]) ? traits[cat] : EMPTY_ARR

    for (const t of arr) {
      if (!t) continue

      const type = String(t.type || cat || "").trim()
      if (!type) continue

      const name = String(t.trait || t.name || "").trim()
      if (!name) continue

      const effects = Array.isArray(t.effects) ? t.effects.filter(Boolean) : EMPTY_ARR

      if (type === "Skin") {
        items.push({
          assetId: null,
          name,
          type: "Skin",
          unitName: "skin",
          total: null,
          effects,
          imageUrl: "",
          boxName: name,
        })
        continue
      }

      const assetId = Number(t.assetId)
      if (!Number.isFinite(assetId) || assetId <= 0) continue

      items.push({
        assetId,
        name,
        type: classifyTraitType(assetId) || type,
        unitName: type.toLowerCase(),
        total: t.total ?? null,
        effects,
        imageUrl: "",
        boxName: name,
      })
    }
  }

  return items
}

function getDaoSuffixFromUnitName(unitName = "") {
  const match = String(unitName).match(/(\d+)$/)
  return match ? Number(match[1]) : null
}

function voteByte(value) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0 || n > 255) {
    throw new Error("Vote value must be an integer from 0 to 255.")
  }
  return new Uint8Array([n])
}

function encodeUtf8(s) {
  return new TextEncoder().encode(String(s))
}

function encodeAsciiInt(n) {
  return new Uint8Array([...String(n)].map((c) => c.charCodeAt(0)))
}

async function runPool(items, concurrency, worker, signal) {
  let i = 0
  const n = items.length
  const workers = Array.from({ length: Math.max(1, concurrency) }).map(async () => {
    while (i < n) {
      if (signal?.aborted) return
      const idx = i++
      await worker(items[idx], idx)
    }
  })
  await Promise.all(workers)
}

function getArc19IpfsUrlFromReserve(reserve) {
  if (!reserve) return ""
  try {
    const addr = algosdk.decodeAddress(reserve)
    const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)
    const cid = CID.create(0, 0x70, mhdigest)
    return "https://ipfs-pera.algonode.dev/ipfs/" + cid.toString()
  } catch {
    return ""
  }
}

function resolveDaoImageFromParams(params) {
  if (!params) return ""
  const url = String(params.url || "")

  if (url.startsWith("ipfs://")) {
    return "https://ipfs-pera.algonode.dev/ipfs/" + url.slice(7)
  }
  if (url.startsWith("https://ipfs.io/ipfs/")) {
    return "https://ipfs-pera.algonode.dev/ipfs/" + url.slice(21)
  }
  if (url.startsWith("https://gateway.ipfs.io/ipfs/")) {
    return "https://ipfs-pera.algonode.dev/ipfs/" + url.slice(29)
  }
  if (url === "template-ipfs://{ipfscid:0:dag-pb:reserve:sha2-256}") {
    return getArc19IpfsUrlFromReserve(params.reserve)
  }

  return ""
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

function getDaoVoteForEffect(boxBytes, effectIndex, daoSuffix) {
  if (!(boxBytes instanceof Uint8Array)) return null
  if (!Number.isInteger(effectIndex) || effectIndex < 0) return null
  if (!Number.isInteger(daoSuffix) || daoSuffix < 0) return null
  if (daoSuffix >= EFFECT_STRIDE) return null

  const offset = effectIndex * EFFECT_STRIDE + daoSuffix
  if (offset < 0 || offset >= boxBytes.length) return null

  const value = boxBytes[offset]
  return value > 0 && value <= 20 ? value : null
}

function computeEffectPotenciesFromDaoVote(boxBytes, effectCount, daoSuffix = ITEM_POTENCY_DAO_SUFFIX) {
  return Array.from({ length: effectCount }, (_unused, effectIndex) =>
    getDaoVoteForEffect(boxBytes, effectIndex, daoSuffix)
  )
}

async function readItemBoxData(item) {
  const boxNameBytes = encodeUtf8(item.boxName)
  const res = await algod.getApplicationBoxByName(APP_ID, boxNameBytes).do()
  const boxBytes = bytesToUint8Array(res?.value)

  return {
    boxBytes,
    potencies: computeEffectPotenciesFromDaoVote(boxBytes, item.effects.length),
  }
}

export default function ItemVotingBoard({
  wallet = [],
  firebaseBaseFolder = "warriors",
  firebaseExtraFolders = EMPTY_ARR,
  imageConcurrency = 4,
}) {
  const { activeAccount, signTransactions } = useWallet()
  const canVoteOnItems =
    String(activeAccount?.address || "").toUpperCase() === ITEM_VOTING_ALLOWED_WALLET

  const [submittingId, setSubmittingId] = useState(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeCategory, setActiveCategory] = useState("Background")
  const [form, setForm] = useState({})
  const [itemsWithImages, setItemsWithImages] = useState(() => buildVoteItems())
  const [imagesLoading, setImagesLoading] = useState(true)
  const [selectedDaoIds, setSelectedDaoIds] = useState([])
  const [itemEffectPotencies, setItemEffectPotencies] = useState({})
  const [itemBoxBytesByKey, setItemBoxBytesByKey] = useState({})
  const [aggregatesLoading, setAggregatesLoading] = useState(true)

  const imageCacheRef = useRef(new Map())
  const inflightRef = useRef(new Set())

  const walletAssets = useMemo(() => (Array.isArray(wallet) ? wallet : []), [wallet])

  const daoAssets = useMemo(() => {
    return walletAssets
      .map((holding) => {
        const asset = holding?.asset
        const params = asset?.params || {}
        const assetId = Number(asset?.index)
        const amount = Number(holding?.amount || 0)
        const name = String(params?.name || "")
        const unitName = String(params?.["unit-name"] || params?.unitName || "")
        const creator = String(params?.creator || "")
        const decimals = Number(params?.decimals || 0)
        const suffix = getDaoSuffixFromUnitName(unitName)

        if (!assetId || amount <= 0) return null
        if (creator !== DAO_CREATOR) return null
        if (!name.startsWith(DAO_PREFIX)) return null
        if (decimals !== 0) return null

        return {
          assetId,
          amount,
          name,
          unitName,
          suffix,
          imageUrl: resolveDaoImageFromParams(params),
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const aHas = Number.isFinite(a.suffix)
        const bHas = Number.isFinite(b.suffix)
        if (aHas && bHas) return a.suffix - b.suffix
        if (aHas) return -1
        if (bHas) return 1
        return a.assetId - b.assetId
      })
  }, [walletAssets])

  useEffect(() => {
    setSelectedDaoIds((prev) => prev.filter((id) => daoAssets.some((x) => x.assetId === id)))
  }, [daoAssets])

  const selectedDaoAssets = useMemo(
    () => daoAssets.filter((x) => selectedDaoIds.includes(x.assetId)),
    [daoAssets, selectedDaoIds]
  )

  const allVoteItems = useMemo(() => itemsWithImages, [itemsWithImages])

  const visibleItems = useMemo(
    () => allVoteItems.filter((x) => x.type === activeCategory),
    [allVoteItems, activeCategory]
  )

  const categoryCounts = useMemo(() => {
    const out = {}
    for (const c of CATEGORY_ORDER) {
      out[c] = allVoteItems.filter((x) => x.type === c).length
    }
    return out
  }, [allVoteItems])

  useEffect(() => {
    const ac = new AbortController()
    setImagesLoading(true)
    setItemsWithImages(buildVoteItems())

    ;(async () => {
      const baseItems = buildVoteItems()

      await runPool(
        baseItems,
        imageConcurrency,
        async (item) => {
          if (ac.signal.aborted) return

          const key =
            item.type === "Skin"
              ? `Skin:${item.name}:${firebaseBaseFolder}:${JSON.stringify(firebaseExtraFolders)}`
              : `${item.type}:${item.assetId}:${item.name}:${item.unitName}:${firebaseBaseFolder}:${JSON.stringify(firebaseExtraFolders)}`

          if (imageCacheRef.current.has(key)) {
            const cached = imageCacheRef.current.get(key)
            if (cached?.url) {
              setItemsWithImages((prev) =>
                prev.map((p) =>
                  p.type === item.type &&
                  ((p.assetId && p.assetId === item.assetId) || (!p.assetId && p.name === item.name))
                    ? { ...p, imageUrl: cached.url }
                    : p
                )
              )
            }
            return
          }

          if (inflightRef.current.has(key)) return
          inflightRef.current.add(key)

          const resolved = await inferFirebaseImageUrlOnce({
            assetId: item.assetId,
            name: item.name,
            unitName: item.unitName,
            baseFolder: firebaseBaseFolder,
            extraFolders: firebaseExtraFolders,
          })

          imageCacheRef.current.set(key, { url: resolved || "" })
          inflightRef.current.delete(key)

          if (resolved && !ac.signal.aborted) {
            setItemsWithImages((prev) =>
              prev.map((p) =>
                p.type === item.type &&
                ((p.assetId && p.assetId === item.assetId) || (!p.assetId && p.name === item.name))
                  ? { ...p, imageUrl: resolved }
                  : p
              )
            )
          }
        },
        ac.signal
      )

      if (!ac.signal.aborted) {
        setImagesLoading(false)
      }
    })().catch((e) => {
      if (!ac.signal.aborted) {
        console.log(e)
        setImagesLoading(false)
      }
    })

    return () => ac.abort()
  }, [firebaseBaseFolder, firebaseExtraFolders, imageConcurrency])

  const refreshItemBoxData = useCallback(async () => {
    try {
      setAggregatesLoading(true)
      const voteItems = buildVoteItems()
      const nextPotencies = {}
      const nextBoxBytes = {}

      await runPool(
        voteItems,
        AGGREGATE_READ_CONCURRENCY,
        async (item) => {
          const itemKey = item.assetId ? `asset-${item.assetId}` : `skin-${item.name}`

          try {
            const { boxBytes, potencies } = await readItemBoxData(item)
            nextPotencies[itemKey] = potencies
            nextBoxBytes[itemKey] = boxBytes
          } catch {
            nextPotencies[itemKey] = Array.from({ length: item.effects.length }, () => null)
            nextBoxBytes[itemKey] = new Uint8Array(BOX_SIZE)
          }
        }
      )

      setItemEffectPotencies(nextPotencies)
      setItemBoxBytesByKey(nextBoxBytes)
    } finally {
      setAggregatesLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        setAggregatesLoading(true)
        const voteItems = buildVoteItems()
        const nextPotencies = {}
        const nextBoxBytes = {}

        await runPool(
          voteItems,
          AGGREGATE_READ_CONCURRENCY,
          async (item) => {
            if (cancelled) return

            const itemKey = item.assetId ? `asset-${item.assetId}` : `skin-${item.name}`

            try {
              const { boxBytes, potencies } = await readItemBoxData(item)
              nextPotencies[itemKey] = potencies
              nextBoxBytes[itemKey] = boxBytes
            } catch {
              nextPotencies[itemKey] = Array.from({ length: item.effects.length }, () => null)
              nextBoxBytes[itemKey] = new Uint8Array(BOX_SIZE)
            }
          }
        )

        if (!cancelled) {
          setItemEffectPotencies(nextPotencies)
          setItemBoxBytesByKey(nextBoxBytes)
        }
      } finally {
        if (!cancelled) {
          setAggregatesLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const setItemForm = (itemKey, patch) => {
    setForm((prev) => ({
      ...prev,
      [itemKey]: {
        ...(prev[itemKey] || {}),
        ...patch,
      },
    }))
  }

  const toggleDaoSelection = (assetId) => {
    setSelectedDaoIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    )
  }

  const submitVote = async (item) => {
    if (!canVoteOnItems) {
      setError("This wallet is not authorized to vote on item potency.")
      return
    }
    if (!activeAccount?.address) {
      setError("Connect a wallet first.")
      return
    }
    if (!signTransactions) {
      setError("Wallet signing is not available.")
      return
    }
    if (!selectedDaoAssets.length) {
      setError("Select at least one DAO NFT before voting.")
      return
    }

    const itemKey = item.assetId ? `asset-${item.assetId}` : `skin-${item.name}`
    const effectIndex = form[itemKey]?.effectIndex
    const potencyValue = Number(form[itemKey]?.voteValue ?? 1)

    if (!Number.isInteger(effectIndex) || effectIndex < 0 || effectIndex >= item.effects.length) {
      setError("Select an effect before voting.")
      return
    }

    if (!Number.isInteger(potencyValue) || potencyValue < 1 || potencyValue > 20) {
      setError("Potency value must be between 1 and 20.")
      return
    }

    setSubmittingId(itemKey)
    setError("")
    setSuccess("")

    try {
      const sp = await algod.getTransactionParams().do()

      const txns = selectedDaoAssets.map((dao) => {
        const foreignAssets = item.assetId ? [item.assetId, dao.assetId] : [dao.assetId]

        return algosdk.makeApplicationNoOpTxnFromObject({
          sender: activeAccount.address,
          appIndex: APP_ID,
          suggestedParams: { ...sp },
          appArgs: item.assetId
          ? [
              encodeUtf8("itemVote"),
              voteByte(potencyValue),
              encodeAsciiInt(effectIndex),
            ]
          : [
              encodeUtf8("itemVote"),
              voteByte(potencyValue),
              encodeAsciiInt(effectIndex),
              encodeUtf8(item.boxName),
            ],
          foreignAssets,
          boxes: [
            { appIndex: APP_ID, name: encodeUtf8(item.boxName) },
            { appIndex: APP_ID, name: encodeUtf8(item.boxName) },
            { appIndex: APP_ID, name: encodeUtf8(item.boxName) },
            { appIndex: APP_ID, name: encodeUtf8(item.boxName) },
          ],
        })
      })

      algosdk.assignGroupID(txns)

      const txnBytes = txns.map((txn) => algosdk.encodeUnsignedTransaction(txn))
      const signed = await signTransactions(txnBytes)
      const sendRes = await algod.sendRawTransaction(signed).do()

      await algosdk.waitForConfirmation(algod, sendRes.txid, 12)
      await refreshItemBoxData()

      setSuccess(
        `Vote submitted for ${item.name} with potency value ${potencyValue}. TxID: ${sendRes.txid}`
      )
    } catch (e) {
      setError(e?.message || "Vote submission failed.")
    } finally {
      setSubmittingId(null)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.99 },
    show: { opacity: 1, y: 0, scale: 1 },
  }

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
            variant="h4"
            sx={{
              fontWeight: 900,
              letterSpacing: -0.3,
              background: "linear-gradient(90deg, #7C3AED 0%, #4F46E5 35%, #22D3EE 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Item Voting
          </Typography>

          <Typography sx={{ color: WHITE_DIM, maxWidth: 900 }}>
            {canVoteOnItems
              ? "Select DAO NFTs from the connected wallet, select one effect on an item, then set the potency value and vote."
              : "View the current item effect potency values used by Dark Coin."}
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip
              size="small"
              label={`App ID: ${APP_ID}`}
              sx={{
                bgcolor: "rgba(255,255,255,.06)",
                color: WHITE,
                border: "1px solid rgba(255,255,255,.10)",
              }}
            />
            <Chip
              size="small"
              label={`Wallet: ${activeAccount?.address ? shortAddr(activeAccount.address) : "Not connected"}`}
              sx={{
                bgcolor: "rgba(255,255,255,.06)",
                color: WHITE,
                border: "1px solid rgba(255,255,255,.10)",
              }}
            />
            {canVoteOnItems ? (
              <Chip
                size="small"
                label={`DAO NFTs in wallet: ${fmtNum(daoAssets.length)}`}
                sx={{
                  bgcolor: "rgba(124,58,237,.10)",
                  color: WHITE,
                  border: "1px solid rgba(124,58,237,.22)",
                }}
              />
            ) : null}
          </Stack>
        </Stack>

        <Card
          sx={{
            display: canVoteOnItems ? "block" : "none",
            borderRadius: 3,
            bgcolor: "rgba(255,255,255,.05)",
            border: "1px solid rgba(255,255,255,.10)",
            backdropFilter: "blur(10px)",
            mb: 2,
          }}
        >
          <CardContent>
            <Typography sx={{ fontWeight: 900, color: WHITE, mb: 1.5 }}>
              Select DAO NFTs
            </Typography>

            {daoAssets.length === 0 ? (
              <Typography sx={{ color: WHITE_DIM }}>
                No Dark Coin DAO NFTs were found in props.wallet.
              </Typography>
            ) : (
              <>
                <Typography sx={{ color: WHITE_DIM, mb: 1.5, fontSize: 13 }}>
                  Click DAO NFT images to toggle them.
                </Typography>

                <Grid container spacing={1.5}>
                  {daoAssets.map((nft) => {
                    const selected = selectedDaoIds.includes(nft.assetId)
                    return (
                      <Grid item xs={6} sm={4} md={3} lg={2.4} key={nft.assetId}>
                        <Button
                          onClick={() => toggleDaoSelection(nft.assetId)}
                          sx={{
                            display: "block",
                            width: "100%",
                            p: 0,
                            textTransform: "none",
                            borderRadius: 3,
                            overflow: "hidden",
                            border: selected
                              ? "2px solid rgba(34,211,238,.85)"
                              : "1px solid rgba(255,255,255,.12)",
                            bgcolor: selected
                              ? "rgba(34,211,238,.08)"
                              : "rgba(255,255,255,.04)",
                            boxShadow: selected ? "0 0 0 2px rgba(34,211,238,.12)" : "none",
                          }}
                        >
                          <Box
                            sx={{
                              aspectRatio: "1 / 1",
                              bgcolor: "rgba(255,255,255,.04)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                              position: "relative",
                            }}
                          >
                            {nft.imageUrl ? (
                              <img
                                src={nft.imageUrl}
                                alt={nft.name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            ) : (
                              <Typography sx={{ color: WHITE_DIM, fontSize: 12, px: 1 }}>
                                No image
                              </Typography>
                            )}

                            <Box
                              sx={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                px: 1,
                                py: 0.4,
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 900,
                                color: WHITE,
                                bgcolor: selected
                                  ? "rgba(34,211,238,.88)"
                                  : "rgba(0,0,0,.55)",
                                border: selected
                                  ? "1px solid rgba(255,255,255,.35)"
                                  : "1px solid rgba(255,255,255,.12)",
                              }}
                            >
                              {selected ? "Selected" : "Select"}
                            </Box>
                          </Box>

                          <Box sx={{ p: 1.1, textAlign: "left" }}>
                            <Typography
                              sx={{
                                color: WHITE,
                                fontWeight: 800,
                                fontSize: 12,
                                lineHeight: 1.2,
                                minHeight: 32,
                              }}
                            >
                              {nft.name}
                            </Typography>
                            <Typography sx={{ color: WHITE_DIM, fontSize: 11, mt: 0.4 }}>
                              {nft.unitName || "DAO NFT"}
                            </Typography>
                            <Typography sx={{ color: WHITE_DIM, fontSize: 11, mt: 0.3 }}>
                              {Number.isFinite(nft.suffix) ? `slot ${nft.suffix} • ` : ""}
                              asset {nft.assetId}
                            </Typography>
                          </Box>
                        </Button>
                      </Grid>
                    )
                  })}
                </Grid>
              </>
            )}
          </CardContent>
        </Card>

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
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              {CATEGORY_ORDER.map((cat) => {
                const active = cat === activeCategory
                return (
                  <Button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    variant="contained"
                    disableElevation
                    sx={{
                      textTransform: "none",
                      borderRadius: 999,
                      px: 1.6,
                      py: 0.8,
                      minHeight: 34,
                      bgcolor: active ? "rgba(34,211,238,.18)" : "rgba(255,255,255,.06)",
                      border: active ? "1px solid rgba(34,211,238,.45)" : "1px solid rgba(255,255,255,.10)",
                      color: WHITE,
                      "&:hover": { bgcolor: active ? "rgba(34,211,238,.22)" : "rgba(255,255,255,.10)" },
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span style={{ fontWeight: 800 }}>{cat}</span>
                      <Chip
                        size="small"
                        label={categoryCounts[cat] || 0}
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

        {!!error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
            {error}
          </Alert>
        )}

        {!!success && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 3 }}>
            {success}
          </Alert>
        )}

        {(imagesLoading || aggregatesLoading) && (
          <Card
            sx={{
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.10)",
              backdropFilter: "blur(10px)",
              mb: 2,
            }}
          >
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography sx={{ color: WHITE_DIM }}>
                  {imagesLoading && aggregatesLoading
                    ? "Resolving item images and on-chain vote data…"
                    : imagesLoading
                    ? "Resolving item images…"
                    : "Loading on-chain vote data…"}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        )}

        <MotionBox variants={containerVariants} initial="hidden" animate="show">
          <Grid container spacing={2}>
            {visibleItems.map((item) => {
              const itemKey = item.assetId ? `asset-${item.assetId}` : `skin-${item.name}`
              const currentEffectIndex = form[itemKey]?.effectIndex
              const currentPotencyValue = Number(form[itemKey]?.voteValue ?? 1)
              const effectPotencies = itemEffectPotencies[itemKey] || []
              const itemBoxBytes = itemBoxBytesByKey[itemKey]

              const hasEffectSelection =
                Number.isInteger(currentEffectIndex) &&
                currentEffectIndex >= 0 &&
                currentEffectIndex < item.effects.length

              return (
                <Grid item xs={12} sm={6} md={4} key={itemKey}>
                  <MotionCard
                    variants={cardVariants}
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    sx={{
                      borderRadius: 3,
                      bgcolor: "rgba(255,255,255,.06)",
                      border: "1px solid rgba(255,255,255,.12)",
                      backdropFilter: "blur(10px)",
                      overflow: "hidden",
                      boxShadow: "0 16px 60px rgba(0,0,0,.45)",
                      height: "100%",
                    }}
                  >
                    <Box
                      sx={{
                        aspectRatio: "16 / 10",
                        bgcolor: "rgba(255,255,255,.04)",
                        borderBottom: "1px solid rgba(255,255,255,.10)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <Typography sx={{ color: WHITE_DIM, fontSize: 13 }}>
                          No image found
                        </Typography>
                      )}
                    </Box>

                    <CardContent sx={{ p: 2 }}>
                      <Stack spacing={1.2}>
                        <Box>
                          <Typography
                            sx={{
                              fontWeight: 900,
                              fontSize: 16,
                              lineHeight: 1.2,
                              color: WHITE,
                            }}
                          >
                            {item.name}
                          </Typography>

                          <Typography sx={{ mt: 0.5, fontSize: 12, color: WHITE_DIM }}>
                            <b style={{ color: WHITE }}>{item.type}</b>
                            {item.assetId ? (
                              <>
                                {" "}• ID: <b style={{ color: WHITE }}>{item.assetId}</b>
                              </>
                            ) : (
                              <> • Skin vote</>
                            )}
                          </Typography>

                          <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                            {item.assetId ? (
                              <Chip
                                size="small"
                                label={`Total: ${fmtNum(item.total)}`}
                                sx={{
                                  bgcolor: "rgba(255,255,255,.06)",
                                  color: WHITE,
                                  border: "1px solid rgba(255,255,255,.12)",
                                }}
                              />
                            ) : (
                              <Chip
                                size="small"
                                label="Skin"
                                sx={{
                                  bgcolor: "rgba(255,255,255,.06)",
                                  color: WHITE,
                                  border: "1px solid rgba(255,255,255,.12)",
                                }}
                              />
                            )}
                          </Stack>
                        </Box>

                        <Divider sx={{ borderColor: "rgba(255,255,255,.10)" }} />

                        <Stack spacing={0.7}>
                          <Typography sx={{ fontSize: 12, fontWeight: 900, color: WHITE }}>
                            {canVoteOnItems ? "Select effect" : "Effects"}
                          </Typography>

                          <Stack direction="row" spacing={0.8} flexWrap="wrap">
                            {item.effects.map((effect, idx) => {
                              const selected = canVoteOnItems && currentEffectIndex === idx
                              const potencyValue = effectPotencies[idx]

                              return (
                                <Chip
                                  key={`${itemKey}:effect:${idx}`}
                                  label={`${effect} • ${fmtAggregate(potencyValue)}`}
                                  onClick={
                                    canVoteOnItems
                                      ? () => setItemForm(itemKey, { effectIndex: idx })
                                      : undefined
                                  }
                                  sx={{
                                    bgcolor: selected ? "rgba(124,58,237,.22)" : "rgba(255,255,255,.06)",
                                    color: WHITE,
                                    border: selected
                                      ? "1px solid rgba(124,58,237,.45)"
                                      : "1px solid rgba(255,255,255,.12)",
                                    cursor: canVoteOnItems ? "pointer" : "default",
                                    mb: 0.8,
                                    "& .MuiChip-label": { px: 1.1, fontSize: 11, fontWeight: 800 },
                                  }}
                                />
                              )
                            })}
                          </Stack>

                          {canVoteOnItems && !hasEffectSelection ? (
                            <Typography sx={{ color: "rgba(255,160,160,.92)", fontSize: 12 }}>
                              Choose one effect before voting.
                            </Typography>
                          ) : null}
                        </Stack>

                        {canVoteOnItems && hasEffectSelection ? (
                          <>
                            <Divider sx={{ borderColor: "rgba(255,255,255,.10)" }} />

                            <Stack spacing={1}>
                              <Typography sx={{ color: WHITE_DIM, fontSize: 12 }}>
                                Potency value
                              </Typography>

                              <Box sx={{ px: 1 }}>
                                <Slider
                                  value={currentPotencyValue}
                                  min={1}
                                  max={20}
                                  step={1}
                                  marks
                                  valueLabelDisplay="auto"
                                  onChange={(_, value) =>
                                    setItemForm(itemKey, {
                                      voteValue: Array.isArray(value) ? value[0] : value,
                                    })
                                  }
                                  sx={{
                                    color: "#22D3EE",
                                    "& .MuiSlider-thumb": {
                                      boxShadow: "0 0 0 6px rgba(34,211,238,.12)",
                                    },
                                  }}
                                />
                              </Box>
                            </Stack>

                            <Divider sx={{ borderColor: "rgba(255,255,255,.10)" }} />
                          </>
                        ) : null}

                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1.2}
                          alignItems={{ xs: "stretch", sm: "center" }}
                          justifyContent="space-between"
                          sx={{ display: canVoteOnItems ? "flex" : "none" }}
                        >
                          <Box
                            sx={{
                              minWidth: 0,
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: 0.75,
                            }}
                          >
                            {selectedDaoAssets.map((dao) => {
                              const existingVote = hasEffectSelection
                                ? getDaoVoteForEffect(itemBoxBytes, currentEffectIndex, dao.suffix)
                                : null

                              return (
                                <Box
                                  key={dao.assetId}
                                  title={
                                    hasEffectSelection
                                      ? existingVote !== null
                                        ? `${dao.name} already voted ${existingVote} for this effect`
                                        : `${dao.name} has not voted for this effect`
                                      : dao.name
                                  }
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.6,
                                    pr: 0.8,
                                    py: 0.2,
                                    borderRadius: 999,
                                    bgcolor: "rgba(255,255,255,.04)",
                                    border: "1px solid rgba(255,255,255,.08)",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: "50%",
                                      overflow: "hidden",
                                      border: "1px solid rgba(255,255,255,.18)",
                                      bgcolor: "rgba(255,255,255,.05)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {dao.imageUrl ? (
                                      <img
                                        src={dao.imageUrl}
                                        alt={dao.name}
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                          display: "block",
                                        }}
                                      />
                                    ) : (
                                      <Typography sx={{ fontSize: 9, color: WHITE_DIM }}>
                                        DAO
                                      </Typography>
                                    )}
                                  </Box>

                                  {hasEffectSelection ? (
                                    <Typography
                                      sx={{
                                        fontSize: 11,
                                        fontWeight: 800,
                                        color: existingVote !== null ? WHITE : WHITE_DIM,
                                        minWidth: 38,
                                        textAlign: "left",
                                        pr: 0.2,
                                      }}
                                    >
                                      {`${fmtDaoVote(existingVote)}`}
                                    </Typography>
                                  ) : null}
                                </Box>
                              )
                            })}
                          </Box>

                          <Box
                            sx={{
                              minWidth: { xs: "100%", sm: 220 },
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 1.2,
                            }}
                          >
                            {hasEffectSelection ? (
                              <Typography
                                sx={{
                                  color: WHITE,
                                  fontSize: 13,
                                  fontWeight: 800,
                                  minWidth: 24,
                                  textAlign: "center",
                                }}
                              >
                                {currentPotencyValue}
                              </Typography>
                            ) : null}

                            <Button
                              variant="contained"
                              disableElevation
                              disabled={
                                submittingId === itemKey ||
                                !canVoteOnItems ||
                                !selectedDaoAssets.length ||
                                !activeAccount?.address ||
                                !hasEffectSelection
                              }
                              onClick={() => submitVote(item)}
                              sx={{
                                textTransform: "none",
                                borderRadius: 999,
                                px: 2,
                                py: 1,
                                bgcolor: "rgba(34,211,238,.16)",
                                color: WHITE,
                                border: "1px solid rgba(34,211,238,.35)",
                                "&:hover": { bgcolor: "rgba(34,211,238,.24)" },
                                "&.Mui-disabled": {
                                  color: "rgba(255,255,255,.45)",
                                  borderColor: "rgba(255,255,255,.08)",
                                  bgcolor: "rgba(255,255,255,.04)",
                                },
                              }}
                            >
                              {submittingId === itemKey ? "Submitting…" : "Vote"}
                            </Button>
                          </Box>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </MotionCard>
                </Grid>
              )
            })}
          </Grid>
        </MotionBox>
      </Box>
    </Box>
  )
}
