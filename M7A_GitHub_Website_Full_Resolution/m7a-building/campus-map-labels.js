import { artworkPoint } from './campus-geometry.js';
// Colours sampled from the unchanged artwork. Parking/context artwork is untouched.
const colors={A:'#413b61',B:'#f46b3e',C:'#315dab',E:'#00bf88',F:'#404040',G:'#4f798b',H:'#8b4f9e'};
export function addCampusArtworkLabels(map,corners,halls,onSelect){
  const entries=halls.filter(hall=>hall.anchor).map(hall=>{
    const [x,y]=hall.anchor,code=hall.code;
    const outer=document.createElement('button');
    outer.type='button';outer.className='campus-building-target';
    const inner=document.createElement('span');inner.className='campus-building-ink';
    if(code){
      const size=code.length>3?10:code.startsWith('F')||code.startsWith('G')||code.startsWith('H')||['A6','A15','A17','A18','A20','B2','C6','C16'].includes(code)?12:18;
      const mask=document.createElement('span');mask.className='campus-code-mask';
      mask.style.width=`calc(${size+3}px * var(--campus-art-scale,1))`;
      mask.style.height=`calc(${code.length*size*.58+4}px * var(--campus-art-scale,1))`;
      mask.style.background=colors[code[0]];
      const text=document.createElement('span');text.className='campus-code-text';text.textContent=code;text.dir='ltr';
      text.style.fontSize=`calc(${size}px * var(--campus-art-scale,1))`;
      // A separate horizontal badge has enough width; no spilling over parking signs.
      text.style.background=colors[code[0]];
      inner.append(mask,text);
    }
    if(hall.tour?.scene){const badge=document.createElement('span');badge.className='campus-availability';badge.textContent='360°';inner.append(badge);outer.classList.add('has-tour');}
    outer.append(inner);
    const coordinate=artworkPoint(x,y,corners);
    new maplibregl.Marker({element:outer,anchor:'center'}).setLngLat(coordinate).addTo(map);
    outer.onclick=event=>{
      event.stopPropagation();
      const position=map.project(coordinate);
      const nearby=entries.filter(item=>{const point=map.project(item.coordinate);return Math.hypot(position.x-point.x,position.y-point.y)<30;}).map(item=>item.hall);
      onSelect?.(nearby.length?nearby:[hall]);
    };
    return {hall,outer,coordinate};
  });
  const resize=()=>{
    const left=map.project(corners[3]),right=map.project(corners[0]);
    map.getContainer().style.setProperty('--campus-art-scale',Math.hypot(right.x-left.x,right.y-left.y)/4118);
  };
  map.on('zoom',resize);map.on('resize',resize);resize();
  return {update({selectedId,activeCategory,toursOnly,language='en',matches}){
    for(const {hall,outer} of entries){
      outer.classList.toggle('is-selected',hall.id===selectedId);
      outer.classList.toggle('filter-match',Boolean(activeCategory||toursOnly)&&matches(hall,activeCategory,toursOnly));
      outer.classList.toggle('filter-other',Boolean(activeCategory||toursOnly)&&!matches(hall,activeCategory,toursOnly));
      const label=(hall.code?hall.code+' · ':'')+(hall.name[language]||hall.name.en);
      outer.title=label;outer.setAttribute('aria-label',label+(hall.tour?.scene?' · 360°':''));
      outer.setAttribute('aria-pressed',String(hall.id===selectedId));
    }
  }};
}
