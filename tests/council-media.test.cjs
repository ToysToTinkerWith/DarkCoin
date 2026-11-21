const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {Readable}=require('node:stream');
const media=require('../functions/council/media');
const {normalizeProposal}=require('../functions/council/model');
const {uploadCouncilMedia,hashMediaFile,uploadedOffset,trustedUploadUrl}=require('../lib/councilMediaUploads');
const {verifyAttachment}=require('../functions/council/attachmentIntegrity');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

function fakeFirebase(){
  const records=new Map(),objects=new Map(),sessions=new Map(),reads=[];
  let generation=100,tail=Promise.resolve();
  const clone=value=>value===undefined?undefined:structuredClone(value);
  const ref=key=>({key,get:async()=>({exists:records.has(key),data:()=>clone(records.get(key))}),create:async value=>{
    if(records.has(key))throw Object.assign(Error('Exists'),{code:6});records.set(key,clone(value));}});
  const db={collection:name=>({doc:id=>ref(name+'/'+id)}),runTransaction:fn=>{
    const run=tail.then(async()=>{const writes=[];let mutated=false;
      const result=await fn({get:async r=>{assert.equal(mutated,false,'Firestore reads precede writes');return r.get();},
        set:(r,value)=>{mutated=true;writes.push(()=>records.set(r.key,clone(value)));},
        update:(r,value)=>{mutated=true;writes.push(()=>records.set(r.key,{...records.get(r.key),...clone(value)}));}});
      for(const write of writes)write();return result;
    });tail=run.catch(()=>{});return run;
  }};
  const bucket={name:'media-tests',file:(name,options={})=>({
    createResumableUpload:async config=>{sessions.set(name,clone(config));return ['https://storage.googleapis.com/upload/storage/v1/b/media-tests/o?upload_id='+name];},
    getMetadata:async()=>{const obj=objects.get(name);if(!obj||options.generation&&String(options.generation)!==obj.metadata.generation)throw Object.assign(Error('Not found'),{code:404});return [clone(obj.metadata)];},
    createReadStream:config=>{const obj=objects.get(name);assert(obj,'Only completed objects are readable');assert.equal(String(options.generation),obj.metadata.generation,'Every verification range pins the uploaded generation');
      reads.push({name,...config,generation:options.generation});const bytes=obj.bytes.subarray(config.start,config.end+1);
      return Readable.from((function*(){for(let i=0;i<bytes.length;i+=65536)yield bytes.subarray(i,i+65536);})());},
  })};
  const storage={bucket:name=>{assert.equal(name,bucket.name);return bucket;}};
  function complete(id,bytes){const row=records.get('councilMediaUploads/'+id),config=sessions.get(row.storagePath);
    objects.set(row.storagePath,{bytes:Buffer.from(bytes),metadata:{size:String(bytes.length),generation:String(++generation),crc32c:'verified-provider-checksum',
      contentType:config.metadata.contentType,metadata:config.metadata.metadata}});
  }
  return {db,bucket,storage,records,objects,sessions,reads,complete};
}
function mp4(size){const bytes=Buffer.alloc(size,0x3a);bytes.writeUInt32BE(24,0);bytes.write('ftyp',4);bytes.write('isom',8);return bytes;}
async function begin(f,bytes,extra={}){return media.beginUpload({...f,sender:'wallet',origin:'https://dark-coin.com',
  file:{hash:sha(bytes),size:bytes.length,contentType:'video/mp4',name:'Full original.mp4',...extra}});}

test('direct upload authorization accepts media beyond old request limits through the provider object maximum',async()=>{
  const f=fakeFirebase(),file=media.descriptor({hash:'a'.repeat(64),size:media.MAX_MEDIA_BYTES,contentType:'video/mp4',name:'full movie.mp4'});
  const session=await media.beginUpload({...f,sender:'wallet',origin:'https://dark-coin.com',file});
  assert.equal(session.status,'uploading');assert.equal(session.total,5*1024**4);
  const row=f.records.get('councilMediaUploads/'+session.id),options=f.sessions.get(row.storagePath);
  assert.equal(options.metadata.contentLength,file.size);assert.equal(options.preconditionOpts.ifGenerationMatch,0);
  assert.equal(row.tokenHash,sha(session.token));assert.equal(f.records.has('councilImages/'+file.hash),false);
  assert.throws(()=>media.descriptor({...file,size:file.size+1}),/5 TiB/);
  assert.throws(()=>media.descriptor({...file,contentType:'text/html',name:'page.html'}),/image or video/);
});

test('full original video is verified over several generation-pinned ranges before metadata can be quoted',async()=>{
  const f=fakeFirebase(),bytes=mp4(13*1024*1024+73),session=await begin(f,bytes);
  assert.equal((await media.verifyUpload({...f,id:session.id,token:session.token})).status,'uploading','Incomplete uploads never become ready');
  await assert.rejects(media.readyAttachments(f.db,[{hash:sha(bytes)}],f.storage),/finished uploading/);
  f.complete(session.id,bytes);
  let result;
  for(let i=0;i<6;i++){
    result=await media.verifyUpload({...f,id:session.id,token:session.token,chunkBytes:3*1024*1024});
    if(result.status==='ready')break;
    assert.equal(result.status,'verifying');assert.equal(f.records.has('councilImages/'+sha(bytes)),false);
  }
  assert.equal(result.status,'ready');assert.equal(result.loaded,bytes.length);assert.equal(result.media.hash,sha(bytes));
  assert.equal(result.media.kind,'video');assert.equal(result.media.size,bytes.length);assert(f.reads.length>=5);
  for(let i=1;i<f.reads.length;i++)assert.equal(f.reads[i].start,f.reads[i-1].end+1);
  const attachment=(await media.readyAttachments(f.db,[{hash:sha(bytes),caption:'Full reference video'}],f.storage))[0];
  assert.equal(attachment.contentType,'video/mp4');assert.equal(attachment.size,bytes.length);
  assert.equal(attachment.caption,'Full reference video');
  const status=await media.uploadStatus({...f,id:session.id,token:session.token});assert.equal(status.hashState,undefined);assert.equal(status.tokenHash,undefined);
});

test('a forged hash or modified upload never authorizes a proposal',async()=>{
  const f=fakeFirebase(),original=mp4(100000),session=await begin(f,original),changed=Buffer.from(original);changed[90000]^=1;
  f.complete(session.id,changed);
  const result=await media.verifyUpload({...f,id:session.id,token:session.token});
  assert.equal(result.status,'failed');assert.match(result.error,/checksum/);assert.equal(f.records.has('councilImages/'+sha(original)),false);
  await assert.rejects(media.readyAttachments(f.db,[{hash:sha(original)}],f.storage),/finished uploading/);
  await assert.rejects(media.uploadStatus({...f,id:session.id,token:'wrong'}),/not authorized/);
});

test('verification resumes from the committed hash state and concurrent calls cannot duplicate ranges',async()=>{
  const f=fakeFirebase(),bytes=mp4(1500000),session=await begin(f,bytes);f.complete(session.id,bytes);
  const args={...f,id:session.id,token:session.token,chunkBytes:500000};
  const first=await media.verifyUpload(args);assert.equal(first.loaded,500000);
  const saved=structuredClone(f.records.get('councilMediaUploads/'+session.id));assert(saved.hashState);
  const statuses=await Promise.all([media.verifyUpload(args),media.verifyUpload(args)]);
  assert(statuses.every(s=>s.status==='verifying'||s.status==='ready'));
  let status=await media.uploadStatus(args);while(status.status!=='ready')status=await media.verifyUpload(args);
  assert.equal(status.media.hash,sha(bytes));
  assert.deepEqual(f.reads.map(r=>r.start),[0,500000,1000000]);
});

test('re-uploading missing storage bytes repairs the same hash only after complete verification',async()=>{
  const f=fakeFirebase(),bytes=mp4(3000),initial=await begin(f,bytes);f.complete(initial.id,bytes);
  const ready=await media.verifyUpload({...f,id:initial.id,token:initial.token});assert.equal(ready.status,'ready');
  const first=f.records.get('councilImages/'+sha(bytes));f.objects.delete(first.storagePath);
  const recovery=await begin(f,bytes,{name:'different filename.mp4'});assert.equal(recovery.status,'uploading');
  assert.equal(f.records.get('councilImages/'+sha(bytes)).storagePath,first.storagePath,'Unverified replacement cannot replace approved content');
  f.complete(recovery.id,bytes);const repaired=await media.verifyUpload({...f,id:recovery.id,token:recovery.token});
  assert.equal(repaired.status,'ready');assert.equal(repaired.media.hash,sha(bytes));assert.equal(repaired.media.name,first.name);
  assert.notEqual(f.records.get('councilImages/'+sha(bytes)).generation,first.generation);
});

test('high resolution original image headers are accepted without decoding or a 20 megapixel application cap',()=>{
  const bytes=Buffer.alloc(33);Buffer.from('89504e470d0a1a0a','hex').copy(bytes);bytes.write('IHDR',12);bytes.writeUInt32BE(15000,16);bytes.writeUInt32BE(10000,20);
  const info=media.inspectPrefix(bytes,'image/png');assert.deepEqual(info,{kind:'image',width:15000,height:10000});
  assert.throws(()=>media.inspectPrefix(Buffer.from('<html>not an image</html>'),'image/png'),/HTML/);
  assert.throws(()=>media.inspectPrefix(mp4(100),'image/png'),/do not match/);
});

test('canonical media manifests retain video identity while old image manifests remain byte-compatible',()=>{
  const base={title:'A visual Council proposal',body:'Please implement the changes demonstrated in the attached reference.',actions:[]};
  const old=normalizeProposal({...base,images:[{hash:'a'.repeat(64),caption:'Old image'}]});assert.deepEqual(old.images,[{hash:'a'.repeat(64),caption:'Old image'}]);
  const updated=normalizeProposal({...base,images:[{hash:'b'.repeat(64),caption:'Video reference',kind:'video',contentType:'video/mp4',size:2*1024**3,name:'reference.mp4'}]});
  assert.equal(updated.images[0].size,2*1024**3);assert.equal(updated.images[0].kind,'video');
  assert.throws(()=>normalizeProposal({...base,images:[{hash:'b'.repeat(64),kind:'video',contentType:'image/png',size:100,name:'wrong'}]}),/metadata/);
});

test('browser file hashing uses bounded slices, reports progress and matches server SHA-256',async()=>{
  const bytes=mp4(17*1024*1024+17),slices=[],blob=new Blob([bytes],{type:'video/mp4'});
  const file={size:blob.size,slice:(start,end)=>{slices.push([start,end]);return blob.slice(start,end);}},phases=[];
  const digest=await hashMediaFile(file,{onProgress:event=>phases.push(event)});
  assert.equal(digest,sha(bytes));assert(slices.length>=3);assert(slices.every(([start,end])=>end-start<=8*1024*1024));
  assert.equal(phases.at(-1).loaded,bytes.length);
  const controller=new AbortController();controller.abort();await assert.rejects(hashMediaFile(file,{signal:controller.signal}),{name:'AbortError'});
});

test('resumable status handling resumes exact bytes and refuses arbitrary upload destinations',()=>{
  assert.equal(uploadedOffset({status:308,range:'bytes=0-8388607'},20000000),8388608);
  assert.equal(uploadedOffset({status:201},20000000),20000000);
  assert.throws(()=>uploadedOffset({status:410},20),/expired/);
  assert.throws(()=>trustedUploadUrl('https://attacker.example/upload/?secret=session'),/unauthorized/);
  assert.match(trustedUploadUrl('https://storage.googleapis.com/upload/storage/v1/b/bucket/o?upload_id=abc'),/storage\.googleapis/);
});

test('browser upload resolves only after the server finishes verification, never when the last PUT succeeds',async()=>{
  const blob=new Blob([mp4(10*1024*1024)],{type:'video/mp4'}),file={name:'reference.mp4',type:blob.type,size:blob.size,lastModified:123,
    slice:(start,end)=>blob.slice(start,end)};
  const phases=[],ranges=[];let loaded=0,verifyCalls=0,initDescriptor,resolved=false;
  const xhrFactory=()=>({upload:{},headers:{},status:0,open(){},setRequestHeader(name,value){this.headers[name]=value;},getResponseHeader(){return loaded?`bytes=0-${loaded-1}`:null;},abort(){this.onabort?.();},
    send(body){ranges.push(this.headers['Content-Range']);if(body)loaded+=body.size;this.status=loaded===file.size?200:308;
      this.upload.onprogress?.({loaded:body?.size||0});setTimeout(()=>this.onload(),0);}});
  const fetchImpl=async(_url,options)=>{const request=JSON.parse(options.body);
    if(request.action==='init'){initDescriptor=request.file;return {ok:true,json:async()=>({id:'a'.repeat(32),token:'b'.repeat(64),status:'uploading',resumableUrl:'https://storage.googleapis.com/upload/storage/v1/b/test/o?upload_id=fake',expiresAt:Date.now()+100000})};}
    assert.equal(request.action,'verify');assert.equal(loaded,file.size);assert.equal(resolved,false);
    verifyCalls++;return {ok:true,json:async()=>verifyCalls===1?{status:'verifying',loaded:5000000,total:file.size}:
      {status:'ready',loaded:file.size,total:file.size,media:{hash:initDescriptor.hash,kind:'video',contentType:'video/mp4',size:file.size,name:file.name,url:'/api/council/image?hash='+initDescriptor.hash}}};
  };
  const result=await uploadCouncilMedia(file,{sender:'wallet-end-to-end',signProof:async(kind,digest)=>{assert.equal(kind,'council-media-upload');assert.match(digest,/^[a-f0-9]{64}$/);return 'signed-zero-payment-proof';},
    fetchImpl,xhrFactory,onProgress:event=>phases.push(event.phase)}).then(value=>{resolved=true;return value;});
  assert.equal(result.hash,sha(mp4(file.size)));assert.equal(verifyCalls,2);assert(phases.includes('verifying'));assert.equal(phases.at(-1),'ready');
  assert.deepEqual(ranges,[`bytes */${file.size}`,`bytes 0-8388607/${file.size}`,`bytes 8388608-${file.size-1}/${file.size}`]);
});

test('transient saved-session failures retain uploaded bytes and retry the same capability without a new proof',async()=>{
  const bytes=mp4(500),blob=new Blob([bytes],{type:'video/mp4'}),file={name:'recover-existing.mp4',type:blob.type,size:blob.size,lastModified:456,slice:(start,end)=>blob.slice(start,end)};
  const sender='wallet-recover-existing',hash=sha(bytes),key='council-media:'+sha(JSON.stringify({sender,name:file.name,size:file.size,type:file.type,lastModified:file.lastModified,hash}));
  const saved={id:'c'.repeat(32),token:'d'.repeat(64),status:'verifying',loaded:400,expiresAt:Date.now()+100000},values=new Map([[key,JSON.stringify(saved)]]),oldStorage=globalThis.localStorage;
  globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  let proofs=0,inits=0,statusCalls=0,mode='network';
  const mediaResult={hash,kind:'video',contentType:file.type,size:file.size,name:file.name};
  const options={sender,signProof:async()=>{proofs++;throw Error('An existing upload must not request another signature.');},fetchImpl:async(_url,options)=>{
    const request=JSON.parse(options.body);if(request.action==='init'){inits++;throw Error('Must not initialize a replacement upload.');}
    assert.equal(request.id,saved.id);assert.equal(request.token,saved.token);
    if(request.action==='status'){
      statusCalls++;if(mode==='network')throw TypeError('Failed to fetch');
      if(mode==='server')return {ok:false,status:503,json:async()=>({error:'Storage temporarily unavailable.'})};
      if(mode==='unexpected400')return {ok:false,status:400,json:async()=>({error:'Unexpected datastore failure.'})};
      return {ok:true,json:async()=>({...saved,status:'verifying'})};
    }
    assert.equal(request.action,'verify');return {ok:true,json:async()=>({status:'ready',loaded:file.size,media:mediaResult})};
  }};
  try{
    for(const failure of ['network','server','unexpected400']){
      mode=failure;await assert.rejects(uploadCouncilMedia(file,options),/Failed to fetch|temporarily unavailable|Unexpected datastore/);
      assert.equal(values.get(key),JSON.stringify(saved),'A transient status failure preserves the saved capability');
      assert.equal(proofs,0);assert.equal(inits,0);
    }
    mode='ready';assert.deepEqual(await uploadCouncilMedia(file,options),mediaResult);assert.equal(statusCalls,4);
    assert.equal(values.has(key),false,'Only successful completion clears the capability');assert.equal(proofs,0);assert.equal(inits,0);
  }finally{if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;}
});

test('explicitly expired server sessions are replaced with a newly authorized upload',async()=>{
  const bytes=mp4(501),blob=new Blob([bytes],{type:'video/mp4'}),file={name:'expired-session.mp4',type:blob.type,size:blob.size,lastModified:457,slice:(start,end)=>blob.slice(start,end)};
  const sender='wallet-explicit-expiry',hash=sha(bytes),key='council-media:'+sha(JSON.stringify({sender,name:file.name,size:file.size,type:file.type,lastModified:file.lastModified,hash}));
  const saved={id:'e'.repeat(32),token:'f'.repeat(64),status:'uploading',expiresAt:Date.now()+100000},values=new Map([[key,JSON.stringify(saved)]]),oldStorage=globalThis.localStorage;
  globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  let proofs=0,inits=0;
  try{
    const result=await uploadCouncilMedia(file,{sender,signProof:async()=>{proofs++;return 'new-ownership-proof';},fetchImpl:async(_url,options)=>{
      const request=JSON.parse(options.body);
      if(request.action==='status')return {ok:false,status:400,json:async()=>({code:'UPLOAD_SESSION_EXPIRED',error:'This upload session expired. Retry the attachment.'})};
      assert.equal(request.action,'init');inits++;assert.equal(request.proof,'new-ownership-proof');
      return {ok:true,json:async()=>({status:'ready',media:{hash,size:file.size}})};
    }});
    assert.equal(result.hash,hash);assert.equal(proofs,1);assert.equal(inits,1);assert.equal(values.has(key),false);
  }finally{if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;}
});

test('local AI attachment verification streams large originals without an arrayBuffer allocation',async()=>{
  const bytes=mp4(19*1024*1024+17);let arrayBufferCalled=false;
  const result=await verifyAttachment('https://example.test/reference.mp4',{hash:sha(bytes),size:bytes.length,
    fetchImpl:async()=>({ok:true,status:200,headers:new Headers(),arrayBuffer:()=>{arrayBufferCalled=true;throw Error('Do not buffer the complete file');},
      body:(async function*(){for(let start=0;start<bytes.length;start+=131072)yield bytes.subarray(start,start+131072);})()})});
  assert.equal(result.bytes,bytes.length);assert.equal(arrayBufferCalled,false);
});

test('local AI verification resumes a broken video stream at its exact hashed offset',async()=>{
  const bytes=mp4(10000),ranges=[];
  const result=await verifyAttachment('https://example.test/video.mp4',{hash:sha(bytes),size:bytes.length,fetchImpl:async(_url,options)=>{
    ranges.push(options.headers.Range||null);
    if(ranges.length===1)return {ok:true,status:200,headers:new Headers(),body:(async function*(){yield bytes.subarray(0,4000);throw Error('connection lost');})()};
    return {ok:true,status:206,headers:new Headers({'Content-Range':'bytes 4000-9999/10000'}),body:(async function*(){yield bytes.subarray(4000);})()};
  }});
  assert.deepEqual(ranges,[null,'bytes=4000-']);assert.equal(result.verified,true);
  await assert.rejects(verifyAttachment('https://example.test/video.mp4',{hash:'a'.repeat(64),size:bytes.length,maxRetries:0,
    fetchImpl:async()=>({ok:true,status:200,headers:new Headers(),body:(async function*(){yield bytes;})()})}),/checksum/);
});

test('attachment integrity has an idle timeout rather than an overall video-size time limit',async()=>{
  const bytes=mp4(100),result=await verifyAttachment('https://example.test/slow.mp4',{hash:sha(bytes),size:bytes.length,idleMs:50,
    fetchImpl:async()=>({ok:true,status:200,headers:new Headers(),body:(async function*(){for(let start=0;start<100;start+=10){await new Promise(r=>setTimeout(r,10));yield bytes.subarray(start,start+10);}})()})});
  assert.equal(result.verified,true);
});
