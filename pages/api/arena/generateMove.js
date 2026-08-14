import NextCors from 'nextjs-cors';

import { initializeApp, getApps } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

import OpenAI, { toFile } from "openai";
const openai = new OpenAI({ apiKey: process.env.DALLE_KEY });

const Jimp = require('jimp');

/* ======================= Firebase Init ======================= */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};
let firebase_app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const storage = getStorage(firebase_app);
const db = getFirestore(firebase_app);
const auth = getAuth(firebase_app);

/* ======================= Small Utils ======================= */
function b64ToUint8Array(b64) {
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}
function randId() {
  return Math.random().toString(36).slice(2, 12);
}
const safeStr = (v) => (v == null ? '' : String(v));

/* =================== Grid Detection Helpers =================== */
function findOpaqueRuns1D(total, isLineOpaque, minRun = 4) {
  const runs = [];
  let inRun = false;
  let start = 0;
  for (let i = 0; i < total; i++) {
    const opaque = isLineOpaque(i);
    if (opaque && !inRun) { inRun = true; start = i; }
    else if (!opaque && inRun) {
      const end = i - 1;
      if (end - start + 1 >= minRun) runs.push([start, end]);
      inRun = false;
    }
  }
  if (inRun) {
    const end = total - 1;
    if (end - start + 1 >= minRun) runs.push([start, end]);
  }
  return runs;
}
function getTwoBestRuns(runs) {
  if (runs.length <= 2) return runs;
  const sorted = runs
    .map(r => ({ r, w: r[1] - r[0] + 1 }))
    .sort((a, b) => b.w - a.w)
    .slice(0, 2)
    .map(x => x.r)
    .sort((a, b) => a[0] - b[0]);
  return sorted;
}
function detectGridBoxesByTransparency(img, alphaThresh = 10) {
  const { width: W, height: H, data } = img.bitmap;

  const isColOpaque = (x) => {
    for (let y = 0; y < H; y++) {
      const idx = (W * y + x) * 4 + 3;
      if (data[idx] > alphaThresh) return true;
    }
    return false;
  };
  const isRowOpaque = (y) => {
    const base = W * y * 4 + 3;
    for (let x = 0; x < W; x++) {
      if (data[base + x * 4] > alphaThresh) return true;
    }
    return false;
  };

  const colRuns = findOpaqueRuns1D(W, isColOpaque, 4);
  const rowRuns = findOpaqueRuns1D(H, isRowOpaque, 4);

  const xRuns = getTwoBestRuns(colRuns);
  const yRuns = getTwoBestRuns(rowRuns);

  if (xRuns.length !== 2 || yRuns.length !== 2) {
    const qW = Math.floor(W / 2);
    const qH = Math.floor(H / 2);
    return {
      TL: { x: 0,   y: 0,   w: qW, h: qH },
      TR: { x: qW,  y: 0,   w: qW, h: qH },
      BL: { x: 0,   y: qH,  w: qW, h: qH },
      BR: { x: qW,  y: qH,  w: qW, h: qH },
      usedFallback: true,
    };
  }

  const [xL0, xL1] = xRuns[0];
  const [xR0, xR1] = xRuns[1];
  const [yT0, yT1] = yRuns[0];
  const [yB0, yB1] = yRuns[1];

  return {
    TL: { x: xL0, y: yT0, w: xL1 - xL0 + 1, h: yT1 - yT0 + 1 },
    TR: { x: xR0, y: yT0, w: xR1 - xR0 + 1, h: yT1 - yT0 + 1 },
    BL: { x: xL0, y: yB0, w: xL1 - xL0 + 1, h: yB1 - yB0 + 1 },
    BR: { x: xR0, y: yB0, w: xR1 - xR0 + 1, h: yB1 - yB0 + 1 },
    usedFallback: false,
  };
}

/* Tight trim (alpha>thresh) + transparent padding */
async function trimTightWithPad(img, alphaThresh = 10, pad = 12) {
  const W = img.bitmap.width;
  const H = img.bitmap.height;

  let minX = W, minY = H, maxX = -1, maxY = -1;
  img.scan(0, 0, W, H, function (x, y, idx) {
    const a = this.bitmap.data[idx + 3];
    if (a > alphaThresh) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  });

  if (maxX < 0 || maxY < 0) {
    return new Jimp(Math.max(1, W), Math.max(1, H), 0x00000000);
  }
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;

  const cropped = img.clone().crop(minX, minY, bw, bh);
  const canvas = new Jimp(bw + pad * 2, bh + pad * 2, 0x00000000);
  canvas.composite(cropped, pad, pad);
  return canvas;
}

/* Pad-only equalize dimensions across sprites */
async function equalizeDimensions(images) {
  const widths  = images.map(im => im.bitmap.width);
  const heights = images.map(im => im.bitmap.height);
  const targetW = Math.max(...widths);
  const targetH = Math.max(...heights);

  const out = [];
  for (const im of images) {
    const { width: w, height: h } = im.bitmap;
    if (w === targetW && h === targetH) {
      out.push(im); continue;
    }
    const canvas = new Jimp(targetW, targetH, 0x00000000);
    const x = Math.floor((targetW - w) / 2);
    const y = Math.floor((targetH - h) / 2);
    canvas.composite(im, x, y);
    out.push(canvas);
  }
  return out;
}

/* =================== Main Handler: generateMove → sprite sheet =================== */
async function generateMove(req, res) {
  await NextCors(req, res, {
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200,
  });

  async function urlToBlob(imageUrl) {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    return new Blob([arrayBuffer], { type: response.headers.get('content-type') || 'image/png' });
  }

  return new Promise(async (resolve) => {
    try {
      /* ===== Auth & fetch char object ===== */
      const email    = 'abergquist96@gmail.com';
      const password = process.env.EMAILPASS;
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      await user.getIdToken();

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      const docRefChar = doc(db, "chars", safeStr(body.charId) + "object");
      const docSnapChar = await getDoc(docRefChar);
      if (!docSnapChar.exists()) throw new Error("No such character document!");
      const charObj = docSnapChar.data().charObj || {};
      const moves = Array.isArray(charObj.moves) ? charObj.moves : [];
      if (moves.length < 3) throw new Error("charObj.moves must have at least 3 moves for the sprite sheet.");

      /* ===== Load champ image and ask OpenAI to EDIT into a 2×2 sheet ===== */
      // Panels:
      // TL: standing facing FORWARD
      // TR: move[0]
      // BL: move[1]
      // BR: move[2]
      const champBlob = await urlToBlob(safeStr(body.url));

      const prompt =
        [
          `Create a SINGLE transparent PNG arranged as a 2×2 grid (no borders or grid lines). Don't include any text in the image.`,
          `The SAME full-body character from the input image appears in ALL four panels with identical outfit and style. Keep each character centered in each panel.`,
          `Each panel: character fully visible head-to-toe, centered, with LARGE transparent margins. Keep the character small so no part touches edges.`,
          `Panels (LEFT→RIGHT, TOP→BOTTOM):`,
          `1) TOP-LEFT: neutral idle/standing pose, facing FORWARD (toward the viewer).`,
          `2) TOP-RIGHT: performing the move "${moves[0].name} with type ${moves[0].type}".`,
          `3) BOTTOM-LEFT: performing the move "${moves[1].name} with type ${moves[1].type}".`,
          `4) BOTTOM-RIGHT: performing the move "${moves[2].name} with type ${moves[2].type}".`,
          `Keep background 100% transparent. Keep hands/items exactly as in the input (do NOT invent new props).`,
        ].join(' ');

      const editResp = await openai.images.edit({
        model: "gpt-image-1",
        image: await toFile(champBlob, "champ.png", { type: "image/png" }),
        prompt,
        size: "1024x1024",
        quality: "high",
        background: "transparent",
        n: 1
      });

      const b64 = editResp?.data?.[0]?.b64_json;
      if (!b64) throw new Error("OpenAI did not return an image for the sprite sheet.");

      const spriteId = randId();

      /* ===== Load full sheet into Jimp ===== */
      const sheetBytes = b64ToUint8Array(b64);
      const sheet = await Jimp.read(Buffer.from(sheetBytes));

      // Save the FULL sheet (handy to keep)
      const fullBuf = await sheet.getBufferAsync(Jimp.MIME_PNG);
      const fullRef = ref(storage, `spritesheets/${body.charId}/${spriteId}/sheet.png`);
      await uploadBytes(fullRef, fullBuf, { contentType: 'image/png' });
      const fullUrl = await getDownloadURL(fullRef);

      /* ===== Detect panel boxes via transparency scan, crop, trim, equalize ===== */
      const boxes = detectGridBoxesByTransparency(sheet, 10);

      const pad = 12;
      const TL = await trimTightWithPad(sheet.clone().crop(boxes.TL.x, boxes.TL.y, boxes.TL.w, boxes.TL.h), 10, pad);
      const TR = await trimTightWithPad(sheet.clone().crop(boxes.TR.x, boxes.TR.y, boxes.TR.w, boxes.TR.h), 10, pad);
      const BL = await trimTightWithPad(sheet.clone().crop(boxes.BL.x, boxes.BL.y, boxes.BL.w, boxes.BL.h), 10, pad);
      const BR = await trimTightWithPad(sheet.clone().crop(boxes.BR.x, boxes.BR.y, boxes.BR.w, boxes.BR.h), 10, pad);

      const [TLn, TRn, BLn, BRn] = await equalizeDimensions([TL, TR, BL, BR]);

      // Encode
      const bufIdle   = await TLn.getBufferAsync(Jimp.MIME_PNG); // standing
      const bufMove0  = await TRn.getBufferAsync(Jimp.MIME_PNG); // move[0]
      const bufMove1  = await BLn.getBufferAsync(Jimp.MIME_PNG); // move[1]
      const bufMove2  = await BRn.getBufferAsync(Jimp.MIME_PNG); // move[2]

      /* ===== Upload idle + per-move like your existing flow ===== */
      const basePath = `spritesheets/${body.charId}/${spriteId}`;
      // Idle store-only
      const idleRef = ref(storage, `${basePath}/idle.png`);
      await uploadBytes(idleRef, bufIdle, { contentType: 'image/png' });
      const idleUrl = await getDownloadURL(idleRef);
      console.log(idleUrl)


      // Helper to upload a move sprite and write Firestore doc like before
      async function uploadMove(i, imageBuffer) {
        const m = moves[i];
        const moveName = safeStr(m.name);
        const storageRefMove = ref(storage, `moves/${safeStr(body.charId)}${moveName}`);
        const snap = await uploadBytes(storageRefMove, imageBuffer, { contentType: 'image/png' });
        const downloadUrl = await getDownloadURL(snap.ref);

        

        await setDoc(
          doc(db, "moves", safeStr(body.charId) + moveName),
          {
            type: safeStr(m.type),
            effect: safeStr(m.effect),
            power: Number(m.power),
            accuracy: Number(m.accuracy),
            description: safeStr(m.description),
            cooldown: Number(m.cooldown),
            name: moveName,
            url: downloadUrl
          }
        );
        return downloadUrl;
      }

      const urlMove0 = await uploadMove(0, bufMove0); // TR
      const urlMove1 = await uploadMove(1, bufMove1); // BL
      const urlMove2 = await uploadMove(2, bufMove2); // BR

      res.json({
        status: "uploaded",
        spriteId,
        sheetUrl: fullUrl,
        idleUrl,
        moves: [
          { index: 0, name: safeStr(moves[0]?.name), url: urlMove0 },
          { index: 1, name: safeStr(moves[1]?.name), url: urlMove1 },
          { index: 2, name: safeStr(moves[2]?.name), url: urlMove2 },
        ],
        detection: {
          usedFallback: !!boxes.usedFallback,
          boxes: { TL: boxes.TL, TR: boxes.TR, BL: boxes.BL, BR: boxes.BR }
        }
      });
      resolve();

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: String(error?.message || error) });
      resolve();
    }
  });
}

export default generateMove;
