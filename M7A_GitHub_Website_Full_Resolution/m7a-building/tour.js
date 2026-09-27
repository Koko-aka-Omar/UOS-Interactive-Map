import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HALLS } from './halls.js?v=20260927-3';
import { addCampusArtworkLabels } from './campus-map-labels.js?v=20260927-3';
import { createDirectory, searchHalls, localized } from './campus-directory.js?v=20260927-polish1';
import { findPath } from './directions.js';
import { PANORAMA_FILES, VISUAL_CALIBRATION, LOCATIONS, LOCATION_AR, getHotspotStyle } from './tour-routes.js?v=20260927-3';
import { I18N } from './tour-i18n.js?v=20260927-polish1';

const app=document.getElementById('app');
const loading=document.getElementById('loading');
const cp=document.getElementById('cp');
const floorBadge=document.getElementById('floor-badge');
const routeTip=document.getElementById('route-tip');
const loadProgressBar=document.getElementById('load-progress-bar');
const loadProgressText=document.getElementById('load-progress-text');
const coarsePointer=matchMedia('(pointer:coarse)').matches;
const languageToggle=document.getElementById('language-toggle');
const campusLanguageToggle=document.getElementById('campus-language-toggle');
const languageKey='m7a-language-v1';
let currentLanguage='en';
try{if(localStorage.getItem(languageKey)==='ar')currentLanguage='ar';}catch{}
function t(key,...args){const value=I18N[currentLanguage][key]??I18N.en[key]??key;return typeof value==='function'?value(...args):value;}
// Phones/tablets use dedicated 3K/4K panoramas. Desktop keeps the full 8K originals.
const DATA=PANORAMA_FILES.map(file=>(coarsePointer?'./assets-mobile/':'./assets/')+file+(file==='library-study-020.glb'?'?v=20260927-study1':file==='library-study-021.glb'?'?v=20260927-3':''));

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,0.01,50);
const CAMERA_HEIGHT=0.45;
camera.position.set(0,CAMERA_HEIGHT,0);
camera.rotation.order='YXZ';

const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
function renderQuality(enhanced=false){
  // Keep phone rendering within a smaller GPU budget; preserve desktop supersampling.
  const pixelBudget=coarsePointer?(enhanced?2400000:1000000):6000000;
  const budget=Math.sqrt(pixelBudget/(innerWidth*innerHeight));
  renderer.setPixelRatio(coarsePointer
    ? Math.min(devicePixelRatio||1,enhanced?2:1.5,budget)
    : Math.max(1,Math.min(Math.max(devicePixelRatio,1.35),2,budget)));
}
renderQuality();
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);
const el=renderer.domElement;

const loader=new GLTFLoader();

// Two levels of caching:
// 1) on desktop, connected GLBs are fetched into the browser HTTP cache;
// 2) on desktop, a likely destination stays decoded/prepared in memory.
// Desktop keeps one full-resolution destination prepared.
// Phones use separate 3072×1536 files and keep one likely destination prepared for instant travel.
const preloadCache=new Map();
const networkPrefetches=new Map();
const recentScenes=new Map();
const DECODED_PRELOAD_LIMIT=1;
const RECENT_SCENE_LIMIT=coarsePointer?0:1;

function prefetchNetwork(i){
  if(i<0 || i>=DATA.length || i===current || networkPrefetches.has(i))return networkPrefetches.get(i);
  const task=fetch(DATA[i],{cache:'force-cache'})
    .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();})
    .catch(err=>{console.warn('Network prefetch failed for checkpoint',i+1,err);return null;})
    .finally(()=>networkPrefetches.delete(i));
  networkPrefetches.set(i,task);
  return task;
}

function evictDecodedPreload(i){
  const task=preloadCache.get(i);
  preloadCache.delete(i);
  if(task)task.then(gltf=>{
    if(gltf && i!==current && !recentScenes.has(i))dispose(gltf.scene);
  }).catch(()=>{});
}

function trimDecodedPreloads(keep=null){
  while(preloadCache.size>DECODED_PRELOAD_LIMIT){
    const victim=[...preloadCache.keys()].find(k=>k!==keep && k!==current);
    if(victim==null)break;
    evictDecodedPreload(victim);
  }
}

function preloadCheckpoint(i,warmTexture=false){
  if(i<0 || i>=DATA.length || i===current || recentScenes.has(i))return null;
  prefetchNetwork(i);
  if(preloadCache.has(i)){
    const task=preloadCache.get(i);
    preloadCache.delete(i);preloadCache.set(i,task);
    if(warmTexture)task.then(gltf=>{if(gltf)prepareCheckpointScene(gltf,i,true);});
    return task;
  }
  const networkWarm=coarsePointer?(networkPrefetches.get(i)??prefetchNetwork(i)):null;
  const task=(networkWarm??Promise.resolve()).then(()=>loader.loadAsync(DATA[i])).then(gltf=>{
    prepareCheckpointScene(gltf,i,warmTexture);
    return gltf;
  }).catch(err=>{
    preloadCache.delete(i);
    console.warn('Preload failed for checkpoint',i+1,err);
    return null;
  });
  preloadCache.set(i,task);
  trimDecodedPreloads(i);
  return task;
}

function connectedTargets(){
  return [...new Set((LOCATIONS[current]?.routes??[]).map(r=>r.to).filter(i=>i!=null && i!==current))];
}

function scheduleLikelyPreload(){
  const routes=LOCATIONS[current]?.routes??[];
  const targets=connectedTargets();
  const prioritized=[
    ...routes.filter(r=>!r.back).map(r=>r.to),
    ...routes.filter(r=>r.back).map(r=>r.to)
  ].filter((v,i,a)=>v!=null && a.indexOf(v)===i && !recentScenes.has(v));

  // Mobile panoramas are small enough to keep one likely destination decoded and
  // GPU-ready. This makes the common forward tap a scene swap instead of a decode.
  if(coarsePointer){
    const likely=prioritized[0];
    if(likely!=null){
      prefetchNetwork(likely);
      const run=()=>preloadCheckpoint(likely,true);
      if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:700});
      else setTimeout(run,120);
    }
    return;
  }

  // Desktop can warm every connected file because it has a larger memory/network budget.
  targets.forEach(prefetchNetwork);

  // Fully decode the most likely destinations on desktop only.

  const run=()=>{
    prioritized.slice(0,DECODED_PRELOAD_LIMIT).forEach((target,index)=>{
      const load=()=>preloadCheckpoint(target,!coarsePointer&&index===0);
      if(index===0)load();else setTimeout(load,180*index);
    });
  };
  if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:450});else setTimeout(run,90);
}

let hoverPreloadTimer=null;
function queueRoutePreload(target){
  if(target==null || target===current || recentScenes.has(target))return;
  prefetchNetwork(target);
  if(coarsePointer){
    // Reuse the same in-flight decode if the visitor taps before the idle preload finished.
    preloadCheckpoint(target,true);
    return;
  }
  clearTimeout(hoverPreloadTimer);
  hoverPreloadTimer=setTimeout(()=>preloadCheckpoint(target,!coarsePointer),55);
}
const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let ready=false;
let current=0, object=null, yaw=0, pitch=0, dragging=false, sx=0, sy=0, syaw=0, spitch=0, transitioning=false, downX=0, downY=0;
const travelError=document.getElementById('travel-error');
const travelErrorTitle=document.getElementById('travel-error-title');
const travelErrorCopy=document.getElementById('travel-error-copy');
const travelErrorBack=document.getElementById('travel-error-back');
const travelErrorRetry=document.getElementById('travel-error-retry');
let failedTravel=null;
function hideTravelError(){travelError.hidden=true;failedTravel=null;}
function showTravelError(target,retry){
  failedTravel=retry;
  travelErrorTitle.textContent=t('locationUnavailable');
  travelErrorCopy.textContent=retry?.kind==='reload'?t('checkConnection'):t('errorCopy',locationLabel(target));
  travelErrorBack.textContent=object?t('backToTour'):t('backToCampusError');
  travelErrorRetry.textContent=t('retry');
  travelError.hidden=false;
}
travelErrorBack.onclick=()=>{
  const hasView=Boolean(object);hideTravelError();
  if(!hasView){const url=new URL(location.href);url.search='';url.hash='';location.assign(url.href);}
};
travelErrorRetry.onclick=()=>{
  const retry=failedTravel;hideTravelError();
  if(!retry)return;
  if(retry.kind==='transition')transitionTo(retry.target,retry.route,retry.fromMap);
  else if(retry.kind==='campus')openPanoramaFromCampus(retry.target);
  else location.reload();
};
// Bearings are local to each panorama: angle = horizontal image fraction * 2PI.
// Aim at corridor vanishing points / doorway centres, not floor-tile seams.
// Reverse routes must be calibrated in their own image, not by adding PI.
// Outdoor destinations are buildings; indoor checkpoints stay in LOCATIONS.
// M7 coordinates supplied by the site owner.
const CAMPUS_BUILDINGS=HALLS;
// Render the portrait source artwork 90° clockwise so the campus runs horizontally.
// Order is image TL→NE, TR→SE, BR→SW, BL→NW.
const CAMPUS_MAP_CORNERS=[
  [55.48841122384587,25.282745259662605],
  [55.48841122384587,25.27822411937236],
  [55.465534303353394,25.27822411937236],
  [55.465534303353394,25.282745259662605]
];
const requestedScene=new URLSearchParams(location.search).get('scene');
const requestedSceneIndex=LOCATIONS.findIndex(loc=>loc.id===requestedScene);
const INITIAL_SCENE=requestedSceneIndex>=0?requestedSceneIndex:0;
let loadingScene=INITIAL_SCENE;

const FLOOR_Y=0.03;
// Guidance uses local storage only; restricted/private storage must never block a tour.
const hint=document.getElementById('hint');
const guidanceKey='m7a-guidance-v1:'+location.pathname.replace(/[^/]*$/,'');
let guidanceDone=false,guidanceLooked=false;
try{guidanceDone=localStorage.getItem(guidanceKey)==='done';}catch{}
function updateGuidance(){
  hint.classList.toggle('guidance-active',!guidanceDone);
  hint.classList.toggle('guidance-done',guidanceDone);
  hint.setAttribute('aria-hidden',String(guidanceDone));
  if(!guidanceDone)hint.textContent=guidanceLooked?t('tapArrow'):motionEnabled?t('moveOrDrag'):t('drag');
}
function noteLookAround(){
  if(guidanceDone||guidanceLooked)return;
  guidanceLooked=true;updateGuidance();
}
function completeGuidance(){
  if(guidanceDone)return;
  guidanceDone=true;updateGuidance();
  try{localStorage.setItem(guidanceKey,'done');}catch{}
}

const mapPanel=document.getElementById('map-panel');
const infoPanel=document.getElementById('info-panel');
const mapToggle=document.getElementById('map-toggle');
const infoToggle=document.getElementById('info-toggle');
const moreToggle=document.getElementById('more-toggle');
const moreMenu=document.getElementById('more-menu');
const searchPanel=document.getElementById('tour-search-panel'),searchToggle=document.getElementById('search-toggle'),tourSearch=document.getElementById('tour-search-input');
function setMoreMenuOpen(open){
  const show=Boolean(open);
  document.body.classList.toggle('more-open',show);
  moreToggle?.setAttribute('aria-expanded',String(show));
  if(moreMenu){
    moreMenu.hidden=!show;
    moreMenu.inert=!show;
    moreMenu.setAttribute('aria-hidden',String(!show));
  }
  requestAnimationFrame(()=>positionTourPanels());
}
if(moreToggle)moreToggle.onclick=()=>setMoreMenuOpen(!document.body.classList.contains('more-open'));
document.addEventListener('pointerdown',event=>{
  if(!document.body.classList.contains('more-open'))return;
  if(moreMenu?.contains(event.target)||moreToggle?.contains(event.target))return;
  setMoreMenuOpen(false);
});
function updateTourSearch(){
  const ar=currentLanguage==='ar',label=ar?'ابحث عن مبنى أو قاعة':'Search halls or rooms';
  searchToggle.title=label;searchToggle.setAttribute('aria-label',label);searchPanel.setAttribute('aria-label',label);
  tourSearch.placeholder=label;tourSearch.setAttribute('aria-label',label);
  document.getElementById('tour-search-title').textContent=ar?'ابحث عن قاعة':'Find a room';
  document.getElementById('tour-search-close').setAttribute('aria-label',ar?'إغلاق البحث':'Close search');
  const results=tourSearch.value.trim()?searchHalls(CAMPUS_BUILDINGS,tourSearch.value,currentLanguage):CAMPUS_BUILDINGS.flatMap(hall=>[{hall,room:null,label:`${hall.code} · ${localized(hall.name,currentLanguage)}`},...(hall.rooms||[]).map(room=>({hall,room,label:`${localized(room.name,currentLanguage)} · ${hall.code}`}))]);
  const root=document.getElementById('tour-search-results');root.replaceChildren();
  for(const {hall,room,label:resultLabel} of results){
    const row=document.createElement('div');row.className='tour-search-result';
    const title=document.createElement('strong');title.textContent=resultLabel;
    const detail=document.createElement('small');detail.textContent=hall.code+' · '+localized(room?.floor||hall.name,currentLanguage);
    row.append(title,detail);
    const target=room?room.tour:hall.tour,actions=document.createElement('div');actions.className='tour-search-actions';
    if(target){
      if(target.scene){const button=document.createElement('button');button.type='button';button.textContent=ar?'أرشدني إلى القاعة':'Show me the way';button.disabled=!ready||transitioning;button.onclick=()=>startRoomDirections(target.scene);actions.append(button);}
      const enter=document.createElement('button');enter.type='button';enter.textContent=ar?'فتح العرض بزاوية 360°':'Open 360° view';enter.disabled=Boolean(target.scene)&&transitioning;enter.onclick=()=>openDirectoryTour(target);actions.append(enter);
    }else{detail.textContent+=' · '+(ar?'الجولة متاحة قريبًا':'Tour coming soon');}
    row.append(actions);root.append(row);
  }
  document.getElementById('tour-search-status').textContent=results.length?(ar?'النتائج: ':'Results: ')+results.length:(ar?'لا توجد مبانٍ أو قاعات مطابقة':'No matching halls or rooms');
}
tourSearch.addEventListener('input',updateTourSearch);
searchToggle.onclick=()=>{setMoreMenuOpen(false);togglePanel(searchPanel,searchToggle);if(searchPanel.classList.contains('open')){updateTourSearch();requestAnimationFrame(()=>tourSearch.focus());}};
document.getElementById('tour-search-close').onclick=()=>{closePanels();searchToggle.focus();};
// Keep overlays below the actual toolbar, including wrapped and translated layouts.
function positionTourPanels(){
  const bottom=document.querySelector('.tools').getBoundingClientRect().bottom;
  document.documentElement.style.setProperty('--tour-panel-top',Math.ceil(bottom+12)+'px');
}
new ResizeObserver(positionTourPanels).observe(document.querySelector('.topbar'));
addEventListener('resize',positionTourPanels);positionTourPanels();
let campusMap=null;
let directionsTarget=null,directionsNext=null;
const directionsPanel=document.createElement('section');
directionsPanel.id='directions-panel';directionsPanel.hidden=true;
directionsPanel.innerHTML='<div><strong id="directions-title"></strong><small id="directions-step" role="status" aria-live="polite"></small></div><button id="directions-next" type="button"></button><button id="directions-stop" type="button">×</button>';
document.body.append(directionsPanel);
function updateDirections(){
  directionsPanel.hidden=directionsTarget===null;
  directionsNext=null;
  if(directionsTarget===null)return;
  const path=findPath(LOCATIONS,current,directionsTarget),ar=currentLanguage==='ar';
  const arrived=current===directionsTarget;
  directionsNext=path?.[1]??null;
  document.getElementById('directions-title').textContent=(arrived?(ar?'وصلت إلى ':'You’ve arrived at '):(ar?'الاتجاهات إلى ':'Directions to '))+localizedLocation(directionsTarget).name;
  document.getElementById('directions-step').textContent=transitioning?(ar?'جارٍ الانتقال…':'Moving…'):arrived?(ar?'أنت الآن في القاعة المطلوبة.':'You’re at your destination.'):!path?(ar?'لا يوجد مسار متصل من هذا الموقع.':'No connected route from this viewpoint.'):(ar?'التالي: ':'Next: ')+localizedLocation(directionsNext).name+' · '+(ar?'الانتقالات المتبقية: ':'Steps remaining: ')+(path.length-1);
  const next=document.getElementById('directions-next');next.hidden=directionsNext===null;next.disabled=!ready||transitioning;next.textContent=ar?'متابعة':'Continue';
  const stop=document.getElementById('directions-stop');stop.setAttribute('aria-label',ar?'إنهاء الاتجاهات':'End directions');
}
function startRoomDirections(sceneId){
  const target=LOCATIONS.findIndex(item=>item.id===sceneId);
  if(target<0||!ready||transitioning)return;
  directionsTarget=target;closePanels();updateDirections();
  const route=LOCATIONS[current].routes.find(item=>item.to===directionsNext);
  if(route&&!motionEnabled){yaw=-route.angle;pitch=-.3;camera.rotation.set(pitch,yaw,0);}
  lastMobileFrame='';updateHotspotVisuals(performance.now());
  document.getElementById(directionsNext===null?'directions-stop':'directions-next').focus({preventScroll:true});
}
document.getElementById('directions-next').onclick=()=>{if(directionsNext!==null)transitionTo(directionsNext);};
document.getElementById('directions-stop').onclick=()=>{directionsTarget=null;updateDirections();lastMobileFrame='';updateHotspotVisuals(performance.now());mapToggle.focus({preventScroll:true});};
function openDirectoryTour(target){
  directionsTarget=null;updateDirections();
  if(target.scene){const index=LOCATIONS.findIndex(item=>item.id===target.scene);if(index>=0)openPanoramaFromCampus(index);}
  else if(target.url){const url=new URL(target.url,location.href);if(['https:','http:'].includes(url.protocol))location.assign(url.href);}
}
const directory=createDirectory({halls:CAMPUS_BUILDINGS,root:mapPanel,language:()=>currentLanguage,isReady:()=>!transitioning,startDirections:startRoomDirections,openTour:openDirectoryTour,currentHallId:()=>current<10?'m7':current<23?'e2':'e3'});
function initCampusMap(){
  if(campusMap||!window.maplibregl)return;
  const building=CAMPUS_BUILDINGS[0];
  campusMap=new maplibregl.Map({
    container:'campus-map',
    style:{
      version:8,
      sources:{
        campus:{
          type:'image',
          url:'./campus-map-2026.webp',
          coordinates:CAMPUS_MAP_CORNERS
        }
      },
      layers:[{
        id:'official-campus-map',
        type:'raster',
        source:'campus',
        paint:{'raster-opacity':1,'raster-resampling':'linear'}
      }]
    },
    center:building.mapCoordinates||building.coordinates,
    zoom:17.4,
    bearing:0,
    pitch:0,
    maxPitch:0,
    dragRotate:false,
    pitchWithRotate:false,
    touchPitch:false,
    attributionControl:false
  });
  campusMap.touchZoomRotate.disableRotation();
  campusMap.keyboard.disableRotation();
  campusMap.addControl(new maplibregl.AttributionControl({compact:true,customAttribution:'University of Sharjah · Campus Map 2026'}),'bottom-right');
  campusMap.addControl(new maplibregl.NavigationControl({showCompass:false,showZoom:true,visualizePitch:false}),'top-right');
  campusMap.fitBounds([CAMPUS_MAP_CORNERS[2],CAMPUS_MAP_CORNERS[0]], {padding:{top:100,bottom:220,left:35,right:70},duration:0});
  addCampusArtworkLabels(campusMap,CAMPUS_MAP_CORNERS,CAMPUS_BUILDINGS);
  directory.attach(campusMap);
  updateCampusMap();
}
function updateCampusMap(){
  document.getElementById('campus-current-location').textContent=object?locationLabel():t('tourMap');
  directory.update();
  document.getElementById('campus-map').setAttribute('aria-label',t('campusMapAria'));
}
function closePanels(){
  if(!object)return;
  for(const [panel,button] of [[mapPanel,mapToggle],[infoPanel,infoToggle],[searchPanel,searchToggle]]){
    panel.classList.remove('open');panel.setAttribute('aria-hidden','true');button.setAttribute('aria-pressed','false');
    panel.inert=true;
  }
  if(ready)updateRouteLabel();
}
function togglePanel(panel,button){
  if(panel===mapPanel&&document.documentElement.dataset.mapEnabled==='false')return;
  const open=!panel.classList.contains('open');
  closePanels();
  if(open){
    panel.inert=false;panel.classList.add('open');panel.setAttribute('aria-hidden','false');button.setAttribute('aria-pressed','true');
    if(panel===mapPanel){initCampusMap();requestAnimationFrame(()=>{campusMap?.resize();updateCampusMap();});setTimeout(()=>campusMap?.resize(),280);}
  }
  updateRouteLabel();
}
mapToggle.onclick=()=>{setMoreMenuOpen(false);togglePanel(mapPanel,mapToggle);};
infoToggle.onclick=()=>{setMoreMenuOpen(false);togglePanel(infoPanel,infoToggle);};
document.querySelectorAll('[data-close-panel]').forEach(btn=>btn.addEventListener('click',()=>{const opener=btn.closest('aside')===mapPanel?mapToggle:infoToggle;closePanels();opener.focus();updateRouteLabel();}));
mapPanel.inert=true;infoPanel.inert=true;searchPanel.inert=true;
function setMapFloor(floor){
  document.querySelectorAll('[data-floor-view]').forEach(el=>el.classList.toggle('active',el.dataset.floorView===floor));
  document.querySelectorAll('[data-map-floor]').forEach(btn=>{
    const active=btn.dataset.mapFloor===floor;
    btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active));btn.tabIndex=active?0:-1;
  });
}
document.querySelectorAll('[data-map-floor]').forEach(btn=>btn.addEventListener('click',()=>setMapFloor(btn.dataset.mapFloor)));
document.querySelectorAll('[data-map-floor]').forEach(btn=>btn.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  const floor=event.key==='Home'?'ground':event.key==='End'?'top':btn.dataset.mapFloor==='ground'?'top':'ground';
  setMapFloor(floor);document.getElementById('map-tab-'+floor).focus();
}));
function updateMap(){
  document.getElementById('map-current-location').textContent=locationLabel();
  updateCampusMap();
  document.querySelectorAll('.map-node[data-location]').forEach(node=>{
    node.setAttribute('aria-label',t('goTo',locationLabel(Number(node.dataset.location))));
    const here=Number(node.dataset.location)===current;
    const disabled=here||!ready||transitioning;
    node.classList.toggle('current',here);
    node.setAttribute('aria-disabled',String(disabled));node.tabIndex=disabled?-1:0;
    if(here)node.setAttribute('aria-current','location');else node.removeAttribute('aria-current');
  });
  setMapFloor(LOCATIONS[current]?.area==='Top Floor'?'top':'ground');
}

async function navigateFromMap(target){
  if(!ready||transitioning||!Number.isInteger(target)||!LOCATIONS[target]||target===current)return false;
  closePanels();mapToggle.focus({preventScroll:true});
  return transitionTo(target,null,true);
}
async function openPanoramaFromCampus(target){
  if(transitioning||!Number.isInteger(target)||!LOCATIONS[target])return;
  if(object&&target===current){closePanels();mapToggle.focus({preventScroll:true});return;}
  transitioning=true;loadingScene=target;app.setAttribute('aria-busy','true');
  loading.style.display='grid';loading.classList.remove('done');setInitialProgress(0);directory.update();
  try{
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const prepared=takeRecentScene(target) ?? await (preloadCache.get(target) ?? Promise.resolve(null));
    preloadCache.delete(target);
    await loadCheckpoint(target,prepared,p=>setInitialProgress(p));
    renderer.render(scene,camera);closePanels();mapToggle.focus({preventScroll:true});
    scheduleLikelyPreload();
  }catch(error){
    loading.classList.add('done');loading.style.display='none';
    const message=document.querySelector('#hall-detail .hall-status');
    if(message){message.textContent=t('loadLocationError');message.setAttribute('role','alert');}
    showTravelError(target,{kind:'campus',target});
    console.error(error);
  }finally{
    transitioning=false;app.setAttribute('aria-busy','false');updateControls();
  }
}
document.querySelectorAll('.map-node[data-location]').forEach(node=>{
  const target=Number(node.dataset.location);
  node.setAttribute('role','button');node.setAttribute('aria-label',t('goTo',locationLabel(target)));
  // Invisible touch padding keeps the drawing unchanged, including small hallway dots.
  const shape=node.querySelector('circle,rect');
  if(shape&&!shape.classList.contains('map-hit')){
    const hit=document.createElementNS('http://www.w3.org/2000/svg','rect');
    const circle=shape.tagName.toLowerCase()==='circle';
    const width=circle?48:Math.max(48,Number(shape.getAttribute('width')));
    const height=circle?48:Math.max(48,Number(shape.getAttribute('height')));
    hit.setAttribute('x',circle?Number(shape.getAttribute('cx'))-width/2:Number(shape.getAttribute('x'))-(width-Number(shape.getAttribute('width')))/2);
    hit.setAttribute('y',circle?Number(shape.getAttribute('cy'))-height/2:Number(shape.getAttribute('y'))-(height-Number(shape.getAttribute('height')))/2);
    hit.setAttribute('width',width);hit.setAttribute('height',height);hit.setAttribute('class','map-hit');node.prepend(hit);
  }
  node.addEventListener('click',()=>navigateFromMap(target));
  node.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    event.preventDefault();event.stopPropagation();navigateFromMap(target);
  });
});

const panoramaGeometry=new THREE.SphereGeometry(10,192,96);
panoramaGeometry.scale(-1,1,1);panoramaGeometry.rotateY(Math.PI/2);
{const uv=panoramaGeometry.attributes.uv;for(let n=0;n<uv.count;n++)uv.setY(n,1-uv.getY(n));uv.needsUpdate=true;}

const hotspotGroup=new THREE.Group();
scene.add(hotspotGroup);
const hotspotRoots=[];
let hoverHotspot=null;

function prep(root,i){
  const aniso=Math.min(renderer.capabilities.getMaxAnisotropy(),coarsePointer?1:Infinity);
  const gain=VISUAL_CALIBRATION[i]??[1,1,1];
  root.traverse(o=>{
    if(!o.isMesh) return;
    const oldMats=Array.isArray(o.material)?o.material:[o.material];
    const newMats=oldMats.map(m=>{
      const bm=new THREE.MeshBasicMaterial({
        map:m && m.map ? m.map : null,
        color:new THREE.Color(gain[0],gain[1],gain[2]),
        side:THREE.DoubleSide,
        toneMapped:false
      });
      if(bm.map){
        bm.map.colorSpace=THREE.SRGBColorSpace;
        bm.map.anisotropy=aniso;
        if(coarsePointer){
          // 8K mipmaps add roughly one-third more GPU texture memory and are expensive
          // for iPhone Safari to generate during a scene switch.
          bm.map.generateMipmaps=false;
          bm.map.minFilter=THREE.LinearFilter;
        }else{
          bm.map.generateMipmaps=true;
          bm.map.minFilter=THREE.LinearMipmapLinearFilter;
        }
        bm.map.magFilter=THREE.LinearFilter;
        bm.map.needsUpdate=true;

      }
      return bm;
    });
    o.material=Array.isArray(o.material)?newMats:newMats[0];
    oldMats.forEach(m=>m?.dispose());
  });
}

function makeArrowHotspot(){
  const root=new THREE.Group();
  const floorMaterial=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false,depthTest:false,toneMapped:false});
  function surface(geometry,material,height,order){
    const mesh=new THREE.Mesh(geometry,material);
    mesh.rotation.x=-Math.PI/2;mesh.position.y=height;mesh.renderOrder=order;root.add(mesh);return mesh;
  }
  const hit=surface(new THREE.CircleGeometry(0.36,48),floorMaterial(0xffffff,0),0,9);
  const inner=surface(new THREE.CircleGeometry(0.245,64),floorMaterial(0x00c389,0.18),0.001,10);
  const ring=surface(new THREE.RingGeometry(0.245,0.253,64),floorMaterial(0x7ee8c8,0.52),0.002,11);
  const shape=new THREE.Shape();
  shape.moveTo(0,0.135);shape.lineTo(0.145,0.015);shape.lineTo(0.145,-0.075);
  shape.lineTo(0,0.038);shape.lineTo(-0.145,-0.075);shape.lineTo(-0.145,0.015);shape.closePath();
  const arrow=surface(new THREE.ShapeGeometry(shape),floorMaterial(0x063f43,0.78),0.003,12);
  root.userData={isHotspot:true,route:null,hit,inner,ring,arrow,emphasis:0};
  hotspotGroup.add(root);hotspotRoots.push(root);return root;
}

function ensureHotspotCount(count){
  while(hotspotRoots.length<count)makeArrowHotspot();
}
ensureHotspotCount(4);

function placeOne(root,route){
  root.visible=!!route;
  root.userData.route=route??null;
  if(!route)return;
  const angle=route.angle,[defaultDist]=getHotspotStyle(current,route);
  const dist=route.hotspotDistance??defaultDist;
  const hotspotAngle=route.hotspotAngle??angle;
  root.position.set(Math.sin(hotspotAngle)*dist,route.hotspotHeight??FLOOR_Y,-Math.cos(hotspotAngle)*dist);
  // Explicit scene calibration separates arrow heading from placement and travel.
  // Preserve the legacy orientation for routes without an override.
  const arrowFlip=current>=10?Math.PI:0;
  root.rotation.y=route.arrowAngle===undefined?-angle+arrowFlip:-route.arrowAngle;
}

function placeHotspots(){
  const routes=LOCATIONS[current]?.routes ?? [];
  ensureHotspotCount(routes.length);
  hotspotRoots.forEach((root,i)=>placeOne(root,routes[i]));
}

let lastHotspotFrame=0;
function updateHotspotVisuals(now=0){
  const elapsed=Math.min(100,Math.max(0,now-lastHotspotFrame));lastHotspotFrame=now;
  const blend=reducedMotion?1:1-Math.exp(-elapsed/100);
  for(const hs of hotspotRoots){
    const u=hs.userData;
    u.emphasis+=((hs===hoverHotspot&&!dragging?1:0)-u.emphasis)*blend;
    const e=coarsePointer?0:u.emphasis,quiet=dragging?0.62:1;
    const pulse=(reducedMotion||coarsePointer)?0:(0.5+0.5*Math.sin(now*0.0028))*0.045;
    const hotspotScale=u.route?getHotspotStyle(current,u.route)[1]:.64;
    hs.scale.setScalar(hotspotScale*(1+0.05*e+pulse));
    const stairBoost=u.route?.kind==='stairs'?0.06:0;
    const polished=current>=12&&current<=16;
    const guided=directionsNext!==null&&u.route?.to===directionsNext;
    u.inner.material.color.setHex(guided?0xffcf5c:polished?0x00a979:0x00c389);
    u.ring.material.color.setHex(guided?0xffe49a:0x7ee8c8);
    u.arrow.material.color.setHex(guided?0xfff5c4:polished?0xf0fffa:0x063f43);
    u.inner.material.opacity=((polished?0.48:0.16)+0.15*e+stairBoost)*quiet;
    u.ring.material.opacity=(0.40+0.30*e+pulse)*quiet;
    u.arrow.material.opacity=((polished?0.88:0.70)+(polished?0.12:0.20)*e)*quiet;
    if(guided){hs.scale.multiplyScalar(1.2);u.inner.material.opacity=.5;u.ring.material.opacity=1;u.arrow.material.opacity=1;}
  }
}

function hotspotRootFromHit(obj){
  let o=obj;
  while(o && o.parent && !o.userData?.isHotspot)o=o.parent;
  return o && o.userData?.isHotspot ? o : null;
}

function checkHotspotHover(clientX, clientY){
  const rect=el.getBoundingClientRect();
  pointer.x=((clientX-rect.left)/rect.width)*2-1;
  pointer.y=-((clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  camera.updateMatrixWorld();
  hotspotGroup.updateMatrixWorld(true);
  raycaster.setFromCamera(pointer,camera);
  const hits=transitioning || !ready ? [] : raycaster.intersectObjects(hotspotRoots.filter(root=>root.visible),true);
  hoverHotspot = hits.length ? hotspotRootFromHit(hits[0].object) : null;
  el.style.cursor = hoverHotspot ? 'pointer' : (dragging ? 'grabbing' : 'grab');
  const route=hoverHotspot?.userData?.route ?? null;
  if(route&&!coarsePointer)queueRoutePreload(route.to);
  updateRouteLabel();
}

const labelPoint=new THREE.Vector3(),labelFacing=new THREE.Vector3();
let labelBounds={top:120,bottom:innerHeight-120};
function measureLabelBounds(){
  labelBounds.top=document.querySelector('.topbar').getBoundingClientRect().bottom+48;
  labelBounds.bottom=document.querySelector('.bottom').getBoundingClientRect().top-8;
}
function updateRouteLabel(){
  if(!ready||transitioning||dragging||mapPanel.classList.contains('open')||infoPanel.classList.contains('open')||searchPanel.classList.contains('open')){routeTip.classList.remove('show');routeTip.setAttribute('aria-hidden','true');return;}
  camera.updateMatrixWorld();camera.getWorldDirection(labelFacing);
  const bearing=Math.atan2(labelFacing.x,-labelFacing.z);
  let selected=null,best=Infinity,position=null;
  for(const root of hotspotRoots){
    if(!root.visible||!root.userData.route)continue;
    const route=root.userData.route;
    const labelAngle=current>=25?(route.hotspotAngle??route.angle):route.angle;
    const delta=Math.abs(wrapAngle(labelAngle-bearing));
    const hovered=!coarsePointer&&root===hoverHotspot;
    if(!hovered&&delta>0.45)continue;
    labelPoint.copy(root.position).project(camera);
    const x=(labelPoint.x+1)*innerWidth/2,y=(1-labelPoint.y)*innerHeight/2;
    if(labelPoint.z< -1||labelPoint.z>1||x<24||x>innerWidth-24||y<labelBounds.top||y>labelBounds.bottom)continue;
    const score=hovered?-1:delta;
    if(score<best){best=score;selected=root;position={x,y};}
  }
  if(!selected){routeTip.classList.remove('show');routeTip.setAttribute('aria-hidden','true');return;}
  const route=selected.userData.route;
  const name=route.to===5?t('seatingArea'):localizedLocation(route.to).name;
  const text=route.kind==='stairs'
    ? (route.stairDirection==='down'?'↓ '+name:route.stairDirection==='up'?'↑ '+name:(route.to===0?t('downstairs'):t('upstairs')))
    : name;
  if(routeTip.textContent!==text)routeTip.textContent=text;
  const halfWidth=routeTip.offsetWidth/2+12;
  routeTip.style.left=THREE.MathUtils.clamp(position.x,halfWidth,innerWidth-halfWidth)+'px';
  routeTip.style.top=(position.y-12)+'px';routeTip.classList.add('show');routeTip.setAttribute('aria-hidden','false');
}

function setCanvasFx(scale=1, blur=0, opacity=1){
  el.style.transform=`scale(${scale})`;
  el.style.filter=`blur(${blur}px)`;
  el.style.opacity=String(opacity);
}
function ease(t){ return t<0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }
function tween(ms, update){
  return new Promise(resolve=>{
    const start=performance.now();
    function step(now){
      const t=Math.min(1,(now-start)/ms);
      update(ease(t), t);
      if(t<1) requestAnimationFrame(step); else resolve();
    }
    requestAnimationFrame(step);
  });
}


const previous=document.getElementById('previous');
const shareScene=document.getElementById('share-scene');
const sceneLinkElement=document.getElementById('scene-link');
const shareLocation=document.getElementById('share-location');
function localizedLocation(i=current){
  const loc=LOCATIONS[i];
  if(currentLanguage==='ar'&&LOCATION_AR[i])return {area:LOCATION_AR[i][0],name:LOCATION_AR[i][1]};
  return {area:loc.area,name:loc.name};
}
function locationLabel(i=current){const loc=localizedLocation(i);return loc.area+' · '+loc.name;}
function tourAreaTitle(i=current){
  if(i<10)return t('building');
  const hall=CAMPUS_BUILDINGS.find(item=>item.id===(i<23?'e2':'e3'));
  return hall?localized(hall.name,currentLanguage):localizedLocation(i).area;
}
function backTarget(){return LOCATIONS[current]?.back ?? null;}
function floorLabel(i=current){
  if(i>=10)return '360°';
  return LOCATIONS[i]?.area==='Top Floor'?t('topFloorBadge'):t('groundFloorBadge');
}
function sceneLink(i=current){
  const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('scene',LOCATIONS[i].id);return url.href;
}
function updateSceneShare(){
  const url=sceneLink();
  shareLocation.textContent=locationLabel();sceneLinkElement.href=url;sceneLinkElement.textContent=url;
}
function updateControls(){
  updateTourSearch();
  updateDirections();
  previous.disabled=!ready || transitioning || backTarget()==null;
  document.getElementById('route-label').textContent=locationLabel();
  document.title=object?tourAreaTitle()+' — 360° Tour | University of Sharjah':'Campus 360° Tours | University of Sharjah';
  floorBadge.textContent=floorLabel();
  document.querySelector('.brand-row [data-i18n="building"]').textContent=tourAreaTitle();
  document.getElementById('info-subtitle').textContent=t('university')+' · '+tourAreaTitle();
  updateMap();
  updateGuidance();
  updateSceneShare();
}
function applyLanguage(persist=true){
  document.documentElement.lang=currentLanguage;
  document.documentElement.dir=currentLanguage==='ar'?'rtl':'ltr';
  document.title=t('pageTitle');
  document.querySelectorAll('[data-i18n]').forEach(node=>{node.textContent=t(node.dataset.i18n);});
  document.querySelectorAll('[data-i18n-aria]').forEach(node=>{node.setAttribute('aria-label',t(node.dataset.i18nAria));});
  document.querySelectorAll('[data-i18n-title]').forEach(node=>{node.title=t(node.dataset.i18nTitle);});
  languageToggle.textContent=currentLanguage==='ar'?'EN':'ع';
  languageToggle.setAttribute('aria-label',t('switchLanguage'));
  languageToggle.title=currentLanguage==='ar'?'English':'العربية';
  campusLanguageToggle.textContent=currentLanguage==='ar'?'EN':'ع';
  campusLanguageToggle.setAttribute('aria-label',t('switchLanguage'));
  campusLanguageToggle.title=currentLanguage==='ar'?'English':'العربية';
  motion.setAttribute('aria-label',t(motionEnabled?'motionDisable':'motionEnable'));
  fullscreen.setAttribute('aria-label',t(document.fullscreenElement?'exitFullScreen':'fullScreen'));
  if(moreToggle){
    const moreLabel=currentLanguage==='ar'?'المزيد من أدوات العرض':'More view controls';
    moreToggle.setAttribute('aria-label',moreLabel);moreToggle.title=moreLabel;moreMenu?.setAttribute('aria-label',moreLabel);
  }
  document.getElementById('more-view-label').textContent=t('moreView');
  document.getElementById('more-tour-label').textContent=t('moreTour');
  cp.textContent=locationLabel();
  updateControls();updateRouteLabel();
  if(!loading.classList.contains('done'))setInitialProgress(lastInitialProgress);
  if(persist)try{localStorage.setItem(languageKey,currentLanguage);}catch{}
}
function switchLanguage(){currentLanguage=currentLanguage==='en'?'ar':'en';applyLanguage();}
languageToggle.onclick=switchLanguage;
campusLanguageToggle.onclick=switchLanguage;
shareScene.onclick=async()=>{
  const url=sceneLink();
  try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);
    else{
      const field=document.createElement('textarea');field.value=url;field.style.position='fixed';field.style.opacity='0';document.body.append(field);field.select();
      const copied=document.execCommand('copy');field.remove();if(!copied)throw new Error('copy failed');
    }
    const message=t('linkCopied');shareScene.textContent=message;document.getElementById('status').textContent=message+'.';
    setTimeout(()=>{if(shareScene.textContent===message)shareScene.textContent=t('copyLink');if(document.getElementById('status').textContent===message+'.')document.getElementById('status').textContent='';},1400);
  }catch{document.getElementById('status').textContent=t('copyFailed');}
};
function resetView(){
  const bearing=LOCATIONS[current]?.view ?? LOCATIONS[current]?.routes?.[0]?.angle ?? 0;
  yaw=-bearing;pitch=LOCATIONS[current]?.viewPitch ?? 0;camera.fov=current>=10?95:72;camera.updateProjectionMatrix();camera.rotation.set(pitch,yaw,0);
  if(motionEnabled)motionNeedsCalibrate=true;
}
function dispose(root){
  const textures=new Set(),images=new Set(),materials=new Set(),geometries=new Set();
  root.traverse(o=>{
    if(o.geometry&&o.geometry!==panoramaGeometry)geometries.add(o.geometry);
    if(o.material)for(const m of (Array.isArray(o.material)?o.material:[o.material])){
      materials.add(m);
      if(m.map){textures.add(m.map);if(m.map.image)images.add(m.map.image);}
    }
  });
  textures.forEach(texture=>texture.dispose());
  images.forEach(image=>{if(typeof image.close==='function')image.close();});
  materials.forEach(material=>material.dispose());
  geometries.forEach(geometry=>geometry.dispose());
}
function prepareCheckpointScene(gltf,i,warmTexture=false){
  const replacement=gltf.scene;
  if(!replacement.userData.panoramaPrepared){
    prep(replacement,i);
    replacement.traverse(mesh=>{
      if(!mesh.isMesh)return;
      mesh.geometry.dispose();
      // Shared panorama sphere preserves the approved bearings while avoiding geometry churn.
      mesh.geometry=panoramaGeometry;
      mesh.position.set(0,CAMERA_HEIGHT,0);mesh.rotation.set(i===2?THREE.MathUtils.degToRad(-1.5):0,0,0);mesh.scale.set(1,1,1);
    });
    replacement.userData.panoramaPrepared=true;
  }
  if(warmTexture && renderer.initTexture){
    replacement.traverse(mesh=>{
      if(!mesh.isMesh)return;
      for(const m of (Array.isArray(mesh.material)?mesh.material:[mesh.material])){
        if(m?.map){try{renderer.initTexture(m.map);}catch{}}
      }
    });
  }
  return replacement;
}
function cacheRecentScene(i,root){
  if(!root || i==null)return;
  if(recentScenes.has(i)){
    const old=recentScenes.get(i);
    recentScenes.delete(i);
    if(old!==root)dispose(old);
  }
  recentScenes.set(i,root);
  while(recentScenes.size>RECENT_SCENE_LIMIT){
    const victim=recentScenes.keys().next().value;
    const stale=recentScenes.get(victim);
    recentScenes.delete(victim);
    if(stale)dispose(stale);
  }
}
function takeRecentScene(i){
  const root=recentScenes.get(i)??null;
  if(root)recentScenes.delete(i);
  return root;
}
function loadGLTF(i,onProgress=null){
  return new Promise((resolve,reject)=>{
    loader.load(DATA[i],resolve,xhr=>{
      if(!onProgress)return;
      if(xhr.total>0)onProgress(THREE.MathUtils.clamp(xhr.loaded/xhr.total,0,1));
      else onProgress(null);
    },reject);
  });
}
let lastInitialProgress=0;
function setInitialProgress(value){
  lastInitialProgress=value;
  const progressTrack=loadProgressBar.parentElement;
  const area=tourAreaTitle(loadingScene),destination=locationLabel(loadingScene);
  loading.querySelector('.loader-title').textContent=area;
  document.getElementById('loader-location').textContent=destination;
  progressTrack.setAttribute('aria-label',t('loadingLocation',destination,null));
  if(value==null){
    progressTrack.removeAttribute('aria-valuenow');
    loadProgressText.textContent=t('loadingLocation',destination,null);return;
  }
  const pct=Math.round(THREE.MathUtils.clamp(value,0,1)*100);
  loadProgressBar.style.width=pct+'%';
  progressTrack.setAttribute('aria-valuenow',String(pct));
  loadProgressText.textContent=pct===100?t('preparingLocation',destination):t('loadingLocation',destination,pct);
}
async function loadCheckpoint(i, prepared=null, onProgress=null){
  let replacement;
  if(prepared?.isObject3D)replacement=prepared;
  else{
    const gltf=prepared ?? await loadGLTF(i,onProgress);
    replacement=prepareCheckpointScene(gltf,i,false);
  }
  if(object){
    const oldIndex=current;
    scene.remove(object);
    cacheRecentScene(oldIndex,object);
  }
  object=replacement;current=i;renderQuality(i>=10);scene.add(object);document.body.classList.remove('campus-only');
  camera.position.set(0,CAMERA_HEIGHT,0);resetView();
  cp.textContent=locationLabel(i);
  hoverHotspot=null;placeHotspots();ready=true;loading.classList.add('done');setTimeout(()=>{if(loading.classList.contains('done'))loading.style.display='none';},460);updateControls();
}

const travelFrame=document.getElementById('travel-frame');
const travelContext=travelFrame.getContext('2d');
function routeFromTo(from,to){return LOCATIONS[from]?.routes?.find(r=>r.to===to) ?? null;}
function wrapAngle(a){return THREE.MathUtils.euclideanModulo(a+Math.PI,Math.PI*2)-Math.PI;}
async function transitionTo(i,selectedRoute=null,fromMap=false){
  // Map jumps reuse the existing load, rollback and fade; arrow travel stays connected.
  const route=selectedRoute ?? routeFromTo(current,i) ?? (fromMap?{to:i,angle:-yaw}:null);
  if(!ready || transitioning || i<0 || i>=DATA.length || i===current || !route)return;
  const from=current,oldYaw=yaw,oldPitch=pitch,oldFov=camera.fov;
  const bearing=route.angle;
  const oldViewBearing=-oldYaw;
  const relativeView=wrapAngle(oldViewBearing-(route.departureAngle ?? bearing));
  const returnRoute=routeFromTo(i,from);
  const arrivalForward=route.arrivalAngle ?? (returnRoute ? returnRoute.angle+Math.PI : (LOCATIONS[i]?.view ?? 0));
  const centerArrival=LOCATIONS[i]?.centerArrival === true;
  const arrivalYaw=fromMap?-(LOCATIONS[i]?.view??0):centerArrival?-(route.arrivalAngle ?? LOCATIONS[i].view):-(arrivalForward+relativeView);
  const facingTravel=Math.cos(oldYaw+bearing);
  transitioning=true;el.title='';dragging=false;gesture=null;touches.clear();pinchDistance=null;hoverHotspot=null;routeTip.classList.remove('show');routeTip.setAttribute('aria-hidden','true');updateControls();
  document.body.classList.add('moving');app.setAttribute('aria-busy','true');el.style.cursor='progress';
  const status=document.getElementById('status');status.textContent='';

  // Capture the current view immediately so a tap always gets visual feedback while the next panorama decodes.
  hotspotGroup.visible=false;renderer.render(scene,camera);
  const snapScale=coarsePointer?0.50:0.84;
  travelFrame.width=Math.max(1,Math.round(el.width*snapScale));
  travelFrame.height=Math.max(1,Math.round(el.height*snapScale));
  travelContext.drawImage(el,0,0,travelFrame.width,travelFrame.height);
  const anchor=new THREE.Vector3(Math.sin(bearing),0.03,-Math.cos(bearing));
  camera.updateMatrixWorld();anchor.project(camera);
  const ox=THREE.MathUtils.clamp((anchor.x+1)*50,15,85);
  const oy=THREE.MathUtils.clamp((1-anchor.y)*50,20,80);
  travelFrame.style.transformOrigin=ox+'% '+oy+'%';
  travelFrame.style.transform='scale(1.012)';travelFrame.style.opacity='1';travelFrame.style.filter='none';travelFrame.style.display='block';

  const destination=locationLabel(i);loadingScene=i;
  const slowLoad=setTimeout(()=>{if(!status.textContent)status.textContent=t('loadingLocation',destination,null);},650);
  try{
    // Let the snapshot paint first.
    await new Promise(resolve=>requestAnimationFrame(resolve));

    // On phones, release the outgoing 8K texture before decoding the incoming panorama.
    // The captured travel frame is already covering the WebGL canvas, so there is no visual flash.
    // This avoids having two full-resolution panoramas resident during the heaviest part of the switch.
    if(coarsePointer && object){
      const outgoing=object;
      scene.remove(outgoing);
      object=null;
      dispose(outgoing);
      if(renderer.renderLists?.dispose)renderer.renderLists.dispose();
      try{renderer.getContext().flush();}catch{}
      await new Promise(resolve=>requestAnimationFrame(resolve));
    }

    let prepared=takeRecentScene(i);
    if(prepared){
      const redundant=preloadCache.get(i);
      if(redundant){
        preloadCache.delete(i);
        redundant.then(gltf=>{if(gltf)dispose(gltf.scene);}).catch(()=>{});
      }
    }else{
      const cached=preloadCache.get(i);
      // If a mobile network prefetch is still finishing, reuse it instead of racing
      // another request for the same 6–8 MB GLB.
      const warming=networkPrefetches.get(i);
      if(coarsePointer && warming)await warming;
      const gltf=cached?await cached:await loadGLTF(i,p=>{
        status.textContent=p==null?t('loadingLocation',destination,null):p>=1?t('preparingLocation',destination):t('loadingLocation',destination,Math.min(99,Math.round(p*100)));
      });
      preloadCache.delete(i);
      if(!gltf)throw new Error('Checkpoint preload failed');
      prepared=gltf;
    }
    clearTimeout(slowLoad);status.textContent='';
    await loadCheckpoint(i,prepared);
    yaw=arrivalYaw;pitch=(fromMap || centerArrival)?(LOCATIONS[i]?.viewPitch ?? 0):(route.arrivalPitch ?? oldPitch);camera.fov=oldFov;camera.updateProjectionMatrix();camera.rotation.set(pitch,yaw,0);
    if(coarsePointer){updateHotspotVisuals(performance.now());renderer.render(scene,camera);}
    await tween(reducedMotion?100:(coarsePointer?190:240),(e,t)=>{
      if(!reducedMotion&&!fromMap){
        const push=1+0.095*e*Math.max(0.35,facingTravel);
        travelFrame.style.transform='scale('+push+')';
        travelFrame.style.filter='blur('+(1.2*e)+'px) brightness('+(1-.05*e)+')';
      }
      travelFrame.style.opacity=String(1-THREE.MathUtils.smoothstep(t,reducedMotion?0:0.08,1));
    });
    completeGuidance();return true;
  }catch(err){
    console.error(err);
    status.textContent='';
    // Mobile may have released the previous panorama to stay within Safari's GPU budget.
    // Restore it from cache if the destination failed to load.
    if(coarsePointer && !object){
      try{
        await loadCheckpoint(from);
        yaw=oldYaw;pitch=oldPitch;camera.fov=oldFov;camera.updateProjectionMatrix();camera.rotation.set(pitch,yaw,0);
      }catch(restoreError){console.warn('Could not restore previous view',restoreError);}
    }
    showTravelError(i,{kind:'transition',target:i,route,fromMap});
  }finally{
    clearTimeout(slowLoad);travelFrame.style.display='none';travelFrame.style.filter='none';travelFrame.style.transform='';travelContext.clearRect(0,0,travelFrame.width,travelFrame.height);
    camera.position.set(0,CAMERA_HEIGHT,0);hotspotGroup.visible=true;
    document.body.classList.remove('moving');app.setAttribute('aria-busy','false');transitioning=false;el.style.cursor='grab';updateControls();scheduleLikelyPreload();
  }
}
const touches=new Map();let gesture=null, pinchDistance=null;
el.addEventListener('pointerdown',e=>{
  if(document.body.classList.contains('more-open'))setMoreMenuOpen(false);
  if(!ready || transitioning || e.button!==0)return;
  touches.set(e.pointerId,{x:e.clientX,y:e.clientY});el.setPointerCapture(e.pointerId);
  if(touches.size>1){gesture=null;dragging=false;pinchDistance=null;return;}
  checkHotspotHover(e.clientX,e.clientY);
  if(hoverHotspot?.userData?.route)queueRoutePreload(hoverHotspot.userData.route.to);
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,yaw,pitch,hit:hoverHotspot,moved:false};dragging=true;
  if(coarsePointer)document.body.classList.add('mobile-looking');
});
el.addEventListener('pointermove',e=>{
  if(transitioning)return;
  if(touches.has(e.pointerId))touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(touches.size===2){const [a,b]=[...touches.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance!==null)zoom((pinchDistance-d)*0.12);pinchDistance=d;return;}
  if(gesture && gesture.id===e.pointerId){
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
    if(Math.hypot(dx,dy)>8)gesture.moved=true;
    if(gesture.moved){noteLookAround();yaw=gesture.yaw-dx*0.004;pitch=THREE.MathUtils.clamp(gesture.pitch-dy*0.004,-1.45,1.45);camera.rotation.set(pitch,yaw,0);}
  }
  checkHotspotHover(e.clientX,e.clientY);
});
function release(e,cancelled=false){
  const g=gesture;touches.delete(e.pointerId);pinchDistance=null;dragging=false;
  if(coarsePointer)document.body.classList.remove('mobile-looking');
  if(g?.id===e.pointerId){checkHotspotHover(e.clientX,e.clientY);gesture=null;if(g.moved&&motionEnabled)motionNeedsCalibrate=true;if(!cancelled && !g.moved && Math.hypot(e.clientX-g.x,e.clientY-g.y)<8 && g.hit && hoverHotspot===g.hit && g.hit.userData.route)transitionTo(g.hit.userData.route.to,g.hit.userData.route);}
  if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);
}
el.addEventListener('pointerup',e=>release(e));
el.addEventListener('pointercancel',e=>release(e,true));
el.addEventListener('lostpointercapture',()=>{gesture=null;dragging=false;document.body.classList.remove('mobile-looking');});
el.addEventListener('pointerleave',()=>{hoverHotspot=null;updateRouteLabel();el.title='';el.style.cursor='grab';});

// Optional phone-motion view. It is calibrated to the current camera direction,
// so enabling it never snaps the visitor to an unrelated bearing.
const motion=document.getElementById('motion');
let motionEnabled=false, motionNeedsCalibrate=true;
const motionReference=new THREE.Quaternion();
const guidanceOrientation=new THREE.Quaternion();
const sensorEuler=new THREE.Euler();
const sensorQuat=new THREE.Quaternion();
const sensorCorrection=new THREE.Quaternion(-Math.sqrt(0.5),0,0,Math.sqrt(0.5));
const sensorScreenCorrection=new THREE.Quaternion();
const sensorZ=new THREE.Vector3(0,0,1);
const motionCapable=typeof DeviceOrientationEvent!=='undefined' && (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window);
motion.hidden=!motionCapable;
motion.setAttribute('aria-pressed','false');
function screenAngle(){return THREE.MathUtils.degToRad(screen.orientation?.angle ?? window.orientation ?? 0);}
function deviceQuaternion(e){
  if(e.alpha==null || e.beta==null || e.gamma==null)return null;
  sensorEuler.set(THREE.MathUtils.degToRad(e.beta),THREE.MathUtils.degToRad(e.alpha),-THREE.MathUtils.degToRad(e.gamma),'YXZ');
  sensorQuat.setFromEuler(sensorEuler);
  sensorQuat.multiply(sensorCorrection);
  sensorQuat.multiply(sensorScreenCorrection.setFromAxisAngle(sensorZ,-screenAngle()));
  return sensorQuat;
}
addEventListener('deviceorientation',e=>{
  if(!motionEnabled || dragging || transitioning)return;
  const q=deviceQuaternion(e);if(!q)return;
  if(motionNeedsCalibrate){guidanceOrientation.copy(camera.quaternion);motionReference.copy(camera.quaternion).multiply(q.clone().invert());motionNeedsCalibrate=false;}
  camera.quaternion.copy(motionReference).multiply(q);
  if(!guidanceDone&&!guidanceLooked&&guidanceOrientation.angleTo(camera.quaternion)>0.10)noteLookAround();
  yaw=camera.rotation.y;pitch=camera.rotation.x;
},true);
if(screen.orientation?.addEventListener)screen.orientation.addEventListener('change',()=>{if(motionEnabled)motionNeedsCalibrate=true;});
else addEventListener('orientationchange',()=>{if(motionEnabled)motionNeedsCalibrate=true;});
motion.onclick=async()=>{
  setMoreMenuOpen(false);
  const status=document.getElementById('status');
  if(motionEnabled){
    motionEnabled=false;motion.setAttribute('aria-pressed','false');motion.setAttribute('aria-label',t('motionEnable'));
    yaw=camera.rotation.y;pitch=camera.rotation.x;const message=t('motionOff');status.textContent=message;updateControls();
    setTimeout(()=>{if(status.textContent===message)status.textContent='';},1300);return;
  }
  try{
    if(typeof DeviceOrientationEvent.requestPermission==='function'){
      const permission=await DeviceOrientationEvent.requestPermission();
      if(permission!=='granted')throw new Error('permission denied');
    }
    motionEnabled=true;motionNeedsCalibrate=true;motion.setAttribute('aria-pressed','true');motion.setAttribute('aria-label',t('motionDisable'));
    const message=t('motionOn');status.textContent=message;updateControls();
    setTimeout(()=>{if(status.textContent===message)status.textContent='';},2200);
  }catch(err){status.textContent=t('motionDenied');}
};

function zoom(delta){if(!ready || transitioning)return;camera.fov=THREE.MathUtils.clamp(camera.fov+delta,35,95);camera.updateProjectionMatrix();}
el.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY*0.03);},{passive:false});
previous.onclick=()=>{const back=backTarget();if(back!=null)transitionTo(back);};
document.getElementById('reset').onclick=()=>{setMoreMenuOpen(false);if(ready&&!transitioning)resetView();};
const fullscreen=document.getElementById('fullscreen');
fullscreen.hidden=!document.fullscreenEnabled;
fullscreen.onclick=async()=>{setMoreMenuOpen(false);try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{document.getElementById('status').textContent=t('fullscreenUnavailable');}};
document.addEventListener('fullscreenchange',()=>fullscreen.setAttribute('aria-label',t(document.fullscreenElement?'exitFullScreen':'fullScreen')));
addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('more-open')){e.preventDefault();setMoreMenuOpen(false);moreToggle?.focus();return;}if(e.key==='Escape'&&(mapPanel.classList.contains('open')||infoPanel.classList.contains('open')||searchPanel.classList.contains('open'))){e.preventDefault();const opener=mapPanel.classList.contains('open')?mapToggle:searchPanel.classList.contains('open')?searchToggle:infoToggle;closePanels();opener.focus();return;}if(e.target.closest('button,input,textarea,select,[role="button"]')||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='Backspace'||e.key==='Escape'){const back=backTarget();if(back!=null){e.preventDefault();routeTip.classList.remove('show');routeTip.setAttribute('aria-hidden','true');transitionTo(back);}}
  if(e.key==='Home' && ready && !transitioning){e.preventDefault();resetView();}
  if(e.key==='+' || e.key==='='){e.preventDefault();zoom(-8);}
  if(e.key==='-'){e.preventDefault();zoom(8);}
});
applyLanguage(false);measureLabelBounds();
addEventListener('resize', ()=>{
  renderQuality(current>=10);
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);measureLabelBounds();
});
let lastMobileFrame='';
function animate(now=0){
  requestAnimationFrame(animate);
  if(document.hidden||!ready)return;
  if(coarsePointer){
    // The snapshot covers transitions; redraw a still view only when it changes.
    if(transitioning){lastMobileFrame='';return;}
    const q=camera.quaternion;
    const frame=[q.x,q.y,q.z,q.w,camera.fov,innerWidth,innerHeight,current,dragging].join(',');
    if(frame===lastMobileFrame)return;
    lastMobileFrame=frame;
  }
  updateHotspotVisuals(now);renderer.render(scene,camera);updateRouteLabel();
}
document.addEventListener('visibilitychange',()=>{lastMobileFrame='';});
animate();
setCanvasFx(1,0,1);
el.style.cursor='grab';
setInitialProgress(0);
// The campus homepage loads no panorama until a building is chosen.
if(requestedSceneIndex<0){document.body.classList.add('campus-only');loading.classList.add('done');loading.style.display='none';togglePanel(mapPanel,mapToggle);}
const tourWorker='serviceWorker' in navigator
  ? navigator.serviceWorker.register('./service-worker.js')
      .then(()=>navigator.serviceWorker.ready)
      .catch(err=>{console.warn('Offline cache unavailable',err);return null;})
  : Promise.resolve(null);
if(requestedSceneIndex>=0)loadCheckpoint(INITIAL_SCENE,null,p=>setInitialProgress(p)).then(()=>{
  setInitialProgress(1);scheduleLikelyPreload();
  // Backfill the first panorama from HTTP cache if it loaded before worker activation.
  tourWorker.then(registration=>registration?.active?.postMessage({
    type:'CACHE_VIEWED_PANORAMA',url:new URL(DATA[INITIAL_SCENE],location.href).href
  })).catch(err=>console.warn('Initial panorama cache unavailable',err));
}).catch(err=>{
  loading.classList.add('done');loading.style.display='none';
  showTravelError(INITIAL_SCENE,{kind:'reload',target:INITIAL_SCENE});
  console.error(err);
});
