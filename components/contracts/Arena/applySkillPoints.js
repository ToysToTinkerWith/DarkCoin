import algosdk from "algosdk";

const APPLY_POINTS_METHOD = "applyPoints";
const POINTS_PART_METHOD = "pointsPart";
const APPLY_POINTS_GROUPED_METHOD = "applyPointsGrouped";
const MAX_APP_ARG_BYTES = 2048;
const POINTS_CHUNK_SIZE = 1200;

function encodeText(value) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value);
  }

  return new Uint8Array(Buffer.from(value));
}

function longToByteArray(long) {
  const byteArray = [0, 0, 0, 0, 0, 0, 0, 0];

  for (let index = byteArray.length - 1; index > 0; index--) {
    const byte = long & 0xff;
    byteArray[index] = byte;
    long = (long - byte) / 256;
  }

  return byteArray;
}

function normalizePointBytes(points) {
  if (points instanceof Uint8Array) return points;
  if (Array.isArray(points)) return Uint8Array.from(points);
  return new Uint8Array(points || []);
}

function buildPointsBoxName(assetId) {
  return new Uint8Array([
    ...longToByteArray(Number(assetId)),
    ...encodeText("points"),
  ]);
}

function buildPointsBoxes(assetId) {
  const assetBox = buildPointsBoxName(assetId);

  return [
    { appIndex: 0, name: assetBox },
    { appIndex: 0, name: assetBox },
    { appIndex: 0, name: assetBox },
  ];
}

function getSendTxId(sendResult) {
  return sendResult?.txid || sendResult?.txId || sendResult?.id;
}

function canUseSingleApplyPointsCall(pointBytes) {
  return encodeText(APPLY_POINTS_METHOD).length + pointBytes.length <= MAX_APP_ARG_BYTES;
}

export async function submitApplySkillPoints({
  client,
  activeAddress,
  signTransactions,
  appId,
  nftId,
  points,
  setMessage,
}) {
  const pointBytes = normalizePointBytes(points);
  const params = await client.getTransactionParams().do();
  const foreignAssets = [Number(nftId)];
  const boxes = buildPointsBoxes(nftId);

  setMessage?.("Sign Transaction...");

  const txns = canUseSingleApplyPointsCall(pointBytes)
    ? [
        algosdk.makeApplicationNoOpTxnFromObject({
          sender: activeAddress,
          suggestedParams: params,
          appIndex: appId,
          appArgs: [encodeText(APPLY_POINTS_METHOD), pointBytes],
          accounts: [],
          foreignApps: [],
          foreignAssets,
          boxes,
        }),
      ]
    : (() => {
        const firstChunk = pointBytes.slice(0, POINTS_CHUNK_SIZE);
        const secondChunk = pointBytes.slice(POINTS_CHUNK_SIZE);
        const groupedTxns = [
          algosdk.makeApplicationNoOpTxnFromObject({
            sender: activeAddress,
            suggestedParams: params,
            appIndex: appId,
            appArgs: [encodeText(POINTS_PART_METHOD), firstChunk],
            accounts: [],
            foreignApps: [],
            foreignAssets: [],
          }),
          algosdk.makeApplicationNoOpTxnFromObject({
            sender: activeAddress,
            suggestedParams: params,
            appIndex: appId,
            appArgs: [encodeText(APPLY_POINTS_GROUPED_METHOD), secondChunk],
            accounts: [],
            foreignApps: [],
            foreignAssets,
            boxes,
          }),
        ];

        algosdk.assignGroupID(groupedTxns);
        return groupedTxns;
      })();

  const encodedTxns = txns.map((txn) => algosdk.encodeUnsignedTransaction(txn));
  const signedTransactions = await signTransactions(encodedTxns);

  setMessage?.("Sending Transaction...");
  const sendResult = await client.sendRawTransaction(signedTransactions).do();
  const txId = getSendTxId(sendResult);

  if (txId) {
    await algosdk.waitForConfirmation(client, txId, 4);
  }

  return txId;
}
