import {createContext,useContext} from 'react';
import {formatUnits} from '../../functions/council/model';

export const CouncilContext=createContext(null);
export const useCouncil=()=>useContext(CouncilContext);
export const algo=value=>formatUnits(value||'0',6)+' ALGO';
export const short=(address='')=>address.slice(0,7)+'…'+address.slice(-5);
export const date=timestamp=>new Date(Number(timestamp)*1000).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
export const percent=bps=>Number(bps)/100+'%';
export const rewardFor=proposal=>proposal.rewardPerVote||proposal.reward||'0';

export async function request(url,body){
  const response=await fetch(url,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);
  let data;try{data=await response.json();}catch{throw Error('The Council is taking a moment to respond. Please try again.');}
  if(!response.ok)throw Error(data.error||'Could not complete this request.');
  return data;
}
