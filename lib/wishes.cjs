'use strict';
const {createHmac,timingSafeEqual,createHash}=require('node:crypto');
const CHUNK_BYTES=2*1024*1024,MAX_IMAGE_BYTES=12*1024*1024,MAX_BODY=3*1024*1024;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HASH=/^[a-f0-9]{64}$/;
const attempts=new Map();
const sign=(id,fingerprint,secret)=>createHmac('sha256',secret).update(id+'|'+fingerprint).digest('hex');
function validRecord(b){
 if(!b||!UUID.test(b.id||'')||!HASH.test(b.fingerprint||''))return null;
 if(b.action==='begin'){
  if(typeof b.name!=='string'||!b.name.trim()||b.name.length>80||/[\x00-\x1f\x7f]/.test(b.name))return null;
  if(!['type','draw'].includes(b.mode)||!['portrait','landscape'].includes(b.format)||typeof b.text!=='string'||b.text.length>1000||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(b.text))return null;
  if(b.website|| (b.mode==='type'?!b.text.trim():b.text!==''))return null;
  return {action:b.action,id:b.id,fingerprint:b.fingerprint,name:b.name.trim(),mode:b.mode,format:b.format,text:b.text};
 }
 if(!HASH.test(b.token||''))return null;
 const base={action:b.action,id:b.id,fingerprint:b.fingerprint};
 if(b.action==='status')return base;
 if(b.action!=='upload'||!['card','ink'].includes(b.kind)||!HASH.test(b.sha||''))return null;
 if(!Number.isInteger(b.size)||b.size<33||b.size>MAX_IMAGE_BYTES||b.total!==Math.ceil(b.size/CHUNK_BYTES)||!Number.isInteger(b.index)||b.index<0||b.index>=b.total)return null;
 if(typeof b.data!=='string'||b.data.length>Math.ceil(CHUNK_BYTES/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(b.data))return null;
 const bytes=Buffer.from(b.data,'base64');
 if(bytes.toString('base64')!==b.data||bytes.length!==Math.min(CHUNK_BYTES,b.size-b.index*CHUNK_BYTES))return null;
 if(b.index===0&&!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return null;
 return {...base,kind:b.kind,sha:b.sha,size:b.size,total:b.total,index:b.index,data:b.data};
}
function configured(env){return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(env.WISHES_SCRIPT_URL||'')&&(env.WISHES_SHARED_SECRET||'').length>=32;}
async function handler(req,res,{env=process.env,fetchImpl=fetch}={}){
 const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
 if(req.method!=='POST'){res.setHeader('Allow','POST');return send(405,{error:'method'});}
 try{
  if(!req.headers.origin||new URL(req.headers.origin).host!==req.headers.host)return send(403,{error:'origin'});
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(415,{error:'content_type'});
  if(!configured(env))return send(503,{error:'not_configured'});
  if(Number(req.headers['content-length']||0)>MAX_BODY)return send(413,{error:'too_large'});
  let body=req.body;
  if(body===undefined){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY)return send(413,{error:'too_large'});chunks.push(chunk);}body=Buffer.concat(chunks);}
  if(Buffer.isBuffer(body))body=body.toString('utf8');
  if(typeof body==='string'){if(Buffer.byteLength(body)>MAX_BODY)return send(413,{error:'too_large'});try{body=JSON.parse(body);}catch{return send(400,{error:'json'});}}
  if(Buffer.byteLength(JSON.stringify(body)||'')>MAX_BODY)return send(413,{error:'too_large'});
  const record=validRecord(body);if(!record)return send(400,{error:'fields'});
  const token=sign(record.id,record.fingerprint,env.WISHES_SHARED_SECRET);
  if(record.action!=='begin'&&!timingSafeEqual(Buffer.from(token,'hex'),Buffer.from(body.token,'hex')))return send(403,{error:'token'});
  const ip=String(env.VERCEL?req.headers['x-forwarded-for']||'unknown':req.socket?.remoteAddress||'local').split(',')[0];
  const key=createHash('sha256').update(ip).digest('hex'),now=Date.now();
  for(const [k,v] of attempts)if(now-v.at>60000)attempts.delete(k);
  const v=attempts.get(key)||{at:now,count:0};v.count++;attempts.set(key,v);
  if(v.count>120)return send(429,{error:'rate_limit'});
  const response=await fetchImpl(env.WISHES_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...record,secret:env.WISHES_SHARED_SECRET}),redirect:'follow',signal:AbortSignal.timeout(45000)});
  if(!response.ok)return send(502,{error:'save_failed'});
  const result=await response.json();
  if(result.ok!==true||result.id!==record.id){
   const code=['conflict','not_found','fields','limit','image_invalid'].includes(result.error)?result.error:'save_failed';
   return send(code==='conflict'?409:code==='limit'?429:502,{error:code});
  }
  // Never return Drive links, names, messages or Google credentials to anonymous callers.
  return send(200,{ok:true,id:record.id,saved:result.saved===true,card:result.card===true,ink:result.ink===true,fileComplete:result.fileComplete===true,...(record.action==='begin'?{token}: {})});
 }catch(error){return send(error.name==='TimeoutError'?504:502,{error:'save_failed'});}
}
module.exports={handler,validRecord,configured,sign,CHUNK_BYTES,MAX_IMAGE_BYTES};
