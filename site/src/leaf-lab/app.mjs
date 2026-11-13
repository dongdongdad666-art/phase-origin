import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createLeaf,createAssembly,openingClip} from './model.mjs';
import {attachFinish} from './finish.mjs';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const canvas=$('#canvas'),stage=$('.stage'),state={mode:'single',layout:'line',beta:60,explode:0,playing:false,sequence:true,part:-1,phase:Math.acos(1-2*(60-12)/108),view:'hero',look:new URLSearchParams(location.search).get('look')==='gray'?'gray':'product',energy:1};
let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});}catch(e){$('#loading').textContent='无法启动三维预览，请启用浏览器硬件加速后刷新。';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const scene=new T.Scene();scene.background=new T.Color('#191c24');scene.fog=new T.Fog('#191c24',28,110);
const camera=new T.PerspectiveCamera(36,1,.05,200),controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.085;controls.maxPolarAngle=Math.PI*.495;controls.minDistance=2;controls.maxDistance=80;
const hemi=new T.HemisphereLight('#d6dfef','#363b47',2.3);scene.add(hemi);
const key=new T.DirectionalLight('#ffeddb',3.7);key.position.set(7,11,8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.normalBias=.035;key.shadow.bias=-.00015;key.shadow.camera.near=.1;key.shadow.camera.far=45;scene.add(key);scene.add(key.target);
const fill=new T.DirectionalLight('#bfcce5',2);fill.position.set(-7,6,-4);scene.add(fill);const rim=new T.DirectionalLight('#e7eaf7',2.5);rim.position.set(2,7,-8);scene.add(rim);
const floor=new T.Mesh(new T.PlaneGeometry(500,500),new T.MeshStandardMaterial({color:'#12151c',roughness:.92,metalness:.05}));floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;scene.add(floor);
const grid=new T.GridHelper(100,100,'#414752','#323741');grid.position.y=-.006;grid.material.transparent=true;grid.material.opacity=.16;scene.add(grid);
const environment=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),envTarget=pmrem.fromScene(environment,.04);environment.dispose();pmrem.dispose();
const renderTarget=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:4}),composer=new EffectComposer(renderer,renderTarget);composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new T.Vector2(1,1),.13,.38,1.5);composer.addPass(bloom);composer.addPass(new OutputPass());
let assembly,viewTween=null,last=performance.now(),disposed=false;
const details=['两片带厚度的刚性面，边框与细槽随各自转轴一起转动。','左右固定纵轴及三处轴套，为面板提供共同旋转基准。','中脊承接轴套和根仓，前侧窄槽预留导光区域。','根部预留驱动与维护空间；前盖与紧固点供结构讨论。','非对称定位键、锁止底座与支撑颈，连接下方轨道。'];
const copy={single:['从结构，看见光叶。','两片完整的光学面绕中脊两侧转动。先看轮廓、接缝与展开关系。'],structure:['把连接关系打开。','分离查看零件，或把分离量归零，检查完整装配中的开合。'],array:['让单元组织空间。','复用同一灰模，通过排列和响应顺序形成不同空间关系。']};
const layoutCopy={line:'沿连接轨依次回应，形成行进方向。',screen:'两排错位布置，形成有深度的半透明边界。',arc:'开放弧列面向共同中心，保留入口与通行方向。'};
function destroyGroup(g){const geometries=new Set(),materials=new Set();g.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());scene.remove(g);}
function rebuild(){if(assembly){assembly.leaves.forEach(l=>l.disposeFinish());destroyGroup(assembly.group);}assembly=createAssembly(state.mode==='array'?state.layout:'single');assembly.leaves.forEach(attachFinish);scene.add(assembly.group);applyPose();setLook(state.look);setPart(state.part);frame('hero',true);$('#count').textContent=assembly.leaves.length+' MODULE'+(assembly.leaves.length>1?'S':'');}
function setLook(look){
 state.look=look;const product=look==='product';assembly.leaves.forEach(l=>{l.setLook(look);l.setEnergy(state.energy);});
 scene.environment=product?envTarget.texture:null;scene.environmentIntensity=.45;hemi.intensity=product?.7:2.3;key.intensity=product?2.3:3.7;fill.intensity=product?1.2:2;rim.intensity=product?2:2.5;
 bloom.enabled=product;floor.material.color.set(product?'#080a10':'#12151c');floor.material.envMap=product?envTarget.texture:null;floor.material.envMapIntensity=product?.05:1;floor.material.roughness=product?.85:.92;floor.material.metalness=.05;floor.material.needsUpdate=true;grid.visible=!product;
 $$('[data-look]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.look===look));$('#energy').disabled=!product;$('#energy-value').value=Math.round(state.energy*100)+'%';
 $('#stage-note').textContent=product?'蓝紫光学面 / 琥珀导光 / 钛金属结构':'灰模对照 / 原结构与开合';
}
function applyPose(){assembly.leaves.forEach((l,i)=>{let beta=state.beta;if(state.playing&&state.mode==='array'&&state.sequence)beta=12+108*(.5-.5*Math.cos(state.phase-i*.35));l.setPose(beta,state.mode==='structure'?state.explode:0);});}
function syncUI(){
 $('#angle').value=state.beta;$('#angle-value').value=Math.round(state.beta)+'°';$('#explode').value=state.explode*100;$('#explode-value').value=Math.round(state.explode*100)+'%';
 $('#play').textContent=state.playing?'Ⅱ 暂停开合':'▶ 播放开合';$('#play').setAttribute('aria-pressed',state.playing);
 $$('[data-angle]').forEach(b=>b.setAttribute('aria-pressed',Math.abs(Number(b.dataset.angle)-state.beta)<.5));
}
function pause(){state.playing=false;syncUI();}
function setBeta(value){pause();state.beta=T.MathUtils.clamp(Number(value),12,120);state.phase=Math.acos(1-2*(state.beta-12)/108);applyPose();syncUI();}
function setPart(index){state.part=index;assembly.leaves.forEach(l=>l.highlight(index));$$('[data-part]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.part)===index));$('#part-copy').textContent=index<0?'选择一组结构，在模型中查看它的位置。':details[index];}
function setMode(mode){pause();state.mode=mode;state.explode=0;state.part=-1;$$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));$('#structure-controls').hidden=mode!=='structure';$('#array-controls').hidden=mode!=='array';$('#mode-title').textContent=copy[mode][0];$('#mode-copy').textContent=copy[mode][1];$('#stage-note').textContent=mode==='array'?'同一单元 / 三种空间组合':mode==='structure'?'五组结构 / 装配关系':'双轴开合 / 独立产品灰模';rebuild();syncUI();}
function setLayout(layout){pause();state.layout=layout;$$('[data-layout]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.layout===layout));$('#layout-copy').textContent=layoutCopy[layout];rebuild();}
function frame(view,immediate=false){
 state.view=view;assembly.group.updateMatrixWorld(true);const box=new T.Box3().setFromObject(assembly.group),center=box.getCenter(new T.Vector3());center.y=Math.max(1.8,center.y);const size=box.getSize(new T.Vector3());
 const directions={hero:new T.Vector3(.42,.64,2.1),front:new T.Vector3(0,.12,1),side:new T.Vector3(1,.12,.001),top:new T.Vector3(0,1,.001)};
 const d=directions[view].normalize(),extent=view==='top'?Math.max(size.z,size.x/camera.aspect):view==='side'?Math.max(size.y,size.z/camera.aspect):Math.max(size.y,size.x/camera.aspect);
 const distance=Math.max(5,extent/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*1.32+size.z*.45);
 const position=center.clone().addScaledVector(d,distance);if(immediate||matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.copy(position);controls.target.copy(center);controls.update();viewTween=null;}else viewTween={start:performance.now(),from:camera.position.clone(),target:controls.target.clone(),to:position,center};
 const radius=Math.max(6,size.x*.65,size.z*.65);Object.assign(key.shadow.camera,{left:-radius,right:radius,top:radius,bottom:-radius});key.shadow.camera.updateProjectionMatrix();key.target.position.copy(center);key.position.copy(center).add(new T.Vector3(7,11,8));
}
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(assembly)frame(state.view,true);}
new ResizeObserver(resize).observe(stage);controls.addEventListener('start',()=>viewTween=null);
$$('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));$$('[data-view]').forEach(b=>b.onclick=()=>frame(b.dataset.view));$$('[data-angle]').forEach(b=>b.onclick=()=>setBeta(b.dataset.angle));$$('[data-layout]').forEach(b=>b.onclick=()=>setLayout(b.dataset.layout));$$('[data-part]').forEach(b=>b.onclick=()=>setPart(state.part===Number(b.dataset.part)?-1:Number(b.dataset.part)));
$('#angle').oninput=e=>setBeta(e.target.value);$('#explode').oninput=e=>{const value=Number(e.target.value)/100;pause();state.explode=value;applyPose();frame(state.view,true);syncUI();};$('#sequence').onchange=e=>{pause();state.sequence=e.target.checked;applyPose();};
$('#play').onclick=()=>{state.playing=!state.playing;state.phase=Math.acos(1-2*(state.beta-12)/108);last=performance.now();syncUI();};
$$('[data-look]').forEach(b=>b.onclick=()=>setLook(b.dataset.look));$('#energy').oninput=e=>{state.energy=Number(e.target.value)/100;assembly.leaves.forEach(l=>l.setEnergy(state.energy));$('#energy-value').value=Math.round(state.energy*100)+'%';};
$('#reset').onclick=()=>{state.beta=60;state.layout='line';state.sequence=true;$('#sequence').checked=true;setLayout('line');setMode('single');};
async function exportModel(){
 const leaf=attachFinish(createLeaf());leaf.setLook(state.look);leaf.setEnergy(state.energy);leaf.setPose(12,0);leaf.group.updateMatrixWorld(true);try{return await new GLTFExporter().parseAsync(leaf.group,{binary:true,animations:[openingClip(leaf)]});}finally{leaf.disposeFinish();leaf.group.traverse(o=>o.geometry?.dispose());}
}
$('#export').onclick=async()=>{const button=$('#export');button.disabled=true;$('#status').textContent='正在导出单体材质与动画…';try{const bytes=await exportModel(),url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'})),a=document.createElement('a');a.href=url;a.download='phase-origin-leaf-'+state.look+'-v001.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);$('#status').textContent='已生成含当前材质与开合动画的 GLB。';}catch(e){$('#status').textContent='导出失败，请重试。';console.error(e);}finally{button.disabled=false;}};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();last=performance.now();});
resize();rebuild();syncUI();$('#loading').hidden=true;
function tick(now){if(disposed)return;requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.06);last=now;if(document.hidden)return;
 if(state.playing){state.phase+=dt*2*Math.PI/10;state.beta=12+108*(.5-.5*Math.cos(state.phase));applyPose();syncUI();}
 if(viewTween){const t=Math.min(1,(now-viewTween.start)/700),s=t*t*(3-2*t);camera.position.lerpVectors(viewTween.from,viewTween.to,s);controls.target.lerpVectors(viewTween.target,viewTween.center,s);if(t===1)viewTween=null;}
 controls.update();composer.render();
}requestAnimationFrame(tick);
window.leafLab={ready:true,state,setMode,setLayout,setBeta,setPart,setLook,pause,frame,exportModel,get assembly(){return assembly},camera,controls,renderer,scene};
addEventListener('pagehide',()=>{disposed=true;composer.dispose();bloom.dispose();envTarget.dispose();renderer.dispose();controls.dispose();},{once:true});
