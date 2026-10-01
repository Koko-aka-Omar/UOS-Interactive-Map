const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const load=file=>import(pathToFileURL(path.join(__dirname,'../M7A_GitHub_Website_Full_Resolution/m7a-building',file)).href);
(async()=>{
  const {CAMPUS_BUILDINGS:halls,buildingForLegacyHall}=await load('campus-buildings.js');
  const {CATEGORIES,SOURCES,BUILDING_RECORDS,SUPPLEMENTAL_PLACES}=await load('campus-inventory.js');
  const {ARTWORK_VERSION,artworkPoint,CAMPUS_CORNERS,campusBoundsCamera}=await load('campus-geometry.js');
  const {matchesFilters,sanitizeCampusState,createCampusStateStore}=await load('campus-state.js');
  const {searchHalls,filterCampus,sourceCaption}=await load('campus-directory.js');
  assert.equal(sourceCaption('LIBRARY','en'),'Library website');
  assert.equal(sourceCaption('LIBRARY-LOCATIONS','ar'),'مواقع المكتبات');
  assert.notEqual(sourceCaption('LIBRARY','en'),sourceCaption('LIBRARY-LOCATIONS','en'));
  for(const [id,source]of Object.entries(SOURCES))if(source.kind==='official-web'){
    assert(!/https:|user-supplied|repository|UOS news:/i.test(sourceCaption(id,'en')));
    assert(/[\u0600-\u06ff]/.test(sourceCaption(id,'ar')));
  }
  assert.equal(BUILDING_RECORDS.length,76);assert.equal(SUPPLEMENTAL_PLACES.length,10);
  assert.equal(new Set(halls.map(hall=>hall.id)).size,86);
  for(const hall of halls){
    assert(hall.name.en&&hall.name.ar&&hall.description.en&&hall.description.ar);
    assert(hall.sourceIds.every(id=>SOURCES[id]));assert(hall.categories.every(id=>CATEGORIES[id]));
  }
  assert(BUILDING_RECORDS.every(hall=>hall.code&&!/^E1[2-5]$/.test(hall.code)));
  assert.equal(halls.filter(hall=>hall.code&&!hall.anchor).length,0);
  assert.equal(halls.filter(hall=>hall.tour).length,7);
  assert.equal(buildingForLegacyHall('student-forums').code,'A6');
  assert.equal(halls.find(hall=>hall.code==='A6').tour.scene,'student-forums-071');
  assert(!halls.find(hall=>hall.code==='C6').tour);
  assert.equal(buildingForLegacyHall('e3').code,'E4');
  assert(!halls.find(hall=>hall.code==='E3').tour);
  assert(halls.find(hall=>hall.code==='A9').description.en.includes('Business'));
  assert(halls.find(hall=>hall.code==='C2').name.en.includes('Farabi'));
  assert(halls.find(hall=>hall.code==='H5').name.en.includes('Hind'));
  assert(halls.find(hall=>hall.code==='H6').name.en.includes('Safiya'));
  assert(halls.find(hall=>hall.code==='A5').categories.includes('student-services'));
  assert(halls.find(hall=>hall.code==='C5').categories.includes('student-services'));
  assert.deepEqual(artworkPoint(0,0),CAMPUS_CORNERS[0]);
  assert.deepEqual(artworkPoint(900,4118),CAMPUS_CORNERS[2]);
  // Card padding must reduce the available rectangle once, including after resize.
  const bounds=[[0,0],[1,0]],zero={top:0,right:0,bottom:0,left:0};
  const full=campusBoundsCamera(bounds,1024,768,zero,20);
  const beside=campusBoundsCamera(bounds,1024,768,{...zero,left:512},20);
  assert(Math.abs(full.zoom-beside.zoom-1)<1e-10);
  assert.deepEqual(beside.center,full.center);
  assert.equal(campusBoundsCamera(bounds,1024,768,zero,8).zoom,8);
  assert.equal(full.bearing,0);assert.equal(full.pitch,0);
  assert.equal(halls.filter(hall=>matchesFilters(hall,'dining',true)).length,2);
  assert.equal(halls.filter(hall=>matchesFilters(hall,'libraries',true)).length,1);
  assert.equal(searchHalls(halls,'M7 A','en')[0].hall.code,'A11');
  assert.equal(searchHalls(halls,'E٤','ar')[0].hall.code,'E4');
  assert.equal(searchHalls(halls,'Al Zahra','en')[0].hall.code,'C2');
  // Everyday campus qualifiers distinguish otherwise repeated building names.
  for (const query of ['mens library', "men's library", 'men library'])
    assert.deepEqual(searchHalls(halls,query).map(item=>item.hall.code),['A7']);
  assert.deepEqual(searchHalls(halls,'womens library').map(item=>item.hall.code),['C7']);
  assert.deepEqual(searchHalls(halls,'medical library').map(item=>item.hall.code),['E4']);
  assert.deepEqual(searchHalls(halls,'مكتبة الطلاب','ar').map(item=>item.hall.code),['A7']);
  assert.deepEqual(searchHalls(halls,'مكتبة الطالبات','ar').map(item=>item.hall.code),['C7']);
  assert.equal(searchHalls(halls,'Administration Building of the Colleges of Medical and Health Sciences')[0].hall.code,'E3');
  assert.equal(searchHalls(halls,'University Dental Hospital Sharjah')[0].hall.code,'E11');
  const camera={center:[55.47,25.28],zoom:16.237,bearing:0,pitch:0,padding:{top:3,right:4,bottom:5,left:6}};
  const state={version:1,artwork:ARTWORK_VERSION,camera,selectedId:'building-a11',roomId:'m7a-002',activeCategory:'libraries',toursOnly:true,query:'002',collapsed:true,sheetExpanded:true,scroll:47};
  const migrated=sanitizeCampusState(state,halls,CATEGORIES);
  assert.equal(migrated.version,2);assert.equal(migrated.snap,'peek');assert.equal(migrated.mode,'details');
  assert.equal(migrated.detailScroll,47);assert.equal(migrated.resultsScroll,0);assert.deepEqual(migrated.camera,camera);
  assert.deepEqual(sanitizeCampusState(migrated,halls,CATEGORIES),migrated);
  assert.equal(sanitizeCampusState({...state,collapsed:false},halls,CATEGORIES).snap,'expanded');
  assert.equal(sanitizeCampusState({...state,collapsed:false,sheetExpanded:false},halls,CATEGORIES).snap,'half');
  assert.equal(sanitizeCampusState({...migrated,snap:'garbage',mode:'bad'},halls,CATEGORIES).snap,'peek');
  const complete={...migrated,snap:'expanded',mode:'results',resultsScroll:345,detailScroll:89,sections:{'building-a11':{inside:true,sources:true}}};
  assert.deepEqual(sanitizeCampusState(complete,halls,CATEGORIES),complete);
  assert.equal(new Set(filterCampus(halls,'C4','dining',true).map(item=>item.hall.id)).size,1);
  assert.equal(filterCampus(halls,'E4','dining',true).length,0);
  assert.equal(filterCampus(halls,'E٤','libraries',true,'ar')[0].hall.code,'E4');
  for(const hall of halls){
    const prose=hall.description.en+' '+hall.description.ar+' '+(hall.publicNotice?.en||'');
    assert(!/HallV3|repository|map lists|supplied map|source says|listed for|identified in Zone|تدرج الخريطة|الخريطة المرفقة/i.test(prose),hall.id+' has institutional copy');
  }
  assert(halls.find(h=>h.code==='A1').publicNotice.en.includes('confirm'));
  assert(halls.find(h=>h.code==='A12').publicNotice.en.includes('confirm'));
  assert(halls.find(h=>h.code==='B2').publicNotice.en.includes('B1-A'));
  assert.equal(halls.find(h=>h.code==='E10').description.en,'Building E10 on the medical campus.');
  const stale=sanitizeCampusState({...state,roomId:'missing',activeCategory:'missing'},halls,CATEGORIES);
  assert.deepEqual(stale.camera,camera);assert.equal(stale.roomId,null);assert.equal(stale.activeCategory,null);
  assert.equal(sanitizeCampusState({...state,selectedId:'missing'},halls,CATEGORIES).selectedId,null);
  assert.deepEqual(sanitizeCampusState({...state,activeCategory:{toString:{}}},halls,CATEGORIES).camera,camera);
  assert.equal(sanitizeCampusState({...state,artwork:'old'},halls,CATEGORIES),null);
  for(const stored of ['{bad',null,'[]']){
    const store=createCampusStateStore(halls,CATEGORIES,()=>({getItem:()=>stored,setItem:()=>{throw Error('denied');}}));
    assert.equal(store.read(),null);store.write(state);assert.deepEqual(store.read(),migrated);
  }
  const denied=createCampusStateStore(halls,CATEGORIES,()=>{throw Error('denied');});
  assert.equal(denied.read(),null);denied.write(complete);assert.deepEqual(denied.read(),complete);
  console.log('PASS inventory, all 76 building anchors, legacy bindings, bilingual aliases/numerals, filters and safe state persistence');
})().catch(error=>{console.error(error);process.exitCode=1;});
