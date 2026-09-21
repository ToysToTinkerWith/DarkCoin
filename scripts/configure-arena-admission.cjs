const fs=require('fs'),path=require('path');
const url=new URL(process.argv[2]);if(url.protocol!=='wss:'||!url.hostname.endsWith('.run.app')||url.pathname!=='/socket')throw new Error('Expected the dedicated Cloud Run WSS endpoint');
const file=path.resolve(__dirname,'../functions/.env');let text=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
for(const [key,value] of Object.entries({ARENA_TRANSPORT:'websocket',ARENA_WS_URL:url.toString()})){
 const pattern=new RegExp('^'+key+'=.*$','m');text=pattern.test(text)?text.replace(pattern,key+'='+value):text.trimEnd()+'\n'+key+'='+value+'\n';
}
fs.writeFileSync(file,text);console.log('Configured admission to use the dedicated WebSocket service; public entry flag unchanged.');
