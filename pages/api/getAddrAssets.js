import NextCors from "nextjs-cors"
import algosdk from "algosdk"

/**
 * Deep-convert BigInt -> Number so the response is JSON-serializable as ints.
 * If a BigInt is outside JS safe-integer range, it would lose precision as a Number.
 * In that case this function converts it to a string instead (still JSON-safe).
 */
function bigIntToIntDeep(value) {
  if (typeof value === "bigint") {
    const max = BigInt(Number.MAX_SAFE_INTEGER)
    const min = BigInt(Number.MIN_SAFE_INTEGER)

    // Convert to Number only when it is safe to do so.
    if (value <= max && value >= min) return Number(value)

    // Fallback to string to avoid precision loss.
    return value.toString()
  }

  if (Array.isArray(value)) {
    return value.map(bigIntToIntDeep)
  }

  if (value && typeof value === "object") {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = bigIntToIntDeep(v)
    }
    return out
  }

  return value
}

async function getAddrAssets(req, res) {
  await NextCors(req, res, {
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    origin: "*",
    optionsSuccessStatus: 200,
  })

  const indexerClient = new algosdk.Indexer(
    "",
    "https://mainnet-idx.algonode.cloud",
    443
  )

  const addr = req?.body?.activeAccount
  if (!addr) {
    return res.status(400).json({ error: "Missing req.body.activeAccount" })
  }

  const addrAssets = []

  let responseAddr = await indexerClient.lookupAccountAssets(addr).limit(1000).do()
  let nextTokenAddr = responseAddr.nextToken

  const pushIfNonZero = (asset) => {
    const amt = asset?.amount
    const amtBI =
      typeof amt === "bigint" ? amt : typeof amt === "number" ? BigInt(amt) : null

    if (amtBI !== null && amtBI > 0n) addrAssets.push(asset)
  }

  if (Array.isArray(responseAddr.assets)) {
    responseAddr.assets.forEach(pushIfNonZero)
  }

  while (Array.isArray(responseAddr.assets) && responseAddr.assets.length === 1000) {
    responseAddr = await indexerClient
      .lookupAccountAssets(addr)
      .nextToken(nextTokenAddr)
      .limit(1000)
      .do()

    nextTokenAddr = responseAddr.nextToken
    if (!Array.isArray(responseAddr.assets)) break

    responseAddr.assets.forEach(pushIfNonZero)
  }

  // Convert ALL BigInts in the payload before returning
  return res.status(200).json(bigIntToIntDeep(addrAssets))
}

export default getAddrAssets
