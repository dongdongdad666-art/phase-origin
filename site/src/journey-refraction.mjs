import {ease} from './cinematic-timeline.mjs';

export const REFRACTION_WINDOW=[16.8,19.6];
export function sampleRefraction(seconds){
 const time=Number.isFinite(seconds)?seconds:0;
 return {
  active:time>REFRACTION_WINDOW[0]&&time<REFRACTION_WINDOW[1],
  progress:Math.max(0,Math.min(1,(time-16.8)/2.8)),
  wave:ease(17.35,19.05,time),
  strength:ease(17.1,17.65,time)*(1-ease(18.9,19.6,time)),
  charge:ease(16.8,17.35,time)*(1-ease(17.65,18.5,time))
 };
}

// Match endpoint velocity as well as position, so the bridge joins the original orbit.
export function bridgeAnchor(u,a,b,va,vb,duration){
 const x=Math.max(0,Math.min(1,u)),x2=x*x,x3=x2*x;
 return a.map((v,i)=>(2*x3-3*x2+1)*v+(x3-2*x2+x)*va[i]*duration+(-2*x3+3*x2)*b[i]+(x3-x2)*vb[i]*duration);
}

export const RefractionShader={
 name:'MineralRefractionHandoff',
 uniforms:{source:{value:null},destination:{value:null},center:{value:[.5,.5]},aspect:{value:1},wave:{value:0},strength:{value:0},charge:{value:0},seedRadius:{value:.1},reduced:{value:0}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:/* glsl */`
 uniform sampler2D source,destination;
 uniform vec2 center;
 uniform float aspect,wave,strength,charge,seedRadius,reduced;
 varying vec2 vUv;
 vec2 safeUv(vec2 p){return clamp(p,vec2(.001),vec2(.999));}
 vec3 glassSample(sampler2D tex,vec2 p,vec2 bend,float blur){
  vec2 uv=safeUv(p+bend);
  vec3 c=texture2D(tex,uv).rgb*.5;
  c+=texture2D(tex,safeUv(uv+vec2(blur,blur*.35))).rgb*.25;
  c+=texture2D(tex,safeUv(uv-vec2(blur,blur*.35))).rgb*.25;
  return c;
 }
 void main(){
  vec2 ratio=vec2(aspect,1.),q=(vUv-center)*ratio;
  float d=length(q),angle=atan(q.y,q.x);
  vec2 direction=q/max(d,.0001);
  float farthest=length(max(center,1.-center)*ratio);
  float radius=mix(-.24,farthest+.25,wave);
  float contour=d-radius+.014*sin(angle*3.+radius*5.)+.008*sin(angle*7.-radius*3.);
  float band=exp(-pow(contour/.095,2.))*strength;
  float fringe=exp(-pow((contour+.045)/.024,2.))*strength;
  float lens=sin(contour*25.)*band*.023*(1.-reduced);
  vec2 bend=direction/ratio*lens;
  float select=1.-smoothstep(-.055,.055,contour);
  if(wave<=.000001)select=0.;if(wave>=.999999)select=1.;
  if(reduced>.5)select=wave;
  vec3 a=glassSample(source,vUv,bend,band*.006*(1.-reduced));
  vec3 b=glassSample(destination,vUv,-bend*.75,band*.006*(1.-reduced));
  vec3 color=mix(a,b,select);
  // Light stays on the glass wavefront; no opaque disk or full-frame exposure pulse.
  color+=vec3(.026,.038,.10)*band*(1.-reduced);
  color+=vec3(.022,.045,.12)*fringe*(1.-reduced);
  float seed=exp(-pow(d/max(.025,seedRadius*.68),2.)*2.5);
  color+=vec3(.30,.074,.014)*seed*charge;
  gl_FragColor=vec4(color,1.);
 }`
};
