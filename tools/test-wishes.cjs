'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {handler,sign,CHUNK_BYTES,validRecord}=require('../lib/wishes.cjs');
const secret='test-secret-only-'.repeat(3),id='12345678-1234-4234-8234-123456789abc',fingerprint='a'.repeat(64);
const begin={action:'begin',id,fingerprint,name:'สมชาย',text:'ยินดีด้วยครับ',mode:'type',format:'portrait'};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7XcAAAAASUVORK5CYII=','base64');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function gas(){
 const folders=new Map(),files=new Map(),rows=[];let seq=0,failNext=false;
 const iter=items=>{let i=0;return{hasNext:()=>i<items.length,next:()=>items[i++]};};
 class File{constructor(name,bytes){this.id='f'+(++seq);this.name=name;this.bytes=Buffer.from(bytes);this.trash=false;files.set(this.id,this);}getId(){return this.id;}getBlob(){return{getBytes:()=>Array.from(this.bytes,x=>x>127?x-256:x),getDataAsString:()=>this.bytes.toString('utf8')};}getUrl(){return 'https://drive.google.com/file/d/'+this.id+'/view';}}
 class Folder{constructor(name){this.id='d'+(++seq);this.name=name;this.children=[];this.files=[];this.trash=false;folders.set(this.id,this);}getId(){return this.id;}createFolder(name){const f=new Folder(name);this.children.push(f);return f;}getFoldersByName(name){return iter(this.children.filter(f=>f.name===name&&!f.trash));}getFilesByName(name){return iter(this.files.filter(f=>f.name===name&&!f.trash));}createFile(blob){const f=new File(blob.name,blob.bytes);this.files.push(f);return f;}setTrashed(v){this.trash=v;}}
 const root=new Folder('Photo');let sheetExists=false;
 function range(r,c,n=1,m=1){const obj={getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>rows[r+i-1]?.[c+j-1]??'')),setValues(values){if(failNext&&r>1&&values[0][7]){failNext=false;throw Error('injected sheet failure');}values.forEach((row,i)=>{rows[r+i-1]??=[];row.forEach((v,j)=>rows[r+i-1][c+j-1]=v);});return obj;},createTextFinder(value){return{matchEntireCell(){return this;},findNext(){const i=rows.findIndex((row,index)=>index>=r-1&&index<r-1+n&&row[c-1]===value);return i<0?null:{getRow:()=>i+1};}};}};for(const k of ['setBackground','setFontColor','setFontWeight'])obj[k]=()=>obj;return obj;}
 const sheet={getRange:range,getLastRow:()=>rows.length,setFrozenRows(){},setColumnWidth(){},setColumnWidths(){},hideColumns(){}};
 const properties=new Map([['WISHES_SHARED_SECRET',secret],['WISHES_DRIVE_FOLDER_ID',root.id]]),triggers=[];let fetchGoogle=()=>({getResponseCode:()=>200,getContentText:()=>JSON.stringify({ok:true,version:21,renderer:true})});
 const propertyAPI={getProperty:k=>properties.get(k)||null,setProperty(k,v){properties.set(k,v);return this;},deleteProperty(k){properties.delete(k);return this;}};
 const context={ScriptApp:{getProjectTriggers:()=>triggers,newTrigger:name=>({timeBased(){return this;},everyMinutes(){return this;},create(){triggers.push({getHandlerFunction:()=>name});}})},UrlFetchApp:{fetch:(...args)=>fetchGoogle(...args)},console:{log(){},error(){}},PropertiesService:{getScriptProperties:()=>propertyAPI},SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheetExists?sheet:null,insertSheet:()=>{sheetExists=true;return sheet;}}),flush(){}},DriveApp:{getFileById:id=>files.get(id),getFolderById:id=>{if(!folders.has(id))throw Error('folder');return folders.get(id);}},LockService:{getScriptLock:()=>{let held=false;return{waitLock(){held=true;},tryLock(){held=true;return true;},hasLock:()=>held,releaseLock(){held=false;}};}},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,b)=>Array.from(crypto.createHash('sha256').update(Buffer.from(b)).digest()),base64Decode:s=>Array.from(Buffer.from(s,'base64'),x=>x>127?x-256:x),getUuid:()=>crypto.randomUUID(),newBlob:(b,mime,name)=>({bytes:Buffer.from(b),name,getBytes:()=>Array.from(Buffer.from(b)),getDataAsString:()=>Buffer.from(b).toString('utf8')}),formatDate:()=> '2026-10-25'}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../integrations/google-wishes/Code.gs'),'utf8'),context);context.setupWishes();
 return{rows,root,files,properties,triggers,context,setFetch(fn){fetchGoogle=fn;},call:b=>JSON.parse(context.doPost({postData:{contents:JSON.stringify({...b,secret})}}).text),failCommit(){failNext=true;}};
}
function chunk(b,kind,bytes,index=0){return{action:'upload',id:b.id,fingerprint:b.fingerprint,kind,size:bytes.length,total:Math.ceil(bytes.length/CHUNK_BYTES),index,sha:hash(bytes),data:bytes.subarray(index*CHUNK_BYTES,(index+1)*CHUNK_BYTES).toString('base64')};}
async function api(body,{headers={},fetchImpl,env}={}){let status,result;const req={method:'POST',headers:{origin:'https://wedding.example',host:'wedding.example','content-type':'application/json',...headers},body,socket:{remoteAddress:crypto.randomUUID()}};const res={setHeader(){},writeHead(s){status=s;},end(s){result=JSON.parse(s);}};await handler(req,res,{env:env||{WISHES_SCRIPT_URL:'https://script.google.com/macros/s/TEST/exec',WISHES_SHARED_SECRET:secret},fetchImpl:fetchImpl||(async()=>({ok:true,json:async()=>({ok:true,id,saved:false})}))});return{status,result};}
// Tests use an isolated in-memory Google API double; they do not write to the owner's Sheet/Drive.
test('configuration, origin, malformed body, upload token and maximum size are enforced',async()=>{
 assert.equal((await api(begin,{env:{}})).status,503);
 assert.equal((await api(begin,{headers:{origin:'https://other.example'}})).status,403);
 assert.equal((await api({...begin,name:''})).status,400);
 assert.equal((await api({action:'status',id,fingerprint,token:'b'.repeat(64)})).status,403);
 assert.equal(validRecord({...chunk(begin,'card',png),token:sign(id,fingerprint,secret),size:13*1024*1024}),null);
});
test('proxy signs sessions, strips private upstream data, refuses unconfirmed saves',async()=>{
 const r=await api(begin,{fetchImpl:async(url,opts)=>{assert.equal(JSON.parse(opts.body).secret,secret);return{ok:true,json:async()=>({ok:true,id,saved:false,name:'private',url:'private',secret})};}});
 assert.equal(r.result.token,sign(id,fingerprint,secret));assert.equal(r.result.saved,false);assert.equal(r.result.name,undefined);assert.equal(r.result.url,undefined);
 assert.equal((await api(begin,{fetchImpl:async()=>({ok:true,json:async()=>({ok:false,error:'storage_error'})})})).status,502);
});
test('begin retries use one Sheet row; name duplicates with different IDs remain separate',()=>{
 const g=gas();assert.equal(g.call(begin).ok,true);assert.equal(g.call(begin).ok,true);assert.equal(g.rows.length,2);
 assert.equal(g.call({...begin,id:'87654321-1234-4234-8234-123456789abc'}).ok,true);assert.equal(g.rows.length,3);
 assert.equal(g.call({...begin,text:'changed'}).error,'conflict');
});
test('formula-like names and messages are stored as text',()=>{const g=gas();g.call({...begin,name:'=HYPERLINK("evil")',text:'=IMPORTXML("evil")'});assert.equal(g.rows[1][2][0],"'");assert.equal(g.rows[1][4][0],"'");});
test('handwritten wish remains incomplete until ink AND card are confirmed',()=>{
 const g=gas(),b={...begin,mode:'draw',text:''};g.call(b);
 assert.equal(g.call(chunk(b,'ink',png)).saved,false);
 const result=g.call(chunk(b,'card',png));assert.equal(result.saved,true);assert.equal(g.rows[1][8],'บันทึกครบแล้ว');
 const files=[...g.files.values()].filter(f=>f.name.endsWith('.png'));assert.equal(files.length,2);for(const file of files){assert.ok(file.name.startsWith('สมชาย_'));assert.deepEqual(file.bytes,png);}
});
test('chunk order, lost acknowledgments and duplicate completion preserve bytes and prevent duplicate files',()=>{
 const g=gas();g.call(begin);const large=Buffer.concat([png,crypto.randomBytes(CHUNK_BYTES+200)]);
 const second=chunk(begin,'card',large,1);assert.equal(g.call(second).fileComplete,false);assert.equal(g.call(second).fileComplete,false);
 assert.equal(g.call(chunk(begin,'card',large,0)).saved,true);assert.equal(g.call(second).saved,true);
 const finals=[...g.files.values()].filter(f=>f.name.endsWith('.png'));assert.equal(finals.length,1);assert.deepEqual(finals[0].bytes,large);
});
test('file created before Sheet write failure is recovered once on retry',()=>{
 const g=gas();g.call(begin);g.failCommit();assert.equal(g.call(chunk(begin,'card',png)).ok,false);
 assert.equal(g.call(chunk(begin,'card',png)).saved,true);assert.equal([...g.files.values()].filter(f=>f.name.endsWith('.png')).length,1);
});
test('bad checksum never reports saved or creates a completed image',()=>{
 const g=gas();g.call(begin);const bad={...chunk(begin,'card',png),sha:'b'.repeat(64)};assert.equal(g.call(bad).error,'image_invalid');assert.equal(g.rows[1][7],'');
});
test('browser transport retries lost acknowledgment and preserves the submission ID',async()=>{
 let count=0;const ids=[];const window={};const context={window,crypto:crypto.webcrypto,TextEncoder,Uint8Array,Blob,AbortSignal,FileReader:class{readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:image/png;base64,'+Buffer.from(b).toString('base64');this.onload();});}},setTimeout:fn=>fn(),fetch:async(_url,opts)=>{const b=JSON.parse(opts.body);ids.push(b.id);if(++count===1)throw Error('lost connection');return{ok:true,status:200,json:async()=>({ok:true,id:b.id,fileComplete:true,saved:true})};}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/wishes-delivery.js'),'utf8'),context);
 await window.WeddingWishesDelivery.upload({id,fingerprint,token:sign(id,fingerprint,secret)},'card',new Blob([png],{type:'image/png'}),()=>{});
 assert.equal(count,2);assert.deepEqual(ids,[id,id]);
});

const {normalize}=require('../js/wish-source.js');
function enqueue(source={name:'สมชาย',text:'ยินดีด้วยครับ',mode:'type',format:'portrait'}){const s=normalize(source);return{action:'enqueue',id,fingerprint:hash(JSON.stringify(s)),source:s};}
test('queue never acknowledges before setup; successful retry keeps one durable source and row',()=>{
 const g=gas(),b=enqueue();assert.equal(g.call(b).error,'queue_not_ready');
 g.context.setupWishesQueue();g.context.setupWishesQueue();assert.equal(g.triggers.length,1);
 assert.equal(g.call(b).accepted,true);assert.equal(g.call(b).accepted,true);assert.equal(g.rows.length,2);
 assert.equal([...g.files.values()].filter(f=>f.name.endsWith('.json')).length,1);
 const q=JSON.parse(g.rows[1][11]).queue;assert.deepEqual(JSON.parse(g.files.get(q.source).bytes.toString()),b.source);
 assert.equal(g.rows[1][7],'');assert.equal(g.rows[1][8],'รับคำอวยพรแล้ว รอจัดทำภาพ');
});
test('fingerprint and vector bounds prevent altered payloads entering the queue',()=>{
 const b=enqueue();assert.ok(validRecord(b));assert.equal(validRecord({...b,source:{...b.source,text:'altered'}}),null);
 assert.throws(()=>normalize({name:'a',text:'',mode:'draw',format:'portrait',ratio:.5,strokes:[{width:5,points:[{x:2,y:0}]}]}));
 const g=gas();g.context.setupWishesQueue();g.call(b);assert.equal(g.call({...b,fingerprint:'b'.repeat(64)}).error,'conflict');
});
test('receipt is independent of image worker; handwriting is available after the guest disconnects',()=>{
 const g=gas(),b=enqueue({name:'ทดสอบลายมือ',text:'',mode:'draw',format:'portrait',ratio:.5,strokes:[{width:5,points:[{x:.1,y:.2},{x:.8,y:.6}]}]});
 g.context.setupWishesQueue();assert.equal(g.call(b).accepted,true);
 g.setFetch((_url,opts)=>{const job=JSON.parse(opts.payload);assert.deepEqual(job.source,b.source);g.call(chunk(b,'ink',png));g.call(chunk(b,'card',png));return{getResponseCode:()=>200,getContentText:()=>JSON.stringify({ok:true,id:b.id,saved:true})};});
 g.context.processWishesQueue();assert.equal(g.rows[1][8],'บันทึกครบแล้ว');assert.equal([...g.files.values()].filter(f=>f.name.endsWith('.png')).length,2);
 assert.equal(g.call(b).accepted,true);assert.equal(g.rows.length,2);
});
test('worker failures retain source, back off, stop after five tries, and owner can retry',()=>{
 const g=gas(),b=enqueue();g.context.setupWishesQueue();g.call(b);
 g.setFetch(()=>{throw Error('network failed');});
 for(let i=1;i<=5;i++){
  const u=JSON.parse(g.rows[1][11]);u.queue.next=0;g.rows[1][11]=JSON.stringify(u);g.context.processWishesQueue();
  assert.equal(JSON.parse(g.rows[1][11]).queue.attempts,i);assert.equal(g.rows[1][7],'');
 }
 assert.equal(g.rows[1][8],'ต้องตรวจสอบภาพ — ต้นฉบับยังอยู่');assert.ok(g.files.get(JSON.parse(g.rows[1][11]).queue.source));
 g.context.retryPendingWishes();assert.equal(JSON.parse(g.rows[1][11]).queue.attempts,0);
});
test('active lease cannot be claimed again and stale workers cannot finish another claim',()=>{
 const g=gas(),b=enqueue();g.context.setupWishesQueue();g.call(b);const cfg=g.context.wishConfig_();
 const a=g.context.wishClaim_(cfg);assert.ok(a);assert.equal(g.context.wishClaim_(cfg),null);
 const u=JSON.parse(g.rows[1][11]);u.queue.lease=0;g.rows[1][11]=JSON.stringify(u);const next=g.context.wishClaim_(cfg);assert.notEqual(next.claim,a.claim);
 g.context.wishCompleteAttempt_(cfg,a,'render_failed');assert.equal(JSON.parse(g.rows[1][11]).queue.claim,next.claim);assert.equal(g.rows[1][8],'กำลังจัดทำภาพ');
});
test('proxy fails closed when old Apps Script does not acknowledge durable acceptance',async()=>{
 const r=await api(enqueue());assert.equal(r.status,503);assert.equal(r.result.error,'queue_not_ready');
 const good=await api(enqueue(),{fetchImpl:async()=>({ok:true,json:async()=>({ok:true,id,accepted:true,saved:false,source:'private'})})});
 assert.equal(good.result.accepted,true);assert.equal(good.result.source,undefined);assert.equal(good.result.token,undefined);
});
