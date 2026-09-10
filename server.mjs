/** Optional central guestbook. Node.js 20+; no packages required. */
import http from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url));
const defaultWeb=path.join(here,'dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.jpeg':'image/jpeg','.jpg':'image/jpeg','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.txt':'text/plain; charset=utf-8'};
export function createWeddingServer({webRoot=defaultWeb,dataDir=process.env.WISHES_DATA_DIR||path.join(here,'private-wishes')}={}) {
  const limits=new Map();
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','same-origin');
    const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    try {
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/api/guestbook-status'&&req.method==='GET')return json(200,{service:'sp-wedding-guestbook-v1'});
      if(url.pathname==='/api/wishes'&&req.method==='POST') {
        if(req.headers.origin && new URL(req.headers.origin).host!==req.headers.host)return json(403,{error:'origin'});
        if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return json(415,{error:'content_type'});
        const now=Date.now(),ip=req.socket.remoteAddress;
        for(const [key,value] of limits)if(now-value.at>60000)limits.delete(key);
        const limit=limits.get(ip)||{at:now,count:0};limit.count++;limits.set(ip,limit);
        if(limit.count>30)return json(429,{error:'rate_limit'});
        let bytes=0;const chunks=[];
        for await(const chunk of req){bytes+=chunk.length;if(bytes>2000000){json(413,{error:'too_large'});return;}chunks.push(chunk);}
        let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return json(400,{error:'json'});}
        if(!body||!['type','draw'].includes(body.mode)||typeof body.name!=='string'||body.name.length>80)return json(400,{error:'fields'});
        const record={id:randomUUID(),createdAt:new Date().toISOString(),name:body.name.trim(),mode:body.mode};
        if(body.mode==='type'){
          if(typeof body.text!=='string'||!body.text.trim()||body.text.length>1000)return json(400,{error:'text'});
          record.text=body.text.trim();
        }else{
          if(typeof body.image!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(body.image))return json(400,{error:'image'});
          const png=Buffer.from(body.image.split(',')[1],'base64');
          if(png.length<32||png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||png.toString('ascii',12,16)!=='IHDR'||png.readUInt32BE(16)!==1200||png.readUInt32BE(20)!==720)return json(400,{error:'png'});
          record.image=body.image;
        }
        await mkdir(dataDir,{recursive:true,mode:0o700});
        await writeFile(path.join(dataDir,record.id+'.json'),JSON.stringify(record,null,2),{flag:'wx',mode:0o600});
        return json(201,{saved:true,id:record.id});
      }
      if(!['GET','HEAD'].includes(req.method))return json(405,{error:'method'});
      const pathname=decodeURIComponent(url.pathname);
      // Only website files are exposed. Private wishes, server code, and docs are never served.
      const relative=pathname==='/'?'index.html':pathname.slice(1);
      if(relative!=='index.html'&&!/^(assets|css|js)\//.test(relative))return json(404,{error:'not_found'});
      const full=path.resolve(webRoot,relative);
      if(!full.startsWith(path.resolve(webRoot)+path.sep))return json(404,{error:'not_found'});
      const normalized=path.relative(path.resolve(webRoot),full);
      if(normalized!=='index.html'&&!/^(assets|css|js)\//.test(normalized))return json(404,{error:'not_found'});
      const file=await readFile(full);res.writeHead(200,{'Content-Type':types[path.extname(full)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:file);
    }catch(error){if(res.headersSent){res.end();return;}json(error.code==='ENOENT'?404:500,{error:error.code==='ENOENT'?'not_found':'server_error'});}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let webRoot=defaultWeb;try{await stat(path.join(webRoot,'index.html'));}catch{webRoot=here;}
  const port=Number(process.env.PORT||8080),host=process.env.HOST||'127.0.0.1';
  createWeddingServer({webRoot}).listen(port,host,()=>console.log(`Wedding website listening on ${host}:${port}`));
}
