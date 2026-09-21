import {STATUS_EFFECTS,DAMAGE_PALETTE} from '../../contracts/Arena/arenaBalanceV1';
export const STATUS_ICONS={
 burn:['M12 2C14 7 18 8 18 14A6 6 0 0 1 6 14C6 10 9 8 9 5C10 8 12 9 12 2Z','M12 12C14 15 15 17 12 19C9 17 10 15 12 12Z'],
 bleed:['M12 3C10 7 6 11 6 15A6 6 0 0 0 18 15C18 11 14 7 12 3Z','M9 14V17'],
 poison:['M8 3H16M10 3V9L5 18Q4 21 7 21H17Q20 21 19 18L14 9V3','M8 14H16M10 17H10.1M14 18H14.1'],
 chill:['M12 2V22M3.3 7L20.7 17M3.3 17L20.7 7','M9 4L12 7L15 4M9 20L12 17L15 20M4 10L7 10L7 7M17 17V14H20M4 14H7V17M17 7V10H20'],
 soaked:['M8 3C6 7 3 9 3 12A5 5 0 0 0 13 12C13 9 10 7 8 3Z','M17 10C15 13 13 15 13 18A4 4 0 0 0 21 18C21 15 19 13 17 10Z'],
 exposed:['M12 2L20 6V12C20 17 16 20 12 22C8 20 4 17 4 12V6Z','M13 4L10 10L15 12L10 20'],
 weaken:['M5 3V12H2L7 19L12 12H9V3','M15 5H22M15 10H20M15 15H18'],
 stagger:['M12 2L14 8L21 5L18 12L22 17L15 17L12 23L9 17L2 18L6 12L3 6L10 8Z'],
 knockback:['M3 7H13V3L22 12L13 21V17H3','M2 10H7M2 14H7'],
};
export const statusLabel=id=>STATUS_EFFECTS[id]?.label||id;
export const stackCount=s=>s.stacks||1;
export function statusColor(id){return ({bleed:'#ff6d83',chill:'#83eeff',soaked:'#269fff',stagger:'#ffe273',exposed:'#ffad68',weaken:'#ba8dff',knockback:'#ffe273'})[id]||DAMAGE_PALETTE[STATUS_EFFECTS[id]?.damageType]||'#d1a5ff';}
