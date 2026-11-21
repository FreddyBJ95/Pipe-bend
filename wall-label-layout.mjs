import {rectPolygon,polygonsOverlap} from './dimension-layout.mjs?v=30';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const middle=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
const finitePoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
const boxOf=polygon=>({minX:Math.min(...polygon.map(p=>p[0])),maxX:Math.max(...polygon.map(p=>p[0])),minY:Math.min(...polygon.map(p=>p[1])),maxY:Math.max(...polygon.map(p=>p[1]))});
const inside=(polygon,b)=>polygon.every(([x,y])=>x>=b.minX&&x<=b.maxX&&y>=b.minY&&y<=b.maxY);

/** A conservative screen-space wall footprint, including its round end caps. */
export function wallSegmentFootprint(a,b,width=14) {
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),angle=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;
  return rectPolygon(...middle(a,b),length+width,width,angle);
}

/**
 * Place readable wall labels in SVG screen units. Long dimensions stay aligned
 * to their wall where space permits. Small or crowded pieces use numbered side
 * callouts; their full measurements belong in the accompanying selectable list.
 * No label is allowed to collide or escape the viewport. Very large drawings
 * may omit some SVG callouts (listed in `unplaced`); the selected one has priority.
 */
export function layoutWallLabels({segments,width,height,obstacles=[],selectedIndex=-1}) {
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<160||height<100||!Array.isArray(segments)||segments.length>100)throw new RangeError('Invalid wall label viewport.');
  const outer={minX:4,minY:8,maxX:width-4,maxY:height-8};
  const body={minX:50,minY:10,maxX:width-50,maxY:height-10};
  const walls=segments.map(item=>{
    if(!finitePoint(item.a)||!finitePoint(item.b))throw new TypeError('Wall endpoints must be finite screen positions.');
    const anchor=middle(item.a,item.b),length=Math.hypot(item.b[0]-item.a[0],item.b[1]-item.a[1]);
    return {...item,anchor,length,width:Number.isFinite(item.width)?item.width:String(item.text).length*8+12};
  });
  const blocked=[...segments.map(s=>wallSegmentFootprint(s.a,s.b)),...obstacles.filter(p=>Array.isArray(p)&&p.length>=3&&p.every(finitePoint))];
  const dimensions=[],references=[];
  for(const item of [...walls].sort((a,b)=>b.length-a.length||a.index-b.index)) {
    if(item.length<item.width+18){references.push(item);continue;}
    const ux=(item.b[0]-item.a[0])/item.length,uy=(item.b[1]-item.a[1])/item.length;
    const preferred=finitePoint(item.outward)?item.outward:[-uy,ux];
    let angle=Math.atan2(uy,ux)*180/Math.PI;
    if(angle>90)angle-=180;if(angle<-90)angle+=180;
    let best;
    for(const offset of [24,-24,42,-42,62,-62,84,-84])for(const along of [0,20,-20,40,-40]) {
      if(Math.abs(along)>item.length/4)continue;
      const x=item.anchor[0]+preferred[0]*offset+ux*along,y=item.anchor[1]+preferred[1]*offset+uy*along;
      const polygon=rectPolygon(x,y,item.width,20,angle);
      if(!inside(polygon,body)||blocked.some(p=>polygonsOverlap(polygon,p,4)))continue;
      const score=Math.abs(offset)+Math.abs(along)*2+(offset<0?0.1:0);
      if(!best||score<best.score)best={...item,x,y,angle,polygon,box:boxOf(polygon),kind:'dimension',score,leader:Math.abs(offset)>24||along!==0?[item.anchor,[x,y]]:null};
    }
    if(best){delete best.score;dimensions.push(best);blocked.push(best.polygon);}else references.push(item);
  }

  const rowGap=28,minY=22,maxY=height-22,capacity=Math.max(1,Math.floor((maxY-minY)/rowGap)+1);
  const rails=[[],[]],unplaced=[];
  // Reserve the active wall before admitting other compact SVG references.
  for(const item of references.sort((a,b)=>(a.index===selectedIndex?-1:b.index===selectedIndex?1:0)||a.index-b.index)) {
    const preferred=item.anchor[0]<width/2?0:1;
    const side=rails[preferred].length<capacity?preferred:rails[1-preferred].length<capacity?1-preferred:-1;
    if(side<0)unplaced.push(item.index);else rails[side].push(item);
  }
  const badges=[];
  for(let side=0;side<2;side++) {
    const items=rails[side].sort((a,b)=>a.anchor[1]-b.anchor[1]||a.index-b.index);
    const ys=items.map(item=>clamp(item.anchor[1],minY,maxY));
    for(let i=1;i<ys.length;i++)ys[i]=Math.max(ys[i],ys[i-1]+rowGap);
    if(ys.at(-1)>maxY){ys[ys.length-1]=maxY;for(let i=ys.length-2;i>=0;i--)ys[i]=Math.min(ys[i],ys[i+1]-rowGap);}
    for(let i=0;i<items.length;i++) {
      const item=items[i],text=String(item.index+1),x=side?width-24:24,y=ys[i],badgeWidth=Math.max(26,text.length*7.4+12),polygon=rectPolygon(x,y,badgeWidth,22);
      if(!inside(polygon,outer)||blocked.some(p=>polygonsOverlap(polygon,p,4))){unplaced.push(item.index);continue;}
      badges.push({...item,text,width:badgeWidth,x,y,angle:0,polygon,box:boxOf(polygon),kind:'reference',leader:[item.anchor,[x+(side?-badgeWidth/2:badgeWidth/2),y]]});
      blocked.push(polygon);
    }
  }
  return {dimensions,badges,unplaced};
}

/** Small pieces stay legible without a fixed-size arrow obscuring their nodes. */
export function wallDirectionArrow(a,b,selected=false) {
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  if(length<(selected?14:40))return null;
  const u=[dx/length,dy/length],n=[-u[1],u[0]],half=Math.min(6,length/8),middle=[a[0]+dx*.7,a[1]+dy*.7];
  return [[middle[0]+u[0]*half,middle[1]+u[1]*half],[middle[0]-u[0]*half*.5+n[0]*half*.5,middle[1]-u[1]*half*.5+n[1]*half*.5],[middle[0]-u[0]*half*.5-n[0]*half*.5,middle[1]-u[1]*half*.5-n[1]*half*.5]];
}
