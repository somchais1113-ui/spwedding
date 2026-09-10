'use strict';
const {createHash}=require('node:crypto');
const attempts=new Map();
function validRecord(body){
  if(!body||typeof body!=='object'||Array.isArray(body))return null;
  const {submissionId,name,attendance,partySize,website}=body;
  if(typeof submissionId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(submissionId))return null;
  if(typeof name!=='string'||!name.trim()||name.length>80||/[\u0000-\u001f\u007f]/.test(name))return null;
  if(!['attending','declined'].includes(attendance)||!Number.isInteger(partySize))return null;
  if(attendance==='attending'?(partySize<1||partySize>999):partySize!==0)return null;
  if(website)return null;
  return {submissionId,name:name.trim(),attendance,partySize};
}
function configured(env){return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(env.RSVP_SCRIPT_URL||'')&&(env.RSVP_SHARED_SECRET||'').length>=32;}
async function handler(req,res,{env=process.env,fetchImpl=fetch}={}){
  const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  if(req.method!=='POST'){res.setHeader('Allow','POST');return send(405,{error:'method'});}
  try{
    // Browser submissions must originate from this deployment; no wildcard CORS.
    const origin=req.headers.origin;
    if(!origin||new URL(origin).host!==req.headers.host)return send(403,{error:'origin'});
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(415,{error:'content_type'});
    if(!configured(env))return send(503,{error:'not_configured'});
    if(Number(req.headers['content-length']||0)>4096)return send(413,{error:'too_large'});
    let body=req.body;
    if(body===undefined){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>4096)return send(413,{error:'too_large'});chunks.push(chunk);}body=Buffer.concat(chunks).toString('utf8');}
    if(Buffer.isBuffer(body))body=body.toString('utf8');
    if(typeof body==='string'){if(Buffer.byteLength(body)>4096)return send(413,{error:'too_large'});try{body=JSON.parse(body);}catch{return send(400,{error:'json'});}}
    if(Buffer.byteLength(JSON.stringify(body)||'')>4096)return send(413,{error:'too_large'});
    const record=validRecord(body);if(!record)return send(400,{error:'fields'});
    const ip=env.VERCEL ? String(req.headers['x-forwarded-for']||'unknown').split(',')[0] : req.socket?.remoteAddress||'local';
    const key=createHash('sha256').update(ip).digest('hex'),now=Date.now();
    for(const [id,v] of attempts)if(now-v.at>60000)attempts.delete(id);
    const limit=attempts.get(key)||{at:now,count:0};limit.count++;attempts.set(key,limit);
    if(limit.count>12)return send(429,{error:'rate_limit'});
    // Google ContentService redirects to the response host; fetch follows it.
    const response=await fetchImpl(env.RSVP_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...record,secret:env.RSVP_SHARED_SECRET}),redirect:'follow',signal:AbortSignal.timeout(20000)});
    if(!response.ok)return send(502,{error:'save_failed'});
    const result=await response.json();
    if(result.saved!==true||result.id!==record.submissionId)return send(502,{error:'save_failed'});
    return send(200,{saved:true,id:record.submissionId});
  }catch(error){return send(error.name==='TimeoutError'?504:502,{error:'save_failed'});}
}
module.exports={handler,validRecord,configured};
