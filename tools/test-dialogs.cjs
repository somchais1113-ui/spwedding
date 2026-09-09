const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),web=fs.existsSync(path.join(root,'dist/index.html'))?path.join(root,'dist'):root;
function setup({stable=true}={}){
 class Style{constructor(){this.v=new Map()}setProperty(k,v,p=''){this.v.set(k,[v,p])}getPropertyValue(k){return this.v.get(k)?.[0]||''}getPropertyPriority(k){return this.v.get(k)?.[1]||''}removeProperty(k){this.v.delete(k)}}
 const html={style:new Style(),clientWidth:1000},body={style:new Style()};
 html.style.setProperty('scroll-behavior','smooth');body.style.setProperty('padding-right','7px','important');body.style.setProperty('color','navy');
 const before=()=>JSON.stringify([[...html.style.v],[...body.style.v]].map(entries=>entries.sort(([a],[b])=>a.localeCompare(b))));const initial=before();
 const events=[],CSS={supports:()=>stable};const window={CSS,innerWidth:1016,scrollX:0,scrollY:870,scrollTo(point){events.push(point);this.scrollX=point.left;this.scrollY=point.top}};
 vm.runInNewContext(fs.readFileSync(path.join(web,'js/dialogs.js'),'utf8'),{window,CSS,document:{documentElement:html,body},getComputedStyle:()=>({paddingRight:'7px'})});
 class Dialog{constructor(){this.open=false;this.listeners=[];this.count=0}addEventListener(name,fn){if(name==='close')this.listeners.push(fn)}showModal(){if(this.fail)throw Error('failed');this.open=true;this.count++}close(){this.open=false}flush(){this.listeners.forEach(fn=>fn())}contains(){return false}}
 const trigger={isConnected:true,focus(opts){assert.equal(opts.preventScroll,true);this.focused=true}};
 return {window,html,body,initial,before,events,Dialog,trigger,open:window.WeddingDialogs.open};
}
test('Closing modal restores scroll, inline styles/priorities, focus and original page width',()=>{
 const s=setup(),d=new s.Dialog();s.open(d,s.trigger,s.trigger);
 assert.equal(s.body.style.getPropertyValue('top'),'-870px');assert.equal(s.body.style.getPropertyValue('position'),'fixed');
 s.window.scrollY=0;d.close();d.flush();assert.equal(s.before(),s.initial);assert.equal(s.window.scrollY,870);assert.equal(s.events[0].behavior,'instant');assert.equal(s.trigger.focused,true);
});
test('Rapid repeated open/close and queued close events never strand the page lock',()=>{
 const s=setup(),d=new s.Dialog();
 for(let i=0;i<20;i++){s.open(d,s.trigger);d.close();s.open(d,s.trigger);d.flush();assert.equal(s.body.style.getPropertyValue('position'),'fixed');d.close();d.flush();assert.equal(s.before(),s.initial)}
 assert.equal(d.listeners.length,1);
});
test('Double open is ignored; overlapping dialogs retain lock until the last closes',()=>{
 const s=setup(),a=new s.Dialog(),b=new s.Dialog();s.open(a,s.trigger);s.open(a,s.trigger);assert.equal(a.count,1);s.open(b,s.trigger);a.close();a.flush();assert.equal(s.body.style.getPropertyValue('position'),'fixed');b.close();b.flush();assert.equal(s.before(),s.initial);
});
test('Failed showModal cleans up page state and older engines receive scrollbar compensation',()=>{
 const s=setup({stable:false}),a=new s.Dialog();s.open(a,s.trigger);assert.equal(s.body.style.getPropertyValue('padding-right'),'23px');a.close();a.flush();assert.equal(s.before(),s.initial);
 const b=new s.Dialog();b.fail=true;assert.throws(()=>s.open(b,s.trigger),/failed/);assert.equal(s.before(),s.initial);
});
test('All modal entrypoints use shared lifecycle and QR file is packaged untransformed',()=>{
 for(const file of ['app.js','celebration.js','travel/travel.js','qr-share.js']){const source=fs.readFileSync(path.join(web,'js',file),'utf8');assert.ok(source.includes('WeddingDialogs.open'));assert.ok(!source.includes('.showModal()'))}
 const bytes=fs.readFileSync(path.join(web,'assets/images/qr-code.png'));assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(bytes.readUInt32BE(16),1152);assert.equal(bytes.readUInt32BE(20),2048);
 const html=fs.readFileSync(path.join(web,'index.html'),'utf8');assert.ok(html.includes('download="Qr Code.png"'));assert.ok(html.includes('id="open-qr" role="button" tabindex="0"'));assert.ok(html.includes('welcome-mesh'));
});
