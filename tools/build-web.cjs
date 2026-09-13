// Only browser assets are published. Server code, docs and credentials stay private.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.existsSync(path.join(root,'dist/index.html'))?path.join(root,'dist'):root;
const output=path.join(root,'public');
fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(output,{recursive:true});
for(const name of ['index.html','share.html','share','css','js','assets'])fs.cpSync(path.join(source,name),path.join(output,name),{recursive:true});
console.log('Public wedding files prepared.');
