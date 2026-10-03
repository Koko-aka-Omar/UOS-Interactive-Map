import { artworkPoint } from './campus-geometry.js';

// Measure projected segments so the sparkles move evenly and turn with the path.
export function measureRoute(points){
  let length=0;
  const segments=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],size=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(size>0){segments.push({a,b,start:length,size});length+=size;}
  }
  return {segments,length,first:points[0]||null,last:points.at(-1)||null};
}
export function pointOnRoute(path,distance){
  if(distance<=0||!path.length)return path.first;
  if(distance>=path.length)return path.last;
  const segment=path.segments.find(part=>distance<=part.start+part.size);
  const t=(distance-segment.start)/segment.size;
  return segment.a.map((value,axis)=>value+(segment.b[axis]-value)*t);
}

export function createRouteSparkles(map){
  const overlay=document.createElement('div');overlay.className='campus-journey-sparkles';
  overlay.setAttribute('aria-hidden','true');overlay.hidden=true;
  const stars=Array.from({length:3},(_,index)=>{
    const star=document.createElement('span');star.className='campus-journey-star';
    star.style.setProperty('--star-size',[16,10,7][index]+'px');
    star.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 1 3.1 7.9L23 12l-7.9 3.1L12 23l-3.1-7.9L1 12l7.9-3.1Z"/></svg>';
    overlay.append(star);return star;
  });
  map.getContainer().append(overlay);
  const abort=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)');
  let points=[],path=measureRoute([]),frameId=null,elapsed=0,duration=8000,previous=null,visible=true,destroyed=false;
  function stop(){if(frameId!==null)cancelAnimationFrame(frameId);frameId=null;previous=null;}
  function resume(){
    stop();overlay.hidden=destroyed||!visible||document.hidden||motion.matches||!path.length;
    if(!overlay.hidden)frameId=requestAnimationFrame(tick);
  }
  function project(){
    path=measureRoute(points.map(point=>{const p=map.project(artworkPoint(...point));return [p.x,p.y];}));
  }
  function tick(time){
    if(previous!==null)elapsed+=Math.min(80,time-previous);
    previous=time;
    const cycle=duration+900;
    const travel=elapsed%cycle,head=Math.min(1,travel/duration)*path.length;
    const fade=travel<=duration?1:Math.max(0,1-(travel-duration)/650);
    stars.forEach((star,index)=>{
      const distance=head-index*18,point=pointOnRoute(path,distance);
      star.style.opacity=String([1,.65,.4][index]*fade*Math.max(0,Math.min(1,distance/12)));
      star.style.transform=`translate3d(${point[0]}px,${point[1]}px,0)`;
    });
    frameId=requestAnimationFrame(tick);
  }
  // Projection is only recomputed when the camera changes, never every frame.
  map.on('move',project);map.on('resize',project);
  document.addEventListener('visibilitychange',resume,{signal:abort.signal});
  motion.addEventListener('change',resume,{signal:abort.signal});
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;resume();});
  observer.observe(map.getContainer());
  return {
    update(nextPoints){points=nextPoints||[];elapsed=0;project();duration=Math.max(6500,Math.min(14000,path.length/70*1000));resume();},
    destroy(){destroyed=true;stop();abort.abort();observer.disconnect();map.off('move',project);map.off('resize',project);overlay.remove();}
  };
}
