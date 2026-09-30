import { CATEGORIES, SOURCES } from './campus-inventory.js';
import { ARTWORK_VERSION, CAMPUS_CORNERS, campusCameraPolicy, clampCampusCamera } from './campus-geometry.js';
import { createCampusStateStore, matchesFilters } from './campus-state.js';
import { createCampusSheet } from './campus-sheet.js';
import { ZONE_COLORS } from './campus-map-labels.js';

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

export function normalizeSearch(value = '') {
  return value.normalize('NFKC').toLocaleLowerCase()
    .replace(/[٠-٩۰-۹]/g, d => String('٠١٢٣٤٥٦٧٨٩'.includes(d) ? '٠١٢٣٤٥٦٧٨٩'.indexOf(d) : '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06edـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
    .replace(/[\s\-–—_·/]+/g, ' ').trim();
}
const bilingual = value => typeof value === 'string' ? [value] : [value?.en || '', value?.ar || ''];
const everyday = {
  dining:['food','cafeteria','restaurant','cafe','طعام','اكل','مطعم','كافتيريا','مقهى'],
  libraries:['books','library','كتاب','كتب','مكتبة'],
  sports:['sport','gym','رياضة','رياضي'],
  housing:['dorm','dormitory','سكن'],
  events:['theater','theatre','auditorium','مسرح'],
  'student-services':['student services','خدمات الطلاب','خدمات الطالبات']
};
const compact = value => normalizeSearch(value).replace(/ /g, '');
function searchRank(query, codes, names, extra) {
  const needle = normalizeSearch(query), code = compact(query);
  if (!needle) return 0;
  if (codes.some(value => compact(value) === code)) return 0;
  const normalized = names.map(normalizeSearch).filter(Boolean);
  if (normalized.includes(needle)) return 1;
  if ([...codes.map(normalizeSearch), ...normalized].some(value => value.startsWith(needle))) return 2;
  const fields = [...normalized, ...codes.map(normalizeSearch), ...extra.map(normalizeSearch)];
  return needle.split(' ').every(token => fields.some(value => value.includes(token) || compact(value).includes(compact(token)))) ? 3 : Infinity;
}
export function searchHalls(halls, query, language = 'en') {
  const items = [];
  for (const hall of halls) {
    const names = [...bilingual(hall.name), ...(hall.aliases || []).flatMap(bilingual)];
    const extra = (hall.categories || []).flatMap(id => [...bilingual(CATEGORIES[id]), ...(everyday[id] || [])]);
    const rank = searchRank(query, [hall.code || ''], names, extra);
    if (Number.isFinite(rank)) items.push({hall, room:null, label:`${hall.code ? hall.code+' · ' : ''}${localized(hall.name,language)}`, rank});
    if (normalizeSearch(query)) for (const room of hall.rooms || []) {
      const rank = searchRank(query, [room.id], [...bilingual(room.name), ...(room.aliases || []).flatMap(bilingual)], []);
      if (Number.isFinite(rank)) items.push({hall, room, label:`${localized(room.name,language)} · ${hall.code}`, rank});
    }
  }
  const seen = new Set();
  return items.sort((a,b)=>a.rank-b.rank).filter(item => {
    const id=item.hall.id+':'+(item.room?.id || '');
    if (seen.has(id)) return false; seen.add(id); return true;
  });
}
export function searchSuggestions(halls, query) {
  const needle=normalizeSearch(query);
  // Never correct an identifier, or silently select a guessed destination.
  if (needle.length < 4 || /\d/.test(needle) || searchHalls(halls,query).length) return [];
  const words=[...new Set([...Object.values(everyday).flat(), ...halls.flatMap(h=>[...bilingual(h.name),...(h.aliases||[]).flatMap(bilingual)])].map(normalizeSearch))];
  const distance=(a,b)=>{
    let row=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=0;i<a.length;i++){const next=[i+1];for(let j=0;j<b.length;j++)next.push(Math.min(next[j]+1,row[j+1]+1,row[j]+(a[i]===b[j]?0:1)));row=next;}
    return row[b.length];
  };
  return words.filter(word=>Math.abs(word.length-needle.length)<=2).map(word=>({word,d:distance(needle,word)}))
    .filter(item=>item.d <= (needle.length>=7?2:1)).sort((a,b)=>a.d-b.d||a.word.localeCompare(b.word)).slice(0,3).map(item=>item.word);
}
export function appendSearchHighlight(element, value, query) {
  // Preserve display spelling and diacritics; map normalized characters back to text.
  const needle=compact(query), chars=[], offsets=[];
  for(let i=0;i<value.length;i++)for(const c of compact(value[i])){chars.push(c);offsets.push(i);}
  const at=needle?chars.join('').indexOf(needle):-1;
  if(at<0){element.textContent=value;return;}
  const start=offsets[at],end=offsets[at+needle.length-1]+1,mark=document.createElement('mark');mark.textContent=value.slice(start,end);
  element.append(document.createTextNode(value.slice(0,start)),mark,document.createTextNode(value.slice(end)));
}

// List, count and map emphasis use this same composed query.
export function filterCampus(halls, query, category, toursOnly, language = 'en') {
  return searchHalls(halls.filter(hall => matchesFilters(hall, category, toursOnly)), query, language);
}

export function createDirectory({ halls, root, language, isReady, openTour, startDirections, canGuide, initialTarget }) {
  const copy = {
    en: { identity:'Campus Navigator', search:'Search buildings or rooms', clearSearch:'Clear search', all:'All categories', tours:'360° only', more:'More categories', clear:'Clear filters', reset:'Reset all', legend:'Select any building · 360° = tour available', browse:'Browse campus', back:'Back to results', return:'Selected building', available:'360° tour available', information:'Building information', enter:'Explore in 360°', loading:'Preparing 360° view…', expand:'Expand details', collapse:'Collapse details', expanded:'Expand fully', empty:'No matching buildings or rooms.', group:'Nearby buildings', groupHint:'Choose a building here, or search the whole campus.', zone:'Zone', outside:'Outside current filter', sources:'Details & sources', official:'University website', map:'Campus map 2026', inside:'Inside this building', checkpoints:'Tour checkpoints', entrance:'Entrance', show:'Show selected building', directions:'Show me the way', buildings:n=>n+(n===1?' building':' buildings'), results:n=>n+(n===1?' result':' results') },
    ar: { identity:'دليل الحرم الجامعي', search:'ابحث عن مبنى أو قاعة', clearSearch:'مسح البحث', all:'جميع الفئات', tours:'جولات 360° فقط', more:'المزيد من الفئات', clear:'مسح التصفية', reset:'إعادة ضبط الكل', legend:'اختر أي مبنى · 360° = جولة متاحة', browse:'تصفح الحرم الجامعي', back:'العودة إلى النتائج', return:'المبنى المحدد', available:'تتوفر جولة بزاوية 360°', information:'معلومات المبنى', enter:'استكشف بزاوية 360°', loading:'جارٍ تجهيز العرض بزاوية 360°…', expand:'عرض التفاصيل', collapse:'طي التفاصيل', expanded:'عرض كامل', empty:'لا توجد مبانٍ أو قاعات مطابقة.', group:'مبانٍ متقاربة', groupHint:'اختر مبنى من هنا أو ابحث في الحرم الجامعي كله.', zone:'المنطقة', outside:'خارج التصفية الحالية', sources:'التفاصيل والمصادر', official:'موقع الجامعة', map:'خريطة الحرم الجامعي 2026', inside:'داخل هذا المبنى', checkpoints:'نقاط الجولة', entrance:'المدخل', show:'عرض المبنى المحدد', directions:'أرشدني إلى القاعة', buildings:n=>n+' مبانٍ', results:n=>n+' نتائج' }
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
  let focusSnapshot=null;
  $('#campus-focus')?.addEventListener('click',()=>{
    const focused=root.classList.contains('campus-focus');
    if(!focused){rememberScroll();focusSnapshot={snap:sheet.snap,scroll:body.scrollTop};snapshot();}
    root.classList.toggle('campus-focus',!focused);
    if(focused){sheet.set(focusSnapshot?.snap||sheet.snap,{instant:true,notify:false});body.scrollTop=focusSnapshot?.scroll||0;focusSnapshot=null;}
    updateHeader();
  },{signal});
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
    if($('#campus-descriptor'))$('#campus-descriptor').textContent=language()==='ar'?'خريطة الحرم الجامعي التفاعلية':'Interactive Campus Map';
    search.placeholder=text('search');search.setAttribute('aria-label',text('search'));
  }
  function select(hall, selectedRoom=null) {
    rememberScroll();
    const changed=selected?.id!==hall.id;
    selected=hall;room=selectedRoom;group=null;mode='details';
    if(changed)detailScroll=0;
    render();sheet.set(sheet.snap==='expanded'?'expanded':'half');body.scrollTop=detailScroll;
    if(changed&&map&&hall.mapCoordinates) {
      const point=map.project(hall.mapCoordinates),container=map.getContainer(),card=$('.campus-map-card').getBoundingClientRect(),controls=$('#campus-controls').getBoundingClientRect();
      const occluded=[card,controls].some(rect=>point.x>=rect.left&&point.x<=rect.right&&point.y>=rect.top&&point.y<=rect.bottom);
      if(occluded||point.x<25||point.x>container.clientWidth-25||point.y<25||point.y>container.clientHeight-25) {
        const phone=matchMedia('(max-width:640px) and (orientation:portrait)').matches;
        const rtl=document.documentElement.dir==='rtl';
        const free=phone?{left:25,right:container.clientWidth-25,top:controls.bottom+15,bottom:card.top-15}
          :{left:rtl?25:card.right+20,right:rtl?card.left-20:container.clientWidth-25,top:controls.top+55,bottom:container.clientHeight-35};
        map.easeTo({center:hall.mapCoordinates,offset:[(free.left+free.right)/2-container.clientWidth/2,(free.top+free.bottom)/2-container.clientHeight/2],duration:reduced()?0:280});
      }
    }
    snapshot();
  }
  function renderList() {
    const pool=group||halls;
    const composed=filterCampus(halls,search.value,activeCategory,toursOnly,language());
    const items=group?composed.filter(item=>pool.includes(item.hall)):composed;
    const count=composed.some(item=>item.room)?copy[language()].results(composed.length):copy[language()].buildings(new Set(composed.map(item=>item.hall.id)).size);
    $('#directory-count').textContent=(activeCategory?localized(CATEGORIES[activeCategory],language())+' · ':'')+count;
    const key=JSON.stringify([group?.map(h=>h.id),search.value,activeCategory,toursOnly,language()]);
    if(key!==listKey) {
      results.replaceChildren();listKey=key;
      if(!items.length) {
        results.append(node('p','directory-empty',text('empty')));
        if(toursOnly&&filterCampus(pool,search.value,activeCategory,false,language()).length)
          results.append(button('campus-filter',language()==='ar'?'عرض المباني دون جولة 360°':'Include buildings without a 360° tour',()=>{toursOnly=false;revealResults();}));
        for(const suggestion of searchSuggestions(pool,search.value))
          results.append(button('campus-filter',(language()==='ar'?'هل تقصد: ':'Did you mean: ')+suggestion,()=>{search.value=suggestion;revealResults();search.focus();}));
        if(search.value)results.append(button('campus-filter',text('clearSearch'),()=>{search.value='';revealResults();search.focus();}));
        if(activeCategory||toursOnly)results.append(button('campus-filter',text('clear'),()=>{activeCategory=null;toursOnly=false;revealResults();}));
      }
      for(const item of items) {
        const el=button('hall-result','',()=>{select(item.hall,item.room);handle.focus({preventScroll:true});});
        el.dataset.buildingId=item.hall.id;
        el.dataset.roomId=item.room?.id||'';el.id='campus-result-'+item.hall.id+'-'+(item.room?.id||'building');
        el.classList.toggle('is-match',Boolean(search.value||activeCategory||toursOnly));
        const caption=node('strong');appendSearchHighlight(caption,item.label,search.value);
        el.append(caption,node('small','',((item.room?item.room.tour:item.hall.tour)?text('available'):text('information'))+(item.hall.zone?' · '+text('zone')+' '+item.hall.zone:'')));
        results.append(el);
      }
    }
    for(const row of results.querySelectorAll('.hall-result')){
      const chosen=row.dataset.buildingId===selected?.id&&row.dataset.roomId===(room?.id||'');
      row.classList.toggle('is-selected',chosen);row.setAttribute('aria-pressed',String(chosen));
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
    const focused=root.classList.contains('campus-focus'),focus=$('#campus-focus');
    if(focus){focus.textContent=language()==='ar'?(focused?'عرض البطاقة':'التركيز على الخريطة'):(focused?'Show panel':'Focus map');focus.setAttribute('aria-pressed',String(focused));}
    $('.campus-map-card').style.setProperty('--zone-accent',ZONE_COLORS[selected?.zone]||'var(--ui-accent)');
    title.textContent=mode==='details'&&selected?label(selected):group?text('group'):text('browse');
    status.textContent=mode==='details'&&selected?(selected.zone?text('zone')+' '+selected.zone+' · ':'')+(target()?text('available'):text('information'))+(room?' · '+localized(room.name,language()):''):group?text('groupHint'):count;
    collapse.textContent=sheet.snap==='peek'?'+':sheet.snap==='half'?'↟':'−';
    collapse.setAttribute('aria-label',text(sheet.snap==='peek'?'expand':sheet.snap==='half'?'expanded':'collapse'));
    collapse.setAttribute('aria-expanded',String(sheet.snap!=='peek'));
    browse.hidden=mode!=='details'&&!group;
    browse.textContent=search.value.trim()?(language()==='ar'?'العودة إلى نتائج البحث':'Back to search results'):activeCategory?(language()==='ar'?'العودة إلى ':'Back to ')+localized(CATEGORIES[activeCategory],language()):text('back');
    returnButton.hidden=mode!=='results'||!selected;returnButton.textContent=text('return');
  }
  function render(){renderFilters();const count=renderList();renderDetail();renderActions();updateHeader(count);refreshMarkers();}
  search.addEventListener('input',()=>revealResults(),{signal});
  search.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(selected)returnButton.onclick();search.blur();return;}
    if(!['ArrowDown','ArrowUp','Enter'].includes(event.key))return;
    const rows=[...results.querySelectorAll('.hall-result')];if(!rows.length)return;
    event.preventDefault();event.stopPropagation();
    const current=rows.findIndex(row=>row.classList.contains('is-active'));
    if(event.key==='Enter'){rows[Math.max(0,current)].click();search.removeAttribute('aria-activedescendant');return;}
    const next=rows[(current+(event.key==='ArrowDown'?1:-1)+rows.length)%rows.length];
    rows.forEach(row=>row.classList.toggle('is-active',row===next));search.setAttribute('aria-activedescendant',next.id);next.scrollIntoView({block:'nearest'});
  },{signal});
  $('#campus-clear-search').onclick=()=>{search.value='';revealResults();search.focus();};
  $('#campus-clear-filters').onclick=()=>{activeCategory=null;toursOnly=false;revealResults();};
  $('#campus-reset').onclick=()=>{search.value='';activeCategory=null;toursOnly=false;revealResults();};
  browse.onclick=()=>{group=null;showMode('results');if(sheet.snap==='peek')sheet.set('half');snapshot();};
  returnButton.onclick=()=>{if(selected){showMode('details');sheet.set(sheet.snap==='expanded'?'expanded':'half');body.scrollTop=detailScroll;snapshot();}};
  collapse.onclick=()=>sheet.set(sheet.snap==='peek'?'half':sheet.snap==='half'?'expanded':'peek');
  body.addEventListener('scroll',()=>{currentScroll();clearTimeout(scrollTimer);scrollTimer=setTimeout(snapshot,120);},{passive:true,signal});
  $('#campus-overview').onclick=()=>overview(false);
  function overviewPadding() {
    const phone=matchMedia('(max-width:640px) and (orientation:portrait)').matches,rtl=document.documentElement.dir==='rtl';
    const controls=$('#campus-controls').getBoundingClientRect();
    return phone?{top:controls.bottom+15,bottom:150,left:20,right:20}
      :{top:85,bottom:45,left:rtl?35:controls.right+22,right:rtl?innerWidth-controls.left+22:35};
  }
  function cameraPolicy() {
    const container=map?.getContainer()||$('#campus-map');
    return campusCameraPolicy(container.clientWidth||innerWidth,container.clientHeight||innerHeight,overviewPadding());
  }
  function applyCameraPolicy() {
    if(!map)return;
    const policy=cameraPolicy();map.setMinZoom(policy.minZoom);map.setMaxZoom(policy.maxZoom);map.setMaxBounds(policy.maxBounds);
  }
  window.addEventListener('resize',applyCameraPolicy,{signal});
  function overview(instant) {
    map?.fitBounds([CAMPUS_CORNERS[2],CAMPUS_CORNERS[0]],{padding:overviewPadding(),duration:instant||reduced()?0:280});
  }
  detail.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();event.stopPropagation();browse.onclick();handle.focus();}},{signal});
  return {
    cameraPolicy,
    initialCamera(){return saved?.camera?clampCampusCamera(saved.camera,cameraPolicy()):null;},
    attach(nextMap,nextArtwork){map=nextMap;artwork=nextArtwork;applyCameraPolicy();map.on('moveend',snapshot);render();},
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
      applyCameraPolicy();
      if(state?.camera)map.jumpTo(clampCampusCamera(state.camera,cameraPolicy()));else if(!initialized)overview(true);
      initialized=true;restoring=false;
    },
    update(){const scroll=body.scrollTop;render();sheet.refresh();body.scrollTop=scroll;snapshot();},
    refreshMarkers,
    destroy(){clearTimeout(scrollTimer);contentAnimation?.cancel();listeners.abort();sheet.destroy();map?.off('moveend',snapshot);artwork?.destroy();}
  };
}
