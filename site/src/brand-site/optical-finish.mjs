import * as T from 'three';
/** Renderer-local finish: keep the original geometry, hinges and material ownership. */
export function createOpticalFinish(environment){
 const time={value:0},texture=new T.TextureLoader().load('/assets/brand/optical-v001/energy-cloud.png');
 texture.name='PHASE_flowing_energy_cloud';texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.colorSpace=T.NoColorSpace;
 let surfaces=[],cores=[];
 function attach(leaf){
  const seen=new Set();leaf.group.traverse(o=>{if(!o.isMesh||seen.has(o.material))return;const m=o.material;seen.add(m);
   if(m.name==='LEAF_BlueViolet_Optical'){
    m.envMap=environment;m.envMapIntensity=1.35;m.metalness=.6;m.roughness=.18;m.transmission=.28;m.thickness=.11;m.color.set('#68769a');m.clearcoat=.8;m.clearcoatRoughness=.09;
    const before=m.onBeforeCompile;m.onBeforeCompile=shader=>{before.call(m,shader);shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
     float rimFresnel = pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),5.0);
     outgoingLight += vec3(0.35,0.53,0.85) * rimFresnel * 0.85;
     #include <opaque_fragment>`);};m.customProgramCacheKey=()=> 'phase-optical-fresnel-v001';m.needsUpdate=true;surfaces.push(m);
   }else if(m.name==='LEAF_Amber_Light'){
    m.color.set('#352019');m.roughness=.26;m.emissive.set('#ffc075');m.emissiveIntensity=4.2;m.emissiveMap=texture;
    const before=m.onBeforeCompile;m.onBeforeCompile=shader=>{before.call(m,shader);shader.uniforms.uPhaseFlow=time;shader.fragmentShader='uniform float uPhaseFlow;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`
     #ifdef USE_EMISSIVEMAP
      vec2 energyUV=vEmissiveMapUv;
      float cloudA=texture2D(emissiveMap,vec2(energyUV.x*1.3+sin(energyUV.y*8.0-uPhaseFlow*.5)*.12,energyUV.y*2.0-uPhaseFlow*.11)).r;
      float cloudB=texture2D(emissiveMap,vec2(energyUV.x*2.0+.37,energyUV.y*3.0+uPhaseFlow*.06)).r;
      float mist=pow(smoothstep(.25,.72,mix(cloudA,cloudB,.35)),1.2);
      float center=pow(max(0.0,1.0-abs(energyUV.x-.5)*2.0),1.8);
      totalEmissiveRadiance *= mix(vec3(.25,.07,.015),vec3(1.0,.85,.6),mist) * (.10+mist*.4+center*mist*mist*3.2);
     #endif`);};m.customProgramCacheKey=()=> 'phase-flow-emission-v001';m.needsUpdate=true;cores.push(m);
   }else if(m.name==='LEAF_Optical_Edge'){m.envMap=environment;m.color.set('#7989af');m.roughness=.16;m.envMapIntensity=1.1;m.needsUpdate=true;}
  });
 }
 return {attach,tick(dt){time.value+=dt;},clear(){surfaces=[];cores=[];},report(){return {surfaces:surfaces.map(m=>({metalness:m.metalness,envMap:!!m.envMap,transmission:m.transmission,fresnel:true})),energy:{map:!!texture.image,flowTime:time.value,cores:cores.length}};},dispose(){texture.dispose();}};
}
