// integrated-duel-generator.js
// Firebase + Algorand ARENA characters ONLY
// Uses your advanced vertical fight pipeline (frames, stats/move panels, audio, YouTube, scheduler)
// but pulls characters, stats, moves, and sprites from Firestore + on-chain arena app.

import 'dotenv/config'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'path'
import OpenAI, { toFile } from 'openai'
import Jimp from 'jimp'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffprobeInstaller from '@ffprobe-installer/ffprobe'
import wavPkg from 'node-wav'
import { google } from 'googleapis'
import algosdk from 'algosdk'

// === Firebase (client SDK) ===
import { initializeApp, getApps } from 'firebase/app'
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  getDocsFromServer,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'

import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"


const WAV = wavPkg?.default ?? wavPkg

ffmpeg.setFfmpegPath(ffmpegInstaller.path)
ffmpeg.setFfprobePath(ffprobeInstaller.path)

/* ===================== CONFIG ===================== */


const OUT_DIR = path.resolve('./out')
// Root folder that holds battleMusic, damageOverTime, death, hit, miss


// Fight / cinematics (wide 16:9 for four-corner team battles)
const FIGHT_BG_SIZE = '1536x864'
const FIGHT_FPS = 30
const FIGHT_FRAMES_A = 45
const FIGHT_FRAMES_B = 45
const EMOTE_DURATION_SEC = 1.0
const EMOTE_FRAMES = Math.max(1, Math.round(EMOTE_DURATION_SEC * FIGHT_FPS))

// Camera timings
const ZOOM_IN_FRAMES = 20
const STATS_HOLD_FRAMES = 90
const ZOOM_OUT_FRAMES = 20

// Zoom levels
const ZOOM_MAX = 1.8
const STATS_ZOOM_BUMP = 0.15
const VICTORY_ZOOM_MAX = 2.25

// Boards placement
const STAT_BOARD_TOP_GAP = 48
const MOVE_BOARD_BOTTOM_GAP = 48
const STATS_PANEL_CLEARANCE = 16
const PANEL_SIDE_MARGIN_PX = 24

// Pan down less when showing stats
const STATS_PREFERRED_OFFSET_FRACTION = 0.005


// Creature placement / fight layout
const PROJECTILE_DURATION_SEC = 2.13
const PROJECTILE_FRAMES = Math.max(1, Math.round(PROJECTILE_DURATION_SEC * FIGHT_FPS))
const PROJECTILE_HEIGHT_FRACTION = 0.18
const FIGHT_SCALE_FRACTION = 0.12
const GROUP_FIGHT_SCALE_FRACTION = 0.105

// Physical move timings
const PHYS_APPROACH_FRAMES = 32
const PHYS_RETREAT_FRAMES = 24
const PHYS_PROJECTILE_FRAMES = 16

// Victory scene
const VICTORY_ZOOM_IN_FR = 24
const VICTORY_HOLD_FRAMES = 60
const VICTORY_BANNER_FRAMES = 90
const VICTORY_BANNER_TOP = 48

// Bars
const HEALTH_BAR_W = 180
const HEALTH_BAR_H = 16
const COOLDOWN_BAR_W = HEALTH_BAR_W
const COOLDOWN_BAR_H = 6

function uniqueNonEmptyStrings(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
}

const ALGOD_SERVERS = uniqueNonEmptyStrings([
  process.env.ALGOD_SERVER,
  process.env.ALGOD_URL,
  'https://mainnet-api.algonode.cloud',
  'https://mainnet-api.4160.nodely.dev',
])

const INDEXER_SERVERS = uniqueNonEmptyStrings([
  process.env.INDEXER_SERVER,
  process.env.INDEXER_URL,
  'https://mainnet-idx.algonode.cloud',
  'https://mainnet-idx.4160.nodely.dev',
])

function makeAlgodClient(server) {
  return new algosdk.Algodv2('', server, 443)
}

function makeIndexerClient(server) {
  return new algosdk.Indexer('', server, 443)
}

function getProviderErrorCode(error) {
  return String(error?.cause?.code || error?.code || '')
}

function isRetryableProviderError(error) {
  const code = getProviderErrorCode(error)
  const message = String(error?.message || error || '')
  return (
    ['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'].includes(code) ||
    message.includes('fetch failed') ||
    message.includes('HTTP Status 408') ||
    message.includes('HTTP Status 425') ||
    message.includes('HTTP Status 429') ||
    message.includes('HTTP Status 500') ||
    message.includes('HTTP Status 502') ||
    message.includes('HTTP Status 503') ||
    message.includes('HTTP Status 504') ||
    message.includes('socket hang up')
  )
}

function providerSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let activeAlgodServer = ALGOD_SERVERS[0]
let client = makeAlgodClient(activeAlgodServer)
let params = null

let activeIndexerServer = INDEXER_SERVERS[0]
let algodIndexer = makeIndexerClient(activeIndexerServer)

async function runAlgodRequestWithFallback(action, label = 'Algod request') {
  let lastError = null

  for (const server of ALGOD_SERVERS) {
    const candidate = server === activeAlgodServer ? client : makeAlgodClient(server)

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const result = await action(candidate)
        if (server !== activeAlgodServer) {
          activeAlgodServer = server
          client = candidate
          console.log(`${label}: switched Algod provider to ${server}`)
        }
        return { result, client: candidate, server }
      } catch (error) {
        lastError = error
        if (!isRetryableProviderError(error)) throw error

        const delayMs = 500 * attempt
        console.warn(
          `${label} failed on ${server} (attempt ${attempt}/2): ${error?.message || error}`
        )
        if (attempt < 2) await providerSleep(delayMs)
      }
    }
  }

  throw lastError || new Error(`${label} failed on every Algod provider`)
}

async function runIndexerRequestWithFallback(action, label = 'Indexer request') {
  let lastError = null

  for (const server of INDEXER_SERVERS) {
    const candidate = server === activeIndexerServer ? algodIndexer : makeIndexerClient(server)

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const result = await action(candidate)
        if (server !== activeIndexerServer) {
          activeIndexerServer = server
          algodIndexer = candidate
          console.log(`${label}: switched Indexer provider to ${server}`)
        }
        return { result, client: candidate, server }
      } catch (error) {
        lastError = error
        if (!isRetryableProviderError(error)) throw error

        const delayMs = 500 * attempt
        console.warn(
          `${label} failed on ${server} (attempt ${attempt}/2): ${error?.message || error}`
        )
        if (attempt < 2) await providerSleep(delayMs)
      }
    }
  }

  throw lastError || new Error(`${label} failed on every Indexer provider`)
}

async function getSuggestedParamsWithFallback() {
  const response = await runAlgodRequestWithFallback(
    (algodClient) => algodClient.getTransactionParams().do(),
    'Fetch suggested params'
  )
  params = response.result
  return response
}



/* ===================== YOUTUBE/OAUTH CONFIG ===================== */
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const DEFAULT_GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN_FALLBACK || ""
let GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || ""
let GOOGLE_REFRESH_TOKEN2 = process.env.GOOGLE_REFRESH_TOKEN2 || ""

const HOUSE_MNEMONIC = process.env.DC_WALLET || process.env.HOUSE_MNEMONIC || ""
if (!HOUSE_MNEMONIC) {
  throw new Error("Set DC_WALLET or HOUSE_MNEMONIC in your environment before running darkTeamFight.js")
}
const houseAccount = algosdk.mnemonicToSecretKey(HOUSE_MNEMONIC)


// Firebase public config (to fetch creds/creds.GOOGLE_REFRESH_TOKEN and chars)
const firebaseConfig = {
  apiKey: "AIzaSyDqIv-4wBs-ublbAx0I_0PXTT1WmMqSRLY",
  authDomain: "dark-coin-dc4a3.firebaseapp.com",
  projectId: "dark-coin-dc4a3",
  storageBucket: "dark-coin-dc4a3.appspot.com",
  messagingSenderId: "167442935007",
  appId: "1:167442935007:web:f231176971bc58c7f84d6a",
  measurementId: "G-6DQ60L8DWM"
}
const firebase_app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(firebase_app)
const auth = getAuth(firebase_app)
const FIREBASE_AUTH_EMAIL = process.env.FIREBASE_AUTH_EMAIL || 'abergquist96@gmail.com'
let _firebaseWriteAuthPromise = null

async function ensureFirebaseWriteAuth() {
  if (_firebaseWriteAuthPromise) return _firebaseWriteAuthPromise

  const password = process.env.FIREBASE_AUTH_PASSWORD || process.env.EMAILPASS
  if (!password) {
    console.warn(
      'Firebase write auth password not found; attempting active champion reservation writes without signing in.'
    )
    _firebaseWriteAuthPromise = Promise.resolve(null)
    return _firebaseWriteAuthPromise
  }

  _firebaseWriteAuthPromise = signInWithEmailAndPassword(
    auth,
    FIREBASE_AUTH_EMAIL,
    password
  )
    .then(async ({ user }) => {
      const idToken = await user.getIdToken()
      console.log('Authenticated to Firebase for active champion reservations, idToken length:', idToken.length)
      return user
    })
    .catch((error) => {
      console.warn(
        'Firebase write auth failed; attempting active champion reservation writes without signed-in auth:',
        error?.message || error
      )
      return null
    })

  return _firebaseWriteAuthPromise
}

async function readRefreshTokensFromFirebase() {
  const ref = doc(db, 'creds', 'creds')
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Cred doc not found: creds/creds')
  const data = snap.data() || {}
  const token1 = (data?.GOOGLE_REFRESH_TOKEN ?? '').toString().trim()
  const token2 = (data?.GOOGLE_REFRESH_TOKEN2 ?? '').toString().trim()
  if (!token1 && !token2) {
    throw new Error("Fields 'GOOGLE_REFRESH_TOKEN' and 'GOOGLE_REFRESH_TOKEN2' are empty in creds/creds")
  }
  return {
    GOOGLE_REFRESH_TOKEN: token1,
    GOOGLE_REFRESH_TOKEN2: token2,
  }
}

const longToByteArray = (long) => {
    // we want to represent the input as a 8-bytes array
    var byteArray = [0, 0, 0, 0, 0, 0, 0, 0];

    for ( var index = byteArray.length - 1; index > 0; index -- ) {
        var byte = long & 0xff;
        byteArray [ index ] = byte;
        long = (long - byte) / 256 ;
    }

    return byteArray;
};

const _youtubeClientsByTokenLabel = new Map()

async function ensureYouTubeRefreshTokens() {
  if (GOOGLE_REFRESH_TOKEN && GOOGLE_REFRESH_TOKEN2) return

  try {
    const tokens = await readRefreshTokensFromFirebase()
    if (!GOOGLE_REFRESH_TOKEN && tokens.GOOGLE_REFRESH_TOKEN) {
      GOOGLE_REFRESH_TOKEN = tokens.GOOGLE_REFRESH_TOKEN
      console.log('🔐 GOOGLE_REFRESH_TOKEN loaded from Firestore (creds/creds).')
    }
    if (!GOOGLE_REFRESH_TOKEN2 && tokens.GOOGLE_REFRESH_TOKEN2) {
      GOOGLE_REFRESH_TOKEN2 = tokens.GOOGLE_REFRESH_TOKEN2
      console.log('🔐 GOOGLE_REFRESH_TOKEN2 loaded from Firestore (creds/creds).')
    }
  } catch (e) {
    console.warn('⚠️ Failed to load Google refresh tokens from Firestore:', e?.message || e)
  }

  if (!GOOGLE_REFRESH_TOKEN) {
    GOOGLE_REFRESH_TOKEN = DEFAULT_GOOGLE_REFRESH_TOKEN
  }
}

async function getYouTubeRefreshTokenCandidates() {
  await ensureYouTubeRefreshTokens()

  const seen = new Set()
  return [
    { label: 'GOOGLE_REFRESH_TOKEN', token: GOOGLE_REFRESH_TOKEN },
    { label: 'GOOGLE_REFRESH_TOKEN2', token: GOOGLE_REFRESH_TOKEN2 },
  ].filter(({ token }) => {
    if (!token || seen.has(token)) return false
    seen.add(token)
    return true
  })
}

async function getYouTubeClient(refreshToken, tokenLabel = 'GOOGLE_REFRESH_TOKEN') {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn('⚠️ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET; skipping YouTube upload.')
    return null
  }

  if (!refreshToken) return null

  if (_youtubeClientsByTokenLabel.has(tokenLabel)) {
    return _youtubeClientsByTokenLabel.get(tokenLabel)
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    'http://localhost/unused'
  )
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const youtubeClient = google.youtube({ version: 'v3', auth: oauth2Client })
  _youtubeClientsByTokenLabel.set(tokenLabel, youtubeClient)
  return youtubeClient
}

function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return []
  const seen = new Set()
  const out = []
  let totalLen = 0
  for (const raw of tags) {
    const t = String(raw).trim().replace(/^#/, '')
    if (!t || seen.has(t)) continue
    if (t.length > 60) continue
    if (out.length >= 15) break
    if (totalLen + t.length > 450) break
    out.push(t)
    seen.add(t)
    totalLen += t.length
  }
  return out
}

async function uploadToYouTube({
  filePath,
  title,
  description,
  tags = [],
  categoryId = '20',
  privacyStatus = 'public',
  madeForKids = false,
}) {
  const tokenCandidates = await getYouTubeRefreshTokenCandidates()
  if (!tokenCandidates.length) {
    console.warn('⚠️ Skipping YouTube upload (missing Google OAuth config or refresh token).')
    return null
  }

  let lastError = null
  for (let i = 0; i < tokenCandidates.length; i += 1) {
    const { label, token } = tokenCandidates[i]
    const youtube = await getYouTubeClient(token, label)
    if (!youtube) return null

    try {
      console.log(`⏫ Uploading to YouTube Shorts using ${label}...`)
      const res = await youtube.videos.insert({
        part: 'snippet,status',
        requestBody: {
          snippet: { title, description, tags, categoryId },
          status: { privacyStatus, selfDeclaredMadeForKids: madeForKids },
        },
        media: { body: fs.createReadStream(filePath) },
      })
      const videoId = res?.data?.id
      if (!videoId) throw new Error('YouTube upload failed (no video ID in response).')
      console.log(`✅ YouTube video ID: ${videoId}`)
      console.log(`🔗 https://youtu.be/${videoId}`)
      return videoId
    } catch (e) {
      lastError = e
      const hasFallback = i < tokenCandidates.length - 1
      console.warn(
        `⚠️ YouTube upload failed using ${label}${hasFallback ? '; retrying with fallback token.' : '.'}`,
        e?.message || e
      )
    }
  }

  throw lastError || new Error('YouTube upload failed with all configured refresh tokens.')
}

function makeYouTubeMetadataShorts({
  aName,
  bName,
  durationSec,
}) {
  

  const title = `Dark Coin arena duel: ${aName} vs ${bName}`.slice(0, 100)

  const lines = []
  lines.push(
    `${aName} vs ${bName} — blockchain champions from the Dark Coin arena.`
  )
  
  lines.push(
  'Check out Dark Coin — blockchain-powered arena battles on Algorand!\n' +
  '👾 Join the Discord: https://discord.gg/P6At53Ze\n\n' +
  '#shorts #algorand #darkcoin #gamedev #blockchaingaming'
  )

  const tags = sanitizeTags([
    'shorts',
    'Dark Coin',
    'Algorand',
    'blockchain gaming',
    'medieval duel',
    'AI animation',
    'gamedev',
    'indie dev',
    'openai',
    'nodejs',
    'ffmpeg',
  ])

  return {
    title,
    description: lines.join('\n').slice(0, 4900),
    tags,
    categoryId: '20',
  }
}

function makeYouTubeMetadataTeamBattle({
  names = [],
  teamNames = [],
  winnerName = null,
  winnerTeamName = null,
  durationSec,
}) {
  const cleanNames = names.map((name) => String(name || '').trim()).filter(Boolean)
  const cleanTeams = teamNames.map((name) => String(name || '').trim()).filter(Boolean)
  const titleNames = cleanTeams.length === 2 ? cleanTeams.join(' vs ') : cleanNames.join(' vs ')
  const title = `Dark Coin arena team battle: ${titleNames}`.slice(0, 100)

  const lines = []
  lines.push(`${titleNames} - two wallets send paired champions into the Dark Coin arena.`)
  if (winnerTeamName) {
    lines.push(`Winning team: ${winnerTeamName}.`)
  } else if (winnerName) {
    lines.push(`Winning champions: ${winnerName}.`)
  }
  if (durationSec) {
    lines.push(`Runtime: ${Math.round(durationSec)} seconds.`)
  }
  lines.push(
    'Check out Dark Coin - blockchain-powered arena battles on Algorand!\n' +
      'Join the Discord: https://discord.gg/P6At53Ze\n\n' +
      '#algorand #darkcoin #gamedev #blockchaingaming'
  )

  const tags = sanitizeTags([
    'Dark Coin',
    'Algorand',
    'blockchain gaming',
    'two versus two battle',
    'team battle',
    'medieval arena',
    'AI animation',
    'gamedev',
    'indie dev',
    'openai',
    'nodejs',
    'ffmpeg',
  ])

  return {
    title,
    description: lines.join('\n').slice(0, 4900),
    tags,
    categoryId: '20',
  }
}

/* ===================== HELPERS ===================== */


function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}
async function emptyDir(p) {
  await fsp.mkdir(p, { recursive: true })
  const entries = await fsp.readdir(p).catch(() => [])
  await Promise.all(
    entries.map((e) =>
      fsp.rm(path.join(p, e), { recursive: true, force: true })
    )
  )
}
function parseSize(s) {
  const [w, h] = s.toLowerCase().split('x').map(Number)
  if (!Number.isFinite(w) || !Number.isFinite(h))
    throw new Error(`Bad size: ${s}`)
  return { W: w, H: h }
}

function slugify(s) {
  return (
    String(s || 'character')
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 64) || 'character'
  )
}
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.DALLE_KEY
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY / DALLE_KEY')
  return new OpenAI({ apiKey })
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

/* ===== Jimp fonts ===== */
function nearestFontSize(size) {
  const sizes = [8, 16, 32, 64]
  const wanted = Number(size) || 32
  return sizes.reduce(
    (best, s) =>
      Math.abs(s - wanted) < Math.abs(best - wanted) ? s : best,
    32
  )
}
async function loadFontBuiltin(size = 32, color = 'white') {
  const sz = nearestFontSize(size)
  const palette =
    String(color).toLowerCase() === 'black' ? 'BLACK' : 'WHITE'
  const key = `FONT_SANS_${sz}_${palette}`
  if (!Jimp[key]) throw new Error(`Missing built-in Jimp font: ${key}`)
  return Jimp.loadFont(Jimp[key])
}

async function renderOutlinedPopupText(text, scale = 1) {
  const safeText = String(text || '')
  const fontWhite = await loadFontBuiltin(32, 'white')
  const fontBlack = await loadFontBuiltin(32, 'black')
  const padding = 4
  const textW = Math.max(1, Jimp.measureText(fontWhite, safeText))
  const textH = Math.max(1, Jimp.measureTextHeight(fontWhite, safeText, textW))
  const image = new Jimp(textW + padding * 2, textH + padding * 2, 0x00000000)
  image.print(fontBlack, padding + 1, padding + 1, safeText)
  image.print(fontWhite, padding, padding, safeText)

  const normalizedScale = Math.max(0.1, Number(scale) || 1)
  if (Math.abs(normalizedScale - 1) > 0.01) {
    image.resize(
      Math.max(1, Math.round(image.bitmap.width * normalizedScale)),
      Math.max(1, Math.round(image.bitmap.height * normalizedScale))
    )
  }

  return image
}

/* ===================== OUTPUT CANVAS (1080×1920 with edge-blended padding) ===================== */
const OUT_CANVAS_W = 1920
const OUT_CANVAS_H = 1080

function _avgEdgeColor(img, band = 10) {
  const W = img.bitmap.width,
    H = img.bitmap.height
  const clampBand = Math.max(
    1,
    Math.min(band, Math.floor(Math.min(W, H) * 0.05))
  )
  let r = 0,
    g = 0,
    b = 0,
    n = 0
  const data = img.bitmap.data
  const push = (x, y) => {
    const idx = (W * y + x) << 2
    const a = data[idx + 3]
    if (a === 0) return
    r += data[idx + 0]
    g += data[idx + 1]
    b += data[idx + 2]
    n++
  }
  for (let y = 0; y < clampBand; y++)
    for (let x = 0; x < W; x++) push(x, y)
  for (let y = H - clampBand; y < H; y++)
    for (let x = 0; x < W; x++) push(x, y)
  for (let x = 0; x < clampBand; x++)
    for (let y = 0; y < H; y++) push(x, y)
  for (let x = W - clampBand; x < W; x++)
    for (let y = 0; y < H; y++) push(x, y)

  if (n === 0) return Jimp.rgbaToInt(14, 10, 8, 255)
  const rr = Math.round(r / n),
    gg = Math.round(g / n),
    bb = Math.round(b / n)
  return Jimp.rgbaToInt(rr, gg, bb, 255)
}

/** Scale any frame to fit inside 1080×1920 and pad with an edge-blended color. */
async function writePaddedFrameToOutputCanvas(img, outPath) {
  const inW = img.bitmap.width,
    inH = img.bitmap.height
  const scale = Math.min(OUT_CANVAS_W / inW, OUT_CANVAS_H / inH)
  const newW = Math.max(1, Math.round(inW * scale))
  const newH = Math.max(1, Math.round(inH * scale))
  const padColor = _avgEdgeColor(img)
  const canvas = new Jimp(OUT_CANVAS_W, OUT_CANVAS_H, padColor)
  const scaled = img.clone().resize(newW, newH, Jimp.RESIZE_BICUBIC)
  const ox = Math.round((OUT_CANVAS_W - newW) / 2)
  const oy = Math.round((OUT_CANVAS_H - newH) / 2)
  canvas.composite(scaled, ox, oy)
  await canvas.writeAsync(outPath)
}

/** Centralized writer used everywhere frames are emitted. */
async function saveFrame(outFramesDir, fIdx, frame) {
  const fname = `frame_${String(fIdx).padStart(4, '0')}.png`
  await writePaddedFrameToOutputCanvas(
    frame,
    path.join(outFramesDir, fname)
  )
}

/* ===================== TYPES / COLORS ===================== */
const TYPES = [
  'Normal',
  'Steel',
  'Fire',
  'Ice',
  'Nature',
  'Holy',
  'Dark',
  'Arcane',
  'Earth',
  'Water',
  'Poison',
  'Undead',
]
const TYPE_COLORS = {
  Normal: '#A8A77A',
  Steel: '#B7B7CE',
  Fire: '#EE8130',
  Ice: '#96D9D6',
  Nature: '#7AC74C',
  Holy: '#F9E27D',
  Dark: '#705746',
  Arcane: '#7C3AED',
  Earth: '#E2BF65',
  Water: '#6390F0',
  Poison: '#A33EA1',
  Undead: '#6B7280',
}

/* ===================== RPG STATS BOUNDS (for UI only) ===================== */
const STAT_BOUNDS = {
  strength: { min: 0, max: 50, label: 'STR' },
  dexterity: { min: 0, max: 50, label: 'DEX' },
  intelligence: { min: 0, max: 50, label: 'INT' },
  speed: { min: 0, max: 200, label: 'SPD' },
  resist: { min: 0, max: 50, label: 'RES' },
  health: { min: 0, max: 400, label: 'HP' },
}



const ITEM_VOTE_APP_ID = 3339943603;
const EFFECT_STRIDE = 2000;
const ITEM_POTENCY_DAO_SUFFIX = 1037;
const ARENA_MAP_INFO_END_GAME_ROUND = 100

/* ===================== ARENA MAPS ===================== */
const STANDARD_TIE_BREAKERS = [
  "If tied, champion with more current health wins.",
  "If still tied, champion with the lowest champion NFT assetId wins.",
]

function exponentialStackEndGame(effect, displayName) {
  return {
    startsRound: ARENA_MAP_INFO_END_GAME_ROUND,
    type: "exponentialStackRamp",
    name: `${displayName} Cascade`,
    description: `Starting on the endgame round, remaining champions gain exponentially increasing ${effect} stacks after each round until the match ends.`,
    roundStackFormula: `2 ^ (currentRound - endgameRound) ${effect} stacks applied to each remaining champion after the round resolves.`,
    winnerCriteria: [
      "The match continues while the exponential stacks are applied after each round.",
      `Turn-by-turn ${effect} stack damage decides the winner.`,
    ],
    resolution: {
      mode: "continueUntilDefeat",
      appliedEffect: effect,
      stackFormula: "2 ** (currentRound - startsRound)",
      appliesTo: "bothChampions",
    },
  }
}

function suddenEndGame({ name, description, primaryCriterion, primaryMetric, direction }) {
  return {
    startsRound: ARENA_MAP_INFO_END_GAME_ROUND,
    type: "suddenArenaJudgment",
    name,
    description,
    winnerCriteria: [primaryCriterion, ...STANDARD_TIE_BREAKERS],
    resolution: {
      mode: "decideAtRoundStart",
      primaryMetric,
      direction,
      tieBreakers: ["currentHealth:highest", "assetId:lowest"],
    },
  }
}

const ARENA_EFFECT_MAPS = {
  poison: {
    effect: "poison",
    name: "Mire of Sludge",
    terrain: "A toxic marsh of sludge.",
    passiveEffect: {
      boostedEffect: "poison",
      description: "Poison applied by attacks gains +1 stack.",
      modifier: { applicationStacksBonus: 1 },
    },
    endGameEffect: exponentialStackEndGame("poison", "Venom"),
  },
  bleed: {
    effect: "bleed",
    name: "Knife Chamber",
    terrain: "A dark dungeon of knives.",
    passiveEffect: {
      boostedEffect: "bleed",
      description: "Melee hits apply +2 bleed stacks.",
      modifier: { meleeApplicationStacksBonus: 2 },
    },
    endGameEffect: exponentialStackEndGame("bleed", "Blood"),
  },
  burn: {
    effect: "burn",
    name: "Ashen Crucible",
    terrain: "A furnace arena ringed by molten vents and falling cinders.",
    passiveEffect: {
      boostedEffect: "burn",
      description: "Burn damage ticks are 35% stronger.",
      modifier: { ongoingDamageMultiplier: 1.35 },
    },
    endGameEffect: exponentialStackEndGame("burn", "Inferno"),
  },
  freeze: {
    effect: "freeze",
    name: "Glacier Court",
    terrain: "A silent ice court where motion slows and every strike echoes.",
    passiveEffect: {
      boostedEffect: "freeze",
      description: "Freeze speed penalties are 50% stronger.",
      modifier: { speedPenaltyMultiplier: 1.5 },
    },
    endGameEffect: suddenEndGame({
      name: "Whiteout Collapse",
      description: "On the endgame round, the ice shelf gives way and the champion moving faster stays on the last stable ground.",
      primaryCriterion: "Champion with higher speed at the start of the endgame round wins.",
      primaryMetric: "speed",
      direction: "highest",
    }),
  },
  slow: {
    effect: "slow",
    name: "Hourglass Ruins",
    terrain: "Broken time-stones drag every step through thick golden dust.",
    passiveEffect: {
      boostedEffect: "slow",
      description: "Slow applications gain +2 stacks, and magic hits apply +2 slow stacks. ",
      modifier: { applicationStacksBonus: 2, magicApplicationStacksBonus: 2 },
    },
    endGameEffect: suddenEndGame({
      name: "Last Grain",
      description: "On the endgame round, time stops for the fighter carrying the heavier temporal burden.",
      primaryCriterion: "Champion with fewer slow stacks at the start of the endgame round wins.",
      primaryMetric: "slowStacks",
      direction: "lowest",
    }),
  },
  drown: {
    effect: "drown",
    name: "Abyssal Causeway",
    terrain: "A half-submerged bridge where the tide rises each round.",
    passiveEffect: {
      boostedEffect: "drown",
      description: "Drown accuracy penalties are 30% stronger, and ranged attacks apply +1 drown stack.",
      modifier: { accuracyPenaltyMultiplier: 1.3, rangedApplicationStacksBonus: 1 },
    },
    endGameEffect: suddenEndGame({
      name: "Tide Claim",
      description: "On the endgame round, the tide covers the causeway and only the steadier fighter keeps their footing.",
      primaryCriterion: "Champion with higher dexterity at the start of the endgame round wins.",
      primaryMetric: "dexterity",
      direction: "highest",
    }),
  },
  paralyze: {
    effect: "paralyze",
    name: "Stormcoil Spire",
    terrain: "A lightning-struck tower where charged stone hums underfoot.",
    passiveEffect: {
      boostedEffect: "paralyze",
      description: "Paralyze accuracy penalties are 40% stronger, and melee hits apply +2 paralyze stacks.",
      modifier: { accuracyPenaltyMultiplier: 1.4, meleeApplicationStacksBonus: 2 },
    },
    endGameEffect: suddenEndGame({
      name: "Lightning Rod",
      description: "On the endgame round, the spire discharges into the fighter carrying more charge.",
      primaryCriterion: "Champion with fewer paralyze stacks at the start of the endgame round wins.",
      primaryMetric: "paralyzeStacks",
      direction: "lowest",
    }),
  },
  doom: {
    effect: "doom",
    name: "Eclipse Sepulcher",
    terrain: "A black shrine where every shadow whispers the final count.",
    passiveEffect: {
      boostedEffect: "doom",
      description: "Doom applications gain +1 stack, and doom resist penalties are 30% stronger.",
      modifier: { applicationStacksBonus: 1, resistPenaltyMultiplier: 1.3 },
    },
    endGameEffect: exponentialStackEndGame("doom", "Eclipse"),
  },
  shield: {
    effect: "shield",
    name: "Aegis Bastion",
    terrain: "A fortress platform where ancient wards harden around defenders.",
    passiveEffect: {
      boostedEffect: "shield",
      description: "Shield gains block 40% more damage.",
      modifier: { blockMultiplier: 1.4 },
    },
    endGameEffect: suddenEndGame({
      name: "Bastion Lock",
      description: "On the endgame round, the fortress gates seal around the better-defended champion.",
      primaryCriterion: "Champion with more shield stacks at the start of the endgame round wins.",
      primaryMetric: "shieldStacks",
      direction: "highest",
    }),
  },
  strengthen: {
    effect: "strengthen",
    name: "Titan Ring",
    terrain: "A giant-carved arena that rewards raw force and heavy blows.",
    passiveEffect: {
      boostedEffect: "strengthen",
      description: "Strengthen potency is 40% stronger.",
      modifier: { strengthBonusMultiplier: 1.4 },
    },
    endGameEffect: suddenEndGame({
      name: "Titan's Measure",
      description: "On the endgame round, the ring chooses the champion with the greater force behind their blows.",
      primaryCriterion: "Champion with higher strength at the start of the endgame round wins.",
      primaryMetric: "strength",
      direction: "highest",
    }),
  },
  focus: {
    effect: "focus",
    name: "Eagle-Eye Perch",
    terrain: "A cliffside arena where every opening becomes visible.",
    passiveEffect: {
      boostedEffect: "focus",
      description: "Missed attacks grant +1 focus stack.",
      modifier: { missedAttackStacksBonus: 1 },
    },
    endGameEffect: suddenEndGame({
      name: "True Shot",
      description: "On the endgame round, the arena narrows to one decisive opening.",
      primaryCriterion: "Champion with highest dexterity at the start of the endgame round wins.",
      primaryMetric: "dexterity",
      direction: "highest",
    }),
  },
  empower: {
    effect: "empower",
    name: "Arcane Conduit",
    terrain: "A spell lattice that magnifies every surge of willpower.",
    passiveEffect: {
      boostedEffect: "empower",
      description: "Empower applications gain +2 stacks.",
      modifier: { applicationStacksBonus: 2 },
    },
    endGameEffect: suddenEndGame({
      name: "Mana Overload",
      description: "On the endgame round, the conduit overloads and crowns the stronger caster.",
      primaryCriterion: "Champion with higher intelligence at the start of the endgame round wins.",
      primaryMetric: "intelligence",
      direction: "highest",
    }),
  },
  nurture: {
    effect: "nurture",
    name: "Verdant Hollow",
    terrain: "A living grove where roots stitch wounds as quickly as blades open them.",
    passiveEffect: {
      boostedEffect: "nurture",
      description: "Nurture healing is 20% stronger.",
      modifier: { healingMultiplier: 1.2 },
    },
    endGameEffect: suddenEndGame({
      name: "Overgrowth",
      description: "On the endgame round, the grove binds itself to the slowest champion",
      primaryCriterion: "Champion with the most speed at the start of the endgame round wins.",
      primaryMetric: "speed",
      direction: "highest",
    }),
  },
  bless: {
    effect: "bless",
    name: "Sun-Blessed Dais",
    terrain: "A radiant platform where divine favor gathers around the worthy.",
    passiveEffect: {
      boostedEffect: "bless",
      description: "First bless gained each battle grants +20 stacks.",
      modifier: { firstGainPerBattleStacksBonus: 20 },
    },
    endGameEffect: suddenEndGame({
      name: "Radiant Decree",
      description: "On the endgame round, the dais judges which champion carries the stronger blessing.",
      primaryCriterion: "Champion with more bless stacks at the start of the endgame round wins.",
      primaryMetric: "blessStacks",
      direction: "highest",
    }),
  },
  hasten: {
    effect: "hasten",
    name: "Quickglass Track",
    terrain: "A mirrored sprintway where time bends toward the fastest champion.",
    passiveEffect: {
      boostedEffect: "hasten",
      description: "Hasten speed bonuses are 40% stronger.",
      modifier: { speedBonusMultiplier: 1.4 },
    },
    endGameEffect: suddenEndGame({
      name: "Final Dash",
      description: "On the endgame round, the track collapses behind the slower champion.",
      primaryCriterion: "Champion with higher speed at the start of the endgame round wins.",
      primaryMetric: "speed",
      direction: "highest",
    }),
  },
  cleanse: {
    effect: "cleanse",
    name: "Purity Well",
    terrain: "A moonlit spring that rejects corruption and rewards clarity.",
    passiveEffect: {
      boostedEffect: "cleanse",
      description: "Cleanse removes +1 additional negative stack.",
      modifier: { extraNegativeStacksRemoved: 1 },
    },
    endGameEffect: suddenEndGame({
      name: "Pure Reflection",
      description: "On the endgame round, the well reflects the most resistant champion.",
      primaryCriterion: "Champion with the highest resist at the start of the endgame round wins.",
      primaryMetric: "resist",
      direction: "highest",
    }),
  },
}

const ARENA_EFFECT_MAP_LIST = Object.values(ARENA_EFFECT_MAPS)

function getArenaEffectMap(effect) {
  return ARENA_EFFECT_MAPS[String(effect || "").toLowerCase()] || null
}

function getRandomArenaEffectMap(random = Math.random) {
  const maps = ARENA_EFFECT_MAP_LIST
  return maps[Math.floor(random() * maps.length)]
}

function getArenaMapModifier(arenaMap) {
  return arenaMap?.passiveEffect?.modifier || {}
}

function getArenaMapEffect(arenaMap) {
  return String(arenaMap?.effect || arenaMap?.passiveEffect?.boostedEffect || '').toLowerCase()
}

function isArenaMapEffect(arenaMap, effectKey) {
  return Boolean(getArenaMapEffect(arenaMap)) && getArenaMapEffect(arenaMap) === String(effectKey || '').toLowerCase()
}

function getMoveRangeRoot(category) {
  const root = String(category || '').toLowerCase().split(/\s+/)[0]
  if (root === 'melee' || root === 'ranged' || root === 'magic') return root
  return null
}

function getArenaMapApplicationAmount({ arenaMap, effectKey, amount, category = null, targetEffects = {} }) {
  let nextAmount = safeNumber(amount, 0)
  const key = String(effectKey || '').toLowerCase()
  const modifier = getArenaMapModifier(arenaMap)

  if (!nextAmount || !key || !isArenaMapEffect(arenaMap, key)) return nextAmount

  if (key === 'cleanse') {
    nextAmount += safeNumber(modifier.extraNegativeStacksRemoved, 0)
  }

  nextAmount += safeNumber(modifier.applicationStacksBonus, 0)

  if (key === 'bless' && getStack(targetEffects, 'bless') <= 0) {
    nextAmount += safeNumber(modifier.firstGainPerBattleStacksBonus, 0)
  }

  return nextAmount
}

function getArenaMapHitBonus(arenaMap, category) {
  const range = getMoveRangeRoot(category)
  if (!range) return null

  const effectKey = getArenaMapEffect(arenaMap)
  const amount = safeNumber(getArenaMapModifier(arenaMap)[`${range}ApplicationStacksBonus`], 0)
  return effectKey && amount > 0 ? { effectKey, amount } : null
}

function getArenaMapMissBonus(arenaMap) {
  const effectKey = getArenaMapEffect(arenaMap)
  const amount = safeNumber(getArenaMapModifier(arenaMap).missedAttackStacksBonus, 0)
  return effectKey && amount > 0 ? { effectKey, amount } : null
}

function getArenaMapEndGame(arenaMap) {
  return arenaMap?.endGameEffect || null
}

function getArenaMapEndGameRound(arenaMap) {
  return safeNumber(getArenaMapEndGame(arenaMap)?.startsRound, ARENA_MAP_INFO_END_GAME_ROUND)
}

function formatArenaMapTitle(arenaMap) {
  return arenaMap?.name ? String(arenaMap.name) : 'Unknown Arena'
}

function cleanArenaInfoText(text) {
  return String(text || '')
    .replace(/\bflat\s+([a-z]+\s+stacks?)\b/gi, '$1')
    .replace(/\bflat\s+stacks?\b/gi, 'stacks')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeArenaEndGameRoundText(text) {
  return String(text || '')
    .replace(/\bStarting\s+at\s+round\s+\d+\b/g, 'Starting on the endgame round')
    .replace(/\bstarting\s+at\s+round\s+\d+\b/g, 'starting on the endgame round')
    .replace(/\bStarting\s+on\s+round\s+\d+\b/g, 'Starting on the endgame round')
    .replace(/\bstarting\s+on\s+round\s+\d+\b/g, 'starting on the endgame round')
    .replace(/\bat\s+the\s+start\s+of\s+round\s+\d+\b/gi, 'at the start of the endgame round')
    .replace(/\bAt\s+round\s+\d+\b/g, 'On the endgame round')
    .replace(/\bat\s+round\s+\d+\b/g, 'on the endgame round')
    .replace(/\bOn\s+round\s+\d+\b/g, 'On the endgame round')
    .replace(/\bon\s+round\s+\d+\b/g, 'on the endgame round')
    .replace(/\bRound\s+\d+\b/g, 'The endgame round')
    .replace(/\bround\s+\d+\b/gi, 'the endgame round')
}

function formatArenaEffectName(effectKey) {
  const value = String(effectKey || '').trim()
  if (!value) return 'Effect'
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function formatArenaStackWord(amount) {
  return Math.abs(Number(amount) || 0) === 1 ? 'stack' : 'stacks'
}

function formatArenaSignedNumber(value) {
  const amount = safeNumber(value, 0)
  return `${amount > 0 ? '+' : ''}${amount}`
}

function formatArenaMultiplier(value) {
  const amount = safeNumber(value, 1)
  return Number.isInteger(amount) ? `${amount}` : amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function formatArenaMapPassiveAdjustments(arenaMap) {
  const modifier = getArenaMapModifier(arenaMap)
  const effectKey = getArenaMapEffect(arenaMap)
  const effectName = formatArenaEffectName(effectKey)
  const adjustments = []

  const pushStacks = (label, amount, namedEffect = effectName) => {
    const stacks = safeNumber(amount, 0)
    if (!stacks) return
    const effectText = namedEffect ? `${namedEffect} ` : ''
    adjustments.push(`${label} ${formatArenaSignedNumber(stacks)} ${effectText}${formatArenaStackWord(stacks)}`)
  }

  pushStacks(`${effectName} applications`, modifier.applicationStacksBonus, '')
  pushStacks('Melee hits apply', modifier.meleeApplicationStacksBonus)
  pushStacks('Ranged attacks apply', modifier.rangedApplicationStacksBonus)
  pushStacks('Magic hits apply', modifier.magicApplicationStacksBonus)
  pushStacks('Missed attacks grant', modifier.missedAttackStacksBonus)

  if (safeNumber(modifier.firstGainPerBattleStacksBonus, 0)) {
    const stacks = safeNumber(modifier.firstGainPerBattleStacksBonus, 0)
    adjustments.push(`First ${effectName} gain ${formatArenaSignedNumber(stacks)} ${formatArenaStackWord(stacks)}`)
  }
  if (safeNumber(modifier.extraNegativeStacksRemoved, 0)) {
    const stacks = safeNumber(modifier.extraNegativeStacksRemoved, 0)
    adjustments.push(`Cleanse removes ${formatArenaSignedNumber(stacks)} extra negative ${formatArenaStackWord(stacks)}`)
  }
  if (safeNumber(modifier.ongoingDamageMultiplier, 1) !== 1) {
    adjustments.push(`${effectName} damage x${formatArenaMultiplier(modifier.ongoingDamageMultiplier)}`)
  }
  if (safeNumber(modifier.healingMultiplier, 1) !== 1) {
    adjustments.push(`${effectName} healing x${formatArenaMultiplier(modifier.healingMultiplier)}`)
  }
  if (safeNumber(modifier.accuracyPenaltyMultiplier, 1) !== 1) {
    adjustments.push(`${effectName} accuracy penalty x${formatArenaMultiplier(modifier.accuracyPenaltyMultiplier)}`)
  }
  if (safeNumber(modifier.speedPenaltyMultiplier, 1) !== 1) {
    adjustments.push(`${effectName} speed penalty x${formatArenaMultiplier(modifier.speedPenaltyMultiplier)}`)
  }
  if (safeNumber(modifier.resistPenaltyMultiplier, 1) !== 1) {
    adjustments.push(`${effectName} resist penalty x${formatArenaMultiplier(modifier.resistPenaltyMultiplier)}`)
  }
  if (safeNumber(modifier.blockMultiplier, 1) !== 1) {
    adjustments.push(`Shield blocks x${formatArenaMultiplier(modifier.blockMultiplier)} damage`)
  }
  if (safeNumber(modifier.strengthBonusMultiplier, 1) !== 1) {
    adjustments.push(`Strengthen bonus x${formatArenaMultiplier(modifier.strengthBonusMultiplier)}`)
  }
  if (safeNumber(modifier.speedBonusMultiplier, 1) !== 1) {
    adjustments.push(`Hasten speed bonus x${formatArenaMultiplier(modifier.speedBonusMultiplier)}`)
  }

  return adjustments.filter(Boolean)
}

function formatArenaMapPassive(arenaMap) {
  const description = cleanArenaInfoText(arenaMap?.passiveEffect?.description || 'No passive effect.')
  const adjustments = formatArenaMapPassiveAdjustments(arenaMap)
  return adjustments.length
    ? `Adjustments: ${adjustments.join('; ')}.`
    : description
}

function formatArenaMetricName(metric) {
  const normalized = String(metric || '').toLowerCase()
  const labels = {
    currenthealth: 'Current health',
    speed: 'Speed',
    strength: 'Strength',
    dexterity: 'Dexterity',
    intelligence: 'Intelligence',
    resist: 'Resist',
    assetid: 'Champion asset ID',
  }
  if (labels[normalized]) return labels[normalized]

  const stackMatch = normalized.match(/^([a-z]+)stacks$/)
  if (stackMatch) {
    const effectName = stackMatch[1].charAt(0).toUpperCase() + stackMatch[1].slice(1)
    return `${effectName} stacks`
  }

  return String(metric || 'Current health')
}

function formatArenaEndGameDecision(endGame) {
  if (endGame?.resolution?.mode !== 'decideAtRoundStart') return ''

  const metric = endGame?.resolution?.primaryMetric || 'currentHealth'
  const metricName = formatArenaMetricName(metric)
  const metricIsStacks = /stacks$/i.test(String(metric || ''))
  const direction = String(endGame?.resolution?.direction || 'highest').toLowerCase()
  const winnerText = direction === 'lowest'
    ? metricIsStacks ? 'fewest wins' : 'lowest wins'
    : metricIsStacks ? 'most wins' : 'highest wins'

  return `Decision: ${metricName} (${winnerText}); ties use current health, then lower asset ID.`
}

function formatArenaEndGameResolution(endGame) {
  const mode = endGame?.resolution?.mode
  if (mode === 'decideAtRoundStart') return formatArenaEndGameDecision(endGame)

  if (mode === 'continueUntilDefeat') {
    const effectName = formatArenaEffectName(endGame?.resolution?.appliedEffect || '')
    return `Resolution: fight continues; after each action on and after the endgame round, remaining fighters gain 2^(current round - endgame round) ${effectName} stacks until defeat.`
  }

  return ''
}

function formatArenaMapEndGame(arenaMap, _endGameRoundOverride = null) {
  const endGame = getArenaMapEndGame(arenaMap)
  const description = normalizeArenaEndGameRoundText(cleanArenaInfoText(endGame?.description || ''))
  const resolution = normalizeArenaEndGameRoundText(formatArenaEndGameResolution(endGame))
  const text = [description, resolution].filter(Boolean).join(' ')
  const title = endGame?.name || 'Arena Judgment'

  return {
    label: 'END GAME',
    title,
    description: description ? `${title} - ${description}` : title,
    resolution,
    text: `${title} - ${text}`,
  }
}

function getArenaMapMetricValue({ metric, stats = {}, effects = {}, hp = 0, assetId = 0, arenaMap = null }) {
  const normalized = String(metric || '').toLowerCase()
  const adjusted = computeAttackerAdjustedStats(stats, effects, arenaMap)
  const defender = computeDefenderAdjustedStats(stats, effects, arenaMap)

  if (normalized === 'currenthealth') return safeNumber(hp, 0)
  if (normalized === 'speed') return getEffectiveSpeed(stats, effects, arenaMap)
  if (normalized === 'strength') return safeNumber(adjusted.strength, safeNumber(stats.strength, 0))
  if (normalized === 'dexterity') return safeNumber(adjusted.dexterity, safeNumber(stats.dexterity, 0))
  if (normalized === 'intelligence') return safeNumber(adjusted.intelligence, safeNumber(stats.intelligence, 0))
  if (normalized === 'resist') return safeNumber(defender.resist, safeNumber(stats.resist, 0))
  if (normalized === 'assetid') return safeNumber(assetId, 0)

  const stackMatch = normalized.match(/^([a-z]+)stacks$/)
  if (stackMatch) return getStack(effects, stackMatch[1])

  return 0
}

function compareArenaMapContestants(a, b, arenaMap, primaryMetric, direction = 'highest') {
  const aPrimary = getArenaMapMetricValue({ ...a, arenaMap, metric: primaryMetric })
  const bPrimary = getArenaMapMetricValue({ ...b, arenaMap, metric: primaryMetric })
  if (aPrimary !== bPrimary) {
    return direction === 'lowest' ? aPrimary - bPrimary : bPrimary - aPrimary
  }

  const aHp = getArenaMapMetricValue({ ...a, arenaMap, metric: 'currentHealth' })
  const bHp = getArenaMapMetricValue({ ...b, arenaMap, metric: 'currentHealth' })
  if (aHp !== bHp) return bHp - aHp

  return safeNumber(a.assetId, 0) - safeNumber(b.assetId, 0)
}

function pickArenaMapWinner(contestants, arenaMap) {
  const endGame = getArenaMapEndGame(arenaMap)
  const metric = endGame?.resolution?.primaryMetric || 'currentHealth'
  const direction = endGame?.resolution?.direction || 'highest'
  return [...contestants].sort((a, b) =>
    compareArenaMapContestants(a, b, arenaMap, metric, direction)
  )[0] || contestants[0] || null
}



const CHAMPION_TRAITS = {
  Background: [
    { assetId: 1631153255, trait: "Aqua Background", type: "Background", total: 132, effects: ["Increases Drown."] },
    { assetId: 1631164569, trait: "Blood Background", type: "Background", total: 144, effects: ["Increases Bleed."] },
    { assetId: 1631166128, trait: "Cosmos Background", type: "Background", total: 53, effects: ["Increases Intelligence", "Increases Resist."] },
    { assetId: 1631168001, trait: "Dungeon Background", type: "Background", total: 38, effects: ["Increases Doom."] },
    { assetId: 1631169006, trait: "Forest Background", type: "Background", total: 83, effects: ["Increases Health.", "Gain Nurture at start of battle."] },
    { assetId: 1631170742, trait: "Golden Background", type: "Background", total: 108, effects: ["Gain Bless at start of battle."] },
    { assetId: 1631172134, trait: "Midnight Background", type: "Background", total: 105, effects: ["Gain Focus at the start of battle."] },
    { assetId: 1631173209, trait: "Noir Background", type: "Background", total: 118, effects: ["Increases accuracy of curse type moves."] },
    { assetId: 1631173804, trait: "Red Moon Background", type: "Background", total: 19, effects: ["Apply Doom at the start of battle."] },
    { assetId: 1631175041, trait: "Sunset Background", type: "Background", total: 81, effects: ["Gain Cleanse at the start of battle."] },
    { assetId: 1631178480, trait: "Toxic Background", type: "Background", total: 119, effects: ["Increases Poison."] },
    { assetId: 1792634314, trait: "Valley Background", type: "Background", total: 40, effects: ["Increases Speed."] },
    { assetId: 3586495527, trait: "Golden Moon", type: "Background", total: 15, effects: ["Increases Bless.", "Gain Focus at the start of battle."] },
    { assetId: 2311097594, trait: "Waves Background", type: "Background", total: 65, effects: ["Apply Drown at the start of the battle."] },
    { assetId: 3668457144, trait: "Dawn Background", type: "Background", total: 35, effects: ["Increases Resist."] },
  ],
  Weapon: [
    { assetId: 1631181322, trait: "Dragon Long Sword", type: "Weapon", total: 63, effects: ["Apply Burn on melee hit."] },
    { assetId: 1631198641, trait: "Dragon Staff", type: "Weapon", total: 38, effects: ["Apply Burn at the start of battle."] },
    { assetId: 1631201003, trait: "Dual Katana", type: "Weapon", total: 79, effects: ["Increases Speed."] },
    { assetId: 1631202303, trait: "Executioner Axe", type: "Weapon", total: 99, effects: ["Increases Strength.", "Increases Health."] },
    { assetId: 1631204400, trait: "Scythe", type: "Weapon", total: 74, effects: ["Apply Bleed on melee hit.", "Apply Doom on magic hit."] },
    { assetId: 1631205295, trait: "Shield", type: "Weapon", total: 89, effects: ["Gain Shield at the start of battle."] },
    { assetId: 1631205996, trait: "Sickle", type: "Weapon", total: 78, effects: ["Increases Nurture.", "Apply Bleed on melee hit."] },
    { assetId: 1631207056, trait: "Spear", type: "Weapon", total: 95, effects: ["Increases Health.", "Apply Bleed on melee hit."] },
    { assetId: 1631207955, trait: "Trident", type: "Weapon", total: 112, effects: ["Apply Drown on melee hit."] },
    { assetId: 1792635942, trait: "Dark Sword", type: "Weapon", total: 40, effects: ["Apply Doom on melee hit."] },
    { assetId: 1792636565, trait: "Elf Bow", type: "Weapon", total: 40, effects: ["Gain Nurture on ranged hit."] },
    { assetId: 3586495825, trait: "Wooden Club", type: "Weapon", total: 45, effects: ["Increases Strength.", "Apply Paralyze on melee hit."] },
    { assetId: 3586495819, trait: "Snake Wings", type: "Weapon", total: 45, effects: ["Increases Speed.", "Increases Poison."] },
    { assetId: 3586495808, trait: "Ske'tonian Sword", type: "Weapon", total: 5, effects: ["Apply Bleed on melee hit.", "Increases Resist."] },
    { assetId: 3586495146, trait: "Fire Wings", type: "Weapon", total: 45, effects: ["Increases Speed.", "Apply Burn on ranged hit."] },
    { assetId: 3586495133, trait: "Elder Wings", type: "Weapon", total: 45, effects: ["Increases Intelligence.", "Resistance to Freeze."] },
    { assetId: 3586495110, trait: "Chameleon Wings", type: "Weapon", total: 30, effects: ["Increases Speed.", "Resistance to Poison."] },
    { assetId: 3586495084, trait: "Arctic Dual Katana", type: "Weapon", total: 30, effects: ["Apply Freeze on melee hit.", "Increases Speed."] },
    { assetId: 3668457164, trait: "Rusty Sword", type: "Weapon", total: 35, effects: ["Increases Speed.", "Decreases Strength."] },
    { assetId: 3668457154, trait: "Lightning Staff", type: "Weapon", total: 35, effects: ["Apply Paralyze on magic hit."] },
    { assetId: 3668457152, trait: "Hedge-Knight Sword", type: "Weapon", total: 35, effects: ["Gain Hasten on melee hit."] },
  ],
  Magic: [
    { assetId: 1631208827, trait: "Dark Magic", type: "Magic", total: 10, effects: ["Increases Doom."] },
    { assetId: 1631209424, trait: "Fire Magic", type: "Magic", total: 30, effects: ["Apply Burn on magic hit."] },
    { assetId: 1631213913, trait: "Lightning Magic", type: "Magic", total: 15, effects: ["Apply Paralyze on magic hit."] },
    { assetId: 1631217677, trait: "Water Magic", type: "Magic", total: 32, effects: ["Increases Drown."] },
    { assetId: 1631233542, trait: "Ice Daggers", type: "Magic", total: 25, effects: ["Apply Freeze on ranged hit."] },
    { assetId: 3586495574, trait: "Poison Cloud", type: "Magic", total: 15, effects: ["Apply Poison at the start of battle."] },
    { assetId: 3668457136, trait: "Blood-Shards", type: "Magic", total: 35, effects: ["Apply Bleed at start of battle."] },
  ],
  Head: [
    { assetId: 1631224831, trait: "Crown of Horns", type: "Head", total: 18, effects: ["Gain Doom at the start of battle.", "Gain Strengthen at the start of battle."] },
    { assetId: 1631236045, trait: "All Knowing", type: "Head", total: 61, effects: ["Increases Intelligence."] },
    { assetId: 1631236727, trait: "Bone", type: "Head", total: 62, effects: ["Gain Cleanse at the start of battle."] },
    { assetId: 1631238772, trait: "Dark Knight Helm", type: "Head", total: 71, effects: ["Increases Doom."] },
    { assetId: 1631240661, trait: "Dragon Knight Helm", type: "Head", total: 30, effects: ["Increases Health.", "Increases Burn."] },
    { assetId: 1631243569, trait: "Dragon", type: "Head", total: 129, effects: ["Gain Burn at start of battle.", "Increases Speed."] },
    { assetId: 1631245454, trait: "Elder", type: "Head", total: 103, effects: ["Increases Intelligence.", "Apply Freeze at the start of battle."] },
    { assetId: 1631263106, trait: "Gladiator Helm", type: "Head", total: 55, effects: ["Increases Health.", "Increases Strength."] },
    { assetId: 1631266132, trait: "Purity", type: "Head", total: 111, effects: ["Gain Bless at start of battle."] },
    { assetId: 1631268297, trait: "Scarred", type: "Head", total: 81, effects: ["Increases Health.", "Increases Resist."] },
    { assetId: 1631271286, trait: "Snake", type: "Head", total: 108, effects: ["Apply Poison at start of battle."] },
    { assetId: 1631273225, trait: "Undead", type: "Head", total: 67, effects: ["Gain Nurture at start of battle.", "Gain Doom at start of battle."] },
    { assetId: 1631275042, trait: "Uni Horn", type: "Head", total: 104, effects: ["Gain Bless at start of battle.", "Increases Doom."] },
    { assetId: 1792637776, trait: "Farmer", type: "Head", total: 40, effects: ["Gain Nurture at start of battle."] },
    { assetId: 1792640216, trait: "Samurai", type: "Head", total: 40, effects: ["Gain Focus on melee hit."] },
    { assetId: 1935442966, trait: "Barbarian", type: "Head", total: 1, effects: ["Increases Strength.", "Decreases Accuracy."] },
    { assetId: 2311097574, trait: "Gold Hermes Helm", type: "Head", total: 10, effects: ["Gain Empower every melee hit."] },
    { assetId: 2311097577, trait: "Silver Hermes Helm", type: "Head", total: 75, effects: ["Gain Shield at start of battle."] },
    { assetId: 2311097585, trait: "Pirate Bandana", type: "Head", total: 65, effects: ["Increases Speed.", "Increases Drown."] },
    { assetId: 3586495600, trait: "Skel'tonian Mask", type: "Head", total: 5, effects: ["Gain Cleanse at start of battle.", "Increases Resist."] },
    { assetId: 3586495515, trait: "Frost", type: "Head", total: 30, effects: ["Apply Freeze at the start of battle.", "Resistance to Burn."] },
    { assetId: 3586495125, trait: "Cyclops", type: "Head", total: 45, effects: ["Increases Strength.", "Decreases accuracy of melee type moves."] },
    { assetId: 3668457190, trait: "Slayer", type: "Head", total: 35, effects: ["Resistance to Doom."] },
    { assetId: 3668457162, trait: "Ram", type: "Head", total: 35, effects: ["Gain Nurture on melee hit."] },
    { assetId: 3668457138, trait: "Cannibal", type: "Head", total: 35, effects: ["Heal for the amount of Bleed stacks applied."] },
  ],
  Armour: [
    { assetId: 1631281879, trait: "Dark Knight Armour", type: "Armour", total: 39, effects: ["Gain Shield at the start of battle.", "Increases Doom."] },
    { assetId: 1631282734, trait: "Dragon Hunter Armour", type: "Armour", total: 63, effects: ["Increases Dexterity.", "Increases Burn."] },
    { assetId: 1631284233, trait: "Dragon Knight Armour", type: "Armour", total: 29, effects: ["Gain Shield at the start of battle.", "Increases Burn."] },
    { assetId: 1631286848, trait: "Gladiator Armour", type: "Armour", total: 47, effects: ["Increases Health.", "Increases Strength."] },
    { assetId: 1631293139, trait: "Hidden One", type: "Armour", total: 118, effects: ["Increases Intelligence."] },
    { assetId: 1631296742, trait: "Magicians Robe", type: "Armour", total: 84, effects: ["Increases accuracy of magic type moves."] },
    { assetId: 1631298825, trait: "Pharaoh", type: "Armour", total: 68, effects: ["Gain Empower at the start of battle."] },
    { assetId: 1631299446, trait: "Rags", type: "Armour", total: 157, effects: ["Increases Dexterity."] },
    { assetId: 1631302191, trait: "Shinobi", type: "Armour", total: 78, effects: ["Increases Speed."] },
    { assetId: 1631305105, trait: "Unchained", type: "Armour", total: 96, effects: ["Increases Doom."] },
    { assetId: 1642179694, trait: "Emperor Armour", type: "Armour", total: 15, effects: ["Increases Health.", "Gain Bless at the start of battle."] },
    { assetId: 1792645489, trait: "Elf Robe", type: "Armour", total: 40, effects: ["Increases Speed.", "Increases accuracy of ranged type moves."] },
    { assetId: 1792660153, trait: "Leather Garb", type: "Armour", total: 40, effects: ["Increases Health."] },
    { assetId: 1806077922, trait: "Executioner Robe", type: "Armour", total: 40, effects: ["Increases Bleed."] },
    { assetId: 2311097589, trait: "Pirate Coat", type: "Armour", total: 65, effects: ["Increases Speed.", "Increases Bleed."] },
    { assetId: 3586495594, trait: "Rogue", type: "Armour", total: 45, effects: ["Increases Speed.", "Increases Dexterity."] },
    { assetId: 3586495090, trait: "Arctic Shinobi", type: "Armour", total: 30, effects: ["Increases Speed.", "Resistance to Freeze."] },
    { assetId: 3668457150, trait: "Earth-Faction", type: "Armour", total: 35, effects: ["Resistance to Poison.", "Increases Nurture."] },
    { assetId: 3668457146, trait: "Dragon-Guard", type: "Armour", total: 35, effects: ["Resistance to Burn.", "Increases Shield."] },
  ],
  Extra: [
    { assetId: 1631307699, trait: "Crescent Moon Earring", type: "Extra", total: 50, effects: ["Increases Resist."] },
    { assetId: 1631308577, trait: "Dragon Fangs Earring", type: "Extra", total: 47, effects: ["Increases Burn."] },
    { assetId: 1631309418, trait: "Fusion Pearl Earring", type: "Extra", total: 49, effects: ["Increases Bless."] },
    { assetId: 2156520477, trait: "Tentacle Earring", type: "Extra", total: 45, effects: ["Increases Drown."] },
    { assetId: 2311097583, trait: "Hoop Earring", type: "Extra", total: 65, effects: ["Increases Health."] },
    { assetId: 3586495521, trait: "Golden Feathers", type: "Extra", total: 45, effects: ["Increases Speed.", "Increases Bless."] },
    { assetId: 3586495102, trait: "Battle Wound", type: "Extra", total: 45, effects: ["Increases Strength.", "Gain Bleed at the start of battle."] },
    { assetId: 3668457140, trait: "Crescent-Birthmark", type: "Extra", total: 35, effects: ["Resistance to Doom."] },
  ],
  Skin: [
    { trait: "Dark Skin", type: "Skin", champions: 195, effects: ["Increases Health.", "Increases Strength."] },
    { trait: "Tribal Dark Skin", type: "Skin", champions: 139, effects: ["Increases Health.", "Increases Poison."] },
    { trait: "Tribal Light Skin", type: "Skin", champions: 162, effects: ["Increases Dexterity.", "Increases Poison."] },
    { trait: "Fire Dragon", type: "Skin", champions: 43, effects: ["Apply Burn at the start of battle."] },
    { trait: "Undead", type: "Skin", champions: 86, effects: ["Gain Doom at the start of battle.", "Increases Strength."] },
    { trait: "Chameleon", type: "Skin", champions: 30, effects: ["Resistance to Poison."] },
    { trait: "Light Skin", type: "Skin", champions: 221, effects: ["Increases Intelligence."] },
    { trait: "Elder Dragon", type: "Skin", champions: 56, effects: ["Resistance to Burn."] },
    { trait: "Snake", type: "Skin", champions: 68, effects: ["Gain Cleanse at the start of battle."] },
  ],
}

const TRAIT_LOOKUP_BY_NAME = Object.values(CHAMPION_TRAITS)
  .flat()
  .reduce((acc, traitDef) => {
    if (traitDef?.trait) {
      acc[traitDef.trait] = traitDef;
      acc[String(traitDef.trait).toLowerCase()] = traitDef;
    }
    return acc;
  }, {});

function getTraitDefinition(traitName, traitType) {
  if (!traitName || traitName === "None") return null;

  const exactByType = CHAMPION_TRAITS?.[traitType]?.find(
    (traitDef) => traitDef.trait === traitName
  );
  if (exactByType) return exactByType;

  const lowered = String(traitName).toLowerCase();
  const looseByType = CHAMPION_TRAITS?.[traitType]?.find(
    (traitDef) => String(traitDef.trait).toLowerCase() === lowered
  );
  if (looseByType) return looseByType;

  return TRAIT_LOOKUP_BY_NAME[traitName] || TRAIT_LOOKUP_BY_NAME[lowered] || null;
}

const EFFECT_KEY_ALIASES = {
  Poison: "poison",
  Bleed: "bleed",
  Burn: "burn",
  Freeze: "freeze",
  Slow: "slow",
  Drown: "drown",
  Paralyze: "paralyze",
  Doom: "doom",
  Shield: "shield",
  Strengthen: "strengthen",
  Focus: "focus",
  Empower: "empower",
  Nurture: "nurture",
  Bless: "bless",
  Hasten: "hasten",
  Cleanse: "cleanse",
};

const STAT_KEY_ALIASES = {
  Health: "health",
  Speed: "speed",
  Resist: "resist",
  Strength: "strength",
  Dexterity: "dexterity",
  Intelligence: "intelligence",
  Accuracy: "accuracy",
  "Crit Chance": "critChance",
  "Crit Damage": "critDamage",
};

const effectKeys = [
  "poison",
  "bleed",
  "burn",
  "freeze",
  "slow",
  "drown",
  "paralyze",
  "doom",
  "shield",
  "strengthen",
  "focus",
  "empower",
  "nurture",
  "bless",
  "hasten",
  "cleanse",
];

const statKeys = [
  "health",
  "speed",
  "resist",
  "strength",
  "dexterity",
  "intelligence",
  "accuracy",
  "critChance",
  "critDamage",
];

const DEFAULT_CRIT_CHANCE = 25
const DEFAULT_CRIT_DAMAGE_PERCENT = 200
const CRIT_POPUP_SCALE = 1.5


/* ===================== EQUIPPED ITEM EFFECT HELPERS ===================== */


function encodeUtf8(value) {
  return new TextEncoder().encode(String(value))
}

function bytesToUint8Array(value) {
  if (value instanceof Uint8Array) return value
  if (Array.isArray(value)) return Uint8Array.from(value)

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
    return new Uint8Array(value)
  }

  if (typeof value === 'string') {
    return new Uint8Array(Buffer.from(value, 'base64'))
  }

  return new Uint8Array()
}

function getDaoVoteForEffect(boxBytes, effectIndex, daoSuffix = ITEM_POTENCY_DAO_SUFFIX) {
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

async function readTraitEffectVotePotencies(algodClient, traitName, effectCount) {
  if (!traitName || !effectCount) return []

  try {
    const { result: res } = await runAlgodRequestWithFallback(
      (providerClient) =>
        providerClient
          .getApplicationBoxByName(ITEM_VOTE_APP_ID, encodeUtf8(traitName))
          .do(),
      `Read item voting box ${traitName}`
    )

    const boxBytes = bytesToUint8Array(res?.value)
    return computeEffectPotenciesFromDaoVote(boxBytes, effectCount)
  } catch (error) {
    console.error('Failed to read item voting box for trait:', traitName, error)
    return Array(effectCount).fill(null)
  }
}



function cloneEmptyGainedEffects() {
  return {
    stats: {
      health: 0,
      speed: 0,
      resist: 0,
      strength: 0,
      dexterity: 0,
      intelligence: 0,
      accuracy: 0,
      critChance: 0,
      critDamage: 0,
    },
    effects: {
      poison: 0,
      bleed: 0,
      burn: 0,
      freeze: 0,
      slow: 0,
      drown: 0,
      paralyze: 0,
      doom: 0,
      shield: 0,
      strengthen: 0,
      focus: 0,
      empower: 0,
      nurture: 0,
      bless: 0,
      hasten: 0,
      cleanse: 0,
    },
    moveAccuracy: {
      melee: 0,
      ranged: 0,
      magic: 0,
      curse: 0,
      all: 0,
    },
    moveAccuracyBreakdowns: [],
    battleOnly: [],
  }
}

function getMoveAccuracyBonusFromGainedEffects(move, gainedEffects) {
  const moveTypeText = String(move?.type || move?.category || '').toLowerCase()
  const moveTypeRoot = moveTypeText.split(' ')[0]
  const isCurse = moveTypeText.includes('curse')
  const moveAccuracy = gainedEffects?.moveAccuracy || {}

  return (
    safeNumber(moveAccuracy[moveTypeRoot], 0) +
    safeNumber(moveAccuracy.all, 0) +
    (isCurse ? safeNumber(moveAccuracy.curse, 0) : 0)
  )
}

function getMoveEffectBasePotency(move) {
  const effectName = String(move?.effect_name || move?.effect || '').trim()
  if (!effectName) return 0

  const key = effectName.toLowerCase()
  let potency = safeNumber(move?.effect_potency_base ?? move?.effect_potency, 0)

  if (move?.sourceCharObj && key) {
    potency = safeNumber(move.sourceCharObj[key], potency)
  }

  return potency
}

function getChampionEffectBonusForKey(championSource, effectKey) {
  const key = String(effectKey || '').toLowerCase()
  if (!key) return 0

  const titleKey = formatArenaEffectName(key)
  const sources = [
    championSource?.effectPotencies,
    championSource?.charObj,
    championSource?.arena?.charObj,
    championSource,
  ].filter(Boolean)

  for (const source of sources) {
    for (const candidate of [key, titleKey]) {
      if (source[candidate] !== undefined) {
        return safeNumber(source[candidate], 0)
      }
    }
  }

  return 0
}

function getMapPassiveAppliedAmount(baseAmount, effectKey, championSource) {
  return safeNumber(baseAmount, 0) + getChampionEffectBonusForKey(championSource, effectKey)
}

function normalizeTraitEffectText(effectText) {
  return String(effectText || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/g, '')
    .trim()
}

function lookupTraitAlias(aliasMap, name) {
  const cleaned = normalizeTraitEffectText(name)
  if (!cleaned) return null

  if (aliasMap[cleaned]) return aliasMap[cleaned]

  const lowered = cleaned.toLowerCase()
  const found = Object.entries(aliasMap).find(
    ([label]) => label.toLowerCase() === lowered
  )

  return found?.[1] || null
}

function getEffectKeyFromName(name) {
  const cleaned = normalizeTraitEffectText(name)
  if (!cleaned) return null

  return lookupTraitAlias(EFFECT_KEY_ALIASES, cleaned) || cleaned.toLowerCase()
}

function getMoveAccuracyTypeFromTraitName(name) {
  const cleaned = normalizeTraitEffectText(name)
  const match = cleaned.match(/^accuracy(?: of (melee|ranged|magic|curse)(?: type)? moves?)?$/i)
  if (!match) return null
  return match[1] ? match[1].toLowerCase() : 'all'
}

function getEffectKeyFromTraitText(effectText) {
  const text = normalizeTraitEffectText(effectText)
  if (!text) return null

  let match =
    text.match(/^Resistance to (.+)$/i) ||
    text.match(/^Gain (.+) at (?:the )?start of (?:the )?battle$/i) ||
    text.match(/^Apply (.+) at (?:the )?start of (?:the )?battle$/i) ||
    text.match(/^Gain (.+?) (?:on|every) (melee|ranged|magic) hit$/i) ||
    text.match(/^Apply (.+?) (?:on|every) (melee|ranged|magic) hit$/i) ||
    text.match(/^Increases (.+)$/i) ||
    text.match(/^Decreases (.+)$/i)

  if (!match) return null
  return getEffectKeyFromName(match[1])
}

function formatEquippedItemEffectLines(equippedTraits, charObj = null) {
  const lines = []

  for (const trait of Array.isArray(equippedTraits) ? equippedTraits : []) {
    const effects = Array.isArray(trait.effects) ? trait.effects : []

    if (!effects.length) {
      lines.push(`${trait.type}: ${trait.name}`)
      continue
    }

    const effectText = effects
      .map((singleEffectText, index) => {
        const baseAmount = safeNumber((trait.effectVotePotencies || trait.effectVoteAverages || trait.effectMedians)?.[index], 0)
        const parsedEffectKey = getEffectKeyFromTraitText(singleEffectText)
        const shouldUseAdjustedAmount =
          charObj &&
          parsedEffectKey &&
          !/^Increases /i.test(String(singleEffectText || '')) &&
          !/^Decreases /i.test(String(singleEffectText || ''))

        const adjustedAmount = shouldUseAdjustedAmount
          ? baseAmount + safeNumber(charObj?.[parsedEffectKey], 0)
          : baseAmount

        if (!baseAmount && !adjustedAmount) return singleEffectText

        if (adjustedAmount !== baseAmount) {
          return `${singleEffectText} +${adjustedAmount} (${baseAmount} base + ${safeNumber(charObj?.[parsedEffectKey], 0)} ${parsedEffectKey})`
        }

        return `${singleEffectText} +${baseAmount}`
      })
      .join('; ')

    lines.push(`${trait.type}: ${trait.name} - ${effectText}`)
  }

  return lines
}

function shouldTriggerItemOnHit(entry, category) {
  if (!entry?.attackType) return true
  const root = String(category || '').toLowerCase().split(' ')[0]
  return root === entry.attackType
}

function getAdjustedTriggeredItemAmount(charObj, entry) {
  const base = safeNumber(entry?.amount, 0)
  const effectKey = entry?.effectKey || entry?.resistedEffect
  if (!effectKey) return base
  return base + safeNumber(charObj?.[effectKey], 0)
}

function buildBattleEffectRuntime(equippedTraits, gainedEffects) {
  const battleEffects = []
  const resistances = {}

  for (const entry of gainedEffects?.battleOnly || []) {
    const effectKey = entry.effectKey || entry.resistedEffect || null
    const runtimeEntry = {
      ...entry,
      effectKey,
      resistedEffect: entry.resistedEffect || effectKey,
    }

    battleEffects.push(runtimeEntry)

    if (runtimeEntry.type === 'resistance' && runtimeEntry.resistedEffect) {
      resistances[runtimeEntry.resistedEffect] =
        (resistances[runtimeEntry.resistedEffect] || 0) +
        safeNumber(runtimeEntry.amount, 0)
    }
  }

  return { battleEffects, resistances }
}


function safeNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function getCritChanceValue(...sources) {
  for (const source of sources) {
    if (!source || source.critChance == null) continue
    const value = Number(source.critChance)
    if (Number.isFinite(value)) return value
  }
  return DEFAULT_CRIT_CHANCE
}

function getCritDamagePercentValue(...sources) {
  for (const source of sources) {
    if (!source || source.critDamage == null) continue
    const value = Number(source.critDamage)
    if (!Number.isFinite(value) || value <= 0) continue
    return value < DEFAULT_CRIT_DAMAGE_PERCENT
      ? DEFAULT_CRIT_DAMAGE_PERCENT + value
      : value
  }
  return DEFAULT_CRIT_DAMAGE_PERCENT
}

function getMoveRange(moveType) {
  const type = String(moveType || '').toLowerCase()
  if (type.startsWith('melee')) return 'melee'
  if (type.startsWith('ranged')) return 'ranged'
  if (type.startsWith('magic')) return 'magic'
  return null
}

function getMoveClass(moveType) {
  const type = String(moveType || '').toLowerCase()
  if (type.includes('damage')) return 'damage'
  if (type.includes('curse')) return 'curse'
  if (type.includes('buff')) return 'buff'
  return null
}

function getExplicitMoveKind(meta = {}, fallbackKind = null) {
  const explicitTypeKind = getMoveClass(meta?.type) || getMoveClass(meta?.category)
  if (explicitTypeKind) return explicitTypeKind

  const fallback = String(fallbackKind || '').toLowerCase()
  if (fallback === 'damage' || fallback === 'curse' || fallback === 'buff') return fallback

  if (isCurseMove(meta)) return 'curse'
  if (isBuffMove(meta)) return 'buff'
  return 'damage'
}

function getMoveTargetSide({ meta = {}, moveKind = null, isActorA }) {
  const explicitKind = getExplicitMoveKind(meta, moveKind)
  const actorSide = isActorA ? 'A' : 'B'
  const enemySide = isActorA ? 'B' : 'A'

  // Battle rule: buff moves are used on self; damage and curse moves are used on the enemy.
  return explicitKind === 'buff' ? actorSide : enemySide
}

function getMoveScalingStatKey(moveType) {
  const range = getMoveRange(moveType)
  if (range === 'melee') return 'strength'
  if (range === 'ranged') return 'dexterity'
  if (range === 'magic') return 'intelligence'
  return null
}

function getMoveStatScalingMultiplier(moveType) {
  const moveClass = getMoveClass(moveType)
  if (moveClass === 'damage') return 1
  if (moveClass === 'curse' || moveClass === 'buff') return 0.5
  return 0
}

function getMoveStatScaledBonus(moveType, statValue) {
  const moveClass = getMoveClass(moveType)
  const n = safeNumber(statValue, 0)

  if (moveClass === 'damage') {
    return n
  }

  if (moveClass === 'curse' || moveClass === 'buff') {
    return Math.floor(n / 2)
  }

  return 0
}

function getDerivedCoreStatBonuses(primaryStats) {
  return {
    health: safeNumber(primaryStats?.strength, 0) * 2,
    speed: safeNumber(primaryStats?.dexterity, 0),
    resist: safeNumber(primaryStats?.intelligence, 0),
  }
}

function getBaseCoreStatValue(charObj, statKey) {
  const rawBase = charObj?.baseStats?.[statKey]
  if (rawBase !== null && typeof rawBase !== 'undefined') {
    return safeNumber(rawBase, 0)
  }

  // New generated champions store flat base core stats before derived scaling.
  // Older champions may not have baseStats, so these defaults keep the new
  // champion format correct while still falling back to the stored field.
  if (statKey === 'health') return safeNumber(charObj?.baseHealth ?? 200, safeNumber(charObj?.health, 200))
  if (statKey === 'speed') return safeNumber(charObj?.baseSpeed ?? 50, safeNumber(charObj?.speed, 50))
  if (statKey === 'resist') return safeNumber(charObj?.baseResist ?? 10, safeNumber(charObj?.resist, 10))

  return safeNumber(charObj?.[statKey], 0)
}

function buildRuntimeStatsFromCharObj(charObj) {
  const strength = safeNumber(charObj?.strength, 0)
  const dexterity = safeNumber(charObj?.dexterity, 0)
  const intelligence = safeNumber(charObj?.intelligence, 0)
  const derived = getDerivedCoreStatBonuses({ strength, dexterity, intelligence })

  return {
    strength,
    dexterity,
    intelligence,
    health: getBaseCoreStatValue(charObj, 'health') + derived.health,
    speed: getBaseCoreStatValue(charObj, 'speed') + derived.speed,
    resist: getBaseCoreStatValue(charObj, 'resist') + derived.resist,
    accuracy: safeNumber(charObj?.accuracy, 0),
    critChance: getCritChanceValue(charObj),
    critDamage: getCritDamagePercentValue(charObj),
  }
}

const CHAMPION_SKILL_TREE_APP_ID = 1870514811
const CHAMPION_SKILL_MAX_LEVEL = 3

const CHAMPION_SKILL_DIRECT_EFFECT_BONUSES = Object.freeze({
  0: { poison: 1 },
  100: { bleed: 1 },
  200: { burn: 1 },
  300: { freeze: 1 },
  400: { slow: 1 },
  500: { drown: 1 },
  501: { drown: 2 },
  600: { paralyze: 1 },
  601: { paralyze: 2 },
  700: { doom: 1 },
  800: { shield: 1 },
  801: { shield: 2 },
  900: { strengthen: 1 },
  1000: { focus: 1 },
  1001: { focus: 2 },
  1100: { empower: 1 },
  1200: { nurture: 1 },
  1300: { bless: 1 },
  1400: { hasten: 1 },
  1500: { cleanse: 1 },
})

const CHAMPION_SKILL_DIRECT_STAT_BONUSES = Object.freeze({
  1600: { health: 5 },
  1601: { health: 4 },
  1602: { health: 3 },
  1700: { speed: 2 },
  1701: { speed: 1 },
  1702: { speed: 1 },
  1800: { resist: 2 },
  1801: { resist: 1 },
  1802: { resist: 1 },
  1900: { strength: 2 },
  1901: { strength: 1 },
  1902: { strength: 1 },
  2000: { dexterity: 2 },
  2001: { dexterity: 1 },
  2002: { dexterity: 1 },
  2100: { intelligence: 2 },
  2101: { intelligence: 1 },
  2102: { resist: 1 },
  2200: { critChance: 0.5 },
  2201: { critChance: 0.5 },
  2202: { accuracy: 1 },
  2300: { critDamage: 10 },
  2301: { critDamage: 5 },
  2302: { critDamage: 5 },
})

const CHAMPION_SKILL_BYTES = Object.freeze(
  [...new Set([
    ...Object.keys(CHAMPION_SKILL_DIRECT_EFFECT_BONUSES),
    ...Object.keys(CHAMPION_SKILL_DIRECT_STAT_BONUSES),
    1, 2, 101, 102, 201, 202, 301, 302, 401, 402, 502, 602, 701, 702,
    802, 901, 902, 1002, 1101, 1102, 1201, 1202, 1301, 1302, 1401,
    1402, 1501, 1502,
  ].map(Number))].sort((a, b) => a - b)
)

function getChampionSkillPointLevel(points, byteIndex) {
  const raw = points?.[byteIndex]
  const level = Math.floor(safeNumber(raw, 0))
  return clamp(level, 0, CHAMPION_SKILL_MAX_LEVEL)
}

function addChampionSkillBonusTotals(target, bonuses, level) {
  for (const [key, value] of Object.entries(bonuses || {})) {
    target[key] = safeNumber(target[key], 0) + safeNumber(value, 0) * level
  }
}

function buildChampionSkillRuntimeFromPoints(points = []) {
  const levels = {}
  const effectBonuses = {}
  const statBonuses = {}

  for (const byteIndex of CHAMPION_SKILL_BYTES) {
    const level = getChampionSkillPointLevel(points, byteIndex)
    if (!level) continue
    levels[byteIndex] = level
    addChampionSkillBonusTotals(effectBonuses, CHAMPION_SKILL_DIRECT_EFFECT_BONUSES[byteIndex], level)
    addChampionSkillBonusTotals(statBonuses, CHAMPION_SKILL_DIRECT_STAT_BONUSES[byteIndex], level)
  }

  return {
    levels,
    effectBonuses,
    statBonuses,
    triggered: {
      firstDamagingMoveFocus: false,
      halfHealthShield: false,
    },
  }
}

async function loadChampionSkillRuntimeForAsset(assetId) {
  try {
    const boxName = new Uint8Array([
      ...longToByteArray(Number(assetId)),
      ...new Uint8Array(Buffer.from('points')),
    ])
    const { result: pointsBox } = await runAlgodRequestWithFallback(
      (providerClient) =>
        providerClient
          .getApplicationBoxByName(CHAMPION_SKILL_TREE_APP_ID, boxName)
          .do(),
      `Read skill tree points ${assetId}`
    )
    return buildChampionSkillRuntimeFromPoints(bytesToUint8Array(pointsBox?.value))
  } catch {
    return buildChampionSkillRuntimeFromPoints([])
  }
}

function applyChampionSkillRuntimeToCharObj(charObj, skillRuntime) {
  if (!charObj) return charObj
  ensureRuntimeEffectFields(charObj)

  for (const key of effectKeys) {
    const add = safeNumber(skillRuntime?.effectBonuses?.[key], 0)
    if (add) charObj[key] = safeNumber(charObj[key], 0) + add
  }

  for (const key of statKeys) {
    const add = safeNumber(skillRuntime?.statBonuses?.[key], 0)
    if (add) charObj[key] = safeNumber(charObj[key], 0) + add
  }

  charObj.skillTreeRuntime = skillRuntime || buildChampionSkillRuntimeFromPoints([])
  return charObj
}

function getChampionSkillRuntime(champion) {
  return (
    champion?.skillTreeRuntime ||
    champion?.charObj?.skillTreeRuntime ||
    champion?.arena?.skillTreeRuntime ||
    champion?.arena?.charObj?.skillTreeRuntime ||
    null
  )
}

function getChampionSkillLevel(champion, byteIndex) {
  return safeNumber(getChampionSkillRuntime(champion)?.levels?.[byteIndex], 0)
}

function getChampionSide(champion) {
  return champion?.side || champion?.targetSide || null
}

function getChampionEffectsBucket(champion) {
  return champion?.effects || champion?.effectTotals || null
}

function isSameChampionSide(a, b) {
  const sideA = getChampionSide(a)
  const sideB = getChampionSide(b)
  return sideA && sideB && sideA === sideB
}

function applyChampionSkillHpDelta(champion, amount) {
  const delta = safeNumber(amount, 0)
  if (!champion || !delta || !Number.isFinite(Number(champion.hp))) return null
  const prev = Number(champion.hp)
  const maxHp = Math.max(1, safeNumber(champion.maxHp, prev))
  const next = clamp(Math.round(prev + delta), 0, maxHp)
  champion.hp = next
  return { previousHp: prev, nextHp: next, delta: next - prev }
}

function getRuntimeStackHealAmount({ actor, target, effectName, appliedAmount }) {
  if (!actor || !target || isSameChampionSide(actor, target)) return 0
  const appliedStacks = safeNumber(appliedAmount, 0)
  if (appliedStacks <= 0) return 0
  const normalizedEffect = String(effectName || '').toLowerCase()
  if (!normalizedEffect) return 0

  return (actor.charObj?.gainedEffectsMeta?.battleOnly || []).reduce((total, entry) => {
    if (entry?.type !== 'heal_for_applied_stacks') return total
    const sourceEffectKey = String(entry.sourceEffectKey || entry.effectKey || '').toLowerCase()
    if (sourceEffectKey !== normalizedEffect) return total
    return total + appliedStacks * safeNumber(entry.amount, 0)
  }, 0)
}

function applyChampionSkillStatDelta(champion, statKey, amount) {
  const delta = safeNumber(amount, 0)
  if (!champion?.stats || !statKey || !delta) return
  champion.stats[statKey] = safeNumber(champion.stats[statKey], 0) + delta
  if (champion.charObj) {
    champion.charObj[statKey] = safeNumber(champion.charObj[statKey], 0) + delta
  }
}

function applyChampionSkillStatus({ actor, target, effectKey, amount, isBuffApplication = false, events = [] }) {
  const normalizedEffectKey = String(effectKey || '').toLowerCase()
  let appliedAmount = safeNumber(amount, 0)
  const bucket = getChampionEffectsBucket(target)
  if (!normalizedEffectKey || !appliedAmount || !bucket || !target) return null

  if (normalizedEffectKey === 'cleanse') {
    const res = consumeCleanseFromNegatives(bucket, appliedAmount)
    if (res.remainingCleanse > 0) bucket.cleanse = getStack(bucket, 'cleanse') + res.remainingCleanse
    const event = { effectName: normalizedEffectKey, amount: appliedAmount, target, targetSide: getChampionSide(target), resisted: false, skillTreeEffect: true, cleansedTotal: res.removedTotal, cleansedByEffect: res.removedByEffect, cleanseGuardAdded: res.remainingCleanse }
    events.push(event)
    return event
  }

  const isNegativeApplication = NEGATIVE_EFFECT_KEYS.has(normalizedEffectKey) && !isBuffApplication && actor && target && !isSameChampionSide(actor, target)
  if (isNegativeApplication) {
    const cleanseGuardResult = consumeCleanseGuardForNegativeApplication(bucket, appliedAmount)
    if (cleanseGuardResult.blockedAmount > 0) {
      appliedAmount = cleanseGuardResult.appliedAmount
      if (!appliedAmount) {
        const event = { effectName: normalizedEffectKey, amount: 0, target, targetSide: getChampionSide(target), resisted: true, blockedBy: 'cleanse', cleanseBlockedAmount: cleanseGuardResult.blockedAmount, skillTreeEffect: true }
        events.push(event)
        return event
      }
    }
  }

  bucket[normalizedEffectKey] = getStack(bucket, normalizedEffectKey) + appliedAmount
  const event = { effectName: normalizedEffectKey, amount: appliedAmount, target, targetSide: getChampionSide(target), resisted: false, skillTreeEffect: true }
  events.push(event)
  return event
}

function removeChampionSkillEffectStacks(champion, effectKey, amount) {
  const bucket = getChampionEffectsBucket(champion)
  const removeAmount = safeNumber(amount, 0)
  if (!bucket || !effectKey || !removeAmount) return 0
  const current = getStack(bucket, effectKey)
  const removed = Math.min(current, removeAmount)
  const next = current - removed
  if (next > 0) bucket[effectKey] = next
  else delete bucket[effectKey]
  return removed
}

function applyChampionSkillAfterStatusEvent({ event, actor, target, category = null, moveKind = null }) {
  const skillEvents = []
  const effectName = String(event?.effectName || '').toLowerCase()
  const resolvedTarget = target || event?.target
  if (!effectName || !resolvedTarget) return skillEvents

  if (event?.resisted) {
    if (event.blockedBy === 'cleanse') return skillEvents
    const shieldOnResist = getChampionSkillLevel(resolvedTarget, 1801)
    if (shieldOnResist) applyChampionSkillStatus({ actor: resolvedTarget, target: resolvedTarget, effectKey: 'shield', amount: shieldOnResist, isBuffApplication: true, events: skillEvents })
    const hastenOnEvade = getChampionSkillLevel(resolvedTarget, 2002)
    if (hastenOnEvade) applyChampionSkillStatus({ actor: resolvedTarget, target: resolvedTarget, effectKey: 'hasten', amount: hastenOnEvade, isBuffApplication: true, events: skillEvents })
    return skillEvents
  }

  const amount = Math.max(0, safeNumber(event?.amount, 0))
  if (!amount) return skillEvents
  const selfApplication = actor && isSameChampionSide(actor, resolvedTarget)
  const applier = actor || resolvedTarget
  const runtimeHeal = getRuntimeStackHealAmount({
    actor: applier,
    target: resolvedTarget,
    effectName,
    appliedAmount: amount,
  })
  if (runtimeHeal) applyChampionSkillHpDelta(applier, runtimeHeal)

  if (effectName === 'bleed') {
    const vampire = getChampionSkillLevel(applier, 101)
    if (vampire) applyChampionSkillHpDelta(applier, vampire)
    const drownInBlood = getChampionSkillLevel(applier, 102)
    if (drownInBlood) applyChampionSkillStatus({ actor: applier, target: resolvedTarget, effectKey: 'drown', amount: drownInBlood, events: skillEvents })
  }
  if (effectName === 'burn') {
    const fieryHell = getChampionSkillLevel(applier, 201)
    if (fieryHell) applyChampionSkillStatus({ actor: applier, target: resolvedTarget, effectKey: 'doom', amount: fieryHell, events: skillEvents })
  }
  if (effectName === 'freeze' && selfApplication) {
    const heartOfIce = getChampionSkillLevel(resolvedTarget, 302)
    if (heartOfIce) applyChampionSkillHpDelta(resolvedTarget, heartOfIce)
  }
  if (effectName === 'slow' && selfApplication) {
    const slowMotion = getChampionSkillLevel(resolvedTarget, 402)
    if (slowMotion) applyChampionSkillStatus({ actor: resolvedTarget, target: resolvedTarget, effectKey: 'focus', amount: slowMotion, isBuffApplication: true, events: skillEvents })
  }
  if (effectName === 'doom' && selfApplication) {
    const unnaturalHunger = getChampionSkillLevel(resolvedTarget, 702)
    if (unnaturalHunger) applyChampionSkillHpDelta(resolvedTarget, unnaturalHunger)
  }
  if (effectName === 'shield') {
    const paladin = getChampionSkillLevel(applier, 802)
    if (paladin) applyChampionSkillStatus({ actor: applier, target: resolvedTarget, effectKey: 'bless', amount: paladin, isBuffApplication: true, events: skillEvents })
    const bulwark = selfApplication ? getChampionSkillLevel(resolvedTarget, 1802) : 0
    if (bulwark) applyChampionSkillStatus({ actor: resolvedTarget, target: resolvedTarget, effectKey: 'bless', amount: bulwark, isBuffApplication: true, events: skillEvents })
  }
  if (effectName === 'strengthen') {
    const cardio = selfApplication ? getChampionSkillLevel(resolvedTarget, 902) : 0
    if (cardio) applyChampionSkillStatDelta(resolvedTarget, 'speed', amount * cardio * 0.2)
    const battleTempo = getChampionSkillLevel(applier, 1902)
    if (battleTempo) applyChampionSkillStatus({ actor: applier, target: resolvedTarget, effectKey: 'hasten', amount: battleTempo, isBuffApplication: true, events: skillEvents })
  }
  if (effectName === 'empower' && selfApplication) {
    const confidence = getChampionSkillLevel(resolvedTarget, 1101)
    if (confidence) applyChampionSkillStatDelta(resolvedTarget, 'dexterity', amount * confidence * 0.2)
  }
  if (effectName === 'bless' && selfApplication) {
    const faith = getChampionSkillLevel(resolvedTarget, 1301)
    if (faith) applyChampionSkillStatus({ actor: resolvedTarget, target: resolvedTarget, effectKey: 'focus', amount: faith, isBuffApplication: true, events: skillEvents })
  }
  if (effectName === 'hasten' && selfApplication) {
    const speed = getChampionSkillLevel(resolvedTarget, 1401)
    if (speed) applyChampionSkillStatDelta(resolvedTarget, 'speed', amount * speed * 0.1)
    const drugLord = getChampionSkillLevel(resolvedTarget, 1402)
    if (drugLord) {
      applyChampionSkillStatus({ actor: resolvedTarget, target: resolvedTarget, effectKey: 'strengthen', amount: drugLord, isBuffApplication: true, events: skillEvents })
      applyChampionSkillStatus({ actor: resolvedTarget, target: resolvedTarget, effectKey: 'focus', amount: drugLord, isBuffApplication: true, events: skillEvents })
      applyChampionSkillStatus({ actor: resolvedTarget, target: resolvedTarget, effectKey: 'doom', amount: drugLord, isBuffApplication: true, events: skillEvents })
    }
  }
  if (effectName === 'cleanse') {
    const judgement = getChampionSkillLevel(applier, 1502)
    if (judgement) applyChampionSkillStatus({ actor: applier, target: resolvedTarget, effectKey: 'empower', amount: judgement, isBuffApplication: true, events: skillEvents })
    const fastRecovery = selfApplication ? getChampionSkillLevel(resolvedTarget, 1702) : 0
    if (fastRecovery) applyChampionSkillStatus({ actor: resolvedTarget, target: resolvedTarget, effectKey: 'hasten', amount: fastRecovery, isBuffApplication: true, events: skillEvents })
  }
  if (actor && !selfApplication && NEGATIVE_EFFECT_KEYS.has(effectName) && !event?.resisted) {
    const mindWard = getChampionSkillLevel(resolvedTarget, 2102)
    if (mindWard) applyChampionSkillStatus({ actor: resolvedTarget, target: resolvedTarget, effectKey: 'bless', amount: mindWard, isBuffApplication: true, events: skillEvents })
  }
  return skillEvents
}

function applyChampionSkillBeforeTurn({ actor }) {
  const events = []
  const heartOfIce = getChampionSkillLevel(actor, 302)
  if (heartOfIce) {
    applyChampionSkillStatus({ actor, target: actor, effectKey: 'freeze', amount: heartOfIce, isBuffApplication: true, events })
    applyChampionSkillHpDelta(actor, heartOfIce)
  }
  const slowMotion = getChampionSkillLevel(actor, 402)
  if (slowMotion) {
    applyChampionSkillStatus({ actor, target: actor, effectKey: 'slow', amount: slowMotion, isBuffApplication: true, events })
    applyChampionSkillStatus({ actor, target: actor, effectKey: 'focus', amount: slowMotion, isBuffApplication: true, events })
  }
  return events
}

function applyChampionSkillBeforeDamagingMove({ actor }) {
  const events = []
  const perfectOpening = getChampionSkillLevel(actor, 2202)
  const runtime = getChampionSkillRuntime(actor)
  if (perfectOpening && runtime && !runtime.triggered.firstDamagingMoveFocus) {
    runtime.triggered.firstDamagingMoveFocus = true
    applyChampionSkillStatus({ actor, target: actor, effectKey: 'focus', amount: perfectOpening, isBuffApplication: true, events })
  }
  return events
}

function applyChampionSkillAfterBuffMove({ actor, target, category = null }) {
  const events = []
  const buffTarget = target || actor
  const antidote = getChampionSkillLevel(buffTarget, 2)
  if (antidote) removeChampionSkillEffectStacks(buffTarget, 'poison', antidote)
  const greenAura = getChampionSkillLevel(actor, 1202)
  if (greenAura) applyChampionSkillStatus({ actor, target: buffTarget, effectKey: 'nurture', amount: greenAura, isBuffApplication: true, events })
  if (isMelee(category)) {
    const honestTouch = getChampionSkillLevel(actor, 1102)
    if (honestTouch) applyChampionSkillStatus({ actor, target: buffTarget, effectKey: 'empower', amount: honestTouch * 2, isBuffApplication: true, events })
    const washedHands = getChampionSkillLevel(actor, 1501)
    if (washedHands) applyChampionSkillStatus({ actor, target: buffTarget, effectKey: 'cleanse', amount: washedHands, isBuffApplication: true, events })
  }
  if (isMagic(category)) {
    const miracle = getChampionSkillLevel(actor, 1302)
    if (miracle && Math.random() < Math.min(1, miracle * 0.25)) applyChampionSkillStatus({ actor, target: actor, effectKey: 'bless', amount: 4, isBuffApplication: true, events })
  }
  return events
}

function applyChampionSkillAfterMoveHit({ actor, target, category = null, moveKind = null, moveEffectKey = null, isCritical = false, targetHadBleed = false, targetHadBurn = false, targetHadSlow = false }) {
  const events = []
  if (moveKind === 'curse') {
    const toxicCask = getChampionSkillLevel(actor, 1)
    if (toxicCask) applyChampionSkillStatus({ actor, target, effectKey: 'poison', amount: toxicCask, events })
  }
  if (targetHadBurn) {
    const gasoline = getChampionSkillLevel(actor, 202)
    if (gasoline) applyChampionSkillStatus({ actor, target, effectKey: 'burn', amount: gasoline, events })
  }
  if (targetHadSlow) {
    const quicksand = getChampionSkillLevel(actor, 401)
    if (quicksand) applyChampionSkillStatus({ actor, target, effectKey: 'slow', amount: quicksand, events })
  }
  if (isMelee(category)) {
    const coldHands = getChampionSkillLevel(actor, 301)
    if (coldHands) applyChampionSkillStatus({ actor, target, effectKey: 'freeze', amount: coldHands, events })
    const sadisticPleasure = getChampionSkillLevel(actor, 701)
    if (sadisticPleasure) {
      applyChampionSkillStatus({ actor, target, effectKey: 'doom', amount: sadisticPleasure * 2, events })
      applyChampionSkillStatus({ actor, target: actor, effectKey: 'doom', amount: sadisticPleasure, isBuffApplication: true, events })
    }
    const armDay = getChampionSkillLevel(actor, 901)
    if (armDay) applyChampionSkillStatus({ actor, target: actor, effectKey: 'strengthen', amount: armDay, isBuffApplication: true, events })
    const heavyBlows = getChampionSkillLevel(actor, 1901)
    if (heavyBlows) applyChampionSkillStatus({ actor, target, effectKey: 'slow', amount: heavyBlows, events })
  }
  if (isRanged(category)) {
    const arrowOfTruth = getChampionSkillLevel(actor, 1002)
    if (arrowOfTruth) applyChampionSkillStatus({ actor, target: actor, effectKey: 'empower', amount: arrowOfTruth, isBuffApplication: true, events })
    const preciseAim = getChampionSkillLevel(actor, 2001)
    if (preciseAim) applyChampionSkillStatus({ actor, target: actor, effectKey: 'focus', amount: preciseAim, isBuffApplication: true, events })
  }
  if (isMagic(category)) {
    const suffocation = getChampionSkillLevel(actor, 502)
    if (suffocation) applyChampionSkillStatus({ actor, target, effectKey: 'drown', amount: suffocation, events })
    const miracle = getChampionSkillLevel(actor, 1302)
    if (miracle && Math.random() < Math.min(1, miracle * 0.25)) applyChampionSkillStatus({ actor, target: actor, effectKey: 'bless', amount: 4, isBuffApplication: true, events })
    const arcaneStudy = getChampionSkillLevel(actor, 2101)
    if (arcaneStudy) applyChampionSkillStatus({ actor, target: actor, effectKey: 'empower', amount: arcaneStudy, isBuffApplication: true, events })
  }
  if (isCritical) {
    const killerInstinct = getChampionSkillLevel(actor, 2201)
    if (killerInstinct) applyChampionSkillStatus({ actor, target, effectKey: 'bleed', amount: killerInstinct, events })
    const crushingFinale = getChampionSkillLevel(actor, 2301)
    if (crushingFinale) applyChampionSkillStatus({ actor, target, effectKey: 'doom', amount: crushingFinale, events })
    const splinterWound = targetHadBleed ? getChampionSkillLevel(actor, 2302) : 0
    if (splinterWound) applyChampionSkillStatus({ actor, target, effectKey: 'bleed', amount: splinterWound, events })
  }
  return events
}

function applyChampionSkillAfterMiss({ actor }) {
  const events = []
  const quickstep = getChampionSkillLevel(actor, 1701)
  if (quickstep) applyChampionSkillStatus({ actor, target: actor, effectKey: 'hasten', amount: quickstep, isBuffApplication: true, events })
  return events
}

function applyChampionSkillAfterHealthChange({ target, previousHp, nextHp, isHealing = false }) {
  const events = []
  if (!target || safeNumber(nextHp, 0) <= 0) return events
  const runtime = getChampionSkillRuntime(target)
  const maxHp = Math.max(1, safeNumber(target.maxHp, target.maxHp || nextHp))
  const halfHp = maxHp / 2
  const ironConstitution = getChampionSkillLevel(target, 1601)
  if (ironConstitution && runtime && !runtime.triggered.halfHealthShield && safeNumber(previousHp, 0) > halfHp && safeNumber(nextHp, 0) <= halfHp) {
    runtime.triggered.halfHealthShield = true
    applyChampionSkillStatus({ actor: target, target, effectKey: 'shield', amount: ironConstitution, isBuffApplication: true, events })
  }
  const secondWind = getChampionSkillLevel(target, 1602)
  if (isHealing && secondWind && safeNumber(previousHp, 0) < halfHp && safeNumber(nextHp, 0) > safeNumber(previousHp, 0)) applyChampionSkillStatus({ actor: target, target, effectKey: 'nurture', amount: secondWind, isBuffApplication: true, events })
  return events
}

function getChampionSkillOngoingHpBonus(champion) {
  const nurtureStacks = getStack(getChampionEffectsBucket(champion), 'nurture')
  const longSummer = getChampionSkillLevel(champion, 1201)
  return nurtureStacks && longSummer ? nurtureStacks * longSummer * 0.1 : 0
}

function getChampionSkillDamageBonus({ actor, target, moveEffectKey }) {
  const conductivity = getChampionSkillLevel(actor, 602)
  if (conductivity && String(moveEffectKey || '').toLowerCase() === 'paralyze' && getStack(getChampionEffectsBucket(target), 'drown') > 0) return conductivity
  return 0
}

function rollChampionSkillCritical(actor, arenaMap = null) {
  const effectAdjustments = computeAttackerStatAdjustments(actor?.effects || {}, arenaMap)
  const critChance = clamp(
    getCritChanceValue(actor?.stats, actor?.charObj) +
      safeNumber(effectAdjustments.critChanceAdj, 0),
    0,
    100
  )
  return critChance > 0 && Math.random() * 100 < critChance
}

function applyChampionSkillCriticalDamage(damage, actor, isCritical) {
  if (!isCritical) return damage
  const critDamagePercent = getCritDamagePercentValue(actor?.stats, actor?.charObj)
  return damage * (critDamagePercent / 100)
}

function getMoveStatPowerBonus(moveType, stats = {}) {
  const statKey = getMoveScalingStatKey(moveType)
  if (!statKey) return 0

  return getMoveStatScaledBonus(moveType, stats?.[statKey])
}

function getMoveDisplayPower(move, stats = {}) {
  return safeNumber(move?.power, 0) + getMoveStatPowerBonus(move?.type || move?.category, stats)
}

function ensureRuntimeEffectFields(charObj) {
  if (!charObj) return charObj
  for (const key of effectKeys) {
    charObj[key] = safeNumber(charObj[key], 0)
  }
  for (const key of statKeys) {
    if (key !== 'accuracy') {
      if (key === 'critChance') {
        charObj[key] = getCritChanceValue(charObj)
      } else if (key === 'critDamage') {
        charObj[key] = getCritDamagePercentValue(charObj)
      } else {
        charObj[key] = safeNumber(charObj[key], 0)
      }
    }
  }
  return charObj
}

function pushBattleOnly(target, entry) {
  target.battleOnly.push(entry)
}

function applyMoveAccuracyTrait(target, moveAccuracyType, amount, sourceName, label) {
  const type = moveAccuracyType || 'all'
  target.moveAccuracy[type] += amount
  target.moveAccuracyBreakdowns.push({
    type,
    sourceName,
    label,
    amount,
  })
}

function applyTraitTextToGainedEffects(target, effectText, amount, sourceName) {
  const text = normalizeTraitEffectText(effectText)
  if (!text || !amount) return

  let match = text.match(/^Increases (.+)$/i)
  if (match) {
    const name = normalizeTraitEffectText(match[1])
    const moveAccuracyType = getMoveAccuracyTypeFromTraitName(name)
    if (moveAccuracyType) {
      applyMoveAccuracyTrait(target, moveAccuracyType, amount, sourceName, text)
      return
    }

    const statKey = lookupTraitAlias(STAT_KEY_ALIASES, name)
    if (statKey) {
      target.stats[statKey] += amount
      return
    }

    const effectKey = lookupTraitAlias(EFFECT_KEY_ALIASES, name)
    if (effectKey) {
      target.effects[effectKey] += amount
      return
    }
  }

  match = text.match(/^Decreases (.+)$/i)
  if (match) {
    const name = normalizeTraitEffectText(match[1])
    const moveAccuracyType = getMoveAccuracyTypeFromTraitName(name)
    if (moveAccuracyType) {
      applyMoveAccuracyTrait(target, moveAccuracyType, -amount, sourceName, text)
      return
    }

    const statKey = lookupTraitAlias(STAT_KEY_ALIASES, name)
    if (statKey) {
      target.stats[statKey] -= amount
      return
    }

    const effectKey = lookupTraitAlias(EFFECT_KEY_ALIASES, name)
    if (effectKey) {
      target.effects[effectKey] -= amount
      return
    }
  }

  match = text.match(/^Resistance to (.+)$/i)
  if (match) {
    pushBattleOnly(target, {
      type: 'resistance',
      label: text,
      sourceName,
      resistedEffect: getEffectKeyFromName(match[1]),
      effectKey: getEffectKeyFromName(match[1]),
      amount,
    })
    return
  }

  match = text.match(/^Gain (.+) at (?:the )?start of (?:the )?battle$/i)
  if (match) {
    pushBattleOnly(target, {
      type: 'gain_start_of_battle',
      label: text,
      sourceName,
      effectKey: getEffectKeyFromName(match[1]),
      amount,
    })
    return
  }

  match = text.match(/^Apply (.+) at (?:the )?start of (?:the )?battle$/i)
  if (match) {
    pushBattleOnly(target, {
      type: 'apply_start_of_battle',
      label: text,
      sourceName,
      effectKey: getEffectKeyFromName(match[1]),
      amount,
    })
    return
  }

  match = text.match(/^Gain (.+?) (?:on|every) (melee|ranged|magic) hit$/i)
  if (match) {
    pushBattleOnly(target, {
      type: 'gain_on_hit',
      label: text,
      sourceName,
      attackType: match[2].toLowerCase(),
      effectKey: getEffectKeyFromName(match[1]),
      amount,
    })
    return
  }

  match = text.match(/^Apply (.+?) (?:on|every) (melee|ranged|magic) hit$/i)
  if (match) {
    pushBattleOnly(target, {
      type: 'apply_on_hit',
      label: text,
      sourceName,
      attackType: match[2].toLowerCase(),
      effectKey: getEffectKeyFromName(match[1]),
      amount,
    })
    return
  }

  match = text.match(/^Heal for (?:the )?amount of (.+?) stacks applied$/i)
  if (match) {
    const sourceEffectKey = getEffectKeyFromName(match[1])
    pushBattleOnly(target, {
      type: 'heal_for_applied_stacks',
      label: text,
      sourceName,
      sourceEffectKey,
      effectKey: sourceEffectKey,
      amount,
    })
    return
  }

  pushBattleOnly(target, {
    type: 'other',
    label: text,
    sourceName,
    amount,
  })
}

function mergeGainedEffectsIntoRuntimeCharacter(baseChar, gainedEffects) {
  if (!baseChar) return baseChar
  ensureRuntimeEffectFields(baseChar)

  const statBonuses = gainedEffects?.stats || {}
  const effectBonuses = gainedEffects?.effects || {}

  for (const key of ['health', 'speed', 'resist', 'strength', 'dexterity', 'intelligence', 'accuracy', 'critChance', 'critDamage']) {
    const add = safeNumber(statBonuses[key], 0)
    if (add) baseChar[key] = safeNumber(baseChar[key], 0) + add
  }

  for (const key of effectKeys) {
    const add = safeNumber(effectBonuses[key], 0)
    if (add) baseChar[key] = safeNumber(baseChar[key], 0) + add
  }

  baseChar.gainedEffectsMeta = gainedEffects || cloneEmptyGainedEffects()
  return baseChar
}

function buildGainedEffectsFromEquippedTraits(traits) {
  const result = cloneEmptyGainedEffects()

  ;(Array.isArray(traits) ? traits : []).forEach((trait) => {
    if (!trait || !Array.isArray(trait.effects)) return

    trait.effects.forEach((effectText, effectIndex) => {
      const amount = safeNumber((trait.effectVotePotencies || trait.effectVoteAverages || trait.effectMedians)?.[effectIndex], 0)
      if (!amount) return
      applyTraitTextToGainedEffects(result, effectText, amount, trait.name)
    })
  })

  return result
}

async function buildEquippedTraitsFromMeta(algodClient, metaDoc) {
  const properties = metaDoc?.properties || {}
  const slotDefs = [
    { type: 'Background', name: properties.Background },
    { type: 'Skin', name: properties.Skin },
    { type: 'Weapon', name: properties.Weapon },
    { type: 'Magic', name: properties.Magic },
    { type: 'Head', name: properties.Head },
    { type: 'Armour', name: properties.Armour },
    { type: 'Extra', name: properties.Extra },
  ]

  const built = await Promise.all(
    slotDefs.map(async ({ type, name }) => {
      if (!name || name === 'None') return null

      const traitDef = getTraitDefinition(name, type)
      const effects = Array.isArray(traitDef?.effects) ? traitDef.effects : []
      const effectVotePotencies = await readTraitEffectVotePotencies(
        algodClient,
        name,
        effects.length
      )

      return {
        type,
        name,
        assetId: traitDef?.assetId || null,
        total: traitDef?.total || traitDef?.champions || null,
        effects,
        effectVotePotencies,
        effectVoteAverages: effectVotePotencies,
        effectMedians: effectVotePotencies,
      }
    })
  )

  return built.filter(Boolean)
}

async function loadEquippedItemEffectsForAsset(assetId) {
  const metaRef = doc(db, 'chars', String(assetId) + 'meta')
  const metaSnap = await getDoc(metaRef)

  if (!metaSnap.exists()) {
    return {
      equippedMetaDoc: null,
      equippedTraits: [],
      gainedEffects: cloneEmptyGainedEffects(),
      itemEffectLines: [],
      battleEffects: [],
      resistances: {},
    }
  }

  const equippedMetaDoc = metaSnap.data() || null
  const equippedTraits = await buildEquippedTraitsFromMeta(client, equippedMetaDoc)
  const gainedEffects = buildGainedEffectsFromEquippedTraits(equippedTraits)
  const itemEffectLines = formatEquippedItemEffectLines(equippedTraits, null)
  const { battleEffects, resistances } = buildBattleEffectRuntime(equippedTraits, gainedEffects)

  return {
    equippedMetaDoc,
    equippedTraits,
    gainedEffects,
    itemEffectLines,
    battleEffects,
    resistances,
  }
}

function applyStatusAmountToBucket({
  effectKey,
  amount,
  targetSide,
  actorSide,
  isBuffApplication,
  A_effectTotals,
  B_effectTotals,
  aStats,
  bStats,
  aItemResistances = {},
  bItemResistances = {},
  arenaMap = null,
  category = null,
}) {
  let appliedAmount = safeNumber(amount, 0)
  if (!effectKey || !appliedAmount) return null

  const bucket = targetSide === 'A' ? A_effectTotals : B_effectTotals
  const normalizedEffectKey = String(effectKey || '').toLowerCase()
  appliedAmount = getArenaMapApplicationAmount({
    arenaMap,
    effectKey: normalizedEffectKey,
    amount: appliedAmount,
    category,
    targetEffects: bucket,
  })

  if (normalizedEffectKey === 'cleanse') {
    const res = consumeCleanseFromNegatives(bucket, appliedAmount)
    if (res.remainingCleanse > 0) {
      bucket.cleanse = getStack(bucket, 'cleanse') + res.remainingCleanse
    }

    return {
      effectName: normalizedEffectKey,
      amount: appliedAmount,
      targetSide,
      resisted: false,
      cleansedTotal: res.removedTotal,
      cleansedByEffect: res.removedByEffect,
      cleanseGuardAdded: res.remainingCleanse,
    }
  }

  const isNegativeApplication =
    NEGATIVE_EFFECT_KEYS.has(normalizedEffectKey) &&
    !isBuffApplication &&
    targetSide !== actorSide

  if (isNegativeApplication) {
    const cleanseGuardResult = consumeCleanseGuardForNegativeApplication(
      bucket,
      appliedAmount
    )
    if (cleanseGuardResult.blockedAmount > 0) {
      appliedAmount = cleanseGuardResult.appliedAmount

      if (!appliedAmount) {
        return {
          effectName: normalizedEffectKey,
          amount: 0,
          targetSide,
          resisted: true,
          blockedBy: 'cleanse',
          cleanseBlockedAmount: cleanseGuardResult.blockedAmount,
        }
      }
    }

    const itemResistance =
      targetSide === 'A'
        ? safeNumber(aItemResistances[normalizedEffectKey], 0)
        : safeNumber(bItemResistances[normalizedEffectKey], 0)

    if (itemResistance > 0 && Math.random() * 100 < itemResistance) {
      return {
        effectName: normalizedEffectKey,
        amount: 0,
        targetSide,
        resisted: true,
        blockedBy: 'item_resistance',
      }
    }

    const defenderStats = targetSide === 'A' ? aStats : bStats
    const defenderEffects = targetSide === 'A' ? A_effectTotals : B_effectTotals
    const resistChance = computeDefenderResistChance(defenderStats, defenderEffects, arenaMap)
    if (Math.random() * 100 < resistChance) {
      return {
        effectName: normalizedEffectKey,
        amount: 0,
        targetSide,
        resisted: true,
      }
    }
  }

  bucket[normalizedEffectKey] = (bucket[normalizedEffectKey] || 0) + appliedAmount

  return {
    effectName: normalizedEffectKey,
    amount: appliedAmount,
    targetSide,
    resisted: false,
  }
}

function applyStartOfBattleItemEffects({
  A_effectTotals,
  B_effectTotals,
  aItemBattleEffects = [],
  bItemBattleEffects = [],
  aItemResistances = {},
  bItemResistances = {},
  aStats,
  bStats,
  aCharObj,
  bCharObj,
  arenaMap = null,
}) {
  const events = []

  const applyEntries = (entries, actorSide, charObj) => {
    for (const entry of entries || []) {
      if (
        entry.type !== 'gain_start_of_battle' &&
        entry.type !== 'apply_start_of_battle'
      ) {
        continue
      }

      const isBuffApplication = entry.type === 'gain_start_of_battle'
      const targetSide = isBuffApplication
        ? actorSide
        : actorSide === 'A'
        ? 'B'
        : 'A'

      const amount = getAdjustedTriggeredItemAmount(charObj, entry)

      const event = applyStatusAmountToBucket({
        effectKey: entry.effectKey,
        amount,
        targetSide,
        actorSide,
        isBuffApplication,
        A_effectTotals,
        B_effectTotals,
        aStats,
        bStats,
        aItemResistances,
        bItemResistances,
        arenaMap,
      })

      if (event) {
        events.push({
          ...event,
          sourceName: entry.sourceName,
          label: entry.label,
          itemEffect: true,
          timing: 'start_of_battle',
        })
      }
    }
  }

  applyEntries(aItemBattleEffects, 'A', aCharObj)
  applyEntries(bItemBattleEffects, 'B', bCharObj)

  return events
}

function applyItemOnHitEffects({
  actorSide,
  category,
  A_effectTotals,
  B_effectTotals,
  aItemBattleEffects = [],
  bItemBattleEffects = [],
  aItemResistances = {},
  bItemResistances = {},
  aStats,
  bStats,
  aCharObj,
  bCharObj,
  arenaMap = null,
}) {
  const events = []
  const entries = actorSide === 'A' ? aItemBattleEffects : bItemBattleEffects
  const charObj = actorSide === 'A' ? aCharObj : bCharObj

  for (const entry of entries || []) {
    if (entry.type !== 'gain_on_hit' && entry.type !== 'apply_on_hit') continue
    if (!shouldTriggerItemOnHit(entry, category)) continue

    const isBuffApplication = entry.type === 'gain_on_hit'
    const targetSide = isBuffApplication
      ? actorSide
      : actorSide === 'A'
      ? 'B'
      : 'A'

    const amount = getAdjustedTriggeredItemAmount(charObj, entry)

    const event = applyStatusAmountToBucket({
      effectKey: entry.effectKey,
      amount,
      targetSide,
      actorSide,
      isBuffApplication,
      A_effectTotals,
      B_effectTotals,
      aStats,
      bStats,
      aItemResistances,
      bItemResistances,
      arenaMap,
      category,
    })

    if (event) {
      events.push({
        ...event,
        sourceName: entry.sourceName,
        label: entry.label,
        itemEffect: true,
        timing: 'on_hit',
      })
    }
  }

  const arenaHitBonus = getArenaMapHitBonus(arenaMap, category)
  if (arenaHitBonus) {
    const targetSide = actorSide === 'A' ? 'B' : 'A'
    const event = applyStatusAmountToBucket({
      effectKey: arenaHitBonus.effectKey,
      amount: getMapPassiveAppliedAmount(arenaHitBonus.amount, arenaHitBonus.effectKey, charObj),
      targetSide,
      actorSide,
      isBuffApplication: false,
      A_effectTotals,
      B_effectTotals,
      aStats,
      bStats,
      aItemResistances,
      bItemResistances,
    })

    if (event) {
      events.push({
        ...event,
        sourceName: arenaMap?.name,
        label: formatArenaMapPassive(arenaMap),
        itemEffect: true,
        timing: 'map_on_hit',
      })
    }
  }

  return events
}

async function animateItemEffectEvents({
  events,
  animateEffectPopup,
  animateResistPopup,
  framesSoFar,
  cdA,
  cdB,
  A_HP,
  A_MAX,
  B_HP,
  B_MAX,
}) {
  let nextFrame = framesSoFar

  for (const event of events || []) {
    if (!event?.effectName) continue

    if (event.resisted) {
      nextFrame = await animateResistPopup({
        targetSide: event.targetSide,
        framesSoFar: nextFrame,
        cdA,
        cdB,
        A_HP,
        A_MAX,
        B_HP,
        B_MAX,
      })
    } else if (event.amount > 0) {
      nextFrame = await animateEffectPopup({
        targetSide: event.targetSide,
        effectName: event.effectName,
        amount: event.amount,
        framesSoFar: nextFrame,
        cdA,
        cdB,
        A_HP,
        A_MAX,
        B_HP,
        B_MAX,
      })
    }
  }

  return nextFrame
}

function drawWrappedTextLimited(panel, font, text, x, y, width, lineHeight, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  let line = ''
  let linesDrawn = 0

  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (Jimp.measureText(font, test) > width && line) {
      panel.print(font, x, y + linesDrawn * lineHeight, line)
      linesDrawn += 1
      line = word
      if (linesDrawn >= maxLines) return linesDrawn
    } else {
      line = test
    }
  }

  if (line && linesDrawn < maxLines) {
    panel.print(font, x, y + linesDrawn * lineHeight, line)
    linesDrawn += 1
  }

  return linesDrawn
}

function truncateTextToWidth(font, text, width) {
  let value = String(text || '')
  if (!font || Jimp.measureText(font, value) <= width) return value
  while (value.length > 4 && Jimp.measureText(font, `${value.slice(0, -1).trim()}...`) > width) {
    value = value.slice(0, -1).trim()
  }
  return `${value.replace(/\.*$/, '')}...`
}

function getArenaMapInfoPanelDimensions(bgW, scale = 1) {
  const baseW = Math.min(bgW * 0.5, 700)
  const minW = Math.min(500, bgW * 0.9)
  return {
    panelW: Math.round(Math.max(minW, baseW) * scale),
    panelH: Math.round(224 * scale),
    roundH: Math.round(22 * scale),
    roundGap: Math.round(5 * scale),
  }
}

function getArenaMapInfoTopY(scale = 1) {
  return Math.round(8 * scale)
}

function getArenaMapInfoCenterY(frameH, bgW, scale = 1) {
  const { panelH, roundH, roundGap } = getArenaMapInfoPanelDimensions(bgW, scale)
  return Math.max(0, Math.round((frameH - panelH - roundH - roundGap) / 2))
}

function drawArenaMapInfoPanel(frame, arenaMap, {
  font,
  fontBlack,
  titleFont,
  titleFontBlack,
  bgW = frame.bitmap.width,
  y = 12,
  scale = 1,
  compact = false,
  endGameRoundOverride = null,
  roundNumber = 0,
  fightTypeLabel = ARENA_FIGHT_TYPE_LABEL,
} = {}) {
  if (!arenaMap || !font || !fontBlack || !titleFont || !titleFontBlack) return

  const { panelW, panelH, roundH, roundGap } = getArenaMapInfoPanelDimensions(bgW, scale)
  const panelX = Math.round((bgW - panelW) / 2)
  const panel = new Jimp(panelW, panelH, Jimp.cssColorToHex('#08040d'))
  panel.opacity(0.84)
  frame.composite(panel, panelX, y)

  const innerPad = Math.max(6, Math.round(10 * scale))
  const title = formatArenaMapTitle(arenaMap)
  const passive = formatArenaMapPassive(arenaMap)
  const endGame = formatArenaMapEndGame(arenaMap, endGameRoundOverride)
  const titleX = Math.round(panelX + (panelW - Jimp.measureText(titleFont, title)) / 2)
  const titleY = y + Math.round(4 * scale)
  frame.print(titleFontBlack, titleX + 1, titleY + 1, title)
  frame.print(titleFont, titleX, titleY, title)

  const typeLabel = truncateTextToWidth(
    font,
    String(fightTypeLabel || '').toUpperCase(),
    Math.round(panelW * 0.22)
  )
  if (typeLabel) {
    const labelX = panelX + innerPad
    const labelY = y + Math.round(9 * scale)
    frame.print(fontBlack, labelX + 1, labelY + 1, typeLabel)
    frame.print(font, labelX, labelY, typeLabel)
  }

  const bodyX = panelX + innerPad
  const bodyY = y + Math.round(40 * scale)
  const bodyW = panelW - innerPad * 2
  const lineH = Math.round(16 * scale)
  const labelGap = Math.round(1 * scale)
  const rowGap = Math.round(3 * scale)

  const drawLabelAndText = (label, text, rowY, maxLines) => {
    frame.print(fontBlack, bodyX + 1, rowY + 1, label)
    frame.print(font, bodyX, rowY, label)
    const textY = rowY + lineH + labelGap
    drawWrappedTextLimited(frame, fontBlack, text, bodyX + 1, textY + 1, bodyW, lineH, maxLines)
    drawWrappedTextLimited(frame, font, text, bodyX, textY, bodyW, lineH, maxLines)
    return textY + lineH * maxLines + rowGap
  }

  const drawEndGameText = (info, rowY) => {
    frame.print(fontBlack, bodyX + 1, rowY + 1, info.label)
    frame.print(font, bodyX, rowY, info.label)

    const textY = rowY + lineH + labelGap
    const descriptionLines = 2
    drawWrappedTextLimited(frame, fontBlack, info.description, bodyX + 1, textY + 1, bodyW, lineH, descriptionLines)
    drawWrappedTextLimited(frame, font, info.description, bodyX, textY, bodyW, lineH, descriptionLines)

    if (!info.resolution) {
      return textY + lineH * descriptionLines + rowGap
    }

    const resolutionY = textY + lineH * descriptionLines + Math.round(7 * scale)
    const resolutionLines = 3
    drawWrappedTextLimited(frame, fontBlack, info.resolution, bodyX + 1, resolutionY + 1, bodyW, lineH, resolutionLines)
    drawWrappedTextLimited(frame, font, info.resolution, bodyX, resolutionY, bodyW, lineH, resolutionLines)

    return resolutionY + lineH * resolutionLines + rowGap
  }

  let nextY = drawLabelAndText('PASSIVE', passive, bodyY, 3)
  drawEndGameText(endGame, nextY)

  const shownRound = Math.max(0, Math.floor(Number(roundNumber) || 0))
  const roundText = `Round ${shownRound}`
  const roundW = Math.round((Jimp.measureText(font, roundText) + 24) * scale)
  const roundX = Math.round((bgW - roundW) / 2)
  const roundY = y + panelH + roundGap
  const roundPanel = new Jimp(roundW, roundH, Jimp.cssColorToHex('#08040d'))
  roundPanel.opacity(0.72)
  frame.composite(roundPanel, roundX, roundY)
  const roundTextX = roundX + Math.round((roundW - Jimp.measureText(font, roundText)) / 2)
  const roundTextY = roundY + Math.max(2, Math.round(3 * scale))
  frame.print(fontBlack, roundTextX + 1, roundTextY + 1, roundText)
  frame.print(font, roundTextX, roundTextY, roundText)
}

async function animateArenaMapInfoZoom({
  baseFrameBuilder,
  arenaMap,
  outFramesDir,
  framesSoFar,
  bgW,
  font,
  fontBlack,
  titleFont,
  titleFontBlack,
  endGameRoundOverride = null,
  roundNumber = 0,
  mode = 'intro',
}) {
  if (!arenaMap) return framesSoFar
  let fIdxLocal = framesSoFar
  const moveFrames = 24
  const holdFrames = 34

  const drawStep = async (y) => {
    const frame = await baseFrameBuilder()
    drawArenaMapInfoPanel(frame, arenaMap, {
      font,
      fontBlack,
      titleFont,
      titleFontBlack,
      bgW,
      y,
      scale: 1,
      compact: false,
      endGameRoundOverride,
      roundNumber,
    })
    await saveFrame(outFramesDir, fIdxLocal++, frame)
  }

  const sampleFrame = await baseFrameBuilder()
  const topY = getArenaMapInfoTopY()
  const centerY = getArenaMapInfoCenterY(sampleFrame.bitmap.height, bgW)

  if (mode === 'endGame') {
    for (let i = 0; i < moveFrames; i += 1) {
      const t = easeInOut(i / Math.max(1, moveFrames - 1))
      await drawStep(Math.round(topY + (centerY - topY) * t))
    }
    for (let i = 0; i < holdFrames; i += 1) await drawStep(centerY)
    for (let i = 0; i < moveFrames; i += 1) {
      const t = easeInOut(i / Math.max(1, moveFrames - 1))
      await drawStep(Math.round(centerY + (topY - centerY) * t))
    }
  } else {
    for (let i = 0; i < holdFrames; i += 1) await drawStep(centerY)
    for (let i = 0; i < moveFrames; i += 1) {
      const t = easeInOut(i / Math.max(1, moveFrames - 1))
      await drawStep(Math.round(centerY + (topY - centerY) * t))
    }
  }

  return fIdxLocal
}


/* ===================== EFFECT-DRIVEN STAT ADJUSTMENTS & DOT ===================== */

function computeAttackerStatAdjustments(effects = {}, arenaMap = null) {
  const get = (name) => Number(effects?.[name] || 0)
  const modifier = getArenaMapModifier(arenaMap)
  const boostedEffect = getArenaMapEffect(arenaMap)
  const accuracyPenaltyMultiplier = safeNumber(modifier.accuracyPenaltyMultiplier, 1)
  const speedPenaltyMultiplier = safeNumber(modifier.speedPenaltyMultiplier, 1)
  const speedBonusMultiplier = safeNumber(modifier.speedBonusMultiplier, 1)
  const strengthBonusMultiplier = safeNumber(modifier.strengthBonusMultiplier, 1)

  let strengthAdj = 0
  let dexterityAdj = 0
  let intelligenceAdj = 0
  let accuracyAdj = 0
  let resistAdj = 0
  let speedAdj = 0
  let critChanceAdj = 0

  const bleed = get('bleed')
  if (bleed) strengthAdj -= bleed * 0.1

  const burn = get('burn')
  if (burn) {
    intelligenceAdj -= burn * 0.1
    strengthAdj += burn * 0.1
    speedAdj += burn * 0.2
  }

  const freeze = get('freeze')
  if (freeze) {
    dexterityAdj -= freeze * 0.4
    speedAdj -= freeze * 0.4 * (boostedEffect === 'freeze' ? speedPenaltyMultiplier : 1)
  }

  const slow = get('slow')
  if (slow) {
    dexterityAdj -= slow * 0.2
    speedAdj -= slow * 0.6 * (boostedEffect === 'slow' ? speedPenaltyMultiplier : 1)
  }

  const paralyze = get('paralyze')
  if (paralyze) {
    accuracyAdj -= paralyze * 0.2 * (boostedEffect === 'paralyze' ? accuracyPenaltyMultiplier : 1)
    speedAdj -= paralyze * 0.4
  }

  const drown = get('drown')
  if (drown) {
    dexterityAdj -= drown * 0.6
    accuracyAdj -= drown * 0.2 * (boostedEffect === 'drown' ? accuracyPenaltyMultiplier : 1)
  }

  const doom = get('doom')
  if (doom) strengthAdj += doom * 0.2

  const strengthen = get('strengthen')
  if (strengthen) {
    strengthAdj += strengthen * 0.5 * (boostedEffect === 'strengthen' ? strengthBonusMultiplier : 1)
  }

  const empower = get('empower')
  if (empower) {
    strengthAdj += empower * 0.2
    intelligenceAdj += empower * 0.4
  }

  const hasten = get('hasten')
  if (hasten) {
    dexterityAdj += hasten * 0.3
    speedAdj += hasten * 0.4 * (boostedEffect === 'hasten' ? speedBonusMultiplier : 1)
  }

  const bless = get('bless')
  if (bless) {
    strengthAdj += bless * 0.3
    intelligenceAdj += bless * 0.3
  }

  const focus = get('focus')
  if (focus) {
    accuracyAdj += focus * 0.5
    critChanceAdj += focus * 0.4
  }

  return {
    strengthAdj,
    dexterityAdj,
    intelligenceAdj,
    accuracyAdj,
    resistAdj,
    speedAdj,
    critChanceAdj,
  }
}

function computeOngoingEffectHpDelta(effects = {}, arenaMap = null) {
  const get = (name) => Number(effects?.[name] || 0)
  const modifier = getArenaMapModifier(arenaMap)
  const boostedEffect = getArenaMapEffect(arenaMap)
  const ongoingDamageMultiplier = safeNumber(modifier.ongoingDamageMultiplier, 1)
  const healingMultiplier = safeNumber(modifier.healingMultiplier, 1)
  let delta = 0

  const bleed = get('bleed')
  if (bleed) delta -= bleed * 0.2

  const burn = get('burn')
  if (burn) delta -= burn * 0.2 * (boostedEffect === 'burn' ? ongoingDamageMultiplier : 1)

  const poison = get('poison')
  if (poison) delta -= poison * 0.3

  const doom = get('doom')
  if (doom) delta -= doom * 0.1

  const nurture = get('nurture')
  if (nurture) delta += nurture * 0.2 * (boostedEffect === 'nurture' ? healingMultiplier : 1)

  return delta
}

// Replace your NEGATIVE_EFFECT_KEYS with exactly these (as requested)
const NEGATIVE_EFFECT_KEYS = new Set([
  'bleed',
  'burn',
  'freeze',
  'slow',
  'paralyze',
  'drown',
  'doom',
  'poison',
])

const getStack = (obj, k) => {
  const v = Number(obj?.[k] ?? 0)
  return Number.isFinite(v) ? v : 0
}

/**
 * Consume up to `cleanseAmount` from negative effects on `bucket`.
 * Priority rule: remove from the largest stack first, then next largest, etc.
 * (This matches your examples deterministically.)
 */
function consumeCleanseFromNegatives(bucket, cleanseAmount) {
  let remaining = Math.max(0, Number(cleanseAmount) || 0)
  if (!remaining) return { removedTotal: 0, removedByEffect: {}, remainingCleanse: 0 }

  // Collect present negative stacks
  const entries = Object.keys(bucket)
    .filter((k) => NEGATIVE_EFFECT_KEYS.has(k) && getStack(bucket, k) > 0)
    .map((k) => ({ k, v: getStack(bucket, k) }))

  if (entries.length === 0) {
    return { removedTotal: 0, removedByEffect: {}, remainingCleanse: remaining }
  }

  // Largest-first removal (stable/deterministic; tiebreak by name)
  entries.sort((a, b) => (b.v - a.v) || a.k.localeCompare(b.k))

  const removedByEffect = {}
  let removedTotal = 0

  for (const e of entries) {
    if (remaining <= 0) break
    const take = Math.min(e.v, remaining)
    const next = e.v - take

    if (next > 0) bucket[e.k] = next
    else delete bucket[e.k]

    removedByEffect[e.k] = (removedByEffect[e.k] || 0) + take
    removedTotal += take
    remaining -= take
  }

  return { removedTotal, removedByEffect, remainingCleanse: remaining }
}

function consumeCleanseGuardForNegativeApplication(bucket, incomingAmount) {
  const appliedIncomingAmount = Math.max(0, Number(incomingAmount) || 0)
  const cleanseGuard = getStack(bucket, 'cleanse')

  if (!appliedIncomingAmount || cleanseGuard <= 0) {
    return {
      appliedAmount: appliedIncomingAmount,
      blockedAmount: 0,
      remainingCleanse: Math.max(0, cleanseGuard),
    }
  }

  const blockedAmount = Math.min(cleanseGuard, appliedIncomingAmount)
  const remainingCleanse = cleanseGuard - blockedAmount
  const appliedAmount = appliedIncomingAmount - blockedAmount

  if (remainingCleanse > 0) bucket.cleanse = remainingCleanse
  else delete bucket.cleanse

  return {
    appliedAmount,
    blockedAmount,
    remainingCleanse,
  }
}

function makeApplyEffectStacksForMove({
  A_effectTotals,
  B_effectTotals,
  aStats,
  bStats,
  arenaMap = null,
}) {
  return function applyEffectStacksForMove(meta, moveKind, isActorA, effectAmountMultiplier = 1) {
    const effectNameRaw = String(meta.effect_name || meta.effect || '').trim()
    if (!effectNameRaw) return null

    const key = effectNameRaw.toLowerCase()

    let basePotency = getMoveEffectBasePotency(meta)

    const explicitMoveKind = getExplicitMoveKind(meta, moveKind)
    const isBuffK = explicitMoveKind === 'buff'
    const isCurseK = explicitMoveKind === 'curse'

    let amount
    if (isBuffK || isCurseK) amount = basePotency * 2
    else amount = basePotency
    amount *= Math.max(0, safeNumber(effectAmountMultiplier, 1))

    // ===== CLEANSE SPECIAL CASE (amount-based removal) =====
    if (key === 'cleanse') {
      const targetSide = getMoveTargetSide({ meta, moveKind: explicitMoveKind, isActorA })
      const bucket = targetSide === 'A' ? A_effectTotals : B_effectTotals
      amount = getArenaMapApplicationAmount({
        arenaMap,
        effectKey: key,
        amount,
        category: meta.type || meta.category,
        targetEffects: bucket,
      })

      // Remove up to `amount` negative stacks across the listed negatives
      const res = consumeCleanseFromNegatives(bucket, amount)

      // If there is leftover cleanse and no more negatives to remove, store as guard
      if (res.remainingCleanse > 0) {
        bucket.cleanse = getStack(bucket, 'cleanse') + res.remainingCleanse
      }

      return {
        effectName: 'cleanse',
        amount,                     // amount attempted/applied
        targetSide,
        resisted: false,
        cleansedTotal: res.removedTotal,
        cleansedByEffect: res.removedByEffect,
        cleanseGuardAdded: res.remainingCleanse, // how many guard stacks were added
      }
    }

    // For non-cleanse effects, potency must exist
    if (!basePotency) return null

    // Battle rule: buff moves target self; damage and curse moves target the enemy.
    const targetSide = getMoveTargetSide({ meta, moveKind: explicitMoveKind, isActorA })

    const bucket = targetSide === 'A' ? A_effectTotals : B_effectTotals
    amount = getArenaMapApplicationAmount({
      arenaMap,
      effectKey: key,
      amount,
      category: meta.type || meta.category,
      targetEffects: bucket,
    })

    // ===== CLEANSE GUARD BLOCKS NEGATIVE EFFECTS =====
    // Only consider applications that are being applied to the opponent (i.e., negative status application)
    const actorSide = isActorA ? 'A' : 'B'
    const isNegativeApplication =
      NEGATIVE_EFFECT_KEYS.has(key) &&
      !isBuffK &&
      targetSide !== actorSide

    if (isNegativeApplication) {
      const cleanseGuardResult = consumeCleanseGuardForNegativeApplication(
        bucket,
        amount
      )
      if (cleanseGuardResult.blockedAmount > 0) {
        amount = cleanseGuardResult.appliedAmount

        if (!amount) {
          return {
            effectName: key,
            amount: 0,
            targetSide,
            resisted: true,
            blockedBy: 'cleanse',
            cleanseBlockedAmount: cleanseGuardResult.blockedAmount,
          }
        }
      }
    }

    // ===== BUFFS: always apply, no resist check =====
    if (isBuffK) {
      bucket[key] = (bucket[key] || 0) + amount
      return { effectName: key, amount, targetSide, resisted: false }
    }

    // ===== NON-BUFF EFFECTS: defender can resist =====
    const defenderStats = targetSide === 'A' ? aStats : bStats
    const defenderEffects = targetSide === 'A' ? A_effectTotals : B_effectTotals

    const resistChance = computeDefenderResistChance(defenderStats, defenderEffects, arenaMap)
    const roll = Math.random() * 100

    if (roll < resistChance) {
      return { effectName: key, amount: 0, targetSide, resisted: true }
    }

    bucket[key] = (bucket[key] || 0) + amount
    return { effectName: key, amount, targetSide, resisted: false }
  }
}

function isMelee(category = '') {
  return String(category).toLowerCase().startsWith('melee')
}

function isRanged(category = '') {
  return String(category).toLowerCase().startsWith('ranged')
}

function isMagic(category = '') {
  return String(category).toLowerCase().startsWith('magic')
}



/* ===================== DAMAGE (TYPELESS, BUT STAT + EFFECT AWARE) ===================== */
/**
 * RPG damage:
 * - melee   ⇒ uses strength
 * - ranged  ⇒ uses dexterity
 * - magic   ⇒ uses intelligence
 *
 * ❗ Defender RESIST no longer reduces damage.
 * RESIST is now only used as a % chance to BLOCK an effect being applied.
 */
function calcDamageRPG({
  movePower,
  category,
  attackerStats,
  defenderStats,     // kept in signature for compatibility
  attackerEffects = {},
  defenderEffects = {},
  arenaMap = null,
}) {
  const adjAtk = computeAttackerAdjustedStats(attackerStats, attackerEffects, arenaMap)

  const statKey = getMoveScalingStatKey(category)
  const adjustedStatValue = statKey
    ? safeNumber(adjAtk?.[statKey], safeNumber(attackerStats?.[statKey], 0))
    : 0

  let dmg =
    safeNumber(movePower, 0) +
    getMoveStatScaledBonus(category, adjustedStatValue)

  const shieldStacks = getStack(defenderEffects, 'shield')
  const shieldBlockMultiplier =
    isArenaMapEffect(arenaMap, 'shield') ? safeNumber(getArenaMapModifier(arenaMap).blockMultiplier, 1) : 1
  let shieldMitigation = 0

  if (shieldStacks > 0 && (isMelee(category) || isRanged(category))) {
    shieldMitigation = shieldStacks * 0.5 * shieldBlockMultiplier
    dmg = Math.max(0, dmg - shieldMitigation)
  }

  return { dmg, eff: 1.0, stab: 1.0, shieldMitigation }
}

/* ===================== BUFF / CURSE DETECTION ===================== */
function isBuffMove(move = {}) {
  const explicitKind = getMoveClass(move?.type) || getMoveClass(move?.category)
  if (explicitKind) return explicitKind === 'buff'

  const p = Number(move.power)
  // Power <= 0 is very likely a buff/utility for older character objects.
  if (Number.isFinite(p) && p <= 0) return true

  const fields = [
    move.effect,
    move.trait,
    move.description,
    move.name,
  ]
  const s = fields
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (!s) return false

  // Text fallback only applies when type/category did not explicitly say damage/curse/buff.
  return (
    s.includes('buff') ||
    s.includes('boost') ||
    s.includes('increase') ||
    s.includes('regen') ||
    s.includes('regeneration') ||
    s.includes('heal') ||
    s.includes('shield') ||
    s.includes('protect')
  )
}



/** Detect curse-style moves by text/type */
function isCurseMove(move = {}) {
  const explicitKind = getMoveClass(move?.type) || getMoveClass(move?.category)
  if (explicitKind) return explicitKind === 'curse'

  const fields = [
    move.effect,
    move.trait,
    move.description,
    move.name,
  ]
  const s = fields
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (!s) return false
  return s.includes('curse') || s.includes('hex') || s.includes('mark')
}


/**
 * Safely read an effect stack (we store them lower-case in A_effectTotals/B_effectTotals).
 */
function getEffect(effects, key) {
  if (!effects) return 0
  const v = effects[key] ?? effects[key.toLowerCase()]
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Attacker stat adjustments based on current effects.
 * Mirrors your on-chain logic:
 *
 *  - bleed, burn, freeze, slow, paralyze, drown, doom   (debuffs)
 *  - strengthen, empower, hasten, bless, focus          (buffs)
 *  - plus the separate speed adjustments block
 */
function computeAttackerAdjustedStats(baseStats, effects, arenaMap = null) {
  const adjustments = computeAttackerStatAdjustments(effects || {}, arenaMap)

  const strength = clamp((baseStats.strength || 0) + adjustments.strengthAdj, 0, 999)
  const dexterity = clamp((baseStats.dexterity || 0) + adjustments.dexterityAdj, 0, 999)
  const intelligence = clamp((baseStats.intelligence || 0) + adjustments.intelligenceAdj, 0, 999)
  const speed = clamp((baseStats.speed || 0) + adjustments.speedAdj, 0, 999)
  const critChance = clamp(getCritChanceValue(baseStats) + adjustments.critChanceAdj, 0, 100)

  const accScale = clamp(1 + adjustments.accuracyAdj, 0.1, 2.0)

  return { strength, dexterity, intelligence, speed, accScale, critChance }
}

function computeDefenderAdjustedStats(baseStats, effects, arenaMap = null) {
  const eff = effects || {}
  const modifier = getArenaMapModifier(arenaMap)
  const boostedEffect = getArenaMapEffect(arenaMap)
  const resistPenaltyMultiplier = safeNumber(modifier.resistPenaltyMultiplier, 1)
  const bless = getEffect(eff, 'bless')
  const doom = getEffect(eff, 'doom')

  let resistAdj = 0
  if (bless) resistAdj += bless * 0.1
  if (doom) resistAdj -= doom * 0.4 * (boostedEffect === 'doom' ? resistPenaltyMultiplier : 1)

  const resist = safeNumber(baseStats?.resist, 0) + resistAdj

  return { resist }
}

function computeDefenderResistChance(baseStats, effects, arenaMap = null) {
  if (!baseStats) return 0
  const { resist } = computeDefenderAdjustedStats(
    baseStats,
    effects || {},
    arenaMap
  )
  // Treat resist stat as 0–100% chance; clamp just in case.
  const chance = clamp(resist || 0, 0, 100)
  return chance
}



/* ===================== ICONS & DRAW HELPERS ===================== */
const STAT_ICON_FILENAMES = {
  strength: 'attack.png',
  dexterity: 'speed.png',
  intelligence: 'magicAttack.png',
  speed: 'speed.png',
  resist: 'defence.png',
  health: 'heart.png',
  power: 'power.png',
  accuracy: 'accuracy.png',
  cooldown: 'hourglass.png',
  nature: 'nature.png',
}
async function loadStatIcons(
  iconsDirRoot = path.resolve('./icons/stats')
) {
  const result = {}
  await Promise.all(
    Object.entries(STAT_ICON_FILENAMES).map(
      async ([key, fname]) => {
        const p = path.join(iconsDirRoot, fname)
        try {
          result[key] = fs.existsSync(p) ? await Jimp.read(p) : null
        } catch {
          result[key] = null
        }
      }
    )
  )
  return result
}
async function loadTypeIcons(
  typesDirRoot = path.resolve('./icons/types')
) {
  const map = {}
  for (const t of TYPES) {
    const fname = `${t.toLowerCase()}.png`
    const p = path.join(typesDirRoot, fname)
    try {
      map[t] = fs.existsSync(p) ? await Jimp.read(p) : null
    } catch {
      map[t] = null
    }
  }
  return map
}
/* ===================== EFFECT ICONS ===================== */


function getFrameUrlsFromCandidates(candidates, fallbackUrl = null) {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const frames = candidate
        .filter((url) => typeof url === 'string' && url.trim())
        .slice(0, 4)
      if (frames.length) return frames
    }
  }
  return fallbackUrl ? [fallbackUrl] : []
}

function getIdleFrameUrls(charObj) {
  return getFrameUrlsFromCandidates(
    [
      charObj?.idleFrames,
      charObj?.animation?.idle?.frameUrls,
      charObj?.idleAnimation?.frameUrls,
      charObj?.animationFrames,
    ],
    charObj?.standingUrl
  )
}

function getMoveCharacterFrameUrls(move, fallbackUrl) {
  return getFrameUrlsFromCandidates(
    [
      move?.animationFrames,
      move?.animationMeta?.frameUrls,
      move?.characterFrames,
      move?.characterAnimation?.frameUrls,
    ],
    move?.characterUrl || fallbackUrl
  )
}

function getMoveEffectFrameUrls(move, fallbackUrl) {
  return getFrameUrlsFromCandidates(
    [
      move?.effectFrames,
      move?.effectAnimationFrames,
      move?.moveEffectFrames,
      move?.visualFrames,
      move?.moveVisualFrames,
      move?.effectAnimationMeta?.frameUrls,
      move?.effectMeta?.frameUrls,
      move?.moveVisualMeta?.frameUrls,
      move?.visualMeta?.frameUrls,
      move?.effectAnimation?.frameUrls,
      move?.moveVisual?.frameUrls,
    ],
    move?.effectUrl || move?.visualUrl || move?.moveVisualUrl || fallbackUrl
  )
}

const SIM_MOVE_CHAR_FRAME_HOLD = 8
const SIM_MOVE_CHAR_LAST_FRAME_HOLD = 16
const SIM_MOVE_EFFECT_FRAME_HOLD = 7
const SIM_MOVE_EFFECT_LAST_FRAME_HOLD = 24
const SIM_MOVE_LOOP_PAUSE_FRAMES = 42

function getMovePreviewLayout(moveType) {
  const lowered = String(moveType || '').toLowerCase()
  const root = lowered.split(' ')[0]

  if (lowered.includes('buff')) return 'buff'
  if (root === 'melee') return 'melee'
  if (root === 'magic' || root === 'ranged') return 'projectile'
  if (lowered.includes('curse') || lowered.includes('damage')) return 'projectile'
  return 'projectile'
}

function buildMovePlaybackSequenceFrames({
  charFrameCount,
  effectFrameCount,
  frameHold = SIM_MOVE_CHAR_FRAME_HOLD,
  charLastFrameHold = SIM_MOVE_CHAR_LAST_FRAME_HOLD,
  effectFrameHold = SIM_MOVE_EFFECT_FRAME_HOLD,
  effectLastFrameHold = SIM_MOVE_EFFECT_LAST_FRAME_HOLD,
  loopPauseFrames = SIM_MOVE_LOOP_PAUSE_FRAMES,
}) {
  const safeCharCount = Math.max(1, charFrameCount || 1)
  const lastCharIndex = Math.max(0, safeCharCount - 1)
  const previewCharIndices = [0, 1, 2, 3].map((index) =>
    Math.min(index, lastCharIndex)
  )

  const sequence = [
    {
      charIndex: previewCharIndices[0],
      effectIndex: -1,
      duration: frameHold,
    },
    {
      charIndex: previewCharIndices[1],
      effectIndex: -1,
      duration: frameHold,
    },
    {
      charIndex: previewCharIndices[2],
      effectIndex: effectFrameCount > 0 ? 0 : -1,
      duration: frameHold,
    },
  ]

  if (effectFrameCount > 0) {
    if (effectFrameCount === 1) {
      sequence.push({
        charIndex: previewCharIndices[3],
        effectIndex: 0,
        duration: effectLastFrameHold,
      })
    } else {
      sequence.push({
        charIndex: previewCharIndices[3],
        effectIndex: 1,
        duration: effectFrameCount > 2 ? effectFrameHold : effectLastFrameHold,
      })

      for (let effectIndex = 2; effectIndex < effectFrameCount - 1; effectIndex += 1) {
        sequence.push({
          charIndex: previewCharIndices[3],
          effectIndex,
          duration: effectFrameHold,
        })
      }

      sequence.push({
        charIndex: previewCharIndices[3],
        effectIndex: effectFrameCount - 1,
        duration: effectLastFrameHold,
      })
    }

    sequence.push({
      charIndex: previewCharIndices[3],
      effectIndex: -1,
      duration: loopPauseFrames,
    })

    return sequence
  }

  sequence.push({
    charIndex: previewCharIndices[3],
    effectIndex: -1,
    duration: charLastFrameHold + loopPauseFrames,
  })

  return sequence
}

function getPlaybackStepAtFrame(localFrame, charFrameCount, effectFrameCount, options = {}) {
  const sequence = buildMovePlaybackSequenceFrames({
    charFrameCount,
    effectFrameCount,
    ...options,
  })
  const total = sequence.reduce((sum, step) => sum + step.duration, 0)
  let cursor = ((localFrame % total) + total) % total

  for (const step of sequence) {
    if (cursor < step.duration) {
      const effectProgress =
        effectFrameCount > 1 && step.effectIndex >= 0
          ? step.effectIndex / Math.max(1, effectFrameCount - 1)
          : step.effectIndex >= 0
          ? 1
          : 0

      return {
        ...step,
        effectProgress,
      }
    }
    cursor -= step.duration
  }

  return sequence[sequence.length - 1] || { charIndex: 0, effectIndex: -1, effectProgress: 0 }
}

function buildMoveOneShotSequenceFrames({
  charFrameCount,
  effectFrameCount,
  frameHold = SIM_MOVE_CHAR_FRAME_HOLD,
  charLastFrameHold = SIM_MOVE_CHAR_LAST_FRAME_HOLD,
  effectFrameHold = SIM_MOVE_EFFECT_FRAME_HOLD,
  effectLastFrameHold = SIM_MOVE_EFFECT_LAST_FRAME_HOLD,
}) {
  return buildMovePlaybackSequenceFrames({
    charFrameCount,
    effectFrameCount,
    frameHold,
    charLastFrameHold,
    effectFrameHold,
    effectLastFrameHold,
    loopPauseFrames: 0,
  })
}

function getOneShotPlaybackStepAtFrame(localFrame, charFrameCount, effectFrameCount, options = {}) {
  const sequence = buildMoveOneShotSequenceFrames({
    charFrameCount,
    effectFrameCount,
    ...options,
  })
  let cursor = Math.max(0, localFrame || 0)

  for (const step of sequence) {
    if (cursor < step.duration) {
      const effectProgress =
        effectFrameCount > 1 && step.effectIndex >= 0
          ? step.effectIndex / Math.max(1, effectFrameCount - 1)
          : step.effectIndex >= 0
          ? 1
          : 0

      return {
        ...step,
        effectProgress,
        done: false,
      }
    }
    cursor -= step.duration
  }

  const last = sequence[sequence.length - 1] || {
    charIndex: Math.max(0, (charFrameCount || 1) - 1),
    effectIndex: -1,
    duration: 1,
  }

  return {
    ...last,
    charIndex: Math.max(0, (charFrameCount || 1) - 1),
    effectIndex: -1,
    effectProgress: 1,
    done: true,
  }
}

function getOneShotMoveDuration(charFrameCount, effectFrameCount, options = {}) {
  return buildMoveOneShotSequenceFrames({
    charFrameCount,
    effectFrameCount,
    ...options,
  }).reduce((sum, step) => sum + step.duration, 0)
}

function pickOneShotMoveCharacterFrame(frames, localFrame, fallbackImg) {
  const list = Array.isArray(frames) && frames.length ? frames : [fallbackImg]
  const step = getOneShotPlaybackStepAtFrame(localFrame, list.length, 0)
  return list[Math.min(step.charIndex, list.length - 1)] || fallbackImg
}

function pickOneShotMoveEffectFrame(frames, localFrame, fallbackImg) {
  const list = Array.isArray(frames) && frames.length ? frames : [fallbackImg]
  const step = getOneShotPlaybackStepAtFrame(localFrame, 4, list.length)
  if (step.effectIndex < 0 && step.done) return null
  const idx = step.effectIndex >= 0 ? step.effectIndex : 0
  return list[Math.min(idx, list.length - 1)] || fallbackImg
}

function pickMoveCharacterFrame(frames, localFrame, fallbackImg) {
  const list = Array.isArray(frames) && frames.length ? frames : [fallbackImg]
  const step = getPlaybackStepAtFrame(localFrame, list.length, 0, {
    loopPauseFrames: 0,
  })
  return list[Math.min(step.charIndex, list.length - 1)] || fallbackImg
}

function pickMoveEffectFrame(frames, localFrame, fallbackImg) {
  const list = Array.isArray(frames) && frames.length ? frames : [fallbackImg]
  const step = getPlaybackStepAtFrame(localFrame, 4, list.length, {
    loopPauseFrames: 0,
  })
  const idx = step.effectIndex >= 0 ? step.effectIndex : 0
  return list[Math.min(idx, list.length - 1)] || fallbackImg
}

async function overlayMovePanelAnimation({
  panel,
  moves = [],
  characterFrameSets = [],
  effectFrameSets = [],
  frameIndex = 0,
  typeIcons = null,
}) {
  const panelW = panel.bitmap.width
  const panelH = panel.bitmap.height
  const gapX = 16
  const innerPad = 10
  const count = Math.min(
    3,
    Array.isArray(moves) ? moves.length : 0,
    Array.isArray(characterFrameSets) ? characterFrameSets.length : 0
  )

  if (!count) return panel

  const tileW = Math.floor((panelW - gapX * (count + 1)) / count)
  const tileH = panelH - innerPad * 2

  for (let i = 0; i < count; i += 1) {
    const move = moves[i] || {}
    const layout = getMovePreviewLayout(move.type)
    const t = {
      x: gapX * (i + 1) + tileW * i,
      y: innerPad,
      w: tileW,
      h: tileH,
    }

    const imgPadTop = 8
    const imgSidePad = 8
    const reservedHForText =
      28 + 8 +
      24 + 8 +
      22 + 8 +
      22 + 8 +
      22 + 8 +
      40

    const imgMaxH = Math.max(
      24,
      Math.min(t.h * 0.48, t.h - reservedHForText)
    )

    const clearW = t.w - imgSidePad * 2
    const clearH = Math.round(imgMaxH)
    const clear = new Jimp(clearW, clearH, Jimp.cssColorToHex('#100b08'))
    clear.opacity(0.92)
    panel.composite(clear, t.x + imgSidePad, t.y + imgPadTop)

    const charFrames = Array.isArray(characterFrameSets[i]) ? characterFrameSets[i] : []
    const effectFrames = Array.isArray(effectFrameSets[i]) ? effectFrameSets[i] : []

    const step = getPlaybackStepAtFrame(
      frameIndex,
      Math.max(1, charFrames.length),
      effectFrames.length
    )

    const charImg =
      charFrames[Math.min(step.charIndex, Math.max(0, charFrames.length - 1))]
    if (charImg) {
      const charScale = Math.min(
        clearW / charImg.bitmap.width,
        clearH / charImg.bitmap.height
      )
      const charW = Math.max(1, Math.round(charImg.bitmap.width * charScale))
      const charH = Math.max(1, Math.round(charImg.bitmap.height * charScale))
      let charX = t.x + imgSidePad + Math.round((clearW - charW) / 2)
      let charY = t.y + imgPadTop + Math.round(clearH - charH)

      if (layout === 'projectile') {
        charX = t.x + imgSidePad + 4
      } else if (layout === 'melee') {
        const progress = Math.min(step.charIndex, 3) / 3
        charX = t.x + imgSidePad + 4 + Math.round(progress * 16)
      }

      panel.composite(
        charImg.clone().resize(charW, charH, Jimp.RESIZE_BILINEAR),
        charX,
        charY
      )

      const effectIndex = step.effectIndex
      const effectImg =
        effectIndex >= 0
          ? effectFrames[Math.min(effectIndex, Math.max(0, effectFrames.length - 1))]
          : null

      if (effectImg) {
        const effectScale = Math.min(
          (clearW * (layout === 'buff' ? 0.34 : 0.46)) / effectImg.bitmap.width,
          (clearH * (layout === 'buff' ? 0.34 : 0.46)) / effectImg.bitmap.height
        )
        const effW = Math.max(1, Math.round(effectImg.bitmap.width * effectScale))
        const effH = Math.max(1, Math.round(effectImg.bitmap.height * effectScale))
        let effX = charX + charW
        let effY = charY + Math.round(charH * 0.45) - Math.round(effH / 2)

        if (layout === 'buff') {
          effX = charX + Math.round(charW / 2) - Math.round(effW / 2)
          effY = charY - effH - 10 - Math.round(step.effectProgress * 20)
        } else {
          effX = charX + charW - Math.round(effW * 0.15) + Math.round(step.effectProgress * 46)
        }

        effX = clamp(effX, t.x + imgSidePad, t.x + imgSidePad + clearW - effW)
        effY = clamp(effY, t.y + imgPadTop, t.y + imgPadTop + clearH - effH)

        panel.composite(
          effectImg.clone().resize(effW, effH, Jimp.RESIZE_BILINEAR),
          effX,
          effY
        )
      }
    }
  }

  return panel
}

async function downloadImageSequence(urls, outDir, prefix) {
  ensureDir(outDir)
  const paths = []

  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i]
    if (!url) continue

    const outPath = path.join(outDir, `${prefix}_${String(i).padStart(2, '0')}.png`)
    const img = await Jimp.read(url)
    await img.writeAsync(outPath)
    paths.push(outPath)
  }

  return paths
}

async function readAndScaleFrameSequence(paths, targetH) {
  const frames = []

  for (const p of Array.isArray(paths) ? paths : []) {
    try {
      const img = await Jimp.read(p)
      const scaled = img.resize(
        Math.round(img.bitmap.width * (targetH / img.bitmap.height)),
        targetH
      )
      frames.push(scaled)
    } catch (err) {
      console.warn('Failed to load animation frame:', p, err?.message || err)
    }
  }

  return frames
}

function pickAnimationFrame(frames, frameIndex, fallbackImg) {
  if (Array.isArray(frames) && frames.length) {
    return frames[Math.abs(frameIndex || 0) % frames.length]
  }
  return fallbackImg
}


async function loadEffectIcons(
  effectsDirRoot = path.resolve('./effects') // folder with <effectName>.png
) {
  const result = {}
  if (!fs.existsSync(effectsDirRoot)) return result
  const files = await fsp.readdir(effectsDirRoot).catch(() => [])
  for (const f of files) {
    if (!f.toLowerCase().endsWith('.png')) continue
    const base = path.basename(f, path.extname(f))
    const key = base.toLowerCase()
    try {
      result[key] = await Jimp.read(path.join(effectsDirRoot, f))
    } catch {
      result[key] = null
    }
  }
  return result
}

let EFFECT_FONT_16 = null
async function getEffectFont16() {
  if (!EFFECT_FONT_16) {
    EFFECT_FONT_16 = await loadFontBuiltin(16, 'white')
  }
  return EFFECT_FONT_16
}

function drawHorizontalLine(panel, x1, x2, y, colorHex) {
  for (let x = x1; x <= x2; x++) panel.setPixelColor(colorHex, x, y)
}
async function drawTypeChip(panel, x, y, w, h, type, typeIconsMap) {
  const color = TYPE_COLORS[type] || '#888'
  const chip = new Jimp(w, h, Jimp.cssColorToHex(color))
  chip.opacity(0.92)
  panel.composite(chip, x, y)

  let leftTextX = x + 10
  const tIcon = typeIconsMap?.[type] || null
  if (tIcon) {
    const iconH = Math.min(h - 8, 28)
    const icon = tIcon
      .clone()
      .contain(iconH, iconH, Jimp.RESIZE_BILINEAR)
    const iy = y + Math.round((h - iconH) / 2)
    const ix = x + 8
    panel.composite(icon, ix, iy)
    leftTextX = ix + iconH + 8
  }
  return { leftTextX }
}
function drawStatBar(
  panel,
  x,
  y,
  width,
  height,
  pct,
  bgColor = '#332417',
  fillColor = '#E1B864'
) {
  const bgBar = new Jimp(width, height, Jimp.cssColorToHex(bgColor))
  bgBar.opacity(0.95)
  panel.composite(bgBar, x, y)
  const fillW = Math.max(6, Math.round(width * clamp(pct, 0, 1)))
  const fill = new Jimp(
    fillW,
    height,
    Jimp.cssColorToHex(fillColor)
  )
  panel.composite(fill, x, y)
}

function drawHealthBar(
  frame,
  centerX,
  aboveY,
  width,
  height,
  hp,
  maxHp
) {
  const barW = width,
    barH = height
  const x = Math.round(centerX - barW / 2)
  const y = Math.max(0, aboveY - barH - 8)
  const bg = new Jimp(
    barW,
    barH,
    Jimp.cssColorToHex('#2b1c14')
  )
  bg.opacity(0.8)
  frame.composite(bg, x, y)
  const pct = clamp(hp / Math.max(1, maxHp), 0, 1)
  const fillW = Math.max(1, Math.round(barW * pct))
  const fill = new Jimp(
    fillW,
    barH,
    Jimp.cssColorToHex('#E1B864')
  )
  frame.composite(fill, x, y)
}

/* ===== Cooldown bars (white) ===== */
function drawCooldownBar(
  frame,
  centerX,
  aboveY,
  width,
  height,
  cdRemaining,
  cdTotal
) {
  if (!cdTotal || cdTotal <= 0) return
  const barW = width,
    barH = height
  const x = Math.round(centerX - barW / 2)
  const y = Math.max(0, aboveY - barH - 4)
  const bg = new Jimp(barW, barH, Jimp.cssColorToHex('#ffffff'))
  bg.opacity(0.25)
  frame.composite(bg, x, y)
  const pct = clamp(cdRemaining / cdTotal, 0, 1)
  const fillW = Math.max(1, Math.round(barW * pct))
  const fill = new Jimp(
    fillW,
    barH,
    Jimp.cssColorToHex('#ffffff')
  )
  frame.composite(fill, x, y)
}

/* ===== Effect icons + totals above health bars ===== */
/* ===== Effect icons + totals above health bars ===== */
async function drawEffectSummaryRow({
  frame,
  centerX,
  barTopY,
  effects,
  effectIcons,
}) {
  const active = Object.entries(effects || {})
    .filter(([, v]) => Number(v) > 0)
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))

  if (!active.length) return

  const ICON = 45
  const GAP = 11
  const ROW_GAP = 9
  const EFFECTS_UP_OFFSET_PX = 10
  const MAX_PER_ROW = 3
  const font = await loadFontBuiltin(16, 'white')
  const fontBlack = await loadFontBuiltin(16, 'black')

  const rows = []
  for (let i = 0; i < active.length; i += MAX_PER_ROW) {
    rows.push(active.slice(i, i + MAX_PER_ROW))
  }

  // Row 0 is the original row directly above the health bar.
  // Extra effects stack upward in additional rows above it.
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]
    const rowW = row.length * ICON + (row.length - 1) * GAP
    const startX = Math.round(centerX - rowW / 2)
    const rowY = Math.max(
      0,
      Math.round(
        barTopY - ICON - 4 - EFFECTS_UP_OFFSET_PX - rowIndex * (ICON + ROW_GAP)
      )
    )

    for (let i = 0; i < row.length; i += 1) {
      const [name, value] = row[i]
      const x = startX + i * (ICON + GAP)

      const icon = effectIcons?.[name]
      const iconBg = new Jimp(ICON, ICON, Jimp.cssColorToHex('#24160c'))
      frame.composite(iconBg, x, rowY)

      if (icon) {
        const img = icon
          .clone()
          .contain(ICON, ICON, Jimp.RESIZE_BILINEAR)
        img.opacity(1)
        frame.composite(img, x, rowY)
      } else {
        const ph = new Jimp(ICON, ICON, Jimp.cssColorToHex('#24160c'))
        frame.composite(ph, x, rowY)
      }

      const txt = String(Math.round(Number(value || 0)))
      const tx = x + ICON - 12
      const ty = rowY + ICON - 21
      frame.print(fontBlack, tx + 1, ty + 1, txt)
      frame.print(font, tx, ty, txt)
    }
  }
}

/* ===== MINI TOP-OF-FRAME STATS PANELS ===== */

let MINI_STATS_FONT_16 = null
async function getMiniStatsFont16() {
  if (!MINI_STATS_FONT_16) {
    MINI_STATS_FONT_16 = await loadFontBuiltin(16, 'white')
  }
  return MINI_STATS_FONT_16
}


/**
 * Draw a compact stat panel (about half-size of the main stat board)
 * near the top of the frame for one side.
 *
 * - side: 'A' or 'B' (controls left/right placement)
 * - stats: { health, strength, dexterity, intelligence, resist, speed }
 *
 * NOTE: no statIcons dependency – just text + bars.
 */
async function drawMiniStatsPanel({
  frame,
  side,          // 'A' or 'B'
  marginX = 16,  // distance from left/right edge
  marginY = 16,  // distance from top
  stats,
}) {
  if (!stats) return

  const keys = [
    'health',
    'strength',
    'dexterity',
    'intelligence',
    'resist',
    'speed',
  ]

  const panelW = 230
  const topPad = 4
  const bottomPad = 4
  const rowH = 18
  const barH = 12
  const labelAreaW = 52
  const valueAreaW = 40
  const innerPadX = 8
  const barW = panelW - innerPadX * 2 - labelAreaW - valueAreaW

  const panelH = topPad + bottomPad + keys.length * rowH

  const panel = new Jimp(panelW, panelH, 0x00000000)
  const card = new Jimp(panelW, panelH, Jimp.cssColorToHex('#0e0a08'))
  card.opacity(0.8)
  panel.composite(card, 0, 0)

  const GOLD_HEX = Jimp.cssColorToHex('rgba(225,184,100,0.85)')

  // Border (thin)
  for (let x = 0; x < panelW; x++) {
    panel.setPixelColor(GOLD_HEX, x, 0)
    panel.setPixelColor(GOLD_HEX, x, panelH - 1)
  }
  for (let y = 0; y < panelH; y++) {
    panel.setPixelColor(GOLD_HEX, 0, y)
    panel.setPixelColor(GOLD_HEX, panelW - 1, y)
  }

  const font = await getMiniStatsFont16()
  let y = topPad

  for (const k of keys) {
    const bounds = STAT_BOUNDS[k]
    if (!bounds) continue
    const { label, min, max } = bounds
    let v = Number(stats[k] ?? 0)
    if (!Number.isFinite(v)) v = 0

    const vForPct = clamp(v, min, max)
    const pct = (vForPct - min) / Math.max(1, max - min)

    // Label
    const labelX = innerPadX
    panel.print(font, labelX, y - 1, label)

    // Bar
    const barX = innerPadX + labelAreaW
    drawStatBar(panel, barX, y - 1, barW, barH, pct)

    // Value
    const valX = barX + barW + 4
    panel.print(font, valX, y - 2, String(Math.round(v)))

    y += rowH
  }

  const frameW = frame.bitmap.width
  const x =
    side === 'A'
      ? marginX
      : frameW - panelW - marginX

  frame.composite(panel, x, marginY)
}




/* ===================== STATS PANEL (centered) ===================== */
async function renderStatsPanel({
  outPath,
  creatureName,
  stats,
  bgW,
  bgH,
  statIcons,
  effectIcons = {},
  charEffects = {},
  itemEffectLines = [],
}) {
  const nonZeroEffects = effectKeys
    .map((key) => ({
      key,
      value: safeNumber(charEffects?.[key], 0),
    }))
    .filter((entry) => entry.value !== 0)

  const hasEffects = nonZeroEffects.length > 0
  const hasItems = Array.isArray(itemEffectLines) && itemEffectLines.length > 0

  const panelW = Math.max(320, bgW - PANEL_SIDE_MARGIN_PX * 2)
  const panelH = Math.round(
    bgH * (hasItems || hasEffects ? 0.44 : 0.3)
  )
  const panel = new Jimp(panelW, panelH, 0x00000000)

  const card = new Jimp(
    panelW,
    panelH,
    Jimp.cssColorToHex('#0e0a08')
  )
  card.opacity(0.78)
  panel.composite(card, 0, 0)

  const GOLD_HEX = Jimp.cssColorToHex('rgba(225,184,100,0.78)')
  const border = 3
  for (let x = 0; x < panelW; x++) {
    for (let b = 0; b < border; b++) {
      panel.setPixelColor(GOLD_HEX, x, b)
      panel.setPixelColor(GOLD_HEX, x, panelH - 1 - b)
    }
  }
  for (let y = 0; y < panelH; y++) {
    for (let b = 0; b < border; b++) {
      panel.setPixelColor(GOLD_HEX, b, y)
      panel.setPixelColor(GOLD_HEX, panelW - 1 - b, y)
    }
  }

  const fontTitle = await loadFontBuiltin(32, 'white')
  const font32 = await loadFontBuiltin(32, 'white')
  const font16 = await loadFontBuiltin(16, 'white')

  const leftX = 18
  const topPad = 12

  panel.print(fontTitle, leftX, topPad, creatureName)

  let y = topPad + 36
  drawHorizontalLine(panel, leftX, panelW - leftX, y, GOLD_HEX)
  y += 12

  const nameAreaW = 200
  const rightValuePad = 90
  const barW = panelW - leftX * 2 - nameAreaW - rightValuePad
  const barH = 22
  const rowH = 40

  const keys = [
    'health',
    'strength',
    'dexterity',
    'intelligence',
    'resist',
    'speed',
  ]

  for (const k of keys) {
    const bounds = STAT_BOUNDS[k]
    if (!bounds) continue
    const { label, min, max } = bounds
    const v = stats[k]
    const pct = (v - min) / (max - min)

    let labelX = leftX
    if (statIcons?.[k]) {
      const ico = statIcons[k]
        .clone()
        .contain(24, 24, Jimp.RESIZE_BILINEAR)
      panel.composite(
        ico,
        labelX,
        y + Math.round((barH - 24) / 2)
      )
      labelX += 24 + 8
    }
    panel.print(font32, labelX, y - 2, label)

    drawStatBar(panel, leftX + nameAreaW, y - 2, barW, barH, pct)
    panel.print(
      font32,
      leftX + nameAreaW + barW + 10,
      y - 4,
      String(v)
    )
    y += rowH
  }

  if (hasEffects) {
    y += 2
    drawHorizontalLine(panel, leftX, panelW - leftX, y, GOLD_HEX)
    y += 8

    panel.print(font16, leftX, y, 'EFFECTS')
    y += 22

    const ICON_SIZE = 28
    const itemW = 104
    const itemH = 34
    const gap = 8
    const usableW = panelW - leftX * 2
    const perRow = Math.max(1, Math.floor((usableW + gap) / (itemW + gap)))
    const reservedForItems = hasItems ? 98 : 8
    const maxRows = Math.max(
      1,
      Math.floor((panelH - y - reservedForItems) / itemH)
    )
    const maxEffects = Math.max(perRow, perRow * maxRows)

    nonZeroEffects.slice(0, maxEffects).forEach((entry, index) => {
      const col = index % perRow
      const row = Math.floor(index / perRow)
      const x = leftX + col * (itemW + gap)
      const yy = y + row * itemH
      const iconSrc = effectIcons?.[entry.key] || null

      if (iconSrc) {
        const icon = iconSrc
          .clone()
          .contain(ICON_SIZE, ICON_SIZE, Jimp.RESIZE_BILINEAR)
        panel.composite(icon, x, yy)
      } else {
        const ph = new Jimp(ICON_SIZE, ICON_SIZE, Jimp.cssColorToHex('#332417'))
        ph.opacity(0.85)
        panel.composite(ph, x, yy)
      }

      panel.print(
        font16,
        x + ICON_SIZE + 6,
        yy + 6,
        `${entry.key} ${entry.value}`
      )
    })

    const shownRows = Math.ceil(Math.min(nonZeroEffects.length, maxEffects) / perRow)
    y += Math.max(itemH, shownRows * itemH) + 6
  }

  if (hasItems) {
    y += 8
    drawHorizontalLine(panel, leftX, panelW - leftX, y, GOLD_HEX)
    y += 8

    panel.print(font16, leftX, y, 'EQUIPPED ITEMS')
    y += 20

    const maxItemLines = Math.max(2, Math.floor((panelH - y - 8) / 18))
    for (let i = 0; i < Math.min(itemEffectLines.length, maxItemLines); i++) {
      const prefix = itemEffectLines.length > maxItemLines && i === maxItemLines - 1
        ? `+${itemEffectLines.length - i} more item effects`
        : itemEffectLines[i]
      panel.print(font16, leftX, y, String(prefix).slice(0, 96))
      y += 18
    }
  }

  await panel.writeAsync(outPath)
  return { path: outPath, width: panelW, height: panelH }
}


const roundToTenth = (x) => Math.round(x * 10) / 10

  function getEffectiveSpeed(baseStats, effectTotals, arenaMap = null) {
    // Use your existing effect-aware stat computation
    const adj = computeAttackerAdjustedStats(baseStats, effectTotals, arenaMap)
    const s = Number(adj?.speed ?? baseStats?.speed ?? 100)
    return Math.max(1, s) // prevent division by 0 / negatives
  }

  function computeEffectiveCooldownSeconds(baseCooldownSeconds, speed) {
    const base = Number(baseCooldownSeconds)
    if (!Number.isFinite(base) || base <= 0) return 0
    return roundToTenth(base * (50 / Math.max(1, Number(speed) || 1)))
  }

/* ===================== MOVE BOARD (bottom) ===================== */
async function renderMoveBoardPanel({
  outPath,
  moves,          // array of move meta (expecting length >= 3)
  moveImgPaths,   // array of image paths or frame-path arrays matching moves
  moveEffectImgPaths = [],
  animationFrameIndex = 0,
  bgW,
  bgH,
  statIcons,
  typeIcons,
  effectIcons,
  stats,
  gainedItemEffects = cloneEmptyGainedEffects(),
}) {
  const panelW = Math.max(320, bgW - PANEL_SIDE_MARGIN_PX * 2)
  const panelH = Math.round(bgH * 0.28)
  const panel = new Jimp(panelW, panelH, 0x00000000)

  const card = new Jimp(
    panelW,
    panelH,
    Jimp.cssColorToHex('#0e0a08')
  )
  card.opacity(0.78)
  panel.composite(card, 0, 0)

  const GOLD_HEX = Jimp.cssColorToHex('rgba(225,184,100,0.78)')
  const border = 3
  for (let x = 0; x < panelW; x++) {
    for (let b = 0; b < border; b++) {
      panel.setPixelColor(GOLD_HEX, x, b)
      panel.setPixelColor(GOLD_HEX, x, panelH - 1 - b)
    }
  }
  for (let y = 0; y < panelH; y++) {
    for (let b = 0; b < border; b++) {
      panel.setPixelColor(GOLD_HEX, b, y)
      panel.setPixelColor(GOLD_HEX, panelW - 1 - b, y)
    }
  }

  const gapX = 16
  const innerPad = 10
  const count = Math.min(
    3,
    Array.isArray(moves) ? moves.length : 0,
    Array.isArray(moveImgPaths) ? moveImgPaths.length : 0
  )

  if (count === 0) {
    await panel.writeAsync(outPath)
    return { path: outPath, width: panelW, height: panelH }
  }

  const tileW = Math.floor((panelW - gapX * (count + 1)) / count)
  const tileH = panelH - innerPad * 2

  const tiles = []
  for (let i = 0; i < count; i++) {
    tiles.push({
      move: moves[i],
      imgPath: moveImgPaths[i],
      x: gapX * (i + 1) + tileW * i,
      y: innerPad,
      w: tileW,
      h: tileH,
    })
  }

  const maxCD = 10

  for (const t of tiles) {
    // Tile border
    for (let x = 0; x < t.w; x++) {
      panel.setPixelColor(GOLD_HEX, t.x + x, t.y)
      panel.setPixelColor(GOLD_HEX, t.x + x, t.y + t.h - 1)
    }
    for (let y = 0; y < t.h; y++) {
      panel.setPixelColor(GOLD_HEX, t.x, y + t.y)
      panel.setPixelColor(GOLD_HEX, t.x + t.w - 1, y + t.y)
    }

    const move = t.move || {}
    const imgPadTop = 8
    const imgSidePad = 8

    // Reserve room for:
    // - name
    // - type chip
    // - POW/ACC/CD rows
    // - effect row (icon + amount)
    const reservedHForText =
      28 + 8 + // name
      24 + 8 + // type chip
      22 + 8 + // POW
      22 + 8 + // ACC
      22 + 8 + // CD
      40       // effect row

    const imgMaxH = Math.max(
      24,
      Math.min(t.h * 0.48, t.h - reservedHForText)
    )

    // Move art.
    // Start-of-battle move cards intentionally show a STATIC preview:
    // the third frame of the move character animation only, with no effect animation.
    try {
      const characterFramePaths = Array.isArray(t.imgPath) ? t.imgPath : [t.imgPath]
      const charPath =
        characterFramePaths[Math.min(2, Math.max(0, characterFramePaths.length - 1))] ||
        characterFramePaths[0]
      const charImg = await Jimp.read(charPath)
      const clearW = t.w - imgSidePad * 2
      const clearH = Math.round(imgMaxH)
      const clear = new Jimp(clearW, clearH, Jimp.cssColorToHex('#100b08'))
      clear.opacity(0.92)
      panel.composite(clear, t.x + imgSidePad, t.y + imgPadTop)

      const scale = Math.min(
        clearW / charImg.bitmap.width,
        clearH / charImg.bitmap.height
      )
      const iw = Math.max(1, Math.round(charImg.bitmap.width * scale))
      const ih = Math.max(1, Math.round(charImg.bitmap.height * scale))
      const ix = t.x + imgSidePad + Math.round((clearW - iw) / 2)
      const iy = t.y + imgPadTop + Math.round(clearH - ih)

      panel.composite(
        charImg.clone().resize(iw, ih, Jimp.RESIZE_BILINEAR),
        ix,
        iy
      )
    } catch {
      const ph = new Jimp(
        t.w - imgSidePad * 2,
        Math.round(imgMaxH),
        Jimp.cssColorToHex('#332417')
      )
      ph.opacity(0.6)
      panel.composite(
        ph,
        t.x + imgSidePad,
        t.y + imgPadTop
      )
    }

    const nameFont = await loadFontBuiltin(16, 'white')

    // Name
    const nameY = t.y + imgPadTop + Math.round(imgMaxH) + 6
    const nameLeftX = t.x + 8
    panel.print(
      nameFont,
      nameLeftX,
      nameY,
      move.name || 'Unknown Move'
    )

    // TYPE CHIP
    const smallFont = await loadFontBuiltin(16, 'white')
    const chipY = nameY + 28 + 8
    const chipH = 24
    const chipW = Math.min(200, t.w - 16)
    const moveType = move.type || 'Normal'
    const chipRes = await drawTypeChip(
      panel,
      t.x + 8,
      chipY,
      chipW,
      chipH,
      moveType,
      typeIcons
    )
    panel.print(
      smallFont,
      chipRes.leftTextX,
      chipY + 4,
      String(moveType).toUpperCase()
    )

    // STAT BARS
    const labelAreaW = 56
    const BAR_SHIFT_RIGHT = 16
    const statBarLeft =
      t.x + 8 + labelAreaW + BAR_SHIFT_RIGHT
    const statBarW =
      t.w - 16 - labelAreaW - BAR_SHIFT_RIGHT - 76
    const statBarH = 20

        // --- POW ---
    let rowY = chipY + chipH + 6
    let labelX = t.x + 8
    if (statIcons?.power) {
      const pIco = statIcons.power
        .clone()
        .contain(18, 18, Jimp.RESIZE_BILINEAR)
      panel.composite(
        pIco,
        labelX,
        rowY + Math.round((statBarH - 18) / 2)
      )
      labelX += 18 + 6
    }
    panel.print(smallFont, labelX, rowY + 2, 'POW')

    // Cap the visual bar at 200 power
    const pMin = 0
    const pMax = 150
    const rawPower = Math.round(getMoveDisplayPower(move, stats))

    const pVal = clamp(rawPower, pMin, pMax)
    const pPct = (pVal - pMin) / Math.max(1, pMax - pMin)

    drawStatBar(
      panel,
      statBarLeft,
      rowY,
      statBarW,
      statBarH,
      pPct
    )

    // Still show the actual numeric power (even if > 200)
    panel.print(
      smallFont,
      statBarLeft + statBarW + 6,
      rowY + 2,
      String(rawPower)
    )


    // --- ACC ---
    rowY += statBarH + 6
    labelX = t.x + 8
    if (statIcons?.accuracy) {
      const aIco = statIcons.accuracy
        .clone()
        .contain(18, 18, Jimp.RESIZE_BILINEAR)
      panel.composite(
        aIco,
        labelX,
        rowY + Math.round((statBarH - 18) / 2)
      )
      labelX += 18 + 6
    }
    panel.print(smallFont, labelX, rowY + 2, 'ACC')
    const aMin = 0,
      aMax = 100
    const aVal = clamp(Number(move.accuracy) + getMoveAccuracyBonusFromGainedEffects(move, gainedItemEffects), 0, 100)
    const aPct = (aVal - aMin) / Math.max(1, aMax - aMin)
    drawStatBar(
      panel,
      statBarLeft,
      rowY,
      statBarW,
      statBarH,
      aPct
    )
    panel.print(
      smallFont,
      statBarLeft + statBarW + 6,
      rowY + 2,
      `${aVal}%`
    )

    // --- CD ---
    rowY += statBarH + 6
    labelX = t.x + 8
    if (statIcons?.cooldown) {
      const cIco = statIcons.cooldown
        .clone()
        .contain(18, 18, Jimp.RESIZE_BILINEAR)
      panel.composite(
        cIco,
        labelX,
        rowY + Math.round((statBarH - 18) / 2)
      )
      labelX += 18 + 6
    }
    panel.print(smallFont, labelX, rowY + 2, 'CD')

    // Base cooldown from move meta
    const baseCdVal = Number(move.cooldown_seconds) || 0

    // Effective cooldown from speed (renderMoveBoardPanel uses "stats" passed in)
    const sp = Math.max(1, Number(stats?.speed) || 100)
    const effCdVal = computeEffectiveCooldownSeconds(baseCdVal, sp)

    const cdPct = effCdVal / Math.max(0.8, maxCD)

    drawStatBar(
      panel,
      statBarLeft,
      rowY,
      statBarW,
      statBarH,
      cdPct,
      '#2a2018',
      '#ffffff'
    )

    panel.print(
      smallFont,
      statBarLeft + statBarW + 6,
      rowY + 2,
      `${effCdVal.toFixed(1)}s`
    )



    // --- EFFECT ICON + POTENCY ---
    rowY += statBarH + 6
    const effectName = String(
      move.effect_name || move.effect || ''
    ).trim()
    if (effectName) {
      const effKey = effectName.toLowerCase()
      let pot = getMoveEffectBasePotency(move)

      const explicitMoveKind = getExplicitMoveKind(move)
      const isBuff = explicitMoveKind === 'buff'
      const isCurse = explicitMoveKind === 'curse'

      // Display the same rule used by the battle logic:
      // damage moves show the character's effect amount directly;
      // curse and buff moves show twice the character's effect amount.
      if (isBuff || isCurse) {
        pot *= 2
      }

      if (pot !== 0) {
        const effFont = await loadFontBuiltin(16, 'white')
        const ICON_SIZE = 36 // bigger icons on move board
        const effY = rowY + 2
        const effX = t.x + 8
        const iconSrc = effectIcons?.[effKey] || null

        if (iconSrc) {
          const icon = iconSrc
            .clone()
            .contain(ICON_SIZE, ICON_SIZE, Jimp.RESIZE_BILINEAR)
          panel.composite(icon, effX, effY)
        }

        const textX = effX + ICON_SIZE + 6
        const label = `${effectName} ${
          pot > 0 ? '+' : ''
        }${pot}`
        panel.print(
          effFont,
          textX,
          effY + 8,
          label
        )
      }
    }
  }


  await panel.writeAsync(outPath)
  return { path: outPath, width: panelW, height: panelH }
}


/* ===================== B-SIDE: FLIP SPRITES FOR CREATURE B ===================== */
async function flipAllPngsHorizontally(dir) {
  const files = (await fsp.readdir(dir)).filter((f) =>
    f.toLowerCase().endsWith('.png')
  )
  for (const f of files) {
    const p = path.join(dir, f)
    const img = await Jimp.read(p)
    img.mirror(true, false)
    await img.writeAsync(p)
  }
}

/* ===================== AUDIO TIMELINE ===================== */
function makeAudioTimeline() {
  return {
    cues: [],
    push(kind, t) {
      this.cues.push({ kind, t: Math.max(0, t) })
    },
  }
}

/* ===================== AUDIO FILES & MUX HELPERS ===================== */

const AUDIO_ROOT = path.resolve('./audio')

const AUDIO_EXT_RE = /\.(mp3|wav|ogg)$/i

const AUDIO_FOLDERS = {
  battleMusic: 'battleMusic',
  damageOverTime: 'damageOverTime',
  death: 'death',
  hit: 'hit',
  miss: 'miss',
}

async function listAudioFiles(subdir) {
  const dir = path.join(AUDIO_ROOT, subdir)
  const entries = await fsp.readdir(dir).catch(() => [])
  return entries
    .filter((f) => AUDIO_EXT_RE.test(f))
    .map((f) => path.join(dir, f))
}

function pickRandomFile(files) {
  if (!files || !files.length) return null
  const idx = Math.floor(Math.random() * files.length)
  return files[idx]
}

/**
 * Build a looped + faded battle music track, then mux with SFX + video.
 *
 * audioTimeline.cues contains:
 *  - kind: 'hit'   → ./audio/hit
 *  - kind: 'miss'  → ./audio/miss
 *  - kind: 'dot'   → ./audio/damageOverTime  (bleed/burn/poison/etc DOT)
 *  - kind: 'death' → ./audio/death
 *
 * All files may be .mp3, .wav, or .ogg (ffmpeg handles them all).
 */
async function buildAndMuxAudio({
  videoPath,
  audioTimeline,
  outDir,
  durationSec,
}) {
  const cues = Array.isArray(audioTimeline?.cues)
    ? audioTimeline.cues
    : []

  // --- Load pools for each SFX type ---
  const [battleMusicFiles, hitFiles, missFiles, dotFiles, deathFiles] =
    await Promise.all([
      listAudioFiles(AUDIO_FOLDERS.battleMusic),
      listAudioFiles(AUDIO_FOLDERS.hit),
      listAudioFiles(AUDIO_FOLDERS.miss),
      listAudioFiles(AUDIO_FOLDERS.damageOverTime),
      listAudioFiles(AUDIO_FOLDERS.death),
    ])

  if (!battleMusicFiles.length) {
    console.warn(
      '⚠️ No battle music found in ./audio/battleMusic – skipping audio mux.'
    )
    return videoPath
  }

  const bgmSrc = pickRandomFile(battleMusicFiles)
  const bgmLoopedPath = path.join(outDir, 'bgm_looped_raw.wav') // now raw loop
  const finalVideoPath = path.join(
    outDir,
    'character_duel_with_audio.mp4'
  )

  const fadeInSec = 1.5

  // Fade out starts halfway through and goes until the very end
  const fadeOutStart = durationSec / 2
  const fadeOutSec = durationSec - fadeOutStart // i.e., also durationSec / 2

  // --- Step 1: build LOOPED BGM (NO fades yet) ---
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(bgmSrc)
      .inputOptions(['-stream_loop', '-1']) // loop until duration ends
      .noVideo()
      .audioCodec('pcm_s16le') // wav
      .duration(durationSec)
      .output(bgmLoopedPath)
      .on('end', resolve)
      .on('error', reject)
      .run()
  })

  // --- Build list of SFX inputs based on cues ---
  const sfxInputs = []

  for (const cue of cues) {
    if (!Number.isFinite(cue.t)) continue
    const tMs = Math.max(0, Math.round(cue.t * 1000))

    let pool = null
    if (cue.kind === 'hit') pool = hitFiles
    else if (cue.kind === 'miss') pool = missFiles
    else if (cue.kind === 'dot') pool = dotFiles
    else if (cue.kind === 'death') pool = deathFiles
    else continue // ignore emoteA / emoteB / anything else

    if (!pool || !pool.length) continue
    const filePath = pickRandomFile(pool)
    if (!filePath) continue

    sfxInputs.push({ path: filePath, delayMs: tMs })
  }

  // --- Step 2: Video + (BGM + SFX), then global fade in/out ---
  await new Promise((resolve, reject) => {
    const cmd = ffmpeg()
      .input(videoPath)      // 0: video
      .input(bgmLoopedPath)  // 1: raw looped bgm (no fades yet)

    // 2..N: individual SFX inputs
    sfxInputs.forEach((s) => cmd.input(s.path))

    const filterLines = []

    if (sfxInputs.length === 0) {
      // Only BGM: set level + apply fades directly
      filterLines.push(
        `[1:a]volume=0.75,` +
        `afade=t=in:st=0:d=${fadeInSec},` +
        `afade=t=out:st=${fadeOutStart}:d=${fadeOutSec}[aout]`
      )
    } else {
      // 1) Base BGM level
      filterLines.push(`[1:a]volume=0.75[bgm]`)

      // 2) Delay + boost each SFX
      sfxInputs.forEach((s, idx) => {
        const inputIndex = 2 + idx
        const delayedLabel = `s${idx}`
        const delay = Math.max(0, s.delayMs | 0)

        filterLines.push(
          `[${inputIndex}:a]adelay=${delay}|${delay},volume=1.25[${delayedLabel}]`
        )
      })

      // 3) Mix BGM + all SFX into [mix]
      const mixInputs = ['bgm', ...sfxInputs.map((_, idx) => `s${idx}`)]
      const mixGain = Math.max(1, Math.min(mixInputs.length, 32))
      const mixLine =
        mixInputs.map((l) => `[${l}]`).join('') +
        `amix=inputs=${mixInputs.length}:dropout_transition=0[mix]`
      filterLines.push(mixLine)

      // 4) Apply fade-in + fade-out to the FINAL mix
      filterLines.push(
        `[mix]volume=${mixGain},alimiter=limit=0.95,` +
        `afade=t=in:st=0:d=${fadeInSec},` +
        `afade=t=out:st=${fadeOutStart}:d=${fadeOutSec}[aout]`
      )
    }

    const filterComplex = filterLines.join('; ')

    cmd
      .complexFilter(filterComplex)
      .outputOptions([
        '-map',
        '0:v:0',  // video from input 0
        '-map',
        '[aout]', // final faded mix
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-shortest',
      ])
      .output(finalVideoPath)
      .on('end', resolve)
      .on('error', reject)
      .run()
  })

  return finalVideoPath
}






/* ===================== BLINK/POPUPS ===================== */
async function blinkTargetFrames({
  frames,
  bg,
  axX,
  aY,
  A_sprite,
  bxX,
  bY,
  B_sprite,
  targetSide,
  outFramesDir,
  framesSoFar,
  hpA,
  maxHpA,
  hpB,
  maxHpB,
  barW = HEALTH_BAR_W,
  barH = HEALTH_BAR_H,
  effectIcons,
  effectTotalsFont,
  A_effectTotals,
  B_effectTotals,
  cdA = 0,
  totalCdA = 1,
  cdB = 0,
  totalCdB = 1,

  // ✅ NEW: base stats needed to compute effect-adjusted mini panels
  aStats,
  bStats,
}) {
  let fIdx = framesSoFar

  for (let i = 0; i < frames; i++) {
    const frame = bg.clone()
    const visible = Math.floor(i / 3) % 2 === 0

    if (targetSide === 'A') {
      frame.composite(B_sprite, bxX, bY)
      if (visible) frame.composite(A_sprite, axX, aY)
    } else {
      frame.composite(A_sprite, axX, aY)
      if (visible) frame.composite(B_sprite, bxX, bY)
    }

    // Health bars
    drawHealthBar(
      frame,
      axX + Math.floor(A_sprite.bitmap.width / 2),
      aY,
      barW,
      barH,
      hpA,
      maxHpA
    )
    drawHealthBar(
      frame,
      bxX + Math.floor(B_sprite.bitmap.width / 2),
      bY,
      barW,
      barH,
      hpB,
      maxHpB
    )

    // Cooldown bars (both sides)
    drawCooldownBar(
      frame,
      axX + Math.floor(A_sprite.bitmap.width / 2),
      aY - 18,
      COOLDOWN_BAR_W,
      COOLDOWN_BAR_H,
      cdA,
      totalCdA
    )
    drawCooldownBar(
      frame,
      bxX + Math.floor(B_sprite.bitmap.width / 2),
      bY - 18,
      COOLDOWN_BAR_W,
      COOLDOWN_BAR_H,
      cdB,
      totalCdB
    )

    // Effect totals (above HP)
    const barYA = Math.max(0, aY - barH - 8)
    const barYB = Math.max(0, bY - barH - 8)
    const centerAx = axX + Math.floor(A_sprite.bitmap.width / 2)
    const centerBx = bxX + Math.floor(B_sprite.bitmap.width / 2)

    await drawEffectSummaryRow({
      frame,
      centerX: centerAx,
      barTopY: barYA,
      effects: A_effectTotals,
      effectIcons,
    })
    await drawEffectSummaryRow({
      frame,
      centerX: centerBx,
      barTopY: barYB,
      effects: B_effectTotals,
      effectIcons,
    })

    // ✅ NEW: MINI LIVE STATS PANELS during blink
    if (aStats && bStats) {
      // Attacker-style adjustments from effects
      const adjA = computeAttackerAdjustedStats(aStats, A_effectTotals)
      const adjB = computeAttackerAdjustedStats(bStats, B_effectTotals)

      // Defender-style resist from effects
      const defA = computeDefenderAdjustedStats(aStats, A_effectTotals)
      const defB = computeDefenderAdjustedStats(bStats, B_effectTotals)

      const miniStatsA = {
        health: hpA,
        strength: Math.round(adjA.strength ?? aStats.strength ?? 0),
        dexterity: Math.round(adjA.dexterity ?? aStats.dexterity ?? 0),
        intelligence: Math.round(adjA.intelligence ?? aStats.intelligence ?? 0),
        resist: Math.round(defA.resist ?? aStats.resist ?? 0),
        speed: Math.round(adjA.speed ?? aStats.speed ?? 0),
      }

      const miniStatsB = {
        health: hpB,
        strength: Math.round(adjB.strength ?? bStats.strength ?? 0),
        dexterity: Math.round(adjB.dexterity ?? bStats.dexterity ?? 0),
        intelligence: Math.round(adjB.intelligence ?? bStats.intelligence ?? 0),
        resist: Math.round(defB.resist ?? bStats.resist ?? 0),
        speed: Math.round(adjB.speed ?? bStats.speed ?? 0),
      }

      await drawMiniStatsPanel({
        frame,
        side: 'A',
        marginX: 16,
        marginY: 16,
        stats: miniStatsA,
      })
      await drawMiniStatsPanel({
        frame,
        side: 'B',
        marginX: 16,
        marginY: 16,
        stats: miniStatsB,
      })
    }

    await saveFrame(outFramesDir, fIdx++, frame)
  }

  return fIdx
}



async function animateHealthDrop({
  bg,
  axX,
  aY,
  A_sprite,
  bxX,
  bY,
  B_sprite,
  outFramesDir,
  framesSoFar,
  fromHp,
  toHp,
  maxHp,
  side,
  otherHp,
  otherMaxHp,
  barW = HEALTH_BAR_W,
  barH = HEALTH_BAR_H,
  frames = 18,
  popupText,
  popupTextScale = 1,
  popupStartX,
  popupStartY,
  popupRisePx = 40,
  effectIcons,
  effectTotalsFont,
  A_effectTotals,
  B_effectTotals,
  cdA = 0,
  totalCdA = 1,
  cdB = 0,
  totalCdB = 1,
  aStats,
  bStats,
}) {
  let fIdx = framesSoFar
  const popupImage = popupText
    ? await renderOutlinedPopupText(popupText, popupTextScale)
    : null

  for (let i = 0; i < frames; i++) {
    const t = i / (frames - 1)
    const hpNow = Math.round(fromHp + (toHp - fromHp) * t)
    const frame = bg.clone()
    frame.composite(A_sprite, axX, aY)
    frame.composite(B_sprite, bxX, bY)


    if (side === 'A') {
      drawHealthBar(
        frame,
        axX + Math.floor(A_sprite.bitmap.width / 2),
        aY,
        barW,
        barH,
        hpNow,
        maxHp
      )
      drawHealthBar(
        frame,
        bxX + Math.floor(B_sprite.bitmap.width / 2),
        bY,
        barW,
        barH,
        otherHp,
        otherMaxHp
      )
    } else {
      drawHealthBar(
        frame,
        axX + Math.floor(A_sprite.bitmap.width / 2),
        aY,
        barW,
        barH,
        otherHp,
        otherMaxHp
      )
      drawHealthBar(
        frame,
        bxX + Math.floor(B_sprite.bitmap.width / 2),
        bY,
        barW,
        barH,
        hpNow,
        maxHp
      )
    }

    // Cooldown bars (always both characters)
    const centerAx = axX + Math.floor(A_sprite.bitmap.width / 2)
    const centerBx = bxX + Math.floor(B_sprite.bitmap.width / 2)

    drawCooldownBar(
      frame,
      centerAx,
      aY - 18,
      COOLDOWN_BAR_W,
      COOLDOWN_BAR_H,
      cdA,
      totalCdA
    )
    drawCooldownBar(
      frame,
      centerBx,
      bY - 18,
      COOLDOWN_BAR_W,
      COOLDOWN_BAR_H,
      cdB,
      totalCdB
    )

    // Effect totals with bigger icons
    const barYA = Math.max(0, aY - barH - 8)
    const barYB = Math.max(0, bY - barH - 8)

    await drawEffectSummaryRow({
      frame,
      centerX: centerAx,
      barTopY: barYA,
      effects: A_effectTotals,
      effectIcons,
    })
    await drawEffectSummaryRow({
      frame,
      centerX: centerBx,
      barTopY: barYB,
      effects: B_effectTotals,
      effectIcons,
    })

        // Mini top-of-frame stat boards (always on during battle)
    const adjA = computeAttackerAdjustedStats(aStats || {}, A_effectTotals)
    const adjB = computeAttackerAdjustedStats(bStats || {}, B_effectTotals)
    const defA = computeDefenderAdjustedStats(aStats || {}, A_effectTotals)
    const defB = computeDefenderAdjustedStats(bStats || {}, B_effectTotals)

    const A_healthFrame = side === 'A' ? hpNow : otherHp
    const B_healthFrame = side === 'A' ? otherHp : hpNow

    const miniStatsA = {
      health: A_healthFrame,
      strength: Math.round(adjA.strength ?? (aStats?.strength || 0)),
      dexterity: Math.round(adjA.dexterity ?? (aStats?.dexterity || 0)),
      intelligence: Math.round(adjA.intelligence ?? (aStats?.intelligence || 0)),
      resist: Math.round(defA.resist ?? (aStats?.resist || 0)),
      speed: Math.round(adjA.speed ?? (aStats?.speed || 0)),
    }

    const miniStatsB = {
      health: B_healthFrame,
      strength: Math.round(adjB.strength ?? (bStats?.strength || 0)),
      dexterity: Math.round(adjB.dexterity ?? (bStats?.dexterity || 0)),
      intelligence: Math.round(adjB.intelligence ?? (bStats?.intelligence || 0)),
      resist: Math.round(defB.resist ?? (bStats?.resist || 0)),
      speed: Math.round(adjB.speed ?? (bStats?.speed || 0)),
    }

    await drawMiniStatsPanel({
      frame,
      side: 'A',
      marginX: 16,
      marginY: 16,
      stats: miniStatsA,
    })
    await drawMiniStatsPanel({
      frame,
      side: 'B',
      marginX: 16,
      marginY: 16,
      stats: miniStatsB,
    })


    if (popupText) {
      const dy = Math.round(popupRisePx * t)
      const px = popupStartX - Math.floor((popupImage?.bitmap?.width || 0) / 2)
      const py = popupStartY - dy
      frame.composite(popupImage, px, py)
    }

    await saveFrame(outFramesDir, fIdx++, frame)
  }
  return fIdx
}


async function animateHealRise({
  bg,
  axX,
  aY,
  A_sprite,
  bxX,
  bY,
  B_sprite,
  outFramesDir,
  framesSoFar,
  fromHp,
  toHp,
  maxHp,
  side,
  otherHp,
  otherMaxHp,
  barW = HEALTH_BAR_W,
  barH = HEALTH_BAR_H,
  frames = 18,
  popupText,
  popupTextScale = 1,
  popupStartX,
  popupStartY,
  popupRisePx = 40,
  effectIcons,
  effectTotalsFont,
  A_effectTotals,
  B_effectTotals,
  cdA = 0,
  totalCdA = 1,
  cdB = 0,
  totalCdB = 1,
  aStats,
  bStats,
}) {
  let fIdx = framesSoFar
  const popupImage = popupText
    ? await renderOutlinedPopupText(popupText, popupTextScale)
    : null

  for (let i = 0; i < frames; i++) {
    const t = i / (frames - 1)
    const hpNow = Math.round(fromHp + (toHp - fromHp) * t)
    const frame = bg.clone()
    frame.composite(A_sprite, axX, aY)
    frame.composite(B_sprite, bxX, bY)

    if (side === 'A') {
      drawHealthBar(
        frame,
        axX + Math.floor(A_sprite.bitmap.width / 2),
        aY,
        barW,
        barH,
        hpNow,
        maxHp
      )
      drawHealthBar(
        frame,
        bxX + Math.floor(B_sprite.bitmap.width / 2),
        bY,
        barW,
        barH,
        otherHp,
        otherMaxHp
      )
    } else {
      drawHealthBar(
        frame,
        axX + Math.floor(A_sprite.bitmap.width / 2),
        aY,
        barW,
        barH,
        otherHp,
        otherMaxHp
      )
      drawHealthBar(
        frame,
        bxX + Math.floor(B_sprite.bitmap.width / 2),
        bY,
        barW,
        barH,
        hpNow,
        maxHp
      )
    }

    // Cooldown bars
    const centerAx = axX + Math.floor(A_sprite.bitmap.width / 2)
    const centerBx = bxX + Math.floor(B_sprite.bitmap.width / 2)

    drawCooldownBar(
      frame,
      centerAx,
      aY - 18,
      COOLDOWN_BAR_W,
      COOLDOWN_BAR_H,
      cdA,
      totalCdA
    )
    drawCooldownBar(
      frame,
      centerBx,
      bY - 18,
      COOLDOWN_BAR_W,
      COOLDOWN_BAR_H,
      cdB,
      totalCdB
    )

    // Effect totals
    const barYA = Math.max(0, aY - barH - 8)
    const barYB = Math.max(0, bY - barH - 8)

    await drawEffectSummaryRow({
      frame,
      centerX: centerAx,
      barTopY: barYA,
      effects: A_effectTotals,
      effectIcons,
    })
    await drawEffectSummaryRow({
      frame,
      centerX: centerBx,
      barTopY: barYB,
      effects: B_effectTotals,
      effectIcons,
    })

        // Mini top-of-frame stat boards (always on during battle)
    const adjA = computeAttackerAdjustedStats(aStats || {}, A_effectTotals)
    const adjB = computeAttackerAdjustedStats(bStats || {}, B_effectTotals)
    const defA = computeDefenderAdjustedStats(aStats || {}, A_effectTotals)
    const defB = computeDefenderAdjustedStats(bStats || {}, B_effectTotals)

    const A_healthFrame = side === 'A' ? hpNow : otherHp
    const B_healthFrame = side === 'A' ? otherHp : hpNow

    const miniStatsA = {
      health: A_healthFrame,
      strength: Math.round(adjA.strength ?? (aStats?.strength || 0)),
      dexterity: Math.round(adjA.dexterity ?? (aStats?.dexterity || 0)),
      intelligence: Math.round(adjA.intelligence ?? (aStats?.intelligence || 0)),
      resist: Math.round(defA.resist ?? (aStats?.resist || 0)),
      speed: Math.round(adjA.speed ?? (aStats?.speed || 0)),
    }

    const miniStatsB = {
      health: B_healthFrame,
      strength: Math.round(adjB.strength ?? (bStats?.strength || 0)),
      dexterity: Math.round(adjB.dexterity ?? (bStats?.dexterity || 0)),
      intelligence: Math.round(adjB.intelligence ?? (bStats?.intelligence || 0)),
      resist: Math.round(defB.resist ?? (bStats?.resist || 0)),
      speed: Math.round(adjB.speed ?? (bStats?.speed || 0)),
    }

    await drawMiniStatsPanel({
      frame,
      side: 'A',
      marginX: 16,
      marginY: 16,
      stats: miniStatsA,
    })
    await drawMiniStatsPanel({
      frame,
      side: 'B',
      marginX: 16,
      marginY: 16,
      stats: miniStatsB,
    })


    if (popupText) {
      const dy = Math.round(popupRisePx * t)
      const px = popupStartX - Math.floor((popupImage?.bitmap?.width || 0) / 2)
      const py = popupStartY - dy
      frame.composite(popupImage, px, py)
    }

    await saveFrame(outFramesDir, fIdx++, frame)
  }
  return fIdx
}


/* ===================== CAMERA ZOOM + STATS ===================== */
async function zoomStatsSequence({
  baseFrameBuilder,
  bgW,
  bgH,
  focusBox,
  statsPanelImage,
  movePanelImage,
  movePanelAnimation = null,
  outFramesDir,
  framesSoFar,
  audioTimeline,
  emoteCueKind,
}) {
  let fIdx = framesSoFar
  const panelH = statsPanelImage.bitmap.height
  const moveH = movePanelImage.bitmap.height

  const placeBoards = async (frame, frameIndexForAnimation) => {
    const statsX = Math.round(
      (bgW - statsPanelImage.bitmap.width) / 2
    )
    frame.composite(statsPanelImage, statsX, STAT_BOARD_TOP_GAP)
    const moveX = Math.round(
      (bgW - movePanelImage.bitmap.width) / 2
    )
    const moveY = bgH - moveH - MOVE_BOARD_BOTTOM_GAP

    // The intro move panel is static: it uses the 3rd character animation frame
    // baked into movePanelImage, not the full looping preview.
    frame.composite(movePanelImage, moveX, moveY)
  }

  const zoomMax = ZOOM_MAX * (1 + STATS_ZOOM_BUMP)

  function computeCyForZoom(z) {
    const ch = Math.round(bgH / z)
    const cw = Math.round(bgW / z)
    const panelBottomCanvas =
      STAT_BOARD_TOP_GAP + panelH
    const requiredTopInCrop =
      panelBottomCanvas / z + STATS_PANEL_CLEARANCE
    const creatureTopWorld = focusBox.cy - focusBox.h / 2
    const maxCyToKeepClear =
      creatureTopWorld -
      requiredTopInCrop +
      ch / 2
    const preferredCy =
      focusBox.cy +
      Math.round(bgH * STATS_PREFERRED_OFFSET_FRACTION)
    const cy = clamp(
      Math.min(preferredCy, maxCyToKeepClear),
      ch / 2,
      bgH - ch / 2
    )
    const cx = clamp(focusBox.cx, cw / 2, bgW - cw / 2)
    return { cx, cy, ch, cw }
  }

  const doZoomStep = async (z, recordStart = false) => {
    const { cx, cy, ch, cw } = computeCyForZoom(z)
    const x0 = clamp(Math.round(cx - cw / 2), 0, bgW - cw)
    const y0 = clamp(Math.round(cy - ch / 2), 0, bgH - ch)
    const base = await baseFrameBuilder()
    const cropped = base
      .clone()
      .crop(x0, y0, cw, ch)
      .resize(bgW, bgH, Jimp.RESIZE_BICUBIC)
    await placeBoards(cropped, fIdx)
    if (recordStart && audioTimeline) {
      audioTimeline.push(emoteCueKind, fIdx / FIGHT_FPS)
    }
    await saveFrame(outFramesDir, fIdx++, cropped)
  }

  for (let i = 0; i < ZOOM_IN_FRAMES; i++) {
    const t = i / (ZOOM_IN_FRAMES - 1)
    const z =
      1 +
      (zoomMax - 1) *
        (t < 0.5
          ? 2 * t * t
          : 1 - Math.pow(-2 * t + 2, 2) / 2)
    await doZoomStep(z, i === 0)
  }
  for (let i = 0; i < STATS_HOLD_FRAMES; i++) {
    await doZoomStep(zoomMax)
  }
  for (let i = 0; i < ZOOM_OUT_FRAMES; i++) {
    const t = i / (ZOOM_OUT_FRAMES - 1)
    const z =
      zoomMax -
      (zoomMax - 1) *
        (t < 0.5
          ? 2 * t * t
          : 1 - Math.pow(-2 * t + 2, 2) / 2)
    await doZoomStep(z)
  }

  return fIdx
}

/* ===================== PROJECTILES ===================== */
async function drawProjectileSequence({
  bg,
  outFramesDir,
  startX,
  startY,
  endX,
  endY,
  framesSoFar,
  projectileImg,
  projectileFrames = [],
  layerLeft,
  layerRight,
  bars,
  framesOverride = null,
  effectIcons,
  effectTotalsFont,
  A_effectTotals,
  B_effectTotals,
  aStats,
  bStats,
}) {
  const effectFrameList =
    Array.isArray(projectileFrames) && projectileFrames.length
      ? projectileFrames
      : [projectileImg]
  const total =
    framesOverride ??
    getOneShotMoveDuration(4, effectFrameList.length)
  let fIdx = framesSoFar

  for (let i = 0; i < total; i++) {
    const t = easeOutCubic(i / (total - 1))
    const x = Math.round(startX + (endX - startX) * t)
    const y = Math.round(startY + (endY - startY) * t)
    const frame = bg.clone()

    await layerLeft(frame, i)
    await layerRight(frame, i)
    const projectileFrame = pickOneShotMoveEffectFrame(effectFrameList, i, projectileImg)
    if (projectileFrame) {
      frame.composite(projectileFrame, x, y)
    }

    if (bars) {
      const {
        axX,
        aY,
        A_sprite,
        bxX,
        bY,
        B_sprite,
        A_HP,
        A_MAX,
        B_HP,
        B_MAX,
        barW = HEALTH_BAR_W,
        barH = HEALTH_BAR_H,
        cdA = 0,
        cdB = 0,
        totalCdA = 1,
        totalCdB = 1,
      } = bars

      const centerAx = axX + Math.floor(A_sprite.bitmap.width / 2)
      const centerBx = bxX + Math.floor(B_sprite.bitmap.width / 2)

      // --- Health bars ---
      drawHealthBar(
        frame,
        centerAx,
        aY,
        barW,
        barH,
        A_HP,
        A_MAX
      )
      drawHealthBar(
        frame,
        centerBx,
        bY,
        barW,
        barH,
        B_HP,
        B_MAX
      )

      // --- Cooldown bars (both visible) ---
      drawCooldownBar(
        frame,
        centerAx,
        aY - 18,
        COOLDOWN_BAR_W,
        COOLDOWN_BAR_H,
        cdA,
        Math.max(0.8, totalCdA || cdA || 0.8)
      )
      drawCooldownBar(
        frame,
        centerBx,
        bY - 18,
        COOLDOWN_BAR_W,
        COOLDOWN_BAR_H,
        cdB,
        Math.max(0.8, totalCdB || cdB || 0.8)
      )

      // --- Effect icons (big) ---
      const barYA = Math.max(0, aY - barH - 8)
      const barYB = Math.max(0, bY - barH - 8)

      await drawEffectSummaryRow({
        frame,
        centerX: centerAx,
        barTopY: barYA,
        effects: A_effectTotals,
        effectIcons,
      })
      await drawEffectSummaryRow({
        frame,
        centerX: centerBx,
        barTopY: barYB,
        effects: B_effectTotals,
        effectIcons,
      })

      // --- MINI LIVE STATS PANELS (effect-adjusted), same logic as drawBarsAndEffects ---
      if (aStats && bStats) {
        const adjA = computeAttackerAdjustedStats(
          aStats,
          A_effectTotals
        )
        const adjB = computeAttackerAdjustedStats(
          bStats,
          B_effectTotals
        )
        const defA = computeDefenderAdjustedStats(
          aStats,
          A_effectTotals
        )
        const defB = computeDefenderAdjustedStats(
          bStats,
          B_effectTotals
        )

        const miniStatsA = {
          health: A_HP,
          strength: Math.round(adjA.strength ?? aStats.strength),
          dexterity: Math.round(adjA.dexterity ?? aStats.dexterity),
          intelligence: Math.round(
            adjA.intelligence ?? aStats.intelligence
          ),
          resist: Math.round(defA.resist ?? aStats.resist),
          speed: Math.round(adjA.speed ?? aStats.speed),
        }

        const miniStatsB = {
          health: B_HP,
          strength: Math.round(adjB.strength ?? bStats.strength),
          dexterity: Math.round(adjB.dexterity ?? bStats.dexterity),
          intelligence: Math.round(
            adjB.intelligence ?? bStats.intelligence
          ),
          resist: Math.round(defB.resist ?? bStats.resist),
          speed: Math.round(adjB.speed ?? bStats.speed),
        }

        await drawMiniStatsPanel({
          frame,
          side: 'A',
          marginX: 16,
          marginY: 16,
          stats: miniStatsA,
        })
        await drawMiniStatsPanel({
          frame,
          side: 'B',
          marginX: 16,
          marginY: 16,
          stats: miniStatsB,
        })
      }
    }

    await saveFrame(outFramesDir, fIdx++, frame)
  }

  return fIdx
}



/* ===================== VICTORY ===================== */
async function victorySequence({
  bg,
  bgW,
  bgH,
  winner,
  axFinalX,
  aY,
  A_idle,
  A_emote,
  bxFinalX,
  bY,
  B_idle,
  B_emote,
  outFramesDir,
  framesSoFar,
  audioTimeline,
  winnerName,
}) {
  let fIdx = framesSoFar

  const winSpriteIdle = winner === 'A' ? A_idle : B_idle
  const winSpriteEmote = winner === 'A' ? A_emote : B_emote
  const winX = winner === 'A' ? axFinalX : bxFinalX
  const winY = winner === 'A' ? aY : bY
  const emoteCenter = {
    cx: winX + Math.floor(winSpriteIdle.bitmap.width / 2),
    cy: winY + Math.floor(winSpriteIdle.bitmap.height * 0.55),
    w: winSpriteIdle.bitmap.width,
    h: winSpriteIdle.bitmap.height,
  }

  const baseEmoteFrame = async () => {
    const frame = bg.clone()
    frame.composite(winSpriteIdle, winX, winY)
    return frame
  }

  audioTimeline.push(winner === 'A' ? 'emoteA' : 'emoteB', fIdx / FIGHT_FPS)

  // === Zoom in on winner emote ===
  for (let i = 0; i < VICTORY_ZOOM_IN_FR; i++) {
    const t = easeInOut(i / (VICTORY_ZOOM_IN_FR - 1))
    const z = 1 + (VICTORY_ZOOM_MAX - 1) * t
    const cw = Math.round(bgW / z)
    const ch = Math.round(bgH / z)
    const x0 = clamp(Math.round(emoteCenter.cx - cw / 2), 0, bgW - cw)
    const y0 = clamp(Math.round(emoteCenter.cy - ch / 2), 0, bgH - ch)
    const base = await baseEmoteFrame()
    const cropped = base.clone().crop(x0, y0, cw, ch).resize(bgW, bgH, Jimp.RESIZE_BICUBIC)
    await saveFrame(outFramesDir, fIdx++, cropped)
  }

  // === Hold on max zoom ===
  for (let i = 0; i < VICTORY_HOLD_FRAMES; i++) {
    const z = VICTORY_ZOOM_MAX
    const cw = Math.round(bgW / z)
    const ch = Math.round(bgH / z)
    const x0 = clamp(Math.round(emoteCenter.cx - cw / 2), 0, bgW - cw)
    const y0 = clamp(Math.round(emoteCenter.cy - ch / 2), 0, bgH - ch)
    const base = await baseEmoteFrame()
    const cropped = base.clone().crop(x0, y0, cw, ch).resize(bgW, bgH, Jimp.RESIZE_BICUBIC)
    await saveFrame(outFramesDir, fIdx++, cropped)
  }

  // === Victory banner (taller to fit reward + XP) ===
  const bannerW = Math.round(bgW * 0.92)
  const bannerH = 300 // was 190 – taller so title + reward + XP all fit comfortably
  const banner = new Jimp(bannerW, bannerH, Jimp.cssColorToHex('#0e0a08'))
  banner.opacity(0.82)

  const GOLD_HEX = Jimp.cssColorToHex('rgba(225,184,100,0.9)')
  for (let x = 0; x < bannerW; x++) {
    banner.setPixelColor(GOLD_HEX, x, 0)
    banner.setPixelColor(GOLD_HEX, x, bannerH - 1)
  }
  for (let y = 0; y < bannerH; y++) {
    banner.setPixelColor(GOLD_HEX, 0, y)
    banner.setPixelColor(GOLD_HEX, bannerW - 1, y)
  }

  // Fonts
  const titleFont = await loadFontBuiltin(64, 'white')
  const rewardFont = await loadFontBuiltin(58, 'white')
  const xpFont = await loadFontBuiltin(48, 'white')

  const msg = `${winnerName} is victorious!`
  const rewardText = '+20,000'
  const xpText = '+5xp'

  // Logo
  const dcLogoRaw = await Jimp.read('DC.png')
  const logoTargetH = Math.round(bannerH * 0.28) // slightly smaller so both lines breathe
  const logoScale = logoTargetH / dcLogoRaw.bitmap.height
  const dcLogo = dcLogoRaw
    .clone()
    .resize(
      Math.round(dcLogoRaw.bitmap.width * logoScale),
      logoTargetH,
      Jimp.RESIZE_BICUBIC
    )

  // Measurements
  const rewardTextWidth = Jimp.measureText(rewardFont, rewardText)
  const rewardTextHeight = Jimp.measureTextHeight(rewardFont, rewardText, rewardTextWidth)

  const xpTextWidth = Jimp.measureText(xpFont, xpText)
  const xpTextHeight = Jimp.measureTextHeight(xpFont, xpText, xpTextWidth)

  const logoW = dcLogo.bitmap.width
  const logoH = dcLogo.bitmap.height

  // Split banner into title section + content section
  const titleAreaHeight = Math.round(bannerH * 0.48) // slightly taller title area
  const contentTopPad = 10
  const contentBotPad = 16
  const contentTop = titleAreaHeight + contentTopPad
  const contentH = bannerH - titleAreaHeight - contentTopPad - contentBotPad

  // Layout for content: line1 (reward + logo) then line2 (xp)
  const lineGap = 10
  const line1H = Math.max(rewardTextHeight, logoH)
  const totalContentNeeded = line1H + lineGap + xpTextHeight
  const startYInsideContent = Math.max(
    0,
    Math.round((contentH - totalContentNeeded) / 2)
  )

  for (let i = 0; i < VICTORY_BANNER_FRAMES; i++) {
    const z = VICTORY_ZOOM_MAX
    const cw = Math.round(bgW / z)
    const ch = Math.round(bgH / z)
    const x0 = clamp(Math.round(emoteCenter.cx - cw / 2), 0, bgW - cw)
    const y0 = clamp(Math.round(emoteCenter.cy - ch / 2), 0, bgH - ch)

    const base = await baseEmoteFrame()
    const cropped = base.clone().crop(x0, y0, cw, ch).resize(bgW, bgH, Jimp.RESIZE_BICUBIC)

    const bx = Math.round((bgW - bannerW) / 2)
    const by = VICTORY_BANNER_TOP
    const frame = cropped

    // Draw banner (taller box behind all text)
    frame.composite(banner, bx, by)

    // Push all text DOWN with more internal padding so it sits cleanly inside the box
    const titlePadTop = 26
    const titlePadX = 24

    // === Title ===
    frame.print(
      titleFont,
      bx + titlePadX,
      by + titlePadTop,
      {
        text: msg,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
      },
      bannerW - titlePadX * 2,
      titleAreaHeight - titlePadTop - 10
    )

    // === Content area origin (inside the banner) ===
    const contentOriginY = by + contentTop + startYInsideContent

    // Line 1: "+10,000 [DC logo]" centered as a group
    const groupW = rewardTextWidth + 16 + logoW
    const groupX = bx + Math.round((bannerW - groupW) / 2)

    const rewardY = contentOriginY + Math.round((line1H - rewardTextHeight) / 2)
    const logoY = contentOriginY + Math.round((line1H - logoH) / 2)

    frame.print(rewardFont, groupX, rewardY, rewardText)
    frame.composite(dcLogo, groupX + rewardTextWidth + 16, logoY)

    // Line 2: "+5xp" centered below
    const xpY = contentOriginY + line1H + lineGap
    const xpX = bx + Math.round((bannerW - xpTextWidth) / 2)
    frame.print(xpFont, xpX, xpY, xpText)

    await saveFrame(outFramesDir, fIdx++, frame)
  }

  return fIdx
}



async function fadeOutDefeated({
  bg,
  axFinalX,
  aY,
  A_sprite,
  bxFinalX,
  bY,
  B_sprite,
  outFramesDir,
  framesSoFar,
  loser,
  A_HP,
  B_HP,
  A_MAX,
  B_MAX,
  cdA = 0,
  cdB = 0,
  totalCdA = 1,
  totalCdB = 1,
  A_effectTotals = {},
  B_effectTotals = {},
  effectIcons,
  barW = HEALTH_BAR_W,
  barH = HEALTH_BAR_H,
}) {
  let fIdx = framesSoFar
  const steps = 20

  const centerAx =
    axFinalX + Math.floor(A_sprite.bitmap.width / 2)
  const centerBx =
    bxFinalX + Math.floor(B_sprite.bitmap.width / 2)

  for (let i = 0; i < steps; i++) {
    const frame = bg.clone()
    const alpha = 1 - i / (steps - 1)

    if (loser === 'A') {
      frame.composite(
        A_sprite.clone().opacity(alpha),
        axFinalX,
        aY
      )
      frame.composite(B_sprite, bxFinalX, bY)
    } else {
      frame.composite(A_sprite, axFinalX, aY)
      frame.composite(
        B_sprite.clone().opacity(alpha),
        bxFinalX,
        bY
      )
    }

    // Health bars
    drawHealthBar(
      frame,
      centerAx,
      aY,
      barW,
      barH,
      A_HP,
      A_MAX
    )
    drawHealthBar(
      frame,
      centerBx,
      bY,
      barW,
      barH,
      B_HP,
      B_MAX
    )

    // Cooldown bars
    drawCooldownBar(
      frame,
      centerAx,
      aY - 18,
      COOLDOWN_BAR_W,
      COOLDOWN_BAR_H,
      cdA,
      Math.max(0.8, totalCdA || cdA || 0.8)
    )
    drawCooldownBar(
      frame,
      centerBx,
      bY - 18,
      COOLDOWN_BAR_W,
      COOLDOWN_BAR_H,
      cdB,
      Math.max(0.8, totalCdB || cdB || 0.8)
    )

    // Effect stacks (same “always on” behavior)
    await drawEffectSummaryRow({
      frame,
      centerX: centerAx,
      barTopY: aY,
      effects: A_effectTotals,
      effectIcons,
    })
    await drawEffectSummaryRow({
      frame,
      centerX: centerBx,
      barTopY: bY,
      effects: B_effectTotals,
      effectIcons,
    })

    await saveFrame(outFramesDir, fIdx++, frame)
  }
  return fIdx
}


/* ===================== EASING ===================== */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

// Round a number to the nearest tenth for popup text
const formatPopupNumber = (value) => {
  if (!Number.isFinite(value)) return String(value)
  const rounded = Math.round(value * 10) / 10
  // Show "5" instead of "5.0", but keep one decimal when needed (e.g. "5.3")
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1)
}


/* ===================== FIGHT SCENE ===================== */
async function createFightFrames({
  aName,
  bName,
  backgroundPath,
  spriteAPath,
  spriteBPath,
  spriteAIdleFramePaths = [],
  spriteBIdleFramePaths = [],
  spriteAEmotePath,
  spriteBEmotePath,
  spriteAMoveAPath,
  spriteBMoveAPath,
  spriteAMoveBPath,
  spriteBMoveBPath,
  spriteAMoveCPath,
  spriteBMoveCPath,
  spriteAMoveAFramePaths = [],
  spriteBMoveAFramePaths = [],
  spriteAMoveBFramePaths = [],
  spriteBMoveBFramePaths = [],
  spriteAMoveCFramePaths = [],
  spriteBMoveCFramePaths = [],
  moveAEffectFramePathsA = [],
  moveAEffectFramePathsB = [],
  moveBEffectFramePathsA = [],
  moveBEffectFramePathsB = [],
  moveCEffectFramePathsA = [],
  moveCEffectFramePathsB = [],
  moveAVisualAPath,
  moveAVisualBPath,
  moveBVisualAPath,
  moveBVisualBPath,
  moveCVisualAPath,
  moveCVisualBPath,
  statsPanelAPath,
  statsPanelBPath,
  movePanelAPath,
  movePanelBPath,
  outFramesDir,
  scaleFraction,
  aStats,
  bStats,
  aMoveMetaA,
  aMoveMetaB,
  aMoveMetaC,
  bMoveMetaA,
  bMoveMetaB,
  bMoveMetaC,
  aGainedItemEffects = cloneEmptyGainedEffects(),
  bGainedItemEffects = cloneEmptyGainedEffects(),
  aItemBattleEffects = [],
  bItemBattleEffects = [],
  aItemResistances = {},
  bItemResistances = {},
  aCharObj = {},
  bCharObj = {},
  audioTimeline,
  effectIcons,
  versusImagePath = null,
  arenaMap = null,
  aAssetId = null,
  bAssetId = null,
}) {
  ensureDir(outFramesDir)
  await emptyDir(outFramesDir)

  const bg = await Jimp.read(backgroundPath)
  const bgW = bg.bitmap.width
  const bgH = bg.bitmap.height

  const fadeFrames = 18   // ~0.6s @ 30fps (tweak)
  const holdFrames = 24   // ~0.8s

  


  async function writeVsIntro() {
    if (!versusImagePath) return

    let vs = await Jimp.read(versusImagePath)
    // ensure exact size
    vs = vs.cover(bgW, bgH)

    const black = new Jimp(bgW, bgH, 0x000000ff)

    // Fade IN: black -> VS
    for (let i = 0; i < fadeFrames; i++) {
      const t = i / Math.max(1, fadeFrames - 1)
      const frame = black.clone()
      frame.composite(vs.clone().opacity(t), 0, 0)
      await saveFrame(outFramesDir, fIdx++, frame)
    }

    // Hold
    for (let i = 0; i < holdFrames; i++) {
      await saveFrame(outFramesDir, fIdx++, vs.clone())
    }

    // Fade OUT: VS -> battle background
    for (let i = 0; i < fadeFrames; i++) {
      const t = i / Math.max(1, fadeFrames - 1)
      const frame = bg.clone()
      frame.composite(vs.clone().opacity(1 - t), 0, 0)
      await saveFrame(outFramesDir, fIdx++, frame)
    }
  }

  // NEW: write the VS intro BEFORE any fight animation begins
  await writeVsIntro()


  let A_idle = await Jimp.read(spriteAPath)
  let B_idle = await Jimp.read(spriteBPath)
  let A_emote = await Jimp.read(spriteAEmotePath)
  let B_emote = await Jimp.read(spriteBEmotePath)
  let A_moveA = await Jimp.read(spriteAMoveAPath)
  let B_moveA = await Jimp.read(spriteBMoveAPath)
  let A_moveB = await Jimp.read(spriteAMoveBPath)
  let B_moveB = await Jimp.read(spriteBMoveBPath)
  let A_moveC = await Jimp.read(spriteAMoveCPath)
  let B_moveC = await Jimp.read(spriteBMoveCPath)


  // Characters 2× larger
  const targetH = Math.max(64, Math.round(bgH * scaleFraction * 2))
  const scaleToHeight = (img, h) =>
    img.resize(
      Math.round(img.bitmap.width * (h / img.bitmap.height)),
      h
    )
  A_idle = scaleToHeight(A_idle, targetH)
  A_emote = scaleToHeight(A_emote, targetH)
  A_moveA = scaleToHeight(A_moveA, targetH)
  A_moveB = scaleToHeight(A_moveB, targetH)
  A_moveC = scaleToHeight(A_moveC, targetH)
  B_idle = scaleToHeight(B_idle, targetH)
  B_emote = scaleToHeight(B_emote, targetH)
  B_moveA = scaleToHeight(B_moveA, targetH)
  B_moveB = scaleToHeight(B_moveB, targetH)
  B_moveC = scaleToHeight(B_moveC, targetH)

  const A_idleFrames = await readAndScaleFrameSequence(spriteAIdleFramePaths, targetH)
  const B_idleFrames = await readAndScaleFrameSequence(spriteBIdleFramePaths, targetH)
  const A_moveAFrames = await readAndScaleFrameSequence(spriteAMoveAFramePaths, targetH)
  const B_moveAFrames = await readAndScaleFrameSequence(spriteBMoveAFramePaths, targetH)
  const A_moveBFrames = await readAndScaleFrameSequence(spriteAMoveBFramePaths, targetH)
  const B_moveBFrames = await readAndScaleFrameSequence(spriteBMoveBFramePaths, targetH)
  const A_moveCFrames = await readAndScaleFrameSequence(spriteAMoveCFramePaths, targetH)
  const B_moveCFrames = await readAndScaleFrameSequence(spriteBMoveCFramePaths, targetH)

  // Idle animation is intentionally slower than move animations.
  // Previous cadence changed frames every 8 video frames; this is 3x slower.
  const IDLE_FRAME_HOLD = 24

  const getAIdleFrame = (frameIndex = fIdx) =>
    pickAnimationFrame(A_idleFrames, Math.floor(frameIndex / IDLE_FRAME_HOLD), A_idle)
  const getBIdleFrame = (frameIndex = fIdx) =>
    pickAnimationFrame(B_idleFrames, Math.floor(frameIndex / IDLE_FRAME_HOLD), B_idle)

  const getMoveFrameForMeta = (isA, meta, localIndex = 0) => {
    const moveId = String(meta?.id || meta?.name || '').toLowerCase()
    if (isA) {
      if (moveId === String(aMoveMetaB?.id || aMoveMetaB?.name || '').toLowerCase()) {
        return pickAnimationFrame(A_moveBFrames, localIndex, A_moveB)
      }
      if (moveId === String(aMoveMetaC?.id || aMoveMetaC?.name || '').toLowerCase()) {
        return pickAnimationFrame(A_moveCFrames, localIndex, A_moveC)
      }
      return pickAnimationFrame(A_moveAFrames, localIndex, A_moveA)
    }

    if (moveId === String(bMoveMetaB?.id || bMoveMetaB?.name || '').toLowerCase()) {
      return pickAnimationFrame(B_moveBFrames, localIndex, B_moveB)
    }
    if (moveId === String(bMoveMetaC?.id || bMoveMetaC?.name || '').toLowerCase()) {
      return pickAnimationFrame(B_moveCFrames, localIndex, B_moveC)
    }
    return pickAnimationFrame(B_moveAFrames, localIndex, B_moveA)
  }


  // Move images / projectiles – half size vs previous 2× version
  const projTargetH = Math.max(
    32,
    Math.round(bgH * PROJECTILE_HEIGHT_FRACTION)
  )
  let projA_A = (await Jimp.read(moveAVisualAPath)).resize(
    Jimp.AUTO,
    projTargetH,
    Jimp.RESIZE_BILINEAR
  )
  let projB_A = (await Jimp.read(moveAVisualBPath)).resize(
    Jimp.AUTO,
    projTargetH,
    Jimp.RESIZE_BILINEAR
  )
  let projA_B = (await Jimp.read(moveBVisualAPath)).resize(
    Jimp.AUTO,
    projTargetH,
    Jimp.RESIZE_BILINEAR
  )
  let projB_B = (await Jimp.read(moveBVisualBPath)).resize(
    Jimp.AUTO,
    projTargetH,
    Jimp.RESIZE_BILINEAR
  )

    let projA_C = (await Jimp.read(moveCVisualAPath)).resize(
    Jimp.AUTO,
    projTargetH,
    Jimp.RESIZE_BILINEAR
  )
  let projB_C = (await Jimp.read(moveCVisualBPath)).resize(
    Jimp.AUTO,
    projTargetH,
    Jimp.RESIZE_BILINEAR
  )

  const projA_AFrames = await readAndScaleFrameSequence(moveAEffectFramePathsA, projTargetH)
  const projB_AFrames = await readAndScaleFrameSequence(moveAEffectFramePathsB, projTargetH)
  const projA_BFrames = await readAndScaleFrameSequence(moveBEffectFramePathsA, projTargetH)
  const projB_BFrames = await readAndScaleFrameSequence(moveBEffectFramePathsB, projTargetH)
  const projA_CFrames = await readAndScaleFrameSequence(moveCEffectFramePathsA, projTargetH)
  const projB_CFrames = await readAndScaleFrameSequence(moveCEffectFramePathsB, projTargetH)


  const centerY = Math.floor(bgH * 0.72)
  const aY = centerY - A_idle.bitmap.height
  const bY = centerY - B_idle.bitmap.height

  const edgeMargin = Math.max(16, Math.round(bgW * 0.08))
  const axFinalX = edgeMargin + 30
  const bxFinalX = bgW - edgeMargin - B_idle.bitmap.width - 30

  const axStartX = -A_idle.bitmap.width - 40
  const bxStartX = bgW + 40

  const statsPanelA = await Jimp.read(statsPanelAPath)
  const statsPanelB = await Jimp.read(statsPanelBPath)
  const movePanelA = await Jimp.read(movePanelAPath)
  const movePanelB = await Jimp.read(movePanelBPath)

  // Effect stacks state
  const A_effectTotals = {}
  const B_effectTotals = {}
const applyEffectStacksForMove = makeApplyEffectStacksForMove({
  A_effectTotals,
  B_effectTotals,
  aStats,
  bStats,
  arenaMap,
})

// (do NOT call recomputeCooldownClocks here; cooldown vars aren't initialized yet)

const startItemEffectEvents = applyStartOfBattleItemEffects({
  A_effectTotals,
  B_effectTotals,
  aItemBattleEffects,
  bItemBattleEffects,
  aItemResistances,
  bItemResistances,
  aStats,
  bStats,
  aCharObj,
  bCharObj,
  arenaMap,
})

const effectTotalsFont = await loadFontBuiltin(16, 'white')
const arenaMapFont = await loadFontBuiltin(16, 'white')
const arenaMapFontBlack = await loadFontBuiltin(16, 'black')
const arenaMapTitleFont = await loadFontBuiltin(32, 'white')
const arenaMapTitleFontBlack = await loadFontBuiltin(32, 'black')


  let fIdx = 0

  let heldMoveSide = null
  let heldMoveSprite = null
  let heldMoveX = 0
  let heldMoveY = 0

  const setHeldMoveFrame = (side, sprite, x, y) => {
    heldMoveSide = side
    heldMoveSprite = sprite
    heldMoveX = x
    heldMoveY = y
  }

  const clearHeldMoveFrame = () => {
    heldMoveSide = null
    heldMoveSprite = null
    heldMoveX = 0
    heldMoveY = 0
  }

  const compositeFightersForHeldMove = (frame, frameIndex = fIdx) => {
    if (heldMoveSide === 'A' && heldMoveSprite) {
      frame.composite(heldMoveSprite, heldMoveX, heldMoveY)
    } else {
      frame.composite(getAIdleFrame(frameIndex), axFinalX, aY)
    }

    if (heldMoveSide === 'B' && heldMoveSprite) {
      frame.composite(heldMoveSprite, heldMoveX, heldMoveY)
    } else {
      frame.composite(getBIdleFrame(frameIndex), bxFinalX, bY)
    }
  }

  const buildFrameAEmote = async () => {
    const frame = bg.clone()
    frame.composite(getAIdleFrame(fIdx), axFinalX, aY)
    return frame
  }
  const buildFrameBEmote = async () => {
    const frame = bg.clone()
    frame.composite(getAIdleFrame(fIdx), axFinalX, aY)
    frame.composite(getBIdleFrame(fIdx), bxFinalX, bY)
    return frame
  }


      async function drawBarsAndEffects(
    frame,
    cdA,
    cdB,
    A_HP,
    A_MAX,
    B_HP,
    B_MAX
  ) {
    // Health bars
    const centerAx =
      axFinalX + Math.floor(A_idle.bitmap.width / 2)
    const centerBx =
      bxFinalX + Math.floor(B_idle.bitmap.width / 2)

    drawHealthBar(
      frame,
      centerAx,
      aY,
      HEALTH_BAR_W,
      HEALTH_BAR_H,
      A_HP,
      A_MAX
    )
    drawHealthBar(
      frame,
      centerBx,
      bY,
      HEALTH_BAR_W,
      HEALTH_BAR_H,
      B_HP,
      B_MAX
    )

    // Cooldown bars (both sides, always)
    drawCooldownBar(
      frame,
      centerAx,
      aY - 18,
      COOLDOWN_BAR_W,
      COOLDOWN_BAR_H,
      cdA,
      Math.max(0.8, totalCdA || cdA || 0.8)
    )
    drawCooldownBar(
      frame,
      centerBx,
      bY - 18,
      COOLDOWN_BAR_W,
      COOLDOWN_BAR_H,
      cdB,
      Math.max(0.8, totalCdB || cdB || 0.8)
    )

    // Effect icons + stacks (big) – ALWAYS visible
    const barYA = Math.max(0, aY - HEALTH_BAR_H - 8)
    const barYB = Math.max(0, bY - HEALTH_BAR_H - 8)

    await drawEffectSummaryRow({
      frame,
      centerX: centerAx,
      barTopY: barYA,
      effects: A_effectTotals,
      effectIcons,
    })
    await drawEffectSummaryRow({
      frame,
      centerX: centerBx,
      barTopY: barYB,
      effects: B_effectTotals,
      effectIcons,
    })

    // ===== MINI LIVE STATS PANELS (effect-adjusted) =====
    // Attacker-style adjustments (STR/DEX/INT/SPD/ACC) from effects
    const adjA = computeAttackerAdjustedStats(
      aStats,
      A_effectTotals,
      arenaMap
    )
    const adjB = computeAttackerAdjustedStats(
      bStats,
      B_effectTotals,
      arenaMap
    )
    // Defender-style resist from effects (bless/doom)
    const defA = computeDefenderAdjustedStats(
      aStats,
      A_effectTotals,
      arenaMap
    )
    const defB = computeDefenderAdjustedStats(
      bStats,
      B_effectTotals,
      arenaMap
    )

    const miniStatsA = {
      health: A_HP,
      strength: Math.round(adjA.strength ?? aStats.strength),
      dexterity: Math.round(adjA.dexterity ?? aStats.dexterity),
      intelligence: Math.round(
        adjA.intelligence ?? aStats.intelligence
      ),
      resist: Math.round(defA.resist ?? aStats.resist),
      speed: Math.round(adjA.speed ?? aStats.speed),
    }

    const miniStatsB = {
      health: B_HP,
      strength: Math.round(adjB.strength ?? bStats.strength),
      dexterity: Math.round(adjB.dexterity ?? bStats.dexterity),
      intelligence: Math.round(
        adjB.intelligence ?? bStats.intelligence
      ),
      resist: Math.round(defB.resist ?? bStats.resist),
      speed: Math.round(adjB.speed ?? bStats.speed),
    }

    await drawMiniStatsPanel({
      frame,
      side: 'A',
      marginX: 16,
      marginY: 16,
      stats: miniStatsA,
    })
    await drawMiniStatsPanel({
      frame,
      side: 'B',
      marginX: 16,
      marginY: 16,
      stats: miniStatsB,
    })

    drawArenaMapInfoPanel(frame, arenaMap, {
      font: arenaMapFont,
      fontBlack: arenaMapFontBlack,
      titleFont: arenaMapTitleFont,
      titleFontBlack: arenaMapTitleFontBlack,
      bgW,
      y: getArenaMapInfoTopY(),
      compact: false,
      roundNumber: 0,
    })
  }


    async function animateEffectPopup({
    targetSide,
    effectName,
    amount,
    framesSoFar,
    cdA,
    cdB,
    A_HP,
    A_MAX,
    B_HP,
    B_MAX,
  }) {
    if (!effectName || !amount) return framesSoFar

    const popupFont = await loadFontBuiltin(32, 'white')
    const popupFontOutline = await loadFontBuiltin(32, 'black')
    const icon = effectIcons?.[effectName] || null

    let fIdxLocal = framesSoFar
    const frames = 18
    const risePx = 40

    const isA = targetSide === 'A'
    const centerX = isA
      ? axFinalX + Math.floor(A_idle.bitmap.width / 2)
      : bxFinalX + Math.floor(B_idle.bitmap.width / 2)
    const spriteTopY = isA ? aY : bY
    const baseY = spriteTopY - 20

    for (let i = 0; i < frames; i++) {
      const t = i / Math.max(1, frames - 1)
      const dy = Math.round(risePx * t)
      const y = baseY - dy

      const frame = bg.clone()
      frame.composite(getAIdleFrame(fIdxLocal), axFinalX, aY)
      frame.composite(getBIdleFrame(fIdxLocal), bxFinalX, bY)

      // 🔒 ALWAYS draw HP, cooldowns, and ALL applied stacks
      await drawBarsAndEffects(
        frame,
        cdA,
        cdB,
        A_HP,
        A_MAX,
        B_HP,
        B_MAX
      )

      let ix = centerX
      if (icon) {
        const size = 24
        const scaled = icon
          .clone()
          .contain(size, size, Jimp.RESIZE_BILINEAR)
        ix = centerX - Math.floor(size / 2) - 12
        frame.composite(scaled, ix, y)
        ix += size + 4
      }

      const text = `+${amount}`
      frame.print(popupFontOutline, ix + 1, y + 1, text)
      frame.print(popupFont, ix, y, text)

      await saveFrame(outFramesDir, fIdxLocal++, frame)
    }

    return fIdxLocal
  }

    /**
   * Simple floating "MISS" popup above the target.
   */
  async function animateMissPopup({
    targetSide,   // 'A' or 'B' (the side that was attacked / dodged)
    framesSoFar,
    cdA,
    cdB,
    A_HP,
    A_MAX,
    B_HP,
    B_MAX,
  }) {
    let fIdxLocal = framesSoFar
    const fontWhite = await loadFontBuiltin(32, 'white')
    const fontBlack = await loadFontBuiltin(32, 'black')

    const frames = 18
    const risePx = 40
    const text = 'MISS'

    const isTargetA = targetSide === 'A'
    const centerX = isTargetA
      ? axFinalX + Math.floor(A_idle.bitmap.width / 2)
      : bxFinalX + Math.floor(B_idle.bitmap.width / 2)
    const baseY = (isTargetA ? aY : bY) - 10

    for (let i = 0; i < frames; i++) {
      const t = i / Math.max(1, frames - 1)
      const dy = Math.round(risePx * t)
      const y = baseY - dy

      const frame = bg.clone()
      frame.composite(getAIdleFrame(fIdxLocal), axFinalX, aY)
      frame.composite(getBIdleFrame(fIdxLocal), bxFinalX, bY)

      // Bars + always-on effects
      await drawBarsAndEffects(
        frame,
        cdA,
        cdB,
        A_HP,
        A_MAX,
        B_HP,
        B_MAX
      )

      const approxTextW = text.length * 16
      const x = centerX - Math.round(approxTextW / 2)

      frame.print(fontBlack, x + 1, y + 1, text)
      frame.print(fontWhite, x, y, text)

      await saveFrame(outFramesDir, fIdxLocal++, frame)
    }

    return fIdxLocal
  }

    /**
   * Floating "RESIST" popup above the defender when they block an effect.
   */
  async function animateResistPopup({
    targetSide,   // 'A' or 'B'
    framesSoFar,
    cdA,
    cdB,
    A_HP,
    A_MAX,
    B_HP,
    B_MAX,
  }) {
    let fIdxLocal = framesSoFar
    const fontWhite = await loadFontBuiltin(32, 'white')
    const fontBlack = await loadFontBuiltin(32, 'black')

    const frames = 18
    const risePx = 40
    const text = 'RESIST'

    const isTargetA = targetSide === 'A'
    const centerX = isTargetA
      ? axFinalX + Math.floor(A_idle.bitmap.width / 2)
      : bxFinalX + Math.floor(B_idle.bitmap.width / 2)
    const baseY = (isTargetA ? aY : bY) - 10

    for (let i = 0; i < frames; i++) {
      const t = i / Math.max(1, frames - 1)
      const dy = Math.round(risePx * t)
      const y = baseY - dy

      const frame = bg.clone()
      frame.composite(getAIdleFrame(fIdxLocal), axFinalX, aY)
      frame.composite(getBIdleFrame(fIdxLocal), bxFinalX, bY)

      // Bars + always-on effects
      await drawBarsAndEffects(
        frame,
        cdA,
        cdB,
        A_HP,
        A_MAX,
        B_HP,
        B_MAX
      )

      const approxTextW = text.length * 16
      const x = centerX - Math.round(approxTextW / 2)

      frame.print(fontBlack, x + 1, y + 1, text)
      frame.print(fontWhite, x, y, text)

      await saveFrame(outFramesDir, fIdxLocal++, frame)
    }

    return fIdxLocal
  }



        // Apply DOT / HoT from effects ONLY to the side that is about to act.
  async function applyOngoingEffectsForSide(side, frameIndexForAudio) {
    const isA = side === 'A'
    const effects = isA ? A_effectTotals : B_effectTotals
    const delta = computeOngoingEffectHpDelta(effects, arenaMap)
    if (!delta) return

    const prevHp = isA ? A_HP : B_HP
    const maxHp = isA ? A_MAX : B_MAX
    const otherHp = isA ? B_HP : A_HP
    const otherMaxHp = isA ? B_MAX : A_MAX

    const newHp = clamp(prevHp + delta, 0, maxHp)
    const roundedDelta = formatPopupNumber(Math.abs(delta))
    const popupText =
      delta < 0 ? `-${roundedDelta}` : `+${roundedDelta}`


    const centerX = isA
      ? axFinalX + Math.floor(A_idle.bitmap.width / 2)
      : bxFinalX + Math.floor(B_idle.bitmap.width / 2)
    const spriteY = isA ? aY : bY
    const popupX = centerX - 10
    const popupY = spriteY - 10

    const effectTimeSec =
      (frameIndexForAudio ?? fIdx) / FIGHT_FPS

    // DOT SFX: only when damage over time (not HoT like nurture)
    if (delta < 0 && audioTimeline) {
      audioTimeline.push('dot', effectTimeSec)
    }

    if (delta < 0) {
      // Effect damage
      fIdx = await animateHealthDrop({
        bg,
        axX: axFinalX,
        aY,
        A_sprite: A_idle,
        bxX: bxFinalX,
        bY,
        B_sprite: B_idle,
        outFramesDir,
        framesSoFar: fIdx,
        fromHp: prevHp,
        toHp: newHp,
        maxHp,
        side: isA ? 'A' : 'B',
        otherHp,
        otherMaxHp,
        barW: HEALTH_BAR_W,
        barH: HEALTH_BAR_H,
        frames: 20,
        popupText,
        popupStartX: popupX,
        popupStartY: popupY,
        popupRisePx: 36,
        effectIcons,
        effectTotalsFont,
        A_effectTotals,
        B_effectTotals,
        cdA,
        totalCdA,
        cdB,
        totalCdB,
        aStats,
        bStats,
      })
    } else {
      // Effect healing (nurture)
      fIdx = await animateHealRise({
        bg,
        axX: axFinalX,
        aY,
        A_sprite: A_idle,
        bxX: bxFinalX,
        bY,
        B_sprite: B_idle,
        outFramesDir,
        framesSoFar: fIdx,
        fromHp: prevHp,
        toHp: newHp,
        maxHp,
        side: isA ? 'A' : 'B',
        otherHp,
        otherMaxHp,
        barW: HEALTH_BAR_W,
        barH: HEALTH_BAR_H,
        frames: 20,
        popupText,
        popupStartX: popupX,
        popupStartY: popupY,
        popupRisePx: 36,
        effectIcons,
        effectTotalsFont,
        A_effectTotals,
        B_effectTotals,
        cdA,
        totalCdA,
        cdB,
        totalCdB,
        aStats,
        bStats,
      })
    }

    // Update HP
    if (isA) A_HP = newHp
    else B_HP = newHp

    // If this DOT killed them, mark a death cue
    if (newHp <= 0 && audioTimeline) {
      audioTimeline.push('death', effectTimeSec)
    }
  }





  fIdx = await animateArenaMapInfoZoom({
    baseFrameBuilder: async () => bg.clone(),
    arenaMap,
    outFramesDir,
    framesSoFar: fIdx,
    bgW,
    font: arenaMapFont,
    fontBlack: arenaMapFontBlack,
    titleFont: arenaMapTitleFont,
    titleFontBlack: arenaMapTitleFontBlack,
  })

  // A floats in
  for (let i = 0; i < FIGHT_FRAMES_A; i++) {
    const t = easeOutCubic(i / (FIGHT_FRAMES_A - 1))
    const ax = Math.round(axStartX + (axFinalX - axStartX) * t)
    const frame = bg.clone()
    frame.composite(getAIdleFrame(fIdx), ax, aY)
    await saveFrame(outFramesDir, fIdx++, frame)
  }

  // A stats zoom
  {
    const focusBoxA = {
      cx: axFinalX + Math.floor(A_idle.bitmap.width / 2),
      cy: aY + Math.floor(A_idle.bitmap.height * 0.55),
      w: A_idle.bitmap.width,
      h: A_idle.bitmap.height,
    }
    fIdx = await zoomStatsSequence({
      baseFrameBuilder: buildFrameAEmote,
      bgW,
      bgH,
      focusBox: focusBoxA,
      statsPanelImage: statsPanelA,
      movePanelImage: movePanelA,
      outFramesDir,
      framesSoFar: fIdx,
      audioTimeline,
      emoteCueKind: 'emoteA',
    })
  }

  for (let i = 0; i < EMOTE_FRAMES; i++) {
    const frame = bg.clone()
    frame.composite(getAIdleFrame(fIdx), axFinalX, aY)
    await saveFrame(outFramesDir, fIdx++, frame)
  }

  // B floats in
  for (let i = 0; i < FIGHT_FRAMES_B; i++) {
    const t = easeOutCubic(i / (FIGHT_FRAMES_B - 1))
    const bx = Math.round(bxStartX + (bxFinalX - bxStartX) * t)
    const frame = bg.clone()
    frame.composite(getAIdleFrame(fIdx), axFinalX, aY)
    frame.composite(getBIdleFrame(fIdx), bx, bY)
    await saveFrame(outFramesDir, fIdx++, frame)
  }

  // B stats zoom
  {
    const focusBoxB = {
      cx: bxFinalX + Math.floor(B_idle.bitmap.width / 2),
      cy: bY + Math.floor(B_idle.bitmap.height * 0.55),
      w: B_idle.bitmap.width,
      h: B_idle.bitmap.height,
    }
    fIdx = await zoomStatsSequence({
      baseFrameBuilder: buildFrameBEmote,
      bgW,
      bgH,
      focusBox: focusBoxB,
      statsPanelImage: statsPanelB,
      movePanelImage: movePanelB,
      outFramesDir,
      framesSoFar: fIdx,
      audioTimeline,
      emoteCueKind: 'emoteB',
    })
  }

  for (let i = 0; i < EMOTE_FRAMES; i++) {
    const frame = bg.clone()
    frame.composite(getAIdleFrame(fIdx), axFinalX, aY)
    frame.composite(getBIdleFrame(fIdx), bxFinalX, bY)
    await saveFrame(outFramesDir, fIdx++, frame)
  }

  /* ===== COOLDOWN-BASED DUEL ===== */
  let A_HP = Math.max(1, Math.round(aStats.health))
  let B_HP = Math.max(1, Math.round(bStats.health))
  const A_MAX = A_HP
  const B_MAX = B_HP


// Cooldown model:
// - store base cooldown for the *current* move on cooldown
// - store progress 0..1; per-frame progress increments by dt / effectiveTotal
// - if speed changes mid-cooldown, effectiveTotal changes immediately and remaining time re-scales
// ---- Cooldown model (base CD + progress) ----
let baseCdA = 0
let baseCdB = 0
let progA = 1 // 1 = ready
let progB = 1 // 1 = ready

let cdA = 0
let cdB = 0
let totalCdA = 1
let totalCdB = 1

const dt = 1 / FIGHT_FPS

function recomputeCooldownClocks() {
  const spA = getEffectiveSpeed(aStats, A_effectTotals, arenaMap)
  const spB = getEffectiveSpeed(bStats, B_effectTotals, arenaMap)

  totalCdA = Math.max(0.1, computeEffectiveCooldownSeconds(baseCdA, spA) || 0.1)
  totalCdB = Math.max(0.1, computeEffectiveCooldownSeconds(baseCdB, spB) || 0.1)

  cdA = (baseCdA > 0 && progA < 1) ? roundToTenth((1 - progA) * totalCdA) : 0
  cdB = (baseCdB > 0 && progB < 1) ? roundToTenth((1 - progB) * totalCdB) : 0

  if (cdA < 0) cdA = 0
  if (cdB < 0) cdB = 0
}

function tickCooldowns() {
  if (baseCdA > 0 && progA < 1) {
    const spA = getEffectiveSpeed(aStats, A_effectTotals, arenaMap)
    const totA = Math.max(0.1, computeEffectiveCooldownSeconds(baseCdA, spA))
    progA = Math.min(1, progA + dt / totA)
  }
  if (baseCdB > 0 && progB < 1) {
    const spB = getEffectiveSpeed(bStats, B_effectTotals, arenaMap)
    const totB = Math.max(0.1, computeEffectiveCooldownSeconds(baseCdB, spB))
    progB = Math.min(1, progB + dt / totB)
  }

  recomputeCooldownClocks()
}

// initialize
recomputeCooldownClocks()

if (startItemEffectEvents.length) {
  fIdx = await animateItemEffectEvents({
    events: startItemEffectEvents,
    animateEffectPopup,
    animateResistPopup,
    framesSoFar: fIdx,
    cdA,
    cdB,
    A_HP,
    A_MAX,
    B_HP,
    B_MAX,
  })
  recomputeCooldownClocks()
}




  // Draw an idle frame and tick cooldown bars down toward 0
    const drawIdleFrameAndTick = async () => {
      tickCooldowns()

      const frame = bg.clone()
      frame.composite(getAIdleFrame(fIdx), axFinalX, aY)
      frame.composite(getBIdleFrame(fIdx), bxFinalX, bY)

      await drawBarsAndEffects(frame, cdA, cdB, A_HP, A_MAX, B_HP, B_MAX)
      await saveFrame(outFramesDir, fIdx++, frame)
    }





    const pickMoveFor = (side) => {
    if (side === 'A') {
      const options = [
        {
          meta: aMoveMetaA,
          spritePose: A_moveA,
          visualImg: projA_A,
          visualFrames: projA_AFrames,
        },
        {
          meta: aMoveMetaB,
          spritePose: A_moveB,
          visualImg: projA_B,
          visualFrames: projA_BFrames,
        },
        {
          meta: aMoveMetaC,
          spritePose: A_moveC,
          visualImg: projA_C,
          visualFrames: projA_CFrames,
        },
      ].filter(o => o.meta) // safeguard if any move is missing

      const idx = Math.floor(Math.random() * options.length)
      return options[idx]
    } else {
      const options = [
        {
          meta: bMoveMetaA,
          spritePose: B_moveA,
          visualImg: projB_A,
          visualFrames: projB_AFrames,
        },
        {
          meta: bMoveMetaB,
          spritePose: B_moveB,
          visualImg: projB_B,
          visualFrames: projB_BFrames,
        },
        {
          meta: bMoveMetaC,
          spritePose: B_moveC,
          visualImg: projB_C,
          visualFrames: projB_CFrames,
        },
      ].filter(o => o.meta)

      const idx = Math.floor(Math.random() * options.length)
      return options[idx]
    }
  }


   for (let i = 0; i < 6; i++) await drawIdleFrameAndTick()

    duel_loop: while (A_HP > 0 && B_HP > 0) {
    // 1) While both are cooling down, just show idle frames and tick cd
    while (
      A_HP > 0 &&
      B_HP > 0 &&
      cdA > 0 &&
      cdB > 0
    ) {
      await drawIdleFrameAndTick()
    }



    if (A_HP <= 0 || B_HP <= 0) break duel_loop

    // 2) Decide who acts:
    let actor = null
    if (cdA <= 0 && cdB <= 0) {
      // Both ready: use EFFECT-ADJUSTED speed for the tiebreaker
      const adjA = computeAttackerAdjustedStats(
        aStats,
        A_effectTotals
      )
      const adjB = computeAttackerAdjustedStats(
        bStats,
        B_effectTotals
      )

      const speedA = adjA.speed || aStats.speed || 0
      const speedB = adjB.speed || bStats.speed || 0

      if (speedA === speedB) {
        actor = Math.random() < 0.5 ? 'A' : 'B'
      } else {
        actor = speedA > speedB ? 'A' : 'B'
      }
    } else if (cdA <= 0) {
      actor = 'A'
    } else if (cdB <= 0) {
      actor = 'B'
    }

    // Safety fallback (shouldn't normally happen)
    if (!actor) {
      await drawIdleFrameAndTick()
      continue
    }

        // 3) Apply DOT/HoT only to this actor, right before they move
    await applyOngoingEffectsForSide(actor, fIdx)

    if (A_HP <= 0 || B_HP <= 0) break duel_loop

    const { meta, spritePose, visualImg, visualFrames = [] } = pickMoveFor(actor)

    const isA = actor === 'A'
    const actorIdle = isA ? A_idle : B_idle
    const defIdle = isA ? B_idle : A_idle
    const actorX = isA ? axFinalX : bxFinalX
    const actorY = isA ? aY : bY
    const defX = isA ? bxFinalX : axFinalX
    const defY = isA ? bY : aY
    const actorIdleSprite = isA ? A_idle : B_idle

    // Align stationary casting frames by their visible pixels instead of
// their raw canvas size. Some generated move frames have uneven
// transparent padding, which can make ranged/magic casts blink sideways
// for a frame when switching from idle to the move sheet.
const opaqueBoundsCache = new WeakMap()

const getOpaqueBounds = (img, alphaThreshold = 8) => {
  if (!img?.bitmap?.data) {
    return {
      x: 0,
      y: 0,
      w: img?.bitmap?.width || 1,
      h: img?.bitmap?.height || 1,
    }
  }

  const cached = opaqueBoundsCache.get(img)
  if (cached) return cached

  const { width, height, data } = img.bitmap
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > alphaThreshold) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  const bounds =
    maxX >= minX && maxY >= minY
      ? {
          x: minX,
          y: minY,
          w: maxX - minX + 1,
          h: maxY - minY + 1,
        }
      : { x: 0, y: 0, w: width, h: height }

  opaqueBoundsCache.set(img, bounds)
  return bounds
}

const getAlignedMovePoseAtIdle = (sprite) => {
  const idleBounds = getOpaqueBounds(actorIdleSprite)
  const spriteBounds = getOpaqueBounds(sprite)

  const idleVisualCenterX =
    actorX + idleBounds.x + idleBounds.w / 2
  const idleVisualBottomY =
    actorY + idleBounds.y + idleBounds.h

  return {
    x: Math.round(
      idleVisualCenterX -
        (spriteBounds.x + spriteBounds.w / 2)
    ),
    y: Math.round(
      idleVisualBottomY -
        (spriteBounds.y + spriteBounds.h)
    ),
  }
}

const moveKind = getExplicitMoveKind(meta)
const buff = moveKind === 'buff'
const curse = moveKind === 'curse'
const category = meta.type
const isMeleeMove = String(category || '').substring(0, 5) === 'melee'
const shouldStationaryAlignMovePose = !buff && !isMeleeMove

const compositeActorMoveSprite = (frame, sprite, x = actorX, y = actorY) => {
  const pose = shouldStationaryAlignMovePose
    ? getAlignedMovePoseAtIdle(sprite)
    : { x, y }

  frame.composite(sprite, pose.x, pose.y)
  return pose
}
    const moveFrameSets = isA
      ? [A_moveAFrames, A_moveBFrames, A_moveCFrames]
      : [B_moveAFrames, B_moveBFrames, B_moveCFrames]
    const moveMetas = isA
      ? [aMoveMetaA, aMoveMetaB, aMoveMetaC]
      : [bMoveMetaA, bMoveMetaB, bMoveMetaC]
    const currentMoveId = String(meta?.id || meta?.name || '').toLowerCase()
    const currentMoveIndex = Math.max(
      0,
      moveMetas.findIndex(
        (candidate) =>
          String(candidate?.id || candidate?.name || '').toLowerCase() === currentMoveId
      )
    )
    const currentMoveCharacterFrames = moveFrameSets[currentMoveIndex] || []
    const moveCharacterFrameCount = Math.max(1, currentMoveCharacterFrames.length || 1)
    const moveEffectFrameCount = Math.max(1, visualFrames.length || 1)
    const moveOneShotDuration = getOneShotMoveDuration(
      moveCharacterFrameCount,
      moveEffectFrameCount
    )

    let movePlaybackFrame = 0
    let heldActorX = actorX
    let heldActorY = actorY

    const getActorMoveSprite = (localFrameIndex = 0) =>
      pickOneShotMoveCharacterFrame(
        currentMoveCharacterFrames,
        localFrameIndex,
        spritePose
      )

    const nextActorMoveSprite = () => {
      const frame = getActorMoveSprite(movePlaybackFrame)
      movePlaybackFrame += 1
      return frame
    }

    let projectileMovePlaybackFrame = 2
    const nextProjectileActorMoveSprite = () => {
      const frame = getActorMoveSprite(
        Math.floor(projectileMovePlaybackFrame / 2)
      )
      projectileMovePlaybackFrame += 1
      return frame
    }

    const getHeldActorMoveSprite = () =>
      getActorMoveSprite(moveOneShotDuration + 999)

    // "wind-up" frame
{
  const frame = bg.clone()
  const windUpSprite = nextActorMoveSprite()

  if (isA) {
    compositeActorMoveSprite(frame, windUpSprite)
    frame.composite(getBIdleFrame(fIdx), bxFinalX, bY)
  } else {
    frame.composite(getAIdleFrame(fIdx), axFinalX, aY)
    compositeActorMoveSprite(frame, windUpSprite)
  }

  await drawBarsAndEffects(frame, cdA, cdB, A_HP, A_MAX, B_HP, B_MAX)

  await saveFrame(outFramesDir, fIdx++, frame)
}

let impactTimeSec = null

        if (buff) {
      // ===== BUFF MOVE: SELF-CAST, FLOATING EFFECT FROM TOP, HEAL CASTER =====
      const framesBuff = getOneShotMoveDuration(
        4,
        Math.max(1, visualFrames.length)
      )

      const charTopY = actorY
      const startX =
        actorX +
        Math.floor(spritePose.bitmap.width / 2) -
        Math.floor(visualImg.bitmap.width / 2)
      const startY = charTopY - visualImg.bitmap.height
      const endY =
        startY -
        Math.floor(spritePose.bitmap.height * 0.5)

      const buffStartFrame = fIdx

      for (let i = 0; i < framesBuff; i++) {
        const t = easeOutCubic(i / Math.max(1, framesBuff - 1))
        const y = Math.round(startY + (endY - startY) * t)
        const x = Math.round(startX)
        const frame = bg.clone()

        if (isA) {
          frame.composite(nextActorMoveSprite(), actorX, actorY)
          frame.composite(isA ? getBIdleFrame(fIdx) : getAIdleFrame(fIdx), defX, defY)
        } else {
          frame.composite(getAIdleFrame(fIdx), axFinalX, aY)
          frame.composite(nextActorMoveSprite(), actorX, actorY)
        }

        await drawBarsAndEffects(frame, cdA, cdB, A_HP, A_MAX, B_HP, B_MAX)

        const currentVisualImg = pickOneShotMoveEffectFrame(visualFrames, i, visualImg)
        if (currentVisualImg) {
          frame.composite(currentVisualImg, x, y)
        }

        await saveFrame(outFramesDir, fIdx++, frame)
      }

      impactTimeSec =
        (buffStartFrame + framesBuff - 1) / FIGHT_FPS

      audioTimeline.push(
        isA ? 'emoteA' : 'emoteB',
        impactTimeSec
      )

      const actorChampion = {
        side: isA ? 'A' : 'B',
        stats: isA ? aStats : bStats,
        effects: isA ? A_effectTotals : B_effectTotals,
        charObj: isA ? aCharObj : bCharObj,
      }
      const isCritical = rollChampionSkillCritical(actorChampion, arenaMap)
      const buffCritMultiplier = isCritical
        ? getCritDamagePercentValue(actorChampion.stats, actorChampion.charObj) / 100
        : 1

    // Heal for the damage this move would deal (same damage formula, with stats/effects)
      const { dmg: healAmountRaw } = calcDamageRPG({
        movePower: meta.power,
        category: meta.type,
        attackerStats: isA ? aStats : bStats,
        defenderStats: isA ? bStats : aStats,
        attackerEffects: isA ? A_effectTotals : B_effectTotals,
        defenderEffects: isA ? B_effectTotals : A_effectTotals,
        arenaMap,
      })
      const healAmount = Math.max(1, Math.round(healAmountRaw * buffCritMultiplier))


      if (isA) {
        const prev = A_HP
        const newHp = Math.min(A_MAX, prev + healAmount)
        const popupX =
          axFinalX +
          Math.floor(A_idle.bitmap.width / 2) -
          10
        const popupY = aY - 10
          fIdx = await animateHealRise({
          bg,
          axX: axFinalX,
          aY,
          A_sprite: A_idle,
          bxX: bxFinalX,
          bY,
          B_sprite: B_idle,
          outFramesDir,
          framesSoFar: fIdx,
          fromHp: prev,
          toHp: newHp,
          maxHp: A_MAX,
          side: 'A',
          otherHp: B_HP,
          otherMaxHp: B_MAX,
          barW: HEALTH_BAR_W,
          barH: HEALTH_BAR_H,
          frames: 20,
          popupText: `+${formatPopupNumber(healAmount)}`,
          popupTextScale: isCritical ? CRIT_POPUP_SCALE : 1,
          popupStartX: popupX,
          popupStartY: popupY,
          popupRisePx: 36,
          effectIcons,
          effectTotalsFont,
          A_effectTotals,
          B_effectTotals,
          cdA,
          totalCdA,
          cdB,
          totalCdB,
          aStats,
          bStats
        })

        A_HP = newHp

        // Apply buff effect to caster, 2× potency (buffs never get resisted)
        const effEv = applyEffectStacksForMove(meta, moveKind, true, buffCritMultiplier)
        recomputeCooldownClocks()

        if (effEv && effEv.effectName) {
          // Buffs always applied ⇒ no RESIST popup here
          if (!effEv.resisted && effEv.amount > 0) {
            fIdx = await animateEffectPopup({
              targetSide: effEv.targetSide,
              effectName: effEv.effectName,
              amount: effEv.amount,
              framesSoFar: fIdx,
              cdA,
              cdB,
              A_HP,
              A_MAX,
              B_HP,
              B_MAX,
            })
          }
        }

      } else {
      const prev = B_HP
      const newHp = Math.min(B_MAX, prev + healAmount)
      const popupX =
        bxFinalX +
        Math.floor(B_idle.bitmap.width / 2) -
        10
      const popupY = bY - 10

      fIdx = await animateHealRise({
        bg,
        axX: axFinalX,
        aY,
        A_sprite: A_idle,
        bxX: bxFinalX,
        bY,
        B_sprite: B_idle,
        outFramesDir,
        framesSoFar: fIdx,
        fromHp: prev,    
        toHp: newHp,     
        maxHp: B_MAX,   
        side: 'B',        
        otherHp: A_HP,   
        otherMaxHp: A_MAX,
        barW: HEALTH_BAR_W,
        barH: HEALTH_BAR_H,
        frames: 20,
        popupText: `+${formatPopupNumber(healAmount)}`,
        popupTextScale: isCritical ? CRIT_POPUP_SCALE : 1,
        popupStartX: popupX,
        popupStartY: popupY,
        popupRisePx: 36,
        effectIcons,
        effectTotalsFont,
        A_effectTotals,
        B_effectTotals,
        cdA,
        totalCdA,
        cdB,
        totalCdB,
        aStats,
        bStats
      })

      B_HP = newHp

        const effEv = applyEffectStacksForMove(meta, moveKind, false, buffCritMultiplier)
        recomputeCooldownClocks()

      if (effEv && effEv.effectName) {
        if (!effEv.resisted && effEv.amount > 0) {
          fIdx = await animateEffectPopup({
            targetSide: effEv.targetSide,
            effectName: effEv.effectName,
            amount: effEv.amount,
            framesSoFar: fIdx,
            cdA,
            cdB,
            A_HP,
            A_MAX,
            B_HP,
            B_MAX,
          })
        }
      }

    }

    } else if (category.substring(0,5) === 'melee') {
      // ===== MELEE ATTACK (movement + short projectile) =====

      // Small horizontal gap between attacker and defender
      const gap = Math.round(
        Math.min(A_idle.bitmap.width, B_idle.bitmap.width) * 0.08
      )

      // Where the attacker ends up when they are "in melee range"
      const attackX_A =
        bxFinalX - gap - spritePose.bitmap.width      // A attacks from the left
      const attackX_B =
        axFinalX + A_idle.bitmap.width + gap         // B attacks from the right

      // Unified "melee position" for this actor
      const attackX = isA ? attackX_A : attackX_B
      heldActorX = attackX
      heldActorY = actorY

      // --- 1) Approach to melee range ---
      for (let i = 0; i < PHYS_APPROACH_FRAMES; i++) {
        const t = easeOutCubic(i / (PHYS_APPROACH_FRAMES - 1))

        // Actor slides from idleX → attackX
        const actorPosX = Math.round(actorX + (attackX - actorX) * t)

        const frame = bg.clone()
        if (isA) {
          frame.composite(nextActorMoveSprite(), actorPosX, actorY)
          frame.composite(isA ? getBIdleFrame(fIdx) : getAIdleFrame(fIdx), defX, defY)
        } else {
          frame.composite(getAIdleFrame(fIdx), axFinalX, aY)
          frame.composite(nextActorMoveSprite(), actorPosX, actorY)
        }

        await drawBarsAndEffects(
          frame,
          cdA,
          cdB,
          A_HP,
          A_MAX,
          B_HP,
          B_MAX
        )

        await saveFrame(outFramesDir, fIdx++, frame)
      }

      // --- 2) Short melee "projectile"/impact close to defender ---
      // Melee VFX travels a short distance near the defender
      const projY =
        actorY +
        Math.floor(spritePose.bitmap.height * 0.5) -
        Math.floor(visualImg.bitmap.height / 2) -
        50

      // Start the melee effect directly from the attacking-side edge of the
      // move character animation: right edge when attacking right, left edge
      // when attacking left.
      const startX = isA
        // Character A attacks to the right; mirror B's 90px inward offset.
        ? attackX + spritePose.bitmap.width - 90
        // Character B attacks to the left; mirror A's 90px inward offset.
        : attackX - visualImg.bitmap.width + 90

      const meleeTravel = Math.round(spritePose.bitmap.width * 0.25)

      const endX = isA
        ? startX + meleeTravel
        : startX - meleeTravel

      const projStart = fIdx
      const meleeEffectFrames = getOneShotMoveDuration(4, Math.max(1, visualFrames.length || 1))
      for (let i = 0; i < meleeEffectFrames; i++) {
        const t = easeOutCubic(i / Math.max(1, meleeEffectFrames - 1))
        const x = Math.round(startX + (endX - startX) * t)
        const y = projY

        const frame = bg.clone()

        if (isA) {
          // A is left, in melee position
          frame.composite(nextActorMoveSprite(), attackX, actorY)
          frame.composite(getBIdleFrame(fIdx), bxFinalX, bY)
        } else {
          // A idle on left, B is right attacker
          frame.composite(getAIdleFrame(fIdx), axFinalX, aY)
          frame.composite(nextActorMoveSprite(), attackX, actorY)
        }

        // Melee move visual: run through every effect frame once and pause
        // slightly on the last effect frame before it disappears.
        const currentVisualImg = pickOneShotMoveEffectFrame(visualFrames, i, visualImg)
        if (currentVisualImg) {
          frame.composite(currentVisualImg, x, y)
        }

        // Bars + ALWAYS-ON applied effects
        await drawBarsAndEffects(
          frame,
          cdA,
          cdB,
          A_HP,
          A_MAX,
          B_HP,
          B_MAX
        )

        await saveFrame(outFramesDir, fIdx++, frame)
      }

      impactTimeSec =
        (projStart + meleeEffectFrames - 1) / FIGHT_FPS

      // --- 3) Retreat back to idle position ---
      for (let i = 0; i < PHYS_RETREAT_FRAMES; i++) {
        const t = easeInOut(i / (PHYS_RETREAT_FRAMES - 1))

        // Actor slides from attackX → actorX
        const actorPosX = Math.round(attackX + (actorX - attackX) * t)

        const frame = bg.clone()
        if (isA) {
          frame.composite(nextActorMoveSprite(), actorPosX, actorY)
          frame.composite(isA ? getBIdleFrame(fIdx) : getAIdleFrame(fIdx), defX, defY)
        } else {
          frame.composite(getAIdleFrame(fIdx), axFinalX, aY)
          frame.composite(nextActorMoveSprite(), actorPosX, actorY)
        }

        await drawBarsAndEffects(
          frame,
          cdA,
          cdB,
          A_HP,
          A_MAX,
          B_HP,
          B_MAX
        )

        await saveFrame(outFramesDir, fIdx++, frame)
      }

      // After melee retreat completes, immediately return the attacker to idle
      // at its original position while damage/effects resolve.
      clearHeldMoveFrame()


    } else {
      // ===== RANGED / MAGIC ATTACK (projectile / curse) =====
      // Symmetric logic for both sides:
      // - Projectiles start one character-width in front of the caster
      //   toward the defender.
      // - They end one character-width before the defender.
      const actorCenterX =
        actorX + Math.floor(actorIdleSprite.bitmap.width / 2)
      const defCenterX =
        defX + Math.floor(defIdle.bitmap.width / 2)

      const dir = defCenterX >= actorCenterX ? 1 : -1

      // Ranged/magic/curse VFX starts directly on the attacker-facing edge
      // and travels until it is centered over the defender.
      const startX = dir === 1
        ? actorX + actorIdleSprite.bitmap.width
        : actorX - visualImg.bitmap.width

      const endX =
        defCenterX - Math.floor(visualImg.bitmap.width / 2)

      const projY =
        actorY +
        Math.floor(spritePose.bitmap.height * 0.5) -
        Math.floor(visualImg.bitmap.height / 2) -
        60

      const projectileLaunchDelayFrames = Math.round(FIGHT_FPS * 1.5)
      for (let i = 0; i < projectileLaunchDelayFrames; i++) {
        const frame = bg.clone()
        const actorSprite = nextProjectileActorMoveSprite()
        const actorPose = getAlignedMovePoseAtIdle(actorSprite)

        if (isA) {
          frame.composite(actorSprite, actorPose.x, actorPose.y)
          frame.composite(getBIdleFrame(fIdx), bxFinalX, bY)
        } else {
          frame.composite(getAIdleFrame(fIdx), axFinalX, aY)
          frame.composite(actorSprite, actorPose.x, actorPose.y)
        }

        await drawBarsAndEffects(
          frame,
          cdA,
          cdB,
          A_HP,
          A_MAX,
          B_HP,
          B_MAX
        )

        await saveFrame(outFramesDir, fIdx++, frame)
      }

      const projStart = fIdx
      fIdx = await drawProjectileSequence({
        bg,
        outFramesDir,
        startX,
        startY: projY,
        endX,
        endY: projY,
        framesSoFar: fIdx,
        projectileImg: visualImg,
        projectileFrames: visualFrames,
        layerLeft: async (frame, localFrame) => {
          // Left side is always A’s side visually.
          if (isA) {
            const actorSprite = nextProjectileActorMoveSprite()
            const actorPose = getAlignedMovePoseAtIdle(actorSprite)
            frame.composite(actorSprite, actorPose.x, actorPose.y)
          } else {
            frame.composite(getAIdleFrame(projStart + localFrame), axFinalX, aY)
          }
        },
        layerRight: async (frame, localFrame) => {
          // Right side is always B’s side visually.
          if (isA) {
            frame.composite(getBIdleFrame(projStart + localFrame), bxFinalX, bY)
          } else {
            const actorSprite = nextProjectileActorMoveSprite()
            const actorPose = getAlignedMovePoseAtIdle(actorSprite)
            frame.composite(actorSprite, actorPose.x, actorPose.y)
          }
        },
        bars: {
          axX: axFinalX,
          aY,
          A_sprite: A_idle,
          bxX: bxFinalX,
          bY,
          B_sprite: B_idle,
          A_HP,
          A_MAX,
          B_HP,
          B_MAX,
          barW: HEALTH_BAR_W,
          barH: HEALTH_BAR_H,
          cdA,
          cdB,
          totalCdA,
          totalCdB,
        },
        effectIcons,
        effectTotalsFont,
        A_effectTotals,
        B_effectTotals,
        aStats,
        bStats,
      })


      impactTimeSec =
        (projStart + getOneShotMoveDuration(4, Math.max(1, visualFrames.length || 1)) - 1) / FIGHT_FPS
    }

    // Damage, miss, resist, and effect popups must happen with both
    // characters in idle stance. Clear any held move frame before all
    // popup/HP/effect resolution starts.
    clearHeldMoveFrame()



        // ===== AUDIO + DAMAGE/EFFECTS (non-buff only) =====
    if (!buff) {
      const hitRoll = Math.random() * 100

      // Accuracy adjusted by attacker effects (paralyze, drown, focus, etc.)
      const attackerEffs = isA ? A_effectTotals : B_effectTotals
      const atkAdj = computeAttackerStatAdjustments(attackerEffs, arenaMap)
      const itemAccuracyBonus = getMoveAccuracyBonusFromGainedEffects(
        meta,
        isA ? aGainedItemEffects : bGainedItemEffects
      )
      const baseAcc = clamp(
        Number(meta.accuracy || 0) +
          Number((isA ? aStats : bStats)?.accuracy || 0) +
          Number(atkAdj.accuracyAdj || 0) +
          itemAccuracyBonus,
        0,
        100
      )

      const hits = hitRoll <= baseAcc
      audioTimeline.push(hits ? 'hit' : 'miss', impactTimeSec)

      if (hits) {
        const moveEffectKey = String(meta.effect_name || meta.effect || '').trim().toLowerCase()
        const actorChampion = {
          side: isA ? 'A' : 'B',
          stats: isA ? aStats : bStats,
          effects: isA ? A_effectTotals : B_effectTotals,
          charObj: isA ? aCharObj : bCharObj,
        }
        const targetChampion = {
          side: isA ? 'B' : 'A',
          stats: isA ? bStats : aStats,
          effects: isA ? B_effectTotals : A_effectTotals,
          charObj: isA ? bCharObj : aCharObj,
        }
        const isCritical = rollChampionSkillCritical(actorChampion, arenaMap)
        const movePower = meta.power
        const attackerEffects = attackerEffs
        const defenderEffects = isA ? B_effectTotals : A_effectTotals

        const { dmg: baseDamage } = calcDamageRPG({
          movePower,
          category: meta.type,
          attackerStats: isA ? aStats : bStats,
          defenderStats: isA ? bStats : aStats,
          attackerEffects,
          defenderEffects,
          arenaMap,
        })
        const dmg = Math.max(0, Math.round(applyChampionSkillCriticalDamage(
          baseDamage + getChampionSkillDamageBonus({ actor: actorChampion, target: targetChampion, moveEffectKey }),
          actorChampion,
          isCritical
        )))


        // Hit flash (bars + effects are handled inside)
        fIdx = await blinkTargetFrames({
          frames: 18,
          bg,
          axX: axFinalX,
          aY,
          A_sprite: A_idle,
          bxX: bxFinalX,
          bY,
          B_sprite: B_idle,
          targetSide: isA ? 'B' : 'A',
          outFramesDir,
          framesSoFar: fIdx,
          hpA: A_HP,
          maxHpA: A_MAX,
          hpB: B_HP,
          maxHpB: B_MAX,
          barW: HEALTH_BAR_W,
          barH: HEALTH_BAR_H,
          effectIcons,
          effectTotalsFont,
          A_effectTotals,
          B_effectTotals,
          cdA,
          totalCdA,
          cdB,
          totalCdB,

          aStats,
          bStats,
        })


        if (isA) {
          // ✅ A is attacker, B is defender → animate B’s bar
          const prev = B_HP
          const newHp = Math.max(0, prev - dmg)

          if (newHp <= 0 && audioTimeline) {
            audioTimeline.push('death', impactTimeSec)
          }

          const popupX =
            bxFinalX +
            Math.floor(B_idle.bitmap.width / 2) -
            10
          const popupY = bY - 10

          const dmgText = `-${formatPopupNumber(dmg)}`


          fIdx = await animateHealthDrop({
            bg,
            axX: axFinalX,
            aY,
            A_sprite: A_idle,
            bxX: bxFinalX,
            bY,
            B_sprite: B_idle,
            outFramesDir,
            framesSoFar: fIdx,
            fromHp: prev,       // B’s old HP
            toHp: newHp,        // B’s new HP
            maxHp: B_MAX,       // B’s max
            side: 'B',          // ✅ animate B’s bar
            otherHp: A_HP,      // A stays fixed
            otherMaxHp: A_MAX,
            barW: HEALTH_BAR_W,
            barH: HEALTH_BAR_H,
            frames: 20,
            popupText: dmgText,
            popupTextScale: isCritical ? CRIT_POPUP_SCALE : 1,
            popupStartX: popupX,
            popupStartY: popupY,
            popupRisePx: 36,
            effectIcons,
            effectTotalsFont,
            A_effectTotals,
            B_effectTotals,
            cdA,
            totalCdA,
            cdB,
            totalCdB,
            aStats,
            bStats
          })

          B_HP = newHp
        } else {
          // ✅ B is attacker, A is defender → animate A’s bar
          const prev = A_HP
          const newHp = Math.max(0, prev - dmg)
          if (newHp <= 0 && audioTimeline) {
            audioTimeline.push('death', impactTimeSec)
          }

          const popupX =
            axFinalX +
            Math.floor(A_idle.bitmap.width / 2) -
            10
          const popupY = aY - 10

          const dmgText = `-${formatPopupNumber(dmg)}`


          fIdx = await animateHealthDrop({
            bg,
            axX: axFinalX,
            aY,
            A_sprite: A_idle,
            bxX: bxFinalX,
            bY,
            B_sprite: B_idle,
            outFramesDir,
            framesSoFar: fIdx,
            fromHp: prev,       // A’s old HP
            toHp: newHp,        // A’s new HP
            maxHp: A_MAX,       // A’s max
            side: 'A',          // ✅ animate A’s bar
            otherHp: B_HP,      // B stays fixed
            otherMaxHp: B_MAX,
            barW: HEALTH_BAR_W,
            barH: HEALTH_BAR_H,
            frames: 20,
            popupText: dmgText,
            popupTextScale: isCritical ? CRIT_POPUP_SCALE : 1,
            popupStartX: popupX,
            popupStartY: popupY,
            popupRisePx: 36,
            effectIcons,
            effectTotalsFont,
            A_effectTotals,
            B_effectTotals,
            cdA,
            totalCdA,
            cdB,
            totalCdB,
            aStats,
            bStats
          })

          A_HP = newHp
        }

            // Apply effect stacks *after* HP change, with RESIST check
        const effEv = applyEffectStacksForMove(meta, moveKind, isA)
        recomputeCooldownClocks()

        if (effEv && effEv.effectName) {
          if (effEv.resisted) {
            // Defender resisted the effect ⇒ RESIST popup instead
            fIdx = await animateResistPopup({
              targetSide: effEv.targetSide,
              framesSoFar: fIdx,
              cdA,
              cdB,
              A_HP,
              A_MAX,
              B_HP,
              B_MAX,
            })
          } else if (effEv.amount > 0) {
            // Effect successfully applied ⇒ normal effect popup
            fIdx = await animateEffectPopup({
              targetSide: effEv.targetSide,
              effectName: effEv.effectName,
              amount: effEv.amount,
              framesSoFar: fIdx,
              cdA,
              cdB,
              A_HP,
              A_MAX,
              B_HP,
              B_MAX,
            })
          }
        }

        const itemHitEvents = applyItemOnHitEffects({
          actorSide: isA ? 'A' : 'B',
          category,
          A_effectTotals,
          B_effectTotals,
          aItemBattleEffects,
          bItemBattleEffects,
          aItemResistances,
          bItemResistances,
          aStats,
          bStats,
          aCharObj,
          bCharObj,
          arenaMap,
        })
        recomputeCooldownClocks()

        fIdx = await animateItemEffectEvents({
          events: itemHitEvents,
          animateEffectPopup,
          animateResistPopup,
          framesSoFar: fIdx,
          cdA,
          cdB,
          A_HP,
          A_MAX,
          B_HP,
          B_MAX,
        })

      }
      else {
        // Simple MISS popup over the defender
        fIdx = await animateMissPopup({
          targetSide: isA ? 'B' : 'A',
          framesSoFar: fIdx,
          cdA,
          cdB,
          A_HP,
          A_MAX,
          B_HP,
          B_MAX,
        })
      }
    }


    clearHeldMoveFrame()

    if (A_HP <= 0 || B_HP <= 0) break duel_loop

    // Cooldowns
    const cdBase = Number(meta.cooldown_seconds)
    if (!Number.isFinite(cdBase) || cdBase <= 0) {
      throw new Error(`Runtime move missing cooldown_seconds: ${meta?.name ?? meta?.id ?? '(unknown)'}`)
    }

    if (isA) {
      baseCdA = cdBase
      progA = 0
    } else {
      baseCdB = cdBase
      progB = 0
    }

    // Recompute immediately (so bars reflect the current effective speed)
    recomputeCooldownClocks()



    for (let i = 0; i < 6; i++) await drawIdleFrameAndTick()
  }

     const loser = A_HP <= 0 ? 'A' : 'B'

  let fIdx2 = await fadeOutDefeated({
    bg,
    axFinalX,
    aY,
    A_sprite: A_idle,
    bxFinalX,
    bY,
    B_sprite: B_idle,
    outFramesDir,
    framesSoFar: fIdx,
    loser,
    A_HP,
    B_HP,
    A_MAX,
    B_MAX,
    cdA,
    cdB,
    totalCdA,
    totalCdB,
    A_effectTotals,
    B_effectTotals,
    effectIcons,
  })

  const winner = loser === 'A' ? 'B' : 'A'
  const winnerName = winner === 'A' ? aName : bName

  fIdx2 = await victorySequence({
    bg,
    bgW,
    bgH,
    winner,
    axFinalX,
    aY,
    A_idle,
    A_emote,
    bxFinalX,
    bY,
    B_idle,
    B_emote,
    outFramesDir,
    framesSoFar: fIdx2,
    audioTimeline,
    winnerName,
  })

  return {
    frames: fIdx2,
    winnerSide: winner,
    loserSide: loser,
    winnerName,
  }

}

/* ===================== TEAM FIGHT SCENE (2V2 CHAMPIONS) ===================== */
const GROUP_SIDES = ['A', 'B', 'C', 'D']
const GROUP_RIGHT_FACING_SIDES = new Set(['A', 'C'])
const GROUP_LEFT_FACING_SIDES = new Set(['B', 'D'])
const GROUP_ARENA_END_GAME_ROUND = 100
const ARENA_FIGHT_TYPE_LABEL = 'TEAM FIGHT'
const TEAM_LEFT_SIDES = new Set(['A', 'C'])
const TEAM_RIGHT_SIDES = new Set(['B', 'D'])
const TEAM_LEFT_ID = 'left'
const TEAM_RIGHT_ID = 'right'

function getFighterCenter(fighter, x = fighter.x, y = fighter.y, sprite = fighter.idleImg) {
  return {
    x: x + Math.floor(sprite.bitmap.width / 2),
    y: y + Math.floor(sprite.bitmap.height * 0.55),
  }
}

function getFighterTeamId(fighter) {
  if (fighter?.teamId) return String(fighter.teamId)
  return TEAM_LEFT_SIDES.has(fighter?.side) ? TEAM_LEFT_ID : TEAM_RIGHT_ID
}

function sameTeam(a, b) {
  return Boolean(a && b && getFighterTeamId(a) === getFighterTeamId(b))
}

function getRandomLiveOpponent(fighters, actor) {
  const options = fighters.filter((fighter) => fighter.alive && !sameTeam(fighter, actor))
  return options.length ? options[Math.floor(Math.random() * options.length)] : null
}

function getLowestHealthLiveAllyOrSelf(fighters, actor) {
  const options = fighters
    .filter((fighter) => fighter.alive && sameTeam(fighter, actor))
    .sort((a, b) => (a.hp - b.hp) || (a.side === actor.side ? -1 : b.side === actor.side ? 1 : 0))
  return options[0] || actor
}

function getGroupMoveEffectAmount(meta, moveKind) {
  const basePotency = getMoveEffectBasePotency(meta)
  if (!basePotency) return 0
  return moveKind === 'buff' || moveKind === 'curse' ? basePotency * 2 : basePotency
}

async function createTeamFightFrames({
  fighters,
  backgroundPath,
  outFramesDir,
  scaleFraction = GROUP_FIGHT_SCALE_FRACTION,
  audioTimeline,
  effectIcons,
  arenaMap = null,
}) {
  if (!Array.isArray(fighters) || fighters.length !== 4) {
    throw new Error(`createTeamFightFrames expected exactly 4 fighters; got ${fighters?.length || 0}`)
  }

  ensureDir(outFramesDir)
  await emptyDir(outFramesDir)

  const bg = await Jimp.read(backgroundPath)
  const bgW = bg.bitmap.width
  const bgH = bg.bitmap.height
  const targetH = Math.max(96, Math.round(bgH * scaleFraction * 2))
  const effectTargetH = Math.max(42, Math.round(bgH * 0.13))
  const IDLE_FRAME_HOLD = 24
  const dt = 1 / FIGHT_FPS

  const font16 = await loadFontBuiltin(16, 'white')
  const font16Black = await loadFontBuiltin(16, 'black')
  const popupFont = await loadFontBuiltin(32, 'white')
  const popupFontBlack = await loadFontBuiltin(32, 'black')
  const titleFont = await loadFontBuiltin(64, 'white')
  const titleFontBlack = await loadFontBuiltin(64, 'black')
  const rewardFont = await loadFontBuiltin(32, 'white')
  const rewardFontBlack = await loadFontBuiltin(32, 'black')

  const scaleToHeight = (img, h) =>
    img.resize(Math.round(img.bitmap.width * (h / img.bitmap.height)), h)

  const loadedFighters = []
  for (let i = 0; i < fighters.length; i += 1) {
    const source = fighters[i]
    const side = GROUP_SIDES[i]
    const idleImg = scaleToHeight(await Jimp.read(source.spriteIdlePath), targetH)
    const emoteImg = scaleToHeight(await Jimp.read(source.spriteEmotePath), targetH)
    const moveImgs = []
    for (const movePath of source.spriteMovePaths) {
      moveImgs.push(scaleToHeight(await Jimp.read(movePath), targetH))
    }
    const idleFrames = await readAndScaleFrameSequence(source.spriteIdleFramePaths, targetH)
    const moveFrameSets = []
    for (const paths of source.spriteMoveFramePathSets) {
      moveFrameSets.push(await readAndScaleFrameSequence(paths, targetH))
    }
    const effectImgs = []
    for (const effectPath of source.moveEffectPaths) {
      effectImgs.push(scaleToHeight(await Jimp.read(effectPath), effectTargetH))
    }
    const effectFrameSets = []
    for (const paths of source.moveEffectFramePathSets) {
      effectFrameSets.push(await readAndScaleFrameSequence(paths, effectTargetH))
    }

    const hp = Math.max(1, Math.round(source.stats.health))
    loadedFighters.push({
      ...source,
      side,
      corner: side === 'A' ? 'top-left' : side === 'B' ? 'top-right' : side === 'C' ? 'bottom-left' : 'bottom-right',
      faces: GROUP_RIGHT_FACING_SIDES.has(side) ? 'right' : 'left',
      teamId: source.teamId || (TEAM_LEFT_SIDES.has(side) ? TEAM_LEFT_ID : TEAM_RIGHT_ID),
      teamOwnerAddress: normalizeWalletAddress(source.teamOwnerAddress || source.arena?.ownerAddress),
      idleImg,
      emoteImg,
      moveImgs,
      idleFrames,
      moveFrameSets,
      effectImgs,
      effectFrameSets,
      effects: {},
      hp,
      maxHp: hp,
      baseCd: 0,
      prog: 1,
      cd: 0,
      totalCd: 1,
      alive: true,
      eliminatedOrder: null,
    })
  }

  fighters = loadedFighters
  const marginX = Math.round(bgW * 0.075)
  const topBaseline = Math.round(bgH * 0.42)
  const bottomBaseline = Math.round(bgH * 0.87)
  for (const fighter of fighters) {
    const isRight = GROUP_LEFT_FACING_SIDES.has(fighter.side)
    const isBottom = fighter.side === 'C' || fighter.side === 'D'
    fighter.x = isRight ? bgW - marginX - fighter.idleImg.bitmap.width : marginX
    fighter.y = (isBottom ? bottomBaseline : topBaseline) - fighter.idleImg.bitmap.height
    fighter.y = clamp(fighter.y, 72, bgH - fighter.idleImg.bitmap.height - 24)
  }

  const liveFighters = () => fighters.filter((fighter) => fighter.alive)
  const liveCount = () => liveFighters().length
  const liveTeamIds = () => [...new Set(liveFighters().map(getFighterTeamId))]
  const liveTeamCount = () => liveTeamIds().length
  const getTeamFighters = (teamId) => fighters.filter((fighter) => getFighterTeamId(fighter) === teamId)
  const getLiveTeamFighters = (teamId) => liveFighters().filter((fighter) => getFighterTeamId(fighter) === teamId)
  const getWinningTeamId = () => liveTeamIds()[0] || null
  const getIdleFrame = (fighter, frameIndex) =>
    pickAnimationFrame(
      fighter.idleFrames,
      Math.floor(frameIndex / IDLE_FRAME_HOLD),
      fighter.idleImg
    )
  const getMoveSprite = (fighter, moveIndex, localFrame) =>
    pickOneShotMoveCharacterFrame(
      fighter.moveFrameSets[moveIndex] || [],
      localFrame,
      fighter.moveImgs[moveIndex]
    )
  const getEffectSprite = (fighter, moveIndex, localFrame) =>
    pickOneShotMoveEffectFrame(
      fighter.effectFrameSets[moveIndex] || [],
      localFrame,
      fighter.effectImgs[moveIndex]
    )
  const getMoveDuration = (fighter, moveIndex) =>
    getOneShotMoveDuration(
      Math.max(1, fighter.moveFrameSets[moveIndex]?.length || 1),
      Math.max(1, fighter.effectFrameSets[moveIndex]?.length || 1)
    )

  let fIdx = 0
  let eliminatedCount = 0

  function recomputeCooldown(fighter) {
    const speed = getEffectiveSpeed(fighter.stats, fighter.effects, arenaMap)
    fighter.totalCd = Math.max(
      0.1,
      computeEffectiveCooldownSeconds(fighter.baseCd, speed) || 0.1
    )
    fighter.cd =
      fighter.baseCd > 0 && fighter.prog < 1
        ? roundToTenth((1 - fighter.prog) * fighter.totalCd)
        : 0
  }

  function tickCooldowns() {
    for (const fighter of liveFighters()) {
      if (fighter.baseCd > 0 && fighter.prog < 1) {
        const speed = getEffectiveSpeed(fighter.stats, fighter.effects, arenaMap)
        const total = Math.max(0.1, computeEffectiveCooldownSeconds(fighter.baseCd, speed))
        fighter.prog = Math.min(1, fighter.prog + dt / total)
      }
      recomputeCooldown(fighter)
    }
  }

  for (const fighter of fighters) recomputeCooldown(fighter)

  function pickMoveFor(fighter) {
    const options = fighter.moveMetas
      .map((meta, index) => ({ meta, index }))
      .filter((option) => option.meta && fighter.moveImgs[option.index] && fighter.effectImgs[option.index])
    if (!options.length) throw new Error(`No usable moves found for ${fighter.name}`)
    return options[Math.floor(Math.random() * options.length)]
  }

  async function drawGroupBarsAndEffects(frame) {
    for (const fighter of fighters) {
      if (!fighter.alive) continue
      const center = getFighterCenter(fighter)
      drawHealthBar(frame, center.x, fighter.y, HEALTH_BAR_W, HEALTH_BAR_H, fighter.hp, fighter.maxHp)
      drawCooldownBar(
        frame,
        center.x,
        fighter.y - 18,
        COOLDOWN_BAR_W,
        COOLDOWN_BAR_H,
        fighter.cd,
        Math.max(0.8, fighter.totalCd || fighter.cd || 0.8)
      )
      await drawEffectSummaryRow({
        frame,
        centerX: center.x,
        barTopY: Math.max(0, fighter.y - HEALTH_BAR_H - 8),
        effects: fighter.effects,
        effectIcons,
      })

      const name = String(fighter.name || fighter.side).slice(0, 22)
      const nameW = Jimp.measureText(font16, name)
      const nameX = Math.round(center.x - nameW / 2)
      const nameY = Math.min(bgH - 20, fighter.y + fighter.idleImg.bitmap.height + 4)
      frame.print(font16Black, nameX + 1, nameY + 1, name)
      frame.print(font16, nameX, nameY, name)
    }
    if (!suppressMapHud) {
      drawArenaMapInfoPanel(frame, arenaMap, {
        font: font16,
        fontBlack: font16Black,
        titleFont: popupFont,
        titleFontBlack: popupFontBlack,
        bgW,
        y: getArenaMapInfoTopY(),
        compact: false,
        endGameRoundOverride: GROUP_ARENA_END_GAME_ROUND,
        roundNumber: battleRound,
      })
    }
  }

  async function drawFighters(frame, frameIndex = fIdx, overrides = {}) {
    const ordered = [...fighters].sort((a, b) => a.y - b.y)
    for (const fighter of ordered) {
      const override = overrides[fighter.side] || {}
      if (!fighter.alive && !override.forceDraw) continue
      if (override.hidden) continue
      const sprite = override.sprite || getIdleFrame(fighter, frameIndex)
      const alpha = override.alpha == null ? 1 : clamp(override.alpha, 0, 1)
      const drawSprite = alpha >= 1 ? sprite : sprite.clone().opacity(alpha)
      frame.composite(drawSprite, Math.round(override.x ?? fighter.x), Math.round(override.y ?? fighter.y))
    }
  }

  async function drawBattleFrame(overrides = {}) {
    const frame = bg.clone()
    await drawGroupBarsAndEffects(frame)
    await drawFighters(frame, fIdx, overrides)
    await saveFrame(outFramesDir, fIdx++, frame)
  }

  async function animateEntrance() {
    const frames = Math.max(FIGHT_FRAMES_A, FIGHT_FRAMES_B)
    for (let i = 0; i < frames; i += 1) {
      const t = easeOutCubic(i / Math.max(1, frames - 1))
      const overrides = {}
      for (const fighter of fighters) {
        const fromX = GROUP_LEFT_FACING_SIDES.has(fighter.side)
          ? bgW + 60
          : -fighter.idleImg.bitmap.width - 60
        const fromY = fighter.side === 'A' || fighter.side === 'B'
          ? -fighter.idleImg.bitmap.height - 30
          : bgH + 30
        overrides[fighter.side] = {
          x: Math.round(fromX + (fighter.x - fromX) * t),
          y: Math.round(fromY + (fighter.y - fromY) * t),
        }
      }
      await drawBattleFrame(overrides)
    }
    for (let i = 0; i < 24; i += 1) await drawBattleFrame()
  }

  function applyGroupStatusAmount({ effectKey, amount, actor, target, isBuffApplication, category = null, applyArenaApplicationBonus = true }) {
    let appliedAmount = safeNumber(amount, 0)
    if (!effectKey || !appliedAmount || !target) return null

    const normalizedEffectKey = String(effectKey || '').toLowerCase()
    const bucket = target.effects
    appliedAmount = getArenaMapApplicationAmount({
      arenaMap: applyArenaApplicationBonus ? arenaMap : null,
      effectKey: normalizedEffectKey,
      amount: appliedAmount,
      category,
      targetEffects: bucket,
    })

    if (normalizedEffectKey === 'cleanse') {
      const res = consumeCleanseFromNegatives(bucket, appliedAmount)
      if (res.remainingCleanse > 0) {
        bucket.cleanse = getStack(bucket, 'cleanse') + res.remainingCleanse
      }
      return {
        effectName: normalizedEffectKey,
        amount: appliedAmount,
        actor,
        target,
        resisted: false,
        cleansedTotal: res.removedTotal,
        cleansedByEffect: res.removedByEffect,
        cleanseGuardAdded: res.remainingCleanse,
      }
    }

    const isNegativeApplication =
      NEGATIVE_EFFECT_KEYS.has(normalizedEffectKey) &&
      !isBuffApplication &&
      !sameTeam(target, actor)

    if (isNegativeApplication) {
      const cleanseGuardResult = consumeCleanseGuardForNegativeApplication(
        bucket,
        appliedAmount
      )
      if (cleanseGuardResult.blockedAmount > 0) {
        appliedAmount = cleanseGuardResult.appliedAmount

        if (!appliedAmount) {
          return {
            effectName: normalizedEffectKey,
            amount: 0,
            actor,
            target,
            resisted: true,
            blockedBy: 'cleanse',
            cleanseBlockedAmount: cleanseGuardResult.blockedAmount,
          }
        }
      }

      const itemResistance = safeNumber(target.itemResistances?.[normalizedEffectKey], 0)
      if (itemResistance > 0 && Math.random() * 100 < itemResistance) {
        return { effectName: normalizedEffectKey, amount: 0, actor, target, resisted: true, blockedBy: 'item_resistance' }
      }

      if (Math.random() * 100 < computeDefenderResistChance(target.stats, target.effects, arenaMap)) {
        return { effectName: normalizedEffectKey, amount: 0, actor, target, resisted: true }
      }
    }

    bucket[normalizedEffectKey] = (bucket[normalizedEffectKey] || 0) + appliedAmount
    return { effectName: normalizedEffectKey, amount: appliedAmount, actor, target, resisted: false }
  }

  function applyMoveEffectStacks({ meta, moveKind, actor, target, effectAmountMultiplier = 1 }) {
    const effectNameRaw = String(meta.effect_name || meta.effect || '').trim()
    if (!effectNameRaw) return null
    const effectKey = effectNameRaw.toLowerCase()
    const effectTarget = moveKind === 'buff' ? (target || actor) : target
    if (!effectTarget) return null

    const amount = getGroupMoveEffectAmount(meta, moveKind) * Math.max(0, safeNumber(effectAmountMultiplier, 1))
    if (effectKey === 'cleanse') {
      const cleanseAmount = getArenaMapApplicationAmount({
        arenaMap,
        effectKey,
        amount: amount || 1,
        category: meta.type || meta.category,
        targetEffects: effectTarget.effects,
      })
      const res = consumeCleanseFromNegatives(effectTarget.effects, cleanseAmount)
      if (res.remainingCleanse > 0) {
        effectTarget.effects.cleanse = getStack(effectTarget.effects, 'cleanse') + res.remainingCleanse
      }
      return {
        effectName: 'cleanse',
        amount: cleanseAmount,
        target: effectTarget,
        resisted: false,
        cleansedTotal: res.removedTotal,
        cleansedByEffect: res.removedByEffect,
        cleanseGuardAdded: res.remainingCleanse,
      }
    }
    if (!amount) return null

    return applyGroupStatusAmount({
      effectKey,
      amount,
      actor,
      target: effectTarget,
      isBuffApplication: moveKind === 'buff',
      category: meta.type || meta.category,
    })
  }

  function applyGroupItemOnHitEffects({ actor, target, category }) {
    const events = []
    for (const entry of actor.itemBattleEffects || []) {
      if (entry.type !== 'gain_on_hit' && entry.type !== 'apply_on_hit') continue
      if (!shouldTriggerItemOnHit(entry, category)) continue
      const isBuffApplication = entry.type === 'gain_on_hit'
      const event = applyGroupStatusAmount({
        effectKey: entry.effectKey,
        amount: getAdjustedTriggeredItemAmount(actor.charObj, entry),
        actor,
        target: isBuffApplication ? actor : target,
        isBuffApplication,
        category,
      })
      if (event) events.push({ ...event, itemEffect: true, timing: 'on_hit' })
    }
    const arenaHitBonus = getArenaMapHitBonus(arenaMap, category)
    if (arenaHitBonus && target) {
      const event = applyGroupStatusAmount({
        effectKey: arenaHitBonus.effectKey,
        amount: getMapPassiveAppliedAmount(arenaHitBonus.amount, arenaHitBonus.effectKey, actor),
        actor,
        target,
        isBuffApplication: false,
        category,
        applyArenaApplicationBonus: false,
      })
      if (event) events.push({ ...event, itemEffect: true, timing: 'map_on_hit' })
    }
    return events
  }

  function applyGroupStartOfBattleItemEffects() {
    const events = []
    for (const actor of fighters) {
      for (const entry of actor.itemBattleEffects || []) {
        if (entry.type !== 'gain_start_of_battle' && entry.type !== 'apply_start_of_battle') continue
        const isBuffApplication = entry.type === 'gain_start_of_battle'
        const target = isBuffApplication ? actor : getRandomLiveOpponent(fighters, actor)
        if (!target) continue
        const event = applyGroupStatusAmount({
          effectKey: entry.effectKey,
          amount: getAdjustedTriggeredItemAmount(actor.charObj, entry),
          actor,
          target,
          isBuffApplication,
        })
        if (event) events.push({ ...event, itemEffect: true, timing: 'start_of_battle' })
      }
    }
    return events
  }

  async function animateFloatingText({ target, text, frames = 18, risePx = 42, icon = null }) {
    if (!target || !text) return
    const center = getFighterCenter(target)
    const baseY = target.y - 26
    for (let i = 0; i < frames; i += 1) {
      const t = i / Math.max(1, frames - 1)
      const y = baseY - Math.round(risePx * t)
      const frame = bg.clone()
      await drawGroupBarsAndEffects(frame)
      let x = center.x - Math.floor(Jimp.measureText(popupFont, text) / 2)
      if (icon) {
        const iconSize = 26
        const scaledIcon = icon.clone().contain(iconSize, iconSize, Jimp.RESIZE_BILINEAR)
        x -= Math.round(iconSize / 2)
        frame.composite(scaledIcon, x, y)
        x += iconSize + 5
      }
      frame.print(popupFontBlack, x + 1, y + 1, text)
      frame.print(popupFont, x, y, text)
      await drawFighters(frame, fIdx)
      await saveFrame(outFramesDir, fIdx++, frame)
    }
  }

  async function animateStatusEvent(event) {
    if (!event?.target) return
    if (event.resisted) {
      await animateFloatingText({ target: event.target, text: 'RESIST' })
      return
    }
    if (!event.amount) return
    await animateFloatingText({
      target: event.target,
      text: `+${formatPopupNumber(event.amount)}`,
      icon: effectIcons?.[event.effectName] || null,
    })
  }

  async function animateSkillStatusEvents(events) {
    for (const event of events || []) {
      await animateStatusEvent(event)
      if (event?.target) recomputeCooldown(event.target)
      if (event?.actor) recomputeCooldown(event.actor)
    }
  }

  async function animateStatusEventWithSkillTriggers(event, context = {}) {
    await animateStatusEvent(event)
    await animateSkillStatusEvents(applyChampionSkillAfterStatusEvent({
      event,
      actor: context.actor || event?.actor,
      target: context.target || event?.target,
      category: context.category,
      moveKind: context.moveKind,
    }))
  }

  async function animateHealthChange({ target, fromHp, toHp, text, frames = 20, textScale = 1 }) {
    const textImage = await renderOutlinedPopupText(text, textScale)
    const risePx = textScale > 1 ? 48 : 38
    const center = getFighterCenter(target)
    const textX = center.x - Math.floor(textImage.bitmap.width / 2)
    const textY = target.y - (textScale > 1 ? 34 : 18)
    for (let i = 0; i < frames; i += 1) {
      const t = i / Math.max(1, frames - 1)
      target.hp = Math.round(fromHp + (toHp - fromHp) * t)
      const frame = bg.clone()
      await drawGroupBarsAndEffects(frame)
      const y = textY - Math.round(risePx * t)
      frame.composite(textImage, textX, y)
      await drawFighters(frame, fIdx)
      await saveFrame(outFramesDir, fIdx++, frame)
    }
    target.hp = toHp
  }

  async function animateBlink(target, frames = 15) {
    for (let i = 0; i < frames; i += 1) {
      await drawBattleFrame({ [target.side]: { hidden: Math.floor(i / 3) % 2 !== 0 } })
    }
  }

  async function eliminateFighter(target) {
    if (!target.alive) return
    eliminatedCount += 1
    target.eliminatedOrder = eliminatedCount
    for (let i = 0; i < 20; i += 1) {
      const frame = bg.clone()
      await drawGroupBarsAndEffects(frame)
      await drawFighters(frame, fIdx, {
        [target.side]: {
          alpha: 1 - i / 19,
          forceDraw: true,
        },
      })
      await saveFrame(outFramesDir, fIdx++, frame)
    }
    target.alive = false
    target.hp = 0
  }

  async function applyOngoingEffectsForFighter(fighter) {
    if (!fighter.alive) return
    await animateSkillStatusEvents(applyChampionSkillBeforeTurn({ actor: fighter }))
    const delta =
      computeOngoingEffectHpDelta(fighter.effects, arenaMap) +
      getChampionSkillOngoingHpBonus(fighter)
    if (!delta || !fighter.alive) return
    const prev = fighter.hp
    const next = clamp(Math.round(prev + delta), 0, fighter.maxHp)
    if (next === prev) return
    audioTimeline?.push(delta < 0 ? 'dot' : 'hit', fIdx / FIGHT_FPS)
    await animateHealthChange({
      target: fighter,
      fromHp: prev,
      toHp: next,
      text: delta < 0 ? `-${formatPopupNumber(Math.abs(prev - next))}` : `+${formatPopupNumber(next - prev)}`,
    })
    await animateSkillStatusEvents(applyChampionSkillAfterHealthChange({
      target: fighter,
      previousHp: prev,
      nextHp: next,
      isHealing: delta > 0,
    }))
    if (fighter.hp <= 0) {
      audioTimeline?.push('death', fIdx / FIGHT_FPS)
      await eliminateFighter(fighter)
    }
  }

  function computeMeleeAttackPosition(actor, target, actorSprite) {
    const actorCenter = getFighterCenter(actor, actor.x, actor.y, actorSprite)
    const targetCenter = getFighterCenter(target)
    const dx = targetCenter.x - actorCenter.x
    const dy = targetCenter.y - actorCenter.y
    const dist = Math.max(1, Math.hypot(dx, dy))
    const stopDistance = actorSprite.bitmap.width * 0.35 + target.idleImg.bitmap.width * 0.45 + 100
    const attackCenterX = targetCenter.x - (dx / dist) * stopDistance
    const attackCenterY = targetCenter.y - (dy / dist) * stopDistance
    return {
      x: clamp(Math.round(attackCenterX - actorSprite.bitmap.width / 2), 0, bgW - actorSprite.bitmap.width),
      y: clamp(Math.round(attackCenterY - actorSprite.bitmap.height * 0.55), 24, bgH - actorSprite.bitmap.height - 24),
    }
  }

  async function animateMove({ actor, target, move, moveKind }) {
    const { meta, index: moveIndex } = move
    const visualImg = actor.effectImgs[moveIndex]
    const effectFrames = actor.effectFrameSets[moveIndex] || []
    const moveDuration = getMoveDuration(actor, moveIndex)
    let moveFrame = 0
    let impactTimeSec = fIdx / FIGHT_FPS
    const nextMoveSprite = () => getMoveSprite(actor, moveIndex, moveFrame++)

    for (let i = 0; i < 8; i += 1) {
      await drawBattleFrame({ [actor.side]: { sprite: nextMoveSprite() } })
    }

    if (moveKind === 'buff') {
      const startFrame = fIdx
      const buffTarget = target || actor
      for (let i = 0; i < moveDuration; i += 1) {
        const t = easeOutCubic(i / Math.max(1, moveDuration - 1))
        const currentVisualImg = getEffectSprite(actor, moveIndex, i)
        const x = buffTarget.x + Math.floor(buffTarget.idleImg.bitmap.width / 2) - Math.floor(currentVisualImg.bitmap.width / 2)
        const y = buffTarget.y - currentVisualImg.bitmap.height - Math.round(buffTarget.idleImg.bitmap.height * 0.28 * t)
        const frame = bg.clone()
        await drawGroupBarsAndEffects(frame)
        await drawFighters(frame, fIdx, { [actor.side]: { sprite: nextMoveSprite() } })
        frame.composite(currentVisualImg, x, y)
        await saveFrame(outFramesDir, fIdx++, frame)
      }
      return (startFrame + moveDuration - 1) / FIGHT_FPS
    }

    if (isMelee(meta.type)) {
      const firstMoveSprite = getMoveSprite(actor, moveIndex, 0)
      const attackPos = computeMeleeAttackPosition(actor, target, firstMoveSprite)
      for (let i = 0; i < PHYS_APPROACH_FRAMES; i += 1) {
        const t = easeInOut(i / Math.max(1, PHYS_APPROACH_FRAMES - 1))
        await drawBattleFrame({
          [actor.side]: {
            sprite: nextMoveSprite(),
            x: Math.round(actor.x + (attackPos.x - actor.x) * t),
            y: Math.round(actor.y + (attackPos.y - actor.y) * t),
          },
        })
      }

      const meleeEffectFrames = getOneShotMoveDuration(4, Math.max(1, effectFrames.length || 1))
      const targetCenter = getFighterCenter(target)
      const attackCenter = {
        x: attackPos.x + Math.floor(firstMoveSprite.bitmap.width / 2),
        y: attackPos.y + Math.floor(firstMoveSprite.bitmap.height * 0.55),
      }
      const effectStartX = attackCenter.x - Math.floor(visualImg.bitmap.width / 2)
      const effectStartY = attackCenter.y - Math.floor(visualImg.bitmap.height / 2)
      const effectEndX =
        targetCenter.x - Math.floor(visualImg.bitmap.width / 2)
      const effectEndY =
        targetCenter.y - Math.floor(visualImg.bitmap.height / 2)
      const projStart = fIdx
      for (let i = 0; i < meleeEffectFrames; i += 1) {
        const t = easeOutCubic(i / Math.max(1, meleeEffectFrames - 1))
        const currentVisualImg = getEffectSprite(actor, moveIndex, i)
        const x = Math.round(effectStartX + (effectEndX - effectStartX) * t)
        const y = Math.round(effectStartY + (effectEndY - effectStartY) * t)
        const frame = bg.clone()
        await drawGroupBarsAndEffects(frame)
        await drawFighters(frame, fIdx, {
          [actor.side]: {
            sprite: nextMoveSprite(),
            x: attackPos.x,
            y: attackPos.y,
          },
        })
        frame.composite(currentVisualImg, x, y)
        await saveFrame(outFramesDir, fIdx++, frame)
      }
      impactTimeSec = (projStart + meleeEffectFrames - 1) / FIGHT_FPS

      for (let i = 0; i < PHYS_RETREAT_FRAMES; i += 1) {
        const t = easeInOut(i / Math.max(1, PHYS_RETREAT_FRAMES - 1))
        await drawBattleFrame({
          [actor.side]: {
            sprite: nextMoveSprite(),
            x: Math.round(attackPos.x + (actor.x - attackPos.x) * t),
            y: Math.round(attackPos.y + (actor.y - attackPos.y) * t),
          },
        })
      }

      return impactTimeSec
    }

    const launchDelayFrames = Math.round(FIGHT_FPS * 0.75)
    for (let i = 0; i < launchDelayFrames; i += 1) {
      await drawBattleFrame({ [actor.side]: { sprite: nextMoveSprite() } })
    }

    const actorCenter = getFighterCenter(actor)
    const targetCenter = getFighterCenter(target)
    const startX = actorCenter.x - Math.floor(visualImg.bitmap.width / 2)
    const startY = actorCenter.y - Math.floor(visualImg.bitmap.height / 2)
    const endX = targetCenter.x - Math.floor(visualImg.bitmap.width / 2)
    const endY = targetCenter.y - Math.floor(visualImg.bitmap.height / 2)
    const projectileFrames = getOneShotMoveDuration(4, Math.max(1, effectFrames.length || 1))
    const projStart = fIdx

    for (let i = 0; i < projectileFrames; i += 1) {
      const t = easeOutCubic(i / Math.max(1, projectileFrames - 1))
      const currentVisualImg = getEffectSprite(actor, moveIndex, i)
      const frame = bg.clone()
      await drawGroupBarsAndEffects(frame)
      await drawFighters(frame, fIdx, { [actor.side]: { sprite: nextMoveSprite() } })
      frame.composite(
        currentVisualImg,
        Math.round(startX + (endX - startX) * t),
        Math.round(startY + (endY - startY) * t)
      )
      await saveFrame(outFramesDir, fIdx++, frame)
    }

    return (projStart + projectileFrames - 1) / FIGHT_FPS
  }

  async function resolveMove({ actor, target, move, moveKind, impactTimeSec }) {
    const { meta } = move

    if (moveKind === 'buff') {
      const buffTarget = target || actor
      const isCritical = rollChampionSkillCritical(actor, arenaMap)
      const buffCritMultiplier = isCritical
        ? getCritDamagePercentValue(actor?.stats, actor?.charObj) / 100
        : 1
      const { dmg: healAmountRaw } = calcDamageRPG({
        movePower: meta.power,
        category: meta.type,
        attackerStats: actor.stats,
        defenderStats: buffTarget.stats,
        attackerEffects: actor.effects,
        defenderEffects: buffTarget.effects,
        arenaMap,
      })
      const prev = buffTarget.hp
      const healAmount = Math.max(0, Math.round(healAmountRaw * buffCritMultiplier))
      const next = Math.min(buffTarget.maxHp, buffTarget.hp + healAmount)
      if (next > prev) {
        await animateHealthChange({
          target: buffTarget,
          fromHp: prev,
          toHp: next,
          text: `+${formatPopupNumber(next - prev)}`,
          textScale: isCritical ? CRIT_POPUP_SCALE : 1,
        })
        await animateSkillStatusEvents(applyChampionSkillAfterHealthChange({
          target: buffTarget,
          previousHp: prev,
          nextHp: next,
          isHealing: true,
        }))
      }
      await animateStatusEventWithSkillTriggers(
        applyMoveEffectStacks({ meta, moveKind, actor, target: buffTarget, effectAmountMultiplier: buffCritMultiplier }),
        { actor, target: buffTarget, category: meta.type, moveKind }
      )
      await animateSkillStatusEvents(applyChampionSkillAfterBuffMove({ actor, target: buffTarget, category: meta.type }))
      return
    }

    await animateSkillStatusEvents(applyChampionSkillBeforeDamagingMove({ actor }))
    const attackerAdj = computeAttackerStatAdjustments(actor.effects, arenaMap)
    const itemAccuracyBonus = getMoveAccuracyBonusFromGainedEffects(meta, actor.gainedItemEffects)
    const baseAcc = clamp(
      Number(meta.accuracy || 0) +
        Number(actor.stats?.accuracy || 0) +
        Number(attackerAdj.accuracyAdj || 0) +
        itemAccuracyBonus,
      0,
      100
    )
    const hits = Math.random() * 100 <= baseAcc
    audioTimeline?.push(hits ? 'hit' : 'miss', impactTimeSec)

    if (!hits) {
      await animateFloatingText({ target, text: 'MISS' })
      await animateSkillStatusEvents(applyChampionSkillAfterMiss({ actor }))
      const arenaMissBonus = getArenaMapMissBonus(arenaMap)
      if (arenaMissBonus) {
        await animateStatusEventWithSkillTriggers(
          applyGroupStatusAmount({
            effectKey: arenaMissBonus.effectKey,
            amount: getMapPassiveAppliedAmount(arenaMissBonus.amount, arenaMissBonus.effectKey, actor),
            actor,
            target: actor,
            isBuffApplication: true,
            applyArenaApplicationBonus: false,
          }),
          { actor, target: actor, category: meta.type, moveKind }
        )
      }
      return
    }

    const moveEffectKey = String(meta.effect_name || meta.effect || '').trim().toLowerCase()
    const targetHadBleed = getStack(target.effects, 'bleed') > 0
    const targetHadBurn = getStack(target.effects, 'burn') > 0
    const targetHadSlow = getStack(target.effects, 'slow') > 0
    const isCritical = rollChampionSkillCritical(actor, arenaMap)
    const { dmg } = calcDamageRPG({
      movePower: meta.power,
      category: meta.type,
      attackerStats: actor.stats,
      defenderStats: target.stats,
      attackerEffects: actor.effects,
      defenderEffects: target.effects,
      arenaMap,
    })
    const damageAmount = Math.max(0, Math.round(applyChampionSkillCriticalDamage(
      dmg + getChampionSkillDamageBonus({ actor, target, moveEffectKey }),
      actor,
      isCritical
    )))

    await animateBlink(target)

    const prev = target.hp
    const next = Math.max(0, target.hp - damageAmount)
    if (next <= 0) audioTimeline?.push('death', impactTimeSec)
    await animateHealthChange({
      target,
      fromHp: prev,
      toHp: next,
      text: `-${formatPopupNumber(damageAmount)}`,
      textScale: isCritical ? CRIT_POPUP_SCALE : 1,
    })
    await animateSkillStatusEvents(applyChampionSkillAfterHealthChange({
      target,
      previousHp: prev,
      nextHp: next,
      isHealing: false,
    }))

    await animateStatusEventWithSkillTriggers(
      applyMoveEffectStacks({ meta, moveKind, actor, target }),
      { actor, target, category: meta.type, moveKind }
    )
    for (const event of applyGroupItemOnHitEffects({ actor, target, category: meta.type })) {
      await animateStatusEventWithSkillTriggers(event, { actor, target: event?.target || target, category: meta.type, moveKind })
    }
    await animateSkillStatusEvents(applyChampionSkillAfterMoveHit({
      actor,
      target,
      category: meta.type,
      moveKind,
      moveEffectKey,
      isCritical,
      targetHadBleed,
      targetHadBurn,
      targetHadSlow,
    }))

    if (target.hp <= 0) await eliminateFighter(target)
  }

  async function animateVictory(winningTeam) {
    const winners = Array.isArray(winningTeam) ? winningTeam : [winningTeam].filter(Boolean)
    const aliveWinners = winners.filter((fighter) => fighter?.alive)
    const displayWinners = aliveWinners.length ? aliveWinners : winners
    const winnerNames = winners.map((fighter) => fighter?.name).filter(Boolean).join(' & ')
    const bannerW = Math.round(bgW * 0.66)
    const bannerH = 220
    const bannerX = Math.round((bgW - bannerW) / 2)
    const bannerY = Math.max(Math.round(bgH * 0.08), 136)
    const title = `WINNERS: ${winnerNames || 'Team'}`.slice(0, 42)
    const reward = '+40,000 Dark Coin to wallet'
    const xp = '+10 XP each winning champ'
    const wasSuppressingMapHud = suppressMapHud
    suppressMapHud = true
    try {
      for (let i = 0; i < VICTORY_BANNER_FRAMES; i += 1) {
        const frame = bg.clone()
        await drawGroupBarsAndEffects(frame)

        const panel = new Jimp(bannerW, bannerH, Jimp.cssColorToHex('#08040d'))
        panel.opacity(0.82)
        frame.composite(panel, bannerX, bannerY)

        const titleX = bannerX + Math.round((bannerW - Jimp.measureText(titleFont, title)) / 2)
        const rewardX = bannerX + Math.round((bannerW - Jimp.measureText(rewardFont, reward)) / 2)
        const xpX = bannerX + Math.round((bannerW - Jimp.measureText(rewardFont, xp)) / 2)

        frame.print(titleFontBlack, titleX + 2, bannerY + 24 + 2, title)
        frame.print(titleFont, titleX, bannerY + 24, title)
        frame.print(rewardFontBlack, rewardX + 1, bannerY + 112 + 1, reward)
        frame.print(rewardFont, rewardX, bannerY + 112, reward)
        frame.print(rewardFontBlack, xpX + 1, bannerY + 154 + 1, xp)
        frame.print(rewardFont, xpX, bannerY + 154, xp)
        const winnerOverrides = {}
        for (const winner of displayWinners) {
          winnerOverrides[winner.side] = {
            sprite: i % 20 < 10 ? winner.emoteImg : getIdleFrame(winner, fIdx),
            forceDraw: true,
          }
        }
        await drawFighters(frame, fIdx, winnerOverrides)
        await saveFrame(outFramesDir, fIdx++, frame)
      }
    } finally {
      suppressMapHud = wasSuppressingMapHud
    }
  }

  const getCurrentGroupFrame = async () => {
    const frame = bg.clone()
    await drawGroupBarsAndEffects(frame)
    await drawFighters(frame, fIdx)
    return frame
  }

  let battleRound = 0
  let arenaEndGameAnnounced = false
  let suppressMapHud = false

  const announceArenaEndGame = async () => {
    if (arenaEndGameAnnounced) return
    arenaEndGameAnnounced = true
    suppressMapHud = true
    try {
      fIdx = await animateArenaMapInfoZoom({
        baseFrameBuilder: getCurrentGroupFrame,
        arenaMap,
        outFramesDir,
        framesSoFar: fIdx,
        bgW,
        font: font16,
        fontBlack: font16Black,
        titleFont: popupFont,
        titleFontBlack: popupFontBlack,
        endGameRoundOverride: GROUP_ARENA_END_GAME_ROUND,
        roundNumber: battleRound,
        mode: 'endGame',
      })
    } finally {
      suppressMapHud = false
    }
  }

  const buildGroupArenaContestants = () =>
    liveFighters().map((fighter) => ({
      side: fighter.side,
      name: fighter.name,
      stats: fighter.stats,
      effects: fighter.effects,
      hp: fighter.hp,
      assetId: fighter.arena?.assetId,
      fighter,
    }))

  const resolveArenaEndGameAfterAction = async () => {
    const endGame = getArenaMapEndGame(arenaMap)
    if (!endGame || battleRound !== GROUP_ARENA_END_GAME_ROUND) return false

    await announceArenaEndGame()
    if (endGame.resolution?.mode !== 'decideAtRoundStart') return false

    const remainingContestants = buildGroupArenaContestants()
    if (remainingContestants.length <= 1) return false

    const winnerContestant = pickArenaMapWinner(remainingContestants, arenaMap)
    const winnerFighter = winnerContestant?.fighter
    if (!winnerFighter) return false
    const winnerTeamId = getFighterTeamId(winnerFighter)

    for (const fighter of liveFighters().filter((candidate) => getFighterTeamId(candidate) !== winnerTeamId)) {
      audioTimeline?.push('death', fIdx / FIGHT_FPS)
      await eliminateFighter(fighter)
    }
    return true
  }

  const applyArenaCascadeIfNeeded = async () => {
    const endGame = getArenaMapEndGame(arenaMap)
    if (endGame?.resolution?.mode !== 'continueUntilDefeat') return
    if (battleRound < GROUP_ARENA_END_GAME_ROUND) return

    const effectKey = String(endGame.resolution.appliedEffect || arenaMap?.effect || '').toLowerCase()
    if (!effectKey) return
    const stacks = Math.min(9999, Math.max(1, 2 ** Math.max(0, battleRound - GROUP_ARENA_END_GAME_ROUND)))

    for (const fighter of liveFighters()) {
      fighter.effects[effectKey] = getStack(fighter.effects, effectKey) + stacks
      await animateStatusEvent({
        effectName: effectKey,
        amount: stacks,
        target: fighter,
        resisted: false,
      })
      recomputeCooldown(fighter)
    }
  }

  fIdx = await animateArenaMapInfoZoom({
    baseFrameBuilder: async () => bg.clone(),
    arenaMap,
    outFramesDir,
    framesSoFar: fIdx,
    bgW,
    font: font16,
    fontBlack: font16Black,
    titleFont: popupFont,
    titleFontBlack: popupFontBlack,
    endGameRoundOverride: GROUP_ARENA_END_GAME_ROUND,
    roundNumber: battleRound,
  })

  await animateEntrance()
  for (const event of applyGroupStartOfBattleItemEffects()) {
    await animateStatusEventWithSkillTriggers(event, {
      actor: event?.actor,
      target: event?.target,
      moveKind: event?.target === event?.actor ? 'buff' : 'curse',
    })
  }
  for (let i = 0; i < 6; i += 1) await drawBattleFrame()

  let turnGuard = 0
  while (liveTeamCount() > 1 && turnGuard < 1000) {
    turnGuard += 1
    while (liveTeamCount() > 1 && !liveFighters().some((fighter) => fighter.cd <= 0)) {
      tickCooldowns()
      await drawBattleFrame()
    }
    if (liveTeamCount() <= 1) break

    const readyFighters = liveFighters().filter((fighter) => fighter.cd <= 0)
    readyFighters.sort((a, b) => {
      const speedDiff = getEffectiveSpeed(b.stats, b.effects, arenaMap) - getEffectiveSpeed(a.stats, a.effects, arenaMap)
      return speedDiff || Math.random() - 0.5
    })
    const actor = readyFighters[0]

    await applyOngoingEffectsForFighter(actor)
    if (!actor.alive || liveTeamCount() <= 1) continue

    const move = pickMoveFor(actor)
    const moveKind = getExplicitMoveKind(move.meta)
    const target = moveKind === 'buff'
      ? getLowestHealthLiveAllyOrSelf(fighters, actor)
      : getRandomLiveOpponent(fighters, actor)
    if (!target) break

    const impactTimeSec = await animateMove({ actor, target, move, moveKind })
    await resolveMove({ actor, target, move, moveKind, impactTimeSec })

    const cdBase = Number(move.meta.cooldown_seconds)
    if (!Number.isFinite(cdBase) || cdBase <= 0) {
      throw new Error(`Runtime move missing cooldown_seconds: ${move.meta?.name ?? move.meta?.id ?? '(unknown)'}`)
    }
    if (actor.alive) {
      actor.baseCd = cdBase
      actor.prog = 0
      recomputeCooldown(actor)
    }

    battleRound += 1
    if (liveTeamCount() <= 1) break
    if (await resolveArenaEndGameAfterAction()) break

    await applyArenaCascadeIfNeeded()
    if (liveTeamCount() <= 1) break

    for (let i = 0; i < 6 && liveTeamCount() > 1; i += 1) {
      tickCooldowns()
      await drawBattleFrame()
    }
  }

  if (turnGuard >= 1000) {
    console.warn('Team battle reached turn guard; choosing highest total HP team.')
    const teamScores = liveTeamIds()
      .map((teamId) => ({
        teamId,
        hp: getLiveTeamFighters(teamId).reduce((sum, fighter) => sum + fighter.hp, 0),
      }))
      .sort((a, b) => b.hp - a.hp)
    const winnerTeamId = teamScores[0]?.teamId || getWinningTeamId()
    for (const fighter of liveFighters().filter((candidate) => getFighterTeamId(candidate) !== winnerTeamId)) {
      await eliminateFighter(fighter)
    }
  }

  const winnerTeamId =
    getWinningTeamId() ||
    [...new Set(fighters.map(getFighterTeamId))]
      .map((teamId) => ({
        teamId,
        hp: getTeamFighters(teamId).reduce((sum, fighter) => sum + fighter.hp, 0),
      }))
      .sort((a, b) => b.hp - a.hp)[0]?.teamId
  const winningTeam = getTeamFighters(winnerTeamId)
  const liveWinningTeam = getLiveTeamFighters(winnerTeamId)
  const winner = liveWinningTeam[0] || winningTeam.sort((a, b) => b.hp - a.hp)[0]
  await animateVictory(winningTeam)

  return {
    frames: fIdx,
    winnerTeamId,
    winnerTeamOwner: winner?.teamOwnerAddress || winningTeam.find((fighter) => fighter.teamOwnerAddress)?.teamOwnerAddress || null,
    winnerSides: winningTeam.map((fighter) => fighter.side),
    winnerNames: winningTeam.map((fighter) => fighter.name),
    winnerAssetIds: winningTeam.map((fighter) => fighter.arena?.assetId).filter(Boolean),
    winnerSide: winningTeam.map((fighter) => fighter.side).join('/'),
    winnerName: winningTeam.map((fighter) => fighter.name).join(' & '),
    winnerAssetId: winner?.arena?.assetId,
    loserSides: fighters.filter((fighter) => getFighterTeamId(fighter) !== winnerTeamId).map((fighter) => fighter.side),
    loserAssetIds: fighters
      .filter((fighter) => getFighterTeamId(fighter) !== winnerTeamId)
      .map((fighter) => fighter.arena?.assetId)
      .filter(Boolean),
  }
}

/* ===================== VIDEO STITCH ===================== */
async function stitchFramesToVideo(
  framesDir,
  outVideoPath,
  fps = FIGHT_FPS
) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(path.join(framesDir, 'frame_%04d.png'))
      .withInputFPS(fps)
      .outputOptions(['-pix_fmt yuv420p', `-r ${fps}`])
      .videoCodec('libx264')
      .noAudio()
      .output(outVideoPath)
      .on('end', () => resolve(outVideoPath))
      .on('error', reject)
      .run()
  })
}



/* ===================== ALGOD ARENA + FIREBASE CHARACTERS ===================== */

const APP_ID = 3339943603

// Shared by darkFight.js, darkGroupFight.js, and darkTeamFight.js. Each document means a
// champion is already reserved for a battle in one of the simulators.
// Keep the existing collection name so deployed Firestore rules/data stay valid.
const ACTIVE_BATTLE_CHAMPIONS_COLLECTION = 'activeChampionFights'
const ACTIVE_BATTLE_CHAMPION_TTL_MS = 2 * 60 * 60 * 1000
const ACTIVE_BATTLE_CHAMPION_CLAIM_ATTEMPTS = 12
const ACTIVE_BATTLE_CHAMPION_SOURCE = 'darkTeamFight.js'
const RUN_INSTANCE_ID = `darkTeamFight_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`

async function findAssetHolders(assetId, { minAmount = 1, maxAccounts = 1 } = {}) {
  if (!Number.isFinite(Number(assetId))) {
    throw new Error(`findAssetHolders: invalid assetId ${assetId}`)
  }

  // One-page fetch (usually enough for NFTs)
  const { result: res } = await runIndexerRequestWithFallback(
    (indexerClient) => indexerClient.lookupAssetBalances(Number(assetId)).do(),
    `Lookup asset holders ${assetId}`
  )
  const balances = Array.isArray(res?.balances) ? res.balances : []

  const holders = balances
    .map(b => ({
      address: b.address,
      amount: Number(b.amount || 0),
      isFrozen: Boolean(b['is-frozen'] ?? b.isFrozen ?? false),
    }))
    .filter(h => h.amount >= minAmount)

  // Sort descending by amount (helpful if asset isn't strictly 1-of-1)
  holders.sort((a, b) => b.amount - a.amount)

  return holders.slice(0, maxAccounts)
}


/** Base64 key → big-endian uint (ASA ID) */
function decodeKeyToUint(rawKey) {
  if (rawKey == null) {
    throw new Error('decodeKeyToUint: missing global-state key')
  }

  if (typeof rawKey === 'number' || typeof rawKey === 'bigint') {
    return Number(rawKey)
  }

  if (rawKey instanceof Uint8Array || Array.isArray(rawKey)) {
    let value = 0n
    for (const byte of rawKey) {
      value = (value << 8n) + BigInt(byte)
    }
    return Number(value)
  }

  const keyString = String(rawKey)

  // Some newer/normalized SDK shapes may expose object keys directly.
  if (/^\\d+$/.test(keyString)) {
    return Number(keyString)
  }

  const buf = Buffer.from(keyString, 'base64')
  let value = 0n
  for (const byte of buf) {
    value = (value << 8n) + BigInt(byte)
  }
  return Number(value)
}

function normalizeGlobalState(globalStateLike) {
  if (!globalStateLike) return []

  if (Array.isArray(globalStateLike)) {
    return globalStateLike
  }

  if (globalStateLike instanceof Map) {
    return [...globalStateLike.entries()].map(([key, value]) => ({
      key,
      value,
    }))
  }

  if (typeof globalStateLike === 'object') {
    if (Array.isArray(globalStateLike['global-state'])) {
      return globalStateLike['global-state']
    }
    if (Array.isArray(globalStateLike.globalState)) {
      return globalStateLike.globalState
    }

    return Object.entries(globalStateLike).map(([key, value]) => ({
      key,
      value,
    }))
  }

  return []
}

async function fetchGlobalState(appId) {
  const { result: appInfo } = await runIndexerRequestWithFallback(
    (indexerClient) => indexerClient.lookupApplications(appId).do(),
    `Fetch global state ${appId}`
  )

  const application = appInfo?.application ?? appInfo
  const params = application?.params ?? application ?? {}

  const globalState =
    params['global-state'] ??
    params.globalState ??
    application?.['global-state'] ??
    application?.globalState ??
    []

  return normalizeGlobalState(globalState)
}

function normalizeWalletAddress(address) {
  const value = String(address || '').trim()
  return value || null
}

async function getChampionOwnerAddress(assetId) {
  try {
    const holders = await findAssetHolders(Number(assetId), {
      minAmount: 1,
      maxAccounts: 1,
    })

    return normalizeWalletAddress(holders?.[0]?.address)
  } catch (error) {
    console.warn(`⚠️ Failed to lookup owner for champion asset ${assetId}:`, error?.message || error)
    return null
  }
}

function hasUsableCharacterObject(arenaRecord) {
  return Boolean(
    arenaRecord?.exists &&
      arenaRecord?.char &&
      arenaRecord?.char?.charObj &&
      typeof arenaRecord.char.charObj === 'object'
  )
}

function getArenaRecordOwner(arenaRecord) {
  return normalizeWalletAddress(arenaRecord?.ownerAddress)
}

function sameKnownOwner(a, b) {
  const ownerA = getArenaRecordOwner(a)
  const ownerB = getArenaRecordOwner(b)

  return Boolean(ownerA && ownerB && ownerA === ownerB)
}

function allPickableChampionsOwnedBySameWallet(records) {
  const owners = records.map(getArenaRecordOwner)

  // If any owner could not be resolved, do not use the "all same owner" exception.
  if (owners.some((owner) => !owner)) return false

  return new Set(owners).size === 1
}

function pickTwoArenaChampions(validArena) {
  if (!Array.isArray(validArena) || validArena.length < 2) {
    throw new Error(
      `Need at least 2 valid arena characters in Firebase; found ${validArena?.length || 0}`
    )
  }

  const shuffled = [...validArena].sort(() => Math.random() - 0.5)

  // Exception: if every pickable champion is owned by the same wallet,
  // same-wallet fights are unavoidable, so allow it.
  if (allPickableChampionsOwnedBySameWallet(shuffled)) {
    console.log(
      '⚠️ Every pickable arena champion is owned by the same wallet, so same-wallet duel is allowed.'
    )

    return [shuffled[0], shuffled[1]]
  }

  const differentOwnerPairs = []
  const unknownOwnerFallbackPairs = []

  for (let i = 0; i < shuffled.length; i += 1) {
    for (let j = i + 1; j < shuffled.length; j += 1) {
      const a = shuffled[i]
      const b = shuffled[j]

      const ownerA = getArenaRecordOwner(a)
      const ownerB = getArenaRecordOwner(b)

      if (ownerA && ownerB && ownerA !== ownerB) {
        differentOwnerPairs.push([a, b])
        continue
      }

      // If one/both owner lookups failed, this pair is still safer than
      // knowingly pairing two champions from the same resolved wallet.
      if (!sameKnownOwner(a, b)) {
        unknownOwnerFallbackPairs.push([a, b])
      }
    }
  }

  const pairPool = differentOwnerPairs.length
    ? differentOwnerPairs
    : unknownOwnerFallbackPairs

  if (!pairPool.length) {
    throw new Error(
      'Could not pick two arena champions without matching known owners. This should only happen if owner lookup failed or the arena state is inconsistent.'
    )
  }

  const picked = pairPool[Math.floor(Math.random() * pairPool.length)]
  const [arenaA, arenaB] = picked

  console.log('Selected arena pair:', {
    assetA: arenaA.assetId,
    ownerA: arenaA.ownerAddress || 'unknown',
    assetB: arenaB.assetId,
    ownerB: arenaB.ownerAddress || 'unknown',
  })

  return picked
}

function normalizeArenaAssetId(assetId) {
  const value = Number(assetId)
  return Number.isFinite(value) && value > 0 ? value : null
}

function activeBattleChampionDocId(assetId) {
  const normalizedAssetId = normalizeArenaAssetId(assetId)
  if (!normalizedAssetId) {
    throw new Error(`Invalid champion assetId for active battle reservation: ${assetId}`)
  }
  return `champion_${normalizedAssetId}`
}

function getArenaChampionName(arenaRecord) {
  return String(
    arenaRecord?.char?.charObj?.name ||
      arenaRecord?.char?.name ||
      `Arena ${arenaRecord?.assetId ?? 'unknown'}`
  )
}

function timestampToMillis(value) {
  if (!value) return null
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (typeof value?.seconds === 'number') {
    return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1_000_000)
  }
  return null
}

function isActiveBattleChampionReservation(lockData, nowMs = Date.now()) {
  if (!lockData || typeof lockData !== 'object') return false

  if (
    lockData.status != null &&
    String(lockData.status).toLowerCase() !== 'active'
  ) {
    return false
  }

  const expiresAtMs = timestampToMillis(lockData.expiresAt)
  if (Number.isFinite(expiresAtMs)) return expiresAtMs > nowMs

  const lockedAtMs = timestampToMillis(lockData.lockedAt)
  if (Number.isFinite(lockedAtMs)) {
    return nowMs - lockedAtMs < ACTIVE_BATTLE_CHAMPION_TTL_MS
  }

  return true
}

async function readActiveBattleChampions() {
  const locksSnap = await getDocsFromServer(collection(db, ACTIVE_BATTLE_CHAMPIONS_COLLECTION))
  const nowMs = Date.now()
  const activeLocks = new Map()

  locksSnap.forEach((lockSnap) => {
    const lockData = lockSnap.data()
    if (!isActiveBattleChampionReservation(lockData, nowMs)) return

    const assetId =
      normalizeArenaAssetId(lockData.assetId) ||
      normalizeArenaAssetId(String(lockSnap.id).replace(/^champion_/, ''))

    if (!assetId) return
    activeLocks.set(String(assetId), {
      id: lockSnap.id,
      ...lockData,
      assetId,
    })
  })

  return activeLocks
}

function formatActiveBattleChampions(activeLocks) {
  return [...activeLocks.values()].map((lock) => {
    const name = lock.championName ? ` (${lock.championName})` : ''
    const opponentIds = Array.isArray(lock.opponentAssetIds)
      ? lock.opponentAssetIds
      : lock.opponentAssetId
      ? [lock.opponentAssetId]
      : []
    const opponent = opponentIds.length ? ` vs ${opponentIds.join('/')}` : ''
    const source = lock.source ? ` [${lock.source}]` : ''
    return `${lock.assetId}${name}${opponent}${source}`
  })
}

async function tryReserveArenaChampionPair(arenaA, arenaB) {
  const assetIds = [
    normalizeArenaAssetId(arenaA?.assetId),
    normalizeArenaAssetId(arenaB?.assetId),
  ]

  if (assetIds.some((assetId) => !assetId) || assetIds[0] === assetIds[1]) {
    throw new Error(
      `Cannot reserve invalid arena pair: ${arenaA?.assetId}, ${arenaB?.assetId}`
    )
  }

  const lockRefs = assetIds.map((assetId) =>
    doc(db, ACTIVE_BATTLE_CHAMPIONS_COLLECTION, activeBattleChampionDocId(assetId))
  )
  const nowMs = Date.now()
  const expiresAtMillis = nowMs + ACTIVE_BATTLE_CHAMPION_TTL_MS
  const expiresAt = Timestamp.fromMillis(expiresAtMillis)
  const fightId = `fight_${assetIds.join('_')}_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2, 10)}`
  const pairKey = [...assetIds].sort((a, b) => a - b).join('_')
  const arenaRecords = [arenaA, arenaB]

  const claimed = await runTransaction(db, async (transaction) => {
    const lockSnaps = []
    for (const lockRef of lockRefs) {
      lockSnaps.push(await transaction.get(lockRef))
    }

    const activeConflict = lockSnaps.find((lockSnap) =>
      lockSnap.exists()
        ? isActiveBattleChampionReservation(lockSnap.data(), nowMs)
        : false
    )

    if (activeConflict) return null

    for (let i = 0; i < lockRefs.length; i += 1) {
      const arenaRecord = arenaRecords[i]
      const opponentRecord = arenaRecords[i === 0 ? 1 : 0]

      transaction.set(lockRefs[i], {
        assetId: assetIds[i],
        championId: assetIds[i],
        battleChampionIds: assetIds,
        championName: getArenaChampionName(arenaRecord),
        ownerAddress: arenaRecord?.ownerAddress || null,
        opponentAssetId: assetIds[i === 0 ? 1 : 0],
        opponentName: getArenaChampionName(opponentRecord),
        fightId,
        pairKey,
        groupSize: 2,
        status: 'active',
        source: ACTIVE_BATTLE_CHAMPION_SOURCE,
        runInstanceId: RUN_INSTANCE_ID,
        lockedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt,
      })
    }

    return { fightId, assetIds, expiresAtMillis }
  })

  if (!claimed) return null

  return {
    ...claimed,
    arenaA,
    arenaB,
  }
}

async function pickAndReserveArenaChampionFight(validArena) {
  await ensureFirebaseWriteAuth()

  const unavailableAssetIds = new Set()
  let latestActiveLocks = new Map()

  for (let attempt = 1; attempt <= ACTIVE_BATTLE_CHAMPION_CLAIM_ATTEMPTS; attempt += 1) {
    latestActiveLocks = await readActiveBattleChampions()
    for (const assetId of latestActiveLocks.keys()) {
      unavailableAssetIds.add(String(assetId))
    }

    if (latestActiveLocks.size) {
      console.log(
        'Skipping champions already reserved for another battle:',
        formatActiveBattleChampions(latestActiveLocks)
      )
    }

    const availableArena = validArena.filter(
      (arenaRecord) => !unavailableAssetIds.has(String(arenaRecord.assetId))
    )

    if (availableArena.length < 2) {
      throw new Error(
        `Need at least 2 unreserved arena champions; found ${availableArena.length}. Active battle champions: ${formatActiveBattleChampions(latestActiveLocks).join(', ') || 'none'}`
      )
    }

    const [arenaA, arenaB] = pickTwoArenaChampions(availableArena)
    const claimedFight = await tryReserveArenaChampionPair(arenaA, arenaB)

    if (claimedFight) {
      console.log('Reserved arena champions for this fight:', {
        fightId: claimedFight.fightId,
        assetA: arenaA.assetId,
        assetB: arenaB.assetId,
        expiresAt: new Date(claimedFight.expiresAtMillis).toISOString(),
      })
      return claimedFight
    }

    console.warn(
      `Arena pair ${arenaA.assetId}/${arenaB.assetId} was reserved by another run before this process claimed it. Retrying...`
    )
    unavailableAssetIds.add(String(arenaA.assetId))
    unavailableAssetIds.add(String(arenaB.assetId))
  }

  throw new Error(
    `Could not reserve an available arena champion pair after ${ACTIVE_BATTLE_CHAMPION_CLAIM_ATTEMPTS} attempts.`
  )
}

function shuffleArray(items) {
  return [...items].sort(() => Math.random() - 0.5)
}

function pickFourArenaChampions(validArena) {
  if (!Array.isArray(validArena) || validArena.length < 4) {
    throw new Error(
      `Need at least 4 valid arena characters in Firebase; found ${validArena?.length || 0}`
    )
  }

  const byOwner = new Map()
  for (const arenaRecord of shuffleArray(validArena)) {
    const owner = getArenaRecordOwner(arenaRecord)
    if (!owner) continue
    if (!byOwner.has(owner)) byOwner.set(owner, [])
    byOwner.get(owner).push(arenaRecord)
  }

  const owners = shuffleArray([...byOwner.keys()])
  if (owners.length < 4) {
    throw new Error(
      `Need 4 available arena champions from different known wallets; found ${owners.length} unique wallets.`
    )
  }

  const picked = owners.slice(0, 4).map((owner) => {
    const ownerChampions = byOwner.get(owner)
    return ownerChampions[Math.floor(Math.random() * ownerChampions.length)]
  })

  console.log(
    'Selected arena group:',
    picked.map((arenaRecord) => ({
      assetId: arenaRecord.assetId,
      owner: arenaRecord.ownerAddress || 'unknown',
      name: getArenaChampionName(arenaRecord),
    }))
  )

  return picked
}

function pickTwoArenaChampionTeams(validArena) {
  if (!Array.isArray(validArena) || validArena.length < 4) {
    throw new Error(
      `Need at least 4 valid arena characters in Firebase; found ${validArena?.length || 0}`
    )
  }

  const byOwner = new Map()
  for (const arenaRecord of shuffleArray(validArena)) {
    const owner = getArenaRecordOwner(arenaRecord)
    if (!owner) continue
    if (!byOwner.has(owner)) byOwner.set(owner, [])
    byOwner.get(owner).push(arenaRecord)
  }

  const eligibleOwners = shuffleArray(
    [...byOwner.entries()]
      .filter(([, records]) => records.length >= 2)
      .map(([owner]) => owner)
  )

  if (eligibleOwners.length < 2) {
    throw new Error(
      `Need 2 available wallets with at least 2 champions each; found ${eligibleOwners.length}.`
    )
  }

  const leftOwner = eligibleOwners[0]
  const rightOwner = eligibleOwners[1]
  const pickTwoForOwner = (owner) => shuffleArray(byOwner.get(owner)).slice(0, 2)
  const leftTeam = pickTwoForOwner(leftOwner)
  const rightTeam = pickTwoForOwner(rightOwner)
  const arenaGroup = [leftTeam[0], rightTeam[0], leftTeam[1], rightTeam[1]]

  const teamAssignments = [
    { teamId: TEAM_LEFT_ID, ownerAddress: leftOwner },
    { teamId: TEAM_RIGHT_ID, ownerAddress: rightOwner },
    { teamId: TEAM_LEFT_ID, ownerAddress: leftOwner },
    { teamId: TEAM_RIGHT_ID, ownerAddress: rightOwner },
  ]

  console.log('Selected arena team fight:', {
    leftWallet: leftOwner,
    leftTeam: leftTeam.map((arenaRecord) => ({
      assetId: arenaRecord.assetId,
      name: getArenaChampionName(arenaRecord),
    })),
    rightWallet: rightOwner,
    rightTeam: rightTeam.map((arenaRecord) => ({
      assetId: arenaRecord.assetId,
      name: getArenaChampionName(arenaRecord),
    })),
  })

  return {
    arenaGroup,
    teamAssignments,
    teamOwners: {
      [TEAM_LEFT_ID]: leftOwner,
      [TEAM_RIGHT_ID]: rightOwner,
    },
  }
}

async function tryReserveArenaChampionTeamFight(teamPick) {
  const arenaGroup = teamPick?.arenaGroup || []
  const teamAssignments = teamPick?.teamAssignments || []
  if (!Array.isArray(arenaGroup) || arenaGroup.length !== 4) {
    throw new Error(`Cannot reserve arena team fight with ${arenaGroup?.length || 0} champions.`)
  }

  const assetIds = arenaGroup.map((arenaRecord) =>
    normalizeArenaAssetId(arenaRecord?.assetId)
  )
  const uniqueAssetIds = new Set(assetIds.map(String))
  const ownerAddresses = arenaGroup.map(getArenaRecordOwner)
  const leftOwner = ownerAddresses[0]
  const rightOwner = ownerAddresses[1]

  if (assetIds.some((assetId) => !assetId) || uniqueAssetIds.size !== 4) {
    throw new Error(`Cannot reserve invalid arena team fight: ${assetIds.join(', ')}`)
  }
  if (!leftOwner || !rightOwner || leftOwner === rightOwner) {
    throw new Error('Cannot reserve team battle unless the two teams belong to different known wallets.')
  }
  if (ownerAddresses[2] !== leftOwner || ownerAddresses[3] !== rightOwner) {
    throw new Error('Cannot reserve team battle unless each side has exactly two champions from the same wallet.')
  }

  const normalizedTeamAssignments = GROUP_SIDES.map((side, index) => ({
    side,
    teamId: TEAM_LEFT_SIDES.has(side) ? TEAM_LEFT_ID : TEAM_RIGHT_ID,
    ownerAddress: TEAM_LEFT_SIDES.has(side) ? leftOwner : rightOwner,
    ...(teamAssignments[index] || {}),
  }))

  const lockRefs = assetIds.map((assetId) =>
    doc(db, ACTIVE_BATTLE_CHAMPIONS_COLLECTION, activeBattleChampionDocId(assetId))
  )
  const nowMs = Date.now()
  const expiresAtMillis = nowMs + ACTIVE_BATTLE_CHAMPION_TTL_MS
  const expiresAt = Timestamp.fromMillis(expiresAtMillis)
  const fightId = `teamFight_${assetIds.join('_')}_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2, 10)}`
  const pairKey = [...assetIds].sort((a, b) => a - b).join('_')

  const claimed = await runTransaction(db, async (transaction) => {
    const lockSnaps = []
    for (const lockRef of lockRefs) {
      lockSnaps.push(await transaction.get(lockRef))
    }

    const activeConflict = lockSnaps.find((lockSnap) =>
      lockSnap.exists()
        ? isActiveBattleChampionReservation(lockSnap.data(), nowMs)
        : false
    )

    if (activeConflict) return null

    for (let i = 0; i < lockRefs.length; i += 1) {
      const arenaRecord = arenaGroup[i]
      const assignment = normalizedTeamAssignments[i]
      const allyRecords = arenaGroup.filter((_, idx) =>
        idx !== i && normalizedTeamAssignments[idx].teamId === assignment.teamId
      )
      const enemyRecords = arenaGroup.filter((_, idx) =>
        normalizedTeamAssignments[idx].teamId !== assignment.teamId
      )

      transaction.set(lockRefs[i], {
        assetId: assetIds[i],
        championId: assetIds[i],
        battleChampionIds: assetIds,
        championName: getArenaChampionName(arenaRecord),
        ownerAddress: arenaRecord?.ownerAddress || null,
        teamId: assignment.teamId,
        teamOwnerAddress: assignment.ownerAddress,
        allyAssetIds: allyRecords.map((ally) => ally.assetId),
        allyNames: allyRecords.map(getArenaChampionName),
        opponentAssetIds: enemyRecords.map((opponent) => opponent.assetId),
        opponentNames: enemyRecords.map(getArenaChampionName),
        fightId,
        pairKey,
        groupSize: 4,
        teamSize: 2,
        fightType: 'team2v2',
        status: 'active',
        source: ACTIVE_BATTLE_CHAMPION_SOURCE,
        runInstanceId: RUN_INSTANCE_ID,
        lockedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt,
      })
    }

    return {
      fightId,
      assetIds,
      expiresAtMillis,
      teamAssignments: normalizedTeamAssignments,
      teamOwners: {
        [TEAM_LEFT_ID]: leftOwner,
        [TEAM_RIGHT_ID]: rightOwner,
      },
    }
  })

  if (!claimed) return null

  return {
    ...claimed,
    arenaGroup,
  }
}

async function pickAndReserveArenaChampionTeamFight(validArena) {
  await ensureFirebaseWriteAuth()

  const unavailableAssetIds = new Set()
  let latestActiveLocks = new Map()

  for (let attempt = 1; attempt <= ACTIVE_BATTLE_CHAMPION_CLAIM_ATTEMPTS; attempt += 1) {
    latestActiveLocks = await readActiveBattleChampions()
    for (const assetId of latestActiveLocks.keys()) {
      unavailableAssetIds.add(String(assetId))
    }

    if (latestActiveLocks.size) {
      console.log(
        'Skipping champions already reserved for another battle:',
        formatActiveBattleChampions(latestActiveLocks)
      )
    }

    const availableArena = validArena.filter(
      (arenaRecord) => !unavailableAssetIds.has(String(arenaRecord.assetId))
    )

    if (availableArena.length < 4) {
      throw new Error(
        `Need at least 4 unreserved arena champions; found ${availableArena.length}. Active battle champions: ${formatActiveBattleChampions(latestActiveLocks).join(', ') || 'none'}`
      )
    }

    const teamPick = pickTwoArenaChampionTeams(availableArena)
    const claimedFight = await tryReserveArenaChampionTeamFight(teamPick)

    if (claimedFight) {
      console.log('Reserved arena champions for this team fight:', {
        fightId: claimedFight.fightId,
        assetIds: claimedFight.assetIds,
        teamOwners: claimedFight.teamOwners,
        expiresAt: new Date(claimedFight.expiresAtMillis).toISOString(),
      })
      return claimedFight
    }

    console.warn(
      `Arena team fight ${teamPick.arenaGroup.map((arenaRecord) => arenaRecord.assetId).join('/')} was reserved by another run before this process claimed it. Retrying...`
    )
    for (const arenaRecord of teamPick.arenaGroup) {
      unavailableAssetIds.add(String(arenaRecord.assetId))
    }
  }

  throw new Error(
    `Could not reserve an available arena team fight after ${ACTIVE_BATTLE_CHAMPION_CLAIM_ATTEMPTS} attempts.`
  )
}

async function tryReserveArenaChampionGroup(arenaGroup) {
  if (!Array.isArray(arenaGroup) || arenaGroup.length !== 4) {
    throw new Error(`Cannot reserve arena group with ${arenaGroup?.length || 0} champions.`)
  }

  const assetIds = arenaGroup.map((arenaRecord) =>
    normalizeArenaAssetId(arenaRecord?.assetId)
  )
  const uniqueAssetIds = new Set(assetIds.map(String))
  const ownerAddresses = arenaGroup.map(getArenaRecordOwner)
  const uniqueOwners = new Set(ownerAddresses.filter(Boolean))

  if (assetIds.some((assetId) => !assetId) || uniqueAssetIds.size !== 4) {
    throw new Error(`Cannot reserve invalid arena group: ${assetIds.join(', ')}`)
  }
  if (ownerAddresses.some((owner) => !owner) || uniqueOwners.size !== 4) {
    throw new Error('Cannot reserve group battle unless all 4 champions have different known owners.')
  }

  const lockRefs = assetIds.map((assetId) =>
    doc(db, ACTIVE_BATTLE_CHAMPIONS_COLLECTION, activeBattleChampionDocId(assetId))
  )
  const nowMs = Date.now()
  const expiresAtMillis = nowMs + ACTIVE_BATTLE_CHAMPION_TTL_MS
  const expiresAt = Timestamp.fromMillis(expiresAtMillis)
  const fightId = `groupFight_${assetIds.join('_')}_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2, 10)}`
  const pairKey = [...assetIds].sort((a, b) => a - b).join('_')

  const claimed = await runTransaction(db, async (transaction) => {
    const lockSnaps = []
    for (const lockRef of lockRefs) {
      lockSnaps.push(await transaction.get(lockRef))
    }

    const activeConflict = lockSnaps.find((lockSnap) =>
      lockSnap.exists()
        ? isActiveBattleChampionReservation(lockSnap.data(), nowMs)
        : false
    )

    if (activeConflict) return null

    for (let i = 0; i < lockRefs.length; i += 1) {
      const arenaRecord = arenaGroup[i]
      const opponentRecords = arenaGroup.filter((_, idx) => idx !== i)

      transaction.set(lockRefs[i], {
        assetId: assetIds[i],
        championId: assetIds[i],
        battleChampionIds: assetIds,
        championName: getArenaChampionName(arenaRecord),
        ownerAddress: arenaRecord?.ownerAddress || null,
        opponentAssetIds: opponentRecords.map((opponent) => opponent.assetId),
        opponentNames: opponentRecords.map(getArenaChampionName),
        fightId,
        pairKey,
        groupSize: 4,
        status: 'active',
        source: ACTIVE_BATTLE_CHAMPION_SOURCE,
        runInstanceId: RUN_INSTANCE_ID,
        lockedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt,
      })
    }

    return { fightId, assetIds, expiresAtMillis }
  })

  if (!claimed) return null

  return {
    ...claimed,
    arenaGroup,
  }
}

async function pickAndReserveArenaChampionGroup(validArena) {
  await ensureFirebaseWriteAuth()

  const unavailableAssetIds = new Set()
  let latestActiveLocks = new Map()

  for (let attempt = 1; attempt <= ACTIVE_BATTLE_CHAMPION_CLAIM_ATTEMPTS; attempt += 1) {
    latestActiveLocks = await readActiveBattleChampions()
    for (const assetId of latestActiveLocks.keys()) {
      unavailableAssetIds.add(String(assetId))
    }

    if (latestActiveLocks.size) {
      console.log(
        'Skipping champions already reserved for another battle:',
        formatActiveBattleChampions(latestActiveLocks)
      )
    }

    const availableArena = validArena.filter(
      (arenaRecord) => !unavailableAssetIds.has(String(arenaRecord.assetId))
    )

    if (availableArena.length < 4) {
      throw new Error(
        `Need at least 4 unreserved arena champions; found ${availableArena.length}. Active battle champions: ${formatActiveBattleChampions(latestActiveLocks).join(', ') || 'none'}`
      )
    }

    const arenaGroup = pickFourArenaChampions(availableArena)
    const claimedFight = await tryReserveArenaChampionGroup(arenaGroup)

    if (claimedFight) {
      console.log('Reserved arena champions for this group fight:', {
        fightId: claimedFight.fightId,
        assetIds: claimedFight.assetIds,
        expiresAt: new Date(claimedFight.expiresAtMillis).toISOString(),
      })
      return claimedFight
    }

    console.warn(
      `Arena group ${arenaGroup.map((arenaRecord) => arenaRecord.assetId).join('/')} was reserved by another run before this process claimed it. Retrying...`
    )
    for (const arenaRecord of arenaGroup) {
      unavailableAssetIds.add(String(arenaRecord.assetId))
    }
  }

  throw new Error(
    `Could not reserve an available 4-champion arena group after ${ACTIVE_BATTLE_CHAMPION_CLAIM_ATTEMPTS} attempts.`
  )
}

async function releaseActiveBattleChampions(claimedFight) {
  if (!claimedFight?.fightId || !Array.isArray(claimedFight.assetIds)) return

  try {
    const lockRefs = claimedFight.assetIds.map((assetId) =>
      doc(db, ACTIVE_BATTLE_CHAMPIONS_COLLECTION, activeBattleChampionDocId(assetId))
    )

    await runTransaction(db, async (transaction) => {
      const lockSnaps = []
      for (const lockRef of lockRefs) {
        lockSnaps.push(await transaction.get(lockRef))
      }

      for (let i = 0; i < lockRefs.length; i += 1) {
        const lockSnap = lockSnaps[i]
        if (!lockSnap.exists()) continue
        if (lockSnap.data()?.fightId !== claimedFight.fightId) continue
        transaction.delete(lockRefs[i])
      }
    })

    console.log('Released active battle champion reservations:', {
      fightId: claimedFight.fightId,
      assetIds: claimedFight.assetIds,
    })
  } catch (error) {
    console.warn(
      'Failed to release active battle champion reservations:',
      error?.message || error
    )
  }
}

function startActiveBattleChampionHeartbeat(claimedFight) {
  if (!claimedFight?.fightId || !Array.isArray(claimedFight.assetIds)) {
    return () => {}
  }

  const heartbeatMs = 60 * 1000
  let stopped = false
  let inFlight = false

  const refresh = async () => {
    if (stopped || inFlight) return
    inFlight = true

    try {
      const lockRefs = claimedFight.assetIds.map((assetId) =>
        doc(db, ACTIVE_BATTLE_CHAMPIONS_COLLECTION, activeBattleChampionDocId(assetId))
      )
      const expiresAtMillis = Date.now() + ACTIVE_BATTLE_CHAMPION_TTL_MS
      const expiresAt = Timestamp.fromMillis(expiresAtMillis)

      await runTransaction(db, async (transaction) => {
        const lockSnaps = []
        for (const lockRef of lockRefs) {
          lockSnaps.push(await transaction.get(lockRef))
        }

        for (let i = 0; i < lockRefs.length; i += 1) {
          const lockSnap = lockSnaps[i]
          if (!lockSnap.exists()) continue
          if (lockSnap.data()?.fightId !== claimedFight.fightId) continue

          transaction.update(lockRefs[i], {
            status: 'active',
            updatedAt: serverTimestamp(),
            expiresAt,
            expiresAtMillis,
          })
        }
      })
    } catch (error) {
      console.warn(
        'Failed to refresh active battle champion reservations:',
        error?.message || error
      )
    } finally {
      inFlight = false
    }
  }

  refresh()
  const timer = setInterval(refresh, heartbeatMs)

  return () => {
    stopped = true
    clearInterval(timer)
  }
}

/**
 * For each app global state entry:
 *   key (base64) => character assetId
 *   Firestore doc: chars/{assetId}object
 */
async function fetchArenaCharacters() {
  const globalState = await fetchGlobalState(APP_ID)
  const results = []

  for (const entry of globalState) {
    if (!entry || entry.key == null) continue

    const assetId = decodeKeyToUint(entry.key)
    if (!Number.isFinite(assetId) || assetId <= 0) continue

    const docId = `${assetId}object`
    const charRef = doc(db, 'chars', docId)
    const charSnap = await getDoc(charRef)

    const char = charSnap.exists() ? charSnap.data() : null
    const hasCharObj = Boolean(
      char &&
        char.charObj &&
        typeof char.charObj === 'object'
    )

    // Only lookup ownership for champions that can actually be picked.
    // Champions without Firebase character objects stay in the results for logging,
    // but mainOnce filters them out before selection.
    const ownerAddress = hasCharObj
      ? await getChampionOwnerAddress(assetId)
      : null

    results.push({
      assetId,
      exists: charSnap.exists(),
      hasCharObj,
      ownerAddress,
      char,
      rawState: entry,
    })
  }

  return results
}

/** Types from Firebase charObj (move.type + move.effect, used only for UI) */
function extractTypesFromCharObj(charObj) {
  const out = new Set()
  if (Array.isArray(charObj?.moves)) {
    for (const mv of charObj.moves) {
      if (mv?.type) out.add(String(mv.type))
      if (mv?.effect) out.add(String(mv.effect))
    }
  }
  return [...out]
}


/** Map Firebase move into internal meta shape (no effect potency here). */
function arenaMoveToPipelineMove(arenaMove) {
  const power = Number(arenaMove.power)

  const cdNum = Number(arenaMove.cooldown)

  if (!Number.isFinite(cdNum) || cdNum <= 0) {
    throw new Error(
      `Move ${arenaMove?.name ?? arenaMove?.id ?? '(unknown)'} missing valid cooldown`
    )
  }

  return {
    id: arenaMove.id,
    name: arenaMove.name,
    type: arenaMove.type,
    power,
    accuracy: Number(arenaMove.accuracy) || 75,
    effect: arenaMove.effect ?? null,

    // ✅ ONLY the attached cooldown:
    cooldown_seconds: cdNum,
  }
}



/**
 * Turn a Firebase arena record into a runtime character object.
 * - Downloads standing / emote / move sprites from charObj URLs.
 * - Uses stats straight from charObj.
 * - Derives move meta from charObj.moves[0,1,2].
 */
async function prepareArenaCharacter(arenaRecord, indexLabel) {
  if (!arenaRecord?.char?.charObj) {
    throw new Error('Arena record missing charObj')
  }
  console.log(arenaRecord.assetId)
  const charObj = JSON.parse(JSON.stringify(arenaRecord.char.charObj))
  ensureRuntimeEffectFields(charObj)

  const equippedItemRuntime = await loadEquippedItemEffectsForAsset(arenaRecord.assetId)
  mergeGainedEffectsIntoRuntimeCharacter(charObj, equippedItemRuntime.gainedEffects)
  equippedItemRuntime.itemEffectLines = formatEquippedItemEffectLines(
    equippedItemRuntime.equippedTraits,
    charObj
  )

  const skillTreeRuntime = await loadChampionSkillRuntimeForAsset(arenaRecord.assetId)
  applyChampionSkillRuntimeToCharObj(charObj, skillTreeRuntime)

  

  const name = charObj.name || `Arena ${arenaRecord.assetId}`
  const slug = slugify(name)
  const baseDir = path.join(
    OUT_DIR,
    `${indexLabel}__arena_${slug}`
  )
  await emptyDir(baseDir)

  const spritesDir = path.join(baseDir, 'sprites')
  const moveVisualsDir = path.join(baseDir, 'move_visuals')
  ensureDir(spritesDir)
  ensureDir(moveVisualsDir)

  const idlePath = path.join(spritesDir, 'idle.png')
  const emotePath = path.join(spritesDir, 'emote.png')
  const moveASpritePath = path.join(
    spritesDir,
    'moveA_character.png'
  )
  const moveBSpritePath = path.join(
    spritesDir,
    'moveB_character.png'
  )
  const moveCSpritePath = path.join(
    spritesDir,
    'moveC_character.png'
  )

  const idleFramePaths = await downloadImageSequence(
    getIdleFrameUrls(charObj),
    spritesDir,
    'idle_frame'
  )

  const movesArr = Array.isArray(charObj.moves)
    ? charObj.moves
    : []
  const move0 = movesArr[0] || {}
  const move1 = movesArr[1] || movesArr[0] || {}
  const move2 = movesArr[2] || movesArr[1] || movesArr[0] || {}

  const moveAFramePaths = await downloadImageSequence(
    getMoveCharacterFrameUrls(move0, charObj.standingUrl),
    spritesDir,
    'moveA_frame'
  )
  const moveBFramePaths = await downloadImageSequence(
    getMoveCharacterFrameUrls(move1, move0.characterUrl || charObj.standingUrl),
    spritesDir,
    'moveB_frame'
  )
  const moveCFramePaths = await downloadImageSequence(
    getMoveCharacterFrameUrls(
      move2,
      move1.characterUrl || move0.characterUrl || charObj.standingUrl
    ),
    spritesDir,
    'moveC_frame'
  )

  const moveAEffectFramePaths = await downloadImageSequence(
    getMoveEffectFrameUrls(move0, move0.effectUrl || move0.visualUrl || move0.moveVisualUrl),
    moveVisualsDir,
    'moveA_effect_frame'
  )
  const moveBEffectFramePaths = await downloadImageSequence(
    getMoveEffectFrameUrls(move1, move1.effectUrl || move1.visualUrl || move1.moveVisualUrl),
    moveVisualsDir,
    'moveB_effect_frame'
  )
  const moveCEffectFramePaths = await downloadImageSequence(
    getMoveEffectFrameUrls(move2, move2.effectUrl || move2.visualUrl || move2.moveVisualUrl),
    moveVisualsDir,
    'moveC_effect_frame'
  )

  if (!charObj.standingUrl) {
    throw new Error(
      `charObj for ${name} has no standingUrl`
    )
  }

  // Standing / idle
  const idleImg = await Jimp.read(charObj.standingUrl)
  await idleImg.writeAsync(idlePath)

  // Emote + move sprites: use characterUrl if present, otherwise standingUrl
  const emoteUrl = move0.characterUrl || charObj.standingUrl
  const moveACharU = move0.characterUrl || charObj.standingUrl
  const moveBCharU =
    move1.characterUrl || move0.characterUrl || charObj.standingUrl
  const moveCCharU =
    move2.characterUrl ||
    move1.characterUrl ||
    move0.characterUrl ||
    charObj.standingUrl

  const emoteImg = await Jimp.read(emoteUrl)
  await emoteImg.writeAsync(emotePath)

  const moveACharImg = await Jimp.read(moveACharU)
  await moveACharImg.writeAsync(moveASpritePath)

  const moveBCharImg = await Jimp.read(moveBCharU)
  await moveBCharImg.writeAsync(moveBSpritePath)

  const moveCCharImg = await Jimp.read(moveCCharU)
  await moveCCharImg.writeAsync(moveCSpritePath)

  // Move effect images (projectiles / fx)
  const moveAEffectPath = path.join(
    moveVisualsDir,
    'moveA_effect.png'
  )
  const moveBEffectPath = path.join(
    moveVisualsDir,
    'moveB_effect.png'
  )
  const moveCEffectPath = path.join(
    moveVisualsDir,
    'moveC_effect.png'
  )

  const moveAEffectUrl = move0.moveUrl || charObj.standingUrl
  const moveBEffectUrl =
    move1.moveUrl || move0.moveUrl || charObj.standingUrl
  const moveCEffectUrl =
    move2.moveUrl ||
    move1.moveUrl ||
    move0.moveUrl ||
    charObj.standingUrl

  const moveAEffectImg = await Jimp.read(moveAEffectUrl)
  await moveAEffectImg.writeAsync(moveAEffectPath)

  const moveBEffectImg = await Jimp.read(moveBEffectUrl)
  await moveBEffectImg.writeAsync(moveBEffectPath)

  const moveCEffectImg = await Jimp.read(moveCEffectUrl)
  await moveCEffectImg.writeAsync(moveCEffectPath)

  const effectPotencies = {}
  if (Array.isArray(movesArr)) {
    for (const mv of movesArr) {
      if (!mv?.effect) continue
      const name = String(mv.effect).trim()
      if (!name) continue
      const lower = name.toLowerCase()
      let raw = charObj[name]
      if (raw === undefined) raw = charObj[lower]
      const val = Number(raw)
      effectPotencies[lower] = Number.isFinite(val) ? val : 0
    }
  }

  // Runtime stats are deterministic from the character object:
  //   health = base health + strength * 2
  //   speed  = base speed + dexterity
  //   resist = base resist + intelligence
  // Move power scaling is applied from the same primary stats below and during combat.
  const stats = buildRuntimeStatsFromCharObj(charObj)
  charObj.health = stats.health
  charObj.currentHealth = stats.health
  charObj.speed = stats.speed
  charObj.resist = stats.resist
  stats.total =
    stats.strength +
    stats.dexterity +
    stats.intelligence +
    stats.speed +
    stats.resist +
    stats.health

  // Move meta – power from Firebase, effect potency from charObj, accuracy/CD balanced
  const mapMove = (src) => {
    const m0 = arenaMoveToPipelineMove(src, 'melee')

    const effectName = String(src.effect || '').trim()
    const key = effectName.toLowerCase()
    const potencyBase = key ? Number(effectPotencies[key] || 0) : 0

    const withEffect = {
      ...m0,
      effect_name: effectName,
      effect_potency_base: potencyBase,
      sourceCharObj: charObj,
    }

    const m1 = withEffect

    // ✅ Enforce: cooldown must already exist and be valid
    const cd = Number(m1.cooldown_seconds ?? src.cooldown ?? m1.cooldown)
    if (!Number.isFinite(cd) || cd <= 0) {
      throw new Error(
        `Move missing valid cooldown: ${src?.name ?? src?.id ?? '(unknown)'}`
      )
    }

  const displayedPower = getMoveDisplayPower(m1, stats)
  return {
    ...m1,
    base_power: safeNumber(m1.power, 0),
    stat_power_bonus: displayedPower - safeNumber(m1.power, 0),
    displayed_power: displayedPower,
    cooldown_seconds: cd,
  }
}


  const moveA = mapMove(move0)
  const moveB = mapMove(move1)
  const moveC = mapMove(move2)


  // Types are just flavors from Firebase
  const types = extractTypesFromCharObj(charObj)
  const identity = {
    race: charObj.race || 'unknown',
    class: charObj.class || 'unknown',
  }


  return {
    creature_name: name,
    identity,
    types,
    stats,
    moveA,
    moveB,
    moveC,
    baseDir,
    spritesDir,
    moveVisualsDir,
    sheet: idlePath,
    skillTreeRuntime,
    arena: {
      assetId: arenaRecord.assetId,
      charObj,
      skillTreeRuntime,
    },
    spriteIdlePath: idlePath,
    spriteIdleFramePaths: idleFramePaths,
    spriteEmotePath: emotePath,
    spriteMoveAPath: moveASpritePath,
    spriteMoveBPath: moveBSpritePath,
    spriteMoveCPath: moveCSpritePath,
    spriteMoveAFramePaths: moveAFramePaths,
    spriteMoveBFramePaths: moveBFramePaths,
    spriteMoveCFramePaths: moveCFramePaths,
    moveAEffectFramePaths,
    moveBEffectFramePaths,
    moveCEffectFramePaths,
    moveAEffectPath,
    moveBEffectPath,
    moveCEffectPath,
    effectPotencies,
    equippedMetaDoc: equippedItemRuntime.equippedMetaDoc,
    equippedTraits: equippedItemRuntime.equippedTraits,
    gainedItemEffects: equippedItemRuntime.gainedEffects,
    itemEffectLines: equippedItemRuntime.itemEffectLines,
    itemBattleEffects: equippedItemRuntime.battleEffects,
    itemResistances: equippedItemRuntime.resistances,
  }
}

async function buildGroupStandingLayoutHint(characters) {
  const { W, H } = parseSize(FIGHT_BG_SIZE)
  const targetH = Math.max(96, Math.round(H * GROUP_FIGHT_SCALE_FRACTION * 2))
  const marginX = Math.round(W * 0.075)
  const topBaseline = Math.round(H * 0.42)
  const bottomBaseline = Math.round(H * 0.87)
  const anchors = []

  for (let i = 0; i < characters.length; i += 1) {
    const character = characters[i]
    const side = GROUP_SIDES[i]
    const idleImg = await Jimp.read(character.spriteIdlePath)
    idleImg.resize(Math.round(idleImg.bitmap.width * (targetH / idleImg.bitmap.height)), targetH)

    const isRight = GROUP_LEFT_FACING_SIDES.has(side)
    const isBottom = side === 'C' || side === 'D'
    const x = isRight ? W - marginX - idleImg.bitmap.width : marginX
    let y = (isBottom ? bottomBaseline : topBaseline) - idleImg.bitmap.height
    y = clamp(y, 72, H - idleImg.bitmap.height - 24)

    anchors.push({
      side,
      corner: side === 'A' ? 'top-left' : side === 'B' ? 'top-right' : side === 'C' ? 'bottom-left' : 'bottom-right',
      x: Math.round(x + idleImg.bitmap.width / 2),
      y: Math.round(y + idleImg.bitmap.height),
    })
  }

  const anchorText = anchors
    .map((anchor) => {
      const pctX = Math.round((anchor.x / W) * 100)
      const pctY = Math.round((anchor.y / H) * 100)
      return `${anchor.side}/${anchor.corner} feet at x=${anchor.x}px y=${anchor.y}px (${pctX}% across, ${pctY}% down)`
    })
    .join('; ')
  const footCenterX = Math.round(anchors.reduce((sum, anchor) => sum + anchor.x, 0) / anchors.length)
  const footCenterY = Math.round(anchors.reduce((sum, anchor) => sum + anchor.y, 0) / anchors.length)
  const footCenterPctX = Math.round((footCenterX / W) * 100)
  const footCenterPctY = Math.round((footCenterY / H) * 100)

  return `Champion standing anchors in the final ${W}x${H} frame: ${anchorText}. Center the main floor's perspective and most readable tile pattern around the average foot-anchor point x=${footCenterX}px y=${footCenterY}px (${footCenterPctX}% across, ${footCenterPctY}% down), because this is where the bottoms of the idle sprites land. The continuous arena floor must visibly pass directly under all four foot anchors and cover the entire image edge to edge, with each corner having enough solid tile surface for a full sprite to stand comfortably. Keep holes, pits, cliffs, cracks, and heavy decorations away from those exact foot positions.`
}

// Generate a wide four-corner team arena background using OpenAI images,
// then crop/resize it to FIGHT_BG_SIZE.
async function generateFightBackground(aName, bName, outDir, arenaMap = null, standingLayoutHint = '') {
  const openai = getOpenAI()
  const { W, H } = parseSize(FIGHT_BG_SIZE)
  const tmpPath = path.join(outDir, 'fight_bg_raw.png')
  const finalPath = path.join(outDir, 'fight_bg.png')
  const names = Array.isArray(aName)
    ? aName.filter(Boolean).join(', ')
    : [aName, bName].filter(Boolean).join(', ')
  const mapName = arenaMap?.name || 'Dark Coin Arena'
  const terrain = arenaMap?.terrain || 'A dark fantasy battle floor.'
  const standingLayoutText = standingLayoutHint
    ? `\n${standingLayoutHint}\n`
    : ''

  const prompt = `
Old-school pixel-art style dark fantasy two-versus-two team arena for map: ${mapName}.
Terrain theme: ${terrain}
Wide 16:9 scene, viewed from a slight top-down three-quarter camera angle.
Keep the same readable team battle structure every time: one continuous arena floor / fight-pit tile surface that covers the entire image edge to edge, with no empty void, no distant backdrop, and no separate floating platform.
The floor must be a solid walkable surface across the whole frame, including all four corners for fighters: ${names}.
The four corner areas should visibly feel like solid footing on the same continuous floor, not disconnected pads, decorative background, empty air, or a flat abstract texture.
The visual center of the floor's usable tile pattern should align with the average bottom point of the champions' idle positions, not the center of the full image.
${standingLayoutText}
Keep the center open for movement and projectiles, with subtle perspective lines, floor seams, small cracks, worn tiles, or low-relief details that make the surface depth clear without breaking up the walkable floor.
Theme the floor materials, floor markings, lighting, debris, and surrounding atmosphere to match the selected map terrain and passive effect while preserving this stable edge-to-edge arena floor layout.
Put the exact map name "${mapName}" as readable engraved or painted arena text at the bottom center of the image, integrated into the floor or lower border.
No characters, no people, no creatures, no weapons, no UI, and no other text besides the exact map name at the bottom center.
Mood: dark fantasy, Dark Coin arena.
`

  try {
    // Use a model-supported size (e.g. 1024x1792) then downscale
    const resp = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1536x1024',
      quality: "low"
    })

    const b64 = resp.data[0].b64_json
    const raw = Buffer.from(b64, 'base64')
    await fsp.writeFile(tmpPath, raw)

    const img = await Jimp.read(tmpPath)
    img.resize(W, H, Jimp.RESIZE_BICUBIC)
    await img.writeAsync(finalPath)

    return finalPath
  } catch (err) {
    console.warn(
      '⚠️ generateFightBackground failed, using fallback gradient:',
      err?.message || err
    )

    // Fallback: simple dark castle-esque gradient background
    const bg = new Jimp(W, H, Jimp.cssColorToHex('#050309'))
    const topColor = Jimp.cssColorToHex('#1b1022')
    const bottomColor = Jimp.cssColorToHex('#050309')

    for (let y = 0; y < H; y++) {
      const t = y / (H - 1)
      const rTop = (topColor >> 24) & 0xff
      const gTop = (topColor >> 16) & 0xff
      const bTop = (topColor >> 8) & 0xff

      const rBot = (bottomColor >> 24) & 0xff
      const gBot = (bottomColor >> 16) & 0xff
      const bBot = (bottomColor >> 8) & 0xff

      const r = Math.round(rTop + (rBot - rTop) * t)
      const g = Math.round(gTop + (gBot - gTop) * t)
      const b = Math.round(bTop + (bBot - bTop) * t)

      const rowColor = Jimp.rgbaToInt(r, g, b, 255)
      for (let x = 0; x < W; x++) {
        bg.setPixelColor(rowColor, x, y)
      }
    }

    await bg.writeAsync(finalPath)
    return finalPath
  }
}


// ===================== ADD THIS HELPER (place it above mainOnce) =====================
// Fixes "TransactionPool.Remember: txn dead: round X outside of A--B" by:
// - Fetching fresh suggested params immediately before building/signing/sending
// - Rebuilding + re-signing on expiry errors (retry)
async function sendGroupedTxnsWithFreshParamsAndRetry({
  houseAccount,
  buildTxns, // async (params) => [Transaction, ...]
  attempts = 3,
  confirmRounds = 24,
}) {
  let lastErr = null

  for (let i = 1; i <= attempts; i++) {
    try {
      // Always fetch params right before building/signing so they can't go stale
      const { result: freshParams } = await getSuggestedParamsWithFallback()

      // algosdk v3.x uses object-based transaction builders.
      // buildTxns(params) should return Transaction objects created with
      // make*FromObject helpers, not deprecated positional constructors.
      const txns = await buildTxns(freshParams)
      if (!Array.isArray(txns) || txns.length === 0) {
        throw new Error("buildTxns(params) must return a non-empty txn array")
      }

      if (txns.length > 1) algosdk.assignGroupID(txns)

      const signedTxns = txns.map((t) => t.signTxn(houseAccount.sk))
      const { result: sendResult } = await runAlgodRequestWithFallback(
        (providerClient) => providerClient.sendRawTransaction(signedTxns).do(),
        'Send raw transaction group'
      )

      // algosdk v3.x / algod REST responses commonly expose the tx id as
      // lowercase `txid`; older code often destructured `txId`, which can
      // become undefined and break confirmation handling.
      const txId =
        typeof sendResult === 'string'
          ? sendResult
          : sendResult?.txid ??
            sendResult?.txId ??
            sendResult?.['tx-id'] ??
            sendResult?.transactionId ??
            sendResult?.transactionID

      if (!txId) {
        throw new Error(
          `sendRawTransaction did not return a txid. Response: ${JSON.stringify(sendResult)}`
        )
      }

      const { result: confirmedTxn } = await runAlgodRequestWithFallback(
        (providerClient) => algosdk.waitForConfirmation(providerClient, txId, confirmRounds),
        `Wait for confirmation ${txId}`
      )

      return { txId, confirmedTxn, sendResult }
    } catch (e) {
      lastErr = e
      const msg = String(e?.message || e)

      const isRoundExpiry =
        msg.includes("txn dead") ||
        msg.includes("outside of") ||
        msg.includes("TransactionPool.Remember")

      if (!isRoundExpiry || i === attempts) {
        throw e
      }

      // else: retry -> fetch new params -> rebuild -> re-sign -> resubmit
    }
  }

  throw lastErr || new Error("Transaction failed after retries")
}

/* ===================== THUMBNAIL EXTRACTION ===================== */
async function extractThumbnailFrame(framesDir, totalFrames, outPath) {
  // Pick a frame ~1/3 of the way through the video
  const targetFrame = Math.max(0, Math.floor(totalFrames * 0.33))
  const frameName = `frame_${String(targetFrame).padStart(4, '0')}.png`
  const framePath = path.join(framesDir, frameName)

  // Copy + resize to standard YouTube thumbnail size (1280×720)
  const img = await Jimp.read(framePath)
  img.cover(1280, 720, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE)
  await img.writeAsync(outPath)
  return outPath
}

/* ===================== DISCORD WEBHOOK ===================== */
async function sendDiscordFightAnnouncement({
  webhookUrl,
  aName,
  bName,
  matchupText = null,
  youtubeUrl = null,
  firebaseVideoUrl = null,
  thumbnailUrl = null,
  youtubeUploadSucceeded = false,
}) {
  const watchUrl = youtubeUrl || firebaseVideoUrl

  const watchFieldName = youtubeUrl
    ? '🎬 Watch on YouTube'
    : '☁️ Watch Fight Video'

  const watchFieldValue = watchUrl
    ? `[Click here](${watchUrl})`
    : 'Video link unavailable'

  const fallbackNote = youtubeUrl
    ? ''
    : '\n\nYouTube upload did not complete, so this announcement links to the Firebase Storage video instead.'

  const embed = {
    title: `⚔️ Dark Coin Team Battle`,
    description: `${matchupText || `**${aName}** vs **${bName}**`}\n\nWho will win? Watch now!${fallbackNote}`,
    color: 0x1a0a3c,
    image: thumbnailUrl ? { url: thumbnailUrl } : undefined,
    fields: [
      {
        name: watchFieldName,
        value: watchFieldValue,
        inline: false,
      },
    ],
    footer: {
      text: youtubeUploadSucceeded
        ? 'Dark Coin Arena • Algorand Blockchain Gaming'
        : 'Dark Coin Arena • Firebase Storage fallback',
    },
    timestamp: new Date().toISOString(),
  }

  if (watchUrl) {
    embed.url = watchUrl
  }

  const payload = {
    embeds: [embed],
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Discord webhook failed: ${res.status} ${res.statusText} — ${body}`)
  }

  console.log('✅ Discord announcement sent.')
}

/* ===================== MAIN (single run) ===================== */
async function mainOnceLegacy() {
  ensureDir(OUT_DIR)

  // 1) Load arena characters from Algorand app + Firestore
  const arenaChars = await fetchArenaCharacters()

// Only champions with an actual Firebase charObj can be picked.
const validArena = arenaChars.filter(hasUsableCharacterObject)

const missingCharObj = arenaChars.filter((c) => !hasUsableCharacterObject(c))
if (missingCharObj.length) {
  console.log(
    'Skipping arena champions without Firebase character objects:',
    missingCharObj.map((c) => c.assetId)
  )
}

if (validArena.length < 2) {
  throw new Error(
    `Need at least 2 valid arena characters with Firebase charObj; found ${validArena.length}`
  )
}

// Pick and lock two characters so other running instances skip them.
const claimedFight = await pickAndReserveArenaChampionFight(validArena)
const stopReservationHeartbeat = startActiveBattleChampionHeartbeat(claimedFight)
const { arenaA, arenaB } = claimedFight

try {
  // 3) Build runtime characters from Firebase charObj
  const A = await prepareArenaCharacter(arenaA, "characterA")
  const B = await prepareArenaCharacter(arenaB, "characterB")

  console.log("Using arena characters:")
  console.log(`  A = ${A.creature_name} (assetId ${arenaA.assetId})`)
  console.log(`  B = ${B.creature_name} (assetId ${arenaB.assetId})`)

  // B faces left – flip character AND its move VFX
  await flipAllPngsHorizontally(B.spritesDir)
  await flipAllPngsHorizontally(B.moveVisualsDir)

  const fightDir = path.join(OUT_DIR, "fight_scene")
  ensureDir(fightDir)
  await emptyDir(fightDir)

  const arenaMap = getRandomArenaEffectMap()
  console.log(`Selected arena map: ${arenaMap.name} (${arenaMap.effect})`)
  const bgPath = await generateFightBackground(A.creature_name, B.creature_name, fightDir, arenaMap)
  const { W: bgW, H: bgH } = parseSize(FIGHT_BG_SIZE)

  const statIcons = await loadStatIcons()
  const typeIcons = await loadTypeIcons()
  const effectIcons = await loadEffectIcons()

  // Collect all effect names from both characters' moves
  const effectNameSet = new Set()
  for (const ch of [A, B]) {
    for (const mv of [ch.moveA, ch.moveB, ch.moveC]) {
      if (mv?.effect) effectNameSet.add(String(mv.effect))
    }
  }

  const statsPanelAPath = path.join(fightDir, "stats_A.png")
  const statsPanelBPath = path.join(fightDir, "stats_B.png")
  await renderStatsPanel({
    outPath: statsPanelAPath,
    creatureName: `${A.creature_name}`,
    identity: A.identity,
    types: A.types,
    stats: A.stats,
    bgW,
    bgH,
    statIcons,
    typeIcons,
    effectIcons,
    charEffects: A.arena?.charObj || {},
    itemEffectLines: A.itemEffectLines,
  })
  await renderStatsPanel({
    outPath: statsPanelBPath,
    creatureName: `${B.creature_name}`,
    identity: B.identity,
    types: B.types,
    stats: B.stats,
    bgW,
    bgH,
    statIcons,
    typeIcons,
    effectIcons,
    charEffects: B.arena?.charObj || {},
    itemEffectLines: B.itemEffectLines,
  })

  const movePanelAPath = path.join(fightDir, "moves_A.png")
  const movePanelBPath = path.join(fightDir, "moves_B.png")

  const moveAVisualA = A.moveAEffectPath
  const moveAVisualB = B.moveAEffectPath
  const moveBVisualA = A.moveBEffectPath
  const moveBVisualB = B.moveBEffectPath
  const moveCVisualA = A.moveCEffectPath
  const moveCVisualB = B.moveCEffectPath

  const moveAAnimA = A.spriteMoveAFramePaths?.length ? A.spriteMoveAFramePaths : [A.spriteMoveAPath]
  const moveBAnimA = A.spriteMoveBFramePaths?.length ? A.spriteMoveBFramePaths : [A.spriteMoveBPath]
  const moveCAnimA = A.spriteMoveCFramePaths?.length ? A.spriteMoveCFramePaths : [A.spriteMoveCPath]
  const moveAAnimB = B.spriteMoveAFramePaths?.length ? B.spriteMoveAFramePaths : [B.spriteMoveAPath]
  const moveBAnimB = B.spriteMoveBFramePaths?.length ? B.spriteMoveBFramePaths : [B.spriteMoveBPath]
  const moveCAnimB = B.spriteMoveCFramePaths?.length ? B.spriteMoveCFramePaths : [B.spriteMoveCPath]

  const moveAEffectAnimA = A.moveAEffectFramePaths?.length ? A.moveAEffectFramePaths : [A.moveAEffectPath]
  const moveBEffectAnimA = A.moveBEffectFramePaths?.length ? A.moveBEffectFramePaths : [A.moveBEffectPath]
  const moveCEffectAnimA = A.moveCEffectFramePaths?.length ? A.moveCEffectFramePaths : [A.moveCEffectPath]
  const moveAEffectAnimB = B.moveAEffectFramePaths?.length ? B.moveAEffectFramePaths : [B.moveAEffectPath]
  const moveBEffectAnimB = B.moveBEffectFramePaths?.length ? B.moveBEffectFramePaths : [B.moveBEffectPath]
  const moveCEffectAnimB = B.moveCEffectFramePaths?.length ? B.moveCEffectFramePaths : [B.moveCEffectPath]

  await renderMoveBoardPanel({
    outPath: movePanelAPath,
    moves: [A.moveA, A.moveB, A.moveC],
    moveImgPaths: [moveAAnimA, moveBAnimA, moveCAnimA],
    moveEffectImgPaths: [moveAEffectAnimA, moveBEffectAnimA, moveCEffectAnimA],
    bgW,
    bgH,
    statIcons,
    typeIcons,
    effectIcons,
    stats: A.stats,
    gainedItemEffects: A.gainedItemEffects,
  })
  await renderMoveBoardPanel({
    outPath: movePanelBPath,
    moves: [B.moveA, B.moveB, B.moveC],
    moveImgPaths: [moveAAnimB, moveBAnimB, moveCAnimB],
    moveEffectImgPaths: [moveAEffectAnimB, moveBEffectAnimB, moveCEffectAnimB],
    bgW,
    bgH,
    statIcons,
    typeIcons,
    effectIcons,
    stats: B.stats,
    gainedItemEffects: B.gainedItemEffects,
  })

  const framesDir = path.join(fightDir, "frames")
  const audioTimeline = makeAudioTimeline()

  const { frames, winnerSide, loserSide, winnerName } = await createFightFrames({
    aName: A.creature_name,
    bName: B.creature_name,
    backgroundPath: bgPath,
    spriteAPath: A.spriteIdlePath,
    spriteBPath: B.spriteIdlePath,
    spriteAIdleFramePaths: A.spriteIdleFramePaths,
    spriteBIdleFramePaths: B.spriteIdleFramePaths,
    spriteAEmotePath: A.spriteEmotePath,
    spriteBEmotePath: B.spriteEmotePath,
    spriteAMoveAPath: A.spriteMoveAPath,
    spriteBMoveAPath: B.spriteMoveAPath,
    spriteAMoveBPath: A.spriteMoveBPath,
    spriteBMoveBPath: B.spriteMoveBPath,
    spriteAMoveCPath: A.spriteMoveCPath,
    spriteBMoveCPath: B.spriteMoveCPath,
    spriteAMoveAFramePaths: A.spriteMoveAFramePaths,
    spriteBMoveAFramePaths: B.spriteMoveAFramePaths,
    spriteAMoveBFramePaths: A.spriteMoveBFramePaths,
    spriteBMoveBFramePaths: B.spriteMoveBFramePaths,
    spriteAMoveCFramePaths: A.spriteMoveCFramePaths,
    spriteBMoveCFramePaths: B.spriteMoveCFramePaths,
    moveAEffectFramePathsA: A.moveAEffectFramePaths,
    moveAEffectFramePathsB: B.moveAEffectFramePaths,
    moveBEffectFramePathsA: A.moveBEffectFramePaths,
    moveBEffectFramePathsB: B.moveBEffectFramePaths,
    moveCEffectFramePathsA: A.moveCEffectFramePaths,
    moveCEffectFramePathsB: B.moveCEffectFramePaths,
    moveAVisualAPath: moveAVisualA,
    moveAVisualBPath: moveAVisualB,
    moveBVisualAPath: moveBVisualA,
    moveBVisualBPath: moveBVisualB,
    moveCVisualAPath: moveCVisualA,
    moveCVisualBPath: moveCVisualB,
    statsPanelAPath,
    statsPanelBPath,
    movePanelAPath,
    movePanelBPath,
    outFramesDir: framesDir,
    scaleFraction: FIGHT_SCALE_FRACTION,
    aStats: A.stats,
    bStats: B.stats,
    aTypes: A.types,
    bTypes: B.types,
    aMoveMetaA: A.moveA,
    aMoveMetaB: A.moveB,
    aMoveMetaC: A.moveC,
    bMoveMetaA: B.moveA,
    bMoveMetaB: B.moveB,
    bMoveMetaC: B.moveC,
    aGainedItemEffects: A.gainedItemEffects,
    bGainedItemEffects: B.gainedItemEffects,
    aItemBattleEffects: A.itemBattleEffects,
    bItemBattleEffects: B.itemBattleEffects,
    aItemResistances: A.itemResistances,
    bItemResistances: B.itemResistances,
    aCharObj: A.arena.charObj,
    bCharObj: B.arena.charObj,
    audioTimeline,
    effectIcons,
    arenaMap,
    aAssetId: A?.arena?.assetId ?? arenaA?.assetId,
    bAssetId: B?.arena?.assetId ?? arenaB?.assetId,
  })

  console.log(`Fight frames created: ${frames} frames at ${FIGHT_FPS} fps`)

  const silentVideo = path.join(fightDir, "character_duel.mp4")
  await stitchFramesToVideo(framesDir, silentVideo, FIGHT_FPS)

  const durationSec = frames / FIGHT_FPS

  // Build battle music + SFX track and mux into the final video
  const finalVideo = await buildAndMuxAudio({
    videoPath: silentVideo,
    audioTimeline,
    outDir: fightDir,
    durationSec,
  })

  // ==== WINNER + LOSER ASSET + HOLDER LOOKUP (post-video) ====
  try {
    const winnerAssetId = winnerSide === "A" ? A?.arena?.assetId : B?.arena?.assetId
    const loserAssetId = loserSide === "A" ? A?.arena?.assetId : B?.arena?.assetId

    console.log("\n🏆 Fight outcome:")
    console.log(`  Winner side: ${winnerSide}`)
    console.log(`  Winner name: ${winnerName}`)
    console.log(`  Winner assetId: ${winnerAssetId}`)
    console.log(`  Loser side: ${loserSide}`)
    console.log(`  Loser assetId: ${loserAssetId}`)

    if (winnerAssetId) {
      const winHolders = await findAssetHolders(winnerAssetId, { minAmount: 1, maxAccounts: 1 })
      console.log(`  Winner holder(s):`)
      if (!winHolders.length) console.log("   - none found")
      else {
        const { txId, confirmedTxn } = await sendGroupedTxnsWithFreshParamsAndRetry({
          client,
          houseAccount,
          attempts: 3,
          confirmRounds: 24,
          buildTxns: async (params) => {
            let txns = []

            // ---------- TXN 1: reward ----------
            const rewardTxn = algosdk.makeApplicationNoOpTxnFromObject({
              sender: houseAccount.addr,
              suggestedParams: params,
              appIndex: 3339943603,
              appArgs: [new Uint8Array(Buffer.from("reward"))],
              accounts: [winHolders[0].address],
              foreignApps: [],
              foreignAssets: [winnerAssetId, loserAssetId, 1088771340],
              boxes: [],
            })
            txns.push(rewardTxn)

            // ---------- TXN 2: grantXp ----------
            const assetInt = longToByteArray(winnerAssetId)
            const assetBox = new Uint8Array([...assetInt, ...new Uint8Array(Buffer.from("xp"))])

            const xpTxn = algosdk.makeApplicationNoOpTxnFromObject({
              sender: houseAccount.addr,
              suggestedParams: params,
              appIndex: 1870514811,
              appArgs: [
                new Uint8Array(Buffer.from("grantXp")),
                algosdk.encodeUint64(5),
              ],
              accounts: [],
              foreignApps: [],
              foreignAssets: [winnerAssetId],
              boxes: [{ appIndex: 0, name: assetBox }],
            })
            txns.push(xpTxn)

            return txns
          },
        })

        console.log("✅ Submitted group txId:", txId)
        console.log(confirmedTxn)
      }
    }
  } catch (e) {
    console.warn("⚠️ Outcome holder lookup failed:", e?.message || e)
  }

  // ---------------------------
  // NEW: Upload video to regular Firebase Storage BEFORE YouTube
  // ---------------------------
  let storageUpload = null
  try {
    const meta = makeYouTubeMetadataShorts({
      aName: A.creature_name,
      bName: B.creature_name,
      durationSec,
    })

    const slugify = (s) =>
      String(s || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80)

    const shortId = () => `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`

    // Storage object path (in your Firebase Storage bucket)
    const objectPath = `fights/${slugify(A.creature_name)}_vs_${slugify(
      B.creature_name
    )}_${shortId()}.mp4`

    // Read the mp4 into memory (Buffer is a Uint8Array, works with uploadBytes)
    const videoBytes = await fsp.readFile(finalVideo)

    // Firebase Storage (regular SDK)
    const storage = getStorage()
    const objRef = storageRef(storage, objectPath)

    // customMetadata values MUST be strings
    const customMetadata = {
      title: String(meta.title || ""),
      description: String(meta.description || ""),
      tags: Array.isArray(meta.tags) ? meta.tags.join(",") : String(meta.tags || ""),
      categoryId: String(meta.categoryId || ""),
      durationSec: String(durationSec || ""),
      frames: String(frames || ""),
      fps: String(FIGHT_FPS || ""),
      aName: String(A.creature_name || ""),
      bName: String(B.creature_name || ""),
      aAssetId: String(A?.arena?.assetId ?? arenaA?.assetId ?? ""),
      bAssetId: String(B?.arena?.assetId ?? arenaB?.assetId ?? ""),
      winnerSide: String(winnerSide || ""),
      winnerName: String(winnerName || ""),
      loserSide: String(loserSide || ""),
      arenaMapName: String(arenaMap?.name || ""),
      arenaMapEffect: String(arenaMap?.effect || ""),
      arenaMapEndGame: String(arenaMap?.endGameEffect?.name || ""),
      bgPath: String(bgPath || ""),
    }

    console.log("\n☁️ Uploading video to Firebase Storage (regular SDK)...")
    const snap = await uploadBytes(objRef, videoBytes, {
      contentType: "video/mp4",
      cacheControl: "public, max-age=31536000",
      customMetadata,
    })

    const downloadURL = await getDownloadURL(snap.ref)

    storageUpload = {
      bucket: snap.metadata.bucket,
      fullPath: snap.metadata.fullPath,
      name: snap.metadata.name,
      downloadURL,
    }

    console.log("✅ Firebase Storage upload complete:")
    console.log(`  ${snap.metadata.fullPath}`)
    console.log(`  ${downloadURL}`)
  } catch (e) {
    console.warn("⚠️ Firebase Storage upload step failed:", e?.message || e)
  }

  // ---------------------------
  // YouTube upload (now after Storage upload)
  // ---------------------------
  // ---------------------------
  // Thumbnail extraction + Firebase Storage upload
  // ---------------------------
  let thumbnailDownloadURL = null
  try {
    const thumbLocalPath = path.join(fightDir, 'thumbnail.png')
    await extractThumbnailFrame(framesDir, frames, thumbLocalPath)
    console.log('🖼️  Thumbnail extracted:', thumbLocalPath)

    const slugify = (s) =>
      String(s || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80)

    const shortId = () => `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`
    const thumbObjectPath = `fights/thumbnails/${slugify(A.creature_name)}_vs_${slugify(
      B.creature_name
    )}_${shortId()}.png`

    const thumbBytes = await fsp.readFile(thumbLocalPath)
    const storage = getStorage()
    const thumbRef = storageRef(storage, thumbObjectPath)

    const thumbSnap = await uploadBytes(thumbRef, thumbBytes, {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000',
      customMetadata: {
        aName: String(A.creature_name || ''),
        bName: String(B.creature_name || ''),
        aAssetId: String(A?.arena?.assetId ?? ''),
        bAssetId: String(B?.arena?.assetId ?? ''),
      },
    })

    thumbnailDownloadURL = await getDownloadURL(thumbSnap.ref)
    console.log('✅ Thumbnail uploaded to Firebase Storage:', thumbnailDownloadURL)
  } catch (e) {
    console.warn('⚠️ Thumbnail upload step failed:', e?.message || e)
  }

  // ---------------------------
  // Re-upload the fight video to Firebase Storage with thumbnail URL in metadata
  // (overwrite / supplement the earlier storageUpload with thumbnailUrl added)
  // ---------------------------
  if (storageUpload && thumbnailDownloadURL) {
    // We can't update metadata on an already-uploaded object without re-uploading,
    // but we stored customMetadata at upload time. Instead, patch the in-memory
    // storageUpload object so the manifest and Discord embed have the thumbnail URL.
    storageUpload.thumbnailURL = thumbnailDownloadURL
  }

    // ---------------------------
  // YouTube upload + Discord announcement
  // ---------------------------
  const DISCORD_WEBHOOK_URL =
    process.env.DISCORD_WEBHOOK_URL || 'PASTE_YOUR_EXISTING_DISCORD_WEBHOOK_URL_HERE'

  const meta = makeYouTubeMetadataShorts({
    aName: A.creature_name,
    bName: B.creature_name,
    durationSec,
  })

  let youtubeVideoId = null
  let youtubeUrl = null
  let youtubeUploadSucceeded = false
  let youtubeUploadError = null

  try {
    youtubeVideoId = await uploadToYouTube({
      filePath: finalVideo,
      title: meta.title,
      description: meta.description,
      tags: meta.tags,
      categoryId: meta.categoryId,
      privacyStatus: 'public',
      madeForKids: false,
    })

    if (!youtubeVideoId) {
      throw new Error('uploadToYouTube did not return a video ID')
    }

    youtubeUrl = `https://youtu.be/${youtubeVideoId}`
    youtubeUploadSucceeded = true

    console.log('✅ YouTube upload complete:', youtubeUrl)
  } catch (e) {
    youtubeUploadError = e
    console.warn(
      '⚠️ YouTube upload step failed. Continuing with Firebase Storage fallback:',
      e?.message || e
    )
  }

  const firebaseVideoUrl = storageUpload?.downloadURL || null
  const announcementUrl = youtubeUrl || firebaseVideoUrl

  const manifest = {
    uploaded: youtubeUploadSucceeded,
    youtubeUploadSucceeded,
    videoId: youtubeVideoId,
    youtubeUrl,
    url: announcementUrl,
    fallbackUsed: !youtubeUploadSucceeded && Boolean(firebaseVideoUrl),
    youtubeUploadError: youtubeUploadError
      ? String(youtubeUploadError?.message || youtubeUploadError)
      : null,
    title: meta.title,
    descriptionPreview:
      meta.description.slice(0, 140) +
      (meta.description.length > 140 ? '…' : ''),
    durationSec,
    thumbnailURL: thumbnailDownloadURL,
    firebaseStorage: storageUpload,
    arenaMap: {
      name: arenaMap?.name || '',
      effect: arenaMap?.effect || '',
      terrain: arenaMap?.terrain || '',
      passive: arenaMap?.passiveEffect?.description || '',
      endGame: arenaMap?.endGameEffect?.name || '',
      endGameRound: getArenaMapEndGameRound(arenaMap),
    },
  }

  try {
    await fsp.writeFile(
      path.join(fightDir, 'upload_manifest.json'),
      JSON.stringify(manifest, null, 2)
    )

    console.log(
      '📝 Upload manifest saved:',
      path.join(fightDir, 'upload_manifest.json')
    )
  } catch (e) {
    console.warn('⚠️ Upload manifest save failed:', e?.message || e)
  }

  // ---------------------------
  // Discord announcement
  // ---------------------------
  if (!announcementUrl) {
    console.warn(
      '⚠️ Discord announcement skipped: no YouTube URL or Firebase Storage URL is available.'
    )
  } else {
    try {
      await sendDiscordFightAnnouncement({
        webhookUrl: DISCORD_WEBHOOK_URL,
        aName: A.creature_name,
        bName: B.creature_name,
        youtubeUrl,
        firebaseVideoUrl,
        thumbnailUrl: thumbnailDownloadURL,
        youtubeUploadSucceeded,
      })
    } catch (e) {
      console.warn('⚠️ Discord announcement failed:', e?.message || e)
    }
  }
} finally {
  stopReservationHeartbeat()
  await releaseActiveBattleChampions(claimedFight)
}
}


function buildTeamFighterConfig(character, teamAssignment = {}) {
  return {
    name: character.creature_name,
    stats: character.stats,
    arena: character.arena,
    teamId: teamAssignment.teamId,
    teamOwnerAddress: teamAssignment.ownerAddress,
    spriteIdlePath: character.spriteIdlePath,
    spriteIdleFramePaths: character.spriteIdleFramePaths,
    spriteEmotePath: character.spriteEmotePath,
    spriteMovePaths: [
      character.spriteMoveAPath,
      character.spriteMoveBPath,
      character.spriteMoveCPath,
    ],
    spriteMoveFramePathSets: [
      character.spriteMoveAFramePaths,
      character.spriteMoveBFramePaths,
      character.spriteMoveCFramePaths,
    ],
    moveEffectPaths: [
      character.moveAEffectPath,
      character.moveBEffectPath,
      character.moveCEffectPath,
    ],
    moveEffectFramePathSets: [
      character.moveAEffectFramePaths,
      character.moveBEffectFramePaths,
      character.moveCEffectFramePaths,
    ],
    moveMetas: [character.moveA, character.moveB, character.moveC],
    gainedItemEffects: character.gainedItemEffects,
    itemBattleEffects: character.itemBattleEffects,
    itemResistances: character.itemResistances,
    charObj: character.arena?.charObj || {},
  }
}

async function mainOnce() {
  ensureDir(OUT_DIR)

  const arenaChars = await fetchArenaCharacters()
  const validArena = arenaChars.filter(hasUsableCharacterObject)
  const missingCharObj = arenaChars.filter((c) => !hasUsableCharacterObject(c))
  if (missingCharObj.length) {
    console.log(
      'Skipping arena champions without Firebase character objects:',
      missingCharObj.map((c) => c.assetId)
    )
  }

  if (validArena.length < 4) {
    throw new Error(
      `Need at least 4 valid arena characters with Firebase charObj; found ${validArena.length}`
    )
  }

  const claimedFight = await pickAndReserveArenaChampionTeamFight(validArena)
  const stopReservationHeartbeat = startActiveBattleChampionHeartbeat(claimedFight)
  const arenaGroup = claimedFight.arenaGroup
  const teamAssignments = claimedFight.teamAssignments || []

  try {
    const characters = []
    for (let i = 0; i < arenaGroup.length; i += 1) {
      characters.push(await prepareArenaCharacter(arenaGroup[i], `character${GROUP_SIDES[i]}`))
    }

    console.log('Using arena team fight characters:')
    characters.forEach((character, index) => {
      const assignment = teamAssignments[index] || {}
      console.log(
        `  ${GROUP_SIDES[index]} [${assignment.teamId || 'team'}] = ${character.creature_name} (assetId ${character.arena.assetId}, wallet ${assignment.ownerAddress || character.arena.ownerAddress || 'unknown'})`
      )
    })

    for (const index of [1, 3]) {
      await flipAllPngsHorizontally(characters[index].spritesDir)
      await flipAllPngsHorizontally(characters[index].moveVisualsDir)
    }

    const fightDir = path.join(OUT_DIR, 'team_fight_scene')
    ensureDir(fightDir)
    await emptyDir(fightDir)

    const names = characters.map((character) => character.creature_name)
    const assetIds = characters.map((character) => character.arena.assetId)
    const arenaMap = getRandomArenaEffectMap()
    console.log(`Selected arena map: ${arenaMap.name} (${arenaMap.effect})`)
    const standingLayoutHint = await buildGroupStandingLayoutHint(characters)
    const bgPath = await generateFightBackground(names, null, fightDir, arenaMap, standingLayoutHint)
    const effectIcons = await loadEffectIcons()
    const framesDir = path.join(fightDir, 'frames')
    const audioTimeline = makeAudioTimeline()

    const outcome = await createTeamFightFrames({
      fighters: characters.map((character, index) =>
        buildTeamFighterConfig(character, teamAssignments[index])
      ),
      backgroundPath: bgPath,
      outFramesDir: framesDir,
      scaleFraction: GROUP_FIGHT_SCALE_FRACTION,
      audioTimeline,
      effectIcons,
      arenaMap,
    })

    console.log(`Team fight frames created: ${outcome.frames} frames at ${FIGHT_FPS} fps`)

    const silentVideo = path.join(fightDir, 'team_character_battle.mp4')
    await stitchFramesToVideo(framesDir, silentVideo, FIGHT_FPS)

    const durationSec = outcome.frames / FIGHT_FPS
    const finalVideo = await buildAndMuxAudio({
      videoPath: silentVideo,
      audioTimeline,
      outDir: fightDir,
      durationSec,
    })

    try {
      const winnerAssetIds = outcome.winnerAssetIds || []
      const representativeWinnerAssetId = winnerAssetIds[0] || outcome.winnerAssetId
      const loserAssetIds = outcome.loserAssetIds || []
      const rewardOtherAssetIds = assetIds
        .filter((assetId) => Number(assetId) !== Number(representativeWinnerAssetId))
        .filter(Boolean)

      console.log('\nTeam fight outcome:')
      console.log(`  Winner team: ${outcome.winnerTeamId}`)
      console.log(`  Winner wallet: ${outcome.winnerTeamOwner || 'unknown'}`)
      console.log(`  Winner names: ${(outcome.winnerNames || []).join(' & ')}`)
      console.log(`  Winner assetIds: ${winnerAssetIds.join(', ')}`)
      console.log(`  Opposing loser assetIds: ${loserAssetIds.join(', ')}`)

      if (representativeWinnerAssetId) {
        if (winnerAssetIds.length !== 2) {
          throw new Error(
            `Cannot submit team reward without exactly 2 winner asset ids; found ${winnerAssetIds.length}.`
          )
        }
        if (rewardOtherAssetIds.length !== 3) {
          throw new Error(
            `Cannot submit team reward without exactly 3 additional participating asset ids; found ${rewardOtherAssetIds.length}.`
          )
        }
        const winHolders = await findAssetHolders(representativeWinnerAssetId, { minAmount: 1, maxAccounts: 1 })
        const rewardWallet = normalizeWalletAddress(winHolders[0]?.address || outcome.winnerTeamOwner)
        if (!rewardWallet) console.log('  Winner wallet: none found')
        else {
          const { txId, confirmedTxn } = await sendGroupedTxnsWithFreshParamsAndRetry({
            client,
            houseAccount,
            attempts: 3,
            confirmRounds: 24,
            buildTxns: async (params) => {
              const txns = []
              txns.push(
                algosdk.makeApplicationNoOpTxnFromObject({
                  sender: houseAccount.addr,
                  suggestedParams: params,
                  appIndex: 3339943603,
                  appArgs: [new Uint8Array(Buffer.from('reward4'))],
                  accounts: [rewardWallet],
                  foreignApps: [],
                  foreignAssets: [representativeWinnerAssetId, ...rewardOtherAssetIds, 1088771340],
                  boxes: [],
                })
              )

              for (const winnerAssetId of winnerAssetIds) {
                const assetInt = longToByteArray(winnerAssetId)
                const assetBox = new Uint8Array([...assetInt, ...new Uint8Array(Buffer.from('xp'))])
                txns.push(
                  algosdk.makeApplicationNoOpTxnFromObject({
                    sender: houseAccount.addr,
                    suggestedParams: params,
                    appIndex: 1870514811,
                    appArgs: [
                      new Uint8Array(Buffer.from('grantXp')),
                      algosdk.encodeUint64(10),
                    ],
                    accounts: [],
                    foreignApps: [],
                    foreignAssets: [winnerAssetId],
                    boxes: [{ appIndex: 0, name: assetBox }],
                  })
                )
              }
              return txns
            },
          })

          console.log('Submitted team reward txId:', txId)
          console.log(confirmedTxn)
        }
      }
    } catch (e) {
      console.warn('Outcome holder lookup/reward failed:', e?.message || e)
    }

    const slugifyStorage = (s) =>
      String(s || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80)
    const shortId = () => `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`
    const teamNames = [
      [characters[0]?.creature_name, characters[2]?.creature_name].filter(Boolean).join(' & '),
      [characters[1]?.creature_name, characters[3]?.creature_name].filter(Boolean).join(' & '),
    ]
    const teamWallets = {
      [TEAM_LEFT_ID]: teamAssignments.find((assignment) => assignment.teamId === TEAM_LEFT_ID)?.ownerAddress || '',
      [TEAM_RIGHT_ID]: teamAssignments.find((assignment) => assignment.teamId === TEAM_RIGHT_ID)?.ownerAddress || '',
    }
    const meta = makeYouTubeMetadataTeamBattle({
      names,
      teamNames,
      winnerName: outcome.winnerName,
      winnerTeamName: (outcome.winnerNames || []).join(' & '),
      durationSec,
    })

    let storageUpload = null
    try {
      const objectPath = `team_fights/${slugifyStorage(teamNames.join('_vs_'))}_${shortId()}.mp4`
      const videoBytes = await fsp.readFile(finalVideo)
      const storage = getStorage()
      const objRef = storageRef(storage, objectPath)
      const customMetadata = {
        title: String(meta.title || ''),
        description: String(meta.description || ''),
        tags: Array.isArray(meta.tags) ? meta.tags.join(',') : String(meta.tags || ''),
        categoryId: String(meta.categoryId || ''),
        durationSec: String(durationSec || ''),
        frames: String(outcome.frames || ''),
        fps: String(FIGHT_FPS || ''),
        names: names.join('|'),
        teams: teamNames.join('|'),
        teamWallets: Object.entries(teamWallets).map(([teamId, wallet]) => `${teamId}:${wallet}`).join('|'),
        assetIds: assetIds.join('|'),
        winnerTeamId: String(outcome.winnerTeamId || ''),
        winnerTeamOwner: String(outcome.winnerTeamOwner || ''),
        winnerNames: (outcome.winnerNames || []).join('|'),
        winnerAssetIds: (outcome.winnerAssetIds || []).join('|'),
        winnerSide: String(outcome.winnerSide || ''),
        winnerName: String(outcome.winnerName || ''),
        winnerAssetId: String(outcome.winnerAssetId || ''),
        loserAssetIds: (outcome.loserAssetIds || []).join('|'),
        arenaMapName: String(arenaMap?.name || ''),
        arenaMapEffect: String(arenaMap?.effect || ''),
        arenaMapEndGame: String(arenaMap?.endGameEffect?.name || ''),
        arenaMapEndGameRound: String(GROUP_ARENA_END_GAME_ROUND),
        bgPath: String(bgPath || ''),
      }
      console.log('\nUploading team fight video to Firebase Storage...')
      const snap = await uploadBytes(objRef, videoBytes, {
        contentType: 'video/mp4',
        cacheControl: 'public, max-age=31536000',
        customMetadata,
      })
      const downloadURL = await getDownloadURL(snap.ref)
      storageUpload = {
        bucket: snap.metadata.bucket,
        fullPath: snap.metadata.fullPath,
        name: snap.metadata.name,
        downloadURL,
      }
      console.log('Firebase Storage upload complete:', downloadURL)
    } catch (e) {
      console.warn('Firebase Storage upload step failed:', e?.message || e)
    }

    let thumbnailDownloadURL = null
    try {
      const thumbLocalPath = path.join(fightDir, 'thumbnail.png')
      await extractThumbnailFrame(framesDir, outcome.frames, thumbLocalPath)
      const thumbObjectPath = `team_fights/thumbnails/${slugifyStorage(teamNames.join('_vs_'))}_${shortId()}.png`
      const thumbBytes = await fsp.readFile(thumbLocalPath)
      const storage = getStorage()
      const thumbRef = storageRef(storage, thumbObjectPath)
      const thumbSnap = await uploadBytes(thumbRef, thumbBytes, {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000',
        customMetadata: {
          names: names.join('|'),
          teams: teamNames.join('|'),
          assetIds: assetIds.join('|'),
          winnerTeamId: String(outcome.winnerTeamId || ''),
          winnerNames: (outcome.winnerNames || []).join('|'),
          winnerAssetIds: (outcome.winnerAssetIds || []).join('|'),
          winnerName: String(outcome.winnerName || ''),
          winnerAssetId: String(outcome.winnerAssetId || ''),
        },
      })
      thumbnailDownloadURL = await getDownloadURL(thumbSnap.ref)
      console.log('Thumbnail uploaded to Firebase Storage:', thumbnailDownloadURL)
    } catch (e) {
      console.warn('Thumbnail upload step failed:', e?.message || e)
    }

    if (storageUpload && thumbnailDownloadURL) {
      storageUpload.thumbnailURL = thumbnailDownloadURL
    }

    const DISCORD_WEBHOOK_URL =
      process.env.DISCORD_WEBHOOK_URL || 'PASTE_YOUR_EXISTING_DISCORD_WEBHOOK_URL_HERE'
    let youtubeVideoId = null
    let youtubeUrl = null
    let youtubeUploadSucceeded = false
    let youtubeUploadError = null

    try {
      youtubeVideoId = await uploadToYouTube({
        filePath: finalVideo,
        title: meta.title,
        description: meta.description,
        tags: meta.tags,
        categoryId: meta.categoryId,
        privacyStatus: 'public',
        madeForKids: false,
      })
      if (!youtubeVideoId) throw new Error('uploadToYouTube did not return a video ID')
      youtubeUrl = `https://youtu.be/${youtubeVideoId}`
      youtubeUploadSucceeded = true
      console.log('YouTube upload complete:', youtubeUrl)
    } catch (e) {
      youtubeUploadError = e
      console.warn('YouTube upload step failed. Continuing with Firebase Storage fallback:', e?.message || e)
    }

    const firebaseVideoUrl = storageUpload?.downloadURL || null
    const announcementUrl = youtubeUrl || firebaseVideoUrl
    const manifest = {
      uploaded: youtubeUploadSucceeded,
      youtubeUploadSucceeded,
      videoId: youtubeVideoId,
      youtubeUrl,
      url: announcementUrl,
      fallbackUsed: !youtubeUploadSucceeded && Boolean(firebaseVideoUrl),
      youtubeUploadError: youtubeUploadError
        ? String(youtubeUploadError?.message || youtubeUploadError)
        : null,
      title: meta.title,
      descriptionPreview: meta.description.slice(0, 140) + (meta.description.length > 140 ? '...' : ''),
      durationSec,
      thumbnailURL: thumbnailDownloadURL,
      firebaseStorage: storageUpload,
      teamFight: {
        names,
        teams: teamNames,
        teamWallets,
        assetIds,
        winnerTeamId: outcome.winnerTeamId,
        winnerTeamOwner: outcome.winnerTeamOwner,
        winnerSides: outcome.winnerSides,
        winnerNames: outcome.winnerNames,
        winnerAssetIds: outcome.winnerAssetIds,
        winnerSide: outcome.winnerSide,
        winnerName: outcome.winnerName,
        winnerAssetId: outcome.winnerAssetId,
        loserAssetIds: outcome.loserAssetIds,
        arenaMap: {
          name: arenaMap?.name || '',
          effect: arenaMap?.effect || '',
          terrain: arenaMap?.terrain || '',
          passive: arenaMap?.passiveEffect?.description || '',
          endGame: arenaMap?.endGameEffect?.name || '',
          endGameRound: GROUP_ARENA_END_GAME_ROUND,
        },
      },
    }

    try {
      await fsp.writeFile(
        path.join(fightDir, 'upload_manifest.json'),
        JSON.stringify(manifest, null, 2)
      )
      console.log('Upload manifest saved:', path.join(fightDir, 'upload_manifest.json'))
    } catch (e) {
      console.warn('Upload manifest save failed:', e?.message || e)
    }

    if (!announcementUrl) {
      console.warn('Discord announcement skipped: no YouTube URL or Firebase Storage URL is available.')
    } else {
      try {
        await sendDiscordFightAnnouncement({
          webhookUrl: DISCORD_WEBHOOK_URL,
          aName: teamNames.join(' vs '),
          bName: '',
          matchupText: teamNames.map((name) => `**${name}**`).join(' vs '),
          youtubeUrl,
          firebaseVideoUrl,
          thumbnailUrl: thumbnailDownloadURL,
          youtubeUploadSucceeded,
        })
      } catch (e) {
        console.warn('Discord announcement failed:', e?.message || e)
      }
    }
  } finally {
    stopReservationHeartbeat()
    await releaseActiveBattleChampions(claimedFight)
  }
}

/* ===================== CLOUD RUN JOB ENTRYPOINT ===================== */
export { mainOnce }

async function runOnceAndExit() {
  try {
    await mainOnce()
    console.log('Team fight simulation completed.')
  } catch (err) {
    console.error('Team fight simulation failed:', err?.stack || err?.message || err)
    process.exitCode = 1
  }
}

await runOnceAndExit()
