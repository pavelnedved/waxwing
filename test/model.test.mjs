import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { validateModel } from '../modules/model/index.mjs';

const exampleUrl = new URL('../examples/order-processing/model.json', import.meta.url);
const original = JSON.parse(fs.readFileSync(exampleUrl, 'utf8'));
const fresh = () => structuredClone(original);
const asserted = (value) => ({ status: 'established', value, basis: { sourceRefs: ['runtime-inventory'], explanation: 'Synthetic test evidence.' } });

function rejected(name, mutate, code) {
  test(name, () => {
    const model = fresh();
    mutate(model);
    const result = validateModel(model);
    assert.equal(result.ok, false);
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === code), JSON.stringify(result.diagnostics));
  });
}

test('partial current model accepts four unknowns and a dispute without changing the input', () => {
  const model = fresh();
  const result = validateModel(model);
  assert.equal(result.ok, true);
  assert.deepEqual(result.summary, { entities: 5, relationships: 5, groups: 4, unknown: 4, disputed: 1 });
  assert.ok(result.qualifications.some((item) => item.path === '/notes/1/answer' && item.status === 'reported'));
  assert.deepEqual(model, original);
});

rejected('unknown condition cannot smuggle in a fallback value', (model) => {
  model.relationships[1].condition.value = 'Only if direct fulfillment fails';
}, 'schema/invalid');

rejected('disputed ownership cannot carry a secretly selected winner', (model) => {
  model.memberships[5].group.value = 'commerce';
}, 'schema/invalid');

rejected('a dispute needs two alternative values', (model) => {
  model.memberships[5].group.alternatives.pop();
}, 'schema/invalid');

rejected('same owner repeated with two sources is not a dispute', (model) => {
  model.memberships[5].group.alternatives[1].value = 'commerce';
}, 'knowledge/duplicate-alternative');

rejected('invented owner reference is rejected even inside an alternative', (model) => {
  model.memberships[5].group.alternatives[1].value = 'nonexistent-team';
}, 'reference/invalid');

rejected('unbacked established claims are rejected', (model) => {
  delete model.entities[0].existence.basis;
}, 'schema/invalid');

rejected('invented evidence source is rejected', (model) => {
  model.entities[0].existence.basis.sourceRefs = ['imaginary-source'];
}, 'reference/invalid');

rejected('invented relationship endpoint is rejected', (model) => {
  model.relationships[0].to = 'invented-db';
}, 'reference/invalid');

rejected('identity collisions across collections are rejected', (model) => {
  model.groups[0].id = model.entities[0].id;
}, 'identity/duplicate');

rejected('future topology is outside the first contract', (model) => {
  model.scope.timeframe = 'intended';
}, 'schema/invalid');

rejected('diagram abstraction level must be declared', (model) => {
  delete model.scope.abstraction;
}, 'schema/invalid');

rejected('a membership must name a declared perspective', (model) => {
  model.memberships[0].perspectiveRef = 'unexplained-view';
}, 'reference/invalid');

test('different responsibility meanings are separate perspectives, not automatic disputes', () => {
  const model = fresh();
  model.perspectives.push({ id: 'incident-response', label: 'Incident response', meaning: 'Team responsible for incident response, not deployment approval.', scope: 'Whole worker service', period: 'fixture-1' });
  model.groups.push({ id: 'incident-team', label: 'Incident team', perspectiveRef: 'incident-response', meaning: asserted('Incident response team') });
  model.memberships.push({ id: 'worker-incident-owner', memberRef: 'order-worker', perspectiveRef: 'incident-response', group: asserted('incident-team') });
  const result = validateModel(model);
  assert.equal(result.ok, true);
  assert.equal(result.summary.disputed, 1);
});

rejected('unqualified completeness is outside the first contract', (model) => {
  model.scope.coverage = 'complete';
}, 'schema/invalid');

rejected('coordinates cannot enter JSON 1', (model) => {
  model.entities[0].pos = [670, 300];
}, 'schema/invalid');

rejected('alternative reference values must have the correct type', (model) => {
  model.memberships[5].group.alternatives[1].value = true;
}, 'schema/invalid');

rejected('existence claims must be boolean', (model) => {
  model.entities[0].existence.value = 'yes';
}, 'schema/invalid');

rejected('ownership cannot be silently treated as system containment', (model) => {
  model.memberships[5].group.alternatives[1].value = 'order-system';
}, 'membership/perspective');

rejected('separate assignments cannot hide a dispute', (model) => {
  model.memberships.push({ id: 'second-worker-owner', memberRef: 'order-worker', perspectiveRef: 'runtime-ownership', group: asserted('commerce') });
}, 'membership/duplicate-perspective');

rejected('nested containment cycles are rejected', (model) => {
  model.memberships.push(
    { id: 'nest-one', memberRef: 'order-system', perspectiveRef: 'system-structure', group: asserted('fulfillment-system') },
    { id: 'nest-two', memberRef: 'fulfillment-system', perspectiveRef: 'system-structure', group: asserted('order-system') },
  );
}, 'membership/cycle');

rejected('an established edge cannot erase an uncertain endpoint', (model) => {
  model.entities[0].existence = { status: 'unknown', reason: 'No evidence of deployment.' };
}, 'relationship/uncertain-endpoint');

rejected('asserted edges cannot use an established absent entity', (model) => {
  model.entities[0].existence = asserted(false);
}, 'relationship/absent-endpoint');

test('runtime cycles remain valid', () => {
  const model = fresh();
  model.relationships.push({ id: 'callback', from: 'fulfillment', to: 'checkout-api', kind: 'calls', label: 'Callback', existence: asserted(true) });
  assert.equal(validateModel(model).ok, true);
});

test('unknown ownership can remain unanswered', () => {
  const model = fresh();
  model.memberships[5].group = { status: 'unknown', reason: 'No owner established.' };
  assert.equal(validateModel(model).ok, true);
});

test('a proposed uncertain edge is qualified without inventing its existence', () => {
  const model = fresh();
  model.relationships[4].existence = { status: 'unknown', reason: 'The direct call has not been established.' };
  const result = validateModel(model);
  assert.equal(result.ok, true);
  assert.ok(result.unresolved.some((item) => item.path === '/relationships/4/existence'));
});

test('all shipped source references resolve within the fictional evidence packet', () => {
  const evidence = fs.readFileSync(new URL('../examples/order-processing/evidence.md', import.meta.url), 'utf8');
  const anchors = [...evidence.matchAll(/^## (.+)$/gm)].map((match) => match[1].toLowerCase().replaceAll(' ', '-'));
  for (const source of original.sources) {
    assert.equal(source.kind, 'fixture');
    assert.ok(source.locator.startsWith('evidence.md#'));
    assert.ok(anchors.includes(source.locator.split('#')[1]));
  }
});

test('CLI is independently usable with the saved model', () => {
  const result = spawnSync(process.execPath, [new URL('../scripts/validate-model.mjs', import.meta.url).pathname, exampleUrl.pathname], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).ok, true);
});
