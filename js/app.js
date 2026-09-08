(function () {
  'use strict';
  const config = window.WEDDING_CONFIG;
  const H = window.WeddingHelpers;
  if (!config || !H) return;
  const $ = selector => document.querySelector(selector);
  const all = selector => [...document.querySelectorAll(selector)];
  const fill = (selector, value) => all(selector).forEach(el => { el.textContent = value || ''; });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersStill = () => reducedMotion.matches || document.documentElement.classList.contains('motion-paused');
  const start = H.validDate(config.date.startAt) || H.validDate(config.date.eventDay + 'T00:00:00+07:00');
  const end = H.validDate(config.date.endAt) || (start ? new Date(start.getTime() + 86400000) : null);
  let dateLabel = config.date.pendingLabel;
  if (start) {
    try { dateLabel = new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeZone: config.date.timeZone }).format(start); }
    catch (_) { dateLabel = new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeZone: 'Asia/Bangkok' }).format(start); }
  }
  fill('[data-groom]', config.couple.groom);
  fill('[data-bride]', config.couple.bride);
  fill('[data-monogram]', config.couple.monogram);
  fill('[data-date-label]', dateLabel);
  fill('[data-time-label]', config.date.timeLabel);
  fill('[data-province]', config.venue.province);
  fill('[data-venue-name]', config.venue.name);
  fill('[data-venue-note]', config.venue.note);
  fill('[data-parking]', config.venue.parking);
  fill('#invitation-message', config.invitation);
  document.title = config.couple.groom + ' & ' + config.couple.bride + ' — Wedding Invitation';
  $('meta[name="description"]').content = 'คำเชิญงานแต่งงานของ ' + config.couple.groom + ' และ ' + config.couple.bride + ' · ' + dateLabel + ' · ' + config.venue.province;

  Object.entries(config.assets).forEach(([key, asset]) => {
    const img = document.querySelector('[data-art="' + key + '"]');
    if (!img) return;
    img.src = asset.src;
    if (key === 'hero') document.querySelectorAll('.story-layer img').forEach(layer => { layer.src = asset.src; if (asset.width && asset.height) { layer.width = asset.width; layer.height = asset.height; } });
    if (asset.width && asset.height) { img.width = asset.width; img.height = asset.height; }
  });
  // Personalized links: https://your-site/?to=ชื่อแขก
  const guest = (new URLSearchParams(location.search).get('to') || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);
  if (guest) fill('[data-guest]', 'ถึงคุณ ' + guest);

  const schedule = $('#schedule');
  schedule.replaceChildren();
  config.schedule.forEach((item, index) => {
    const row = document.createElement('li');
    const number = document.createElement('span'); number.className = 'timeline-index'; number.textContent = String(index + 1).padStart(2, '0');
    const content = document.createElement('div'); const title = document.createElement('h3'); title.textContent = item.title;
    if (item.time) { const time = document.createElement('span'); time.className = 'timeline-time'; time.textContent = item.time; title.append(time); }
    const description = document.createElement('p'); description.textContent = item.description;
    content.append(title, description); row.append(number, content); schedule.append(row);
  });
  $('#schedule-note').textContent = config.scheduleConfirmed ? 'กำหนดการในวันงาน' : (config.scheduleNote || 'กำหนดการเบื้องต้น · เวลาอาจมีการเปลี่ยนแปลง');
  if (!config.schedule.length) $('#schedule-note').textContent = 'กำหนดการจะแจ้งให้ทราบอีกครั้ง';

  const dresscodeSection = $('#dresscode');
  const dresscodeNote = $('.dresscode-note');
  if (dresscodeNote) dresscodeNote.textContent = (config.dressCode && config.dressCode.note) || '';
  const palette = $('#dresscode-palette');
  if (palette && config.dressCode && Array.isArray(config.dressCode.colors) && config.dressCode.colors.length) {
    palette.replaceChildren();
    config.dressCode.colors.forEach(color => {
      const item = document.createElement('li'); item.style.setProperty('--swatch', color.hex);
      const chip = document.createElement('span'); chip.className = 'dresscode-chip'; chip.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span'); name.className = 'dresscode-name'; name.textContent = color.name;
      item.append(chip, name); palette.append(item);
    });
  } else if (dresscodeSection) {
    dresscodeSection.hidden = true;
  }

  const mapUrl = H.safeHttps(config.venue.mapUrl);
  if (mapUrl && !config.venue.address.trim()) $('#venue-address').textContent = 'ดูตำแหน่งบ้านและเส้นทางได้จากหมุด Google Maps ด้านล่าง';
  if (config.venue.address.trim()) { $('#venue-address').textContent = config.venue.address; }
  if (mapUrl) { $('#map-link').href = mapUrl; $('#map-link').hidden = false; $('#map-status').textContent = 'แตะปุ่มด้านล่าง เพื่อดูหมุดและเริ่มนำทาง'; }
  if (config.contact.phone && /^\+?[\d\s()-]{8,20}$/.test(config.contact.phone)) {
    $('#contact-link').href = 'tel:' + config.contact.phone.replace(/[^\d+]/g, '');
    $('#contact-link').textContent = 'สอบถามการเดินทาง · ' + (config.contact.name || 'ผู้ประสานงาน'); $('#contact-link').hidden = false;
  }
  const rsvpUrl = H.safeHttps(config.rsvpUrl);
  if (rsvpUrl) { $('#rsvp-link').href = rsvpUrl; $('#rsvp-link').hidden = false; }

  const dialog = $('#invite-dialog'); let lastTrigger = null;
  all('[data-open-invite]').forEach(button => button.addEventListener('click', () => {
    lastTrigger = button; dialog.showModal(); $('#close-dialog').focus();
  }));
  $('#close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => { if (lastTrigger) lastTrigger.focus({ preventScroll: true }); });
  $('#dialog-location').addEventListener('click', () => {
    lastTrigger = null;
    dialog.close();
    $('#location').scrollIntoView({ behavior: prefersStill() ? 'instant' : 'smooth' });
    const heading = $('#location-title'); heading.tabIndex = -1; heading.focus({ preventScroll: true });
  });

  let toastTimer;
  function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 5500); }
  async function copyText(text) {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (_) { /* Try the local-file fallback below. */ }
    const input = document.createElement('textarea'); input.value = text; input.setAttribute('readonly', ''); input.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.append(input); input.select();
    let success = false; try { success = document.execCommand('copy'); } catch (_) { success = false; }
    input.remove(); return success;
  }
  $('#share-button').addEventListener('click', async () => {
    const url = H.safeHttps(config.siteUrl) || (location.protocol === 'https:' ? location.origin + location.pathname : '');
    if (!url) { toast('เมื่อเว็บไซต์ออนไลน์แล้ว จะสามารถแชร์คำเชิญจากปุ่มนี้ได้'); return; }
    // Share the general invitation. A personalized guest name is not forwarded.
    const cleanUrl = new URL(url); cleanUrl.search = ''; cleanUrl.hash = '';
    const data = { title: document.title, text: 'มาเป็นส่วนหนึ่งในวันสำคัญของเรานะ', url: cleanUrl.href };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (error) { if (error.name === 'AbortError') return; }
    }
    const copied = await copyText(cleanUrl.href);
    toast(copied ? 'คัดลอกลิงก์คำเชิญแล้ว' : 'กรุณาคัดลอกลิงก์จากแถบที่อยู่ของเบราว์เซอร์');
  });

  if (start) {
    $('#welcome-countdown-note').textContent = 'นับถอยหลังถึงเวลาเริ่มงาน · เวลาไทย';
    $('#countdown-section').hidden = false;
    const tick = () => {
      const now = new Date();
      const parts = H.countdownParts(start, now);
      Object.entries(parts).forEach(([key, value]) => {
        all('[data-count="' + key + '"]').forEach(el => { el.textContent = String(value).padStart(2, '0'); });
      });
      if (now >= start) {
        $('#countdown').hidden = true;
        $('#countdown-title').textContent = end && now >= end ? 'A DAY TO REMEMBER' : 'OUR SPECIAL DAY';
        $('#countdown-status').textContent = end && now >= end ? 'ขอบคุณที่ร่วมเป็นส่วนหนึ่งในวันของเรา' : 'ถึงวันสำคัญของเราแล้ว แล้วพบกันนะ';
        $('#welcome-countdown-note').textContent = $('#countdown-status').textContent;
        return;
      }
      Object.entries(parts).forEach(([key, value]) => { $('#' + key).textContent = String(value).padStart(2, '0'); });
    };
    tick(); setInterval(tick, 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  }
  const calendar = H.makeCalendar(config);
  all('[data-calendar]').forEach(button => {
    button.disabled = !calendar; button.hidden = !calendar;
    button.addEventListener('click', () => {
      if (!calendar) return;
      const url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'Somchai-Phantira-Wedding.ics'; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      toast('ดาวน์โหลดไฟล์ปฏิทินแล้ว เปิดไฟล์เพื่อเพิ่มวันสำคัญ');
    });
  });

  $('#heart-button').addEventListener('click', () => {
    $('#heart-note').textContent = 'ขอบคุณสำหรับความยินดี แล้วพบกันในวันของเรา';
  });
})();
