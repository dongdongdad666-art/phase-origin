import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {sampleRift,RiftShader} from './cinematic-rift.mjs';
import {PHASE_MINERAL_PROFILES} from './phase-mineral.mjs';
import {createTreeReflection} from './tree-crystal.mjs';
import {applyPhaseCrystal,loadPhaseCrystalTextures} from './phase-crystal.mjs';
import {createMaterialStudio} from './material-studio.js';
import {SUBJECTS,sampleStudy,sampleCamera,ease} from './cinematic-timeline.mjs';
import {createJourneyEnvironment,addJourneyReveal} from './journey-environment.js';
import {MineralRefractionPass} from './journey-refraction-pass.js';
import {createJourneyOptics} from './journey-optics.js';
import {orientCrossingCamera} from './journey-crossing.mjs';

export async function createCinematicWorld(canvas,onProgress=()=>{},options={}){
 const started=performance.now(),startup={};
 const subjects=options.subjects??SUBJECTS,sample=options.sample??sampleStudy,full=!!options.full;
 const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
 renderer.info.autoReset=false;
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.transmissionResolutionScale=.65;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.08,full?2500:240);
 const studio=createMaterialStudio(renderer,scene);studio.set('mineral',{warmStrength:0});
 scene.fog=new THREE.FogExp2(new THREE.Color(.07,.045,.125),.016);
 const skyPhase={value:0},skyArrival={value:0},skyTime={value:0},skyDetail={value:full?1:0};
 const sky=new THREE.Mesh(new THREE.SphereGeometry(full?1200:150,32,20),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{skyPhase,skyArrival,skyTime,skyDetail,skyFog:{value:scene.fog.color}},vertexShader:'varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
 varying vec3 ray;uniform float skyPhase,skyArrival,skyTime,skyDetail;uniform vec3 skyFog;
 float cloud(vec3 p){return sin(p.x*1.3+sin(p.z*1.4))*sin(p.z*.7+sin(p.y*.9))*.5+.5;}
 void main(){
  vec3 d=normalize(ray);float horizon=exp(-abs(d.y+.03)*7.);
  vec3 color=mix(vec3(.025,.023,.065),vec3(.075,.05,.135),horizon);
  float glow=pow(max(0.,dot(d,normalize(vec3(-.6,.12,-1.)))),22.);
  color+=vec3(.06,.035,.07)*glow;
  color+=skyPhase*vec3(.016,.032,.05)*horizon+skyArrival*vec3(.10,.042,.06)*pow(max(0.,1.-abs(d.y)),3.);
  vec3 drift=vec3(skyTime*.003,0.,-skyTime*.0015);
  float wisps=cloud(d*7.+drift)*.65+cloud(d*16.-drift)*.25;
  float veil=smoothstep(.48,.86,wisps)*exp(-pow((d.y-.13)*4.5,2.));
  color+=skyDetail*veil*mix(vec3(.022,.018,.035),vec3(.026,.045,.052),skyPhase);
  float seam=exp(-pow((d.y-.025-sin(d.x*9.+skyTime*.006)*.009)*35.,2.));
  color+=skyDetail*seam*vec3(.045,.018,.025)*(.35+.65*skyArrival);
  color=mix(color,skyFog,skyDetail*(1.-smoothstep(-.01,.16,d.y))*(1.-skyArrival));
  // The valley's optical field continues into a quiet polar curtain overhead.
  // Direction is world-space; the aurora cannot stick to the lens during a turn.
  float az=atan(d.x,-d.z),el=asin(clamp(d.y,-1.,1.));
  float curtain=0.,edgeLight=0.;
  for(int i=0;i<3;i++){
   float k=float(i),base=.20+k*.16+.14*sin(az*2.3+k*1.8+skyTime*.009)+.035*sin(az*8.-k);
   float above=el-base;
   float strands=cloud(vec3(az*106.,above*1.4,skyTime*.008+k))*cloud(vec3(az*73.,above*3.1,k+3.));
   float locality=exp(-pow((az+.5-k*.5)*1.5,2.));
   float sheet=smoothstep(-.035,.025,above)*exp(-max(0.,above)*(6.+k))*locality;
   curtain+=sheet*(.12+strands*.66);
   edgeLight+=exp(-pow(above*65.,2.))*locality*.18;
  }
  float skyReveal=skyDetail*smoothstep(.0,.82,skyArrival);
  color*=1.-skyReveal*.38;
  color+=skyReveal*(curtain*vec3(.07,.065,.18)+edgeLight*vec3(.13,.25,.32));
  float nebula=exp(-pow((az+.05)*1.1,2.)-pow((el-.5)*2.,2.));
  color+=skyReveal*nebula*vec3(.025,.009,.035);
  gl_FragColor=vec4(color,1.);
 }` }));scene.add(sky);
 const groundMaterial=new THREE.MeshStandardMaterial({color:0x28283e,roughness:.32,metalness:.3});
 groundMaterial.onBeforeCompile=s=>{s.vertexShader='varying vec3 wpos;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nwpos=(modelMatrix*vec4(transformed,1.)).xyz;');s.fragmentShader='varying vec3 wpos;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nfloat wave=sin(wpos.x*1.4+wpos.z*.35)*.032+sin(wpos.z*2.1-wpos.x*.13)*.018;normal=normalize(normal+vec3(wave,0.,wave*.4));');};
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(280,280),groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-2;scene.add(ground);
 const rockMat=new THREE.MeshStandardMaterial({color:0x222237,roughness:.78,metalness:.13});
 for(let i=0;i<(full?0:33);i++){
  const a=i*2.3999,r=25+(i%7)*7,rock=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),rockMat);
  rock.position.set(Math.cos(a)*r+8,-1.4,-38-Math.abs(Math.sin(a)*r));rock.scale.set(2+(i%3)*2,2+(i%4)*2,2+(i%5));rock.rotation.set(i*.3,i*1.7,.15);scene.add(rock);
 }
 const environment=full?createJourneyEnvironment(scene):null;
 if(full)ground.visible=false;
 const rail=await fetch(options.railUrl??'/assets/cinematic-study/v001/camera.json').then(r=>{if(!r.ok)throw Error('镜头数据未载入');return r.json();});onProgress('镜头已载入',.06);
 const veilMaterial=new THREE.MeshStandardMaterial({color:0x34334d,metalness:.38,roughness:.38});
 veilMaterial.onBeforeCompile=s=>{s.vertexShader='varying vec3 veilRest;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nveilRest=position;');s.fragmentShader='varying vec3 veilRest;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat strata=sin(veilRest.x*15.+sin(veilRest.y*.5)*2.)*.16+sin(veilRest.x*43.+veilRest.y*.8)*.04;diffuseColor.rgb*=.85+strata;');};
 // Only the ark→capsule handoff uses a physical foreground wipe.
 const veils=rail.veils.slice(0,1).map((v,index)=>{
  const shape=new THREE.Shape();shape.moveTo(-.5,-8);shape.bezierCurveTo(-3,-6,-5,-2,-3.5,2);shape.bezierCurveTo(-2,5,1,7,3,8);shape.bezierCurveTo(1.8,5,5,2,4.2,-1);shape.bezierCurveTo(3,-4,1,-6,-.5,-8);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:true,bevelSize:.08,bevelThickness:.06,bevelSegments:3,curveSegments:24,steps:1}),position=geometry.attributes.position;
  for(let i=0;i<position.count;i++){const x=position.getX(i),y=position.getY(i);position.setZ(i,position.getZ(i)+x*x*.028+Math.sin(y*.3)*.12);}geometry.computeVertexNormals();
  const m=new THREE.Mesh(geometry,veilMaterial);m.position.fromArray(v.position);m.quaternion.fromArray(v.quaternion);m.scale.set(.38,.45,1);m.name='Mineral veil '+(index+1);scene.add(m);return m;
 });
 // The six narrative forms share the approved opaque crystal language.
 // Reflection remains material-local; environment and camera are unchanged.
 const crystalTextures=await loadPhaseCrystalTextures();onProgress('材质已载入',.18);
 const crystalReflection=createTreeReflection(renderer);
 environment?.evolution.setCrystalLook(crystalTextures,crystalReflection.texture);
 const models={};let loaded=0;
 await Promise.all(Object.entries(subjects).map(async([key,config])=>{
  const gltf=await new GLTFLoader().loadAsync(`/assets/models/${config.version}/${key}.glb`);
  const root=gltf.scene;
  const oldMaterials=new Set(),oldTextures=new Set();root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){oldMaterials.add(m);for(const v of Object.values(m))if(v?.isTexture)oldTextures.add(v);}});
  const crystalLook=applyPhaseCrystal(root,key,crystalTextures,{envMap:crystalReflection.texture,highlightCeiling:1.0});
  oldMaterials.forEach(m=>m.dispose());oldTextures.forEach(t=>t.dispose());
  root.scale.setScalar(config.scale);root.position.fromArray(config.position);root.rotation.y=config.rotation;scene.add(root);
  const clip=gltf.animations[0],mixer=clip?new THREE.AnimationMixer(root):null,action=clip?mixer.clipAction(clip):null;if(action){action.play();action.paused=true;}
  const center=PHASE_MINERAL_PROFILES[key]?.center||[-.0121,.0956,-.0217];const light=new THREE.PointLight(0xff713b,5*(PHASE_MINERAL_PROFILES[key]?.warmStrength??1),10,2);light.position.fromArray(center).multiplyScalar(config.scale).applyAxisAngle(new THREE.Vector3(0,1,0),config.rotation).add(root.position);scene.add(light);
  const reveal=full?addJourneyReveal(root):null;
  models[key]={root,mixer,action,duration:clip?.duration??0,light,baseLight:light.intensity,reveal,crystalLook};onProgress(`主体 ${++loaded}/${Object.keys(subjects).length} 已载入 · 准备暗晶着色`,.18+.52*loaded/Object.keys(subjects).length);
 }));
 if(full)environment.setOccluders([...Object.values(models).map(m=>m.root),...veils]);
 startup.assetsMs=performance.now()-started;
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:2}),composer=new EffectComposer(renderer,target),scenePass=new RenderPass(scene,camera);
 composer.addPass(scenePass);
 const refractionPass=full?new MineralRefractionPass(scene,camera,models,subjects,rail):null;
 if(refractionPass)composer.addPass(refractionPass);
 composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1),.27,.6,1.15));const riftPass=new ShaderPass(RiftShader);composer.addPass(riftPass);composer.addPass(new OutputPass());
 const optics=full?createJourneyOptics(canvas):null;if(optics)composer.addPass(optics.pass);
 let width=1,height=1,current=sample(0);
 function resize(){width=canvas.clientWidth;height=canvas.clientHeight;renderer.setSize(width,height,false);composer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();
  optics?.resize(width,height,renderer.getPixelRatio());
  const anchorCamera=new THREE.PerspectiveCamera(width<701?72:42,width/height,.08,240),f=sampleCamera(rail,16.85);anchorCamera.position.fromArray(f.position);anchorCamera.quaternion.fromArray(f.quaternion);anchorCamera.updateMatrixWorld(true);
  const config=SUBJECTS.capsule,seed=new THREE.Vector3().fromArray(PHASE_MINERAL_PROFILES.capsule.center).multiplyScalar(config.scale).applyAxisAngle(new THREE.Vector3(0,1,0),config.rotation).add(new THREE.Vector3().fromArray(config.position)).project(anchorCamera);
  riftPass.uniforms.center.value=[THREE.MathUtils.clamp(seed.x*.5+.5,.15,.85),THREE.MathUtils.clamp(seed.y*.5+.5,.15,.85)];riftPass.uniforms.aspect.value=width/height;
 }
 function setFrame(time,reduced=false){
  current=sample(time);const baseFrame=sampleCamera(rail,time),frame=full?orientCrossingCamera(baseFrame,time):baseFrame;camera.position.fromArray(frame.position);camera.quaternion.fromArray(frame.quaternion);camera.fov=frame.fov;
  // Wider vertical lens on narrow screens keeps near occlusion and perspective intact.
  if(width<701){camera.fov=72;if(full){const wide=Math.min(106,THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(frame.fov*.5))*Math.max(1,1.1/camera.aspect))));camera.fov=THREE.MathUtils.lerp(72,wide,ease(28,40,time));}}
  camera.updateProjectionMatrix();
  // The first handoff's foreground veil must not linger as an unexplained rock
  // in later valley views. The earlier standalone study keeps its own staging.
  if(full)for(const veil of veils)veil.visible=time<11.5;
  const rift=sampleRift(time);riftPass.enabled=!full&&rift.active;for(const key of ['cover','reveal','charge','filament'])riftPass.uniforms[key].value=rift[key];riftPass.uniforms.reduced.value=reduced?1:0;
  if(refractionPass){refractionPass.update(time,reduced);scenePass.enabled=!refractionPass.enabled;}
  for(const [key,m] of Object.entries(models)){const state=current.actors[key];m.root.visible=state.visible;m.light.visible=state.visible;m.light.intensity=m.baseLight*(state.role==='detail'?.3:1)*(1+(key==='capsule'&&!reduced&&!full?rift.charge:0));if(m.action){m.action.time=state.deployment*m.duration;m.action.enabled=true;m.action.paused=true;m.mixer.update(0);}
   m.crystalLook.uniforms.time.value=time;m.crystalLook.uniforms.breathing.value=reduced?0:1;
   if(full){m.root.position.fromArray(state.position);m.root.scale.setScalar(state.scale);m.root.rotation.y=state.rotation;m.reveal.value=state.reveal;
    const center=PHASE_MINERAL_PROFILES[key]?.center||[-.0121,.0956,-.0217];m.light.position.fromArray(center).multiplyScalar(state.scale).applyAxisAngle(new THREE.Vector3(0,1,0),state.rotation).add(m.root.position);m.light.distance=Math.max(10,state.scale*1.4);
   }m.root.updateMatrixWorld(true);}
  camera.updateMatrixWorld(true);
  if(full){environment.update(current,camera);skyPhase.value=current.environment.altitude;skyArrival.value=current.environment.arrival;skyTime.value=time;}
 }
 function render(time,reduced=false,dt=0){setFrame(time,reduced);environment?.tick(dt,reduced);optics?.update(dt,reduced);renderer.info.reset();composer.render();}
 function report(){return {time:current.time,subject:current.subject,startup,physicalVeils:veils.length,rift:full?{active:false}:sampleRift(current.time),refraction:refractionPass?.report(),visible:Object.entries(models).filter(([,m])=>m.root.visible).map(([k])=>k),actors:current.actors,environment:current.environment,atmosphere:environment?.report(),camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray()},drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,morphs:Object.fromEntries(Object.entries(models).map(([k,m])=>{const w=[];m.root.traverse(o=>{if(o.morphTargetInfluences)w.push([...o.morphTargetInfluences]);});return[k,w];})),gpu:renderer.getContext().getParameter(renderer.getContext().RENDERER)};}
 resize();
 // Compile actual HDR, transmission and morph variants before showing the scene.
 const warmTimes=full?[0,6,9.4,12,17.5,18.2,23,34.5,42,54,62,68.5,73,81,96]:[0,6,9.4,12,16.8,17.5,18.2,18.7,23,28];
 if(full)onProgress('首次预热完整矿物光照与形变，请稍候',.7);
 for(const [index,t] of warmTimes.entries()){setFrame(t);if(index===0||!full)await renderer.compileAsync(scene,camera);composer.render();if(full)onProgress(`准备光照与转场 ${index+1}/${warmTimes.length}`,.7+.29*(index+1)/warmTimes.length);await new Promise(requestAnimationFrame);}
 startup.readyMs=performance.now()-started;
 function transitionCoverage(time){const saved=current.time;setFrame(time);scene.updateMatrixWorld(true);const ray=new THREE.Raycaster();let hits=0,total=0;for(let y=-.95;y<=.96;y+=.19)for(let x=-.95;x<=.96;x+=.19){ray.setFromCamera(new THREE.Vector2(x,y),camera);if(ray.intersectObjects(veils,false).length)hits++;total++;}setFrame(saved);return {time,hits,total,ratio:hits/total};}
 render(0);return {render,resize,report,transitionCoverage,renderer,scene,camera,models,veils,rail,environment,optics};
}
