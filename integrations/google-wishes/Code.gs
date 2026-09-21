/** PS Wedding Wishes v20. Install in a NEW Apps Script project, separate from RSVP.
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
function doGet(){return wishJson_({service:'PS Wedding Wishes',version:20});}
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
  const known=['fields','conflict','not_found','limit','image_invalid','headers','run_setup','not_configured'];
  console.error('Wishes failed: '+(known.includes(error.message)?error.message:'storage_error'));
  return wishJson_({ok:false,error:known.includes(error.message)?error.message:'storage_error'});
 }finally{if(lock&&lock.hasLock())lock.releaseLock();}
}
