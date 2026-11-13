export const routes={home:'/src/brand-site/index.html',story:'/src/journey.html?take=brand-entry-v002',products:'/src/brand-site/products.html',leaf:'/src/leaf-lab/index.html?look=product',core:'/src/core-lab/index.html?look=product',array:'/src/array-lab/index.html',exhibition:'/src/exhibition-case/index.html?look=refined-v001'};
const labels={home:'首页',story:'品牌序章',products:'产品系统',leaf:'光叶',core:'轴台',array:'枝网',exhibition:'空间应用'};
const current=Object.keys(routes).find(k=>new URL(routes[k],location.origin).pathname===location.pathname)||'home';
const active=['leaf','core','array'].includes(current)?'products':current;
const next={home:'story',story:'products',products:'leaf',leaf:'core',core:'array',array:'exhibition',exhibition:'home'}[current];
const secondary={home:'Origin',story:'第一次展开',products:'单元 · 控制 · 空间',leaf:'LEAF',core:'CORE',array:'ARRAY',exhibition:'相态之庭'};
const copy=(main,sub)=>'<span class="action-copy"><span class="action-main">'+main+'</span><span class="action-sub">'+sub+'</span></span>';
const single=main=>'<span class="action-copy"><span class="action-main">'+main+'</span></span>';
class PhaseNavigation extends HTMLElement{
 connectedCallback(){if(this.shadowRoot)return;const root=this.attachShadow({mode:'open'});root.innerHTML=`<link rel="stylesheet" href="/src/brand-site/actions.css"><style>
:host{display:block;height:72px;position:relative;z-index:60;color:#f3f0eb;font:13px Manrope,'Microsoft YaHei',sans-serif}*{box-sizing:border-box}a{color:inherit;text-decoration:none}button{font:inherit;color:inherit;cursor:pointer}
header{height:72px;display:flex;align-items:center;justify-content:space-between;gap:30px;padding:0 4vw;background:transparent}.brand{display:flex;align-items:center;gap:12px;min-height:44px}.brand img{width:29px;height:32px}.brand strong{font-size:19px;font-weight:400;letter-spacing:.16em}.brand small{display:block;font-size:7px;letter-spacing:.15em;margin-top:3px}.brand:focus-visible{outline:1px solid #e6ac80;outline-offset:5px}
.links{display:flex;gap:30px;margin-left:auto;margin-right:20px}.links .action-copy{gap:2px}.skip{position:absolute;top:-90px;left:15px}.skip:focus~.brand{visibility:hidden}.skip:focus{top:8px;z-index:4}
@media(max-width:1000px){header{gap:18px}.links{gap:20px;margin-right:4px}}
@media(max-width:760px){header{padding:0 14px}.brand strong{font-size:17px}}
header .links .text-action .action-main{font-size:13px;color:#B9B7D8}header .text-action .action-main::after{display:none}header .links .text-action:is(:hover,:focus-visible) .action-main{color:#eeebff}header .text-action:is(:hover,:focus-visible) .action-copy{transform:none}
</style><link rel="stylesheet" href="/src/brand-site/navigation-optical.css"><header><a class="text-action skip" href="#main-content">${copy('跳到主要内容','开始浏览')}</a><a class="brand" href="${routes.home}" aria-label="相原首页"><img src="/assets/brand/v001/png/phase-origin-symbol-light-v001.png" alt=""><span><strong>相原</strong><small>PHASE ORIGIN</small></span></a><div class="nav-cluster"><nav class="links" aria-label="相原网站导航">${['home','story','products','exhibition'].map(k=>`<a class="text-action" href="${routes[k]}" ${active===k?'aria-current="page"':''}>${single(labels[k])}</a>`).join('')}</nav></div></header>`;
 root.querySelector('.skip').onclick=e=>{e.preventDefault();const main=document.querySelector('main');main.tabIndex=-1;main.focus({preventScroll:true});};
 }
}
customElements.define('phase-navigation',PhaseNavigation);document.body.dataset.phaseSection=current;
if(!document.querySelector('phase-navigation')){const nav=document.createElement('phase-navigation');if(current==='story')document.body.prepend(nav);else {const old=document.querySelector('body>header');if(old)old.replaceWith(nav);else document.body.prepend(nav);}}
if(['leaf','core','array','exhibition'].includes(current)){const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='/src/brand-site/actions.css';document.head.append(sheet);const aside=document.querySelector('main>aside');if(aside){const block=document.createElement('section');block.className='phase-context';block.innerHTML=`<p>一套光场，三层协作</p><nav>${['leaf','core','array'].map(k=>`<a class="text-action" href="${routes[k]}" ${current===k?'aria-current="page"':''}>${copy(labels[k],secondary[k])}</a>`).join('')}</nav><a class="text-action phase-continue" href="${routes[next]}">${copy(next==='home'?'返回相原首页':`继续 · ${labels[next]}`,secondary[next])}</a><a class="text-action phase-return" href="${routes.products}">${copy('查看完整产品关系','单元 · 控制 · 空间')}</a>`;aside.append(block);}}
