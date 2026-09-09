import { validateSequenceModel, drawableDiagnostics } from '../sequence/model.mjs';
import { prefixDiagnostics } from '../shared/diagnostics.mjs';
import { graphNodes } from '../graphs/index.mjs';

// Reuse scenario semantics; this projection never replaces canonical JSON 1.
export function workflowScenario(model, workflow) {
  const ids = new Set(workflow.steps.flatMap((s) => [s.from, s.to]));
  return { schemaVersion: '0.1-sequence-draft', diagramType: 'sequence', id: workflow.id,
    title: workflow.title, scope: workflow.scope, sources: model.sources,
    participants: model.entities.filter((e) => ids.has(e.id)).map((e) => ({ id: e.id, label: e.label, meaning: e.abstraction.represents })),
    steps: workflow.steps.map(({ relationshipRef, ...step }) => step), order: workflow.order,
    entry: workflow.entry, notes: [], documents: [] };
}
export function workflowDiagnostics(model) {
  const diagnostics = [];
  for (const [i, workflow] of (model.workflows ?? []).entries()) {
    const path = `/workflows/${i}`, graph = model.graphs.find((g) => g.id === workflow.graphRef);
    const add = (message, suffix = '') => diagnostics.push({ code: 'workflow/invalid', path: path + suffix, message });
    if (!graph) add('Workflow must name an included architecture graph.', '/graphRef');
    const visible = new Set(graph ? graphNodes(graph) : []);
    for (const [j, step] of workflow.steps.entries()) {
      if (![step.from, step.to].every((id) => visible.has(id))) add('Workflow participants must be selected by its architecture graph.', `/steps/${j}`);
      const edge = model.relationships.find((r) => r.id === step.relationshipRef);
      if (step.kind === 'message') {
        if (!edge || !graph?.relationshipRefs.includes(edge.id) || edge.from !== step.from || edge.to !== step.to) add('A message must reference a selected architecture operation with matching actor/resource direction.', `/steps/${j}/relationshipRef`);
        if (edge && step.occurrence.status === 'established' && step.occurrence.value && !(edge.existence.status === 'established' && edge.existence.value)) add('An established occurrence cannot promote an uncertain or absent architecture relationship.', `/steps/${j}/occurrence`);
        if (edge && ['established','reported','inferred'].includes(step.occurrence.status) && step.occurrence.value && edge.existence.status === 'established' && !edge.existence.value) add('An occurrence cannot use an operation established as absent.', `/steps/${j}/occurrence`);
      } else if (step.relationshipRef !== undefined) add('Replies refer to their message through replyTo; local events have no architecture operation mapping.', `/steps/${j}/relationshipRef`);
      for (const id of [step.from, step.to]) {
        const e = model.entities.find((e) => e.id === id);
        if (e && step.occurrence.status === 'established' && step.occurrence.value && !(e.existence.status === 'established' && e.existence.value)) add('Establish participant existence or qualify the occurrence.', `/steps/${j}`);
        if (e?.existence.status === 'established' && !e.existence.value && ['established','reported','inferred'].includes(step.occurrence.status) && step.occurrence.value) add('An occurrence cannot use an absent participant.', `/steps/${j}`);
      }
    }
    const result = validateSequenceModel(workflowScenario(model, workflow));
    diagnostics.push(...prefixDiagnostics(result.diagnostics, path));
  }
  return diagnostics;
}
export function workflowDrawingDiagnostics(model, workflow) {
  const diagnostics = drawableDiagnostics(workflowScenario(model, workflow)).map((d) => ({ ...d, code: d.code.replace('sequence/', 'workflow/'), message: d.code === 'sequence/unresolved-order' ? 'The workflow presentation requires one asserted order. Unknown/disputed order remains valid source; no alternative is selected.' : d.message }));
  if (!diagnostics.length) {
    const order = workflow.order.value.map((id) => workflow.steps.find((s) => s.id === id));
    for (let i = 1; i < order.length; i++) if (order[i - 1].to !== order[i].from) diagnostics.push({ code: 'workflow/discontinuous', path: '/order', message: 'This first workflow presentation requires a continuous interaction path. It cannot invent a handoff between consecutive steps with different actors.' });
  }
  return diagnostics;
}
