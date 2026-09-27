// Men's Hall (A4) tour data. Global scene indices: 47–57.

export const PANORAMAS=[
  'mens-hall-078.glb','mens-hall-079.glb','mens-hall-080.glb',
  'mens-hall-081.glb','mens-hall-082.glb','mens-hall-083.glb',
  'mens-hall-084.glb','mens-hall-085.glb','mens-hall-086.glb',
  'mens-hall-087.glb','mens-hall-088.glb'
];

export const VISUAL_CALIBRATION=[];

const route=(to,angle,arrivalAngle,extras={})=>({
  to,
  angle,
  arrowAngle:extras.arrowAngle??angle,
  hotspotAngle:extras.hotspotAngle??angle,
  hotspotDistance:extras.hotspotDistance??1.05,
  arrivalAngle,
  departureAngle:angle,
  ...extras
});

export const LOCATIONS=[
  {
    id:'mens-hall-078',area:"Men's Hall",name:'A4 Entrance',view:3.14,
    routes:[route(48,3.14,0)]
  },
  {
    id:'mens-hall-079',area:"Men's Hall",name:'Entrance Lobby',back:47,view:3.14,
    routes:[route(47,0,3.14,{back:true}),route(49,3.14,0)]
  },
  {
    id:'mens-hall-080',area:"Men's Hall",name:'Main Dining Hall',back:48,view:3.14,
    routes:[route(48,0,3.14,{back:true}),route(50,3.14,0)]
  },
  {
    id:'mens-hall-081',area:"Men's Hall",name:'Games Area',back:49,view:3.14,
    routes:[route(49,0,3.14,{back:true}),route(51,3.14,0)]
  },
  {
    id:'mens-hall-082',area:"Men's Hall",name:'Study & Dining Area',back:50,view:3.14,
    routes:[route(50,0,3.14,{back:true}),route(52,3.14,0)]
  },
  {
    id:'mens-hall-083',area:"Men's Hall",name:'Dining Area',back:51,view:3.14,
    routes:[route(51,0,3.14,{back:true}),route(53,3.14,0)]
  },
  {
    id:'mens-hall-084',area:"Men's Hall",name:'Food Counter',back:52,view:3.14,
    routes:[route(52,0,3.14,{back:true}),route(54,3.45,0)]
  },
  {
    id:'mens-hall-085',area:"Men's Hall",name:'Dunkin',back:53,view:3.14,
    routes:[route(53,0,3.14,{back:true}),route(55,3.14,0)]
  },
  {
    id:'mens-hall-086',area:"Men's Hall",name:'Lounge & Café',back:54,view:3.2,
    routes:[route(54,0,3.14,{back:true}),route(56,3.14,0)]
  },
  {
    id:'mens-hall-087',area:"Men's Hall",name:'Restroom Corridor',back:55,view:3.14,
    routes:[route(55,0,3.14,{back:true}),route(57,3.14,0)]
  },
  {
    id:'mens-hall-088',area:"Men's Hall",name:'Booth Seating',back:56,view:0,
    routes:[route(56,0,3.14,{back:true})]
  }
];

export const LOCATION_AR=[
  {area:'قاعة الطلاب',name:'مدخل A4'},
  {area:'قاعة الطلاب',name:'بهو المدخل'},
  {area:'قاعة الطلاب',name:'قاعة الطعام الرئيسية'},
  {area:'قاعة الطلاب',name:'منطقة الألعاب'},
  {area:'قاعة الطلاب',name:'منطقة الدراسة والطعام'},
  {area:'قاعة الطلاب',name:'منطقة الطعام'},
  {area:'قاعة الطلاب',name:'منطقة المطاعم'},
  {area:'قاعة الطلاب',name:'دانكن'},
  {area:'قاعة الطلاب',name:'الاستراحة والمقهى'},
  {area:'قاعة الطلاب',name:'ممر دورات المياه'},
  {area:'قاعة الطلاب',name:'منطقة الجلسات'}
];
