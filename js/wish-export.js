/* Card rendering is independent of sending wishes. Original supplied templates stay unchanged. */
(function(root){
  'use strict';
  const formats={
    portrait:{width:2400,height:3000,layoutWidth:1080,layoutHeight:1350,template:'assets/templates/wish-portrait.png',box:{x:.12,y:.25,w:.72,h:.16},signatureY:.46},
    landscape:{width:3200,height:1800,layoutWidth:1920,layoutHeight:1080,template:'assets/templates/wish-landscape.png',box:{x:.12,y:.35,w:.39,h:.32},signatureY:.77}
  };
  const segmenters=new Map();
  const segment=(text,granularity)=>{
    if(typeof Intl.Segmenter!=='function')return Array.from(text);
    if(!segmenters.has(granularity))segmenters.set(granularity,new Intl.Segmenter('th',{granularity}));
    return [...segmenters.get(granularity).segment(text)].map(s=>s.segment);
  };
  const paragraphs=text=>text.replace(/\r\n?/g,'\n').split('\n').map(p=>segment(p,'word'));
  function wrapLines(text,measure,maxWidth){
    return wrapParagraphs(paragraphs(text),measure,maxWidth);
  }
  function wrapParagraphs(tokens,measure,maxWidth){
    const lines=[];
    for(const words of tokens){
      let line='';
      for(const word of words){
        if(measure(line+word)<=maxWidth){line+=word;continue;}
        if(line.trim()){lines.push(line.trimEnd());line='';}
        const trimmed=word.trimStart();
        if(measure(trimmed)<=maxWidth){line=trimmed;continue;}
        for(const char of segment(trimmed,'grapheme')){if(line&&measure(line+char)>maxWidth){lines.push(line);line='';}line+=char;}
      }
      lines.push(line.trimEnd());
    }
    return lines;
  }
  function fitText(context,text,box,maxSize=42,minSize=17){
    const tokens=paragraphs(text);
    for(let size=maxSize;size>=minSize;size--){
      context.font=`400 ${size}px "NotoSansTC", Prompt, Tahoma, sans-serif`;
      const widths=new Map();
      const measure=t=>{if(!widths.has(t))widths.set(t,context.measureText(t).width);return widths.get(t);};
      const lines=wrapParagraphs(tokens,measure,box.w),lineHeight=size*1.65;
      if(lines.length*lineHeight<=box.h)return {size,lines,lineHeight};
    }
    throw new Error('text-too-long');
  }
  const cache=new Map();
  function loadImage(src){
    if(!cache.has(src))cache.set(src,new Promise((resolve,reject)=>{const image=new Image(),timer=setTimeout(()=>reject(new Error('template-unavailable')),20000);image.onload=()=>{clearTimeout(timer);resolve(image);};image.onerror=()=>{clearTimeout(timer);reject(new Error('template-unavailable'));};image.src=src;}).catch(error=>{cache.delete(src);throw error;}));
    return cache.get(src);
  }
  let fontReady=null,lastResult=null;
  function prepare(format='portrait'){
    const spec=formats[format]||formats.portrait;
    if(!fontReady)fontReady=Promise.all([document.fonts.load('400 40px "NotoSansTC"'),document.fonts.load('400 32px Prompt')]).then(faces=>{
      if(!faces[0].length||!faces[1].length)throw new Error('font-unavailable');
    }).catch(error=>{fontReady=null;throw error;});
    return Promise.all([loadImage(spec.template),fontReady]).then(([template])=>template);
  }
  // PNG pHYs uses integer pixels per metre: 300 / 0.0254 = 11811.
  // Preserve every image-data chunk; replace only density metadata, with valid CRC.
  function crc32(bytes){
    let crc=0xffffffff;
    for(const byte of bytes){crc^=byte;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    return (crc^0xffffffff)>>>0;
  }
  async function withDPI(blob,dpi=300){
    if(!Number.isFinite(dpi)||dpi<=0||dpi>1200)throw new Error('invalid-dpi');
    const bytes=new Uint8Array(await blob.arrayBuffer());
    if(bytes.length<33||![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))throw new Error('invalid-png');
    const chunk=new Uint8Array(21),v=new DataView(chunk.buffer),ppm=Math.round(dpi/.0254);
    v.setUint32(0,9);chunk.set([112,72,89,115],4);v.setUint32(8,ppm);v.setUint32(12,ppm);chunk[16]=1;v.setUint32(17,crc32(chunk.subarray(4,17)));
    const parts=[bytes.subarray(0,8)],view=new DataView(bytes.buffer);let offset=8,inserted=false,ended=false;
    while(offset+12<=bytes.length){
      const length=view.getUint32(offset),end=offset+length+12;
      if(end>bytes.length)throw new Error('invalid-png');
      const type=String.fromCharCode(...bytes.subarray(offset+4,offset+8));
      if(type!=='pHYs')parts.push(bytes.subarray(offset,end));
      if(type==='IHDR'&&!inserted){parts.push(chunk);inserted=true;}
      offset=end;if(type==='IEND'){ended=true;break;}
    }
    if(!inserted||!ended)throw new Error('invalid-png');
    return new Blob(parts,{type:'image/png'});
  }
  async function render({format='portrait',mode='type',text='',name='',drawing}){
    const spec=formats[format]||formats.portrait;
    const key=mode==='type'?JSON.stringify([format,text,name]):null;
    if(key&&lastResult?.key===key)return lastResult.result;
    const template=await prepare(format);
    const canvas=document.createElement('canvas');canvas.width=spec.width;canvas.height=spec.height;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('canvas-unavailable');
    try{
      // Logical layout coordinates retain the composition; text is rasterized at export resolution.
      ctx.scale(spec.width/spec.layoutWidth,spec.height/spec.layoutHeight);
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.drawImage(template,0,0,spec.layoutWidth,spec.layoutHeight);
      const box={x:spec.box.x*spec.layoutWidth,y:spec.box.y*spec.layoutHeight,w:spec.box.w*spec.layoutWidth,h:spec.box.h*spec.layoutHeight};
      ctx.fillStyle='#163e72';ctx.textAlign='left';ctx.textBaseline='top';
      let contentBottom=box.y;
      if(mode==='draw'&&drawing){
        const scale=Math.min(box.w/drawing.width,box.h/drawing.height),w=drawing.width*scale,h=drawing.height*scale;
        ctx.drawImage(drawing,box.x,box.y,w,h);contentBottom=box.y+h;
      }else{
        const fitted=fitText(ctx,text.trim(),box,format==='landscape'?44:40,18);
        fitted.lines.forEach((line,i)=>ctx.fillText(line,box.x,box.y+i*fitted.lineHeight));
        contentBottom=box.y+fitted.lines.length*fitted.lineHeight;
      }
      if(name.trim()){
        const signatureY=Math.max(box.y+110,contentBottom+24),signatureWidth=Math.min(box.w,spec.layoutWidth*.36);
        // The narrow left signature column stays clear of the bouquet and the arch.
        const signatureBottom=spec.layoutHeight*(format==='landscape'?.83:.55);
        const nameBox={w:signatureWidth,h:signatureBottom-signatureY-34};
        const signature=fitText(ctx,name.trim(),nameBox,30,18);
        ctx.beginPath();ctx.strokeStyle='#c3d1e2';ctx.lineWidth=1;ctx.moveTo(box.x,signatureY-12);ctx.lineTo(box.x+46,signatureY-12);ctx.stroke();
        ctx.font='400 24px "NotoSansTC", Prompt, sans-serif';ctx.fillStyle='#5b6e87';ctx.fillText('ด้วยความยินดี',box.x,signatureY);
        ctx.font=`400 ${signature.size}px "NotoSansTC", Prompt, sans-serif`;ctx.fillStyle='#163e72';
        signature.lines.forEach((line,i)=>ctx.fillText(line,box.x,signatureY+34+i*signature.lineHeight));
      }
      const raw=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('export-failed')),'image/png'));
      const result={blob:await withDPI(raw,300),width:spec.width,height:spec.height,dpi:300};
      // Keep at most one completed typed card; never reuse a changed drawing.
      lastResult=key?{key,result}:null;
      return result;
    }finally{canvas.width=canvas.height=1;}
  }
  const api={formats,wrapLines,fitText,withDPI,prepare,render};if(typeof module==='object'&&module.exports)module.exports=api;else root.WeddingWishExport=api;
})(typeof window==='undefined'?globalThis:window);
