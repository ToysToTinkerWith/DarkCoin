// Dedicated development entry point. Never deploy this over nextServer.
const {onRequest}=require('firebase-functions/v2/https');
process.env.ARENA_TICKET_SECRET=process.env.ARENA_DEV_TICKET_SECRET;
const next=require('next');
const app=next({dev:false,dir:__dirname,conf:{distDir:'.next'}});
const handle=app.getRequestHandler();let prepared;
const apiPaths=new Set(['/api/getDcAssets','/api/arena/playground','/api/arena/combat']);
exports.arenaDevWeb=onRequest({region:'us-central1',memory:'1GiB',maxInstances:2,timeoutSeconds:60,secrets:['ARENA_DEV_TICKET_SECRET']},async(req,res)=>{
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 const pathname=new URL(req.url,'https://arena-dev.invalid').pathname;
 // This deployment exposes only practice entry and read-only NFT lookup APIs.
 if(pathname.startsWith('/api/')&&!apiPaths.has(pathname))return res.status(404).json({error:'This API is unavailable in the playground development build.'});
 if(pathname==='/'){res.redirect(302,'/arena/playground');return;}
 if(!pathname.startsWith('/api/')&&!pathname.startsWith('/_next/')&&!['/arena','/arena/playground'].includes(pathname)){res.redirect(302,'https://dark-coin.com'+pathname);return;}
 try{if(!prepared)prepared=app.prepare();await prepared;return handle(req,res);}catch(error){console.error('Arena dev render failed:',error.message);res.status(500).send('Development server unavailable. Please retry.');}
});
