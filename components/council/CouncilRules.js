import React from 'react';
import {protocol} from '../../functions/council/model';
import {useCouncil,algo,percent} from './CouncilContext';
import {Icon} from './CouncilVisuals';

export default function Rules({proposal}){
  const {data}=useCouncil(),config=data.config,ballot=proposal||config;
  return <details className="councilRules"><summary><Icon name="shield" size={17}/>How Council works<Icon name="plus" size={16}/></summary><div className="cvRulesGrid">
    <article><Icon name="vote"/><h4>One NFT. One voice.</h4><p>Each eligible DAO NFT has one ballot. {ballot.minVotes} NFTs must participate, and {percent(ballot.approvalBps)} of Yes and No votes must be Yes. Abstain counts toward participation.</p></article>
    <article><Icon name="gift"/><h4>Rewards, right away.</h4><p>Your NFT’s first vote pays its fixed ALGO reward in the same transaction. Changing a vote never pays twice. Ballot deposits can be returned after finalization.</p></article>
    <article><Icon name="treasury"/><h4>Clear proposal fees.</h4><p>{algo(config.baseFee)} base + {algo(config.wordFee)} per word + {algo(config.imageFee)} per attachment. {percent(config.hostBps)} supports hosting, {percent(config.rewardBps)} funds voting rewards, and the rest funds the treasury.</p></article>
    <article><Icon name="clock"/><h4>Time to decide.</h4><p>Voting lasts {config.shortDays}, {config.mediumDays}, or {config.longDays} days, based on proposal length. Each attachment adds {protocol.imageWords} effective words. Each proposal keeps the rules it opened with.</p></article>
  </div><p className="cvFinePrint">The reward per NFT is the voter pool divided by all eligible NFTs at submission, rounded down. Any unused reward allocation stays in the treasury and becomes available when voting is finalized. Accepted implementation briefs are carried out with the AI on your computer.</p></details>;
}
