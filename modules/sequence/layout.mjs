import fs from 'node:fs';
import { schemaDiagnostics, prefixDiagnostics } from '../shared/diagnostics.mjs';
import Ajv2020 from 'ajv/dist/2020.js';
import { validateSequenceModel, drawableDiagnostics } from './model.mjs';
import { canonical, digest, fail, wrap, units } from '../shared/model.mjs';
import { isBehavior, assertionOf, drawingOrder, nestingDepth, regionsOf } from './structure.mjs';
import { blockLines, regionLines, bandHeight, frameDiagnostics } from './frames.mjs';
import { assertedEntry, entryCue } from './entry.mjs';

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../../schemas/${name}`, import.meta.url), 'utf8'));
const ajv = new Ajv2020({ strict: true, allErrors: true, verbose: true, allowUnionTypes: true });
for (const name of ['system-model.schema.json', 'sequence-entry.schema.json', 'sequence-model.schema.json', 'sequence-behavior.schema.json']) ajv.addSchema(read(name), name);
const shape = ajv.compile(read('sequence-layout.schema.json'));
const behaviorShape = ajv.compile(read('sequence-behavior-layout.schema.json'));
export const participantLines = (participant) => wrap(participant.label, 20);
export function stepLines(model, step) {
  const claim = assertionOf(model, step), behavior = isBehavior(model);
  return [...entryCue(model, step.id), ...wrap(`${behavior ? '' : `${model.order.value.indexOf(step.id) + 1}. `}${step.kind} · ${step.label}`, 40),
    ...(claim.status === 'established' ? [] : [`${claim.status} ${behavior ? 'behavior' : 'occurrence'}`])];
}
const labelSize = (lines) => ({ width: Math.max(...lines.map(units)) * 7.2 + 20, height: lines.length * 18 + 12 });

export function layoutSequence(model, options = {}) {
  const result = validateSequenceModel(model);
  if (!result.ok) fail('Sequence JSON 1 is invalid.', result.diagnostics);
  if (Object.keys(options).length) fail('Sequence layout takes no options yet; architecture grouping/direction options do not apply.');
  const unresolved = drawableDiagnostics(model);
  if (unresolved.length) fail('Sequence layout is blocked by unresolved or unsupported source claims.', unresolved);
  const ordered = drawingOrder(model).map((id) => model.steps.find((step) => step.id === id));
  const depth = nestingDepth(model);
  const gap = Math.max(340, ...ordered.map((step) => labelSize(stepLines(model, step)).width + 60));
  const headerHeight = Math.max(...model.participants.map((p) => participantLines(p).length * 20 + 64));
  const entry = assertedEntry(model), entryRef = entry?.value.participantRef;
  const headerY = model.entry ? 96 : 72;
  const participants = [...model.participants].sort((a, b) => (a.id !== entryRef) - (b.id !== entryRef) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((p, i) => ({ ref: p.id,
    box: { x: 60 + depth * 20 + i * gap, y: headerY, width: 232, height: headerHeight },
    lifeline: { x: 176 + depth * 20 + i * gap, startY: headerY + headerHeight, endY: 0 } }));
  const x = (ref) => participants.find((p) => p.ref === ref).lifeline.x;
  let row = headerY + headerHeight + 40;
  const steps = [], blocks = [];
  function placeStep(step) {
    const size = labelSize(stepLines(model, step)), start = x(step.from), end = x(step.to);
    const self = start === end;
    const label = { x: self ? start + 18 : (start + end - size.width) / 2, y: row, ...size };
    const y = row + size.height + 8;
    const points = self ? [{ x: start, y }, { x: start + size.width + 36, y }, { x: start + size.width + 36, y: y + 24 }, { x: end, y: y + 24 }] : [{ x: start, y }, { x: end, y }];
    row = points.at(-1).y + 36;
    steps.push({ ref: step.id, from: step.from, to: step.to, points, label });
  }
  // Reserve enough width for every self interaction before measuring frame text.
  const width = Math.max(700, ...participants.map((p) => p.box.x + p.box.width + 60 + depth * 20), ...ordered.map((s) => x(s.from) + (s.from === s.to ? labelSize(stepLines(model, s)).width + 36 : 0) + 60 + depth * 20));
  function placeBody(order, level) {
    for (const id of order.value) {
      const block = model.blocks.find((b) => b.id === id);
      if (!block) { placeStep(model.steps.find((s) => s.id === id)); continue; }
      const box = { x: 20 + level * 18, y: row, width: width - 40 - level * 36, height: 0 };
      const header = { x: box.x + 8, y: row + 8, width: box.width - 16, height: 0 };
      header.height = bandHeight(blockLines(block, header.width, model)); row = header.y + header.height + 8;
      const regions = [];
      for (const branch of regionsOf(block)) {
        const area = { x: box.x + 12, y: row, width: box.width - 24, height: 0 };
        const label = { x: area.x, y: row, width: area.width, height: bandHeight(regionLines(block, branch)) };
        row += label.height + 16; placeBody(block[branch], level + 1);
        area.height = row - area.y; regions.push({ branch, box: area, label }); row += 10;
      }
      box.height = row - box.y + 4; blocks.push({ ref: id, box, header, regions }); row += 28;
    }
  }
  if (isBehavior(model)) placeBody(model.order, 0); else ordered.forEach(placeStep);
  participants.forEach((p) => { p.lifeline.endY = row; });
  const canvas = { width: isBehavior(model) ? width : Math.max(700, ...participants.map((p) => p.box.x + p.box.width + 60), ...steps.flatMap((s) => [s.label.x + s.label.width + 60, ...s.points.map((p) => p.x + 60)])), height: row + 40 };
  const output = { schemaVersion: isBehavior(model) ? '0.2-sequence-layout-draft' : '0.1-sequence-layout-draft', diagramType: 'sequence', model: structuredClone(model), modelDigest: digest(model),
    layout: { engine: 'waxwing-sequence', version: isBehavior(model) ? '2' : '1' }, canvas, participants, steps, ...(isBehavior(model) ? { blocks } : {}) };
  const verified = validateSequenceLayout(output, { expectedModel: model });
  if (!verified.ok) fail('Generated sequence geometry failed validation.', verified.diagnostics);
  return output;
}

export function validateSequenceLayout(drawing, { expectedModel } = {}) {
  const validate = drawing?.schemaVersion === '0.2-sequence-layout-draft' ? behaviorShape : shape;
  if (!validate(drawing)) return { ok: false, diagnostics: schemaDiagnostics(validate.errors, drawing, 'sequence/layout-schema', {root:validate.schema, ajv}) };
  const model = drawing.model, result = validateSequenceModel(model);
  if (!result.ok) return {...result, diagnostics:prefixDiagnostics(result.diagnostics, '/model')};
  const diagnostics = [...drawableDiagnostics(model)];
  const add = (path, message) => diagnostics.push({ code: 'sequence/layout-invalid', path, message });
  if (digest(model) !== drawing.modelDigest) add('/modelDigest', 'Embedded source does not match its digest.');
  if (expectedModel !== undefined && canonical(model) !== canonical(expectedModel)) add('/model', 'Embedded source differs from the expected complete JSON 1.');
  for (const collection of ['participants', 'steps', ...(isBehavior(model) ? ['blocks'] : [])]) {
    const refs = drawing[collection].map((item) => item.ref);
    if (refs.length !== model[collection].length || new Set(refs).size !== refs.length || refs.some((ref) => !model[collection].some((item) => item.id === ref))) add(`/${collection}`, 'Geometry must represent each source record exactly once.');
  }
  if (diagnostics.length) return { ok: false, diagnostics };
  const epsilon = 0.01;
  const near = (a, b) => Math.abs(a - b) < epsilon;
  const inside = (b) => b.x >= 0 && b.y >= 0 && b.x + b.width <= drawing.canvas.width + epsilon && b.y + b.height <= drawing.canvas.height + epsilon;
  const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  const participant = new Map(drawing.participants.map((p) => [p.ref, p]));
  const entry = assertedEntry(model);
  if (entry && drawing.participants.some((p) => p.lifeline.x < participant.get(entry.value.participantRef).lifeline.x)) add('/participants', 'The declared entry participant must be leftmost under this presentation contract.');
  for (const [i, p] of drawing.participants.entries()) {
    const path = `/participants/${i}`, source = model.participants.find((s) => s.id === p.ref), line = p.lifeline;
    if (!inside(p.box) || p.box.y < (model.entry ? 84 : 60) || p.box.width < 232 || p.box.height < participantLines(source).length * 20 + 64) add(path, 'Participant must fit its label below the sequence caption, inside the canvas.');
    if (!near(line.x, p.box.x + p.box.width / 2) || !near(line.startY, p.box.y + p.box.height) || line.endY <= line.startY || !inside({ x: line.x, y: line.endY, width: 0, height: 0 })) add(path, 'Lifeline must start at the participant header and end inside the canvas.');
    for (const other of drawing.participants.slice(i + 1)) if (overlap(p.box, other.box) || near(line.x, other.lifeline.x)) add(path, 'Participant headers or lifelines collide.');
  }
  let previousEnd = Math.max(...drawing.participants.map((p) => p.box.y + p.box.height));
  for (const id of drawingOrder(model)) {
    const index = drawing.steps.findIndex((s) => s.ref === id), s = drawing.steps[index], source = model.steps.find((s) => s.id === id), path = `/steps/${index}`;
    const first = s.points[0], last = s.points.at(-1), size = labelSize(stepLines(model, source));
    if (s.from !== source.from || s.to !== source.to) add(path, 'Step endpoints and direction must match source.');
    const start = participant.get(source.from).lifeline, end = participant.get(source.to).lifeline;
    if (!near(first.x, start.x) || !near(last.x, end.x) || first.y < start.startY || last.y > end.endY || last.y < first.y) add(path, 'Step must connect the correct lifelines in the recorded direction.');
    if (source.from === source.to) {
      if (s.points.length !== 4 || !near(first.y, s.points[1].y) || !near(s.points[1].x, s.points[2].x) || !near(s.points[2].y, last.y) || near(first.x, s.points[1].x) || last.y - first.y < 16) add(path, 'A self interaction needs a visible orthogonal loop.');
    } else if (s.points.length !== 2 || !near(first.y, last.y)) add(path, 'A message between participants must be a horizontal directed line.');
    if (!inside(s.label) || s.label.width + epsilon < size.width || s.label.height + epsilon < size.height) add(path, 'The label must fit every line and qualification inside the canvas.');
    const routeMin = Math.min(...s.points.map((p) => p.x)), routeMax = Math.max(...s.points.map((p) => p.x));
    if (s.label.x + s.label.width / 2 < routeMin || s.label.x + s.label.width / 2 > routeMax) add(path, 'The label must sit above its own route.');
    if (s.label.y <= previousEnd || s.label.y + s.label.height >= first.y) add(path, 'Each label and step must follow the previous step in the explicit source order.');
    for (const point of s.points) if (!inside({ ...point, width: 0, height: 0 })) add(path, 'Step exceeds the canvas.');
    previousEnd = last.y;
  }
  if (drawing.participants.some((p) => p.lifeline.endY < previousEnd)) add('/participants', 'Every lifeline must span the scenario.');
  if (isBehavior(model)) {
    diagnostics.push(...frameDiagnostics(drawing));
    if (drawing.participants.some((p) => drawing.blocks.some((b) => b.box.y + b.box.height > p.lifeline.endY))) add('/participants', 'Lifelines must span the complete control structure.');
  }
  return { ok: !diagnostics.length, diagnostics, warnings: [], summary: result.summary };
}
