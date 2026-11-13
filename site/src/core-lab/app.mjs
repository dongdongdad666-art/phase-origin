import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createCore} from './model.mjs';
import {attachFinish} from './finish.mjs';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const canvas=$('#canvas'),stage=$('.stage'),state={mode:'whole',view:'hero',explode:0,part:-1,port:-1,scene:0,group:0,levels:[60,60,60],hold:false,look:new URLSearchParams(location.search).get('look')==='gray'?'gray':'product'};
const renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new T.Scene();scene.background=new T.Color('#191c24');scene.fog=new T.Fog('#191c24',20,55);
const camera=new T.PerspectiveCamera(36,1,.03,120),controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.09;controls.minDistance=4;controls.maxDistance=28;controls.maxPolarAngle=Math.PI-.01;
const hemi=new T.HemisphereLight('#e4e9f7','#718093',2);scene.add(hemi);
const light=new T.DirectionalLight('#fff2e5',3.5);light.position.set(-3,8,6);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.1,far:30});light.shadow.normalBias=.015;scene.add(light);
const fill=new T.DirectionalLight('#c3cfe5',1.8);fill.position.set(4,2,-6);scene.add(fill);const under=new T.DirectionalLight('#d0dded',1.5);under.position.set(0,-5,3);scene.add(under);
const env=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),envTarget=pmrem.fromScene(env,.04);scene.environment=envTarget.texture;scene.environmentIntensity=.25;env.dispose();
const studio=new T.Scene();studio.background=new T.Color('#625e70');
for(const [position,size,color,strength] of [[[0,4,-6],[12,7],'#e5dbe5',1.1],[[-4,3,1],[3,6],'#afa8ff',3],[[5,2,-2],[4,5],'#ffcb95',3],[[0,1,6],[8,3],'#d9cbd0',1.5]]){const panel=new T.Mesh(new T.PlaneGeometry(...size),new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(strength),side:T.DoubleSide}));panel.position.fromArray(position);panel.lookAt(0,0,0);studio.add(panel);}
const studioTarget=pmrem.fromScene(studio,.035);studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();
const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:'#161922',roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;scene.add(floor);
const core=createCore();scene.add(core.group);
const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:4}),composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new T.Vector2(1,1),.12,.35,1.2);composer.addPass(bloom);composer.addPass(new OutputPass());
// Printed legends stay attached to their interface component.
for(const port of core.ports){const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d');ctx.font='28px sans-serif';ctx.fillStyle='#dce0e7';ctx.textAlign='center';ctx.fillText(port.name,128,43);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const label=new T.Mesh(new T.PlaneGeometry(.56,.09),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));label.rotation.y=Math.PI;label.position.set(0,.17,-.145);label.name=port.name+'_Legend';port.add(label);}
const lightGuide=core.group.getObjectByName('State_Light_Guide');lightGuide.material=lightGuide.material.clone();attachFinish(core);
const details=['外壳围合底部空间，顶框为光学盖保留真实开口。','浅光学盖独立装配；中线用于状态示意。蓝紫半透与暖色导光为视觉提案，实际透光材料待验证。','独立旋钮轴、三枚按键与各自底座；可点击模型或右侧按钮进行示意。','接口向内凹入后部开口，分别预留供电、控制和维护功能。','维护盖、脚垫、紧固位置和散热槽预留。内部电路与固定工艺尚未设计。'];
const portCopy=['PWR：控制器自身供电预留。暂不承担整个光叶阵列的功率分配。','LINK：发送控制命令、接收状态的功能预留；总线协议与连接器待选型。','SERVICE：维护与配置入口预留；详细设置界面和物理连接方式待设计。'];
let tween=null;const presses=[0,0,0];
function sync(){
 $('#explode').value=Math.round(state.explode*100);$('#explode-value').value=Math.round(state.explode*100)+'%';$('#level').value=state.levels[state.group];$('#level-value').value=state.levels[state.group]+'%';
 $('#scene-value').textContent=['导向','围合','氛围'][state.scene];$('#group-value').textContent='示意组 0'+(state.group+1);$('#run-value').textContent=state.hold?'已暂停':'运行';$('#hold-key').innerHTML=(state.hold?'继续':'暂停')+' <small>HOLD</small>';$('#hold-key').setAttribute('aria-pressed',state.hold);
 core.setLevel(state.levels[state.group]);core.setEnergy(state.hold?.06:state.levels[state.group]/100);
 $$('[data-look]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.look===state.look));$('#export').textContent=state.look==='product'?'导出材质 GLB ↓':'导出灰模 GLB ↓';
 $('#stage-note').textContent=state.look==='product'?'蓝紫光学窗 / 琥珀导光 / 深钛金属':'A 方向 · 灰模对照';
 $$('.group-track i').forEach((el,i)=>{el.classList.toggle('selected',i===state.group);el.style.opacity=.25+state.levels[i]/100*.75;});
 $$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===state.mode));$$('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===state.view));$$('[data-part]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.part)===state.part));$$('[data-port]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.port)===state.port));
}
function setLook(value){
 state.look=value==='gray'?'gray':'product';core.setLook(state.look);const product=state.look==='product';
 hemi.intensity=product?.4:2;light.intensity=product?1.5:3.5;fill.intensity=product?1.8:1.8;under.intensity=product?.65:1.5;
 scene.environment=product?studioTarget.texture:envTarget.texture;scene.environmentIntensity=product?.75:.25;renderer.toneMappingExposure=product?1:1.05;bloom.enabled=product;
 floor.material.color.set(product?'#0b0c13':'#161922');floor.material.metalness=0;floor.material.roughness=.95;floor.material.envMapIntensity=product?.015:1;
 scene.background.set(product?'#10111b':'#191c24');scene.fog.color.copy(scene.background);sync();
}
$$('[data-look]').forEach(b=>b.onclick=()=>setLook(b.dataset.look));
function frame(view,immediate=false){
 state.view=view;core.group.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(core.group),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
 const direction={hero:new T.Vector3(.50,.85,1.6),top:new T.Vector3(0,1,.001),rear:new T.Vector3(0,.17,-1),bottom:new T.Vector3(0,-1,.001)}[view].normalize();
 const extent=(view==='top'||view==='bottom')?Math.max(size.z,size.x/camera.aspect):Math.max(size.y+size.z*.5,size.x/camera.aspect);
 const distance=extent/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*1.27+1.15;
 const to=center.clone().addScaledVector(direction,distance);
 if(immediate||matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.copy(to);controls.target.copy(center);controls.update();tween=null;}else tween={start:performance.now(),from:camera.position.clone(),target:controls.target.clone(),to,center};sync();
}
function part(index){state.part=index;state.port=-1;core.highlight(index);$('#part-copy').textContent=index<0?'选择一组结构，查看它在整机中的位置。':details[index];sync();}
function mode(value){state.mode=value;state.explode=value==='structure'?.68:0;core.setExplode(state.explode);part(-1);$('#structure-controls').hidden=value!=='structure';$('#port-controls').hidden=value!=='ports';$('#mode-title').textContent={whole:'让空间，有序回应。',structure:'拆开，看清连接。',ports:'把连接，藏在背后。'}[value];$('#mode-copy').textContent={whole:'长条光学窗显示状态；右侧旋钮与三键完成基础操作。先确认比例与装配关系。',structure:'五组结构分别查看。拖动拆解距离可回到完整装配；此视图用于解释装配层级。',ports:'后部凹槽收纳三类功能接口。标签与功能一一对应，避免从正面看到线缆。'}[value];$('#stage-note').textContent={whole:'A 方向 · 独立产品灰模',structure:'五组结构 · 装配层级示意',ports:'PWR / LINK / SERVICE · 功能位置预留'}[value];frame(value==='ports'?'rear':'hero');sync();}
function action(name){const index=['scene','group','hold'].indexOf(name);if(index<0)return;presses[index]=performance.now()+170;if(name==='scene')state.scene=(state.scene+1)%3;if(name==='group')state.group=(state.group+1)%3;if(name==='hold')state.hold=!state.hold;sync();}
$$('[data-mode]').forEach(b=>b.onclick=()=>mode(b.dataset.mode));$$('[data-view]').forEach(b=>b.onclick=()=>frame(b.dataset.view));$$('[data-part]').forEach(b=>b.onclick=()=>part(state.part===+b.dataset.part?-1:+b.dataset.part));
$$('[data-port]').forEach(b=>b.onclick=()=>{state.port=+b.dataset.port;core.highlight(3);$('#port-copy').textContent=portCopy[state.port];frame('rear');sync();});
$$('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));$('#level').oninput=e=>{state.levels[state.group]=+e.target.value;sync();};$('#explode').oninput=e=>{state.explode=+e.target.value/100;core.setExplode(state.explode);frame(state.view,true);sync();};
$('#reset').onclick=()=>{Object.assign(state,{scene:0,group:0,levels:[60,60,60],hold:false});mode('whole');$('#status').textContent='';};
const ray=new T.Raycaster(),pointer=new T.Vector2();let startPointer=null;
canvas.addEventListener('pointerdown',e=>startPointer=[e.clientX,e.clientY]);canvas.addEventListener('pointerup',e=>{if(!startPointer||Math.hypot(e.clientX-startPointer[0],e.clientY-startPointer[1])>5)return;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObject(core.group,true)[0];if(hit){let obj=hit.object;while(obj&&!obj.userData.action)obj=obj.parent;if(obj)action(obj.userData.action);}});
async function exportModel(){
 const e=state.explode,p=state.part,port=state.port;core.setExplode(0);core.highlight(-1);core.keys.forEach((_,i)=>core.press(i,0));
 try{const buffer=await new GLTFExporter().parseAsync(core.group,{binary:true});const blob=new Blob([buffer],{type:'model/gltf-binary'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=state.look==='product'?'20261029-CORE轴台材质-v001.glb':'20261029-CORE轴台灰模对照-v001.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#status').textContent='已导出当前材质的装配模型，保留五组结构命名。';return buffer;}catch(error){$('#status').textContent='导出失败：'+error.message;throw error;}finally{core.setExplode(e);core.highlight(port>=0?3:p);}
}
$('#export').onclick=exportModel;
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();frame(state.view,true);}new ResizeObserver(resize).observe(stage);controls.addEventListener('start',()=>tween=null);
function animate(now){if(tween){const u=Math.min(1,(now-tween.start)/650),s=u*u*(3-2*u);camera.position.lerpVectors(tween.from,tween.to,s);controls.target.lerpVectors(tween.target,tween.center,s);if(u===1)tween=null;}core.keys.forEach((_,i)=>core.press(i,now<presses[i]?1:0));controls.update();floor.visible=camera.position.y>.03;composer.render();}renderer.setAnimationLoop(animate);resize();setLook(state.look);sync();$('#loading').hidden=true;
window.coreLab={state,core,camera,controls,frame,mode,action,exportModel,setLook};
