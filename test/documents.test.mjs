import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { loadModel } from '../modules/documents/index.mjs';
import { validateModel } from '../modules/model/index.mjs';
import { layoutModel, validateLayout } from '../modules/layout/index.mjs';
import { renderHTML, renderSVG, recoverArtifact } from '../modules/render/index.mjs';
import { parseMarkdown } from '../modules/documents/markdown.mjs';

const example = new URL('../examples/documented-orders/model.json', import.meta.url);
const base = JSON.parse(fs.readFileSync(new URL('../examples/order-processing/model.json', import.meta.url)));
const loaded = loadModel(example);
const layout = await layoutModel(loaded.model, { groupingPerspectiveRef: 'system-structure' });

function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'waxwing-docs-'));
  const directory = path.join(root, 'arbitrary', 'architecture');
  fs.mkdirSync(directory, { recursive: true });
  const source = path.join(directory, 'model.json');
  const m = structuredClone(base); m.schemaVersion = '0.3-draft'; m.documents = [];
  const add = (id, file, content, attachments = [{ kind: 'graph', ref: m.id }]) => {
    const absolute = path.resolve(directory, file); fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content); m.documents.push({ id, title: id, format: 'markdown', file, attachments });
    return absolute;
  };
  const save = () => fs.writeFileSync(source, JSON.stringify(m));
  try { return fn({ root, source, m, add, save }); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('documents load from arbitrary folders and preserve every source character', () => fixture(({ add, save, source }) => {
  const text = '\ufeff# Café ☕\r\n\r\nOriginal **Markdown**.\r\n';
  add('guide', '../../elsewhere/guide.md', text); save();
  const { model } = loadModel(source);
  assert.equal(model.documents[0].markdown, text);
  assert.equal(Object.hasOwn(model.documents[0], 'file'), false);
}));

test('relative Markdown and reference-style links resolve from each originating file', () => fixture(({ add, save, source }) => {
  add('guide', '../../services/orders/README.md', '[Details](../interfaces/details.md#retry-rules)\n\n[again][d]\n\n[d]: ../interfaces/details.md#retry-rules');
  add('details', '../../services/interfaces/details.md', '# Retry rules'); save();
  const { model } = loadModel(source);
  assert.deepEqual(model.documents[0].links, [{ href: '../interfaces/details.md#retry-rules', target: { kind: 'document', ref: 'details', heading: 'retry-rules' } }]);
}));

test('node, edge, and graph attachments survive JSON 2 and both exported formats', () => {
  assert.equal(layout.schemaVersion, '0.2-draft');
  assert.deepEqual(new Set(loaded.model.documents.flatMap((doc) => doc.attachments.map((target) => target.kind))), new Set(['graph', 'node', 'edge']));
  for (const artifact of [layout, renderHTML(layout), renderSVG(layout)]) assert.deepEqual(recoverArtifact(artifact), loaded.model);
});

test('resolved JSON 1 renders and recovers without the source folders', () => {
  let model;
  fixture(({ add, save, source }) => { add('guide', '../guide.md', '# Portable\n\nText survives.'); save(); model = loadModel(source).model; });
  return layoutModel(model).then((result) => assert.deepEqual(recoverArtifact(renderHTML(result)), model));
});

test('loading again after a Markdown edit updates the snapshot without mutating the previous one', () => fixture(({ add, save, source }) => {
  const file = add('guide', '../guide.md', 'First version'); save(); const before = loadModel(source).model;
  fs.writeFileSync(file, 'Second version'); const after = loadModel(source).model;
  assert.equal(before.documents[0].markdown, 'First version'); assert.equal(after.documents[0].markdown, 'Second version');
}));

test('missing files, unregistered local destinations, and ambiguous file registrations fail', () => fixture(({ add, save, source, m }) => {
  const file = add('guide', '../guide.md', '[Missing](missing.md)'); save(); assert.throws(() => loadModel(source), /ENOENT/);
  fs.writeFileSync(path.join(path.dirname(file), 'missing.md'), '# Exists'); assert.throws(() => loadModel(source), /not registered/);
  m.documents.push({ ...m.documents[0], id: 'alias' }); save(); assert.throws(() => loadModel(source), /registered twice/);
}));

test('file content cannot conflict with inline content or silently ignore extra options', () => fixture(({ add, save, source, m }) => {
  add('guide', '../guide.md', '# Title'); m.documents[0].markdown = 'Conflict'; save(); assert.throws(() => loadModel(source), /not both/);
  delete m.documents[0].markdown; m.documents[0].invented = true; save(); assert.throws(() => loadModel(source), /invalid/);
}));

test('broken attachments, document references, and heading references fail canonical validation', () => {
  for (const mutate of [
    (m) => { m.documents[0].attachments[0].ref = 'missing-graph'; },
    (m) => { m.documents[0].links[0].target.ref = 'missing-doc'; },
    (m) => { m.documents[0].links[0].target.heading = 'missing-heading'; },
    (m) => { m.documents[0].attachments[0] = { kind: 'node', ref: 'worker-submit' }; },
  ]) {
    const m = structuredClone(loaded.model); mutate(m); assert.equal(validateModel(m).ok, false);
  }
});

test('all document IDs participate in identity validation and graph identity is reserved', () => {
  for (const ref of ['order-worker', loaded.model.id]) {
    const m = structuredClone(loaded.model); m.documents[0].id = ref;
    assert.ok(validateModel(m).diagnostics.some((item) => item.code === 'identity/duplicate'));
  }
});

test('explicit fragments cannot be rebound and key order does not alter reference meaning', () => {
  const m = structuredClone(loaded.model);
  const link = m.documents[0].links.find((item) => item.href === '#node=order-worker');
  link.target = { ref: 'order-worker', kind: 'node' }; assert.equal(validateModel(m).ok, true);
  link.target.ref = 'checkout-api'; assert.equal(validateModel(m).ok, false);
});

test('heading slugs are deterministic, document-scoped, and collision-free', () => {
  assert.deepEqual(parseMarkdown('# Same\n# Same\n# Same-1\n# **Café** `code`').headings.map((item) => item.slug), ['same', 'same-1', 'same-1-1', 'café-code']);
});

test('exported document links use internal identities, including cross-document headings', () => {
  const html = renderHTML(layout);
  assert.ok(html.includes('href="#document=submission-details&amp;heading=route-selection"'));
  assert.ok(html.includes('href="#graph=order-processing&amp;node=order-worker"'));
  assert.ok(html.includes('id="ww-doc-submission-details--route-selection"'));
  assert.ok(!html.includes('href="../interfaces/submission.md'));
});

test('raw HTML, dangerous schemes, and fenced code cannot execute in a rendered document', async () => {
  let model;
  fixture(({ add, save, source }) => {
    add('guide', '../guide.md', '# Test\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(2)>\n\n[bad](javascript:alert%281%29)\n\n[data](data:text/html,boom)\n\n```html\n</template><script>evil()</script>\n```');
    save(); model = loadModel(source).model;
  });
  const html = renderHTML(await layoutModel(model));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('href="data:'));
  assert.ok(!html.includes('</template><script>evil()'));
  assert.deepEqual(recoverArtifact(html), model);
});

test('external links stay external and remote images are links rather than automatic loads', async () => {
  let model;
  fixture(({ add, save, source }) => {
    add('guide', '../guide.md', '[Site](https://example.com/docs)\n\n![Remote](https://example.com/track.png)'); save(); model = loadModel(source).model;
  });
  const html = renderHTML(await layoutModel(model));
  assert.ok(html.includes('href="https://example.com/docs" target="_blank" rel="noopener noreferrer"'));
  assert.ok(html.includes('href="https://example.com/track.png"'));
  assert.ok(!html.includes('src="https://example.com/track.png"'));
});

test('local raster images travel with the model; MIME tampering and unsupported files fail', () => fixture(({ add, save, source, root }) => {
  const file = add('guide', '../guide.md', '![Pixel](pixel.png)');
  const image = path.join(path.dirname(file), 'pixel.png');
  const data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
  fs.writeFileSync(image, Buffer.from(data, 'base64')); save(); const result = loadModel(source);
  assert.ok(result.inputFiles.includes(fs.realpathSync(image))); assert.equal(result.model.documents[0].assets[0].data, data);
  result.model.documents[0].assets[0].mimeType = 'image/jpeg'; assert.equal(validateModel(result.model).ok, false);
  fs.writeFileSync(image, '<svg xmlns="http://www.w3.org/2000/svg"></svg>'); assert.throws(() => loadModel(source), /Unsupported image/);
}));

test('old schema versions cannot silently accept document fields', () => {
  const m = structuredClone(loaded.model); m.schemaVersion = '0.2-draft'; assert.equal(validateModel(m).ok, false);
  const modified = structuredClone(layout); modified.schemaVersion = '0.1-draft'; assert.equal(validateLayout(modified).ok, false);
});

test('embedded images render and recover after their input files disappear', async () => {
  const data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
  const model = fixture(({ add, save, source }) => {
    const file = add('guide', '../guide.md', '![Pixel](pixel.png)');
    fs.writeFileSync(path.join(path.dirname(file), 'pixel.png'), Buffer.from(data, 'base64')); save();
    return loadModel(source).model;
  });
  const drawing = await layoutModel(model);
  const html = renderHTML(drawing);
  assert.ok(html.includes(`src="data:image/png;base64,${data}"`));
  for (const artifact of [html, renderSVG(drawing)]) assert.deepEqual(recoverArtifact(artifact), model);
});

test('adding explanatory documents does not alter architectural layout', async () => {
  const without = await layoutModel(base, { groupingPerspectiveRef: 'system-structure' });
  for (const key of ['nodes', 'edges', 'groups', 'canvas']) assert.deepEqual(layout[key], without[key]);
});

test('canonical document content changes are caught by the existing JSON 2 source digest', () => {
  const modified = structuredClone(layout); modified.model.documents[0].markdown += '\nChanged.';
  assert.ok(validateLayout(modified).diagnostics.some((item) => item.code === 'source/digest'));
});

test('CLI can prepare and build from a different working directory and protects attached source files', () => fixture(({ add, save, source, root }) => {
  const file = add('guide', '../guide.md', '# Guide'); save();
  const cli = new URL('../bin/waxwing.mjs', import.meta.url).pathname;
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: os.tmpdir(), encoding: 'utf8' });
  const resolved = path.join(root, 'resolved.json');
  assert.equal(run('prepare', source, resolved).status, 0);
  const result = run('build', source, path.join(root, 'output')); assert.equal(result.status, 0, result.stderr);
  const document = JSON.parse(fs.readFileSync(resolved));
  assert.deepEqual(recoverArtifact(fs.readFileSync(path.join(root, 'output/diagram.html'), 'utf8')), document);
  assert.notEqual(run('prepare', source, file).status, 0); assert.equal(fs.readFileSync(file, 'utf8'), '# Guide');
}));
