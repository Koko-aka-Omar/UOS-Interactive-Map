const CACHE_PREFIX='m7a-tour:'+self.registration.scope+':';
const SHELL_CACHE=CACHE_PREFIX+'shell-v38';
// Bump only when panorama files change; UI releases retain full-resolution downloads.
const PANORAMA_CACHE=CACHE_PREFIX+'panoramas-v3';
const LEGACY_CACHE='m7a-tour-v7';
const CORE_ASSETS=['./','./index.html','./halls.js','./campus-directory.js','./directions.js','./favicon.svg','./manifest.webmanifest','./apple-touch-icon.png','./social-preview.png','./campus-map-2026.webp'];
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
  'library-study-025','library-study-026','library-study-027','library-study-028','library-study-029'
];
const PANORAMAS=new Set(
  ['assets','assets-mobile'].flatMap(dir=>
    PANORAMA_NAMES.map(name=>new URL('./'+dir+'/'+name+'.glb',self.registration.scope).href)
  )
);
const INDEX_URL=new URL('./index.html',self.registration.scope).href;

async function cached(name,request){
  try{return await (await caches.open(name)).match(request);}
  catch{return undefined;}
}
async function save(name,request,response){
  if(response.status!==200)return;
  try{await (await caches.open(name)).put(request,response);}
  catch(error){console.warn('Tour cache unavailable; continuing online.',error);}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    // Storage restrictions must not stop an online tour from working.
    try{
      const cache=await caches.open(SHELL_CACHE);
      await cache.addAll(CORE_ASSETS);
    }catch(error){console.warn('Tour shell cache unavailable.',error);}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{
      const keys=await caches.keys();
      // Preserve downloads from the existing worker without fetching them again.
      if(keys.includes(LEGACY_CACHE)){
        const legacy=await caches.open(LEGACY_CACHE);
        const requests=await legacy.keys();
        for(const request of requests){
          if(PANORAMAS.has(request.url)&&!await cached(PANORAMA_CACHE,request)){
            const response=await legacy.match(request);
            if(response)await save(PANORAMA_CACHE,request,response);
          }
        }
        // Keep the legacy cache if storage failed or it contains another site's data.
        const migrated=await Promise.all(requests.filter(r=>PANORAMAS.has(r.url)).map(r=>cached(PANORAMA_CACHE,r)));
        if(requests.every(r=>r.url.startsWith(self.registration.scope))&&migrated.every(Boolean)){
          await caches.delete(LEGACY_CACHE);
        }
      }
      await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==SHELL_CACHE&&key!==PANORAMA_CACHE).map(key=>caches.delete(key)));
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

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope)||request.headers.has('range'))return;
  const writes=[];
  const response=(async()=>{
    if(PANORAMAS.has(url.href))return panorama(request,writes);
    // Only the tour entry page and known shell resources belong in this cache.
    const shell=CORE_ASSETS.some(path=>new URL(path,self.registration.scope).href===url.href);
    if(!shell)return fetch(request);
    if(request.mode==='navigate'){
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
    const hit=await cached(SHELL_CACHE,request);
    const refresh=fetch(request).then(async fresh=>{
      await save(SHELL_CACHE,request,fresh.clone());
      return fresh;
    });
    if(hit){
      writes.push(refresh.catch(()=>{}));
      return hit;
    }
    return refresh;
  })();
  event.respondWith(response);
  // Keep the worker alive until streamed downloads have finished writing.
  event.waitUntil(response.then(()=>Promise.all(writes)).catch(()=>{}));
});

self.addEventListener('message',event=>{
  // The first visit can finish its initial download before this worker controls it.
  if(event.data?.type!=='CACHE_VIEWED_PANORAMA'||!PANORAMAS.has(event.data.url))return;
  event.waitUntil((async()=>{
    const request=new Request(event.data.url,{cache:'force-cache'});
    const writes=[];
    await panorama(request,writes);
    await Promise.all(writes);
  })().catch(error=>console.warn('Viewed panorama could not be cached.',error)));
});

