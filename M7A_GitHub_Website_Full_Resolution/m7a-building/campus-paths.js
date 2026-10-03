// Grey walkways and connected-hall passages traced from the campus artwork.
// Coordinates use its 900 × 4118 reference space, not geographic distances.
// The medical campus is intentionally outside the current route planner.
export const CAMPUS_PATHS = [
  // The narrow central walkway, with the branches between the academic blocks.
  [[450,747],[510,747],[574,747],[610,747]],
  [[510,747],[510,938],[510,1009],[510,1078],[510,1157],[510,1257],[510,1334],[510,1406],[510,1478],[510,1666]],
  [[574,747],[574,803]],
  [[510,938],[546,938],[607,938],[668,938]],
  [[510,1078],[546,1078],[606,1078],[668,1078]],
  [[510,1157],[606,1157],[606,1174]],
  [[606,1078],[606,1122],[606,1157]],
  [[510,1257],[606,1257],[606,1243]],
  [[606,1257],[606,1290],[606,1334]],
  [[510,1334],[546,1334],[606,1334],[668,1334]],
  [[510,1478],[546,1478],[607,1478],[668,1478]],
  [[450,1666],[510,1666],[571,1666],[610,1666]],
  [[571,1666],[571,1600]],
  // Use the grey links through the joined halls, rather than the parking roads.
  // A2/C2 connect through the short passage entering their western wing.
  [[574,282],[574,368],[574,389],[500,389],[500,424],[500,462],[574,462],[574,482],[574,565],[574,653],[574,716],[574,738],[574,747]],
  [[571,1666],[571,1677],[571,1708],[571,1758],[571,1765],[571,1847],[571,1930],[571,1955],[500,1955],[500,1990],[500,2027],[571,2027],[571,2045],[571,2128]],
  [[571,2128],[571,2218],[516,2218],[516,2169]],
  [[516,2218],[516,2300],[390,2300]],
  // Main-campus access paths and the neighbouring dormitory courtyards.
  [[80,75],[257,75],[390,75],[515,75]],
  [[390,75],[390,375],[390,424],[390,467],[390,704],[390,850],[390,930],[390,1207],[390,1297],[390,1618],[390,1730],[390,1748],[390,1808],[390,1940],[390,2027],[390,2035],[390,2250],[390,2300]],
  [[390,747],[450,747]],
  [[390,1666],[450,1666]],
  [[80,75],[80,704],[80,1618],[80,2300],[390,2300]],
  [[80,424],[252,424],[390,424]],
  [[252,338],[337,338],[337,424],[252,424],[252,572],[252,685],[252,704],[390,704]],
  [[80,704],[190,704],[252,704]],
  [[190,704],[190,775],[190,850],[390,850]],
  [[252,424],[252,338]],
  [[80,1618],[252,1618],[390,1618]],
  [[190,1730],[252,1730],[390,1730]],
  [[252,1618],[252,1730],[252,1808],[252,1910],[252,2027],[252,2158],[252,2250],[260,2300]],
  [[252,1808],[390,1808]],
  [[252,2027],[390,2027]],
  [[252,2250],[390,2250]]
];

// Dotted links connect the building pin to the nearest mapped walkway.
// They do not assert a surveyed entrance.
const approaches = {
  A1:[[574,282]],A2:[[500,424]],A3:[[574,565]],
  A4:[[574,716]],A5:[[450,735],[450,747]],A6:[[610,747]],
  A7:[[574,803]],A15:[[510,819]],A16:[[390,930]],A17:[[299,850],[390,850]],A18:[[190,934],[190,850]],A19:[[257,75]],
  A8:[[668,938]],A9:[[607,938]],A10:[[546,938]],A11:[[510,1009]],
  A12:[[546,1078]],A13:[[606,1078]],A14:[[668,1078]],A20:[[460,979],[510,979]],
  B1:[[606,1174]],B2:[[510,1212]],B3:[[510,1207]],B4:[[510,1297]],
  C1:[[571,2128]],C2:[[500,1990]],C3:[[571,1847]],
  C4:[[571,1708]],C5:[[450,1666]],C6:[[610,1666]],C7:[[571,1600]],
  C8:[[668,1478]],C9:[[607,1478]],C10:[[546,1478]],C11:[[510,1406]],
  C12:[[546,1334]],C13:[[606,1334]],C14:[[668,1334]],C15:[[494,2169],[516,2169]],C16:[[460,1373],[510,1373]],
  G1:[[252,358]],G2:[[252,572]],G3:[[252,572]],G4:[[190,789]],G5:[[318,704]],G6:[[190,709]],
  H1:[[252,1730]],H2:[[190,1730]],H3:[[252,1909]],H4:[[252,1909]],
  H5:[[252,2158]],H6:[[252,2158]],H7:[[180,2300]],H8:[[335,2300]],H9:[[252,1772]],H10:[[390,1730]]
};

const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const interpolate=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const segments=CAMPUS_PATHS.flatMap(road=>road.slice(1).map((b,i)=>({a:road[i],b,stops:[0,1]})));
function project(point,segment){const {a,b}=segment,dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy)));return {t,point:interpolate(a,b,t)};}
// Join crossing branches as well as matching endpoints. Split edges before
// finding a path so two pins on one road can travel directly between their snaps.
for(let i=0;i<segments.length;i++)for(let j=0;j<i;j++){
  const p=segments[i],q=segments[j],r=[p.b[0]-p.a[0],p.b[1]-p.a[1]],s=[q.b[0]-q.a[0],q.b[1]-q.a[1]],cross=(a,b)=>a[0]*b[1]-a[1]*b[0],den=cross(r,s),delta=[q.a[0]-p.a[0],q.a[1]-p.a[1]];
  if(Math.abs(den)>1e-8){const t=cross(delta,s)/den,u=cross(delta,r)/den;if(t>=0&&t<=1&&u>=0&&u<=1){p.stops.push(t);q.stops.push(u);}}
  else for(const [point,other]of [[p.a,q],[p.b,q],[q.a,p],[q.b,p]]){const snap=project(point,other);if(distance(point,snap.point)<1e-6)other.stops.push(snap.t);}
}
function linkFor(building){
  if(!building?.anchor)return null;
  const waypoints=approaches[building.code||building.id];if(!waypoints)return null;
  const points=[building.anchor,...waypoints],last=points.at(-1);
  const snap=segments.map((segment,index)=>({...project(last,segment),index})).sort((a,b)=>distance(last,a.point)-distance(last,b.point))[0];
  if(distance(last,snap.point)>35)return null;
  return {points:[...points,snap.point].filter((point,i,all)=>!i||distance(point,all[i-1])>.01),snap};
}
export function hasCampusRoute(building){return Boolean(linkFor(building));}
export function findCampusRoute(from,to){
  const start=linkFor(from),finish=linkFor(to);if(!start||!finish)return null;
  if(from.id===to.id)return {sameBuilding:true,road:[],links:[],points:[from.anchor]};
  const graph=new Map(),positions=new Map(),key=point=>point.map(n=>n.toFixed(4)).join(','),connect=(a,b)=>{
    const x=key(a),y=key(b),weight=distance(a,b);if(x===y)return;
    for(const [id,point]of [[x,a],[y,b]]){if(!graph.has(id))graph.set(id,[]);positions.set(id,point);}
    graph.get(x).push({id:y,weight});graph.get(y).push({id:x,weight});
  };
  segments.forEach((segment,index)=>{
    const stops=[...segment.stops,...[start,finish].filter(link=>link.snap.index===index).map(link=>link.snap.t)].sort((a,b)=>a-b);
    stops.slice(1).forEach((t,i)=>connect(interpolate(segment.a,segment.b,stops[i]),interpolate(segment.a,segment.b,t)));
  });
  const origin=key(start.snap.point),destination=key(finish.snap.point),cost=new Map([[origin,0]]),previous=new Map(),pending=new Set(graph.keys());
  while(pending.size){let current=null;for(const id of pending)if(cost.has(id)&&(current===null||cost.get(id)<cost.get(current)))current=id;if(current===null)break;pending.delete(current);if(current===destination)break;
    for(const edge of graph.get(current)||[])if(pending.has(edge.id)){const next=cost.get(current)+edge.weight;if(next<(cost.get(edge.id)??Infinity)){cost.set(edge.id,next);previous.set(edge.id,current);}}
  }
  if(!cost.has(destination))return null;
  const ids=[destination];while(ids[0]!==origin){const parent=previous.get(ids[0]);if(!parent)return null;ids.unshift(parent);}
  const road=ids.map(id=>positions.get(id)),links=[start.points,[...finish.points].reverse()];
  return {sameBuilding:false,road,links,points:[...start.points,...road,...links[1]].filter((p,i,all)=>!i||distance(p,all[i-1])>.01)};
}

export function sanitizeJourney(value,buildings){
  const valid=id=>buildings.find(building=>building.id===id&&hasCampusRoute(building))?.id||null;
  const fromId=valid(value?.fromId),toId=valid(value?.toId);
  return {fromId,toId,active:value?.active===true&&Boolean(fromId&&toId&&fromId!==toId)};
}
