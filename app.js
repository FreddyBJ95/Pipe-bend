import {initAppSharing} from './share-app.mjs?v=20';
import {renderOffsetVisualization} from './offset-visual.mjs';
import {initTypography} from './typography.mjs';
import {placeDimensionLabels} from './dimension-layout.mjs';
import {bendReferenceLayout,bestDrawingAngle,readableTextAngle} from './labels.mjs?v=20';
import {t,language,locales,captureTranslations,applyLanguage} from './i18n.mjs';
import{geometry,extend,triangle,practicalOffsetLength,calculate}from'./geometry.mjs';
const $=id=>document.getElementById(id),fmt=n=>Number.isFinite(n)?n.toLocaleString(locales[language],{maximumFractionDigits:1}):'—';
function newDrawingNumber(){const d=new Date(),date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('');return 'PB-'+date+'-'+crypto.randomUUID().slice(0,6).toUpperCase();}
function normalizeProject(s){return {...s,configured:s.configured!==false,drawingNumber:s.drawingNumber?.trim()||s.name};}
let triangleRotation=0,triangleMirror=false,editing=null,offsetRotation=0,offsetMirror=false,pipeSettingsMode='new';
const camera={zoom:1,x:450,y:270,width:900,height:540,baseX:450,baseY:270};
let state={version:1,configured:false,name:t('Mit første rør'),drawingNumber:newDrawingNumber(),stock:6000,diameter:22,wall:1.5,radius:80,heading:0,lengths:[],turns:[]},end='B',sign=1,history=[],storageOK=true;
function valid(s){return s&&s.version===1&&typeof s.name==='string'&&s.name.length<=80&&(s.drawingNumber===undefined||(typeof s.drawingNumber==='string'&&s.drawingNumber.trim().length>0&&s.drawingNumber.length<=80))&&['stock','diameter','wall','radius','heading'].every(k=>typeof s[k]==='number'&&Number.isFinite(s[k]))&&s.stock>0&&s.diameter>0&&s.wall>0&&s.wall<s.diameter/2&&s.radius>s.diameter/2&&Array.isArray(s.lengths)&&s.lengths.length<=200&&s.lengths.every(v=>Number.isFinite(v)&&v>0)&&Array.isArray(s.turns)&&s.turns.length===Math.max(0,s.lengths.length-1)&&s.turns.every(v=>Number.isFinite(v)&&Math.abs(v)>0&&Math.abs(v)<=179);}
try{const s=JSON.parse(localStorage.getItem('pipe-bend-v1'));if(valid(s))state=normalizeProject(s);}catch{}
function sync(){for(const k of['name','stock','diameter','wall','radius'])$(k).value=state[k];$('drawing-number').value=state.drawingNumber||state.name;}function save(){try{localStorage.setItem('pipe-bend-v1',JSON.stringify(state));}catch{storageOK=false;}}function commit(n){history.push(structuredClone(state));state=n;save();sync();render();}function params(){return{length:Number($('length').value)*Number($('unit').value),turn:Number($('angle').value)*sign};}function ready(){const p=params();return Number.isFinite(p.length)&&p.length>0&&Number.isFinite(p.turn)&&Math.abs(p.turn)>0&&Math.abs(p.turn)<=179;}
function render(){
 const g=geometry(state),has=state.lengths.length>0,left=state.stock-g.used;
 $('empty').style.display=has?'none':'flex';$('drawing-title').textContent=state.name;$('bend-fields').hidden=!has;
 $('editor-title').textContent=has?t('Fortsæt fra ende ')+end:t('Start med første stykke');
 $('editor-help').textContent=has?t('Vælg vinkel og længde. Spejlvend bukket for at vælge den anden side.'):t('Tilføj første længde, og tryk derefter på ende A eller B.');
 $('add').textContent=!state.configured?t('Opret rør'):has?t('Tilføj buk & stykke'):t('Tilføj første stykke');
 $('side').textContent=sign>0?t('Venstre'):t('Højre');$('undo').disabled=!history.length;
 $('remaining').innerHTML=fmt(left)+' <small>mm</small>';$('remaining').style.color=left<0?'#b64235':'';
 $('used').textContent=fmt(g.used)+t(' mm brugt');$('total').textContent=t('af ')+fmt(state.stock)+' mm';$('progress').max=state.stock;$('progress').value=g.used;
 $('material-status').textContent=left<0?t('Røret er ')+fmt(-left)+t(' mm for kort'):g.arcs.length+t(' buk · buelængder medregnet');
 $('error').textContent=storageOK?'':t('Automatisk lagring er utilgængelig. Gem projektet som fil.');
 draw(g,has&&ready()?geometry(extend(state,end,params().length,params().turn)):null);updateTools();
}

function draw(g,preview,target=$('drawing'),work=false){
 const svg=target;svg.replaceChildren();
 const setBounds=b=>{if(work){svg.setAttribute('viewBox',`${b.x} ${b.y} ${b.w} ${b.h}`);return;}const cx=b.x+b.w/2,cy=b.y+b.h/2;camera.x+=cx-camera.baseX;camera.y+=cy-camera.baseY;Object.assign(camera,{width:b.w,height:b.h,baseX:cx,baseY:cy});applyCamera();};
 if(!g.lines.length){setBounds({x:0,y:0,w:900,h:540});return;}
 const pageHeight=work?1200:540,plotWidth=work?640:600,plotHeight=work?1000:320;
 const angle=bestDrawingAngle(g.points,plotWidth,plotHeight),c=Math.cos(angle),sn=Math.sin(angle),rotate=p=>[p[0]*c-p[1]*sn,p[0]*sn+p[1]*c],rotated=g.points.map(rotate),xs=rotated.map(p=>p[0]),ys=rotated.map(p=>p[1]),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys),scale=Math.min(plotWidth/Math.max(1,maxx-minx),plotHeight/Math.max(1,maxy-miny));
 const base=p=>{const q=rotate(p);return[450+(q[0]-(minx+maxx)/2)*scale,(work?600:255)-(q[1]-(miny+maxy)/2)*scale];};
 const layout=bendReferenceLayout(g.arcs,base,{height:pageHeight}),P=layout.project;
 function el(tag,attrs,parent=svg){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;}
 // All leaders sit behind all label backgrounds and text.
 const pipes=el('g',{'data-layer':'pipe'}),leaders=el('g',{'data-layer':'leaders'}),labels=el('g',{'data-layer':'labels'}),ends=el('g',{'data-layer':'endpoints'});
 function path(geo,attrs,delta=[0,0]){let d='';const pp=p=>P([p[0]+delta[0],p[1]+delta[1]]).join(',');geo.lines.forEach((l,i)=>{if(!i)d+='M'+pp(l.start);d+='L'+pp(l.end);if(geo.arcs[i])for(const p of geo.arcs[i].samples)d+='L'+pp(p);});el('path',{d,fill:'none','stroke-linecap':'round','stroke-linejoin':'round',...attrs},pipes);}
 if(preview){let shift=[0,0];if(end==='A'){const p=preview.lines[1].start;shift=[-p[0],-p[1]];}path(preview,{stroke:'#97c6b0','stroke-width':2,'stroke-dasharray':'8 8',opacity:.6},shift);}
 path(g,{stroke:'#9db6ab','stroke-width':14});path(g,{stroke:'#deeee7','stroke-width':9});path(g,{stroke:'#487b69','stroke-width':1,'stroke-dasharray':'4 5'});
 const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],obstacles=[];
 const segmentObstacle=(a,b,padding=10)=>{const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len*padding,ny=dx/len*padding;return[[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]];};
 for(const l of g.lines)obstacles.push(segmentObstacle(P(l.start),P(l.end)));
 for(const arc of g.arcs)for(let j=0;j<arc.samples.length-1;j+=4)obstacles.push(segmentObstacle(P(arc.samples[j]),P(arc.samples[Math.min(j+4,arc.samples.length-1)])));
 for(const point of[P(g.start),P(g.end)])obstacles.push(rect(point[0]-25,point[1]-25,50,50));
 const badgeWidth=work?112:54;
 for(const ref of layout.labels){
  obstacles.push(rect(ref.labelX-badgeWidth/2-4,ref.labelY-18,badgeWidth+8,36));
  const edge=ref.labelX+(ref.side?-1:1)*badgeWidth/2,rail=edge+(ref.side?-8:8);
  el('polyline',{'data-bend':ref.id,points:`${ref.x},${ref.y} ${rail},${ref.y} ${rail},${ref.labelY} ${edge},${ref.labelY}`,fill:'none',stroke:'#d0a17b','stroke-width':1.1},leaders);
  el('circle',{'data-bend':ref.id,cx:ref.x,cy:ref.y,r:3.5,fill:'#ae5c15',stroke:'white','stroke-width':1},leaders);
  const badge=el('g',{'data-reference':ref.id,class:'reference-badge'},labels);
  el('rect',{x:ref.labelX-badgeWidth/2,y:ref.labelY-14,width:badgeWidth,height:28,rx:6,fill:'#fff2e4',stroke:'#ae5c15','stroke-width':1.2},badge);
  el('text',{x:ref.labelX,y:ref.labelY+5,'font-family':'var(--app-font, sans-serif)','font-size':16,'font-weight':700,'text-anchor':'middle',fill:'#ae5c15'},badge).textContent=work?ref.id+' · '+fmt(Math.abs(g.arcs[ref.index].turn))+'°':ref.id;
  if(!work)makeEditable(badge,'angle',ref.index);
 }
 const fontSize=work?18:Math.max(18,Math.min(36,16*900/Math.max(320,svg.clientWidth||900))),metrics=document.createElement('canvas').getContext('2d');metrics.font=`600 ${fontSize}px ${getComputedStyle(svg).fontFamily}`;
 const items=g.lines.map((line,index)=>{const a=P(line.start),b=P(line.end),text=fmt(line.length)+(work?' mm':'');return{id:'L'+(index+1),index,a,b,text,width:Math.ceil(metrics.measureText(text).width)+20,height:fontSize+12,angle:readableTextAngle(b[0]-a[0],b[1]-a[1])};});
 const placed=placeDimensionLabels(items,obstacles,{x:145,y:20,w:610,h:layout.height-60});
 const pagePoints=g.points.map(P);
 let bx=work?Math.min(...pagePoints.map(p=>p[0]))-28:0,by=work?Math.min(...pagePoints.map(p=>p[1]))-28:0,br=work?Math.max(...pagePoints.map(p=>p[0]))+28:900,bb=work?Math.max(...pagePoints.map(p=>p[1]))+28:layout.height;
 if(work)for(const ref of layout.labels){bx=Math.min(bx,ref.labelX-badgeWidth/2-18);br=Math.max(br,ref.labelX+badgeWidth/2+18);by=Math.min(by,ref.labelY-30);bb=Math.max(bb,ref.labelY+30);}
 for(const dim of placed){
  bx=Math.min(bx,dim.box.x-22);by=Math.min(by,dim.box.y-22);br=Math.max(br,dim.box.x+dim.box.w+22);bb=Math.max(bb,dim.box.y+dim.box.h+42);
  const midpoint=[(dim.a[0]+dim.b[0])/2,(dim.a[1]+dim.b[1])/2];
  el('line',{x1:midpoint[0],y1:midpoint[1],x2:dim.x,y2:dim.y,stroke:'#8ca697','stroke-width':1},leaders);
  const group=el('g',{'data-length':dim.id,transform:`translate(${dim.x} ${dim.y}) rotate(${dim.angle})`,class:'length-dimension'},labels);
  el('title',{},group).textContent=dim.id+' · '+dim.text+(work?'':' mm');
  el('rect',{x:-dim.width/2,y:-dim.height/2,width:dim.width,height:dim.height,rx:5,fill:'#ffffff'},group);
  el('text',{x:0,y:fontSize*.34,'text-anchor':'middle','font-family':'var(--app-font, sans-serif)','font-size':fontSize,'font-weight':600,fill:'#176748'},group).textContent=dim.text;
  if(!work){makeEditable(group,'length',dim.index);group.setAttribute('aria-label',dim.id+' · '+dim.text+' mm');}
 }
 for(const[label,p]of[['A',g.start],['B',g.end]]){
  const q=P(p),e=el('g',{class:'endpoint'},ends);el('circle',{cx:q[0],cy:q[1],r:23,fill:'transparent'},e);el('circle',{cx:q[0],cy:q[1],r:16,fill:label===end?'#16815d':'#183c36',stroke:'white','stroke-width':3},e);el('text',{x:q[0],y:q[1]+5,fill:'white','font-size':14,'font-weight':700,'text-anchor':'middle'},e).textContent=label;
  if(work)continue;e.setAttribute('role','button');e.setAttribute('tabindex','0');e.setAttribute('aria-label',t('Tilføj buk ved ende ')+label);const select=()=>{end=label;render();$('angle').scrollIntoView({behavior:'smooth',block:'center'});$('angle').focus({preventScroll:true});};e.onclick=select;e.onkeydown=k=>{if(k.key==='Enter'||k.key===' '){k.preventDefault();select();}};
 }
 setBounds({x:bx,y:by,w:br-bx,h:bb-by});
}

function renderReferences(g,container,work=false){container.replaceChildren();for(const type of ['length','angle']){const col=document.createElement('section'),heading=document.createElement('h3');heading.textContent=t(type==='length'?'Længder':'Bukkevinkler');col.append(heading);const list=type==='length'?g.lines:g.arcs;for(let i=0;i<list.length;i++){const item=list[i],row=document.createElement(work?'div':'button');row.className='reference-row';const id=(type==='length'?'L':'B')+(i+1),ref=document.createElement('strong'),value=document.createElement('span');ref.className=type==='angle'?'bend-ref':'length-ref';ref.textContent=id;value.textContent=type==='length'?fmt(item.length)+' mm':fmt(Math.abs(item.turn))+'° · '+t(item.turn>0?'Venstre':'Højre');row.append(ref,value);if(!work){row.type='button';row.setAttribute('aria-label',id+' · '+value.textContent);row.onclick=()=>openEdit(type,i);}col.append(row);}container.append(col);}container.hidden=!g.lines.length;}

$('add-form').onsubmit=e=>{e.preventDefault();if(!state.configured){openPipeSettings('new');return;}if(!ready())return;if(state.lengths.length>=200){alert(t('Maks. 200 stykker pr. projekt.'));return;}commit(extend(state,end,params().length,params().turn));};$('mirror').onclick=()=>{sign*=-1;render();};for(const k of['length','angle','unit'])$(k).oninput=render;$('undo').onclick=()=>{if(history.length){state=history.pop();save();sync();render();}};$('reset').onclick=()=>openPipeSettings('new');

let py=NaN,off=NaN;function updateTools(){py=triangle($('solve').value,+$('p1').value,+$('p2').value);$('pyth-result').textContent=fmt(py)+' mm';$('use-pyth').disabled=!Number.isFinite(py)||py<=0;$('pyth-angle').textContent=Number.isFinite(py)?t('a² + b² = c² · Retvinklet trekant'):t('Hypotenusen skal være større end den kendte katete.');drawTriangle();const displacement=Number($('offset').value),bendAngle=Number($('offset-angle').value),factor=Number($('offset-factor').value),offsetUnit=$('offset-unit').value;
 off=bendAngle>0&&bendAngle<=90?practicalOffsetLength(displacement,factor):NaN;
 const formatOffset=n=>Number.isFinite(n)?n.toLocaleString(locales[language],{maximumFractionDigits:3}):'—',formatFactor=n=>n.toLocaleString(locales[language],{maximumFractionDigits:12});
 $('offset-result').textContent=formatOffset(off)+' '+offsetUnit;
 $('offset-formula').textContent=Number.isFinite(off)?formatOffset(displacement)+' × '+formatFactor(factor)+' = '+formatOffset(off)+' '+offsetUnit:t('Kontrollér forskydning, vinkel og faktor.');
 renderOffsetVisualization($('offset-svg'),{offset:displacement,angle:bendAngle,length:off,factor,unit:offsetUnit,rotation:offsetRotation,mirror:offsetMirror},t,formatOffset);
 $('offset-mirror').setAttribute('aria-pressed',String(offsetMirror));}$('solve').onchange=()=>{const m=$('solve').value;$('p1-label').firstChild.textContent=(m==='a'?'b':'a')+' · mm';$('p2-label').firstChild.textContent=(m==='c'?'b':'c')+' · mm';updateTools();};for(const k of['p1','p2','offset','offset-factor'])$(k).oninput=updateTools;$('offset-angle').oninput=()=>{const a=Number($('offset-angle').value);if(a>0&&a<=90)$('offset-factor').value=a===45?'1.4':String(Number((1/Math.sin(a*Math.PI/180)).toFixed(3)));updateTools();};let currentOffsetUnit='cm';$('offset-unit').onchange=()=>{const next=$('offset-unit').value;if(next!==currentOffsetUnit){$('offset').value=String(Number($('offset').value)*(next==='mm'?10:.1));currentOffsetUnit=next;}updateTools();};function use(v){$('length').value=Math.round(v*1000)/1000;$('unit').value='1';render();$('length').scrollIntoView({behavior:'smooth',block:'center'});$('length').focus({preventScroll:true});}$('use-pyth').onclick=()=>use(py);
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=(state.name.replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g,'_')||'pipe-bend')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('import').onclick=()=>$('file').click();$('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>100000)throw Error();const s=JSON.parse(await f.text());if(!valid(s))throw Error();if(state.lengths.length&&!confirm(t('Erstat det åbne projekt med filen?')))return;commit(normalizeProject(s));}catch{alert(t('Filen er ikke et gyldigt Pipe-bend-projekt.'));}finally{e.target.value='';}};$('print').onclick=()=>{renderWork();window.print();};
let calc=NaN;function calcUpdate(){try{calc=calculate($('expression').value);$('calc-result').textContent=fmt(calc);}catch{calc=NaN;$('calc-result').textContent=$('expression').value?t('Kontrollér regnestykket'):'0';}$('use-calc').disabled=!Number.isFinite(calc)||calc<=0;}for(const k of['7','8','9','÷','4','5','6','×','1','2','3','−','0',',','⌫','+','(',')','C','=']){const b=document.createElement('button');b.textContent=k;b.onclick=()=>{const f=$('expression');if(k==='C')f.value='';else if(k==='⌫')f.value=f.value.slice(0,-1);else if(k!=='=')f.value+=k==='−'?'-':k;calcUpdate();};$('keys').append(b);}$('expression').oninput=calcUpdate;$('calculator-open').onclick=()=>{$('calculator').showModal();calcUpdate();};$('use-calc').onclick=()=>{if(Number.isFinite(calc)&&calc>0){$('calculator').close();use(calc);}};let installPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});$('install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;}else $('install-help').showModal();};if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{$('error').textContent=t('Offlinefunktionen kræver HTTPS eller localhost.');});initAppSharing();captureTranslations();applyLanguage(language);$('language').value=language;sync();render();

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

$('language').onchange=()=>{applyLanguage($('language').value);render();$('pyth-visual').querySelector('summary').textContent=t($('pyth-visual').open?'Skjul trekant':'Vis trekant');$('offset-visual').querySelector('summary').textContent=t($('offset-visual').open?'Skjul forskydning':'Vis forskydning');if($('calculator').open)calcUpdate();};

function makeEditable(node,type,index){node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label',t(type==='length'?'Rediger stykke {n}':'Rediger buk {n}',{n:index+1}));node.onclick=()=>openEdit(type,index);node.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openEdit(type,index);}};}
function openEdit(type,index){editing={type,index};const angle=type==='angle';$('edit-title').textContent=t(angle?'Rediger vinkel':'Rediger længde')+' · '+(index+1);$('edit-label').textContent=t(angle?'Bukkevinkel · grader':'Længde · mm');$('edit-direction-label').hidden=!angle;$('edit-value').value=angle?Math.abs(state.turns[index]):state.lengths[index];$('edit-value').min=angle?'0.1':'0.1';if(angle)$('edit-value').max='179';else $('edit-value').removeAttribute('max');$('edit-direction').value=String(Math.sign(state.turns[index]||1));$('edit-error').textContent='';$('edit-dialog').showModal();$('edit-value').focus();$('edit-value').select();}
$('edit-cancel').onclick=()=>$('edit-dialog').close();
$('edit-form').onsubmit=e=>{e.preventDefault();if(!editing)return;const n=structuredClone(state),value=Number($('edit-value').value);if(editing.type==='length')n.lengths[editing.index]=value;else n.turns[editing.index]=value*Number($('edit-direction').value);if(!valid(n)){$('edit-error').textContent=t('Indtast en gyldig længde eller vinkel.');return;}commit(n);$('edit-dialog').close();editing=null;};

function applyCamera(){const w=camera.width/camera.zoom,h=camera.height/camera.zoom;$('drawing').setAttribute('viewBox',`${camera.x-w/2} ${camera.y-h/2} ${w} ${h}`);$('zoom-level').textContent=Math.round(camera.zoom*100)+'%';$('zoom-in').disabled=camera.zoom>=8;$('zoom-out').disabled=camera.zoom<=1;}
function zoomTo(next,anchor){const old=camera.zoom;camera.zoom=Math.min(8,Math.max(1,next));if(anchor){const ratio=old/camera.zoom;camera.x=anchor.x+(camera.x-anchor.x)*ratio;camera.y=anchor.y+(camera.y-anchor.y)*ratio;}if(camera.zoom===1){camera.x=camera.baseX;camera.y=camera.baseY;}applyCamera();}
$('zoom-in').onclick=()=>zoomTo(camera.zoom*1.35);$('zoom-out').onclick=()=>zoomTo(camera.zoom/1.35);$('zoom-fit').onclick=()=>{camera.x=camera.baseX;camera.y=camera.baseY;zoomTo(1);};
const drawing=$('drawing'),pointers=new Map();let gesture=null,dragging=false;
drawing.addEventListener('wheel',e=>{e.preventDefault();const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(drawing.getScreenCTM().inverse());zoomTo(camera.zoom*Math.exp(-e.deltaY*.002),point);},{passive:false});
drawing.addEventListener('pointerdown',e=>{if(e.target.closest('[role="button"]'))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drawing.setPointerCapture(e.pointerId);if(pointers.size===2){const [a,b]=[...pointers.values()];gesture={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:camera.zoom};}dragging=false;});
drawing.addEventListener('pointermove',e=>{const old=pointers.get(e.pointerId);if(!old)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&gesture){const[a,b]=[...pointers.values()];zoomTo(gesture.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,gesture.distance));}else if(pointers.size===1){const m=drawing.getScreenCTM();camera.x-=(e.clientX-old.x)/m.a;camera.y-=(e.clientY-old.y)/m.d;applyCamera();}dragging=true;});
for(const event of ['pointerup','pointercancel','lostpointercapture'])drawing.addEventListener(event,e=>{pointers.delete(e.pointerId);gesture=null;});
drawing.addEventListener('keydown',e=>{if(e.target!==drawing)return;const step=45/camera.zoom;if(e.key==='+'||e.key==='=')zoomTo(camera.zoom*1.35);else if(e.key==='-')zoomTo(camera.zoom/1.35);else if(e.key==='0')$('zoom-fit').click();else if(e.key==='ArrowLeft')camera.x-=step;else if(e.key==='ArrowRight')camera.x+=step;else if(e.key==='ArrowUp')camera.y-=step;else if(e.key==='ArrowDown')camera.y+=step;else return;e.preventDefault();applyCamera();});
function renderWork(){const g=geometry(state);$('work-name').textContent=state.name;$('work-number').textContent=state.drawingNumber||state.name;document.querySelector('.work-data-number').textContent=t('Tegningsnummer')+' · '+(state.drawingNumber||state.name);$('work-empty').textContent=g.lines.length?'':t('Opret først et rør i redigeringen.');$('work-specs').replaceChildren();for(const[key,value]of[['Udvendig diameter',state.diameter],['Godstykkelse',state.wall],['Bukkeradius',state.radius],['Udviklet længde',g.used],['Rest af helt rør',state.stock-g.used]]){const box=document.createElement('div'),label=document.createElement('span'),strong=document.createElement('strong');label.textContent=t(key);strong.textContent=fmt(value)+' mm';box.append(label,strong);$('work-specs').append(box);}draw(g,null,$('work-drawing'),true);renderReferences(g,$('work-references'),true);$('work-rows').replaceChildren();g.arcs.forEach((a,i)=>{const length=state.radius*Math.abs(a.turn)*Math.PI/180,row=document.createElement('tr');for(const value of['B'+(i+1),fmt(Math.abs(a.turn))+'°',t(a.turn>0?'Venstre':'Højre'),fmt(a.position),fmt(a.position+length/2),fmt(a.position+length),fmt(length)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}$('work-rows').append(row);});if(!g.arcs.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=7;cell.textContent=t('Ingen buk endnu. Tilføj et buk i redigeringen.');row.append(cell);$('work-rows').append(row);}drawBlank(g);$('work-svg').disabled=!g.lines.length;}
function drawBlank(g){const svg=$('work-blank');svg.replaceChildren();if(!g.lines.length)return;function el(tag,attrs,text){const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))node.setAttribute(k,v);if(text)node.textContent=text;svg.append(node);return node;}const scale=800/g.used;el('rect',{x:50,y:45,width:800,height:22,rx:5,fill:'#e3ebe8',stroke:'#617e73'});el('text',{x:50,y:26,'font-size':15,fill:'#183037'},'A · 0 mm');el('text',{x:850,y:26,'text-anchor':'end','font-size':15,fill:'#183037'},'B · '+fmt(g.used)+' mm');g.arcs.forEach((a,i)=>{const len=state.radius*Math.abs(a.turn)*Math.PI/180,x=50+a.position*scale;el('rect',{x,y:45,width:Math.max(1,len*scale),height:22,fill:'#f2943a'});el('line',{x1:x,y1:38,x2:x,y2:80,stroke:'#9c5719','stroke-width':1.5});el('text',{x:x+len*scale/2,y:98+(i%2)*19,'font-size':14,'text-anchor':'middle',fill:'#183037'},'B'+(i+1));});}
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
 if(pipeSettingsMode==='new'){$('name').value=t('Nyt rør');$('drawing-number').value=newDrawingNumber();}
 $('pipe-settings-title').textContent=t(pipeSettingsMode==='new'?'Nyt rør':'Rørindstillinger');
 $('pipe-settings-save').textContent=t(pipeSettingsMode==='new'?'Opret rør':'Gem ændringer');
 $('pipe-settings-error').textContent='';$('pipe-settings').showModal();$('name').focus();$('name').select();
}
$('pipe-settings-open').onclick=()=>openPipeSettings('edit');
$('pipe-settings-cancel').onclick=()=>$('pipe-settings').close();
$('pipe-settings').addEventListener('close',()=>{sync();if(!appMenu.open)menuTrigger.focus();});
$('pipe-settings-form').addEventListener('input',()=>{$('pipe-settings-error').textContent='';});
$('pipe-settings-form').onsubmit=event=>{
 event.preventDefault();const next={...state,configured:true};
 for(const key of ['name','stock','diameter','wall','radius'])next[key]=key==='name'?$(key).value.trim():Number($(key).value);
 next.drawingNumber=$('drawing-number').value.trim();
 if(pipeSettingsMode==='new'){next.lengths=[];next.turns=[];next.heading=0;}
 if(!next.name||!valid(next)){$('pipe-settings-error').textContent=t('Angiv et projektnavn og gyldige rørdimensioner. Godstykkelsen skal være under halvdelen af diameteren, og centerlinjeradius skal være større end halvdelen af diameteren.');return;}
 if(pipeSettingsMode==='new'){end='B';sign=1;camera.zoom=1;camera.x=camera.baseX;camera.y=camera.baseY;}
 commit(next);$('pipe-settings').close();$('length').scrollIntoView({block:'center',behavior:'smooth'});$('length').focus({preventScroll:true});
};
if(!state.configured)openPipeSettings('new');
