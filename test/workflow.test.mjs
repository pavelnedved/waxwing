import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { loadModel } from '../modules/documents/index.mjs';
import { validateModel } from '../modules/model/index.mjs';
import { layoutModel, validateLayout } from '../modules/layout/index.mjs';
import { renderSVG, renderHTML } from '../modules/render/index.mjs';
import { recoverArtifact } from '../modules/render/artifacts.mjs';
import { workflowsOf, workflowParticipants } from '../modules/workflow/index.mjs';
import { digest } from '../modules/shared/model.mjs';
const model = loadModel(new URL('../examples/orchestration/model.json', import.meta.url)).model;
const layout = await layoutModel(model);
const clone = (v = model) => structuredClone(v);
const unknown = {status:'unknown',reason:'Not established by this fixture.'};
const known = (value) => ({status:'established',value,basis:clone(model.workflows[0].order.basis)});
const geometry = (d) => d.workflows[0];
function invalidSource(change) { const m = clone(); change(m, m.workflows[0]); const r = validateModel(m); assert.equal(r.ok, false, JSON.stringify(m)); }
function invalidLayout(change) { const d = clone(layout); change(d, geometry(d)); const r = validateLayout(d); assert.equal(r.ok, false); }

test('workflow shares five canonical components and four operations while recording six interactions', () => {
  assert.equal(validateModel(model).ok,true);
  assert.equal(workflowsOf(model,'services').length,1);
  assert.equal(workflowParticipants(model.workflows[0]).length,5);
  assert.equal(model.relationships.length,4);
  const d = geometry(layout);
  assert.equal(d.appearances.length,7); assert.equal(d.edges.length,6);
  assert.equal(d.appearances.filter((a) => a.entityRef === 'orchestrator').length,3);
  assert.deepEqual(d.appearances.map((a) => a.entityRef), ['checkout','orchestrator','stock','orchestrator','pricing','orchestrator','payment']);
  assert.deepEqual(layout.model,model);
});
test('calls must map to selected matching operations; replies point to prior reversed requests', () => {
  for (const change of [
    (m,w) => delete w.steps[0].relationshipRef,
    (m,w) => w.steps[0].relationshipRef = 'orchestrator-stock',
    (m,w) => m.graphs[0].relationshipRefs.splice(0,1),
    (m,w) => w.steps[2].relationshipRef = 'orchestrator-stock',
    (m,w) => w.steps[2].replyTo = 'calculate-charge',
    (m,w) => w.steps[2].to = 'checkout',
    (m,w) => w.order.value = ['stock-result','submit','check-stock','calculate-charge','charge-result','charge-payment'],
  ]) invalidSource(change);
});
test('workflow identities, graph scope, references and claim evidence are explicit', () => {
  for (const change of [
    (m,w) => w.id = m.id,
    (m,w) => w.steps[0].id = 'orchestrator',
    (m,w) => w.steps[1].id = w.steps[0].id,
    (m,w) => w.graphRef = 'missing',
    (m,w) => w.steps[0].from = 'missing',
    (m,w) => w.order.basis.sourceRefs = ['unread'],
    (m,w) => w.steps[0].pos = [0,0],
    (m,w) => delete w.scope.abstraction,
    (m,w) => w.entry.point.value.itemRef = 'check-stock',
    (m,w) => w.entry.point.value.participantRef = 'orchestrator',
  ]) invalidSource(change);
});
test('an established workflow occurrence cannot upgrade uncertain source existence', async () => {
  invalidSource((m,w) => m.relationships[0].existence = clone(unknown));
  invalidSource((m,w) => m.relationships[0].existence = known(false));
  const m = clone(); m.relationships[0].existence = clone(unknown); m.workflows[0].steps[0].occurrence.status = 'reported';
  assert.equal(validateModel(m).ok,true);
  const d = await layoutModel(m);
  assert.match(renderSVG(d,{workflowRef:'checkout-run'}), /message · reported/);
  assert.deepEqual(recoverArtifact(renderHTML(d)),m);
});
test('unknown/disputed order and occurrences remain valid source but cannot produce invented paths', async () => {
  for (const change of [(w) => w.order = clone(unknown), (w) => w.steps[1].occurrence = clone(unknown), (w) => w.steps[1].occurrence = known(false),
    (w) => w.steps[1].occurrence = {status:'disputed',reason:'Conflicting reports.',alternatives:[known(true),known(false)]}]) {
    const m = clone(); change(m.workflows[0]); assert.equal(validateModel(m).ok,true);
    await assert.rejects(layoutModel(m));
  }
});
test('discontinuous ordered interactions are not silently joined with a fake handoff', async () => {
  const m = clone(), w = m.workflows[0]; m.documents = [];
  w.steps.splice(2,1); w.order.value.splice(2,1);
  assert.equal(validateModel(m).ok,true);
  await assert.rejects(layoutModel(m), (e) => e.diagnostics.some((d) => d.code === 'workflow/discontinuous'));
});
test('local events keep canonical identity and need no invented architecture operation', async () => {
  const m = clone(), w = m.workflows[0];
  w.steps.push({id:'local-check',label:'Check cached basket',kind:'event',from:'orchestrator',to:'orchestrator',occurrence:known(true)});
  w.order.value.splice(1,0,'local-check');
  const d = await layoutModel(m);
  assert.equal(geometry(d).appearances.filter((a) => a.entityRef === 'orchestrator').length,4);
  assert.equal(d.model.relationships.length,4);
  assert.match(renderSVG(d,{workflowRef:w.id}),/event · established/);
  invalidSource((m,w) => w.steps[0].kind = 'event');
});
test('entry qualification stays visible without declaring an upstream trigger', async () => {
  for (const status of ['unknown','reported','inferred']) {
    const m = clone(), w = m.workflows[0];
    if (status === 'unknown') w.entry.point = clone(unknown); else w.entry.point.status = status;
    const svg = renderSVG(await layoutModel(m),{workflowRef:w.id});
    assert.match(svg,new RegExp(`Entry: ${status}`)); assert.match(svg,/Trigger: unknown/);
    if (status === 'unknown') {assert.doesNotMatch(svg,/Scoped entry/);assert.match(svg,/First recorded actor/);}
    assert.deepEqual(recoverArtifact(svg),m);
  }
});
test('explicit order is independent of source storage order and repeat layouts are identical', async () => {
  const m = clone(); m.entities.reverse(); m.relationships.reverse(); m.workflows[0].steps.reverse();
  assert.deepEqual(geometry(await layoutModel(m)),geometry(layout));
  assert.deepEqual(await layoutModel(model),layout);
});
test('appearance and edge arrays may be reordered; references carry participation identity', () => {
  const d = clone(layout), w = geometry(d);
  w.appearances.reverse(); w.edges.reverse();
  for (const a of w.appearances) {
    const old = a.id; a.id = `custom-${old}`;
    w.edges.forEach((e) => { if(e.fromAppearanceRef === old)e.fromAppearanceRef=a.id; if(e.toAppearanceRef === old)e.toAppearanceRef=a.id; });
  }
  assert.equal(validateLayout(d).ok,true);
  assert.deepEqual(recoverArtifact(renderSVG(d,{workflowRef:'checkout-run'})),model);
});
test('JSON 2 rejects false copies, missing occurrences, changed participation and rewiring', () => {
  for (const change of [
    (d,w) => d.workflows.pop(), (d,w) => d.workflows.push(clone(w)), (d,w) => w.ref = 'invented',
    (d,w) => w.appearances.pop(), (d,w) => w.appearances.push(clone(w.appearances[0])),
    (d,w) => w.appearances[3].entityRef = 'stock', (d,w) => w.appearances[3].afterStepRef = 'submit',
    (d,w) => w.appearances[0].id = w.appearances[1].id,
    (d,w) => w.edges.pop(), (d,w) => w.edges[0].toAppearanceRef = w.appearances[3].id,
    (d,w) => w.edges[2].ref = 'check-stock',
  ]) invalidLayout(change);
});
test('workflow geometry validates order, text, route endpoints, canvas and collisions in both directions', async () => {
  const down = await layoutModel(model,{direction:'DOWN'}); assert.equal(validateLayout(down).ok,true);
  for (const change of [
    (d,w) => w.appearances[2].box = clone(w.appearances[1].box),
    (d,w) => w.appearances[0].box.width = 10,
    (d,w) => w.appearances[0].box.x = -5,
    (d,w) => w.edges[0].label.width = 10,
    (d,w) => w.edges[0].label = clone(w.appearances[0].box),
    (d,w) => w.edges[0].points[0].x += 20,
    (d,w) => w.edges[0].points[0].y += 20,
    (d,w) => w.canvas.width = 5,
    (d,w) => w.layout.direction = 'DOWN',
  ]) invalidLayout(change);
});
test('selected grouping remains canonical membership labels, not workflow containment frames', async () => {
  const m = clone();
  // Reuse the established perspective shape from the existing fixture.
  const sample = loadModel(new URL('../examples/order-processing/model.json',import.meta.url)).model;
  m.perspectives = clone([sample.perspectives.find((p) => p.id === 'system-structure')]);
  m.groups = [{id:'commerce',label:'Commerce',perspectiveRef:'system-structure',meaning:known('Fictional services boundary.')}];
  m.memberships = [{id:'orch-commerce',memberRef:'orchestrator',perspectiveRef:'system-structure',group:known('commerce')}];
  m.graphs[0].membershipRefs=['orch-commerce'];
  const r = validateModel(m); assert.equal(r.ok,true,JSON.stringify(r.diagnostics));
  const d = await layoutModel(m,{groupingPerspectiveRef:'system-structure'});
  assert.equal(d.graphs[0].groups.length,1); assert.equal(geometry(d).groups,undefined);
  const svg = renderSVG(d,{workflowRef:'checkout-run'});
  assert.equal((svg.match(/Commerce · established/g) ?? []).length,3);
  assert.deepEqual(recoverArtifact(svg),m);
});
test('documents resolve workflow, canonical component and step targets without source folders', () => {
  const html = renderHTML(layout);
  for(const target of ['#workflow=checkout-run','#workflow=checkout-run&amp;node=orchestrator','#workflow=checkout-run&amp;step=stock-result']) assert.ok(html.includes(`href="${target}"`));
  assert.deepEqual(recoverArtifact(html),model);
  invalidSource((m) => m.documents[0].attachments.push({kind:'step',ref:'stock-result',workflowRef:'missing'}));
  invalidSource((m) => m.documents[0].links[1].target.ref = 'invented');
  invalidSource((m) => m.documents[0].attachments.push({kind:'step',ref:'orchestrator'}));
});
test('schema versions cannot silently add workflow meaning or drop geometry', () => {
  invalidSource((m) => m.schemaVersion = '0.4-draft');
  invalidSource((m) => delete m.workflows);
  invalidLayout((d) => d.schemaVersion = '0.3-draft');
  invalidLayout((d) => delete d.workflows);
  const old = loadModel(new URL('../examples/subgraphs/model.json',import.meta.url)).model;
  old.documents[0].attachments.push({kind:'workflow',ref:'overview'});
  assert.equal(validateModel(old).ok,false);
});
test('all skins, both views and full recovery keep every source claim and document', () => {
  for(const skin of ['standard','engineering','editorial']) {
    const svg = renderSVG(layout,{workflowRef:'checkout-run',skin}), html = renderHTML(layout,{skin});
    assert.match(svg,/Same component · 3 appearances/); assert.match(svg,/stroke-dasharray="7 5"/);
    assert.equal((html.match(/<metadata id="waxwing-source"/g)??[]).length,1);
    assert.match(html,/ww-graph-services/); assert.match(html,/ww-workflow-checkout-run/);
    assert.deepEqual(recoverArtifact(svg),model); assert.deepEqual(recoverArtifact(html),model);
    new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  }
  assert.throws(() => renderSVG(layout,{workflowRef:'missing'}));
  assert.throws(() => renderSVG(layout,{workflowRef:'checkout-run',graphRef:'services'}));
});
test('changed source and hostile-looking text stay covered by digest, escaping and recovery', async () => {
  invalidLayout((d) => d.model.workflows[0].entry.trigger.reason = 'changed');
  const d = clone(layout); d.model.workflows[0].entry.trigger.reason = 'changed';d.modelDigest=digest(d.model);
  assert.equal(validateLayout(d,{expectedModel:model}).ok,false);
  const m = clone();m.entities[1].label='Orch </text><script>oops</script> 模組';m.workflows[0].steps[0].label='Send <script>oops</script>';
  const svg=renderSVG(await layoutModel(m),{workflowRef:'checkout-run'});
  assert.doesNotMatch(svg,/<script>oops/);assert.deepEqual(recoverArtifact(svg),m);
});
test('CLI exports the selected workflow and recovers after inputs disappear; failed layout preserves output', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'waxwing-workflow-')),cli=new URL('../bin/waxwing.mjs',import.meta.url).pathname;
  const input=path.join(dir,'model.json'),out=path.join(dir,'output'),svg=path.join(dir,'workflow.svg'),recovered=path.join(dir,'recovered.json');
  const run=(...args)=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
  try {
    fs.writeFileSync(input,JSON.stringify(model));
    assert.equal(run('build',input,out).status,0);
    const before=fs.readFileSync(path.join(out,'diagram.html'),'utf8');
    const broken=clone();broken.workflows[0].order=clone(unknown);fs.writeFileSync(input,JSON.stringify(broken));
    assert.notEqual(run('build',input,out).status,0);assert.equal(fs.readFileSync(path.join(out,'diagram.html'),'utf8'),before);
    fs.unlinkSync(input);
    assert.equal(run('render',path.join(out,'layout.json'),svg,'--workflow','checkout-run').status,0);
    fs.rmSync(out,{recursive:true});
    assert.equal(run('recover',svg,recovered).status,0);assert.deepEqual(JSON.parse(fs.readFileSync(recovered)),model);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('multiple workflows share architecture and appearance namespaces but require unique step identities', async () => {
  const m=clone(), second=clone(m.workflows[0]);second.id='second-run';
  second.steps.forEach((s)=>{s.id=`second-${s.id}`;if(s.replyTo)s.replyTo=`second-${s.replyTo}`;});
  second.order.value=second.order.value.map((id)=>`second-${id}`);second.entry.point.value.itemRef='second-submit';
  m.workflows.push(second);
  const d=await layoutModel(m);assert.equal(d.workflows.length,2);
  assert.equal(d.workflows[0].appearances[0].id,d.workflows[1].appearances[0].id);
  assert.deepEqual(recoverArtifact(renderSVG(d,{workflowRef:'second-run'})),m);
  m.documents[0].attachments.push({kind:'step',ref:'stock-result',workflowRef:'second-run'});
  assert.equal(validateModel(m).ok,false);
});
test('two invocations of one operation have distinct steps without duplicating the relationship', async () => {
  const m=clone(),w=m.workflows[0];
  w.steps.push({...clone(w.steps[1]),id:'stock-again'}, {...clone(w.steps[2]),id:'second-stock-result',replyTo:'stock-again'});
  w.order.value.splice(3,0,'stock-again','second-stock-result');
  const d=await layoutModel(m);
  assert.equal(d.model.relationships.length,4);assert.equal(geometry(d).edges.length,8);
  assert.equal(geometry(d).appearances.filter(a=>a.entityRef==='stock').length,2);
});
test('disputed order retains both supported paths and empty workflow registries retain connectivity', async () => {
  const m=clone(),w=m.workflows[0];
  w.order={status:'disputed',reason:'Fixture variants disagree on which lookup comes first.',alternatives:[clone(w.order),known(['submit','calculate-charge','charge-result','check-stock','stock-result','charge-payment'])]};
  assert.equal(validateModel(m).ok,true);await assert.rejects(layoutModel(m));
  m.workflows=[];m.documents=[];
  const d=await layoutModel(m);assert.equal(d.workflows.length,0);assert.equal(d.graphs.length,1);
  assert.deepEqual(recoverArtifact(renderHTML(d)),m);
});
test('workflow width warnings are available through the module validator as well as the viewer', () => {
  const r=validateLayout(layout);
  assert.equal(r.ok,true);
  assert.ok(r.warnings.some(w=>w.graphRef==='checkout-run'&&w.code==='readability/small-text'));
  assert.deepEqual(layout.model,model);
});
