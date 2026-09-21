const path=require('path'),root=path.resolve(__dirname,'..');
require('../tmp/champion-model-tools/node_modules/esbuild').buildSync({entryPoints:[path.join(root,'arena-server/main.js')],bundle:true,platform:'node',format:'cjs',target:'node24',outfile:path.join(root,'arena-server/server.cjs'),external:['firebase-admin','ws'],legalComments:'none'});
console.log('Built authoritative WebSocket room worker.');
