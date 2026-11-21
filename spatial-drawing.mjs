import {createWallViewport} from './wall-viewport.mjs?v=37';
import {placeDimensionLabels} from './dimension-layout.mjs?v=37';

const NS='http://www.w3.org/2000/svg',EPS=1e-8;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const clamp=t=>Math.max(0,Math.min(1,t));
const selectedPart=(selected,type,index)=>selected?.type===type&&selected.index===index;

/** Fixed orthographic axes: no fitting rotation changes a top/height drawing. */
export function projectSpatialPoint(p,view='top',orientation){
 if(!Array.isArray(p)||p.length!==3||!p.every(finite))throw new TypeError('Expected a finite spatial point.');
 const [x,y,z]=p;
 if(view==='top')return[x,y,z];
 if(view==='front')return[x,z,-y];
 if(view==='side')return[y,z,x];
 if(view==='iso'){
  const yaw=orientation?.yaw??Math.PI/4,pitch=orientation?.pitch??Math.atan(1/Math.SQRT2);
  if(!finite(yaw)||!finite(pitch))throw new TypeError('Expected finite orbit angles.');
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  return[x*cy-y*sy,-x*sp*sy-y*sp*cy+z*cp,x*cp*sy+y*cp*cy+z*sp];
 }
 throw new RangeError('Unknown pipe view.');
}

/** Exact circular basis is resampled according to the current screen sagitta.
 * The projected circle may be an ellipse or a line; its geometry never changes. */
export function spatialArcSamples(arc,pixelsPerMm=1){
 const raw=arc?.samples;
 if(!Array.isArray(raw)||raw.length<2)return[];
 if(!arc.tangent||!arc.normal||!finite(arc.radius)||arc.radius<=0||!finite(arc.turn))return raw;
 const radians=Math.abs(arc.turn)*Math.PI/180,screenRadius=Math.max(EPS,arc.radius*Math.max(EPS,pixelsPerMm));
 const maxStep=2*Math.acos(Math.max(-1,Math.min(1,1-.22/screenRadius)));
 const count=Math.min(2048,Math.max(8,Math.ceil(radians/Math.max(.0001,Math.min(Math.PI/24,maxStep)))));
 const origin=raw[0],sign=Math.sign(arc.turn);
 return Array.from({length:count+1},(_,i)=>{
  if(i===0)return origin;if(i===count)return raw.at(-1);
  const a=radians*i/count;
  return origin.map((value,j)=>value+arc.radius*Math.sin(a)*arc.tangent[j]+sign*arc.radius*(1-Math.cos(a))*arc.normal[j]);
 });
}

export function projectSpatialGeometry(geometry,view='top',pixelsPerMm=1,orientation){
 const P=p=>projectSpatialPoint(p,view,orientation);
 return{...geometry,view,lines:geometry.lines.map((line,index)=>({...line,index,start:P(line.start),end:P(line.end)})),
  arcs:geometry.arcs.map((arc,index)=>({...arc,index,samples:spatialArcSamples(arc,pixelsPerMm).map(P)})),
  points:geometry.points.map(P),start:P(geometry.start),end:P(geometry.end)};
}

function unionIntervals(intervals){
 const result=[];
 for(const [from,to]of intervals.filter(([a,b])=>b-a>EPS).sort((a,b)=>a[0]-b[0])){
  const last=result.at(-1);if(last&&from<=last[1]+EPS)last[1]=Math.max(last[1],to);else result.push([from,to]);
 }
 return result;
}

/** Portions of each projected straight obscured by a nearer straight. A
 * crossing only dashes the covered interval, not an entire distant pipe leg. */
export function spatialLineVisibility(lines,diameter){
 const radius=Math.max(0,diameter/2),hidden=lines.map(()=>[]);
 lines.forEach((line,i)=>{
  const a=line.start,b=line.end,u=[b[0]-a[0],b[1]-a[1]],length=Math.hypot(...u);if(length<EPS)return;
  lines.forEach((other,j)=>{
   if(i===j)return;
   const c=other.start,d=other.end,v=[d[0]-c[0],d[1]-c[1]],vLength=Math.hypot(...v);if(vLength<EPS)return;
   const w=[a[0]-c[0],a[1]-c[1]],cross=(p,q)=>p[0]*q[1]-p[1]*q[0];
   const crossU=cross(u,v),crossW=cross(w,v),alongU=(u[0]*v[0]+u[1]*v[1])/(vLength*vLength),alongW=(w[0]*v[0]+w[1]*v[1])/(vLength*vLength);
   let lo=0,hi=1;
   // Clip the lower centerline to the front straight's finite cylinder band.
   function clipLinear(offset,slope,min,max){
    if(Math.abs(slope)<EPS){if(offset<min-EPS||offset>max+EPS){lo=1;hi=0;}return;}
    const t1=(min-offset)/slope,t2=(max-offset)/slope;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));
   }
   clipLinear(crossW,crossU,-radius*vLength,radius*vLength);clipLinear(alongW,alongU,0,1);
   if(hi-lo<=EPS)return;
   const depthOffset=c[2]+(d[2]-c[2])*alongW-a[2],depthSlope=(d[2]-c[2])*alongU-(b[2]-a[2]);
   if(Math.abs(depthSlope)<EPS){if(depthOffset<=EPS)return;}
   else{const at=(EPS-depthOffset)/depthSlope;if(depthSlope>0)lo=Math.max(lo,at);else hi=Math.min(hi,at);}
   if(hi-lo>EPS)hidden[i].push([clamp(lo),clamp(hi)]);
  });
 });
 return hidden.map((intervals,index)=>{const obscured=unionIntervals(intervals),visible=[];let cursor=0;for(const [from,to]of obscured){if(from-cursor>EPS)visible.push([cursor,from]);cursor=Math.max(cursor,to);}if(1-cursor>EPS)visible.push([cursor,1]);return{index,visible,hidden:obscured};});
}

function segmentHit(point,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy,t=den>EPS?clamp(((point[0]-a[0])*dx+(point[1]-a[1])*dy)/den):.5;return{distance:distance(point,[a[0]+dx*t,a[1]+dy*t]),fraction:t,depth:a[2]+(b[2]-a[2])*t};}

/** Screen point picking stays independent of SVG paint order and orientation. */
export function pickSpatialParts(projected,point,{pixelsPerMm=1,tolerance=22,diameter=0}={}){
 if(!projected||!Array.isArray(point)||!point.slice(0,2).every(finite)||!finite(pixelsPerMm)||pixelsPerMm<=0)return[];
 const hits=[],limit=Math.max(tolerance,diameter*pixelsPerMm/2+4);
 for(const [index,line]of projected.lines.entries()){const hit=segmentHit(point,line.start,line.end);if(hit.distance*pixelsPerMm<=limit)hits.push({type:'length',index,distancePx:hit.distance*pixelsPerMm,depth:hit.depth});}
 for(const [index,arc]of projected.arcs.entries()){
  let best=null;for(let i=1;i<arc.samples.length;i++){const hit=segmentHit(point,arc.samples[i-1],arc.samples[i]);if(!best||hit.distance<best.distance)best=hit;}
  if(best&&best.distance*pixelsPerMm<=limit)hits.push({type:'angle',index,distancePx:best.distance*pixelsPerMm,depth:best.depth});
 }
 hits.sort((a,b)=>a.distancePx-b.distancePx||b.depth-a.depth||a.index-b.index);
 if(!hits.length)return[];
 // Offer alternatives only where their projections really compete, not every
 // neighbouring bend within a finger-sized touch target.
 return hits.filter(hit=>hit.distancePx<=hits[0].distancePx+3).sort((a,b)=>b.depth-a.depth||a.distancePx-b.distancePx);
}

/** Separate actual level rise from the input convention for a vertical leg.
 * Tangent lengths exclude the adjoining arcs; two horizontal levels include
 * their height contribution. Nothing is added to an obstacle clearance. */
export function spatialRiseLabelData(geometry,index){
 const line=geometry?.lines?.[index];if(!line)return null;
 const zero=geometry.start?.[2]??0,previous=geometry.lines[index-1],next=geometry.lines[index+1];
 const dimensionStart=(line.dimensionStart||line.start)[2]-zero,dimensionEnd=(line.dimensionEnd||line.end)[2]-zero;
 const vertical=Math.hypot(line.end[0]-line.start[0],line.end[1]-line.start[1])<1e-7;
 const horizontal=part=>part&&Math.abs(part.end[2]-part.start[2])<1e-7;
 const levelStart=vertical&&horizontal(previous)&&horizontal(next)?previous.end[2]-zero:dimensionStart;
 const levelEnd=vertical&&horizontal(previous)&&horizontal(next)?next.start[2]-zero:dimensionEnd;
 const rise=levelEnd-levelStart,dimension=line.dimension??line.length;
 return{start:levelStart,end:levelEnd,rise,dimension,showSeparateDimension:Math.abs(Math.abs(rise)-dimension)>1e-6};
}

function node(svg,tag,attrs,parent,text){const item=svg.ownerDocument.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs||{}))item.setAttribute(key,String(value));if(text!==undefined)item.textContent=text;(parent||svg).append(item);return item;}
function rect(x,y,w,h){return[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];}
function footprint(a,b,r){const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<EPS)return rect(a[0]-r,a[1]-r,2*r,2*r);const nx=-dy/length*r,ny=dx/length*r;return[[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]];}
function polyline(points,map){return points.map((p,i)=>`${i?'L':'M'} ${map(p).slice(0,2).join(' ')}`).join(' ');}
function inView(p,width,height,margin=24){return p[0]>=-margin&&p[0]<=width+margin&&p[1]>=-margin&&p[1]<=height+margin;}
function clippedLine(a,b,width,height,padding=20){let from=0,to=1;const d=[b[0]-a[0],b[1]-a[1]];for(const [p,q]of [[-d[0],a[0]-padding],[d[0],width-padding-a[0]],[-d[1],a[1]-padding],[d[1],height-padding-a[1]]]){if(Math.abs(p)<EPS){if(q<0)return null;continue;}const t=q/p;if(p<0)from=Math.max(from,t);else to=Math.min(to,t);if(from>to)return null;}return[mix(a,b,from),mix(a,b,to)];}
function signedHeight(value,format){const rounded=Math.abs(value)<1e-7?0:value;return(rounded>0?'+':'')+format(rounded);}

function layoutFrame(svg,geometry,settings,width,height){
 const projected=projectSpatialGeometry(geometry,settings.view||'top',1,settings.orbit),diameter=settings.diameter||12,padding=64;
 const xs=projected.points.map(p=>p[0]),ys=projected.points.map(p=>p[1]);if(!xs.length){xs.push(0);ys.push(0);}
 const minx=Math.min(...xs)-diameter/2,maxx=Math.max(...xs)+diameter/2,miny=Math.min(...ys)-diameter/2,maxy=Math.max(...ys)+diameter/2;
 const scale=Math.min(Math.max(20,width-2*padding)/Math.max(diameter,maxx-minx),Math.max(20,height-2*padding)/Math.max(diameter,maxy-miny));
 const frame={svg,geometry,settings,projected,width,height,scale,center:[(minx+maxx)/2,(miny+maxy)/2]};
 frame.P=p=>[width/2+(p[0]-frame.center[0])*scale,height/2-(p[1]-frame.center[1])*scale,p[2]];return frame;
}

function paintTube(frame,group,pixelsPerUnit=1,preview=null){
 const {svg,geometry,settings,scale,P}=frame,projected=projectSpatialGeometry(geometry,settings.view||'top',scale*pixelsPerUnit,settings.orbit),diameter=settings.diameter||12;
 frame.projected=projected;
 const visibility=spatialLineVisibility(projected.lines,diameter),parts=[];
 for(const [i,line]of projected.lines.entries()){
  const visible=visibility[i].visible;
  if(distance(line.start,line.end)<EPS)parts.push({type:'length',index:i,points:[line.start,line.end],depth:(line.start[2]+line.end[2])/2,collapsed:true});
  else for(const interval of visible){const points=interval.map(t=>mix(line.start,line.end,t));parts.push({type:'length',index:i,points,depth:(points[0][2]+points[1][2])/2});}
 }
 for(const [i,arc]of projected.arcs.entries())parts.push({type:'angle',index:i,points:arc.samples,depth:arc.samples.reduce((sum,p)=>sum+p[2],0)/arc.samples.length});
 parts.sort((a,b)=>a.depth-b.depth);
 const width=diameter*scale,inner=Math.max(0,width-2/Math.max(EPS,pixelsPerUnit));
 if(preview){const projection=projectSpatialGeometry(preview,settings.view||'top',scale*pixelsPerUnit,settings.orbit);let delta=[0,0,0];
  if(settings.end==='A'&&preview.lines[1]){const anchor=preview.lines[1].dimensionStart||preview.lines[1].start,old=geometry.lines[0].dimensionStart||geometry.lines[0].start;delta=projectSpatialPoint(old.map((value,i)=>value-anchor[i]),settings.view||'top',settings.orbit);}
  const previewPoint=p=>P(p.map((value,i)=>value+delta[i]));
  for(const line of projection.lines)node(svg,'path',{d:polyline([line.start,line.end],previewPoint),fill:'none',stroke:'#8dbba8','stroke-width':1.5,'vector-effect':'non-scaling-stroke','stroke-dasharray':'6 5',opacity:.55,'data-spatial-preview':''},group);for(const arc of projection.arcs)node(svg,'path',{d:polyline(arc.samples,previewPoint),fill:'none',stroke:'#8dbba8','stroke-width':1.5,'vector-effect':'non-scaling-stroke','stroke-dasharray':'6 5',opacity:.55,'data-spatial-preview':''},group);}
 for(const part of parts){
  const selected=selectedPart(settings.selected,part.type,part.index),attrs={'data-spatial-part':(part.type==='length'?'L':'B')+(part.index+1),'data-length-id':part.type==='length'?'L'+(part.index+1):undefined,'data-bend-id':part.type==='angle'?'B'+(part.index+1):undefined};for(const key of Object.keys(attrs))if(attrs[key]===undefined)delete attrs[key];
  if(part.collapsed){const p=P(part.points[0]);node(svg,'circle',{...attrs,cx:p[0],cy:p[1],r:width/2,fill:selected?'#f3d8ac':'#deeee7',stroke:selected?'#b56a12':'#699581','stroke-width':1,'vector-effect':'non-scaling-stroke'},group);continue;}
  const d=polyline(part.points,P);
  if(width*pixelsPerUnit<1.5)node(svg,'path',{d,fill:'none',stroke:'#699581','stroke-width':1.25,'vector-effect':'non-scaling-stroke'},group);
  node(svg,'path',{...attrs,d,fill:'none',stroke:selected?'#b56a12':'#91ad9f','stroke-width':width,'stroke-linejoin':'round','stroke-linecap':'butt'},group);
  if(inner>0)node(svg,'path',{d,fill:'none',stroke:selected?'#f5e4c9':'#deeee7','stroke-width':inner,'stroke-linejoin':'round','stroke-linecap':'butt'},group);
  if(width*pixelsPerUnit>=8)node(svg,'path',{d,fill:'none',stroke:'#477963','stroke-width':.65,'vector-effect':'non-scaling-stroke','stroke-dasharray':'4 5'},group);
 }
 // Hidden portions are a symbolic centreline over the upper tube. Keeping the
 // same coordinates is essential: a level change never shifts the plan drawing.
 for(const [i,entry]of visibility.entries())for(const interval of entry.hidden){node(svg,'path',{'data-spatial-hidden':'L'+(i+1),d:polyline(interval.map(t=>mix(projected.lines[i].start,projected.lines[i].end,t)),P),fill:'none',stroke:'#426b63','stroke-width':1.5,'vector-effect':'non-scaling-stroke','stroke-dasharray':'4 4'},group);}
}

function paintAnnotations(frame,group,camera,{format=String,translate=s=>s,onEdit=()=>{},onEndpoint=()=>{},interactive=true}={}){
 const {svg,geometry:g,settings,projected,P,scale}=frame,density=camera.pixelsPerUnit||1,width=camera.screenWidth||camera.width,height=camera.screenHeight||camera.height;
 const toScreen=p=>[(p[0]-camera.x)*density+width/2,(p[1]-camera.y)*density+height/2],project=p=>toScreen(P(p));
 const topLeft=[camera.x-width/2/density,camera.y-height/2/density];group.setAttribute('transform',`translate(${topLeft[0]} ${topLeft[1]}) scale(${1/density})`);
 const guides=node(svg,'g',{'data-layer':'spatial-guides','pointer-events':'none'},group),labels=node(svg,'g',{'data-layer':'spatial-labels'},group),ends=node(svg,'g',{'data-layer':'spatial-ends'},group);
 const obstacles=[],pipeWidth=Math.max(1,(settings.diameter||12)*scale*density/2),items=[],heightZero=g.start[2];
 for(const line of projected.lines){const a=project(line.start),b=project(line.end);if(clippedLine(a,b,width,height,-pipeWidth))obstacles.push(footprint(a,b,pipeWidth+2));}
 for(const arc of projected.arcs){const stride=Math.max(1,Math.floor(arc.samples.length/60));for(let i=1;i<arc.samples.length;i+=stride){const a=project(arc.samples[i-1]),b=project(arc.samples[Math.min(i+stride-1,arc.samples.length-1)]);if(clippedLine(a,b,width,height,-pipeWidth))obstacles.push(footprint(a,b,pipeWidth+2));}}
 const endpointPositions=projected.start&&projected.end?[project(projected.start),project(projected.end)]:[];
 for(const p of endpointPositions)if(inView(p,width,height))obstacles.push(rect(p[0]-20,p[1]-20,40,40));
 let startReference=null;
 const startFrame=g.lineFrames?.[0]||g.lines[0]?.frame,startPoint=endpointPositions[0];
 if(startFrame&&startPoint&&inView(startPoint,width,height,0)){
  const projectedNormal=projectSpatialPoint(startFrame.normal,settings.view||'top',settings.orbit),normalLength=Math.hypot(projectedNormal[0],projectedNormal[1]);
  const u=normalLength>1e-6?[projectedNormal[0]/normalLength,-projectedNormal[1]/normalLength]:[1,0],origin=startPoint;
  const end=[origin[0]+u[0]*46,origin[1]+u[1]*46],label=[origin[0]+u[0]*58,origin[1]+u[1]*58];
  if(inView(label,width,height,-10)){
   startReference={origin,end,label,u,collapsed:normalLength<1e-6,depth:projectedNormal[2]};
   obstacles.push(rect(Math.min(origin[0],label[0])-15,Math.min(origin[1],label[1])-12,Math.abs(origin[0]-label[0])+30,Math.abs(origin[1]-label[1])+24));
  }
 }
 function editable(item,type,index){if(!interactive)return;item.setAttribute('role','button');item.setAttribute('tabindex','0');item.onclick=event=>{event.stopPropagation?.();onEdit(type,index);};item.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onEdit(type,index);}};}
 for(const [index,line]of projected.lines.entries()){
  const a=project(line.start),b=project(line.end),visible=clippedLine(a,b,width,height);if(!visible)continue;
  const original=g.lines[index],riseData=spatialRiseLabelData(g,index),zStart=riseData.start,zEnd=riseData.end;
  const collapsed=distance(a,b)<3,delta=riseData.rise,base=(selectedPart(settings.selected,'length',index)?'L'+(index+1)+' · ':'')+format(original.dimension??original.length)+' mm';
  let heightText=Math.abs(delta)<1e-6?'H '+signedHeight(zStart,format)+' mm':'H '+signedHeight(zStart,format)+' → '+signedHeight(zEnd,format)+' mm';
  let text=base,dimensionText=null;
  if(collapsed&&settings.view==='top'&&Math.abs(delta)>1e-6){text=(delta>0?'⊙ ':'⊗ ')+translate(delta>0?'Op':'Ned')+' '+format(Math.abs(delta))+' mm';if(riseData.showSeparateDimension)dimensionText='L'+(index+1)+' · '+format(riseData.dimension)+' mm';}
  const maxLength=Math.max(text.length,heightText.length,dimensionText?.length||0),labelWidth=Math.min(width-24,Math.max(70,maxLength*6.8+16));
  items.push({id:'L'+(index+1),type:'length',index,a:visible[0],b:visible[1],text,heightText,dimensionText,width:labelWidth,height:dimensionText?56:40,angle:0,collapsed,priority:selectedPart(settings.selected,'length',index)?0:collapsed?1:2});
  if(collapsed&&settings.view==='top'&&Math.abs(delta)>1e-6){const point=project(line.start),symbol=node(svg,'g',{'data-height-transition':'L'+(index+1)},labels);node(svg,'circle',{cx:point[0],cy:point[1],r:9,fill:'#fff',stroke:'#226d54','stroke-width':1.5},symbol);if(delta>0)node(svg,'circle',{cx:point[0],cy:point[1],r:3,fill:'#226d54'},symbol);else{node(svg,'path',{d:`M ${point[0]-3} ${point[1]-3} l 6 6 M ${point[0]-3} ${point[1]+3} l 6 -6`,stroke:'#226d54','stroke-width':1.5},symbol);}editable(symbol,'length',index);}
 }
 for(const [index,arc]of projected.arcs.entries()){
  const p=project(arc.samples[Math.floor(arc.samples.length/2)]);if(!inView(p,width,height,0))continue;
  const text='B'+(index+1);items.push({id:text,type:'angle',index,a:p,b:p,text,width:Math.max(36,text.length*8+16),height:26,angle:0,priority:selectedPart(settings.selected,'angle',index)?0:3});
 }
 items.sort((a,b)=>a.priority-b.priority||distance(b.a,b.b)-distance(a.a,a.b));
 const placed=placeDimensionLabels(items,obstacles,{x:8,y:8,w:width-16,h:height-16},{allowOmissions:true,localFallback:items.length<45,acceptCandidate:c=>c.box.x>=8&&c.box.y>=8&&c.box.x+c.box.w<=width-8&&c.box.y+c.box.h<=height-8&&Math.hypot(c.x-(c.a[0]+c.b[0])/2,c.y-(c.a[1]+c.b[1])/2)<=110});
 for(const label of placed){
  const isBend=label.type==='angle',anchor=[(label.a[0]+label.b[0])/2,(label.a[1]+label.b[1])/2],selected=selectedPart(settings.selected,label.type,label.index),dx=anchor[0]-label.x,dy=anchor[1]-label.y,factor=Math.min(1,label.width/2/Math.max(EPS,Math.abs(dx)),label.height/2/Math.max(EPS,Math.abs(dy)));
  node(svg,'line',{x1:anchor[0],y1:anchor[1],x2:label.x+dx*factor,y2:label.y+dy*factor,stroke:isBend?'#b9783c':'#8ba699','stroke-width':1},guides);
  const attrs={'data-focus-key':label.id,'data-reference':label.id,'data-spatial-label':label.id,'aria-label':label.id+' · '+label.text+(label.heightText?' · '+label.heightText:'')};
  if(label.type==='length')attrs['data-length']=label.id;else attrs['data-bend-id']=label.id;
  const item=node(svg,'g',attrs,labels);node(svg,'title',{},item,attrs['aria-label']);node(svg,'rect',{x:label.x-label.width/2,y:label.y-label.height/2,width:label.width,height:label.height,rx:isBend?13:5,fill:selected?'#fff0d9':isBend?'#fff4e8':'#fff',stroke:selected?'#b16a14':isBend?'#b9783c':'#b7c9be','stroke-width':selected?1.7:.8},item);
  node(svg,'text',{x:label.x,y:label.y+(label.dimensionText?-11:label.heightText?-3:4.5),'text-anchor':'middle','font-family':'var(--app-font, sans-serif)','font-size':isBend?13:12,'font-weight':600,fill:isBend?'#994c0c':'#176748'},item,label.text);
  if(label.dimensionText)node(svg,'text',{'data-spatial-input-dimension':label.id,x:label.x,y:label.y+4,'text-anchor':'middle','font-family':'var(--app-font, sans-serif)','font-size':11,fill:'#176748'},item,label.dimensionText);
  if(label.heightText)node(svg,'text',{'data-height-label':label.id,'aria-label':translate('Højde fra A')+' · '+label.heightText,x:label.x,y:label.y+(label.dimensionText?19:12),'text-anchor':'middle','font-family':'var(--app-font, sans-serif)','font-size':10.5,fill:'#55776a'},item,label.heightText);
  editable(item,label.type,label.index);
 }
 for(const [index,letter]of ['A','B'].entries()){
  const p=endpointPositions[index];if(!p||!inView(p,width,height))continue;
  const same=endpointPositions.length===2&&distance(...endpointPositions)<35,offset=same?(index===0?-18:18):0;
  if(offset)node(svg,'line',{x1:p[0],y1:p[1],x2:p[0]+offset,y2:p[1],stroke:'#416b60','stroke-width':1},guides);
  const endpoint=node(svg,'g',{'data-endpoint':letter,'data-focus-key':'end:'+letter,'aria-label':translate('Tilføj buk ved ende ')+letter},ends);
  node(svg,'circle',{cx:p[0]+offset,cy:p[1],r:22,fill:'transparent'},endpoint);node(svg,'circle',{cx:p[0]+offset,cy:p[1],r:15,fill:letter===settings.end?'#16815d':'#183c36',stroke:'#fff','stroke-width':2.5},endpoint);node(svg,'text',{x:p[0]+offset,y:p[1]+4.5,'text-anchor':'middle',fill:'#fff','font-size':13,'font-weight':700},endpoint,letter);
  if(interactive){endpoint.setAttribute('role','button');endpoint.setAttribute('tabindex','0');endpoint.onclick=event=>{event.stopPropagation?.();onEndpoint(letter);};endpoint.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onEndpoint(letter);}};}
 }
 // The first bend's0° datum is physically anchored at A and projected
 // from its actual reference normal, including a tilted/prepended start.
 if(startReference){
  const {origin,end,label,u,collapsed,depth}=startReference,color='#ad722f';
  const reference=node(svg,'g',{'data-spatial-start-reference':'','data-reference-normal':startFrame.normal.join(' '),'pointer-events':'none'},group);
  node(svg,'title',{},reference,translate('Reference ved A'));
  if(collapsed){
   node(svg,'line',{x1:origin[0]+18,y1:origin[1],x2:end[0]-7,y2:end[1],stroke:color,'stroke-width':1,'stroke-dasharray':'3 3'},reference);
   node(svg,'circle',{cx:end[0],cy:end[1],r:6,fill:'#fff',stroke:color,'stroke-width':1.3},reference);
   if(depth>0)node(svg,'circle',{cx:end[0],cy:end[1],r:2,fill:color},reference);
   else node(svg,'path',{d:`M ${end[0]-2.5} ${end[1]-2.5} l 5 5 M ${end[0]-2.5} ${end[1]+2.5} l 5 -5`,stroke:color,'stroke-width':1.2},reference);
  }else{
   const n=[-u[1],u[0]],begin=[origin[0]+u[0]*18,origin[1]+u[1]*18];
   node(svg,'path',{d:`M ${begin.join(' ')} L ${end.join(' ')} M ${end[0]-u[0]*5+n[0]*3} ${end[1]-u[1]*5+n[1]*3} L ${end.join(' ')} L ${end[0]-u[0]*5-n[0]*3} ${end[1]-u[1]*5-n[1]*3}`,fill:'none',stroke:color,'stroke-width':1.4},reference);
  }
  node(svg,'rect',{x:label[0]-12,y:label[1]-9,width:24,height:17,rx:3,fill:'#fff',opacity:.95},reference);
  node(svg,'text',{x:label[0],y:label[1]+3.5,'text-anchor':'middle','font-size':10.5,'font-weight':600,fill:color},reference,'0°');
 }
 svg.setAttribute('data-spatial-placed-labels',String(placed.length));svg.setAttribute('data-spatial-total-labels',String(items.length));
}

/** Separate SVG from the planar editor: hidden views do not share a camera. */
export function createSpatialPipeDrawing({svg,zoomIn,zoomOut,fit,output,format=String,translate=s=>s,onEdit=()=>{},onEndpoint=()=>{},onPick}={}){
 let frame=null,lastView=null,orbitMode=false;
 const orbit={yaw:Math.PI/4,pitch:Math.atan(1/Math.SQRT2)};
 const viewport=createWallViewport({svg,zoomIn,zoomOut,fit,output,onChange:update,onTap:tap,onSingleDrag:orbitDrag,enabled:()=>!svg.hidden});
 function orbitDrag({deltaX,deltaY}){
  if(!orbitMode||!frame||frame.settings.view!=='iso')return false;
  const points=frame.geometry.points,pivot=[0,1,2].map(index=>(Math.min(...points.map(p=>p[index]))+Math.max(...points.map(p=>p[index])))/2);
  const previous=projectSpatialPoint(pivot,'iso',orbit),anchor=frame.P(previous);
  orbit.yaw=((orbit.yaw+deltaX*.008+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
  orbit.pitch=Math.max(-Math.PI*.47,Math.min(Math.PI*.47,orbit.pitch+deltaY*.008));
  frame.settings.orbit={...orbit};
  const next=projectSpatialPoint(pivot,'iso',orbit);
  frame.center[0]=next[0]+(frame.width/2-anchor[0])/frame.scale;
  frame.center[1]=next[1]-(frame.height/2-anchor[1])/frame.scale;
  viewport.setOnChange(update);
  svg.setAttribute('data-orbit-yaw',String(orbit.yaw));svg.setAttribute('data-orbit-pitch',String(orbit.pitch));
  return true;
 }
 function update(camera){
  if(!frame)return;
  const bounds=svg.getBoundingClientRect?.(),screenWidth=Number(bounds?.width)||camera.width,screenHeight=Number(bounds?.height)||camera.height;
  const focused=svg.ownerDocument.activeElement,focusKey=frame.annotations.contains?.(focused)?focused?.getAttribute?.('data-focus-key'):null;
  frame.pipes.replaceChildren();paintTube(frame,frame.pipes,camera.pixelsPerUnit,frame.preview);
  frame.annotations.replaceChildren();paintAnnotations(frame,frame.annotations,{...camera,screenWidth,screenHeight},{format,translate,onEdit,onEndpoint});
  svg.setAttribute('data-detail-zoom',String(camera.zoom));svg.setAttribute('data-world-diameter',String(frame.settings.diameter));svg.setAttribute('data-world-scale',String(frame.scale));
  if(focusKey){const next=[...frame.annotations.querySelectorAll('[data-focus-key]')].find(item=>item.getAttribute('data-focus-key')===focusKey);(next||svg).focus?.({preventScroll:true});}
 }
 function tap(event){
  if(!frame)return false;
  // Label/endpoint buttons have their own keyboard and pointer actions.
  let target=event.target;while(target&&target!==svg){if(target.getAttribute?.('data-focus-key')||target.getAttribute?.('data-height-transition'))return false;target=target.parentNode;}
  const world=[(event.point.x-frame.width/2)/frame.scale+frame.center[0],-(event.point.y-frame.height/2)/frame.scale+frame.center[1]];
  const camera=viewport.getState(),bounds=svg.getBoundingClientRect?.(),density=Math.min((Number(bounds?.width)||camera.width)/camera.width,(Number(bounds?.height)||camera.height)/camera.height)*camera.zoom;
  const hits=pickSpatialParts(frame.projected,world,{pixelsPerMm:frame.scale*density,diameter:frame.settings.diameter});if(!hits.length)return false;
  if(hits.length>1&&typeof onPick==='function')onPick(hits);else onEdit(hits[0].type,hits[0].index);return true;
 }
 function draw(geometry,preview,settings={}){
  const view=settings.view||'top',changed=view!==lastView;lastView=view;if(view!=='iso')orbitMode=false;settings={...settings,view,...(view==='iso'?{orbit:{...orbit}}:{})};
  svg.setAttribute('data-orbit-mode',String(orbitMode));svg.style.cursor=orbitMode?'grab':'';svg.setAttribute('data-orbit-yaw',String(orbit.yaw));svg.setAttribute('data-orbit-pitch',String(orbit.pitch));
  frame=null;svg.replaceChildren();const width=Math.max(280,svg.clientWidth||900),height=Math.max(430,Math.min(540,width*.65));svg.setAttribute('height',String(height));svg.setAttribute('data-spatial-view',view);viewport.update(width,height);
  if(!geometry?.lines?.length)return;
  frame=layoutFrame(svg,geometry,settings,width,height);frame.preview=preview;
  frame.pipes=node(svg,'g',{'data-layer':'spatial-pipe'});frame.annotations=node(svg,'g',{'data-layer':'spatial-annotations'});
  if(changed)viewport.reset();else viewport.setOnChange(update);
 }
 return{draw,reset:()=>viewport.reset(),getState:()=>viewport.getState(),setOrbitMode:value=>{orbitMode=!!value;svg.setAttribute('data-orbit-mode',String(orbitMode));svg.style.cursor=orbitMode?'grab':'';return orbitMode;},getOrbitMode:()=>orbitMode,getOrbitAngles:()=>({...orbit})};
}

/** Printable three-view sheet. It uses the same orthographic projection and
 * physical path as the editor, with no interactive camera or hidden controls. */
export function renderSpatialWorkDrawing(svg,geometry,{diameter=12,radius=38,format=String,translate=s=>s,view='top',width=900,height=1200}={}){
 svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('data-spatial-work','true');
 const panels=[{view:'top',title:translate('Ovenfra')},{view:'front',title:translate('Forfra')},{view:'side',title:translate('Fra siden')}];
 panels.forEach((panel,index)=>{
  const panelHeight=height/3,group=node(svg,'g',{transform:`translate(0 ${index*panelHeight})`});
  node(svg,'text',{x:24,y:30,'font-size':18,'font-weight':600,fill:'#183c36'},group,panel.title);
  const frame=layoutFrame(svg,geometry,{diameter,radius,view:panel.view,end:'B'},width,panelHeight-36);frame.P=((original)=>p=>{const q=original(p);return[q[0],q[1]+36,q[2]];})(frame.P);
  const pipe=node(svg,'g',{'data-work-view':panel.view},group),annotations=node(svg,'g',{},group);paintTube(frame,pipe,1);paintAnnotations(frame,annotations,{x:width/2,y:panelHeight/2,width,height:panelHeight,pixelsPerUnit:1},{format,translate,interactive:false});
  if(index<2)node(svg,'line',{x1:20,y1:panelHeight-1,x2:width-20,y2:panelHeight-1,stroke:'#d9e4de'},group);
 });
}
