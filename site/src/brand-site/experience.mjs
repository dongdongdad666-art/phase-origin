import {gsap} from '/vendor/gsap/index.js';
import {experienceStore as store} from './experience-state.mjs';

export function connectExperience(viewer){
 const root=document.querySelector('.opening'),canvas=document.getElementById('object-viewer');
 const trigger=document.getElementById('leaf-activate'),back=document.getElementById('focus-return');
 const left=root.querySelector('.opening-type'),controls=root.querySelector('.object-controls'),hotspot=root.querySelector('.scene-hotspot');
 const range=document.getElementById('opening-angle'),output=document.getElementById('angle-value'),play=document.getElementById('object-play'),status=document.getElementById('focus-status');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),abort=new AbortController(),events={signal:abort.signal};
 const hidden=[left,controls,hotspot,trigger];let timeline,context,holdTween,saved,pointer,returnFocus=false,pausedForVisibility=false,disposed=false;
 const frame={angle:viewer.state.angle,focus:0};
 function readout(){range.value=Math.round(viewer.state.angle);output.textContent=Math.round(viewer.state.angle)+'°';play.setAttribute('aria-pressed',String(viewer.state.playing));play.querySelector('.action-main').textContent=viewer.state.playing?'暂停演示':'播放演示';}
 function lock(value){range.disabled=play.disabled=value;viewer.setInteractionLocked(value);}
 function releaseCapture(){const held=pointer;pointer=null;if(held?.target.hasPointerCapture(held.id))held.target.releasePointerCapture(held.id);}
 function save(){saved={angle:viewer.state.angle,playing:viewer.state.playing};viewer.setPlaying(false);lock(true);store.update({angle:saved.angle,autoplay:false});readout();}
 function restore(){
  if(disposed)return;
  holdTween?.kill();timeline?.kill();context?.revert();timeline=context=holdTween=null;releaseCapture();
  viewer.setFocus(0,saved?.angle??viewer.state.angle);viewer.setPlaying(!!saved?.playing&&!reduced.matches);lock(false);
  hidden.forEach(e=>e.inert=false);back.hidden=true;back.disabled=false;
  store.update({focusProgress:0,holdProgress:0,angle:viewer.state.angle,autoplay:viewer.state.playing});
  store.transition('idle');readout();status.textContent='已返回全景。';
  if(returnFocus)trigger.focus({preventScroll:true});returnFocus=false;saved=null;
 }
 function cancelHold(){if(store.snapshot.mode!=='holding')return;holdTween?.kill();holdTween=null;releaseCapture();restore();status.textContent='已取消长按。';}
 function render(){viewer.setFocus(frame.focus,frame.angle);store.update({angle:frame.angle,focusProgress:frame.focus,autoplay:false});readout();}
 function enter(){
  if(!['idle','holding'].includes(store.snapshot.mode))return;
  if(!saved)save();holdTween?.kill();holdTween=null;releaseCapture();store.transition('entering');store.update({holdProgress:1});
  hidden.forEach(e=>e.inert=true);back.hidden=false;back.focus({preventScroll:true});frame.angle=saved.angle;frame.focus=0;
  status.textContent='光叶正在展开，镜头靠近。';
  context=gsap.context(()=>{
   timeline=gsap.timeline({paused:true,defaults:{ease:'power2.inOut'},onUpdate:render,onComplete(){store.transition('focused');status.textContent='光叶已展开。选择返回全景，或按 Escape 返回。';},onReverseComplete:restore});
   timeline.addLabel('release',0).to(left,{autoAlpha:0,duration:.65},'release')
    .to([controls,hotspot,trigger],{autoAlpha:0,duration:.4},'release')
    .addLabel('unfold',.08).to(frame,{angle:120,duration:1.8},'unfold')
    .addLabel('approach',.15).to(frame,{focus:1,duration:2.1},'approach')
    .fromTo(back,{autoAlpha:0},{autoAlpha:1,duration:.4},.35);
  },root);
  if(reduced.matches)timeline.progress(1);else timeline.play();
 }
 function exit(immediate=false){
  if(store.snapshot.mode==='holding'){cancelHold();return;}
  if(!['entering','focused','returning'].includes(store.snapshot.mode))return;
  returnFocus=!immediate;store.transition('returning');status.textContent='正在返回全景。';
  if(immediate||reduced.matches||!timeline?.time())restore();else timeline.timeScale(1.3).reverse();
 }
 function begin(e){
  if(store.snapshot.mode!=='idle'||e.button!==0||e.isPrimary===false)return;
  if(e.currentTarget===canvas&&!viewer.hitTest(e.clientX,e.clientY))return;
  save();store.transition('holding');pointer={id:e.pointerId,x:e.clientX,y:e.clientY,target:e.currentTarget,scroll:scrollY};
  e.currentTarget.setPointerCapture(e.pointerId);status.textContent='保持按住光叶以展开。';
  const hold={progress:0};holdTween=gsap.to(hold,{progress:1,duration:.65,ease:'none',onUpdate(){store.update({holdProgress:hold.progress});},onComplete:enter});
 }
 for(const el of [canvas,trigger]){
  el.addEventListener('pointerdown',begin,events);
  el.addEventListener('pointermove',e=>{if(pointer?.id===e.pointerId&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>12)cancelHold();},events);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,e=>{if(pointer?.id===e.pointerId)cancelHold();},events);
  el.addEventListener('contextmenu',e=>{if(store.snapshot.mode!=='idle')e.preventDefault();},events);
 }
 // Native keyboard/screen-reader activation has detail=0; pointer taps never skip the hold.
 trigger.addEventListener('click',e=>{if(e.detail===0)enter();},events);
 back.addEventListener('click',()=>exit(),events);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&store.snapshot.mode!=='idle'){e.preventDefault();exit();}},events);
 addEventListener('blur',cancelHold,events);
 addEventListener('scroll',()=>{if(pointer&&Math.abs(scrollY-pointer.scroll)>8)cancelHold();if(root.getBoundingClientRect().bottom<72)exit(true);},{passive:true,...events});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelHold();if(timeline?.isActive()){timeline.pause();pausedForVisibility=true;}}else if(pausedForVisibility){pausedForVisibility=false;timeline?.resume();}},events);
 addEventListener('pagehide',()=>{exit(true);},events);
 reduced.addEventListener('change',()=>{if(reduced.matches){if(store.snapshot.mode==='holding')cancelHold();else if(store.snapshot.mode==='returning')restore();else if(store.snapshot.mode==='entering')timeline?.progress(1);}},events);
 canvas.addEventListener('webglcontextlost',()=>{exit(true);store.transition('unavailable');trigger.disabled=true;status.textContent='三维预览已暂停，请刷新后再试。';},events);
 const unsubscribe=store.subscribe(state=>{
  root.dataset.experience=state.mode;
  root.style.setProperty('--focus-progress',state.focusProgress);
  const holding=state.mode==='holding';trigger.querySelector('.action-main').textContent=holding?'保持按住':'长按光叶';
  trigger.querySelector('.action-sub').textContent=holding?`正在唤醒 ${Math.round(state.holdProgress*100)}%`:'让光展开';
 });
 trigger.disabled=false;status.textContent='长按光叶，让光展开。键盘可聚焦长按光叶按钮后按回车。';store.update({angle:viewer.state.angle,autoplay:viewer.state.playing});
 return {get state(){return store.snapshot;},get canInteract(){return store.snapshot.mode==='idle';},exit,sync(){if(store.snapshot.mode==='idle')store.update({angle:viewer.state.angle,autoplay:viewer.state.playing});},dispose(){exit(true);disposed=true;abort.abort();unsubscribe();holdTween?.kill();timeline?.kill();context?.revert();}};
}
