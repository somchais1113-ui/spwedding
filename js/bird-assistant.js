(function(){
 'use strict';
 const root=document.getElementById('bird-assistant');if(!root)return;
 const trigger=document.getElementById('bird-trigger'),panel=document.getElementById('bird-bubble');let timer;
 // Content editing stays here; the two LINE links intentionally match the supplied brief.
 const links={venue:'https://maps.app.goo.gl/GmbjmEJ2sR3kry6RA',stay:'https://maps.app.goo.gl/oUeK93FsyzDybe6X7',bird:'https://line.me/ti/p/s2AX8U__4j',cap:'https://line.me/ti/p/s2AX8U__4j'};
 root.querySelectorAll('[data-assist-link]').forEach(a=>{a.href=links[a.dataset.assistLink];});
 function close(focus=false){clearTimeout(timer);trigger.classList.remove('is-tapped');panel.classList.remove('show');panel.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus({preventScroll:true});}
 trigger.addEventListener('click',()=>{
  if(!panel.hidden){close();return;}
  panel.hidden=false;requestAnimationFrame(()=>{if(!panel.hidden)panel.classList.add('show');});trigger.setAttribute('aria-expanded','true');trigger.classList.remove('is-entering');trigger.classList.add('is-tapped');
  timer=setTimeout(()=>trigger.classList.remove('is-tapped'),240);
 });
 root.querySelector('.bird-close').addEventListener('click',()=>close(true));
 document.addEventListener('pointerdown',e=>{if(!root.contains(e.target))close();});
 document.addEventListener('focusin',e=>{if(!root.contains(e.target))close();});
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close(true);}});
 root.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>close(true)));
 document.getElementById('bird-schedule').addEventListener('click',()=>{close();window.WeddingEntrance?.open('#schedule');});
 document.addEventListener('visibilitychange',()=>{root.querySelector('.bird-img').style.animationPlayState=document.hidden?'paused':'';});
})();
