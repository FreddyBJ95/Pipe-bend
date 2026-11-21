import assert from 'node:assert/strict';
import {createWallViewport} from './wall-viewport.mjs';

// A small event host keeps camera and gesture regressions independent of a
// browser renderer. Native SVG hit testing is covered by application review.
class Element {
  constructor(){
    this.events=new Map();this.attrs={};this.captured=new Set();
    this.disabled=false;this.textContent='';
  }
  addEventListener(type,fn,options){
    const listeners=this.events.get(type)||[];
    listeners.push({fn,capture:options===true});this.events.set(type,listeners);
  }
  setAttribute(key,value){this.attrs[key]=value;}
  getBoundingClientRect(){return{left:10,top:20,width:800,height:400};}
  setPointerCapture(id){this.captured.add(id);}
  hasPointerCapture(id){return this.captured.has(id);}
  releasePointerCapture(id){this.captured.delete(id);}
  emit(type,extra={}){
    const event={target:this,detail:1,button:0,
      preventDefault(){this.prevented=true;},
      stopPropagation(){this.stopped=true;},
      stopImmediatePropagation(){this.immediate=true;},...extra};
    const listeners=this.events.get(type)||[];
    for(const {fn}of [...listeners.filter(n=>n.capture),...listeners.filter(n=>!n.capture)]){
      if(event.immediate)break;fn(event);
    }
    return event;
  }
}
const host=new Element(),svg=new Element(),zoomIn=new Element(),zoomOut=new Element(),fit=new Element(),output=new Element();
svg.ownerDocument={defaultView:host};
const viewport=createWallViewport({svg,zoomIn,zoomOut,fit,output});
const near=(actual,expected,message)=>assert(Math.abs(actual-expected)<1e-10,message);
viewport.update(800,400);
assert.deepEqual(viewport.getState(),{zoom:1,x:400,y:200,width:800,height:400});
assert.equal(output.textContent,'100%');assert(zoomOut.disabled);

// Wheel zoom must preserve the world point under the cursor.
const anchor=viewport.clientPoint(610,120);
svg.emit('wheel',{clientX:610,clientY:120,deltaY:-200});
const after=viewport.clientPoint(610,120);
near(after.x,anchor.x);near(after.y,anchor.y);
assert(viewport.getState().zoom>1);
let old=viewport.getState();
viewport.update(800,400);
assert.deepEqual(viewport.getState(),old,'Numeric redraw must preserve the camera');

// Taps on selectable pipe pieces must not be retargeted by pointer capture.
svg.emit('pointerdown',{pointerId:1,clientX:210,clientY:120,target:{role:'button'}});
assert.equal(svg.captured.size,0);
svg.emit('pointermove',{pointerId:1,clientX:213,clientY:122});
assert.deepEqual(viewport.getState(),old,'Tap jitter must not pan');
svg.emit('pointerup',{pointerId:1});
assert(!svg.emit('click').prevented,'An ordinary target tap remains selectable');

svg.emit('pointerdown',{pointerId:1,clientX:210,clientY:120,target:{role:'button'}});
svg.emit('pointermove',{pointerId:1,clientX:250,clientY:130});
assert(svg.captured.has(1));assert(viewport.getState().x<old.x);
svg.emit('pointerup',{pointerId:1});
assert(svg.emit('click').prevented,'Dragging must not select a pipe piece');
svg.emit('pointerdown',{pointerId:1,clientX:210,clientY:120});
svg.emit('pointerup',{pointerId:1});
assert(!svg.emit('click').prevented,'A fresh tap after dragging must work');

// Uncaptured taps can finish outside the SVG. Their stale IDs must not turn
// the next, differently numbered touch into an accidental two-finger pinch.
for(const end of ['pointerup','pointercancel']){
  fit.emit('click');
  svg.emit('pointerdown',{pointerId:70,clientX:210,clientY:120});
  host.emit(end,{pointerId:70,target:{outside:true}});
  svg.emit('pointerdown',{pointerId:71,clientX:310,clientY:120});
  assert.equal(svg.captured.size,0,`${end} outside must clear the old pointer`);
  svg.emit('pointermove',{pointerId:71,clientX:330,clientY:120});
  assert.equal(viewport.getState().zoom,1,'The remaining pointer must pan, not pinch');
  assert.equal(svg.captured.size,1);
  host.emit('pointerup',{pointerId:71,target:{outside:true}});
  assert.equal(svg.captured.size,0,'Global pointer end releases a captured drag');
}

fit.emit('click');
assert.equal(viewport.getState().zoom,1);assert.equal(viewport.getState().x,400);
svg.emit('pointerdown',{pointerId:1,clientX:210,clientY:220});
svg.emit('pointerdown',{pointerId:2,clientX:410,clientY:220});
const pinchAnchor=viewport.clientPoint(310,220);
svg.emit('pointermove',{pointerId:2,clientX:610,clientY:220});
const pinchAfter=viewport.clientPoint(410,220);
assert.equal(viewport.getState().zoom,2);
near(pinchAfter.x,pinchAnchor.x,'Pinch anchor follows the moving midpoint');
near(pinchAfter.y,pinchAnchor.y);
assert.equal(svg.captured.size,2);
svg.emit('pointerup',{pointerId:1});svg.emit('pointerup',{pointerId:2});
assert(svg.emit('click').prevented);

for(let i=0;i<30;i++)zoomIn.emit('click');
assert.equal(viewport.getState().zoom,8);assert(zoomIn.disabled);
svg.emit('keydown',{key:'0'});assert.equal(viewport.getState().zoom,1);
old=viewport.getState();svg.emit('keydown',{key:'ArrowRight'});
assert.equal(viewport.getState().x,old.x+45);
svg.emit('keydown',{key:'+',target:{role:'button'}});
assert.equal(viewport.getState().zoom,1,'Part keyboard actions must not zoom');
assert(!svg.emit('click',{detail:0}).prevented,'Keyboard activation remains available');

// Letterboxed SVGs still need a stable wheel anchor after viewport resize.
viewport.reset();viewport.update(400,800);
assert.equal(viewport.getState().x,200);assert.equal(viewport.getState().y,400);
const letterboxAnchor=viewport.clientPoint(510,120);
svg.emit('wheel',{clientX:510,clientY:120,deltaY:-200});
const letterboxAfter=viewport.clientPoint(510,120);
near(letterboxAfter.x,letterboxAnchor.x);near(letterboxAfter.y,letterboxAnchor.y);
assert(svg.attrs.viewBox.split(' ').every(n=>Number.isFinite(Number(n))));
fit.emit('click');assert.equal(output.textContent,'100%');assert(zoomOut.disabled);

console.log('Wall viewport zoom, pan, pinch, pointer cleanup, redraw, keyboard and fit tests passed.');
