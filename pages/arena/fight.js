import React, { useEffect, useMemo, useState } from "react"
import algosdk from "algosdk"
import {
  Grid,
  Button,
  Typography,
  Dialog,
  DialogContent,
  IconButton,
  CircularProgress,
  Chip,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import VisibilityIcon from "@mui/icons-material/Visibility"
import SportsKabaddiIcon from "@mui/icons-material/SportsKabaddi"
import ShieldMoonIcon from "@mui/icons-material/ShieldMoon"
import RefreshIcon from "@mui/icons-material/Refresh"
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"
import { motion, AnimatePresence } from "framer-motion"
import { useWallet } from "@txnlab/use-wallet-react"
import DisplayChar from "../../components/contracts/Arena/DisplayChar"
import Character from "../../components/contracts/Arena/Character"
import { CID } from "multiformats/cid"
import * as mfsha2 from "multiformats/hashes/sha2"
import * as digest from "multiformats/hashes/digest"

const CHAMPION_CREATOR = "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY"
const DARK_RECEIVE_ADDR = "VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM"
const DARK_WAGER_ADDR = "2N75NDVPWJLLLIKYDEVJAHL36BETO3HKDGHGXJAMUWSKGER7HJIPNBDGA4"
const DARK_ASSET_ID = 1088771340
const DARK_WAGER_AMOUNT = 10000000000
const ALGORAND_TXN_GROUP_LIMIT = 16
const ARENA_JOIN_TXNS_PER_CHAMPION = 3
const MAX_ARENA_JOIN_SELECTION = Math.floor(ALGORAND_TXN_GROUP_LIMIT / ARENA_JOIN_TXNS_PER_CHAMPION)

const DARK_COIN_LOGO_SRC = "/invDC.svg"
const ARENA_BG_SRC = "/home/arena.png"
const ARENA_LOGO_SRC = "/home/arenaLogo.png"

const THEME = {
  white: "#f7f7f7",
  silver: "#d8d8d8",
  muted: "rgba(255,255,255,0.68)",
  dim: "rgba(255,255,255,0.42)",
  line: "rgba(255,255,255,0.18)",
  lineSoft: "rgba(255,255,255,0.09)",
}

const medievalText = {
  fontFamily: "serif",
  letterSpacing: "0.24em",
  textTransform: "uppercase",
}

const arenaActionButtonStyle = {
  marginTop: 10,
  minHeight: 42,
  borderRadius: 3,
  color: THEME.white,
  textTransform: "uppercase",
  fontFamily: "serif",
  letterSpacing: "0.18em",
  fontSize: 11,
  fontWeight: 800,
  background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.92))",
  border: `1px solid ${THEME.line}`,
  boxShadow: "inset 0 0 22px rgba(255,255,255,0.03), 0 0 18px rgba(255,255,255,0.04)",
}

const arenaPrimaryButtonStyle = {
  ...arenaActionButtonStyle,
  background: "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(0,0,0,0.95))",
  boxShadow: "inset 0 0 28px rgba(255,255,255,0.06), 0 0 22px rgba(255,255,255,0.09)",
}

function ArenaActionButton({ children, onClick, startIcon, disabled, primary = false }) {
  return (
    <Button
      fullWidth
      disabled={disabled}
      startIcon={startIcon}
      onClick={onClick}
      style={primary ? arenaPrimaryButtonStyle : arenaActionButtonStyle}
    >
      {children}
    </Button>
  )
}

function safeNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function getArenaJoinTxnCount(championCount = 0) {
  return Math.max(0, Math.floor(safeNumber(championCount, 0))) * ARENA_JOIN_TXNS_PER_CHAMPION
}

function makeArenaJoinNote(championAssetId, label, joinNonce, joinIndex) {
  return new Uint8Array(
    Buffer.from(`arena-join:${label}:${championAssetId}:${joinIndex}:${joinNonce}`)
  )
}

function normalizeArray(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.assets)) return payload.assets
  if (Array.isArray(payload?.wallet)) return payload.wallet
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.results)) return payload.results
  return []
}

function getWarriorAsset(warrior) {
  return warrior?.asset || warrior?.nft || warrior
}

function getWarriorAssetId(warrior) {
  const asset = getWarriorAsset(warrior)
  return asset?.index ?? asset?.assetId ?? asset?.asset_id ?? warrior?.assetId ?? warrior?.id ?? null
}

function isDarkCoinChampion(warrior) {
  if (warrior?.asset?.params?.creator === CHAMPION_CREATOR) return true

  const asset = getWarriorAsset(warrior)
  const params = asset?.params || warrior?.params || {}
  return params?.creator === CHAMPION_CREATOR
}

function normalizeCharObject(session) {
  return getCharObjectFromGetNftSession(session)
}

function getNftImageUrl(session) {
  const asset = session?.nft?.assets?.[0]
  const params = asset?.params || {}
  const name = String(params.name || "")

  try {
    if (name.substring(0, 18) === "Dark Coin Champion" && params.reserve) {
      const addr = algosdk.decodeAddress(params.reserve)
      const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)
      const ocid = CID.create(0, 0x70, mhdigest)
      return `https://ipfs.dark-coin.io/ipfs/${ocid.toString()}`
    }
  } catch (error) {
    console.warn("Unable to derive champion image from reserve address:", error)
  }

  if (params.url && String(params.url).startsWith("ipfs://")) {
    return `https://ipfs.dark-coin.io/ipfs/${String(params.url).replace("ipfs://", "")}`
  }

  if (params.url && String(params.url).includes("/ipfs/")) {
    return `https://ipfs.dark-coin.io/ipfs/${String(params.url).split("/ipfs/")[1]}`
  }

  return null
}

function CornerOrnaments() {
  const cornerStyle = {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "rgba(255,255,255,0.34)",
    pointerEvents: "none",
  }

  return (
    <>
      <span style={{ ...cornerStyle, top: 10, left: 10, borderTop: "1px solid", borderLeft: "1px solid" }} />
      <span style={{ ...cornerStyle, top: 10, right: 10, borderTop: "1px solid", borderRight: "1px solid" }} />
      <span style={{ ...cornerStyle, bottom: 10, left: 10, borderBottom: "1px solid", borderLeft: "1px solid" }} />
      <span style={{ ...cornerStyle, bottom: 10, right: 10, borderBottom: "1px solid", borderRight: "1px solid" }} />
    </>
  )
}

function SectionHeader({ eyebrow, title, description, icon, imageSrc }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      style={{ margin: "40px 0 18px", textAlign: "center" }}
    >
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            color: THEME.white,
            background: "radial-gradient(circle, rgba(255,255,255,0.14), rgba(0,0,0,0.96) 62%)",
            border: `1px solid ${THEME.line}`,
            boxShadow: "0 0 0 5px rgba(255,255,255,0.03), 0 0 28px rgba(255,255,255,0.10)",
            overflow: "hidden",
          }}
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt=""
              style={{
                width: 34,
                height: 34,
                objectFit: "contain",
              }}
            />
          ) : (
            icon
          )}
        </div>
      </div>

      <Typography
        variant="caption"
        style={{
          ...medievalText,
          color: THEME.muted,
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        {eyebrow}
      </Typography>

      <Typography
        variant="h4"
        style={{
          ...medievalText,
          color: THEME.white,
          lineHeight: 1.15,
          fontWeight: 500,
          marginTop: 4,
          textShadow: "0 0 24px rgba(255,255,255,0.18)",
        }}
      >
        {title}
      </Typography>

      {description ? (
        <Typography
          variant="body2"
          style={{
            color: THEME.muted,
            maxWidth: 780,
            margin: "10px auto 0",
            fontFamily: "serif",
            letterSpacing: "0.08em",
            lineHeight: 1.7,
          }}
        >
          {description}
        </Typography>
      ) : null}
    </motion.div>
  )
}

function ChampionShell({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.48, delay, ease: "easeOut" }}
      whileHover={{ y: -5, transition: { duration: 0.18 } }}
      style={{
        position: "relative",
        minHeight: "100%",
        padding: 16,
        background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(0,0,0,0.94) 34%, rgba(0,0,0,0.98))",
        border: `1px solid ${THEME.line}`,
        boxShadow: "0 20px 45px rgba(0,0,0,0.72), inset 0 0 35px rgba(255,255,255,0.03)",
        overflow: "hidden",
      }}
    >
      <motion.div
        aria-hidden
        animate={{
          opacity: [0.04, 0.12, 0.04],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: -70,
          left: "50%",
          transform: "translateX(-50%)",
          width: 150,
          height: 150,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.26), rgba(255,255,255,0.05) 45%, transparent 72%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </motion.div>
  )
}

function EmptyPanel({ title, text }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: "relative",
        padding: 34,
        color: THEME.white,
        textAlign: "center",
        background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(0,0,0,0.94))",
        border: `1px solid ${THEME.line}`,
        boxShadow: "inset 0 0 38px rgba(255,255,255,0.03)",
      }}
    >
      <CornerOrnaments />

      <img
        src={ARENA_LOGO_SRC}
        alt="Arena"
        style={{
          width: 68,
          height: 68,
          objectFit: "contain",
          opacity: 0.86,
          marginBottom: 12,
        }}
      />

      <Typography
        variant="h6"
        style={{
          ...medievalText,
          color: THEME.white,
          fontWeight: 500,
        }}
      >
        {title}
      </Typography>

      <Typography
        variant="body2"
        style={{
          color: THEME.muted,
          marginTop: 8,
          fontFamily: "serif",
          letterSpacing: "0.06em",
          lineHeight: 1.6,
        }}
      >
        {text}
      </Typography>
    </motion.div>
  )
}

function getCharObjectFromGetNftSession(session) {
  const raw = session?.charObject
  if (!raw || raw === "none") return null
  if (raw?.charObj) return raw.charObj
  if (raw?.data?.charObj) return raw.data.charObj
  if (raw?.data) return raw.data
  return raw
}

function getChampionObjectMapKey(assetId) {
  return String(assetId || "")
}

function hasChampionObjectRecord(record) {
  return Boolean(record?.exists && record?.charObj)
}

function getChampionObjectName(record, fallback = "Champion Object") {
  return record?.charObj?.name || record?.name || fallback
}

function ChampionObjectNameplate({ record }) {
  const baseStyle = {
    marginTop: 10,
    padding: "10px 12px",
    border: `1px solid ${THEME.lineSoft}`,
    textAlign: "center",
    fontFamily: "serif",
    letterSpacing: "0.11em",
    boxShadow: "inset 0 0 18px rgba(255,255,255,0.025)",
  }

  if (!record) {
    return (
      <div
        style={{
          ...baseStyle,
          color: THEME.muted,
          background: "rgba(255,255,255,0.035)",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        CHECKING CHAMPION OBJECT
      </div>
    )
  }

  if (record.loading) {
    return (
      <div
        style={{
          ...baseStyle,
          color: THEME.muted,
          background: "rgba(255,255,255,0.035)",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        LOADING CHAMPION OBJECT
      </div>
    )
  }

  if (!hasChampionObjectRecord(record)) {
    return (
      <div
        style={{
          ...baseStyle,
          color: "rgba(255,255,255,0.42)",
          background: "rgba(255,255,255,0.02)",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        NO CHARACTER OBJECT FOUND
      </div>
    )
  }

  return (
    <div
      style={{
        ...baseStyle,
        color: THEME.white,
        background: "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(0,0,0,0.82))",
      }}
    >
      <Typography
        variant="caption"
        style={{
          display: "block",
          color: THEME.dim,
          fontFamily: "serif",
          fontWeight: 800,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          lineHeight: 1.1,
        }}
      >
        Champion Object
      </Typography>

      <Typography
        variant="subtitle2"
        style={{
          color: THEME.white,
          fontFamily: "serif",
          fontWeight: 500,
          letterSpacing: "0.12em",
          lineHeight: 1.2,
          marginTop: 4,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={getChampionObjectName(record)}
      >
        {getChampionObjectName(record)}
      </Typography>
    </div>
  )
}

function ChampionObjectModal({ open, onClose, loading, data, contracts, setMessage, sendDiscordMessage }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      PaperProps={{
        style: {
          overflow: "hidden",
          background: "linear-gradient(180deg, #050505, #000000 62%, #080808)",
          border: `1px solid ${THEME.line}`,
          boxShadow: "0 34px 110px rgba(0,0,0,0.86), 0 0 52px rgba(255,255,255,0.07)",
          borderRadius: 0,
        },
      }}
    >
      <DialogContent style={{ padding: 0, position: "relative", minHeight: 420 }}>
        <IconButton
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            color: THEME.white,
            zIndex: 5,
            background: "rgba(0,0,0,0.84)",
            border: `1px solid ${THEME.line}`,
            borderRadius: 0,
          }}
        >
          <CloseIcon />
        </IconButton>

        {loading ? (
          <div style={{ minHeight: 380, display: "grid", placeItems: "center", color: THEME.white }}>
            <CircularProgress style={{ color: THEME.white }} />
          </div>
        ) : data?.assetId ? (
          <div style={{ padding: "clamp(8px,1vw,14px)", color: THEME.white }}>
            <Character
              nftId={data.assetId}
              setMessage={setMessage}
              sendDiscordMessage={sendDiscordMessage}
              contracts={contracts}
              hideSkillTree={true}
              hideDeleteButton={true}
              darkCoinTheme={true}
            />
          </div>
        ) : (
          <EmptyPanel title="Champion object not found" text="The NFT loaded, but no character object was returned." />
        )}
      </DialogContent>
    </Dialog>
  )
}

function HeroPanel({
  windowSize,
  fights,
  challengerRows,
  visibleWalletRows,
  loading,
  fetchData,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65 }}
      style={{
        position: "relative",
        minHeight: windowSize[0] < 720 ? 410 : 500,
        display: "grid",
        placeItems: "center",
        padding: "clamp(28px,5vw,58px) clamp(18px,4vw,52px)",
        overflow: "hidden",
        backgroundImage: `
          linear-gradient(180deg, rgba(0,0,0,0.38), rgba(0,0,0,0.78) 55%, rgba(0,0,0,0.88) 100%),
          url(${ARENA_BG_SRC})
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        border: `1px solid ${THEME.lineSoft}`,
        boxShadow: "inset 0 -90px 90px rgba(0,0,0,0.72), inset 0 0 80px rgba(255,255,255,0.025)",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          opacity: 0.28,
        }}
      />

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 980, textAlign: "center" }}>
        <img
          src={ARENA_LOGO_SRC}
          alt="Arena"
          style={{
            width: windowSize[0] < 560 ? 82 : 110,
            height: windowSize[0] < 560 ? 82 : 110,
            objectFit: "contain",
            marginBottom: 14,
            filter: "drop-shadow(0 0 18px rgba(255,255,255,0.16))",
          }}
        />

        <Typography
          variant="caption"
          style={{
            ...medievalText,
            display: "block",
            color: THEME.silver,
            fontSize: windowSize[0] < 560 ? 12 : 18,
            fontWeight: 500,
            marginBottom: 10,
          }}
        >
          Dark Coin
        </Typography>

        <Typography
          variant={windowSize[0] < 560 ? "h3" : "h1"}
          style={{
            ...medievalText,
            color: THEME.white,
            fontWeight: 400,
            lineHeight: 0.95,
            textShadow: "0 0 18px rgba(255,255,255,0.22), 0 0 40px rgba(255,255,255,0.08)",
            margin: 0,
          }}
        >
          Fight Pits
        </Typography>
      </div>
    </motion.div>
  )
}

function heroChipStyle() {
  return {
    color: THEME.white,
    background: "rgba(0,0,0,0.58)",
    border: `1px solid ${THEME.line}`,
    borderRadius: 0,
    fontFamily: "serif",
    letterSpacing: "0.1em",
    fontWeight: 700,
    boxShadow: "inset 0 0 18px rgba(255,255,255,0.02)",
  }
}

export default function Fight(props) {
  const { activeAddress, signTransactions } = useWallet()

  const [fights, setFights] = useState([])
  const [wallet, setWallet] = useState([])
  const [char, setChar] = useState(null)
  const [windowSize, setWindowSize] = useState([0, 0])
  const [loading, setLoading] = useState(false)
  const [objectModalOpen, setObjectModalOpen] = useState(false)
  const [objectLoading, setObjectLoading] = useState(false)
  const [selectedObjectData, setSelectedObjectData] = useState(null)
  const [championObjectRecords, setChampionObjectRecords] = useState({})
  const [selectedFightAssetIds, setSelectedFightAssetIds] = useState([])
  const [joiningFightAssetIds, setJoiningFightAssetIds] = useState([])
  const [arenaJoinWarning, setArenaJoinWarning] = useState("")

  const fetchedWalletRows = normalizeArray(wallet)
  const propWalletRows = normalizeArray(props.wallet)
  const visibleWalletRows = propWalletRows.length > 0 ? propWalletRows : fetchedWalletRows

  const challengerRows = useMemo(() => {
    return visibleWalletRows.filter((warrior) => isDarkCoinChampion(warrior))
  }, [visibleWalletRows])

  const selectedFightSet = useMemo(
    () => new Set(selectedFightAssetIds.map((assetId) => String(assetId))),
    [selectedFightAssetIds]
  )

  const joiningFightSet = useMemo(
    () => new Set(joiningFightAssetIds.map((assetId) => String(assetId))),
    [joiningFightAssetIds]
  )

  const selectedFightTxnCount = getArenaJoinTxnCount(selectedFightAssetIds.length)

  const visibleChampionAssetIds = useMemo(() => {
    const ids = []

    fights.forEach((fight) => {
      if (fight?.asset) ids.push(fight.asset)
    })

    challengerRows.forEach((warrior) => {
      const assetId = getWarriorAssetId(warrior)
      if (assetId) ids.push(assetId)
    })

    return [...new Set(ids.map((id) => String(id)))]
  }, [fights, challengerRows])

  const fetchChampionObjectRecord = async (assetId) => {
    const key = getChampionObjectMapKey(assetId)
    if (!key) return null

    setChampionObjectRecords((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        loading: true,
      },
    }))

    try {
      const responseNft = await fetch("/api/getNft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nftId: assetId }),
      })

      const session = await responseNft.json()
      const charObj = normalizeCharObject(session)

      const record = {
        loading: false,
        exists: Boolean(charObj),
        assetId,
        session,
        charObj,
        name: charObj?.name || null,
        imageUrl: getNftImageUrl(session),
      }

      setChampionObjectRecords((prev) => ({
        ...prev,
        [key]: record,
      }))

      return record
    } catch (error) {
      console.error("Failed to load champion object record:", assetId, error)

      const record = {
        loading: false,
        exists: false,
        assetId,
        error: String(error?.message || error),
      }

      setChampionObjectRecords((prev) => ({
        ...prev,
        [key]: record,
      }))

      return record
    }
  }


  const getChampionObjectRecordForAsset = (assetId) => {
  return championObjectRecords[getChampionObjectMapKey(assetId)] || null
}

const arenaFightsWithChampionObjects = useMemo(() => {
  return fights.filter((nft) => {
    const objectRecord = getChampionObjectRecordForAsset(nft.asset)
    return hasChampionObjectRecord(objectRecord)
  })
}, [fights, championObjectRecords])

const arenaChampionObjectsStillLoading = useMemo(() => {
  return fights.some((nft) => {
    const objectRecord = getChampionObjectRecordForAsset(nft.asset)
    return !objectRecord || objectRecord.loading
  })
}, [fights, championObjectRecords])

  const fetchData = async () => {
    try {
      setLoading(true)

      if (activeAddress) {
        const response = await fetch("/api/getDcAssets", {
          method: "POST",
          body: JSON.stringify({ address: activeAddress }),
          headers: { "Content-Type": "application/json" },
        })

        const session = await response.json()
        setWallet(session)
      }

      props.setMessage("Finding fight...")

      const response = await fetch("/api/arena/getFights", {
        method: "POST",
        body: JSON.stringify({
          activeAccount: activeAddress,
          contract: props.contracts.arena,
        }),
        headers: { "Content-Type": "application/json" },
      })

      const session = await response.json()
      setFights(Array.isArray(session?.fights) ? session.fights : [])
      props.setMessage("")
    } catch (error) {
      props.sendDiscordMessage(error, "Fetch Select")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeAddress])

  useEffect(() => {
    const windowSizeHandler = () => setWindowSize([window.innerWidth, window.innerHeight])
    windowSizeHandler()
    window.addEventListener("resize", windowSizeHandler)
    return () => window.removeEventListener("resize", windowSizeHandler)
  }, [])

  useEffect(() => {
    visibleChampionAssetIds.forEach((assetId) => {
      const key = getChampionObjectMapKey(assetId)
      const existing = championObjectRecords[key]

      if (!existing) {
        fetchChampionObjectRecord(assetId)
      }
    })
  }, [visibleChampionAssetIds.join("|")])

  useEffect(() => {
    const availableIds = new Set(challengerRows.map((warrior) => String(getWarriorAssetId(warrior) || "")))
    const arenaIds = new Set(fights.map((fight) => String(fight.asset || "")))
    setSelectedFightAssetIds((prev) =>
      prev.filter((assetId) => availableIds.has(String(assetId)) && !arenaIds.has(String(assetId)))
    )
  }, [challengerRows, fights])

  const openChampionObject = async (assetId) => {
    try {
      setObjectModalOpen(true)
      setObjectLoading(true)
      setSelectedObjectData(null)

      const cachedRecord = getChampionObjectRecordForAsset(assetId)
      const record = hasChampionObjectRecord(cachedRecord)
        ? cachedRecord
        : await fetchChampionObjectRecord(assetId)

      if (!hasChampionObjectRecord(record)) {
        setSelectedObjectData(null)
        return
      }

      setSelectedObjectData({
        assetId,
        session: record.session,
        charObj: record.charObj,
        imageUrl: record.imageUrl,
      })
    } catch (error) {
      props.sendDiscordMessage(error, "View Champion Object", activeAddress)
      setSelectedObjectData(null)
    } finally {
      setObjectLoading(false)
    }
  }

  const toggleFightSelection = (assetId) => {
    if (!assetId || joiningFightAssetIds.length) return

    setArenaJoinWarning("")
    setSelectedFightAssetIds((prev) => {
      const key = String(assetId)
      const selected = prev.some((entry) => String(entry) === key)
      if (selected) return prev.filter((entry) => String(entry) !== key)

      const next = [...prev, assetId]
      const nextTxnCount = getArenaJoinTxnCount(next.length)
      if (nextTxnCount > ALGORAND_TXN_GROUP_LIMIT) {
        setArenaJoinWarning(
          `You can select up to ${MAX_ARENA_JOIN_SELECTION} champions at once. Each champion adds ${ARENA_JOIN_TXNS_PER_CHAMPION} transactions, and Algorand groups max out at ${ALGORAND_TXN_GROUP_LIMIT}.`
        )
        return prev
      }

      return next
    })
  }

  const clearFightSelection = () => {
    if (joiningFightAssetIds.length) return
    setArenaJoinWarning("")
    setSelectedFightAssetIds([])
  }

  const buildStartFightTxns = ({ championAssetId, sender, suggestedParams, joinNonce, joinIndex }) => {
    const arenaAppId = Number(props.contracts?.arena || 0)
    const wagerReceiver = arenaAppId ? String(algosdk.getApplicationAddress(arenaAppId)) : DARK_WAGER_ADDR
    const wtxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender,
      receiver: wagerReceiver,
      amount: DARK_WAGER_AMOUNT,
      assetIndex: DARK_ASSET_ID,
      suggestedParams,
      closeRemainderTo: undefined,
      revocationTarget: undefined,
      note: makeArenaJoinNote(championAssetId, "wager", joinNonce, joinIndex),
      lease: undefined,
      rekeyTo: undefined,
    })

    const ftxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender,
      receiver: DARK_RECEIVE_ADDR,
      amount: 100000,
      suggestedParams,
      closeRemainderTo: undefined,
      note: makeArenaJoinNote(championAssetId, "fee", joinNonce, joinIndex),
      lease: undefined,
      rekeyTo: undefined,
    })

    const appArgs = [new Uint8Array(Buffer.from("startFight"))]
    const atxn = algosdk.makeApplicationNoOpTxnFromObject({
      sender,
      suggestedParams,
      appIndex: props.contracts.arena,
      appArgs,
      accounts: [],
      foreignApps: [],
      foreignAssets: [championAssetId],
      note: makeArenaJoinNote(championAssetId, "app", joinNonce, joinIndex),
      lease: undefined,
      rekeyTo: undefined,
      boxes: [],
    })

    return [wtxn, ftxn, atxn]
  }

  const startSelectedFights = async () => {
    const champions = [...new Set(selectedFightAssetIds.map((assetId) => Number(assetId)).filter(Boolean))]
    const txnCount = getArenaJoinTxnCount(champions.length)

    if (!activeAddress) {
      setArenaJoinWarning("Connect your wallet before joining champions into the arena.")
      return
    }
    if (!signTransactions) {
      setArenaJoinWarning("Connected wallet cannot sign arena join transactions.")
      return
    }
    if (!champions.length) {
      setArenaJoinWarning("Select at least one champion to join the arena.")
      return
    }
    if (txnCount > ALGORAND_TXN_GROUP_LIMIT) {
      setArenaJoinWarning(
        `That would create ${txnCount} transactions. Select ${MAX_ARENA_JOIN_SELECTION} or fewer champions.`
      )
      return
    }

    try {
      setJoiningFightAssetIds(champions)
      setArenaJoinWarning("")

      const client = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443)
      const params = await client.getTransactionParams().do()
      const joinNonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`

      const txns = champions.flatMap((championAssetId, joinIndex) =>
        buildStartFightTxns({
          championAssetId,
          sender: activeAddress,
          suggestedParams: params,
          joinNonce,
          joinIndex,
        })
      )
      algosdk.assignGroupID(txns)

      const encodedTxns = txns.map((txn) => algosdk.encodeUnsignedTransaction(txn))

      props.setMessage(
        champions.length === 1
          ? "Sign arena join transaction..."
          : `Sign ${champions.length} arena joins...`
      )
      const signedTransactions = await signTransactions(encodedTxns)

      props.setMessage("Sending arena join group...")
      const { txid } = await client.sendRawTransaction(signedTransactions).do()

      await algosdk.waitForConfirmation(client, txid, 4)

      props.setMessage(champions.length === 1 ? "Fight initialized" : "Fights initialized")
      setChar(null)
      setSelectedFightAssetIds([])

      await Promise.allSettled(champions.map((championAssetId) => sendFightStart(championAssetId)))
      await fetchData()
    } catch (error) {
      setArenaJoinWarning(error?.message || "Arena join failed.")
      await props.sendDiscordMessage(error, "Start Fight", activeAddress)
    } finally {
      setJoiningFightAssetIds([])
    }
  }

  const sendFightStart = async (champ) => {
    try {
      const responseNft = await fetch("/api/getNft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nftId: champ }),
      })

      const session = await responseNft.json()
      const charObject = normalizeCharObject(session)
      const nameChar = charObject?.name || "A Dark Coin Champion"
      const url = getNftImageUrl(session)

      const embeds = [
        {
          title: `${Number(10000).toLocaleString("en-US")} DC to whoever can take down ${nameChar}`,
          color: 0,
        },
        {
          title: nameChar,
          url: `https://explorer.perawallet.app/asset/${champ}`,
          image: { url: String(url || "") },
          color: 16777215,
        },
      ]

      await fetch(process.env.discordWebhook, {
        method: "POST",
        body: JSON.stringify({ username: "Dark Coin Arena", embeds }),
        headers: { "Content-Type": "application/json" },
      })
    } catch (error) {
      await props.sendDiscordMessage(error, "Send Battle", activeAddress)
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "clamp(14px,2vw,28px)",
        backgroundImage: `
          linear-gradient(180deg, rgba(0,0,0,0.72), rgba(0,0,0,0.84)),
          url(${ARENA_BG_SRC})
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        position: "relative",
        overflow: "hidden",
        color: THEME.white,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          opacity: 0.16,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1640, margin: "0 auto" }}>
        <HeroPanel
          windowSize={windowSize}
          fights={fights}
          challengerRows={challengerRows}
          visibleWalletRows={visibleWalletRows}
          loading={loading}
          fetchData={fetchData}
        />

        <SectionHeader
          eyebrow="Bounties"
          title="Champions Waiting in the Arena"
          description=""
          imageSrc={DARK_COIN_LOGO_SRC}
        />

        {arenaFightsWithChampionObjects.length > 0 ? (
        <Grid container spacing={2.2}>
          {arenaFightsWithChampionObjects.map((nft, index) => {
            const objectRecord = getChampionObjectRecordForAsset(nft.asset)

            return (
              <Grid key={`${nft.asset}-${index}`} item xs={12} sm={6} md={4} lg={3} xl={2}>
                <ChampionShell delay={index * 0.035}>
                  <div style={{ minHeight: 320 }}>
                    <DisplayChar
                      nftId={nft.asset}
                      setMessage={props.setMessage}
                      wager={nft.wager}
                      sendDiscordMessage={props.sendDiscordMessage}
                      char={char}
                      contracts={props.contracts}
                    />
                  </div>

                  <ChampionObjectNameplate record={objectRecord} />

                  <ArenaActionButton
                    startIcon={<VisibilityIcon />}
                    onClick={() => openChampionObject(nft.asset)}
                  >
                    View Champion Object
                  </ArenaActionButton>
                </ChampionShell>
              </Grid>
            )
          })}
        </Grid>
      ) : arenaChampionObjectsStillLoading ? (
        <EmptyPanel
          title="Loading arena champions"
          text="Checking champion objects for joined arena champions."
        />
      ) : (
        <EmptyPanel
          title="No active arena bounties"
          text="No joined arena champions currently have character objects."
        />
      )}

        <SectionHeader
          eyebrow="Your Roster"
          title="Choose Challengers"
          description={`Select up to ${MAX_ARENA_JOIN_SELECTION} champions and join them with one wallet signature.`}
          imageSrc={ARENA_LOGO_SRC}
        />

        {challengerRows.length > 0 ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                flexWrap: "wrap",
                marginBottom: 18,
                padding: "14px 16px",
                background: "rgba(0,0,0,0.58)",
                border: `1px solid ${THEME.lineSoft}`,
                borderRadius: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Chip
                  label={`${selectedFightAssetIds.length}/${MAX_ARENA_JOIN_SELECTION} selected`}
                  sx={{
                    color: THEME.white,
                    border: `1px solid ${THEME.line}`,
                    background: "rgba(255,255,255,0.05)",
                    fontFamily: "serif",
                    letterSpacing: "0.08em",
                  }}
                />
                <Typography style={{ color: arenaJoinWarning ? "#f8c15d" : THEME.muted, fontSize: 13 }}>
                  {arenaJoinWarning ||
                    `${selectedFightTxnCount}/${ALGORAND_TXN_GROUP_LIMIT} transactions in this join group. Each champion uses ${ARENA_JOIN_TXNS_PER_CHAMPION}.`}
                </Typography>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 280 }}>
                <Button
                  disabled={!selectedFightAssetIds.length || joiningFightAssetIds.length > 0}
                  onClick={clearFightSelection}
                  style={{
                    minHeight: 38,
                    borderRadius: 4,
                    padding: "0 14px",
                    color: THEME.white,
                    border: `1px solid ${THEME.line}`,
                    background: "rgba(255,255,255,0.04)",
                    fontFamily: "serif",
                    letterSpacing: "0.14em",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  Clear
                </Button>
                <Button
                  disabled={!selectedFightAssetIds.length || joiningFightAssetIds.length > 0}
                  onClick={startSelectedFights}
                  startIcon={
                    joiningFightAssetIds.length > 0 ? (
                      <CircularProgress size={14} style={{ color: "rgba(255,255,255,0.78)" }} />
                    ) : (
                      <SportsKabaddiIcon />
                    )
                  }
                  style={{
                    minHeight: 38,
                    flex: 1,
                    borderRadius: 4,
                    padding: "0 16px",
                    color: THEME.white,
                    border: `1px solid ${THEME.lineStrong}`,
                    background: "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(0,0,0,0.94))",
                    boxShadow: "0 0 18px rgba(255,255,255,0.07)",
                    fontFamily: "serif",
                    letterSpacing: "0.14em",
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: "uppercase",
                  }}
                >
                  {joiningFightAssetIds.length > 0
                    ? `Joining ${joiningFightAssetIds.length}...`
                    : "Join Selected"}
                </Button>
              </div>
            </div>

            <Grid container spacing={2.2}>
            {challengerRows.map((warrior, index) => {
              const assetId = getWarriorAssetId(warrior)
              if (!assetId) return null

              const assetKey = String(assetId)
              const objectRecord = getChampionObjectRecordForAsset(assetId)
              const hasObject = hasChampionObjectRecord(objectRecord)
              const isSelected = selectedFightSet.has(assetKey)
              const isThisFighting = joiningFightSet.has(assetKey)
              const alreadyInArena = fights.some((f) => String(f.asset) === assetKey)
              const maxSelected = selectedFightAssetIds.length >= MAX_ARENA_JOIN_SELECTION
              const selectionDisabled = joiningFightAssetIds.length > 0 || (!isSelected && maxSelected)

              return (
                <Grid key={`${assetId}-${index}`} item xs={12} sm={6} md={4} lg={3} xl={2}>
                  <ChampionShell delay={index * 0.035}>
                    <div
                      style={{
                        minHeight: 320,
                        borderRadius: 6,
                        outline: isSelected ? `2px solid ${THEME.lineStrong}` : "2px solid transparent",
                        boxShadow: isSelected ? "0 0 24px rgba(255,255,255,0.1)" : "none",
                        transition: "outline-color 160ms ease, box-shadow 160ms ease",
                      }}
                    >
                      <DisplayChar
                        nftId={assetId}
                        setNft={(nftId) => setChar(nftId)}
                        setMessage={props.setMessage}
                        sendDiscordMessage={props.sendDiscordMessage}
                        contracts={props.contracts}
                        fights={fights}
                      />
                    </div>

                    <ChampionObjectNameplate record={objectRecord} />

                    {hasObject ? (
                      <>
                        {alreadyInArena ? (
                          <ArenaActionButton disabled>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                fontWeight: 900,
                                opacity: 0.45,
                              }}
                            >
                              <ShieldMoonIcon style={{ fontSize: 16 }} />
                              <span>Already in Arena</span>
                            </span>
                          </ArenaActionButton>
                        ) : (
                          <ArenaActionButton
                            primary={isSelected}
                            disabled={selectionDisabled}
                            onClick={() => toggleFightSelection(assetId)}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                fontWeight: 900,
                              }}
                            >
                              {isThisFighting ? (
                                <>
                                  <CircularProgress size={14} style={{ color: "rgba(255,255,255,0.7)" }} />
                                  <span>Joining...</span>
                                </>
                              ) : isSelected ? (
                                <>
                                  <span>Selected</span>
                                  <span style={{ opacity: 0.62 }}>•</span>
                                  <span>Unselect</span>
                                </>
                              ) : maxSelected ? (
                                <span>Max Selected</span>
                              ) : (
                                <>
                                  <span>Select</span>
                                  <span style={{ opacity: 0.62 }}>•</span>
                                  <span>10,000</span>
                                  <img
                                    src={DARK_COIN_LOGO_SRC}
                                    alt="Dark Coin"
                                    style={{
                                      width: 18,
                                      height: 18,
                                      objectFit: "contain",
                                      filter:
                                        "grayscale(1) brightness(1.35) drop-shadow(0 0 6px rgba(255,255,255,0.18))",
                                    }}
                                  />
                                </>
                              )}
                            </span>
                          </ArenaActionButton>
                        )}

                        <ArenaActionButton
                          startIcon={<VisibilityIcon />}
                          onClick={() => openChampionObject(assetId)}
                        >
                          View Champion Object
                        </ArenaActionButton>
                      </>
                    ) : null}
                  </ChampionShell>
                </Grid>
              )
            })}
            </Grid>
          </>
        ) : (
          <EmptyPanel
            title="No champions found"
            text="No Dark Coin Champion rows were found in props.wallet or the fetched wallet assets."
          />
        )}
      </div>

      <ChampionObjectModal
        open={objectModalOpen}
        onClose={() => setObjectModalOpen(false)}
        loading={objectLoading}
        data={selectedObjectData}
        contracts={props.contracts}
        setMessage={props.setMessage}
        sendDiscordMessage={props.sendDiscordMessage}
      />
    </div>
  )
}
