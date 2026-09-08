#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const usage = `Waxwing — experimental modular diagram tool

  waxwing validate <model.json>
  waxwing prepare <model.json> <resolved-model.json>
  waxwing layout <model.json> <layout.json> [--group perspective-id] [--direction RIGHT|DOWN]
  waxwing check-layout <layout.json>
  waxwing render <layout.json> <output.svg|output.html> [--graph graph-id]
  waxwing recover <layout.json|diagram.svg|diagram.html> <model.json>
  waxwing build <model.json> <output-directory> [--group perspective-id] [--direction RIGHT|DOWN]

Architecture and basic sequence models use the same commands. Sequence models declare diagramType: sequence.
--group and --direction apply only to architecture diagrams; sequence order comes from JSON 1.
The layout stage is optional. Render accepts a compatible, independently authored JSON 2.
validate, prepare, layout, and build load explicitly registered Markdown files and local raster images.
No command scans repositories, fetches source locators, or calls an LLM.`;

function readJSON(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
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
function layoutArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!args[index + 1]) throw new Error(`Missing value for ${args[index]}.`);
    const key = { '--group': 'groupingPerspectiveRef', '--direction': 'direction' }[args[index]];
    if (!key || Object.hasOwn(options, key)) throw new Error(`Unknown or repeated option ${args[index]}.`);
    options[key] = args[index + 1];
  }
  return options;
}

try {
  const [command, ...args] = process.argv.slice(2);
  if (!command || ['--help', '-h', 'help'].includes(command)) console.log(usage);
  else if (command === 'validate') {
    if (args.length !== 1) throw new Error('validate requires one JSON 1 file.');
    const { validateModel } = await import('../modules/model/index.mjs');
    const { loadModel } = await import('../modules/documents/index.mjs');
    const result = validateModel(loadModel(args[0]).model);
    console.log(JSON.stringify(result, null, 2)); process.exitCode = result.ok ? 0 : 1;
  } else if (command === 'prepare') {
    if (args.length !== 2) throw new Error('prepare requires an authoring input and a resolved JSON 1 output path.');
    const { loadModel } = await import('../modules/documents/index.mjs');
    const { model, inputFiles } = loadModel(args[0]);
    console.log(JSON.stringify({ ok: true, output: write(args[1], JSON.stringify(model, null, 2) + '\n', inputFiles) }));
  } else if (command === 'check-layout') {
    if (args.length !== 1) throw new Error('check-layout requires one JSON 2 file.');
    const { validateLayout } = await import('../modules/layout/validate.mjs');
    const result = validateLayout(readJSON(args[0]));
    console.log(JSON.stringify(result, null, 2)); process.exitCode = result.ok ? 0 : 1;
  } else if (command === 'layout' || command === 'build') {
    if (args.length < 2) throw new Error(`${command} requires input and output paths.`);
    const { layoutModel } = await import('../modules/layout/index.mjs');
    const { loadModel } = await import('../modules/documents/index.mjs');
    const { model, inputFiles } = loadModel(args[0]);
    const layout = await layoutModel(model, layoutArgs(args.slice(2)));
    if (command === 'layout') console.log(JSON.stringify({ ok: true, output: write(args[1], JSON.stringify(layout, null, 2) + '\n', inputFiles) }));
    else {
      const { renderSVG, renderHTML } = await import('../modules/render/index.mjs');
      // Compute and validate all content before replacing any prior output.
      const outputs = [['layout.json', JSON.stringify(layout, null, 2) + '\n'], ['diagram.svg', renderSVG(layout)], ['diagram.html', renderHTML(layout)]];
      const paths = outputs.map(([name, content]) => write(path.join(args[1], name), content, inputFiles));
      console.log(JSON.stringify({ ok: true, outputs: paths }, null, 2));
    }
  } else if (command === 'render') {
    if (args.length !== 2 && !(args.length === 4 && args[2] === '--graph')) throw new Error('render requires JSON 2 and an SVG or HTML output path, optionally --graph for SVG.');
    const { renderSVG, renderHTML } = await import('../modules/render/index.mjs');
    const renderer = { '.svg': renderSVG, '.html': renderHTML }[path.extname(args[1]).toLowerCase()];
    if (!renderer) throw new Error('Output extension must be .svg or .html.');
    if (args.length === 4 && path.extname(args[1]).toLowerCase() !== '.svg') throw new Error('--graph selects a standalone SVG; HTML always includes all graphs.');
    const content = renderer(readJSON(args[0]), args.length === 4 ? { graphRef: args[3] } : undefined);
    console.log(JSON.stringify({ ok: true, output: write(args[1], content, [args[0]]) }));
  } else if (command === 'recover') {
    if (args.length !== 2) throw new Error('recover requires an artifact and a JSON 1 output path.');
    const { recoverArtifact } = await import('../modules/render/artifacts.mjs');
    const model = recoverArtifact(fs.readFileSync(args[0], 'utf8'));
    console.log(JSON.stringify({ ok: true, output: write(args[1], JSON.stringify(model, null, 2) + '\n', [args[0]]) }));
  } else throw new Error(`Unknown command "${command}". Run with --help.`);
} catch (error) {
  console.error(JSON.stringify({ ok: false, message: error.message, diagnostics: error.diagnostics ?? [] }, null, 2));
  process.exitCode = 1;
}
