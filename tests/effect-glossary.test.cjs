const {test}=require('node:test'),assert=require('node:assert/strict');require('esbuild').buildSync({entryPoints:['lib/effect-glossary.js'],bundle:true,platform:'node',outfile:'tmp/effect-glossary-tests.cjs'});const {effectMatches,EFFECT_GLOSSARY}=require('../tmp/effect-glossary-tests.cjs');
test('effect matching is case independent, matches whole words, and prefers complete phrases',()=>{assert.deepEqual(effectMatches('Stagger, staggered, BLEED and critical hit').map(m=>m.key),['stagger','bleed','critical hit']);assert(effectMatches('No pending trait changes').length===0);assert(EFFECT_GLOSSARY.stagger.includes('Interrupt'));assert(EFFECT_GLOSSARY.tenacity.includes('does not shorten'));});
const {CLASSIC_EFFECT_GLOSSARY,effectRulesetForPath,effectGlossary}=require('../tmp/effect-glossary-tests.cjs');
test('classic glossary explains original Doom, potency and defenses without Playtest mechanics',()=>{
 assert.match(CLASSIC_EFFECT_GLOSSARY.doom,/-0.1 HP before turn per stack/);
 assert.match(CLASSIC_EFFECT_GLOSSARY.doom,/-0.4 resist per stack/);
 assert.match(CLASSIC_EFFECT_GLOSSARY.doom,/\+0.2 strength per stack/);
 assert.match(CLASSIC_EFFECT_GLOSSARY.potency,/adds more Doom stacks/);
 assert.match(CLASSIC_EFFECT_GLOSSARY.resistance,/chance to resist an incoming negative effect/);
 assert.match(CLASSIC_EFFECT_GLOSSARY.cooldown,/base cooldown multiplied by 50/);
 assert.match(CLASSIC_EFFECT_GLOSSARY.shield,/0.5/);
 for(const text of Object.values(CLASSIC_EFFECT_GLOSSARY))assert.doesNotMatch(text,/3D|Playtest|stamina|mana|refresh.*duration|whole-number/i);
 assert.deepEqual(effectMatches('Doom potency, Shield, Nurture, Stagger and mana','classic').map(m=>m.key),['doom','potency','shield','nurture']);
 assert.equal(effectGlossary('classic'),CLASSIC_EFFECT_GLOSSARY);
 assert.match(effectGlossary('playtest').potency,/3D arena/);
});
test('classic route selection supports nested pages and queries without leaking into Playtest',()=>{
 for(const path of ['/arena/depths','/arena/depths?run=7','/arena/fight','/arena/sims','/arena/dragonshorde/tree','/arena/effectsOld'])assert.equal(effectRulesetForPath(path),'classic',path);
 for(const path of ['/arena/playtest','/arena/playground','/arena/armory','/arena/depths-other','/'])assert.equal(effectRulesetForPath(path),'playtest',path);
});
