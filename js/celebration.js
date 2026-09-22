(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const welcome = $('welcome'), page = $('wedding-page');
  page.hidden = true;
  let entering = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function finishEntry(target){
    welcome.hidden = true;
    page.hidden = false;
    window.scrollTo(0,0);
    if(target && target !== '#home'){
      requestAnimationFrame(()=>document.querySelector(target)?.scrollIntoView({behavior:'smooth',block:'start'}));
    }
    $('couple-title').focus({ preventScroll:true });
    window.dispatchEvent(new Event('resize'));
  }
  function openWedding(target='#home'){
    if(!welcome.hidden && !entering){
      entering = true;
      welcome.classList.add('exiting');
      const done = () => finishEntry(target);
      setTimeout(done, reduced.matches || document.documentElement.classList.contains('motion-paused') ? 0 : 660);
      return;
    }
    if(!page.hidden){
      if(target === '#home'){
        window.scrollTo({top:0,behavior:'smooth'});
      }else{
        document.querySelector(target)?.scrollIntoView({behavior:'smooth',block:'start'});
      }
      $('couple-title').focus({ preventScroll:true });
    }
  }
  window.WeddingEntrance = { open: openWedding };
  // Begin only after the exact source image has decoded, including offline preview.
  const botanicalLogo = $('botanical-logo');
  const botanicalAsset = document.getElementById('botanical-artwork');
  if (botanicalLogo && botanicalAsset) {
    botanicalLogo.classList.add('logo-loading');
    const preload = new Image();
    let revealed = false;
    const revealLogo = async () => {
      if (revealed) return; revealed = true;
      try { await preload.decode(); } catch (_) { /* Static image fallback. */ }
      clearTimeout(safety);
      requestAnimationFrame(() => {
        botanicalLogo.classList.remove('logo-loading');
        botanicalLogo.classList.add('logo-ready');
      });
    };
    const safety = setTimeout(() => {
      botanicalLogo.classList.remove('logo-loading');
    }, 2600);
    preload.onload = revealLogo; preload.onerror = revealLogo;
    preload.src = botanicalAsset.getAttribute('href');
    if (preload.complete) revealLogo();
  }

  document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); openWedding('#home'); });
  $('enter-wedding').addEventListener('click', () => openWedding('#home'));
  $('welcome-wishes')?.addEventListener('click', () => openWedding('#wishes'));
  const footer=document.querySelector('.site-footer');
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{entries.forEach(entry=>footer.classList.toggle('footer-motion-active',entry.isIntersecting));}).observe(footer);
  else footer.classList.add('footer-motion-active');
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
    if (!$('wish-name').value.trim()) { $('wish-status').textContent='ใส่ชื่อผู้ส่งก่อนนะครับ เพื่อให้เรารู้ว่าคำอวยพรนี้มาจากใคร'; $('wish-name').focus(); return false; }
    if (mode==='type' ? !$('wish-text').value.trim() : !strokes.length) { $('wish-status').textContent=mode==='type'?'พิมพ์คำอวยพรสักนิดก่อนนะครับ':'เขียนคำอวยพรบนการ์ดก่อนนะครับ'; if(mode==='type') $('wish-text').focus(); return false; }
    return true;
  }
  // Export remains available independently of server delivery.
  const exportButton=$('export-wish'), exportStatus=$('wish-export-status'), photoDialog=$('wish-photo-dialog');
  // Decode the selected template and local fonts before the export click.
  // Only warm when guests approach/interact with wishes, not during landing load.
  const warmExport=()=>window.WeddingWishExport.prepare($('wish-export-format').value).catch(()=>{});
  if('IntersectionObserver' in window){
    const warmObserver=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){
        warmObserver.disconnect();
        if('requestIdleCallback' in window)window.requestIdleCallback(warmExport,{timeout:800});else setTimeout(warmExport,0);
      }
    },{rootMargin:'400px'});
    warmObserver.observe($('wish-form'));
  }
  $('wish-form').addEventListener('focusin',warmExport,{once:true});
  $('wish-export-format').addEventListener('change',warmExport);
  let exporting=false, photoURL=null, photoFile=null, sharingPhoto=false;
  const photoShare=$('share-wish-photo'),photoShareStatus=$('wish-photo-share-status');
  exportButton.addEventListener('click',async()=>{
    if(exporting||sending||!validate())return;
    exporting=true;exportButton.disabled=true;exportButton.setAttribute('aria-busy','true');exportStatus.textContent='กำลังจัดคำอวยพรลงบนการ์ด…';
    const format=$('wish-export-format').value;
    // Snapshot the active handwriting before asynchronous image/font decoding.
    const snapshot=mode==='draw'?document.createElement('canvas'):null;
    if(snapshot){snapshot.width=2400;snapshot.height=Math.round(2400*canvas.height/canvas.width);const ink=snapshot.getContext('2d');strokes.forEach(stroke=>paintStroke(ink,stroke,snapshot.width,snapshot.height));}
    const options={format,mode,text:$('wish-text').value,name:$('wish-name').value,drawing:snapshot};
    try{
      const result=await window.WeddingWishExport.render(options);
      if(photoURL)URL.revokeObjectURL(photoURL);photoURL=URL.createObjectURL(result.blob);
      $('wish-photo-preview').src=photoURL;$('wish-photo-preview').width=result.width;$('wish-photo-preview').height=result.height;
      const download=$('download-wish-photo');download.href=photoURL;download.download='SP-Wedding-Wish-'+(format==='portrait'?'4x5':'16x9')+'-300dpi.png';
      photoFile=typeof File==='function'?new File([result.blob],download.download,{type:'image/png'}):null;
      let canSharePhoto=false;try{canSharePhoto=!!(window.isSecureContext&&navigator.share&&navigator.canShare&&photoFile&&navigator.canShare({files:[photoFile]}));}catch(_){}
      photoShare.hidden=!canSharePhoto;photoShareStatus.textContent=canSharePhoto?'เลือกแชร์ภาพเพื่อเปิดเมนูของอุปกรณ์':'อุปกรณ์นี้ยังแชร์ไฟล์ภาพจากเว็บไม่ได้ ใช้ดาวน์โหลด PNG ได้เลย';
      window.WeddingDialogs.open(photoDialog,exportButton,$('close-wish-photo'));exportStatus.textContent='การ์ดพร้อมแล้ว เลือกแชร์ภาพหรือดาวน์โหลด PNG';
    }catch(error){
      exportStatus.textContent=error.message==='text-too-long'?'ข้อความยาวเกินพื้นที่การ์ด ลองลดข้อความหรือจำนวนบรรทัดก่อนบันทึกนะครับ':error.message==='font-unavailable'?'โหลดฟอนต์การ์ดไม่สำเร็จ กรุณาลองอีกครั้ง':error.name==='SecurityError'?'กรุณาเปิดไฟล์ SP-Wedding-Preview.html หรือเปิดเว็บผ่านเซิร์ฟเวอร์ เพื่อบันทึกการ์ดเป็นภาพ':'ยังจัดทำภาพไม่สำเร็จ กรุณาลองอีกครั้ง และตรวจว่าไฟล์เทมเพลตอยู่ครบ';
    }finally{if(snapshot)snapshot.width=snapshot.height=1;exporting=false;exportButton.disabled=false;exportButton.setAttribute('aria-busy','false');}
  });
  // Native Share Sheet: prepare the File before this fresh user click, preserving activation.
  photoShare.addEventListener('click',async()=>{
    if(sharingPhoto||!photoFile)return;
    sharingPhoto=true;photoShare.disabled=true;photoShareStatus.textContent='';
    try{await navigator.share({files:[photoFile],title:'การ์ดคำอวยพร Somchai & Phantira'});photoShareStatus.textContent='ส่งภาพต่อให้ระบบแชร์แล้ว';}
    catch(error){photoShareStatus.textContent=error.name==='AbortError'?'': 'ยังเปิดเมนูแชร์ไม่ได้ ลองอีกครั้งหรือดาวน์โหลด PNG';}
    finally{sharingPhoto=false;photoShare.disabled=false;}
  });
  $('close-wish-photo').addEventListener('click',()=>photoDialog.close());
  photoDialog.addEventListener('click',event=>{if(event.target!==photoDialog)return;const rect=photoDialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)photoDialog.close();});
  window.addEventListener('pagehide',()=>{if(photoURL)URL.revokeObjectURL(photoURL);});
  const sendButton = $('save-wish'), sendLabel = $('send-wish-label');
  let sending = false;
  let pendingWish = null;
  const deliveryKey = 'ps-wedding-wish-delivery-v21';
  try { pendingWish = JSON.parse(localStorage.getItem(deliveryKey) || 'null'); } catch (_) {}
  function sendState(state, label) {
    sendButton.dataset.state = state;
    sendButton.setAttribute('aria-busy', String(state === 'sending'));
    sendLabel.textContent = label;
  }
  $('wish-form').addEventListener('input', () => { if (!sending) sendState('idle', 'ส่งคำอวยพร'); });
  $('wish-form').addEventListener('submit', async event => {
    event.preventDefault(); if (sending || exporting || !validate()) return;
    if (!/^https?:$/.test(location.protocol) || !window.isSecureContext || !window.WeddingWishesDelivery) {
      $('wish-status').textContent = 'กรุณาเปิดลิงก์เว็บไซต์งานแต่งผ่าน HTTPS เพื่อส่งคำอวยพร'; return;
    }
    sending = true; saveDraft();
    const name=$('wish-name').value.trim(), text=mode==='type'?$('wish-text').value.trim():'', format=$('wish-export-format').value;
    const frozenStrokes=strokes.map(({width,points})=>({width,points:points.map(({x,y})=>({x,y}))}));
    const controls = [...$('wish-form').querySelectorAll('input,textarea,select,button')].map(element => ({element,disabled:element.disabled}));
    controls.forEach(({element}) => {element.disabled = true;}); canvas.style.pointerEvents = 'none';
    sendState('sending','กำลังบันทึกคำอวยพร…');
    const status=$('wish-status'), delivery=window.WeddingWishesDelivery;
    const started=performance.now();
    try {
      const source=window.WeddingWishSource.normalize({name,text,mode,format,ratio:mode==='draw'?canvas.height/canvas.width:1,strokes:mode==='draw'?frozenStrokes:[]});
      const fingerprint=await delivery.hash(JSON.stringify(source));
      if(!pendingWish || pendingWish.fingerprint!==fingerprint || !/^[a-f0-9-]{36}$/.test(pendingWish.id||'')) {
        pendingWish={id:crypto.randomUUID(),fingerprint};
        try {localStorage.setItem(deliveryKey,JSON.stringify(pendingWish));} catch (_) {}
      }
      status.textContent='กำลังส่งคำอวยพรให้บ่าวสาว…';
      const receipt=await delivery.post({action:'enqueue',...pendingWish,source});
      if(receipt.accepted!==true)throw new Error('queue_not_ready');
      status.dataset.elapsedMs=String(Math.round(performance.now()-started));
      sendState('success','ส่งคำอวยพรแล้ว');
      status.textContent='ได้รับคำอวยพรแล้ว ขอบคุณที่เป็นส่วนหนึ่งในวันของเรา · ปิดหน้านี้ได้เลย เราจะจัดเก็บภาพต่อให้ครับ';
    } catch(error) {
      sendState('error','ลองส่งคำอวยพรอีกครั้ง');
      if(error.message==='not_configured') status.textContent='ระบบรับคำอวยพรยังไม่ได้เปิดใช้งาน ข้อความและลายมือยังอยู่';
      else if(error.message==='queue_not_ready') status.textContent='ระบบจัดเก็บภาพกำลังเตรียมพร้อม กรุณาลองอีกครั้ง ข้อความและลายมือยังอยู่';
      else if(error.message==='drawing_size') status.textContent='ลายมือมีรายละเอียดเกินขนาดที่ส่งได้ กรุณาลดบางส่วนแล้วลองอีกครั้ง';
      else if(['limit','rate_limit'].includes(error.message)) status.textContent='มีผู้ส่งคำอวยพรจำนวนมาก กรุณารอสักครู่แล้วลองอีกครั้ง';
      else status.textContent='ยังยืนยันการรับคำอวยพรไม่ได้ กรุณากดส่งอีกครั้ง ระบบจะใช้รหัสรายการเดิม';
    } finally {
      sending=false;controls.forEach(({element,disabled})=>{element.disabled=disabled;});canvas.style.pointerEvents='';
    }
  });
})();
