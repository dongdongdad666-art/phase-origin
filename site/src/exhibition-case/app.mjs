import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createLeaf} from '../leaf-lab/model.mjs';
import {attachFinish as finishLeaf} from '../leaf-lab/finish.mjs';
import {createCore} from '../core-lab/model.mjs';
import {attachFinish as finishCore} from '../core-lab/finish.mjs';
import {createSystem,sampleLeaf,areas,areaKeys,nodes,presets,presetNames,cameraRoute} from './case-system.mjs';
import {buildGallery} from './architecture.mjs';
import {tuneOpticalLeaf} from './atmosphere.mjs';
import {createFloorReflection} from './finish-details.mjs';
import {createTour,dwellSeconds,tourStops,cameraEase} from './tour.mjs';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),system=createSystem({reduced:reduced.matches}),state=system.state;
const stage=$('.stage'),canvas=$('#space'),mini=$('#controller');
const renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.2));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color('#070b17');scene.fog=new T.Fog('#070b17',65,145);
const camera=new T.PerspectiveCamera(62,1,.1,150),controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.075;controls.maxPolarAngle=Math.PI*.485;controls.minDistance=2.5;controls.maxDistance=100;
const env=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),envTarget=pmrem.fromScene(env,.04);scene.environment=envTarget.texture;scene.environmentIntensity=.55;env.dispose();pmrem.dispose();
scene.add(new T.HemisphereLight('#c9c8f5','#343041',.5));const key=new T.DirectionalLight('#ead7c8',.7);key.position.set(-8,5.8,10);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-27,right:27,top:27,bottom:-27,near:.1,far:65});key.shadow.normalBias=.04;scene.add(key);const rim=new T.DirectionalLight('#a2acff',1.1);rim.position.set(8,8,-9);scene.add(rim);
const composer=new EffectComposer(renderer,new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:4}));composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new T.Vector2(1,1),.24,.5,1.15);composer.addPass(bloom);composer.addPass(new OutputPass());
const matte=new T.MeshStandardMaterial({color:'#1c2030',roughness:.82,metalness:.12}),metal=new T.MeshStandardMaterial({color:'#35374b',roughness:.35,metalness:.75});
function box(w,h,d,mat,pos,parent=scene){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.fromArray(pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const gallery=buildGallery(scene),floorReflection=createFloorReflection(scene),tour=createTour();
for(const x of [-12.8,15]){const wash=new T.SpotLight('#ffcc96',85,15,.65,.8,2);wash.position.set(x,7,-10);wash.target.position.set(x,3.5,-16);scene.add(wash,wash.target);}

// Three static exhibition pools retain readable art while the product light stays dynamic.
for(const [x,z,power] of [[-8,6,55],[1,-3,100],[14,-8,65]]){const spot=new T.SpotLight('#b5c6ff',power,24,Math.PI*.29,.85,2);spot.position.set(x,7.85,z+1);spot.target.position.set(x,0,z);scene.add(spot,spot.target);}

function line(points,color,opacity=1){const geom=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));const m=new T.Line(geom,new T.LineBasicMaterial({color,transparent:true,opacity}));scene.add(m);return m;}
function label(text,color='#c0c0d9',width=2.4){const c=document.createElement('canvas');c.width=384;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.font='22px sans-serif';ctx.textAlign='center';ctx.fillText(text,192,41);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const sprite=new T.Sprite(new T.SpriteMaterial({map,transparent:true,depthWrite:false}));sprite.scale.set(width,width/6,1);return sprite;}
const glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=128;const gx=glowCanvas.getContext('2d'),gradient=gx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(255,255,255,.8)');gradient.addColorStop(.4,'rgba(255,255,255,.35)');gradient.addColorStop(1,'rgba(255,255,255,0)');gx.fillStyle=gradient;gx.fillRect(0,0,128,128);const glowMap=new T.CanvasTexture(glowCanvas);
const leaves=[],rings=[],labels=[];
for(let i=0;i<nodes.length;i++){
 const leaf=tuneOpticalLeaf(finishLeaf(createLeaf()),scene.environment);leaf.group.name='ARRAY_LEAF_'+(i+1);leaf.group.userData.arrayIndex=i;leaf.group.traverse(o=>{if(o.isPointLight)o.visible=false;if(o.isMesh)o.castShadow=false;});scene.add(leaf.group);leaves.push(leaf);
 const ring=new T.Mesh(new T.PlaneGeometry(4.2,5.4),new T.MeshBasicMaterial({map:glowMap,color:'#f2b27a',transparent:true,blending:T.AdditiveBlending,opacity:.12,depthWrite:false,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-.045;scene.add(ring);rings.push(ring);
 const tag=label('ABC'[nodes[i].group]+' · '+String(i+1).padStart(2,'0'));scene.add(tag);labels.push(tag);
 const base=box(.95,.08,.8,metal,[0,.015,0],leaf.group);base.name='ARRAY_Flush_Dock';
}
const core=finishCore(createCore());const coreScene=new T.Scene();coreScene.background=new T.Color('#10121f');coreScene.environment=envTarget.texture;coreScene.environmentIntensity=.65;coreScene.add(core.group);coreScene.add(new T.HemisphereLight('#c9cdfb','#53505b',1.3));const ck=new T.DirectionalLight('#ffe0c0',2);ck.position.set(2,6,4);coreScene.add(ck);
const coreRenderer=new T.WebGLRenderer({canvas:mini,antialias:true,preserveDrawingBuffer:true});coreRenderer.setPixelRatio(Math.min(devicePixelRatio,1.25));coreRenderer.toneMapping=T.ACESFilmicToneMapping;coreRenderer.toneMappingExposure=1.2;const miniEnv=new RoomEnvironment(),miniPmrem=new T.PMREMGenerator(coreRenderer),miniEnvTarget=miniPmrem.fromScene(miniEnv,.04);coreScene.environment=miniEnvTarget.texture;miniEnv.dispose();miniPmrem.dispose();
const coreCamera=new T.PerspectiveCamera(35,1,.05,50);coreCamera.position.set(.6,4.5,5.8);coreCamera.lookAt(0,.55,0);
const coreInSpace=core.group.clone(true);coreInSpace.name='CORE_System_Replica';coreInSpace.scale.setScalar(.14);coreInSpace.position.set(-15,1.58,12);scene.add(coreInSpace);const coreTag=label('CORE / 轴台','#e2bea2',2.7);coreTag.position.set(-15,2.5,12);scene.add(coreTag);
const links=[],feeds=[];
for(let g=0;g<3;g++){const list=nodes.filter(n=>n.group===g);links.push(line([[-15,.02,12],[-18,.02,12],[-18,.02,-14-g*.2],...list.map(n=>[n.x,.02,n.z])],'#777cba',.65));feeds.push(line([[-19,.02,-13],[-19,.02,-14.15-g*.2],...list.map(n=>[n.x+.12,.02,n.z])],'#616677',.5));} [...links,...feeds].forEach(l=>l.visible=false);
const zoneLights=[[ -8,2.5,6],[1,3,-3],[14,3.2,-8]].map(p=>{const l=new T.PointLight('#e6ad7f',0,13,2);l.position.fromArray(p);scene.add(l);return l;});
const meters=$('#leaf-meter');for(let i=0;i<nodes.length;i++){const el=document.createElement('i');el.innerHTML='<b></b>';el.title='光叶 '+(i+1);meters.append(el);}const bars=[...meters.children];
let currentNodes=nodes,view='overview',viewTween=null,miniDirty=true,last=performance.now(),meterTime=0,disposed=false;const pressUntil=[0,0,0];
function applyLayout(){nodes.forEach((n,i)=>{leaves[i].group.position.set(n.x,n.y,n.z);leaves[i].group.rotation.y=n.yaw;rings[i].position.set(n.x,-.035,n.z);labels[i].position.set(n.x,4.55+n.y,n.z);});}
function levelValue(){return state.group<0?Math.round(state.levels.reduce((a,b)=>a+b,0)/3):state.levels[state.group];}
function sync(){
 coreTag.visible=$('#connections').checked;const copy=areas[state.area];$('#en').textContent=copy.en;$('#title').textContent=copy.title;$('#description').textContent=copy.text;$('#rhythm').textContent=state.area==='overview'?'固定布置 · 三分区同时运行':'分区 '+['A / 入口导向','B / 中央围合','C / 后场氛围'][copy.group];$('#scene-value').textContent=presetNames[state.preset];
 $$('[data-area]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.area===state.area));$$('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.scene===state.preset));$$('[data-group]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.group===state.group));
 $('#preset-copy').textContent={welcome:'入口更明亮，中央与后场保持柔和，引导入场。',exhibit:'主展区成为重点，入口与后场保持连续的光场。',quiet:'降低入口亮度，把注意力留给后场的缓慢呼吸。'}[state.preset];
 $('#selection').textContent=state.group<0?'全场光叶':(['A 入口 · 6 光叶','B 主展 · 8 光叶','C 后场 · 6 光叶'][state.group]);$('#level').value=levelValue();$('#level-value').value=levelValue()+'%';
 $('#mixed').textContent=state.group<0?(new Set(state.levels).size>1?'各区不同；显示均值，拖动将统一设置':'调整全场分区亮度，不移动装置'):('仅调整 '+ 'ABC'[state.group]+' 区，其他区保持');
 $('#hold').innerHTML=(state.running?'暂停':'继续')+'<small>HOLD</small>';$('#hold').setAttribute('aria-pressed',!state.running);$('#run-status').textContent=state.running?'动态运行':'动态已暂停';
 ['a','b','c'].forEach((id,i)=>$('#'+id+'-value').textContent=state.levels[i]+'%');core.setLevel(levelValue());core.setEnergy(levelValue()/100);coreInSpace.getObjectByName('Brightness_Dial').quaternion.copy(core.dial.quaternion);miniDirty=true;
 bars.forEach((b,i)=>b.classList.toggle('selected',state.group<0||nodes[i].group===state.group));labels.forEach((l,i)=>{l.visible=$('#connections').checked&&$('#installation').checked&&(state.group<0?[0,6,14].includes(i):nodes[i].group===state.group);});
}
function tourUI(){
 $('#tour').textContent=tour.running?'结束导览':'参观导览';$('#tour').setAttribute('aria-pressed',tour.running);$('#tour-pause').hidden=!tour.running;$('#tour-pause').textContent=tour.paused?'继续参观':'暂停参观';$('#tour-pause').setAttribute('aria-pressed',tour.paused);
 const title=areas[tourStops[tour.index]]?.name||'';$('#tour-progress').textContent=tour.running?`${String(tour.index+1).padStart(2,'0')} / 04 · ${title} · ${tour.paused?'已暂停':viewTween?'移步中':'停留观看'}`:tour.complete?'本次参观已结束':'';
}
function stopTour(){tour.stop();tourUI();}

function frame(next,immediate=false,automatic=false){
 renderer.shadowMap.needsUpdate=true;if(!automatic)stopTour();const previous=view;view=next==='hero'?'cutaway':next;
 const outside=view==='top'||view==='cutaway',item=areas[view]||areas.overview;
 const target=outside?new T.Vector3(0,2,-1):new T.Vector3(...item.target),to=view==='top'?new T.Vector3(0,58,.01):view==='cutaway'?new T.Vector3(34,32,42):new T.Vector3(...item.camera);
 camera.fov=outside?42:camera.aspect<1?82:66;camera.updateProjectionMatrix();
 if(camera.aspect<1&&outside)to.sub(target).multiplyScalar(1.4).add(target);
 const path=cameraRoute(previous,view,camera.position.toArray());
 // Plan/cutaway are analytical views. Switch directly; walking routes stay below the ceiling.
 if(immediate||reduced.matches||outside||!path){camera.position.copy(to);controls.target.copy(target);controls.update();viewTween=null;gallery.setCutaway(outside,view==='top');}
 else{gallery.setCutaway(false);const curve=new T.CatmullRomCurve3(path.map(p=>new T.Vector3(...p)),false,'centripetal');viewTween={elapsed:0,duration:Math.max(3400,Math.min(7200,curve.getLength()*220)),curve,look:controls.target.clone(),target};}
 $$('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===view));
}

function selectArea(value,automatic=false){system.selectArea(value);sync();frame(value,false,automatic);}
function requestScene(value){system.setPreset(value);sync();$('#status').textContent='全场预设：'+presetNames[value]+'；布置保持不变';}
function action(name){const idx=['scene','group','hold'].indexOf(name);if(idx>=0)pressUntil[idx]=performance.now()+180;if(name==='scene'){system.nextPreset();$('#status').textContent='全场预设：'+presetNames[state.preset];}if(name==='group')system.nextGroup();if(name==='hold')system.toggleHold();sync();}
$$('[data-area]').forEach(b=>b.onclick=()=>selectArea(b.dataset.area));$$('[data-scene]').forEach(b=>b.onclick=()=>requestScene(b.dataset.scene));$$('[data-view]').forEach(b=>b.onclick=()=>{system.selectArea('overview');sync();frame(b.dataset.view);});$$('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));$$('[data-group]').forEach(b=>b.onclick=()=>{system.selectGroup(+b.dataset.group);sync();});$('#level').oninput=e=>{const v=+e.target.value;system.setLevel(v);sync();};
$('#connections').onchange=e=>{[...links,...feeds].forEach(l=>l.visible=e.target.checked);sync();};
$('#installation').onchange=e=>{leaves.forEach(l=>l.group.visible=e.target.checked);rings.forEach(r=>r.visible=e.target.checked);sync();};
$('#tour').onclick=()=>{if(tour.running){stopTour();viewTween=null;}else{tour.start();tourUI();}};
$('#tour-pause').onclick=()=>{tour.togglePause();tourUI();};
$('#immersive').onclick=()=>{const active=document.body.classList.toggle('immersive');$('#immersive').textContent=active?'显示控制':'沉浸查看';$('#immersive').setAttribute('aria-pressed',active);};
$('#reset').onclick=()=>{stopTour();Object.assign(state,{area:'overview',preset:'exhibit',group:-1,levels:[70,70,70],phase:0,running:!reduced.matches});$('#connections').checked=false;[...links,...feeds].forEach(l=>l.visible=false);$('#installation').checked=true;leaves.forEach(l=>l.group.visible=true);rings.forEach(r=>r.visible=true);sync();frame('overview');$('#status').textContent='案例已重置';};
const ray=new T.Raycaster(),pointer=new T.Vector2();let down=null,dialDrag=null;
function pickCore(e){const r=mini.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,coreCamera);return ray.intersectObject(core.group,true)[0]?.object;}
mini.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];let o=pickCore(e);while(o&&o!==core.dial)o=o.parent;if(o){dialDrag={x:e.clientX,y:e.clientY,value:levelValue()};mini.setPointerCapture(e.pointerId);mini.style.cursor='ew-resize';}});
mini.addEventListener('pointermove',e=>{if(dialDrag){system.setLevel(Math.round(dialDrag.value+((e.clientX-dialDrag.x)-(e.clientY-dialDrag.y))*.5));sync();}});
mini.addEventListener('pointerup',e=>{if(dialDrag){dialDrag=null;mini.style.cursor='';if(mini.hasPointerCapture(e.pointerId))mini.releasePointerCapture(e.pointerId);return;}if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;let o=pickCore(e);while(o&&!o.userData.action)o=o.parent;if(o)action(o.userData.action);});
mini.addEventListener('pointercancel',()=>{dialDrag=null;down=null;mini.style.cursor='';});
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const m=mini.parentElement;coreRenderer.setSize(m.clientWidth,m.clientHeight,false);coreCamera.aspect=m.clientWidth/m.clientHeight;coreCamera.updateProjectionMatrix();frame(view,true,true);miniDirty=true;}
new ResizeObserver(resize).observe(stage);new ResizeObserver(resize).observe(mini.parentElement);controls.addEventListener('start',()=>{viewTween=null;stopTour();gallery.setCutaway(view==='top'||view==='cutaway',view==='top');});
function tick(now){if(disposed)return;requestAnimationFrame(tick);const wallDt=Math.min((now-last)/1000,.25),dt=Math.min(wallDt,.1);last=now;if(document.hidden)return;system.tick(dt);
 const nextArea=tour.step(wallDt,!!viewTween);if(nextArea)selectArea(nextArea,true);
 leaves.forEach((leaf,i)=>{const p=sampleLeaf(state,i);leaf.setPose(p.angle,0);leaf.setEnergy(p.energy);leaf.group.traverse(o=>{if(o.isMesh)o.castShadow=false;});rings[i].material.opacity=p.energy*.44;});
 zoneLights.forEach((l,g)=>{const ids=nodes.map((n,i)=>n.group===g?i:-1).filter(i=>i>=0);l.intensity=$('#installation').checked?ids.reduce((v,i)=>v+sampleLeaf(state,i).energy,0)/ids.length*48:0;});
 if(now-meterTime>80){tourUI();leaves.forEach((_,i)=>{const p=sampleLeaf(state,i);bars[i].firstChild.style.height=(p.energy*100)+'%';bars[i].setAttribute('aria-label','光叶'+(i+1)+' '+Math.round(p.energy*100)+'%');});meterTime=now;}
 if(viewTween&&!tour.paused){viewTween.elapsed+=wallDt*1000;const u=Math.min(1,viewTween.elapsed/viewTween.duration),s=cameraEase(u);camera.position.copy(viewTween.curve.getPointAt(s));controls.target.lerpVectors(viewTween.look,viewTween.target,s);if(u===1){viewTween=null;gallery.setCutaway(view==='cutaway'||view==='top',view==='top');renderer.shadowMap.needsUpdate=true;}}
 core.keys.forEach((k,i)=>{const y=k.position.y;core.press(i,now<pressUntil[i]?1:0);if(y!==k.position.y)miniDirty=true;coreInSpace.getObjectByName(k.name).position.y=k.position.y;});
 controls.update();floorReflection.prepare(stage.clientWidth,view);composer.render();if(miniDirty){coreRenderer.render(coreScene,coreCamera);miniDirty=false;}
}
applyLayout();sync();resize();$('#loading').hidden=true;requestAnimationFrame(tick);
document.addEventListener('visibilitychange',()=>{last=performance.now();});reduced.addEventListener('change',e=>{if(e.matches){state.running=false;viewTween=null;stopTour();sync();}});
window.exhibitionCase={ready:true,state,system,leaves,core,coreInSpace,camera,coreCamera,renderer,coreRenderer,requestScene,selectArea,action,frame,gallery,get touring(){return tour.running},tour,floorReflection,get moving(){return !!viewTween},async exportArchitecture(){const previous=[gallery.cutaway.visible,gallery.roof.visible,gallery.canopy.visible];gallery.cutaway.visible=gallery.roof.visible=gallery.canopy.visible=true;try{return await new GLTFExporter().parseAsync(gallery.root,{binary:true});}finally{[gallery.cutaway.visible,gallery.roof.visible,gallery.canopy.visible]=previous;}},get nodes(){return currentNodes},sample:i=>sampleLeaf(state,i)};
addEventListener('pagehide',()=>{disposed=true;controls.dispose();floorReflection.dispose();composer.dispose();bloom.dispose();envTarget.dispose();miniEnvTarget.dispose();renderer.dispose();coreRenderer.dispose();const geometries=new Set(),materials=new Set(),textures=new Set();for(const root of [scene,coreScene])root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());},{once:true});
