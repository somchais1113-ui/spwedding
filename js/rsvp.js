/* No credentials or Google write URLs belong in this browser module. */
(() => {
  'use strict';
  const dialog=document.getElementById('rsvp-dialog');
  const form=document.getElementById('rsvp-form');
  const close=document.getElementById('close-rsvp');
  const fields=document.getElementById('rsvp-fields');
  const name=document.getElementById('rsvp-name');
  const exact=document.getElementById('rsvp-exact');
  const exactWrap=document.getElementById('rsvp-exact-wrap');
  const status=document.getElementById('rsvp-status');
  const success=document.getElementById('rsvp-success');
  const confirm=document.getElementById('rsvp-confirm');
  const storageKey='sp-wedding-rsvp-id-2026-10-25';
  let busy=false, submissionId;
  try{submissionId=localStorage.getItem(storageKey);}catch{}
  if(!/^[a-f0-9-]{36}$/.test(submissionId||'')){
    submissionId=crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
    try{localStorage.setItem(storageKey,submissionId);}catch{}
  }
  document.querySelectorAll('[data-open-rsvp]').forEach(button=>button.addEventListener('click',()=>window.WeddingDialogs.open(dialog,button,close)));
  close.addEventListener('click',()=>dialog.close());
  form.addEventListener('change',()=>{
    exactWrap.hidden=form.elements.partySize.value!=='6+';
    status.textContent='';
  });
  document.getElementById('rsvp-edit').addEventListener('click',()=>{
    success.hidden=true;fields.hidden=false;status.textContent='';name.focus({preventScroll:true});
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    name.value=name.value.trim();if(!name.reportValidity())return;
    const attendance=event.submitter?.value==='declined'?'declined':'attending';
    const choice=form.elements.partySize.value;
    if(attendance==='attending'&&choice==='6+'&&!exact.reportValidity())return;
    const partySize=attendance==='declined'?0:choice==='6+'?Number(exact.value):Number(choice);
    if(location.protocol==='file:'){
      status.dataset.state='error';status.textContent='ตัวอย่างในเครื่องยังส่งคำตอบไม่ได้ กรุณาเปิดลิงก์เว็บไซต์งานแต่งเพื่อยืนยัน';return;
    }
    busy=true;fields.disabled=true;form.setAttribute('aria-busy','true');
    status.dataset.state='pending';status.textContent='กำลังบันทึกคำตอบของคุณ…';confirm.textContent='กำลังบันทึก…';
    try{
      const response=await fetch('/api/rsvp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({submissionId,name:name.value,attendance,partySize,website:form.elements.website.value}),signal:AbortSignal.timeout(25000)});
      const result=await response.json();
      if(!response.ok||result.saved!==true||result.id!==submissionId)throw new Error(result.error||'save_failed');
      status.textContent='';fields.hidden=true;success.hidden=false;
      document.getElementById('rsvp-receipt').textContent=attendance==='attending'?`บันทึกคำตอบแล้ว ขอบคุณคุณ${name.value} แล้วพบกันทั้งหมด ${partySize} คนในวันของเราครับ`:`บันทึกแล้วว่าคุณ${name.value}ไม่สะดวกมาร่วมงาน ขอบคุณที่แจ้งให้เราทราบครับ`;
      if(dialog.open)document.getElementById('rsvp-edit').focus({preventScroll:true});
    }catch(error){
      status.dataset.state='error';
      status.textContent=error.message==='not_configured'?'ระบบรับคำตอบยังไม่เปิดใช้งาน กรุณาลองอีกครั้งภายหลัง':error.message==='rate_limit'?'ส่งคำตอบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่':'ยังยืนยันผลการบันทึกไม่ได้ กรุณากดยืนยันอีกครั้ง ระบบจะใช้คำตอบเดิมเพื่อป้องกันรายการซ้ำ';
    }finally{busy=false;fields.disabled=false;form.removeAttribute('aria-busy');confirm.textContent='ยืนยัน';}
  });
})();
