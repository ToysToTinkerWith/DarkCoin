import React, { useState } from "react"
import { useWallet } from "@txnlab/use-wallet-react"
import algosdk from "algosdk"

import { Button, Typography, Grid, Popover, Divider } from "@mui/material"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"

import { motion } from "framer-motion"
import { useRouter } from "next/router"

import { CID } from "multiformats/cid"
import * as mfsha2 from "multiformats/hashes/sha2"
import * as digest from "multiformats/hashes/digest"

// Firebase Storage (client)
import { getDownloadURL, ref as storageRef } from "firebase/storage"
import { storage } from "../../Firebase/FirebaseInit"

export default function Connect(props) {
  const router = useRouter()

  const {
    wallets,
    activeWallet,
    activeAddress,
    isReady,
    signTransactions,
    transactionSigner,
    algodClient,
  } = useWallet()

  const [open, setOpen] = useState(false)
  const [dc, setDc] = useState(null)
  const [addrAssets, setAddrAssets] = useState([])

  const [windowDimensions, setWindowDimensions] = useState({ innerWidth: 0, innerHeight: 0 })

  // assets popover state
  const [assetsAnchorEl, setAssetsAnchorEl] = useState(null)

  // Trait image cache: { [assetId:number]: string|null }
  const [traitImgById, setTraitImgById] = useState({})

  React.useEffect(() => {
    if (activeAddress) {
      try {
        props.fetchDcAssets(activeAddress)
      } catch (error) {
        console.log(error.toString())
      }
    }
  }, [activeAddress])

  React.useEffect(() => {
    function getWindowDimensions() {
      const { innerWidth: width, innerHeight: height } = window
      return { width, height }
    }
    function handleResize() {
      setWindowDimensions(getWindowDimensions())
    }
    handleResize()

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const DARK_COIN_ID = 1088771340
  const DARK_COIN_ICON = "/invDC.svg"
  const DC_CREATOR_ADDR = "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY"

  // NEW: Trait creator address
  const TRAIT_CREATOR_ADDR = "3SKDMKVJQD7RR62DMOIXVK3CQQWSFXAM2JXMIRDOPLIW4MWWPBWYV3NZ3Y"

  function safeAmountToText(v) {
    if (typeof v === "bigint") return v.toString()
    if (typeof v === "number") return Number.isFinite(v) ? v.toLocaleString() : "0"
    if (typeof v === "string") return v
    return "0"
  }

  // FIXED: format the *wallet holding* amount (asset.amount) with decimals.
  function formatHoldingAmount(asset) {
    if (!asset) return "0"
    let decimals = 0
    if (asset.asset.index == 1088771340) {
      decimals = 6
    }
    const raw = asset?.amount ?? 0

    if (typeof raw === "bigint") {
      if (decimals === 0) return raw.toString()
      const s = raw.toString().padStart(decimals + 1, "0")
      const whole = s.slice(0, -decimals)
      const frac = s.slice(-decimals).replace(/0+$/, "")
      const wholeFmt = Number(whole).toLocaleString()
      return frac ? `${wholeFmt}.${frac}` : wholeFmt
    }

    const n = Number(raw)
    if (!Number.isFinite(n)) return "0"
    if (decimals === 0) return n.toLocaleString()
    return (Math.floor(n / Math.pow(10, decimals))).toLocaleString()
  }

  function getIpfsUrlFromParams(params) {
    if (!params?.reserve) return null
    if (params.creator !== DC_CREATOR_ADDR) return null

    try {
      const addr = algosdk.decodeAddress(params.reserve)
      const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)
      const cid = CID.create(0, 0x70, mhdigest)
      return "https://ipfs.dark-coin.io/ipfs/" + cid.toString()
    } catch (e) {
      console.log(e.toString())
    }
  }

  // NEW: trait type detection (your ranges)
  function getTraitTypeFromAssetId(assetId) {
    const id = Number(assetId)
    if (!Number.isFinite(id)) return null

    if ((id >= 1631153255 && id <= 1631178480) || id === 1792634314 || id === 2311097594) {
      return "Background"
    } else if ((id >= 1631181322 && id <= 1631207955) || id === 1792635942 || id === 1792636565) {
      return "Weapon"
    } else if ((id >= 1631208827 && id <= 1631217677) || id === 1631233542) {
      return "Magic"
    } else if (
      id === 1631224831 ||
      (id >= 1631236045 && id <= 1631275042) ||
      id === 1792637776 ||
      id === 1792640216 ||
      id === 1935442966 ||
      id === 2156520475 ||
      id === 2311097574 ||
      id === 2311097577 ||
      id === 2311097585
    ) {
      return "Head"
    } else if (
      (id >= 1631281879 && id <= 1631305105) ||
      id === 1642179694 ||
      id === 1792660153 ||
      id === 1792645489 ||
      id === 1806077922 ||
      id === 2311097589
    ) {
      return "Armour"
    } else if (
      (id >= 1631307699 && id <= 1631309418) ||
      id === 2156520477 ||
      id === 2311097583
    ) {
      return "Extra"
    }

    return null
  }

  // NEW: convert trait (type + name) -> firebase storage path
  function traitStoragePath(type, name) {
    if (!type || !name) return null

    if (type === "Background") {
      // Your rule:
      // backgroundRef = ref(storage, "warriors/Background/" + Background.slice(0, Background.length - 11) + ".png")
      const base = name.slice(0, Math.max(0, name.length - 11))
      return `warriors/Background/${base}.png`
    }

    // Your rule:
    // ref(storage, "warriors/<Type>/" + <Name> + ".png")
    return `warriors/${type}/${name}.png`
  }

  // NEW: preload firebase URLs for trait assets (creator = TRAIT_CREATOR_ADDR)
  const walletAssets = Array.isArray(props.wallet) ? props.wallet : []

  React.useEffect(() => {
    if (!storage) return
    if (!Array.isArray(walletAssets) || walletAssets.length === 0) return

    let cancelled = false

    async function run() {
      const targets = walletAssets
        .filter((a) => a?.asset.params?.creator === TRAIT_CREATOR_ADDR)
        .map((a) => {
          const id = Number(a?.asset.index)
          const type = getTraitTypeFromAssetId(id)
          const name = a?.asset.params?.name
          const path = traitStoragePath(type, name)
          return { id, path }
        })
        .filter((x) => Number.isFinite(x.id) && x.path)

        console.log(targets)

      // Only fetch what we don't already have (including storing nulls to prevent loops)
      const need = targets.filter((t) => !(t.id in traitImgById))

      console.log(need)

      if (need.length === 0) return

      const results = await Promise.all(
        need.map(async ({ id, path }) => {
          try {
            const url = await getDownloadURL(storageRef(storage, path))
            return [id, url]
          } catch (e) {
            console.log(`Trait image not found for ${id} at ${path}:`, e?.message || e)
            return [id, null]
          }
        })
      )

      if (cancelled) return

      setTraitImgById((prev) => {
        const next = { ...prev }
        for (const [id, url] of results) next[id] = url
        return next
      })
    }

    run()

    return () => {
      cancelled = true
    }
  }, [walletAssets, traitImgById])

  const assetsPopoverOpen = Boolean(assetsAnchorEl)

  return (
    <div style={{ position: "relative", zIndex: 50, backgroundColor: "black", borderRadius: 15 }}>
      <Button onClick={() => setOpen((v) => !v)} style={{}}>
        <div>
          <img
            src={"/home/rectangle.png"}
            style={{ width: "100%", height: 160, position: "fixed", top: 0, left: 0 }}
          />
        </div>

        {router.pathname == "/" ? (
          <div>
            <motion.video
              animate={{ opacity: [0, 1, 1, 0, 0, 0], scale: [1, 2, 0] }}
              transition={{ duration: 7 }}
              autoPlay
              muted
              style={{
                width: 700,
                position: "fixed",
                top: 50,
                left: windowDimensions.width / 2 - 350,
              }}
            >
              <source src={"/flip.mp4"} type="video/mp4" />
            </motion.video>

            <motion.video
              animate={{
                opacity: [0, 0, 0, 1, 1, 1, 1, 1],
                y: ["30vh", "30vh", "30vh", "30vh", "30vh", "30vh", "0vh", "0vh"],
                scale: [1, 1, 1, 1, 1, 1, 0.4, 0.4],
              }}
              transition={{ duration: 10 }}
              autoPlay
              loop
              muted
              style={{
                width: 700,
                position: "fixed",
                top: -120,
                left: windowDimensions.width / 2 - 350,
              }}
            >
              <source src={"/spin.mp4"} type="video/mp4" />
            </motion.video>

            <Typography
              component={motion.div}
              animate={{
                opacity: [0, 0, 0, 0, 0, 1],
                color: ["#000000", "#000000", "#000000", "#FFFFFF"],
              }}
              transition={{ duration: 10 }}
              style={{
                color: "#FFFFFF",
                position: "fixed",
                fontFamily: "Jacques",
                left: windowDimensions.width / 2 + 40,
                padding: 20,
              }}
            >
              {activeWallet ? " Connected " : " Connect Wallet "}
            </Typography>
          </div>
        ) : (
          <div>
            <video
              autoPlay
              loop
              muted
              style={{ width: 280, position: "fixed", top: -5, left: windowDimensions.width / 2 - 140 }}
            >
              <source src={"/spin.mp4"} type="video/mp4" />
            </video>

            <Typography
              style={{
                color: "#FFFFFF",
                position: "fixed",
                fontFamily: "Jacques",
                left: windowDimensions.width / 2 + 40,
                padding: 20,
              }}
            >
              {activeAddress ? " Connected " : " Connect Wallet "}
            </Typography>

            {addrAssets.length > 0 ? (
              <Typography
                style={{
                  color: "#FFFFFF",
                  position: "fixed",
                  fontFamily: "Jacques",
                  left: windowDimensions.width / 2 + 40,
                  padding: 20,
                  paddingTop: 50,
                }}
              >
                {dc?.toLocaleString?.() ?? dc} DARKCOIN
              </Typography>
            ) : null}
          </div>
        )}
      </Button>

      {open ? (
        // Top-right, scrollable wallet/options panel
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 9999,

            backgroundColor: "black",
            border: "1px solid white",
            borderRadius: 15,

            width: "min(420px, 92vw)",
            maxHeight: "calc(100vh - 32px)",

            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {activeWallet ? (
            <div
              style={{
                padding: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                position: "sticky",
                top: 0,
                zIndex: 2,
                backgroundColor: "black",
                borderBottom: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              <Button onClick={() => navigator.clipboard.writeText(activeAddress)}>
                <ContentCopyIcon style={{ color: "#FFFFFF" }} />
              </Button>

              <Typography style={{ color: "#FFFFFF" }} variant="caption">
                {activeAddress.substring(0, 10)}
              </Typography>

              <Button
                variant="outlined"
                onClick={(e) => setAssetsAnchorEl(e.currentTarget)}
                style={{
                  marginLeft: 6,
                  borderRadius: 15,
                  color: "#FFFFFF",
                  border: "1px solid rgba(255,255,255,0.7)",
                  padding: "6px 10px",
                  whiteSpace: "nowrap",
                }}
              >
                Assets ({walletAssets.length})
              </Button>

              <Popover
                open={assetsPopoverOpen}
                anchorEl={assetsAnchorEl}
                onClose={() => setAssetsAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                PaperProps={{
                  style: {
                    backgroundColor: "black",
                    border: "1px solid rgba(255,255,255,0.4)",
                    borderRadius: 15,
                    padding: 14,
                    maxWidth: 520,
                    width: "92vw",
                  },
                }}
              >
                <div style={{ minWidth: 320 }}>
                  <Typography style={{ color: "#FFFFFF", fontFamily: "Jacques", marginBottom: 10 }}>
                    Wallet Assets
                  </Typography>

                  <div style={{ maxHeight: 520, overflowY: "auto", paddingRight: 6 }}>
                    {walletAssets.length === 0 ? (
                      <Typography style={{ color: "rgba(255,255,255,0.7)" }} variant="body2">
                        No assets found in props.wallet.
                      </Typography>
                    ) : (
                      walletAssets.map((asset) => {
                        const idNum = Number(asset?.asset.index)
                        const isDc = idNum === DARK_COIN_ID
                        const isTraitCreator = asset?.asset.params?.creator === TRAIT_CREATOR_ADDR

                        const name = isDc
                          ? "Dark Coin"
                          : asset?.asset.params?.name || asset?.asset.params?.unitName || `ASA ${asset?.asset.index}`

                        // Image selection priority:
                        // 1) Dark Coin icon
                        // 2) Trait creator => Firebase URL
                        // 3) DC-creator templated ipfs => ipfs.dark-coin.io
                        const imgSrc =
                          isDc
                            ? DARK_COIN_ICON
                            : (isTraitCreator ? traitImgById[idNum] : null) || getIpfsUrlFromParams(asset?.asset.params)

                            console.log(imgSrc)

                        const amountText = formatHoldingAmount(asset)

                        return (
                          <div key={asset?.index}>
                            <Grid container spacing={1} alignItems="center" style={{ padding: "10px 6px" }}>
                              <Grid item>
                                <div
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    border: "1px solid rgba(255,255,255,0.25)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                    background: "rgba(255,255,255,0.04)",
                                  }}
                                >
                                  {imgSrc ? (
                                    <img
                                      src={imgSrc}
                                      alt={name}
                                      style={{ width: 44, height: 44, objectFit: "cover" }}
                                    />
                                  ) : (
                                    <Typography variant="caption" style={{ color: "rgba(255,255,255,0.65)" }}>
                                      N/A
                                    </Typography>
                                  )}
                                </div>
                              </Grid>

                              <Grid item xs>
                                <Typography style={{ color: "#FFFFFF" }}>{name}</Typography>

                                <Typography variant="caption" style={{ color: "rgba(255,255,255,0.7)" }}>
                                  ID: {asset?.asset.index}
                                  {isTraitCreator ? (
                                    <>
                                      {" "}
                                      • {getTraitTypeFromAssetId(asset?.index) || "Trait"}
                                    </>
                                  ) : null}
                                </Typography>
                              </Grid>

                              <Grid item>
                                <Typography style={{ color: "#FFFFFF", fontFamily: "Jacques" }}>
                                  {amountText}
                                </Typography>
                              </Grid>
                            </Grid>

                            <Divider style={{ background: "rgba(255,255,255,0.15)" }} />
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </Popover>

              <div style={{ marginLeft: "auto" }}>
                <Button
                  variant="outlined"
                  onClick={() => setOpen(false)}
                  style={{
                    borderRadius: 15,
                    color: "#FFFFFF",
                    border: "1px solid rgba(255,255,255,0.5)",
                    padding: "6px 10px",
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                position: "sticky",
                top: 0,
                zIndex: 2,
                backgroundColor: "black",
                borderBottom: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              <Button
                variant="outlined"
                onClick={() => setOpen(false)}
                style={{
                  borderRadius: 15,
                  color: "#FFFFFF",
                  border: "1px solid rgba(255,255,255,0.5)",
                  padding: "6px 10px",
                }}
              >
                Close
              </Button>
            </div>
          )}

          <div style={{ paddingBottom: 10 }}>
            {wallets?.map((provider) => (
              <div key={"provider-" + provider.metadata.id} style={{ margin: 18, marginTop: 0 }}>
                <Typography style={{ color: "#FFFFFF" }}>
                  <img
                    width={30}
                    height={30}
                    style={{ margin: 10, color: "#FAFAFA", borderRadius: 15 }}
                    alt=""
                    src={provider.metadata.icon}
                  />
                  {provider.metadata.name} {provider.isActive && "[active]"}
                </Typography>

                <div>
                  <hr />

                  {!provider.isConnected ? (
                    <Button
                      variant="text"
                      style={{
                        borderRadius: 15,
                        display: "flex",
                        margin: "auto",
                        color: "#FFFFFF",
                        border: "1px solid white",
                        padding: 10,
                      }}
                      onClick={provider.connect}
                    >
                      Connect
                    </Button>
                  ) : null}

                  {provider.isConnected ? (
                    <Button
                      variant="text"
                      style={{
                        borderRadius: 15,
                        display: "flex",
                        margin: "auto",
                        color: "#FFFFFF",
                        border: "1px solid white",
                        padding: 10,
                      }}
                      onClick={provider.disconnect}
                    >
                      Disconnect
                    </Button>
                  ) : null}

                  {provider.isConnected && !provider.isActive ? (
                    <Button
                      variant="outlined"
                      style={{ borderRadius: 15, display: "flex", margin: "auto", color: "#FFFFFF" }}
                      onClick={provider.setActiveProvider}
                    >
                      Set Active
                    </Button>
                  ) : null}

                  <div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
    </div>
  )
}
