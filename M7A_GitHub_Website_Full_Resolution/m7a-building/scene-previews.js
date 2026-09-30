import { SCENE_PREVIEWS } from './scene-previews.generated.js';
import { LOCATIONS, TOUR_AREAS, mediaForScene } from './tour-routes.js';
const covers={m7:'entrance',e2:'theater-auditorium-center',e3:'library-study-024',a4:'mens-hall-079',c4:'c4-004','al-zahra':'al-zahra-004','student-forums':'student-forums-072'};
export function previewForScene(id){const preview=SCENE_PREVIEWS[id];return preview&&preview.source.file===mediaForScene(id)?.file?{...preview,url:preview.path+'?rev='+preview.imageRevision}:null;}
export function coverForBuilding(building){return previewForScene(covers[building.legacyHallId]||building.tour?.scene);}
export function scenesForBuilding(building){const area=TOUR_AREAS.find(area=>area.hallId===building.legacyHallId);return area?LOCATIONS.slice(area.start,area.end+1):[];}
