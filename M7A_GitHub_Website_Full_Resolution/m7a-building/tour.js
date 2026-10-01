import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createPanoramaRenderer } from './tour-renderer.js';
import { createPanoramaRefinement } from './tour-refinement.js';
import { HALLS } from './halls.js';
import { addCampusArtworkLabels } from './campus-map-labels.js';
import { createDirectory, searchHalls, localized } from './campus-directory.js';
import { CAMPUS_BUILDINGS, buildingForLegacyHall } from './campus-buildings.js';
import { CAMPUS_CORNERS, clampCampusCamera } from './campus-geometry.js';
import { findPath } from './directions.js';
import { createCampusPopovers } from './campus-popovers.js';
import { createCampusHandoff } from './campus-handoff.js';
import { PANORAMA_FILES, VISUAL_CALIBRATION, LOCATIONS, LOCATION_AR, TOUR_AREAS, areaForScene, getHotspotStyle, arrivalView } from './tour-routes.js';
import { I18N } from './tour-i18n.js';

const app=document.getElementById('app');
const loading=document.getElementById('loading');
const cp=document.getElementById('cp');
const floorBadge=document.getElementById('floor-badge');
const routeTip=document.getElementById('route-tip');
const loadProgressBar=document.getElementById('load-progress-bar');
const loadProgressText=document.getElementById('load-progress-text');
const coarsePointer=matchMedia('(pointer:coarse)').matches;
const languageToggle=document.getElementById('language-toggle');
const languageKey='m7a-language-v1';
let currentLanguage='en';
try{if(localStorage.getItem(languageKey)==='ar')currentLanguage='ar';}catch{}
function t(key,...args){const value=I18N[currentLanguage][key]??I18N.en[key]??key;return typeof value==='function'?value(...args):value;}
// Phones/tablets use dedicated mobile panoramas. Asset revisions are generated from Git blobs.
const ASSET_MANIFEST=globalThis.UOS_TOUR_ASSETS;
const panoramaMode=coarsePointer?'mobile':'desktop';
const panoramaDir=coarsePointer?'./assets-mobile/':'./assets/';
const DATA=PANORAMA_FILES.map(file=>{
  const revision=ASSET_MANIFEST?.panoramaRevisions?.[panoramaMode]?.[file];
  return panoramaDir+file+(revision?'?rev='+revision:'');
});
// Reuse the aligned mobile panorama for immediate desktop travel, then refine
// the stationary view with the untouched original. Data-saving mode keeps one download.
const TRAVEL_DATA=PANORAMA_FILES.map((file,i)=>{
  const revision=ASSET_MANIFEST?.panoramaRevisions?.mobile?.[file];
  return !coarsePointer&&!navigator.connection?.saveData&&revision
    ? './assets-mobile/'+file+'?rev='+revision:DATA[i];
});

const CAMERA_HEIGHT=0.45;
const {scene,camera,renderer,el,postUniforms,renderQuality,syncPostTargetSize,renderPanoramaFrame}=
  createPanoramaRenderer({app,coarsePointer,cameraHeight:CAMERA_HEIGHT});

const loader=new GLTFLoader();

// One fetch/parse path for demand and preload; at most two lightweight neighbors and
// one recent view. The budget includes decoded RGBA plus GPU storage/mipmaps.
const preloadCache=new Map();
const networkPrefetches=new Map();
const recentScenes=new Map();
const DECODED_PRELOAD_LIMIT=coarsePointer?1:2;
const RECENT_SCENE_LIMIT=1;
const SCENE_MEMORY_BUDGET=(coarsePointer?112:1024)*1024*1024;
const sceneLoadingTimings=new Map(),sceneMemory=new Map();
let preloadIdle=null,preparingTarget=null;
let refinement=null;
function estimatedSceneBytes(root){
  const textures=new Set();root?.traverse(mesh=>{for(const m of(Array.isArray(mesh.material)?mesh.material:[mesh.material]))if(m?.map)textures.add(m.map);});
  return [...textures].reduce((sum,texture)=>sum+(texture.image?.width||0)*(texture.image?.height||0)*4*(texture.generateMipmaps?1+4/3:2),0);
}
function residentSceneBytes(){
  return estimatedSceneBytes(object)+[...recentScenes.values()].reduce((sum,root)=>sum+estimatedSceneBytes(root),0)
    +[...preloadCache.keys()].reduce((sum,i)=>sum+(sceneMemory.get(i)||0),0);
}
function trimSceneMemory(keep=null,incomingBytes=0){
  while(residentSceneBytes()+incomingBytes>SCENE_MEMORY_BUDGET&&recentScenes.size){const key=recentScenes.keys().next().value;dispose(recentScenes.get(key));recentScenes.delete(key);}
  while(residentSceneBytes()+incomingBytes>SCENE_MEMORY_BUDGET&&preloadCache.size){const key=[...preloadCache.keys()].find(i=>i!==keep&&i!==preparingTarget);if(key==null)break;evictDecodedPreload(key);}
}
function cancelStalePreloads(keep=null){
  refinement?.cancel();
  if(preloadIdle!==null){if('cancelIdleCallback' in window)cancelIdleCallback(preloadIdle);else clearTimeout(preloadIdle);preloadIdle=null;}
  clearTimeout(hoverPreloadTimer);
  for(const i of preloadCache.keys())if(i!==keep)evictDecodedPreload(i);
  for(const [i,record]of networkPrefetches)if(i!==keep&&!record.foreground)record.controller.abort();
}

function prefetchNetwork(i,foreground=false){
  if(i<0||i>=DATA.length)return null;
  const existing=networkPrefetches.get(i);
  if(existing&&!existing.controller.signal.aborted){existing.foreground ||= foreground;return existing.task;}
  const controller=new AbortController(),start=performance.now(),record={controller,foreground,task:null};
  record.task=fetch(TRAVEL_DATA[i],{cache:'force-cache',signal:controller.signal,priority:foreground?'high':'low'}).then(async response=>{
    if(!response.ok)throw new Error('HTTP '+response.status);
    const data=await response.arrayBuffer();
    sceneLoadingTimings.set(i,{networkMs:performance.now()-start,transferBytes:data.byteLength});return data;
  }).finally(()=>{if(networkPrefetches.get(i)===record)networkPrefetches.delete(i);});
  networkPrefetches.set(i,record);return record.task;
}

function evictDecodedPreload(i){
  const task=preloadCache.get(i);
  preloadCache.delete(i);
  if(task)task.then(gltf=>{
    if(gltf && i!==current && i!==preparingTarget && !recentScenes.has(i))dispose(gltf.scene);
  }).catch(()=>{});
  const record=networkPrefetches.get(i);if(record&&!record.foreground)record.controller.abort();
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
  if(preloadCache.has(i)){
    const task=preloadCache.get(i);
    preloadCache.delete(i);preloadCache.set(i,task);
    return task;
  }
  // A known oversized neighbor can warm HTTP cache without retaining another
  // huge decoded/GPU texture. Demand loads may briefly exceed the cache budget.
  if(sceneMemory.has(i)&&estimatedSceneBytes(object)+sceneMemory.get(i)>SCENE_MEMORY_BUDGET){prefetchNetwork(i)?.catch(()=>{});return null;}
  const task=loadGLTF(i).then(async gltf=>{
    if(preloadCache.get(i)!==task&&preparingTarget!==i){dispose(gltf.scene);return null;}
    prepareCheckpointScene(gltf,i,false);
    sceneMemory.set(i,estimatedSceneBytes(gltf.scene));trimSceneMemory(i);
    if(preparingTarget!==i&&residentSceneBytes()>SCENE_MEMORY_BUDGET){preloadCache.delete(i);dispose(gltf.scene);return null;}
    if(warmTexture)await warmCheckpointScene(gltf.scene,i);
    return gltf;
  }).catch(err=>{
    if(preloadCache.get(i)===task)preloadCache.delete(i);
    if(err.name!=='AbortError')console.warn('Preload failed for checkpoint',i+1,err);
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
  cancelStalePreloads();
  scheduleSceneRefinement();
  const connection=navigator.connection;
  if(connection?.saveData||/^(slow-)?2g$/.test(connection?.effectiveType||''))return;
  const routes=LOCATIONS[current]?.routes??[];
  // At a junction, prepare the route the visitor is facing rather than always
  // downloading the first branch listed in the data. Keep the decoded cache bounded.
  const prioritized=[...routes].sort((a,b)=>
    Math.abs(wrapAngle(-yaw-(a.departureAngle??a.angle)))-Math.abs(wrapAngle(-yaw-(b.departureAngle??b.angle))))
    .map(route=>route.to).filter((v,i,a)=>v!=null&&a.indexOf(v)===i&&!recentScenes.has(v));

  const source=current;
  const run=async()=>{
    preloadIdle=null;if(current!==source||transitioning||mapPanel.classList.contains('open')||document.hidden)return;
    for(const target of prioritized.slice(0,DECODED_PRELOAD_LIMIT)){
      if(current!==source||transitioning||mapPanel.classList.contains('open')||document.hidden)return;
      await preloadCheckpoint(target,true);
    }
  };
  if('requestIdleCallback' in window)preloadIdle=requestIdleCallback(run,{timeout:450});else preloadIdle=setTimeout(run,90);
}

let hoverPreloadTimer=null;
function queueRoutePreload(target){
  if(transitioning||target==null || target===current || recentScenes.has(target))return;
  clearTimeout(hoverPreloadTimer);
  hoverPreloadTimer=setTimeout(()=>{
    // Intent changes must not throw away an already prepared adjacent scene.
    refinement?.cancel();
    preloadCheckpoint(target,true)?.finally(scheduleSceneRefinement);
  },55);
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
// Render the portrait source artwork 90° clockwise so the campus runs horizontally.
// Order is image TL→NE, TR→SE, BR→SW, BL→NW.
const CAMPUS_MAP_CORNERS=CAMPUS_CORNERS;
const requestedScene=new URLSearchParams(location.search).get('scene');
const requestedSceneIndex=LOCATIONS.findIndex(loc=>loc.id===requestedScene);
const INITIAL_SCENE=requestedSceneIndex>=0?requestedSceneIndex:0;
let loadingScene=INITIAL_SCENE;
let historyTraversal=false;
let navigationGeneration=0,queuedHistory=null,historyRunning=false,preparing=false;
const sceneParameters=['scene','hall','building','room','checkpoint','yaw','pitch','fov'];
function sceneUrl(i){
  const url=new URL(location.href);for(const key of sceneParameters)url.searchParams.delete(key);
  url.searchParams.set('scene',LOCATIONS[i].id);return url;
}
function campusUrl(){
  const url=new URL(location.href);for(const key of sceneParameters)url.searchParams.delete(key);return url;
}
const currentView=()=>({yaw,pitch,fov:camera.fov});
function validView(view){return view&&['yaw','pitch','fov'].every(key=>Number.isFinite(view[key]))?{yaw:view.yaw,pitch:THREE.MathUtils.clamp(view.pitch,-1.35,1.35),fov:THREE.MathUtils.clamp(view.fov,35,95)}:null;}
function viewFromUrl(){const params=new URL(location.href).searchParams;return ['yaw','pitch','fov'].every(key=>params.has(key))?validView(Object.fromEntries(['yaw','pitch','fov'].map(key=>[key,Number(params.get(key))]))):null;}
function rememberHistoryView(){
  if(object&&!mapPanel.classList.contains('open')&&sceneIndexFromUrl()===current)
    history.replaceState({...history.state,view:currentView()},'',location.href);
}
function writeSceneHistory(i,replace=false){
  const url=sceneUrl(i);
  history[replace?'replaceState':'pushState']({scene:LOCATIONS[i].id,view:currentView()},'',url);
}
function writeCampusHistory(replace=false){
  history[replace?'replaceState':'pushState']({scene:null},'',campusUrl());
}
function sceneIndexFromUrl(){
  const id=new URL(location.href).searchParams.get('scene');
  return LOCATIONS.findIndex(loc=>loc.id===id);
}

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
      if(target.scene&&ready&&findPath(LOCATIONS,current,LOCATIONS.findIndex(item=>item.id===target.scene))){const button=document.createElement('button');button.type='button';button.textContent=ar?'أرشدني إلى القاعة':'Show me the way';button.disabled=transitioning;button.onclick=()=>startRoomDirections(target.scene);actions.append(button);}
      const enter=document.createElement('button');enter.type='button';enter.textContent=ar?'فتح العرض بزاوية 360°':'Open 360° view';enter.disabled=Boolean(target.scene)&&transitioning;enter.onclick=()=>openDirectoryTour(target);actions.append(enter);
    }else{
      detail.textContent+=' · '+(ar?'معلومات المبنى':'Building information');
      const information=document.createElement('button');information.type='button';information.textContent=ar?'عرض المعلومات':'View information';
      information.onclick=()=>{showCampusHome();requestAnimationFrame(()=>directory.selectById(hall.id));};actions.append(information);
    }
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
let campusMap=null,campusAttribution=null,attributionLanguage=null;
let directionsTarget=null,directionsNext=null,arrivalTimer=null;
const directionsPanel=document.createElement('section');
directionsPanel.id='directions-panel';directionsPanel.hidden=true;
directionsPanel.innerHTML='<div><strong id="directions-title"></strong><small id="directions-step" role="status" aria-live="polite"></small></div><button id="directions-next" type="button"></button><button id="directions-stop" type="button"></button>';
document.body.append(directionsPanel);
function clearArrivalTimer(){if(arrivalTimer){clearTimeout(arrivalTimer);arrivalTimer=null;}}
function updateDirections(){
  directionsPanel.hidden=directionsTarget===null;
  directionsNext=null;
  if(directionsTarget===null){clearArrivalTimer();return;}
  const path=findPath(LOCATIONS,current,directionsTarget),ar=currentLanguage==='ar';
  const arrived=current===directionsTarget;
  directionsNext=path?.[1]??null;
  directionsPanel.dataset.state=arrived?'arrived':'active';
  const title=document.getElementById('directions-title'),step=document.getElementById('directions-step');
  if(arrived){
    title.textContent=ar?'لقد وصلت':'You have arrived';
    step.textContent=localizedLocation(directionsTarget).name;
    if(!arrivalTimer)arrivalTimer=setTimeout(()=>{directionsTarget=null;updateDirections();lastMobileFrame='';updateHotspotVisuals(performance.now());},2400);
  }else{
    clearArrivalTimer();
    title.textContent=(ar?'في طريقك إلى ':'Going to ')+localizedLocation(directionsTarget).name;
    step.textContent=transitioning?(ar?'جارٍ الانتقال…':'Moving…'):!path?(ar?'لا يوجد مسار متصل من هذا الموقع.':'No connected route from this viewpoint.'):(ar?(path.length-1)+' نقاط تفتيش متبقية':(path.length-1)+' checkpoints remaining');
  }
  const next=document.getElementById('directions-next');next.hidden=directionsNext===null;next.disabled=!ready||transitioning;next.textContent=ar?'اتبع السهم':'Follow next arrow';
  const stop=document.getElementById('directions-stop');stop.textContent=ar?'إنهاء الاتجاهات':'End directions';stop.setAttribute('aria-label',ar?'إنهاء الاتجاهات':'End directions');
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
document.getElementById('directions-stop').onclick=()=>{clearArrivalTimer();directionsTarget=null;updateDirections();lastMobileFrame='';updateHotspotVisuals(performance.now());mapToggle.focus({preventScroll:true});};
function openDirectoryTour(target){
  directionsTarget=null;updateDirections();
  if(target.scene){const index=LOCATIONS.findIndex(item=>item.id===target.scene);if(index>=0)openPanoramaFromCampus(index);}
  else if(target.url){const url=new URL(target.url,location.href);if(['https:','http:'].includes(url.protocol))location.assign(url.href);}
}
function hallIdForScene(i=current){return areaForScene(i)?.hallId??null;}
function isM7Scene(i=current){return hallIdForScene(i)==='m7';}
const initialBuilding=requestedSceneIndex>=0?buildingForLegacyHall(hallIdForScene(INITIAL_SCENE)):null;
const directory=createDirectory({halls:CAMPUS_BUILDINGS,root:mapPanel,language:()=>currentLanguage,isReady:()=>!transitioning,startDirections:startRoomDirections,canGuide:scene=>{const target=LOCATIONS.findIndex(item=>item.id===scene);return ready&&target>=0&&Boolean(findPath(LOCATIONS,current,target));},openTour:openDirectoryTour,currentHallId:()=>object?hallIdForScene():null,initialTarget:initialBuilding?{hallId:initialBuilding.id,roomId:initialBuilding.rooms.find(room=>room.tour?.scene===requestedScene)?.id}:null});
const campusPopovers=createCampusPopovers(mapPanel,value=>{currentLanguage=value;applyLanguage();},directory,infoPanel);
const campusHandoff=createCampusHandoff(mapPanel);
let pendingCampusEntry=false;
const cancelCampusEntry=document.createElement('button');cancelCampusEntry.id='campus-cancel-load';cancelCampusEntry.type='button';cancelCampusEntry.hidden=true;mapPanel.append(cancelCampusEntry);
cancelCampusEntry.onclick=()=>{++navigationGeneration;pendingCampusEntry=false;transitioning=false;preparing=false;preparingTarget=null;campusHandoff.cancel();loading.classList.add('done');loading.style.display='none';cancelCampusEntry.hidden=true;document.getElementById('status').textContent='';app.setAttribute('aria-busy','false');document.body.classList.add('campus-only');if(!historyTraversal&&sceneIndexFromUrl()>=0)writeCampusHistory(true);updateControls();directory.update();};
mapPanel.addEventListener('campus-selection-change',()=>{if(pendingCampusEntry)cancelCampusEntry.onclick();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&pendingCampusEntry&&mapPanel.classList.contains('open')&&!infoPanel.classList.contains('open')){event.preventDefault();event.stopImmediatePropagation();cancelCampusEntry.onclick();}});
function initCampusMap(){
  if(campusMap||!window.maplibregl)return;
  const building=buildingForLegacyHall('m7');
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
    ...(directory.initialCamera()||{}),
    ...directory.cameraPolicy(),
    renderWorldCopies:false,
    // Constrain the camera centre, not the entire wide-raster viewport. Native
    // extent fitting otherwise crops the campus on narrow/tall overview screens.
    transformConstrain:(center,zoom)=>{
      const constrained=clampCampusCamera({center,zoom},directory.cameraPolicy());
      return {center:new maplibregl.LngLat(...constrained.center),zoom:constrained.zoom};
    },
    maxPitch:0,
    dragRotate:false,
    pitchWithRotate:false,
    touchPitch:false,
    attributionControl:false
  });
  campusMap.touchZoomRotate.disableRotation();
  campusMap.keyboard.disableRotation();
  campusAttribution=new maplibregl.AttributionControl({compact:true,customAttribution:t('mapOwnership')});
  attributionLanguage=currentLanguage;campusMap.addControl(campusAttribution,'bottom-right');
  campusMap.addControl(new maplibregl.NavigationControl({showCompass:false,showZoom:true,visualizePitch:false}),'top-right');
  document.getElementById('campus-zoom-in').onclick=()=>campusMap.zoomIn({duration:reducedMotion?0:180});
  document.getElementById('campus-zoom-out').onclick=()=>campusMap.zoomOut({duration:reducedMotion?0:180});
  const artwork=addCampusArtworkLabels(campusMap,CAMPUS_MAP_CORNERS,CAMPUS_BUILDINGS,members=>directory.selectGroup(members));
  directory.attach(campusMap,artwork);
}
function updateCampusMap(){
  if(campusMap&&attributionLanguage!==currentLanguage){campusMap.removeControl(campusAttribution);campusAttribution=new maplibregl.AttributionControl({compact:true,customAttribution:t('mapOwnership')});campusMap.addControl(campusAttribution,'bottom-right');attributionLanguage=currentLanguage;}
  document.getElementById('campus-overview').setAttribute('aria-label',currentLanguage==='ar'?'نظرة عامة على الحرم الجامعي':'Campus overview');
  document.getElementById('campus-overview').textContent=currentLanguage==='ar'?'نظرة عامة':'Campus overview';
  document.getElementById('campus-filters').setAttribute('aria-label',currentLanguage==='ar'?'تصفية المباني':'Building filters');
  document.getElementById('campus-current-location').textContent=object?locationLabel():t('tourMap');
  directory.update();
  document.getElementById('campus-map').setAttribute('aria-label',t('campusMapAria'));
}
function closePanels(){
  if(mapPanel.classList.contains('open'))directory.leave();
  if(!object){
    for(const [panel,button] of [[infoPanel,infoToggle],[searchPanel,searchToggle]]){
      panel.classList.remove('open');panel.setAttribute('aria-hidden','true');panel.inert=true;button.setAttribute('aria-pressed','false');
    }
    return;
  }
  for(const [panel,button] of [[mapPanel,mapToggle],[infoPanel,infoToggle],[searchPanel,searchToggle]]){
    panel.classList.remove('open');panel.setAttribute('aria-hidden','true');button.setAttribute('aria-pressed','false');
    panel.inert=true;
  }
  document.body.classList.remove('campus-only');
  if(ready)updateRouteLabel();
}
function togglePanel(panel,button){
  if(panel===mapPanel&&document.documentElement.dataset.mapEnabled==='false')return;
  const open=!panel.classList.contains('open');
  if(panel===mapPanel&&open){rememberHistoryView();if(!historyTraversal)writeCampusHistory();cancelStalePreloads();}
  closePanels();
  if(open){
    panel.inert=false;panel.classList.add('open');panel.setAttribute('aria-hidden','false');button.setAttribute('aria-pressed','true');
    if(panel===mapPanel){initCampusMap();requestAnimationFrame(()=>{directory.restore();updateCampusMap();});}
  }
  if(panel===mapPanel&&!open&&object&&!historyTraversal){writeSceneHistory(current);scheduleLikelyPreload();}
  updateControls();
  updateRouteLabel();
}
function showCampusHome(writeHistory=true){
  if(pendingCampusEntry)cancelCampusEntry.onclick();
  campusHandoff.cancel();campusPopovers.close();
  if(writeHistory)rememberHistoryView();
  cancelStalePreloads();
  setMoreMenuOpen(false);
  document.body.classList.add('campus-only');
  closePanels();
  mapPanel.inert=false;mapPanel.classList.add('open');mapPanel.setAttribute('aria-hidden','false');mapToggle.setAttribute('aria-pressed','true');
  initCampusMap();
  requestAnimationFrame(()=>{directory.restore();updateCampusMap();});
  if(writeHistory&&!historyTraversal)writeCampusHistory(false);
  updateControls();
}
mapToggle.onclick=()=>{setMoreMenuOpen(false);if(pendingCampusEntry){cancelCampusEntry.onclick();return;}togglePanel(mapPanel,mapToggle);};
infoToggle.onclick=()=>{setMoreMenuOpen(false);togglePanel(infoPanel,infoToggle);};
document.querySelectorAll('[data-close-panel]').forEach(btn=>btn.addEventListener('click',()=>{
  if(btn.closest('aside')===infoPanel&&mapPanel.classList.contains('open')){
    infoPanel.classList.remove('open');infoPanel.setAttribute('aria-hidden','true');infoPanel.inert=true;infoToggle.setAttribute('aria-pressed','false');
    document.getElementById('campus-settings').focus({preventScroll:true});return;
  }
  const opener=btn.closest('aside')===mapPanel?mapToggle:infoToggle;closePanels();opener.focus();updateRouteLabel();
  if(opener===mapToggle&&object&&!historyTraversal){document.body.classList.remove('campus-only');writeSceneHistory(current);updateControls();scheduleLikelyPreload();}
}));
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
async function openPanoramaFromCampus(target,activation={}){
  if(transitioning||!Number.isInteger(target)||!LOCATIONS[target])return;
  const generation=activation.generation??++navigationGeneration,writeHistory=activation.history??!historyTraversal;
  if(writeHistory)rememberHistoryView();
  directory.leave();
  campusPopovers.close();campusHandoff.cancel();
  if(object&&target===current){
    document.body.classList.remove('campus-only');const view=validView(activation.view);
    if(view){yaw=view.yaw;pitch=view.pitch;camera.fov=view.fov;camera.updateProjectionMatrix();camera.rotation.set(pitch,yaw,0);}
    closePanels();if(writeHistory)writeSceneHistory(target,false);updateControls();mapToggle.focus({preventScroll:true});return true;
  }
  transitioning=true;preparing=true;preparingTarget=target;loadingScene=target;app.setAttribute('aria-busy','true');
  cancelStalePreloads(target);
  const status=document.getElementById('status');status.textContent=t('loadingLocation',locationLabel(target),null);
  pendingCampusEntry=mapPanel.classList.contains('open');
  if(pendingCampusEntry){cancelCampusEntry.textContent=currentLanguage==='ar'?'العودة إلى الخريطة':'Back to campus';cancelCampusEntry.hidden=false;}
  else if(!object){loading.style.display='grid';loading.classList.remove('done');setInitialProgress(0);}
  directory.update();
  try{
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const prepared=takeRecentScene(target) ?? await (preloadCache.get(target) ?? Promise.resolve(null));
    preloadCache.delete(target);
    await loadCheckpoint(target,prepared,p=>setInitialProgress(p),{...activation,generation,history:writeHistory});
    renderPanoramaFrame();await campusHandoff.play(LOCATIONS[target].id,{yaw,pitch,fov:camera.fov});
    if(generation!==navigationGeneration)return false;
    closePanels();mapToggle.focus({preventScroll:true});
    return true;
  }catch(error){
    if(error.name==='AbortError'||generation!==navigationGeneration)return false;
    loading.classList.add('done');loading.style.display='none';
    const message=document.querySelector('#hall-detail .hall-status');
    if(message){message.textContent=t('loadLocationError');message.setAttribute('role','alert');}
    showTravelError(target,{kind:'campus',target});
    console.error(error);
  }finally{
    if(generation===navigationGeneration||queuedHistory){pendingCampusEntry=false;cancelCampusEntry.hidden=true;transitioning=false;preparing=false;preparingTarget=null;status.textContent='';app.setAttribute('aria-busy','false');updateControls();directory.update();
      if(queuedHistory)drainBrowserHistory();else scheduleLikelyPreload();}
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

const sceneGradeCache=new Map();
const DEFAULT_GRADE=Object.freeze({
  exposure:1,contrast:1.10,saturate:1.18,vibrance:.11,shadowLift:.028,highlightRollOff:.065,
  blackPoint:.014,gamma:1,balance:[1,1,1],sharpness:coarsePointer?.10:.16,vignette:.028
});
function measurePanorama(texture){
  const image=texture?.image;
  const width=image?.width||image?.videoWidth||0;
  const height=image?.height||image?.videoHeight||0;
  if(!image||!width||!height)return null;
  const canvas=document.createElement('canvas');
  canvas.width=64;canvas.height=32;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)return null;
  try{ctx.drawImage(image,0,0,canvas.width,canvas.height);}catch{return null;}
  let pixels;
  try{pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;}catch{return null;}
  const luma=[];
  let chromaSum=0,chromaCount=0,neutralR=0,neutralG=0,neutralB=0,neutralCount=0;
  for(let p=0;p<pixels.length;p+=4){
    if(pixels[p+3]<64)continue;
    const r=pixels[p]/255,g=pixels[p+1]/255,b=pixels[p+2]/255;
    const y=.2126*r+.7152*g+.0722*b;
    const chroma=Math.max(r,g,b)-Math.min(r,g,b);
    luma.push(y);
    if(y>.08&&y<.92){chromaSum+=chroma;chromaCount++;}
    if(y>.12&&y<.88&&chroma<.30){neutralR+=r;neutralG+=g;neutralB+=b;neutralCount++;}
  }
  if(luma.length<64)return null;
  luma.sort((a,b)=>a-b);
  const from=Math.floor(luma.length*.14),to=Math.ceil(luma.length*.86);
  let sum=0;
  for(let n=from;n<to;n++)sum+=luma[n];
  const midtone=sum/Math.max(1,to-from);
  const p20=luma[Math.floor(luma.length*.20)],p80=luma[Math.floor(luma.length*.80)];
  let balance=[1,1,1];
  if(neutralCount>24){
    const r=neutralR/neutralCount,g=neutralG/neutralCount,b=neutralB/neutralCount;
    const gray=(r+g+b)/3;
    const raw=[gray/Math.max(.06,r),gray/Math.max(.06,g),gray/Math.max(.06,b)];
    const mean=(raw[0]+raw[1]+raw[2])/3;
    balance=raw.map(v=>THREE.MathUtils.clamp(1+(v/mean-1)*.22,.97,1.03));
  }
  return {midtone,spread:p80-p20,chroma:chromaSum/Math.max(1,chromaCount),balance};
}
function autoGrade(texture){
  const measured=measurePanorama(texture);
  if(!measured)return {...DEFAULT_GRADE,balance:[1,1,1]};
  // Preserve the source white balance and avoid clipping dark interiors.
  const exposure=THREE.MathUtils.clamp(Math.pow(.50/Math.max(.18,measured.midtone),.42),.96,1.06);
  const contrast=THREE.MathUtils.clamp(1.01+(.44-measured.spread)*.025,.99,1.035);
  const saturate=THREE.MathUtils.clamp(1.01+(.13-measured.chroma)*.06,.98,1.035);
  const vibrance=THREE.MathUtils.clamp(.02+(.12-measured.chroma)*.08,.0,.035);
  return {...DEFAULT_GRADE,exposure,contrast,saturate,vibrance,shadowLift:.012,highlightRollOff:.035,blackPoint:.006,gamma:1,balance:measured.balance,sharpness:coarsePointer?.08:.12,vignette:coarsePointer?.008:.012};
}

function resolvedSceneGrade(i,grade){
  if(LOCATIONS[i]?.area!=='Library')return grade;
  // Library panoramas are naturally darker and warmer. Keep them clean, bright and close to source
  // instead of stacking black-point/contrast/vignette corrections intended for brighter scenes.
  return {
    ...grade,
    exposure:THREE.MathUtils.clamp(Math.max(grade.exposure,1.045),1.045,1.105),
    contrast:1.01,
    saturate:1.075,
    vibrance:.035,
    shadowLift:.052,
    highlightRollOff:.022,
    blackPoint:0,
    gamma:1.0,
    balance:[1,1,1],
    sharpness:coarsePointer?.065:.095,
    vignette:.004
  };
}

function prep(root,i){
  const aniso=Math.min(renderer.capabilities.getMaxAnisotropy(),coarsePointer?4:Infinity);
  const gain=VISUAL_CALIBRATION[i]??[1,1,1];
  root.traverse(o=>{
    if(!o.isMesh) return;
    const oldMats=Array.isArray(o.material)?o.material:[o.material];
    if(!sceneGradeCache.has(i)){
      const source=oldMats.find(m=>m?.map)?.map;
      sceneGradeCache.set(i,resolvedSceneGrade(i,autoGrade(source)));
    }
    const grade=sceneGradeCache.get(i)??DEFAULT_GRADE;
    const gainMean=Math.max(.001,(gain[0]+gain[1]+gain[2])/3);
    const newMats=oldMats.map(m=>{
      const bm=new THREE.MeshBasicMaterial({
        map:m && m.map ? m.map : null,
        // Preserve any existing RGB tint calibration, but let auto-exposure own overall brightness.
        color:new THREE.Color((gain[0]/gainMean)*grade.exposure,(gain[1]/gainMean)*grade.exposure,(gain[2]/gainMean)*grade.exposure),
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
  // This mesh is invisible and only widens the touch/raycast target; it does not affect placement or bearing.
  const hit=surface(new THREE.CircleGeometry(0.42,48),floorMaterial(0xffffff,0),0,9);
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
  const arrowFlip=!isM7Scene(current)?Math.PI:0;
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
    const stairBoost=u.route?.kind==='stairs'?0.06:0;
    const guided=directionsNext!==null&&u.route?.to===directionsNext;
    const routeEmphasis=(directionsNext!==null&&!guided)?0.4:1;
    const guidedPulse=(guided&&!reducedMotion)?(0.5+0.5*Math.sin(now*0.004))*0.06:0;
    hs.scale.setScalar(hotspotScale*(1+0.05*e+pulse+guidedPulse)*(guided?1.08:routeEmphasis===1?1:.94));
    // A light chevron over a deeper green disc stays legible on both bright
    // tiles and dark carpet without changing its physical size or direction.
    u.inner.material.color.setHex(guided?0xffcf5c:0x006957);
    u.ring.material.color.setHex(guided?0xffe49a:0xaaf0d8);
    u.arrow.material.color.setHex(guided?0xfff5c4:0xf0fffa);
    u.inner.material.opacity=(0.58+0.12*e+stairBoost)*quiet*routeEmphasis;
    u.ring.material.opacity=(0.65+0.25*e+pulse)*quiet*routeEmphasis;
    u.arrow.material.opacity=(0.94+0.06*e)*quiet*routeEmphasis;
    if(guided){u.inner.material.opacity=.5+guidedPulse;u.ring.material.opacity=.88+guidedPulse;u.arrow.material.opacity=1;}
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

function setSceneGrade(i){
  const grade=resolvedSceneGrade(i,sceneGradeCache.get(i)??DEFAULT_GRADE);
  postUniforms.uContrast.value=grade.contrast;
  postUniforms.uSaturation.value=grade.saturate;
  postUniforms.uVibrance.value=grade.vibrance;
  postUniforms.uShadowLift.value=grade.shadowLift;
  postUniforms.uHighlightRollOff.value=grade.highlightRollOff;
  postUniforms.uBlackPoint.value=grade.blackPoint;
  postUniforms.uGamma.value=grade.gamma;
  postUniforms.uBalance.value.set(grade.balance[0],grade.balance[1],grade.balance[2]);
  postUniforms.uSharpness.value=grade.sharpness;
  postUniforms.uVignette.value=grade.vignette;
  setCanvasFx(1,0,1);
}
function setCanvasFx(scale=1,blur=0,opacity=1){
  el.style.transform=`scale(${scale})`;
  el.style.filter=blur>0?`blur(${blur}px)`:'none';
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
  if(currentLanguage==='ar'&&LOCATION_AR[i]){const ar=LOCATION_AR[i];return Array.isArray(ar)?{area:ar[0],name:ar[1]}:{area:ar.area,name:ar.name};}
  return {area:loc.area,name:loc.name};
}
function locationLabel(i=current){const loc=localizedLocation(i);return loc.area+' · '+loc.name;}
function tourAreaTitle(i=current){
  if(isM7Scene(i))return t('building');
  const hall=HALLS.find(item=>item.id===hallIdForScene(i));
  return hall?localized(hall.name,currentLanguage):localizedLocation(i).area;
}
function backTarget(){return LOCATIONS[current]?.back ?? null;}
function floorLabel(i=current){
  if(!isM7Scene(i))return '360°';
  return LOCATIONS[i]?.area==='Top Floor'?t('topFloorBadge'):t('groundFloorBadge');
}
function sceneLink(i=current){const url=sceneUrl(i);if(i===current&&object)for(const [key,value]of Object.entries(currentView()))url.searchParams.set(key,String(Number(value.toFixed(5))));return url.href;}
function updateSceneShare(){
  const campus=!object||mapPanel.classList.contains('open'),url=campus?campusUrl().href:sceneLink();
  document.querySelector('#info-panel .share-card').hidden=campus;
  shareLocation.textContent=campus?t('campusNavigator'):locationLabel();sceneLinkElement.href=url;sceneLinkElement.textContent=url;
}
function updateInformationContext(){
  const campus=!object||mapPanel.classList.contains('open');
  const building=campus?null:buildingForLegacyHall(hallIdForScene(current));
  document.querySelector('#info-panel [data-i18n="aboutTitle"]').textContent=campus?t('campusNavigator'):t('aboutPlace')+' · '+tourAreaTitle();
  document.getElementById('info-subtitle').textContent=campus?t('university'):locationLabel();
  document.getElementById('info-intro').textContent=campus?t('campusAboutCopy'):localized(building?.description,currentLanguage)||t('aboutCopy');
  infoPanel.setAttribute('aria-label',campus?t('campusNavigator'):t('aboutPlace')+' · '+tourAreaTitle());
}
function updateControls(){
  updateTourSearch();
  updateDirections();
  previous.disabled=!ready || transitioning || backTarget()==null;
  document.getElementById('route-label').textContent=locationLabel();
  document.title=object&&!mapPanel.classList.contains('open')?tourAreaTitle()+' — 360° Tour | University of Sharjah':'Campus 360° Tours | University of Sharjah';
  floorBadge.textContent=floorLabel();
  document.querySelector('.brand-row [data-i18n="building"]').textContent=tourAreaTitle();
  document.getElementById('info-subtitle').textContent=t('university')+' · '+tourAreaTitle();
  updateMap();
  updateGuidance();
  updateSceneShare();
  updateInformationContext();
}
function applyLanguage(persist=true){
  document.documentElement.lang=currentLanguage;
  document.documentElement.dir=currentLanguage==='ar'?'rtl':'ltr';
  document.title=t('pageTitle');
  document.querySelectorAll('[data-i18n]').forEach(node=>{node.textContent=t(node.dataset.i18n);});
  document.querySelectorAll('[data-i18n-aria]').forEach(node=>{node.setAttribute('aria-label',t(node.dataset.i18nAria));});
  document.querySelectorAll('[data-i18n-title]').forEach(node=>{node.title=t(node.dataset.i18nTitle);});
  languageToggle.textContent=currentLanguage==='ar'?'English':'العربية';
  languageToggle.setAttribute('aria-label',t('switchLanguage'));
  languageToggle.title=currentLanguage==='ar'?'English':'العربية';
  motion.setAttribute('aria-label',t(motionEnabled?'motionDisable':'motionEnable'));
  fullscreen.setAttribute('aria-label',t(document.fullscreenElement?'exitFullScreen':'fullScreen'));
  if(moreToggle){
    const moreLabel=currentLanguage==='ar'?'المزيد من أدوات العرض':'More view controls';
    moreToggle.setAttribute('aria-label',moreLabel);moreToggle.title=moreLabel;moreMenu?.setAttribute('aria-label',moreLabel);
  }
  document.getElementById('more-view-label').textContent=t('moreView');
  document.getElementById('more-tour-label').textContent=t('moreTour');
  document.getElementById('campus-area-count').textContent=String(TOUR_AREAS.length);
  document.getElementById('campus-view-count').textContent=String(LOCATIONS.length);
  document.getElementById('campus-about').setAttribute('aria-label',currentLanguage==='ar'?'عن دليل الحرم الجامعي':'About Campus Navigator');
  document.querySelector('#campus-map-more summary').setAttribute('aria-label',currentLanguage==='ar'?'أدوات الخريطة':'Map controls');
  document.getElementById('campus-zoom-in').setAttribute('aria-label',currentLanguage==='ar'?'تكبير الخريطة':'Zoom in');
  document.getElementById('campus-zoom-out').setAttribute('aria-label',currentLanguage==='ar'?'تصغير الخريطة':'Zoom out');
  cp.textContent=locationLabel();
  updateControls();updateRouteLabel();
  if(!loading.classList.contains('done'))setInitialProgress(lastInitialProgress);
  if(persist)try{localStorage.setItem(languageKey,currentLanguage);}catch{}
}
function switchLanguage(){currentLanguage=currentLanguage==='en'?'ar':'en';applyLanguage();}
languageToggle.onclick=switchLanguage;
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
  yaw=-bearing;pitch=LOCATIONS[current]?.viewPitch ?? 0;camera.fov=isM7Scene(current)?72:95;camera.updateProjectionMatrix();camera.rotation.set(pitch,yaw,0);
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
  const start=performance.now();
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
  const timings=sceneLoadingTimings.get(i)||{};
  timings.prepareMs=performance.now()-start;sceneLoadingTimings.set(i,timings);
  return replacement;
}
async function warmCheckpointScene(root,i){
  if(root.userData.panoramaWarmed)return;
  const timings=sceneLoadingTimings.get(i)||{},start=performance.now();
  root.traverse(mesh=>{
    for(const m of(Array.isArray(mesh.material)?mesh.material:[mesh.material]))if(m?.map){
      if(Math.max(m.map.image?.width||0,m.map.image?.height||0)>renderer.capabilities.maxTextureSize)
        throw new Error('Panorama exceeds this device’s full-quality texture limit.');
      renderer.initTexture?.(m.map);
    }
  });
  timings.uploadMs=performance.now()-start;
  const shaderStart=performance.now();
  // Available in pinned Three r180; keep the synchronous compatibility fallback.
  if(typeof renderer.compileAsync==='function')await renderer.compileAsync(root,camera,scene);
  else renderer.compile(root,camera,scene);
  timings.compileMs=performance.now()-shaderStart;
  timings.estimatedBytes=estimatedSceneBytes(root);sceneLoadingTimings.set(i,timings);
  root.userData.panoramaWarmed=true;
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
  trimSceneMemory();
}
function takeRecentScene(i){
  const root=recentScenes.get(i)??null;
  if(root)recentScenes.delete(i);
  return root;
}
function loadGLTF(i,onProgress=null){
  onProgress?.(null);
  return prefetchNetwork(i,i===preparingTarget||i===INITIAL_SCENE&&!object).then(async data=>{
    onProgress?.(1);const start=performance.now();
    const gltf=await loader.parseAsync(data,new URL('.',new URL(TRAVEL_DATA[i],location.href)).href);
    gltf.scene.userData.panoramaFullQuality=TRAVEL_DATA[i]===DATA[i];
    const timings=sceneLoadingTimings.get(i)||{};timings.parseDecodeMs=performance.now()-start;sceneLoadingTimings.set(i,timings);return gltf;
  });
}
refinement=createPanoramaRefinement({
  isCurrent:(i,root)=>current===i&&object===root&&!transitioning&&!document.hidden&&!mapPanel.classList.contains('open'),
  load:async(i,signal)=>{
    const start=performance.now();
    const response=await fetch(DATA[i],{cache:'force-cache',signal,priority:'low'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const gltf=await loader.parseAsync(await response.arrayBuffer(),new URL('.',new URL(DATA[i],location.href)).href);
    const root=gltf.scene;
    try{
      if(signal.aborted)throw new DOMException('Superseded refinement','AbortError');
      prepareCheckpointScene(gltf,i,false);
      trimSceneMemory(null,estimatedSceneBytes(root));
      await warmCheckpointScene(root,i);
      root.userData.panoramaFullQuality=true;
      const timings=sceneLoadingTimings.get(i)||{};
      timings.refinementMs=performance.now()-start;sceneLoadingTimings.set(i,timings);
      return root;
    }catch(error){dispose(root);throw error;}
  },
  apply:(i,previous,replacement)=>{
    // Swap only the scene artwork: camera, hotspot bearings, URL and history stay put.
    scene.remove(previous);object=replacement;scene.add(object);dispose(previous);
    trimSceneMemory();renderPanoramaFrame();
  },
  dispose,
  onError:error=>console.warn('Full-resolution refinement unavailable; retaining the loaded panorama.',error)
});
function scheduleSceneRefinement(){
  if(object&&!object.userData.panoramaFullQuality&&!transitioning&&!document.hidden&&!mapPanel.classList.contains('open'))refinement.queue(current,object);
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)cancelStalePreloads();else if(object&&!transitioning)scheduleLikelyPreload();
});
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
async function loadCheckpoint(i, prepared=null, onProgress=null, activation={}){
  let replacement;
  if(prepared?.isObject3D)replacement=prepared;
  else{
    const gltf=prepared ?? await loadGLTF(i,onProgress);
    replacement=prepareCheckpointScene(gltf,i,false);
  }
  sceneMemory.set(i,estimatedSceneBytes(replacement));
  try{await warmCheckpointScene(replacement,i);}catch(error){dispose(replacement);throw error;}
  if(activation.generation!=null&&activation.generation!==navigationGeneration){
    dispose(replacement);throw new DOMException('Superseded navigation','AbortError');
  }
  const view=typeof activation.view==='function'?activation.view():activation.view;
  const outgoing=object,oldIndex=current;
  if(outgoing)scene.remove(outgoing);
  object=replacement;current=i;
  // Assign current before pruning, so cache eviction never disposes the new view.
  if(outgoing)cacheRecentScene(oldIndex,outgoing);
  renderQuality(!isM7Scene(i));syncPostTargetSize();scene.add(object);document.body.classList.remove('campus-only');setSceneGrade(i);
  camera.position.set(0,CAMERA_HEIGHT,0);resetView();
  if(view){yaw=view.yaw;pitch=THREE.MathUtils.clamp(view.pitch,-1.35,1.35);camera.fov=THREE.MathUtils.clamp(view.fov,35,95);camera.updateProjectionMatrix();camera.rotation.set(pitch,yaw,0);}
  cp.textContent=locationLabel(i);
  hoverHotspot=null;placeHotspots();ready=true;
  if(activation.history!==false)writeSceneHistory(i,activation.replace===true);
  loading.classList.add('done');setTimeout(()=>{if(loading.classList.contains('done'))loading.style.display='none';},460);updateControls();
  updateHotspotVisuals(performance.now());renderPanoramaFrame();trimSceneMemory();
}

const travelFrame=document.getElementById('travel-frame');
const travelContext=travelFrame.getContext('2d');
function routeFromTo(from,to){return LOCATIONS[from]?.routes?.find(r=>r.to===to) ?? null;}
function wrapAngle(a){return THREE.MathUtils.euclideanModulo(a+Math.PI,Math.PI*2)-Math.PI;}
async function transitionTo(i,selectedRoute=null,fromMap=false,activation={}){
  // Map jumps reuse the existing load, rollback and fade; arrow travel stays connected.
  const route=selectedRoute ?? routeFromTo(current,i) ?? (fromMap?{to:i,angle:-yaw}:null);
  if(!ready || transitioning || i<0 || i>=DATA.length || i===current || !route)return;
  const from=current,generation=activation.generation??++navigationGeneration,writeHistory=activation.history??!historyTraversal;
  if(writeHistory)rememberHistoryView();
  const bearing=route.angle;
  const transitionKind=fromMap?'map':route.kind==='stairs'?'stairs':route.back?'back':'forward';
  const stairSign=route.stairDirection==='down'?1:-1;
  transitioning=true;preparing=true;preparingTarget=i;cancelStalePreloads(i);updateControls();app.setAttribute('aria-busy','true');
  const status=document.getElementById('status');status.textContent='';
  const destination=locationLabel(i);loadingScene=i;
  const slowLoad=setTimeout(()=>{if(preparing)status.textContent=t('loadingLocation',destination,null);},250);
  try{
    let prepared=takeRecentScene(i);
    if(!prepared){
      let gltf=await (preloadCache.get(i)??Promise.resolve(null));
      if(!gltf)gltf=await loadGLTF(i,p=>{
        status.textContent=p==null?t('loadingLocation',destination,null):p>=1?t('preparingLocation',destination):t('loadingLocation',destination,Math.min(99,Math.round(p*100)));
      });
      preloadCache.delete(i);
      prepared=prepareCheckpointScene(gltf,i,false);
    }
    try{await warmCheckpointScene(prepared,i);}catch(error){dispose(prepared);throw error;}
    if(generation!==navigationGeneration){dispose(prepared);throw new DOMException('Superseded navigation','AbortError');}
    clearTimeout(slowLoad);status.textContent='';
    // Only now lock input for the short visual travel. Any legitimate look/zoom
    // accepted during preparation is captured here, never at the earlier tap.
    const oldYaw=yaw,oldPitch=pitch,oldFov=camera.fov;
    const departure=route.departureAngle??bearing;
    const view=validView(activation.view)||arrivalView({from,to:i,route,yaw:oldYaw,pitch:oldPitch,fov:oldFov,fromMap});
    const facingTravel=Math.cos(oldYaw+departure);
    preparing=false;dragging=false;gesture=null;touches.clear();pinchDistance=null;hoverHotspot=null;el.title='';
    document.body.classList.add('moving');el.style.cursor='progress';routeTip.classList.remove('show');
    hotspotGroup.visible=false;renderPanoramaFrame();
    // Preserve the existing transition snapshot size; final rendering is unchanged.
    const snapScale=coarsePointer?.50:.84;
    travelFrame.width=Math.max(1,Math.round(el.width*snapScale));travelFrame.height=Math.max(1,Math.round(el.height*snapScale));
    travelContext.drawImage(el,0,0,travelFrame.width,travelFrame.height);
    const anchor=new THREE.Vector3(Math.sin(departure),FLOOR_Y,-Math.cos(departure));camera.updateMatrixWorld();anchor.project(camera);
    travelFrame.style.transformOrigin=THREE.MathUtils.clamp((anchor.x+1)*50,15,85)+'% '+THREE.MathUtils.clamp((1-anchor.y)*50,20,80)+'%';
    travelFrame.style.transform='scale(1)';travelFrame.style.opacity='1';travelFrame.style.filter='none';travelFrame.style.display='block';
    await loadCheckpoint(i,prepared,null,{...activation,generation,view,history:writeHistory});
    // Settle the decoded destination beneath the departing frame instead of exposing a hard replacement.
    const settleScale=transitionKind==='map'?1.003:1.009;
    const settleBlur=transitionKind==='map'?.45:.28;
    if(!reducedMotion)setCanvasFx(settleScale,settleBlur,.96);
    await tween(reducedMotion?100:(coarsePointer?300:360),(e,t)=>{
      if(generation!==navigationGeneration)return;
      if(!reducedMotion){
        let transform='scale(1)';
        let blur=.72;
        if(transitionKind==='forward'){
          const push=1+.065*e*Math.max(.35,facingTravel);
          transform='scale('+push+')';
        }else if(transitionKind==='back'){
          transform='translateY('+(3*e)+'px) scale('+(1-.026*e)+')';
          blur=.6;
        }else if(transitionKind==='stairs'){
          transform='translateY('+(stairSign*22*e)+'px) scale('+(1+.045*e)+')';
          blur=.86;
        }else{
          // Map selection is intentionally a soft replacement, not a directional travel cue.
          transform='scale('+(1+.008*e)+')';
          blur=1.05;
        }
        travelFrame.style.transform=transform;
        travelFrame.style.filter='blur('+(blur*e)+'px) brightness('+(1-.025*e)+')';
        setCanvasFx(1+(settleScale-1)*(1-e),settleBlur*(1-e),.96+.04*e);
      }
      travelFrame.style.opacity=String(1-THREE.MathUtils.smoothstep(t,reducedMotion?0:.06,1));
    });
    setCanvasFx(1,0,1);
    completeGuidance();return true;
  }catch(err){
    if(err.name==='AbortError')return false;
    console.error(err);
    status.textContent='';
    showTravelError(i,{kind:'transition',target:i,route,fromMap});
  }finally{
    clearTimeout(slowLoad);travelFrame.style.display='none';travelFrame.style.filter='none';travelFrame.style.transform='';travelContext.clearRect(0,0,travelFrame.width,travelFrame.height);
    camera.position.set(0,CAMERA_HEIGHT,0);hotspotGroup.visible=true;
    document.body.classList.remove('moving');app.setAttribute('aria-busy','false');transitioning=false;preparing=false;preparingTarget=null;el.style.cursor='grab';updateControls();
    if(queuedHistory)drainBrowserHistory();else scheduleLikelyPreload();
  }
}
const touches=new Map();let gesture=null, pinchDistance=null;
el.addEventListener('pointerdown',e=>{
  if(document.body.classList.contains('more-open'))setMoreMenuOpen(false);
  if(!ready || (transitioning&&!preparing) || e.button!==0)return;
  touches.set(e.pointerId,{x:e.clientX,y:e.clientY});el.setPointerCapture(e.pointerId);
  if(touches.size>1){gesture=null;dragging=false;pinchDistance=null;return;}
  checkHotspotHover(e.clientX,e.clientY);
  if(hoverHotspot?.userData?.route)queueRoutePreload(hoverHotspot.userData.route.to);
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,yaw,pitch,hit:hoverHotspot,moved:false};dragging=true;

});
el.addEventListener('pointermove',e=>{
  if(transitioning&&!preparing)return;
  if(touches.has(e.pointerId))touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(touches.size===2){const [a,b]=[...touches.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance!==null)zoom((pinchDistance-d)*0.12);pinchDistance=d;return;}
  if(gesture && gesture.id===e.pointerId){
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
    if(!gesture.moved&&Math.hypot(dx,dy)>8){gesture.moved=true;document.body.classList.add('viewer-looking');}
    if(gesture.moved){noteLookAround();yaw=gesture.yaw-dx*0.004;pitch=THREE.MathUtils.clamp(gesture.pitch-dy*0.004,-1.45,1.45);camera.rotation.set(pitch,yaw,0);}
  }
  checkHotspotHover(e.clientX,e.clientY);
});
function release(e,cancelled=false){
  const g=gesture;touches.delete(e.pointerId);pinchDistance=null;dragging=false;
  document.body.classList.remove('viewer-looking');
  if(g?.id===e.pointerId){checkHotspotHover(e.clientX,e.clientY);gesture=null;if(g.moved&&motionEnabled)motionNeedsCalibrate=true;if(!cancelled && !g.moved && Math.hypot(e.clientX-g.x,e.clientY-g.y)<8 && g.hit && hoverHotspot===g.hit && g.hit.userData.route){if(coarsePointer&&typeof navigator.vibrate==='function')navigator.vibrate(10);transitionTo(g.hit.userData.route.to,g.hit.userData.route);}}
  if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);
}
el.addEventListener('pointerup',e=>release(e));
el.addEventListener('pointercancel',e=>release(e,true));
el.addEventListener('lostpointercapture',()=>{gesture=null;dragging=false;document.body.classList.remove('viewer-looking');});
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
  if(!motionEnabled || dragging || (transitioning&&!preparing))return;
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

function zoom(delta){if(!ready || (transitioning&&!preparing))return;camera.fov=THREE.MathUtils.clamp(camera.fov+delta,35,95);camera.updateProjectionMatrix();}
el.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY*0.03);},{passive:false});
previous.onclick=()=>{const back=backTarget();if(back!=null)transitionTo(back);};
document.getElementById('reset').onclick=()=>{setMoreMenuOpen(false);if(ready&&!transitioning)resetView();};
const fullscreen=document.getElementById('fullscreen');
fullscreen.hidden=!document.fullscreenEnabled;
fullscreen.onclick=async()=>{setMoreMenuOpen(false);try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{document.getElementById('status').textContent=t('fullscreenUnavailable');}};
document.addEventListener('fullscreenchange',()=>fullscreen.setAttribute('aria-label',t(document.fullscreenElement?'exitFullScreen':'fullScreen')));
addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('more-open')){e.preventDefault();setMoreMenuOpen(false);moreToggle?.focus();return;}if(e.key==='Escape'&&(mapPanel.classList.contains('open')||infoPanel.classList.contains('open')||searchPanel.classList.contains('open'))){e.preventDefault();const opener=mapPanel.classList.contains('open')?mapToggle:searchPanel.classList.contains('open')?searchToggle:infoToggle;closePanels();if(opener===mapToggle&&object&&!historyTraversal)writeSceneHistory(current);updateControls();opener.focus();return;}if(e.target.closest('button,input,textarea,select,[role="button"]')||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='Backspace'||e.key==='Escape'){const back=backTarget();if(back!=null){e.preventDefault();routeTip.classList.remove('show');routeTip.setAttribute('aria-hidden','true');transitionTo(back);}}
  if(e.key==='Home' && ready && !transitioning){e.preventDefault();resetView();}
  if(e.key==='+' || e.key==='='){e.preventDefault();zoom(-8);}
  if(e.key==='-'){e.preventDefault();zoom(8);}
});
applyLanguage(false);measureLabelBounds();
addEventListener('resize', ()=>{
  renderQuality(!isM7Scene(current));
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);syncPostTargetSize();measureLabelBounds();
});
let lastMobileFrame='';
function animate(now=0){
  requestAnimationFrame(animate);
  if(document.hidden||!ready||mapPanel.classList.contains('open'))return;
  if(coarsePointer){
    // The snapshot covers transitions; redraw a still view only when it changes.
    if(transitioning&&!preparing){lastMobileFrame='';return;}
    const q=camera.quaternion;
    const frame=[q.x,q.y,q.z,q.w,camera.fov,innerWidth,innerHeight,current,dragging].join(',');
    if(frame===lastMobileFrame)return;
    lastMobileFrame=frame;
  }
  updateHotspotVisuals(now);renderPanoramaFrame();updateRouteLabel();
}
document.addEventListener('visibilitychange',()=>{lastMobileFrame='';});
animate();
setCanvasFx(1,0,1);
el.style.cursor='grab';
setInitialProgress(0);
// The campus homepage loads no panorama until a building is chosen.
if(requestedSceneIndex<0){
  writeCampusHistory(true);
  loading.classList.add('done');loading.style.display='none';showCampusHome(false);
}
async function drainBrowserHistory(){
  if(transitioning||historyRunning||!queuedHistory)return;
  const request=queuedHistory;queuedHistory=null;historyRunning=true;historyTraversal=true;
  try{
    if(request.target<0){showCampusHome(false);updateControls();return;}
    const activation={generation:request.generation,history:false,view:request.view};
    const result=object&&request.target!==current?await transitionTo(request.target,null,true,activation):await openPanoramaFromCampus(request.target,activation);
    if(result===false&&request.generation===navigationGeneration&&object)writeSceneHistory(current,true);
  }finally{historyTraversal=false;historyRunning=false;if(queuedHistory)drainBrowserHistory();}
}
function followBrowserHistory(){
  queuedHistory={target:sceneIndexFromUrl(),view:validView(history.state?.view)||viewFromUrl(),generation:++navigationGeneration};
  // Drain only the latest history intent. Obsolete loads cannot commit scene/URL.
  networkPrefetches.get(preparingTarget)?.controller.abort();cancelStalePreloads(preparingTarget);
  drainBrowserHistory();
}
addEventListener('popstate',followBrowserHistory);

const tourWorker='serviceWorker' in navigator
  ? navigator.serviceWorker.register('./service-worker.js')
      .then(()=>navigator.serviceWorker.ready)
      .catch(err=>{console.warn('Offline cache unavailable',err);return null;})
  : Promise.resolve(null);
if(requestedSceneIndex>=0){transitioning=true;preparing=true;preparingTarget=INITIAL_SCENE;
loadCheckpoint(INITIAL_SCENE,null,p=>setInitialProgress(p),{generation:navigationGeneration,replace:true,view:viewFromUrl()}).then(()=>{
  setInitialProgress(1);scheduleLikelyPreload();
  // Backfill the first panorama from HTTP cache if it loaded before worker activation.
  tourWorker.then(registration=>registration?.active?.postMessage({
    type:'CACHE_VIEWED_PANORAMA',url:new URL(TRAVEL_DATA[INITIAL_SCENE],location.href).href
  })).catch(err=>console.warn('Initial panorama cache unavailable',err));
}).catch(err=>{
  if(err.name==='AbortError')return;
  loading.classList.add('done');loading.style.display='none';
  showTravelError(INITIAL_SCENE,{kind:'reload',target:INITIAL_SCENE});
  console.error(err);
}).finally(()=>{transitioning=false;preparing=false;preparingTarget=null;updateControls();if(queuedHistory)drainBrowserHistory();else scheduleLikelyPreload();});}
