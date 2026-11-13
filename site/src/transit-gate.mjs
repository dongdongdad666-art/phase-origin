import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const TRANSIT_GATE_VERSION='transit-gate-v001';
export const TRANSIT_APERTURE=6.78;

// Normalized for the established 20× journey scale. The ring has an actual
// lenticular cross-section, not a plane, and never deforms into the aperture.
function ribbon({start=0,span=Math.PI*2,phase=0,fin=false,edge=false}){
 const steps=fin?144:384,sides=edge?6:16,positions=[],uv=[],indices=[];
 for(let i=0;i<=steps;i++){
  const u=i/steps,a=start+span*u,wave=a*3+phase;
  const taper=fin?Math.pow(Math.sin(Math.PI*u),.72):1;
  const center=fin?.388+.008*Math.sin(u*Math.PI):.375+.012*Math.sin(wave);
  const z=fin?.006+.012*Math.sin(a*3+phase):.015*Math.cos(wave);
  const width=fin?.014*taper+.00012:.0145+.0025*Math.cos(wave*2+.6);
  const depth=fin?.0034*taper+.00008:.0048;
  const roll=.25*Math.sin(wave+.4);
  for(let j=0;j<=sides;j++){
   const v=j/sides,b=v*Math.PI*2;
   const x=edge?width*.9+.0008*Math.cos(b):width*Math.cos(b);
   const carving=.82+.18*Math.cos(Math.cos(b)*Math.PI*4+Math.sin(wave)*.5);
   const zz=edge?.0008*Math.sin(b):depth*Math.sin(b)*(1-.32*Math.abs(Math.cos(b)))*carving;
   const radial=center+x*Math.cos(roll)-zz*Math.sin(roll);
   positions.push(radial*Math.cos(a),radial*Math.sin(a),z+x*Math.sin(roll)+zz*Math.cos(roll));
   uv.push(u*(fin?1:3),v);
   if(i<steps&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
  }
 }
 // Seal the tiny tapered ends. Closed ribbons are periodic and welded in space.
 if(fin)for(const offset of [0,steps*(sides+1)])for(let j=1;j<sides-1;j++){
  if(offset===0)indices.push(offset,offset+j,offset+j+1);else indices.push(offset,offset+j+1,offset+j);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
 // Match duplicate UV seam normals so grazing studio highlights stay continuous.
 const n=g.attributes.normal;
 const average=(a,b)=>{const v=new THREE.Vector3().fromBufferAttribute(n,a).add(new THREE.Vector3().fromBufferAttribute(n,b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);};
 for(let i=0;i<=steps;i++)average(i*(sides+1),i*(sides+1)+sides);
 if(!fin)for(let j=0;j<=sides;j++)average(j,steps*(sides+1)+j);
 return g;
}

export function createTransitGate(){
 const root=new THREE.Group();root.name='Transit gate / fixed braided crystal';
 root.userData={version:TRANSIT_GATE_VERSION,activation:'optical field only',apertureRadius:TRANSIT_APERTURE/20};
 const shells=[],fins=[],edges=[];
 for(let i=0;i<3;i++){
  const phase=i*Math.PI*2/3;shells.push(ribbon({phase}));edges.push(ribbon({phase,edge:true}));
 }
 for(let i=0;i<6;i++)fins.push(ribbon({start:i*Math.PI/3-.26,span:1.64,phase:i*.7,fin:true}));
 for(const [name,pieces] of [['phase-shell',shells],['phase-structure',fins],['phase-edge',edges]]){
  const geometry=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());
  const material=new THREE.MeshStandardMaterial({name,color:0x0c0a21,metalness:.86,roughness:name==='phase-shell'?.105:.15});
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 }
 return root;
}
