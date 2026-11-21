// Landing-page layout and destination checks. No wallet connections or writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const origin=process.env.SECTION_NAVIGATION_ORIGIN||'http://127.0.0.1:3015';
const out=path.resolve(process.env.SECTION_NAVIGATION_OUTPUT||'output/section-navigation');
const expectedBuild=process.env.SECTION_NAVIGATION_BUILD_ID;
const sections={
  arena:{heading:'Arena',logo:'/home/arenaLogo.png',routes:['/arena/armory']},
  market:{heading:'Market',logo:'/home/marketLogo.png',routes:['/market/browse','/market/list','/market/stall']},
  council:{heading:'Council',logo:'/home/councilLogo.png',routes:['/council/dao','/council/ask','/council/treasury']},
};
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const report={origin,checkedAt:new Date().toISOString(),checks:[]};
  try{for(const width of [1440,390,320]){
    const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();
    const errors=[],unexpectedWrites=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.origin!==origin)return route.abort();
      if(!['GET','HEAD'].includes(request.method())){unexpectedWrites.push(url.pathname);return route.abort();}
      return route.continue();
    });
    let reference;
    for(const[section,expected]of Object.entries(sections)){
      const response=await page.goto(origin+'/'+section);assert.equal(response.status(),200);
      const landing=page.locator(`[data-section-navigation="${section}"]`);
      await landing.waitFor();await landing.locator('[data-section-heading]').filter({hasText:expected.heading}).waitFor();
      if(expectedBuild)assert.equal(await page.locator('#__NEXT_DATA__').evaluate(element=>JSON.parse(element.textContent).buildId),expectedBuild,'Serving the expected release');
      const links=await landing.locator('[data-section-card-action]').evaluateAll(elements=>elements.map(element=>element.getAttribute('href')));
      for(const route of expected.routes)assert(links.includes(route),section+' preserves '+route);
      if(section==='arena')assert(links.includes('/arena/playtest')||await landing.getByText('Arena entry is temporarily closed.').count(),'Arena admission gate is preserved');
      if(section==='council')assert.equal(await landing.getByText(/^(Overview|Rewards|My rewards)$/i).count(),0);
      assert.equal(await landing.locator('h1').count(),1);
      assert.equal(await landing.getByRole('navigation',{name:expected.heading+' destinations'}).count(),1);
      const layout=await landing.evaluate(element=>{
        const hero=getComputedStyle(element.querySelector('[data-section-hero]')),
          heading=getComputedStyle(element.querySelector('[data-section-heading]')),
          card=getComputedStyle(element.querySelector('[data-section-card-shell]')),
          title=getComputedStyle(element.querySelector('h2')),
          button=getComputedStyle(element.querySelector('[data-section-card-action]'));
        return {heroMinHeight:hero.minHeight,headingSize:heading.fontSize,headingSpacing:heading.letterSpacing,
          cardMinHeight:card.minHeight,cardBorder:card.border,cardRadius:card.borderRadius,
          cardTitleSize:title.fontSize,buttonHeight:button.minHeight,buttonFont:button.font,buttonSpacing:button.letterSpacing};
      });
      if(reference)assert.deepEqual(layout,reference,'Section spacing, type, cards and actions share one design');else reference=layout;
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No page overflow');
      for(const button of await landing.locator('[data-section-card-action]').all()){
        const box=await button.boundingBox();assert(box.x>=0&&box.x+box.width<=width,'Card action remains in viewport');
      }
      const images=await landing.locator('img').evaluateAll(elements=>elements.map(image=>image.src));
      assert(images.some(url=>url.endsWith(expected.logo)),'Section keeps its own emblem');
      await page.evaluate(async()=>{
        const urls=new Set(Array.from(document.querySelectorAll('[data-section-navigation] *')).flatMap(element=>Array.from(getComputedStyle(element).backgroundImage.matchAll(/url\("?([^"\)]+)"?\)/g),match=>match[1])));
        await Promise.all(Array.from(urls,url=>{const image=new Image();image.src=url;return image.decode();}));
      });
      await page.waitForTimeout(900); // Let the existing global navigation entrance finish.
      await page.screenshot({path:path.join(out,section+'-'+width+'.png'),fullPage:true,animations:'disabled'});
      report.checks.push({section,width,cards:await landing.locator('[data-section-card]').count(),routes:links,layout});
    }
    assert.deepEqual(errors,[]);assert.deepEqual(unexpectedWrites,[]);await context.close();
  }
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('PASS: Arena, Market and Council navigation share layouts at1440px,390px and320px; section assets/destinations and Arena admission gate preserved; no browser exceptions or writes.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
