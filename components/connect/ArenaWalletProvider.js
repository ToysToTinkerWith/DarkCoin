import React,{createContext,useContext,useRef,useState,useEffect} from 'react';
import {useWallet} from '@txnlab/use-wallet-react';
import {ArenaWalletSession} from './arena-wallet-session';
const Context=createContext(null);
export function ArenaWalletProvider({children}){
 const {activeAddress,activeWallet,activeNetwork,signTransactions}=useWallet(),[,redraw]=useState(0),mounted=useRef(true),session=useRef(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;session.current?.clear();};},[]);
 if(!session.current)session.current=new ArenaWalletSession({changed:()=>{if(mounted.current)redraw(n=>n+1);},request:async(op,data)=>{
  const response=await fetch('/api/arena/economy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op,...data})}),result=await response.json();
  if(!response.ok)throw new Error(result.error||'Could not sign in with your connected wallet.');return result;
 }});
 session.current.connect(`${activeNetwork||''}:${activeWallet?.id||''}:${activeAddress||''}`,activeAddress,signTransactions);
 return <Context.Provider value={{authorizeChampion:id=>session.current.authorize(Number(id)),clearArenaSession:()=>session.current.clear(),signingArena:!!session.current.pending}}>{children}</Context.Provider>;
}
export function useArenaWallet(){const value=useContext(Context);if(!value)throw new Error('Arena wallet provider is missing');return value;}
