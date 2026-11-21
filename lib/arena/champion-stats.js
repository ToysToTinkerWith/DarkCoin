import {buildArenaStats} from '../../components/contracts/Arena/arenaBalanceV1';
import {skillBonuses,validateSkills} from './skills';

export function buildChampionStats(champion){
 const ranks=validateSkills(champion.skills||{},champion.progression?.xp||'0');
 return buildArenaStats(champion.loadout,skillBonuses(ranks));
}
