const path=require('node:path');
require('esbuild').buildSync({stdin:{contents:"export * from './lib/arena/encounter-schedule'; export * from './lib/arena/discord-notifications'; export * from './lib/arena/reward-publisher'; export * from './lib/arena/reward-delivery';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',target:'node24',outfile:path.resolve('functions/arenaRewards.bundle.cjs'),external:['algosdk'],legalComments:'none'});
console.log('Built durable arena reward publisher.');
