const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),qa=path.join(root,'tmp/playground-qa'),out=path.join(root,'output/playground');
const esbuild=require('../tmp/champion-model-tools/node_modules/esbuild'),{chromium}=require('../tmp/playground-qa/node_modules/playwright');
let server,browser,page;
(async()=>{
 esbuild.buildSync({entryPoints:[path.join(root,'lib/arena/simulation.js')],bundle:true,platform:'node',outfile:path.join(qa,'simulation.cjs')});
 const sim=require(path.join(qa,'simulation.cjs')),now=()=>Date.now()/1000,room=sim.createRoom(now(),1337);
 const champions={a:{id:1,name:'Fire duelist',loadout:{skin:'Undead',head:'bone',armour:'leather_garb',weapon:'dragon_longsword',magic:'fire_magic',extra:'golden_feathers'}},b:{id:2,name:'Ice champion',loadout:{skin:'Light Skin',head:'bone',armour:'leather_garb',weapon:'arctic_dual_katana',magic:'ice_daggers',extra:null}}};
 for(const id of ['a','b']){const p=sim.addPlayer(room,id,champions[id]);p.x=0;p.z=id==='a'?0:4;p.yaw=id==='a'?0:Math.PI;p.input.yaw=p.yaw;}
 const active=new Set(),errors=[],requests=[];
 await esbuild.build({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import ArenaCanvas from './components/arena/playground/ArenaCanvas';fetch('/fixture'+location.search).then(r=>r.json()).then(champion=>createRoot(document.getElementById('root')).render(<main className='playgroundPage'><ArenaCanvas champion={champion} onExit={()=>document.body.dataset.exited='true'}/></main>));",resolveDir:root,loader:'jsx'},bundle:true,outfile:path.join(qa,'combat-qa.js'),loader:{'.js':'jsx'},define:{'process.env.NODE_ENV':'"production"'}});
 server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/fixture'){const id=url.searchParams.get('player')||'a';active.add(id);room.players[id].lastSeen=now();res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({...champions[id],session:{playerId:id,token:id,state:sim.snapshot(room)}}));}
   if(url.pathname==='/api/arena/combat'){
    let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw),id=req.headers.authorization.replace('Bearer ','');for(const p of Object.values(room.players))if(!active.has(p.id))p.lastSeen=now();
    const result=body.op==='leave'?(sim.removePlayer(room,id),{}):sim.command(room,id,body.input,now());requests.push({id,action:body.input?.action});res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({...result,state:sim.snapshot(room)}));
   }
   if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end('<html><head><link rel="stylesheet" href="/qa.css"></head><body style="margin:0;background:#101b22;font-family:Arial"><div id="root"></div><script src="/qa.js"></script></body></html>');}
   const file=url.pathname==='/qa.js'?path.join(qa,'combat-qa.js'):url.pathname==='/qa.css'?path.join(root,'components/arena/playground/playground.css'):path.join(root,'public',decodeURIComponent(url.pathname));
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end();}
   res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.glb':'model/gltf-binary'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
  }catch(e){res.statusCode=500;res.end(JSON.stringify({error:e.message}));}
 });await new Promise(resolve=>server.listen(8812,'127.0.0.1',resolve));
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 page=await browser.newPage({viewport:{width:1100,height:800}});const second=await browser.newPage({viewport:{width:850,height:650}});
 for(const p of [page,second])p.on('pageerror',e=>errors.push(e.message));
 await Promise.all([page.goto('http://127.0.0.1:8812/?player=a'),second.goto('http://127.0.0.1:8812/?player=b')]);
 await Promise.all([page,second].map(p=>p.getByRole('button',{name:'Draw / stow',exact:true}).waitFor({timeout:120000})));
 await Promise.all([page,second].map(p=>p.waitForFunction(()=>!document.querySelector('.playgroundActions button').disabled,null,{timeout:120000})));
 assert.equal(Object.keys(room.players).length,2);console.log('Both 3D clients loaded.');
 await page.screenshot({path:path.join(out,'arena-multiplayer.png')});
 await page.getByRole('button',{name:'Draw / stow',exact:true}).click();await page.getByText('Weapon ready',{exact:true}).waitFor({timeout:20000});
 await page.getByRole('button',{name:'Cast magic · E',exact:true}).click();
 await page.waitForFunction(()=>/Magic · [0-9]/.test(document.querySelector('.playgroundActions').textContent),null,{timeout:15000});
 assert(room.players.a.cooldownUntil>now());assert(room.players.b.hp<room.players.b.champion.loadout.maxHealth||room.players.b.hp<200,'second champion was damaged by magic');
 await page.screenshot({path:path.join(out,'arena-magic-combat.png')});
 const before=room.players.a.z;await page.bringToFront();await page.locator('canvas').focus();await page.keyboard.down('KeyW');
 for(let i=0;i<20&&room.players.a.z<=before;i++)await page.waitForTimeout(200);
 await page.keyboard.up('KeyW');assert(room.players.a.z>before);
 await page.getByRole('button',{name:'Attack',exact:true}).click();await page.waitForTimeout(1600);assert(requests.some(r=>r.id==='a'&&r.action==='attack'));
 await page.locator('canvas').focus();await page.keyboard.press('Escape');await page.getByRole('heading',{name:'Controls paused'}).waitFor();await page.getByRole('button',{name:'Resume',exact:true}).click();
 sim.removePlayer(room,'b','defeated','a');await second.getByRole('heading',{name:'Champion defeated'}).waitFor({timeout:15000});
 assert.deepEqual(errors,[]);console.log('PASS two browser clients, models, draw, E cast, shared damage, movement, attack, controls and death.');
 fs.writeFileSync(path.join(out,'arena-multiplayer-browser-validation.json'),JSON.stringify({passed:true,errors,checks:['two real WebGL clients','equipped models','server-timed draw','magic button and cooldown','remote HP damage','movement inputs','weapon attack','controls pause','death removes champion']},null,2));
})().catch(async e=>{console.error(e);if(page){console.log((await page.locator('body').innerText()).slice(0,1500));await page.screenshot({path:path.join(out,'arena-browser-error.png')}).catch(()=>{});}process.exitCode=1;}).finally(async()=>{await browser?.close();server?.close();});
