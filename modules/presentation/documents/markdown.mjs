import { createMarkdown, parseMarkdown, external } from '../../knowledge/documents/markdown.mjs';

export const markdown = createMarkdown();
markdown.renderer.rules.ww_external_image = (tokens, index) => {
  const token = tokens[index], escape = markdown.utils.escapeHtml;
  return `<a href="${escape(token.attrGet('src'))}" target="_blank" rel="noopener noreferrer">External image: ${escape(token.content || token.attrGet('src'))}</a>`;
};

export const headingId = (documentId, heading) => `ww-doc-${documentId}--${heading}`;

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

export function renderDocument(doc, graphId, { resolveTarget = (target) => targetURL(target, graphId) } = {}) {
  const { tokens, headings, resources } = parseMarkdown(doc.markdown);
  for (const heading of headings) heading.token.attrSet('id', headingId(doc.id, heading.slug));
  const links = new Map(doc.links.map((link) => [link.href, link.target]));
  const assets = new Map(doc.assets.map((asset) => [asset.href, asset]));
  for (const resource of resources) {
    if (resource.type === 'link') {
      if (external(resource.href)) {
        resource.token.attrSet('target', '_blank'); resource.token.attrSet('rel', 'noopener noreferrer');
      } else resource.token.attrSet('href', resolveTarget(links.get(resource.href)));
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
