import { CATEGORIES, SOURCES } from './campus-inventory.js';
import { ARTWORK_VERSION, CAMPUS_CORNERS } from './campus-geometry.js';
import { createCampusStateStore, matchesFilters } from './campus-state.js';
import { createCampusSheet } from './campus-sheet.js';

export function localized(value, language) {
  return typeof value === 'string' ? value : value?.[language] || value?.en || '';
}

// Visitor-facing link captions, separate from the retained research metadata.
export function sourceCaption(id, language) {
  const captions = {
    MAP:['Campus map 2026','خريطة الحرم الجامعي 2026'],
    'MAP-WEB':['Campus map','خريطة الحرم الجامعي'],
    'MAP-PDF':['Campus map PDF','خريطة الحرم الجامعي بصيغة PDF'],
    ACADEMICS:['Academic directory','الدليل الأكاديمي'],
    AHSS:['College of Arts, Humanities and Social Sciences','كلية الآداب والعلوم الإنسانية والاجتماعية'],
    LAW:['College of Law','كلية القانون'], GRAD:['College of Graduate Studies','كلية الدراسات العليا'],
    BUSINESS:['College of Business Administration','كلية إدارة الأعمال'],
    CI:['College of Computing and Informatics','كلية الحوسبة والمعلوماتية'],
    SCIENCES:['College of Sciences','كلية العلوم'], ENGINEERING:['College of Engineering','كلية الهندسة'],
    'PUBLIC-POLICY':['College of Public Policy','كلية السياسات العامة'],
    COMMUNICATION:['College of Communication','كلية الاتصال'], PHARMACY:['College of Pharmacy','كلية الصيدلة'],
    MEDICINE:['College of Medicine','كلية الطب'], DENTISTRY:['College of Dental Medicine','كلية طب الأسنان'],
    LIBRARY:['Library website','موقع المكتبة'], 'LIBRARY-LOCATIONS':['Library locations','مواقع المكتبات'],
    REGISTRAR:['Office of the Registrar','إدارة التسجيل'],
    'MEN-AFFAIRS':['Student Affairs — Men','شؤون الطلاب'], 'WOMEN-AFFAIRS':['Student Affairs — Women','شؤون الطالبات'],
    'MEN-HOUSING':['Student housing — Men','سكن الطلاب'], 'WOMEN-HOUSING':['Student housing — Women','سكن الطالبات'],
    SPORTS:['University sports','الرياضة الجامعية'], INNOVATION:['Innovation Hub','مركز الابتكار'],
    RISE:['Research Institute of Sciences and Engineering','معهد البحوث للعلوم والهندسة'],
    RIMHS:['Research Institute of Medical and Health Sciences','معهد البحوث للعلوم الطبية والصحية'],
    CSTC:['Clinical Surgical Training Center','مركز التدريب الجراحي الإكلينيكي'],
    UDHS:['University Dental Hospital Sharjah','مستشفى الجامعة لطب الأسنان بالشارقة'],
    UHS:['University Hospital Sharjah','مستشفى الجامعة بالشارقة'],
    'AL-ZAHRA':['University news · Al Zahra Hall','أخبار الجامعة · قاعة الزهراء']
  };
  return captions[id]?.[language==='ar'?1:0] || (language==='ar'?'موقع الجامعة':'University website');
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

// List, count and map emphasis use this same composed query.
export function filterCampus(halls, query, category, toursOnly, language = 'en') {
  return searchHalls(halls.filter(hall => matchesFilters(hall, category, toursOnly)), query, language);
}

export function createDirectory({ halls, root, language, isReady, openTour, startDirections, canGuide, initialTarget }) {
  const copy = {
    en: { identity:'UOS · Campus Navigator', search:'Search buildings or rooms', clearSearch:'Clear search', all:'All categories', tours:'360° only', more:'More categories', clear:'Clear filters', reset:'Reset all', legend:'Select any building · 360° = tour available', browse:'Browse campus', back:'Back to results', return:'Selected building', available:'360° tour available', information:'Building information', enter:'Explore in 360°', loading:'Preparing 360° view…', expand:'Expand details', collapse:'Collapse details', expanded:'Expand fully', empty:'No matching buildings or rooms.', group:'Nearby buildings', groupHint:'Choose a building here, or search the whole campus.', zone:'Zone', outside:'Outside current filter', sources:'Details & sources', official:'University website', map:'Campus map 2026', inside:'Inside this building', checkpoints:'Tour checkpoints', entrance:'Entrance', show:'Show selected building', directions:'Show me the way', buildings:n=>n+(n===1?' building':' buildings'), results:n=>n+(n===1?' result':' results') },
    ar: { identity:'UOS · دليل الحرم الجامعي', search:'ابحث عن مبنى أو قاعة', clearSearch:'مسح البحث', all:'جميع الفئات', tours:'جولات 360° فقط', more:'المزيد من الفئات', clear:'مسح التصفية', reset:'إعادة ضبط الكل', legend:'اختر أي مبنى · 360° = جولة متاحة', browse:'تصفح الحرم الجامعي', back:'العودة إلى النتائج', return:'المبنى المحدد', available:'تتوفر جولة بزاوية 360°', information:'معلومات المبنى', enter:'استكشف بزاوية 360°', loading:'جارٍ تجهيز العرض بزاوية 360°…', expand:'عرض التفاصيل', collapse:'طي التفاصيل', expanded:'عرض كامل', empty:'لا توجد مبانٍ أو قاعات مطابقة.', group:'مبانٍ متقاربة', groupHint:'اختر مبنى من هنا أو ابحث في الحرم الجامعي كله.', zone:'المنطقة', outside:'خارج التصفية الحالية', sources:'التفاصيل والمصادر', official:'موقع الجامعة', map:'خريطة الحرم الجامعي 2026', inside:'داخل هذا المبنى', checkpoints:'نقاط الجولة', entrance:'المدخل', show:'عرض المبنى المحدد', directions:'أرشدني إلى القاعة', buildings:n=>n+' مبانٍ', results:n=>n+' نتائج' }
  };
  const $ = selector => root.querySelector(selector);
  const title=$('#directory-title'), status=$('#directory-status'), body=$('#directory-body'), search=$('#hall-search');
  const results=$('#hall-results'), detail=$('#hall-detail'), actions=$('#directory-actions'), filters=$('#campus-filters');
  const collapse=$('#directory-collapse'), browse=$('#directory-browse'), returnButton=$('#directory-return'), handle=$('#directory-sheet-handle');
  const store=createCampusStateStore(halls,CATEGORIES), listeners=new AbortController(), signal=listeners.signal;
  let saved=store.read(), map=null, artwork=null, initialized=false, restoring=false;
  let selected=null, room=null, group=null, mode='results', activeCategory=null, toursOnly=false;
  let resultsScroll=0, detailScroll=0, sections={}, detailKey='', listKey='', scrollTimer=null, contentAnimation=null;
  const text=key=>copy[language()][key], label=hall=>(hall.code?'\u2066'+hall.code+'\u2069 · ':'')+localized(hall.name,language());
  const node=(tag, className='', value='')=>{const el=document.createElement(tag);el.className=className;el.textContent=value;return el;};
  const button=(className, caption, onclick)=>{const el=node('button',className,caption);el.type='button';el.onclick=onclick;return el;};
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const target=()=>room?.tour||(!room?selected?.tour:null);
  const sectionsFor=()=>sections[selected.id]||(sections[selected.id]={inside:false,sources:false});
  const currentScroll=()=>{if(mode==='details')detailScroll=body.scrollTop;else resultsScroll=body.scrollTop;};
  const activeMatches=()=>new Set(filterCampus(halls,search.value,activeCategory,toursOnly,language()).map(item=>item.hall.id));

  function snapshot() {
    if(restoring||!initialized||!map||!root.classList.contains('open')||!map.getContainer().clientWidth||!map.getContainer().clientHeight)return;
    if(!body.hidden)currentScroll();
    const center=map.getCenter();
    saved=store.write({version:2,artwork:ARTWORK_VERSION,camera:{center:[center.lng,center.lat],zoom:map.getZoom(),bearing:map.getBearing(),pitch:map.getPitch(),padding:map.getPadding()},
      selectedId:selected?.id||null,roomId:room?.id||null,mode,snap:sheet.snap,activeCategory,toursOnly,query:search.value,resultsScroll,detailScroll,sections});
  }
  const sheet=createCampusSheet({card:$('.campus-map-card'),handle,controls:$('#campus-controls'),header:$('#directory-header'),body,actions,onSettle:()=>{updateHeader();snapshot();}});
  function refreshMarkers() {
    artwork?.update({selectedId:selected?.id,matchingIds:activeMatches(),filtered:Boolean(activeCategory||toursOnly||search.value.trim()),language:language()});
  }
  function rememberScroll() {if(!body.hidden)currentScroll();}
  function showMode(next) {
    rememberScroll();mode=next;
    render();body.scrollTop=mode==='details'?detailScroll:resultsScroll;
  }
  function revealResults(resetScroll=true) {
    rememberScroll();group=null;mode='results';
    if(resetScroll)resultsScroll=0;
    render();body.scrollTop=resultsScroll;
    if(sheet.snap==='peek')sheet.set('half');
    snapshot();
  }
  // Structural controls are created once. Updates do not replace an open menu.
  const categoryButtons=new Map();
  const all=button('campus-filter','',()=>{activeCategory=null;revealResults();});
  const tours=button('campus-filter','',()=>{toursOnly=!toursOnly;revealResults();});
  filters.append(all,tours);
  const common=['dining','libraries','student-services'];
  for(const id of common) {
    const el=button('campus-filter','',()=>{activeCategory=activeCategory===id?null:id;revealResults();});
    categoryButtons.set(id,el);filters.append(el);
  }
  const more=node('details','campus-filter-more'),summary=node('summary'),menu=node('div','campus-category-menu');
  more.append(summary,menu);
  for(const id of Object.keys(CATEGORIES).filter(id=>!common.includes(id))) {
    const el=button('campus-filter','',()=>{activeCategory=activeCategory===id?null:id;revealResults();});
    categoryButtons.set(id,el);menu.append(el);
  }
  filters.append(more);
  document.addEventListener('pointerdown',event=>{if(more.open&&!more.contains(event.target))more.open=false;},{signal});
  more.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();more.open=false;summary.focus();}},{signal});
  function renderFilters() {
    all.textContent=text('all');all.setAttribute('aria-pressed',String(!activeCategory));
    tours.textContent=text('tours');tours.setAttribute('aria-pressed',String(toursOnly));
    for(const [id,el]of categoryButtons){el.textContent=localized(CATEGORIES[id],language());el.setAttribute('aria-pressed',String(activeCategory===id));}
    summary.textContent=activeCategory&&!common.includes(activeCategory)?localized(CATEGORIES[activeCategory],language()):text('more');
    summary.classList.toggle('has-category',Boolean(activeCategory&&!common.includes(activeCategory)));
    filters.setAttribute('aria-label',language()==='ar'?'تصفية المباني':'Building filters');
    $('#campus-clear-filters').hidden=!activeCategory&&!toursOnly;$('#campus-clear-filters').textContent=text('clear');
    $('#campus-reset').hidden=!activeCategory&&!toursOnly&&!search.value;$('#campus-reset').textContent=text('reset');
    $('#campus-clear-search').hidden=!search.value;$('#campus-clear-search').setAttribute('aria-label',text('clearSearch'));
    $('#campus-identity').textContent=text('identity');$('#campus-legend').textContent=text('legend');
    search.placeholder=text('search');search.setAttribute('aria-label',text('search'));
  }
  function select(hall, selectedRoom=null) {
    rememberScroll();
    const changed=selected?.id!==hall.id;
    selected=hall;room=selectedRoom;group=null;mode='details';
    if(changed)detailScroll=0;
    render();sheet.set(sheet.snap==='expanded'?'expanded':'half');body.scrollTop=detailScroll;
    if(map&&hall.mapCoordinates) {
      const point=map.project(hall.mapCoordinates),container=map.getContainer(),card=$('.campus-map-card').getBoundingClientRect(),controls=$('#campus-controls').getBoundingClientRect();
      const occluded=[card,controls].some(rect=>point.x>=rect.left&&point.x<=rect.right&&point.y>=rect.top&&point.y<=rect.bottom);
      if(occluded||point.x<25||point.x>container.clientWidth-25||point.y<25||point.y>container.clientHeight-25) {
        const phone=matchMedia('(max-width:640px) and (orientation:portrait)').matches;
        map.easeTo({center:hall.mapCoordinates,offset:phone?[0,-card.height/2]:[document.documentElement.dir==='rtl'?-200:200,0],duration:reduced()?0:280});
      }
    }
    snapshot();
  }
  function renderList() {
    const pool=group||halls;
    // Nearby choices are explicit, never silently constrained by global filters.
    const items=group?searchHalls(pool,'',language()):filterCampus(pool,search.value,activeCategory,toursOnly,language());
    const count=items.some(item=>item.room)?copy[language()].results(items.length):copy[language()].buildings(new Set(items.map(item=>item.hall.id)).size);
    $('#directory-count').textContent=count;
    const key=JSON.stringify([group?.map(h=>h.id),search.value,activeCategory,toursOnly,language()]);
    if(key!==listKey) {
      results.replaceChildren();listKey=key;
      if(!items.length) {
        results.append(node('p','directory-empty',text('empty')));
        if(search.value)results.append(button('campus-filter',text('clearSearch'),()=>{search.value='';revealResults();search.focus();}));
        if(activeCategory||toursOnly)results.append(button('campus-filter',text('clear'),()=>{activeCategory=null;toursOnly=false;revealResults();}));
      }
      for(const item of items) {
        const el=button('hall-result','',()=>{select(item.hall,item.room);handle.focus({preventScroll:true});});
        el.dataset.buildingId=item.hall.id;
        el.append(node('strong','',item.label),node('small','',((item.room?item.room.tour:item.hall.tour)?text('available'):text('information'))+(item.hall.zone?' · '+text('zone')+' '+item.hall.zone:'')));
        results.append(el);
      }
    }
    results.hidden=mode!=='results';
    return count;
  }
  function renderDetail() {
    detail.hidden=mode!=='details'||!selected;
    if(!selected)return;
    const key=selected.id+':'+language();
    if(key!==detailKey) {
      detailKey=key;detail.replaceChildren();
      if(selected.thumbnail) {
        const img=node('img','hall-thumbnail');img.src=selected.thumbnail;img.alt=localized(selected.name,language());img.loading='lazy';
        img.onerror=()=>{img.hidden=true;};detail.append(img);
      }
      detail.append(node('p','hall-description',localized(selected.description,language())));
      if(selected.publicNotice)detail.append(node('p','hall-notice',localized(selected.publicNotice,language())));
      detail.append(node('p','hall-notice outside-filter',text('outside')));
      if(selected.tourName&&localized(selected.tourName,language())!==localized(selected.name,language()))detail.append(node('p','hall-venue',localized(selected.tourName,language())));
      if(selected.rooms?.length) {
        const inside=node('details','hall-inside');inside.dataset.section='inside';inside.open=sectionsFor().inside;
        inside.append(node('summary','',text(selected.checkpointArea?'checkpoints':'inside')));
        const choices=node('div','room-choices');choices.id='room-choices';
        for(const item of [null,...selected.rooms]) {
          const option=button('room-choice','',()=>{
            rememberScroll();room=item;updateRooms();renderActions();updateHeader();sheet.refresh();body.scrollTop=detailScroll;snapshot();
          });
          option.dataset.roomId=item?.id||'';
          const labels=node('span','room-choice-labels');
          labels.append(node('strong','',item?localized(item.name,language()):text('entrance')));
          if(item?.floor)labels.append(node('small','',localized(item.floor,language())));
          option.append(labels,node('span','room-choice-check',''));choices.append(option);
        }
        inside.append(choices);inside.addEventListener('toggle',()=>{if(inside.isConnected&&detail.contains(inside)){sectionsFor().inside=inside.open;snapshot();}},{signal});detail.append(inside);
      }
      // Official secondary links are public; research provenance stays in metadata.
      for(const id of new Set(selected.officialPageSourceIds||[])) {
        const source=SOURCES[id];if(!source?.url||source.kind!=='official-web')continue;
        const link=node('a','hall-official',sourceCaption(id,language()));
        link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';detail.append(link);
      }
      const sources=node('details','hall-sources');sources.dataset.section='sources';sources.open=sectionsFor().sources;
      sources.append(node('summary','',text('sources')));
      for(const id of new Set([...(selected.sourceIds||[]),...(selected.officialPageSourceIds||[])])) {
        const source=SOURCES[id];if(!source||(source.kind!=='official-web'&&id!=='MAP'))continue;
        const caption=sourceCaption(id,language());
        if(source.url&&/^https:\/\//.test(source.url)){const link=node('a','',caption);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';sources.append(link);}
        else sources.append(node('small','',caption));
      }
      sources.addEventListener('toggle',()=>{if(sources.isConnected&&detail.contains(sources)){sectionsFor().sources=sources.open;snapshot();}},{signal});detail.append(sources);
      if(selected.mapCoordinates)detail.append(button('campus-filter',text('show'),()=>map?.easeTo({center:selected.mapCoordinates,duration:reduced()?0:280})));
      contentAnimation?.cancel();
      if(!restoring&&!reduced())contentAnimation=detail.animate([{opacity:.45},{opacity:1}],{duration:150});
    }
    detail.querySelector('.outside-filter').hidden=activeMatches().has(selected.id);
    updateRooms();
  }
  function updateRooms() {
    for(const el of detail.querySelectorAll('.room-choice')) {
      const active=el.dataset.roomId===(room?.id||'');el.setAttribute('aria-pressed',String(active));el.querySelector('.room-choice-check').textContent=active?'✓':'';
    }
  }
  function renderActions() {
    const active=mode==='details'?target():null,key=active?.scene||active?.url||'';
    if(actions.dataset.target!==key||actions.dataset.language!==language()) {
      actions.replaceChildren();actions.dataset.target=key;actions.dataset.language=language();
      if(active) {
        const enter=button('campus-popup-button','',()=>{if(!enter.disabled){map?.stop();snapshot();openTour(active);}});
        enter.id='campus-enter';actions.append(enter);
      }
    }
    actions.hidden=!active;
    const enter=actions.querySelector('#campus-enter');
    if(enter){enter.disabled=!isReady();enter.textContent=isReady()?text('enter'):text('loading');}
    const existing=detail.querySelector('.directions-start');
    if(room&&active?.scene&&startDirections&&canGuide?.(active.scene)) {
      if(!existing)detail.append(button('campus-popup-button directions-start',text('directions'),()=>{snapshot();startDirections(target().scene);}));
      else existing.textContent=text('directions');
    }else existing?.remove();
  }
  function updateHeader(count=$('#directory-count').textContent) {
    title.textContent=mode==='details'&&selected?label(selected):group?text('group'):text('browse');
    status.textContent=mode==='details'&&selected?(selected.zone?text('zone')+' '+selected.zone+' · ':'')+(target()?text('available'):text('information'))+(room?' · '+localized(room.name,language()):''):group?text('groupHint'):count;
    collapse.textContent=sheet.snap==='peek'?'+':sheet.snap==='half'?'↟':'−';
    collapse.setAttribute('aria-label',text(sheet.snap==='peek'?'expand':sheet.snap==='half'?'expanded':'collapse'));
    collapse.setAttribute('aria-expanded',String(sheet.snap!=='peek'));
    handle.setAttribute('aria-label',text(sheet.snap==='expanded'?'collapse':'expand'));
    browse.hidden=mode!=='details'&&!group;browse.textContent=text('back');
    returnButton.hidden=mode!=='results'||!selected;returnButton.textContent=text('return');
  }
  function render(){renderFilters();const count=renderList();renderDetail();renderActions();updateHeader(count);refreshMarkers();}
  search.addEventListener('input',()=>revealResults(),{signal});
  $('#campus-clear-search').onclick=()=>{search.value='';revealResults();search.focus();};
  $('#campus-clear-filters').onclick=()=>{activeCategory=null;toursOnly=false;revealResults();};
  $('#campus-reset').onclick=()=>{search.value='';activeCategory=null;toursOnly=false;revealResults();};
  browse.onclick=()=>{group=null;showMode('results');if(sheet.snap==='peek')sheet.set('half');snapshot();};
  returnButton.onclick=()=>{if(selected){showMode('details');sheet.set(sheet.snap==='expanded'?'expanded':'half');body.scrollTop=detailScroll;snapshot();}};
  collapse.onclick=()=>sheet.set(sheet.snap==='peek'?'half':sheet.snap==='half'?'expanded':'peek');
  body.addEventListener('scroll',()=>{currentScroll();clearTimeout(scrollTimer);scrollTimer=setTimeout(snapshot,120);},{passive:true,signal});
  $('#campus-overview').onclick=()=>overview(false);
  function overview(instant) {
    const phone=matchMedia('(max-width:640px) and (orientation:portrait)').matches,rtl=document.documentElement.dir==='rtl';
    map?.fitBounds([CAMPUS_CORNERS[2],CAMPUS_CORNERS[0]],{padding:phone?{top:$('#campus-controls').offsetHeight+85,bottom:150,left:20,right:20}:{top:85,bottom:45,left:rtl?35:410,right:rtl?410:35},duration:instant||reduced()?0:280});
  }
  detail.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();event.stopPropagation();browse.onclick();handle.focus();}},{signal});
  return {
    initialCamera(){return saved?.camera||null;},
    attach(nextMap,nextArtwork){map=nextMap;artwork=nextArtwork;map.on('moveend',snapshot);render();},
    selectGroup(members) {
      if(members.length===1){select(members[0]);handle.focus({preventScroll:true});return;}
      rememberScroll();group=members;mode='results';resultsScroll=0;
      render();sheet.set(sheet.snap==='expanded'?'expanded':'half');body.scrollTop=0;snapshot();handle.focus({preventScroll:true});
    },
    selectById(id){const hall=halls.find(item=>item.id===id||item.legacyHallId===id);if(hall)select(hall);},
    leave(){map?.stop();snapshot();},
    restore() {
      if(!map)return;
      const state=saved||store.read();restoring=true;map.stop();map.resize();
      if(state) {
        activeCategory=state.activeCategory;toursOnly=state.toursOnly;search.value=state.query;
        selected=halls.find(hall=>hall.id===state.selectedId)||null;room=selected?.rooms?.find(item=>item.id===state.roomId)||null;
        mode=state.mode;resultsScroll=state.resultsScroll;detailScroll=state.detailScroll;sections=state.sections;
      }
      if(!initialized&&initialTarget&&(!selected||selected.id!==initialTarget.hallId||(room?.id||null)!==(initialTarget.roomId||null))) {
        selected=halls.find(hall=>hall.id===initialTarget.hallId)||null;room=selected?.rooms?.find(item=>item.id===initialTarget.roomId)||null;mode=selected?'details':'results';
      }
      group=null;render();
      sheet.set(!initialized&&initialTarget&&!state?'half':state?.snap||'peek',{instant:true,notify:false});
      body.scrollTop=mode==='details'?detailScroll:resultsScroll;
      if(state?.camera)map.jumpTo(state.camera);else if(!initialized)overview(true);
      initialized=true;restoring=false;
    },
    update(){const scroll=body.scrollTop;render();sheet.refresh();body.scrollTop=scroll;snapshot();},
    refreshMarkers,
    destroy(){clearTimeout(scrollTimer);contentAnimation?.cancel();listeners.abort();sheet.destroy();map?.off('moveend',snapshot);artwork?.destroy();}
  };
}
