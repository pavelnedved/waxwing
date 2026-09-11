import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { fail } from '../shared/model.mjs';

export const WORKSPACE_VERSION = '0.1-workspace-draft';
const schema = JSON.parse(fs.readFileSync(new URL('../../../schemas/workspace.schema.json', import.meta.url), 'utf8'));
const validateShape = new Ajv2020({ strict: true, allErrors: true }).compile(schema);

// Locators are declarations, never instructions to fetch, clone, or scan.
export function locate(location, directory) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(location) && !path.isAbsolute(location)) {
    const url = new URL(location);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
      throw new Error('Use a local path or an HTTP(S) locator without embedded credentials.');
    }
    return { kind: 'remote', location };
  }
  return { kind: 'local', location, resolvedPath: path.resolve(directory, location) };
}

export function validateWorkspace(config, directory) {
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
      try { locate(entry.location, directory); }
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

  return diagnostics;
}
