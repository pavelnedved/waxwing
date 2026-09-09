import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {loadModel} from '../modules/documents/index.mjs';
import {layoutModel} from '../modules/layout/index.mjs';
import {renderSite,writeSite,recoverSite,siteTargetURL} from '../modules/site/index.mjs';
import {recoverArtifact} from '../modules/render/artifacts.mjs';
import {renderHTML} from '../modules/render/index.mjs';

const load = (name) => loadModel(new URL(`../examples/${name}/model.json`,import.meta.url)).model;
const model = load('multi-page'), layout = await layoutModel(model), files = renderSite(layout);
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(),'waxwing-site-test-'));
const cli = (...args) => spawnSync(process.execPath,[new URL('../bin/waxwing.mjs',import.meta.url).pathname,...args],{encoding:'utf8'});
const decode = (s) => s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
function checkLinks(exported) {
  for(const [from,html] of exported) {
    if(!from.endsWith('.html'))continue;
    for(const match of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
      const url=decode(match[1]);if(/^(?:https?:|mailto:|data:)/.test(url))continue;
      const [file,hash]=url.split('#'), destination=file?path.posix.normalize(path.posix.join(path.posix.dirname(from),decodeURIComponent(file))):from;
      assert.ok(exported.has(destination),`${from} -> ${url}`);
      if(hash)assert.ok(exported.get(destination).includes(`id="${decodeURIComponent(hash)}"`),`${from} -> ${destination}#${hash}`);
    }
  }
}

test('site separates three workflows and documents with complete source retained once as JSON 2',()=>{
  for(const id of ['checkout-run','stock-roundtrip','pricing-roundtrip']) {
    const html=files.get(`workflows/${id}.html`);assert.ok(html);
    assert.equal((html.match(/<svg /g)||[]).length,1);
    assert.ok(html.includes(`data-workflow-ref="${id}"`));
    assert.ok(!html.includes('waxwing-source'));
    for(const other of model.workflows.filter(w=>w.id!==id))assert.ok(!html.includes(`data-workflow-ref="${other.id}"`));
  }
  assert.deepEqual(JSON.parse(files.get('source/model.json')),model);
  assert.deepEqual(JSON.parse(files.get('source/layout.json')),layout);
  assert.ok(files.get('documents/workflow-guide.html').includes('../workflows/stock-roundtrip.html#record-orchestrator'));
  assert.ok(files.get('documents/workflow-guide.html').includes('reading-workflow.html#ww-doc-reading-workflow--limits-of-this-recording'));
  assert.ok(files.get('workflows/checkout-run.html').includes('Readability warnings'));
  assert.ok(files.get('workflows/checkout-run.html').includes('unknown'));
  assert.throws(()=>recoverArtifact(files.get('workflows/checkout-run.html')),/Recover from the exported directory/);
  checkLinks(files);
});

test('existing single-file export still embeds and recovers the complete model',()=>{
  assert.deepEqual(recoverArtifact(renderHTML(layout)),model);
});

test('site output is deterministic, does not mutate JSON 2, and names pages by IDs rather than titles',async()=>{
  const before=structuredClone(layout);assert.deepEqual(renderSite(layout),files);assert.deepEqual(layout,before);
  const renamed=structuredClone(model);renamed.workflows[0].title='A completely new title';
  const result=renderSite(await layoutModel(renamed));assert.deepEqual([...result.keys()],[...files.keys()]);
  assert.throws(()=>renderSite(layout,{path:'custom.html'}),/output structure is fixed/);
});

test('subgraph, group, document, sequence, and behavior targets resolve to real pages and anchors',async()=>{
  for(const name of ['subgraphs','order-processing','sequence','sequence-markets']) {
    const source=load(name),result=renderSite(await layoutModel(source));checkLinks(result);
    const markup=[...result].filter(([p])=>p.endsWith('.html')).map(([,h])=>h).join('');
    if(name==='order-processing')for(const g of source.groups)assert.ok(markup.includes(`id="record-${g.id}"`));
    if(source.diagramType==='sequence')assert.ok(markup.includes('class="ww-svg sequence-svg"'));
  }
  assert.equal(siteTargetURL(model,{kind:'step',ref:'stock-result'},'documents/workflow-guide.html'),'../workflows/checkout-run.html#record-stock-result');
  assert.throws(()=>siteTargetURL(model,{kind:'workflow',ref:'missing'},'index.html'),/Unknown workflow/);
});

test('untrusted titles and Markdown are escaped; viewer script compiles without bundled source data',async()=>{
  const m=structuredClone(model);m.workflows[0].title='</script><img src=x onerror=alert(1)>';
  m.documents[0].markdown+='\n<script>alert(1)</script>\n';
  const result=renderSite(await layoutModel(m));
  for(const [name,html] of result)if(name.endsWith('.html')){
    assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes('<script>alert(1)</script>'));assert.ok(!html.includes('waxwing-source'));
  }
  new vm.Script(result.get('assets/site.js'));
  assert.ok(!result.get('assets/site.js').includes('fetch('));
});

test('a moved site recovers the original model and internal links stay valid',()=>{
  const dir=temp();try{
    const first=path.join(dir,'first');writeSite(files,first);const moved=path.join(dir,'elsewhere');fs.renameSync(first,moved);
    assert.deepEqual(recoverSite(moved),model);
    const out=path.join(dir,'recovered.json'),run=cli('recover',moved,out);assert.equal(run.status,0,run.stderr);assert.deepEqual(JSON.parse(fs.readFileSync(out)),model);
    const refused=cli('recover',moved,path.join(moved,'source/model.json'));assert.equal(refused.status,1);assert.deepEqual(recoverSite(moved),model);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('rebuild replaces an owned site and removes obsolete generated pages',async()=>{
  const dir=temp();try{
    const target=path.join(dir,'site');writeSite(files,target);
    const m=structuredClone(model);m.workflows=m.workflows.slice(0,1);m.documents=m.documents.filter(d=>d.id!=='workflow-guide');
    writeSite(renderSite(await layoutModel(m)),target);
    assert.ok(!fs.existsSync(path.join(target,'workflows/stock-roundtrip.html')));
    assert.deepEqual(recoverSite(target),m);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('publishing refuses unrelated, modified, extra and symlinked files without deleting them',()=>{
  const dir=temp();try{
    const target=path.join(dir,'site');fs.mkdirSync(target);fs.writeFileSync(path.join(target,'mine.md'),'keep');
    assert.throws(()=>writeSite(files,target),/not a managed/);assert.equal(fs.readFileSync(path.join(target,'mine.md'),'utf8'),'keep');
    fs.rmSync(target,{recursive:true});writeSite(files,target);fs.writeFileSync(path.join(target,'extra.txt'),'keep');
    assert.throws(()=>writeSite(files,target),/added or missing/);fs.unlinkSync(path.join(target,'extra.txt'));
    fs.appendFileSync(path.join(target,'index.html'),'manual edit');assert.throws(()=>writeSite(files,target),/modified/);
    fs.writeFileSync(path.join(target,'index.html'),files.get('index.html'));
    fs.symlinkSync(path.join(target,'index.html'),path.join(target,'link.html'));assert.throws(()=>writeSite(files,target),/symlink/);
    fs.unlinkSync(path.join(target,'link.html'));const alias=path.join(dir,'alias');fs.symlinkSync(target,alias);assert.throws(()=>writeSite(files,alias),/real directory/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('manifest paths and input overlap cannot overwrite source files',()=>{
  const dir=temp();try{
    const target=path.join(dir,'site');fs.mkdirSync(target);const input=path.join(target,'model.json');fs.writeFileSync(input,'source');
    assert.throws(()=>writeSite(files,target,{inputFiles:[input]}),/input files/);assert.equal(fs.readFileSync(input,'utf8'),'source');
    const malicious=new Map(files),manifest=JSON.parse(malicious.get('waxwing-site.json'));manifest.files['../escape']='a'.repeat(64);malicious.set('waxwing-site.json',JSON.stringify(manifest));assert.throws(()=>writeSite(malicious,path.join(dir,'new')),/Invalid Waxwing/);
    assert.ok(!fs.existsSync(path.join(dir,'escape')));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('CLI builds from JSON 1, renders from JSON 2, and preserves prior output after validation fails',()=>{
  const dir=temp();try{
    const input=path.join(dir,'input.json');fs.writeFileSync(input,JSON.stringify(model));const target=path.join(dir,'site');
    let run=cli('build-site',input,target);assert.equal(run.status,0,run.stderr);assert.deepEqual(recoverSite(target),model);
    const second=path.join(dir,'second');run=cli('render-site',path.join(target,'source/layout.json'),second);assert.equal(run.status,0,run.stderr);assert.deepEqual(recoverSite(second),model);
    const broken=structuredClone(model);broken.workflows[0].steps[0].kind='rpc';fs.writeFileSync(input,JSON.stringify(broken));run=cli('build-site',input,target);assert.equal(run.status,1);assert.deepEqual(recoverSite(target),model);
    assert.equal(JSON.parse(run.stderr).command,'build-site');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
