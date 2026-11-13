export const areaKeys=['overview','guide','enclose','ambient'];
export const presets=['welcome','exhibit','quiet'];
export const presetNames={welcome:'迎宾',exhibit:'展览',quiet:'静谧'};
export const multipliers={welcome:[1,.7,.55],exhibit:[.7,1,.8],quiet:[.35,.6,.9]};
export const areas={
 overview:{name:'叙事全景',en:'THE PHASE COURT',title:'从一道光，进入一个场。',text:'从入口接待走向中央光场，再透过门洞进入后场材料档案。建筑、展台与光叶共同组织一段连续的参观体验。',target:[1,3.2,-3],camera:[-18,4.5,16],group:-1},
 guide:{name:'入口导向',en:'01 / ARRIVAL',title:'光，引导第一次发现。',text:'低顶入口与轴台接待先收拢视线。两侧光叶安装在连续展台上，顺次开合，引向中央挑高展区。',target:[-4,3.5,-1],camera:[-8,3.8,14],group:0},
 enclose:{name:'中央围合',en:'02 / THE MAIN EXHIBIT',title:'在展开之处，停留。',text:'悬吊椭圆顶棚呼应弧形展台。八个光叶形成开放的围合，中央相态雕塑成为共同观看的焦点。',target:[1,4,-3],camera:[0,4.6,12],group:1},
 ambient:{name:'后场氛围',en:'03 / THE ARCHIVE',title:'光的余韵，成为档案。',text:'穿过透光门框，进入更安静的材料档案区。光叶沿弧形边界呼吸，壁龛与座位把观看转化为停留。',target:[14,3.3,-8],camera:[10.8,4,1.5],group:2}
};
// A reversible walking spine keeps the camera in front of the exhibit islands.
const walk=[[-18,4.5,16],[-12.5,4.1,15.4],[-8,3.8,14],[-2,4.3,14],[0,4.6,12],[8,4.2,8],[10.8,4,1.5]];
const anchor={overview:0,guide:2,enclose:4,ambient:6};
export function cameraRoute(from,to,position){
 const a=anchor[from],b=anchor[to];if(a===undefined||b===undefined)return null;
 const points=[position||areas[from].camera];if(a===b){points.push(areas[to].camera);return points;}
 const step=b>a?1:-1;for(let i=a+step;step>0?i<=b:i>=b;i+=step)points.push(walk[i]);return points;
}
export function layout(){const nodes=[];
 for(let i=0;i<6;i++)nodes.push({x:i%2?-5:-11,z:10-Math.floor(i/2)*3.5,yaw:i%2?-Math.PI/2:Math.PI/2,y:.62,group:0,local:i});
 for(let i=0;i<8;i++){const a=(200+i*40)*Math.PI/180,x=1+5.8*Math.cos(a),z=-3+5.8*Math.sin(a);nodes.push({x,z,yaw:Math.atan2(1-x,-3-z),y:.62,group:1,local:i});}
 for(let i=0;i<6;i++){const a=(-150+i*48)*Math.PI/180,x=14+4.5*Math.cos(a),z=-8+4.5*Math.sin(a);nodes.push({x,z,y:.62,yaw:Math.atan2(14-x,-8-z),group:2,local:i});}
 return nodes;
}
export const nodes=layout();
export function createSystem({reduced=false}={}){const state={area:'overview',preset:'exhibit',group:-1,levels:[70,70,70],phase:0,running:!reduced};return {state,selectArea(a){if(!areas[a])throw Error('Unknown area');state.area=a;state.group=areas[a].group;},nextPreset(){state.preset=presets[(presets.indexOf(state.preset)+1)%3];},setPreset(p){if(!presets.includes(p))throw Error('Unknown preset');state.preset=p;},selectGroup(g){if(![-1,0,1,2].includes(g))throw Error('Unknown group');state.group=g;},nextGroup(){state.group=state.group===2?-1:state.group+1;},setLevel(v){v=Number(v);if(!Number.isFinite(v))return;v=Math.max(0,Math.min(100,v));if(state.group<0)state.levels.fill(v);else state.levels[state.group]=v;},toggleHold(){state.running=!state.running;},tick(dt){if(state.running)state.phase+=Math.max(0,Math.min(dt,.1))*.65;}};}
export function sampleLeaf(s,i){const n=nodes[i],p=s.phase;let angle,amount;
 if(n.group===0){const k=(.5+.5*Math.sin(p-Math.floor(n.local/2)*.85))**3;angle=30+44*k;amount=.22+.78*k;}
 if(n.group===1){const k=.5+.5*Math.sin(p*.45+n.local*.17);angle=92+8*k;amount=.8+.14*k;}
 if(n.group===2){const k=.5+.5*Math.sin(p*.78-n.local*.28);angle=46+34*k;amount=.35+.65*k;}
 return{angle,energy:s.levels[n.group]/100*multipliers[s.preset][n.group]*amount,group:n.group};
}
