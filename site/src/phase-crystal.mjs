import * as THREE from 'three';
import {applyTreeCrystal,loadTreeTextures} from './tree-crystal.mjs';

// One approved crystal language; finish differences follow each form's role.
export const PHASE_CRYSTAL_PROFILES={
 ark:{color:'#090e20',metalness:.82,roughness:.14,normal:1.25,emission:.08,reflection:1.02,rim:.10,texture:'polished',label:'蓝黑航行晶体 · 冷银翼脊'},
 capsule:{color:'#140925',metalness:.76,roughness:.13,normal:1.75,emission:.10,reflection:1.08,rim:.11,texture:'ice',label:'暗紫封存晶体 · 细密雕纹'},
 core:{color:'#0d0920',metalness:.78,roughness:.12,normal:1.9,emission:.14,reflection:1.1,rim:.12,texture:'ice',label:'深靛生命核 · 冷色脉络与晶心'},
 tree:{color:'#10061c',metalness:.8,roughness:.1,normal:2.1,emission:.12,reflection:1.15,rim:.12,texture:'ice',label:'暗紫世界树 · 保留当前暗晶效果'},
 blade:{color:'#091421',metalness:.78,roughness:.09,normal:.7,emission:.10,reflection:1.12,rim:.10,texture:'polished',label:'冷青黑光叶 · 细腻无裂纹晶面'},
 gate:{color:'#0c0a21',metalness:.86,roughness:.105,normal:.95,emission:.08,reflection:1.08,rim:.10,texture:'polished',label:'紫黑界环 · 抛光弧面与冷色内环'}
};

export async function loadPhaseCrystalTextures(){
 const loader=new THREE.TextureLoader(),base='/assets/materials/phase-dark-crystal-v001/';
 const [ice,normal,emissive,roughness]=await Promise.all([loadTreeTextures(),...['normal.png','emissive.png','roughness.png'].map(n=>loader.loadAsync(base+n))]);
 for(const t of [normal,emissive,roughness]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=2;}
 emissive.colorSpace=THREE.SRGBColorSpace;return {ice,polished:{normal,emissive,roughness}};
}

export function applyPhaseCrystal(root,key,textures,options={}){
 const profile=PHASE_CRYSTAL_PROFILES[key];if(!profile)throw Error('Unknown crystal form: '+key);
 const look=applyTreeCrystal(root,textures[profile.texture],options);
 // The reference tree remains exactly the accepted material, not a new variant.
 if(key==='tree')return look;
 look.uniforms.strength.value=profile.rim;
 for(const m of look.materials){
  m.color.set(profile.color);m.metalness=profile.metalness;m.roughness=profile.roughness;m.normalScale.setScalar(profile.normal);
  m.envMapIntensity=profile.reflection;m.emissive.set('#665985');m.emissiveIntensity=profile.emission;
  const structural=/structure|edge/.test(m.name),inner=m.name==='phase-inner',optic=m.name==='phase-optic';
  const energy=/^(phase-(core-)?light|optics-(energy|coated-lens|conductor))$/.test(m.name);
  if(structural){m.color.multiplyScalar(.78);m.roughness+=.045;m.normalScale.multiplyScalar(.6);}
  if(inner){m.roughness+=.075;m.normalScale.multiplyScalar(.65);m.envMapIntensity*=.8;}
  if(optic){m.color.set(key==='core'?'#10162d':'#12102b');m.metalness=.65;m.roughness=.15;m.normalScale.setScalar(profile.normal*.7);m.emissive.set('#727fad');m.emissiveIntensity=.26;}
  if(energy){m.color.set('#17233b');m.metalness=.5;m.roughness=.16;m.normalScale.setScalar(.3);m.emissive.set('#637eb6');m.emissiveIntensity=.4;m.emissiveMap=null;}
  m.userData.baseEmission=m.emissiveIntensity;m.userData.crystalProfile={key,texture:profile.texture,role:energy?'signal':optic?'nucleus':structural?'structure':inner?'lining':'surface'};
 }
 return look;
}
