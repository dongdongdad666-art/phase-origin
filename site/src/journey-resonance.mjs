import * as THREE from 'three';
import {ease} from './cinematic-timeline.mjs';
import {terrainHeight} from './journey-landscape.mjs';
import {applyPhaseCrystal} from './phase-crystal.mjs';

// Lower banks, not ridge tops. The central hero and its camera occupy the open basin.
export const GROVE_STATIONS=[
 [-40,-40,30],[-37,-75,35],[-34,-120,28],
 [63,-86,33],[62,-135,38],[-31,20,24]
].map(([x,z,height],index)=>({x,z,height,index,angle:Math.atan2(z+13,x-18)}));

export function sampleGrove(time){
 return GROVE_STATIONS.map((_,i)=>ease(32.8+i*.48,45+i*.48,time));
}
const curve=points=>new THREE.CatmullRomCurve3(points.map(p=>Array.isArray(p)?new THREE.Vector3(...p):p),false,'centripetal');
function phaseAt(path,t,start,end){
 const lengths=path.getLengths(200),f=t*200,i=Math.min(199,Math.floor(f));
 return THREE.MathUtils.lerp(start,end,THREE.MathUtils.lerp(lengths[i],lengths[i+1],f-i)/lengths[200]);
}

// Closed, fluted cross-sections maintain volume while their centerlines branch.
// Growth changes the visible path length, never the scale of the finished scaffold.
function spineGeometry(path,radius,from=0,to=1,segments=48){
 const positions=[],centers=[],along=[],uvs=[],indices=[],sides=12,frames=path.computeFrenetFrames(segments,false),textureLength=path.getLength()/8;
 const point=new THREE.Vector3(),offset=new THREE.Vector3();
 for(let i=0;i<=segments;i++){
  const u=i/segments,center=path.getPointAt(u),r=radius*Math.pow(1-u,.68)+.045;
  for(let j=0;j<=sides;j++){
   const a=j/sides*Math.PI*2,flute=1+.14*Math.cos(a*3+u*.45);
   offset.copy(frames.normals[i]).multiplyScalar(Math.cos(a)*r*flute).addScaledVector(frames.binormals[i],Math.sin(a)*r*flute*.8);
   point.copy(center).add(offset);positions.push(...point);centers.push(...center);along.push(THREE.MathUtils.lerp(from,to,u));uvs.push(j/sides,u*textureLength);
   if(i<segments&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setAttribute('resonanceCenter',new THREE.Float32BufferAttribute(centers,3));g.setAttribute('resonanceAlong',new THREE.Float32BufferAttribute(along,1));g.setIndex(indices);g.computeVertexNormals();return g;
}

function growthMaterial(progress,kind){
 // Opaque fallback while the renderer loads its shared maps and reflection.
 const m=new THREE.MeshPhysicalMaterial({name:kind==='membrane'?'phase-lamina':'phase-structure',color:0x091421,metalness:.78,roughness:.12,transmission:0,side:THREE.DoubleSide});
 return addPathGrowth(m,progress,kind);
}

function addPathGrowth(m,progress,kind){
 const membrane=kind==='membrane';
 const compile=m.onBeforeCompile,cache=m.customProgramCacheKey.bind(m);
 m.customProgramCacheKey=()=>cache()+'-path-growth-v2-'+kind;
 m.onBeforeCompile=function(s,r){
  compile.call(this,s,r);s.uniforms.resonanceProgress=progress;
  s.vertexShader='attribute float resonanceAlong;varying float pathAlong;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\npathAlong=resonanceAlong;');
  if(!membrane){
   s.vertexShader='attribute vec3 resonanceCenter;uniform float resonanceProgress;\n'+s.vertexShader;
   // A tapered advancing tip avoids the appearance of sawn-off poles during growth.
   s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    float tipWidth=smoothstep(0.,.045,resonanceProgress-resonanceAlong);
    transformed=mix(resonanceCenter,transformed,tipWidth);
   `);
  }
  s.fragmentShader='uniform float resonanceProgress;varying float pathAlong;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
   if(pathAlong>resonanceProgress||resonanceProgress<.00001)discard;
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float front=(1.-smoothstep(.0,.045,resonanceProgress-pathAlong))*(1.-smoothstep(.94,1.,resonanceProgress));
   totalEmissiveRadiance+=vec3(.06,.18,.36)*front*.5;
  `);
 };return m;
}

// The web follows two supporting rails. Its edge vertices sit exactly on those rails.
function webGeometry(left,right){
 const positions=[],along=[],uvs=[],indices=[],rows=28,cols=12;
 const point=new THREE.Vector3();
 for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
  const u=i/rows,v=j/cols,a=left.getPoint(u),b=right.getPoint(u);
  point.copy(a).lerp(b,v);point.x+=Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*.65;
  positions.push(...point);uvs.push(v,u);along.push(.9+u*.08+Math.sin(v*Math.PI)*.02);
  if(i<rows&&j<cols){const k=i*(cols+1)+j;indices.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setAttribute('resonanceAlong',new THREE.Float32BufferAttribute(along,1));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function createResonanceGrove(scene){
 const grove=new THREE.Group();grove.name='Resonance banks / branching mineral scaffold';scene.add(grove);
 const stations=[],uniforms=[],roots=[],crystalLooks=[];
 for(const spec of GROVE_STATIONS){
  const group=new THREE.Group();group.name=`Shore scaffold ${spec.index+1}`;
  group.position.set(spec.x,terrainHeight(spec.x,spec.z)-.25,spec.z);group.rotation.y=-spec.angle;
  group.userData.footprints=[];group.userData.supportedWebs=[];grove.add(group);stations.push(group);
  const progress={value:0};uniforms.push(progress);
  const shell=growthMaterial(progress,'scaffold'),webMaterial=growthMaterial(progress,'membrane');
  const h=spec.height;
  const stem=curve([[0,-.3,0],[.5,h*.2,.3],[-1.4,h*.48,1],[-5,h*.76,.7],[-11,h,0]]);
  group.add(new THREE.Mesh(spineGeometry(stem,1.45,0,.64),shell));
  // Three sculptural feet broaden the root into the bank instead of ending in a point.
  for(let i=0;i<3;i++){
   const a=i*Math.PI*2/3+.3,lx=Math.cos(a)*5.8,lz=Math.sin(a)*5.8;
   const wx=spec.x+Math.cos(spec.angle)*lx-Math.sin(spec.angle)*lz,
     wz=spec.z+Math.sin(spec.angle)*lx+Math.cos(spec.angle)*lz;
   const foot=new THREE.Vector3(lx,terrainHeight(wx,wz)-group.position.y-.3,lz);
   const footPath=curve([foot,foot.clone().multiply(new THREE.Vector3(.6,1,.6)).add(new THREE.Vector3(0,.6,0)),[0,2,0],stem.getPoint(.18)]);
   const mesh=new THREE.Mesh(spineGeometry(footPath,.82,0,.3,32),shell);group.add(mesh);
   group.userData.footprints.push(foot.toArray());roots.push({group,foot});
  }
  for(let side=-1;side<=1;side+=2){
   const u=side<0?.48:.62,join=stem.getPoint(u),tangent=stem.getTangent(u);
   const reach=side<0?11:8,tip=new THREE.Vector3(-8,h*(side<0?.82:1.08),side*reach);
   const fork=curve([join,join.clone().addScaledVector(tangent,3),[-5,h*.71,side*reach*.65],tip]);
   const joinPhase=phaseAt(stem,u,0,.64)+.035;
   group.add(new THREE.Mesh(spineGeometry(fork,.78,joinPhase,.84,40),shell));
   // Small membranes span a fork pair; they never stand independently in the landscape.
   const webBase=fork.getPoint(.7),webTip=fork.getPoint(.96),mid=webBase.clone().lerp(webTip,.52);
   const left=curve([webBase,mid.clone().add(new THREE.Vector3(-2.2,1,side*.75)),webTip]);
   const right=curve([webBase,mid.clone().add(new THREE.Vector3(1.4,-.6,-side*.6)),webTip]);
   const webStart=phaseAt(fork,.7,joinPhase,.84)+.025;
   for(const edge of [left,right])group.add(new THREE.Mesh(spineGeometry(edge,.16,webStart,.88,32),shell));
   const membrane=new THREE.Mesh(webGeometry(left,right),webMaterial);membrane.name='Fork-supported optical web';group.add(membrane);
   group.userData.supportedWebs.push({mesh:membrane,left,right});
   // One narrower tertiary branch gives depth from side views, not a second flat fan.
   const branchJoin=fork.getPoint(.43),direction=fork.getTangent(.43);
   group.add(new THREE.Mesh(spineGeometry(curve([branchJoin,branchJoin.clone().addScaledVector(direction,2),[-1,h*.8,side*reach*1.12],[-3,h*.92,side*reach*1.36]]),.34,phaseAt(fork,.43,joinPhase,.84)+.035,.89,32),shell));
  }
 }
 // A low circuit traces the existing shore between groups, never across the sky.
 const signalUniforms={clock:{value:0},amount:{value:0}};
 const signalMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:signalUniforms,
  vertexShader:'varying float along;void main(){along=uv.x;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying float along;uniform float clock,amount;void main(){float pulse=exp(-pow((along-fract(clock*.08))*13.,2.));gl_FragColor=vec4(vec3(.24,.45,.7),amount*(.07+pulse*.28));}'
 });
 for(const [a,b] of [[0,1],[1,2],[3,4],[5,0]]){
  const from=GROVE_STATIONS[a],to=GROVE_STATIONS[b],points=[];
  for(let i=0;i<=80;i++){const u=i/80,x=THREE.MathUtils.lerp(from.x,to.x,u),z=THREE.MathUtils.lerp(from.z,to.z,u);points.push(new THREE.Vector3(x,Math.max(-1.91,terrainHeight(x,z)+.08),z));}
  const line=new THREE.Mesh(new THREE.TubeGeometry(curve(points),128,.035,4,false),signalMaterial);grove.add(line);
 }
 function setCrystalLook(textures,envMap){
  // Each bank has its own growth clock. Do not merge all stations into one
  // shared material or their staggered, reversible emergence would be lost.
  crystalLooks.length=0;
  stations.forEach((station,i)=>{
   const previous=new Set();station.traverse(m=>{if(m.isMesh)previous.add(m.material);});
   const look=applyPhaseCrystal(station,'blade',textures,{envMap,highlightCeiling:1});
   look.materials.forEach(m=>addPathGrowth(m,uniforms[i],m.name==='phase-structure'?'scaffold':'membrane'));
   previous.forEach(m=>m.dispose());crystalLooks.push(look);
  });
 }
 function update(time){
  const growth=sampleGrove(time);grove.visible=time>32.8;signalUniforms.clock.value=time;signalUniforms.amount.value=ease(32,43,time);
  stations.forEach((station,i)=>{uniforms[i].value=growth[i];station.visible=growth[i]>.0001;});
  crystalLooks.forEach(look=>{look.uniforms.time.value=time;});
 }
 update(0);return {grove,stations,roots,update,setCrystalLook};
}


