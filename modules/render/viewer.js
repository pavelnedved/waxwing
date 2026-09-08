(() => {
  'use strict';
  const payload = document.getElementById('waxwing-source').textContent;
  const layout = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload), (char) => char.charCodeAt(0))));
  const model = layout.model;
  const documents = model.documents ?? [];
  const graphs = model.graphs ?? [{ id: model.id, title: model.title, scope: model.scope,
    entityRefs: model.entities.map((item) => item.id), contextRefs: [],
    relationshipRefs: model.relationships.map((item) => item.id), membershipRefs: model.memberships.map((item) => item.id) }];
  const root = model.rootGraphRef ?? model.id;
  let activeGraph = graphs.find((item) => item.id === root);
  let drawing = layout.graphs?.find((item) => item.ref === root) ?? layout;
  const graphNodes = (graph) => [...graph.entityRefs, ...graph.contextRefs];
  const locations = (kind, ref) => graphs.filter((graph) => (kind === 'node' ? graphNodes(graph) : graph.relationshipRefs).includes(ref));
  const collections = ['sources', 'perspectives', 'entities', 'groups', 'memberships', 'relationships', 'notes', 'documents', 'graphs'];
  const index = new Map(collections.flatMap((collection) => (model[collection] ?? []).map((record) => [record.id, { record, collection }])));
  let svg = document.querySelector('.ww-svg');
  const sourceMetadata = document.getElementById('waxwing-source').cloneNode(true);
  const viewport = document.getElementById('map-viewport');
  const inspector = document.getElementById('inspector');
  const content = document.getElementById('inspector-content');
  let previousFocus;
  let selectedRef = null;
  let currentBoundary = null;
  const highlightMode = document.getElementById('highlight-mode');
  let zoom = 1;
  let fitted = true;
  const name = (ref) => {
    const record = index.get(ref)?.record;
    if (record?.memberRef) return `${index.get(record.memberRef)?.record.label ?? record.memberRef} · ${index.get(record.perspectiveRef)?.record.label ?? record.perspectiveRef}`;
    return record?.label || record?.title || record?.statement || ref;
  };
  const humanize = (key) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ');

  function el(tag, text, className) {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  }

  function field(key, value) {
    const container = el('div', undefined, 'detail-field');
    container.append(el('span', humanize(key), 'detail-key'));
    if (value && typeof value === 'object' && value.status) container.append(claim(value));
    else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'object') {
          const nested = el('div', undefined, 'sub-record');
          if (item.label || item.id) nested.append(el('h4', item.label || item.id));
          nested.append(objectFields(item));
          container.append(nested);
        }
        else container.append(el('div', key.endsWith('Refs') ? name(item) : String(item), 'detail-value'));
      }
      if (!value.length) container.append(el('div', 'None recorded', 'detail-value'));
    } else if (value && typeof value === 'object') container.append(objectFields(value));
    else if ((key.endsWith('Ref') || ['from', 'to'].includes(key)) && index.has(value)) {
      const button = el('button', name(value), 'source-ref');
      button.addEventListener('click', () => show(value));
      container.append(button);
    } else container.append(el('div', String(value), 'detail-value'));
    return container;
  }

  function sourceButtons(refs) {
    const container = el('div');
    for (const ref of refs ?? []) {
      const button = el('button', ref, 'source-ref');
      button.addEventListener('click', () => show(ref));
      container.append(button);
    }
    return container;
  }

  function claim(value) {
    const container = el('div', undefined, 'claim');
    container.append(el('span', value.status, `status-pill ${value.status}`));
    if (Object.hasOwn(value, 'value')) container.append(el('div', Array.isArray(value.value) ? value.value.map(name).join(' + ') : typeof value.value === 'string' && index.has(value.value) ? name(value.value) : String(value.value), 'detail-value'));
    if (value.reason) container.append(el('div', value.reason, 'detail-value'));
    if (value.basis) {
      container.append(el('div', value.basis.explanation, 'claim-basis'));
      container.append(sourceButtons(value.basis.sourceRefs));
    }
    if (value.sourceRefs) container.append(sourceButtons(value.sourceRefs));
    for (const alternative of value.alternatives ?? []) container.append(claim(alternative));
    return container;
  }

  function objectFields(record) {
    const container = el('div');
    for (const [key, value] of Object.entries(record)) {
      if (['id', 'label'].includes(key)) continue;
      container.append(field(key, value));
    }
    return container;
  }

  function displayRecord(ref) {
    if (inspector.hidden || !inspector.contains(document.activeElement)) previousFocus = document.activeElement;
    content.replaceChildren();
    const record = ref === '__model' ? model : index.get(ref)?.record;
    if (!record) return;
    content.append(el('h2', ref === '__model' ? 'Model & scope' : name(ref)));
    content.append(el('div', ref === '__model' ? `${model.schemaVersion} · ${model.id}` : ref, 'record-id'));
    const attached = documents.filter((doc) => doc.attachments.some((target) => ref === '__model' ? target.kind === 'graph' && target.ref === activeGraph.id : target.ref === ref && ['node', 'edge'].includes(target.kind) && (!target.graphRef || target.graphRef === activeGraph.id)));
    if (attached.length) {
      const section = el('section', undefined, 'attached-documents');
      section.append(el('h3', 'Documents'));
      for (const doc of attached) {
        const link = el('a', `${doc.title} ↗`, 'document-link');
        link.href = `#document=${encodeURIComponent(doc.id)}`; section.append(link);
      }
      content.append(section);
    }
    for (const child of graphs.filter((graph) => graph.expands?.graphRef === activeGraph.id && graph.expands.nodeRef === ref)) {
      const section = el('section', undefined, 'attached-documents');
      const link = el('a', `Explore ${child.title} →`, 'document-link'); link.href = `#graph=${child.id}`;
      section.append(link, claim(child.expands.meaning)); content.append(section);
    }
    for (const graph of graphs.filter((item) => item.expands?.graphRef === activeGraph.id)) {
      const boundary = graph.expands.boundaries.find((item) => item.relationshipRef === ref);
      if (!boundary) continue;
      const section = el('section', undefined, 'attached-documents');
      const mappingLink = el('a', `Highlight correspondence in ${graph.title} →`, 'document-link');
      mappingLink.href = `#graph=${graph.id}&boundary=${ref}`;
      section.append(el('h3', 'Detailed correspondence'), mappingLink, claim(boundary.detail)); content.append(section);
    }
    if (ref === '__model') {
      content.append(field('graph', activeGraph));
      content.append(field('modelScope', model.scope));
      content.append(field('perspectives', model.perspectives));
      content.append(field('sources', model.sources));
      const catalog = el('section', undefined, 'detail-section');
      catalog.append(el('h3', 'All model records'));
      for (const collection of ['entities', 'groups', 'memberships', 'relationships', 'notes', 'documents']) {
        const row = el('div', undefined, 'detail-field');
        row.append(el('span', collection, 'detail-key'));
        for (const item of model[collection] ?? []) {
          const button = el('button', name(item.id), 'source-ref');
          button.addEventListener('click', () => show(item.id));
          row.append(button);
        }
        catalog.append(row);
      }
      content.append(catalog);
    } else {
      content.append(objectFields(record));
      const memberships = model.memberships.filter((item) => activeGraph.membershipRefs.includes(item.id) && (item.memberRef === ref || item.group.value === ref || item.group.alternatives?.some((alternative) => alternative.value === ref)));
      const notes = model.notes.filter((item) => item.subjectRefs.includes(ref));
      for (const [heading, records] of [['Membership and perspective', memberships], ['Related knowledge', notes]]) {
        if (!records.length) continue;
        const section = el('section', undefined, 'detail-section');
        section.append(el('h3', heading));
        for (const item of records) {
          const part = el('div', undefined, 'sub-record');
          part.append(el('h4', item.statement || name(item.perspectiveRef)));
          part.append(objectFields(item));
          section.append(part);
        }
        content.append(section);
      }
    }
    const raw = el('details');
    raw.append(el('summary', 'Exact JSON record'), el('pre', JSON.stringify(record, null, 2)));
    content.append(raw);
    inspector.hidden = false;
    inspector.scrollTop = 0;
    document.querySelectorAll('[data-ref]').forEach((element) => element.classList.toggle('selected', element.dataset.ref === ref));
    selectedRef = ref; refreshHighlights();
    document.getElementById('close-inspector').focus();
  }

  function hideInspector() {
    inspector.hidden = true;
    selectedRef = null; refreshHighlights();
    document.querySelectorAll('[data-ref]').forEach((element) => element.classList.remove('selected'));
    if (previousFocus?.isConnected) previousFocus.focus();
  }
  function targetHash(target) {
    const params = new URLSearchParams();
    if (target.kind === 'document') params.set('document', target.ref);
    else {
      if (target.kind === 'graph') params.set('graph', target.ref);
      else {
        const candidates = locations(target.kind, target.ref);
        if (!candidates.length && !target.graphRef) return `#graph=${activeGraph.id}&record=${encodeURIComponent(target.ref)}`;
        const graphRef = target.graphRef ?? (candidates.some((graph) => graph.id === activeGraph.id) ? activeGraph.id : candidates.length === 1 ? candidates[0].id : undefined);
        if (graphRef) params.set('graph', graphRef);
      }
      if (target.kind !== 'graph') params.set(target.kind, target.ref);
    }
    return `#${params}`;
  }
  function navigate(hash) {
    if (location.hash === hash || (!location.hash && hash === '#')) applyRoute();
    else location.hash = hash;
  }
  function show(ref) {
    const collection = index.get(ref)?.collection;
    const kind = { documents: 'document', entities: 'node', relationships: 'edge', graphs: 'graph' }[collection];
    navigate(kind ? targetHash({ kind, ref }) : `#graph=${activeGraph.id}&record=${encodeURIComponent(ref)}`);
  }
  function close() { navigate(`#graph=${activeGraph.id}`); }
  const reader = document.getElementById('document-reader');
  const documentContent = document.getElementById('document-content');
  const diagramMain = document.getElementById('diagram-main');
  const documentNav = document.getElementById('document-nav');
  documentNav.append(el('div', 'DOCUMENTS', 'detail-key'));
  for (const doc of documents) {
    const link = el('a', doc.title, 'document-nav-link');
    link.href = targetHash({ kind: 'document', ref: doc.id });
    link.dataset.document = doc.id; documentNav.append(link);
  }
  function documentScreen(doc, heading) {
    document.title = `${doc?.title ?? 'Documents'} · ${model.title} · Waxwing`;
    hideInspector(); diagramMain.hidden = true; reader.hidden = false;
    documentContent.replaceChildren();
    documentNav.querySelectorAll('a').forEach((link) => {
      if (link.dataset.document === doc?.id) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (!doc) {
      documentContent.append(el('div', 'REFERENCE LIBRARY', 'eyebrow'), el('h1', 'Documents'));
      documentContent.append(el('p', 'Detailed explanations attached to this graph and its components.', 'purpose'));
      for (const item of documents) {
        const link = el('a', item.title, 'document-card'); link.href = targetHash({ kind: 'document', ref: item.id });
        const subjects = item.attachments.map((target) => target.kind === 'graph' ? graphs.find((graph) => graph.id === target.ref)?.title : name(target.ref));
        link.append(el('span', subjects.join(' · ') || 'Included document')); documentContent.append(link);
      }
      if (!documents.length) documentContent.append(el('p', 'No documents included.'));
    } else {
      documentContent.append(el('div', 'DOCUMENT', 'eyebrow'), el('h1', doc.title));
      const attachments = el('div', undefined, 'document-attachments');
      for (const target of doc.attachments) {
        const link = el('a', `${target.kind} · ${target.kind === 'graph' ? graphs.find((graph) => graph.id === target.ref)?.title : name(target.ref)}`);
        link.href = targetHash(target); attachments.append(link);
      }
      documentContent.append(attachments);
      documentContent.append(document.getElementById(`ww-document-${doc.id}`).content.cloneNode(true));
      const raw = el('details', undefined, 'document-source');
      raw.append(el('summary', 'Original Markdown'), el('pre', doc.markdown));
      const button = el('button', 'Download .md');
      button.addEventListener('click', () => download(doc.markdown, `${doc.id}.md`, 'text/markdown;charset=utf-8'));
      raw.append(button); documentContent.append(raw);
      if (heading !== undefined) {
        const destination = document.getElementById(`ww-doc-${doc.id}--${heading}`);
        if (!destination) { unavailable('The requested document heading does not exist.'); return; }
        destination.scrollIntoView({ block: 'start' });
      }
    }
    if (heading === undefined) window.scrollTo(0, 0);
  }
  function unavailable(message) {
    document.title = 'Link unavailable · Waxwing';
    hideInspector(); diagramMain.hidden = true; reader.hidden = false;
    documentContent.replaceChildren(el('h1', 'Link unavailable'), el('p', message));
    const link = el('a', 'Return to graph'); link.href = '#'; documentContent.append(link);
  }
  function applyRoute() {
    const hash = location.hash.slice(1);
    if (hash === 'documents') { documentScreen(); return; }
    const params = new URLSearchParams(hash), keys = [...params.keys()];
    if (new Set(keys).size !== keys.length || keys.some((key) => !['document', 'heading', 'graph', 'node', 'edge', 'record', 'boundary'].includes(key))) { unavailable('This link uses an unsupported or ambiguous target.'); return; }
    if (params.has('document')) {
      if (keys.some((key) => !['document', 'heading'].includes(key))) { unavailable('This link names conflicting destinations.'); return; }
      const doc = documents.find((item) => item.id === params.get('document'));
      if (!doc) { unavailable('The requested document is not included in this export.'); return; }
      documentScreen(doc, params.has('heading') ? params.get('heading') : undefined); return;
    }
    if (params.has('heading') || ['node', 'edge', 'record', 'boundary'].filter((key) => params.has(key)).length > 1 || (params.has('graph') && !graphs.some((graph) => graph.id === params.get('graph')))) { unavailable('The requested graph or record is not available.'); return; }
    const requestedKind = ['node', 'edge'].find((kind) => params.has(kind));
    let graphRef = params.get('graph') ?? root;
    if (requestedKind) {
      const candidates = locations(requestedKind, params.get(requestedKind));
      if (!params.has('graph')) {
        if (candidates.length === 1) graphRef = candidates[0].id;
        else if (candidates.length > 1) { graphChoice(requestedKind, params.get(requestedKind), candidates); return; }
      }
      if (!candidates.some((graph) => graph.id === graphRef)) { unavailable('This record is not shown in the requested graph.'); return; }
    }
    const wasReading = !reader.hidden;
    reader.hidden = true; diagramMain.hidden = false;
    if (wasReading) { window.scrollTo(0, 0); if (fitted) fit(); }
    currentBoundary = null;
    switchGraph(graphRef);
    document.title = `${activeGraph.title} · Waxwing`;
    if (params.has('boundary')) {
      const ref = params.get('boundary');
      if (!activeGraph.expands?.boundaries.some((item) => item.relationshipRef === ref)) { unavailable('This correspondence is not recorded in the requested graph.'); return; }
      currentBoundary = ref; highlightMode.value = 'selection'; hideInspector(); refreshHighlights(); return;
    }
    const key = ['node', 'edge', 'record'].find((key) => params.has(key));
    if (!key) { hideInspector(); return; }
    const ref = params.get(key), entry = index.get(ref);
    if ((key === 'node' && entry?.collection !== 'entities') || (key === 'edge' && entry?.collection !== 'relationships') || (key === 'record' && ref !== '__model' && (!entry || entry.collection === 'documents'))) { unavailable('The requested record does not exist or has a different type.'); return; }
    displayRecord(ref);
  }
  window.addEventListener('hashchange', applyRoute);
  document.getElementById('close-inspector').addEventListener('click', close);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !inspector.hidden) close(); });
  document.getElementById('model-details').addEventListener('click', () => show('__model'));
  document.querySelector('.brand').addEventListener('click', (event) => { event.preventDefault(); navigate(`#graph=${root}`); fit(); });
  viewport.addEventListener('click', (event) => { const record = event.target.closest('[data-ref]'); if (record) show(record.dataset.ref); });
  viewport.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const record = event.target.closest('[data-ref]');
    if (record) { event.preventDefault(); show(record.dataset.ref); }
  });

  function graphChoice(kind, ref, candidates) {
    hideInspector(); diagramMain.hidden = true; reader.hidden = false;
    documentContent.replaceChildren(el('h1', `Choose a graph for ${name(ref)}`));
    for (const graph of candidates) {
      const link = el('a', graph.title, 'document-card'); link.href = targetHash({ kind, ref, graphRef: graph.id }); documentContent.append(link);
    }
  }
  function graphLink(graph, text = graph.title) {
    const link = el('a', text, 'document-link'); link.href = `#graph=${graph.id}`; return link;
  }
  function switchGraph(ref) {
    if (activeGraph.id !== ref) {
      activeGraph = graphs.find((graph) => graph.id === ref);
      drawing = layout.graphs.find((item) => item.ref === ref);
      viewport.replaceChildren(document.getElementById(`ww-graph-${ref}`).content.cloneNode(true));
      svg = viewport.querySelector('svg'); svg.prepend(sourceMetadata.cloneNode(true));
      svg.dataset.theme = document.body.classList.contains('dark') ? 'dark' : 'light';
      svg.dataset.skin = document.body.dataset.skin;
      fitted = true; fit(); window.scrollTo(0, 0);
    }
    document.getElementById('graph-title').textContent = activeGraph.title;
    document.getElementById('graph-question').textContent = activeGraph.scope.question;
    document.getElementById('graph-abstraction').textContent = activeGraph.scope.abstraction;
    const scope = document.getElementById('graph-scope');
    scope.replaceChildren(...[activeGraph.scope.environment, activeGraph.scope.snapshot,
      `${activeGraph.entityRefs.length} components · ${activeGraph.contextRefs.length} external context · ${activeGraph.relationshipRefs.length} relationships`].map((text) => el('span', text)));
    const breadcrumb = document.getElementById('graph-breadcrumb'); breadcrumb.replaceChildren();
    const ancestors = []; let ancestor = activeGraph;
    while (ancestor) { ancestors.unshift(ancestor); ancestor = graphs.find((item) => item.id === ancestor.expands?.graphRef); }
    for (const graph of ancestors) {
      if (breadcrumb.childNodes.length) breadcrumb.append(el('span', ' / '));
      const link = graphLink(graph); if (graph.id === ref) link.setAttribute('aria-current', 'page'); breadcrumb.append(link);
    }
    const connections = document.getElementById('graph-connections'); connections.replaceChildren();
    for (const child of graphs.filter((graph) => graph.expands?.graphRef === ref)) {
      const row = el('div', undefined, 'graph-child');
      row.append(graphLink(child, `${name(child.expands.nodeRef)} → ${child.title}`), el('span', child.expands.meaning.status, `status-pill ${child.expands.meaning.status}`)); connections.append(row);
    }
    if (activeGraph.expands) {
      const expansion = activeGraph.expands;
      connections.append(el('h2', `How this graph expands ${name(expansion.nodeRef)}`), claim(expansion.meaning));
      connections.append(el('p', 'Boundary mappings are recorded claims. Unknown mappings do not generate connections.'));
      for (const boundary of expansion.boundaries) {
        const row = el('div', undefined, 'boundary-row');
        const link = el('a', name(boundary.relationshipRef), 'document-link');
        link.href = targetHash({ kind: 'edge', ref: boundary.relationshipRef, graphRef: expansion.graphRef });
        const highlight = el('a', 'Highlight correspondence', 'source-ref'); highlight.href = `#graph=${ref}&boundary=${boundary.relationshipRef}`;
        row.append(link, highlight, claim(boundary.detail));
        const claims = boundary.detail.status === 'unknown' ? [] : boundary.detail.status === 'disputed' ? boundary.detail.alternatives : [boundary.detail];
        for (const candidate of claims) for (const edge of candidate.value) {
          const detail = el('a', `Inspect ${name(edge)} ↗`, 'source-ref'); detail.href = targetHash({ kind: 'edge', ref: edge, graphRef: ref }); row.append(detail);
        }
        connections.append(row);
      }
    }
    const documentBack = document.querySelector('.document-breadcrumb a');
    documentBack.href = `#graph=${ref}`; documentBack.textContent = `← ${activeGraph.title}`;
    document.getElementById('perspective-label').textContent = drawing.layout.groupingPerspectiveRef ? `Grouping: ${name(drawing.layout.groupingPerspectiveRef)}` : 'No grouping perspective selected';
    refreshKnowledge();
    refreshHighlights();
    refreshReadability();
  }
  function refreshKnowledge() {
    const open = [];
    function collect(value, owner, path) {
      if (!value || typeof value !== 'object') return;
      if (['unknown', 'disputed'].includes(value.status)) open.push({ owner, path, ...value });
      for (const [key, child] of Object.entries(value)) collect(child, owner, path ? `${path}.${key}` : key);
    }
    const visible = new Set([...graphNodes(activeGraph), ...activeGraph.relationshipRefs, ...activeGraph.membershipRefs, ...drawing.groups.map((group) => group.ref)]);
    for (const collection of ['entities', 'groups', 'memberships', 'relationships', 'notes']) {
      for (const record of model[collection]) if (visible.has(record.id) || record.subjectRefs?.some((ref) => visible.has(ref))) collect(record, record, '');
    }
    if (activeGraph.expands) collect(activeGraph.expands, activeGraph, 'expands');
    const list = document.getElementById('knowledge-list'); list.replaceChildren();
    for (const item of open.sort((a, b) => (a.status === 'disputed' ? 0 : 1) - (b.status === 'disputed' ? 0 : 1))) {
      const button = el('button', undefined, 'knowledge-row');
      const description = (item.owner.id === activeGraph.id && item.path.startsWith('expands.boundaries.') ? `${name(activeGraph.expands.boundaries[Number(item.path.split('.')[2])].relationshipRef)} · correspondence between levels` : undefined) || item.owner.statement || (item.owner.memberRef ? `${name(item.owner.memberRef)} · ${name(item.owner.perspectiveRef)}` : `${name(item.owner.id)} · ${humanize(item.path)}`);
      button.append(el('span', item.status, `status-pill ${item.status}`), el('span', description, 'question'), el('span', '↗', 'row-arrow'));
      button.addEventListener('click', () => item.owner.id === activeGraph.id ? navigate(`#graph=${activeGraph.id}&record=${activeGraph.id}`) : show(item.owner.id)); list.append(button);
    }
    if (!open.length) list.append(el('p', 'No explicit unknowns or disputes recorded. Partial scope still applies.'));
    document.getElementById('knowledge-count').textContent = `${open.filter((item) => item.status === 'unknown').length} unknown · ${open.filter((item) => item.status === 'disputed').length} disputed`;
  }

  function refreshHighlights() {
    const result = selectHighlights(model, activeGraph, { mode: highlightMode.value, ref: selectedRef, boundaryRef: currentBoundary });
    const refs = new Set(result.refs);
    svg.querySelectorAll('[data-ref]').forEach((item) => item.classList.toggle('highlight-match', refs.has(item.dataset.ref)));
    const details = document.getElementById('highlight-details'); details.replaceChildren();
    const summary = document.getElementById('highlight-summary');
    const count = new Set([...svg.querySelectorAll('.highlight-match')].map((item) => item.dataset.ref)).size;
    summary.textContent = `${count} visible ${count === 1 ? 'record' : 'records'} highlighted. Other records remain visible.`;
    if (highlightMode.value === 'selection' && !selectedRef && !currentBoundary) summary.textContent = 'Select a record to highlight its direct relationships. No execution order is implied.';
    if (result.boundary) {
      const detail = result.boundary.detail;
      details.append(el('strong', `Correspondence: ${name(currentBoundary)}`));
      details.append(el('p', detail.status === 'unknown' ? 'Unknown internal correspondence. Only recorded external context is highlighted; no internal edge is invented.' : detail.status === 'disputed' ? 'All recorded alternatives are highlighted. No winner is selected.' : 'Highlighted edges are the recorded correspondence, not an inferred execution path.'));
      details.append(claim(detail));
      if (activeGraph.expands.meaning.status !== 'established') details.append(el('p', 'The meaning of this expansion is also qualified.'), claim(activeGraph.expands.meaning));
      const parent = el('a', 'Inspect overview relationship ↗', 'document-link');
      parent.href = targetHash({ kind: 'edge', ref: currentBoundary, graphRef: activeGraph.expands.graphRef }); details.append(parent);
    }
    for (const finding of result.findings) {
      const link = el('a', `${name(finding.ref)} · ${finding.reason}`, 'document-link');
      link.href = finding.kind === 'boundary' ? `#graph=${finding.graphRef ?? activeGraph.id}&boundary=${finding.ref}` : finding.kind === 'record' ? `#graph=${activeGraph.id}&record=${finding.ref}` : targetHash({ kind: finding.kind, ref: finding.ref, graphRef: activeGraph.id });
      details.append(link);
    }
    if (['unknown', 'disputed', 'qualified'].includes(highlightMode.value) && !result.findings.length) details.append(el('p', 'No matching recorded claims in this graph. This does not establish completeness or certainty.'));
  }
  highlightMode.addEventListener('change', () => {
    if (currentBoundary) { currentBoundary = null; navigate(`#graph=${activeGraph.id}`); }
    else refreshHighlights();
  });
  document.getElementById('highlight-clear').addEventListener('click', () => {
    highlightMode.value = 'selection'; currentBoundary = null; selectedRef = null; navigate(`#graph=${activeGraph.id}`);
  });
  function refreshReadability() {
    if (!viewport.clientWidth || !viewport.clientHeight) return;
    const warnings = inspectReadability(drawing, activeGraph.id, { width: viewport.clientWidth, height: viewport.clientHeight });
    document.getElementById('readability-summary').textContent = `Readability · ${warnings.length} ${warnings.length === 1 ? 'warning' : 'warnings'}`;
    const list = document.getElementById('readability-list'); list.replaceChildren();
    if (!warnings.length) list.append(el('p', 'No issues detected by these advisory checks.'));
    for (const warning of warnings) {
      const row = el('div', undefined, 'readability-row'); row.append(el('p', warning.message));
      for (const ref of warning.refs) { const button = el('button', name(ref), 'source-ref'); button.addEventListener('click', () => show(ref)); row.append(button); }
      if (warning.code === 'readability/small-text') row.append(el('p', `Estimated smallest node text: ${warning.measurement.projectedTextPx.toFixed(1)}px at Fit; 10px at 100%.`, 'purpose'));
      list.append(row);
    }
  }
  document.getElementById('skin').addEventListener('change', (event) => {
    document.body.dataset.skin = event.target.value; svg.dataset.skin = event.target.value;
  });

  function applyZoom() {
    svg.style.width = `${drawing.canvas.width * zoom}px`;
    svg.style.height = `${drawing.canvas.height * zoom}px`;
    svg.style.marginLeft = `${Math.max(0, (viewport.clientWidth - drawing.canvas.width * zoom) / 2)}px`;
    svg.style.marginTop = `${Math.max(0, (viewport.clientHeight - drawing.canvas.height * zoom) / 2)}px`;
    document.getElementById('zoom-label').textContent = `${Math.round(zoom * 100)}%`;
  }
  function fit() { fitted = true; zoom = Math.min(viewport.clientWidth / drawing.canvas.width, viewport.clientHeight / drawing.canvas.height, 1.3); applyZoom(); viewport.scrollTo(0, 0); }
  function changeZoom(factor) { fitted = false; zoom = Math.max(.15, Math.min(3, zoom * factor)); applyZoom(); }
  document.getElementById('zoom-fit').addEventListener('click', fit);
  document.getElementById('zoom-read').addEventListener('click', () => { fitted = false; zoom = 1; applyZoom(); });
  document.getElementById('zoom-in').addEventListener('click', () => changeZoom(1.25));
  document.getElementById('zoom-out').addEventListener('click', () => changeZoom(.8));
  new ResizeObserver(() => { if (fitted) fit(); else applyZoom(); refreshReadability(); }).observe(viewport);
  fit();

  document.getElementById('theme').addEventListener('click', () => {
    const dark = document.body.classList.toggle('dark');
    svg.dataset.theme = dark ? 'dark' : 'light';
    document.getElementById('theme').textContent = dark ? 'Light theme' : 'Dark theme';
  });
  function download(contents, filename, type) {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const link = el('a'); link.href = url; link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    setTimeout(() => { link.remove(); URL.revokeObjectURL(url); }, 1000);
  }
  document.getElementById('source-download').addEventListener('click', () => download(JSON.stringify(model, null, 2) + '\n', `${model.id}.model.json`, 'application/json'));
  document.getElementById('layout-download').addEventListener('click', () => download(JSON.stringify(layout, null, 2) + '\n', `${model.id}.layout.json`, 'application/json'));
  document.getElementById('svg-download').addEventListener('click', () => {
    const clean = cleanViewerSVG(svg);
    download('<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clean), `${activeGraph.id}.svg`, 'image/svg+xml');
  });
  applyRoute();
})();
