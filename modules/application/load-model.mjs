import fs from 'node:fs';
import path from 'node:path';
import { validateModel } from '../knowledge/architecture/model.mjs';
import { parseMarkdown, fragmentTarget, external, assetMime } from '../knowledge/documents/markdown.mjs';
import { fail } from '../knowledge/shared/model.mjs';

const readText = (file) => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(fs.readFileSync(file));

// Only explicitly listed documents and their local raster images are read.
// The ordinary layout and renderer entry points never resolve filesystem paths.
export function loadModel(filename) {
  const sourceFile = fs.realpathSync(filename);
  const input = JSON.parse(readText(sourceFile));
  const files = new Set([sourceFile]);
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Expected a model object.');
  const model = structuredClone(input);
  if (model.documents !== undefined && !Array.isArray(model.documents)) fail('documents must be an array.');
  const locations = new Map(), originals = new Map();
  for (const [i, doc] of (model.documents ?? []).entries()) {
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) fail(`documents[${i}] must be an object.`);
    if (!Object.hasOwn(doc, 'file')) continue;
    if (Object.hasOwn(doc, 'markdown') || Object.hasOwn(doc, 'links') || Object.hasOwn(doc, 'assets')) fail(`Document "${doc.id}" must supply file OR resolved Markdown, not both.`);
    if (typeof doc.file !== 'string' || !doc.file) fail(`Document "${doc.id}" has an invalid file path.`);
    const file = fs.realpathSync(path.resolve(path.dirname(sourceFile), doc.file));
    if (path.extname(file).toLowerCase() !== '.md') fail(`Document "${doc.id}" must reference a .md file.`);
    if (locations.has(file)) fail(`The same Markdown file is registered twice: ${doc.file}`);
    locations.set(file, doc.id); originals.set(doc.id, file); files.add(file);
    doc.markdown = readText(file); doc.links = []; doc.assets = []; delete doc.file;
  }
  for (const doc of model.documents ?? []) {
    if (typeof doc.markdown !== 'string') continue; // Shape validation reports the missing content.
    const file = originals.get(doc.id);
    // Inline canonical documents already carry resolutions; don't guess or replace them.
    if (!file) continue;
    const seen = new Set();
    for (const resource of parseMarkdown(doc.markdown).resources) {
      const key = `${resource.type}:${resource.href}`;
      if (seen.has(key) || external(resource.href)) continue;
      seen.add(key);
      let target;
      if (resource.type === 'link' && resource.href.startsWith('#')) target = fragmentTarget(resource.href, doc.id, model.graphs ? model : model.id);
      else {
        const hash = resource.href.indexOf('#');
        const local = hash < 0 ? resource.href : resource.href.slice(0, hash);
        const heading = hash < 0 ? undefined : decodeURIComponent(resource.href.slice(hash + 1));
        const decoded = decodeURIComponent(local);
        if (!decoded || decoded.includes('?') || decoded.includes('\\') || path.isAbsolute(decoded) || /^[a-z][a-z0-9+.-]*:/i.test(decoded)) fail(`Document "${doc.id}": use a relative local path or an explicit HTTPS link for "${resource.href}".`);
        const destination = fs.realpathSync(path.resolve(path.dirname(file), decoded));
        if (resource.type === 'image') {
          if (heading !== undefined) fail(`Image fragments are unsupported: ${resource.href}`);
          const bytes = fs.readFileSync(destination), mimeType = assetMime(bytes);
          if (!mimeType) fail(`Unsupported image "${resource.href}". Use PNG, JPEG, GIF, or WebP; SVG and other local assets are not supported yet.`);
          files.add(destination); doc.assets.push({ href: resource.href, mimeType, data: bytes.toString('base64') });
          continue;
        }
        const ref = locations.get(destination);
        if (!ref) fail(`Document "${doc.id}" links to "${resource.href}", but that file is not registered in documents. Register it or use an external URL.`);
        target = { kind: 'document', ref, ...(heading ? { heading } : {}) };
      }
      doc.links.push({ href: resource.href, target });
    }
  }
  const result = validateModel(model);
  if (!result.ok) fail('Loaded JSON 1 is invalid.', result.diagnostics);
  return { model, inputFiles: [...files] };
}
