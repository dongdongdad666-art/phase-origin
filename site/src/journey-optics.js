import {Vector2,Vector4} from 'three';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OPTICS_WAVES,RIPPLE_LIFETIME,RIPPLE_MAX_DISPLACEMENT,sampleRipple,createOpticsState,setOpticsPointer,pressOptics,advanceOptics,clearOptics,enableOptics} from './journey-optics-state.mjs';

// The pass receives display-referred color AFTER OutputPass. Do not apply tone
// mapping or sRGB conversion a second time. DOM typography remains untouched.
const fragmentShader=`
precision highp float;
uniform sampler2D tDiffuse;
uniform vec2 resolution,viewport;
uniform float clock,grainFrame,still;
uniform vec4 waves[${OPTICS_WAVES}];
uniform vec4 pulse;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float dust(vec2 uv,float layer){
 vec2 grid=vec2(9.,6.)*layer;
 vec2 drift=vec2(clock*.004,-clock*.006)/layer;
 vec2 q=(uv+drift)*grid,id=floor(q),f=fract(q);
 float seed=hash(id+layer*17.);
 vec2 center=vec2(.2+.6*hash(id+31.),.2+.6*hash(id+73.));
 vec2 d=(f-center)/grid*resolution;
 float size=mix(.65,1.1,seed);
 float dotLight=exp(-dot(d,d)/(size*size*2.));
 float halo=exp(-dot(d,d)/38.)*.10;
 return (dotLight+halo)*step(.78,seed)*(.65+.35*sin(clock*.65+seed*40.));
}
void main(){
 vec2 aspect=resolution/min(resolution.x,resolution.y);
 vec2 flowPixels=vec2(0.);
 float glint=0.;
 // Moving wave sources stay where they were emitted, expand, interfere, and
 // expire. Pixel-space radii keep the refraction consistent at every aspect.
 for(int i=0;i<${OPTICS_WAVES};i++){
  vec4 wave=waves[i];
  if(wave.z>0.&&wave.w>0.){
   vec2 delta=(vUv-wave.xy)*viewport;
   float distance=length(delta),radius=wave.z;
   float r=distance/radius;
   if(r<1.){
    float envelope=exp(-r*r*2.5)*(1.-smoothstep(.65,1.,r))*smoothstep(0.,.13,r);
    float phase=r*15.708;
    float strength=envelope*wave.w;
    vec2 radial=delta/max(distance,1.);
    flowPixels+=(radial+vec2(-radial.y,radial.x)*.09)*sin(phase)*strength*17.;
    glint+=max(0.,cos(phase))*strength*.032;
   }
  }
 }
 // Smooth radial saturation avoids flat clipped wave crests and limits total
 // displacement even where several waves overlap (rather than per-axis caps).
 flowPixels*=inversesqrt(1.+dot(flowPixels,flowPixels)/${(RIPPLE_MAX_DISPLACEMENT**2).toFixed(1)});
 vec2 flow=flowPixels/viewport;
 vec2 uv=clamp(vUv+flow,vec2(.001),vec2(.999));
 vec3 base=texture2D(tDiffuse,uv).rgb;
 base.r=texture2D(tDiffuse,clamp(uv+flow*.06,vec2(.001),vec2(.999))).r;
 base.b=texture2D(tDiffuse,clamp(uv-flow*.06,vec2(.001),vec2(.999))).b;
 base+=vec3(.45,.55,.9)*min(glint,.055);
 float age=pulse.z,life=(1.-smoothstep(.05,.9,age))*smoothstep(0.,.09,age);
 vec2 pd=(vUv-pulse.xy)*aspect;
 float warmth=exp(-dot(pd,pd)/(.0018+age*.018))*life;
 base+=vec3(.12,.065,.025)*warmth;
 float motes=(dust(vUv,1.)+dust(vUv,1.6)*.55)*(1.-still);
 base+=mix(vec3(.11,.16,.28),vec3(.24,.17,.11),step(.82,hash(floor(vUv*vec2(9.,6.)))))*motes;
 vec2 pixel=floor(vUv*resolution);
 float grain=hash(pixel+grainFrame*vec2(17.31,41.79))+hash(pixel+vec2(83.4,19.1)+grainFrame*7.13)-1.;
 float luminance=dot(base,vec3(.2126,.7152,.0722));
 base+=grain*.029*(.68+.32*(1.-smoothstep(.15,.85,luminance)));
 gl_FragColor=vec4(clamp(base,0.,1.),1.);
}`;

export function createJourneyOptics(canvas){
 const state=createOpticsState();
 const pass=new ShaderPass({uniforms:{tDiffuse:{value:null},resolution:{value:new Vector2(1,1)},viewport:{value:new Vector2(1,1)},clock:{value:0},grainFrame:{value:0},still:{value:0},waves:{value:Array.from({length:OPTICS_WAVES},()=>new Vector4(0,0,RIPPLE_LIFETIME,0))},pulse:{value:new Vector4(.5,.5,2,0)}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader});
 pass.material.depthTest=false;pass.material.depthWrite=false;
 const cursor=document.createElement('div');cursor.className='optical-cursor';cursor.setAttribute('aria-hidden','true');
 cursor.innerHTML=`<svg viewBox="0 0 64 64" fill="none"><defs><linearGradient id="phase-cursor-mineral" x1="22" y1="8" x2="37" y2="29" gradientUnits="userSpaceOnUse"><stop stop-color="#c2ddff" stop-opacity=".24"/><stop offset=".6" stop-color="#8b85da" stop-opacity=".42"/><stop offset="1" stop-color="#554d9c" stop-opacity=".05"/></linearGradient></defs><g class="crystal-shell">${[0,120,240].map(a=>`<g transform="rotate(${a} 32 32)"><g class="crystal-petal"><path class="crystal-face" d="M32 7C23 13 22 22 27 28L32 23L37 15Z"/><path class="crystal-ridge" d="M32 7L30 19L27 28M30 19L37 15"/></g></g>`).join('')}</g><path class="crystal-core" d="M32 27L35.5 32L32 37L28.5 32Z"/></svg>`;
 canvas.parentElement.append(cursor);
 const shell=cursor.querySelector('.crystal-shell'),petals=[...cursor.querySelectorAll('.crystal-petal')];
 function releasePointer(){delete document.body.dataset.crystalCursor;cursor.style.opacity='0';}
 function clear(){clearOptics(state);releasePointer();}
 function resize(w,h,dpr=1){state.width=w;state.height=h;pass.uniforms.resolution.value.set(w*dpr,h*dpr);pass.uniforms.viewport.value.set(w,h);clear();}
 function update(dt,reduced=false){
  advanceOptics(state,dt,reduced);pass.enabled=state.enabled;
  const u=pass.uniforms;
  u.clock.value=reduced?0:state.time;u.grainFrame.value=reduced?0:Math.floor(state.time*24);
  u.still.value=reduced?1:0;
  state.waves.forEach((w,i)=>{const envelope=sampleRipple(w.age,w.power);u.waves.value[i].set(w.x,1-w.y,envelope.radius,envelope.strength);});
  u.pulse.value.set(state.pulse.x,1-state.pulse.y,state.pulse.age,0);
  const head=state.head,tip=state.target??head,visible=state.enabled&&!reduced&&state.alpha>.05;
  const pulseOpen=Math.sin(Math.min(1,state.pulse.age/.55)*Math.PI)*Math.exp(-state.pulse.age*2);
  const spread=state.hover*4-state.energy*1.2-pulseOpen*7;
  // The small core is the exact hotspot; only its shell has inertial lag.
  cursor.style.opacity=String(visible?state.alpha*(.82+state.hover*.18):0);
  cursor.style.transform=`translate3d(${tip.x*state.width-24}px,${tip.y*state.height-24}px,0)`;
  const dx=Math.max(-5,Math.min(5,(head.x-tip.x)*state.width)),dy=Math.max(-5,Math.min(5,(head.y-tip.y)*state.height));
  shell.setAttribute('transform',`translate(${dx} ${dy}) rotate(${state.hover*18} 32 32)`);
  for(const petal of petals)petal.setAttribute('transform',`translate(0 ${spread})`);
  if(visible&&state.target)document.body.dataset.crystalCursor='true';else delete document.body.dataset.crystalCursor;
 }
 return {pass,resize,update,clear,setPointer:p=>setOpticsPointer(state,p),press:()=>pressOptics(state),setEnabled:enabled=>{enableOptics(state,enabled);pass.enabled=state.enabled;if(!enabled)releasePointer();},report:()=>({enabled:state.enabled,reduced:state.reduced,energy:state.energy,hover:state.hover,ripples:state.waves.filter(w=>w.age<RIPPLE_LIFETIME&&w.power>0).length}),dispose(){releasePointer();cursor.remove();pass.dispose();}};
}
