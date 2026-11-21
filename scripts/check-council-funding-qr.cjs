// Decodes rendered QR pixels with a separate decoder. No wallet opens or payments.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),sdk=require('algosdk');
const {chromium}=require('playwright'),{PNG}=require('pngjs'),jsQR=require('jsqr');
const origin=process.env.COUNCIL_PREVIEW_URL||'http://127.0.0.1:3015',out=path.resolve('output/council-funding');
function decode(bytes){const png=PNG.sync.read(bytes),found=jsQR(new Uint8ClampedArray(png.data),png.width,png.height,{inversionAttempts:'dontInvert'});assert(found,'A separate decoder can read the QR screenshot');return found.data;}
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const live=await(await fetch('https://dark-coin.com/api/council/dao?view=config')).json();
  const address=String(sdk.getApplicationAddress(1239236238));assert.equal(live.config.address,address,'The receiving address is the existing mainnet app treasury');
  const uri='algorand://'+address,report={checkedAt:new Date().toISOString(),origin,address,uri,network:live.config.network,checks:[]};
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{for(const width of[1440,390,320]){
    const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window.fundingCopiedAddress=value;}}}));
    await page.route('**/*',route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.origin!==origin)return route.abort();
      if(!['GET','HEAD'].includes(request.method()))return route.abort();
      if(url.pathname==='/api/council/dao')return route.fulfill({json:{...live,owned:[],proposals:[],votes:[]}});
      return route.continue();
    });
    const response=await page.goto(origin+'/council/treasury');assert.equal(response.status(),200);
    const funding=page.locator('section[aria-label="Fund the Council treasury"]');await funding.waitFor();
    assert((await funding.innerText()).includes(address),'Full address is visible, not just a truncated identifier');
    assert((await funding.innerText()).includes('Algorand mainnet'));
    const wallet=funding.getByRole('link',{name:'Open wallet'});assert.equal(await wallet.getAttribute('href'),uri);assert(!uri.includes('?'),'No amount, asset or note is prefilled');
    await funding.getByRole('button',{name:'Copy treasury address',exact:true}).click();assert.equal(await page.evaluate(()=>window.fundingCopiedAddress),address);
    const small=page.locator('[data-council-funding-qr="small"]');const bytes=await small.screenshot();fs.writeFileSync(path.join(out,'qr-'+width+'.png'),bytes);assert.equal(decode(bytes),uri);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal page overflow');
    await page.screenshot({path:path.join(out,'treasury-'+width+'.png'),fullPage:true});
    const enlarge=funding.getByRole('button',{name:'Enlarge treasury funding QR code'});await enlarge.click();
    const dialog=page.getByRole('dialog',{name:'Council treasury funding QR code'});await dialog.waitFor();
    const large=dialog.locator('[data-council-funding-qr="large"]'),largeBytes=await large.screenshot();fs.writeFileSync(path.join(out,'qr-large-'+width+'.png'),largeBytes);assert.equal(decode(largeBytes),uri);
    const box=await dialog.boundingBox();assert(box.x>=0&&box.x+box.width<=width,'Dialog stays inside the viewport');
    await dialog.getByRole('button',{name:/Address copied|Copy treasury address/}).click();assert.equal(await page.evaluate(()=>window.fundingCopiedAddress),address);
    await page.screenshot({path:path.join(out,'qr-dialog-'+width+'.png')});await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
    assert.equal(await enlarge.evaluate(element=>element===document.activeElement),true,'Native dialog restores focus');assert.deepEqual(errors,[]);
    report.checks.push({width,smallQrDecoded:true,largeQrDecoded:true,copyPassed:true,correctWalletUri:true,amountPrefilled:false,overflow:false,browserErrors:0});await page.close();
  }
  fs.writeFileSync(path.join(out,'qr-check.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1});
