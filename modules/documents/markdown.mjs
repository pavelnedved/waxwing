import MarkdownIt from 'markdown-it';
import { graphsOf, graphNodes } from '../graphs/index.mjs';
import { canonical } from '../shared/model.mjs';

// Render Markdown at export time. No parser, filesystem access, or network
// client is required in the portable viewer.
export const markdown = new MarkdownIt({ html: false, linkify: false, typographer: false });
markdown.validateLink = (url) => !/[\u0000-\u0020\u007f]/u.test(url) && !url.startsWith('//') &&
  (!/^[a-z][a-z0-9+.-]*:/i.test(url) || /^(https?:|mailto:)/i.test(url));
markdown.renderer.rules.ww_external_image = (tokens, index) => {
  const token = tokens[index], escape = markdown.utils.escapeHtml;
  return `<a href="${escape(token.attrGet('src'))}" target="_blank" rel="noopener noreferrer">External image: ${escape(token.content || token.attrGet('src'))}</a>`;
};

export const external = (href) => /^(https?:|mailto:)/i.test(href);
export const headingId = (documentId, heading) => `ww-doc-${documentId}--${heading}`;

function textOf(tokens) {
  return tokens.map((token) => token.children ? textOf(token.children) :
    ['text', 'code_inline', 'softbreak', 'hardbreak'].includes(token.type) ? token.content || ' ' : '').join('');
}

export function parseMarkdown(source) {
  const tokens = markdown.parse(source, {});
  const headings = [];
  const used = new Set();
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'heading_open') continue;
    const title = textOf(tokens[i + 1].children ?? []);
    const base = title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-') || 'section';
    let slug = base, suffix = 0;
    while (used.has(slug)) slug = `${base}-${++suffix}`;
    used.add(slug); headings.push({ slug, title, token: tokens[i] });
  }
  const resources = [];
  function visit(items) {
    for (const token of items) {
      if (token.type === 'link_open') resources.push({ type: 'link', href: token.attrGet('href'), token });
      if (token.type === 'image') resources.push({ type: 'image', href: token.attrGet('src'), token });
      if (token.children) visit(token.children);
    }
  }
  visit(tokens);
  return { tokens, headings, resources };
}

// The record identity is separate from the URL used by this exporter.
export function targetURL(target, graphId) {
  const params = new URLSearchParams();
  if (target.kind === 'document') params.set('document', target.ref);
  else if (target.kind === 'workflow') params.set('workflow', target.ref);
  else if (target.workflowRef || target.kind === 'step') {
    const workflowRef = target.workflowRef ?? graphId.workflows?.find((w) => w.steps.some((s) => s.id === target.ref))?.id;
    if (workflowRef) params.set('workflow', workflowRef);
    params.set(target.kind, target.ref);
  }
  else {
    if (target.kind === 'graph') params.set('graph', target.ref);
    else if (target.graphRef || typeof graphId === 'string') params.set('graph', target.graphRef ?? graphId);
    if (target.kind !== 'graph') params.set(target.kind, target.ref);
  }
  if (target.heading !== undefined) params.set('heading', target.heading);
  return `#${params}`;
}

export function fragmentTarget(href, documentId, graphId) {
  if (!href.startsWith('#')) return null;
  const fragment = href.slice(1);
  if (!fragment.includes('=')) return { kind: 'document', ref: documentId, ...(fragment ? { heading: decodeURIComponent(fragment) } : {}) };
  const params = new URLSearchParams(fragment);
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length || keys.some((key) => !['document', 'graph', 'node', 'edge', 'block', 'heading', 'workflow', 'step'].includes(key))) throw new Error(`Invalid internal link "${href}".`);
  if (params.has('workflow') || params.has('step')) {
    if (['document','graph','edge','block','heading'].some((key) => params.has(key)) || (params.has('node') && params.has('step'))) throw new Error(`Ambiguous workflow link "${href}".`);
    if (params.has('step') || params.has('node')) return { kind: params.has('step') ? 'step' : 'node', ref: params.get(params.has('step') ? 'step' : 'node'), ...(params.has('workflow') ? { workflowRef: params.get('workflow') } : {}) };
    return { kind: 'workflow', ref: params.get('workflow') };
  }
  if (params.has('document')) {
    if (['graph', 'node', 'edge', 'block'].some((key) => params.has(key))) throw new Error(`Ambiguous internal link "${href}".`);
    return { kind: 'document', ref: params.get('document'), ...(params.has('heading') ? { heading: params.get('heading') } : {}) };
  }
  if (params.has('heading') || ['node', 'edge', 'block'].filter((key) => params.has(key)).length > 1 || (typeof graphId === 'string' && params.has('graph') && params.get('graph') !== graphId)) throw new Error(`Invalid graph link "${href}".`);
  if (params.has('block')) return { kind: 'block', ref: params.get('block'), ...(typeof graphId !== 'string' && params.has('graph') ? { graphRef: params.get('graph') } : {}) };
  if (params.has('node')) return { kind: 'node', ref: params.get('node'), ...(typeof graphId !== 'string' && params.has('graph') ? { graphRef: params.get('graph') } : {}) };
  if (params.has('edge')) return { kind: 'edge', ref: params.get('edge'), ...(typeof graphId !== 'string' && params.has('graph') ? { graphRef: params.get('graph') } : {}) };
  if (params.has('graph')) return { kind: 'graph', ref: params.get('graph') };
  throw new Error(`Missing target in "${href}".`);
}

export function assetMime(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii'))) return 'image/gif';
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

export function documentDiagnostics(model) {
  const diagnostics = [];
  const docs = new Map((model.documents ?? []).map((doc) => [doc.id, doc]));
  const parsed = new Map([...docs].map(([id, doc]) => [id, parseMarkdown(doc.markdown)]));
  const add = (path, message) => diagnostics.push({ code: 'document/invalid', path, message });
  function target(value, path, attachment = false) {
    const valid = value.kind === 'graph' ? graphsOf(model).some((graph) => graph.id === value.ref) :
      value.kind === 'node' ? model.entities.some((item) => item.id === value.ref) :
      value.kind === 'edge' ? model.relationships.some((item) => item.id === value.ref) :
      value.kind === 'block' ? model.diagramType === 'sequence' && model.schemaVersion === '0.2-sequence-draft' && model.blocks.some((item) => item.id === value.ref) :
      value.kind === 'workflow' ? model.workflows?.some((w) => w.id === value.ref) :
      value.kind === 'step' ? model.workflows?.some((w) => w.steps.some((s) => s.id === value.ref)) :
      value.kind === 'document' && !attachment && docs.has(value.ref);
    if (value.workflowRef !== undefined) {
      const workflow = model.workflows?.find((w) => w.id === value.workflowRef);
      if (value.graphRef !== undefined || !workflow || !['node','step'].includes(value.kind) || !(value.kind === 'node' ? workflow.steps.some((s) => [s.from,s.to].includes(value.ref)) : workflow.steps.some((s) => s.id === value.ref))) add(path, 'workflowRef must name a workflow showing the target component or step.');
    } else if (value.graphRef !== undefined) {
      const graph = graphsOf(model).find((item) => item.id === value.graphRef);
      if (!model.graphs || !['node', 'edge'].includes(value.kind) || !graph ||
        !(value.kind === 'node' ? graphNodes(graph) : graph.relationshipRefs).includes(value.ref)) add(path, 'graphRef must name a graph showing the target node or edge.');
    } else if (!attachment && model.graphs && ['node', 'edge'].includes(value.kind)) {
      const matches = graphsOf(model).filter((graph) => (value.kind === 'node' ? graphNodes(graph) : graph.relationshipRefs).includes(value.ref));
      if (matches.length !== 1) add(path, 'Use graphRef for a link whose node or edge does not have one unambiguous graph.');
    }
    if (!valid) add(path, `Unknown ${value.kind} target "${value.ref}".`);
    if (value.heading !== undefined && (value.kind !== 'document' || !parsed.get(value.ref)?.headings.some((item) => item.slug === value.heading))) add(path, `Unknown document heading "${value.heading}".`);
  }
  for (const [i, doc] of (model.documents ?? []).entries()) {
    const path = `/documents/${i}`;
    doc.attachments.forEach((item, j) => target(item, `${path}/attachments/${j}`, true));
    const links = new Map(), assets = new Map();
    for (const [j, link] of doc.links.entries()) {
      if (links.has(link.href)) add(`${path}/links/${j}`, 'Duplicate link destination.');
      links.set(link.href, link); target(link.target, `${path}/links/${j}/target`);
    }
    for (const [j, asset] of doc.assets.entries()) {
      if (assets.has(asset.href)) add(`${path}/assets/${j}`, 'Duplicate asset destination.');
      assets.set(asset.href, asset);
      const bytes = Buffer.from(asset.data, 'base64');
      if (bytes.toString('base64') !== asset.data || assetMime(bytes) !== asset.mimeType) add(`${path}/assets/${j}`, 'Asset must contain base64 PNG, JPEG, GIF, or WebP bytes of its declared type.');
    }
    const usedLinks = new Set(), usedAssets = new Set();
    for (const resource of parsed.get(doc.id).resources) {
      if (external(resource.href)) continue;
      if (resource.type === 'image') {
        if (!assets.has(resource.href)) add(path, `Missing embedded image "${resource.href}".`);
        usedAssets.add(resource.href);
      } else {
        const mapped = links.get(resource.href);
        if (!mapped) add(path, `Missing resolution for link "${resource.href}".`);
        else if (resource.href.startsWith('#')) {
          try {
            if (canonical(fragmentTarget(resource.href, doc.id, model.graphs ? model : model.id)) !== canonical(mapped.target)) add(path, `Resolution changes the explicit target of "${resource.href}".`);
          } catch (error) { add(path, error.message); }
        }
        usedLinks.add(resource.href);
      }
    }
    for (const href of links.keys()) if (!usedLinks.has(href)) add(path, `Unused resolution for "${href}".`);
    for (const href of assets.keys()) if (!usedAssets.has(href)) add(path, `Unused embedded image "${href}".`);
  }
  return diagnostics;
}

export function renderDocument(doc, graphId) {
  const { tokens, headings, resources } = parseMarkdown(doc.markdown);
  for (const heading of headings) heading.token.attrSet('id', headingId(doc.id, heading.slug));
  const links = new Map(doc.links.map((link) => [link.href, link.target]));
  const assets = new Map(doc.assets.map((asset) => [asset.href, asset]));
  for (const resource of resources) {
    if (resource.type === 'link') {
      if (external(resource.href)) {
        resource.token.attrSet('target', '_blank'); resource.token.attrSet('rel', 'noopener noreferrer');
      } else resource.token.attrSet('href', targetURL(links.get(resource.href), graphId));
    } else if (external(resource.href)) {
      // Remote media is an explicit link, never an automatic network request.
      resource.token.type = 'ww_external_image';
    } else {
      const asset = assets.get(resource.href);
      resource.token.attrSet('src', `data:${asset.mimeType};base64,${asset.data}`);
    }
  }
  return markdown.renderer.render(tokens, markdown.options, {});
}
