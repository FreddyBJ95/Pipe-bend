// Independent camera for the wall workspace. Geometry and hit targets remain
// in the drawing's base coordinates; only the SVG viewBox changes.
export function createWallViewport({svg,zoomIn,zoomOut,fit,output}) {
  const camera={zoom:1,x:450,y:270,width:900,height:540};
  const pointers=new Map();
  let gesture=null,dragging=false,suppressClick=false,suppressUntil=0;
  const clamp=value=>Math.min(8,Math.max(1,value));
  const finite=value=>typeof value==='number'&&Number.isFinite(value);
  function apply(){
    const width=camera.width/camera.zoom,height=camera.height/camera.zoom;
    svg.setAttribute('viewBox',`${camera.x-width/2} ${camera.y-height/2} ${width} ${height}`);
    if(output)output.textContent=Math.round(camera.zoom*100)+'%';
    if(zoomIn)zoomIn.disabled=camera.zoom>=8;
    if(zoomOut)zoomOut.disabled=camera.zoom<=1;
  }
  // Account for the SVG's default xMidYMid meet letterboxing as well as CSS
  // sizes, so wheel and pinch anchors stay under the user's fingers.
  function screen(){
    const rect=svg.getBoundingClientRect?.();
    const width=Number(rect?.width)||camera.width,height=Number(rect?.height)||camera.height;
    const left=Number(rect?.left)||0,top=Number(rect?.top)||0;
    const scale=Math.min(width/camera.width,height/camera.height)*camera.zoom;
    return{centerX:left+width/2,centerY:top+height/2,scale};
  }
  function point(clientX,clientY){
    const frame=screen();
    return{x:camera.x+(clientX-frame.centerX)/frame.scale,y:camera.y+(clientY-frame.centerY)/frame.scale};
  }
  function zoomTo(value,anchor){
    if(!finite(value))return;
    const old=camera.zoom;camera.zoom=clamp(value);
    if(anchor){const ratio=old/camera.zoom;camera.x=anchor.x+(camera.x-anchor.x)*ratio;camera.y=anchor.y+(camera.y-anchor.y)*ratio;}
    if(camera.zoom===1){camera.x=camera.width/2;camera.y=camera.height/2;}
    apply();
  }
  function reset(){camera.zoom=1;camera.x=camera.width/2;camera.y=camera.height/2;apply();}
  function capture(id){try{svg.setPointerCapture?.(id);}catch{}}
  function release(id){try{if(!svg.hasPointerCapture||svg.hasPointerCapture(id))svg.releasePointerCapture?.(id);}catch{}}
  function markDragged(){dragging=true;suppressClick=true;suppressUntil=Date.now()+650;}
  function startPinch(){
    const[a,b]=[...pointers.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    gesture={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom:camera.zoom,anchor:point(mid.x,mid.y)};
    markDragged();for(const id of pointers.keys())capture(id);
  }
  zoomIn?.addEventListener('click',()=>zoomTo(camera.zoom*1.35));
  zoomOut?.addEventListener('click',()=>zoomTo(camera.zoom/1.35));
  fit?.addEventListener('click',reset);
  svg.addEventListener('wheel',event=>{
    if(!finite(event.clientX)||!finite(event.clientY)||!finite(event.deltaY))return;
    event.preventDefault();zoomTo(camera.zoom*Math.exp(-event.deltaY*.002),point(event.clientX,event.clientY));
  },{passive:false});
  svg.addEventListener('pointerdown',event=>{
    if((event.button!==undefined&&event.button!==0)||!finite(event.clientX)||!finite(event.clientY))return;
    if(!pointers.size){dragging=false;gesture=null;suppressClick=false;}
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,lastX:event.clientX,lastY:event.clientY});
    // Delay capture for a single pointer: capturing on a pipe hit target would
    // otherwise retarget an ordinary tap away from that target's click action.
    if(pointers.size===2)startPinch();
  });
  svg.addEventListener('pointermove',event=>{
    const entry=pointers.get(event.pointerId);if(!entry||!finite(event.clientX)||!finite(event.clientY))return;
    entry.x=event.clientX;entry.y=event.clientY;
    if(pointers.size===2&&gesture){
      const[a,b]=[...pointers.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      camera.zoom=clamp(gesture.zoom*Math.hypot(a.x-b.x,a.y-b.y)/gesture.distance);
      const frame=screen();camera.x=gesture.anchor.x-(mid.x-frame.centerX)/frame.scale;camera.y=gesture.anchor.y-(mid.y-frame.centerY)/frame.scale;
      if(camera.zoom===1){camera.x=camera.width/2;camera.y=camera.height/2;}
      markDragged();event.preventDefault();apply();
    }else if(pointers.size===1){
      if(!dragging&&Math.hypot(entry.x-entry.startX,entry.y-entry.startY)<=5)return;
      capture(event.pointerId);const frame=screen();camera.x-=(entry.x-entry.lastX)/frame.scale;camera.y-=(entry.y-entry.lastY)/frame.scale;
      entry.lastX=entry.x;entry.lastY=entry.y;markDragged();event.preventDefault();apply();
    }
  });
  function endPointer(event){
    if(!pointers.has(event.pointerId))return;
    pointers.delete(event.pointerId);release(event.pointerId);gesture=null;
    if(dragging){suppressClick=true;suppressUntil=Date.now()+650;}
    if(pointers.size===1){const entry=pointers.values().next().value;entry.startX=entry.lastX=entry.x;entry.startY=entry.lastY=entry.y;}
  }
  for(const name of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(name,endPointer);
  // A tap is deliberately not captured, so its release can happen outside
  // the SVG. Clear that pointer globally before a later touch starts.
  const pointerHost=svg.ownerDocument?.defaultView??globalThis;
  for(const name of ['pointerup','pointercancel'])pointerHost.addEventListener?.(name,endPointer,true);
  svg.addEventListener('click',event=>{
    // Keyboard activation has no pointer click count and must remain usable.
    if(suppressClick&&Date.now()<=suppressUntil&&event.detail!==0){event.preventDefault();event.stopImmediatePropagation?.();event.stopPropagation?.();suppressClick=false;}
  },true);
  svg.addEventListener('keydown',event=>{
    if(event.target!==svg)return;
    const step=45/camera.zoom;
    if(event.key==='+'||event.key==='=')zoomTo(camera.zoom*1.35);
    else if(event.key==='-'||event.key==='−')zoomTo(camera.zoom/1.35);
    else if(event.key==='0')reset();
    else if(event.key==='ArrowLeft')camera.x-=step;
    else if(event.key==='ArrowRight')camera.x+=step;
    else if(event.key==='ArrowUp')camera.y-=step;
    else if(event.key==='ArrowDown')camera.y+=step;
    else return;
    event.preventDefault();apply();
  });
  function update(width,height){
    if(finite(width)&&width>0&&finite(height)&&height>0){camera.x*=width/camera.width;camera.y*=height/camera.height;camera.width=width;camera.height=height;}
    apply();
  }
  apply();
  return{update,reset,getState:()=>({...camera}),clientPoint:point};
}
