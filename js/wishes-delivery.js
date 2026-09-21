/* Lossless PNG delivery. Every request stays below 3 MiB, including base64. */
(function(root){
 'use strict';
 const CHUNK=2*1024*1024,MAX=12*1024*1024;
 const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 const hash=async value=>hex(await crypto.subtle.digest('SHA-256',typeof value==='string'?new TextEncoder().encode(value):value));
 const base64=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(new Error('read_failed'));reader.readAsDataURL(blob);});
 async function post(payload){
  for(let attempt=0;attempt<2;attempt++){
   try{
    const response=await fetch('/api/wishes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(50000)});
    let result;try{result=await response.json();}catch(_){result={error:response.status===404?'not_configured':'save_failed'};}
    if(!response.ok||result.ok!==true){const error=new Error(result.error||'save_failed');error.retryable=response.status>=500&&result.error!=='not_configured';throw error;}
    return result;
   }catch(error){if(attempt===1||error.retryable===false||['not_configured','fields','token','conflict','limit','too_large','rate_limit'].includes(error.message))throw error;await new Promise(r=>setTimeout(r,1200));}
  }
 }
 async function upload(session,kind,blob,onProgress){
  if(!(blob instanceof Blob)||blob.type!=='image/png'||blob.size>MAX||blob.size<33)throw new Error('image_size');
  const sha=await hash(await blob.arrayBuffer()),total=Math.ceil(blob.size/CHUNK);
  for(let index=0;index<total;index++){
   onProgress(kind,index,total);
   const result=await post({...session,action:'upload',kind,sha,size:blob.size,total,index,data:await base64(blob.slice(index*CHUNK,(index+1)*CHUNK))});
   if(result.fileComplete)return result;
  }
  throw new Error('incomplete');
 }
 root.WeddingWishesDelivery={hash,post,upload};
})(window);
