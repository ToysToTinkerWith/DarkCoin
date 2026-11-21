const crypto = require('node:crypto');
const { createSHA256 } = require('hash-wasm');

const { MAX_MEDIA_BYTES, descriptor } = require('./mediaDescriptor');
const VERIFY_CHUNK_BYTES = 64 * 1024 * 1024;
const HASH_VERSION = 'sha256/hash-wasm-4.13.0';
const SESSION_MS = 7 * 86400000;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const sessionError=(code,message)=>Object.assign(Error(message),{code});
function inspectPrefix(input, contentType) {
  const bytes = Buffer.from(input), declaredKind = contentType.startsWith('video/') ? 'video' : 'image';
  let kind, width, height;
  if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    kind = 'image';
    if (bytes.length >= 24) { width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20); }
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) kind = 'image';
  else if (/^GIF8[79]a$/.test(bytes.subarray(0, 6).toString())) {
    kind = 'image';
    if (bytes.length >= 10) { width = bytes.readUInt16LE(6); height = bytes.readUInt16LE(8); }
  } else if (bytes.subarray(0, 4).toString() === 'RIFF') {
    if (bytes.subarray(8, 12).toString() === 'WEBP') kind = 'image';
    if (bytes.subarray(8, 12).toString() === 'AVI ') kind = 'video';
  } else if (bytes.subarray(0, 4).equals(Buffer.from('1a45dfa3', 'hex')) || bytes.subarray(0, 4).toString() === 'OggS') kind = 'video';
  else if (bytes.subarray(4, 8).toString() === 'ftyp') {
    const brands = bytes.subarray(8, 64).toString();
    kind = /avif|avis|heic|heix|hevc|hevx|mif1|msf1/.test(brands) ? 'image' : 'video';
  } else if (bytes.subarray(0, 2).toString() === 'BM' || ['49492a00', '4d4d002a'].includes(bytes.subarray(0, 4).toString('hex'))) kind = 'image';
  else if (bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1) kind = 'video';
  else if (contentType === 'image/svg+xml') {
    const text = bytes.subarray(0, 4096).toString('utf8');
    if (/<svg(?:\s|>)/i.test(text) && !/<!DOCTYPE/i.test(text)) kind = 'image';
  }
  // Reject obvious active documents, even if their filename/type was spoofed.
  if (/^\s*(?:<!doctype\s+html|<html|<script)/i.test(bytes.subarray(0, 256).toString())) throw Error('The attachment is an HTML document, not an image or video.');
  if (kind && kind !== declaredKind) throw Error('The attachment contents do not match its image/video type.');
  return { kind: kind || declaredKind, ...(width > 0 && height > 0 ? { width, height } : {}) };
}

function mediaFromRecord(record, hash = record.hash) {
  const contentType = record.contentType || 'image/jpeg';
  return { hash, kind: record.kind || (contentType.startsWith('video/') ? 'video' : 'image'), contentType,
    size: Number(record.size || record.bytes?.length || 0), name: record.name || 'Attachment',
    url: `/api/council/image?hash=${hash}`, ...(record.width ? { width: record.width, height: record.height } : {}) };
}

function publicStatus(record, id, token) {
  const result = { id, status: record.status, loaded: Number(record.cursor || 0), total: record.descriptor.size,
    expiresAt: record.expiresAt, ...(record.status === 'uploading' ? { resumableUrl: record.resumableUrl } : {}) };
  if (token) result.token = token;
  if (record.status === 'ready') result.media = record.media;
  if (record.status === 'failed') result.error = record.error || 'Attachment verification failed.';
  return result;
}

function checkAccess(record, token, now) {
  const value = sha(String(token || ''));
  if (!record || !record.tokenHash || !crypto.timingSafeEqual(Buffer.from(value), Buffer.from(record.tokenHash))) throw sessionError('UPLOAD_SESSION_UNAUTHORIZED','This upload session is not authorized.');
  if (record.expiresAt < now && record.status !== 'ready') throw sessionError('UPLOAD_SESSION_EXPIRED','This upload session expired. Retry the attachment.');
}

async function beginUpload({ db, bucket, storage, sender, file, origin, now = Date.now() }) {
  const input = descriptor(file), existing = await db.collection('councilImages').doc(input.hash).get();
  let replaces;
  if (existing.exists && (!existing.data().status || existing.data().status === 'ready') && existing.data().verified !== false) {
    const old=existing.data();
    try{
      if(old.storagePath){
        const oldBucket=storage?storage.bucket(old.bucket):bucket;
        const [metadata]=await oldBucket.file(old.storagePath,old.generation?{generation:old.generation}:{}).getMetadata();
        if(old.size&&Number(metadata.size)!==Number(old.size))throw Error('Stored attachment size changed.');
      }
      return { status: 'ready', media: mediaFromRecord(old, input.hash), loaded: input.size, total: input.size };
    }catch(error){
      if(Number(error.code)!==404)throw error;
      // Repair a missing object only by fully verifying the same original hash.
      // Existing proposals still reference exactly the same bytes and metadata.
      replaces={storagePath:old.storagePath,generation:old.generation||''};
    }
  }
  await db.runTransaction(async tx => {
    const ref = db.collection('councilUploadLimits').doc(sender), snap = await tx.get(ref), old = snap.data() || {};
    const day = new Date(now).toISOString().slice(0, 10), count = old.day === day ? Number(old.count) : 0;
    if (count >= 20) throw Error('Daily attachment limit reached.');
    tx.set(ref, { day, count: count + 1 });
  });
  const id = crypto.randomUUID().replace(/-/g, ''), token = crypto.randomBytes(32).toString('hex');
  const storagePath = `council/media/${input.hash}/${id}`;
  const [resumableUrl] = await bucket.file(storagePath).createResumableUpload({ origin, preconditionOpts: { ifGenerationMatch: 0 },
    metadata: { contentType: input.contentType, contentLength: input.size, cacheControl: 'public,max-age=31536000,immutable',
      metadata: { councilUpload: id, sha256Expected: input.hash } } });
  const record = { owner: sender, descriptor: input, bucket: bucket.name, storagePath, resumableUrl, tokenHash: sha(token),
    status: 'uploading', cursor: 0, createdAt: now, updatedAt: now, expiresAt: now + SESSION_MS, deleteAt: new Date(now + SESSION_MS),...(replaces?{replaces}:{}) };
  await db.collection('councilMediaUploads').doc(id).create(record);
  return publicStatus(record, id, token);
}

async function uploadStatus({ db, id, token, now = Date.now() }) {
  if (!/^[a-f0-9]{32}$/.test(String(id || ''))) throw sessionError('UPLOAD_SESSION_INVALID','Invalid upload session.');
  const snap = await db.collection('councilMediaUploads').doc(id).get(), record = snap.exists ? snap.data() : null;
  checkAccess(record, token, now);
  return publicStatus(record, id);
}

async function verifyUpload({ db, storage, id, token, now = Date.now(), chunkBytes = VERIFY_CHUNK_BYTES, maxWorkMs = 20000 }) {
  if (!/^[a-f0-9]{32}$/.test(String(id || ''))) throw sessionError('UPLOAD_SESSION_INVALID','Invalid upload session.');
  const ref = db.collection('councilMediaUploads').doc(id), lease = crypto.randomUUID();
  let record = (await ref.get()).data();
  checkAccess(record, token, now);
  if (record.status === 'ready' || record.status === 'failed') return publicStatus(record, id);
  if (record.status === 'uploading') {
    let metadata;
    try { [metadata] = await storage.bucket(record.bucket).file(record.storagePath).getMetadata(); }
    catch (error) { if (Number(error.code) === 404) return publicStatus(record, id); throw error; }
    if (Number(metadata.size) !== record.descriptor.size || metadata.metadata?.councilUpload !== id || metadata.metadata?.sha256Expected !== record.descriptor.hash) throw Error('The stored attachment does not match the authorized upload.');
    await db.runTransaction(async tx => {
      const value = (await tx.get(ref)).data(); checkAccess(value, token, now);
      if (value.status === 'uploading') tx.update(ref, { status: 'verifying', generation: String(metadata.generation), crc32c: metadata.crc32c || '',
        expiresAt: now + SESSION_MS, deleteAt: new Date(now + SESSION_MS), updatedAt: now });
    });
  }
  record = await db.runTransaction(async tx => {
    const value = (await tx.get(ref)).data(); checkAccess(value, token, now);
    if (value.status !== 'verifying' || Number(value.leaseUntil || 0) > now) return null;
    tx.update(ref, { lease, leaseUntil: now + 180000, updatedAt: now });
    return value;
  });
  if (!record) return uploadStatus({ db, id, token, now });
  try {
    if (record.hashVersion && record.hashVersion !== HASH_VERSION) throw Error('Attachment verification was upgraded. Please retry this upload.');
    const hasher = await createSHA256();
    if (record.hashState) hasher.load(Buffer.from(record.hashState, 'base64')); else hasher.init();
    const start = Number(record.cursor || 0), end = Math.min(record.descriptor.size - 1, start + chunkBytes - 1), began = Date.now();
    const source = storage.bucket(record.bucket).file(record.storagePath, { generation: record.generation });
    const stream = source.createReadStream({ start, end, validation: false, decompress: false });
    const streamTimer=setTimeout(()=>stream.destroy(Error('Attachment verification stopped making progress. Please retry.')),60000);
    let read = 0, prefix = Buffer.alloc(0), info = record.mediaInfo;
    try{
      for await (const chunk of stream) {
        hasher.update(chunk); read += chunk.length;
        if (start === 0 && prefix.length < 4096) prefix = Buffer.concat([prefix, chunk.subarray(0, 4096 - prefix.length)]);
        if (Date.now() - began >= maxWorkMs) break;
      }
    }finally{clearTimeout(streamTimer);stream.destroy();}
    if (!read) throw Error('The attachment verification stream returned no bytes. Please retry.');
    if (!info) info = inspectPrefix(prefix, record.descriptor.contentType);
    const cursor = start + read;
    if (cursor > record.descriptor.size) throw Error('Unexpected attachment size during verification.');
    const complete = cursor === record.descriptor.size;
    const actualHash = complete ? hasher.digest('hex') : null;
    if (complete && actualHash !== record.descriptor.hash) {
      await db.runTransaction(async tx => {
        const value = (await tx.get(ref)).data();
        if (value.lease === lease) tx.update(ref, { status: 'failed', error: 'The uploaded file checksum did not match. Please retry the original file.', lease: null, leaseUntil: 0, updatedAt: Date.now() });
      });
      return uploadStatus({ db, id, token });
    }
    await db.runTransaction(async tx => {
      const value = (await tx.get(ref)).data();
      if (value.lease !== lease || Number(value.cursor || 0) !== start || value.generation !== record.generation) throw Error('Another verification attempt advanced this upload. Retry its status.');
      const publicRef = db.collection('councilImages').doc(record.descriptor.hash);
      const old = complete ? await tx.get(publicRef) : null;
      let media;
      if (complete) {
        const recovering=old.exists&&record.replaces&&old.data().storagePath===record.replaces.storagePath&&String(old.data().generation||'')===record.replaces.generation;
        const published = { ...record.descriptor, ...info, bucket: record.bucket, storagePath: record.storagePath,
          generation: record.generation, crc32c: record.crc32c, status: 'ready', verified: true, verifiedAt: Date.now(), createdAt: record.createdAt };
        if(recovering){for(const key of ['name','kind','contentType','width','height','createdAt'])if(old.data()[key]!==undefined)published[key]=old.data()[key];}
        if (!old.exists||recovering) tx.set(publicRef, published);
        else if (old.data().status && old.data().status !== 'ready') throw Error('Attachment metadata is not ready.');
        media = mediaFromRecord(old.exists&&!recovering ? old.data() : published, record.descriptor.hash);
      }
      tx.update(ref, { cursor, mediaInfo: info, hashVersion: HASH_VERSION, hashState: complete ? null : Buffer.from(hasher.save()).toString('base64'),
        status: complete ? 'ready' : 'verifying', ...(complete ? { media } : {}), lease: null, leaseUntil: 0,
        expiresAt: Date.now() + SESSION_MS, deleteAt: new Date(Date.now() + SESSION_MS), updatedAt: Date.now() });
    });
    return uploadStatus({ db, id, token });
  } catch (error) {
    await db.runTransaction(async tx => {
      const value = (await tx.get(ref)).data();
      if (value?.lease === lease) tx.update(ref, { lease: null, leaseUntil: 0, updatedAt: Date.now() });
    });
    throw error;
  }
}

async function readyAttachments(db, attachments, storage) {
  if (!Array.isArray(attachments)) throw Error('Invalid proposal attachments.');
  const output = [];
  for (const attachment of attachments) {
    const hash = String(attachment.hash || '');
    if (!/^[a-f0-9]{64}$/.test(hash)) throw Error('Invalid attachment.');
    const snap = await db.collection('councilImages').doc(hash).get();
    if (!snap.exists || (snap.data().status && snap.data().status !== 'ready') || snap.data().verified === false) throw Error('Wait until every attachment has finished uploading and verification before submitting.');
    const record = snap.data();
    if (storage && record.storagePath) {
      const [metadata] = await storage.bucket(record.bucket).file(record.storagePath, record.generation ? { generation: record.generation } : {}).getMetadata();
      if (record.size && Number(metadata.size) !== Number(record.size)) throw Error('A proposal attachment is incomplete. Retry the upload.');
    }
    const media = mediaFromRecord(record, hash);
    output.push({ hash, caption: String(attachment.caption || '').slice(0, 500), kind: media.kind, contentType: media.contentType, size: media.size, name: media.name });
  }
  return output;
}

module.exports = { MAX_MEDIA_BYTES, VERIFY_CHUNK_BYTES, HASH_VERSION, descriptor, inspectPrefix, mediaFromRecord,
  beginUpload, uploadStatus, verifyUpload, readyAttachments };
