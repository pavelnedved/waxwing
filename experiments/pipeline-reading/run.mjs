import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { layoutModel, validateLayout } from '../../modules/layout/index.mjs';
import { renderSVG, renderHTML, recoverArtifact } from '../../modules/render/index.mjs';
import { model, sequence } from './fixture.mjs';
import { placeForProcessing } from './placement.mjs';
import { comparisonPage } from './page.mjs';

const directory = new URL('./generated/', import.meta.url);
await fs.mkdir(directory, { recursive: true });
const saveJSON = (name, value) => fs.writeFile(new URL(name, directory), `${JSON.stringify(value, null, 2)}\n`);
await saveJSON('model.json', model);
const baseline = await layoutModel(model, { direction: 'RIGHT' });
const comparison = await placeForProcessing(baseline);

function evaluate(layout) {
  const boxes = new Map(layout.nodes.map(({ ref, box }) => [ref, box]));
  const transitions = sequence.slice(1).map((next, i) => {
    const previous = sequence[i];
    const a = boxes.get(previous), b = boxes.get(next);
    return { from: previous, to: next, fromX: a.x, fromRight: a.x + a.width, toX: b.x,
      advancesRight: b.x >= a.x + a.width, movesLeft: b.x + b.width / 2 < a.x + a.width / 2 };
  });
  return { transitions, advancesRight: transitions.filter((step) => step.advancesRight).length,
    movesLeft: transitions.filter((step) => step.movesLeft).length, total: transitions.length,
    canvas: layout.canvas, fitScaleAt1200px: Math.min(1, 1200 / layout.canvas.width) };
}

for (const [name, layout] of [['current', baseline], ['processing', comparison]]) {
  assert.equal(validateLayout(layout, { expectedModel: model }).ok, true);
  for (const edge of layout.edges) {
    const original = model.relationships.find((item) => item.id === edge.ref);
    assert.equal(edge.from, original.from);
    assert.equal(edge.to, original.to);
  }
  const svg = renderSVG(layout), html = renderHTML(layout);
  for (const artifact of [layout, svg, html]) assert.deepEqual(recoverArtifact(artifact), model);
  await saveJSON(`${name}.json`, layout);
  await fs.writeFile(new URL(`${name}.svg`, directory), svg);
  await fs.writeFile(new URL(`${name}.html`, directory), html);
}

// Control: only change the reading question; don't demand that it change layout.
const dependencyModel = structuredClone(model);
dependencyModel.scope.question = 'Which queues and datastore does each service depend on?';
const dependencyLayout = await layoutModel(dependencyModel, { direction: 'RIGHT' });
const geometry = ({ nodes, edges, groups, canvas }) => ({ nodes, edges, groups, canvas });
const results = {
  criterion: 'Each successive stage lies entirely to the right of the previous stage; target 5/5.',
  sequence, baseline: evaluate(baseline), comparison: evaluate(comparison),
  checks: {
    bothLayoutsValid: true, sameOriginalModelRecoveredFromBothFormats: true, originalOperationDirectionsPreserved: true,
    questionOnlyChangeLeavesGeometryIdentical: JSON.stringify(geometry(baseline)) === JSON.stringify(geometry(dependencyLayout)),
  },
};
await saveJSON('results.json', results);
await fs.writeFile(new URL('index.html', directory), comparisonPage(results, model));
console.log(JSON.stringify(results, null, 2));
