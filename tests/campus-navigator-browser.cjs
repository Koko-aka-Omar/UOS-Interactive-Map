// Local interaction tests against the actual map modules/markup and MapLibre.
// No added dependencies: supply the existing Playwright installation and map files.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const playwright=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'../M7A_GitHub_Website_Full_Resolution/m7a-building');
const support=process.env.HALLV3_BROWSER_ASSETS||root;
const screenshots=process.env.HALLV3_SCREENSHOTS;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const toolbar=html.slice(html.indexOf('<div class="campus-map-toolbar">'),html.indexOf('<div class="campus-map-location">'));
const fixture='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/maplibre-gl.css"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/ui-polish.css"></head><body class="campus-only"><aside id="map-panel" class="panel campus-map-panel open"><div id="campus-map"></div>'+toolbar+'</aside><script src="/maplibre-gl.js"></script><script type="module">import {CAMPUS_BUILDINGS} from "/campus-buildings.js";import {createDirectory} from "/campus-directory.js";import {CAMPUS_CORNERS,campusCameraPolicy,clampCampusCamera} from "/campus-geometry.js";import {addCampusArtworkLabels} from "/campus-map-labels.js";window.lang="en";window.enters=[];window.halls=CAMPUS_BUILDINGS;window.map=new maplibregl.Map({container:"campus-map",style:{version:8,sources:{campus:{type:"image",url:"/campus-map-2026.webp",coordinates:CAMPUS_CORNERS}},layers:[{id:"campus",type:"raster",source:"campus"}]},center:[55.477,25.280],zoom:15.7,attributionControl:false,maxPitch:0,renderWorldCopies:false,transformConstrain:(center,zoom)=>{const c=clampCampusCamera({center:[center.lng,center.lat],zoom},window.directory?.cameraPolicy()||campusCameraPolicy(innerWidth,innerHeight));return {center:new maplibregl.LngLat(...c.center),zoom:c.zoom};}});window.mapErrors=[];map.on("error",event=>mapErrors.push(event.error.message));window.directory=createDirectory({halls:CAMPUS_BUILDINGS,root:document.querySelector("#map-panel"),language:()=>window.lang,isReady:()=>true,openTour:target=>{enters.push(target);directory.leave();document.querySelector("#map-panel").classList.remove("open");history.pushState({tour:true},"","?tour="+target.scene);},canGuide:()=>false});const artwork=addCampusArtworkLabels(map,CAMPUS_CORNERS,CAMPUS_BUILDINGS,members=>directory.selectGroup(members));directory.attach(map,artwork);document.querySelector("#campus-language-toggle").onclick=()=>{lang=lang==="en"?"ar":"en";document.documentElement.lang=lang;document.documentElement.dir=lang==="ar"?"rtl":"ltr";directory.update();};window.addEventListener("popstate",()=>{document.querySelector("#map-panel").classList.add("open");directory.restore();});map.on("load",()=>{directory.restore();window.ready=true;});</script></body></html>';
const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://localhost');
  if(url.pathname==='/'){response.setHeader('Content-Type','text/html; charset=utf-8');response.end(fixture);return;}
  const external=['maplibre-gl.js','maplibre-gl.css','campus-map-2026.webp'].includes(url.pathname.slice(1));
  const file=path.resolve(external?support:root,'.'+url.pathname),base=external?support:root;
  if(!file.startsWith(path.resolve(base)+path.sep)||!fs.existsSync(file)||!/[.](js|css|webp|png)$/.test(file)){response.statusCode=404;response.end();return;}
  response.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'image/webp');response.end(fs.readFileSync(file));
});
const snap=page=>page.locator('.campus-map-card').getAttribute('data-snap');
const camera=page=>page.evaluate(()=>{const c=map.getCenter();return{center:[c.lng,c.lat],zoom:map.getZoom(),bearing:map.getBearing(),pitch:map.getPitch(),padding:map.getPadding()};});
const state=page=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('hallv3.campus-state.v1')));
async function assertCamera(page,expected){const actual=await camera(page);for(const key of ['zoom','bearing','pitch'])assert(Math.abs(actual[key]-expected[key])<1e-8,key);for(let i=0;i<2;i++)assert(Math.abs(actual.center[i]-expected.center[i])<1e-8);assert.deepEqual(actual.padding,expected.padding);}
async function settled(page){await page.waitForTimeout(310);}
async function consistency(page,count){assert.equal(await page.locator('.hall-result').count(),count);const matching=await page.evaluate(()=>[...document.querySelectorAll('.hall-result')].map(el=>el.dataset.buildingId));const highlighted=await page.locator('.campus-building-target.filter-match').evaluateAll(els=>els.map(el=>el.dataset.buildingId));assert.deepEqual([...new Set(highlighted)].sort(),[...new Set(matching)].filter(id=>!id.startsWith('landmark-')&&!['place-al-bayrouni','place-al-khawarzmi','place-ibn-khaldun','place-al-zahrawi'].includes(id)).sort());}
async function dragMouse(page,delta){const box=await page.locator('#directory-sheet-handle').boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;const before=await page.locator('.campus-map-card').boundingBox();await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-delta/2,{steps:5});const middle=await page.locator('.campus-map-card').boundingBox();assert(Math.abs(middle.height-before.height)>8,'Sheet moves before release');await page.mouse.move(x,y-delta,{steps:5});await page.waitForTimeout(130);await page.mouse.up();await settled(page);}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const engines=[['Chromium',playwright.chromium,process.env.HALLV3_CHROME?{executablePath:process.env.HALLV3_CHROME}:{}],['WebKit',playwright.webkit,{}]];
  let ran=0;
  for(const [name,engine,launch]of engines){
    let browser;try{browser=await engine.launch({headless:true,...launch});}catch(error){console.log('UNAVAILABLE '+name+': '+error.message.split('\n')[0]);continue;}
    try{
      const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);
      assert.equal(await snap(page),'peek');assert(await page.locator('#directory-body').isHidden());assert.equal(await page.locator('#campus-home-intro').count(),0);
      assert.equal(await page.locator('.campus-building-target').count(),79);assert.equal(await page.locator('.campus-availability').count(),6);
      const sourceBefore=await page.evaluate(()=>map.getStyle().sources['campus-tour-footprints'].data);
      assert.equal(sourceBefore.features.length,6);
      assert.equal(await page.evaluate(()=>map.getStyle().layers.filter(layer=>layer.id.startsWith('campus-tour-')).length),5);
      assert.deepEqual(await page.evaluate(()=>window.mapErrors),[]);
      const initial=await camera(page);
      if(screenshots)await page.screenshot({path:path.join(screenshots,name+'-desktop.png')});
      await page.getByRole('button',{name:'Dining',exact:true}).click();await page.getByRole('button',{name:'360° only',exact:true}).click();await consistency(page,2);
      await page.locator('#hall-search').fill('not-here');assert.equal(await page.locator('.hall-result').count(),0);assert(await page.locator('.directory-empty').isVisible());
      await page.locator('#campus-clear-search').click();await consistency(page,2);await assertCamera(page,initial);
      await page.locator('#hall-search').fill('C4');assert.equal(await page.locator('#directory-count').innerText(),'Dining · 16 results');
      await page.locator('#campus-clear-filters').click();assert.equal(await page.locator('#hall-search').inputValue(),'C4');await assertCamera(page,initial);
      await page.locator('#campus-reset').click();assert.equal(await page.locator('.hall-result').count(),86);await assertCamera(page,initial);
      await page.getByRole('button',{name:'Dining',exact:true}).click();await page.getByRole('button',{name:'Dining',exact:true}).click();assert.equal(await page.locator('.hall-result').count(),86);
      await page.evaluate(()=>directory.selectById('building-a2'));await settled(page);
      assert(await page.locator('#hall-detail').isVisible());await page.locator('#hall-search').fill('E4');assert(await page.locator('#hall-results').isVisible());assert(await page.locator('#directory-return').isVisible());
      await page.locator('.campus-filter-more summary').click();await page.getByRole('button',{name:'Sports',exact:true}).click();
      assert(await page.locator('.campus-filter-more').getAttribute('open')!==null);assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Sports');
      await page.getByRole('button',{name:'Sports',exact:true}).click();assert.equal(await page.locator('.hall-result').count(),1);await page.keyboard.press('Escape');assert.equal(await page.locator('.campus-filter-more').getAttribute('open'),null);
      await page.locator('#campus-clear-search').click();
      await page.evaluate(()=>directory.selectGroup([halls[0],halls[1]]));assert.equal(await page.locator('.hall-result').count(),2);
      await page.locator('#hall-search').fill('E4');assert.equal(await page.locator('.hall-result').count(),1);assert((await page.locator('.hall-result strong').innerText()).includes('E4'));
      await page.locator('#campus-reset').click();await page.getByRole('button',{name:'Dining',exact:true}).click();
      await page.evaluate(()=>{map.jumpTo({center:halls.find(h=>h.code==='E4').mapCoordinates,zoom:18.5,padding:{top:0,right:0,bottom:0,left:0}});});
      await page.locator('.campus-building-target[data-building-id="building-e4"]').click();await settled(page);
      assert(await page.locator('.outside-filter').isVisible());assert.equal(await page.getByRole('button',{name:'Dining',exact:true}).getAttribute('aria-pressed'),'true');
      const feature=await page.evaluate(()=>map.getFeatureState({source:'campus-tour-footprints',id:'building-e4'}));assert.equal(feature.selected,true);assert.equal(feature.muted,true);
      await page.locator('.campus-building-target[data-building-id="building-e4"]').hover();assert.equal(await page.locator('.campus-building-target.is-selected .campus-availability').count(),1);
      if(screenshots)await page.screenshot({path:path.join(screenshots,name+'-library-outline.png')});
      // Cross-zone keyboard targets remain distinct and hover never removes tour status.
      for(const id of ['building-a4','building-b1','building-c2','building-e4','building-f1','building-g1','building-h1']){
        await page.evaluate(id=>map.jumpTo({center:halls.find(h=>h.id===id).mapCoordinates,zoom:18.4,padding:{top:0,right:0,bottom:0,left:0}}),id);
        const marker=page.locator('.campus-building-target[data-building-id="'+id+'"]');await marker.focus();await marker.press('Enter');await settled(page);
        assert((await page.locator('#directory-title').innerText()).includes(await marker.locator('.campus-code-text').innerText()));
        assert.equal(await marker.getAttribute('aria-pressed'),'true');
      }
      assert.deepEqual(await page.evaluate(()=>map.getStyle().sources['campus-tour-footprints'].data),sourceBefore,'Stable geometry through state changes');
      await page.locator('#directory-browse').click();await page.locator('#campus-clear-filters').click();
      await page.locator('#directory-sheet-handle').press('End');await settled(page);
      await page.locator('#directory-body').evaluate(el=>el.scrollTop=350);await page.waitForTimeout(150);
      const scroll=await page.locator('#directory-body').evaluate(el=>el.scrollTop);
      await page.evaluate(()=>directory.selectById('building-a11'));assert.equal(await snap(page),'expanded');await page.locator('#directory-browse').click();
      assert.equal(await page.locator('#directory-body').evaluate(el=>el.scrollTop),scroll);
      await page.locator('#directory-return').click();await page.locator('.hall-inside summary').click();await page.locator('.room-choice[data-room-id="m7a-002"]').click();
      await page.evaluate(()=>map.jumpTo({center:[55.477,25.2801],zoom:16.234,padding:{top:3,right:4,bottom:5,left:6}}));
      await page.locator('#directory-body').evaluate(el=>el.scrollTop=120);await page.waitForTimeout(150);
      const expected=await camera(page);await page.locator('#campus-enter').click();const saved=await state(page);assert.equal(saved.roomId,'m7a-002');assert.equal(saved.snap,'expanded');
      await page.goBack();await settled(page);await assertCamera(page,expected);assert.equal(await snap(page),'expanded');assert.equal(await page.locator('.room-choice[aria-pressed=true]').getAttribute('data-room-id'),'m7a-002');
      assert.equal(await page.locator('#directory-body').evaluate(el=>el.scrollTop),saved.detailScroll);
      await page.reload();await page.waitForFunction(()=>window.ready);await assertCamera(page,expected);assert.equal(await snap(page),'expanded');assert.equal(await page.locator('.hall-inside').getAttribute('open'),'');
      await page.setViewportSize({width:390,height:844});await settled(page);await assertCamera(page,expected);assert.equal(await snap(page),'expanded');
      await page.locator('#campus-language-toggle').click();assert.equal(await page.locator('html').getAttribute('dir'),'rtl');await assertCamera(page,expected);
      await page.locator('#hall-search').fill('E٤');assert.equal(await page.locator('.hall-result').count(),1);assert((await page.locator('.hall-result strong').innerText()).includes('E4'));
      await page.locator('#campus-clear-search').click();await page.locator('#directory-sheet-handle').press('Home');await settled(page);
      const noDragCamera=await camera(page);await dragMouse(page,180);assert.equal(await snap(page),'half');await dragMouse(page,260);assert.equal(await snap(page),'expanded');await dragMouse(page,-600);assert.equal(await snap(page),'peek');await assertCamera(page,noDragCamera);
      // Capture interruption must settle safely without accidentally opening/closing.
      await page.evaluate(()=>document.querySelector('#directory-sheet-handle').addEventListener('pointerdown',e=>window.dragId=e.pointerId,{once:true}));
      const handle=await page.locator('#directory-sheet-handle').boundingBox();await page.mouse.move(handle.x+30,handle.y+12);await page.mouse.down();await page.mouse.move(handle.x+30,handle.y-100);
      await page.locator('#directory-sheet-handle').dispatchEvent('pointercancel',{pointerId:await page.evaluate(()=>window.dragId)});await page.mouse.up();await settled(page);assert.equal(await snap(page),'peek');
      await page.locator('#directory-collapse').click();await settled(page);assert.equal(await snap(page),'half');
      // Exposed map dragging works independently of sheet gestures.
      await page.locator('#directory-sheet-handle').press('Home');await settled(page);const beforeMapDrag=await camera(page);
      await page.mouse.move(200,440);await page.mouse.down();await page.mouse.move(250,470,{steps:8});await page.mouse.up();await page.waitForTimeout(400);
      assert.notDeepEqual((await camera(page)).center,beforeMapDrag.center,'Exposed map still pans');
      await page.evaluate(value=>map.jumpTo(value),noDragCamera);
      // Simulated visual viewport shrink follows keyboard geometry, without camera changes.
      await page.evaluate(()=>{Object.defineProperty(window.visualViewport,'height',{configurable:true,value:380});window.visualViewport.dispatchEvent(new Event('resize'));});
      assert(await page.locator('#map-panel').evaluate(el=>el.classList.contains('campus-keyboard')));assert.equal(await snap(page),'peek');await assertCamera(page,noDragCamera);
      await page.evaluate(()=>{delete window.visualViewport.height;window.visualViewport.dispatchEvent(new Event('resize'));});
      await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#directory-sheet-handle').press('End');assert.equal(await snap(page),'expanded');assert.equal(await page.locator('.campus-map-card').evaluate(el=>el.getAnimations().length),0);
      for(const viewport of [{width:360,height:740},{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
        await page.setViewportSize(viewport);await settled(page);assert.equal(await snap(page),'expanded');await assertCamera(page,noDragCamera);
        const box=await page.locator('.campus-map-card').boundingBox();assert(box.x>=-1&&box.y>=-1&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1,'Card stays in viewport');
        if(screenshots)await page.screenshot({path:path.join(screenshots,name+'-'+viewport.width+'.png')});
      }
      assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>window.mapErrors),[]);
      console.log('PASS '+name+': real MapLibre, composed filters/counts/map, stable More/focus, group escape, nonmatching selection, rooms/list scroll, enter/back/refresh camera+card restoration, RTL, mouse continuous drag/cancel, reduced motion and four responsive viewports');
      // Browser storage unavailable: in-memory restoration still works.
      const blocked=await browser.newPage({viewport:{width:390,height:844}});
      await blocked.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw Error('blocked');}}));await blocked.goto('http://127.0.0.1:'+server.address().port);await blocked.waitForFunction(()=>window.ready);
      await blocked.evaluate(()=>{directory.selectById('building-a11');directory.leave();directory.restore();});assert((await blocked.locator('#directory-title').innerText()).includes('A11'));await blocked.close();
      if(name==='Chromium'){
        const touch=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await touch.goto('http://127.0.0.1:'+server.address().port);await touch.waitForFunction(()=>window.ready);
        const session=await touch.context().newCDPSession(touch),box=await touch.locator('#directory-sheet-handle').boundingBox(),x=box.x+box.width/2,y=box.y+14;
        await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-100}]});
        const middle=await touch.locator('.campus-map-card').boundingBox();assert(middle.height>180);await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-150}]});await touch.waitForTimeout(130);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settled(touch);assert.equal(await snap(touch),'half');
        for(const [delta,wanted]of [[250,'expanded'],[-600,'peek']]){
          const handle=await touch.locator('#directory-sheet-handle').boundingBox(),px=handle.x+handle.width/2,py=handle.y+14;
          await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:px,y:py}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:px,y:py-delta/2}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:px,y:Math.max(5,Math.min(830,py-delta))}]});await touch.waitForTimeout(130);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settled(touch);assert.equal(await snap(touch),wanted);
        }
        await touch.close();console.log('PASS Chromium touch emulation: continuous finger movement and Peek/Half/Expanded snaps');
      }
      ran++;
    }finally{await browser.close();}
  }
  assert(ran>0,'At least one browser engine must run');server.close();
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
