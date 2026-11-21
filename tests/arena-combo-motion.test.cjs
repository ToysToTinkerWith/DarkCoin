const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path'),crypto=require('node:crypto'),T=require('three');
require('esbuild').buildSync({stdin:{resolveDir:path.resolve(__dirname,'..'),contents:"export {composeWeaponPose} from './components/arena/playground/multi-weapon-pose';export {composeMovingPose} from './components/arena/playground/moving-combat-pose';export {WEAPONS,UNARMED} from './components/contracts/Arena/arenaBalanceV1';"},bundle:true,platform:'node',external:['three'],outfile:path.resolve(__dirname,'../tmp/combo-motion-tests.cjs')});
const s=require('../tmp/combo-motion-tests.cjs'),gaits=require('../public/arena/playground/assets/combat.json'),baseline=require('./fixtures/combo-first-hashes.json');
const point=m=>new T.Vector3().setFromMatrixPosition(m),rotation=m=>{const q=new T.Quaternion();m.decompose(new T.Vector3(),q,new T.Vector3());return q.normalize();};
function fixture(id){const data=id==='scythe'?null:require('../public/arena/playground/assets/weapons/'+(id==='unarmed'?'snake_wings':id)+'.json');return {data,parents:data?.parents||gaits.parents,bones:data?.weapon_bones||{R:'weapon'},evaluate:(action,t,gait='Walk',phase=.31)=>data?s.composeWeaponPose(data,gaits,gait,phase,action,t):s.composeMovingPose(gaits,gait,phase,action,t)};}

test('all original first attacks are byte-for-byte unchanged across walking, running and strafing',()=>{
 for(const [id,expected] of Object.entries(baseline)){const {evaluate}=fixture(id),hash=crypto.createHash('sha256');for(const gait of ['Walk','Run','Walk_Left'])for(let i=0;i<=30;i++)hash.update(JSON.stringify(evaluate('Swing',i/30,gait).pose));assert.equal(hash.digest('hex'),expected,id);}
});

