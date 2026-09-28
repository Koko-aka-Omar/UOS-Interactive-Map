import * as THREE from 'three';

export function createPanoramaRenderer({app,coarsePointer,cameraHeight=0.45}){
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,0.01,50);
  camera.position.set(0,cameraHeight,0);
  camera.rotation.order='YXZ';

  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  function renderQuality(enhanced=false){
    // Merged quality settings only; these affect resolution, not panorama color.
    const pixelBudget=coarsePointer?(enhanced?3000000:1550000):12000000;
    const budget=Math.sqrt(pixelBudget/(innerWidth*innerHeight));
    renderer.setPixelRatio(coarsePointer
      ? Math.min(devicePixelRatio||1,enhanced?2:1.75,budget)
      : Math.max(1,Math.min(Math.max(devicePixelRatio,1.5),2.5,budget)));
  }
  renderQuality();
  renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  app.appendChild(renderer.domElement);
  const el=renderer.domElement;

  // Compatibility surface retained for the merged renderer refactor.
  // All controls are neutral and renderPanoramaFrame applies no post-processing.
  const postUniforms={
    uContrast:{value:1},
    uSaturation:{value:1},
    uVibrance:{value:0},
    uShadowLift:{value:0},
    uHighlightRollOff:{value:0},
    uBlackPoint:{value:0},
    uGamma:{value:1},
    uBalance:{value:new THREE.Vector3(1,1,1)},
    uSharpness:{value:0},
    uVignette:{value:0}
  };
  function syncPostTargetSize(){}
  function renderPanoramaFrame(){renderer.render(scene,camera);}

  return {scene,camera,renderer,el,postUniforms,renderQuality,syncPostTargetSize,renderPanoramaFrame};
}
