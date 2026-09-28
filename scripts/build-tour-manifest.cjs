const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');

const repoRoot=path.join(__dirname,'..');
const root=path.join(repoRoot,'M7A_GitHub_Website_Full_Resolution','m7a-building');
const target=path.join(root,'tour-assets.generated.js');

const posix=p=>p.split(path.sep).join('/');
const stripQuery=s=>s.split(/[?#]/,1)[0];
const normalize=(from,spec)=>posix(path.normalize(path.join(path.dirname(from),stripQuery(spec))));

function loadExports(file,names){
  let source=fs.readFileSync(file,'utf8');
  source=source.replace(/^import .*$/gm,'').replace(/\bexport\s+(?=(const|let|var|function|class)\b)/g,'');
  source+='\nmodule.exports={'+names.join(',')+'};';
  const sandbox={module:{exports:{}},exports:{},console};
  vm.runInNewContext(source,sandbox,{filename:file});
  return sandbox.module.exports;
}
function gitBlob(rel){
  return execFileSync('git',['hash-object',path.join(root,rel)],{cwd:repoRoot,encoding:'utf8'}).trim();
}
function discoverCore(){
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const found=new Set();
  for(const match of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)(?:[?#][^"]*)?"/g))found.add(match[1].slice(2));
  for(const extra of ['campus-map-2026.webp','social-preview.png'])found.add(extra);
  const queue=[...found].filter(file=>file.endsWith('.js')&&file!=='tour-assets.generated.js');
  const seen=new Set();
  while(queue.length){
    const rel=queue.shift();
    if(seen.has(rel))continue;
    seen.add(rel);
    const full=path.join(root,rel);
    if(!fs.existsSync(full))throw new Error('Missing imported core file: '+rel);
    const source=fs.readFileSync(full,'utf8');
    for(const match of source.matchAll(/(?:from\s+|import\s*)['"](\.\.?\/[^'"]+)['"]/g)){
      const child=normalize(rel,match[1]);
      if(!child.startsWith('../')){
        found.add(child);
        if(child.endsWith('.js'))queue.push(child);
      }
    }
  }
  return [...found].sort();
}
function routeModules(){
  const source=fs.readFileSync(path.join(root,'tour-routes.js'),'utf8');
  return [...source.matchAll(/from\s+['"](\.\/routes\/[^'"]+\.js)['"]/g)].map(match=>match[1].slice(2));
}
function buildManifest(){
  const routes=routeModules();
  const panoramas=routes.flatMap(rel=>loadExports(path.join(root,rel),['PANORAMAS']).PANORAMAS);
  const core=discoverCore();
  const buildSeed=core.filter(rel=>rel!=='tour-assets.generated.js').map(rel=>rel+':'+gitBlob(rel)).join('\n');
  const buildId=crypto.createHash('sha1').update('blob '+Buffer.byteLength(buildSeed)+'\0').update(buildSeed).digest('hex').slice(0,12);
  const revisions={desktop:{},mobile:{}};
  for(const file of panoramas){
    revisions.desktop[file]=gitBlob('assets/'+file).slice(0,12);
    revisions.mobile[file]=gitBlob('assets-mobile/'+file).slice(0,12);
  }
  return {schema:1,buildId,coreAssets:core.map(rel=>'./'+rel),routeModules:routes.map(rel=>'./'+rel),panoramaFiles:panoramas,panoramaRevisions:revisions};
}
const expected=buildManifest();
const output='globalThis.UOS_TOUR_ASSETS=Object.freeze('+JSON.stringify(expected,null,2)+');\n';
if(process.argv.includes('--check')){
  const current=fs.existsSync(target)?fs.readFileSync(target,'utf8'):'';
  if(current!==output){
    let actual=null;
    try{
      const sandbox={globalThis:{}};
      vm.runInNewContext(current,sandbox);
      actual=sandbox.globalThis.UOS_TOUR_ASSETS;
    }catch{}
    console.error('tour-assets.generated.js is stale. Run: node scripts/build-tour-manifest.cjs');
    console.error('expected buildId:',expected.buildId,'actual:',actual?.buildId);
    console.error('expected core:',expected.coreAssets);
    console.error('actual core:',actual?.coreAssets);
    console.error('expected routes:',expected.routeModules);
    console.error('actual routes:',actual?.routeModules);
    process.exit(1);
  }
  console.log('PASS generated tour asset manifest is current');
}else{
  fs.writeFileSync(target,output);
  console.log('Wrote '+path.relative(repoRoot,target));
}
