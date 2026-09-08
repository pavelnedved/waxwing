// Semantic inspection of validated architecture JSON 1; no layout engine loaded.
export { workflowDiagnostics, workflowDrawingDiagnostics } from './model.mjs';
export const workflowsOf = (model, graphRef) => (model.workflows ?? []).filter((w) => graphRef === undefined || w.graphRef === graphRef);
export const workflowParticipants = (workflow) => [...new Set(workflow.steps.flatMap((s) => [s.from, s.to]))];
