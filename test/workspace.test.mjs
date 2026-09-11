import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadWorkspace, affectedModels, workspaceMarkdown } from '../modules/workspace/index.mjs';
import { loadModel } from '../modules/documents/index.mjs';
import { installSkill } from '../modules/skill/index.mjs';
import { readGuide } from '../modules/skill/workflow.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = path.join(root, 'bin/waxwing.mjs');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2)); };
function fixture(t) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'waxwing-workspace-')));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const model = loadModel(path.join(root, 'examples/multi-page/model.json')).model;
  const sequence = loadModel(path.join(root, 'examples/sequence/model.json')).model;
  write(path.join(directory, 'platform-docs/system.json'), model);
  write(path.join(directory, 'payments/retry.json'), sequence);
  fs.writeFileSync(path.join(directory, 'payments/decision.md'), 'Retry before failing.\n');
  const input = path.join(directory, 'index/workspace.json');
  const config = {
    schemaVersion: '0.1-workspace-draft', id: 'commerce', title: 'Commerce explanations',
    sources: [
      { id: 'decision', location: '../payments/decision.md', revision: 'decision-v1' },
      { id: 'external', location: 'https://docs.example.com/design' },
      { id: 'unused', location: '../payments' },
    ],
    models: [
      { id: 'system', modelId: model.id, location: '../platform-docs/system.json', sourceRefs: ['external'] },
      { id: 'retry', modelId: sequence.id, location: '../payments/retry.json', sourceRefs: ['decision'], elaborates: [{ model: 'system', element: 'checkout' }] },
      // A separately registered explanation can share a canonical ID without merging identity.
      { id: 'unrelated', modelId: sequence.id, location: '../payments/retry.json', sourceRefs: [] },
    ],
  };
  write(input, config);
  return { directory, input, config, save: () => write(input, config) };
}

test('lineage resolves sibling repositories independently of cwd and remains portable when moved', t => {
  const f = fixture(t), before = fs.readFileSync(f.input, 'utf8');
  const workspace = loadWorkspace(f.input);
  assert.equal(workspace.ok, true); assert.equal(workspace.referencesComplete, true);
  assert.equal(workspace.sources[0].status, 'available'); assert.equal(workspace.sources[1].status, 'external');
  assert.equal(workspace.models[1].resolvedPath, path.join(f.directory, 'payments/retry.json'));
  assert.equal(workspace.relationships[0].status, 'verified');
  const plan = affectedModels(workspace, { sources: ['decision'] });
  assert.deepEqual(plan.reviews.map(m => m.id), ['system', 'retry']);
  assert.deepEqual(plan.unaffected, ['unrelated']);
  assert.deepEqual(plan.reviews[0].reasons[0].via.map(e => [e.from, e.to, e.direction]), [['retry', 'system', 'toward-parent']]);
  assert.ok(plan.reviews[0].blockers.some(s => s.includes('external')));
  assert.equal(plan.reviewComplete, false);
  assert.ok(plan.reviews.every(m => m.reviewStatus === 'needs-review'));
  assert.equal(fs.readFileSync(f.input, 'utf8'), before);
  const moved = path.join(f.directory, 'moved'); fs.mkdirSync(moved);
  for (const name of ['index', 'payments', 'platform-docs']) fs.renameSync(path.join(f.directory, name), path.join(moved, name));
  const relocated = loadWorkspace(path.join(moved, 'index/workspace.json'));
  assert.deepEqual(relocated.models.map(m => m.revision), workspace.models.map(m => m.revision));
  assert.equal(relocated.workspace.revision, workspace.workspace.revision);
});

test('review reaches detail, siblings and multiple parents with bounded paths and deduplicated triggers', t => {
  const f = fixture(t);
  f.config.models[2].elaborates = [{ model: 'system' }];
  f.config.models.push({ id: 'other-parent', modelId: 'remote', location: 'https://docs.example.com/model.json', sourceRefs: [] });
  f.config.models[1].elaborates.push({ model: 'other-parent' }); f.save();
  const workspace = loadWorkspace(f.input);
  const plan = affectedModels(workspace, { sources: ['decision', 'decision'], models: ['system'] });
  assert.equal(plan.reviews.length, 4); assert.equal(plan.triggers.length, 2);
  assert.ok(plan.reviews.every(m => m.reasons.length === 2));
  const sibling = plan.reviews.find(m => m.id === 'unrelated');
  assert.deepEqual(sibling.reasons[0].via.map(e => e.direction), ['toward-parent', 'toward-detail']);
  assert.ok(sibling.blockers.some(b => b.includes('No declared evidence')));
  const remote = plan.reviews.find(m => m.id === 'other-parent');
  assert.equal(remote.status, 'external'); assert.ok(remote.blockers.length);
  assert.equal(workspace.referencesComplete, false);
});

test('unavailable models and sources stay visible without cutting off related explanations', t => {
  const f = fixture(t);
  f.config.models[0].location = '../not-cloned/system.json';
  f.config.models[2].elaborates = [{ model: 'system' }];
  f.config.sources[0].location = '../missing/decision.md'; f.save();
  const workspace = loadWorkspace(f.input), plan = affectedModels(workspace, { sources: ['decision'] });
  assert.equal(workspace.ok, true); assert.equal(workspace.referencesComplete, false);
  assert.equal(plan.reviews.length, 3);
  assert.equal(plan.reviews[0].status, 'unavailable');
  assert.equal(plan.reviews[1].sources[0].status, 'unavailable');
  assert.ok(workspace.diagnostics.every(d => d.severity === 'warning'));
  assert.ok(workspace.relationships.every(r => r.status === 'unverified'));
});

test('bad declarations reject duplicate IDs, dangling references, cycles and unsafe locators', t => {
  const f = fixture(t), baseline = structuredClone(f.config);
  const cases = [
    c => c.models.push(structuredClone(c.models[0])),
    c => c.sources.push(structuredClone(c.sources[0])),
    c => c.models[0].sourceRefs.push('missing'),
    c => c.models[0].elaborates = [{ model: 'missing' }],
    c => c.models[0].elaborates = [{ model: 'retry' }],
    c => c.models[0].elaborates = [{ model: 'system' }],
    c => c.sources[0].location = 'javascript:alert(1)',
    c => c.sources[0].location = 'https://user:secret@example.com/',
    c => c.sources[0].location = 'https://',
    c => c.models[0].sources = ['invented-field'],
    c => c.models[0].sourceRefs.push(c.models[0].sourceRefs[0]),
  ];
  for (const mutate of cases) {
    const config = structuredClone(baseline); mutate(config); write(f.input, config);
    assert.throws(() => loadWorkspace(f.input), /Invalid workspace/);
  }
});

test('local target and model identity errors block validation while preserving the review queue', t => {
  const f = fixture(t);
  f.config.models[1].elaborates[0].element = 'does-not-exist'; f.save();
  let workspace = loadWorkspace(f.input);
  assert.equal(workspace.ok, false); assert.equal(workspace.relationships[0].status, 'invalid');
  assert.equal(affectedModels(workspace, { sources: ['decision'] }).reviews.length, 2);
  f.config.models[0].modelId = 'wrong-system'; f.save(); workspace = loadWorkspace(f.input);
  assert.equal(workspace.ok, false); assert.equal(workspace.models[0].status, 'invalid');
  assert.match(workspace.models[0].message, /Expected model ID/);
  fs.writeFileSync(path.join(f.directory, 'platform-docs/system.json'), '{');
  assert.equal(loadWorkspace(f.input).models[0].status, 'invalid');
});

test('no-match inputs are explicit and Markdown retains baseline identity without interpreting markup', t => {
  const f = fixture(t); f.config.title = '<script>bad</script>\n# heading'; f.save();
  const workspace = loadWorkspace(f.input);
  assert.throws(() => affectedModels(workspace), /at least one/);
  assert.throws(() => affectedModels(workspace, { sources: ['typo'] }), /Unknown changed source/);
  assert.throws(() => affectedModels(workspace, { models: ['typo'] }), /Unknown changed model/);
  const empty = affectedModels(workspace, { sources: ['unused'] });
  assert.deepEqual(empty.reviews, []); assert.deepEqual(empty.unmatchedSources, ['unused']);
  const markdown = workspaceMarkdown(affectedModels(workspace, { models: ['retry'] }));
  assert.ok(markdown.includes(workspace.workspace.revision));
  assert.ok(markdown.includes(workspace.models[1].revision));
  assert.ok(markdown.includes(path.join(f.directory, 'payments/retry.json')));
  assert.ok(!markdown.includes('<script>')); assert.ok(!markdown.includes('\n# heading'));
});

test('revisions include resolved documents and commands leave authoring untouched', t => {
  const f = fixture(t), filename = path.join(f.directory, 'platform-docs/system.json');
  const model = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const doc = model.documents[0];
  // Use a fresh file-backed document without inherited references to other docs.
  const { markdown, links, assets, ...fields } = doc;
  model.documents.push({ ...fields, id: 'workspace-review-doc', file: 'review.md' });
  fs.writeFileSync(path.join(f.directory, 'platform-docs/review.md'), '# Review\nOriginal explanation.');
  write(filename, model);
  const before = loadWorkspace(f.input).models[0].revision;
  assert.equal(typeof before, 'string');
  fs.appendFileSync(path.join(f.directory, 'platform-docs/review.md'), '\nChanged explanation.');
  const inputText = fs.readFileSync(filename, 'utf8');
  assert.notEqual(loadWorkspace(f.input).models[0].revision, before);
  assert.equal(fs.readFileSync(filename, 'utf8'), inputText);
});

test('CLI and installed skill produce the same cross-location review plan from an unrelated cwd', t => {
  const f = fixture(t), run = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: os.tmpdir(), encoding: 'utf8' });
  let result = run('workspace', 'affected', f.input, '--source', 'decision');
  assert.equal(result.status, 0, result.stderr);
  const expected = JSON.parse(result.stdout); assert.equal(expected.reviews.length, 2);
  for (const flags of [[], ['--source','typo'], ['--source'], ['--format','html'], ['--format','json','--format','markdown'], ['--bogus','yes']]) {
    assert.equal(run('workspace','affected',f.input,...flags).status, 1);
  }
  assert.equal(run('workspace','check',f.input,'--source','decision').status, 1);
  result = run('workspace','affected',f.input,'--source','decision','--format','markdown');
  assert.equal(result.status, 0); assert.ok(result.stdout.includes('Outcome: pending'));
  const skill = path.join(f.directory, 'skill'); installSkill(skill);
  result = spawnSync(process.execPath, [path.join(skill,'scripts/waxwing.mjs'),'workspace','affected',f.input,'--source','decision'], { cwd: os.tmpdir(), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); assert.deepEqual(JSON.parse(result.stdout), expected);
  assert.ok(readGuide(root, 'workspace').includes('workspace affected'));
  f.config.models[1].elaborates[0].element = 'missing'; f.save();
  result = run('workspace','check',f.input); assert.equal(result.status, 1); assert.equal(JSON.parse(result.stdout).ok, false);
});
