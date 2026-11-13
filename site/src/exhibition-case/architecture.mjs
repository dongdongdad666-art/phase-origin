import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {opticalCanopyTexture} from './finish-details.mjs';
import {galleryMaterials} from './atmosphere.mjs';
export function buildGallery(world){
 const scene=new T.Group();scene.name='PHASE_COURT_ARCHITECTURE';world.add(scene);
 const {wall,stone,dark,warm,floor}=galleryMaterials(world.environment),bronze=new T.MeshPhysicalMaterial({color:'#6e5143',metalness:.78,roughness:.43,envMap:world.environment,envMapIntensity:.20}),glass=new T.MeshPhysicalMaterial({color:'#9996cf',metalness:.05,roughness:.2,transmission:.72,thickness:.12,ior:1.4,envMap:world.environment,envMapIntensity:.55,side:T.DoubleSide}),cool=new T.MeshBasicMaterial({color:'#9ba1de'});
 glass.map=opticalCanopyTexture();
 const upholstery=new T.MeshStandardMaterial({color:'#292730',roughness:.9,envMap:world.environment,envMapIntensity:.18});
 const cutaway=new T.Group(),roof=new T.Group(),canopy=new T.Group();cutaway.name='Exterior_Cutaway';roof.name='Ceiling_Soffits';canopy.name='Suspended_Field_Canopy';scene.add(cutaway,roof,canopy);
 function mesh(g,m,pos,parent=scene,name=''){const o=new T.Mesh(g,m);o.position.fromArray(pos);o.castShadow=true;o.receiveShadow=true;o.name=name;parent.add(o);return o;}
 function box(w,h,d,m,pos,parent=scene,name=''){const bevel=Math.min(w,h,d)>.18&&Math.max(w,h,d)<18;return mesh(bevel?new RoundedBoxGeometry(w,h,d,2,Math.min(.065,w*.1,h*.1,d*.1)):new T.BoxGeometry(w,h,d),m,pos,parent,name);}
 function cyl(rt,rb,h,m,pos,parent=scene,name=''){return mesh(new T.CylinderGeometry(rt,rb,h,64),m,pos,parent,name);}
 function tube(points,r,m,parent=scene){const c=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(new T.TubeGeometry(c,Math.max(24,points.length*6),r,6,false),m,[0,0,0],parent);}
 function arc(cx,cz,r,width,height,start,end,y,m,parent=scene,name=''){
  const s=new T.Shape(),a=start*Math.PI/180,b=end*Math.PI/180,n=Math.ceil((end-start)/3);
  for(let i=0;i<=n;i++){const t=a+(b-a)*i/n,x=(r+width/2)*Math.cos(t),z=(r+width/2)*Math.sin(t);i?s.lineTo(x,z):s.moveTo(x,z);}
  for(let i=n;i>=0;i--){const t=a+(b-a)*i/n;s.lineTo((r-width/2)*Math.cos(t),(r-width/2)*Math.sin(t));}s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:height,bevelEnabled:false,steps:1});g.rotateX(Math.PI/2);return mesh(g,m,[cx,y+height,cz],parent,name);
 }
 function textPanel(w,h,pos,lines,rotation=0){const c=document.createElement('canvas');c.width=1024;c.height=Math.max(128,Math.round(1024*h/w));const x=c.getContext('2d');x.fillStyle='#151622';x.fillRect(0,0,c.width,c.height);x.fillStyle='#cfb99d';x.textAlign='center';lines.forEach((s,i)=>{x.font=(i?'24':'46')+'px sans-serif';x.fillText(s,512,c.height*.46+i*48);});const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const m=new T.MeshStandardMaterial({map,roughness:.7,emissiveMap:map,emissive:'#c5b9b1',emissiveIntensity:.35,envMap:world.environment,envMapIntensity:.1});const o=mesh(new T.PlaneGeometry(w,h),m,pos);o.rotation.y=rotation;return o;}
 // Lower arrival threshold opens into a tall central court.
 box(42.5,.3,34.5,floor,[0,-.2,0],scene,'Continuous_Floor');box(42.5,11,.4,wall,[0,5.5,-17]);box(.4,11,34.5,wall,[-21,5.5,0]);box(.4,11,34.5,wall,[21,5.5,0],cutaway);
 box(10.5,11,.4,wall,[-15.75,5.5,17],cutaway);box(25.5,11,.4,wall,[8.25,5.5,17],cutaway);box(6,4.5,.4,wall,[-7.5,8.75,17],cutaway);
 box(17,.65,4,dark,[-12.2,6.65,15],roof,'Arrival_Low_Soffit');box(16.7,.035,.08,warm,[-12.2,6.29,13.02],roof);box(42,.3,34,wall,[0,11.18,0],roof,'High_Ceiling');
 for(const x of [-19,-16.5]){box(.3,6.4,1.7,bronze,[x,3.2,7]);box(.04,6,.05,warm,[x+.18,3.1,7.87]);}
 for(let x=-20;x<21;x+=4)box(.025,10.5,.025,dark,[x,5.35,-16.77]);for(const y of [.16,10.7])box(41.4,.035,.04,warm,[0,y,-16.75]);textPanel(7.3,1.6,[-20.76,4.4,10],['PHASE ORIGIN'],Math.PI/2);
 // CORE keeps its tabletop scale and location.
 box(5.4,1.45,2.3,stone,[-15,.725,12],scene,'Reception_Island');cyl(1.15,1.15,1.45,stone,[-17.7,.725,12]);cyl(1.15,1.15,1.45,stone,[-12.3,.725,12]);box(5.4,.12,2.5,bronze,[-15,1.51,12]);cyl(1.25,1.25,.12,bronze,[-17.7,1.51,12]);cyl(1.25,1.25,.12,bronze,[-12.3,1.51,12]);box(5.35,.035,.025,warm,[-15,.18,13.17]);textPanel(3.5,.58,[-15,.9,13.17],['PHASE ORIGIN']);
 // Integrated low plinths replace isolated floor footings.
 for(const x of [-11,-5]){box(1.85,.62,7,stone,[x,.31,6.5],scene,'Arrival_LEAF_Plinth');cyl(.925,.925,.62,stone,[x,.31,3]);cyl(.925,.925,.62,stone,[x,.31,10]);box(.025,.035,7.1,warm,[x+(x===-11?.94:-.94),.12,6.5]);}
 arc(1,-3,5.8,1.9,.62,190,490,0,stone,scene,'Central_Crescent_Plinth');arc(1,-3,6.76,.045,.045,190,490,.12,warm);arc(1,-3,4.84,.04,.035,190,490,.59,bronze);
 arc(14,-8,4.5,1.8,.62,-162,102,0,stone,scene,'Archive_LEAF_Plinth');arc(14,-8,3.59,.045,.035,-162,102,.13,warm);
 // Elliptical canopy has visible perimeter, radial structure and suspension cables.
 const ellipse=(rx,rz,y)=>Array.from({length:97},(_,i)=>{const a=i/96*Math.PI*2;return[1+rx*Math.cos(a),y,-3+rz*Math.sin(a)];});
 tube(ellipse(7.7,6.3,8.6),.18,bronze,canopy);tube(ellipse(7.35,5.95,8.4),.055,warm,canopy);tube(ellipse(7.9,6.5,8.92),.1,dark,canopy);
 for(let i=0;i<24;i++){const a=i/24*Math.PI*2,b=(i+.92)/24*Math.PI*2,verts=new Float32Array([1,8.52,-3,1+7.35*Math.cos(a),8.52,-3+5.95*Math.sin(a),1+7.35*Math.cos(b),8.52,-3+5.95*Math.sin(b)]),g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute([.5,.5,.5+.5*Math.cos(a),.5+.5*Math.sin(a),.5+.5*Math.cos(b),.5+.5*Math.sin(b)],2));g.computeVertexNormals();mesh(g,glass,[0,0,0],canopy).castShadow=false;tube([[1,8.48,-3],[1+7.45*Math.cos(a),8.48,-3+6.05*Math.sin(a)]],.022,bronze,canopy);}
 for(let i=0;i<8;i++){const a=i*Math.PI/4;tube([[1+7.7*Math.cos(a),8.7,-3+6.3*Math.sin(a)],[1+7.7*Math.cos(a),11,-3+6.3*Math.sin(a)]],.025,dark,canopy);}arc(1,-3,8.3,.4,.28,0,360,10.55,bronze,roof,'Upper_Court_Cove');
 const plinth=cyl(2.15,2.3,.52,stone,[1,.26,-3],scene,'Main_Exhibit_Plinth');cyl(2.17,2.17,.035,warm,[1,.54,-3]);cyl(2.10,2.10,.12,dark,[1,.615,-3]);
 const sculpture=new T.Group();sculpture.name='Exhibit_Continuous_Phase';sculpture.position.set(1,.68,-3);scene.add(sculpture);const alloy=new T.MeshPhysicalMaterial({color:'#80706a',metalness:.86,roughness:.3,envMap:world.environment,envMapIntensity:.35});
 for(let i=0;i<3;i++){const ring=mesh(new T.TorusGeometry(1.3-i*.15,.22,16,100),alloy,[0,2.1,0],sculpture);ring.scale.set(1,1.48,.38);ring.rotation.set(.2+i*.32,i*Math.PI/3,.2);}box(.16,.7,.16,bronze,[0,.35,0],sculpture,'Sculpture_Support');mesh(new T.IcosahedronGeometry(.48,1),new T.MeshPhysicalMaterial({color:'#e5b47e',roughness:.26,metalness:.2,emissive:'#cf7b32',emissiveIntensity:.7}),[0,2.1,0],sculpture);
 // Offset archive portal and side screen frame a second, quieter room.
 box(.32,8.8,7.5,wall,[9,4.4,-13],scene,'Archive_Screen');box(.08,4.8,5.5,glass,[9,2.4,-6.4],scene,'Archive_Optical_Screen');box(.25,7.7,.65,bronze,[9.25,3.85,-.35]);box(.25,7.7,.65,bronze,[19.7,3.85,-.35]);box(10.7,.45,.65,bronze,[14.48,7.48,-.35]);
 for(const x of [9.45,19.5]){box(.10,7.1,.26,glass,[x,3.65,-.35]);box(.035,7.1,.04,warm,[x,3.65,.01]);}box(10.2,.06,.12,warm,[14.48,7.21,-.01]);box(11.5,.4,16,wall,[15,8.1,-8.2],roof,'Archive_Lower_Soffit');for(const z of [-4,-10])box(10.5,.025,.035,warm,[15,7.88,z],roof);
 arc(14,-8,2.6,1.05,.72,-125,45,0,dark,scene,'Archive_Banquette');arc(14,-8,3.03,.1,.55,-125,45,.65,stone);arc(14,-8,2.06,.035,.025,-125,45,.12,warm);cyl(.65,.75,.7,bronze,[14,.35,-7.7],scene,'Archive_Table');arc(14,-8,2.6,.88,.12,-125,45,.72,upholstery,scene,'Archive_Seat_Cushion');arc(14,-8,3.0,.08,.36,-125,45,.78,upholstery);cyl(.59,.59,.025,dark,[14,.715,-7.7]);
 // Actual shallow cabinets and physical mineral studies articulate the rear wall.
 const mineral=new T.MeshPhysicalMaterial({color:'#9995cb',roughness:.3,metalness:.22,envMap:world.environment,envMapIntensity:.5});
 function cabinet(cx,cz,cols,rows){const w=cols*1.65;box(w+.2,rows*1.6+.2,.65,dark,[cx,rows*.8+.8,cz],scene,'Material_Archive_Cabinet');for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const x=cx+(col-(cols-1)/2)*1.65,y=1.15+row*1.6;box(1.55,.07,.8,bronze,[x,y-.35,cz+.38]);box(1.38,.025,.05,warm,[x,y+.84,cz+.47]);box(.035,1.48,.8,bronze,[x-.8,y+.38,cz+.32]);const o=mesh(((row+col)%3===0?new T.IcosahedronGeometry(.32,1):(row+col)%3===1?new T.TorusGeometry(.26,.07,8,24):new T.ConeGeometry(.28,.6,5)),mineral,[x,y,cz+.36]);o.scale.y=1.35;o.rotation.set(row*.5,col*.45,.3);box(.5,.03,.15,bronze,[x,y-.28,cz+.72]);textPanel(.62,.19,[x,y-.2,cz+.8],['P / '+String(row*cols+col+1).padStart(2,'0')]);}}
 cabinet(-12.8,-16.25,4,4);cabinet(15,-16.25,5,3);textPanel(6.5,1.1,[-12.8,8.5,-15.85],['01 / MATERIAL ORIGINS']);textPanel(7.8,1.1,[15,6.9,-15.85],['03 / THE ARCHIVE']);textPanel(6.7,1.5,[2.3,7.3,-16.74],['PHASE ORIGIN','LIGHT TAKES FORM']);box(.04,6.8,.16,cool,[20.76,3.7,-13]);box(.4,2.1,.8,dark,[-19,1.05,-13]);
 tube([[-8,-.025,16],[-8,-.025,12],[-8,-.025,7],[-7.2,-.025,2.4],[-5,-.025,.8]],.018,warm);tube([[0,-.025,11],[7,-.025,9],[12,-.025,4],[14,-.025,0],[14,-.025,-2]],.016,warm);
 // Construction details stay outside circulation and the LEAF swept envelope.
 for(const x of [-11,-5]){box(1.82,.045,7,bronze,[x,.60,6.5]);for(const z of [3,10])cyl(.91,.91,.035,bronze,[x,.605,z]);}
 arc(1,-3,6.73,.035,.08,190,490,.48,bronze);arc(14,-8,5.38,.035,.08,-162,102,.48,bronze);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;const x=1+7.7*Math.cos(a),z=-3+6.3*Math.sin(a);cyl(.09,.09,.17,bronze,[x,10.96,z],roof,'Ceiling_Anchor');cyl(.075,.075,.14,bronze,[x,8.75,z],canopy,'Suspension_Collar');}
 // Narrow slatted reveal gives the entry soffit a readable underside.
 for(let x=-20;x<-4;x+=.65)box(.045,.09,3.6,bronze,[x,6.28,15],roof);
 for(let x=-20;x<21;x+=4)box(.035,.025,32,dark,[x,-.028,0]);
 // Recessed display title rails, a leaflet tray and a small optical sample at reception.
 box(1.05,.04,.65,dark,[-16.6,1.6,12.25]);box(.75,.025,.42,stone,[-16.6,1.637,12.25]);
 textPanel(1.15,.28,[-16.6,1.8,11.95],['FIELD / 01']);
 box(.5,.04,.5,bronze,[-13,1.6,12]);mesh(new T.OctahedronGeometry(.22),glass,[-13,1.84,12]);
 for(const [x,z] of [[-11,10.92],[-5,10.92]])textPanel(1.2,.25,[x,.34,z],['LEAF / ARRIVAL']);
 textPanel(2.9,.34,[1,.35,3.77],['02 / THE FIELD']);
 const personMat=new T.MeshStandardMaterial({color:'#20222c',roughness:.85,envMap:world.environment,envMapIntensity:.25});
 function visitor(x,z,yaw){const g=new T.Group();g.name='Scale_Reference_Visitor';g.position.set(x,0,z);g.rotation.y=yaw;scene.add(g);for(const s of[-1,1]){cyl(.14,.10,1.15,personMat,[s*.17,.65,0],g);const arm=cyl(.095,.08,.88,personMat,[s*.39,1.54,0],g);arm.rotation.z=s*.12;box(.23,.13,.4,personMat,[s*.17,.065,.12],g);}cyl(.32,.26,.88,personMat,[0,1.64,0],g);mesh(new T.SphereGeometry(.24,14,10),personMat,[0,2.38,0],g);}
 visitor(-15,14.2,Math.PI);visitor(-7.7,5,.5);visitor(-6.9,3.2,.5);visitor(-2,-1.8,1.5);visitor(17.2,-14,Math.PI);
 return {root:scene,cutaway,roof,canopy,plinth,sculpture,zoneTags:[],setCutaway(value,top=false){cutaway.visible=!value;roof.visible=!value;canopy.visible=!top;}};
}
