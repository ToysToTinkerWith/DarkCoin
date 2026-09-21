const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/playground'),qa=path.join(root,'tmp/playground-qa');
const esbuild=require('../tmp/champion-model-tools/node_modules/esbuild'),{chromium}=require('../tmp/playground-qa/node_modules/playwright');
let server,browser,page;const errors=[];
(async()=>{
 const network=`import * as S from './lib/arena/simulation';
 export class ArenaConnection{
 constructor(session,onState,onNotice){this.room=S.createRoom(100,42);this.p=S.addPlayer(this.room,'fixture',{id:1001,name:'Jump and fists',loadout:{skin:'Undead',head:'bone',armour:'leather_garb',weapon:'dragon_staff',magic:'fire_magic',extra:null,background:'noir_background'},baselineSpell:'renewing_light'});Object.assign(this.p,{x:0,z:-3,yaw:0});this.p.input.yaw=0;this.onState=onState;this.onNotice=onNotice;this.intent={x:0,z:0,yaw:0,run:false};this.seq=0;window.fixture={connection:this,S};}
 start(){this.send();this.timer=setInterval(()=>{S.advance(this.room,this.room.time+.04);this.p.lastSeen=this.room.time;this.send();},40);}
 send(){this.onState(S.snapshot(this.room));}
 setIntent(i){this.intent=i;S.applyInput(this.room,'fixture',{...i,seq:++this.seq});}
 action(action){window.lastAction=action;const result=S.applyInput(this.room,'fixture',{...this.intent,seq:++this.seq,action});if(result.error)this.onNotice(result.error);this.send();}
 close(){clearInterval(this.timer);}
 }`;
 const plugins=[{name:'fixture',setup(build){
 build.onResolve({filter:/\.\/arena-network$/},()=>({path:'network',namespace:'fixture'}));
 build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:network,resolveDir:root,loader:'js'}));
 build.onLoad({filter:/[\\/]character\.js$/},a=>({loader:'js',contents:fs.readFileSync(a.path,'utf8').replace('model.removeFromParent();return {','model.removeFromParent();return window.__character={')}));
 build.onLoad({filter:/[\\/]ArenaCanvas\.js$/},a=>({loader:'jsx',contents:fs.readFileSync(a.path,'utf8').replace('frame=requestAnimationFrame(tick);const dt=', 'frame=requestAnimationFrame(tick);window.__render=()=>renderer.render(scene,camera);window.__camera=camera;if(window.__freeze)return;const dt=')}));
 }}];
 const entry=`import React from 'react';import {createRoot} from 'react-dom/client';import Arena from './components/arena/playground/ArenaCanvas';import * as T from 'three';window.T=T;const champion={id:1001,name:'Arena movement check',loadout:{skin:'Undead',head:'bone',armour:'leather_garb',weapon:'dragon_staff',magic:'fire_magic',extra:null,background:'noir_background'},baselineSpell:'renewing_light',session:{playerId:'fixture',token:'local-only'}};createRoot(document.getElementById('root')).render(<div className="playgroundPage"><Arena champion={champion} onExit={()=>{}}/></div>);`;
 await esbuild.build({stdin:{contents:entry,resolveDir:root,loader:'jsx'},bundle:true,outfile:path.join(qa,'jump-fists.js'),loader:{'.js':'jsx'},plugins,define:{'process.env.NODE_ENV':'"production"'}});
 server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="margin:0;background:#05050a;color:white;font-family:Arial"><div id="root"></div><script src="/qa.js"></script></body></html>');}
 const file=pathname==='/qa.js'?path.join(qa,'jump-fists.js'):pathname==='/style.css'?path.join(root,'components/arena/playground/playground.css'):path.join(root,'public',decodeURIComponent(pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end();}
 res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });await new Promise(r=>server.listen(8814,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 page=await browser.newPage({viewport:{width:1360,height:940}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8814/');await page.waitForFunction(()=>window.__character&&document.querySelector('.playgroundOverlay')===null,null,{timeout:120000});
 const canvas=page.locator('canvas');await canvas.focus();await page.keyboard.press('Space');await page.waitForFunction(()=>window.lastAction==='jump');
 assert((await page.evaluate(()=>window.fixture.connection.p.jumpStart))>100);
 await page.getByRole('button',{name:'Punch',exact:true}).click();await page.waitForFunction(()=>window.fixture.connection.p.action?.unarmed);await page.screenshot({path:path.join(out,'playground-fists-live.png')});
 await page.waitForFunction(()=>!window.fixture.connection.p.action,null,{timeout:10000});
 await canvas.focus();await page.keyboard.press('KeyQ');await page.waitForFunction(()=>window.fixture.connection.p.baselineCooldownUntil>window.fixture.connection.room.time,null,{timeout:10000});
 const bar=page.getByRole('progressbar',{name:'Renewing Light cooldown'});assert(Number(await bar.getAttribute('aria-valuenow'))<40);assert(!/\d\.\ds/.test(await page.locator('.playgroundActions').innerText()));
 await canvas.focus();await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.fixture.connection.p.cooldownUntil>window.fixture.connection.room.time,null,{timeout:10000});
 assert.equal(await page.getByRole('progressbar').count(),2);await page.screenshot({path:path.join(out,'playground-cooldown-bars.png')});
 const result=await page.evaluate(async()=>{
 window.__freeze=true;clearInterval(window.fixture.connection.timer);const T=window.T,c=window.__character,actor=c.model.parent;
 const bones=new Map();c.model.traverse(o=>{if(o.isBone)bones.set(o.name,o);});const b=n=>bones.get(T.PropertyBinding.sanitizeNodeName(n));
 const sample=(phase,jump=false)=>{actor.position.set(0,jump?.8:0,-3);actor.rotation.set(0,0,0);actor.updateMatrixWorld(true);c.sync({carry:'Carry',jumpStart:jump?100:null,action:jump?null:{id:100,kind:'Swing',start:100,duration:1,unarmed:true}},jump?100.42:100+phase);c.update(0,'Idle');actor.updateMatrixWorld(true);};
 sample(0,true);const angles=['L','R'].map(side=>{const v=b('shin.'+side).getWorldPosition(new T.Vector3()).sub(b('thigh.'+side).getWorldPosition(new T.Vector3())).normalize();return Math.acos(-v.y)*180/Math.PI;});
 window.__camera.position.set(4,2,-4);window.__camera.lookAt(0,1.8,-3);window.__camera.updateMatrixWorld();window.__render();
 window.__sample=sample;window.__bones=bones;

 return {angles};
 });
 assert(result.angles.every(a=>Math.abs(a-45)<.01),JSON.stringify(result));await page.screenshot({path:path.join(out,'playground-jump-apex.png')});
 // Same fist sockets as the authoritative strike path; carried weapon stays fixed to torso.
 const paths=JSON.parse(fs.readFileSync(path.join(root,'lib/arena/weapon-paths.json'),'utf8'));
 const geometry=await page.evaluate(pathData=>{
 const T=window.T,c=window.__character,actor=c.model.parent,bones=window.__bones;
 c.sync({carry:'Carry',jumpStart:null,action:null},102);c.update(0,'Idle');actor.position.y=0;actor.updateMatrixWorld(true);
 const relative=()=>bones.get('chest').matrixWorld.clone().invert().multiply(bones.get('weapon').matrixWorld);
 const rest=relative(),deviations=[],errors=[];
 const arm=bones.get('upper_armR'),restArm=arm.quaternion.clone();
 for(let i=0;i<12;i++){c.sync({carry:'Carry',jumpStart:null,action:{id:200,kind:'Cast',start:100,duration:1,gesture:'heal',baseline:true}},100.6);c.update(0,'Idle');}
 c.sync({carry:'Carry',jumpStart:null,action:null},102);c.update(0,'Idle');const castDrift=restArm.angleTo(arm.quaternion);
 for(const phase of [.2,.3,.4,.5,.65]){window.__sample(phase);deviations.push(Math.max(...relative().elements.map((n,i)=>Math.abs(n-rest.elements[i]))));
 const f=phase*(pathData.frames.length-1),i=Math.floor(f);
 for(const socket of c.unarmedSockets){const a=pathData.frames[i].find(s=>s.side===socket.side),b=pathData.frames[Math.min(i+1,pathData.frames.length-1)].find(s=>s.side===socket.side);for(const key of ['inner','outer']){const expected=new T.Vector3(...a[key]).lerp(new T.Vector3(...b[key]),f-i);const actual=actor.worldToLocal(socket.bone.localToWorld(socket[key].clone()));errors.push(expected.distanceTo(actual));}}}
 c.sync({carry:'Carry',jumpStart:100,action:null},101);c.update(0,'Idle');const landed=bones.get('thighL').quaternion.clone();for(let i=0;i<10;i++){c.sync({carry:'Carry',jumpStart:null,action:null},102);c.update(0,'Idle');}const landingDrift=landed.angleTo(bones.get('thighL').quaternion);
 window.__sample(.3);window.__camera.position.set(3.2,2.3,.5);window.__camera.lookAt(0,1.2,-3);window.__camera.updateMatrixWorld();window.__render();
 return {castDrift,maxPathError:Math.max(...errors),maxWeaponDrift:Math.max(...deviations),landingDrift};
 },paths.unarmed);
 assert(geometry.maxPathError<.03,JSON.stringify(geometry));assert(geometry.maxWeaponDrift<.001,JSON.stringify(geometry));assert(geometry.landingDrift<.001);assert(geometry.castDrift<.001);await page.screenshot({path:path.join(out,'playground-unarmed-pose.png')});
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('canvas').width<600);await page.evaluate(()=>window.__render());await page.screenshot({path:path.join(out,'playground-cooldowns-mobile.png')});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'jump-fists-validation.json'),JSON.stringify({passed:true,...result,...geometry,errors},null,2));console.log('PASS Space, fist attacks, actual rig thigh angles, landing restoration, server hitbox match, carried weapon attachment, cooldown bars and mobile layout',result,geometry);
})().catch(async e=>{console.error(e);if(page){console.log((await page.locator('body').innerText()).slice(-1500));await page.screenshot({path:path.join(out,'jump-fists-error.png')}).catch(()=>{});}process.exitCode=1;}).finally(async()=>{await browser?.close();server?.close();});
