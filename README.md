# 相原 PHASE ORIGIN

相原概念品牌、产品实时展台、相态之庭展厅与五章品牌序章。以2026-10-29已上线 site-v002（含首屏占位修复）版本为迁移基线，保留画质与交互。

## EdgeOne Pages

生产分支 codex/edgeone-migration；框架 Other；根目录 ./；安装 npm ci --ignore-scripts --no-audit --no-fund；构建 npm run build；输出 dist；Node 22.11.0。

环境变量：
ASSET_BASE_URL=https://szy-1525664363.cos.ap-shanghai.myqcloud.com/phase-origin/

六个模型需先上传到上海 COS 的 phase-origin 文件夹，文件名与 model-manifest.json 的 key 一致。模型不进 Git，未压缩或重建。
COS 公有读私有写，CORS GET/HEAD、允许Headers *、暴露ETag/Content-Length/Content-Range；Origin填写实际访问本项目的域名（例如后续phase.szydym.com），每行一个完整HTTPS来源，不带末尾斜杠。Pages预览域名如需访问也单独加入。
当前模型上传/域名绑定未包含在Git推送内。

## 构建

设置ASSET_BASE_URL后运行 npm ci、npm test、npm run build。构建拒绝覆盖已有dist，请使用干净检出或新的工作副本。浏览器运行源位于site，构建脚本仅替换序章的模型加载URL并生成映射模块。

全部入口保留 /src/ 路径，根路径跳转 /src/brand-site/index.html。没有全站SPA回退。主站与其它独立项目分别部署。

## 来源与维护

正式工作台：D:/Workspace/projects/project-034-行星器官；迁移脚本src/deploy；此仓库为已上线静态运行源码的发布副本。
Three.js和GSAP浏览器依赖从原src/node_modules搬到site/vendor，保留代码版权注释；Three.js许可见licenses/three-LICENSE.txt。GSAP许可信息见 https://gsap.com/standard-license/ 。React/OGL编译组件保留原包中的许可注释。
本项目概念品牌与媒体不因代码公开而自动授予第三方品牌或素材再许可。
后续修改需同步工作台及发布副本，避免双份源码分别修改。
