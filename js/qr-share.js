(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const triggers=[$('open-qr'),...document.querySelectorAll('[data-open-qr]')], dialog=$('qr-dialog'), image=$('qr-image');
  const share=$('share-qr'), status=$('qr-status');
  let file=null, preparation=null, sharing=false;
  function prepare() {
    if (preparation) return preparation;
    // Original PNG bytes are shared; no canvas redraw or QR recompression.
    preparation=fetch(image.getAttribute('src')).then(response=>{
      if (!response.ok) throw new Error('image-unavailable');
      return response.blob();
    }).then(blob=>{
      file=new File([blob], 'Qr Code.png', {type:'image/png'});
      try {share.hidden=!(window.isSecureContext && navigator.share && navigator.canShare && navigator.canShare({files:[file]}));}
      catch (_) {share.hidden=true;}
      if(share.hidden)status.textContent='อุปกรณ์นี้ยังแชร์ไฟล์ภาพจากเว็บไม่ได้ สามารถแตะค้างที่ภาพเพื่อใช้เมนูของอุปกรณ์';
    }).catch(()=>{preparation=null;status.textContent='ยังเตรียมภาพสำหรับแชร์ไม่ได้ กรุณาเปิดอีกครั้ง หรือแตะค้างที่ภาพ';});
    return preparation;
  }
  function open(trigger) {
    status.textContent='';
    window.WeddingDialogs.open(dialog,trigger,$('close-qr'));
    if (!file) prepare();
    else if(share.hidden)status.textContent='อุปกรณ์นี้ยังแชร์ไฟล์ภาพจากเว็บไม่ได้ สามารถแตะค้างที่ภาพเพื่อใช้เมนูของอุปกรณ์';
  }
  triggers.forEach(trigger=>{
    trigger.addEventListener('click',()=>open(trigger));
    if(trigger.getAttribute('role')==='button')trigger.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();if(!event.repeat)open(trigger);}
    });
  });
  $('close-qr').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
  });
  share.addEventListener('click',async()=>{
    if(!file||sharing)return;
    sharing=true;share.disabled=true;status.textContent='';
    try {await navigator.share({files:[file],title:'Qr Code'});}
    catch(error){if(error.name!=='AbortError')status.textContent='ยังแชร์ไม่ได้ กรุณาลองอีกครั้ง';}
    finally {sharing=false;share.disabled=false;}
  });
}());
