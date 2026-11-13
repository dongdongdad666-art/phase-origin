import {applyCoreMineral,mineralMaterial} from './core-mineral.mjs';

export const PHASE_MINERAL_PROFILES={
 ark:{fractures:.24,relief:.32,warmStrength:.4,center:[.00684,-.01381,-.05322],label:'蓝紫矿物 · 细裂纹 · 透光翼面'},
 capsule:{fractures:.8,relief:.75,warmStrength:.9,center:[-.000147,.026987,.114599],label:'蓝紫矿物 · 自然裂隙 · 暖色胚核'},
 tree:{fractures:0,relief:.045,warmStrength:.14,center:[0,-.06,0],label:'无裂纹矿物 · 透光枝冠 · 深色骨架'},
 blade:{fractures:0,relief:.035,warmStrength:.06,center:[0,-.2,0],label:'无裂纹矿物 · 蓝紫薄片 · 柔和透光'},
 gate:{fractures:0,relief:.05,warmStrength:.14,center:[.0447,.0609,.0637],label:'无裂纹矿物 · 完整弧面 · 光学内环'}
};

export function applyPhaseMineral(root,key){
 if(key==='core')return applyCoreMineral(root);
 const profile=PHASE_MINERAL_PROFILES[key];if(!profile)throw new Error('Unknown mineral model: '+key);
 const old=new Set(),textures=new Set(),materials=new Map();
 root.traverse(node=>{if(!node.isMesh)return;const source=node.material;old.add(source);
  if(!materials.has(source.name)){
   const kind=source.name==='phase-optic'?'optic':source.name==='phase-inner'?'inner':'shell';
   const thin=source.name==='phase-lamina',structural=['phase-structure','phase-edge'].includes(source.name),inner=kind==='inner',polished=profile.fractures===0;
   const parameters={...profile,key,fractures:structural?profile.fractures*.3:profile.fractures};
   if(polished)Object.assign(parameters,{roughness:inner?.44:structural?.34:thin?.24:.28,transmission:inner?.18:structural?.25:thin?.58:.48,thickness:thin?.018:.038,clearcoat:.18,clearcoatRoughness:.24,iridescence:.12,envMapIntensity:.85});
   else Object.assign(parameters,{roughness:kind==='optic'?.38:.4,transmission:inner?.2:structural?.24:kind==='optic'?.64:.5});
   let material;
   if(['phase-light','phase-core-light'].includes(source.name)){
    material=source.clone();for(const prop of Object.keys(material))if(material[prop]?.isTexture)material[prop]=null;
    material.color.set(key==='gate'?0xa5b6ff:0xffb483);material.emissive.set(key==='gate'?0x6f8eff:0xff7b39);material.emissiveIntensity=source.name==='phase-core-light'?2.2:1.2;material.metalness=0;material.roughness=.3;
    material.userData.mineralProfile={key,fractures:0,relief:0};
   }else material=mineralMaterial(source.name,kind,parameters);
   materials.set(source.name,material);
  }node.material=materials.get(source.name);
 });
 for(const material of old){for(const v of Object.values(material))if(v?.isTexture)textures.add(v);material.dispose();}textures.forEach(t=>t.dispose());
 return {style:'phase-mineral-v001',key,materials:materials.size};
}
