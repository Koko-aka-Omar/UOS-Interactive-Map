import * as THREE from 'three';

export function createPanoramaRenderer({app,coarsePointer,cameraHeight=0.45}){
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,0.01,50);
  camera.position.set(0,cameraHeight,0);
  camera.rotation.order='YXZ';
  
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  function renderQuality(enhanced=false){
    // Slightly higher sampling than the original viewer for crisper signage, furniture and edges.
    // Mobile remains capped to avoid trading sharpness for unstable Safari GPU memory use.
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
  
  // Professional panorama post-processing. The source GLBs stay untouched; grading is reversible.
  const postScene=new THREE.Scene();
  const postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const postSize=new THREE.Vector2();
  const postTarget=new THREE.WebGLRenderTarget(1,1,{
    minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,
    depthBuffer:false,stencilBuffer:false
  });
  postTarget.texture.colorSpace=THREE.NoColorSpace;
  postTarget.texture.generateMipmaps=false;
  const postUniforms={
    tDiffuse:{value:postTarget.texture},
    texelSize:{value:new THREE.Vector2(1,1)},
    uContrast:{value:1.10},
    uSaturation:{value:1.18},
    uVibrance:{value:.11},
    uShadowLift:{value:.028},
    uHighlightRollOff:{value:.065},
    uBlackPoint:{value:.014},
    uGamma:{value:1},
    uBalance:{value:new THREE.Vector3(1,1,1)},
    uSharpness:{value:coarsePointer?.10:.16},
    uVignette:{value:.028}
  };
  const postMaterial=new THREE.ShaderMaterial({
    uniforms:postUniforms,toneMapped:false,depthTest:false,depthWrite:false,
    vertexShader:`
      varying vec2 vUv;
      void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}
    `,
    fragmentShader:`
      varying vec2 vUv;
      uniform sampler2D tDiffuse;
      uniform vec2 texelSize;
      uniform float uContrast,uSaturation,uVibrance,uShadowLift,uHighlightRollOff,uBlackPoint,uGamma,uSharpness,uVignette;
      uniform vec3 uBalance;
  
      float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
  
      void main(){
        vec3 center=texture2D(tDiffuse,vUv).rgb;
        vec3 north=texture2D(tDiffuse,vUv+vec2(0.0,texelSize.y)).rgb;
        vec3 south=texture2D(tDiffuse,vUv-vec2(0.0,texelSize.y)).rgb;
        vec3 east=texture2D(tDiffuse,vUv+vec2(texelSize.x,0.0)).rgb;
        vec3 west=texture2D(tDiffuse,vUv-vec2(texelSize.x,0.0)).rgb;
        vec3 localMean=(north+south+east+west)*.25;
        vec3 detail=clamp(center-localMean,vec3(-.07),vec3(.07));
        vec3 color=clamp(center+detail*uSharpness,0.0,1.0);
  
        // Tiny gray-world correction removes scene-to-scene fluorescent/blue casts without neutralizing real colors.
        color=clamp(color*uBalance,0.0,1.0);
  
        // Deeper blacks, recovered shadows and protected highlights.
        color=max((color-vec3(uBlackPoint))/max(.001,1.0-uBlackPoint),vec3(0.0));
        float y=luma(color);
        float shadow=1.0-smoothstep(.10,.52,y);
        color+=((1.0-color)*uShadowLift*shadow);
        y=luma(color);
        float highlight=smoothstep(.68,.98,y);
        color*=1.0-uHighlightRollOff*highlight;
  
        // Midtone shape, contrast, saturation and vibrance.
        color=pow(max(color,vec3(0.0)),vec3(1.0/max(.85,uGamma)));
        color=(color-.5)*uContrast+.5;
        y=luma(color);
        color=mix(vec3(y),color,uSaturation);
        float mx=max(color.r,max(color.g,color.b));
        float mn=min(color.r,min(color.g,color.b));
        float chroma=max(0.0,mx-mn);
        float vibranceGain=1.0+uVibrance*(1.0-smoothstep(.10,.62,chroma));
        y=luma(color);
        color=mix(vec3(y),color,vibranceGain);
  
        // Barely-visible screen-space vignette adds depth without looking stylized.
        float edge=vUv.x*(1.0-vUv.x)*vUv.y*(1.0-vUv.y)*16.0;
        float vignetteMask=pow(clamp(edge,0.0,1.0),.18);
        color*=mix(1.0-uVignette,1.0,vignetteMask);
  
        gl_FragColor=vec4(clamp(color,0.0,1.0),1.0);
        #include <colorspace_fragment>
      }
    `
  });
  const postQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),postMaterial);
  postQuad.frustumCulled=false;
  postScene.add(postQuad);
  
  function syncPostTargetSize(){
    renderer.getDrawingBufferSize(postSize);
    const w=Math.max(1,Math.round(postSize.x)),h=Math.max(1,Math.round(postSize.y));
    if(postTarget.width!==w||postTarget.height!==h)postTarget.setSize(w,h);
    postUniforms.texelSize.value.set(1/w,1/h);
  }
  function renderPanoramaFrame(){
    syncPostTargetSize();
    renderer.setRenderTarget(postTarget);
    renderer.render(scene,camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene,postCamera);
  }
  syncPostTargetSize();
  return {scene,camera,renderer,el,postUniforms,renderQuality,syncPostTargetSize,renderPanoramaFrame};
}
