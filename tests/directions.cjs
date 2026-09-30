const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../M7A_GitHub_Website_Full_Resolution/m7a-building');
function loadExports(file,names){
  let source=fs.readFileSync(file,'utf8');
  source=source.replace(/^import .*$/gm,'').replace(/\bexport\s+(?=(const|let|var|function|class)\b)/g,'');
  source+='\nmodule.exports={'+names.join(',')+'};';
  const sandbox={module:{exports:{}},exports:{},console};
  vm.runInNewContext(source,sandbox,{filename:file});
  return sandbox.module.exports;
}
const routeIndex=fs.readFileSync(path.join(root,'tour-routes.js'),'utf8');
const routeFiles=[...routeIndex.matchAll(/from\s+['"]\.\/routes\/([^'"]+\.js)['"]/g)].map(match=>match[1]);
const locations=routeFiles.flatMap(file=>loadExports(path.join(root,'routes',file),['LOCATIONS']).LOCATIONS);
const byId=id=>locations.findIndex(item=>item.id===id);
(async()=>{
  const {findPath}=await import('data:text/javascript;base64,'+fs.readFileSync(path.join(root,'directions.js')).toString('base64'));
  assert.equal(locations.length,88,'all 88 current checkpoints loaded');
  const unseen=new Set(locations.map((_,i)=>i)),components=[];
  while(unseen.size){
    const start=unseen.values().next().value,queue=[start],component=[];
    unseen.delete(start);
    while(queue.length){
      const at=queue.shift();component.push(at);
      const neighbors=new Set([...(locations[at].routes||[]).map(route=>route.to),...locations.flatMap((loc,index)=>(loc.routes||[]).some(route=>route.to===at)?[index]:[])]);
      for(const next of neighbors)if(unseen.delete(next))queue.push(next);
    }
    components.push(component);
  }
  assert.equal(components.length,6,"M7A, Auditorium/Library, Men's Hall, C4, Al Zahra, and Student Forums form six standalone connected components");
  for(const component of components)for(const from of component)for(const to of component){
    const route=findPath(locations,from,to);assert(route,locations[from].id+' reaches '+locations[to].id);
    assert.equal(route[0],from);assert.equal(route.at(-1),to);assert.equal(new Set(route).size,route.length);
    route.slice(1).forEach((next,i)=>assert(locations[route[i]].routes.some(edge=>edge.to===next)));
  }
  assert.deepEqual(findPath(locations,byId('entrance'),byId('m7a-002')).map(i=>locations[i].id),['entrance','study-junction','hall-end','m7a-002']);
  const mensStart=byId('mens-hall-078'),mensEnd=byId('mens-hall-088');
  assert.deepEqual(findPath(locations,mensStart,mensEnd).map(i=>locations[i].id),Array.from({length:11},(_,n)=>'mens-hall-'+String(78+n).padStart(3,'0')));
  assert.deepEqual(findPath(locations,mensEnd,mensEnd),[mensEnd]);
  assert.equal(findPath([{routes:[]},{routes:[]}],0,1),null);
  assert.equal(findPath(locations,-1,mensEnd),null);
  console.log('PASS all '+locations.length+' checkpoints across '+components.length+' connected components');
})().catch(error=>{console.error(error);process.exitCode=1;});
