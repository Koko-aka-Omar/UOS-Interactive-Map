// Run against the local full application preview; never modifies production data.
// HALLV3_PREVIEW_URL, PLAYWRIGHT_PATH, HALLV3_CHROME and HALLV3_SCREENSHOTS are optional.
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.HALLV3_PREVIEW_URL||'http://127.0.0.1:8765/';
const saved=p=>p.evaluate(()=>JSON.parse(sessionStorage.getItem('hallv3.campus-state.v1')));
async function clickVisible(p,selector){
 const el=p.locator(selector);assert(await el.isVisible(),selector+' visible');
 assert(await el.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),selector+' unobstructed pointer target');
 await el.click();
}
(async()=>{const b=await chromium.launch({headless:true,...(process.env.HALLV3_CHROME?{executablePath:process.env.HALLV3_CHROME}:{})});try{
 for(const [width,height]of [[1440,900],[1366,768],[1920,1080],[390,844],[360,800],[844,390]]){
  const ctx=await b.newContext({viewport:{width,height},serviceWorkers:'block',reducedMotion:'reduce'}),p=await ctx.newPage(),errors=[],requests=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
  await p.goto(base);await p.locator('.campus-building-target').first().waitFor({timeout:60000});await p.waitForTimeout(350);
  assert.equal(await p.locator('#campus-identity').textContent(),'Campus Navigator');
  assert.equal(await p.locator('[data-theme-toggle]').count(),2);assert.equal(await p.locator('[data-appearance]').count(),0);
  await clickVisible(p,'#campus-about');assert((await p.locator('#info-panel').innerText()).includes('Campus Navigator'));assert(await p.locator('#info-panel .share-card').evaluate(e=>e.hidden));await p.locator('#info-panel [data-close-panel]').click();
  await p.locator('#hall-search').fill('C4');await p.locator('.hall-result[data-room-id=""]').click();await p.locator('#directory-sheet-handle').press('End');await p.waitForTimeout(60);
  const state=await saved(p),url=p.url();
  for(const theme of ['dark','light']){
   await clickVisible(p,'#campus-controls [data-theme-toggle]');assert.equal(await p.locator('html').getAttribute('data-theme'),theme);assert.equal(p.url(),url);assert.deepEqual(await saved(p),state);
   for(const target of ['ar','en']){await clickVisible(p,'#campus-language-toggle');assert.equal(await p.locator('html').getAttribute('lang'),target);assert.equal((await p.locator('#campus-language-toggle').textContent()).trim(),target==='ar'?'English':'العربية');assert.equal(p.url(),url);const after=await saved(p);for(const key of ['camera','query','activeCategory','toursOnly','selectedId','roomId','mode','snap'])assert.deepEqual(after[key],state[key],key+' survives language change');
    if(process.env.HALLV3_SCREENSHOTS)await p.screenshot({path:path.join(process.env.HALLV3_SCREENSHOTS,`visual-${width}-${height}-${target}-${theme}.png`)});
   }
  }
  await p.locator('#directory-body').evaluate(e=>e.scrollTop=80);await p.waitForTimeout(160);const focusState=await saved(p),scroll=await p.locator('#directory-body').evaluate(e=>e.scrollTop);
  await clickVisible(p,'#campus-focus');assert(await p.locator('#map-panel').evaluate(e=>e.classList.contains('campus-focus')));await clickVisible(p,'#campus-language-toggle');await clickVisible(p,'#campus-language-toggle');await clickVisible(p,'#campus-focus');assert.equal(await p.locator('.campus-map-card').getAttribute('data-snap'),focusState.snap);assert.equal(await p.locator('#directory-body').evaluate(e=>e.scrollTop),scroll);assert.deepEqual((await saved(p)).camera,focusState.camera);
  await p.locator('#hall-search').fill('Library');await clickVisible(p,'#campus-language-toggle');await clickVisible(p,'#campus-language-toggle');
  const menu=p.locator('#campus-category-more');if(await menu.isVisible()){await menu.click();await clickVisible(p,'#campus-language-toggle');await clickVisible(p,'#campus-language-toggle');}
  await p.keyboard.press('Escape');await clickVisible(p,'#campus-controls [data-theme-toggle]');await p.reload();await p.locator('.campus-building-target').first().waitFor({timeout:60000});assert.equal(await p.locator('html').getAttribute('data-theme'),'dark');await p.emulateMedia({colorScheme:'light'});assert.equal(await p.locator('html').getAttribute('data-theme'),'dark');
  assert.equal(requests.filter(u=>/assets(-mobile)?\/.*\.glb/.test(u)).length,0,'UI actions load no panoramas');assert.deepEqual(errors,[]);await ctx.close();console.log('PASS visual UI',width,height,'EN/AR, light/dark, actual pointer access, Focus restoration, persistent theme, no panorama loads');
 }
 const denied=await b.newContext({serviceWorkers:'block'});await denied.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new DOMException('Denied','SecurityError')};Storage.prototype.setItem=()=>{throw new DOMException('Denied','SecurityError')};});const p=await denied.newPage();await p.goto(base);await p.locator('.campus-building-target').first().waitFor({timeout:60000});await clickVisible(p,'#campus-controls [data-theme-toggle]');assert.equal(await p.locator('html').getAttribute('data-theme'),'dark');await clickVisible(p,'#campus-language-toggle');assert.equal(await p.locator('html').getAttribute('lang'),'ar');await denied.close();console.log('PASS storage denied: usable theme and language fallback');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
