/** Node preview/server using the same Google Wishes API as Vercel. Node.js 20+. */
import http from 'node:http';
import rsvp from './lib/rsvp.cjs';
import wishes from './lib/wishes.cjs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const defaultWeb=path.join(here,'dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.jpeg':'image/jpeg','.jpg':'image/jpeg','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.txt':'text/plain; charset=utf-8'};
export function createWeddingServer({webRoot=defaultWeb,dataDir=process.env.WISHES_DATA_DIR||path.join(here,'private-wishes')}={}) {
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','same-origin');
    const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    try {
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/api/rsvp')return await rsvp.handler(req,res);
      if(url.pathname==='/api/guestbook-status'&&req.method==='GET')return json(200,{service:'ps-wedding-wishes-v20'});
      if(url.pathname==='/api/wishes')return await wishes.handler(req,res);
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
