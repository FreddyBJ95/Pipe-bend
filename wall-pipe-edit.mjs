// Numeric edits to a pipe's theoretical centerline vertices. This module does
// not change the measured walls or decide whether an edited pipe is safe.
// Always pass the returned points through validateWallRoute before Apply.
const MAX_POINTS = 201;
const MAX_COORDINATE = 1e9;
const MAX_LENGTH = 2 * MAX_COORDINATE * Math.SQRT2;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const fail = (error, code, details = {}) => ({ok:false, code, error, ...details});
const copyPoints = points => points.map(point => point.slice());

/**
 * Recover vertex lengths and signed turns without merging vertices. Keeping
 * every index also lets users repair a coordinated, temporarily invalid edit.
 * Distances are mm; turns are degrees (+left); heading is radians.
 */
export function pipeModelFromPoints(points) {
  if(!Array.isArray(points) || points.length < 2) {
    return fail('Røret skal bestå af mindst to gyldige punkter.', 'INVALID_POINTS');
  }
  if(points.length > MAX_POINTS) {
    return fail('Røret må højst have 200 stykker.', 'TOO_MANY_BENDS');
  }
  for(let index=0; index<points.length; index++) {
    const point=points[index];
    if(!Array.isArray(point) || point.length !== 2 || !point.every(finite) ||
      !finite(point[0]) || !finite(point[1]) || point.some(n => Math.abs(n)>MAX_COORDINATE)) {
      return fail('Et rørpunkt har ugyldige eller for store koordinater.', 'INVALID_POINTS', {index});
    }
  }
  const lengths=[], headings=[], turns=[];
  for(let index=0; index<points.length-1; index++) {
    const dx=points[index+1][0]-points[index][0], dy=points[index+1][1]-points[index][1];
    const length=Math.hypot(dx,dy);
    if(!finite(length) || length<=0) {
      return fail('To rørpunkter ligger i samme punkt. Flyt eller fjern et af punkterne.', 'ZERO_LENGTH', {index});
    }
    lengths.push(length);
    headings.push(Math.atan2(dy,dx));
    if(index) {
      const delta=headings[index]-headings[index-1];
      turns.push(Math.atan2(Math.sin(delta),Math.cos(delta))*180/Math.PI);
    }
  }
  return {ok:true, points:copyPoints(points), start:points[0].slice(),
    heading:headings[0], lengths, turns};
}

/**
 * Edit one length or turn, keeping A and the first direction fixed. A length
 * change translates the downstream pipe; a turn change rotates it about its
 * corner. No constraint, wall, endpoint setting, or input array is mutated.
 */
export function editWallPipe(points, edit) {
  const model=pipeModelFromPoints(points);
  if(!model.ok)return model;
  if(!edit || !['length','turn'].includes(edit.type) || !Number.isInteger(edit.index)) {
    return fail('Vælg et gyldigt rørstykke eller buk.', 'INVALID_EDIT');
  }
  const {type,index,value}=edit, current=type==='length'?model.lengths:model.turns;
  if(index<0 || index>=current.length) {
    return fail('Det valgte rørstykke eller buk findes ikke.', 'INVALID_EDIT', {type,index});
  }
  if(!finite(value))return fail('Indtast et gyldigt tal.', 'INVALID_INPUT', {type,index});
  if(type==='length' && (value<=0 || value>MAX_LENGTH)) {
    return fail('Rørlængden skal være positiv og inden for tegningens mål.', 'INVALID_INPUT', {type,index});
  }
  if(type==='turn' && Math.abs(value)>=179) {
    return fail('Bukkevinklen skal være mindre end 179°.', 'REVERSAL', {type,index});
  }
  // Do not rebuild a pipe when its exact value is unchanged: repeated focus,
  // validation and field refresh must never accumulate coordinate drift.
  if(value===current[index])return model;
  const next=copyPoints(points);
  if(type==='length') {
    const length=model.lengths[index], delta=value-length;
    const vx=points[index+1][0]-points[index][0], vy=points[index+1][1]-points[index][1];
    // Scale before normalizing so subnormal source coordinates cannot turn a
    // diagonal into a non-unit vector when hypot rounds at the numeric limit.
    const scale=Math.max(Math.abs(vx),Math.abs(vy)), nx=vx/scale, ny=vy/scale;
    const norm=Math.hypot(nx,ny), dx=nx/norm*delta, dy=ny/norm*delta;
    for(let i=index+1;i<next.length;i++)next[i]=[points[i][0]+dx,points[i][1]+dy];
  }else {
    const pivot=points[index+1], delta=(value-model.turns[index])*Math.PI/180;
    const cos=Math.cos(delta), sin=Math.sin(delta);
    for(let i=index+2;i<next.length;i++) {
      const x=points[i][0]-pivot[0], y=points[i][1]-pivot[1];
      next[i]=[pivot[0]+x*cos-y*sin,pivot[1]+x*sin+y*cos];
    }
  }
  const result=pipeModelFromPoints(next);
  if(!result.ok)return result;
  // These operations preserve the first direction by definition. Preserve its
  // exact original numeric representation as well as the physical direction.
  result.heading=model.heading;
  return result;
}
