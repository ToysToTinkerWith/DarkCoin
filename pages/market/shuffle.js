import React, { useCallback, useEffect, useMemo, useState } from "react"
import algosdk from "algosdk"
import { TextField } from "@mui/material"
import { useWallet } from "@txnlab/use-wallet-react"
import {
  MarketEmptyState,
  MarketPageShell,
  MarketToolbar,
  marketTextFieldSx,
} from "../../components/contracts/Market/MarketPageShell"
import {
  getAssetDecimals,
  getAssetDisplayName,
  getAssetParam,
  getAssetParams,
  resolveAssetImageUrls,
} from "../../components/contracts/Market/nftMedia"

const MARKET_APP_ID = 3690496091
const MICROALGOS_PER_ALGO = 1000000
const ALGORAND_MIN_TXN_FEE = 1000
const SHUFFLE_CREATE_FUNDING = 1000000
const SHUFFLE_UNIQUE_ASSET_FUNDING = 1000000
const SHUFFLE_LEGACY_MIGRATION_FUNDING = 1000000
const SHUFFLE_TREE_FUNDING = 850000
const SHUFFLE_ACTIVE_OFFSET = 80
const SHUFFLE_ACTIVE_LEN = 8
const CLAIM_BOX_FUNDING = 660000
const ROLL_CLAIM_HEADER_LEN = 8
const SHUFFLE_ITEM_SIZE = 24
const LEGACY_SHUFFLE_ITEM_SIZE = 16
const MAX_SHUFFLE_ASSETS = 100
const MAX_SHUFFLE_ASSETS_PER_TXN = 8
const CLAIM_SLOT_COUNT = 100
const WALLET_ASSET_PAGE_SIZE = 24
const MAX_APP_TOTAL_REFERENCES = 8
const ADD_SHUFFLE_BUDGET_PADDING_TXNS = 3
const REMOVE_SHUFFLE_BUDGET_PADDING_TXNS = 3
const UPGRADE_SHUFFLE_BUDGET_PADDING_TXNS = 14
const CLAIM_SHUFFLE_BUDGET_PADDING_TXNS = 8
const CONFIRMATION_WAIT_ROUNDS = 30
const WALLET_SIGN_TIMEOUT_MS = 180000
const ALGORAND_SEND_TIMEOUT_MS = 60000
const ALGORAND_ROUND_WAIT_TIMEOUT_MS = 15000
const ALGORAND_LOOKUP_TIMEOUT_MS = 10000
const ALGORAND_CONFIRMATION_TIMEOUT_MS = 180000
const TEXT_ENCODER = typeof TextEncoder !== "undefined" ? new TextEncoder() : null

function encodeText(value = "") {
  return TEXT_ENCODER ? TEXT_ENCODER.encode(value) : new Uint8Array()
}

function longToByteArray(value) {
  let remaining = BigInt(Math.max(0, Number(value || 0)))
  const bytes = new Uint8Array(8)
  for (let index = 7; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & 0xffn)
    remaining >>= 8n
  }
  return bytes
}

function byteArrayToLong(bytes = []) {
  let value = 0n
  Array.from(bytes || []).forEach((byte) => {
    value = (value << 8n) + BigInt(byte)
  })
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : 0
}

function bytesFromUnknown(value) {
  if (!value) return new Uint8Array()
  if (value instanceof Uint8Array) return value
  if (Array.isArray(value)) return Uint8Array.from(value)
  if (typeof value === "string") {
    try {
      const binary = globalThis.atob(value)
      return Uint8Array.from(binary, (char) => char.charCodeAt(0))
    } catch {
      return new Uint8Array()
    }
  }
  if (typeof value === "object") return Uint8Array.from(Object.values(value).map(Number))
  return new Uint8Array()
}

function shuffleDetailKey(idBytes = new Uint8Array()) {
  return new Uint8Array([83, ...Array.from(idBytes)])
}

function shuffleItemsKey(idBytes = new Uint8Array()) {
  return new Uint8Array([73, ...Array.from(idBytes)])
}

function shuffleTreeKey(idBytes = new Uint8Array()) {
  return new Uint8Array([84, ...Array.from(idBytes)])
}

function claimKey(address = "") {
  if (!address) return new Uint8Array()
  return new Uint8Array([67, ...Array.from(algosdk.decodeAddress(address).publicKey)])
}

function rollClaimKey(address = "") {
  if (!address) return new Uint8Array()
  return new Uint8Array([80, ...Array.from(algosdk.decodeAddress(address).publicKey)])
}

function emptyBoxReferences(count = 0) {
  return Array.from({ length: Math.max(0, Number(count || 0)) }, () => ({ appIndex: 0, name: new Uint8Array() }))
}

function inlineAssetReferences(assetIds = [], boxReferenceCount = 0) {
  const availableSlots = Math.max(0, MAX_APP_TOTAL_REFERENCES - Number(boxReferenceCount || 0))
  return uniqueNumbers(assetIds).slice(0, availableSlots)
}

function formatAmount(value, decimals = 0) {
  const divisor = 10 ** Number(decimals || 0)
  const display = divisor ? Number(value || 0) / divisor : Number(value || 0)
  return display.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

function formatAlgoAmount(microAlgos = 0) {
  const algo = Number(microAlgos || 0) / MICROALGOS_PER_ALGO
  if (!Number.isFinite(algo) || algo <= 0) return "0 ALGO"

  return `${algo.toLocaleString(undefined, {
    minimumFractionDigits: algo < 1 ? 3 : 0,
    maximumFractionDigits: 6,
  })} ALGO`
}

function flatFeeParams(params, fee = ALGORAND_MIN_TXN_FEE) {
  return {
    ...params,
    flatFee: true,
    fee: Math.max(ALGORAND_MIN_TXN_FEE, Number(fee || 0)),
  }
}

function getCreateShuffleCost(assetCount = 0) {
  const count = Math.max(0, Number(assetCount || 0))
  const funding = SHUFFLE_CREATE_FUNDING + SHUFFLE_UNIQUE_ASSET_FUNDING * count
  const networkFees = count > 0 ? ALGORAND_MIN_TXN_FEE * (count + 4 + count) : 0

  return {
    funding,
    networkFees,
    total: funding + networkFees,
  }
}

function getAddShuffleCost(assetCount = 0, newAssetCount = 0, includeMigrationFunding = false, includeTreeFunding = false, resourceReferenceTxnCount = 0) {
  const count = Math.max(0, Number(assetCount || 0))
  const newCount = Math.max(0, Number(newAssetCount || 0))
  const resourceCount = Math.max(0, Number(resourceReferenceTxnCount || 0))
  const funding = SHUFFLE_UNIQUE_ASSET_FUNDING * newCount
    + (includeMigrationFunding ? SHUFFLE_LEGACY_MIGRATION_FUNDING : 0)
    + (includeTreeFunding ? SHUFFLE_TREE_FUNDING : 0)
  const outerTransactionCount = count > 0
    ? count + resourceCount + ADD_SHUFFLE_BUDGET_PADDING_TXNS + 1 + (funding > 0 ? 1 : 0)
    : 0
  const networkFees = ALGORAND_MIN_TXN_FEE * (outerTransactionCount + newCount)

  return {
    funding,
    networkFees,
    total: funding + networkFees,
  }
}

function getRollShuffleNetworkCost(shuffle, claimBoxExists) {
  const hasClaimBox = Boolean(claimBoxExists)
  const baseOuterFees = shuffle?.costId === 0 || hasClaimBox
    ? ALGORAND_MIN_TXN_FEE * 2
    : ALGORAND_MIN_TXN_FEE * 3
  const innerFees = shuffle?.costId === 0 && !hasClaimBox ? ALGORAND_MIN_TXN_FEE : 0
  const claimFunding = hasClaimBox ? 0 : CLAIM_BOX_FUNDING

  return baseOuterFees + innerFees + claimFunding
}

function getUpgradeShuffleRollCost() {
  const networkFees = ALGORAND_MIN_TXN_FEE * (UPGRADE_SHUFFLE_BUDGET_PADDING_TXNS + 2)
  return {
    funding: SHUFFLE_TREE_FUNDING,
    networkFees,
    total: SHUFFLE_TREE_FUNDING + networkFees,
  }
}

function getRemoveShuffleCost(assetCount = 0) {
  const count = Math.max(0, Number(assetCount || 0))
  const networkFees = count > 0
    ? ALGORAND_MIN_TXN_FEE * (count + 2 + REMOVE_SHUFFLE_BUDGET_PADDING_TXNS)
    : 0

  return {
    funding: 0,
    networkFees,
    total: networkFees,
  }
}

function formatOdds(amount, total) {
  const numerator = Number(amount || 0)
  const denominator = Number(total || 0)
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || numerator <= 0 || denominator <= 0) return "0%"

  const percent = (numerator / denominator) * 100
  if (percent > 0 && percent < 0.01) return "<0.01%"
  return `${percent.toLocaleString(undefined, { maximumFractionDigits: percent < 1 ? 3 : 2 })}%`
}

function getWholeDisplayUnitCount(amount, decimals = 0) {
  const atomic = BigInt(Math.max(0, Math.floor(Number(amount || 0))))
  const unit = bigintPow10(decimals)
  if (unit <= 0n) return 0

  const units = atomic / unit
  return units <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(units) : Number.MAX_SAFE_INTEGER
}

function isWholeDisplayUnitAmount(amount, decimals = 0) {
  const atomic = BigInt(Math.max(0, Math.floor(Number(amount || 0))))
  const unit = bigintPow10(decimals)
  return atomic > 0n && unit > 0n && atomic % unit === 0n
}

function getShuffleItemDecimals(item = {}) {
  return item.assetInfo?.decimals ?? item.decimals ?? 0
}

function getShuffleItemOutcomeCount(item = {}) {
  return getWholeDisplayUnitCount(item.amount, getShuffleItemDecimals(item))
}

function parseDecimalAmount(value, decimals = 0) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return 0
  return Math.round(number * 10 ** Number(decimals || 0))
}

function bigintPow10(decimals = 0) {
  const exponent = Math.max(0, Math.floor(Number(decimals || 0)))
  let value = 1n
  for (let index = 0; index < exponent; index += 1) {
    value *= 10n
  }
  return value
}

function parseDisplayAmountToAtomic(value, decimals = 0) {
  const text = String(value ?? "").trim()
  const assetDecimals = Math.max(0, Number(decimals || 0))
  if (!text || !/^(?:\d+|\d*\.\d+)$/.test(text)) return 0

  const [wholePart = "0", fractionPart = ""] = text.split(".")
  const scale = bigintPow10(assetDecimals)
  const whole = BigInt(wholePart || "0")
  const fraction =
    assetDecimals > 0
      ? BigInt((fractionPart.slice(0, assetDecimals) || "").padEnd(assetDecimals, "0") || "0")
      : 0n
  const atomic = whole * scale + fraction

  return atomic <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(atomic) : Number.MAX_SAFE_INTEGER
}

function formatAtomicAmountForInput(value, decimals = 0) {
  const assetDecimals = Math.max(0, Number(decimals || 0))
  const atomic = BigInt(Math.max(0, Math.floor(Number(value || 0))))
  if (assetDecimals === 0) return atomic.toString()

  const scale = bigintPow10(assetDecimals)
  const whole = atomic / scale
  const fraction = (atomic % scale).toString().padStart(assetDecimals, "0").replace(/0+$/, "")

  return fraction ? `${whole.toString()}.${fraction}` : whole.toString()
}

function uniqueNumbers(values = []) {
  return [...new Set(values.map(Number).filter((value) => Number.isFinite(value) && value > 0))]
}

function getWalletAssetId(asset = {}) {
  return Number(asset.assetId || asset["asset-id"] || asset.index || 0)
}

function getWalletAssetDecimals(asset = {}, assetInfoMap = {}) {
  const assetId = getWalletAssetId(asset)
  return assetInfoMap[assetId]?.decimals ?? getAssetDecimals(getAssetParams(asset))
}

function getWalletAssetName(asset = {}, assetInfoMap = {}) {
  const assetId = getWalletAssetId(asset)
  return assetInfoMap[assetId]?.name || getAssetDisplayName(getAssetParams(asset), `Asset ${assetId}`)
}

function buildSelectedWalletAssets(walletAssets = [], assetInfoMap = {}, amountInputs = {}) {
  return walletAssets
    .map((asset) => {
      const assetId = getWalletAssetId(asset)
      const decimals = getWalletAssetDecimals(asset, assetInfoMap)
      const amount = parseDisplayAmountToAtomic(amountInputs[assetId], decimals)
      const atomicAmount = Math.min(amount, Number(asset.amount || 0))

      return {
        assetId,
        name: getWalletAssetName(asset, assetInfoMap),
        decimals,
        balance: Number(asset.amount || 0),
        amount: atomicAmount,
        outcomes: getWholeDisplayUnitCount(atomicAmount, decimals),
      }
    })
    .filter((asset) => asset.assetId > 0 && asset.amount > 0)
}

function buildSelectedRemoveAssets(shuffle = {}, amountInputs = {}) {
  return (shuffle.items || [])
    .map((item, index) => {
      const assetId = Number(item.assetId || 0)
      const decimals = getShuffleItemDecimals(item)
      const requestedAmount = parseDisplayAmountToAtomic(amountInputs[assetId], decimals)
      const availableAmount = Number(item.amount || 0)
      const amount = Math.min(requestedAmount, availableAmount)

      return {
        assetId,
        slotIndex: Number(item.slotIndex ?? index),
        name: item.assetInfo?.name || `Asset ${assetId}`,
        decimals,
        amount,
        availableAmount,
        outcomes: getWholeDisplayUnitCount(amount, decimals),
        assetInfo: item.assetInfo,
      }
    })
    .filter((asset) => asset.assetId > 0 && asset.amount > 0)
}

function buildRemovePrizeSpec(removeAssets = []) {
  const spec = new Uint8Array(removeAssets.length * 24)
  removeAssets.forEach((asset, index) => {
    const offset = index * 24
    spec.set(longToByteArray(asset.slotIndex), offset)
    spec.set(longToByteArray(asset.assetId), offset + 8)
    spec.set(longToByteArray(asset.amount), offset + 16)
  })
  return spec
}

function filterWalletAssets(walletAssets = [], assetInfoMap = {}, searchValue = "") {
  const query = searchValue.trim().toLowerCase()
  if (!query) return walletAssets

  return walletAssets.filter((asset) => {
    const assetId = getWalletAssetId(asset)
    const info = assetInfoMap[assetId]
    const searchable = [
      assetId,
      info?.name,
      info?.unitName,
      asset?.params?.name,
      asset?.params?.unitName,
      asset?.params?.["unit-name"],
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return searchable.includes(query)
  })
}

function filterShuffleItems(items = [], searchValue = "") {
  const query = searchValue.trim().toLowerCase()
  if (!query) return items

  return items.filter((item) => {
    const searchable = [
      item.assetId,
      item.assetInfo?.name,
      item.assetInfo?.unitName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return searchable.includes(query)
  })
}

function multiplyAtomicAmount(amount, multiplier) {
  const atomic = BigInt(Math.max(0, Math.floor(Number(amount || 0))))
  const count = BigInt(Math.max(0, Math.floor(Number(multiplier || 0))))
  const total = atomic * count
  return total <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(total) : Number.MAX_SAFE_INTEGER
}

async function fetchAssetInfo(indexerClient, assetId) {
  if (!assetId) return { assetId: 0, name: "ALGO", decimals: 6, imageUrls: ["/AlgoWhite.svg"] }

  const response = await indexerClient.searchForAssets().index(Number(assetId)).limit(1).do()
  const asset = response.assets?.[0]
  const params = getAssetParams(asset)
  const imageUrls = await resolveAssetImageUrls({ asset, assetId, indexerClient, preferAsaIcon: true })

  return {
    assetId: Number(assetId),
    name: getAssetDisplayName(params, `Asset ${assetId}`),
    unitName: getAssetParam(params, ["unitName", "unit-name"]),
    decimals: getAssetDecimals(params),
    imageUrls,
  }
}

async function isAccountOptedIntoAsset(indexerClient, address, assetId) {
  if (!address || !assetId) return true
  try {
    const response = await indexerClient.lookupAccountAssets(address).assetId(Number(assetId)).do()
    return Boolean(response.assets?.length)
  } catch {
    return false
  }
}

async function getMissingOptInAssetIds(indexerClient, address, assetIds = []) {
  const optInResults = await Promise.all(
    uniqueNumbers(assetIds).map(async (assetId) => ({
      assetId,
      opted: await isAccountOptedIntoAsset(indexerClient, address, assetId),
    }))
  )

  return optInResults.filter((result) => !result.opted).map((result) => result.assetId)
}

async function hasBoxForAddress(algodClient, appId, address, keyBuilder) {
  if (!address) return false
  try {
    await algodClient.getApplicationBoxByName(appId, keyBuilder(address)).do()
    return true
  } catch {
    return false
  }
}

async function hasRollClaimBox(algodClient, appId, address) {
  return hasBoxForAddress(algodClient, appId, address, rollClaimKey)
}

function makeAssetOptInTxn({ sender, assetId, suggestedParams }) {
  return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender,
    receiver: sender,
    amount: 0,
    assetIndex: assetId,
    suggestedParams: flatFeeParams(suggestedParams),
  })
}

function chunkValues(values = [], size = MAX_APP_TOTAL_REFERENCES) {
  const chunks = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

function getResourceReferenceTxnCount(assetIds = []) {
  return Math.ceil(uniqueNumbers(assetIds).length / MAX_APP_TOTAL_REFERENCES)
}

function makeResourceReferenceTxns({ sender, appId, assetIds = [], suggestedParams }) {
  const uniqueAssetIds = uniqueNumbers(assetIds)
  if (!uniqueAssetIds.length) return []

  return chunkValues(uniqueAssetIds).map((assetChunk) =>
    algosdk.makeApplicationNoOpTxnFromObject({
      sender,
      suggestedParams: flatFeeParams(suggestedParams),
      appIndex: appId,
      appArgs: [encodeText("resourceReferences")],
      foreignAssets: assetChunk,
    })
  )
}

function makeBudgetPaddingTxn({ sender, appId, suggestedParams }) {
  return algosdk.makeApplicationNoOpTxnFromObject({
    sender,
    suggestedParams: flatFeeParams(suggestedParams),
    appIndex: appId,
    appArgs: [encodeText("resourceReferences")],
  })
}

function getAlreadyInLedgerTxId(error) {
  const text = [
    error?.message,
    error?.stack,
    error?.response?.text,
    error?.response?.body,
    error?.data,
  ]
    .filter(Boolean)
    .map(String)
    .join(" ")
  const match = text.match(/transaction already in ledger:\s*([A-Z2-7]{52})/i)
  return match?.[1] || null
}

function getErrorText(error) {
  return [
    error?.message,
    error?.stack,
    error?.response?.text,
    error?.response?.body,
    error?.data,
    error,
  ]
    .filter(Boolean)
    .map(String)
    .join(" ")
}

function isWalletExtensionInvalidatedError(error) {
  return /extension context invalidated/i.test(getErrorText(error))
}

function getTransactionErrorMessage(error, fallback = "Transaction failed.") {
  if (isWalletExtensionInvalidatedError(error)) {
    return "The wallet extension connection was reset before signing. Refresh this page, reconnect the wallet, then try Add Prizes again."
  }

  const text = [
    error?.message,
    error?.response?.text,
    error?.response?.body,
    error?.data,
    typeof error === "string" ? error : "",
  ]
    .filter(Boolean)
    .map(String)
    .join(" ")
    .trim()
  return text || fallback
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeBigInt(value) {
  if (typeof value === "bigint") return value
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.max(0, Math.floor(value)))
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value)
  return 0n
}

function normalizeTransactionId(value) {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value?.toString === "function") return value.toString()
  return ""
}

function uniqueTransactionIds(txIds = []) {
  return Array.from(new Set(txIds.map(normalizeTransactionId).filter(Boolean)))
}

function getTransactionId(txn) {
  return normalizeTransactionId(typeof txn?.txID === "function" ? txn.txID() : txn?.txid || txn?.txId)
}

function getSendResultTransactionId(sendResult) {
  return normalizeTransactionId(
    sendResult?.txid
      || sendResult?.txId
      || sendResult?.txID
      || sendResult?.id
  )
}

function getConfirmedRound(pendingInfo) {
  return normalizeBigInt(pendingInfo?.confirmedRound ?? pendingInfo?.["confirmed-round"])
}

function getIndexerConfirmedRound(transactionInfo) {
  return normalizeBigInt(
    transactionInfo?.transaction?.confirmedRound
      ?? transactionInfo?.transaction?.["confirmed-round"]
      ?? transactionInfo?.confirmedRound
      ?? transactionInfo?.["confirmed-round"]
  )
}

function getPoolError(pendingInfo) {
  return pendingInfo?.poolError || pendingInfo?.["pool-error"] || ""
}

async function lookupIndexerConfirmation(indexerClient, txIds = []) {
  if (!indexerClient?.lookupTransactionByID) return null

  const lookups = uniqueTransactionIds(txIds).map(async (txId) => {
    try {
      const transactionInfo = await withTimeout(
        indexerClient.lookupTransactionByID(txId).do(),
        ALGORAND_LOOKUP_TIMEOUT_MS,
        `Indexer lookup timed out for ${txId}.`
      )
      const confirmedRound = getIndexerConfirmedRound(transactionInfo)
      if (confirmedRound > 0n) {
        return { txId, transactionInfo, confirmedRound, source: "indexer" }
      }
    } catch {
      // Indexer can lag a few rounds after Algod accepts a transaction.
    }
    return null
  })

  const results = await Promise.all(lookups)
  return results.find(Boolean) || null
}

async function lookupAlgodConfirmation(client, txIds = []) {
  const lookups = uniqueTransactionIds(txIds).map(async (txId) => {
    try {
      const pendingInfo = await withTimeout(
        client.pendingTransactionInformation(txId).do(),
        ALGORAND_LOOKUP_TIMEOUT_MS,
        `Pending transaction lookup timed out for ${txId}.`
      )
      const confirmedRound = getConfirmedRound(pendingInfo)
      if (confirmedRound > 0n) return { txId, pendingInfo, confirmedRound, source: "algod" }

      const poolError = getPoolError(pendingInfo)
      if (poolError) return { txId, poolError }
    } catch {
      // The node may not remember every tx id immediately; other tx ids or indexer can still confirm the group.
    }
    return null
  })

  const results = await Promise.all(lookups)
  const rejected = results.find((result) => result?.poolError)
  if (rejected) throw new Error(`Transaction rejected: ${rejected.poolError}`)
  return results.find((result) => result?.confirmedRound > 0n) || null
}

function shortTransactionId(txId = "") {
  return txId.length > 12 ? `${txId.slice(0, 6)}...${txId.slice(-6)}` : txId
}

function normalizeSignedTransactionBytes(signedTransactions, expectedCount) {
  const signedList = Array.isArray(signedTransactions) ? signedTransactions : [signedTransactions]
  const signedBytes = signedList.filter(Boolean)
  if (signedBytes.length !== expectedCount) {
    throw new Error(`The wallet returned ${signedBytes.length} signed transaction${signedBytes.length === 1 ? "" : "s"} for ${expectedCount} requested transaction${expectedCount === 1 ? "" : "s"}. Reconnect your wallet, then try again.`)
  }
  const invalidIndex = signedBytes.findIndex((signedTxn) => !signedTxn?.byteLength)
  if (invalidIndex >= 0) {
    throw new Error(`The wallet returned an invalid signed transaction at position ${invalidIndex + 1}. Reconnect your wallet, then try again.`)
  }
  return signedBytes
}

async function waitForTransactionConfirmation(client, indexerClient, txIds, waitRounds, onProgress) {
  const candidateTxIds = uniqueTransactionIds(Array.isArray(txIds) ? txIds : [txIds])
  if (!candidateTxIds.length) throw new Error("Submitted transaction id was not available for confirmation.")

  let currentRound = 0n
  try {
    const status = await withTimeout(
      client.status().do(),
      ALGORAND_LOOKUP_TIMEOUT_MS,
      "Timed out while checking the current Algorand round."
    )
    currentRound = normalizeBigInt(status?.lastRound ?? status?.["last-round"]) + 1n
  } catch {
    currentRound = 0n
  }

  const totalRounds = Math.max(1, Number(waitRounds || 1))
  const confirmationDeadline = Date.now() + ALGORAND_CONFIRMATION_TIMEOUT_MS
  for (let roundsWaited = 0; roundsWaited < totalRounds && Date.now() < confirmationDeadline; roundsWaited += 1) {
    const algodConfirmation = await lookupAlgodConfirmation(client, candidateTxIds)
    if (algodConfirmation) return algodConfirmation

    const indexerConfirmation = await lookupIndexerConfirmation(indexerClient, candidateTxIds)
    if (indexerConfirmation) return indexerConfirmation

    onProgress?.({
      currentRound,
      roundsWaited: roundsWaited + 1,
      waitRounds: totalRounds,
      txId: candidateTxIds[0],
    })

    if (currentRound > 0n) {
      try {
        await withTimeout(
          client.statusAfterBlock(Number(currentRound)).do(),
          ALGORAND_ROUND_WAIT_TIMEOUT_MS,
          "Round wait timed out."
        )
      } catch {
        await delay(1200)
      }
    } else {
      await delay(1200)
    }
    currentRound += 1n
  }

  const indexerConfirmation = await lookupIndexerConfirmation(indexerClient, candidateTxIds)
  if (indexerConfirmation) return indexerConfirmation

  const waitedPastDeadline = Date.now() >= confirmationDeadline
  throw new Error(`Transaction ${candidateTxIds[0]} was sent but ${waitedPastDeadline ? "confirmation polling timed out" : `it was not confirmed after ${waitRounds} rounds`}. Check the wallet or an explorer before sending it again.`)
}

function parseShuffleDetail(idBytes, detailValue, itemsValue, costInfo) {
  const assetCount = byteArrayToLong(detailValue.slice(64, 72))
  const itemSize = itemsValue.length >= assetCount * SHUFFLE_ITEM_SIZE && itemsValue.length % SHUFFLE_ITEM_SIZE === 0
    ? SHUFFLE_ITEM_SIZE
    : LEGACY_SHUFFLE_ITEM_SIZE
  const items = []
  for (let offset = 0; offset + itemSize <= itemsValue.length; offset += itemSize) {
    const assetId = byteArrayToLong(itemsValue.slice(offset, offset + 8))
    const amount = byteArrayToLong(itemsValue.slice(offset + 8, offset + 16))
    const unitAmount = itemSize >= SHUFFLE_ITEM_SIZE
      ? byteArrayToLong(itemsValue.slice(offset + 16, offset + SHUFFLE_ITEM_SIZE))
      : 0
    if (assetId > 0) items.push({ assetId, amount, unitAmount, slotIndex: offset / itemSize })
  }

  const creator = algosdk.encodeAddress(detailValue.slice(0, 32))
  const costId = byteArrayToLong(detailValue.slice(32, 40))
  const costAmount = byteArrayToLong(detailValue.slice(40, 48))
  const total = byteArrayToLong(detailValue.slice(48, 56))
  const remaining = byteArrayToLong(detailValue.slice(56, 64))
  const itemCapacity = Math.floor(itemsValue.length / itemSize)
  const createdRound = byteArrayToLong(detailValue.slice(72, 80))
  const active = detailValue.length >= SHUFFLE_ACTIVE_OFFSET + SHUFFLE_ACTIVE_LEN
    ? byteArrayToLong(detailValue.slice(SHUFFLE_ACTIVE_OFFSET, SHUFFLE_ACTIVE_OFFSET + SHUFFLE_ACTIVE_LEN)) === 1
    : true
  const id = byteArrayToLong(idBytes)

  return {
    id,
    idBytes,
    creator,
    costId,
    costAmount,
    total,
    remaining,
    assetCount,
    itemCapacity,
    itemSize,
    createdRound,
    active,
    items,
    costInfo,
  }
}

function ShuffleAssetThumb({ assetId, amount, label, compact = false, assetInfo = null, onAssetLoaded }) {
  const [asset, setAsset] = useState(assetInfo)
  const [imageIndex, setImageIndex] = useState(0)

  useEffect(() => {
    if (assetInfo) {
      setAsset(assetInfo)
      setImageIndex(0)
      onAssetLoaded?.(assetInfo)
      return undefined
    }

    let current = true
    const load = async () => {
      const indexerClient = new algosdk.Indexer("", "https://mainnet-idx.algonode.cloud", 443)
      const info = await fetchAssetInfo(indexerClient, assetId)
      if (current) {
        setAsset(info)
        setImageIndex(0)
        onAssetLoaded?.(info)
      }
    }

    load().catch(() => {
      if (current) setAsset({ assetId, name: `Asset ${assetId}`, decimals: 0, imageUrls: [] })
    })

    return () => {
      current = false
    }
  }, [assetId, assetInfo, onAssetLoaded])

  const imageUrl = asset?.imageUrls?.[imageIndex] || "/market/empty.png"
  const amountLabel = amount !== undefined && asset ? formatAmount(amount, asset.decimals) : ""

  return (
    <div className={compact ? "shuffleAssetThumb shuffleAssetThumbCompact" : "shuffleAssetThumb"}>
      <img
        src={imageUrl}
        alt={asset?.name || `Asset ${assetId}`}
        loading="lazy"
        onError={() => {
          if (asset?.imageUrls && imageIndex < asset.imageUrls.length - 1) setImageIndex((current) => current + 1)
        }}
      />
      <div>
        <span>{label || asset?.name || `Asset ${assetId}`}</span>
        {amountLabel ? <small>{amountLabel}</small> : null}
      </div>
    </div>
  )
}

export default function Shuffle(props) {
  const { activeAddress, signTransactions } = useWallet()
  const appId = Number(props.contracts?.market || MARKET_APP_ID)
  const appAddress = useMemo(() => algosdk.getApplicationAddress(appId), [appId])

  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [walletLoading, setWalletLoading] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionNotice, setActionNotice] = useState("")
  const [submittedTxIds, setSubmittedTxIds] = useState([])
  const [error, setError] = useState("")
  const [shuffles, setShuffles] = useState([])
  const [claims, setClaims] = useState([])
  const [walletAssets, setWalletAssets] = useState([])
  const [walletAssetInfo, setWalletAssetInfo] = useState({})
  const [walletAssetSearch, setWalletAssetSearch] = useState("")
  const [walletAssetPage, setWalletAssetPage] = useState(1)
  const [selectedAmountInputs, setSelectedAmountInputs] = useState({})
  const [addShuffleId, setAddShuffleId] = useState(null)
  const [removeShuffleId, setRemoveShuffleId] = useState(null)
  const [addAssetSearch, setAddAssetSearch] = useState("")
  const [addAssetPage, setAddAssetPage] = useState(1)
  const [addAmountInputs, setAddAmountInputs] = useState({})
  const [removeAssetSearch, setRemoveAssetSearch] = useState("")
  const [removeAmountInputs, setRemoveAmountInputs] = useState({})
  const [priceAssetId, setPriceAssetId] = useState("0")
  const [priceAmount, setPriceAmount] = useState("")
  const [shuffleSection, setShuffleSection] = useState("all")

  const showStatus = useCallback((message) => {
    setError("")
    setActionNotice(message)
    props.setMessage?.(message)
  }, [props.setMessage])

  const showError = useCallback((message) => {
    setActionNotice("")
    setError(message)
    props.setMessage?.(message)
  }, [props.setMessage])

  const rememberWalletAssetInfo = useCallback((assetInfo) => {
    if (!assetInfo?.assetId) return
    setWalletAssetInfo((current) => {
      const existing = current[assetInfo.assetId]
      if (existing?.name === assetInfo.name && existing?.decimals === assetInfo.decimals) return current
      return { ...current, [assetInfo.assetId]: assetInfo }
    })
  }, [])

  const selectedAssets = useMemo(
    () => buildSelectedWalletAssets(walletAssets, walletAssetInfo, selectedAmountInputs),
    [selectedAmountInputs, walletAssetInfo, walletAssets]
  )

  const selectedOutcomeCount = useMemo(
    () => selectedAssets.reduce((total, asset) => total + Number(asset.outcomes || 0), 0),
    [selectedAssets]
  )
  const createShuffleCost = useMemo(
    () => getCreateShuffleCost(selectedAssets.length),
    [selectedAssets.length]
  )

  const selectedWalletAssets = useMemo(() => {
    return walletAssets.filter((asset) => {
      const assetId = getWalletAssetId(asset)
      const decimals = getWalletAssetDecimals(asset, walletAssetInfo)
      return parseDisplayAmountToAtomic(selectedAmountInputs[assetId], decimals) > 0
    })
  }, [selectedAmountInputs, walletAssetInfo, walletAssets])

  const filteredWalletAssets = useMemo(() => {
    return filterWalletAssets(walletAssets, walletAssetInfo, walletAssetSearch)
  }, [walletAssetInfo, walletAssetSearch, walletAssets])

  const walletAssetPageCount = Math.max(1, Math.ceil(filteredWalletAssets.length / WALLET_ASSET_PAGE_SIZE))
  const currentWalletAssetPage = Math.min(walletAssetPage, walletAssetPageCount)
  const visibleWalletAssets = useMemo(() => {
    const start = (currentWalletAssetPage - 1) * WALLET_ASSET_PAGE_SIZE
    return filteredWalletAssets.slice(start, start + WALLET_ASSET_PAGE_SIZE)
  }, [currentWalletAssetPage, filteredWalletAssets])

  const filteredAddWalletAssets = useMemo(() => {
    return filterWalletAssets(walletAssets, walletAssetInfo, addAssetSearch)
  }, [addAssetSearch, walletAssetInfo, walletAssets])
  const addWalletAssetPageCount = Math.max(1, Math.ceil(filteredAddWalletAssets.length / WALLET_ASSET_PAGE_SIZE))
  const currentAddAssetPage = Math.min(addAssetPage, addWalletAssetPageCount)
  const visibleAddWalletAssets = useMemo(() => {
    const start = (currentAddAssetPage - 1) * WALLET_ASSET_PAGE_SIZE
    return filteredAddWalletAssets.slice(start, start + WALLET_ASSET_PAGE_SIZE)
  }, [currentAddAssetPage, filteredAddWalletAssets])

  const filteredShuffles = useMemo(() => {
    const query = search.trim().toLowerCase()
    const rows = query
      ? shuffles.filter((shuffle) => {
          return (
            String(shuffle.id).includes(query) ||
            shuffle.creator.toLowerCase().includes(query) ||
            shuffle.items.some((item) => String(item.assetId).includes(query))
          )
        })
      : shuffles

    return [...rows].sort((a, b) => {
      return b.createdRound - a.createdRound
    })
  }, [search, shuffles])
  const shownShuffles = useMemo(() => {
    if (shuffleSection === "mine") {
      if (!activeAddress) return []
      return filteredShuffles.filter((shuffle) => shuffle.creator === activeAddress)
    }

    return filteredShuffles.filter((shuffle) => shuffle.active && shuffle.rollOptimized)
  }, [activeAddress, filteredShuffles, shuffleSection])
  const showingYourShuffles = shuffleSection === "mine"

  const fetchShuffles = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const algodClient = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443)
      const indexerClient = new algosdk.Indexer("", "https://mainnet-idx.algonode.cloud", 443)
      const response = await fetch("/api/council/getBoxes", {
        method: "POST",
        body: JSON.stringify({ contract: appId }),
        headers: { "Content-Type": "application/json" },
      })
      const session = await response.json()
      const detailKeys = (session.boxes || [])
        .map((box) => bytesFromUnknown(box.name))
        .filter((name) => name.length === 9 && name[0] === 83)

      const rows = []
      const assetInfoCache = new Map()
      const getCachedAssetInfo = async (assetId) => {
        const key = Number(assetId || 0)
        if (assetInfoCache.has(key)) return assetInfoCache.get(key)

        try {
          const info = await fetchAssetInfo(indexerClient, key)
          assetInfoCache.set(key, info)
          return info
        } catch {
          const fallback = { assetId: key, name: key ? `Asset ${key}` : "ALGO", decimals: key ? 0 : 6, imageUrls: [] }
          assetInfoCache.set(key, fallback)
          return fallback
        }
      }

      for (const detailKey of detailKeys) {
        try {
          const idBytes = detailKey.slice(1)
          const itemKey = shuffleItemsKey(idBytes)
          const treeKey = shuffleTreeKey(idBytes)
          const detail = await algodClient.getApplicationBoxByName(appId, detailKey).do()
          const items = await algodClient.getApplicationBoxByName(appId, itemKey).do()
          let rollOptimized = false
          try {
            await algodClient.getApplicationBoxByName(appId, treeKey).do()
            rollOptimized = true
          } catch {
            rollOptimized = false
          }
          const detailValue = bytesFromUnknown(detail.value)
          const itemsValue = bytesFromUnknown(items.value)
          if (detailValue.length < 80) continue

          const costId = byteArrayToLong(detailValue.slice(32, 40))
          const costInfo = await getCachedAssetInfo(costId)
          const parsed = parseShuffleDetail(idBytes, detailValue, itemsValue, costInfo)
          const itemInfos = await Promise.all(
            uniqueNumbers(parsed.items.map((item) => item.assetId)).map((assetId) => getCachedAssetInfo(assetId))
          )
          const itemInfoMap = Object.fromEntries(itemInfos.map((info) => [info.assetId, info]))

          rows.push({
            ...parsed,
            rollOptimized,
            items: parsed.items.map((item) => ({ ...item, assetInfo: itemInfoMap[item.assetId] })),
          })
        } catch {
          // The shuffle may have sold out between listing boxes and fetching values.
        }
      }

      rows.sort((a, b) => b.createdRound - a.createdRound)
      setShuffles(rows)
    } catch (loadError) {
      setError(loadError?.message || "Could not load shuffles.")
    } finally {
      setLoading(false)
    }
  }, [appId])

  const fetchWalletAssets = useCallback(async () => {
    if (!activeAddress) {
      setWalletAssets([])
      return
    }

    setWalletLoading(true)
    try {
      const response = await fetch("/api/getAddrAssets", {
        method: "POST",
        body: JSON.stringify({ activeAccount: activeAddress }),
        headers: { "Content-Type": "application/json" },
      })
      const session = await response.json()
      setWalletAssets(Array.isArray(session) ? session.filter((asset) => Number(asset.assetId) > 0) : [])
    } catch (loadError) {
      setError(loadError?.message || "Could not load wallet assets.")
    } finally {
      setWalletLoading(false)
    }
  }, [activeAddress])

  const fetchClaims = useCallback(async () => {
    if (!activeAddress) {
      setClaims([])
      return
    }

    try {
      const algodClient = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443)
      const claimTotals = new Map()
      const addClaim = (assetId, amount) => {
        if (assetId <= 0 || amount <= 0) return
        claimTotals.set(assetId, (claimTotals.get(assetId) || 0) + amount)
      }

      try {
        const response = await algodClient.getApplicationBoxByName(appId, rollClaimKey(activeAddress)).do()
        const value = bytesFromUnknown(response.value)
        const storedCount = byteArrayToLong(value.slice(0, ROLL_CLAIM_HEADER_LEN))
        const slotCount = Math.min(CLAIM_SLOT_COUNT, storedCount, Math.floor(Math.max(0, value.length - ROLL_CLAIM_HEADER_LEN) / 16))
        for (let index = 0; index < slotCount; index += 1) {
          const offset = ROLL_CLAIM_HEADER_LEN + index * 16
          addClaim(
            byteArrayToLong(value.slice(offset, offset + 8)),
            byteArrayToLong(value.slice(offset + 8, offset + 16))
          )
        }
      } catch {
        // New roll claim boxes are created only after the wallet rolls with the optimized contract.
      }

      try {
        const response = await algodClient.getApplicationBoxByName(appId, claimKey(activeAddress)).do()
        const value = bytesFromUnknown(response.value)
        const slotCount = Math.max(CLAIM_SLOT_COUNT, Math.floor(value.length / 16))
        for (let index = 0; index < slotCount; index += 1) {
          const offset = index * 16
          addClaim(
            byteArrayToLong(value.slice(offset, offset + 8)),
            byteArrayToLong(value.slice(offset + 8, offset + 16))
          )
        }
      } catch {
        // Legacy merged claim boxes may not exist for this wallet.
      }

      setClaims(Array.from(claimTotals.entries()).map(([assetId, amount], index) => ({ assetId, amount, slotIndex: index })))
    } catch {
      setClaims([])
    }
  }, [activeAddress, appId])

  useEffect(() => {
    fetchShuffles()
  }, [fetchShuffles])

  useEffect(() => {
    fetchWalletAssets()
    fetchClaims()
  }, [fetchWalletAssets, fetchClaims])

  useEffect(() => {
    setWalletAssetPage(1)
  }, [activeAddress, walletAssetSearch])

  useEffect(() => {
    setWalletAssetPage((current) => Math.min(current, walletAssetPageCount))
  }, [walletAssetPageCount])

  useEffect(() => {
    setAddAssetPage(1)
  }, [addAssetSearch, addShuffleId])

  useEffect(() => {
    setRemoveAssetSearch("")
  }, [removeShuffleId])

  useEffect(() => {
    setAddAssetPage((current) => Math.min(current, addWalletAssetPageCount))
  }, [addWalletAssetPageCount])

  useEffect(() => {
    if (typeof window === "undefined") return undefined

    const handleUnhandledRejection = (event) => {
      if (!isWalletExtensionInvalidatedError(event.reason)) return

      event.preventDefault()
      setActionBusy(false)
      showError(getTransactionErrorMessage(event.reason))
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection)
  }, [showError])

  async function sendGroupedTransactions(txns) {
    if (typeof signTransactions !== "function") {
      throw new Error("Wallet signing is not available. Reconnect your wallet, then try again.")
    }

    setSubmittedTxIds([])
    algosdk.assignGroupID(txns)
    const txIds = txns.map(getTransactionId).filter(Boolean)
    if (txIds.length !== txns.length) {
      throw new Error("Could not compute every transaction id before sending. Refresh the page, then try again.")
    }
    const encodedTxns = txns.map((txn) => algosdk.encodeUnsignedTransaction(txn))
    showStatus(`Open your wallet to sign ${txns.length} transaction${txns.length === 1 ? "" : "s"}.`)
    const signedTransactions = normalizeSignedTransactionBytes(await withTimeout(
      signTransactions(encodedTxns),
      WALLET_SIGN_TIMEOUT_MS,
      "Wallet signing timed out. Reopen or reconnect the wallet extension, then try again."
    ), txns.length)

    showStatus("Sending signed transactions...")
    const client = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443)
    let txId = txIds[0]

    try {
      const sendResult = await withTimeout(
        client.sendRawTransaction(signedTransactions).do(),
        ALGORAND_SEND_TIMEOUT_MS,
        "Timed out while sending signed transactions to Algorand. Check the wallet or an explorer before sending it again."
      )
      txId = getSendResultTransactionId(sendResult) || txId
    } catch (sendError) {
      const alreadyInLedgerTxId = getAlreadyInLedgerTxId(sendError)
      if (!alreadyInLedgerTxId || !txIds.includes(alreadyInLedgerTxId)) throw sendError
      txId = alreadyInLedgerTxId
    }

    setSubmittedTxIds(uniqueTransactionIds([txId, ...txIds]))
    showStatus(`Sent transaction ${shortTransactionId(txId)}. Waiting for confirmation...`)
    const confirmed = await waitForTransactionConfirmation(
      client,
      new algosdk.Indexer("", "https://mainnet-idx.algonode.cloud", 443),
      uniqueTransactionIds([txId, ...txIds]),
      CONFIRMATION_WAIT_ROUNDS,
      ({ roundsWaited }) => {
        showStatus(`Sent transaction ${shortTransactionId(txId)}. Waiting for confirmation ${roundsWaited}/${CONFIRMATION_WAIT_ROUNDS} rounds...`)
      }
    )
    showStatus(confirmed.confirmedRound > 0n
      ? `Transaction confirmed in round ${confirmed.confirmedRound.toString()} by ${confirmed.source || "Algorand"}.`
      : "Transaction confirmed.")
    return txId
  }

  async function createShuffle() {
    if (!activeAddress) {
      setError("Connect a wallet to create a shuffle.")
      return
    }
    if (!selectedAssets.length) {
      setError("Choose at least one prize asset for the shuffle.")
      return
    }
    if (selectedAssets.length > MAX_SHUFFLE_ASSETS_PER_TXN) {
      setError(`Create with ${MAX_SHUFFLE_ASSETS_PER_TXN} assets or fewer, then add more from Your Shuffles.`)
      return
    }
    const partialUnitAsset = selectedAssets.find((asset) => !isWholeDisplayUnitAmount(asset.amount, asset.decimals))
    if (partialUnitAsset) {
      setError(`${partialUnitAsset.name} must be added in whole display units for shuffle rewards.`)
      return
    }
    const emptyOutcomeAsset = selectedAssets.find((asset) => Number(asset.outcomes || 0) <= 0)
    if (emptyOutcomeAsset) {
      setError(`${emptyOutcomeAsset.name} needs at least one whole display unit in the shuffle.`)
      return
    }

    setActionBusy(true)
    showStatus("Preparing shuffle creation...")

    try {
      const client = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443)
      const indexerClient = new algosdk.Indexer("", "https://mainnet-idx.algonode.cloud", 443)
      const params = await client.getTransactionParams().do()
      const selectedIds = selectedAssets.map((asset) => asset.assetId)
      const shuffleFundingAmount = SHUFFLE_CREATE_FUNDING + SHUFFLE_UNIQUE_ASSET_FUNDING * selectedIds.length

      const costId = Number(priceAssetId || 0)
      const costInfo = await fetchAssetInfo(indexerClient, costId)
      const costAtomicAmount = parseDecimalAmount(priceAmount, costInfo.decimals)
      if (costAtomicAmount <= 0) throw new Error("Set a roll price greater than zero.")

      const shuffleId = Date.now() * 1000 + Math.floor(Math.random() * 1000)
      const idBytes = longToByteArray(shuffleId)
      const txns = []
      txns.push(...makeResourceReferenceTxns({
        sender: activeAddress,
        appId,
        assetIds: selectedIds,
        suggestedParams: params,
      }))
      txns.push(makeBudgetPaddingTxn({
        sender: activeAddress,
        appId,
        suggestedParams: params,
      }))

      txns.push(
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: activeAddress,
          receiver: appAddress,
          amount: shuffleFundingAmount,
          suggestedParams: flatFeeParams(params),
        })
      )

      txns.push(
        algosdk.makeApplicationNoOpTxnFromObject({
          sender: activeAddress,
          suggestedParams: flatFeeParams(params, ALGORAND_MIN_TXN_FEE * (selectedIds.length + 1)),
          appIndex: appId,
          appArgs: [
            encodeText("createShuffle"),
            idBytes,
            algosdk.encodeUint64(costId),
            algosdk.encodeUint64(costAtomicAmount),
          ],
          foreignAssets: inlineAssetReferences(selectedIds, 5),
          boxes: [
            { appIndex: 0, name: shuffleDetailKey(idBytes) },
            { appIndex: 0, name: shuffleItemsKey(idBytes) },
            { appIndex: 0, name: shuffleTreeKey(idBytes) },
            ...emptyBoxReferences(2),
          ],
        })
      )

      selectedAssets.forEach((asset) => {
        txns.push(
          algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: appAddress,
            amount: asset.amount,
            assetIndex: asset.assetId,
            suggestedParams: flatFeeParams(params),
          })
        )
      })

      await sendGroupedTransactions(txns)
      showStatus("Shuffle created inactive")
      setSelectedAmountInputs({})
      setPriceAmount("")
      await fetchShuffles()
      await fetchWalletAssets()
    } catch (createError) {
      showError(getTransactionErrorMessage(createError, "Could not create shuffle."))
    } finally {
      setActionBusy(false)
    }
  }

  async function addAssetsToShuffle(shuffle) {
    if (!activeAddress || activeAddress !== shuffle.creator) {
      showError("Only the shuffle creator can add more prizes.")
      return
    }

    const inputs = addAmountInputs[shuffle.id] || {}
    const addAssets = buildSelectedWalletAssets(walletAssets, walletAssetInfo, inputs)
    if (!addAssets.length) {
      showError("Choose at least one asset to add to this shuffle.")
      return
    }
    if (addAssets.length > MAX_SHUFFLE_ASSETS_PER_TXN) {
      showError(`Add ${MAX_SHUFFLE_ASSETS_PER_TXN} assets or fewer at once.`)
      return
    }

    const partialUnitAsset = addAssets.find((asset) => !isWholeDisplayUnitAmount(asset.amount, asset.decimals))
    if (partialUnitAsset) {
      showError(`${partialUnitAsset.name} must be added in whole display units for shuffle rewards.`)
      return
    }
    const emptyOutcomeAsset = addAssets.find((asset) => Number(asset.outcomes || 0) <= 0)
    if (emptyOutcomeAsset) {
      showError(`${emptyOutcomeAsset.name} needs at least one whole display unit in the shuffle.`)
      return
    }

    const existingIds = new Set(uniqueNumbers(shuffle.items.map((item) => item.assetId)))
    const newDistinctIds = addAssets.map((asset) => asset.assetId).filter((assetId) => !existingIds.has(assetId))
    const itemCapacity = shuffle.itemSize === LEGACY_SHUFFLE_ITEM_SIZE
      ? MAX_SHUFFLE_ASSETS
      : Number(shuffle.itemCapacity || shuffle.assetCount || existingIds.size || 0)
    if (existingIds.size + newDistinctIds.length > itemCapacity) {
      showError("This shuffle does not have enough open prize slots for those new asset IDs. Add fewer new asset IDs, add more of an asset already in it, or create a new shuffle.")
      return
    }
    if (existingIds.size + newDistinctIds.length > MAX_SHUFFLE_ASSETS) {
      showError(`A shuffle can hold up to ${MAX_SHUFFLE_ASSETS} different assets.`)
      return
    }

    setActionBusy(true)
    showStatus("Preparing shuffle prize add...")

    try {
      const client = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443)
      const params = await client.getTransactionParams().do()
      const selectedIds = addAssets.map((asset) => asset.assetId)
      const needsLegacyMigration = shuffle.itemSize === LEGACY_SHUFFLE_ITEM_SIZE
      const needsTreeFunding = !shuffle.rollOptimized
      const resourceAssetIds = needsLegacyMigration
        ? uniqueNumbers([...Array.from(existingIds), ...selectedIds])
        : selectedIds
      const addFundingAmount = SHUFFLE_UNIQUE_ASSET_FUNDING * newDistinctIds.length
        + (needsLegacyMigration ? SHUFFLE_LEGACY_MIGRATION_FUNDING : 0)
        + (needsTreeFunding ? SHUFFLE_TREE_FUNDING : 0)

      const txns = []
      txns.push(...makeResourceReferenceTxns({
        sender: activeAddress,
        appId,
        assetIds: resourceAssetIds,
        suggestedParams: params,
      }))
      for (let index = 0; index < ADD_SHUFFLE_BUDGET_PADDING_TXNS; index += 1) {
        txns.push(makeBudgetPaddingTxn({
          sender: activeAddress,
          appId,
          suggestedParams: params,
        }))
      }

      if (addFundingAmount > 0) {
        txns.push(
          algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: appAddress,
            amount: addFundingAmount,
            suggestedParams: flatFeeParams(params),
          })
        )
      }

      txns.push(
        algosdk.makeApplicationNoOpTxnFromObject({
          sender: activeAddress,
          suggestedParams: flatFeeParams(params, ALGORAND_MIN_TXN_FEE * (newDistinctIds.length + 1)),
          appIndex: appId,
          appArgs: [encodeText("addShuffleAssets"), shuffle.idBytes],
          foreignAssets: inlineAssetReferences(resourceAssetIds, 5),
          boxes: [
            { appIndex: 0, name: shuffleDetailKey(shuffle.idBytes) },
            { appIndex: 0, name: shuffleItemsKey(shuffle.idBytes) },
            { appIndex: 0, name: shuffleTreeKey(shuffle.idBytes) },
            ...emptyBoxReferences(2),
          ],
        })
      )

      addAssets.forEach((asset) => {
        txns.push(
          algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: appAddress,
            amount: asset.amount,
            assetIndex: asset.assetId,
            suggestedParams: flatFeeParams(params),
          })
        )
      })

      await sendGroupedTransactions(txns)
      showStatus("Shuffle prizes added")
      setAddAmountInputs((current) => ({ ...current, [shuffle.id]: {} }))
      await fetchShuffles()
      await fetchWalletAssets()
    } catch (addError) {
      showError(getTransactionErrorMessage(addError, "Could not add prizes to this shuffle."))
    } finally {
      setActionBusy(false)
    }
  }

  async function removeAssetsFromShuffle(shuffle) {
    if (!activeAddress || activeAddress !== shuffle.creator) {
      setError("Only the shuffle creator can take away prizes.")
      return
    }
    if (!shuffle.rollOptimized) {
      setError("Upgrade rolling for this shuffle before taking away prizes.")
      return
    }

    const inputs = removeAmountInputs[shuffle.id] || {}
    const removeAssets = buildSelectedRemoveAssets(shuffle, inputs)
    if (!removeAssets.length) {
      setError("Choose at least one prize amount to take away.")
      return
    }
    if (removeAssets.length > MAX_SHUFFLE_ASSETS_PER_TXN) {
      setError(`Take away ${MAX_SHUFFLE_ASSETS_PER_TXN} prize assets or fewer at once.`)
      return
    }

    const partialUnitAsset = removeAssets.find((asset) => !isWholeDisplayUnitAmount(asset.amount, asset.decimals))
    if (partialUnitAsset) {
      setError(`${partialUnitAsset.name} must be taken away in whole display units.`)
      return
    }
    const emptyOutcomeAsset = removeAssets.find((asset) => Number(asset.outcomes || 0) <= 0)
    if (emptyOutcomeAsset) {
      setError(`${emptyOutcomeAsset.name} needs at least one whole display unit to take away.`)
      return
    }

    setActionBusy(true)
    showStatus("Preparing shuffle prize removal...")

    try {
      const client = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443)
      const indexerClient = new algosdk.Indexer("", "https://mainnet-idx.algonode.cloud", 443)
      const params = await client.getTransactionParams().do()
      const selectedIds = removeAssets.map((asset) => asset.assetId)
      const removeSpec = buildRemovePrizeSpec(removeAssets)
      const missingOptInAssetIds = await getMissingOptInAssetIds(indexerClient, activeAddress, selectedIds)
      const txns = []
      missingOptInAssetIds.forEach((assetId) => {
        txns.push(makeAssetOptInTxn({
          sender: activeAddress,
          assetId,
          suggestedParams: params,
        }))
      })

      txns.push(...makeResourceReferenceTxns({
        sender: activeAddress,
        appId,
        assetIds: selectedIds,
        suggestedParams: params,
      }))
      for (let index = 0; index < REMOVE_SHUFFLE_BUDGET_PADDING_TXNS; index += 1) {
        txns.push(makeBudgetPaddingTxn({
          sender: activeAddress,
          appId,
          suggestedParams: params,
        }))
      }

      txns.push(
        algosdk.makeApplicationNoOpTxnFromObject({
          sender: activeAddress,
          suggestedParams: flatFeeParams(params, ALGORAND_MIN_TXN_FEE * (removeAssets.length + 1)),
          appIndex: appId,
          appArgs: [encodeText("removeShuffleAssets"), shuffle.idBytes, removeSpec],
          foreignAssets: inlineAssetReferences(selectedIds, 5),
          boxes: [
            { appIndex: 0, name: shuffleDetailKey(shuffle.idBytes) },
            { appIndex: 0, name: shuffleItemsKey(shuffle.idBytes) },
            { appIndex: 0, name: shuffleTreeKey(shuffle.idBytes) },
            ...emptyBoxReferences(2),
          ],
        })
      )

      await sendGroupedTransactions(txns)
      showStatus("Shuffle prizes removed")
      setRemoveAmountInputs((current) => ({ ...current, [shuffle.id]: {} }))
      await fetchShuffles()
      await fetchWalletAssets()
    } catch (removeError) {
      showError(getTransactionErrorMessage(removeError, "Could not take away prizes from this shuffle."))
    } finally {
      setActionBusy(false)
    }
  }

  async function rollShuffle(shuffle) {
    if (!activeAddress) {
      setError("Connect a wallet to roll.")
      return
    }
    if (!shuffle.active) {
      setError("This shuffle is inactive until the creator activates it.")
      return
    }
    if (!shuffle.rollOptimized) {
      setError("This shuffle needs the creator to add or remove prizes once before it can use the new low-transaction roll path.")
      return
    }

    setActionBusy(true)
    setError("")
    setActionNotice("")

    try {
      const client = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443)
      const params = await client.getTransactionParams().do()
      const claimBoxExists = await hasRollClaimBox(client, appId, activeAddress)
      const rollNetworkCost = getRollShuffleNetworkCost(shuffle, claimBoxExists)
      const txns = []

      if (shuffle.costId === 0) {
        txns.push(
          algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: claimBoxExists ? shuffle.creator : appAddress,
            amount: shuffle.costAmount + (claimBoxExists ? 0 : CLAIM_BOX_FUNDING),
            suggestedParams: flatFeeParams(params),
          })
        )
      } else {
        txns.push(
          algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: shuffle.creator,
            amount: shuffle.costAmount,
            assetIndex: shuffle.costId,
            suggestedParams: flatFeeParams(params),
          })
        )
      }

      if (shuffle.costId !== 0 && !claimBoxExists) {
        txns.push(
          algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: appAddress,
            amount: CLAIM_BOX_FUNDING,
            suggestedParams: flatFeeParams(params),
          })
        )
      }

      txns.push(
        algosdk.makeApplicationNoOpTxnFromObject({
          sender: activeAddress,
          suggestedParams: flatFeeParams(
            params,
            shuffle.costId === 0 && !claimBoxExists
              ? ALGORAND_MIN_TXN_FEE * 2
              : ALGORAND_MIN_TXN_FEE
          ),
          appIndex: appId,
          appArgs: [encodeText("rollShuffle"), shuffle.idBytes],
          accounts: shuffle.costId === 0 && !claimBoxExists ? [shuffle.creator] : [],
          boxes: [
            { appIndex: 0, name: shuffleDetailKey(shuffle.idBytes) },
            { appIndex: 0, name: shuffleItemsKey(shuffle.idBytes) },
            { appIndex: 0, name: shuffleTreeKey(shuffle.idBytes) },
            { appIndex: 0, name: rollClaimKey(activeAddress) },
            ...emptyBoxReferences(3),
          ],
        })
      )

      showStatus(`Preparing roll (${txns.length} transactions, ${formatAlgoAmount(rollNetworkCost)} network/storage).`)
      await sendGroupedTransactions(txns)
      showStatus("Shuffle prize ready to claim")
      await fetchShuffles()
      await fetchClaims()
    } catch (rollError) {
      showError(getTransactionErrorMessage(rollError, "Could not roll this shuffle."))
    } finally {
      setActionBusy(false)
    }
  }

  async function claimAsset(claim) {
    if (!activeAddress) return
    setActionBusy(true)
    setError("")
    setActionNotice("")

    try {
      const client = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443)
      const indexerClient = new algosdk.Indexer("", "https://mainnet-idx.algonode.cloud", 443)
      const params = await client.getTransactionParams().do()
      const txns = []
      const opted = await isAccountOptedIntoAsset(indexerClient, activeAddress, claim.assetId)

      for (let index = 0; index < CLAIM_SHUFFLE_BUDGET_PADDING_TXNS; index += 1) {
        txns.push(makeBudgetPaddingTxn({
          sender: activeAddress,
          appId,
          suggestedParams: params,
        }))
      }

      if (!opted) {
        txns.push(
          algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: activeAddress,
            amount: 0,
            assetIndex: claim.assetId,
            suggestedParams: flatFeeParams(params),
          })
        )
      }

      txns.push(
        algosdk.makeApplicationNoOpTxnFromObject({
          sender: activeAddress,
          suggestedParams: flatFeeParams(params, ALGORAND_MIN_TXN_FEE * 2),
          appIndex: appId,
          appArgs: [encodeText("claimShuffleAsset")],
          foreignAssets: [claim.assetId],
          boxes: [
            { appIndex: 0, name: rollClaimKey(activeAddress) },
            { appIndex: 0, name: claimKey(activeAddress) },
            ...emptyBoxReferences(2),
          ],
        })
      )

      await sendGroupedTransactions(txns)
      showStatus("Prize claimed")
      await fetchClaims()
    } catch (claimError) {
      showError(getTransactionErrorMessage(claimError, "Could not claim this prize."))
    } finally {
      setActionBusy(false)
    }
  }

  async function upgradeShuffleRolls(shuffle) {
    if (!activeAddress || activeAddress !== shuffle.creator) return
    setActionBusy(true)
    setError("")
    setActionNotice("")

    try {
      const client = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443)
      const params = await client.getTransactionParams().do()
      const txns = []

      for (let index = 0; index < UPGRADE_SHUFFLE_BUDGET_PADDING_TXNS; index += 1) {
        txns.push(makeBudgetPaddingTxn({
          sender: activeAddress,
          appId,
          suggestedParams: params,
        }))
      }

      txns.push(
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: activeAddress,
          receiver: appAddress,
          amount: SHUFFLE_TREE_FUNDING,
          suggestedParams: flatFeeParams(params),
        })
      )

      txns.push(
        algosdk.makeApplicationNoOpTxnFromObject({
          sender: activeAddress,
          suggestedParams: flatFeeParams(params),
          appIndex: appId,
          appArgs: [encodeText("upgradeShuffleRolls"), shuffle.idBytes],
          boxes: [
            { appIndex: 0, name: shuffleDetailKey(shuffle.idBytes) },
            { appIndex: 0, name: shuffleItemsKey(shuffle.idBytes) },
            { appIndex: 0, name: shuffleTreeKey(shuffle.idBytes) },
            ...emptyBoxReferences(2),
          ],
        })
      )

      await sendGroupedTransactions(txns)
      showStatus("Shuffle rolling upgraded")
      await fetchShuffles()
    } catch (upgradeError) {
      showError(getTransactionErrorMessage(upgradeError, "Could not upgrade rolling for this shuffle."))
    } finally {
      setActionBusy(false)
    }
  }

  async function activateShuffle(shuffle) {
    if (!activeAddress || activeAddress !== shuffle.creator) return
    if (!shuffle.rollOptimized) {
      setError("Upgrade rolling for this shuffle before activating it.")
      return
    }
    setActionBusy(true)
    setError("")
    setActionNotice("")

    try {
      const client = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443)
      const params = await client.getTransactionParams().do()
      const txns = [
        algosdk.makeApplicationNoOpTxnFromObject({
          sender: activeAddress,
          suggestedParams: flatFeeParams(params),
          appIndex: appId,
          appArgs: [encodeText("activateShuffle"), shuffle.idBytes],
          boxes: [
            { appIndex: 0, name: shuffleDetailKey(shuffle.idBytes) },
            { appIndex: 0, name: shuffleTreeKey(shuffle.idBytes) },
            ...emptyBoxReferences(1),
          ],
        }),
      ]

      await sendGroupedTransactions(txns)
      showStatus("Shuffle activated")
      await fetchShuffles()
    } catch (activateError) {
      showError(getTransactionErrorMessage(activateError, "Could not activate this shuffle."))
    } finally {
      setActionBusy(false)
    }
  }

  async function deactivateShuffle(shuffle) {
    if (!activeAddress || activeAddress !== shuffle.creator) return
    setActionBusy(true)
    setError("")
    setActionNotice("")

    try {
      const client = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", 443)
      const params = await client.getTransactionParams().do()
      const txns = [
        algosdk.makeApplicationNoOpTxnFromObject({
          sender: activeAddress,
          suggestedParams: flatFeeParams(params),
          appIndex: appId,
          appArgs: [encodeText("deactivateShuffle"), shuffle.idBytes],
          boxes: [{ appIndex: 0, name: shuffleDetailKey(shuffle.idBytes) }],
        }),
      ]

      await sendGroupedTransactions(txns)
      showStatus("Shuffle deactivated")
      await fetchShuffles()
    } catch (deactivateError) {
      showError(getTransactionErrorMessage(deactivateError, "Could not deactivate this shuffle."))
    } finally {
      setActionBusy(false)
    }
  }

  const walletPageStart = filteredWalletAssets.length
    ? (currentWalletAssetPage - 1) * WALLET_ASSET_PAGE_SIZE + 1
    : 0
  const walletPageEnd = Math.min(currentWalletAssetPage * WALLET_ASSET_PAGE_SIZE, filteredWalletAssets.length)
  const addWalletPageStart = filteredAddWalletAssets.length
    ? (currentAddAssetPage - 1) * WALLET_ASSET_PAGE_SIZE + 1
    : 0
  const addWalletPageEnd = Math.min(currentAddAssetPage * WALLET_ASSET_PAGE_SIZE, filteredAddWalletAssets.length)
  const submittedPrimaryTxId = submittedTxIds[0] || ""

  return (
    <MarketPageShell
      title="SHUFFLE"
      subtitle="Build NFT prize pools, activate your shuffles, roll active pools, and claim prizes that are waiting for your wallet."
    >
      <div className="shuffleSectionTabs">
        <button
          type="button"
          className={shuffleSection === "all" ? "shuffleSectionTab shuffleSectionTabActive" : "shuffleSectionTab"}
          onClick={() => setShuffleSection("all")}
        >
          ALL SHUFFLES
        </button>
        <button
          type="button"
          className={shuffleSection === "create" ? "shuffleSectionTab shuffleSectionTabActive" : "shuffleSectionTab"}
          onClick={() => setShuffleSection("create")}
        >
          CREATE SHUFFLE
        </button>
        <button
          type="button"
          className={shuffleSection === "mine" ? "shuffleSectionTab shuffleSectionTabActive" : "shuffleSectionTab"}
          onClick={() => setShuffleSection("mine")}
        >
          YOUR SHUFFLES
        </button>
      </div>

      {error || actionNotice ? (
        <div className="shuffleNotice">
          <div>{error || actionNotice}</div>
          {submittedPrimaryTxId ? (
            <div className="shuffleTxnTrace">
              <span>Submitted tx</span>
              <code>{submittedPrimaryTxId}</code>
              {submittedTxIds.length > 1 ? <small>{submittedTxIds.length} grouped transactions</small> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {shuffleSection === "create" ? (
        <section className="shuffleCreate">
          <div className="shuffleCreateHeader">
            <div>
              <p className="shuffleKicker">CREATE SHUFFLE</p>
              <h2>Load the prize pool</h2>
            </div>
            <button type="button" className="marketActionButton" onClick={createShuffle} disabled={actionBusy || !selectedAssets.length || selectedAssets.length > MAX_SHUFFLE_ASSETS_PER_TXN}>
              {selectedAssets.length > MAX_SHUFFLE_ASSETS_PER_TXN
                ? `MAX ${MAX_SHUFFLE_ASSETS_PER_TXN} PER TX`
                : selectedAssets.length
                  ? `CREATE - ${formatAlgoAmount(createShuffleCost.total)}`
                  : "CREATE"}
            </button>
          </div>

          <div className="shuffleFormGrid">
            <TextField
              color="primary"
              variant="outlined"
              value={priceAssetId}
              type="number"
              label="Roll price asset ID (0 = ALGO)"
              onChange={(event) => setPriceAssetId(event.target.value)}
              sx={marketTextFieldSx}
              fullWidth
            />
            <TextField
              color="primary"
              variant="outlined"
              value={priceAmount}
              type="number"
              label="Roll price"
              onChange={(event) => setPriceAmount(event.target.value)}
              sx={marketTextFieldSx}
              fullWidth
            />
          </div>

          <div className="shuffleHowItWorks">
            <p className="shuffleKicker">HOW SHUFFLES WORK</p>
            <p>
              Every whole display unit deposited becomes one possible reward outcome. Each roll selects one remaining outcome and moves that whole unit into the winner's pending claims, so 50 Dark Coin plus one Champion NFT creates 51 outcomes. Prize amounts must be whole display units, and creators can add more prizes later from Your Shuffles. All shuffles are inactive until the creator activates them. Each unique asset ID that is added to the shuffle costs a 1 Algo fee. A shuffle can hold up to 100 asset IDs, added in batches of up to 8 asset IDs per transaction group.
            </p>
          </div>

          {walletLoading ? (
            <div className="marketAssetSkeleton" />
          ) : walletAssets.length ? (
            <>
              <div className="shuffleWalletTools">
                <TextField
                  color="primary"
                  variant="outlined"
                  value={walletAssetSearch}
                  type="text"
                  label="Search wallet assets"
                  onChange={(event) => setWalletAssetSearch(event.target.value)}
                  sx={marketTextFieldSx}
                  fullWidth
                />
                <div className="shuffleWalletPager">
                  <button
                    type="button"
                    className="marketSecondaryButton"
                    onClick={() => setWalletAssetPage((current) => Math.max(1, current - 1))}
                    disabled={currentWalletAssetPage <= 1}
                  >
                    PREV
                  </button>
                  <span>{walletPageStart}-{walletPageEnd} OF {filteredWalletAssets.length}</span>
                  <button
                    type="button"
                    className="marketSecondaryButton"
                    onClick={() => setWalletAssetPage((current) => Math.min(walletAssetPageCount, current + 1))}
                    disabled={currentWalletAssetPage >= walletAssetPageCount}
                  >
                    NEXT
                  </button>
                </div>
              </div>

              {selectedWalletAssets.length ? (
                <div className="shuffleSelectedTray">
                  <div className="shuffleSelectedHeader">
                    <p className="shuffleKicker">SELECTED POOL</p>
                    <span>{selectedAssets.length} / {MAX_SHUFFLE_ASSETS_PER_TXN} THIS TX | {MAX_SHUFFLE_ASSETS} MAX | {selectedOutcomeCount.toLocaleString()} OUTCOMES | {selectedAssets.length.toLocaleString()} ALGO ASSET FEE</span>
                  </div>
                  <div className="shuffleSelectedGrid">
                    {selectedWalletAssets.map((asset) => {
                      const assetId = getWalletAssetId(asset)
                      const decimals = getWalletAssetDecimals(asset, walletAssetInfo)
                      const atomicAmount = Math.min(
                        parseDisplayAmountToAtomic(selectedAmountInputs[assetId], decimals),
                        Number(asset.amount || 0)
                      )
                      return (
                        <div className="shuffleSelectedAsset" key={assetId}>
                          <ShuffleAssetThumb
                            assetId={assetId}
                            amount={atomicAmount}
                            compact
                            onAssetLoaded={rememberWalletAssetInfo}
                          />
                          <button
                            type="button"
                            className="shuffleTinyButton"
                            onClick={() => setSelectedAmountInputs((current) => ({ ...current, [assetId]: "" }))}
                          >
                            REMOVE
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {visibleWalletAssets.length ? (
                <div className="shuffleWalletGrid">
                  {visibleWalletAssets.map((asset) => {
                    const assetId = getWalletAssetId(asset)
                    const decimals = getWalletAssetDecimals(asset, walletAssetInfo)
                    const selected = selectedAmountInputs[assetId] || ""
                    const selectedAtomic = parseDisplayAmountToAtomic(selected, decimals)
                    return (
                      <div className={selectedAtomic ? "shuffleWalletAsset shuffleWalletAssetActive" : "shuffleWalletAsset"} key={assetId}>
                        <ShuffleAssetThumb
                          assetId={assetId}
                          amount={asset.amount}
                          onAssetLoaded={rememberWalletAssetInfo}
                        />
                        <TextField
                          color="primary"
                          variant="outlined"
                          value={selected || ""}
                          type="text"
                          label="Prize amount"
                          inputProps={{ inputMode: "decimal" }}
                          onChange={(event) => {
                            const rawValue = event.target.value.trim()
                            if (rawValue && !/^\d*\.?\d*$/.test(rawValue)) return

                            const enteredAtomic = parseDisplayAmountToAtomic(rawValue, decimals)
                            const maxAtomic = Number(asset.amount || 0)
                            const value = enteredAtomic > maxAtomic
                              ? formatAtomicAmountForInput(maxAtomic, decimals)
                              : rawValue
                            const nextAtomic = parseDisplayAmountToAtomic(value, decimals)

                            if (!selectedAtomic && nextAtomic > 0 && selectedAssets.length >= MAX_SHUFFLE_ASSETS_PER_TXN) {
                              setError(`Create with ${MAX_SHUFFLE_ASSETS_PER_TXN} assets or fewer, then add more from Your Shuffles.`)
                              return
                            }
                            setSelectedAmountInputs((current) => ({ ...current, [assetId]: value }))
                          }}
                          sx={marketTextFieldSx}
                          fullWidth
                        />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <MarketEmptyState title="No wallet assets found" text="No wallet assets match this search." />
              )}
            </>
          ) : (
            <MarketEmptyState
              title={activeAddress ? "No wallet assets found" : "Wallet not connected"}
              text={activeAddress ? "There are no wallet assets available for a shuffle." : "Connect a wallet to build a shuffle."}
            />
          )}
        </section>
      ) : (
        <section className={showingYourShuffles ? "shuffleManage shuffleManageFullWidth" : "shuffleManage"}>
          <div className="shuffleCreateHeader">
            <div>
              <p className="shuffleKicker">{showingYourShuffles ? "YOUR SHUFFLES" : "ALL SHUFFLES"}</p>
              <h2>{showingYourShuffles ? "Your prize pools" : "Prize pools"}</h2>
            </div>
          </div>

          <MarketToolbar>
            <TextField
              color="primary"
              variant="outlined"
              value={search}
              type="text"
              label={showingYourShuffles ? "Search your shuffles" : "Search all shuffles"}
              name="search"
              onChange={(event) => setSearch(event.target.value)}
              fullWidth
              sx={marketTextFieldSx}
            />
            <button type="button" className="marketSecondaryButton" onClick={fetchShuffles} disabled={loading}>
              REFRESH
            </button>
          </MarketToolbar>

          <div className="shuffleClaims">
            <div>
              <p className="shuffleKicker">PENDING CLAIMS</p>
              <h2>Your prizes</h2>
            </div>
            {claims.length ? (
              <div className="shuffleClaimGrid">
                {claims.map((claim) => (
                  <div className="shuffleClaim" key={`${claim.slotIndex}-${claim.assetId}`}>
                    <ShuffleAssetThumb assetId={claim.assetId} amount={claim.amount} compact />
                    <button type="button" className="marketActionButton" onClick={() => claimAsset(claim)} disabled={actionBusy}>
                      CLAIM
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="shuffleMuted">No pending shuffle prizes.</p>
            )}
          </div>

          {loading ? (
            <div className="marketAssetSkeleton" />
          ) : shownShuffles.length ? (
              <section className={showingYourShuffles ? "shuffleGrid shuffleGridFullWidth" : "shuffleGrid"}>
                {shownShuffles.map((shuffle) => {
                  const priceLabel = `${formatAmount(shuffle.costAmount, shuffle.costInfo?.decimals || 0)} ${shuffle.costInfo?.name || "ALGO"}`
                  const mine = activeAddress && activeAddress === shuffle.creator
                  const remainingOutcomeCount = Number(shuffle.remaining || 0)
                  const totalOutcomeCount = Number(shuffle.total || 0)
                  const rollCount = Math.max(0, totalOutcomeCount - remainingOutcomeCount)
                  const paidLabel = `${formatAmount(
                    multiplyAtomicAmount(shuffle.costAmount, rollCount),
                    shuffle.costInfo?.decimals || 0
                  )} ${shuffle.costInfo?.name || "ALGO"}`
                  const addPanelOpen = addShuffleId === shuffle.id
                  const removePanelOpen = removeShuffleId === shuffle.id
                  const panelInputs = addAmountInputs[shuffle.id] || {}
                  const removeInputs = removeAmountInputs[shuffle.id] || {}
                  const selectedAddAssetsForShuffle = buildSelectedWalletAssets(walletAssets, walletAssetInfo, panelInputs)
                  const selectedAddOutcomeCountForShuffle = selectedAddAssetsForShuffle.reduce((total, asset) => total + Number(asset.outcomes || 0), 0)
                  const selectedAddWalletAssetsForShuffle = walletAssets.filter((asset) => {
                    const assetId = getWalletAssetId(asset)
                    const decimals = getWalletAssetDecimals(asset, walletAssetInfo)
                    return parseDisplayAmountToAtomic(panelInputs[assetId], decimals) > 0
                  })
                  const usedSlotCount = Number(shuffle.assetCount || shuffle.items.length || 0)
                  const totalSlotCount = shuffle.itemSize === LEGACY_SHUFFLE_ITEM_SIZE
                    ? MAX_SHUFFLE_ASSETS
                    : Number(shuffle.itemCapacity || usedSlotCount || MAX_SHUFFLE_ASSETS)
                  const statusLabel = shuffle.active
                    ? (shuffle.rollOptimized ? "ACTIVE" : "NEEDS UPGRADE")
                    : (shuffle.rollOptimized ? "INACTIVE" : "INACTIVE - NEEDS UPGRADE")
                  const canManageShuffle = showingYourShuffles && mine
                  const existingAddAssetIds = new Set(uniqueNumbers(shuffle.items.map((item) => item.assetId)))
                  const newAddAssetFeeCount = selectedAddAssetsForShuffle.filter((asset) => !existingAddAssetIds.has(asset.assetId)).length
                  const needsAddMigration = shuffle.itemSize === LEGACY_SHUFFLE_ITEM_SIZE
                  const needsAddTreeFunding = !shuffle.rollOptimized
                  const addResourceAssetIds = needsAddMigration
                    ? uniqueNumbers([
                        ...Array.from(existingAddAssetIds),
                        ...selectedAddAssetsForShuffle.map((asset) => asset.assetId),
                      ])
                    : selectedAddAssetsForShuffle.map((asset) => asset.assetId)
                  const addShuffleCost = getAddShuffleCost(
                    selectedAddAssetsForShuffle.length,
                    newAddAssetFeeCount,
                    needsAddMigration,
                    needsAddTreeFunding,
                    getResourceReferenceTxnCount(addResourceAssetIds)
                  )
                  const removableItems = shuffle.items.filter((item) => getShuffleItemOutcomeCount(item) > 0)
                  const filteredRemovableItems = filterShuffleItems(removableItems, removeAssetSearch)
                  const selectedRemoveAssets = buildSelectedRemoveAssets(shuffle, removeInputs)
                  const selectedRemoveOutcomeCount = selectedRemoveAssets.reduce((total, asset) => total + Number(asset.outcomes || 0), 0)
                  const removeShuffleCost = getRemoveShuffleCost(selectedRemoveAssets.length)
                  const upgradeRollCost = getUpgradeShuffleRollCost()
                  return (
                    <article className="shuffleCard" key={shuffle.id}>
                      <div className="shuffleCardTop">
                        <div>
                          <p className="shuffleKicker">{canManageShuffle ? `YOUR SHUFFLE - ${statusLabel}` : `SHUFFLE #${shuffle.id} - ${statusLabel}`}</p>
                          <h2>{remainingOutcomeCount.toLocaleString()} / {totalOutcomeCount.toLocaleString()} OUTCOMES</h2>
                        </div>
                        <div className="shufflePrice">
                          {shuffle.costInfo?.imageUrls?.[0] ? <img src={shuffle.costInfo.imageUrls[0]} alt="" /> : null}
                          <span>{priceLabel}</span>
                        </div>
                      </div>

                      <div className="shuffleStats">
                        <div>
                          <span>ROLL PRICE</span>
                          <strong>{priceLabel}</strong>
                        </div>
                        <div>
                          <span>STATUS</span>
                          <strong>{statusLabel}</strong>
                        </div>
                        <div>
                          <span>FUNDS PAID</span>
                          <strong>{paidLabel}</strong>
                        </div>
                        <div>
                          <span>ROLLS PAID</span>
                          <strong>{rollCount.toLocaleString()}</strong>
                        </div>
                      </div>

                      <div className="shuffleOddsList">
                        <div className="shuffleOddsHeader">
                          <span>PRIZES AND ODDS</span>
                          <small>{usedSlotCount.toLocaleString()} / {totalSlotCount.toLocaleString()} ASSET SLOTS</small>
                        </div>
                        {shuffle.items.filter((item) => getShuffleItemOutcomeCount(item) > 0).map((item) => {
                          const outcomeCount = getShuffleItemOutcomeCount(item)
                          const odds = formatOdds(outcomeCount, remainingOutcomeCount)
                          const percent = remainingOutcomeCount > 0
                            ? Math.min(100, (outcomeCount / remainingOutcomeCount) * 100)
                            : 0

                          return (
                            <div className="shuffleOddsRow" key={item.assetId}>
                              <ShuffleAssetThumb assetId={item.assetId} amount={item.amount} compact assetInfo={item.assetInfo} />
                              <div className="shuffleOddsPanel">
                                <div className="shuffleOddsMeta">
                                  <span>{outcomeCount.toLocaleString()} OUTCOMES</span>
                                  <strong>{odds}</strong>
                                </div>
                                <div className="shuffleOddsTrack">
                                  <span style={{ width: `${percent}%` }} />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="shuffleMeta">
                        <span>Creator</span>
                        <span>{shuffle.creator.slice(0, 6)}...{shuffle.creator.slice(-4)}</span>
                      </div>

                      <div className="marketActionRow">
                        {!showingYourShuffles ? (
                          <button type="button" className="marketActionButton" onClick={() => rollShuffle(shuffle)} disabled={actionBusy || !remainingOutcomeCount || !shuffle.active || !shuffle.rollOptimized}>
                            {shuffle.active ? (shuffle.rollOptimized ? "ROLL" : "NEEDS UPGRADE") : "INACTIVE"}
                          </button>
                        ) : null}
                        {canManageShuffle ? (
                          <>
                            {!shuffle.rollOptimized ? (
                              <button type="button" className="marketSecondaryButton" onClick={() => upgradeShuffleRolls(shuffle)} disabled={actionBusy || shuffle.itemSize === LEGACY_SHUFFLE_ITEM_SIZE}>
                                UPGRADE ROLLING - {formatAlgoAmount(upgradeRollCost.total)}
                              </button>
                            ) : null}
                            {!shuffle.active ? (
                              <button type="button" className="marketSecondaryButton" onClick={() => activateShuffle(shuffle)} disabled={actionBusy || !remainingOutcomeCount || !shuffle.rollOptimized}>
                                ACTIVATE
                              </button>
                            ) : (
                              <button type="button" className="marketSecondaryButton" onClick={() => deactivateShuffle(shuffle)} disabled={actionBusy}>
                                DEACTIVATE
                              </button>
                            )}
                            <button
                              type="button"
                              className="marketSecondaryButton"
                              onClick={() => {
                                setRemoveShuffleId(null)
                                setAddShuffleId((current) => (current === shuffle.id ? null : shuffle.id))
                              }}
                              disabled={actionBusy}
                            >
                              {addPanelOpen ? "CLOSE ADD" : "ADD PRIZES"}
                            </button>
                            <button
                              type="button"
                              className="marketSecondaryButton"
                              onClick={() => {
                                setAddShuffleId(null)
                                setRemoveShuffleId((current) => (current === shuffle.id ? null : shuffle.id))
                              }}
                              disabled={actionBusy || !remainingOutcomeCount}
                            >
                              {removePanelOpen ? "CLOSE TAKE AWAY" : "TAKE AWAY PRIZES"}
                            </button>
                          </>
                        ) : null}
                      </div>

                      {canManageShuffle && addPanelOpen ? (
                        <div className="shuffleAddPanel">
                          <div className="shuffleSelectedHeader">
                            <p className="shuffleKicker">ADD PRIZES</p>
                            <span>
                              {selectedAddAssetsForShuffle.length} / {MAX_SHUFFLE_ASSETS_PER_TXN} THIS TX | {selectedAddOutcomeCountForShuffle.toLocaleString()} OUTCOMES | {newAddAssetFeeCount.toLocaleString()} ALGO ASSET FEE{needsAddMigration ? " | 1 ALGO LEGACY UPGRADE" : ""}
                            </span>
                          </div>
                          <p className="shuffleMuted">
                            Add whole display units to this shuffle. New asset IDs cost 1 Algo each and can be added until the 100 asset slots are full, in batches of up to {MAX_SHUFFLE_ASSETS_PER_TXN} assets.
                          </p>

                          {selectedAddWalletAssetsForShuffle.length ? (
                            <div className="shuffleSelectedTray shuffleAddSelectedTray">
                              <div className="shuffleSelectedGrid">
                                {selectedAddWalletAssetsForShuffle.map((asset) => {
                                  const assetId = getWalletAssetId(asset)
                                  const decimals = getWalletAssetDecimals(asset, walletAssetInfo)
                                  const atomicAmount = Math.min(
                                    parseDisplayAmountToAtomic(panelInputs[assetId], decimals),
                                    Number(asset.amount || 0)
                                  )
                                  return (
                                    <div className="shuffleSelectedAsset" key={assetId}>
                                      <ShuffleAssetThumb
                                        assetId={assetId}
                                        amount={atomicAmount}
                                        compact
                                        onAssetLoaded={rememberWalletAssetInfo}
                                      />
                                      <button
                                        type="button"
                                        className="shuffleTinyButton"
                                        onClick={() =>
                                          setAddAmountInputs((current) => ({
                                            ...current,
                                            [shuffle.id]: { ...(current[shuffle.id] || {}), [assetId]: "" },
                                          }))
                                        }
                                      >
                                        REMOVE
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ) : null}

                          <div className="marketActionRow shuffleAddActions">
                            <button
                              type="button"
                              className="marketActionButton"
                              onClick={() => addAssetsToShuffle(shuffle)}
                              disabled={actionBusy}
                            >
                              {selectedAddAssetsForShuffle.length > MAX_SHUFFLE_ASSETS_PER_TXN
                                ? `MAX ${MAX_SHUFFLE_ASSETS_PER_TXN} PER TX`
                                : selectedAddAssetsForShuffle.length
                                  ? `ADD - ${formatAlgoAmount(addShuffleCost.total)}`
                                  : "ADD TO SHUFFLE"}
                            </button>
                          </div>

                          {walletLoading ? (
                            <div className="marketAssetSkeleton" />
                          ) : walletAssets.length ? (
                            <>
                              <div className="shuffleWalletTools">
                                <TextField
                                  color="primary"
                                  variant="outlined"
                                  value={addAssetSearch}
                                  type="text"
                                  label="Search assets to add"
                                  onChange={(event) => setAddAssetSearch(event.target.value)}
                                  sx={marketTextFieldSx}
                                  fullWidth
                                />
                                <div className="shuffleWalletPager">
                                  <button
                                    type="button"
                                    className="marketSecondaryButton"
                                    onClick={() => setAddAssetPage((current) => Math.max(1, current - 1))}
                                    disabled={currentAddAssetPage <= 1}
                                  >
                                    PREV
                                  </button>
                                  <span>{addWalletPageStart}-{addWalletPageEnd} OF {filteredAddWalletAssets.length}</span>
                                  <button
                                    type="button"
                                    className="marketSecondaryButton"
                                    onClick={() => setAddAssetPage((current) => Math.min(addWalletAssetPageCount, current + 1))}
                                    disabled={currentAddAssetPage >= addWalletAssetPageCount}
                                  >
                                    NEXT
                                  </button>
                                </div>
                              </div>

                              {visibleAddWalletAssets.length ? (
                                <div className="shuffleWalletGrid shuffleAddWalletGrid">
                                  {visibleAddWalletAssets.map((asset) => {
                                    const assetId = getWalletAssetId(asset)
                                    const decimals = getWalletAssetDecimals(asset, walletAssetInfo)
                                    const selected = panelInputs[assetId] || ""
                                    const selectedAtomic = parseDisplayAmountToAtomic(selected, decimals)
                                    return (
                                      <div className={selectedAtomic ? "shuffleWalletAsset shuffleWalletAssetActive" : "shuffleWalletAsset"} key={assetId}>
                                        <ShuffleAssetThumb
                                          assetId={assetId}
                                          amount={asset.amount}
                                          onAssetLoaded={rememberWalletAssetInfo}
                                        />
                                        <TextField
                                          color="primary"
                                          variant="outlined"
                                          value={selected || ""}
                                          type="text"
                                          label="Prize amount"
                                          inputProps={{ inputMode: "decimal" }}
                                          onChange={(event) => {
                                            const rawValue = event.target.value.trim()
                                            if (rawValue && !/^\d*\.?\d*$/.test(rawValue)) return

                                            const enteredAtomic = parseDisplayAmountToAtomic(rawValue, decimals)
                                            const maxAtomic = Number(asset.amount || 0)
                                            const value = enteredAtomic > maxAtomic
                                              ? formatAtomicAmountForInput(maxAtomic, decimals)
                                              : rawValue
                                            setAddAmountInputs((current) => ({
                                              ...current,
                                              [shuffle.id]: { ...(current[shuffle.id] || {}), [assetId]: value },
                                            }))
                                          }}
                                          sx={marketTextFieldSx}
                                          fullWidth
                                        />
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <MarketEmptyState title="No wallet assets found" text="No wallet assets match this search." />
                              )}
                            </>
                          ) : (
                            <MarketEmptyState
                              title={activeAddress ? "No wallet assets found" : "Wallet not connected"}
                              text={activeAddress ? "There are no wallet assets available to add." : "Connect a wallet to add prizes."}
                            />
                          )}
                        </div>
                      ) : null}

                      {canManageShuffle && removePanelOpen ? (
                        <div className="shuffleAddPanel">
                          <div className="shuffleSelectedHeader">
                            <p className="shuffleKicker">TAKE AWAY PRIZES</p>
                            <span>{selectedRemoveAssets.length} ASSETS | {selectedRemoveOutcomeCount.toLocaleString()} OUTCOMES | {formatAlgoAmount(removeShuffleCost.total)} TX FEES</span>
                          </div>
                          <p className="shuffleMuted">
                            Take away remaining whole display units from up to {MAX_SHUFFLE_ASSETS_PER_TXN} prize assets at once. Taking away every remaining outcome deletes the shuffle.
                          </p>

                          <div className="shuffleWalletTools shuffleRemoveTools">
                            <TextField
                              color="primary"
                              variant="outlined"
                              value={removeAssetSearch}
                              type="text"
                              label="Search prizes to take away"
                              onChange={(event) => setRemoveAssetSearch(event.target.value)}
                              sx={marketTextFieldSx}
                              fullWidth
                            />
                          </div>

                          <div className="marketActionRow shuffleAddActions">
                            <button
                              type="button"
                              className="marketActionButton"
                              onClick={() => removeAssetsFromShuffle(shuffle)}
                              disabled={actionBusy}
                            >
                              {selectedRemoveAssets.length > MAX_SHUFFLE_ASSETS_PER_TXN
                                ? `MAX ${MAX_SHUFFLE_ASSETS_PER_TXN} PER TX`
                                : selectedRemoveAssets.length
                                  ? `TAKE AWAY - ${formatAlgoAmount(removeShuffleCost.total)}`
                                  : "TAKE AWAY"}
                            </button>
                          </div>

                          {filteredRemovableItems.length ? (
                            <div className="shuffleWalletGrid shuffleAddWalletGrid">
                              {filteredRemovableItems.map((item) => {
                                const assetId = Number(item.assetId || 0)
                                const decimals = getShuffleItemDecimals(item)
                                const selected = removeInputs[assetId] || ""
                                const selectedAtomic = parseDisplayAmountToAtomic(selected, decimals)
                                const selectedAmount = Math.min(selectedAtomic, Number(item.amount || 0))
                                const maxAmountLabel = formatAtomicAmountForInput(item.amount, decimals)
                                return (
                                  <div className={selectedAmount ? "shuffleWalletAsset shuffleWalletAssetActive" : "shuffleWalletAsset"} key={`${shuffle.id}-${item.slotIndex}-${assetId}`}>
                                    <ShuffleAssetThumb
                                      assetId={assetId}
                                      amount={item.amount}
                                      compact
                                      assetInfo={item.assetInfo}
                                    />
                                    <div className="shuffleRemoveInputRow">
                                      <TextField
                                        color="primary"
                                        variant="outlined"
                                        value={selected || ""}
                                        type="text"
                                        label="Amount to take away"
                                        inputProps={{ inputMode: "decimal" }}
                                        onChange={(event) => {
                                          const rawValue = event.target.value.trim()
                                          if (rawValue && !/^\d*\.?\d*$/.test(rawValue)) return

                                          const enteredAtomic = parseDisplayAmountToAtomic(rawValue, decimals)
                                          const maxAtomic = Number(item.amount || 0)
                                          const value = enteredAtomic > maxAtomic
                                            ? formatAtomicAmountForInput(maxAtomic, decimals)
                                            : rawValue
                                          setRemoveAmountInputs((current) => ({
                                            ...current,
                                            [shuffle.id]: { ...(current[shuffle.id] || {}), [assetId]: value },
                                          }))
                                        }}
                                        sx={marketTextFieldSx}
                                        fullWidth
                                      />
                                      <button
                                        type="button"
                                        className="shuffleTinyButton"
                                        onClick={() =>
                                          setRemoveAmountInputs((current) => ({
                                            ...current,
                                            [shuffle.id]: { ...(current[shuffle.id] || {}), [assetId]: maxAmountLabel },
                                          }))
                                        }
                                      >
                                        MAX
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <MarketEmptyState
                              title={removableItems.length ? "No prizes found" : "No remaining prizes"}
                              text={removableItems.length ? "No prize assets match this search." : "This shuffle does not have any remaining prize outcomes to take away."}
                            />
                          )}
                        </div>
                      ) : null}
                    </article>
                  )
                })}
              </section>
            ) : (
              <MarketEmptyState
                title={showingYourShuffles ? "No shuffles found" : "No shuffles found"}
                text={
                  showingYourShuffles
                    ? activeAddress
                      ? "No shuffles created by this wallet match this search."
                      : "Connect a wallet to see your shuffles."
                    : "No active market shuffles match this search."
                }
              />
          )}
        </section>
      )}

      <style jsx>{`
        .shuffleSectionTabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 18px;
        }

        .shuffleSectionTab {
          min-height: 48px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.68);
          background: rgba(0, 0, 0, 0.56);
          font-size: 11px;
          letter-spacing: 0.18em;
          cursor: pointer;
        }

        .shuffleSectionTabActive {
          color: white;
          border-color: rgba(255, 255, 255, 0.62);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.055);
        }

        .shuffleManage {
          display: grid;
          gap: 18px;
        }

        .shuffleManageFullWidth {
          width: calc(100vw - 72px);
          max-width: none;
          margin-left: calc(50% - 50vw + 36px);
          margin-right: calc(50% - 50vw + 36px);
        }

        .shuffleNotice,
        .shuffleClaims,
        .shuffleCreate,
        .shuffleCard {
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 5px;
          background:
            radial-gradient(circle at top left, rgba(255, 255, 255, 0.075), transparent 38%),
            rgba(0, 0, 0, 0.76);
          box-shadow:
            inset 0 0 28px rgba(255, 255, 255, 0.035),
            0 18px 40px rgba(0, 0, 0, 0.48);
        }

        .shuffleNotice {
          margin-bottom: 18px;
          padding: 14px 16px;
          color: rgba(255, 255, 255, 0.88);
          font-size: 12px;
          letter-spacing: 0.1em;
          word-break: break-word;
        }

        .shuffleTxnTrace {
          display: grid;
          gap: 6px;
          margin-top: 10px;
          letter-spacing: 0.04em;
          text-transform: none;
        }

        .shuffleTxnTrace code {
          color: #b7f7ff;
          font-size: 11px;
          line-height: 1.45;
          white-space: normal;
          word-break: break-all;
        }

        .shuffleTxnTrace span,
        .shuffleTxnTrace small {
          color: rgba(255, 255, 255, 0.62);
          font-size: 10px;
          text-transform: uppercase;
        }

        .shuffleClaims,
        .shuffleCreate {
          padding: 22px;
          margin-bottom: 22px;
        }

        .shuffleManage .shuffleClaims {
          margin-bottom: 0;
        }

        .shuffleClaims {
          display: grid;
          grid-template-columns: minmax(180px, 260px) 1fr;
          gap: 18px;
          align-items: center;
        }

        .shuffleCreateHeader,
        .shuffleCardTop,
        .shuffleClaim {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .shuffleKicker {
          margin: 0 0 8px;
          color: rgba(255, 255, 255, 0.52);
          font-size: 10px;
          letter-spacing: 0.28em;
        }

        h2 {
          margin: 0;
          color: white;
          font-size: clamp(22px, 2.4vw, 34px);
          font-weight: 400;
          letter-spacing: 0.18em;
        }

        .shuffleMuted {
          margin: 0;
          color: rgba(255, 255, 255, 0.62);
          font-size: 12px;
          letter-spacing: 0.1em;
        }

        .shuffleClaimGrid,
        .shufflePrizeStrip,
        .shuffleOddsList {
          display: grid;
          gap: 10px;
        }

        .shuffleClaimGrid {
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        }

        .shuffleFormGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin: 18px 0;
        }

        .shuffleHowItWorks {
          margin: 0 0 16px;
          padding: 14px 16px;
          border-left: 2px solid rgba(255, 255, 255, 0.42);
          background: rgba(255, 255, 255, 0.045);
        }

        .shuffleHowItWorks p:last-child {
          margin: 0;
          color: rgba(255, 255, 255, 0.72);
          font-size: 12px;
          line-height: 1.7;
          letter-spacing: 0.08em;
        }

        .shuffleWalletTools {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: stretch;
          margin: 6px 0 16px;
        }

        .shuffleRemoveTools {
          grid-template-columns: minmax(0, 1fr);
          margin: 0;
        }

        .shuffleWalletPager {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .shuffleWalletPager span {
          min-width: 128px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 11px;
          letter-spacing: 0.12em;
          text-align: center;
        }

        .shuffleSelectedTray {
          margin-bottom: 16px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 5px;
          background: rgba(0, 0, 0, 0.38);
        }

        .shuffleSelectedHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .shuffleSelectedHeader .shuffleKicker {
          margin: 0;
        }

        .shuffleSelectedHeader span {
          color: rgba(255, 255, 255, 0.76);
          font-size: 11px;
          letter-spacing: 0.14em;
        }

        .shuffleSelectedGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 10px;
        }

        .shuffleSelectedAsset {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.035);
        }

        .shuffleTinyButton {
          flex: 0 0 auto;
          min-height: 34px;
          padding: 0 10px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          border-radius: 3px;
          color: rgba(255, 255, 255, 0.74);
          background: rgba(0, 0, 0, 0.48);
          font-size: 10px;
          letter-spacing: 0.16em;
          cursor: pointer;
        }

        .shuffleTinyButton:hover {
          color: white;
          border-color: rgba(255, 255, 255, 0.52);
        }

        .shuffleWalletGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(245px, 1fr));
          gap: 14px;
        }

        .shuffleWalletAsset {
          display: grid;
          gap: 12px;
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 5px;
          background: rgba(0, 0, 0, 0.44);
        }

        .shuffleWalletAssetActive {
          border-color: rgba(255, 255, 255, 0.58);
          box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.055);
        }

        .shuffleGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
          gap: 18px;
        }

        .shuffleGridFullWidth {
          grid-template-columns: minmax(0, 1fr);
        }

        .shuffleCard {
          padding: 20px;
        }

        .shufflePrice {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          padding: 8px 10px;
          color: white;
          background: rgba(0, 0, 0, 0.58);
          border: 1px solid rgba(255, 255, 255, 0.28);
          border-radius: 3px;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-align: right;
        }

        .shufflePrice img {
          width: 24px;
          height: 24px;
          object-fit: contain;
          border-radius: 50%;
        }

        .shuffleStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin: 16px 0 0;
        }

        .shuffleStats div {
          min-width: 0;
          padding: 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.035);
        }

        .shuffleStats span,
        .shuffleOddsHeader span {
          display: block;
          color: rgba(255, 255, 255, 0.5);
          font-size: 9px;
          letter-spacing: 0.18em;
        }

        .shuffleStats strong {
          display: block;
          margin-top: 6px;
          color: white;
          font-size: 12px;
          font-weight: 400;
          letter-spacing: 0.08em;
          overflow-wrap: anywhere;
        }

        .shuffleOddsList {
          margin: 18px 0;
        }

        .shuffleGridFullWidth .shuffleOddsList {
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          align-items: stretch;
        }

        .shuffleOddsHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 4px;
        }

        .shuffleGridFullWidth .shuffleOddsHeader {
          grid-column: 1 / -1;
        }

        .shuffleOddsHeader small {
          color: rgba(255, 255, 255, 0.58);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-align: right;
        }

        .shuffleOddsRow {
          min-width: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(118px, 150px);
          gap: 12px;
          align-items: center;
          padding: 10px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.035);
        }

        .shuffleOddsPanel {
          min-width: 0;
          display: grid;
          gap: 8px;
        }

        .shuffleOddsMeta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 10px;
          letter-spacing: 0.14em;
        }

        .shuffleOddsMeta strong {
          color: white;
          font-size: 12px;
          font-weight: 400;
          letter-spacing: 0.1em;
          text-align: right;
        }

        .shuffleOddsTrack {
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
        }

        .shuffleOddsTrack span {
          display: block;
          height: 100%;
          min-width: 2px;
          border-radius: inherit;
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.22);
        }

        .shufflePrizeStrip {
          margin: 18px 0;
        }

        .shuffleMeta {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.66);
          font-size: 11px;
          letter-spacing: 0.1em;
        }

        .shuffleMeta span:last-child {
          color: white;
        }

        .shuffleAddPanel {
          display: grid;
          gap: 14px;
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.16);
        }

        .shuffleAddSelectedTray {
          margin: 0;
        }

        .shuffleAddWalletGrid {
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        }

        .shuffleRemoveInputRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
        }

        .shuffleAddActions {
          justify-content: flex-end;
        }

        :global(.shuffleAssetThumb) {
          min-width: 0;
          display: grid;
          grid-template-columns: 74px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          color: white;
        }

        :global(.shuffleAssetThumb img) {
          width: 74px;
          height: 74px;
          object-fit: cover;
          border-radius: 5px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: #050505;
        }

        :global(.shuffleAssetThumb span) {
          display: block;
          color: rgba(255, 255, 255, 0.95);
          font-size: 12px;
          line-height: 1.35;
          letter-spacing: 0.08em;
          word-break: break-word;
        }

        :global(.shuffleAssetThumb small) {
          display: block;
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 10px;
          letter-spacing: 0.12em;
        }

        :global(.shuffleAssetThumbCompact) {
          grid-template-columns: 44px minmax(0, 1fr);
          gap: 10px;
        }

        :global(.shuffleAssetThumbCompact img) {
          width: 44px;
          height: 44px;
        }

        @media (max-width: 760px) {
          .shuffleSectionTabs {
            grid-template-columns: 1fr;
          }

          .shuffleManageFullWidth {
            width: calc(100vw - 32px);
            margin-left: calc(50% - 50vw + 16px);
            margin-right: calc(50% - 50vw + 16px);
          }

          .shuffleClaims,
          .shuffleFormGrid,
          .shuffleStats,
          .shuffleWalletTools {
            grid-template-columns: 1fr;
          }

          .shuffleWalletPager {
            justify-content: space-between;
          }

          .shuffleWalletPager span {
            min-width: 104px;
          }

          .shuffleCreateHeader,
          .shuffleCardTop,
          .shuffleClaim {
            align-items: stretch;
            flex-direction: column;
          }

          .shuffleOddsRow {
            grid-template-columns: 1fr;
          }

          .shuffleGridFullWidth .shuffleOddsList {
            grid-template-columns: 1fr;
          }

          .shuffleOddsHeader {
            align-items: flex-start;
            flex-direction: column;
          }

          .shuffleGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </MarketPageShell>
  )
}
