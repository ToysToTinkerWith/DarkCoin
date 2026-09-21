import React from 'react';
import dynamic from 'next/dynamic';
const Model=dynamic(()=>import('./ChampionModelPreview'),{ssr:false,loading:()=> <div className="championAttackLoading" role="status">Loading attack preview…</div>});

// Independent attack viewport beneath the equipped weapon name.
export default function ChampionAttackPreview({champion,name,playing,onToggle}){
 return <section className="championAttackPreview" aria-label="Weapon attack animation">
  <header><div><small>YOUR CHAMPION · LIVE ATTACK</small><h3>{name}</h3></div><button type="button" onClick={onToggle} aria-label={playing?'Pause weapon animation':'Play weapon animation'}>{playing?'Pause':'Play'}</button></header>
  <Model champion={champion} mode="attack" playing={playing}/>
  <p>The 3D champion performs this attack at 0.65× speed. Red shows the active hitbox. Drag to look around, right-drag to pan, or scroll to zoom.</p>
 </section>;
}
