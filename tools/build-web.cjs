// Only browser assets are published. Server code, docs and credentials stay private.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
// Catch the deployment-blocking type mismatch before publishing browser assets.
const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
for(const [name,options] of Object.entries(config.functions||{})){
  for(const key of ['includeFiles','excludeFiles']){
    if(options[key]!==undefined&&typeof options[key]!=='string')throw new Error(`${name}.${key} must be one glob string (Vercel schema).`);
  }
}
const source=fs.existsSync(path.join(root,'dist/index.html'))?path.join(root,'dist'):root;
const output=path.join(root,'public');
fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(output,{recursive:true});
for(const name of ['index.html','share.html','share','css','js','assets'])fs.cpSync(path.join(source,name),path.join(output,name),{recursive:true});
require('esbuild').buildSync({entryPoints:[path.join(root,'src/analytics.js')],outfile:path.join(root,'js/analytics.js'),bundle:true,minify:true,platform:'browser',format:'iife'});
fs.copyFileSync(path.join(root,'js/analytics.js'),path.join(output,'js/analytics.js'));
console.log('Public wedding files prepared.');
