import React,{useEffect,useRef,useState} from 'react';
import {uploadCouncilMedia} from '../../lib/councilMediaUploads';
import {descriptor} from '../../functions/council/mediaDescriptor';
import {Icon,isVideo} from './CouncilVisuals';

const labels={queued:'Waiting to upload',hashing:'Preparing file',authorizing:'Approve upload in your wallet',uploading:'Uploading',verifying:'Verifying upload',ready:'Uploaded and verified',error:'Upload needs attention',cancelled:'Upload paused'};
const sizeLabel=size=>{
  if(!size)return '0 B';const units=['B','KB','MB','GB','TB'],index=Math.min(Math.floor(Math.log(size)/Math.log(1024)),4);
  return (size/1024**index).toLocaleString(undefined,{maximumFractionDigits:index>1?2:0})+' '+units[index];
};
export default function AttachmentUploader({items,onChange,sender,canUpload,signProof,maxFiles=5,locked=false,onConnect}){
  const input=useRef(null),current=useRef(items),controllers=useRef(new Map()),mounted=useRef(true),[dragging,setDragging]=useState(false),[error,setError]=useState('');
  current.current=items;
  const update=fn=>{if(!mounted.current)return;const next=fn(current.current);current.current=next;onChange(next);};
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;for(const controller of controllers.current.values())controller.abort();for(const item of current.current)if(item.preview)URL.revokeObjectURL(item.preview);};},[]);
  const previousSender=useRef(sender);
  // Clear the previous wallet's transfers before starting this wallet's queue.
  // Otherwise connecting with selected files could immediately pause them.
  useEffect(()=>{if(previousSender.current!==sender){for(const controller of controllers.current.values())controller.abort();previousSender.current=sender;}},[sender]);
  useEffect(()=>{
    if(!canUpload||locked)return;
    for(const item of current.current)if(item.status==='queued'&&!controllers.current.has(item.id))start(item);
  },[canUpload,sender,items.length,locked]);
  function addFiles(files){
    if(locked)return;setError('');
    const chosen=Array.from(files||[]);
    if(current.current.length+chosen.length>maxFiles){setError('Choose up to '+maxFiles+' attachments for one proposal.');return;}
    let descriptions;try{descriptions=chosen.map(file=>descriptor({hash:'0'.repeat(64),name:file.name,size:file.size,contentType:file.type}));}catch(failure){setError(failure.message);return;}
    const queued=chosen.map((file,index)=>({id:globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random(),file,name:descriptions[index].name,size:file.size,kind:descriptions[index].contentType.startsWith('video/')?'video':'image',contentType:descriptions[index].contentType,caption:'',status:'queued',progress:0,preview:URL.createObjectURL(file)}));
    update(value=>[...value,...queued]);
    if(canUpload)for(const item of queued)start(item);
  }
  async function start(item){
    if(!sender||!canUpload||controllers.current.has(item.id)||locked)return;
    const controller=new AbortController();controllers.current.set(item.id,controller);
    update(value=>value.map(existing=>existing.id===item.id?{...existing,status:'hashing',error:'',progress:0}:existing));
    try{
      const media=await uploadCouncilMedia(item.file,{sender,signProof,signal:controller.signal,onProgress:progress=>update(value=>value.map(existing=>existing.id===item.id?{...existing,status:progress.phase,progress:progress.progress||0}:existing))});
      if(controller.signal.aborted)throw new DOMException('Upload paused','AbortError');
      update(value=>value.map(existing=>existing.id===item.id?{...existing,...media,caption:existing.caption,status:'ready',progress:1}:existing));
    }catch(uploadError){update(value=>value.map(existing=>existing.id===item.id?{...existing,status:controller.signal.aborted?'cancelled':'error',error:controller.signal.aborted?'You can resume this upload.':uploadError.message}:existing));}
    finally{controllers.current.delete(item.id);}
  }
  function remove(item){controllers.current.get(item.id)?.abort();controllers.current.delete(item.id);if(item.preview)URL.revokeObjectURL(item.preview);update(value=>value.filter(existing=>existing.id!==item.id));}
  const pending=items.some(item=>item.status!=='ready');
  return <div className="cvUploader">
    <div className={'cvDropzone '+(dragging?'isDragging':'')} onDragOver={event=>{event.preventDefault();if(!locked)setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={event=>{event.preventDefault();setDragging(false);addFiles(event.dataTransfer.files);}}>
      <span className="cvUploadGlyph"><Icon name="upload" size={25}/></span>
      <div><strong>Add images or videos</strong><p>Drop files here, or choose from your device.</p></div>
      <button type="button" className="cvButton cvSecondary" disabled={locked||items.length>=maxFiles} onClick={()=>input.current?.click()}>Choose files<Icon name="plus" size={17}/></button>
      <input ref={input} className="cvSrOnly" tabIndex={-1} type="file" aria-label="Attach images or videos" accept="image/*,video/*" multiple disabled={locked} onChange={event=>{addFiles(event.target.files);event.target.value='';}}/>
      <p className="cvUploadHint">Original quality. Large files upload directly and can be resumed.</p>
    </div>
    {error&&<p className="cvInlineError" role="alert">{error}</p>}
    {items.length>0&&<div className="cvUploadList">{items.map((item,index)=>{
      const active=['hashing','authorizing','uploading','verifying'].includes(item.status);
      return <article className={'cvUploadItem '+(item.status==='ready'?'isReady':'')} key={item.id}>
        <div className="cvUploadPreview">{isVideo(item)?<video src={item.preview||item.url} preload="metadata" muted playsInline/>:<img src={item.preview||item.url} alt={item.name}/>}<span><Icon name={isVideo(item)?'video':'image'} size={13}/></span></div>
        <div className="cvUploadInfo"><div className="cvUploadName"><strong title={item.name}>{item.name}</strong><button type="button" className="cvIconButton" aria-label={'Remove '+item.name} disabled={locked} onClick={()=>remove(item)}><Icon name="close" size={17}/></button></div>
          <p className="cvUploadMeta">{sizeLabel(item.size)}<span>·</span><span className={item.status==='ready'?'cvSuccessText':''}>{item.status==='ready'&&<Icon name="check" size={13}/>} {labels[item.status]||'Uploading'}</span></p>
          {active&&<div className="cvUploadProgress" role="progressbar" aria-label={item.name+' upload progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.progress*100)}><span style={{width:Math.max(3,item.progress*100)+'%'}}/></div>}
          {item.error&&<p className="cvInlineError">{item.error}</p>}
          <label className="cvCaptionLabel"><span className="cvSrOnly">Attachment {index+1} caption</span><input maxLength={500} value={item.caption} disabled={locked} placeholder="Add a caption (optional)" onChange={event=>update(value=>value.map(existing=>existing.id===item.id?{...existing,caption:event.target.value}:existing))}/></label>
          {active&&<button type="button" className="cvTextButton" onClick={()=>controllers.current.get(item.id)?.abort()}>Pause upload</button>}
          {['error','cancelled','queued'].includes(item.status)&&canUpload&&<button type="button" className="cvTextButton" disabled={locked} onClick={()=>start(item)}><Icon name="refresh" size={13}/>{item.status==='queued'?'Upload file':'Resume upload'}</button>}
        </div>
      </article>;
    })}</div>}
    {pending&&!canUpload&&<div className="cvUploadConnect"><Icon name="wallet" size={19}/><p>Your files are selected. Connect your wallet to finish uploading them.</p><button type="button" className="cvTextButton" onClick={onConnect}>Connect wallet<Icon name="arrow" size={15}/></button></div>}
    {pending&&<p className="cvUploadGate"><Icon name="shield" size={15}/>Your proposal stays here until every attachment is uploaded and verified.</p>}
  </div>;
}
