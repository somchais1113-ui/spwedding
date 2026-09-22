'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {handler,renderImages,deliverImages}=require('../lib/wish-render.cjs');
const {normalize}=require('../js/wish-source.js');
const env={WISHES_SHARED_SECRET:'isolated-test-secret-'.repeat(3),WISHES_SCRIPT_URL:'https://script.google.com/macros/s/TEST/exec'};
const id='12345678-1234-4234-8234-123456789abc';
const source=normalize({name:'ผู้ทดสอบ',text:'ยินดีด้วยครับ ขอให้มีความสุขทุกวัน',mode:'type',format:'portrait'});
const fingerprint=crypto.createHash('sha256').update(JSON.stringify(source)).digest('hex');
async function call(body,authorization,deliver=async()=>{}){let status,result;await handler({method:'POST',headers:{authorization},body},{writeHead(s){status=s;},end(b){result=JSON.parse(b);}},{env,deliver});return{status,result};}
test('image renderer requires server secret, validates source, and responds only after delivery',async()=>{
 assert.equal((await call({id,source,fingerprint},'bad')).status,403);
 assert.equal((await call({id,source,fingerprint:'b'.repeat(64)},'Bearer '+env.WISHES_SHARED_SECRET)).status,400);
 let delivered=false;const r=await call({id,source,fingerprint},'Bearer '+env.WISHES_SHARED_SECRET,async()=>{delivered=true;});assert.ok(delivered);assert.equal(r.result.saved,true);assert.equal(r.result.source,undefined);
});
function inspectPNG(bytes,w,h){assert.equal(bytes.readUInt32BE(16),w);assert.equal(bytes.readUInt32BE(20),h);let at=8,dpi;while(at+12<=bytes.length){const n=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8);if(type==='pHYs')dpi=[bytes.readUInt32BE(at+8),bytes.readUInt32BE(at+12),bytes[at+16]];at+=n+12;}assert.deepEqual(dpi,[11811,11811,1]);}
test('server exports real typed and handwritten PNGs at original dimensions with 300 DPI',async()=>{
 const typed=await renderImages(source);assert.equal(typed.length,1);inspectPNG(typed[0].bytes,2400,3000);
 const draw=normalize({name:'ลายมือทดสอบ',text:'',mode:'draw',format:'landscape',ratio:.5,strokes:[{width:5,points:[{x:.1,y:.1},{x:.9,y:.8}]}]});
 const ink=await renderImages(draw);assert.equal(ink.length,2);inspectPNG(ink[0].bytes,2400,1200);inspectPNG(ink[1].bytes,3200,1800);
 for(const r of [...typed,...ink])assert.ok(r.bytes.length<12*1024*1024);
});
test('already completed jobs do not render or upload again',async()=>{
 let calls=0;await deliverImages({id,fingerprint,source},{env,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({ok:true,id,saved:true})};}});assert.equal(calls,1);
});
