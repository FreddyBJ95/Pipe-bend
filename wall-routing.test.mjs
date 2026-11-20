import assert from 'node:assert/strict';
import {generateWallRoute,validateWallRoute,wallLayout,pointOnWall,wallObstaclePolygon,arcSegmentDistance} from './wall-routing.mjs';
import {geometry} from './geometry.mjs';
import {generateRoomRoute} from './room-routing.mjs';

const close=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const base={wall:{lengths:[2400],turns:[],heading:0,side:'left'},diameter:12,radius:38,wallGap:50,clearance:10,maxAngle:90,
  start:{segment:0,position:200},end:{segment:0,position:2200},clips:[{id:'K1',segment:0,position:600},{id:'K2',segment:0,position:1800}],obstacles:[]};

const drawn=wallLayout({wall:base.wall});
assert.equal(drawn.ok,true);
assert.deepEqual(drawn.points,[[0,0],[2400,0]]);
assert.equal(drawn.segments[0].length,2400);
assert.deepEqual(drawn.segments[0].normal,[-0,1]);
assert.deepEqual(pointOnWall(base,{segment:0,position:100}),[100,56]);
assert.deepEqual(pointOnWall(base,{segment:0,position:100,gap:150}),[100,156]);
assert.deepEqual(wallObstaclePolygon(base,{id:'F1',segment:0,position:800,width:200,depth:300}).points,[[800,0],[1000,0],[1000,300],[800,300]]);

function checked(c,result=generateWallRoute(c)) {
  assert.equal(result.ok,true,result.error);
  assert.ok(result.turns.every(t=>Math.abs(t)<=c.maxAngle+1e-6));
  assert.ok(result.tangentLengths.every(t=>t>0));
  assert.ok(result.pathPoints.every(p=>p.every(Number.isFinite)));
  assert.equal(validateWallRoute(c,result.points).ok,true);
  const g=geometry({radius:c.radius,measurementMode:'vertex',heading:result.heading,lengths:result.lengths,turns:result.turns}),end=pointOnWall(c,c.end);
  close(g.end[0]+result.start[0],end[0]);close(g.end[1]+result.start[1],end[1]);close(g.used,result.geometricLength);
  return result;
}
const straight=checked(base);
assert.deepEqual(straight.points,[[200,56],[2200,56]]);
assert.deepEqual(straight.lengths,[2000]);assert.deepEqual(straight.turns,[]);
checked({...base,diameter:22,radius:80});
checked({...base,wallGap:0});

const beam={id:'bjælke',segment:0,position:1050,width:250,depth:250};
const beamConfig={...base,obstacles:[beam]};
for(const maxAngle of [90,60,45,30]) {
  const c={...beamConfig,maxAngle},route=checked(c);
  assert.ok(route.turns.length>=(maxAngle===90?4:8));
  assert.ok(route.geometricLength>2000);
  // Independent dense interpolation of actual arc primitives checks the
  // outside-pipe distance to the beam, not only the theoretical corners.
  for(const arc of route.arcs) {
    const start=Math.atan2(arc.samples[0][1]-arc.center[1],arc.samples[0][0]-arc.center[0]);
    for(let i=0;i<=1000;i++) {
      const angle=start+arc.turn*Math.PI/180*i/1000,p=[arc.center[0]+arc.radius*Math.cos(angle),arc.center[1]+arc.radius*Math.sin(angle)];
      const dx=Math.max(beam.position-p[0],0,p[0]-beam.position-beam.width),dy=Math.max(-p[1],0,p[1]-beam.depth);
      assert.ok(Math.hypot(dx,dy)>=c.diameter/2+c.clearance-1e-6);
    }
  }
}
const changedGap={...base,clips:[{id:'dyb-klamme',segment:0,position:1100,gap:180}]};
const offset=checked(changedGap);
assert.ok(offset.turns.length>=4);
const clip=pointOnWall(changedGap,changedGap.clips[0]);
assert.ok(offset.straights.some(s=>Math.abs(s.start[1]-clip[1])<1e-6&&Math.abs(s.end[1]-clip[1])<1e-6&&clip[0]>=Math.min(s.start[0],s.end[0])&&clip[0]<=Math.max(s.start[0],s.end[0])));

const corner={...base,wall:{lengths:[2400,1600],turns:[90],heading:0,side:'left'},end:{segment:1,position:1400},clips:[{id:'K1',segment:0,position:600},{id:'K2',segment:1,position:1000}]};
for(const turn of [90,-90,55,-55,120,-120])for(const side of ['left','right'])for(const maxAngle of [90,45]) {
  checked({...corner,wall:{...corner.wall,turns:[turn],side},maxAngle});
}
for(const side of ['left','right'])checked({...corner,wall:{...corner.wall,side},obstacles:[beam],maxAngle:45});
const rotated={...corner,wall:{...corner.wall,heading:0.73}};
checked(rotated);
const reverse={...corner,start:corner.end,end:corner.start};
assert.equal(checked(reverse).direction,'reverse');
checked({...base,wall:{...base.wall,lengths:[1200,1200],turns:[0]},end:{segment:1,position:1000},clips:[{segment:0,position:600},{segment:1,position:600}]});
// Unused measured pieces need not be long enough to carry a bend: only the
// selected start-to-end section is proposed, while all walls remain barriers.
checked({...base,wall:{...base.wall,lengths:[2400,20],turns:[90]}});

assert.equal(validateWallRoute(beamConfig,straight.points).code,'OBSTACLE_COLLISION');
const beamRoute=checked(beamConfig),edited=structuredClone(beamRoute.points);
edited[2][1]=beam.depth;
assert.equal(validateWallRoute(beamConfig,edited).ok,false);
assert.equal(validateWallRoute(changedGap,straight.points).code,'MISSED_CLIP');
assert.equal(validateWallRoute({...corner,maxAngle:45},checked(corner).points).code,'MAX_ANGLE');
assert.equal(validateWallRoute(base,[[0,0],[100,100]]).code,'ENDPOINT_MISMATCH');
assert.equal(validateWallRoute(base,[[200,56],[1e308,1e308],[2200,56]]).code,'INVALID_POINTS');
assert.equal(generateWallRoute({...base,clips:[{segment:0,position:100}]}).code,'CLIP_ORDER');
assert.equal(generateWallRoute({...base,start:{segment:1,position:100}}).code,'INVALID_ENDPOINT');
assert.equal(generateWallRoute({...base,end:base.start}).code,'IDENTICAL_ENDPOINTS');
assert.equal(generateWallRoute({...base,clips:[{segment:0,position:2500}]}).code,'INVALID_CLIP');
assert.equal(generateWallRoute({...beamConfig,start:{segment:0,position:1100}}).code,'BLOCKED_ANCHOR');
assert.equal(generateWallRoute({...base,obstacles:[{...beam,position:2350}]}).code,'INVALID_OBSTACLE');
for(const invalid of [{radius:6},{radius:Infinity},{diameter:NaN},{wallGap:-1},{clearance:-1},{maxAngle:0},{maxAngle:180}])assert.equal(generateWallRoute({...base,...invalid}).code,'INVALID_INPUT');
for(const wall of [{lengths:[],turns:[]},{lengths:[2400],turns:[90]},{lengths:[-1],turns:[]},{lengths:[Infinity],turns:[]},{lengths:[100,100],turns:[180]},{lengths:[100],turns:[],side:'back'}])assert.equal(wallLayout({wall}).code,'INVALID_WALL');
assert.equal(wallLayout({wall:{lengths:[200,200,200,300],turns:[90,90,90]}}).code,'WALL_SELF_INTERSECTION');

// Measuring a wall section does not create a physical doorway at either end.
// An edited route must not wrap around an unmeasured tip onto the back face.
const wrap=[[200,56],[-100,56],[-100,-100],[2500,-100],[2500,56],[2200,56]];
assert.equal(validateWallRoute({...base,clips:[]},wrap).code,'WALL_COLLISION');
const behind=[[200,56],[200,-100],[2200,-100],[2200,56]];
assert.equal(validateWallRoute({...base,clips:[]},behind).code,'WALL_COLLISION');
assert.equal(validateWallRoute({...base,wall:{...base.wall,side:'right'},clips:[]},wrap.map(([x,y])=>[x,-y])).code,'WALL_COLLISION');

// The minimum arc/wall gap lies between sampled angles on a rotated wall.
// A 0.001 mm physical overlap must be rejected; exact tangency is permitted.
for(const minimum of [5.999,6,6.001]) {
  const h=0.311,y=minimum-38,dx=(56-y)/Math.tan(Math.PI/3),rotate=([x,y])=>[x*Math.cos(h)-y*Math.sin(h),x*Math.sin(h)+y*Math.cos(h)];
  const c={...base,wall:{lengths:[1000],turns:[],heading:h,side:'left'},maxAngle:130,end:{segment:0,position:200+2*dx},clips:[]};
  const result=validateWallRoute(c,[[200,56],[200+dx,y],[200+2*dx,56]].map(rotate));
  assert.equal(result.ok,minimum>=6);
  if(minimum<6)assert.equal(result.code,'WALL_COLLISION');
}
const outsideCorner={...corner,wall:{...corner.wall,turns:[-90]},clips:[]},smallRadius=checked(outsideCorner);
assert.equal(validateWallRoute({...outsideCorner,radius:500},smallRadius.points).code,'WALL_COLLISION','A larger radius must be rechecked even if all tangent lengths remain positive');

// A tiny bend crossing a long unmeasured continuation ray must not disappear
// when squared world-coordinate values dwarf the bend radius.
const smallArc={center:[-100000000,0],radius:8.5,turn:90,samples:[135,225].map(angle=>[-100000000+8.5*Math.cos(angle*Math.PI/180),8.5*Math.sin(angle*Math.PI/180)])};
assert.equal(arcSegmentDistance(smallArc,[-1600000000,0],[0,0]),0);
const r=8.5,k=r*Math.SQRT2,v1=-1e8-k,v2=-2e8-k,y=v1-1000;
const largeWall={...base,wall:{lengths:Array(10).fill(1e7),turns:Array(9).fill(0),side:'left',heading:0},radius:r,clips:[]};
const distantCrossings=[[200,56],[200,500],[v1+500,500],[v1,0],[1000,y],[1000,y-1000],[v2+1000,y-1000],[v2+1000,-1000],[v2,0],[v2+1000,1000],[2200,1000],[2200,56]];
assert.equal(validateWallRoute(largeWall,distantCrossings).code,'WALL_COLLISION');

// Legacy rectangular plans form a closed chain; their unchanged valid points
// must survive migration, including paths crossing the drawing's seam.
const old={width:4000,height:3000,diameter:12,radius:38,wallGap:50,clearance:10,maxAngle:90,start:{wall:'bottom',position:200},end:{wall:'bottom',position:3800},clips:[{id:'K',wall:'left',position:1000}],obstacles:[]};
const oldRoute=generateRoomRoute(old);assert.equal(oldRoute.ok,true,oldRoute.error);
const migrated={...old,wall:{lengths:[4000,3000,4000,3000],turns:[90,90,90],side:'left',heading:0},start:{segment:0,position:200},end:{segment:0,position:3800},clips:[{id:'K',segment:3,position:2000}]};
assert.equal(wallLayout(migrated).closed,true);
checked(migrated,validateWallRoute(migrated,oldRoute.points));
checked(migrated);

console.log('Measured wall routes: straight/open chains, both sides, corners, beams, clips, max angles, exact clearance, continuation and migration PASS');
