import React from 'react';
import SectionLanding from '../../components/navigation/SectionLanding';

const COUNCIL_DESTINATIONS=[
  {key:'proposals',title:'Proposals',image:'/council/proposals.png',kicker:'Community decisions',
    description:'Explore proposals, join their Discord discussions, and vote with your DAO NFTs.',
    href:'/council/dao',action:'View proposals'},
  {key:'propose',title:'Propose',image:'/council/propose.png',kicker:'Bring an idea',
    description:'Share a proposal, attach images or videos, and put your next idea to the Council.',
    href:'/council/ask',action:'New proposal'},
  {key:'treasury',title:'Treasury',image:'/home/wallet.png',kicker:'Community resources',
    description:'See the Council’s ALGO and assets, available funds, and resources for approved proposals.',
    href:'/council/treasury',action:'View treasury'},
];

export default function Council(){
  return <SectionLanding section="council" title="Council" subtitle="Community proposals, NFT voting, and a shared treasury."
    description="Bring an idea to the Dark Coin Council, vote on proposals, and explore the community treasury."
    background="/home/council.png" logo="/home/councilLogo.png" cards={COUNCIL_DESTINATIONS}/>;
}
