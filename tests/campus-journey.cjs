const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const load=file=>import(pathToFileURL(path.join(__dirname,'../M7A_GitHub_Website_Full_Resolution/m7a-building',file)).href);
(async()=>{
  const {CAMPUS_BUILDINGS:halls}=await load('campus-buildings.js');
  const {CAMPUS_PATHS,findCampusRoute,hasCampusRoute,sanitizeJourney}=await load('campus-paths.js');
  const building=code=>halls.find(hall=>hall.code===code||hall.id===code);
  const anchors=halls.filter(hall=>hasCampusRoute(hall));
  assert.equal(anchors.length,56);
  assert(halls.filter(hall=>hall.code&&/^[ABC]/.test(hall.code)).every(hasCampusRoute),'Every main academic building supports manual routing');
  assert(halls.filter(hall=>hall.code&&/^[EF]/.test(hall.code)).every(hall=>!hasCampusRoute(hall)),'Medical buildings remain outside the route planner');
  const segments=CAMPUS_PATHS.flatMap(road=>road.slice(1).map((point,i)=>[road[i],point]));
  const liesOn=(point,[a,b])=>{
    const cross=(point[0]-a[0])*(b[1]-a[1])-(point[1]-a[1])*(b[0]-a[0]);
    return Math.abs(cross)<.01&&point[0]>=Math.min(a[0],b[0])-.001&&point[0]<=Math.max(a[0],b[0])+.001&&point[1]>=Math.min(a[1],b[1])-.001&&point[1]<=Math.max(a[1],b[1])+.001;
  };
  for(const hall of anchors){
    const route=findCampusRoute(building('A7'),hall),reverse=findCampusRoute(hall,building('A7'));
    assert(route&&reverse,`Connected route in both directions: ${hall.code||hall.id}`);
    assert.deepEqual(route.points[0],building('A7').anchor);
    assert.deepEqual(route.points.at(-1),hall.anchor);
    for(let i=1;i<route.road.length;i++){
      const midpoint=route.road[i].map((n,axis)=>(n+route.road[i-1][axis])/2);
      assert(segments.some(segment=>liesOn(midpoint,segment)),`Route stays on a traced grey road: ${hall.code||hall.id}`);
    }
  }
  // Nearby stops on one road take the direct road segment, without looping.
  const direct=findCampusRoute(building('A10'),building('A8'));
  assert.deepEqual(direct.road,[[546,938],[607,938],[668,938]]);
  const forward=findCampusRoute(building('A7'),building('B1'));
  const reverse=findCampusRoute(building('B1'),building('A7'));
  assert.deepEqual(reverse.points,[...forward.points].reverse(),'Swapping follows the same road in the opposite direction');
  assert(forward.road.some(([x,y])=>x===510&&y===747),'Library route joins the internal central walkway');
  assert(forward.road.some(([x,y])=>x===510&&y===1157),'Main-building route follows the walkway marked by the user');
  assert(forward.road.every(([x])=>x<650),'Library-to-main route never detours onto the perimeter road');
  assert(forward.road.some(([x,y])=>x===510&&y===1009),'The route stays centred on the straight grey spine beside A11');
  const northern=findCampusRoute(building('A1'),building('A12'));
  for(const point of [[574,389],[500,389],[500,424],[500,462],[574,462],[574,565],[574,716],[510,747],[510,1078]]){
    assert(northern.road.some(([x,y])=>x===point[0]&&y===point[1]),`A1 to A12 uses the connected halls and grey links at ${point}`);
  }
  assert(northern.road.every(([x])=>x>=500),'A1 to A12 does not detour onto the parking road');
  assert.deepEqual(findCampusRoute(building('A12'),building('A1')).points,[...northern.points].reverse());
  const southern=findCampusRoute(building('C1'),building('C12'));
  for(const point of [[571,2027],[500,2027],[500,1990],[500,1955],[571,1955],[571,1847],[571,1708],[510,1666],[510,1334]]){
    assert(southern.road.some(([x,y])=>x===point[0]&&y===point[1]),`C1 to C12 uses the matching grey hall links at ${point}`);
  }
  assert(southern.road.every(([x])=>x>=500),'C1 to C12 does not detour onto the parking road');
  const mainBranch=findCampusRoute(building('A13'),building('B1'));
  assert(mainBranch.road.some(([x,y])=>x===606&&y===1122),'The Main Building connects directly to the A13 row on the grey branch');
  assert(mainBranch.road.every(([x])=>x===606),'A13 to B1 uses its direct connector');
  assert.equal(findCampusRoute(building('A7'),building('E4')),null);
  assert.deepEqual(findCampusRoute(building('B1'),building('B1')),{sameBuilding:true,road:[],links:[],points:[building('B1').anchor]});
  assert.equal(findCampusRoute(null,building('B1')),null);
  assert.equal(hasCampusRoute({id:'unknown',anchor:[450,1000]}),false);
  assert.equal(findCampusRoute({...building('B1'),code:'unknown'},building('A1')),null);
  const fromId=building('A7').id,toId=building('C4').id;
  assert.deepEqual(sanitizeJourney({fromId,toId,active:true},halls),{fromId,toId,active:true});
  assert.deepEqual(sanitizeJourney({fromId,toId:'deleted-building',active:true},halls),{fromId,toId:null,active:false});
  assert.equal(sanitizeJourney({fromId,toId:fromId,active:true},halls).active,false);
  assert.equal(sanitizeJourney({fromId,toId,active:'true'},halls).active,false);
  console.log('PASS manual routes for all 56 main-campus pins, connected hall links, central walkway, reversal, medical exclusion and safe saved choices');
})().catch(error=>{console.error(error);process.exitCode=1;});
