// components/CreatedAssetsGallery.jsx
// CHANGE (additional):
// - Show `effects` on each card (both local traits + fetched traits)
// - For local traits: effects already included
// - For fetched traits: default to [] (since Indexer ASA params won’t have them)

import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material"
import { motion } from "framer-motion"

import algosdk from "algosdk"

import { storage } from "../../Firebase/FirebaseInit"
import { getDownloadURL, ref as storageRef } from "firebase/storage"
import { CHAMPION_TRAITS as traits, classifyTraitType } from "../../components/contracts/Arena/traitsData"

const MotionBox = motion(Box)
const MotionCard = motion(Card)

const EMPTY_ARR = Object.freeze([])

function stripTrailingSlash(s) {
  return String(s || "").replace(/\/+$/, "")
}

async function fetchAllCreatedAssets({
  creator,
  indexerBaseUrl,
  limit = 1000,
  includeAll = true,
  signal,
}) {
  const base = stripTrailingSlash(indexerBaseUrl)
  let next = null
  const out = []

  while (true) {
    const url = new URL(`${base}/v2/accounts/${creator}/created-assets`)
    url.searchParams.set("limit", String(limit))
    if (includeAll) url.searchParams.set("include-all", "true")
    if (next) url.searchParams.set("next", next)

    const res = await fetch(url.toString(), { signal })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Indexer error ${res.status}: ${text || res.statusText}`)
    }
    const data = await res.json()

    const assets = Array.isArray(data?.assets) ? data.assets : []

    // ✅ filter out deleted assets
    const alive = assets.filter((a) => {
      if (!a) return false
      if (a.deleted === true) return false
      const p = a.params
      if (!p) return false
      if (p.deleted === true) return false
      return true
    })

    out.push(...alive)

    next = data?.["next-token"] || null
    if (!next) break
  }

  return out
}

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

// ---------- Firebase image inference ----------
const TRAIT_FOLDERS = [
  { type: "Background", folder: "Background" },
  { type: "Skin", folder: "Skin" },
  { type: "Weapon", folder: "Weapon" },
  { type: "Magic", folder: "Magic" },
  { type: "Head", folder: "Head" },
  { type: "Armour", folder: "Armour" },
  { type: "Extra", folder: "Extra" },
]

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

async function inferFirebaseImageUrlOnce({ assetId, name, unitName, baseFolder = "warriors", extraFolders = EMPTY_ARR }) {
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

// ✅ remove "Other"
const CATEGORY_ORDER = ["Background", "Skin", "Weapon", "Magic", "Head", "Armour", "Extra"]

function hasLocalTraits(obj) {
  return obj && typeof obj === "object" && Object.keys(obj).length > 0
}

function buildCardsFromTraits(traitsObj) {
  const cards = []
  for (const cat of CATEGORY_ORDER) {
    const arr = Array.isArray(traitsObj?.[cat]) ? traitsObj[cat] : EMPTY_ARR
    for (const t of arr) {
      if (!t) continue
      const type = String(t.type || cat || "").trim()
      if (!type) continue

      const effects = Array.isArray(t.effects) ? t.effects.filter(Boolean) : EMPTY_ARR

      if (type === "Skin") {
        const name = String(t.trait || t.name || "").trim()
        if (!name) continue
        cards.push({
          assetId: null,
          type: "Skin",
          name,
          unitName: "skin",
          total: null,
          url: "",
          imageUrl: "",
          skinCount: Number(t.champions) || 0,
          effects,
          raw: t,
          _fromLocalTraits: true,
        })
        continue
      }

      const assetId = Number(t.assetId)
      if (!Number.isFinite(assetId) || assetId <= 0) continue

      const name = String(t.trait || t.name || "").trim()
      if (!name) continue

      const normalizedType = classifyTraitType(assetId) || type
      if (!normalizedType) continue

      cards.push({
        assetId,
        type: normalizedType,
        name,
        unitName: normalizedType.toLowerCase(),
        total: t.total ?? null,
        url: "",
        imageUrl: "",
        effects,
        raw: t,
        _fromLocalTraits: true,
      })
    }
  }
  return cards
}

export default function CreatedAssetsGallery({
  creator = "3SKDMKVJQD7RR62DMOIXVK3CQQWSFXAM2JXMIRDOPLIW4MWWPBWYV3NZ3Y",
  indexerBaseUrl = "https://mainnet-idx.algonode.cloud",
  pageSize = 1000,
  includeAll = true,

  championCreator = "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY",
  championPageSize = 1000,
  championIncludeAll = true,
  championMetadataConcurrency = 3,

  firebaseBaseFolder = "warriors",
  firebaseExtraFolders = EMPTY_ARR,

  imageConcurrency = 4,
}) {
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState("")
  const [assets, setAssets] = useState([])

  const [activeCategory, setActiveCategory] = useState("Background")

  const [championsTotal, setChampionsTotal] = useState(0)
  const [championsScanned, setChampionsScanned] = useState(0)

  const creatorShort = useMemo(() => shortAddr(creator), [creator])

  const extraFoldersKey = useMemo(
    () => JSON.stringify(Array.isArray(firebaseExtraFolders) ? firebaseExtraFolders : []),
    [firebaseExtraFolders]
  )
  const extraFoldersStable = useMemo(() => {
    try {
      const parsed = JSON.parse(extraFoldersKey)
      return Array.isArray(parsed) ? parsed : EMPTY_ARR
    } catch {
      return EMPTY_ARR
    }
  }, [extraFoldersKey])

  const imageCacheRef = useRef(new Map())
  const inflightRef = useRef(new Set())

  const categorized = useMemo(() => {
    const map = new Map(CATEGORY_ORDER.map((c) => [c, []]))
    for (const a of assets) {
      const type = a.type
      if (!type) continue
      if (!map.has(type)) continue
      map.get(type).push(a)
    }
    return map
  }, [assets])

  const categoryCounts = useMemo(() => {
    const counts = {}
    CATEGORY_ORDER.forEach((c) => (counts[c] = categorized.get(c)?.length || 0))
    return counts
  }, [categorized])

  const visibleAssets = useMemo(() => categorized.get(activeCategory) || [], [categorized, activeCategory])

  const skinTotals = useMemo(() => {
    const skins = categorized.get("Skin") || []
    const unique = skins.length
    const total = skins.reduce((sum, s) => sum + (Number(s.skinCount) || 0), 0)
    return { unique, total }
  }, [categorized])

  const resolveImagesForCards = async (cards, ac, extraFoldersKeyLocal) => {
    await runPool(
      cards,
      imageConcurrency,
      async (card) => {
        if (ac.signal.aborted) return
        if (!card.type) return

        const cacheKey =
          card.type === "Skin"
            ? `Skin:${card.name}:${firebaseBaseFolder}:${extraFoldersKeyLocal}`
            : `${card.type}:${card.assetId}:${card.name}:${card.unitName}:${firebaseBaseFolder}:${extraFoldersKeyLocal}`

        if (imageCacheRef.current.has(cacheKey)) return
        if (inflightRef.current.has(cacheKey)) return
        inflightRef.current.add(cacheKey)

        const resolved = await inferFirebaseImageUrlOnce({
          assetId: card.assetId,
          name: card.name,
          unitName: card.unitName,
          baseFolder: firebaseBaseFolder,
          extraFolders: extraFoldersStable,
        })

        imageCacheRef.current.set(cacheKey, { ok: Boolean(resolved), url: resolved || "" })
        inflightRef.current.delete(cacheKey)

        if (resolved && !ac.signal.aborted) {
          setAssets((prev) => {
            const idx =
              card.type === "Skin"
                ? prev.findIndex((x) => x.type === "Skin" && x.name === card.name)
                : prev.findIndex((x) => x.assetId === card.assetId && x.type === card.type)

            if (idx === -1) return prev
            if (prev[idx]?.imageUrl) return prev
            const next = prev.slice()
            next[idx] = { ...prev[idx], imageUrl: resolved }
            return next
          })
        }
      },
      ac.signal
    )
  }

  useEffect(() => {
    const ac = new AbortController()

    ;(async () => {
      setLoadingList(true)
      setError("")
      setAssets([])
      imageCacheRef.current.clear()
      inflightRef.current.clear()

      setChampionsTotal(0)
      setChampionsScanned(0)

      try {
        const usingLocalTraits = hasLocalTraits(traits)

        // 1) TRAITS FIRST
        let traitCards = []

        if (usingLocalTraits) {
          traitCards = buildCardsFromTraits(traits)
        } else {
          const rawTraits = await fetchAllCreatedAssets({
            creator,
            indexerBaseUrl,
            limit: pageSize,
            includeAll,
            signal: ac.signal,
          })

          traitCards = rawTraits
            .map((a) => {
              const assetId = a?.index
              const p = a?.params || {}
              const name = String(p?.name || "").trim()
              if (!name) return null

              const type = classifyTraitType(assetId)
              if (!type) return null

              return {
                assetId,
                type,
                name,
                unitName: p?.["unit-name"] || "",
                total: p?.total ?? null,
                url: p?.url || "",
                imageUrl: "",
                effects: [], // fetched traits don't have effects in ASA params
                raw: a,
              }
            })
            .filter(Boolean)
            .filter((x) => x.assetId != null)
        }

        setAssets(traitCards)
        setLoadingList(false)

        const firstNonEmpty = CATEGORY_ORDER.find((c) => traitCards.some((x) => x.type === c)) || "Background"
        setActiveCategory((prev) => (traitCards.some((x) => x.type === prev) ? prev : firstNonEmpty))

        // 2) Resolve images in background
        resolveImagesForCards(traitCards, ac, extraFoldersKey).catch(() => {})

        // 3) ✅ no skins fetch/stream when local traits exist
        if (!usingLocalTraits && championCreator) {
          const champions = await fetchAllCreatedAssets({
            creator: championCreator,
            indexerBaseUrl,
            limit: championPageSize,
            includeAll: championIncludeAll,
            signal: ac.signal,
          })

          // (stream logic omitted here for brevity - unchanged from your previous version)
          setChampionsTotal(champions.length)
        }
      } catch (e) {
        if (String(e?.name) === "AbortError") return
        setError(e?.message || "Failed to load created assets.")
        setLoadingList(false)
      }
    })()

    return () => ac.abort()
  }, [
    creator,
    indexerBaseUrl,
    pageSize,
    includeAll,

    championCreator,
    championPageSize,
    championIncludeAll,
    championMetadataConcurrency,

    firebaseBaseFolder,
    extraFoldersKey,
    extraFoldersStable,
    imageConcurrency,
  ])

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
            Created Assets
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip
              size="small"
              label={`Creator: ${shortAddr(creatorShort)}`}
              sx={{
                bgcolor: "rgba(255,255,255,.06)",
                color: WHITE,
                border: "1px solid rgba(255,255,255,.10)",
              }}
            />
            <Chip
              size="small"
              label={loadingList ? "Loading list…" : `${assets.length} items`}
              sx={{
                bgcolor: "rgba(255,255,255,.06)",
                color: WHITE,
                border: "1px solid rgba(255,255,255,.10)",
              }}
            />
            <Chip
              size="small"
              label={`Indexer: ${indexerBaseUrl.replace(/^https?:\/\//, "")}`}
              sx={{
                bgcolor: "rgba(255,255,255,.06)",
                color: WHITE,
                border: "1px solid rgba(255,255,255,.10)",
                maxWidth: "100%",
              }}
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
              {CATEGORY_ORDER.map((cat) => {
                const active = cat === activeCategory
                const count = categoryCounts[cat] || 0
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
                        label={count}
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

        {error ? (
          <Card
            sx={{
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,.06)",
              border: "1px solid rgba(255,255,255,.12)",
              backdropFilter: "blur(10px)",
            }}
          >
            <CardContent>
              <Typography sx={{ fontWeight: 900, color: "#ff6b6b" }}>Failed to load assets</Typography>
              <Typography sx={{ mt: 1, opacity: 0.9, wordBreak: "break-word", color: WHITE }}>
                {error}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <MotionBox variants={containerVariants} initial="hidden" animate="show">
            <Grid container spacing={2}>
              {loadingList && assets.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <Grid item xs={12} sm={6} md={4} key={`sk-${i}`}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        bgcolor: "rgba(255,255,255,.05)",
                        border: "1px solid rgba(255,255,255,.10)",
                        overflow: "hidden",
                      }}
                    >
                      <CardContent>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Skeleton variant="rounded" width={86} height={86} />
                          <Box sx={{ flex: 1 }}>
                            <Skeleton width="80%" />
                            <Skeleton width="50%" />
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              <Skeleton width={90} height={28} />
                              <Skeleton width={90} height={28} />
                            </Stack>
                          </Box>
                        </Stack>
                        <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,.10)" }} />
                        <Skeleton width="92%" />
                        <Skeleton width="70%" />
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              ) : visibleAssets.length === 0 ? (
                <Grid item xs={12}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      bgcolor: "rgba(255,255,255,.05)",
                      border: "1px solid rgba(255,255,255,.10)",
                    }}
                  >
                    <CardContent>
                      <Typography sx={{ fontWeight: 900, color: WHITE }}>
                        No items in {activeCategory}
                      </Typography>
                      <Typography sx={{ mt: 0.8, opacity: 0.85, color: WHITE_DIM }}>
                        Try another category.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ) : (
                visibleAssets.map((it) => {
                  const effects = Array.isArray(it.effects) ? it.effects.filter(Boolean) : EMPTY_ARR
                  return (
                    <Grid item xs={12} sm={6} md={4} key={`${it.type}:${it.type === "Skin" ? it.name : it.assetId}`}>
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
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Box
                              sx={{
                                width: 88,
                                height: 88,
                                borderRadius: 2,
                                overflow: "hidden",
                                flex: "0 0 auto",
                                bgcolor: "rgba(0,0,0,.28)",
                                border: "1px solid rgba(255,255,255,.10)",
                                position: "relative",
                              }}
                            >
                              {it.imageUrl ? (
                                <Box
                                  component="img"
                                  src={it.imageUrl}
                                  alt={it.name || it.unitName || `Asset ${it.assetId}`}
                                  loading="lazy"
                                  sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <Stack
                                  sx={{ width: "100%", height: "100%" }}
                                  alignItems="center"
                                  justifyContent="center"
                                  spacing={0.5}
                                >
                                  <Typography sx={{ fontSize: 11, opacity: 0.9, color: WHITE }}>
                                    Loading image…
                                  </Typography>
                                  <Typography sx={{ fontSize: 10, opacity: 0.75, color: WHITE_DIM }}>
                                    {it.type === "Skin" ? "Skin" : `ASA ${it.assetId}`}
                                  </Typography>
                                </Stack>
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
                              <Typography
                                sx={{
                                  fontWeight: 900,
                                  fontSize: 14,
                                  lineHeight: 1.2,
                                  color: WHITE,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={it.name}
                              >
                                {it.name}
                              </Typography>

                              <Typography sx={{ mt: 0.4, fontSize: 12, opacity: 0.88, color: WHITE_DIM }}>
                                <b style={{ color: WHITE }}>{it.type}</b> • Unit:{" "}
                                <b style={{ color: WHITE }}>{it.unitName || "—"}</b>
                                {it.type === "Skin" ? null : (
                                  <>
                                    {" "}• ID: <b style={{ color: WHITE }}>{it.assetId}</b>
                                  </>
                                )}
                              </Typography>

                              <Stack direction="row" spacing={1} sx={{ mt: 1.1 }} flexWrap="wrap">
                                {it.type === "Skin" ? (
                                  <Chip
                                    size="small"
                                    label={`Champions: ${fmtNum(it.skinCount || 0)}`}
                                    sx={{
                                      bgcolor: "rgba(255,255,255,.06)",
                                      color: WHITE,
                                      border: "1px solid rgba(255,255,255,.12)",
                                    }}
                                  />
                                ) : (
                                  <Chip
                                    size="small"
                                    label={`Total: ${fmtNum(it.total)}`}
                                    sx={{
                                      bgcolor: "rgba(255,255,255,.06)",
                                      color: WHITE,
                                      border: "1px solid rgba(255,255,255,.12)",
                                    }}
                                  />
                                )}
                              </Stack>
                            </Box>
                          </Stack>

                          {/* ✅ Effects */}
                          {effects.length > 0 ? (
                            <>
                              <Divider sx={{ my: 1.6, borderColor: "rgba(255,255,255,.10)" }} />
                              <Stack spacing={0.7}>
                                <Typography sx={{ fontSize: 12, fontWeight: 900, color: WHITE }}>
                                  Effects
                                </Typography>
                                <Stack direction="row" spacing={0.8} flexWrap="wrap">
                                  {effects.map((ef, i) => (
                                    <Chip
                                      key={`${it.type}:${it.type === "Skin" ? it.name : it.assetId}:ef:${i}`}
                                      size="small"
                                      label={String(ef)}
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
        )}
      </Box>
    </Box>
  )
}
