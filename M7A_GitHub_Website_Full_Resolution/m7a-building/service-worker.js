const CACHE_PREFIX='uos-tour:'+self.registration.scope+':';
const SHELL_CACHE=CACHE_PREFIX+'shell-v62';
// Keep panorama downloads across UI releases.
const PANORAMA_CACHE=CACHE_PREFIX+'panoramas-v3';
const LEGACY_CACHES=['m7a-tour-v7','m7a-tour:'+self.registration.scope+':panoramas-v3'];

const CORE_ASSETS=[
  './','./index.html',
  './styles.css?v=20260927-system1','./ui-polish.css?v=20260927-vivid1',
  './tour-boot.js?v=20260927-3','./tour.js?v=20260927-uniform2',
  './tour-i18n.js?v=20260927-vivid1','./halls.js?v=20260927-final2',
  './campus-directory.js?v=20260927-final2','./campus-map-labels.js?v=20260927-3',
  './directions.js','./tour-routes.js?v=20260927-3',
  './routes/m7a.js','./routes/theater.js?v=20260927-3','./routes/library.js?v=20260927-3',
  './favicon.svg','./manifest.webmanifest','./apple-touch-icon.png','./social-preview.png','./campus-map-2026.webp'
];
const EXTERNAL_ASSETS=[
  'https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js',
  'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js',
  'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/BufferGeometryUtils.js'
];
const CDN_ORIGINS=new Set(['https://unpkg.com','https://cdn.jsdelivr.net']);
const STATIC_FILE=/\.(?:js|css|json|webmanifest|svg|png|webp|jpe?g)$/i;
const PANORAMA_NAMES=[
  'ground-entrance','ground-study-rooms','ground-hall-end',
  'top-stair-landing','top-faculty-offices','top-seating-area',
  'room-m7a-001','room-m7a-004','room-m7a-003','room-m7a-002',
  'theater-outer-entrance-a','theater-outer-entrance-b','theater-hall',
  'theater-foyer','theater-auditorium-rear','theater-auditorium-center',
  'theater-stage-011','theater-stage-012','theater-stage-013',
  'theater-stage-014','theater-stage-015','theater-stage-016',
  'theater-hall-017','library-entrance-018','library-lobby-019','library-study-020',
  'library-study-021','library-study-022','library-study-023','library-study-024',
  'library-study-025','library-study-026','library-study-027','library-study-028','library-study-029',
  'library-corridor-030', 'library-corridor-031', 'library-corridor-032', 'library-corridor-033', 'library-corridor-034', 'library-corridor-035', 'library-corridor-036', 'library-corridor-037', 'library-corridor-038', 'library-corridor-039', 'library-corridor-040', 'library-corridor-041',
  'mens-hall-078','mens-hall-079','mens-hall-080','mens-hall-081','mens-hall-082','mens-hall-083','mens-hall-084','mens-hall-085','mens-hall-086','mens-hall-087','mens-hall-088'
];
const PANORAMAS=new Set(
  ['assets','assets-mobile'].flatMap(dir=>
    PANORAMA_NAMES.map(name=>new URL('./'+dir+'/'+name+'.glb'+(name==='library-study-020'?'?v=20260927-study1':name==='library-study-021'?'?v=20260927-3':''),self.registration.scope).href)
  )
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
