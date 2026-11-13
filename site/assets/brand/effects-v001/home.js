import{a as T,b as ke,c as dt,d as Q,e as ze,f as Fe}from"./shared-44SLF5V4.js";var ee=T(ke(),1),qe=T(dt(),1);var F=T(ke(),1);var le=T(Q(),1),J=8,Ge={low:150,medium:210,high:280},$=[-42,-76,84,94],Ce=2400,H=3,ft=2.6,mt=19,z=[0,-3],ht={press:1,lift:-1,none:0},Le={split:[[7,4.2,-4,4,4],[-8,3.6,3,4,4]],backlit:[[6,1.6,-15,5,3],[-7,1.4,-13,5,3]],overhead:[[3,7.5,-4,3,3],[-3,7,-1,3,3]]},vt=Math.PI/180,_e=`
uniform vec4 uRipples[${J}];
uniform vec4 uWave;
uniform float uSquare;
uniform float uClock;
uniform vec4 uSwell;
uniform vec4 uHover;
uniform vec4 uIntro;

float reachOf(vec2 delta, out vec2 grad) {
  vec2 a = abs(delta);
  vec2 dir = vec2(delta.x < 0.0 ? -1.0 : 1.0, delta.y < 0.0 ? -1.0 : 1.0);
  float round_ = length(delta);
  vec2 roundGrad = delta / max(round_, 1e-4);
  float m = max(max(a.x, a.y), 1e-4);
  vec2 k = a / m;
  vec2 k3 = k * k * k;
  float sum = dot(k3, k);
  float root = sqrt(sqrt(sum));
  float square = m * root;
  vec2 squareGrad = dir * k3 / (root * root * root);
  float d = mix(round_, square, uSquare);
  vec2 g = mix(roundGrad, squareGrad, uSquare);
  float soft = sqrt(d * d + 0.36);
  grad = g * d / soft;
  return soft - 0.6;
}

vec3 field(vec2 p) {
  float t = uSwell.w;
  float f = uSwell.y;
  vec2 k1 = vec2(0.19, 0.11) * f;
  vec2 k2 = vec2(-0.09, 0.23) * f;
  vec2 k3 = vec2(0.29, -0.17) * f;
  float a1 = dot(p, k1) + t * 0.55;
  float a2 = dot(p, k2) - t * 0.42 + 1.3;
  float a3 = dot(p, k3) + t * 0.74 + 2.1;
  float h = 0.55 * sin(a1) + 0.4 * sin(a2) + 0.22 * sin(a3);
  vec2 g = 0.55 * cos(a1) * k1 + 0.4 * cos(a2) * k2 + 0.22 * cos(a3) * k3;
  h *= uSwell.x;
  g *= uSwell.x;
  vec2 dg;
  for (int i = 0; i < ${J}; i++) {
    vec4 r = uRipples[i];
    if (r.w <= 0.0) continue;
    float age = uClock - r.z;
    if (age <= 0.0) continue;
    float d = reachOf(p - r.xy, dg);
    float radius = age * uWave.y;
    float x = (d - radius) / uWave.z;
    float life = clamp(1.0 - radius / uWave.w, 0.0, 1.0);
    float strength = r.w * uWave.x * life * life * smoothstep(0.0, 1.5, radius);
    float bump = exp(-x * x);
    h += bump * strength;
    g += -2.0 * x * bump * strength / uWave.z * dg;
  }
  if (uIntro.w > 0.0) {
    float d = reachOf(p - uIntro.xy, dg);
    float x = (d - uIntro.z) / 2.2;
    float bump = exp(-x * x) * uIntro.w;
    h += bump;
    g += -2.0 * x * bump / 2.2 * dg;
  }
  vec2 hd = p - uHover.xy;
  float hr = max(uHover.z, 1e-3);
  float hover = exp(-dot(hd, hd) / (hr * hr)) * uHover.w;
  h -= hover;
  g += 2.0 * hd / (hr * hr) * hover;
  return vec3(h, g);
}
`,pt=`#version 300 es
precision highp float;
${_e}
layout(location = 0) in vec2 aGrid;
uniform mat4 uViewProj;
uniform vec4 uArea;
out vec2 vGround;
out vec3 vWorld;
void main() {
  vec2 ground = uArea.xy + aGrid * uArea.zw;
  vec3 f = field(ground);
  vWorld = vec3(ground.x, f.x, ground.y);
  vGround = ground;
  gl_Position = uViewProj * vec4(vWorld, 1.0);
}`,gt=`#version 300 es
precision highp float;
${_e}
uniform vec3 uEye;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec3 uSecond;
uniform vec3 uLightA;
uniform vec3 uLightB;
uniform float uTile;
uniform float uAngle;
uniform float uGap;
uniform float uRound;
uniform float uSoftness;
uniform float uBulge;
uniform float uGloss;
uniform vec2 uRange;
uniform float uBrightness;
uniform float uGrain;
uniform float uGrainScale;
uniform float uLightMode;
uniform float uOpacity;
uniform vec4 uReveal;
uniform vec2 uView;
uniform float uFade;
uniform float uFrame;
in vec2 vGround;
in vec3 vWorld;
out vec4 outColor;

float smoother(float x) {
  x = clamp(x, 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

float hash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

void main() {
  vec3 f = field(vGround);
  vec3 n0 = normalize(vec3(-f.y, 1.0, -f.z));
  vec3 tx = normalize(vec3(1.0, f.y, 0.0));
  vec3 tz = normalize(cross(tx, n0));
  tx = normalize(cross(n0, tz));

  float c = cos(uAngle);
  float s = sin(uAngle);
  mat2 toTile = mat2(c, -s, s, c);
  vec2 q = toTile * vGround / uTile;
  vec2 cell = floor(q);
  vec2 local = q - cell - 0.5;
  float footprint = max(length(fwidth(q)), 1e-5);

  float on = 1.0;
  if (uReveal.w < 1.0) {
    vec2 centre = transpose(toTile) * (cell + 0.5) * uTile;
    vec2 dg;
    float d = reachOf(centre - uReveal.xy, dg);
    float delay = hash(vec3(cell, 7.0)) * 1.1;
    on = max(smoother((uReveal.z - d - delay) / 1.6), uReveal.w);
  }

  float half_ = (0.5 - uGap * 0.5) * mix(0.62, 1.0, on);
  float radius = min(uRound * half_, half_);
  vec2 dd = abs(local) - (half_ - radius);
  float d = length(max(dd, 0.0)) + min(max(dd.x, dd.y), 0.0) - radius;
  vec2 outward = dd.x > 0.0 || dd.y > 0.0 ? normalize(max(dd, 0.0) * sign(local)) : (dd.x > dd.y ? vec2(sign(local.x), 0.0) : vec2(0.0, sign(local.y)));

  float bevelWidth = max(mix(0.04, 0.42, uSoftness) * half_, footprint * 1.5);
  float edge = clamp((d + bevelWidth) / bevelWidth, 0.0, 1.0);
  float dome = uBulge * 0.5 * length(local) / max(half_, 1e-3);
  float theta = edge * edge * mix(0.7, 1.35, uSoftness) + dome;
  vec2 outwardGround = transpose(toTile) * outward;
  vec2 domeGround = transpose(toTile) * (local / max(length(local), 1e-4));
  vec3 bend = normalize(tx * mix(domeGround.x, outwardGround.x, edge) + tz * mix(domeGround.y, outwardGround.y, edge));
  float crowd = smoothstep(0.08, 0.3, footprint);
  theta *= 1.0 - crowd;
  vec3 n = normalize(n0 * cos(theta) + bend * sin(theta));

  float inside = 1.0 - smoothstep(-footprint * 0.75, footprint * 0.75, d);
  float area = (2.0 * half_) * (2.0 * half_) - (4.0 - 3.14159) * radius * radius;
  inside = mix(inside, area, crowd) * on;

  vec3 toEye = uEye - vWorld;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  vec3 la = uLightA - vWorld;
  vec3 lb = uLightB - vWorld;
  float da = length(la);
  float db = length(lb);
  la /= da;
  lb /= db;
  float fa = 1.0 / (1.0 + da * da * 0.02);
  float fb = 1.0 / (1.0 + db * db * 0.02);

  float ndv = clamp(dot(n, v), 0.0, 1.0);
  float fresnel = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
  vec3 ha = normalize(la + v);
  vec3 hb = normalize(lb + v);
  float shine = mix(10.0, 90.0, uGloss);
  float norm = (shine + 8.0) / 60.0;
  float specA = pow(max(dot(n, ha), 0.0), shine) * norm;
  float specB = pow(max(dot(n, hb), 0.0), shine) * norm;
  float sheenA = pow(max(dot(n, ha), 0.0), 8.0);
  float sheenB = pow(max(dot(n, hb), 0.0), 8.0);
  float diffA = max(dot(n, la), 0.0);
  float diffB = max(dot(n, lb), 0.0);
  vec3 r = reflect(-v, n);
  float rim = exp((dot(r, normalize(vec3(0.15, 0.55, -1.0))) - 1.0) * 6.0);
  float occlusion = mix(1.0, 0.35, edge * edge);
  float edgeLight = edge * edge;

  vec3 color;
  float alpha;
  if (uLightMode > 0.5) {
    float luma = dot(uColor, vec3(0.299, 0.587, 0.114));
    vec3 body = mix(vec3(luma), uColor, 0.5) * 0.96;
    vec3 keyDir = normalize(vec3(-0.35, 0.85, 0.45));
    float shade = clamp(dot(n, keyDir) * 0.6 + 0.5, 0.0, 1.0);
    float wa = clamp(diffA * fa * 9.0, 0.0, 1.0);
    float wb = clamp(diffB * fb * 9.0, 0.0, 1.0);
    vec3 hue = (uAccent * wa + uSecond * wb) / max(wa + wb, 1e-3);
    vec3 lit = body * mix(vec3(1.0), hue, clamp(wa + wb, 0.0, 1.0) * 0.42) * mix(0.7, 1.05, shade);
    lit += vec3(1.0) * (specA * fa + specB * fb) * 2.4 * uGloss;
    lit *= mix(1.0, 0.8, edgeLight * (1.0 - crowd));
    color = lit;
    alpha = inside;
  } else {
    float luma = dot(uColor, vec3(0.299, 0.587, 0.114));
    vec3 body = mix(vec3(luma), uColor, 0.35) + vec3(0.02);
    vec3 lit = body * 0.25;
    lit += body * (uAccent * diffA * fa + uSecond * diffB * fb) * 14.0;
    lit += uAccent * (specA * (0.55 + 1.6 * edgeLight) + sheenA * 0.3) * fa * 9.0 * uGloss;
    lit += uSecond * (specB * (0.55 + 1.6 * edgeLight) + sheenB * 0.3) * fb * 9.0 * uGloss;
    lit += mix(uSecond, vec3(1.0), 0.4) * rim * fresnel * 0.35 * uGloss;
    lit *= occlusion;
    color = lit * inside;
    alpha = inside;
  }

  float fade = 1.0 - smoother((dist - uRange.x) / max(uRange.y - uRange.x, 1e-3));
  alpha *= fade * uOpacity;
  color *= uBrightness;
  if (uLightMode < 0.5) color = 1.0 - exp(-color * 1.1);

  vec2 grainCell = floor(gl_FragCoord.xy / uGrainScale);
  float grain = hash(vec3(grainCell, uFrame)) + hash(vec3(grainCell + 17.0, uFrame + 3.0)) - 1.0;
  float lum = dot(color, vec3(0.299, 0.587, 0.114));
  color += grain * uGrain * (uLightMode > 0.5 ? 0.6 : 0.25 + 0.75 * sqrt(clamp(lum, 0.0, 1.0)));
  color = clamp(color, 0.0, 1.0);

  vec2 uv = gl_FragCoord.xy / uView;
  float edgeFade = max(uFade * 0.5, 1e-4);
  float mask = uFade > 0.0 ? smoother(uv.x / edgeFade) * smoother((1.0 - uv.x) / edgeFade) * smoother(uv.y / edgeFade) * smoother((1.0 - uv.y) / edgeFade) : 1.0;
  alpha *= mask;
  outColor = vec4(color * alpha, alpha);
}`,xt=["uRipples","uWave","uSquare","uClock","uSwell","uHover","uIntro","uViewProj","uArea","uEye","uColor","uAccent","uSecond","uLightA","uLightB","uTile","uAngle","uGap","uRound","uSoftness","uBulge","uGloss","uRange","uBrightness","uGrain","uGrainScale","uLightMode","uOpacity","uReveal","uView","uFade","uFrame"],x=(e,s,f)=>Math.min(f,Math.max(s,e)),wt=e=>{let s=x(e,0,1);return 1-(1-s)*(1-s)*(1-s)},yt=e=>{let s=x(e,0,1);return s*s*s*(s*(s*6-15)+10)},bt=(e,s,f)=>{let c=x((f-e)/(s-e),0,1);return c*c*(3-2*c)},Be=(e,s,f)=>{let c=e.createShader(s);return c?(e.shaderSource(c,f),e.compileShader(c),e.getShaderParameter(c,e.COMPILE_STATUS)?c:(e.deleteShader(c),null)):null},St=(e,s,f)=>{let c=Be(e,e.VERTEX_SHADER,s),d=Be(e,e.FRAGMENT_SHADER,f),m=e.createProgram();if(!c||!d||!m)return null;if(e.attachShader(m,c),e.attachShader(m,d),e.linkProgram(m),e.deleteShader(c),e.deleteShader(d),!e.getProgramParameter(m,e.LINK_STATUS))return e.deleteProgram(m),null;let w={};for(let y of xt)w[y]=e.getUniformLocation(m,y);return{program:m,uniforms:w}},At=(e,s,f,c)=>{let d=1/Math.tan(e/2),m=1/(f-c);return[d/s,0,0,0,0,d,0,0,0,0,(c+f)*m,-1,0,0,2*c*f*m,0]},Rt=(e,s)=>{let f=e[0]-s[0],c=e[1]-s[1],d=e[2]-s[2],m=Math.hypot(f,c,d)||1;f/=m,c/=m,d/=m;let w=d,y=-f;m=Math.hypot(w,y)||1,w/=m,y/=m;let R=c*y,E=d*w-f*y,M=-c*w;return[w,R,f,0,0,E,c,0,y,M,d,0,-(w*e[0]+y*e[2]),-(R*e[0]+E*e[1]+M*e[2]),-(f*e[0]+c*e[1]+d*e[2]),1]},Et=(e,s)=>{let f=new Array(16);for(let c=0;c<4;c+=1)for(let d=0;d<4;d+=1)f[c*4+d]=e[d]*s[c*4]+e[4+d]*s[c*4+1]+e[8+d]*s[c*4+2]+e[12+d]*s[c*4+3];return f},Mt=e=>{let s=e[0]*e[5]-e[1]*e[4],f=e[0]*e[6]-e[2]*e[4],c=e[0]*e[7]-e[3]*e[4],d=e[1]*e[6]-e[2]*e[5],m=e[1]*e[7]-e[3]*e[5],w=e[2]*e[7]-e[3]*e[6],y=e[8]*e[13]-e[9]*e[12],R=e[8]*e[14]-e[10]*e[12],E=e[8]*e[15]-e[11]*e[12],M=e[9]*e[14]-e[10]*e[13],G=e[9]*e[15]-e[11]*e[13],C=e[10]*e[15]-e[11]*e[14],j=s*C-f*G+c*M+d*E-m*R+w*y,p=j?1/j:0;return[(e[5]*C-e[6]*G+e[7]*M)*p,(e[2]*G-e[1]*C-e[3]*M)*p,(e[13]*w-e[14]*m+e[15]*d)*p,(e[10]*m-e[9]*w-e[11]*d)*p,(e[6]*E-e[4]*C-e[7]*R)*p,(e[0]*C-e[2]*E+e[3]*R)*p,(e[14]*c-e[12]*w-e[15]*f)*p,(e[8]*w-e[10]*c+e[11]*f)*p,(e[4]*G-e[5]*E+e[7]*y)*p,(e[1]*E-e[0]*G-e[3]*y)*p,(e[12]*m-e[13]*c+e[15]*s)*p,(e[9]*c-e[8]*m-e[11]*s)*p,(e[5]*R-e[4]*M-e[6]*y)*p,(e[0]*M-e[1]*R+e[2]*y)*p,(e[13]*f-e[12]*d-e[14]*s)*p,(e[8]*d-e[9]*f+e[10]*s)*p]},kt=({color:e="#120f17",accentColor:s="#ff4fb8",secondaryColor:f="#3b6bff",tileSize:c=1,gap:d=.12,roundness:m=.25,softness:w=.5,bulge:y=.3,rotation:R=35,gloss:E=.6,waves:M=1,waveScale:G=1,speed:C=.6,shape:j="square",pulse:p=1,pulseSpeed:Pe=.45,pulseSpacing:Oe=1,pulseWidth:We=1,pulseOrigin:De="center",brightness:Ve=1,lighting:Ne="split",tilt:He=.7,zoom:Ue=1,depth:$e=10,grain:je=.12,fade:Xe=0,opacity:Ye=1,intro:Ke=!0,mouseInteraction:Qe=!0,hoverEffect:Je="press",mouseStrength:Ze=1,mouseRadius:et=.35,pulseOnClick:tt=!0,detail:ot="medium",lightMode:nt=!1,paused:rt=!1,dpr:it,...at})=>{let ue=(0,F.useRef)(null),de=(0,F.useRef)(null),te=(0,F.useRef)(null),fe={color:String(e),accentColor:String(s),secondaryColor:String(f),tileSize:x(c,.2,5),gap:x(d,0,.6),roundness:x(m,0,1),softness:x(w,0,1),bulge:x(y,0,1.5),rotation:R*vt,gloss:x(E,0,1),waves:Math.max(0,M),waveScale:x(G,.1,5),speed:Math.max(0,C),square:j==="round"?0:1,pulse:Math.max(0,p),pulseSpeed:Math.max(0,Pe),pulseSpacing:x(Oe,.2,6),pulseWidth:x(We,.1,5),randomOrigin:De==="random",brightness:Math.max(0,Ve),lights:Le[Ne]||Le.split,tilt:x(He,0,1),zoom:x(Ue,.3,4),depth:x($e,2,40),grain:Math.max(0,je),fade:x(Xe,0,1),opacity:x(Ye,0,1),intro:Ke,mouseInteraction:Qe,hover:ht[Je]??1,mouseStrength:Math.max(0,Ze),mouseRadius:x(et,.02,2),pulseOnClick:tt,mesh:Ge[ot]||Ge.medium,lightMode:nt,paused:rt,dpr:it},I=(0,F.useRef)(fe);I.current=fe,(0,F.useEffect)(()=>{let L=ue.current,S=de.current,n=S?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!0,depth:!0,stencil:!1});if(!L||!S||!n)return;let X=St(n,pt,gt);if(!X)return;let oe=n.createVertexArray(),he=n.createBuffer(),ve=n.createBuffer(),pe=0,ge=0,st=o=>{if(o===pe)return;pe=o;let a=new Float32Array((o+1)*(o+1)*2),t=0;for(let u=0;u<=o;u+=1)for(let r=0;r<=o;r+=1)a[t]=r/o,a[t+1]=u/o,t+=2;let l=new Uint32Array(o*o*6);t=0;for(let u=0;u<o;u+=1)for(let r=0;r<o;r+=1){let h=u*(o+1)+r,g=h+1,v=h+o+1,b=v+1;l[t]=h,l[t+1]=v,l[t+2]=g,l[t+3]=g,l[t+4]=v,l[t+5]=b,t+=6}ge=l.length,n.bindVertexArray(oe),n.bindBuffer(n.ARRAY_BUFFER,he),n.bufferData(n.ARRAY_BUFFER,a,n.STATIC_DRAW),n.enableVertexAttribArray(0),n.vertexAttribPointer(0,2,n.FLOAT,!1,0,0),n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,ve),n.bufferData(n.ELEMENT_ARRAY_BUFFER,l,n.STATIC_DRAW),n.bindVertexArray(null)},ne=document.createElement("canvas");ne.width=1,ne.height=1;let q=ne.getContext("2d",{willReadFrequently:!0}),Y=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,i={clock:0,swell:0,lights:0,frame:0,nextRipple:1.2,ripples:[],intro:I.current.intro&&!Y?0:H,width:1,height:1,colorKey:"",color:[.07,.06,.09],accent:[1,.31,.72],second:[.23,.42,1],pointer:{x:0,y:0,inside:!1},hover:{x:0,z:0,vx:0,vz:0,presence:0,placed:!1},look:{x:0,y:0,vx:0,vy:0},seed:1,camera:null},P=0,O=0,K=!0,re=!0,ie=(o,a)=>{if(!q||!o)return a;let t=/^[0-9a-f]{3,8}$/i.test(o)?`#${o}`:o;q.clearRect(0,0,1,1),q.fillStyle="#000000",q.fillStyle=t,q.fillRect(0,0,1,1);let[l,u,r]=q.getImageData(0,0,1,1).data;return[l/255,u/255,r/255]},lt=o=>{let a=`${o.color}|${o.accentColor}|${o.secondaryColor}`;a!==i.colorKey&&(i.colorKey=a,i.color=ie(o.color,[.07,.06,.09]),i.accent=ie(o.accentColor,[1,.31,.72]),i.second=ie(o.secondaryColor,[.23,.42,1]))},xe=()=>(i.seed=i.seed*16807%2147483647,(i.seed-1)/2147483646),ut=o=>{let a=i.width/Math.max(i.height,1),t=8/o.zoom,l=i.look.x*.16,u=1.5-o.tilt*1.26+i.look.y*.05,r=[z[0],0,z[1]],h=[r[0]+Math.sin(l)*Math.cos(u)*t,r[1]+Math.sin(u)*t,r[2]+Math.cos(l)*Math.cos(u)*t],g=At(.8,a,.1,400),v=Rt(h,r),b=Et(g,v);return{eye:h,target:r,viewProj:b,inverse:Mt(b),distance:t}},W=new Float32Array(J*4),ae=()=>{let o=I.current;st(o.mesh),lt(o);let a=ut(o);i.camera=a,n.viewport(0,0,S.width,S.height),n.clearColor(0,0,0,0),n.clearDepth(1),n.clear(n.COLOR_BUFFER_BIT|n.DEPTH_BUFFER_BIT),n.enable(n.DEPTH_TEST),n.depthFunc(n.LEQUAL),n.useProgram(X.program);let t=X.uniforms;W.fill(0),i.ripples.forEach((V,N)=>{W[N*4]=V.x,W[N*4+1]=V.z,W[N*4+2]=V.start,W[N*4+3]=V.strength});let l=i.intro,u=l<H,r=yt(l/ft)*mt,h=wt(l/H);n.uniform4fv(t.uRipples,W),n.uniform4f(t.uWave,.55*o.pulse,3*Math.max(o.pulseSpeed,.05)+1.2,1.6*o.pulseWidth,46),n.uniform1f(t.uSquare,o.square),n.uniform1f(t.uClock,i.clock),n.uniform4f(t.uSwell,1.3*o.waves*(.25+.75*h),1.9/o.waveScale,0,i.swell),n.uniform4f(t.uHover,i.hover.x,i.hover.z,3*o.mouseRadius/.35,.7*i.hover.presence*o.mouseStrength*o.hover),n.uniform4f(t.uIntro,z[0],z[1],r,u?.9*(1-bt(.55,1,l/H)):0),n.uniformMatrix4fv(t.uViewProj,!1,a.viewProj),n.uniform4f(t.uArea,$[0]+z[0],$[1]+z[1],$[2],$[3]),n.uniform3f(t.uEye,a.eye[0],a.eye[1],a.eye[2]),n.uniform3f(t.uColor,i.color[0],i.color[1],i.color[2]),n.uniform3f(t.uAccent,i.accent[0],i.accent[1],i.accent[2]),n.uniform3f(t.uSecond,i.second[0],i.second[1],i.second[2]);let g=i.lights,v=a.distance/8,b=.35+.65*h,[k,A]=o.lights;n.uniform3f(t.uLightA,a.target[0]+(k[0]+Math.sin(g*.7)*k[3])*v,k[1]*v*b+.6,a.target[2]+(k[2]+Math.cos(g*.5)*k[4])*v),n.uniform3f(t.uLightB,a.target[0]+(A[0]+Math.cos(g*.6)*A[3])*v,A[1]*v*b+.6,a.target[2]+(A[2]+Math.sin(g*.45)*A[4])*v),n.uniform1f(t.uTile,1.2*o.tileSize),n.uniform1f(t.uAngle,o.rotation),n.uniform1f(t.uGap,o.gap),n.uniform1f(t.uRound,o.roundness),n.uniform1f(t.uSoftness,o.softness),n.uniform1f(t.uBulge,o.bulge),n.uniform1f(t.uGloss,o.gloss);let D=Math.min(o.depth*3.2*v,$[3]*.62);n.uniform2f(t.uRange,D*.5,D),n.uniform1f(t.uBrightness,o.brightness);let _=S.height/Math.max(i.height,1);n.uniform1f(t.uGrain,o.grain),n.uniform1f(t.uGrainScale,Math.max(1,_)),n.uniform1f(t.uLightMode,o.lightMode?1:0),n.uniform1f(t.uOpacity,o.opacity),n.uniform4f(t.uReveal,z[0],z[1],r,u?0:1),n.uniform2f(t.uView,S.width,S.height),n.uniform1f(t.uFade,o.fade),n.uniform1f(t.uFrame,i.frame%977),n.bindVertexArray(oe),n.drawElements(n.TRIANGLES,ge,n.UNSIGNED_INT,0),n.bindVertexArray(null),n.disable(n.DEPTH_TEST)},we=()=>{let o=I.current,a=Math.max(1,L.clientWidth),t=Math.max(1,L.clientHeight),l=Math.min(o.dpr||window.devicePixelRatio||1,2),u=Math.max(a,t)*l,r=u>Ce?l*Ce/u:l,h=Math.max(1,Math.round(a*r)),g=Math.max(1,Math.round(t*r));(S.width!==h||S.height!==g)&&(S.width=h,S.height=g),i.width=a,i.height=t,ae()},ce=(o,a)=>{let t=i.camera;if(!t)return null;let l=o/i.width*2-1,u=1-a/i.height*2,r=t.inverse,h=r[0]*l+r[4]*u+r[8]+r[12],g=r[1]*l+r[5]*u+r[9]+r[13],v=r[2]*l+r[6]*u+r[10]+r[14],b=r[3]*l+r[7]*u+r[11]+r[15],k=h/b-t.eye[0],A=g/b-t.eye[1],D=v/b-t.eye[2];if(A>=-1e-4)return null;let _=-t.eye[1]/A;return{x:t.eye[0]+k*_,z:t.eye[2]+D*_}},se=(o,a,t)=>{for(i.ripples.push({x:o,z:a,start:i.clock,strength:t});i.ripples.length>J;)i.ripples.shift()},ye=o=>{if(P=0,!re||!K||document.hidden)return;let a=I.current,t=O?Math.min(.05,(o-O)/1e3):1/60;O=o;let l=!a.paused&&!Y;if(l){i.frame+=1,i.clock+=t,i.intro+=t,i.swell+=t*a.speed,i.lights+=t*a.speed*.6;let _=3*Math.max(a.pulseSpeed,.05)+1.2,V=10*a.pulseSpacing/_;if(a.pulse>0&&i.clock>=i.nextRipple){if(a.randomOrigin){let U=ce((.15+xe()*.7)*i.width,(.25+xe()*.6)*i.height);U&&se(U.x,U.z,1)}else se(z[0],z[1],1);i.nextRipple=i.clock+V*(a.randomOrigin?.6:1)}let N=46/_+1;i.ripples=i.ripples.filter(U=>i.clock-U.start<N)}else i.intro<H&&(i.intro=H);let{pointer:u,hover:r,look:h}=i,g=a.mouseInteraction&&u.inside&&!Y,v=g&&a.hover!==0?ce(u.x,u.y):null;v&&(r.placed||(r.x=v.x,r.z=v.z,r.vx=0,r.vz=0,r.placed=!0),r.vx+=(90*(v.x-r.x)-19*r.vx)*t,r.vz+=(90*(v.z-r.z)-19*r.vz)*t,r.x+=r.vx*t,r.z+=r.vz*t);let b=v?1:0;r.presence+=(b-r.presence)*(1-Math.exp(-t/(b>r.presence?.35:.6))),!v&&r.presence<.001&&(r.placed=!1);let k=g?(u.x/i.width-.5)*.5:0,A=g?(.5-u.y/i.height)*.5:0;h.vx+=(30*(k-h.x)-11*h.vx)*t,h.vy+=(30*(A-h.y)-11*h.vy)*t,h.x+=h.vx*t,h.y+=h.vy*t,ae();let D=Math.abs(b-r.presence)>.002||Math.hypot(r.vx,r.vz)>.01||Math.abs(k-h.x)>2e-4||Math.abs(A-h.y)>2e-4;l||D?P=requestAnimationFrame(ye):O=0},B=()=>{!P&&re&&K&&!document.hidden&&(P=requestAnimationFrame(ye))},be=o=>{let a=L.getBoundingClientRect(),t=o.clientX-a.left,l=o.clientY-a.top;i.pointer.x=t,i.pointer.y=l,i.pointer.inside=t>=0&&l>=0&&t<=a.width&&l<=a.height,B()},Se=o=>{let a=I.current;if(!a.mouseInteraction||!a.pulseOnClick||o.button!==0||Y||o.target instanceof Element&&o.target.closest('a, button, input, textarea, select, label, [role="button"]'))return;let t=L.getBoundingClientRect(),l=o.clientX-t.left,u=o.clientY-t.top;if(l<0||u<0||l>t.width||u>t.height)return;let r=ce(l,u);r&&se(r.x,r.z,1.15),B()},Ae=()=>{i.pointer.inside=!1,B()},Re=()=>{O=0,B()},Ee=new ResizeObserver(we);Ee.observe(L);let Me=new IntersectionObserver(o=>{K=o.some(a=>a.isIntersecting),K&&(O=0,B())});return Me.observe(L),window.addEventListener("pointermove",be,{passive:!0}),window.addEventListener("pointerdown",Se),document.documentElement.addEventListener("pointerleave",Ae),document.addEventListener("visibilitychange",Re),we(),B(),te.current=()=>{P||ae(),B()},()=>{re=!1,cancelAnimationFrame(P),te.current=null,Ee.disconnect(),Me.disconnect(),window.removeEventListener("pointermove",be),window.removeEventListener("pointerdown",Se),document.documentElement.removeEventListener("pointerleave",Ae),document.removeEventListener("visibilitychange",Re),n.deleteBuffer(he),n.deleteBuffer(ve),n.deleteVertexArray(oe),n.deleteProgram(X.program)}},[]),(0,F.useEffect)(()=>{te.current?.()});let{className:me="",...ct}=at;return(0,le.jsx)("div",{ref:ue,className:`acid-squares-container${me?` ${me}`:""}`,...ct,children:(0,le.jsx)("canvas",{ref:de,className:"acid-squares-canvas","aria-hidden":"true"})})},Te=kt;var Z=T(Q(),1);function zt(){let e=Fe(),[s,f]=(0,ee.useState)(!1);return(0,ee.useEffect)(()=>{let c=document.querySelector(".opening"),d=()=>f(c.dataset.experience&&c.dataset.experience!=="idle"),m=new MutationObserver(d);return m.observe(c,{attributes:!0}),d(),()=>m.disconnect()},[]),(0,Z.jsx)(ze,{fallback:null,children:(0,Z.jsx)(Te,{color:"#0b0d15",accentColor:"#a06ce5",secondaryColor:"#498ee9",brightness:.9,gloss:.5,speed:.16,waves:.35,pulse:.32,pulseSpeed:.13,tileSize:1.3,gap:.09,rotation:28,tilt:.62,depth:12,zoom:.85,grain:.025,detail:"low",dpr:1,intro:!1,mouseInteraction:!1,pulseOnClick:!1,paused:e||s})})}var Ie=document.getElementById("phase-home-atmosphere");if(Ie){let e=(0,qe.createRoot)(Ie);e.render((0,Z.jsx)(zt,{})),addEventListener("pagehide",s=>{s.persisted||e.unmount()},{once:!0})}
