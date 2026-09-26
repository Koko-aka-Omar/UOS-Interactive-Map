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
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase().replace(/[\s\-–_]/g, '');
  const needle = normalize(query.trim());
  return halls.flatMap(hall => {
    const label = `${hall.code} · ${localized(hall.name, language)}`;
    const matches = value => normalize(value).includes(needle);
    const results = matches(`${hall.code} ${localized(hall.name, 'en')} ${localized(hall.name, 'ar')}`)
      ? [{ hall, room: null, label }] : [];
    if (needle) for (const room of hall.rooms || []) {
      if (matches(`${room.id} ${localized(room.name, 'en')} ${localized(room.name, 'ar')}`)) {
        results.push({ hall, room, label: `${localized(room.name, language)} · ${hall.code}` });
      }
    }
    return results;
  });
}

export function createDirectory({ halls, root, language, isReady, openTour, startDirections }) {
  const copy = {
    en: { choose: 'Choose a hall', search: 'Search halls or rooms', empty: 'No matching halls or rooms', browse: 'All halls', available: '360° tour available', soon: 'Tour coming soon', enter: 'Enter 360° tour', loading: 'Preparing 360° view…', rooms: 'Rooms', entrance: 'Hall entrance', collapse: 'Collapse details', expand: 'Expand details', group: 'Nearby halls', select: 'Select a hall', count: n => `${n} halls`, back: 'All halls' },
    ar: { choose: 'اختر مبنى', search: 'ابحث عن مبنى أو قاعة', empty: 'لا توجد مبانٍ أو قاعات مطابقة', browse: 'جميع المباني', available: 'تتوفر جولة بزاوية 360°', soon: 'الجولة متاحة قريبًا', enter: 'دخول الجولة بزاوية 360°', loading: 'جارٍ تجهيز العرض بزاوية 360°…', rooms: 'القاعات', entrance: 'مدخل المبنى', collapse: 'طي التفاصيل', expand: 'عرض التفاصيل', group: 'مبانٍ متقاربة', select: 'اختر مبنى', count: n => `${n} مبانٍ`, back: 'جميع المباني' }
  };
  const title = root.querySelector('#directory-title');
  const body = root.querySelector('#directory-body');
  const search = root.querySelector('#hall-search');
  const results = root.querySelector('#hall-results');
  const detail = root.querySelector('#hall-detail');
  const collapse = root.querySelector('#directory-collapse');
  const browse = root.querySelector('#directory-browse');
  let map = null, markers = [], selected = null, room = null, group = null, collapsed = false;
  const text = key => copy[language()][key];
  const label = hall => `${hall.code} · ${localized(hall.name, language())}`;
  const node = (tag, className, value) => {
    const el = document.createElement(tag); el.className = className;
    if (value) el.textContent = value;
    return el;
  };
  function select(hall, selectedRoom = null) {
    selected = hall; room = selectedRoom; group = null; collapsed = false; search.value = '';
    render();
    const card = root.querySelector('.campus-map-card');
    const offset = card && map?.getContainer().clientWidth <= 600 ? [0, -Math.min(card.offsetHeight / 2, 170)] : [0, 0];
    map?.easeTo({ center: mapCoordinate(hall), offset, duration: 400 });
  }
  function renderList() {
    results.replaceChildren();
    const pool = group || halls;
    const matches = searchHalls(pool, search.value, language());
    results.hidden = Boolean(selected && !search.value);
    if (results.hidden) return;
    if (!matches.length) results.append(node('p', 'directory-empty', text('empty')));
    for (const item of matches) {
      const button = node('button', 'hall-result'); button.type = 'button';
      button.append(node('strong', '', item.label));
      button.append(node('small', '', (item.room ? item.room.tour : item.hall.tour) ? text('available') : text('soon')));
      button.onclick = () => { select(item.hall, item.room); detail.querySelector('select,button')?.focus({ preventScroll: true }); };
      results.append(button);
    }
  }
  function renderDetail() {
    detail.replaceChildren(); detail.hidden = !selected || Boolean(search.value);
    if (detail.hidden) return;
    if (selected.thumbnail) {
      const img = node('img', 'hall-thumbnail'); img.src = selected.thumbnail; img.alt = label(selected); img.loading = 'lazy';
      img.onerror = () => { img.hidden = true; }; detail.append(img);
    }
    const target = room?.tour || (!room ? selected.tour : null);
    detail.append(node('p', 'hall-status', target ? text('available') : text('soon')));
    if (selected.rooms?.length) {
      const caption = node('p', 'room-label', text('rooms')); caption.id = 'room-picker-label';
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
        if (item && !item.tour) labels.append(node('small', '', text('soon')));
        const check = node('span', 'room-choice-check', active ? '✓' : ''); check.setAttribute('aria-hidden', 'true');
        option.append(labels, check);
        option.onclick = () => { room = item; renderDetail(); detail.querySelector('#hall-room')?.focus({ preventScroll: true }); };
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
    const button = node('button', 'campus-popup-button'); button.id = 'campus-enter'; button.type = 'button';
    button.disabled = !target || Boolean(target.scene && !isReady());
    button.textContent = !target ? text('soon') : target.scene && !isReady() ? text('loading') : text('enter');
    button.onclick = () => { if (target && !button.disabled) openTour(target); };
    detail.append(button);
    if (room && target?.scene && startDirections) {
      const directions = node('button', 'campus-popup-button directions-start', language() === 'ar' ? 'أرشدني إلى القاعة' : 'Show me the way');
      directions.type = 'button'; directions.disabled = !isReady();
      directions.onclick = () => startDirections(target.scene);
      detail.append(directions);
      detail.append(node('small', 'hall-status', language() === 'ar' ? 'اتبع المسار من موقعك الحالي في الجولة.' : 'Follow the route from your current tour viewpoint.'));
    }
  }
  function render() {
    title.textContent = selected ? label(selected) : group ? text('group') : text('choose');
    search.placeholder = text('search'); search.setAttribute('aria-label', text('search'));
    collapse.textContent = collapsed ? '+' : '−'; collapse.setAttribute('aria-label', text(collapsed ? 'expand' : 'collapse'));
    collapse.setAttribute('aria-expanded', String(!collapsed)); body.hidden = collapsed;
    browse.hidden = !selected && !group; browse.textContent = '‹ ' + text('back');
    renderList(); renderDetail();
  }
  function refreshMarkers() {
    if (!map) return;
    markers.forEach(marker => marker.remove()); markers = [];
    for (const members of groupNearby(halls, coordinate => map.project(coordinate))) {
      const button = node('button', members.length > 1 ? 'campus-cluster' : 'campus-marker'); button.type = 'button';
      if (members.length > 1) {
        button.textContent = String(members.length); button.setAttribute('aria-label', text('count')(members.length));
      } else {
        const shape = node('span', 'campus-pin-shape'); shape.append(node('span', '', members[0].code)); button.append(shape);
        button.setAttribute('aria-label', label(members[0])); button.title = label(members[0]);
      }
      button.onclick = () => {
        if (members.length === 1) { select(members[0]); collapse.focus({ preventScroll: true }); return; }
        selected = null; room = null; group = members; collapsed = false; search.value = ''; render();
        // Keep a selectable list even if halls share exactly the same coordinates.
        const bounds = new maplibregl.LngLatBounds(); members.forEach(hall => bounds.extend(mapCoordinate(hall)));
        map.fitBounds(bounds, { padding: 100, maxZoom: Math.min(map.getZoom() + 2, 20), duration: 450 });
        collapse.focus({ preventScroll: true });
      };
      const coordinate = members.reduce((sum, hall) => { const point=mapCoordinate(hall); return [sum[0] + point[0] / members.length, sum[1] + point[1] / members.length]; }, [0, 0]);
      const marker = new maplibregl.Marker({ element: button, anchor: members.length > 1 ? 'center' : 'bottom' }).setLngLat(coordinate).addTo(map);
      marker.directoryMembers = members; markers.push(marker);
    }
  }
  search.oninput = renderListAndDetail;
  function renderListAndDetail() { renderList(); renderDetail(); }
  browse.onclick = () => { selected = null; room = null; group = null; search.value = ''; render(); search.focus(); };
  collapse.onclick = () => { collapsed = !collapsed; render(); };
  return {
    attach(nextMap) { map = nextMap; map.on('moveend', refreshMarkers); refreshMarkers(); render(); },
    update() {
      render();
      for (const marker of markers) {
        const members = marker.directoryMembers;
        const name = members.length > 1 ? text('count')(members.length) : label(members[0]);
        marker.getElement().setAttribute('aria-label', name); marker.getElement().title = name;
      }
    },
    refreshMarkers
  };
}
