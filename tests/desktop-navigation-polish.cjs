// Source regressions; browser interaction assertions are in desktop-navigation-browser.cjs.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../M7A_GitHub_Website_Full_Resolution/m7a-building');
const routes=[];for(const file of ['m7a','theater','library','mens-hall','c4','al-zahra']){const c={};vm.runInNewContext(fs.readFileSync(path.join(root,'routes',file+'.js'),'utf8').replace(/export const/g,'var'),c);routes.push(...c.LOCATIONS);}
const index=id=>routes.findIndex(l=>l.id===id),targets=id=>Array.from(routes[index(id)].routes,r=>routes[r.to].id);
assert(!targets('library-corridor-041').includes('library-study-026'));assert(!targets('library-study-026').includes('library-corridor-041'));
for(const [a,b]of [['library-corridor-041','library-study-024'],['library-study-024','library-corridor-032']]){assert(targets(a).includes(b));assert(targets(b).includes(a));}
assert.deepEqual(targets('library-study-024').sort(),['library-study-023','library-study-025','library-corridor-041','library-corridor-032'].sort());
assert(targets('library-study-026').includes('library-study-025'));assert(targets('library-corridor-032').includes('library-corridor-031'));
for(const l of routes){assert.equal(new Set(l.routes.map(r=>r.to)).size,l.routes.length);for(const r of l.routes)assert(routes[r.to]);}
const reached=new Set(),visit=i=>{if(reached.has(i))return;reached.add(i);routes[i].routes.forEach(r=>visit(r.to));};visit(index('library-entrance-018'));assert.equal([...reached].filter(i=>routes[i].area==='Library').length,routes.filter(l=>l.area==='Library').length);
const directory=fs.readFileSync(path.join(root,'campus-directory.js'),'utf8'),geometry=fs.readFileSync(path.join(root,'campus-geometry.js'),'utf8');
(async()=>{const load=async source=>import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));const g=await load(geometry);const support=fs.readFileSync(path.join(root,'campus-state.js'),'utf8').replace(/^import.*$/gm,'')+'\n'+fs.readFileSync(path.join(root,'campus-inventory.js'),'utf8');const d=await load(support+'\n'+directory.replace(/^import.*$/gm,''));
assert.equal(d.normalizeSearch('  إِلـى ۴٢ '),'الي 42');
const halls=[{id:'e14',code:'E14',name:{en:'Other',ar:'آخر'},categories:[]},{id:'e4',code:'E4',name:{en:'Library',ar:'المكتبة'},aliases:['M7A legacy'],categories:['libraries'],tour:{scene:'x'},rooms:[]}];
assert.equal(d.filterCampus(halls,'E4','',false,'en')[0].hall.id,'e4');assert.equal(d.filterCampus(halls,'المكتبة','',false,'en')[0].hall.id,'e4');assert.equal(d.filterCampus(halls,'books','',false,'ar')[0].hall.id,'e4');
for(const [w,h]of [[1366,768],[1440,900],[1920,1080],[390,844],[844,390]]){const policy=g.campusCameraPolicy(w,h),view={center:[55.477,25.280],zoom:(policy.minZoom+policy.maxZoom)/2,padding:{top:3,right:5,bottom:2,left:6}};assert.deepEqual(g.clampCampusCamera(view,policy),{...view,bearing:0,pitch:0});assert.equal(g.clampCampusCamera({...view,zoom:99},policy).zoom,policy.maxZoom);assert.equal(g.clampCampusCamera({...view,zoom:-99},policy).zoom,policy.minZoom);}
console.log('PASS exact Library topology, reachability, bilingual ranking and viewport map constraints');})().catch(e=>{console.error(e);process.exitCode=1;});
