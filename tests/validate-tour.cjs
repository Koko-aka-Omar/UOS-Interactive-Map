const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const repoRoot=path.join(__dirname,'..');
const root=path.join(repoRoot,'M7A_GitHub_Website_Full_Resolution','m7a-building');
const fail=[];
const pass=[];
const check=(condition,message)=>{(condition?pass:fail).push(message);};

function loadExports(file,names){
  let source=fs.readFileSync(file,'utf8');
  source=source
    .replace(/^import .*$/gm,'')
    .replace(/\bexport\s+(?=(const|let|var|function|class)\b)/g,'');
  source+='\nmodule.exports={'+names.join(',')+'};';
  const sandbox={module:{exports:{}},exports:{},console};
  vm.runInNewContext(source,sandbox,{filename:file});
  return sandbox.module.exports;
}

const routeFiles=['m7a.js','theater.js','library.js','mens-hall.js'];
const routeParts=routeFiles.map(file=>loadExports(
  path.join(root,'routes',file),
  ['PANORAMAS','VISUAL_CALIBRATION','LOCATIONS','LOCATION_AR']
));
const PANORAMAS=routeParts.flatMap(part=>part.PANORAMAS);
const LOCATIONS=routeParts.flatMap(part=>part.LOCATIONS);
const LOCATION_AR=routeParts.flatMap(part=>part.LOCATION_AR);
const halls=loadExports(path.join(root,'halls.js'),['HALLS']).HALLS;
const i18n=loadExports(path.join(root,'tour-i18n.js'),['I18N']).I18N;

check(PANORAMAS.length===LOCATIONS.length,'panorama/location counts match ('+PANORAMAS.length+')');
check(LOCATIONS.length===LOCATION_AR.length,'English/Arabic location counts match ('+LOCATIONS.length+')');
check(LOCATIONS.length===58,'expected 58 tour checkpoints');

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
    const reverse=LOCATIONS[route.to]&&LOCATIONS[route.to].routes&&LOCATIONS[route.to].routes.some(candidate=>candidate.to===i);
    check(Boolean(reverse),'reverse route exists: '+route.to+' -> '+i);
  }
}

for(const part of routeParts){
  check(part.VISUAL_CALIBRATION.length<=part.PANORAMAS.length,'visual calibration does not exceed area scene count');
  for(const gain of part.VISUAL_CALIBRATION){
    check(Array.isArray(gain)&&gain.length===3&&gain.every(Number.isFinite),'visual calibration entry is RGB triple');
  }
}

for(const panorama of PANORAMAS){
  check(fs.existsSync(path.join(root,'assets',panorama)),'desktop panorama exists: '+panorama);
  check(fs.existsSync(path.join(root,'assets-mobile',panorama)),'mobile panorama exists: '+panorama);
}

const hallIds=new Set();
const roomIds=new Set();
for(const hall of halls){
  check(!hallIds.has(hall.id),'hall ID is unique: '+hall.id);
  hallIds.add(hall.id);
  if(hall.thumbnail){
    check(fs.existsSync(path.join(root,hall.thumbnail.replace(/^\.\//,''))),'thumbnail exists: '+hall.code);
  }
  if(hall.tour&&hall.tour.scene)check(ids.has(hall.tour.scene),'hall tour scene exists: '+hall.code+' -> '+hall.tour.scene);
  for(const room of hall.rooms||[]){
    check(!roomIds.has(room.id),'room ID is unique: '+room.id);
    roomIds.add(room.id);
    if(room.tour&&room.tour.scene)check(ids.has(room.tour.scene),'room tour scene exists: '+room.id+' -> '+room.tour.scene);
  }
}

const enKeys=Object.keys(i18n.en).sort();
const arKeys=Object.keys(i18n.ar).sort();
check(JSON.stringify(enKeys)===JSON.stringify(arKeys),'English/Arabic UI key sets match ('+enKeys.length+')');

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const id of ['app','campus-map','campus-home-intro','tour-search-panel','info-panel','more-menu','loading']){
  check(index.includes('id="'+id+'"'),'required UI element exists: #'+id);
}
for(const match of index.matchAll(/(?:src|href)="(\.\/[^"?]+)(?:\?[^"]*)?"/g)){
  const rel=match[1].replace(/^\.\//,'');
  check(fs.existsSync(path.join(root,rel)),'referenced local file exists: '+rel);
}

if(fail.length){
  console.error('\nTOUR QA FAILED\n');
  fail.forEach(item=>console.error('FAIL',item));
  console.error('\n'+pass.length+' checks passed; '+fail.length+' failed.');
  process.exit(1);
}
console.log('TOUR QA PASSED — '+pass.length+' checks');
