import assert from 'node:assert/strict';
import {geometry3D} from './spatial-geometry.mjs';
import {projectSpatialPoint,projectSpatialGeometry,spatialArcSamples,spatialLineVisibility,pickSpatialParts,spatialRiseLabelData} from './spatial-drawing.mjs';

const close=(a,b,epsilon=1e-7)=>assert(Math.abs(a-b)<=epsilon,`${a} != ${b}`);
assert.deepEqual(projectSpatialPoint([12,34,56],'top'),[12,34,56]);
assert.deepEqual(projectSpatialPoint([12,34,56],'front'),[12,56,-34]);
assert.deepEqual(projectSpatialPoint([12,34,56],'side'),[34,56,12]);
assert.throws(()=>projectSpatialPoint([0,0]),TypeError);
assert.throws(()=>projectSpatialPoint([0,0,NaN]),TypeError);
assert.throws(()=>projectSpatialPoint([0,0,0],'unknown'),RangeError);
// Isometric projection uses orthonormal screen axes. Its third value is depth.
const basis=[[1,0,0],[0,1,0],[0,0,1]].map(p=>projectSpatialPoint(p,'iso'));
for(let i=0;i<3;i++)for(let j=0;j<3;j++)close(basis[i].reduce((sum,value,k)=>sum+value*basis[j][k],0),i===j?1:0);
for(const yaw of [-2.7,-.2,0,.8,2.6])for(const pitch of [-1.4,-.7,0,.4,1.4]){
 const rotated=[[1,0,0],[0,1,0],[0,0,1]].map(p=>projectSpatialPoint(p,'iso',{yaw,pitch}));
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)close(rotated[i].reduce((sum,value,k)=>sum+value*rotated[j][k],0),i===j?1:0);
}
assert.deepEqual(projectSpatialPoint([12,34,56],'iso',{yaw:0,pitch:0}),[12,56,34]);
assert.deepEqual(projectSpatialPoint([12,34,56],'top',{yaw:1,pitch:1}),[12,34,56],'Orbit never rotates orthographic views');
assert.throws(()=>projectSpatialPoint([0,0,0],'iso',{yaw:NaN,pitch:0}),TypeError);

const state={radius:38,heading:0,measurementMode:'vertex',lengths:[1000,500,1000,300,800],turns:[90,-90,90,-90],bendRotations:[90,0,0,0]};
const g=geometry3D(state),before=structuredClone(g),projected=projectSpatialGeometry(g,'top',200);
assert.deepEqual(g,before,'Projection must not mutate geometry');
close(projected.lines[0].start[1],projected.lines[0].end[1]);
close(projected.lines[1].start[0],projected.lines[1].end[0]);
close(projected.lines[1].start[1],projected.lines[1].end[1]);
close(g.lines[2].start[2],500);close(g.lines[4].start[2],800);
assert.deepEqual(spatialRiseLabelData(g,1),{start:0,end:500,rise:500,dimension:500,showSeparateDimension:false});
for(const radius of [12.5,38,67.25])for(const length of [150.5,500,934.75])for(const direction of [90,-90]){
 const tangent=geometry3D({radius,heading:.413,measurementMode:'tangent',lengths:[1234,length,876],turns:[90,-90],bendRotations:[direction,0]});
 const rise=spatialRiseLabelData(tangent,1),sign=Math.sign(direction);
 close(rise.start,0);close(rise.end,sign*(length+2*radius));close(rise.rise,sign*(length+2*radius));close(rise.dimension,length);assert(rise.showSeparateDimension,'Tangent leg stays distinct from actual total level rise');
}
assert.equal(spatialRiseLabelData(g,-1),null);
for(const view of ['top','front','side','iso']){
 const projection=projectSpatialGeometry(g,view,5);
 assert(projection.points.every(point=>point.every(Number.isFinite)));
 for(let i=0;i<g.lines.length;i++)close(projection.lines[i].dimension,g.lines[i].dimension);
}
for(const arc of g.arcs){
 const overview=spatialArcSamples(arc,.1),detail=spatialArcSamples(arc,300);
 assert(detail.length>overview.length,'Zoom refines projected bend curves');
 assert.deepEqual(detail[0],arc.samples[0]);assert.deepEqual(detail.at(-1),arc.samples.at(-1));
 for(const p of detail)close(Math.hypot(...p.map((v,i)=>v-arc.center[i])),arc.radius);
 const step=Math.abs(arc.turn)*Math.PI/180/(detail.length-1);
 assert(arc.radius*300*(1-Math.cos(step/2))<=.221,'Detail sampling bounds sagitta to0.22screenpx');
}

const overlap=[{start:[0,0,0],end:[100,0,0]},{start:[20,0,50],end:[80,0,50]}];
const visibility=spatialLineVisibility(overlap,12);
assert.equal(visibility[0].hidden.length,1);close(visibility[0].hidden[0][0],.2);close(visibility[0].hidden[0][1],.8);
assert.equal(visibility[0].visible.length,2);assert.deepEqual(visibility[1].visible,[[0,1]]);assert.deepEqual(visibility[1].hidden,[]);
const crossing=[{start:[0,0,-100],end:[100,0,-100]},{start:[50,-50,50],end:[50,50,50]}];
const crossingVisibility=spatialLineVisibility(crossing,12);
close(crossingVisibility[0].hidden[0][0],.44);close(crossingVisibility[0].hidden[0][1],.56);
assert.equal(crossingVisibility[1].hidden.length,0);
const sameLevel=spatialLineVisibility(overlap.map(line=>({...line,start:[...line.start.slice(0,2),0],end:[...line.end.slice(0,2),0]})),12);
assert(sameLevel.every(line=>line.hidden.length===0),'Same-height crossings are not invented hidden levels');
const slopeDepth=spatialLineVisibility([{start:[0,0,0],end:[100,0,100]},{start:[0,0,75],end:[100,0,25]}],12);
close(slopeDepth[0].hidden[0][1],.5);close(slopeDepth[1].hidden[0][0],.5);

const candidates=pickSpatialParts({lines:overlap,arcs:[]},[50,0]);
assert.equal(candidates.length,2);assert.equal(candidates[0].index,1);assert.equal(candidates[1].index,0);
assert.equal(pickSpatialParts({lines:overlap,arcs:[]},[10,0]).length,1);
assert.equal(pickSpatialParts({lines:overlap,arcs:[]},[10,50]).length,0);
const verticalHit=pickSpatialParts({lines:[{start:[0,0,0],end:[0,100,0]}],arcs:[]},[10,50],{pixelsPerMm:2});
assert.equal(verticalHit[0].type,'length');assert.equal(verticalHit[0].index,0);
const dotHit=pickSpatialParts({lines:[{start:[0,0,0],end:[0,0,500]}],arcs:[]},[0,0]);
assert.equal(dotHit[0].type,'length','Vertical top-view transition remains selectable');
console.log('Spatial orthographic projection, repeated elevations, adaptive bend precision, partial hidden spans and overlapping/vertical picking: PASS');
