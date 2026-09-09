/* One lifecycle for every modal.
   The page is never re-laid out while a dialog is open: the document keeps its
   normal flow, its full height and its scroll offset, so no browser can
   recalculate the viewport, the address bar or the zoom scale on close. */
(function () {
  'use strict';
  const root = document.documentElement, body = document.body;
  const active = new Map(), observed = new WeakSet();
  let snapshot = null;
  function save(style, properties) {
    return properties.map(name => [name, style.getPropertyValue(name), style.getPropertyPriority(name)]);
  }
  function restore(style, values) {
    values.forEach(([name, value, priority]) => value ? style.setProperty(name, value, priority) : style.removeProperty(name));
  }
  function current() {
    for (const dialog of active.keys()) if (dialog.open) return dialog;
    return null;
  }
  // Some mobile engines still drag the document behind a modal. Block only the
  // touches aimed outside the dialog; scrolling inside the dialog stays native.
  function blockBackgroundTouch(event) {
    const dialog = current();
    if (!dialog || (event.target !== dialog && dialog.contains(event.target))) return;
    if (event.cancelable) event.preventDefault();
  }
  function lock() {
    if (snapshot) return;
    const gap = Math.max(0, window.innerWidth - root.clientWidth);
    snapshot = {x:window.scrollX, y:window.scrollY,
      root:save(root.style, ['overflow','scroll-behavior']),
      body:save(body.style, ['padding-right'])};
    const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
    root.style.setProperty('scroll-behavior', 'auto');
    // Suspends user scrolling only. Position, flow and document height are untouched.
    root.style.setProperty('overflow', 'hidden');
    // Stable gutters prevent desktop reflow; compensate on older engines only.
    if (!(window.CSS && CSS.supports('scrollbar-gutter', 'stable')) && gap) body.style.setProperty('padding-right', padding + gap + 'px');
    if (document.addEventListener) document.addEventListener('touchmove', blockBackgroundTouch, {passive:false});
  }
  function unlock() {
    if (!snapshot || active.size) return;
    const old = snapshot; snapshot = null;
    if (document.removeEventListener) document.removeEventListener('touchmove', blockBackgroundTouch, {passive:false});
    restore(body.style, old.body);
    // Restore overflow before scroll; keep smooth scrolling off for this operation.
    restore(root.style, old.root.filter(([name]) => name !== 'scroll-behavior'));
    // Safety net only: the offset is normally preserved because the page never moved.
    if (Math.abs(window.scrollX - old.x) > 1 || Math.abs(window.scrollY - old.y) > 1) {
      window.scrollTo({left:old.x, top:old.y, behavior:'instant'});
    }
    restore(root.style, old.root.filter(([name]) => name === 'scroll-behavior'));
  }
  function release(dialog) {
    const record = active.get(dialog);
    if (!record) return;
    active.delete(dialog); unlock();
    if (record.trigger && record.trigger.isConnected && !record.trigger.disabled &&
        (!active.size || [...active.keys()].some(other => other.contains(record.trigger)))) {
      record.trigger.focus({preventScroll:true});
    }
  }
  function open(dialog, trigger, focusTarget) {
    if (dialog.open) return;
    // A previous close event can still be queued when a modal is reopened quickly.
    if (active.has(dialog)) release(dialog);
    lock();
    const record = {trigger}; active.set(dialog, record);
    if (!observed.has(dialog)) {
      observed.add(dialog);
      dialog.addEventListener('close', () => { if (!dialog.open) release(dialog); });
    }
    try {
      dialog.showModal(); dialog.scrollTop = 0;
      const scroller = dialog.querySelector?.('[data-dialog-scroll]');
      if (scroller) scroller.scrollTop = 0;
      if (focusTarget) focusTarget.focus({preventScroll:true});
    } catch (error) {
      release(dialog); throw error;
    }
  }
  window.WeddingDialogs = {open};
}());
