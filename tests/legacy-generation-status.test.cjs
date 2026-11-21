const {test}=require('node:test'),assert=require('node:assert/strict');
require('esbuild').buildSync({entryPoints:['lib/legacy-generation-status.js'],bundle:true,platform:'node',outfile:'tmp/legacy-generation-status-tests.cjs'});
const {legacyGenerationProgress,queuedGenerationStatus}=require('../tmp/legacy-generation-status-tests.cjs');

test('a new queue receipt replaces the old completion before the live snapshot arrives',()=>{
 const previous={generationJobId:'old',status:'completed',progress:100,charObj:{name:'Saved champion'}};
 const queued=queuedGenerationStatus(previous,'new');
 assert.equal(queued.status,'queued');assert.equal(queued.generationJobId,'new');assert.equal(queued.progress,0);
 assert.equal(queued.charObj,previous.charObj);assert.equal(previous.status,'completed');
 assert.deepEqual(legacyGenerationProgress(queued),{active:true,failed:false,percent:0,label:'Waiting for the generation server'});
});
test('a late queue response cannot overwrite live progress or completion for the same job',()=>{
 for(const status of ['generating_images','completed','failed']){
  const live={generationJobId:'new',status,progress:84};
  assert.equal(queuedGenerationStatus(live,'new'),live);
 }
});
test('progress follows worker stages and terminal states without inventing completion',()=>{
 assert.equal(legacyGenerationProgress(null),null);
 assert.equal(legacyGenerationProgress({status:'completed'}),null);
 assert.deepEqual(legacyGenerationProgress({status:'generating_images',stage:'move_2_assets_generated',progress:84}),{active:true,failed:false,percent:84,label:'Move 2 assets generated'});
 assert.equal(legacyGenerationProgress({status:'generating_images',stage:'generating_move_3_animation_sheet',progress:80}).label,'Generating move 3 animation');
 for(const progress of [NaN,'invalid',-20])assert.equal(legacyGenerationProgress({status:'starting',progress}).percent,0);
 assert.equal(legacyGenerationProgress({status:'generating_images',progress:200}).percent,99);
 assert.equal(legacyGenerationProgress({generationJobId:'new',status:'completed',progress:0}).percent,100);
 for(const status of ['error','failed'])assert.equal(legacyGenerationProgress({status}).failed,true);
});
