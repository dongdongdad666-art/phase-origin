export const scenes=['guide','enclose','ambient'];
export const sceneCopy={guide:{name:'导向',en:'A PATH OF LIGHT',title:'光，带你向前。',text:'两列光叶留出中央通道。暖光和开合顺次传递，让路径的方向可以被看见。',rhythm:'顺次传递 · 约 9 秒循环'},enclose:{name:'围合',en:'AN OPEN BOUNDARY',title:'有边界，也有入口。',text:'开放弧列围出一个停留空间。光叶保持较大的展开角度，形成有缝隙、可穿透的边界。',rhythm:'稳定展开 · 轻微起伏'},ambient:{name:'氛围',en:'A SHARED BREATH',title:'让空间，慢慢呼吸。',text:'三组光叶错落分布。开合与暖光以不同相位缓慢呼吸，让人可以走进光场之间。',rhythm:'分组呼吸 · 约 12 秒循环'}};
export function layouts(key){
 if(!scenes.includes(key))throw Error('Unknown ARRAY scene');
 return Array.from({length:12},(_,i)=>{let x,z,yaw=0;
  if(key==='guide'){x=(i%2===0?-1:1)*3.6;z=(Math.floor(i/2)-2.5)*3.1;yaw=i%2===0?Math.PI/2:-Math.PI/2;}
  if(key==='enclose'){const a=(135+i*270/11)*Math.PI/180;x=7*Math.cos(a);z=7*Math.sin(a);yaw=Math.atan2(-x,-z);}
  if(key==='ambient'){const g=Math.floor(i/4),j=i%4;x=(j-1.5)*3.25+(g===1?.7:0);z=(g-1)*4.4+(j%2?.45:-.45);yaw=(j-1.5)*.18;}
  return {x,z,yaw,group:Math.floor(i/4)};
 });
}
export function createSystem({reduced=false}={}){
 const state={scene:'guide',group:-1,levels:[70,70,70],phase:0,running:!reduced};
 return {state,setScene(value){if(!scenes.includes(value))throw Error('Unknown ARRAY scene');state.scene=value;state.phase=0;},selectGroup(value){if(![-1,0,1,2].includes(value))throw Error('Unknown group');state.group=value;},nextGroup(){state.group=state.group===2?-1:state.group+1;},setLevel(value){value=Math.min(100,Math.max(0,Number(value)));if(!Number.isFinite(value))return;if(state.group<0)state.levels.fill(value);else state.levels[state.group]=value;},toggleHold(){state.running=!state.running;},tick(dt){if(state.running)state.phase+=Math.max(0,Math.min(.1,dt))*(state.scene==='ambient'?.52:.7);}};
}
export function sampleLeaf(state,index){const group=Math.floor(index/4),phase=state.phase;let angle,amount;
 if(state.scene==='guide'){const p=(.5+.5*Math.sin(phase-Math.floor(index/2)*.72))**3;angle=28+46*p;amount=.18+.82*p;}
 if(state.scene==='enclose'){const p=.5+.5*Math.sin(phase*.5+index*.12);angle=91+8*p;amount=.78+.16*p;}
 if(state.scene==='ambient'){const p=.5+.5*Math.sin(phase-group*1.35-(index%4)*.2);angle=40+40*p;amount=.32+.68*p;}
 return {angle,energy:state.levels[group]/100*amount,group};
}
