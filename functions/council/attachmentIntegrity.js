const crypto=require('node:crypto');

// The approved SHA-256 refers to the original bytes, even for multi-gigabyte
// videos. Keep memory constant and resume from received bytes after a dropout.
async function verifyAttachment(url,{hash,size,fetchImpl=globalThis.fetch,idleMs=60000,maxRetries=3}={}){
  if(!/^[a-f0-9]{64}$/.test(hash||''))throw Error('Invalid approved attachment checksum.');
  const expected=size===undefined?null:Number(size);
  if(expected!==null&&(!Number.isSafeInteger(expected)||expected<1))throw Error('Invalid approved attachment size.');
  let hasher=crypto.createHash('sha256'),offset=0,retries=0;
  while(true){
    const controller=new AbortController();let timer;
    const touch=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(),idleMs);};
    touch();
    try{
      const response=await fetchImpl(url,{signal:controller.signal,headers:{'Accept-Encoding':'identity',...(offset?{Range:`bytes=${offset}-`}:{})}});
      if(!response.ok||!response.body)throw Error('An approved attachment is unavailable.');
      if(offset&&response.status!==206){
        // Legacy endpoints may not support ranges. Restart its hash rather than
        // appending duplicate bytes to an earlier partial response.
        hasher=crypto.createHash('sha256');offset=0;
      }
      if(response.status===206){const range=String(response.headers.get('content-range')||'').match(/^bytes (\d+)-(\d+)\/(\d+)$/i);
        if(!range||Number(range[1])!==offset)throw Error('Approved attachment range did not match the requested bytes.');
      }
      touch();
      for await(const value of response.body){
        const bytes=Buffer.from(value);hasher.update(bytes);offset+=bytes.length;touch();
        if(expected!==null&&offset>expected)throw Error('Approved attachment size changed.');
      }
      if(expected!==null&&offset!==expected)throw Error('Approved attachment download was incomplete.');
      if(hasher.digest('hex')!==hash)throw Error('Approved attachment checksum failed.');
      return {verified:true,hash,bytes:offset};
    }catch(error){
      if(/checksum|size changed|range did not match/.test(error.message))throw error;
      if(++retries>maxRetries)throw Error(error.name==='AbortError'?'Approved attachment download stopped making progress.':error.message);
    }finally{clearTimeout(timer);controller.abort();}
  }
}
module.exports={verifyAttachment};
