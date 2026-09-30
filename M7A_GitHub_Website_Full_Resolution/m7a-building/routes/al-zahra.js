// Al Zahra Hall standalone tour. Panorama filename order 057–064 is the walking order.
export const PANORAMAS=Array.from({length:8},(_,i)=>'al-zahra-'+String(i+1).padStart(3,'0')+'.glb');
export const VISUAL_CALIBRATION=[];

const scenes=[
  {name:'Al Zahra Entrance',ar:'مدخل قاعة الزهراء',view:3.14,routes:[[1,3.14]]},
  {name:'Entrance Hall',ar:'بهو المدخل',view:3.99,routes:[[0,0.00,true],[2,3.99]]},
  {name:'Theater Door',ar:'باب المسرح',view:3.47,routes:[[1,1.70,true],[3,3.47]]},
  {name:'Theater Entrance',ar:'مدخل المسرح',view:1.40,routes:[[2,6.13,true],[4,1.40]]},
  {name:'Theater Right Side',ar:'الجانب الأيمن للمسرح',view:3.39,routes:[[3,6.00,true],[5,3.39,false,'stairs','down']]},
  {name:'Lower Seating',ar:'منطقة الجلوس السفلية',view:3.33,routes:[[4,0.18,true,'stairs','up'],[6,3.33,false,'stairs','down']]},
  {name:'Upper Theater',ar:'داخل المسرح',view:3.02,routes:[[5,6.09,true,'stairs','up'],[7,3.02,false,'stairs','down']]},
  {name:'Stage Front',ar:'أمام المنصة',view:3.14,routes:[[6,0.00,true,'stairs','up']]}
];

const start=73;
const normalize=angle=>(angle+Math.PI*2)%(Math.PI*2);
const edge=(to,angle,arrivalAngle,back=false,kind=null,stairDirection=null,hotspotDistance=1.05)=>({
  to,angle,arrowAngle:angle,hotspotAngle:angle,hotspotDistance,
  arrivalAngle,departureAngle:angle,preserveView:true,
  ...(back?{back:true}:{}),
  ...(kind?{kind}:{}),
  ...(stairDirection?{stairDirection}:{})
});
const reciprocalBearing=(from,to)=>{
  const reciprocal=scenes[to].routes.find(route=>route[0]===from);
  if(!reciprocal)throw new Error('Missing reciprocal Al Zahra route');
  return reciprocal[1];
};

export const LOCATIONS=scenes.map((scene,index)=>({
  id:'al-zahra-'+String(index+1).padStart(3,'0'),
  area:'Al Zahra Hall',
  name:scene.name,
  checkpoint:index+1,
  view:scene.view,
  ...(index?{back:start+index-1}:{}),
  routes:scene.routes.map(([to,angle,back=false,kind=null,stairDirection=null])=>edge(
    start+to,
    angle,
    normalize(reciprocalBearing(index,to)+Math.PI),
    back,
    kind,
    stairDirection,
    index===0?0.88:1.05
  ))
}));

export const LOCATION_AR=scenes.map(scene=>({area:'قاعة الزهراء',name:scene.ar}));
