import React from 'react';
import {useWallet} from '@txnlab/use-wallet-react';
import SectionLanding from '../../components/navigation/SectionLanding';
import {MARKET_APPS} from '../../components/contracts/Market/MarketPageShell';
import ShareLink from '../../components/contracts/Market/ShareLink';
import {stallPath} from '../../functions/market/model';

export default function Market(){
  const {activeAddress}=useWallet();
  const cards=MARKET_APPS.map(app=>({...app,
    href:app.key==='stall'&&activeAddress?stallPath(activeAddress):app.href,
    extra:app.key==='stall'&&activeAddress?<ShareLink path={stallPath(activeAddress)} label="Copy your stall link" showLabel/>:null,
  }));
  return <SectionLanding section="market" title="Market" subtitle="Listed NFTs, wallet goods, and your own stall."
    description="Browse, list, and manage NFTs in the Dark Coin market."
    background="/home/market.png" logo="/home/marketLogo.png" cards={cards}/>;
}
