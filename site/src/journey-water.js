import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {WATER_LEVEL,MAX_RIPPLES,createWaterInteraction,advanceWaterInteraction,clearWaterInteraction} from './journey-water-state.mjs';

export {WATER_LEVEL};
const BOUNDS={minX:-220,maxX:220,minZ:-320,maxZ:120},HEIGHT_SIZE=257,REFLECTION_SIZE=512;
const BED_MIN=-30,BED_RANGE=150;

function makeHeightTexture(heightAt){
 const bytes=new Uint8Array(HEIGHT_SIZE*HEIGHT_SIZE*4);
 for(let j=0;j<HEIGHT_SIZE;j++)for(let i=0;i<HEIGHT_SIZE;i++){
  const x=BOUNDS.minX+(BOUNDS.maxX-BOUNDS.minX)*i/(HEIGHT_SIZE-1),z=BOUNDS.minZ+(BOUNDS.maxZ-BOUNDS.minZ)*j/(HEIGHT_SIZE-1);
  const height=heightAt(x,z),encoded=Math.round(THREE.MathUtils.clamp(((Number.isFinite(height)?height:-7)-BED_MIN)/BED_RANGE,0,1)*65535),at=(j*HEIGHT_SIZE+i)*4;
  bytes[at]=encoded>>8;bytes[at+1]=encoded&255;bytes[at+3]=255;
 }
 const texture=new THREE.DataTexture(bytes,HEIGHT_SIZE,HEIGHT_SIZE,THREE.RGBAFormat);
 texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;return texture;
}

const shader={
 name:'JourneyMineralWater',
 uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null},heightMap:{value:null},storyTime:{value:0},fogColor:{value:new THREE.Color(.07,.045,.125)},fogDensity:{value:.016},arrival:{value:0},rippleCount:{value:0},ripples:{value:Array.from({length:MAX_RIPPLES},()=>new THREE.Vector4())}},
 vertexShader:/* glsl */`
 uniform mat4 textureMatrix;
 varying vec4 vReflection;
 varying vec3 vWorld;
 void main(){
  vReflection=textureMatrix*vec4(position,1.);
  vWorld=(modelMatrix*vec4(position,1.)).xyz;
  gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);
 }`,
 fragmentShader:/* glsl */`
 uniform sampler2D tDiffuse,heightMap;
 uniform float storyTime,fogDensity,arrival;
 uniform int rippleCount;
 uniform vec4 ripples[${MAX_RIPPLES}];
 uniform vec3 fogColor;
 varying vec4 vReflection;
 varying vec3 vWorld;
 float bedSample(vec2 cell){
  vec2 c=texture2D(heightMap,(cell+.5)/${HEIGHT_SIZE.toFixed(1)}).rg;
  return (c.r*65280.+c.g*255.)/65535.*${BED_RANGE.toFixed(1)}+${BED_MIN.toFixed(1)};
 }
 float bedHeight(vec2 p){
  vec2 uv=(p-vec2(${BOUNDS.minX.toFixed(1)},${BOUNDS.minZ.toFixed(1)}))/vec2(440.);
  if(min(uv.x,uv.y)<0.||max(uv.x,uv.y)>1.)return -7.;
  vec2 grid=clamp(uv,0.,.999999)*${(HEIGHT_SIZE-1).toFixed(1)},cell=floor(grid),f=fract(grid);
  float h00=bedSample(cell),h10=bedSample(cell+vec2(1.,0.)),h01=bedSample(cell+vec2(0.,1.)),h11=bedSample(cell+vec2(1.));
  return f.x+f.y<=1.?h00+(h10-h00)*f.x+(h01-h00)*f.y:h11+(h01-h11)*(1.-f.x)+(h10-h11)*(1.-f.y);
 }
 void main(){
  vec2 p=vWorld.xz;
  float depth=${WATER_LEVEL}-bedHeight(p);if(depth<=.002)discard;
  float a=dot(p,vec2(.52,.23))-storyTime*.41;
  float b=dot(p,vec2(-.27,.91))+storyTime*.29;
  float c=dot(p,vec2(2.31,1.67))-storyTime*.63;
  float d=dot(p,vec2(-4.71,3.26))+storyTime*.49;
  vec2 slope=.044*cos(a)*vec2(.52,.23)+.028*cos(b)*vec2(-.27,.91)+.007*cos(c)*vec2(2.31,1.67)+.0025*cos(d)*vec2(-4.71,3.26);
  for(int i=0;i<${MAX_RIPPLES};i++){
   if(i>=rippleCount)break;
   vec2 delta=p-ripples[i].xy;float distanceToCenter=length(delta),age=ripples[i].z;
   float front=distanceToCenter-age*2.5,width=.30+age*.13;
   float envelope=exp(-pow(front/width,2.))*exp(-age*.68)*smoothstep(.02,.18,age)*ripples[i].w;
   float derivative=(11.*cos(front*11.)-2.*front/(width*width)*sin(front*11.))*envelope*.035;
   slope+=delta/max(.001,distanceToCenter)*derivative;
  }
  vec3 normal=normalize(vec3(-slope.x,1.,-slope.y)),view=normalize(cameraPosition-vWorld);
  float facing=max(0.,dot(normal,view));
  float fresnel=.12+.76*pow(1.-facing,4.);
  vec2 uv=clamp(vReflection.xy/max(.001,vReflection.w)+slope*.034,vec2(.003),vec2(.997));
  vec2 blur=vec2(1./${REFLECTION_SIZE.toFixed(1)})*(1.+1.8*fresnel);
  vec3 reflection=texture2D(tDiffuse,uv).rgb*.4;
  reflection+=(texture2D(tDiffuse,uv+vec2(blur.x,0.)).rgb+texture2D(tDiffuse,uv-vec2(blur.x,0.)).rgb+texture2D(tDiffuse,uv+vec2(0.,blur.y)).rgb+texture2D(tDiffuse,uv-vec2(0.,blur.y)).rgb)*.15;
  vec3 deep=vec3(.027,.046,.078),shallow=vec3(.070,.125,.158);
  vec3 body=mix(deep,shallow,exp(-depth*.65));
  body+=vec3(.013,.007,.012)*arrival;
  // A rough water surface also gathers the broad sky. Its changing reflection
  // angle makes a wave readable even where the planar image contains dark land.
  vec3 skyDirection=reflect(-view,normal);
  float horizonLight=pow(1.-clamp(abs(skyDirection.y),0.,1.),3.);
  reflection+=mix(vec3(.026,.035,.065),vec3(.14,.18,.24),horizonLight)*.34;
  vec3 color=mix(body,reflection*.86,fresnel);
  float facet=dot(normal,normalize(vec3(-.8,.2,-.5)));
  color*=clamp(.72+.75*(facet+.3),.55,1.4);
  float shimmer=pow(max(0.,dot(reflect(-normalize(vec3(-.7,.35,.6)),normal),view)),115.);
  color+=vec3(.16,.13,.11)*shimmer;
  float grazing=pow(max(0.,dot(reflect(-normalize(vec3(-.4,.32,-.85)),normal),view)),36.);
  color+=vec3(.25,.24,.25)*grazing*.12;
  // Wet shore and small wave highlights are reflected light, never emissive rings.
  float wet=exp(-depth*6.)*(.55+.45*sin(p.x*3.1+p.y*1.8+sin(p.y*5.)));
  color+=vec3(.010,.017,.019)*wet;
  float distanceToCamera=length(cameraPosition-vWorld);
  float fog=1.-exp(-fogDensity*fogDensity*distanceToCamera*distanceToCamera);
  color=mix(color,fogColor,fog);
  float alpha=smoothstep(.002,.12,depth)*(.86+.12*fresnel)*(1.-smoothstep(700.,2400.,distanceToCamera));
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`
};

export function createJourneyWater(scene,{heightAt=()=>-7,terrain=null}={}){
 const heightTexture=makeHeightTexture(heightAt);
 const water=new Reflector(new THREE.PlaneGeometry(6000,6000),{textureWidth:REFLECTION_SIZE,textureHeight:REFLECTION_SIZE,multisample:0,clipBias:.003,shader});
 water.name='Mineral lake · reflected water';water.rotation.x=-Math.PI/2;water.position.y=WATER_LEVEL;water.renderOrder=-10;
 water.material.transparent=true;water.material.depthWrite=false;water.material.uniforms.heightMap.value=heightTexture;scene.add(water);
 const uniforms=water.material.uniforms,raycaster=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-WATER_LEVEL),hitPoint=new THREE.Vector3(),samplePoint=new THREE.Vector3();
 let camera=null,pointer=null,hit=null,interaction=createWaterInteraction(),occluders=[],checkAge=1,epoch=0,lastReflectedEpoch=-1,reflectionBusy=false,reflectionCount=0,reflectionDirty=true,lastReflectedClock=-1,storyTime=NaN;
 let lastView=new THREE.Matrix4(),lastProjection=new THREE.Matrix4(),pointerChecks=0,blockedBy=null;
 const proxyCache=new WeakMap();

 const originalReflect=water.onBeforeRender;
 water.onBeforeRender=function(renderer,renderScene,renderCamera,...args){
  if(reflectionBusy||renderCamera!==camera||lastReflectedEpoch===epoch||!reflectionDirty)return;
  // Updating at most 30 Hz bounds the extra scene render; a paused story reuses
  // its reflection while real-time hover waves continue disturbing that texture.
  if(interaction.clock>0&&lastReflectedClock>=0&&interaction.clock-lastReflectedClock<1/30)return;
  reflectionBusy=true;lastReflectedEpoch=epoch;
  try{originalReflect.call(this,renderer,renderScene,renderCamera,...args);reflectionCount++;reflectionDirty=false;lastReflectedClock=interaction.clock;}
  finally{reflectionBusy=false;}
 };

 function update(state,nextCamera){
  const time=Number.isFinite(state?.time)?state.time:0;camera=nextCamera;
  if(time!==storyTime||!lastView.equals(camera.matrixWorld)||!lastProjection.equals(camera.projectionMatrix)){
   epoch++;reflectionDirty=true;storyTime=time;lastView.copy(camera.matrixWorld);lastProjection.copy(camera.projectionMatrix);
  }
  uniforms.storyTime.value=time;uniforms.arrival.value=state?.environment?.arrival??0;
  if(scene.fog){uniforms.fogColor.value.copy(scene.fog.color);uniforms.fogDensity.value=scene.fog.density??.01;}
 }
 function isVisible(object){for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;}
 function actorBlocks(distance){
  for(const root of occluders){
   if(!root?.isObject3D||root===terrain||!isVisible(root))continue;
   let blocked=false;
   root.traverseVisible(mesh=>{
    if(blocked||!mesh.isMesh||!mesh.geometry?.attributes.position)return;
    let proxy=proxyCache.get(mesh);
    if(!proxy){proxy={box:new THREE.Box3(),indices:[]};const count=mesh.geometry.attributes.position.count;for(let i=0;i<96;i++)proxy.indices.push(Math.min(count-1,Math.floor(i*(count-1)/95)));proxyCache.set(mesh,proxy);}
    proxy.box.makeEmpty();for(const index of proxy.indices){mesh.getVertexPosition(index,samplePoint);mesh.localToWorld(samplePoint);proxy.box.expandByPoint(samplePoint);}
    // Sampled current-morph bounds avoid raycasting millions of triangles.
    // This is an interaction approximation: thin tips can fall outside the proxy,
    // and empty areas inside a branch's box can be treated as occluded.
    proxy.box.expandByScalar(.12);
    const intersection=raycaster.ray.intersectBox(proxy.box,samplePoint);
    if(intersection&&intersection.distanceTo(raycaster.ray.origin)<distance-.08)blocked=true;
   });
   if(blocked)return true;
  }
  return false;
 }
 function findWaterHit(){
  pointerChecks++;blockedBy=null;
  if(!pointer||!camera)return null;
  raycaster.setFromCamera(pointer,camera);
  if(!raycaster.ray.intersectPlane(plane,hitPoint))return null;
  const distance=raycaster.ray.origin.distanceTo(hitPoint);
  if(distance>450||heightAt(hitPoint.x,hitPoint.z)>=WATER_LEVEL-.025){blockedBy='land';return null;}
  // Height-field marching is much cheaper than testing a 131k-triangle terrain.
  const steps=Math.min(96,Math.max(16,Math.ceil(distance/3)));
  for(let i=1;i<steps;i++){
   raycaster.ray.at(distance*i/steps,samplePoint);
   if(samplePoint.y<heightAt(samplePoint.x,samplePoint.z)-.015){blockedBy='terrain';return null;}
  }
  if(actorBlocks(distance)){blockedBy='subject';return null;}
  return {x:hitPoint.x,z:hitPoint.z};
 }
 function tick(dt,reduced=false){
  const elapsed=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));epoch++;checkAge+=elapsed;
  if(reduced){pointer=null;hit=null;interaction=advanceWaterInteraction(interaction,elapsed,null,true);}
  else{
   if(!pointer)hit=null;
   else if(checkAge>=.1){checkAge=0;hit=findWaterHit();}
   interaction=advanceWaterInteraction(interaction,elapsed,hit,false);
  }
  uniforms.rippleCount.value=interaction.ripples.length;
  interaction.ripples.forEach((r,i)=>uniforms.ripples.value[i].set(r.x,r.z,interaction.clock-r.born,r.strength));
 }
 function setPointer(ndc){
  const x=Array.isArray(ndc)?ndc[0]:ndc?.x,y=Array.isArray(ndc)?ndc[1]:ndc?.y;
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1||Math.abs(y)>1){pointer=null;hit=null;return;}
  pointer=new THREE.Vector2(x,y);
 }
 function setOccluders(objects){occluders=(Array.isArray(objects)?objects:[]).filter(Boolean);checkAge=1;}
 function clearInteraction(){pointer=null;hit=null;interaction=clearWaterInteraction(interaction);uniforms.rippleCount.value=0;checkAge=1;}
 function report(){return {waterLevel:WATER_LEVEL,reflectionResolution:REFLECTION_SIZE,reflectionCount,storyTime,interactionTime:interaction.clock,ripples:interaction.ripples.length,pointerActive:!!pointer,waterHit:hit?{...hit}:null,blockedBy,pointerChecks,occlusion:'height-field and sampled current-morph bounds (approximate)'};}
 function dispose(){scene.remove(water);water.geometry.dispose();water.dispose();heightTexture.dispose();}
 return {water,update,tick,setPointer,setOccluders,clearInteraction,report,dispose};
}
