import { wrap, units } from '../shared/model.mjs';
export const orderedSteps = (workflow) => workflow.order.value.map((id) => workflow.steps.find((s) => s.id === id));
export function stepLines(workflow, step) {
  return [...wrap(`${workflow.order.value.indexOf(step.id) + 1}. ${step.label}`, 24),
    `${step.kind} · ${step.occurrence.status}`, ...(step.replyTo ? wrap(`Reply to: ${step.replyTo}`, 24) : [])];
}
export function appearanceCue(workflow, appearance) {
  const ordinal = workflow.order.value.indexOf(appearance.afterStepRef) + 1;
  const entry = ['established','reported','inferred'].includes(workflow.entry.point.status);
  return appearance.afterStepRef === null ? (entry ? `Scoped entry · ${workflow.entry.point.status}` : `First recorded actor · entry ${workflow.entry.point.status}`) : `After step ${ordinal}`;
}
export function appearanceLines(model, workflow, appearance, perspective) {
  const entity = model.entities.find((e) => e.id === appearance.entityRef);
  const graph = model.graphs.find((g) => g.id === workflow.graphRef);
  const memberships = model.memberships.filter((m) => graph.membershipRefs.includes(m.id) && m.memberRef === entity.id && m.perspectiveRef === perspective);
  const badges = memberships.flatMap((m) => m.group.status === 'unknown' || m.group.status === 'disputed'
    ? [`Membership: ${m.group.status}`]
    : wrap(`${model.groups.find((g) => g.id === m.group.value)?.label ?? m.group.value} · ${m.group.status}`, 26));
  return [...wrap(`ID: ${entity.id}`, 26), ...badges];
}
export function nodeSize(model, workflow, appearance, perspective) {
  const entity = model.entities.find((e) => e.id === appearance.entityRef);
  return { width: Math.max(252, ...wrap(entity.label, 26).map((s) => units(s) * 9 + 36)),
    height: 112 + (wrap(appearanceCue(workflow, appearance), 26).length - 1) * 16 + wrap(entity.label, 26).length * 20 + appearanceLines(model, workflow, appearance, perspective).length * 16 };
}
export function labelSize(workflow, step) {
  const lines = stepLines(workflow, step);
  return { width: Math.max(...lines.map(units)) * 7.2 + 20, height: lines.length * 18 + 12 };
}
