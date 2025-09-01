// Cowema – Catalogue (search-optimized)
;(() => {
  const els = {
    q: document.getElementById('q'),
    stockOnly: document.getElementById('stockOnly'),
    cat: document.getElementById('categorySelect'),
    sort: document.getElementById('sortSelect'),
    grid: document.getElementById('grid'),
    pagination: document.getElementById('pagination'),
    year: document.getElementById('year'),
  };

  if (els.year) els.year.textContent = new Date().getFullYear();

  // Number formatter
  const NF = new Intl.NumberFormat('fr-FR');

  // Normalization (accent-insensitive, case-insensitive)
  function normalizeText(s) {
    return (s ?? '')
      .toString()
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));
  }

  // Build a folding map to highlight diacritic-insensitively
  function foldWithMap(str) {
    const src = String(str ?? '');
    const foldedChars = [];
    const map = []; // folded index -> original index
    for (let i=0; i<src.length; i++) {
      const ch = src[i];
      const nf = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      // keep only alnum or space for matching robustness
      const out = /[a-zA-Z0-9]/.test(nf) ? nf.toLowerCase() : (nf === ' ' ? ' ' : ch);
      foldedChars.push(out);
      map.push(i);
    }
    return { folded: foldedChars.join(''), map, src };
  }

  // Search index
  const SEARCH = { byToken:new Map(), hay:[], products:[], version:0, names:[], cats:[] };

  // Aliases for common tokens
  const ALIASES = {
    tel:['telephone','téléphone','phone','gsm','portable','smartphone'],
    tv:['television','télévision','ecran','écran','monitor'],
    frigo:['refrigerateur','réfrigérateur','refrig','fridge'],
    pc:['ordinateur','laptop','notebook','portable']
  };
  function expandToken(t){ const a=ALIASES[t]; return a ? [t, ...a] : [t]; }

  function parseQuery(raw) {
    raw = (raw ?? '').toString();
    const phrases = [];
    raw = raw.replace(/"([^"]+)"/g, (_,ph) => { phrases.push(normalizeText(ph)); return ' '; });
    const pos = [], neg = [];
    normalizeText(raw).split(/\s+/).forEach(tok=>{
      if(!tok) return;
      if(tok[0]==='-' && tok.length>1) neg.push(tok.slice(1)); else pos.push(tok);
    });
    const posExpanded = pos.flatMap(expandToken);
    return { phrases, pos: posExpanded, neg };
  }

  function getProducts(){
    if (window.state && Array.isArray(window.state.products)) return window.state.products;
    if (Array.isArray(window.ALL_PRODUCTS)) return window.ALL_PRODUCTS;
    return [];
  }

  function buildSearchIndex(products) {
    SEARCH.byToken.clear(); SEARCH.hay.length = 0; SEARCH.products = products; SEARCH.names.length=0; SEARCH.cats.length=0;
    products.forEach((p, idx) => {
      const name = p.name || p.title || '';
      const cat  = p.categoryLabel || p.categoryName || p.category || '';
      const sku  = p.raw?.sku || p.raw?.ref || p.sku || '';
      const brand= p.brand || p.raw?.brand || '';
      const supp = p.supplier || p.raw?.supplier || '';
      const city = p.supplier_city || p.raw?.supplier_city || '';
      const hay  = normalizeText([name,cat,sku,brand,supp,city].filter(Boolean).join(' '));
      SEARCH.hay[idx] = hay;
      SEARCH.names[idx] = normalizeText(name);
      SEARCH.cats[idx] = normalizeText(cat);
      const tokens = new Set(hay.split(' ').filter(t=>t.length>1));
      tokens.forEach(t=>{
        let arr = SEARCH.byToken.get(t);
        if(!arr){ arr = []; SEARCH.byToken.set(t, arr); }
        arr.push(idx);
      });
    });
    SEARCH.version = products.length;
  }
  function ensureIndex(){ const prods=getProducts(); if(SEARCH.version!==prods.length) buildSearchIndex(prods); }

  // Build categories UI from products
  function buildCategorySelect() {
    if(!els.cat) return;
    const prods = getProducts();
    const set = new Set();
    prods.forEach(p=>{ const c = p.categoryLabel || p.categoryName || p.category; if(c) set.add(String(c)); });
    const opts = ['Toutes', ...Array.from(set).sort((a,b)=>a.localeCompare(b,'fr'))];
    els.cat.innerHTML = '';
    opts.forEach((label, i)=>{
      const opt = document.createElement('option');
      opt.value = i===0 ? 'all' : label; opt.textContent = label; els.cat.appendChild(opt);
    });
  }

  // Core search returning matched products sorted by relevance
  function searchProducts(rawQ, catValue, stockOnly) {
    ensureIndex();
    const products = SEARCH.products;
    const { phrases, pos, neg } = parseQuery(rawQ);

    // Candidate set = intersection of positive tokens
    let candidates = null; // Set of indexes
    if (pos.length===0) {
      candidates = new Set(products.map((_,i)=>i));
    } else {
      for (const t of pos) {
        const bucket = SEARCH.byToken.get(t);
        if(!bucket){ candidates = new Set(); break; }
        const setB = new Set(bucket);
        if(candidates===null) candidates = setB; else for(const x of Array.from(candidates)) if(!setB.has(x)) candidates.delete(x);
        if(candidates.size===0) break;
      }
    }
    if(!candidates) candidates = new Set();

    // Phrase exact matches (on folded hay)
    if(phrases.length && candidates.size){
      for(const idx of Array.from(candidates)){
        const h = SEARCH.hay[idx];
        let ok = true; for(const ph of phrases){ if(!h.includes(ph)) { ok=false; break; } }
        if(!ok) candidates.delete(idx);
      }
    }

    // Negative tokens exclusion
    if(neg.length && candidates.size){
      const negSet = new Set();
      neg.forEach(t=>{ const b = SEARCH.byToken.get(t); if(b) b.forEach(i=>negSet.add(i)); });
      for(const i of Array.from(candidates)) if(negSet.has(i)) candidates.delete(i);
    }

    // Filters + scoring
    const res = [];
    const catNorm = (catValue && catValue!=='all') ? normalizeText(catValue) : '';
    const firstTok = pos[0] || '';
    for(const i of candidates){
      const p = products[i];
      const nameN = SEARCH.names[i];
      const catN  = SEARCH.cats[i];
      const hay   = SEARCH.hay[i];

      if(catNorm && catN !== catNorm) continue;
      const stockNum = Number(p.stockNum ?? p.stock ?? p.available_stock ?? (p.inStock?1:0) ?? 0);
      if(stockOnly && !(p.inStock || stockNum>0)) continue;

      // scoring
      let score = 0;
      // phrase matches weigh a lot
      for(const ph of phrases){ if(hay.includes(ph)) score += 40; }
      // token matches in name/category
      for(const t of pos){
        if(!t) continue;
        if(nameN.includes(t)) score += 12;
        if(catN.includes(t))  score += 6;
        if(hay.includes(t))   score += 3;
      }
      // starts-with bonus
      if(firstTok && nameN.startsWith(firstTok)) score += 10;
      // stock bonus
      if(p.inStock || stockNum>0) score += 2;

      res.push({ p, score, stockNum });
    }
    // Sort by score desc, then stock desc, then price asc
    res.sort((a,b)=> b.score - a.score || b.stockNum - a.stockNum || ((a.p.price??Infinity)-(b.p.price??Infinity)));
    return res.map(x=>x.p);
  }

  // Accent-insensitive highlight
  function highlight(text, rawQ) {
    const s = String(text ?? '');
    const { phrases, pos } = parseQuery(rawQ);
    const terms = Array.from(new Set([...phrases, ...pos])).filter(t=>t && t.length>1);
    if(!terms.length) return escapeHtml(s);
    const { folded, map, src } = foldWithMap(s);
    const ranges = [];
    for(const t of terms){
      const re = new RegExp(`(?:^|\n|\s)(${escapeRe(t)})`,'ig'); // simple occurrences
      let idx = 0; let m;
      while((m=re.exec(folded))){
        const start = m.index + (m[0].length - m[1].length);
        const end = start + m[1].length;
        ranges.push([start,end]);
        idx = end;
      }
    }
    if(!ranges.length) return escapeHtml(s);
    // merge ranges
    ranges.sort((a,b)=>a[0]-b[0]);
    const merged = [];
    for(const r of ranges){
      if(!merged.length || r[0] > merged[merged.length-1][1]) merged.push(r);
      else merged[merged.length-1][1] = Math.max(merged[merged.length-1][1], r[1]);
    }
    // build HTML using original indices
    let out = ''; let last = 0;
    for(const [sIdx,eIdx] of merged){
      const oStart = map[sIdx] ?? 0;
      const oEnd = (map[eIdx-1] ?? (src.length-1)) + 1;
      out += escapeHtml(src.slice(last, oStart));
      out += '<mark>' + escapeHtml(src.slice(oStart, oEnd)) + '</mark>';
      last = oEnd;
    }
    out += escapeHtml(src.slice(last));
    return out;
  }

  // UI rendering
  function svgPlaceholder(text='Aperçu indisponible'){
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#0f1218"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#8b93a2" font-family="system-ui,Segoe UI,Roboto" font-size="14">${escapeHtml(text)}</text></svg>`;
    return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg);
  }
  function stockBadgeClass(n){ if(n===0) return 'stock-out'; if(n<=3) return 'stock-low'; return 'stock-ok'; }

  function render(){
    if(!els.grid) return;
    const q         = (els.q?.value || '').trim();
    const catValue  = els.cat?.value || 'all';
    const stockOnly = !!els.stockOnly?.checked;
    const sortValue = els.sort?.value || 'price-asc';

    let list = searchProducts(q, catValue, stockOnly);
    // Apply sort
    if(sortValue==='price-asc') list.sort((a,b)=> (a.price??Infinity)-(b.price??Infinity));
    if(sortValue==='price-desc') list.sort((a,b)=> (b.price??-Infinity)-(a.price??-Infinity));

    const html = list.map(p=>{
      const name = p.name || p.title || 'Produit';
      const cat  = p.categoryLabel || p.categoryName || p.category || '—';
      const img  = p.cover || p.image || p.thumbnail || svgPlaceholder('Image indisponible');
      const stockNum = Number(p.stockNum ?? p.stock ?? p.available_stock ?? (p.inStock?1:0) ?? 0);
      const stockTxt = stockNum<=0 ? 'Rupture' : `Stock: ${NF.format(stockNum)}`;
      const badgeClass = stockBadgeClass(stockNum);
      const priceHtml = (p.price != null)
        ? `<div class="meta">Prix: <strong>${NF.format(p.price)} FCFA</strong></div>`
        : '';
      return `<article class="card" aria-label="${escapeHtml(name)}">
        <div class="thumb">
          <img src="${img}" alt="${escapeHtml(name)}" onerror="this.src='${svgPlaceholder('Aperçu indisponible')}'"/>
          <span class="badge ${badgeClass}">${stockTxt}</span>
        </div>
        <div class="content">
          <div class="title">${highlight(name, q)}</div>
          <div class="meta">Catégorie: ${highlight(cat, q)}</div>
          ${priceHtml}
        </div>
      </article>`;
    }).join('');
    els.grid.innerHTML = html || `<p style="opacity:.7">Aucun article ne correspond à votre recherche.</p>`;
  }

  const debounce = (fn, ms=200) => { let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); }; };

  // Wire events
  if(els.q) els.q.addEventListener('input', debounce(render, 200));
  if(els.cat) els.cat.addEventListener('change', render);
  if(els.stockOnly) els.stockOnly.addEventListener('change', render);
  if(els.sort) els.sort.addEventListener('change', render);

  // Init
  buildCategorySelect();
  ensureIndex();
  render();
})();
