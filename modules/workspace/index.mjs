import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { loadModel } from '../documents/index.mjs';
import { digest, fail } from '../shared/model.mjs';

export const WORKSPACE_VERSION = '0.1-workspace-draft';
const schema = JSON.parse(fs.readFileSync(new URL('../../schemas/workspace.schema.json', import.meta.url), 'utf8'));
const validateShape = new Ajv2020({ strict: true, allErrors: true }).compile(schema);

// Locators are declarations, never instructions to fetch, clone, or scan.
function locate(location, directory) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(location) && !path.isAbsolute(location)) {
    const url = new URL(location);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
      throw new Error('Use a local path or an HTTP(S) locator without embedded credentials.');
    }
    return { kind: 'remote', location };
  }
  return { kind: 'local', location, resolvedPath: path.resolve(directory, location) };
}

export function loadWorkspace(input) {
  const filename = fs.realpathSync(input);
  const config = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (!validateShape(config)) fail('Invalid workspace manifest.', validateShape.errors.map(e => ({
    code: 'workspace/schema', path: e.instancePath, message: e.message,
  })));
  const diagnostics = [];
  const add = (severity, code, pointer, message) => diagnostics.push({ severity, code, path: pointer, message });
  const sources = new Map(), models = new Map();
  for (const [name, entries, map] of [['sources', config.sources, sources], ['models', config.models, models]]) {
    entries.forEach((entry, i) => {
      if (map.has(entry.id)) add('error', 'workspace/duplicate', `/${name}/${i}/id`, `Duplicate ${name} ID "${entry.id}".`);
      map.set(entry.id, entry);
      try { locate(entry.location, path.dirname(filename)); }
      catch (error) { add('error', 'workspace/location', `/${name}/${i}/location`, error.message); }
    });
  }
  config.models.forEach((model, i) => {
    for (const [j, ref] of model.sourceRefs.entries()) if (!sources.has(ref)) {
      add('error', 'workspace/source', `/models/${i}/sourceRefs/${j}`, `Unknown source "${ref}".`);
    }
    for (const [j, parent] of (model.elaborates ?? []).entries()) {
      if (!models.has(parent.model)) add('error', 'workspace/parent', `/models/${i}/elaborates/${j}`, `Unknown model "${parent.model}".`);
    }
  });
  // Elaboration is a DAG, not a forced tree. Multiple parents are allowed.
  const active = new Set(), done = new Set();
  function visit(id) {
    if (active.has(id)) { add('error', 'workspace/cycle', '/models', `Elaboration cycle through "${id}".`); return; }
    if (done.has(id)) return;
    active.add(id);
    for (const parent of models.get(id)?.elaborates ?? []) if (models.has(parent.model)) visit(parent.model);
    active.delete(id); done.add(id);
  }
  for (const id of models.keys()) visit(id);
  if (diagnostics.length) fail('Invalid workspace lineage.', diagnostics);

  const loaded = new Map();
  const inspect = (entry, isModel, index) => {
    const locator = locate(entry.location, path.dirname(filename));
    const result = { ...entry, ...locator, status: 'external' };
    const pointer = `/${isModel ? 'models' : 'sources'}/${index}`;
    if (locator.kind === 'remote') return result;
    try {
      fs.accessSync(locator.resolvedPath, fs.constants.R_OK);
      const stat = fs.statSync(locator.resolvedPath);
      if (isModel && !stat.isFile()) throw new Error('Model location must be a JSON 1 file.');
      if (!isModel) {
        if (!stat.isFile() && !stat.isDirectory()) throw new Error('Source location must be a file or directory.');
        return { ...result, status: 'available' };
      }
      const { model } = loadModel(locator.resolvedPath);
      if (model.id !== entry.modelId) throw new Error(`Expected model ID "${entry.modelId}", found "${model.id}".`);
      loaded.set(entry.id, model);
      return { ...result, status: 'available', revision: digest(model), title: entry.title ?? model.title };
    } catch (error) {
      const unavailable = ['ENOENT', 'EACCES', 'EPERM'].includes(error.code);
      const status = unavailable ? 'unavailable' : 'invalid';
      add(unavailable ? 'warning' : 'error', `workspace/${status}`, pointer, `${entry.id}: ${error.message}`);
      return { ...result, status, message: error.message, ...(error.diagnostics?.length ? { diagnostics: error.diagnostics } : {}) };
    }
  };
  const sourceReports = config.sources.map((e, i) => inspect(e, false, i));
  const modelReports = config.models.map((e, i) => inspect(e, true, i));
  const relationships = config.models.flatMap((child, i) => (child.elaborates ?? []).map((parent, j) => {
    const model = loaded.get(parent.model);
    let status = model ? 'verified' : 'unverified';
    if (model && parent.element && ![...(model.entities ?? []), ...(model.groups ?? []), ...(model.participants ?? [])].some(e => e.id === parent.element)) {
      status = 'invalid';
      add('error', 'workspace/element', `/models/${i}/elaborates/${j}/element`, `Unknown component/group "${parent.element}" in model "${parent.model}".`);
    }
    return { child: child.id, parent: parent.model, ...(parent.element ? { element: parent.element } : {}), status };
  }));
  return {
    ok: !diagnostics.some(d => d.severity === 'error'),
    workspace: { id: config.id, title: config.title, input: filename, revision: digest(config) },
    sources: sourceReports, models: modelReports, relationships, diagnostics,
    referencesComplete: modelReports.every(m => m.status === 'available') && relationships.every(r => r.status === 'verified'),
    semantics: 'Only this manifest is indexed. Local models and their registered documents are validated; evidence is not assessed. Remote locators are not fetched. Verified relationships mean valid references, not proven architectural claims.',
  };
}

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

// Plain Markdown is a portable human-readable review queue, not an attestation.
export function workspaceMarkdown(report) {
  const safe = value => String(value).replace(/[\\`*_{}\[\]<>#|]/g, '\\$&').replace(/[\r\n]+/g, ' ');
  const lines = [`# ${safe(report.workspace.title)}`, '', `Manifest: ${safe(report.workspace.input)}`, '', `Workspace revision: ${report.workspace.revision}`, '', report.semantics, ''];
  if (report.reviews) {
    lines.push(`Changes: ${report.triggers.map(t => `${t.kind} ${safe(t.id)}`).join(', ')}.`, '');
    lines.push(`## Review queue (${report.reviews.length})`, '');
    for (const model of report.reviews) {
      lines.push(`### ${safe(model.title ?? model.id)} (${safe(model.id)})`, '', `Location: ${safe(model.resolvedPath ?? model.location)}`, '', `Status: needs-review · Model: ${model.status}`, '');
      if (model.revision) lines.push(`Model revision: ${model.revision}`, '');
      for (const reason of model.reasons) lines.push(`- Changed ${reason.trigger.kind}: ${safe(reason.trigger.id)}${reason.via.length ? `; ${reason.via.map(e => `${safe(e.from)} → ${safe(e.to)} (${e.direction})`).join('; ')}` : '; directly selected'}.`);
      lines.push('', 'Evidence to inspect:', '');
      if (!model.sources.length) lines.push('- No declared evidence. Establish the basis before assessing accuracy.');
      for (const source of model.sources) lines.push(`- ${safe(source.id)}: ${safe(source.resolvedPath ?? source.location)} (${source.status})${source.revision ? `; declared revision: ${safe(source.revision)}` : '; no declared revision'}`);
      if (model.blockers.length) lines.push('', 'Access/reference gaps:', '', ...model.blockers.map(b => `- ${safe(b)}`));
      lines.push('', 'Outcome: pending. After review, record updated, still-accurate, blocked, or out-of-scope; include the evidence revision inspected and rationale.', '');
    }
    lines.push(`Not reached: ${report.unaffected.map(safe).join(', ') || 'none'}.`, '', `Changed sources with no declared consumers: ${report.unmatchedSources.map(safe).join(', ') || 'none'}.`, '');
  } else {
    lines.push(`References complete: ${report.referencesComplete ? 'yes' : 'no'}. Evidence has not been reviewed.`, '', '## Models', '',
      ...report.models.map(m => `- ${safe(m.id)}: ${safe(m.resolvedPath ?? m.location)} (${m.status}); evidence: ${m.sourceRefs.map(safe).join(', ') || 'none declared'}`), '',
      '## Elaboration', '', ...report.relationships.map(r => `- ${safe(r.child)} elaborates ${safe(r.parent)}${r.element ? ` / ${safe(r.element)}` : ''} (${r.status}).`), '',
      '## Sources', '', ...report.sources.map(s => `- ${safe(s.id)}: ${safe(s.resolvedPath ?? s.location)} (${s.status})`), '');
  }
  if (report.diagnostics.length) lines.push('## Diagnostics', '', ...report.diagnostics.map(d => `- ${d.severity}: ${safe(d.message)}`), '');
  return lines.join('\n') + '\n';
}
