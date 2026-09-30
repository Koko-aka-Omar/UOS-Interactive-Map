// C4 standalone tour. Scene IDs keep panorama filenames 042–056 stable.
export const PANORAMAS=Array.from({length:15},(_,i)=>'c4-'+String(i+1).padStart(3,'0')+'.glb');
export const VISUAL_CALIBRATION=[];

const scenes=[
  {name:'C4 Entrance',ar:'مدخل C4',view:3.07,routes:[[1,3.07]]},
  {name:'Entry Corridor',ar:'ممر المدخل',view:3.12,routes:[[0,4.67,true],[2,3.12]]},
  {name:'Collaboration Corridor',ar:'ممر مساحات التعاون',view:3.13,routes:[[1,1.48,true],[3,3.13]]},
  {name:'Café Corridor',ar:'ممر المقهى',view:3.00,routes:[[2,0.04,true],[4,1.57],[5,4.46],[6,3.00]]},
  {name:'Café Lounge',ar:'استراحة المقهى',view:3.14,routes:[[3,0.08,true]]},
  {name:'Study Booths',ar:'مقصورات الدراسة',view:3.04,routes:[[3,6.06,true]]},
  {name:'Breakfast Counter',ar:'منطقة الإفطار',view:3.15,routes:[[3,0.03,true],[7,4.66],[8,3.15]]},
  {name:'Main Lounge',ar:'الاستراحة الرئيسية',view:3.14,routes:[[6,0.25,true]]},
  {name:'Recreation Corridor',ar:'ممر الترفيه',view:3.94,routes:[[6,0.43,true],[9,3.94]]},
  {name:'Games Area',ar:'منطقة الألعاب',view:3.14,routes:[[8,6.12,true],[10,3.14]]},
  {name:'Tiered Seating',ar:'الجلسات المتدرجة',view:2.80,routes:[[9,5.98,true],[11,2.80]]},
  {name:'Dining Hall',ar:'قاعة الطعام',view:3.12,routes:[[10,1.48,true],[12,3.12]]},
  {name:'Food Court Corridor',ar:'ممر المطاعم',view:3.15,routes:[[11,0.12,true],[13,3.15]]},
  {name:'Food Counter',ar:'منطقة المطاعم',view:3.30,routes:[[12,0.20,true],[14,3.30]]},
  {name:'Dining Area',ar:'منطقة الطعام',view:0.00,routes:[[13,0.00,true]]}
];

const start=58;
const normalize=angle=>(angle+Math.PI*2)%(Math.PI*2);
const parents=[null,0,1,2,3,3,3,6,6,8,9,10,11,12,13];
// Rendered C4 audit: corners need an independently verified forward arrival,
// not the opposite bearing of a return arrow after the corridor has turned.
const arrivals={'0->1':3.12,'1->2':3.13,'2->1':4.67,'3->2':1.48,'10->11':3.12,'11->10':5.98,'12->11':1.48};
// At the last pair, the glass exit is ahead and the food counters are behind.
// Keep these photographed travel bearings explicit in each destination frame.
Object.assign(arrivals,{'12->13':3.30,'13->14':3.13,'14->13':0.20});
const edge=(to,angle,arrivalAngle,back=false,hotspotDistance=1.05)=>({
  to,angle,arrowAngle:angle,hotspotAngle:angle,hotspotDistance,
  // C4 arrow travel faces its calibrated destination bearing. Carrying the
  // source look offset can turn the arrival backwards, especially on Back.
  // Map entry and history restoration use their own views in transitionTo.
  arrivalAngle,departureAngle:angle,preserveView:false,
  ...(back?{back:true}:{})
});
const reciprocalBearing=(from,to)=>{
  const reciprocal=scenes[to].routes.find(route=>route[0]===from);
  if(!reciprocal)throw new Error('Missing reciprocal C4 route');
  return reciprocal[1];
};

export const LOCATIONS=scenes.map((scene,index)=>({
  id:'c4-'+String(index+1).padStart(3,'0'),
  area:'C4',
  name:scene.name,
  checkpoint:index+1,
  view:scene.view,
  ...(parents[index]!==null?{back:start+parents[index]}:{}),
  routes:scene.routes.map(([to,angle,back=false])=>edge(
    start+to,
    angle,
    arrivals[index+'->'+to]??normalize(reciprocalBearing(index,to)+Math.PI),
    back,
    index===0&&to===1?0.82:1.05
  )).map(route=>index===13&&route.to===start+14?{...route,hotspotAngle:3.43}:route)
}));

export const LOCATION_AR=scenes.map(scene=>({area:'C4',name:scene.ar}));
