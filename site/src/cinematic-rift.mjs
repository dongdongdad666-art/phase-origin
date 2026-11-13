import {ease} from './cinematic-timeline.mjs';
// Absolute story-time envelopes: no timers, random seeds or playback-direction state.
export function sampleRift(time){return {
 active:time>16.8&&time<19.25,
 charge:ease(16.8,17.55,time)*(1-ease(17.8,18.05,time)),
 filament:ease(16.85,17.05,time)*(1-ease(17.65,18.0,time)),
 cover:ease(17.05,18.02,time),reveal:ease(18.38,19.25,time)
};}
export const RiftShader={
 name:'SilverMineralRift',
 uniforms:{tDiffuse:{value:null},aspect:{value:1},center:{value:[.5,.5]},cover:{value:0},reveal:{value:0},charge:{value:0},filament:{value:0},reduced:{value:0}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:/* glsl */`
 uniform sampler2D tDiffuse;uniform float aspect,cover,reveal,charge,filament,reduced;uniform vec2 center;varying vec2 vUv;
 float hash(float v){return fract(sin(v*127.1+311.7)*43758.5453);}
 float noise(float v){float i=floor(v),f=fract(v);return mix(hash(i),hash(i+1.),f*f*(3.-2.*f))*2.-1.;}
 void main(){
  vec2 q=(vUv-center)*vec2(aspect,1.);
  float jagged=.065*noise(q.y*6.7)+.023*noise(q.y*29.3)+.009*noise(q.y*83.);
  float axis=q.x+.35*q.y+jagged,d=abs(axis),span=aspect+1.4;
  float entry=(1.-smoothstep(cover*span-.012,cover*span+.018,d))*smoothstep(0.,.012,cover);
  float opening=(1.-smoothstep(reveal*span-.018,reveal*span+.024,d))*smoothstep(0.,.012,reveal);
  if(cover>.999)entry=1.;if(reveal>.999)opening=1.;
  float mask=entry*(1.-opening);
  float bend=.012*charge*(1.-cover)*exp(-d*19.)*sign(axis)*(1.-reduced);
  vec2 warped=clamp(vUv+vec2(bend/aspect,bend*.25),vec2(.001),vec2(.999));
  vec3 color=texture2D(tDiffuse,warped).rgb;
  float rim=exp(-abs(d-cover*span)*95.)*cover*(1.-cover)*4.+exp(-abs(d-reveal*span)*80.)*reveal*(1.-reveal)*3.;
  float line=exp(-d*d/0.000009)*filament;
  color+=vec3(1.8,.65,.28)*exp(-d*40.)*charge*.35*(1.-reduced);
  color+=vec3(2.2,2.1,2.5)*(line+rim)*(1.-reduced);
  if(reduced>.5)mask=cover*(1.-reveal);
  color=mix(color,vec3(5.,4.9,5.3),mask);
  gl_FragColor=vec4(color,1.);
 }`
};
