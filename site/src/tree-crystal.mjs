import * as THREE from 'three';
import {ensureColdUV} from './cold-glow.mjs';

// Only world-tree meshes use this factory. An explicit reflection map allows
// the journey to keep its existing environment and all other materials intact.
export function applyTreeCrystal(root,textures,{envMap=null,highlightCeiling=0}={}){
 const uniforms={time:{value:0},gain:{value:1},strength:{value:.12},breathing:{value:1},highlightCeiling:{value:highlightCeiling}},shared=new Map();
 root.traverse(mesh=>{
  if(!mesh.isMesh)return;
  ensureColdUV(mesh.geometry);mesh.castShadow=true;mesh.receiveShadow=true;
  const replace=source=>{
   const name=source.name||'surface';if(shared.has(name))return shared.get(name);
   const m=new THREE.MeshPhysicalMaterial({name,color:'#10061c',metalness:.8,roughness:.1,transmission:0,
    opacity:1,transparent:false,depthWrite:true,side:THREE.DoubleSide,shadowSide:THREE.FrontSide,
    normalMap:textures.normal,normalScale:new THREE.Vector2(2.1,2.1),roughnessMap:textures.roughness,
    emissive:'#665985',emissiveIntensity:.12,emissiveMap:textures.emissive,envMap,envMapIntensity:1.15,clearcoat:0,dithering:true});
   m.userData.baseEmission=.12;
   m.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{crystalTime:uniforms.time,crystalGain:uniforms.gain,crystalRim:uniforms.strength,crystalBreathing:uniforms.breathing,crystalHighlightCeiling:uniforms.highlightCeiling});
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
     uniform float crystalTime,crystalGain,crystalRim,crystalBreathing,crystalHighlightCeiling;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
     // Geometry normal gates the effect; noisy mapped normals cannot light up
     // the entire face. A hold gesture mostly reveals veins, not the silhouette.
     // Rounded normalized vectors can yield |dot| > 1 at head-on angles.
     // A negative pow base produces NaN that spreads through HDR postprocessing.
     float edge=clamp(1.-abs(dot(normalize(vNormal),normalize(vViewPosition))),0.,1.);
     float rim=pow(edge,18.)*smoothstep(.84,.99,edge);
     float gain=1.+.125*(crystalGain-1.);
     vec3 cool=mix(vec3(.055,.018,.13),vec3(.025,.075,.14),clamp(normal.y*.5+.5,0.,1.));
     outgoingLight+=cool*rim*crystalRim*gain*(1.+crystalBreathing*.015*sin(crystalTime*.7));
     // A local soft shoulder keeps this opaque crystal below an existing host
     // bloom threshold. Other actors and the standalone studio stay untouched.
     if(crystalHighlightCeiling>0.){
      float peak=max(max(outgoingLight.r,outgoingLight.g),outgoingLight.b);
      float knee=crystalHighlightCeiling*.35;
      if(peak>knee){
       float span=crystalHighlightCeiling-knee;
       float shoulder=knee+span*(1.-exp(-(peak-knee)/span));
       outgoingLight*=shoulder/peak;
      }
     }
     #include <opaque_fragment>`);
   };
   m.customProgramCacheKey=()=> 'tree-dark-crystal-v001';shared.set(name,m);return m;
  };
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(replace):replace(mesh.material);
 });
 return {materials:[...shared.values()],uniforms,dispose(){shared.forEach(m=>m.dispose());shared.clear();}};
}

export async function loadTreeTextures(){
 const loader=new THREE.TextureLoader(),base='/assets/materials/tree-dark-crystal-v001/';
 const [normal,emissive,roughness]=await Promise.all(['normal.png','emissive.png','roughness.png'].map(n=>loader.loadAsync(base+n)));
 for(const t of [normal,emissive,roughness]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=2;}
 emissive.colorSpace=THREE.SRGBColorSpace;return {normal,emissive,roughness};
}

export function createTreeLights(){
 const group=new THREE.Group();group.name='Tree / two-light contrast studio';
 const key=new THREE.SpotLight(0xe9f4ff,55,0,.65,.12,0);key.name='Cold-white key';key.position.set(-7,10,-5);key.target.position.set(0,.2,0);
 key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.near=2;key.shadow.camera.far=32;key.shadow.bias=-.00012;key.shadow.normalBias=.018;key.shadow.radius=1;
 const fill=new THREE.SpotLight(0x795296,.16,0,.9,.8,0);fill.name='Subtle violet fill';fill.position.set(0,3,10);fill.castShadow=false;
 group.add(key,key.target,fill,fill.target);return group;
}

// Generate the same studio reflection without mutating a host scene or lights.
// The caller owns the returned render target for this renderer's lifetime.
export function createTreeReflection(renderer){
 const width=512,height=256,data=new Float32Array(width*height*4);
 const softBox=(value,center,halfWidth,softness)=>{const d=Math.max(0,Math.abs(value-center)-halfWidth);return Math.exp(-(d*d)/(softness*softness));};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/width,v=y/height;
  // Reflective studio cards in an HDR map, not extra scene lights.
  const key=softBox(u,.18,.085,.015)*softBox(v,.30,.16,.022)*32;
  const strip=softBox(u,.69,.018,.005)*softBox(v,.48,.23,.018)*18;
  const top=softBox(u,.45,.16,.02)*softBox(v,.13,.03,.01)*12;
  // A dim, broad reflected sky keeps dark-facing planes legible. The scene
  // stays black and the material itself still emits only its sparse vein mask.
  const dark=.12+Math.pow(Math.max(0,Math.cos((v-.34)*Math.PI)),3)*1.3;
  const i=(y*width+x)*4;
  data[i]=dark+key*.92+strip*.72+top*.95;data[i+1]=dark+key*.96+strip*.82+top*.92;data[i+2]=dark*1.3+key+strip+top;data[i+3]=1;
 }
 const source=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);source.mapping=THREE.EquirectangularReflectionMapping;source.minFilter=source.magFilter=THREE.LinearFilter;source.needsUpdate=true;
 const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromEquirectangular(source);source.dispose();pmrem.dispose();return target;
}

export function createTreeEnvironment(renderer,scene){
 const target=createTreeReflection(renderer);scene.environment=target.texture;scene.environmentIntensity=1;scene.background=new THREE.Color(0x000000);scene.add(createTreeLights());return target;
}
