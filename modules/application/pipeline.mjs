import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { loadModel } from './load-model.mjs';

const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function write(file, contents, inputs = []) {
  const target = path.resolve(file);
  for (const input of inputs) {
    const resolved = path.resolve(input);
    const actualTarget = fs.existsSync(target) ? fs.realpathSync(target) : target;
    if (target === resolved || actualTarget === fs.realpathSync(resolved)) throw new Error('Output must not overwrite its input.');
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = path.join(path.dirname(target), `.waxwing-${randomUUID()}.tmp`);
  try { fs.writeFileSync(temp, contents); fs.renameSync(temp, target); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  return target;
}

// File workflows return data or throw; callers own arguments, messages and exit codes.
// Keep layout imports lazy so preparation, rendering and recovery do not load ELK.
export function prepareModelFile(input, output) {
  const { model, inputFiles } = loadModel(input);
  return { output: write(output, JSON.stringify(model, null, 2) + '\n', inputFiles) };
}

export async function checkLayoutFile(input) {
  const { validateLayout } = await import('../presentation/layout/validate.mjs');
  return validateLayout(readJSON(input));
}

async function loadAndLayout(input, options) {
  const { layoutModel } = await import('../presentation/layout/index.mjs');
  const { model, inputFiles } = loadModel(input);
  return { layout: await layoutModel(model, options), inputFiles };
}

export async function layoutModelFile(input, output, options) {
  const { layout, inputFiles } = await loadAndLayout(input, options);
  return { output: write(output, JSON.stringify(layout, null, 2) + '\n', inputFiles) };
}

export async function buildModelFiles(input, directory, options) {
  const { layout, inputFiles } = await loadAndLayout(input, options);
  const { renderSVG, renderHTML } = await import('../presentation/render/index.mjs');
  // Compute and validate all content before replacing any prior output.
  const outputs = [['layout.json', JSON.stringify(layout, null, 2) + '\n'], ['diagram.svg', renderSVG(layout)], ['diagram.html', renderHTML(layout)]];
  return { outputs: outputs.map(([name, content]) => write(path.join(directory, name), content, inputFiles)) };
}

export async function renderLayoutFile(input, output, options) {
  const { renderSVG, renderHTML } = await import('../presentation/render/index.mjs');
  const renderer = { '.svg': renderSVG, '.html': renderHTML }[path.extname(output).toLowerCase()];
  if (!renderer) throw new Error('Output extension must be .svg or .html.');
  if ((options?.graphRef !== undefined || options?.workflowRef !== undefined) && path.extname(output).toLowerCase() !== '.svg') throw new Error('--graph/--workflow select a standalone SVG; HTML includes all views.');
  return { output: write(output, renderer(readJSON(input), options), [input]) };
}

export async function renderSiteFile(input, directory) {
  const { renderSite } = await import('../presentation/site/index.mjs');
  const { writeSite } = await import('./site-files.mjs');
  return writeSite(renderSite(readJSON(input)), directory, { inputFiles: [input] });
}

export async function buildSiteFiles(input, directory, options) {
  const { layout, inputFiles } = await loadAndLayout(input, options);
  const { renderSite } = await import('../presentation/site/index.mjs');
  const { writeSite } = await import('./site-files.mjs');
  return writeSite(renderSite(layout), directory, { inputFiles });
}

export async function recoverModelFile(input, output) {
  const { recoverArtifact } = await import('../presentation/render/artifacts.mjs');
  const directory = fs.statSync(input).isDirectory();
  let model;
  if (directory) {
    const { recoverSite, assertOutsideSite } = await import('./site-files.mjs');
    model = recoverSite(input);
    assertOutsideSite(input, output);
  } else model = recoverArtifact(fs.readFileSync(input, 'utf8'));
  return { output: write(output, JSON.stringify(model, null, 2) + '\n', directory ? [path.join(input, 'source/model.json'), path.join(input, 'source/layout.json')] : [input]) };
}
