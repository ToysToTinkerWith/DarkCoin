import NextCors from 'nextjs-cors'
import OpenAI from 'openai'
import algosdk from 'algosdk'

import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'

const openai = new OpenAI({
  apiKey: process.env.DALLE_KEY,
})

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

let firebase_app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(firebase_app)
const auth = getAuth(firebase_app)

// ===== Algorand Indexer Setup =====
const indexerClient = new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443) // v3 constructor supports this pattern :contentReference[oaicite:1]{index=1}

// DARK Coin + destination address config
const DARK_COIN_ID = Number(process.env.DARK_COIN_ID || '1088771340')
const DARK_RECEIVE_ADDR =
  'VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM'

// 10,000 DARK in base units (assuming 6 decimals: 10_000 * 1e6)
const REQUIRED_DARK_AMOUNT = BigInt(process.env.DARK_REQUIRED_AMOUNT || '10000000000')

// --- small helpers for v3 typed responses ---
function toBigIntMaybe(v) {
  if (v == null) return 0n
  if (typeof v === 'bigint') return v
  // covers number | string
  return BigInt(v)
}


function bigintToSafeNumberOrString(value) {
  const big = toBigIntMaybe(value)
  const max = BigInt(Number.MAX_SAFE_INTEGER)
  const min = BigInt(Number.MIN_SAFE_INTEGER)

  if (big <= max && big >= min) {
    return Number(big)
  }

  return big.toString()
}

function makeFirestoreSafe(value) {
  if (value == null) return value

  if (typeof value === 'bigint') {
    return value.toString()
  }

  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }

  if (value instanceof Uint8Array) {
    return algosdk.bytesToBase64(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => makeFirestoreSafe(item))
  }

  if (typeof value === 'object') {
    const out = {}

    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'undefined') continue
      if (typeof item === 'function') continue
      out[key] = makeFirestoreSafe(item)
    }

    return out
  }

  return String(value)
}

function jsonSafeResponse(res, statusCode, payload) {
  return res.status(statusCode).json(makeFirestoreSafe(payload))
}

function noteToBase64(note) {
  if (!note) return null
  // v3 indexer model uses Uint8Array for note :contentReference[oaicite:2]{index=2}
  if (typeof note === 'string') return note
  return algosdk.bytesToBase64(note)
}

function getTxId(tx) {
  return tx?.id || tx?.txid || tx?.txId || null
}

function bytesLikeToBase64(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Uint8Array) return algosdk.bytesToBase64(value)
  if (Array.isArray(value)) return algosdk.bytesToBase64(Uint8Array.from(value))
  if (value?.constructor?.name === 'Uint8Array') return algosdk.bytesToBase64(value)
  return String(value)
}

function getGroupId(tx) {
  return bytesLikeToBase64(tx?.group || tx?.groupId || null)
}

function getConfirmedRound(tx) {
  const round = tx?.confirmedRound ?? tx?.['confirmed-round']
  return round == null ? null : Number(round)
}

function getAssetTransfer(tx) {
  return tx?.assetTransferTransaction || tx?.['asset-transfer-transaction'] || null
}

function getAssetTransferReceiver(axfer) {
  return axfer?.receiver || null
}

function getAssetTransferAmount(axfer) {
  return toBigIntMaybe(axfer?.amount ?? 0)
}

function getAssetTransferAssetId(axfer) {
  return Number(axfer?.assetId ?? axfer?.['asset-id'] ?? axfer?.assetID ?? 0)
}

function isDarkAssetTransfer(axfer) {
  const assetId = getAssetTransferAssetId(axfer)
  // Some address+asset indexer queries omit asset-id on nested transfer in older response shapes.
  // If it is present, enforce it. If omitted, rely on the indexer assetID query.
  return !assetId || assetId === DARK_COIN_ID
}

async function lookupTransactionById(txnId) {
  if (!txnId) return null

  try {
    if (typeof indexerClient.lookupTransactionByID === 'function') {
      const res = await indexerClient.lookupTransactionByID(txnId).do()
      return res?.transaction || null
    }
  } catch (err) {
    console.warn('lookupTransactionByID failed, falling back to address scan:', txnId, err?.message || err)
  }

  return null
}

function isMatchingDarkPayment(tx, candidateIds = [], { requireCandidateId = false } = {}) {
  const txId = String(getTxId(tx) || '')
  const cleanCandidateIds = candidateIds.map((id) => String(id || '').trim()).filter(Boolean)

  if (requireCandidateId && cleanCandidateIds.length && !cleanCandidateIds.includes(txId)) {
    return false
  }

  const asa = getAssetTransfer(tx)
  if (!asa) return false

  const receiver = getAssetTransferReceiver(asa)
  const amount = getAssetTransferAmount(asa)

  if (receiver !== DARK_RECEIVE_ADDR) return false
  if (!isDarkAssetTransfer(asa)) return false
  if (amount < REQUIRED_DARK_AMOUNT) return false

  return true
}

function sameGroup(tx, groupId) {
  if (!groupId) return false
  return getGroupId(tx) === groupId
}

async function fetchRoundTransactions(roundNumber) {
  if (!roundNumber || Number(roundNumber) <= 0) return []

  let builder = indexerClient
    .searchForTransactions()
    .round(Number(roundNumber))
    .limit(1000)

  const res = await builder.do()
  return res.transactions || []
}

async function findMatchingDarkPayment({ txnId, paymentTxnId, assetConfigTxId, groupTxId, confirmedRound }) {
  const candidateIds = [paymentTxnId, txnId, groupTxId, assetConfigTxId]
    .map((value) => String(value || '').trim())
    .filter(Boolean)

  const directTxns = []

  for (const id of candidateIds) {
    const directTxn = await lookupTransactionById(id)
    if (!directTxn) continue

    directTxns.push(directTxn)

    // If the provided id is already the DARK payment tx, accept it directly.
    if (isMatchingDarkPayment(directTxn, [id], { requireCandidateId: true })) {
      return directTxn
    }
  }

  // If the provided id is an asset-config tx or another tx in the same group,
  // resolve the whole confirmed round and find the DARK payment in that same group.
  const groupHints = directTxns
    .map((tx) => ({ groupId: getGroupId(tx), round: getConfirmedRound(tx) }))
    .filter((hint) => hint.groupId && hint.round)

  const explicitRound = Number(confirmedRound || 0)
  if (explicitRound > 0) {
    const ids = new Set(groupHints.map((hint) => `${hint.groupId}:${hint.round}`))
    for (const tx of directTxns) {
      const groupId = getGroupId(tx)
      if (groupId && !ids.has(`${groupId}:${explicitRound}`)) {
        groupHints.push({ groupId, round: explicitRound })
      }
    }
  }

  for (const hint of groupHints) {
    const roundTxns = await fetchRoundTransactions(hint.round)
    const match = roundTxns.find(
      (tx) => sameGroup(tx, hint.groupId) && isMatchingDarkPayment(tx)
    )

    if (match) return match
  }

  // Final fallback: scan the destination address + DARK asset, optionally within the confirmed round.
  // Do NOT require the tx id here, because the client may have passed a stale pre-group txid.
  let builder = indexerClient
    .searchForTransactions()
    .address(DARK_RECEIVE_ADDR)
    .assetID(DARK_COIN_ID)
    .limit(1000)

  if (explicitRound > 0 && typeof builder.round === 'function') {
    builder = builder.round(explicitRound)
  }

  const searchResult = await builder.do()
  const txns = searchResult.transactions || []

  const directIdMatch = txns.find((tx) => isMatchingDarkPayment(tx, candidateIds, { requireCandidateId: true }))
  if (directIdMatch) return directIdMatch

  // If we have group hints, prefer same-group matches from the address scan.
  for (const hint of groupHints) {
    const match = txns.find((tx) => sameGroup(tx, hint.groupId) && isMatchingDarkPayment(tx))
    if (match) return match
  }

  // If the confirmed round only contains one valid generation payment to the destination,
  // accept it. This is intentionally after group/id checks to avoid false positives.
  const validPayments = txns.filter((tx) => isMatchingDarkPayment(tx))
  if (explicitRound > 0 && validPayments.length === 1) {
    return validPayments[0]
  }

  return null
}

async function addDocToCollection(req, res) {
  await NextCors(req, res, {
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200,
  })

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return jsonSafeResponse(res, 405, { error: 'Method Not Allowed' })
  }

  if (!DARK_RECEIVE_ADDR) {
    return jsonSafeResponse(res, 500, {
      error: 'Server misconfigured: DARK_RECEIVE_ADDR env var is required for this endpoint.',
    })
  }

  try {
    const rawBody = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
    const body = makeFirestoreSafe(rawBody || {})
    const {
      txnId,
      paymentTxnId,
      assetConfigTxId,
      groupTxId,
      champId,
      confirmedRound,
      generationBuild,
      championName,
      randomName,
    } = body || {}

    if (!txnId || typeof txnId !== 'string') {
      return jsonSafeResponse(res, 400, { error: 'txnId (string) is required' })
    }

    // Sign in to Firebase so Firestore rules allow reads/writes
    const email = 'abergquist96@gmail.com'
    const password = process.env.EMAILPASS
    const { user } = await signInWithEmailAndPassword(auth, email, password)
    await user.getIdToken()

    const matchingTxn = await findMatchingDarkPayment({
      txnId,
      paymentTxnId,
      assetConfigTxId,
      groupTxId,
      confirmedRound,
    })

    if (!matchingTxn) {
      return jsonSafeResponse(res, 404, {
        error:
          'No matching 10,000 DARK transfer found for this generation group. Checked direct txn ids, same-group txns, and recent destination address txns.',
      })
    }

    // 3) Check if this txn already exists in the "txns" collection
    const matchedPaymentTxnId = String(getTxId(matchingTxn) || paymentTxnId || txnId)

    const txDocRef = doc(db, 'txns', matchedPaymentTxnId)
    const txDocSnap = await getDoc(txDocRef)

    if (txDocSnap.exists()) {
      return jsonSafeResponse(res, 200, {
        status: 'already-recorded',
        message: 'This txn is already present in the txns collection.',
      })
    }

    // 4) Add to queuedChars (txnId as doc ID)
    const asa = getAssetTransfer(matchingTxn)
    const queuedRef = doc(db, 'queuedChars', matchedPaymentTxnId)

    const queuedPayload = makeFirestoreSafe({
      txnId: matchedPaymentTxnId,
      paymentTxnId: matchedPaymentTxnId,
      assetConfigTxId: assetConfigTxId ?? null,
      groupTxId: groupTxId ?? null,
      sender: matchingTxn.sender,
      receiver: getAssetTransferReceiver(asa),
      amount: bigintToSafeNumberOrString(getAssetTransferAmount(asa)),
      amountString: getAssetTransferAmount(asa).toString(),
      assetId: DARK_COIN_ID,
      champId: champId ?? null,
      confirmedRound:
        matchingTxn.confirmedRound != null
          ? Number(matchingTxn.confirmedRound)
          : Number(confirmedRound || 0) || null,
      noteBase64: noteToBase64(matchingTxn.note),
      generationBuild: generationBuild ?? null,
      championName:
        typeof championName === 'string' && championName.trim()
          ? championName.trim().slice(0, 32)
          : null,
      randomName: randomName !== false,
      createdAt: serverTimestamp(),
    })

    await setDoc(queuedRef, queuedPayload)

    return jsonSafeResponse(res, 200, {
      status: 'queued',
      txnId: matchedPaymentTxnId,
    })
  } catch (err) {
    console.error('Error in addDocToCollection:', err)
    return jsonSafeResponse(res, 500, {
      error: 'Internal Server Error',
      details: err?.message ?? String(err),
    })
  }
}

export default addDocToCollection
