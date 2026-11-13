import * as THREE from 'three';
import {ease} from './cinematic-timeline.mjs';
import {GROVE_STATIONS,sampleGrove,createResonanceGrove} from './journey-resonance.mjs';
export {GROVE_STATIONS} from './journey-resonance.mjs';
import {mineralMaterial} from './core-mineral.mjs';
import {sampleCrossing} from './journey-crossing.mjs';

// Spatial anchors are world coordinates, never attached to the camera.
export const WORLD_CORE=[28,109,-143];
export const SKY_FOCUS=[18,109,-143];
export const CELESTIAL_BODIES=[
 {position:[-160,275,-340],radius:80,color:0x4c4c87},
 {position:[170,235,-380],radius:55,color:0x535b9b},
 {position:[95,280,-560],radius:23,color:0x7573ac}
];

export function sampleEvolution(time){
 const t=Math.max(0,Math.min(96,Number.isFinite(time)?time:0)),crossing=sampleCrossing(t);
 return {
  growth:sampleGrove(t),
  field:ease(33,50,t),sky:crossing.sky,core:crossing.core,
  // End hero settles rather than orbiting forever after the camera lands.
  rotation:.22*ease(80,95,t),opening:ease(81,94,t)
 };
}

function planetMaterial(color){
 const m=new THREE.MeshStandardMaterial({color,roughness:.96,metalness:.02,emissive:color,emissiveIntensity:.012,transparent:true,opacity:0,fog:false});
 m.onBeforeCompile=s=>{
  s.vertexShader='varying vec3 planetPoint;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nplanetPoint=position;');
  s.fragmentShader=`varying vec3 planetPoint;
   float moonHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
   float moonNoise(vec3 p){
    vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(moonHash(i),moonHash(i+vec3(1,0,0)),f.x),mix(moonHash(i+vec3(0,1,0)),moonHash(i+vec3(1,1,0)),f.x),f.y),
     mix(mix(moonHash(i+vec3(0,0,1)),moonHash(i+vec3(1,0,1)),f.x),mix(moonHash(i+vec3(0,1,1)),moonHash(i+vec3(1,1,1)),f.x),f.y),f.z);
   }
  `+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 pp=normalize(planetPoint);
   float bands=moonNoise(pp*8.+moonNoise(pp*15.)*2.)*.65+moonNoise(pp*23.)*.35;
   float erosion=moonNoise(pp*110.);
   float day=pow(max(0.,dot(pp,normalize(vec3(-.65,.3,.7)))),1.4);
   diffuseColor.rgb*=(.38+bands*.72+erosion*.1)*(.015+.985*day);
  `);
 };return m;
}

function atmosphere(radius){
 return new THREE.Mesh(new THREE.SphereGeometry(radius*1.018,48,32),new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{amount:{value:0}},
  vertexShader:'varying vec3 n,v;void main(){n=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);v=-p.xyz;gl_Position=projectionMatrix*p;}',
  fragmentShader:`varying vec3 n,v;uniform float amount;void main(){
   float rim=pow(1.-max(0.,dot(normalize(n),normalize(v))),3.5);
   float side=.12+.88*smoothstep(-.5,.8,-normalize(n).x);
   gl_FragColor=vec4(mix(vec3(.18,.28,.9),vec3(.55,.3,.83),side),rim*amount*side*.48);
  }`
 }));
}

export function createJourneyEvolution(scene){
 const resonance=createResonanceGrove(scene),{grove,stations}=resonance;

 const heavens=new THREE.Group();heavens.name='New world constellation';scene.add(heavens);
 const planets=CELESTIAL_BODIES.map(spec=>{
  const body=new THREE.Mesh(new THREE.SphereGeometry(spec.radius,64,40),planetMaterial(spec.color));body.position.fromArray(spec.position);heavens.add(body);
  const rim=atmosphere(spec.radius);rim.position.copy(body.position);heavens.add(rim);return {body,rim};
 });
 const core=new THREE.Group();core.name='World seed / three mineral shells and orbital cage';core.position.fromArray(WORLD_CORE);core.scale.setScalar(1.28);heavens.add(core);
 const shellMaterial=mineralMaterial('New world / mineral shell','shell',{fractures:0,relief:.045,warmStrength:.05,scale:.8,roughness:.25,transmission:.32,thickness:.75,envMapIntensity:.7});
 const orbMaterial=mineralMaterial('New world / mineral body','optic',{fractures:.4,relief:.5,warmStrength:.75,scale:1.1,roughness:.5,transmission:.27,thickness:.9,envMapIntensity:.5});
 const compileOrb=orbMaterial.onBeforeCompile;
 orbMaterial.onBeforeCompile=function(shader,renderer){
  compileOrb.call(this,shader,renderer);
  // This new object is in world units; existing imported assets use normalized units.
  shader.fragmentShader=shader.fragmentShader.replace('vec3 energyPosition=vMineralShape-','vec3 energyPosition=vMineralShape*.035-');
  shader.fragmentShader=shader.fragmentShader.replace('vec3(1.,.16,.035)*warm','vec3(1.5,.5,.12)*warm');
 };
 const frameMaterial=new THREE.MeshStandardMaterial({color:0x8d9bc7,metalness:.65,roughness:.27,emissive:0x152442,emissiveIntensity:.45});
 const energyMaterial=new THREE.MeshStandardMaterial({color:0xffc392,roughness:.4,metalness:.1,emissive:0xff934b,emissiveIntensity:1.4});
 const shells=[];
 for(let i=0;i<3;i++){
  const petal=new THREE.Mesh(new THREE.SphereGeometry(13.6,40,40,i*Math.PI*2/3+1.45,1.2,.18,Math.PI-.36),shellMaterial);
  petal.scale.set(.96,1.12,.96);core.add(petal);shells.push(petal);
 }
 const body=new THREE.Mesh(new THREE.IcosahedronGeometry(8.2,4),orbMaterial);body.scale.y=1.06;core.add(body);
 const seed=new THREE.Mesh(new THREE.OctahedronGeometry(2.5,1),energyMaterial);seed.rotation.z=.25;core.add(seed);
 // Three offset meridians describe a designed object even in silhouette.
 for(let i=0;i<3;i++){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(16.2+i*.65,.14,6,144,Math.PI*1.82),frameMaterial);
  ring.rotation.set(.45+i*.72,.3+i*.6,.3+i*2.1);core.add(ring);
  const contact=new THREE.Mesh(new THREE.OctahedronGeometry(.6,1),energyMaterial);
  contact.position.set(Math.cos(i*2.1)*16,Math.sin(i*2.1)*16,1.6);core.add(contact);
 }
 const coreRim=atmosphere(8.5);core.add(coreRim);
 const fadeMaterials=[shellMaterial,orbMaterial,frameMaterial,energyMaterial];
 for(const material of fadeMaterials){material.transparent=true;material.opacity=0;}
 let sampled=sampleEvolution(0);
 function update(state){
  sampled=sampleEvolution(state.time);resonance.update(state.time);
  heavens.visible=sampled.core>0||sampled.sky>0;
  planets.forEach(({body,rim})=>{body.material.opacity=sampled.sky;rim.material.uniforms.amount.value=sampled.sky;});
  core.visible=sampled.core>0;core.rotation.set(.12,.36+sampled.rotation,-.16);
  for(const material of fadeMaterials)material.opacity=sampled.core;
  shells.forEach((petal,i)=>{const a=i*Math.PI*2/3+2.05;petal.position.set(-Math.cos(a)*sampled.opening*2,0,Math.sin(a)*sampled.opening*2);});
  coreRim.material.uniforms.amount.value=sampled.core*.6;
 }
 update({time:0});
 return {update,grove,stations,heavens,core,planets,setCrystalLook:resonance.setCrystalLook,report:()=>sampled};
}
