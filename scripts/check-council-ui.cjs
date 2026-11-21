const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {protocol,quoteProposal,formatUnits}=require('../functions/council/model');
const sdk=require('algosdk');
const origin=process.env.COUNCIL_PREVIEW_URL||'http://127.0.0.1:3015',out=path.resolve('output/council-navigation'),now=Math.floor(Date.now()/1000);
const address=String(sdk.generateAccount().addr);
const baseConfig={...protocol.defaults,ready:true,version:3,network:'mainnet',algodUrl:'https://mainnet-api.algonode.cloud',appId:1234,address:sdk.getApplicationAddress(1234).toString(),members:1114,host:require('../functions/council/hosting.json').address,treasury:'100000000',rewardReserved:'8000000',paused:'0'};
const reward=(8000000n/1114n).toString();
const proposal={id:'3',digest:'a'.repeat(64),title:'Poison resolves after a fighter acts',body:'Move poison damage to the end of the fighter’s turn. Keep poison damage and stack limits unchanged.',state:0,owner:address,created:now-100,deadline:now+10000,minVotes:'50',approvalBps:'6000',yes:30,no:20,abstain:0,turnout:50,support:60,rewardPool:'8000000',rewardPerVote:reward,rewardPaid:(BigInt(reward)*50n).toString(),eligibleMembers:'1114',reward,executed:'0',actions:[],images:[],textVerified:true};
const passed={...proposal,id:'2',state:1,title:'Approved tournament page',ended:true,deadline:now-100};
const declined={...passed,id:'1',state:2,title:'Declined treasury proposal'};
const assets=[{id:0,name:'ALGO',amount:'108000000',available:'100000000',decimals:6},{id:1088771340,name:'DARKCOIN',amount:'2815826625365',decimals:6}];
const owned=[{assetId:810866012,slot:0,proof:''},{assetId:810866158,slot:1,proof:''}];
const votes=[{proposalId:'3',nftId:810866158,address,choice:2,paidReward:reward,claimed:false}];
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  let activePage,activeErrors=[];
  try{
    for(const width of [1440,390]){
      const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[],queries=[],unexpectedWrites=[];
      activePage=page;activeErrors=errors;
      let config={...baseConfig};
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',async route=>{
        const request=route.request(),url=new URL(request.url());
        if(url.origin!==origin)return route.abort();
        if(url.pathname.startsWith('/api/')&&request.method()!=='GET'){unexpectedWrites.push(url.pathname);return route.abort();}
        if(url.pathname==='/api/council/dao'){
          queries.push(Object.fromEntries(url.searchParams));
          let proposals=[proposal,passed],pagination={hasMore:true,nextBefore:'2',total:3};
          if(url.searchParams.has('before')){proposals=[declined];pagination={hasMore:false,nextBefore:null,total:3};}
          if(url.searchParams.has('proposalId')){proposals=[proposal,passed,declined].filter(p=>p.id===url.searchParams.get('proposalId'));pagination=undefined;}
          if(url.searchParams.get('view')==='config'){proposals=[];pagination=undefined;}
          return route.fulfill({json:{config,proposals,owned,votes,walletHistory:[],assets,pagination}});
        }
        if(url.pathname==='/api/council/asset')return route.fulfill({json:{id:Number(url.searchParams.get('id')),name:'DARKCOIN',decimals:6}});
        if(url.pathname.startsWith('/api/'))return route.fulfill({status:404,json:{error:'Unexpected API read in UI fixture.'}});
        return route.continue();
      });
      await page.goto(origin+'/council/dao');
      await page.locator('.cvBoardToolbar').waitFor();
      assert.equal(await page.getByRole('link',{name:'COUNCIL',exact:true}).count(),1,'Launch flag exposes Council navigation');
      const navigation=page.getByRole('navigation',{name:'Council navigation',exact:true});
      assert.equal(await navigation.getByRole('link',{name:'Proposals',exact:true}).count(),1);
      assert.equal(await navigation.getByRole('link',{name:'Treasury',exact:true}).count(),1);
      assert.equal(await navigation.getByRole('link',{name:'New proposal',exact:true}).count(),1);
      assert.equal(await navigation.getByRole('link',{name:/Overview|rewards/i}).count(),0,'Council has no Overview or Rewards section');
      await page.screenshot({path:path.join(out,'proposals-'+width+'.png'),fullPage:true});

      await page.getByRole('button',{name:'Load more proposals'}).click();
      await page.getByRole('heading',{name:declined.title}).waitFor();
      assert.equal(await page.getByRole('button',{name:'Load more proposals'}).count(),0,'Pagination appends and stops at the final page');

      await page.goto(origin+'/council/ask');
      const title='Make poison damage timing consistent',body=Array(400).fill('word').join(' ');
      await page.getByLabel('Proposal title',{exact:true}).fill(title);
      await page.getByLabel('Proposal prompt',{exact:true}).fill(body);
      const expected=quoteProposal({title,body},config);
      assert((await page.locator('aside').innerText()).includes(expected.days+' days'));
      assert((await page.locator('aside').innerText()).includes(formatUnits(BigInt(expected.voters)/1114n,6)+' ALGO'),'Composer shows fixed instant reward');
      const oversized=Array(10001).fill('x').join(' ');
      await page.getByLabel('Proposal prompt',{exact:true}).fill(oversized);
      await page.getByRole('alert').filter({hasText:'Your draft is preserved'}).waitFor();
      assert.equal(await page.getByLabel('Proposal prompt',{exact:true}).inputValue(),oversized,'Oversized input remains editable');
      await page.getByLabel('Proposal prompt',{exact:true}).fill(body);
      assert.equal(await page.getByRole('alert').filter({hasText:'Your draft is preserved'}).count(),0);

      await page.getByRole('button',{name:/Include a treasury or Council action/}).click();
      await page.getByRole('button',{name:'Add action',exact:true}).click();
      await page.locator('.cvActionEditor select').first().selectOption('2');
      await page.getByLabel('Receive asset ID').fill('31566704');
      await page.getByLabel('Asset ID for action 1',{exact:true}).fill('1088771340');
      await page.getByLabel('Asset ID for action 1',{exact:true}).blur();
      await page.getByLabel('Amount (DARKCOIN)').fill('1000');
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({path:path.join(out,'composer-'+width+'.png'),fullPage:true});

      config={...baseConfig,baseFee:'12000000',wordFee:'40000',imageFee:'1000000',hostBps:5000,rewardBps:3000,shortDays:3,mediumDays:5,longDays:9,minVotes:75,approvalBps:7000};
      await page.goto(origin+'/council/ask');
      await page.getByLabel('Proposal prompt',{exact:true}).fill(body);
      assert((await page.locator('aside').innerText()).includes('Hosting 50%'));
      assert((await page.locator('aside').innerText()).includes('Voters 30%'));
      const rules=await page.locator('details.councilRules').textContent();
      assert(rules.includes('75 NFTs')&&rules.includes('70%')&&rules.includes('12 ALGO base'),'Current governance rules are dynamic');
      assert(/unused.*stays in the treasury/i.test(rules),'Unreceived voting rewards stay in the treasury');
      assert(/finaliz/i.test(rules),'Treasury availability is tied to finalization');

      await page.goto(origin+'/council/dao/3');
      await page.getByRole('heading',{name:proposal.title}).waitFor();
      assert((await page.locator('aside').innerText()).includes('60% approval required'),'Existing proposal keeps its frozen threshold');
      assert((await page.locator('aside').innerText()).includes(formatUnits(reward,6)),'Detail shows fixed reward');
      assert.equal(await page.getByRole('button',{name:'Copy approved proposal for AI'}).count(),0);
      await page.goto(origin+'/council/dao/2');
      await page.getByRole('button',{name:'Copy approved proposal for AI'}).click();
      const brief=await page.getByLabel('Approved execution brief').inputValue();
      assert(brief.includes('verify 2 --digest')&&brief.includes(passed.body));
      assert((await page.locator('aside').innerText()).includes('Voting rewards were paid during voting'));
      assert.equal(await page.getByRole('button',{name:/Return \d+ ballot deposits/}).count(),1,'Deposit returns remain on the finalized proposal');
      await page.goto(origin+'/council/rewards');
      await page.waitForURL(origin+'/council/dao');
      await page.locator('.cvBoardToolbar').waitFor();
      assert.equal(await page.getByRole('heading',{name:'A voice that gives back.'}).count(),0,'Legacy Rewards URL no longer exposes a section');

      config={...baseConfig,paused:'1'};
      await page.goto(origin+'/council/ask');
      await page.getByRole('button',{name:'Submissions paused'}).waitFor();
      assert((await page.locator('.cvNotice').innerText()).includes('paused'));
      await page.goto(origin+'/council/treasury');
      await page.getByRole('heading',{name:'Built for what comes next.'}).waitFor();
      assert((await page.locator('.councilBody').innerText()).includes('2,815,826.625365'));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'No horizontal overflow');
      assert(queries.some(q=>q.view==='config')&&queries.some(q=>q.proposalId==='3'),'Pages use scoped API reads');
      assert.equal(queries.some(q=>q.view==='rewards'),false,'Removed Rewards section does not request wallet reward history');
      assert.deepEqual(unexpectedWrites,[]);assert.deepEqual(errors,[]);
      console.log('PASS '+width+'px: removed Overview/Rewards sections, legacy redirect, treasury-retained unused rewards, proposal deposit returns, instant rewards, editable drafts, current/frozen governance, pagination, scoped reads, handoff, pause, responsive layout; no writes or browser exceptions.');
      activePage=null;await context.close();
    }
    await require('./check-council-upload-ui.cjs')({origin,out,config:baseConfig,assets,address});
    const legacy=await fetch(origin+'/council/rewards',{redirect:'manual'});
    assert.equal(legacy.status,307,'The removed Rewards route redirects on the server');
    assert.equal(new URL(legacy.headers.get('location'),origin).pathname,'/council/dao');
    for(const name of ['getDraft','getSlogan','sanitizeProposal','sanitizeAmend']){
      const response=await fetch(origin+'/api/council/'+name);
      assert.equal(response.status,410,'Retired AI endpoint '+name);
    }
    console.log('PASS all retired Council AI endpoints return 410 without invoking AI.');
    fs.writeFileSync(path.join(out,'council-ui-check.json'),JSON.stringify({checkedAt:new Date().toISOString(),origin,widths:[1440,390],removedSections:['Overview','Rewards'],legacyRewardsRedirect:307,unusedRewardsStayInTreasury:true,proposalDepositReturnsAvailable:true,allFilesVerifiedBeforeQuote:true,walletAndUploadTransportSimulated:true,mainnetTransactions:0},null,2)+'\n');
  }catch(e){if(activePage){await activePage.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});console.error('Browser errors:',activeErrors);console.error((await activePage.locator('body').innerText().catch(()=>'' )).slice(0,4000));}throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
