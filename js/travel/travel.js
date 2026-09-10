/* Standalone progressive enhancement: no framework, network SDK or global style mutation. */
(function () {
  'use strict';
  const root = document.getElementById('explore'), D = window.WEDDING_TRAVEL_DATA, H = window.WeddingTravelHelpers;
  if (!root || !D || !H) return;
  const q = s => root.querySelector(s), el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const svgNS = 'http://www.w3.org/2000/svg';
  const icons = {compass:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M16 8l-3 5-5 3 3-5z',temple:'M3 20h18M5 20V10h14v10M2 10h20L12 3zM9 20v-6h6v6M12 3V1',coffee:'M4 5h13v10a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 7h2a3 3 0 0 1 0 6h-2M7 2v1M11 2v1M15 2v1',mountain:'M2 20 10 5l4 7 3-5 5 13zM7 11l3 2 3-2',leaf:'M19 3C5 2 2 9 5 16s16 6 14-13ZM4 21 15 9',camera:'M3 7h4l2-3h6l2 3h4v14H3zM16 13a4 4 0 1 0-8 0 4 4 0 0 0 8 0',arrow:'M4 12h16M14 6l6 6-6 6'};
  function icon(name) { const e = document.createElementNS(svgNS,'svg'); e.setAttribute('viewBox','0 0 24 24'); e.setAttribute('aria-hidden','true'); e.classList.add('travel-icon'); const p=document.createElementNS(svgNS,'path'); p.setAttribute('d',icons[name] || icons.compass);e.append(p);return e; }
  const viewport=q('.travel-viewport'), scene=q('.travel-scene'), pins=q('.travel-pins'), results=q('.travel-results'), filters=q('.travel-filters'), sheet=q('.travel-sheet'), detail=q('.travel-detail');
  const mobile=matchMedia('(max-width:900px)'), reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let mode='all', selected=null, zoom=1, camera=null, visible=false, savedFocus=null, travelTime=0, lastTime=0, raf=0;
  const map=D.map, places=D.locations || [], pinNodes=new Map(), modeNodes=new Map();
  if (!places.length) { q('.travel-results-count').textContent='กำลังเตรียมสถานที่สำหรับการเดินทางครั้งนี้'; q('.travel-layout').hidden=true; q('.travel-picker').hidden=true;return; }
  scene.style.width=map.width+'px';scene.style.height=map.height+'px';
  q('.travel-route-svg').setAttribute('viewBox',`0 0 ${map.width} ${map.height}`);
  const art=q('.travel-map-art'); if(H.imageURL(map.image)) art.src=map.image;
  art.addEventListener('error',()=>root.classList.add('travel-map-unavailable'));
  const venue=q('.travel-venue');venue.style.left=map.venuePosition.x+'px';venue.style.top=map.venuePosition.y+'px';
  const venueURL=H.https(window.WEDDING_CONFIG?.venue?.mapUrl || D.origin.googleMapsURL);if(venueURL)venue.href=venueURL;
  function button(cls,text,handler){const b=el('button',cls,text);b.type='button';b.addEventListener('click',handler);return b;}
  D.modes.forEach(m=>{
    const b=button('travel-filter',null,()=>setMode(m.id));b.setAttribute('aria-pressed','false');
    const copy=el('span','',m.nameTH), sub=el('small','',m.nameEN);sub.lang='en';copy.append(sub);b.append(icon(m.icon),copy);filters.append(b);modeNodes.set(m.id,b);
  });
  places.forEach(p=>{
    const b=button('travel-pin',null,()=>select(p.id,b));b.style.left=p.mapPosition.x+'px';b.style.top=p.mapPosition.y+'px';b.dataset.category=p.category[0];b.setAttribute('aria-label',p.number+'. '+p.nameTH);b.setAttribute('aria-pressed','false');
    const disc=el('span','travel-pin-disc');disc.append(el('span','',p.number));b.append(disc,el('span','travel-pin-label',p.nameTH));pins.append(b);pinNodes.set(p.id,b);
  });
  function applyCamera(smooth=true){
    if(!camera)return;camera=H.pan(camera,viewport.clientWidth,viewport.clientHeight,map);
    scene.style.transitionDuration=smooth?'':'0s';scene.style.transform=`translate(${camera.x}px,${camera.y}px) scale(${camera.scale})`;
    scene.style.setProperty('--travel-inverse',1/camera.scale);
  }
  function center(){
    if(!viewport.clientWidth)return;
    const matches=mode==='all'?[]:H.filter(places,mode).map(p=>p.mapPosition);
    camera=H.camera(viewport.clientWidth,viewport.clientHeight,map,matches,zoom);applyCamera();
  }
  function setMode(next){
    if(!modeNodes.has(next))return;mode=next;selected=null;zoom=mobile.matches?(mode==='all'?1.8:1.95):(mode==='all'?1:1.12);
    modeNodes.forEach((b,id)=>b.setAttribute('aria-pressed',String(id===mode)));
    const matches=H.filter(places,mode), ids=new Set(matches.map(p=>p.id));
    pinNodes.forEach((b,id)=>{const active=ids.has(id);b.classList.toggle('is-muted',!active);b.classList.remove('is-route-stop','is-entering');b.disabled=!active;b.setAttribute('aria-hidden',String(!active));b.tabIndex=active?0:-1;b.setAttribute('aria-pressed','false');if(active){void b.offsetWidth;b.classList.add('is-entering');}});
    const frag=document.createDocumentFragment(),placeholder=el('option','','เลือกสถานที่เพื่อดูรายละเอียด');placeholder.value='';frag.append(placeholder);
    matches.forEach(p=>{const option=el('option','',String(p.number).padStart(2,'0')+' · '+p.nameTH);option.value=p.id;frag.append(option);});results.replaceChildren(frag);results.value='';results.disabled=!matches.length;
    q('.travel-results-count').textContent=`${matches.length} สถานที่และกิจกรรม · ${D.modes.find(m=>m.id===mode).nameTH}`;
    emptyDetail();buildRoute();center();
  }
  function emptyDetail(){
    const box=el('div','travel-empty-detail');
    box.append(el('p','eyebrow','LET’S GO SOMEWHERE LOVELY'),el('h3','','เรื่องราวดี ๆ อยู่รอบตัว'),el('p','','แตะสถานที่ที่ถูกใจ แล้วให้เราพาไปรู้จักมุมเล็ก ๆ รอบสังคมด้วยกัน'),icon('compass'),el('p','','เลือกได้ทั้งจากหมุดบนแผนที่ หรือรายชื่อด้านล่าง'));detail.replaceChildren(box);
  }
  function navigation(p){const box=el('div','travel-navigation'),url=H.navigation(p);if(url){const a=el('a','button','นำทาง');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label','นำทางไป '+p.nameTH+' ใน Google Maps เปิดแท็บใหม่');a.append(icon('arrow'));box.append(a);}box.append(el('p','','Google Maps · เส้นทางจากตำแหน่งปัจจุบันของคุณ'));return box;}
  function destination(p,isSheet){
    const fragment=document.createDocumentFragment(),photo=el('div','travel-destination-image');
    const placeholder=()=>{photo.replaceChildren(icon('camera'),el('span','','ไม่สามารถแสดงภาพได้'));};
    const asset=p.images?.[0];if(asset && H.imageURL(asset.src)){const img=el('img');img.src=asset.src;img.alt=asset.alt||p.nameTH;img.width=asset.width||1200;img.height=asset.height||800;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.addEventListener('error',placeholder,{once:true});photo.append(img);}else placeholder();
    const body=el('div','travel-destination-body'),heading=el('h3','travel-place-name',p.nameTH);heading.id=isSheet?'travel-sheet-title':'travel-detail-title';const english=el('p','travel-place-english',p.nameEN);english.lang='en';
    body.append(el('p','travel-place-kicker',p.category.map(c=>D.modes.find(m=>m.id===c)?.nameTH||c).join(' / ')+' · '+p.area),heading,english,el('p','travel-place-description',p.description),el('p','travel-highlight',p.highlight));
    const facts=el('dl','travel-facts');[
      ['จากสถานที่จัดงาน',p.estimatedTravelTime==null?'ตรวจเวลาใน Maps':p.estimatedTravelTime+' นาที'],
      ['ระยะทางจากงาน',p.distance==null?'ตรวจระยะใน Maps':p.distance+' กม.'],
      ['ช่วงที่แนะนำ',p.recommendedTime],['ระดับกิจกรรม',p.difficulty]
    ].forEach(([label,value])=>{const row=el('div');row.append(el('dt','',label),el('dd','',value));facts.append(row);});
    body.append(facts);
    const more=el('details','travel-more');more.append(el('summary','','ดูรายละเอียด'),el('p','',p.details),el('p','','เหมาะกับ: '+p.suitableFor.join(' · ')));
    const tags=el('div','travel-tags');p.tags.forEach(t=>tags.append(el('span','',t)));more.append(tags);
    (p.sources||[]).forEach(source=>{const url=H.https(source.url);if(url){const a=el('a','',source.title);a.href=url;a.target='_blank';a.rel='noopener noreferrer';more.append(a);}});
    if(p.distance==null||p.estimatedTravelTime==null)more.append(el('p','','ระยะทางจากบ้านจัดงานยังไม่ยืนยัน หากต้องการวางแผนจากงาน ให้ตั้งจุดเริ่มต้นเป็นสถานที่จัดงานใน Google Maps'));
    body.append(more);fragment.append(photo);
    if(asset?.sourcePageURL && H.https(asset.sourcePageURL)){
      const credit=el('p','travel-photo-credit'),source=el('a','','ภาพ: '+(asset.credit||'แหล่งข้อมูลสถานที่'));
      source.href=H.https(asset.sourcePageURL);source.target='_blank';source.rel='noopener noreferrer';source.setAttribute('aria-label','แหล่งภาพ '+p.nameTH+' เปิดแท็บใหม่');credit.append(source);
      if(asset.licenseLabel){credit.append(document.createTextNode(' · '));const license=el(H.https(asset.licenseURL)?'a':'span','',asset.licenseLabel);if(license.tagName==='A'){license.href=H.https(asset.licenseURL);license.target='_blank';license.rel='noopener noreferrer';}credit.append(license);}
      fragment.append(credit);
    }
    fragment.append(body);if(isSheet)fragment.append(navigation(p));else body.append(navigation(p));return fragment;
  }
  function select(id,trigger){
    const p=places.find(x=>x.id===id);if(!p)return;selected=id;
    pinNodes.forEach((b,key)=>b.setAttribute('aria-pressed',String(key===id)));
    results.querySelectorAll('[data-route-extra]').forEach(option=>option.remove());
    if(![...results.options].some(option=>option.value===id)){const option=el('option','',String(p.number).padStart(2,'0')+' · '+p.nameTH+' (เส้นทางแนะนำ)');option.value=id;option.dataset.routeExtra='true';results.append(option);}
    results.value=id;
    detail.replaceChildren(destination(p,false));
    q('.travel-selection-status').textContent='เลือก '+p.nameTH+' แล้ว';
    if(mobile.matches){savedFocus=trigger;q('.travel-sheet-content').replaceChildren(destination(p,true));sheet.setAttribute('aria-labelledby','travel-sheet-title');if(!sheet.open)window.WeddingDialogs.open(sheet,trigger,q('.travel-sheet-close'));sheet.scrollTop=0;}
    else{camera.x=viewport.clientWidth/2-p.mapPosition.x*camera.scale;camera.y=viewport.clientHeight/2-p.mapPosition.y*camera.scale;applyCamera();}
  }
  results.addEventListener('change',()=>{if(results.value)select(results.value,results);});
  q('.travel-sheet-close').addEventListener('click',()=>sheet.close());
  sheet.addEventListener('click',e=>{if(e.target===sheet){const r=sheet.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)sheet.close();}});
  mobile.addEventListener('change',()=>{if(sheet.open)sheet.close();center();});
  const routeLine=q('.travel-route-line'),routeShadow=q('.travel-route-shadow');routeLine.setAttribute('pathLength','1');
  function buildRoute(){
    const route=D.routes.find(r=>r.id===mode)||D.routes[0];if(!route)return;
    q('.travel-route-title').textContent=route.title;q('.travel-route-subtitle').textContent=route.subtitle;q('.travel-route-note').textContent=route.note+' · เส้นทางแนะนำ ไม่ใช่ GPS';
    const list=q('.travel-route-stops');list.replaceChildren(el('li','',D.origin.nameTH));
    route.stops.forEach(id=>{const p=places.find(x=>x.id===id);if(!p)return;const li=el('li'),b=button('',p.nameTH,()=>select(id,b));li.append(b);list.append(li);const pin=pinNodes.get(id);pin.classList.add('is-route-stop');pin.disabled=false;pin.tabIndex=0;pin.setAttribute('aria-hidden','false');});list.append(el('li','','กลับที่พักตามแผนของคุณ'));
    const path=H.routePath(H.routePoints(route,places,map.venuePosition));routeLine.setAttribute('d',path);routeShadow.setAttribute('d',path);replay();
  }
  function motionAllowed(){return !reduced.matches && !document.documentElement.classList.contains('motion-paused');}
  function stopFrame(){if(raf)cancelAnimationFrame(raf);raf=0;lastTime=0;}
  function frame(now){raf=0;if(!visible||document.hidden||!motionAllowed()){lastTime=0;return;}if(lastTime)travelTime=Math.min(5400,travelTime+Math.min(now-lastTime,60));lastTime=now;routeLine.style.strokeDashoffset=String(1-Math.min(travelTime/5400,1));if(travelTime<5400)raf=requestAnimationFrame(frame);else lastTime=0;}
  function reconcileMotion(){
    stopFrame();q('.travel-replay').disabled=!motionAllowed();
    if(!motionAllowed()){travelTime=5400;routeLine.style.strokeDashoffset='0';return;}
    if(visible&&!document.hidden&&travelTime<5400)raf=requestAnimationFrame(frame);
  }
  function replay(){travelTime=motionAllowed()?0:5400;routeLine.style.strokeDashoffset=motionAllowed()?'1':'0';reconcileMotion();}
  q('.travel-replay').addEventListener('click',replay);
  new MutationObserver(reconcileMotion).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change',reconcileMotion);document.addEventListener('visibilitychange',reconcileMotion);
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;root.classList.toggle('is-inactive',!visible);if(visible)center();reconcileMotion();},{threshold:.05}).observe(q('.travel-map-frame'));else visible=true;
  function zoomAt(next,anchor){
    if(!camera)return;const old=camera.scale;zoom=H.clamp(next,1,2.8);camera.scale=camera.base*zoom;
    const a=anchor||{x:viewport.clientWidth/2,y:viewport.clientHeight/2};camera.x=a.x-(a.x-camera.x)*camera.scale/old;camera.y=a.y-(a.y-camera.y)*camera.scale/old;applyCamera(false);
  }
  q('.travel-map-tools').addEventListener('click',e=>{const action=e.target.closest('button')?.dataset.travelZoom;if(!action)return;if(action==='reset'){zoom=1;camera=H.camera(viewport.clientWidth,viewport.clientHeight,map,[],1);applyCamera();}else zoomAt(zoom+(action==='in'?.3:-.3));});
  viewport.addEventListener('keydown',e=>{if(e.target!==viewport||!camera)return;const moves={ArrowLeft:[45,0],ArrowRight:[-45,0],ArrowUp:[0,45],ArrowDown:[0,-45]};if(moves[e.key]){e.preventDefault();camera.x+=moves[e.key][0];camera.y+=moves[e.key][1];applyCamera(false);}else if(e.key==='+'||e.key==='='){e.preventDefault();zoomAt(zoom+.3);}else if(e.key==='-'){e.preventDefault();zoomAt(zoom-.3);}});
  const pointers=new Map();let pinchDistance=0;
  viewport.addEventListener('pointerdown',e=>{if(e.target.closest('button,a')||e.button>0||!camera)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});viewport.setPointerCapture(e.pointerId);viewport.classList.add('is-dragging');pinchDistance=0;});
  viewport.addEventListener('pointermove',e=>{
    const old=pointers.get(e.pointerId);if(!old||!camera)return;const next={x:e.clientX,y:e.clientY};pointers.set(e.pointerId,next);
    if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance){const r=viewport.getBoundingClientRect();zoomAt(zoom*distance/pinchDistance,{x:(a.x+b.x)/2-r.left,y:(a.y+b.y)/2-r.top});}pinchDistance=distance;}
    else{camera.x+=next.x-old.x;camera.y+=next.y-old.y;applyCamera(false);}
  });
  function endPointer(e){pointers.delete(e.pointerId);pinchDistance=0;if(!pointers.size)viewport.classList.remove('is-dragging');}
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>viewport.addEventListener(type,endPointer));
  if('ResizeObserver' in window)new ResizeObserver(center).observe(viewport);else window.addEventListener('resize',center);
  setMode('all');
})();
