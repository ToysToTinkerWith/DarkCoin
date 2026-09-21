import NextCors from "nextjs-cors"
import algosdk from "algosdk"

function sendJson(res, data, status = 200) {
  const body = JSON.stringify(data, (_key, value) => {
    return typeof value === "bigint" ? Number(value) : value
  })

  res.status(status)
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.send(body)
}

const DARK_COIN_ID = 1088771340
const DC_CREATOR = "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY"
const TRAIT_CREATOR = "3SKDMKVJQD7RR62DMOIXVK3CQQWSFXAM2JXMIRDOPLIW4MWWPBWYV3NZ3Y"
const DAO_CREATOR = "AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE"
const DAO_PREFIX = "Dark Coin DAO"

function getPositiveWalletHolding(accountMap, assetId) {
  const holding = accountMap.get(Number(assetId))
  if (!holding) return null
  if (Number(holding.amount) <= 0) return null
  return holding
}

async function collectCreatedAssetsForWallet({
  indexerClient,
  creator,
  accountMap,
  output,
  filterFn = null,
}) {
  let nextToken = undefined
  let fetchedCount = 0

  do {
    let req = indexerClient.lookupAccountCreatedAssets(creator).limit(1000)

    if (nextToken) {
      req = req.nextToken(nextToken)
    }

    const response = await req.do()
    const createdAssets = Array.isArray(response?.assets) ? response.assets : []

    fetchedCount = createdAssets.length
    nextToken = response?.nextToken

    createdAssets.forEach((asset) => {
      const walletHolding = getPositiveWalletHolding(accountMap, asset.index)
      if (!walletHolding) return

      if (typeof filterFn === "function" && !filterFn(asset)) return

      output.push({
        asset,
        amount: walletHolding.amount,
      })
    })
  } while (fetchedCount === 1000)
}

async function getDcAssets(req, res) {
  await NextCors(req, res, {
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    origin: "*",
    optionsSuccessStatus: 200,
  })

  try {
    const address = req.body?.address

    if (!address) {
      return sendJson(res, { error: "Missing address" }, 400)
    }

    const indexerClient = new algosdk.Indexer("", "https://mainnet-idx.algonode.cloud", 443)

    const accountMap = new Map()
    const accountDc = []

    let nextToken = undefined
    let fetchedCount = 0

    do {
      let req = indexerClient.lookupAccountAssets(address).limit(1000)

      if (nextToken) {
        req = req.nextToken(nextToken)
      }

      const accountAssets = await req.do()
      const assets = Array.isArray(accountAssets?.assets) ? accountAssets.assets : []

      fetchedCount = assets.length
      nextToken = accountAssets?.nextToken

      assets.forEach((asset) => {
        accountMap.set(Number(asset.assetId), {
          index: Number(asset.assetId),
          amount: Number(asset.amount),
        })
      })
    } while (fetchedCount === 1000)

    const dcHolding = getPositiveWalletHolding(accountMap, DARK_COIN_ID)
    if (dcHolding) {
      accountDc.push({
        asset: dcHolding,
        amount: dcHolding.amount,
      })
    }

    await collectCreatedAssetsForWallet({
      indexerClient,
      creator: DC_CREATOR,
      accountMap,
      output: accountDc,
    })

    await collectCreatedAssetsForWallet({
      indexerClient,
      creator: TRAIT_CREATOR,
      accountMap,
      output: accountDc,
    })

    await collectCreatedAssetsForWallet({
      indexerClient,
      creator: DAO_CREATOR,
      accountMap,
      output: accountDc,
      filterFn: (asset) => {
        const name = asset?.params?.name || ""
        return typeof name === "string" && name.startsWith(DAO_PREFIX)
      },
    })

    return sendJson(res, accountDc)
  } catch (error) {
    console.error(error)
    return sendJson(
      res,
      {
        error: error?.message || "Failed to fetch wallet assets",
      },
      500
    )
  }
}

export default getDcAssets