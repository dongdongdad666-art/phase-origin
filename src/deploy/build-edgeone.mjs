import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),output=path.join(root,'dist');
const raw=process.env.ASSET_BASE_URL;
if(!raw)throw Error('ASSET_BASE_URL is required.');
const base=new URL(raw);
if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw Error('Use an HTTPS resource directory without credentials, query or fragment.');
if(!base.pathname.endsWith('/'))base.pathname+='/';
if(fs.existsSync(output))throw Error('dist already exists; use a clean checkout to avoid overwriting output.');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'model-manifest.json'),'utf8'));
const urls={};
for(const model of manifest){
 if(!/^\/assets\/models\/[a-z0-9-]+\/[a-z0-9-]+\.glb$/.test(model.local)||! /^[a-z0-9-]+-[a-f0-9]{16}\.glb$/.test(model.key)||urls[model.local])throw Error('Invalid or duplicate model mapping.');
 urls[model.local]=new URL(model.key,base).href;
}
if(!manifest.length)throw Error('Empty model manifest.');
const needle='`/assets/models/${config.version}/${key}.glb`';
const loaderPath=path.join(root,'site/src/cinematic-world.js');
const loader=fs.readFileSync(loaderPath,'utf8');
if(loader.split(needle).length!==2)throw Error('Expected exactly one model loader expression.');
const files=[];
function collect(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
 const file=path.join(dir,ent.name);
 if(ent.isSymbolicLink()||ent.name.startsWith('.'))throw Error('Unexpected hidden file or symlink: '+file);
 if(ent.isDirectory())collect(file);else{
  if(/\.(glb|gltf|env|pem|key)$/i.test(ent.name))throw Error('Unexpected model or secret in site: '+file);
  if(fs.statSync(file).size>=25000000)throw Error('File exceeds Pages limit: '+file);
  files.push(file);
 }
}}
collect(path.join(root,'site'));
if(files.length+2>20000)throw Error('Too many files.');
for(const file of files){const rel=path.relative(path.join(root,'site'),file),dest=path.join(output,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);}
fs.writeFileSync(path.join(output,'src/cinematic-world.js'),"import {resolveModelURL} from './remote-models.mjs';\n"+loader.replace(needle,'resolveModelURL('+needle+')'));
fs.writeFileSync(path.join(output,'src/remote-models.mjs'),'const urls='+JSON.stringify(urls,null,2)+';\nexport function resolveModelURL(local){if(!Object.hasOwn(urls,local))throw Error("Unknown model: "+local);return urls[local];}\n');
fs.writeFileSync(path.join(output,'index.html'),'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/src/brand-site/index.html"><title>相原 PHASE ORIGIN</title><a href="/src/brand-site/index.html">进入相原</a></html>');
console.log(JSON.stringify({output,files:files.length+2,models:manifest.length,assetBaseURL:base.href},null,2));
