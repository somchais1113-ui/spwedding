/* Presentation only: success is called only after the durable receipt. */
(function(){
 'use strict';
 const dialog=document.createElement('dialog');dialog.id='wish-sending-dialog';
 dialog.setAttribute('aria-labelledby','wish-sending-title');
 dialog.innerHTML='<div class="wish-send-scene" aria-hidden="true"><div class="wish-envelope"><div class="wish-letter">♡</div><div class="wish-envelope-back"></div><div class="wish-envelope-front"></div><div class="wish-envelope-flap"></div><span class="wish-envelope-heart">♥</span></div></div><h2 id="wish-sending-title" role="status" aria-live="polite"></h2><p class="wish-sending-note"></p><button type="button" class="button wish-sending-dismiss">ซ่อนหน้าต่างนี้</button>';
 document.body.append(dialog);
 const title=dialog.querySelector('h2'),note=dialog.querySelector('p'),dismiss=dialog.querySelector('button');let slowTimer,finishTimer;
 const close=()=>{clearTimeout(slowTimer);clearTimeout(finishTimer);if(dialog.open)dialog.close();};
 dismiss.addEventListener('click',close);dialog.addEventListener('close',()=>{clearTimeout(slowTimer);clearTimeout(finishTimer);});
 window.WeddingWishSending={
  start(trigger){clearTimeout(slowTimer);clearTimeout(finishTimer);dialog.dataset.state='sending';title.textContent='เรากำลังส่งข้อความให้น๊าา..';note.textContent='รอสักครู่นะ เปิดหน้านี้ไว้ก่อน';dismiss.textContent='ซ่อนหน้าต่างนี้';window.WeddingDialogs.open(dialog,trigger,dismiss);slowTimer=setTimeout(()=>{title.textContent='อีกนิดนึงนะ กำลังนำส่งคำอวยพร…';},5000);},
  success(){clearTimeout(slowTimer);dialog.dataset.state='success';title.textContent='ส่งคำอวยพรเรียบร้อยแล้ว 💙';note.textContent='ขอบคุณที่เป็นส่วนหนึ่งในวันของเรา';dismiss.textContent='เรียบร้อย';if(dialog.open)finishTimer=setTimeout(close,1400);},
  error(message){clearTimeout(slowTimer);dialog.dataset.state='error';title.textContent='ยังส่งไม่สำเร็จนะ';note.textContent=message;dismiss.textContent='กลับไปลองอีกครั้ง';}
 };
})();
