const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');

const repoRoot=path.join(__dirname,'..');
const root=path.join(repoRoot,'M7A_GitHub_Website_Full_Resolution','m7a-building');
const fail=[];
const pass=[];
const check=(condition,message)=>{(condition?pass:fail).push(message);};
const sourceOnly=process.argv.includes('--source-only');
const exists=file=>{
  if(fs.existsSync(file))return true;
  if(!sourceOnly)return false;
  const rel=path.relative(repoRoot,file).split(path.sep).join('/');
  try{return /^[a-f0-9]{40}$/.test(execFileSync('git',['rev-parse','HEAD:'+rel],{cwd:repoRoot,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim());}catch{return false;}
};

function loadExports(file,names){
  let source=fs.readFileSync(file,'utf8');
  source=source.replace(/^import .*$/gm,'').replace(/\bexport\s+(?=(const|let|var|function|class)\b)/g,'');
  source+='\nmodule.exports={'+names.join(',')+'};';
  const sandbox={module:{exports:{}},exports:{},console};
  vm.runInNewContext(source,sandbox,{filename:file});
  return sandbox.module.exports;
}
function routeFiles(){
  const source=fs.readFileSync(path.join(root,'tour-routes.js'),'utf8');
  return [...source.matchAll(/from\s+['"]\.\/routes\/([^'"]+\.js)['"]/g)].map(match=>match[1]);
}
function loadManifest(){
  const sandbox={globalThis:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'tour-assets.generated.js'),'utf8'),sandbox);
  return sandbox.globalThis.UOS_TOUR_ASSETS;
}
const routeNames=routeFiles();
const routeParts=routeNames.map(file=>loadExports(path.join(root,'routes',file),['PANORAMAS','VISUAL_CALIBRATION','LOCATIONS','LOCATION_AR']));
const PANORAMAS=routeParts.flatMap(part=>part.PANORAMAS);
const LOCATIONS=routeParts.flatMap(part=>part.LOCATIONS);
const LOCATION_AR=routeParts.flatMap(part=>part.LOCATION_AR);
const halls=loadExports(path.join(root,'halls.js'),['HALLS']).HALLS;
const i18n=loadExports(path.join(root,'tour-i18n.js'),['I18N']).I18N;
const manifest=loadManifest();

check(PANORAMAS.length===LOCATIONS.length,'panorama/location counts match ('+PANORAMAS.length+')');
check(LOCATIONS.length===LOCATION_AR.length,'English/Arabic location counts match ('+LOCATIONS.length+')');
check(LOCATIONS.length===81,'expected 81 current tour checkpoints across the six registered areas');

const ids=new Set();
for(let i=0;i<LOCATIONS.length;i++){
  const loc=LOCATIONS[i];
  check(typeof loc.id==='string'&&loc.id.length>0,'scene '+i+' has an ID');
  check(!ids.has(loc.id),'scene ID is unique: '+loc.id);
  ids.add(loc.id);
  check(typeof loc.area==='string'&&typeof loc.name==='string','scene '+loc.id+' has area/name');
  check(Array.isArray(loc.routes),'scene '+loc.id+' has routes array');
  if(loc.back!=null)check(Number.isInteger(loc.back)&&Boolean(LOCATIONS[loc.back]),'back target valid: '+loc.id);
  for(const route of loc.routes||[]){
    check(Number.isInteger(route.to)&&Boolean(LOCATIONS[route.to]),'route target valid: '+loc.id+' -> '+route.to);
    check(Number.isFinite(route.angle),'route angle valid: '+loc.id+' -> '+route.to);
    for(const key of ['arrowAngle','arrivalAngle','departureAngle','hotspotAngle','hotspotDistance','hotspotHeight','arrivalPitch']){
      if(route[key]!=null)check(Number.isFinite(route[key]),key+' valid: '+loc.id+' -> '+route.to);
    }
    const reverse=LOCATIONS[route.to]?.routes?.some(candidate=>candidate.to===i);
    check(Boolean(reverse),'reverse route exists: '+route.to+' -> '+i);
  }
}

const mensPartIndex=routeNames.indexOf('mens-hall.js');
if(mensPartIndex>=0){
  const start=routeParts.slice(0,mensPartIndex).reduce((sum,part)=>sum+part.LOCATIONS.length,0);
  const count=routeParts[mensPartIndex].LOCATIONS.length;
  for(let i=start;i<start+count;i++){
    const expected=[];
    if(i>start)expected.push(i-1);
    if(i<start+count-1)expected.push(i+1);
    const actual=LOCATIONS[i].routes.map(route=>route.to).sort((a,b)=>a-b);
    check(JSON.stringify(actual)===JSON.stringify(expected),"Men's Hall sequence exact: "+LOCATIONS[i].id);
  }
}

for(const part of routeParts){
  check(part.VISUAL_CALIBRATION.length<=part.PANORAMAS.length,'visual calibration does not exceed area scene count');
  for(const gain of part.VISUAL_CALIBRATION){
    check(Array.isArray(gain)&&gain.length===3&&gain.every(Number.isFinite),'visual calibration entry is RGB triple');
  }
}

const expectedFiles=[...PANORAMAS].sort();
if(!sourceOnly){
  const desktopFiles=fs.readdirSync(path.join(root,'assets')).filter(file=>file.endsWith('.glb')).sort();
  const mobileFiles=fs.readdirSync(path.join(root,'assets-mobile')).filter(file=>file.endsWith('.glb')).sort();
  check(JSON.stringify(desktopFiles)===JSON.stringify(expectedFiles),'no missing/orphan desktop GLB assets');
  check(JSON.stringify(mobileFiles)===JSON.stringify(expectedFiles),'no missing/orphan mobile GLB assets');
}else for(const file of expectedFiles){
  check(exists(path.join(root,'assets',file)),'tracked desktop reference exists: '+file);
  check(exists(path.join(root,'assets-mobile',file)),'tracked mobile reference exists: '+file);
}

const hallIds=new Set();
const roomIds=new Set();
for(const hall of halls){
  check(!hallIds.has(hall.id),'hall ID is unique: '+hall.id);
  hallIds.add(hall.id);
  if(hall.thumbnail)check(exists(path.join(root,hall.thumbnail.replace(/^\.\//,''))),'thumbnail exists: '+hall.code);
  if(hall.tour?.scene)check(ids.has(hall.tour.scene),'hall tour scene exists: '+hall.code+' -> '+hall.tour.scene);
  for(const room of hall.rooms||[]){
    check(!roomIds.has(room.id),'room ID is unique: '+room.id);
    roomIds.add(room.id);
    if(room.tour?.scene)check(ids.has(room.tour.scene),'room tour scene exists: '+room.id+' -> '+room.tour.scene);
  }
}

const enKeys=Object.keys(i18n.en).sort();
const arKeys=Object.keys(i18n.ar).sort();
check(JSON.stringify(enKeys)===JSON.stringify(arKeys),'English/Arabic UI key sets match ('+enKeys.length+')');

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const id of ['app','campus-map','campus-home-intro','campus-home-area-count','campus-home-view-count','tour-search-panel','info-panel','more-menu','loading']){
  check(index.includes('id="'+id+'"'),'required UI element exists: #'+id);
}
for(const match of index.matchAll(/(?:src|href)="(\.\/[^"?]+)(?:\?[^"]*)?"/g)){
  const rel=match[1].replace(/^\.\//,'');
  check(exists(path.join(root,rel)),'referenced local file exists: '+rel);
}

check(manifest.schema===1,'asset manifest schema is supported');
check(JSON.stringify(manifest.panoramaFiles)===JSON.stringify(PANORAMAS),'generated panorama list matches route data');
check(JSON.stringify(manifest.routeModules)===JSON.stringify(routeNames.map(file=>'./routes/'+file)),'generated route-module list matches route registry');
for(const file of manifest.coreAssets){
  const rel=file.replace(/^\.\//,'');
  check(exists(path.join(root,rel)),'manifest core asset exists: '+rel);
}
for(const file of PANORAMAS){
  check(Boolean(manifest.panoramaRevisions.desktop[file]),'desktop revision exists: '+file);
  check(Boolean(manifest.panoramaRevisions.mobile[file]),'mobile revision exists: '+file);
}
for(const file of ['index.html','tour.js','tour-routes.js','service-worker.js']){
  const source=fs.readFileSync(path.join(root,file),'utf8');
  check(!source.includes('?v='),'no manual cache-busting version strings in '+file);
}
const worker=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
check(worker.includes("importScripts('./tour-assets.generated.js')"),'service worker loads generated asset manifest');
check(!worker.includes('PANORAMA_NAMES'),'service worker has no duplicated manual panorama list');
const tour=fs.readFileSync(path.join(root,'tour.js'),'utf8');
check(tour.includes("from './tour-renderer.js'"),'renderer is split into its own module');
check(tour.includes('TOUR_AREAS')&&tour.includes('areaForScene'),'viewer uses data-driven area registry');

if(fail.length){
  console.error('\nTOUR QA FAILED\n');
  fail.forEach(item=>console.error('FAIL',item));
  console.error('\n'+pass.length+' checks passed; '+fail.length+' failed.');
  process.exit(1);
}
console.log('TOUR QA PASSED — '+pass.length+' checks'+(sourceOnly?' (source-only; tracked asset references, no asset-directory/orphan scan)':''));
