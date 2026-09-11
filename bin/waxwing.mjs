#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const usage = `Waxwing — experimental modular diagram tool

  waxwing validate <model.json>
  waxwing prepare <model.json> <resolved-model.json>
  waxwing layout <model.json> <layout.json> [--group perspective-id] [--direction RIGHT|DOWN]
  waxwing check-layout <layout.json>
  waxwing render <layout.json> <output.svg|output.html> [--graph graph-id | --workflow workflow-id]
  waxwing render-site <layout.json> <output-directory>
  waxwing build-site <model.json> <output-directory> [--group perspective-id] [--direction RIGHT|DOWN]
  waxwing build-collection <collection.json> <output-directory>
  waxwing skill install <skill-directory>
  waxwing query <model.json> <search|inspect|neighbors|workflows|workflow> <text-or-id> [--limit 20] [--budget 12000] [--offset 0] [--kind kind] [--direction incoming|outgoing|both] [--relation kind]
  waxwing recover <layout.json|diagram.svg|diagram.html|site-directory> <model.json>
  waxwing build <model.json> <output-directory> [--group perspective-id] [--direction RIGHT|DOWN]

Architecture and basic sequence models use the same commands. Sequence models declare diagramType: sequence.
--group and --direction apply only to architecture diagrams; sequence order comes from JSON 1.
--anchor graph-id=node-id applies to layout, build, and build-site. Repeat for different architecture graphs.
An anchor is a reading preference, not a workflow entry or execution-order claim.
The layout stage is optional. Render accepts a compatible, independently authored JSON 2.
build-site publishes a managed directory with an index and one page per view/document.
build-collection packages separate models or existing sites under one home page, with shared search and explicit links.
skill install writes a managed authoring/update skill bound to this package into an explicit destination.
query reads recorded model knowledge; its budget bounds result characters, not tokens or the metadata envelope.
render-site accepts JSON 2 directly; neither requires a Waxwing server.
validate, prepare, layout, build, and build-site load explicitly registered Markdown files and local raster images.
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
    if (args[index] === '--anchor') {
      const pair = args[index + 1].split('=');
      if (pair.length !== 2 || pair.some((part) => !part)) throw new Error('--anchor requires graph-id=node-id.');
      options.readingAnchors ??= {};
      if (Object.hasOwn(options.readingAnchors, pair[0])) throw new Error(`Repeated reading anchor for graph "${pair[0]}".`);
      Object.defineProperty(options.readingAnchors, pair[0], { value: pair[1], enumerable: true });
      continue;
    }
    const key = { '--group': 'groupingPerspectiveRef', '--direction': 'direction' }[args[index]];
    if (!key || Object.hasOwn(options, key)) throw new Error(`Unknown or repeated option ${args[index]}.`);
    options[key] = args[index + 1];
  }
  return options;
}

const [command, ...args] = process.argv.slice(2);
try {
  if (!command || ['--help', '-h', 'help'].includes(command)) console.log(usage);
  else if (command === 'validate') {
    if (args.length !== 1) throw new Error('validate requires one JSON 1 file.');
    const { validateModel } = await import('../modules/model/index.mjs');
    const { loadModel } = await import('../modules/documents/index.mjs');
    const result = validateModel(loadModel(args[0]).model);
    console.log(JSON.stringify(result.ok ? result : {...result, command, input: path.resolve(args[0])}, null, 2)); process.exitCode = result.ok ? 0 : 1;
  } else if (command === 'prepare') {
    if (args.length !== 2) throw new Error('prepare requires an authoring input and a resolved JSON 1 output path.');
    const { loadModel } = await import('../modules/documents/index.mjs');
    const { model, inputFiles } = loadModel(args[0]);
    console.log(JSON.stringify({ ok: true, output: write(args[1], JSON.stringify(model, null, 2) + '\n', inputFiles) }));
  } else if (command === 'check-layout') {
    if (args.length !== 1) throw new Error('check-layout requires one JSON 2 file.');
    const { validateLayout } = await import('../modules/layout/validate.mjs');
    const result = validateLayout(readJSON(args[0]));
    console.log(JSON.stringify(result.ok ? result : {...result, command, input: path.resolve(args[0])}, null, 2)); process.exitCode = result.ok ? 0 : 1;
  } else if (command === 'skill') {
    if(args.length!==2||args[0]!=='install')throw new Error('Usage: waxwing skill install <skill-directory>.');
    const {installSkill}=await import('../modules/skill/index.mjs');
    console.log(JSON.stringify({ok:true,...installSkill(args[1])},null,2));
  } else if (command === 'build-collection') {
    if(args.length!==2)throw new Error('build-collection requires collection JSON and output directory paths.');
    const {buildCollection}=await import('../modules/site/collection.mjs');
    console.log(JSON.stringify({ok:true,...await buildCollection(args[0],args[1])},null,2));
  } else if (command === 'query') {
    if(args.length<3||(args.length-3)%2)throw new Error('query requires a model, operation, value, and optional flag/value pairs.');
    const options={};
    for(let i=3;i<args.length;i+=2) {
      const key=args[i].slice(2);
      if(!['--limit','--offset','--budget','--kind','--direction','--relation'].includes(args[i])||Object.hasOwn(options,key))throw new Error(`Unknown or repeated query option ${args[i]}.`);
      options[key]=['limit','offset','budget'].includes(key)?Number(args[i+1]):args[i+1];
    }
    const {loadModel}=await import('../modules/documents/index.mjs');
    const {queryModel}=await import('../modules/query/index.mjs');
    console.log(JSON.stringify({ok:true,...queryModel(loadModel(args[0]).model,args[1],args[2],options)},null,2));
  } else if (command === 'render-site' || command === 'build-site') {
    if (args.length < 2 || (command === 'render-site' && args.length !== 2)) throw new Error(`${command} requires input and output directory paths.`);
    const { renderSite, writeSite } = await import('../modules/site/index.mjs');
    let layout, inputFiles;
    if (command === 'build-site') {
      const { loadModel } = await import('../modules/documents/index.mjs');
      const { layoutModel } = await import('../modules/layout/index.mjs');
      const loaded = loadModel(args[0]); inputFiles = loaded.inputFiles;
      layout = await layoutModel(loaded.model, layoutArgs(args.slice(2)));
    } else { layout = readJSON(args[0]); inputFiles = [args[0]]; }
    const result = writeSite(renderSite(layout), args[1], {inputFiles});
    console.log(JSON.stringify({ok:true,...result},null,2));
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
    if (args.length !== 2 && !(args.length === 4 && ['--graph', '--workflow'].includes(args[2]))) throw new Error('render requires JSON 2 and an SVG or HTML output path, optionally --graph or --workflow for SVG.');
    const { renderSVG, renderHTML } = await import('../modules/render/index.mjs');
    const renderer = { '.svg': renderSVG, '.html': renderHTML }[path.extname(args[1]).toLowerCase()];
    if (!renderer) throw new Error('Output extension must be .svg or .html.');
    if (args.length === 4 && path.extname(args[1]).toLowerCase() !== '.svg') throw new Error('--graph/--workflow select a standalone SVG; HTML includes all views.');
    const content = renderer(readJSON(args[0]), args.length === 4 ? { [args[2] === '--workflow' ? 'workflowRef' : 'graphRef']: args[3] } : undefined);
    console.log(JSON.stringify({ ok: true, output: write(args[1], content, [args[0]]) }));
  } else if (command === 'recover') {
    if (args.length !== 2) throw new Error('recover requires an artifact and a JSON 1 output path.');
    const { recoverArtifact } = await import('../modules/render/artifacts.mjs');
    const directory = fs.statSync(args[0]).isDirectory();
    const model = directory ? (await import('../modules/site/files.mjs')).recoverSite(args[0]) : recoverArtifact(fs.readFileSync(args[0], 'utf8'));
    if (directory) {
      (await import('../modules/site/files.mjs')).assertOutsideSite(args[0],args[1]);
    }
    console.log(JSON.stringify({ ok: true, output: write(args[1], JSON.stringify(model, null, 2) + '\n', directory ? [path.join(args[0],'source/model.json'),path.join(args[0],'source/layout.json')] : [args[0]]) }));
  } else throw new Error(`Unknown command "${command}". Run with --help.`);
} catch (error) {
  console.error(JSON.stringify({ ok: false, command, ...(args[0] && ['validate','prepare','layout','check-layout','render','recover','build','render-site','build-site','build-collection','query'].includes(command) ? {input: path.resolve(args[0])} : {}), message: error.message, diagnostics: error.diagnostics ?? [] }, null, 2));
  process.exitCode = 1;
}
