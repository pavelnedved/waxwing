// Compatibility entry point; implementations are organized by responsibility.
export { loadWorkspace } from '../application/workspace.mjs';
export { WORKSPACE_VERSION } from '../knowledge/workspace/model.mjs';
export { affectedModels } from '../knowledge/workspace/review.mjs';
export { workspaceMarkdown } from '../presentation/workspace/markdown.mjs';
