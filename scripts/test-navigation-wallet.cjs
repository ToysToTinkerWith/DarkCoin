// Wallet UI integration fixture: providers and rewards are simulated; no signing or transfers.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const esbuild=require('esbuild');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'tmp/navigation-wallet');
fs.mkdirSync(out,{recursive:true});
(async()=>{
  const mocks={
    '@txnlab/use-wallet-react':`import React from 'react';let address=null;const listeners=new Set();const change=a=>{address=a;listeners.forEach(f=>f())};const provider={id:'pera',metadata:{id:'pera',name:'Pera',icon:'/invDC.svg'},connect:async()=>change('ABCDEF1234567890WXYZ'),disconnect:async()=>change(null)};export function useWallet(){const activeAddress=React.useSyncExternalStore(f=>{listeners.add(f);return()=>listeners.delete(f)},()=>address);return {wallets:[provider],activeWallet:activeAddress?provider:null,activeAddress,isReady:true}};`,
    './WalletRewards':`import React from 'react';import {useWallet} from '@txnlab/use-wallet-react';export function useWalletRewards(){const {activeAddress}=useWallet();return {count:activeAddress?2:0}};export default function Rewards({rewards}){return rewards.count?<p>Reward claims available</p>:null}`,
    '../../Firebase/FirebaseInit':`export const storage={};`,
    'firebase/storage':`export const ref=()=>({});export const getDownloadURL=async()=>'/invDC.svg';`,
    'next/router':`export const useRouter=()=>({pathname:'/'});`,
    'next/link':`import React from 'react';export default function Link({href,children}){return React.cloneElement(children,{href})}`,
  };
  await esbuild.build({stdin:{resolveDir:root,loader:'jsx',contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Nav from './components/connect/nav';import Connect from './components/connect/connect';const assets=[{amount:1000000,asset:{index:1088771340,params:{name:'Dark Coin',unitName:'DARK',decimals:6}}}];const fetchAssets=async()=>{window.assetFetches=(window.assetFetches||0)+1};createRoot(document.getElementById('root')).render(<Nav walletControl={<Connect wallet={assets} fetchDcAssets={fetchAssets}/>}/>);`},bundle:true,loader:{'.js':'jsx'},outfile:path.join(out,'wallet-fixture.js'),define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'wallet-fixtures',setup(b){b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'fixture'}:null);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:mocks[a.path],loader:'jsx',resolveDir:root}));}}]});
  const server=http.createServer((req,res)=>{if(req.url==='/wallet-fixture.js'){res.setHeader('Content-Type','application/javascript');return res.end(fs.readFileSync(path.join(out,'wallet-fixture.js')))}if(req.url==='/invDC.svg'){res.setHeader('Content-Type','image/svg+xml');return res.end(fs.readFileSync('public/invDC.svg'))}res.setHeader('Content-Type','text/html');res.end('<html><body><div id="root"></div><script src="/wallet-fixture.js"></script></body></html>')});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**/*',r=>r.fulfill({contentType:'application/json',body:'{}'}));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const connect=page.getByRole('button',{name:'Connect Wallet',exact:true});
    await connect.focus();await page.keyboard.press('Enter');await page.getByRole('dialog',{name:'Wallet connection'}).waitFor();
    await page.getByRole('button',{name:'CONNECT',exact:true}).click();
    const assets=page.getByRole('dialog',{name:'Wallet assets'});await assets.waitFor();
    await assets.getByText('Dark Coin',{exact:true}).waitFor();
    assert.equal(await page.locator('[role="status"][aria-label="2 unique reward assets to claim"]').count(),1);
    assert.equal(await assets.getByText('Reward claims available').count(),1);
    assert.equal(await page.evaluate(()=>window.assetFetches),1);
    await page.keyboard.press('Escape');await assets.waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Open wallet assets'}).click();await assets.waitFor();
    await page.keyboard.press('Escape');await assets.waitFor({state:'hidden'});
    await page.evaluate(()=>window.dispatchEvent(new Event('darkcoin-connect-wallet')));await assets.waitFor();
    await assets.getByRole('button',{name:'DISCONNECT',exact:true}).click();await assets.waitFor({state:'hidden'});
    assert.equal(await connect.count(),1);assert.equal(await page.getByRole('status').count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: nav wallet keyboard access, connection, assets, reward badge/panel, reopen, external wallet event, Escape and disconnect. Providers/rewards simulated; no transactions.');
  }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
