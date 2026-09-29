// C4 standalone tour. Panorama filename order 042–056 is the authoritative walking order.
export const PANORAMAS=Array.from({length:15},(_,i)=>'c4-'+String(i+1).padStart(3,'0')+'.glb');
export const VISUAL_CALIBRATION=[];

const points=[
  ['C4 Entrance','مدخل C4',3.07,null],
  ['Entry Corridor','ممر المدخل',3.12,0.03],
  ['Collaboration Corridor','ممر مساحات التعاون',3.13,0.02],
  ['Café Corridor','ممر المقهى',3.15,0.04],
  ['Café Lounge','استراحة المقهى',4.46,0.08],
  ['Study Booths','مقصورات الدراسة',3.04,6.06],
  ['Breakfast Counter','منطقة الإفطار',0.12,4.66],
  ['Main Lounge','الاستراحة الرئيسية',6.02,0.25],
  ['Recreation Corridor','ممر الترفيه',4.48,0.43],
  ['Games Area','منطقة الألعاب',3.14,6.12],
  ['Tiered Seating','الجلسات المتدرجة',2.28,5.40],
  ['Dining Hall','قاعة الطعام',3.12,4.88],
  ['Food Court Corridor','ممر المطاعم',3.15,0.58],
  ['Food Counter','منطقة المطاعم',3.20,0.20],
  ['Dining Area','منطقة الطعام',null,3.13]
];

const start=58;
const normalize=angle=>(angle+Math.PI*2)%(Math.PI*2);
const edge=(to,angle,arrivalAngle,back=false,hotspotDistance=1.05)=>({
  to,angle,arrowAngle:angle,hotspotAngle:angle,hotspotDistance,
  arrivalAngle,departureAngle:angle,preserveView:false,
  ...(back?{back:true}:{})
});
const forwardArrival=i=>{
  const target=points[i+1];
  return target[2]??normalize(target[3]+Math.PI);
};
const backwardArrival=i=>{
  const target=points[i-1];
  return target[3]??normalize(target[2]+Math.PI);
};

export const LOCATIONS=points.map((point,index)=>({
  id:'c4-'+String(index+1).padStart(3,'0'),
  area:'C4',
  name:point[0],
  checkpoint:index+1,
  view:point[2]??normalize(point[3]+Math.PI),
  ...(index?{back:start+index-1}:{}),
  routes:[
    ...(index?[edge(start+index-1,point[3],backwardArrival(index),true)]:[]),
    ...(index<points.length-1?[edge(start+index+1,point[2],forwardArrival(index),false,index===0?0.82:1.05)]:[])
  ]
}));

export const LOCATION_AR=points.map(point=>({area:'C4',name:point[1]}));
