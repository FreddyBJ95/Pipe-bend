import assert from 'node:assert/strict';
import {placeDimensionLabels, rectPolygon, polygonsOverlap} from './dimension-layout.mjs';
import {geometry} from './geometry.mjs';
import {bestDrawingAngle} from './labels.mjs';

function verify(items, obstacles, name) {
  const start = performance.now();
  const placed = placeDimensionLabels(items, obstacles);
  assert.equal(placed.length, items.length);
  for (let i = 0; i < placed.length; i++) {
    const p = placed[i];
    assert.ok([p.x,p.y,p.angle,p.offset,p.along,...p.polygon.flat(),...Object.values(p.box)].every(Number.isFinite));
    for (const other of placed.slice(0, i)) assert.equal(polygonsOverlap(p.polygon, other.polygon), false, `${name}: ${p.id} overlaps ${other.id}`);
    for (const obstacle of obstacles) assert.equal(polygonsOverlap(p.polygon, obstacle), false, `${name}: ${p.id} overlaps pipe`);
  }
  console.log(`${name}: PASS (${Math.round(performance.now()-start)} ms)`);
  return placed;
}
function pipeObstacle(a,b) { return rectPolygon((a[0]+b[0])/2,(a[1]+b[1])/2,Math.hypot(b[0]-a[0],b[1]-a[1]),14,Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI); }

const points=[[100,350],[600,350],[600,120],[550,120],[550,300],[500,300],[500,140]];
const items=points.slice(1).map((p,i)=>({id:'L'+(i+1),index:i,a:points[i],b:p,text:String(350+i),width:55,height:25}));
verify(items,points.slice(1).map((p,i)=>pipeObstacle(points[i],p)),'Dense six-section near-U');

const fixture=geometry({radius:80,heading:0,lengths:[350,3400,473,400,340,3400],turns:[90,-45,-45,-45,-45]});
const angle=bestDrawingAngle(fixture.points),c=Math.cos(angle),s=Math.sin(angle),raw=fixture.points.map(([x,y])=>[x*c-y*s,x*s+y*c]);
const xs=raw.map(p=>p[0]),ys=raw.map(p=>p[1]),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys),scale=Math.min(600/(maxx-minx),340/(maxy-miny));
const project=([x,y])=>[450+(x*c-y*s-(minx+maxx)/2)*scale,270-(x*s+y*c-(miny+maxy)/2)*scale];
const fixtureItems=fixture.lines.map((l,i)=>({id:'L'+(i+1),index:i,a:project(l.start),b:project(l.end),text:String(l.length),width:58,height:25}));
const fixtureObstacles=fixture.lines.map(l=>pipeObstacle(project(l.start),project(l.end)));
for(const arc of fixture.arcs) for(let i=1;i<arc.samples.length;i++)fixtureObstacles.push(pipeObstacle(project(arc.samples[i-1]),project(arc.samples[i])));
verify(fixtureItems,fixtureObstacles,'Actual GUI fixture, sampled arcs');

const repeated=Array.from({length:50},(_,i)=>({id:'L'+i,index:i,a:[400,260],b:[450,280],text:'3400',width:70,height:24,angle:21.8}));
verify(repeated,[rectPolygon(425,270,60,18,21.8)],'50 identical anchors');
assert.ok(polygonsOverlap(rectPolygon(0,0,20,20),rectPolygon(5,5,20,20)));
assert.ok(!polygonsOverlap(rectPolygon(0,0,20,20),rectPolygon(100,0,20,20)));
assert.throws(()=>placeDimensionLabels([{a:[0,0],b:[1,1],width:NaN,height:10}]));
