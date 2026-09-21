import NextCors from "nextjs-cors"
import algosdk from "algosdk"

import { initializeApp, getApps } from "firebase/app"
import { getFirestore, doc, getDoc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

let firebase_app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

const db = getFirestore(firebase_app)

// Convert uint64 to 8 bytes safely (works even if nftId > 2^31)
const u64ToBytes = (n) => {
  let x = BigInt(n)
  const out = new Uint8Array(8)
  for (let i = 7; i >= 0; i--) {
    out[i] = Number(x & 0xffn)
    x >>= 8n
  }
  return [...out]
}

const decodeNoteBase64 = (b64) => {
  try {
    return Buffer.from(b64, "base64").toString("utf8")
  } catch {
    return ""
  }
}

// Deep-sanitize: BigInt -> string (or number if safe)
const sanitizeForJson = (v) => {
  if (typeof v === "bigint") {
    // If you prefer numbers when safe:
    if (v <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(v)
    return v.toString()
  }
  if (Array.isArray(v)) return v.map(sanitizeForJson)
  if (v && typeof v === "object") {
    const out = {}
    for (const [k, val] of Object.entries(v)) out[k] = sanitizeForJson(val)
    return out
  }
  return v
}

export default async function getNft(req, res) {
  await NextCors(req, res, {
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    origin: "*",
    optionsSuccessStatus: 200,
  })

  try {
    const nftId = req.body?.nftId
    console.log(nftId)

    const indexerClient = new algosdk.Indexer(
      "",
      "https://mainnet-idx.algonode.cloud",
      443
    )

    const client = new algosdk.Algodv2(
      "",
      "https://mainnet-api.algonode.cloud",
      443
    )

    // --- NFT + stats ---
    const nft = await indexerClient.searchForAssets().index(Number(nftId)).do()

    const assetConfig = await indexerClient
      .lookupAssetTransactions(Number(nftId))
      .txType("acfg")
      .do()


    const lastNoteB64 =
      assetConfig.transactions?.[assetConfig.transactions.length - 1]?.note


    const charStats = lastNoteB64 ? decodeNoteBase64(lastNoteB64) : ""

    // The armoury only needs NFT metadata and equipped traits. Existing arena
    // character records are independent of a regular on-chain trait swap.
    if (req.body?.includeArenaCharacter === false) {
      return res.json(sanitizeForJson({ nft, charStats, charObject: "none", action: null }))
    }

    // --- get charObject from Firestore ---
    let charObject = "none"
    try {
      const charRef = doc(db, "chars", `${nftId}object`)
      const charSnap = await getDoc(charRef)
      charObject = charSnap.exists() ? charSnap.data() : "none"
    } catch (err) {
      console.log("Error fetching charObject from Firestore:", err)
      charObject = "none"
    }

    // --- enrich moves from Firestore ---
    try {
      if (charObject !== "none" && Array.isArray(charObject.moves)) {
        const expandedMoves = await Promise.all(
          charObject.moves.map(async (move) => {
            try {
              const moveRef = doc(db, "moves", `${nftId}${move}`)
              const moveSnap = await getDoc(moveRef)
              return moveSnap.exists() ? moveSnap.data() : move
            } catch {
              return move
            }
          })
        )
        charObject = { ...charObject, moves: expandedMoves }
      }
    } catch (e) {
      console.log("Error expanding moves:", e)
    }

    // --- Action logic ---
    let action = null

    try {
      const response = await client
        .getApplicationBoxByName(
          1870514811,
          [...u64ToBytes(nftId), ...new Uint8Array(Buffer.from("action"))]
        )
        .do()

      const string = new TextDecoder().decode(response.value)
      const actionObj = JSON.parse(string)

      const safeMove =
        charObject !== "none" && charObject.moves
          ? charObject.moves[actionObj.move]
          : null

      if (actionObj.target === "dragon") {
        action = { target: "dragon", move: safeMove }
      } else {
        const responseTarget = await client
          .getApplicationBoxByName(1870514811, u64ToBytes(actionObj.target))
          .do()

        const stringTarget = new TextDecoder().decode(responseTarget.value)
        const targetObj = JSON.parse(stringTarget)

        action = { target: targetObj.name, move: safeMove }
      }
    } catch {
      action = null
    }

    // IMPORTANT: sanitize before res.json to avoid BigInt crash
    res.json(sanitizeForJson({ nft, charStats, charObject, action }))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err?.message || "Unknown error" })
  }
}
