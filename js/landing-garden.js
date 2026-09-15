/* Decorative motion only: no scroll locks, viewport changes, or navigation dependencies. */
(function(){
 'use strict';
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const enabled=()=>!reduce.matches&&!document.hidden&&document.documentElement.classList.contains('motion-enabled');
 const gardens=[...document.querySelectorAll('.welcome-garden')].map(element=>({
  element,host:element.closest('#welcome,#wedding-page'),visible:false,ready:false
 }));
 if(!gardens.length)return;
 const main=gardens.find(g=>g.element.classList.contains('main-garden'));
 let frame=0,lastTime=0,current=0,target=0;
 function mainActive(){return !!main&&main.visible&&!main.host.hidden&&enabled();}
 function stop(){cancelAnimationFrame(frame);frame=0;lastTime=0;}
 function tick(time){
  frame=0;
  if(!mainActive()){lastTime=0;return;}
  const dt=lastTime?Math.min(64,time-lastTime):16.67;
  lastTime=time;
  current+=(target-current)*(1-Math.exp(-dt/240));
  if(Math.abs(target-current)<.015)current=target;
  main.element.style.setProperty('--garden-scroll',current.toFixed(3)+'px');
  if(current!==target)frame=requestAnimationFrame(tick);else lastTime=0;
 }
 function scroll(){
  if(!mainActive())return;
  // A bounded nine-pixel drift independent of document length and viewport size.
  target=-Math.sin(window.scrollY/650)*9;
  if(!frame)frame=requestAnimationFrame(tick);
 }
 function sync(){
  gardens.forEach(g=>g.element.classList.toggle('garden-visible',g.visible&&!g.host.hidden&&enabled()));
  if(mainActive())scroll();else stop();
  if(reduce.matches&&main){current=target=0;main.element.style.removeProperty('--garden-scroll');}
 }
 function decoded(img){
  if(typeof img.decode==='function')return img.decode().catch(()=>{});
  if(img.complete)return Promise.resolve();
  return new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});});
 }
 gardens.forEach(g=>{
  function start(){if(g.ready)return;g.ready=true;g.element.classList.add('garden-ready');sync();}
  const images=[...g.element.querySelectorAll('img')];
  images.forEach(img=>img.addEventListener('error',()=>{img.hidden=true;},{once:true}));
  const fallback=setTimeout(start,3000);
  Promise.all(images.map(decoded)).then(()=>{clearTimeout(fallback);start();});
  new MutationObserver(sync).observe(g.host,{attributes:true,attributeFilter:['hidden']});
 });
 if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{
   entries.forEach(entry=>gardens.filter(g=>g.host===entry.target).forEach(g=>{g.visible=entry.isIntersecting;}));
   sync();
  },{threshold:0});
  gardens.forEach(g=>observer.observe(g.host));
 }else{gardens.forEach(g=>{g.visible=true;});sync();}
 window.addEventListener('scroll',scroll,{passive:true});
 document.addEventListener('visibilitychange',sync);
 if(reduce.addEventListener)reduce.addEventListener('change',sync);else reduce.addListener(sync);
 new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
})();
