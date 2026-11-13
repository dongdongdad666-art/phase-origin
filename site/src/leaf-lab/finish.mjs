import * as T from '/vendor/three/build/three.module.js';

function opticalTextures(){
 const w=256,h=512,color=new Uint8Array(w*h*4),rough=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const u=x/(w-1),v=y/(h-1),stripe=Math.pow(.5+.5*Math.cos((u*56+v*.65)*Math.PI*2),22),wave=.5+.5*Math.sin(v*8+u*3),grain=Math.sin(x*12.9898+y*78.233)*43758.5453%1;
  const i=(y*w+x)*4;color[i]=Math.round(58+39*wave+stripe*30+grain*2);color[i+1]=Math.round(71+23*(1-wave)+stripe*30+grain*2);color[i+2]=Math.round(151+42*(1-wave)+stripe*28);color[i+3]=255;
  const rr=Math.round(160+stripe*32+grain*6);rough.set([rr,rr,rr,255],i);
 }
 function texture(bytes){
  if(typeof document==='undefined')return new T.DataTexture(bytes,w,h,T.RGBAFormat);
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(bytes),w,h),0,0);
  const t=new T.CanvasTexture(canvas);t.flipY=false;return t;
 }
 const map=texture(color),roughnessMap=texture(rough);
 map.colorSpace=T.SRGBColorSpace;
 for(const t of[map,roughnessMap]){t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;}
 map.name='LEAF_blue_violet_optical';roughnessMap.name='LEAF_fine_optical_satin';return {map,roughnessMap};
}
/** Material-only overlay. Position, normal, index and pivots are untouched. */
export function attachFinish(leaf){
 const textures=opticalTextures();
 const optical=new T.MeshPhysicalMaterial({name:'LEAF_BlueViolet_Optical',color:'#b7c8ff',map:textures.map,roughnessMap:textures.roughnessMap,metalness:0,roughness:.29,transmission:.75,thickness:.08,ior:1.46,attenuationColor:'#9ca8ee',attenuationDistance:1.1,clearcoat:1,clearcoatRoughness:.12,iridescence:.15,iridescenceIOR:1.32,iridescenceThicknessRange:[170,390],envMapIntensity:1.25,side:T.DoubleSide});
 const titanium=new T.MeshPhysicalMaterial({name:'LEAF_Satin_Titanium',color:'#292d3c',metalness:.9,roughness:.24,clearcoat:.4,clearcoatRoughness:.2});
 const graphite=new T.MeshStandardMaterial({name:'LEAF_Graphite_Joints',color:'#1e202b',metalness:.7,roughness:.3});
 const trim=new T.MeshStandardMaterial({name:'LEAF_Optical_Edge',color:'#555770',metalness:.75,roughness:.2});
 const fine=new T.MeshStandardMaterial({name:'LEAF_Optical_Ribs',color:'#575f8a',metalness:.55,roughness:.26});
 const warm=new T.MeshStandardMaterial({name:'LEAF_Amber_Light',color:'#ffe2a9',roughness:.23,metalness:0,emissive:'#ffad4a',emissiveIntensity:2.3});
 const key=new T.MeshStandardMaterial({name:'LEAF_Orientation_Brass',color:'#aa8b65',metalness:.75,roughness:.3});
 const highlight=new T.MeshStandardMaterial({color:'#c8b18e',roughness:.45,metalness:.25});
 const gray=new Map(),finished=new Map(),cast=new Map();let look='product',selection=-1,energy=1;
 leaf.group.traverse(o=>{if(!o.isMesh)return;gray.set(o,o.material);cast.set(o,o.castShadow);let m=titanium;
  if(o.name.endsWith('_Surface')){
   m=optical;const p=o.geometry.attributes.position,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=Math.abs(p.getX(i))/1.15;uv[i*2+1]=(p.getY(i)-1.07)/3.08;}o.geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
  }else if(o.name.endsWith('_Frame'))m=trim;else if(o.name.includes('_Channel_'))m=fine;
  else if(o.name==='Light_Channel')m=warm;else if(o.name==='Orientation_Key')m=key;
  else if(/Bearing_|Service_Cover|Keyed_Plug|Support_Neck/.test(o.name))m=graphite;
  finished.set(o,m);
 });
 const light=new T.PointLight('#ffb361',.18,3.2,2);light.name='LEAF_Amber_Spill';light.position.set(0,2.6,.75);leaf.parts[2].add(light);
 function refresh(){leaf.parts.forEach((p,i)=>p.traverse(o=>{if(o.isMesh){o.material=i===selection?highlight:(look==='product'?finished:gray).get(o);o.castShadow=look==='product'&&o.name.endsWith('_Surface')?false:cast.get(o);}}));light.intensity=look==='product'?energy*.18:0;warm.emissiveIntensity=energy*2.3;}
 leaf.highlight=index=>{selection=index;refresh();};
 leaf.setLook=value=>{look=value==='gray'?'gray':'product';refresh();};
 leaf.setEnergy=value=>{energy=T.MathUtils.clamp(value,0,1.5);refresh();};
 leaf.disposeFinish=()=>{new Set([...gray.values(),...finished.values(),highlight]).forEach(m=>m.dispose());Object.values(textures).forEach(t=>t.dispose());};
 refresh();return leaf;
}
