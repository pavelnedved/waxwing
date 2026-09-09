import fs from 'node:fs';
import { schemaDiagnostics, referenceDiagnostic } from '../shared/diagnostics.mjs';
import Ajv2020 from 'ajv/dist/2020.js';
import { documentDiagnostics } from '../documents/markdown.mjs';
import { canonical } from '../shared/model.mjs';
import { isBehavior, ordersOf, structureDiagnostics } from './structure.mjs';
import { entryDiagnostics } from './entry.mjs';

const schema = (name) => JSON.parse(fs.readFileSync(new URL(`../../schemas/${name}`, import.meta.url), 'utf8'));
const ajv = new Ajv2020({ strict: true, allErrors: true, verbose: true, allowUnionTypes: true });
ajv.addSchema(schema('system-model.schema.json'), 'system-model.schema.json');
ajv.addSchema(schema('sequence-entry.schema.json'), 'sequence-entry.schema.json');
const shape = ajv.compile(schema('sequence-model.schema.json'));
const behaviorShape = ajv.compile(schema('sequence-behavior.schema.json'));
export const candidates = (claim) => claim.status === 'unknown' ? [] : claim.status === 'disputed' ? claim.alternatives : [claim];

// Reuse the document identity vocabulary only: node = participant, edge = step.
// This is not an architecture export and is never substituted for source JSON 1.
export function documentModel(model) {
  return { ...model, entities: model.participants, relationships: model.steps, memberships: [] };
}

export function validateSequenceModel(model) {
  const validate = isBehavior(model ?? {}) ? behaviorShape : shape;
  if (!validate(model)) return { ok: false, diagnostics: schemaDiagnostics(validate.errors, model, 'sequence/schema', {root:validate.schema, ajv}) };
  const diagnostics = [], unresolved = [], qualifications = [];
  const add = (path, message) => diagnostics.push({ code: 'sequence/invalid', path, message });
  const entries = new Map([[model.id, { collection: 'diagram', record: model }]]);
  for (const collection of ['participants', 'steps', 'notes', 'sources', 'documents', 'blocks']) for (const [i, record] of (model[collection] ?? []).entries()) {
    if (entries.has(record.id)) add(`/${collection}/${i}/id`, `Duplicate ID "${record.id}".`);
    entries.set(record.id, { collection, record });
  }
  function reference(ref, collection, path) {
    if (!collection.includes(entries.get(ref)?.collection)) diagnostics.push(referenceDiagnostic(model, ref, collection, path, entries, 'sequence/invalid'));
  }
  function walk(value, path) {
    if (!value || typeof value !== 'object') return;
    for (const [i, ref] of (value.sourceRefs ?? []).entries()) reference(ref, ['sources'], `${path}/sourceRefs/${i}`);
    if (['unknown', 'disputed'].includes(value.status)) unresolved.push({ path, status: value.status, reason: value.reason });
    if (['reported', 'inferred'].includes(value.status)) qualifications.push({ path, status: value.status });
    if (value.status === 'disputed' && new Set(value.alternatives.map((item) => canonical(item.value))).size !== value.alternatives.length) add(path, 'Disputed alternatives must have distinct values.');
    for (const [key, child] of Object.entries(value)) walk(child, `${path}/${key}`);
  }
  walk(model, '');
  for (const [i, step] of model.steps.entries()) {
    const path = `/steps/${i}`;
    reference(step.from, ['participants'], `${path}/from`); reference(step.to, ['participants'], `${path}/to`);
    if (step.kind === 'event' && step.from !== step.to) add(path, 'A local event must use the same participant for from and to.');
    if (step.kind === 'reply') {
      const request = entries.get(step.replyTo);
      if (request?.collection !== 'steps' || request.record.kind !== 'message' || request.record.from !== step.to || request.record.to !== step.from) add(path, 'A reply must name a message with reversed participants.');
    } else if (step.replyTo !== undefined) add(path, 'Only a reply can specify replyTo.');
  }
  if (!isBehavior(model)) for (const order of candidates(model.order)) {
    if (order.value.length !== model.steps.length || new Set(order.value).size !== model.steps.length || order.value.some((id) => entries.get(id)?.collection !== 'steps')) add('/order', 'Each asserted order must list every step exactly once. Array storage order is not execution order.');
    for (const step of model.steps) if (step.kind === 'reply' && order.value.indexOf(step.replyTo) >= order.value.indexOf(step.id)) add('/order', `Reply "${step.id}" must follow its message in every candidate order.`);
  }
  if (isBehavior(model)) diagnostics.push(...structureDiagnostics(model, candidates));
  diagnostics.push(...entryDiagnostics(model, candidates));
  for (const [i, note] of model.notes.entries()) for (const ref of note.subjectRefs) reference(ref, isBehavior(model) ? ['participants', 'steps', 'blocks'] : ['participants', 'steps'], `/notes/${i}/subjectRefs`);
  diagnostics.push(...documentDiagnostics(documentModel(model)));
  return { ok: !diagnostics.length, diagnostics, summary: { participants: model.participants.length, steps: model.steps.length, documents: model.documents.length, ...(isBehavior(model) ? { blocks: model.blocks.length } : {}),
    unknown: unresolved.filter((item) => item.status === 'unknown').length, disputed: unresolved.filter((item) => item.status === 'disputed').length }, unresolved, qualifications,
    limits: isBehavior(model)
      ? 'Checks partial current behavior, references, containment, and asserted body orders. Unknown body orders defer global reachability and path-sensitive reply checks. Does not verify evidence, evaluate predicates, or establish timing or completeness.'
      : 'Checks a partial current scenario, references, and asserted order. Does not verify evidence or establish timing, concurrency, or completeness.' };
}

export function drawableDiagnostics(model) {
  const diagnostics = [];
  if (isBehavior(model)) {
    for (const { path, order } of ordersOf(model)) if (['unknown', 'disputed'].includes(order.status)) diagnostics.push({ code: 'sequence/unresolved-order', path, message: 'Each body needs one asserted order. A runtime branch is not a disputed order; no knowledge dispute is selected for drawing.' });
    for (const collection of ['steps', 'blocks']) model[collection].forEach((record, i) => {
      if (['unknown', 'disputed'].includes(record.assertion.status) || !record.assertion.value) diagnostics.push({ code: 'sequence/unresolved-behavior', path: `/${collection}/${i}/assertion`, message: 'This renderer needs an asserted definition within its enclosing body; it cannot invent missing or disputed behavior.' });
    });
    model.blocks.forEach((block, i) => {
      if (block.kind === 'loop' && (['unknown', 'disputed'].includes(block.execution.status) || block.execution.value !== 'sequential')) diagnostics.push({ code: 'sequence/unsupported-iteration', path: `/blocks/${i}/execution`, message: 'Only asserted sequential iteration is drawable. Concurrent or unresolved execution must not be relabeled sequential.' });
    });
    return diagnostics;
  }
  if (['unknown', 'disputed'].includes(model.order.status)) diagnostics.push({ code: 'sequence/unresolved-order', path: '/order', message: 'A vertical sequence needs one asserted order. Unknown/disputed ordering remains valid JSON 1; this renderer cannot choose it.' });
  model.steps.forEach((step, i) => {
    if (['unknown', 'disputed'].includes(step.occurrence.status) || !step.occurrence.value) diagnostics.push({ code: 'sequence/unresolved-step', path: `/steps/${i}/occurrence`, message: 'This basic renderer needs an asserted occurrence for each ordered step. Preserve absent or unresolved occurrences in JSON 1; do not invent a drawable scenario.' });
  });
  return diagnostics;
}
