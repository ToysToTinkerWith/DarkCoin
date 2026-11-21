const {descriptor,MAX_MEDIA_BYTES}=require('../functions/council/mediaDescriptor');
const PART_BYTES=8*1024*1024;
const sessions=new Map();

function abortError(){const error=Error('Attachment upload cancelled.');error.name='AbortError';return error;}
function checkAbort(signal){if(signal?.aborted)throw abortError();}
function progress(onProgress,phase,loaded,total){onProgress?.({phase,loaded,total,progress:total?Math.min(1,loaded/total):0});}
async function smallHash(value){return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,'0')).join('');}
function readSession(key){try{return JSON.parse(globalThis.localStorage?.getItem(key)||'null')||sessions.get(key);}catch{return sessions.get(key);}}
function saveSession(key,value){sessions.set(key,value);try{globalThis.localStorage?.setItem(key,JSON.stringify(value));}catch{/* Private browsing may not persist a session. */}}
function clearSession(key){sessions.delete(key);try{globalThis.localStorage?.removeItem(key);}catch{}}
function delay(ms,signal){return new Promise((resolve,reject)=>{checkAbort(signal);const timer=setTimeout(done,ms);function done(){signal?.removeEventListener('abort',cancel);resolve();}function cancel(){clearTimeout(timer);signal?.removeEventListener('abort',cancel);reject(abortError());}signal?.addEventListener('abort',cancel,{once:true});});}

async function hashMediaFile(file,{signal,onProgress}={}){
  if(!Number.isSafeInteger(file?.size)||file.size<1)throw Error('Choose a nonempty image or video.');
  if(file.size>MAX_MEDIA_BYTES)throw Error('Firebase Storage supports individual files up to 5 TiB.');
  const {createSHA256}=await import('hash-wasm'),hasher=await createSHA256();hasher.init();
  for(let start=0;start<file.size;start+=PART_BYTES){
    checkAbort(signal);const bytes=new Uint8Array(await file.slice(start,Math.min(start+PART_BYTES,file.size)).arrayBuffer());
    hasher.update(bytes);progress(onProgress,'hashing',Math.min(start+bytes.length,file.size),file.size);
    await delay(0,signal);
  }
  checkAbort(signal);return hasher.digest('hex');
}

function xhrRequest(url,{headers={},body=null,signal,onProgress,xhrFactory=()=>new XMLHttpRequest()}={}){
  return new Promise((resolve,reject)=>{
    checkAbort(signal);const xhr=xhrFactory();xhr.open('PUT',url,true);
    for(const [name,value]of Object.entries(headers))xhr.setRequestHeader(name,value);
    const abort=()=>xhr.abort();signal?.addEventListener('abort',abort,{once:true});
    const clean=()=>signal?.removeEventListener('abort',abort);
    xhr.upload.onprogress=event=>onProgress?.(event.loaded);
    xhr.onload=()=>{clean();resolve({status:xhr.status,range:xhr.getResponseHeader('Range')});};
    xhr.onerror=()=>{clean();reject(Error('The attachment connection was interrupted. Retry to resume the upload.'));};
    xhr.onabort=()=>{clean();reject(abortError());};
    xhr.ontimeout=()=>{clean();reject(Error('The attachment connection timed out. Retry to resume.'));};
    xhr.timeout=180000; // Per 8 MiB request; no overall file/upload timeout.
    xhr.send(body);
  });
}
function uploadedOffset(response,total){
  if(response.status===200||response.status===201)return total;
  if(response.status===308){const match=String(response.range||'').match(/^bytes=0-(\d+)$/i);return match?Number(match[1])+1:0;}
  if(response.status===404||response.status===410){const error=Error('This resumable upload expired. Retry the file to start a new session.');error.expired=true;throw error;}
  if(response.status>=500||response.status===408||response.status===429)throw Error('Firebase Storage is temporarily unavailable. Retry to resume the attachment.');
  throw Error(`Firebase Storage could not accept this attachment (${response.status}).`);
}
function trustedUploadUrl(value){
  let url;try{url=new URL(value);}catch{throw Error('The upload service returned an invalid session.');}
  if(url.protocol!=='https:'||url.hostname!=='storage.googleapis.com'||!url.pathname.startsWith('/upload/'))throw Error('The upload service returned an unauthorized destination.');
  return url.toString();
}

async function uploadCouncilMedia(file,{sender,signProof,onProgress,signal,fetchImpl=globalThis.fetch,xhrFactory}={}){
  if(!sender||typeof signProof!=='function')throw Error('Connect a wallet to attach images or videos.');
  const hash=await hashMediaFile(file,{signal,onProgress}),input=descriptor({hash,size:file.size,contentType:file.type,name:file.name});
  const key='council-media:'+await smallHash(JSON.stringify({sender,name:input.name,size:input.size,type:input.contentType,lastModified:file.lastModified||0,hash}));
  async function api(body){
    checkAbort(signal);const response=await fetchImpl('/api/council/media-upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});
    let result;try{result=await response.json();}catch{throw Error('The attachment service returned an invalid response. Please retry.');}
    if(!response.ok)throw Object.assign(Error(result.error||'Attachment upload failed.'),{code:result.code,status:response.status});return result;
  }
  let session=readSession(key);
  if(session&&session.expiresAt<Date.now()){clearSession(key);session=null;}
  if(session){
    try{const latest=await api({action:'status',id:session.id,token:session.token});session={...session,...latest};}
    catch(error){
      // Network failures and service errors must retain the capability and all
      // previously uploaded bytes. Only an explicitly terminal session can reset.
      if(!['UPLOAD_SESSION_INVALID','UPLOAD_SESSION_EXPIRED','UPLOAD_SESSION_UNAUTHORIZED'].includes(error.code))throw error;
      clearSession(key);session=null;
    }
  }
  if(!session){
    progress(onProgress,'authorizing',0,1);
    const proof=await signProof('council-media-upload',await smallHash(JSON.stringify(input)));checkAbort(signal);
    session=await api({action:'init',sender,proof,file:input});
    if(session.status==='ready'){progress(onProgress,'ready',file.size,file.size);return session.media;}
    saveSession(key,session);
  }
  if(session.status==='failed'){clearSession(key);throw Error(session.error||'Attachment verification failed. Retry the original file.');}
  if(session.status==='uploading'){
    const url=trustedUploadUrl(session.resumableUrl);
    let offset=0,attempts=0;
    while(true){
      checkAbort(signal);
      try{
        offset=uploadedOffset(await xhrRequest(url,{headers:{'Content-Range':`bytes */${file.size}`},signal,xhrFactory}),file.size);break;
      }catch(error){if(error.expired){clearSession(key);throw error;}if(error.name==='AbortError'||++attempts>3)throw error;await delay(500*2**attempts,signal);}
    }
    while(offset<file.size){
      checkAbort(signal);const end=Math.min(offset+PART_BYTES,file.size),start=offset;
      try{
        const response=await xhrRequest(url,{headers:{'Content-Type':input.contentType,'Content-Range':`bytes ${start}-${end-1}/${file.size}`},
          body:file.slice(start,end),signal,xhrFactory,onProgress:loaded=>progress(onProgress,'uploading',Math.min(start+loaded,file.size),file.size)});
        const next=uploadedOffset(response,file.size);
        if(next<=offset)throw Error('Upload progress could not be read. Retry to resume; the storage CORS configuration may need updating.');
        offset=next;attempts=0;progress(onProgress,'uploading',offset,file.size);
      }catch(error){
        if(error.expired){clearSession(key);throw error;}if(error.name==='AbortError'||++attempts>3)throw error;
        await delay(500*2**attempts,signal);
        offset=uploadedOffset(await xhrRequest(url,{headers:{'Content-Range':`bytes */${file.size}`},signal,xhrFactory}),file.size);
      }
    }
  }
  progress(onProgress,'verifying',Number(session.loaded||0),file.size);
  let verificationAttempts=0;
  while(true){
    checkAbort(signal);
    try{
      const result=await api({action:'verify',id:session.id,token:session.token});verificationAttempts=0;
      session={...session,...result};saveSession(key,session);
      if(result.status==='ready'){clearSession(key);progress(onProgress,'ready',file.size,file.size);return result.media;}
      if(result.status==='failed'){clearSession(key);throw Error(result.error||'The uploaded file did not match the original. Please retry.');}
      progress(onProgress,result.status==='uploading'?'uploading':'verifying',Number(result.loaded||0),file.size);
      await delay(result.status==='verifying'?100:750,signal);
    }catch(error){
      if(error.name==='AbortError'||session.status==='failed'||++verificationAttempts>3)throw error;
      await delay(500*2**verificationAttempts,signal);
    }
  }
}
module.exports={uploadCouncilMedia,hashMediaFile,PART_BYTES,uploadedOffset,trustedUploadUrl};
