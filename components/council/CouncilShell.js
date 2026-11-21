import React,{useEffect,useRef,useState} from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useNetwork,useWallet} from '@txnlab/use-wallet-react';
import sdk from 'algosdk';
import {buildCouncilGroup,sendCouncilGroup} from '../../lib/councilTransactions';
import {CouncilContext,request,short} from './CouncilContext';
import {Icon,TokenAmount} from './CouncilVisuals';
import {ReviewInstructions} from './CouncilProposal';
import CouncilStyles from './CouncilStyles';

const links=[['/council/dao','Proposals','vote'],['/council/treasury','Treasury','treasury']];

function Dialog({label,onClose,children,wide=false}){
  const ref=useRef(null);
  useEffect(()=>{
    const before=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    ref.current?.querySelector('button')?.focus();
    function keydown(event){
      if(event.key==='Escape'){event.preventDefault();onClose();}
      if(event.key!=='Tab')return;
      const elements=Array.from(ref.current?.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')||[]);
      if(!elements.length)return;const first=elements[0],last=elements.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
    document.addEventListener('keydown',keydown);
    return()=>{document.removeEventListener('keydown',keydown);document.body.style.overflow=overflow;before?.focus?.();};
  },[]);
  return <div className="cvModalBackdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}><div ref={ref} className={'cvModal '+(wide?'cvModalWide':'')} role="dialog" aria-modal="true" aria-label={label}>
    <div className="cvModalTop"><span className="cvEyebrow">{label}</span><button type="button" className="cvIconButton" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button></div>{children}
  </div></div>;
}

export function CouncilPage({children,title='Council'}){
  const router=useRouter(),{activeAddress,signTransactions,wallets=[]}=useWallet(),{activeNetwork,setActiveNetwork}=useNetwork();
  const [data,setData]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0),[notice,setNotice]=useState(''),[review,setReview]=useState(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[loadingMore,setLoadingMore]=useState(false),[walletPrompt,setWalletPrompt]=useState(false),[connecting,setConnecting]=useState('');
  const lock=useRef(false),wallet=useRef(null),currentEndpoint=useRef('');wallet.current={activeAddress,activeNetwork};
  const query=new URLSearchParams();if(activeAddress)query.set('address',activeAddress);
  if(router.pathname==='/council/dao/[id]'&&router.query.id)query.set('proposalId',String(router.query.id));
  if(['/council/ask','/council/treasury'].includes(router.pathname))query.set('view','config');
  const endpoint='/api/council/dao?'+query.toString();currentEndpoint.current=endpoint;
  useEffect(()=>{
    let live=true;setLoading(true);setError('');setReview(null);setLoadingMore(false);
    // Preserve the composer and local file queue while connecting a wallet.
    request(endpoint).then(value=>{if(live){setData(value);setLoading(false);}}).catch(failure=>{if(live){setError(failure.message);setLoading(false);}});
    return()=>{live=false;};
  },[endpoint,revision]);
  const correctNetwork=Boolean(data&&activeNetwork===data.config.network),canAct=Boolean(data?.config.ready&&activeAddress&&correctNetwork&&!busy&&!loading);
  async function connect(provider){setConnecting(provider.id);try{await provider.connect();provider.setActive();setWalletPrompt(false);}catch(failure){setNotice(failure.message||'Wallet connection was cancelled.');}finally{setConnecting('');}}
  async function loadMore(){
    if(loadingMore||!data?.pagination?.hasMore)return;setLoadingMore(true);
    try{const next=await request(endpoint+'&before='+encodeURIComponent(data.pagination.nextBefore));if(currentEndpoint.current!==endpoint)return;setData(current=>current?{...current,proposals:[...current.proposals,...next.proposals.filter(proposal=>!current.proposals.some(existing=>existing.id===proposal.id))],pagination:next.pagination}:current);}
    catch(failure){setNotice(failure.message);}finally{setLoadingMore(false);}
  }
  async function prepare(action,input){
    if(!canAct||lock.current)return;lock.current=true;setBusy(true);setNotice('Preparing your review…');
    try{
      const fresh=await request(endpoint),client=new sdk.Algodv2('',fresh.config.algodUrl,443);
      if(Number(fresh.config.paused)&&['propose','execute'].includes(action))throw Error('New proposals and treasury actions are temporarily paused.');
      let inputs=[input];
      if(action==='vote')inputs=input.nfts.filter(nft=>!fresh.votes.some(vote=>vote.proposalId===String(input.id)&&vote.nftId===nft.assetId&&vote.choice===Number(input.choice))).map(nft=>({...input,nft}));
      if(action==='claim')inputs=input.claims.map(claim=>({id:claim.proposalId,assetId:claim.nftId})).filter(item=>fresh.votes.some(vote=>vote.proposalId===item.id&&vote.nftId===item.assetId&&vote.address===activeAddress));
      if(!inputs.length){setNotice('Your selected actions are already complete.');return;}
      const groups=[];for(const item of inputs)groups.push(await buildCouncilGroup({config:fresh.config,sender:activeAddress,action,input:item,proposals:fresh.proposals,votes:fresh.votes,client}));
      setReview({action,groups,client,sender:activeAddress,network:activeNetwork,input,proposal:fresh.proposals.find(proposal=>proposal.id===String(input.id)),config:fresh.config,fee:groups.reduce((sum,group)=>sum+BigInt(group.networkFee),0n).toString(),storage:groups.reduce((sum,group)=>sum+BigInt(group.storage),0n).toString(),payment:groups.reduce((sum,group)=>sum+BigInt(group.paymentAmount),0n).toString(),reward:groups.reduce((sum,group)=>sum+BigInt(group.rewardAmount||0),0n).toString(),refund:groups.reduce((sum,group)=>sum+BigInt(group.refundAmount||0),0n).toString()});setNotice('');
    }catch(failure){setNotice(failure.message);}finally{lock.current=false;setBusy(false);}
  }
  async function confirm(){
    if(!review||lock.current)return;lock.current=true;setBusy(true);setReview(null);let discussionPending=false;
    try{
      for(let index=0;index<review.groups.length;index++){
        if(wallet.current.activeAddress!==review.sender||wallet.current.activeNetwork!==review.network)throw Error('Your wallet or network changed. Review the remaining actions again.');
        setNotice('Confirming '+(index+1)+' of '+review.groups.length+'…');
        const txid=await sendCouncilGroup({...review.groups[index],client:review.client,signTransactions,onStatus:setNotice});
        // Discussion delivery never changes a confirmed transaction's result.
        try{const response=await fetch('/api/council/notify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({txid}),signal:AbortSignal.timeout(10000)});if(!response.ok)discussionPending=true;}catch{discussionPending=true;}
      }
      setNotice(discussionPending?'Confirmed. Your discussion updates are syncing.':'Confirmed. Your Council records are up to date.');
    }catch(failure){setNotice(failure.message);}finally{lock.current=false;setBusy(false);setRevision(value=>value+1);}
  }
  const context={data,activeAddress,activeNetwork,signTransactions,canAct,correctNetwork,busy,reviewing:Boolean(review),prepare,notice,setNotice,loadMore,loadingMore,connectWallet:()=>setWalletPrompt(true)};
  return <CouncilContext.Provider value={context}><Head><title>{title} | Dark Coin Council</title><meta name="description" content="Shape what comes next for Dark Coin. Propose an idea, vote with your DAO NFTs, and earn rewards."/></Head>
    <main className="councilPage">
      <div className="cvMasthead"><div className="cvMastheadInner"><Link href="/council"><a className="cvWordmark"><img src="/home/councilLogo.png" alt=""/><span>The Council<small>Dark Coin governance</small></span></a></Link><div className={"cvMastheadRight "+(!activeAddress?"isUnconnected":"")}><span className="cvNetwork"><i/>{data?.config.network==='testnet'?'Testnet':'Algorand mainnet'}</span>{activeAddress&&<span className="cvConnected"><Icon name="wallet" size={15}/>{short(activeAddress)}</span>}</div></div></div>
      <div className="councilBody"><nav className="councilNav" aria-label="Council navigation"><div>{links.map(([href,label,icon])=><Link href={href} key={href}><a aria-current={router.pathname===href?'page':undefined}><Icon name={icon} size={17}/><span>{label}</span></a></Link>)}</div><div className="cvNavActions"><button type="button" className="cvIconButton" aria-label="Refresh Council" disabled={busy||loading} onClick={()=>setRevision(value=>value+1)}><Icon name="refresh" size={17}/></button><Link href="/council/ask"><a aria-label="New proposal" className={'cvButton cvPrimary cvCompactButton '+(router.pathname==='/council/ask'?'isCurrent':'')}><Icon name="plus" size={17}/><span>New proposal</span></a></Link></div></nav>
        {notice&&<div className="cvNotice" role="status"><Icon name="info" size={18}/><p>{notice}</p><button type="button" className="cvIconButton" aria-label="Dismiss notice" onClick={()=>setNotice('')}><Icon name="close" size={15}/></button></div>}
        {error&&<div className="cvNotice cvNoticeError" role="alert"><Icon name="info" size={18}/><p>{error}</p><button type="button" className="cvTextButton" onClick={()=>setRevision(value=>value+1)}>Try again</button></div>}
        {!data?<div className="cvLoading"><span className="cvSpinner"/><h2>Opening the chamber</h2><p>Gathering the latest proposals and treasury balances.</p></div>:<>
          {!data.config.ready&&<div className="cvNotice"><Icon name="clock"/><p>Council setup is being completed. You can draft a proposal while submissions are unavailable.</p></div>}
          {Number(data.config.paused)>0&&<div className="cvNotice"><Icon name="pause"/><p>New proposals and treasury actions are paused. Voting and ballot deposit returns remain available.</p></div>}
          {activeAddress&&!correctNetwork&&<div className="cvNotice"><Icon name="wallet"/><p>Switch your wallet to {data.config.network} to participate.</p><button type="button" className="cvTextButton" onClick={()=>setActiveNetwork(data.config.network)}>Switch network<Icon name="arrow" size={15}/></button></div>}
          {children}
        </>}
        <footer className="cvFooter"><span><img src="/home/councilLogo.png" alt=""/>Built by the community. Decided by the Council.</span><a href={'https://allo.info/application/'+(data?.config.appId||1239236238)} target="_blank" rel="noreferrer">View on Algorand<Icon name="external" size={13}/></a></footer>
      </div>
      {walletPrompt&&<Dialog label="Connect your wallet" onClose={()=>setWalletPrompt(false)}><h2>Your voice starts here.</h2><p>Choose a wallet to upload attachments, submit a proposal, or vote with your DAO NFTs.</p><div className="cvWalletChoices">{wallets.map(provider=><button type="button" className="cvWalletChoice" disabled={!!connecting} key={provider.id} onClick={()=>connect(provider)}>{provider.metadata?.icon&&<img src={provider.metadata.icon} alt=""/>}<span>{provider.metadata?.name||provider.id}</span>{connecting===provider.id?<span className="cvSpinner"/>:<Icon name="arrow" size={18}/>}</button>)}</div><p className="cvFinePrint">Connecting does not move funds.</p></Dialog>}
      {review&&<Dialog label="Review before signing" onClose={()=>setReview(null)} wide><h2>{review.action==='propose'?'Your proposal is ready.':review.action==='vote'?'Make your voice count.':review.action==='claim'?'Return your ballot deposits.':review.action==='execute'?'Execute the approved action.':'Finalize this result.'}</h2><p>Check the details below, then confirm in your wallet.</p><div className="cvReviewAmounts">
        {review.action==='propose'&&<div><span>Proposal fee</span><TokenAmount amount={review.payment}/></div>}{BigInt(review.storage)>0n&&<div><span>{review.action==='vote'?'Refundable ballot deposits':'Proposal record'}</span><TokenAmount amount={review.storage}/></div>}<div><span>Network fees</span><TokenAmount amount={review.fee}/></div>{review.action==='vote'&&<div className="cvReviewBenefit"><span>Reward paid with these votes</span><TokenAmount amount={review.reward}/></div>}{review.action==='claim'&&<div className="cvReviewBenefit"><span>Deposits returned</span><TokenAmount amount={review.refund}/></div>}
      </div><ReviewInstructions review={review}/>{review.action==='propose'&&<p className="cvFinePrint">Your attachments are uploaded and verified. The proposal fee and record funding are non-refundable.</p>}{review.action==='vote'&&<p className="cvFinePrint">Only an NFT’s first vote earns a reward. Ballot deposits can be returned after finalization.</p>}<div className="cvModalActions"><button type="button" className="cvButton cvSecondary" onClick={()=>setReview(null)}>Go back</button><button type="button" className="cvButton cvPrimary" onClick={confirm}>Confirm and sign<Icon name="arrow" size={18}/></button></div></Dialog>}
    </main><CouncilStyles/>
  </CouncilContext.Provider>;
}
