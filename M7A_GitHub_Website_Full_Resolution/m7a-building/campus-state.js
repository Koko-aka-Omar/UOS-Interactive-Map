import { ARTWORK_VERSION } from './campus-geometry.js';
const KEY='hallv3.campus-state.v1';
export const SHEET_SNAPS = ['peek', 'half', 'expanded'];
export function sanitizeCampusState(value,halls,categories){
  if(!value||![1,2].includes(value.version)||value.artwork!==ARTWORK_VERSION)return null;
  const hall=halls.find(item=>item.id===value.selectedId);
  const finite=number=>typeof number==='number'&&Number.isFinite(number);
  const camera=value.camera;
  const validCamera=camera&&Array.isArray(camera.center)&&camera.center.length===2&&camera.center.every(finite)&&Math.abs(camera.center[0])<=180&&Math.abs(camera.center[1])<=90&&finite(camera.zoom)&&camera.zoom>=0&&camera.zoom<=24&&finite(camera.bearing)&&finite(camera.pitch)&&camera.pitch>=0&&camera.pitch<=85;
  const padding={};
  for(const side of ['top','bottom','left','right'])padding[side]=finite(camera?.padding?.[side])&&camera.padding[side]>=0?camera.padding[side]:0;
  const scroll = number => finite(number)&&number>=0?number:0;
  const sections = {};
  for (const item of halls) {
    const open = value.sections?.[item.id];
    if (open && typeof open === 'object') sections[item.id] = {inside:open.inside===true,sources:open.sources===true};
  }
  return {version:2,artwork:ARTWORK_VERSION,camera:validCamera?{center:[...camera.center],zoom:camera.zoom,bearing:camera.bearing,pitch:camera.pitch,padding}:null,
    activeCategory:typeof value.activeCategory==='string'&&Object.hasOwn(categories,value.activeCategory)?value.activeCategory:null,toursOnly:value.toursOnly===true,
    selectedId:hall?.id||null,roomId:hall?.rooms?.some(room=>room.id===value.roomId)?value.roomId:null,
    query:typeof value.query==='string'?value.query.slice(0,300):'',
    mode:hall&&(value.mode==='details'||(value.version===1&&!value.mode))?'details':'results',
    snap:SHEET_SNAPS.includes(value.snap)?value.snap:value.collapsed?'peek':value.sheetExpanded?'expanded':value.version===1?'half':'peek',
    resultsScroll:scroll(value.resultsScroll??(hall?0:value.scroll)),detailScroll:scroll(value.detailScroll??(hall?value.scroll:0)),sections};
}
export function createCampusStateStore(halls,categories,storage=()=>globalThis.sessionStorage){
  let memory=null;
  return {
    read(){if(memory)return sanitizeCampusState(memory,halls,categories);try{return sanitizeCampusState(JSON.parse(storage().getItem(KEY)),halls,categories);}catch{return null;}},
    write(value){memory=sanitizeCampusState(value,halls,categories);try{storage().setItem(KEY,JSON.stringify(memory));}catch{}return memory;}
  };
}
export function matchesFilters(hall,activeCategory=null,toursOnly=false){
  return (!activeCategory||hall.categories?.includes(activeCategory))&&(!toursOnly||Boolean(hall.tour?.scene));
}
