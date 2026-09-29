import { artworkPoint, TOUR_FOOTPRINTS } from './campus-geometry.js';
// Code backgrounds match the retained artwork. Labels are independent of outlines.
const colors={A:'#413b61',B:'#f46b3e',C:'#315dab',E:'#00bf88',F:'#404040',G:'#4f798b',H:'#8b4f9e'};
export function addCampusArtworkLabels(map,corners,halls,onSelect) {
  const sourceId='campus-tour-footprints',layerIds=['campus-tour-halo','campus-tour-dark','campus-tour-edge','campus-tour-accent','campus-tour-hit'];
  let selectedId=null,hoveredId=null,matchingIds=new Set(halls.map(h=>h.id)),filtered=false,destroyed=false;
  const features=halls.filter(h=>h.tour?.scene&&TOUR_FOOTPRINTS[h.code]).map(h=>{
    const points=TOUR_FOOTPRINTS[h.code].map(([x,y])=>artworkPoint(x,y,corners));
    return {type:'Feature',id:h.id,properties:{buildingId:h.id},geometry:{type:'Polygon',coordinates:[[...points,points[0]]]}};
  });
  const emphasis=['case',['boolean',['feature-state','selected'],false],1,['boolean',['feature-state','muted'],false],.3,1];
  const selected=['boolean',['feature-state','selected'],false],hover=['boolean',['feature-state','hover'],false];
  // Camera expressions must be top-level in MapLibre paint properties.
  const opacity=strength=>['interpolate',['linear'],['zoom'],15,0,16,['*',emphasis,strength]];
  function layers() {
    if(destroyed||map.getSource(sourceId))return;
    map.addSource(sourceId,{type:'geojson',data:{type:'FeatureCollection',features}});
    map.addLayer({id:layerIds[0],type:'line',source:sourceId,minzoom:15,paint:{'line-color':'#00b894','line-width':['case',selected,14,hover,12,10],'line-blur':3,'line-opacity':opacity(.42)}});
    map.addLayer({id:layerIds[1],type:'line',source:sourceId,minzoom:15,paint:{'line-color':'#123c3c','line-width':['case',selected,8,hover,7,5],'line-opacity':opacity(1)}});
    map.addLayer({id:layerIds[2],type:'line',source:sourceId,minzoom:15,paint:{'line-color':'#fffdf6','line-width':['case',selected,5,hover,4,3],'line-opacity':opacity(1)}});
    map.addLayer({id:layerIds[3],type:'line',source:sourceId,minzoom:15,paint:{'line-color':['case',selected,'#00584d',hover,'#00c399','#6fe9c1'],'line-width':['case',selected,2.5,1],'line-opacity':opacity(1)}});
    map.addLayer({id:layerIds[4],type:'fill',source:sourceId,minzoom:16,paint:{'fill-color':'#fff','fill-opacity':0}});
    state();
  }
  function state() {
    if(!map.getSource(sourceId))return;
    for(const feature of features)map.setFeatureState({source:sourceId,id:feature.id},{selected:feature.id===selectedId,hover:feature.id===hoveredId,muted:filtered&&!matchingIds.has(feature.id)});
  }
  const entries=halls.filter(h=>h.anchor).map(hall=>{
    const [x,y]=hall.anchor,code=hall.code,outer=document.createElement('button'),inner=document.createElement('span');
    outer.type='button';outer.className='campus-building-target';outer.dataset.buildingId=hall.id;
    inner.className='campus-building-ink';
    if(code) {
      const size=code.length>3?10:code.startsWith('F')||code.startsWith('G')||code.startsWith('H')||['A6','A15','A17','A18','A20','B2','C6','C16'].includes(code)?12:18;
      const mask=document.createElement('span');mask.className='campus-code-mask';
      mask.style.width='calc('+(size+3)+'px * var(--campus-art-scale,1))';
      mask.style.height='calc('+(code.length*size*.58+4)+'px * var(--campus-art-scale,1))';mask.style.background=colors[code[0]];
      const text=document.createElement('span');text.className='campus-code-text';text.textContent=code;text.dir='ltr';
      text.style.fontSize='calc('+size+'px * var(--campus-art-scale,1))';text.style.background=colors[code[0]];
      inner.append(mask,text);
    }
    if(hall.tour?.scene) {
      const badge=document.createElement('span');badge.className='campus-availability';badge.textContent='360°';inner.append(badge);outer.classList.add('has-tour');
    }
    outer.append(inner);
    const coordinate=artworkPoint(x,y,corners),marker=new maplibregl.Marker({element:outer,anchor:'center'}).setLngLat(coordinate).addTo(map);
    outer.onclick=event=>{
      event.stopPropagation();
      if(!event.detail){onSelect?.([hall]);return;}
      const rect=map.getContainer().getBoundingClientRect(),point={x:event.clientX-rect.left,y:event.clientY-rect.top};
      // Only genuinely overlapping label targets join the chooser; no chain grouping.
      const nearby=entries.filter(item=>{
        const p=map.project(item.coordinate),box=item.outer.getBoundingClientRect();
        return Math.abs(p.x-point.x)<=box.width/2&&Math.abs(p.y-point.y)<=box.height/2;
      }).map(item=>item.hall);
      onSelect?.(nearby.length>1?nearby:[hall]);
    };
    outer.onpointerenter=()=>{hoveredId=hall.id;state();};outer.onpointerleave=()=>{hoveredId=null;state();};
    outer.onfocus=()=>{hoveredId=hall.id;state();};outer.onblur=()=>{hoveredId=null;state();};
    return {hall,outer,coordinate,marker};
  });
  const resize=()=>{
    const left=map.project(corners[3]),right=map.project(corners[0]);
    map.getContainer().style.setProperty('--campus-art-scale',Math.hypot(right.x-left.x,right.y-left.y)/4118);
    map.getContainer().classList.toggle('campus-overview-scale',map.getZoom()<16);
  };
  const mapClick=event=>{
    const hit=map.getLayer(layerIds[4])?map.queryRenderedFeatures(event.point,{layers:[layerIds[4]]}):[];
    if(hit.length){onSelect?.(hit.map(f=>halls.find(h=>h.id===f.properties.buildingId)).filter(Boolean));return;}
    const nearby=entries.filter(item=>{const p=map.project(item.coordinate);return Math.hypot(p.x-event.point.x,p.y-event.point.y)<=12;}).map(item=>item.hall);
    if(nearby.length)onSelect?.(nearby);
  };
  const mapHover=event=>{
    if(!map.getLayer(layerIds[4]))return;
    const hit=map.queryRenderedFeatures(event.point,{layers:[layerIds[4]]});
    hoveredId=hit[0]?.properties.buildingId||null;state();map.getCanvas().style.cursor=hit.length?'pointer':'';
  };
  map.on('load',layers);if(map.isStyleLoaded())layers();
  map.on('zoom',resize);map.on('resize',resize);map.on('click',mapClick);map.on('mousemove',mapHover);resize();
  return {
    update({selectedId:next,matchingIds:matches,filtered:active,language='en'}) {
      selectedId=next;matchingIds=matches;filtered=active;
      for(const {hall,outer}of entries) {
        outer.classList.toggle('is-selected',hall.id===selectedId);
        outer.classList.toggle('filter-match',filtered&&matchingIds.has(hall.id));
        outer.classList.toggle('filter-other',filtered&&!matchingIds.has(hall.id));
        const label=(hall.code?hall.code+' · ':'')+(hall.name[language]||hall.name.en);
        outer.title=label;outer.setAttribute('aria-label',label+(hall.tour?.scene?' · 360°':''));
        outer.setAttribute('aria-pressed',String(hall.id===selectedId));
      }
      state();
    },
    destroy() {
      destroyed=true;
      map.off('load',layers);map.off('zoom',resize);map.off('resize',resize);map.off('click',mapClick);map.off('mousemove',mapHover);
      for(const {marker}of entries)marker.remove();
      for(const id of [...layerIds].reverse())if(map.getLayer(id))map.removeLayer(id);
      if(map.getSource(sourceId))map.removeSource(sourceId);
    }
  };
}
