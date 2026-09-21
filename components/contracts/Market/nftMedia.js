import algosdk from "algosdk"
import { CID } from "multiformats/cid"
import * as mfsha2 from "multiformats/hashes/sha2"
import * as digest from "multiformats/hashes/digest"

const IPFS_GATEWAYS = [
  "https://ipfs-pera.algonode.dev/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
]
const ALGOD_ENDPOINTS = {
  mainnet: "https://mainnet-api.algonode.cloud",
  testnet: "https://testnet-api.algonode.cloud",
}
const TINYMAN_ASSET_LIST_URL = "https://asa-list.tinyman.org/assets.json"
const ARC89_METADATA_HEADER_SIZE = 51
const IPFS_CODEC_CODES = {
  "dag-pb": 0x70,
  raw: 0x55,
}

let tinymanAssetsPromise = null

export function getAssetParams(asset = {}) {
  return asset?.params || asset || {}
}

export function getAssetParam(params = {}, keys = []) {
  for (const key of keys) {
    if (params[key] !== undefined && params[key] !== null) return params[key]
  }

  return undefined
}

export function getAssetDisplayName(params = {}, fallback = "Asset") {
  return (
    getAssetParam(params, ["name", "assetName", "asset-name"]) ||
    getAssetParam(params, ["unitName", "unit-name"]) ||
    fallback
  )
}

export function getAssetDecimals(params = {}) {
  const decimals = Number(getAssetParam(params, ["decimals", "defaultFrozenDecimals"]) || 0)
  return Number.isFinite(decimals) ? decimals : 0
}

function getTinymanAssets() {
  if (!tinymanAssetsPromise) {
    tinymanAssetsPromise = fetch(TINYMAN_ASSET_LIST_URL)
      .then((response) => (response.ok ? response.json() : {}))
      .catch(() => ({}))
  }

  return tinymanAssetsPromise
}

async function resolveTinymanIcon(assetId) {
  if (!assetId && assetId !== 0) return ""

  const assets = await getTinymanAssets()
  return assets?.[assetId] ? `https://asa-list.tinyman.org/assets/${String(assetId)}/icon.png` : ""
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))]
}

function stripUriFragment(uri = "") {
  return String(uri || "").trim().split("#")[0]
}

function replaceAssetId(uri = "", assetId) {
  return String(uri || "").replaceAll("{id}", String(assetId || ""))
}

function isRelativeUri(uri = "") {
  const normalized = String(uri || "").trim()
  return Boolean(normalized) && !normalized.includes(":")
}

function resolveRelativeUri(uri = "", baseUri = "") {
  if (!isRelativeUri(uri)) return uri

  const cleanBase = stripUriFragment(baseUri)
  if (!cleanBase) return uri

  const baseDir = cleanBase.endsWith("/")
    ? cleanBase
    : cleanBase.slice(0, cleanBase.lastIndexOf("/") + 1)

  return `${baseDir}${uri}`
}

function getIpfsPathFromGatewayUrl(uri = "") {
  try {
    const url = new URL(uri)
    const marker = "/ipfs/"
    const markerIndex = url.pathname.toLowerCase().indexOf(marker)
    if (markerIndex < 0) return ""

    return `${url.pathname.slice(markerIndex + marker.length)}${url.search || ""}`
  } catch {
    return ""
  }
}

function isDataImageUri(uri = "") {
  return String(uri || "").trim().toLowerCase().startsWith("data:image/")
}

function normalizeEmbeddedImage(uri = "") {
  const normalized = String(uri || "").trim()
  if (isDataImageUri(normalized)) return normalized
  if (normalized.toLowerCase().startsWith("<svg")) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalized)}`
  }

  return ""
}

function expandArc19Template(uri = "", params = {}) {
  const normalized = String(uri || "").trim()
  if (!normalized.toLowerCase().startsWith("template-ipfs://")) return normalized

  const match = normalized.match(
    /template-ipfs:\/\/\{ipfscid:([01]):([a-z0-9-]+):([a-z0-9-]+):([a-z0-9-]+)\}/i
  )

  if (!match) return ""

  const [, versionText, codecName, fieldName, hashName] = match
  if (fieldName.toLowerCase() !== "reserve" || hashName.toLowerCase() !== "sha2-256") return ""

  const reserve = getAssetParam(params, ["reserve", "reserveAddress", "reserve-address"])
  const codecCode = IPFS_CODEC_CODES[codecName.toLowerCase()]
  const version = Number(versionText)
  if (!reserve || !codecCode || !Number.isFinite(version)) return ""
  if (version === 0 && codecName.toLowerCase() !== "dag-pb") return ""

  try {
    const addr = algosdk.decodeAddress(reserve)
    const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey)
    const cid = CID.create(version, codecCode, mhdigest)
    return normalized.replace(match[0], `ipfs://${cid.toString()}`)
  } catch {
    return ""
  }
}

function normalizeAssetUriCandidates(uri = "", { assetId, params = {}, baseUri = "" } = {}) {
  const embedded = normalizeEmbeddedImage(uri)
  if (embedded) return [embedded]

  let normalized = replaceAssetId(resolveRelativeUri(uri, baseUri), assetId).trim()
  if (!normalized) return []

  normalized = expandArc19Template(normalized, params) || normalized
  normalized = stripUriFragment(normalized)
  const lower = normalized.toLowerCase()

  if (lower.startsWith("ar://")) {
    return [`https://arweave.net/${normalized.slice(5)}`]
  }

  if (lower.startsWith("ipfs://")) {
    let ipfsPath = normalized.slice("ipfs://".length)
    if (ipfsPath.toLowerCase().startsWith("ipfs/")) ipfsPath = ipfsPath.slice(5)
    return IPFS_GATEWAYS.map((gateway) => `${gateway}${ipfsPath}`)
  }

  const gatewayIpfsPath = getIpfsPathFromGatewayUrl(normalized)
  if (gatewayIpfsPath) return IPFS_GATEWAYS.map((gateway) => `${gateway}${gatewayIpfsPath}`)

  return [normalized]
}

function normalizeAssetUri(uri = "", options = {}) {
  return normalizeAssetUriCandidates(uri, options)[0] || ""
}

function isArc3Asset(params = {}) {
  const name = String(getAssetDisplayName(params, "") || "").toLowerCase()
  const url = String(getAssetParam(params, ["url", "assetUrl", "asset-url"]) || "").toLowerCase()

  return name === "arc3" || name.endsWith("@arc3") || url.endsWith("#arc3")
}

function isLikelyMetadataUri(uri = "", params = {}) {
  const normalized = String(uri || "").toLowerCase()
  const clean = stripUriFragment(normalized)

  return (
    isArc3Asset(params) ||
    normalized.endsWith("#arc3") ||
    clean.endsWith(".json") ||
    clean.endsWith("/metadata") ||
    clean.endsWith("/metadata.json") ||
    clean.includes("/metadata/")
  )
}

async function fetchJsonMaybe(uri = "") {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null
  const timeout = controller ? setTimeout(() => controller.abort(), 5000) : null

  try {
    const response = await fetch(uri, {
      headers: { Accept: "application/json, text/plain, */*" },
      signal: controller?.signal,
    })

    if (!response.ok) return null

    const contentType = response.headers.get("content-type") || ""
    if (contentType && !contentType.includes("json") && !contentType.includes("text")) return null

    const text = await response.text()
    const trimmed = text.trim()
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null

    return JSON.parse(trimmed)
  } catch {
    return null
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

async function fetchJsonFromCandidates(uris = []) {
  for (const uri of uniqueStrings(uris)) {
    const metadata = await fetchJsonMaybe(uri)
    if (metadata && typeof metadata === "object") return metadata
  }

  return null
}

function getMetadataMediaFields(metadata = {}) {
  const properties = metadata.properties && typeof metadata.properties === "object" ? metadata.properties : {}
  const files = Array.isArray(metadata.files) ? metadata.files : []
  const propertyFiles = Array.isArray(properties.files) ? properties.files : []
  const mimeType = String(
    metadata.image_mimetype ||
      metadata.image_mime_type ||
      metadata.mime_type ||
      metadata.mimetype ||
      ""
  ).toLowerCase()
  const animationMimeType = String(
    metadata.animation_url_mimetype || metadata.animation_mimetype || ""
  ).toLowerCase()
  const includeMediaUrl = !mimeType || mimeType.startsWith("image/")
  const includeAnimationUrl = animationMimeType.startsWith("image/")
  const imageFileUris = [...files, ...propertyFiles]
    .filter((file) => {
      if (!file || typeof file !== "object") return false
      const fileMimeType = String(file.mime_type || file.mimetype || file.type || "").toLowerCase()
      return !fileMimeType || fileMimeType.startsWith("image/")
    })
    .map((file) => file.uri || file.url || file.src)

  return [
    metadata.image,
    metadata.image_url,
    metadata.imageUrl,
    metadata.image_data,
    metadata.imageData,
    includeMediaUrl ? metadata.media_url : "",
    includeMediaUrl ? metadata.mediaUrl : "",
    includeMediaUrl ? metadata.file_url : "",
    includeMediaUrl ? metadata.fileUrl : "",
    properties.image,
    properties.image_url,
    properties.imageUrl,
    properties.image_data,
    properties.imageData,
    properties.media_url,
    properties.mediaUrl,
    properties.file_url,
    properties.fileUrl,
    includeAnimationUrl ? metadata.animation_url : "",
    includeAnimationUrl ? metadata.animationUrl : "",
    ...imageFileUris,
  ].filter((value) => typeof value === "string" && value.trim())
}

function resolveMetadataImageCandidates(metadata = {}, { assetId, params = {}, baseUri = "" } = {}) {
  const candidates = []
  for (const field of getMetadataMediaFields(metadata)) {
    candidates.push(...normalizeAssetUriCandidates(field, { assetId, params, baseUri }))
  }

  return uniqueStrings(candidates)
}

function resolveMetadataImage(metadata = {}, options = {}) {
  return resolveMetadataImageCandidates(metadata, options)[0] || ""
}

async function resolveMetadataImageCandidatesFromUri(uri = "", { assetId, params = {} } = {}) {
  const metadataUrls = normalizeAssetUriCandidates(uri, { assetId, params })
  if (!metadataUrls.length) return []

  const metadata = await fetchJsonFromCandidates(metadataUrls)
  if (!metadata || typeof metadata !== "object") return []

  return resolveMetadataImageCandidates(metadata, {
    assetId,
    params,
    baseUri: uri,
  })
}

async function resolveMetadataImageFromUri(uri = "", options = {}) {
  return (await resolveMetadataImageCandidatesFromUri(uri, options))[0] || ""
}

function decodeNoteText(note) {
  if (!note) return ""

  if (typeof note !== "string") {
    try {
      return new TextDecoder().decode(note)
    } catch {
      return ""
    }
  }

  const trimmed = note.trim()
  if (trimmed.startsWith("{")) return trimmed

  try {
    const binary = globalThis.atob(trimmed)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return trimmed
  }
}

function parseArc69Metadata(note) {
  const text = decodeNoteText(note).trim()
  const candidates = [
    text,
    text.replace(/^arc69:j/i, ""),
    text.replace(/^arc69:/i, ""),
  ]

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate.trim())
      if (String(parsed?.standard || "").toLowerCase() === "arc69") return parsed
    } catch {
      // Keep trying the next common note shape.
    }
  }

  return null
}

function uint64ToBytes(value) {
  let remaining = BigInt(value || 0)
  const bytes = new Uint8Array(8)
  for (let index = 7; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & 0xffn)
    remaining >>= 8n
  }

  return bytes
}

function bytesToBase64(bytes = new Uint8Array()) {
  try {
    let binary = ""
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte)
    })
    return globalThis.btoa(binary)
  } catch {
    return ""
  }
}

function base64ToBytes(value = "") {
  try {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
    const binary = globalThis.atob(padded)
    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
  } catch {
    return new Uint8Array()
  }
}

function readUint64(bytes = new Uint8Array()) {
  let value = 0n
  bytes.forEach((byte) => {
    value = (value << 8n) + BigInt(byte)
  })

  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : 0
}

function parseArc89Uri(uri = "", assetId) {
  const trimmed = stripUriFragment(uri)
  if (!trimmed.toLowerCase().startsWith("algorand://")) return null

  const withoutScheme = trimmed.slice("algorand://".length)
  const [pathPart, queryPart = ""] = withoutScheme.split("?")
  const pathSegments = pathPart.split("/").filter(Boolean)
  let network = "mainnet"
  let appSegmentIndex = pathSegments.findIndex((segment) => segment.toLowerCase() === "app")

  if (pathSegments[0]?.toLowerCase().startsWith("net:")) {
    const networkName = pathSegments[0].slice(4).toLowerCase()
    if (networkName === "testnet") network = "testnet"
    appSegmentIndex = pathSegments.findIndex((segment, index) => index > 0 && segment.toLowerCase() === "app")
  }

  if (appSegmentIndex < 0) return null

  const appId = Number(pathSegments[appSegmentIndex + 1])
  if (!Number.isFinite(appId) || appId <= 0) return null

  const search = new URLSearchParams(queryPart)
  const boxParam = search.get("box")
  const boxNameBase64 = boxParam
    ? bytesToBase64(base64ToBytes(boxParam))
    : bytesToBase64(uint64ToBytes(assetId))

  if (!boxNameBase64) return null

  return {
    appId,
    network,
    boxNameBase64,
  }
}

async function fetchArc89Metadata(uri = "", { assetId, seen = new Set() } = {}) {
  const parsed = parseArc89Uri(uri, assetId)
  if (!parsed || seen.has(`${parsed.network}:${parsed.appId}:${parsed.boxNameBase64}`)) return null

  const endpoint = ALGOD_ENDPOINTS[parsed.network]
  if (!endpoint) return null

  seen.add(`${parsed.network}:${parsed.appId}:${parsed.boxNameBase64}`)

  try {
    const response = await fetch(
      `${endpoint}/v2/applications/${parsed.appId}/box?name=${encodeURIComponent(parsed.boxNameBase64)}`
    )
    if (!response.ok) return null

    const body = await response.json()
    const bytes = base64ToBytes(body?.value || "")
    if (bytes.length < ARC89_METADATA_HEADER_SIZE) return null

    const deprecatedBy = readUint64(bytes.slice(43, 51))
    const metadataText =
      bytes.length > ARC89_METADATA_HEADER_SIZE
        ? new TextDecoder()
            .decode(bytes.slice(ARC89_METADATA_HEADER_SIZE))
            .replace(/\0+$/g, "")
            .trim()
        : ""

    if (metadataText) {
      return JSON.parse(metadataText)
    }

    if (deprecatedBy) {
      const replacementUri = uri.replace(/\/app\/\d+/i, `/app/${deprecatedBy}`)
      return fetchArc89Metadata(replacementUri, { assetId, seen })
    }
  } catch {
    return null
  }

  return null
}

async function getLatestArc69Metadata(indexerClient, assetId) {
  if (!indexerClient?.lookupAssetTransactions || !assetId) return null

  try {
    const transactions = []
    let nextToken = ""
    let page = 0

    do {
      let request = indexerClient
        .lookupAssetTransactions(Number(assetId))
        .txType("acfg")
        .limit(100)

      if (nextToken) request = request.nextToken(nextToken)

      const response = await request.do()
      transactions.push(...(response?.transactions || []))
      nextToken = response?.["next-token"] || ""
      page += 1
    } while (nextToken && page < 4)

    transactions.sort(
      (a, b) => Number(b?.["confirmed-round"] || 0) - Number(a?.["confirmed-round"] || 0)
    )

    for (let index = 0; index < transactions.length; index += 1) {
      const metadata = parseArc69Metadata(transactions[index]?.note)
      if (metadata) return metadata
    }
  } catch {
    return null
  }

  return null
}

export async function resolveAssetImageUrls({
  asset,
  assetId,
  indexerClient,
  preferAsaIcon = false,
} = {}) {
  const params = getAssetParams(asset)
  const resolvedAssetId = assetId || asset?.index
  const assetUrl = getAssetParam(params, ["url", "assetUrl", "asset-url"]) || ""
  const candidates = []

  if (preferAsaIcon) {
    const icon = await resolveTinymanIcon(resolvedAssetId)
    if (icon) candidates.push(icon)
  }

  if (assetUrl) {
    const arc89Metadata = await fetchArc89Metadata(assetUrl, {
      assetId: resolvedAssetId,
    })
    if (arc89Metadata) {
      candidates.push(
        ...resolveMetadataImageCandidates(arc89Metadata, {
          assetId: resolvedAssetId,
          params,
          baseUri: assetUrl,
        })
      )
    }

    const metadataImages = await resolveMetadataImageCandidatesFromUri(assetUrl, {
      assetId: resolvedAssetId,
      params,
    })
    candidates.push(...metadataImages)

    if (!isLikelyMetadataUri(assetUrl, params)) {
      candidates.push(...normalizeAssetUriCandidates(assetUrl, {
        assetId: resolvedAssetId,
        params,
      }))
    }
  }

  const arc69Metadata = await getLatestArc69Metadata(indexerClient, resolvedAssetId)
  if (arc69Metadata) {
    candidates.push(...resolveMetadataImageCandidates(arc69Metadata, {
        assetId: resolvedAssetId,
        params,
        baseUri: assetUrl,
      }))
  }

  if (!preferAsaIcon) {
    const icon = await resolveTinymanIcon(resolvedAssetId)
    if (icon) candidates.push(icon)
  }

  return uniqueStrings(candidates)
}

export async function resolveAssetImageUrl(options = {}) {
  return (await resolveAssetImageUrls(options))[0] || ""
}
