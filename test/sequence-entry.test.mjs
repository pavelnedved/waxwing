import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { loadModel } from '../modules/documents/index.mjs';
import { validateModel } from '../modules/model/index.mjs';
import { layoutSequence } from '../modules/sequence/index.mjs';
import { validateLayout } from '../modules/layout/index.mjs';
import { renderSVG, renderHTML } from '../modules/render/index.mjs';
import { recoverArtifact } from '../modules/render/artifacts.mjs';
import { digest } from '../modules/shared/model.mjs';
import { sequenceEntryHTML } from '../modules/sequence/render.mjs';
import { renderSite } from '../modules/site/index.mjs';

const scenario = loadModel(new URL('../examples/sequence/model.json', import.meta.url)).model;
const behavior = loadModel(new URL('../examples/sequence-markets/model.json', import.meta.url)).model;
const known = (value) => ({ status: 'established', value, basis: { sourceRefs: ['fixture'], explanation: 'Explicit fictional entry declaration.' } });
const unknown = () => ({ status: 'unknown', reason: 'The scoped entry has not been established.' });
const clone = (m = behavior) => structuredClone(m);
const leftmost = (d) => [...d.participants].sort((a,b) => a.lifeline.x - b.lifeline.x)[0].ref;
function blockEntry() {
  const m = clone(); m.steps = m.steps.filter((s) => s.id !== 'load-markets'); m.order.value.shift();
  m.documents = []; m.entry.point.value.itemRef = 'market-loop'; return m;
}

test('both sequence contracts retain qualified scoped entry and an independently unknown trigger', () => {
  for (const m of [scenario, behavior]) {
    const before = clone(m), r = validateModel(m);
    assert.equal(r.ok, true); assert.ok(r.unresolved.some((u) => u.path === '/entry/trigger'));
    const d = layoutSequence(m);
    assert.equal(leftmost(d), m.entry.point.value.participantRef);
    for (const skin of ['standard','engineering','editorial']) {
      const svg = renderSVG(d, {skin}), html = renderHTML(d, {skin});
      assert.match(svg, /Workflow entry \[established\]/); assert.match(svg, /Entry · established/);
      assert.match(html, /Trigger: unknown/);
      assert.deepEqual(recoverArtifact(svg), m); assert.deepEqual(recoverArtifact(html), m);
    }
    assert.deepEqual(m, before);
  }
});

test('renaming IDs cannot move an explicitly declared entry behind another participant', () => {
  for (const original of [scenario, behavior]) {
    const m = clone(original), oldId = m.entry.point.value.participantRef;
    m.documents = []; m.notes = [];
    const renamed = JSON.parse(JSON.stringify(m), (key, value) => value === oldId ? 'z-entry-actor' : value);
    renamed.participants.reverse(); renamed.steps.reverse();
    assert.equal(validateModel(renamed).ok, true);
    const d = layoutSequence(renamed); assert.equal(leftmost(d), 'z-entry-actor');
    const neutral = clone(renamed); delete neutral.entry;
    assert.notEqual(leftmost(layoutSequence(neutral)), 'z-entry-actor');
    assert.deepEqual(recoverArtifact(renderSVG(d)), renamed);
  }
});

test('omitted and unknown entries never synthesize an entry from the first interaction', () => {
  for (const original of [scenario, behavior]) for (const missing of [true,false]) {
    const m = clone(original); if (missing) delete m.entry; else m.entry.point = unknown();
    const d = layoutSequence(m), html = renderHTML(d);
    assert.equal(validateModel(m).ok, true);
    assert.match(html, new RegExp(`Workflow entry: ${missing ? 'not declared' : 'unknown'}`));
    assert.doesNotMatch(renderSVG(d), /Workflow entry \[/);
    assert.deepEqual(recoverArtifact(html), m);
    if (missing) assert.ok(!Object.hasOwn(d.model, 'entry'));
  }
});

test('a loop or conditional can be the entry item without inventing an interaction', () => {
  for (const kind of ['loop', 'if']) {
    const m = blockEntry();
    if (kind === 'if') {
      m.blocks = m.blocks.filter((b) => b.id !== 'market-loop');
      m.order.value = ['quote-route','save-quote','complete']; m.notes = [];
      m.entry.point.value.itemRef = 'quote-route';
    }
    const d = layoutSequence(m), svg = renderSVG(d);
    assert.equal(validateLayout(d).ok, true);
    assert.match(svg, /Workflow entry \[established\]/);
    assert.equal(d.steps.length, m.steps.length);
    const frame = d.blocks.find((b) => b.ref === m.entry.point.value.itemRef);
    frame.header.height -= 18;
    assert.equal(validateLayout(d).ok, false); // Cue requires actual header space.
  }
});

test('disputed entry actors remain alternatives and never drive leftmost placement', () => {
  const m = blockEntry();
  m.entry.point = { status:'disputed', reason:'The actor evaluating the loop differs between accounts.', alternatives: [
    known({participantRef:'storage',itemRef:'market-loop'}), known({participantRef:'collector',itemRef:'market-loop'}),
  ] };
  const before = clone(m), d = layoutSequence(m), svg = renderSVG(d), html = renderHTML(d);
  assert.equal(validateModel(m).ok, true); assert.equal(leftmost(d), 'collector'); // Alphabetical, not the first alternative.
  assert.match(svg, /Entry: disputed/); assert.doesNotMatch(svg, /Workflow entry \[/);
  assert.deepEqual(recoverArtifact(html).entry.point.alternatives, before.entry.point.alternatives);
});

test('reported or inferred entries stay qualified in the cue and inspector source', () => {
  for (const status of ['reported','inferred']) {
    const m = clone(); m.entry.point.status = status;
    const html = renderHTML(layoutSequence(m));
    assert.match(html, new RegExp(`Workflow entry \\[${status}\\]`));
    assert.match(html, new RegExp(`Entry · ${status}`));
    assert.deepEqual(recoverArtifact(html), m);
  }
});

test('invalid entry targets, actor conflicts, absent items and missing evidence are rejected', () => {
  for (const change of [
    m => { m.entry.point.value.participantRef = 'missing'; },
    m => { m.entry.point.value.itemRef = 'fixture'; },
    m => { m.entry.point.value.participantRef = 'live'; },
    m => { m.entry.point.basis.sourceRefs = ['missing']; },
    m => { m.entry.point.basis.sourceRefs = []; },
    m => { m.steps[0].assertion = known(false); },
    m => { delete m.entry.trigger; },
    m => { m.entry.point.value.x = 10; },
    m => { m.entry.trigger = { ...unknown(), value: 'Invented scheduler' }; },
  ]) { const m = clone(); change(m); assert.equal(validateModel(m).ok, false); }
});

test('entry consistency follows root control order, rejecting later or nested starts', () => {
  for (const itemRef of ['complete','request-live']) {
    const m = clone(); m.entry.point.value.itemRef = itemRef;
    assert.ok(validateModel(m).diagnostics.some((d) => d.code === 'sequence/entry'));
  }
  const m = clone(); m.order = unknown(); m.entry.point.value.itemRef = 'request-live';
  assert.equal(validateModel(m).ok, false); // Even unresolved root order cannot make nested membership a root entry.
});

test('unresolved order is not settled by declaring an entry', () => {
  const m = clone(); m.order = unknown(); assert.equal(validateModel(m).ok, true);
  assert.throws(() => layoutSequence(m), e => e.diagnostics.some(d => d.code === 'sequence/unresolved-order'));
  m.order = { status:'disputed', reason:'Different starting items.', alternatives:[known(behavior.order.value),known(['complete','market-loop','load-markets'])] };
  assert.equal(validateModel(m).ok, false); // One asserted start contradicts a candidate ordering.
  m.entry.point = { status:'disputed', reason:'Corresponding starting points differ.', alternatives:[known({participantRef:'collector',itemRef:'load-markets'}),known({participantRef:'collector',itemRef:'complete'})] };
  assert.equal(validateModel(m).ok, true);
  assert.throws(() => layoutSequence(m), /unresolved/);
});

test('JSON 2 cannot place another actor left of a declared entry or omit cue space', () => {
  const m = clone(); delete m.entry;
  // Supply otherwise neutral geometry, with a newly asserted start at a nonalphabetical participant.
  const actor = m.participants.find(p => p.id === 'collector'); actor.id = 'z-collector';
  for (const step of m.steps) for (const key of ['from','to']) if (step[key] === 'collector') step[key] = 'z-collector';
  const d = layoutSequence(m); d.model.entry = clone().entry; d.model.entry.point.value.participantRef = 'z-collector'; d.modelDigest = digest(d.model);
  assert.ok(validateLayout(d).diagnostics.some(d => /entry participant must be leftmost/.test(d.message)));
  const valid = layoutSequence(d.model); valid.steps.find(s => s.ref === 'load-markets').label.height -= 18;
  assert.equal(validateLayout(valid).ok, false);
});

test('trigger updates preserve geometry but remain covered by source digest and recovery', () => {
  const m = clone(), before = layoutSequence(m);
  m.entry.trigger = {status:'disputed',reason:'Different accounts of the upstream trigger.',alternatives:[known('Manual invocation'),known('Scheduled invocation')]};
  const after = layoutSequence(m);
  for (const key of ['participants','steps','blocks','canvas']) assert.deepEqual(after[key], before[key]);
  assert.notEqual(before.modelDigest, after.modelDigest);
  assert.deepEqual(recoverArtifact(renderHTML(after)), m);
  const altered = clone(after); altered.model.entry.trigger.reason = 'Changed';
  assert.equal(validateLayout(altered).ok, false);
});

test('entry text remains escaped and generated viewer script supports structured claim values', () => {
  const m = clone(); m.entry.point.basis.explanation = '</script><img src=x onerror=alert(1)> Evidence';
  m.entry.trigger = known('启动任务 '.repeat(80) + '</script>');
  const html = renderHTML(layoutSequence(m));
  assert.doesNotMatch(html, /<img src=x|<script[^>]+src=/);
  for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
  assert.deepEqual(recoverArtifact(html), m);
});

test('sequence start names its participant and first step or block in both viewers', () => {
  for (const m of [scenario, behavior, blockEntry()]) {
    const layout = layoutSequence(m), before = structuredClone(layout);
    const summary = sequenceEntryHTML(m, '#entry');
    const actor = m.participants.find(p => p.id === m.entry.point.value.participantRef);
    const item = [...m.steps, ...(m.blocks ?? [])].find(s => s.id === m.entry.point.value.itemRef);
    assert.ok(summary.includes(`Starts with ${actor.label}`));
    assert.ok(summary.includes(`${m.blocks?.includes(item) ? 'First block' : 'First step'}: ${item.label}`));
    const site = renderSite(layout).get(`graphs/${m.id}.html`);
    for (const html of [renderHTML(layout), site]) {
      assert.match(html, /<button id="sequence-start">Go to start<\/button>/);
      assert.equal((html.match(/<g[^>]+data-sequence-entry="participant"/g) ?? []).length, 1);
      assert.equal((html.match(/<g[^>]+data-sequence-entry="item"/g) ?? []).length, 1);
      assert.match(html, /Trigger: unknown/);
    }
    assert.deepEqual(layout, before);
  }
});

test('unresolved and undeclared starts do not offer a navigation target or mark an actor', () => {
  for (const status of ['unknown', 'disputed', 'omitted']) {
    const m = blockEntry();
    if (status === 'omitted') delete m.entry;
    else if (status === 'unknown') m.entry.point = unknown();
    else m.entry.point = { status, reason: 'Different accounts.', alternatives: [
      known({participantRef:'storage',itemRef:'market-loop'}), known({participantRef:'collector',itemRef:'market-loop'}),
    ] };
    const summary = sequenceEntryHTML(m, '#entry');
    assert.match(summary, new RegExp(`Starting point ${status === 'omitted' ? 'not declared' : status}`));
    assert.doesNotMatch(summary, /id="sequence-start"/);
    assert.doesNotMatch(renderSVG(layoutSequence(m)), /<g[^>]+data-sequence-entry=/);
  }
});

test('start summary escapes labels and keeps reported and inferred qualifications', () => {
  for (const status of ['reported', 'inferred']) {
    const m = clone(); m.entry.point.status = status;
    m.participants[0].label = '<img src=x onerror=alert(1)>';
    m.steps[0].label = '<script>bad</script>';
    const summary = sequenceEntryHTML(m, '#entry');
    assert.match(summary, new RegExp(`Workflow entry: ${status}`));
    assert.match(summary, /&lt;img/); assert.match(summary, /&lt;script/);
    assert.doesNotMatch(summary, /<img|<script/);
  }
});
