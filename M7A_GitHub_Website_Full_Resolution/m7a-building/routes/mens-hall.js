// Men's Hall (A4) standalone tour data. Global scene indices: 47–56.
// Keep this route graph independent from M7A, Auditorium, and Library.

export const PANORAMAS=[
  "mens-hall-078.webp",
  "mens-hall-079.webp",
  "mens-hall-080.webp",
  "mens-hall-081.webp",
  "mens-hall-082.webp",
  "mens-hall-083.webp",
  "mens-hall-084.webp",
  "mens-hall-085.webp",
  "mens-hall-086.webp",
  "mens-hall-087.webp"
];

export const VISUAL_CALIBRATION=[];

export const LOCATIONS=[
  {
    id:"mens-hall-entrance",
    area:"Men's Hall",
    name:"A4 Entrance",
    back:null,
    view:3.14,
    centerArrival:true,
    routes:[
      {to:48,angle:3.14,arrowAngle:3.14,hotspotAngle:3.14,hotspotDistance:1.05,arrivalAngle:5.85,departureAngle:3.14}
    ]
  },
  {
    id:"mens-hall-entry",
    area:"Men's Hall",
    name:"Dining Hall · Entrance",
    back:47,
    view:1.30,
    centerArrival:true,
    routes:[
      {to:47,angle:5.85,arrowAngle:5.85,hotspotAngle:5.85,hotspotDistance:1.05,back:true,arrivalAngle:3.14,departureAngle:5.85},
      {to:49,angle:1.30,arrowAngle:1.30,hotspotAngle:1.30,hotspotDistance:1.05,arrivalAngle:0.10,departureAngle:1.30}
    ]
  },
  {
    id:"mens-hall-food-counter",
    area:"Men's Hall",
    name:"Food Service Counter",
    back:48,
    view:3.10,
    centerArrival:true,
    routes:[
      {to:48,angle:0.10,arrowAngle:0.10,hotspotAngle:0.10,hotspotDistance:1.05,back:true,arrivalAngle:1.30,departureAngle:0.10},
      {to:50,angle:3.10,arrowAngle:3.10,hotspotAngle:3.10,hotspotDistance:1.05,arrivalAngle:0.12,departureAngle:3.10}
    ]
  },
  {
    id:"mens-hall-main-dining",
    area:"Men's Hall",
    name:"Main Dining Area",
    back:49,
    view:1.72,
    centerArrival:true,
    routes:[
      {to:49,angle:0.12,arrowAngle:0.12,hotspotAngle:0.12,hotspotDistance:1.05,back:true,arrivalAngle:3.10,departureAngle:0.12},
      {to:51,angle:1.72,arrowAngle:1.72,hotspotAngle:1.72,hotspotDistance:1.05,arrivalAngle:0.08,departureAngle:1.72}
    ]
  },
  {
    id:"mens-hall-booths",
    area:"Men's Hall",
    name:"Booth Seating",
    back:50,
    view:3.13,
    centerArrival:true,
    routes:[
      {to:50,angle:0.08,arrowAngle:0.08,hotspotAngle:0.08,hotspotDistance:1.05,back:true,arrivalAngle:1.72,departureAngle:0.08},
      {to:52,angle:3.13,arrowAngle:3.13,hotspotAngle:3.13,hotspotDistance:1.05,arrivalAngle:0.04,departureAngle:3.13}
    ]
  },
  {
    id:"mens-hall-recreation",
    area:"Men's Hall",
    name:"Recreation Area",
    back:51,
    view:3.12,
    centerArrival:true,
    routes:[
      {to:51,angle:0.04,arrowAngle:0.04,hotspotAngle:0.04,hotspotDistance:1.05,back:true,arrivalAngle:3.13,departureAngle:0.04},
      {to:53,angle:3.12,arrowAngle:3.12,hotspotAngle:3.12,hotspotDistance:1.05,arrivalAngle:0.05,departureAngle:3.12}
    ]
  },
  {
    id:"mens-hall-lounge",
    area:"Men's Hall",
    name:"Food Court & Lounge",
    back:52,
    view:3.15,
    centerArrival:true,
    routes:[
      {to:52,angle:0.05,arrowAngle:0.05,hotspotAngle:0.05,hotspotDistance:1.05,back:true,arrivalAngle:3.12,departureAngle:0.05},
      {to:54,angle:3.15,arrowAngle:3.15,hotspotAngle:3.15,hotspotDistance:1.05,arrivalAngle:0.04,departureAngle:3.15}
    ]
  },
  {
    id:"mens-hall-central-dining",
    area:"Men's Hall",
    name:"Central Dining Area",
    back:53,
    view:3.12,
    centerArrival:true,
    routes:[
      {to:53,angle:0.04,arrowAngle:0.04,hotspotAngle:0.04,hotspotDistance:1.05,back:true,arrivalAngle:3.15,departureAngle:0.04},
      {to:55,angle:3.12,arrowAngle:3.12,hotspotAngle:3.12,hotspotDistance:1.05,arrivalAngle:0.05,departureAngle:3.12}
    ]
  },
  {
    id:"mens-hall-dunkin",
    area:"Men's Hall",
    name:"Dunkin' Area",
    back:54,
    view:2.18,
    centerArrival:true,
    routes:[
      {to:54,angle:0.05,arrowAngle:0.05,hotspotAngle:0.05,hotspotDistance:1.05,back:true,arrivalAngle:3.12,departureAngle:0.05},
      {to:56,angle:2.18,arrowAngle:2.18,hotspotAngle:2.18,hotspotDistance:1.05,arrivalAngle:4.52,departureAngle:2.18}
    ]
  },
  {
    id:"mens-hall-restrooms",
    area:"Men's Hall",
    name:"Restroom Corridor",
    back:55,
    view:4.52,
    centerArrival:true,
    routes:[
      {to:55,angle:4.52,arrowAngle:4.52,hotspotAngle:4.52,hotspotDistance:1.05,back:true,arrivalAngle:2.18,departureAngle:4.52}
    ]
  }
];

export const LOCATION_AR=[
  ["قاعة الرجال","مدخل A4"],
  ["قاعة الرجال","مدخل قاعة الطعام"],
  ["قاعة الرجال","منطقة تقديم الطعام"],
  ["قاعة الرجال","منطقة الطعام الرئيسية"],
  ["قاعة الرجال","منطقة الجلسات"],
  ["قاعة الرجال","منطقة الترفيه"],
  ["قاعة الرجال","منطقة الطعام والاستراحة"],
  ["قاعة الرجال","منطقة الطعام المركزية"],
  ["قاعة الرجال","منطقة دانكن"],
  ["قاعة الرجال","ممر دورات المياه"]
];

export const HOTSPOT_STYLE={};
