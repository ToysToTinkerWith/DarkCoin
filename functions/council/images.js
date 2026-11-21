const crypto = require('node:crypto');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

// Read dimensions before decoding so a small compressed image cannot allocate
// an unbounded bitmap. Preserve the original attachment bytes in Firebase.
function inspectImage(input) {
  const bytes = Buffer.from(input);
  if (bytes.length < 16 || bytes.length > MAX_IMAGE_BYTES) throw Error('Use a PNG, JPEG or WebP image smaller than 6 MB.');
  let contentType, width, height;
  if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) && bytes.length >= 33 && bytes.subarray(12, 16).toString() === 'IHDR') {
    contentType = 'image/png'; width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20);
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9) {
    contentType = 'image/jpeg';
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 0xff) throw Error('Invalid JPEG attachment.');
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if ([0xd8, 0xd9, 0x01].includes(marker) || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const size = bytes.readUInt16BE(offset);
      if (size < 2 || offset + size > bytes.length) throw Error('Invalid JPEG attachment.');
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && size >= 8) {
        height = bytes.readUInt16BE(offset + 3); width = bytes.readUInt16BE(offset + 5); break;
      }
      if (marker === 0xda) break;
      offset += size;
    }
  } else if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP' && bytes.readUInt32LE(4) + 8 === bytes.length) {
    contentType = 'image/webp';
    const kind = bytes.subarray(12, 16).toString();
    if (kind === 'VP8X' && bytes.length >= 30) { width = bytes.readUIntLE(24, 3) + 1; height = bytes.readUIntLE(27, 3) + 1; }
    else if (kind === 'VP8 ' && bytes.length >= 30 && bytes.subarray(23, 26).equals(Buffer.from('9d012a', 'hex'))) { width = bytes.readUInt16LE(26) & 0x3fff; height = bytes.readUInt16LE(28) & 0x3fff; }
    else if (kind === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) { const packed = bytes.readUInt32LE(21); width = (packed & 0x3fff) + 1; height = ((packed >>> 14) & 0x3fff) + 1; }
  }
  if (!contentType || !width || !height) throw Error('Use a valid PNG, JPEG or WebP attachment.');
  if (width * height > 20000000) throw Error('Maximum image size is 20 megapixels.');
  return { hash: sha(bytes), contentType, width, height, size: bytes.length };
}

async function storeImage({ db, bucket, bytes, sender, now = Date.now() }) {
  const info = inspectImage(bytes), storagePath = `council/images/${info.hash}`;
  await db.runTransaction(async tx => {
    const usage = db.collection('councilUploadLimits').doc(sender), snap = await tx.get(usage);
    const old = snap.data() || {}, day = new Date(now).toISOString().slice(0, 10), count = old.day === day ? Number(old.count) : 0;
    if (count >= 20) throw Error('Daily attachment limit reached.');
    tx.set(usage, { day, count: count + 1 });
  });
  try {
    await bucket.file(storagePath).save(Buffer.from(bytes), { resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: { contentType: info.contentType, cacheControl: 'public,max-age=31536000,immutable', metadata: { sha256: info.hash } } });
  } catch (error) {
    if (Number(error.code) !== 412) throw error;
    const [existing] = await bucket.file(storagePath).download();
    if (sha(existing) !== info.hash) throw Error('Stored image checksum failed.');
  }
  const ref = db.collection('councilImages').doc(info.hash);
  try { await ref.create({ ...info, bucket: bucket.name, storagePath, createdAt: now }); }
  catch (error) { if (Number(error.code) !== 6) throw error; }
  return { ...info, url: `/api/council/image?hash=${info.hash}` };
}

async function loadImage({ db, storage, hash }) {
  if (!/^[a-f0-9]{64}$/.test(hash || '')) throw Error('Invalid attachment hash.');
  const snap = await db.collection('councilImages').doc(hash).get();
  if (!snap.exists) return null;
  const record = snap.data();
  const bytes = record.storagePath ? (await storage.bucket(record.bucket).file(record.storagePath).download())[0] : Buffer.from(record.bytes);
  if (sha(bytes) !== hash) throw Error('Stored image checksum failed.');
  return { bytes, contentType: record.contentType || 'image/jpeg' };
}

const signedUrls=new Map();
async function readyMediaLocation({db,storage,hash,now=Date.now()}){
  if(!/^[a-f0-9]{64}$/.test(hash||''))throw Error('Invalid attachment hash.');
  const snap=await db.collection('councilImages').doc(hash).get();if(!snap.exists)return null;
  const record=snap.data();
  if(record.status&&record.status!=='ready')return null;
  // Legacy small images are served through the existing hash-verifying path.
  if(!record.generation||record.verified!==true)return {legacy:true,record};
  const key=hash+':'+record.generation,cached=signedUrls.get(key);
  let url=cached?.expires>now?cached.url:null;
  if(!url){
    const filename=String(record.name||'attachment').replace(/[^A-Za-z0-9._-]/g,'_').slice(0,180)||'attachment';
    [url]=await storage.bucket(record.bucket).file(record.storagePath,{generation:record.generation}).getSignedUrl({version:'v4',action:'read',
      expires:now+3600000,responseType:record.contentType,responseDisposition:`inline; filename="${filename}"`,queryParams:{generation:record.generation}});
    if(signedUrls.size>2000)signedUrls.clear();signedUrls.set(key,{url,expires:now+300000});
  }
  return {url,record};
}
module.exports = { MAX_IMAGE_BYTES, inspectImage, storeImage, loadImage,readyMediaLocation };
