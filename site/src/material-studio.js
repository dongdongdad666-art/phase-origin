import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

export function createMaterialStudio(renderer,scene){
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),legacy=pmrem.fromScene(room,.025);room.dispose();
 const studio=new THREE.Scene();studio.background=new THREE.Color(.18,.20,.26);
 const cards=[[-5,6,4,7,10,0xe3eaff,3],[5,2,-3,3,8,0xa7c5db,2.4],[-1,3,-5,5,1.2,0xc7bce2,2],[0,-4,3,5,3,0xe4d6c5,1.0],[4,3,6,5,7,0xd0d9e8,1.3]];
 for(const [x,y,z,w,h,hex,intensity] of cards){const material=new THREE.MeshBasicMaterial({color:new THREE.Color(hex).multiplyScalar(intensity),toneMapped:false,side:THREE.DoubleSide}),mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);mesh.position.set(x,y,z);mesh.lookAt(0,0,0);studio.add(mesh);}
 const refined=pmrem.fromScene(studio,.16);studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();
 const lights=new THREE.Group();scene.add(lights);
 function set(mode='studio',profile={}){
  if(mode==='mineral'){
   lights.clear();scene.environment=refined.texture;scene.environmentIntensity=profile.fractures===0?.85:.55;scene.background=new THREE.Color(0x100e20);renderer.toneMappingExposure=1.12;
   lights.add(new THREE.HemisphereLight(0x7674e0,0x11102b,profile.fractures===0?1.0:.65));
   for(const [color,power,position] of [[0x616af0,2.6,[-5,5,-5]],[0xa4a4f4,2.3,[5,3,5]],[0xb595d4,.5,[-4,7,2]]]){const l=new THREE.DirectionalLight(color,power);l.position.fromArray(position);lights.add(l);}
   const energy=new THREE.PointLight(0xff662b,7*(profile.warmStrength??1),12,2);if(profile.center)energy.position.fromArray(profile.center).multiplyScalar(9);else energy.position.set(-.109,.86,-.195);lights.add(energy);return;
  }
  lights.clear();scene.environment=mode==='studio'?refined.texture:legacy.texture;scene.environmentIntensity=mode==='studio'?1.0:.72;scene.background=new THREE.Color(mode==='studio'?0x10121c:0x26272b);renderer.toneMappingExposure=mode==='studio'?1.08:1;
  if(mode==='legacy'){scene.environmentIntensity=.85;scene.background.set(0x14121d);renderer.toneMappingExposure=1.05;}
  lights.add(new THREE.HemisphereLight(mode==='studio'?0xbcc7dd:0xdedee0,mode==='studio'?0x303241:0x15151b,mode==='studio'?1.2:.85));
  const settings=mode==='studio'?[[0xe3eaff,1.8,[-5,8,7]],[0xa9bfdf,1.2,[7,4,-5]],[0xd4c4b0,.6,[-4,-2,4]]]:[[0xeee8e5,2.2,[-8,12,10]],[0x9bb1dc,3,[8,5,-8]],[0xb7cad1,.75,[10,1,12]]];
  for(const [color,intensity,position] of settings){const light=new THREE.DirectionalLight(color,intensity);light.position.fromArray(position);lights.add(light);}
 }
 set();return {set};
}

