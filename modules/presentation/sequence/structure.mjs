import { isBehavior, regionsOf } from '../../knowledge/sequence/structure.mjs';

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
