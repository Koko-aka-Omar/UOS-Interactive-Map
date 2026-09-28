importScripts('./tour-assets.generated.js');

const ASSET_MANIFEST=self.UOS_TOUR_ASSETS;
const CACHE_PREFIX='uos-tour:'+self.registration.scope+':';
const SHELL_CACHE=CACHE_PREFIX+'shell-'+ASSET_MANIFEST.buildId;
const PANORAMA_CACHE=CACHE_PREFIX+'panoramas-v4';
const LEGACY_CACHES=['m7a-tour-v7','m7a-tour:'+self.registration.scope+':panoramas-v3',CACHE_PREFIX+'panoramas-v3'];

const CORE_ASSETS=['./',...ASSET_MANIFEST.coreAssets];
const EXTERNAL_ASSETS=[
  'https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js',
  'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js',
  'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/BufferGeometryUtils.js'
];
const CDN_ORIGINS=new Set(['https://unpkg.com','https://cdn.jsdelivr.net']);
const STATIC_FILE=/\.(?:js|css|json|webmanifest|svg|png|webp|jpe?g)$/i;
const PANORAMAS=new Set(
  ['desktop','mobile'].flatMap(mode=>{
    const dir=mode==='mobile'?'assets-mobile':'assets';
    return ASSET_MANIFEST.panoramaFiles.map(file=>{
      const revision=ASSET_MANIFEST.panoramaRevisions[mode]?.[file];
      return new URL('./'+dir+'/'+file+(revision?'?rev='+revision:''),self.registration.scope).href;
    });
  })
);
const INDEX_URL=new URL('./index.html',self.registration.scope).href;
const CORE_URLS=new Set(CORE_ASSETS.map(path=>new URL(path,self.registration.scope).href));
const EXTERNAL_URLS=new Set(EXTERNAL_ASSETS);

async function cached(name,request){
  try{return await (await caches.open(name)).match(request);}
  catch{return undefined;}
}
async function save(name,request,response){
  if(!(response.ok||response.type==='opaque'))return;
  try{await (await caches.open(name)).put(request,response);}
  catch(error){console.warn('Tour cache unavailable; continuing online.',error);}
}
async function warmShell(){
  const cache=await caches.open(SHELL_CACHE);
  for(const url of [...CORE_URLS,...EXTERNAL_URLS]){
    try{
      const request=new Request(url,{cache:'reload'});
      const response=await fetch(request);
      if(response.ok||response.type==='opaque')await cache.put(request,response);
    }catch(error){console.warn('Could not pre-cache',url,error);}
  }
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    try{await warmShell();}catch(error){console.warn('Tour shell cache unavailable.',error);}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{
      const keys=await caches.keys();
      // Preserve existing panorama downloads from older cache names.
      for(const legacyName of LEGACY_CACHES){
        if(legacyName===PANORAMA_CACHE||!keys.includes(legacyName))continue;
        const legacy=await caches.open(legacyName);
        const requests=await legacy.keys();
        for(const request of requests){
          if(PANORAMAS.has(request.url)&&!await cached(PANORAMA_CACHE,request)){
            const response=await legacy.match(request);
            if(response)await save(PANORAMA_CACHE,request,response);
          }
        }
      }
      await Promise.all(keys.filter(key=>
        (key.startsWith('m7a-tour:')||key.startsWith(CACHE_PREFIX))&&
        key!==SHELL_CACHE&&key!==PANORAMA_CACHE
      ).map(key=>caches.delete(key)));
    }catch(error){console.warn('Tour cache maintenance unavailable.',error);}
    await self.clients.claim();
  })());
});

async function panorama(request,writes){
  const hit=await cached(PANORAMA_CACHE,request);
  if(hit)return hit;
  const response=await fetch(request);
  writes.push(save(PANORAMA_CACHE,request,response.clone()));
  return response;
}

async function shellAsset(request,writes){
  const hit=await cached(SHELL_CACHE,request);
  const refresh=fetch(request).then(async fresh=>{
    if(fresh.ok||fresh.type==='opaque')await save(SHELL_CACHE,request,fresh.clone());
    return fresh;
  });
  if(hit){
    writes.push(refresh.catch(()=>{}));
    return hit;
  }
  return refresh;
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||request.headers.has('range'))return;
  const sameOrigin=url.origin===self.location.origin;
  const supportedExternal=CDN_ORIGINS.has(url.origin);
  if(!sameOrigin&&!supportedExternal)return;

  const writes=[];
  const response=(async()=>{
    if(sameOrigin&&PANORAMAS.has(url.href))return panorama(request,writes);

    if(sameOrigin&&request.mode==='navigate'){
      try{
        const fresh=await fetch(request);
        if(fresh.ok){
          writes.push(save(SHELL_CACHE,INDEX_URL,fresh.clone()));
          return fresh;
        }
        return await cached(SHELL_CACHE,INDEX_URL)||fresh;
      }catch(error){
        const hit=await cached(SHELL_CACHE,INDEX_URL);
        if(hit)return hit;
        throw error;
      }
    }

    const explicit=CORE_URLS.has(url.href)||EXTERNAL_URLS.has(url.href);
    const staticAsset=STATIC_FILE.test(url.pathname);
    if(!explicit&&!staticAsset)return fetch(request);
    return shellAsset(request,writes);
  })();

  event.respondWith(response);
  event.waitUntil(response.then(()=>Promise.all(writes)).catch(()=>{}));
});

self.addEventListener('message',event=>{
  if(event.data?.type!=='CACHE_VIEWED_PANORAMA'||!PANORAMAS.has(event.data.url))return;
  event.waitUntil((async()=>{
    const request=new Request(event.data.url,{cache:'force-cache'});
    const writes=[];
    await panorama(request,writes);
    await Promise.all(writes);
  })().catch(error=>console.warn('Viewed panorama could not be cached.',error)));
});
