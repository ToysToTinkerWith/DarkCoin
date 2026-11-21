// Trusted release adapter. It is never copied into an editable agent directory
// with credentials; only this supervisor can call the production release CLI.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {sha,safePath}=require('./council-worker-policy.cjs');
function checked(command,args,cwd){const result=spawnSync(command,args,{cwd,stdio:'inherit',windowsHide:true,shell:false});if(result.error)throw result.error;if(result.status!==0)throw Error(`${path.basename(command)} failed (${result.status}).`);}
function validate(artifact,target){
  if(!Array.isArray(artifact.changes)||!artifact.changes.length)throw Error('No changes in release artifact.');
  const seen=new Set();
  return artifact.changes.map(change=>{
    if(seen.has(change.file))throw Error('Duplicate release path.');seen.add(change.file);
    const dest=safePath(target,change.file),source=safePath(artifact.workspace,change.file);
    const old=fs.existsSync(dest)?fs.readFileSync(dest):null,newBytes=change.after===null?null:fs.readFileSync(source);
    if((old?sha(old):null)!==change.before)throw Error(`Production changed since proposal work began: ${change.file}. Reconcile the approved behavior before release.`);
    if((newBytes?sha(newBytes):null)!==change.after)throw Error('Release artifact changed after it was prepared.');
    return {...change,dest,old,newBytes};
  });
}
async function release(file){
  if(process.env.COUNCIL_AUTO_RELEASE!=='true')throw Error('Automatic release is not activated.');
  const target=path.resolve(process.env.COUNCIL_RELEASE_TARGET||'');if(!process.env.COUNCIL_RELEASE_TARGET)throw Error('Set the trusted production source directory.');
  const artifact=JSON.parse(fs.readFileSync(file)),lock=path.join(target,'.council-release.lock');
  const descriptor=fs.openSync(lock,'wx');let edits=[],published=false;
  try{
    edits=validate(artifact,target);
    for(const edit of edits){fs.mkdirSync(path.dirname(edit.dest),{recursive:true});if(edit.newBytes)fs.writeFileSync(edit.dest,edit.newBytes);else fs.unlinkSync(edit.dest);}
    checked(process.execPath,['--test','tests/council.test.cjs','tests/council-chain.test.cjs','tests/market.test.cjs','tests/arena-combat.test.cjs','tests/arena-encounter-rules.test.cjs','tests/arena-realtime.test.cjs'],target);
    checked(process.execPath,[path.join(target,'node_modules/next/dist/bin/next'),'build'],target);
    checked(process.execPath,[path.join(target,'scripts/copy-next-to-functions.js')],target);
    const cli=process.env.COUNCIL_FIREBASE_CLI;if(!cli||!path.isAbsolute(cli))throw Error('Set an absolute path to the trusted firebase-tools CLI JavaScript entry point.');
    // Approval covers this fixed deploy target, never arbitrary model commands.
    checked(process.execPath,[cli,'deploy','--only','functions:nextServer,hosting','--project','dark-coin-dc4a3','--non-interactive'],target);
    published=true;
  }finally{
    if(!published)for(const edit of edits){if(edit.old)fs.writeFileSync(edit.dest,edit.old);else if(fs.existsSync(edit.dest))fs.unlinkSync(edit.dest);}
    fs.closeSync(descriptor);fs.unlinkSync(lock);
  }
}
if(require.main===module)release(process.argv[2]).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={validate};
