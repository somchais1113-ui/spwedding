/* Card rendering is independent of sending wishes. Original supplied templates stay unchanged. */
(function(root){
  'use strict';
  const formats={
    portrait:{width:1080,height:1350,template:'assets/templates/wish-portrait.png',box:{x:.11,y:.235,w:.78,h:.205},signatureY:.463},
    landscape:{width:1920,height:1080,template:'assets/templates/wish-landscape.png',box:{x:.11,y:.35,w:.41,h:.36},signatureY:.77}
  };
  const segment=(text,granularity)=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('th',{granularity}).segment(text)].map(s=>s.segment):Array.from(text);
  function wrapLines(text,measure,maxWidth){
    const lines=[];
    for(const paragraph of text.replace(/\r\n?/g,'\n').split('\n')){
      let line='';
      for(const word of segment(paragraph,'word')){
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
    for(let size=maxSize;size>=minSize;size--){
      context.font=`400 ${size}px Prompt, Tahoma, sans-serif`;
      const lines=wrapLines(text,t=>context.measureText(t).width,box.w),lineHeight=size*1.65;
      if(lines.length*lineHeight<=box.h)return {size,lines,lineHeight};
    }
    throw new Error('text-too-long');
  }
  const cache=new Map();
  function loadImage(src){
    if(!cache.has(src))cache.set(src,new Promise((resolve,reject)=>{const image=new Image(),timer=setTimeout(()=>reject(new Error('template-unavailable')),20000);image.onload=()=>{clearTimeout(timer);resolve(image);};image.onerror=()=>{clearTimeout(timer);reject(new Error('template-unavailable'));};image.src=src;}).catch(error=>{cache.delete(src);throw error;}));
    return cache.get(src);
  }
  async function render({format='portrait',mode='type',text='',name='',drawing}){
    const spec=formats[format]||formats.portrait;
    const [template]=await Promise.all([loadImage(spec.template),document.fonts.load('400 32px Prompt'),document.fonts.load('500 26px Prompt')]);
    const canvas=document.createElement('canvas');canvas.width=spec.width;canvas.height=spec.height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('canvas-unavailable');
    ctx.drawImage(template,0,0,spec.width,spec.height);
    const box={x:spec.box.x*spec.width,y:spec.box.y*spec.height,w:spec.box.w*spec.width,h:spec.box.h*spec.height};
    ctx.fillStyle='#163e72';ctx.textAlign='left';ctx.textBaseline='middle';
    if(mode==='draw'&&drawing){const scale=Math.min(box.w/drawing.width,box.h/drawing.height),w=drawing.width*scale,h=drawing.height*scale;ctx.drawImage(drawing,box.x+(box.w-w)/2,box.y+(box.h-h)/2,w,h);}
    else{
      // Left-aligned and flush to the top of the text box, like a written note.
      // The top padding is reserved BEFORE fitting, so the last line can never
      // spill past the bottom of the safe region.
      const topPad=box.h*0.04;
      const textBox={x:box.x,y:box.y+topPad,w:box.w,h:box.h-topPad};
      const fitted=fitText(ctx,text.trim(),textBox,format==='landscape'?44:40);
      const start=textBox.y+fitted.lineHeight/2;
      fitted.lines.forEach((line,i)=>ctx.fillText(line,textBox.x,start+i*fitted.lineHeight));
    }
    if(name.trim()){
      const signature='ด้วยความยินดี จาก '+name.trim();let size=26;while(size>16){ctx.font=`500 ${size}px Prompt, Tahoma, sans-serif`;if(ctx.measureText(signature).width<=box.w)break;size--;}
      const lines=wrapLines(signature,t=>ctx.measureText(t).width,box.w);lines.forEach((line,i)=>ctx.fillText(line,box.x,spec.signatureY*spec.height+i*size*1.5));
    }
    return new Promise((resolve,reject)=>{try{canvas.toBlob(blob=>blob?resolve({blob,width:spec.width,height:spec.height}):reject(new Error('export-failed')),'image/png');}catch(error){reject(error);}});
  }
  const api={formats,wrapLines,fitText,render};if(typeof module==='object'&&module.exports)module.exports=api;else root.WeddingWishExport=api;
})(typeof window==='undefined'?globalThis:window);
