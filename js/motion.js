/* Progressive enhancement: content is always visible before initialization.
   No dependencies, no image changes, no scroll interception. */
(function () {
  'use strict';
  const root = document.documentElement;
  const settings = Object.assign({ enabled: true, intensity: .65, ambient: true, scroll: true, pointer: true, revealDuration: 1500 }, (window.WEDDING_CONFIG || {}).motion);
  const clamp = (number, min, max) => Math.min(max, Math.max(min, number));
  const strength = Number.isFinite(Number(settings.intensity)) ? clamp(Number(settings.intensity), 0, 1) : .65;
  const duration = Number.isFinite(Number(settings.revealDuration)) ? clamp(Number(settings.revealDuration), 500, 2500) : 1500;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const mobile = matchMedia('(max-width: 600px)');
  const toggle = document.getElementById('motion-toggle');
  const scenes = [...document.querySelectorAll('.art-scene')].map(element => ({ element, entrance: element.querySelector('.art-entrance'), image: element.querySelector('img'), active: false, introduced: false, x: 0, y: 0, tx: 0, ty: 0 }));
  const seen = new WeakSet();
  const animations = new Set();
  let paused = false, enabled = false, scrollFrame = 0, pointerFrame = 0, observer = null;
  try { paused = localStorage.getItem('sp-wedding-motion-paused') === '1'; } catch (_) { /* Storage is optional in private/file mode. */ }
  root.style.setProperty('--motion-duration', duration + 'ms');
  root.style.setProperty('--drift-distance', (-6 * strength).toFixed(2) + 'px');
  root.style.setProperty('--drift-angle', (.16 * strength).toFixed(3) + 'deg');
  scenes.forEach(scene => {
    scene.element.classList.toggle('ambient-on', !!settings.ambient && strength > 0);
    scene.entrance.addEventListener('animationend', () => scene.entrance.classList.remove('is-entering'));
    scene.image.addEventListener('load', () => introduce(scene));
  });
  function introduce(scene) {
    if (!enabled || !scene.active || scene.introduced || !scene.image.complete || !scene.image.naturalWidth) return;
    scene.introduced = true;
    scene.entrance.classList.add('is-entering');
  }
  function reveal(element, delay = 0) {
    if (seen.has(element)) return;
    seen.add(element);
    if (!enabled || typeof element.animate !== 'function' || element.contains(document.activeElement)) return;
    const animation = element.animate([
      { opacity: 0, transform: 'translate3d(0,16px,0)' },
      { opacity: 1, transform: 'translate3d(0,0,0)' }
    ], { duration: Math.min(duration, 1100), delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
    animations.add(animation);
    animation.onfinish = () => animations.delete(animation);
    animation.oncancel = () => animations.delete(animation);
  }
  const sections = [...document.querySelectorAll('.hero-copy,.day-content,.location-heading,.venue-card,.invitation-section,.site-footer')];
  function revealSection(element) {
    if (element.matches('.venue-card,.site-footer')) { reveal(element); return; }
    const children = [...element.children].filter(child => !child.hidden && child.id !== 'schedule');
    children.forEach((child, index) => reveal(child, Math.min(index * 85, 340)));
    if (element.matches('.day-content')) element.querySelectorAll('.timeline li').forEach((row, index) => reveal(row, 180 + index * 95));
  }
  function updateScroll() {
    scrollFrame = 0;
    if (!enabled || document.hidden || !settings.scroll) return;
    const height = window.innerHeight;
    const readouts = scenes.filter(scene => scene.active).map(scene => ({ scene, bounds: scene.element.getBoundingClientRect() }));
    readouts.forEach(({ scene, bounds }) => {
      const travel = (scene.element.dataset.scene === 'hero' ? 26 : 18) * strength * (mobile.matches ? .4 : 1);
      const progress = clamp((height / 2 - bounds.top - bounds.height / 2) / height, -1, 1);
      scene.element.style.setProperty('--scroll-y', (progress * travel).toFixed(2) + 'px');
    });
  }
  function requestScroll() {
    if (!scrollFrame && enabled && !document.hidden && settings.scroll) scrollFrame = requestAnimationFrame(updateScroll);
  }
  function resetPointer(scene) {
    scene.x = scene.y = scene.tx = scene.ty = 0;
    ['--pointer-x', '--pointer-y', '--rotate-x', '--rotate-y'].forEach(key => scene.element.style.removeProperty(key));
  }
  function animatePointer() {
    pointerFrame = 0;
    if (!enabled || document.hidden || !finePointer.matches || !settings.pointer) return;
    let unsettled = false;
    scenes.forEach(scene => {
      if (!scene.active) return;
      scene.x += (scene.tx - scene.x) * .09; scene.y += (scene.ty - scene.y) * .09;
      if (Math.abs(scene.tx - scene.x) + Math.abs(scene.ty - scene.y) > .002) unsettled = true;
      else { scene.x = scene.tx; scene.y = scene.ty; }
      scene.element.style.setProperty('--pointer-x', (scene.x * 7 * strength).toFixed(2) + 'px');
      scene.element.style.setProperty('--pointer-y', (scene.y * 4 * strength).toFixed(2) + 'px');
      scene.element.style.setProperty('--rotate-x', (-scene.y * 1.2 * strength).toFixed(3) + 'deg');
      scene.element.style.setProperty('--rotate-y', (scene.x * 1.6 * strength).toFixed(3) + 'deg');
    });
    if (unsettled) pointerFrame = requestAnimationFrame(animatePointer);
  }
  function requestPointer() { if (!pointerFrame) pointerFrame = requestAnimationFrame(animatePointer); }
  scenes.forEach(scene => {
    scene.element.addEventListener('pointermove', event => {
      if (!enabled || !scene.active || !finePointer.matches || !settings.pointer || event.pointerType !== 'mouse') return;
      const rect = scene.element.getBoundingClientRect();
      scene.tx = clamp(((event.clientX - rect.left) / rect.width - .5) * 2, -1, 1);
      scene.ty = clamp(((event.clientY - rect.top) / rect.height - .5) * 2, -1, 1);
      requestPointer();
    }, { passive: true });
    scene.element.addEventListener('pointerleave', () => { scene.tx = scene.ty = 0; if (enabled) requestPointer(); });
  });
  function applyPreference() {
    enabled = !!settings.enabled && !paused && !reduced.matches;
    root.classList.toggle('motion-enabled', enabled);
    root.classList.toggle('motion-paused', !enabled);
    toggle.hidden = !settings.enabled || reduced.matches;
    toggle.textContent = paused ? 'เล่นภาพ' : 'พักภาพ';
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'เปิดภาพเคลื่อนไหว' : 'พักภาพเคลื่อนไหว');
    if (!enabled) {
      cancelAnimationFrame(scrollFrame); cancelAnimationFrame(pointerFrame); scrollFrame = pointerFrame = 0;
      animations.forEach(animation => animation.cancel()); animations.clear();
      document.getElementById('heart-particles').replaceChildren();
      scenes.forEach(scene => { resetPointer(scene); scene.element.style.removeProperty('--scroll-y'); scene.entrance.classList.remove('is-entering'); });
    } else {
      scenes.forEach(introduce); requestScroll();
    }
  }
  toggle.addEventListener('click', () => {
    paused = !paused;
    try { localStorage.setItem('sp-wedding-motion-paused', paused ? '1' : '0'); } catch (_) { /* Still works for this visit. */ }
    applyPreference();
  });
  const onMediaChange = (query, callback) => {
    if (query.addEventListener) query.addEventListener('change', callback);
    else query.addListener(callback);
  };
  onMediaChange(reduced, applyPreference);
  onMediaChange(finePointer, () => { scenes.forEach(resetPointer); });
  onMediaChange(mobile, requestScroll);
  applyPreference();
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const scene = scenes.find(item => item.element === entry.target);
        if (scene) {
          scene.active = entry.isIntersecting;
          scene.element.classList.toggle('scene-active', scene.active);
          if (scene.active) { introduce(scene); requestScroll(); }
          else resetPointer(scene);
        } else if (entry.isIntersecting) { revealSection(entry.target); observer.unobserve(entry.target); }
      });
    }, { threshold: 0, rootMargin: '0px 0px -3% 0px' });
    scenes.forEach(scene => observer.observe(scene.element));
    sections.forEach(element => observer.observe(element));
  } else {
    // Graceful fallback: a readable static page, no continuously animated offscreen art.
    scenes.forEach(scene => { scene.active = true; introduce(scene); scene.element.classList.remove('ambient-on'); });
  }
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll, { passive: true });
  document.addEventListener('focusin', event => {
    // Keyboard focus makes a revealing control immediately fully visible.
    animations.forEach(animation => { if (animation.effect.target.contains(event.target)) animation.cancel(); });
  });
  document.addEventListener('visibilitychange', () => {
    root.classList.toggle('motion-background', document.hidden);
    if (document.hidden) {
      cancelAnimationFrame(scrollFrame); cancelAnimationFrame(pointerFrame); scrollFrame = pointerFrame = 0;
      animations.forEach(animation => animation.finish());
      scenes.forEach(resetPointer);
    } else requestScroll();
  });
  root.classList.toggle('motion-background', document.hidden);
})();
