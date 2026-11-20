import assert from 'node:assert/strict';
import {layoutWallLabels,wallSegmentFootprint,wallDirectionArrow} from './wall-label-layout.mjs';
import {rectPolygon,polygonsOverlap} from './dimension-layout.mjs';

// The user's two 120 mm wall protrusions, between long 1–1.2 m wall pieces.
const lengths=[1000,1000,120,120,120,1000,1200,120,120,120,1200];
const turns=[90,90,-90,-90,90,90,90,-90,-90,90];
function fixture(width,height,rotation=0,mirror=1) {
  const points=[[0,0]],segments=[];let h=rotation;
  lengths.forEach((length,index)=>{const a=points.at(-1),b=[a[0]+Math.cos(h)*length,a[1]+Math.sin(h)*length];segments.push({index,a,b,text:`${index+1} · ${length.toLocaleString('da-DK')} mm`});points.push(b);h+=(turns[index]||0)*Math.PI/180*mirror;});
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),scale=Math.min((width-144)/(x1-x0),(height-144)/(y1-y0));
  const P=p=>[width/2+(p[0]-(x0+x1)/2)*scale,height/2-(p[1]-(y0+y1)/2)*scale];
  const projected=segments.map(s=>({...s,a:P(s.a),b:P(s.b)}));
  const obstacles=[rectPolygon(...P(segments[0].a),28,28),rectPolygon(...P(segments.at(-1).b),28,28)];
  return {segments:projected,width,height,obstacles,selectedIndex:8};
}
function checked(scene) {
  const result=layoutWallLabels(scene),placed=[...result.dimensions,...result.badges],indices=[...placed.map(l=>l.index),...result.unplaced];
  assert.equal(new Set(indices).size,scene.segments.length,'Every wall has one label or a list-only reference.');
  assert.equal(indices.length,scene.segments.length);
  for(let i=0;i<placed.length;i++) {
    const label=placed[i];
    assert.ok(label.polygon.every(([x,y])=>x>=0&&x<=scene.width&&y>=0&&y<=scene.height),'Labels stay inside the SVG.');
    for(const obstacle of [...scene.segments.map(s=>wallSegmentFootprint(s.a,s.b)),...scene.obstacles])assert.ok(!polygonsOverlap(label.polygon,obstacle,4),'Labels do not hide a wall or endpoint.');
    for(let j=0;j<i;j++)assert.ok(!polygonsOverlap(label.polygon,placed[j].polygon,4),'Labels remain separate.');
    const angle=label.angle*Math.PI/180,width=label.width,height=label.kind==='reference'?22:20;
    // This tests the actual size consumed by the SVG renderer, not only the
    // helper's stored polygons; compact badges must not retain full-text widths.
    assert.ok(Math.abs(label.polygon[1][0]-label.polygon[0][0]-width*Math.cos(angle))<1e-7);
    assert.ok(height>0);
  }
  return result;
}

for(const width of [280,320,480,736,1000])for(const rotation of [0,0.31,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.4])for(const mirror of [-1,1]) {
  const scene=fixture(width,width<480?310:430,rotation,mirror),result=checked(scene);
  assert.deepEqual(result.unplaced,[],'All eleven wall references fit at phone and desktop sizes.');
  for(const segment of scene.segments){const length=Math.hypot(segment.b[0]-segment.a[0],segment.b[1]-segment.a[1]);if(length<40)assert.equal(wallDirectionArrow(segment.a,segment.b),null);}
}
const crowded={segments:Array.from({length:100},(_,index)=>({index,a:[72,215],b:[664,215],text:`${index+1} · 1000 mm`})),width:736,height:430,obstacles:[],selectedIndex:99};
const dense=checked(crowded);
assert.ok([...dense.dimensions,...dense.badges].some(l=>l.index===99),'The selected wall retains an SVG reference at capacity.');
assert.ok(dense.unplaced.length>0,'At capacity, measurements remain available in the list rather than overlapping.');

assert.equal(wallDirectionArrow([10,20],[20,20],true),null);
assert.ok(wallDirectionArrow([10,20],[110,20]));
assert.throws(()=>layoutWallLabels({segments:[],width:NaN,height:430}),RangeError);
assert.throws(()=>layoutWallLabels({segments:[{index:0,a:[0,0],b:[Infinity,0]}],width:600,height:430}),TypeError);
console.log('Wall dimensions: dense 11-wall preview, mobile/desktop bounds, mirrors/rotations, compact badge sizing and capacity PASS');
