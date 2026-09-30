// Derivatives only: enumerate the scene registry, never scan panorama directories.
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{spawnSync,execFileSync}=require('node:child_process');
(async()=>{
 const root=path.resolve(__dirname,'../M7A_GitHub_Website_Full_Resolution/m7a-building');
 const {LOCATIONS,mediaForScene}=await import(pathToFileURL(path.join(root,'tour-routes.js')).href);
 const covers={'al-zahra-004':'al-zahra','c4-004':'c4','mens-hall-079':'a4','theater-auditorium-center':'e2','library-study-024':'e4',entrance:'m7'};
 const plan=LOCATIONS.map(scene=>({sceneId:scene.id,source:mediaForScene(scene.id),revision:execFileSync('git',['rev-parse','HEAD:M7A_GitHub_Website_Full_Resolution/m7a-building/assets/'+mediaForScene(scene.id).file],{encoding:'utf8'}).trim(),yaw:-(scene.view??scene.routes[0]?.angle??0),pitch:scene.viewPitch??0,fov:covers[scene.id]?(scene.id==='entrance'?72:95):72,width:960,height:540,path:covers[scene.id]?'./covers/'+covers[scene.id]+'.jpg':'./previews/'+scene.id+'.jpg',reused:Boolean(covers[scene.id])}));
 if(process.argv.includes('--refresh-metadata')){
  const {SCENE_PREVIEWS}=await import(pathToFileURL(path.join(root,'scene-previews.generated.js')).href);
  for(const item of plan){const previous=SCENE_PREVIEWS[item.sceneId];if(!previous||previous.source.file!==item.source.file||['revision','yaw','pitch','fov','path','width','height'].some(key=>previous[key]!==item[key]))throw Error('Recapture required: '+item.sceneId);Object.assign(item,{sourceSha256:previous.sourceSha256,sourceDimensions:previous.sourceDimensions,keepCapture:true});}
 }
 const result=spawnSync(process.env.PYTHON||'python',[path.join(__dirname,'render-scene-previews.py'),root],{input:JSON.stringify(plan),encoding:'utf8',maxBuffer:4*1024*1024});
 process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');if(result.status)process.exit(result.status);
})().catch(error=>{console.error(error);process.exitCode=1;});
