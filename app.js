import {initAppSharing} from './share-app.mjs?v=39';
import {SWAGELOK_BENDERS,getBender} from './benders.mjs';
import {measurementMode,validateMeasurements,convertMeasurementMode,bendMarkLayout} from './measurements.mjs';
import {roundDisplayedMarks} from './displayed-marks.mjs?v=39';
import {isProjectId} from './project-storage.mjs?v=39';
import {initRoomPlanner} from './room-planner.mjs?v=39';
import {renderOffsetVisualization} from './offset-visual.mjs';
import {initTypography} from './typography.mjs?v=39';
import {placeDimensionLabels} from './dimension-layout.mjs?v=39';
import {layoutBlankMarks} from './blank-layout.mjs?v=39';
import {bendReferenceLayout,bestDrawingAngle,readableTextAngle,leaderCrossesPipe} from './labels.mjs?v=39';
import {t,language,locales,captureTranslations,applyLanguage} from './i18n.mjs?v=39';
import{geometry,extend,triangle,practicalOffsetLength,calculate}from'./geometry.mjs';
import {wallValidationStatus} from './wall-validation-status.mjs?v=39';
import {createMainPipeDrawing} from './main-pipe-drawing.mjs?v=39';
import {geometry3D,extendSpatial,validateSpatialState,hasSpatialPipe,bendOrientation,spatialBendRotations} from './spatial-geometry.mjs?v=39';
import {spatialHeightLayers} from './spatial-layers.mjs?v=39';
import {createSpatialPipeDrawing,renderSpatialWorkDrawing} from './spatial-drawing.mjs?v=39';
import {setIconButton} from './ui-icons.mjs?v=39';
const $=id=>document.getElementById(id),fmt=n=>Number.isFinite(n)?n.toLocaleString(locales[language],{maximumFractionDigits:getBender(state.benderId)?.nativeUnits==='in'?3:1}):'—';
function newDrawingNumber(){const d=new Date(),date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('');return 'PB-'+date+'-'+crypto.randomUUID().slice(0,6).toUpperCase();}
function normalizeProject(s){const name=s.name.trim()||t('Mit første rør');return {...s,projectId:isProjectId(s.projectId)?s.projectId:crypto.randomUUID(),name,configured:s.configured!==false,drawingNumber:s.drawingNumber?.trim()||name};}
let triangleRotation=0,triangleMirror=false,editing=null,offsetRotation=0,offsetMirror=false,pipeSettingsMode='new';
let bendDirection='horizontal',pipeView='plan',selectedPipeItem=null,workView='auto',workViewProject=null,workLayer='all',labelMode='all';
const pipeGeometry=project=>hasSpatialPipe(project)?geometry3D(project):geometry(project);
let state={version:1,projectId:crypto.randomUUID(),configured:false,name:t('Mit første rør'),drawingNumber:newDrawingNumber(),stock:6000,diameter:12,wall:1.5,radius:38,benderId:'swagelok-ms-htb-12m',measurementMode:'vertex',heading:0,lengths:[],turns:[]},end='B',sign=1,history=[],storageOK=true;
function valid(s){return s&&s.version===1&&typeof s.name==='string'&&s.name.length<=80&&(s.projectId===undefined||isProjectId(s.projectId))&&(s.drawingNumber===undefined||(typeof s.drawingNumber==='string'&&s.drawingNumber.trim().length>0&&s.drawingNumber.length<=80))&&['stock','diameter','wall','radius','heading'].every(k=>typeof s[k]==='number'&&Number.isFinite(s[k]))&&s.stock>0&&s.diameter>0&&s.wall>0&&s.wall<s.diameter/2&&s.radius>s.diameter/2&&Array.isArray(s.lengths)&&s.lengths.length<=200&&s.lengths.every(v=>Number.isFinite(v)&&v>0)&&Array.isArray(s.turns)&&s.turns.length===Math.max(0,s.lengths.length-1)&&s.turns.every(v=>Number.isFinite(v)&&Math.abs(v)>0&&Math.abs(v)<=179)&&(s.measurementMode===undefined||['tangent','vertex'].includes(s.measurementMode))&&(s.benderId===undefined||s.benderId===null||typeof s.benderId==='string')&&!validateMeasurements(s)&&!validateSpatialState(s);}
let bootEmbeddedDraft=null;
try{const s=JSON.parse(localStorage.getItem('pipe-bend-v1'));if(valid(s)){state=normalizeProject(s);bootEmbeddedDraft=s.wallDraft??null;}}catch{}
// Persist the project identity before any wall draft is created, including
// the first session and migration of a legacy project without an ID.
save();
function sync(){
 for(const k of ['name','stock','diameter','wall','radius'])$(k).value=state[k];
 $('drawing-number').value=state.drawingNumber||state.name;
 if($('bender-select')){$('bender-select').value=state.benderId||'';$('measurement-mode').value=measurementMode(state);updateBenderFields();}
}
function save(){try{localStorage.setItem('pipe-bend-v1',JSON.stringify(state));}catch{storageOK=false;}}
function commit(n,roomApplied=false,replacingProject=false){
 const error=validateMeasurements(n)||validateSpatialState(n);if(error)throw new RangeError(error);
 if(n.planner){
  if(hasSpatialPipe(n))n.planner={...n.planner,routeEdited:true};
  else{
   const geo=geometry(measurementMode(n)==='vertex'?n:convertMeasurementMode(n,'vertex'));
   const changed=!replacingProject&&!!state.planner&&!roomApplied&&JSON.stringify([state.lengths,state.turns,state.radius,state.diameter,state.heading,state.measurementMode,state.bendRotations,state.startFrame])!==JSON.stringify([n.lengths,n.turns,n.radius,n.diameter,n.heading,n.measurementMode,n.bendRotations,n.startFrame]);
   const start=n.placement?.start||n.planner.points?.[0]||[0,0],points=[geo.lines[0]?.dimensionStart||geo.start,...geo.lines.map(line=>line.dimensionEnd||line.end)].map(p=>[p[0]+start[0],p[1]+start[1]]);
   n.planner={...n.planner,routeEdited:roomApplied?false:(changed||!!n.planner.routeEdited),points,input:{...n.planner.input,diameter:n.diameter,radius:n.radius}};
  }
 }
 if(n.projectId!==state.projectId)selectedPipeItem=null;history.push(structuredClone(state));state=n;save();sync();render();
}
let orientationState=null,orientationEnd=null,orientationCache=new Map();
function orientationFor(direction){if(orientationState!==state||orientationEnd!==end){orientationState=state;orientationEnd=end;orientationCache=new Map();}if(!orientationCache.has(direction))orientationCache.set(direction,bendOrientation(state,end,direction));return orientationCache.get(direction);}
function nextOrientation(){
 if(bendDirection==='custom')return {available:Number.isFinite(Number($('bend-rotation').value)),turnSign:sign,rotation:Number($('bend-rotation').value)};
 return orientationFor(bendDirection==='horizontal'?(sign>0?'left':'right'):bendDirection);
}
function params(){
 const orientation=nextOrientation();return{length:Number($('length').value)*Number($('unit').value),turn:Number($('angle').value)*(orientation.turnSign??sign),rotation:orientation.rotation??0,available:orientation.available};
}
function extendCurrent(p){
 // Keep the old representation byte-for-byte for an ordinary planar pipe.
 return state.bendRotations!==undefined||state.startFrame!==undefined||Math.abs(p.rotation)>1e-8?extendSpatial(state,end,p.length,p.turn,p.rotation):extend(state,end,p.length,p.turn);
}
function ready(){const p=params();return Number.isFinite(p.length)&&p.length>0&&(!state.lengths.length||(p.available&&Number.isFinite(p.rotation)&&Math.abs(p.rotation)<=180&&Number.isFinite(p.turn)&&Math.abs(p.turn)>0&&Math.abs(p.turn)<=179));}
function refreshSpatialControls(g){
 const has=state.lengths.length>0,spatial=hasSpatialPipe(state);
 $('spatial-bend-controls').hidden=!has;$('spatial-views').hidden=!has;$('drawing-label-control').hidden=!has||(!spatial&&pipeView==='plan');$('drawing-label-mode').value=labelMode;
 if(spatial&&pipeView==='plan')pipeView='top';
 $('spatial-view-select').value=pipeView;$('spatial-orbit').hidden=pipeView!=='iso';setIconButton($('spatial-orbit'),'rotate',t('Drej 3D-visning'),{pressed:spatialPipeDrawing.getOrbitMode()});$('spatial-view-select').querySelector('option[value="plan"]').disabled=spatial;
 for(const [id,dir,icon,label]of [['bend-horizontal','horizontal','horizontal','Vandret buk'],['bend-up','up','bend-up','Buk op'],['bend-down','down','bend-down','Buk ned'],['bend-forward','forward','horizontal','Buk frem'],['bend-back','back','back','Buk tilbage']]){
  const direction=dir==='horizontal'?(sign>0?'left':'right'):dir,available=orientationFor(direction).available;
  setIconButton($(id),icon,t(label),{pressed:bendDirection===dir});$(id).disabled=has&&!available;
  if(dir==='forward'||dir==='back')$(id).hidden=!has||!available;
 }
 const names={horizontal:sign>0?'Venstre':'Højre',up:'Op',down:'Ned',forward:'Frem',back:'Tilbage',custom:'Drejning'};
 const p=params();$('next-bend-direction').textContent=t(names[bendDirection])+(bendDirection==='custom'?' '+fmt(p.rotation)+'°':'');
 if(bendDirection!=='custom')$('bend-rotation').value=String(p.rotation);
 $('spatial-height-range').textContent='';
 if(spatial){const z=g.points.map(p=>p[2]),lo=Math.min(...z),hi=Math.max(...z),height=v=>(v>1e-7?'+':'')+fmt(Math.abs(v)<1e-7?0:v);$('spatial-height-range').textContent='H '+height(lo)+' … '+height(hi)+' mm';}
}
function bendLabel(arc){
 if(!arc.tangent)return t(arc.turn>0?'Venstre':'Højre');
 const p=arc.samples,dy=p.at(-1)[2]-p[0][2];
 return Math.abs(dy)>1e-7?t(dy>0?'Op':'Ned'):t('Vandret');
}
function rotationLabel(rotation){return (rotation>1e-7?'+':'')+fmt(Math.abs(rotation)<1e-7?0:rotation)+'°';}
function refreshActionIcons(){
 for(const [id,name,label]of [
  ['triangle-rotate','rotate','Drej 90°'],['triangle-reset','reset','Nulstil retning'],
  ['offset-rotate','rotate','Drej 90°'],['offset-reset','reset','Nulstil retning'],
  ['zoom-fit','fit','Tilpas visning'],['work-open','worksheet','Arbejdsvisning'],
  ['work-close','back','Tilbage til redigering'],['undo','undo','Fortryd'],['reset','new','Nyt rør'],
  ['calculator-open','calculator','Lommeregner'],['pyth-info','info','Info om Pythagoras'],['offset-info','info','Info om forskydning'],
 ])setIconButton($(id),name,t(label));
 setIconButton($('mirror'),sign>0?'bend-left':'bend-right',t('Spejlvend buk · {direction}',{direction:t(sign>0?'Venstre':'Højre')}),{pressed:sign<0&&bendDirection==='horizontal'});
 setIconButton($('triangle-mirror'),'mirror',t('Spejlvend'),{pressed:triangleMirror});
 setIconButton($('offset-mirror'),'mirror',t('Spejlvend'),{pressed:offsetMirror});
 setIconButton($('drawing-help').querySelector('summary'),'info',t('Info om tegningen'));
 $('triangle-reset').disabled=triangleRotation===0&&!triangleMirror;$('offset-reset').disabled=offsetRotation===0&&!offsetMirror;
}

function render(){
 const g=pipeGeometry(state),has=state.lengths.length>0,marks=bendMarkLayout(state,getBender(state.benderId)),material=marks.supported&&has?marks.endPosition:g.used,left=state.stock-material;
 $('empty').style.display=has?'none':'flex';$('drawing-reference-details').hidden=!has;$('drawing-title').textContent=state.name;$('bend-fields').hidden=!has;$('angle').disabled=!has;
 $('editor-title').textContent=has?t('Fortsæt fra ende ')+end:t('Start med første stykke');
 $('add').textContent=!state.configured?t('Opret rør'):has?t('Tilføj buk & stykke'):t('Tilføj første stykke');
 refreshActionIcons();refreshSpatialControls(g);$('undo').disabled=!history.length;
 $('remaining').innerHTML=fmt(left)+' <small>mm</small>';$('remaining').style.color=left<0?'#b64235':'';
 $('used').textContent=fmt(material)+' mm · '+t(marks.supported&&has?'Kaplængde efter værktøjstabel':'Geometrisk rørlængde');$('total').textContent=t('af ')+fmt(state.stock)+' mm';$('progress').max=state.stock;$('progress').value=material;
 $('material-status').textContent=left<0?t('Røret er ')+fmt(-left)+t(' mm for kort'):g.arcs.length+t(' buk · buelængder medregnet');
 let preview=null,previewError='';if(has&&ready()){const next=extendCurrent(params());previewError=validateMeasurements(next)||validateSpatialState(next)||'';if(!previewError)preview=pipeGeometry(next);}
 $('error').textContent=!storageOK?t('Automatisk lagring er utilgængelig. Gem projektet som fil.'):has&&!params().available?t('Vælg en anden bukkeretning. Røret peger allerede i denne retning.'):t(previewError);
 $('add').disabled=state.configured&&(!ready()||!!previewError);
 $('room-plan-status').textContent=state.planner&&hasSpatialPipe(state)?t('Vægkontrol: højdeskift ikke kontrolleret'):state.planner?.routeEdited?t('Vægkontrol: kræver ny kontrol'):'';
 $('drawing-mode').textContent=t(measurementMode(state)==='vertex'?'Mål til centerlinjehjørner':'Lige længder mellem tangentpunkter')+(getBender(state.benderId)?' · '+getBender(state.benderId).model:'');
 $('length-label').textContent=t(measurementMode(state)==='vertex'?'Færdigmål':'Lige stykke');
 renderBenderMarks($('live-marks'),state,g);draw(g,preview);updateTools();
}

// Native disclosure controls keep explanations available without occupying
// the drawing or calculation flow. Close them before another action begins.
document.addEventListener('pointerdown',event=>{for(const help of document.querySelectorAll('details.inline-help'))if(help.open&&!help.contains(event.target))help.open=false;});
document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const opened=[...document.querySelectorAll('details.inline-help')].filter(help=>help.open);if(!opened.length)return;const focused=opened.find(help=>help.contains(document.activeElement));for(const help of opened)help.open=false;event.preventDefault();event.stopPropagation();focused?.querySelector('summary')?.focus({preventScroll:true});},true);

const mainPipeDrawing=createMainPipeDrawing({svg:$('drawing'),zoomIn:$('zoom-in'),zoomOut:$('zoom-out'),fit:$('zoom-fit'),output:$('zoom-level'),format:n=>fmt(n),translate:t,onEdit:openEdit,onEndpoint:label=>{end=label;render();$('angle').scrollIntoView({behavior:'smooth',block:'center'});$('angle').focus({preventScroll:true});}});

const spatialPipeDrawing=createSpatialPipeDrawing({onSelect:(type,index)=>{selectedPipeItem=type?{type,index}:null;render();},svg:$('spatial-drawing'),zoomIn:$('zoom-in'),zoomOut:$('zoom-out'),fit:$('zoom-fit'),output:$('zoom-level'),format:n=>fmt(n),translate:t,onEdit:openEdit,onEndpoint:label=>{end=label;render();$('angle').scrollIntoView({behavior:'smooth',block:'center'});$('angle').focus({preventScroll:true});},onPick:hits=>{
 const list=$('spatial-pick-options');list.replaceChildren();
 for(const hit of hits){const type=hit.type==='angle'?'angle':'length',index=hit.index,button=document.createElement('button');button.type='button';const geo=geometry3D(state),line=geo.lines[index];button.textContent=type==='length'?'L'+(index+1)+' · '+fmt(line.dimension)+' mm · H '+fmt(line.start[2])+' → '+fmt(line.end[2])+' mm':'B'+(index+1)+' · '+fmt(Math.abs(state.turns[index]))+'°';button.onclick=()=>{$('spatial-pick-dialog').close();if(labelMode==='tap'){selectedPipeItem={type,index};render();}else openEdit(type,index);};list.append(button);}
 $('spatial-pick-dialog').showModal();list.querySelector('button')?.focus();
}});
$('spatial-pick-close').onclick=()=>$('spatial-pick-dialog').close();
$('spatial-view-select').onchange=()=>{pipeView=$('spatial-view-select').value;if(pipeView==='iso')spatialPipeDrawing.setOrbitMode(true);mainPipeDrawing.reset();spatialPipeDrawing.reset();render();};
$('spatial-orbit').onclick=()=>{spatialPipeDrawing.setOrbitMode(!spatialPipeDrawing.getOrbitMode());render();};
for(const [id,direction]of [['bend-horizontal','horizontal'],['bend-up','up'],['bend-down','down'],['bend-forward','forward'],['bend-back','back']])$(id).onclick=()=>{bendDirection=direction;render();};
$('bend-rotation').oninput=()=>{bendDirection='custom';render();};

function draw(g,preview,target=$('drawing'),work=false){
 if(!work){
  const spatial=hasSpatialPipe(state)||pipeView!=='plan';if(spatial){$('drawing').setAttribute('hidden','');$('spatial-drawing').removeAttribute('hidden');}else{$('drawing').removeAttribute('hidden');$('spatial-drawing').setAttribute('hidden','');}
  if(spatial){const geo=geometry3D(state);let next=null;if(preview&&ready())next=geometry3D(extendCurrent(params()));spatialPipeDrawing.draw(geo,next,{diameter:state.diameter,radius:state.radius,end,view:pipeView==='plan'?'top':pipeView,selected:selectedPipeItem,labelMode});}
  else mainPipeDrawing.draw(g,preview,{diameter:state.diameter,radius:state.radius,end});
  if($('drawing-references'))renderReferences(g,$('drawing-references'));return;
 }
 const chosenWorkView=workView==='auto'?(hasSpatialPipe(state)?'iso':'plan'):workView;
 if(chosenWorkView!=='plan'){renderSpatialWorkDrawing(target,geometry3D(state),{diameter:state.diameter,radius:state.radius,format:fmt,translate:t,view:chosenWorkView,layerHeight:chosenWorkView==='top'&&workLayer!=='all'?Number(workLayer):null,labelMode,selected:selectedPipeItem,onSelect:(type,index)=>{selectedPipeItem=type?{type,index}:null;renderWork();}});return;}
 const svg=target;svg.onclick=null;svg.replaceChildren();for(const name of ['data-spatial-work','data-spatial-work-view','data-spatial-work-layer','data-spatial-label-mode','data-label-mode','data-spatial-eligible-lines','data-spatial-eligible-lengths','data-spatial-eligible-bends','data-spatial-placed-labels','data-spatial-total-labels'])svg.removeAttribute(name);
 const width=work?900:Math.max(280,svg.clientWidth||900),pageHeight=work?1200:Math.max(430,Math.min(540,width*.65));
 if(!work)svg.setAttribute('height',String(pageHeight));
 const setBounds=()=>svg.setAttribute('viewBox',`0 0 ${width} ${pageHeight}`);
 if(!g.lines.length){setBounds();if(!work&&$('drawing-references'))renderReferences(g,$('drawing-references'));return;}
 const plotWidth=width-(work?150:112),plotHeight=pageHeight-(work?150:112),angle=bestDrawingAngle(g.points,plotWidth,plotHeight),c=Math.cos(angle),sn=Math.sin(angle),rotate=p=>[p[0]*c-p[1]*sn,p[0]*sn+p[1]*c],rotated=g.points.map(rotate),xs=rotated.map(p=>p[0]),ys=rotated.map(p=>p[1]),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys),scale=Math.min(plotWidth/Math.max(1,maxx-minx),plotHeight/Math.max(1,maxy-miny));
 const P=p=>{const q=rotate(p);return[width/2+(q[0]-(minx+maxx)/2)*scale,pageHeight/2-(q[1]-(miny+maxy)/2)*scale];};
 function el(tag,attrs,parent=svg){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;}
 const pipes=el('g',{'data-layer':'pipe'}),leaders=el('g',{'data-layer':'leaders'}),labels=el('g',{'data-layer':'labels'}),ends=el('g',{'data-layer':'endpoints'});
 function path(geo,attrs,delta=[0,0]){let d='';const pp=p=>P([p[0]+delta[0],p[1]+delta[1]]).join(',');geo.lines.forEach((l,i)=>{if(!i)d+='M'+pp(l.start);d+='L'+pp(l.end);if(geo.arcs[i])for(const p of geo.arcs[i].samples)d+='L'+pp(p);});el('path',{d,fill:'none','stroke-linecap':'round','stroke-linejoin':'round',...attrs},pipes);}
 if(preview){let shift=[0,0];if(end==='A'){const p=preview.lines[1].start;shift=[-p[0],-p[1]];}path(preview,{stroke:'#97c6b0','stroke-width':2,'stroke-dasharray':'8 8',opacity:.6},shift);}
 path(g,{stroke:'#9db6ab','stroke-width':14});path(g,{stroke:'#deeee7','stroke-width':9});path(g,{stroke:'#487b69','stroke-width':1,'stroke-dasharray':'4 5'});
 if(!work)for(let index=0;index<g.lines.length;index++){const a=P(g.lines[index].start),b=P(g.lines[index].end);el('line',{'data-length-id':'L'+(index+1),class:'reference-path',x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'#278f70','stroke-width':20,'stroke-linecap':'round','pointer-events':'none',opacity:0},pipes);}
 const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
 const footprint=(a,b,padding=8)=>{const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len*padding,ny=dx/len*padding;return[[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]];};
 const pipe=[];
 for(const line of g.lines)pipe.push({polygon:footprint(P(line.start),P(line.end))});
 for(let index=0;index<g.arcs.length;index++){const arc=g.arcs[index];for(let j=0;j<arc.samples.length-1;j+=4)pipe.push({index,polygon:footprint(P(arc.samples[j]),P(arc.samples[Math.min(j+4,arc.samples.length-1)]))});}
 const endpointObstacles=[P(g.start),P(g.end)].map(p=>rect(p[0]-23,p[1]-23,46,46));
 const layout=bendReferenceLayout(g.arcs,P,{width,height:pageHeight,fontSize:work?18:13,obstacles:endpointObstacles,pipe,maxLeader:28});
 const obstacles=[...pipe.map(p=>p.polygon),...endpointObstacles,...layout.labels.map(p=>p.polygon),...layout.labels.map(p=>footprint(...p.leader,2))];
 const fontSize=work?18:14,metrics=document.createElement('canvas').getContext('2d');metrics.font=`600 ${fontSize}px ${getComputedStyle(svg).fontFamily}`;
 const items=g.lines.map((line,index)=>{const a=P(line.start),b=P(line.end),text=fmt(line.dimension??line.length)+(work?' mm':'');return{id:'L'+(index+1),index,a,b,text,width:Math.ceil(metrics.measureText(text).width)+14,height:fontSize+10,angle:readableTextAngle(b[0]-a[0],b[1]-a[1])};});
 const crosses=(a,b,c,d)=>{const u=[b[0]-a[0],b[1]-a[1]],v=[d[0]-c[0],d[1]-c[1]],w=[c[0]-a[0],c[1]-a[1]],det=u[0]*v[1]-u[1]*v[0];if(Math.abs(det)<1e-8)return false;const t=(w[0]*v[1]-w[1]*v[0])/det,q=(w[0]*u[1]-w[1]*u[0])/det;return t>1e-5&&t<1-1e-5&&q>1e-5&&q<1-1e-5;};
 const hits=(a,b,polygon)=>{const inside=p=>{const signs=polygon.map((v,i)=>{const q=polygon[(i+1)%polygon.length];return(q[0]-v[0])*(p[1]-v[1])-(q[1]-v[1])*(p[0]-v[0]);});return signs.every(n=>n>=0)||signs.every(n=>n<=0);};return inside(a)||inside(b)||polygon.some((p,i)=>crosses(a,b,p,polygon[(i+1)%polygon.length]));};
 const dimensionLeader=dim=>{const start=[(dim.a[0]+dim.b[0])/2,(dim.a[1]+dim.b[1])/2],dx=start[0]-dim.x,dy=start[1]-dim.y,angle=dim.angle*Math.PI/180,localX=dx*Math.cos(angle)+dy*Math.sin(angle),localY=-dx*Math.sin(angle)+dy*Math.cos(angle),factor=Math.min(1,dim.width/2/Math.max(1e-8,Math.abs(localX)),dim.height/2/Math.max(1e-8,Math.abs(localY)));return[start,[dim.x+dx*factor,dim.y+dy*factor]];};
 const dimensionFits=(maxLeader,maxDistance,prior=[])=>(dim,accepted)=>{
  if(dim.box.x<10||dim.box.y<10||dim.box.x+dim.box.w>width-10||dim.box.y+dim.box.h>pageHeight-10)return false;
  const [start,finish]=dimensionLeader(dim),length=Math.hypot(start[0]-finish[0],start[1]-finish[1]);
  if(length>maxLeader||Math.hypot(start[0]-dim.x,start[1]-dim.y)>maxDistance||leaderCrossesPipe(start,finish,pipe))return false;
  return !layout.labels.some(p=>hits(start,finish,p.polygon))&&![...prior,...accepted].some(p=>hits(start,finish,p.polygon)||crosses(start,finish,...dimensionLeader(p)))&&!layout.labels.some(p=>crosses(start,finish,...p.leader));
 };
 const dimensionBounds={x:12,y:12,w:width-24,h:pageHeight-24},dimensionFootprint=dim=>[footprint(...dimensionLeader(dim),2)];
 const primary=placeDimensionLabels(items,obstacles,dimensionBounds,{allowOmissions:true,acceptCandidate:dimensionFits(work?64:42,work?100:66),extraObstacles:dimensionFootprint}).map(dim=>({...dim,leader:dimensionLeader(dim)}));
 // Keep good local labels fixed, then give only the missing dimensions more
 // room. Every second-pass candidate still obeys bounds, pipe, label and
 // leader collision checks; the text is never dropped just for a short leg.
 const missing=items.filter(item=>!primary.some(dim=>dim.id===item.id));
 const secondary=placeDimensionLabels(missing,[...obstacles,...primary.map(dim=>dim.polygon),...primary.flatMap(dimensionFootprint)],dimensionBounds,{allowOmissions:true,localFallback:items.length<=60,acceptCandidate:dimensionFits(work?104:64,work?154:100,primary),extraObstacles:dimensionFootprint}).map(dim=>({...dim,leader:dimensionLeader(dim)}));
 const placed=[...primary,...secondary].sort((a,b)=>a.index-b.index);
 for(const dim of placed){
  const [a,b]=dim.leader;
  el('line',{'data-length-leader':dim.id,x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'#8ca697','stroke-width':1},leaders);
  const group=el('g',{'data-length':dim.id,transform:`translate(${dim.x} ${dim.y}) rotate(${dim.angle})`,class:'length-dimension'},labels);
  el('title',{},group).textContent=dim.id+' · '+dim.text+(work?'':' mm');
  el('rect',{x:-dim.width/2,y:-dim.height/2,width:dim.width,height:dim.height,rx:4,fill:'#ffffff'},group);
  el('text',{x:0,y:fontSize*.34,'text-anchor':'middle','font-family':'var(--app-font, sans-serif)','font-size':fontSize,'font-weight':600,fill:'#176748'},group).textContent=dim.text;
  if(!work){makeEditable(group,'length',dim.index);group.setAttribute('aria-label',dim.id+' · '+dim.text+' mm');}
 }
 // Tiny local references replace the former page-wide orange rails.
 for(const ref of layout.labels){
  const [a,b]=ref.leader;el('line',{'data-bend-leader':ref.id,x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'#bd763a','stroke-width':1},leaders);
  const badge=el('g',{'data-reference':ref.id,'data-bend-id':ref.id,class:'reference-badge'},labels);
  el('rect',{x:ref.labelX-ref.width/2,y:ref.labelY-ref.height/2,width:ref.width,height:ref.height,rx:ref.height/2,fill:'#fff4e8',stroke:'#ae5c15','stroke-width':1},badge);
  el('text',{x:ref.labelX,y:ref.labelY+ref.fontSize*.34,'font-family':'var(--app-font, sans-serif)','font-size':ref.fontSize,'font-weight':600,'text-anchor':'middle',fill:'#994c0c'},badge).textContent=ref.id;
  el('title',{},badge).textContent=ref.id+' · '+fmt(Math.abs(g.arcs[ref.index].turn))+'° · '+t(g.arcs[ref.index].turn>0?'Venstre':'Højre');
  if(!work)makeEditable(badge,'angle',ref.index);
 }
 for(const ref of layout.anchors){
  const anchor=el('g',{'data-bend-id':ref.id,'data-bend-anchor':ref.id,class:'bend-anchor'},labels);
  if(!work)el('circle',{cx:ref.x,cy:ref.y,r:10,fill:'transparent'},anchor);
  el('circle',{'data-bend':ref.id,cx:ref.x,cy:ref.y,r:2.5,fill:'#ae5c15',stroke:'white','stroke-width':1},anchor);
  el('title',{},anchor).textContent=ref.id+' · '+fmt(Math.abs(g.arcs[ref.index].turn))+'°';
  if(!work)makeEditable(anchor,'angle',ref.index);
 }
 for(const[label,p]of[['A',g.start],['B',g.end]]){
  const q=P(p),e=el('g',{class:'endpoint'},ends);el('circle',{cx:q[0],cy:q[1],r:23,fill:'transparent'},e);el('circle',{cx:q[0],cy:q[1],r:16,fill:label===end?'#16815d':'#183c36',stroke:'white','stroke-width':3},e);el('text',{x:q[0],y:q[1]+5,fill:'white','font-size':14,'font-weight':700,'text-anchor':'middle'},e).textContent=label;
  if(work)continue;e.setAttribute('role','button');e.setAttribute('tabindex','0');e.setAttribute('aria-label',t('Tilføj buk ved ende ')+label);const select=()=>{end=label;render();$('angle').scrollIntoView({behavior:'smooth',block:'center'});$('angle').focus({preventScroll:true});};e.onclick=select;e.onkeydown=k=>{if(k.key==='Enter'||k.key===' '){k.preventDefault();select();}};
 }
 svg.setAttribute('data-inline-bends',String(layout.labels.length));svg.setAttribute('data-total-bends',String(g.arcs.length));
 setBounds();if(!work&&$('drawing-references'))renderReferences(g,$('drawing-references'));
}

function renderReferences(g,container,work=false){
 container.replaceChildren();
 function highlight(id){for(const selector of ['[data-bend-id]','[data-length-id]'])for(const node of $('drawing').querySelectorAll(selector))node.classList.toggle('reference-selected',(node.getAttribute('data-bend-id')||node.getAttribute('data-length-id'))===id);}
 for(const type of ['length','angle']){
  const col=document.createElement('section'),heading=document.createElement('h3');heading.textContent=t(type==='length'?'Længder':'Bukkevinkler');col.append(heading);
  const list=type==='length'?g.lines:g.arcs;
  for(let i=0;i<list.length;i++){
   const item=list[i],row=document.createElement(work?'div':'button');row.className='reference-row';
   const id=(type==='length'?'L':'B')+(i+1),ref=document.createElement('strong'),value=document.createElement('span');ref.className=type==='angle'?'bend-ref':'length-ref';ref.textContent=id;value.textContent=type==='length'?fmt(item.dimension??item.length)+' mm':fmt(Math.abs(item.turn))+'° · '+bendLabel(item);row.append(ref,value);row.setAttribute('data-reference-row',id);if(type==='length'&&hasSpatialPipe(state))value.textContent+=' · H '+fmt(item.dimensionStart[2])+' → '+fmt(item.dimensionEnd[2])+' mm';
   if(!work){row.type='button';row.setAttribute('aria-label',id+' · '+value.textContent);row.onfocus=()=>highlight(id);row.onmouseenter=()=>highlight(id);row.onclick=()=>{highlight(id);openEdit(type,i);};}
   col.append(row);
  }
  container.append(col);
 }
 container.hidden=!g.lines.length;
 if(!work&&$('drawing-reference-details'))$('drawing-reference-details').hidden=!g.lines.length;
}

function initBenderChoices(){
 const select=$('bender-select');
 for(const units of ['mm','in']){const group=document.createElement('optgroup');group.label=units==='mm'?'Swagelok · mm':'Swagelok · inch';for(const bender of SWAGELOK_BENDERS.filter(item=>item.nativeUnits===units)){const option=document.createElement('option');option.value=bender.id;option.textContent=bender.label;group.append(option);}select.append(group);}
 select.onchange=()=>{const bender=getBender(select.value);if(bender){$('diameter').value=bender.tubeODmm;$('radius').value=bender.radiusMm;if(Number($('wall').value)>=bender.tubeODmm/2)$('wall').value='0.8';}updateBenderFields();};
 $('measurement-mode').onchange=updateBenderFields;
}
function updateBenderFields(){
 const bender=getBender($('bender-select').value);
 $('diameter').disabled=!!bender;$('radius').disabled=!!bender;
 $('bender-info').textContent=bender?bender.model+' · Ø'+fmt(bender.tubeODmm)+' mm · R'+fmt(bender.radiusMm)+' mm. '+t('Afsætningsfradrag følger producentens tabel.'):t('Angiv rørdiameter og centerlinjeradius. Der vises geometriske mål uden værktøjstabel.');
 $('measurement-help').textContent=t($('measurement-mode').value==='vertex'?'Mål til de tænkte hjørner på rørets centerlinjer. Radius omregnes automatisk til de lige stykker.':'Mål kun det lige rør mellem buernes tangentpunkter. Skift af måltype omregner eksisterende mål og bevarer rørets form.');
 $('bender-source').hidden=!bender;if(bender)$('bender-source').href=bender.source.url+'#page=23';
}
function renderBenderMarks(container,project,g){
 container.replaceChildren();const bender=getBender(project.benderId),report=bendMarkLayout(project,bender),has=project.lengths.length>0;
 if(container.id==='live-marks'){$('bender-marks').hidden=!has;if(has&&bender&&!report.supported)$('bender-marks').open=true;}
 if(!has)return;
 const heading=document.createElement('h3');heading.textContent=t('Afsætningsmål på stangen');if(container.id==='work-marks')container.append(heading);
 const info=document.createElement('p');info.className='hint';
 if(!bender){info.textContent=t('Vælg en bukker under Rørindstillinger for at få afsætningsmærker efter værktøjstabel.');container.append(info);return;}
 info.textContent=bender.model+' · Ø'+fmt(bender.tubeODmm)+' mm · R'+fmt(bender.radiusMm)+' mm';container.append(info);
 if(!report.supported){const error=document.createElement('p');error.className='mark-unavailable';error.textContent=t('Ingen afsætningstabel for denne opsætning.')+' '+(report.error||report.reason);container.append(error);return;}
 const table=document.createElement('table'),head=document.createElement('thead'),header=document.createElement('tr'),body=document.createElement('tbody');table.className='mark-table';
 const spatial=hasSpatialPipe(project),rolls=spatial?spatialBendRotations(project):[];
 for(const [label,title]of [['Buk','Buk'],['Vinkel','Vinkel'],...(spatial?[['Drejning','Drejning omkring røret · °']]:[]),['Fradrag','Fradrag fra forrige buk'],['Fra sidste','Fra forrige mærke'],['Fra A','Mærke fra A']]){const th=document.createElement('th');th.textContent=t(label);th.setAttribute('aria-label',t(title));th.setAttribute('title',t(title));header.append(th);}head.append(header);table.append(head,body);
 const displayed=roundDisplayedMarks(report,{digits:bender.nativeUnits==='in'?3:1});
 if(!displayed.ok){const error=document.createElement('p');error.className='mark-unavailable';error.textContent=t('Afsætningsmålene kunne ikke afrundes sikkert.');container.append(error);return;}
 for(const mark of displayed.marks){const row=document.createElement('tr');for(const value of [mark.id,fmt(Math.abs(mark.angle))+'°',...(spatial?[rotationLabel(rolls[mark.index].rotation)]:[]),fmt(mark.gainApplied)+' mm',fmt(mark.displayedInterval)+' mm',fmt(mark.displayedPosition)+' mm']){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}body.append(row);}
 const endRow=document.createElement('tr');for(const value of [t('Rørslut'),'—',...(spatial?['—']:[]),report.gains.length?fmt(report.gains.at(-1))+' mm':'—',fmt(displayed.displayedEndInterval)+' mm',fmt(displayed.displayedEndPosition)+' mm']){const cell=document.createElement('td');cell.textContent=value;endRow.append(cell);}body.append(endRow);
 const scroll=document.createElement('div');scroll.className='mark-table-wrap';scroll.append(table);container.append(scroll);
 const help=document.createElement('details'),helpSummary=document.createElement('summary'),helpBody=document.createElement('div'),toolRow=document.createElement('div');help.id=container.id==='live-marks'?'live-mark-help':'work-mark-help';help.className='mark-help inline-help';helpBody.className='help-panel';setIconButton(helpSummary,'info',t('Om afsætningsmål'));help.append(helpSummary,helpBody);toolRow.className='mark-heading';container.insertBefore(toolRow,info);toolRow.append(info);
 const explanation=document.createElement('p');explanation.className='hint';explanation.textContent=t('Fra forrige mærke viser målet fra sidste mærke; første mål er fra ende A. Mærke fra A viser det samlede mål. Værktøjets fradrag er allerede indregnet.');helpBody.append(explanation);
 const roundingNote=document.createElement('p');roundingNote.className='hint';roundingNote.textContent=t('Delmålene beregnes fra de afrundede mærker fra A, så de stemmer med kaplængden.');helpBody.append(roundingNote);
 if(displayed.precisionLimited){if(container.id==='live-marks')$('bender-marks').open=true;const warning=document.createElement('p');warning.className='mark-unavailable';warning.textContent=t('Et delmål er mindre end visningens præcision. Brug de samlede mærker fra A.');container.append(warning);}
 const totals=document.createElement('div');totals.className='mark-totals';for(const [label,value,full]of [['Kaplængde',report.endPosition,'Kaplængde efter værktøjstabel'],['Geometrisk længde',g.used,'Geometrisk centerlinjelængde']]){const stat=document.createElement('div'),title=document.createElement('span'),number=document.createElement('strong');title.textContent=t(label);title.setAttribute('title',t(full));number.textContent=fmt(value)+' mm';stat.append(title,number);totals.append(stat);}container.append(totals);
 const note=document.createElement('p');note.className='hint';note.textContent=t('Værktøjstabellens kaplængde og den ideelle centerlinjelængde er forskellige beregningsmetoder. Brug kaplængden sammen med den valgte bukkers afsætningsmetode.');helpBody.append(note);
 const source=document.createElement('a');source.href=bender.source.url+'#page=23';source.target='_blank';source.rel='noopener noreferrer';source.textContent=t('Producentens tabel og mærkereference')+' · MS-13-43, '+bender.source.revision;helpBody.append(source);container.append(help);
}

$('add-form').onsubmit=e=>{e.preventDefault();if(!state.configured){openPipeSettings('new');return;}if(!ready())return;if(state.lengths.length>=200){alert(t('Maks. 200 stykker pr. projekt.'));return;}const next=extendCurrent(params()),error=validateMeasurements(next)||validateSpatialState(next);if(error){$('error').textContent=t(error);return;}if(bendDirection!=='custom'&&!bendOrientation(next,end,bendDirection==='horizontal'?(sign>0?'left':'right'):bendDirection).available)bendDirection=bendOrientation(next,end,'forward').available?'forward':'horizontal';commit(next);};$('mirror').onclick=()=>{sign*=-1;bendDirection='horizontal';render();};for(const k of['length','angle','unit'])$(k).oninput=render;$('undo').onclick=()=>{if(history.length){state=history.pop();save();sync();render();}};$('reset').onclick=()=>openPipeSettings('new');

let py=NaN,off=NaN;function updateTools(){py=triangle($('solve').value,+$('p1').value,+$('p2').value);$('pyth-result').textContent=fmt(py)+' mm';$('use-pyth').disabled=!Number.isFinite(py)||py<=0;$('pyth-angle').textContent=Number.isFinite(py)?'':t('Hypotenusen skal være større end den kendte katete.');$('pyth-angle').hidden=Number.isFinite(py);drawTriangle();const displacement=Number($('offset').value),bendAngle=Number($('offset-angle').value),factor=Number($('offset-factor').value),offsetUnit=$('offset-unit').value;
 off=bendAngle>0&&bendAngle<=90?practicalOffsetLength(displacement,factor):NaN;
 const formatOffset=n=>Number.isFinite(n)?n.toLocaleString(locales[language],{maximumFractionDigits:3}):'—';
 $('offset-result').textContent=formatOffset(off)+' '+offsetUnit;
 $('offset-formula').textContent=Number.isFinite(off)?'':t('Kontrollér forskydning, vinkel og faktor.');$('offset-formula').hidden=Number.isFinite(off);
 renderOffsetVisualization($('offset-svg'),{offset:displacement,angle:bendAngle,length:off,factor,unit:offsetUnit,rotation:offsetRotation,mirror:offsetMirror},t,formatOffset);
 refreshActionIcons();}$('solve').onchange=()=>{const m=$('solve').value;$('p1-label').firstChild.textContent=(m==='a'?'b':'a')+' · mm';$('p2-label').firstChild.textContent=(m==='c'?'b':'c')+' · mm';updateTools();};for(const k of['p1','p2','offset','offset-factor'])$(k).oninput=updateTools;$('offset-angle').oninput=()=>{const a=Number($('offset-angle').value);if(a>0&&a<=90)$('offset-factor').value=a===45?'1.4':String(Number((1/Math.sin(a*Math.PI/180)).toFixed(3)));updateTools();};let currentOffsetUnit='cm';$('offset-unit').onchange=()=>{const next=$('offset-unit').value;if(next!==currentOffsetUnit){$('offset').value=String(Number($('offset').value)*(next==='mm'?10:.1));currentOffsetUnit=next;}updateTools();};function use(v){$('length').value=Math.round(v*1000)/1000;$('unit').value='1';render();$('length').scrollIntoView({behavior:'smooth',block:'center'});$('length').focus({preventScroll:true});}$('use-pyth').onclick=()=>use(py);
const MAX_PROJECT_FILE_BYTES=2*1024*1024;
$('export').onclick=()=>{
 try{
  const project={...state};delete project.wallDraft;
  const draft=roomPlanner.exportDraft();if(draft)project.wallDraft=draft;
  const blob=new Blob([JSON.stringify(project,null,2)],{type:'application/json'});
  if(blob.size>MAX_PROJECT_FILE_BYTES)throw new RangeError('Project file too large');
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;
  a.download=(state.name.replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g,'_')||'pipe-bend')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch{alert(t('Projektet kunne ikke gemmes som fil. Kontrollér vægudkastet, og prøv igen.'));}
};
$('import').onclick=()=>$('file').click();
$('file').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;
 try{
  if(file.size>MAX_PROJECT_FILE_BYTES)throw new RangeError('Project file too large');
  const document=JSON.parse(await file.text());
  if(!document||typeof document!=='object'||Array.isArray(document))throw new TypeError('Invalid project');
  const {wallDraft,...rawProject}=document;
  if(!valid(rawProject))throw new TypeError('Invalid project');
  const next=normalizeProject(rawProject);if(!valid(next))throw new TypeError('Invalid project');
  const draft=wallDraft===undefined||wallDraft===null?null:roomPlanner.validateDraft(wallDraft);
  if(draft?.error){const error=new TypeError('Invalid wall draft');error.wallDraft=true;throw error;}
  const shape=pipeGeometry(next);if(!Number.isFinite(shape.used)||!shape.points.every(point=>point.every(Number.isFinite)))throw new TypeError('Invalid project geometry');
  let hasDraft=false;try{hasDraft=!!roomPlanner.exportDraft();}catch{hasDraft=true;}
  if((state.lengths.length||hasDraft)&&!confirm(t('Erstat det åbne projekt med filen?')))return;
  const wasOpen=roomPlanner.isOpen();try{roomPlanner.setDraft(next,draft);}catch{const error=new Error('Project storage unavailable');error.importWrite=true;throw error;}
  commit(next,false,true);if(wasOpen)roomPlanner.open();
 }catch(error){alert(t(error?.wallDraft?'Vægudkastet i filen er ugyldigt. Det åbne projekt er bevaret.':error?.importWrite?'Projektet kunne ikke indlæses. Det åbne projekt er bevaret. Kontrollér browserens lagring, og prøv igen.':'Filen er ikke et gyldigt Pipe-bend-projekt.'));}
 finally{event.target.value='';}
};
$('print').onclick=()=>{renderWork();window.print();};
let calc=NaN;function calcUpdate(){try{calc=calculate($('expression').value);$('calc-result').textContent=fmt(calc);}catch{calc=NaN;$('calc-result').textContent=$('expression').value?t('Kontrollér regnestykket'):'0';}$('use-calc').disabled=!Number.isFinite(calc)||calc<=0;}for(const k of['7','8','9','÷','4','5','6','×','1','2','3','−','0',',','⌫','+','(',')','C','=']){const b=document.createElement('button');b.textContent=k;b.onclick=()=>{const f=$('expression');if(k==='C')f.value='';else if(k==='⌫')f.value=f.value.slice(0,-1);else if(k!=='=')f.value+=k==='−'?'-':k;calcUpdate();};$('keys').append(b);}$('expression').oninput=calcUpdate;$('calculator-open').onclick=()=>{$('calculator').showModal();calcUpdate();};$('use-calc').onclick=()=>{if(Number.isFinite(calc)&&calc>0){$('calculator').close();use(calc);}};let installPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});$('install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;}else $('install-help').showModal();};if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{$('error').textContent=t('Offlinefunktionen kræver HTTPS eller localhost.');});initBenderChoices();initAppSharing();captureTranslations();applyLanguage(language);$('language').value=language;sync();render();

function drawTriangle(){
 const svg=$('triangle-svg'),mode=$('solve').value,p=+$('p1').value,q=+$('p2').value;
 svg.replaceChildren();
 refreshActionIcons();if(!Number.isFinite(py)||py<=0){svg.setAttribute('hidden','');$('triangle-help').textContent=t('Indtast to gyldige sidelængder for at se trekanten.');$('triangle-help').hidden=false;return;}
 svg.removeAttribute('hidden');
 const sides=mode==='c'?{a:p,b:q,c:py}:mode==='a'?{a:py,b:p,c:q}:{a:p,b:py,c:q};
 const angle=triangleRotation*Math.PI/180;
 const rotate=([x,y])=>{x*=triangleMirror?-1:1;return[x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle)];};
 const raw=[[0,0],[sides.a,0],[0,-sides.b]].map(rotate);
 const xs=raw.map(p=>p[0]),ys=raw.map(p=>p[1]),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
 const scale=Math.min(240/Math.max(maxx-minx,1e-12),160/Math.max(maxy-miny,1e-12));
 const project=p=>[210+(p[0]-(minx+maxx)/2)*scale,120+(p[1]-(miny+maxy)/2)*scale];
 const [A,B,C]=raw.map(project),center=[(A[0]+B[0]+C[0])/3,(A[1]+B[1]+C[1])/3];
 function el(tag,attrs,text){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;svg.append(e);return e;}
 el('polygon',{points:[A,B,C].map(p=>p.join(',')).join(' '),fill:'#eaf5ef'});
 for(const [key,start,finish]of[['a',A,B],['b',A,C],['c',C,B]]){
  el('line',{x1:start[0],y1:start[1],x2:finish[0],y2:finish[1],stroke:key===mode?'#16815d':'#76988b','stroke-width':key===mode?4:2,'stroke-linecap':'round'});
  const dx=finish[0]-start[0],dy=finish[1]-start[1],len=Math.hypot(dx,dy)||1,mx=(start[0]+finish[0])/2,my=(start[1]+finish[1])/2;
  let nx=-dy/len,ny=dx/len;if(nx*(mx-center[0])+ny*(my-center[1])<0){nx=-nx;ny=-ny;}
  el('text',{x:mx+nx*30,y:my+ny*30,'text-anchor':'middle','dominant-baseline':'middle',fill:key===mode?'#16815d':'#274b44','font-size':14,'font-weight':key===mode?700:500},key+' = '+fmt(sides[key]));
 }
 const r=Math.min(14/scale,sides.a/3,sides.b/3),mark=[[0,-r],[r,-r],[r,0]].map(rotate).map(project);
 el('polyline',{points:mark.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#76988b','stroke-width':1.5});
 $('triangle-mirror').setAttribute('aria-pressed',String(triangleMirror));
 svg.setAttribute('aria-label',t('Retvinklet trekant: a {a} mm, b {b} mm, c {c} mm. Beregnet side {side}.',{a:fmt(sides.a),b:fmt(sides.b),c:fmt(sides.c),side:mode}));
 $('triangle-help').textContent='';$('triangle-help').hidden=true;
}
$('pyth-visual').addEventListener('toggle',()=>{$('pyth-visual').querySelector('summary').textContent=$('pyth-visual').open?t('Skjul trekant'):t('Vis trekant');});

$('triangle-rotate').onclick=()=>{triangleRotation=(triangleRotation+90)%360;drawTriangle();};
$('triangle-mirror').onclick=()=>{triangleMirror=!triangleMirror;drawTriangle();};
$('triangle-reset').onclick=()=>{triangleRotation=0;triangleMirror=false;drawTriangle();};

$('language').onchange=()=>{applyLanguage($('language').value);render();if(document.body.classList.contains('work-mode'))renderWork();$('pyth-visual').querySelector('summary').textContent=t($('pyth-visual').open?'Skjul trekant':'Vis trekant');$('offset-visual').querySelector('summary').textContent=t($('offset-visual').open?'Skjul forskydning':'Vis forskydning');if($('calculator').open)calcUpdate();updateBenderFields();roomPlanner.refresh();};

function makeEditable(node,type,index){node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label',t(type==='length'?'Rediger stykke {n}':'Rediger buk {n}',{n:index+1}));node.onclick=()=>openEdit(type,index);node.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openEdit(type,index);}};}
function openEdit(type,index){editing={type,index};selectedPipeItem={type,index};const angle=type==='angle';$('edit-rotation-label').hidden=!angle;$('edit-rotation-help').hidden=!angle;$('edit-rotation').value=String(state.bendRotations?.[index]??0);$('edit-title').textContent=t(angle?'Rediger vinkel':'Rediger længde')+' · '+(index+1);$('edit-label').textContent=t(angle?'Bukkevinkel · grader':'Længde · mm');$('edit-direction-label').hidden=!angle;$('edit-value').value=angle?Math.abs(state.turns[index]):state.lengths[index];$('edit-value').min=angle?'0.1':'0.1';if(angle)$('edit-value').max='179';else $('edit-value').removeAttribute('max');$('edit-direction').value=String(Math.sign(state.turns[index]||1));$('edit-direction').querySelector('option[value="1"]').textContent=t(hasSpatialPipe(state)?'Positiv i bukkeplanet':'Venstre');$('edit-direction').querySelector('option[value="-1"]').textContent=t(hasSpatialPipe(state)?'Negativ i bukkeplanet':'Højre');$('edit-error').textContent='';if(hasSpatialPipe(state)||pipeView!=='plan')render();$('edit-dialog').showModal();$('edit-value').focus();$('edit-value').select();}
$('edit-cancel').onclick=()=>$('edit-dialog').close();
$('edit-form').onsubmit=e=>{e.preventDefault();if(!editing)return;const n=structuredClone(state),value=Number($('edit-value').value);if(editing.type==='length')n.lengths[editing.index]=value;else {n.turns[editing.index]=value*Number($('edit-direction').value);const rotation=Number($('edit-rotation').value);if(n.bendRotations||rotation){n.bendRotations=n.bendRotations??n.turns.map(()=>0);n.bendRotations[editing.index]=rotation;}}if(!valid(n)){$('edit-error').textContent=t(validateMeasurements(n)||validateSpatialState(n)||'Indtast en gyldig længde eller vinkel.');return;}if(n.planner)n.planner={...n.planner,routeEdited:true};commit(n);$('edit-dialog').close();editing=null;};

const drawing=$('drawing');
function renderWork(){
 if(workViewProject!==state.projectId){workViewProject=state.projectId;workView='auto';workLayer='all';}
 $('work-view-select').value=workView;
 const g=pipeGeometry(state),marks=bendMarkLayout(state,getBender(state.benderId)),material=marks.supported?marks.endPosition:g.used;
 const layers=spatialHeightLayers(geometry3D(state)),chosenView=workView==='auto'?(hasSpatialPipe(state)?'iso':'plan'):workView;
 const selectedLayer=workLayer==='all'?null:layers.find(layer=>Math.abs(layer.height-Number(workLayer))<=1e-6);
 workLayer=selectedLayer?String(selectedLayer.height):'all';
 const layerSelect=$('work-layer-select');layerSelect.replaceChildren();
 for(const layer of [null,...layers]){const option=document.createElement('option');option.value=layer===null?'all':String(layer.height);option.textContent=layer===null?t('Alle lag'):'H '+(layer.height>1e-6?'+':'')+fmt(Math.abs(layer.height)<1e-6?0:layer.height)+' mm';layerSelect.append(option);}
 layerSelect.value=workLayer;$('work-layer-control').hidden=chosenView!=='top'||layers.length<2;$('work-label-control').hidden=chosenView==='plan';$('work-label-mode').value=labelMode;

 const wallStatus=wallValidationStatus(state);for(const id of ['work-wall-status','work-wall-status-data']){const node=$(id);node.hidden=wallStatus.status==='none';node.setAttribute('data-wall-status',wallStatus.status);node.classList.toggle('needs-check',wallStatus.status==='needs-check');node.textContent=wallStatus.status==='none'?'':t(wallStatus.messageKey)+(wallStatus.detailKey?' · '+t(wallStatus.detailKey):'');}
 const spatial=hasSpatialPipe(state),rolls=spatial?spatialBendRotations(state):[];$('work-rotation-heading').hidden=!spatial;$('work-rotation-note').hidden=!spatial;$('work-rotation-note').textContent=t('Drejninger læses fra A mod B: positiv er med uret. Første buk måles fra 0°-referencen ved A; resten fra det foregående buk. Højder måles fra A.');
 $('work-mode-note').textContent=t(measurementMode(state)==='vertex'?'Færdigmål til centerlinjehjørner':'Lige længder mellem tangentpunkter')+' · R'+fmt(state.radius)+' mm';
 $('work-blank-title').textContent=t(marks.supported?'Udfoldet rør · afsætningsmærker fra A':'Udfoldet rør · geometriske referencepunkter');
 $('work-blank-note').textContent=t(marks.supported?'Afmærkning efter den valgte værktøjstabel. Tabellen nedenfor viser geometriske tangentpunkter.':'Alle afstande er i mm fra ende A langs det rette rør. Retninger læses fra A mod B.');
 $('work-name').textContent=state.name;$('work-number').textContent=state.drawingNumber||state.name;
 document.querySelector('.work-data-number').textContent=t('Tegningsnummer')+' · '+(state.drawingNumber||state.name);
 $('work-empty').textContent=g.lines.length?'':t('Opret først et rør i redigeringen.');$('work-specs').replaceChildren();
 const specs=[['Udvendig diameter',state.diameter],['Godstykkelse',state.wall],['Bukkeradius',state.radius],['Geometrisk centerlinjelængde',g.used],['Rest af helt rør',state.stock-material]];
 if(marks.supported)specs.splice(3,0,['Kaplængde efter værktøjstabel',marks.endPosition]);
 for(const[key,value]of specs){const box=document.createElement('div'),label=document.createElement('span'),strong=document.createElement('strong');label.textContent=t(key);strong.textContent=fmt(value)+' mm';box.append(label,strong);$('work-specs').append(box);}
 renderBenderMarks($('work-marks'),state,g);draw(g,null,$('work-drawing'),true);renderReferences(g,$('work-references'),true);$('work-rows').replaceChildren();
 g.arcs.forEach((a,i)=>{const length=state.radius*Math.abs(a.turn)*Math.PI/180,row=document.createElement('tr');for(const value of['B'+(i+1),fmt(Math.abs(a.turn))+'°',bendLabel(a),...(spatial?[rotationLabel(rolls[i].rotation)]:[]),fmt(a.position),fmt(a.position+length/2),fmt(a.position+length),fmt(length)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}$('work-rows').append(row);});
 if(!g.arcs.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=spatial?8:7;cell.textContent=t('Ingen buk endnu. Tilføj et buk i redigeringen.');row.append(cell);$('work-rows').append(row);}
 drawBlank(g,marks);$('work-svg').disabled=!g.lines.length;
}
function drawBlank(g,marks){
 const svg=$('work-blank'),grid=$('work-blank-grid');svg.replaceChildren();grid.replaceChildren();grid.hidden=true;svg.parentElement.hidden=!g.lines.length;document.querySelector('.blank-scroll-hint').hidden=!g.lines.length;if(!g.lines.length)return;
 function el(tag,attrs,text){const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))node.setAttribute(k,v);if(text!==undefined)node.textContent=text;svg.append(node);return node;}
 const practical=marks.supported,total=practical?marks.endPosition:g.used;
 const entries=practical?marks.marks.map(mark=>({position:mark.position,id:mark.id,valueText:fmt(mark.position)+' mm'})):g.arcs.map((arc,i)=>({position:arc.position,id:'B'+(i+1),valueText:fmt(arc.position)+' mm',arcLength:state.radius*Math.abs(arc.turn)*Math.PI/180}));
 const layout=layoutBlankMarks(entries,{totalLength:total,width:900,margin:40,fontSize:14});svg.setAttribute('viewBox',`0 0 ${layout.width} ${layout.height}`);svg.setAttribute('font-family','var(--app-font, sans-serif)');
 const tube=layout.tube,scale=tube.width/total;
 el('rect',{x:tube.x,y:tube.y,width:tube.width,height:tube.height,rx:5,fill:'#e3ebe8',stroke:'#617e73'});
 el('text',{x:tube.x,y:18,'font-size':14,fill:'#183037'},'A · 0 mm');
 el('text',{x:tube.x+tube.width,y:18,'text-anchor':'end','font-size':14,fill:'#183037'},'B · '+fmt(total)+' mm');
 for(const tick of layout.ticks){
  if(tick.arcLength)el('rect',{x:tick.x,y:tube.y,width:tick.arcLength*scale,height:tube.height,fill:'#f2943a',opacity:.5});
  const line=el('line',{'data-mark':tick.id,x1:tick.x,y1:tick.y1,x2:tick.x,y2:tick.y2,stroke:'#9c5719','stroke-width':1.5});
  const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=tick.id+' · '+tick.valueText;line.append(title);
 }
 for(const label of layout.labels){
  const [a,b]=label.leader;el('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'#b57b45','stroke-width':1});
  el('rect',{x:label.box.x,y:label.box.y,width:label.box.width,height:label.box.height,rx:4,fill:'#fff8f0',stroke:'#d6b99c','stroke-width':.7});
  const text=el('text',{'data-mark-label':label.id,x:label.x,y:label.y+4.5,'font-size':layout.fontSize,'font-weight':600,'text-anchor':'middle',fill:'#804719'},label.id);
  const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=label.id+' · '+label.valueText;text.append(title);
 }
 if(layout.mode==='table'){
  grid.hidden=false;grid.setAttribute('aria-label',t('Alle mærker fra A'));
  for(const entry of layout.entries){const row=document.createElement('div'),id=document.createElement('strong'),value=document.createElement('span');row.setAttribute('data-mark',entry.id);id.textContent=entry.id;value.textContent=entry.valueText;row.append(id,value);grid.append(row);}
 }
 svg.setAttribute('aria-label',t(practical?'Afsætningsmærker fra ende A efter værktøjstabel':'Geometriske tangentpunkter fra ende A'));
}
function openWork(){renderWork();document.body.classList.add('work-mode');$('work-sheet').hidden=false;window.scrollTo(0,0);$('work-close').focus({preventScroll:true});}
function changeLabelMode(value){labelMode=value==='tap'?'tap':'all';selectedPipeItem=null;render();if(document.body.classList.contains('work-mode'))renderWork();}
$('drawing-label-mode').onchange=()=>changeLabelMode($('drawing-label-mode').value);
$('work-label-mode').onchange=()=>changeLabelMode($('work-label-mode').value);
$('work-view-select').onchange=()=>{workView=$('work-view-select').value;renderWork();};
$('work-layer-select').onchange=()=>{workLayer=$('work-layer-select').value;renderWork();};
$('work-open').onclick=openWork;$('work-close').onclick=()=>{document.body.classList.remove('work-mode');$('work-sheet').hidden=true;render();$('work-open').scrollIntoView({block:'center'});$('work-open').focus({preventScroll:true});};$('work-print').onclick=()=>{renderWork();window.print();};window.addEventListener('beforeprint',()=>{renderWork();document.body.classList.add('printing-work');$('work-sheet').hidden=false;for(const help of $('work-marks').querySelectorAll('details.mark-help'))help.open=true;});window.addEventListener('afterprint',()=>{document.body.classList.remove('printing-work');if(!document.body.classList.contains('work-mode'))$('work-sheet').hidden=true;});
$('work-svg').onclick=()=>{
 renderWork();
 const wallStatus=wallValidationStatus(state),svg=$('work-drawing').cloneNode(true),ns='http://www.w3.org/2000/svg';svg.setAttribute('xmlns',ns);svg.setAttribute('width','1200');
 for(const node of svg.querySelectorAll('[data-spatial-selectable]'))for(const attr of ['role','tabindex','aria-pressed','data-spatial-selectable'])node.removeAttribute(attr);
 const[vx,vy,vw,vh]=svg.getAttribute('viewBox').split(' ').map(Number),top=wallStatus.status==='none'?50:wallStatus.detailKey?104:84;
 svg.setAttribute('height',String((vh+top+10)*1200/vw));svg.setAttribute('viewBox',`${vx} ${vy-top} ${vw} ${vh+top+10}`);
 if(wallStatus.status!=='none'){
  const group=document.createElementNS(ns,'g'),warning=wallStatus.status==='needs-check',y=vy-top+12;group.setAttribute('data-wall-status',wallStatus.status);group.setAttribute('font-family','sans-serif');
  const box=document.createElementNS(ns,'rect');for(const[key,value]of Object.entries({x:vx+24,y,width:vw-48,height:wallStatus.detailKey?48:28,rx:4,fill:warning?'#fff4df':'#edf7f1',stroke:warning?'#9b4e19':'#477b64','stroke-width':1}))box.setAttribute(key,String(value));group.append(box);
  const line=(key,baseline,size,bold=false)=>{const node=document.createElementNS(ns,'text');for(const[name,value]of Object.entries({x:vx+34,y:baseline,'font-size':size,fill:warning?'#783d18':'#245840','font-weight':bold?600:400}))node.setAttribute(name,String(value));node.textContent=t(key);group.append(node);};
  line(wallStatus.messageKey,y+19,15,true);if(wallStatus.detailKey)line(wallStatus.detailKey,y+37,13);svg.append(group);
 }
 const title=document.createElementNS(ns,'text');title.setAttribute('x',String(vx+30));title.setAttribute('y',String(vy-20));title.setAttribute('font-size','22');title.textContent=t('Tegningsnummer')+' · '+(state.drawingNumber||state.name);svg.append(title);
 const style=document.createElementNS(ns,'style');style.textContent='.measure{font:14px sans-serif;fill:#274b44;paint-order:stroke;stroke:white;stroke-width:5px}.angle-label{font:bold 14px sans-serif;fill:#16815d;paint-order:stroke;stroke:white;stroke-width:5px}';svg.prepend(style);
 const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download='pipe-bend-drawing.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

initTypography(()=>{render();if(document.body.classList.contains("work-mode"))renderWork();});

$('offset-visual').addEventListener('toggle',()=>{$('offset-visual').querySelector('summary').textContent=t($('offset-visual').open?'Skjul forskydning':'Vis forskydning');});
$('offset-rotate').onclick=()=>{offsetRotation=(offsetRotation+90)%360;updateTools();};
$('offset-mirror').onclick=()=>{offsetMirror=!offsetMirror;updateTools();};
$('offset-reset').onclick=()=>{offsetRotation=0;offsetMirror=false;updateTools();};

function openCalculationInfo(topic){
 const offset=topic==='offset';$('pyth-help-content').hidden=offset;$('offset-help-content').hidden=!offset;$('calculation-help-title').textContent=t(offset?'Om forskydning':'Om Pythagoras');
 if(offset){const angle=Number($('offset-angle').value),factor=Number($('offset-factor').value),format=n=>Number.isFinite(n)?n.toLocaleString(locales[language],{maximumFractionDigits:4}):'—';
  $('offset-info-factor').textContent=angle>0&&angle<=90?t('Ved {angle}° er den geometriske faktor ca. {exact}. Din valgte faktor er {chosen}.',{angle:format(angle),exact:format(1/Math.sin(angle*Math.PI/180)),chosen:format(factor)}):t('Kontrollér forskydning, vinkel og faktor.');
  $('offset-info-example').textContent=$('offset-formula').textContent;
 }
 $('calculation-help').showModal();
}
$('pyth-info').onclick=()=>openCalculationInfo('pyth');
$('offset-info').onclick=()=>openCalculationInfo('offset');

const appMenu=$('app-menu'),menuTrigger=appMenu.querySelector('summary');
appMenu.querySelector('.menu-panel').addEventListener('click',event=>{if(event.target.closest('button'))appMenu.open=false;});
$('language').addEventListener('change',()=>{appMenu.open=false;menuTrigger.focus();});
document.addEventListener('pointerdown',event=>{if(appMenu.open&&!appMenu.contains(event.target))appMenu.open=false;});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&appMenu.open){event.preventDefault();appMenu.open=false;menuTrigger.focus();}});
for(const id of ['font-dialog','install-help'])$(id).addEventListener('close',()=>menuTrigger.focus());

function openPipeSettings(mode){
 pipeSettingsMode=mode==='edit'&&state.configured?'edit':'new';sync();
 if(pipeSettingsMode==='new'){$('name').value=t('Nyt rør');$('drawing-number').value=newDrawingNumber();$('bender-select').value='swagelok-ms-htb-12m';$('measurement-mode').value='vertex';$('diameter').value=12;$('radius').value=38;$('wall').value=1.5;updateBenderFields();}
 $('pipe-settings-title').textContent=t(pipeSettingsMode==='new'?'Nyt rør':'Rørindstillinger');
 $('pipe-settings-save').textContent=t(pipeSettingsMode==='new'?'Opret rør':'Gem ændringer');
 $('pipe-settings-error').textContent='';$('pipe-settings').showModal();$('name').focus();$('name').select();
}
$('pipe-settings-open').onclick=()=>openPipeSettings('edit');
$('pipe-settings-cancel').onclick=()=>$('pipe-settings').close();
$('pipe-settings').addEventListener('close',()=>{sync();if(!appMenu.open)menuTrigger.focus();});
$('pipe-settings-form').addEventListener('input',()=>{$('pipe-settings-error').textContent='';});
$('pipe-settings-form').onsubmit=event=>{
 event.preventDefault();let next={...state,configured:true};
 for(const key of ['name','stock','diameter','wall','radius'])next[key]=key==='name'?$(key).value.trim():Number($(key).value);
 next.drawingNumber=$('drawing-number').value.trim();next.benderId=$('bender-select').value||null;
 const nextMode=$('measurement-mode').value;
 if(pipeSettingsMode==='new'){next.projectId=crypto.randomUUID();next.lengths=[];next.turns=[];next.heading=0;next.measurementMode=nextMode;delete next.planner;delete next.placement;delete next.bendRotations;delete next.startFrame;}else{try{if(nextMode!==measurementMode(state))next=convertMeasurementMode(next,nextMode);}catch(error){$('pipe-settings-error').textContent=error.message;return;}}
 if(!next.name||!valid(next)){$('pipe-settings-error').textContent=validateMeasurements(next)||t('Angiv et projektnavn og gyldige rørdimensioner. Godstykkelsen skal være under halvdelen af diameteren, og centerlinjeradius skal være større end halvdelen af diameteren.');return;}
 const reopenWall=pipeSettingsMode==='new'&&roomPlanner.isOpen();
 if(pipeSettingsMode==='new'){try{roomPlanner.setDraft(next,null);}catch{$('pipe-settings-error').textContent=t('Projektet kunne ikke oprettes. Det aktuelle projekt er bevaret.');return;}}
 if(pipeSettingsMode==='new'){end='B';sign=1;bendDirection='horizontal';pipeView='plan';selectedPipeItem=null;$('bend-rotation').value='0';$('angle').value='90';$('length').value=$('length').getAttribute('value')||'35';$('unit').value='10';mainPipeDrawing.reset();spatialPipeDrawing.reset();}
 commit(next);if(reopenWall)roomPlanner.open();$('pipe-settings').close();$('length').scrollIntoView({block:'center',behavior:'smooth'});$('length').focus({preventScroll:true});
};
const roomPlanner=initRoomPlanner({getProject:()=>state,language:()=>language,t,onApply:route=>{
 if(hasSpatialPipe(state))throw new RangeError(t('Vægkontrollen gælder kun 2D. Rørets højdeskift er ikke kontrolleret mod vægge og forhindringer.'));
 const next={...structuredClone(state),configured:true,measurementMode:'vertex',lengths:route.lengths,turns:route.turns,heading:route.heading,placement:{start:route.start},planner:route.planner};
 delete next.bendRotations;delete next.startFrame;
 if(!valid(next))throw new RangeError(validateMeasurements(next)||t('Rørforslaget har ugyldige mål.'));
 end='B';sign=1;bendDirection='horizontal';pipeView='plan';mainPipeDrawing.reset();spatialPipeDrawing.reset();commit(next,true);
 $('drawing').scrollIntoView({block:'center',behavior:'smooth'});
}});
// A file opened by an older app may have retained its portable draft in the
// main JSON. Migrate it without replacing an already newer per-project copy.
if(bootEmbeddedDraft){try{
 const draft=roomPlanner.validateDraft(bootEmbeddedDraft);
 if(draft?.error)throw new TypeError('Invalid embedded wall draft');
 if(!roomPlanner.exportDraft())roomPlanner.setDraft(state,draft);
 delete state.wallDraft;save();
}catch{}}
for(const id of ['room-open','room-open-menu'])$(id).onclick=()=>roomPlanner.open();
const drawingContainer=$('drawing').parentElement;
let drawingObservedWidth=drawingContainer.clientWidth;
if(typeof ResizeObserver==='function')new ResizeObserver(()=>{
 const width=drawingContainer.clientWidth;
 if(width>0&&Math.abs(width-drawingObservedWidth)>1){drawingObservedWidth=width;requestAnimationFrame(()=>render());}
}).observe(drawingContainer);
if(!state.configured)openPipeSettings('new');
