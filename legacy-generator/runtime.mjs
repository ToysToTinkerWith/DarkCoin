import {initializeApp} from 'firebase-admin/app';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import crypto from 'node:crypto';
import sharp from 'sharp';
initializeApp({projectId:process.env.GOOGLE_CLOUD_PROJECT||'dark-coin-dc4a3',storageBucket:'dark-coin-dc4a3.appspot.com'});
export const db=getFirestore(),storage=getStorage().bucket();
export const doc=(db,collection,id)=>db.collection(collection).doc(String(id));
export const collection=(db,name)=>db.collection(name);
const snapshot=s=>({id:s.id,ref:s.ref,exists:()=>s.exists,data:()=>s.data()});
export const getDoc=async ref=>snapshot(await ref.get());
export const getDocs=async ref=>({docs:(await ref.get()).docs.map(snapshot)});
export const setDoc=(ref,value,options)=>options?ref.set(value,options):ref.set(value);
export const deleteDoc=ref=>ref.delete();
export const serverTimestamp=()=>FieldValue.serverTimestamp();
export const ref=(bucket,path)=>bucket.file(path.startsWith('champs/')?path.replace('champs/',`champs/builds/${process.env.GENERATION_JOB_ID}/`):path);
export async function uploadBytes(file,bytes,metadata={}){await file.save(Buffer.from(bytes),{resumable:false,metadata:{...metadata,metadata:{firebaseStorageDownloadTokens:crypto.randomUUID()}}});}
export const uploadString=(file,data,encoding,metadata)=>uploadBytes(file,Buffer.from(data,encoding),metadata);
export async function getDownloadURL(file){const [meta]=await file.getMetadata();return `https://firebasestorage.googleapis.com/v0/b/${file.bucket.name}/o/${encodeURIComponent(file.name)}?alt=media&token=${meta.metadata.firebaseStorageDownloadTokens}`;}
const job=()=>db.collection('legacyGenerationJobs').doc(process.env.GENERATION_JOB_ID);
export async function claimJob(){
 if(process.env.GENERATION_HEALTHCHECK==='1'){
  await db.collection('legacyGenerationJobs').doc('healthcheck').get();
  const image=await composeLoadout({Skin:'Undead',Head:'Bone',Armour:'Leather Garb',Weapon:'Scythe'});
  console.log(`Generation health check passed: Firestore access and selected-trait composition (${image.size} bytes). No payment or AI generation performed.`);
  return false;
 }
 if(!/^[a-f0-9]{48}$/.test(process.env.GENERATION_JOB_ID||''))throw Error('Missing generation job ID.');
 return db.runTransaction(async tx=>{const ref=job(),data=(await tx.get(ref)).data();
  if(!data||data.schemaVersion!==2)throw Error('Unverified generation job.');
  if(data.status==='completed'||data.status==='processing')return false;
  if(data.status!=='queued')return false;
  tx.update(ref,{status:'processing',startedAt:Date.now()});return true;
 });
}
export async function completeJob(error){
 const ref=job(),data=(await ref.get()).data(),charRef=db.collection('chars').doc(data.champId+'object'),character=(await charRef.get()).data();
 if(error||character.status!=='completed'){
  const message=error?.message||character.errorMessage||'Generation did not finish. Your payment is saved; contact support with the payment transaction ID.';
  await ref.update({status:'error',errorMessage:message,finishedAt:Date.now()});
  await charRef.set({status:'error',errorMessage:message},{merge:true});
 }else await ref.update({status:'completed',finishedAt:Date.now()});
}
async function layer(type,name){
 const raw=String(name).trim(),base=type==='Background'?raw.replace(/\s*Background$/i,'').trim():raw;
 const names=[...new Set([base,raw,...[base,raw].flatMap(n=>[n.replace(/[’']/g,''),n.replace(/[^\w\s-]/g,'')])])];
 for(const candidate of names)for(const ext of ['.png','.webp','.jpg','.jpeg']){
  const file=storage.file(`warriors/${type}/${candidate}${ext}`);
  try{const [bytes]=await file.download();return sharp(bytes).resize(1080,1080).png().toBuffer();}catch(e){if(e.code!==404)throw e;}
 }
 throw Error(`Missing ${type} artwork for ${name}.`);
}
export async function composeLoadout(properties){
 const order=['Background','Skin','Weapon','Magic',...(properties.Head==='Farmer'?[]:['Head']),'Armour','Extra',...(properties.Head==='Farmer'?['Head']:[])];
 const inputs=await Promise.all(order.filter(type=>properties[type]&&properties[type]!=='None').map(async type=>({input:await layer(type,properties[type]),top:0,left:0})));
 const bytes=await sharp({create:{width:1080,height:1080,channels:4,background:'#141414'}}).composite(inputs).png().toBuffer();
 return new Blob([bytes],{type:'image/png'});
}
