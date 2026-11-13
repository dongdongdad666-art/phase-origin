export const DURATION=28;
export const CUTS=[9.4,18.2];
export const SUBJECTS={
 ark:{position:[-9,3,0],scale:9,rotation:.35,version:'phase-deform-v005'},
 capsule:{position:[4,3,-7],scale:7.2,rotation:-.2,version:'phase-deform-v005'},
 core:{position:[18,3.8,-13],scale:8.4,rotation:.4,version:'core-look-v004'}
};
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export function ease(a,b,t){const x=clamp((t-a)/(b-a));return x*x*x*(x*(x*6-15)+10);}
export function sampleStudy(seconds){
 const time=clamp(Number.isFinite(seconds)?seconds:0,0,DURATION);
 const subject=time<CUTS[0]?'ark':time<CUTS[1]?'capsule':'core';
 return {time,subject,actors:{
  ark:{visible:subject==='ark',deployment:.12+.78*ease(1.2,8.8,time)},
  capsule:{visible:subject==='capsule',deployment:ease(10.5,16.8,time)},
  core:{visible:subject==='core',deployment:.08+.92*ease(19.5,25.8,time)}
 }};
}
// Only scroll progress is damped. Scene, camera and morphs all sample that same time.
export function advanceTransport(state,dt,duration=DURATION,maxRate=10){
 dt=Number.isFinite(dt)?Math.max(0,dt):0;
 if(state.playing){const time=Math.min(duration,state.time+dt);return {time,target:time,velocity:0,playing:time<duration};}
 dt=Math.min(dt,.1);
 const target=clamp(state.target,0,duration),omega=13,offset=state.time-target;
 const c=state.velocity+omega*offset,e=Math.exp(-omega*dt);
 let time=target+(offset+c*dt)*e,velocity=(state.velocity-omega*c*dt)*e;
 time=state.time+clamp(time-state.time,-maxRate*dt,maxRate*dt);velocity=clamp(velocity,-maxRate,maxRate);
 if(Math.abs(time-target)<.0001&&Math.abs(velocity)<.001){time=target;velocity=0;}
 if(time<0||time>duration){time=clamp(time,0,duration);velocity=0;}
 return {time,target,velocity,playing:false};
}
export function sampleCamera(rail,seconds){
 const f=clamp(seconds,0,rail.duration??DURATION)*rail.fps,i=Math.min(rail.frames.length-2,Math.floor(f)),u=f-i;
 const a=rail.frames[i],b=rail.frames[i+1],position=a.p.map((v,k)=>v+(b.p[k]-v)*u);
 let dot=a.q.reduce((s,v,k)=>s+v*b.q[k],0),sign=dot<0?-1:1;dot=Math.abs(dot);
 let wa=1-u,wb=u;if(dot<.9995){const theta=Math.acos(clamp(dot,-1,1)),s=Math.sin(theta);wa=Math.sin((1-u)*theta)/s;wb=Math.sin(u*theta)/s;}
 const q=a.q.map((v,k)=>v*wa+b.q[k]*wb*sign),len=Math.hypot(...q);
 return {position,quaternion:q.map(v=>v/len),fov:a.f+(b.f-a.f)*u};
}
