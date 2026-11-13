import * as THREE from 'three';

// Three-dimensional mineral detail follows the rest surface through morphing.
// No geometry or animation data is edited by this material study.
const mineralFunctions=/* glsl */`
varying vec3 vMineralRest;
varying vec3 vMineralShape;
float mineralHash(vec3 p){p=fract(p*.3183099+vec3(.11,.27,.43));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float mineralNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(mineralHash(i),mineralHash(i+vec3(1,0,0)),f.x),mix(mineralHash(i+vec3(0,1,0)),mineralHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(mineralHash(i+vec3(0,0,1)),mineralHash(i+vec3(1,0,1)),f.x),mix(mineralHash(i+vec3(0,1,1)),mineralHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float mineralCloud(vec3 p){return .57*mineralNoise(p)+.28*mineralNoise(p*2.07+7.3)+.15*mineralNoise(p*4.13-3.2);}
float mineralSeam(vec3 p){
 vec3 cell=floor(p),f=fract(p);float d1=10.,d2=10.;
 for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec3 g=vec3(float(x),float(y),float(z)),c=cell+g;
  vec3 seed=vec3(mineralHash(c),mineralHash(c+19.7),mineralHash(c+43.1));
  float d=length(g+.02+.96*seed-f);if(d<d1){d2=d1;d1=d;}else d2=min(d2,d);
 }return d2-d1;
}
`;

export function mineralMaterial(name,kind,profile={}){
 const optic=kind==='optic',inner=kind==='inner';
 const m=new THREE.MeshPhysicalMaterial({name,color:0xffffff,metalness:0.02,roughness:optic?.53:.48,transmission:optic?.56:inner?.22:.44,thickness:optic?.14:.055,ior:1.42,attenuationColor:0xb8a6f0,attenuationDistance:1.1,clearcoat:0,envMapIntensity:.65,side:THREE.DoubleSide});
 const fractures=profile.fractures??1,relief=profile.relief??1,warmStrength=profile.warmStrength??1;
 for(const property of ['roughness','transmission','thickness','clearcoat','clearcoatRoughness','iridescence','envMapIntensity'])if(profile[property]!==undefined)m[property]=profile[property];
 m.userData.mineralProfile={key:profile.key||'core',fractures,relief};
 m.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vMineralRest;\nvarying vec3 vMineralShape;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMineralRest=position;').replace('#include <morphtarget_vertex>','#include <morphtarget_vertex>\nvMineralShape=transformed;');
  shader.fragmentShader=mineralFunctions+'\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',/* glsl */`
   #include <color_fragment>
   vec3 mp=vMineralRest*${Number(profile.scale??(optic?13:18)).toFixed(2)};
   float cloud=mineralCloud(mp*.28);
   ${fractures>0?/* glsl */`
   vec3 warped=mp+vec3(mineralCloud(mp+6.),mineralCloud(mp-3.),mineralCloud(mp+19.))*.65+vec3(mineralNoise(mp*3.+2.),mineralNoise(mp*3.-5.),mineralNoise(mp*3.+12.))*.12;
   float seam=mineralSeam(warped);
   float fractureMask=.6*mineralNoise(mp*.7+12.)+.4*mineralNoise(mp*2.7-8.);
   float coverage=smoothstep(.43,.57,fractureMask);
   float width=mix(.006,.024,mineralNoise(mp*2.1));
   float fissure=(1.-smoothstep(width,width+max(fwidth(seam)*.8,.012),seam))*coverage;
   float groove=(1.-smoothstep(.012,.15,seam))*coverage;
   fissure*=${fractures.toFixed(3)};groove*=${fractures.toFixed(3)};
   `:'float fissure=0.;float groove=0.;'}
   float grain=mineralCloud(mp*3.7);
   float strata=abs(mineralNoise(mp*2.6)-.5);
   float mineralHeight=(cloud*.12+grain*.021+strata*.016-groove*.012)*${relief.toFixed(3)};
   vec3 pigment=mix(vec3(.012,.016,.065),vec3(.045,.026,.16),smoothstep(.25,.72,cloud));
   pigment=mix(pigment,vec3(.03,.08,.29),smoothstep(.55,.76,cloud)*.72);
   ${fractures===0?'pigment=mix(vec3(.028,.045,.12),vec3(.13,.075,.24),smoothstep(.25,.72,cloud));':''}
   diffuseColor.rgb*=pigment*(1.-fissure*.87)*(.72+grain*.5);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+fissure*.2+(grain-.5)*${fractures===0?'.05':'.24'},${fractures===0?'.13':'.28'},.78);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',/* glsl */`
   #include <normal_fragment_maps>
   vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition);
   vec3 rx=cross(sy,normal),ry=cross(normal,sx);
   float det=dot(sx,rx)*faceDirection;
   vec3 grad=sign(det)*(dFdx(mineralHeight)*rx+dFdy(mineralHeight)*ry);
   normal=normalize(max(abs(det),1e-8)*normal-grad*2.1);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',/* glsl */`
   #include <emissivemap_fragment>
   vec3 energyPosition=vMineralShape-vec3(${(profile.center||[-.012,.096,-.022]).map(v=>v.toFixed(6)).join(',')});
   float hot1=exp(-dot(energyPosition-vec3(-.05,-.10,.12),energyPosition-vec3(-.05,-.10,.12))*65.);
   float hot2=exp(-dot(energyPosition-vec3(.04,.10,.17),energyPosition-vec3(.04,.10,.17))*140.);
   float warm=(hot1*1.1+hot2*.8)*smoothstep(.25,.68,cloud)*(1.-fissure*.94)*(.5+grain*.8);
   totalEmissiveRadiance+=vec3(1.,.16,.035)*warm*${((optic?2.3:inner?.7:.8)*warmStrength).toFixed(3)};
   float edge=pow(1.-abs(dot(normal,normalize(vViewPosition))),3.);
   totalEmissiveRadiance+=vec3(.008,.025,.22)*(.03+edge*.6)*(1.-fissure);
  `);
 };
 m.customProgramCacheKey=()=>`mineral-v006-${kind}-${JSON.stringify(profile)}`;
 m.userData.mineral=true;
 return m;
}

export function applyCoreMineral(root){
 const oldMaterials=new Set(),textures=new Set(),replacements=new Map();
 root.traverse(node=>{if(!node.isMesh)return;const source=node.material;oldMaterials.add(source);
  if(!replacements.has(source.name)){
   let material;
   if(['phase-shell','phase-inner','phase-optic'].includes(source.name))material=mineralMaterial(source.name,source.name==='phase-optic'?'optic':source.name==='phase-inner'?'inner':'shell');
   else{
    material=source.clone();material.metalness=.12;material.roughness=.35;material.envMapIntensity=.6;material.iridescence=0;material.clearcoat=.1;
    material.color.set(source.name.startsWith('optics-')?0x9d4360:0x1a214a);
    if(source.name.startsWith('optics-')){material.emissive.set(source.name==='optics-energy'?0xffa23e:0xff5a1a);material.emissiveIntensity=source.name==='optics-energy'?3.2:source.name==='optics-coated-lens'?3.6:.25;}
    else{material.emissive.set(0x142c9c);material.emissiveIntensity=.035;}
    for(const key of Object.keys(material))if(material[key]?.isTexture)material[key]=null;
   }replacements.set(source.name,material);
  }node.material=replacements.get(source.name);
 });
 for(const material of oldMaterials){for(const value of Object.values(material))if(value?.isTexture)textures.add(value);material.dispose();}textures.forEach(t=>t.dispose());
 return {style:'mineral-v006',materials:replacements.size};
}


