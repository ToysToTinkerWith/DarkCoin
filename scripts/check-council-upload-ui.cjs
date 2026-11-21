// The actual Composer and Uploader, with only wallet signing/API/upload transport
// replaced in a separate browser bundle. No production route or test hook.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async function testUploadUI({origin,out,config,assets,address}){
 const root=path.resolve('.'),dir=path.join(out,'harness');fs.mkdirSync(dir,{recursive:true});
 const component=path.join(root,'components/council/CouncilComposer.js'),context=path.join(root,'components/council/CouncilContext.js');
 const loader=path.join(dir,'jsx-loader.cjs'),entry=path.join(dir,'entry.js'),transport=path.join(dir,'upload.js');
 fs.writeFileSync(loader,`module.exports=function(source){const done=this.async();require(${JSON.stringify(require.resolve('next/dist/build/swc'))}).transform(source,{filename:this.resourcePath,jsc:{parser:{syntax:'ecmascript',jsx:true},target:'es2020',transform:{react:{runtime:'automatic',development:false}}},module:{type:'commonjs'},sourceMaps:false}).then(result=>done(null,result.code),done)};`);
 fs.writeFileSync(transport,`
 exports.uploadCouncilMedia=async function(file,{sender,signProof,onProgress,signal}){
  const state=window.councilHarness,index=state.uploads.length,call={name:file.name,sender,status:'hashing',aborted:false};state.uploads.push(call);
  const hash=String(index+1).repeat(64);onProgress({phase:'hashing',progress:1});
  function gate(key){return new Promise((resolve,reject)=>{call[key]=resolve;signal.addEventListener('abort',()=>{call.aborted=true;const e=new Error('paused');e.name='AbortError';reject(e)},{once:true})})}
  await signProof('council-media-upload',hash);onProgress({phase:'uploading',progress:.5});call.status='uploading';await gate('uploaded');
  onProgress({phase:'verifying',progress:.5});call.status='verifying';await gate('verified');call.status='ready';
  return {hash,kind:file.name.endsWith('.mp4')?'video':'image',contentType:file.name.endsWith('.mp4')?'video/mp4':'image/png',size:file.size,name:file.name,url:'/verified/'+hash};
 };
 `);
 fs.writeFileSync(entry,`
 const React=require('react'),{createRoot}=require('react-dom/client'),{AskPage}=require(${JSON.stringify(component)}),{CouncilContext}=require(${JSON.stringify(context)});
 window.councilHarness={uploads:[],proofs:0,prepared:[],quotes:[]};
 exports.mount=function(config,assets,address){
  function App(){const [connected,setConnected]=React.useState(false);const value={data:{config,assets:assets.filter(asset=>Number(asset.id)!==1088771340),proposals:[],votes:[],owned:[]},activeAddress:connected?address:null,activeNetwork:'mainnet',canAct:connected,busy:false,reviewing:false,setNotice:()=>{},connectWallet:()=>setConnected(true),signTransactions:async()=>{window.councilHarness.proofs++;return[new Uint8Array([1,2,3])]},prepare:async(action,input)=>window.councilHarness.prepared.push({action,input})};
   return React.createElement(CouncilContext.Provider,{value},React.createElement('button',{id:'connect-fixture',onClick:()=>setConnected(true)},'Connect fixture wallet'),React.createElement(AskPage));}
  createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(App)));
 };
 `);
 const compiled=require('next/dist/compiled/webpack/webpack');compiled.init();
 await new Promise((resolve,reject)=>compiled.webpack({mode:'development',target:['web','es2020'],context:root,entry,output:{path:dir,filename:'uploader.browser.js',library:{name:'CouncilUploaderTest',type:'var'},publicPath:'/'},resolve:{modules:[path.join(root,'node_modules')],fallback:{crypto:false}},module:{rules:[{test:/\.jsx?$/,exclude:/node_modules/,use:loader}]},plugins:[new compiled.webpack.ProvidePlugin({process:require.resolve('process/browser')}),new compiled.webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('development')}),new compiled.webpack.NormalModuleReplacementPlugin(/\/councilMediaUploads$/,resource=>{resource.request=transport;}),new compiled.webpack.optimize.LimitChunkCountPlugin({maxChunks:1})],optimization:{minimize:false},devtool:false},(error,stats)=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve()));
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage(),errors=[],writes=[];
 try{
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.pathname==='/council-upload-fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><div id="root"></div>'});
   if(url.pathname==='/v2/transactions/params')return route.fulfill({json:{'consensus-version':'test',fee:1000,'min-fee':1000,'last-round':100,'genesis-id':'mainnet-v1.0','genesis-hash':'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8='}});
   if(url.pathname==='/api/council/asset')return route.fulfill({json:{id:Number(url.searchParams.get('id')),name:'DARKCOIN',decimals:6}});
   if(url.pathname==='/api/council/quote'){writes.push(JSON.parse(request.postData()));return route.fulfill({json:{manifest:JSON.parse(request.postData()).proposal}});}
   return route.abort();
  });
  await page.goto(origin+'/council-upload-fixture');await page.addScriptTag({path:path.join(dir,'uploader.browser.js')});await page.evaluate(({config,assets,address})=>window.CouncilUploaderTest.mount(config,assets,address),{config,assets,address});
  await page.getByLabel('Proposal title').fill('A better community tournament');await page.getByLabel('Proposal prompt').fill('Bring the community together with a fresh tournament and a new challenge for every champion.');
  await page.getByLabel('Attach images or videos').setInputFiles([{name:'large-video.mp4',mimeType:'',buffer:Buffer.alloc(10*1024*1024)},{name:'reference.png',mimeType:'image/png',buffer:Buffer.from([1,2,3])}]);
  assert.equal(await page.locator('.cvUploadItem').count(),2,'Files immediately enter the local queue');assert.equal(await page.locator('.cvUploadPreview video').count(),1,'An empty browser MIME is recognized from its .mp4 name');assert(await page.getByRole('button',{name:'Finish uploading attachments'}).isDisabled());assert.equal(await page.evaluate(()=>window.councilHarness.uploads.length),0);
  await page.locator('form').evaluate(form=>form.requestSubmit());assert.equal(writes.length,0,'Queued attachments cannot quote');assert.equal(await page.evaluate(()=>window.councilHarness.proofs),0,'Queued attachments cannot ask for financial signatures');
  await page.locator('#connect-fixture').click();await page.waitForFunction(()=>window.councilHarness.uploads.length===2&&window.councilHarness.uploads.every(item=>item.status==='uploading'));
  assert.equal(await page.evaluate(()=>window.councilHarness.uploads.some(item=>item.aborted)),false,'Connecting starts queued uploads without immediately aborting them');assert.equal(await page.getByLabel('Proposal title').inputValue(),'A better community tournament','Connecting preserves the draft');
  await page.evaluate(()=>window.councilHarness.uploads.forEach(item=>item.uploaded()));await page.waitForFunction(()=>window.councilHarness.uploads.every(item=>item.status==='verifying'));assert(await page.getByRole('button',{name:'Finish uploading attachments'}).isDisabled());await page.locator('form').evaluate(form=>form.requestSubmit());assert.equal(writes.length,0,'Uploaded but unverified files cannot quote');assert.equal(await page.evaluate(()=>window.councilHarness.prepared.length),0,'No financial group is prepared while verification is pending');
  await page.evaluate(()=>window.councilHarness.uploads[0].verified());await page.locator('.cvUploadItem.isReady').waitFor();assert(await page.getByRole('button',{name:'Finish uploading attachments'}).isDisabled(),'One ready file cannot skip another pending file');
  await page.evaluate(()=>window.councilHarness.uploads[1].verified());await page.getByRole('button',{name:'Review proposal',exact:true}).waitFor();assert(await page.getByRole('button',{name:'Review proposal',exact:true}).isEnabled());await page.getByRole('button',{name:'Review proposal',exact:true}).click();await page.waitForFunction(()=>window.councilHarness.prepared.length===1);assert.equal(writes.length,1);assert.equal(writes[0].proposal.images.length,2);assert.equal(writes[0].proposal.images[0].kind,'video');assert.equal(writes[0].proposal.images[0].size,10*1024*1024);assert.equal(await page.evaluate(()=>window.councilHarness.uploads.length),2,'Both files reached READY without manual Resume');await page.getByRole('button',{name:/Include a treasury or Council action/}).click();await page.getByRole('button',{name:'Add action',exact:true}).click();await page.locator('.cvAssetShortcuts button').filter({hasText:'Dark Coin'}).click();await page.getByLabel('Amount (DARKCOIN)').waitFor();assert.equal(await page.getByLabel('Asset ID for action 1').inputValue(),'1088771340','Asset shortcut resolves uncached metadata without manual blur');assert.deepEqual(errors,[]);
  console.log('PASS actual Composer/Uploader: 10MB video + image queued before connection, automatic upload, no abort race, preserved draft, empty MIME, all-file verification gate, no quote/financial group before READY, exact final media metadata.');
 }catch(error){await page.screenshot({path:path.join(out,'upload-ui-failure.png'),fullPage:true}).catch(()=>{});console.error('Upload UI browser errors:',errors);throw error;}finally{await browser.close();}
};
