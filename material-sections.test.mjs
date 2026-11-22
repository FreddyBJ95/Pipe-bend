import assert from 'node:assert/strict';
import {geometry} from './geometry.mjs';
import {getBender} from './benders.mjs';
import {roundDisplayedMarks} from './displayed-marks.mjs';
import {materialPlan,suggestMaterialJoints,validateMaterialJoints,jointPoint,pieceLayoutMarks} from './material-sections.mjs';

const close=(a,b,tolerance=1e-5)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
const bender=getBender('swagelok-ms-htb-12m');
const straight={version:1,stock:3000,diameter:12,radius:38,benderId:bender.id,measurementMode:'tangent',heading:0,lengths:[4500],turns:[],jointClearance:50};
let geo=geometry(straight),suggested=suggestMaterialJoints(straight,geo,bender);
assert.equal(suggested.ok,true);assert.equal(suggested.joints.length,1);close(suggested.joints[0].distance,3000,1e-3);
let plan=materialPlan({...straight,joints:suggested.joints},geo,bender);assert.equal(plan.allFit,true);assert.equal(plan.pieces.length,2);close(plan.pieces[0].cutLength,3000,1e-3);close(plan.pieces[1].cutLength,1500,1e-3);

const bent={...straight,lengths:[1800,1800,1200],turns:[90,-45],measurementMode:'tangent'};geo=geometry(bent);suggested=suggestMaterialJoints(bent,geo,bender);assert.equal(suggested.ok,true);assert.ok(suggested.joints.length>=1);plan=suggested.plan;assert.equal(plan.allFit,true);assert.ok(plan.pieces.every(piece=>piece.cutLength<=3000+1e-6));assert.deepEqual(plan.pieces.flatMap(piece=>piece.originalBendIndices),[0,1]);assert.deepEqual(plan.pieces.flatMap(piece=>piece.marks.map(mark=>mark.originalIndex)),[0,1]);

const manual={...bent,joints:[{lineIndex:1,distance:900,allowanceBefore:25,allowanceAfter:35}]};geo=geometry(manual);plan=materialPlan(manual,geo,bender);assert.equal(plan.ok,true);assert.equal(plan.pieces.length,2);assert.equal(plan.pieces[0].allowanceEnd,25);assert.equal(plan.pieces[1].allowanceStart,35);close(plan.totalCutLength,plan.pieces[0].baseLength+plan.pieces[1].baseLength+60);assert.deepEqual(jointPoint(geo,plan.joints[0]).length,2);
const firstLayout=pieceLayoutMarks(plan.pieces[0]),secondLayout=pieceLayoutMarks(plan.pieces[1]);assert.equal(firstLayout.at(-1).id,'S1');close(firstLayout.at(-1).position,plan.pieces[0].cutLength-25);assert.equal(secondLayout[0].id,'S1');close(secondLayout[0].position,35);assert.ok(firstLayout.find(mark=>mark.id==='B1')?.kind==='bend');assert.ok(secondLayout.find(mark=>mark.id==='B2')?.kind==='bend');
for(const piece of plan.pieces){const display=roundDisplayedMarks({supported:true,marks:piece.marks,endPosition:piece.cutLength});assert.equal(display.ok,true);close(display.displayedIntervals.reduce((sum,value)=>sum+value,0),display.displayedEndPosition,.05);}

const edge={...straight,stock:2500.001,lengths:[1500,2000],turns:[73]};geo=geometry(edge);suggested=suggestMaterialJoints(edge,geo,bender);assert.equal(suggested.ok,true);assert.equal(suggested.plan.allFit,true);assert.ok(suggested.plan.pieces.every(piece=>piece.cutLength<=edge.stock),'Automatic joints must never round beyond the stock length');

const geometric={...bent,benderId:null,joints:[]};geo=geometry(geometric);plan=materialPlan(geometric,geo,null);assert.equal(plan.ok,true);assert.equal(plan.pieces[0].report.supported,false);assert.deepEqual(plan.pieces[0].marks.map(mark=>mark.id),['B1','B2']);close(plan.pieces[0].marks[0].position,1800);close(plan.pieces[0].marks[1].position,1800+38*Math.PI/2+1800);assert.ok(plan.pieces[0].marks.every(mark=>mark.reference==='geometric'));

assert.match(validateMaterialJoints({...straight,joints:[{lineIndex:0,distance:10,allowanceBefore:0,allowanceAfter:0}]},geometry(straight)),/mindst 50 mm/);
assert.match(validateMaterialJoints({...straight,joints:[{lineIndex:0,distance:100,allowanceBefore:-1,allowanceAfter:0}]},geometry(straight)),/ugyldige/);
console.log('Material sections: manual joints, allowances, per-piece marks and automatic stock fitting PASS');
