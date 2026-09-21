import React from 'react';

// Small, native SVG glyphs stay crisp at every density and inherit stat colours.
const paths={
 maxHealth:'M12 21 3.6 12.7C-1 7.7 5.8 1.5 12 7c6.2-5.5 13 0.7 8.4 5.7Z',
 maxStamina:'m13 2-8 12h6l-1 8 9-13h-6Z',
 staminaRegenPct:'M4 10a8 8 0 1 1 0 5M4 4v6h6m2-4v6l3 2',
 powerPct:'m12 2 3 6 7 4-7 4-3 6-3-6-7-4 7-4Z',
 weaponPowerPct:'m5 19 12-12 4-4-1 6L8 20M3 14l7 7M3 21l3-3',
 abilityPowerPct:'m12 2 2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5ZM20 2v4m-2-2h4',
 hastePct:'m3 6 6 6-6 6m7-12 6 6-6 6m7-12 5 6-5 6',
 castSpeedPct:'m12 2-7 11h6l-1 9 9-13h-6M3 3h4M2 7h3',
 moveSpeedPct:'M14 4a2 2 0 1 0 0 .1M4 12l5-5 5 2 3 4h4M9 7l-1 8-5 6m5-6 7 2 1 5',
 tenacityPct:'m12 2 9 4v6c0 5-6 8-9 10-3-2-9-5-9-10V6ZM8 12l3 3 5-6',
 cooldownReductionPct:'M4 8a9 9 0 1 1-1 8M4 2v6h6m2-1v6h5',
 critChancePct:'M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5m-5 0 9-9m-4 0h4v4',
 critMultiplier:'m12 2 2 6 6-4-3 7 5 3-7 1-1 7-4-6-7 3 4-7-5-3 7-1Z',
 critBonusReductionPct:'m12 2 9 4v6c0 5-6 8-9 10-3-2-9-5-9-10V6ZM8 12h8',
 sprintCostReductionPct:'m3 6 6 6-6 6m6-12 6 6-6 6m9-10v16m-3-3 3 3 3-3',
 blunt:'m7 3 8 1 3 5-3 4-8-1-3-5Zm5 10-3 9',
 slashing:'M5 21C16 18 20 9 20 2 14 8 9 11 4 12l4 3-3 6Zm3-6 8-8',
 piercing:'m12 2 4 9-4 3-4-3Zm0 12v8m-3-3h6',
 fire:'M13 2c2 8 7 7 7 13a8 8 0 0 1-16 0c0-4 4-7 4-7 0 5 3 4 5-6Zm0 12c-7 4-3 9 1 6 3-2-1-4-1-6',
 frost:'M12 2v20M3 7l18 10M3 17 21 7M9 3l3 3 3-3M9 21l3-3 3 3M3 10l4-1V5m10 14v-4l4-1M3 14l4 1v4m10-14v4l4 1',
 lightning:'m14 2-10 12h7l-1 8L21 9h-8Z',
 water:'M12 2S4 11 4 15a8 8 0 0 0 16 0c0-4-8-13-8-13ZM8 15c0 3 2 4 4 4',
 poison:'M9 2h6m-5 0v7L4 19q-1 3 3 3h10q4 0 3-3L14 9V2M7 15h10m-7 3h1m3-1h1',
 shadow:'M17 3a9 9 0 1 0 4 14A10 10 0 0 1 17 3Z',
 arcane:'m12 2 9 10-9 10-9-10Zm0 5 4 5-4 5-4-5Z',
 head:'M7 19v-4C0 8 8 1 14 3c8 2 7 10 3 13v5H9m3-13h.01m4 1h.01',
 armour:'m8 3 4 3 4-3 6 4-4 5v9H6v-9L2 7Z',
 extra:'M9 3a5 5 0 0 1 5 8l-2 3v4a3 3 0 1 1-6 0m9-3a4 4 0 1 1-1 7',
 skin:'M9 3h6l1 5 5 2-2 4-3-2-1 10H9L8 12l-3 2-2-4 5-2Z',
 background:'M3 20h18M3 17l6-9 4 6 3-4 5 7M17 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
 rotate:'M4 8c3-7 14-7 17 0m0-5v5h-5M20 16c-3 7-14 7-17 0m0 5v-5h5',
 close:'m6 6 12 12M6 18 18 6',
};
export default function StatIcon({name,className=''}){
 const key=name.replace('Resistance',''),alias={weapon:'weaponPowerPct',magic:'abilityPowerPct'};
 return <svg className={`championIcon ${className}`} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[alias[key]||key]||paths.powerPct}/></svg>;
}
