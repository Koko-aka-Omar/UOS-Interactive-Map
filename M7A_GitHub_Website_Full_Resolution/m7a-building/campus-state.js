import { ARTWORK_VERSION } from './campus-geometry.js';
const KEY='hallv3.campus-state.v1';
export function sanitizeCampusState(value,halls,categories){
  if(!value||value.version!==1||value.artwork!==ARTWORK_VERSION)return null;
  const hall=halls.find(item=>item.id===value.selectedId);
  const finite=number=>typeof number==='number'&&Number.isFinite(number);
  const camera=value.camera;
  const validCamera=camera&&Array.isArray(camera.center)&&camera.center.length===2&&camera.center.every(finite)&&Math.abs(camera.center[0])<=180&&Math.abs(camera.center[1])<=90&&finite(camera.zoom)&&camera.zoom>=0&&camera.zoom<=24&&finite(camera.bearing)&&finite(camera.pitch)&&camera.pitch>=0&&camera.pitch<=85;
  const padding={};
  for(const side of ['top','bottom','left','right'])padding[side]=finite(camera?.padding?.[side])&&camera.padding[side]>=0?camera.padding[side]:0;
  return {version:1,artwork:ARTWORK_VERSION,camera:validCamera?{center:[...camera.center],zoom:camera.zoom,bearing:camera.bearing,pitch:camera.pitch,padding}:null,
    activeCategory:typeof value.activeCategory==='string'&&Object.hasOwn(categories,value.activeCategory)?value.activeCategory:null,toursOnly:value.toursOnly===true,
    selectedId:hall?.id||null,roomId:hall?.rooms?.some(room=>room.id===value.roomId)?value.roomId:null,
    query:typeof value.query==='string'?value.query.slice(0,300):'',collapsed:value.collapsed===true,sheetExpanded:value.sheetExpanded===true,
    scroll:finite(value.scroll)&&value.scroll>=0?value.scroll:0};
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
