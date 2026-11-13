export function connectHero(){
 const host=document.querySelector('.scene-hotspot');
 if(!host)return null;
 const trigger=host.querySelector('button'),card=document.getElementById('leaf-info');
 const controller=new AbortController(),options={signal:controller.signal};
 let pinned=false,hover=false,scrollFrame=0,hasProjection=false;
 const open=value=>{host.dataset.open=String(value);trigger.setAttribute('aria-expanded',String(value));card.inert=!value;};
 host.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hover=true;open(true);}},options);
 host.addEventListener('pointerleave',()=>{hover=false;if(!pinned&&!host.contains(document.activeElement))open(false);},options);
 host.addEventListener('focusin',()=>open(true),options);
 host.addEventListener('focusout',e=>{if(!host.contains(e.relatedTarget)&&!pinned&&!hover)open(false);},options);
 trigger.addEventListener('click',()=>{pinned=!pinned;open(pinned);},options);
 document.addEventListener('pointerdown',e=>{if(!host.contains(e.target)){pinned=false;open(false);}},options);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&host.dataset.open==='true'){pinned=hover=false;if(host.contains(document.activeElement))trigger.focus();open(false);}},options);
 const links=[...document.querySelectorAll('.chapter-rail a')],sections=links.map(a=>document.querySelector(a.hash));
 function track(){scrollFrame=0;let current=0;const line=Math.min(innerHeight*.4,300);sections.forEach((section,i)=>{if(section.getBoundingClientRect().top<=line)current=i;});links.forEach((a,i)=>{if(i===current)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}
 const schedule=()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(track);};
 addEventListener('scroll',schedule,{passive:true,...options});addEventListener('resize',schedule,options);track();
 // Keep the annotation attached to the world-space optical panel, not the viewport.
 function place({x,y,width,height}){
  x+=width<580?72:100;
  x=Math.max(44,Math.min(width-44,x));y=Math.max(28,Math.min(height-28,y));
  host.style.left=x+'px';host.style.top=y+'px';
  if(width<580){host.dataset.side='below';host.style.setProperty('--card-left',Math.max(12-x+40,Math.min(40,width-x-225+26))+'px');}
  else host.dataset.side=x+296<width?'right':'left';
 }
 function fallback(){if(hasProjection)return;const {width,height}=host.parentElement.getBoundingClientRect();place({x:width*.58,y:height*.38,width,height});}
 fallback();addEventListener('resize',fallback,options);
 return {project(value){hasProjection=true;place(value);},dispose(){controller.abort();cancelAnimationFrame(scrollFrame);}};
}
