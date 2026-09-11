/** SP Wedding RSVP. Paste into a project bound to the supplied Google Sheet.
 * Run setupRsvp once, then deploy as a Web app. See docs/RSVP-SETUP-TH.md.
 * Never put the shared secret in website JavaScript or in the spreadsheet.
 */
const RSVP_SHEET_ID='1He7PKjI5SvLfFaqupgbHIghvl7S2nM_QUg6JWdzztt0';
const RSVP_TAB='RSVP';
const RSVP_HEADERS=['รหัสคำตอบ','บันทึกครั้งแรก','อัปเดตล่าสุด','ชื่อผู้ตอบ','ทีม','สถานะการเข้าร่วม','จำนวนผู้ร่วมงาน'];
const RSVP_HEADERS_V1=['รหัสคำตอบ','บันทึกครั้งแรก','อัปเดตล่าสุด','ชื่อผู้ตอบ','สถานะการเข้าร่วม','จำนวนผู้ร่วมงาน'];
const RSVP_TEAM_LABELS={team_cap:'ทีมน้องแค้ป',team_bird:'ทีมพี่เบิร์ด'};

function setSheetStyle_(sheet){
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1,285);
  sheet.setColumnWidths(2,2,170);
  sheet.setColumnWidth(4,220);
  sheet.setColumnWidth(5,180);
  sheet.setColumnWidth(6,210);
  sheet.setColumnWidth(7,150);
}

function rsvpSheet_(){
  const book=SpreadsheetApp.openById(RSVP_SHEET_ID);
  let sheet=book.getSheetByName(RSVP_TAB);
  if(!sheet)sheet=book.insertSheet(RSVP_TAB);

  if(sheet.getLastRow()===0){
    sheet.getRange(1,1,1,RSVP_HEADERS.length)
      .setValues([RSVP_HEADERS])
      .setBackground('#102e59')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    setSheetStyle_(sheet);
    return sheet;
  }

  const current6=sheet.getRange(1,1,1,6).getValues()[0];
  const current7=sheet.getLastColumn()>=7 ? sheet.getRange(1,1,1,7).getValues()[0] : [];

  if(JSON.stringify(current7)===JSON.stringify(RSVP_HEADERS)){
    setSheetStyle_(sheet);
    return sheet;
  }

  // Migrate the previous 6-column RSVP sheet by inserting the new Team column.
  if(JSON.stringify(current6)===JSON.stringify(RSVP_HEADERS_V1)){
    sheet.insertColumnAfter(4);
    sheet.getRange(1,1,1,RSVP_HEADERS.length)
      .setValues([RSVP_HEADERS])
      .setBackground('#102e59')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    setSheetStyle_(sheet);
    SpreadsheetApp.flush();
    return sheet;
  }

  throw new Error('RSVP headers differ; preserve existing data and check the setup guide.');
}

function setupRsvp(){
  const lock=LockService.getScriptLock();
  lock.waitLock(10000);
  try{
    rsvpSheet_();
    SpreadsheetApp.flush();
  }finally{
    lock.releaseLock();
  }
}

function getLiveRsvpSheet_(){
  const book=SpreadsheetApp.openById(RSVP_SHEET_ID);
  const sheet=book.getSheetByName(RSVP_TAB);
  if(!sheet||sheet.getLastRow()===0)return rsvpSheet_();
  const current7=sheet.getLastColumn()>=7 ? sheet.getRange(1,1,1,7).getValues()[0] : [];
  if(JSON.stringify(current7)===JSON.stringify(RSVP_HEADERS))return sheet;
  const current6=sheet.getRange(1,1,1,6).getValues()[0];
  if(JSON.stringify(current6)===JSON.stringify(RSVP_HEADERS_V1))return rsvpSheet_();
  throw new Error('RSVP headers differ');
}

function doPost(event){
  const json=data=>ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  let lock;

  try{
    if(!event||!event.postData||event.postData.contents.length>4096)return json({saved:false});

    const body=JSON.parse(event.postData.contents);
    const secret=PropertiesService.getScriptProperties().getProperty('RSVP_SHARED_SECRET');
    if(!secret||secret.length<32||body.secret!==secret)return json({saved:false});

    const {submissionId,name,team,attendance,partySize}=body;

    if(typeof submissionId!=='string'||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(submissionId)){
      return json({saved:false});
    }

    if(typeof name!=='string'||!name.trim()||name.length>80||/[\u0000-\u001f\u007f]/.test(name)){
      return json({saved:false});
    }

    if(typeof team!=='string'||!RSVP_TEAM_LABELS[team])return json({saved:false});

    if(!['attending','declined'].includes(attendance)||
      !Number.isInteger(partySize)||
      (attendance==='attending'?(partySize<1||partySize>999):partySize!==0)){
      return json({saved:false});
    }

    lock=LockService.getScriptLock();
    if(!lock.tryLock(8000))return json({saved:false});

    const sheet=getLiveRsvpSheet_();
    const last=sheet.getLastRow();
    const found=last>1
      ? sheet.getRange(2,1,last-1,1).createTextFinder(submissionId).matchEntireCell(true).findNext()
      : null;
    const row=found?found.getRow():last+1;
    const now=new Date();
    const created=found?sheet.getRange(row,2).getValue():now;

    // Prevent names from being interpreted as spreadsheet formulas.
    const trimmedName=name.trim();
    const safeName=/^[-=+@]/.test(trimmedName)?"'"+trimmedName:trimmedName;

    sheet.getRange(row,1,1,RSVP_HEADERS.length).setValues([[
      submissionId,
      created,
      now,
      safeName,
      RSVP_TEAM_LABELS[team],
      attendance==='attending'?'เข้าร่วมงาน':'ไม่สะดวกมาร่วมงาน',
      partySize
    ]]);
    sheet.getRange(row,2,1,2).setNumberFormat('dd/MM/yyyy HH:mm');
    sheet.getRange(row,7).setNumberFormat('0');

    return json({saved:true,id:submissionId});
  }catch(error){
    return json({saved:false});
  }finally{
    if(lock&&lock.hasLock())lock.releaseLock();
  }
}
