(() => {
  'use strict';
  const layout = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(document.getElementById('waxwing-source').textContent), (c) => c.charCodeAt(0))));
  const model = layout.model, svg = document.querySelector('.ww-svg');
  const viewport = document.getElementById('map-viewport'), inspector = document.getElementById('inspector'), content = document.getElementById('inspector-content');
  const main = document.getElementById('diagram-main'), reader = document.getElementById('document-reader'), docContent = document.getElementById('document-content');
  const records = new Map(['participants', 'steps', 'sources', 'notes', 'documents'].flatMap((kind) => model[kind].map((record) => [record.id, { kind, record }])));
  const name = (id) => records.get(id)?.record.label ?? records.get(id)?.record.title ?? records.get(id)?.record.statement ?? id;
  let previousFocus;
  const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
  function link(label, href) { const a = el('a', label, 'document-link'); a.href = href; return a; }
  function recordURL(id) {
    const kind = records.get(id)?.kind;
    return kind === 'documents' ? `#document=${id}` : `#graph=${model.id}&${kind === 'participants' ? 'node' : kind === 'steps' ? 'edge' : 'record'}=${id}`;
  }
  function reference(id) { return link(name(id), recordURL(id)); }
  function claim(value) {
    const box = el('div', undefined, 'claim'); box.append(el('span', value.status, `status-pill ${value.status}`));
    if (Object.hasOwn(value, 'value')) {
      if (Array.isArray(value.value)) { const list = el('ol'); for (const id of value.value) { const item = el('li'); item.append(reference(id)); list.append(item); } box.append(list); }
      else box.append(el('p', String(value.value)));
    }
    if (value.reason) box.append(el('p', value.reason));
    if (value.basis) box.append(el('p', value.basis.explanation, 'claim-basis'));
    for (const id of value.basis?.sourceRefs ?? value.sourceRefs ?? []) box.append(reference(id));
    for (const alternative of value.alternatives ?? []) box.append(claim(alternative));
    return box;
  }
  function fields(record) {
    const container = el('div');
    for (const [key, value] of Object.entries(record)) {
      if (['id', 'label', 'title', 'documents', 'assets'].includes(key)) continue;
      const field = el('div', undefined, 'detail-field'); field.append(el('span', key.replace(/([a-z])([A-Z])/g, '$1 $2'), 'detail-key'));
      if (value?.status) field.append(claim(value));
      else if (Array.isArray(value)) for (const item of value) {
        if (item?.id && records.has(item.id)) field.append(reference(item.id));
        else if (typeof item === 'string' && key.endsWith('Refs')) field.append(reference(item));
        else field.append(typeof item === 'object' ? fields(item) : el('div', String(item)));
      }
      else if (value && typeof value === 'object') field.append(fields(value));
      else if (['from', 'to', 'replyTo'].includes(key)) field.append(reference(value));
      else field.append(el('div', String(value)));
      container.append(field);
    }
    return container;
  }
  function show(id) {
    const record = id === '__model' ? model : id === '__order' ? { order: model.order } : records.get(id)?.record;
    if (!record) return unavailable('The requested record does not exist.');
    if (!inspector.contains(document.activeElement)) previousFocus = document.activeElement;
    content.replaceChildren(el('h2', id === '__model' ? 'Model & scope' : id === '__order' ? 'Recorded scenario order' : name(id)), fields(record));
    if (records.get(id)?.kind === 'steps') content.prepend(el('p', `Step ${model.order.value.indexOf(id) + 1} of ${model.order.value.length}`, 'record-id'));
    for (const doc of model.documents.filter((d) => d.attachments.some((a) => a.ref === (id === '__model' ? model.id : id)))) content.append(reference(doc.id));
    for (const note of model.notes.filter((n) => n.subjectRefs.includes(id))) content.append(reference(note.id));
    svg.querySelectorAll('[data-ref]').forEach((item) => item.classList.toggle('selected', item.dataset.ref === id));
    inspector.hidden = false;
    document.getElementById('close-inspector').focus();
  }
  function close() {
    const wasOpen = !inspector.hidden; inspector.hidden = true;
    svg.querySelectorAll('.selected').forEach((item) => item.classList.remove('selected'));
    if (wasOpen && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function docScreen(id, heading) {
    main.hidden = true; reader.hidden = false; close();
    docContent.replaceChildren();
    const doc = model.documents.find((d) => d.id === id);
    if (id && !doc) { docContent.append(el('h1', 'Reference unavailable'), el('p', 'The requested document does not exist.')); return; }
    document.title = `${doc?.title ?? 'Documents'} · Waxwing`;
    if (!doc) {
      docContent.append(el('h1', 'Documents'));
      for (const d of model.documents) docContent.append(reference(d.id));
      if (!model.documents.length) docContent.append(el('p', 'No documents included.'));
      return;
    }
    const article = document.getElementById(`ww-document-${doc.id}`).content.cloneNode(true);
    if (article.querySelector('h1')?.textContent.trim() !== doc.title.trim()) docContent.append(el('h1', doc.title));
    const attachments = el('div', undefined, 'document-attachments');
    for (const a of doc.attachments) attachments.append(a.kind === 'graph' ? link(model.title, `#graph=${model.id}`) : reference(a.ref));
    docContent.append(attachments, article);
    if (heading !== undefined) {
      const target = document.getElementById(`ww-doc-${doc.id}--${heading}`);
      if (!target || !docContent.contains(target)) { unavailable('The requested document heading does not exist.'); return; }
      target.scrollIntoView();
    }
  }
  function unavailable(message) { close(); main.hidden = true; reader.hidden = false; docContent.replaceChildren(el('h1', 'Reference unavailable'), el('p', message), link('Return to sequence', '#')); }
  function route() {
    const hash = location.hash.slice(1); close();
    if (hash === 'documents') { docScreen(); return; }
    const params = new URLSearchParams(hash), keys = [...params.keys()];
    if (new Set(keys).size !== keys.length || keys.some((key) => !['graph', 'node', 'edge', 'record', 'document', 'heading'].includes(key))) return unavailable('Invalid sequence reference.');
    if (params.has('document')) {
      if (keys.some((key) => !['document', 'heading'].includes(key))) return unavailable('Ambiguous document reference.');
      docScreen(params.get('document'), params.has('heading') ? params.get('heading') : undefined); return;
    }
    if (params.has('heading') || (params.has('graph') && params.get('graph') !== model.id) || ['node', 'edge', 'record'].filter((key) => params.has(key)).length > 1) return unavailable('Invalid or ambiguous sequence reference.');
    main.hidden = false; reader.hidden = true; document.title = `${model.title} · Waxwing`; applyZoom();
    const key = ['node', 'edge', 'record'].find((key) => params.has(key));
    if (!key) return;
    const id = params.get(key), kind = records.get(id)?.kind;
    if ((key === 'node' && kind !== 'participants') || (key === 'edge' && kind !== 'steps') || (key === 'record' && !kind && !['__model','__order'].includes(id)) || kind === 'documents') return unavailable('The requested reference has the wrong type or does not exist.');
    show(id);
  }
  const navigate = (url) => { if (location.hash === url || (!location.hash && url === '#')) route(); else location.hash = url; };
  for (const doc of model.documents) document.getElementById('document-nav').append(reference(doc.id));
  for (const note of model.notes) {
    const row = el('div', undefined, 'readability-row'); row.append(reference(note.id), claim(note.answer)); document.getElementById('sequence-notes').append(row);
  }
  if (!model.notes.length) document.getElementById('sequence-notes').append(el('p', 'No notes recorded. Partial scope still applies.'));
  svg.addEventListener('click', (event) => { const record = event.target.closest('[data-ref]'); if (record) navigate(recordURL(record.dataset.ref)); });
  svg.addEventListener('keydown', (event) => { if (['Enter', ' '].includes(event.key) && event.target.dataset.ref) { event.preventDefault(); navigate(recordURL(event.target.dataset.ref)); } });
  document.getElementById('close-inspector').addEventListener('click', () => navigate(`#graph=${model.id}`));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !inspector.hidden) navigate(`#graph=${model.id}`); });
  document.getElementById('model-details').addEventListener('click', () => navigate(`#graph=${model.id}&record=__model`));
  document.getElementById('order-details').addEventListener('click', () => navigate(`#graph=${model.id}&record=__order`));
  document.getElementById('theme').addEventListener('click', (event) => {
    const dark = document.body.classList.toggle('dark'); svg.dataset.theme = dark ? 'dark' : 'light'; event.target.textContent = dark ? 'Light theme' : 'Dark theme';
  });
  document.getElementById('skin').addEventListener('change', (event) => { document.body.dataset.skin = event.target.value; svg.dataset.skin = event.target.value; });
  let zoom = 1, fitted = true;
  function applyZoom() {
    if (fitted && viewport.clientWidth) zoom = Math.min(1, viewport.clientWidth / layout.canvas.width);
    svg.style.width = `${layout.canvas.width * zoom}px`; svg.style.height = `${layout.canvas.height * zoom}px`;
    document.getElementById('zoom-label').textContent = `${Math.round(zoom * 100)}%`;
  }
  document.getElementById('zoom-fit').addEventListener('click', () => { fitted = true; applyZoom(); });
  document.getElementById('zoom-read').addEventListener('click', () => { fitted = false; zoom = 1; applyZoom(); });
  for (const [id, factor] of [['zoom-in', 1.25], ['zoom-out', .8]]) document.getElementById(id).addEventListener('click', () => { fitted = false; zoom = Math.max(.15, Math.min(3, zoom * factor)); applyZoom(); });
  new ResizeObserver(applyZoom).observe(viewport);
  function download(filename, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  document.getElementById('source-download').addEventListener('click', () => download(`${model.id}.model.json`, JSON.stringify(model, null, 2), 'application/json'));
  document.getElementById('layout-download').addEventListener('click', () => download(`${model.id}.layout.json`, JSON.stringify(layout, null, 2), 'application/json'));
  document.getElementById('svg-download').addEventListener('click', () => download(`${model.id}.svg`, new XMLSerializer().serializeToString(cleanViewerSVG(svg)), 'image/svg+xml'));
  window.addEventListener('hashchange', route); route();
})();
