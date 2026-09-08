import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { recoverArtifact } from '../modules/render/artifacts.mjs';
import { loadModel } from '../modules/documents/index.mjs';

const root = new URL('../', import.meta.url).pathname;

test('demo reading guide attaches to both levels, a node, and an edge with links across levels', () => {
  const { model } = loadModel(path.join(root, 'examples/subgraphs/model.json'));
  const guide = model.documents.find((document) => document.id === 'reading-levels');
  for (const graph of model.graphs) assert.ok(guide.attachments.some((target) => target.kind === 'graph' && target.ref === graph.id));
  assert.ok(guide.attachments.some((target) => target.kind === 'node'));
  assert.ok(guide.attachments.some((target) => target.kind === 'edge'));
  for (const graph of model.graphs) assert.ok(guide.links.some((link) => link.target.kind === 'graph' && link.target.ref === graph.id));
});

test('default demo builds a portable HTML containing subgraphs and attached Markdown', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'waxwing-demo-'));
  try {
    for (const entry of ['package.json', 'bin', 'modules', 'schemas', 'examples']) {
      fs.cpSync(path.join(root, entry), path.join(temporary, entry), {
        recursive: true, filter: (source) => path.basename(source) !== 'generated',
      });
    }
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
    const result = spawnSync('npm', ['run', 'demo'], { cwd: temporary, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
    const html = fs.readFileSync(report.outputs.find((file) => file.endsWith('.html')), 'utf8');
    const model = recoverArtifact(html);
    assert.ok(model.graphs?.some((graph) => graph.expands), 'The default demo must include an expandable subgraph');
    assert.ok(model.documents?.some((document) => document.markdown && document.attachments.length), 'The default demo must include attached Markdown');
    assert.match(html, /href="#documents"/);
    assert.match(html, /<template id="ww-graph-/);
    assert.match(html, /<template id="ww-document-/);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
