import React, { useEffect, useState, useCallback, useRef } from "react"
import PropTypes from "prop-types"
import { useRouter } from "next/router"
import { ThemeProvider } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"
import theme from "../theme"
import "../style.css"

import { Button, Typography, CircularProgress } from "@mui/material"
import CancelIcon from "@mui/icons-material/Cancel"

import {
  WalletManager,
  WalletId,
  NetworkId,
  WalletProvider,
} from "@txnlab/use-wallet-react"

import Nav from "../components/connect/nav"
import Connect from "../components/connect/connect"
import { trackPageView, trackVisitorLocationContext } from "../Firebase/analytics"

const DEPTHS_APP_ID = 3658640544

export default function MyApp(props) {
  const { Component, pageProps } = props
  const router = useRouter()

  const [manager, setManager] = useState(null)

  const [message, setMessage] = useState("")
  const [progress, setProgress] = useState(0)
  const [display, setDisplay] = useState(false)
  const [wallet, setWallet] = useState([])

  // Tracks which wallet addresses have already been fetched during THIS page load.
  // This resets naturally when the user refreshes the page.
  const fetchedWalletAssetsRef = useRef(new Set())
  const trackedLocationContextRef = useRef(false)

  const contracts = {
    council: 1239236238,
    oldArena: 1053328572,
    market: 3069960875,
    airdrop: 1174019649,
    ASAblasters: 1434284594,
    swapper: 1632253886,
    dragonshorde: 1870514811,
    raffle: 2046845196,
    mailbox: 2638261330,
    arena: 3339943603,
    depths: Number(process.env.NEXT_PUBLIC_DEPTHS_APP_ID || DEPTHS_APP_ID),
  }

  const fetchDcAssets = useCallback(async (activeAddress) => {
    if (!activeAddress) return

    const normalizedAddress = String(activeAddress)

    // Prevent repeated Algorand/API calls for the same wallet during one page load.
    if (fetchedWalletAssetsRef.current.has(normalizedAddress)) {
      return
    }

    fetchedWalletAssetsRef.current.add(normalizedAddress)

    try {
      const response = await fetch("/api/getDcAssets", {
        method: "POST",
        body: JSON.stringify({
          address: normalizedAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`getDcAssets failed with status ${response.status}`)
      }

      const session = await response.json()

      console.log("Fetched wallet assets once for page load:", session)

      setWallet(Array.isArray(session) ? session : [])
    } catch (error) {
      console.error("Failed to fetch wallet assets:", error)

      // Allow retry if the request failed.
      fetchedWalletAssetsRef.current.delete(normalizedAddress)
    }
  }, [])

  const sendDiscordMessage = useCallback(async (error, location, address) => {
    try {
      console.log(error)

      await fetch(process.env.discordErrorWebhook, {
        method: "POST",
        body: JSON.stringify({
          embeds: [
            {
              title: String(address) + " " + String(location),
              description: String(error),
            },
          ],
        }),
        headers: { "Content-Type": "application/json" },
      })
    } catch (e) {
      console.error("Failed to send Discord error message:", e)
    }
  }, [])

  useEffect(() => {
    setDisplay(true)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const m = new WalletManager({
      wallets: [WalletId.PERA, WalletId.DEFLY, WalletId.LUTE],
      defaultNetwork: NetworkId.MAINNET,
    })

    setManager(m)

    return () => {
      m?.dispose?.()
    }
  }, [])

  useEffect(() => {
    if (!display || typeof window === "undefined") return

    const trackVisit = (url) => {
      trackPageView(url).catch((error) => {
        console.error("Failed to track page view:", error)
      })

      if (!trackedLocationContextRef.current) {
        trackedLocationContextRef.current = true
        trackVisitorLocationContext(url).catch((error) => {
          console.error("Failed to track visitor location context:", error)
        })
      }
    }

    trackVisit(router.asPath)
    router.events.on("routeChangeComplete", trackVisit)

    return () => {
      router.events.off("routeChangeComplete", trackVisit)
    }
  }, [display, router])

  if (!manager) return null

  return (
    <React.Fragment>
      {/* {message ? (
        <div
          style={{
            border: "1px solid white",
            position: "fixed",
            zIndex: 100,
            top: 15,
            left: 15,
            borderRadius: 5,
            backgroundColor: "#000000",
          }}
        >
          <Button onClick={() => setMessage("")}>
            <CancelIcon style={{ color: "white", marginRight: 20 }} />
          </Button>

          <Typography style={{ color: "#FFFFFF", padding: 20, paddingTop: 10, zIndex: 1000000 }}>
            {message}
          </Typography>

          {progress ? (
            <div>
              <CircularProgress
                variant="determinate"
                value={progress}
                style={{ display: "flex", margin: "auto", color: "white" }}
              />
              <br />
            </div>
          ) : null}
        </div>
      ) : null} */}

      <WalletProvider manager={manager}>
        <ThemeProvider theme={theme}>
          <CssBaseline />

          {display ? (
            <div>
              <Nav />

              <Connect wallet={wallet} fetchDcAssets={fetchDcAssets} />

              <Component
                {...pageProps}
                setMessage={setMessage}
                setProgress={setProgress}
                contracts={contracts}
                sendDiscordMessage={sendDiscordMessage}
                wallet={wallet}
              />
            </div>
          ) : null}
        </ThemeProvider>
      </WalletProvider>
    </React.Fragment>
  )
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired,
}
