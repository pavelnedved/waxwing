import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { layoutModel, validateLayout } from '../modules/layout/index.mjs';
import { renderSVG, renderHTML } from '../modules/render/index.mjs';
import { recoverArtifact, recoverModel } from '../modules/render/artifacts.mjs';
import { digest } from '../modules/shared/model.mjs';

const model = JSON.parse(fs.readFileSync(new URL('../examples/order-processing/model.json', import.meta.url), 'utf8'));
const options = { groupingPerspectiveRef: 'system-structure' };
const layout = await layoutModel(model, options);
const established = (value) => ({ status: 'established', value, basis: { sourceRefs: ['runtime-inventory'], explanation: 'Synthetic test fixture.' } });

test('JSON 1 → JSON 2 → SVG and HTML → recovered JSON 1 is lossless', () => {
  for (const artifact of [layout, JSON.stringify(layout), renderSVG(layout), renderHTML(layout)]) {
    assert.deepEqual(recoverArtifact(artifact), model);
  }
});

test('layout and rendering are reproducible and leave source intact', async () => {
  const before = structuredClone(model);
  assert.deepEqual(await layoutModel(model, options), layout);
  assert.equal(renderSVG(layout), renderSVG(layout));
  assert.equal(renderHTML(layout), renderHTML(layout));
  assert.deepEqual(model, before);
  const recovered = recoverModel(layout);
  recovered.title = 'Independent copy';
  assert.notEqual(layout.model.title, recovered.title);
});

function rejectsLayout(name, mutate, code) {
  test(name, () => {
    const modified = structuredClone(layout);
    mutate(modified);
    const result = validateLayout(modified);
    assert.equal(result.ok, false);
    assert.ok(result.diagnostics.some((item) => item.code === code), JSON.stringify(result));
    assert.throws(() => renderSVG(modified));
  });
}

rejectsLayout('dropping an entity is rejected', (document) => document.nodes.pop(), 'layout/coverage');
rejectsLayout('dropping an edge is rejected', (document) => document.edges.pop(), 'layout/coverage');
rejectsLayout('duplicating an edge is rejected', (document) => document.edges.push(document.edges[0]), 'layout/coverage');
rejectsLayout('inventing a visual node is rejected', (document) => document.nodes.push({ ref: 'invented', box: document.nodes[0].box }), 'layout/coverage');
rejectsLayout('reversing a consumer dependency is rejected', (document) => {
  const edge = document.edges.find((item) => item.ref === 'consume-order');
  [edge.from, edge.to] = [edge.to, edge.from];
}, 'layout/rewired');
rejectsLayout('source tampering breaks its recorded digest', (document) => { document.model.notes[0].answer.reason = 'Altered'; }, 'source/digest');
rejectsLayout('disputed ownership cannot become a containing box', (document) => {
  document.groups.push({ ref: 'commerce', box: { x: 10, y: 10, width: 100, height: 100 } });
}, 'layout/coverage');
rejectsLayout('overlapping nodes are rejected', (document) => { document.nodes[0].box = structuredClone(document.nodes[1].box); }, 'geometry/overlap');
rejectsLayout('non-finite geometry is rejected', (document) => { document.nodes[0].box.x = Infinity; }, 'layout/schema');
rejectsLayout('geometry outside the canvas is rejected', (document) => { document.nodes[0].box.x = document.canvas.width + 100; }, 'geometry/canvas');
rejectsLayout('unrelated nodes cannot be enclosed in a group', (document) => {
  document.groups[0].box = { x: 0, y: 0, ...document.canvas };
}, 'geometry/false-containment');

test('caller can check against the actual original model, beyond the self-reported digest', () => {
  const modified = structuredClone(layout);
  modified.model.notes[0].answer.reason = 'Changed but internally valid';
  modified.modelDigest = digest(modified.model);
  const result = validateLayout(modified, { expectedModel: model });
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((item) => item.code === 'source/changed'));
});

test('ownership perspective preserves dispute without selecting a frame', async () => {
  const alternate = await layoutModel(model, { groupingPerspectiveRef: 'runtime-ownership' });
  assert.deepEqual(alternate.groups, []);
  assert.deepEqual(recoverModel(alternate), model);
});

test('an independent renderer can consume a layout without choosing a grouping', async () => {
  const flat = await layoutModel(model);
  assert.equal(flat.layout.groupingPerspectiveRef, null);
  assert.deepEqual(flat.groups, []);
  assert.deepEqual(recoverArtifact(renderSVG(flat)), model);
});

test('changing direction changes geometry, not system meaning', async () => {
  const down = await layoutModel(model, { ...options, direction: 'DOWN' });
  assert.deepEqual(recoverModel(down), model);
  assert.notDeepEqual(down.nodes, layout.nodes);
});

test('unknown existence is visibly qualified while retained in the source', async () => {
  const uncertain = structuredClone(model);
  uncertain.relationships[4].existence = { status: 'unknown', reason: 'No proof of the direct call.' };
  const result = await layoutModel(uncertain, options);
  const svg = renderSVG(result);
  assert.ok(svg.includes('Existence unknown'));
  assert.deepEqual(recoverArtifact(svg), uncertain);
});

test('established absence is not rendered as ordinary presence', async () => {
  const absent = structuredClone(model);
  absent.relationships[4].existence = established(false);
  const result = await layoutModel(absent, options);
  assert.ok(renderSVG(result).includes('established · absent'));
  assert.deepEqual(recoverArtifact(renderSVG(result)), absent);
});

test('runtime cycles can be laid out without rewriting edge direction', async () => {
  const cyclic = structuredClone(model);
  cyclic.relationships.push({ id: 'callback', from: 'fulfillment', to: 'checkout-api', kind: 'calls', label: 'Sends callback', existence: established(true) });
  const result = await layoutModel(cyclic, options);
  assert.equal(validateLayout(result).ok, true);
  assert.deepEqual(recoverModel(result), cyclic);
});

test('model text is escaped while Unicode and hostile-looking text survive recovery', async () => {
  const hostile = structuredClone(model);
  hostile.title = 'α </script><script>alert("bad")</script> & "orders"';
  hostile.entities[0].label = '<img onerror=bad> α';
  hostile.notes[0].answer.reason = '</metadata><script>alert(1)</script>';
  const result = await layoutModel(hostile, options);
  for (const artifact of [renderHTML(result), renderSVG(result)]) {
    assert.deepEqual(recoverArtifact(artifact), hostile);
    assert.ok(!artifact.includes('<script>alert('));
    assert.ok(!artifact.includes('<img onerror='));
  }
});

test('ambiguous embedded source payloads fail rather than choosing one', () => {
  assert.throws(() => recoverArtifact(renderSVG(layout) + renderSVG(layout)), /exactly one/);
});

test('CLI stages can run independently and protect the original input', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'waxwing-test-'));
  const cli = new URL('../bin/waxwing.mjs', import.meta.url).pathname;
  const input = path.join(directory, 'model.json');
  const drawing = path.join(directory, 'layout.json');
  const svg = path.join(directory, 'diagram.svg');
  const recovered = path.join(directory, 'recovered.json');
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  try {
    fs.writeFileSync(input, JSON.stringify(model));
    for (const args of [['layout', input, drawing, '--group', 'system-structure'], ['render', drawing, svg], ['recover', svg, recovered]]) {
      const result = run(...args);
      assert.equal(result.status, 0, result.stderr);
    }
    assert.deepEqual(JSON.parse(fs.readFileSync(recovered)), model);
    const prior = fs.readFileSync(svg, 'utf8');
    const broken = structuredClone(layout); broken.edges.pop();
    fs.writeFileSync(drawing, JSON.stringify(broken));
    assert.notEqual(run('render', drawing, svg).status, 0);
    assert.equal(fs.readFileSync(svg, 'utf8'), prior);
    assert.notEqual(run('layout', input, input).status, 0);
    assert.deepEqual(JSON.parse(fs.readFileSync(input)), model);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('renderer import does not load the layout engine', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { createRequire } from 'node:module';
    await import('./modules/render/index.mjs');
    const cache = createRequire(import.meta.url).cache;
    if (Object.keys(cache).some(key => key.includes('/elkjs/'))) process.exit(1);
  `], { encoding: 'utf8', cwd: new URL('..', import.meta.url).pathname });
  assert.equal(result.status, 0, result.stderr);
});
