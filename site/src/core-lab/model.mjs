import * as T from '/vendor/three/build/three.module.js';
const material=(color,metalness=.25,roughness=.45)=>new T.MeshStandardMaterial({color,metalness,roughness});
function mesh(g,m,name,parent,p=[0,0,0]){const o=new T.Mesh(g,m);o.name=name;o.position.fromArray(p);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function box(w,h,d,m,name,parent,p){return mesh(new T.BoxGeometry(w,h,d),m,name,parent,p);}
function path(points){const s=new T.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();return s;}
function outline(w,d,c,x=0,z=0){return [[-w/2+c,-d/2],[w/2-c,-d/2],[w/2,-d/2+c],[w/2,d/2-c],[w/2-c,d/2],[-w/2+c,d/2],[-w/2,d/2-c],[-w/2,-d/2+c]].map(([a,b])=>[a+x,b+z]);}
function slab(shape,height,bevel=.025){const g=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1,curveSegments:12});g.rotateX(-Math.PI/2);return g;}
export function createCore(){
 const group=new T.Group();group.name='CORE_AXIS_Prototype';group.userData={role:'independent product prototype',units:'dimensionless',direction:'A / AXIS'};
 const shell=material('#89909b',.45,.38),dark=material('#353b46',.4,.4),glass=material('#b4bbc9',.18,.34),gasket=material('#252a32',.1,.65),indicator=material('#cebaa2',.3,.4),keyMat=material('#6a7382',.45,.4);
 const parts=['Chassis_and_Top_Frame','Optical_Window','Control_Cluster','Rear_Interface','Bottom_Service_Plate'].map(name=>{const g=new T.Group();g.name=name;group.add(g);return g;});
 // U-shaped shell leaves a real opening in the rear wall for the recessed bay.
 const shellPlan=[[-1.6,-1],[-2.98,-1],[-3.3,-.68],[-3.3,.68],[-2.98,1],[2.98,1],[3.3,.68],[3.3,-.68],[2.98,-1],[1.6,-1],[1.6,-.82],[2.88,-.82],[3.1,-.6],[3.1,.6],[2.88,.82],[-2.88,.82],[-3.1,.6],[-3.1,-.6],[-2.88,-.82],[-1.6,-.82]];
 mesh(slab(path(shellPlan),.46),shell,'Hollow_Chassis',parts[0],[0,.25,0]);
 const top=path(outline(6.6,2,.32));top.holes.push(new T.Path(path(outline(4.66,1.59,.24,-.70)).getPoints().reverse()));
 mesh(slab(top,.09,.018),shell,'Top_Frame_with_Opening',parts[0],[0,.73,0]);
 const seal=path(outline(4.64,1.57,.23,-.70));seal.holes.push(new T.Path(path(outline(4.48,1.41,.2,-.70)).getPoints().reverse()));mesh(slab(seal,.035,.005),gasket,'Optical_Window_Gasket',parts[0],[0,.785,0]);
 const opticalWindow=mesh(slab(path(outline(4.44,1.37,.19,-.70)),.045,.035),glass,'Optical_Cover',parts[1],[0,.81,0]);
 box(3.83,.012,.025,indicator,'State_Light_Guide',parts[1],[-.70,.895,0]);
 for(const z of[-.35,.35])box(3.7,.008,.008,keyMat,'Optical_Linear_Detail',parts[1],[-.70,.894,z]);
 // Separate dial pivot, physical pointer, grip ribs and functional keys.
 mesh(new T.CylinderGeometry(.39,.39,.045,64),dark,'Dial_Seat',parts[2],[2.44,.856,-.27]);
 const dial=new T.Group();dial.name='Brightness_Dial';dial.position.set(2.44,.965,-.27);parts[2].add(dial);
 mesh(new T.CylinderGeometry(.325,.34,.19,64),shell,'Dial_Body',dial);mesh(new T.CylinderGeometry(.31,.31,.018,64),keyMat,'Dial_Cap',dial,[0,.105,0]);
 for(let i=0;i<48;i++){const a=i/48*Math.PI*2;const rib=box(.014,.13,.018,dark,'Dial_Grip_'+i,dial,[Math.sin(a)*.335,0,Math.cos(a)*.335]);rib.rotation.y=a;}
 box(.024,.008,.12,indicator,'Dial_Index',dial,[0,.119,-.19]);
 const keys=[];for(const [i,name]of ['Scene_Key','Group_Key','Hold_Key'].entries()){
  const x=1.93+i*.45;box(.34,.022,.31,gasket,name+'_Socket',parts[2],[x,.837,.49]);const b=mesh(slab(path(outline(.29,.25,.045)),.035,.012),keyMat,name,parts[2],[x,.862,.49]);b.userData.action=['scene','group','hold'][i];keys.push(b);
  if(i===0)for(let n=0;n<3;n++)box(.14-n*.025,.004,.013,indicator,'Scene_Icon',b,[0,.052,-.045+n*.045]);
  if(i===1)for(const xx of[-.05,.05])for(const zz of[-.04,.04])mesh(new T.CylinderGeometry(.018,.018,.004,12),indicator,'Group_Icon',b,[xx,.052,zz]);
  if(i===2)for(const xx of[-.035,.035])box(.018,.004,.10,indicator,'Hold_Icon',b,[xx,.052,0]);
 }
 // Generic apertures reserve functions; deliberately not USB/RJ45 or a selected bus standard.
 box(3.12,.38,.075,dark,'Rear_Recess_Backplate',parts[3],[0,.49,-.76]);const ports=[];
 for(const [i,name]of ['PWR','LINK','SERVICE'].entries()){
  const g=new T.Group();g.name=name;g.position.set((i-1)*1.02,.49,-.83);g.userData.function=name;parts[3].add(g);ports.push(g);
  box(.70,.245,.055,shell,name+'_Frame',g,[0,0,0]);box(.57,.135,.065,gasket,name+'_Placeholder',g,[0,0,-.045]);
 }
 mesh(slab(path(outline(6.38,1.82,.3)),.095,.018),dark,'Service_Base',parts[4],[0,.145,0]);
 const access=path(outline(4.1,1.25,.15));mesh(slab(access,.025,.012),keyMat,'Removable_Service_Cover',parts[4],[0,.112,0]);
 for(const x of[-2.78,2.78])for(const z of[-.6,.6]){mesh(new T.CylinderGeometry(.14,.14,.10,24),gasket,'Foot',parts[4],[x,.05,z]);const screw=mesh(new T.CylinderGeometry(.047,.047,.017,16),shell,'Base_Fastener',parts[4],[x,.124,z]);box(.05,.003,.008,dark,'Fastener_Slot',screw,[0,-.011,0]);}
 for(let i=0;i<11;i++)box(.035,.008,.34,gasket,'Vent_Reserve',parts[4],[-1.05+i*.21,.098,0]);
 const original=new Map();const selected=material('#bca486',.25,.45);
 function highlight(index){parts.forEach((p,i)=>p.traverse(o=>{if(o.isMesh){if(!original.has(o))original.set(o,o.material);o.material=i===index?selected:original.get(o);}}));}
 function setExplode(value){const e=T.MathUtils.clamp(value,0,1);parts[0].position.set(0,e*.42,0);parts[1].position.set(0,e*1.65,0);parts[2].position.set(0,e*.95,0);parts[3].position.set(0,e*.45,-e*.8);parts[4].position.set(0,0,0);group.userData.explode=e;}
 function setLevel(value){const v=T.MathUtils.clamp(value,0,100);dial.rotation.y=T.MathUtils.degToRad(-135+v*2.7);group.userData.level=v;}
 function press(index,amount){keys[index].position.y=.862-T.MathUtils.clamp(amount,0,1)*.018;}
 setExplode(0);setLevel(60);return {group,parts,keys,ports,dial,window:opticalWindow,highlight,setExplode,setLevel,press};
}
