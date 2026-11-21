import React,{useState} from 'react';
import Link from 'next/link';
import {formatUnits} from '../../functions/council/model';

const paths={
  arrow:'M5 12h14m-6-6 6 6-6 6',
  chevron:'m9 5 7 7-7 7',
  plus:'M12 5v14M5 12h14',
  upload:'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',
  image:'M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M15 8h.01',
  video:'M3 5h13v14H3z m13 5 5-3v10l-5-3',
  check:'m5 12 4 4L19 6',
  close:'m6 6 12 12M18 6 6 18',
  refresh:'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 2M4 16l2 2a7 7 0 0 0 12-1',
  clock:'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  vote:'m7 11 5 4 8-9M4 12v8h16v-8M8 4h8',
  treasury:'m3 9 9-6 9 6H3m2 3v7m7-7v7m7-7v7M3 22h18',
  wallet:'M3 6h16v3M3 6v14h18V9H3m12 4h6v4h-6zM4 3h13',
  discussion:'M4 4h16v13H9l-5 4V4m4 5h8m-8 4h5',
  spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7',
  shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3m-4 9 3 3 5-6',
  external:'M14 3h7v7m0-7L10 14M10 4H4v16h16v-6',
  copy:'M9 9h12v12H9zM15 9V3H3v12h6',
  search:'m16 16 5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  file:'M5 3h9l5 5v13H5zM14 3v6h5M9 13h6m-6 4h6',
  people:'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3m14-7a4 4 0 0 1 5 4v3M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0m3-4a4 4 0 0 1 0 8',
  settings:'M4 7h16M4 17h16M8 4v6m8 4v6',
  gift:'M3 8h18v5H3zm2 5v8h14v-8M12 8v13m0-13C6 8 5 6 6 4c2-3 6 4 6 4s4-7 6-4c1 2 0 4-6 4',
  pause:'M8 5v14m8-14v14',
  info:'M12 11v6m0-10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
};
export function Icon({name,size=20,className=''}){return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.spark}/></svg>;}

export function AssetIcon({id=0,asset={},size=40}){
  const known=Number(id)===0?'/AlgoWhite.svg':Number(id)===1088771340?'/invDC.svg':'';
  const sources=[known,asset.icon,asset.image,Number(id)>0?`https://asa-list.tinyman.org/assets/${id}/icon.png`:''].filter(Boolean);
  return <AssetImage key={`${id}:${sources.join(',')}`} sources={[...new Set(sources)]} name={asset.name||asset.unitName||(Number(id)===0?'Algorand':'Asset '+id)} size={size}/>;
}
function AssetImage({sources,name,size}){
  const [index,setIndex]=useState(0);
  return <span className="cvAssetIcon" style={{width:size,height:size}}>{sources[index]?<img src={sources[index]} alt={name+' icon'} onError={()=>setIndex(n=>n+1)}/>:<svg width="55%" height="55%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" role="img" aria-label={name+' asset icon'}><path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z M3 7l9 5 9-5 M12 12v10"/></svg>}</span>;
}
export function TokenAmount({amount='0',id=0,decimals=6,name,className=''}){return <span className={'cvTokenAmount '+className}><AssetIcon id={id} asset={{name}} size={20}/><span>{formatUnits(amount||'0',Number(decimals))}</span><span className="cvCurrency">{name||(Number(id)===0?'ALGO':'')}</span></span>;}
export function StatusBadge({proposal}){
  const state=Number(proposal.state),text=state===1?'Accepted':state===2?'Rejected':proposal.ended?'Ready to finalize':'Voting open';
  return <span className={'cvStatus cvStatus'+state+(proposal.ended?' cvEnded':'')}><span/>{text}</span>;
}
export function VoteBar({proposal,compact=false}){
  const yes=Number(proposal.yes)||0,no=Number(proposal.no)||0,abstain=Number(proposal.abstain)||0,total=yes+no+abstain;
  return <div className={'cvVotes '+(compact?'cvVotesCompact':'')}>
    <div className="cvVoteTrack" role="img" aria-label={`${yes} Yes, ${no} No, ${abstain} Abstain`}>
      <span className="cvYes" style={{width:total?yes/total*100+'%':'0%'}}/><span className="cvNo" style={{width:total?no/total*100+'%':'0%'}}/><span className="cvAbstain" style={{width:total?abstain/total*100+'%':'0%'}}/>
    </div>
    <div className="cvVoteLabels"><span><i className="cvYes"/>Yes <strong>{yes}</strong></span><span><i className="cvNo"/>No <strong>{no}</strong></span><span><i className="cvAbstain"/>Abstain <strong>{abstain}</strong></span></div>
  </div>;
}
export const mediaUrl=media=>media.url||`/api/council/image?hash=${media.hash}`;
export const isVideo=media=>media.kind==='video'||String(media.contentType||'').startsWith('video/');
export function MediaGallery({images=[],compact=false}){
  if(!images.length)return null;
  return <div className={'cvMediaGallery '+(compact?'cvMediaCompact':'')}>{images.map((media,i)=><figure key={media.hash||i}>
    {isVideo(media)?<video src={mediaUrl(media)} controls={!compact} preload="metadata" playsInline aria-label={media.caption||media.name||'Proposal video'}/>:compact?<img src={mediaUrl(media)} alt={media.caption||media.name||'Proposal reference image'} loading="lazy"/>:<a href={mediaUrl(media)} target="_blank" rel="noreferrer"><img src={mediaUrl(media)} alt={media.caption||media.name||'Proposal reference image'} loading="lazy"/></a>}
    {!compact&&(media.caption||media.name)&&<figcaption>{media.caption||media.name}</figcaption>}
    {compact&&isVideo(media)&&<span className="cvMediaKind"><Icon name="video" size={15}/>Video</span>}
  </figure>)}</div>;
}
export function DiscussionLink({proposal,compact=false}){
  const url=proposal.discussionUrl||proposal.discord?.url;
  if(!url)return null;
  return <a className={'cvDiscussionLink '+(compact?'cvDiscussionCompact':'')} href={url} target="_blank" rel="noreferrer"><Icon name="discussion" size={18}/>{compact?'Discuss':'Discuss this proposal'}<Icon name="external" size={14}/></a>;
}
export function EmptyState({icon='vote',title,children,href,label}){return <div className="cvEmpty"><span className="cvEmptyIcon"><Icon name={icon} size={30}/></span><h3>{title}</h3><p>{children}</p>{href&&<Link href={href}><a className="cvButton cvPrimary">{label}<Icon name="arrow" size={17}/></a></Link>}</div>;}
export function PageIntro({eyebrow,title,children,action}){return <div className="cvPageIntro"><div>{eyebrow&&<p className="cvEyebrow">{eyebrow}</p>}<h2>{title}</h2>{children&&<p>{children}</p>}</div>{action}</div>;}
export function SectionTitle({step,icon,title,children}){return <div className="cvSectionTitle"><span className="cvSectionStep">{step||<Icon name={icon}/>}</span><div><h3>{title}</h3>{children&&<p>{children}</p>}</div></div>;}
export function CopyAddress({address,label='Copy address'}){
  const [copied,setCopied]=useState(false);
  return <button type="button" className="cvAddressCopy" title={address} onClick={async()=>{try{await navigator.clipboard.writeText(address);setCopied(true);setTimeout(()=>setCopied(false),1800);}catch{}}}><span>{address?.slice(0,8)}…{address?.slice(-6)}</span><Icon name={copied?'check':'copy'} size={15}/><span className="cvSrOnly">{copied?'Address copied':label}</span></button>;
}
export const relativeDeadline=timestamp=>{
  const remaining=Number(timestamp)*1000-Date.now();
  if(remaining<=0)return 'Voting closed';
  const days=Math.ceil(remaining/86400000);return days>1?days+' days left':Math.ceil(remaining/3600000)+' hours left';
};
