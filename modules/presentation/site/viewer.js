(() => {
  const $ = (id) => document.getElementById(id);
  const svg = document.querySelector('#map-viewport svg');
  const records = [...document.querySelectorAll('.record-detail')];
  const viewport = $('map-viewport');
  let zoom = 1, lastFocus, selectedRecord, restoreFit = false;
  const architecture = svg && !svg.classList.contains('workflow-svg') && !svg.classList.contains('sequence-svg');
  let fitted = false;
  const width = svg ? Number(svg.getAttribute('width')) : 0;
  const height = svg ? Number(svg.getAttribute('height')) : 0;
  const saveView=()=>{
    if(!svg)return;
    try {history.replaceState({...history.state,wwView:{zoom,fitted,left:viewport.scrollLeft,top:viewport.scrollTop,highlight:$('highlight').value}},'');} catch { /* Optional view memory under restrictive local-file policies. */ }
  };
  const restoreView=()=>{
    const state=history.state?.wwView;if(!svg||!state)return;
    fitted=state.fitted;$('highlight').value=state.highlight;
    fitted?fit():scale(state.zoom);viewport.scrollTo(state.left,state.top);highlights();
  };
  addEventListener('pagehide',saveView);
  addEventListener('pageshow',()=>requestAnimationFrame(restoreView));
  function scale(value) {
    const centerX = (viewport.scrollLeft + viewport.clientWidth / 2 - parseFloat(svg.style.marginLeft || 0)) / zoom;
    const centerY = (viewport.scrollTop + viewport.clientHeight / 2 - parseFloat(svg.style.marginTop || 0)) / zoom;
    zoom = Math.max(0.05,Math.min(3,value));
    svg.style.width = `${width*zoom}px`; svg.style.height = `${height*zoom}px`;
    svg.style.marginLeft = `${Math.max(0,(viewport.clientWidth-width*zoom)/2)}px`;
    svg.style.marginTop = `${Math.max(0,(viewport.clientHeight-height*zoom)/2)}px`;
    $('zoom-label').textContent = `${Math.round(zoom*100)}%`;
    if($('overview-guide'))$('overview-guide').hidden=!fitted||zoom>=0.65;
    $('zoom-out').disabled = zoom <= 0.05;
    $('zoom-in').disabled = zoom >= 3;
    viewport.scrollTo(centerX * zoom + parseFloat(svg.style.marginLeft) - viewport.clientWidth / 2, centerY * zoom + parseFloat(svg.style.marginTop) - viewport.clientHeight / 2);
  }
  function fit() {
    scale(architecture ? Math.min((viewport.clientWidth-32)/width,(viewport.clientHeight-32)/height,1.15) : (viewport.clientWidth-24)/width);
    viewport.scrollTo(0,0);
  }
  function highlights() {
    if (!svg) return;
    const mode = $('highlight').value;
    const focus = JSON.parse(selectedRecord?.dataset.focusRefs || '[]');
    const claims = JSON.parse(viewport.dataset.claimHighlights || '{}');
    const matched = new Set(mode ? claims[mode] ? claims[mode].map(ref=>`record-${ref}`) : records.filter(r=>mode==='qualified' ? r.dataset.statuses : r.dataset.statuses.split(' ').includes(mode)).map(r=>r.id) : focus.map(ref=>`record-${ref}`));
    const visible = new Set();
    for(const item of svg.querySelectorAll('.record')) {
      const hit = matched.has(`record-${item.dataset.ref}`);
      item.classList.toggle('highlight-match',hit); if(hit)visible.add(item.dataset.ref);
    }
    setDiagramFocus(svg, focus);
    $('highlight-count').textContent = mode ? `${visible.size} visible records with ${mode} claims. Inspect scope & evidence for view-level qualifications.` : '';
  }
  function preferences() {
    if (svg) { svg.dataset.theme = document.body.classList.contains('dark') ? 'dark' : 'light'; svg.dataset.skin = $('skin').value; }
    document.body.dataset.skin = $('skin').value;
    $('theme').textContent = document.body.classList.contains('dark') ? 'Light theme' : 'Dark theme';
    try { localStorage.setItem('ww-site-theme',document.body.classList.contains('dark')?'dark':'light'); localStorage.setItem('ww-site-skin',$('skin').value); } catch { /* Optional preferences; file navigation does not depend on storage. */ }
  }
  try {
    document.body.classList.toggle('dark',localStorage.getItem('ww-site-theme')==='dark');
    const skin = localStorage.getItem('ww-site-skin'); if (['standard','engineering','editorial'].includes(skin)) $('skin').value = skin;
  } catch { /* Keep initial appearance. */ }
  $('theme').onclick = () => {document.body.classList.toggle('dark');preferences();};
  $('skin').onchange = preferences; preferences();
  function route() {
    $('navigation-error').hidden = true;
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = ''; }
    const record = records.find((r) => r.id===id);
    if (record && $('inspector').hidden && fitted && JSON.parse(record.dataset.focusRefs || '[]').length) {
      restoreFit=true; fitted=false; scale(Math.max(1,zoom));
    } else if (!record && restoreFit) {
      restoreFit=false; fitted=true;
      requestAnimationFrame(fit);
    }
    selectedRecord = record;
    $('inspector').hidden = !record;
    if (svg) for (const el of svg.querySelectorAll('.record')) el.classList.toggle('selected',record?.id===`record-${el.dataset.ref}`);
    highlights();
    if (record) {
      // All content was escaped/rendered at export time; no model strings enter innerHTML here.
      $('inspector-content').replaceChildren(record.querySelector('.record-body').cloneNode(true));
      $('close-inspector').focus({preventScroll:true});
      requestAnimationFrame(() => {
        if (!$('inspector').hidden && window.matchMedia('(min-width:901px)').matches) {
          const selected = lastFocus?.matches('.selected') ? lastFocus : svg?.querySelector('.selected');
          selected?.scrollIntoView({block:'nearest',inline:'nearest'});
        } else if (!$('inspector').hidden) {
          $('inspector').scrollIntoView({block:'start'});
        }
      });
    } else if (id && !$(id)) {
      $('navigation-error').textContent = 'This page has no target matching that link. Return to Contents to find the view.';
      $('navigation-error').hidden = false;
    }
  }
  $('close-inspector').onclick = () => {
    history.replaceState(history.state,'',location.pathname+location.search); route(); lastFocus?.focus({preventScroll:true});
  };
  document.addEventListener('keydown',(e) => {if(e.key==='Escape'&&!$('inspector').hidden)$('close-inspector').click();});
  if (svg) {
    // An architecture opens as a complete overview. A readable component index
    // accompanies small scales; selection opens at full size. Sequences scroll.
    fitted=architecture;
    fitted ? fit() : scale(1);
    $('highlight').onchange = highlights;
    $('zoom-out').onclick = () => { fitted=false; restoreFit=false; scale(zoom/1.25); };
    $('zoom-in').onclick = () => { fitted=false; restoreFit=false; scale(zoom*1.25); };
    $('zoom-read').onclick = () => { fitted=false; restoreFit=false; scale(1); };
    $('zoom-fit').onclick = () => { fitted=true; restoreFit=false; fit(); };
    new ResizeObserver(() => fitted ? fit() : scale(zoom)).observe(viewport);
    if ($('sequence-start')) $('sequence-start').onclick = () => {
      history.replaceState(null,'',location.pathname+location.search); route();
      fitted=false; restoreFit=false; scale(1); viewport.scrollTo(0,0);
      svg.querySelector('[data-sequence-entry="participant"]')?.focus({preventScroll:true});
      viewport.scrollIntoView({block:'nearest'});
    };
    function select(e) {
      const record = e.target.closest('.record'); if (!record) return;
      if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;
      e.preventDefault(); lastFocus = record;
      saveView();history.pushState(null,'',`#${encodeURIComponent(`record-${record.dataset.ref}`)}`); route();
    }
    svg.addEventListener('click',select); svg.addEventListener('keydown',select);
    for(const el of svg.querySelectorAll('.record')) el.setAttribute('aria-controls','inspector');
  }
  document.addEventListener('click',(e) => {
    const anyLink=e.target.closest('a');if(anyLink)saveView();
    const a = e.target.closest('a[href^="#record-"]'); if(!a)return;
    e.preventDefault(); lastFocus = a;
    if (a.id === 'reading-anchor-go' && svg) { fitted=false; restoreFit=false; scale(1); }
    history.pushState(null,'',a.getAttribute('href')); route();
  });
  addEventListener('hashchange',route); addEventListener('popstate',()=>{route();requestAnimationFrame(()=>requestAnimationFrame(restoreView));}); route();
  if($('catalog-search')) $('catalog-search').oninput = () => {
    const query = $('catalog-search').value.trim().toLowerCase();
    for(const card of document.querySelectorAll('#catalog .document-card')) card.hidden = !card.textContent.toLowerCase().includes(query);
  };
})();
