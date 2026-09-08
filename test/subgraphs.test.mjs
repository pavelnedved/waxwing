import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadModel } from '../modules/documents/index.mjs';
import { validateModel } from '../modules/model/index.mjs';
import { layoutModel, validateLayout } from '../modules/layout/index.mjs';
import { renderHTML, renderSVG, recoverArtifact } from '../modules/render/index.mjs';
import { projectGraph } from '../modules/graphs/index.mjs';
import { digest } from '../modules/shared/model.mjs';

const source = new URL('../examples/subgraphs/model.json', import.meta.url);
const base = loadModel(source).model;
const layout = await layoutModel(base);
const copy = () => structuredClone(base);
const child = (m) => m.graphs[1];
const basis = base.graphs[1].expands.meaning.basis;
const established = (value) => ({ status: 'established', value, basis });
function rejects(change, pattern) {
  const m = copy(); change(m); const result = validateModel(m);
  assert.equal(result.ok, false);
  if (pattern) assert.match(JSON.stringify(result.diagnostics), pattern);
}

test('two graph views reuse identities and retain known, unknown, and disputed mappings', () => {
  assert.equal(validateModel(base).ok, true);
  assert.equal(layout.schemaVersion, '0.3-draft');
  assert.equal(layout.graphs.length, 2);
  assert.equal(base.entities.filter((entity) => entity.id === 'checkout').length, 1);
  assert.deepEqual(child(base).expands.boundaries.map((item) => item.detail.status), ['established', 'unknown', 'disputed']);
});

test('each graph renders only its selected nodes and edges; unknown mappings add no edges', () => {
  for (const graph of base.graphs) {
    const drawn = layout.graphs.find((item) => item.ref === graph.id);
    assert.deepEqual(drawn.nodes.map((item) => item.ref).sort(), [...graph.entityRefs, ...graph.contextRefs].sort());
    assert.deepEqual(drawn.edges.map((item) => item.ref).sort(), [...graph.relationshipRefs].sort());
  }
  const detailed = layout.graphs.find((item) => item.ref === 'order-internals');
  assert.equal(detailed.edges.some((edge) => edge.to === 'payments'), false);
});

test('all source records, documents, and mappings recover from HTML and either SVG', () => {
  for (const artifact of [layout, renderHTML(layout), renderSVG(layout), renderSVG(layout, { graphRef: 'order-internals' })]) assert.deepEqual(recoverArtifact(artifact), base);
  assert.match(renderSVG(layout, { graphRef: 'order-internals' }), /<title id="ww-title">Inside Order Processing/);
  assert.throws(() => renderSVG(layout, { graphRef: 'missing' }), /Unknown graph/);
});

test('layout is deterministic and does not modify JSON 1', async () => {
  const m = copy(); const original = structuredClone(m);
  assert.deepEqual(await layoutModel(m), layout); assert.deepEqual(m, original);
});

test('graph identities are globally unique and roots must exist', () => {
  rejects((m) => { m.graphs[1].id = m.entities[0].id; }, /duplicate/);
  rejects((m) => { m.rootGraphRef = 'missing'; }, /root/);
  rejects((m) => { m.graphs[0].id = m.id; }, /duplicate/);
});

test('graphs require visible endpoints and disjoint internal/context selections', () => {
  rejects((m) => child(m).contextRefs.push('worker'), /both internal/);
  rejects((m) => child(m).contextRefs.splice(0, 1), /endpoints/);
  rejects((m) => child(m).entityRefs.push('missing'), /Unknown entity/);
});

test('expansions need an included parent internal node and cannot include their own parent node', () => {
  rejects((m) => { child(m).expands.nodeRef = 'payments'; }, /internal node/);
  rejects((m) => { child(m).expands.graphRef = 'missing'; }, /included parent/);
  rejects((m) => child(m).entityRefs.push('orders'), /own internals/);
  rejects((m) => { delete child(m).expands; }, /Every non-root/);
});

test('expansion cycles fail, including disconnected cycles', () => {
  rejects((m) => {
    const a = structuredClone(child(m)); a.id = 'third'; a.expands.graphRef = 'order-internals'; a.expands.nodeRef = 'worker';
    a.entityRefs = ['orders']; a.contextRefs = []; a.relationshipRefs = []; a.expands.boundaries = [];
    child(m).expands.graphRef = 'third'; m.graphs.push(a);
  }, /acyclic/);
});

test('each incident parent edge needs exactly one qualified mapping', () => {
  rejects((m) => child(m).expands.boundaries.pop(), /Missing boundary/);
  rejects((m) => child(m).expands.boundaries.push(structuredClone(child(m).expands.boundaries[0])), /distinct parent edge/);
  rejects((m) => { child(m).expands.boundaries[0].relationshipRef = 'worker-db'; }, /parent edge/);
});

test('mapping candidates must preserve visible detailed edges, direction, and outside identity', () => {
  rejects((m) => { child(m).expands.boundaries[0].detail.value = ['missing']; }, /must be shown/);
  rejects((m) => { m.relationships.find((edge) => edge.id === 'checkout-api').from = 'payments'; }, /retain its identity/);
  rejects((m) => { const e = m.relationships.find((edge) => edge.id === 'checkout-api'); [e.from, e.to] = [e.to, e.from]; }, /endpoint/);
  rejects((m) => { child(m).expands.boundaries[2].detail.alternatives[0].value = ['worker-db']; }, /operation kind|endpoint/);
});

test('mappings preserve operation and conditions, including unresolved qualifications', () => {
  rejects((m) => { m.relationships.find((edge) => edge.id === 'checkout-api').kind = 'reads'; }, /operation kind/);
  rejects((m) => { m.relationships[0].condition = { status: 'unknown', reason: 'Not established.' }; }, /condition/);
  const m = copy(); const condition = { status: 'unknown', reason: 'Not established.' };
  m.relationships[0].condition = condition;
  m.relationships.find((edge) => edge.id === 'checkout-api').condition = { reason: condition.reason, status: condition.status };
  assert.equal(validateModel(m).ok, true, 'object property order is not meaning');
});

test('one parent edge may map to several child edges without treating alternatives as simultaneous facts', () => {
  const m = copy(); child(m).expands.boundaries[2].detail = established(['ops-api', 'ops-worker']);
  assert.equal(validateModel(m).ok, true);
  rejects((m) => { child(m).expands.boundaries[2].detail.alternatives = [established(['ops-api', 'ops-worker']), established(['ops-worker', 'ops-api'])]; }, /different sets/);
});

test('three abstraction levels work without guessing inherited edges or ownership', async () => {
  const m = copy(); const internal = structuredClone(m.entities.find((entity) => entity.id === 'worker')); internal.id = 'worker-loop'; internal.label = 'Worker loop'; m.entities.push(internal);
  m.graphs.push({ id: 'worker-detail', title: 'Worker detail', scope: structuredClone(child(m).scope), entityRefs: ['worker-loop'], contextRefs: [], relationshipRefs: [], membershipRefs: [],
    expands: { graphRef: 'order-internals', nodeRef: 'worker', meaning: established('A partial view of the worker implementation.'), boundaries: ['worker-queue', 'worker-db', 'ops-worker'].map((relationshipRef) => ({ relationshipRef, detail: { status: 'unknown', reason: 'Implementation correspondence is not recorded.' } })) } });
  const out = await layoutModel(m); assert.equal(out.graphs.length, 3);
  assert.deepEqual(out.graphs.find((graph) => graph.ref === 'worker-detail').edges, []);
  assert.deepEqual(recoverArtifact(renderHTML(out)), m);
});

test('group memberships must be selected per graph; parent grouping is not inherited', async () => {
  const m = copy();
  m.perspectives.push({ id: 'ownership', label: 'Ownership', meaning: 'Fictional owners', scope: 'Current fictional records', period: 'Current' });
  m.groups.push({ id: 'owner', label: 'Orders owner', perspectiveRef: 'ownership', meaning: established('Fictional owning team.') });
  m.memberships.push({ id: 'orders-owner', memberRef: 'orders', perspectiveRef: 'ownership', group: established('owner') });
  m.graphs[0].membershipRefs = ['orders-owner'];
  const out = await layoutModel(m, { groupingPerspectiveRef: 'ownership' });
  assert.equal(out.graphs.find((graph) => graph.ref === 'overview').groups.length, 1);
  assert.deepEqual(out.graphs.find((graph) => graph.ref === 'order-internals').groups, []);
  assert.deepEqual(projectGraph(m, 'order-internals').memberships, []);
});

test('graph-qualified Markdown links and attachments validate their actual graph membership', () => {
  assert.match(renderHTML(layout), /href="#graph=order-internals&amp;node=checkout"/);
  rejects((m) => { m.documents[0].attachments.push({ kind: 'node', ref: 'worker', graphRef: 'overview' }); }, /graphRef/);
  rejects((m) => { const doc = m.documents[0]; doc.markdown += '\n[Checkout](#node=checkout)'; doc.links.push({ href: '#node=checkout', target: { kind: 'node', ref: 'checkout' } }); }, /unambiguous/);
  rejects((m) => { const link = m.documents[0].links.find((link) => link.target.kind === 'node'); link.target.graphRef = 'overview'; }, /explicit target/);
});

test('JSON 2 rejects missing, duplicated, invented, or rewired graph geometry', () => {
  for (const mutate of [
    (out) => out.graphs.pop(), (out) => out.graphs.push(structuredClone(out.graphs[0])),
    (out) => { out.graphs[0].ref = 'invented'; },
    (out) => { out.graphs[0].edges[0].from = 'payments'; },
    (out) => out.graphs[0].nodes.pop(),
  ]) { const out = structuredClone(layout); mutate(out); assert.equal(validateLayout(out).ok, false); }
});

test('source checks detect changed subgraph meaning even with an updated digest', () => {
  const out = structuredClone(layout); out.model.graphs[1].scope.abstraction = 'Changed';
  assert.equal(validateLayout(out).ok, false);
  out.modelDigest = digest(out.model);
  assert.equal(validateLayout(out, { expectedModel: base }).ok, false);
});

test('version gates reject graph fields in older contracts and mismatched layout versions', () => {
  rejects((m) => { m.schemaVersion = '0.3-draft'; }, /schema/);
  const out = structuredClone(layout); out.schemaVersion = '0.2-draft'; assert.equal(validateLayout(out).ok, false);
});

test('CLI exports a chosen child SVG and recovers every graph after moving the artifact', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'waxwing-subgraphs-'));
  const cli = new URL('../bin/waxwing.mjs', import.meta.url).pathname;
  function run(args) { const result = spawnSync(process.execPath, [cli, ...args], { cwd: folder, encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr); }
  try {
    fs.writeFileSync(path.join(folder, 'layout.json'), JSON.stringify(layout));
    run(['render', 'layout.json', 'child.svg', '--graph', 'order-internals']);
    fs.renameSync(path.join(folder, 'child.svg'), path.join(folder, 'renamed.svg')); fs.unlinkSync(path.join(folder, 'layout.json'));
    run(['recover', 'renamed.svg', 'source.json']); assert.deepEqual(JSON.parse(fs.readFileSync(path.join(folder, 'source.json'))), base);
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});
