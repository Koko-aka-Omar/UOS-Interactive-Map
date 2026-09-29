import { HALLS } from './halls.js';
import { LOCATIONS } from './tour-routes.js';
import { BUILDING_RECORDS, SUPPLEMENTAL_PLACES, TOUR_BINDINGS } from './campus-inventory.js';
import { BUILDING_ANCHORS, PLACE_ANCHORS, artworkPoint } from './campus-geometry.js';

const scenes=new Set(LOCATIONS.map(scene=>scene.id));
const validTarget=target=>target?.scene && scenes.has(target.scene) ? target : null;
export const CAMPUS_BUILDINGS=[...BUILDING_RECORDS,...SUPPLEMENTAL_PLACES].map(record=>{
  const binding=TOUR_BINDINGS.find(item=>item.buildingId===record.id);
  const legacy=HALLS.find(hall=>hall.id===binding?.existingHallId);
  const anchor=BUILDING_ANCHORS[record.code] || PLACE_ANCHORS[record.id];
  // Checkpoints remain navigation choices, not newly invented official rooms.
  const checkpointArea=legacy?.id==='c4'||legacy?.id==='al-zahra';
  const rooms=(legacy?.rooms||[]).map(room=>({...room,tour:validTarget(room.tour)}));
  return {...record,legacyHallId:legacy?.id,aliases:[...(record.aliases||[]),...(legacy?[legacy.code,legacy.name.en,legacy.name.ar,binding.name.en,binding.name.ar]:[])],
    mapCoordinates:anchor?artworkPoint(...anchor):null,anchor,
    coordinates:legacy?.coordinates,thumbnail:legacy?.thumbnail,
    tour:validTarget(legacy?.tour),tourName:binding?.name,rooms,
    checkpointArea};
});
export function buildingForLegacyHall(id){return CAMPUS_BUILDINGS.find(building=>building.legacyHallId===id);}
