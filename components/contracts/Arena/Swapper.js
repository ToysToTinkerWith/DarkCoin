import React, { useState, useEffect } from "react"

import algosdk from "algosdk"
import { Typography, Button, Grid } from "@mui/material"

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
    <div
      style={{
        borderRadius: "16px",
        padding: "18px 20px",
        border: "1px solid rgba(148,163,184,0.45)",
        background:
          "radial-gradient(circle at top left,#020617,#020617 40%,#111827 100%)",
        color: "#f9fafb",
        maxWidth: "440px",
        width: "100%",
        boxShadow: "0 18px 45px rgba(15,23,42,0.85)",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8px",
          alignItems: "baseline",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "0.95rem",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "#e5e7eb",
          }}
        >
          Character Generation
        </h2>
        {assetId && (
          <span
            style={{
              fontSize: "0.75rem",
              opacity: 0.7,
            }}
          >
            #{assetId}
          </span>
        )}
      </div>

      {/* Status pill */}
      <div style={{ marginBottom: "10px" }}>
        <span
          style={{
            fontSize: "0.7rem",
            padding: "3px 10px",
            borderRadius: "999px",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            border: "1px solid rgba(148,163,184,0.45)",
            background: isCompleted
              ? "rgba(34,197,94,0.12)"
              : isError
              ? "rgba(239,68,68,0.12)"
              : "rgba(148,163,184,0.12)",
          }}
        >
          {status || "pending"}
        </span>
      </div>

      {/* Stage text */}
      <div
        style={{
          fontSize: "0.85rem",
          marginBottom: "8px",
          color: "#e5e7eb",
        }}
      >
        {friendlyStageLabel.replace(/_/g, " ")}
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            fontSize: "0.75rem",
            color: "#fecaca",
            marginBottom: "8px",
          }}
        >
          {error}
        </div>
      )}

      {/* Progress bar */}
      <div
        style={{
          position: "relative",
          height: "10px",
          borderRadius: "999px",
          overflow: "hidden",
          background:
            "linear-gradient(90deg, rgba(15,23,42,0.9), rgba(15,23,42,0.4))",
          marginBottom: "4px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.3,
            background:
              "radial-gradient(circle at 0% 50%, rgba(250,204,21,0.5), transparent 60%)",
          }}
        />
        <div
          style={{
            height: "100%",
            width: `${numericProgress}%`,
            transition: "width 0.4s ease-out",
            background: isCompleted
              ? "linear-gradient(90deg, #22c55e, #a3e635)"
              : isError
              ? "linear-gradient(90deg, #ef4444, #f97316)"
              : "linear-gradient(90deg, #fde047, #f97316)",
            boxShadow:
              numericProgress > 0 ? "0 0 14px rgba(250,204,21,0.7)" : "none",
          }}
        />
      </div>

      {/* Progress label */}
      <div
        style={{
          fontSize: "0.75rem",
          display: "flex",
          justifyContent: "space-between",
          color: "#9ca3af",
        }}
      >
        <span>
          {!genStatus
            ? "Waiting for generation to begin..."
            : isCompleted
            ? "Character ready!"
            : isError
            ? "Generation failed"
            : "Generating character..."}
        </span>
        <span>{numericProgress}%</span>
      </div>
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

  const [cat, setCat] = useState(null)
  const [newImage, setNewImage] = useState(null)
  const [displayRoll, setDisplayRoll] = useState(false)

  // Generation / UI state
  const [showProgress, setShowProgress] = useState(false)
  const [mintingAction, setMintingAction] = useState(null) // null | "gen" | "swap"
  const [genStatus, setGenStatus] = useState(null) // {status, progress, stage}
  const [progressError, setProgressError] = useState(null)

  const isGenerating =
    genStatus &&
    genStatus.status &&
    genStatus.status !== "completed" &&
    genStatus.status !== "error"

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

  async function fetchCharFromFirestore(assetId) {
    try {
      const docId = String(assetId) + "object"
      const refDoc = doc(db, "chars", docId)
      const snap = await getDoc(refDoc)
      if (!snap.exists()) return
      const data = snap.data() || {}
      if (data.charObj) {
        setCharObject(data.charObj)
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
      body: JSON.stringify({
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

      let extraRef
      let armourRef
      let magicRef
      let weaponRef
      let headRef
      let skinRef
      let backgroundRef

      if (Extra != "None") {
        extraRef = ref(storage, "warriors/Extra/" + Extra + ".png")
      }
      if (Armour != "None") {
        armourRef = ref(storage, "warriors/Armour/" + Armour + ".png")
      }
      if (Magic != "None") {
        magicRef = ref(storage, "warriors/Magic/" + Magic + ".png")
      }
      if (Weapon != "None") {
        weaponRef = ref(storage, "warriors/Weapon/" + Weapon + ".png")
      }
      headRef = ref(storage, "warriors/Head/" + Head + ".png")
      skinRef = ref(storage, "warriors/Skin/" + Skin + ".png")
      backgroundRef = ref(
        storage,
        "warriors/Background/" + Background.slice(0, Background.length - 11) + ".png"
      )

      let extraUrl = "None"
      let armourUrl = "None"
      let magicUrl = "None"
      let weaponUrl = "None"
      let headUrl = "None"
      let skinUrl = "None"
      let backgroundUrl = "None"

      if (Extra != "None") {
        await getDownloadURL(extraRef).then((url) => {
          extraUrl = url
        })
      }
      if (Armour != "None") {
        await getDownloadURL(armourRef).then((url) => {
          armourUrl = url
        })
      }
      if (Magic != "None") {
        await getDownloadURL(magicRef).then((url) => {
          magicUrl = url
        })
      }
      if (Weapon != "None") {
        await getDownloadURL(weaponRef).then((url) => {
          weaponUrl = url
        })
      }
      await getDownloadURL(headRef).then((url) => {
        headUrl = url
      })
      await getDownloadURL(skinRef).then((url) => {
        skinUrl = url
      })
      await getDownloadURL(backgroundRef).then((url) => {
        backgroundUrl = url
      })

      setBackground(backgroundUrl)
      setSkin(skinUrl)
      setWeapon(weaponUrl)
      setMagic(magicUrl)
      setHead(headUrl)
      setArmour(armourUrl)
      setExtra(extraUrl)

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

      props.ownTraits.forEach(async (trait) => {
        if (trait.type == "Background") {
          await getDownloadURL(
            ref(
              storage,
              "warriors/Background/" +
                trait.name.slice(0, trait.name.length - 11) +
                ".png"
            )
          ).then((url) => {
            if (
              !ownedBackgrounds.includes({
                assetId: trait.assetId,
                name: trait.name,
                type: trait.type,
                url,
              }) &&
              url != backgroundUrl
            ) {
              backgrounds.push({
                assetId: trait.assetId,
                name: trait.name,
                type: trait.type,
                url,
              })
            }
          })
        }
        if (trait.type == "Weapon") {
          await getDownloadURL(ref(storage, "warriors/Weapon/" + trait.name + ".png")).then(
            (url) => {
              if (
                !ownedWeapons.includes({
                  assetId: trait.assetId,
                  name: trait.name,
                  type: trait.type,
                  url,
                }) &&
                url != weaponUrl
              ) {
                weapons.push({
                  assetId: trait.assetId,
                  name: trait.name,
                  type: trait.type,
                  url,
                })
              }
            }
          )
        }
        if (trait.type == "Magic") {
          await getDownloadURL(ref(storage, "warriors/Magic/" + trait.name + ".png")).then(
            (url) => {
              if (
                !ownedMagics.includes({
                  assetId: trait.assetId,
                  name: trait.name,
                  type: trait.type,
                  url,
                }) &&
                url != magicUrl
              ) {
                magics.push({
                  assetId: trait.assetId,
                  name: trait.name,
                  type: trait.type,
                  url,
                })
              }
            }
          )
        }
        if (trait.type == "Head") {
          await getDownloadURL(ref(storage, "warriors/Head/" + trait.name + ".png")).then(
            (url) => {
              if (
                !ownedHeads.includes({
                  assetId: trait.assetId,
                  name: trait.name,
                  type: trait.type,
                  url,
                }) &&
                url != headUrl
              ) {
                heads.push({
                  assetId: trait.assetId,
                  name: trait.name,
                  type: trait.type,
                  url,
                })
              }
            }
          )
        }
        if (trait.type == "Armour") {
          await getDownloadURL(ref(storage, "warriors/Armour/" + trait.name + ".png")).then(
            (url) => {
              if (
                !ownedArmours.includes({
                  assetId: trait.assetId,
                  name: trait.name,
                  type: trait.type,
                  url,
                }) &&
                url != armourUrl
              ) {
                armours.push({
                  assetId: trait.assetId,
                  name: trait.name,
                  type: trait.type,
                  url,
                })
              }
            }
          )
        }
        if (trait.type == "Extra") {
          await getDownloadURL(ref(storage, "warriors/Extra/" + trait.name + ".png")).then(
            (url) => {
              if (
                !ownedExtras.includes({
                  assetId: trait.assetId,
                  name: trait.name,
                  type: trait.type,
                  url,
                }) &&
                url != extraUrl
              ) {
                extras.push({
                  assetId: trait.assetId,
                  name: trait.name,
                  type: trait.type,
                  url,
                })
              }
            }
          )
        }
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
      body: JSON.stringify({
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
    props.setMessage("Updating image...")

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
      body: JSON.stringify({
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
    props.setMessage("")
    setNewImage(session.image)
  }

  const mint = async (genChar) => {
    try {
      // Track action so SWAP doesn't force the ROLL button to show "Preparing..."
      setMintingAction(genChar ? "gen" : "swap")

      props.setMessage("Initializing transaction...")
      props.setProgress(0)

      let newMetadata = Object.assign({}, char)

      const client = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443)
      const indexerClient = new algosdk.Indexer("", "https://mainnet-idx.algonode.cloud", 443)

      let params = await client.getTransactionParams().do()
      const accountAssets = await indexerClient.lookupAccountAssets(activeAddress).do()

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

      let response1 = await fetch("/api/getHash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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

      let reserve = algosdk.encodeAddress(
        multihash.decode(new cid(session1.hash.toString()).multihash).digest
      )

      let utxn = algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject({
        sender: "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY",
        assetIndex: props.nftId,
        note: new Uint8Array(Buffer.from(JSON.stringify(newMetadata))),
        manager: "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY",
        reserve: reserve,
        freeze: undefined,
        clawback: undefined,
        suggestedParams: params,
        strictEmptyAddressChecking: false,
      })

      txns.push(utxn)

      if (txns.length > 1) {
        algosdk.assignGroupID(txns)
      }

      let encodedTxns = []
      txns.forEach((txn) => {
        let encoded = algosdk.encodeUnsignedTransaction(txn)
        encodedTxns.push(encoded)
      })

      props.setProgress(100)
      props.setMessage("Sign transaction...")

      const signedTransactions = await signTransactions(encodedTxns, signingIndex)

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

      let response = await fetch("/api/mintNft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txn: txnB64,
        }),
      })

      let session = await response.json()

      const restoredSignedTxn = Buffer.from(session.signedTxn, "base64")
      signedTransactions[signedTransactions.length - 1] = restoredSignedTxn

      props.setProgress(0)
      props.setMessage("Sending transaction...")

      const { txid } = await client.sendRawTransaction(signedTransactions).do()
      let confirmedTxn = await algosdk.waitForConfirmation(client, txid, 4)

      let responseQueue = await fetch("/api/arena/addDocToCollection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txnId: txid,
          champId: props.nftId,
        }),
      })

      let sessionQueue = await responseQueue.json()

      props.setMessage("NFT updated")

      if (props.refetchData) await props.refetchData()
      await fetchData()
    } catch (error) {
      props.setMessage(String(error))
      setGenStatus((prev) =>
        prev && prev.status
          ? { ...prev, status: "error" }
          : { status: "error", progress: 0, stage: null }
      )
    } finally {
      setMintingAction(null)
    }
  }

  console.log(WeaponChange)

  if (props.zoom) {
    return (
      <div style={{ padding: "24px 16px", display: "flex", justifyContent: "center" }}>
        <Grid
          container
          spacing={3}
          align="center"
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "18px",
            borderRadius: 18,
            border: "1px solid rgba(15,23,42,0.8)",
            background: "radial-gradient(circle at top,#020617,#020617 45%,#020617 100%)",
            boxShadow: "0 22px 55px rgba(15,23,42,0.9)",
          }}
        >
          <Grid item xs={12} md={6}>
            <Button onClick={() => props.setSelWarrior(null)} style={{ padding: 0 }}>
              {newImage &&
              (BackgroundChange != Background ||
                WeaponChange != Weapon ||
                MagicChange != Magic ||
                HeadChange != Head ||
                ArmourChange != Armour ||
                ExtraChange != Extra) ? (
                <img
                  style={{
                    width: "100%",
                    maxWidth: 500,
                    borderRadius: 18,
                    border: "2px solid rgba(148,163,184,0.55)",
                  }}
                  src={newImage}
                />
              ) : (
                <img
                  style={{
                    width: "100%",
                    maxWidth: 500,
                    borderRadius: 18,
                    border: "2px solid rgba(148,163,184,0.55)",
                  }}
                  src={nftUrl}
                />
              )}
            </Button>
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
                width: "100%",
                maxWidth: 420,
                padding: "16px 18px 20px",
                borderRadius: 18,
                border: "1px solid rgba(148,163,184,0.5)",
                background: "linear-gradient(135deg,rgba(15,23,42,0.98),rgba(17,24,39,0.9))",
              }}
            >
              <Typography
                variant="h6"
                style={{
                  color: "white",
                  fontWeight: 600,
                  marginBottom: 4,
                  textAlign: "left",
                }}
              >
                Generate your Warrior
              </Typography>
              <Typography
                variant="body2"
                style={{
                  color: "#9ca3af",
                  marginBottom: 12,
                  textAlign: "left",
                }}
              >
                Roll to generate a fully statted character for this champion.
              </Typography>

              {!isGenerating ? (
                <>
                  <Button
                    style={{
                      background: "linear-gradient(90deg,#facc15,#f97316,#f97316)",
                      color: "#020617",
                      fontFamily: "Jacques",
                      padding: "10px 22px",
                      borderRadius: 999,
                      minWidth: 220,
                      boxShadow: "0 10px 25px rgba(248,250,252,0.18)",
                      opacity: activeAddress ? 1 : 0.7,
                    }}
                    disabled={!activeAddress || mintingAction !== null}
                    onClick={() => mint(true)}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        justifyContent: "center",
                      }}
                    >
                      <Typography variant="h6" style={{ margin: 0, lineHeight: 1.2 }}>
                        {/* Only show Preparing... when rolling, never when swapping */}
                        {mintingAction === "gen" ? "Preparing..." : "Roll 10,000"}
                      </Typography>
                      <img
                        src="/invDC.svg"
                        style={{
                          width: 32,
                          marginLeft: 4,
                        }}
                      />
                    </div>
                  </Button>

                  {!activeAddress && (
                    <Typography
                      variant="caption"
                      style={{
                        display: "block",
                        marginTop: 8,
                        color: "#9ca3af",
                        textAlign: "center",
                      }}
                    >
                      Connect a wallet to roll.
                    </Typography>
                  )}
                </>
              ) : (
                <Typography
                  variant="body2"
                  style={{
                    color: "#9ca3af",
                    marginTop: 4,
                    textAlign: "left",
                  }}
                >
                  Character is currently generating. The roll button will reappear once generation
                  finishes.
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

            {/* Swap button (same logic as before) */}
            {!charObject &&
            (BackgroundChange != "None" ||
              WeaponChange != "None" ||
              MagicChange != "None" ||
              HeadChange != "None" ||
              ArmourChange != "None" ||
              ExtraChange != "None") ? (
              <Button
                style={{
                  backgroundColor: "white",
                  fontFamily: "Jacques",
                  padding: 10,
                  marginTop: 10,
                  opacity: mintingAction !== null ? 0.7 : 1,
                }}
                disabled={mintingAction !== null}
                onClick={() => mint(false)}
              >
                <Typography variant="h6">
                  {mintingAction === "swap" ? "Preparing..." : "swap"}
                </Typography>
              </Button>
            ) : null}
          </Grid>

          {/* Trait selector UI (unchanged logic) */}
          {cat ? (
            cat == "Background" ? (
              <>
                <Grid item xs={12} sm={6} md={2}>
                  <Button
                    onClick={() => [
                      setBackgroundChange("None"),
                      setCat(null),
                      changeImg("None", "Background"),
                    ]}
                  >
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={Background}
                    />
                  </Button>
                  {ownedBackgrounds.length > 0
                    ? ownedBackgrounds.map((trait, index) => (
                        <Button
                          key={index}
                          onClick={() => [
                            setBackgroundChange(trait),
                            setCat(null),
                            changeImg(trait, "Background"),
                          ]}
                        >
                          <img
                            style={{
                              width: 100,
                              height: 100,
                              border: "2px solid white",
                              borderRadius: 15,
                              padding: 10,
                            }}
                            src={trait.url}
                          />
                        </Button>
                      ))
                    : null}
                </Grid>
              </>
            ) : cat == "Weapon" ? (
              <>
                <Grid item xs={12} sm={6} md={2}>
                  <Button
                    onClick={() => [
                      setWeaponChange("Remove"),
                      setCat(null),
                      changeImg("Remove", "Weapon"),
                    ]}
                  >
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={"/warriors/weapon.svg"}
                    />
                  </Button>
                  {Weapon != "None" ? (
                    <Button
                      onClick={() => [
                        setWeaponChange("None"),
                        setCat(null),
                        changeImg({ url: Weapon }, "Weapon"),
                      ]}
                    >
                      <img
                        style={{
                          width: 100,
                          height: 100,
                          border: "2px solid white",
                          borderRadius: 15,
                          padding: 10,
                        }}
                        src={Weapon}
                      />
                    </Button>
                  ) : null}
                  {ownedWeapons.length > 0
                    ? ownedWeapons.map((trait, index) => (
                        <Button
                          key={index}
                          onClick={() => [
                            setWeaponChange(trait),
                            setCat(null),
                            changeImg(trait, "Weapon"),
                          ]}
                        >
                          <img
                            style={{
                              width: 100,
                              height: 100,
                              border: "2px solid white",
                              borderRadius: 15,
                              padding: 10,
                            }}
                            src={trait.url}
                          />
                        </Button>
                      ))
                    : null}
                </Grid>
              </>
            ) : cat == "Magic" ? (
              <>
                <Grid item xs={12} sm={6} md={2}>
                  <Button
                    onClick={() => [
                      setMagicChange("Remove"),
                      setCat(null),
                      changeImg("Remove", "Magic"),
                    ]}
                  >
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={"/warriors/magic.png"}
                    />
                  </Button>

                  {Magic != "None" ? (
                    <Button
                      onClick={() => [
                        setMagicChange("None"),
                        setCat(null),
                        changeImg({ url: Magic }, "Magic"),
                      ]}
                    >
                      <img
                        style={{
                          width: 100,
                          height: 100,
                          border: "2px solid white",
                          borderRadius: 15,
                          padding: 10,
                        }}
                        src={Magic}
                      />
                    </Button>
                  ) : null}
                  {ownedMagics.length > 0
                    ? ownedMagics.map((trait, index) => (
                        <Button
                          key={index}
                          onClick={() => [
                            setMagicChange(trait),
                            setCat(null),
                            changeImg(trait, "Magic"),
                          ]}
                        >
                          <img
                            style={{
                              width: 100,
                              height: 100,
                              border: "2px solid white",
                              borderRadius: 15,
                              padding: 10,
                            }}
                            src={trait.url}
                          />
                        </Button>
                      ))
                    : null}
                </Grid>
              </>
            ) : cat == "Head" ? (
              <>
                <Grid item xs={12} sm={6} md={2}>
                  {Head != "None" ? (
                    <Button
                      onClick={() => [
                        setHeadChange("None"),
                        setCat(null),
                        changeImg({ url: Head }, "Head"),
                      ]}
                    >
                      <img
                        style={{
                          width: 100,
                          height: 100,
                          border: "2px solid white",
                          borderRadius: 15,
                          padding: 10,
                        }}
                        src={Head}
                      />
                    </Button>
                  ) : null}
                  {ownedHeads.length > 0
                    ? ownedHeads.map((trait, index) => (
                        <Button
                          key={index}
                          onClick={() => [
                            setHeadChange(trait),
                            setCat(null),
                            changeImg(trait, "Head"),
                          ]}
                        >
                          <img
                            style={{
                              width: 100,
                              height: 100,
                              border: "2px solid white",
                              borderRadius: 15,
                              padding: 10,
                            }}
                            src={trait.url}
                          />
                        </Button>
                      ))
                    : null}
                </Grid>
              </>
            ) : cat == "Armour" ? (
              <>
                <Grid item xs={12} sm={6} md={2}>
                  <Button
                    onClick={() => [
                      setArmourChange("Remove"),
                      setCat(null),
                      changeImg("Remove", "Armour"),
                    ]}
                  >
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={"/warriors/armour.svg"}
                    />
                  </Button>

                  {Armour != "None" ? (
                    <Button
                      onClick={() => [
                        setArmourChange("None"),
                        setCat(null),
                        changeImg({ url: Armour }, "Armour"),
                      ]}
                    >
                      <img
                        style={{
                          width: 100,
                          height: 100,
                          border: "2px solid white",
                          borderRadius: 15,
                          padding: 10,
                        }}
                        src={Armour}
                      />
                    </Button>
                  ) : null}
                  {ownedArmours.length > 0
                    ? ownedArmours.map((trait, index) => (
                        <Button
                          key={index}
                          onClick={() => [
                            setArmourChange(trait),
                            setCat(null),
                            changeImg(trait, "Armour"),
                          ]}
                        >
                          <img
                            style={{
                              width: 100,
                              height: 100,
                              border: "2px solid white",
                              borderRadius: 15,
                              padding: 10,
                            }}
                            src={trait.url}
                          />
                        </Button>
                      ))
                    : null}
                </Grid>
              </>
            ) : cat == "Extra" ? (
              <>
                <Grid item xs={12} sm={6} md={2}>
                  <Button
                    onClick={() => [
                      setExtraChange("Remove"),
                      setCat(null),
                      changeImg("Remove", "Extra"),
                    ]}
                  >
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={"/warriors/extra.svg"}
                    />
                  </Button>
                </Grid>
                {Extra != "None" ? (
                  <Button
                    onClick={() => [
                      setExtraChange("None"),
                      setCat(null),
                      changeImg({ url: Extra }, "Extra"),
                    ]}
                  >
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={Extra}
                    />
                  </Button>
                ) : null}
                {ownedExtras.length > 0
                  ? ownedExtras.map((trait, index) => (
                      <Button
                        key={index}
                        onClick={() => [
                          setExtraChange(trait),
                          setCat(null),
                          changeImg(trait, "Extra"),
                        ]}
                      >
                        <img
                          style={{
                            width: 100,
                            height: 100,
                            border: "2px solid white",
                            borderRadius: 15,
                            padding: 10,
                          }}
                          src={trait.url}
                        />
                      </Button>
                    ))
                  : null}
              </>
            ) : null
          ) : (
            <>
              <Grid item xs={12} sm={6} md={2}>
                <Button onClick={() => setCat("Background")}>
                  {Background == "None" ? (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={"/warriors/background.svg"}
                    />
                  ) : BackgroundChange == "None" ? (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={Background}
                    />
                  ) : (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={BackgroundChange.url}
                    />
                  )}
                </Button>
                <Button onClick={() => setCat("Head")}>
                  {Head == "None" ? (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={"/warriors/head.svg"}
                    />
                  ) : HeadChange == "None" ? (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={Head}
                    />
                  ) : (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={HeadChange.url}
                    />
                  )}
                </Button>
                <Button onClick={() => setCat("Weapon")}>
                  {WeaponChange != "Remove" && WeaponChange != "None" ? (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={WeaponChange.url}
                    />
                  ) : Weapon == "None" || WeaponChange == "Remove" ? (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={"/warriors/weapon.svg"}
                    />
                  ) : WeaponChange == "None" ? (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={Weapon}
                    />
                  ) : (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={WeaponChange.url}
                    />
                  )}
                </Button>
                <Button onClick={() => setCat("Extra")}>
                  {ExtraChange != "Remove" && ExtraChange != "None" ? (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={ExtraChange.url}
                    />
                  ) : Extra == "None" || ExtraChange == "Remove" ? (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={"/warriors/extra.svg"}
                    />
                  ) : ExtraChange == "None" ? (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={Extra}
                    />
                  ) : (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={ExtraChange.url}
                    />
                  )}
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Button>
                  {Skin == "None" ? (
                    <img
                      style={{
                        width: 150,
                        height: 150,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={"/warriors/skin.svg"}
                    />
                  ) : (
                    <img
                      style={{
                        width: 150,
                        height: 150,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={Skin}
                    />
                  )}
                </Button>
                <Button onClick={() => setCat("Armour")}>
                  {ArmourChange != "Remove" && ArmourChange != "None" ? (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={ArmourChange.url}
                    />
                  ) : Armour == "None" || ArmourChange == "Remove" ? (
                    <img
                      style={{
                        width: 150,
                        height: 150,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={"/warriors/armour.svg"}
                    />
                  ) : ArmourChange == "None" ? (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={Armour}
                    />
                  ) : (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={ArmourChange.url}
                    />
                  )}
                </Button>
                <Button onClick={() => setCat("Magic")}>
                  {MagicChange != "Remove" && MagicChange != "None" ? (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={MagicChange.url}
                    />
                  ) : Magic == "None" || MagicChange == "Remove" ? (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={"/warriors/magic.png"}
                    />
                  ) : MagicChange == "None" ? (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={Magic}
                    />
                  ) : (
                    <img
                      style={{
                        width: 100,
                        height: 100,
                        border: "2px solid white",
                        borderRadius: 15,
                        padding: 10,
                      }}
                      src={MagicChange.url}
                    />
                  )}
                </Button>
              </Grid>
            </>
          )}

          {/* Character component:
              - show if there is a character (charObject)
              - but never show while generation is in progress */}
          {charObject && !isGenerating && (
            <Grid item xs={12}>
              <Character
                nftId={props.nftId}
                background={Background}
                deleteChar={deleteChar}
                contracts={props.contracts}
                setMessage={props.setMessage}
              />
            </Grid>
          )}
        </Grid>
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
            borderRadius: 15,
            border: charObject ? "3px solid white" : "3px solid black",
          }}
          src={nftUrl}
        />
      </div>
    )
  }
}
