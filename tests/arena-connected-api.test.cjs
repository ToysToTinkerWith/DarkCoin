const {test,before}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),algo=require('algosdk');
const root=path.resolve(__dirname,'..'),esbuild=require('esbuild');let api;
const owner=algo.generateAccount().addr.toString(),other=algo.generateAccount().addr.toString();
before(async()=>{
 await esbuild.build({stdin:{resolveDir:root,contents:"export {default as combat} from './pages/api/arena/combat';export {default as economy} from './pages/api/arena/economy';export {verifyTicket} from './lib/arena/tickets';"},bundle:true,platform:'node',external:['algosdk'],outfile:path.join(root,'tmp/arena-connected-api.cjs'),plugins:[{name:'dependencies',setup(b){
  b.onResolve({filter:/firebaseServer$|\/treasury$|^\.\/playground$|\/availability$/},a=>({path:a.path,namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path.endsWith('firebaseServer')?`export const arenaDatabase=()=>global.fixture.db;`:a.path.endsWith('treasury')?`export const economyConfig=()=>({enabled:true,appId:123});export const treasuryClient=()=>({accountAssetInformation:(address,id)=>({do:async()=>{global.fixture.holdings.push({address,id});return {assetHolding:{amount:global.fixture.amount}};}})});export const readBox=async()=>{const b=Buffer.alloc(40);b.writeBigUInt64BE((global.fixture.claimed||0n)|(global.fixture.authorized===false?0n:256n),32);return b;};export const encounterKey=h=>h;export const claimTransaction=async(address,hour,claim)=>{if(address!==claim.address)throw Error('Wrong recipient');return {transactions:['unsigned-fixture'],address,hour};};`:a.path.endsWith('availability')?`export const PLAYGROUND_JOIN_ENABLED=true;export const PLAYGROUND_PAUSED_MESSAGE='Paused';`:`export default async(req,res)=>res.json({id:Number(req.query.assetId),loadout:{skin:'Undead',weapon:'scythe'}});`}));
 }}]});api=require('../tmp/arena-connected-api.cjs');
});
function response(){return {statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(data){this.body=data;return this;}};}
test('entry without Bearer or wallet signature creates an owner-bound server ticket; lost holdings reject',async()=>{
 process.env.ARENA_TRANSPORT='websocket';process.env.ARENA_WS_URL='wss://fixture/socket';process.env.ARENA_TICKET_SECRET='test-secret-'.repeat(5);
 global.fixture={holdings:[],amount:1n};const res=response();await api.combat({method:'POST',headers:{'x-forwarded-for':'test-1'},body:{op:'join',assetId:99,address:owner}},res);
 assert.equal(res.statusCode,200);const claims=api.verifyTicket(res.body.session.ticket,process.env.ARENA_TICKET_SECRET);assert.equal(claims.address,owner);assert.equal(claims.ownershipChecked,true);assert(!claims.walletVerified);assert.deepEqual(global.fixture.holdings,[{address:owner,id:99}]);
 global.fixture.amount=0n;const reject=response();await api.combat({method:'POST',headers:{'x-forwarded-for':'test-2'},body:{op:'join',assetId:99,address:other}},reject);assert.equal(reject.statusCode,400);assert.match(reject.body.error,/no longer owns/);
});
test('unsigned saved-claim preparation needs no sign-in but cannot change the assigned recipient or redeem twice',async()=>{
 global.fixture={db:{collection:()=>({doc:()=>({get:async()=>({data:()=>({rewardWallet:owner,pickedUpAt:global.fixture.unpicked?undefined:1,lootVersion:2,claim:{address:owner,rewardAssetId:5}})})})})}};
 const run=async address=>{const res=response();await api.economy({method:'POST',headers:{},body:{op:'claim',address,hour:10,slot:0}},res);return res;};
 global.fixture.unpicked=true;const unpicked=await run(owner);assert.equal(unpicked.statusCode,400);assert.match(unpicked.body.error,/Pick up this drop/);
 global.fixture.unpicked=false;global.fixture.authorized=false;const locked=await run(owner);assert.equal(locked.statusCode,400);assert.match(locked.body.error,/being confirmed/);global.fixture.authorized=true;
 const good=await run(owner);assert.equal(good.statusCode,200);assert.equal(good.body.address,owner);assert.equal(good.body.transactions[0],'unsigned-fixture');
 const bad=await run(other);assert.equal(bad.statusCode,400);assert.match(bad.body.error,/No published reward/);
 global.fixture.claimed=1n;const again=await run(owner);assert.equal(again.statusCode,400);assert.match(again.body.error,/already been claimed/);
});

test('admission rejects client-invented XP and binds only validated skill ranks into its signed ticket',async()=>{
 process.env.ARENA_TRANSPORT='websocket';process.env.ARENA_WS_URL='wss://fixture/socket';process.env.ARENA_TICKET_SECRET='test-secret-'.repeat(5);
 global.fixture={holdings:[],amount:1n};
 const bad=response();await api.combat({method:'POST',headers:{'x-forwarded-for':'skills-bad'},body:{op:'join',assetId:99,address:owner,progression:{xp:'999999'},skills:{vitality:3}}},bad);assert.equal(bad.statusCode,400);assert.match(bad.body.error,/exceeds/);
 const good=response();await api.combat({method:'POST',headers:{'x-forwarded-for':'skills-good'},body:{op:'join',assetId:99,address:owner,skills:{vitality:1}}},good);assert.equal(good.statusCode,200);assert.deepEqual(api.verifyTicket(good.body.session.ticket,process.env.ARENA_TICKET_SECRET).champion.skills,{vitality:1});
});
