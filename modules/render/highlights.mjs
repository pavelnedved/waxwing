// Pure selection over canonical facts. No traversal of geometry or inference of
// execution order, impact, or an unknown correspondence. Shared with the viewer.
export function selectHighlights(model, graph, { mode = 'selection', ref, boundaryRef } = {}) {
  const visible = new Set([...graph.entityRefs, ...graph.contextRefs]);
  const edges = model.relationships.filter((edge) => graph.relationshipRefs.includes(edge.id));
  const refs = new Set(), findings = [];
  const add = (id) => { if (visible.has(id) || graph.relationshipRefs.includes(id) || model.groups.some((group) => group.id === id)) refs.add(id); };
  const addEdge = (edge) => { if (edge) { add(edge.id); add(edge.from); add(edge.to); } };
  const hasStatus = (value) => {
    if (!value || typeof value !== 'object') return false;
    if ((mode === 'qualified' ? ['unknown', 'disputed', 'reported', 'inferred'] : [mode]).includes(value.status)) return true;
    return Object.values(value).some(hasStatus);
  };
  const mappingRefs = (boundary) => {
    const detail = boundary.detail;
    const candidates = detail.status === 'unknown' ? [] : detail.status === 'disputed' ? detail.alternatives : [detail];
    for (const candidate of candidates) for (const id of candidate.value) addEdge(edges.find((edge) => edge.id === id));
    const parent = model.relationships.find((edge) => edge.id === boundary.relationshipRef);
    // An unresolved caller is not replaced with an invented internal endpoint.
    for (const id of parent ? [parent.from, parent.to] : []) if (graph.contextRefs.includes(id)) add(id);
  };
  if (boundaryRef) {
    const boundary = graph.expands?.boundaries.find((item) => item.relationshipRef === boundaryRef);
    if (!boundary) throw new Error('The requested correspondence does not belong to this graph.');
    mappingRefs(boundary);
    return { refs: [...refs], findings: [], boundary };
  }
  if (mode === 'selection' && ref) {
    if (model.groups.some((group) => group.id === ref)) add(ref);
    if (visible.has(ref)) { add(ref); edges.filter((edge) => [edge.from, edge.to].includes(ref)).forEach(addEdge); }
    else addEdge(edges.find((edge) => edge.id === ref));
    const note = model.notes.find((item) => item.id === ref);
    for (const id of note?.subjectRefs ?? []) { add(id); addEdge(edges.find((edge) => edge.id === id)); }
  } else if (mode === 'context') {
    graph.contextRefs.forEach(add);
  } else if (['calls', 'reads', 'writes', 'publishes', 'consumes'].includes(mode)) {
    edges.filter((edge) => edge.kind === mode).forEach(addEdge);
  } else if (['unknown', 'disputed', 'qualified'].includes(mode)) {
    for (const entity of model.entities.filter((item) => visible.has(item.id))) if (hasStatus(entity)) {
      add(entity.id); findings.push({ ref: entity.id, kind: 'node', reason: 'Component claims' });
    }
    for (const edge of edges) if (hasStatus(edge)) {
      addEdge(edge); findings.push({ ref: edge.id, kind: 'edge', reason: 'Relationship claims' });
    }
    for (const membership of model.memberships.filter((item) => graph.membershipRefs.includes(item.id))) if (hasStatus(membership)) {
      add(membership.memberRef); findings.push({ ref: membership.id, kind: 'record', reason: 'Grouping claim; no inferred containment' });
    }
    for (const group of model.groups) if (hasStatus(group) && model.memberships.some((member) => graph.membershipRefs.includes(member.id) &&
      (member.group.value === group.id || member.group.alternatives?.some((alternative) => alternative.value === group.id)))) {
      add(group.id); findings.push({ ref: group.id, kind: 'record', reason: 'Grouping meaning' });
    }
    for (const note of model.notes) if (note.subjectRefs.some((id) => visible.has(id) || graph.relationshipRefs.includes(id) || graph.membershipRefs.includes(id) || refs.has(id)) && hasStatus(note)) {
      for (const id of note.subjectRefs) { add(id); addEdge(edges.find((edge) => edge.id === id)); }
      findings.push({ ref: note.id, kind: 'record', reason: note.statement });
    }
    if (graph.expands && hasStatus(graph.expands.meaning)) findings.push({ ref: graph.id, kind: 'record', reason: 'Meaning of the expansion' });
    for (const boundary of graph.expands?.boundaries ?? []) if (hasStatus(boundary.detail)) {
      mappingRefs(boundary); findings.push({ ref: boundary.relationshipRef, kind: 'boundary', reason: `${boundary.detail.status} correspondence between levels` });
    }
    // On the parent view, mark edges with unresolved child correspondences too.
    for (const child of model.graphs ?? []) if (child.expands?.graphRef === graph.id) {
      for (const boundary of child.expands.boundaries) if (hasStatus(boundary.detail)) {
        addEdge(edges.find((edge) => edge.id === boundary.relationshipRef));
        findings.push({ ref: boundary.relationshipRef, kind: 'boundary', graphRef: child.id, reason: `${boundary.detail.status} correspondence in ${child.title}` });
      }
    }
  }
  return { refs: [...refs], findings };
}

// Keep transient selection out of downloaded SVGs. Skin/theme are presentation
// choices and remain, while all source metadata and qualification styles stay.
export function cleanViewerSVG(svg) {
  const clean = svg.cloneNode(true);
  clean.removeAttribute('style');
  clean.querySelectorAll('.selected, .highlight-match').forEach((item) => {
    item.classList.remove('selected', 'highlight-match');
  });
  return clean;
}
