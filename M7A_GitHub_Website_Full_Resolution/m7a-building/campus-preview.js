import { coverForBuilding } from './scene-previews.js';
export function createCampusPreview(map,root,language){
 const surface=document.createElement('aside');surface.className='campus-hover-preview';surface.hidden=true;surface.setAttribute('aria-live','polite');root.append(surface);
 let timer,grace,generation=0,active=null;const listeners=new AbortController(),signal=listeners.signal;
 function close(){clearTimeout(timer);clearTimeout(grace);generation++;active=null;surface.hidden=true;surface.replaceChildren();}
 function position(){if(!active)return;const point=map.project(active.hall.mapCoordinates),mapRect=map.getContainer().getBoundingClientRect(),card=root.querySelector('.campus-map-card').getBoundingClientRect(),width=Math.min(250,mapRect.width-24),height=surface.offsetHeight||190;
  let x=point.x+mapRect.left+20,y=point.y+mapRect.top-height/2;
  if(x+width>mapRect.right-12)x=point.x+mapRect.left-width-20;
  x=Math.max(mapRect.left+12,Math.min(mapRect.right-width-12,x));y=Math.max(mapRect.top+12,Math.min(mapRect.bottom-height-12,y));
  if(x<card.right&&x+width>card.left&&y<card.bottom&&y+height>card.top)x=card.left<mapRect.width/2?card.right+12:card.left-width-12;
  if(x<mapRect.left+12||x+width>mapRect.right-12){close();return;}
  surface.style.left=x+'px';surface.style.top=y+'px';surface.style.width=width+'px';
 }
 function show(hall){if(!matchMedia('(hover:hover) and (pointer:fine)').matches||!hall.tour?.scene)return;clearTimeout(timer);clearTimeout(grace);const mine=++generation,preview=coverForBuilding(hall);surface.hidden=true;if(!preview)return;
  timer=setTimeout(()=>{if(mine!==generation||!root.classList.contains('open'))return;const image=new Image();image.decoding='async';image.alt=hall.name[language()]||hall.name.en;image.onload=()=>{if(mine!==generation)return;const label=document.createElement('strong');label.textContent=(hall.code?hall.code+' · ':'')+(hall.name[language()]||hall.name.en);const badge=document.createElement('small');badge.textContent=language()==='ar'?'جولة بزاوية 360°':'360° tour';surface.replaceChildren(image,label,badge);active={hall};surface.dataset.scene=preview.sceneId;surface.hidden=false;position();};image.onerror=()=>{if(mine===generation)close();};image.src=preview.url;},300);
 }
 function leave(){clearTimeout(timer);grace=setTimeout(close,120);}
 map.on('movestart',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close();},{signal});root.addEventListener('pointerdown',close,{signal});
 const observer=new MutationObserver(()=>{if(!root.classList.contains('open')||!root.querySelector('#campus-settings-panel').hidden||!root.querySelector('#campus-filter-panel').hidden)close();});observer.observe(root,{attributes:true,attributeFilter:['class']});for(const id of ['campus-settings-panel','campus-filter-panel'])observer.observe(root.querySelector('#'+id),{attributes:true,attributeFilter:['hidden']});
 return {show,leave,close,destroy(){close();map.off('movestart',close);observer.disconnect();listeners.abort();surface.remove();}};
}
