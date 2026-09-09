import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadModel} from '../modules/documents/index.mjs';

test('CLI explains invalid choices at the actual field without unrelated union variants', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'waxwing-diagnostics-'));
  try {
    const model=loadModel(new URL('../examples/sequence-markets/model.json',import.meta.url)).model;
    model.steps[0].kind='rpc'; model.blocks[0].execution.value='parallel';
    const input=path.join(dir,'model.json'); fs.writeFileSync(input,JSON.stringify(model));
    const run=spawnSync(process.execPath,[new URL('../bin/waxwing.mjs',import.meta.url).pathname,'validate',input],{encoding:'utf8'});
    assert.equal(run.status,1);
    const result=JSON.parse(run.stderr);
    assert.equal(result.command,"validate");assert.equal(result.input,input);
    const kind=result.diagnostics.find(d=>d.path==='/steps/0/kind');
    assert.ok(kind);assert.match(kind.message,/message.*reply.*event/);assert.match(kind.message,/rpc/);
    assert.equal(kind.record.id,model.steps[0].id);
    const execution=result.diagnostics.find(d=>d.path==='/blocks/0/execution/value');
    assert.ok(execution);assert.match(execution.message,/sequential.*concurrent/);assert.match(execution.message,/parallel/);
    assert.deepEqual(execution.expected.allowedValues,['sequential','concurrent']);
    assert.equal(result.diagnostics.length,2,'Do not ask a loop to supply if/else fields or a known claim to become unknown.');
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

import {validateModel} from '../modules/model/index.mjs';
import {layoutModel,validateLayout} from '../modules/layout/index.mjs';
import {digest} from '../modules/shared/model.mjs';
const architecture=loadModel(new URL('../examples/orchestration/model.json',import.meta.url)).model;
const scenario=loadModel(new URL('../examples/sequence/model.json',import.meta.url)).model;
const behavior=loadModel(new URL('../examples/sequence-markets/model.json',import.meta.url)).model;
const copy=(v=architecture)=>structuredClone(v);

test('missing and unsupported properties locate the exact field and name the surrounding record',()=>{
  const m=copy();delete m.entities[0].abstraction;m.entities[1]['pos/x~y']=[1,2];
  const ds=validateModel(m).diagnostics;
  const missing=ds.find(d=>d.path==='/entities/0/abstraction');assert.ok(missing);assert.equal(missing.keyword,'required');assert.equal(missing.received.type,'missing');assert.equal(missing.record.id,m.entities[0].id);
  const extra=ds.find(d=>d.path==='/entities/1/pos~1x~0y');assert.ok(extra);assert.match(extra.message,/pos\/x~y/);assert.ok(extra.expected.allowedProperties.includes('abstraction'));
});
test('primitive types, constants, patterns, collection sizes and duplicate indices carry expectations',()=>{
  const mutations=[
    [m=>m.entities[0].existence.value='yes','/entities/0/existence/value','type'],
    [m=>m.scope.timeframe='future','/scope/timeframe','const'],
    [m=>m.entities[0].id='Bad ID','/entities/0/id','pattern'],
    [m=>m.graphs[0].entityRefs=[],'/graphs/0/entityRefs','minItems'],
    [m=>m.graphs[0].entityRefs.push(m.graphs[0].entityRefs[0]),'/graphs/0/entityRefs','uniqueItems']
  ];
  for(const [change,path,keyword] of mutations){const m=copy();change(m);const d=validateModel(m).diagnostics.find(d=>d.path===path&&d.keyword===keyword);assert.ok(d,`${path}: ${keyword}`);assert.ok(Object.keys(d.expected).length);assert.match(d.message,/Received/);}
});
test('knowledge union errors follow actual status, including referenced schemas and unknown variants',()=>{
  const m=copy();delete m.entities[0].existence.basis;
  let ds=validateModel(m).diagnostics;assert.equal(ds.length,1);assert.equal(ds[0].path,'/entities/0/existence/basis');
  m.entities[0].existence={status:'unknown',reason:'Not known.',value:true};
  ds=validateModel(m).diagnostics;assert.equal(ds.length,1);assert.equal(ds[0].path,'/entities/0/existence/value');assert.equal(ds[0].keyword,'additionalProperties');
  m.entities[0].existence={status:'maybe'};
  ds=validateModel(m).diagnostics;assert.equal(ds.length,1);assert.equal(ds[0].path,'/entities/0/existence/status');assert.deepEqual(ds[0].expected.allowedValues,['established','reported','inferred','unknown','disputed']);
});
test('invalid variant tags and primitive claims do not select a false interpretation',()=>{
  const m=copy(behavior);m.blocks[0].kind='while';
  const d=validateModel(m).diagnostics;assert.equal(d.length,1);assert.deepEqual(d[0].expected.allowedValues,['loop','if']);
  const s=copy(scenario);s.steps[0].occurrence=null;
  const ds=validateModel(s).diagnostics;assert.ok(ds.some(d=>d.path==='/steps/0/occurrence'&&d.expected.type==='object'));assert.ok(ds.every(d=>!d.path.endsWith('/status')));
});
test('references distinguish nonexistent IDs from IDs of the wrong record type and suggest registered IDs',()=>{
  const m=copy();m.relationships[0].from='fictional-run';m.entities[0].existence.basis.sourceRefs=['missing-source'];
  const ds=validateModel(m).diagnostics;
  const endpoint=ds.find(d=>d.path==='/relationships/0/from');assert.equal(endpoint.received.collection,'sources');assert.ok(endpoint.expected.availableRefs.includes('checkout'));assert.match(endpoint.message,/expected entities/);
  const source=ds.find(d=>d.path==='/entities/0/existence/basis/sourceRefs/0');assert.equal(source.received.collection,null);assert.deepEqual(source.expected.availableRefs,['fictional-run']);
  const s=copy(scenario);s.steps[0].from='fixture';const d=validateModel(s).diagnostics.find(d=>d.path==='/steps/0/from');assert.equal(d.received.collection,'sources');assert.ok(d.expected.availableRefs.length);
});
test('JSON 2 adapters retain numeric expectations and correctly prefix embedded source errors',async()=>{
  for(const m of [architecture,scenario,behavior]){
    const drawing=await layoutModel(m),broken=copy(drawing);
    if(broken.graphs)broken.graphs[0].nodes[0].box.width=-1;else broken.participants[0].box.width=-1;
    const ds=validateLayout(broken).diagnostics;assert.ok(ds.some(d=>/width$/.test(d.path)&&['minimum','exclusiveMinimum'].includes(d.keyword)&&d.received===-1));
    const invalidClaim=copy(drawing);
    const claim=invalidClaim.model.entities ? invalidClaim.model.entities[0].existence : (invalidClaim.model.steps[0].occurrence ?? invalidClaim.model.steps[0].assertion);
    Object.assign(claim,{status:'unknown',reason:'Not known.'});
    const claimErrors=validateLayout(invalidClaim).diagnostics;
    assert.ok(claimErrors.some(d=>d.keyword==='additionalProperties'&&d.path.endsWith('/value')));
    assert.ok(!claimErrors.some(d=>d.keyword==='enum'&&d.path.endsWith('/status')),JSON.stringify(claimErrors));
    const semantic=copy(drawing);
    if(semantic.model.relationships)semantic.model.relationships[0].from='missing';else semantic.model.steps[0].from='missing';
    semantic.modelDigest=digest(semantic.model);
    const invalid=validateLayout(semantic).diagnostics.find(d=>d.keyword==='reference');assert.ok(invalid.path.startsWith('/model/'));assert.ok(invalid.record.path.startsWith('/model/'));assert.match(invalid.message,/At \/model\//);
  }
});
test('diagnostics bound large received values and never echo full parent objects',()=>{
  const m=copy();m.entities[0].category.value='x'.repeat(5000);
  const result=validateModel(m);const d=result.diagnostics.find(d=>d.path==='/entities/0/category/value');assert.ok(d);assert.equal(d.received.truncated,true);assert.equal(d.received.length,5000);assert.ok(JSON.stringify(result).length<5000);
  const other=copy();other.entities[0].existence={status:'established',value:true,basis:{sourceRefs:['fictional-run']}};
  const missing=validateModel(other).diagnostics;assert.ok(missing.some(d=>d.path.endsWith('/basis/explanation')));assert.ok(missing.every(d=>!JSON.stringify(d).includes('Coordinates stock, pricing')));
});

test('variant pruning stays local to each claim and preserves independent constraints',()=>{
  const m=copy();
  m.entities[0].existence={status:'unknown',reason:'Not known.',value:true,basis:{}};
  delete m.entities[1].existence.basis;
  m.entities[2].category.value='invalid-category';
  const ds=validateModel(m).diagnostics;
  assert.ok(ds.some(d=>d.path==='/entities/0/existence/value'));
  assert.ok(ds.some(d=>d.path==='/entities/0/existence/basis'&&d.keyword==='additionalProperties'));
  assert.ok(!ds.some(d=>d.path.startsWith('/entities/0/existence/basis/')));
  assert.ok(ds.some(d=>d.path==='/entities/1/existence/basis'&&d.keyword==='required'));
  assert.ok(ds.some(d=>d.path==='/entities/2/category/value'&&d.keyword==='enum'));
});
test('CLI identifies the command and file for JSON parsing and JSON 2 shape failures',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'waxwing-errors-'));
  try {
    const input=path.join(dir,'broken.json');
    for(const [command,content] of [['validate','{broken'],['check-layout','{}']]) {
      fs.writeFileSync(input,content);
      const run=spawnSync(process.execPath,[new URL('../bin/waxwing.mjs',import.meta.url).pathname,command,input],{encoding:'utf8'});
      assert.equal(run.status,1);
      const result=JSON.parse(run.stderr||run.stdout);
      assert.equal(result.command,command);assert.equal(result.input,input);assert.equal(result.ok,false);
    }
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('sequence evidence references identify the failing array element',()=>{
  const m=copy(scenario);m.steps[0].occurrence.basis.sourceRefs=['missing'];
  assert.ok(validateModel(m).diagnostics.some(d=>d.keyword==='reference'&&d.path==='/steps/0/occurrence/basis/sourceRefs/0'));
});
