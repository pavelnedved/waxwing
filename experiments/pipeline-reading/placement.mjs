import ELK from 'elkjs/lib/elk.bundled.js';
import { validateLayout } from '../../modules/layout/index.mjs';
import { edgeLines } from '../../modules/shared/model.mjs';

// Experimental flat-graph adapter. Production modules are not changed. Options
// match the production configuration at the time this experiment was written.
export async function placeForProcessing(baseline) {
  if (baseline.groups.length) throw new Error('This experiment supports a flat graph only.');
  const reversed = new Set(baseline.model.relationships.filter((edge) => edge.kind === 'consumes').map((edge) => edge.id));
  const placed = await new ELK().layout({
    id: '__canvas',
    layoutOptions: {
      'elk.algorithm': 'layered', 'elk.direction': 'RIGHT', 'elk.edgeRouting': 'ORTHOGONAL',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN', 'elk.randomSeed': '1', 'elk.json.edgeCoords': 'ROOT',
      'elk.spacing.nodeNode': '80', 'elk.layered.spacing.nodeNodeBetweenLayers': '110',
      'elk.spacing.edgeNode': '35', 'elk.spacing.edgeLabel': '16', 'elk.layered.spacing.edgeNodeBetweenLayers': '35',
      'elk.padding': '[top=36,left=36,bottom=36,right=36]',
    },
    children: baseline.nodes.map(({ ref, box }) => ({ id: ref, width: box.width, height: box.height })),
    edges: baseline.edges.map(({ ref, from, to, label }) => ({
      id: ref, sources: [reversed.has(ref) ? to : from], targets: [reversed.has(ref) ? from : to],
      labels: [{ id: `label-${ref}`, text: edgeLines(baseline.model.relationships.find((item) => item.id === ref)).join('\n'), width: label.width, height: label.height,
        layoutOptions: { 'elk.edgeLabels.placement': 'CENTER' } }],
    })),
  });
  const output = structuredClone(baseline);
  output.layout.engine += '+experiment-consumer-placement-v1';
  output.canvas = { width: placed.width, height: placed.height };
  output.nodes = placed.children.map(({ id, x, y, width, height }) => ({ ref: id, box: { x, y, width, height } }));
  output.edges = placed.edges.map((edge) => {
    if (edge.sections?.length !== 1 || edge.labels?.length !== 1) throw new Error(`Unsupported route for ${edge.id}`);
    const relation = baseline.model.relationships.find((item) => item.id === edge.id);
    const section = edge.sections[0];
    const points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].map(({ x, y }) => ({ x, y }));
    if (reversed.has(edge.id)) points.reverse(); // Preserve actor → resource arrows.
    const { x, y, width, height } = edge.labels[0];
    return { ref: edge.id, from: relation.from, to: relation.to, points, label: { x, y, width, height } };
  });
  for (const key of ['nodes', 'edges']) output[key].sort((a, b) => a.ref.localeCompare(b.ref));
  const result = validateLayout(output, { expectedModel: baseline.model });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics, null, 2));
  return output;
}
