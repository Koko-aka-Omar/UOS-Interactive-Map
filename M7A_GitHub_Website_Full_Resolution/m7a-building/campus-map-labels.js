import { artworkPoint, TOUR_FOOTPRINTS } from './campus-geometry.js';
import { createCampusPreview } from './campus-preview.js';
// Code backgrounds match the retained artwork. Labels are independent of outlines.
export const ZONE_COLORS={A:'#413b61',B:'#f46b3e',C:'#315dab',E:'#00bf88',F:'#404040',G:'#4f798b',H:'#8b4f9e'};
export function addCampusArtworkLabels(map,corners,halls,onSelect) {
  const sourceId='campus-tour-footprints',layerIds=['campus-tour-halo','campus-tour-dark','campus-tour-edge','campus-tour-accent','campus-tour-hit'];
  let selectedId=null,hoveredId=null,matchingIds=new Set(halls.map(h=>h.id)),routeIds=new Set(),filtered=false,destroyed=false,language='en';
  const preview=createCampusPreview(map,map.getContainer().closest('#map-panel'),()=>language);
  const features=halls.filter(h=>h.tour?.scene&&TOUR_FOOTPRINTS[h.code]).map(h=>{
    const points=TOUR_FOOTPRINTS[h.code].map(([x,y])=>artworkPoint(x,y,corners));
    return {type:'Feature',id:h.id,properties:{buildingId:h.id},geometry:{type:'Polygon',coordinates:[[...points,points[0]]]}};
  });
  const eligible=id=>!filtered||matchingIds.has(id)||id===selectedId;
  const emphasis=['case',['boolean',['feature-state','muted'],false],0,1];
  const selected=['boolean',['feature-state','selected'],false],hover=['boolean',['feature-state','hover'],false];
  // Camera expressions must be top-level in MapLibre paint properties.
  const opacity=strength=>['interpolate',['linear'],['zoom'],15,0,16,['*',emphasis,strength]];
  function layers() {
    if(destroyed||map.getSource(sourceId))return;
    map.addSource(sourceId,{type:'geojson',data:{type:'FeatureCollection',features}});
    map.addLayer({id:layerIds[0],type:'line',source:sourceId,minzoom:15,paint:{'line-color':'#00b894','line-width':['case',selected,8,hover,6,4],'line-blur':2,'line-opacity':opacity(.25)}});
    map.addLayer({id:layerIds[1],type:'line',source:sourceId,minzoom:15,paint:{'line-color':'#123c3c','line-width':['case',selected,8,hover,7,5],'line-opacity':opacity(1)}});
    map.addLayer({id:layerIds[2],type:'line',source:sourceId,minzoom:15,paint:{'line-color':'#fffdf6','line-width':['case',selected,5,hover,4,3],'line-opacity':opacity(1)}});
    map.addLayer({id:layerIds[3],type:'line',source:sourceId,minzoom:15,paint:{'line-color':['case',selected,'#00584d',hover,'#00c399','#6fe9c1'],'line-width':['case',selected,2.5,1],'line-opacity':opacity(1)}});
    map.addLayer({id:layerIds[4],type:'fill',source:sourceId,minzoom:16,paint:{'fill-color':'#fff','fill-opacity':0}});
    state();
  }
  function state() {
    if(!map.getSource(sourceId))return;
    for(const feature of features)map.setFeatureState({source:sourceId,id:feature.id},{selected:feature.id===selectedId,hover:feature.id===hoveredId,muted:!eligible(feature.id)});
  }
  function setHover(id){if(hoveredId===id)return;const previous=hoveredId;hoveredId=id;if(map.getSource(sourceId))for(const changed of [previous,id])if(changed&&features.some(f=>f.id===changed))map.setFeatureState({source:sourceId,id:changed},{hover:changed===id});const hall=halls.find(h=>h.id===id);if(hall)preview.show(hall);else preview.leave();}
  const entries=halls.filter(h=>h.anchor).map(hall=>{
    const [x,y]=hall.anchor,code=hall.code,outer=document.createElement('button'),inner=document.createElement('span');
    outer.type='button';outer.className='campus-building-target';outer.dataset.buildingId=hall.id;
    inner.className='campus-building-ink';
    if(code) {
      const size=code.length>3?10:code.startsWith('F')||code.startsWith('G')||code.startsWith('H')||['A6','A15','A17','A18','A20','B2','C6','C16'].includes(code)?12:18;
      const mask=document.createElement('span');mask.className='campus-code-mask';
      // Cover the rotated printed code, including its antialiased edges.
      // Keep this behind the label surface so masks cannot obscure tour badges.
      // These three printed codes run horizontally; A18 follows a diagonal wing.
      const horizontal=['A20','B2','C16'].includes(code);
      // E11 has a second printed line (UDHS) beside the rotated code.
      mask.style.width='calc('+(code==='E11'?34:horizontal?code.length*18*.58+10:size+4)+'px * var(--campus-art-scale,1))';
      mask.style.height='calc('+(horizontal?18:code.length*size*.58+10)+'px * var(--campus-art-scale,1))';mask.style.background=ZONE_COLORS[code[0]];
      if(code==='A18')mask.style.transform='translate(-50%,-50%) rotate(45deg)';
      const text=document.createElement('span');text.className='campus-code-text';text.textContent=code;text.dir='ltr';
      text.style.fontSize='calc('+size+'px * var(--campus-art-scale,1))';text.style.background=ZONE_COLORS[code[0]];
      outer.append(mask);inner.append(text);
    }
    if(hall.tour?.scene) {
      const badge=document.createElement('span');badge.className='campus-availability';badge.textContent='360°';inner.append(badge);outer.classList.add('has-tour');
    }
    if(!code){const caption=document.createElement('span');caption.className='campus-place-text';inner.append(caption);}
    const name=document.createElement('span');name.className='campus-selected-name';inner.append(name);
    outer.append(inner);
    const coordinate=artworkPoint(x,y,corners),marker=new maplibregl.Marker({element:outer,anchor:'center'}).setLngLat(coordinate).addTo(map);
    outer.onclick=event=>{
      event.stopPropagation();
      if(!event.detail){onSelect?.([hall]);return;}
      const rect=map.getContainer().getBoundingClientRect(),point={x:event.clientX-rect.left,y:event.clientY-rect.top};
      // Only genuinely overlapping label targets join the chooser; no chain grouping.
      const nearby=entries.filter(item=>{
        if(item.outer.disabled)return false;
        const p=map.project(item.coordinate),box=item.outer.getBoundingClientRect();
        return Math.abs(p.x-point.x)<=box.width/2&&Math.abs(p.y-point.y)<=box.height/2;
      }).map(item=>item.hall);
      onSelect?.(nearby.length>1?nearby:[hall]);
    };
    outer.onpointerenter=event=>{if(event.pointerType==='mouse')setHover(hall.id);};outer.onpointerleave=()=>setHover(null);
    outer.onfocus=()=>{setHover(hall.id);preview.show(hall);};outer.onblur=()=>setHover(null);
    return {hall,outer,coordinate,marker};
  });
  const tourEntries=entries.filter(item=>item.hall.tour?.scene);
  // Stable explicit choosers for labels that genuinely overlap at small scales.
  const clusters=[];
  function clusterAt(index,coordinate){
    if(clusters[index])return clusters[index];
    const outer=document.createElement('button');outer.type='button';outer.className='campus-tour-cluster';outer.hidden=true;
    const marker=new maplibregl.Marker({element:outer,anchor:'center'}).setLngLat(coordinate).addTo(map),cluster={outer,marker,members:[]};
    outer.onclick=event=>{event.stopPropagation();preview.close();onSelect?.(cluster.members);};clusters.push(cluster);return cluster;
  }
  function labelAccess(item){
    const suppressed=routeIds.has(item.hall.id)||!eligible(item.hall.id)||item.outer.classList.contains('is-clustered');
    item.outer.disabled=suppressed;item.outer.tabIndex=suppressed?-1:0;
    item.outer.setAttribute('aria-hidden',String(suppressed));
  }
  function clusterLabels(){
    entries.forEach(item=>item.outer.classList.remove('is-clustered'));clusters.forEach(cluster=>cluster.outer.hidden=true);
    // A selection always has its own marker. Only visible results join a chooser.
    const candidates=(filtered?entries.filter(item=>item.hall.code):tourEntries).filter(item=>eligible(item.hall.id)&&item.hall.id!==selectedId&&!routeIds.has(item.hall.id));
    const unseen=new Set(candidates);let used=0;
    for(const start of candidates){if(!unseen.delete(start))continue;const members=[start];for(let index=0;index<members.length;index++)for(const other of unseen){const a=map.project(members[index].coordinate),b=map.project(other.coordinate);if(Math.abs(a.x-b.x)<70&&Math.abs(a.y-b.y)<32){unseen.delete(other);members.push(other);}}
      if(members.length<2)continue;const cluster=clusterAt(used++,start.coordinate);cluster.members=members.map(item=>item.hall);members.forEach(item=>item.outer.classList.add('is-clustered'));
      cluster.marker.setLngLat([members.reduce((sum,item)=>sum+item.coordinate[0],0)/members.length,members.reduce((sum,item)=>sum+item.coordinate[1],0)/members.length]);cluster.outer.hidden=false;
      const allTours=members.every(item=>item.hall.tour?.scene);
      cluster.outer.textContent=members.length<=2?members.map(item=>item.hall.code).join(' / '):String(members.length)+(language==='ar'?(allTours?' جولات':' مبانٍ'):(allTours?' tours':' buildings'));cluster.outer.setAttribute('aria-label',(language==='ar'?'اختر مبنى: ':'Choose a building: ')+members.map(item=>item.hall.code+' · '+(item.hall.name[language]||item.hall.name.en)).join(', '));cluster.outer.classList.toggle('filter-match',filtered);cluster.outer.classList.toggle('has-tour',allTours);
    }
    // Leave each artwork mask painted, even when its label is filtered or clustered.
    entries.forEach(labelAccess);
  }
  const resize=()=>{
    const left=map.project(corners[3]),right=map.project(corners[0]);
    map.getContainer().style.setProperty('--campus-art-scale',Math.hypot(right.x-left.x,right.y-left.y)/4118);
    map.getContainer().classList.toggle('campus-overview-scale',map.getZoom()<16);
    clusterLabels();
    // Prefer the free side of a selection instead of removing its name at overview.
    for(const item of entries){
      const name=item.outer.querySelector('.campus-selected-name');name.classList.remove('label-above');name.style.setProperty('--campus-name-offset','0px');
      if(item.hall.id!==selectedId)continue;
      const box=name.getBoundingClientRect(),viewport=map.getContainer().getBoundingClientRect(),point=map.project(item.coordinate);
      if(!box.width)continue;
      if(point.x>=0&&point.x<=viewport.width){const shift=box.left<viewport.left+12?viewport.left+12-box.left:box.right>viewport.right-12?viewport.right-12-box.right:0;name.style.setProperty('--campus-name-offset',shift+'px');}
      const placed=name.getBoundingClientRect(),others=[...entries.filter(other=>other!==item&&!other.outer.disabled).map(other=>other.outer),...clusters.filter(cluster=>!cluster.outer.hidden).map(cluster=>cluster.outer)];
      const collision=others.some(outer=>{const r=outer.getBoundingClientRect();return placed.left<r.right&&placed.right>r.left&&placed.top<r.bottom&&placed.bottom>r.top;});name.classList.toggle('label-above',collision);
    }
  };
  const mapClick=event=>{
    const hit=map.getLayer(layerIds[4])?map.queryRenderedFeatures(event.point,{layers:[layerIds[4]]}):[];
    const visibleHit=hit.map(f=>halls.find(h=>h.id===f.properties.buildingId)).filter(hall=>hall&&eligible(hall.id));
    if(visibleHit.length){onSelect?.(visibleHit);return;}
    const nearby=entries.filter(item=>{if(item.outer.disabled)return false;const p=map.project(item.coordinate);return Math.hypot(p.x-event.point.x,p.y-event.point.y)<=12;}).map(item=>item.hall);
    if(nearby.length)onSelect?.(nearby);
  };
  const mapHover=event=>{
    if(!map.getLayer(layerIds[4]))return;
    const hit=map.queryRenderedFeatures(event.point,{layers:[layerIds[4]]}).filter(f=>eligible(f.properties.buildingId));
    setHover(hit[0]?.properties.buildingId||null);map.getCanvas().style.cursor=hit.length?'pointer':'';
  };
  map.on('load',layers);if(map.isStyleLoaded())layers();
  map.on('zoom',resize);map.on('resize',resize);map.on('moveend',resize);map.on('click',mapClick);map.on('mousemove',mapHover);resize();
  return {
    update({selectedId:next,matchingIds:matches,filtered:active,routeIds:nextRouteIds=new Set(),language:nextLanguage='en'}) {
      selectedId=next;matchingIds=matches;filtered=active;routeIds=nextRouteIds;language=nextLanguage;
      if(hoveredId&&!eligible(hoveredId)){setHover(null);preview.close();}
      for(const {hall,outer}of entries) {
        outer.classList.toggle('is-selected',hall.id===selectedId);
        outer.classList.toggle('filter-match',filtered&&matchingIds.has(hall.id));
        outer.classList.toggle('filter-other',filtered&&!matchingIds.has(hall.id));
        outer.classList.toggle('route-endpoint',routeIds.has(hall.id));
        const label=(hall.code?hall.code+' · ':'')+(hall.name[language]||hall.name.en);
        outer.querySelector('.campus-selected-name').textContent=label;
        const caption=outer.querySelector('.campus-place-text');if(caption)caption.textContent=hall.name[language]||hall.name.en;
        outer.title=label;outer.setAttribute('aria-label',label+(hall.tour?.scene?' · 360°':''));
        outer.setAttribute('aria-pressed',String(hall.id===selectedId));
      }
      state();resize();
    },
    destroy() {
      destroyed=true;
      map.off('load',layers);map.off('zoom',resize);map.off('resize',resize);map.off('moveend',resize);map.off('click',mapClick);map.off('mousemove',mapHover);preview.destroy();
      for(const {marker}of entries)marker.remove();
      for(const {marker}of clusters)marker.remove();
      for(const id of [...layerIds].reverse())if(map.getLayer(id))map.removeLayer(id);
      if(map.getSource(sourceId))map.removeSource(sourceId);
    }
  };
}
