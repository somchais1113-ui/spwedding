'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/landing-garden.js'),'utf8');
function setup(){
 const listeners=new Map(),frames=new Map(),observers=[],changes=[];let sequence=0;
 function classes(initial=[]){const values=new Set(initial);return{contains:k=>values.has(k),add:k=>values.add(k),toggle:(k,on)=>on?values.add(k):values.delete(k)};}
 function el(main){const props=new Map(),host={hidden:main};return{host,props,classList:classes(main?['main-garden']:[]),style:{setProperty:(k,v)=>props.set(k,v),removeProperty:k=>props.delete(k)},closest:()=>host,querySelectorAll:()=>[]};}
 const welcome=el(false),main=el(true),reduced={matches:false,addEventListener:(_,fn)=>{reduced.change=fn;}};
 const doc={hidden:false,documentElement:{classList:classes(['motion-enabled'])},querySelectorAll:()=>[welcome,main],addEventListener:(k,f)=>listeners.set(k,f)};
 const win={scrollY:0,addEventListener:(k,f)=>listeners.set(k,f)};
 const context={document:doc,window:win,matchMedia:()=>reduced,Promise,setTimeout:()=>0,clearTimeout:()=>{},requestAnimationFrame:fn=>{frames.set(++sequence,fn);return sequence;},cancelAnimationFrame:id=>frames.delete(id),MutationObserver:class{constructor(fn){changes.push(fn);}observe(){}},IntersectionObserver:class{constructor(fn){observers.push(fn);}observe(){}}};
 win.IntersectionObserver=context.IntersectionObserver;
 vm.runInNewContext(source,context);
 function visibility(){observers[0]([{target:welcome.host,isIntersecting:!welcome.host.hidden},{target:main.host,isIntersecting:!main.host.hidden}]);}
 function enter(){welcome.host.hidden=true;main.host.hidden=false;visibility();}
 function advance(){for(let i=0;i<250&&frames.size;i++){const batch=[...frames.values()];frames.clear();batch.forEach(f=>f((i+1)*16.67));}}
 visibility();return{welcome,main,doc,win,reduced,frames,listeners,enter,advance,changes};
}
test('Entering main page transfers motion; leaving cancels scroll rendering',()=>{
 const s=setup();assert(s.welcome.classList.contains('garden-visible'));assert(!s.main.classList.contains('garden-visible'));
 s.enter();assert(s.main.classList.contains('garden-visible'));assert(!s.welcome.classList.contains('garden-visible'));
 s.win.scrollY=1200;s.listeners.get('scroll')();assert(s.frames.size>0);s.main.host.hidden=true;s.changes.forEach(f=>f());assert.equal(s.frames.size,0);
});
test('Scroll drift stays bounded and settles without a perpetual animation loop',()=>{
 const s=setup();s.enter();for(const y of [100,900,6000,100000]){s.win.scrollY=y;s.listeners.get('scroll')();s.advance();assert.equal(s.frames.size,0);assert(Math.abs(parseFloat(s.main.props.get('--garden-scroll')))<=9);}
});
test('Hidden tabs and reduced-motion preference cancel rendering work',()=>{
 const s=setup();s.enter();s.win.scrollY=800;s.listeners.get('scroll')();s.doc.hidden=true;s.listeners.get('visibilitychange')();assert.equal(s.frames.size,0);assert(!s.main.classList.contains('garden-visible'));
 s.doc.hidden=false;s.listeners.get('visibilitychange')();s.advance();s.reduced.matches=true;s.reduced.change();assert.equal(s.frames.size,0);assert(!s.main.props.has('--garden-scroll'));assert(!s.main.classList.contains('garden-visible'));
});
