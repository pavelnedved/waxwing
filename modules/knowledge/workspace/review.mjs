export function affectedModels(workspace, { sources = [], models = [] } = {}) {
  if (!Array.isArray(sources) || !Array.isArray(models) || !sources.length && !models.length) throw new Error('Specify at least one changed source or model.');
  const sourceMap = new Map(workspace.sources.map(e => [e.id, e]));
  const modelMap = new Map(workspace.models.map(e => [e.id, e]));
  for (const id of sources) if (!sourceMap.has(id)) throw new Error(`Unknown changed source "${id}".`);
  for (const id of models) if (!modelMap.has(id)) throw new Error(`Unknown changed model "${id}".`);
  const triggers = [...new Set(sources)].map(id => ({ kind: 'source', id })).concat([...new Set(models)].map(id => ({ kind: 'model', id })));
  const adjacency = new Map(workspace.models.map(m => [m.id, []]));
  for (const { child, parent, element, status } of workspace.relationships) {
    adjacency.get(child).push({ from: child, to: parent, direction: 'toward-parent', ...(element ? { element } : {}), status });
    adjacency.get(parent).push({ from: parent, to: child, direction: 'toward-detail', ...(element ? { element } : {}), status });
  }
  const affected = new Map();
  for (const trigger of triggers) {
    const roots = trigger.kind === 'model' ? [trigger.id] : workspace.models.filter(m => m.sourceRefs.includes(trigger.id)).map(m => m.id);
    const queue = roots.map(id => ({ id, via: [] })), seen = new Set(roots);
    for (let i = 0; i < queue.length; i++) {
      const { id, via } = queue[i];
      if (!affected.has(id)) affected.set(id, []);
      affected.get(id).push({ trigger, via });
      for (const edge of adjacency.get(id)) if (!seen.has(edge.to)) {
        seen.add(edge.to); queue.push({ id: edge.to, via: [...via, edge] });
      }
    }
  }
  const reviews = workspace.models.filter(m => affected.has(m.id)).map(model => {
    const evidence = model.sourceRefs.map(id => sourceMap.get(id));
    const blockers = [
      ...(!evidence.length ? ['No declared evidence; establish the basis before assessing accuracy.'] : []),
      ...(model.status !== 'available' ? [`Model is ${model.status}; obtain a valid local model before editing.`] : []),
      ...evidence.filter(s => s.status !== 'available').map(s => `Source "${s.id}" is ${s.status}; retrieve or obtain access before assessing it.`),
      ...workspace.relationships.filter(r => (r.child === model.id || r.parent === model.id) && r.status !== 'verified').map(r => `Lineage ${r.child} → ${r.parent} is ${r.status}; validate its target.`),
    ];
    return { ...model, reviewStatus: 'needs-review', reasons: affected.get(model.id), sources: evidence, blockers };
  });
  return {
    ok: workspace.ok, workspace: workspace.workspace, triggers, reviews,
    unaffected: workspace.models.filter(m => !affected.has(m.id)).map(m => m.id),
    unmatchedSources: [...new Set(sources)].filter(id => !workspace.models.some(m => m.sourceRefs.includes(id))),
    diagnostics: workspace.diagnostics, reviewComplete: false,
    semantics: 'Potential review scope, not proven impact or permission to edit. Traverses declared elaboration in both directions, including siblings via a shared parent. Shows one shortest path per trigger/model. Unlisted relationships are unknown; unaffected means not reached. No evidence has been assessed and no files have been changed.',
  };
}
