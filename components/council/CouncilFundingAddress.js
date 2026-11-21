import React,{useMemo,useRef,useState} from 'react';
import sdk from 'algosdk';
import qrcode from 'qrcode-generator';
import {Icon} from './CouncilVisuals';
import styles from './CouncilFundingAddress.module.css';

function matrixFor(value){
  const code=qrcode(0,'M');code.addData(value,'Byte');code.make();
  const modules=code.getModuleCount(),quiet=4;
  let path='';
  for(let row=0;row<modules;row++)for(let column=0;column<modules;column++)if(code.isDark(row,column))path+=`M${column+quiet} ${row+quiet}h1v1h-1z`;
  return {path,size:modules+quiet*2};
}

function FundingQR({matrix,address,large=false}){
  return <svg className={large?styles.largeQR:styles.qr} viewBox={`0 0 ${matrix.size} ${matrix.size}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`Algorand funding QR code for Council treasury ${address}`} shapeRendering="crispEdges" data-council-funding-qr={large?'large':'small'}>
    <rect width={matrix.size} height={matrix.size} fill="#fff"/>
    <path d={matrix.path} fill="#070b09"/>
  </svg>;
}

export default function CouncilFundingAddress({address,network='mainnet'}){
  const uri=address&&sdk.isValidAddress(address)?`algorand://${address}`:'';
  const matrix=useMemo(()=>uri?matrixFor(uri):null,[uri]),dialog=useRef(null);
  const [copied,setCopied]=useState(false),[copyError,setCopyError]=useState(false);
  if(!matrix)return null;
  const networkName=network==='testnet'?'Algorand testnet':'Algorand mainnet';
  async function copy(){
    try{await navigator.clipboard.writeText(address);setCopied(true);setCopyError(false);setTimeout(()=>setCopied(false),2200);}
    catch{setCopyError(true);}
  }
  function close(){dialog.current?.close();}
  return <>
    <section className={styles.funding} aria-label="Fund the Council treasury">
      <div className={styles.details}>
        <strong className={styles.title}>Fund the Council</strong>
        <span className={styles.network}><i/>{networkName}</span>
        <code className={styles.address} title={address}>{address}</code>
        <div className={styles.actions}>
          <button type="button" onClick={copy} className={styles.copy} aria-label={copied?'Treasury address copied':'Copy treasury address'}><Icon name={copied?'check':'copy'} size={14}/>{copied?'Copied':'Copy address'}</button>
          <a href={uri} className={styles.wallet}>Open wallet<Icon name="external" size={13}/></a>
        </div>
        <span className={styles.help}>Scan with your Algorand wallet to add ALGO.</span>
        <span className={styles.status} role="status">{copied?'Treasury address copied.':copyError?'Select the address above to copy it.':''}</span>
      </div>
      <button type="button" className={styles.qrButton} onClick={()=>dialog.current?.showModal()} aria-label="Enlarge treasury funding QR code" aria-haspopup="dialog">
        <FundingQR matrix={matrix} address={address}/><span>Enlarge QR</span>
      </button>
    </section>
    <dialog ref={dialog} className={styles.dialog} aria-label="Council treasury funding QR code" onClick={event=>{
      if(event.target!==dialog.current)return;const box=dialog.current.getBoundingClientRect();
      if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close();
    }}>
      <div className={styles.dialogTop}><span>Fund the Council</span><button type="button" className={styles.close} onClick={close} aria-label="Close funding QR code"><Icon name="close" size={20}/></button></div>
      <span className={styles.dialogNetwork}>{networkName}</span>
      <FundingQR matrix={matrix} address={address} large/>
      <code className={styles.dialogAddress}>{address}</code>
      <span className={styles.dialogHelp}>Scan in your Algorand wallet, then choose the amount you want to send.</span>
      <button type="button" className={styles.dialogCopy} onClick={copy}><Icon name={copied?'check':'copy'} size={16}/>{copied?'Address copied':'Copy treasury address'}</button>
    </dialog>
  </>;
}
