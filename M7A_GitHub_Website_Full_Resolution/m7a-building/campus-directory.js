import { CATEGORIES, SOURCES } from './campus-inventory.js';
import { ARTWORK_VERSION, CAMPUS_CORNERS } from './campus-geometry.js';
import { createCampusStateStore, matchesFilters } from './campus-state.js';

export function localized(value, language) {
  return typeof value === 'string' ? value : value?.[language] || value?.en || '';
}

// The official campus artwork is rotated for landscape display. Keep routing/GPS
// coordinates separate from the coordinates used to place pins on that artwork.
const mapCoordinate = hall => hall.mapCoordinates || hall.coordinates;

// Connected groups in screen pixels prevent touching pins at any zoom level.
export function groupNearby(halls, project, radius = 64) {
  const points = halls.map(hall => ({ hall, point: project(mapCoordinate(hall)) }));
  const unseen = new Set(points);
  const groups = [];
  for (const start of points) {
    if (!unseen.delete(start)) continue;
    const group = [start];
    for (let index = 0; index < group.length; index++) {
      for (const candidate of unseen) {
        if (Math.hypot(group[index].point.x - candidate.point.x, group[index].point.y - candidate.point.y) < radius) {
          unseen.delete(candidate); group.push(candidate);
        }
      }
    }
    groups.push(group.map(item => item.hall));
  }
  return groups;
}

export function searchHalls(halls, query, language) {
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase().replace(/[٠-٩۰-۹]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.includes(digit)?'٠١٢٣٤٥٦٧٨٩'.indexOf(digit):'۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[\s\-–_]/g, '');
  const needle = normalize(query.trim());
  return halls.flatMap(hall => {
    const label = `${hall.code ? hall.code+' · ' : ''}${localized(hall.name, language)}`;
    const matches = value => normalize(value).includes(needle);
    const results = matches(`${hall.code||''} ${localized(hall.name, 'en')} ${localized(hall.name, 'ar')} ${(hall.aliases||[]).map(alias=>localized(alias,language)).join(' ')}`)
      ? [{ hall, room: null, label }] : [];
    if (needle) for (const room of hall.rooms || []) {
      if (matches(`${room.id} ${localized(room.name, 'en')} ${localized(room.name, 'ar')}`)) {
        results.push({ hall, room, label: `${localized(room.name, language)} · ${hall.code}` });
      }
    }
    return results;
  });
}

export function createDirectory({ halls, root, language, isReady, openTour, startDirections, canGuide, currentHallId, initialTarget }) {
  const copy = {
    en: { choose: 'Explore campus', search: 'Search halls or rooms', empty: 'No matching halls or rooms', browse: 'All buildings', available: '360° tour available', soon: 'Tour coming soon', enter: 'Enter 360° tour', loading: 'Preparing 360° view…', rooms: 'Rooms', entrance: 'Hall entrance', collapse: 'Collapse details', expand: 'Expand details', group: 'Nearby halls', select: 'Select a hall', count: n => `${n} halls`, back: 'All buildings' },
    ar: { choose: 'اختر مبنى', search: 'ابحث عن مبنى أو قاعة', empty: 'لا توجد مبانٍ أو قاعات مطابقة', browse: 'جميع المباني', available: 'تتوفر جولة بزاوية 360°', soon: 'الجولة متاحة قريبًا', enter: 'دخول الجولة بزاوية 360°', loading: 'جارٍ تجهيز العرض بزاوية 360°…', rooms: 'القاعات', entrance: 'مدخل المبنى', collapse: 'طي التفاصيل', expand: 'عرض التفاصيل', group: 'مبانٍ متقاربة', select: 'اختر مبنى', count: n => `${n} مبانٍ`, back: 'جميع المباني' }
  };
  const title = root.querySelector('#directory-title');
  const intro = root.querySelector('#directory-intro');
  const body = root.querySelector('#directory-body');
  const search = root.querySelector('#hall-search');
  const results = root.querySelector('#hall-results');
  const detail = root.querySelector('#hall-detail');
  const collapse = root.querySelector('#directory-collapse');
  const browse = root.querySelector('#directory-browse');
  const sheetHandle = root.querySelector('#directory-sheet-handle');
  let map = null, artwork = null, selected = null, room = null, group = null, collapsed = false, sheetExpanded = false;
  let activeCategory=null,toursOnly=false,restoring=false,bodyAnimation=null,detailAnimation=null,lastDetail='',transitionId=0,renderedCollapsed=null;
  const store=createCampusStateStore(halls,CATEGORIES);
  let saved=store.read();
  if(initialTarget)saved={version:1,artwork:ARTWORK_VERSION,camera:null,activeCategory:null,toursOnly:false,query:'',collapsed:false,sheetExpanded:true,scroll:0,...saved,selectedId:initialTarget.hallId,roomId:initialTarget.roomId||null};
  const filters=root.querySelector('#campus-filters'),count=root.querySelector('#directory-count');
  const text = key => copy[language()][key];
  const label = hall => `${hall.code ? '\u2066'+hall.code+'\u2069 · ' : ''}${localized(hall.name, language())}`;
  const information=()=>language()==='ar'?'معلومات المبنى':'Building information';
  const matches=hall=>matchesFilters(hall,activeCategory,toursOnly);
  function snapshot(){
    if(restoring||!map||!root.classList.contains('open')||!map.getContainer().clientWidth||!map.getContainer().clientHeight)return;
    const center=map.getCenter();
    saved=store.write({version:1,artwork:ARTWORK_VERSION,camera:{center:[center.lng,center.lat],zoom:map.getZoom(),bearing:map.getBearing(),pitch:map.getPitch(),padding:map.getPadding()},
      selectedId:selected?.id||null,roomId:room?.id||null,activeCategory,toursOnly,query:search.value,collapsed,sheetExpanded,scroll:collapsed?(saved?.scroll||body.scrollTop):body.scrollTop});
  }
  function renderFilters(){
    filters.replaceChildren();
    const button=(caption,active,action)=>{const el=node('button','campus-filter',caption);el.type='button';el.setAttribute('aria-pressed',String(active));el.onclick=()=>{action();render();snapshot();};return el;};
    filters.append(button(language()==='ar'?'الكل':'All',!activeCategory,()=>{activeCategory=null;}),button('360°',toursOnly,()=>{toursOnly=!toursOnly;}));
    for(const category of ['dining','libraries','student-services'])filters.append(button(localized(CATEGORIES[category],language()),activeCategory===category,()=>{activeCategory=category;}));
    const more=node('details','campus-filter-more'),summary=node('summary','',language()==='ar'?'المزيد':'More');
    more.append(summary);
    for(const category of Object.keys(CATEGORIES).filter(id=>!['dining','libraries','student-services'].includes(id)))more.append(button(localized(CATEGORIES[category],language()),activeCategory===category,()=>{activeCategory=category;}));
    filters.append(more);
    if(activeCategory||toursOnly)filters.append(button(language()==='ar'?'مسح التصفية':'Clear filters',false,()=>{activeCategory=null;toursOnly=false;}));
  }
  const node = (tag, className, value) => {
    const el = document.createElement(tag); el.className = className;
    if (value) el.textContent = value;
    return el;
  };
  function select(hall, selectedRoom = null) {
    selected = hall; room = selectedRoom; group = null; collapsed = false; sheetExpanded = true;
    render();
    const card = root.querySelector('.campus-map-card');
    const offset = card && map?.getContainer().clientWidth <= 600 ? [0, -Math.min(card.offsetHeight / 2, 170)] : [0, 0];
    if(map&&hall.mapCoordinates){
      const point=map.project(hall.mapCoordinates),container=map.getContainer();
      if(point.x<50||point.x>container.clientWidth-50||point.y<70||point.y>container.clientHeight-card.offsetHeight-20)
        map.easeTo({center:hall.mapCoordinates,offset,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:350});
    }
    snapshot();
  }
  function renderList() {
    results.replaceChildren();
    const pool = group || halls;
    const matches = searchHalls(pool.filter(hall=>matchesFilters(hall,activeCategory,toursOnly)), search.value, language());
    count.textContent=(language()==='ar'?'النتائج: ':'Results: ')+matches.length;
    results.hidden = Boolean(selected);
    if (results.hidden) return;
    if (!matches.length) {
      results.append(node('p','directory-empty',text('empty')));
      const clear=node('button','campus-filter',language()==='ar'?'مسح التصفية':'Clear filters');clear.type='button';clear.onclick=()=>{activeCategory=null;toursOnly=false;render();snapshot();};results.append(clear);
    }
    for (const item of matches) {
      const button = node('button', 'hall-result'); button.type = 'button';
      button.append(node('strong', '', item.label));
      button.append(node('small', '', (item.room ? item.room.tour : item.hall.tour) ? text('available') : information()));
      button.onclick = () => { select(item.hall, item.room); detail.querySelector('select,button')?.focus({ preventScroll: true }); };
      results.append(button);
    }
  }
  function renderDetail() {
    detail.replaceChildren(); detail.hidden = !selected;
    if (detail.hidden) return;
    if (selected.thumbnail) {
      const img = node('img', 'hall-thumbnail'); img.src = selected.thumbnail; img.alt = label(selected); img.loading = 'lazy';
      img.onerror = () => { img.hidden = true; }; detail.append(img);
    }
    const target = room?.tour || (!room ? selected.tour : null);
    detail.append(node('p', 'hall-status', target ? text('available') : information()));
    if(selected.zone)detail.append(node('small','hall-zone',(language()==='ar'?'المنطقة ':'Zone ')+selected.zone));
    detail.append(node('p','hall-description',localized(selected.description,language())));
    if(selected.publicNotice)detail.append(node('p','hall-notice',localized(selected.publicNotice,language())));
    if(!matches(selected))detail.append(node('p','hall-notice',language()==='ar'?'خارج التصفية الحالية':'Outside active filter'));
    if(selected.tourName)detail.append(node('p','hall-venue',localized(selected.tourName,language())));
    const sources=node('details','hall-sources'),sourceTitle=node('summary','',language()==='ar'?'مصادر المعلومات':'Information sources');sources.append(sourceTitle);
    for(const id of new Set([...(selected.sourceIds||[]),...(selected.officialPageSourceIds||[])])){
      const source=SOURCES[id];if(!source)continue;
      if(source.url&&/^https:\/\//.test(source.url)){const link=node('a','',source.title);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';sources.append(link);}
      else sources.append(node('small','',source.title));
    }
    detail.append(sources);
    if (selected.rooms?.length) {
      const caption = node('p', 'room-label', selected.checkpointArea?(language()==='ar'?'نقاط الجولة':'Tour checkpoints'):(language()==='ar'?'داخل هذا المبنى':'Inside this building')); caption.id = 'room-picker-label';
      const picker = node('div', 'room-picker');
      const toggle = node('button', 'room-picker-toggle'); toggle.type = 'button'; toggle.id = 'hall-room';
      toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', 'room-choices');
      toggle.setAttribute('aria-labelledby', 'room-picker-label room-picker-value');
      const value = node('span', '', room ? localized(room.name, language()) : text('entrance')); value.id = 'room-picker-value';
      const chevron = node('span', 'room-chevron', '⌄'); chevron.setAttribute('aria-hidden', 'true'); toggle.append(value, chevron);
      const choices = node('div', 'room-choices'); choices.id = 'room-choices'; choices.hidden = true;
      choices.setAttribute('role', 'group'); choices.setAttribute('aria-labelledby', 'room-picker-label');
      const buttons = [];
      for (const item of [null, ...selected.rooms]) {
        const option = node('button', 'room-choice'); option.type = 'button';
        const active = (item?.id || '') === (room?.id || ''); option.setAttribute('aria-pressed', String(active));
        const labels = node('span', 'room-choice-labels');
        labels.append(node('strong', '', item ? localized(item.name, language()) : text('entrance')));
        if (item?.floor) labels.append(node('small', '', localized(item.floor, language())));
        if (item && !item.tour) labels.append(node('small', '', information()));
        const check = node('span', 'room-choice-check', active ? '✓' : ''); check.setAttribute('aria-hidden', 'true');
        option.append(labels, check);
        option.onclick = () => { room = item; renderDetail(); snapshot(); detail.querySelector('#hall-room')?.focus({ preventScroll: true }); };
        buttons.push(option); choices.append(option);
      }
      const setOpen = open => {
        choices.hidden = !open; toggle.setAttribute('aria-expanded', String(open));
        if (open) requestAnimationFrame(() => {
          body.scrollTop += toggle.getBoundingClientRect().top - body.getBoundingClientRect().top - 4;
        });
      };
      toggle.onclick = () => setOpen(choices.hidden);
      toggle.onkeydown = event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setOpen(true); buttons[event.key === 'ArrowDown' ? 0 : buttons.length - 1].focus();
        }
      };
      picker.onkeydown = event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); toggle.focus(); }
        const index = buttons.indexOf(document.activeElement);
        if (index < 0 || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next].focus();
      };
      picker.append(toggle, choices); detail.append(caption, picker);
    }
    if(target){
      const button = node('button', 'campus-popup-button'); button.id = 'campus-enter'; button.type = 'button';
      button.disabled = Boolean(target.scene && !isReady());
      button.textContent = target.scene && !isReady() ? text('loading') : text('enter');
      button.onclick = () => { if (!button.disabled) { map?.stop();snapshot();openTour(target); } };
      detail.append(button);
    }
    if (selected.mapCoordinates){
      const show=node('button','campus-filter',language()==='ar'?'عرض المبنى المحدد':'Show selected building');show.type='button';
      show.onclick=()=>map?.easeTo({center:selected.mapCoordinates,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:350});detail.append(show);
    }
    if (room && target?.scene && startDirections && canGuide?.(target.scene)) {
      const directions = node('button', 'campus-popup-button directions-start', language() === 'ar' ? 'أرشدني إلى القاعة' : 'Show me the way');
      directions.type = 'button'; directions.disabled = !isReady();
      directions.onclick = () => startDirections(target.scene);
      detail.append(directions);
      detail.append(node('small', 'hall-status', language() === 'ar' ? 'اتبع المسار من موقعك الحالي في الجولة.' : 'Follow the route from your current tour viewpoint.'));
    }
  }
  function render() {
    const card=root.querySelector('.campus-map-card');
    card.classList.toggle('showing-group', Boolean(group));
    card.classList.toggle('sheet-expanded', sheetExpanded);
    title.textContent = selected ? label(selected) : group ? text('group') : text('choose');
    intro.hidden = Boolean(selected || group || collapsed);
    intro.textContent = language() === 'ar' ? 'اختر أي مبنى لعرض معلوماته. ابحث عن علامة 360° لاستكشافه من الداخل.' : 'Select any building for information. Look for 360° to explore inside.';
    search.placeholder = text('search'); search.setAttribute('aria-label', text('search'));
    collapse.textContent = collapsed ? '+' : '−'; collapse.setAttribute('aria-label', text(collapsed ? 'expand' : 'collapse'));
    collapse.setAttribute('aria-expanded', String(!collapsed));
    if(renderedCollapsed!==collapsed||restoring){
      const token=++transitionId;bodyAnimation?.cancel();
      const wasHidden=body.hidden;
      if(!collapsed){body.hidden=false;if(wasHidden)body.scrollTop=saved?.scroll||0;}
      body.inert=collapsed;
      if(!restoring&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&body.animate){
        bodyAnimation=body.animate(collapsed?[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(8px)'}]:[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:220});
        bodyAnimation.finished.then(()=>{if(token===transitionId)body.hidden=collapsed;}).catch(()=>{});
      }else body.hidden=collapsed;
      renderedCollapsed=collapsed;
    }
    if(sheetHandle){
      const expand=language()==='ar'?'توسيع تفاصيل الخريطة':'Expand map details';
      const shrink=language()==='ar'?'تصغير تفاصيل الخريطة':'Collapse map details';
      sheetHandle.setAttribute('aria-label',sheetExpanded?shrink:expand);
      sheetHandle.title=sheetExpanded?shrink:expand;
    }
    browse.hidden = !selected && !group; browse.textContent = '‹ ' + text('back');
    renderFilters();renderList(); renderDetail();refreshMarkers();
    const key=(selected?.id||'')+':'+(room?.id||'')+':'+language();
    if(lastDetail!==key&&!restoring&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      detailAnimation?.cancel();detailAnimation=detail.animate?.([{opacity:.35},{opacity:1}],{duration:150});
    }
    lastDetail=key;
  }
  function refreshMarkers(){
    artwork?.update({selectedId:selected?.id,activeCategory,toursOnly,language:language(),matches:matchesFilters});
  }
  search.oninput = renderListAndDetail;
  function renderListAndDetail() { selected=null;room=null;group=null;render();snapshot(); }
  browse.onclick = () => { selected = null; room = null; group = null; sheetExpanded = false; render();snapshot(); search.focus(); };
  collapse.onclick = () => { collapsed = !collapsed; render();snapshot(); };
  body.addEventListener('scroll',snapshot,{passive:true});
  root.querySelector('#campus-overview').onclick=()=>map?.fitBounds([CAMPUS_CORNERS[2],CAMPUS_CORNERS[0]],{padding:{top:100,bottom:220,left:35,right:70},duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:350});
  detail.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();event.stopPropagation();browse.onclick();}});
  if(sheetHandle){
    let startY=null,sheetDragged=false;
    const setSheetExpanded=value=>{sheetExpanded=value;render();snapshot();};
    sheetHandle.onclick=()=>{if(sheetDragged){sheetDragged=false;return;}setSheetExpanded(!sheetExpanded);};
    sheetHandle.onpointerdown=event=>{startY=event.clientY;sheetDragged=false;sheetHandle.setPointerCapture?.(event.pointerId);};
    sheetHandle.onpointerup=event=>{
      if(startY==null)return;
      const delta=event.clientY-startY;startY=null;
      if(Math.abs(delta)>28){sheetDragged=true;setSheetExpanded(delta<0);}
    };
    sheetHandle.onpointercancel=()=>{startY=null;sheetDragged=false;};
  }
  return {
    attach(nextMap,nextArtwork) { map = nextMap;artwork=nextArtwork; map.on('moveend',()=>{refreshMarkers();snapshot();});render(); },
    selectGroup(members){
      if(members.length===1){select(members[0]);collapse.focus({preventScroll:true});return;}
      selected=null;room=null;group=members;collapsed=false;sheetExpanded=true;render();snapshot();collapse.focus({preventScroll:true});
    },
    leave(){map?.stop();snapshot();},
    restore(){
      if(!map)return;
      const state=saved||store.read();
      restoring=true;map.stop();map.resize();
      if(state){
        if(state.camera)map.jumpTo(state.camera);
        activeCategory=state.activeCategory;toursOnly=state.toursOnly;
        selected=halls.find(hall=>hall.id===state.selectedId)||null;
        room=selected?.rooms?.find(item=>item.id===state.roomId)||null;
        search.value=state.query;collapsed=state.collapsed;sheetExpanded=state.sheetExpanded;group=null;
      }
      render();body.scrollTop=state?.scroll||0;restoring=false;
    },
    selectById(id){const hall=halls.find(item=>item.id===id||item.legacyHallId===id);if(hall)select(hall);},
    update() {
      const scroll=body.scrollTop;render();body.scrollTop=scroll;refreshMarkers();snapshot();
    },
    refreshMarkers
  };
}
