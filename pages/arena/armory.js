import React,{useEffect,useState} from 'react';
import {Grid,Button,Typography} from '@mui/material';
import {useWallet} from '@txnlab/use-wallet-react';
import Head from 'next/head';
import Swapper from '../../components/contracts/Arena/Swapper';
import {CHAMPION_ASSET_TRAITS} from '../../components/contracts/Arena/traitsData';
import {ownedChampions} from '../../lib/playground';
import ChampionName from '../../components/ChampionName';

export default function Armory(props){
 return <><Head><title>DarkCoin Armory | Arena &amp; Chronicles</title></Head><header className="armouryPageHeader"><strong>DarkCoin Armory</strong><p>NFT equipment / Arena &amp; Chronicles</p></header><ArmoryContent {...props}/></>;
}
function ArmoryContent(props){
 const {activeAddress}=useWallet(),[revision,setRevision]=useState(0),[selected,setSelected]=useState(null),[state,setState]=useState({address:null,loading:false,assets:[],error:''});
 useEffect(()=>setSelected(null),[activeAddress]);
 useEffect(()=>{if(!activeAddress){setState({address:null,loading:false,assets:[],error:''});return;}
  const controller=new AbortController();setState({address:activeAddress,loading:true,assets:[],error:''});
  fetch('/api/getDcAssets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address:activeAddress}),signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok||!Array.isArray(data))throw Error(data.error||'Could not load champions.');return data;}).then(assets=>setState({address:activeAddress,loading:false,assets,error:''})).catch(e=>{if(e.name!=='AbortError')setState({address:activeAddress,loading:false,assets:[],error:e.message});});
  return()=>controller.abort();
 },[activeAddress,revision]);
 const message=(title,detail,action)=><section className="armouryEmpty"><h1>{title}</h1><p>{detail}</p>{action}</section>;
 if(!activeAddress)return message('Connect your wallet','Connect your wallet to choose a champion and customize their traits.',<Button onClick={()=>window.dispatchEvent(new Event('darkcoin-connect-wallet'))}>Connect wallet</Button>);
 if(state.address!==activeAddress||state.loading)return message('Loading your champions…','Checking the champions in your connected wallet.');
 if(state.error)return message('Unable to load champions',state.error,<Button onClick={()=>setRevision(n=>n+1)}>Try again</Button>);
 const champions=ownedChampions(state.assets),owned=new Set(state.assets.filter(r=>Number(r.amount)>0).map(r=>Number(r.asset.index))),traits=CHAMPION_ASSET_TRAITS.map(t=>({...t,owned:owned.has(Number(t.assetId))}));
 if(!champions.length)return message('No champions were found','This connected wallet does not hold any Dark Coin Champion NFTs.');
 if(selected)return <Swapper nftId={selected} traits={traits} ownTraits={traits.filter(t=>t.owned)} contracts={props.contracts} zoom setSelWarrior={setSelected} refetchData={()=>setRevision(n=>n+1)} setMessage={props.setMessage} setProgress={props.setProgress} sendErrorMessage={props.sendErrorMessage}/>;
 return <section className="armourySelection"><h1>Choose your champion</h1><Grid container spacing={3}>{champions.map(row=>{const id=Number(row.asset.index);return <Grid key={id} item xs={6} sm={4} md={3} lg={2}><Button onClick={()=>setSelected(id)} sx={{width:'100%',height:'100%',minWidth:0,flexDirection:'column',justifyContent:'flex-start',color:'white',textTransform:'none','& > div':{width:'100%',minWidth:0}}}><Swapper nftId={id} traits={traits} zoom={false} contracts={props.contracts} sendErrorMessage={props.sendErrorMessage}/><Typography component="span" sx={{mt:1,width:'100%',minWidth:0,fontSize:{xs:12,sm:14},fontWeight:600,lineHeight:1.4,textAlign:'center',whiteSpace:'normal',overflowWrap:'anywhere'}}><ChampionName id={id} fallback={row.asset.params.name}/></Typography></Button></Grid>;})}</Grid></section>;
}
