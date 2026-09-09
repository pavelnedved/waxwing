import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { loadModel } from '../../modules/documents/index.mjs';
import { layoutModel, validateLayout } from '../../modules/layout/index.mjs';
import { renderSVG, renderHTML } from '../../modules/render/index.mjs';
import { recoverArtifact } from '../../modules/render/artifacts.mjs';
import { inspectReadability } from '../../modules/layout/readability.mjs';
import { model as pipeline } from '../pipeline-reading/fixture.mjs';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = fileURLToPath(new URL('./generated/', import.meta.url));
const load = (name) => loadModel(path.join(root, `examples/${name}/model.json`)).model;
const nested = load('order-processing');
const group = structuredClone(nested.groups[0]); group.id = 'nested'; group.label = 'Nested services'; nested.groups.push(group);
const member = nested.memberships.find(m => m.id === 'worker-system');
nested.memberships.push({ ...structuredClone(member), id: 'nested-in-order', memberRef: 'nested' });
member.group.value = 'nested';

const cases = [
  { id: 'incoming-grouped', model: load('order-processing'), graph: 'order-processing', anchor: 'fulfillment', options: { groupingPerspectiveRef: 'system-structure' }, task: 'Begin at Fulfillment and identify the components that submit orders to it.' },
  { id: 'shared-hub', model: load('multi-page'), graph: 'services', anchor: 'orchestrator', options: {}, task: 'Begin at Orchestrator and identify its checkout, stock, pricing and payment connections.' },
  { id: 'pipeline', model: pipeline, graph: pipeline.id, anchor: 'upload-api', options: {}, task: 'Locate Upload API first and follow its recorded connections; column position does not establish processing order.' },
  { id: 'nested-group', model: nested, graph: nested.id, anchor: 'order-worker', options: { groupingPerspectiveRef: 'system-structure' }, task: 'Begin at Order Worker within nested system frames and identify its queue and fulfillment connections.' },
];
const viewport = { width: 1200, height: 520 };
const results = [];
for (const c of cases) {
  const result = { id: c.id, task: c.task, anchor: c.anchor, graph: c.graph, options: c.options, variants: {} };
  for (const variant of ['baseline', 'anchored']) {
    const options = { ...c.options, ...(variant === 'anchored' ? { readingAnchors: { [c.graph]: c.anchor } } : {}) };
    const d = await layoutModel(c.model, options);
    assert.equal(validateLayout(d, { expectedModel: c.model }).ok, true);
    const g = d.graphs?.find(g => g.ref === c.graph) ?? d;
    const anchor = g.nodes.find(n => n.ref === c.anchor);
    const warnings = inspectReadability(g, c.graph, viewport);
    const leading = g.nodes.every(n => n.box.x >= anchor.box.x - .01);
    if (variant === 'anchored') assert.ok(leading);
    const dir = path.join(output, c.id, variant); fs.mkdirSync(dir, { recursive: true });
    const svg = renderSVG(d, { graphRef: c.graph }), html = renderHTML(d);
    assert.deepEqual(recoverArtifact(svg), c.model); assert.deepEqual(recoverArtifact(html), c.model);
    fs.writeFileSync(path.join(dir, 'layout.json'), JSON.stringify(d, null, 2) + '\n');
    fs.writeFileSync(path.join(dir, 'diagram.svg'), svg);
    fs.writeFileSync(path.join(dir, 'diagram.html'), html);
    result.variants[variant] = {
      options, canvas: g.canvas, anchorBox: anchor.box, leading,
      fit: Math.min(viewport.width / g.canvas.width, viewport.height / g.canvas.height, 1.3),
      crossings: warnings.filter(w => w.code === 'readability/crossing').reduce((n, w) => n + w.measurement.crossings, 0),
      bends: g.edges.reduce((n, e) => n + Math.max(0, e.points.length - 2), 0),
      warnings: warnings.map(w => w.code),
    };
  }
  results.push(result);
}
const sources = ['modules/layout/index.mjs', 'modules/layout/validate.mjs', 'schemas/layout.schema.json', 'package-lock.json'];
const report = {
  criterion: 'Chosen anchor has no component before it on the reading axis; original source, arrows, coverage and eligible grouping pass validation and source recovery.',
  viewport, nodeVersion: process.version,
  sourceHashes: Object.fromEntries(sources.map(p => [p, createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex')])),
  results,
};
fs.writeFileSync(path.join(output, 'measurements.json'), JSON.stringify(report, null, 2) + '\n');
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
fs.writeFileSync(path.join(output, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reading-anchor comparison · Waxwing</title><style>body{max-width:1400px;margin:auto;padding:32px;font:15px/1.6 system-ui;color:#17283a;background:#f7f8fa}h1{margin-bottom:8px}section{margin:36px 0}.comparison{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}article{padding:20px;background:white;border:1px solid #dce3ea;border-radius:10px}img{width:100%;height:340px;object-fit:contain}a{color:#087d78}p{max-width:900px}@media(max-width:800px){.comparison{grid-template-columns:1fr}}</style><h1>Where to begin reading</h1><p>Same source, with and without a generation-time anchor. Open each viewer for readable 100% zoom and evidence. Thumbnails show overall composition. These measurements do not establish human comprehension.</p>${results.map(c => `<section><h2>${esc(c.id)}</h2><p>${esc(c.task)}</p><div class="comparison">${Object.entries(c.variants).map(([v, r]) => `<article><h3>${v === 'baseline' ? 'Default layout' : 'With reading anchor'}</h3><a href="${c.id}/${v}/diagram.html"><img src="${c.id}/${v}/diagram.svg" alt="${esc(c.id)} ${v} diagram">Open viewer →</a><p>${Math.round(r.canvas.width)} × ${Math.round(r.canvas.height)} · Fit ${Math.round(r.fit * 100)}% · ${r.crossings} crossings · Anchor first: ${r.leading ? 'yes' : 'no'}</p></article>`).join('')}</div></section>`).join('')}</html>`);
console.log(JSON.stringify(results.map(r => ({ id: r.id, baseline: r.variants.baseline.canvas, anchored: r.variants.anchored.canvas, crossings: [r.variants.baseline.crossings, r.variants.anchored.crossings] })), null, 2));
