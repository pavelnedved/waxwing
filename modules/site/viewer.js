(() => {
  const $ = (id) => document.getElementById(id);
  const svg = document.querySelector('#map-viewport svg');
  const records = [...document.querySelectorAll('.record-detail')];
  const viewport = $('map-viewport');
  let zoom = 1, lastFocus;
  const width = svg ? Number(svg.getAttribute('width')) : 0;
  const height = svg ? Number(svg.getAttribute('height')) : 0;
  function scale(value) {
    zoom = Math.max(0.05,Math.min(3,value));
    svg.style.width = `${width*zoom}px`; svg.style.height = `${height*zoom}px`;
    $('zoom-label').textContent = `${Math.round(zoom*100)}%`;
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
    $('inspector').hidden = !record;
    if (svg) for (const el of svg.querySelectorAll('.record')) el.classList.toggle('selected',record?.id===`record-${el.dataset.ref}`);
    if (record) {
      // All content was escaped/rendered at export time; no model strings enter innerHTML here.
      $('inspector-content').replaceChildren(record.querySelector('.record-body').cloneNode(true));
      $('close-inspector').focus({preventScroll:true});
    } else if (id && !$(id)) {
      $('navigation-error').textContent = 'This page has no target matching that link. Return to Contents to find the view.';
      $('navigation-error').hidden = false;
    }
  }
  $('close-inspector').onclick = () => {
    history.replaceState(null,'',location.pathname+location.search); route(); lastFocus?.focus({preventScroll:true});
  };
  document.addEventListener('keydown',(e) => {if(e.key==='Escape'&&!$('inspector').hidden)$('close-inspector').click();});
  if (svg) {
    scale(1);
    $('highlight').onchange = () => {
      const mode = $('highlight').value, matched = new Set(records.filter(r=>mode==='qualified' ? r.dataset.statuses : r.dataset.statuses.split(' ').includes(mode)).map(r=>r.id));
      const visible = new Set();
      for(const el of svg.querySelectorAll('.record')) {
        const hit = !!mode&&matched.has(`record-${el.dataset.ref}`);
        el.classList.toggle('highlight-match',hit); if(hit)visible.add(el.dataset.ref);
      }
      $('highlight-count').textContent = mode ? `${visible.size} visible records with ${mode} claims. Inspect scope & evidence for view-level qualifications.` : '';
    };
    $('zoom-out').onclick = () => scale(zoom/1.25);
    $('zoom-in').onclick = () => scale(zoom*1.25);
    $('zoom-read').onclick = () => scale(1);
    $('zoom-fit').onclick = () => scale((viewport.clientWidth-24)/width);
    function select(e) {
      const record = e.target.closest('.record'); if (!record) return;
      if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;
      e.preventDefault(); lastFocus = record;
      history.pushState(null,'',`#${encodeURIComponent(`record-${record.dataset.ref}`)}`); route();
    }
    svg.addEventListener('click',select); svg.addEventListener('keydown',select);
    for(const el of svg.querySelectorAll('.record')) el.setAttribute('aria-controls','inspector');
  }
  document.addEventListener('click',(e) => {
    const a = e.target.closest('a[href^="#record-"]'); if(!a)return;
    e.preventDefault(); lastFocus = a;
    history.pushState(null,'',a.getAttribute('href')); route();
  });
  addEventListener('hashchange',route); addEventListener('popstate',route); route();
  if($('catalog-search')) $('catalog-search').oninput = () => {
    const query = $('catalog-search').value.trim().toLowerCase();
    for(const card of document.querySelectorAll('#catalog .document-card')) card.hidden = !card.textContent.toLowerCase().includes(query);
  };
})();
