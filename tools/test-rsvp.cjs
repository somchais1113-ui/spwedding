const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {handler,validRecord}=require('../lib/rsvp.cjs');
const id='0bd421db-b6d8-4ec5-8f04-940d50af97c4';
const record={submissionId:id,name:'คุณทดสอบ',attendance:'attending',partySize:2};
const env={RSVP_SCRIPT_URL:'https://script.google.com/macros/s/example/exec',RSVP_SHARED_SECRET:'a'.repeat(40)};
const request=body=>({method:'POST',headers:{host:'wedding.test',origin:'https://wedding.test','content-type':'application/json'},body,socket:{remoteAddress:'local'}});
function response(){return{headers:{},setHeader(k,v){this.headers[k]=v;},writeHead(code,h){this.code=code;Object.assign(this.headers,h);},end(value){this.data=JSON.parse(value);}};}
test('RSVP accepts exact totals and decline=0, rejects malformed input',()=>{
  assert.equal(validRecord({...record,partySize:8}).partySize,8);
  assert.equal(validRecord({...record,attendance:'declined',partySize:0}).partySize,0);
  for(const change of [{name:' '},{name:'a'.repeat(81)},{partySize:'6+'},{partySize:1.5},{partySize:0},{partySize:1000},{attendance:'declined'},{submissionId:'bad'},{website:'spam'}])assert.equal(validRecord({...record,...change}),null);
});
test('RSVP only reports success after matching Google acknowledgement',async()=>{
  for(const reply of [{saved:true,id},{saved:false},{saved:true,id:'other'}]){
    const res=response();await handler(request(record),res,{env,fetchImpl:async(url,options)=>{
      assert.equal(url,env.RSVP_SCRIPT_URL);assert.equal(JSON.parse(options.body).secret,env.RSVP_SHARED_SECRET);return{ok:true,json:async()=>reply};
    }});assert.equal(res.code,reply.id===id?200:502);assert.equal(res.data.saved,reply.id===id?true:undefined);
  }
});
test('RSVP blocks unconfigured, foreign origin, invalid methods, oversized and broken upstream',async()=>{
  const cases=[{req:request(record),env:{},code:503},{req:{...request(record),method:'GET'},code:405},{req:{...request(record),headers:{...request(record).headers,origin:'https://evil.test'}},code:403},{req:request('x'.repeat(5000)),code:413},{req:request('{broken'),code:400},{req:request(record),code:502}];
  for(const c of cases){const res=response();await handler(c.req,res,{env:c.env||env,fetchImpl:async()=>{throw new Error('offline');}});assert.equal(res.code,c.code);assert.notEqual(res.data.saved,true);}
});
function gasFixture(){
  const rows=[],secret=env.RSVP_SHARED_SECRET;let locked=false,fail=false;
  const range=(row,col,n=1,width=1)=>({getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:width},(_,j)=>rows[row-1+i]?.[col-1+j]??'')),getValue:()=>rows[row-1]?.[col-1],setValues(values){if(fail)throw Error('write failed');values.forEach((r,i)=>{rows[row-1+i]??=[];r.forEach((v,j)=>rows[row-1+i][col-1+j]=v);});return this;},setBackground(){return this;},setFontColor(){return this;},setFontWeight(){return this;},setNumberFormat(){return this;},createTextFinder(value){return{matchEntireCell(){return this;},findNext(){const index=rows.findIndex((r,i)=>i>=row-1&&r[col-1]===value);return index<0?null:{getRow:()=>index+1};}};}});
  const sheet={getLastRow:()=>rows.length,getRange:range,setFrozenRows(){},setColumnWidth(){},setColumnWidths(){}};
  const context={SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet,insertSheet:()=>sheet}),flush(){}},PropertiesService:{getScriptProperties:()=>({getProperty:()=>secret})},LockService:{getScriptLock:()=>({tryLock(){if(locked)return false;locked=true;return true;},hasLock:()=>locked,releaseLock(){locked=false;}})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})}};
  vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../integrations/google-sheets/Code.gs'),'utf8'),context);
  return{rows,send:body=>context.doPost({postData:{contents:JSON.stringify({...body,secret})}}),fail:()=>fail=true};
}
test('Google writer deduplicates retries and updates the same response, including decline',()=>{
  const gas=gasFixture();assert.equal(gas.send(record).saved,true);assert.equal(gas.send(record).saved,true);assert.equal(gas.rows.length,2);
  assert.equal(gas.send({...record,partySize:8,name:'=1+1'}).saved,true);assert.equal(gas.rows[1][3],"'=1+1");assert.equal(gas.rows[1][5],8);
  gas.send({...record,attendance:'declined',partySize:0});assert.equal(gas.rows.length,2);assert.equal(gas.rows[1][4],'ไม่สะดวกมาร่วมงาน');assert.equal(gas.rows[1][5],0);
});
test('Google writer preserves unexpected existing sheet and does not acknowledge write failures',()=>{
  const gas=gasFixture();gas.rows.push(['existing user data']);assert.equal(gas.send(record).saved,false);assert.deepEqual(gas.rows,[['existing user data']]);
  const broken=gasFixture();broken.fail();assert.equal(broken.send(record).saved,false);
});
