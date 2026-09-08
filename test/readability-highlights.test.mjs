import assert from 'node:assert/strict';
import test from 'node:test';
import { loadModel } from '../modules/documents/index.mjs';
import { layoutModel, validateLayout, inspectReadability } from '../modules/layout/index.mjs';
import { selectHighlights, renderHTML, renderSVG, recoverArtifact } from '../modules/render/index.mjs';

const model = loadModel(new URL('../examples/subgraphs/model.json', import.meta.url)).model;
const layout = await layoutModel(model);
const child = model.graphs.find((graph) => graph.id === 'order-internals');
const parent = model.graphs.find((graph) => graph.id === 'overview');
const edge = (ref, from, to, points, label = { x: 800, y: 800, width: 20, height: 20 }) => ({ ref, from, to, points: points.map(([x, y]) => ({ x, y })), label });
const drawing = (edges, groups = []) => ({ canvas: { width: 1000, height: 1000 }, edges, groups });
const codes = (value) => inspectReadability(value, 'test').map((warning) => warning.code);

test('readability identifies long shared corridors without treating shared endpoints as ambiguous', () => {
  const a = edge('a', 'one', 'two', [[0, 50], [200, 50]]);
  const b = edge('b', 'three', 'four', [[50, 50], [150, 50]]);
  assert.ok(codes(drawing([a, b])).includes('readability/shared-corridor'));
  b.from = 'one'; assert.ok(!codes(drawing([a, b])).includes('readability/shared-corridor'));
  b.from = 'three'; b.points[1].x = 60; assert.ok(!codes(drawing([a, b])).includes('readability/shared-corridor'));
});

test('proper crossings are distinguished from bends and endpoint contacts', () => {
  const a = edge('a', 'one', 'two', [[0, 50], [100, 50]]);
  const b = edge('b', 'three', 'four', [[50, 0], [50, 100]]);
  assert.ok(codes(drawing([a, b])).includes('readability/crossing'));
  b.points[0].y = 50; assert.ok(!codes(drawing([a, b])).includes('readability/crossing'));
});

test('frame-border runs and near labels produce located advisory warnings', () => {
  const a = edge('a', 'one', 'two', [[0, 50], [100, 50]]);
  const b = edge('b', 'three', 'four', [[200, 200], [300, 200]], { x: 10, y: 52, width: 20, height: 20 });
  const warnings = inspectReadability(drawing([a, b], [{ ref: 'frame', box: { x: 0, y: 50, width: 100, height: 100 } }]), 'test');
  assert.ok(warnings.some((warning) => warning.code === 'readability/border-run' && warning.refs.includes('frame')));
  assert.equal(warnings.find((warning) => warning.code === 'readability/label-clearance').measurement.clearance, 2);
  assert.ok(warnings.every((warning) => warning.severity === 'warning' && warning.graphRef === 'test'));
});

test('text warnings depend on Fit viewport and do not mutate geometry', () => {
  const source = drawing([]), before = structuredClone(source);
  assert.ok(inspectReadability(source, 'test', { width: 300, height: 200 }).some((warning) => warning.code === 'readability/small-text'));
  assert.deepEqual(inspectReadability(source, 'test', { width: 1200, height: 1200 }), []);
  assert.deepEqual(source, before);
  assert.throws(() => inspectReadability(source, 'test', { width: 0, height: 100 }), /positive/);
});

test('warnings leave validation successful and keep the original layout recoverable', async () => {
  const out = await layoutModel(loadModel(new URL('../examples/order-processing/model.json', import.meta.url)).model);
  out.canvas.width = Math.max(out.canvas.width, 10000);
  const result = validateLayout(out);
  assert.equal(result.ok, true);
  assert.ok(Array.isArray(result.warnings));
  assert.ok(result.warnings.some((warning) => warning.code === 'readability/small-text'));
  assert.deepEqual(recoverArtifact(renderHTML(out)), out.model);
  assert.equal(Object.hasOwn(out, 'warnings'), false);
});

test('unknown correspondence highlights only known external context, never a guessed caller', () => {
  const result = selectHighlights(model, child, { boundaryRef: 'orders-payment' });
  assert.deepEqual(result.refs, ['payments']);
  assert.equal(result.boundary.detail.status, 'unknown');
  assert.throws(() => selectHighlights(model, parent, { boundaryRef: 'orders-payment' }), /does not belong/);
});

test('disputed correspondence highlights every recorded alternative without promoting existence', () => {
  const before = structuredClone(model);
  const result = selectHighlights(model, child, { boundaryRef: 'ops-orders' });
  assert.ok(result.refs.includes('ops-api') && result.refs.includes('ops-worker'));
  assert.equal(result.boundary.detail.status, 'disputed');
  assert.deepEqual(model, before);
});

test('parent unknown mode reveals unresolved child correspondence, not false uncertainty about edge existence', () => {
  const result = selectHighlights(model, parent, { mode: 'unknown' });
  assert.ok(result.refs.includes('orders-payment'));
  assert.ok(result.findings.some((item) => item.ref === 'orders-payment' && item.kind === 'boundary' && item.graphRef === child.id));
  assert.equal(model.relationships.find((edge) => edge.id === 'orders-payment').existence.status, 'established');
});

test('direct relationship highlighting never traverses transitively and preserves consumes direction', () => {
  const selected = selectHighlights(model, child, { ref: 'checkout' });
  assert.deepEqual(new Set(selected.refs), new Set(['checkout', 'checkout-api', 'order-api']));
  const consumes = selectHighlights(model, child, { mode: 'consumes' });
  assert.deepEqual(new Set(consumes.refs), new Set(['worker-queue', 'worker', 'queue']));
  assert.equal(model.relationships.find((edge) => edge.id === 'worker-queue').from, 'worker');
});

test('graph-scoped filters preserve context identities and do not pull unrelated graph edges', () => {
  assert.deepEqual(new Set(selectHighlights(model, child, { mode: 'context' }).refs), new Set(child.contextRefs));
  const disputed = selectHighlights(model, child, { mode: 'disputed' });
  assert.ok(disputed.refs.includes('ops-api'));
  assert.ok(!disputed.refs.includes('orders-payment'));
});

test('uncertain memberships and notes highlight their subjects without creating frames', () => {
  const m = structuredClone(model), graph = m.graphs[1];
  m.memberships.push({ id: 'worker-owner', memberRef: 'worker', perspectiveRef: 'owner', group: { status: 'unknown', reason: 'Unspecified' } });
  graph.membershipRefs.push('worker-owner');
  m.notes.push({ id: 'worker-note', subjectRefs: ['worker'], topic: 'rationale', statement: 'Why this worker?', answer: { status: 'unknown', reason: 'Unspecified' } });
  const result = selectHighlights(m, graph, { mode: 'unknown' });
  assert.ok(result.refs.includes('worker'));
  assert.ok(result.findings.some((finding) => finding.ref === 'worker-owner'));
  assert.ok(result.findings.some((finding) => finding.ref === 'worker-note'));
  assert.equal(m.groups.length, 0);
});

test('all skins preserve full JSON 1 and identical drawing coordinates in both formats', () => {
  const before = structuredClone(layout);
  const nodeBoxes = (markup) => [...markup.matchAll(/<rect class="node-box"[^>]+>/g)].map((match) => match[0]);
  for (const skin of ['standard', 'engineering', 'editorial']) {
    const html = renderHTML(layout, { skin }), svg = renderSVG(layout, { skin, graphRef: child.id });
    assert.deepEqual(recoverArtifact(html), model); assert.deepEqual(recoverArtifact(svg), model);
    assert.deepEqual(nodeBoxes(svg), nodeBoxes(renderSVG(layout, { graphRef: child.id })));
    assert.match(svg, new RegExp(`data-skin="${skin}"`));
    assert.match(svg, /class="qualified"/);
    assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href="https?:/);
  }
  assert.deepEqual(layout, before);
  assert.throws(() => renderHTML(layout, { skin: 'invented' }), /Skin must/);
});
