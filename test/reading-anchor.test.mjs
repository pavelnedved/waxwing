import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadModel } from '../modules/documents/index.mjs';
import { layoutModel, validateLayout } from '../modules/layout/index.mjs';
import { renderSVG, renderHTML } from '../modules/render/index.mjs';
import { recoverArtifact } from '../modules/render/artifacts.mjs';
import { renderSite } from '../modules/site/index.mjs';
import { graphsOf, graphNodes } from '../modules/graphs/index.mjs';

const load = (name) => loadModel(new URL(`../examples/${name}/model.json`, import.meta.url)).model;
const orders = load('order-processing'), subgraphs = load('subgraphs'), workflows = load('multi-page');
const anchored = (m, ref, extra = {}) => layoutModel(m, { readingAnchors: { [m.id]: ref }, ...extra });
function leading(d, ref, direction = 'RIGHT') {
  const axis = direction === 'DOWN' ? 'y' : 'x';
  const anchor = d.nodes.find(n => n.ref === ref);
  assert.equal(d.layout.readingAnchorRef, ref);
  assert.ok(d.nodes.every(n => n.box[axis] >= anchor.box[axis] - .01), `${ref} must be at the leading edge`);
}

test('every component can anchor the existing architecture fixtures in either direction and perspective', async () => {
  for (const m of [orders, subgraphs, workflows]) for (const g of graphsOf(m)) {
    for (const ref of graphNodes(g)) for (const direction of ['RIGHT', 'DOWN']) {
      for (const groupingPerspectiveRef of [null, ...m.perspectives.map(p => p.id)]) {
        const before = structuredClone(m);
        const d = await layoutModel(m, { readingAnchors: { [g.id]: ref }, direction, groupingPerspectiveRef });
        leading(d.graphs?.find(x => x.ref === g.id) ?? d, ref, direction);
        assert.deepEqual(d.model, before);
        assert.equal(validateLayout(d, { expectedModel: before }).ok, true);
      }
    }
  }
});

test('an incoming-only anchor stays first with intact operation arrows and grouping', async () => {
  const d = await anchored(orders, 'fulfillment', { groupingPerspectiveRef: 'system-structure' });
  leading(d, 'fulfillment');
  const anchor = d.nodes.find(n => n.ref === 'fulfillment').box;
  for (const e of d.edges.filter(e => e.to === 'fulfillment')) {
    assert.equal(orders.relationships.find(r => r.id === e.ref).to, e.to);
    assert.ok(e.points.at(-1).x >= anchor.x && e.points.at(-1).x <= anchor.x + anchor.width);
    assert.ok(e.points[0].x > e.points.at(-1).x, 'Incoming operation still points back toward its resource');
  }
  for (const skin of ['standard', 'engineering', 'editorial']) {
    const svg = renderSVG(d, { skin });
    assert.match(svg, /data-reading-anchor="true"/);
    assert.match(svg, /Start reading here/);
    assert.deepEqual(recoverArtifact(svg), orders);
  }
  assert.deepEqual(recoverArtifact(renderHTML(d)), orders);
});

test('cycles, self edges and disconnected components remain present with an anchor', async () => {
  const m = structuredClone(orders); m.notes = []; m.relationships = [];
  const template = orders.relationships.find(e => e.kind === 'calls');
  for (const [from, to] of [['checkout-api','order-worker'], ['order-worker','fulfillment'], ['fulfillment','checkout-api'], ['order-worker','order-worker']]) {
    m.relationships.push({ ...structuredClone(template), id: `edge-${m.relationships.length}`, label: 'Calls', from, to });
  }
  const d = await anchored(m, 'order-worker');
  leading(d, 'order-worker');
  assert.equal(d.nodes.length, m.entities.length);
  assert.equal(d.edges.length, m.relationships.length);
  assert.deepEqual(recoverArtifact(renderHTML(d)), m);
});

test('an anchor inside nested frames remains first with preserved containment', async () => {
  const m = structuredClone(orders);
  m.groups.push({ ...structuredClone(m.groups[0]), id: 'nested', label: 'Nested services' });
  const membership = m.memberships.find(v => v.id === 'worker-system');
  m.memberships.push({ ...structuredClone(membership), id: 'nested-in-order', memberRef: 'nested' });
  membership.group.value = 'nested';
  for (const direction of ['RIGHT', 'DOWN']) {
    const d = await anchored(m, 'order-worker', { groupingPerspectiveRef: 'system-structure', direction });
    leading(d, 'order-worker', direction);
    assert.equal(validateLayout(d, { expectedModel: m }).ok, true);
    assert.ok(d.groups.some(g => g.ref === 'nested'));
  }
});

test('anchors are scoped to connectivity views and do not change workflows or unanchored graphs', async () => {
  const base = await layoutModel(subgraphs);
  const changed = await layoutModel(subgraphs, { readingAnchors: { overview: 'payments' } });
  assert.deepEqual(changed.graphs.find(g => g.ref === 'order-internals'), base.graphs.find(g => g.ref === 'order-internals'));
  const both = await layoutModel(subgraphs, { readingAnchors: { overview: 'payments', 'order-internals': 'worker' } });
  leading(both.graphs.find(g => g.ref === 'order-internals'), 'worker');
  const w = await layoutModel(workflows, { readingAnchors: { services: 'orchestrator' } });
  assert.deepEqual(w.workflows, (await layoutModel(workflows)).workflows);
  const site = renderSite(w);
  assert.match(site.get('graphs/services.html'), /id="reading-anchor-go" href="#record-orchestrator"/);
  assert.doesNotMatch(site.get('workflows/checkout-run.html'), /id="reading-anchor-go"/);
});

test('generation is deterministic, leaves inputs intact and unanchored output unchanged', async () => {
  const before = structuredClone(orders), options = { readingAnchors: { [orders.id]: 'orders-db' } };
  const d = await layoutModel(orders, options);
  assert.deepEqual(await layoutModel(orders, options), d);
  assert.deepEqual(orders, before);
  assert.deepEqual(options, { readingAnchors: { [orders.id]: 'orders-db' } });
  assert.deepEqual(await layoutModel(orders, { readingAnchors: {} }), await layoutModel(orders));
  const renamed = JSON.parse(JSON.stringify(orders), (_, v) => v === 'orders-db' ? 'z-database' : v);
  renamed.entities.reverse(); renamed.relationships.reverse();
  leading(await anchored(renamed, 'z-database'), 'z-database');
  // A valid ID can also be an Object prototype property.
  const named = { ...structuredClone(orders), id: 'constructor' };
  assert.equal((await layoutModel(named)).layout.readingAnchorRef, undefined);
});

test('invalid references, malformed options and sequence anchors are rejected', async () => {
  for (const readingAnchors of [null, [], 'checkout-api', { missing: 'checkout-api' }, { [orders.id]: 'missing' }, { [orders.id]: 3 }, { [orders.id]: 'order-system' }]) {
    await assert.rejects(layoutModel(orders, { readingAnchors }));
  }
  await assert.rejects(layoutModel(subgraphs, { readingAnchors: { overview: 'worker' } }), /shown in graph/);
  await assert.rejects(layoutModel(load('sequence'), { readingAnchors: { sequence: 'checkout' } }), /Sequence layout takes no options/);
});

test('validation rejects false anchor placement, unknown anchors and missing cue space', async () => {
  const d = await anchored(orders, 'fulfillment');
  const missing = structuredClone(d); missing.layout.readingAnchorRef = 'missing';
  assert.ok(validateLayout(missing).diagnostics.some(x => x.code === 'layout/reading-anchor'));
  const misplaced = structuredClone(d); misplaced.layout.readingAnchorRef = 'checkout-api';
  assert.ok(validateLayout(misplaced).diagnostics.some(x => x.code === 'layout/reading-anchor'));
  const small = structuredClone(d); small.nodes.find(n => n.ref === 'fulfillment').box.height -= 24;
  assert.ok(validateLayout(small).diagnostics.some(x => x.code === 'geometry/node-size'));
});

test('CLI builds and renders persisted anchors and preserves prior output on invalid requests', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'waxwing-anchor-'));
  const cli = (...args) => spawnSync(process.execPath, ['bin/waxwing.mjs', ...args], { encoding: 'utf8' });
  const file = path.join(dir, 'layout.json');
  const built = cli('layout', 'examples/subgraphs/model.json', file, '--anchor', 'overview=payments', '--anchor', 'order-internals=worker');
  assert.equal(built.status, 0, built.stderr);
  const before = fs.readFileSync(file, 'utf8');
  assert.equal(JSON.parse(before).graphs.find(g => g.ref === 'overview').layout.readingAnchorRef, 'payments');
  assert.equal(cli('render-site', file, path.join(dir, 'site')).status, 0);
  for (const args of [['--anchor', 'overview'], ['--anchor', 'overview=worker'], ['--anchor', 'overview=payments', '--anchor', 'overview=orders']]) {
    assert.equal(cli('layout', 'examples/subgraphs/model.json', file, ...args).status, 1);
    assert.equal(fs.readFileSync(file, 'utf8'), before);
  }
});
