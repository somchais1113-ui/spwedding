/* Optional welcome decoration; image/network errors cannot block entry or forms. */
(function(){
 'use strict';
 const welcome=document.getElementById('welcome');
 const garden=welcome?.querySelector('.welcome-garden');
 if(!garden)return;
 const pictures=[...garden.querySelectorAll('img')];
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 let visible=false,ready=false;
 function sync(){garden.classList.toggle('garden-visible',visible&&!document.hidden&&!welcome.hidden&&!reduce.matches);}
 function start(){if(ready)return;ready=true;garden.classList.add('garden-ready');sync();}
 function decoded(img){
  if(typeof img.decode==='function')return img.decode().catch(()=>{});
  if(img.complete)return Promise.resolve();
  return new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});});
 }
 pictures.forEach(img=>img.addEventListener('error',()=>{img.hidden=true;},{once:true}));
 // A stalled decoration never delays the usable page or permanently hides artwork.
 const fallback=setTimeout(start,3000);
 Promise.all(pictures.map(decoded)).then(()=>{clearTimeout(fallback);start();});
 if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);sync();},{threshold:0});
  observer.observe(welcome);
 }else{visible=true;sync();}
 document.addEventListener('visibilitychange',sync);
 if(reduce.addEventListener)reduce.addEventListener('change',sync);else reduce.addListener(sync);
 new MutationObserver(sync).observe(welcome,{attributes:true,attributeFilter:['hidden']});
})();
