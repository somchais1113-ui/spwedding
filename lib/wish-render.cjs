'use strict';
const {createHash,timingSafeEqual}=require('node:crypto');
const path=require('node:path');
const {normalize,paint}=require('../js/wish-source.js');
const {CHUNK_BYTES,configured}=require('./wishes.cjs');
let renderer;
function getRenderer(){
 if(renderer)return renderer;
 const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
 const root=path.resolve(__dirname,'..');
 for(const [file,family] of [['NotoSansTC-VariableFont_wght.ttf','NotoSansTC'],['prompt-regular.ttf','Prompt']]){
  if(!GlobalFonts.registerFromPath(path.join(root,'assets/fonts',file),family))throw Error('font-unavailable');
 }
 const images=new Map(),cards=require('../js/wish-export.js');
 cards.configureServer({createCanvas,fonts:async()=>{},loadImage(src){if(!images.has(src))images.set(src,loadImage(path.join(root,src)).catch(e=>{images.delete(src);throw e;}));return images.get(src);},encode:async canvas=>new Blob([await canvas.encode('png')],{type:'image/png'})});
 renderer={cards,createCanvas};return renderer;
}
async function renderImages(source){
 const s=normalize(source),{cards,createCanvas}=getRenderer();let drawing;
 try{
  const output=[];
  if(s.mode==='draw'){
   drawing=createCanvas(2400,Math.round(2400*s.ratio));paint(drawing.getContext('2d'),s.strokes,drawing.width,drawing.height);
   output.push({kind:'ink',bytes:Buffer.from(await (await cards.withDPI(new Blob([await drawing.encode('png')],{type:'image/png'}),300)).arrayBuffer())});
  }
  const card=await cards.render({...s,drawing});
  output.push({kind:'card',bytes:Buffer.from(await card.blob.arrayBuffer())});return output;
 }finally{if(drawing)drawing.width=drawing.height=1;}
}
async function deliverImages(job,{env=process.env,fetchImpl=fetch}={}){
 const deadline=Date.now()+100000;
 async function google(body){
  if(Date.now()>deadline)throw Error('render_timeout');
  const response=await fetchImpl(env.WISHES_SCRIPT_URL,{method:'POST',redirect:'follow',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,id:job.id,fingerprint:job.fingerprint,secret:env.WISHES_SHARED_SECRET}),signal:AbortSignal.timeout(Math.min(35000,Math.max(1,deadline-Date.now())))});
  if(!response.ok)throw Error('storage_error');const r=await response.json();if(!r.ok||r.id!==job.id)throw Error('storage_error');return r;
 }
 const state=await google({action:'status'});if(state.saved)return;
 const images=await renderImages(job.source);
 for(const {kind,bytes} of images){
  if(state[kind])continue;
  if(bytes.length>12*1024*1024)throw Error('image_size');
  const sha=createHash('sha256').update(bytes).digest('hex'),total=Math.ceil(bytes.length/CHUNK_BYTES);
  for(let index=0;index<total;index++){
   const r=await google({action:'upload',kind,sha,size:bytes.length,total,index,data:bytes.subarray(index*CHUNK_BYTES,(index+1)*CHUNK_BYTES).toString('base64')});
   if(r.fileComplete)break;
  }
 }
 if(!(await google({action:'status'})).saved)throw Error('incomplete');
}
async function handler(req,res,{env=process.env,deliver=deliverImages}={}){
 const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 if(req.method!=='POST')return send(405,{error:'method'});
 if(!configured(env))return send(503,{error:'not_configured'});
 const expected=Buffer.from('Bearer '+env.WISHES_SHARED_SECRET),received=Buffer.from(String(req.headers.authorization||''));
 if(received.length!==expected.length||!timingSafeEqual(received,expected))return send(403,{error:'unauthorized'});
 try{
  let body=req.body;
  if(body===undefined){let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>3*1024*1024)return send(413,{error:'too_large'});chunks.push(c);}body=Buffer.concat(chunks);}
  if(Buffer.isBuffer(body))body=body.toString('utf8');
  if(typeof body==='string'){if(Buffer.byteLength(body)>3*1024*1024)return send(413,{error:'too_large'});body=JSON.parse(body);}
  if(Buffer.byteLength(JSON.stringify(body)||'')>3*1024*1024)return send(413,{error:'too_large'});
  if(body?.action==='health'){getRenderer();return send(200,{ok:true,version:21,renderer:true});}
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(body?.id||''))return send(400,{error:'fields'});
  const source=normalize(body.source);
  if(createHash('sha256').update(JSON.stringify(source)).digest('hex')!==body.fingerprint)return send(400,{error:'fingerprint'});
  await deliver({...body,source},{env});return send(200,{ok:true,id:body.id,saved:true});
 }catch(error){
  const code=['fields','drawing_size','text-too-long','font-unavailable','image_size'].includes(error.message)?error.message:'render_failed';
  console.error(JSON.stringify({service:'wish-render',code}));return send(code==='fields'?400:500,{error:code});
 }
}
module.exports={handler,renderImages,deliverImages};
