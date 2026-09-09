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
import { recoverArtifact, extractLayout } from '../modules/render/artifacts.mjs';
import { layoutSequence } from '../modules/sequence/index.mjs';
import { digest } from '../modules/shared/model.mjs';

const fixture = new URL('../examples/sequence/model.json', import.meta.url);
const model = loadModel(fixture).model;
const drawing = layoutSequence(model);
const clone = () => structuredClone(model);
const known = (value) => ({ status: 'established', value, basis: { sourceRefs: ['fixture'], explanation: 'Fictional test assertion.' } });
const invalid = (change, pattern) => { const m = clone(); change(m); const result = validateModel(m); assert.equal(result.ok, false); assert.match(JSON.stringify(result.diagnostics), pattern); };

test('sequence model validates scope, five occurrences, and an explicit unknown retry outcome', () => {
  const before = clone(), result = validateModel(model);
  assert.equal(result.ok, true);
  assert.equal(result.summary.steps, 5);
  assert.equal(result.summary.unknown, 2);
  assert.deepEqual(model, before);
});

test('default pipeline dispatches sequence layout and preserves every source field in SVG and HTML', async () => {
  assert.deepEqual(await layoutModel(model), drawing);
  assert.equal(validateLayout(drawing, { expectedModel: model }).ok, true);
  for (const artifact of [renderSVG(drawing), renderHTML(drawing)]) assert.deepEqual(recoverArtifact(artifact), model);
  assert.deepEqual(layoutSequence(model), drawing);
});

test('semantic order comes from the explicit claim, never step or participant storage order', () => {
  const m = clone(); m.steps.reverse(); m.participants.reverse();
  const output = layoutSequence(m);
  assert.deepEqual(output.steps, drawing.steps); assert.deepEqual(output.participants, drawing.participants);
  assert.deepEqual(output.model.steps, m.steps);
  assert.ok(output.steps.find((s) => s.ref === 'retry').points[0].y > output.steps.find((s) => s.ref === 'submit').points[0].y);
});

test('unknown and disputed orders remain valid JSON 1 but cannot silently choose vertical order', () => {
  for (const order of [{ status: 'unknown', reason: 'Not recorded.' }, { status: 'disputed', reason: 'Timeout and success ordering differs.', alternatives: [known(model.order.value), known(['submit', 'charge', 'paid', 'timeout', 'retry'])] }]) {
    const m = clone(); m.order = order;
    assert.equal(validateModel(m).ok, true);
    assert.throws(() => layoutSequence(m), (error) => error.diagnostics.some((d) => d.code === 'sequence/unresolved-order'));
  }
});

test('order requires complete unique step coverage, valid sources, and distinct disputed alternatives', () => {
  invalid((m) => m.order.value.pop(), /every step exactly once/);
  invalid((m) => { m.order.value[0] = 'retry'; }, /duplicates; values must be unique/);
  invalid((m) => { m.order.value[0] = 'not-recorded'; }, /every step exactly once/);
  invalid((m) => { m.order.basis.sourceRefs = ['imagined']; }, /expected sources/);
  invalid((m) => { m.order = { status: 'disputed', reason: 'Two sources.', alternatives: [known(m.order.value), known(m.order.value)] }; }, /distinct values/);
});

test('replies require a prior message with reversed participants, local events stay local', () => {
  invalid((m) => { delete m.steps[3].replyTo; }, /reply must name/);
  invalid((m) => { m.steps[3].replyTo = 'submit'; }, /reversed participants/);
  invalid((m) => { m.steps[3].replyTo = 'timeout'; }, /reply must name/);
  invalid((m) => { m.order.value = ['submit','paid','charge','timeout','retry']; }, /must follow/);
  invalid((m) => { m.steps[4].replyTo = 'submit'; }, /Only a reply/);
  invalid((m) => { m.steps[2].to = 'orders'; }, /same participant/);
});

test('identities, participant references, claim evidence, and supported vocabulary are checked', () => {
  invalid((m) => { m.steps[1].id = m.participants[0].id; }, /Duplicate ID/);
  invalid((m) => { m.steps[0].from = 'missing'; }, /expected participants/);
  invalid((m) => { m.steps[0].occurrence.basis.sourceRefs = []; }, /"minItems":1/);
  invalid((m) => { m.notes[0].subjectRefs = ['missing']; }, /expected participants or steps/);
  invalid((m) => { m.steps[0].branches = []; }, /"keyword":"additionalProperties"/);
  invalid((m) => { m.schemaVersion = '0.4-draft'; }, /"keyword":"const"/);
  invalid((m) => { m.participants[0].pos = [0, 0]; }, /"keyword":"additionalProperties"/);
});

test('qualified orders and occurrences are drawn with explicit text, unresolved or absent occurrences are not invented', () => {
  const m = clone(); m.order.status = 'inferred'; m.steps[4].occurrence.status = 'reported';
  const html = renderHTML(layoutSequence(m));
  assert.match(html, /Order: inferred/); assert.match(html, /reported occurrence/);
  assert.deepEqual(recoverArtifact(html), m);
  for (const occurrence of [known(false), { status: 'unknown', reason: 'No evidence.' }, { status: 'disputed', reason: 'Conflicting observations.', alternatives: [known(true), known(false)] }]) {
    const uncertain = clone(); uncertain.steps[4].occurrence = occurrence;
    assert.equal(validateModel(uncertain).ok, true);
    assert.throws(() => layoutSequence(uncertain), (error) => error.diagnostics.some((d) => d.code === 'sequence/unresolved-step'));
  }
});

test('long Unicode labels and self messages fit without changing sequence order', () => {
  const m = clone(); m.participants[0].label = '用户订单'.repeat(15); m.steps[2].label = 'A long local event description '.repeat(12);
  m.steps[2].kind = 'message';
  const out = layoutSequence(m);
  assert.equal(validateLayout(out).ok, true);
  assert.equal(out.steps[2].points.length, 4);
  assert.deepEqual(recoverArtifact(renderSVG(out)), m);
});

test('JSON 2 rejects reordering, rewiring, dropped or duplicate occurrences, and unrelated labels', () => {
  for (const change of [
    (d) => d.steps.pop(), (d) => { d.steps[1] = structuredClone(d.steps[0]); },
    (d) => { d.steps[0].from = 'payments'; },
    (d) => { [d.steps[0].label, d.steps[4].label] = [d.steps[4].label, d.steps[0].label]; },
    (d) => { d.steps[0].label.x = 10; },
    (d) => { d.steps[0].points[1].x = d.participants[2].lifeline.x; },
    (d) => { d.steps[2].points.pop(); },
    (d) => { d.participants[0].lifeline.endY = 10; },
    (d) => { d.canvas.width = 10; },
    (d) => { d.steps[0].points[0].y = Infinity; },
    (d) => { d.participants[0].box.width = 1; },
  ]) { const d = structuredClone(drawing); change(d); assert.equal(validateLayout(d).ok, false); }
});

test('JSON 2 digest and independent expected source checks detect changed scenario facts', () => {
  const d = structuredClone(drawing); d.model.notes[0].answer.reason = 'Different unknown';
  assert.equal(validateLayout(d).ok, false);
  d.modelDigest = digest(d.model);
  assert.equal(validateLayout(d).ok, true);
  assert.equal(validateLayout(d, { expectedModel: model }).ok, false);
});

test('sequence documents use existing node/edge/graph references and reject broken or rebound links', () => {
  assert.match(renderHTML(drawing), /href="#graph=checkout-retry&amp;edge=timeout"/);
  invalid((m) => { m.documents[0].attachments[0].ref = 'another-scenario'; }, /Unknown graph target/);
  invalid((m) => { m.documents[0].links[0].target = { kind: 'edge', ref: 'retry' }; }, /changes the explicit target/);
});

test('all sequence skins remain self-contained and escape text while preserving complete source', () => {
  const m = clone(); m.steps[0].label = '</script><img src=x onerror=alert(1)> café';
  const d = layoutSequence(m);
  for (const skin of ['standard', 'engineering', 'editorial']) {
    const html = renderHTML(d, { skin });
    assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href="https?:|<img src=x/);
    for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
    assert.deepEqual(recoverArtifact(html), m); assert.deepEqual(recoverArtifact(renderSVG(d, { skin })), m);
  }
  assert.throws(() => layoutSequence(m, { direction: 'DOWN' }), /no options/);
  assert.throws(() => renderSVG(d, { graphRef: 'other' }), /graphRef/);
  assert.throws(() => renderHTML(d, { skin: 'unknown' }), /Skin must/);
});

test('sequence module import does not load ELK', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `import {createRequire} from 'node:module'; await import('./modules/sequence/index.mjs'); if(Object.keys(createRequire(import.meta.url).cache).some(p=>p.includes('elkjs'))) process.exit(1);`], { cwd: new URL('../', import.meta.url), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('CLI builds sequence artifacts and recovers all documents after source files are removed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'waxwing-sequence-'));
  const cli = new URL('../bin/waxwing.mjs', import.meta.url).pathname;
  const run = (...args) => { const r = spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r; };
  try {
    fs.copyFileSync(fixture, path.join(dir, 'model.json'));
    fs.copyFileSync(new URL('../examples/sequence/reading.md', import.meta.url), path.join(dir, 'reading.md'));
    run('validate','model.json'); run('build','model.json','output'); run('check-layout','output/layout.json');
    run('render','output/layout.json','standalone.svg');
    fs.unlinkSync(path.join(dir,'model.json')); fs.unlinkSync(path.join(dir,'reading.md')); fs.unlinkSync(path.join(dir,'output/layout.json'));
    run('recover','output/diagram.html','recovered.json');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'recovered.json'))), model);
    assert.deepEqual(extractLayout(fs.readFileSync(path.join(dir,'standalone.svg'),'utf8')), drawing);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
