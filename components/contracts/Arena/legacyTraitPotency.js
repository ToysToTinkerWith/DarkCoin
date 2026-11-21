import algosdk from 'algosdk';
const ITEM_VOTE_APP_ID=3339943603,EFFECT_STRIDE=2000,ITEM_POTENCY_DAO_SUFFIX=1037;
function encodeUtf8(value) {
  return new TextEncoder().encode(String(value))
}

function bytesToUint8Array(value) {
  if (value instanceof Uint8Array) return value
  if (Array.isArray(value)) return Uint8Array.from(value)
  if (typeof value === "string") {
    const binary = atob(value)
    return Uint8Array.from(binary, (c) => c.charCodeAt(0))
  }
  return new Uint8Array()
}

function getDaoVoteForEffect(boxBytes, effectIndex, daoSuffix) {
  if (!(boxBytes instanceof Uint8Array)) return null
  if (!Number.isInteger(effectIndex) || effectIndex < 0) return null
  if (!Number.isInteger(daoSuffix) || daoSuffix < 0) return null
  if (daoSuffix >= EFFECT_STRIDE) return null

  const offset = effectIndex * EFFECT_STRIDE + daoSuffix
  if (offset < 0 || offset >= boxBytes.length) return null

  const value = boxBytes[offset]
  return value > 0 && value <= 20 ? value : null
}

function computeEffectPotenciesFromDaoVote(
  boxBytes,
  effectCount,
  daoSuffix = ITEM_POTENCY_DAO_SUFFIX
) {
  return Array.from({ length: effectCount }, (_unused, effectIndex) =>
    getDaoVoteForEffect(boxBytes, effectIndex, daoSuffix)
  )
}

async function readTraitEffectMedians(client, traitName, effectCount) {
  if (!traitName || !effectCount) {
    return []
  }

  try {
    const res = await client
      .getApplicationBoxByName(ITEM_VOTE_APP_ID, encodeUtf8(traitName))
      .do()

    const boxBytes = bytesToUint8Array(res?.value)
    return computeEffectPotenciesFromDaoVote(boxBytes, effectCount)
  } catch (error) {
    console.error("Failed to read item voting box for trait:", traitName, error)
    return Array(effectCount).fill(null)
  }
}

const cache=new Map();
export function loadLegacyPotencies(name,count){const key=name+':'+count;const previous=cache.get(key);if(previous&&Date.now()-previous.time<60000)return previous.promise;const promise=readTraitEffectMedians(new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud',443),name,count);cache.set(key,{time:Date.now(),promise});return promise;}
