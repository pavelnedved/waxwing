import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {buildCollection} from '../modules/site/collection.mjs';
import {recoverSite} from '../modules/site/files.mjs';
import {loadModel} from '../modules/documents/index.mjs';
import {layoutModel} from '../modules/layout/index.mjs';
import {renderSite,writeSite,siteSearchIndex} from '../modules/site/index.mjs';
import {searchRecords} from '../modules/query/index.mjs';

const example=new URL('../examples/collection/collection.json',import.meta.url).pathname;
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'waxwing-collection-test-'));
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const config=()=>{const c=json(example);c.sites.forEach(e=>e.model=path.resolve(path.dirname(example),e.model));return c;};
const save=(dir,c)=>{const file=path.join(dir,'collection.json');fs.writeFileSync(file,JSON.stringify(c));return file;};
const readTree=dir=>{
  const files=new Map();const walk=(base,prefix='')=>{for(const e of fs.readdirSync(base,{withFileTypes:true})){if(e.isDirectory())walk(path.join(base,e.name),prefix+e.name+'/');else files.set(prefix+e.name,fs.readFileSync(path.join(base,e.name),'utf8'));}};walk(dir);return files;
};
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
function assertTarget(files,from,href) {
  if(/^(https?:|mailto:|data:)/.test(href))return;
  const [name,fragment]=href.split('#');const target=name?path.posix.normalize(path.posix.join(path.posix.dirname(from),decodeURIComponent(name))):from;
  assert.ok(files.has(target),`${from} -> ${href}`);
  if(fragment)assert.ok(files.get(target).includes(`id="${decodeURIComponent(fragment)}"`),`${from} -> ${href}`);
}

test('collection packages independent models with valid global links, search destinations and recoverable members',async()=>{
  const dir=temp();try {
    const out=path.join(dir,'out');await buildCollection(example,out);
    const files=readTree(out);
    for(const [from,html] of files)if(from.endsWith('.html'))for(const match of html.matchAll(/(?:href|src)="([^"]*)"/g))assertTarget(files,from,decode(match[1]));
    const entries=vm.runInNewContext(files.get('assets/search.js')+'\nwaxwingSearchEntries',{document:{getElementById:()=>null}});
    for(const entry of entries)for(const target of entry.destinations)assertTarget(files,'search.html',target.path);
    const checkout=entries.filter(e=>e.kind==='component'&&e.title==='Checkout');
    assert.equal(checkout.length,2,'Same label in separate models retains separate identities');
    assert.notEqual(checkout[0].id,checkout[1].id);
    assert.ok(files.get('sites/checkout/graphs/services.html').includes('../../retry/graphs/checkout-retry.html'));
    assert.ok(files.get('sites/retry/graphs/checkout-retry.html').includes('../../../index.html'));
    const moved=path.join(dir,'moved');fs.renameSync(out,moved);
    for(const e of config().sites)assert.deepEqual(recoverSite(path.join(moved,'sites',e.id)),loadModel(e.model).model);
    assert.throws(()=>recoverSite(moved),/separate models/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('existing sites are accepted without modification; collection rebuild is managed and transactional',async()=>{
  const dir=temp();try {
    const c=config(),source=path.join(dir,'existing');writeSite(renderSite(await layoutModel(loadModel(c.sites[1].model).model)),source);
    const before=readTree(source);c.sites[1]={id:'retry',site:source};
    const input=save(dir,c),out=path.join(dir,'out');await buildCollection(input,out);assert.deepEqual(readTree(source),before);
    const initial=readTree(out);c.links[0].to.ref='missing';save(dir,c);
    await assert.rejects(buildCollection(input,out),/No exported page/);assert.deepEqual(readTree(out),initial);
    c.links=[];c.sites=c.sites.slice(0,2);save(dir,c);await buildCollection(input,out);assert.ok(!fs.existsSync(path.join(out,'sites/markets')));
    fs.appendFileSync(path.join(out,'index.html'),'manual edit');await assert.rejects(buildCollection(input,out),/modified/);
    assert.ok(fs.readFileSync(path.join(out,'index.html'),'utf8').endsWith('manual edit'));
    fs.appendFileSync(path.join(source,'index.html'),'manual edit');await assert.rejects(buildCollection(input,path.join(dir,'new')),/modified/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('collection rejects unsafe IDs, ambiguous or missing anchors, invalid options and input/output overlap',async()=>{
  const dir=temp();try {
    for(const change of [c=>c.sites[0].id='../escape',c=>c.sites[1].id=c.sites[0].id,c=>c.sites[0].model=5,c=>c.sites[0].extra=true,c=>c.links[0].to={site:'retry',kind:'node',ref:'missing'},c=>c.links[0].to={site:'retry',kind:'document',ref:'reading-sequence',heading:'missing'}]) {
      const c=config();change(c);await assert.rejects(buildCollection(save(dir,c),path.join(dir,'out')));assert.ok(!fs.existsSync(path.join(dir,'out')));
    }
    const input=save(dir,config());await assert.rejects(buildCollection(input,dir),/input files/);assert.ok(fs.existsSync(input));
    const alias=path.join(dir,'alias');fs.symlinkSync(dir,alias);await assert.rejects(buildCollection(input,alias),/input files|real directory/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('search finds document sections and unshown records with valid destinations and escapes hostile content',async()=>{
  const model=loadModel(new URL('../examples/subgraphs/model.json',import.meta.url)).model;
  const hidden=structuredClone(model.entities[0]);hidden.id='hidden-component';hidden.label='Needle </script><img src=x onerror=alert(1)>';model.entities.push(hidden);
  const files=renderSite(await layoutModel(model));
  const index=siteSearchIndex(model),hit=searchRecords(index,'needle').results[0];
  assert.equal(hit.id,'hidden-component');assert.equal(hit.destinations[0].path,'records.html#record-hidden-component');
  for(const e of index)for(const d of e.destinations)assertTarget(files,'search.html',d.path);
  assert.ok(!files.get('assets/search.js').includes('</script><img'));
  assert.ok(!files.get('records.html').includes('<img src=x'));
  new vm.Script(files.get('assets/search.js'));
  const sequence=loadModel(new URL('../examples/sequence/model.json',import.meta.url)).model;
  const found=searchRecords(siteSearchIndex(sequence),'Deduplication',{kind:'document'});
  assert.ok(found.results.some(e=>e.destinations[0].path.includes('#ww-doc-reading-sequence--what-this-does-not-establish')));
});

test('CLI collection build is available',()=>{
  const dir=temp();try {
    const run=spawnSync(process.execPath,[new URL('../bin/waxwing.mjs',import.meta.url).pathname,'build-collection',example,path.join(dir,'out')],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(run.stdout).ok,true);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
