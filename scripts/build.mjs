import fs from 'node:fs';
import path from 'node:path';
import pptxgen from 'pptxgenjs';

const root = path.resolve(import.meta.dirname, '..');
const specPath = path.resolve(process.argv[2] || path.join(root, 'examples/architecture.json'));
const outPath = path.resolve(process.argv[3] || path.join(root, 'output/demo.pptx'));
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const brand = JSON.parse(fs.readFileSync(path.join(root, 'config/brand.json'), 'utf8'));
const C = brand.colors, F = brand.fonts;
const W = 13.333, H = 7.5;
const pptx = new pptxgen(); pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Corporate Slides Factory'; pptx.subject = spec.title || '';
pptx.title = spec.title || 'Presentation'; pptx.lang = 'es-CO';
pptx.theme = {headFontFace:F.head,bodyFontFace:F.body,lang:'es-CO'};
const S = pptx.ShapeType;
const geometry = [];
function fail(m){ throw new Error(m); }
function rect(slide,x,y,w,h,fill,line='none',radius=false){
  check(x,y,w,h); slide.addShape(radius?S.roundRect:S.rect,{x,y,w,h,rectRadius:.12,line:line==='none'?{color:fill,transparency:100}:{color:line,width:.8},fill:{color:fill},radius:.1});
}
function check(x,y,w,h){if(![x,y,w,h].every(Number.isFinite)||x < -.005||y < -.005||w<=0||h<=0||x+w>W+.015||y+h>H+.015) fail(`Element outside slide: ${[x,y,w,h]}`);}
function txt(slide,t,x,y,w,h,size=18,color=C.text,opts={}){
  if(typeof t!=='string') fail('Text must be a string'); check(x,y,w,h);
  slide.addText(t,{x,y,w,h,fontFace:opts.bold?F.head:F.body,fontSize:size,bold:!!opts.bold,color,margin:0,breakLine:false,fit:'shrink',valign:opts.valign||'mid',align:opts.align||'left',...opts});
  geometry.at(-1).elements.push({text:t,x,y,w,h,fontSize:size});
}
function base(title,i,total,source){
  const slide=pptx.addSlide(); geometry.push({slide:i+1,title,elements:[]});
  slide.background={color:C.white}; rect(slide,0,0,.13,H,C.accent);
  txt(slide,title,.65,.43,11.95,.85,28,C.navy,{bold:true,valign:'top'});
  rect(slide,.68,1.38,11.95,.025,C.line);
  txt(slide,brand.footer||'',.68,7.12,8,.18,9,C.muted);
  txt(slide,`${i+1} / ${total}`,12.02,7.10,.62,.2,9,C.muted,{align:'right'});
  if(source) txt(slide,`Fuente: ${source}`,.68,6.78,11.8,.24,9,C.muted);
  return slide;
}
function validate(){
  if(!Array.isArray(spec.slides)||!spec.slides.length) fail('slides must be a nonempty array');
  const types=new Set(['cover','summary','architecture','comparison','roadmap']);
  for(const [i,s] of spec.slides.entries()){
    if(!types.has(s.type)||!s.title||typeof s.title!=='string') fail(`Invalid slide ${i+1}`);
    const required={summary:'items',architecture:'zones',comparison:'columns',roadmap:'steps'}[s.type];
    if(required&&(!Array.isArray(s[required])||!s[required].length)) fail(`Slide ${i+1}: missing ${required}`);
    if(s.type==='architecture'){
      if(s.zones.length>4) fail('Architecture supports at most four zones');
      const ids=s.zones.flatMap(z=>z.nodes?.map(n=>n.id)||[]);
      if(ids.length!==new Set(ids).size||ids.some(id=>!id)) fail('Node IDs must be unique and nonempty');
      if(s.zones.some(z=>!z.name||!Array.isArray(z.nodes)||!z.nodes.length||z.nodes.length>3||z.nodes.some(n=>!n.label))) fail('Zones require a name and 1–3 labeled nodes');
      for(const f of s.flows||[]) if(!ids.includes(f.from)||!ids.includes(f.to)||f.from===f.to) fail(`Bad flow ${f.from} → ${f.to}`);
    }
  }
}
function cover(s,i){
  const slide=pptx.addSlide();geometry.push({slide:i+1,title:s.title,elements:[]});
  slide.background={color:C.navy};rect(slide,.65,1.05,.12,5.25,C.accent);
  txt(slide,s.title,1.1,1.45,10.7,2.4,36,C.white,{bold:true,valign:'mid'});
  txt(slide,s.subtitle||spec.audience||'',1.12,4.25,10.1,.55,19,C.light);
  txt(slide,brand.footer||'',1.12,6.82,10,.24,10,C.light);
}
function summary(s,i,n){
  const sl=base(s.title,i,n,s.source); if(s.items.length>4) fail('Summary supports at most four items');
  const gap=.22,w=(11.96-gap*(s.items.length-1))/s.items.length;
  s.items.forEach((it,k)=>{const x=.68+k*(w+gap);rect(sl,x,1.93,w,4.35,C.light,C.line,true);
    rect(sl,x,1.93,w,.12,C.accent);txt(sl,it.heading||'',x+.22,2.25,w-.44,.8,20,C.navy,{bold:true,valign:'top'});
    txt(sl,it.body||'',x+.22,3.22,w-.44,2.45,17,C.text,{valign:'top'});
  });
}
function architecture(s,i,n){
  const sl=base(s.title,i,n,s.source); const zones=s.zones, gap=.24, zw=(11.96-gap*(zones.length-1))/zones.length;
  const coords=new Map();
  zones.forEach((z,zi)=>{const x=.68+zi*(zw+gap);rect(sl,x,1.78,zw,4.53,'F7FAFB',C.line,true);
    rect(sl,x,1.78,zw,.53,C.navy);txt(sl,z.name,x+.13,1.88,zw-.26,.3,16,C.white,{bold:true});
    const count=z.nodes.length, dh=Math.min(1.12,3.45/count), step=3.65/count;
    z.nodes.forEach((nd,j)=>{const y=2.55+j*step; const nx=x+.20,nw=zw-.40;
      rect(sl,nx,y,nw,dh,C.white,C.accent,true);txt(sl,nd.label,nx+.12,y+.07,nw-.24,dh-.14,16,C.navy,{bold:true,align:'center'});
      coords.set(nd.id,{x:nx,y,w:nw,h:dh,zi});
    });
  });
  // Routes across zone gutters; when a flow stays within one zone use a side rail.
  (s.flows||[]).forEach((f,idx)=>{
    const a=coords.get(f.from), b=coords.get(f.to); const same=a.zi===b.zi;
    const line={color:C.accent,width:1.7,beginArrowType:'none',endArrowType:'triangle',dashType:f.async?'dash':'solid'};
    if(same){ const xx=a.x+a.w+.07, ay=a.y+a.h/2, by=b.y+b.h/2;
      sl.addShape(S.line,{x:a.x+a.w,y:ay,w:xx-a.x-a.w,h:0,line:{color:C.accent,width:1.7}});
      sl.addShape(S.line,{x:xx,y:Math.min(ay,by),w:0,h:Math.abs(ay-by),line:{color:C.accent,width:1.7}});
      sl.addShape(S.line,{x:xx,y:by,w:b.x-xx,h:0,line});
    }else{
      const forward=b.zi>a.zi; const x1=forward?a.x+a.w:a.x, x2=forward?b.x:b.x+b.w;
      const y1=a.y+a.h/2,y2=b.y+b.h/2;
      sl.addShape(S.line,{x:x1,y:y1,w:x2-x1,h:y2-y1,line});
    }
  });
  txt(sl,'Línea continua: síncrono     Línea discontinua: asíncrono',.74,6.44,9,.19,9,C.muted);
}
function comparison(s,i,n){
  const sl=base(s.title,i,n,s.source);if(s.columns.length!==2) fail('Comparison requires exactly two columns');
  s.columns.forEach((col,j)=>{const x=.68+j*6.08;rect(sl,x,1.85,5.88,4.68,j?C.light:'F5F7FA',C.line,true);
    txt(sl,col.heading||'',x+.28,2.13,5.3,.52,23,C.navy,{bold:true});
    if(!Array.isArray(col.items)||col.items.length>5) fail('Comparison supports up to five lines per column');
    col.items.forEach((item,k)=>{rect(sl,x+.28,3.00+k*.65,.10,.10,C.accent);txt(sl,item,x+.52,2.86+k*.65,4.96,.44,17,C.text);});
  });
}
function roadmap(s,i,n){
  const sl=base(s.title,i,n,s.source);if(s.steps.length>4) fail('Roadmap supports at most four steps');
  const gap=.18,w=(11.96-gap*(s.steps.length-1))/s.steps.length;
  s.steps.forEach((st,j)=>{const x=.68+j*(w+gap);rect(sl,x,2.36,w,3.56,C.light,C.line,true);
    rect(sl,x,2.36,w,.15,C.accent);txt(sl,st.name||'',x+.2,2.78,w-.4,.78,21,C.navy,{bold:true,valign:'top'});
    txt(sl,st.detail||'',x+.2,3.82,w-.4,1.47,17,C.text,{valign:'top'});
  });
}
validate();
spec.slides.forEach((s,i)=>({cover,summary,architecture,comparison,roadmap})[s.type](s,i,spec.slides.length));
fs.mkdirSync(path.dirname(outPath),{recursive:true});
await pptx.writeFile({fileName:outPath});
fs.writeFileSync(outPath.replace(/\.pptx$/i,'.geometry.json'),JSON.stringify(geometry,null,2));
console.log(`Built ${spec.slides.length} slides: ${outPath}`);
