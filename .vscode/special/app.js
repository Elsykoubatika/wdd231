// ===== CONFIG =====
const API_PRODUCTS   = 'https://eu.cowema.org/api/public/products';
// On n'utilise plus API_CATEGORIES, on génère la liste depuis les produits pour coller aux noms réels.

  const els = {
    q: document.getElementById('q'),
    stockOnly: document.getElementById('stockOnly'),
    cat: document.getElementById('categorySelect'),
    sort: document.getElementById('sortSelect'),
    grid: document.getElementById('grid'),
    pagination: document.getElementById('pagination'),
    year: document.getElementById('year'),
  };
  
// UI
const PER_PAGE = 80;
const MAX_PAGES_DISPLAY = 100;

// Bannières + priorité par catégorie (mots-clés dans le nom)
const BANNERS = [
  { id:'packs', kicker:'OFFRE SPÉCIALE', emoji:'🎁',
    title:'3 articles = 1 prix',
    sub:'Économisez avec nos Packs',
    bg:'linear-gradient(135deg,#0ea5e9,#22c55e)',
    ctas:[{label:'Voir les Packs', type:'link', href:'/packs'}]
  },
  { id:'whatsapp', kicker:'BESOIN D\'AIDE ?', emoji:'💬',
    title:'Parlez à un conseiller',
    sub:'Réponse rapide sur WhatsApp',
    bg:'linear-gradient(135deg,#22c55e,#16a34a)',
    ctas:[{label:'WhatsApp', type:'whatsapp', prefill:'Bonjour 👋, je veux en savoir plus sur vos packs.'}]
  },
  { id:'livraison', kicker:'LIVRAISON RAPIDE', emoji:'🚚',
    title:'Brazzaville & Pointe-Noire',
    sub:'Commandez, on s\'occupe du reste',
    bg:'linear-gradient(135deg,#f59e0b,#ef4444)',
    ctas:[{label:'Commander via WhatsApp', type:'whatsapp', prefill:'Bonjour, je souhaite commander un pack avec livraison.'}]
  },
  { id:'livraison', kicker:'LIVRAISON RAPIDE', emoji:'🚚',
    title:'Brazzaville & Pointe-Noire',
    sub:'Commandez, on s\'occupe du reste',
    bg:'linear-gradient(135deg,#f59e0b,#ef4444)',
    ctas:[{label:'Commander via WhatsApp', type:'whatsapp', prefill:'Bonjour, je souhaite commander un pack avec livraison.'}]
  },
];
const BANNER_PRIORITY_BY_CATEGORY = {
  'électronique':'packs','electronique':'packs',
  'téléphone':'whatsapp','telephone':'whatsapp',
  'maison':'livraison','mode':'whatsapp'
};

// WhatsApp settings
const DEFAULT_SETTINGS = {
  phone: '+242061234567',
  template: 'Bonjour Cowema 👋, je souhaite commander: {title} (ID {id}) au prix de {price} FCFA.'
};
let WA_SETTINGS = loadSettings();

// Cat showcase
const CATEGORY_SHOWCASE_INITIAL = 6;
const CATEGORY_SHOWCASE_STEP    = 6;
const catShowcaseState = new Map();

// ===== STATE =====
let ALL_PRODUCTS = [];
let CURRENT = { category: 'all', sort: 'price-asc', page: 1 };

// ===== DOM =====
const gridEl = document.getElementById('grid');
const paginationEl = document.getElementById('pagination');
document.getElementById('year').textContent = new Date().getFullYear();

// ===== UTIL =====
function loadSettings(){
  try{ const raw = localStorage.getItem('cowema_wa'); if(raw) return JSON.parse(raw);}catch(e){}
  return {...DEFAULT_SETTINGS};
}
function saveSettings(){ localStorage.setItem('cowema_wa', JSON.stringify(WA_SETTINGS)); }

function escapeHtml(val){ return ((val ?? '')+'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function fmtCurrency(n){ return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XAF',maximumFractionDigits:0}).format(Number(n||0)); }

function percent(oldp, nowp){ const o=Number(oldp), n=Number(nowp); return (o && n && o>n) ? Math.round(((o-n)/o)*100) : 0; }

function truncateText(text, maxLength = 32) {
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
    }

function buildWhatsAppHref(text){
  const phone = (WA_SETTINGS.phone || '').replace(/\D/g,'');
  const msg = encodeURIComponent(text || '');
  return `https://wa.me/${phone}?text=${msg}`;
}

function pickPriorityBannerId(catLabel){
  if(!catLabel) return null;
  const key = catLabel.toLowerCase();
  for(const k in BANNER_PRIORITY_BY_CATEGORY){ if(key.includes(k)) return BANNER_PRIORITY_BY_CATEGORY[k]; }
  return null;
}

function getCurrentCategoryLabel(){
  if(CURRENT.category==='all') return '';
  return String(CURRENT.category);
}

// ===== SKELETON =====
function skeletonCards(count=PER_PAGE){
  gridEl.innerHTML = '';
  for(let i=0;i<count;i++){
    const card = document.createElement('div');
    card.className = 'card skeleton';
    card.innerHTML = `
      <div class="thumb" style="background:#0f1218"></div>
      <div class="content">
        <div class="title" style="height:34px;background:#1b1f28;border-radius:8px"></div>
        <div class="meta"  style="height:18px;background:#1b1f28;border-radius:8px"></div>
        <div style="height:36px;background:#1b1f28;border-radius:8px"></div>
      </div>`;
    gridEl.appendChild(card);
  }
}

// ===== FETCH (avec anti-429 + cache) =====
const MAX_PAGES_CAP   = 100;                 // "afficher 100 pages" max
const RATE_LIMIT_MS   = 1200;                // délai entre pages
const MAX_RETRIES     = 5;                   // tentatives max si 429
const BACKOFF_BASE_MS = 1200;                // backoff exponentiel de base
const CACHE_KEY       = 'cowema_products_cache_v1';
const CACHE_TTL_MS    = 10 * 60 * 1000;      // 10 minutes

const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));

function loadCache(){
  try{
    const raw = localStorage.getItem(CACHE_KEY);
    if(!raw) return null;
    const { at, data } = JSON.parse(raw);
    if(!Array.isArray(data)) return null;
    if(Date.now() - at > CACHE_TTL_MS) return null;
    return data;
  }catch(e){ return null; }
}
function saveCache(data){
  try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })); }catch(e){}
}

async function fetchWithBackoff(url){
  let attempt = 0;
  while(true){
    const res = await fetch(url, { headers: { 'Accept':'application/json' } });
    if(res.status === 429){
      const ra = parseInt(res.headers.get('Retry-After') || '0', 10);
      const wait = ra ? ra*1000
                      : Math.min(30000, Math.pow(2, attempt) * BACKOFF_BASE_MS + Math.random()*500);
      attempt++;
      if(attempt > MAX_RETRIES) throw new Error('Trop de requêtes (429) après plusieurs tentatives');
      await sleep(wait);
      continue;
    }
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}

// Normalisation EXACTE selon ta réponse API
function normalizeProduct(p){
  const id       = p.id;
  const title    = p.title || `Produit ${id}`;
  const image    = p.thumbnail || '';
  const price    = Number(p.price || 0);
  const oldPrice = Number(p.regular_price || 0); // si promo, regular_price > price
  const stock    = Number(p.available_stock ?? 0);
  const categoryName = (p.category && String(p.category).trim())
                    || (p.sub_category && String(p.sub_category).trim())
                    || 'Autres';
  return { raw:p, id, title, image, categoryName, price, oldPrice, stock };
}

// Construit/remplit le <select> Catégorie depuis ALL_PRODUCTS
function ensureCategoryOptions(forceRefresh=false){
  const catSel = document.getElementById('categorySelect');
  if (forceRefresh) {
    [...catSel.querySelectorAll('option:not([value="all"])')].forEach(o=>o.remove());
  }
  const existing = new Set([...catSel.options].map(o=>o.value));
  const names = [...new Set(ALL_PRODUCTS.map(p=>p.categoryName).filter(Boolean))]
                .sort((a,b)=>a.localeCompare(b,'fr'));
  names.forEach(name=>{
    if(!existing.has(name)){
      const opt = document.createElement('option');
      opt.value = name; opt.textContent = name;
      catSel.appendChild(opt);
    }
  });
}

// Agrégateur "safe": utilise cache + backoff anti-429
async function loadAllProductsSafe(){
  // 0) Cache (pour éviter de re-spammer l’API)
  const cached = loadCache();
  if (cached) {
    ALL_PRODUCTS = cached;
    ensureCategoryOptions(true);
    render();
  }

  // 1) Page 1
  const first = await fetchWithBackoff(`${API_PRODUCTS}?page=1`);
  const last  = Math.min(Number(first.last_page || 1), MAX_PAGES_CAP);
  let all     = (first.data || []).map(normalizeProduct);

  // Affichage rapide
  ALL_PRODUCTS = all.slice();
  ensureCategoryOptions(true);
  render();

  // 2) Pages suivantes
  for(let p=2; p<=last; p++){
    const js  = await fetchWithBackoff(`${API_PRODUCTS}?page=${p}`);
    const arr = (js.data || []).map(normalizeProduct);
    all.push(...arr);

    // rafraîchir de temps en temps l’écran
    if (p % 10 === 0) {
      ALL_PRODUCTS = dedupById(all);
      ensureCategoryOptions(true);
      render();
    }
    await sleep(RATE_LIMIT_MS);
  }

  // 3) Final: dédup + cache + rendu
  ALL_PRODUCTS = dedupById(all);
  saveCache(ALL_PRODUCTS);
  ensureCategoryOptions(true);
  render();
}
function dedupById(list){
  const seen = new Set();
  return list.filter(x => { const k = String(x.id); if(seen.has(k)) return false; seen.add(k); return true; });
}

// ===== RENDER =====
function productCard(p){
  const card = document.createElement('div');
  card.className = 'card';

  const discount = percent(p.oldPrice, p.price);
  const titleClean = (p.title ?? '').toString().trim().slice(0,140);
  const img = (p.image ?? '').toString().trim();

  const waText = (WA_SETTINGS.template || '')
    .replace('{title}', titleClean)
    .replace('{id}', p.id)
    .replace('{price}', (p.price||0).toString());
  const waHref = buildWhatsAppHref(waText);

  const stockText = Number(p.stock)>0 ? `${p.stock} en stock` : 'Rupture';
  const stockCls  = Number(p.stock)>0 ? 'in' : 'out';

  card.innerHTML = `
    ${discount>0?`<div class="discount-badge">-${discount}%</div>`:''}
    <div class="thumb">${img?`<img src="${img}" alt="${escapeHtml(titleClean)}" loading="lazy" />`:`<div class="ph">🛍️</div>`}</div>
    <div class="content">
      <div class="title" title="${escapeHtml(titleClean)}">${escapeHtml(titleClean)}</div>
      <div class="meta">
        <span class="stock ${stockCls}">${escapeHtml(stockText)}</span>
        <span class="cat">${escapeHtml(p.categoryName||'')}</span>
      </div>
      <div class="price">
        <span class="now">${fmtCurrency(p.price||0)}</span>
        ${p.oldPrice>p.price?`<span class="old">${fmtCurrency(p.oldPrice)}</span>`:''}
      </div>
      <div class="cta-row">
        <a class="cta wa" href="${waHref}" target="_blank" rel="noopener">Commander via WhatsApp</a>
      </div>
    </div>
  `;
  return card;
}

function bannerEl(b){
  const wrap = document.createElement('div');
  wrap.className='banner';
  wrap.style.background = b.bg || 'linear-gradient(135deg,var(--accent),var(--brand))';
  const ctas = (b.ctas||[]).map(cta=>{
    if(cta.type==='link') return `<a class="cta-btn" href="${cta.href||'#'}">${escapeHtml(cta.label||'Découvrir')}</a>`;
    if(cta.type==='whatsapp'){ const href = buildWhatsAppHref(cta.prefill||'Bonjour 👋'); return `<a class="cta-btn" href="${href}" target="_blank" rel="noopener">${escapeHtml(cta.label||'WhatsApp')}</a>`; }
    return '';
  }).join('');
  wrap.innerHTML = `
    <div class="left">
      ${b.kicker?`<div class="kicker">${escapeHtml(b.kicker)}</div>`:''}
      <div class="headline">${escapeHtml(b.title||'Offre spéciale')}</div>
      ${b.sub?`<div class="sub">${escapeHtml(b.sub)}</div>`:''}
      <div class="cta-wrap">${ctas}</div>
    </div>
    <div class="emoji" aria-hidden="true">${b.emoji||'✨'}</div>
  `;
  return wrap;
}
function selectBanner(priorityId, rotationIndex){
  if(priorityId && rotationIndex===0){ const hit = BANNERS.find(x=>x.id===priorityId); if(hit) return hit; }
  return BANNERS[rotationIndex % BANNERS.length];
}

function renderPagination(total){
  paginationEl.innerHTML = '';
  const prev = document.createElement('button');
  prev.className='page-btn'; prev.textContent='Préc.'; prev.disabled = CURRENT.page<=1;
  prev.onclick = ()=>{ CURRENT.page = Math.max(1, CURRENT.page-1); render(); };
  paginationEl.appendChild(prev);

  const show = Math.min(total, MAX_PAGES_DISPLAY);
  const start = Math.max(1, Math.min(CURRENT.page-3, Math.max(1, total- show + 1)));
  const end   = Math.min(total, start + show -1);
  for(let i=start;i<=end;i++){
    const btn = document.createElement('button');
    btn.className = 'page-btn'+(i===CURRENT.page?' active':''); btn.textContent = i; btn.disabled = i===CURRENT.page;
    btn.onclick = ()=>{ CURRENT.page = i; render(); };
    paginationEl.appendChild(btn);
    if(i-start>99) break; // cap ~100
  }

  const next = document.createElement('button');
  next.className='page-btn'; next.textContent='Suiv.'; next.disabled = CURRENT.page>=total;
  next.onclick = ()=>{ CURRENT.page = Math.min(total, CURRENT.page+1); render(); };
  paginationEl.appendChild(next);

  const jumpWrap = document.createElement('div');
  jumpWrap.className='page-jump';
  jumpWrap.innerHTML = `Aller à la page <input id="jumpIn" type="number" min="1" max="${total}" style="width:80px;background:transparent;border:1px solid rgba(255,255,255,.18);border-radius:8px;color:var(--text);padding:6px 8px"> <button class="page-btn" id="jumpBtn">OK</button>`;
  paginationEl.appendChild(jumpWrap);
  jumpWrap.querySelector('#jumpBtn').onclick = ()=>{
    const v = Number(jumpWrap.querySelector('#jumpIn').value||1);
    if(v>=1 && v<=total){ CURRENT.page=v; render(); }
  };
}

// === Groupes par catégorie (après bannière) ===
function groupProductsByCategory(list){
  const map = new Map();
  list.forEach(p=>{
    const key = String(p.categoryName || 'Autres');
    const label = p.categoryName || 'Autres';
    if(!map.has(key)) map.set(key, {key, label, items:[]});
    map.get(key).items.push(p);
  });
  return [...map.values()];
}
function makeCatCard(p){ return productCard(p); }
function renderCategoryShowcase(sourceProducts){
  // retire anciennes sections
  gridEl.querySelectorAll('.cat-section').forEach(n=>n.remove());
  const groups = groupProductsByCategory(sourceProducts).filter(g=>g.items.length>0);
  if(groups.length===0) return;

  let toShow;
  if(CURRENT.category==='all'){
    toShow = groups.sort((a,b)=>b.items.length - a.items.length).slice(0,15);
  }else{
    toShow = groups.filter(g=> g.label.toLowerCase() === String(CURRENT.category).toLowerCase());
    if(toShow.length===0) toShow = groups.slice(0,4); // <-- fix (évite "slice(0,)")
  }

  toShow.forEach(group=>{
    const sec = document.createElement('section');
    sec.className = 'cat-section';

    const stateKey = String(group.key);
    const currentCount = catShowcaseState.get(stateKey) || CATEGORY_SHOWCASE_INITIAL;
    const count = Math.min(currentCount, group.items.length);

    const header = document.createElement('div');
    header.className = 'cat-header';
    header.innerHTML = `
      <h3>${escapeHtml(group.label || 'Catégorie')}</h3>
      <div class="cat-actions">
        <button class="cat-btn ghost" data-action="see-category" data-cat="${escapeHtml(stateKey)}">Voir la catégorie</button>
      </div>
    `;

    const grid = document.createElement('div'); grid.className = 'cat-grid';
    group.items.slice(0, count).forEach(p=> grid.appendChild(makeCatCard(p)));

    const footer = document.createElement('div'); footer.className = 'cat-footer';
    const hasMore = count < group.items.length;
    if(hasMore){
      const moreBtn = document.createElement('button');
      moreBtn.className = 'cat-btn';
      moreBtn.textContent = 'Voir plus';
      moreBtn.dataset.action = 'see-more';
      moreBtn.dataset.cat = stateKey;
      footer.appendChild(moreBtn);
    }

    sec.appendChild(header); sec.appendChild(grid); if(hasMore) sec.appendChild(footer);
    gridEl.appendChild(sec); // après produits + bannières
  });
}
gridEl.addEventListener('click', (e)=>{
  const btn = e.target.closest('button'); if(!btn) return;
  const action = btn.dataset.action, cat = btn.dataset.cat;
  if(!action || !cat) return;
  if(action==='see-more'){
    const prev = catShowcaseState.get(cat) || CATEGORY_SHOWCASE_INITIAL;
    catShowcaseState.set(cat, prev + CATEGORY_SHOWCASE_STEP);
    render();
  }
  if(action==='see-category'){
    CURRENT.category = cat;
    CURRENT.page = 1;
    const catSel = document.getElementById('categorySelect');
    if(catSel && [...catSel.options].some(o=>o.value===cat)) catSel.value = cat;
    render();
    window.scrollTo({top:0, behavior:'smooth'});
  }
});

// ===== MAIN RENDER =====
function render(){
  const filtered = (CURRENT.category==='all')
    ? ALL_PRODUCTS
    : ALL_PRODUCTS.filter(p => (p.categoryName||'').toLowerCase() === String(CURRENT.category).toLowerCase());

  const sorted = filtered.slice().sort((a,b)=>{
    const pa = a.price||0, pb=b.price||0;
    return CURRENT.sort==='price-asc' ? (pa-pb) : (pb-pa);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const clampedPage = Math.min(Math.max(1, CURRENT.page), totalPages);
  if(clampedPage!==CURRENT.page){ CURRENT.page = clampedPage; }

  const start = (CURRENT.page-1)*PER_PAGE;
  const pageItems = sorted.slice(start, start+PER_PAGE);

  gridEl.innerHTML = '';

  // cartes + bannière toutes les 30
  const catLabel = getCurrentCategoryLabel();
  const priorityId = pickPriorityBannerId(catLabel);
  let bannerRotationIndex = 0;

  pageItems.forEach((p,idx)=>{
    gridEl.appendChild(productCard(p));
    const shouldInsertBanner = ((idx+1)%8===0);
    if(shouldInsertBanner){
      const b = selectBanner(priorityId, bannerRotationIndex++);
      gridEl.appendChild(bannerEl(b));
    }
  });

  // sections par catégorie (après bannière)
  renderCategoryShowcase(sorted);

  renderPagination(totalPages);
}

// ===== EVENTS =====
document.getElementById('categorySelect').addEventListener('change', e=>{
  CURRENT.category = e.target.value; CURRENT.page = 1; render();
});
document.getElementById('sortSelect').addEventListener('change', e=>{
  CURRENT.sort = e.target.value; CURRENT.page = 1; render();
});
document.getElementById('saveSettings').addEventListener('click', ()=>{
  const phone = document.getElementById('waPhone').value.trim() || WA_SETTINGS.phone;
  const template = document.getElementById('waTemplate').value.trim() || WA_SETTINGS.template;
  WA_SETTINGS = {phone, template}; saveSettings();
  alert('Paramètres WhatsApp enregistrés.');
});
document.getElementById('waPhone').value = WA_SETTINGS.phone;
document.getElementById('waTemplate').value = WA_SETTINGS.template;

// ===== STARTUP =====
(async function init(){
  skeletonCards(12);
  try{
    await loadAllProductsSafe();   // agrégation "safe" (cache + backoff anti-429)
  }catch(err){
    console.error(err);
    gridEl.innerHTML = `<div style="grid-column:1/-1;background:#190e0f;border:1px solid rgba(255,255,255,.08);padding:20px;border-radius:12px">
      Échec de chargement.<br>
      <small style="opacity:.7">Erreur: ${escapeHtml(err.message)} — L’API limite peut-être la fréquence (HTTP 429). Réessaie ou augmente RATE_LIMIT_MS.</small>
    </div>`;
  }


const debounce = (fn, ms=200) => {
  let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
};
/* ========= MOTEUR DE RECHERCHE OPTIMISÉ ========= */
// --- Helpers (garde-les une seule fois dans ton code)
function normalizeText(s){
  return (s ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // supprime accents
    .replace(/[^a-z0-9]+/g,' ')                      // normalise séparateurs
    .trim();
}
function parseQuery(raw){
  const phrases = [];
  raw = (raw ?? '').toString();
  // extrait les "phrases exactes"
  raw = raw.replace(/"([^"]+)"/g, (_, ph) => { phrases.push(normalizeText(ph)); return ' '; });
  const pos = [], neg = [];
  normalizeText(raw).split(/\s+/).forEach(tok=>{
    if(!tok) return;
    if(tok[0]==='-' && tok.length>1) neg.push(tok.slice(1));
    else pos.push(tok);
  });
  return { phrases, pos, neg };
}

// --- FONCTION DE RECHERCHE (à appeler quand l'input change)
function searchProducts(products, { q='', category='', stockOnly=false } = {}){
  const { phrases, pos, neg } = parseQuery(q);

  const catNorm = category ? normalizeText(category) : '';
  return products.filter(p => {
    // catégorie (si select non vide)
    if (catNorm){
      const pCat = normalizeText(p.categoryLabel || p.categoryName || p.category || '');
      if (pCat !== catNorm) return false;
    }
    // stock
    if (stockOnly){
      const stockNum = Number(p.stockNum ?? p.stock ?? p.available_stock ?? (p.inStock?1:0) ?? 0);
      if (!(p.inStock || stockNum > 0)) return false;
    }

    // champ de recherche (nom, catégorie, sku/réf, marque, vendeur, ville)
    const hay = normalizeText([
      p.name || p.title || '',
      p.categoryLabel || p.categoryName || p.category || '',
      p.raw?.sku || p.raw?.ref || p.sku || '',
      p.brand || p.raw?.brand || '',
      p.supplier || p.raw?.supplier || '',
      p.supplier_city || p.raw?.supplier_city || ''
    ].join(' '));

    // "phrases exactes"
    for (const ph of phrases){ if(!hay.includes(ph)) return false; }
    // mots positifs
    for (const t of pos){ if(!hay.includes(t)) return false; }
    // exclusions
    for (const t of neg){ if(hay.includes(t)) return false; }

    return true;
  });
}
// Exemple d’usage avec tes éléments existants:
const applySearch = () => {
  state.filtered = searchProducts(state.products, {
    q: els.q.value,
    category: els.category.value,
    stockOnly: els.stockOnly.checked
  });
  // …puis mets à jour l’UI avec state.filtered (ta fonction de rendu)
  renderList(state.filtered); // ou remplace par ton render actuel
};
// petit debounce pour ne pas recalculer à chaque frappe

els.q.addEventListener('input', debounce(applySearch, 200));
els.category.addEventListener('change', debounce(applySearch, 200));
els.stockOnly.addEventListener('change', debounce(applySearch, 200));

/* ========= FIN MOTEUR DE RECHERCHE ========= */

})();
