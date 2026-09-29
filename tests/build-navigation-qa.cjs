const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../M7A_GitHub_Website_Full_Resolution/m7a-building');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let tour=fs.readFileSync(path.join(root,'tour.js'),'utf8');
tour=tour.replace("const coarsePointer=matchMedia('(pointer:coarse)').matches;", "const coarsePointer=new URLSearchParams(location.search).has('mobile')||matchMedia('(pointer:coarse)').matches;");
tour=tour.replace("const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;", "const reducedMotion=true;");
tour=tour.replace("const requestedScene=new URLSearchParams(location.search).get('scene');", "const requestedScene=new URLSearchParams(location.search).get('scene')||'entrance';");
const harness=`
const qa=document.createElement('div');qa.style='position:fixed;top:115px;left:10px;z-index:100;background:#fff;color:#111;padding:10px;max-height:65vh;overflow:auto;font:12px monospace';document.body.append(qa);
const run=document.createElement('button');run.textContent='Run navigation checks';qa.append(run);
run.disabled=true;const enableWhenReady=()=>{if(ready)run.disabled=false;else requestAnimationFrame(enableWhenReady)};enableWhenReady();
const result=document.createElement('pre');qa.append(result);
const inspect=document.createElement('select');inspect.setAttribute('aria-label','Inspect route');
const inspections=LOCATIONS.flatMap((loc,from)=>loc.routes.map(route=>({from,route})));
inspections.forEach(({from,route},n)=>{const o=document.createElement('option');o.value=n;o.textContent=from+' to '+route.to+' '+route.label;inspect.append(o)});qa.append(inspect);
inspect.onchange=async()=>{const {from,route}=inspections[+inspect.value];await loadCheckpoint(from);yaw=-route.angle;pitch=-.30;camera.rotation.set(pitch,yaw,0);updateHotspotVisuals();renderer.render(scene,camera);};
run.onclick=async()=>{run.disabled=true;const lines=[];const check=(v,s)=>{if(!v)throw Error(s);lines.push('PASS '+s);result.textContent=lines.join('\\n')};try{
  currentLanguage='en';applyLanguage();
    check(LOCATIONS.length===81,'81 checkpoints');
  check(PANORAMA_FILES.length===LOCATIONS.length,'panorama count matches checkpoints');
  LOCATIONS.forEach((loc,index)=>{check(Boolean(loc.id),'scene '+index+' has an ID');check(Array.isArray(loc.routes),'scene '+index+' has routes')});
  const tip=new THREE.Vector3(0,1,0);
  for(const {from,route} of inspections){
    const root=hotspotRoots[0];placeOne(root,route);root.updateMatrixWorld(true);
    const direction=tip.clone().transformDirection(root.userData.arrow.matrixWorld);
    const travel=new THREE.Vector3(Math.sin(route.angle),0,-Math.cos(route.angle));
    check(direction.dot(travel)>.999999,'arrow direction '+from+' -> '+route.to);
    check(!!routeFromTo(route.to,from),'return route '+route.to+' -> '+from);
  }
  await loadCheckpoint(0);
  for(const to of [1,6,1,7,1,2,8,2,9,2,1,0,3,4,5,4,3,0]){
    const from=current;await transitionTo(to);check(current===to&&!transitioning&&ready,'travel '+from+' -> '+to);
    check(hotspotRoots.filter(r=>r.visible).length===LOCATIONS[to].routes.length,'hotspots at '+to);
    check(document.getElementById('route-label').textContent===locationLabel(to),'label at '+to);
  }
  await loadCheckpoint(10);current=10;updateControls();
  for(const to of [12,11,12,13,14,15,14,13,12,10]){
    const from=current;await transitionTo(to);check(current===to&&!transitioning&&ready,'theater travel '+from+' -> '+to);
    check(hotspotRoots.filter(r=>r.visible).length===LOCATIONS[to].routes.length,'theater hotspots at '+to);
    check(document.getElementById('route-label').textContent===locationLabel(to),'theater label at '+to);
  }
  await loadCheckpoint(0);current=0;updateControls();
  check(guidanceDone&&hint.getAttribute('aria-hidden')==='true','guidance completes after travel');
  await transitionTo(8);check(current===0,'arrow travel cannot jump to an unconnected room');
  for(const to of [8,4,6,5,9,3,7,2,1,0]){
    const success=await navigateFromMap(to);
    check(success&&current===to&&!transitioning,'map jump to '+to);
    check(pitch===0,'map arrival is level');
    check(!mapPanel.classList.contains('open')&&mapPanel.inert,'map closes after selection');
    check([...document.querySelectorAll('.map-node.current')].every(n=>Number(n.dataset.location)===to),'map current marker '+to);
    check(document.querySelector('[data-floor-view].active').dataset.floorView===(LOCATIONS[to].area==='Top Floor'?'top':'ground'),'map floor '+to);
  }
  await navigateFromMap(-1);await navigateFromMap(99);await navigateFromMap(0);
  check(current===0&&!transitioning,'invalid and current map destinations are ignored');
  const firstJump=navigateFromMap(8);await navigateFromMap(4);await firstJump;
  check(current===8,'rapid map taps cannot overlap transitions');
  const savedLoader=loadCheckpoint,savedGuidance=guidanceDone;
  guidanceDone=false;
  loadCheckpoint=async(i,...args)=>{if(i===9)throw new Error('QA simulated destination failure');return savedLoader(i,...args)};
  try{await navigateFromMap(9);}finally{loadCheckpoint=savedLoader;}
  check(current===8&&object&&ready&&!transitioning,'failed map load restores usable view');
  check(!guidanceDone,'failed travel does not complete guidance');hideTravelError();guidanceDone=savedGuidance;updateGuidance();
  await navigateFromMap(0);
  yaw=-LOCATIONS[0].routes[0].angle;pitch=-.3;camera.rotation.set(pitch,yaw,0);
  updateRouteLabel();check(routeTip.classList.contains('show')&&routeTip.textContent==='Study Rooms','facing route shows one label');
  togglePanel(mapPanel,mapToggle);check(!mapPanel.classList.contains('open')&&routeTip.classList.contains('show'),'disabled map stays closed');
  yaw+=Math.PI;camera.rotation.set(pitch,yaw,0);updateRouteLabel();
  check(!routeTip.classList.contains('show'),'offscreen route label is hidden');
  const languageState={current,object,yaw,pitch,fov:camera.fov};
  togglePanel(mapPanel,mapToggle);currentLanguage='ar';applyLanguage();
  check(document.documentElement.lang==='ar'&&document.documentElement.dir==='rtl','Arabic language and direction');
  check(cp.textContent==='الردهة الرئيسية · المدخل'&&floorBadge.textContent==='الأرضي','Arabic checkpoint labels');
  check(document.querySelector('[data-i18n="mapTitle"]').textContent==='خريطة جولة M7A','Arabic interface copy');
  check(!mapPanel.classList.contains('open')&&current===languageState.current&&object===languageState.object&&yaw===languageState.yaw&&pitch===languageState.pitch&&camera.fov===languageState.fov,'language switch preserves disabled map and tour state');
  check(document.querySelector('.map-node[data-location="1"]').getAttribute('aria-label').includes('قاعات الدراسة'),'Arabic map accessibility labels');
  currentLanguage='en';applyLanguage();closePanels();
  check(document.documentElement.lang==='en'&&cp.textContent==='Main Hall · Entrance','English restores without navigation');
  const shared=new URL(sceneLink());
  check(shared.searchParams.get('scene')==='entrance'&&sceneLinkElement.href===shared.href,'share link targets current scene');
  check(shareLocation.textContent===locationLabel(),'share card shows current location');
  result.textContent+='\\nALL CHECKS PASSED';
}catch(e){result.textContent+='\\nFAIL '+e.stack}finally{run.disabled=false}};
`;
const moduleTag=/<script type="module"(?: src="\.\/tour\.js[^"]*"><\/script>|>[\s\S]*?await import\([\'"]\.\/tour\.js[\'"]\);[\s\S]*?<\/script>)/;
if(!moduleTag.test(html))throw new Error('tour module script tag not found');
html=html.replace(moduleTag,'<script type="module">\n'+tour+'\n'+harness+'\n</script>');
fs.writeFileSync(path.join(root,'qa.html'),html);
