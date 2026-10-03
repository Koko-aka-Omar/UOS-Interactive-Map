import { findCampusRoute, hasCampusRoute, sanitizeJourney } from './campus-paths.js';
import { artworkPoint } from './campus-geometry.js';
import { createRouteSparkles } from './campus-route-motion.js';

const STORAGE_KEY='uos-campus-journey-v1';
const SOURCE='campus-journey', ARROW='campus-journey-chevron';
const LAYERS=['campus-journey-glow','campus-journey-casing','campus-journey-road','campus-journey-links','campus-journey-arrows'];
const COPY={
  en:{route:'Route',title:'Plan a route',from:'Where are you?',to:'Where do you want to go?',choose:'Choose a building',search:'Search by name or building code',empty:'No matching main-campus buildings. Try a name or code.',hint:'Choose your starting building and destination on the main campus.',show:'Show route',fit:'Fit route',swap:'Swap start and destination',end:'End route',view:'View destination',here:'You are here',destination:'Destination',ready:'Your route is ready',follow:'Follow the highlighted campus paths. Dotted links connect to the building pins.',same:'You’re already at this building.',unavailable:'These buildings don’t have a connected map route.',manual:'Starting point selected by you',chooseFrom:'Choose your starting building',chooseTo:'Choose your destination'},
  ar:{route:'المسار',title:'تخطيط المسار',from:'أين أنت؟',to:'إلى أين تريد الذهاب؟',choose:'اختر مبنى',search:'ابحث بالاسم أو رمز المبنى',empty:'لا توجد مبانٍ مطابقة في الحرم الرئيسي. جرّب الاسم أو الرمز.',hint:'اختر مبنى البداية ووجهتك في الحرم الرئيسي.',show:'عرض المسار',fit:'عرض المسار بالكامل',swap:'تبديل البداية والوجهة',end:'إنهاء المسار',view:'عرض الوجهة',here:'أنت هنا',destination:'الوجهة',ready:'مسارك جاهز',follow:'اتبع الممرات المظللة في الحرم. تصل الخطوط المنقطة إلى علامات المباني.',same:'أنت بالفعل في هذا المبنى.',unavailable:'لا يوجد مسار متصل بين هذين المبنيين على الخريطة.',manual:'نقطة البداية التي اخترتها',chooseFrom:'اختر مبنى البداية',chooseTo:'اختر وجهتك'}
};

export function createCampusJourney({root,halls,searchHalls,language,onChange,onPlan,onFrame,onView}){
  const panel=root.querySelector('#campus-route-panel'),toggle=root.querySelector('#campus-route-toggle');
  const abort=new AbortController(),signal=abort.signal,pool=halls.filter(hasCampusRoute);
  let map=null,markers=[],route=null,sparkles=null,chooser=null,destroyed=false;
  let state=sanitizeJourney(null,pool);
  try{state=sanitizeJourney(JSON.parse(sessionStorage.getItem(STORAGE_KEY)),pool);}catch{/* Storage can be unavailable. */}
  const text=key=>COPY[language()][key],building=id=>pool.find(h=>h.id===id);
  const name=hall=>hall?.name[language()]||hall?.name.en||'';
  const caption=hall=>hall?(hall.code?hall.code+' · ':'')+name(hall):text('choose');
  const make=(tag,cls='',value='')=>{const el=document.createElement(tag);el.className=cls;el.textContent=value;return el;};
  const button=(cls,action)=>{const el=make('button',cls);el.type='button';el.onclick=action;return el;};
  const form=make('div','campus-journey-form'),fields=make('div','campus-journey-fields');
  const endpoints={};
  for(const key of ['from','to']){
    const el=button('campus-journey-endpoint',()=>openChooser(key));el.id='campus-route-'+key;
    const dot=make('span','campus-journey-dot'),labels=make('span','campus-journey-labels'),label=make('small'),value=make('strong');
    dot.setAttribute('aria-hidden','true');labels.append(label,value);el.append(dot,labels);fields.append(el);endpoints[key]={el,label,value};
  }
  const swap=button('campus-journey-swap',()=>{
    const wasActive=state.active;[state.fromId,state.toId]=[state.toId,state.fromId];state.active=false;route=null;
    if(wasActive)plan();else changed();
  });
  swap.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 19V5m-4 4 4-4 4 4m4-4v14m-4-4 4 4 4-4"/></svg>';
  fields.append(swap);
  const status=make('p','campus-journey-status');status.id='campus-route-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const primary=button('campus-journey-primary',()=>{if(state.active)frame();else plan();});primary.id='campus-route-show';
  const actions=make('div','campus-journey-actions'),view=button('',()=>onView(building(state.toId))),end=button('',()=>stop());
  view.id='campus-route-view';end.id='campus-route-end';actions.append(view,end);
  const hint=make('p','campus-journey-hint'),manual=make('small','campus-journey-manual');form.append(fields,status,primary,actions,hint,manual);
  const choices=make('div','campus-journey-choices'),heading=make('p','campus-journey-choose-title'),input=make('input','campus-journey-search');
  input.id='campus-route-search';input.name='route-building';input.type='search';input.autocomplete='off';input.spellcheck=false;input.setAttribute('aria-controls','campus-route-results');
  const results=make('div','campus-journey-results');results.id='campus-route-results';
  choices.append(heading,input,results);panel.append(form,choices);
  let notice=null;
  function persist(){try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{/* The route still works without storage. */}}
  function active(){return state.active&&route?{from:building(state.fromId),to:building(state.toId),route}:null;}
  function render(){
    toggle.textContent=text('route');toggle.classList.toggle('has-route',Boolean(active()));
    toggle.setAttribute('aria-label',text('title'));
    panel.querySelector('strong').textContent=text('title');
    for(const key of ['from','to']){const {el,label,value}=endpoints[key],hall=building(state[key+'Id']);label.textContent=text(key);value.textContent=caption(hall);el.classList.toggle('has-value',Boolean(hall));el.setAttribute('aria-label',text(key)+' '+caption(hall));}
    swap.setAttribute('aria-label',text('swap'));swap.title=text('swap');swap.disabled=!state.fromId&&!state.toId;
    primary.textContent=text(state.active?'fit':'show');primary.disabled=!state.fromId||!state.toId;
    status.textContent=text(notice||(state.active?'ready':'hint'));status.classList.toggle('is-ready',state.active);
    actions.hidden=!state.active;view.textContent=text('view');end.textContent=text('end');
    hint.hidden=!state.active;hint.textContent=text('follow');manual.textContent=text('manual');manual.hidden=!state.active;
    form.hidden=Boolean(chooser);choices.hidden=!chooser;
    heading.textContent=text(chooser==='from'?'chooseFrom':'chooseTo');
    input.placeholder=text('search');input.setAttribute('aria-label',heading.textContent);
    if(chooser)renderChoices();
  }
  function renderChoices(){
    results.replaceChildren();
    const matches=searchHalls(pool,input.value,language()).filter(item=>!item.room).slice(0,12);
    if(!matches.length)results.append(make('p','directory-empty',text('empty')));
    for(const {hall}of matches){
      const row=button('campus-journey-result',()=>choose(hall));row.dataset.buildingId=hall.id;
      const code=make('span','directory-code',hall.code||'');code.dir='ltr';
      row.append(code,make('span','',name(hall)));results.append(row);
    }
  }
  function openChooser(key){chooser=key;input.value='';render();input.focus({preventScroll:true});}
  function choose(hall){
    if(!chooser||!hasCampusRoute(hall))return;
    const key=chooser;state[key+'Id']=hall.id;state.active=false;route=null;notice=null;chooser=null;
    changed();endpoints[key].el.focus({preventScroll:true});
  }
  input.addEventListener('input',renderChoices,{signal});
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key==='ArrowDown'){const first=results.querySelector('button');if(first){event.preventDefault();if(event.key==='Enter')first.click();else first.focus();}}
  },{signal});
  results.addEventListener('keydown',event=>{
    if(!['ArrowUp','ArrowDown'].includes(event.key))return;
    const rows=[...results.querySelectorAll('button')],index=rows.indexOf(document.activeElement);event.preventDefault();
    if(event.key==='ArrowUp'&&index<=0)input.focus();else rows[Math.max(0,Math.min(rows.length-1,index+(event.key==='ArrowDown'?1:-1)))]?.focus();
  },{signal});
  panel.addEventListener('campus-route-back',event=>{if(chooser){event.preventDefault();const key=chooser;chooser=null;render();endpoints[key].el.focus({preventScroll:true});}},{signal});
  toggle.addEventListener('click',()=>{chooser=null;render();if(active())requestAnimationFrame(frame);},{signal});
  function changed(){persist();render();syncMap();onChange?.();}
  function plan(){
    route=findCampusRoute(building(state.fromId),building(state.toId));state.active=Boolean(route&&!route.sameBuilding);
    notice=route?.sameBuilding?'same':route?null:'unavailable';
    changed();if(state.active){onPlan?.(building(state.toId));frame();}
  }
  function stop(){state.active=false;route=null;notice=null;changed();}
  function frame(){if(active())onFrame(route.points);}
  function geoLine(points,kind){return {type:'Feature',properties:{kind},geometry:{type:'LineString',coordinates:points.map(([x,y])=>artworkPoint(x,y))}};}
  function data(){return {type:'FeatureCollection',features:active()?[...(route.road.length>1?[geoLine(route.road,'road')]:[]),...route.links.filter(link=>link.length>1).map(link=>geoLine(link,'link'))]:[]};}
  function install(){
    if(destroyed||!map||!map.isStyleLoaded()||map.getSource(SOURCE))return;
    map.addSource(SOURCE,{type:'geojson',lineMetrics:true,data:data()});
    const road=['==',['get','kind'],'road'];
    map.addLayer({id:LAYERS[0],type:'line',source:SOURCE,filter:road,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#176c58','line-width':10,'line-blur':2,'line-opacity':.12}});
    map.addLayer({id:LAYERS[1],type:'line',source:SOURCE,filter:road,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#fff','line-width':8,'line-opacity':.94}});
    map.addLayer({id:LAYERS[2],type:'line',source:SOURCE,filter:road,layout:{'line-join':'round','line-cap':'round'},paint:{'line-width':4.5,'line-color':'#176c58'}});
    map.addLayer({id:LAYERS[3],type:'line',source:SOURCE,filter:['==',['get','kind'],'link'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#176c58','line-width':2.5,'line-dasharray':[1,2]}});
    const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
    const context=canvas.getContext('2d');context.strokeStyle='#fff';context.lineWidth=4;context.lineCap='round';context.lineJoin='round';context.beginPath();context.moveTo(12,8);context.lineTo(20,16);context.lineTo(12,24);context.stroke();
    map.addImage(ARROW,context.getImageData(0,0,32,32),{pixelRatio:2});
    map.addLayer({id:LAYERS[4],type:'symbol',source:SOURCE,filter:road,layout:{'symbol-placement':'line','symbol-spacing':90,'icon-image':ARROW,'icon-size':.85,'icon-rotation-alignment':'map','icon-keep-upright':false,'icon-allow-overlap':true},paint:{'icon-opacity':.8}});
  }
  function syncMap(){
    if(!map)return;install();map.getSource(SOURCE)?.setData(data());
    markers.forEach(marker=>marker.remove());markers=[];
    root.classList.toggle('campus-route-active',Boolean(active()));
    const current=active();sparkles?.update(current?.route.points);if(!current)return;
    for(const [key,hall]of [['from',current.from],['to',current.to]]){
      const el=button('campus-journey-pin '+key,()=>{toggle.click();});
      const dot=make('span','campus-journey-pin-dot');dot.setAttribute('aria-hidden','true');
      el.append(dot,make('span','',text(key==='from'?'here':'destination')+(hall.code?' · '+hall.code:'')));
      el.setAttribute('aria-label',text(key==='from'?'here':'destination')+': '+caption(hall));el.title=caption(hall);
      markers.push(new maplibregl.Marker({element:el,anchor:'bottom',offset:[0,9]}).setLngLat(artworkPoint(...hall.anchor)).addTo(map));
    }
  }
  if(state.active){route=findCampusRoute(building(state.fromId),building(state.toId));state.active=Boolean(route&&!route.sameBuilding);}
  render();
  return {
    active,frame,stop,
    openFrom(hall){state.fromId=hall.id;if(state.toId===hall.id)state.toId=null;state.active=false;route=null;notice=null;changed();toggle.click();if(!state.toId)openChooser('to');},
    openTo(hall){state.toId=hall.id;state.active=false;route=null;notice=null;changed();toggle.click();if(!state.fromId)openChooser('from');},
    // Other map overlays can still be loading during the load callback. Retry
    // installation when they settle so a saved route also appears on refresh.
    attach(nextMap){map=nextMap;sparkles?.destroy();sparkles=createRouteSparkles(map);map.on('load',syncMap);map.on('idle',install);syncMap();},
    update(){render();syncMap();},
    destroy(){destroyed=true;abort.abort();sparkles?.destroy();markers.forEach(marker=>marker.remove());root.classList.remove('campus-route-active');if(!map)return;map.off('load',syncMap);map.off('idle',install);for(const id of [...LAYERS].reverse())if(map.getLayer(id))map.removeLayer(id);if(map.getSource(SOURCE))map.removeSource(SOURCE);if(map.hasImage(ARROW))map.removeImage(ARROW);}
  };
}
