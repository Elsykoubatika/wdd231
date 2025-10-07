// ===== CONFIG =====
const API_PRODUCTS = 'https://eu.cowema.org/api/public/products';
const CACHE_KEY    = 'cowema_products_cache_v1';
const CACHE_TTL_MS = 10*60*1000;
const MAX_PAGES_CAP = 150;
const RATE_LIMIT_MS = 1200;
const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 1200;

// ===== DOM
const els = {
  status: document.getElementById('status'),
  detail: document.getElementById('detail'),
  galleryMain: document.getElementById('galleryMain'),
  galleryThumbs: document.getElementById('galleryThumbs'),
  info: document.getElementById('info'),
  rowSimilar: document.getElementById('rowSimilar'),
  rowAll: document.getElementById('rowAll'),
};

// ===== UTIL
function escapeHtml(s){
  return (s ?? '').toString().replace(/[&<>"']/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
  ));
}
function fmtCurrency(n){ return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XAF',maximumFractionDigits:0}).format(Number(n||0)); }
function percent(oldp, nowp){ const o=Number(oldp), n=Number(nowp); return (o && n && o>n) ? Math.round(((o-n)/o)*100) : 0; }
function truncateText(text, maxLength = 64){ text = (text??'').toString(); return text.length>maxLength ? text.slice(0,maxLength)+'…' : text; }
function parseQS(){ const u=new URL(location.href); return Object.fromEntries(u.searchParams.entries()); }
const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));

// WhatsApp settings (partagé avec le catalogue)
const DEFAULT_SETTINGS = { phone: '+242065086382', template: 'Bonjour Cowema 👋, je souhaite commander: {title} (ID {id}) au prix de {price} FCFA.' };
function loadWA(){ try{ const raw=localStorage.getItem('cowema_wa'); if(raw) return JSON.parse(raw);}catch{} return {...DEFAULT_SETTINGS}; }
function buildWhatsAppHref(text){
  const phone = (loadWA().phone||'').replace(/\D/g,'');
  return `https://wa.me/${phone}?text=${encodeURIComponent(text||'')}`;
}

// Cache produits
function loadCache(){
  try{
    const raw = localStorage.getItem(CACHE_KEY);
    if(!raw) return null;
    const { at, data } = JSON.parse(raw);
    if(!Array.isArray(data)) return null;
    if(Date.now() - at > CACHE_TTL_MS) return null;
    return data;
  }catch{ return null; }
}
function saveCache(data){
  try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })); }catch{}
}

// Normalisation (même que le catalogue)
function normalizeProduct(p){
  const id       = p.id;
  const title    = p.title || `Produit ${id}`;
  const image    = p.thumbnail || '';
  const price    = Number(p.price || 0);
  const oldPrice = Number(p.regular_price || 0);
  const stock    = Number(p.available_stock ?? 0);
  const categoryName = (p.category && String(p.category).trim()) || (p.sub_category && String(p.sub_category).trim()) || 'Autres';
  return { raw:p, id, title, image, categoryName, price, oldPrice, stock };
}

// Fetch avec backoff 429
async function fetchWithBackoff(url){
  let attempt = 0;
  while(true){
    const res = await fetch(url, { headers: { 'Accept':'application/json' } });
    if(res.status === 429){
      const ra = parseInt(res.headers.get('Retry-After')||'0',10);
      const wait = ra ? ra*1000 : Math.min(30000, Math.pow(2,attempt)*BACKOFF_BASE_MS + Math.random()*500);
      attempt++; if(attempt>MAX_RETRIES) throw new Error('Trop de requêtes (429)');
      await sleep(wait); continue;
    }
    if(!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
  }
}

// Images candidates
function getImagesFor(p){
  const imgs = new Set();
  if(p.image) imgs.add(p.image);
  const r = p.raw||{};
  const candidates = [r.images, r.gallery, r.photos, r.media, r.pictures];
  for(const arr of candidates){
    if(Array.isArray(arr)){
      for(const it of arr){
        const u = it?.url || it?.src || it?.thumbnail || it;
        if(u) imgs.add(u);
      }
    }
  }
  return Array.from(imgs);
}

// Mini-carte HTML (lien vers détail)
function miniCardHTML(p){
  const img = p.image || '';
  return `
  <article class="card mini-card">
    <a href="detail.html?id=${encodeURIComponent(p.id)}" aria-label="Voir ${escapeHtml(p.title||'Produit')}">
      <div class="thumb" style="aspect-ratio:1/1">
        ${ img ? `<img src="${img}" alt="${escapeHtml(p.title||'Produit')}" loading="lazy">` : '<div class="ph">🛍️</div>' }
      </div>
      <div class="content">
        <div class="title" title="${escapeHtml(p.title||'')}">${escapeHtml(truncateText(p.title||'', 44))}</div>
        <div class="price"><span class="now">${fmtCurrency(p.price||0)}</span></div>
      </div>
    </a>
  </article>`;
}

// Similaires: même catégorie
function similarProducts(product, fromList, take=12){
  const cat = product.categoryName||'';
  return fromList.filter(x=> x.id!==product.id && (x.categoryName||'')===cat).slice(0, take);
}

// Rendu fiche
function renderProduct(p, allList){
  els.detail.hidden = false;
  const imgs = getImagesFor(p);
  const main = imgs[0] || p.image || '';
  const discount = percent(p.oldPrice, p.price);

  els.galleryMain.innerHTML = main
    ? `${discount>0?'<div class="discount-badge">-'+discount+'%</div>':''}<img id="mainImg" src="${main}" alt="${escapeHtml(p.title||'Produit')}">`
    : '<div class="ph">🛍️</div>';

  els.galleryThumbs.innerHTML = imgs.map((u,i)=>`
    <div class="th ${i===0?'active':''}" data-src="${u}">
      <img src="${u}" alt="miniature ${i+1}" loading="lazy">
    </div>`).join('');

  // thumbs click
  els.galleryThumbs.querySelectorAll('.th').forEach(th=>{
    th.addEventListener('click', ()=>{
      const u = th.dataset.src;
      const m = document.getElementById('mainImg');
      if(m && u) m.src = u;
      els.galleryThumbs.querySelectorAll('.th').forEach(n=>n.classList.remove('active'));
      th.classList.add('active');
    });
  });

  const stockTxt = Number(p.stock)>0 ? `${p.stock} en stock` : 'Rupture';
  const stockCls = Number(p.stock)>0 ? 'in' : 'out';

  const waText = (loadWA().template || '')
    .replace('{title}', p.title||'')
    .replace('{id}', p.id)
    .replace('{price}', (p.price||0).toString());
  const waHref = buildWhatsAppHref(waText);

  els.info.innerHTML = `
    <h1 class="title">${escapeHtml(p.title||'Produit')}</h1>
    <div class="meta">${p.categoryName? '• Catégorie : '+escapeHtml(p.categoryName)+' • ' : ''}${p.raw?.supplier? '  ' : ''}${p.raw?.supplier_city? 'Ville : '+escapeHtml(p.raw.supplier_city):''}</div>
    <div><span class="badge ${stockCls}">${escapeHtml(stockTxt)}</span></div>
    <div class="price">
      <span class="now">${fmtCurrency(p.price||0)}</span>
      ${p.oldPrice>p.price? `<span class="old">${fmtCurrency(p.oldPrice)}</span>` : ''}
    </div>
    <div class="actions">
      <a class="btn" style="background:var(--brand);color:#07230d" href="${waHref}" target="_blank" rel="noopener">Commander</a>
      <a class="btn ghost" href="./">Retour à l'accueil</a>
    </div>
  `;

  // Similaires
  const sims = similarProducts(p, allList, 12);
  els.rowSimilar.innerHTML = sims.length ? sims.map(miniCardHTML).join('') : '<span class="muted">Aucun similaire pour l’instant.</span>';

  // Tous (horizontale)
  const allRow = allList.slice(0, 60);
  els.rowAll.innerHTML = allRow.map(miniCardHTML).join('');
}

// ===== LOGIQUE DE CHARGEMENT
let ALL_PRODUCTS = [];

async function findProductById(id){
  // 0) cache local (du catalogue)
  const cached = loadCache();
  if(cached){ ALL_PRODUCTS = cached; const hit = cached.find(x => String(x.id)===String(id)); if(hit) return hit; }

  // 1) recherche progressive par pages
  const first = await fetchWithBackoff(`${API_PRODUCTS}?page=1`);
  const last  = Math.min(Number(first.last_page||1), MAX_PAGES_CAP);
  let items   = (first.data||[]).map(normalizeProduct);
  ALL_PRODUCTS = items.slice();
  let hit = items.find(x => String(x.id)===String(id));
  if(hit) return hit;

  for(let p=2; p<=last; p++){
    const js  = await fetchWithBackoff(`${API_PRODUCTS}?page=${p}`);
    const arr = (js.data||[]).map(normalizeProduct);
    items.push(...arr);
    ALL_PRODUCTS = items.slice();
    hit = arr.find(x => String(x.id)===String(id));
    if(hit){ saveCache(ALL_PRODUCTS); return hit; }
    await sleep(RATE_LIMIT_MS);
  }

  saveCache(ALL_PRODUCTS);
  return null;
}

(async function init(){
  try{
    const { id } = parseQS();
    if(!id){ els.status.textContent = 'Aucun identifiant produit.'; return; }
    els.status.textContent = 'Chargement du produit…';

    const p = await findProductById(id);
    if(!p){ els.status.textContent = "Produit introuvable."; return; }

    els.status.textContent = '';
    renderProduct(p, ALL_PRODUCTS);
  }catch(e){
    console.error(e);
    els.status.textContent = 'Erreur: ' + (e?.message || e);
  }
})();
