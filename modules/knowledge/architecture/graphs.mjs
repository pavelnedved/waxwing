import { canonical } from '../shared/model.mjs';

// Graphs select records from one canonical registry. Projection is an internal
// layout input, never a substitute for the complete exported source model.
export function graphsOf(model) {
  return model.graphs ?? [{ id: model.id, title: model.title, scope: model.scope,
    entityRefs: model.entities.map((item) => item.id), contextRefs: [],
    relationshipRefs: model.relationships.map((item) => item.id),
    membershipRefs: model.memberships.map((item) => item.id) }];
}

export const rootGraph = (model) => model.rootGraphRef ?? model.id;
export const graphNodes = (graph) => [...graph.entityRefs, ...graph.contextRefs];

export function projectGraph(model, graphRef) {
  const graph = graphsOf(model).find((item) => item.id === graphRef);
  if (!graph) throw new Error(`Unknown graph "${graphRef}".`);
  const nodes = new Set(graphNodes(graph));
  return { schemaVersion: '0.3-draft', id: graph.id, title: graph.title, scope: graph.scope,
    sources: model.sources, perspectives: model.perspectives,
    entities: model.entities.filter((item) => nodes.has(item.id)), groups: model.groups,
    memberships: model.memberships.filter((item) => graph.membershipRefs.includes(item.id)),
    relationships: model.relationships.filter((item) => graph.relationshipRefs.includes(item.id)),
    notes: [], documents: [] };
}

export function graphDiagnostics(model) {
  if (!model.graphs) return [];
  const diagnostics = [];
  const add = (path, message) => diagnostics.push({ code: 'graph/invalid', path, message });
  const graphs = new Map(model.graphs.map((graph) => [graph.id, graph]));
  const entities = new Set(model.entities.map((item) => item.id));
  const relations = new Map(model.relationships.map((item) => [item.id, item]));
  const memberships = new Map(model.memberships.map((item) => [item.id, item]));
  const groupIds = new Set(model.groups.map((item) => item.id));
  if (!graphs.has(model.rootGraphRef)) add('/rootGraphRef', 'The root must name an included graph.');
  for (const [i, graph] of model.graphs.entries()) {
    const path = `/graphs/${i}`, nodes = new Set(graphNodes(graph));
    for (const ref of nodes) if (!entities.has(ref)) add(path, `Unknown entity "${ref}".`);
    if (graph.contextRefs.some((ref) => graph.entityRefs.includes(ref))) add(path, 'A component cannot be both internal and external context in the same graph.');
    for (const ref of graph.relationshipRefs) {
      const edge = relations.get(ref);
      if (!edge || !nodes.has(edge.from) || !nodes.has(edge.to)) add(path, `Relationship "${ref}" must exist and both endpoints must be visible in this graph.`);
    }
    for (const ref of graph.membershipRefs) {
      const member = memberships.get(ref);
      if (!member || (!nodes.has(member.memberRef) && !groupIds.has(member.memberRef))) add(path, `Membership "${ref}" must exist and describe a visible component or a grouping frame.`);
    }
    const expansion = graph.expands;
    if (graph.id === model.rootGraphRef) {
      if (expansion) add(path, 'The root graph cannot expand another graph.');
      continue;
    }
    if (!expansion) { add(path, 'Every non-root graph must explicitly expand a parent node.'); continue; }
    const parent = graphs.get(expansion.graphRef);
    if (!parent || !parent.entityRefs.includes(expansion.nodeRef)) add(path, 'An expansion must name an internal node in its included parent graph.');
    if (nodes.has(expansion.nodeRef)) add(path, 'The expanded node cannot reappear among its own internals or context.');
    if (!parent) continue;
    const incident = parent.relationshipRefs.filter((ref) => {
      const edge = relations.get(ref); return edge && [edge.from, edge.to].includes(expansion.nodeRef);
    });
    const seen = new Set();
    for (const [j, boundary] of expansion.boundaries.entries()) {
      const location = `${path}/expands/boundaries/${j}`;
      if (seen.has(boundary.relationshipRef) || !incident.includes(boundary.relationshipRef)) add(location, 'Each mapping must name a distinct parent edge touching the expanded node.');
      seen.add(boundary.relationshipRef);
      const parentEdge = relations.get(boundary.relationshipRef);
      if (!parentEdge) continue;
      const claims = boundary.detail.status === 'unknown' ? [] : boundary.detail.status === 'disputed' ? boundary.detail.alternatives : [boundary.detail];
      const alternatives = new Set();
      for (const claim of claims) {
        const key = [...claim.value].sort().join(',');
        if (alternatives.has(key)) add(location, 'Disputed alternatives must name different sets of detailed edges.');
        alternatives.add(key);
        for (const ref of claim.value) {
          const edge = relations.get(ref);
          if (!edge || !graph.relationshipRefs.includes(ref)) { add(location, `Detailed edge "${ref}" must be shown in the child graph.`); continue; }
          if (edge.kind !== parentEdge.kind) add(location, 'A boundary mapping must preserve the operation kind.');
          for (const end of ['from', 'to']) {
            if (parentEdge[end] === expansion.nodeRef) {
              if (!graph.entityRefs.includes(edge[end])) add(location, 'The expanded endpoint must map to an internal child component.');
            } else if (edge[end] !== parentEdge[end] || !graph.contextRefs.includes(edge[end])) add(location, 'The other endpoint must retain its identity and be declared as external context; direction cannot change.');
          }
          // Conditions are prose: this draft cannot prove implication between
          // differently worded conditions, so it requires exact preservation.
          if (canonical(parentEdge.condition ?? null) !== canonical(edge.condition ?? null)) add(location, 'Mapped edges must preserve the parent condition, including its qualification.');
        }
      }
    }
    for (const ref of incident) if (!seen.has(ref)) add(path, `Missing boundary mapping for "${ref}". Record unknown when the correspondence is not known.`);
  }
  for (const graph of model.graphs) {
    const seen = new Set(); let current = graph;
    while (current?.expands) {
      if (seen.has(current.id)) { add('/graphs', 'Expansion relationships must form an acyclic hierarchy. Runtime edge cycles are allowed.'); break; }
      seen.add(current.id); current = graphs.get(current.expands.graphRef);
    }
  }
  return diagnostics;
}
