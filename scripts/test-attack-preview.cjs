const path=require('path'),fs=require('fs'),assert=require('assert');
const {chromium}=require('../tmp/playground-qa/node_modules/playwright');
const out=path.resolve(__dirname,'../output/playground');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
try{const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:3011/arena/playground/attack-preview.html');
for(const [id,phase] of [['dragon_longsword',.5],['dual_katana',.68],['executioner_axe',.56],['wooden_club',.60],['elf_bow',.69],['dragon_staff',.63],['lightning_staff',.63]]){
await page.waitForFunction(()=>!document.getElementById('weapon').disabled&&document.getElementById('status').hidden,null,{timeout:120000});
if(await page.locator('#weapon').inputValue()!==id){await page.selectOption('#weapon',id);await page.waitForFunction(()=>!document.getElementById('weapon').disabled&&document.getElementById('status').hidden,null,{timeout:120000});}
const result=await page.evaluate(p=>window.attackPreview.seek(p),phase);assert(result.arcs+result.projectiles>0,JSON.stringify(result));results.push(result);await page.screenshot({path:path.join(out,'weapon-effects-'+id+'.png')});console.log(id,result.arcs,result.projectiles);
}
await page.selectOption('#skin','Chameleon');await page.waitForFunction(()=>!document.getElementById('weapon').disabled&&document.getElementById('status').hidden,null,{timeout:120000});assert.equal((await page.evaluate(()=>window.attackPreview.seek(.63))).skin,'Chameleon');
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'attack-preview-validation.json'),JSON.stringify({passed:true,results,errors},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
