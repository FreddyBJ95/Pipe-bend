import {generateRoomRoute,validateRoomRoute} from './room-routing.mjs?v=21';

const words = {
  title:['Planlæg rør i rummet','Planlegg rør i rommet','Plan a pipe around the room'],
  intro:['Ovenfra · rektangulært rum · alle mål i mm','Ovenfra · rektangulært rom · alle mål i mm','Top view · rectangular room · all dimensions in mm'],
  close:['Luk','Lukk','Close'],room:['Rum','Rom','Room'],width:['Bredde','Bredde','Width'],height:['Dybde','Dybde','Depth'],
  pipe:['Rør og bukker','Rør og bøyer','Pipe and bender'],diameter:['Rørdiameter','Rørdiameter','Tube diameter'],radius:['Centerlinjeradius','Senterlinjeradius','Centerline radius'],
  toolHint:['Diameter og radius følger rørindstillingerne.','Diameter og radius følger rørinnstillingene.','Diameter and radius come from pipe settings.'],
  gap:['Fri afstand: væg → rørets yderside','Fri avstand: vegg → rørets utside','Clear distance: wall → outside of pipe'],
  clearance:['Fri afstand til forhindringer','Fri avstand til hindringer','Clearance from obstacles'],
  maxAngle:['Største vinkel pr. buk','Største vinkel per bøy','Maximum angle per bend'],
  direction:['Vej rundt i rummet','Vei rundt i rommet','Direction around room'],
  auto:['Automatisk forslag','Automatisk forslag','Automatic proposal'],clockwise:['Med uret','Med klokken','Clockwise'],counterclockwise:['Mod uret','Mot klokken','Counterclockwise'],
  ends:['Start og slut','Start og slutt','Start and end'],start:['Start A','Start A','Start A'],end:['Slut B','Slutt B','End B'],
  wall:['Væg','Vegg','Wall'],position:['Placering langs væggen','Plassering langs veggen','Position along wall'],
  bottom:['Nederste væg','Nederste vegg','Bottom wall'],right:['Højre væg','Høyre vegg','Right wall'],top:['Øverste væg','Øverste vegg','Top wall'],left:['Venstre væg','Venstre vegg','Left wall'],
  positionsHint:['Vandrette vægge måles fra venstre. Lodrette vægge måles fra bunden.','Vannrette vegger måles fra venstre. Loddrette vegger måles fra bunnen.','Measure horizontal walls from the left; vertical walls from the bottom.'],
  clips:['Klammer','Klammer','Pipe clips'],addClip:['Tilføj klamme','Legg til klammer','Add clip'],clip:['Klamme','Klammer','Clip'],
  obstacles:['Forhindringer på væggen','Hindringer på veggen','Wall obstacles'],addObstacle:['Tilføj forhindring','Legg til hindring','Add obstacle'],
  obstacle:['Forhindring','Hindring','Obstacle'],obstacleWidth:['Bredde langs væg','Bredde langs vegg','Width along wall'],obstacleDepth:['Fremspring fra væg','Fremspring fra vegg','Projection from wall'],
  remove:['Fjern','Fjern','Remove'],generate:['Foreslå rørføring','Foreslå rørføring','Propose pipe route'],
  preview:['Plantegning','Plantegning','Room plan'],previewEmpty:['Angiv rummet, og få et forslag.','Angi rommet, og få et forslag.','Enter the room and generate a proposal.'],
  geometryHint:['Forslaget kontrolleres med den valgte radius, klammer, vægge og forhindringer.','Forslaget kontrolleres med valgt radius, klammer, vegger og hindringer.','The proposal is checked against the selected radius, clips, walls and obstacles.'],
  noOptimality:['Forslaget er en mulig rørføring langs væggene.','Forslaget er en mulig rørføring langs veggene.','The proposal is one feasible route along the walls.'],
  route:['Ret forslagets hjørner','Endre forslagets hjørner','Edit proposed corners'],
  routeHint:['X måles fra venstre, Y fra bunden. Rettelser skal kontrolleres før brug.','X måles fra venstre, Y fra bunnen. Endringer må kontrolleres før bruk.','X is measured from the left and Y from the bottom. Validate edits before use.'],
  point:['Punkt','Punkt','Point'],addPoint:['Indsæt punkt før slut','Sett inn punkt før slutt','Insert point before end'],validate:['Kontrollér rettelser','Kontroller endringer','Validate edits'],
  apply:['Brug rørforslaget','Bruk rørforslaget','Use proposed pipe'],cancel:['Annuller','Avbryt','Cancel'],
  validated:['Rørføringen er kontrolleret.','Rørføringen er kontrollert.','The pipe route has been validated.'],
  edited:['Forslaget er ændret. Kontrollér rettelserne før brug.','Forslaget er endret. Kontroller endringene før bruk.','The proposal has changed. Validate the edits before use.'],
  changed:['Indstillingerne er ændret. Lav et nyt forslag.','Innstillingene er endret. Lag et nytt forslag.','Settings changed. Generate a new proposal.'],
  invalid:['Kontrollér de indtastede mål.','Kontroller målene du har skrevet inn.','Check the entered dimensions.'],
  unexpected:['Forslaget kunne ikke beregnes. Kontrollér mål og placeringer.','Forslaget kunne ikke beregnes. Kontroller mål og plasseringer.','The route could not be calculated. Check dimensions and positions.'],
  rejected:['Rørforslaget kunne ikke bruges.','Rørforslaget kunne ikke brukes.','The proposed pipe could not be applied.'],
  bends:['buk','bøy','bends'],length:['Geometrisk længde','Geometrisk lengde','Geometric length'],
  wallLegend:['Væg','Vegg','Wall'],clipLegend:['Klamme','Klammer','Clip'],obstacleLegend:['Forhindring','Hindring','Obstacle'],routeLegend:['Kontrolleret rør','Kontrollert rør','Validated pipe'],draftLegend:['Ukontrolleret rettelse','Ukontrollert endring','Unvalidated edit'],
  endEditing:['Du kan fortsætte med at rette længder og vinkler i appen.','Du kan fortsette med å endre lengder og vinkler i appen.','You can keep editing lengths and angles in the app.'],
};
const wallIds=['bottom','right','top','left'];
const clone=value=>JSON.parse(JSON.stringify(value));
const routeErrors={
  INVALID_INPUT:['Kontroller rommål, rørdiameter, bøyeradius, veggavstand og maksimal vinkel. Bruk gyldige tall, høyst 100 klammer og 40 hindringer.','Check the room size, tube diameter, bend radius, wall gap and maximum angle. Use finite numbers, at most 100 clips and 40 obstacles.'],
  INVALID_ENDPOINT:['Start og slutt må ligge på en gyldig vegg, med plass til rørets utside. Kontroller vegg og plassering.','Start and end must be on valid walls with room for the outside of the pipe. Check their walls and positions.'],
  INVALID_CLIP:['Et klammer ligger utenfor rommet eller har ugyldig veggavstand. Kontroller klammernes vegger, plasseringer og avstander.','A clip is outside the room or has an invalid wall gap. Check the clips’ walls, positions and gaps.'],
  INVALID_OBSTACLE:['En hindring har ugyldige mål eller ligger utenfor veggen. Kontroller plassering, bredde og fremspring.','An obstacle has invalid dimensions or extends past its wall. Check its position, width and projection.'],
  IDENTICAL_ENDPOINTS:['Start og slutt ligger i samme punkt. Flytt ett av endepunktene.','Start and end are the same point. Move one of the endpoints.'],
  BLOCKED_ANCHOR:['{id} ligger for nær en hindring. Flytt punktet eller øk veggavstanden.','{id} is too close to an obstacle. Move the point or increase its wall gap.'],
  INVALID_POINTS:['Rørføringen må ha minst to gyldige punkter. Kontroller punktenes X- og Y-mål.','The route needs at least two valid points. Check the points’ X and Y coordinates.'],
  TOO_MANY_BENDS:['Forslaget krever mer enn 200 rette stykker. Bruk større bukkevinkler eller færre hjørner.','The proposal needs more than 200 straight sections. Use larger bend angles or fewer corners.'],
  ZERO_LENGTH:['To hjørner ligger i samme punkt. Flytt eller fjern ett av punktene.','Two corners are at the same point. Move or remove one of them.'],
  REVERSAL:['Rørføringen snur rett tilbake i et hjørne. Flytt eller fjern dette hjørnet.','The route doubles directly back at a corner. Move or remove that corner.'],
  MAX_ANGLE:['En bøy på {angle}° overstiger maksimal vinkel på {limit}°. Flytt hjørnet eller øk den tillatte vinkelen.','A {angle}° bend exceeds the {limit}° maximum. Move the corner or increase the allowed angle.'],
  INSUFFICIENT_STRAIGHT:['Det er ikke plass til bøyeradiusen mellom hjørnene. Flytt punktene lenger fra hverandre eller bruk mindre radius.','There is not enough straight length for the bend radius between corners. Move the points farther apart or use a smaller radius.'],
  WALL_COLLISION:['Rørets utside kommer utenfor rommet. Flytt hjørnene inn fra veggene.','The outside of the pipe leaves the room. Move the corners inward from the walls.'],
  OBSTACLE_COLLISION:['Røret treffer en hindring eller har for liten fri avstand. Flytt hjørnene lenger fra hindringen.','The pipe hits an obstacle or has insufficient clearance. Move the corners farther from the obstacle.'],
  MISSED_CLIP:['Røret går ikke gjennom klammer {id} på et rett stykke langs veggen. Flytt hjørnene eller klammeret.','The pipe does not pass through clip {id} on a straight section parallel to the wall. Move the corners or the clip.'],
  SELF_COLLISION:['Rørføringen krysser seg selv eller kommer for nær seg selv. Flytt eller fjern hjørner.','The route crosses itself or passes too close to itself. Move or remove corners.'],
  ENDPOINT_MISMATCH:['Rørføringens ender passer ikke til valgt start og slutt. Gjenopprett endepunktene eller endre start- og sluttplasseringen.','The route ends do not match the selected start and end. Restore the endpoints or change the start/end positions.'],
  CLIP_SPACE:['Det er ikke plass til klammernes veggavstander mellom hindringene. Flytt klammer eller hindringer, eller reduser avstandene.','There is not enough space for the clips’ wall gaps between obstacles. Move clips or obstacles, or reduce the gaps.'],
  ENDPOINT_SPACE:['Start eller slutt ligger for nær et hjørne eller en hindring. Flytt endepunktet lenger langs veggen.','Start or end is too close to a corner or obstacle. Move the endpoint farther along the wall.'],
  MAX_ANGLE_SPACE:['Det er ikke plass til den valgte maksimale bukkevinkelen. Prøv større vinkel, mindre radius eller mer plass.','There is not enough space for the selected maximum bend angle. Try a larger angle, a smaller radius or more space.'],
  NO_ROUTE:['Fant ingen kontrollert rørføring langs veggene. Kontroller rommål, klammer, hindringer, veggavstand og bøyeradius.','No validated route along the walls was found. Check the room dimensions, clips, obstacles, wall gap and bend radius.'],
  ROUTE_COMPLEXITY:['Rørføringen er for komplisert å kontrollere. Bruk færre punkter, klammer eller hindringer, eller større bukkevinkler.','The route is too complex to validate. Use fewer points, clips or obstacles, or larger bend angles.'],
};

/** Keep detailed source errors in Danish, and provide actionable translated errors elsewhere. */
export function roomPlannerError(result,language='da') {
  const fallback=language==='en'?'The route could not be calculated. Check dimensions and positions.':language==='nb'?'Rørføringen kunne ikke beregnes. Kontroller mål og plasseringer.':'Rørføringen kunne ikke beregnes. Kontrollér mål og placeringer.';
  if(language!=='nb'&&language!=='en')return result?.error||fallback;
  if(!result?.code)return result?.error||fallback;
  const source=String(result.error||'');
  const id=result.anchorId??result.clipId??result.id??(result.code==='BLOCKED_ANCHOR'?source.match(/^(.+?) ligger for tæt på/)?.[1]:source.match(/klamme (.+?) på et lige stykke/)?.[1]);
  const pointName=id==='Start'?'Start A':id==='Slut'?(language==='en'?'End B':'Slutt B'):id|| (language==='en'?'the selected point':'det valgte punktet');
  const angles=source.match(/Et buk på ([\d.,]+)° overstiger den maksimale vinkel på ([\d.,]+)°/);
  const values={id:pointName,angle:result.angle??angles?.[1]??'?',limit:result.maxAngle??angles?.[2]??'?'};
  const translated=code=>(routeErrors[code==='TOO_COMPLEX'?'ROUTE_COMPLEXITY':code]||routeErrors.NO_ROUTE)[language==='en'?1:0].replace(/\{(\w+)\}/g,(_,key)=>String(values[key]));
  let message=translated(result.code);
  if(result.code==='NO_ROUTE') {
    const detail=[['BLOCKED_ANCHOR',/ligger for tæt på en forhindring/],['MISSED_CLIP',/passer ikke gennem klamme/],['OBSTACLE_COLLISION',/rammer en forhindring/],['INSUFFICIENT_STRAIGHT',/ikke plads til bukkeradius/],['MAX_ANGLE_SPACE',/ikke plads til den valgte maksimale bukkevinkel/],['CLIP_SPACE',/klammernes vægafstande/],['ENDPOINT_SPACE',/Start eller slut ligger for tæt/]].find(([,pattern])=>pattern.test(source));
    if(detail)message+=' '+translated(detail[0]);
  }
  return message;
}

/** Append a self-contained room planner; the host owns committing a proposal. */
export function initRoomPlanner({getProject,onApply,language}) {
  let draftPoints=[], result=null, returnFocus=null, seq=2;
  const dialog=document.createElement('dialog');
  dialog.id='room-planner';
  dialog.className='room-planner';
  dialog.setAttribute('aria-labelledby','rp-title');
  const languageValue=()=>typeof language==='function'?language():language||document.documentElement.lang||'da';
  const tr=key=>words[key]?.[{da:0,nb:1,en:2}[languageValue()]??0]??key;
  const el=(tag,attrs={},text)=>{
    const node=document.createElement(tag);
    for(const [name,value] of Object.entries(attrs)) {
      if(name==='class')node.className=value;
      else node.setAttribute(name,String(value));
    }
    if(text!==undefined)node.textContent=text;
    return node;
  };
  const translated=(tag,key,attrs={})=>el(tag,{'data-rp-text':key,...attrs},tr(key));
  const button=(key,action,attrs={})=>{
    const node=translated('button',key,{type:'button',...attrs});node.addEventListener('click',action);return node;
  };
  const q=id=>dialog.querySelector('#'+id);
  function numberField(parent,id,key,value,min=0) {
    const label=translated('label',key,{for:id});
    const input=el('input',{id,type:'number',min,step:'any',required:''});
    input.value=String(value);label.append(input);parent.append(label);return input;
  }
  function wallSelect(value='bottom',id) {
    const select=el('select',id?{id}:{});
    for(const wall of wallIds)select.append(translated('option',wall,{value:wall}));
    select.value=value;return select;
  }
  const heading=el('div',{class:'rp-heading'});
  const titleWrap=el('div');titleWrap.append(translated('h2','title',{id:'rp-title'}),translated('p','intro',{class:'rp-intro'}));
  heading.append(titleWrap,button('close',()=>dialog.close()));
  const form=el('form',{id:'rp-form'});
  form.addEventListener('submit',event=>event.preventDefault());
  const columns=el('div',{class:'rp-columns'}),settings=el('div',{class:'rp-settings'}),visual=el('div',{class:'rp-visual'});
  function fieldset(key) {const section=el('fieldset',{class:'rp-section'});section.append(translated('legend',key));settings.append(section);return section;}
  const room=fieldset('room'),roomFields=el('div',{class:'rp-fields'});room.append(roomFields);
  numberField(roomFields,'rp-width','width',4000,100);numberField(roomFields,'rp-height','height',3000,100);
  const pipe=fieldset('pipe');
  pipe.append(el('p',{id:'rp-tool-summary',class:'rp-tool-summary'}),translated('p','toolHint',{class:'rp-hint'}));
  numberField(pipe,'rp-gap','gap',50);
  const pipeFields=el('div',{class:'rp-fields'});pipe.append(pipeFields);
  numberField(pipeFields,'rp-clearance','clearance',10);
  const angleLabel=translated('label','maxAngle',{for:'rp-max-angle'}),angle=el('select',{id:'rp-max-angle'});
  for(const value of [30,45,60,90])angle.append(el('option',{value},value+'°'));
  angle.value='45';angleLabel.append(angle);pipeFields.append(angleLabel);
  const directionLabel=translated('label','direction',{for:'rp-direction'}),direction=el('select',{id:'rp-direction'});
  for(const key of ['auto','clockwise','counterclockwise'])direction.append(translated('option',key,{value:key}));
  directionLabel.append(direction);pipe.append(directionLabel);
  const ends=fieldset('ends'),endFields=el('div',{class:'rp-end-fields'});ends.append(endFields);
  for(const key of ['start','end']) {
    const block=el('div');block.append(translated('h3',key));
    const label=translated('label','wall',{for:'rp-'+key+'-wall'});label.append(wallSelect('bottom','rp-'+key+'-wall'));block.append(label);
    numberField(block,'rp-'+key+'-position','position',key==='start'?200:3800);endFields.append(block);
  }
  ends.append(translated('p','positionsHint',{class:'rp-hint'}));
  const clips=fieldset('clips');clips.append(el('div',{id:'rp-clips',class:'rp-list'}),button('addClip',()=>{addClip({wall:'bottom',position:1000,gap:Number(q('rp-gap').value)});invalidate(true);}));
  const obstacles=fieldset('obstacles');obstacles.append(el('div',{id:'rp-obstacles',class:'rp-list'}),button('addObstacle',()=>{addObstacle({wall:'bottom',position:1500,width:200,depth:300});invalidate(true);}));
  settings.append(button('generate',generate,{id:'rp-generate',class:'primary'}));
  visual.append(translated('h3','preview'));
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='rp-svg';svg.setAttribute('role','img');visual.append(svg);
  const legend=el('div',{class:'rp-legend'});
  for(const [cls,key]of [['wall','wallLegend'],['clip','clipLegend'],['obstacle','obstacleLegend'],['route','routeLegend']]) {
    const item=el('span');item.append(el('i',{class:'rp-key rp-key-'+cls,'aria-hidden':'true'}),translated('span',key));legend.append(item);
  }
  visual.append(legend,el('p',{id:'rp-summary',class:'rp-summary','aria-live':'polite'}),translated('p','geometryHint',{class:'rp-hint'}),translated('p','noOptimality',{class:'rp-hint'}));
  const routeEditor=el('section',{id:'rp-route-editor',class:'rp-route-editor',hidden:''});
  routeEditor.append(translated('h3','route'),translated('p','routeHint',{class:'rp-hint'}));
  const tableWrap=el('div',{class:'rp-table-wrap'}),table=el('table');
  const thead=el('thead'),headerRow=el('tr');
  headerRow.append(translated('th','point'),el('th',{},'X · mm'),el('th',{},'Y · mm'),el('th',{},''));thead.append(headerRow);table.append(thead,el('tbody',{id:'rp-points'}));tableWrap.append(table);routeEditor.append(tableWrap);
  const editActions=el('div',{class:'rp-edit-actions'});editActions.append(button('addPoint',addPoint,{id:'rp-add-point'}),button('validate',validate,{id:'rp-validate'}));routeEditor.append(editActions);visual.append(routeEditor);
  columns.append(settings,visual);form.append(columns);
  const status=el('p',{id:'rp-status',class:'rp-status',role:'status','aria-live':'polite'}),error=el('p',{id:'rp-error',class:'rp-error',role:'alert'});
  const actions=el('div',{class:'rp-actions'});actions.append(button('cancel',()=>dialog.close()),button('apply',apply,{id:'rp-apply',class:'primary',disabled:''}));
  dialog.append(heading,form,status,error,translated('p','endEditing',{class:'rp-hint'}),actions);document.body.append(dialog);
  form.addEventListener('input',event=>{
    if(event.target.closest('#rp-points')) {readPoints();invalidate(false);}else invalidate(true);
  });
  form.addEventListener('change',event=>{if(event.target.tagName==='SELECT')invalidate(true);});
  dialog.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();});

  function rowField(row,key,value,type='number') {
    const label=translated('label',key),input=el('input',{type,step:'any',min:0,required:'','data-rp-field':key});input.value=String(value);label.append(input);row.append(label);return input;
  }
  function rowId(prefix,provided) {
    const used=new Set([...dialog.querySelectorAll('[data-rp-id]')].map(node=>node.dataset.rpId));
    if(provided&&!used.has(provided))return provided;
    let id;do{id=prefix+'-'+seq++;}while(used.has(id));return id;
  }
  function rowWall(row,value) {const label=translated('label','wall'),select=wallSelect(value);select.dataset.rpField='wall';label.append(select);row.append(label);return select;}
  function addClip(data) {
    const row=el('div',{class:'rp-entry','data-rp-id':rowId('clip',data.id)});
    row.append(translated('strong','clip',{class:'rp-entry-title'}));rowWall(row,data.wall||'bottom');
    rowField(row,'position',data.position??0);rowField(row,'gap',data.gap??Number(q('rp-gap').value));
    row.append(button('remove',()=>{row.remove();invalidate(true);},{class:'rp-remove'}));q('rp-clips').append(row);
  }
  function addObstacle(data) {
    const row=el('div',{class:'rp-entry rp-obstacle-entry','data-rp-id':rowId('obstacle',data.id)});
    row.append(translated('strong','obstacle',{class:'rp-entry-title'}));rowWall(row,data.wall||'bottom');
    rowField(row,'position',data.position??0);rowField(row,'obstacleWidth',data.width??200);rowField(row,'obstacleDepth',data.depth??300);
    row.append(button('remove',()=>{row.remove();invalidate(true);},{class:'rp-remove'}));q('rp-obstacles').append(row);
  }
  const value=id=>Number(q(id).value);
  function rowData(row) {return Object.fromEntries([...row.querySelectorAll('[data-rp-field]')].map(input=>[input.dataset.rpField,input.tagName==='SELECT'?input.value:Number(input.value)]));}
  function input() {
    const project=getProject();
    return {width:value('rp-width'),height:value('rp-height'),diameter:Number(project.diameter),radius:Number(project.radius),wallGap:value('rp-gap'),clearance:value('rp-clearance'),maxAngle:value('rp-max-angle'),direction:q('rp-direction').value,
      start:{wall:q('rp-start-wall').value,position:value('rp-start-position')},end:{wall:q('rp-end-wall').value,position:value('rp-end-position')},
      clips:[...q('rp-clips').children].map(row=>{const data=rowData(row);return {id:row.dataset.rpId,wall:data.wall,position:data.position,gap:data.gap};}),
      obstacles:[...q('rp-obstacles').children].map(row=>{const data=rowData(row);return {id:row.dataset.rpId,wall:data.wall,position:data.position,width:data.obstacleWidth,depth:data.obstacleDepth};})};
  }
  function writeInput(data) {
    for(const [id,key]of [['rp-width','width'],['rp-height','height'],['rp-gap','wallGap'],['rp-clearance','clearance'],['rp-max-angle','maxAngle'],['rp-direction','direction']])q(id).value=String(data[key]);
    for(const key of ['start','end']) {q('rp-'+key+'-wall').value=data[key].wall;q('rp-'+key+'-position').value=String(data[key].position);}
    q('rp-clips').replaceChildren();q('rp-obstacles').replaceChildren();(data.clips||[]).forEach(addClip);(data.obstacles||[]).forEach(addObstacle);
  }
  function showError(message) {error.textContent=message||'';}
  function invalidate(clear) {
    result=null;q('rp-apply').disabled=true;showError('');status.textContent=tr(clear?'changed':'edited');q('rp-summary').textContent='';
    if(clear){draftPoints=[];renderPoints();}draw();
  }
  function accept(next,data) {
    if(!next?.ok){result=null;q('rp-apply').disabled=true;showError(roomPlannerError(next,languageValue()));status.textContent='';draw();return false;}
    result=next;draftPoints=clone(next.points);q('rp-apply').disabled=false;showError('');status.textContent=tr('validated');
    const length=Number(next.geometricLength);q('rp-summary').textContent=next.turns.length+' '+tr('bends')+(Number.isFinite(length)?' · '+tr('length')+': '+format(length)+' mm':'');
    renderPoints();draw();return true;
  }
  function generate() {
    if(![...settings.querySelectorAll('input,select')].every(field=>field.reportValidity())){showError(tr('invalid'));return;}
    try{const data=input();accept(generateRoomRoute(data),data);}catch{accept({ok:false,error:tr('unexpected')});}
  }
  function validate() {
    if(!form.reportValidity()){showError(tr('invalid'));return;}
    try{readPoints();const data=input();accept(validateRoomRoute(data,draftPoints),data);}catch{accept({ok:false,error:tr('unexpected')});}
  }
  function readPoints() {
    const coordinate=field=>field.value===field.dataset.shownValue?Number(field.dataset.originalValue):Number(field.value);
    draftPoints=[...q('rp-points').children].map(row=>[coordinate(row.querySelector('[data-axis="x"]')),coordinate(row.querySelector('[data-axis="y"]'))]);
  }
  function renderPoints() {
    q('rp-route-editor').hidden=draftPoints.length<2;q('rp-points').replaceChildren();
    draftPoints.forEach((point,index)=>{
      const row=el('tr');row.append(el('th',{scope:'row'},index===0?'A':index===draftPoints.length-1?'B':String(index)));
      for(const [axis,n]of [['x',0],['y',1]]) {
        const shown=String(Math.round(point[n]*1000)/1000);
        const cell=el('td'),field=el('input',{type:'number',step:'any',min:0,required:'','data-axis':axis,'data-original-value':point[n],'data-shown-value':shown,'aria-label':tr('point')+' '+(index+1)+' · '+axis.toUpperCase()+' mm'});field.value=shown;cell.append(field);row.append(cell);
      }
      const last=el('td');if(index>0&&index<draftPoints.length-1)last.append(button('remove',()=>{readPoints();draftPoints.splice(index,1);renderPoints();invalidate(false);},{class:'rp-remove'}));row.append(last);q('rp-points').append(row);
    });
  }
  function addPoint() {
    if(draftPoints.length<2)return;readPoints();const a=draftPoints.at(-2),b=draftPoints.at(-1);draftPoints.splice(draftPoints.length-1,0,[(a[0]+b[0])/2,(a[1]+b[1])/2]);renderPoints();invalidate(false);
  }
  async function apply() {
    if(!result?.ok||!form.reportValidity())return;
    try{
      readPoints();const data=input(),checked=validateRoomRoute(data,draftPoints);
      if(!accept(checked,data))return;
      q('rp-apply').disabled=true;
      await onApply({lengths:clone(checked.lengths),turns:clone(checked.turns),heading:checked.heading,start:clone(checked.start),planner:{version:1,input:clone(data),points:clone(checked.points)}});
      dialog.close();
    }catch(exception){showError(exception?.message||tr('rejected'));q('rp-apply').disabled=!result?.ok;}
  }
  function format(number) {return number.toLocaleString({da:'da-DK',nb:'nb-NO',en:'en-GB'}[languageValue()]||'da-DK',{maximumFractionDigits:1});}
  function refresh() {
    for(const node of dialog.querySelectorAll('[data-rp-text]')){
      const key=node.dataset.rpText;
      if(node.tagName==='LABEL'){
        const first=node.firstChild;if(first?.nodeType===3)first.nodeValue=tr(key);else node.prepend(document.createTextNode(tr(key)));
      }else node.textContent=tr(key);
    }
    const p=getProject();q('rp-tool-summary').textContent=tr('diameter')+': '+format(Number(p.diameter))+' mm · '+tr('radius')+': '+format(Number(p.radius))+' mm';
    if(dialog.open)draw();
  }
  function defaultInput() {return {width:4000,height:3000,wallGap:50,clearance:10,maxAngle:45,direction:'auto',start:{wall:'bottom',position:200},end:{wall:'bottom',position:3800},clips:[{id:'clip-1',wall:'bottom',position:600,gap:50},{id:'clip-2',wall:'bottom',position:3400,gap:50}],obstacles:[{id:'beam-1',wall:'bottom',position:1800,width:250,depth:300}]};}
  function open() {
    const active=document.activeElement;
    returnFocus=active?.closest('#app-menu')?document.querySelector('#app-menu > summary'):active;
    const stored=getProject().planner;
    writeInput(stored?.version===1&&stored.input?{...defaultInput(),...clone(stored.input)}:defaultInput());
    draftPoints=stored?.version===1&&Array.isArray(stored.points)?clone(stored.points):[];result=null;q('rp-apply').disabled=true;status.textContent='';showError('');q('rp-summary').textContent='';
    refresh();renderPoints();dialog.showModal();draw();
    if(draftPoints.length>=2){try{const data=input();accept(validateRoomRoute(data,draftPoints),data);}catch{showError(tr('unexpected'));}}
    else q('rp-summary').textContent=tr('previewEmpty');
  }
  function wallPoint(data,entry) {
    const d=(Number(entry.gap??data.wallGap)||0)+data.diameter/2,p=Number(entry.position);
    return entry.wall==='bottom'?[p,d]:entry.wall==='top'?[p,data.height-d]:entry.wall==='left'?[d,p]:[data.width-d,p];
  }
  function obstacleRect(data,item) {return item.wall==='bottom'?[item.position,0,item.width,item.depth]:item.wall==='top'?[item.position,data.height-item.depth,item.width,item.depth]:item.wall==='left'?[0,item.position,item.depth,item.width]:[data.width-item.depth,item.position,item.depth,item.width];}
  function draw() {
    if(!dialog.open)return;
    const data=input();if(![data.width,data.height].every(v=>Number.isFinite(v)&&v>0))return;
    const width=Math.max(280,visual.clientWidth||600),height=width<480?330:420,margin=44;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('height',String(height));svg.replaceChildren();svg.setAttribute('aria-label',tr('preview'));
    const scale=Math.min((width-2*margin)/data.width,(height-2*margin)/data.height),ox=(width-data.width*scale)/2,oy=(height-data.height*scale)/2;
    const P=point=>[ox+point[0]*scale,height-oy-point[1]*scale];
    function s(tag,attrs,text) {const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;svg.append(node);return node;}
    const [rx,ry]=P([0,data.height]);s('rect',{x:rx,y:ry,width:data.width*scale,height:data.height*scale,class:'rp-room-box'});
    s('text',{x:width/2,y:ry-13,'text-anchor':'middle',class:'rp-svg-label'},format(data.width)+' mm');
    s('text',{x:rx-11,y:height/2,'text-anchor':'middle',transform:`rotate(-90 ${rx-11} ${height/2})`,class:'rp-svg-label'},format(data.height)+' mm');
    for(const item of data.obstacles) {const [x,y,w,h]=obstacleRect(data,item);if(![x,y,w,h].every(Number.isFinite))continue;const point=P([x,y+h]);const rect=s('rect',{x:point[0],y:point[1],width:Math.max(1,w*scale),height:Math.max(1,h*scale),class:'rp-obstacle'});const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=tr('obstacle')+' · '+format(w)+' × '+format(h)+' mm';rect.append(title);}
    const samples=result?.ok&&Array.isArray(result.pathPoints)?result.pathPoints:draftPoints;
    if(samples.length>1) s('polyline',{points:samples.map(P).map(point=>point.join(',')).join(' '),class:result?.ok?'rp-pipe-route':'rp-pipe-draft','stroke-width':Math.max(3,Math.min(9,data.diameter*scale))});
    data.clips.forEach((clip,index)=>{const point=P(wallPoint(data,clip));if(!point.every(Number.isFinite))return;s('circle',{cx:point[0],cy:point[1],r:5,class:'rp-clip'});s('text',{x:point[0]+9,y:point[1]-8,class:'rp-svg-label'},'K'+(index+1));});
    for(const [key,letter]of [['start','A'],['end','B']]) {const point=P(wallPoint(data,data[key]));if(!point.every(Number.isFinite))continue;s('circle',{cx:point[0],cy:point[1],r:11,class:'rp-end'});s('text',{x:point[0],y:point[1]+4,'text-anchor':'middle',class:'rp-end-label'},letter);}
  }
  if(typeof ResizeObserver==='function')new ResizeObserver(()=>draw()).observe(visual);
  refresh();
  return {open,refresh};
}
