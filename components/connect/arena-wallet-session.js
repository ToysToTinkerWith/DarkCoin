import {Buffer} from 'buffer';

// In-memory proof cache shared by the site's wallet connector and arena.
// Connecting an address is never treated as a server-verified signature.
export class ArenaWalletSession {
 constructor({request,clock=()=>Date.now()/1000,changed=()=>{}}){Object.assign(this,{request,clock,changed});this.generation=0;this.cache=new Map();}
 connect(identity,address,signTransactions){
  if(identity!==this.identity){this.generation++;this.cache.clear();this.pending=null;}
  Object.assign(this,{identity,address,signTransactions});
 }
 clear(){this.generation++;this.cache.clear();this.pending=null;this.changed();}
 async authorize(assetId){
  if(!this.address)throw new Error('Connect your wallet using the wallet button above.');
  if(!Number.isSafeInteger(assetId)||assetId<1)throw new Error('Select a champion first.');
  const cached=this.cache.get(assetId);if(cached?.expiresAt>this.clock()+30)return cached.token;
  if(this.pending){if(this.pending.assetId===assetId)return this.pending.promise;throw new Error('Finish the current wallet request first.');}
  const generation=this.generation,address=this.address,sign=this.signTransactions;
  const check=()=>{if(generation!==this.generation)throw new Error('Your connected wallet changed. Please enter again.');};
  const work=async()=>{
   const challenge=await this.request('challenge',{address,assetId});check();
   const signed=await sign([new Uint8Array(Buffer.from(challenge.unsigned,'base64'))]);check();
   if(!signed?.[0])throw new Error('Wallet sign-in cancelled.');
   const auth=await this.request('authenticate',{nonce:challenge.nonce,signed:Buffer.from(signed[0]).toString('base64')});check();
   if(!auth.token||auth.expiresAt<=this.clock())throw new Error('Wallet sign-in expired. Please try again.');
   this.cache.set(assetId,auth);return auth.token;
  };
  // Defer work until pending is set, including synchronous test transports.
  const promise=Promise.resolve().then(work).finally(()=>{if(this.pending?.promise===promise){this.pending=null;this.changed();}});
  this.pending={assetId,promise};this.changed();return promise;
 }
}
