// Screen-space feedback owns no story time. Fixed steps keep the wake stable
// across 30 / 60 / 144 Hz displays; hidden-tab gaps are deliberately discarded.
export const OPTICS_WAVES=24;
export const RIPPLE_LIFETIME=2.4;
export const RIPPLE_MAX_DISPLACEMENT=10;
const RIPPLE_INTERVAL=.115;
const STEP=1/120;
const approach=(a,b,rate,dt)=>b+(a-b)*Math.exp(-rate*dt);
const smooth5=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10);};
// Shared by the renderer and tests: a soft attack, decelerating spread, and a
// long C2-continuous release. Broad reach does not require large displacement.
export function sampleRipple(age,power){
 if(!Number.isFinite(age)||!Number.isFinite(power)||power<=0||age<0||age>=RIPPLE_LIFETIME)return {radius:0,strength:0};
 const radius=(82+330*-Math.expm1(-age/1.05))*Math.sqrt(power);
 const strength=power*smooth5(age/.16)*Math.exp(-age*.45)*(1-smooth5((age-.4)/(RIPPLE_LIFETIME-.4)));
 return {radius,strength};
}
export function createOpticsState(){
 return {enabled:true,reduced:false,time:0,remainder:0,target:null,initialized:false,
  head:{x:.5,y:.5},energy:0,alpha:0,hover:0,
  waves:Array.from({length:OPTICS_WAVES},()=>({x:0,y:0,age:RIPPLE_LIFETIME,power:0})),nextWave:0,lastWaveAt:-1,lastWavePoint:null,
  pulse:{x:.5,y:.5,age:2},width:1,height:1};
}
export function clearOptics(s){s.target=null;s.initialized=false;s.energy=0;s.alpha=0;s.hover=0;s.pulse.age=2;s.remainder=0;s.lastWavePoint=null;s.lastWaveAt=-1;s.nextWave=0;for(const w of s.waves){w.age=RIPPLE_LIFETIME;w.power=0;}}
export function setOpticsPointer(s,p){
 if(!s.enabled||s.reduced||!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1){s.target=null;s.initialized=false;s.lastWavePoint=null;return;}
 s.target={x:p.x,y:p.y,control:!!p.control};
 if(!s.initialized){s.head.x=p.x;s.head.y=p.y;s.lastWavePoint={x:p.x,y:p.y};s.initialized=true;}
}
function emitWave(s,p,power){const w=s.waves[s.nextWave];w.x=p.x;w.y=p.y;w.age=0;w.power=power;s.nextWave=(s.nextWave+1)%OPTICS_WAVES;s.lastWaveAt=s.time;s.lastWavePoint={x:p.x,y:p.y};}
export function pressOptics(s){
 if(s.enabled&&!s.reduced&&s.target&&!s.target.control){s.pulse={x:s.target.x,y:s.target.y,age:0};if(s.time-s.lastWaveAt>=RIPPLE_INTERVAL)emitWave(s,s.target,1.15);}
}
export function enableOptics(s,enabled){s.enabled=!!enabled;if(!s.enabled)clearOptics(s);}
export function advanceOptics(s,dt,reduced=false){
 s.reduced=!!reduced;
 if(!s.enabled||s.reduced){clearOptics(s);return s;}
 if(!Number.isFinite(dt)||dt<=0||dt>=1)return s;
 s.remainder+=Math.min(dt,.1);
 while(s.remainder+1e-10>=STEP){
  s.remainder-=STEP;s.time+=STEP;s.pulse.age=Math.min(2,s.pulse.age+STEP);
  for(const w of s.waves)w.age=Math.min(RIPPLE_LIFETIME,w.age+STEP);
  const head=s.head,x=head.x,y=head.y,t=s.target;
  if(t){head.x=approach(head.x,t.x,20,STEP);head.y=approach(head.y,t.y,20,STEP);}
  const speed=Math.hypot((head.x-x)*s.width,(head.y-y)*s.height)/STEP;
  s.energy=approach(s.energy,t&&!t.control?Math.min(1,speed/650):0,6,STEP);
  s.alpha=approach(s.alpha,t?1:0,t?14:8,STEP);
  s.hover=approach(s.hover,t?.control?1:0,15,STEP);
  if(t&&!t.control){
   const p=s.lastWavePoint??head,distance=Math.hypot((head.x-p.x)*s.width,(head.y-p.y)*s.height);
   // Distance and time gates prevent dense pointer events from flooding the screen.
   if(distance>=34&&s.time-s.lastWaveAt>=RIPPLE_INTERVAL&&speed>12)emitWave(s,head,.55+.35*Math.min(speed/800,1));
  }else{s.lastWavePoint={x:head.x,y:head.y};}
 }
 return s;
}
