const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const root=path.resolve(__dirname,'../M7A_GitHub_Website_Full_Resolution/m7a-building'),load=file=>import(pathToFileURL(path.join(root,file)).href);
 const {LOCATIONS,mediaForScene}=await load('tour-routes.js'),{SCENE_PREVIEWS}=await load('scene-previews.generated.js'),{previewForScene,coverForBuilding}=await load('scene-previews.js'),{CAMPUS_BUILDINGS}=await load('campus-buildings.js');
 assert.equal(Object.keys(SCENE_PREVIEWS).length,LOCATIONS.length);
 for(const scene of LOCATIONS){const photo=previewForScene(scene.id);assert(photo,scene.id);assert.equal(photo.sceneId,scene.id);assert.equal(photo.source.file,mediaForScene(scene.id).file);assert.equal(photo.width,960);assert.equal(photo.height,540);assert([photo.yaw,photo.pitch,photo.fov].every(Number.isFinite));assert(/^[a-f0-9]{40}$/.test(photo.revision));assert(/^[a-f0-9]{16}$/.test(photo.imageRevision));assert.equal(photo.url,photo.path+'?rev='+photo.imageRevision);assert(fs.existsSync(path.join(root,photo.path)));assert(photo.bytes<350000,scene.id+' modest weight');}
 for(const building of CAMPUS_BUILDINGS.filter(b=>b.tour?.scene))assert(coverForBuilding(building),building.code);
 const manifest=fs.readFileSync(path.join(root,'tour-assets.generated.js'),'utf8');assert(!manifest.includes('"./previews/'),'Previews are not installation precache');
 assert.equal(previewForScene('student-forums-073').source.file,'student-forums-074.glb');assert.equal(previewForScene('student-forums-074').source.file,'student-forums-073.glb');
 console.log('PASS '+LOCATIONS.length+' scene-specific previews, seven real building covers, corrected A6 identities, metadata/weight and no all-preview precache');
})().catch(e=>{console.error(e);process.exitCode=1;});
