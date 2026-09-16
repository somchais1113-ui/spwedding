/* Both invitation entrypoints use this controller. Audio is gesture-started, optional and never loops. */
(function(){
 'use strict';
 const dialog=document.getElementById('invite-dialog');
 if(!dialog)return;
 const config=window.WEDDING_CONFIG||{},settings=config.invitationCard||{};
 const stage=document.getElementById('invitation-art-stage'),cover=stage.querySelector('.book-cover');
 const front=document.getElementById('invite-front-image'),back=document.getElementById('invite-back-image');
 const flip=document.getElementById('invite-show-front'),soundButton=document.getElementById('invite-sound');
 const readable=document.getElementById('invitation-readable'),status=document.getElementById('invite-status');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const duration=Math.max(1800,Math.min(3200,Number(settings.durationMs)||2400));
 const requestedVolume=Number(settings.paperVolume);
 const volume=Math.max(0,Math.min(.18,Number.isFinite(requestedVolume)?requestedVolume:.1));
 dialog.style.setProperty('--invitation-duration',duration+'ms');
 let generation=0,finishTimer=0,soundTimer=0,loadTimer=0,assetPromise=null,audioContext=null,noiseBuffer=null,activeSound=null;
 let soundEnabled=settings.paperSound!==false;
 try{const saved=localStorage.getItem('wedding-invitation-sound');if(saved!==null)soundEnabled=saved==='on';}catch(_){/* Private browsing: retain this session's setting. */}
 const still=()=>reduce.matches||document.documentElement.classList.contains('motion-paused');
 function updateSound(){soundButton.setAttribute('aria-pressed',String(soundEnabled));soundButton.title=soundEnabled?'ปิดเสียงกระดาษ':'เปิดเสียงกระดาษ';}
 function stopSound(){
  clearTimeout(soundTimer);soundTimer=0;
  if(activeSound){const old=activeSound;activeSound=null;try{old.source.stop();}catch(_){}old.nodes.forEach(n=>{try{n.disconnect();}catch(_){}});}
 }
 function stop(){clearTimeout(finishTimer);clearTimeout(loadTimer);finishTimer=loadTimer=0;stopSound();}
 function prepareSound(){
  if(!soundEnabled||document.hidden)return;
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;
   if(!Audio)return;
   if(!audioContext)audioContext=new Audio();
   // Called synchronously inside the user's click, before loading/decode awaits.
   if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
   if(!noiseBuffer){
    const length=Math.floor(audioContext.sampleRate*1.7);
    noiseBuffer=audioContext.createBuffer(1,length,audioContext.sampleRate);
    const data=noiseBuffer.getChannelData(0);let low=0;
    for(let i=0;i<length;i++){
     const white=Math.random()*2-1;low=.82*low+.18*white;
     const time=i/audioContext.sampleRate;
     // Quiet irregular friction, not a pitched swoosh or an impact sound.
     const texture=.65+.2*Math.sin(time*39)+.15*Math.sin(time*83);
     data[i]=(white*.27+low*.65)*texture;
    }
   }
  }catch(_){/* Audio must never prevent opening or reading the card. */}
 }
 function playPaper(token){
  if(token!==generation||!dialog.open||document.hidden||!soundEnabled||audioContext?.state!=='running'||!noiseBuffer)return;
  stopSound();
  try{
   const source=audioContext.createBufferSource(),high=audioContext.createBiquadFilter(),low=audioContext.createBiquadFilter(),gain=audioContext.createGain();
   source.buffer=noiseBuffer;high.type='highpass';high.frequency.value=650;low.type='lowpass';low.frequency.value=4200;
   const t=audioContext.currentTime;
   gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume*.6,t+.12);gain.gain.linearRampToValueAtTime(volume,t+.4);gain.gain.linearRampToValueAtTime(volume*.35,t+.85);gain.gain.linearRampToValueAtTime(volume*.5,t+1.05);gain.gain.linearRampToValueAtTime(0,t+1.65);
   source.connect(high);high.connect(low);low.connect(gain);gain.connect(audioContext.destination);
   const record={source,nodes:[source,high,low,gain]};activeSound=record;
   source.onended=()=>{record.nodes.forEach(n=>{try{n.disconnect();}catch(_){}});if(activeSound===record)activeSound=null;};source.start(t);source.stop(t+1.7);
  }catch(_){stopSound();}
 }
 function loadImage(img){
  if(!img.getAttribute('src')||(img.complete&&!img.naturalWidth))img.src=img.dataset.cardSrc;
  if(typeof img.decode==='function')return img.decode();
  if(img.complete)return img.naturalWidth?Promise.resolve():Promise.reject(new Error('Image unavailable'));
  return new Promise((resolve,reject)=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',reject,{once:true});});
 }
 function assets(){
  if(!assetPromise)assetPromise=Promise.all([loadImage(front),loadImage(back)]).catch(error=>{assetPromise=null;throw error;});
  return assetPromise;
 }
 function finish(token){
  if(token!==generation||!dialog.open)return;
  clearTimeout(finishTimer);finishTimer=0;
  dialog.dataset.inviteState='ready';stage.setAttribute('aria-busy','false');flip.disabled=false;
  cover.setAttribute('aria-hidden','true');back.parentElement.removeAttribute('aria-hidden');
  status.textContent='เปิดการ์ดแล้ว สามารถอ่านข้อความและกำหนดการด้านล่างได้';
 }
 async function open(trigger){
  if(dialog.open)return;
  const token=++generation;stop();
  stage.hidden=false;stage.setAttribute('aria-busy','true');flip.disabled=true;flip.setAttribute('aria-pressed','false');flip.textContent='ดูด้านหน้า';readable.open=false;
  dialog.dataset.inviteState='loading';cover.setAttribute('aria-hidden','true');back.parentElement.removeAttribute('aria-hidden');status.textContent='กำลังเตรียมการ์ด';
  try{window.WeddingDialogs.open(dialog,trigger,document.getElementById('close-dialog'));}catch(_){stage.setAttribute('aria-busy','false');return;}
  // Commit the non-animated loading pose, including rapid close/reopen in one frame.
  void cover.offsetWidth;
  prepareSound();
  try{
   await Promise.race([assets(),new Promise((_,reject)=>{loadTimer=setTimeout(()=>reject(new Error('Card load timeout')),8000);})]);
   clearTimeout(loadTimer);loadTimer=0;
   if(token!==generation||!dialog.open)return;
   if(still()||document.hidden){finish(token);return;}
   dialog.dataset.inviteState='opening';status.textContent='กำลังเปิดการ์ด';
   soundTimer=setTimeout(()=>playPaper(token),Math.round(duration*.12));
   finishTimer=setTimeout(()=>finish(token),duration+100);
  }catch(_){
   if(token!==generation||!dialog.open)return;
   clearTimeout(loadTimer);loadTimer=0;
   stage.hidden=true;stage.setAttribute('aria-busy','false');readable.open=true;dialog.dataset.inviteState='error';
   status.textContent='โหลดภาพการ์ดไม่สำเร็จ สามารถอ่านข้อความและกำหนดการด้านล่างได้';
  }
 }
 cover.addEventListener('animationend',event=>{if(event.animationName==='invitation-unfold'&&dialog.dataset.inviteState==='opening')finish(generation);});
 flip.addEventListener('click',()=>{
  if(flip.disabled)return;
  stop();const showFront=dialog.dataset.inviteState!=='front';
  dialog.dataset.inviteState=showFront?'front':'ready';flip.setAttribute('aria-pressed',String(showFront));flip.textContent=showFront?'ดูกำหนดการ':'ดูด้านหน้า';
  cover.setAttribute('aria-hidden',String(!showFront));back.parentElement.setAttribute('aria-hidden',String(showFront));
 });
 soundButton.addEventListener('click',()=>{
  soundEnabled=!soundEnabled;updateSound();if(!soundEnabled)stopSound();
  try{localStorage.setItem('wedding-invitation-sound',soundEnabled?'on':'off');}catch(_){}
 });
 dialog.addEventListener('close',()=>{if(dialog.open)return;++generation;stop();dialog.dataset.inviteState='closed';stage.setAttribute('aria-busy','false');});
 function settle(){if(dialog.open&&dialog.dataset.inviteState==='opening'){stop();finish(generation);}}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopSound();settle();}});
 if(reduce.addEventListener)reduce.addEventListener('change',()=>{if(reduce.matches)settle();});else reduce.addListener(()=>{if(reduce.matches)settle();});
 const palette=document.getElementById('invitation-dress-colors');
 (config.dressCode?.colors||[]).forEach(color=>{const li=document.createElement('li'),dot=document.createElement('i'),label=document.createElement('span');dot.setAttribute('aria-hidden','true');dot.style.setProperty('--swatch',color.hex);label.textContent=color.name;li.append(dot,label);palette.append(li);});
 updateSound();window.WeddingInvitation={open};
})();
