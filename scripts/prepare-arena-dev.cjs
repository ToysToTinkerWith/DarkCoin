const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),source=path.join(root,'.next-arena-dev'),target=path.join(root,'functions-arena-dev','.next');
if(!fs.existsSync(path.join(source,'BUILD_ID')))throw new Error('Build the dev website first.');
if(!target.startsWith(root+path.sep)||path.relative(root,target)!==path.join('functions-arena-dev','.next'))throw new Error('Unsafe build destination');
fs.rmSync(target,{recursive:true,force:true});fs.cpSync(source,target,{recursive:true});fs.rmSync(path.join(target,'cache'),{recursive:true,force:true});
const endpoint=process.argv[2];if(!/^wss:\/\/[a-z0-9.-]+\.run\.app\/socket$/.test(endpoint||''))throw new Error('Expected Cloud Run WebSocket endpoint');
fs.writeFileSync(path.join(root,'functions-arena-dev','.env'),'NEXT_PUBLIC_ARENA_DEV=true\nARENA_TRANSPORT=websocket\nARENA_ROOM_ID=playground-dev-v1\nARENA_WS_URL='+endpoint+'\n');
console.log('Prepared isolated development Functions build.');
