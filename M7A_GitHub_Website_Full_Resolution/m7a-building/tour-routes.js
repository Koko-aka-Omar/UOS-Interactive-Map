// Area-specific navigation lives in ./routes/. This file is the single ordered area registry.
import * as M7A from './routes/m7a.js';
import * as THEATER from './routes/theater.js';
import * as LIBRARY from './routes/library.js';
import * as MENS_HALL from './routes/mens-hall.js';
import * as C4 from './routes/c4.js';
import * as AL_ZAHRA from './routes/al-zahra.js';
import * as STUDENT_FORUMS from './routes/student-forums.js';

const AREA_SOURCES=[
  {hallId:'m7',module:M7A},
  {hallId:'e2',module:THEATER},
  {hallId:'e3',module:LIBRARY},
  {hallId:'a4',module:MENS_HALL},
  {hallId:'c4',module:C4},
  {hallId:'al-zahra',module:AL_ZAHRA},
  {hallId:'student-forums',module:STUDENT_FORUMS}
];

let sceneOffset=0;
export const TOUR_AREAS=AREA_SOURCES.map(({hallId,module})=>{
  const start=sceneOffset;
  const count=module.LOCATIONS.length;
  sceneOffset+=count;
  return Object.freeze({hallId,start,end:start+count-1,count,entryScene:module.LOCATIONS[0]?.id??null});
});

export function areaForScene(sceneIndex){
  return TOUR_AREAS.find(area=>sceneIndex>=area.start&&sceneIndex<=area.end)??null;
}

export const PANORAMA_FILES=AREA_SOURCES.flatMap(({module})=>module.PANORAMAS);
export const VISUAL_CALIBRATION=AREA_SOURCES.flatMap(({module})=>module.VISUAL_CALIBRATION);
export const LOCATIONS=AREA_SOURCES.flatMap(({module})=>module.LOCATIONS);
export const LOCATION_AR=AREA_SOURCES.flatMap(({module})=>module.LOCATION_AR);

// Never infer a media filename from a semantic scene ID (branches may be remapped).
export function mediaForScene(sceneId){
  const index=LOCATIONS.findIndex(scene=>scene.id===sceneId),file=PANORAMA_FILES[index];
  return file?{file,desktop:'./assets/'+file,mobile:'./assets-mobile/'+file,jpeg:'./panoramas-mobile/'+file.replace(/\.glb$/,'.jpg')}:null;
}

export function getHotspotStyle(sceneIndex,route){
  const from=LOCATIONS[sceneIndex]?.id;
  const to=LOCATIONS[route.to]?.id;
  const custom=THEATER.HOTSPOT_STYLE[from+'->'+to];
  if(custom)return custom;
  const auditoriumStair=route.kind==='stairs'&&areaForScene(sceneIndex)?.hallId==='e2';
  return auditoriumStair?[1.85,.78]:[route.kind==='stairs'?1.08:1.02,.64];
}
