// Standalone A6 Student Forums. Original file numbers 071–077 map to scenes 1–7.
// Semantic IDs stay fixed. Every media representation uses this source binding.
export const PANORAMAS=[71,72,74,73,75,76,77].map(number=>'student-forums-'+String(number).padStart(3,'0')+'.glb');
export const VISUAL_CALIBRATION=[];

// Bearings are independently read from doorway/aisle landmarks in each image.
// Branches pass the backdrop, not the side exterior doors. Scene 5's onward
// bearing faces the glass passage; its seating-obstructed approach needs owner
// review, so no unsupported left/right detour is encoded.
const scenes=[
  {name:'Outside Entrance',ar:'المدخل الخارجي',view:3.07,routes:[[1,3.07,3.14]]},
  {name:'Central Hall',ar:'البهو المركزي',view:3.14,routes:[[0,0.02,0.02,true],[2,2.35,3.50],[3,3.93,2.65]]},
  {name:'Left-Side Checkpoint',ar:'نقطة الجانب الأيسر',view:3.50,routes:[[1,5.85,6.15,true],[4,3.50,3.45]]},
  {name:'Right-Side Checkpoint',ar:'نقطة الجانب الأيمن',view:2.65,routes:[[1,0.55,0.10,true],[4,2.65,2.80]]},
  {name:'Rejoining Checkpoint',ar:'نقطة التقاء المسارين',view:3.12,routes:[[2,5.55,5.85,true],[3,0.85,0.55,true],[5,3.12,3.30]]},
  {name:'Glass Passage Entrance',ar:'مدخل الممر الزجاجي',view:3.30,routes:[[4,0.08,0.02,true],[6,3.30,3.25]]},
  {name:'Glass Passage',ar:'الممر الزجاجي',view:3.25,routes:[[5,0.03,0.08,true]]}
];
const start=81,parents=[null,0,1,1,2,4,5];
export const LOCATIONS=scenes.map((scene,index)=>({
  id:'student-forums-'+String(index+71).padStart(3,'0'),
  area:'Student Forums',name:scene.name,checkpoint:index+1,view:scene.view,
  ...(parents[index]===null?{}:{back:start+parents[index]}),
  routes:scene.routes.map(([to,angle,arrivalAngle,back=false])=>({
    to:start+to,angle,arrowAngle:angle,departureAngle:angle,arrivalAngle,
    // At the rejoin, move the back hotspots off the green seats while keeping
    // their tips aimed independently toward the two sides of the central tree.
    hotspotAngle:index===4&&to===2?4.65:index===4&&to===3?1.70:angle,
    hotspotDistance:index===0?1.30:index===4?.60:index===5?.80:index===2||index===3?.75:1.05,preserveView:true,
    ...(index===4&&to===5?{calibrationReview:'Confirm the walkable approach around the seating row to the glass passage.'}:{}),
    ...(back?{back:true}:{})
  }))
}));
export const LOCATION_AR=scenes.map(scene=>({area:'ملتقى الطلاب',name:scene.ar}));
