// Entry is an authored claim about the declared scope. Order is used to check
// consistency, never to synthesize an entry or its upstream trigger.
export const assertedEntry = (model) => ['established', 'reported', 'inferred'].includes(model.entry?.point.status) ? model.entry.point : undefined;
export const entryStatus = (model) => model.entry?.point.status ?? 'not declared';
export const entryCue = (model, itemRef) => assertedEntry(model)?.value.itemRef === itemRef ? [`Workflow entry [${model.entry.point.status}]`] : [];
export const placementCaption = (model) => assertedEntry(model)
  ? `Entry: ${entryStatus(model)} · Entry participant at left; other columns do not imply flow`
  : `Entry: ${entryStatus(model)} · Columns do not identify a start or imply flow`;

export function entryDiagnostics(model, candidates) {
  if (!model.entry) return [];
  const diagnostics = [], add = (message) => diagnostics.push({ code: 'sequence/entry', path: '/entry/point', message });
  const orderings = candidates(model.order);
  for (const candidate of candidates(model.entry.point)) {
    const { participantRef, itemRef } = candidate.value;
    const participant = model.participants.find((p) => p.id === participantRef);
    const step = model.steps.find((s) => s.id === itemRef);
    const item = step ?? model.blocks?.find((b) => b.id === itemRef);
    if (!participant || !item) { add('Entry must reference an existing participant and step or block.'); continue; }
    if (step && step.from !== participantRef) add('For a step entry, the participant must be its sender or local actor (from).');
    // The loop/conditional's executing participant is new qualified source
    // meaning supplied by the entry claim; it cannot be inferred from geometry.
    const assertion = item.assertion ?? item.occurrence;
    if (candidates(assertion).length && candidates(assertion).every((c) => c.value === false)) add('Entry cannot name an explicitly absent step or block.');
    const first = orderings.map((o) => o.value[0]);
    if (first.length && (assertedEntry(model) ? first.some((id) => id !== itemRef) : !first.includes(itemRef))) add('Entry must agree with the first root item in its compatible order claims; nested or later items are not a scoped workflow entry.');
    if ((model.blocks ?? []).some((b) => ['body', 'then', 'else'].some((key) => b[key] && candidates(b[key]).some((o) => o.value.includes(itemRef))))) add('A workflow entry must be at the root, not inside a repeated or conditional body.');
  }
  return diagnostics;
}
