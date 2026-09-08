import { workflowDrawingDiagnostics } from './model.mjs';
import { orderedSteps, nodeSize, labelSize } from './text.mjs';
const EPS = .01;
const contains = (a, b) => b.x >= a.x - EPS && b.y >= a.y - EPS && b.x + b.width <= a.x + a.width + EPS && b.y + b.height <= a.y + a.height + EPS;
const overlaps = (a, b) => a.x < b.x + b.width - EPS && b.x < a.x + a.width - EPS && a.y < b.y + b.height - EPS && b.y < a.y + a.height - EPS;
const onBorder = (p, b) => contains(b, { ...p, width: 0, height: 0 }) && [p.x - b.x, p.x - b.x - b.width, p.y - b.y, p.y - b.y - b.height].some((d) => Math.abs(d) < EPS);
const cuts = (a, b, r) => Math.abs(a.x - b.x) < EPS ? a.x > r.x + EPS && a.x < r.x + r.width - EPS && Math.max(a.y,b.y) > r.y + EPS && Math.min(a.y,b.y) < r.y + r.height - EPS : a.y > r.y + EPS && a.y < r.y + r.height - EPS && Math.max(a.x,b.x) > r.x + EPS && Math.min(a.x,b.x) < r.x + r.width - EPS;
export function validateWorkflows(document) {
  const model = document.model, diagnostics = [];
  const add = (path, message) => diagnostics.push({ code: 'workflow/layout-invalid', path, message });
  const refs = (document.workflows ?? []).map((w) => w.ref);
  if (refs.length !== (model.workflows ?? []).length || new Set(refs).size !== refs.length || refs.some((id) => !model.workflows.some((w) => w.id === id))) add('/workflows', 'Every source workflow must have exactly one presentation.');
  if (diagnostics.length) return diagnostics;
  for (const [i, drawing] of (document.workflows ?? []).entries()) {
    const path = `/workflows/${i}`, workflow = model.workflows.find((w) => w.id === drawing.ref);
    const blockers = workflowDrawingDiagnostics(model, workflow);
    diagnostics.push(...blockers.map((d) => ({ ...d, path: path + d.path })));
    if (blockers.length) continue;
    const steps = orderedSteps(workflow), appearances = drawing.appearances, edges = drawing.edges;
    const perspective = drawing.layout.groupingPerspectiveRef;
    if (perspective !== null && !model.perspectives.some((p) => p.id === perspective)) add(path, 'Unknown grouping perspective.');
    const slots = [null, ...steps.map((s) => s.id)];
    if (appearances.length !== slots.length || new Set(appearances.map((a) => a.id)).size !== appearances.length || slots.some((slot) => appearances.filter((a) => a.afterStepRef === slot).length !== 1)) { add(path, 'Exactly one appearance is required at entry and after every step.'); continue; }
    if (edges.length !== steps.length || steps.some((s) => edges.filter((e) => e.ref === s.id).length !== 1)) { add(path, 'Exactly one edge must represent each workflow step.'); continue; }
    const ordered = slots.map((slot) => appearances.find((a) => a.afterStepRef === slot));
    const canvas = { x: 0, y: 0, ...drawing.canvas };
    if (canvas.width < 780) add(path, 'Canvas must fit the workflow captions.');
    for (const [j, a] of ordered.entries()) {
      if (a.entityRef !== (j ? steps[j - 1].to : steps[0].from)) { add(path, 'Appearance identity does not match its source participation.'); continue; }
      const size = nodeSize(model, workflow, a, perspective);
      if (a.box.y < 96 || !contains(canvas, a.box) || a.box.width < size.width - EPS || a.box.height < size.height - EPS) add(path, 'Appearance must fit its complete label and identity inside the canvas.');
      for (const other of ordered.slice(j + 1)) if (overlaps(a.box, other.box)) add(path, 'Appearances overlap.');
      if (j) {
        const prev = ordered[j - 1].box, axis = drawing.layout.direction === 'RIGHT' ? 'x' : 'y', dimension = axis === 'x' ? 'width' : 'height';
        if (a.box[axis] < prev[axis] + prev[dimension] - EPS) add(path, 'Appearances must progress in the declared reading direction and source order.');
      }
    }
    for (const [j, step] of steps.entries()) {
      const edge = edges.find((e) => e.ref === step.id), p = `${path}/edges/${edges.indexOf(edge)}`, size = labelSize(workflow, step);
      if (edge.fromAppearanceRef !== ordered[j].id || edge.toAppearanceRef !== ordered[j + 1].id) add(p, 'A step must connect its exact source and arrival appearances.');
      if (!onBorder(edge.points[0], ordered[j].box) || !onBorder(edge.points.at(-1), ordered[j + 1].box)) add(p, 'Route must connect the correct appearance borders.');
      if (edge.label.y < 84 || !contains(canvas, edge.label) || edge.label.width < size.width - EPS || edge.label.height < size.height - EPS) add(p, 'Step label must fit its text and qualification.');
      for (const a of appearances) if (overlaps(edge.label, a.box)) add(p, 'Label overlaps an appearance.');
      for (const other of edges) if (other !== edge && overlaps(edge.label, other.label)) add(p, 'Labels overlap.');
      edge.points.forEach((point, k) => {
        if (!contains(canvas, { ...point, width: 0, height: 0 })) add(p, 'Route exceeds canvas.');
        if (!k) return;
        const prev = edge.points[k - 1];
        if (Math.abs(point.x - prev.x) > EPS && Math.abs(point.y - prev.y) > EPS) add(p, 'Route must be orthogonal.');
        for (const a of appearances) if (cuts(prev, point, a.box)) add(p, 'Route crosses an appearance.');
        for (const other of edges) if (other !== edge && cuts(prev, point, other.label)) add(p, 'Route crosses another label.');
      });
    }
  }
  return diagnostics;
}
