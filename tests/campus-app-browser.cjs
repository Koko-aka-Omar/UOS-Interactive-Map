// Full app browser journey. Uses the existing browser/dependency installation.
// Set HALLV3_BASE_REF for cached-shell migration and HALLV3_SCREENSHOTS for captures.
// One existing tour is loaded by the browser; no panorama files are changed.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),https=require('node:https'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'../M7A_GitHub_Website_Full_Resolution/m7a-building');
const support=process.env.HALLV3_BROWSER_ASSETS||root;
const screenshots=process.env.HALLV3_SCREENSHOTS;
const assetOrigin=process.env.HALLV3_LIVE_ASSETS||'https://koko-aka-omar.github.io/hallV3/';
const {execFileSync}=require('node:child_process');
const git=process.env.HALLV3_GIT||'git';
let priorShell=false;const priorFiles=new Map();
const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://localhost'),rel=url.pathname==='/'?'index.html':url.pathname.slice(1),file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)){response.statusCode=403;response.end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isFile()){
    const ext=path.extname(file);response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'})[ext]||'application/octet-stream');
    if(priorShell&&['.html','.js','.css'].includes(ext)&&rel!=='campus-sheet.js'){
      if(!priorFiles.has(rel))priorFiles.set(rel,execFileSync(git,['show',process.env.HALLV3_BASE_REF+':M7A_GitHub_Website_Full_Resolution/m7a-building/'+rel],{cwd:path.resolve(__dirname,'..')}));
      response.end(priorFiles.get(rel));
    }else response.end(fs.readFileSync(file));return;
  }
  if(rel==='campus-map-2026.webp'){response.setHeader('Content-Type','image/webp');response.end(fs.readFileSync(path.join(support,'campus-map-2026.webp')));return;}
  // Browser-only asset loading for the real tour journey. No asset enumeration.
  if(/^(assets(-mobile)?\/[\w.-]+\.glb|panoramas-mobile\/[\w.-]+\.jpg|favicon.svg|apple-touch-icon.png|manifest.webmanifest|social-preview.png)$/.test(rel)){
    https.get(assetOrigin+rel+url.search,remote=>{response.writeHead(remote.statusCode,remote.headers);remote.pipe(response);}).on('error',error=>{response.statusCode=502;response.end(error.message);});return;
  }
  response.statusCode=404;response.end();
});
const readState=page=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('hallv3.campus-state.v1')));
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.HALLV3_CHROME?{executablePath:process.env.HALLV3_CHROME}:{})});
  try{
    const context=await browser.newContext({viewport:{width:1280,height:820}}),page=await context.newPage(),errors=[],requests=[];
    page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
    await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('.campus-building-target').first().waitFor({timeout:60000});
    await page.waitForTimeout(500);assert(await page.locator('#map-panel').evaluate(el=>el.classList.contains('open')));
    assert.equal(await page.locator('.campus-map-card').getAttribute('data-snap'),'peek');assert.equal(requests.filter(url=>/assets(-mobile)?\/.*\.glb/.test(url)).length,0);
    await page.locator('#campus-about').click();assert(await page.locator('#info-panel').evaluate(el=>el.classList.contains('open')));assert.equal(await page.locator('#campus-area-count').textContent(),'6');assert.equal(await page.locator('#campus-view-count').textContent(),'81');
    await page.locator('#info-panel [data-close-panel]').click();assert(!(await page.locator('#info-panel').evaluate(el=>el.classList.contains('open'))));assert(await page.locator('#map-panel').evaluate(el=>el.classList.contains('open')));
    await page.locator('#hall-search').fill('M7A002');await page.locator('.hall-result').click();await page.locator('#directory-sheet-handle').press('End');await page.waitForTimeout(310);
    await page.locator('.hall-inside summary').click();await page.locator('#directory-body').evaluate(el=>el.scrollTop=90);await page.waitForTimeout(150);
    const before=await readState(page);assert.equal(before.roomId,'m7a-002');assert.equal(before.snap,'expanded');
    if(screenshots)await page.screenshot({path:path.join(screenshots,'HallV3-navigator-full-app-before-tour.png')});
    const scene=await page.locator('#directory-actions').getAttribute('data-target');
    await page.locator('#campus-enter').click();await page.waitForFunction(()=>document.querySelector('#loading').classList.contains('done')&&!document.body.classList.contains('campus-only'),{timeout:90000});
    assert.equal(new URL(page.url()).searchParams.get('scene'),scene);assert(!(await page.locator('#map-panel').evaluate(el=>el.classList.contains('open'))));
    await page.locator('#map-toggle').click();await page.waitForTimeout(350);const returned=await readState(page);
    for(const key of ['camera','selectedId','roomId','mode','snap','query','activeCategory','toursOnly','detailScroll','sections'])assert.deepEqual(returned[key],before[key],key+' returns exactly');
    await page.locator('.campus-map-close').click();await page.goBack();await page.waitForTimeout(350);assert(await page.locator('#map-panel').evaluate(el=>el.classList.contains('open')));
    await page.goForward();await page.waitForTimeout(350);assert(!(await page.locator('#map-panel').evaluate(el=>el.classList.contains('open'))));
    await page.goBack();await page.waitForTimeout(350);await page.reload();await page.locator('.campus-building-target').first().waitFor({timeout:60000});await page.waitForTimeout(350);
    assert.equal(await page.locator('.campus-map-card').getAttribute('data-snap'),'expanded');assert((await page.locator('#directory-title').innerText()).includes('A11'));
    await page.locator('#campus-language-toggle').click();assert.equal(await page.locator('html').getAttribute('dir'),'rtl');assert.equal(await page.locator('#campus-overview').innerText(),'نظرة عامة');
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);if(screenshots)await page.screenshot({path:path.join(screenshots,'HallV3-navigator-full-app-mobile.png')});
    assert.deepEqual(errors,[]);
    const cache=await page.evaluate(async()=>({names:await caches.keys(),core:globalThis.UOS_TOUR_ASSETS.coreAssets,build:globalThis.UOS_TOUR_ASSETS.buildId,worker:Boolean(navigator.serviceWorker.controller)}));
    assert(cache.core.includes('./campus-sheet.js'));console.log('PASS full application: compact startup with zero panorama requests; About counts/close; actual M7A-002 GLB entry; exact map/card/room/query/scroll restore; browser Back/Forward; refresh; Arabic; mobile; no new page errors');console.log('CACHE',cache);
    // Upgrade a real previously cached shell, not only a fresh browser context.
    if(process.env.HALLV3_BASE_REF){
    priorShell=true;
    const oldContext=await browser.newContext({viewport:{width:1280,height:820}}),upgrade=await oldContext.newPage(),upgradeErrors=[];
    upgrade.on('pageerror',error=>upgradeErrors.push(error.message));
    await upgrade.goto('http://127.0.0.1:'+server.address().port);await upgrade.locator('#campus-identity').waitFor({state:'visible',timeout:60000});
    await upgrade.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),{timeout:60000});
    await upgrade.locator('#hall-search').fill('E4');await upgrade.locator('.hall-result').click();await upgrade.waitForTimeout(400);
    const oldState=await readState(upgrade);
    if(screenshots)await upgrade.screenshot({path:path.join(screenshots,'HallV3-navigator-before.png')});
    const oldCaches=await upgrade.evaluate(()=>caches.keys()),panoramaCache=oldCaches.find(name=>name.endsWith(':panoramas-v8'));
    // A test sentinel proves existing panorama-cache entries survive shell migration.
    await upgrade.evaluate(async name=>(await caches.open(name)).put('/cache-preservation-sentinel',new Response('preserved')),panoramaCache);
    priorShell=false;await upgrade.reload();await upgrade.locator('#campus-identity').waitFor({state:'visible',timeout:60000});await upgrade.waitForFunction(()=>document.querySelector('.campus-building-target.is-selected')?.dataset.buildingId==='building-e4',{timeout:60000});
    const migrated=await readState(upgrade);assert.equal(migrated.version,2);assert.equal(migrated.query,'E4');assert.equal(migrated.selectedId,'building-e4');assert.deepEqual(migrated.camera,oldState.camera);
    assert(await upgrade.evaluate(async name=>Boolean(await(await caches.open(name)).match('/cache-preservation-sentinel')),panoramaCache));assert.deepEqual(upgradeErrors,[]);
    if(screenshots)await upgrade.screenshot({path:path.join(screenshots,'HallV3-navigator-after.png')});await oldContext.close();console.log('PASS cached published shell -> new shell: automatic coherent startup, v1 state migration, exact camera/query/selection, retained panorama cache and no page errors');
    }else console.log('SKIP cached prior-shell upgrade: set HALLV3_BASE_REF to an existing baseline commit');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
