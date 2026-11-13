import {mountJourneyLoader} from '/assets/brand/effects-v001/loader.js';
import {createCinematicWorld} from './cinematic-world.js';
import {DURATION,SUBJECTS,CHAPTERS,sampleJourney,sampleChapter} from './journey-timeline.mjs';
import {createJourneyTransport,advanceJourney,pauseJourney,seekJourney,playJourney,wheelJourney} from './journey-transport.mjs';
import {getProductPage} from './journey-products.mjs';
import {createJourneyAudio} from './journey-audio.mjs';

const $=id=>document.getElementById(id),canvas=document.querySelector('canvas'),dialog=$('product-dialog'),caption=document.querySelector('.caption');
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let world,ready=false,state=createJourneyTransport(0,reduced?'paused':'explore'),preferredMode='explore',last=0,chapter=-1,infoKey=null,openedKey=null,savedFrame=null,opener=null,renderTime=0,touch=null;
const intervals=[];
const audio=createJourneyAudio();
let opticsEnabled=true;
for(const c of CHAPTERS){
 const b=document.createElement('button');b.type='button';b.dataset.seek=c.at;
 b.setAttribute('aria-label',c.label);b.title=c.label;
 b.innerHTML='<span class="chapter-point" aria-hidden="true"></span>';
 b.onclick=()=>seek(c.at);document.querySelector('.chapter-nav').append(b);
}

function pause(){state=pauseJourney(state);audio.update(state.time,false);}
function seek(t,immediate=false){if(dialog.open)return;state=seekJourney(state,t,immediate||reduced);}
function play(){
 if(dialog.open||!ready)return;
 if(reduced){const current=sampleChapter(state.time).index;seek(CHAPTERS[(current+1)%CHAPTERS.length].at,true);return;}
 state=state.playing?pauseJourney(state):playJourney(state,preferredMode);
}
function openInfo(key){
 const page=getProductPage(key);if(!page||!ready)return false;
 if(!dialog.open){pause();world.environment?.clearInteraction();world.optics?.clear();savedFrame={time:state.time,scroll:scrollY};opener=document.activeElement;document.body.classList.add('info-open');}
 openedKey=key;$('info-kicker').textContent=page.kicker;$('info-title').textContent=page.title;$('info-summary').textContent=page.summary;$('info-body').innerHTML=page.content;
 if(!dialog.open)dialog.showModal();dialog.scrollTop=0;$('info-close').focus({preventScroll:true});last=0;updateUI();return true;
}
function finishInfo(){
 if(!savedFrame)return;
 document.body.classList.remove('info-open');openedKey=null;
 state=createJourneyTransport(savedFrame.time,'paused');savedFrame=null;
 last=0;updateUI();if(opener?.isConnected)opener.focus({preventScroll:true});opener=null;
}
function closeInfo(){if(dialog.open){dialog.close();finishInfo();}}
dialog.addEventListener('cancel',e=>{e.preventDefault();closeInfo();});
dialog.addEventListener('close',()=>{if(!dialog.open)finishInfo();});
dialog.addEventListener('keydown',e=>{
 if(e.key!=='Tab')return;
 const controls=[...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select,textarea')].filter(el=>el.getClientRects().length);
 const first=controls[0],last=controls.at(-1);
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
});
dialog.addEventListener('click',e=>{const button=e.target.closest('[data-info]');if(button)openInfo(button.dataset.info);});
dialog.addEventListener('wheel',e=>e.stopPropagation(),{passive:true});
dialog.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});
$('info-close').onclick=closeInfo;$('info-return').onclick=closeInfo;
$('about').onclick=()=>openInfo('about');$('products').onclick=()=>openInfo('products');
$('chapter-info').onclick=()=>openInfo(infoKey);
$('ending-actions').addEventListener('click',e=>{const button=e.target.closest('[data-info]');if(button)openInfo(button.dataset.info);});

function viewingTime(time){
 if(!reduced)return time;
 const index=sampleChapter(time).index;
 if(index===3)return time>=58&&time<66?62:42;
 if(index===4)return time>=88?90:73;
 return [4.5,14,24][index];
}
function updateUI(){
 const t=state.time,c=sampleChapter(viewingTime(t)),ending=c.informationKey==='ending';
 if(c.index!==chapter){chapter=c.index;$('chapter').textContent=`${String(chapter+1).padStart(2,'0')} / ${c.chapter.code}`;document.querySelectorAll('[data-seek]').forEach((b,i)=>b.setAttribute('aria-current',String(i===chapter)));}
 const title=ending?'让光，成为\n世界的结构。':c.chapter.title,description=ending?'相原 PHASE ORIGIN · 新生世界核':c.chapter.description;
 if($('title').textContent!==title)$('title').textContent=title;
 if($('description').textContent!==description)$('description').textContent=description;
 caption.style.opacity=c.opacity;caption.inert=c.opacity<.65;
 infoKey=c.informationKey;$('chapter-info').hidden=!infoKey||ending;
 if(infoKey&&!ending)$('chapter-info').innerHTML=`${c.informationLabel} <span aria-hidden="true">↗</span>`;
 $('ending-actions').hidden=!ending;
 const playbackName=preferredMode==='explore'?'探索':'导览';
 $('play').innerHTML=reduced?'下一章节 <span aria-hidden="true">→</span>':state.playing?`暂停${playbackName} <span aria-hidden="true">Ⅱ</span>`:t>DURATION-.05?'重播体验 <span aria-hidden="true">↺</span>':`继续${playbackName} <span aria-hidden="true">↗</span>`;
 $('pace').hidden=reduced;$('pace').textContent=preferredMode==='explore'?'慢行探索 ↔':'完整导览 ↔';$('pace').setAttribute('aria-label',preferredMode==='explore'?'切换到完整导览':'切换到慢行探索');
 $('play').setAttribute('aria-pressed',String(state.playing));$('motion').setAttribute('aria-pressed',String(reduced));$('motion').textContent=reduced?'恢复动态':'减弱动态';
}
$('play').onclick=play;$('restart').onclick=()=>seek(0);
$('pace').onclick=()=>{if(!ready||dialog.open||reduced)return;preferredMode=preferredMode==='explore'?'auto':'explore';if(state.playing)state=playJourney(state,preferredMode);updateUI();};
$('motion').onclick=()=>{reduced=!reduced;pause();world?.environment?.clearInteraction();world?.optics?.clear();updateUI();};
$('optics').onclick=()=>{opticsEnabled=!opticsEnabled;world?.optics?.setEnabled(opticsEnabled);$('optics').textContent=opticsEnabled?'光效开':'光效关';$('optics').setAttribute('aria-pressed',String(opticsEnabled));$('optics').setAttribute('aria-label',opticsEnabled?'关闭光学氛围':'开启光学氛围');};
$('sound').onclick=async()=>{
 $('sound').disabled=true;
 try{const on=await audio.toggle();$('sound').setAttribute('aria-pressed',String(on));$('sound').textContent=on?'声音开启':'声音关闭';audio.update(state.time,state.playing);}
 finally{$('sound').disabled=false;}
};
function accelerate(pixels){if(!Number.isFinite(pixels)||Math.abs(pixels)<.5)return;if(reduced){seek(state.target+pixels*.012,true);return;}preferredMode='explore';state=wheelJourney(state,pixels);}
function inputControl(target){return target?.closest?.('input,textarea,select,[contenteditable="true"]');}
addEventListener('wheel',e=>{
 if(!ready||dialog.open||e.ctrlKey||inputControl(e.target))return;
 if(Math.abs(e.deltaX)>Math.abs(e.deltaY)){e.preventDefault();return;}
 const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
 e.preventDefault();accelerate(pixels);
},{passive:false});
addEventListener('touchstart',e=>{const p=e.touches[0];touch=ready&&!dialog.open&&!e.target?.closest?.('button,a,input,textarea,select,[contenteditable="true"]')&&e.touches.length===1?{x:p.clientX??0,y:p.clientY,last:p.clientY,locked:false}:null;},{passive:true});
addEventListener('touchmove',e=>{
 if(!touch||dialog.open||e.touches.length!==1){touch=null;return;}
 const p=e.touches[0],dx=Math.abs((p.clientX??0)-touch.x),dy=Math.abs(p.clientY-touch.y);
 if(!touch.locked){if(dx>8&&dx>dy){touch=null;return;}if(dy<8)return;touch.locked=true;}
 const delta=touch.last-p.clientY;touch.last=p.clientY;e.preventDefault();accelerate(delta*1.3);
},{passive:false});
addEventListener('touchend',()=>{touch=null;},{passive:true});addEventListener('touchcancel',()=>{touch=null;},{passive:true});
addEventListener('pointermove',e=>{
 if(!ready||dialog.open||reduced||e.pointerType==='touch'){world?.environment?.setPointer(null);world?.optics?.clear();return;}
 const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
 world.optics?.setPointer({x,y,control:!!e.target?.closest?.('button,a,input,select,textarea')});
 world.environment?.setPointer(e.target===canvas?{x:x*2-1,y:1-y*2}:null);
},{passive:true});
addEventListener('pointerdown',e=>{if(ready&&!dialog.open&&!reduced&&e.pointerType==='mouse'&&e.target===canvas){const r=canvas.getBoundingClientRect();world.optics?.setPointer({x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height});world.optics?.press();}},{passive:true});
addEventListener('pointerout',e=>{if(!e.relatedTarget){world?.environment?.setPointer(null);world?.optics?.setPointer(null);}},{passive:true});
addEventListener('blur',()=>{world?.environment?.clearInteraction();world?.optics?.clear();});
// Input controls story time directly. Native focus/scroll movement must never seek the camera.
addEventListener('keydown',e=>{const tag=document.activeElement.tagName;if(dialog.open||['INPUT','A','SELECT','TEXTAREA'].includes(tag))return;if(e.code==='Space'){if(tag==='BUTTON')return;e.preventDefault();play();}else if(['Home','End'].includes(e.code)){e.preventDefault();seek(e.code==='Home'?0:DURATION);}else if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','PageDown','PageUp'].includes(e.code)){e.preventDefault();const dir=['ArrowDown','ArrowRight','PageDown'].includes(e.code)?1:-1;if(reduced)seek(state.target+dir*8,true);else accelerate(dir*(e.code.startsWith('Page')?450:120));}});
document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){pause();world?.environment?.clearInteraction();world?.optics?.clear();}});
function resize(){$('scroll-space').style.height=`${innerHeight}px`;world?.resize();}addEventListener('resize',resize);
function animate(now){
 const dt=last?(now-last)/1000:0;last=now;
 if(ready&&!document.hidden&&!dialog.open){
  if(dt>0&&dt<1){intervals.push(dt*1000);if(intervals.length>10000)intervals.shift();}
  state=reduced?pauseJourney(seekJourney(state,state.target,true)):advanceJourney(state,dt);
  renderTime=viewingTime(state.time);world.render(renderTime,reduced,dt>0&&dt<1?dt:0);audio.update(state.time,state.playing);updateUI();
 }
 requestAnimationFrame(animate);
}
history.scrollRestoration='manual';window.scrollTo(0,0);resize();
window.cinema={get ready(){return ready;},seek,play,pause,openInfo,closeInfo,transitionCoverage(t){return world.transitionCoverage(t);},report(){const s=[...intervals].sort((a,b)=>a-b);return {...world?.report(),...state,storyTime:state.time,renderTime,duration:DURATION,chapter:sampleChapter(state.time).index+1,informationKey:infoKey,panel:dialog.open?openedKey:null,info:dialog.open?openedKey:null,reducedMotion:reduced,soundEnabled:audio.enabled,frameTime:{samples:s.length,median:s[Math.floor(s.length*.5)]||0,p95:s[Math.floor(s.length*.95)]||0},scroll:scrollY};},resetMetrics(){intervals.length=0;},inspect(){return {camera:world.camera,models:world.models,scene:world.scene,environment:world.environment};}};
let loading;
try{loading=await mountJourneyLoader($('loading'));world=await createCinematicWorld(canvas,(_text,progress)=>loading.update(progress),{subjects:SUBJECTS,sample:sampleJourney,full:true,railUrl:'/assets/cinematic-journey/v002/camera.json'});world.optics?.setEnabled(opticsEnabled);resize();await loading.complete();ready=true;$('play').disabled=false;updateUI();requestAnimationFrame(animate);}catch(error){console.error(error);loading?.fail();document.body.classList.remove('journey-loading');$('loading').hidden=true;$('error').hidden=false;$('error-detail').textContent=error.message;}
