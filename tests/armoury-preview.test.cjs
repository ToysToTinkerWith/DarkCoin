const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
require('esbuild').buildSync({stdin:{contents:"export * from './components/contracts/Arena/armoury-preview-data';export * from './components/arena/playground/preview-data';export * from './components/contracts/Arena/arenaBalanceV1';",resolveDir:path.resolve(__dirname,'..')},bundle:true,platform:'node',outfile:'tmp/armoury-preview-test.cjs'});
const s=require('../tmp/armoury-preview-test.cjs');
const equipped=Object.fromEntries(Object.entries({Skin:'Undead',Background:'Dawn Background',Head:'Bone',Armour:'Leather Garb',Weapon:'Scythe',Magic:'Fire Magic',Extra:'Hoop Earring'}).map(([type,name])=>[type,{name,type}]));
test('draft selections override equipped traits and removals stay empty without mutating the NFT',()=>{
 const original=JSON.stringify(equipped),c=s.draftChampion({id:123,name:'Long champion name',equipped,changes:{Weapon:{name:'Dragon Longsword'},Armour:'Remove',Magic:'None',Extra:'Remove'}});
 assert.equal(c.loadout.weapon,'dragon_longsword');assert.equal(c.loadout.armour,null);assert.equal(c.loadout.extra,null);assert.equal(c.loadout.magic,'fire_magic');assert.equal(c.loadout.skin,'Undead');assert.equal(JSON.stringify(equipped),original);
 const stats=s.championPreview(c.loadout);assert.equal(stats.selected.weapon.id,'dragon_longsword');assert.equal(stats.selected.armour,null);assert(!Object.values(stats.contributions).flat().some(c=>c.name==='Leather Garb'));
});
test('reverting and removing weapons restore their proper stats and unarmed attack',()=>{
 const original=s.draftChampion({id:123,equipped,changes:{Weapon:'None'}});assert.equal(original.loadout.weapon,'scythe');
 const empty=s.draftChampion({id:123,equipped,changes:{Weapon:'Remove',Head:'Remove',Magic:'Remove'}});assert.equal(empty.loadout.weapon,null);assert.equal(empty.loadout.head,null);assert.equal(s.championPreview(empty.loadout).selected.weapon.id,'unarmed');
});
test('all current arena traits use the same ability/stat definitions in armoury cards',()=>{
 for(const [type,entries] of Object.entries(s.TRAITS))for(const trait of Object.values(entries)){assert.equal(s.armouryTrait(type,{name:trait.name})?.id,trait.id,`${type}: ${trait.name}`);}
 assert.equal(s.armouryTrait('Weapon',null),null);assert.equal(s.armouryTrait('Weapon',{name:'unknown trait'}),null);
});
