import * as T from '/vendor/three/build/three.module.js';
export const SWEEP_RADIUS=1.25;
const axis=new T.Vector3(0,1,0),r=d=>d*Math.PI/180;
const mat=(color,roughness=.5,metalness=.2)=>new T.MeshStandardMaterial({color,roughness,metalness});
function mesh(g,m,name,parent,pos=[0,0,0]){const o=new T.Mesh(g,m);o.name=name;o.position.fromArray(pos);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function box(w,h,d,m,name,parent,pos){return mesh(new T.BoxGeometry(w,h,d),m,name,parent,pos);}
function tube(points,radius,m,name,parent){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(8,points.length*2),radius,6,false),m,name,parent);}
// Cross section is gently crowned; the whole shell remains rigid during rotation.
function width(t){return .018+1.03*Math.pow(Math.sin(Math.PI*t),.78)*(1.08-.18*t);}
function bladePoint(t,s,sign){const w=width(t)*s;return new T.Vector3(sign*(.047+w),1.07+3.08*t,.045*Math.sin(Math.PI*t)*Math.sin(Math.PI*s));}
function bladeGeometry(sign){
 const N=44,M=12,positions=[],indices=[];
 for(let side=0;side<2;side++)for(let i=0;i<=N;i++)for(let j=0;j<=M;j++){const p=bladePoint(i/N,j/M,sign);p.z+=(side===0?1:-1)*.014;positions.push(...p.toArray());}
 const layer=(N+1)*(M+1),idx=(i,j)=>i*(M+1)+j;
 const quad=(a,b,c,d,reverse=false)=>{if(reverse)indices.push(a,c,b,a,d,c);else indices.push(a,b,c,a,c,d);};
 for(let side=0;side<2;side++)for(let i=0;i<N;i++)for(let j=0;j<M;j++){let a=side*layer+idx(i,j);quad(a,a+1,a+M+2,a+M+1,(sign===1)===(side===0));}
 const rim=[];for(let j=0;j<=M;j++)rim.push(idx(0,j));for(let i=1;i<=N;i++)rim.push(idx(i,M));for(let j=M-1;j>=0;j--)rim.push(idx(N,j));for(let i=N-1;i>0;i--)rim.push(idx(i,0));
 rim.forEach((a,i)=>{const b=rim[(i+1)%rim.length];quad(a,b,b+layer,a+layer,sign===1);});
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function createLeaf(){
 const group=new T.Group();group.name='LEAF_Prototype';
 const optical=mat('#bcbfc6',.43,.18),frame=mat('#747984',.32,.55),spineMat=mat('#555b65',.4,.5),joint=mat('#373c45',.4,.55),accent=mat('#d1b9a2',.42,.25);
 const parts=Array.from({length:5},(_,i)=>{const g=new T.Group();g.name=['Optical_Panels','Longitudinal_Axes','Spine_Light_Channel','Drive_Housing','Keyed_Mount'][i];group.add(g);return g;});
 const panels=[];
 for(const sign of [-1,1]){
  const p=new T.Group();p.name=sign<0?'Panel_Left':'Panel_Right';p.position.x=sign*.14;parts[0].add(p);panels.push(p);
  mesh(bladeGeometry(sign),optical,p.name+'_Surface',p);
  const perimeter=[];for(let i=0;i<=44;i++)perimeter.push(bladePoint(i/44,1,sign));for(let i=44;i>=0;i--)perimeter.push(bladePoint(i/44,0,sign));perimeter.push(perimeter[0].clone());tube(perimeter,.025,frame,p.name+'_Frame',p);
  for(let n=1;n<=4;n++){const pts=[];for(let i=4;i<=40;i++)pts.push(bladePoint(i/44,n/5,sign).add(new T.Vector3(0,0,.019)));tube(pts,.006,frame,p.name+'_Channel_'+n,p);}
  for(const y of [1.24,2.55,3.96]){box(.12,.085,.08,frame,'Panel_Hinge_Lug',p,[sign*.07,y,0]);}
  mesh(new T.CylinderGeometry(.032,.032,3.16,16),frame,'Axis_'+sign,parts[1],[sign*.14,2.6,0]);
  for(const y of [1.24,2.55,3.96])mesh(new T.CylinderGeometry(.065,.065,.13,20),joint,'Bearing_'+sign,parts[1],[sign*.14,y,0]);
 }
 box(.17,3.16,.19,spineMat,'Central_Spine',parts[2],[0,2.6,-.055]);
 box(.045,2.91,.016,accent,'Light_Channel',parts[2],[0,2.6,.047]);
 for(const y of [1.24,2.55,3.96])box(.4,.055,.095,spineMat,'Bearing_Bridge',parts[2],[0,y,-.06]);
 const shape=new T.Shape();shape.moveTo(-.24,-.25);shape.lineTo(.16,-.25);shape.lineTo(.24,-.17);shape.lineTo(.24,.25);shape.lineTo(.16,.32);shape.lineTo(-.16,.32);shape.lineTo(-.24,.24);shape.closePath();
 const housing=new T.ExtrudeGeometry(shape,{depth:.3,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,steps:1});housing.translate(0,0,-.15);
 mesh(housing,frame,'Drive_Service_Housing',parts[3],[0,.77,0]);box(.30,.31,.014,joint,'Service_Cover',parts[3],[0,.77,.19]);
 for(const x of [-.12,.12])for(const y of [.65,.9]){const screw=mesh(new T.CylinderGeometry(.018,.018,.018,12),spineMat,'Fastener',parts[3],[x,y,.205]);screw.rotation.x=Math.PI/2;}
 box(.34,.17,.27,joint,'Keyed_Plug',parts[4],[0,.41,0]);box(.08,.13,.06,accent,'Orientation_Key',parts[4],[.20,.4,.06]);box(.62,.12,.5,spineMat,'Locking_Dock',parts[4],[0,.27,0]);
 box(.24,.12,.22,joint,'Support_Neck',parts[4],[0,.15,0]);
 group.userData={assetRole:'independent product gray model',units:'dimensionless',openingRange:[12,120]};
 const original=new Map();group.traverse(o=>{if(o.isMesh)original.set(o,o.material);});
 const highlightMat=mat('#c8b18e',.45,.25);
 function highlight(index){parts.forEach((p,i)=>p.traverse(o=>{if(o.isMesh)o.material=i===index?highlightMat:original.get(o);}));}
 function setPose(beta=60,explode=0){
  beta=T.MathUtils.clamp(beta,12,120);explode=T.MathUtils.clamp(explode,0,1);
  panels.forEach((p,i)=>{const sign=i?1:-1;p.rotation.y=sign*(r(beta/2)-Math.PI/2);p.position.x=sign*(.14+explode*.95);});
  parts[0].position.y=explode*.4;parts[1].position.set(0,explode*.4,-explode*.36);parts[2].position.set(0,explode*.4,-explode*.72);parts[3].position.y=explode*.12;
  group.userData.beta=beta;group.userData.explode=explode;
 }
 setPose();return {group,parts,panels,setPose,highlight};
}
export function layoutNodes(key){
 if(key==='single')return [{x:0,z:0,yaw:0}];
 if(key==='line')return Array.from({length:6},(_,i)=>({x:(i-2.5)*2.7,z:0,yaw:0}));
 if(key==='screen')return Array.from({length:12},(_,i)=>({x:(i%6-2.5)*2.7+(i>=6?.65:-.65),z:i>=6?1.4:-1.4,yaw:0}));
 if(key==='arc')return Array.from({length:9},(_,i)=>{const a=r(200+i*17.5),x=10*Math.cos(a),z=10*Math.sin(a);return {x,z,yaw:Math.atan2(-x,-z)};});
 throw Error('Unknown layout: '+key);
}
export function createAssembly(key){
 const group=new T.Group(),leaves=[],railMat=mat('#444a53',.48,.45);group.name='ARRAY_'+key;
 const nodes=layoutNodes(key);nodes.forEach((n,i)=>{const l=createLeaf();l.group.name='LEAF_'+String(i+1).padStart(2,'0');l.group.position.set(n.x,0,n.z);l.group.rotation.y=n.yaw;group.add(l.group);leaves.push(l);});
 function rail(a,b){const start=new T.Vector3(a.x,.045,a.z),end=new T.Vector3(b.x,.045,b.z),dir=end.clone().sub(start);const o=box(.19,.09,dir.length()+.3,railMat,'Support_Rail',group,start.clone().add(end).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),dir.normalize());}
 if(key==='single')box(1,.09,.8,railMat,'Study_Base',group,[0,.045,0]);
 else if(key==='screen'){for(let row=0;row<2;row++)for(let i=0;i<5;i++)rail(nodes[row*6+i],nodes[row*6+i+1]);rail(nodes[0],nodes[6]);}
 else for(let i=0;i<nodes.length-1;i++)rail(nodes[i],nodes[i+1]);
 return {group,leaves,nodes};
}
export function openingClip(leaf){const times=[0,1,3,4,6,7,9,10],angles=[12,12,60,60,120,120,12,12],tracks=[];
 leaf.panels.forEach((p,i)=>{const values=[];for(const b of angles)values.push(...new T.Quaternion().setFromAxisAngle(axis,(i?1:-1)*(r(b/2)-Math.PI/2)).toArray());tracks.push(new T.QuaternionKeyframeTrack(p.name+'.quaternion',times,values));});
 return new T.AnimationClip('LEAF_Opening_12_60_120',10,tracks);
}
