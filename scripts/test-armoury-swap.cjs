const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const esbuild=require('../tmp/champion-model-tools/node_modules/esbuild');
const {chromium}=require('../tmp/playground-qa/node_modules/playwright');
const sdk=require('algosdk'),CID=require('cids'),mh=require('multihashes');
const root=path.resolve(__dirname,'..'),out=path.join(root,'tmp/armoury-qa');fs.mkdirSync(out,{recursive:true});
const address=sdk.generateAccount().addr.toString();
const hash=new CID(0,'dag-pb',mh.encode(Buffer.alloc(32,1),'sha2-256')).toString();
const traits=['Background','Weapon','Magic','Head','Armour','Extra'].map((type,i)=>({type,name:'New '+type,assetId:200+i,owned:true}));
const old=traits.map((t,i)=>({...t,name:'Old '+t.type,assetId:100+i}));
let server,browser,page;const errors=[],requests=[];let confirmed=false,failHash=false;
(async()=>{
 const plugins=[{name:'isolated-wallet-and-network',setup(b){
  b.onResolve({filter:/^(algosdk|@txnlab\/use-wallet-react|firebase\/storage)$|FirebaseInit$|NftImage$/},a=>a.pluginData?.real?null:{path:a.path,namespace:'fixture'});
  b.onResolve({filter:/^actual-sdk$/},()=>({path:require.resolve('algosdk')}));
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'jsx',resolveDir:root,contents:
   a.path==='algosdk'?`import * as real from 'actual-sdk';
    class Algodv2 {getApplicationBoxByName(app,name){return {do:async()=>{if(app!==123)throw Error('No DAO fixture');const slot=String.fromCharCode(name[name.length-1]);const idx='BWMHAE'.indexOf(slot);return {value:real.encodeUint64(window.fixtureEmpty?0:100+idx)}}}}getTransactionParams(){return {do:async()=>({fee:1000,minFee:1000,flatFee:true,firstValid:1,lastValid:100,genesisHash:new Uint8Array(32),genesisID:'fixture'})}}sendRawTransaction(txns){return {do:async()=>{window.sent=(window.sent||0)+1;await fetch('/fixture-confirm',{method:'POST'});return {txid:'fixture'}}}}}
    class Indexer {lookupAccountAssets(){return {do:async()=>({assets:window.fixtureOptedIn?Array.from({length:6},(_,i)=>({assetId:100+i})):[]})}}}
    export default {...real,Algodv2,Indexer,waitForConfirmation:async()=>({})};`:
   a.path.includes('use-wallet')?`import * as sdk from 'actual-sdk';export function useWallet(){return {activeAddress:${JSON.stringify(address)},signTransactions:async(bytes,indexes)=>{window.signed=(window.signed||0)+1;window.lastGroup=bytes.map(b=>{const t=sdk.decodeUnsignedTransaction(b);return {type:t.type,asset:Number(t.assetTransfer?.assetIndex||t.assetConfig?.assetIndex||0),amount:Number(t.assetTransfer?.amount||0),args:t.applicationCall?.appArgs.map(a=>new TextDecoder().decode(a)),note:t.note.length?new TextDecoder().decode(t.note):null,group:Array.from(t.group||[])}});window.signingIndexes=indexes;if(window.cancelFixture)throw Error('User rejected transaction');return bytes.map(()=>new Uint8Array([1]));}}}`:
   a.path==='firebase/storage'?`export const ref=(_s,p)=>p;export const getDownloadURL=async p=>'/fixture-image.svg?name='+encodeURIComponent(p);`:
   a.path.includes('FirebaseInit')?'export const storage={};':`import React from 'react';export default p=><img {...p}/>;`
  }));
 }}];
 const entry=`import React from 'react';import {createRoot} from 'react-dom/client';import {Buffer} from 'buffer';import Swapper from './components/contracts/Arena/Swapper';window.Buffer=Buffer;window.signed=0;window.sent=0;function App(){const [message,setMessage]=React.useState('');return <><div role='status'>{message}</div><Swapper nftId={999} zoom={true} contracts={{swapper:123}} traits={${JSON.stringify([...old,...traits])}} ownTraits={${JSON.stringify([...traits,{name:'Unowned Weapon',assetId:300,type:'Weapon',owned:false}])}} setMessage={setMessage} setProgress={()=>{}} refetchData={async()=>{window.refetched=true}}/></>}createRoot(document.getElementById('root')).render(<App/>);`;
 await esbuild.build({stdin:{contents:entry,resolveDir:root,loader:'jsx'},bundle:true,outfile:path.join(out,'qa.js'),loader:{'.js':'jsx'},plugins,define:{'process.env.NODE_ENV':'"production"'}});
 server=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):null;requests.push({path:req.url,body});res.setHeader('Content-Type','application/json');
  if(req.url==='/api/getNft')return res.end(JSON.stringify({nft:{assets:[{params:{name:'Generated champion fixture',url:'/fixture-image.svg'}}]},charStats:JSON.stringify({properties:{Skin:'Undead',...Object.fromEntries(old.map(t=>[t.type,t.name]))}}),charObject:{charObj:{name:'Existing generated champion',moves:['Keep me']}},action:null}));
  if(req.url==='/api/changeImg')return res.end(JSON.stringify({image:'/fixture-image.svg?preview'}));
  if(req.url==='/api/getHash'){if(failHash){res.statusCode=500;return res.end(JSON.stringify({error:'Fixture metadata failed'}));}return res.end(JSON.stringify({hash}));}
  if(req.url==='/api/mintNft')return res.end(JSON.stringify({signedTxn:Buffer.from([2]).toString('base64')}));
  if(req.url==='/fixture-confirm'){confirmed=true;return res.end('{}');}
  if(req.url==='/qa.js'){res.setHeader('Content-Type','text/javascript');return res.end(fs.readFileSync(path.join(out,'qa.js')));}
  if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="background:#080808;color:white"><div id="root"></div><script src="/qa.js"></script></body></html>');}
  if(req.url.startsWith('/api/')){res.statusCode=500;return res.end(JSON.stringify({error:'Unexpected API: '+req.url}));}
  res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#444"/></svg>');
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});page=await browser.newPage({viewport:{width:1300,height:1000}});page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const url=`http://127.0.0.1:${server.address().port}`;
 const choose=async type=>{await page.getByRole('button',{name:'Change '+type,exact:true}).click();await page.getByTitle('New '+type,{exact:true}).click();await page.getByRole('button',{name:'Trait Swap',exact:true}).waitFor();await page.waitForFunction(()=>!document.body.textContent.includes('Updating champion image'));};
 await page.goto(url);await page.getByRole('button',{name:'Change Weapon',exact:true}).waitFor();assert(await page.getByRole('button',{name:'No Trait Changes',exact:true}).isDisabled());assert(!/Generate Champion|Delete Character|Delete Champion|10,000|generated champion before/i.test(await page.locator('body').innerText()));
 await choose('Weapon');await page.getByRole('button',{name:'Trait Swap',exact:true}).click();await page.getByRole('status').filter({hasText:'Traits updated.'}).waitFor();
 let result=await page.evaluate(()=>({group:lastGroup,indexes:signingIndexes,sent,refetched}));assert.equal(result.sent,1);assert(confirmed&&result.refetched);assert.deepEqual(result.group.map(t=>t.type),['axfer','appl','axfer','appl','acfg']);assert.equal(result.group[0].asset,101);assert.equal(result.group[0].amount,0);assert.deepEqual(result.group[1].args,['unequip','W']);assert.equal(result.group[2].asset,201);assert.equal(result.group[2].amount,1);assert.deepEqual(result.group[3].args,['equip','W']);assert.equal(JSON.parse(result.group[4].note).properties.Weapon,'New Weapon');assert.deepEqual(result.indexes,[0,1,2,3]);assert(result.group.every(t=>t.group.join(',')===result.group[0].group.join(',')));assert(await page.getByRole('button',{name:'No Trait Changes',exact:true}).isDisabled());
 assert(requests.filter(r=>r.path==='/api/getNft').every(r=>r.body.includeArenaCharacter===false));assert(!requests.some(r=>/addDoc|delete|generate/i.test(r.path)));
 await page.evaluate(()=>{window.fixtureOptedIn=true;window.cancelFixture=true;});await choose('Armour');await page.getByRole('button',{name:'Trait Swap',exact:true}).click();await page.getByRole('status').filter({hasText:'Trait swap canceled.'}).waitFor();assert.equal(await page.evaluate(()=>sent),1);assert.deepEqual(await page.evaluate(()=>lastGroup.map(t=>t.type)),['appl','axfer','appl','acfg']);assert(await page.getByRole('button',{name:'Trait Swap',exact:true}).isEnabled());
 await page.evaluate(()=>window.cancelFixture=false);failHash=true;await page.getByRole('button',{name:'Trait Swap',exact:true}).click();await page.getByRole('status').filter({hasText:'Fixture metadata failed'}).waitFor();assert.equal(await page.evaluate(()=>sent),1);failHash=false;
 await page.reload();await page.getByRole('button',{name:'Change Weapon',exact:true}).waitFor();await page.getByRole('button',{name:'Change Weapon',exact:true}).click();assert.equal(await page.getByTitle('Unowned Weapon').count(),0);await page.reload();
 await choose('Weapon');await choose('Armour');await choose('Magic');await page.getByRole('button',{name:'Change Head',exact:true}).click();await page.getByTitle('New Head',{exact:true}).click();await page.getByRole('status').filter({hasText:'Algorand groups support 16 max'}).waitFor();assert.equal(await page.evaluate(()=>signed),0);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'armoury-mobile.png'),fullPage:true});assert.deepEqual(errors,[]);
 console.log('PASS: existing generated champion can swap; correct grouped opt-in/unequip/equip/metadata; no generation fee/queue/deletion; metadata-only fetch; reset after success; cancellation and metadata errors do not send; SDK assetId opt-ins; unowned traits excluded; transaction cap; mobile render.');
})().catch(async e=>{console.error(e);if(page)console.error((await page.locator('body').innerText()).slice(0,3000));process.exitCode=1}).finally(async()=>{await browser?.close();server?.close()});
