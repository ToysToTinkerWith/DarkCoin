const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),source=path.join(root,'.next-arena-dev'),target=path.join(root,'functions-arena-dev','.next');
if(!fs.existsSync(path.join(source,'BUILD_ID')))throw new Error('Build the dev website first.');
if(!target.startsWith(root+path.sep)||path.relative(root,target)!==path.join('functions-arena-dev','.next'))throw new Error('Unsafe build destination');
fs.rmSync(target,{recursive:true,force:true});fs.cpSync(source,target,{recursive:true});fs.rmSync(path.join(target,'cache'),{recursive:true,force:true});
const endpoint=process.argv[2];if(!/^wss:\/\/[a-z0-9.-]+\.run\.app\/socket$/.test(endpoint||''))throw new Error('Expected Cloud Run WebSocket endpoint');
const envPath=path.join(root,'functions-arena-dev','.env');
let env=fs.existsSync(envPath)?fs.readFileSync(envPath,'utf8'):'';
for(const [key,value] of Object.entries({NEXT_PUBLIC_ARENA_DEV:'true',ARENA_TRANSPORT:'websocket',ARENA_ROOM_ID:'playground-dev-v1',ARENA_WS_URL:endpoint})){
 const pattern=new RegExp('^'+key+'=.*$','m');env=pattern.test(env)?env.replace(pattern,key+'='+value):env.replace(/\s*$/,'')+'\n'+key+'='+value+'\n';
}
fs.writeFileSync(envPath,env);
console.log('Prepared isolated development Functions build.');
