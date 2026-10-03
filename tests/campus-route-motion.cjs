const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.join(__dirname,'../M7A_GitHub_Website_Full_Resolution/m7a-building');
(async()=>{
  const {measureRoute,pointOnRoute,createRouteSparkles}=await import(pathToFileURL(path.join(root,'campus-route-motion.js')).href);
  const points=[[0,0],[100,0],[100,0],[100,200]],route=measureRoute(points);
  assert.equal(route.length,300);
  assert.deepEqual(pointOnRoute(route,50),[50,0]);
  assert.deepEqual(pointOnRoute(route,100),[100,0]);
  assert.deepEqual(pointOnRoute(route,150),[100,50],'A sparkle follows the turn rather than cutting diagonally across it');
  assert.deepEqual(pointOnRoute(route,-10),[0,0]);
  assert.deepEqual(pointOnRoute(route,400),[100,200]);
  assert.equal(pointOnRoute(measureRoute([]),0),null);
  assert.deepEqual(pointOnRoute(measureRoute([[5,8],[5,8]]),30),[5,8]);
  const reverse=measureRoute([...points].reverse());
  for(const distance of [0,35,100,180,299,300])assert.deepEqual(pointOnRoute(reverse,route.length-distance),pointOnRoute(route,distance),'Swapping reverses sparkle travel on the same path');

  // Exercise real animation lifecycle with browser primitives replaced by a
  // controlled frame clock: route cleanup and reduced motion must cancel work.
  let observer,frameId=0;
  const frames=new Map(),listeners=new Map();
  const element=()=>({style:{setProperty(){}},children:[],hidden:false,setAttribute(){},append(child){this.children.push(child);},remove(){this.removed=true;}});
  const container=element(),motion={matches:false,addEventListener(type,handler){this.change=handler;}};
  global.document={hidden:false,createElement:element,addEventListener(type,handler){listeners.set(type,handler);}};
  global.matchMedia=()=>motion;
  global.requestAnimationFrame=callback=>{frames.set(++frameId,callback);return frameId;};
  global.cancelAnimationFrame=id=>frames.delete(id);
  global.IntersectionObserver=class{constructor(callback){observer=this;this.callback=callback;}observe(){}disconnect(){this.disconnected=true;}};
  const mapListeners=new Map(),map={getContainer:()=>container,project:([x,y])=>({x:x*10000,y:y*10000}),on:(type,handler)=>mapListeners.set(type,handler),off:type=>mapListeners.delete(type)};
  const animation=createRouteSparkles(map),overlay=container.children[0];
  animation.update([[574,282],[574,389],[500,389]]);
  assert.equal(overlay.hidden,false);assert.equal(frames.size,1);
  const advance=time=>{const [id,callback]=frames.entries().next().value;frames.delete(id);callback(time);};
  advance(0);advance(80);
  assert.match(overlay.children[0].style.transform,/translate3d\(/);
  document.hidden=true;listeners.get('visibilitychange')();assert.equal(frames.size,0);assert.equal(overlay.hidden,true);
  document.hidden=false;listeners.get('visibilitychange')();assert.equal(frames.size,1);
  motion.matches=true;motion.change();assert.equal(frames.size,0);assert.equal(overlay.hidden,true);
  motion.matches=false;motion.change();assert.equal(frames.size,1);
  observer.callback([{isIntersecting:false}]);assert.equal(frames.size,0);
  observer.callback([{isIntersecting:true}]);assert.equal(frames.size,1);
  animation.update([]);assert.equal(frames.size,0);assert.equal(overlay.hidden,true);
  animation.update([[574,282],[574,389]]);animation.destroy();
  assert.equal(frames.size,0);assert.equal(mapListeners.size,0);assert(overlay.removed&&observer.disconnected);
  console.log('PASS sparkle path corners, reverse travel, hidden-map pause, reduced motion and animation cleanup');
})().catch(error=>{console.error(error);process.exitCode=1;});
