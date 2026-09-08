import fs from 'node:fs';
import { canonical, fail } from '../shared/model.mjs';
import { validateSequenceLayout, stepLines, participantLines } from './layout.mjs';
import { renderDocument } from '../documents/markdown.mjs';
import { cleanViewerSVG } from '../render/highlights.mjs';

const asset = (name) => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const svgCSS = `${asset('../render/diagram.css')}\n${asset('sequence.css')}`;
const pageCSS = `${asset('../render/viewer.css')}\n.sequence-viewport { height: min(65vh, 680px) !important; min-height:330px; }\n.sequence-intro { margin-bottom:20px; }\n.sequence-status { margin:8px 0; }`;
const script = `const cleanViewerSVG = ${cleanViewerSVG.toString()};\n${asset('viewer.js')}`;
function checked(layout, options, allowed) {
  const result = validateSequenceLayout(layout);
  if (!result.ok) fail('Sequence JSON 2 failed validation.', result.diagnostics);
  if (Object.keys(options).some((key) => !allowed.includes(key))) fail('Unknown sequence render option.');
  if (options.graphRef !== undefined && options.graphRef !== layout.model.id) fail('Sequence graphRef must name this scenario.');
  const skin = options.skin ?? 'standard';
  if (!['standard', 'engineering', 'editorial'].includes(skin)) fail('Skin must be standard, engineering, or editorial.');
  return skin;
}
function svgMarkup(layout, skin) {
  const model = layout.model;
  const attrs = (ref, label) => `class="record" data-ref="${escape(ref)}" tabindex="0" role="button" aria-label="Inspect ${escape(label)}"`;
  const lines = layout.participants.map((p) => `<line class="lifeline" x1="${p.lifeline.x}" x2="${p.lifeline.x}" y1="${p.lifeline.startY}" y2="${p.lifeline.endY}"/>`).join('');
  const participants = layout.participants.map((p) => {
    const source = model.participants.find((item) => item.id === p.ref), b = p.box;
    return `<g ${attrs(p.ref, source.label)}><rect class="node-box" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="10"/><text class="node-category" x="${b.x + 18}" y="${b.y + 23}">Participant</text>${participantLines(source).map((line, i) => `<text class="node-title" x="${b.x + 18}" y="${b.y + 48 + i * 20}">${escape(line)}</text>`).join('')}<text class="node-status" x="${b.x + 18}" y="${b.y + b.height - 14}">Meaning: ${source.meaning.status}</text></g>`;
  }).join('');
  const steps = model.order.value.map((id) => {
    const s = layout.steps.find((item) => item.ref === id), source = model.steps.find((item) => item.id === id), b = s.label;
    const path = s.points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
    return `<g ${attrs(id, source.label)}><g class="sequence-step ${source.kind}${source.occurrence.status !== 'established' ? ' uncertain' : ''}"><path class="edge-hit" d="${path}"/><path class="edge-line" d="${path}" marker-end="url(#ww-sequence-arrow)"/><rect class="edge-label-bg" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="4"/>${stepLines(model, source).map((line, i) => `<text class="edge-label" x="${b.x + 10}" y="${b.y + 18 + i * 18}">${escape(line)}</text>`).join('')}</g></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" class="ww-svg sequence-svg" data-skin="${skin}" data-theme="light" width="${layout.canvas.width}" height="${layout.canvas.height}" viewBox="0 0 ${layout.canvas.width} ${layout.canvas.height}" role="group" aria-labelledby="ww-title ww-description"><title id="ww-title">${escape(model.title)}</title><desc id="ww-description">One partial scenario. Top to bottom follows the ${model.order.status} order claim. Spacing does not represent duration. Messages do not imply blocking.</desc>
<metadata id="waxwing-source" data-encoding="base64">${Buffer.from(canonical(layout)).toString('base64')}</metadata>
<style>${svgCSS}</style><defs><marker id="ww-sequence-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="arrow" d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>
<text class="sequence-caption" x="30" y="27">Order: ${model.order.status} · Top → bottom</text><text class="sequence-caption" x="30" y="48">Spacing ≠ duration · Message ≠ blocking · Reply: dashed · Local event: loop</text>${lines}${participants}${steps}</svg>`;
}
export function renderSequenceSVG(layout, options = {}) {
  const skin = checked(layout, options, ['skin', 'graphRef']);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${svgMarkup(layout, skin)}\n`;
}
export function renderSequenceHTML(layout, options = {}) {
  const skin = checked(layout, options, ['skin']), model = layout.model;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(model.title)} · Waxwing</title><style>${pageCSS}</style></head><body data-skin="${skin}">
<header class="masthead"><a class="brand" href="#"><span class="brand-mark">w</span> WAXWING <span class="brand-note">SEQUENCE</span></a><div class="header-actions">${model.documents.length ? `<a class="header-link" href="#documents">Documents ${model.documents.length}</a>` : ''}<label class="skin-control">Style <select id="skin" aria-label="Visual style">${['standard','engineering','editorial'].map((s) => `<option value="${s}"${skin === s ? ' selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select></label><button id="theme">Dark theme</button><button id="source-download">JSON 1 ↓</button><button id="layout-download">JSON 2 ↓</button><button id="svg-download">SVG ↓</button></div></header>
<main id="diagram-main"><div class="eyebrow">SEQUENCE / CURRENT IMPLEMENTATION / PARTIAL SCENARIO</div><div class="title-row"><h1>${escape(model.title)}</h1><button id="model-details">Model details ↗</button></div><p class="purpose">${escape(model.scope.question)}</p><p class="purpose">${escape(model.scope.abstraction)}</p><div class="scope-line">${escape(model.scope.environment)} · ${escape(model.scope.snapshot)} · ${model.participants.length} participants · ${model.steps.length} steps</div>
<div class="sequence-intro"><button id="order-details">Order: ${model.order.status} · inspect evidence ↗</button><p class="purpose">Read top to bottom. Spacing does not represent elapsed time; a message does not imply blocking. This diagram describes one recorded scenario.</p></div>
<section class="map-panel" aria-label="Sequence diagram"><div class="map-toolbar"><span class="toolbar-label">SEQUENCE</span><div class="zoom-controls"><button id="zoom-out" aria-label="Zoom out">−</button><button id="zoom-fit">Fit width</button><button id="zoom-read">100%</button><button id="zoom-in" aria-label="Zoom in">+</button><span id="zoom-label"></span></div></div><div id="map-viewport" class="sequence-viewport" tabindex="0" aria-label="Sequence canvas. Scroll to read later steps.">${svgMarkup(layout, skin)}</div><div class="map-caption">Solid: message · Dashed: reply · Loop: self interaction or local event. Every step has its own identity; select it for evidence and documents.</div></section>
<section class="knowledge-section"><h2>Notes and open questions</h2><div id="sequence-notes"></div></section><footer><span>Complete source and documents travel with this artifact.</span><span>Waxwing · experimental sequence MVP</span></footer></main>
<main id="document-reader" hidden><div class="document-breadcrumb"><a href="#">← Sequence</a><span>/</span><a href="#documents">Documents</a></div><div class="document-workspace"><nav id="document-nav" aria-label="Included documents"></nav><section id="document-content"></section></div></main>
${model.documents.map((doc) => `<template id="ww-document-${escape(doc.id)}"><article class="markdown-body">${renderDocument(doc, model.id)}</article></template>`).join('')}
<aside id="inspector" hidden aria-label="Model inspector"><div class="inspector-header"><span>IN DETAIL</span><button id="close-inspector" aria-label="Close details">×</button></div><div id="inspector-content"></div></aside><script>${script}</script></body></html>\n`;
}
