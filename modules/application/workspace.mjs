import fs from 'node:fs';
import path from 'node:path';
import { loadModel } from './load-model.mjs';
import { digest } from '../knowledge/shared/model.mjs';
import { locate, validateWorkspace } from '../knowledge/workspace/model.mjs';

export function loadWorkspace(input) {
  const filename = fs.realpathSync(input);
  const config = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const diagnostics = validateWorkspace(config, path.dirname(filename));
  const add = (severity, code, pointer, message) => diagnostics.push({ severity, code, path: pointer, message });

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
