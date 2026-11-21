const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const esbuild=require('esbuild');
const {chromium}=require('playwright');
const out=path.resolve('tmp/classic-glossary-browser');fs.mkdirSync(out,{recursive:true});
(async()=>{
 await esbuild.build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`
 import React from 'react';import {createRoot} from 'react-dom/client';import {createPortal} from 'react-dom';
 import EffectKeywords,{EffectText,EffectRulesContext,EffectRulesScope} from './components/EffectKeywords';
 import {effectRulesetForPath} from './lib/effect-glossary';
 function App(){const [path,setPath]=React.useState('/arena/depths'),[dynamic,setDynamic]=React.useState(false);
 return <EffectRulesContext.Provider value={effectRulesetForPath(path)}><EffectKeywords/>
 <button id="route" onClick={()=>setPath(path==='/arena/depths'?'/arena/playtest':'/arena/depths')}>Switch game</button>
 <button id="dynamic" onClick={()=>setDynamic(!dynamic)}>Open quest</button>
 <p id="doom">Doom potency</p><p id="plain">Stagger mana</p>
 <p id="explicit"><EffectText>Potency</EffectText></p>
 {dynamic&&createPortal(<div id="quest"><p id="portal">Doom potency</p></div>,document.body)}
 <EffectRulesScope ruleset="classic"><p id="classic-scope">Bleed potency</p></EffectRulesScope>
 </EffectRulesContext.Provider>;}createRoot(document.getElementById('root')).render(<App/>);`},bundle:true,loader:{'.js':'jsx'},outfile:path.join(out,'app.js'),define:{'process.env.NODE_ENV':'"production"'}});
 const server=http.createServer((req,res)=>{if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');return res.end(fs.readFileSync(path.join(out,'app.js')));}res.setHeader('Content-Type','text/html');res.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><style>.effectTooltip{position:fixed;pointer-events:none;background:white;z-index:999}</style><body style="font:20px sans-serif;padding:25px"><div id="root"></div><script src="/app.js"></script></body></html>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
  async function hover(selector,word){await page.waitForFunction(({selector,word})=>[...CSS.highlights.get('darkcoin-effects')||[]].some(r=>r.startContainer.parentElement.closest(selector)&&r.toString()===word),{selector,word});const p=await page.locator(selector).evaluate((el,word)=>{const r=[...CSS.highlights.get('darkcoin-effects')].find(r=>el.contains(r.startContainer)&&r.toString()===word),b=r.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2};},word);await page.mouse.move(p.x,p.y);}
  async function tooltip(text){await page.locator('[data-effect-tooltip]').filter({hasText:text}).waitFor();}
  await hover('#doom','Doom');await tooltip('-0.4 resist per stack');
  await hover('#doom','potency');await tooltip('adds more Doom stacks');
  assert(!await page.evaluate(()=>[...CSS.highlights.get('darkcoin-effects')].some(r=>r.startContainer.parentElement.closest('#plain'))));
  await page.locator('#dynamic').click();await hover('#portal','potency');await tooltip('adds more Doom stacks');
  await page.locator('#explicit [data-effect-keyword]').focus();await tooltip('adds more Doom stacks');
  assert.match(await page.locator('#explicit [data-effect-keyword]').getAttribute('aria-label'),/adds more Doom stacks/);
  await page.locator('#route').click();await hover('#portal','potency');await tooltip('3D arena');
  await hover('#classic-scope','Bleed');await tooltip('-0.1 strength per stack');
  await page.locator('#explicit [data-effect-keyword]').focus();await tooltip('3D arena');
  await page.locator('#route').click();await hover('#portal','potency');await tooltip('adds more Doom stacks');
  await page.setViewportSize({width:390,height:844});await page.locator('#explicit [data-effect-keyword]').click();await tooltip('adds more Doom stacks');
  await page.keyboard.press('Escape');assert.equal(await page.locator('[data-effect-tooltip]').count(),0);assert.deepEqual(errors,[]);
  console.log('PASS classic Doom/potency, portal quests, dynamic text, keyboard/touch, route changes, and mixed-game scopes.');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
