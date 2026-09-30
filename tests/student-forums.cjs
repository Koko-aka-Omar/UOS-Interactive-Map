const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const {execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../M7A_GitHub_Website_Full_Resolution/m7a-building');
const load=file=>import(pathToFileURL(path.join(root,file)).href);
const hashes=[
 '633523320b351f5d944b894183307efa1181d8a81c25850da27cafc8bb6e2307',
 '97574bd5c9682b4ae5391383b5147310b8f953f233eb3a5e9dfeaaaec5920b6d',
 '5e59164f4f35e8c336a33c767c8bcf83010c23c4b45d81b44bee9d77987f5929',
 'e6502dc70b75a7c7491ad06f9460f2eccc7b05cdf10b532edf3d556c46eb0539',
 '0c86268f18794bb1134f74826ff7be672ce1290b0476830fe8e09c1e506805ae',
 '994a6afc3e496c3c29f2449366f27b3ee4e7a33e07a6618874f0843cbb641d37',
 'd0e16f9e4a57062ed98178e8b9ec644393f57573fe36d5cc49018bdeee8e724d'
];
function jpegFromGlb(file){
 const data=fs.readFileSync(file);assert.equal(data.readUInt32LE(0),0x46546c67);assert.equal(data.readUInt32LE(4),2);assert.equal(data.readUInt32LE(8),data.length);
 const length=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+length));
 assert.equal(json.images.length,1);assert.equal(json.images[0].mimeType,'image/jpeg');
 const view=json.bufferViews[json.images[0].bufferView];return data.subarray(28+length+view.byteOffset,28+length+view.byteOffset+view.byteLength);
}
function dimensions(data){
 assert.equal(data.readUInt16BE(0),0xffd8);
 for(let i=2;i<data.length;){assert.equal(data[i++],255);while(data[i]===255)i++;const marker=data[i++],length=data.readUInt16BE(i);if([192,193,194].includes(marker))return [data.readUInt16BE(i+5),data.readUInt16BE(i+3)];i+=length;}
 throw Error('No JPEG dimensions');
}
(async()=>{
 const {LOCATIONS,PANORAMA_FILES,TOUR_AREAS}=await load('tour-routes.js'),{findPath}=await load('directions.js');
 const {HALLS}=await load('halls.js'),{CAMPUS_BUILDINGS,buildingForLegacyHall}=await load('campus-buildings.js');
 const {artworkPoint,BUILDING_ANCHORS}=await load('campus-geometry.js'),{searchHalls}=await load('campus-directory.js');
 const forum=await load('routes/student-forums.js'),area=TOUR_AREAS.find(a=>a.hallId==='student-forums');
 assert.equal(LOCATIONS.length,88);assert.equal(TOUR_AREAS.length,7);assert.deepEqual([area.start,area.end,area.count],[81,87,7]);assert.equal(forum.VISUAL_CALIBRATION.length,0);
 const expected=[[0,1],[1,2],[1,3],[2,4],[3,4],[4,5],[5,6]].flatMap(([a,b])=>[`${a}:${b}`,`${b}:${a}`]).sort();
 const actual=forum.LOCATIONS.flatMap((s,i)=>s.routes.map(r=>`${i}:${r.to-81}`)).sort();assert.deepEqual(actual,expected);
 const manifestBox={globalThis:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'tour-assets.generated.js'),'utf8'),manifestBox);const manifest=manifestBox.globalThis.UOS_TOUR_ASSETS;
 for(let i=0;i<7;i++){
  const stem='student-forums-'+String(71+i).padStart(3,'0'),scene=forum.LOCATIONS[i];
  assert.equal(scene.id,stem);assert.equal(scene.checkpoint,i+1);assert.equal(PANORAMA_FILES[81+i],stem+'.glb');assert(forum.LOCATION_AR[i].name);
  for(const r of scene.routes){for(const key of ['angle','arrowAngle','departureAngle','arrivalAngle','hotspotAngle','hotspotDistance'])assert(Number.isFinite(r[key]),`${stem} ${key}`);assert(r.preserveView);assert(r.to>=81&&r.to<=87);}
  const full=jpegFromGlb(path.join(root,'assets',stem+'.glb'));
  assert.equal(crypto.createHash('sha256').update(full).digest('hex'),hashes[i],'Original JPEG bytes preserved');assert.deepEqual(dimensions(full),[11904,5952]);
  const mobile=jpegFromGlb(path.join(root,'assets-mobile',stem+'.glb'));assert.deepEqual(dimensions(mobile),[3072,1536]);assert(mobile.equals(fs.readFileSync(path.join(root,'panoramas-mobile',stem+'.jpg'))));
  for(const [kind,folder]of [['desktop','assets'],['mobile','assets-mobile']]){
   const bytes=fs.readFileSync(path.join(root,folder,stem+'.glb')),blob=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
   assert.equal(manifest.panoramaRevisions[kind][stem+'.glb'],blob.slice(0,12));
  }
  assert(manifest.panoramaFiles.includes(stem+'.glb'));
 }
 assert(manifest.routeModules.includes('./routes/student-forums.js'));
 for(let a=81;a<88;a++)for(let b=81;b<88;b++)assert(findPath(LOCATIONS,a,b));
 for(const chain of [[82,83,85,84,82],[82,84,85,83,82],[85,86,87,86,85]])for(let i=1;i<chain.length;i++)assert(LOCATIONS[chain[i-1]].routes.some(r=>r.to===chain[i]));
 assert.equal(findPath(LOCATIONS,81,0),null);assert.equal(findPath(LOCATIONS,0,81),null);
 const angleGap=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
 assert(Math.abs(angleGap(forum.LOCATIONS[1].routes[1].angle,forum.LOCATIONS[1].routes[2].angle)-Math.PI/2)<.02);
 assert(Math.abs(angleGap(forum.LOCATIONS[4].routes[0].angle,forum.LOCATIONS[4].routes[1].angle)-Math.PI/2)<.02);
 assert.notEqual(forum.LOCATIONS[2].routes[1].arrivalAngle,forum.LOCATIONS[3].routes[1].arrivalAngle);
 const hall=HALLS.find(h=>h.id==='student-forums'),building=buildingForLegacyHall(hall.id);
 assert.equal(hall.code,'A6');assert.deepEqual(hall.mapCoordinates,artworkPoint(...BUILDING_ANCHORS.A6));assert.equal(building.id,'building-a6');assert.equal(building.tour.scene,'student-forums-071');assert.equal(building.rooms.length,7);assert.equal(CAMPUS_BUILDINGS.length,86);
 for(const [query,lang]of [['A6','en'],['Student Forums','en'],['ملتقى الطلاب','ar'],['Left-Side Checkpoint','en'],['نقطة الجانب الأيمن','ar']])assert.equal(searchHalls(CAMPUS_BUILDINGS,query,lang)[0].hall.id,'building-a6');
 // Explicit baseline protects old scene IDs, routes, calibration and renderer.
 const baseline='e5e35ca5388dc77c2034cf6f1b92b35a6a4b3807',git=process.env.HALLV3_GIT||'git';
 for(const rel of ['routes/m7a.js','routes/theater.js','routes/library.js','routes/mens-hall.js','routes/c4.js','routes/al-zahra.js','tour.js','tour-renderer.js']){
  const tracked='M7A_GitHub_Website_Full_Resolution/m7a-building/'+rel;
  const before=execFileSync(git,['rev-parse',baseline+':'+tracked],{encoding:'utf8'}).trim(),after=execFileSync(git,['hash-object',path.join(root,rel)],{encoding:'utf8'}).trim();assert.equal(after,before,rel+' unchanged');
 }
 const geometryBefore=execFileSync(git,['show',baseline+':M7A_GitHub_Website_Full_Resolution/m7a-building/campus-geometry.js'],{encoding:'utf8'}).replace(/\r/g,'');
 const geometryAfter=fs.readFileSync(path.join(root,'campus-geometry.js'),'utf8').replace(/\r/g,'').replace(/^  A6:\[\[.*\]\],\n/m,'');assert.equal(geometryAfter,geometryBefore,'Existing artwork anchors, footprints and camera policy unchanged');
 console.log('PASS Student Forums: 7 original-byte/full-resolution assets, mobile derivatives, exact 14 links, both loops, isolated graph, separate arrivals, A6 anchor/search and unchanged existing halls/renderer');
 console.log('REVIEW 75→76: owner must confirm the walkable approach around the seating row; connectivity and onward bearing are retained.');
})().catch(error=>{console.error(error);process.exitCode=1;});
