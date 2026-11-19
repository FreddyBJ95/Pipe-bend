import assert from 'node:assert/strict';import{geometry,extend,triangle,offsetLength,calculate}from'./geometry.mjs';const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);const s={radius:80,heading:0,lengths:[350],turns:[]};let b=extend(s,'B',250,90),g=geometry(b);close(g.used,600+40*Math.PI);close(g.end[0],430);close(g.end[1],330);const m=geometry(extend(s,'B',250,-90));close(m.end[0],g.end[0]);close(m.end[1],-g.end[1]);for(const turn of[45,90,-90,135]){const n=geometry(extend(b,'A',200,turn)),anchor=n.lines[1].start;for(let i=0;i<g.lines.length;i++){for(const key of['start','end'])for(let j=0;j<2;j++)close(n.lines[i+1][key][j]-anchor[j],g.lines[i][key][j]);}close(n.used,g.used+200+80*Math.abs(turn)*Math.PI/180);}close(triangle('c',300,400),500);close(triangle('a',300,500),400);assert.ok(Number.isNaN(triangle('b',500,300)));close(offsetLength(160,90,80),0);close(offsetLength(240,90,80),80);assert.ok(Number.isNaN(offsetLength(100,90,80)));close(calculate('(350+125)×2'),950);close(calculate('3,5+2*4'),11.5);close(calculate('-(3+2)/2'),-2.5);for(const bad of['1/0','alert(1)','1+','2(3)',''])assert.throws(()=>calculate(bad));console.log('Geometry, both-end extension, material use, triangle, offset and calculator: PASS');
const multi=geometry({radius:80,heading:0,lengths:[350,250,100],turns:[90,-45]});close(multi.arcs[0].position,350);close(multi.arcs[1].position,600+40*Math.PI);close(multi.arcs[1].position+20*Math.PI+100,multi.used);console.log('Workshop tangent positions and developed blank length: PASS');
const{referenceLayout,bestDrawingAngle,readableTextAngle}=await import('./labels.mjs');for(const count of[1,5,30,200]){const entries=Array.from({length:count},(_,i)=>({x:i%2?480:420,y:260,order:i,id:'B'+i})),layout=referenceLayout(entries);for(const side of[0,1]){const labels=layout.labels.filter(p=>p.side===side).sort((a,b)=>a.labelY-b.labelY);for(let i=1;i<labels.length;i++)assert.ok(labels[i].labelY-labels[i-1].labelY>=34);assert.ok(labels.every(p=>p.labelY>=28&&p.labelY<=layout.height-28));}}const fitAngle=bestDrawingAngle([[0,0],[100,100]]),fitX=100*Math.cos(fitAngle)-100*Math.sin(fitAngle),fitY=100*Math.sin(fitAngle)+100*Math.cos(fitAngle);assert.ok(Math.min(460/Math.abs(fitX),300/Math.abs(fitY))>3.8);close(readableTextAngle(1,1),45);close(readableTextAngle(-1,-1),45);console.log('Reference spacing, automatic rotation and readable aligned text: PASS');
const{practicalOffsetLength}=await import('./geometry.mjs');close(practicalOffsetLength(12,1.4),16.8);close(practicalOffsetLength(120,1.4),168);close(practicalOffsetLength(12,2),24);assert.ok(Number.isNaN(practicalOffsetLength(0,1.4)));assert.ok(Number.isNaN(practicalOffsetLength(12,-1)));console.log('Practical bend-mark spacing: 12 cm × 1.4 = 16.8 cm PASS');
// Workshop portrait pages split labels at their own midpoint and keep both rails in the page.
const portraitViewport={width:630,height:891};
const portraitEntries=[{x:314,y:80,order:0},{x:315,y:810,order:1}];
const portraitLabels=referenceLayout(portraitEntries,portraitViewport);
assert.equal(portraitLabels.height,891);
assert.deepEqual(portraitLabels.labels.map(p=>[p.side,p.labelX,p.y]),[[0,95,80],[1,535,810]]);
assert.deepEqual(referenceLayout([],portraitViewport),{height:891,labels:[]});
const crowdedPortrait=referenceLayout(Array.from({length:40},(_,i)=>({x:500,y:840,order:i})),portraitViewport);
assert.ok(crowdedPortrait.height>portraitViewport.height);
close(crowdedPortrait.labels[0].y,840+(crowdedPortrait.height-portraitViewport.height)/2);
for(let i=0;i<crowdedPortrait.labels.length;i++){
 const p=crowdedPortrait.labels[i];
 assert.equal(p.labelX,535);
 assert.ok(p.labelY>=28&&p.labelY<=crowdedPortrait.height-28);
 if(i)assert.ok(p.labelY-crowdedPortrait.labels[i-1].labelY>=34);
}
const portraitAngle=bestDrawingAngle([[0,0],[1000,0]],400,750);
assert.ok(Math.abs(Math.sin(portraitAngle))>.8,'Portrait pages should rotate a long straight pipe toward the long page axis');
console.log('Portrait workshop reference rails, crowded labels and page-axis fit: PASS');
