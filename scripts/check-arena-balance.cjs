// Offline design validation; this does not run or modify live arena combat.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
  const esbuild=require('../tmp/champion-model-tools/node_modules/esbuild');
  const outfile=path.join(root,'tmp/arena-balance-v1-check.cjs');
  await esbuild.build({entryPoints:[path.join(root,'components/contracts/Arena/arenaBalanceV1.js')],bundle:true,platform:'node',format:'cjs',outfile,logLevel:'silent'});
  const b=require(outfile),{ARENA_RULES:r,TRAITS,WEAPONS,HEADS,ARMOUR,EXTRAS,STATUS_EFFECTS}=b;
  // Read identities independently of the candidate, including every source category.
  const original=path.join(root,'tmp/arena-identities-check.cjs');
  await esbuild.build({entryPoints:[path.join(root,'components/contracts/Arena/3dTraitsData.js')],bundle:true,platform:'node',format:'cjs',outfile:original,logLevel:'silent'});
  const source=require(original).CHAMPION_TRAITS,catalog=require('../lib/playground').catalog;
  const categoryModels={Head:'heads',Armour:'armour',Weapon:'weapons',Magic:'magic',Extra:'extras'};
  for(const [category,entries] of Object.entries(TRAITS)){
    assert.deepEqual(Object.values(entries).map(e=>e.name).sort(),source[category].map(e=>e.trait).sort(),category+' complete coverage');
    if(categoryModels[category])assert.deepEqual(Object.keys(entries).sort(),Object.keys(catalog[categoryModels[category]]).sort(),category+' model ids');
    for(const entry of Object.values(entries)){
      const identity=source[category].find(e=>e.trait===entry.name);assert.equal(entry.assetId,identity.assetId??null);
      assert(entry.abilities.length>=1&&entry.abilities.length<=2);
      assert.equal(entry.abilities.reduce((sum,a)=>sum+a.budgetWeight,0),b.SLOT_BUDGETS[category]);
      for(const ability of entry.abilities){
        assert(ability.name&&ability.description&&ability.trigger);
        assert(['always','conditional','guard','activeAbility',...Object.keys(r.perks.eventDefinitions)].includes(ability.trigger),'known event '+ability.trigger);
        for(const key of Object.keys(ability.statBonuses||{}))assert(b.STAT_DEFINITIONS[key]);
        if(ability.chance!=null)assert(ability.chance>=0&&ability.chance<=1);
        if(ability.cooldownSeconds!=null)assert(ability.cooldownSeconds>=0);
        for(const action of ability.actions||[]){
          assert(['buff','heal','restoreStamina','barrier','cleanse','applyStatus','refundAbilityCooldown'].includes(action.type));
          if(action.type==='applyStatus')assert(STATUS_EFFECTS[action.id]);
          if(action.type==='buff')for(const key of Object.keys(action.stats))assert(b.STAT_DEFINITIONS[key]);
        }
      }
      assert(entry.effects.length>0);assert.deepEqual(entry.effects,b.describeTrait(entry));assert(!('total' in entry));for(const key of Object.keys(entry.statBonuses))assert(key in b.STAT_DEFINITIONS);
    }
  }
  const weapons=[];
  for(const [id,w] of Object.entries(WEAPONS)){
    assert.deepEqual(w.critical,r.damage.crits);assert(['weapon','ability'].includes(w.powerSource));
    assert(w.damageRolls.every(roll=>b.diceStatistics(roll).min>0));assert(w.cycleSeconds>0);assert(w.reachM>0);assert(w.damageType in b.DAMAGE_PALETTE);
    const file=path.join(root,'public/arena/playground/assets/weapons',id+'.json');
    const authored=id==='scythe'?1.5:JSON.parse(fs.readFileSync(file)).durations.Swing;
    const timing=b.attackTiming(id,authored,0);assert(Math.abs(authored/timing.speedFactor-w.cycleSeconds)<1e-9);
    assert(b.attackTiming(id,authored,12).durationSeconds<timing.durationSeconds);
    let dotDps=0;
    for(const effect of w.onHit){const status=STATUS_EFFECTS[effect.id];assert(status,'valid status');assert.equal(effect.cooldownSeconds,undefined);assert.equal(effect.strike,'each');assert(effect.potency>0&&effect.potency<=2);
      if(status.kind==='dot'){assert(effect.chance>0);const applicationPeriod=w.cycleSeconds/(effect.chance*w.damageRolls.length);
        dotDps+=status.damagePerSecond*effect.potency*Math.min(1,status.durationSeconds/applicationPeriod);}}
    const profile=b.criticalProfile(b.applyStatBonuses(r.base,w.statBonuses));const directDps=w.damageRolls.reduce((a,roll)=>a+b.diceStatistics(roll).mean*(1+profile.chance*(profile.multiplier-1)),0)/w.cycleSeconds*(1+(w.statBonuses.hastePct||0)/100),totalDps=directDps+dotDps;
    assert(totalDps>=r.targets.weaponRawSustainedDps[0]&&totalDps<=r.targets.weaponRawSustainedDps[1],id+' sustained DPS target: '+totalDps);
    if(w.attackKind==='projectile')assert(w.projectile.maxRangeM===w.reachM&&w.projectile.speedMps>r.movement.runMps);
    weapons.push({id,damage:w.damageRolls.join(' / '),maxCriticalHit:Math.max(...w.damageRolls.map(roll=>b.diceStatistics(roll).max*2)),cycleSeconds:w.cycleSeconds,speedFactor:Number(timing.speedFactor.toFixed(3)),reachM:w.reachM,
      directDps:Number(directDps.toFixed(2)),dotDps:Number(dotDps.toFixed(2)),totalDps:Number(totalDps.toFixed(2)),damageType:w.damageType,procs:w.onHit.map(e=>({status:e.id,chance:e.chance,potency:e.potency}))});
  }
  for(const [id,a] of Object.entries(b.MAGIC)){
    assert.deepEqual(a.critical,r.damage.crits);assert.equal(a.powerSource,'ability');
    assert(b.diceStatistics(a.damageRoll).min>0&&a.castSeconds<a.cooldownSeconds);assert(a.releasePhase>0&&a.releasePhase<1);assert(a.damageType in b.DAMAGE_PALETTE);
    for(const effect of a.onHit)assert(STATUS_EFFECTS[effect.id]);
    assert(b.abilityTiming(id,20).cooldownSeconds>=a.cooldownSeconds*.8-1e-9);
    assert.equal(b.abilityTiming(id,20).castSeconds,a.castSeconds);const fast=b.abilityTiming(id,20,15);assert(fast.castSeconds>=.55&&fast.castSeconds<a.castSeconds);assert.equal(fast.recastIntervalSeconds,fast.castSeconds+fast.cooldownSeconds);assert(fast.cooldownStarts.startsWith('When the cast finishes'));assert(a.projectile.widthM>0&&a.projectile.widthM<=.6&&a.projectile.maxRangeM>=9);assert.equal(a.projectile.radiusM,undefined);if(a.impactField)assert(b.diceStatistics(a.impactField.damageRateRoll).min>0&&a.impactField.canCrit===false);
  }
  const ranges=Object.fromEntries(Object.keys(r.base).map(k=>[k,[Infinity,-Infinity]]));let combinations=0;
  for(const head of Object.keys(HEADS))for(const armour of Object.keys(ARMOUR))for(const extra of Object.keys(EXTRAS))for(const weapon of Object.keys(WEAPONS)){
    const {stats}=b.buildArenaStats({head,armour,extra,weapon,skin:'Undead'});combinations++;
    for(const [key,value] of Object.entries(stats)){assert(Number.isFinite(value));assert(value>=r.caps[key][0]&&value<=r.caps[key][1]);ranges[key][0]=Math.min(ranges[key][0],value);ranges[key][1]=Math.max(ranges[key][1],value);}
  }
  assert.deepEqual(b.SKINS.dark_skin.statBonuses,b.SKINS.light_skin.statBonuses);
  assert.deepEqual(b.SKINS.tribal_dark_skin.statBonuses,b.SKINS.tribal_light_skin.statBonuses);
  for(const type of b.DAMAGE_TYPES){
    assert.equal(b.mitigatedDamage(120,type,{}, {[type+'Resistance']:20}),100);
    const other=b.DAMAGE_TYPES.find(t=>t!==type);assert.equal(b.mitigatedDamage(120,type,{}, {[other+'Resistance']:65}),100,'wrong resistance never protects');
    assert(b.mitigatedDamage(120,type,{}, {[type+'Resistance']:65})<100);
  }
  assert.equal(b.mitigatedDamage(100,'fire',{weaponPowerPct:10,abilityPowerPct:0},{fireResistance:0},'ability'),100);
  assert.equal(WEAPONS.dragon_staff.powerSource,'ability');assert.equal(WEAPONS.lightning_staff.powerSource,'ability');assert.equal(WEAPONS.dragon_longsword.powerSource,'weapon');
  assert(Math.abs(b.mitigatedDamage(100,'fire',{abilityPowerPct:10},{fireResistance:0},WEAPONS.dragon_staff.powerSource)-110)<1e-9);
  assert(Math.abs(b.mitigatedDamage(100,'fire',{weaponPowerPct:10},{fireResistance:0},'weapon')-110)<1e-9);
  // Exact min/max for each independent additive stat across ALL seven slots.
  const allSlotRanges={};
  const slots=[['head',HEADS],['armour',ARMOUR],['extra',EXTRAS],['weapon',WEAPONS],['magic',b.MAGIC],['skin',b.SKINS],['background',b.BACKGROUNDS]];
  for(const key of Object.keys(r.base)){
    const raw=[r.base[key],r.base[key]];
    for(const [,entries] of slots){const values=Object.values(entries).map(e=>e.statBonuses[key]||0);raw[0]+=Math.min(...values);raw[1]+=Math.max(...values);}
    allSlotRanges[key]={raw,clamped:raw.map(v=>Math.max(r.caps[key][0],Math.min(r.caps[key][1],v)))};
    for(const direction of [0,1]){const loadout={};for(const [slot,entries] of slots){loadout[slot]=Object.keys(entries).sort((a,c)=>(direction?1:-1)*((entries[c].statBonuses[key]||0)-(entries[a].statBonuses[key]||0)))[0];}assert(Math.abs(b.buildArenaStats(loadout).stats[key]-allSlotRanges[key].clamped[direction])<1e-8);}
  }
  // Deterministic RNG verifies distributions, not merely configured labels.
  let seed=0x19ae417;const rng=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  const distributions=[];
  const rolls=[...new Set([...Object.values(WEAPONS).flatMap(w=>w.damageRolls),...Object.values(b.MAGIC).map(a=>a.damageRoll)])];
  for(const roll of rolls){
    const d=b.diceStatistics(roll),samples=50000;let sum=0,crits=0;
    for(let i=0;i<samples;i++){const hit=b.resolveDirectHit(roll,'slashing',{}, {slashingResistance:0},'weapon',rng);assert(hit.total>=d.min&&hit.total<=d.max);assert.equal(hit.rawDamage,hit.total*(hit.critical?2:1));sum+=hit.damage;crits+=Number(hit.critical);}
    const mean=d.mean*1.1,variance=1.3*d.variance+.09*d.mean*d.mean;
    assert(Math.abs(sum/samples-mean)<5*Math.sqrt(variance/samples));assert(Math.abs(crits/samples-.1)<.006);
    distributions.push({roll,samples,expectedMean:mean,sampledMean:sum/samples,critRate:crits/samples});
  }
  let values=[0,.999,.099999];let hit=b.resolveDirectHit('2d6+5','fire',{}, {fireResistance:0},'ability',()=>values.shift());assert.equal(hit.total,12);assert.equal(hit.damage,24);assert(hit.critical);
  values=[0,.999,.1];hit=b.resolveDirectHit('2d6+5','fire',{}, {fireResistance:0},'ability',()=>values.shift());assert.equal(hit.damage,12);assert(!hit.critical);
  assert.throws(()=>b.rollDice('0d6',rng));assert.throws(()=>b.rollDice('1d6',()=>1));assert.throws(()=>b.rollDice('1d6'));assert.throws(()=>b.mitigatedDamage(10,'typo'));
  assert.throws(()=>b.buildArenaStats({weapon:'typo'}));assert.throws(()=>b.attackTiming('dark_sword',0));assert.throws(()=>b.abilityTiming('typo'));
  const allTraits=Object.values(TRAITS).flatMap(Object.values),onePerk=allTraits.filter(e=>e.abilities.length===1).length;
  for(const e of allTraits)assert.equal(new Set(e.abilities.map(a=>a.id)).size,e.abilities.length,'unique perk keys within each trait');
  for(const w of Object.values(WEAPONS))for(const roll of w.damageRolls)assert(b.diceStatistics(roll).max*r.caps.critMultiplier[1]*(1+r.damage.combinedPowerCapPct/100)<r.base.maxHealth,'one direct hit cannot erase baseline full health even before resistance');
  for(const w of Object.values(WEAPONS))assert.equal(w.abilities.filter(a=>a.handler==='weaponOnHit').length,w.onHit.length,'linked proc descriptions are not extra handlers');
  assert(onePerk/allTraits.length>.75,'most traits have one perk');
  const resistancePerks=allTraits.flatMap(e=>e.abilities).filter(a=>Object.keys(a.statBonuses||{}).some(k=>k.endsWith('Resistance'))).length;
  assert(resistancePerks<20,'resistances are a minority');
  assert.deepEqual(b.criticalProfile({critChancePct:90,critMultiplier:5}),{chance:.25,multiplier:2.5});
  assert.deepEqual(b.criticalProfile(b.buildArenaStats({head:'dragon',armour:'rogue',extra:'fusion_pearl_earring',weapon:'dual_katana',background:'midnight_background'}).stats),{chance:.25,multiplier:2});
  assert.equal(b.criticalProfile(b.buildArenaStats({head:'barbarian',armour:'executioner_robe',extra:'dragon_fangs_earring',weapon:'rusty_sword',background:'blood_background'}).stats).multiplier,2.5);
  assert(!b.buildArenaStats({head:'cyclops'}).stats.weaponPowerPct,'conditional power must not be permanently added');
  values=[0,.999,0];hit=b.resolveDirectHit('2d6+5','fire',{critChancePct:25,critMultiplier:2.5},{fireResistance:0,critBonusReductionPct:25},'ability',()=>values.shift());assert.equal(hit.rawDamage,30);assert.equal(hit.damage,25.5,'protection reduces only critical bonus');
  assert.equal(b.applyStatBonuses({critChancePct:22},{critChancePct:8}).critChancePct,25);
  const procRates=[];
  for(const [id,w] of Object.entries(WEAPONS))for(const e of w.onHit){
    let successes=0;const samples=20000;
    for(let i=0;i<samples;i++)successes+=Number(b.tryStatusProc(e,{nowSeconds:i*10,strikeIndex:e.strike==='second'?1:0},rng).applied);
    assert(Math.abs(successes/samples-e.chance)<.015);procRates.push({weapon:id,status:e.id,chance:e.chance,observed:successes/samples,samples});
    assert.equal(b.tryStatusProc(e,{strikeIndex:0,nowSeconds:1,lastAppliedAtSeconds:1},()=>0).applied,e.chance>0);
    assert.equal(b.tryStatusProc(e,{strikeIndex:1,nowSeconds:1,lastAppliedAtSeconds:1},()=>0).applied,e.chance>0);
  }
  const e=WEAPONS.dragon_longsword.onHit[0];assert.equal(b.tryStatusProc(e,{},()=>.45).applied,false);assert.equal(b.tryStatusProc(e,{},()=>.44999).applied,true);

  let maxBuildCrits=0,maxBuildSum=0;const maxStats={critChancePct:25,critMultiplier:2.5};
  for(let i=0;i<50000;i++){const h=b.resolveDirectHit('4d6+17','slashing',maxStats,{slashingResistance:0},'weapon',rng);maxBuildCrits+=Number(h.critical);maxBuildSum+=h.damage;}
  assert(Math.abs(maxBuildCrits/50000-.25)<.01);assert(Math.abs(maxBuildSum/50000-31*1.375)<.3);
  const report={version:r.version,passed:true,traits:Object.fromEntries(Object.entries(TRAITS).map(([k,v])=>[k,Object.keys(v).length])),combinationsChecked:combinations,statRanges:ranges,allSlotRanges,distributions,weapons,perkCounts:{one:onePerk,two:allTraits.length-onePerk,resistancePerks},procRates,
    caveats:['Budgets, expected critical DPS and sampled roll distributions only; no collision, status engine or PvP simulation is implemented by this file.','Human playtests are required to measure range advantage, hit rate and win rates.']};
  const out=path.join(root,'output/playground/arena-balance-v1-validation.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));
  console.log('PASS',Object.values(report.traits).reduce((a,n)=>a+n,0),'traits;',combinations,'loadout combinations;',out);
})().catch(e=>{console.error(e);process.exitCode=1;});
