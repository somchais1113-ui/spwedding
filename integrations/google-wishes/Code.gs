/** PS Wedding Wishes v21. Install in a NEW Apps Script project, separate from RSVP.
 * Set WISHES_SHARED_SECRET in Project Settings > Script properties before setupWishes.
 * Destination defaults are the owner's supplied Sheet and Drive folder.
 * Deploy as Me / Anyone. Requests must carry the server-only shared secret.
 */
const WISH_HEADERS=['รหัสรายการ','วันเวลาส่ง','ชื่อผู้ส่ง','ประเภท','ข้อความอวยพร','รูปแบบการ์ด','ลิงก์ลายมือ','ลิงก์การ์ด','สถานะ','อัปเดตล่าสุด','_fingerprint','_uploads'];
const WISH_CHUNK=2*1024*1024,WISH_MAX=12*1024*1024;
function wishConfig_(){
 const p=PropertiesService.getScriptProperties();
 const config={sheet:p.getProperty('WISHES_SHEET_ID')||'1He7PKjI5SvLfFaqupgbHIghvl7S2nM_QUg6JWdzztt0',folder:p.getProperty('WISHES_DRIVE_FOLDER_ID')||'1Cp5hMHU6-OCN7xgqQhsO_bHgMlHPlXdu',secret:p.getProperty('WISHES_SHARED_SECRET')||''};
 if(config.secret.length<32)throw new Error('not_configured');return config;
}
function wishSheet_(config,create){
 const book=SpreadsheetApp.openById(config.sheet);let sheet=book.getSheetByName('คำอวยพร');
 if(!sheet&&create)sheet=book.insertSheet('คำอวยพร');
 if(!sheet)throw new Error('run_setup');
 if(sheet.getLastRow()===0&&create){
  sheet.getRange(1,1,1,WISH_HEADERS.length).setValues([WISH_HEADERS]).setBackground('#163e72').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);sheet.setColumnWidth(3,190);sheet.setColumnWidth(5,350);sheet.setColumnWidths(7,2,180);sheet.setColumnWidth(9,200);sheet.hideColumns(11,2);
 }
 if(JSON.stringify(sheet.getRange(1,1,1,WISH_HEADERS.length).getValues()[0])!==JSON.stringify(WISH_HEADERS))throw new Error('headers');
 return sheet;
}
function wishFolder_(parent,name){const found=parent.getFoldersByName(name);return found.hasNext()?found.next():parent.createFolder(name);}
function setupWishes(){
 const config=wishConfig_(),lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  const root=DriveApp.getFolderById(config.folder);
  // Creating managed subfolders checks write access without touching existing files.
  wishFolder_(root,'การ์ดคำอวยพร');wishFolder_(root,'ลายมือต้นฉบับ');wishFolder_(root,'_wishes_uploads');
  wishSheet_(config,true);SpreadsheetApp.flush();
  console.log('พร้อมแล้ว: แท็บคำอวยพรและโฟลเดอร์ภาพ ตั้งค่า Deploy เป็น Web app ต่อได้');
 }finally{lock.releaseLock();}
}
function doGet(){return wishJson_({service:'PS Wedding Wishes',version:21});}
function wishJson_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
function wishHash_(bytes){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');}
function wishText_(text){return /^[\s]*[=+@-]/.test(text)?"'"+text:text;}
function wishStatus_(row){return {card:!!row[7],ink:!!row[6],saved:!!row[7]&&(row[3]==='พิมพ์'||!!row[6])};}
function wishSave_(sheet,index,row){row[9]=new Date();const status=wishStatus_(row);row[8]=status.saved?'บันทึกครบแล้ว':row[6]?'บันทึกลายมือแล้ว รอภาพการ์ด':'บันทึกข้อมูลแล้ว รอภาพ';sheet.getRange(index,1,1,row.length).setValues([row]);SpreadsheetApp.flush();return status;}
function wishPng_(bytes){
 const u=i=>(bytes[i]+256)%256;
 if(bytes.length<33||![137,80,78,71,13,10,26,10].every((b,i)=>u(i)===b))return false;
 if(String.fromCharCode(...bytes.slice(12,16))!=='IHDR')return false;
 const read=i=>u(i)*16777216+u(i+1)*65536+u(i+2)*256+u(i+3);
 const w=read(16),h=read(20);return w>0&&h>0&&w<=6000&&h<=6000&&w*h<=18000000;
}
function doPost(e){
 let lock;
 try{
  if(!e||!e.postData||e.postData.contents.length>3*1024*1024)return wishJson_({ok:false,error:'fields'});
  const b=JSON.parse(e.postData.contents),config=wishConfig_();
  if(typeof b.secret!=='string'||b.secret!==config.secret)return wishJson_({ok:false,error:'unauthorized'});
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(b.id||'')||!/^[a-f0-9]{64}$/.test(b.fingerprint||''))throw new Error('fields');
  if(b.action==='enqueue')return wishJson_(wishEnqueue_(b,config));
  if(!['begin','upload','status'].includes(b.action))throw new Error('fields');
  lock=LockService.getScriptLock();if(!lock.tryLock(15000))return wishJson_({ok:false,error:'busy'});
  const sheet=wishSheet_(config,false),last=sheet.getLastRow();
  const found=last>1?sheet.getRange(2,1,last-1,1).createTextFinder(b.id).matchEntireCell(true).findNext():null;
  let index=found?found.getRow():0,row=index?sheet.getRange(index,1,1,WISH_HEADERS.length).getValues()[0]:null;
  if(row&&row[10]!==b.fingerprint)throw new Error('conflict');
  if(b.action==='begin'){
   if(typeof b.name!=='string'||!b.name.trim()||b.name.length>80||/[\x00-\x1f\x7f]/.test(b.name)||!['type','draw'].includes(b.mode)||!['portrait','landscape'].includes(b.format)||typeof b.text!=='string'||b.text.length>1000||(b.mode==='type'?!b.text.trim():b.text!==''))throw new Error('fields');
   if(!row){
    if(last>=2001)throw new Error('limit');
    const recent=last>1?sheet.getRange(Math.max(2,last-60),2,Math.min(last-1,61),1).getValues():[];
    if(recent.filter(r=>Date.now()-new Date(r[0]).getTime()<60000).length>=60)throw new Error('limit');
    row=[b.id,new Date(),wishText_(b.name.trim()),b.mode==='type'?'พิมพ์':'ลายมือ',wishText_(b.text),b.format,'','','',new Date(),b.fingerprint,'{}'];
    index=last+1;wishSave_(sheet,index,row);
   }else{
    // The fingerprint alone is not permission to replace a guest's original message.
    if(row[2]!==wishText_(b.name.trim())&&row[2]!==b.name.trim())throw new Error('conflict');
    if((row[3]==='พิมพ์')!==(b.mode==='type')||row[5]!==b.format||(row[4]!==b.text&&row[4]!==wishText_(b.text)))throw new Error('conflict');
   }
   return wishJson_({ok:true,id:b.id,...wishStatus_(row)});
  }
  if(!row)throw new Error('not_found');
  if(b.action==='status')return wishJson_({ok:true,id:b.id,...wishStatus_(row)});
  if(!['card','ink'].includes(b.kind)||(b.kind==='ink'&&row[3]!=='ลายมือ')||!/^[a-f0-9]{64}$/.test(b.sha||'')||!Number.isInteger(b.size)||b.size<33||b.size>WISH_MAX||b.total!==Math.ceil(b.size/WISH_CHUNK)||!Number.isInteger(b.index)||b.index<0||b.index>=b.total||typeof b.data!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(b.data))throw new Error('fields');
  const column=b.kind==='card'?7:6;
  if(row[column])return wishJson_({ok:true,id:b.id,fileComplete:true,...wishStatus_(row)});
  const bytes=Utilities.base64Decode(b.data);
  if(bytes.length!==Math.min(WISH_CHUNK,b.size-b.index*WISH_CHUNK)||(b.index===0&&!wishPng_(bytes)))throw new Error('image_invalid');
  const root=DriveApp.getFolderById(config.folder),uploads=JSON.parse(row[11]||'{}');let state=uploads[b.kind];
  const tempRoot=wishFolder_(root,'_wishes_uploads');
  if(!state||state.sha!==b.sha){
   // Same written content can render differently after a browser update. Only replace unfinished chunks.
   if(state&&state.folder){try{DriveApp.getFolderById(state.folder).setTrashed(true);}catch(_){}}
   const temp=wishFolder_(tempRoot,b.id+'_'+b.kind+'_'+b.sha);
   state={sha:b.sha,size:b.size,total:b.total,folder:temp.getId()};uploads[b.kind]=state;row[11]=JSON.stringify(uploads);wishSave_(sheet,index,row);
  }
  if(state.size!==b.size||state.total!==b.total)throw new Error('conflict');
  const temp=DriveApp.getFolderById(state.folder),chunkName=String(b.index),existing=temp.getFilesByName(chunkName);
  if(existing.hasNext()){
   if(wishHash_(existing.next().getBlob().getBytes())!==wishHash_(bytes))throw new Error('conflict');
  }else temp.createFile(Utilities.newBlob(bytes,'application/octet-stream',chunkName));
  const parts=[];
  for(let i=0;i<state.total;i++){const files=temp.getFilesByName(String(i));if(!files.hasNext())return wishJson_({ok:true,id:b.id,fileComplete:false,...wishStatus_(row)});parts.push(files.next());}
  // Concatenate original PNG bytes; no recompression, resize or loss of 300-DPI metadata.
  const joined=new Array(b.size);let offset=0;
  parts.forEach(file=>{const data=file.getBlob().getBytes();for(let i=0;i<data.length;i++)joined[offset++]=data[i];});
  if(offset!==b.size||wishHash_(joined)!==b.sha||!wishPng_(joined))throw new Error('image_invalid');
  const name=String(row[2]).replace(/^'/,'').replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g,'_').trim().slice(0,80)||'ผู้ส่ง';
  const filename=name+'_'+Utilities.formatDate(new Date(row[1]),'Asia/Bangkok','yyyy-MM-dd')+'_'+b.id+'_'+(b.kind==='card'?'การ์ด':'ลายมือ')+'.png';
  const destination=wishFolder_(root,b.kind==='card'?'การ์ดคำอวยพร':'ลายมือต้นฉบับ'),previous=destination.getFilesByName(filename);
  // Recover a file created just before a timeout, before its Sheet link was committed.
  let file;
  if(previous.hasNext()){file=previous.next();if(wishHash_(file.getBlob().getBytes())!==b.sha)throw new Error('conflict');}
  else file=destination.createFile(Utilities.newBlob(joined,'image/png',filename));
  row[column]=file.getUrl();delete uploads[b.kind];row[11]=JSON.stringify(uploads);const status=wishSave_(sheet,index,row);
  try{temp.setTrashed(true);}catch(_){/* Saved data stays successful if temporary cleanup fails. */}
  return wishJson_({ok:true,id:b.id,fileComplete:true,...status});
 }catch(error){
  const known=['fields','conflict','not_found','limit','image_invalid','headers','run_setup','not_configured','queue_not_ready'];
  console.error('Wishes failed: '+(known.includes(error.message)?error.message:'storage_error'));
  return wishJson_({ok:false,error:known.includes(error.message)?error.message:'storage_error'});
 }finally{if(lock&&lock.hasLock())lock.releaseLock();}
}

/** Durable v21 queue: source JSON is retained in Drive, independent of any guest browser. */
function wishRendererURL_(){
 const url=PropertiesService.getScriptProperties().getProperty('WISHES_RENDER_URL')||'https://spwedding-teal.vercel.app/api/wish-render';
 if(!/^https:\/\/[a-zA-Z0-9.-]+\/api\/wish-render$/.test(url))throw new Error('queue_not_ready');return url;
}
function setupWishesQueue(){
 setupWishes();const config=wishConfig_();
 const response=UrlFetchApp.fetch(wishRendererURL_(),{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+config.secret},payload:JSON.stringify({action:'health'}),muteHttpExceptions:true,followRedirects:false});
 let health;try{health=JSON.parse(response.getContentText());}catch(_){throw new Error('กรุณา Deploy เว็บ v21 บน Vercel ก่อน แล้วรัน setupWishesQueue อีกครั้ง');}
 if(response.getResponseCode()!==200||health.version!==21||!health.renderer)throw new Error('ตรวจ WISHES_RENDER_URL และ WISHES_SHARED_SECRET ให้ตรงกับ Vercel แล้วลองใหม่');
 const lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  const folder=wishFolder_(DriveApp.getFolderById(config.folder),'ต้นฉบับคำอวยพร');
  const triggers=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='processWishesQueue');
  if(!triggers.length)ScriptApp.newTrigger('processWishesQueue').timeBased().everyMinutes(1).create();
  PropertiesService.getScriptProperties().setProperty('WISHES_SOURCE_FOLDER_ID',folder.getId()).setProperty('WISH_QUEUE_READY','21');
  console.log('พร้อมรับคำอวยพร v21: ประมวลผลภาพเบื้องหลังทุกประมาณ 1 นาที');
 }finally{lock.releaseLock();}
}
function wishEnqueue_(b,config){
 const props=PropertiesService.getScriptProperties();
 if(props.getProperty('WISH_QUEUE_READY')!=='21'||!props.getProperty('WISHES_SOURCE_FOLDER_ID'))throw new Error('queue_not_ready');
 const s=b.source;
 if(!s||typeof s.name!=='string'||!s.name.trim()||s.name.length>80||typeof s.text!=='string'||s.text.length>1000||!['type','draw'].includes(s.mode)||!['portrait','landscape'].includes(s.format)||!Array.isArray(s.strokes))throw new Error('fields');
 if(s.mode==='type'&&!s.text.trim()||s.mode==='draw'&&(!s.strokes.length||!Number.isFinite(s.ratio)||s.ratio<.2||s.ratio>2))throw new Error('fields');
 const serialized=JSON.stringify(s);
 if(wishHash_(Utilities.newBlob(serialized).getBytes())!==b.fingerprint)throw new Error('conflict');
 const lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('busy');
 try{
  const sheet=wishSheet_(config,false),last=sheet.getLastRow();
  const match=last>1?sheet.getRange(2,1,last-1,1).createTextFinder(b.id).matchEntireCell(true).findNext():null;
  let index=match?match.getRow():last+1,row=match?sheet.getRange(index,1,1,12).getValues()[0]:null;
  if(row){
   if(row[10]!==b.fingerprint)throw new Error('conflict');
   const q=JSON.parse(row[11]||'{}').queue;
   if(q&&q.source){if(!wishStatus_(row).saved)props.setProperty('WISH_QUEUE_PENDING','1');return {ok:true,id:b.id,accepted:true,...wishStatus_(row)};}
   throw new Error('conflict');
  }
  if(last>=2001)throw new Error('limit');
  const recent=last>1?sheet.getRange(Math.max(2,last-60),2,Math.min(last-1,61),1).getValues():[];
  if(recent.filter(r=>Date.now()-new Date(r[0]).getTime()<60000).length>=60)throw new Error('limit');
  const folder=DriveApp.getFolderById(props.getProperty('WISHES_SOURCE_FOLDER_ID'));
  const name=s.name.replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g,'_').trim().slice(0,80)||'ผู้ส่ง';
  const filename=name+'_'+b.id+'_ต้นฉบับ.json',existing=folder.getFilesByName(filename);
  let source;
  if(existing.hasNext()){source=existing.next();if(wishHash_(source.getBlob().getBytes())!==b.fingerprint)throw new Error('conflict');}
  else source=folder.createFile(Utilities.newBlob(serialized,'application/json',filename));
  // Set the wake-up flag before committing the row: interrupted acknowledgment is safe to retry.
  props.setProperty('WISH_QUEUE_PENDING','1');
  row=[b.id,new Date(),wishText_(s.name),s.mode==='type'?'พิมพ์':'ลายมือ',wishText_(s.text),s.format,'','','รับคำอวยพรแล้ว รอจัดทำภาพ',new Date(),b.fingerprint,JSON.stringify({queue:{source:source.getId(),attempts:0,next:0,lease:0}})];
  sheet.getRange(index,1,1,12).setValues([row]);SpreadsheetApp.flush();
  return {ok:true,id:b.id,accepted:true,saved:false,ink:false,card:false};
 }finally{lock.releaseLock();}
}
function wishClaim_(config){
 const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return null;
 try{
  const sheet=wishSheet_(config,false),last=sheet.getLastRow();if(last<2){PropertiesService.getScriptProperties().deleteProperty('WISH_QUEUE_PENDING');return null;}
  const rows=sheet.getRange(2,1,last-1,12).getValues();let pending=false;
  for(let i=0;i<rows.length;i++){
   const row=rows[i],uploads=JSON.parse(row[11]||'{}'),q=uploads.queue;
   if(!q||!q.source||wishStatus_(row).saved)continue;
   if(q.attempts>=5){if(q.lease<=Date.now()&&row[8]!=='ต้องตรวจสอบภาพ — ต้นฉบับยังอยู่'){row[8]='ต้องตรวจสอบภาพ — ต้นฉบับยังอยู่';sheet.getRange(i+2,1,1,12).setValues([row]);}continue;}
   pending=true;if(q.lease>Date.now()||q.next>Date.now())continue;
   q.attempts++;q.lease=Date.now()+10*60*1000;q.claim=Utilities.getUuid();
   row[11]=JSON.stringify(uploads);row[8]='กำลังจัดทำภาพ';row[9]=new Date();sheet.getRange(i+2,1,1,12).setValues([row]);SpreadsheetApp.flush();
   return {id:row[0],fingerprint:row[10],sourceId:q.source,claim:q.claim};
  }
  if(!pending)PropertiesService.getScriptProperties().deleteProperty('WISH_QUEUE_PENDING');return null;
 }finally{lock.releaseLock();}
}
function wishCompleteAttempt_(config,job,error){
 const lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  const sheet=wishSheet_(config,false),match=sheet.getRange(2,1,sheet.getLastRow()-1,1).createTextFinder(job.id).matchEntireCell(true).findNext();if(!match)return;
  const index=match.getRow(),row=sheet.getRange(index,1,1,12).getValues()[0],uploads=JSON.parse(row[11]||'{}'),q=uploads.queue;if(!q||q.claim!==job.claim)return;
  q.lease=0;q.next=Date.now()+Math.min(30,Math.pow(2,q.attempts))*60000;
  q.error=error||'';row[8]=wishStatus_(row).saved?'บันทึกครบแล้ว':q.attempts>=5?'ต้องตรวจสอบภาพ — ต้นฉบับยังอยู่':'รอจัดทำภาพอีกครั้ง';
  row[9]=new Date();row[11]=JSON.stringify(uploads);sheet.getRange(index,1,1,12).setValues([row]);SpreadsheetApp.flush();
 }finally{lock.releaseLock();}
}
function processWishesQueue(){
 const props=PropertiesService.getScriptProperties();if(props.getProperty('WISH_QUEUE_PENDING')!=='1')return;
 const config=wishConfig_(),started=Date.now();
 for(let n=0;n<6&&Date.now()-started<180000;n++){
  const job=wishClaim_(config);if(!job)return;let error='';
  try{
   const source=JSON.parse(DriveApp.getFileById(job.sourceId).getBlob().getDataAsString('UTF-8'));
   const response=UrlFetchApp.fetch(wishRendererURL_(),{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+config.secret},payload:JSON.stringify({id:job.id,fingerprint:job.fingerprint,source}),muteHttpExceptions:true,followRedirects:false});
   const result=JSON.parse(response.getContentText());
   if(response.getResponseCode()!==200||!result.ok||result.id!==job.id||!result.saved)error=['text-too-long','font-unavailable','image_size'].includes(result.error)?result.error:'render_failed';
  }catch(_){error='render_failed';}
  wishCompleteAttempt_(config,job,error);
 }
}
/** Owner recovery: retry exhausted jobs without changing guest data or completed images. */
function retryPendingWishes(){
 const config=wishConfig_(),lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  const sheet=wishSheet_(config,false),last=sheet.getLastRow();
  if(last>1){const rows=sheet.getRange(2,1,last-1,12).getValues();rows.forEach((row,i)=>{const u=JSON.parse(row[11]||'{}'),q=u.queue;if(q&&!wishStatus_(row).saved&&q.lease<Date.now()){q.attempts=0;q.next=0;row[11]=JSON.stringify(u);row[8]='รอจัดทำภาพอีกครั้ง';sheet.getRange(i+2,1,1,12).setValues([row]);}});}
  PropertiesService.getScriptProperties().setProperty('WISH_QUEUE_PENDING','1');SpreadsheetApp.flush();
 }finally{lock.releaseLock();}
}
