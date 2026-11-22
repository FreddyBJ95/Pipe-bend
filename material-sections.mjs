import {bendMarkLayout} from './measurements.mjs';

const EPS=1e-7;
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const arcLength=arc=>finite(arc?.radius)&&finite(arc?.angle)?Math.abs(arc.radius*arc.angle):Array.isArray(arc?.samples)&&arc.samples.length>1?arc.samples.slice(1).reduce((sum,point,index)=>sum+Math.hypot(...point.map((value,axis)=>value-arc.samples[index][axis])),0):0;

export function jointClearance(project){const value=project?.jointClearance??50;return finite(value)&&value>=0?value:NaN;}

export function lineStations(geometry){
 let station=0;
 return geometry.lines.map((line,index)=>{const start=station,end=start+line.length;station=end+(geometry.arcs[index]?arcLength(geometry.arcs[index]):0);return{index,start,end,length:line.length};});
}

export function validateMaterialJoints(project,geometry){
 const joints=project?.joints;
 if(joints===undefined)return null;
 if(!Array.isArray(joints)||joints.length>99)return 'Projektet kan højst have 99 samlinger.';
 const clearance=jointClearance(project);
 if(!finite(clearance))return 'Mindste afstand fra en samling til et buk skal være 0 mm eller mere.';
 const seen=[];
 for(let index=0;index<joints.length;index++){
  const joint=joints[index],line=geometry?.lines?.[joint?.lineIndex];
  if(!joint||!Number.isInteger(joint.lineIndex)||!line||!finite(joint.distance)||!finite(joint.allowanceBefore??0)||!finite(joint.allowanceAfter??0)||(joint.allowanceBefore??0)<0||(joint.allowanceAfter??0)<0)return `Samling ${index+1} har ugyldige mål.`;
  if(joint.distance<clearance-EPS||joint.distance>line.length-clearance+EPS||joint.distance<=EPS||joint.distance>=line.length-EPS)return `Samling ${index+1} skal ligge på et lige stykke og mindst ${clearance} mm fra stykkets ender.`;
  if(seen.some(other=>other.lineIndex===joint.lineIndex&&Math.abs(other.distance-joint.distance)<.01))return 'To samlinger kan ikke ligge samme sted.';
  seen.push(joint);
 }
 return null;
}

export function sortedMaterialJoints(project,geometry){
 const stations=lineStations(geometry);
 return (project.joints??[]).map((joint,sourceIndex)=>({...joint,allowanceBefore:joint.allowanceBefore??0,allowanceAfter:joint.allowanceAfter??0,sourceIndex,station:stations[joint.lineIndex].start+joint.distance})).sort((a,b)=>a.station-b.station||a.sourceIndex-b.sourceIndex).map((joint,index)=>({...joint,id:`S${index+1}`}));
}

export function jointPoint(geometry,joint){
 const line=geometry.lines[joint.lineIndex],fraction=joint.distance/line.length;
 return line.start.map((value,axis)=>value+(line.end[axis]-value)*fraction);
}

function boundaryAtStart(geometry){return{lineIndex:0,distance:0,station:0,id:'A',allowanceAfter:0};}
function boundaryAtEnd(geometry){const index=geometry.lines.length-1,line=geometry.lines[index];return{lineIndex:index,distance:line.length,station:geometry.used,id:'B',allowanceBefore:0};}

function pieceBetween(project,geometry,bender,start,end,index){
 const lengths=[];
 if(start.lineIndex===end.lineIndex)lengths.push(end.distance-start.distance);
 else{
  lengths.push(geometry.lines[start.lineIndex].length-start.distance);
  for(let line=start.lineIndex+1;line<end.lineIndex;line++)lengths.push(geometry.lines[line].length);
  lengths.push(end.distance);
 }
 if(lengths.some(length=>!finite(length)||length<=EPS))throw new RangeError('En samling giver et tomt rørstykke.');
 const turns=project.turns.slice(start.lineIndex,end.lineIndex),subproject={...project,measurementMode:'tangent',lengths,turns};
 delete subproject.joints;delete subproject.jointClearance;delete subproject.planner;delete subproject.placement;
 if(project.bendRotations!==undefined)subproject.bendRotations=project.bendRotations.slice(start.lineIndex,end.lineIndex);
 const report=bendMarkLayout(subproject,bender),geometricLength=lengths.reduce((sum,length)=>sum+length,0)+turns.reduce((sum,turn)=>sum+project.radius*Math.abs(turn)*Math.PI/180,0);
 const allowanceStart=start.allowanceAfter??0,allowanceEnd=end.allowanceBefore??0,baseLength=report.supported?report.endPosition:geometricLength,cutLength=baseLength+allowanceStart+allowanceEnd;
 let marks;
 if(report.supported)marks=report.marks.map((mark,localIndex)=>({...mark,id:`B${start.lineIndex+localIndex+1}`,originalIndex:start.lineIndex+localIndex,position:mark.position+allowanceStart,reference:'tool'}));
 else{
  let position=allowanceStart;
  marks=turns.map((turn,localIndex)=>{
   position+=lengths[localIndex];
   const mark={id:`B${start.lineIndex+localIndex+1}`,index:localIndex,originalIndex:start.lineIndex+localIndex,angle:turn,position,reference:'geometric'};
   position+=project.radius*Math.abs(turn)*Math.PI/180;
   return mark;
  });
 }
 return{index,id:`R${index+1}`,from:start.id,to:end.id,start,end,lineStart:start.lineIndex,lineEnd:end.lineIndex,originalBendIndices:turns.map((_,i)=>start.lineIndex+i),lengths,turns,report,marks,geometricLength,baseLength,allowanceStart,allowanceEnd,cutLength,remaining:project.stock-cutLength,fits:cutLength<=project.stock+EPS};
}

export function materialPlan(project,geometry,bender){
 if(!geometry?.lines?.length)return{ok:true,error:null,joints:[],pieces:[],requiredPieces:0,allFit:true,totalCutLength:0,totalWaste:0};
 const error=validateMaterialJoints(project,geometry);if(error)return{ok:false,error,joints:[],pieces:[],requiredPieces:0,allFit:false,totalCutLength:NaN,totalWaste:NaN};
 const joints=sortedMaterialJoints(project,geometry),boundaries=[boundaryAtStart(geometry),...joints,boundaryAtEnd(geometry)];
 try{
  const pieces=boundaries.slice(0,-1).map((start,index)=>pieceBetween(project,geometry,bender,start,boundaries[index+1],index));
  return{ok:true,error:null,joints,pieces,requiredPieces:pieces.length,allFit:pieces.every(piece=>piece.fits),totalCutLength:pieces.reduce((sum,piece)=>sum+piece.cutLength,0),totalWaste:pieces.reduce((sum,piece)=>sum+Math.max(0,piece.remaining),0)};
 }catch(error){return{ok:false,error:error.message,joints,pieces:[],requiredPieces:0,allFit:false,totalCutLength:NaN,totalWaste:NaN};}
}

export function pieceLayoutMarks(piece){
 const marks=(piece?.marks??[]).map(mark=>({...mark,kind:'bend'}));
 if((piece?.allowanceStart??0)>EPS)marks.push({id:piece.from,position:piece.allowanceStart,kind:'joint'});
 if((piece?.allowanceEnd??0)>EPS)marks.push({id:piece.to,position:piece.cutLength-piece.allowanceEnd,kind:'joint'});
 return marks.sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id));
}

function candidatePiece(project,geometry,bender,start,lineIndex,distance){return pieceBetween(project,geometry,bender,start,{lineIndex,distance,station:0,id:'candidate',allowanceBefore:0},0);}

export function suggestMaterialJoints(project,geometry,bender){
 if(!geometry?.lines?.length)return{ok:true,joints:[],plan:materialPlan({...project,joints:[]},geometry,bender)};
 const clearance=jointClearance(project);if(!finite(clearance))return{ok:false,error:'Mindste afstand fra en samling til et buk skal være 0 mm eller mere.',joints:[]};
 const clean={...project,joints:[]},end=boundaryAtEnd(geometry),joints=[],fitsStock=piece=>piece.cutLength<=project.stock;let start=boundaryAtStart(geometry);
 for(let guard=0;guard<100;guard++){
  const rest=pieceBetween(clean,geometry,bender,start,end,0);if(fitsStock(rest)){
   const next={...project,joints},plan=materialPlan(next,geometry,bender);
   if(!plan.allFit||!plan.pieces.every(fitsStock))return{ok:false,error:'Der kunne ikke findes en samling på et lige stykke inden for den valgte rå rørlængde.',joints};
   return{ok:true,joints,plan};
  }
  let best=null;
  for(let lineIndex=start.lineIndex;lineIndex<geometry.lines.length;lineIndex++){
   const line=geometry.lines[lineIndex],minimum=Math.max(clearance,lineIndex===start.lineIndex?start.distance+.01:clearance),maximum=line.length-clearance;
   if(maximum<=minimum+EPS)continue;
   let low=minimum,high=maximum,lowPiece=candidatePiece(clean,geometry,bender,start,lineIndex,low);
   if(!fitsStock(lowPiece))continue;
   const highPiece=candidatePiece(clean,geometry,bender,start,lineIndex,high);
   if(fitsStock(highPiece))best={lineIndex,distance:high,minimum};
   else{for(let iteration=0;iteration<55;iteration++){const mid=(low+high)/2;if(fitsStock(candidatePiece(clean,geometry,bender,start,lineIndex,mid)))low=mid;else high=mid;}best={lineIndex,distance:low,minimum};}
  }
  if(!best)return{ok:false,error:'Der kunne ikke findes en samling på et lige stykke inden for den valgte rå rørlængde.',joints};
  let distance=Math.floor(best.distance*1000)/1000;
  if(distance<best.minimum-EPS)distance=best.distance;
  if(!fitsStock(candidatePiece(clean,geometry,bender,start,best.lineIndex,distance)))distance=best.distance;
  const joint={lineIndex:best.lineIndex,distance,allowanceBefore:0,allowanceAfter:0};joints.push(joint);start={...joint,id:`S${joints.length}`,station:0};
 }
 return{ok:false,error:'Der kræves mere end 99 samlinger.',joints};
}
