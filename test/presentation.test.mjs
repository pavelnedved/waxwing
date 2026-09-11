import assert from 'node:assert/strict';
import test from 'node:test';
import { componentPresentation, previewText } from '../modules/render/presentation.mjs';
import { units } from '../modules/shared/model.mjs';
import { loadModel } from '../modules/documents/index.mjs';
import { layoutModel } from '../modules/layout/index.mjs';
import { renderSVG, recoverArtifact } from '../modules/render/index.mjs';
import { renderSite } from '../modules/site/index.mjs';
import { selectHighlights, setDiagramFocus, cleanViewerSVG } from '../modules/render/highlights.mjs';

const model = loadModel(new URL('../examples/subgraphs/model.json',import.meta.url)).model;
const layout = await layoutModel(model);

test('component previews retain reported/inferred meaning and do not choose disputed alternatives', () => {
  const entity = structuredClone(model.entities[0]);
  for (const status of ['established','reported','inferred']) {
    entity.category = {status,value:'datastore'};
    entity.abstraction.represents = {status,value:'Keeps the order history.'};
    const p = componentPresentation(entity);
    assert.equal(p.role,'datastore');
    assert.equal(p.roleLabel,status==='established'?'Datastore':`Datastore · ${status}`);
    assert.equal(p.summary,status==='established'?'Keeps the order history.':`${status}: Keeps the order history.`);
  }
  for (const status of ['unknown','disputed']) {
    entity.category = {status,alternatives:[{value:'datastore'}]};
    entity.abstraction.represents = {status,alternatives:[{value:'Unsupported winner'}]};
    const p = componentPresentation(entity);
    assert.equal(p.role,'unspecified');
    assert.equal(p.roleLabel,`Category ${status}`);
    assert.equal(p.summary,`Meaning ${status}`);
  }
});

test('only established presence is quiet; absence and all qualified existence remain explicit', () => {
  const entity = structuredClone(model.entities[0]);
  entity.existence = {status:'established',value:true};
  assert.equal(componentPresentation(entity).existence,'');
  for (const status of ['established','reported','inferred']) for (const value of [true,false]) {
    entity.existence = {status,value};
    if (status==='established'&&value) continue;
    assert.match(componentPresentation(entity).existence,new RegExp(`${status} · ${value?'present':'absent'}`));
  }
  for (const status of ['unknown','disputed']) {
    entity.existence = {status};
    assert.equal(componentPresentation(entity).existence,`Existence ${status}`);
  }
});

test('previews fit drawing units, preserve Unicode, and expose truncation', () => {
  assert.equal(previewText('  one\n two  ',20),'one two');
  assert.equal(previewText('inferred: a long description',16),'inferred: a lo…');
  for (const text of ['数据库保存订单历史','A long name with 👩🏽‍💻 and punctuation.']) {
    const preview = previewText(text,10);
    assert.ok(units(preview)<=10);
    assert.ok(preview.endsWith('…'));
  }
});

test('site focus follows canonical one-hop relationships, including self edges and graph scope', async () => {
  const m = structuredClone(model);
  const graph = m.graphs.find(g=>g.id==='order-internals');
  const template = m.relationships.find(e=>graph.relationshipRefs.includes(e.id));
  m.relationships.push({...structuredClone(template),id:'checkout-self',from:'checkout',to:'checkout'});
  graph.relationshipRefs.push('checkout-self');
  const result = renderSite(await layoutModel(m));
  const html = result.get('graphs/order-internals.html');
  const attr = html.match(/data-focus-refs="([^"]*)" id="record-checkout"/)[1].replaceAll('&quot;','"');
  assert.deepEqual(new Set(JSON.parse(attr)),new Set(['checkout','checkout-api','order-api','checkout-self']));
  assert.deepEqual(JSON.parse(attr),selectHighlights(m,graph,{ref:'checkout'}).refs);
  assert.match(html,/Direct connections · 2/);
  assert.match(html,/Claims &amp; evidence|Claims & evidence/);
});

test('new text remains escaped and source remains recoverable without geometry changes', async () => {
  const m = structuredClone(model);
  m.entities[0].abstraction.represents.value = '<script>unsafe & text</script>';
  const result = await layoutModel(m);
  const before = structuredClone(result);
  const svg = renderSVG(result);
  assert.doesNotMatch(svg,/<script>unsafe/);
  assert.match(svg,/&lt;script&gt;unsafe &amp; text/);
  assert.deepEqual(recoverArtifact(svg),m);
  assert.deepEqual(result,before);
  assert.deepEqual(result.graphs.map(g=>g.nodes),layout.graphs.map(g=>g.nodes));
});

test('site uncertainty filters include related notes and keep those claims reachable in the component inspector', async () => {
  const self = loadModel(new URL('../examples/waxwing/model.json',import.meta.url)).model;
  const html = renderSite(await layoutModel(self)).get('graphs/overview.html');
  const highlights = JSON.parse(html.match(/data-claim-highlights="([^"]+)"/)[1].replaceAll('&quot;','"'));
  assert.ok(highlights.unknown.includes('layout'));
  const card = html.slice(html.indexOf('id="record-layout"'),html.indexOf('id="record-render"'));
  assert.match(card,/Related claims/);
  assert.match(card,/performance-unknown/);
  assert.match(card,/data-status="unknown"/);
});

// Minimal DOM boundary: exercise transient class behavior, including the two
// separately rendered records for an edge's route and label.
function element(ref, classes = [], frame = false) {
  const names = new Set(classes);
  return {dataset:{ref},names,classList:{contains:n=>names.has(n),remove:(...ns)=>ns.forEach(n=>names.delete(n)),toggle:(n,on)=>on?names.add(n):names.delete(n)},querySelector:()=>frame?{}:null};
}
test('focus retains frames, selections and qualified highlights; clearing restores every record', () => {
  const records = [element('node'),element('edge'),element('edge'),element('other'),element('group',[],true),element('unknown',['highlight-match']),element('selected',['selected'])];
  const svg = {querySelectorAll:()=>records};
  setDiagramFocus(svg,['node','edge']);
  assert.deepEqual(records.filter(r=>r.names.has('context-muted')).map(r=>r.dataset.ref),['other']);
  setDiagramFocus(svg,['not-in-this-view']);
  assert.ok(records.every(r=>!r.names.has('context-muted')));
  setDiagramFocus(svg,['node']); setDiagramFocus(svg,[]);
  assert.ok(records.every(r=>!r.names.has('context-muted')));
});
test('canonical SVG export removes every transient focus style while preserving qualification', () => {
  const record = element('edge',['qualified','selected','highlight-match','context-muted']);
  const clean = {removeAttribute:()=>{},querySelectorAll:()=>[record]};
  assert.equal(cleanViewerSVG({cloneNode:()=>clean}),clean);
  assert.deepEqual([...record.names],['qualified']);
});
