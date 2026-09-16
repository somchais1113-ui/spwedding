'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../js/invitation-card.js'),'utf8');
function setup(options={}){
 class Element{
  constructor(){this.dataset={};this.attrs={};this.events={};this.style={setProperty(){}};this.children=[];this.open=false;this.hidden=false;this.disabled=false;this.offsetWidth=300;}
  setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}
  addEventListener(k,fn){(this.events[k]??=[]).push(fn);}emit(k,value={}){for(const fn of this.events[k]||[])fn(value);}
  append(...nodes){this.children.push(...nodes);}set src(v){this.attrs.src=v;}
 }
 const ids=['invite-dialog','invitation-art-stage','invite-front-image','invite-back-image','invite-show-front','invite-sound','invitation-readable','invite-status','close-dialog','invitation-dress-colors'];
 const els=Object.fromEntries(ids.map(k=>[k,new Element()])),cover=new Element(),pending=[];
 els['invitation-art-stage'].querySelector=()=>cover;
 for(const id of ['invite-front-image','invite-back-image']){const el=els[id];el.dataset.cardSrc=id+'.webp';el.parentElement=new Element();el.decode=()=>options.fail?Promise.reject(new Error('image')):options.pending?new Promise(resolve=>pending.push(resolve)):Promise.resolve();}
 const doc=new Element();doc.getElementById=id=>els[id];doc.createElement=()=>new Element();doc.documentElement={classList:{contains:()=>false}};
 const media={matches:!!options.reduced,addEventListener:(_,fn)=>{media.change=fn;}};
 const timers=new Map();let clock=0,seq=0,audioCount=0;const sounds=[],opens=[];
 function node(){return{connect(){},disconnect(){this.disconnected=true;}};}
 class Audio{
  constructor(){audioCount++;this.state='running';this.sampleRate=8000;this.currentTime=0;this.destination={};}
  createBuffer(_,n){return{getChannelData:()=>new Float32Array(n)};}
  createBufferSource(){const source={...node(),start(){this.started=true;},stop(at){if(at===undefined)this.stopped=true;}};sounds.push(source);return source;}
  createBiquadFilter(){return{...node(),frequency:{value:0}};}
  createGain(){return{...node(),gain:{setValueAtTime(){},linearRampToValueAtTime(){}}};}
 }
 const win={WEDDING_CONFIG:{invitationCard:{durationMs:2400},dressCode:{colors:[]}},WeddingDialogs:{open(dialog,trigger){dialog.open=true;opens.push(trigger);}}};
 if(!options.noAudio)win.AudioContext=Audio;
 const saved=new Map(options.muted?[['wedding-invitation-sound','off']]:[]);
 vm.runInNewContext(script,{window:win,document:doc,matchMedia:()=>media,localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)},setTimeout:(fn,delay)=>{const id=++seq;timers.set(id,{fn,at:clock+delay});return id;},clearTimeout:id=>timers.delete(id),Promise,Math,Number,String,Error});
 const advance=ms=>{const end=clock+ms;for(;;){const entry=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;clock=entry[1].at;timers.delete(entry[0]);entry[1].fn();}clock=end;};
 const close=()=>{els['invite-dialog'].open=false;els['invite-dialog'].emit('close');};
 return{...els,cover,doc,media,timers,pending,sounds,opens,advance,close,open:win.WeddingInvitation.open,getAudioCount:()=>audioCount};
}
test('Either entrypoint opens the same card; duplicate click does not restart it',async()=>{
 const s=setup(),landing={id:'landing'},main={id:'main'};await s.open(landing);await s.open(landing);assert.equal(s.opens.length,1);assert.equal(s['invite-dialog'].dataset.inviteState,'opening');s.advance(2500);assert.equal(s['invite-dialog'].dataset.inviteState,'ready');assert.equal(s['invite-show-front'].disabled,false);s.close();await s.open(main);assert.deepEqual(s.opens,[landing,main]);
});
test('Closing mid-turn stops sound and pending transitions',async()=>{
 const s=setup();await s.open({});s.advance(300);assert.equal(s.sounds.length,1);assert(s.sounds[0].started);s.close();assert(s.sounds[0].stopped);assert.equal(s.timers.size,0);s.advance(10000);assert.equal(s['invite-dialog'].dataset.inviteState,'closed');
});
test('A late image load cannot reopen a closed card or play audio',async()=>{
 const s=setup({pending:true}),opening=s.open({});s.close();s.pending.forEach(fn=>fn());await opening;assert.equal(s['invite-dialog'].dataset.inviteState,'closed');assert.equal(s.sounds.length,0);assert.equal(s.timers.size,0);
});
test('Reduced motion shows readable card immediately and still allows front/back selection',async()=>{
 const s=setup({reduced:true});await s.open({});assert.equal(s['invite-dialog'].dataset.inviteState,'ready');assert.equal(s.sounds.length,0);s['invite-show-front'].emit('click');assert.equal(s['invite-dialog'].dataset.inviteState,'front');s['invite-show-front'].emit('click');assert.equal(s['invite-dialog'].dataset.inviteState,'ready');
});
test('Mute is respected; audio unavailable never blocks the invitation',async()=>{
 const s=setup({muted:true});await s.open({});s.advance(2500);assert.equal(s.getAudioCount(),0);assert.equal(s.sounds.length,0);assert.equal(s['invite-dialog'].dataset.inviteState,'ready');
 const other=setup({noAudio:true});await other.open({});other.advance(2500);assert.equal(other['invite-dialog'].dataset.inviteState,'ready');
});
test('Image failure and an eight-second stalled load both expose text fallback',async()=>{
 const failed=setup({fail:true});await failed.open({});assert(failed['invitation-readable'].open);assert(failed['invitation-art-stage'].hidden);
 const stalled=setup({pending:true}),opening=stalled.open({});stalled.advance(8000);await opening;assert(stalled['invitation-readable'].open);assert.equal(stalled['invite-dialog'].dataset.inviteState,'error');assert.equal(stalled.sounds.length,0);
});
test('Backgrounding or changing Reduce Motion finishes the card and stops sound',async()=>{
 const s=setup();await s.open({});s.advance(300);s.doc.hidden=true;s.doc.emit('visibilitychange');assert.equal(s['invite-dialog'].dataset.inviteState,'ready');assert(s.sounds[0].stopped);assert.equal(s.timers.size,0);
 const second=setup();await second.open({});second.media.matches=true;second.media.change();assert.equal(second['invite-dialog'].dataset.inviteState,'ready');assert.equal(second.timers.size,0);
});
