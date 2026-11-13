import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';

// Deterministic, non-directional grain avoids the former repeating sine stripes.
export function surfaceTextures(){
 const size=256,hash=(x,y)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v);};
 function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y);let a=x-ix,b=y-iy;a=a*a*(3-2*a);b=b*b*(3-2*b);return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),a),T.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),a),b);}
 const height=new Float32Array(size*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)height[y*size+x]=noise(x/35,y/35)*.5+noise(x/11,y/11)*.25+noise(x/3,y/3)*.12+hash(x,y)*.13;
 function texture(kind){const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d'),p=ctx.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,h=height[y*size+x];let rgb;
   if(kind==='normal'){const dx=height[y*size+(x+1)%size]-h,dy=height[((y+1)%size)*size+x]-h;rgb=[128-dx*80,128-dy*80,254];}
   else {const v=kind==='rough'?180+h*55:170+h*54;rgb=[v,v,v];}
   p.data.set([...rgb,255],i);
  }ctx.putImageData(p,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(4,4);t.anisotropy=4;if(kind==='color')t.colorSpace=T.SRGBColorSpace;t.name='Court_'+kind;return t;
 }
 return {map:texture('color'),roughnessMap:texture('rough'),normalMap:texture('normal')};
}

export function opticalCanopyTexture(){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),p=ctx.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4,w=.5+.5*Math.sin(x*.035+Math.sin(y*.027)*1.8),fine=.5+.5*Math.sin((x+y*.7)*.3);p.data.set([130+w*30,132+fine*20,190+w*35,255],i);}ctx.putImageData(p,0,0);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}

/** A bounded, softly blurred reflection overlay. The architectural GLB uses the PBR floor beneath. */
export function createFloorReflection(scene){
 const shader={...Reflector.ReflectorShader,uniforms:{...Reflector.ReflectorShader.uniforms},fragmentShader:`
 uniform vec3 color;uniform sampler2D tDiffuse;varying vec4 vUv;
 void main(){
  vec2 uv=vUv.xy/vUv.w;vec2 d=vec2(.0028,.0045);
  vec3 c=texture2D(tDiffuse,uv).rgb*.28;
  c+=(texture2D(tDiffuse,uv+vec2(d.x,0.)).rgb+texture2D(tDiffuse,uv-vec2(d.x,0.)).rgb+texture2D(tDiffuse,uv+vec2(0.,d.y)).rgb+texture2D(tDiffuse,uv-vec2(0.,d.y)).rgb)*.12;
  c+=(texture2D(tDiffuse,uv+d).rgb+texture2D(tDiffuse,uv-d).rgb+texture2D(tDiffuse,uv+vec2(d.x,-d.y)).rgb+texture2D(tDiffuse,uv+vec2(-d.x,d.y)).rgb)*.06;
  gl_FragColor=vec4(c*vec3(.83,.85,.94),.22);
 }`};
 const floor=new Reflector(new T.PlaneGeometry(42,34),{textureWidth:384,textureHeight:384,multisample:0,clipBias:.002,color:'#8c8c98',shader});
 floor.name='Runtime_Soft_Floor_Reflection';floor.rotation.x=-Math.PI/2;floor.position.y=-.043;floor.material.transparent=true;floor.material.depthWrite=false;floor.material.toneMapped=false;scene.add(floor);
 const render=floor.onBeforeRender;let allowed=true;const reflectedMaterials=new Map();
 floor.onBeforeRender=function(...args){
  if(!allowed)return;allowed=false;const replacements=[];
  // The soft secondary image does not need another refractive scene pass.
  // Restore every live material before the main view resumes.
  scene.traverse(o=>{const m=o.material;if(!o.isMesh||!m?.transmission)return;
   if(!reflectedMaterials.has(m))reflectedMaterials.set(m,new T.MeshStandardMaterial({color:m.color,map:m.map,metalness:.22,roughness:.4,side:T.DoubleSide,envMap:m.envMap,envMapIntensity:m.envMapIntensity}));
   replacements.push([o,m]);o.material=reflectedMaterials.get(m);
  });
  try{render.apply(this,args);}finally{for(const [o,m] of replacements)o.material=m;}
 };
 return {object:floor,prepare(width,view){floor.visible=width>=800&&view!=='top';allowed=true;},dispose(){floor.dispose();for(const m of reflectedMaterials.values())m.dispose();}};
}
