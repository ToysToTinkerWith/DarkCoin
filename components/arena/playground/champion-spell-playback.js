import {createRoom,addPlayer,applyInput,advance,snapshot} from '../../../lib/arena/simulation';
import {selectedSpell,selectionTiming} from './spell-selection';
import {buildArenaStats} from '../../contracts/Arena/arenaBalanceV1';
import {CombatEffects} from './combat-effects';

// Rehearse the actual server cast in an isolated, local-only room.
export class ChampionSpellPlayback{
 constructor(scene,character,champion,spellId){this.scene=scene;this.character=character;this.champion=champion;this.spellId=spellId;const s=selectedSpell(champion.loadout,spellId);this.spellId=s.id;this.isTrait=!!s.isTrait;this.duration=selectionTiming(s,buildArenaStats(champion.loadout).stats).castSeconds+(s.projectile?s.projectile.maxRangeM/s.projectile.speedMps:1.5)+1;this.reset();}
 reset(){this.fx?.dispose();this.fx=new CombatEffects(this.scene);this.room=createRoom(100,123);this.room.dummy=null;this.player=addPlayer(this.room,'preview',{...this.champion,baselineSpell:this.isTrait?null:this.spellId});Object.assign(this.player,{x:0,z:0,yaw:0,hp:80});this.player.input.yaw=0;applyInput(this.room,'preview',{seq:1,x:0,z:0,yaw:0,action:this.isTrait?'cast':'baseline'});this.time=0;}
 update(dt){this.time+=dt;if(this.time>=this.duration)this.reset();advance(this.room,100+this.time);const state=snapshot(this.room);this.character.sync(state.players.preview,state.time);this.character.update(dt,'Idle');this.fx.update(state,state.time,dt,new Map([['preview',{actor:this.character.model}]]));return {time:this.time,active:state.projectiles.length};}
 dispose(){this.fx.dispose();}
}
