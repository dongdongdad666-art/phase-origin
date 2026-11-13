import * as THREE from 'three';

export const WATER_LEVEL=-1.96;
export const HEIGHT_BOUNDS=Object.freeze({minX:-220,maxX:220,minZ:-320,maxZ:120});
export const GRID_SEGMENTS=256;
const BED=-7,SPAN=440,STEP=SPAN/GRID_SEGMENTS,SIDE=GRID_SEGMENTS+1;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;

// Deterministic lattice noise: broad relief is not made from repeated sine hills.
function hash(x,z){
  let n=Math.imul(x,374761393)^Math.imul(z,668265263);
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967295*2-1;
}
function noise(x,z){
  const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
  const u=fx*fx*fx*(fx*(fx*6-15)+10),v=fz*fz*fz*(fz*(fz*6-15)+10);
  return mix(mix(hash(ix,iz),hash(ix+1,iz),u),mix(hash(ix,iz+1),hash(ix+1,iz+1),u),v);
}
function relief(x,z){
  return noise(x*.026,z*.026)*.58+noise(x*.063+11,z*.063-5)*.27+noise(x*.145-17,z*.145+23)*.15;
}
function ridge(x,center,width){
  // A broad eroded lee and a steeper exposed flank give the light real volume.
  const d=x-center,w=width*(d<0?.78:1.13);
  return Math.exp(-Math.pow(Math.abs(d/w),1.55));
}
function sculptHeight(x,z){
  const bend=noise(z*.011+9,3.71),warp=noise(x*.018-4,z*.014+12);
  const west=-67+bend*13+(z+30)*.038;
  const east=81+noise(z*.009-9,4.1)*16-(z+45)*.042;
  const westHeight=38+noise(z*.021+4,7.7)*14+noise(z*.052,9.2)*6;
  const eastHeight=46+noise(z*.017-3,2.4)*18+noise(z*.046+7,11)*8;
  const land=westHeight*ridge(x+warp*4,west,24)
    +eastHeight*ridge(x+warp*5,east,27)
    +(58+noise(z*.013+13,19)*19)*ridge(x,-143+noise(z*.008,17)*18,34)
    +(66+noise(z*.015-7,23)*20)*ridge(x,157+noise(z*.009-4,31)*17,37);
  const mass=smooth(0,18,land);
  const detail=relief(x+warp*7,z+warp*4);
  // Branching gullies interrupt the ridge line while keeping a connected massif.
  const erosion=Math.pow(1-Math.abs(noise(x*.087+warp*1.5,z*.057-9)),7);
  let height=-5.9+land*(.92+detail*.24)+mass*(detail*3.3-erosion*2.1);

  // The accepted camera/hero staging stays in a broad flooded amphitheatre.
  const ellipse=Math.hypot((x-13)/49,(z+11)/51);
  const basin=1-smooth(.75,1.2,ellipse);
  const bed=-5.7+noise(x*.037+8,z*.031)*.32;
  height=mix(height,Math.min(height,bed),basin);

  // An unbroken water pass leads through the gate toward the distant response.
  const channelX=18+noise(z*.009+23,21)*3;
  const channel=(1-smooth(15,37,Math.abs(x-channelX)))*(1-smooth(-28,5,z));
  height=mix(height,Math.min(height,bed-.35),channel);
  const edge=Math.min(x-HEIGHT_BOUNDS.minX,HEIGHT_BOUNDS.maxX-x,z-HEIGHT_BOUNDS.minZ,HEIGHT_BOUNDS.maxZ-z);
  return mix(BED,height,smooth(0,24,edge));
}

let heights=null,minHeight=Infinity,maxHeight=-Infinity;
function heightGrid(){
  if(heights)return heights;
  heights=new Float32Array(SIDE*SIDE);
  for(let row=0;row<SIDE;row++)for(let col=0;col<SIDE;col++){
    const index=row*SIDE+col;
    heights[index]=sculptHeight(HEIGHT_BOUNDS.minX+col*STEP,HEIGHT_BOUNDS.minZ+row*STEP);
    minHeight=Math.min(minHeight,heights[index]);maxHeight=Math.max(maxHeight,heights[index]);
  }
  return heights;
}

// Match PlaneGeometry's diagonal exactly. Water depth and geometry therefore
// agree between vertices as well as at grid points; bilinear filtering would not.
export function terrainHeight(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<HEIGHT_BOUNDS.minX||x>HEIGHT_BOUNDS.maxX||z<HEIGHT_BOUNDS.minZ||z>HEIGHT_BOUNDS.maxZ)return BED;
  const data=heightGrid(),gx=(x-HEIGHT_BOUNDS.minX)/STEP,gz=(z-HEIGHT_BOUNDS.minZ)/STEP;
  const ix=Math.min(GRID_SEGMENTS-1,Math.floor(gx)),iz=Math.min(GRID_SEGMENTS-1,Math.floor(gz));
  const u=gx-ix,v=gz-iz,i=iz*SIDE+ix;
  const a=data[i],b=data[i+1],c=data[i+SIDE],d=data[i+SIDE+1];
  return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
}

function mineralGroundMaterial(){
  const material=new THREE.MeshStandardMaterial({color:0x5f6275,roughness:.91,metalness:.055,envMapIntensity:.24});
  material.name='Weathered blue-violet mineral / wet shoreline';
  material.customProgramCacheKey=()=> 'journey-landscape-mineral-v2';
  material.onBeforeCompile=shader=>{
    shader.uniforms.landscapeWaterLevel={value:WATER_LEVEL};
    shader.vertexShader='varying vec3 landscapeWorld,landscapeNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      landscapeWorld=(modelMatrix*vec4(transformed,1.)).xyz;
      landscapeNormal=normalize(mat3(modelMatrix)*normal);`);
    shader.fragmentShader=`varying vec3 landscapeWorld,landscapeNormal;
      uniform float landscapeWaterLevel;
      float landHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float landNoise(vec3 p){
        vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(landHash(i),landHash(i+vec3(1,0,0)),f.x),mix(landHash(i+vec3(0,1,0)),landHash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(landHash(i+vec3(0,0,1)),landHash(i+vec3(1,0,1)),f.x),mix(landHash(i+vec3(0,1,1)),landHash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      vec3 landBump(vec3 surfacePosition,vec3 surfaceNormal,float height){
        vec3 qx=dFdx(surfacePosition),qy=dFdy(surfacePosition);
        vec3 r1=cross(qy,surfaceNormal),r2=cross(surfaceNormal,qx);
        float determinant=dot(qx,r1);
        vec3 gradient=sign(determinant)*(dFdx(height)*r1+dFdy(height)*r2);
        return normalize(max(abs(determinant),1.e-8)*surfaceNormal-gradient);
      }
      `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float landGrain=landNoise(landscapeWorld*.62);
      float strata=sin(landscapeWorld.y*1.35+landNoise(landscapeWorld*.075)*6.);
      float sediment=smoothstep(-.2,.6,strata)*.09;
      float wetBank=1.-smoothstep(landscapeWaterLevel-.15,landscapeWaterLevel+1.25,landscapeWorld.y);
      vec3 coolStone=mix(vec3(.82,.89,1.01),vec3(1.06,1.02,.99),landNoise(landscapeWorld*.037));
      // Preserve a dominant geological light direction despite the three studio
      // lights required by the hero models. Back slopes retain blue ambient fill.
      float rockFacing=dot(normalize(landscapeNormal),normalize(vec3(-.72,.43,.30)));
      float slopeShelter=mix(.44,1.,smoothstep(-.25,.55,rockFacing));
      diffuseColor.rgb*=coolStone*(.88+landGrain*.15+sediment)*slopeShelter;
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.39,.47,.58),wetBank*.76);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=mix(roughnessFactor,.29,wetBank*.88);
      roughnessFactor=clamp(roughnessFactor+(landGrain-.5)*.09,.25,.98);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float nearRock=1.-smoothstep(35.,135.,length(vViewPosition));
      vec3 erosionPoint=landscapeWorld*vec3(.83,1.1,.91);
      float rockHeight=landNoise(erosionPoint*.82)*.13;
      rockHeight+=landNoise(erosionPoint*2.7+vec3(17.,3.,9.))*.041*nearRock;
      rockHeight+=landNoise(erosionPoint*7.1+vec3(5.,23.,11.))*.013*nearRock;
      rockHeight+=(smoothstep(.05,.65,strata)-.5)*.072;
      rockHeight*=mix(1.,.3,wetBank);
      normal=landBump(-vViewPosition,normal,rockHeight);`);
  };
  return material;
}

export function createJourneyLandscape(scene){
  const data=heightGrid();
  const geometry=new THREE.PlaneGeometry(SPAN,SPAN,GRID_SEGMENTS,GRID_SEGMENTS);
  geometry.rotateX(-Math.PI/2);
  geometry.translate(0,0,(HEIGHT_BOUNDS.minZ+HEIGHT_BOUNDS.maxZ)/2);
  const position=geometry.attributes.position;
  for(let i=0;i<position.count;i++)position.setY(i,data[i]);
  position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const terrain=new THREE.Mesh(geometry,mineralGroundMaterial());
  terrain.name='Continuous mineral valley';terrain.receiveShadow=true;
  scene.add(terrain);
  return {terrain,occluders:[terrain],heightAt:terrainHeight,report:()=>({
    type:'continuous-heightfield',bounds:HEIGHT_BOUNDS,gridSegments:GRID_SEGMENTS,gridStep:STEP,
    vertices:position.count,triangles:geometry.index.count/3,minHeight,maxHeight,waterLevel:WATER_LEVEL,
  })};
}
