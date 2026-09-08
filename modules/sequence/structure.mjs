// These helpers describe source structure. Flattening here is only a drawing
// traversal: the two arms of an if are never a single execution path.
export const isBehavior = (model) => model.schemaVersion === '0.2-sequence-draft';
export const assertionOf = (model, step) => isBehavior(model) ? step.assertion : step.occurrence;
export const regionsOf = (block) => block.kind === 'loop' ? ['body'] : ['then', 'else'];
export function ordersOf(model) {
  return [{ path: '/order', order: model.order }, ...(model.blocks ?? []).flatMap((b, i) => regionsOf(b).map((key) => ({ path: `/blocks/${i}/${key}`, order: b[key] })))];
}
export function drawingOrder(model) {
  if (!isBehavior(model)) return model.order.value;
  const blocks = new Map(model.blocks.map((b) => [b.id, b])), ids = [];
  function visit(order) { for (const id of order.value) { const block = blocks.get(id); if (block) regionsOf(block).forEach((key) => visit(block[key])); else ids.push(id); } }
  visit(model.order); return ids;
}
export function nestingDepth(model) {
  const blocks = new Map((model.blocks ?? []).map((b) => [b.id, b]));
  function depth(order) { return Math.max(0, ...order.value.map((id) => blocks.has(id) ? 1 + Math.max(...regionsOf(blocks.get(id)).map((key) => depth(blocks.get(id)[key]))) : 0)); }
  return isBehavior(model) ? depth(model.order) : 0;
}

export function structureDiagnostics(model, candidates) {
  if (!isBehavior(model)) return [];
  const diagnostics = [], add = (path, message) => diagnostics.push({ code: 'sequence/structure', path, message });
  const blocks = new Map(model.blocks.map((b) => [b.id, b]));
  const steps = new Map(model.steps.map((s) => [s.id, s]));
  const parent = new Map();
  let unresolved = false;
  for (const { path, order } of ordersOf(model)) {
    const values = candidates(order).map((c) => c.value);
    if (!values.length) unresolved = true;
    // A disputed order can permute a known body, not move work between arms.
    const signature = (refs) => JSON.stringify([...refs].sort());
    if (values.some((value) => signature(value) !== signature(values[0]))) add(path, 'Order alternatives must contain the same direct children. Membership disputes need separate explicit modeling.');
    for (const id of new Set(values.flat())) {
      if (!blocks.has(id) && !steps.has(id)) add(path, `Unknown step or block "${id}".`);
      if (parent.has(id) && parent.get(id) !== path) add(path, `"${id}" belongs to more than one body. Distinct interactions need distinct IDs.`);
      parent.set(id, path);
    }
  }
  const visited = new Set(), visiting = new Set();
  function visit(id) {
    if (visiting.has(id)) { add('/blocks', 'Block containment must be acyclic. Repetition uses a loop body, not a reference cycle.'); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    const b = blocks.get(id);
    if (b) for (const key of regionsOf(b)) for (const child of candidates(b[key]).flatMap((c) => c.value)) visit(child);
    visiting.delete(id); visited.add(id);
  }
  for (const id of blocks.keys()) visit(id);
  if (!unresolved) {
    const reachable = new Set();
    function reach(id) { if (reachable.has(id)) return; reachable.add(id); const b = blocks.get(id); if (b) for (const key of regionsOf(b)) for (const child of candidates(b[key])[0]?.value ?? []) reach(child); }
    for (const id of candidates(model.order)[0]?.value ?? []) reach(id);
    for (const id of [...blocks.keys(), ...steps.keys()]) if (!reachable.has(id)) add('/order', `"${id}" is not reachable from the root body.`);
  }
  if (diagnostics.length) return diagnostics;

  // Definite preceding messages flow through sequential bodies. At an if, only
  // messages available in BOTH arms survive. A collection can be empty, so a
  // message inside its loop never becomes guaranteed outside that loop.
  function check(order, incoming, loops) {
    const alternatives = candidates(order);
    if (!alternatives.length) return incoming; // Unknown order remains undrawable.
    const endings = [];
    for (const alternative of alternatives) {
      let available = new Map(incoming);
      for (const id of alternative.value) {
        const block = blocks.get(id);
        if (block?.kind === 'loop') { check(block.body, available, [...loops, id]); }
        else if (block) {
          const a = check(block.then, available, loops), b = check(block.else, available, loops);
          available = new Map([...a].filter(([key]) => b.has(key)));
        } else {
          const step = steps.get(id);
          if (step?.kind === 'reply') {
            const context = available.get(step.replyTo);
            if (context === undefined || context !== JSON.stringify(loops)) add(`/steps/${model.steps.indexOf(step)}/replyTo`, 'A reply needs a preceding message on every path reaching it, in the same enclosing loop iteration. Cross-branch or cross-iteration replies are not supported.');
          }
          if (step?.kind === 'message') available.set(id, JSON.stringify(loops));
        }
      }
      endings.push(available);
    }
    return new Map([...endings[0]].filter(([id]) => endings.every((ending) => ending.has(id))));
  }
  // Ordering uncertainty is valid source. Until all bodies have known members,
  // path-sensitive reply checks cannot claim a complete answer.
  if (!unresolved) check(model.order, new Map(), []);
  return diagnostics;
}
