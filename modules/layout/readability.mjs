// Advisory measurements only. Input is already validated drawing geometry.
// Kept self-contained so the portable viewer can use this same function offline.
export function inspectReadability(drawing, graphRef, viewport = { width: 1200, height: 520 }) {
  if (![viewport.width, viewport.height].every((value) => Number.isFinite(value) && value > 0)) throw new Error('Readability viewport dimensions must be positive.');
  const warnings = [], epsilon = 0.01;
  const add = (code, refs, message, measurement) => warnings.push({ severity: 'warning', code: `readability/${code}`, graphRef, refs, message, measurement });
  const segments = (edge) => edge.points.slice(1).map((b, index) => {
    const a = edge.points[index], horizontal = Math.abs(a.y - b.y) < epsilon;
    return { horizontal, fixed: horizontal ? a.y : a.x,
      lo: Math.min(horizontal ? a.x : a.y, horizontal ? b.x : b.y),
      hi: Math.max(horizontal ? a.x : a.y, horizontal ? b.x : b.y) };
  }).filter((segment) => segment.hi - segment.lo > epsilon);
  const overlap = (a, b) => a.horizontal === b.horizontal && Math.abs(a.fixed - b.fixed) < epsilon ? Math.max(0, Math.min(a.hi, b.hi) - Math.max(a.lo, b.lo)) : 0;
  const routes = drawing.edges.map((edge) => ({ edge, segments: segments(edge) }));
  for (let i = 0; i < routes.length; i++) {
    const a = routes[i];
    for (const b of routes.slice(i + 1)) {
      const related = [a.edge.from, a.edge.to].some((ref) => [b.edge.from, b.edge.to].includes(ref));
      let shared = 0, crossings = 0;
      for (const left of a.segments) for (const right of b.segments) {
        shared = Math.max(shared, overlap(left, right));
        if (left.horizontal === right.horizontal) continue;
        const h = left.horizontal ? left : right, v = left.horizontal ? right : left;
        if (v.fixed > h.lo + epsilon && v.fixed < h.hi - epsilon && h.fixed > v.lo + epsilon && h.fixed < v.hi - epsilon) crossings++;
      }
      if (!related && shared >= 24) add('shared-corridor', [a.edge.ref, b.edge.ref], 'Unrelated edges share a line segment and may appear connected.', { longestSharedSegment: shared, threshold: 24 });
      if (crossings) add('crossing', [a.edge.ref, b.edge.ref], 'Edges cross between their endpoints; the crossing is not a junction.', { crossings });
    }
    for (const group of drawing.groups) {
      const { x, y, width, height } = group.box;
      const border = [{ horizontal: true, fixed: y, lo: x, hi: x + width }, { horizontal: true, fixed: y + height, lo: x, hi: x + width },
        { horizontal: false, fixed: x, lo: y, hi: y + height }, { horizontal: false, fixed: x + width, lo: y, hi: y + height }];
      let longest = 0;
      for (const segment of a.segments) for (const side of border) longest = Math.max(longest, overlap(segment, side));
      if (longest >= 24) add('border-run', [a.edge.ref, group.ref], 'An edge follows a grouping frame border and may be confused with the boundary.', { longestSharedSegment: longest, threshold: 24 });
    }
    for (const other of drawing.edges) {
      if (other.ref === a.edge.ref) continue;
      const box = other.label;
      let clearance = Infinity;
      for (const segment of a.segments) {
        const lo = segment.horizontal ? box.x : box.y, hi = lo + (segment.horizontal ? box.width : box.height);
        const fixedLo = segment.horizontal ? box.y : box.x, fixedHi = fixedLo + (segment.horizontal ? box.height : box.width);
        const along = Math.max(0, lo - segment.hi, segment.lo - hi);
        const across = Math.max(0, fixedLo - segment.fixed, segment.fixed - fixedHi);
        clearance = Math.min(clearance, Math.hypot(along, across));
      }
      if (clearance < 4) add('label-clearance', [a.edge.ref, other.ref], 'A route is very close to another edge’s label.', { clearance, threshold: 4 });
    }
  }
  const scale = Math.min(1.3, viewport.width / drawing.canvas.width, viewport.height / drawing.canvas.height);
  const projectedTextPx = 10 * scale; // Smallest current node status text; all skins retain these metrics.
  if (projectedTextPx < 8) add('small-text', [], 'Small node text may be difficult to read at Fit. Use 100% or zoom in.', { viewport, scale, sourceTextPx: 10, projectedTextPx, threshold: 8 });
  return warnings;
}
