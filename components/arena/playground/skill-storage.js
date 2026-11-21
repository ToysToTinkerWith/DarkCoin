import {ARENA_SKILLS_VERSION,validateSkills} from '../../../lib/arena/skills';
const key=id=>`darkcoin:arena-skills:v${ARENA_SKILLS_VERSION}:${id}`;
export function loadSavedSkills(storage,id,xp){
 try{
  const raw=storage.getItem(key(id));if(!raw)return {skills:{},notice:''};
  const value=JSON.parse(raw);return {skills:validateSkills(value.skills,xp),notice:''};
 }catch{return {skills:{},notice:'The saved build could not be used. Choose your skills again; your on-chain XP is unchanged.'};}
}
export function saveSkills(storage,id,xp,skills){
 const valid=validateSkills(skills,xp);
 storage.setItem(key(id),JSON.stringify({version:ARENA_SKILLS_VERSION,skills:valid}));
 return valid;
}
