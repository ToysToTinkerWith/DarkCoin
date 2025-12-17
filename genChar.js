import OpenAI, { toFile } from "openai";

import "dotenv/config";
import algosdk from "algosdk";

import { CID } from "multiformats/cid";

import * as mfsha2 from "multiformats/hashes/sha2";
import * as digest from "multiformats/hashes/digest";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  addDoc,
  setDoc,
  getDocs,
  collection,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";

import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  
};

let firebase_app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db = getFirestore(firebase_app);
const storage = getStorage(firebase_app);
const auth = getAuth(firebase_app);

const email = "abergquist96@gmail.com";
const password = process.env.EMAILPASS;

// top-level auth
const { user } = await signInWithEmailAndPassword(auth, email, password);
const idToken = await user.getIdToken();
console.log("Authenticated to Firebase, got idToken length:", idToken.length);

// Helper to save a match into "txns" collection (idempotent)
async function saveMatchToFirestore(match) {
  const txId = String(match.assetConfigTxId);
  if (!txId) throw new Error("Missing assetConfigTxId for Firestore save.");

  await setDoc(
    doc(db, "txns", txId),
    {
      ...match,
      assetConfigTxId: txId, // normalize as string
      createdAt: serverTimestamp(),
      status: "character_created",
    },
    { merge: true }
  );

  console.log("Saved match to Firestore txns:", match.groupId, txId);
}

// Helper to update generation progress for a character
async function updateCharGenerationProgress(assetId, data) {
  const charRef = doc(db, "chars", assetId + "object");
  await setDoc(
    charRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// ===================== CONFIG ===================== //

// Target address that receives the DARK Coin payment
const TARGET_ADDR =
  "ZATKR4UKC6II7CGXVV4GOSEQLMVY72DBSEY5X4MMKQRT5SOPN3JZA6RWPA";

// DARK Coin ASA info
const DARKCOIN_ASA_ID = 1088771340;
const DARKCOIN_AMOUNT = 10000000000; // ASA units

// Address that must sign the asset config transaction
const CONFIG_SIGNER_ADDR =
  "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY";

// How many most recent transactions TO the address we inspect
const MAX_TXNS_TO_ADDRESS = 1000;

// ✅ Only consider matches strictly AFTER this round
const MIN_MATCH_ROUND_EXCLUSIVE = 56546770;
const MIN_MATCH_ROUND_INCLUSIVE = MIN_MATCH_ROUND_EXCLUSIVE + 1;

const indexer = new algosdk.Indexer(
  "",
  "https://mainnet-idx.algonode.cloud",
  443
);

/**
 * Look only at the last 1000 transactions *to* TARGET_ADDR,
 * but only AFTER MIN_MATCH_ROUND_EXCLUSIVE.
 *
 * Among those:
 *  - find groups where:
 *    - FIRST txn in group is an axfer of 10,000,000,000 DARK Coin (1088771340) to TARGET_ADDR
 *    - LAST txn in group is an asset config (acfg) signed by CONFIG_SIGNER_ADDR
 *
 * Returns an array of parsed objects.
 */
async function fetchMatchingGroupsFromLast1000() {
  const results = [];
  const seenGroups = new Set();

  // 0) Load existing assetConfigTxId values from Firestore
  const existingConfigTxIds = new Set();
  try {
    const snap = await getDocs(collection(db, "txns"));
    for (const d of snap.docs) {
      const data = d.data();
      if (data?.assetConfigTxId) {
        existingConfigTxIds.add(String(data.assetConfigTxId));
      }
    }
  } catch (err) {
    console.warn("⚠️ Failed to load existing txns from Firestore:", err);
    // continue without filtering if needed
  }

  // 1) Pull ONLY the last N transactions where TARGET_ADDR is the receiver,
  //    but only for rounds >= MIN_MATCH_ROUND_INCLUSIVE
  const res = await indexer
    .searchForTransactions()
    .address(TARGET_ADDR)
    .addressRole("receiver")
    .minRound(MIN_MATCH_ROUND_INCLUSIVE) // ✅ rounds >= 56546771
    .limit(MAX_TXNS_TO_ADDRESS)
    .do();

  const txns = res.transactions || [];
  console.log(
    `Scanning ${txns.length} most recent transactions to ${TARGET_ADDR} (minRound=${MIN_MATCH_ROUND_INCLUSIVE})`
  );

  for (const tx of txns) {
    if (tx["tx-type"] !== "axfer") continue;

    const axfer = tx["asset-transfer-transaction"];
    if (!axfer) continue;

    if (axfer["asset-id"] !== DARKCOIN_ASA_ID) continue;
    if (axfer.receiver !== TARGET_ADDR) continue;
    if (Number(axfer.amount) !== DARKCOIN_AMOUNT) continue;

    if (!tx.group) continue;
    const groupId = tx.group;

    if (seenGroups.has(groupId)) continue;

    const txRound = tx["confirmed-round"];
    if (!txRound && txRound !== 0) {
      seenGroups.add(groupId);
      continue;
    }

    // ✅ Safety: enforce strictly-after semantics even if query changes later
    if (txRound <= MIN_MATCH_ROUND_EXCLUSIVE) {
      seenGroups.add(groupId);
      continue;
    }

    // 2) Fetch all txns in this round, then filter by group ID
    const groupRes = await indexer
      .searchForTransactions()
      .round(txRound)
      .limit(1000)
      .do();

    let groupTxns = groupRes.transactions || [];
    groupTxns = groupTxns.filter((g) => g.group === groupId);

    if (groupTxns.length < 2) {
      seenGroups.add(groupId);
      continue;
    }

    // Sort by intra-round-offset (and round defensively)
    groupTxns.sort((a, b) => {
      const ra = a["confirmed-round"] ?? 0;
      const rb = b["confirmed-round"] ?? 0;
      if (ra !== rb) return ra - rb;

      const ia = a["intra-round-offset"] ?? 0;
      const ib = b["intra-round-offset"] ?? 0;
      return ia - ib;
    });

    // ✅ NEW LOGIC:
    // - FIRST txn must be the DARK Coin payment axfer
    // - LAST txn must be the acfg signed by CONFIG_SIGNER_ADDR
    const first = groupTxns[0];
    const last = groupTxns[groupTxns.length - 1];

    const firstAxfer = first["asset-transfer-transaction"];
    if (
      first["tx-type"] !== "axfer" ||
      !firstAxfer ||
      firstAxfer["asset-id"] !== DARKCOIN_ASA_ID ||
      firstAxfer.receiver !== TARGET_ADDR ||
      Number(firstAxfer.amount) !== DARKCOIN_AMOUNT
    ) {
      seenGroups.add(groupId);
      continue;
    }

    if (last["tx-type"] !== "acfg") {
      seenGroups.add(groupId);
      continue;
    }

    const sender = last.sender;
    const authAddr = last["auth-addr"];

    if (sender !== CONFIG_SIGNER_ADDR && authAddr !== CONFIG_SIGNER_ADDR) {
      seenGroups.add(groupId);
      continue;
    }

    const acfg = last["asset-config-transaction"];
    if (!acfg) {
      seenGroups.add(groupId);
      continue;
    }

    const configuredAssetId = acfg["asset-id"];

    // 3) Skip if this assetConfigTxId already exists in Firestore
    const assetConfigTxId = String(last.id);
    if (existingConfigTxIds.has(assetConfigTxId)) {
      seenGroups.add(groupId);
      continue;
    }

    const parsed = {
      groupId,
      round: first["confirmed-round"],
      darkcoinTransferTxId: first.id,
      assetConfigTxId: last.id,
      configTargetAssetId: configuredAssetId,
      receiver: TARGET_ADDR,
      amount: Number(firstAxfer.amount),
      signer: sender,
    };

    results.push(parsed);

    // Prevent duplicates within the same run too
    existingConfigTxIds.add(assetConfigTxId);
    seenGroups.add(groupId);
  }

  return results;
}

// ===================== HELPERS ===================== //

async function urlToBlob(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok)
    throw new Error(`HTTP error fetching image! status: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return new Blob([arrayBuffer], {
    type: response.headers.get("content-type") || "image/png",
  });
}

async function uploadBase64ToFirebase(
  base64,
  destPath,
  defaultContentType = "image/png"
) {
  let contentType = defaultContentType;
  let pureBase64 = base64;

  // If it's a data URL, extract content-type + base64
  const match = base64.match(/^data:(.+);base64,(.*)$/);
  if (match) {
    contentType = match[1];
    pureBase64 = match[2];
  }

  const fileRef = ref(storage, "champs/" + destPath);

  await uploadString(fileRef, pureBase64, "base64", {
    contentType,
  });

  const url = await getDownloadURL(fileRef);
  console.log("Uploaded base64 to:", url);
  return url;
}

// ===================== MAIN PROGRAM ===================== //

async function runProgram() {
  const matches = await fetchMatchingGroupsFromLast1000();
  console.log(
    `Found ${matches.length} matching groups in last ${MAX_TXNS_TO_ADDRESS} txns to address (after round ${MIN_MATCH_ROUND_EXCLUSIVE}).`
  );
  console.dir(matches, { depth: null });

  for (const m of matches) {
    const assetId = String(m.configTargetAssetId);

    try {
      await updateCharGenerationProgress(assetId, {
        status: "starting",
        progress: 5,
        stage: "queued",
      });

      let assetConfig = await indexer
        .lookupAssetTransactions(m.configTargetAssetId)
        .txType("acfg")
        .do();

      await updateCharGenerationProgress(assetId, {
        status: "analyzing_asset",
        progress: 10,
        stage: "reading_asset_config",
      });

      let meta = atob(
        assetConfig.transactions[assetConfig.transactions.length - 1].note
      );

      let properties = JSON.parse(meta).properties;
      console.log(properties);
      let propertyOptions = [];

      for (let key in properties) {
        if (properties[key] != "None") {
          propertyOptions.push(String(key) + " " + properties[key]);
        }
      }

      let moveTrait1 =
        propertyOptions[Math.floor(Math.random() * propertyOptions.length)];
      let moveTrait2 =
        propertyOptions[Math.floor(Math.random() * propertyOptions.length)];
      let moveTrait3 =
        propertyOptions[Math.floor(Math.random() * propertyOptions.length)];

      let moveExample1 = JSON.stringify({
        description:
          "(this move should be based on " +
          moveTrait1 +
          ". The character has weapon = " +
          properties.Weapon +
          ", head = " +
          properties.Head +
          ", and armour = " +
          properties.Armour +
          ". move should target a single character. description should describe move to be able to target anyone. dont mention turns in the description. IMPORTANT: Avoid any content that may be considered inappropriate or offensive, ensuring the image aligns with content policies.)",
        name: "(string based on move description)",
        trait: moveTrait1,
        type: "(melee damage, ranged damage, magic damage, melee curse, ranged curse, magic curse, melee buff, ranged buff, magic buff)",
        effect:
          "('poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', or 'doom' if type of move is a curse or damage. 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', 'cleanse' if type of move is buff)",
        power: "(positive number between 10 and 40)",
        accuracy: "(positive number between 25 and 100)",
        cooldown: "(positive number between 3 and 10)",
      });
      let moveExample2 = JSON.stringify({
        description:
          "(this move should be based on " +
          moveTrait2 +
          ". The character has weapon = " +
          properties.Weapon +
          ", head = " +
          properties.Head +
          ", and armour = " +
          properties.Armour +
          ". move should target a single character. description should describe move to be able to target anyone. dont mention turns in the description. IMPORTANT: Avoid any content that may be considered inappropriate or offensive, ensuring the image aligns with content policies.)",
        name: "(string based on move description)",
        trait: moveTrait2,
        type: "(melee damage, ranged damage, magic damage, melee curse, ranged curse, magic curse, melee buff, ranged buff, magic buff)",
        effect:
          "('poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', or 'doom' if type of move is a curse or damage. 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', 'cleanse' if type of move is buff)",
        power: "(positive number between 10 and 40)",
        accuracy: "(positive number between 25 and 100)",
        cooldown: "(positive number between 3 and 10)",
      });
      let moveExample3 = JSON.stringify({
        description:
          "(this move should be based on " +
          moveTrait3 +
          ". The character has weapon = " +
          properties.Weapon +
          ", head = " +
          properties.Head +
          ", and armour = " +
          properties.Armour +
          ". move should target a single character. description should describe move to be able to target anyone. dont mention turns in the description. IMPORTANT: Avoid any content that may be considered inappropriate or offensive, ensuring the image aligns with content policies.)",
        name: "(string based on move description)",
        trait: moveTrait3,
        type: "(melee damage, ranged damage, magic damage, melee curse, ranged curse, magic curse, melee buff, ranged buff, magic buff)",
        effect:
          "('poison', 'bleed', 'burn', 'freeze', 'slow', 'paralyze', 'drown', or 'doom' if type of move is a curse or damage. 'shield', 'strengthen', 'empower', 'hasten', 'nurture', 'bless', 'focus', 'cleanse' if type of move is buff)",
        power: "(positive number between 10 and 40)",
        accuracy: "(positive number between 25 and 100)",
        cooldown: "(positive number between 3 and 10)",
      });

      let objectExample = JSON.stringify({
        name:
          "(name based on provided image and character properties: " +
          properties +
          ")",
        description:
          "(description based on provided image. Include in description these properties about the character: " +
          properties +
          ")",
        strength: "(number between 1 and 20)",
        dexterity: "(number between 1 and 20)",
        intelligence: "(number between 1 and 20)",
        speed: "(number between 25 and 100)",
        resist: "(number between 1 and 20)",
        health: "(number between 100 and 200)",
        moves: [moveExample1, moveExample2, moveExample3],
      });

      await updateCharGenerationProgress(assetId, {
        status: "building_character",
        progress: 20,
        stage: "prompting_openai_for_character",
      });

      let messages = [
        { role: "system", content: "You are a character object generator." },
        {
          role: "user",
          content:
            "Create a character JSON object based off of the character image and the character's properties:" +
            properties +
            ", that is the same structure as: " +
            objectExample +
            ". Make sure the moves array is an object array.",
        },
      ];

      let response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: messages,
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      let charObj = JSON.parse(response.choices[0].message.content);

      charObj["health"] = Number(charObj["health"]);
      charObj["strength"] = Number(charObj["strength"]);
      charObj["dexterity"] = Number(charObj["dexterity"]);
      charObj["intelligence"] = Number(charObj["intelligence"]);
      charObj["speed"] = Number(charObj["speed"]);
      charObj["resist"] = Number(charObj["resist"]);

      charObj["moves"].forEach((move, index) => {
        charObj["moves"][index].power = Number(charObj["moves"][index].power);
        charObj["moves"][index].accuracy = Number(
          charObj["moves"][index].accuracy
        );
        charObj["moves"][index].cooldown = Number(
          charObj["moves"][index].cooldown
        );
      });

      await updateCharGenerationProgress(assetId, {
        status: "building_character",
        progress: 25,
        stage: "base_stats_generated",
      });

      if (charObj["health"] > 200) {
        charObj["health"] = 200;
      }

      if (charObj["strength"] > 20) {
        charObj["strength"] = 20;
      }

      if (charObj["dexterity"] > 20) {
        charObj["dexterity"] = 20;
      }

      if (charObj["intelligence"] > 20) {
        charObj["intelligence"] = 20;
      }

      if (charObj["resist"] > 20) {
        charObj["resist"] = 20;
      }

      if (charObj["speed"] > 100) {
        charObj["speed"] = 100;
      }

      charObj["health"] = charObj["health"] + charObj["strength"] * 2;
      charObj["speed"] = charObj["speed"] + Math.ceil(charObj["dexterity"] / 2);
      charObj["resist"] =
        charObj["resist"] + Math.floor(charObj["intelligence"] / 2);

      charObj["currentHealth"] = Number(charObj["health"]);

      let effectsArray = [
        "poison",
        "bleed",
        "burn",
        "freeze",
        "slow",
        "paralyze",
        "drown",
        "doom",
        "shield",
        "strengthen",
        "empower",
        "hasten",
        "nurture",
        "bless",
        "focus",
        "cleanse",
      ];

      effectsArray.forEach((effect) => {
        charObj[effect] = 0;
      });

      charObj["moves"].forEach((move, index) => {
        if (charObj["moves"][index].cooldown < 0) {
          charObj["moves"][index].cooldown = Math.abs(
            charObj["moves"][index].cooldown
          );
        } else if (charObj["moves"][index].cooldown < 3) {
          charObj["moves"][index].cooldown = 3;
        }

        if (!effectsArray.includes(charObj["moves"][index].effect)) {
          charObj["moves"][index].effect =
            effectsArray[Math.floor(Math.random() * effectsArray.length)];
        }
        charObj[charObj["moves"][index].effect] = Math.floor(
          Math.random() * 5 + 1
        );

        if (
          charObj["moves"][index].type == "melee damage" ||
          charObj["moves"][index].type == "ranged damage" ||
          charObj["moves"][index].type == "magic damage"
        ) {
          charObj["moves"][index].power = charObj["moves"][index].power + 10;

          charObj["moves"][index].accuracy =
            charObj["moves"][index].accuracy - 10;

          if (charObj["moves"][index].accuracy >= 90) {
            charObj["moves"][index].power = charObj["moves"][index].power - 10;
          } else if (charObj["moves"][index].accuracy < 60) {
            charObj["moves"][index].power = charObj["moves"][index].power + 10;
          } else if (charObj["moves"][index].accuracy < 40) {
            charObj["moves"][index].power = charObj["moves"][index].power + 20;
          }

          if (charObj["moves"][index].power >= 90) {
            charObj["moves"][index].cooldown =
              charObj["moves"][index].cooldown + 1;
          } else if (charObj["moves"][index].power < 60) {
            charObj["moves"][index].cooldown =
              charObj["moves"][index].cooldown - 1;
          } else if (charObj["moves"][index].power < 40) {
            charObj["moves"][index].cooldown =
              charObj["moves"][index].cooldown - 2;
          }
        } else if (
          charObj["moves"][index].type == "melee curse" ||
          charObj["moves"][index].type == "ranged curse" ||
          charObj["moves"][index].type == "magic curse"
        ) {
          charObj["moves"][index].power = charObj["moves"][index].power - 20;
          charObj["moves"][index].accuracy =
            charObj["moves"][index].accuracy + 10;
        } else if (
          charObj["moves"][index].type == "melee buff" ||
          charObj["moves"][index].type == "ranged buff" ||
          charObj["moves"][index].type == "magic buff"
        ) {
          charObj["moves"][index].power = charObj["moves"][index].power - 20;
          charObj["moves"][index].accuracy =
            charObj["moves"][index].accuracy + 10;
        }

        if (charObj["moves"][index].power < 0) {
          charObj["moves"][index].power = 0;
        }

        if (charObj["moves"][index].accuracy > 100) {
          charObj["moves"][index].accuracy = 100;
        }
      });

      await updateCharGenerationProgress(assetId, {
        status: "building_character",
        progress: 35,
        stage: "effects_and_moves_finalized",
      });

      console.log(charObj);

      // ===== IMAGE PIPELINE =====

      let nft = await indexer.searchForAssets().index(m.configTargetAssetId).do();

      const addr = algosdk.decodeAddress(nft.assets[0].params.reserve);
      const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey);
      const ocid = CID.create(0, 0x70, mhdigest);

      let nftUrl = "https://ipfs.dark-coin.io/ipfs/" + ocid.toString();
      console.log(nftUrl);

      await updateCharGenerationProgress(assetId, {
        status: "generating_images",
        progress: 40,
        stage: "loading_base_nft_image",
      });

      const champBlob = await urlToBlob(nftUrl);

      const prompt0 =
        "Generate a full body image of this character in a standing pose on a transparent background. No parts of the character are cut off, no text or words.";
      const prompt1 =
        "Generate a full body image of this character performing the move " +
        charObj.moves[0].name +
        " with type " +
        charObj.moves[0].effect +
        " on a transparent background. Have the character facing to the right. No parts of the character are cut off, no text or words.";
      const prompt2 =
        "Generate a full body image of this character performing the move " +
        charObj.moves[1].name +
        " with type " +
        charObj.moves[1].effect +
        " on a transparent background. Have the character facing to the right. No parts of the character are cut off, no text or words.";
      const prompt3 =
        "Generate a full body image of this character performing the move " +
        charObj.moves[2].name +
        " with type " +
        charObj.moves[2].effect +
        " on a transparent background. Have the character facing to the right. No parts of the character are cut off, no text or words.";

      const imgResp0 = await openai.images.edit({
        model: "gpt-image-1",
        image: await toFile(champBlob, "champ.png", { type: "image/png" }),
        prompt: prompt0,
        size: "1024x1536",
        quality: "medium",
        background: "transparent",
        n: 1,
      });

      const b640 = imgResp0?.data?.[0]?.b64_json;
      if (!b640)
        throw new Error("OpenAI did not return an image for the sprite sheet.");

      let image0Url = await uploadBase64ToFirebase(
        b640,
        String(m.configTargetAssetId) + "/img0"
      );
      console.log(image0Url);

      charObj.standingUrl = image0Url;

      await updateCharGenerationProgress(assetId, {
        status: "generating_images",
        progress: 50,
        stage: "standing_pose_generated",
      });

      const newBlob = await urlToBlob(image0Url);

      const imgResp1 = await openai.images.edit({
        model: "gpt-image-1",
        image: await toFile(newBlob, "champ.png", { type: "image/png" }),
        prompt: prompt1,
        size: "1024x1536",
        quality: "medium",
        background: "transparent",
        n: 1,
      });

      const b641 = imgResp1?.data?.[0]?.b64_json;
      if (!b641)
        throw new Error("OpenAI did not return an image for the sprite sheet.");

      let image1Url = await uploadBase64ToFirebase(
        b641,
        String(m.configTargetAssetId) + "/img1"
      );
      console.log(image1Url);

      charObj.moves[0].characterUrl = image1Url;

      await updateCharGenerationProgress(assetId, {
        status: "generating_images",
        progress: 60,
        stage: "move1_pose_generated",
      });

      const imgResp2 = await openai.images.edit({
        model: "gpt-image-1",
        image: await toFile(newBlob, "champ.png", { type: "image/png" }),
        prompt: prompt2,
        size: "1024x1536",
        quality: "medium",
        background: "transparent",
        n: 1,
      });

      const b642 = imgResp2?.data?.[0]?.b64_json;
      if (!b642)
        throw new Error("OpenAI did not return an image for the sprite sheet.");

      let image2Url = await uploadBase64ToFirebase(
        b642,
        String(m.configTargetAssetId) + "/img2"
      );
      console.log(image2Url);

      charObj.moves[1].characterUrl = image2Url;

      await updateCharGenerationProgress(assetId, {
        status: "generating_images",
        progress: 70,
        stage: "move2_pose_generated",
      });

      const imgResp3 = await openai.images.edit({
        model: "gpt-image-1",
        image: await toFile(newBlob, "champ.png", { type: "image/png" }),
        prompt: prompt3,
        size: "1024x1536",
        quality: "medium",
        background: "transparent",
        n: 1,
      });

      const b643 = imgResp3?.data?.[0]?.b64_json;
      if (!b643)
        throw new Error("OpenAI did not return an image for the sprite sheet.");

      let image3Url = await uploadBase64ToFirebase(
        b643,
        String(m.configTargetAssetId) + "/img3"
      );
      console.log(image3Url);

      charObj.moves[2].characterUrl = image3Url;

      await updateCharGenerationProgress(assetId, {
        status: "generating_images",
        progress: 80,
        stage: "move3_pose_generated",
      });

      const prompt4 =
        "Generate what the move " +
        charObj.moves[0].name +
        " with type " +
        charObj.moves[0].effect +
        " would look like if it was cast, no characters or weapons, the move is cast to the right, no words or text on the image, transparent background. Have the move image facing to the right. Keep wide margins on all edges.";
      const prompt5 =
        "Generate what the move " +
        charObj.moves[1].name +
        " with type " +
        charObj.moves[1].effect +
        " would look like if it was cast, no characters or weapons, the move is cast to the right, no words or text on the image, transparent background. Have the move image facing to the right. Keep wide margins on all edges.";
      const prompt6 =
        "Generate what the move " +
        charObj.moves[2].name +
        " with type " +
        charObj.moves[2].effect +
        " would look like if it was cast, no characters or weapons, the move is cast to the right, no words or text on the image, transparent background. Have the move image facing to the right. Keep wide margins on all edges.";

      const imgResp4 = await openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt4,
        size: "1024x1024",
        quality: "medium",
        background: "transparent",
        n: 1,
      });

      const b644 = imgResp4?.data?.[0]?.b64_json;
      if (!b644)
        throw new Error("OpenAI did not return an image for the sprite sheet.");

      let image4Url = await uploadBase64ToFirebase(
        b644,
        String(m.configTargetAssetId) + "/img4"
      );
      console.log(image4Url);

      charObj.moves[0].moveUrl = image4Url;

      await updateCharGenerationProgress(assetId, {
        status: "generating_images",
        progress: 85,
        stage: "move1_effect_generated",
      });

      const imgResp5 = await openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt5,
        size: "1024x1024",
        quality: "medium",
        background: "transparent",
        n: 1,
      });

      const b645 = imgResp5?.data?.[0]?.b64_json;
      if (!b645)
        throw new Error("OpenAI did not return an image for the sprite sheet.");

      let image5Url = await uploadBase64ToFirebase(
        b645,
        String(m.configTargetAssetId) + "/img5"
      );
      console.log(image5Url);

      charObj.moves[1].moveUrl = image5Url;

      await updateCharGenerationProgress(assetId, {
        status: "generating_images",
        progress: 90,
        stage: "move2_effect_generated",
      });

      const imgResp6 = await openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt6,
        size: "1024x1024",
        quality: "medium",
        background: "transparent",
        n: 1,
      });

      const b646 = imgResp6?.data?.[0]?.b64_json;
      if (!b646)
        throw new Error("OpenAI did not return an image for the sprite sheet.");

      let image6Url = await uploadBase64ToFirebase(
        b646,
        String(m.configTargetAssetId) + "/img6"
      );
      console.log(image6Url);

      charObj.moves[2].moveUrl = image6Url;

      await updateCharGenerationProgress(assetId, {
        status: "generating_images",
        progress: 95,
        stage: "move3_effect_generated",
      });

      await setDoc(
        doc(db, "chars", assetId + "object"),
        {
          charObj,
          status: "completed",
          progress: 100,
          stage: "done",
          completedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // ✅ Only mark txn as processed AFTER character write succeeds
      await saveMatchToFirestore(m);
    } catch (err) {
      console.error(
        "Error processing match:",
        m.groupId,
        m.assetConfigTxId,
        err
      );

      try {
        await updateCharGenerationProgress(String(m.configTargetAssetId), {
          status: "error",
          progress: 0,
          stage: "error",
          errorMessage: String(err?.message || err),
        });
      } catch (e2) {
        console.error("Also failed to update error status in chars doc:", e2);
      }
    }
  }
}

// ===================== queuedChars SNAPSHOT WATCHER ===================== //

const queuedCharsRef = collection(db, "queuedChars");

// in-memory run queue
let isProcessing = false;
let pendingRuns = 0;

async function scheduleNextRun() {
  if (isProcessing || pendingRuns <= 0) return;

  isProcessing = true;
  pendingRuns -= 1;

  console.log(`🔁 Starting runProgram(). pendingRuns now = ${pendingRuns}`);

  try {
    await runProgram();

    // After a run completes, "consume" one queued doc (if any exist)
    const snap = await getDocs(queuedCharsRef);
    if (!snap.empty) {
      const firstDoc = snap.docs[0];
      try {
        await deleteDoc(firstDoc.ref);
        console.log("🗑️ Deleted queuedChars doc after run:", firstDoc.id);
      } catch (err) {
        console.error(
          "Error deleting queuedChars doc after run:",
          firstDoc.id,
          err
        );
      }
    } else {
      console.log("No queuedChars docs to delete after run.");
    }
  } catch (err) {
    console.error(
      "Error during runProgram triggered by queuedChars queue:",
      err
    );
  } finally {
    isProcessing = false;

    if (pendingRuns > 0) {
      console.log(
        `runProgram() finished. pendingRuns remaining = ${pendingRuns}, scheduling next run.`
      );
      scheduleNextRun();
    } else {
      console.log("runProgram() finished. Queue empty.");
    }
  }
}

onSnapshot(
  queuedCharsRef,
  (snapshot) => {
    const changes = snapshot.docChanges();
    const addedCount = changes.filter((c) => c.type === "added").length;
    if (!addedCount) return;

    // Each added doc is effectively "one run requested"
    pendingRuns += addedCount;
    console.log(
      `📥 queuedChars added docs detected (+${addedCount}), pendingRuns = ${pendingRuns}`
    );

    scheduleNextRun();
  },
  (error) => {
    console.error("Error listening to queuedChars snapshot:", error);
  }
);

// Optional: run once at startup as well
// pendingRuns += 1;
// scheduleNextRun();
