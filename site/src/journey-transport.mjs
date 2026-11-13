// Full-journey input changes story time only. Camera, materials and morph sampling
// stay deterministic, and the original 28-second study keeps its own transport.
export const DOCKS=Object.freeze([0,5,14,24,28,42,54,62,73,90,96]);
const END=96,STEP=1/240,MAX_SPEED=5.5,MAX_ACCEL=18;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const bounded=(t,fallback=0)=>clamp(Number.isFinite(t)?t:fallback,0,END);

export function createJourneyTransport(time=0,mode='explore'){
 const t=bounded(time),kind=mode==='paused'?'paused':mode==='auto'?'auto':'explore',playing=t<END&&kind!=='paused';
 return {time:t,target:t,velocity:0,playing,mode:kind,phase:playing?'cruise':'paused',inputIdle:0,direction:1,holdRemaining:0,remainder:0};
}
export function pauseJourney(state){
 return {...state,target:state.time,velocity:0,playing:false,mode:'paused',phase:'paused',inputIdle:0,holdRemaining:0,remainder:0};
}
export function seekJourney(state,time,immediate=false){
 const target=bounded(time,state.time);
 if(immediate)return {...pauseJourney(state),time:target,target};
 return {...state,target,playing:false,mode:'seek',phase:'seek',inputIdle:0,holdRemaining:0,remainder:0};
}
export function playJourney(state,mode='explore'){
 if(state.time>=END-.001)return createJourneyTransport(0,mode);
 return {...state,target:state.time,playing:true,mode:mode==='auto'?'auto':'explore',phase:'cruise',inputIdle:0,holdRemaining:0,remainder:0};
}
export function wheelJourney(state,pixels){
 if(!Number.isFinite(pixels)||pixels===0)return state;
 const direction=Math.sign(pixels),continuing=state.phase==='gesture'&&direction===state.direction;
 // A wheel burst is accumulated; trackpad events do not each skip a chapter.
 const target=bounded((continuing?state.target:state.time)+clamp(pixels,-2400,2400)*.012);
 return {...state,target,playing:true,mode:'explore',phase:'gesture',direction,inputIdle:0,holdRemaining:0};
}
function selectDock(state){
 const candidates=DOCKS.filter(t=>state.direction>0?t>state.time+.01:t<state.time-.01);
 // Snap toward the nearest intentional resting frame, not always beyond the
 // raw cursor. A 120px input near 5s should not accidentally skip to 14s.
 return candidates.reduce((best,t)=>Math.abs(t-state.target)<Math.abs(best-state.target)?t:best,candidates[0]??(state.direction>0?END:0));
}
function step(state,h){
 let s=state;
 if(s.phase==='hold'){
  s.holdRemaining=Math.max(0,s.holdRemaining-h);
  if(s.holdRemaining>0)return s;
  s.phase='cruise';
 }
 if(s.phase==='cruise'){
  const speed=s.mode==='auto'?1:.32,decay=Math.exp(-4*h),v=s.velocity;
  s.velocity=speed+(v-speed)*decay;
  s.time+=speed*h+(v-speed)*(1-decay)/4;s.target=s.time;
 }else{
  if(s.phase==='gesture'){
   s.inputIdle+=h;
   if(s.inputIdle>=.22){s.target=selectDock(s);s.phase='settle';}
  }
  // Critically damped near the destination; bounded acceleration and speed on
  // long traversals keep repeated gestures and reversals from snapping the camera.
  const acceleration=clamp(16*(s.target-s.time)-8*s.velocity,-MAX_ACCEL,MAX_ACCEL);
  const v=s.velocity;s.velocity=clamp(v+acceleration*h,-MAX_SPEED,MAX_SPEED);
  s.time+=(v+s.velocity)*h*.5;
  if(s.phase!=='gesture'&&Math.abs(s.target-s.time)<.004&&Math.abs(s.velocity)<.025){
   s.time=s.target;s.velocity=0;
   if(s.phase==='seek')return pauseJourney(s);
   s.phase='hold';s.holdRemaining=1.2;
  }
 }
 if(s.time>=END){
  s.time=END;
  // An incoming reversal may still carry outward momentum. Hitting the end
  // clamps that momentum, but must not discard its already-requested target.
  if(s.target<END&&s.phase!=='cruise')s.velocity=Math.min(0,s.velocity);
  else return pauseJourney(s);
 }
 if(s.time<0){s.time=0;s.velocity=Math.max(0,s.velocity);}
 return s;
}
export function advanceJourney(state,dt){
 if(!Number.isFinite(dt)||dt<=0||state.phase==='paused')return state;
 let s={...state,remainder:state.remainder+Math.min(dt,.1)};
 // A fixed, small step makes mouse gestures behave alike at 30/60/144 Hz.
 while(s.remainder>=STEP-1e-10){
  s.remainder=Math.max(0,s.remainder-STEP);
  s=step(s,STEP);
  if(s.phase==='paused')break;
 }
 return s;
}
