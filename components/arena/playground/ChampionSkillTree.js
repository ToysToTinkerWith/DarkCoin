import React from 'react';
import StatIcon from './StatIcon';
import {championLevel,SKILL_BRANCHES,SKILL_NODES,spentSkillPoints,changeSkill} from '../../../lib/arena/skills';

export default function ChampionSkillTree({champion,onChange,notice='',disabled=false}){
 const progression=championLevel(champion.progression?.xp||'0'),ranks=champion.skills||{},spent=spentSkillPoints(ranks),remaining=progression.points-spent;
 const change=(id,delta)=>onChange(changeSkill(ranks,id,delta,progression.xp));
 return <section className="championSkillTree" aria-label="Arena skill tree">
  <div className="skillProgression"><div><span className="championKicker">LEGACY XP · NEW ARENA BUILD</span><h3>Level {progression.level}</h3></div><div className="skillPointCount"><strong>{remaining}</strong><span>points available</span></div>
   <progress max="100" value={progression.progress} aria-label="Progress to next champion level"/>
   <small>{BigInt(progression.xp).toLocaleString()} / {BigInt(progression.nextXp).toLocaleString()} XP · Next level: {progression.level+1}</small>
  </div>
  <p className="championStatNote">One point per level, including level 1. Each rank costs one point. Spend two ranks in a skill to unlock the next. Refund freely; refunding a prerequisite also refunds the skills below it.</p>
  <div className="skillSaveNote" role="status">{notice||'Changes save automatically for this champion on this browser. No wallet signature needed.'}</div>
  <div className="skillBranches">{SKILL_BRANCHES.map(branch=><section className="skillBranch" key={branch.id} style={{'--branch-color':branch.color}}>
   <header><h3>{branch.name}</h3><p>{branch.description}</p></header>
   {branch.nodes.map((node,index)=>{
    const rank=ranks[node.id]||0,locked=node.requires&&(ranks[node.requires]||0)<2,prerequisite=SKILL_NODES.find(n=>n.id===node.requires);
    return <div key={node.id} className={`skillNode ${locked?'skillLocked':''}`} data-skill={node.id}>
     {index>0&&<div className="skillConnector" aria-hidden="true"/>}
     <div className="skillNodeHeading"><StatIcon name={node.icon}/><strong>{node.name}</strong><span>{rank}/3</span></div>
     <p>{node.effect}</p>{locked&&<small>Requires {prerequisite.name} rank 2</small>}
     <div className="skillRankControls"><button type="button" disabled={disabled||!rank} onClick={()=>change(node.id,-1)} aria-label={`Refund one rank of ${node.name}`}>−</button><div className="skillRankPips" aria-label={`${rank} of 3 ranks`}>{[1,2,3].map(n=><i key={n} className={rank>=n?'filled':''}/>)}</div><button type="button" disabled={disabled||locked||rank===3||remaining===0} onClick={()=>change(node.id,1)} aria-label={`Add one rank of ${node.name}`}>+</button></div>
    </div>;
   })}
  </section>)}</div>
  <div className="skillTreeFooter"><span>{spent} / {progression.points} points spent</span><button type="button" disabled={disabled||spent===0} onClick={()=>onChange({})}>Refund all points</button></div>
  <p className="championStatNote">Bonuses update Overview and All stats immediately. Equipment and skills share the existing stat caps. Changes apply on your next arena entry. XP is read from the original champion contract; your old skill tree is untouched.</p>
 </section>;
}
