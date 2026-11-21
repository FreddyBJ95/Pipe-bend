import {initAppSharing} from './share-app.mjs?v=26';
import {SWAGELOK_BENDERS,getBender} from './benders.mjs';
import {measurementMode,validateMeasurements,convertMeasurementMode,bendMarkLayout} from './measurements.mjs';
import {initRoomPlanner} from './room-planner.mjs?v=26';
import {renderOffsetVisualization} from './offset-visual.mjs';
import {initTypography} from './typography.mjs?v=26';
import {placeDimensionLabels} from './dimension-layout.mjs?v=26';
import {layoutBlankMarks} from './blank-layout.mjs?v=26';
import {bendReferenceLayout,bestDrawingAngle,readableTextAngle,leaderCrossesPipe} from './labels.mjs?v=26';
import {t,language,locales,captureTranslations,applyLanguage} from './i18n.mjs?v=26';
import{geometry,extend,triangle,practicalOffsetLength,calculate}from'./geometry.mjs';
const $=id=>document.getElementById(id),fmt=n=>Number.isFinite(n)?n.toLocaleString(locales[language],{maximumFractionDigits:getBender(state.benderId)?.nativeUnits==='in'?3:1}):'—';
function newDrawingNumber(){const d=new Date(),date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('');return 'PB-'+date+'-'+crypto.randomUUID().slice(0,6).toUpperCase();}
function normalizeProject(s){return {...s,configured:s.configured!==false,drawingNumber:s.drawingNumber?.trim()||s.name};}
let triangleRotation=0,triangleMirror=false,editing=null,offsetRotation=0,offsetMirror=false,pipeSettingsMode='new';
const camera={zoom:1,x:450,y:270,width:900,height:540,baseX:450,baseY:270};
let state={version:1,configured:false,name:t('Mit første rør'),drawingNumber:newDrawingNumber(),stock:6000,diameter:12,wall:1.5,radius:38,benderId:'swagelok-ms-htb-12m',measurementMode:'vertex',heading:0,lengths:[],turns:[]},end='B',sign=1,history=[],storageOK=true;
function valid(s){return s&&s.version===1&&typeof s.name==='string'&&s.name.length<=80&&(s.drawingNumber===undefined||(typeof s.drawingNumber==='string'&&s.drawingNumber.trim().length>0&&s.drawingNumber.length<=80))&&['stock','diameter','wall','radius','heading'].every(k=>typeof s[k]==='number'&&Number.isFinite(s[k]))&&s.stock>0&&s.diameter>0&&s.wall>0&&s.wall<s.diameter/2&&s.radius>s.diameter/2&&Array.isArray(s.lengths)&&s.lengths.length<=200&&s.lengths.every(v=>Number.isFinite(v)&&v>0)&&Array.isArray(s.turns)&&s.turns.length===Math.max(0,s.lengths.length-1)&&s.turns.every(v=>Number.isFinite(v)&&Math.abs(v)>0&&Math.abs(v)<=179)&&(s.measurementMode===undefined||['tangent','vertex'].includes(s.measurementMode))&&(s.benderId===undefined||s.benderId===null||typeof s.benderId==='string')&&!validateMeasurements(s);}
try{const s=JSON.parse(localStorage.getItem('pipe-bend-v1'));if(valid(s))state=normalizeProject(s);}catch{}
function sync(){for(const k of['name','stock','diameter','wall','radius'])$(k).value=state[k];$('drawing-number').value=state.drawingNumber||state.name;if($('bender-select')){$('bender-select').value=state.benderId||'';$('measurement-mode').value=measurementMode(state);updateBenderFields();}}function save(){try{localStorage.setItem('pipe-bend-v1',JSON.stringify(state));}catch{storageOK=false;}}function commit(n,roomApplied=false){const error=validateMeasurements(n);if(error)throw new RangeError(error);if(n.planner){const geo=geometry(measurementMode(n)==='vertex'?n:convertMeasurementMode(n,'vertex')),changed=!!state.planner&&!roomApplied&&JSON.stringify([state.lengths,state.turns,state.radius,state.diameter,state.heading,state.measurementMode])!==JSON.stringify([n.lengths,n.turns,n.radius,n.diameter,n.heading,n.measurementMode]),start=n.placement?.start||n.planner.points?.[0]||[0,0],points=[geo.lines[0]?.dimensionStart||geo.start,...geo.lines.map(line=>line.dimensionEnd||line.end)].map(p=>[p[0]+start[0],p[1]+start[1]]);n.planner={...n.planner,routeEdited:roomApplied?false:(changed||!!n.planner.routeEdited),points,input:{...n.planner.input,diameter:n.diameter,radius:n.radius}};}history.push(structuredClone(state));state=n;save();sync();render();}function params(){return{length:Number($('length').value)*Number($('unit').value),turn:Number($('angle').value)*sign};}function ready(){const p=params();return Number.isFinite(p.length)&&p.length>0&&Number.isFinite(p.turn)&&Math.abs(p.turn)>0&&Math.abs(p.turn)<=179;}
function render(){
 const g=geometry(state),has=state.lengths.length>0,marks=bendMarkLayout(state,getBender(state.benderId)),material=marks.supported&&has?marks.endPosition:g.used,left=state.stock-material;
 $('empty').style.display=has?'none':'flex';$('drawing-reference-details').hidden=!has;$('drawing-title').textContent=state.name;$('bend-fields').hidden=!has;
 $('editor-title').textContent=has?t('Fortsæt fra ende ')+end:t('Start med første stykke');
 $('editor-help').textContent=has?t('Vælg vinkel og længde. Spejlvend bukket for at vælge den anden side.'):t('Tilføj første længde, og tryk derefter på ende A eller B.');
 $('add').textContent=!state.configured?t('Opret rør'):has?t('Tilføj buk & stykke'):t('Tilføj første stykke');
 $('side').textContent=sign>0?t('Venstre'):t('Højre');$('undo').disabled=!history.length;
 $('remaining').innerHTML=fmt(left)+' <small>mm</small>';$('remaining').style.color=left<0?'#b64235':'';
 $('used').textContent=fmt(material)+' mm · '+t(marks.supported&&has?'Kaplængde efter værktøjstabel':'Geometrisk rørlængde');$('total').textContent=t('af ')+fmt(state.stock)+' mm';$('progress').max=state.stock;$('progress').value=material;
 $('material-status').textContent=left<0?t('Røret er ')+fmt(-left)+t(' mm for kort'):g.arcs.length+t(' buk · buelængder medregnet');
 let preview=null,previewError='';if(has&&ready()){const next=extend(state,end,params().length,params().turn);previewError=validateMeasurements(next)||'';if(!previewError)preview=geometry(next);}
 $('error').textContent=!storageOK?t('Automatisk lagring er utilgængelig. Gem projektet som fil.'):previewError;
 $('add').disabled=state.configured&&(!ready()||!!previewError);
 $('room-plan-status').textContent=state.planner?t(state.planner.routeEdited?'Røret er rettet. Åbn vægforløbet for at kontrollere klammer og forhindringer igen.':'Forslag langs vægforløbet. Længder og vinkler kan redigeres.'):'';
 $('drawing-mode').textContent=t(measurementMode(state)==='vertex'?'Mål til centerlinjehjørner':'Lige længder mellem tangentpunkter')+(getBender(state.benderId)?' · '+getBender(state.benderId).model:'');
 $('length-label').textContent=t(measurementMode(state)==='vertex'?'Næste færdigmål til hjørne':'Næste lige stykke');
 renderBenderMarks($('live-marks'),state,g);draw(g,preview);updateTools();
}

function draw(g,preview,target=$('drawing'),work=false){
 const svg=target;svg.replaceChildren();
 const width=work?900:Math.max(280,svg.clientWidth||900),pageHeight=work?1200:Math.max(430,Math.min(540,width*.65));
 if(!work)svg.setAttribute('height',String(pageHeight));
 const setBounds=()=>{if(work){svg.setAttribute('viewBox',`0 0 ${width} ${pageHeight}`);return;}const cx=width/2,cy=pageHeight/2;camera.x+=cx-camera.baseX;camera.y+=cy-camera.baseY;Object.assign(camera,{width,height:pageHeight,baseX:cx,baseY:cy});applyCamera();};
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
 const placed=placeDimensionLabels(items,obstacles,{x:12,y:12,w:width-24,h:pageHeight-24},{allowOmissions:true,acceptCandidate:(dim,accepted)=>{
  if(dim.box.x<10||dim.box.y<10||dim.box.x+dim.box.w>width-10||dim.box.y+dim.box.h>pageHeight-10)return false;
  const [start,finish]=dimensionLeader(dim),length=Math.hypot(start[0]-finish[0],start[1]-finish[1]);
  if(length>(work?64:42)||Math.hypot(start[0]-dim.x,start[1]-dim.y)>(work?100:66)||leaderCrossesPipe(start,finish,pipe))return false;
  return !layout.labels.some(p=>hits(start,finish,p.polygon))&&!accepted.some(p=>hits(start,finish,p.polygon)||crosses(start,finish,...dimensionLeader(p)))&&!layout.labels.some(p=>crosses(start,finish,...p.leader));
 },extraObstacles:dim=>[footprint(...dimensionLeader(dim),2)]}).map(dim=>({...dim,leader:dimensionLeader(dim)}));
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
   const id=(type==='length'?'L':'B')+(i+1),ref=document.createElement('strong'),value=document.createElement('span');ref.className=type==='angle'?'bend-ref':'length-ref';ref.textContent=id;value.textContent=type==='length'?fmt(item.dimension??item.length)+' mm':fmt(Math.abs(item.turn))+'° · '+t(item.turn>0?'Venstre':'Højre');row.append(ref,value);row.setAttribute('data-reference-row',id);
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
 if(container.id==='live-marks')$('bender-marks').hidden=!has;
 if(!has)return;
 const heading=document.createElement('h3');heading.textContent=t('Afsætningsmål på stangen');if(container.id==='work-marks')container.append(heading);
 const info=document.createElement('p');info.className='hint';
 if(!bender){info.textContent=t('Vælg en bukker under Rørindstillinger for at få afsætningsmærker efter værktøjstabel.');container.append(info);return;}
 info.textContent=bender.model+' · Ø'+fmt(bender.tubeODmm)+' mm · R'+fmt(bender.radiusMm)+' mm';container.append(info);
 if(!report.supported){const error=document.createElement('p');error.className='mark-unavailable';error.textContent=t('Ingen afsætningstabel for denne opsætning.')+' '+(report.error||report.reason);container.append(error);return;}
 const table=document.createElement('table'),head=document.createElement('thead'),header=document.createElement('tr'),body=document.createElement('tbody');table.className='mark-table';
 for(const title of ['Buk','Vinkel','Fradrag fra forrige buk','Fra forrige mærke','Mærke fra A']){const th=document.createElement('th');th.textContent=t(title);header.append(th);}head.append(header);table.append(head,body);
 for(const mark of report.marks){const row=document.createElement('tr');for(const value of [mark.id,fmt(Math.abs(mark.angle))+'°',fmt(mark.gainApplied)+' mm',fmt(mark.interval)+' mm',fmt(mark.position)+' mm']){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}body.append(row);}
 const endRow=document.createElement('tr');for(const value of [t('Rørslut'),'—',report.gains.length?fmt(report.gains.at(-1))+' mm':'—',fmt(report.intervals.at(-1))+' mm',fmt(report.endPosition)+' mm']){const cell=document.createElement('td');cell.textContent=value;endRow.append(cell);}body.append(endRow);
 const scroll=document.createElement('div');scroll.className='mark-table-wrap';scroll.append(table);container.append(scroll);
 const explanation=document.createElement('p');explanation.className='hint';explanation.textContent=t('Fra forrige mærke viser målet fra sidste mærke; første mål er fra ende A. Mærke fra A viser det samlede mål. Værktøjets fradrag er allerede indregnet.');container.append(explanation);
 const totals=document.createElement('p');totals.className='mark-totals';totals.textContent=t('Kaplængde efter værktøjstabel')+': '+fmt(report.endPosition)+' mm · '+t('Geometrisk centerlinjelængde')+': '+fmt(g.used)+' mm';container.append(totals);
 const note=document.createElement('p');note.className='hint';note.textContent=t('Værktøjstabellens kaplængde og den ideelle centerlinjelængde er forskellige beregningsmetoder. Brug kaplængden sammen med den valgte bukkers afsætningsmetode.');container.append(note);
 const source=document.createElement('a');source.href=bender.source.url+'#page=23';source.target='_blank';source.rel='noopener noreferrer';source.textContent=t('Producentens tabel og mærkereference')+' · MS-13-43, '+bender.source.revision;container.append(source);
}

$('add-form').onsubmit=e=>{e.preventDefault();if(!state.configured){openPipeSettings('new');return;}if(!ready())return;if(state.lengths.length>=200){alert(t('Maks. 200 stykker pr. projekt.'));return;}const next=extend(state,end,params().length,params().turn),error=validateMeasurements(next);if(error){$('error').textContent=error;return;}commit(next);};$('mirror').onclick=()=>{sign*=-1;render();};for(const k of['length','angle','unit'])$(k).oninput=render;$('undo').onclick=()=>{if(history.length){state=history.pop();save();sync();render();}};$('reset').onclick=()=>openPipeSettings('new');

let py=NaN,off=NaN;function updateTools(){py=triangle($('solve').value,+$('p1').value,+$('p2').value);$('pyth-result').textContent=fmt(py)+' mm';$('use-pyth').disabled=!Number.isFinite(py)||py<=0;$('pyth-angle').textContent=Number.isFinite(py)?t('a² + b² = c² · Retvinklet trekant'):t('Hypotenusen skal være større end den kendte katete.');drawTriangle();const displacement=Number($('offset').value),bendAngle=Number($('offset-angle').value),factor=Number($('offset-factor').value),offsetUnit=$('offset-unit').value;
 off=bendAngle>0&&bendAngle<=90?practicalOffsetLength(displacement,factor):NaN;
 const formatOffset=n=>Number.isFinite(n)?n.toLocaleString(locales[language],{maximumFractionDigits:3}):'—',formatFactor=n=>n.toLocaleString(locales[language],{maximumFractionDigits:12});
 $('offset-result').textContent=formatOffset(off)+' '+offsetUnit;
 $('offset-formula').textContent=Number.isFinite(off)?formatOffset(displacement)+' × '+formatFactor(factor)+' = '+formatOffset(off)+' '+offsetUnit:t('Kontrollér forskydning, vinkel og faktor.');
 renderOffsetVisualization($('offset-svg'),{offset:displacement,angle:bendAngle,length:off,factor,unit:offsetUnit,rotation:offsetRotation,mirror:offsetMirror},t,formatOffset);
 $('offset-mirror').setAttribute('aria-pressed',String(offsetMirror));}$('solve').onchange=()=>{const m=$('solve').value;$('p1-label').firstChild.textContent=(m==='a'?'b':'a')+' · mm';$('p2-label').firstChild.textContent=(m==='c'?'b':'c')+' · mm';updateTools();};for(const k of['p1','p2','offset','offset-factor'])$(k).oninput=updateTools;$('offset-angle').oninput=()=>{const a=Number($('offset-angle').value);if(a>0&&a<=90)$('offset-factor').value=a===45?'1.4':String(Number((1/Math.sin(a*Math.PI/180)).toFixed(3)));updateTools();};let currentOffsetUnit='cm';$('offset-unit').onchange=()=>{const next=$('offset-unit').value;if(next!==currentOffsetUnit){$('offset').value=String(Number($('offset').value)*(next==='mm'?10:.1));currentOffsetUnit=next;}updateTools();};function use(v){$('length').value=Math.round(v*1000)/1000;$('unit').value='1';render();$('length').scrollIntoView({behavior:'smooth',block:'center'});$('length').focus({preventScroll:true});}$('use-pyth').onclick=()=>use(py);
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=(state.name.replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g,'_')||'pipe-bend')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('import').onclick=()=>$('file').click();$('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>100000)throw Error();const s=JSON.parse(await f.text());if(!valid(s))throw Error();if(state.lengths.length&&!confirm(t('Erstat det åbne projekt med filen?')))return;commit(normalizeProject(s));}catch{alert(t('Filen er ikke et gyldigt Pipe-bend-projekt.'));}finally{e.target.value='';}};$('print').onclick=()=>{renderWork();window.print();};
let calc=NaN;function calcUpdate(){try{calc=calculate($('expression').value);$('calc-result').textContent=fmt(calc);}catch{calc=NaN;$('calc-result').textContent=$('expression').value?t('Kontrollér regnestykket'):'0';}$('use-calc').disabled=!Number.isFinite(calc)||calc<=0;}for(const k of['7','8','9','÷','4','5','6','×','1','2','3','−','0',',','⌫','+','(',')','C','=']){const b=document.createElement('button');b.textContent=k;b.onclick=()=>{const f=$('expression');if(k==='C')f.value='';else if(k==='⌫')f.value=f.value.slice(0,-1);else if(k!=='=')f.value+=k==='−'?'-':k;calcUpdate();};$('keys').append(b);}$('expression').oninput=calcUpdate;$('calculator-open').onclick=()=>{$('calculator').showModal();calcUpdate();};$('use-calc').onclick=()=>{if(Number.isFinite(calc)&&calc>0){$('calculator').close();use(calc);}};let installPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});$('install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;}else $('install-help').showModal();};if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{$('error').textContent=t('Offlinefunktionen kræver HTTPS eller localhost.');});initBenderChoices();initAppSharing();captureTranslations();applyLanguage(language);$('language').value=language;sync();render();

function drawTriangle(){
 const svg=$('triangle-svg'),mode=$('solve').value,p=+$('p1').value,q=+$('p2').value;
 svg.replaceChildren();
 if(!Number.isFinite(py)||py<=0){svg.hidden=true;$('triangle-help').textContent=t('Indtast to gyldige sidelængder for at se trekanten.');return;}
 svg.hidden=false;
 const sides=mode==='c'?{a:p,b:q,c:py}:mode==='a'?{a:py,b:p,c:q}:{a:p,b:py,c:q};
 const angle=triangleRotation*Math.PI/180;
 const rotate=([x,y])=>{x*=triangleMirror?-1:1;return[x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle)];};
 const raw=[[0,0],[sides.a,0],[0,-sides.b]].map(rotate);
 const xs=raw.map(p=>p[0]),ys=raw.map(p=>p[1]),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
 const scale=Math.min(240/Math.max(maxx-minx,1e-12),160/Math.max(maxy-miny,1e-12));
 const project=p=>[210+(p[0]-(minx+maxx)/2)*scale,140+(p[1]-(miny+maxy)/2)*scale];
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
 $('triangle-help').textContent=t('Alle mål i mm · Grøn side er den beregnede ')+mode+t(' · Drejet ')+triangleRotation+'°'+(triangleMirror?t(' · Spejlvendt'):'');
}
$('pyth-visual').addEventListener('toggle',()=>{$('pyth-visual').querySelector('summary').textContent=$('pyth-visual').open?t('Skjul trekant'):t('Vis trekant');});

$('triangle-rotate').onclick=()=>{triangleRotation=(triangleRotation+90)%360;drawTriangle();};
$('triangle-mirror').onclick=()=>{triangleMirror=!triangleMirror;drawTriangle();};
$('triangle-reset').onclick=()=>{triangleRotation=0;triangleMirror=false;drawTriangle();};

$('language').onchange=()=>{applyLanguage($('language').value);render();$('pyth-visual').querySelector('summary').textContent=t($('pyth-visual').open?'Skjul trekant':'Vis trekant');$('offset-visual').querySelector('summary').textContent=t($('offset-visual').open?'Skjul forskydning':'Vis forskydning');if($('calculator').open)calcUpdate();updateBenderFields();roomPlanner.refresh();};

function makeEditable(node,type,index){node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label',t(type==='length'?'Rediger stykke {n}':'Rediger buk {n}',{n:index+1}));node.onclick=()=>openEdit(type,index);node.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openEdit(type,index);}};}
function openEdit(type,index){editing={type,index};const angle=type==='angle';$('edit-title').textContent=t(angle?'Rediger vinkel':'Rediger længde')+' · '+(index+1);$('edit-label').textContent=t(angle?'Bukkevinkel · grader':'Længde · mm');$('edit-direction-label').hidden=!angle;$('edit-value').value=angle?Math.abs(state.turns[index]):state.lengths[index];$('edit-value').min=angle?'0.1':'0.1';if(angle)$('edit-value').max='179';else $('edit-value').removeAttribute('max');$('edit-direction').value=String(Math.sign(state.turns[index]||1));$('edit-error').textContent='';$('edit-dialog').showModal();$('edit-value').focus();$('edit-value').select();}
$('edit-cancel').onclick=()=>$('edit-dialog').close();
$('edit-form').onsubmit=e=>{e.preventDefault();if(!editing)return;const n=structuredClone(state),value=Number($('edit-value').value);if(editing.type==='length')n.lengths[editing.index]=value;else n.turns[editing.index]=value*Number($('edit-direction').value);if(!valid(n)){$('edit-error').textContent=validateMeasurements(n)||t('Indtast en gyldig længde eller vinkel.');return;}if(n.planner)n.planner={...n.planner,routeEdited:true};commit(n);$('edit-dialog').close();editing=null;};

function applyCamera(){const w=camera.width/camera.zoom,h=camera.height/camera.zoom;$('drawing').setAttribute('viewBox',`${camera.x-w/2} ${camera.y-h/2} ${w} ${h}`);$('zoom-level').textContent=Math.round(camera.zoom*100)+'%';$('zoom-in').disabled=camera.zoom>=8;$('zoom-out').disabled=camera.zoom<=1;}
function zoomTo(next,anchor){const old=camera.zoom;camera.zoom=Math.min(8,Math.max(1,next));if(anchor){const ratio=old/camera.zoom;camera.x=anchor.x+(camera.x-anchor.x)*ratio;camera.y=anchor.y+(camera.y-anchor.y)*ratio;}if(camera.zoom===1){camera.x=camera.baseX;camera.y=camera.baseY;}applyCamera();}
$('zoom-in').onclick=()=>zoomTo(camera.zoom*1.35);$('zoom-out').onclick=()=>zoomTo(camera.zoom/1.35);$('zoom-fit').onclick=()=>{camera.x=camera.baseX;camera.y=camera.baseY;zoomTo(1);};
const drawing=$('drawing'),pointers=new Map();let gesture=null,dragging=false;
drawing.addEventListener('wheel',e=>{e.preventDefault();const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(drawing.getScreenCTM().inverse());zoomTo(camera.zoom*Math.exp(-e.deltaY*.002),point);},{passive:false});
drawing.addEventListener('pointerdown',e=>{if(e.target.closest('[role="button"]'))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drawing.setPointerCapture(e.pointerId);if(pointers.size===2){const [a,b]=[...pointers.values()];gesture={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:camera.zoom};}dragging=false;});
drawing.addEventListener('pointermove',e=>{const old=pointers.get(e.pointerId);if(!old)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&gesture){const[a,b]=[...pointers.values()];zoomTo(gesture.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,gesture.distance));}else if(pointers.size===1){const m=drawing.getScreenCTM();camera.x-=(e.clientX-old.x)/m.a;camera.y-=(e.clientY-old.y)/m.d;applyCamera();}dragging=true;});
for(const event of ['pointerup','pointercancel','lostpointercapture'])drawing.addEventListener(event,e=>{pointers.delete(e.pointerId);gesture=null;});
drawing.addEventListener('keydown',e=>{if(e.target!==drawing)return;const step=45/camera.zoom;if(e.key==='+'||e.key==='=')zoomTo(camera.zoom*1.35);else if(e.key==='-')zoomTo(camera.zoom/1.35);else if(e.key==='0')$('zoom-fit').click();else if(e.key==='ArrowLeft')camera.x-=step;else if(e.key==='ArrowRight')camera.x+=step;else if(e.key==='ArrowUp')camera.y-=step;else if(e.key==='ArrowDown')camera.y+=step;else return;e.preventDefault();applyCamera();});
function renderWork(){
 const g=geometry(state),marks=bendMarkLayout(state,getBender(state.benderId)),material=marks.supported?marks.endPosition:g.used;
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
 g.arcs.forEach((a,i)=>{const length=state.radius*Math.abs(a.turn)*Math.PI/180,row=document.createElement('tr');for(const value of['B'+(i+1),fmt(Math.abs(a.turn))+'°',t(a.turn>0?'Venstre':'Højre'),fmt(a.position),fmt(a.position+length/2),fmt(a.position+length),fmt(length)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}$('work-rows').append(row);});
 if(!g.arcs.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=7;cell.textContent=t('Ingen buk endnu. Tilføj et buk i redigeringen.');row.append(cell);$('work-rows').append(row);}
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
$('work-open').onclick=openWork;$('work-close').onclick=()=>{document.body.classList.remove('work-mode');$('work-sheet').hidden=true;$('work-open').scrollIntoView({block:'center'});$('work-open').focus({preventScroll:true});};$('work-print').onclick=()=>{renderWork();window.print();};window.addEventListener('beforeprint',()=>{renderWork();document.body.classList.add('printing-work');$('work-sheet').hidden=false;});window.addEventListener('afterprint',()=>{document.body.classList.remove('printing-work');if(!document.body.classList.contains('work-mode'))$('work-sheet').hidden=true;});
$('work-svg').onclick=()=>{const svg=$('work-drawing').cloneNode(true);svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','1200');const[vx,vy,vw,vh]=svg.getAttribute('viewBox').split(' ').map(Number);svg.setAttribute('height',String((vh+60)*1200/vw));svg.setAttribute('viewBox',`${vx} ${vy-50} ${vw} ${vh+60}`);const title=document.createElementNS('http://www.w3.org/2000/svg','text');title.setAttribute('x',String(vx+30));title.setAttribute('y',String(vy-20));title.setAttribute('font-size','22');title.textContent=t('Tegningsnummer')+' · '+(state.drawingNumber||state.name);svg.append(title);const style=document.createElementNS('http://www.w3.org/2000/svg','style');style.textContent='.measure{font:14px sans-serif;fill:#274b44;paint-order:stroke;stroke:white;stroke-width:5px}.angle-label{font:bold 14px sans-serif;fill:#16815d;paint-order:stroke;stroke:white;stroke-width:5px}';svg.prepend(style);const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download='pipe-bend-drawing.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
applyCamera();

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
 if(pipeSettingsMode==='new'){next.lengths=[];next.turns=[];next.heading=0;next.measurementMode=nextMode;delete next.planner;delete next.placement;}else{try{if(nextMode!==measurementMode(state))next=convertMeasurementMode(next,nextMode);}catch(error){$('pipe-settings-error').textContent=error.message;return;}}
 if(!next.name||!valid(next)){$('pipe-settings-error').textContent=validateMeasurements(next)||t('Angiv et projektnavn og gyldige rørdimensioner. Godstykkelsen skal være under halvdelen af diameteren, og centerlinjeradius skal være større end halvdelen af diameteren.');return;}
 if(pipeSettingsMode==='new'){end='B';sign=1;camera.zoom=1;camera.x=camera.baseX;camera.y=camera.baseY;}
 commit(next);$('pipe-settings').close();$('length').scrollIntoView({block:'center',behavior:'smooth'});$('length').focus({preventScroll:true});
};
const roomPlanner=initRoomPlanner({getProject:()=>state,language:()=>language,t,onApply:route=>{
 const next={...structuredClone(state),configured:true,measurementMode:'vertex',lengths:route.lengths,turns:route.turns,heading:route.heading,placement:{start:route.start},planner:route.planner};
 if(!valid(next))throw new RangeError(validateMeasurements(next)||t('Rørforslaget har ugyldige mål.'));
 end='B';sign=1;camera.zoom=1;camera.x=camera.baseX;camera.y=camera.baseY;commit(next,true);
 $('drawing').scrollIntoView({block:'center',behavior:'smooth'});
}});
for(const id of ['room-open','room-open-menu'])$(id).onclick=()=>roomPlanner.open();
let drawingObservedWidth=$('drawing').clientWidth;
if(typeof ResizeObserver==='function')new ResizeObserver(()=>{
 const width=$('drawing').clientWidth;
 if(width>0&&Math.abs(width-drawingObservedWidth)>1){drawingObservedWidth=width;requestAnimationFrame(()=>render());}
}).observe($('drawing'));
if(!state.configured)openPipeSettings('new');
