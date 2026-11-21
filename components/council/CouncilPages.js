import React,{useState} from 'react';
import Link from 'next/link';
import {formatUnits} from '../../functions/council/model';
import {useCouncil,algo,rewardFor} from './CouncilContext';
import {Icon,AssetIcon,TokenAmount,StatusBadge,VoteBar,MediaGallery,DiscussionLink,EmptyState,PageIntro,relativeDeadline} from './CouncilVisuals';
import Rules from './CouncilRules';
import CouncilFundingAddress from './CouncilFundingAddress';

function ProposalCard({proposal}){
  const cover=proposal.images?.[0],eligible=Number(proposal.minVotes)||50,turnout=Number(proposal.turnout)||0;
  return <article className={'cvProposalCard '+(cover?'hasCover':'')}>
    {cover&&<Link href={'/council/dao/'+proposal.id}><a className="cvProposalCover"><MediaGallery images={[cover]} compact/></a></Link>}
    <div className="cvProposalCardContent"><div className="cvCardTop"><span className="cvProposalNumber">Proposal {String(proposal.id).padStart(3,'0')}</span><StatusBadge proposal={proposal}/></div>
      <h3><Link href={'/council/dao/'+proposal.id}><a>{proposal.title}</a></Link></h3><p className="cvExcerpt">{proposal.body?.slice(0,155)}{proposal.body?.length>155?'…':''}</p>
      <VoteBar proposal={proposal} compact/><div className="cvCardFoot"><span><Icon name="people" size={15}/>{turnout} / {eligible} NFTs</span><span><Icon name="clock" size={15}/>{relativeDeadline(proposal.deadline)}</span></div>
      <div className="cvCardReward"><span><Icon name="gift" size={16}/>First-vote reward</span><TokenAmount amount={rewardFor(proposal)}/></div>
      <div className="cvCardActions"><Link href={'/council/dao/'+proposal.id}><a className="cvTextButton">{Number(proposal.state)===0&&!proposal.ended?'View & vote':'View proposal'}<Icon name="arrow" size={16}/></a></Link><DiscussionLink proposal={proposal} compact/></div>
    </div>
  </article>;
}

export function ProposalBoard(){
  const {data,loadMore,loadingMore}=useCouncil(),[search,setSearch]=useState(''),[filter,setFilter]=useState('all');
  const proposals=data.proposals.filter(proposal=>(filter==='all'||filter==='open'&&Number(proposal.state)===0||filter==='accepted'&&Number(proposal.state)===1||filter==='rejected'&&Number(proposal.state)===2)&&`${proposal.title} ${proposal.body}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageIntro eyebrow="The community's agenda" title="Inside the chamber.">Explore ideas, join the discussion, and choose what comes next.</PageIntro><div className="cvBoardToolbar"><div className="cvFilterTabs" role="group" aria-label="Filter proposals">{[['all','All proposals'],['open','Voting'],['accepted','Accepted'],['rejected','Rejected']].map(([value,label])=><button type="button" aria-pressed={filter===value} onClick={()=>setFilter(value)} key={value}>{label}</button>)}</div><label className="cvSearch"><Icon name="search" size={18}/><span className="cvSrOnly">Search loaded proposals</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Find a proposal…"/></label></div>{proposals.length?<div className="cvProposalGrid">{proposals.map(proposal=><ProposalCard proposal={proposal} key={proposal.id}/>)}</div>:<EmptyState title={search||filter!=='all'?'No proposals match that view.':'The floor is yours.'} href={!search&&filter==='all'?'/council/ask':undefined} label="Create a proposal">{search||filter!=='all'?'Try another search or filter to find a conversation.':'Bring your next idea to the community. Every change begins with a proposal.'}</EmptyState>}{data.pagination?.hasMore&&<div className="cvLoadMore"><button type="button" className="cvButton cvSecondary" disabled={loadingMore} onClick={loadMore}>{loadingMore?'Loading proposals…':'Load more proposals'}<Icon name="chevron" size={16}/></button></div>}<Rules/></>;
}

export function TreasuryPage(){
  const {data}=useCouncil();
  return <><PageIntro eyebrow="Community resources" title="Built for what comes next." action={<CouncilFundingAddress address={data.config.address} network={data.config.network}/>}>The Council’s shared treasury. Every payment and swap starts with an accepted proposal.</PageIntro><section className="cvTreasuryHero"><div><span className="cvEyebrow">Available to the Council</span><div className="cvTreasuryAmount"><AssetIcon id={0} size={50}/><strong>{formatUnits(data.config.treasury||0,6)}</strong><span>ALGO</span></div><p>Available after minimum balance and voting reward reserves.</p></div><div className="cvTreasuryReserve"><span><Icon name="shield" size={19}/>Protected for voters</span><strong>{algo(data.config.rewardReserved)}</strong><small>Unpaid voting ALGO stays in the treasury and becomes available when voting is finalized.</small></div></section><div className="cvSectionHeading"><div><p className="cvEyebrow">Held by the treasury</p><h2>Community assets.</h2></div><a className="cvTextButton" href={'https://allo.info/account/'+data.config.address} target="_blank" rel="noreferrer">View wallet<Icon name="external" size={15}/></a></div><div className="cvAssetsTable"><div className="cvAssetsHead"><span>Asset</span><span>Balance</span><span>Availability</span></div>{data.assets.map(asset=><div className="cvAssetRow" key={asset.id}><div className="cvAssetIdentity"><AssetIcon id={asset.id} asset={asset} size={46}/><div><strong>{Number(asset.id)===1088771340?'Dark Coin':asset.name}</strong><span>{Number(asset.id)===0?'Algorand':String(asset.name).toUpperCase()+' · #'+asset.id}</span></div></div><div className="cvAssetBalance"><strong>{formatUnits(asset.amount||0,Number(asset.decimals))}</strong><span>{asset.name}</span></div><div className="cvAssetAvailability">{Number(asset.id)===0?<><span className="cvAvailable"><i/> {algo(asset.available)}</span><small>Available to spend</small></>:asset.frozen?<span>Frozen</span>:<span className="cvAvailable"><i/>Held in treasury</span>}</div></div>)}</div><div className="cvTreasuryNote"><Icon name="discussion" size={23}/><div><h3>Have an idea for these resources?</h3><p>Put the plan in a proposal and let the community decide.</p></div><Link href="/council/ask"><a className="cvButton cvSecondary">Create a proposal<Icon name="arrow" size={17}/></a></Link></div><Rules/></>;
}
