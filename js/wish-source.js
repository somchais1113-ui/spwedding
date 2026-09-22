/* Shared, bounded vector source. Keep full pointer precision: no image downsampling. */
(function(root){
 'use strict';
 function normalize(value){
  if(!value||typeof value.name!=='string'||!value.name.trim()||value.name.length>80||/[\x00-\x1f\x7f]/.test(value.name))throw Error('fields');
  if(!['type','draw'].includes(value.mode)||!['portrait','landscape'].includes(value.format)||typeof value.text!=='string'||value.text.length>1000||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value.text))throw Error('fields');
  const source={name:value.name.trim(),text:value.mode==='type'?value.text.trim():'',mode:value.mode,format:value.format,ratio:value.mode==='draw'?value.ratio:1,strokes:[]};
  if(source.mode==='type'){if(!source.text)throw Error('fields');return source;}
  if(value.text!==''||!Number.isFinite(value.ratio)||value.ratio<.2||value.ratio>2||!Array.isArray(value.strokes)||!value.strokes.length||value.strokes.length>3000)throw Error('fields');
  let count=0;
  source.strokes=value.strokes.map(s=>{if(!s||![3,5,8].includes(s.width)||!Array.isArray(s.points)||!s.points.length||(count+=s.points.length)>40000)throw Error('drawing_size');return {width:s.width,points:s.points.map(p=>{if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1)throw Error('fields');return{x:p.x,y:p.y};})};});
  return source;
 }
 function paint(context,strokes,width,height){
  for(const stroke of strokes){context.strokeStyle=context.fillStyle='#163e72';context.lineWidth=stroke.width*width/600;context.lineCap='round';context.lineJoin='round';const p=stroke.points;
   if(p.length===1){context.beginPath();context.arc(p[0].x*width,p[0].y*height,context.lineWidth/2,0,Math.PI*2);context.fill();continue;}
   context.beginPath();context.moveTo(p[0].x*width,p[0].y*height);for(let i=1;i<p.length;i++)context.lineTo(p[i].x*width,p[i].y*height);context.stroke();
  }
 }
 const api={normalize,paint};if(typeof module==='object'&&module.exports)module.exports=api;else root.WeddingWishSource=api;
})(typeof window==='undefined'?globalThis:window);
