import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const work=path.join(root,'work/edgeone-build-tests');fs.mkdirSync(work,{recursive:true});
function fixture(){
 const dir=fs.mkdtempSync(path.join(work,'run-'));fs.mkdirSync(path.join(dir,'scripts'));fs.mkdirSync(path.join(dir,'site/src/brand-site'),{recursive:true});
 fs.copyFileSync(path.join(root,'src/deploy/build-edgeone.mjs'),path.join(dir,'scripts/build.mjs'));
 fs.writeFileSync(path.join(dir,'site/src/brand-site/index.html'),'<!doctype html><title>相原</title>');
 fs.writeFileSync(path.join(dir,'site/src/cinematic-world.js'),'const model=loader.loadAsync(`/assets/models/${config.version}/${key}.glb`);');
 fs.writeFileSync(path.join(dir,'model-manifest.json'),JSON.stringify([{local:'/assets/models/v1/core.glb',key:'core-0123456789abcdef.glb'}]));return dir;
}
function run(dir,url){return spawnSync(process.execPath,['scripts/build.mjs'],{cwd:dir,env:{...process.env,ASSET_BASE_URL:url??''},encoding:'utf8'});}
test('clean source without GLB builds exact prefixed model URLs and preserves page content',()=>{
 const dir=fixture(),result=run(dir,'https://example.com/phase-origin/');assert.equal(result.status,0,result.stderr);
 const mapping=fs.readFileSync(path.join(dir,'dist/src/remote-models.mjs'),'utf8');assert.ok(mapping.includes('https://example.com/phase-origin/core-0123456789abcdef.glb'));
 assert.match(fs.readFileSync(path.join(dir,'dist/src/cinematic-world.js'),'utf8'),/loadAsync\(resolveModelURL\(/);
 assert.equal(fs.readFileSync(path.join(dir,'dist/src/brand-site/index.html'),'utf8'),'<!doctype html><title>相原</title>');
 assert.notEqual(run(dir,'https://example.com/').status,0,'must not overwrite output');
});
test('invalid origins and unpatched loaders fail before publication',()=>{
 for(const url of ['', 'http://example.com/','https://user:pass@example.com/','https://example.com/?token=x'])assert.notEqual(run(fixture(),url).status,0,url);
 const dir=fixture();fs.writeFileSync(path.join(dir,'site/src/cinematic-world.js'),'changed loader');assert.notEqual(run(dir,'https://example.com/').status,0);
});
