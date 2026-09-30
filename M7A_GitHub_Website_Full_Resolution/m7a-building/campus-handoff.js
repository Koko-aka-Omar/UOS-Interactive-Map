import { previewForScene } from './scene-previews.js';
export function createCampusHandoff(root){
 let animations=[],image=null,generation=0;
 function cancel(){generation++;for(const animation of animations)animation.cancel();animations=[];image?.remove();image=null;root.style.opacity='';}
 async function play(sceneId,view){cancel();const mine=generation,preview=previewForScene(sceneId),source=root.querySelector('.hall-thumbnail');
  const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const match=preview&&source?.dataset.scene===sceneId&&source.complete&&source.naturalWidth&&Math.abs(angle(view.yaw-preview.yaw))<.12&&Math.abs(view.pitch-preview.pitch)<.06&&Math.abs(view.fov-preview.fov)<5;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;root.dataset.handoff=match?'matching':'fade';
  if(reduced)return;
  animations.push(root.animate([{opacity:1},{opacity:0}],{duration:200,easing:'ease-out',fill:'forwards'}));
  if(match){const box=source.getBoundingClientRect();image=source.cloneNode();image.className='campus-handoff-photo';image.setAttribute('aria-hidden','true');image.style.cssText=`left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px`;document.body.append(image);
   const scale=Math.max(innerWidth/box.width,innerHeight/box.height),x=(innerWidth-box.width*scale)/2-box.left,y=(innerHeight-box.height*scale)/2-box.top;
   animations.push(image.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${x}px,${y}px) scale(${scale})`,opacity:0}],{duration:220,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'}));}
  await Promise.all(animations.map(animation=>animation.finished.catch(()=>{})));if(mine===generation)cancel();
 }
 addEventListener('resize',cancel);addEventListener('popstate',cancel);
 return {play,cancel};
}
