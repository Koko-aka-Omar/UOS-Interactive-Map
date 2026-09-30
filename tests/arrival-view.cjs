const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
  const {LOCATIONS,arrivalView}=await import(pathToFileURL(path.join(__dirname,'../M7A_GitHub_Website_Full_Resolution/m7a-building/tour-routes.js')).href);
  const index=id=>LOCATIONS.findIndex(scene=>scene.id===id);
  assert.equal(LOCATIONS[index('entrance')].view,2.1,'M7A opens toward the visually checked corridor');
  const travel=(fromId,toId,yaw,pitch)=>{
    const from=index(fromId),to=index(toId),route=LOCATIONS[from].routes.find(r=>r.to===to);
    assert(route,'Existing link required');
    return {view:arrivalView({from,to,route,yaw,pitch,fov:72}),route,from,to};
  };
  const forward=travel('c4-013','c4-014',1.4,-1.1);
  assert.equal(forward.view.yaw,-3.30,'Approved food-counter arrival wins over source look direction');
  assert(Math.abs(forward.view.pitch)<=.12,'A floor-arrow tap cannot leave the arrival looking at the floor');
  const reverse=travel('c4-015','c4-014',-3.2,.9);
  assert.equal(reverse.view.yaw,-.20,'Approved reverse arrival remains intact');
  const branch=travel('student-forums-072','student-forums-073',-2.55,-.05);
  assert(Math.abs(branch.view.yaw+3.38)<1e-10,'A small deliberate look offset survives arrival');
  for(const id of ['student-forums-073','student-forums-074']){
    const from=index('student-forums-075'),to=index(id),route=LOCATIONS[from].routes.find(r=>r.to===to);
    assert.notEqual(route.hotspotAngle,route.arrowAngle,'Rejoining markers keep independently directed tips');
    const centered=travel('student-forums-075',id,-route.hotspotAngle,-.1);
    assert(Math.abs(centered.view.yaw+route.arrivalAngle)<1e-10,'Tapping a displaced marker does not add an unintended arrival turn');
    const offAxis=travel('student-forums-075',id,-route.hotspotAngle-.15,-.1);
    assert(Math.abs(offAxis.view.yaw+route.arrivalAngle+.15)<1e-10,'Intentional look offsets still survive the displaced marker');
  }
  const turned=travel('student-forums-072','student-forums-073',-2.35-Math.PI,-.9);
  assert(Math.abs(turned.view.yaw+turned.route.arrivalAngle)<=Math.PI/6+1e-10,'Back travel after looking around cannot turn arrival backwards');
  const wrapped=travel('student-forums-072','student-forums-073',-2.55+Math.PI*4,-.05);
  assert(Math.abs(wrapped.view.yaw-branch.view.yaw)<1e-10,'Yaw wrapping does not change the arrival');
  const map=arrivalView({...branch,from:branch.from,to:branch.to,route:branch.route,yaw:1,pitch:-1,fov:72,fromMap:true});
  assert.equal(map.yaw,-LOCATIONS[branch.to].view,'Map selection keeps the authored opening view');
  assert.equal(map.pitch,LOCATIONS[branch.to].viewPitch??0);
  assert.equal(map.fov,72,'Travel does not unexpectedly change zoom');
  console.log('PASS calibrated forward/back arrivals, junction look offsets, floor pitch, yaw wrap and map opening views');
})().catch(error=>{console.error(error);process.exitCode=1;});
