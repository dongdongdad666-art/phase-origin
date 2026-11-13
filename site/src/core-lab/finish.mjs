import * as T from '/vendor/three/build/three.module.js';
function textures(){
 const w=768,h=256,data=Array.from({length:4},()=>new Uint8Array(w*h*4));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const u=x/(w-1),v=y/(h-1),z=(v-.5)*2,edge=Math.pow(Math.abs(z),2),wave=.5+.5*Math.sin(u*8+v*5),grain=(Math.sin(x*12.989+y*78.233)*43758.54)%1;
  const stripes=Math.pow(.5+.5*Math.cos(v*Math.PI*2*38),26),g=Math.exp(-Math.pow(z/.20,2))*(.35+.65*Math.sin(Math.PI*u)**2);
  const i=(y*w+x)*4;
  data[0].set([44+wave*31+edge*24,47+(1-wave)*25+edge*28,103+edge*74+wave*27,255].map(Math.round),i);
  data[1].set([255*g,115*g,29*g,255].map(Math.round),i);
  const coarse=Math.floor(u*12+z*2),band=Math.floor(v*5-u*.6),n=Math.sin(coarse*19+band*7);const nx=n*edge*18,ny=Math.cos(coarse*8+band*11)*edge*22;
  data[2].set([128+nx,128+ny,253,255].map(Math.round),i);
  const r=Math.round(146+stripes*34+grain*4);data[3].set([r,r,r,255],i);
 }
 return data.map((bytes,i)=>{let t;if(typeof document==='undefined')t=new T.DataTexture(bytes,w,h,T.RGBAFormat);else{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(bytes),w,h),0,0);t=new T.CanvasTexture(c);t.flipY=false;}t.name=['CORE_BlueViolet','CORE_Amber_Diffusion','CORE_Optical_Facets','CORE_Optical_Satin'][i];if(i<2)t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;return t;});
}
/** Material overlay: only UV is added; all existing positions/pivots remain intact. */
export function attachFinish(core){
 const [map,emissiveMap,normalMap,roughnessMap]=textures();
 const optical=new T.MeshPhysicalMaterial({name:'CORE_BlueViolet_Optical',map,emissiveMap,normalMap,normalScale:new T.Vector2(.7,.7),roughnessMap,color:'#b4baff',metalness:0,roughness:.25,transmission:.78,thickness:.12,ior:1.48,attenuationColor:'#8c83d5',attenuationDistance:1.8,clearcoat:.55,clearcoatRoughness:.13,iridescence:.18,iridescenceIOR:1.3,iridescenceThicknessRange:[180,340],emissive:'#ffb86b',emissiveIntensity:.85,envMapIntensity:.65});
 const shell=new T.MeshPhysicalMaterial({name:'CORE_Satin_Titanium',color:'#34323d',metalness:.86,roughness:.29,clearcoat:.3,clearcoatRoughness:.28});
 const trim=new T.MeshStandardMaterial({name:'CORE_Machined_Edge',color:'#3c3a4a',metalness:.92,roughness:.23});
 const dark=new T.MeshStandardMaterial({name:'CORE_Graphite',color:'#12141b',metalness:.52,roughness:.4});
 const rubber=new T.MeshStandardMaterial({name:'CORE_Gasket',color:'#080a10',metalness:0,roughness:.8});
 const warm=new T.MeshStandardMaterial({name:'CORE_Amber_Light',color:'#503221',metalness:0,roughness:.25,emissive:'#ff9a3d',emissiveIntensity:2.1});
 const marks=new T.MeshStandardMaterial({name:'CORE_Warm_Engraving',color:'#d2b898',metalness:.55,roughness:.32});
 const fine=new T.MeshStandardMaterial({name:'CORE_Optical_Filament',color:'#494f93',metalness:.6,roughness:.22});
 const selected=new T.MeshStandardMaterial({color:'#bca486',metalness:.25,roughness:.45});
 const gray=new Map(),finished=new Map(),casts=new Map();let look='product',selection=-1,energy=.6;
 function register(o){if(gray.has(o))return;gray.set(o,o.material);casts.set(o,o.castShadow);let m=shell;
  if(o.name==='Optical_Cover'){m=optical;const p=o.geometry.attributes.position,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[2*i]=(p.getX(i)+2.92)/4.44;uv[2*i+1]=(p.getZ(i)+.685)/1.37;}o.geometry.setAttribute('uv',new T.BufferAttribute(uv,2));}
  else if(o.name.endsWith('_Legend'))m=o.material;
  else if(/State_Light_Guide|Dial_Seat/.test(o.name))m=warm;
  else if(/Dial_Index|_Icon/.test(o.name))m=marks;
  else if(/Optical_Linear_Detail/.test(o.name))m=fine;
  else if(/Gasket|Socket|Placeholder|Foot|Vent_Reserve|Fastener_Slot/.test(o.name))m=rubber;
  else if(/Dial_Grip|Backplate|Service_Base|Removable_Service|_Key$/.test(o.name))m=dark;
  else if(/Top_Frame|Dial_Cap|Dial_Body|_Frame$|Base_Fastener/.test(o.name))m=trim;
  finished.set(o,m);
 }
 function refresh(){core.parts.forEach((part,i)=>part.traverse(o=>{if(!o.isMesh)return;register(o);o.material=i===selection?selected:(look==='product'?finished:gray).get(o);o.castShadow=look==='product'&&o.name==='Optical_Cover'?false:casts.get(o);}));optical.emissiveIntensity=energy*1.15;warm.emissiveIntensity=energy*1.7;}
 core.setLook=value=>{look=value==='gray'?'gray':'product';refresh();};core.setEnergy=value=>{energy=T.MathUtils.clamp(value,0,1.5);refresh();};core.highlight=index=>{selection=index;refresh();};
 core.disposeFinish=()=>{new Set([...finished.values(),selected]).forEach(m=>{if(![...gray.values()].includes(m))m.dispose();});[map,emissiveMap,normalMap,roughnessMap].forEach(t=>t.dispose());};refresh();return core;
}
