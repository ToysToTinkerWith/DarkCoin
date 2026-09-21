const path=require('path');
const root=path.resolve(__dirname,'..');
require('../tmp/champion-model-tools/node_modules/esbuild').buildSync({entryPoints:[path.join(root,'pages/api/arena/combat.js')],bundle:true,platform:'node',format:'cjs',target:'node24',outfile:path.join(root,'functions/arenaCombat.bundle.cjs'),external:['firebase-admin','algosdk'],define:{'process.env.NODE_ENV':'"production"'},legalComments:'none'});
console.log('Built standalone Firebase arena authority.');
