(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const welcome = $('welcome'), page = $('wedding-page');
  page.hidden = true;
  let entering = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const welcomeMotion = $('welcome-motion'), motion = $('motion-toggle');
  const syncMotion = () => { welcomeMotion.hidden = motion.hidden; welcomeMotion.textContent = motion.textContent; welcomeMotion.setAttribute('aria-pressed', motion.getAttribute('aria-pressed')); };
  welcomeMotion.addEventListener('click', () => { motion.click(); syncMotion(); });
  new MutationObserver(syncMotion).observe(motion, { attributes:true, childList:true });
  syncMotion();
  // Begin only after the exact source image has decoded, including offline preview.
  const botanicalLogo = $('botanical-logo');
  const botanicalAsset = document.getElementById('botanical-artwork');
  if (botanicalLogo && botanicalAsset) {
    botanicalLogo.classList.add('logo-loading');
    const preload = new Image();
    let revealed = false;
    const revealLogo = () => {
      if (revealed) return; revealed = true;
      botanicalLogo.classList.remove('logo-loading');
      botanicalLogo.classList.add('logo-ready');
    };
    preload.onload = revealLogo; preload.onerror = revealLogo;
    preload.src = botanicalAsset.getAttribute('href');
    if (preload.complete) revealLogo();
  }
  document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); $('enter-wedding').click(); });
  $('enter-wedding').addEventListener('click', () => {
    if (entering) return; entering = true;
    welcome.classList.add('exiting');
    const finish = () => { welcome.hidden = true; page.hidden = false; window.scrollTo(0,0); $('couple-title').focus({ preventScroll:true }); window.dispatchEvent(new Event('resize')); };
    setTimeout(finish, reduced.matches || document.documentElement.classList.contains('motion-paused') ? 0 : 660);
  });
  // Pointer coordinates are normalized, preserving artwork through resize/rotation.
  const canvas = $('wish-canvas'), ctx = canvas.getContext('2d');
  const strokes = []; let activeStroke = null, mode = 'type';
  const tabs = [...document.querySelectorAll('[data-mode]')];
  function selectMode(value, focus = false) {
    mode = value;
    tabs.forEach(tab => { const selected = tab.dataset.mode === mode; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; if (selected && focus) tab.focus(); });
    $('panel-type').hidden = mode !== 'type'; $('panel-draw').hidden = mode !== 'draw';
    $('wish-status').textContent = '';
  }
  tabs.forEach(tab => {
    tab.addEventListener('click', () => { selectMode(tab.dataset.mode); draft(); });
    tab.addEventListener('keydown', event => { if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) { event.preventDefault(); selectMode(event.key === 'Home' ? 'type' : event.key === 'End' ? 'draw' : mode === 'type' ? 'draw' : 'type', true); draft(); } });
  });
  function paintStroke(context, stroke, width, height) {
    if (!stroke.points.length) return;
    context.strokeStyle = context.fillStyle = '#163e72'; context.lineWidth = stroke.width * width / 600; context.lineCap = 'round'; context.lineJoin = 'round';
    const p = stroke.points;
    if (p.length === 1) { context.beginPath(); context.arc(p[0].x*width,p[0].y*height,context.lineWidth/2,0,Math.PI*2); context.fill(); return; }
    context.beginPath(); context.moveTo(p[0].x*width,p[0].y*height); p.slice(1).forEach(pt => context.lineTo(pt.x*width,pt.y*height)); context.stroke();
  }
  function redraw() {
    ctx.clearRect(0,0,canvas.width,canvas.height); strokes.forEach(stroke => paintStroke(ctx,stroke,canvas.width,canvas.height));
    $('canvas-prompt').hidden = strokes.length > 0; $('undo-stroke').disabled = $('clear-drawing').disabled = !strokes.length;
  }
  const point = event => { const rect=canvas.getBoundingClientRect(); return {x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))}; };
  canvas.addEventListener('pointerdown', event => {
    if (activeStroke || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault(); canvas.setPointerCapture(event.pointerId);
    activeStroke = { width:Number($('pen-width').value), points:[point(event)], pointer:event.pointerId }; strokes.push(activeStroke); redraw();
  });
  canvas.addEventListener('pointermove', event => {
    if (!activeStroke || activeStroke.pointer !== event.pointerId) return;
    const events = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];
    (events.length ? events : [event]).forEach(e => activeStroke.points.push(point(e))); redraw();
  });
  function endStroke(event) { if (!activeStroke || activeStroke.pointer !== event.pointerId) return; activeStroke = null; draft(); }
  ['pointerup','pointercancel','lostpointercapture'].forEach(name => canvas.addEventListener(name,endStroke));
  $('undo-stroke').addEventListener('click', () => { strokes.pop(); redraw(); draft(); });
  $('clear-drawing').addEventListener('click', () => { strokes.length=0; redraw(); draft(); });
  const storageKey='sp-wedding-wish-2026-10-25';
  let draftTimer;
  function draft() { clearTimeout(draftTimer); draftTimer=setTimeout(saveDraft,350); }
  function saveDraft() {
    try { localStorage.setItem(storageKey,JSON.stringify({name:$('wish-name').value,text:$('wish-text').value,mode,strokes:strokes.map(({width,points})=>({width,points}))})); return true; } catch (_) { return false; }
  }
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
    if(saved) {
      $('wish-name').value=String(saved.name||'').slice(0,80); $('wish-text').value=String(saved.text||'').slice(0,1000);
      if(Array.isArray(saved.strokes)) saved.strokes.slice(0,3000).forEach(s => { if([3,5,8].includes(s.width)&&Array.isArray(s.points)) strokes.push({width:s.width,points:s.points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1)}); });
      selectMode(saved.mode==='draw'?'draw':'type');
    }
  } catch (_) { /* Corrupt/unavailable local drafts never prevent writing. */ }
  redraw();
  const counter=()=>{ $('wish-count').textContent=$('wish-text').value.length; draft(); };
  $('wish-count').textContent=$('wish-text').value.length;
  $('wish-text').addEventListener('input',counter); $('wish-name').addEventListener('input',draft);
  window.addEventListener('pagehide',saveDraft);
  function validate() {
    if (mode==='type' ? !$('wish-text').value.trim() : !strokes.length) { $('wish-status').textContent=mode==='type'?'พิมพ์คำอวยพรสักนิดก่อนนะครับ':'เขียนคำอวยพรบนการ์ดก่อนนะครับ'; if(mode==='type') $('wish-text').focus(); return false; }
    return true;
  }
  // Export remains available independently of server delivery.
  const exportButton=$('export-wish'), exportStatus=$('wish-export-status'), photoDialog=$('wish-photo-dialog');
  let exporting=false, photoURL=null;
  exportButton.addEventListener('click',async()=>{
    if(exporting||!validate())return;
    exporting=true;exportButton.disabled=true;exportButton.setAttribute('aria-busy','true');exportStatus.textContent='กำลังจัดคำอวยพรลงบนการ์ด…';
    const format=$('wish-export-format').value;
    // Snapshot the active handwriting before asynchronous image/font decoding.
    const snapshot=document.createElement('canvas');snapshot.width=canvas.width;snapshot.height=canvas.height;snapshot.getContext('2d').drawImage(canvas,0,0);
    const options={format,mode,text:$('wish-text').value,name:$('wish-name').value,drawing:snapshot};
    try{
      const result=await window.WeddingWishExport.render(options);
      if(photoURL)URL.revokeObjectURL(photoURL);photoURL=URL.createObjectURL(result.blob);
      $('wish-photo-preview').src=photoURL;$('wish-photo-preview').width=result.width;$('wish-photo-preview').height=result.height;
      const download=$('download-wish-photo');download.href=photoURL;download.download='SP-Wedding-Wish-'+(format==='portrait'?'4x5':'16x9')+'.png';
      photoDialog.showModal();photoDialog.scrollTop=0;$('close-wish-photo').focus({preventScroll:true});exportStatus.textContent='การ์ดพร้อมแล้ว เลือกดาวน์โหลด PNG เพื่อบันทึกภาพ';
    }catch(error){
      exportStatus.textContent=error.message==='text-too-long'?'ข้อความยาวเกินพื้นที่การ์ด ลองลดข้อความหรือจำนวนบรรทัดก่อนบันทึกนะครับ':error.name==='SecurityError'?'กรุณาเปิดไฟล์ SP-Wedding-Preview.html หรือเปิดเว็บผ่านเซิร์ฟเวอร์ เพื่อบันทึกการ์ดเป็นภาพ':'ยังจัดทำภาพไม่สำเร็จ กรุณาลองอีกครั้ง และตรวจว่าไฟล์เทมเพลตอยู่ครบ';
    }finally{exporting=false;exportButton.disabled=false;exportButton.setAttribute('aria-busy','false');}
  });
  $('close-wish-photo').addEventListener('click',()=>photoDialog.close());
  photoDialog.addEventListener('close',()=>exportButton.focus({preventScroll:true}));
  photoDialog.addEventListener('click',event=>{if(event.target!==photoDialog)return;const rect=photoDialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)photoDialog.close();});
  window.addEventListener('pagehide',()=>{if(photoURL)URL.revokeObjectURL(photoURL);});
  const sendButton = $('save-wish'), sendLabel = $('send-wish-label');
  let sending = false, lastSent = '';
  function sendState(state, label) {
    sendButton.dataset.state = state;
    sendButton.setAttribute('aria-busy', String(state === 'sending'));
    sendLabel.textContent = label;
  }
  $('wish-form').addEventListener('input', () => { if (!sending) sendState('idle', 'ส่งคำอวยพร'); });
  $('wish-form').addEventListener('submit', async event => {
    event.preventDefault(); if (sending || exporting || !validate()) return;
    const payload = {name:$('wish-name').value.trim(), mode, text:mode==='type'?$('wish-text').value.trim():'', image:mode==='draw'?canvas.toDataURL('image/png'):''};
    const body = JSON.stringify(payload);
    if (body === lastSent) { $('wish-status').textContent = 'คำอวยพรนี้ส่งถึงบ่าวสาวแล้ว ขอบคุณมากนะ'; return; }
    if (!/^https?:$/.test(location.protocol)) {
      sendState('idle', 'ส่งคำอวยพร');
      $('wish-status').textContent = 'หน้านี้เป็นไฟล์ตัวอย่าง ยังส่งคำอวยพรไม่ได้ กรุณาเปิดลิงก์เว็บไซต์งานแต่งเพื่อส่ง';
      return;
    }
    sending = true;
    const controls = [...$('wish-form').querySelectorAll('input,textarea,select,button')].map(element => ({element,disabled:element.disabled}));
    controls.forEach(({element}) => {element.disabled = true;});
    canvas.style.pointerEvents = 'none';
    sendState('sending', 'กำลังส่งคำอวยพร…');
    $('wish-status').textContent = 'กำลังส่งความรู้สึกดี ๆ ไปให้บ่าวสาว';
    try {
      const response = await fetch('/api/wishes', {method:'POST',headers:{'Content-Type':'application/json'},body,signal:AbortSignal.timeout(15000)});
      const result = await response.json();
      if (!response.ok || result.saved !== true) throw new Error('send-failed');
      lastSent = body;
      sendState('success', 'ส่งคำอวยพรแล้ว');
      $('wish-status').textContent = 'คำอวยพรถึงบ่าวสาวแล้ว ขอบคุณที่เติมความหมายให้วันของเรา';
    } catch (_) {
      sendState('error', 'ลองส่งคำอวยพรอีกครั้ง');
      $('wish-status').textContent = 'ยังส่งไม่สำเร็จ ข้อความและลายมือยังอยู่ กรุณาลองอีกครั้งเมื่อเชื่อมต่อได้';
    } finally {
      sending = false;
      controls.forEach(({element,disabled}) => {element.disabled = disabled;});
      canvas.style.pointerEvents = '';
    }
  });
})();
