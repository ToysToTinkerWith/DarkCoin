const {spawn}=require('child_process'),assert=require('node:assert/strict');
(async()=>{
 const port=20000+Math.floor(Math.random()*10000),child=spawn(process.execPath,['arena-server/server.cjs'],{env:{...process.env,NODE_ENV:'production',GCLOUD_PROJECT:'local-startup-test',PORT:String(port),ARENA_TICKET_SECRET:'local-startup-check-only-'.repeat(3)},stdio:['ignore','pipe','pipe']});let output='';child.stderr.on('data',b=>output+=b.toString());
 try{
  let response;for(let i=0;i<150;i++){if(child.exitCode!=null)throw new Error(output||'Worker exited');try{response=await fetch('http://127.0.0.1:'+port+'/healthz');break;}catch{await new Promise(r=>setTimeout(r,100));}}
  assert(response?.ok,output||'Worker did not start');assert.equal((await response.json()).protocol,1);console.log('PASS production worker starts with its installed SDK and serves health checks without database access.');
 }finally{child.kill();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});

