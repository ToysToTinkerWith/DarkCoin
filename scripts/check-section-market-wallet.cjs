// Actual Market landing component with a simulated wallet; no provider calls.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const esbuild=require('esbuild');
const {chromium}=require('playwright');
const sdk=require('algosdk'),root=path.resolve(__dirname,'..'),out=path.join(root,'tmp/section-market-wallet');
const address=String(sdk.generateAccount().addr);
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const mocks={
    '@txnlab/use-wallet-react':`import React from 'react';let address=null;const listeners=new Set();window.connectMarketFixture=()=>{address=${JSON.stringify(address)};listeners.forEach(listener=>listener());};export function useWallet(){const activeAddress=React.useSyncExternalStore(listener=>{listeners.add(listener);return()=>listeners.delete(listener);},()=>address);return{activeAddress};}`,
    'next/head':`export default function Head(){return null;}`,
    'next/link':`import React from 'react';export default function Link({href,children}){return React.cloneElement(children,{href});}`,
    'next/router':`export function useRouter(){return{pathname:'/market'};}`,
  };
  await esbuild.build({stdin:{resolveDir:root,loader:'jsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import Market from'./pages/market/index';createRoot(document.getElementById('root')).render(<Market/>);`},bundle:true,loader:{'.js':'jsx','.module.css':'local-css'},outfile:path.join(out,'fixture.js'),define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'section-wallet-fixture',setup(build){build.onResolve({filter:/.*/},args=>mocks[args.path]?{path:args.path,namespace:'fixture'}:null);build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'jsx',resolveDir:root}));}}]});
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/fixture.js'||url.pathname==='/fixture.css'){res.setHeader('Content-Type',url.pathname.endsWith('css')?'text/css':'text/javascript');return res.end(fs.readFileSync(path.join(out,url.pathname.slice(1))));}
    const publicRoot=path.join(root,'public'),asset=path.resolve(publicRoot,'.'+url.pathname),relative=path.relative(publicRoot,asset);
    if(!relative.startsWith('..')&&!path.isAbsolute(relative)&&fs.existsSync(asset)&&fs.statSync(asset).isFile()){res.setHeader('Content-Type',/\.png$/i.test(asset)?'image/png':/\.svg$/i.test(asset)?'image/svg+xml':'application/octet-stream');return res.end(fs.readFileSync(asset));}
    res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><link rel="stylesheet" href="/fixture.css"><style>*{box-sizing:border-box}body{margin:0}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window.marketCopiedValue=value;}}}));
    const origin='http://127.0.0.1:'+server.address().port;
    await page.goto(origin);const stall=page.locator('[data-section-card]').filter({has:page.getByRole('heading',{name:'Dark Coin Your Stall'})});
    await stall.waitFor();assert.equal(await stall.locator('[data-section-card-action]').getAttribute('href'),'/market/stall');
    assert.equal(await page.getByRole('button',{name:'Copy your stall link'}).count(),0);
    await page.evaluate(()=>window.connectMarketFixture());
    const connectedPath='/market/stall/'+address;
    await page.waitForFunction(expected=>document.querySelector('[data-section-card]:last-child [data-section-card-action]')?.getAttribute('href')===expected,connectedPath);
    await page.getByRole('button',{name:'Copy your stall link'}).click();
    assert.equal(await page.evaluate(()=>window.marketCopiedValue),origin+connectedPath);
    await page.getByRole('button',{name:'Link copied'}).waitFor();
    const offsets=await page.locator('[data-section-card-shell]').evaluateAll(cards=>cards.map(card=>card.getBoundingClientRect().bottom-card.querySelector('[data-section-card-action]').getBoundingClientRect().bottom));
    assert(Math.max(...offsets)-Math.min(...offsets)<1,'Connected card actions remain aligned: '+JSON.stringify(offsets));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: Market wallet connection updates the actual stall URL and preserves Copy your stall link; connected cards remain aligned at1440px/390px. No wallet signing or transactions.');
  }finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
