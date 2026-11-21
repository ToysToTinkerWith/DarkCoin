const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
require('esbuild').buildSync({entryPoints:['components/arena/playground/ArenaEncounterHud.js'],bundle:true,platform:'node',loader:{'.js':'jsx'},outfile:'tmp/encounter-hud-tests.cjs',external:['react']});
const {encounterHudState:view}=require('../tmp/encounter-hud-tests.cjs');
test('spawn display counts down server time, clamps expired deadlines, and covers the hour cooldown',()=>{
 const e={status:'waiting',name:'Graveclaw',nextSpawnAt:500,countdownStartedAt:380};
 assert.equal(view(e,null,380).value,'2:00');assert.equal(view(e,null,381).value,'1:59');assert.equal(view(e,null,440).ratio,.5);
 assert.equal(view({...e,countdownStartedAt:null},null,440).ratio,.5);
 assert.equal(view(e,null,380).label,'NEXT CHALLENGE');
 assert.equal(view(e,null,500).value,'Emerging…');assert.equal(view(e,null,600).ratio,0);
 assert.equal(view({...e,status:'defeated',nextSpawnAt:3800,countdownStartedAt:null,defeatedAt:200},null,2000).ratio,.5);
 assert.equal(view({...e,nextSpawnAt:null},null,600).value,'Waiting for champions');
});
test('spawn bar changes into scaled monster health and reflects damage, heals, and return',()=>{
 const e={status:'active',name:'Graveclaw'},b={hp:256,maxHealth:512};
 assert.equal(view(e,b,500).fighting,true);assert.equal(view(e,b,500).value,'256 / 512');assert.equal(view(e,b,500).ratio,.5);
 assert.equal(view(e,{...b,hp:384},500).ratio,.75);assert.equal(view({...e,status:'returning'},b,500).label,'Returning to his grave');
 assert.equal(view({...e,status:'defeated',defeatedAt:500,nextSpawnAt:4100},b,500).fighting,undefined);
});
