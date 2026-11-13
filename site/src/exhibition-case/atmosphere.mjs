import * as T from 'three';
import {surfaceTextures} from './finish-details.mjs';

export function galleryMaterials(envMap){
 const textures=surfaceTextures();
 const materials={
  wall:new T.MeshPhysicalMaterial({color:'#48434d',metalness:.15,roughness:.7,...textures,normalScale:new T.Vector2(.17,.17),envMapIntensity:.24,clearcoat:0}),
  floor:new T.MeshPhysicalMaterial({color:'#282a35',metalness:.32,roughness:.36,...textures,normalScale:new T.Vector2(.17,.17),envMapIntensity:.12,clearcoat:.08,clearcoatRoughness:.4}),
  stone:new T.MeshPhysicalMaterial({color:'#3a3541',...textures,normalScale:new T.Vector2(.12,.12),metalness:.6,roughness:.36,envMapIntensity:.24,clearcoat:.2}),
  dark:new T.MeshPhysicalMaterial({color:'#0d1422',metalness:.8,roughness:.28,envMapIntensity:.45}),
  warm:new T.MeshBasicMaterial({color:new T.Color('#ffd4a6').multiplyScalar(1.4)})
 };
 for(const m of Object.values(materials))if(m.isMeshStandardMaterial)m.envMap=envMap;
 return materials;
}

function glowMap(){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);
 g.addColorStop(0,'rgba(255,255,255,.8)');g.addColorStop(.25,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new T.CanvasTexture(c);
}

export function addArchitecturalLight(scene,cutaway){
 const cool=new T.MeshBasicMaterial({color:new T.Color('#809de6').multiplyScalar(.85)}),seam=new T.MeshStandardMaterial({color:'#080e1c',metalness:.45,roughness:.4,envMapIntensity:.1});
 const glow=glowMap();
 function strip(size,pos,mat=cool,parent=scene){const m=new T.Mesh(new T.BoxGeometry(...size),mat);m.position.fromArray(pos);parent.add(m);return m;}
 function wash(size,pos,color,opacity){const m=new T.Mesh(new T.PlaneGeometry(...size),new T.MeshBasicMaterial({map:glow,color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending}));m.position.fromArray(pos);scene.add(m);return m;}
 // Recessed joints and coves remain attached to their existing wall planes.
 for(let x=-20;x<21;x+=4){strip([.024,8.4,.025],[x,4.3,-16.8],seam);}
 for(const z of [-14,-8,-2,4,10]){strip([.025,8.4,.024],[-20.8,4.3,z],seam);}
 for(const y of [.18,8.55]){
  strip([41.5,.035,.045],[0,y,-16.77]);strip([.045,.035,33.4],[-20.77,y,0]);strip([.045,.035,33.4],[20.77,y,0],cool,cutaway);
 }
 for(const x of [-19.8,-.5,8.5,20]){strip([.035,7.8,.04],[x,4.2,-16.75]);wash([3.2,8],[x,4.2,-16.73],'#617bd7',.19);}
 // Broad surface washes frame the art without adding a bank of dynamic lights.
 for(const x of [-13,-5,12,17]){wash([7.0,6.6],[x,3.7,-16.7],'#686de0',.20);}
 for(const x of [-16,-7,2,11,19])strip([.035,.02,29],[x,8.205,-.5]);
 // Flush inlays articulate circulation; no raised objects are introduced.
 for(const x of [-9.6,-6.4])for(let z=3;z<15;z+=2.4)strip([.025,.012,1.7],[x,-.035,z]);
 for(const r of [6.95,7.04]){
  const points=[];for(let i=0;i<=128;i++){const a=(205+i/128*285)*Math.PI/180;points.push(new T.Vector3(1+r*Math.cos(a),-.032,-3+r*Math.sin(a)));}
  scene.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#7996c8',transparent:true,opacity:.24})));
 }
 const underDesk=wash([5.8,2.5],[-15,-.028,12.6],'#ae9bfb',.18);underDesk.rotation.x=-Math.PI/2;
}

/** Calibrate only this gallery's material instances; product source and geometry stay unchanged. */
export function tuneOpticalLeaf(leaf,envMap){
 const materials=new Set();leaf.group.traverse(o=>{if(o.isMesh)materials.add(o.material);});
 for(const m of materials){
  if(m.name==='LEAF_BlueViolet_Optical'){
   const c=document.createElement('canvas');c.width=m.map.image.width;c.height=m.map.image.height;const x=c.getContext('2d');x.drawImage(m.map.image,0,0);const p=x.getImageData(0,0,c.width,c.height);
   for(let i=0;i<p.data.length;i+=4){p.data[i]=p.data[i]*.65+72;p.data[i+1]=p.data[i+1]*.65+76;p.data[i+2]=p.data[i+2]*.65+94;}x.putImageData(p,0,0);
   const old=m.map;m.map=new T.CanvasTexture(c);m.map.flipY=old.flipY;m.map.colorSpace=T.SRGBColorSpace;old.dispose();
   m.color.set('#c4caff');m.transmission=.88;m.roughness=.22;m.thickness=.12;m.attenuationColor.set('#a5a2ed');m.envMap=envMap;m.envMapIntensity=.8;m.iridescence=.24;m.clearcoatRoughness=.16;
  }
  if(m.name==='LEAF_Optical_Edge'){m.color.set('#7885a9');m.roughness=.25;}
  if(m.name==='LEAF_Optical_Ribs'){m.color.set('#65749a');m.metalness=.3;}
 }
 return leaf;
}
