import React from 'react';
import SectionLanding from '../../components/navigation/SectionLanding';
import {PLAYGROUND_JOIN_ENABLED} from '../../lib/arena/availability';

const ARENA_DESTINATIONS=[
  {key:'arena',title:'Arena',image:'/home/arena.png',kicker:'Real-time 3D · Playtest',
    description:'Control your champion in multiplayer combat. Uses equipped NFT traits; no generated character needed.',
    href:PLAYGROUND_JOIN_ENABLED?'/arena/playtest':null,action:'Enter Arena',unavailable:'Arena entry is temporarily closed.'},
  {key:'armory',title:'Armory',image:'/arena/overview-armory.png',kicker:'Champion equipment',
    description:'Swap equipped traits, explore your champion in 3D, and preview Arena stats and abilities.',
    href:'/arena/armory',action:'Open Armory'},
];

export default function Arena(){
  return <SectionLanding section="arena" title="Arena" subtitle="Real-time champion combat"
    description="Explore Dark Coin Arena and customize your champion in the Armory."
    background="/home/arena.png" logo="/home/arenaLogo.png" cards={ARENA_DESTINATIONS}/>;
}
