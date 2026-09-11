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
  const processing=document.getElementById('rsvp-processing');
  const processingMessage=document.getElementById('rsvp-processing-message');
  const confirm=document.getElementById('rsvp-confirm');
  const editButton=document.getElementById('rsvp-edit');
  const homeButton=document.getElementById('rsvp-home');
  const storageKey='sp-wedding-rsvp-id-2026-10-25';
  const teamLabels={team_cap:'ทีมน้องแค้ป',team_bird:'ทีมพี่เบิร์ด'};
  let busy=false, submissionId, processingTimer=0, processingStep=0;
  const processingMessages=['กำลังตรวจสอบข้อมูลของคุณ…','กำลังส่งคำตอบอย่างปลอดภัย…','กำลังบันทึกลงรายชื่อแขก…','อีกนิดเดียวครับ…'];
  function stopProcessingMessages(){clearInterval(processingTimer);processingTimer=0;processingStep=0;processingMessage.classList.remove('is-changing');}
  function startProcessingMessages(){
    stopProcessingMessages();
    processingMessage.textContent=processingMessages[0];
    processingTimer=setInterval(()=>{
      processingStep=(processingStep+1)%processingMessages.length;
      processingMessage.classList.add('is-changing');
      setTimeout(()=>{processingMessage.textContent=processingMessages[processingStep];processingMessage.classList.remove('is-changing');},120);
    },850);
  }
  try{submissionId=localStorage.getItem(storageKey);}catch{}
  if(!/^[a-f0-9-]{36}$/.test(submissionId||'')){
    submissionId=crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
    try{localStorage.setItem(storageKey,submissionId);}catch{}
  }
  function openMainPage(target='#home'){
    if(dialog.open)dialog.close();
    const go=window.WeddingEntrance&&typeof window.WeddingEntrance.open==='function'
      ? ()=>window.WeddingEntrance.open(target)
      : ()=>{location.hash=target;document.querySelector(target)?.scrollIntoView({behavior:'smooth',block:'start'});};
    go();
  }
  document.querySelectorAll('[data-open-rsvp]').forEach(button=>button.addEventListener('click',()=>window.WeddingDialogs.open(dialog,button,close)));
  close.addEventListener('click',()=>dialog.close());
  form.addEventListener('change',()=>{
    exactWrap.hidden=form.elements.partySize.value!=='6+';
    status.textContent='';
  });
  editButton.addEventListener('click',()=>{
    stopProcessingMessages();processing.hidden=true;success.hidden=true;fields.hidden=false;status.textContent='';name.focus({preventScroll:true});
  });
  homeButton.addEventListener('click',()=>openMainPage('#home'));
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    name.value=name.value.trim();if(!name.reportValidity())return;
    const team=form.elements.team.value;
    if(!teamLabels[team]){
      status.dataset.state='error';status.textContent='กรุณาเลือกทีมของคุณก่อนยืนยัน';
      form.querySelector('input[name="team"]')?.focus({preventScroll:true});
      return;
    }
    const attendance=event.submitter?.value==='declined'?'declined':'attending';
    const choice=form.elements.partySize.value;
    if(attendance==='attending'&&choice==='6+'&&!exact.reportValidity())return;
    const partySize=attendance==='declined'?0:choice==='6+'?Number(exact.value):Number(choice);
    if(location.protocol==='file:'){
      status.dataset.state='error';status.textContent='ตัวอย่างในเครื่องยังส่งคำตอบไม่ได้ กรุณาเปิดลิงก์เว็บไซต์งานแต่งเพื่อยืนยัน';return;
    }
    busy=true;fields.disabled=true;form.setAttribute('aria-busy','true');
    status.textContent='';success.hidden=true;fields.hidden=true;processing.hidden=false;startProcessingMessages();
    try{
      const response=await fetch('/api/rsvp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({submissionId,name:name.value,team,attendance,partySize,website:form.elements.website.value}),signal:AbortSignal.timeout(25000)});
      const result=await response.json();
      if(!response.ok||result.saved!==true||result.id!==submissionId)throw new Error(result.error||'save_failed');
      stopProcessingMessages();processing.hidden=true;status.textContent='';success.hidden=false;
      const teamName=teamLabels[team];
      document.getElementById('rsvp-receipt').textContent=attendance==='attending'?`บันทึกคำตอบแล้ว ขอบคุณคุณ${name.value} • ${teamName} รวมทั้งหมด ${partySize} คน หากต้องการเปลี่ยนข้อมูลภายหลัง สามารถกดแก้ไขคำตอบได้จากอุปกรณ์นี้ครับ`:`บันทึกแล้วว่าคุณ${name.value} • ${teamName} ไม่สะดวกมาร่วมงาน ขอบคุณที่แจ้งให้เราทราบครับ`;
      if(dialog.open)editButton.focus({preventScroll:true});
    }catch(error){
      stopProcessingMessages();processing.hidden=true;fields.hidden=false;
      status.dataset.state='error';
      status.textContent=error.message==='not_configured'?'ระบบรับคำตอบยังไม่เปิดใช้งาน กรุณาลองอีกครั้งภายหลัง':error.message==='rate_limit'?'ส่งคำตอบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่':'ยังยืนยันผลการบันทึกไม่ได้ กรุณากดยืนยันอีกครั้ง ระบบจะใช้คำตอบเดิมเพื่อป้องกันรายการซ้ำ';
    }finally{busy=false;fields.disabled=false;form.removeAttribute('aria-busy');confirm.textContent='ยืนยัน';}
  });
})();
