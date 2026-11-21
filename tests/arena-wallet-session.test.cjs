const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
require('esbuild').buildSync({entryPoints:['components/connect/arena-wallet-session.js'],bundle:true,platform:'node',outfile:'tmp/arena-wallet-session.cjs'});
const {ArenaWalletSession}=require('../tmp/arena-wallet-session.cjs');
function fixture(){let now=100,signs=0,requests=[];const session=new ArenaWalletSession({clock:()=>now,request:async(op,data)=>{requests.push({op,...data});return op==='challenge'?{nonce:'n',unsigned:'AQ=='}:{token:'signed-token-'+requests.length,expiresAt:now+900};}});const sign=async()=>{signs++;return [new Uint8Array([1])];};session.connect('mainnet:pera:A','A',sign);return {session,sign,requests,signs:()=>signs,time:n=>now=n};}
test('uses connected wallet signature once, deduplicates concurrent requests, and reuses valid champion proof',async()=>{
 const f=fixture(),[a,b]=await Promise.all([f.session.authorize(42),f.session.authorize(42)]);assert.equal(a,b);assert.equal(f.signs(),1);assert.equal(await f.session.authorize(42),a);assert.equal(f.signs(),1);assert.deepEqual(f.requests[0],{op:'challenge',address:'A',assetId:42});
 f.time(990);assert.notEqual(await f.session.authorize(42),a);assert.equal(f.signs(),2);
 await f.session.authorize(43);assert.equal(f.signs(),3,'champion-specific proof cannot be reused for another champion');
});
test('wallet, provider, network change and disconnect discard cached credentials',async()=>{
 const f=fixture();await f.session.authorize(42);
 for(const identity of ['mainnet:defly:A','testnet:defly:A','mainnet:defly:B']){f.session.connect(identity,identity.endsWith('B')?'B':'A',f.sign);await f.session.authorize(42);}
 assert.equal(f.signs(),4);f.session.clear();await f.session.authorize(42);assert.equal(f.signs(),5);f.session.connect('none',null,f.sign);await assert.rejects(f.session.authorize(42),/Connect your wallet/);
});
test('late signature from previous wallet cannot authenticate or enter',async()=>{
 const f=fixture();let finish,started;const begun=new Promise(r=>started=r);
 f.session.connect('mainnet:pera:A','A',async()=>{started();return new Promise(r=>finish=r);});const pending=f.session.authorize(42);await begun;
 f.session.connect('mainnet:pera:B','B',f.sign);finish([new Uint8Array([1])]);await assert.rejects(pending,/wallet changed/);assert.equal(f.requests.filter(r=>r.op==='authenticate').length,0);assert.equal(f.session.cache.size,0);
});
test('cancellation and rejected authentication do not create a session and can be retried',async()=>{
 const f=fixture();f.session.connect('mainnet:pera:A','A',async()=>[]);await assert.rejects(f.session.authorize(42),/cancelled/);assert.equal(f.session.cache.size,0);assert.equal(f.session.pending,null);
 f.session.connect('mainnet:pera:A','A',f.sign);await f.session.authorize(42);assert.equal(f.session.cache.size,1);
 const bad=new ArenaWalletSession({request:async op=>{if(op==='authenticate')throw Error('Invalid proof');return {unsigned:'AQ==',nonce:'x'};}});bad.connect('A','A',f.sign);await assert.rejects(bad.authorize(42),/Invalid proof/);assert.equal(bad.cache.size,0);
});
