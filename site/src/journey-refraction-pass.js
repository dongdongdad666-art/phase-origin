import * as THREE from 'three';
import {Pass,FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import {sampleCamera,ease} from './cinematic-timeline.mjs';
import {sampleRefraction,bridgeAnchor,REFRACTION_WINDOW,RefractionShader} from './journey-refraction.mjs';

// Two renders of the same world/camera, with exactly one lit hero per render.
// Only the short bridge aligns the stationary nuclei; original morphs/materials are untouched.
export class MineralRefractionPass extends Pass{
 constructor(scene,camera,models,subjects,rail){
  super();Object.assign(this,{scene,camera,models,subjects});this.enabled=false;
  this.targets=[0,1].map(()=>new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:2}));
  this.uniforms=THREE.UniformsUtils.clone(RefractionShader.uniforms);
  this.material=new THREE.ShaderMaterial({...RefractionShader,uniforms:this.uniforms,depthTest:false,depthWrite:false});
  this.quad=new FullScreenQuad(this.material);this.nuclei={};
  for(const key of ['capsule','core']){
   const root=models[key].root;let optic;
   root.traverse(o=>{if(o.isMesh&&o.material.name==='phase-optic')optic=o;});
   optic.geometry.computeBoundingBox();const box=optic.geometry.boundingBox;
   const center=box.getCenter(new THREE.Vector3());optic.localToWorld(center);root.worldToLocal(center);
   this.nuclei[key]={center,radius:box.getSize(new THREE.Vector3()).x*.5};
  }
  const viewPoint=(key,time)=>{
   const config=subjects[key],f=sampleCamera(rail,time),position=new THREE.Vector3().fromArray(f.position),rotation=new THREE.Quaternion().fromArray(f.quaternion);
   const point=this.nuclei[key].center.clone().multiplyScalar(config.scale).applyAxisAngle(new THREE.Vector3(0,1,0),config.rotation).add(new THREE.Vector3().fromArray(config.position));
   return point.sub(position).applyQuaternion(rotation.invert()).toArray();
  };
  this.ends=['capsule','core'].map((key,i)=>{
   const t=REFRACTION_WINDOW[i],a=viewPoint(key,t-.001),b=viewPoint(key,t+.001);
   return {point:viewPoint(key,t),velocity:a.map((v,j)=>(b[j]-v)/.002)};
  });
 }
 setSize(width,height){for(const t of this.targets)t.setSize(width,height);this.uniforms.aspect.value=width/height;}
 update(time,reduced){this.state=sampleRefraction(time);this.enabled=this.state.active;this.time=time;this.uniforms.reduced.value=reduced?1:0;}
 render(renderer,writeBuffer){
  const {scene,camera,models,subjects,uniforms,state}=this;
  const saved=Object.entries(models).map(([key,m])=>({key,visible:m.root.visible,light:m.light.visible,position:m.root.position.clone(),scale:m.root.scale.clone(),lightPosition:m.light.position.clone(),intensity:m.light.intensity,distance:m.light.distance}));
  const previousTarget=renderer.getRenderTarget(),clear=renderer.autoClear;
  const a=this.ends[0],b=this.ends[1],point=new THREE.Vector3().fromArray(bridgeAnchor(state.progress,a.point,b.point,a.velocity,b.velocity,2.8));
  // Portrait framing keeps the warm nucleus visible during the orbit's lateral swing.
  // Zero value and zero slope at both endpoints retain the original arrival/departure.
  const portrait=1-THREE.MathUtils.smoothstep(camera.aspect,.65,1.15);
  point.x*=1-.65*portrait*ease(16.8,17.3,this.time)*(1-ease(18.5,19.6,this.time));
  const depth=-point.z,anchor=point.clone().applyMatrix4(camera.matrixWorld);
  const radius=THREE.MathUtils.lerp(this.nuclei.capsule.radius*subjects.capsule.scale,this.nuclei.core.radius*subjects.core.scale,ease(16.8,19.6,this.time));
  const uv=anchor.clone().project(camera);uniforms.center.value=[uv.x*.5+.5,uv.y*.5+.5];uniforms.seedRadius.value=radius/(2*depth*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5)));
  for(const key of ['wave','strength','charge'])uniforms[key].value=state[key];
  this.anchor={uv:[...uniforms.center.value],radius:uniforms.seedRadius.value};
  try{
   renderer.autoClear=true;
   for(const [index,key] of ['capsule','core'].entries()){
    for(const m of Object.values(models)){m.root.visible=false;m.light.visible=false;}
    const m=models[key],nucleus=this.nuclei[key],localLight=m.root.worldToLocal(m.light.position.clone());m.root.visible=true;m.light.visible=true;
    m.root.scale.setScalar(radius/nucleus.radius);
    m.root.position.copy(anchor).sub(nucleus.center.clone().multiply(m.root.scale).applyQuaternion(m.root.quaternion));
    m.root.updateMatrixWorld(true);m.light.position.copy(m.root.localToWorld(localLight));m.light.distance=Math.max(10,m.root.scale.x*1.4);m.light.intensity=m.baseLight*(1+state.charge*.22);
    renderer.setRenderTarget(this.targets[index]);renderer.clear();renderer.render(scene,camera);
   }
   uniforms.source.value=this.targets[0].texture;uniforms.destination.value=this.targets[1].texture;
   renderer.setRenderTarget(this.renderToScreen?null:writeBuffer);this.quad.render(renderer);
  }finally{
   for(const s of saved){const m=models[s.key];m.root.visible=s.visible;m.light.visible=s.light;m.root.position.copy(s.position);m.root.scale.copy(s.scale);m.root.updateMatrixWorld(true);m.light.position.copy(s.lightPosition);m.light.intensity=s.intensity;m.light.distance=s.distance;}
   renderer.autoClear=clear;renderer.setRenderTarget(previousTarget);
  }
 }
 report(){return {type:'mineral-refraction',...this.state,anchor:this.enabled?this.anchor:null};}
 dispose(){this.targets.forEach(t=>t.dispose());this.material.dispose();this.quad.dispose();}
}
