import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {loadModel} from '../modules/documents/index.mjs';
import {queryModel,modelRecords,searchRecords} from '../modules/query/index.mjs';

const input=new URL('../examples/multi-page/model.json',import.meta.url), model=loadModel(input).model;
test('inspection retains claim qualifications, evidence and revision without duplicate appearances',()=>{
  const before=structuredClone(model),result=queryModel(model,'inspect','orchestrator');
  assert.deepEqual(result.results[0].record,model.entities.find(e=>e.id==='orchestrator'));
  assert.equal(result.revision.length,64);assert.deepEqual(result.scope,model.scope);assert.ok(result.sources.length);
  assert.equal(modelRecords(model).filter(e=>e.record.id==='orchestrator').length,1);assert.deepEqual(model,before);
  assert.throws(()=>queryModel(model,'inspect','absent'),/Unknown record/);
});
test('neighbors respect direction and operation; workflow retrieval retains explicit steps and replies',()=>{
  const incoming=queryModel(model,'neighbors','orchestrator',{direction:'incoming'});
  assert.ok(incoming.results.every(r=>r.relationship.to==='orchestrator'));
  const outgoing=queryModel(model,'neighbors','orchestrator',{direction:'outgoing',relation:'calls'});
  assert.equal(outgoing.total,3);assert.ok(outgoing.results.every(r=>r.relationship.from==='orchestrator'&&r.relationship.kind==='calls'));
  const workflow=queryModel(model,'workflow','checkout-run');assert.deepEqual(workflow.results[0].record.steps,model.workflows[0].steps);
  const participants=queryModel(model,'workflows','stock',{budget:100000});assert.equal(participants.total,2);
  assert.ok(participants.results.every(r=>r.matchingStepRefs.length));
  assert.ok(queryModel(model,'workflows','stock',{budget:2000}).results.length>0);
  assert.match(outgoing.semantics,/no execution order/);
});
test('bounded query pagination preserves complete records and reports insufficient budgets',()=>{
  const first=queryModel(model,'neighbors','orchestrator',{limit:1});
  assert.equal(first.results.length,1);assert.ok(first.truncated);assert.equal(first.nextOffset,1);
  const next=queryModel(model,'neighbors','orchestrator',{offset:first.nextOffset,limit:100});
  assert.equal(next.results.length+first.results.length,first.total);
  const tiny=queryModel(model,'inspect','orchestrator',{budget:256});assert.deepEqual(tiny.results,[]);assert.ok(tiny.budget.minimumNextItemCharacters>256);assert.equal(tiny.nextOffset,null);
  assert.ok(JSON.stringify(first.results).length<=first.budget.characters);
  assert.throws(()=>queryModel(model,'search','checkout',{budget:0}),/budget/);
  assert.throws(()=>queryModel(model,'neighbors','orchestrator',{direction:'backwards'}),/Direction/);
  assert.throws(()=>queryModel(model,'inspect','orchestrator',{direction:'incoming'}),/Unknown query option/);
  assert.throws(()=>queryModel(model,'search','stock',{kind:'typo'}),/Unknown record kind/);
});
test('search requires all terms, ranks exact labels first, filters kinds and provides context',()=>{
  const entries=[{id:'a',kind:'component',title:'Checkout',text:'Receives a basket'}, {id:'b',kind:'document',title:'Guide',text:'Checkout submits a basket'}];
  assert.equal(searchRecords(entries,'checkout').results[0].id,'a');
  assert.equal(searchRecords(entries,'checkout basket',{kind:'document'}).results[0].id,'b');
  assert.equal(searchRecords(entries,'checkout absent').total,0);
  assert.equal(searchRecords(entries,' ').total,0);
  const result=queryModel(model,'search','stock',{kind:'component'});assert.ok(result.results.every(r=>r.kind==='component'));assert.ok(result.results[0].excerpt);
});
test('standalone sequences expose recorded behavior rather than invented graph paths, and CLI returns JSON',()=>{
  const sequence=loadModel(new URL('../examples/sequence-markets/model.json',import.meta.url)).model;
  const result=queryModel(sequence,'workflow',sequence.id,{budget:100000});assert.deepEqual(result.results[0].record.blocks,sequence.blocks);
  assert.throws(()=>queryModel(sequence,'neighbors',sequence.participants[0].id),/Use workflow/);
  const run=spawnSync(process.execPath,[new URL('../bin/waxwing.mjs',import.meta.url).pathname,'query',input.pathname,'search','stock','--kind','component'],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(run.stdout).ok,true);
});
