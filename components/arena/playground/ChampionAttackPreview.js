import React from 'react';
import dynamic from 'next/dynamic';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
const Model=dynamic(()=>import('./ChampionModelPreview'),{ssr:false,loading:()=> <div className="championAttackLoading" role="status">Loading attack preview…</div>});

// Independent attack viewport beneath the equipped weapon name.
export default function ChampionAttackPreview({champion,name,playing,onToggle,compact=false}){
 return <section className="championAttackPreview" aria-label="Weapon attack animation">
  <header><div><small>YOUR CHAMPION · LIVE ATTACK</small><h3>{name}</h3></div><button type="button" className={compact?'armouryIconButton':undefined} title={playing?'Pause weapon animation':'Play weapon animation'} onClick={onToggle} aria-label={playing?'Pause weapon animation':'Play weapon animation'}>{compact?(playing?<PauseIcon/>:<PlayArrowIcon/>):playing?'Pause':'Play'}</button></header>
  <Model champion={champion} mode="attack" playing={playing}/>
  <p>Click in the arena to attack. Preview plays at 0.65× speed. Red shows the active hitbox. Drag to look around or right-drag to pan.</p>
 </section>;
}
