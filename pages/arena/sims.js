// components/FightsVideoGallery.jsx
// Requires: firebase/storage + @mui/material + framer-motion (optional)
//
// Features added:
// - Sorts most recent first (uses Storage metadata.updated/timeCreated)
// - Shows a real thumbnail frame extracted from the video (client-side)
// - Uses Storage customMetadata aName + bName to title: "aName vs bName"
// - Player opens in a full-screen Dialog; video area height matches window height
//
// IMPORTANT (thumbnail capture):
// - Capturing a video frame into a canvas requires CORS to be configured for your Firebase Storage bucket.
//   If canvas extraction fails, the component will gracefully fall back to a placeholder thumbnail.
//   (If you want, I can paste a ready-to-run gsutil CORS json for your bucket.)

import React, { useEffect, useMemo, useState } from "react"
import {
  Box,
  Typography,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Dialog,
  DialogContent,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Chip,
} from "@mui/material"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded"
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded"

import { motion } from "framer-motion"

import { ref, listAll, getDownloadURL, getMetadata } from "firebase/storage"
import { storage } from "../../Firebase/FirebaseInit" // <- adjust path

function prettyBytes(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return ""
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
  const v = n / Math.pow(1024, i)
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

function safeDateLabel(iso) {
  const t = iso ? Date.parse(iso) : NaN
  if (!Number.isFinite(t)) return ""
  try {
    return new Date(t).toLocaleString()
  } catch {
    return ""
  }
}

function getFightTitle(item) {
  const a = (item?.aName || "").trim()
  const b = (item?.bName || "").trim()
  if (a && b) return `${a} vs ${b}`
  // fallback to filename without extension
  const base = String(item?.name || "").split("/").pop() || ""
  return base.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim() || "Fight"
}

/**
 * Attempts to extract a thumbnail image from the video URL.
 * Falls back automatically if CORS/canvas extraction fails.
 */
function VideoThumbnail({
  url,
  alt = "thumbnail",
  height = 140,
  seekSeconds = 1.0,
  borderRadius = 0,
}) {
  const [thumb, setThumb] = useState("")
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setThumb("")
    setFailed(false)

    if (!url) {
      setFailed(true)
      return
    }

    const v = document.createElement("video")
    v.crossOrigin = "anonymous" // required for canvas capture (needs bucket CORS configured)
    v.muted = true
    v.playsInline = true
    v.preload = "metadata"
    v.src = url

    const cleanup = () => {
      try {
        v.pause()
        v.removeAttribute("src")
        v.load()
      } catch {}
    }

    const doCapture = async () => {
      try {
        // Wait for metadata so we know dimensions & duration.
        await new Promise((resolve, reject) => {
          const onOk = () => resolve()
          const onErr = () => reject(new Error("metadata error"))
          v.addEventListener("loadedmetadata", onOk, { once: true })
          v.addEventListener("error", onErr, { once: true })
        })

        const t = Math.min(
          Math.max(0.0, seekSeconds),
          Math.max(0.0, (v.duration || seekSeconds) - 0.05)
        )

        // Seek to time
        await new Promise((resolve, reject) => {
          const onOk = () => resolve()
          const onErr = () => reject(new Error("seek error"))
          v.addEventListener("seeked", onOk, { once: true })
          v.addEventListener("error", onErr, { once: true })
          try {
            v.currentTime = t
          } catch (e) {
            reject(e)
          }
        })

        const w = v.videoWidth || 0
        const h = v.videoHeight || 0
        if (!w || !h) throw new Error("no dimensions")

        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("no canvas ctx")

        ctx.drawImage(v, 0, 0, w, h)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82)

        if (!cancelled) setThumb(dataUrl)
      } catch (e) {
        if (!cancelled) setFailed(true)
      } finally {
        cleanup()
      }
    }

    doCapture()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [url, seekSeconds])

  if (failed || !thumb) {
    // Placeholder (still shows a play icon overlay)
    return (
      <Box
        sx={{
          position: "relative",
          height,
          background:
            "linear-gradient(135deg, rgba(120,85,255,0.22), rgba(0,200,255,0.10))",
          borderRadius,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <PlayCircleOutlineRoundedIcon sx={{ fontSize: 56, opacity: 0.9 }} />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            boxShadow: "inset 0 -60px 60px rgba(0,0,0,0.55)",
          }}
        />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        position: "relative",
        height,
        borderRadius,
        overflow: "hidden",
        background: "#000",
      }}
    >
      <Box
        component="img"
        src={thumb}
        alt={alt}
        sx={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          filter: "saturate(1.05) contrast(1.03)",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <PlayCircleOutlineRoundedIcon sx={{ fontSize: 56, opacity: 0.92 }} />
      </Box>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          boxShadow: "inset 0 -60px 60px rgba(0,0,0,0.55)",
        }}
      />
    </Box>
  )
}

export default function FightsVideoGallery({
  folderPath = "fights",
  title = "Fight Videos",
  maxWidth = 1200,
  thumbnailSeekSeconds = 1.0,
}) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const [items, setItems] = useState([]) // { name, fullPath, url, size, updated, timeCreated, aName, bName, contentType }
  const [selected, setSelected] = useState(null)
  const [open, setOpen] = useState(false)

  const load = async () => {
    setErr("")
    setLoading(true)
    try {
      const folderRef = ref(storage, folderPath)
      const res = await listAll(folderRef)

      const out = await Promise.all(
        res.items.map(async (itemRef) => {
          const [url, meta] = await Promise.all([
            getDownloadURL(itemRef),
            getMetadata(itemRef).catch(() => null),
          ])

          // Custom metadata lives at meta.customMetadata
          const cm = meta?.customMetadata || {}

          return {
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            url,
            contentType: meta?.contentType || "",
            size: meta?.size || null,
            updated: meta?.updated || "",
            timeCreated: meta?.timeCreated || "",
            aName: cm?.aName || cm?.aname || "", // tolerate casing differences
            bName: cm?.bName || cm?.bname || "",
          }
        })
      )

      // Sort newest first: updated -> timeCreated -> fallback name
      out.sort((a, b) => {
        const ta = Date.parse(a.updated || a.timeCreated || "")
        const tb = Date.parse(b.updated || b.timeCreated || "")
        const aOk = Number.isFinite(ta)
        const bOk = Number.isFinite(tb)
        if (aOk && bOk) return tb - ta
        if (bOk) return 1
        if (aOk) return -1
        return String(a.name).localeCompare(String(b.name))
      })

      setItems(out)
    } catch (e) {
      console.error(e)
      setErr(
        e?.message ||
          "Failed to load videos. Check Firebase Storage rules and that the folder exists."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderPath])

  const subtitle = useMemo(() => {
    if (loading) return "Loading…"
    if (err) return "Error"
    return items.length ? `${items.length} video${items.length === 1 ? "" : "s"}` : "No videos found"
  }, [loading, err, items.length])

  const onPick = (item) => {
    setSelected(item)
    setOpen(true)
  }

  // Fullscreen player layout constants
  const HEADER_H = 72 // keep in sync with header Box padding/typography

  return (
    <Box sx={{ px: 2, py: 3, maxWidth, mx: "auto" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            {subtitle}
          </Typography>
        </Box>

        <Tooltip title="Reload">
          <span>
            <IconButton
              onClick={load}
              disabled={loading}
              sx={{
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 2,
                color: "white"
              }}
            >
              <RefreshRoundedIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {err ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {items.map((item) => {
            const fightTitle = getFightTitle(item)
            const when = safeDateLabel(item.updated || item.timeCreated)
            const metaLine = [item.size ? prettyBytes(item.size) : "", when].filter(Boolean).join(" • ")

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.fullPath}>
                <Card
                  component={motion.div}
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  sx={{
                    borderRadius: 3,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background:
                      "radial-gradient(1200px 300px at 20% 0%, rgba(130,90,255,0.18), transparent 60%), rgba(0,0,0,0.55)",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <CardActionArea onClick={() => onPick(item)}>
                    <VideoThumbnail
                      url={item.url}
                      alt={fightTitle}
                      height={140}
                      seekSeconds={thumbnailSeekSeconds}
                    />

                    <CardContent sx={{ py: 1.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.6 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 900,
                            lineHeight: 1.15,
                            minWidth: 0,
                            flex: 1,
                            color: "white"
                          }}
                          title={fightTitle}
                          
                        >
                          {fightTitle}
                        </Typography>

                        {(item.aName || item.bName) && (
                          <Chip
                            label="Fight"
                            size="small"
                            sx={{
                              height: 22,
                              fontWeight: 800,
                              borderRadius: 2,
                              border: "1px solid rgba(255,255,255,0.18)",
                              backgroundColor: "rgba(255,255,255,0.06)",
                            }}
                          />
                        )}
                      </Box>

                      <Typography variant="caption" sx={{ opacity: 0.75 }} title={item.fullPath}>
                        {metaLine || item.fullPath}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* Fullscreen player: height matches window (100vh) */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullScreen
        PaperProps={{
          sx: {
            background: "rgba(0,0,0,0.92)",
          },
        }}
      >
        <Box
          sx={{
            height: HEADER_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            px: 2,
            borderBottom: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 950, lineHeight: 1.1 }} noWrap>
              {selected ? getFightTitle(selected) : "Video"}
            </Typography>
            {selected?.fullPath ? (
              <Typography variant="caption" sx={{ opacity: 0.7 }} noWrap>
                {safeDateLabel(selected.updated || selected.timeCreated) || selected.fullPath}
              </Typography>
            ) : null}
          </Box>

          <IconButton onClick={() => setOpen(false)} sx={{ color: "rgba(255,255,255,0.92)" }}>
            <CloseRoundedIcon />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 0 }}>
          <Box
            sx={{
              height: `calc(100vh - ${HEADER_H}px)`,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#000",
            }}
          >
            {selected?.url ? (
              <video
                key={selected.url}
                src={selected.url}
                controls
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            ) : (
              <Box sx={{ p: 3 }}>
                <Alert severity="warning">No video selected.</Alert>
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  )
}
