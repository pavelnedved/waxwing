import ELK from 'elkjs/lib/elk.bundled.js';
import { fail } from '../shared/model.mjs';
import { workflowDrawingDiagnostics } from './model.mjs';
import { orderedSteps, nodeSize, labelSize } from './text.mjs';

// Compile appearances from explicit participation; ELK only places the resulting path.
export async function layoutWorkflow(model, workflow, { direction, groupingPerspectiveRef }, engine) {
  const diagnostics = workflowDrawingDiagnostics(model, workflow);
  if (diagnostics.length) fail(`Workflow "${workflow.id}" cannot be laid out.`, diagnostics);
  const steps = orderedSteps(workflow);
  const appearances = [{ id: 'appearance-0', entityRef: steps[0].from, afterStepRef: null },
    ...steps.map((step, i) => ({ id: `appearance-${i + 1}`, entityRef: step.to, afterStepRef: step.id }))];
  const placed = await new ELK().layout({ id: '__workflow', layoutOptions: {
    'elk.algorithm': 'layered', 'elk.direction': direction, 'elk.edgeRouting': 'ORTHOGONAL', 'elk.randomSeed': '1',
    'elk.layered.spacing.nodeNodeBetweenLayers': '100', 'elk.spacing.edgeLabel': '16',
    'elk.padding': '[top=96,left=36,bottom=36,right=36]',
  }, children: appearances.map((a) => ({ id: a.id, ...nodeSize(model, workflow, a, groupingPerspectiveRef) })),
  edges: steps.map((step, i) => ({ id: step.id, sources: [appearances[i].id], targets: [appearances[i + 1].id],
    labels: [{ id: `label-${step.id}`, text: step.label, ...labelSize(workflow, step), layoutOptions: { 'elk.edgeLabels.placement': 'CENTER' } }] })) });
  const box = ({ x, y, width, height }) => ({ x, y, width, height });
  return { ref: workflow.id, layout: { engine, direction, groupingPerspectiveRef },
    canvas: { width: Math.max(780, placed.width), height: placed.height },
    appearances: appearances.map((a) => ({ ...a, box: box(placed.children.find((n) => n.id === a.id)) })),
    edges: placed.edges.map((edge) => {
      if (edge.sections?.length !== 1 || edge.labels?.length !== 1) fail('Unsupported workflow route.');
      const s = edge.sections[0];
      const ordinal = steps.findIndex((step) => step.id === edge.id);
      return { ref: edge.id, fromAppearanceRef: appearances[ordinal].id, toAppearanceRef: appearances[ordinal + 1].id,
        points: [s.startPoint, ...(s.bendPoints ?? []), s.endPoint], label: box(edge.labels[0]) };
    }) };
}
