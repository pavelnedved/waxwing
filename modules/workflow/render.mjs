import fs from 'node:fs';
import { canonical, wrap, existenceText } from '../shared/model.mjs';
import { appearanceLines, appearanceCue, stepLines } from './text.mjs';
const css = fs.readFileSync(new URL('../render/diagram.css', import.meta.url), 'utf8');
const esc = (value) => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const rect = (b, cls) => `<rect class="${cls}" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="8"/>`;
const text = (line,x,y,cls) => `<text class="${cls}" x="${x}" y="${y}">${esc(line)}</text>`;
export function workflowSVG(source, ref, embed = true, skin = 'standard') {
  const workflow = source.model.workflows?.find((w) => w.id === ref), drawing = source.workflows?.find((w) => w.ref === ref);
  if (!workflow || !drawing) throw new Error(`Unknown workflow "${ref}".`);
  const model = source.model;
  const nodes = drawing.appearances.map((a) => {
    const entity = model.entities.find((e) => e.id === a.entityRef), b = a.box;
    const same = drawing.appearances.filter((p) => p.entityRef === a.entityRef);
    const cue = appearanceCue(workflow, a), cues = wrap(cue, 26), extra = (cues.length - 1) * 16;
    const title = wrap(entity.label, 26);
    return `<g class="record" data-ref="${esc(entity.id)}" data-appearance="${esc(a.id)}" tabindex="0" role="button" aria-label="Inspect ${esc(entity.label)} ${esc(cue)}">${rect(b,'node-box')}${cues.map((line,i) => text(line,b.x+18,b.y+24+i*16,'node-category')).join('')}${title.map((line,i) => text(line,b.x+18,b.y+50+extra+i*20,'node-title')).join('')}${text(existenceText(entity.existence),b.x+18,b.y+58+extra+title.length*20,'node-status')}${appearanceLines(model,workflow,a,drawing.layout.groupingPerspectiveRef).map((line,i) => text(line,b.x+18,b.y+78+extra+title.length*20+i*16,'node-status')).join('')}${text(same.length > 1 ? `Same component · ${same.length} appearances` : 'Inspect evidence ↗',b.x+18,b.y+b.height-14,'node-link')}</g>`;
  }).join('');
  const edges = drawing.edges.map((e) => {
    const step = workflow.steps.find((s) => s.id === e.ref), b = e.label;
    const d = e.points.map((p,i) => `${i?'L':'M'}${p.x},${p.y}`).join(' ');
    return `<g class="record" data-ref="${esc(step.id)}" tabindex="0" role="button" aria-label="Inspect ${esc(step.label)}"><path class="edge-hit" d="${d}"/><path class="edge-line" d="${d}"${step.kind === 'reply' ? ' stroke-dasharray="7 5"' : ''} marker-end="url(#ww-workflow-arrow)"/>${rect(b,'edge-label-bg')}${stepLines(workflow,step).map((line,i) => text(line,b.x+10,b.y+18+i*18,'edge-label')).join('')}</g>`;
  }).join('');
  const direction = drawing.layout.direction === 'RIGHT' ? 'Left → right' : 'Top → bottom';
  return `<svg xmlns="http://www.w3.org/2000/svg" class="ww-svg workflow-svg" data-workflow-ref="${esc(ref)}" data-graph-ref="${esc(workflow.graphRef)}" data-skin="${skin}" data-theme="light" width="${drawing.canvas.width}" height="${drawing.canvas.height}" viewBox="0 0 ${drawing.canvas.width} ${drawing.canvas.height}" role="group" aria-labelledby="ww-title ww-description"><title id="ww-title">${esc(workflow.title)}</title><desc id="ww-description">${esc(workflow.scope.abstraction)} Repeated appearances share one canonical component. Steps follow explicit order; replies do not create architecture dependencies.</desc>${embed ? `<metadata id="waxwing-source" data-encoding="base64">${Buffer.from(canonical(source)).toString('base64')}</metadata>` : ''}<style>${css}</style><defs><marker id="ww-workflow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="arrow" d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>${text(`${direction} · Order: ${workflow.order.status} · Entry: ${workflow.entry.point.status} · Trigger: ${workflow.entry.trigger.status}`,36,26,'edge-label')}${text('Repeated boxes share one component ID. Solid: message/event · Dashed: reply.',36,48,'edge-label')}${text('Partial scenario · Spacing ≠ duration · Message ≠ blocking',36,70,'edge-label')}${edges}${nodes}</svg>`;
}
