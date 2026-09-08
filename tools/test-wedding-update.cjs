const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),web=fs.existsSync(path.join(root,'dist/index.html'))?path.join(root,'dist'):root;
const c={window:{}};vm.runInNewContext(fs.readFileSync(path.join(web,'js/config.js'),'utf8'),c);const C=c.window.WEDDING_CONFIG;
const H=require(path.join(web,'js/helpers.js')),E=require(path.join(web,'js/wish-export.js'));
test('Ceremonies run continuously from 09:09 to noon, calendar and countdown agree',()=>{
 assert.equal(C.date.startAt,'2026-10-25T09:09:00+07:00');assert.equal(C.date.endAt,'2026-10-25T12:00:00+07:00');
 let end=9*60+9;for(const row of C.schedule){const times=[...row.time.matchAll(/(\d{2}):(\d{2})/g)].map(m=>+m[1]*60+ +m[2]);assert.equal(times[0],end);assert.ok(times[1]>times[0]);end=times[1];}assert.equal(end,720);
 const start=H.validDate(C.date.startAt);assert.equal(H.countdownParts(start,new Date('2026-10-25T02:08:59Z')).seconds,1);assert.deepEqual(H.countdownParts(start,start),{days:0,hours:0,minutes:0,seconds:0});
 const ics=H.makeCalendar(C).replace(/\r\n /g,'');assert.ok(ics.includes('DTSTART:20261025T020900Z'));assert.ok(ics.includes('DTEND:20261025T050000Z'));assert.ok(ics.includes('ตำบลนางิ้ว อำเภอสังคม จังหวัดหนองคาย'));
});
test('Both export ratios match supplied templates and safe text regions stay within canvas',()=>{
 for(const [id,f] of Object.entries(E.formats)){assert.ok(fs.existsSync(path.join(web,f.template)));assert.equal(f.width/f.height,id==='portrait'?4/5:16/9);assert.ok(f.box.x>=0&&f.box.y>=0&&f.box.x+f.box.w<=1&&f.box.y+f.box.h<f.signatureY&&f.signatureY<.85);}
});
test('Thai word wrapping preserves content and explicit line breaks',()=>{
 const str='ขอให้มีความสุขมาก ๆ\nขอบคุณที่ให้เราเป็นส่วนหนึ่ง';const measure=s=>Array.from(s).length*10;const lines=E.wrapLines(str,measure,110);assert.ok(lines.every(s=>measure(s)<=110));assert.equal(lines.join('').replace(/\s/g,''),str.replace(/\s/g,''));
 assert.deepEqual(E.wrapLines('one\n\ntwo',measure,100),['one','','two']);
 const emoji='รักนะ👨‍👩‍👧';const result=E.wrapLines(emoji,s=>[...new Intl.Segmenter('th',{granularity:'grapheme'}).segment(s)].length*10,30);assert.equal(result.join(''),emoji);
});
test('Text fitting reduces size and refuses impossible layouts without dropping text',()=>{
 const ctx={font:'',measureText(t){return {width:Array.from(t).length*parseFloat(this.font.split(' ')[1])*.5};}};
 const text='ขอให้มีความสุขทุกวัน '.repeat(25),box={w:842,h:277};const f=E.fitText(ctx,text,box,40,17);assert.ok(f.size<=40);assert.ok(f.lines.length*f.lineHeight<=box.h);assert.equal(f.lines.join('').replace(/\s/g,''),text.replace(/\s/g,''));
 assert.throws(()=>E.fitText(ctx,'a\n'.repeat(1000),box,40,17),/text-too-long/);
});
test('Requested removals and independent export/send affordances are present',()=>{
 const html=fs.readFileSync(path.join(web,'index.html'),'utf8');for(const text of ['และอยากมีคุณอยู่ในความทรงจำนี้','และอยากให้คุณอยู่ในความทรงจำนี้','จะเป็นตัวพิมพ์ หรือลายมือของคุณ ก็มีความหมายกับเรา','07:00','เช้าวันหนึ่ง ที่เราอยากมีคุณอยู่ด้วย','copy-address','บ้านของเรา'])assert.ok(!html.includes(text));
 assert.equal(C.scheduleNote,'กำหนดพิธีการ รายละเอียดดังต่อไปนี้');assert.ok(html.includes('class="button share-invitation-cta"'));assert.ok(html.includes('id="export-wish"'));assert.ok(html.includes('id="save-wish"'));assert.ok(html.includes('welcome-mesh'));
});

test('300 DPI metadata is singular, before IDAT, and preserves compressed pixels',async()=>{
 const source=new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aYuoAAAAASUVORK5CYII=','base64')],{type:'image/png'});
 const chunkList=async blob=>{const b=Buffer.from(await blob.arrayBuffer()),chunks=[];for(let o=8;o<b.length;){const n=b.readUInt32BE(o),type=b.toString('ascii',o+4,o+8);chunks.push({type,data:b.subarray(o+8,o+8+n)});o+=n+12;}return chunks;};
 const first=await E.withDPI(source),second=await E.withDPI(first);assert.deepEqual(Buffer.from(await first.arrayBuffer()),Buffer.from(await second.arrayBuffer()));
 const chunks=await chunkList(second),phys=chunks.filter(c=>c.type==='pHYs');assert.equal(phys.length,1);assert.equal(phys[0].data.readUInt32BE(0),11811);assert.equal(phys[0].data.readUInt32BE(4),11811);assert.equal(phys[0].data[8],1);
 assert.ok(chunks.findIndex(c=>c.type==='pHYs')<chunks.findIndex(c=>c.type==='IDAT'));
 assert.deepEqual(chunks.find(c=>c.type==='IDAT').data,(await chunkList(source)).find(c=>c.type==='IDAT').data);
 await assert.rejects(E.withDPI(new Blob(['bad'])),/invalid-png/);
});
