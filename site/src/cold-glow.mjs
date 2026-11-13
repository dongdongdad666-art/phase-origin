import * as THREE from 'three';

// UVs are generated only for missing channels; rest positions and morphs are untouched.
export function ensureColdUV(geometry){
 if(geometry.attributes.uv)return;
 const p=geometry.attributes.position,n=geometry.attributes.normal,uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
  uv[i*2]=(ny>nx&&ny>nz?x:nx>nz?z:x)*2.4;
  uv[i*2+1]=(ny>nx&&ny>nz?z:y)*2.4;
 }
 geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
}

export function applyColdGlow(root,textures){
 const uniforms={time:{value:0},gain:{value:1},strength:{value:.92},breathing:{value:1}};
 const shared=new Map();
 root.traverse(mesh=>{
  if(!mesh.isMesh)return;
  ensureColdUV(mesh.geometry);mesh.castShadow=false;mesh.receiveShadow=false;
  const replace=source=>{
   const name=source.name||'surface';if(shared.has(name))return shared.get(name);
   const energy=/light|optic/.test(name),inner=/inner/.test(name);
   const m=new THREE.MeshPhysicalMaterial({name,color:'#110522',roughness:.3,metalness:.5,transmission:0,transparent:true,opacity:.9,depthWrite:true,side:THREE.DoubleSide,forceSinglePass:true,
    normalMap:textures.normal,normalScale:new THREE.Vector2(1.5,1.5),roughnessMap:textures.roughness,
    emissive:energy?'#54228b':'#35115e',emissiveMap:textures.emissive,emissiveIntensity:energy?1.4:.8,
    envMapIntensity:inner?.45:.85,clearcoat:0,dithering:true});
   m.userData.baseEmission=m.emissiveIntensity;
   m.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{coldTime:uniforms.time,coldGain:uniforms.gain,coldStrength:uniforms.strength,coldBreathing:uniforms.breathing});
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
     uniform float coldTime,coldGain,coldStrength,coldBreathing;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
     float nv=abs(dot(normalize(normal),normalize(vViewPosition)));
     float smoothNV=abs(dot(normalize(vNormal),normalize(vViewPosition)));
     float fresnel=pow(1.-nv,3.4);
     float silhouette=pow(1.-smoothNV,5.);
     float breath=1.+coldBreathing*.075*sin(coldTime*1.15);
     float gradient=clamp(.45+normal.y*.32+normal.x*.20,0.,1.);
     // Linear-light equivalents of #7f00ff and #00d4ff.
     vec3 rim=mix(vec3(.212,0.,1.),vec3(0.,.658,1.),gradient);
     outgoingLight+=rim*(fresnel*.55+silhouette*.55)*coldStrength*coldGain*breath;
     outgoingLight+=vec3(.025,.012,.075)*pow(1.-nv,1.6);
     #include <opaque_fragment>`);
   };
   m.customProgramCacheKey=()=> 'cold-glow-v001';shared.set(name,m);return m;
  };
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(replace):replace(mesh.material);
 });
 return {materials:[...shared.values()],uniforms,dispose(){shared.forEach(m=>m.dispose());shared.clear();}};
}

export async function loadColdTextures(){
 const loader=new THREE.TextureLoader(),base='/assets/materials/cold-glow-v001/';
 const [normal,emissive,roughness,halo]=await Promise.all(['normal.png','emissive.png','roughness.png','halo.png'].map(n=>loader.loadAsync(base+n)));
 for(const t of [normal,emissive,roughness]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=2;}
 emissive.colorSpace=THREE.SRGBColorSpace;
 return {normal,emissive,roughness,halo};
}

// A tiny static environment is filtered once at startup. No dynamic captures.
export function createColdEnvironment(renderer,scene){
 const size=128,data=new Uint8Array(size*size*2*4);
 for(let y=0;y<size;y++)for(let x=0;x<size*2;x++){
  const u=x/(size*2),v=y/size;
  const soft=(c,w)=>Math.exp(-(((u-c)/w)**2));
  const band=Math.exp(-(((v-.43)/.23)**2));
  const value=.035+band*(soft(.19,.07)*.58+soft(.72,.035)*.8);
  const o=(y*size*2+x)*4;data[o]=Math.min(255,value*205);data[o+1]=Math.min(255,value*219);data[o+2]=Math.min(255,value*255);data[o+3]=255;
 }
 const source=new THREE.DataTexture(data,size*2,size);source.mapping=THREE.EquirectangularReflectionMapping;source.needsUpdate=true;
 const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromEquirectangular(source);source.dispose();pmrem.dispose();scene.environment=target.texture;scene.environmentIntensity=.9;
 scene.background=new THREE.Color(0x000000);scene.add(new THREE.AmbientLight(0x9d9bc4,.3));
 for(const [color,intensity,position] of [[0x7f36ff,.55,[-7,5,-6]],[0x50aaff,.7,[6,4,8]]]){
  const light=new THREE.SpotLight(color,intensity,0,Math.PI/3,.8,0);light.position.fromArray(position);light.castShadow=false;scene.add(light,light.target);
 }
 return target;
}
