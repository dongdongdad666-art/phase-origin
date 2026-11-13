export const WATER_LEVEL=-1.96;
export const MAX_RIPPLES=12;
export const RIPPLE_LIFETIME=4.8;
const EMIT_INTERVAL=.48;
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;

export function createWaterInteraction(){
 return {clock:0,ripples:[],cooldown:0};
}

export function clearWaterInteraction(state){
 return {clock:Math.max(0,finite(state?.clock)),ripples:[],cooldown:0};
}

// Real elapsed interaction time is deliberately independent of reversible story
// time. Hovering emits repeatedly; leaving only stops new waves, not their decay.
export function advanceWaterInteraction(state,dt,hit,reduced=false){
 const elapsed=Math.max(0,Math.min(.1,finite(dt))),clock=Math.max(0,finite(state?.clock))+elapsed;
 if(reduced)return {clock,ripples:[],cooldown:0};
 const ripples=(Array.isArray(state?.ripples)?state.ripples:[])
  .filter(r=>r&&[r.x,r.z,r.born,r.strength].every(Number.isFinite)&&r.born>=0&&r.born<=clock&&clock-r.born<RIPPLE_LIFETIME&&r.strength>0)
  .slice(-MAX_RIPPLES)
  .map(r=>({x:r.x,z:r.z,born:r.born,strength:Math.min(1,r.strength)}));
 const validHit=hit&&!Array.isArray(hit)&&Number.isFinite(hit.x)&&Number.isFinite(hit.z);
 if(!validHit)return {clock,ripples,cooldown:0};
 let cooldown=Math.max(0,Math.min(EMIT_INTERVAL,finite(state?.cooldown))-elapsed);
 if(cooldown<=1e-9){
  if(ripples.length===MAX_RIPPLES)ripples.shift();
  ripples.push({x:hit.x,z:hit.z,born:clock,strength:1});
  cooldown=EMIT_INTERVAL;
 }
 return {clock,ripples,cooldown};
}
