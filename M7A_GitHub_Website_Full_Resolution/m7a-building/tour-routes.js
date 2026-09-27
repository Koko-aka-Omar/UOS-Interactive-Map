// Thin compatibility layer: area-specific navigation lives in ./routes/.
import * as M7A from './routes/m7a.js';
import * as THEATER from './routes/theater.js?v=20260927-3';
import * as LIBRARY from './routes/library.js?v=20260927-3';

export const PANORAMA_FILES=[
  ...M7A.PANORAMAS,
  ...THEATER.PANORAMAS,
  ...LIBRARY.PANORAMAS
];

export const VISUAL_CALIBRATION=[
  ...M7A.VISUAL_CALIBRATION,
  ...THEATER.VISUAL_CALIBRATION,
  ...LIBRARY.VISUAL_CALIBRATION
];

export const LOCATIONS=[
  ...M7A.LOCATIONS,
  ...THEATER.LOCATIONS,
  ...LIBRARY.LOCATIONS
];

export const LOCATION_AR=[
  ...M7A.LOCATION_AR,
  ...THEATER.LOCATION_AR,
  ...LIBRARY.LOCATION_AR
];

export function getHotspotStyle(sceneIndex,route){
  const from=LOCATIONS[sceneIndex]?.id;
  const to=LOCATIONS[route.to]?.id;
  const custom=THEATER.HOTSPOT_STYLE[from+'->'+to];
  if(custom)return custom;
  const auditoriumStair=route.kind==='stairs'&&sceneIndex>=10&&sceneIndex<=22;
  return auditoriumStair?[1.85,.78]:[route.kind==='stairs'?1.08:1.02,.64];
}
