import { SHEET_SNAPS } from './campus-state.js';

export function sheetHeights(available, header = 96, action = 0) {
  const max = Math.max(80, available);
  const peek = Math.min(max, Math.max(120, header + action));
  const expanded = Math.max(peek, Math.min(max, Math.round(max * .85)));
  return { peek, half: Math.max(peek, Math.min(expanded, Math.round(max * .5))), expanded };
}

export function settleSheet(height, velocity, heights) {
  const projected = height + Math.max(-2, Math.min(2, velocity)) * 150;
  return SHEET_SNAPS.reduce((best, snap) => Math.abs(heights[snap] - projected) < Math.abs(heights[best] - projected) ? snap : best, 'peek');
}

export function createCampusSheet({ card, handle, controls, header, body, actions, onSettle }) {
  let snap = 'peek', heights, drag = null, suppressClick = false, animation = null, token = 0;
  const listeners = new AbortController(), signal = listeners.signal;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => matchMedia('(max-width: 640px) and (orientation: portrait)').matches;
  const currentHeight = () => card.getBoundingClientRect().height;
  const stopAnimation = () => { const height = currentHeight(); ++token; animation?.cancel(); animation = null; card.style.height = height + 'px'; return height; };
  function measure() {
    const viewport = window.visualViewport;
    const visibleBottom = (viewport?.offsetTop || 0) + (viewport?.height || innerHeight);
    // One handle, two physical anchors. Moving it preserves listeners and state.
    const phone = mobile(), unified = card.contains(controls), parent = phone ? (unified ? card : header) : card;
    if (handle.parentElement !== parent || (phone ? parent.firstElementChild !== handle : card.lastElementChild !== handle)) {
      if (phone) parent.prepend(handle); else card.append(handle);
    }
    handle.setAttribute('aria-label', phone
      ? (document.documentElement.lang === 'ar' ? 'تغيير ارتفاع التفاصيل' : 'Adjust details sheet')
      : (document.documentElement.lang === 'ar' ? 'تغيير حجم بطاقة التفاصيل' : 'Resize details card'));
    card.closest('#map-panel').classList.toggle('campus-keyboard',Boolean(viewport&&mobile()&&viewport.height<innerHeight*.72));
    const top = phone ? (unified ? (viewport?.offsetTop || 0) + 58 : controls.getBoundingClientRect().bottom + 10) : card.getBoundingClientRect().top;
    // Keyboard geometry changes the sheet, not the map's geographic camera.
    card.style.setProperty('--sheet-bottom', mobile() ? Math.max(0, innerHeight - visibleBottom) + 'px' : 'auto');
    const actionHeight = actions.hidden ? 0 : actions.offsetHeight;
    const sideBySide = unified && matchMedia('(orientation:landscape) and (max-height:500px)').matches;
    const headerHeight = sideBySide ? Math.max(controls.offsetHeight, header.offsetHeight + actionHeight) + handle.offsetHeight : header.offsetHeight + (unified ? controls.offsetHeight + handle.offsetHeight : phone ? 0 : handle.offsetHeight);
    const available=visibleBottom-top-(phone?12:18);
    // Measure the compact state, not the expanded controls/content stack.
    const previous=card.dataset.snap;card.dataset.snap='peek';
    const absolute=getComputedStyle(header).position==='absolute';
    controls.querySelector('.campus-header').style.minHeight=absolute?Math.max(44,header.offsetHeight)+'px':'';
    const compact=(absolute?0:header.offsetHeight)+controls.offsetHeight+handle.offsetHeight;
    card.dataset.snap=previous;
    heights = sheetHeights(available,sideBySide?headerHeight:compact,sideBySide?0:actionHeight);
  }
  function access() {
    const peek = snap === 'peek';
    body.hidden = peek; body.inert = peek;
    if (peek && body.contains(document.activeElement)) handle.focus({ preventScroll: true });
    card.dataset.snap = snap;
    handle.setAttribute('aria-expanded', String(!peek));
    handle.dataset.snap = snap;
  }
  function set(next, { instant = false, notify = true } = {}) {
    if (!SHEET_SNAPS.includes(next)) return;
    const from = stopAnimation(); snap = next; access(); measure();
    const to = heights[snap]; card.style.height = to + 'px';
    if (!instant && !reduced() && from && Math.abs(to - from) > 1) {
      const mine = ++token;
      animation = card.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' });
      animation.finished.then(() => { if (mine === token) animation = null; }).catch(() => {});
    }
    if (notify) onSettle?.(snap);
  }
  function end(event, cancelled = false) {
    if (!drag || event.pointerId !== drag.id) return;
    const finished = drag; drag = null;
    card.classList.remove('is-dragging'); suppressClick = finished.moved;
    if (handle.hasPointerCapture(finished.id)) handle.releasePointerCapture(finished.id);
    const velocity = performance.now() - finished.time < 110 ? finished.velocity : 0;
    set(cancelled ? finished.snap : finished.moved ? settleSheet(currentHeight(), velocity, heights) : snap);
    if(finished.moved&&!cancelled){const mine=token;Promise.resolve(animation?.finished).then(()=>{if(mine===token)onSettle?.(snap,{gesture:true});}).catch(()=>{});}
  }
  handle.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || drag) return;
    event.stopPropagation(); measure();
    drag = { id: event.pointerId, y: event.clientY, lastY: event.clientY, height: stopAnimation(), time: performance.now(), velocity: 0, moved: false, snap };
    suppressClick = false; handle.setPointerCapture(event.pointerId);
  }, { signal });
  handle.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    event.stopPropagation();
    const direction = mobile() ? -1 : 1;
    const delta = (event.clientY - drag.y) * direction;
    if (!drag.moved && Math.abs(delta) < 5) return;
    event.preventDefault(); drag.moved = true; card.classList.add('is-dragging');
    body.hidden = false; body.inert = false;
    const now = performance.now(), elapsed = Math.max(1, now - drag.time);
    drag.velocity = (event.clientY - drag.lastY) * direction / elapsed;
    drag.lastY = event.clientY; drag.time = now;
    card.style.height = Math.max(heights.peek, Math.min(heights.expanded, drag.height + delta)) + 'px';
  }, { signal });
  handle.addEventListener('pointerup', event => end(event), { signal });
  handle.addEventListener('pointercancel', event => end(event, true), { signal });
  handle.addEventListener('lostpointercapture', event => end(event, true), { signal });
  handle.addEventListener('click', event => {
    if (suppressClick) { event.preventDefault(); suppressClick = false; return; }
    set(snap === 'peek' ? 'half' : snap === 'half' ? 'expanded' : 'peek');
  }, { signal });
  handle.addEventListener('keydown', event => {
    const index = SHEET_SNAPS.indexOf(snap);
    const grow = mobile() ? 'ArrowUp' : 'ArrowDown', shrink = mobile() ? 'ArrowDown' : 'ArrowUp';
    const next = event.key === grow ? SHEET_SNAPS[Math.min(2, index + 1)] : event.key === shrink ? SHEET_SNAPS[Math.max(0, index - 1)] : event.key === 'Home' ? 'peek' : event.key === 'End' ? 'expanded' : null;
    if (next) { event.preventDefault(); event.stopPropagation(); set(next); }
  }, { signal });
  // Independent surface; never disable map interaction globally.
  for (const event of ['pointerdown', 'wheel', 'dblclick']) card.addEventListener(event, e => e.stopPropagation(), { signal });
  const resize = () => { if (drag) end({ pointerId: drag.id }, true); set(snap, { instant: true, notify: false }); };
  window.addEventListener('resize', resize, { signal });
  window.visualViewport?.addEventListener('resize', resize, { signal });
  window.visualViewport?.addEventListener('scroll', resize, { signal });
  return { set, refresh: resize, get snap() { return snap; }, get peekHeight() { return heights?.peek || 120; }, destroy() { listeners.abort(); stopAnimation(); if (drag) end({ pointerId: drag.id }, true); } };
}
