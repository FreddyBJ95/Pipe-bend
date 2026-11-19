// Reference labels live in two fixed rails so tightly packed bends never hide text.
export function referenceLayout(items,{width=900,height=540}={}){
 const groups=[items.filter(p=>p.x<width/2),items.filter(p=>p.x>=width/2)];
 const layoutHeight=Math.max(height,(Math.max(...groups.map(g=>g.length))+1)*34+60);
 const labels=[];
 for(let side=0;side<2;side++){
  const sorted=groups[side].map(p=>({...p})).sort((a,b)=>a.y-b.y||a.order-b.order);
  let last=24;
  for(const p of sorted){p.labelY=Math.max(42,Math.min(layoutHeight-42,p.y+(layoutHeight-height)/2),last+34);last=p.labelY;}
  if(sorted.length&&last>layoutHeight-42){let next=layoutHeight-8;for(let i=sorted.length-1;i>=0;i--){sorted[i].labelY=Math.min(sorted[i].labelY,next-34);next=sorted[i].labelY;}}
  for(const p of sorted)labels.push({...p,y:p.y+(layoutHeight-height)/2,labelX:side?width-95:95,side});
 }
 return {height:layoutHeight,labels};
}
// Rotate only the view, never the pipe model. Prefer a wide, readable fit.
export function bestDrawingAngle(points,width=460,height=300){
 if(points.length<2)return 0;
 let best=0,bestScore=-Infinity;
 for(let degree=0;degree<180;degree++){
  const a=degree*Math.PI/180,c=Math.cos(a),s=Math.sin(a);let minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;
  for(const [x,y]of points){const rx=x*c-y*s,ry=x*s+y*c;minx=Math.min(minx,rx);maxx=Math.max(maxx,rx);miny=Math.min(miny,ry);maxy=Math.max(maxy,ry);}
  const score=Math.min(width/Math.max(1,maxx-minx),height/Math.max(1,maxy-miny));
  if(score>bestScore*1.000001){bestScore=score;best=a;}
 }
 return best;
}
export function readableTextAngle(dx,dy){let degrees=Math.atan2(dy,dx)*180/Math.PI;if(degrees>90)degrees-=180;if(degrees< -90)degrees+=180;return degrees;}
