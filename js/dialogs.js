/* One lifecycle for every modal: never leave the page locked, resized or displaced. */
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
  function lock() {
    if (snapshot) return;
    const gap = Math.max(0, window.innerWidth - root.clientWidth);
    snapshot = {x:window.scrollX, y:window.scrollY,
      root:save(root.style, ['overflow','scroll-behavior']),
      body:save(body.style, ['position','top','left','right','width','padding-right'])};
    const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
    root.style.setProperty('scroll-behavior', 'auto');
    root.style.setProperty('overflow', 'hidden');
    body.style.setProperty('position', 'fixed');
    body.style.setProperty('top', -snapshot.y + 'px');
    body.style.setProperty('left', '0');
    body.style.setProperty('right', '0');
    body.style.setProperty('width', 'auto');
    // Stable gutters prevent desktop reflow; compensate on older engines only.
    if (!(window.CSS && CSS.supports('scrollbar-gutter', 'stable')) && gap) body.style.setProperty('padding-right', padding + gap + 'px');
  }
  function unlock() {
    if (!snapshot || active.size) return;
    const old = snapshot; snapshot = null;
    restore(body.style, old.body);
    // Restore overflow before scroll; keep smooth scrolling off for this operation.
    restore(root.style, old.root.filter(([name]) => name !== 'scroll-behavior'));
    window.scrollTo({left:old.x, top:old.y, behavior:'instant'});
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
