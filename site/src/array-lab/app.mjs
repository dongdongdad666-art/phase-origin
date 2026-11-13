import * as T from 'three';
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
import {createSystem,layouts,sampleLeaf,sceneCopy,scenes} from './system.mjs';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),system=createSystem({reduced:reduced.matches}),state=system.state;
const stage=$('.stage'),canvas=$('#space'),mini=$('#controller');
const renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color('#141521');scene.fog=new T.Fog('#141521',35,80);
const camera=new T.PerspectiveCamera(42,1,.1,150),controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.075;controls.maxPolarAngle=Math.PI*.485;controls.minDistance=8;controls.maxDistance=65;
const env=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),envTarget=pmrem.fromScene(env,.04);scene.environment=envTarget.texture;scene.environmentIntensity=.6;env.dispose();pmrem.dispose();
scene.add(new T.HemisphereLight('#c9c8f5','#333648',1.25));const key=new T.DirectionalLight('#ffe4cf',3);key.position.set(-8,15,10);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-19,right:19,top:19,bottom:-19,near:.1,far:65});key.shadow.normalBias=.04;scene.add(key);const rim=new T.DirectionalLight('#949bff',2.2);rim.position.set(8,8,-9);scene.add(rim);
const composer=new EffectComposer(renderer,new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:4}));composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new T.Vector2(1,1),.18,.4,1.2);composer.addPass(bloom);composer.addPass(new OutputPass());
const matte=new T.MeshStandardMaterial({color:'#1c2030',roughness:.82,metalness:.12}),metal=new T.MeshStandardMaterial({color:'#35374b',roughness:.35,metalness:.75});
function box(w,h,d,mat,pos,parent=scene){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.fromArray(pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const floor=box(150,.15,150,matte,[0,-.15,0]);floor.castShadow=false;
const ground=new T.GridHelper(28,14,'#44465d','#292d41');ground.position.y=-.064;ground.material.transparent=true;ground.material.opacity=.28;scene.add(ground);
// Architectural backdrop keeps the scale legible without enclosing the camera.
for(let i=0;i<11;i++){box(.12,8,.25,metal,[-15+i*3,3.8,-14]);}box(31,.12,.25,metal,[0,7.8,-14]);
function line(points,color,opacity=1){const geom=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));const m=new T.Line(geom,new T.LineBasicMaterial({color,transparent:true,opacity}));scene.add(m);return m;}
line([[-13,-.05,12],[13,-.05,12],[13,-.05,-12],[-13,-.05,-12],[-13,-.05,12]],'#61647d',.28);
function label(text,color='#c0c0d9',width=2.4){const c=document.createElement('canvas');c.width=384;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.font='22px sans-serif';ctx.textAlign='center';ctx.fillText(text,192,41);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const sprite=new T.Sprite(new T.SpriteMaterial({map,transparent:true,depthWrite:false}));sprite.scale.set(width,width/6,1);return sprite;}
const leaves=[],rings=[],labels=[];
for(let i=0;i<12;i++){
 const leaf=finishLeaf(createLeaf());leaf.group.name='ARRAY_LEAF_'+(i+1);leaf.group.userData.arrayIndex=i;leaf.group.traverse(o=>{if(o.isPointLight)o.visible=false;});scene.add(leaf.group);leaves.push(leaf);
 const ring=new T.Mesh(new T.RingGeometry(.52,1.13,48),new T.MeshBasicMaterial({color:'#b8a0df',transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-.045;scene.add(ring);rings.push(ring);
 const tag=label('ABC'[Math.floor(i/4)]+' · '+String(i+1).padStart(2,'0'));scene.add(tag);labels.push(tag);
 const base=box(.95,.08,.8,metal,[0,.015,0],leaf.group);base.name='ARRAY_Flush_Dock';
}
const core=finishCore(createCore());const coreScene=new T.Scene();coreScene.background=new T.Color('#10121f');coreScene.environment=envTarget.texture;coreScene.environmentIntensity=.65;coreScene.add(core.group);coreScene.add(new T.HemisphereLight('#c9cdfb','#53505b',1.3));const ck=new T.DirectionalLight('#ffe0c0',2);ck.position.set(2,6,4);coreScene.add(ck);
const coreRenderer=new T.WebGLRenderer({canvas:mini,antialias:true,preserveDrawingBuffer:true});coreRenderer.setPixelRatio(Math.min(devicePixelRatio,1.25));coreRenderer.toneMapping=T.ACESFilmicToneMapping;coreRenderer.toneMappingExposure=1.2;const miniEnv=new RoomEnvironment(),miniPmrem=new T.PMREMGenerator(coreRenderer),miniEnvTarget=miniPmrem.fromScene(miniEnv,.04);coreScene.environment=miniEnvTarget.texture;miniEnv.dispose();miniPmrem.dispose();
const coreCamera=new T.PerspectiveCamera(35,1,.05,50);coreCamera.position.set(.6,4.5,5.8);coreCamera.lookAt(0,.55,0);
const coreInSpace=core.group.clone(true);coreInSpace.name='CORE_System_Replica';coreInSpace.scale.setScalar(.38);coreInSpace.position.set(9,1.5,8.6);scene.add(coreInSpace);box(2.65,1.5,1.05,metal,[9,.75,8.6]);const coreTag=label('CORE / 轴台','#e2bea2',2.7);coreTag.position.set(9,2.55,8.6);scene.add(coreTag);
const power=box(1.5,.65,.85,metal,[-10,.325,8.5]);const ptag=label('SUPPLY / 独立供电','#a4a8bb',3.3);ptag.position.set(-10,1.15,8.5);scene.add(ptag);
const links=Array.from({length:3},()=>line(Array.from({length:8},()=>[0,0,0]),'#777cba',.65));const feeds=Array.from({length:3},()=>line(Array.from({length:8},()=>[0,0,0]),'#515766',.5));
const arrow=line([[-.4,-.045,3],[0,-.045,2.5],[.4,-.045,3],[0,-.045,2.5],[0,-.045,5]],'#d8bd9f',.55);
const meters=$('#leaf-meter');for(let i=0;i<12;i++){const el=document.createElement('i');el.innerHTML='<b></b>';el.title='光叶 '+(i+1);meters.append(el);}const bars=[...meters.children];
let currentNodes=[],view='hero',viewTween=null,changeTimer=null,changing=false,miniDirty=true,last=performance.now(),meterTime=0,disposed=false;const pressUntil=[0,0,0];
function updateRoutes(){
 for(let g=0;g<3;g++){const nodes=currentNodes.slice(g*4,g*4+4);const points=[[9,0,8.6],[9,0,10+g*.2],[nodes[0].x,0,10+g*.2],...nodes.map(n=>[n.x,0,n.z]),[nodes.at(-1).x,0,nodes.at(-1).z]];
 for(const [connection,start,offset] of [[links[g],[9,.06,8.6],0],[feeds[g],[-10,.04,8.5],.12]]){const a=connection.geometry.attributes.position;points.forEach((p,i)=>{a.setXYZ(i,i===0?start[0]:p[0]+offset,i===0?start[1]:.035,p[2]+offset);});a.needsUpdate=true;connection.geometry.computeBoundingSphere();}
 }
}
function applyLayout(){currentNodes=layouts(state.scene);currentNodes.forEach((n,i)=>{leaves[i].group.position.set(n.x,0,n.z);leaves[i].group.rotation.y=n.yaw;rings[i].position.set(n.x,-.045,n.z);labels[i].position.set(n.x,4.55,n.z);});arrow.visible=state.scene==='guide';updateRoutes();}
function levelValue(){return state.group<0?Math.round(state.levels.reduce((a,b)=>a+b,0)/3):state.levels[state.group];}
function sync(){
 const copy=sceneCopy[state.scene];$('#en').textContent=copy.en;$('#title').textContent=copy.title;$('#description').textContent=copy.text;$('#rhythm').textContent=copy.rhythm;$('#scene-value').textContent=copy.name;
 $$('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.scene===state.scene));$$('[data-group]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.group===state.group));
 $('#selection').textContent=state.group<0?'全部光叶':('ABC'[state.group]+' 组 · 4 光叶');$('#level').value=levelValue();$('#level-value').value=levelValue()+'%';
 $('#mixed').textContent=state.group<0?(new Set(state.levels).size>1?'各组亮度不同；此处为均值，拖动将统一设置':'调整全部组的亮度上限'):('仅调整 '+ 'ABC'[state.group]+' 组，其他组保持');
 $('#hold').innerHTML=(state.running?'暂停':'继续')+'<small>HOLD</small>';$('#hold').setAttribute('aria-pressed',!state.running);$('#run-status').textContent=state.running?'动态运行':'动态已暂停';
 ['a','b','c'].forEach((id,i)=>$('#'+id+'-value').textContent=state.levels[i]+'%');
 core.setLevel(levelValue());core.setEnergy(levelValue()/100);coreInSpace.getObjectByName('Brightness_Dial').quaternion.copy(core.dial.quaternion);miniDirty=true;
 bars.forEach((b,i)=>b.classList.toggle('selected',state.group<0||Math.floor(i/4)===state.group));labels.forEach((l,i)=>{l.visible=state.group<0?i%4===0:Math.floor(i/4)===state.group;});
 rings.forEach((r,i)=>r.material.color.set(state.group<0||Math.floor(i/4)===state.group?'#dcb48f':'#7d78af'));
}
function frame(next,immediate=false){view=next;let target=new T.Vector3(0,1.7,.3),pos;
 if(next==='hero')pos=new T.Vector3(24,22,29);if(next==='top')pos=new T.Vector3(0,36,.31);if(next==='walk'){target.set(0,2.2,-1);pos=new T.Vector3(0,3.2,15.8);}
 if(camera.aspect<1&&next!=='walk')pos.sub(target).multiplyScalar(1.4).add(target);
 if(immediate||reduced.matches){camera.position.copy(pos);controls.target.copy(target);controls.update();viewTween=null;}else viewTween={start:performance.now(),from:camera.position.clone(),look:controls.target.clone(),to:pos,target};
 $$('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===next));
}
function requestScene(value){if(value===state.scene&&!changing)return;system.setScene(value);sync();clearTimeout(changeTimer);changing=true;canvas.classList.add('changing');$('#status').textContent='切换布置…';changeTimer=setTimeout(()=>{applyLayout();canvas.classList.remove('changing');changing=false;$('#status').textContent='已切换为'+sceneCopy[value].name+'场景';},reduced.matches?0:190);}
function action(name){const idx=['scene','group','hold'].indexOf(name);if(idx>=0)pressUntil[idx]=performance.now()+180;if(name==='scene')requestScene(scenes[(scenes.indexOf(state.scene)+1)%3]);if(name==='group')system.nextGroup();if(name==='hold')system.toggleHold();sync();}
$$('[data-scene]').forEach(b=>b.onclick=()=>requestScene(b.dataset.scene));$$('[data-view]').forEach(b=>b.onclick=()=>frame(b.dataset.view));$$('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));$$('[data-group]').forEach(b=>b.onclick=()=>{system.selectGroup(+b.dataset.group);sync();});$('#level').oninput=e=>{const v=+e.target.value;system.setLevel(v);sync();};
$('#connections').onchange=e=>[...links,...feeds].forEach(l=>l.visible=e.target.checked);
$('#reset').onclick=()=>{clearTimeout(changeTimer);Object.assign(state,{scene:'guide',group:-1,levels:[70,70,70],phase:0,running:!reduced.matches});changing=false;canvas.classList.remove('changing');$('#connections').checked=true;[...links,...feeds].forEach(l=>l.visible=true);applyLayout();sync();frame('hero');$('#status').textContent='系统已重置';};
const ray=new T.Raycaster(),pointer=new T.Vector2();let down=null,dialDrag=null;
function pickCore(e){const r=mini.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,coreCamera);return ray.intersectObject(core.group,true)[0]?.object;}
mini.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];let o=pickCore(e);while(o&&o!==core.dial)o=o.parent;if(o){dialDrag={x:e.clientX,y:e.clientY,value:levelValue()};mini.setPointerCapture(e.pointerId);mini.style.cursor='ew-resize';}});
mini.addEventListener('pointermove',e=>{if(dialDrag){system.setLevel(Math.round(dialDrag.value+((e.clientX-dialDrag.x)-(e.clientY-dialDrag.y))*.5));sync();}});
mini.addEventListener('pointerup',e=>{if(dialDrag){dialDrag=null;mini.style.cursor='';if(mini.hasPointerCapture(e.pointerId))mini.releasePointerCapture(e.pointerId);return;}if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;let o=pickCore(e);while(o&&!o.userData.action)o=o.parent;if(o)action(o.userData.action);});
mini.addEventListener('pointercancel',()=>{dialDrag=null;down=null;mini.style.cursor='';});
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const m=mini.parentElement;coreRenderer.setSize(m.clientWidth,m.clientHeight,false);coreCamera.aspect=m.clientWidth/m.clientHeight;coreCamera.updateProjectionMatrix();frame(view,true);miniDirty=true;}
new ResizeObserver(resize).observe(stage);new ResizeObserver(resize).observe(mini.parentElement);controls.addEventListener('start',()=>viewTween=null);
function tick(now){if(disposed)return;requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.1);last=now;if(document.hidden)return;system.tick(dt);
 leaves.forEach((leaf,i)=>{const p=sampleLeaf(state,i);leaf.setPose(p.angle,0);leaf.setEnergy(p.energy);rings[i].material.opacity=.035+p.energy*.15;});
 if(now-meterTime>80){leaves.forEach((_,i)=>{const p=sampleLeaf(state,i);bars[i].firstChild.style.height=(p.energy*100)+'%';bars[i].setAttribute('aria-label','光叶'+(i+1)+' '+Math.round(p.energy*100)+'%');});meterTime=now;}
 if(viewTween){const u=Math.min(1,(now-viewTween.start)/1000),s=u*u*(3-2*u);camera.position.lerpVectors(viewTween.from,viewTween.to,s);controls.target.lerpVectors(viewTween.look,viewTween.target,s);if(u===1)viewTween=null;}
 core.keys.forEach((k,i)=>{const y=k.position.y;core.press(i,now<pressUntil[i]?1:0);if(y!==k.position.y)miniDirty=true;coreInSpace.getObjectByName(k.name).position.y=k.position.y;});
 controls.update();composer.render();if(miniDirty){coreRenderer.render(coreScene,coreCamera);miniDirty=false;}
}
applyLayout();sync();resize();$('#loading').hidden=true;requestAnimationFrame(tick);
document.addEventListener('visibilitychange',()=>{last=performance.now();});reduced.addEventListener('change',e=>{if(e.matches){state.running=false;viewTween=null;sync();}});
window.arrayLab={ready:true,state,system,leaves,core,coreInSpace,camera,coreCamera,renderer,coreRenderer,requestScene,action,frame,get nodes(){return currentNodes},sample:i=>sampleLeaf(state,i)};
addEventListener('pagehide',()=>{disposed=true;clearTimeout(changeTimer);controls.dispose();composer.dispose();bloom.dispose();envTarget.dispose();miniEnvTarget.dispose();renderer.dispose();coreRenderer.dispose();const geometries=new Set(),materials=new Set(),textures=new Set();for(const root of [scene,coreScene])root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());},{once:true});
