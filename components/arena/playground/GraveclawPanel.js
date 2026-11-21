import React,{useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import {GRAVECLAW as B} from '../../../lib/arena/beast';
import {Stat} from './ChampionDetails';
import {STAT_DEFINITIONS,diceStatistics} from '../../contracts/Arena/arenaBalanceV1';
import {EffectText} from '../../EffectKeywords';
import styles from './GraveclawPanel.module.css';
import {previewTokenAmount} from './loot-amount';
const Preview=dynamic(()=>import('./GraveclawPreview'),{ssr:false,loading:()=> <div className={styles.stage}>Preparing 3D preview…</div>});
const pct=n=>(n*100).toLocaleString(undefined,{maximumFractionDigits:3})+'%';
function BossStat({name,label,value,max,unit}){return <Stat name={name} value={value} showBase={false} definition={{...STAT_DEFINITIONS[name],label:label||STAT_DEFINITIONS[name].label,unit:unit||STAT_DEFINITIONS[name].unit,base:value,cap:[0,max||STAT_DEFINITIONS[name].cap[1]]}}/>;}
export default function GraveclawPanel(){
 const [expanded,setExpanded]=useState(false),[clip,setClip]=useState('Claw'),[data,setData]=useState(null),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();let inFlight=false;async function refresh(){if(inFlight)return;inFlight=true;try{const r=await fetch('/api/arena/loot-preview',{signal:controller.signal}),d=await r.json();if(!r.ok)throw Error(d.error||'Inventory unavailable');setData(d);setError('');}catch(e){if(e.name!=='AbortError'){setError(e.message);setData(null);}}finally{inFlight=false;}}refresh();const timer=setInterval(()=>{if(!document.hidden)refresh();},30000);return()=>{controller.abort();clearInterval(timer);};},[]);
 const dice=diceStatistics(B.attack.damageRolls[0]),heal=diceStatistics(B.heal.healRoll);
 return <section className={styles.panel} aria-label="Graveclaw encounter and live reward odds">
  <div className={styles.overview}><Preview/><div className={styles.summary}>
   <div className={styles.eyebrow}><img src="/WhiteCoinLogo.svg" alt="Dark Coin"/> THE NEXT CHALLENGE</div>
   <button className={styles.expand} onClick={()=>setExpanded(!expanded)} aria-expanded={expanded} aria-controls="graveclaw-details"><h2>Graveclaw</h2><span className={styles.expandLabel}>{expanded?'Close −':'Inspect +'}</span></button>
  </div></div>
  <div className={styles.treasury}>
   <div className={styles.rewardHeading}><h3>In the treasury</h3><span>{data?.asOf?'Updated '+new Date(data.asOf).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'Current drop odds'}</span></div>
   {error?<p role="status" className={styles.notice}>{error} Retrying automatically.</p>:!data?<p role="status" className={styles.note}>Checking available rewards…</p>:!data.enabled?<p className={styles.note}>Loot is currently disabled.</p>:<>
    {data.assets.length===0?<p className={styles.note}>No available reward inventory right now.</p>:data.assets.map(asset=><article className={styles.asset} key={asset.id}>
     <div className={styles.assetTitle}>{asset.id===1088771340?<img src="/WhiteCoinLogo.svg" alt=""/>:<span className={styles.assetIcon}>{asset.kind==='nft'?'◇':'◈'}</span>}<div><strong>{asset.name}</strong><small>{previewTokenAmount(asset,asset.available)} {asset.unitName} available</small></div><b title="Chance of selecting this asset, before rolling its payout tier">{pct(asset.selectionChance)}<small>selection chance</small></b></div>
     {asset.kind==='token'&&asset.tiers.length>0?<div className={styles.tiers} aria-label={`${asset.name} payout tiers`}>{asset.tiers.map(t=><div key={t.percent} title={`${pct(t.chance)} chance after selecting this asset; ${previewTokenAmount(asset,t.amount)} ${asset.unitName}. Minimum ${previewTokenAmount(asset,asset.minimum)}. Pending rewards excluded; inventory may change.`}><b>{t.percent}%</b><span>of balance</span><strong className={styles.tierAmount}>{previewTokenAmount(asset,t.amount)} <small>{asset.unitName}</small></strong><strong>{pct(t.chance)} odds</strong>{!t.payable&&<em>Over budget</em>}</div>)}</div>:<p className={styles.note}>{asset.kind==='nft'?'One NFT per successful roll.':`${previewTokenAmount(asset,asset.minimum)}–${previewTokenAmount(asset,asset.maximum)} ${asset.unitName} per roll.`}</p>}
     {asset.id===1088771340&&<p className={styles.roundingNote}>DARK amounts rounded up to whole coins for display. Rewards use the available balance at the time of the roll.</p>}
    </article>)}
   </>}
  </div>
  {expanded&&<div id="graveclaw-details" className={styles.details}>
   <div><div className={styles.detailHeading}><h3>Moves</h3><span>Live 3D · 0.65× speed</span></div>
    <div className={styles.moves} aria-label="Preview Graveclaw moves">{[['Claw','Claw sweep'],['Heal',B.heal.name],['Enrage',B.enrage.name]].map(([id,name])=><button key={id} aria-pressed={clip===id} onClick={()=>setClip(id)}>{name}</button>)}</div>
    <Preview attack clip={clip}/>
    <div className={styles.ability}>
     {clip==='Claw'?<><h3>Claw sweep</h3><p><b>{B.attack.damageRolls[0]} per claw</b> · {dice.min}–{dice.max} slashing damage before defenses.</p><div className={styles.abilityNumbers}><span>{B.attackSeconds}s cycle</span><span>{B.attackStamina} stamina</span><span>10% crit · 2×</span></div><p><EffectText>{`Each claw independently has a ${pct(B.attack.onHit[0].chance)} chance to add ${B.attack.onHit[0].potency} Bleed potency: 3 damage per second for 3 seconds before resistance. Reapplications add potency and refresh the duration.`}</EffectText></p><p className={styles.note}><i className={styles.hitDot}/> Pink capsules show the actual server collision volume during each damaging window.</p></>:clip==='Heal'?<><h3>{B.heal.name}</h3><p>Raises both hands and draws green energy inward, restoring <b>{B.heal.healRoll}</b> HP ({heal.min}–{heal.max} solo). Healing scales with his maximum health.</p><div className={styles.abilityNumbers}><span>{B.heal.manaCost} mana</span><span>{B.heal.castSeconds}s cast</span><span>{B.heal.cooldownSeconds}s cooldown</span></div><p className={styles.note}>Used below {pct(B.heal.healthThreshold)} health. Interrupt before the healing pulse to stop it; spent mana stays spent.</p></>:<><h3>{B.enrage.name}</h3><p>Raises both claws inside a rising ring of fire-colored energy. For <b>{B.enrage.durationSeconds} seconds</b>, gain <b>25% movement speed</b>, <b>40 maximum stamina</b> and <b>50% stamina regeneration</b>. Restores 40 stamina on activation.</p><div className={styles.abilityNumbers}><span>{B.enrage.manaCost} mana</span><span>{B.enrage.castSeconds}s cast</span><span>{B.enrage.cooldownSeconds}s cooldown</span></div><p className={styles.note}>The orange aura marks the active buff. Interrupt the windup to prevent the enrage.</p></>}
    </div>
   </div>
   <div className={styles.statBlock}><span className={styles.eyebrow}>SOLO BASE STATS</span><h3>Graveclaw</h3><div className={styles.bossStats}>
    <BossStat name="maxHealth" value={B.maxHealth} max={400}/><BossStat name="maxStamina" value={B.maxStamina} max={160}/>
    <BossStat name="maxMana" value={B.maxMana}/><BossStat name="manaRegen" value={B.manaRegen}/>
    <BossStat name="staminaRegenPct" label="Stamina recovery" value={B.regen} max={40} unit="/s"/><BossStat name="moveSpeedPct" label="Run speed" value={B.runMps} max={4} unit="m/s"/>
    <BossStat name="critChancePct" value={10}/><BossStat name="critMultiplier" value={2}/>
    {['slashing','piercing','blunt','fire'].map(type=><BossStat key={type} name={type+'Resistance'} value={B.resistances[type]}/>)}
    <BossStat name="arcaneResistance" label="Other magic resistance" value={20}/><BossStat name="tenacityPct" value={B.tenacityPct}/>
   </div><p className={styles.note}>Mana recovers much more slowly than stamina. Enrage temporarily raises stamina to 140 and recovery to 28.5/s. Resistance bars show ratings, not flat reduction percentages.</p><p className={styles.note}>Each extra champion adds 60% base HP and 8% damage, up to eight champions.</p>
   {data?.enabled&&<details className={styles.lootDetails}><summary>Reward details</summary><p className={styles.note}>Current NFT selection: {pct(data.nftChance)} (configured {pct(data.configuredNftChance)}). Empty asset categories fall back to eligible inventory. Available balances exclude reserved rewards; allocations and payout limits can change your result. {data.emptyChance>.000001?`Current no-payout chance: ${pct(data.emptyChance)}.`:''}</p>{data.assets.filter(a=>a.kind==='token').map(a=><p className={styles.note} key={a.id}>{a.name}: minimum {previewTokenAmount(a,a.minimum)} {a.unitName}. Tier odds apply after this asset is selected.</p>)}<p className={styles.note}>Use a damage or healing move and be alive and present at victory. One roll per eligible wallet; collect your drop in the arena.</p></details>}
   </div>
  </div>}
 </section>;
}
