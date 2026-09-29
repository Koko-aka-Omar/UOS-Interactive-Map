// Men's Hall (A4) tour data. Original camera checkpoints 078–088 in walking order.
export const PANORAMAS=Array.from({length:11},(_,i)=>'mens-hall-'+String(78+i).padStart(3,'0')+'.glb');
export const VISUAL_CALIBRATION=[];
const points=[
 ['A4 Entrance','مدخل A4',2.92,null],
 ['Main Dining Hall','قاعة الطعام الرئيسية',3.02,6.10],
 ['Food Counter','منطقة المطاعم',3.14,0.03],
 ['Study & Dining Area','منطقة الدراسة والطعام',3.35,0.18],
 ['Booth Seating','منطقة الجلسات',3.08,1.48],
 ['Games Area','منطقة الألعاب',3.12,0.03],
 ['Lounge & Café','الاستراحة والمقهى',3.14,6.20],
 ['Dining Area','منطقة الطعام',3.20,0.08],
 ['Dunkin','دانكن',2.98,1.35],
 ['Restroom Corridor','ممر دورات المياه',3.12,4.72],
 ['Entrance Lobby','بهو المدخل',null,3.08]
];
const edge=(to,angle,arrivalAngle,back=false,hotspotAngle=angle,arrowAngle=angle,hotspotDistance=1.05,preserveView=true)=>({to,angle,arrowAngle,hotspotAngle,hotspotDistance,arrivalAngle,departureAngle:angle,preserveView,...(back?{back:true}:{})});
const forwardArrival=i=>{
 const target=points[i+1];
 if(i===0)return (target[2]??target[3])-Math.PI/2;
 if(i===3||i===7||i===8)return target[3]+Math.PI;
 return target[2]??target[3];
};
const backwardArrival=i=>{
 const target=points[i-1];
 if(i===5||i===9||i===10)return target[2]+Math.PI;
 return target[3]??target[2];
};
export const LOCATIONS=points.map((p,i)=>({id:'mens-hall-'+String(78+i).padStart(3,'0'),area:"Men's Hall",name:p[0],checkpoint:78+i,view:p[2]??p[3],...(i?{back:47+i-1}:{}),routes:[...(i?[edge(47+i-1,p[3],backwardArrival(i),true,i===1?p[3] - (Math.PI / 2) /* A4 entrance: 90 degrees anticlockwise placement */:p[3],i===1?p[3] - (Math.PI / 2) /* A4 entrance: 90 degrees anticlockwise heading */:p[3])]:[]),...(i<10?[edge(47+i+1,p[2],forwardArrival(i),false,p[2],p[2],i===0?0.72:1.05,i!==0)]:[])]}));
export const LOCATION_AR=points.map(p=>({area:'قاعة الطلاب',name:p[1]}));
