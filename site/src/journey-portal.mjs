import * as THREE from 'three';
import {TRANSIT_APERTURE} from './transit-gate.mjs';
import {sampleCrossing} from './journey-crossing.mjs';

export const PORTAL_CENTER=[18,44,-13.06];

export function samplePortal(seconds){
 const {time,amount,opening,scale}=sampleCrossing(seconds);
 return {time,amount,opening,scale};
}

// This is a volume behind the existing frame, not a camera-facing replacement.
// All motion comes from the story clock so reverse scrolling restores each layer.
export function createPhasePortal(scene){
 const portal=new THREE.Group();portal.name='Gate / recessed phase passage';portal.position.fromArray(PORTAL_CENTER);scene.add(portal);
 const uniforms={amount:{value:0},opening:{value:0},clock:{value:0}};
 const vertex=`varying vec2 local;void main(){local=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
 const rings=[];
 for(let i=0;i<10;i++){
  const radius=TRANSIT_APERTURE-i*.42;
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{...uniforms,radius:{value:radius},layer:{value:i}},vertexShader:vertex,fragmentShader:`
   varying vec2 local;uniform float amount,opening,clock,radius,layer;
   const float TAU=6.28318530718;
   void main(){
    float r=length(local),a=atan(local.y,local.x),phase=a/TAU+.5;
    float stroke=exp(-pow((r-radius+.075)*65.,2.));
    float inner=exp(-pow((r-radius+.145)*130.,2.));
    float sector=fract(phase*3.+layer*.11);
    float gap=smoothstep(.035,.085,sector)*(1.-smoothstep(.90,.96,sector));
    float marks=pow(max(0.,cos(a*42.+layer*.5)),18.);
    float pulse=pow(.5+.5*cos(a*3.-clock*.36-layer*.8),12.);
    vec3 blue=vec3(.065,.16,.65),ice=vec3(.18,.48,.78);
    vec3 color=mix(blue,ice,pulse*.6+inner*.3);
    float light=(stroke*(.37+pulse*.28)+inner*.16+marks*.06)*gap;
    float edge=(1.-smoothstep(radius-.025,radius,r))*smoothstep(radius-.21,radius-.18,r);
    float unseal=1.-smoothstep(.80,1.,opening);
    gl_FragColor=vec4(color,amount*edge*(.12+light)*unseal*(1.-layer*.055));
   }`});
  const ring=new THREE.Mesh(new THREE.RingGeometry(radius-.21,radius,144,1),material);
  ring.position.z=-.1-i*1.75;ring.rotation.z=i*.23;ring.name=`Optical depth ring ${i+1}`;
  ring.renderOrder=2;portal.add(ring);rings.push(ring);
 }
 // A real tapered liner closes the gaps between rings; distant mountains must
 // not read as a flat grey disk inside the passage before it opens.
 const linerPositions=[],linerIndices=[],segments=128;
 for(let j=0;j<=12;j++)for(let i=0;i<=segments;i++){
  const u=j/12,a=i/segments*Math.PI*2,r=TRANSIT_APERTURE-u*4.2;
  linerPositions.push(Math.cos(a)*r,Math.sin(a)*r,-.08-u*21.92);
  if(j<12&&i<segments){const k=j*(segments+1)+i;linerIndices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
 }
 const linerGeometry=new THREE.BufferGeometry();linerGeometry.setAttribute('position',new THREE.Float32BufferAttribute(linerPositions,3));linerGeometry.setIndex(linerIndices);
 const liner=new THREE.Mesh(linerGeometry,new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms,vertexShader:`
  varying vec3 surface;void main(){surface=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
 `,fragmentShader:`
  varying vec3 surface;uniform float amount,opening,clock;
  void main(){
   float r=length(surface.xy)/6.78,a=atan(surface.y,surface.x),depth=-surface.z/22.;
   float facets=pow(.5+.5*cos(a*6.+depth*.6),7.);
   float fine=pow(.5+.5*cos(a*108.+depth*12.),28.);
   float aperture=smoothstep(opening*1.18-.05,opening*1.18+.04,r);
   vec3 color=vec3(.004,.008,.028)+vec3(.012,.027,.09)*facets;
   color+=vec3(.009,.018,.055)*fine*.24;
   color*=1.-depth*.5;
   gl_FragColor=vec4(color,amount*aperture);
  }`}));liner.name='Recessed optical liner';liner.renderOrder=1;portal.add(liner);
 // A recessed dark optical well gives the light rings somewhere to recede into.
 // It opens after the lens enters: the destination replaces the valley inside
 // the closed passage, never through a transparent gap ahead of the crossing.
 const well=new THREE.Mesh(new THREE.CircleGeometry(2.6,96),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms,vertexShader:vertex,fragmentShader:`
  varying vec2 local;uniform float amount,opening,clock;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){
   vec2 p=local/2.6;float r=length(p),a=atan(p.y,p.x);
   float edge=1.-smoothstep(.99,1.,r);
   float aperture=smoothstep(opening*1.18-.06,opening*1.18+.035,length(local)/6.78);
   float interference=.5+.5*sin(r*67.-clock*.12+sin(a*3.)*.5);
   float rim=exp(-r*r*10.)*.15;
   vec3 color=vec3(.003,.007,.025)+vec3(.009,.018,.075)*rim;
   color+=vec3(.007,.014,.035)*interference*rim*.25;
   // A restrained amber trace is the link to the later world-core.
   float energy=exp(-r*r*300.)*(.8+.2*sin(clock*.25));
   color+=vec3(.7,.24,.07)*energy+vec3(1.,.64,.3)*exp(-r*r*18000.);
   color+=(hash(gl_FragCoord.xy)-.5)*.0015;
   gl_FragColor=vec4(color,amount*edge*aperture);
  }`}));
 well.name='Opening optical well';well.position.z=-22;portal.add(well);

 const railMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms,vertexShader:`
  varying float along;void main(){along=uv.x;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
 `,fragmentShader:`
  varying float along;uniform float amount,opening,clock;
  void main(){
   float pulse=pow(.5+.5*cos(along*6.2831853-clock*.6),24.);
   float ends=smoothstep(0.,.08,along)*(1.-smoothstep(.84,1.,along));
   gl_FragColor=vec4(mix(vec3(.06,.20,.65),vec3(.2,.48,.7),pulse),amount*(.10+pulse*.34)*ends*(1.-opening));
  }`});
 for(let i=0;i<6;i++){
  const points=[];
  for(let j=0;j<=28;j++){
   const u=j/28,a=i*Math.PI/3+u*.42,r=TRANSIT_APERTURE-.13-u*4.1;
   points.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,-.12-u*21.3));
  }
  const line=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.012,4,false),railMaterial);
  line.name='Axial optical filament';line.renderOrder=3;portal.add(line);
 }

 const glintGeometry=new THREE.BufferGeometry(),positions=[],phases=[];
 for(let i=0;i<540;i++){
  const u=(i*.61803398875)%1,a=i*2.399963,r=(TRANSIT_APERTURE-.25-u*4.1)*(.4+((i*.37)%1)*.58);
  positions.push(Math.cos(a)*r,Math.sin(a)*r,-.2-u*21.3);phases.push(i*.73);
 }
 glintGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));glintGeometry.setAttribute('phase',new THREE.Float32BufferAttribute(phases,1));
 const glints=new THREE.Points(glintGeometry,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms,vertexShader:`
  attribute float phase;varying float flicker;uniform float clock;
  void main(){vec3 p=position;float a=clock*.006;p.xy=mat2(cos(a),-sin(a),sin(a),cos(a))*p.xy;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(36./max(1.,-mv.z),1.2,2.6);flicker=.35+.65*pow(.5+.5*sin(phase-clock*.5),4.);}
 `,fragmentShader:`
  varying float flicker;uniform float amount,opening;
  void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vec3(.36,.48,.95),amount*(1.-opening)*flicker*(1.-smoothstep(.12,.5,d))*.85);}
 `}));glints.renderOrder=3;portal.add(glints);

 let sampled=samplePortal(0);
 function apply(sample){
  sampled=sample;portal.visible=sampled.amount>.00001;
  portal.scale.set(sampled.scale??1,sampled.scale??1,1);
  uniforms.amount.value=sampled.amount;uniforms.opening.value=sampled.opening;uniforms.clock.value=sampled.time;
  rings.forEach((ring,i)=>{ring.rotation.z=i*.23+(sampled.time-69)*.014*(i%2?-1:1);});
 }
 function update(time){apply(samplePortal(time));}
 // Material-lab activation lights the passage, never transforms its fixed frame.
 function preview(amount,clock=0){apply({time:clock,amount:THREE.MathUtils.clamp(amount,0,1),opening:0});}
 function dispose(){portal.removeFromParent();const geometry=new Set(),material=new Set();portal.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)material.add(o.material);});geometry.forEach(g=>g.dispose());material.forEach(m=>m.dispose());}
 update(0);return {portal,rings,liner,well,update,preview,dispose,report:()=>({...sampled})};
}
