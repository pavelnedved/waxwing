import { drawableDiagnostics } from '../sequence/drawable.mjs';
import { workflowScenario } from '../../knowledge/workflow/model.mjs';

export function workflowDrawingDiagnostics(model, workflow) {
  const diagnostics = drawableDiagnostics(workflowScenario(model, workflow)).map((d) => ({ ...d, code: d.code.replace('sequence/', 'workflow/'), message: d.code === 'sequence/unresolved-order' ? 'The workflow presentation requires one asserted order. Unknown/disputed order remains valid source; no alternative is selected.' : d.message }));
  if (!diagnostics.length) {
    const order = workflow.order.value.map((id) => workflow.steps.find((s) => s.id === id));
    for (let i = 1; i < order.length; i++) if (order[i - 1].to !== order[i].from) diagnostics.push({ code: 'workflow/discontinuous', path: '/order', message: 'This first workflow presentation requires a continuous interaction path. It cannot invent a handoff between consecutive steps with different actors.' });
  }
  return diagnostics;
}
