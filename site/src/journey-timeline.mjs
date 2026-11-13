import {SUBJECTS as STUDY_SUBJECTS,sampleStudy,ease} from './cinematic-timeline.mjs';
import {sampleCrossing} from './journey-crossing.mjs';
export {ease};
export const DURATION=96;
export const SUBJECTS={...STUDY_SUBJECTS,
 tree:{position:[18,17.65,-13],scale:54,rotation:.2,version:'phase-deform-v005'},
 blade:{position:[18,29,-9],scale:6.8,rotation:-.45,version:'phase-deform-v005',role:'detail'},
 gate:{position:[18,44,-13],scale:20,rotation:0,version:'transit-gate-v001'}
};
export const CHAPTERS=[
 {at:0,label:'01 抵达',code:'ARRIVAL',title:'一套尚未展开的世界，\n正在抵达。',description:'ARK / 系统运输构型',show:[0,7.1]},
 {at:11.5,label:'02 静候',code:'LATENCY',title:'在展开之前，\n先回应所在之处。',description:'SEED / 封存与环境校准',show:[10.8,16.5]},
 {at:24,label:'03 初光',code:'FIRST LIGHT',title:'从一个核心，\n开始建立连接。',description:'CORE / 控制与状态中心',show:[21.5,30]},
 {at:42,label:'04 共振',code:'RESONANCE',title:'让每一个单元，\n成为整体的一部分。',description:'ARRAY / 空间系统 · LEAF / 光学模块',show:[37.5,65.2]},
 {at:73,label:'05 回应',code:'THE RESPONSE',title:'我们发出的光，\n得到了回应。',description:'GATE / 远端节点连接',show:[71,96]}
];
const INFORMATION_WINDOWS=[
 [3.2,6.6,'deployment','系统如何抵达'],
 [11.4,16,'seed','查看封存结构'],
 [22.5,29,'core','查看生命核'],
 [40,55.5,'array','查看枝网系统'],
 [59,64.5,'leaf','认识光叶'],
 [71.5,76,'gate','查看界环连接'],
 [89,96,'ending','探索产品系统']
];
function boundedTime(seconds){return Math.max(0,Math.min(DURATION,Number.isFinite(seconds)?seconds:0));}
function captionWindow(time,start,end,holdEnd=false){
 return Math.max(0,Math.min(1,ease(start,start+.65,time)*(holdEnd?1:1-ease(end-.65,end,time))));
}
// The five narrative chapters and the reading windows share the scene's absolute time.
export function sampleChapter(seconds){
 const time=boundedTime(seconds),index=time<9.4?0:time<18.2?1:time<34?2:time<68?3:4,chapter=CHAPTERS[index];
 let opacity;
 if(index===3)opacity=Math.max(captionWindow(time,37.5,56.4),captionWindow(time,58.2,65.2));
 else if(index===4)opacity=Math.max(captionWindow(time,71,77),captionWindow(time,88,96,true));
 else opacity=captionWindow(time,...chapter.show);
 const information=INFORMATION_WINDOWS.find(([start,end])=>time>=start&&time<=end);
 return {index,chapter,opacity,informationKey:information?.[2]??null,informationLabel:information?.[3]??''};
}
export function sampleJourney(seconds){
 const time=boundedTime(seconds),old=sampleStudy(time),crossing=sampleCrossing(time);
 const subject=time<9.4?'ark':time<18.2?'capsule':time<34?'core':time<68?'tree':'gate';
 const growth=ease(34,44,time),treeScale=.12+.88*growth;
 const actors={};
 for(const [key,config] of Object.entries(SUBJECTS))actors[key]={visible:subject===key,deployment:old.actors[key]?.deployment??0,reveal:1,scale:config.scale,position:[...config.position],rotation:config.rotation,role:config.role??'hero'};
 if(time>28)actors.core.deployment=1-.85*ease(29.5,33.5,time);
 actors.core.reveal=.24+.76*(1-ease(31.5,34,time));
 actors.tree.scale=SUBJECTS.tree.scale*treeScale;
 // Root stays on the water while the original crown unfolds and the whole tree gains scale.
 actors.tree.position[1]=.05+.3259086*actors.tree.scale;
 actors.tree.deployment=ease(34.2,47,time);
 actors.tree.reveal=(.24+.76*ease(34,36,time))*(.24+.76*(1-ease(66.7,68,time)));
 actors.blade.visible=time>=56&&time<66;actors.blade.deployment=ease(56.5,63,time);
 actors.blade.reveal=ease(56,58,time)*(1-ease(64,66,time));
 actors.gate.deployment=ease(68.5,78.5,time);actors.gate.reveal=.24+.76*ease(68,69.6,time);
 actors.gate.scale=SUBJECTS.gate.scale*crossing.scale;actors.gate.visible=subject==='gate'&&time<84.4;
 actors.gate.reveal*=1-ease(81.6,84.4,time);
 return {time,subject,actors,environment:{growth:ease(30,46,time),altitude:ease(43,72,time),arrival:crossing.sky},transition:{growth:ease(30,32.5,time)*(1-ease(35,39,time)),crown:ease(63.5,67.8,time)*(1-ease(69,72,time))}};
}
