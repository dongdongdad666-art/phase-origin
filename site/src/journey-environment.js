import * as THREE from 'three';
import {ease} from './cinematic-timeline.mjs';
import {createJourneyLandscape} from './journey-landscape.mjs';
import {createJourneyWater} from './journey-water.js';
import {createJourneyEvolution} from './journey-evolution.mjs';
import {createPhasePortal} from './journey-portal.mjs';
import {sampleCrossing} from './journey-crossing.mjs';

// All ambience is sampled from story time, including on reverse scroll.
export function createJourneyEnvironment(scene){
 const clock={value:0},growth={value:0},arrival={value:0},calibration={value:0};
 const landscape=createJourneyLandscape(scene);
 const evolution=createJourneyEvolution(scene);
 const waterSystem=createJourneyWater(scene,{heightAt:landscape.heightAt,terrain:landscape.terrain});
 const water=waterSystem.water,ridges=[landscape.terrain];
 const starPositions=[];for(let i=0;i<420;i++){const a=i*2.399963,y=.2+.78*((i*73%421)/421),r=Math.sqrt(1-y*y)*145;starPositions.push(Math.cos(a)*r,y*145,Math.sin(a)*r);}
 const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));
 const stars=new THREE.Points(starGeometry,new THREE.PointsMaterial({color:0xbcc7ef,size:.095,transparent:true,opacity:.38,depthWrite:false}));scene.add(stars);
 const growthLight=new THREE.Group();growthLight.position.set(18,0,-13);scene.add(growthLight);
 const seedUniforms={amount:{value:0},clock};
 const seed=new THREE.Mesh(new THREE.SphereGeometry(1.55,32,24),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:seedUniforms,vertexShader:'varying vec3 n,p;void main(){n=normalize(normalMatrix*normal);vec4 v=modelViewMatrix*vec4(position,1.);p=v.xyz;gl_Position=projectionMatrix*v;}',fragmentShader:'varying vec3 n,p;uniform float amount,clock;void main(){float face=abs(dot(normalize(n),normalize(-p))),rim=pow(1.-face,2.);vec3 c=mix(vec3(2.,.52,.12),vec3(.35,.7,1.3),rim);gl_FragColor=vec4(c,amount*(.55+.2*sin(p.y*4.+clock*.4)));}'}));seed.position.set(18,4,-13);scene.add(seed);
 const seedGlow=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:seedUniforms,vertexShader:'varying vec2 p;void main(){p=uv-.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float amount;void main(){float a=exp(-dot(p,p)*28.)*amount*.28;gl_FragColor=vec4(vec3(1.7,.6,.18),a);}'}));seedGlow.position.copy(seed.position);scene.add(seedGlow);
 const signalMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{amount:{value:0},clock},vertexShader:'varying float distanceAlong;void main(){distanceAlong=uv.x;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float amount,clock;varying float distanceAlong;void main(){float front=fract(clock*.075);float pulse=exp(-pow((distanceAlong-front)*11.,2.));gl_FragColor=vec4(vec3(.42,.66,1.),amount*(.12+pulse*.65));}'});
 const signals=new THREE.Group();signals.name='Core to field signal paths';scene.add(signals);
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3+.3,points=[];
  for(let j=0;j<=20;j++){const u=j/20,r=1+u*23,angle=a+Math.sin(u*Math.PI)*.25;points.push(new THREE.Vector3(18+Math.cos(angle)*r,-1.9+Math.sin(u*Math.PI)*.08,-13+Math.sin(angle)*r));}
  signals.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),50,.018,4,false),signalMaterial));
 }
 const threadMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{amount:{value:0},top:{value:0}},vertexShader:'varying float height;void main(){height=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float amount,top;varying float height;void main(){float a=amount*(1.-smoothstep(top-2.,top+1.,height))*(.5+.5*sin(height*.7));gl_FragColor=vec4(mix(vec3(.3,.6,1.),vec3(1.,.53,.25),.25),a);}' });
 for(let i=0;i<12;i++){
  const points=[];for(let j=0;j<=28;j++){const u=j/28,a=i*Math.PI/6+u*2.6,r=.5+Math.sin(u*Math.PI)*2.3;points.push(new THREE.Vector3(Math.cos(a)*r,u*40,Math.sin(a)*r));}
  growthLight.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),80,.035,4,false),threadMaterial));
 }
 const haloUniforms={amount:{value:0},clock};
 const halo=new THREE.Mesh(new THREE.PlaneGeometry(22,22),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:haloUniforms,vertexShader:'varying vec2 p;void main(){p=uv-.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float amount;void main(){float d=length(p),ring=exp(-pow((d-.3)*150.,2.)),haze=exp(-d*d*22.)*.02;gl_FragColor=vec4(vec3(.16,.26,.6),(ring+haze)*amount);}' }));halo.position.set(18,44,-13);scene.add(halo);
 const phasePortal=createPhasePortal(scene),portal=phasePortal.portal;
 const oldWorld=new THREE.Group();oldWorld.name='Valley / before the crossing';scene.add(oldWorld);
 oldWorld.add(landscape.terrain,water,evolution.grove,growthLight,seed,seedGlow,signals);
 const skyColor=new THREE.Color(),fogLow=new THREE.Color(.07,.045,.125),fogHigh=new THREE.Color(.075,.08,.15),fogEnd=new THREE.Color(.12,.085,.15);
 function update(state,camera){
  const t=state.time,e=state.environment,crossing=sampleCrossing(t);clock.value=t;growth.value=e.growth;arrival.value=e.arrival;
  oldWorld.visible=crossing.valleyVisible;
  calibration.value=ease(10.5,14,t)*(1-ease(17,20,t));
  scene.fog.color.copy(fogLow).lerp(fogHigh,e.altitude).lerp(fogEnd,e.arrival);scene.fog.density=.0068-(.0025*e.altitude);
  waterSystem.update(state,camera);evolution.update(state);
  skyColor.copy(scene.fog.color);scene.background.copy(skyColor);
  stars.material.opacity=.3+.25*e.altitude+.1*e.arrival;
  growthLight.visible=t>29&&t<73;threadMaterial.uniforms.amount.value=state.transition.growth*.2+state.transition.crown*.08;
  seed.visible=seedGlow.visible=t>30&&t<39;seedUniforms.amount.value=state.transition.growth;seed.scale.setScalar(1+.1*Math.sin(t*.7));seedGlow.quaternion.copy(camera.quaternion);
  threadMaterial.uniforms.top.value=4+36*ease(32,40,t);
  halo.visible=t>63&&t<83;haloUniforms.amount.value=state.transition.crown*.12+.05*ease(69,74,t)*(1-ease(78,83,t));halo.rotation.z=t*.025;
  phasePortal.update(t);
  signals.visible=t>25&&t<73;signalMaterial.uniforms.amount.value=ease(25,33,t)*(1-ease(64,73,t))*.4;

 }
 return {update,ridges,water,halo,portal,landscape,evolution,oldWorld,
  tick(dt,reduced){if(oldWorld.visible)waterSystem.tick(dt,reduced);else waterSystem.clearInteraction();},
  setPointer(ndc){waterSystem.setPointer(oldWorld.visible?ndc:null);},
  setOccluders(objects){waterSystem.setOccluders([...objects,...evolution.stations,evolution.core]);},clearInteraction:waterSystem.clearInteraction,
  report(){return {oldWorldVisible:oldWorld.visible,water:waterSystem.report(),landscape:landscape.report(),clock:clock.value,calibration:calibration.value,growth:growth.value,arrival:arrival.value,signal:signalMaterial.uniforms.amount.value,evolution:evolution.report(),portal:phasePortal.report()};}};
}

// Visibility choreography wraps the accepted PBR shader; no material parameters change.
export function addJourneyReveal(root){
 const reveal={value:1};const materials=new Set();root.traverse(o=>{if(o.isMesh)materials.add(o.material);});
 for(const material of materials){
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey=()=>cache()+'-journey-reveal-v2';
  material.onBeforeCompile=function(s,r){
   compile.call(this,s,r);s.uniforms.journeyReveal=reveal;
   s.vertexShader='varying vec3 journeyPoint;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\njourneyPoint=position;');
   s.fragmentShader='uniform float journeyReveal;varying vec3 journeyPoint;\n'+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
    vec3 jCell=floor(journeyPoint*220.);
    float jNoise=fract(sin(dot(jCell,vec3(12.9898,78.233,37.719)))*43758.5453);
    if(journeyReveal<=.00001||(journeyReveal<.9999&&jNoise>journeyReveal))discard;`);
   s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float jEdge=(1.-smoothstep(.0,.025,abs(jNoise-journeyReveal)))*step(.001,journeyReveal)*(1.-step(.999,journeyReveal));
    totalEmissiveRadiance+=vec3(.055,.12,.2)*jEdge;`);
  };material.needsUpdate=true;
 }
 return reveal;
}
