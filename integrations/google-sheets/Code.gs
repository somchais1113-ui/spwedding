/** SP Wedding RSVP. Paste into a project bound to the supplied Google Sheet.
 * Run setupRsvp once, then deploy as a Web app. See docs/RSVP-SETUP-TH.md.
 * Never put the shared secret in website JavaScript or in the spreadsheet.
 */
const RSVP_SHEET_ID='1He7PKjI5SvLfFaqupgbHIghvl7S2nM_QUg6JWdzztt0';
const RSVP_TAB='RSVP';
const RSVP_HEADERS=['รหัสคำตอบ','บันทึกครั้งแรก','อัปเดตล่าสุด','ชื่อผู้ตอบ','สถานะการเข้าร่วม','จำนวนผู้ร่วมงาน'];
function rsvpSheet_(){
  const book=SpreadsheetApp.openById(RSVP_SHEET_ID);
  let sheet=book.getSheetByName(RSVP_TAB);
  if(!sheet)sheet=book.insertSheet(RSVP_TAB);
  if(sheet.getLastRow()===0){
    sheet.getRange(1,1,1,6).setValues([RSVP_HEADERS]).setBackground('#102e59').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);sheet.setColumnWidth(1,285);sheet.setColumnWidths(2,2,170);sheet.setColumnWidth(4,220);sheet.setColumnWidth(5,210);sheet.setColumnWidth(6,150);
  }else if(JSON.stringify(sheet.getRange(1,1,1,6).getValues()[0])!==JSON.stringify(RSVP_HEADERS)){
    throw new Error('RSVP headers differ; preserve existing data and check the setup guide.');
  }
  return sheet;
}
function setupRsvp(){
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{rsvpSheet_();SpreadsheetApp.flush();}finally{lock.releaseLock();}
}
function doPost(event){
  const json=data=>ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  let lock;
  try{
    if(!event||!event.postData||event.postData.contents.length>4096)return json({saved:false});
    const body=JSON.parse(event.postData.contents);
    const secret=PropertiesService.getScriptProperties().getProperty('RSVP_SHARED_SECRET');
    if(!secret||secret.length<32||body.secret!==secret)return json({saved:false});
    const {submissionId,name,attendance,partySize}=body;
    if(typeof submissionId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(submissionId))return json({saved:false});
    if(typeof name!=='string'||!name.trim()||name.length>80||/[\u0000-\u001f\u007f]/.test(name))return json({saved:false});
    if(!['attending','declined'].includes(attendance)||!Number.isInteger(partySize)||(attendance==='attending'?(partySize<1||partySize>999):partySize!==0))return json({saved:false});
    lock=LockService.getScriptLock();if(!lock.tryLock(8000))return json({saved:false});
    const sheet=rsvpSheet_(),last=sheet.getLastRow();
    const found=last>1?sheet.getRange(2,1,last-1,1).createTextFinder(submissionId).matchEntireCell(true).findNext():null;
    const row=found?found.getRow():last+1,now=new Date();
    const created=found?sheet.getRange(row,2).getValue():now;
    // Escape spreadsheet formula prefixes, including whitespace before =.
    const safeName=/^[=+@-]/.test(name.trim())?"'"+name.trim():name.trim();
    sheet.getRange(row,1,1,6).setValues([[submissionId,created,now,safeName,attendance==='attending'?'เข้าร่วมงาน':'ไม่สะดวกมาร่วมงาน',partySize]]);
    sheet.getRange(row,2,1,2).setNumberFormat('dd/MM/yyyy HH:mm');
    sheet.getRange(row,6).setNumberFormat('0');
    SpreadsheetApp.flush();
    return json({saved:true,id:submissionId});
  }catch(error){return json({saved:false});}
  finally{if(lock&&lock.hasLock())lock.releaseLock();}
}
