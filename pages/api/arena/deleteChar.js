import NextCors from "nextjs-cors"
import OpenAI from "openai"
import algosdk from "algosdk"

import { initializeApp, getApps } from "firebase/app"
import {
  getFirestore,
  doc,
  deleteDoc,
} from "firebase/firestore"
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"

// ===== Firebase Init =====
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

const firebase_app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(firebase_app)
const auth = getAuth(firebase_app)

// ===== Algorand Indexer Setup =====
const indexerClient = new algosdk.Indexer("", "https://mainnet-idx.algonode.cloud", 443)

const REQUIRED_APP_ID = 1870514811
const REQUIRED_FIRST_ARG = "deleteCharacter"

async function deleteChar(req, res) {
  await NextCors(req, res, {
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    origin: "*",
    optionsSuccessStatus: 200,
  })

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"])
    return res.status(405).json({ error: "Method Not Allowed" })
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body
    const { txnId, champId } = body || {}

    if (!txnId || typeof txnId !== "string") {
      return res.status(400).json({ error: "txnId (string) is required" })
    }
    if (champId === undefined || champId === null || String(champId).length === 0) {
      return res.status(400).json({ error: "champId is required" })
    }

    // Sign in to Firebase so Firestore rules allow reads/writes
    const email = "abergquist96@gmail.com"
    const password = process.env.EMAILPASS
    if (!password) {
      return res.status(500).json({ error: "Server misconfigured: EMAILPASS is missing" })
    }

    const { user } = await signInWithEmailAndPassword(auth, email, password)
    await user.getIdToken()

    // 1) Get current indexer round
    const health = await indexerClient.makeHealthCheck().do()
    const currentRound = Number(health?.round)
    if (!Number.isFinite(currentRound)) {
      return res.status(502).json({ error: "Unable to determine current indexer round" })
    }

    // 2) Find txn by txnId, then ensure it's within the last 3 rounds
    const txLookup = await indexerClient.searchForTransactions().txid(txnId).do()
    const txn = txLookup?.transactions?.[0]
    if (!txn) {
      return res.status(404).json({ error: "Transaction not found by txnId" })
    }

    console.log(txn)

    const confirmedRound = Number(txn.confirmedRound)
    if (!Number.isFinite(confirmedRound)) {
      return res.status(400).json({ error: "Transaction is not confirmed (no confirmed-round)" })
    }

    // last 3 blocks = [currentRound-2, currentRound-1, currentRound]
    if (confirmedRound < currentRound - 2) {
      return res.status(400).json({
        error: "Transaction is not in the last 3 blocks",
        confirmedRound,
        currentRound,
      })
    }

    // 3) Validate it is an app call to app 1870514811 with first arg "deleteChar"
    if (txn.txType !== "appl") {
      return res.status(400).json({ error: "Transaction is not an application call (tx-type != appl)" })
    }

    const appTxn = txn.applicationTransaction
    const appId = Number(appTxn?.applicationId)
    if (appId !== REQUIRED_APP_ID) {
      return res.status(400).json({ error: "Application ID mismatch", appId })
    }

    const appArgs = appTxn?.applicationArgs || []
    if (!Array.isArray(appArgs) || appArgs.length === 0) {
      return res.status(400).json({ error: "Missing application-args" })
    }

    const firstArg = Buffer.from(appArgs[0], "base64").toString("utf8")
    if (firstArg !== REQUIRED_FIRST_ARG) {
      return res.status(400).json({ error: "First app arg mismatch", firstArg })
    }

    // 4) Delete Firestore document: collection 'chars', doc id `${String(champId)}object`
    const docId = `${String(champId)}object`
    await deleteDoc(doc(db, "chars", docId))

    return res.status(200).json({
      ok: true,
      deleted: { collection: "chars", docId },
      verified: { txnId, confirmedRound, currentRound, appId, firstArg },
    })
  } catch (err) {
    console.error("deleteChar error:", err)
    return res.status(500).json({
      error: "Internal Server Error",
      message: err?.message || String(err),
    })
  }
}

export default deleteChar
